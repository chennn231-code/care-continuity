-- 備份心 MVP — Task Handoff Details & Review Reminder
--
-- Scope:
--   1. Add one shared handoff record per care task.
--   2. Keep ownership derived through task -> receiver -> owner_user_id.
--   3. Maintain updated_at only when handoff content actually changes.
--   4. Record owner-confirmed freshness separately through a narrow RPC.
--   5. Store only the user-selected review interval, without expiry claims.
--   6. Apply explicit table privileges and owner-scoped RLS policies.
--
-- Intentionally excluded:
--   version history, recipient acknowledgement, sharing tokens, reminder
--   delivery infrastructure, readiness scores, backup-confirmation freshness,
--   and Coverage Engine status changes.

BEGIN;

-- Fail rather than layering this migration over an unexpected schema or
-- security state. Migration 006 must follow the canonical baseline and
-- Migrations 002-005.
DO $$
BEGIN
    IF to_regclass('public.care_tasks') IS NULL
       OR to_regclass('public.care_receivers') IS NULL
    THEN
        RAISE EXCEPTION
            'Migration 006 requires public.care_tasks and public.care_receivers';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_class AS c
        JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'care_tasks'
          AND c.relrowsecurity
    ) THEN
        RAISE EXCEPTION
            'Migration 006 requires RLS to be enabled on public.care_tasks';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_constraint AS constraint_record
        WHERE constraint_record.conrelid = 'public.care_tasks'::regclass
          AND constraint_record.contype = 'f'
          AND constraint_record.confrelid = 'public.care_receivers'::regclass
    ) THEN
        RAISE EXCEPTION
            'Migration 006 requires the care_tasks -> care_receivers ownership chain';
    END IF;

    IF to_regclass('public.backup_assignments') IS NULL
       OR NOT EXISTS (
           SELECT 1
           FROM pg_catalog.pg_constraint AS constraint_record
           WHERE constraint_record.conrelid = 'public.backup_assignments'::regclass
             AND constraint_record.conname = 'chk_backup_possible_canonical'
       )
    THEN
        RAISE EXCEPTION
            'Migration 006 requires Migration 005 backup semantics';
    END IF;

    IF to_regclass('public.task_handoffs') IS NOT NULL
       OR to_regprocedure('public.set_task_handoff_updated_at()') IS NOT NULL
       OR to_regprocedure('public.enforce_task_handoff_semantic_change()') IS NOT NULL
       OR to_regprocedure('public.mark_task_handoff_reviewed(uuid)') IS NOT NULL
    THEN
        RAISE EXCEPTION
            'Migration 006 requires task_handoffs objects to be absent';
    END IF;
END
$$;

CREATE TABLE public.task_handoffs (
    handoff_id       uuid                     NOT NULL DEFAULT gen_random_uuid(),
    task_id          uuid                     NOT NULL,
    details          jsonb                    NOT NULL DEFAULT '{}'::jsonb,
    additional_notes text,
    created_at       timestamp with time zone NOT NULL DEFAULT now(),
    updated_at       timestamp with time zone NOT NULL DEFAULT now(),
    reviewed_at      timestamp with time zone,
    review_interval_days integer,

    CONSTRAINT task_handoffs_pkey PRIMARY KEY (handoff_id),
    CONSTRAINT task_handoffs_task_id_key UNIQUE (task_id),
    CONSTRAINT task_handoffs_task_id_fkey
        FOREIGN KEY (task_id)
        REFERENCES public.care_tasks(task_id)
        ON DELETE CASCADE,
    CONSTRAINT chk_task_handoff_details_object
        CHECK (jsonb_typeof(details) = 'object'),
    CONSTRAINT chk_task_handoff_review_interval_positive
        CHECK (review_interval_days IS NULL OR review_interval_days > 0)
);

COMMENT ON TABLE public.task_handoffs IS
    'One owner-managed handoff record per care task; readiness is derived by the application and is not a recipient acknowledgement.';
COMMENT ON COLUMN public.task_handoffs.details IS
    'Category-specific handoff details validated by the application; health instructions remain subordinate to official professional information.';
COMMENT ON COLUMN public.task_handoffs.updated_at IS
    'Database-maintained timestamp changed only when details or additional_notes actually changes.';
COMMENT ON COLUMN public.task_handoffs.reviewed_at IS
    'Last time the owner explicitly confirmed the current handoff information still applies; not recipient or professional confirmation.';
COMMENT ON COLUMN public.task_handoffs.review_interval_days IS
    'Optional owner-selected in-app reminder interval; not a medical or long-term-care professional recommendation, expiry, or risk threshold.';

CREATE FUNCTION public.set_task_handoff_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF OLD.details IS DISTINCT FROM NEW.details
       OR OLD.additional_notes IS DISTINCT FROM NEW.additional_notes
    THEN
        NEW.updated_at := pg_catalog.clock_timestamp();
        NEW.reviewed_at := NULL;
    ELSE
        NEW.updated_at := OLD.updated_at;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER task_handoffs_set_updated_at
BEFORE UPDATE ON public.task_handoffs
FOR EACH ROW
EXECUTE FUNCTION public.set_task_handoff_updated_at();

-- Keep task semantics and handoff metadata consistent in the same Task UPDATE
-- transaction. Category-specific JSON is never converted or deleted. A Task
-- with a handoff must resolve that handoff before changing category. Schedule
-- or support changes keep the content and reminder preference but invalidate
-- the previous review.
CREATE FUNCTION public.enforce_task_handoff_semantic_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF OLD.category IS DISTINCT FROM NEW.category
       AND EXISTS (
           SELECT 1
           FROM public.task_handoffs AS handoff
           WHERE handoff.task_id = OLD.task_id
       )
    THEN
        RAISE EXCEPTION
            'Task category cannot change while handoff information exists';
    END IF;

    IF OLD.occurrence_pattern IS DISTINCT FROM NEW.occurrence_pattern
       OR OLD.required_support_modes IS DISTINCT FROM NEW.required_support_modes
    THEN
        UPDATE public.task_handoffs AS handoff
        SET reviewed_at = NULL
        WHERE handoff.task_id = NEW.task_id
          AND handoff.reviewed_at IS NOT NULL;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER care_tasks_enforce_handoff_semantic_change
AFTER UPDATE OF category, occurrence_pattern, required_support_modes
ON public.care_tasks
FOR EACH ROW
EXECUTE FUNCTION public.enforce_task_handoff_semantic_change();

-- reviewed_at is server-authored. A generic not-found message deliberately
-- makes an inaccessible UUID indistinguishable from a nonexistent UUID.
CREATE FUNCTION public.mark_task_handoff_reviewed(p_handoff_id uuid)
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    confirmed_at timestamp with time zone;
BEGIN
    IF (SELECT auth.uid()) IS NULL THEN
        RAISE EXCEPTION 'Task handoff is not available';
    END IF;

    confirmed_at := pg_catalog.clock_timestamp();

    UPDATE public.task_handoffs AS handoff
    SET reviewed_at = confirmed_at
    WHERE handoff.handoff_id = p_handoff_id
      AND EXISTS (
          SELECT 1
          FROM public.care_tasks AS task
          JOIN public.care_receivers AS receiver
            ON receiver.care_receiver_id = task.care_receiver_id
          WHERE task.task_id = handoff.task_id
            AND receiver.owner_user_id = (SELECT auth.uid())
      )
    RETURNING handoff.reviewed_at INTO confirmed_at;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Task handoff is not available';
    END IF;

    RETURN confirmed_at;
END;
$$;

-- Trigger functions are implementation details, not application RPCs. Trigger
-- execution does not require the calling role to have direct EXECUTE privilege.
REVOKE ALL ON FUNCTION public.set_task_handoff_updated_at()
FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.enforce_task_handoff_semantic_change()
FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.mark_task_handoff_reviewed(uuid)
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.mark_task_handoff_reviewed(uuid)
TO authenticated;

-- Explicit-deny/re-grant keeps SQL privileges and RLS as separate boundaries.
REVOKE ALL ON TABLE public.task_handoffs
FROM PUBLIC, anon, authenticated;

GRANT SELECT, DELETE ON TABLE public.task_handoffs TO authenticated;
GRANT INSERT (task_id, details, additional_notes, review_interval_days)
ON TABLE public.task_handoffs TO authenticated;
GRANT UPDATE (details, additional_notes, review_interval_days)
ON TABLE public.task_handoffs TO authenticated;

-- The service role bypasses RLS but still needs SQL privileges for controlled
-- administrative operations. It receives no end-user policy.
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.task_handoffs TO service_role;

ALTER TABLE public.task_handoffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY task_handoffs_select_owned
ON public.task_handoffs
FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1
    FROM public.care_tasks AS task
    JOIN public.care_receivers AS receiver
      ON receiver.care_receiver_id = task.care_receiver_id
    WHERE task.task_id = task_handoffs.task_id
      AND receiver.owner_user_id = (SELECT auth.uid())
));

CREATE POLICY task_handoffs_insert_owned
ON public.task_handoffs
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
    SELECT 1
    FROM public.care_tasks AS task
    JOIN public.care_receivers AS receiver
      ON receiver.care_receiver_id = task.care_receiver_id
    WHERE task.task_id = task_handoffs.task_id
      AND receiver.owner_user_id = (SELECT auth.uid())
));

CREATE POLICY task_handoffs_update_owned
ON public.task_handoffs
FOR UPDATE
TO authenticated
USING (EXISTS (
    SELECT 1
    FROM public.care_tasks AS task
    JOIN public.care_receivers AS receiver
      ON receiver.care_receiver_id = task.care_receiver_id
    WHERE task.task_id = task_handoffs.task_id
      AND receiver.owner_user_id = (SELECT auth.uid())
))
WITH CHECK (EXISTS (
    SELECT 1
    FROM public.care_tasks AS task
    JOIN public.care_receivers AS receiver
      ON receiver.care_receiver_id = task.care_receiver_id
    WHERE task.task_id = task_handoffs.task_id
      AND receiver.owner_user_id = (SELECT auth.uid())
));

CREATE POLICY task_handoffs_delete_owned
ON public.task_handoffs
FOR DELETE
TO authenticated
USING (EXISTS (
    SELECT 1
    FROM public.care_tasks AS task
    JOIN public.care_receivers AS receiver
      ON receiver.care_receiver_id = task.care_receiver_id
    WHERE task.task_id = task_handoffs.task_id
      AND receiver.owner_user_id = (SELECT auth.uid())
));

COMMIT;

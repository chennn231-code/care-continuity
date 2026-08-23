-- 備份心 MVP — Ownership & Cross-Care-Receiver Integrity
--
-- Scope:
--   1. Make public.users a profile table keyed by auth.users.id.
--   2. Give each care receiver one authenticated owner for the MVP.
--   3. Prevent relationships that cross care-receiver boundaries.
--   4. Add indexes needed by ownership and integrity lookups.
--
-- Intentionally excluded:
--   RLS policies, seed data, authentication UI, household membership,
--   and care-task domain vocabulary changes.

BEGIN;

-- The audited live database is empty. Fail explicitly instead of guessing how
-- existing identities or care receivers should be assigned if that changes.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.users u
        LEFT JOIN auth.users au ON au.id = u.user_id
        WHERE au.id IS NULL
    ) THEN
        RAISE EXCEPTION
            'Migration 002 requires every public.users.user_id to match auth.users.id';
    END IF;

    IF EXISTS (SELECT 1 FROM public.care_receivers) THEN
        RAISE EXCEPTION
            'Migration 002 requires care_receivers to be empty before owner_user_id becomes NOT NULL';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.current_care_assignments a
        JOIN public.care_tasks t ON t.task_id = a.task_id
        JOIN public.care_sources s ON s.care_source_id = a.care_source_id
        WHERE t.care_receiver_id <> s.care_receiver_id
    ) THEN
        RAISE EXCEPTION
            'current_care_assignments contains cross-care-receiver data';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.backup_assignments a
        JOIN public.care_tasks t ON t.task_id = a.task_id
        JOIN public.care_sources s ON s.care_source_id = a.care_source_id
        WHERE t.care_receiver_id <> s.care_receiver_id
    ) THEN
        RAISE EXCEPTION
            'backup_assignments contains cross-care-receiver data';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.care_scenarios sc
        JOIN public.care_sources s
          ON s.care_source_id = sc.unavailable_care_source_id
        WHERE sc.care_receiver_id <> s.care_receiver_id
    ) THEN
        RAISE EXCEPTION
            'care_scenarios contains an unavailable source from another care receiver';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.task_adaptations a
        JOIN public.care_scenarios sc ON sc.scenario_id = a.scenario_id
        JOIN public.care_tasks t ON t.task_id = a.task_id
        WHERE sc.care_receiver_id <> t.care_receiver_id
    ) THEN
        RAISE EXCEPTION
            'task_adaptations contains a task from another care receiver';
    END IF;
END
$$;

-- public.users is a profile table. Authentication identity is owned by
-- auth.users, so profile IDs must not be generated independently.
ALTER TABLE public.users
    ALTER COLUMN user_id DROP DEFAULT;

ALTER TABLE public.users
    ADD CONSTRAINT users_user_id_auth_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- Normalize the older repository baseline (NO ACTION) to the audited live
-- behavior. Removing a supporting user's login must not delete or invalidate
-- another owner's care graph; the care source remains as an unlinked record.
ALTER TABLE public.care_sources
    DROP CONSTRAINT care_sources_user_id_fkey;

ALTER TABLE public.care_sources
    ADD CONSTRAINT care_sources_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.users(user_id)
    ON DELETE SET NULL;

-- Single-owner MVP boundary. Household membership remains Phase 2.
ALTER TABLE public.care_receivers
    ADD COLUMN owner_user_id UUID NOT NULL;

ALTER TABLE public.care_receivers
    ADD CONSTRAINT care_receivers_owner_user_id_fkey
    FOREIGN KEY (owner_user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- A scenario already stores care_receiver_id, so a composite foreign key can
-- enforce that its unavailable source belongs to the same receiver without
-- adding duplicated ownership data.
ALTER TABLE public.care_sources
    ADD CONSTRAINT uq_care_sources_receiver_source
    UNIQUE (care_receiver_id, care_source_id);

ALTER TABLE public.care_scenarios
    DROP CONSTRAINT care_scenarios_unavailable_care_source_id_fkey;

ALTER TABLE public.care_scenarios
    ADD CONSTRAINT care_scenarios_receiver_source_fkey
    FOREIGN KEY (care_receiver_id, unavailable_care_source_id)
    REFERENCES public.care_sources(care_receiver_id, care_source_id)
    ON DELETE RESTRICT;

-- Assignment tables intentionally do not duplicate care_receiver_id. These
-- constraint triggers derive the receiver from the referenced task and source.
CREATE FUNCTION public.assert_assignment_same_care_receiver()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    task_receiver UUID;
    source_receiver UUID;
BEGIN
    SELECT care_receiver_id
      INTO STRICT task_receiver
      FROM public.care_tasks
     WHERE task_id = NEW.task_id;

    SELECT care_receiver_id
      INTO STRICT source_receiver
      FROM public.care_sources
     WHERE care_source_id = NEW.care_source_id;

    IF task_receiver <> source_receiver THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            MESSAGE = format(
                '%s cannot connect task %s and care source %s from different care receivers',
                TG_TABLE_NAME,
                NEW.task_id,
                NEW.care_source_id
            );
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_assignment_same_care_receiver() FROM PUBLIC;

CREATE CONSTRAINT TRIGGER current_assignment_same_care_receiver
AFTER INSERT OR UPDATE OF task_id, care_source_id
ON public.current_care_assignments
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW
EXECUTE FUNCTION public.assert_assignment_same_care_receiver();

CREATE CONSTRAINT TRIGGER backup_assignment_same_care_receiver
AFTER INSERT OR UPDATE OF task_id, care_source_id
ON public.backup_assignments
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW
EXECUTE FUNCTION public.assert_assignment_same_care_receiver();

CREATE FUNCTION public.assert_adaptation_same_care_receiver()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    scenario_receiver UUID;
    task_receiver UUID;
BEGIN
    SELECT care_receiver_id
      INTO STRICT scenario_receiver
      FROM public.care_scenarios
     WHERE scenario_id = NEW.scenario_id;

    SELECT care_receiver_id
      INTO STRICT task_receiver
      FROM public.care_tasks
     WHERE task_id = NEW.task_id;

    IF scenario_receiver <> task_receiver THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            MESSAGE = format(
                'task_adaptations cannot connect scenario %s and task %s from different care receivers',
                NEW.scenario_id,
                NEW.task_id
            );
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_adaptation_same_care_receiver() FROM PUBLIC;

CREATE CONSTRAINT TRIGGER adaptation_same_care_receiver
AFTER INSERT OR UPDATE OF scenario_id, task_id
ON public.task_adaptations
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW
EXECUTE FUNCTION public.assert_adaptation_same_care_receiver();

-- Receiver reassignment could invalidate derived relationships without
-- touching the assignment/adaptation rows. For the MVP these records are not
-- re-parented; moving one requires creating the correctly scoped record.
CREATE FUNCTION public.prevent_care_receiver_reparenting()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.care_receiver_id IS DISTINCT FROM OLD.care_receiver_id THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            MESSAGE = format(
                '%s.care_receiver_id is immutable after creation',
                TG_TABLE_NAME
            );
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_care_receiver_reparenting() FROM PUBLIC;

CREATE TRIGGER care_tasks_receiver_immutable
BEFORE UPDATE OF care_receiver_id
ON public.care_tasks
FOR EACH ROW
EXECUTE FUNCTION public.prevent_care_receiver_reparenting();

CREATE TRIGGER care_sources_receiver_immutable
BEFORE UPDATE OF care_receiver_id
ON public.care_sources
FOR EACH ROW
EXECUTE FUNCTION public.prevent_care_receiver_reparenting();

CREATE TRIGGER care_scenarios_receiver_immutable
BEFORE UPDATE OF care_receiver_id
ON public.care_scenarios
FOR EACH ROW
EXECUTE FUNCTION public.prevent_care_receiver_reparenting();

-- Index foreign-key and trigger lookup paths. IF NOT EXISTS lets this migration
-- tolerate indexes that are present in the audited live schema but absent from
-- the repository's older Migration 001 file.
CREATE INDEX IF NOT EXISTS idx_care_receivers_owner
    ON public.care_receivers(owner_user_id);

CREATE INDEX IF NOT EXISTS idx_care_sources_user
    ON public.care_sources(user_id);

CREATE INDEX IF NOT EXISTS idx_current_assignments_task
    ON public.current_care_assignments(task_id);

CREATE INDEX IF NOT EXISTS idx_current_assignments_source
    ON public.current_care_assignments(care_source_id);

CREATE INDEX IF NOT EXISTS idx_backup_assignments_task
    ON public.backup_assignments(task_id);

CREATE INDEX IF NOT EXISTS idx_backup_assignments_source
    ON public.backup_assignments(care_source_id);

CREATE INDEX IF NOT EXISTS idx_scenarios_receiver_source
    ON public.care_scenarios(care_receiver_id, unavailable_care_source_id);

CREATE INDEX IF NOT EXISTS idx_coverage_evaluations_scenario
    ON public.coverage_evaluations(scenario_id);

CREATE INDEX IF NOT EXISTS idx_task_adaptations_scenario
    ON public.task_adaptations(scenario_id);

CREATE INDEX IF NOT EXISTS idx_task_adaptations_task
    ON public.task_adaptations(task_id);

COMMIT;

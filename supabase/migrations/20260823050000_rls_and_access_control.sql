-- 備份心 MVP — Row-Level Security & Access Control
--
-- Scope:
--   1. Replace inherited broad table grants with explicit MVP privileges.
--   2. Enable RLS on all nine public core tables.
--   3. Enforce the single-owner boundary through care_receivers.owner_user_id.
--   4. Remove direct RPC-style EXECUTE access to Migration 002 trigger functions.
--
-- Root authorization invariant:
--   auth.uid() = care_receivers.owner_user_id
--
-- Temporary MVP invariant (not a permanent care-domain rule):
--   care_sources.user_id IS NULL
--   OR care_sources.user_id = care_receivers.owner_user_id
-- A NULL value is an unlinked care source. The owner UUID is the only linked
-- account supported by the single-owner MVP. Secondary caregiver accounts,
-- invitations, shared access, and household membership are not implemented.
-- This restriction must be redesigned when those multi-user features arrive.
--
-- Intentionally excluded:
--   Test accounts and seed data, Auth provider changes, household membership,
--   domain vocabulary changes, and trigger-function implementation hardening.

BEGIN;

-- Fail instead of silently layering this migration on an unexpected security
-- state. This migration is intended to be the first RLS/policy migration.
DO $$
DECLARE
    expected_tables CONSTANT TEXT[] := ARRAY[
        'backup_assignments',
        'care_receivers',
        'care_scenarios',
        'care_sources',
        'care_tasks',
        'coverage_evaluations',
        'current_care_assignments',
        'task_adaptations',
        'users'
    ];
    missing_tables TEXT[];
BEGIN
    SELECT ARRAY(
        SELECT expected_table
        FROM unnest(expected_tables) AS expected_table
        WHERE to_regclass('public.' || expected_table) IS NULL
    )
    INTO missing_tables;

    IF cardinality(missing_tables) > 0 THEN
        RAISE EXCEPTION
            'Migration 004 is missing expected public tables: %',
            missing_tables;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_class AS c
        JOIN pg_namespace AS n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = ANY (expected_tables)
          AND c.relrowsecurity
    ) THEN
        RAISE EXCEPTION
            'Migration 004 requires RLS to be disabled on all nine core tables';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = ANY (expected_tables)
    ) THEN
        RAISE EXCEPTION
            'Migration 004 requires no existing policies on the nine core tables';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.care_receivers
        WHERE owner_user_id IS NULL
    ) THEN
        RAISE EXCEPTION
            'Migration 004 requires every care receiver to have an owner';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.care_sources AS source
        JOIN public.care_receivers AS receiver
          ON receiver.care_receiver_id = source.care_receiver_id
        WHERE source.user_id IS NOT NULL
          AND source.user_id <> receiver.owner_user_id
    ) THEN
        RAISE EXCEPTION
            'Migration 004 requires linked care_sources.user_id to equal the receiver owner';
    END IF;

    IF to_regprocedure('public.assert_assignment_same_care_receiver()') IS NULL
       OR to_regprocedure('public.assert_adaptation_same_care_receiver()') IS NULL
       OR to_regprocedure('public.prevent_care_receiver_reparenting()') IS NULL
    THEN
        RAISE EXCEPTION
            'Migration 004 requires all Migration 002 integrity trigger functions';
    END IF;
END
$$;

-- Anonymous clients have no table-level access. RLS remains a second denial
-- layer, but the SQL privilege boundary does not depend on policies alone.
REVOKE ALL ON TABLE
    public.backup_assignments,
    public.care_receivers,
    public.care_scenarios,
    public.care_sources,
    public.care_tasks,
    public.coverage_evaluations,
    public.current_care_assignments,
    public.task_adaptations,
    public.users
FROM anon;

-- Remove broad baseline privileges before explicitly granting the MVP surface.
REVOKE ALL ON TABLE
    public.backup_assignments,
    public.care_receivers,
    public.care_scenarios,
    public.care_sources,
    public.care_tasks,
    public.coverage_evaluations,
    public.current_care_assignments,
    public.task_adaptations,
    public.users
FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
    public.backup_assignments,
    public.care_receivers,
    public.care_scenarios,
    public.care_sources,
    public.care_tasks,
    public.coverage_evaluations,
    public.current_care_assignments,
    public.task_adaptations
TO authenticated;

-- Profile rows are provisioned/deleted through auth.users lifecycle. Canonical
-- email synchronization is owned by the Migration 003 Auth trigger.
GRANT SELECT ON TABLE public.users TO authenticated;
GRANT UPDATE (display_name) ON TABLE public.users TO authenticated;

-- These SECURITY DEFINER functions are trigger implementation details, not
-- callable application RPCs. Trigger execution does not require caller EXECUTE.
REVOKE ALL ON FUNCTION public.assert_assignment_same_care_receiver()
FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.assert_adaptation_same_care_receiver()
FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.prevent_care_receiver_reparenting()
FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_receivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.current_care_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_adaptations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coverage_evaluations ENABLE ROW LEVEL SECURITY;

-- public.users: a user can see and rename only their own profile. No INSERT or
-- DELETE policy exists, and column privileges prevent direct email/ID updates.
CREATE POLICY users_select_own_profile
ON public.users
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY users_update_own_profile
ON public.users
FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- care_receivers: DEFAULT auth.uid() is convenience only; WITH CHECK is the
-- authorization boundary and prevents explicit assignment to another owner.
CREATE POLICY care_receivers_select_owned
ON public.care_receivers
FOR SELECT
TO authenticated
USING (owner_user_id = (SELECT auth.uid()));

CREATE POLICY care_receivers_insert_owned
ON public.care_receivers
FOR INSERT
TO authenticated
WITH CHECK (owner_user_id = (SELECT auth.uid()));

CREATE POLICY care_receivers_update_owned
ON public.care_receivers
FOR UPDATE
TO authenticated
USING (owner_user_id = (SELECT auth.uid()))
WITH CHECK (owner_user_id = (SELECT auth.uid()));

CREATE POLICY care_receivers_delete_owned
ON public.care_receivers
FOR DELETE
TO authenticated
USING (owner_user_id = (SELECT auth.uid()));

-- care_tasks
CREATE POLICY care_tasks_select_owned
ON public.care_tasks
FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1
    FROM public.care_receivers AS receiver
    WHERE receiver.care_receiver_id = care_tasks.care_receiver_id
      AND receiver.owner_user_id = (SELECT auth.uid())
));

CREATE POLICY care_tasks_insert_owned
ON public.care_tasks
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
    SELECT 1
    FROM public.care_receivers AS receiver
    WHERE receiver.care_receiver_id = care_tasks.care_receiver_id
      AND receiver.owner_user_id = (SELECT auth.uid())
));

CREATE POLICY care_tasks_update_owned
ON public.care_tasks
FOR UPDATE
TO authenticated
USING (EXISTS (
    SELECT 1
    FROM public.care_receivers AS receiver
    WHERE receiver.care_receiver_id = care_tasks.care_receiver_id
      AND receiver.owner_user_id = (SELECT auth.uid())
))
WITH CHECK (EXISTS (
    SELECT 1
    FROM public.care_receivers AS receiver
    WHERE receiver.care_receiver_id = care_tasks.care_receiver_id
      AND receiver.owner_user_id = (SELECT auth.uid())
));

CREATE POLICY care_tasks_delete_owned
ON public.care_tasks
FOR DELETE
TO authenticated
USING (EXISTS (
    SELECT 1
    FROM public.care_receivers AS receiver
    WHERE receiver.care_receiver_id = care_tasks.care_receiver_id
      AND receiver.owner_user_id = (SELECT auth.uid())
));

-- care_sources: temporary single-owner MVP invariant, not a general care-domain
-- rule. An owner may keep an unlinked source or link the only supported account
-- (the owner). This also prevents guessed profile UUIDs from becoming an FK
-- oracle until a household/membership authorization model replaces this rule.
CREATE POLICY care_sources_select_owned
ON public.care_sources
FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1
    FROM public.care_receivers AS receiver
    WHERE receiver.care_receiver_id = care_sources.care_receiver_id
      AND receiver.owner_user_id = (SELECT auth.uid())
));

CREATE POLICY care_sources_insert_owned
ON public.care_sources
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.care_receivers AS receiver
        WHERE receiver.care_receiver_id = care_sources.care_receiver_id
          AND receiver.owner_user_id = (SELECT auth.uid())
    )
    AND (user_id IS NULL OR user_id = (SELECT auth.uid()))
);

CREATE POLICY care_sources_update_owned
ON public.care_sources
FOR UPDATE
TO authenticated
USING (EXISTS (
    SELECT 1
    FROM public.care_receivers AS receiver
    WHERE receiver.care_receiver_id = care_sources.care_receiver_id
      AND receiver.owner_user_id = (SELECT auth.uid())
))
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.care_receivers AS receiver
        WHERE receiver.care_receiver_id = care_sources.care_receiver_id
          AND receiver.owner_user_id = (SELECT auth.uid())
    )
    AND (user_id IS NULL OR user_id = (SELECT auth.uid()))
);

CREATE POLICY care_sources_delete_owned
ON public.care_sources
FOR DELETE
TO authenticated
USING (EXISTS (
    SELECT 1
    FROM public.care_receivers AS receiver
    WHERE receiver.care_receiver_id = care_sources.care_receiver_id
      AND receiver.owner_user_id = (SELECT auth.uid())
));

-- care_scenarios: check both receiver and unavailable source ownership. The
-- composite FK separately guarantees that they belong to the same receiver.
CREATE POLICY care_scenarios_select_owned
ON public.care_scenarios
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.care_receivers AS receiver
        WHERE receiver.care_receiver_id = care_scenarios.care_receiver_id
          AND receiver.owner_user_id = (SELECT auth.uid())
    )
    AND EXISTS (
        SELECT 1 FROM public.care_sources AS source
        WHERE source.care_source_id = care_scenarios.unavailable_care_source_id
          AND source.care_receiver_id = care_scenarios.care_receiver_id
    )
);

CREATE POLICY care_scenarios_insert_owned
ON public.care_scenarios
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.care_receivers AS receiver
        WHERE receiver.care_receiver_id = care_scenarios.care_receiver_id
          AND receiver.owner_user_id = (SELECT auth.uid())
    )
    AND EXISTS (
        SELECT 1 FROM public.care_sources AS source
        WHERE source.care_source_id = care_scenarios.unavailable_care_source_id
          AND source.care_receiver_id = care_scenarios.care_receiver_id
    )
);

CREATE POLICY care_scenarios_update_owned
ON public.care_scenarios
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.care_receivers AS receiver
        WHERE receiver.care_receiver_id = care_scenarios.care_receiver_id
          AND receiver.owner_user_id = (SELECT auth.uid())
    )
    AND EXISTS (
        SELECT 1 FROM public.care_sources AS source
        WHERE source.care_source_id = care_scenarios.unavailable_care_source_id
          AND source.care_receiver_id = care_scenarios.care_receiver_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.care_receivers AS receiver
        WHERE receiver.care_receiver_id = care_scenarios.care_receiver_id
          AND receiver.owner_user_id = (SELECT auth.uid())
    )
    AND EXISTS (
        SELECT 1 FROM public.care_sources AS source
        WHERE source.care_source_id = care_scenarios.unavailable_care_source_id
          AND source.care_receiver_id = care_scenarios.care_receiver_id
    )
);

CREATE POLICY care_scenarios_delete_owned
ON public.care_scenarios
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.care_receivers AS receiver
        WHERE receiver.care_receiver_id = care_scenarios.care_receiver_id
          AND receiver.owner_user_id = (SELECT auth.uid())
    )
    AND EXISTS (
        SELECT 1 FROM public.care_sources AS source
        WHERE source.care_source_id = care_scenarios.unavailable_care_source_id
          AND source.care_receiver_id = care_scenarios.care_receiver_id
    )
);

-- current_care_assignments: validate both referenced ownership paths.
CREATE POLICY current_assignments_select_owned
ON public.current_care_assignments
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.care_tasks AS task
        WHERE task.task_id = current_care_assignments.task_id
    )
    AND EXISTS (
        SELECT 1 FROM public.care_sources AS source
        WHERE source.care_source_id = current_care_assignments.care_source_id
    )
);

CREATE POLICY current_assignments_insert_owned
ON public.current_care_assignments
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.care_tasks AS task
        WHERE task.task_id = current_care_assignments.task_id
    )
    AND EXISTS (
        SELECT 1 FROM public.care_sources AS source
        WHERE source.care_source_id = current_care_assignments.care_source_id
    )
);

CREATE POLICY current_assignments_update_owned
ON public.current_care_assignments
FOR UPDATE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.care_tasks AS task WHERE task.task_id = current_care_assignments.task_id)
    AND EXISTS (SELECT 1 FROM public.care_sources AS source WHERE source.care_source_id = current_care_assignments.care_source_id)
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.care_tasks AS task WHERE task.task_id = current_care_assignments.task_id)
    AND EXISTS (SELECT 1 FROM public.care_sources AS source WHERE source.care_source_id = current_care_assignments.care_source_id)
);

CREATE POLICY current_assignments_delete_owned
ON public.current_care_assignments
FOR DELETE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.care_tasks AS task WHERE task.task_id = current_care_assignments.task_id)
    AND EXISTS (SELECT 1 FROM public.care_sources AS source WHERE source.care_source_id = current_care_assignments.care_source_id)
);

-- backup_assignments: validate both referenced ownership paths.
CREATE POLICY backup_assignments_select_owned
ON public.backup_assignments
FOR SELECT
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.care_tasks AS task WHERE task.task_id = backup_assignments.task_id)
    AND EXISTS (SELECT 1 FROM public.care_sources AS source WHERE source.care_source_id = backup_assignments.care_source_id)
);

CREATE POLICY backup_assignments_insert_owned
ON public.backup_assignments
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.care_tasks AS task WHERE task.task_id = backup_assignments.task_id)
    AND EXISTS (SELECT 1 FROM public.care_sources AS source WHERE source.care_source_id = backup_assignments.care_source_id)
);

CREATE POLICY backup_assignments_update_owned
ON public.backup_assignments
FOR UPDATE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.care_tasks AS task WHERE task.task_id = backup_assignments.task_id)
    AND EXISTS (SELECT 1 FROM public.care_sources AS source WHERE source.care_source_id = backup_assignments.care_source_id)
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.care_tasks AS task WHERE task.task_id = backup_assignments.task_id)
    AND EXISTS (SELECT 1 FROM public.care_sources AS source WHERE source.care_source_id = backup_assignments.care_source_id)
);

CREATE POLICY backup_assignments_delete_owned
ON public.backup_assignments
FOR DELETE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.care_tasks AS task WHERE task.task_id = backup_assignments.task_id)
    AND EXISTS (SELECT 1 FROM public.care_sources AS source WHERE source.care_source_id = backup_assignments.care_source_id)
);

-- task_adaptations: validate both scenario and task ownership paths.
CREATE POLICY task_adaptations_select_owned
ON public.task_adaptations
FOR SELECT
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.care_scenarios AS scenario WHERE scenario.scenario_id = task_adaptations.scenario_id)
    AND EXISTS (SELECT 1 FROM public.care_tasks AS task WHERE task.task_id = task_adaptations.task_id)
);

CREATE POLICY task_adaptations_insert_owned
ON public.task_adaptations
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.care_scenarios AS scenario WHERE scenario.scenario_id = task_adaptations.scenario_id)
    AND EXISTS (SELECT 1 FROM public.care_tasks AS task WHERE task.task_id = task_adaptations.task_id)
);

CREATE POLICY task_adaptations_update_owned
ON public.task_adaptations
FOR UPDATE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.care_scenarios AS scenario WHERE scenario.scenario_id = task_adaptations.scenario_id)
    AND EXISTS (SELECT 1 FROM public.care_tasks AS task WHERE task.task_id = task_adaptations.task_id)
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.care_scenarios AS scenario WHERE scenario.scenario_id = task_adaptations.scenario_id)
    AND EXISTS (SELECT 1 FROM public.care_tasks AS task WHERE task.task_id = task_adaptations.task_id)
);

CREATE POLICY task_adaptations_delete_owned
ON public.task_adaptations
FOR DELETE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.care_scenarios AS scenario WHERE scenario.scenario_id = task_adaptations.scenario_id)
    AND EXISTS (SELECT 1 FROM public.care_tasks AS task WHERE task.task_id = task_adaptations.task_id)
);

-- coverage_evaluations: ownership derives through the referenced scenario.
CREATE POLICY coverage_evaluations_select_owned
ON public.coverage_evaluations
FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.care_scenarios AS scenario
    WHERE scenario.scenario_id = coverage_evaluations.scenario_id
));

CREATE POLICY coverage_evaluations_insert_owned
ON public.coverage_evaluations
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
    SELECT 1 FROM public.care_scenarios AS scenario
    WHERE scenario.scenario_id = coverage_evaluations.scenario_id
));

CREATE POLICY coverage_evaluations_update_owned
ON public.coverage_evaluations
FOR UPDATE
TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.care_scenarios AS scenario
    WHERE scenario.scenario_id = coverage_evaluations.scenario_id
))
WITH CHECK (EXISTS (
    SELECT 1 FROM public.care_scenarios AS scenario
    WHERE scenario.scenario_id = coverage_evaluations.scenario_id
));

CREATE POLICY coverage_evaluations_delete_owned
ON public.coverage_evaluations
FOR DELETE
TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.care_scenarios AS scenario
    WHERE scenario.scenario_id = coverage_evaluations.scenario_id
));

COMMIT;

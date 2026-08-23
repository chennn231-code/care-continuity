-- 備份心 MVP — Backup Assignment Semantics
--
-- Scope:
--   1. Represent POSSIBLE as a candidate with unknown capability and time.
--   2. Require confirmed backup arrangements to record committed support modes.
--   3. Keep full-pattern and limited-pattern confirmation states distinct.
--   4. Remove the unsafe implicit ON_SITE support-mode default.
--
-- Intentionally excluded:
--   backup UI, Coverage Engine changes, seed data, scenario/evaluation
--   persistence, household membership, and detailed JSON subset validation.

BEGIN;

-- Fail instead of guessing the meaning of any existing backup arrangement.
-- The audited MVP database is expected to contain no backup rows. This
-- preflight also makes the migration safe if that expectation later changes:
-- every existing row must already conform to the new canonical contract.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.backup_assignments AS backup
        WHERE CASE backup.confirmation_status
            WHEN 'POSSIBLE' THEN
                backup.time_scope IS NULL
                AND cardinality(backup.support_modes_committed) = 0
            WHEN 'CONFIRMED' THEN
                backup.time_scope = '{"mode":"SAME_AS_TASK_PATTERN"}'::jsonb
                AND cardinality(backup.support_modes_committed) > 0
            WHEN 'CONFIRMED_WITH_LIMITS' THEN
                backup.time_scope IS NOT NULL
                AND backup.time_scope <> '{}'::jsonb
                AND (backup.time_scope ->> 'mode') IS DISTINCT FROM 'SAME_AS_TASK_PATTERN'
                AND cardinality(backup.support_modes_committed) > 0
            ELSE FALSE
        END IS NOT TRUE
    ) THEN
        RAISE EXCEPTION
            'Migration 005 found backup_assignments outside the canonical backup semantics; manual review is required';
    END IF;
END
$$;

-- Unknown capability must be explicit for POSSIBLE. Do not let PostgreSQL
-- silently turn an omitted value into a claim that ON_SITE support is committed.
ALTER TABLE public.backup_assignments
    ALTER COLUMN support_modes_committed DROP DEFAULT;

-- Replace the baseline constraints whose independent rules cannot represent
-- POSSIBLE + empty committed modes while keeping confirmed modes non-empty.
ALTER TABLE public.backup_assignments
    DROP CONSTRAINT chk_backup_support_modes_not_empty,
    DROP CONSTRAINT chk_confirmed_with_limits_has_scope,
    DROP CONSTRAINT chk_possible_has_no_time_scope;

ALTER TABLE public.backup_assignments
    ADD CONSTRAINT chk_backup_possible_canonical
    CHECK (
        confirmation_status <> 'POSSIBLE'
        OR (
            time_scope IS NULL
            AND cardinality(support_modes_committed) = 0
        )
    ),
    ADD CONSTRAINT chk_backup_confirmed_canonical
    CHECK (
        confirmation_status <> 'CONFIRMED'
        OR (
            time_scope = '{"mode":"SAME_AS_TASK_PATTERN"}'::jsonb
            AND cardinality(support_modes_committed) > 0
        )
    ),
    ADD CONSTRAINT chk_backup_confirmed_with_limits_canonical
    CHECK (
        confirmation_status <> 'CONFIRMED_WITH_LIMITS'
        OR (
            time_scope IS NOT NULL
            AND time_scope <> '{}'::jsonb
            AND (time_scope ->> 'mode') IS DISTINCT FROM 'SAME_AS_TASK_PATTERN'
            AND cardinality(support_modes_committed) > 0
        )
    );

-- Existing constraints intentionally retained:
--   chk_backup_confirmation_status
--   chk_backup_support_modes_valid
--   chk_backup_time_scope_object
-- Application validation remains responsible for HH:mm validity, weekday and
-- scheduled-time subsets, limited-scope keys, and the AS_NEEDED scope rule.

COMMIT;

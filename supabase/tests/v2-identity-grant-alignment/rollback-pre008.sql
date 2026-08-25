-- Local-only invalid legacy fixture for transaction rollback verification.
-- Migration 007 normally prevents this role/purpose pair. The disposable test
-- deliberately removes that one check so Migration 008 must fail closed when no
-- exact template mapping exists.
INSERT INTO public.v2_actor_references(actor_id,actor_kind,display_name_snapshot)
VALUES ('91000000-0000-0000-0000-880000000001','HISTORICAL_ACTOR','Synthetic Rollback Actor');

INSERT INTO public.v2_cases(case_id,status,subject_display_name,draft_creator_actor_id,creation_operation_key)
VALUES ('91100000-0000-0000-0000-880000000001','ACTIVE','Synthetic Rollback Case',
        '91000000-0000-0000-0000-880000000001','91110000-0000-0000-0000-880000000001');

INSERT INTO public.v2_case_memberships(
  membership_id,case_id,actor_id,relationship_kind,status,starts_at,accepted_at
) VALUES (
  '91200000-0000-0000-0000-880000000001','91100000-0000-0000-0000-880000000001',
  '91000000-0000-0000-0000-880000000001','CASE_ADMIN','ACTIVE',
  clock_timestamp()-interval '1 day',clock_timestamp()-interval '1 day'
);

ALTER TABLE public.v2_role_grants DROP CONSTRAINT chk_v2_grant_role_purpose;

INSERT INTO public.v2_role_grants(
  grant_id,membership_id,role_type,purpose,scope_ceiling,template_version,status,starts_at,granted_by_actor_id
) VALUES (
  '91300000-0000-0000-0000-880000000001','91200000-0000-0000-0000-880000000001',
  'CASE_ADMIN','FAMILY_CARE','AUTHOR_ONLY','INVALID_ROLLBACK_FIXTURE','ACTIVE',
  clock_timestamp()-interval '1 day','91000000-0000-0000-0000-880000000001'
);

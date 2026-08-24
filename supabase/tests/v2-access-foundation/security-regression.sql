\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
SELECT case_id AS case_a FROM public.v2_cases WHERE creation_operation_key='a0000000-0000-0000-0000-880000000001' \gset
SELECT membership_id AS membership_a FROM public.v2_case_memberships
 WHERE case_id=:'case_a' AND actor_id=(SELECT actor_id FROM public.v2_actor_references WHERE auth_user_id='71000000-0000-0000-0000-880000000001') \gset
SELECT membership_id AS membership_b FROM public.v2_case_memberships
 WHERE case_id=:'case_a' AND actor_id=(SELECT actor_id FROM public.v2_actor_references WHERE auth_user_id='72000000-0000-0000-0000-880000000002') \gset
SELECT case_id AS case_c FROM public.v2_cases WHERE creation_operation_key='c0000000-0000-0000-0000-880000000010' \gset
SELECT membership_id AS membership_c FROM public.v2_case_memberships WHERE case_id=:'case_c' LIMIT 1 \gset

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','71000000-0000-0000-0000-880000000001',false);
SELECT v2_access_harness.expect_error('Access Event UPDATE rejected',format('update public.v2_access_events set reason_code=%L where case_id=%L','changed',:'case_a'));
SELECT v2_access_harness.expect_error('Access Event DELETE rejected',format('delete from public.v2_access_events where case_id=%L',:'case_a'));
SELECT v2_access_harness.expect_error('Access Event direct INSERT rejected',format('insert into public.v2_access_events(case_id,event_type,target_kind,target_id,event_at) values(%L,%L,%L,%L,clock_timestamp())',:'case_a','CASE_ACTIVATED','CASE',:'case_a'));
SELECT v2_access_harness.expect_error('Role Grant direct UPDATE rejected',format('update public.v2_role_grants set status=%L where membership_id=%L','REVOKED',:'membership_b'));
RESET ROLE;

-- Restore B's time window after the core ends_at boundary test.
UPDATE public.v2_case_memberships SET ends_at=NULL WHERE membership_id=:'membership_b';
UPDATE public.v2_role_grants SET ends_at=NULL WHERE membership_id=:'membership_b';

UPDATE public.v2_cases SET status='SUSPENDED',suspended_at=clock_timestamp(),suspended_reason='DRYRUN' WHERE case_id=:'case_a';
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','72000000-0000-0000-0000-880000000002',false);
SELECT v2_access_harness.record_result('SUSPENDED Case stops daily access',NOT EXISTS(SELECT 1 FROM public.v2_cases WHERE case_id=:'case_a'),'current database Case state denies same JWT context');
RESET ROLE;
UPDATE public.v2_cases SET status='ACTIVE',suspended_at=NULL,suspended_reason=NULL WHERE case_id=:'case_a';

UPDATE public.v2_role_grants SET status='REVOKED',revoked_at=clock_timestamp(),terminal_reason='DRYRUN' WHERE membership_id=:'membership_b' AND status='ACTIVE';
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','72000000-0000-0000-0000-880000000002',false);
SELECT v2_access_harness.record_result('Grant revocation rejects old JWT immediately',NOT EXISTS(SELECT 1 FROM public.v2_cases WHERE case_id=:'case_a'),'same JWT context cannot use revoked grant');
RESET ROLE;
UPDATE public.v2_role_grants SET status='ACTIVE',revoked_at=NULL,terminal_reason=NULL WHERE membership_id=:'membership_b';

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','71000000-0000-0000-0000-880000000001',false);
SELECT public.revoke_v2_membership(:'membership_b','DRYRUN_REVOKE','f1000000-0000-0000-0000-880000000001');
RESET ROLE;
SELECT v2_access_harness.record_result('Membership revoke RPC executes atomically',
 (SELECT status='REVOKED' FROM public.v2_case_memberships WHERE membership_id=:'membership_b')
 AND NOT EXISTS(SELECT 1 FROM public.v2_role_grants WHERE membership_id=:'membership_b' AND status='ACTIVE')
 AND EXISTS(SELECT 1 FROM public.v2_access_events WHERE operation_key='f1000000-0000-0000-0000-880000000001'),
 'Membership Grants and Event committed together');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','72000000-0000-0000-0000-880000000002',false);
SELECT v2_access_harness.record_result('Membership revocation rejects old JWT immediately',NOT EXISTS(SELECT 1 FROM public.v2_cases WHERE case_id=:'case_a'),'same JWT context denied after committed revoke');
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','71000000-0000-0000-0000-880000000001',false);
SELECT v2_access_harness.expect_error('Final manager guard rejects direct leave',format('select public.revoke_v2_membership(%L,%L,%L)',:'membership_a','SELF_REMOVE','f1000000-0000-0000-0000-880000000002'));
RESET ROLE;
SELECT v2_access_harness.record_result('Final manager guard rejects direct leave',
 (SELECT outcome='PASS' FROM v2_access_harness.results WHERE test_name='Final manager guard rejects direct leave')
 AND (SELECT status='ACTIVE' FROM public.v2_case_memberships WHERE membership_id=:'membership_a')
 AND NOT EXISTS(SELECT 1 FROM public.v2_access_events WHERE operation_key='f1000000-0000-0000-0000-880000000002'),
 'guard failure leaves Membership Grant and Event unchanged');

-- Fresh C admin: acceptance must create Actor and normalize Email.
INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data)
VALUES ('78000000-0000-0000-0000-870000000003','synthetic-c-admin-harness@dryrun.invalid',clock_timestamp(),jsonb_build_object('display_name','Untrusted Metadata'));
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','71000000-0000-0000-0000-880000000001',false);
SELECT * FROM public.issue_v2_invitation(:'case_a','  SYNTHETIC-C-ADMIN-HARNESS@DRYRUN.INVALID  ','CASE_ADMIN','CASE_ADMINISTRATION','AUTHOR_ONLY',clock_timestamp()+interval '1 minute',NULL,clock_timestamp()+interval '1 hour',NULL,NULL,'f1000000-0000-0000-0000-880000000003') \gset admin_inv_
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','78000000-0000-0000-0000-870000000003',false);
SELECT public.accept_v2_invitation(:'admin_inv_raw_token','f1000000-0000-0000-0000-880000000004') AS membership_cadmin \gset
RESET ROLE;
UPDATE public.v2_case_memberships SET starts_at=clock_timestamp()-interval '1 minute' WHERE membership_id=:'membership_cadmin';
UPDATE public.v2_role_grants SET starts_at=clock_timestamp()-interval '1 minute' WHERE membership_id=:'membership_cadmin';
SELECT v2_access_harness.record_result('Fresh admin acceptance normalizes Email and creates one Actor',
 (SELECT count(*)=1 FROM public.v2_actor_references WHERE auth_user_id='78000000-0000-0000-0000-870000000003')
 AND (SELECT count(*)=1 FROM public.v2_case_memberships WHERE membership_id=:'membership_cadmin'),
 'confirmed normalized Email accepted without pre-existing Actor');

SELECT v2_access_harness.expect_error('Partial unique index blocks duplicate active grant',format($q$
 insert into public.v2_role_grants(membership_id,role_type,purpose,scope_ceiling,template_version,starts_at,granted_by_actor_id)
 select %L,'CASE_ADMIN','CASE_ADMINISTRATION','AUTHOR_ONLY','ACCESS_FOUNDATION_V1',clock_timestamp(),actor_id
 from public.v2_actor_references where auth_user_id='71000000-0000-0000-0000-880000000001'$q$,:'membership_cadmin'));

-- Successful transfer inside a transaction must reuse target grant; rollback restores both admins.
SELECT count(*) AS target_before FROM public.v2_role_grants WHERE membership_id=:'membership_cadmin' AND role_type='CASE_ADMIN' AND status='ACTIVE' \gset
BEGIN;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','71000000-0000-0000-0000-880000000001',false);
SELECT public.transfer_v2_case_admin(:'case_a',:'membership_a',:'membership_cadmin','f1000000-0000-0000-0000-880000000005') AS reused_grant \gset
RESET ROLE;
SELECT count(*) AS target_during FROM public.v2_role_grants WHERE membership_id=:'membership_cadmin' AND role_type='CASE_ADMIN' AND status='ACTIVE' \gset
ROLLBACK;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','71000000-0000-0000-0000-880000000001',false);
SELECT v2_access_harness.expect_error('Admin transfer reuses grant and rejects cross-case source',format('select public.transfer_v2_case_admin(%L,%L,%L,%L)',:'case_a',:'membership_c',:'membership_cadmin','f1000000-0000-0000-0000-880000000006'));
RESET ROLE;
SELECT v2_access_harness.record_result('Admin transfer reuses grant and rejects cross-case source',
 :'target_before'::int=1 AND :'target_during'::int=1
 AND (SELECT outcome='PASS' FROM v2_access_harness.results WHERE test_name='Admin transfer reuses grant and rejects cross-case source')
 AND (SELECT status='ACTIVE' FROM public.v2_case_memberships WHERE membership_id=:'membership_a')
 AND NOT EXISTS(SELECT 1 FROM public.v2_access_events WHERE operation_key IN ('f1000000-0000-0000-0000-880000000005','f1000000-0000-0000-0000-880000000006')),
 'target grant reused; rollback and cross-case rejection leave no partial state');

CREATE TABLE v2_access_harness.concurrency_ids(case_id uuid,membership_a uuid,membership_c uuid);
INSERT INTO v2_access_harness.concurrency_ids VALUES(:'case_a',:'membership_a',:'membership_cadmin');
GRANT SELECT ON v2_access_harness.concurrency_ids TO authenticated;

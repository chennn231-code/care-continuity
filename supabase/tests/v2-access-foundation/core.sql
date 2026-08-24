\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

CREATE SCHEMA v2_access_harness;
CREATE TABLE v2_access_harness.results (
  test_name text PRIMARY KEY,
  outcome text NOT NULL,
  detail text NOT NULL
);
CREATE TABLE v2_access_harness.secrets (
  key text PRIMARY KEY,
  value text NOT NULL
);
REVOKE ALL ON SCHEMA v2_access_harness FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA v2_access_harness TO authenticated;
GRANT INSERT, SELECT, UPDATE ON v2_access_harness.results TO authenticated;

CREATE FUNCTION v2_access_harness.record_result(p_name text, p_ok boolean, p_detail text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  INSERT INTO v2_access_harness.results(test_name,outcome,detail)
  VALUES (p_name, CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END, p_detail)
  ON CONFLICT (test_name) DO UPDATE SET outcome=excluded.outcome,detail=excluded.detail;
END $$;

CREATE FUNCTION v2_access_harness.expect_error(p_name text, p_sql text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  EXECUTE p_sql;
  PERFORM v2_access_harness.record_result(p_name,false,'statement unexpectedly succeeded');
EXCEPTION WHEN OTHERS THEN
  PERFORM v2_access_harness.record_result(p_name,true,'rejected with SQLSTATE '||SQLSTATE);
END $$;
GRANT EXECUTE ON FUNCTION v2_access_harness.record_result(text,boolean,text) TO authenticated;
GRANT EXECUTE ON FUNCTION v2_access_harness.expect_error(text,text) TO authenticated;

-- Completely fictitious local-only identities.
INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data)
VALUES
 ('71000000-0000-0000-0000-880000000001','synthetic-a-harness@example.invalid',clock_timestamp(),'{}'::jsonb || jsonb_build_object('display_name','Synthetic A')),
 ('72000000-0000-0000-0000-880000000002','synthetic-b-harness@example.invalid',clock_timestamp(),'{}'::jsonb || jsonb_build_object('display_name','Synthetic B')),
 ('73000000-0000-0000-0000-880000000003','synthetic-c-harness@example.invalid',clock_timestamp(),'{}'::jsonb || jsonb_build_object('display_name','Synthetic C')),
 ('74000000-0000-0000-0000-880000000004','synthetic-u-harness@example.invalid',NULL,'{}'::jsonb || jsonb_build_object('display_name','Synthetic U'));

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','71000000-0000-0000-0000-880000000001',false);
SELECT public.create_v2_draft_case('Synthetic Subject A','Synthetic A','a0000000-0000-0000-0000-880000000001') AS case_a \gset
SELECT v2_access_harness.record_result('01 A creates DRAFT',
  (SELECT status='DRAFT' FROM public.v2_cases WHERE case_id=:'case_a'),
  'creator can read own DRAFT');

SELECT public.create_v2_draft_case('Synthetic Atomic Failure','Synthetic A','a0000000-0000-0000-0000-880000000002') AS case_fail \gset
SELECT v2_access_harness.expect_error('06 activation failure is rejected',
  format('select public.activate_v2_case(%L,NULL,%L,%L,%L)', :'case_fail','DECL_V1','NOTICE_V1','a0000000-0000-0000-0000-880000000003'));

SELECT v2_access_harness.expect_error('03 DRAFT cannot issue invitation',
  format('select * from public.issue_v2_invitation(%L,%L,%L,%L,%L,clock_timestamp()+interval ''1 hour'',NULL,clock_timestamp()+interval ''1 day'',NULL,NULL,%L)',
    :'case_a','synthetic-b-harness@example.invalid','FAMILY_MEMBER','FAMILY_CARE','SHARED_CARE','a0000000-0000-0000-0000-880000000004'));
RESET ROLE;

SELECT v2_access_harness.record_result('06 no half-activated Case',
  (SELECT status='DRAFT' FROM public.v2_cases WHERE case_id=:'case_fail')
  AND NOT EXISTS (SELECT 1 FROM public.v2_case_memberships WHERE case_id=:'case_fail')
  AND NOT EXISTS (SELECT 1 FROM public.v2_authorization_declarations WHERE case_id=:'case_fail'),
  'failed activation rolled back declaration and membership');

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','72000000-0000-0000-0000-880000000002',false);
SELECT v2_access_harness.record_result('02 B cannot view A DRAFT',
  NOT EXISTS (SELECT 1 FROM public.v2_cases WHERE case_id=:'case_a'),
  'RLS hides unrelated DRAFT');
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','71000000-0000-0000-0000-880000000001',false);
SELECT public.activate_v2_case(:'case_a','SELF_DECLARED','DECL_V1','NOTICE_V1','a0000000-0000-0000-0000-880000000005') AS membership_a \gset
RESET ROLE;
SELECT v2_access_harness.record_result('04 A atomically activates Case',
  (SELECT status='ACTIVE' FROM public.v2_cases WHERE case_id=:'case_a'),
  'Case is ACTIVE');
SELECT v2_access_harness.record_result('05 first Membership and admin Grant exist',
  (SELECT count(*)=1 FROM public.v2_case_memberships WHERE case_id=:'case_a' AND status='ACTIVE')
  AND (SELECT count(*)=1 FROM public.v2_role_grants g JOIN public.v2_case_memberships m USING(membership_id)
       WHERE m.case_id=:'case_a' AND g.role_type='CASE_ADMIN' AND g.scope_ceiling='AUTHOR_ONLY'),
  'first active membership and constrained admin grant created');
SELECT v2_access_harness.record_result('17 CASE_ADMIN has no implicit content scope',
  (SELECT bool_and(scope_ceiling='AUTHOR_ONLY') FROM public.v2_role_grants g JOIN public.v2_case_memberships m USING(membership_id) WHERE m.case_id=:'case_a' AND g.role_type='CASE_ADMIN'),
  'all admin grants use AUTHOR_ONLY');

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','72000000-0000-0000-0000-880000000002',false);
SELECT v2_access_harness.record_result('13 B before acceptance cannot view Case',
  NOT EXISTS (SELECT 1 FROM public.v2_cases WHERE case_id=:'case_a'),
  'no membership before acceptance');
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','71000000-0000-0000-0000-880000000001',false);
SELECT * FROM public.issue_v2_invitation(
  :'case_a','  SYNTHETIC-B-harness@EXAMPLE.INVALID  ','FAMILY_MEMBER','FAMILY_CARE','SHARED_CARE',
  clock_timestamp()+interval '1 hour',NULL,clock_timestamp()+interval '1 day',NULL,NULL,
  'a0000000-0000-0000-0000-880000000006') \gset
RESET ROLE;
INSERT INTO v2_access_harness.secrets VALUES ('token_b', :'raw_token');
SELECT v2_access_harness.record_result('07 A issues invitation',
  EXISTS (SELECT 1 FROM public.v2_invitations WHERE invitation_id=:'invitation_id' AND status='INVITED'),
  'invitation row created');
SELECT v2_access_harness.record_result('09 raw token is not persisted',
  NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='v2_invitations' AND column_name LIKE '%raw%')
  AND NOT EXISTS (SELECT 1 FROM public.v2_invitations WHERE encode(token_hash,'hex')=:'raw_token'),
  'only digest column exists');
SELECT v2_access_harness.record_result('08a invited account initially has no Actor',
  NOT EXISTS(SELECT 1 FROM public.v2_actor_references WHERE auth_user_id='72000000-0000-0000-0000-880000000002'),
  'fresh confirmed Auth identity has no pre-created Actor');

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','72000000-0000-0000-0000-880000000002',false);
SELECT public.accept_v2_invitation(:'raw_token','b0000000-0000-0000-0000-880000000001') AS membership_b \gset
SELECT v2_access_harness.expect_error('10 token replay rejected',
  format('select public.accept_v2_invitation(%L,%L)', :'raw_token','b0000000-0000-0000-0000-880000000002'));
RESET ROLE;
SELECT v2_access_harness.record_result('08b acceptance atomically creates Actor Membership Grant Events',
  (SELECT count(*)=1 FROM public.v2_actor_references WHERE auth_user_id='72000000-0000-0000-0000-880000000002')
  AND (SELECT count(*)=1 FROM public.v2_case_memberships WHERE membership_id=:'membership_b')
  AND (SELECT count(*)=1 FROM public.v2_role_grants WHERE membership_id=:'membership_b')
  AND (SELECT count(*)=3 FROM public.v2_access_events WHERE operation_key='b0000000-0000-0000-0000-880000000001'),
  'all acceptance records committed together');
SELECT v2_access_harness.record_result('10b replay creates no second Actor or Membership',
  (SELECT count(*)=1 FROM public.v2_actor_references WHERE auth_user_id='72000000-0000-0000-0000-880000000002')
  AND (SELECT count(*)=1 FROM public.v2_case_memberships WHERE source_invitation_id=:'invitation_id'),
  'replay is safely rejected without duplicates');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','72000000-0000-0000-0000-880000000002',false);
SELECT v2_access_harness.record_result('starts_at before time rejects access',
  NOT EXISTS (SELECT 1 FROM public.v2_cases WHERE case_id=:'case_a'),
  'accepted future membership is not yet effective');
RESET ROLE;

-- Controlled local timestamp setup avoids sleeping.
UPDATE public.v2_case_memberships SET starts_at=clock_timestamp()-interval '1 hour' WHERE membership_id=:'membership_b';
UPDATE public.v2_role_grants SET starts_at=clock_timestamp()-interval '1 hour' WHERE membership_id=:'membership_b';

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','72000000-0000-0000-0000-880000000002',false);
SELECT v2_access_harness.record_result('08 B accepts matching confirmed Email',
  EXISTS (SELECT 1 FROM public.v2_cases WHERE case_id=:'case_a'),
  'normalized confirmed Email accepted');
SELECT v2_access_harness.record_result('14 B receives only specified grant path',
  (SELECT count(*)=1 FROM public.v2_role_grants WHERE membership_id=:'membership_b')
  AND NOT v2_private.has_case_grant_path(:'case_a','MANAGE_INVITATIONS','CASE_ADMINISTRATION',NULL),
  'family grant cannot manage invitations');
SELECT v2_access_harness.record_result('16 grants cannot be stitched',
  NOT v2_private.has_case_grant_path(:'case_a','MANAGE_GRANTS',NULL,NULL),
  'no complete B grant path has management capability');
SELECT v2_access_harness.expect_error('18 direct Membership write rejected',
  format('insert into public.v2_case_memberships(case_id,actor_id,relationship_kind,status,starts_at,accepted_at) values (%L,%L,%L,%L,clock_timestamp(),clock_timestamp())', :'case_a','99000000-0000-0000-0000-880000000000','FAMILY','ACTIVE'));
SELECT v2_access_harness.expect_error('19 direct Role Grant write rejected',
  format('update public.v2_role_grants set terminal_reason=%L where membership_id=%L','forbidden', :'membership_b'));
SELECT v2_access_harness.expect_error('20 direct Access Event write rejected',
  format('delete from public.v2_access_events where case_id=%L', :'case_a'));
RESET ROLE;

-- Email mismatch.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','71000000-0000-0000-0000-880000000001',false);
SELECT * FROM public.issue_v2_invitation(:'case_a','synthetic-b-harness@example.invalid','FAMILY_MEMBER','FAMILY_CARE','SHARED_CARE',clock_timestamp()+interval '1 hour',NULL,clock_timestamp()+interval '1 day',NULL,NULL,'a0000000-0000-0000-0000-880000000007') \gset pref_mismatch_
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','73000000-0000-0000-0000-880000000003',false);
SELECT v2_access_harness.expect_error('confirmed Email mismatch rejected',
  format('select public.accept_v2_invitation(%L,%L)', :'pref_mismatch_raw_token','c0000000-0000-0000-0000-880000000001'));
RESET ROLE;
SELECT v2_access_harness.record_result('invalid recipient binding leaves no Actor',
  NOT EXISTS(SELECT 1 FROM public.v2_actor_references WHERE auth_user_id='73000000-0000-0000-0000-880000000003'),
  'Actor creation occurs only after Invitation validation');

-- Unconfirmed Email.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','71000000-0000-0000-0000-880000000001',false);
SELECT * FROM public.issue_v2_invitation(:'case_a','synthetic-u-harness@example.invalid','FAMILY_MEMBER','FAMILY_CARE','SHARED_CARE',clock_timestamp()+interval '1 hour',NULL,clock_timestamp()+interval '1 day',NULL,NULL,'a0000000-0000-0000-0000-880000000008') \gset pref_unconfirmed_
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','74000000-0000-0000-0000-880000000004',false);
SELECT v2_access_harness.expect_error('unconfirmed Email rejected',
  format('select public.accept_v2_invitation(%L,%L)', :'pref_unconfirmed_raw_token','d0000000-0000-0000-0000-880000000001'));
RESET ROLE;

-- Missing Auth row context.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','75000000-0000-0000-0000-880000000005',false);
SELECT v2_access_harness.expect_error('missing Auth row rejected',
  format('select public.accept_v2_invitation(%L,%L)', :'pref_mismatch_raw_token','e0000000-0000-0000-0000-880000000001'));
RESET ROLE;

-- Expired and revoked tokens.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','71000000-0000-0000-0000-880000000001',false);
SELECT * FROM public.issue_v2_invitation(:'case_a','synthetic-c-harness@example.invalid','FAMILY_MEMBER','FAMILY_CARE','SHARED_CARE',clock_timestamp()+interval '1 hour',NULL,clock_timestamp()+interval '1 day',NULL,NULL,'a0000000-0000-0000-0000-880000000009') \gset pref_expired_
SELECT * FROM public.issue_v2_invitation(:'case_a','synthetic-c-harness@example.invalid','FAMILY_MEMBER','FAMILY_CARE','SHARED_CARE',clock_timestamp()+interval '1 hour',NULL,clock_timestamp()+interval '1 day',NULL,NULL,'a0000000-0000-0000-0000-880000000010') \gset pref_revoked_
SELECT public.revoke_v2_invitation(:'pref_revoked_invitation_id','synthetic revoke','a0000000-0000-0000-0000-880000000011');
RESET ROLE;
UPDATE public.v2_invitations SET created_at=clock_timestamp()-interval '2 days',expires_at=clock_timestamp()-interval '1 day' WHERE invitation_id=:'pref_expired_invitation_id';
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','73000000-0000-0000-0000-880000000003',false);
SELECT v2_access_harness.expect_error('11 expired token rejected',format('select public.accept_v2_invitation(%L,%L)', :'pref_expired_raw_token','c0000000-0000-0000-0000-880000000002'));
SELECT v2_access_harness.expect_error('12 revoked token rejected',format('select public.accept_v2_invitation(%L,%L)', :'pref_revoked_raw_token','c0000000-0000-0000-0000-880000000003'));
RESET ROLE;

-- Separate C Case for cross-case isolation and later Auth deletion.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','73000000-0000-0000-0000-880000000003',false);
SELECT public.create_v2_draft_case('Synthetic Subject C','Synthetic C','c0000000-0000-0000-0000-880000000010') AS case_c \gset
SELECT public.activate_v2_case(:'case_c','SELF_DECLARED','DECL_V1','NOTICE_V1','c0000000-0000-0000-0000-880000000011') AS membership_c \gset
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','71000000-0000-0000-0000-880000000001',false);
SELECT v2_access_harness.record_result('15 A B C case isolation',
  NOT EXISTS (SELECT 1 FROM public.v2_cases WHERE case_id=:'case_c'),
  'A cannot see C Case');
RESET ROLE;

-- Time and old-JWT behavior for B.
UPDATE public.v2_case_memberships SET ends_at=clock_timestamp()-interval '1 second' WHERE membership_id=:'membership_b';
UPDATE public.v2_role_grants SET ends_at=clock_timestamp()-interval '1 second' WHERE membership_id=:'membership_b';
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','72000000-0000-0000-0000-880000000002',false);
SELECT v2_access_harness.record_result('ends_at rejects without scheduler',NOT EXISTS(SELECT 1 FROM public.v2_cases WHERE case_id=:'case_a'),'database clock enforces end');
RESET ROLE;

-- DRAFT tombstone.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','71000000-0000-0000-0000-880000000001',false);
SELECT public.create_v2_draft_case('Synthetic Tombstone Subject','Synthetic A','a0000000-0000-0000-0000-880000000020') AS case_tomb \gset
SELECT public.abandon_v2_draft_case(:'case_tomb','a0000000-0000-0000-0000-880000000021');
RESET ROLE;
SELECT v2_access_harness.record_result('DRAFT tombstone and hard delete',
  NOT EXISTS(SELECT 1 FROM public.v2_cases WHERE case_id=:'case_tomb')
  AND EXISTS(SELECT 1 FROM public.v2_access_events WHERE event_type='DRAFT_ABANDONED' AND case_id IS NULL AND target_id=:'case_tomb' AND metadata IS NULL),
  'Case deleted and minimum opaque tombstone retained');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','71000000-0000-0000-0000-880000000001',false);
SELECT v2_access_harness.expect_error('tombstone unreadable by client','select * from public.v2_access_events');
SELECT v2_access_harness.record_result('tombstone target grants no Case access',NOT EXISTS(SELECT 1 FROM public.v2_cases WHERE case_id=:'case_tomb'),'opaque UUID does not restore Case');
RESET ROLE;

-- Access-event target validation as trusted migration owner only.
SELECT v2_access_harness.expect_error('invalid event type target pair rejected',
  format('select v2_private.assert_access_event_target(%L,%L,%L,%L)', :'case_a','INVITATION_ISSUED','CASE', :'case_a'));
SELECT v2_access_harness.expect_error('nonexistent event target rejected',
  format('select v2_private.assert_access_event_target(%L,%L,%L,%L)', :'case_a','INVITATION_ISSUED','INVITATION','ffffffff-ffff-ffff-ffff-ffffffffffff'));
SELECT v2_access_harness.expect_error('different Case event target rejected',
  format('select v2_private.assert_access_event_target(%L,%L,%L,%L)', :'case_a','CASE_ACTIVATED','CASE', :'case_c'));
SELECT v2_private.assert_access_event_target(:'case_a','CASE_ACTIVATED','CASE',:'case_a');
SELECT v2_access_harness.record_result('valid event target pair accepted', true,
  'valid pair returned without exception');

-- Auth deletion preserves v2 graph and fails closed.
SELECT count(*) AS actor_before FROM public.v2_actor_references WHERE auth_user_id='73000000-0000-0000-0000-880000000003' \gset
SELECT count(*) AS case_before FROM public.v2_cases WHERE case_id=:'case_c' \gset
SELECT count(*) AS membership_before FROM public.v2_case_memberships WHERE case_id=:'case_c' \gset
SELECT count(*) AS events_before FROM public.v2_access_events WHERE case_id=:'case_c' \gset
DELETE FROM auth.users WHERE id='73000000-0000-0000-0000-880000000003';
SELECT v2_access_harness.record_result('Auth delete SET NULL and graph retained',
  EXISTS(SELECT 1 FROM public.v2_actor_references WHERE auth_user_id IS NULL AND actor_id=(SELECT actor_id FROM public.v2_case_memberships WHERE membership_id=:'membership_c'))
  AND EXISTS(SELECT 1 FROM public.v2_cases WHERE case_id=:'case_c')
  AND EXISTS(SELECT 1 FROM public.v2_case_memberships WHERE case_id=:'case_c')
  AND EXISTS(SELECT 1 FROM public.v2_role_grants WHERE membership_id=:'membership_c')
  AND EXISTS(SELECT 1 FROM public.v2_access_events WHERE case_id=:'case_c'),
  'Auth link detached without v2 cascade');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','73000000-0000-0000-0000-880000000003',false);
SELECT v2_access_harness.record_result('deleted Auth identity fails closed',NOT EXISTS(SELECT 1 FROM public.v2_cases WHERE case_id=:'case_c'),'old JWT subject has no Actor mapping');
RESET ROLE;

-- General result inventory.
SELECT outcome||'|'||test_name||'|'||detail FROM v2_access_harness.results ORDER BY test_name;

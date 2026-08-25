\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

CREATE SCHEMA v2_identity_harness;
CREATE TABLE v2_identity_harness.results (
  test_name text PRIMARY KEY,
  outcome text NOT NULL,
  detail text NOT NULL
);
REVOKE ALL ON SCHEMA v2_identity_harness FROM PUBLIC, anon, authenticated;

CREATE FUNCTION v2_identity_harness.record_result(p_name text, p_ok boolean, p_detail text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  INSERT INTO v2_identity_harness.results(test_name,outcome,detail)
  VALUES (p_name, CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END, p_detail)
  ON CONFLICT (test_name) DO UPDATE SET outcome=excluded.outcome,detail=excluded.detail;
END $$;

CREATE FUNCTION v2_identity_harness.expect_error(p_name text, p_sql text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  EXECUTE p_sql;
  PERFORM v2_identity_harness.record_result(p_name,false,'statement unexpectedly succeeded');
EXCEPTION WHEN OTHERS THEN
  PERFORM v2_identity_harness.record_result(p_name,true,'rejected with SQLSTATE '||SQLSTATE);
END $$;

SELECT actor_id AS actor_a
FROM public.v2_actor_references
WHERE auth_user_id='71000000-0000-0000-0000-880000000001' \gset
SELECT actor_id AS actor_b
FROM public.v2_actor_references
WHERE auth_user_id='72000000-0000-0000-0000-880000000002' \gset

SELECT v2_identity_harness.record_result('Empty apply creates no legacy Identity without legacy Membership',
  (SELECT count(*)=0 FROM public.v2_identities),
  'Migration 008 does not create identities in an empty migration-time dataset');

INSERT INTO public.v2_identities(
  actor_reference_id,identity_type,professional_type,current_verification_status,is_primary,status
) VALUES
  (:'actor_a','FAMILY',NULL,'DECLARED',true,'ACTIVE'),
  (:'actor_a','PROFESSIONAL','NURSE','VERIFIED',false,'ACTIVE'),
  (:'actor_b','FAMILY',NULL,'DECLARED',false,'ACTIVE');

SELECT identity_id AS identity_a_family FROM public.v2_identities
WHERE actor_reference_id=:'actor_a' AND identity_type='FAMILY' \gset
SELECT identity_id AS identity_a_nurse FROM public.v2_identities
WHERE actor_reference_id=:'actor_a' AND identity_type='PROFESSIONAL' \gset
SELECT identity_id AS identity_b_family FROM public.v2_identities
WHERE actor_reference_id=:'actor_b' AND identity_type='FAMILY' \gset

SELECT v2_identity_harness.record_result('Identity supports multiple identities for one Actor',
  (SELECT count(*)=2 FROM public.v2_identities WHERE actor_reference_id=:'actor_a'),
  'family and nurse identities coexist');
SELECT v2_identity_harness.expect_error('Identity allows at most one active primary',format(
  'insert into public.v2_identities(actor_reference_id,identity_type,professional_type,current_verification_status,is_primary,status) values (%L,%L,%L,%L,true,%L)',
  :'actor_a','PROFESSIONAL','SOCIAL_WORKER','DECLARED','ACTIVE'));
SELECT v2_identity_harness.expect_error('Professional identity requires professional type',format(
  'insert into public.v2_identities(actor_reference_id,identity_type,current_verification_status,is_primary,status) values (%L,%L,%L,false,%L)',
  :'actor_b','PROFESSIONAL','DECLARED','ACTIVE'));
SELECT v2_identity_harness.expect_error('Non-professional identity rejects professional type',format(
  'insert into public.v2_identities(actor_reference_id,identity_type,professional_type,current_verification_status,is_primary,status) values (%L,%L,%L,%L,false,%L)',
  :'actor_b','FAMILY','NURSE','DECLARED','ACTIVE'));
SELECT v2_identity_harness.expect_error('Legacy identity cannot be verified',format(
  'insert into public.v2_identities(actor_reference_id,identity_type,current_verification_status,is_primary,status) values (%L,%L,%L,false,%L)',
  :'actor_b','LEGACY_UNSPECIFIED','VERIFIED','ACTIVE'));
SELECT v2_identity_harness.expect_error('Legacy identity cannot be primary',format(
  'insert into public.v2_identities(actor_reference_id,identity_type,current_verification_status,is_primary,status) values (%L,%L,%L,true,%L)',
  :'actor_b','LEGACY_UNSPECIFIED','DECLARED','ACTIVE'));
SELECT v2_identity_harness.expect_error('Retired identity requires retired_at',format(
  'update public.v2_identities set status=%L where identity_id=%L','RETIRED',:'identity_a_nurse'));
SELECT v2_identity_harness.expect_error('Actor deletion is fail-closed while Identity exists',format(
  'delete from public.v2_actor_references where actor_id=%L',:'actor_a'));

INSERT INTO public.v2_identity_verification_events(identity_id,from_status,to_status,method)
VALUES (:'identity_a_nurse','DECLARED','VERIFIED','SYNTHETIC_LOCAL_TEST');
SELECT verification_event_id AS verification_event
FROM public.v2_identity_verification_events WHERE identity_id=:'identity_a_nurse' \gset
SELECT v2_identity_harness.record_result('Verification event valid insert succeeds',
  EXISTS(SELECT 1 FROM public.v2_identity_verification_events WHERE verification_event_id=:'verification_event'),
  'append-only event exists');
SELECT v2_identity_harness.expect_error('Verification event invalid expiry rejected',format(
  'insert into public.v2_identity_verification_events(identity_id,from_status,to_status,method,occurred_at,expires_at) values (%L,%L,%L,%L,clock_timestamp(),clock_timestamp()-interval ''1 second'')',
  :'identity_a_nurse','VERIFIED','EXPIRED','SYNTHETIC_LOCAL_TEST'));
SELECT v2_identity_harness.expect_error('Verification event update rejected',format(
  'update public.v2_identity_verification_events set method=%L where verification_event_id=%L','MUTATED',:'verification_event'));
SELECT v2_identity_harness.expect_error('Verification event delete rejected',format(
  'delete from public.v2_identity_verification_events where verification_event_id=%L',:'verification_event'));

SELECT membership_id AS membership_a FROM public.v2_case_memberships
WHERE actor_id=:'actor_a' ORDER BY created_at LIMIT 1 \gset
UPDATE public.v2_case_memberships SET identity_id=:'identity_a_family' WHERE membership_id=:'membership_a';
SELECT v2_identity_harness.record_result('Membership accepts matching Actor Identity',
  EXISTS(SELECT 1 FROM public.v2_case_memberships WHERE membership_id=:'membership_a' AND identity_id=:'identity_a_family'),
  'composite FK accepted matching pair');
SELECT v2_identity_harness.expect_error('Membership rejects Actor Identity mismatch',format(
  'update public.v2_case_memberships set identity_id=%L where membership_id=%L',:'identity_b_family',:'membership_a'));

SELECT declaration_id AS declaration_a FROM public.v2_authorization_declarations
WHERE declarant_actor_id=:'actor_a' ORDER BY declared_at LIMIT 1 \gset
SELECT v2_identity_harness.record_result('Legacy Declaration permits NULL Identity',
  EXISTS(SELECT 1 FROM public.v2_authorization_declarations WHERE declaration_id=:'declaration_a' AND declarant_identity_id IS NULL),
  'optional additive link preserves legacy row');
UPDATE public.v2_authorization_declarations SET declarant_identity_id=:'identity_a_family'
WHERE declaration_id=:'declaration_a';
SELECT v2_identity_harness.record_result('Declaration accepts matching Actor Identity',
  EXISTS(SELECT 1 FROM public.v2_authorization_declarations WHERE declaration_id=:'declaration_a' AND declarant_identity_id=:'identity_a_family'),
  'matching composite FK accepted');
SELECT v2_identity_harness.expect_error('Declaration rejects Actor Identity mismatch',format(
  'update public.v2_authorization_declarations set declarant_identity_id=%L where declaration_id=%L',:'identity_b_family',:'declaration_a'));
SELECT v2_identity_harness.record_result('Verified Identity is not Authorization Declaration',
  NOT EXISTS(SELECT 1 FROM public.v2_authorization_declarations WHERE declarant_identity_id=:'identity_a_nurse'),
  'verification alone creates no declaration');

SELECT v2_identity_harness.record_result('Four exact legacy Grant templates exist',
  (SELECT count(*)=4 FROM public.v2_grant_templates WHERE status='ACTIVE'),
  'one active version for each Migration 007 role-purpose path');
SELECT v2_identity_harness.record_result('Legacy template capabilities exactly match Migration 007 function',
  NOT EXISTS(
    SELECT 1 FROM public.v2_grant_templates t
    CROSS JOIN unnest(enum_range(NULL::public.v2_capability)) AS c(capability)
    WHERE t.status='ACTIVE'
      AND (EXISTS(SELECT 1 FROM public.v2_grant_template_capabilities tc
                  WHERE tc.grant_template_id=t.grant_template_id AND tc.capability=c.capability)
           IS DISTINCT FROM v2_private.role_has_capability(t.role_type,t.purpose,c.capability))
  ), 'template membership equals frozen role_has_capability truth table');
SELECT v2_identity_harness.record_result('New capabilities are not granted to legacy templates',
  NOT EXISTS(SELECT 1 FROM public.v2_grant_template_capabilities
             WHERE capability IN ('VIEW_CARE_UPDATE','VIEW_QUESTION','RESOLVE_QUESTION','CREATE_PROFESSIONAL_RECORD','CORRECT_PROFESSIONAL_RECORD','VIEW_PROFESSIONAL_CONTENT')),
  'additive enum values do not expand legacy grants');
SELECT grant_template_id AS active_template FROM public.v2_grant_templates
WHERE template_key='legacy-family-member' AND version=1 \gset
SELECT v2_identity_harness.expect_error('Active Grant template is immutable',format(
  'update public.v2_grant_templates set template_key=%L where grant_template_id=%L','MUTATED',:'active_template'));
SELECT v2_identity_harness.expect_error('Active template capabilities are immutable',format(
  'delete from public.v2_grant_template_capabilities where grant_template_id=%L',:'active_template'));
SELECT v2_identity_harness.expect_error('Grant template version is unique',
  'insert into public.v2_grant_templates(template_key,version,role_type,purpose,status) values (''legacy-family-member'',1,''FAMILY_MEMBER'',''FAMILY_CARE'',''DRAFT'')');

INSERT INTO public.v2_grant_templates(template_key,version,role_type,purpose,status)
VALUES ('synthetic-retired-template',1,'FAMILY_MEMBER','FAMILY_CARE','DRAFT')
RETURNING grant_template_id AS retired_template \gset
UPDATE public.v2_grant_templates SET status='ACTIVE',activated_at=clock_timestamp()
WHERE grant_template_id=:'retired_template';
UPDATE public.v2_grant_templates SET status='RETIRED',retired_at=clock_timestamp()
WHERE grant_template_id=:'retired_template';
SELECT v2_identity_harness.expect_error('Retired Grant template is immutable',format(
  'update public.v2_grant_templates set template_key=%L where grant_template_id=%L','MUTATED',:'retired_template'));
SELECT v2_identity_harness.expect_error('Retired template capabilities are immutable',format(
  'insert into public.v2_grant_template_capabilities(grant_template_id,capability) values (%L,%L)',:'retired_template','VIEW_CASE_MINIMUM'));

SELECT grant_id AS grant_a FROM public.v2_role_grants
WHERE membership_id=:'membership_a' ORDER BY created_at LIMIT 1 \gset
UPDATE public.v2_role_grants
SET grant_template_id=(SELECT grant_template_id FROM public.v2_grant_templates
                       WHERE role_type=v2_role_grants.role_type AND purpose=v2_role_grants.purpose
                         AND status='ACTIVE' AND version=1),
    issued_by_identity_id=:'identity_a_family'
WHERE grant_id=:'grant_a';
SELECT v2_identity_harness.record_result('Grant accepts exact template and issuer Identity',
  EXISTS(SELECT 1 FROM public.v2_role_grants WHERE grant_id=:'grant_a'
         AND grant_template_id IS NOT NULL AND issued_by_identity_id=:'identity_a_family'),
  'role-purpose template and issuer Actor both match');
SELECT v2_identity_harness.expect_error('Grant rejects issuer Identity Actor mismatch',format(
  'update public.v2_role_grants set issued_by_identity_id=%L where grant_id=%L',:'identity_b_family',:'grant_a'));
SELECT v2_identity_harness.record_result('Grant exact scope remains unchanged',
  EXISTS(SELECT 1 FROM public.v2_role_grants WHERE grant_id=:'grant_a' AND scope_ceiling='AUTHOR_ONLY'),
  'identity/template alignment does not expand non-hierarchical scope');

SELECT v2_identity_harness.record_result('Migration 008 tables are RLS enabled and forced',
  (SELECT count(*)=4 AND bool_and(c.relrowsecurity AND c.relforcerowsecurity)
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname IN
   ('v2_identities','v2_identity_verification_events','v2_grant_templates','v2_grant_template_capabilities')),
  'all four tables fail closed');
SELECT v2_identity_harness.record_result('Migration 008 tables grant no client privileges',
  NOT EXISTS(SELECT 1 FROM information_schema.role_table_grants
             WHERE table_schema='public'
               AND table_name IN ('v2_identities','v2_identity_verification_events','v2_grant_templates','v2_grant_template_capabilities')
               AND grantee IN ('anon','authenticated')),
  'no SELECT or mutation privilege for clients');
SELECT v2_identity_harness.record_result('Three Migration 008 helpers are invoker-only with empty search path',
  (SELECT count(*)=3 AND bool_and(NOT p.prosecdef AND 'search_path=""'=ANY(COALESCE(p.proconfig,ARRAY[]::text[])))
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='v2_private' AND p.proname IN
   ('reject_v2_verification_event_mutation','enforce_v2_grant_template_immutability','enforce_v2_template_capability_immutability')),
  'prosecdef=false and fixed empty search_path');
SELECT v2_identity_harness.record_result('Migration 008 helpers have no client or PUBLIC execute',
  NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='v2_private' AND p.proname IN
             ('reject_v2_verification_event_mutation','enforce_v2_grant_template_immutability','enforce_v2_template_capability_immutability')
             AND (has_function_privilege('public',p.oid,'EXECUTE')
                  OR has_function_privilege('anon',p.oid,'EXECUTE')
                  OR has_function_privilege('authenticated',p.oid,'EXECUTE'))),
  'owner-only helpers');
SELECT v2_identity_harness.record_result('All six new capability enum values exist',
  (SELECT count(*)=6 FROM unnest(enum_range(NULL::public.v2_capability)) AS c(value)
   WHERE value::text IN ('VIEW_CARE_UPDATE','VIEW_QUESTION','RESOLVE_QUESTION','CREATE_PROFESSIONAL_RECORD','CORRECT_PROFESSIONAL_RECORD','VIEW_PROFESSIONAL_CONTENT')),
  'enum additions committed without unsafe same-transaction use');

SELECT outcome,count(*) FROM v2_identity_harness.results GROUP BY outcome ORDER BY outcome;

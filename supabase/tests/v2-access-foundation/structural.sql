\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

SELECT v2_access_harness.record_result('Migration history contains 001 through 008',
  (SELECT count(*)=8 FROM supabase_migrations.schema_migrations),
  'eight ordered local migration history rows');
SELECT v2_access_harness.record_result('v1 ten tables remain present',
  (SELECT count(*)=10 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind='r' AND c.relname IN
   ('users','care_receivers','care_tasks','care_sources','current_care_assignments','backup_assignments','care_scenarios','coverage_evaluations','task_adaptations','task_handoffs')),
  'v1 table inventory count is unchanged');
SELECT v2_access_harness.record_result('v1 thirty-eight policies remain present',
  (SELECT count(*)=38 FROM pg_policies WHERE schemaname='public' AND tablename NOT LIKE 'v2\_%' ESCAPE '\'),
  'v1 policy inventory count is unchanged');
SELECT v2_access_harness.record_result('v2 eleven tables exist',
  (SELECT count(*)=11 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind='r' AND c.relname LIKE 'v2\_%' ESCAPE '\'),
  'Access Foundation table inventory');
SELECT v2_access_harness.record_result('v2 five SELECT policies exist',
  (SELECT count(*)=5 FROM pg_policies WHERE schemaname='public' AND tablename LIKE 'v2\_%' ESCAPE '\' AND cmd='SELECT'),
  'minimum read policies only');
SELECT v2_access_harness.record_result('v2 twenty functions exist',
  (SELECT count(*)=20 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname IN ('public','v2_private') AND (p.proname LIKE '%v2%' OR n.nspname='v2_private')),
  'function inventory matches Draft');
SELECT v2_access_harness.record_result('v2 RLS enabled and forced on all tables',
  (SELECT count(*)=11 AND bool_and(c.relrowsecurity AND c.relforcerowsecurity)
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind='r' AND c.relname LIKE 'v2\_%' ESCAPE '\'),
  'direct table access defense');
SELECT v2_access_harness.record_result('all v2 constraints validated',
  NOT EXISTS(SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid
             WHERE c.relname LIKE 'v2\_%' ESCAPE '\' AND NOT con.convalidated),
  'no unvalidated v2 constraint');
SELECT v2_access_harness.record_result('all definer functions have empty search_path',
  NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname IN ('public','v2_private')
               AND (p.proname LIKE '%v2%' OR n.nspname='v2_private') AND p.prosecdef
               AND (p.proconfig IS NULL OR NOT ('search_path=""'=ANY(p.proconfig)))),
  'all privileged functions use fixed empty search_path');
SELECT v2_access_harness.record_result('no unexpected PUBLIC function EXECUTE',
  NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace,
             LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) x
             WHERE n.nspname IN ('public','v2_private') AND (p.proname LIKE '%v2%' OR n.nspname='v2_private') AND x.grantee=0 AND x.privilege_type='EXECUTE'),
  'PUBLIC execute revoked');
SELECT v2_access_harness.record_result('authenticated has nine public RPCs',
  (SELECT count(*)=9 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname LIKE '%v2%' AND has_function_privilege('authenticated',p.oid,'EXECUTE')),
  'client transaction RPC inventory');
SELECT v2_access_harness.record_result('authenticated has only two private policy helpers',
  (SELECT count(*)=2 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='v2_private' AND has_function_privilege('authenticated',p.oid,'EXECUTE')),
  'current Actor and boolean grant-path helpers only');
SELECT v2_access_harness.record_result('internal helpers are not client executable',
  (SELECT count(*)=9 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='v2_private'
     AND NOT has_function_privilege('authenticated',p.oid,'EXECUTE')
     AND NOT has_function_privilege('anon',p.oid,'EXECUTE')),
  'nine internal invoker helpers owner-only');
SELECT v2_access_harness.record_result('anon and authenticated have no v2 direct writes',
  NOT EXISTS(SELECT 1 FROM information_schema.role_table_grants
             WHERE table_schema='public' AND table_name LIKE 'v2\_%' ESCAPE '\'
               AND grantee IN ('anon','authenticated') AND privilege_type IN ('INSERT','UPDATE','DELETE')),
  'mutations require controlled RPC');
SELECT v2_access_harness.record_result('function owner is BYPASSRLS non-superuser',
  (SELECT bool_and(NOT r.rolsuper AND r.rolbypassrls)
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_roles r ON r.oid=p.proowner
   WHERE n.nspname IN ('public','v2_private') AND (p.proname LIKE '%v2%' OR n.nspname='v2_private')),
  'FORCE RLS is not treated as a definer restriction');
SELECT v2_access_harness.record_result('confirmed Email database column exists',
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='auth' AND table_name='users' AND column_name='email_confirmed_at'),
  'local Auth schema supports database-side confirmed Email check');
SELECT v2_access_harness.record_result('Auth Actor FK uses SET NULL',
  EXISTS(SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid
         WHERE c.relname='v2_actor_references' AND con.contype='f' AND con.confdeltype='n'),
  'Auth deletion does not cascade v2 graph');
SELECT v2_access_harness.record_result('No cursor object grants historical access',
  NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname LIKE 'v2%cursor%'),
  'Cursor is outside Migration 007 and cannot authorize content');

SELECT outcome,count(*) FROM v2_access_harness.results GROUP BY outcome ORDER BY outcome;

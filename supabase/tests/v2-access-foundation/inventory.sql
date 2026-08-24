\pset tuples_only on
\pset format unaligned
SELECT 'migration_history|' || count(*) FROM supabase_migrations.schema_migrations;
SELECT 'v1_tables|' || count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relname IN ('users','care_receivers','care_tasks','care_sources','current_care_assignments','backup_assignments','care_scenarios','coverage_evaluations','task_adaptations','task_handoffs');
SELECT 'v1_policies|' || count(*) FROM pg_policies WHERE schemaname='public' AND tablename NOT LIKE 'v2\_%' ESCAPE '\';
SELECT 'v2_tables|' || count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relname LIKE 'v2\_%' ESCAPE '\';
SELECT 'v2_policies|' || count(*) FROM pg_policies WHERE schemaname='public' AND tablename LIKE 'v2\_%' ESCAPE '\';
SELECT 'v2_functions|' || count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE (n.nspname='public' AND p.proname LIKE '%v2%') OR n.nspname='v2_private';
SELECT 'security_modes|' || count(*) FILTER (WHERE p.prosecdef) || '_definer|' || count(*) FILTER (WHERE NOT p.prosecdef) || '_invoker' FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE (n.nspname='public' AND p.proname LIKE '%v2%') OR n.nspname='v2_private';
SELECT 'unexpected_public_execute|' || count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE ((n.nspname='public' AND p.proname LIKE '%v2%') OR n.nspname='v2_private') AND has_function_privilege('public',p.oid,'EXECUTE');
SELECT 'definer_without_empty_search_path|' || count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE ((n.nspname='public' AND p.proname LIKE '%v2%') OR n.nspname='v2_private') AND p.prosecdef AND NOT ('search_path=""'=ANY(coalesce(p.proconfig,ARRAY[]::text[])));
SELECT 'v2_rls|' || count(*) FILTER (WHERE c.relrowsecurity) || '_enabled|' || count(*) FILTER (WHERE c.relforcerowsecurity) || '_forced' FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relname LIKE 'v2\_%' ESCAPE '\';
SELECT 'owner|' || r.rolname || '|super=' || r.rolsuper || '|bypassrls=' || r.rolbypassrls FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_roles r ON r.oid=p.proowner WHERE (n.nspname='public' AND p.proname LIKE '%v2%') OR n.nspname='v2_private' GROUP BY r.rolname,r.rolsuper,r.rolbypassrls;
SELECT 'direct_write_privileges|' || count(*) FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name LIKE 'v2\_%' ESCAPE '\' AND grantee IN ('anon','authenticated') AND privilege_type IN ('INSERT','UPDATE','DELETE');
SELECT 'result|' || outcome || '|' || count(*) FROM v2_access_harness.results GROUP BY outcome ORDER BY outcome;
SELECT 'result_total|' || count(*) FROM v2_access_harness.results;

\set ON_ERROR_STOP on
\if :{?session_a_status}
\else
  \quit 2
\endif
\if :{?session_b_status}
\else
  \quit 2
\endif

SELECT count(*) AS effective_admins
FROM public.v2_case_memberships m
JOIN public.v2_role_grants g USING (membership_id)
WHERE m.membership_id IN (
  SELECT membership_a FROM v2_access_harness.concurrency_ids
  UNION ALL
  SELECT membership_c FROM v2_access_harness.concurrency_ids
)
  AND m.status IN ('ACTIVE','ACCEPTED')
  AND m.revoked_at IS NULL
  AND m.starts_at <= clock_timestamp()
  AND (m.ends_at IS NULL OR m.ends_at > clock_timestamp())
  AND g.role_type='CASE_ADMIN'
  AND g.status='ACTIVE'
  AND g.revoked_at IS NULL
  AND g.starts_at <= clock_timestamp()
  AND (g.ends_at IS NULL OR g.ends_at > clock_timestamp())
\gset

SELECT count(*) AS committed_events
FROM public.v2_access_events
WHERE operation_key IN (
  'fa000000-0000-0000-0000-880000000001',
  'fc000000-0000-0000-0000-880000000001'
)
\gset

INSERT INTO v2_access_harness.results(test_name,outcome,detail)
VALUES
  ('Two-session manager revocation serialized',
   CASE WHEN ((:'session_a_status'='0') <> (:'session_b_status'='0'))
             AND :'effective_admins'::integer=1 THEN 'PASS' ELSE 'FAIL' END,
   'Two independent sessions raced; exactly one must commit and one effective administrator must remain'),
  ('Concurrent failure leaves no partial state',
   CASE WHEN ((:'session_a_status'='0') <> (:'session_b_status'='0'))
             AND :'committed_events'::integer=1 THEN 'PASS' ELSE 'FAIL' END,
   'Only the committed operation may emit an event');

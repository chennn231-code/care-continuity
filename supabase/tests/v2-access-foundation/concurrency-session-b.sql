\set ON_ERROR_STOP on
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','78000000-0000-0000-0000-870000000003',false);
SELECT public.revoke_v2_membership(
  (SELECT membership_a FROM v2_access_harness.concurrency_ids),
  'CONCURRENT_REMOVE',
  'fc000000-0000-0000-0000-880000000001'
);

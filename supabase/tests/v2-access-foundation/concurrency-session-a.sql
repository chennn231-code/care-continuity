\set ON_ERROR_STOP on
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','71000000-0000-0000-0000-880000000001',false);
SELECT public.revoke_v2_membership(
  (SELECT membership_c FROM v2_access_harness.concurrency_ids),
  'CONCURRENT_REMOVE',
  'fa000000-0000-0000-0000-880000000001'
);

# Migration 007 Access Foundation Local Verification Fixtures

Run the complete harness from the Repository root:

```sh
scripts/verification/verify-v2-access-foundation-local.sh
```

The Shell entrypoint first requires the SQL Draft and formal `20260824220000_v2_access_foundation.sql` to be byte-for-byte identical with the verified SHA-256. It then creates a fresh isolated Supabase project, copies formal Migration 001–007, runs all fixtures, performs the two-session concurrency test, stops only that isolated stack, and preserves its temporary evidence directory and Docker volumes

All identities and data in these fixtures are synthetic. The harness must not be pointed at a linked or remote project

To verify that the entrypoint returns a nonzero status for a failed run without starting Supabase:

```sh
scripts/verification/verify-v2-access-foundation-local.sh --self-test-failure-exit-code
```

The self-test intentionally exits with status `1`

Round 2 disclosed a temporary harness defect where a successful PostgreSQL `void` function was incorrectly asserted with `IS NULL`. `core.sql` instead treats successful execution without an exception as PASS. This was a harness defect, not a Migration 007 SQL defect

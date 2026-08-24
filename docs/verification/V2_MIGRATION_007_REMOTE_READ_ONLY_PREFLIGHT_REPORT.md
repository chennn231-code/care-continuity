# Migration 007 Remote Supabase Read-only Preflight Report

## Document status

- Status: Read-only remote preflight report
- Review date: 2026-08-24 (Asia/Taipei)
- Target: `REMOTE_PROJECT_REDACTED`
- No Migration 007 apply was performed
- No remote data, Auth user, setting, secret, deployment, or application object was modified
- No business row content, real email, Auth user ID, business UUID, project ref, URL, key, token, password, JWT, or connection string was selected or recorded
- This report is a sanitized inventory, not authorization to apply Migration 007

## 1. Git and release-candidate baseline

| Check | Result |
|---|---|
| Branch | `codex/v2-proposed-pivot` |
| HEAD | `466db568bddd6f168c17764e024b5a4787e94ea7` |
| Upstream | `origin/codex/v2-proposed-pivot` |
| Ahead / behind | `0 / 0` |
| Working tree before review | Clean |
| `main` checkpoint | `de522762bf272599b12b822ec096a0d0768f624a` |
| SQL draft | `docs/sql-drafts/007_v2_access_foundation_draft.sql` |
| Formal candidate | `supabase/migrations/20260824220000_v2_access_foundation.sql` |
| Draft / formal comparison | Byte-for-byte identical |
| Draft / formal SHA-256 | `84007ccc2e5c16246435a1186e6123951f805bc383725504612d67e3dfbf1389` |
| Repository verification harness | Tracked |
| Local dry-run and release-candidate reports | Tracked |

Formal migration files are ordered as follows:

1. `20260823022521_remote_schema.sql`
2. `20260823030000_ownership_and_integrity.sql`
3. `20260823040000_auth_identity_lifecycle.sql`
4. `20260823050000_rls_and_access_control.sql`
5. `20260823060000_backup_assignment_semantics.sql`
6. `20260823070000_task_handoffs.sql`
7. `20260824220000_v2_access_foundation.sql`

Migration 001–006 SHA-256 values still match the validated repository baseline:

| Migration | SHA-256 |
|---|---|
| 001 | `64d3cdd9047c7a716dd031a51d1e55cdeef6b2ab7bc4409887e4c864fa493361` |
| 002 | `8b165af587111b1e961b55b5ec6836b9a5a3186a758198204c0aa05d8da3a7e6` |
| 003 | `4618316d35a014ace64457fc6ace15a242032901cacd678af95e3f120e04e70b` |
| 004 | `7f8234ee1377d9b0a89fce5f07b6163d5da7dd2fbe17facb7a05d22b08f6bf40` |
| 005 | `c5b673b56adeb8a7440b4de5cc828aca7931c4a56e2eb117c33587df293d2209` |
| 006 | `fa10edfae8327e942e75238b771f8f2151bc87f14a9f5e44e33f9e7cf26c5f08` |

## 2. Remote identity

| Item | Result |
|---|---|
| Linked remote matches the expected project name and repository link | Confirmed |
| Remote health reported by the platform | Active / healthy |
| Environment classification | Production |
| Future apply allowed by this review | No |

The identity was checked through the linked CLI project inventory and the authenticated Dashboard. Project identifiers and URLs are intentionally omitted.

## 3. Read-only methods used

- `supabase migration list --linked`
- `supabase inspect db table-stats --linked`
- `supabase inspect db db-stats --linked`
- `supabase inspect db role-stats --linked`
- `supabase inspect db index-stats --linked`
- `supabase gen types typescript --linked --schema public`
- `supabase gen types typescript --linked --schema auth`
- Supabase CLI project, service-version, and physical-backup read-only inventory APIs
- Authenticated Dashboard read-only views for project identity, tables, policies, functions, triggers, enums, extensions, roles, and backups

No custom SQL was executed. The Dashboard SQL Editor was not used because it states that entered queries are automatically saved, which would create remote editor state and violate this read-only gate. A schema dump was also not used because a safely enforceable schema-only invocation was not available in the installed CLI surface.

## 4. Remote migration history

| Version | Local | Remote |
|---|---:|---:|
| `20260823022521` | Yes | Yes |
| `20260823030000` | Yes | Yes |
| `20260823040000` | Yes | Yes |
| `20260823050000` | Yes | Yes |
| `20260823060000` | Yes | Yes |
| `20260823070000` | Yes | Yes |
| `20260824220000` | Yes | No |

Confirmed:

- Remote history contains Migration 001–006 in the expected order
- Migration 007 is local/Git only and is not present remotely
- No duplicate timestamp, remote-only migration, missing 001–006 entry, or visible ordering drift was found
- No migration repair was executed

Unknown:

- The migration history records do not expose whether a historical entry was previously inserted through a repair operation, so repair provenance cannot be independently proven from this read-only output

## 5. v1 schema non-regression inventory

### Tables and row-count boundary

All ten expected v1 public tables are present. The installed safe CLI and Dashboard surfaces expose estimated counts only. Exact `COUNT(*)` values are therefore recorded as Unknown rather than being misrepresented as exact aggregates.

| Table | Exists | RLS enabled | FORCE RLS | Exact aggregate count | Metadata estimate |
|---|---:|---:|---:|---:|---:|
| `users` | Yes | Yes | Unknown | Unknown | 2 |
| `care_receivers` | Yes | Yes | Unknown | Unknown | 1 |
| `care_tasks` | Yes | Yes | Unknown | Unknown | 2 |
| `care_sources` | Yes | Yes | Unknown | Unknown | 1 |
| `current_care_assignments` | Yes | Yes | Unknown | Unknown | 2 |
| `backup_assignments` | Yes | Yes | Unknown | Unknown | 0 |
| `care_scenarios` | Yes | Yes | Unknown | Unknown | 0 |
| `coverage_evaluations` | Yes | Yes | Unknown | Unknown | 0 |
| `task_adaptations` | Yes | Yes | Unknown | Unknown | 0 |
| `task_handoffs` | Yes | Yes | Unknown | Unknown | 0 |

The non-zero estimates prove that the remote project contains existing v1 data. No row contents were read.

### Policies

- Ten RLS-enabled v1 tables are shown in the Dashboard policy inventory
- The policy inventory contains exactly 38 policies
- Nine tables have separate SELECT, INSERT, UPDATE, and DELETE policies for `authenticated`
- `users` has separate SELECT and UPDATE policies for `authenticated`
- Policy names and commands match Migration 004 and Migration 006
- No v2 policy is present

### Functions and triggers

Eight expected v1 public functions are present:

- `assert_adaptation_same_care_receiver`
- `assert_assignment_same_care_receiver`
- `enforce_task_handoff_semantic_change`
- `mark_task_handoff_reviewed`
- `prevent_care_receiver_reparenting`
- `provision_user_profile`
- `set_task_handoff_updated_at`
- `sync_user_profile_email`

Eight expected v1 data triggers are present:

- `adaptation_same_care_receiver`
- `backup_assignment_same_care_receiver`
- `care_scenarios_receiver_immutable`
- `care_sources_receiver_immutable`
- `care_tasks_enforce_handoff_semantic_change`
- `care_tasks_receiver_immutable`
- `current_assignment_same_care_receiver`
- `task_handoffs_set_updated_at`

### Ownership, foreign keys, and cascade limits

- Remote table owner values were not exposed by the safe read-only UI/CLI surfaces and remain Unknown
- Remote FK delete actions were not independently queried from system catalogs
- Repository Migration 002 still defines `public.users.user_id -> auth.users.id ON DELETE CASCADE` and `care_receivers.owner_user_id -> auth.users.id ON DELETE CASCADE`
- Repository Migration 006 still defines `task_handoffs.task_id -> care_tasks.task_id ON DELETE CASCADE`
- The observed remote table, column, function, trigger, policy, index, and migration inventories align with those migrations, but this does not replace a direct catalog check of every FK action
- The v1 unique-owner cascade remains a known v2 governance risk; Migration 007 is additive and does not remove that existing v1 behavior

## 6. v2 collision check

No Migration 007 object collision was found through the combined public type inventory, table list, function list, policy list, trigger list, enum list, and index inventory.

| Object class | Result |
|---|---|
| Seven `v2_*` tables | None found |
| Public `v2_*` RPCs/helpers | None found |
| `v2_*` indexes | None found |
| `v2_*` triggers | None found |
| `v2_*` policies | None found |
| Public v2 enum/vocabulary objects | None found; no public enums exist |
| v2 constraints | No owning v2 table exists; direct global constraint-name catalog scan was unavailable |
| `v2_private` schema/helpers | Direct non-public schema inventory was unavailable; no public signature collision was found |

The last two limitations remain explicit because the safe UI/CLI surfaces do not provide a complete cross-schema `pg_catalog` query without creating remote query-editor state.

## 7. Auth schema boundary

The official generated type inventory for the remote `auth` schema confirms:

- `auth.users` exists
- `id` exists and maps to a UUID-compatible TypeScript string
- `email` exists and is nullable text/string
- `email_confirmed_at` exists and is nullable timestamp/string

This supports Migration 007's database-side confirmed-email boundary and UUID FK shape. No Auth user row, email, ID, metadata, or account list was queried.

`ON DELETE SET NULL` remains structurally compatible with the nullable `v2_actor_references.auth_user_id` candidate. It has not been applied remotely.

## 8. PostgreSQL, role, function, and extension boundary

### Service versions

| Service | Remote version observed |
|---|---|
| PostgreSQL image | `17.6.1.155` |
| Auth / GoTrue | `v2.195.0` |
| PostgREST | `v14.15` |
| Storage API | `v1.70.7` |

Other service versions were not exposed and remain Unknown.

### Roles and owner boundary

- `anon`, `authenticated`, `service_role`, and `postgres` roles are present
- Dashboard role attributes show `postgres` is not a superuser and does have `BYPASSRLS`
- Local fresh verification established that Migration 007 functions were owned by `postgres`, with 11 Definer and 6 Invoker functions, but the future remote Migration 007 function owners do not exist yet
- The exact role used by a future remote migration apply remains Unknown until the release command's execution identity is explicitly verified
- Migration 007 must continue to treat every Definer function as capable of bypassing RLS and must rely on its validated inputs, `auth.uid()` binding, schema qualification, empty `search_path`, transaction boundaries, row locks, and EXECUTE ACL—not FORCE RLS

### Existing functions and extensions

- Existing v1 function inventory reports seven Definer functions and one Invoker function
- `pgcrypto` is installed in the `extensions` schema at version `1.3`
- `uuid-ossp` is also installed at version `1.1`
- Existing applied v1 policies depend on `auth.uid()`; no failure or missing-function signal was observed
- No remote Migration 007 function exists, so its future owner, `prosecdef`, `proconfig`, and ACL values can only be verified after apply
- No public v2 function signature collision was found

## 9. Backup, PITR, and restore readiness

| Capability | Result |
|---|---|
| Plan | Free |
| Scheduled database backups | Not included / unavailable |
| Last successful scheduled backup | None exposed |
| PITR | Disabled / unavailable; Pro add-on |
| WAL-G platform flag | Reported enabled by CLI, but does not provide a user-restorable backup on this plan |
| Retention period | None confirmed for this project |
| Restore to a prior project state | No usable backup was confirmed |
| Restore drill | Not performed and not verified |
| Staging environment | None confirmed |

This is a hard Remote Apply blocker. A WAL-G implementation flag is not equivalent to a confirmed user-accessible backup or tested restore path.

## 10. Schema drift assessment

No major drift was found in the surfaces that were safely observable:

- Remote migration history matches 001–006
- Ten expected v1 tables are present
- Thirty-eight expected v1 policies are present
- Eight expected v1 functions and eight expected v1 data triggers are present
- Public table columns exposed by generated types and the schema visualizer align with the repository migrations
- Migration 006 `task_handoffs` objects are present
- No v2 object collision was found in public inventory

Completeness limits:

- Exact table counts, table owners, FORCE RLS flags, FK delete actions, function owners/search paths/ACLs, non-public helper namespace collisions, and migration-repair provenance were not directly queried
- Therefore this is not a complete `pg_catalog` equivalence proof

## 11. Remote apply risk classification

- Remote contains existing v1 data, so the deployment is not an empty-database apply
- Migration 007 is additive by reviewed SQL content: it creates a private helper schema, seven v2 tables, functions, policies, constraints, indexes, grants, and comments
- It does not alter the ten v1 public tables or their existing policies
- It references `auth.users` with `ON DELETE SET NULL`; this adds work and a new historical-reference effect when an Auth account is deleted but does not change v1 cascade FKs
- New-object catalog locks are expected; no planned DDL targets existing v1 tables
- Function/policy name collision risk is low in observed public inventory, but the unqueried non-public namespace remains a completeness gap
- Production has no confirmed backup/PITR recovery path and no confirmed staging environment
- A maintenance window or user-impact notice should be decided before any apply, even though the migration is additive

Required post-apply checks must be split:

1. Read-only inventory: migration history, 17 v2 tables/functions/policies inventory targets, owners, `prosecdef`, `search_path`, ACL, RLS enabled/forced, v1 10 tables/38 policies, and row-count non-regression
2. Write-based security smoke tests: invitation, actor creation, membership/grant lifecycle, revocation, last-manager concurrency, tombstone, and A/B/C isolation using only authorized fictional accounts and data

The write-based checks require separate action-time authorization.

## 12. Confirmed items

- Git and RC baseline is correct
- Remote target identity is confirmed and marked Production
- Remote migration history is 001–006 only
- Migration 007 is absent remotely
- v1 has 10 expected tables and 38 expected policies
- Remote contains existing v1 data estimates
- Expected v1 functions/triggers are present
- Required Auth columns exist with compatible shapes
- PostgreSQL/Auth/PostgREST service versions were observed
- `postgres` is non-superuser with `BYPASSRLS`
- `pgcrypto` is installed
- No public v2 collision was found
- Scheduled backups and PITR are unavailable on the current plan

## 13. Unknown items

- Exact aggregate `COUNT(*)` for each v1 table
- Table owner and FORCE RLS values
- Direct catalog verification of all FK delete actions
- Migration repair provenance
- Exact migration execution owner for a future remote apply
- Existing function owner, `proconfig`, and complete EXECUTE ACL inventory
- Full non-public `v2_private` collision scan
- Direct global constraint-name scan
- Retention and restore workflow because no usable backup is present
- A tested restore procedure
- A staging environment
- Required maintenance window and approved user-impact plan

## 14. Blockers

1. No confirmed scheduled backup or PITR recovery capability is available for this Production project
2. No restore drill or independently usable recovery point is confirmed
3. No staging environment is confirmed
4. Exact remote catalog proof remains incomplete for table owners, FORCE RLS, FK actions, function ACL/search path, and private-schema collisions
5. The exact future migration execution owner remains unverified
6. Post-apply read-only and write-based smoke-test sequences have not yet received deployment-time authorization
7. Remote Apply requires a separate explicit user authorization even after all technical blockers are resolved

## 15. Conditions before apply

- Establish and verify a recoverable backup/restore strategy appropriate for Production
- Prefer a staging apply with the exact validated Migration 007 bytes and repository harness
- Obtain a safe complete catalog inventory for the remaining Unknown security attributes without creating remote state
- Freeze the apply command, maintenance/user-impact plan, read-only audit, and separately authorized fictional-data security smoke tests
- Reconfirm remote migration history remains exactly 001–006 immediately before apply
- Reconfirm RC SHA-256 remains unchanged
- Confirm no new v2 collision has appeared
- Obtain separate explicit Remote Apply authorization

## 16. Gate conclusion

| Gate | Decision | Reason |
|---|---|---|
| Remote Read-only Preflight | **PARTIAL** | Identity, migration history, v1 tables/policies, major public objects, Auth shape, role attributes, versions, and backup status were verified; several exact catalog attributes could not be safely queried |
| Remote Apply | **BLOCKED** | Production has no confirmed backup/PITR restore path, catalog completeness gaps remain, and no separate apply authorization has been granted |

Migration 007 was not applied. No remote SQL mutation, Auth operation, test-user creation, application deployment, commit, or push was performed during this gate.

# Migration 007 Manual Backup & Restore Rehearsal Design

- Status: Proposed Design Review
- Date: 2026-08-24
- Branch baseline: `codex/v2-proposed-pivot`
- Baseline commit: `a739349e45ff380f4746a6c531e9554a01beff84`
- Scope: manual logical backup and isolated restore rehearsal design only
- Remote Supabase access performed in this gate: No
- Backup, dump, restore, migration apply, or deployment performed in this gate: No

## 1. Purpose and current blocker

Migration 007 has passed fresh isolated local verification, but Remote Apply remains blocked. The current Production project is on the Free plan and the prior read-only preflight did not establish a downloadable managed backup, Point-in-Time Recovery, a tested restore point, or a successful restore rehearsal.

The purpose of this document is to define a reproducible, privacy-aware manual backup and restore rehearsal before any Remote Apply authorization. A backup artifact is not considered usable merely because a dump command exits successfully. The artifact must be structurally inspected, hashed, stored safely, and restored into a fresh isolated target with post-restore integrity checks.

This design does not claim that Production is currently recoverable. It does not authorize reading Production data, creating a dump, restoring data, applying Migration 007, or changing the remote project.

## 2. Repository and remote facts used by this review

### 2.1 Repository facts

- Formal migrations 001–007 exist in `supabase/migrations/`.
- Migration 007 is `20260824220000_v2_access_foundation.sql`.
- The validated Draft and Formal Migration 007 have SHA-256 `84007ccc2e5c16246435a1186e6123951f805bc383725504612d67e3dfbf1389`.
- The local release-candidate harness passed 71 tests with no failures, skips, or blockers.
- Migration 007 is additive and does not rewrite migrations 001–006.

### 2.2 Previously recorded remote facts

The existing read-only preflight report records, without repeating remote identifiers:

- the target is the Production project on the Free plan;
- remote migration history currently contains migrations 001–006;
- the v1 baseline contains 10 RLS-enabled tables and 38 policies;
- existing v1 data is present;
- downloadable managed backup, PITR, restore point, restore drill, and staging verification were not established;
- Remote Read-only Preflight is `PARTIAL` and Remote Apply is `BLOCKED`.

This gate does not reconnect to verify those facts. They remain bounded by the evidence and limitations in `docs/verification/V2_MIGRATION_007_REMOTE_READ_ONLY_PREFLIGHT_REPORT.md`.

## 3. Official evidence and limitations

Only official Supabase and PostgreSQL sources are used for technical claims in this design.

| Source | Directly supported point | Design consequence |
| --- | --- | --- |
| [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups) | Paid plans receive scheduled backups; Free projects should regularly export with the CLI. Database backups do not include Storage objects. | A Free-plan release needs an explicit manual backup process, and Storage requires separate treatment. |
| [Supabase CLI database dump reference](https://supabase.com/docs/reference/cli/supabase-db-dump) | `supabase db dump` is based on `pg_dump`; schema, data, and roles are separate concerns; managed schemas may be filtered by default; `--dry-run` exists. | Gate A must inspect the generated command plan and artifacts rather than assume Auth is included. |
| [Supabase backup and restore using the CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) | The documented logical flow produces roles, schema, and data artifacts and restores through `psql`; migration history and Storage need additional handling. | The rehearsal must include all required artifacts and preserve migration history separately. |
| [Supabase restore from Platform to self-hosted](https://supabase.com/docs/guides/self-hosting/restore-from-platform) | A full logical migration may include Auth database records, while platform configuration, secrets, Edge Functions, and Storage objects require separate handling; version differences can break restore. | Auth inclusion must be proven from the actual artifacts, and configuration continuity cannot be inferred from a database dump. |
| [Supabase Auth user migration guidance](https://supabase.com/docs/guides/troubleshooting/migrating-auth-users-between-projects) | Auth tables and password hashes can be migrated, but JWT secret differences invalidate existing tokens and there is no universal Auth-only migration recipe. | Restoring user records is distinct from preserving active sessions and platform Auth configuration. |
| [Supabase Auth users](https://supabase.com/docs/guides/auth/users) | Auth users and identities are related database records. | The rehearsal must validate user and identity relationships, not only `auth.users` row counts. |
| [Supabase Auth sessions](https://supabase.com/docs/guides/auth/sessions) | Sessions involve access and refresh tokens and server-side session records. | A successful row restore must not be described as guaranteed session continuity. |
| [PostgreSQL SQL dump restore](https://www.postgresql.org/docs/current/backup-dump.html) | `psql` can continue after errors unless configured to stop; a single transaction provides all-or-nothing behavior but has operational costs. | Restore commands must use stop-on-error and, where compatible, a transaction boundary; success must be verified afterward. |
| [Supabase Production checklist](https://supabase.com/docs/guides/deployment/going-into-prod) | Backup and recovery capability depends on plan and configuration. | Remote Apply cannot rely on an unverified implicit recovery mechanism. |

### 3.1 Official-document ambiguity that must not be hidden

The CLI reference describes filtering managed schemas such as Auth and Storage in ordinary dump behavior, while Supabase restore guidance describes workflows in which Auth database records can be included. This review does not resolve that difference by assumption. The exact Supabase CLI version, selected flags, generated command plan, and resulting artifact contents must be inspected before any Production dump is authorized.

If the proposed artifacts cannot demonstrably preserve the Auth records required by v1 foreign keys and sign-in continuity, the rehearsal must stop. Client metadata, exported profile tables, or manually reconstructed Email addresses are not acceptable substitutes.

## 4. Repository dependency map relevant to restore

### 4.1 Direct Auth dependencies

- `public.users.user_id` references `auth.users.id` with `ON DELETE CASCADE`.
- `public.care_receivers.owner_user_id` references `auth.users.id` with `ON DELETE CASCADE`.
- `public.care_sources.user_id` references `public.users.user_id` with `ON DELETE SET NULL`.
- Migration 003 installs Auth lifecycle triggers that provision and synchronize `public.users` from `auth.users`.

### 4.2 Downstream v1 graph

The receiver-owned graph includes tasks, scenarios, care sources, assignments, adaptations, coverage evaluations, backup assignments, and task handoffs through a mixture of cascade and restrictive foreign keys. A missing owner Auth UUID can therefore prevent restoration or cause loss of the case graph under destructive account operations.

### 4.3 Restore implications

- Auth UUIDs must remain stable; generating replacement users would break existing foreign-key identity.
- Restoring public rows without the corresponding Auth rows cannot satisfy the direct foreign keys under normal enforcement.
- Restoring Auth rows while the profile provisioning trigger is active may create `public.users` rows before the public data artifact is restored, producing duplicate-key or semantic conflicts.
- A restore performed with trigger enforcement disabled may avoid ordering failures, but it also bypasses foreign-key and lifecycle-trigger protection; complete post-restore validation then becomes mandatory.
- A database restore does not by itself prove that OAuth providers, SMTP, redirect configuration, JWT secrets, Storage objects, Edge Functions, or active sessions are equivalent.

## 5. Backup scope and artifact classification

All Production-derived artifacts are stored outside the Repository. Filenames below are logical names, not authorization to create them.

| Artifact | Required for rehearsal | Sensitivity | Storage and handling rule |
| --- | --- | --- | --- |
| `roles.sql` | Yes | Confidential security metadata | Outside Repository, owner-only permissions, encrypted at rest when available; verify no passwords are present. |
| `schema.sql` | Yes | Confidential architecture metadata | Outside Repository, owner-only permissions; hash before and after transfer. |
| `data.sql` | Yes | Highly sensitive | Outside Repository, owner-only permissions, encryption required before persistent storage or transfer; never inspect by printing raw content. |
| Migration-history schema/data artifact | Yes | Confidential | Preserve outside Repository; validate local and remote timestamps without exposing identifiers. |
| Artifact manifest | Yes | Confidential by default | Include hashes, byte sizes, tool versions, timestamp, redacted environment label, and command type; exclude secrets and remote identifiers. |
| Checksum file | Yes | Low sensitivity alone | Keep beside encrypted artifacts; hashes do not replace access control. |
| Sanitized command/result log | Yes | Confidential | Redact hosts, credentials, tokens, Emails, UUIDs, and row data before long-term retention. |
| Auth database records | Conditionally required and blocking | Highly sensitive | Must be present if needed for FK and sign-in continuity; never commit, print, or transmit unencrypted. |
| Auth configuration inventory | Yes | Confidential | Record configuration presence and version, never secret values. |
| Storage metadata | Inventory required | Confidential | Database metadata is not the underlying object backup. |
| Storage objects | Required only if remote inventory is non-empty and in scope | Highly sensitive | Separate object export and restore rehearsal; never infer inclusion from `storage` metadata. |
| Edge Function source inventory | Inventory required | Confidential | Prefer version-controlled source; environment secrets are separate and never included in logs. |
| Realtime, webhook, extension inventory | Yes | Confidential | Record enabled components and non-secret settings; endpoint credentials must be excluded. |

### 5.1 Minimum artifact manifest

The manifest must contain:

- run identifier unrelated to a project ref;
- source environment label such as `production`, without URL or host;
- UTC generation time;
- Supabase CLI and PostgreSQL client versions;
- source and target PostgreSQL major versions when known;
- artifact relative filename, byte size, line count where applicable, and SHA-256;
- dump command category and non-secret flags;
- whether Auth rows, migration history, Storage metadata, and Storage objects were included;
- restore result and validation-report hash;
- operator and reviewer identifiers that do not expose credentials.

The manifest must not contain a database URL, project ref, access token, password, JWT secret, API key, complete Email, or business UUID.

## 6. Auth, sessions, Storage, and platform configuration boundaries

### 6.1 Auth data

The rehearsal must prove the presence and referential integrity of the required Auth database rows without revealing their contents. Required checks include:

- `auth.users` identifiers needed by `public.users` and `care_receivers` exist;
- relevant `auth.identities` relationships are preserved;
- restored confirmed-email state is consistent;
- Auth lifecycle triggers do not duplicate or overwrite restored profiles;
- password hashes, if included, are never exposed in logs or reports.

### 6.2 Sessions and tokens

The following claims are prohibited unless independently tested:

- existing access tokens continue to work;
- existing refresh tokens continue to work;
- a database restore preserves every active session;
- identical users imply identical JWT trust.

JWT secrets and Auth provider configuration are platform configuration, not ordinary database artifacts. A restore target with different signing material must be expected to require reauthentication.

### 6.3 Storage

A database backup can preserve Storage metadata while omitting stored objects. The rehearsal must first inventory whether any relevant Storage buckets or objects exist. If they do, a separate encrypted object backup and object-level restore validation become a blocker. If there are none, the evidence must record a zero-object result without exposing bucket identifiers.

### 6.4 Other platform components

Before Remote Apply, the inventory must cover:

- Edge Functions and their separately managed secrets;
- Auth provider and redirect configuration;
- SMTP configuration;
- Realtime configuration;
- webhooks and scheduled jobs;
- enabled extensions and their versions;
- custom roles and password-reset requirements;
- any Vault or encryption-key dependency.

## 7. Strategy comparison

### Strategy A — Upgrade for managed backups or PITR

**Description:** Move to a plan and configuration that provides a downloadable managed backup and, where appropriate, PITR before applying Migration 007.

**Advantages**

- strongest operational recovery posture;
- platform-native backup lifecycle and recovery support;
- reduces dependence on a one-time manual artifact;
- PITR can reduce the recovery-point window.

**Limitations**

- creates cost and plan decisions outside this gate;
- Storage objects and platform configuration still require separate verification;
- a backup feature does not eliminate the need to rehearse restoration;
- enabling a paid capability immediately before release does not retroactively prove a restore point is usable.

### Strategy B — Manual logical dump plus fresh isolated local restore

**Description:** Generate a complete, encrypted logical artifact set using documented Supabase CLI flows, then restore it into a freshly created isolated Local Supabase environment with version compatibility and post-restore verification.

**Advantages**

- feasible for a student Prototype on the Free plan;
- tests the exact logical artifacts under the team's control;
- can verify Auth/public dependencies, migrations, RLS, functions, and v1 data integrity;
- does not require a second remote project.

**Limitations**

- not equivalent to PITR or a platform snapshot;
- exact managed-schema and Auth inclusion must be proven;
- local versions may not exactly match Production services;
- platform configuration, Storage objects, and session continuity require separate treatment;
- recovery time can be longer and more manual.

### Strategy C — Restore into a separate Supabase project

**Description:** Restore the artifact set into a distinct non-Production Supabase project and perform application-level smoke checks.

**Advantages**

- tests more of the hosted Supabase behavior than a local target;
- supports end-to-end Auth, API, and RLS checks against a hosted environment;
- provides a stronger staging signal before Production.

**Limitations**

- requires separate authorization, quota, cost, credentials, and an unmistakable environment boundary;
- Production-derived personal data should not be copied to staging unless there is an approved privacy basis and equivalent protection;
- sanitized synthetic data cannot prove recovery of the actual Production rows;
- project secrets and platform settings still need independent recreation.

### 7.1 Recommendation

Use **Strategy B as the immediate Prototype recovery rehearsal**, preceded by a command-plan review and followed by a full isolated restore validation. It is the smallest feasible strategy that can produce direct evidence on the current Free plan.

Strategy B may close the manual-backup recovery blocker only when every acceptance criterion in this document passes and the remaining risk of not having PITR is explicitly accepted. It is not a claim of zero data-loss risk. If Auth inclusion, version compatibility, or complete restoration cannot be demonstrated locally, stop and use **Strategy A** before Remote Apply. Strategy C is a later, separately authorized hosted-staging enhancement and must not receive Production data without privacy approval.

## 8. Sequential rehearsal gates

### Gate A — Backup command dry-run review

Purpose: establish the exact non-secret commands and predicted object coverage before reading Production data.

Required evidence:

- CLI and client versions;
- official command form and flags;
- dry-run output reviewed without credentials;
- managed-schema exclusions explicitly identified;
- Auth, migration-history, Storage, and roles coverage mapped;
- estimated free disk requirement and encrypted destination prepared;
- no artifact created yet.

Command types, with placeholders only:

```text
supabase db dump --db-url "<SOURCE_DB_URL>" --dry-run [reviewed schema flags]
supabase db dump --db-url "<SOURCE_DB_URL>" --dry-run --role-only [reviewed flags]
supabase db dump --db-url "<SOURCE_DB_URL>" --dry-run --data-only --use-copy [reviewed exclusions]
```

No command above is authorized by this document.

### Gate B — Manual backup creation

Purpose: generate the approved artifact set once, without exposing contents.

Required controls:

- action-time authorization;
- output directory outside the Repository;
- owner-only filesystem permissions;
- adequate free disk capacity;
- encrypted persistent storage and separate key custody;
- sanitized logs;
- checksums generated immediately;
- artifact inventory confirms expected schema, Auth, roles, data, and migration-history coverage;
- unexpected output, secret exposure, or missing Auth coverage stops the gate.

### Gate C — Fresh isolated restore rehearsal

Purpose: restore from only the produced artifacts, not from the source project or previous local volumes.

Required controls:

- new temporary directory and isolated Local Supabase project;
- fresh volumes, distinct ports, telemetry disabled, seed disabled;
- no repository remote link or environment files;
- compatible PostgreSQL and Supabase service versions documented;
- `psql` stop-on-error and a transaction boundary where supported;
- two independent sessions for concurrency checks where applicable;
- artifacts remain encrypted except during the minimum local restore window.

Command types, with placeholders only:

```text
psql --variable ON_ERROR_STOP=1 --file "<BACKUP_DIR>/roles.sql" "<TARGET_DB_URL>"
psql --variable ON_ERROR_STOP=1 --file "<BACKUP_DIR>/schema.sql" "<TARGET_DB_URL>"
psql --variable ON_ERROR_STOP=1 --single-transaction --file "<BACKUP_DIR>/data.sql" "<TARGET_DB_URL>"
```

The final reviewed restore command may require documented session settings and migration-history handling. It must be frozen in Gate A before execution.

### Gate D — Restore verification

Purpose: prove logical consistency and minimum application continuity.

Required evidence:

- schema, table, function, trigger, policy, grant, and migration inventories;
- exact v1 table row counts compared with the source-side pre-backup manifest;
- no orphaned FK relationships;
- Auth user/profile/receiver relationships preserved without exposing identifiers;
- RLS isolation using synthetic test accounts created only in the restore target;
- v1 application smoke tests and Migration 007 verification harness;
- Storage metadata and objects reconciled separately;
- failed statements count is zero;
- restore duration and any warnings recorded;
- no changes made to Production.

### Gate E — Remote Apply authorization review

Purpose: decide whether the verified recovery evidence and remaining risk justify applying Migration 007.

Required inputs:

- Gates A–D passed;
- artifact hashes and encrypted storage confirmed;
- restore report reviewed;
- remote migration history rechecked immediately before apply;
- maintenance window and user impact accepted;
- forward-fix and emergency route-disable plan prepared;
- explicit action-time Remote Apply authorization.

## 9. Restore ordering design

The exact order must follow the reviewed artifacts and must be proven by rehearsal. The proposed logical order is:

1. Create a fresh compatible Supabase target with managed schemas and services initialized.
2. Record target versions and confirm it is isolated from Production.
3. Restore approved custom role definitions, recognizing that custom role passwords are not supplied by ordinary backups.
4. Restore extensions and schema objects in the order produced by the verified Supabase dump workflow.
5. Restore Auth and public data in the verified artifact order.
6. If `session_replication_role = replica` is used, treat all skipped triggers and FK checks as untrusted until explicit post-restore validation completes.
7. Restore and reconcile migration history using its dedicated artifact.
8. Validate constraints, triggers, grants, RLS, functions, Auth lifecycle behavior, and orphan counts.
9. Restore Storage objects separately when applicable, then reconcile object and metadata counts.
10. Recreate non-database platform configuration from an approved secret-management source, never from committed artifacts.
11. Run v1 regression and Migration 007 verification without contacting Production.

The following shortcuts are prohibited:

- restoring public data while omitting required Auth identities;
- generating new Auth UUIDs to make foreign keys pass;
- trusting a zero exit code while ignoring restore warnings;
- enabling triggers after a replica-mode restore without validating the data they would have protected;
- describing restored users as having preserved sessions without an explicit session test;
- copying Production secrets into logs or the Repository.

## 10. Acceptance criteria

The rehearsal passes only if all applicable criteria are `PASS`, not inferred:

### 10.1 Artifact integrity

- Every required artifact exists, is non-empty where expected, and matches its manifest SHA-256.
- No artifact is stored in or staged by the Repository.
- Sensitive artifacts are encrypted for persistent retention.
- Logs and reports contain no credentials, complete Emails, Auth IDs, business UUIDs, or row content.

### 10.2 Restore completeness

- Restore starts from an empty isolated target and uses only the saved artifacts.
- All restore commands stop on the first error.
- Roles, extensions, schema, data, migration history, functions, triggers, grants, and RLS match the expected inventory.
- Source and restored v1 row counts match exactly for all 10 v1 tables.
- Foreign-key and uniqueness checks pass with zero orphans.
- Migration 001–006 identities and hashes remain unchanged.

### 10.3 Auth continuity

- Auth identifiers referenced by v1 data are preserved.
- Auth identities and profile links are consistent.
- Auth lifecycle triggers neither duplicate nor overwrite restored profiles.
- At least one restore-target-only synthetic sign-in test confirms expected account access behavior.
- The report clearly states whether existing sessions were preserved, intentionally invalidated, or not tested.

### 10.4 Authorization and security

- RLS inventory matches the expected v1 and v2 state for the tested point in the rehearsal.
- A/B isolation passes using synthetic restore-target users.
- anon and authenticated direct-write denial remains effective where required.
- Function owner, `prosecdef`, `search_path`, and ACL inventories match the validated release candidate.
- No restore artifact or tombstone grants content access.

### 10.5 Operational recovery

- Restore duration and artifact sizes are recorded.
- Storage objects, if any, are independently restored and reconciled.
- Edge Functions and platform configuration gaps are listed.
- The team can identify the exact artifact and procedure that would be used after a failed Production release.
- Remaining risk from the lack of PITR is explicitly accepted before Remote Apply.

## 11. Failure handling and cleanup design

### 11.1 Backup failure

- Stop immediately after the first failing command.
- Mark the run `INCOMPLETE`; do not reuse partial artifacts.
- Preserve only sanitized diagnostic output.
- Do not retry with broader schema inclusion or weaker security flags without a new review.
- Do not delete partial sensitive artifacts until their exact run directory is verified and cleanup is separately authorized.

### 11.2 Checksum or artifact-content failure

- Quarantine the whole run as invalid.
- Never combine files from different backup attempts.
- If Auth coverage is absent or ambiguous, keep Remote Apply blocked.
- If a log contains a secret, stop, restrict access, rotate the exposed credential where applicable, and perform separately authorized precise cleanup.

### 11.3 Restore failure

- Preserve the isolated target, logs, manifest, and first root-cause error for review.
- Do not patch the restored database manually and then call the rehearsal successful.
- Correct the command design or artifact generation in a new run from a new empty target.
- Never fall back to Production as a test target.

### 11.4 Cleanup

- Stop only the verified rehearsal project using its exact work directory.
- Do not use global stop, recursive deletion, `docker rm`, or volume deletion as an implicit cleanup step.
- Preserve volumes and logs until the evidence has been accepted and explicit cleanup authorization is granted.
- Delete sensitive artifacts only by exact validated path and according to the approved retention decision.
- Do not modify or delete the existing Round 1/Round 2 Migration 007 dry-run evidence during this process.

## 12. Rollback and recovery interpretation

A logical backup rehearsal provides recovery evidence, not an instant rollback button.

- **Before Migration 007 apply:** stop without changing Production.
- **Apply fails inside its migration transaction:** rely on database transaction rollback, then audit remote migration history and objects before retrying.
- **Apply succeeds and no v2 data exists:** prefer an additive corrective migration or disabling v2 routes; do not drop seven tables without a separate destructive review.
- **Apply succeeds and v2 data exists:** use forward fixes by default. A restore would replace more than Migration 007 and therefore needs a declared recovery point, downtime, and data-loss decision.
- **RLS or ACL regression:** disable affected v2 application entry points and use an additive corrective migration; do not assume restoring only policy definitions is sufficient.
- **v1 regression or destructive data loss:** stop writes, preserve evidence, and evaluate full restore from the verified artifact. On a Free plan without PITR, data created after the backup may be lost.

## 13. Remaining unknowns

The following must be resolved in later gates:

1. Whether the exact installed Supabase CLI version and reviewed flags include all required Auth records.
2. Whether the remote PostgreSQL and Supabase service versions can be matched closely enough by the isolated target.
3. The exact schema/data ordering produced by the approved dump command and how Auth lifecycle triggers behave during restore.
4. Whether active sessions should be restored, invalidated, or explicitly excluded.
5. The Production inventory of Storage objects, Edge Functions, Realtime configuration, webhooks, extensions, custom roles, and Vault dependencies.
6. The actual artifact size, required free disk space, restore duration, and acceptable RTO/RPO.
7. The approved encryption tool, encryption-key custodian, retention period, and secure deletion process.
8. Whether a separate hosted staging project is available and legally appropriate for any Production-derived data.
9. Whether Supabase plan upgrade or PITR is required because the manual rehearsal cannot meet the accepted recovery objective.
10. The exact process for preserving and restoring remote migration history without divergence.
11. Whether the remote Auth configuration can be reconstructed without copying secrets into the rehearsal evidence.
12. Whether a real restore of Production-derived personal data into a developer machine is acceptable under the project's privacy and institutional requirements.

## 14. Gate conclusion

| Gate | Decision | Reason and next condition |
| --- | --- | --- |
| Manual Backup & Restore Rehearsal Design | `PASS` | The strategy, artifact boundaries, Auth/Storage limitations, rehearsal sequence, acceptance criteria, and failure handling are defined without pretending that recovery has been tested. |
| Backup Command Dry-run Review | `READY FOR SEPARATE AUTHORIZATION` | It may begin as a read-only command-plan inspection using official documentation and placeholders. It must not create a Production dump without a further action-time authorization. |
| Manual Production Backup Creation | `BLOCKED` | Requires Gate A approval, secure storage/encryption preparation, disk-capacity check, exact Auth coverage, and explicit action-time authorization. |
| Fresh Isolated Restore Rehearsal | `BLOCKED` | Requires a valid complete backup artifact set from Gate B and a separately authorized isolated environment. |
| Remote Supabase Apply | `BLOCKED` | Requires Gates A–D to pass, immediate remote preflight refresh, accepted recovery limitations, and explicit Remote Apply authorization. |

### Final decision

- A Production dump must **not** be created in this gate.
- No Remote Supabase operation is authorized.
- The next recommended gate is **Migration 007 Backup Command Dry-run Review**, limited to exact command selection, dry-run output interpretation, artifact coverage, storage controls, and a stop/go decision for manual backup creation.
- Migration 007 Remote Apply remains blocked.

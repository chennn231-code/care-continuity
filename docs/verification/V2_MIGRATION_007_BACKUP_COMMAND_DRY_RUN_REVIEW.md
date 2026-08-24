# Migration 007 Backup Command Dry-run Review

- Status: Command and parameter review
- Date: 2026-08-24
- Branch: `codex/v2-proposed-pivot`
- Baseline commit: `2bd24684274d0779b0f298c36fd3a42ee4414a20`
- Source environment: Production, identity redacted
- Remote connection performed in this review: No
- `db dump`, backup, restore, migration apply, or deployment performed: No

> In this document, “dry-run” means review of commands, parameters, artifact coverage, credential handling, and stop conditions. It does not authorize `supabase db dump --linked`, `supabase db dump --dry-run --linked`, a command containing a remote database URL, or any other remote connection.

## 1. Git and release-candidate baseline

The review began with the following verified local state:

- branch `codex/v2-proposed-pivot`;
- HEAD `2bd24684274d0779b0f298c36fd3a42ee4414a20`;
- upstream `origin/codex/v2-proposed-pivot`;
- ahead 0, behind 0;
- clean working tree;
- `main` remains `de522762bf272599b12b822ec096a0d0768f624a`;
- formal migrations 001–007 are present;
- migrations 001–006 have no working-tree changes;
- Formal Migration 007 is `supabase/migrations/20260824220000_v2_access_foundation.sql`;
- Formal Migration 007 SHA-256 is `84007ccc2e5c16246435a1186e6123951f805bc383725504612d67e3dfbf1389`.

The prior Remote Read-only Preflight remains `PARTIAL`. The prior Backup and Restore Rehearsal Design is `PASS`. Neither result authorizes Production access.

## 2. Local tool inventory

Only version and help commands were executed. No database connection was attempted.

| Tool | Local result | Release implication |
| --- | --- | --- |
| Supabase CLI | `2.115.0` | All future command output and flags must be reviewed against this exact version. A version change stops Gate B. |
| `supabase db dump --help` | Supports `--dry-run`, `--data-only`, `--use-copy`, `--exclude`, `--role-only`, `--schema`, `--file`, `--linked`, `--db-url`, and `--password` | The planned command categories are available, but help output does not prove Auth inclusion. |
| Docker CLI | `29.6.2` | Available for a later isolated restore; not used here. |
| Host `psql` | Not installed on PATH | Production Backup Creation cannot rely on a host `psql` query until a reviewed read-only query method exists. |
| `shasum` | Installed | Suitable for SHA-256 manifests. |
| OpenSSL | `3.6.3` | Installed, but `openssl enc` is not selected because it does not provide the desired authenticated-encryption assurance for this workflow. |
| `age` | Not installed | Recommended encryption tool is currently unavailable. |
| GnuPG | Not installed | Backup encryption option is currently unavailable. |
| macOS `hdiutil` | Installed | Possible fallback container encryption, but not selected as the primary authenticated archive format. |
| Operating system | macOS arm64 | Command plan and tool installation review must target this platform. |
| Available disk at review time | Approximately 46 GiB | This is not a Gate B capacity guarantee; capacity must be checked again immediately before artifact creation. |

The first plain Supabase version invocation attempted to write a telemetry cache outside the workspace and was blocked by the sandbox. The successful version/help inspection used `SUPABASE_TELEMETRY_DISABLED=1`. No Repository or remote state changed.

## 3. Official sources

| Official source | Relevant evidence | Consequence |
| --- | --- | --- |
| [Supabase CLI reference — `db dump`](https://supabase.com/docs/reference/cli/supabase-projects-create#supabase-db-dump) | `db dump` wraps `pg_dump`, separates schema/data/roles, and normally excludes managed schemas including Auth and Storage; `--dry-run` prints the underlying plan. | Managed-schema coverage cannot be assumed from a successful default dump. |
| [Backup and Restore using the Supabase CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) | Official workflow creates roles, schema, data, and separate migration-history artifacts; Storage vector tables are excluded from data export. | The artifact set and migration-history separation follow this workflow. |
| [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups) | Free-plan projects should use CLI exports; database backups contain Storage metadata but not Storage objects. | Production logical backup and Storage-object coverage are separate gates. |
| [Restore Platform project to self-hosted](https://supabase.com/docs/guides/self-hosting/restore-from-platform) | The documented logical backup can include Auth user records, but version and managed-service schema differences can affect restoration. | Actual Auth coverage and version compatibility must be inspected and rehearsed. |
| [Migrating Auth users](https://supabase.com/docs/guides/troubleshooting/migrating-auth-users-between-projects) | Auth records and password hashes can be migrated; a different JWT secret invalidates existing tokens. | Database-row continuity does not prove session continuity. |
| [Supabase Production checklist](https://supabase.com/docs/guides/deployment/going-into-prod) | Downloadable managed backups are unavailable on Free plans. | A manual recovery artifact is needed unless the plan changes. |
| [PostgreSQL password file](https://www.postgresql.org/docs/current/libpq-pgpass.html) | A password file can avoid interactive password entry and requires restrictive permissions. | `PGPASSFILE` is conceptually safer than a password flag, but whether the Supabase CLI container consumes it must be verified before use. |
| [PostgreSQL environment variables](https://www.postgresql.org/docs/current/libpq-envars.html) | Passwords in environment variables may be visible to other processes on some systems; password files are preferred. | Environment-based credentials are fallback-only and must not be logged. |

### 3.1 Evidence conflict retained as an explicit unknown

The CLI reference states that managed schemas are excluded by the wrapped dump process, while Supabase backup/restore guidance describes logical exports that migrate Auth records. This document does not choose one interpretation without evidence from the exact CLI version and exact command plan.

Gate B must first run the approved remote command-plan inspection and then inspect only relation-section names and aggregate counts. It must not display Auth row contents.

## 4. Planned session root and file permissions

The backup session root must be created outside the Repository and outside a cloud-synchronized directory.

Permitted placeholders:

- `<BACKUP_ROOT_OUTSIDE_REPOSITORY>`
- `<BACKUP_TIMESTAMP>`
- `<BACKUP_RANDOM_SUFFIX>`
- `<BACKUP_SESSION_ROOT>`
- `<ENCRYPTED_ARCHIVE_PATH>`

Preconditions for Gate B:

1. Set `umask 077` before creating any directory or file.
2. Create a unique directory using a reviewed `mktemp -d` template under an approved external root.
3. Resolve its physical path and confirm it is not within the Repository.
4. Reject a target that is a symlink or resolves through a symlink into the Repository.
5. Reject an existing session directory; never overwrite a previous run.
6. Confirm directory mode `0700` and artifact mode `0600`.
7. Recheck free disk space immediately before creation and after every large artifact.
8. Do not use `$HOME`, `~`, the Repository root, or an unresolved variable as a cleanup target.
9. Never print the resolved credential-file path together with its contents.

Logical setup form only:

```text
umask 077
<BACKUP_SESSION_ROOT> := securely create a unique directory beneath <BACKUP_ROOT_OUTSIDE_REPOSITORY>
verify resolved path, ownership, mode 0700, non-symlink status, and available disk
```

This is a design expression, not an executable script.

## 5. Credential handling decision

### 5.1 Comparison

| Method | Benefits | Risks | Decision |
| --- | --- | --- | --- |
| `--linked` with interactive/native credential handling | Avoids putting a full database URL in the command line; supported by the Supabase CLI | Wrong linked target is possible; linked metadata must be verified; stored credential behavior depends on native credential support | **Recommended for Gate B**, only after a separate redacted identity check proves the link is Production and the CLI prompts or securely retrieves the password without logging it. |
| `--db-url` | Explicit source selection | Expanded URL is visible in argv/process inspection and may enter shell history or logs | Not approved as the default. |
| `--password` flag | Simple CLI support | Password appears in argv and may be retained in history or logs | Prohibited. |
| Interactive password prompt | Secret is not in command history or argv | Automation is harder; must ensure the CLI truly prompts rather than logging | Preferred when available with the verified link. |
| `SUPABASE_DB_PASSWORD` or similar environment variable | Avoids literal secret in the typed command | Environment may be inspectable by same-user processes and may leak through debugging | Fallback only after a separate security review; debug output prohibited. |
| Session-local `PGPASSFILE` | Restrictive mode and no password in argv | Supabase CLI runs `pg_dump` in a container; host file propagation is not established | Preferred PostgreSQL pattern, but **BLOCKED pending CLI compatibility verification**. |
| Temporary file containing a full connection URL | Can be permission-restricted | The CLI has no reviewed URL-file flag; command substitution would expose the expanded URL in argv | Prohibited for this CLI workflow. |

### 5.2 Gate B recommendation

Use the exact Repository work directory with `SUPABASE_TELEMETRY_DISABLED=1`, `--linked`, and interactive/native credential handling only after a redacted remote-identity precheck. Do not include `--password`, `--db-url`, `--debug`, or any command expansion that prints credentials.

If the CLI cannot obtain the password without placing it in argv, history, or public logs, Gate B stops. A separately reviewed `PGPASSFILE` or environment fallback may be proposed later, but no fallback is authorized by this document.

Any credential temp file must be created inside the exact session temp root with mode `0600`, contain only the minimum connection material, never be committed, and be removed only by its validated exact path after successful encryption and evidence review. Broad cleanup is prohibited.

## 6. Planned artifact set

| Artifact | Planned generation category and flags | Potential contents | Git | Permissions/encryption | Restore order and integrity | Failure disposition |
| --- | --- | --- | --- | --- | --- | --- |
| `roles.sql` | `db dump --linked --role-only --file <path>` | Role definitions and security metadata; custom role passwords are not expected | Never | `0600`; encrypt | First database artifact; non-empty check, SHA-256, structural scan | Retain only in a quarantined failed-run directory until reviewed cleanup |
| `schema.sql` | `db dump --linked --file <path>` | Public/custom schema, functions, RLS, grants; managed schemas may be excluded | Never | `0600`; encrypt | After roles; SHA-256, statement-category inventory, no raw output | Same as above |
| `data.sql` | `db dump --linked --data-only --use-copy` with reviewed Storage-vector exclusions | Production rows; may include Auth users, password hashes, metadata, Storage metadata, and other sensitive data depending on actual CLI behavior | Never | `0600`; encryption mandatory | After schema; SHA-256, COPY relation inventory and aggregate counts only | Same as above; missing Auth coverage invalidates the run |
| `migration_history_schema.sql` | `db dump --linked --schema supabase_migrations --file <path>` | Migration-history schema | Never | `0600`; encrypt with set | Restore before migration-history data; SHA-256 and schema identity | Same as above |
| `migration_history_data.sql` | `db dump --linked --schema supabase_migrations --data-only --use-copy --file <path>` | Migration timestamps/history | Never | `0600`; encrypt with set | Restore after its schema; compare expected 001–006 before Migration 007 apply | Same as above |
| `auth_schema.sql` | Conditional explicit `--schema auth` command after command-plan review | Managed Auth schema customizations, not necessarily platform base schema | Never | `0600`; encryption mandatory | Apply only through the reviewed restore order; SHA-256 and relation inventory | Stop if it conflicts with managed target schemas |
| `auth_data.sql` | Conditional explicit `--schema auth --data-only --use-copy` after command-plan review | Auth users, identities, password hashes, sessions, tokens, metadata | Never | `0600`; encryption mandatory | Restore only if required and verified; relation inventory/counts, never raw data | Any incomplete coverage stops restore |
| `storage_inventory.json` | Approved aggregate read-only inventory, not a dump of objects | Aggregate bucket/object counts only; no object names or paths | Never by default | `0600`; encrypt with manifest set | Validation input only; SHA-256 | Object count greater than zero opens a separate Storage Backup Gate |
| `manifest.json` | Generated locally from command results and hashes | Redacted run metadata, no SQL data or credentials | Never by default | `0600`; encrypt with set | Read before restore; schema validation and SHA-256 | Failed/incomplete status retained in encrypted evidence |
| `checksums.sha256` | `shasum -a 256` over exact artifacts | Filenames and hashes | Never by default | `0600`; encrypt/sign with set | Verify before and after encryption/transfer and before restore | Any mismatch invalidates complete run |
| encrypted archive | Authenticated archive tool over the completed plaintext artifact set | All Production backup data | Never | Owner-only; stored outside synchronized folders unless approved encrypted destination | Decrypt test into a separate exact temp path, verify all hashes | Preserve for authorized retention if verification passes |

No artifact above contains physical Storage objects. A database dump is never labeled a complete App backup when Storage objects exist and have not been separately copied and restored.

## 7. Redacted command plan

The following commands are templates for Gate B review. They are not executed in this gate and intentionally omit credentials and real paths.

### 7.1 Command-plan inspection before artifacts

```text
SUPABASE_TELEMETRY_DISABLED=1 supabase db dump --linked --dry-run --role-only
SUPABASE_TELEMETRY_DISABLED=1 supabase db dump --linked --dry-run
SUPABASE_TELEMETRY_DISABLED=1 supabase db dump --linked --dry-run --data-only --use-copy --exclude storage.buckets_vectors --exclude storage.vector_indexes
SUPABASE_TELEMETRY_DISABLED=1 supabase db dump --linked --dry-run --schema supabase_migrations
SUPABASE_TELEMETRY_DISABLED=1 supabase db dump --linked --dry-run --schema supabase_migrations --data-only --use-copy
```

The output must be captured only after confirming it does not expose connection material. If it does, stop and do not save the output.

### 7.2 Artifact creation after command-plan approval

```text
SUPABASE_TELEMETRY_DISABLED=1 supabase db dump --linked --role-only --file "<BACKUP_SESSION_ROOT>/roles.sql"
SUPABASE_TELEMETRY_DISABLED=1 supabase db dump --linked --file "<BACKUP_SESSION_ROOT>/schema.sql"
SUPABASE_TELEMETRY_DISABLED=1 supabase db dump --linked --data-only --use-copy --exclude storage.buckets_vectors --exclude storage.vector_indexes --file "<BACKUP_SESSION_ROOT>/data.sql"
SUPABASE_TELEMETRY_DISABLED=1 supabase db dump --linked --schema supabase_migrations --file "<BACKUP_SESSION_ROOT>/migration_history_schema.sql"
SUPABASE_TELEMETRY_DISABLED=1 supabase db dump --linked --schema supabase_migrations --data-only --use-copy --file "<BACKUP_SESSION_ROOT>/migration_history_data.sql"
```

### 7.3 Conditional Auth commands

Only if default `data.sql` fails the Auth coverage checks and the exact CLI dry-run confirms an explicit Auth export can be produced safely:

```text
SUPABASE_TELEMETRY_DISABLED=1 supabase db dump --linked --dry-run --schema auth
SUPABASE_TELEMETRY_DISABLED=1 supabase db dump --linked --dry-run --schema auth --data-only --use-copy
```

Artifact-producing versions require a separate stop/go decision. They must not overwrite an existing artifact, and their compatibility with a managed restore target must be established before use.

### 7.4 Hash and manifest categories

```text
shasum -a 256 <EXACT_ARTIFACT_PATHS> > "<BACKUP_SESSION_ROOT>/checksums.sha256"
generate redacted "<BACKUP_SESSION_ROOT>/manifest.json" from verified local metadata
verify every recorded hash before encryption
```

The hash command must enumerate exact filenames; a wildcard or recursive Repository path is not permitted.

## 8. Auth coverage review

### 8.1 Current conclusions

1. **Does the planned default data-only dump theoretically include Auth?** Official Supabase migration examples indicate that logical project migration can include Auth records, including users and password hashes. However, the CLI reference also states that managed schemas are excluded by the wrapped dump process. For CLI 2.115.0 and the planned flags, the answer remains `UNKNOWN UNTIL GATE B INSPECTION`.
2. **Is explicit `--schema auth` required?** Not yet determined. It is a conditional command, not a default assumption. Explicit Auth schema artifacts may conflict with the managed target's Auth schema/version and therefore require a restore-compatibility review.
3. **Can the CLI exclude some managed Auth tables?** Yes, the official CLI documentation describes managed-schema filtering. The exact exclusions for default data-only output must be observed from the reviewed command plan and artifact relation inventory.
4. **What remains for Gate B?** Actual COPY relation-section presence, aggregate row counts, required FK UUID coverage, identities coverage, and whether session/token relations are included or intentionally excluded.
5. **What if Auth coverage is incomplete?** Stop immediately. Do not continue to encryption as a “complete” backup and do not begin restore rehearsal.

### 8.2 Privacy-preserving checks planned for Gate B

Checks must parse relation section names and counts without displaying row values:

- whether the schema/data artifact contains an `auth.users` relation section;
- whether it contains `auth.identities`;
- which other Auth relations appear, expressed only as approved relation names and aggregate counts;
- whether `COPY auth.users` and `COPY auth.identities` sections exist;
- aggregate source counts compared with dump COPY row counts;
- aggregate compatibility of `public.users` and `auth.users`;
- zero missing Auth identifiers required by public foreign keys;
- zero duplicate Auth-to-public identity mappings.

Forbidden output includes UUIDs, Emails, password hashes, metadata, tokens, providers tied to a person, or raw SQL rows.

### 8.3 Sessions and platform settings

- Restoring Auth rows does not guarantee that old access or refresh tokens remain valid.
- A different JWT secret invalidates old tokens and should cause reauthentication.
- Auth provider settings, SMTP, redirect URLs, API keys, and JWT secret are outside the guarantee of ordinary SQL artifacts.
- Gate B must decide whether session and refresh-token tables are required, intentionally excluded, or restored only for a controlled rehearsal. No choice is implied here.

## 9. Storage coverage review

Three layers remain separate:

1. **Storage database metadata:** bucket/object records that may appear in database artifacts.
2. **Storage buckets:** logical containers and configuration.
3. **Storage objects:** the actual file bytes, which database backup does not include.

Gate B must perform an approved aggregate-only inventory:

- bucket count;
- object count;
- total stored bytes when available without listing objects;
- no object name, path, owner identifier, or metadata value in output.

Decision rule:

- If object count is zero, the manifest may record that no physical object copy is currently required.
- If object count is greater than zero, Gate B stops before claiming a complete backup and opens a separate Storage Backup Gate.
- Storage metadata in `data.sql` never substitutes for physical object backup.

Because host `psql` is not installed, the exact aggregate-query execution method remains a Gate B prerequisite. It must be read-only, reviewed, and must not expose connection credentials. Installing a tool or using an alternative client is not authorized here.

## 10. Encryption review

### 10.1 Comparison

| Option | Authenticated-encryption assessment | Secret-entry behavior | Local availability | Decision |
| --- | --- | --- | --- | --- |
| `age` passphrase encryption | Uses an authenticated modern format and is suitable for a single encrypted archive | Interactive passphrase entry can avoid argv/history; recovery key or passphrase must be held separately | Not installed | **Recommended**, but Gate B remains blocked until installation/version/security behavior is separately authorized and verified. |
| GnuPG symmetric encryption | Can provide authenticated integrity protection when configured with an appropriate modern mode and version | Can prompt interactively; configuration must be frozen | Not installed | Backup option after separate verification. |
| macOS encrypted disk image | Provides OS-integrated encrypted-at-rest container and interactive password support | Password can be prompted without argv; recovery and cross-platform behavior need rehearsal | Installed | Secondary containment option, not the primary portable authenticated archive. |
| OpenSSL `enc` | Common and installed | Passphrase can be prompted, but ordinary `enc` workflows do not supply the desired authenticated-encryption guarantee | Installed | Rejected for the primary backup archive. |

### 10.2 Recommended encryption workflow

After a separately authorized installation/verification gate, use `age` to encrypt a single archive containing the exact artifacts and checksums. Passphrase or recipient key material must be entered interactively or obtained from an approved secret manager; it must not be placed in argv, shell history, scripts, Git, logs, or this conversation.

Required evidence before plaintext cleanup:

1. encrypted archive exists and is non-empty;
2. archive mode is owner-only;
3. decrypt into a new exact temporary directory without overwriting source artifacts;
4. verify every SHA-256 against the original manifest;
5. record only PASS/FAIL and redacted metadata;
6. ensure the recovery key/passphrase has an approved custodian independent of the encrypted file;
7. obtain explicit authorization for precise plaintext deletion.

No encryption was performed. Because no selected authenticated-encryption tool is currently verified and available, Production Backup Creation is `BLOCKED`.

## 11. Plaintext artifact handling

- Plaintext exists only inside the exact `0700` backup session directory.
- Each file is `0600` and never copied to a synchronized directory.
- No command prints SQL contents to the terminal.
- Structural scanners produce only relation names, counts, byte sizes, and PASS/FAIL summaries.
- Plaintext remains until the encrypted archive passes a complete decrypt-and-hash verification.
- Cleanup requires a separately authorized exact list of files under the validated session root.
- No recursive cleanup target may be `$HOME`, the Repository root, a parent temp directory, or a wildcard.
- A failed or interrupted encryption run preserves the plaintext under restricted permissions until a reviewed retry or explicit cleanup authorization.
- Secure deletion guarantees on SSD/APFS cannot be assumed; risk is reduced by minimizing plaintext lifetime and keeping it inside an encrypted volume or approved encrypted filesystem where possible.

## 12. Manifest design

Proposed redacted `manifest.json` fields:

```json
{
  "manifest_version": "1",
  "backup_id": "<BACKUP_TIMESTAMP>-<BACKUP_RANDOM_SUFFIX>",
  "source_environment": "Production",
  "source_identity": "redacted",
  "created_at_utc": "<UTC_TIMESTAMP>",
  "created_at_local": "<LOCAL_TIMESTAMP_WITH_OFFSET>",
  "supabase_cli_version": "2.115.0",
  "postgresql_source_version": "<REDACTED_VERSION_ONLY>",
  "command_categories": [],
  "artifacts": [],
  "auth_coverage": {
    "status": "unknown",
    "relations_checked": [],
    "fk_coverage": "not_checked"
  },
  "storage_coverage": {
    "metadata": "not_checked",
    "bucket_count_status": "not_checked",
    "object_count_status": "not_checked",
    "physical_objects_backed_up": false
  },
  "migration_history": {
    "status": "not_checked",
    "expected_versions": "001-006"
  },
  "encryption": {
    "status": "not_started",
    "format": "<APPROVED_FORMAT>"
  },
  "restore_rehearsal": {
    "status": "not_started"
  },
  "run_status": "created",
  "verified_at_utc": null,
  "failed_at_utc": null,
  "known_limitations": []
}
```

Each artifact entry contains only:

- approved filename;
- byte size;
- SHA-256;
- dump command category without arguments containing credentials;
- sensitivity classification;
- created/verified/failed state.

The manifest excludes connection strings, project refs, hosts, Emails, UUIDs, passwords, tokens, keys, raw SQL, row values, and remote URLs.

## 13. Sensitive-information scanning design

Scanning happens before encryption and again on all retained reports, but it must not echo matching content.

Required scan categories:

- database URL schemes and host patterns;
- password/token/key assignment patterns;
- JWT-like values;
- complete Email addresses;
- Auth/business UUID patterns;
- project-ref patterns;
- accidental SQL row output in logs;
- Repository path containment.

Only aggregate match counts and affected artifact classifications may be reported. A positive result stops the gate and restricts the affected file; it is not printed for debugging.

Production `data.sql`, Auth artifacts, and encrypted archives are expected to contain sensitive data by design. They are not “sanitized” by a zero-match report and must always receive the highest handling classification.

## 14. Gate B stop conditions

Production Backup Creation stops immediately if any condition occurs:

1. remote identity cannot be confirmed without exposing it;
2. remote migration history is not exactly 001–006 immediately before backup;
3. output resolves inside the Repository or through a symlink into it;
4. available disk is insufficient for plaintext, encrypted copy, decrypt verification, and logs;
5. Supabase CLI version differs from 2.115.0 without a fresh flag review;
6. credentials may enter argv, shell history, public logs, or reports;
7. a dump command may write to Production;
8. any artifact is empty, incomplete, overwritten, or generated by a failed command;
9. Auth coverage cannot be checked without exposing row content;
10. public foreign-key-required Auth data is missing;
11. Auth identities or required confirmed-email state are incomplete;
12. Storage object count is greater than zero without an approved Storage Backup Gate;
13. artifact hashing or manifest generation fails;
14. sensitive content is written into the Repository or a public report;
15. no verified authenticated-encryption tool is available;
16. encryption cannot be decrypted and hash-verified;
17. plaintext cannot be retained safely or precisely cleaned later;
18. a credential temp file cannot be constrained to and removed from the exact session root;
19. official CLI output contradicts the approved coverage assumptions;
20. the operator would need to use `--password`, an expanded `--db-url`, `--debug`, or an unreviewed workaround.

## 15. Inputs required for the later local restore

A Fresh Isolated Restore Rehearsal cannot begin until it receives:

- verified encrypted archive;
- verified manifest and checksums;
- roles, schema, data, and migration-history artifacts;
- conditional Auth artifacts if the default data artifact is insufficient;
- Storage-object backup or verified zero-object evidence;
- source PostgreSQL/Supabase version inventory;
- documented Auth/session decision;
- documented restore order and trigger/FK handling;
- exact expected v1 table counts and migration history;
- approved isolated project ID/ports and enough disk space;
- no remote link, environment file, or Production credential.

## 16. Remaining unknowns for Production Backup Creation

1. Exact remote identity and migration history at action time.
2. Whether CLI 2.115.0 default `--data-only` includes `auth.users`, `auth.identities`, and other required Auth relations.
3. Whether explicit `--schema auth` is required and safely restorable into the chosen target.
4. Whether session and refresh-token relations should be included.
5. The source PostgreSQL and managed Auth/Storage service versions.
6. Aggregate database size and exact disk requirement.
7. Aggregate Storage bucket/object counts and whether a separate object backup is required.
8. A reviewed read-only aggregate-query method, since host `psql` is unavailable.
9. Whether linked interactive/native credential handling works without exposing secrets for every planned command.
10. Whether `PGPASSFILE` can be safely passed through the CLI's container boundary if a fallback is needed.
11. Installation and verification of `age`, or approval of another authenticated-encryption tool.
12. Encryption-key/passphrase custody and recovery process.
13. Approved retention period and precise plaintext cleanup authority.
14. Restore compatibility and the exact behavior of Auth lifecycle triggers during data import.

## 17. Gate conclusion

| Gate | Decision | Reason |
| --- | --- | --- |
| Backup Command Dry-run Review | `PARTIAL` | Artifact categories, command templates, flags, credential policy, paths, permissions, Auth/Storage checks, manifest, and stop conditions are defined. The preferred authenticated-encryption tool is not installed, linked credential behavior is not yet verified, host `psql` is absent, and Auth coverage remains intentionally unproven. |
| Production Backup Creation | `BLOCKED` | It may be reconsidered only after authenticated-encryption tooling and credential handling are verified, a safe aggregate-query method exists, and action-time authorization is granted. |
| Fresh Isolated Restore Rehearsal | `BLOCKED` | No complete encrypted Production artifact set exists. |
| Remote Supabase Apply | `BLOCKED` | Backup creation and fresh restore rehearsal have not passed. |

### Recommended next gate

Do not authorize Production Backup Creation yet. First perform a narrow **Backup Prerequisite Resolution Gate** that:

1. installs or verifies an approved authenticated-encryption tool under explicit authorization;
2. verifies linked interactive/native credential behavior without connecting to Production data or exposing credentials;
3. selects a reviewed aggregate-only query mechanism for Auth and Storage coverage;
4. freezes the exact Gate B command list and encryption/decryption verification procedure.

After those prerequisites pass, Production Backup Creation still requires a separate action-time authorization. This document does not authorize Remote Supabase access, a dump, a backup, a restore, Migration 007 apply, App changes, or deployment.

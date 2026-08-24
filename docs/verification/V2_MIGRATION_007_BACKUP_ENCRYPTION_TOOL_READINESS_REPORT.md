# Migration 007 Backup Encryption Tool Readiness Report

- Status: Local tool readiness verification
- Date: 2026-08-24
- Scope: Homebrew stable `age` installation and ephemeral local self-test only
- Production data used: No
- Supabase connection, dump, backup, restore, migration apply, or deployment performed: No

## 1. Git baseline

The gate began with the required clean Repository state:

- branch `codex/v2-proposed-pivot`;
- HEAD `b7bc683eda9fb97f2b08f218b0b576f1db577145`;
- upstream `origin/codex/v2-proposed-pivot`;
- ahead 0, behind 0;
- clean working tree;
- `main` remained `de522762bf272599b12b822ec096a0d0768f624a`;
- Formal Migration 007 SHA-256 remained `84007ccc2e5c16246435a1186e6123951f805bc383725504612d67e3dfbf1389`.

No Migration, App, harness, or prior evidence file was modified.

## 2. Homebrew preflight

| Check | Result |
| --- | --- |
| Homebrew executable | Present under the arm64 Homebrew prefix |
| Homebrew version | `6.0.18` |
| Host architecture | `arm64` |
| Formula source | Official `homebrew-core` formula |
| Formula channel | Stable bottled release |
| Stable version offered | `1.3.1` |
| `age` before gate | Not installed |
| sudo or administrator password required | No |
| system security settings changed | No |
| Homebrew update or broad upgrade performed | No |

The read-only `brew info age` command displayed the official stable formula information, then the sandbox denied an attempted Homebrew cache-directory write. This did not install or modify a formula. Installation proceeded only through the separately authorized stable formula command.

## 3. Installation

The authorized command category was:

```text
HOMEBREW_NO_AUTO_UPDATE=1 brew install age
```

Result:

- installation succeeded from the Homebrew stable arm64 bottle;
- installed formula: `age` only;
- installed version: `1.3.1`;
- additional formula dependencies installed: none;
- source build, `--HEAD`, beta build, sudo, shell-profile changes, PATH changes, `brew update`, or `brew upgrade`: none.

Homebrew automatically ran its formula-scoped post-install cleanup for `age`. No separate `brew cleanup`, broad cleanup, autoremove, or evidence cleanup command was run. The automatic behavior did not remove another formula or Repository artifact according to the command output.

## 4. Binary and architecture verification

| Check | Result |
| --- | --- |
| `age` command | Present |
| `age-keygen` command | Present |
| `age --version` | `v1.3.1` |
| `age-keygen --version` | `v1.3.1` |
| Homebrew installed version | `age 1.3.1` |
| `age` binary architecture | Mach-O 64-bit arm64 |
| `age-keygen` binary architecture | Mach-O 64-bit arm64 |
| macOS arm64 compatibility | PASS |

No private identity or complete recipient value was printed or retained in this report.

## 5. Ephemeral encryption self-test

The test used a unique `mktemp -d` directory outside the Repository with a name matching `backup-heart-age-test.*`.

Preconditions:

- `umask 077` was set before file creation;
- the physical path was confirmed outside the Repository;
- the directory was not a symbolic link;
- directory mode was `0700`;
- test-file modes were `0600`;
- content was one fixed, entirely fictional readiness-test string;
- no Repository, Supabase, Production, personal, Auth, or care data was used.

Test sequence and results:

| Test | Result |
| --- | --- |
| Create fictional plaintext | PASS |
| Generate one ephemeral identity | PASS |
| Derive recipient without reporting its value | PASS |
| Encrypt with recipient | PASS |
| Encrypted artifact exists and is non-empty | PASS |
| Encrypted artifact differs from plaintext | PASS |
| Decrypt with matching identity | PASS |
| Original/decrypted byte comparison | PASS |
| Original/decrypted SHA-256 comparison | PASS |

The SHA-256 values themselves are intentionally omitted. Only equality was recorded.

## 6. Fail-closed verification

Two negative tests were performed:

| Negative test | Expected | Result |
| --- | --- | --- |
| Decrypt with a different ephemeral identity | Non-zero exit and no usable plaintext | PASS |
| Decrypt without a matching identity | Non-zero exit and no usable plaintext | PASS |

No error output containing identity or recipient material was retained.

## 7. Ephemeral secret cleanup

Before cleanup, the gate revalidated that the test root:

- was non-empty;
- matched the dedicated test-directory naming pattern;
- was outside the Repository;
- was not `/`;
- was not the user home directory;
- was not a symbolic link.

Cleanup used exact file paths for only this run's known files. It did not use recursive deletion, wildcard cleanup, global temporary-directory cleanup, Homebrew cleanup, Docker cleanup, or evidence cleanup.

Deleted ephemeral items:

- matching identity;
- wrong identity;
- fictional plaintext;
- encrypted test artifact;
- decrypted test artifact;
- failed-decryption outputs, if created;
- the now-empty dedicated test directory via `rmdir`.

Post-cleanup verification:

- ephemeral identities absent: PASS;
- plaintext absent: PASS;
- encrypted/decrypted artifacts absent: PASS;
- dedicated test directory absent: PASS;
- existing Local Dry-run evidence and Docker volumes untouched: PASS.

## 8. Production-data and long-term-secret boundary

This gate proves only that the installed `age` binary can encrypt and decrypt local fictional data, detect use of a wrong identity, and operate on this macOS arm64 host.

It does not decide or validate:

- whether Production backup encryption will use passphrase mode or recipient-key mode;
- who will be the recovery-secret custodian;
- whether a second recovery holder is required;
- how a long-term identity or passphrase will be generated;
- how recovery material will be stored, rotated, tested, or revoked;
- whether Keychain, removable storage, or another secret manager is appropriate;
- how encrypted backup retention and deletion will work;
- whether the encrypted Production archive can be restored.

No Production backup identity, long-term private key, formal passphrase, Keychain item, cloud secret, or Repository key was created. The user was not asked to provide a passphrase in conversation.

## 9. Remaining blockers

Before Production Backup Creation can be authorized:

1. Choose passphrase mode or recipient-key mode.
2. Define recovery-secret generation without exposing it in argv, history, logs, Git, or conversation.
3. Define primary and recovery custodianship.
4. Define secure persistent storage and offline recovery procedure.
5. Rehearse archive encryption, decryption, and hash verification with a non-Production fixture using the selected long-term operating procedure.
6. Define plaintext lifetime and exact cleanup authorization.
7. Resolve linked credential handling and aggregate-only Auth/Storage inspection from the Backup Command Review.
8. Verify actual Auth dump coverage and Storage object count during the separately authorized backup gate.

## 10. Gate conclusion

| Gate | Decision | Reason |
| --- | --- | --- |
| Encryption Tool Installation | `PASS` | Official Homebrew stable arm64 bottle `age` 1.3.1 installed without additional dependencies or system-security changes. |
| Ephemeral Encryption Self-test | `PASS` | Encrypt/decrypt, byte equality, SHA-256 equality, and two fail-closed cases passed using fictional data. |
| Encryption Tool Readiness | `PASS` | The local tool and binary behavior are ready for a separately designed backup-key workflow. |
| Production Key Handling | `BLOCKED` | Mode, key generation, custody, recovery, retention, and rotation remain undecided and untested. |
| Production Backup Creation | `BLOCKED` | Key handling plus credential, Auth coverage, and Storage prerequisites remain unresolved. |
| Fresh Restore Rehearsal | `BLOCKED` | No approved Production backup artifact exists. |
| Remote Apply | `BLOCKED` | Backup and restore evidence is incomplete. |

The next eligible gate is **Production Backup Key Handling Decision Gate**. It requires a separate authorization and must not create a real Production identity or ask for a secret in conversation during design review.

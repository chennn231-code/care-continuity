# Migration 007 Formal Release Candidate Verification Report

- Status：Local formal release candidate verification
- Date：2026-08-24
- Branch：`codex/v2-proposed-pivot`
- Baseline HEAD：`48da5025216821b0dcdf8a94b90536239060355f`
- Remote Supabase：未連線、未操作
- Production：未部署、未驗證

## Release candidate identity

| Artifact | Path | SHA-256 |
| --- | --- | --- |
| Verified SQL Draft | `docs/sql-drafts/007_v2_access_foundation_draft.sql` | `84007ccc2e5c16246435a1186e6123951f805bc383725504612d67e3dfbf1389` |
| Formal Migration 007 | `supabase/migrations/20260824220000_v2_access_foundation.sql` | `84007ccc2e5c16246435a1186e6123951f805bc383725504612d67e3dfbf1389` |

Promotion integrity：

- Byte comparison：PASS
- File size：兩者皆 77,811 bytes
- Line count：兩者皆 2,043 lines
- SHA-256 comparison：PASS
- 正式檔沒有新增 header、修改註解、重新排版或改變 encoding

目前驗證結果只適用於上述 SHA-256。任何內容變更都必須形成新的 hash，並重新執行完整 fresh verification

## Migration 001–006 non-regression hashes

| Migration | SHA-256 |
| --- | --- |
| `20260823022521_remote_schema.sql` | `64d3cdd9047c7a716dd031a51d1e55cdeef6b2ab7bc4409887e4c864fa493361` |
| `20260823030000_ownership_and_integrity.sql` | `8b165af587111b1e961b55b5ec6836b9a5a3186a758198204c0aa05d8da3a7e6` |
| `20260823040000_auth_identity_lifecycle.sql` | `4618316d35a014ace64457fc6ace15a242032901cacd678af95e3f120e04e70b` |
| `20260823050000_rls_and_access_control.sql` | `7f8234ee1377d9b0a89fce5f07b6163d5da7dd2fbe17facb7a05d22b08f6bf40` |
| `20260823060000_backup_assignment_semantics.sql` | `c5b673b56adeb8a7440b4de5cc828aca7931c4a56e2eb117c33587df293d2209` |
| `20260823070000_task_handoffs.sql` | `fa10edfae8327e942e75238b771f8f2151bc87f14a9f5e44e33f9e7cf26c5f08` |

六份 hash 與既有 Local Dry-run Report 完全一致，未修改 Migration 001–006

## Repository harness

單一執行入口：

```sh
scripts/verification/verify-v2-access-foundation-local.sh
```

Runner 啟動前會：

1. 要求 Draft 與 Formal Migration 同時存在
2. 驗證兩者 SHA-256 均符合固定候選值
3. 執行 byte-for-byte comparison
4. 要求正式 migration directory 正好包含 Migration 001–007
5. 只把正式 Migration 001–007 複製到全新隔離環境

Runner 不再將 Draft 政名或當成臨時 Migration 007

## Fresh isolated environment

- Project id：`cc-v2-007-rc-20260824141640-6608`
- Ports：`58320–58329`
- Seed：disabled
- Telemetry：disabled
- 全新 `mktemp -d` root
- 全新 containers、database 與 volumes
- 未使用 `.env`、`.env.local`、`.temp`、remote link、先前 volumes 或先前 database
- 未連線 Remote Supabase
- 實際受測來源：`supabase/migrations/20260824220000_v2_access_foundation.sql`

## Fresh apply and test result

- Migration 001–007 fresh apply：PASS
- Migration history：7

| Outcome | Count |
| --- | ---: |
| PASS | 71 |
| FAIL | 0 |
| SKIP | 0 |
| BLOCKED | 0 |

成功執行 exit code：0

## True two-session concurrency

- 兩個獨立 database sessions 同時互相撤銷管理者
- Session A exit：3
- Session B exit：0
- 一筆 transaction commit，另一筆經 Case row serialization 後拒絕
- 最終至少保留一位有效管理者
- 失敗 transaction 未留下部分 Membership、Grant 或 Access Event

## Security inventory

| Item | Result |
| --- | ---: |
| v1 tables | 10 |
| v1 policies | 38 |
| v2 tables | 7 |
| v2 policies | 5 |
| v2 functions | 17 |
| SECURITY DEFINER／INVOKER | 11／6 |
| RLS enabled／forced | 7／7 |
| Unexpected PUBLIC EXECUTE | 0 |
| Definer missing fixed empty search_path | 0 |
| anon／authenticated direct write privilege | 0 |
| Function owner superuser | false |
| Function owner BYPASSRLS | true |

Confirmed Email boundary、Invitation replay／expiry／revocation、撤銷後舊 JWT context、Access Event append-only、last-manager concurrency、A／B／C isolation 與多重 grant path 不可拼接均通過。未發現跨個案權限外洩

`FORCE ROW LEVEL SECURITY` 不被視為限制具 `BYPASSRLS` owner 的 Definer。高權限 RPC 仍依輸入驗證、`auth.uid()` actor binding、固定空 `search_path`、最小 ACL、Case row locking 與 transaction atomicity 維持安全邊界

## Failure exit-code verification

執行：

```sh
scripts/verification/verify-v2-access-foundation-local.sh --self-test-failure-exit-code
```

結果：非零 exit code `1`

Runner 亦會在 Draft／Formal mismatch、hash mismatch、migration apply failure、任一 FAIL／BLOCKED、測試數量不符、基礎設施錯誤或 stack stop failure 時 fail closed

## Sensitive information scan

- Repository 新增／修改內容：未發現 local key、JWT、password、connection string、token 或真實 Email
- 本輪成功 evidence logs：敏感內容 matches = 0
- Fixture identities 與 Email：全部明確虛構，使用 `.invalid`
- Supabase startup credentials payload 在寫入 log 前即被過濾
- 本報告不包含 project ref、Remote URL 或可重用的臨時憑證

## Stop and evidence retention

- Stack stop：PASS
- 使用一般 `supabase --workdir <temp-root> stop`
- 未使用 `--all` 或 `--no-backup`
- 本輪 containers 已停止
- 三個本輪 volumes 保留
- Temp directory、logs、summary、inventory 與 71-test details 保留於本機臨時證據目錄
- Round 1、Round 2、Repository Harness Gate 及其失敗嘗試 evidence 均未清除

本機臨時證據目錄可能由作業系統日後清理。本文件是長期保存的去敏摘要，不包含啟動秘密或完整測試 Email

## Remaining remote gates

- Remote migration history：未查驗
- Remote v1 10 tables／38 policies 與 row counts：未查驗
- Remote Auth schema／version：未查驗
- Remote migration owner／role attributes：未查驗
- Remote backup／PITR／restore readiness：未查驗
- Remote apply maintenance window：未決定
- Remote post-apply smoke tests：尚未執行
- Remote Supabase Apply：BLOCKED，必須另取明確 action-time 授權

## Gate conclusion

- Draft-to-Formal byte-for-byte promotion：PASS
- Formal Migration 001–007 fresh apply：PASS
- Repository harness formal-file verification：PASS
- 71-test security regression：PASS
- Migration 007 Formal Release Candidate Promotion & Fresh Verification Gate：PASS
- Remote Supabase Preflight：尚未開始
- Remote Supabase Apply：BLOCKED

本 Gate 通過只建立本機 Release Candidate，不授權 remote preflight、remote apply、App routes、部署、commit 或 push

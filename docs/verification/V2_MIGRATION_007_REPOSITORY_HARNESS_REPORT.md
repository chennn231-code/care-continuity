# Migration 007 Repository Test Harness Verification Report

- Status：Local Repository harness verification
- Date：2026-08-24
- Branch：`codex/v2-proposed-pivot`
- HEAD baseline：`48da5025216821b0dcdf8a94b90536239060355f`
- Remote Supabase：未連線、未操作
- 正式 Migration 007：已由後續 Release Candidate Promotion Gate 以 byte-for-byte 方式建立，正式檔仍須重新驗證

## Harness entrypoint

唯一執行入口：

```sh
scripts/verification/verify-v2-access-foundation-local.sh
```

失敗 exit-code 自我檢查：

```sh
scripts/verification/verify-v2-access-foundation-local.sh --self-test-failure-exit-code
```

自我檢查實際回傳 exit code `1`。正式 runner 也會在 migration apply failure、test infrastructure failure、任一 FAIL／BLOCKED、測試總數不符或 stack stop failure 時回傳非零

## Isolation and evidence

- 使用 `mktemp -d` 建立全新臨時 root
- Project id：`cc-v2-007-20260824140414-5979`
- Ports：`57320–57329`
- Seed：disabled
- Telemetry：disabled
- 本報告記錄的是正式 Migration 建立前的 Harness Gate 執行；當次精確複製 Repository `supabase/config.toml`、Migration 001–006、SQL Draft 與去敏 fixtures
- 後續 Release Candidate Gate 已將 runner 改為先比較 Draft／Formal bytes 與 hash，再精確複製正式 Migration 001–007
- 未複製 `.env`、`.env.local`、`.temp`、remote link、真實資料或既有 database volume
- Stack 已使用一般 `supabase --workdir <temp-root> stop` 正常停止
- 未使用 `--all`、`--no-backup` 或 Docker cleanup
- 三個本輪 volumes、臨時目錄與 logs 保留供審查
- 成功證據目錄只保留於本機臨時空間，未提交 Repository
- 證據 logs 敏感字串掃描結果：0 個含 bootstrap key、JWT、connection string、token 或完整 Email 的 log

## Fresh migration apply

- Migration 001–006 clean apply：PASS
- 臨時 Migration 007 parse／apply：PASS
- Migration history：7
- SQL Draft SHA-256：`84007ccc2e5c16246435a1186e6123951f805bc383725504612d67e3dfbf1389`

## Test result

| Outcome | Count |
| --- | ---: |
| PASS | 71 |
| FAIL | 0 |
| SKIP | 0 |
| BLOCKED | 0 |

這是 Repository harness 在本輪全新隔離環境獨立計算的結果，不是複製 Round 2 summary

## Security inventory

| Item | Result |
| --- | ---: |
| v1 tables | 10 |
| v1 policies | 38 |
| v2 tables | 7 |
| v2 policies | 5 |
| v2 functions | 17 |
| SECURITY DEFINER／INVOKER | 11／6 |
| Unexpected PUBLIC EXECUTE | 0 |
| Definer without fixed empty search_path | 0 |
| v2 RLS enabled／forced | 7／7 |
| anon／authenticated direct write privilege | 0 |
| Function owner | `postgres` |
| owner superuser | false |
| owner BYPASSRLS | true |

未發現 A／B／C 跨個案權限外洩。Confirmed Email、Invitation token binding／replay／expiry／revocation、Auth delete SET NULL、撤銷後舊 JWT、grant path 不可拼接、DRAFT tombstone、Access Event append-only 與 direct-write denial 均包含於 71 項結果

## True two-session concurrency

- 使用兩個獨立 `psql` database sessions 同時互相撤銷管理者
- Session A exit：0
- Session B exit：3
- 一筆 transaction commit，另一筆在 Case row serialization 後拒絕
- 最終仍保留一位有效管理者
- 只存在成功 operation 的 Access Event
- 失敗 transaction 未留下部分 Membership、Grant 或 Event 狀態

## Harness implementation findings

正式成功執行前發現兩項 Repository harness 問題，均未修改 SQL Draft：

1. 初版動態 project id 過長，被 Supabase CLI 截斷，runner 因而無法定位 DB container。Migration 001–007 當次已成功，但功能測試未開始；stack 正常停止。Runner 改用安全長度的唯一 project id
2. 去敏 fixture 將 Auth Email 改為 `HARNESS`，但一筆 Invitation recipient 仍殘留 `R2`。SQL 正確拒絕 Email 不符的接受操作。只修正虛構 fixture 的一致性，之後從另一個全新 stack 完整重跑

上述均為 harness infrastructure／fixture 問題，不是 Migration 007 SQL 缺陷，也未降低任何 assertion

## Temporary harness disclosure

Round 2 曾發現 temporary harness 對 PostgreSQL `void` function 使用 `IS NULL` 的錯誤斷言。函式當時實際執行成功，只修正臨時測試工具，Repository SQL 沒有因此修改

正式 Repository harness 的 `core.sql` 先直接執行 `void` helper，再以「未拋出 exception」記錄 PASS，不再使用錯誤的 `IS NULL` 判斷。此事件是測試工具缺陷，不是 Migration 007 SQL 缺陷

## Scope confirmation

- SQL Draft 未修改
- Migration 001–006 未修改
- 本報告原始 Harness Gate 執行時正式 migration directory 只有 001–006
- 後續 Release Candidate Promotion 另行建立正式 Migration 007，不改寫本報告的原始測試事實
- 未操作 Remote Supabase
- 未修改 App 或 App tests
- 未 commit、push 或部署
- 未清除 Round 1、Round 2 或本輪 evidence

## Gate conclusion

- Repository harness implementation：PASS
- Fresh isolated Migration 001–007 apply：PASS
- Repository harness verification：PASS（71／71）
- Formal Migration 007：已進入 Release Candidate Promotion，須以更新後 harness 重新 fresh verify
- Remote Supabase Apply：BLOCKED

下一個 Gate 才可依 Release Review 的 byte-for-byte promotion 規則建立正式 Migration 007，並必須再由本 harness 對正式 migration directory 進行全新隔離驗證

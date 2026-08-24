# 備份心 v2 Migration 007 Access Foundation 本機 Dry-run 驗證報告

## 文件狀態

- 文件類型：Local verification report
- 執行日期：2026-08-24
- 報告產生時間：2026-08-24 21:33:18 CST（Asia/Taipei）
- 測試分支：`codex/v2-proposed-pivot`
- 測試時 Repository HEAD 基線：`e1a1ecfc5fdcffd7e60efdcce17c57eb3645b22e`
- 測試使用的 SQL Draft：`docs/sql-drafts/007_v2_access_foundation_draft.sql`
- SQL Draft SHA-256：`84007ccc2e5c16246435a1186e6123951f805bc383725504612d67e3dfbf1389`
- 驗證範圍：隔離的 Local Supabase 環境
- 本報告不代表遠端 Supabase 或 Production 已完成驗證
- SQL Draft 尚未移入正式 migration directory，尚未形成正式 Migration 007

## 測試環境

- 作業系統／架構：macOS／arm64
- Supabase CLI：`2.115.0`
- Docker Engine：`29.6.2`
- Seed：disabled
- Round 2 隔離 project id：`care-continuity-v2-007-dryrun-r2`
- Round 2 隔離 ports：`56320–56329`
- Migration chain：Migration 001–006 加臨時 Migration 007，自空白資料庫 fresh apply
- 未使用 Repository remote link
- 未讀取或複製 `.env`、`.env.local` 或其他環境變數檔
- 未使用真實帳號、真實 Email 或真實照顧資料
- 未連線遠端 Supabase

本報告不記錄 local keys、JWT secret、database password、connection string、token、完整測試 Email、project ref 或遠端 URL

## Round 1 缺陷發現基線

Round 1 結果：

- PASS：65
- FAIL：3
- BLOCKED：3
- A／B／C 跨個案權限外洩：未發現

Round 1 找到三項實作缺陷：

1. 新受邀帳號在接受 Invitation 前尚無 Actor Reference，但接受流程過早要求 Actor 已存在
2. Membership revoke RPC 含有未以合法 PL/pgSQL 方式消費結果的 locking `SELECT`
3. Admin transfer 在目標管理者已有有效 grant 時仍嘗試新增第二筆相同 active grant

Round 1 僅作為缺陷發現與修正基線，不視為 Local Dry-run 通過

## Round 1 後的修正

- Invitation 驗證通過後，才在同一 transaction 建立或取得新受邀者 Actor Reference
- Actor、Membership、Grant、Invitation accepted 狀態與 Access Events 原子寫入，任一步失敗全部 rollback
- Membership revoke 改用合法且明確的 row lock，並在鎖定後重新檢查權限、狀態及最後管理者條件
- Admin transfer 鎖定並重用目標管理者既有有效 `CASE_ADMIN` grant，不重複建立 grant
- 新增 partial unique invariant，防止同一 Membership 出現重複且未終止的相同 active grant path
- DRAFT hard delete 先建立去敏的 `DRAFT_ABANDONED` tombstone，Case 刪除後只保留歷史 target identifier
- 修正 `SECURITY DEFINER` 安全模型，不依賴 FORCE RLS 約束具 `BYPASSRLS` 的函式 owner
- Definer 安全邊界固定為完整輸入驗證、從 `auth.uid()` 重新取得 Actor、空 `search_path`、schema-qualified objects、最小 EXECUTE ACL、Case row lock 與原子 transaction

## Round 2 Fresh Isolated Dry-run

- Migration 001–007 fresh apply：PASS
- PASS：71
- FAIL：0
- SKIP：0
- BLOCKED：0
- 三項 defect regression：全部 PASS
- 最後一位管理者 guard：PASS
- 真正兩個獨立 database sessions 的管理者互撤競態：PASS
- 競態結果：一筆 transaction commit，另一筆經 Case row serialization 後拒絕
- 最終狀態：仍保留一位有效協作管理者
- 失敗 transaction：未留下部分 Membership、Grant 或 Access Event 狀態
- 重複 active grant：未發現，partial unique invariant 可拒絕重複建立
- A／B／C 跨個案權限外洩：未發現

## Security Inventory

| 項目 | 驗證結果 |
| --- | ---: |
| v1 tables | 10 |
| v1 policies | 38 |
| v2 tables | 7 |
| v2 policies | 5 |
| v2 functions | 17 |
| SECURITY DEFINER／SECURITY INVOKER | 11／6 |
| Function owner | `postgres` |
| owner `rolsuper` | `false` |
| owner `rolbypassrls` | `true` |
| Definer 缺少固定空 `search_path` | 0 |
| 未預期 PUBLIC EXECUTE | 0 |
| anon／authenticated direct write privilege | 0 |
| v2 RLS enabled／forced | 7／7 |

`FORCE ROW LEVEL SECURITY` 是一般 direct table access 的防線，不被視為限制具 `BYPASSRLS` owner 的高權限 definer。所有高權限函式仍依自身輸入驗證、actor binding、locking、transaction 與最小 ACL 維持安全邊界

## Harness Disclosure

Round 2 執行途中曾發現測試 harness 將成功執行但回傳 `void` 的 helper 以 `IS NULL` 作為判斷，造成錯誤斷言

- 函式本身實際執行成功
- 問題屬臨時測試 harness，不是產品或 SQL Draft 缺陷
- 只修正第二輪臨時目錄內的 harness
- Repository SQL 未因該斷言修改
- 修正後重新彙整完整測試證據，最終 71 項全部判定 PASS

## 限制與未驗證範圍

- Migration apply 故障注入：Deferred
- Production destructive down migration：Not Applicable／Deferred
- Remote backup／restore readiness：未驗證
- 遠端 migration history：未重新驗證
- 遠端 10 tables／38 policies：未重新驗證
- Production Auth settings：未重新驗證
- Remote Supabase Apply Gate：Blocked
- SQL Draft 尚未移入正式 migration directory
- 尚未執行完整 App 測試
- Coverage Engine 文件與實作的版本落差仍待處理
- 本機函式 owner 行為已驗證，不可直接推定遠端 migration owner 與 ACL 完全相同

## Evidence Integrity

### SQL Draft

| 檔案 | SHA-256 |
| --- | --- |
| `docs/sql-drafts/007_v2_access_foundation_draft.sql` | `84007ccc2e5c16246435a1186e6123951f805bc383725504612d67e3dfbf1389` |

### Migration 001–006

| Migration | SHA-256 |
| --- | --- |
| `20260823022521_remote_schema.sql` | `64d3cdd9047c7a716dd031a51d1e55cdeef6b2ab7bc4409887e4c864fa493361` |
| `20260823030000_ownership_and_integrity.sql` | `8b165af587111b1e961b55b5ec6836b9a5a3186a758198204c0aa05d8da3a7e6` |
| `20260823040000_auth_identity_lifecycle.sql` | `4618316d35a014ace64457fc6ace15a242032901cacd678af95e3f120e04e70b` |
| `20260823050000_rls_and_access_control.sql` | `7f8234ee1377d9b0a89fce5f07b6163d5da7dd2fbe17facb7a05d22b08f6bf40` |
| `20260823060000_backup_assignment_semantics.sql` | `c5b673b56adeb8a7440b4de5cc828aca7931c4a56e2eb117c33587df293d2209` |
| `20260823070000_task_handoffs.sql` | `fa10edfae8327e942e75238b771f8f2151bc87f14a9f5e44e33f9e7cf26c5f08` |

Round 1 與 Round 2 的完整 logs、測試 harness、inventory 及 concurrency evidence 只保留於本機臨時目錄，未提交 Repository。臨時目錄可能由作業系統日後清理，因此本報告作為長期保存的去敏摘要，不取代原始執行證據

## Gate 判定

- Migration 007 Access Foundation Static SQL Draft Review：PASS
- Migration 007 Access Foundation Isolated Local Dry-run：PASS
- 正式 migration release review：尚未開始
- Remote Supabase Apply：BLOCKED

在取得後續 Gate 授權前，不得將 SQL Draft 移入正式 migration directory，也不得操作遠端 Supabase

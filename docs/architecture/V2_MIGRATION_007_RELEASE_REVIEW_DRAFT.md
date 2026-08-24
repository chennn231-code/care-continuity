# 備份心 v2 Migration 007 Access Foundation Release Review

- Status：`PROPOSED DRAFT`
- Review date：2026-08-24
- Scope：Release candidate promotion、可重跑驗證、remote preflight 與 recovery 設計
- 本文件不建立正式 Migration 007，不操作 Local／Remote Supabase，也不代表 Production 已驗證

## 1. Release candidate identity

| 項目 | 固定值 |
| --- | --- |
| Branch | `codex/v2-proposed-pivot` |
| Commit | `d911461e823ba0402947a4dc36ec5db783e098cb` |
| SQL Draft | `docs/sql-drafts/007_v2_access_foundation_draft.sql` |
| SQL Draft SHA-256 | `84007ccc2e5c16246435a1186e6123951f805bc383725504612d67e3dfbf1389` |
| Local verification report | `docs/verification/V2_MIGRATION_007_LOCAL_DRY_RUN_REPORT.md` |
| Local environment | macOS／arm64、Supabase CLI 2.115.0、Docker Engine 29.6.2、隔離 project 與 ports、Seed disabled |
| Fresh apply | Migration 001–006 加臨時 Migration 007 |
| Test result | 71 PASS／0 FAIL／0 SKIP／0 BLOCKED |

只有上述 SHA-256 的 SQL 內容通過目前記錄的 71 項本機驗證。任何空白、註解、header 或 SQL 內容變更都會形成新的候選內容，必須重新計算 SHA-256，並在全新隔離資料庫重跑完整 migration chain 與全部測試。不得把目前的 71／71 結果轉用到不同 hash

本次結果只證明隔離 Local Supabase 的可重現行為，不證明遠端 migration owner、Auth schema、既有資料、backup readiness、Production Auth settings 或遠端安全狀態

## 2. 正式 Migration 候選命名

### 單一推薦

推薦正式候選檔名：

`20260824220000_v2_access_foundation.sql`

理由：

- timestamp 晚於且不重複現有 `20260823022521` 至 `20260823070000`
- 名稱直接表示 `v2_access_foundation`
- timestamp 代表正式 release-candidate promotion checkpoint 的建立時間，不改寫既有 migration chain
- migration timestamp 一經建立並進入 release candidate commit 後不得因實際 remote apply 時間較晚而重新命名

升格時採 **byte-for-byte copy**。正式檔不得另加 header、改換行、整理格式或修改註解。Draft 已包含草案警示，而保留這些註解不影響 SQL 執行，且可維持已驗證 bytes 的證據鏈

若產品端要求正式檔移除草案 header、改名以外還要改內容，該檔即為新的 release candidate：必須停止升格、重新計算 hash、更新驗證識別並在全新隔離環境重跑完整測試

## 3. Draft promotion integrity

正式升格 Gate 必須依序完成：

1. 確認 branch、HEAD、upstream 與 clean working tree
2. 確認正式 migration history 只有 001–006，且候選 timestamp 未被使用
3. 重新計算 Draft SHA-256，必須等於本文件固定值
4. 使用不改變 bytes 的檔案複製方式建立唯一正式候選檔
5. 使用 byte comparison 驗證 Draft 與正式 Migration 完全相同
6. 分別計算兩檔 SHA-256，結果必須相同
7. 確認 Git diff 只新增一份正式 Migration，以及另行授權的 verification harness
8. 重新計算 Migration 001–006 SHA-256，與既有驗證報告逐筆比較
9. 執行 `git diff --check`
10. 從全新隔離資料庫套用正式 migration directory，不再將 Draft 臨時複製為 007
11. 使用 Repository harness 重跑全部測試
12. 只有正式檔的 fresh apply 與測試全部通過，才能建立 release candidate commit

避免內容漂移的必要措施：

- 不使用文字編輯器另存正式 SQL
- promotion 後以 byte comparison 與 SHA-256 雙重驗證
- 不允許同時存在兩份不同內容但宣稱同一驗證基線的 007
- 若 byte comparison 或 hash 任一不同，立即停止，不得沿用 71／71 結果
- 正式 migration filename、hash、commit 與 harness 結果必須共同寫入後續 release verification report

## 4. Repository test harness 策略

### 決策

應在正式 Migration 007 release candidate commit 前，先把本次測試整理成 Repository 內可重跑、去敏且不依賴臨時目錄的 migration verification harness。本輪不建立該 harness

建議位置：

```text
supabase/tests/migration-007/
  README.md
  run-isolated.sh
  sql/
    structural.sql
    access-flows.sql
    security-regression.sql
    concurrency-session-a.sql
    concurrency-session-b.sql
    assertions.sql
```

若 Repository 現有測試慣例要求不同位置，下一 Gate 應先做只讀對照；不得為 007 引入第二套互相衝突的 runner

### 必須正式化的測試

- Migration 001–007 fresh apply 與 history
- v1 10 tables／38 policies non-regression
- v2 7 tables／5 policies／17 functions inventory
- function owner、`rolsuper`、`rolbypassrls`、`prosecdef`、`search_path`、EXECUTE ACL
- RLS enabled／forced 與 direct-write denial
- confirmed Email database boundary
- Invitation issuance、acceptance、expiry、revocation、replay 與 token hash
- 新受邀者原子建立 Actor、Membership、Grant 與 Events
- A／B／C isolation 與多重 grant path 不可拼接
- starts／ends database-clock 邊界
- Membership／Grant 撤銷後，同一舊 JWT context 立即失權
- Auth delete `ON DELETE SET NULL` 與歷史 Actor 保存
- final-manager guard、admin transfer 與 duplicate active grant invariant
- DRAFT tombstone 與 Access Event append-only
- transaction rollback 與 direct table write denial

所有 fixture 必須使用固定命名空間的虛構 UUID、虛構 Email 與無健康意義的資料，不可讀取 `.env` 或 Production data。輸出不得含 local key、JWT secret、database password、connection string、raw invitation token 或完整 Email

### 雙 session concurrency

Runner 必須建立兩個真正獨立的 database sessions，同時對同一 Case 執行管理者互撤。測試只有在以下條件全部成立時 PASS：

- 兩個 session 確實重疊執行
- Case row lock 序列化操作
- 一筆 transaction commit，競爭 transaction 被拒絕或依規則等待後拒絕
- ACTIVE Case 最終至少一位有效管理者
- 失敗 transaction 沒有部分 Membership、Grant 或 Access Event

單一 session 依序呼叫不得宣稱 concurrency PASS

### 結果統計與 harness disclosure

- 每項 assertion 固定輸出 `PASS`、`FAIL`、`SKIP` 或 `BLOCKED`
- Runner 必須核對預期測試總數，測試缺少本身視為 FAIL
- 任何 FAIL 或 BLOCKED 使 release candidate validation 失敗
- 保存逐項結果、summary、migration log、function inventory 與 concurrency evidence 的去敏輸出
- Repository harness 必須註明 Round 2 曾修正臨時 harness 對 `void` helper 使用 `IS NULL` 的錯誤斷言
- 該事件屬 harness defect，函式本身當時成功，不得改寫成 SQL 缺陷，也不得隱藏

## 5. Remote preflight requirements

Remote preflight 必須另行取得唯讀授權，且至少完成：

### 環境與 migration history

- 明確辨識 staging／production，避免對錯誤 project 執行
- 讀取 remote migration history，確認 001–006 timestamp 與 local 一致
- 確認沒有額外 pending migration、重複 timestamp 或 history drift
- 確認遠端 Auth、PostgreSQL／Database 與 Supabase 平台版本相容
- 確認正式候選 filename 與 hash 對應 release candidate commit

### v1 baseline

- 遠端 v1 RLS tables = 10
- 遠端 v1 policies = 38
- 逐表取得去敏 row counts，作 apply 前後 non-regression 基線
- 確認既有 table、constraint、trigger、function 與 policy 名稱不和 v2 objects 衝突
- 確認 Migration 001–006 objects 未被 out-of-band 修改

### Auth 與 owner 邊界

- 唯讀確認 `auth.users` 實際 schema 與 `email_confirmed_at`
- 確認 migration 執行 owner、role attributes、`rolsuper` 與 `rolbypassrls`
- 預估 apply 後 function owner、`prosecdef`、`proconfig` 與 ACL
- 不輸出 project ref、URL、Email、key、token、password 或 connection string

### 備援與營運

- 確認目前可用 backup、PITR 或平台復原能力及其實際涵蓋範圍
- 記錄 apply 前可恢復點與責任者
- 確認 Maintenance window、預估 lock／執行時間與使用者影響
- 確認 v2 App routes 仍關閉，apply 不會讓使用者進入未完成流程
- 事先決定失敗時使用 transaction rollback、forward fix、corrective migration 或 backup restore 的條件

### Apply 後 smoke tests

- migration history 只新增正式 007
- v1 10 tables／38 policies 與 row counts 不變
- v2 7 tables／5 policies／17 functions 完整
- owner、ACL、RLS、function security inventory 符合 release checklist
- 不建立真實 v2 Case 或使用者資料，除非另有 action-time E2E 授權
- Auth settings、Storage 與 v1 Coverage／Scenario objects 無非預期變更

本文件不執行上述檢查，也不授權 remote connection 或 apply

## 6. Rollback and recovery classification

| 情境 | 首選處理 | 禁止或限制 |
| --- | --- | --- |
| SQL apply 前發現 hash、history、owner、backup 或環境不符 | 停止，不執行 SQL，保留既有狀態 | 不得臨場改 SQL 後繼續 |
| transaction 內 apply 失敗 | 使用 database transaction rollback，確認 migration history 與 objects 無部分殘留 | 不得手動忽略錯誤或標記成功 |
| apply 成功但尚無 v2 資料 | 優先停用 v2 routes，依錯誤性質使用 additive corrective migration；只有經審核且證明無資料依賴時才評估移除 objects | 不承諾通用 destructive down migration |
| apply 成功且已有 v2 資料 | 停用 v2 routes／feature flag，保留資料，使用 forward fix 或 additive corrective migration；嚴重且無法前修時依已驗證復原計畫 restore | 禁止直接刪除七張 v2 tables |
| 權限錯誤但資料結構正確 | 立即停用相關 v2 routes／RPC，使用 additive ACL／policy／function corrective migration，重跑安全 smoke tests | 不直接手改遠端而不留下 migration history |
| Auth mapping 異常 | 停止 Invitation／activation 路徑，避免新 mapping，保留 Actor 歷史；使用 forward fix，必要時依 restore readiness 決策 | 不以 Email 猜測重連 detached Actor |
| v1 non-regression 失敗 | 停止 v2 功能與後續寫入，保存證據；若 transaction 尚未 commit 則 rollback，已 commit 則依影響採 corrective migration 或 backup restore | 不在未知資料影響下刪除 v2 tables或改寫 001–006 |

恢復決策必須由當次 remote preflight 所確認的 backup／PITR 能力支持。未驗證 restore 前，不得把 backup restore 當成保證可用的回滾方案

## 7. Security release checklist

正式檔 fresh validation 與 remote post-apply audit 均須核對：

- [ ] 7 張 v2 tables 均 RLS enabled／forced
- [ ] 17 個 functions 全數 inventory
- [ ] 11 Definer／6 Invoker
- [ ] 每個 function owner、`prosecdef`、固定空 `search_path` 與 ACL 符合候選設計
- [ ] 未預期 `PUBLIC EXECUTE = 0`
- [ ] anon／authenticated direct table write privilege = 0
- [ ] 5 條 v2 SELECT policies，無 `FOR ALL` 或非預期 policy
- [ ] owner `BYPASSRLS` 風險已明確接受並實測
- [ ] 高權限 RPC 不依賴 FORCE RLS 約束 Definer
- [ ] RPC 從 `auth.uid()` 與 database 最新狀態重新判定 Actor、Membership、Grant、Case 與有效期
- [ ] starts／ends、撤銷與 suspend 使用 database clock，舊 JWT 不能維持已失效權限
- [ ] Invitation 保存 token hash，raw token 僅回傳一次，且接受時綁定可信 confirmed Email
- [ ] token replay、expiry、revocation 與不符 Email 全部拒絕
- [ ] last-manager guard 與真正雙 session concurrency 通過
- [ ] Access Event 一般 client 不可新增、修改或刪除，event／target 組合受控
- [ ] DRAFT abandonment 只保留去敏 tombstone，不可由 target UUID 恢復內容權限
- [ ] A／B／C isolation 雙向一致
- [ ] 每次授權由單一完整 grant path 成立，不跨多條 grant 拼接 capability、purpose 或 scope
- [ ] CASE_ADMIN 不自然取得所有內容 scope
- [ ] Auth account 刪除採 fail-closed，Case、Membership 與歷史 Actor 不 cascade 消失

## 8. Scope and sequencing decision

### 明確回答

1. **下一個 Gate 先建立 Repository test harness**，再在同一受控 Gate 以 byte-for-byte copy 建立正式 Migration 007 候選，並立即用 harness 驗證正式檔
2. **正式 Migration 與 test harness 應在同一 release candidate commit**，但 commit 前必須先完成正式檔的 fresh isolated validation
3. **應先建立並推送 release candidate commit，再進行 remote preflight**，讓 remote checklist 對應不可變 commit、filename 與 hash
4. **Remote apply 必須另取一次明確 action-time 授權**，remote preflight 通過不等於 apply 授權
5. **Remote apply 前 v2 App routes 應維持未啟用**，避免 schema 上線即暴露未完成流程
6. **正式 Migration 建立後仍保留 SQL Draft**，作為設計與驗證歷史證據；兩者必須記錄 hash 與 promotion 關係，不把 Draft 放進 migration runner

### 推薦順序

1. Repository Migration Verification Harness Gate
2. Formal Migration 007 Promotion Gate：byte-for-byte copy、hash／byte comparison
3. Fresh Formal Migration 001–007 Isolated Validation Gate
4. Release candidate Git checkpoint：正式 Migration、harness、正式檔驗證摘要同一 commit
5. Remote Supabase Read-only Preflight Gate
6. Remote Apply action-time authorization
7. Remote Migration Apply Gate
8. Post-apply security／v1 non-regression audit
9. 另行授權 v2 App Vertical Slice implementation

## 9. Gate conclusion

| Gate | 判定 | 條件與說明 |
| --- | --- | --- |
| Migration 007 Access Foundation Release Review | **PASS** | 候選 identity、promotion integrity、harness、remote checklist 與 recovery 邊界已定義 |
| 建立 Repository test harness | **允許進入下一 Gate** | 必須另行授權，僅用虛構資料且不得依賴臨時目錄 |
| 建立正式 Migration 007 | **尚未授權，但設計上可進入下一 Gate** | 必須和 harness 受控建立，採 byte-for-byte copy，正式檔需 fresh validation |
| Remote Supabase Read-only Preflight | **尚未開始** | 需 release candidate commit 與另行唯讀授權 |
| Remote Supabase Apply | **BLOCKED** | 正式 Migration、Repository harness、正式檔 fresh validation、release candidate checkpoint、remote preflight、backup／recovery readiness 與 action-time 授權尚未全部完成 |

本 Review 通過不代表可以直接操作 Remote Supabase，也不允許把目前 Draft 放入正式 migration directory。下一個正確 Gate 是 Repository Migration Verification Harness 與 Formal Migration Promotion 的受控設計／實作 Gate

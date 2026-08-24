# 備份心 v2 Logical Data Model Design Review

- **Status:** `PROPOSED DRAFT`
- **Version:** `v2.0 Phase 0.3 Logical Data Model Design Review`
- **上游依據：** `V2_PRODUCT_GOVERNANCE_PERMISSION_MATRIX_DRAFT.md`、`V2_DOMAIN_MODEL_DESIGN_REVIEW_DRAFT.md`
- **尚未建立資料庫**
- **尚未建立 Migration 007**
- **尚未驗證 RLS**
- **尚未連線檢查遠端 Supabase**
- **不代表 Production 能力**

> 本文件只提出邏輯實體、關係、交易邊界、授權查詢需求及 Migration 分期建議。候選名稱不是正式資料表名稱，欄位不是 SQL 定義，亦不得據此宣稱法規、身分、權限或遠端資料庫已完成驗證。

## 1. Review 範圍與 Repository 事實

本輪唯讀檢查治理文件、Domain Model、Product Data Model v1.1、Migration 001–006、現有 TypeScript contracts，以及 v1 十張 RLS 資料表的授權根。

已確認的 Repository 事實：

- v1 正式 migration chain 共六份，最後一份為 Task Handoff
- v1 啟用 RLS 的資料表共十張，Policy 共三十八條；本輪未連線重驗遠端數量
- v1 十張表為 `users`、`care_receivers`、`care_tasks`、`care_sources`、`current_care_assignments`、`backup_assignments`、`care_scenarios`、`coverage_evaluations`、`task_adaptations`、`task_handoffs`
- v1 內容授權根是 `care_receivers.owner_user_id = auth.uid()`，下游表透過 receiver、task 或 scenario 回推唯一 owner
- `care_receivers.owner_user_id` 參照 Auth identity，現行刪除鏈可能使 receiver graph 隨唯一 owner 消失
- `care_tasks`、`care_sources`、`care_scenarios` 對 receiver 使用 Cascade；Assignment、Adaptation、Handoff 再對 Task 或 Scenario 使用 Cascade
- Migration 002 另以 trigger 維持跨 receiver integrity，並禁止 Task、Source、Scenario reparenting
- v1 TypeScript contracts 已包含 exact-time Task、Current Assignment、Backup Assignment、Handoff、Scenario 與 Coverage Engine adapter；它們不是 v2 協作治理 contract
- Coverage／Scenario 是可運作的 v1 模組；本輪不改寫其資料或語意
- 本輪沒有重跑 App tests、PostgreSQL tests 或遠端 RLS audit

## 2. 個案核心方案比較

### 2.1 方案 A：改造既有 `care_receivers`

做法是移除或弱化唯一 `owner_user_id`，使 `care_receivers` 成為多人治理個案根，再將既有 RLS 改為 Membership-based。

**優點**

- v1 Task、Source、Assignment、Scenario、Handoff 可直接沿用 receiver reference
- 長期若只保留一套個案，避免 v1／v2 重複個案
- Coverage／Scenario 不必建立跨模組 link

**重大成本與風險**

- 需要同時改寫十張表的 RLS ownership path、ACL、Cascade 假設及大量前端 query
- `owner_user_id` 目前同時是生命週期根與授權根；移除它不是單欄位修改
- 既有 owner data 的 backfill、第一位 Membership、管理者與歷史 actor 都要在同一部署中正確建立
- Migration 002 的 receiver immutability 與 cross-receiver trigger 必須重新審查
- v1 Coverage／Scenario 雖不直接依 owner 運算，資料讀取依賴 owner-chain RLS，回歸面很大
- rollback 困難：新 Membership 寫入後若退回唯一 owner，可能無法無損表達多人治理
- Production 既存 graph 尚未在本輪重驗，不能假設為空或可安全轉換

**判定：不推薦作為學生 Prototype 的第一個 v2 migration。** 沿用舊表看似表數少，實際上把最高風險的 RLS 與 Cascade 改造綁在第一步。

### 2.2 方案 B：新增獨立 v2 Case 核心

做法是以 additive schema 建立 v2 Care Case、Membership、內容版本、Action 與 Audit 邏輯；v1 receiver graph 保持原狀。必要時只建立 nullable、明確用途的 legacy link。

**優點**

- 不改寫 Migration 001–006，也不立即破壞 v1 owner-chain
- 可從零建立多人治理與帳號／個案解耦，不繼承唯一 owner 作為生命週期根
- 每階段可獨立 dry-run、rollback 與驗證
- v1 Coverage／Scenario 可繼續運作，是否回接延後決策
- 新模型可明確保存歷史 Actor Reference、Role Grant path、責任週期與來源版本

**成本與風險**

- 同一長者可能同時存在 v1 receiver 與 v2 case
- 若沒有清楚入口與標示，使用者可能重複建立或重複登打
- nullable legacy link 只能表示「此 v2 case 可參考一個 v1 receiver」，不能宣稱真人相同或自動同步
- 未來若整併，仍需獨立 mapping、consent 與 migration review

**Legacy link 建議**

- 第一條 Vertical Slice 不要求 legacy link
- 若研究需要從同一測試帳號切換 v1／v2，可允許 v2 Case 保存 nullable legacy receiver reference
- link 不得 Cascade、不得成為 v2 授權根、不得自動複製資料、不得用於跨個案真人比對
- 一個 v1 receiver 是否只能連一個 v2 case，留到相容性 Gate 決定；第一版 UI 應避免自動建立 link

**判定：推薦。** 這是風險最可控的 additive path，但必須把「並存不是同步」寫進產品與測試。

### 2.3 方案 C：Bridge／過渡層

做法是建立抽象 Case Registry，讓 v1 receiver 與 v2 case 都註冊成同一種 case target，再由 bridge table 導向不同 graph。

**優點**

- 理論上能提供統一入口並逐步遷移
- 未來可讓 Coverage／Scenario 掛回 v2 case

**成本與風險**

- 產生雙重 identity、polymorphic reference、同步與 orphan 規則
- RLS 必須跨 bridge 判定 target type，遞迴與錯配風險高
- rollback、唯一性、刪除及重新連結語意都比方案 B 複雜
- 對第一條 Update／Action Vertical Slice沒有直接使用者價值

**判定：Defer。** 學生 Prototype 不應為尚未決定的 v1 回接先承擔過渡平台複雜度。

### 2.4 推薦結論

採 **方案 B：獨立 v2 Case 核心**。Migration 007 應先建立 access foundation，不碰 v1 receiver graph；v1／v2 link、資料搬移與 Coverage 回接必須另開相容性 Gate。

## 3. 建模方法：避免機械式一名詞一表

Domain Object 不必全部各自成表。第一版使用三種合併策略：

1. Observation、Arrangement、Question、Answer 共享 Care Update envelope，類型特有 workflow 欄位以明確 nullable columns 或小型 validated payload 表達，但授權關鍵欄位不得藏在 JSONB
2. 所有已發布文字內容共享不可變 Content Version；更正新增版本，不覆寫舊版本
3. 專業服務關係第一版附著在 Membership／Role Grant 的有效期間與聲明 metadata，不先建立組織主檔

JSONB 僅適合非授權關鍵的展示細節或最小 Audit metadata。狀態、case、membership、actor、purpose、scope、validity、current-cycle 等必須是可索引與可約束的邏輯欄位。

## 4. 最小可行模型與完整候選模型

### 4.1 推薦 MVP：14 個邏輯實體

| # | MVP logical entity | 合併的 Domain concerns |
|---|---|---|
| 1 | Care Case | 個案生命週期、最低基本資料、選用 legacy reference |
| 2 | Case Subject | 個案中的長者描述；不做跨個案 Person matching |
| 3 | Actor Reference | Account Identity 與歷史顯示分離 |
| 4 | Authorization Declaration | 聲明、版本與限制提示 |
| 5 | Invitation | 接受前治理與一次性接受 |
| 6 | Case Membership | 個案關係、狀態、有效期間、專業服務聲明 |
| 7 | Role Grant | 一條獨立 grant path 的能力、目的、scope ceiling、期限 |
| 8 | Care Update | Observation／Arrangement／Question／Answer envelope 與 workflow state |
| 9 | Content Version | 不可變內容、更正與撤回鏈 |
| 10 | Record Link | 指向建立當時特定來源版本及直接參與關係 |
| 11 | Action Item | Action workflow 與 linked question/update |
| 12 | Responsibility Cycle | 每次指派、接受、處理及結束的不可變責任週期 |
| 13 | Case View Cursor | per-membership、per-case high-water mark |
| 14 | Audit Event | 最小不可變治理事件 |

### 4.2 完整候選模型：19 個以上邏輯實體

完整模型會額外拆出 Person Registry、Account Identity、Professional Service Relationship、Organization、Organization Membership、Arrangement Confirmation、Question Answer、Record Revision、Direct Participant、Delivery／Export Artifact 等。它能提高正規化與未來機構擴充能力，但第一條 slice 會增加 join、RLS recursion、交易與 UI 成本。

### 4.3 複雜度比較

| 面向 | 14 實體 MVP | 19+ 完整模型 |
|---|---|---|
| 第一條 slice 所需表數 | 中等，仍需分 migration | 高 |
| RLS join 深度 | Membership → Grant → Record，已偏深 | 再加 Person／Organization／subtype tables |
| 不可變來源 | 足夠 | 更精細 |
| 組織治理 | 僅聲明 | 可完整建模 |
| 重複登打 | 可控制 | 較高 |
| 學生 Prototype 風險 | 可接受但仍需分期 | 過大 |

**推薦 14 實體 MVP**，但 Migration 007 只建立其中的 access foundation，不一次建立全部。

### 4.4 必要 Domain 概念的 logical mapping

本 Review 明確涵蓋所有上游 Domain 概念，但不把每個名稱機械式拆表：

| Domain 概念 | MVP logical representation | 是否獨立實體 | 分期理由 |
|---|---|---|---|
| Care Case | Care Case | 是 | 個案生命週期與授權根 |
| Case Subject／Person | Case Subject | 是；Person Registry 否 | 每 case 一份未驗證 subject，不跨 case matching |
| Account Identity | Auth account 與 Actor Reference 的 nullable current link | 否，由既有 Auth 提供登入 identity | 不複製 Auth，也不讓帳號成為歷史根 |
| 歷史 Actor Reference | Actor Reference | 是 | 帳號刪除後仍需追溯作者 |
| Authorization Declaration | Authorization Declaration | 是 | append-only 授權聲明生命週期 |
| Invitation | Invitation | 是 | 接受前不授權，且需一次性接受 |
| Case Membership | Case Membership | 是 | Case relationship、status、validity |
| Role Grant／acting context | Role Grant；寫入保存 selected grant | 是 | 防止跨 grant 拼接 |
| Professional Service Relationship | Membership relationship kind + validity + 未驗證聲明 metadata | MVP 不另拆；後續可拆 | 第一版沒有 Organization 驗證或跨單位續約 |
| Care Update 外框 | Care Update | 是 | 共用作者、scope、purpose、workflow envelope |
| Observation | Care Update type + Content Version | 否 | 無獨立生命週期表需求 |
| Arrangement | Care Update type + designated confirmer fields/state | 否；confirmation history 後續可拆 | 第一版單一 confirmer |
| Question | Care Update type + question workflow state | 否 | 與共同 provenance/permission envelope 共用 |
| Answer | Answer-type Care Update + Content Version + parent link | 否 | 回答可獨立版本化，但不需大型聊天室模型 |
| Content Revision／來源版本 | Content Version | 是 | published content immutable |
| Record Link | Record Link | 是 | pin 建立時特定 source version |
| Action Item | Action Item | 是 | 獨立責任狀態機 |
| Responsibility Cycle | Responsibility Cycle | 是 | 每次指派不可變且 current cycle 唯一 |
| Case View Cursor | Case View Cursor | 是 | per-membership high-water concurrency |
| Audit Event | Audit Event | 是 | append-only 治理事件 |

若後續測試證明某 subtype 需要獨立生命週期、權限或 cardinality，才在 Migration 008／009 Design Review 比較拆表；不得只因 Domain 名稱不同就先增加資料表。

## 5. 候選實體規格

以下名稱均為 logical names，不是正式 SQL table names。

### 5.1 Care Case — MVP 必要

- **Primary identifier：** opaque Case ID
- **必要欄位：** lifecycle status、display label、created actor reference、created time、system record sequence boundary
- **可選欄位：** archived time／reason、nullable legacy receiver reference
- **關係／cardinality：** 1 Case → 1 Case Subject；1 → many declarations、invitations、memberships、updates、actions、audit events
- **狀態：** `DRAFT`、`AUTHORIZATION_DECLARED`、`ACTIVE`、`SUSPENDED`、`ARCHIVED`
- **規則：** 建立者只能在 DRAFT 填最低資料；授權聲明與啟用必須原子記錄；狀態轉換須 Audit
- **刪除：** 未授權 DRAFT 可 hard delete；啟用後禁止一般 hard delete，使用 suspended／archived
- **歷史：** 狀態轉換由 Audit 保存，不以更新時間取代
- **權限資料：** case status 是七項條件之一
- **敏感性：** display label 仍可能識別個人，須最小化
- **Slice：** 是

### 5.2 Case Subject — MVP 必要

- **ID：** Subject ID，且第一版與 Case 1:1
- **必要欄位：** case reference、display name or nickname、identity-verification status 固定為 unverified prototype
- **可選欄位：** 最小關係提示；不收完整法定身分
- **關係：** belongs to one Case
- **狀態：** active／withdrawn description，不代表真人狀態
- **規則：** 不跨 case 比對、不自動 merge、不建立全平台真人唯一鍵
- **刪除：** 隨未授權 DRAFT 可刪；啟用後保留或去識別化，不能 Cascade 自帳號
- **歷史：**重要顯示資料變更須 Audit
- **權限資料：** Invitation 最低揭露只能取核准欄位
- **敏感性：** 是
- **Slice：** 是

### 5.3 Actor Reference — MVP 必要

- **ID：** stable Actor Reference ID
- **必要欄位：** actor kind、historical display label、created time
- **可選欄位：** nullable current account identity reference、deactivated／pseudonymized time
- **關係：** Account 0..1 → many Actor References；Actor 被所有作者、操作者與 Audit 引用
- **狀態：** active link／detached historical reference
- **規則：** account delete 只解除登入 link，不刪歷史 actor；不得將新帳號偷偷接到舊 actor
- **刪除：** 不可由一般使用者 hard delete
- **歷史：** immutable actor ID；顯示策略可去識別但不能改寫作者為他人
- **權限資料：** actor 不授權；授權來自 Membership／Grant
- **敏感性：** display label 可能敏感
- **Slice：** 是

### 5.4 Authorization Declaration — MVP 必要

- **ID：** Declaration ID
- **必要欄位：** case、declarant actor、claimed capacity、declaration version、notice version、declared time、outcome
- **可選欄位：** withdrawal／dispute reason reference
- **關係：** Case 1 → many declarations
- **狀態：** declared／withdrawn／disputed／superseded
- **規則：** declaration event 與 Case activation 同 transaction；不保存法律驗證結論
- **刪除：** 不可 hard delete
- **歷史：** append-only
- **權限資料：**決定是否能從 DRAFT 啟用，但不是永久內容查看 grant
- **敏感性：** 中等
- **Slice：** 是

### 5.5 Invitation — MVP 必要

- **ID：** Invitation ID；另有不可猜測的一次性 delivery token 或等價 lookup handle，技術形式留後續 Gate
- **必要欄位：** case、inviter actor、intended account/contact binding、proposed role/purpose/scope ceiling、start/end、status、created/expires time
- **可選欄位：** unverified organization／title statement、revocation or decline reason
- **關係：** Case 1 → many；Invitation 0..1 → Membership
- **狀態：** invited／accepted／declined／revoked／expired
- **規則：** 只能接受一次；接受者須符合邀請 binding；接受與 Membership/Grant 建立同 transaction
- **刪除：** 不可 hard delete；token 可失效
- **歷史：** 保存結果但不保存超量個案內容
- **權限資料：** Invitation 本身不授予 case content
- **敏感性：** 邀請最低識別資料可能敏感
- **Slice：** 是

### 5.6 Case Membership — MVP 必要

- **ID：** Membership ID
- **必要欄位：** case、actor/account binding、relationship kind、status、valid from/until、accepted time
- **可選欄位：** unverified professional organization/title/service statement、expiry/revocation reason
- **關係：** Case 1 → many；Membership 1 → many Role Grants；1 → 1 cursor
- **狀態：** invited 不存在於 Membership；accepted／active／expired／revoked／declined result 留在 Invitation
- **規則：** active 需 Case active、已接受且在期間內；到期不等登入批次更新，授權時仍用 DB time 判斷
- **刪除：** 不 hard delete；撤銷／到期保留歷史
- **歷史：** 期限與狀態變更 Audit
- **權限資料：** relationship、status、validity 是 grant path 核心
- **敏感性：** 關係與機構聲明可能敏感
- **Slice：** 是

### 5.7 Role Grant — MVP 必要

- **ID：** Grant ID
- **必要欄位：** membership、role code、purpose code、capability set reference、scope ceiling、valid from/until、grant status、granted by actor
- **可選欄位：** reason、superseded grant reference
- **關係：** Membership 1 → many Grants
- **狀態：** active／revoked／expired／superseded
- **規則：** 每次操作選定一個 Grant ID 作 acting context；該 grant path 單獨滿足七項條件，不從其他 grant 補能力
- **刪除：** 不 hard delete
- **歷史：** 修改用新 grant 或明確狀態事件，不覆寫已用於內容的 acting context
- **權限資料：** role capability、purpose、scope ceiling、validity
- **敏感性：** 低至中等
- **Slice：** 是

### 5.8 Care Update — MVP 必要

- **ID：** Update ID
- **必要欄位：** case、type、author actor、acting grant、purpose、sharing scope、workflow status、occurred time、recorded time、current version pointer、system sequence
- **可選欄位：** designated arrangement confirmer membership、parent question/update reference、withdrawn time/reason
- **關係：** Case 1 → many Updates；Update 1 → many Content Versions；links connect versions／participants；Question 1 → many Answer-type Updates
- **狀態：** type-specific：Observation has verification-needed flag；Arrangement proposed/needs-confirmation/confirmed/cancelled；Question open/answered/resolved/reopened；Answer is published/withdrawn content
- **規則：** type discriminator 與所需狀態不得互相矛盾；Answer 不能自動 resolve Question；Arrangement 只有一位 current designated confirmer
- **刪除：** draft 可 hard delete；published 只能 withdraw/supersede
- **歷史：** Content Version 與 Audit
- **權限資料：** case、author、acting grant、purpose、scope、direct participants
- **敏感性：** 可能含健康觀察，屬敏感
- **Slice：** 是

### 5.9 Content Version — MVP 必要

- **ID：** Version ID
- **必要欄位：** parent update、version sequence、author actor、created time、content payload、correction reason/type、system sequence
- **可選欄位：** corrects version、withdrawal marker
- **關係：** Update 1 → many Versions；Version 1 → many source links
- **狀態：** published／withdrawn；不以 update overwrite 表達
- **規則：** 已發布版本 immutable；同一 parent 的 version sequence 唯一；更正者不改原作者；current pointer 只指向同一 parent 的有效版本
- **刪除：** 不 hard delete
- **歷史：** 完整 version chain
- **權限資料：** 不得自行擴大 parent scope；來源 link 另受權限交集
- **敏感性：** 高，payload 只收最低必要內容
- **Slice：** 是

### 5.10 Record Link — MVP 必要

- **ID：** Link ID
- **必要欄位：** case、from entity/version、to source version、link type、created actor/time、source scope snapshot or reference
- **可選欄位：** direct participant membership、supersedes link
- **關係：** many-to-many between update versions, questions, answers and actions
- **狀態：** active／superseded；舊 link 保留
- **規則：** target 必須是建立時特定版本；來源更新不自動換 link；同一 from/to/type 不重複
- **刪除：** 不 hard delete
- **歷史：** 新 link 追加，舊 link 保留
- **權限資料：** link 不提升權限；查看者須同時可見衍生 record 與來源 version
- **敏感性：** link metadata 也可能洩漏事件存在
- **Slice：** 是

### 5.11 Action Item — MVP 必要

- **ID：** Action ID
- **必要欄位：** case、creator actor、acting grant、purpose、sharing scope、state、current responsibility-cycle pointer、created time、system sequence
- **可選欄位：** linked question/update/version、due time、cancel reason
- **關係：** Action 1 → many Responsibility Cycles；many source links
- **狀態：** `PENDING_ACCEPTANCE`、`ACCEPTED`、`IN_PROGRESS`、`COMPLETED`、`DECLINED`、`CANCELLED`、`NEEDS_REASSIGNMENT`
- **規則：** state 與 current cycle phase 一致；completed 不 resolve Question；指派者不能替負責人完成
- **刪除：** published 不 hard delete
- **歷史：** Audit + immutable cycles + versioned completion note
- **權限資料：** creator, assignee participant, grant, purpose, scope, case/membership validity
- **敏感性：** 可能揭露照顧問題
- **Slice：** 是

### 5.12 Responsibility Cycle — MVP 必要

- **ID：** Cycle ID
- **必要欄位：** action、cycle ordinal、assigner actor/grant、assignee membership、assigned time、cycle status
- **可選欄位：** accepted/start/end times、end reason、expiry/revocation fact reference、completion version
- **關係：** Action 1 → many Cycles；至多一個 current cycle
- **狀態：** pending/accepted/in-progress/completed/declined/ended-for-reassignment/cancelled
- **規則：** cycle immutable except forward-only lifecycle fields；新指派新 cycle；舊 assignee 不被覆寫
- **刪除：** 不 hard delete
- **歷史：** 自身即責任歷史，另有 Audit
- **權限資料：** assignee 的 Membership 與當時 Grant path；失權不刪歷史
- **敏感性：** 中等
- **Slice：** 是

### 5.13 Case View Cursor — MVP 必要

- **ID：** 可由 Membership 唯一識別的 Cursor ID
- **必要欄位：** membership、case、high-water system sequence、advanced time
- **可選欄位：** rejoin generation or activation reference
- **關係：** active membership 0..1 cursor per case
- **狀態：** active/inactive with membership；不授權
- **規則：** 只可取 max(old,new)；Timeline 成功呈現後才前移；查詢新事件仍重新套用目前權限
- **刪除：** Membership 歷史保留時 cursor 可保留但不可使用
- **歷史：** 不要求每次 cursor 變動都成完整 read Audit
- **權限資料：** 只能本人更新；不可用來讀內容
- **敏感性：** 使用行為 metadata
- **Slice：** 是

### 5.14 Audit Event — MVP 必要

- **ID：** monotonic Event ID／case-local system sequence
- **必要欄位：** actor reference、case、event type、target type/id、event time、system sequence
- **可選欄位：** target version、previous/new state、reason code、最小 metadata
- **關係：** Case 1 → many；target 使用受控 entity reference，不能任意裸 UUID
- **狀態：** append-only
- **規則：** 一般使用者不得 update/delete；不複製完整敏感內容；關鍵交易與狀態變更同 transaction 建立
- **刪除：** 不由一般產品流程 hard delete；保存期限需專家確認
- **歷史：** 自身即事件歷史
- **權限資料：** Audit 可見性與執行權分離，第一版不開放全量給一般管理者
- **敏感性：** metadata 也可能敏感
- **Slice：** 是，但只涵蓋治理與狀態事件

### 5.15 後續／Defer 實體

| 實體 | 分期 | 原因 |
|---|---|---|
| Verified Person Registry | Defer | 第一版不做真人比對或驗證 |
| Organization / Organization Membership | 機構版 | 第一版只保存未驗證服務聲明 |
| Professional Service Relationship 獨立實體 | 後續 | MVP 可由 Membership + Grant validity 表達；跨機構與續約才需獨立生命週期 |
| Arrangement Confirmation History 獨立實體 | 後續 | MVP 可用指定 confirmer + Audit；多方確認不做 |
| Direct Participant join entity | 視 Logical Detail | 若 `DIRECT_PARTICIPANTS` 無法由 Record Link 清楚表達再拆 |
| Export Artifact / Delivery / Receipt | Phase 4 | 不阻擋 Update／Action slice |
| Full read audit / read receipt | Defer | Cursor 不等於逐筆已讀 |
| v1 Case Bridge | 相容性 Gate | 尚未決定 Coverage 回接 |

### 5.16 Legacy v1 only

`care_receivers`、`care_tasks`、`care_sources`、current/backup assignments、scenario/evaluation/adaptation、task handoff 與 v1 profile 在本 Review 中維持 legacy v1 only。它們不被重新命名為 v2 Membership、Action 或 Care Update，也不因 v2 case 建立而自動搬移。

## 6. 精簡關係圖

```text
Account Identity --0..1--> Actor Reference (stable history)
                              |
                              +-- creates --> Care Case --1:1--> Case Subject
                                              |
                                              +--1:N--> Authorization Declaration
                                              +--1:N--> Invitation --0..1--> Case Membership
                                              |                         |
                                              |                         +--1:N--> Role Grant
                                              |                         +--0..1--> Case View Cursor
                                              |
                                              +--1:N--> Care Update --1:N--> Content Version
                                              |              \             |
                                              |               \            +--N:M via Record Link
                                              |                +-- type-specific workflow
                                              |
                                              +--1:N--> Action Item --1:N--> Responsibility Cycle
                                              |                |
                                              |                +-- source/version links
                                              |
                                              +--1:N--> Audit Event

v1 care_receiver graph -- optional, non-authorizing legacy link --> v2 Care Case
```

## 7. 核心唯一性、交易與並行規則

以下是概念-level invariant；本輪不選 SQL、trigger 或 RPC 寫法。

1. **有效管理者保護：** `ACTIVE` Case 至少有一位有效且已接受、具 management grant 的 Membership。最後一位管理者離開時，新增管理者接受與舊管理者退出必須同 transaction，或先封存／暫停個案。
2. **邀請一次性：** 同一 Invitation 只能由綁定的受邀者接受或拒絕一次；接受與 Membership、initial Role Grant、Audit 建立必須全成或全不成。
3. **邀請不授權：** Invitation status 不能被內容 RLS 當作 Membership。
4. **責任週期唯一：** 同一 Action 同時至多一個 current Responsibility Cycle；Action state 與 cycle state 必須一致。
5. **重新指派原子性：** `NEEDS_REASSIGNMENT → PENDING_ACCEPTANCE` 與新 cycle 建立、current pointer 更新、Audit 必須同 transaction。
6. **舊週期不可覆寫：** 重新指派不得更新舊負責人、指派者、接受／開始／結束時間與原因。
7. **版本不可變：** published Content Version 不可 update；更正建立新 version，原作者欄位永不轉移。
8. **版本唯一：** 同一 parent update 的 version ordinal 唯一；current version pointer 必須指向同 parent。
9. **來源固定：** Record Link 指向特定 source version；更新提示不能修改舊 link。
10. **Arrangement confirmer 唯一：** 需要確認的 Arrangement 同時至多一位 current designated confirmer；失權時清除「目前有效確認者」並標示 waiting-for-confirmer，不轉成 Action 狀態。
11. **Cursor 單調：** cursor 只能前進；多裝置提交不同 high-water 時保存最大值。
12. **Cursor 不授權：** revoked/expired Membership 即使有 cursor，也不能查詢事件、數量或內容。
13. **Case sequence：** 可成為「新變化」的事件使用不可倒退系統順序；occurred_at 可回填但不參與新舊邊界。
14. **Case／Account 解耦：** Account delete 不 Cascade Case、Membership history、Actor Reference、Content、Cycles 或 Audit。
15. **同 case boundary：** Membership、Update、Action、Cycle、Link 的 case 必須一致，不能跨 case 建立 source link 或責任人。

## 8. 剩餘 Logical Questions 的推薦決策

### 8.1 Cursor 重新加入

| 方案 | 優點 | 風險 |
|---|---|---|
| 沿用舊 cursor | 使用者可看到離開期間變化 | 可能洩漏失權期間事件數量或內容存在 |
| 重設為重新加入時 high-water | 不暴露失權期間歷史差異 | 重新加入者看不到期間內、目前其實可見且需要交接的事件 |
| 使用者選擇 | 彈性高 | 選項本身可能揭漏數量，且語意難懂 |

**推薦：重設為新 Membership activation 時的 current high-water。** 重新加入建立新的 Membership generation，不復用舊 cursor。需要補交接時，由有權成員建立新的可見摘要或 Update，而不是讓舊 cursor 回溯失權期間。這是最不易洩漏的第一版。

### 8.2 多來源更新計數

推薦以「目前可見、被現有 Record Link 引用的 source lineage，其最新可見版本高於 pinned version」為一個更新單位：

- 同一 source lineage 不論中間有幾次更正，只計一筆
- 無權查看最新版本時不計數，也不顯示存在
- 更正鏈以 lineage root + latest visible version 去重
- 舊 Record Link 的 scope snapshot 不因新版本權限放寬而擴大
- 人工新增新引用後，舊引用保留，但該 lineage 不再列為待檢查，除非之後又有可見新版本
- 計數必須在查詢當下依 current authorization 計算，不保存全域 `updates_count`

### 8.3 Arrangement confirmer 失權

Arrangement 保持原 workflow，例如 `NEEDS_CONFIRMATION`，另有獨立 confirmer assignment state：

- `DESIGNATED`：指定者目前有效
- `NEEDS_REDESIGNATION`：原指定者到期、撤銷或失去能力
- `CONFIRMED`：指定者在有效權限下完成確認，保存 actor、grant 與時間

第一版若不拆獨立 entity，可在 Care Update envelope 保存 designated membership、confirmation state 與 confirmation Audit，但邏輯上仍與 Action state 分開。失權不得轉成 `NEEDS_REASSIGNMENT`，因 Arrangement confirmer 不是 Action assignee。

### 8.4 多重 Role Grant

一次 authorization attempt 必須提供或解析出單一 `acting_grant_id`：

```text
Account
→ Actor
→ one Case Membership
→ one Role Grant
→ capability + purpose + scope ceiling + validity
→ record scope/relationship + case status
→ allow or deny
```

不得先把 Account 所有 grants 的 capabilities union，再用另一 grant 的 purpose 或期限補足。若兩條完整 path 都允許但產生不同 scope，寫入前要求選定 acting grant；寫入保存 grant、purpose、sharing scope。讀取可以接受「任一完整 path 通過」，但每條 path 必須獨立求值。

## 9. 權限查詢路徑

### 9.1 完整判定

```text
Authenticated Account
  → stable Actor Reference
  → Case Membership for target Case
  → Membership status + accepted_at + valid_from/valid_until
  → one Role Grant
  → capability + acting purpose + grant scope ceiling + grant validity
  → target record sharing scope
  → target relationship (author/direct participant/assignee/confirmer)
  → Case lifecycle status
  → all conditions intersect
  → ALLOW or DENY
```

任何一項不成立即 DENY。管理 capability 與內容 view capability 分開，不能以「可管理成員」推導「可看所有內容」。

### 9.2 交易中需要一致取得的資料

- 邀請接受：Invitation status/binding、Case status、inviter authority、Membership uniqueness、initial grants
- 寫入 Care Update：Case status、Membership validity、selected Grant、capability、purpose、scope ceiling、direct participants
- Action transition：Action state、current cycle、actor/assignee Membership、selected Grant、system sequence
- 管理者移轉：新管理者接受狀態、舊／新 grants、有效管理者 count
- Cursor advance：Membership validity、current stored cursor、requested rendered high-water

### 9.3 未來 RLS recursion 風險

- Membership policy 若查 Role Grant，而 Role Grant policy又查 Membership，會形成 recursion
- Record policy 若透過 Record Link 查來源 Record，而來源 policy 再查 links，可能循環
- Audit visibility 若依 target record policy，target 又依 Audit 判斷狀態，可能循環
- 管理者 count 若直接在 Membership UPDATE policy 查同表，可能觸發 self-reference

後續可評估狹窄、固定 search path、最小回傳值的安全 helper functions，例如：

- account 是否對 case 有一條完整 grant path
- account 是否可看特定 record metadata/content
- case 是否仍有另一位有效管理者
- membership 是否為 action current assignee

這些只是候選 responsibility，不是本輪授權建立 SECURITY DEFINER function。Helper 不能接受前端自稱的 role/purpose 而不核對資料庫事实，也不能回傳隱藏內容數量。

### 9.4 不能只靠前端的規則

- category／scope／case 一致性
- invitation once-only acceptance
- last manager protection
- membership expiry/revocation enforcement
- single current responsibility cycle
- immutable published versions
- acting grant path validity
- cursor monotonicity
- Audit append-only

## 10. Audit 與不可變來源

### 10.1 最小 Audit Event structure

| 欄位 | 語意 |
|---|---|
| event identifier / system sequence | 不可倒退的事件順序，可支援 cursor |
| actor reference | 穩定歷史 actor，不因帳號刪除消失 |
| acting grant / purpose | 需要時保存當次使用身分與目的 |
| case reference | 所屬個案 |
| event type | 授權、邀請、成員、內容、問題、Action 等受控 vocabulary |
| target entity / target version | 指向實體及建立時版本 |
| previous state / new state | 僅狀態轉換所需值，不複製內容 |
| event time | database/system time |
| reason | 受控 reason code + 最短必要說明 |
| minimal metadata | 只放無法由 target reference 還原、且治理必要的 metadata |

### 10.2 保護規則

- Audit 不複製完整觀察、回答、健康內容或處方
- Account delete 後 Actor Reference 仍存在；可依法去識別顯示，但不能變成另一個人
- 一般 authenticated user 不可 update/delete Audit
- 更正事件同時指向原 version 與新 version
- 衍生 Question／Action 的 Record Link 指向建立當時 source version
- Audit 可見性本身需最小權限，不能因管理者身分開放全量安全事件
- retention、legal hold、去識別化衝突仍需法律與隱私專家確認

## 11. v1／v2 並存策略

### 11.1 並存護欄

- v1 receiver graph 保持原 migration、RLS、Coverage 與 Scenario contract
- v2 Case 使用獨立入口與清楚標示，不把 v1 receiver 自動視為 v2 Case
- 第一條 slice 不自動複製 Task、Source、Assignment 或 Handoff
- 若同一測試者建立兩邊資料，UI／研究文件須說明它們不是同步副本
- 不用姓名比對建立 link，不跨 case 合併 Person
- 任一 legacy link 都不授權、不 Cascade、不作真人識別證據

### 11.2 重複登打控制

- v2 第一條 slice 只收個案最低識別、成員、觀察、問題與 Action，不要求重新建立 v1 全套 Task／Assignment
- 使用短 display label，不複製完整 receiver profile
- Coverage 回接前不在 v2 重做 Scenario
- Pilot 應觀察「同一變化是否要同時填 v1 Task Handoff 與 v2 Update」；若發生，先調整研究流程，不先做自動同步

## 12. Migration 分期建議（不建立 Migration）

### 12.1 Migration 007 — Access foundation

建議只涵蓋：Care Case、Case Subject、Actor Reference、Authorization Declaration、Invitation、Case Membership、Role Grant，以及建立／接受／移轉所需的最小 Audit Event foundation。

必須證明：

- Account delete 不刪 Case
- DRAFT authorization boundary
- Invitation acceptance atomicity
- Membership expiry/revocation
- one complete grant path
- last manager protection
- v1 十張表與 38 policies 未改動

**Rollback boundary：** 尚未建立 v2 content 時可整體移除 access foundation；任何測試資料需先確認非真實健康資料。不得修改 Migration 001–006。

### 12.2 Migration 008 — Content and provenance

Care Update、Content Version、Record Link，以及 type-specific workflow constraints。建立 immutable version 與 source pinning，不先加入 Action。

**Rollback boundary：** 只回退 v2 content 模組，不碰 access foundation 或 v1 graph；若已有資料，需保存／匯出策略。

### 12.3 Migration 009 — Action responsibility

Action Item、Responsibility Cycle、`NEEDS_REASSIGNMENT`、Arrangement confirmer logical support與必要 Audit events。

**Rollback boundary：** 不得把 Action history 壓回單一 assignee 欄位；正式有資料後 rollback 需另行 forward-fix 設計。

### 12.4 Migration 010 — Cursor and Audit hardening

Case View Cursor、system sequence/high-water concurrency、Audit visibility／retention hardening。若 Audit foundation 已於 007 建立，此階段只擴充 target types 與 enforcement。

### 12.5 Migration 011+ — v1 compatibility／bridge（可選）

只有在使用者測試證明 Coverage 回接有價值後，才設計 legacy link、mapping 或 read-only adapter。不得用 bridge 反向改寫 v1 owner-chain。

### 12.6 為何不能一個 Migration 完成 v2

- Access RLS、immutable content、Action concurrency 與 cursor 各自都有高風險 invariant
- 單一 migration 難以定位 rollback 與 policy regression
- 一次引入 14 個實體會造成測試矩陣爆炸
- v1 Production 狀態尚未在本輪驗證
- 每階段都應有 preflight、positive/negative PostgreSQL tests、RLS A/B isolation 與 rollback Gate

## 13. Record Walkthrough

### 13.1 家庭建立草稿、聲明授權、邀請家屬

1. 建立 Actor Reference（若帳號尚無 stable actor）
2. 同 transaction 建立 Care Case `DRAFT`、Case Subject、creator limited Membership/Grant 或等價草稿能力、Audit
3. 建立 Authorization Declaration；同 transaction 將 Case 經 declaration milestone 進入 `ACTIVE`、建立授權聲明 Audit、確保至少一位有效管理者
4. 建立 Invitation，保存邀請目的、scope ceiling、期限與受邀 binding；Invitation 不授權內容
5. 家屬接受時，同 transaction：Invitation accepted、Membership 建立、initial Role Grant 建立、Audit 建立

**不可覆寫：** Declaration、Invitation result、actor、Audit

**權限層：** DRAFT creator capability；啟用後 Case + Membership + one Grant + scope + validity

**Cursor：** 新 Membership activation 時 cursor 設為當下 case high-water；接受前沒有 cursor，也看不到事件數量

### 13.2 日照成員三個月後到期，未完成事項待重新指派

1. 有權管理者建立期限三個月的 Invitation，保存未驗證機構／職稱聲明
2. 日照人員接受；Membership、Role Grant、Audit 同 transaction 建立
3. 指派 Action 時同 transaction 建立 Action `PENDING_ACCEPTANCE`、第一個 Responsibility Cycle、Record Links、Audit
4. 日照本人接受及開始，各自驗證 selected grant path 並更新 forward-only cycle/state、Audit
5. 到期判定在每次授權即時使用 valid_until；不得等 batch job 才失權
6. 到期處理 transaction：Membership 有效性結束、Action `IN_PROGRESS → NEEDS_REASSIGNMENT`、舊 cycle 結束原因/時間、Audit 一起成立
7. 新指派 transaction：新 cycle、Action `PENDING_ACCEPTANCE`、current pointer、Audit 一起成立

**不可覆寫：** 舊 assignee、assigner、accepted/start/end time、end reason

**資料外洩防護：** 到期者所有新 SELECT／download／export 重新驗證 Membership；舊 cursor 不提供數量或內容

### 13.3 皮膚異常觀察、提問、護理人員處理、家屬解決

1. 日照成員以單一 acting grant 建立 Observation Care Update + Version + Audit；保存 occurred/recorded time、scope
2. 家屬建立 Question Update + Version，Record Link pin Observation version，Question `OPEN`
3. 護理人員 Answer 建立新 Answer-type Update/Version；Question 轉 `ANSWERED` 但不 resolve，並 Audit
4. 有權者建立 Action，pin 問題與來源版本，指派護理人員，建立 cycle
5. 護理本人接受、开始、完成；完成說明為不可變 version；Action `COMPLETED`
6. 家屬或明確 question governance grant 將 Question `RESOLVED`；此交易不修改 Action
7. 若 Observation 後續更正，新增 Content Version；舊 links 不變，只對目前有權者顯示一個 lineage update

**同 transaction：** 每次狀態轉換、相關 cycle/version/current pointer、system sequence、Audit

**不可覆寫：** 原 Observation、Question、Answer、Completion、source links、actor

**Cursor：** 每個成功提交的可見事件取得 system sequence；使用者新變化只計其目前完整 grant path 可見的事件。Timeline 成功呈現後以 max 更新 cursor

**到期後：** 護理／日照 Membership 失效，不能以直接參與或歷史 source link 繼續存取；歷史 actor 顯示仍供目前有權者追溯

## 14. Failure Cases 與風險

| 風險 | 可能失敗 | 護欄 |
|---|---|---|
| Table explosion | 19+ tables 讓 slice 無法完成 | 採 14 實體 MVP，且分 Migration 007–010 |
| 過度正規化 | 一個畫面需大量 join | Update envelope + shared version/link；讀模型可後續建立，不犧牲授權欄位 |
| JSONB 隱藏授權 | scope/purpose/status 無法約束 | 所有授權關鍵資料為明確 logical columns |
| RLS recursion | Membership/Grant/Record 互查 | 後續設計非遞迴 helper responsibility 與 policy dependency graph |
| FK Cascade | 刪帳刪 Case 或內容 | Actor link nullable/detachable；Case graph不以 Account cascade 為根 |
| Soft delete 誤查 | revoked/withdrawn 仍出現在正常 query | 所有授權與內容 query 明確套狀態；歷史介面分離 |
| 作者去識別衝突 | 刪帳後無法追溯或冒名 | stable Actor Reference + current Account nullable +合法去識別策略待專家確認 |
| 多裝置競爭 | cursor 倒退、雙重接受、雙 current cycle | max high-water、unique/transaction invariant、狀態 compare-and-set 概念 |
| v1/v2 重複個案 | 同一長者兩套資料混淆 | 不自動 link/merge；入口與研究提示清楚；相容性 Gate |
| 重複登打 | 第一線同時填 v1 與 v2 | v2 slice 不要求重建 v1 Task；以 Update/Action 最小流程測試 |
| Prototype 過大 | 治理功能蓋過核心流程 | 007 只 access foundation；Organization、PDF、AI、Coverage 回接 Defer |
| 隱藏 metadata 外洩 | update count 洩露看不到的紀錄 | 計數前重新套完整 current grant path，不顯示不可見 lineage |
| Arrangement/Action 混淆 | confirmer 失權誤成 Action reassignment | 獨立 confirmation assignment state |

## 15. 尚未解決的 Logical TBD

### 15.1 Migration 007 Design Review 前必須決定

- Actor Reference 與 Auth account 的建立、解除連結及去識別責任
- DRAFT creator limited capability 是特殊 Membership/Grant，或 Case-level creator rule；不得同時存在兩套可繞過的授權路徑
- Case activation 如何原子建立第一位管理者並符合授權者同意
- Membership 與 Role Grant 的具體 validity 邊界及 database clock 語意
- 七項 grant path 的 capability vocabulary、purpose vocabulary 與 scope ceiling
- last-manager invariant 在 `SUSPENDED`／`ARCHIVED` 是否有不同規則
- Invitation recipient binding 如何避免他人取得邀請，又不在 DB 保存不必要 Email
- v2 RLS dependency graph 如何避免 recursion
- Migration 007 是否只建立 Audit foundation 或完整 Audit Event；推薦建立最小 foundation
- Migration 007 preflight 如何確認不改動 v1 10 tables／38 policies

### 15.2 Migration 008／009 前處理

- Care Update subtype 使用明確 columns 或小型 subtype tables 的最終選擇
- sensitive content payload 的 TypeScript contract 與資料最小化
- Record Link 的 target typing 如何維持 FK-like integrity，不採不可驗證 polymorphic UUID
- Arrangement confirmer 是否需獨立 history entity
- Action／Cycle 原子狀態轉換的具體 enforcement mechanism
- completion note 如何使用 Content Version 又不造成循環 reference

### 15.3 專家／場域確認

- 適當授權者、衝突聲明與解除 `SUSPENDED`
- Actor 去識別與 Audit 保存期限
- 專業／家庭分享 scope 是否符合實際工作邊界
- 未驗證職稱、機構與專業身分的固定提示
- 健康觀察的最小必要內容與紙本輸出責任

## 16. Gate 判定

### 16.1 推薦 Logical Model

- **個案核心：** 方案 B，新增獨立 v2 Case 核心
- **MVP 模型：** 14 個 logical entities
- **實作方式：** additive、分期 migration、v1/v2 明確並存
- **不採用：** 直接改造 `care_receivers` 作第一步；Bridge 作第一步；單一 Migration 完成全部 v2

### 16.2 Gate

- **Logical Data Model Design Review：** `PARTIAL — RECOMMENDED MODEL SELECTED`
- **可進入 Migration 007 Design Review：** 是，但只限 Access Foundation 的 migration design、preflight、RLS dependency analysis與 rollback plan
- **可建立 Migration 007 SQL：** 否
- **可撰寫 RLS Policy：** 否
- **可開始 App／Vertical Slice implementation：** 否

`PARTIAL` 的原因不是缺少推薦方向，而是 Migration 007 前仍須固定 Actor／Account 解耦、DRAFT creator 授權路徑、第一位與最後一位管理者原子性、capability/purpose vocabulary，以及非遞迴 RLS dependency graph。

### 16.3 下一個審查 Gate

**Migration 007 — v2 Access Foundation Design Review**

下一 Gate 只能設計：

- Care Case／Subject／Actor Reference
- Authorization Declaration
- Invitation／Membership／Role Grant
- 最小 Audit foundation
- account deletion、last manager、invitation acceptance、expiry/revocation 的一致性
- v1 non-regression preflight、rollback 與 RLS dependency graph

在該 Gate 釐清並通過前，不得建立 SQL、Migration、RLS、App 或遠端資源。

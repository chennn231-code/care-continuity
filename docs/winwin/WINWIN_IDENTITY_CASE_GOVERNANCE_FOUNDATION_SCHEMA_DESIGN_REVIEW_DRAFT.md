# WinWin Identity／Case／Governance Foundation Schema Design Review

> **狀態：DRAFT — Foundation Schema Product Decisions Complete; Pending Final Read-only Review**
>
> 本文件只把已核准的 7-table、DRAFT-only Foundation scope 轉成可審查的 **PROPOSED** schema design。它不是正式 ERD、Migration、SQL、RLS policy、RPC、API、Remote Apply 或 Production 授權；文中的 table、column、type、key、constraint、index 與 transaction 均未核准實作。

## 1. Purpose, authority and fixed boundary

權威依據依序為：

1. [`WINWIN_PRODUCT_DEFINITION_BOUNDARY_V1.0.md`](WINWIN_PRODUCT_DEFINITION_BOUNDARY_V1.0.md)
2. [`WINWIN_CORE_OBJECT_MODEL_PHASE_1_DESIGN_REVIEW_DRAFT.md`](WINWIN_CORE_OBJECT_MODEL_PHASE_1_DESIGN_REVIEW_DRAFT.md)
3. [`WINWIN_CORE_OBJECT_MODEL_PHASE_2_DESIGN_REVIEW_DRAFT.md`](WINWIN_CORE_OBJECT_MODEL_PHASE_2_DESIGN_REVIEW_DRAFT.md)
4. [`WINWIN_CORE_OBJECT_MODEL_PHASE_3_DESIGN_REVIEW_DRAFT.md`](WINWIN_CORE_OBJECT_MODEL_PHASE_3_DESIGN_REVIEW_DRAFT.md)
5. [`WINWIN_CORE_OBJECT_MODEL_CONSOLIDATION_REVIEW_DRAFT.md`](WINWIN_CORE_OBJECT_MODEL_CONSOLIDATION_REVIEW_DRAFT.md)
6. [`WINWIN_LOGICAL_DATA_MODEL_DESIGN_REVIEW_DRAFT.md`](WINWIN_LOGICAL_DATA_MODEL_DESIGN_REVIEW_DRAFT.md)
7. [`WINWIN_PHYSICAL_DATA_MODEL_ERD_DESIGN_REVIEW_DRAFT.md`](WINWIN_PHYSICAL_DATA_MODEL_ERD_DESIGN_REVIEW_DRAFT.md)
8. [`WINWIN_IDENTITY_CASE_GOVERNANCE_FOUNDATION_MIGRATION_DESIGN_REVIEW_DRAFT.md`](WINWIN_IDENTITY_CASE_GOVERNANCE_FOUNDATION_MIGRATION_DESIGN_REVIEW_DRAFT.md)

Stage 1 嚴格 DRAFT-only，只審查下列 7 個 proposed tables：

1. `public.winwin_actor_references`
2. `public.winwin_account_actor_links`
3. `public.winwin_person_references`
4. `public.winwin_cases`
5. `public.winwin_care_recipient_roles`
6. `public.winwin_authorization_declarations`
7. `public.winwin_authorization_decisions`

不新增第 8 張 Foundation table。Care Circle authoritative table 為 0；Invitation、Membership、Relationship、Grant、正式內容、分享、一般協作、通用 Audit Event 與 bridge 全部排除。Migration 001–008 不因本文件而改變。

## 2. Schema alternatives

| Option | Description | History／least privilege | RLS verifiability | Stage 2 compatibility | MVP complexity | Assessment |
|---|---|---|---|---|---|---|
| A | 主表保存大量 lifecycle 狀態與有效期間 | mutable current flags 容易覆寫原因與歷史 | 中；需辨認哪些欄位是真相 | 容易把 creator／accepted flag 誤當治理 path | 低至中 | Rejected as primary direction |
| B | 正規化主體＋append-only generation／decision history | 保留 attribution、link generations、declaration／decision lineage | 高；current facts 可由窄資料推導 | 可在 Stage 2 加入 Membership／Relationship／Grant generations | 中 | **Recommended** |
| C | 全面 Event Sourcing | 歷史最完整，但 projection、replay 與 writer correctness 成本高 | 低至中；學生 MVP 難以證明 | 可擴充但過度複雜 | 很高 | Rejected for first version |
| D | JSON-heavy flexible schema | 欄位語意、FK、scope 與 append-only enforcement 脆弱 | 低 | 容易形成無法驗證的 bridge／payload truth | 低起步、高維護 | Rejected |

**Accepted direction（FND-SCHEMA-PD-01 through FND-SCHEMA-PD-08）：Option B。** Stable entities 保留最小 current lifecycle facts；Auth mapping、Declaration 與 Decision 採 generation／append-only history。Stage 1 Case lifecycle 只允許 DRAFT 與 ABANDONED；authorization outcomes 只存在 append-only Decision history。這與 Frozen Physical Model 的 normalized core＋append-only history 一致，但不表示 table boundary、正式 machine code、constraint 或任何 SQL 已 Freeze。

## 3. Proposed shared conventions

以下只是跨表候選慣例：

- 主鍵：opaque UUID candidate；不得由 Email、姓名、生日或 Auth metadata 產生。
- 時間：`timestamptz` candidate，system-recorded facts 依 database clock；使用者聲明時間另存時不得取代 system time。
- Machine meaning：versioned text／registry-compatible code candidate；不預設 PostgreSQL enum，語意改變不得原地重寫歷史 code。Stage 1 lifecycle 的產品語意僅為 DRAFT／ABANDONED，正式 machine code 與 check constraint 留待後續。
- Free text：有明確長度、用途與敏感度上限的 `text` candidate；不使用無界 JSON 作 authoritative truth。
- Append-only：published Declaration、Decision 與已結束 mapping generation 禁止一般 UPDATE／DELETE；修正以新 row 表達。
- Actor attribution：歷史永遠指向 stable Actor，不依賴 Auth account 存活。
- Current facts：由有效 interval、lifecycle 與 append-only history 推導；不得另存可任意修改的 duplicate truth。
- Direct writes：`anon` 不可直接寫任何 Foundation table；`authenticated` 亦不得直接執行高風險 lifecycle、mapping、Decision 或 minimization 寫入。

## 4. Seven-table proposed schema matrix

### 4.1 `public.winwin_actor_references` — PROPOSED

| Dimension | Proposed design |
|---|---|
| Responsibility | 提供不依附 Auth account 的 stable actor attribution；不是登入帳號、Person registry 或權限來源 |
| Candidate PK | `actor_ref_id uuid`，opaque、不可由自然人欄位推導 |
| Candidate FKs | 無必須上游 FK；由 account link、Case、Declaration、Decision 引用 |
| Required fields | `actor_ref_id`、`actor_kind_code text`、最低必要且非驗證性的 `fallback_display_label text`、`created_at timestamptz` |
| Nullable fields | 不保存 Email、證件、Auth metadata 或 Auth profile 複本；Stage 1 不需要 current account hint |
| Lifecycle／immutability | Stable Actor ID 才是歷史歸屬；identity 與 created time immutable。修改 fallback label 不改變既有事件的 actor identity；point-in-time label snapshot Deferred 至 Audit／Content stage |
| Unique／checks | PK；actor kind allow-list candidate；label 非空且具長度上限 |
| Time／clock | `created_at` 由 database clock；不接受 client 自報建立時間 |
| Deletion／Auth deletion | 不因 Auth delete cascade；已有引用後不 hard delete；保留最低 attribution |
| Sensitivity | Identity／pseudonymous historical attribution |
| Candidate indexes | PK；必要時 actor kind＋created time 供受控營運查詢，不支援自然人搜尋 |
| RLS inputs | 只作 attribution；必須經 active Auth mapping 或 Case governance path 才能顯示 |
| Never authorization | actor kind、fallback label、曾經建立 Case 均不能授權；label 不證明法律姓名、專業資格或真人驗證，也不得用於跨 Case matching／relink |
| Direct-write／transaction | 一般 client 禁止；first-login controlled operation 可 idempotently 建立 |
| Failure／rollback | mapping 建立失敗時 actor 不取得 access；孤立 actor 由受控 reconciliation 處理，不自動重連 |
| Duplicate-truth risk | current profile／Auth metadata 與 historical label 混用；禁止以任一方覆寫另一方歷史 |

### 4.2 `public.winwin_account_actor_links` — PROPOSED

| Dimension | Proposed design |
|---|---|
| Responsibility | 保存 Auth account 與 stable Actor 的每一段 mapping generation |
| Candidate PK | `account_actor_link_id uuid` |
| Candidate FKs | `actor_ref_id` → actor；`auth_user_id uuid` logical reference to platform Auth，FK feasibility 待安全審查 |
| Required fields | link ID、actor、Auth user reference、`generation_no bigint`、`linked_at timestamptz`、`link_status_code text`、idempotency／operation key candidate |
| Nullable fields | `ended_at timestamptz`、`end_reason_code text`、最低非敏感 correlation reference；只在 link 尚未結束時為 null。不得保存 Email、電話、姓名或 Auth metadata 作 detachment evidence |
| Lifecycle／immutability | 每次 relink 新 row；已結束 generation 不重新啟用、不覆寫 actor／account／linked time |
| Unique candidates | 同一 Auth user 同時最多一條 active link；同一 Actor 同時最多一條 active link；actor＋generation 唯一 |
| Checks | ended time 不早於 linked time；active 與 ended fields 一致；generation 正值 |
| Time／clock | linked／ended time 使用 database clock；有效性不能只依 application clock |
| FK／detachment alternatives | CASCADE rejected；strict FK 可能被平台刪帳阻擋；nullable Auth reference 會降低追溯。產品決策是終止 current generation、保留 stable Actor 與最低 link history；FK action、nullable Auth reference 與受控 detachment transaction 留待 Security／Migration Review |
| Deletion／privacy | 關閉 link 而非刪除 Actor；Auth reference 的保存／雜湊／清除方式需 Privacy Review |
| Sensitivity | Authentication linkage；不得存 Email 或 token |
| Candidate indexes | active lookup by Auth user；active lookup by actor；actor generation history；ended rows retention query |
| RLS inputs | current Auth → exactly one active Actor mapping，是身份解析 input，不是 Case access |
| Never authorization | historical link、ended link、相同 Email／metadata、actor 曾參與均不能授權 |
| Direct-write／locking | 只允許 controlled identity operation；建立／close／relink 需鎖定相關 Auth user 與 actor uniqueness domain |
| Retry／rollback | idempotency key 防重；衝突、Auth delete race 或 detachment 未完整完成時 fail closed，不建立第二條 active link，也不保留可用登入路徑 |
| Duplicate-truth risk | actor 主表不得另存 mutable current Auth link；current mapping 只由 link generations 推導 |

### 4.3 `public.winwin_person_references` — PROPOSED

| Dimension | Proposed design |
|---|---|
| Responsibility | 保存單一 Care Case 內最低必要的 Care Recipient person reference；不是全平台真人主檔 |
| Candidate PK | `person_ref_id uuid` |
| Candidate FKs | `case_id` → proposed Case；循環建立需由 DRAFT transaction 或 deferrable integrity strategy 後續決定 |
| Required fields | person ID、owning Case、created／governance time；DRAFT lifecycle 下最低 `display_name／preferred_label text` 與 `source_nature_code text` candidate required |
| Nullable fields | display label 與 source nature 採 lifecycle-conditional nullable：ABANDONED 後 display label 必須為 null（推薦），source nature 若非最低 retention fact亦清除；Stage 1 不納入身分證、完整生日、地址、電話、Email、健康資料、診斷、證件影像或跨 Case matching attributes |
| Lifecycle／immutability | row 與 opaque ID 保留以維持 FK／scope integrity，永不跨 Case 移動／merge；abandonment 時清除 display label 與非必要輸入，只保留 Case、created time 及最低 redaction／retention metadata |
| Unique／checks | 不以任何自然屬性作 unique；Case 1:1 candidate 與 Recipient Role constraint 合作；display label 長度限制；source nature 明確標示聲明／未驗證性質 |
| Time／clock | created／minimized time 由 database clock |
| Deletion／retention | 合法 abandonment 不刪 row；清除不必要識別 payload且不得使用假姓名替代；最低 opaque correlation 的期限待 Legal／Privacy Review |
| Auth deletion | 無 Auth ownership；高齡者可以沒有 Account Identity |
| Sensitivity | Direct identifier；不得進入未授權搜尋、計數或提示 |
| Candidate indexes | owning Case lookup；不建立跨 Case natural-person matching index |
| RLS inputs | same-Case consistency 可作 narrow helper fact；Person Reference 本身不授權 |
| Direct-write／transaction | 只在 DRAFT creation／abandonment controlled transaction 寫入 |
| Failure／rollback | Case／Person／Recipient 三者任一失敗全部不成立；minimization 失敗則 Case 保持 fail-closed |
| Duplicate-truth risk | recipient display data 不得同時在 Case 或 Role 保存另一份 authoritative copy |

### 4.4 `public.winwin_cases` — PROPOSED

| Dimension | Proposed design |
|---|---|
| Responsibility | Care Case 的 stable lifecycle root；Stage 1 只容納受限 DRAFT 與不可協作的終止／hold 語意 |
| Candidate PK | `case_id uuid` |
| Candidate FKs | `created_by_actor_ref_id` → actor；不 FK 到 creator Auth account |
| Required fields | Case ID、`lifecycle_code text` candidate、creator actor、`created_at timestamptz` |
| Nullable fields | `abandoned_at`、`abandonment_reason_code`、minimum operation correlation candidate；只在相應 lifecycle 使用 |
| Lifecycle representation | Stage 1 產品 vocabulary 僅允許 **DRAFT** 與 **ABANDONED**。ACTIVE、SUSPENDED 或其他協作狀態不得出現；rejected／revoked／disputed 只存在 Authorization Decision history，不複製為 Case lifecycle truth |
| Immutable／append-only | Case ID、creator、created time immutable；lifecycle transition 只透過 controlled operation；authorization current truth 不存於 Case |
| Unique／checks | PK；Stage 1 lifecycle allow-list candidate 僅 DRAFT／ABANDONED；abandonment fields 與 lifecycle 一致；不得用 creator 作 governance unique。正式 machine code／check／transition implementation Deferred |
| Time／clock | lifecycle transition time 使用 database clock |
| Deletion／tombstone | abandonment 後不可恢復或協作；只保留 opaque Case ref、creator、created／abandoned time、reason category、operation correlation |
| Auth deletion | creator account 刪除不刪 Case；mapping 失效後 creator 不再能登入存取 |
| Sensitivity | Case existence 與 governance metadata；搜尋本身可洩漏個案存在 |
| Candidate indexes | creator actor＋DRAFT lifecycle 供本人最低 self-service；lifecycle＋created time 供受控 cleanup；不得作一般 workspace index |
| RLS inputs | DRAFT lifecycle＋current mapped creator 可支援最低 self-service；不授予正式內容或治理權 |
| Never authorization | creator、authorization accepted、Case existence、historical access 均不能單獨授權 |
| Direct-write／transaction | client 禁止直接改 lifecycle；create／abandon／decision correlation 使用 controlled operation |
| Failure／rollback | partial DRAFT creation 必須 rollback；abandonment 部分最小化失敗時不宣稱完成 |
| Duplicate-truth risk | 不存 mutable `authorization_status`、`is_governor` 或 fake Membership／Grant placeholder |

### 4.5 `public.winwin_care_recipient_roles` — PROPOSED

| Dimension | Proposed design |
|---|---|
| Responsibility | 表達某 Case 的唯一 Care Recipient Role，與 Person Reference 及 Account Identity 分離 |
| Candidate PK | `care_recipient_role_id uuid` |
| Candidate FKs | `case_id` → Case；`person_ref_id` → Person Reference；需保證 Person owning Case 相同 |
| Required fields | role ID、Case、Person Reference、`established_at timestamptz` |
| Nullable fields | `ended_at timestamptz`、`end_reason_code text`；只在 current Role 尚有效時為 null。Stage 1 不需要 account link 或 replacement fields |
| Lifecycle／immutability | 建立後不可一般 UPDATE 更換 Person；可使用的非 ABANDONED Case 恰好一個有效 Role。ABANDONED Case 保留同一 row、Case／Person FKs與已結束歷史，不改指向其他 Person |
| Unique／checks | Case unique；Person＋Case same-scope 需 composite integrity 或 transaction；不得跨 Case unique Person；ended fields 與 Case／Role lifecycle 一致 |
| Time／clock | established time 使用 database clock |
| Deletion／retention | 合法 abandonment 不刪 row；結束 current lifecycle，保存 ended time／受控 reason，不再視為有效 Recipient Role且不授權 |
| Auth deletion | 不依附 Auth；Care Recipient 可沒有帳號 |
| Sensitivity | recipient identity linkage |
| Candidate indexes | unique Case lookup；Person reference integrity lookup |
| RLS inputs | same-scope validation；Role 存在本身不能授權或產生 Care Circle |
| Direct-write／transaction | 與 Case＋Person 建立原子成立；client 不得單獨 insert／replace |
| Failure／rollback | same-scope 或 uniqueness 失敗時整個 DRAFT creation rollback |
| Duplicate-truth risk | 不在 Role 重複 display profile、Account Identity 或 access facts |

### 4.6 `public.winwin_authorization_declarations` — PROPOSED

| Dimension | Proposed design |
|---|---|
| Responsibility | 保存使用者提出的授權聲明 generation／version，不證明法律代理、同意權或專業驗證 |
| Candidate PK | `authorization_declaration_id uuid` |
| Candidate FKs | `case_id` → Case；`declared_by_actor_ref_id` → actor；`supersedes_declaration_id` self-reference candidate |
| Required fields | declaration ID、Case、declarant stable Actor、`declaration_family_id uuid` candidate、generation／`version_no bigint`、controlled declaration basis／type、purpose、Acting Context、最低必要 statement、`published_at` database time、idempotency evidence |
| Nullable fields | supersedes ID、可選短理由／說明；第一版不保存附件或證件，不得以 null 或自由文字隱含 accepted |
| Lifecycle／immutability | 只有使用者明確送出並通過受控 transaction 後才產生 published append-only row；未送出的前端／Prototype form 不是 Declaration。修正建立新 generation，不原地改回有效。新 generation 成功發布即使 predecessor 失去 current-governance 效力 |
| Unique／checks | family＋database-controlled generation order unique；supersedes 必須是同 Case／family 當時唯一 current generation，形成單一線性 lineage；order 正值、不重用；minimum statement 非空；purpose 必須受控 |
| Time／clock | published／recorded time 使用 database clock；client／device time 不決定 publication 或 current authorization order |
| Deletion／retention | 保留 lineage；abandonment／rejection 後的保存與最小化需 Legal／Privacy Review |
| Auth deletion | declarant account delete 不移除 stable actor attribution 或聲明 |
| Sensitivity | legal／authorization claim；可能包含關係與最低個資，禁止健康細節擴張 |
| Candidate indexes | Case＋family＋version；declarant own-history；受控 pending-review query，不提供全域搜尋 |
| RLS inputs | own declaration 與 assigned minimum governance relationship；Declaration existence／author 不授權 Case content |
| Direct-write／transaction | publication 必須走 controlled transaction；version／lineage、actor、Acting Context、database time 與 idempotency 一起驗證。是否建立 server-side draft Deferred，不能偷渡進 7-table scope |
| Failure／rollback | publication 鎖定 family、驗證唯一 current head、建立下一 order並指向 predecessor；branch／cycle／missing predecessor／duplicate order 一律 rollback and fail closed；retry 回傳同一結果或明確失敗 |
| Duplicate-truth risk | 不存 mutable `current_declaration` marker；唯一 current generation 由合法線性 lineage＋generation order 推導。不同 generations 的 Decision order 不互相比較 |

### 4.7 `public.winwin_authorization_decisions` — PROPOSED

| Dimension | Proposed design |
|---|---|
| Responsibility | 追加保存針對 Declaration 的 accepted／rejected／revoked／disputed／recovery 等治理決定歷史 |
| Candidate PK | `authorization_decision_id uuid` |
| Candidate FKs | Declaration、Case、decision actor；optional prior decision self-reference；Case 必須與 Declaration 一致 |
| Required fields | decision ID、Declaration、Case、decision actor、每份 Declaration scope 的 `decision_order bigint` candidate、decision meaning code、reason category、`decided_at`／`recorded_at`、Acting Context minimum、idempotency key candidate |
| Nullable fields | prior decision ID、最低必要 reason detail；不得以 null 表示 current／accepted |
| Product vs schema meaning | Accepted／Rejected／Revoked／Disputed 是產品需求語意；實際 machine codes、可轉換集合與恢復語意仍為 Schema Product Decision |
| Lifecycle／immutability | 全部 append-only；先解析 family 唯一 current Declaration generation，再只在該 generation 內解析最高有效 decision order。新 generation 未有 Accepted Decision 時 fail closed，絕不沿用 predecessor 的 Accepted Decision。Recovery 只追加新 generation 或修正 Decision |
| Unique／checks | Case／Declaration consistency；同一 Declaration 的 decision order 唯一、正向單調、不重複、不重用；sequence gap 合法；prior decision 同治理範圍；meaning／reason 合法 |
| Time／clock | database-controlled decision order 是 concurrency truth；client timestamp、裝置時間與 `created_at` 不單獨作排序／tie breaker；recorded time 使用 database clock |
| Deletion／retention | 不覆寫或 hard delete既有決定；retention／erasure 需 Legal／Privacy Review |
| Auth deletion | decision actor attribution 保留；帳號刪除不撤銷歷史決定，但可能影響未來 reviewer eligibility |
| Sensitivity | authorization／dispute outcome；對 declarant 僅顯示政策允許的最低結果 |
| Candidate indexes | Declaration／family＋decision order；Case current prerequisite derivation；assigned reviewer queue |
| RLS inputs | narrow decision ownership／review assignment；只有 current generation 內最高有效 Decision 為 Accepted，authorization prerequisite 才成立，但仍不能單獨授權 |
| Direct-write／locking | client direct write 禁止；controlled reviewer operation 由 database 配發 order、驗證 capability／scope、鎖定或序列化相同 Declaration decision stream |
| Retry／rollback | idempotency boundary 防止語意重複；同時矛盾決定必須序列化或拒絕；sequence gap 不補號、不改寫歷史；任何失敗不得留下半筆 current marker |
| Duplicate-truth risk | Case、Declaration 不存可改寫 current authorization status；projection 必須依「current generation → current Decision → meaning」唯一重建，禁止混合 generation order 與 decision order |

### 4.8 Unique current-authorization derivation

每個 Declaration 必須屬於明確的 `declaration_family_id`。Family 內使用 database-controlled、單調遞增且不重用的 generation order；發布操作鎖定同一 family、驗證當時唯一 current generation、建立下一 order 並以 `supersedes` 指向 predecessor。成功後形成單一線性 lineage，新 generation 立即成為唯一 current generation，舊 generation 只保留歷史。

唯一推導順序是：

```text
resolve exactly one valid current Declaration generation
→ resolve the highest valid database-controlled Decision order inside that generation
→ authorization prerequisite is true only when that Decision means Accepted
```

- 新 generation 尚無 Decision 或最高有效 Decision 為 Rejected、Revoked、Disputed／abandonment terminal meaning 時，authorization prerequisite＝false。
- 不得暫時沿用 predecessor generation 的 Accepted Decision。
- 舊 generation 後續追加或重試 Decision，只能補充該 generation 歷史，不能超越或取代 current generation。
- 不同 generations 的 Decision order 不互相比較；generation order 與 decision order 不合併成單一排序。
- `created_at`、client timestamp、裝置時間均不決定 current generation 或 current Decision。
- Generation／Decision sequence gap 可存在，但號碼不可重用，歷史不可為補號而修改。
- 多個 lineage heads、branch、cycle、missing predecessor、duplicate generation／Decision order 或 Case／family scope mismatch 任一出現，推導必須 fail closed。
- 修復只能追加新的合法 generation 或 Decision；正式 constraint、sequence、locking、idempotency、recovery SQL 留待 Migration／Concurrency Review。

## 5. DRAFT abandonment without an eighth table

### 5.1 Compared representations

| Alternative | Benefit | Risk | Disposition |
|---|---|---|---|
| Case lifecycle fields＋minimum tombstone | 不新增 table，能表達不可恢復 abandonment | Case 欄位若擴張會變成 Audit substitute | **Recommended with strict field allow-list** |
| Authorization／Decision history only | 保留治理理由 | 無法單獨表達草稿 payload 已最小化與 Case 不可恢復 | Insufficient alone |
| 專屬大量治理欄位塞入 Case | 查詢簡單 | 重複 Declaration／Decision truth，形成 mutable audit blob | Rejected |

### 5.2 Proposed invariant

- 只有從未啟用、沒有 Invitation、Membership、Relationship、Grant、分享或正式內容的 DRAFT 才可放棄。
- Stage 1 雖尚無上述 tables，controlled abandonment 仍須以 authoritative schema inventory／dependency checks fail closed；不能把「table 尚未存在」永遠寫死為 eligibility。
- 放棄後 lifecycle＝ABANDONED，不可搜尋、協作、恢復或進入 Stage 2 activation；新需求建立新的 Case。
- Tombstone 最多保留 opaque Case ID、creator stable Actor ID、created／abandoned time、受控非敏感 reason code 與最低 transaction／correlation reference。必須移除或停止揭露不必要的 Person display data、未發布聲明內容、健康／照顧草稿及可推測高齡者身分的非必要資訊。
- 保存期限與可清除範圍需 Legal／Privacy Review；不得用通用 Audit table 偷渡 Stage 1。

### 5.3 Abandonment disposition matrix

| Related fact | Retain | Minimize／end／remove | Visibility after abandonment | Integrity result |
|---|---|---|---|---|
| `winwin_cases` | same row、opaque Case ID、creator Actor、created／abandoned times、non-sensitive reason code、minimum idempotency／correlation、ABANDONED lifecycle | 移除或停止保存一般顯示名稱與非必要 draft payload | creator 只見最低 abandonment confirmation；不得搜尋、恢復、邀請、分享、activation 或協作 | Case PK 保留，作其他歷史 FK root |
| `winwin_person_references` | same row、opaque Person ID、Case ID、created time、minimum redaction／retention metadata | display label 設為 null；清除所有非必要使用者輸入，不使用假姓名或可逆 tombstone value | 一般 UI／self-service 不揭露 | Case FK 與 Recipient Role FK 維持完整 |
| `winwin_care_recipient_roles` | same row、Case／Person FKs、established time、ended time／reason | 結束 current role lifecycle；不改指其他 Person | 不再是 current Recipient Role，不授權 | ABANDONED Case 保留一筆 ended historical Role；「恰好一個有效 Role」只適用非 ABANDONED 可使用 Case |
| `winwin_authorization_declarations` | 所有已發布 append-only generations與最低既有結構化治理內容 | 不修改／redact published row；第一版原本即禁止附件、證件、健康資訊，短文字受長度與 retention review | 停止一般 UI／self-service 內容揭露；不再作 current prerequisite | Lineage／FK 保留；minimum Case tombstone 不表示可刪治理歷史 |
| `winwin_authorization_decisions` | 全部 published Decisions、orders、Actor、Acting Context、times、lineage | 對仍可能形成 prerequisite 的每個 current generation追加唯一、idempotent terminal abandonment Decision；不改舊 Decision | 一般流程不揭露，只有依法授權的最低治理／retention context | Terminal meaning 使 prerequisite fail closed，history／FK 保留 |
| Unpublished form／temporary state | none | client／temporary state 全部清除；未來 server-side draft 另行設計 | 不可被 RLS、current authorization 或治理流程引用 | 不屬於 7-table authoritative schema |
| `winwin_actor_references`／`winwin_account_actor_links` | 不因 Case abandonment 改寫；保留既有 Actor attribution／mapping lifecycle | 無 Case-specific payload 可清除 | 仍只依自身 mapping 與其他合法 path 顯示 | 不從 abandonment 產生或延長 access |

### 5.4 Candidate abandonment transaction order

1. 鎖定 Care Case。
2. 重驗 lifecycle＝DRAFT 且從未 activation。
3. 驗證不存在 Invitation、Membership、Relationship、Grant、分享或正式協作內容。
4. 鎖定相關 Declaration families 與唯一 current heads；若 lineage 不合法即 fail closed。
5. 對每個仍可能形成 current prerequisite 的 current generation，追加一筆受控、idempotent terminal abandonment Decision。
6. 結束 Care Recipient Role，保存 ended time／reason，不刪除或改指 FK。
7. 將 Person Reference display label 設為 null，清除非必要輸入並保留 opaque scope facts。
8. 將 Case 轉為 ABANDONED minimum tombstone。
9. 清除非 authoritative 的未發布 form／temporary state。
10. Commit 前重驗所有 postconditions；任一步失敗，整筆 rollback。

Transaction 不得留下：ABANDONED 但仍有 current authorization、Person 已清除而 FK 失效、current Recipient Role 仍有效、部分 terminal Decisions、或可恢復／協作的 abandoned Case。

### 5.5 Required postconditions

- Case lifecycle＝ABANDONED。
- Current authorization prerequisite＝false。
- Current Recipient Role＝none；ended historical Role 仍存在。
- Person display label 與非必要輸入已清除，Case／Person／Recipient FKs 完整。
- Published Declaration／Decision history仍存在，但不供一般 UI／self-service 揭露。
- 未發布 form／temporary content 不存在。
- Case 不可恢復、邀請、分享、activation 或協作；creator 只能取得最低 abandonment confirmation。
- Legal／Privacy retention 與最終清除方式仍為 Expert dependency。

## 6. Constraint／transaction／concurrency matrix

| Rule | Single-table constraint | Cross-table transaction | DB clock | Lock／serialization | RLS／helper | Controlled RPC candidate | App／expert dependency |
|---|---|---|---|---|---|---|---|
| Auth account active link uniqueness | partial unique candidate | create／close link | yes | lock Auth identity domain | current actor resolver | identity link operation | recovery evidence |
| Actor active link uniqueness | partial unique candidate | create／relink | yes | lock Actor domain | current actor resolver | identity relink | privacy／identity policy |
| Case DRAFT-only | only DRAFT／ABANDONED candidate | reject activation | transition time | Case row lock | DRAFT-only helper | create／abandon DRAFT | no Active／Suspended UI |
| Case／Person／Recipient same-scope | FK alone may be insufficient | create three facts atomically | created time | Case scope lock | no access from Person | create DRAFT | none |
| One Recipient Role per Case | unique Case candidate | create／governed correction | established time | Case scope lock | role is not access | create DRAFT | dispute process |
| Declaration append-only | update／delete deny candidate | lineage validation | recorded time | declaration family lock | own minimum view | publish declaration | evidence policy |
| Current Declaration generation | family＋generation order unique | publish next linear head | publication time | lock family／head | ambiguity fails closed | publish declaration | lineage recovery adds generation |
| Decision append-only | update／delete deny candidate | target／Case validation | recorded time | decision stream lock | narrow result helper | append decision | reviewer eligibility |
| Decision ordering | order unique per Declaration | database allocate＋insert | not wall-clock ordering | same Declaration serialization | current prerequisite helper | append decision | recovery adds Decision |
| Current authorization derived | no mutable current column | first current generation, then its latest Decision | neither client nor wall-clock ordering | consistent family＋Decision read | narrow derivation／ambiguity fail closed | none necessarily | legal meaning |
| DRAFT collaboration prohibition | no Active code in Stage 1 | reject dependent writes | no | Case lock where needed | no content path | no collaboration RPC | UI truthfulness |
| Abandonment eligibility／completion | lifecycle／ended-field checks insufficient alone | verify dependencies＋terminal Decisions＋end Role＋redact Person＋tombstone | abandoned／ended times | Case＋family heads＋Role scope locks | restricted cleanup／postcondition check | abandon DRAFT | retention／erasure |
| Auth deletion fail-closed | no cascade | close／invalidate mapping | ended time | Auth＋Actor race control | no mapping＝no actor | unlink hook／operation | platform Auth behavior |
| Retry／idempotency | operation key unique candidates | replay-safe result | recorded time | conflict handling | no information leak | all controlled writes | client retry contract |
| Concurrent declaration writes | family＋version unique | explicit publication＋lineage append | database publication time | family serialization | unpublished form is no RLS fact | publish declaration | conflict UX |
| Concurrent decision writes | order unique | append＋derive | recorded time only | stream serialization | reviewer check | append decision | contradictory decision policy |
| Stage 2 activation dependency | ACTIVE unavailable Stage 1 | activation＋Membership＋Relationship＋Grant＋capability | validity clock | Case／governance locks | complete Grant Path | Stage 2 only | last-governor policy |

這 17 項只分配未來 enforcement responsibility，不宣稱 constraint、RPC、helper 或 lock 已存在。

## 7. RLS and ACL design inputs（no policies）

### 7.1 Facts that may participate in Stage 1 RLS

- current authenticated Auth reference → exactly one active Actor mapping；
- Case 的 DRAFT／不可協作 lifecycle；
- mapped Actor 與 DRAFT creator attribution，用於最低 self-service；
- Person／Recipient／Case same-scope consistency；
- Declaration author、Decision target 與受控 reviewer assignment，只用於最低治理視圖。
- Acting Context 只作 attribution／purpose context；不是 Grant path 或獨立 access fact。

### 7.2 Facts that never authorize by themselves

- creator 身分；
- Person Reference 或 Care Recipient Role；
- authorization accepted；
- Declaration／Decision author；
- historical participation；
- UI role、Care Circle 或未來治理資格。

### 7.3 Direct-write and elevated-context boundary

- `anon`：所有 7 tables direct write 預設禁止；未登入只可看不洩漏 Case 的一般指引。
- `authenticated`：不得直接建立 Actor mapping、改 Case lifecycle、替換 Recipient、raw insert Declaration、append Decision 或執行 abandonment。Declaration publication 必須走 controlled operation，以統一 lineage、Acting Context、database time 與 idempotency。
- 高風險 controlled RPC candidate：first-login mapping、DRAFT creation、Declaration publication、Decision append、Auth unlink／relink、DRAFT abandonment。此清單不等於 RPC 已核准。
- `FORCE RLS` 不限制 BYPASSRLS 或符合條件的 owner context；service／operator role 仍需 ACL、runbook 與獨立測試。
- 若未來使用 `SECURITY DEFINER`，owner 不得是可被 client 控制的角色，必須固定安全 `search_path`、完整 schema qualification、撤銷 PUBLIC EXECUTE、最小授權並測試 spoofing／recursion。
- Helper 只讀窄 Foundation facts、回傳 boolean／最低結果，不回傳隱藏 rows／counts；dependency cycle 或 ambiguity 一律 fail closed。
- ABANDONED Case 的一般 UI／self-service 只能回傳最低 abandonment confirmation；不得透過 Person、ended Role、published Declaration／Decision 的 rows、文字、counts或 search hints 揭露歷史內容。

## 8. Stage 2 compatibility boundary

Stage 2 可新增 Invitation、Membership Generation、Relationship Generation、Grant Generation 與 capability vocabulary，但不得改寫 Stage 1 actor、mapping、Case、Person、Recipient、Declaration 或 Decision 歷史。

Activation 的未來原子 invariant：

```text
accepted current authorization prerequisite
AND effective Membership Generation
AND effective Relationship Generation
AND effective governance Grant Generation
AND required governance capability
AND one complete non-stitched Grant Path
AND Case lifecycle transition to ACTIVE
```

整組事實必須在同一受控 transaction 成立；否則全部不成立。禁止 ACTIVE Case 沒有有效治理者。Stage 1 不建立 fake Membership／Grant placeholder，也不以 creator、accepted Decision 或 Care Recipient Role 模擬治理 Grant。Stage 2 必須另做 last-governor、validity clock、locking、RLS 與 rollback Review。

## 9. Migration and existing-asset compatibility

- Migration 001–006 是「備份心」基線，不納入 WinWin Foundation。
- Migration 007／008 僅供 threat cases、local harness 與失權語意參考；沒有任何 object 或 SQL 獲准 byte-level reuse。
- `public.winwin_*` 與 `public.v2_*` 名稱可並存，但命名隔離不證明語意或安全相容。
- 預設不建立 bridge。若未來證明存在需遷移的 WinWin rows，必須另做 mapping review，限定單向、idempotent、可停止、可驗證、可回滾／forward-fix 且 fail-closed。
- 禁止 dual write；未能明確 mapping 的 row 不得 backfill、關聯 Actor 或建立 access。
- 本文件未修改、取代或授權 Migration 001–008，也未建立 Production authority。

## 10. Walkthroughs and failure boundaries

### 10.1 First login and DRAFT creation

受控 identity operation 建立／取得唯一 active Actor mapping；受控 DRAFT transaction 同時建立 Case、Case-scoped Person Reference 與唯一 Recipient Role。任何 uniqueness、scope 或 retry 衝突均 rollback。建立者只獲最低 DRAFT self-service，不是 governor。

### 10.2 Declaration and Decision

使用者以受控 transaction 發布線性 lineage 的下一個 Declaration generation；它立即成為唯一 current generation，舊 generation 只保留歷史。新 generation 尚未取得 Accepted Decision 時 prerequisite fail closed。受控 reviewer 只看最低治理 context並在該 generation 追加 Decision。Accepted 仍不顯示 Care Circle、不建立 Invitation／Membership／Relationship／Grant、不允許內容存取或 activation。

### 10.3 Auth deletion

Auth mapping 終止或失效，Stable Actor、Case、Declaration 與 Decision attribution 保留。沒有 active mapping 即無 authenticated actor path；同 Email 或 metadata 的新帳號不得接管。

### 10.4 DRAFT abandonment

Transaction 鎖定 Case 與 Declaration family heads、重驗從未 collaborative、追加 terminal abandonment Decisions、結束 Recipient Role、將 Person label 設為 null、留下 Case minimum tombstone並清除未發布 form。全部 postconditions 同時成立才 commit；完成後不可搜尋、恢復或啟用原 Case。

### 10.5 Future activation

Stage 2 只能在 accepted prerequisite 與第一組完整治理 Membership／Relationship／Grant path 同時成立時 activation。任何一項缺失都不得產生 ACTIVE Case。

## 11. Decision inventory

### 11.1 Accepted for Foundation Schema direction

- Option B：normalized stable entities＋append-only generation／decision history。
- 7-table、DRAFT-only boundary；Care Circle authoritative table＝0。
- Stage 1 Case lifecycle 僅 DRAFT／ABANDONED；authorization outcomes 不複製到 Case lifecycle。
- Stable Actor 與 Auth mapping generations 分離；fallback label 非驗證且不授權；Auth deletion 終止 link、non-cascade and fail-closed。
- Case-scoped Person Reference 只保存最低 display label、scope、來源性質與治理時間；與唯一 Recipient Role 分離。
- Declaration 只有明確發布後才存在，採 generation／append-only；Decision 依每份 Declaration 的 database-controlled monotonic order 追加；current authorization derived。
- DRAFT abandonment 使用 Case minimum tombstone，不新增通用 Audit table，並移除不必要的 Person／未發布／健康草稿資料。
- Stage 2 activation 必須與第一條完整治理 path 原子成立。

### 11.2 Foundation Schema Product Decision Log

| ID | Disposition | Accepted decision | Still Deferred／dependency |
|---|---|---|---|
| FND-SCHEMA-PD-01 | **Accepted with Stage 1 restriction** | Case lifecycle 只允許 DRAFT／ABANDONED；ACTIVE、SUSPENDED 與 authorization outcomes 不進 Case lifecycle；ABANDONED 不可恢復 | 正式 codes、checks、transition implementation |
| FND-SCHEMA-PD-02 | **Accepted with attribution constraints** | Stable Actor ID 是歸屬；只保存最低非驗證 fallback label，不授權、不 matching、不 relink；point-in-time label snapshot Deferred | Audit／Content stage snapshot decision |
| FND-SCHEMA-PD-03 | **Accepted with fail-closed detachment** | Auth delete／unlink 終止 current generation並保留最低 link history；不保存 Email／metadata、不自動 relink；失敗即 fail closed | FK action、nullable reference、detachment transaction security |
| FND-SCHEMA-PD-04 | **Accepted — minimum Case-scoped Person Reference** | 只保存 Case display label、scope、source nature、必要治理時間；不納入證件、生日、聯絡方式、地址、健康／診斷或 matching attributes | 若場域要求額外欄位，另做 Privacy／Purpose／Retention Review |
| FND-SCHEMA-PD-05 | **Accepted with minimum structured declaration** | 受控 basis／type、Actor、Acting Context、Case、generation、database publication time、最低 statement及可選短理由；無附件；文字不是授權演算法主依據 | 正式 vocabulary 需臺灣長照／法律確認 |
| FND-SCHEMA-PD-06 | **Accepted with database-controlled ordering** | Family 使用 database-controlled monotonic generation order＋single linear head；先解析 current generation，再解析其內最高有效 Decision。新 generation 未 Accepted、terminal／negative／missing Decision或 lineage ambiguity均 fail closed；orders 不跨層比較；retry idempotent、並行序列化、recovery 只追加 | sequence、locking、transaction、idempotency implementation |
| FND-SCHEMA-PD-07 | **Accepted — explicit publication boundary** | 只有明確送出且受控 transaction 成功才建立 immutable Declaration generation；未送出 form 不是治理／RLS fact；修正建新 generation | server-side declaration draft 另行設計，不納入 7-table scope |
| FND-SCHEMA-PD-08 | **Accepted with minimum tombstone** | 不新增 table；保留 Case／Person／ended Recipient Role rows與必要 published Declaration／Decision history；transaction 先追加 terminal Decisions、結束 Role、null Person label，再留下 Case tombstone並清除未發布／健康草稿；一般流程不揭露歷史 | retention 天數與最終清除責任需 Privacy／Legal Review |

FND-SCHEMA-PD-01 至 FND-SCHEMA-PD-08 各有唯一 accepted disposition；沒有 stale Schema product decision。這些決策不核准其 Deferred 技術實作，也不構成 Schema Freeze。

### 11.3 Requires Legal／Privacy／Field Review

- Authorization declaration／decision 的證據效力、reviewer eligibility、拒絕／撤回／爭議與恢復語意。
- Auth reference、identity recovery、deceased／incapacitated creator 與 disputed recipient handling。
- DRAFT tombstone、Person payload、Declaration／Decision 的 retention／erasure periods。
- 最低顯示名稱與聲明文字是否符合臺灣長照場域的 data-minimization 需求。

### 11.4 Requires Security Review

- Platform Auth FK／trigger／admin-delete race 與 active mapping uniqueness。
- Controlled writer ACL、RLS helper graph、owner／BYPASSRLS／FORCE RLS boundaries。
- SECURITY DEFINER owner、fixed `search_path`、PUBLIC EXECUTE revocation、schema spoofing 與 recursion tests。
- Idempotency keys、decision ordering、lock scope、concurrent writes、rollback and failure injection。

### 11.5 Deferred to Stage 2

Invitation、Membership Generation、Relationship Generation、professional verification integration、Role／Capability、Grant Generation、first governance path、Case activation、last-governor protection與 Care Circle projection。

### 11.6 Deferred to Migration Draft

正式 table／column names、PostgreSQL types、PK／FK actions、indexes、constraints、RLS policies、helper functions、RPC signatures、SQLSTATE、locking syntax、rollback scripts與 verification harness。Migration Draft 必須等 Schema Product Decisions、Security Review 與後續 Gate 通過。

## 12. Gate decision

**READY FOR FINAL READ-ONLY FOUNDATION SCHEMA REVIEW — BLOCKER CORRECTIONS COMPLETE**

- 7／7 proposed table matrices 完整；沒有第 8 張 included table。
- Stage 1 嚴格 DRAFT-only；Care Circle authoritative table＝0。
- Authorization accepted 只是 Stage 2 activation prerequisite。
- Stage 2 activation／first governance path atomicity 保持不變。
- FND-SCHEMA-PD-01 至 FND-SCHEMA-PD-08 已各有唯一 accepted disposition。
- Current authorization 具有唯一「current Declaration generation → current Decision → Accepted meaning」推導；任何 lineage／ordering ambiguity fail closed。
- Abandonment disposition、transaction order 與 postconditions 同時保留 FK／append-only history並完成資料最小化。
- Legal／Privacy／Field 與 Security dependencies 仍保留。
- Final Read-only Review 與獨立文件 checkpoint 尚未完成；不得自行宣告 Schema Freeze。
- Migration、SQL、RLS、RPC、API、Supabase、Production 與 deployment 全部 **BLOCKED**。

## 13. Explicit next step

下一步只能是 **Foundation Schema Final Read-only Review**：驗證八項 decisions、7-table matrices、DRAFT／ABANDONED lifecycle、append-only history、RLS／ACL inputs、Stage 2 atomic activation 與跨文件 non-regression。不得直接建立 Migration。

Final Review 通過並建立文件 checkpoint 後，才能判斷 Schema Freeze 與規劃 Migration Draft Gate；該 Gate 仍需另行授權，且不得跳過 RLS／ACL、Auth lifecycle、concurrency 與 local verification design。

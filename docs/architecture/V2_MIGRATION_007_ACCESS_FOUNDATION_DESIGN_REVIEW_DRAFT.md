# 備份心 v2 Migration 007 — Access Foundation Design Review

- **Status:** `PROPOSED DESIGN REVIEW`
- **Version:** `v2.0 Phase 0.4`
- **尚未建立 SQL**
- **尚未建立 RLS**
- **尚未操作 Supabase**
- **遠端 Production Schema 未重新驗證**
- **167 項測試尚未重跑**
- **不代表 Migration 已可執行**

> 本文件只固定 Migration 007 Access Foundation 的候選資料結構、constraint intent、交易責任、RLS 依賴方向、preflight 與 rollback 邊界。文中的候選表名、欄位與 RPC 名稱均非 SQL，不構成遠端變更授權。

## 1. Review 基線與嚴格邊界

### 1.1 本輪唯讀確認的 Repository 事實

- Branch 為 `codex/v2-proposed-pivot`，Review 起始 HEAD 為 `74af851a61239a4d95387bf87416f0288cb24468`
- Migration 001–006 已存在，v1 有十張 RLS tables 與三十八條 policies；本輪沒有重新連線驗證遠端
- v1 授權根為 `care_receivers.owner_user_id → auth.uid()`；下游 Task、Source、Assignment、Scenario、Handoff 透過 owner-chain 判定
- 現有 Auth lifecycle 會由 `auth.users` provision／sync `public.users`，且 `public.users.user_id` 對 Auth identity 使用 Cascade；v2 歷史不得依賴此 Cascade 作根
- v1 Task、Assignment、Backup、Handoff、Scenario 與 Coverage 的 TypeScript contracts 已存在，但不是 v2 Access Foundation contract
- README 與最後部署紀錄記載 App tests 167/167 通過；本輪未重跑，不能稱為本 Gate 已驗證
- Coverage Engine 文件與實作版本仍有 1.5-MVP／2.0-MVP 落差待盤點

### 1.2 Migration 007 只處理

- 獨立 v2 Case 核心與最小 Subject 資訊
- 與 Auth account 解耦的歷史 Actor Reference
- Authorization Declaration
- Invitation
- Case Membership
- Role Grant、固定 role/capability/purpose/scope vocabulary
- 個別專業服務有效期間
- DRAFT 建立者路徑、個案啟用與第一位管理者
- 最後一位管理者保護
- 到期、撤銷與即時失權
- 只支援上述 access lifecycle 的最小 append-only access event foundation

### 1.3 明確排除

Migration 007 不得提前加入 Care Update、Observation、Arrangement、Question、Answer、Action Item、Responsibility Cycle、Content Revision、Record Link、Case View Cursor、完整 Audit Event、PDF／列印、AI、Coverage／Scenario 回接、組織後台或正式專業身分驗證。

Access event foundation 只保存授權聲明、個案狀態、邀請、Membership、Grant、管理者移轉與撤銷／到期所需的最小治理事件；不得預建內容事件、閱讀事件或通用 polymorphic Audit 平台。

## 2. Access Foundation 候選方案

### 2.1 方案 M：最小合併方案

候選七表：

1. `v2_actor_references`
2. `v2_cases`（包含最小 Case Subject 欄位）
3. `v2_authorization_declarations`
4. `v2_invitations`
5. `v2_case_memberships`（包含專業服務聲明與有效期間）
6. `v2_role_grants`
7. `v2_access_events`

合併決策：

- Case Subject 的 nickname／display label 與「未驗證」標記放入 Case；第一版一 Case 只有一 Subject，不另建真人主檔
- Professional Service Relationship 放入 Membership 的 relationship kind、unverified organization/title 與 service period；不建 Organization
- Role capability 由固定 role template vocabulary 派生；Grant 明確保存 role、purpose、scope ceiling、validity，不使用任意 ACL JSON
- Actor Reference 必須獨立，不能合併進 Case 或 `public.users`
- Access Event 只保存 Access Foundation 事件，不提前成為完整 Audit 平台

### 2.2 方案 N：正規化方案

候選十一至十三表：Actor Reference、Account Link、Care Case、Case Subject、Authorization Declaration、Invitation、Membership、Role Grant、Role Capability、Professional Service Relationship、Organization Statement、Access Event，並可能另拆 Manager Transfer。

優點：

- Account link、Subject、服務關係、能力 vocabulary 都有獨立生命週期
- 多個 Auth provider、專業續約、跨機構歷史較清楚
- capability 可逐項授予，長期彈性較高

成本：

- RLS query 至少增加 Account Link、Capability join 及 Service Relationship join
- 第一條 Prototype 尚無正式機構驗證，拆表只會保存更多未驗證聲明
- 任意 capability row 容易演變為不可維護 ACL，且跨 grant 拼接風險上升
- Migration、fixture、A/B isolation 與 rollback 測試量明顯增加

### 2.3 比較

| 面向 | 方案 M：7 表 | 方案 N：11–13 表 |
|---|---|---|
| RLS join 深度 | account → actor → membership → one grant → case | 再加 account link、capability、service relationship |
| 權限可強制性 | 足夠，前提是固定 vocabulary 與單一 grant path | 細緻，但更容易錯誤 union capabilities |
| 帳號刪除安全 | 獨立 Actor + nullable Auth link 可達成 | 最清楚，但多一層 link lifecycle |
| 服務到期 | Membership/Grant `[starts_at, ends_at)` | 獨立 service relationship，較完整 |
| 多重角色 | 多筆 Grant，各自完整 | 可非常細，但查詢複雜 |
| 資料重複 | organization/title 可能隨 Membership 重複 | 正規化較少 |
| Prototype 實作量 | 中等 | 過大 |
| 未來擴充 | 可在後續拆出 service/org | 較佳 |
| 回滾 | 七表邊界較清楚 | 依賴較多，清理順序複雜 |

### 2.4 推薦

推薦 **方案 M，七張 Access Foundation 候選表**。每一張都不可再延後：

- Actor Reference：解決帳號刪除與歷史 actor
- Case：建立不以 owner account 為根的個案
- Authorization Declaration：DRAFT 啟用門檻及法律限制版本
- Invitation：接受前不得取得 Membership
- Membership：個案關係、狀態與時間邊界
- Role Grant：一條完整 grant path 與管理／內容能力分離
- Access Event：Access lifecycle 的不可變追溯與管理者移轉證據

若移除任一表，就會把不同生命週期混回單欄位、無法原子追溯，或再次依賴唯一 owner。七表仍須分清楚「最小可執行 schema」與「本輪只是設計」；本 Gate 不建立它們。

## 3. 候選表設計規格

### 3.1 `v2_actor_references`

- **用途：** 保存穩定歷史 actor，將登入帳號與作者／操作者來源解耦
- **PK：** opaque actor UUID
- **必要欄位：** actor kind、display label snapshot、identity assertion status=`UNVERIFIED`、created_at
- **Nullable：** auth user reference、detached_at、pseudonymized_at
- **FK：** auth reference → `auth.users`；刪除行為必須是解除連結而非 Cascade actor
- **Unique intent：** 同一 Auth account 同時最多一個 active Actor Reference；歷史 detached actor 不可被新帳號自動接管
- **Check intent：** active link 時 auth reference 存在；detached/pseudonymized state 組合一致
- **狀態 vocabulary：** `LINKED`、`DETACHED`、`PSEUDONYMIZED`
- **時間：** created/detached/pseudonymized 使用 database clock；不可由 client 偽造
- **刪除：** 一般使用者不可 hard delete；法律保留期後去識別規則待專家確認
- **敏感性：** display label 與 auth link 是 PII；snapshot 不代表已驗證身分
- **存取：** 本人只能讀取自己的最小 actor 資訊；治理 helper 可用 actor ID；一般成員不能列舉平台 actors
- **Client direct write：** 不允許建立、換綁、detach、pseudonymize
- **需 transaction/RPC：** profile-to-actor provisioning、account deletion precheck、detach／pseudonymization

### 3.2 `v2_cases`

- **用途：** v2 個案生命週期根，並保存第一版最小 Subject 資訊
- **PK：** case UUID
- **必要欄位：** status、subject_display_name、subject_identity_status=`UNVERIFIED_PROTOTYPE`、draft_creator_actor、created_at、updated_at
- **Nullable：** archived_at/reason、suspended_at/reason；第一版不要求 legacy receiver link
- **FK：** draft creator → Actor Reference；Actor detach/delete 不得 Cascade Case
- **Unique intent：** 不以姓名建立真人唯一 constraint；不跨 case deduplicate
- **Check intent：** 狀態與 suspended/archived metadata 一致；DRAFT 不得標記已授權
- **狀態 vocabulary：** `DRAFT`、`AUTHORIZATION_DECLARED`（瞬時交易狀態）、`ACTIVE`、`SUSPENDED`、`ARCHIVED`
- **時間：**狀態轉換及 updated_at 使用 database clock
- **刪除：** 未授權 DRAFT 可由建立者透過受控交易 hard delete；啟用後不允許一般 hard delete
- **敏感性：** subject display label 可識別個人，DRAFT 只收最低資料
- **存取：** DRAFT 僅 creator；ACTIVE 改走 Membership + Grant；SUSPENDED 僅最低治理操作
- **Client direct write：** 只允許經受控操作編輯 DRAFT 最低資料；狀態與 creator 不直接寫
- **需 transaction/RPC：** create draft、declare/activate、suspend/archive、abandon draft、last-manager transfer

### 3.3 `v2_authorization_declarations`

- **用途：** 記錄使用者聲明自己是長者本人或已取得適當授權，以及限制提示版本
- **PK：** declaration UUID
- **必要欄位：** case、declarant actor、claimed capacity、declaration text version、limitation notice version、declared_at、status
- **Nullable：** withdrawn_at、disputed_at、reason code／最短必要 reason
- **FK：** case RESTRICT；actor historical reference RESTRICT/retain
- **Unique intent：** 一個 Case 同時最多一個 current effective declaration；不得以 update 覆寫舊聲明
- **Check intent：** withdrawn/disputed timestamps 與 status 一致
- **狀態 vocabulary：** `DECLARED`、`WITHDRAWN`、`DISPUTED`、`SUPERSEDED`
- **時間：** database clock
- **刪除：** 不 hard delete；未完成表單不寫入此表
- **敏感性：** 授權身分聲明可能敏感，不保存證件或法律文件
- **存取：** declarant、授權治理角色可看最小資料；一般成員不需查看完整 reason
- **Client direct write：** 不允許直接 insert/update status
- **需 transaction/RPC：** declaration + case activation + first manager；withdraw/dispute + case suspension

### 3.4 `v2_invitations`

- **用途：** 在未授權 recipient 查看內容前保存一次性邀請條件
- **PK：** invitation UUID
- **必要欄位：** case、inviter actor/grant、normalized recipient Email、role type、purpose、scope ceiling、starts_at、ends_at、token hash、status、created_at、expires_at
- **Nullable：** recipient actor/account（已註冊時）、unverified organization/title、declined/revoked reason、accepted_at
- **FK：** case、inviter actor、inviter grant；刪除 RESTRICT/retain history
- **Unique intent：** token hash 唯一；同 invitation 至多一次 terminal acceptance；可另限制同 case + recipient + overlapping role 的 active duplicate invite
- **Check intent：** ends_at > starts_at；expires_at 有效；professional invitation 必須有有限 ends_at；status metadata 一致
- **狀態 vocabulary：** `INVITED`、`ACCEPTED`、`DECLINED`、`REVOKED`、`EXPIRED`
- **時間：** database clock；有效區間 `[starts_at, ends_at)`
- **刪除：** 不 hard delete；token 撤回/到期失效
- **敏感性：** normalized recipient Email 與最低 case label 可能敏感，須受限讀取；DB 只存 token hash，不存 raw token
- **存取：** inviter/治理角色管理；recipient 在完成 account+binding 驗證後只見最低邀請資訊
- **Client direct write：** 不允許自填 inviter authority、status 或 token hash
- **需 transaction/RPC：** issue、accept/decline、revoke

### 3.5 `v2_case_memberships`

- **用途：** 表達 Actor 與單一 Case 的有效關係、服務聲明及期間
- **PK：** membership UUID
- **必要欄位：** case、actor、relationship kind、status、starts_at、ends_at（家庭可 nullable；專業必填）、accepted_at、created_at
- **Nullable：** source invitation、unverified organization/title/service description、revoked_at/reason、expired_at
- **FK：** case、actor、invitation；Case 不得由 Membership delete Cascade，歷史 actor 保留
- **Unique intent：** 同一 actor/case/relationship generation 不重複；重新加入建立新 generation，不復用舊 Membership
- **Check intent：** ends_at > starts_at；professional 必須有限 ends_at；revoked/expired metadata 一致
- **狀態 vocabulary：** `ACCEPTED`、`ACTIVE`（effective access 仍需時間判定）、`SUSPENDED`、`REVOKED`、`EXPIRED`
- **時間：** `[starts_at, ends_at)`，全部以 UTC timestamptz/database clock；顯示時轉 Asia/Taipei
- **刪除：** 不 hard delete
- **敏感性：** 家庭／專業關係與機構聲明敏感，且明確標示未驗證
- **存取：** 本人可見自己的條件；有效管理者可看管理所需最低 metadata；不能因管理身分看內容
- **Client direct write：** 不允許直接 insert/status/period mutation
- **需 transaction/RPC：** invite acceptance、revoke/suspend、period extension、manager transfer、account deletion governance

### 3.6 `v2_role_grants`

- **用途：** 表達一條不可拼接的完整 grant path
- **PK：** grant UUID
- **必要欄位：** membership、role type、purpose、scope ceiling、template version、status、starts_at、ends_at、granted_by actor、created_at
- **Nullable：** revoked_at/reason、superseded_by grant
- **FK：** membership、granter actor；不 Cascade historical grant
- **Unique intent：** 同 Membership 不可有相同 role/purpose/scope/time generation 的 active duplicate；一筆內容只保存一個 acting grant
- **Check intent：** grant validity 不超出 Membership；scope/purpose 必須適用 role template；ends_at > starts_at
- **狀態 vocabulary：** `ACTIVE`、`SUSPENDED`、`REVOKED`、`EXPIRED`、`SUPERSEDED`
- **時間：** `[starts_at, ends_at)`，database clock；effective access 以 Case+Membership+Grant 同時計算
- **刪除：** 不 hard delete
- **敏感性：** 低至中等，但可能揭露專業/家庭角色
- **存取：** 本人看自己的 grants；具 grant-management capability 者看治理 metadata；內容可見性另判斷
- **Client direct write：** 不允許直接新增或修改 role/capability/purpose/scope/validity
- **需 transaction/RPC：** initial grant、grant change/supersede、manager transfer、revoke

### 3.7 `v2_access_events`

- **用途：** 只追溯 Access Foundation 事件，為未來完整 Audit 的最小 foundation
- **PK：** event UUID + database-generated monotonic sequence intent
- **必要欄位：** event type、actor reference、case、target kind/id、event_at
- **Nullable：** previous/new state、reason code、最小 metadata、acting grant
- **FK：** case、actor；target reference 的完整 FK 策略留 SQL 前 review，不接受無限制裸 polymorphic UUID
- **Unique intent：** idempotency key/event operation key 不重複
- **Check intent：** event type 與 allowed state metadata 一致；metadata 禁止存完整敏感內容
- **狀態 vocabulary：** append-only；事件類型限 Case/Declaration/Invitation/Membership/Grant/Manager transfer/account detach
- **時間：** database clock
- **刪除：** 一般使用者不可 hard delete/update；retention 待專家確認
- **敏感性：** metadata 可能洩露成員關係，只開最低治理可見性
- **存取：** 一般 client 不直接列舉；必要歷程使用受限 read model；管理者不自然看全量安全事件
- **Client direct write：** 完全不允許
- **需 transaction/RPC：** 由其他受控交易同 transaction append

## 4. Actor Reference 與帳號刪除

### 4.1 推薦方案

`auth.users` 只負責登入；Actor Reference 是 v2 永久歷史根。Actor 可持有 nullable current Auth reference，正常 App 刪帳時必須先完成 governance precheck，再解除 link；Case、Membership、Declaration、Grant、Event 都引用 Actor，不引用可 Cascade 消失的 `public.users` 作歷史根。Auth 關聯刪除採解除連結或等效的非 Cascade 行為，不得刪除任何 v2 Case graph。

保留：

- stable actor ID
- 最小 historical display label snapshot
- unverified identity assertion status
- authored/managed relationships

可清除或去識別化：

- Email、provider identifiers、登入 metadata
- 不再必要的 profile PII
- display label 可依合法 retention 規則改成中性歷史標籤，但不能換成另一人

所有 UI 必須將 snapshot 表達為「當時記錄的顯示名稱」，不得稱已驗證真實身分。

同一 Auth account 同時只對應一個 active Actor Reference。Account 停用只停止登入，不必 detach；Account delete 解除 active link並保留 Actor。沒有可登入 Auth link 的 Membership 不再提供任何線上存取。使用相同 Email 重新註冊是新 Auth identity，不能自動重新接管舊 Actor；恢復連結需獨立驗證 Gate，Prototype 可直接不支援。

**正常 App 刪帳流程：** 先在受控治理交易內檢查未授權 DRAFT、pending invitation 與最後管理者責任；未完成移轉或草稿處理即拒絕。完成治理後才允許刪除 Auth account並 detach Actor。

**Supabase 管理員直接刪除：** Prototype 不宣稱能攔截所有管理員層級操作，本 Migration 也不修改 `auth.users` 或建立 Auth schema trigger。若管理員繞過 App 刪帳，FK/link 必須 fail-safe 地解除而不 Cascade；授權 helper 以「Actor 仍有 active Auth link」作必要條件。若因此沒有有效 Case Admin path，Case 進入衍生的 `GOVERNANCE_UNAVAILABLE` 安全狀態：資料保留，但所有一般內容與協作存取拒絕，只允許後續另行設計的最低恢復治理。此狀態可以由 access evaluation 計算，不要求本輪以 Auth trigger 寫回 Case。

### 4.2 替代方案與拒絕理由

| 方案 | 問題 |
|---|---|
| 直接引用 `public.users` | 現行 Auth Cascade 會破壞歷史根 |
| 每筆內容存作者姓名，不建 Actor | 名稱可重複，無法追溯同一 actor 或安全去識別 |
| 刪帳時建立匿名 actor 並批次改 FK | 高風險大量更新，可能改寫歷史 identity |
| Email 作 actor key | Email 可變、可重用且是 PII |

## 5. DRAFT creator 與 ACTIVE 授權路徑

### 5.1 DRAFT 唯一路徑

```text
auth.uid()
→ active Actor Reference
→ v2_cases.draft_creator_actor
→ Case status = DRAFT
→ 僅 VIEW_DRAFT / EDIT_DRAFT_MINIMUM / ABANDON_DRAFT
```

- DRAFT 不建立可用於日常 access 的 Membership／Role Grant
- 建立者不是自然的正式管理者
- DRAFT 路徑明確拒絕 issue invitation、share、export、建立健康內容
- 建立者可放棄或刪除自己的未授權草稿
- 帳號刪除前若仍有 DRAFT，必須先放棄、轉交不允許（第一版）或取消刪帳

### 5.2 ACTIVE 唯一路徑

```text
auth.uid()
→ active Actor Reference
→ Case Membership for Case
→ effective Membership status/period
→ one Role Grant
→ role template capability + purpose + scope ceiling + grant period
→ Case status = ACTIVE
→ ALLOW / DENY
```

Authorization Declaration 交易成功後，系統建立第一位 manager Membership/Grant 並啟用 Case。此後日常權限不得回退使用 `draft_creator_actor`。DRAFT creator 欄位只保留歷史來源，不是 ACTIVE bypass。

## 6. 原子操作責任

以下名稱是 operation boundary，不是已核准 RPC 名稱。

| 操作 | 前置條件 | 同一交易內操作 | 成功結果 | 失敗回復／race 防護 | Idempotency |
|---|---|---|---|---|---|
| 1 建立 DRAFT | actor linked；沒有同 request 已建草稿 | Case + access event | 只有 creator 可見 DRAFT | 任一失敗全 rollback；重試不可多建 | 必須，有 client operation key |
| 2 聲明授權並啟用 | creator owns DRAFT；未有效聲明 | Declaration、第一位 Membership、manager Grant、Case ACTIVE、events | creator 成為首位有效管理者 | 防雙擊、雙 declaration、Case 啟用卻無 manager | 必須 |
| 3 發出 Invitation | ACTIVE；單一 grant 有 `MANAGE_INVITATIONS`；scope/period 合法 | Invitation + token hash + event | recipient 尚無內容權 | 防重複 active invite、越權角色、raw token 落庫 | 必須 |
| 4 接受 Invitation | authenticated recipient binding match；invite effective/unused | invite accepted、Membership、initial Grant、events | 依 starts_at 取得 effective access | 防雙接受、轉寄者接受、半完成 Membership | 必須，重試回同結果 |
| 5 撤回 Invitation | invite still pending；actor有能力 | invite revoked + event | token 立即失效 | accept/revoke 競賽只能一個 terminal transition 成功 | 必須 |
| 6 撤銷 Membership | actor有能力；不是未處理的最後 manager | Membership/Grants revoked + events | DB clock 起立即失權 | 防 stale status、管理者互刪、部分 grant 存活 | 必須 |
| 7 轉移最後 manager | old/new memberships有效；新管理者明確接受 | 新 manager Grant active、確認仍有 manager、舊 grant 結束、events | 始終至少一名 manager | 鎖定 Case/manager set；任一失敗全 rollback | 必須 |
| 8 到期後失權 | now >= ends_at | 不要求先更新 stored status；access evaluation直接拒絕；可另記首次觀察到期 event | 即時拒絕 | 防無 cron 時仍 ACTIVE、舊 session 讀取 | 判定天然；event需去重 |
| 9 放棄 DRAFT | creator；DRAFT；無 declaration/invite | hard delete draft +必要最小 event/operation record依 retention決策 | 草稿消失 | 防與 declaration transaction 競賽 | 必須 |
| 10 刪帳前治理檢查 | actor linked | 檢查 DRAFT、last-manager責任、pending invites；完成必要處理後 detach | 不刪 Case/歷史 | 任一未解責任即拒絕刪帳；防檢查後狀態改變 | 必須 |

到期不是依賴第 8 項 transaction 才生效；每次授權 query 都以 database clock 計算。任何狀態快取只供顯示。

## 7. Role Grant Vocabulary

### 7.1 固定 enum-like vocabulary

**Role type**

- `CASE_ADMIN`
- `FAMILY_MEMBER`
- `PROFESSIONAL_MEMBER`
- `CARE_RECIPIENT`

**Purpose**

- `CASE_ADMINISTRATION`
- `FAMILY_CARE`
- `PROFESSIONAL_SERVICE`

**Sharing scope ceiling**

- `AUTHOR_ONLY`
- `DIRECT_PARTICIPANTS`
- `FAMILY_ONLY`
- `SHARED_CARE`

Scope 不是簡單線性「高低」；例如 `FAMILY_ONLY` 與 `DIRECT_PARTICIPANTS` 是不同集合。後續內容 RLS 必須做集合相容判斷，不得用數字大小比較。

### 7.2 第一條 Vertical Slice 固定 capability

Migration 007 固定完整 vocabulary 供 Grant path 驗證，但只實作 Access Foundation 所需資料與操作。Migration 008／009 才會讓內容能力對應到實體資料；不得因此提前建立內容表。

- `VIEW_CASE_MINIMUM`
- `EDIT_DRAFT_MINIMUM`
- `ABANDON_DRAFT`
- `DECLARE_AUTHORIZATION`
- `MANAGE_CASE_GOVERNANCE`
- `MANAGE_INVITATIONS`
- `MANAGE_MEMBERSHIPS`
- `MANAGE_GRANTS`
- `VIEW_OWN_ACCESS_TERMS`
- `VIEW_ALLOWED_SCOPE`
- `CREATE_CARE_UPDATE`
- `CREATE_QUESTION`
- `ASSIGN_ACTION`
- `ACCEPT_OWN_ACTION`
- `PROGRESS_OWN_ACTION`
- `COMPLETE_OWN_ACTION`
- `CONFIRM_ARRANGEMENT`
- `VIEW_NEW_CHANGES`

### 7.3 Role × Capability matrix

`Conditional` 表示還必須由 purpose、scope、validity、Case/Membership status與 record relationship 共同通過；不是 role 單獨授權。

| Capability | CASE_ADMIN | FAMILY_MEMBER | PROFESSIONAL_MEMBER | CARE_RECIPIENT |
|---|---|---|---|---|
| `VIEW_CASE_MINIMUM` | Conditional | Conditional | Conditional | Conditional |
| `MANAGE_CASE_GOVERNANCE` | Allowed by admin grant | Denied | Denied | Conditional by explicit admin grant |
| `MANAGE_INVITATIONS` | Allowed by admin grant | Denied | Denied | Conditional by explicit admin grant |
| `MANAGE_MEMBERSHIPS` | Allowed by admin grant | Denied | Denied | Conditional by explicit admin grant |
| `MANAGE_GRANTS` | Allowed by admin grant | Denied | Denied | Conditional by explicit admin grant |
| `VIEW_OWN_ACCESS_TERMS` | Allowed | Allowed | Allowed | Allowed |
| `VIEW_ALLOWED_SCOPE` | Conditional；不因 admin 自動擴大 | Conditional | Conditional | Conditional |
| `CREATE_CARE_UPDATE` | Conditional；需另有內容目的 | Conditional | Conditional | Conditional |
| `CREATE_QUESTION` | Conditional；需另有內容目的 | Conditional | Conditional | Conditional |
| `ASSIGN_ACTION` | Conditional；需另有內容目的 | Conditional | Conditional | Conditional |
| `ACCEPT_OWN_ACTION`／`PROGRESS_OWN_ACTION`／`COMPLETE_OWN_ACTION` | 僅自己的指派且具內容 grant | 同左 | 同左 | 同左 |
| `CONFIRM_ARRANGEMENT` | Conditional；admin 不自然取得 | Conditional | Conditional | Conditional |
| `VIEW_NEW_CHANGES` | Conditional；只計目前可見範圍 | Conditional | Conditional | Conditional |

`EDIT_DRAFT_MINIMUM`、`ABANDON_DRAFT`、`DECLARE_AUTHORIZATION` 屬 DRAFT creator direct path，不由 ACTIVE Role Grant template 派生。

能力由固定且版本化的 role template 派生，不建立任意 user-defined ACL。Grant 必須顯式保存 role type、purpose、scope ceiling、template version、validity；capability 可由固定 template 查得，但不得由前端提交任意 capability array。

一條完整 grant path 識別為：

```text
(account → actor → one membership → one grant → one template version)
```

該 path 自己必須滿足 Case status、Membership status/period、role capability、relationship、purpose、scope ceiling 與 Grant period。不得拿家庭 Grant 的 scope 加上專業 Grant 的 capability。管理 template 只給管理能力，不自動含未來敏感內容 view capability。

### 7.4 Vocabulary Freeze 結論

- 第一位正式管理者必須取得明確 `CASE_ADMIN` Grant；授權聲明身分或 `CARE_RECIPIENT` role 不自然等於 admin
- 家庭 Membership 允許 `ends_at = NULL`，但仍受撤銷、Case狀態與 Grant validity 約束；專業 Membership 必須有 ends_at
- scope ceiling 在 Invitation/Grant 必填，即使 007 尚無內容表；它只保存未來權限上限，不建立內容 policy
- role template 使用固定版本；已被 Grant 引用的 template version 不可變，後續能力變更建立新版本並經 grant migration/renewal
- 不允許自由文字 role、purpose、scope 或 capability；未驗證 organization/title 才是受限自由文字聲明

## 8. Invitation Recipient Binding

### 8.1 方案比較

| 方式 | 優點 | 主要風險 | 判定 |
|---|---|---|---|
| 已註冊 Account 直接邀請 | 綁定清楚 | 不支援未註冊者；可能洩漏帳號存在 | 支援但不是唯一方式 |
| Email 邀請 | 家庭熟悉，可支援未註冊 | Email PII、轉寄、大小寫/Unicode正規化 | 與 token + authenticated email match 組合 |
| 單純分享連結 | 操作最少 | 知道連結即授權，不可接受 | 拒絕 |
| 短邀請碼 | 可跨裝置輸入 | 猜測、截圖、重播 | 不作第一版 |
| 一次性 opaque token | 不可猜測、可撤回 | 被轉寄仍可能被使用 | 必要但不單獨足夠 |

### 8.2 推薦 Prototype 方式

採「登入後接受 + 已驗證 Email binding + 一次性高熵 opaque token」：

- DB 只保存高熵 token hash，不保存 raw token
- Invitation 保存 normalized recipient Email，明確視為敏感資料；只有寄送與接受驗證所需的受控操作可讀
- raw token 只在建立邀請成功時回傳一次，不可再次由 DB 取回
- Email canonicalization 規則必須固定；不得對所有 provider 擅自移除 plus alias 或 dots
- 未註冊者先完成正常 Auth 註冊與 Email confirmation，再以相同 canonical Email 接受
- 已註冊者仍需 authenticated session、Auth 已驗證 Email、normalized Email match 與有效 token
- token 一次性、有限期、可撤回；accept/revoke/expire 是互斥 terminal result
- 轉寄者只有 token、沒有匹配 confirmed Email，必須拒絕
- 接受前只顯示邀請者顯示名稱、個案最小非敏感 label、邀請角色、目的、期間、未驗證聲明提示；不得顯示健康資料
- 查無邀請、已撤回、Email 不符應使用不洩漏存在性的中性錯誤

Token 重播由 terminal status + atomic compare-and-set + unique acceptance 防止。不得把「知道連結」當作身分授權。

SQL Draft Review 必須證明預期的 database trust boundary 能可靠取得目前 Auth account 的 Email 與已驗證狀態，而不是相信前端傳入的 Email。若 Supabase Auth 的已驗證 Email 狀態無法在該邊界可靠取得，Invitation acceptance 仍為 SQL Draft BLOCKER。

## 9. 時間與即時失權

### 9.1 時間 contract

- DB 保存 UTC `timestamptz` 語意，UI 顯示 Asia/Taipei
- 有效期間統一 `[starts_at, ends_at)`
- `starts_at` 包含，剛好 `ends_at` 即失權
- 使用 database clock 判定，不接受前端 now 作安全依據

### 9.2 Stored state 與 effective access

**保存狀態：** invitation/membership/grant 的 accepted、suspended、revoked 等治理結果及原因。

**即時計算：**

```text
Case ACTIVE
AND Membership stored status allows access
AND starts_at <= database_now
AND (ends_at IS NULL OR database_now < ends_at)
AND revoked_at IS NULL
AND one Grant stored status allows access
AND grant starts_at <= database_now
AND (grant ends_at IS NULL OR database_now < grant ends_at)
```

即使 cron 尚未把顯示 status 從 ACTIVE 更新為 EXPIRED，effective access 仍拒絕。撤銷交易一提交，舊 JWT 的下一次資料查詢也必須重新由 DB 判定而失敗；前端 hide/route guard 不是安全邊界。

延長服務期間必須由有能力者受控操作，保存舊期限、新期限、actor、reason 與 database time。不可覆寫到無歷史，也不可讓新 ends_at 超過邀請／授權允許範圍而不重新核准。

## 10. 非遞迴 RLS Dependency Graph

### 10.1 單向依賴

```text
auth.uid()
  ↓
Actor mapping helper (只回傳 active actor id)
  ↓
Case direct rule
  ├─ DRAFT: case.creator_actor + case.status
  └─ ACTIVE: access-path helper
                 ↓
            Membership base facts
                 ↓
            one Role Grant base facts + fixed template
                 ↓
            Case status
                 ↓
            boolean capability decision

Authorization Declaration → Case direct governance rule
Invitation → inviter access-path helper / recipient binding helper
Membership → case manager helper（不透過 Membership 自己的 RLS）
Role Grant → membership ownership + manager helper
Access Event → 只由受控 transaction 寫入
```

Case content policy 未存在於 Migration 007。Case policy不能查一個會再透過 Case policy查回來的 Membership view；Membership policy也不能用受 RLS 的 Membership 自查 manager count。

### 10.2 可能需要的安全 helper responsibility

- `current_actor_id()`：從 `auth.uid()` 開始，只讀 Actor Reference 的 active Auth link；不接受 client actor id，也不回傳其他 actor
- `has_case_grant_path(case, capability, purpose, scope)`：只讀 Actor Reference、Case、Membership、Role Grant 與固定 role template；驗證一條完整 path，只回 boolean
- DRAFT creator 判斷維持在 Case SELECT policy 與受控 DRAFT RPC 的窄條件內：只比較 `auth.uid()` 對應 Actor、Case creator 與 DRAFT status，不另外暴露未使用的 helper
- `is_invitation_recipient(invitation)`：只讀目前 Auth identity 的已驗證 Email與 Invitation binding/status/time；token validation 由接受交易處理，不把 token 放進一般 RLS claim
- `case_has_effective_manager(case, excluding_membership?)`：只讀 Case、Membership、Role Grant與Actor active link；用於 last-manager guard及衍生 `GOVERNANCE_UNAVAILABLE`
- `can_manage_invitation/membership/grant(...)`：只讀一條 actor→membership→grant path及Case，不透過被管理表自己的RLS反查

`SECURITY DEFINER` 以函式 owner 權限執行。若 owner 是 superuser 或具有 `BYPASSRLS`，`FORCE ROW LEVEL SECURITY` 不會成為高權限函式的限制來源。Migration 007 SQL Draft 預期由 Supabase migration owner 建立函式，不自行建立尚未驗證的 custom role，也不假設 owner 受 RLS 限制。所有 definer RPC 必須按「可能 bypass RLS」的安全等級審查：固定空 `search_path`、schema-qualified relation、從 `auth.uid()` 重建 Actor、完整輸入與狀態驗證、最小結果、原子 transaction、必要 Case row lock，以及最小 EXECUTE ACL。不得接受 client 自稱 actor、role、capability、verified Email 或 database time。

函式依用途分成四類：純運算採 `SECURITY INVOKER`；Policy helper 僅在避免 RLS recursion 確有需要時採 definer，且只能回傳最小 boolean／identifier；只供其他 definer 呼叫的 internal helper 採 invoker 並撤銷 client EXECUTE；只有跨 RLS 寫入或原子治理操作的 authenticated RPC 才採 definer。一般 client 不能直接呼叫 internal helper，Policy helper 是否授予 authenticated EXECUTE 必須逐一證明必要性。

Local dry-run 必須查驗 `pg_proc.proowner`、owner 的 superuser／`BYPASSRLS` 屬性、`prosecdef`、`proconfig` 中的 `search_path` 以及實際 EXECUTE ACL。這些尚未經本專案 Local Supabase 證明，因此 Remote Apply 維持 BLOCKED。

前端不能自稱 actor、role、capability、purpose 或 effective time。所有 client 可呼叫操作仍需 database transaction、constraint 與 RLS enforcement。不得藉 Migration 007 放寬現有 v1 38 policies。

v1與v2的policy path完全分離：v2 helper不得讀 `care_receivers.owner_user_id` 推導權限，v1 policy也不得查v2 Membership。Migration 007只能新增v2專屬policy/helper，不能修改既有38條policy。

### 10.3 Access Foundation 角色 × 操作矩陣

| 操作 | DRAFT creator | Authorizer | Manager | Family member | Professional member | Subject self |
|---|---|---|---|---|---|---|
| 建立 DRAFT | Allowed | Allowed when creator | Conditional | Conditional | Conditional | Allowed |
| 編輯 DRAFT 最低資料 | Own draft only | Own draft only | Denied by manager role | Denied | Denied | Own draft only |
| 聲明授權 | Conditional claimed capacity | Conditional | Denied | Denied | Denied | Conditional |
| 發邀請 | Denied before ACTIVE | Conditional grant | Conditional grant | Denied | Denied | Conditional grant |
| 接受自己的邀請 | Conditional binding | Conditional | Conditional | Conditional | Conditional | Conditional |
| 查看自己的 access terms | N/A | Allowed | Allowed | Allowed | Allowed while/after only governance-minimum | Allowed |
| 撤銷成員 | Denied | Conditional | Conditional, not last-manager violation | Denied | Denied | Conditional |
| 移轉管理者 | Denied | Conditional | Conditional with authorizer rule | Denied | Denied | Conditional |
| 查看所有敏感內容 | Denied | Not implied | Not implied | Not implied | Not implied | Not defined in 007 |

所有 Conditional 都仍需完整 grant path、Case/Membership/Grant 有效期與 database enforcement。

## 11. v1 Non-regression、Preflight 與 Rollback 計畫

### 11.1 本輪已驗證事實

- Repository 中存在 Migration 001–006
- Repository schema 顯示 v1 十張 RLS table 與 owner-chain policy design
- Auth profile provisioning/sync migration 存在
- 最後紀錄聲稱 App tests 167/167；本輪沒有重跑
- 本輪沒有修改 v1 migration、App、contracts、tests 或遠端設定

### 11.2 SQL Draft／dry-run 前待驗證

- 重新執行 full App tests，記錄實際 test files/total tests
- 比對 Coverage Engine implementation、1.5-MVP／2.0-MVP 文件與實際 imports，決定哪份是測試基準
- `supabase migration list` 本機／遠端一致，001–006 checksum 或內容未改寫
- 遠端仍為 v1 10 RLS tables／38 policies，並記錄各名稱
- 遠端既存 row counts 與非空資料，不假設可清除
- Auth profile create/sync/delete 行為及 `public.users` Cascade 不被 v2 actor link繞回
- v1 Auth → Receiver → Task → Current/Backup → Scenario → Handoff 流程 regression
- v2 A/B/C 三使用者隔離：owner/manager、invited-not-accepted、unrelated account
- 到期邊界、撤銷舊 JWT、dual-role path、last-manager concurrency tests

### 11.3 Rollback 邊界

- Migration 007 必須 additive，不修改或 drop v1 objects
- **尚無v2資料：** 可移除七張v2 foundation tables及其專屬functions/policies/privileges，順序不得觸碰v1
- **已有測試或正式v2資料：** 不得把Drop tables當一般rollback；優先關閉v2 feature、撤銷client access、保留資料並以forward migration修正
- 任何破壞性rollback都必須先確認資料範圍、備份、還原測試與責任人
- 中途失敗必須由單一 migration transaction 回滾，無 table、function、policy、grant 或 auth trigger 殘留
- 失敗後先 audit migration history 與 object inventory；不得盲目重跑或手動補一半
- 不修改 Migration 001–006 來「讓 007 可跑」

## 12. 反例 Walkthrough

| 情境 | 結果 | Invariant／防線 | 未解風險 |
|---|---|---|---|
| 1 未授權 DRAFT creator 邀請 | 拒絕 | DRAFT direct path 沒有 `MANAGE_INVITATIONS`；issue-invite transaction 檢查 ACTIVE + grant | 前端文案待定 |
| 2 邀請連結轉寄 | 轉寄者拒絕 | token + authenticated confirmed Email/account binding；token不是授權 | Email account被接管超出本 Gate |
| 3 同邀請同時接受兩次 | 只允許一個成功，另一個回已處理 | terminal status compare-and-set、unique membership generation、單 transaction | 需定義 idempotent response shape |
| 4 兩位 manager 同時移除對方 | 不得產生零 manager；最多一個符合條件的操作成功 | 鎖 Case/manager set、提交時重算有效 manager count | DB lock策略留 SQL Design |
| 5 最後 manager 刪帳 | 拒絕刪帳直到新 manager已接受或 Case封存 | account deletion governance precheck + actor detach transaction | Auth provider delete hook的可強制性需驗證 |
| 6 專業成員跨 ends_at 持續開 App | 邊界後下一個 query拒絕 | `[start,end)` + database clock 每次判定 | 已載入畫面無法遠端抹除，UI應提示但非安全依據 |
| 7 被撤銷者用舊 JWT | 拒絕 | RLS 每次查 stored revocation + DB time，不信 JWT role claim | 客戶端快取需清除但不取代 DB |
| 8 家庭+專業雙角色拼接 | 拒絕不完整 path；任一單一路徑完整才允許 | selected one grant + fixed template + purpose/scope | read query多 path效能待測 |
| 9 Auth user 刪除 | Actor detach；Case/Membership/history保留；未解草稿/last-manager則先拒絕 | Auth FK非 Cascade歷史根 + pre-delete governance | Supabase Auth delete與public transaction原子性需實驗 |
| 10 Migration 007 中途失敗 | 全部 v2 object回滾，v1不變 | transactional DDL、object inventory、無 seed | 某些平台操作是否同交易需 dry-run證明 |

## 13. Access Event 定位與完整性

`v2_access_events`只記錄：Case啟用、授權聲明、Invitation發出/接受/拒絕/撤回/到期、Membership建立/暫停/撤銷/到期、Grant建立/變更/撤銷、管理權轉移、Auth link解除與DRAFT放棄。未發布 DRAFT 的建立不另留永久 `CASE_CREATED` Event，避免其真正刪除後留下第二種 nullable-Case event 例外。

固定規則：

- 一般client不得直接INSERT、UPDATE或DELETE，只能由受控transaction/RPC追加
- Event immutable且不複製完整敏感內容
- 保存case、actor、固定event type、固定target kind、target identifier、database time及最小metadata
- target kind只允許 `CASE`、`AUTHORIZATION_DECLARATION`、`INVITATION`、`MEMBERSHIP`、`ROLE_GRANT`、`ACTOR_REFERENCE`
- target identifier在原物件日後去識別化時仍保留歷史意義
- 七表方案維持，不為每種target額外建event table
- `DRAFT_ABANDONED` 必須在 DRAFT 刪除前建立，當下先驗證 target 確實存在且屬於該 Case
- DRAFT 刪除後，Event 的 Case FK 以 `ON DELETE SET NULL` 清空；原 Case UUID只作為不可變 tombstone target identifier
- tombstone 只保存 actor、event type、target kind、原 Case UUID、event time及必要最小metadata，不保存長者名稱、健康資料或完整草稿內容
- `DRAFT_ABANDONED` 是第一階段唯一允許 Case FK 為 NULL 的事件；target identifier不得被用來恢復內容或重新取得存取權

推薦採受控 polymorphic target：因單一event可能指向六種foundation entity，資料庫無法用單一FK完整保證target存在。正常event只能由受控寫入操作建立，該操作必須在同一transaction先驗證target kind對應的物件存在且屬同一Case；event type與target kind使用固定相容矩陣。`DRAFT_ABANDONED` 先以同樣方式驗證，再因 hard delete 轉為最小 tombstone。這個方案保留七表，但明確接受「polymorphic target無法取得完整declarative FK保證」的取捨。SQL dry-run必須用negative tests證明一般client無法製造dangling target或利用 tombstone 取得內容。

## 14. Gate 重新分類

### 14.1 SQL Draft 前已固定的設計決策

- Auth account刪除採Actor解除連結、非Cascade；直接後台刪除時以無active Auth link／無effective manager導出fail-closed安全狀態
- DRAFT只走Case creator direct path；ACTIVE全面改走Membership+one Grant
- 授權聲明、首位Membership/Admin Grant、Case ACTIVE與Event同transaction
- 最後manager保護採Case-level serialization/locking responsibility；不可只靠前端
- Role／Capability／Purpose／Scope vocabulary及Role×Capability matrix已freeze
- Invitation採登入後confirmed Email match + normalized Email + single-use hashed opaque token
- RLS helper從`auth.uid()`開始，使用單向base-table dependency，不接受client actor/role聲明
- Access Event採固定kind的受控polymorphic target，不擴張七表
- Rollback依「無資料」與「已有資料」分開，已有資料以feature-off/deny-access/forward-fix為優先

### 14.2 Static SQL Draft 已具體化、待 Local dry-run 驗證的邊界

1. **Supabase confirmed Email trust boundary：** Draft 由 `auth.uid()` 查 `auth.users.email` 並要求 `email_confirmed_at IS NOT NULL`，不採信 client、JWT Email 或 `user_metadata`；實際 Auth schema 尚待 Local Supabase 證明
2. **Auth admin delete實際FK行為：** Draft 採 Auth FK `ON DELETE SET NULL` 與無有效 Auth mapping 即 fail-closed；仍須證明無 v1/v2 Cascade 及 governance-unavailable 行為
3. **Helper execution model：** 已分 pure invoker、Policy definer、internal invoker、authenticated transaction definer RPC；仍須查驗 migration owner、superuser／`BYPASSRLS`、`prosecdef`、`proconfig` 與 ACL
4. **Last-manager concurrency primitive：** Draft 採 Case row lock、鎖後重讀與同 transaction 移轉；仍須並行測試雙方互撤與故意失敗 rollback
5. **Access Event target validation：** Draft 採固定相容矩陣、建立當下 target/case 驗證及唯一 DRAFT tombstone 例外；仍須 negative tests

上述皆為 Local dry-run 必測，不再構成 Static SQL Draft 的設計 BLOCKER；任何一項測試不通過都阻擋正式 Migration 與 Remote Apply。

### 14.3 僅阻擋Migration執行的驗證Gate

- 遠端Migration history與001–006不可改寫狀態
- 遠端十張v1 tables、三十八條policies、row counts及Auth settings
- 完整測試的實際數量與結果，不沿用167作本輪事實
- Coverage Engine 1.5-MVP／2.0-MVP文件與實作落差處理
- Supabase backup、restore與rollback readiness
- A/B/C多使用者RLS isolation、到期、撤銷舊JWT、雙重角色與last-manager concurrency tests

上述項目會阻擋local dry-run後的正式Migration執行，但在明確列為待驗證前提下，不阻擋建立本機SQL Draft。

## 15. Gate 結論

### 15.1 推薦 Migration 007 最小範圍

- 七張候選表：Actor Reference、Case、Authorization Declaration、Invitation、Case Membership、Role Grant、Access Event foundation
- 不建立獨立 Case Subject／Professional Service Relationship；第一版安全合併進 Case/Membership
- 不建立任何 content、Action、Cursor、完整 Audit 或 v1 bridge
- 固定 DRAFT direct creator path與ACTIVE Membership/one-Grant path
- 固定 database-clock `[starts_at, ends_at)` 即時失權
- 所有關鍵 lifecycle mutation 走受控 transaction/RPC responsibility

### 15.2 Design Review 判定

- **Migration 007 Access Foundation Design Review：** `PASS — ACCESS FOUNDATION DECISIONS FROZEN`
- **本機 Migration 007 SQL Draft：** 已完成 static security revision；第14.2節轉為 Local dry-run 必測邊界
- **可操作 Supabase：** 否
- **可修改 v1 RLS／Migration 001–006：** 否
- **Static SQL Draft Review：** `PASS`，前提是草案仍留在 `docs/sql-drafts/` 且不得套用
- **Local Supabase／PostgreSQL dry-run：** 可進入下一個獨立 Gate；owner、ACL、Auth schema、RLS recursion、並行與 tombstone 為必測
- **Remote Supabase Apply：** `BLOCKED`

七表足以表達本Gate已固定的Access Foundation規則。Design Review的產品與邏輯決策已PASS；剩餘問題屬SQL Draft必須具體化並驗證的安全實作邊界，不再要求新增第八張表。

### 15.3 下一個 Gate

**Migration 007 Local Supabase／PostgreSQL Dry-run Gate**

下一Gate只允許在乾淨本機環境解析並測試 `docs/sql-drafts/007_v2_access_foundation_draft.sql`，查驗函式 owner／ACL／`search_path`、confirmed Email、Auth delete fail-closed、RLS isolation、last-manager並行及DRAFT tombstone。仍不得移入正式migration、執行db push或操作遠端Supabase。

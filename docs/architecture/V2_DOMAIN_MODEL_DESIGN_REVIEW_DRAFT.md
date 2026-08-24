# 備份心 v2 Domain Model Design Review

- **Status:** `PROPOSED DRAFT`
- **Version:** `v2.0 Phase 0.2 Domain Model Design Review`
- **依據文件：** `V2_PRODUCT_GOVERNANCE_PERMISSION_MATRIX_DRAFT.md`
- **文件性質：** 概念 Domain Model 與狀態規則審查
- **不包含：** 資料表、欄位型別、SQL、Migration 007、RLS Policy、API、UI 或實作設計

> 本文件將 Phase 0.1 已固定的治理規則轉成概念物件、關係、能力、狀態轉換與 invariant。它不是正式法律文件、Production 授權機制或資料庫設計，也不表示任何功能已實作。

## 1. Review 目的與 Gate 邊界

本 Review 必須回答：

- 哪些概念具有獨立生命週期
- 哪些角色、關係與能力不能混為一談
- 哪些狀態轉換必須由特定行為者執行
- 照顧更新、問題與處理事項如何建立可追溯關係
- 成員到期或撤銷後如何停止存取且保留歷史責任
- 更正如何保留原始來源
- 個案如何不依附單一帳號而持續存在
- 哪些規則已足以進入後續邏輯資料模型設計，哪些仍阻擋 Migration 007

本輪不回答：

- 如何建立實體資料表
- 主鍵、外鍵、索引或欄位型別
- SQL constraint、trigger、RPC 或 RLS 寫法
- v1 資料如何搬移
- App 畫面、路由或 API contract
- Production 法律效力或正式機構驗證

## 2. Domain 設計原則

### 2.1 長者個案不是帳號附屬資料

長者個案是具有獨立治理與保存生命週期的 Domain Aggregate。使用者帳號只是可代表某位參與者登入的技術身分，不是個案存在的唯一根。

固定 invariant：

- 帳號停用或刪除不得直接刪除個案
- 個案至少須維持一條有效治理路徑，或進入受控封存狀態
- 歷史作者、事件與來源引用不得因帳號離開而消失
- 帳號、人物、個案成員資格及角色授予是不同概念

### 2.2 管理能力與內容可見性分離

協作管理者可以管理邀請、成員、角色與期限，但不自然取得所有內容。每次內容操作仍必須通過個案狀態、成員狀態、角色能力、個案關係、使用目的、分享範圍及有效期間的交集判斷。

### 2.3 來源陳述與專業判斷分離

觀察記錄「誰在何時看到或轉述什麼」，不是診斷或已確認事實。專業身分也不會讓所有陳述自動成為專業判斷。

### 2.4 指派、接受、執行與完成分離

處理事項的責任由狀態轉換及事件歷程表達。指派者不能替被指派者接受，管理者不能替負責人完成，完成也不會自動解決相關問題。

### 2.5 已發布內容採追加式更正

已發布的觀察、問題回答與完成說明不可就地覆寫。更正是新的版本化陳述，必須保留原始內容、原始作者、原始時間及更正鏈。

### 2.6 最小揭露與目的限制

能否操作某個 Domain Object 與能否查看其所有背景資料是兩個問題。被指派者只取得完成該事項所需的最低必要內容，不因收到工作而看見整個個案。

## 3. Bounded Context 建議

第一條 Vertical Slice 可分為五個概念邊界。這是責任邊界，不是資料庫拆表建議。

| Context | 責任 | 不負責 |
|---|---|---|
| Case Governance | 個案狀態、授權聲明、管理連續性、封存 | 照顧內容與工作執行細節 |
| Collaboration Membership | 邀請、接受、成員狀態、角色、目的、服務期間 | 將機構關係視為自動授權 |
| Care Updates | 有來源的觀察、照顧安排、問題、回答與版本 | 無限制聊天室或完整病歷 |
| Action Coordination | 指派、接受、開始、完成、拒絕、取消及重新指派 | 自動判定問題已解決 |
| Audit & Provenance | 狀態事件、作者來源、不可變引用與更正鏈 | 第一階段完整頁面閱讀稽核 |

Phase 4 的摘要與離線輸出是上述 Context 的衍生消費者，不是第一條 Vertical Slice 的前置 Context。

這五個 Bounded Context 只代表概念責任與第一版程式模組邊界。第一版維持既有 React／Supabase 架構，不因此拆成微服務、多個資料庫、多套部署或跨服務事件系統。

## 4. 核心概念物件

以下名稱是概念名稱，不是資料表名稱。

### 4.1 Person

代表真實世界中的一個人，例如長者、家屬或專業人員。

必要語意：

- 一個 Person 可以沒有登入帳號
- 一個 Person 可以在不同個案中擁有不同關係
- 同一 Person 在同一個案中可能同時具有家庭與專業關係
- Person 的存在不代表已取得任何個案權限
- 第一版不進行跨個案真人身分比對，不自動合併疑似同一長者，也不建立全平台唯一真人主檔
- Prototype 中的 Person 與身分資料只代表使用者輸入或聲明，不代表真實身分已驗證

### 4.2 Account Identity

代表可以登入系統的技術身分。

必要語意：

- Account Identity 可以連結 Person，但不等於 Person 本身
- 帳號被停用、匿名化或刪除後，歷史內容仍保留不可變 actor reference 與當時顯示資訊
- 長者本人不必建立帳號

### 4.3 Care Case

代表以一位長者為中心、可跨時間與參與者延續的協作個案。

核心狀態：

- `DRAFT`
- `AUTHORIZATION_DECLARED`
- `ACTIVE`
- `SUSPENDED`
- `ARCHIVED`

必要 invariant：

- 不以單一 owner 帳號作為生命週期根
- `DRAFT` 不得邀請、分享或匯出
- 只有 `ACTIVE` 可進行正常協作
- `SUSPENDED` 預設停止家庭及專業成員的內容存取
- 最後一位有效協作管理者不得直接離開

### 4.4 Authorization Declaration

代表使用者在 Prototype 中聲明自己是長者本人，或聲明已獲適當授權。

至少包含以下 Domain facts：

- 聲明者
- 聲明時間
- 聲明身分
- 聲明文字版本
- 限制提示版本
- 撤回或爭議事件

它不代表：

- 法律代理權已驗證
- 長者意思能力已判定
- 電子簽章成立
- 文件真實性已驗證

### 4.5 Invitation

代表邀請某人加入某個特定 Care Case 的提議，不是成員資格本身。

至少表達：

- 邀請者
- 預定受邀者
- 預定關係與角色
- 使用目的
- 預定分享範圍
- 服務起訖期間
- 發出、接受、拒絕、撤回或失效時間

接受前只能揭露：

- 邀請者顯示名稱
- 足以辨識邀請的個案最低顯示名稱
- 邀請角色或關係
- 使用目的
- 預定資料範圍
- 服務期間
- 「身分及機構關係未經正式驗證」提示

不得揭露健康內容、既有照顧更新、問題或處理事項。

### 4.6 Case Membership

代表某位 Person 已接受邀請後，與特定 Care Case 建立的有效關係。

成員狀態：

- `INVITED`
- `ACCEPTED`
- `ACTIVE`
- `EXPIRED`
- `REVOKED`
- `DECLINED`

Membership 必須攜帶或引用：

- 個案關係
- 角色能力集合
- 使用目的
- 分享範圍上限
- 有效期間
- 專業身分與機構關係的自我聲明及未驗證標記

### 4.7 Role Grant

代表在某個 Case Membership 下授予的一組能力，不代表內容所有權。

第一階段角色：

- 個案授權者
- 協作管理者
- 家庭照顧成員
- 專業照顧成員
- 長者本人帳號

個案建立者是建立事件中的責任者；完成授權後是否同時取得其他角色，必須透過明確 Role Grant 表達，不能由「建立者」永久推導。

組織管理者屬後續機構版，不進第一階段 Domain Model。

### 4.8 Service Relationship Declaration

代表專業成員自行填寫的機構、職稱、服務目的與期間。

固定語意：

- 第一階段是未驗證聲明
- 只對被邀請的特定個案有效
- 同機構其他人員不取得任何衍生權限
- 到期或撤銷後，不能再用此關係取得內容
- 未來正式驗證機制不能回頭竄改當時「未驗證」的歷史事實

### 4.9 Care Update

代表有作者、來源、發生時間、建立時間與分享範圍的照顧變化或協作內容。

第一階段類型：

- Observation
- Care Arrangement
- Question
- Question Answer

共同 invariant：

- 已發布後不可就地覆寫
- 每一版本保留作者、時間、來源、分享範圍及不可變 reference
- 撤回不等於消失
- 內容不得被視為正式病歷、診斷、完整護理紀錄或機構法定紀錄

### 4.10 Observation

代表一則有來源的觀察。

至少表達：

- 作者
- 實際發生或觀察時間
- 系統建立時間
- 來源類型
- 來源說明
- 是否需要進一步確認
- 分享範圍

Observation 不具有「已診斷」或「已專業確認」狀態。

### 4.11 Care Arrangement

代表對照顧方式的提議與確認，與 Action Item 分離。

候選狀態：

- `PROPOSED`
- `NEEDS_CONFIRMATION`
- `CONFIRMED`
- `CANCELLED`

確認必須由被指定且有能力的確認角色執行。主要照顧者記錄某個安排，不等於所有執行者都同意。

第一版固定採單一指定確認者：

- 每項需要確認的安排同一時間只能有一位目前確認者
- 確認者必須具有有效個案關係及必要資料權限
- `CONFIRM_ARRANGEMENT` 不自然來自協作管理者身分
- 確認者到期、撤銷或失去必要權限時，安排維持需要確認的語意並標示待重新指定確認者
- 第一版不做全員確認、比例門檻或多方表決

### 4.12 Question

代表針對照顧更新或個案狀況提出、需要回覆或治理判斷的問題。

狀態：

- `OPEN`
- `ANSWERED`
- `RESOLVED`
- `REOPENED`

必要關係：

- 可以引用一個或多個特定版本的來源內容
- 可以有一個或多個 Question Answer
- 可以連結零個或多個 Action Item
- 回答不自動解決
- Action Item 完成不自動解決

### 4.13 Question Answer

代表某位有權查看必要上下文的人對 Question 提供的有來源回答。

必要 invariant：

- Answer 是追加內容，不覆寫既有回答
- 必須保留回答者、時間與當時可見的來源版本
- Answer 可被更正或撤回，但歷史版本保留
- 新增 Answer 可以使 Question 進入 `ANSWERED`，但不能自動進入 `RESOLVED`

### 4.14 Action Item

代表需要特定人接受並執行的處理事項。

狀態：

- `PENDING_ACCEPTANCE`
- `ACCEPTED`
- `IN_PROGRESS`
- `COMPLETED`
- `DECLINED`
- `CANCELLED`
- `NEEDS_REASSIGNMENT`

必要關係：

- 可以引用一個或多個特定版本的 Observation、Arrangement、Question 或 Answer
- 具有指派者、被指派者、指派時間與必要期限
- 同一時點只有一位目前責任人；多人共同處理需拆成多項責任或留待後續設計
- 重新指派建立新的不可變責任週期，不覆蓋舊負責人、原指派者、接受時間、處理時間、結束原因或到期／撤銷時間
- `DECLINED` 後重新指派同樣建立新責任週期

### 4.15 Content Revision

代表對已發布內容的追加式更正或取代。

必要 invariant：

- 新版本不可變引用被更正版本
- 原始作者與更正者分開
- 畫面可顯示最新有效版本，但必須標示曾更正
- 下游 Question／Action Item 保留建立當時引用的版本
- 下游可提示存在新版本，但不能默默改寫其原始依據

### 4.16 Audit Event

代表治理、權限或狀態變更的不可變事件。

至少表達：

- event type
- actor reference
- case reference
- target entity reference
- event time
- previous state
- new state
- reason 或最小必要 metadata

Audit Event 不等於 Content Revision。前者證明發生了什麼治理動作；後者是可供業務流程使用的新內容版本。

## 5. Aggregate 與關係邊界

### 5.1 Care Case Aggregate

Care Case 負責：

- 個案狀態
- 授權聲明是否存在及是否有爭議
- 至少一條有效管理路徑
- 是否允許邀請、分享與日常協作

Care Case 不直接擁有 Account Identity 的生命週期，也不因帳號刪除而消失。

### 5.2 Membership Aggregate

Invitation 與 Case Membership 共同負責加入流程，但兩者不能合併為同一狀態：

- Invitation 接受前沒有內容權限
- 接受後建立或啟用 Membership
- 尚未到服務開始時間時，Membership 可為 `ACCEPTED` 但不能取得日常內容
- 有效期間成立才進入 `ACTIVE`

### 5.3 Care Update Aggregate

Care Update 的每個已發布版本都是可被引用的來源。Question、Answer 與 Action Item 不能只引用「目前內容」，必須知道建立當時引用的特定版本。

### 5.4 Action Aggregate

Action Item 自己管理責任狀態，不讓 Question 或 Care Update 代替它保存接受／完成狀態。Action 完成後只產生完成聲明與事件，不直接修改 Question 的解決狀態。

## 6. Capability Model

第一階段不以角色名稱直接判斷所有權限，而以角色授予的 capability 搭配其他條件判斷。

### 6.1 建議 capability 集合

| Capability | 語意 |
|---|---|
| `DECLARE_AUTHORIZATION` | 建立 Prototype 授權聲明 |
| `MANAGE_MEMBERS` | 發出、撤回邀請及管理一般成員 |
| `MANAGE_ADMIN_GRANTS` | 提議或執行已獲授權者同意的管理者授予／移轉 |
| `MANAGE_ACCESS_WINDOW` | 設定或縮短成員有效期間 |
| `CREATE_OBSERVATION` | 建立有來源觀察 |
| `PROPOSE_ARRANGEMENT` | 提議照顧安排 |
| `CONFIRM_ARRANGEMENT` | 在被指定時確認安排 |
| `CREATE_QUESTION` | 提出問題 |
| `ANSWER_QUESTION` | 在可見必要背景下回答問題 |
| `RESOLVE_QUESTION` | 依問題治理規則標示解決或重新開啟 |
| `ASSIGN_ACTION` | 指派處理事項 |
| `RESPOND_TO_OWN_ASSIGNMENT` | 接受或拒絕自己的指派 |
| `PROGRESS_OWN_ACTION` | 開始及完成自己已接受的事項 |
| `CORRECT_CONTENT` | 對指定資料類型提出追加式更正 |
| `WITHDRAW_CONTENT` | 依治理規則撤回已發布內容 |
| `ARCHIVE_CASE` | 依授權與治理條件封存個案 |

### 6.2 角色能力基線

| 角色 | 第一階段能力基線 | 仍需個別條件 |
|---|---|---|
| 未授權建立者 | 建立與編輯自己的最低資料草稿、聲明授權、放棄草稿 | 個案必須為自己建立的 `DRAFT` |
| 個案授權者 | 管理成員、管理者授予、期限、撤銷與封存治理 | 不自然取得所有內容；內容操作仍須分享範圍與目的允許 |
| 協作管理者 | 在授權範圍內管理一般成員、期限與重新指派 | 不能自行新增管理者、不能代理完成、不能因管理權看敏感內容 |
| 家庭照顧成員 | 依目的建立觀察、問題、安排或工作 | 只在 `ACTIVE` Membership 與允許分享範圍內 |
| 專業照顧成員 | 依服務目的建立或處理被授權內容 | 必須位於服務期間且身分未驗證提示持續存在 |
| 長者本人帳號 | 依其授權地位管理授權及參與內容 | 有帳號不自動解決意思能力或法律身分驗證 |

### 6.3 問題治理權限決策

第一條 Vertical Slice 固定：

- 問題提出者可以標示 `RESOLVED` 或在新資訊出現時 `REOPENED`
- 個案授權者只有在同時可查看該問題且被明確授予 `RESOLVE_QUESTION` 時才能治理
- 協作管理者不因管理身分自動取得 `RESOLVE_QUESTION`
- 回答者及 Action 負責人不因回答或完成自動取得解決權

此決策固定第一階段的問題治理 capability 邊界，仍須在後續資料模型與操作流程中驗證可執行性。

## 7. Authorization Decision Model

每次查看或操作必須計算：

```text
Allowed =
  case state permits action
  AND membership state permits action
  AND role grant includes capability
  AND case relationship matches
  AND declared purpose permits use
  AND record share scope includes actor
  AND current time is within valid period
```

任一條件不成立即拒絕。不能以角色聯集、管理者身分或機構名稱覆蓋較嚴格條件。

### 7.1 多重 Role Grant path

同一人在同一個案中可以有多項 Role Grant，但每次授權必須由其中一條完整有效的 grant path 單獨滿足全部七項條件。

- 不得把家庭角色的資料範圍、專業角色的 capability、另一條關係的目的及不同期限拼成合成權限
- 任一條完整 grant path 通過，才允許該次操作
- 新增或修改內容時必須保存 acting role、purpose 及 sharing scope
- 不同 grant path 會產生不同結果時，使用者必須明確選擇當次使用身分
- 無歧義的一般操作可使用可見預設值，但仍須保存實際採用的 acting role 與 purpose

### 7.2 分享範圍判斷

| Scope | 可見者概念規則 |
|---|---|
| `AUTHOR_ONLY` | 作者本人；另有最低治理處理需求時只能取得完成該治理動作所需 metadata，不取得內容全文 |
| `SHARED_CARE` | 個案內目的相符、具內容 capability 且在有效期間的 `ACTIVE` 成員 |
| `FAMILY_ONLY` | 具有家庭關係、目的相符且在有效期間的 `ACTIVE` 成員 |
| `DIRECT_PARTICIPANTS` | 被明確列入該物件的參與者，且仍須通過其他六項條件 |

### 7.3 `SUSPENDED` 最低治理操作

`SUSPENDED` 時預設拒絕日常內容查看與操作，只允許：

- 查看不含照顧內容的個案狀態與爭議提示
- 提交或記錄授權撤回、爭議補充及治理原因
- 由具治理權的人查看成員與管理責任 metadata
- 撤銷尚未接受的邀請
- 縮短或撤銷成員權限
- 提議管理權轉移
- 依已定規則恢復 `ACTIVE` 或封存
- 保存必要 Audit Event

不得：

- 查看觀察、問題、回答、安排或處理事項內容
- 新增日常內容
- 接受新邀請
- 匯出或列印個案內容
- 藉治理操作取得敏感內容全文

`SUSPENDED → ACTIVE` 的法律與爭議解除資格仍需專家確認，阻擋 Production，不阻擋概念資料模型設計。

## 8. 狀態機與合法轉換

### 8.1 Care Case

| From | Action | Actor | To | 非法或失敗結果 |
|---|---|---|---|---|
| `DRAFT` | 完成授權聲明 | 建立者本人 | `AUTHORIZATION_DECLARED`，隨即 `ACTIVE` | 聲明資料不完整則整體不轉換 |
| `ACTIVE` | 撤回授權或提出爭議 | 授權聲明者或具治理能力者 | `SUSPENDED` | 無權者不得改變狀態 |
| `SUSPENDED` | 爭議解除並恢復 | 合法資格仍待專家確認 | `ACTIVE` | 資格或必要紀錄不足則維持暫停 |
| `ACTIVE`／`SUSPENDED` | 依治理規則封存 | 授權者或獲同意的治理角色 | `ARCHIVED` | 最後管理責任或保存條件未處理則拒絕 |

`AUTHORIZATION_DECLARED` 是必須留下事件的瞬時業務狀態，不能因自動進入 `ACTIVE` 而省略其事件歷程。

### 8.2 Invitation 與 Membership

| From | Action | Actor | To | 規則 |
|---|---|---|---|---|
| `INVITED` | 接受 | 受邀者本人 | `ACCEPTED` | 不能由邀請者代替接受 |
| `INVITED` | 拒絕 | 受邀者本人 | `DECLINED` | 不建立內容權限 |
| `INVITED` | 撤回 | 邀請者或有管理能力者 | 終止邀請 | 保留撤回事件 |
| `ACCEPTED` | 服務開始且條件有效 | 系統依已接受條件判斷 | `ACTIVE` | 個案也必須是 `ACTIVE` |
| `ACTIVE` | 到達結束時間 | 系統時間判斷 | `EXPIRED` | 立即停止新存取 |
| `ACCEPTED`／`ACTIVE` | 主動撤銷 | 授權者或有撤銷能力者 | `REVOKED` | 記錄原因與時間 |

若個案進入 `SUSPENDED`，Membership 原始狀態可以保留，但有效存取結果必須立即為拒絕；不得把所有 Membership 批次改寫成另一個狀態而失去原生命週期語意。

### 8.3 Action Item

| From | Action | Actor | To | 規則 |
|---|---|---|---|---|
| 建立 | 指派 | 具 `ASSIGN_ACTION` 者 | `PENDING_ACCEPTANCE` | 保存指派者、被指派者及時間 |
| `PENDING_ACCEPTANCE` | 接受 | 被指派者本人 | `ACCEPTED` | 必須仍有有效成員資格及必要內容權限 |
| `PENDING_ACCEPTANCE` | 拒絕 | 被指派者本人 | `DECLINED` | 保存拒絕事件，可後續重新指派 |
| `ACCEPTED` | 開始 | 目前責任人 | `IN_PROGRESS` | 管理者不得代替開始 |
| `IN_PROGRESS` | 完成 | 目前責任人 | `COMPLETED` | 保存完成說明、完成者及時間 |
| `ACCEPTED`／`IN_PROGRESS` | 負責人到期、被撤銷、失去必要權限或主動退出 | 系統依成員及權限事實判斷 | `NEEDS_REASSIGNMENT` | 保存原責任週期的結束原因及時間 |
| `NEEDS_REASSIGNMENT` | 指定新負責人 | 具 `ASSIGN_ACTION` 的有效成員 | `PENDING_ACCEPTANCE` | 建立新的不可變責任週期，新負責人必須自行接受 |
| `DECLINED` | 指定新負責人 | 具 `ASSIGN_ACTION` 的有效成員 | `PENDING_ACCEPTANCE` | 建立新的不可變責任週期 |
| 非終止狀態 | 取消 | 有取消能力者 | `CANCELLED` | 必須提供原因 |

`COMPLETED` 與 `CANCELLED` 是事項終止結果；`DECLINED` 與 `NEEDS_REASSIGNMENT` 結束目前責任週期，但允許建立下一個責任週期。重新指派不能覆寫舊負責人、原指派者、接受時間、處理時間、結束原因或到期／撤銷時間。

### 8.4 成員到期或撤銷時的 Action 規則

若目前責任人的 Membership 到期或撤銷：

1. 已完成或已取消事項維持原結果
2. `ACCEPTED` 或 `IN_PROGRESS` 的負責人到期、被撤銷、失去必要權限或主動退出時，Action 原子轉為 `NEEDS_REASSIGNMENT`
3. 原責任週期保存舊負責人、原指派者、接受時間、處理時間、結束原因及到期／撤銷時間
4. 有 `ASSIGN_ACTION` 的有效角色選擇新責任人，Action 轉為 `PENDING_ACCEPTANCE` 並建立新責任週期；或由有權管理者取消
5. 新責任人必須重新接受，不能沿用前任的 `ACCEPTED`

### 8.5 Question

| From | Action | Actor | To | 規則 |
|---|---|---|---|---|
| 建立 | 提出問題 | 具 `CREATE_QUESTION` 者 | `OPEN` | 保存來源版本與分享範圍 |
| `OPEN`／`REOPENED` | 新增回答 | 具 `ANSWER_QUESTION` 者 | `ANSWERED` | 回答不等於解決 |
| `OPEN`／`ANSWERED`／`REOPENED` | 標示解決 | 提出者或明確治理角色 | `RESOLVED` | 必須保留解決者及理由 |
| `RESOLVED` | 新資訊出現並重新開啟 | 提出者或明確治理角色 | `REOPENED` | 不刪除舊回答或解決事件 |

`CLOSED` 不在第一階段。

## 9. 來源、版本與不可變引用

### 9.1 Reference 原則

當 Question 或 Action Item 由某筆 Observation 或 Answer 產生時，必須引用當時版本，而不是只引用可變的「最新內容」。

引用至少保留：

- 來源物件身分
- 來源版本身分
- 建立引用的時間
- 建立引用的 actor
- 當時分享範圍

### 9.2 更正流程

```text
Original published content
  → Correction request by authorized actor
  → New immutable version referencing previous version
  → Latest-effective pointer changes for presentation
  → Existing Question／Action references remain unchanged
  → UI may indicate a newer source version exists
```

### 9.3 撤回流程

- 撤回不物理刪除已發布內容
- 一般畫面不再將撤回版本當作目前有效內容
- 已引用該版本的歷史流程保留引用，但顯示來源已撤回
- Audit Event 保存撤回者、時間及原因
- 草稿在尚未發布前可以真正刪除

### 9.4 引用來源後續更新

Question、Question Answer 與 Action Item 必須引用建立當時的特定來源版本。來源後續更正時：

- 不自動替換既有引用
- 不自動修改 Question、Answer 或 Action Item
- 不自動擴大來源或下游物件的分享範圍
- 顯示「引用來源已有更新」及發生更新的來源筆數
- 有權使用者可以人工檢查新版本，並建立新的來源引用
- 舊引用、新引用及更新歷程全部保留
- 第一版不做自動內容合併

更新筆數只計算目前使用者有權得知的來源，不得以數量洩漏不可見內容。

## 10. 核心關係圖

```text
Person ── optional ── Account Identity
  │
  ├── receives Invitation ── for ── Care Case
  │                              │
  └── Case Membership ───────────┤
         │                       │
         ├── Role Grant          ├── Authorization Declaration
         ├── Purpose             ├── Care Update
         ├── Share ceiling       │      ├── Observation
         ├── Valid period        │      ├── Care Arrangement
         └── Service declaration │      ├── Question
                                 │      └── Question Answer
                                 │
                                 ├── Action Item
                                 │      └── references exact Care Update versions
                                 │
                                 └── Audit Event
```

關係圖只表達概念依賴，不代表資料庫 ownership、外鍵或刪除策略。

## 11. Domain Invariant 清單

### 11.1 Case Governance

- 個案不能因單一 Account Identity 消失而消失
- `DRAFT` 不可邀請或分享
- 授權聲明事件不可省略
- `SUSPENDED` 阻止日常內容存取
- 最後管理者不能在替代者接受前離開

### 11.2 Membership

- 邀請不等於成員資格
- 接受不等於目前可存取；仍須符合開始時間、個案狀態及其他條件
- 機構或職稱聲明不產生組織衍生權限
- 到期與撤銷都立即停止新的線上存取，但保留歷史作者與責任事件

### 11.3 Content

- 已發布內容不可就地覆寫
- 更正者不成為原作者
- 每筆內容必須有分享範圍
- 下游引用固定到特定版本
- 管理者不自然取得內容全文

### 11.4 Action

- 指派不等於接受
- 只有被指派者能接受或拒絕
- 只有目前有效責任人能開始與完成
- 完成不自動解決 Question
- `NEEDS_REASSIGNMENT` 明確表示目前沒有可繼續履行的有效責任人
- 重新指派建立新的不可變責任週期，不覆寫舊責任歷程

### 11.5 Authorization

- 七項條件全部成立才允許
- 任何一項拒絕即拒絕整體操作
- 多重角色不能透過聯集或欄位拼接繞過目的、期間或分享範圍；必須有一條完整 grant path 單獨通過七項條件
- `AUTHOR_ONLY` 的治理例外只允許最小 metadata，不等於內容查看權

## 12. 核心替代方案比較

### 12.1 個案生命週期根

| 方案 | 優點 | 主要問題 | 判定 |
|---|---|---|---|
| A. 單一使用者 owner | 與 v1 現況接近、概念簡單 | owner 離開或刪帳可能破壞整個個案；不支援多人治理 | Reject |
| B. 機構作為永久 owner | 適合單一機構內管理 | 家庭自行開始及跨單位延續困難；服務結束後機構仍可能控制個案 | Reject for v2 MVP |
| C. Care Case 獨立存在，由 Membership 與 Role Grant 治理 | 個案與帳號分離；可支援家庭起始、多管理者及限期專業成員 | 後續一致性與權限 enforcement 較複雜 | **Recommend** |

### 12.2 權限表達方式

| 方案 | 優點 | 主要問題 | 判定 |
|---|---|---|---|
| A. 只用角色 | 容易理解與實作 | 無法表達同角色不同個案、目的、期間及分享範圍 | Reject |
| B. 每筆內容任意 ACL | 彈性最高 | 第一線負擔大、容易配置錯誤、難以形成一致產品語意 | Defer |
| C. 角色能力＋個案關係＋目的＋固定分享範圍＋期間 | 能維持最小權限且限制 UI 複雜度 | 需定義清楚的交集判斷 | **Recommend** |

### 12.3 照顧更新物件

| 方案 | 優點 | 主要問題 | 判定 |
|---|---|---|---|
| A. 所有內容放進單一通用 Update | 可共用作者、來源與時間 | 容易把觀察、問題、回答與安排狀態混在一起 | Reject as sole model |
| B. 每種類型完全獨立 | 狀態最清楚 | 來源、版本、分享及 Audit 容易重複設計 | Partial |
| C. 共用不可變來源外框＋類型化 Domain Object | 共用 provenance、版本及分享規則，同時保留各自狀態 | 需要明確禁止跨類型錯誤轉換 | **Recommend** |

推薦的「共用外框」只描述作者、來源、時間、分享範圍及版本等共同語意；Observation、Arrangement、Question 與 Answer 仍是不同 Domain Object，不是以任意 JSON 或單一狀態欄位混合處理。

### 12.4 Question 與 Action Item

| 方案 | 優點 | 主要問題 | 判定 |
|---|---|---|---|
| A. Question 與 Action 合併 | 物件少 | 回答、解決、接受、執行與完成語意互相污染 | Reject |
| B. 完全分離且不能互相引用 | 狀態單純 | 無法追蹤「問題產生工作、工作完成但問題未解決」 | Reject |
| C. 獨立狀態機＋不可變來源連結 | 保持責任清楚並支援追溯 | 需處理多對多連結與版本提示 | **Recommend** |

### 12.5 已發布內容修改

| 方案 | 優點 | 主要問題 | 判定 |
|---|---|---|---|
| A. 就地更新最新內容 | UI 與儲存簡單 | 原作者、原始內容及下游決策依據會消失 | Reject |
| B. 全面 Event Sourcing | 追溯能力最完整 | 學生 MVP 的讀取模型與除錯成本過高 | Defer |
| C. 已發布版本不可變＋追加式更正＋最小 Audit | 保留可信來源且控制 MVP 成本 | 需明確 latest-effective presentation 規則 | **Recommend** |

### 12.6 Action 重新指派

| 方案 | 優點 | 主要問題 | 判定 |
|---|---|---|---|
| A. 覆寫目前負責人 | 實作簡單 | 舊責任、接受及處理歷程消失 | Reject |
| B. 只建立衍生的「需重新指派」結果 | 不增加狀態 | 容易讓 Action 本身仍停在 `ACCEPTED`／`IN_PROGRESS`，造成責任語意錯誤 | Reject |
| C. Action 進入 `NEEDS_REASSIGNMENT`，並保留舊責任週期、建立新責任週期 | Action 狀態與責任可用性一致，且歷史不被覆寫 | 邏輯模型須保證目前責任週期唯一 | **Selected** |

## 13. 權限判斷所需 Domain Data

本節只列概念資料需求，不指定欄位或儲存方式。

| 判斷維度 | 必須可取得的 Domain facts |
|---|---|
| 個案狀態 | 目前 Case 狀態、狀態生效時間、是否有授權爭議 |
| 成員狀態 | Invitation／Membership 狀態、接受時間、撤銷或到期時間 |
| 角色能力 | 個案內有效 Role Grant、capability 及授予來源 |
| 個案關係 | 家庭、專業、長者本人或治理關係，以及關係所屬個案 |
| 使用目的 | 邀請及 Membership 所聲明目的、當次操作 purpose context |
| 分享範圍 | 來源版本的固定 scope、直接參與者集合及可能的分享上限 |
| 有效期間 | 服務開始、服務結束、撤銷生效及判斷時間 |
| 內容來源 | 作者、來源類型、特定版本、撤回與更正關係 |
| 責任 | 指派者、目前責任人、責任週期、接受及狀態事件 |
| 治理連續性 | 目前有效管理者、候任管理者是否已接受、封存狀態 |

不能只憑前端傳入的角色名稱、機構名稱或目前畫面狀態作出授權決定。後續 Logical Data Model 必須能從可信 Domain facts 重建每一次允許或拒絕結果。

## 14. v1 相容性影響

### 14.1 可以保留但不能直接等同的 v1 概念

| v1 概念 | v2 可能關係 | 相容性限制 |
|---|---|---|
| Auth user／profile | 可繼續作 Account Identity 起點 | 不能繼續作個案生命週期根；歷史 actor 不能只依賴可刪帳號 |
| care receiver | 可能成為 v2 Care Case 的長者核心資料來源 | 現有唯一 owner 與 Cascade 語意不可直接沿用 |
| care source | 可提供既有照顧參與者候選資料 | Care Source 不等於已接受邀請的 Person／Membership，也不證明帳號或專業關係 |
| care task／handoff | 可作未來照顧工作與交接內容的選用模組 | 不等於 v2 Observation、Question 或 Action；不可直接混用狀態 |
| current／backup assignment | 可保留為 v1 現況與備援模組 | 不等於 v2 Membership、Role Grant 或 Action 接受狀態 |
| scenario／coverage result | 可在未來作決策輸入 | 第一條 v2 Vertical Slice 不回接，也不能改寫 v2 責任狀態 |

### 14.2 不可採用的相容策略

- 不把 v1 owner 直接重新命名為 v2 授權者或協作管理者
- 不把 Care Source 自動轉成已接受邀請的成員
- 不把 Backup `CONFIRMED` 解讀為對 v2 Membership 或 Action 的接受
- 不把 Handoff Readiness 解讀為 Question 已解決或 Action 已完成
- 不把 Coverage `COVERED` 解讀為交接流程已完成
- 不為了沿用 v1 Schema 而降低 Phase 0.1 的帳號／個案解耦 invariant

### 14.3 建議相容方向

推薦採「模組並存、語意明確映射」：

- v1 Coverage／Scenario、Task／Handoff 在決定回接前維持獨立模組
- v2 先建立自己的治理、成員、更新與責任語意
- 若未來需要引用 v1 Task 或 Handoff，使用明確的跨模組 reference，不複製或偷換狀態
- 任何既有資料映射都必須經獨立 migration／backfill review，本文件不預先認定可一對一轉換

### 14.4 相容性風險

- v1 唯一 owner Cascade 是 Migration 007 前最高優先 BLOCKER
- v1 Care Source 可能沒有 Account Identity，不能假設可接收邀請
- v1 Assignment 的確認語意由主要照顧者記錄，不等於被指派者本人接受
- v1 文件與 Coverage Engine 實作存在版本落差，不能以文件單獨作為回接 contract
- v1 Production 資料與遠端安全狀態本輪未重新驗證

## 15. 三個情境 Walkthrough

### 15.1 情境 A：家庭成員建立長者草稿，尚未取得授權

**流程**

1. 家庭成員以 Account Identity 建立 `DRAFT` Care Case
2. 系統記錄建立者，但不授予對外分享或邀請能力
3. 建立者只輸入最低顯示名稱與草稿目的
4. 建立者尚未提交 Authorization Declaration

**誰能做什麼**

- 建立者：查看、編輯或放棄自己的最低資料草稿；提交授權聲明
- 其他家屬、專業人員及任何機構人員：不能查看或加入
- 系統管理功能：只能維持草稿與安全操作，不得推定授權

**可見資料**

- 只有建立者可見草稿最低資料
- 不應在此階段輸入或分享完整健康、家庭、問題或專業內容

**取得與失去權限時間**

- 建立者在草稿建立時取得有限草稿能力
- 草稿被放棄／刪除或帳號刪除前完成草稿處理後失去能力
- 不會因填寫家屬關係就取得 `ACTIVE` 個案權限

**必要 Audit Event**

- 草稿建立可保留最低建立事件
- 授權聲明若尚未發生，不得產生假的授權事件
- 草稿真正刪除的 Audit 要求仍需保存／刪除政策確認；未發布內容本身可刪除

**判定**

- Domain 規則可判定
- 法律專家仍需確認「適當授權者」與衝突聲明處理，但不影響草稿限制模型

### 15.2 情境 B：家庭邀請日照人員，服務三個月後到期

**流程**

1. Care Case 已為 `ACTIVE`
2. 授權者或有 `MANAGE_MEMBERS` 的管理者邀請一位具名日照人員
3. Invitation 記錄目的、角色、分享上限及三個月服務期間
4. 日照人員在未看見健康內容前接受
5. 服務開始後 Membership 進入 `ACTIVE`
6. 三個月期滿後 Membership 進入 `EXPIRED`

**誰能做什麼**

- 邀請者：在授權範圍內發出或撤回邀請
- 受邀日照人員：本人接受／拒絕；啟用後只處理目的與 scope 允許的內容
- 同一日照機構其他人員：沒有任何自動權限
- 管理者：可縮短期限或撤銷，但不能替日照人員接受或完成事項

**可見資料**

- 接受前：只有邀請最低資訊
- `ACTIVE` 期間：只見服務目的及分享範圍交集內資料
- 到期後：不能新讀取、下載、匯出或操作；歷史作者名稱與事件仍保留給目前有權者

**取得與失去權限時間**

- 接受且服務開始、個案仍為 `ACTIVE` 時取得
- 結束時間到達時立即失去，不等待下次登入

**必要 Audit Event**

- 邀請發出、接受、Membership 啟用、期限設定與到期
- 角色、目的或期限變更
- 到期造成的 Action 重新指派結果

**判定**

- Domain 規則可判定
- 後續技術設計必須證明到期 enforcement 不能被既有 session 或直接資料存取繞過

### 15.3 情境 C：日照回報沐浴時皮膚異常，家屬提問，護理人員接受處理並完成

**流程**

1. 有效日照成員建立 Observation，記錄觀察者、發生時間、來源與分享範圍
2. 有權家屬依該 Observation 特定版本建立 Question，狀態為 `OPEN`
3. 有 `ASSIGN_ACTION` 的成員建立 Action Item 並指派給已在有效服務期間的護理人員
4. Action 進入 `PENDING_ACCEPTANCE`
5. 護理人員本人接受，狀態進入 `ACCEPTED`
6. 護理人員開始處理，狀態進入 `IN_PROGRESS`
7. 護理人員新增完成說明並標示 `COMPLETED`
8. Question 不自動解決；家屬或明確問題治理者檢視回答與結果後標示 `RESOLVED`

**誰能做什麼**

- 日照人員：在其目的與 scope 內建立觀察；不能作診斷式宣稱
- 家屬：在可查看來源時提出問題
- 指派者：只能指派給具有效 Membership 及必要能力的人
- 護理人員：本人接受、開始及完成自己的 Action；只能查看完成工作所需內容
- 管理者：不能替護理人員接受或完成，也不能因管理身分查看所有專業內容

**可見資料**

- Observation、Question、Action 各自依原始 scope 與直接參與者判斷
- Action 的建立不能自動把整個個案或所有家庭資訊分享給護理人員
- 問題與 Action 保留建立當時引用的 Observation 版本

**取得與失去權限時間**

- 每位專業成員只在自己的有效服務期間內取得必要權限
- 撤銷、到期或個案 `SUSPENDED` 時立即失去新存取
- 歷史作者與責任事件保留，但離開者不能再登入查看

**必要 Audit Event**

- Observation 建立及任何更正／撤回
- Question 建立、回答、解決或重新開啟
- Action 指派、接受、開始、完成、取消或重新指派
- 角色、scope 或服務期限變更

**矛盾與待確認**

- 「護理人員」身分第一階段只是未驗證聲明，UI 不得暗示系統已驗證資格
- 皮膚異常屬觀察，不得在 Prototype 中轉成診斷
- 問題治理者除提出者外的範圍已在本 Review 建議限於明確 capability，仍需產品端確認

## 16. 「上次查看後的新變化」評估

### 16.1 產品價值

v2 核心問題是不同時間參與者能否快速接續。若使用者每次都必須重新閱讀完整時間軸，系統雖然保存了來源與狀態，仍可能無法有效回答「我上次離開後發生了什麼」。因此此能力與第一條 Vertical Slice 的研究問題直接相關，不只是視覺優化。

### 16.2 替代方案

| 方案 | 優點 | 風險 | 判定 |
|---|---|---|---|
| A. 每筆內容保存已讀／未讀 | 可精確顯示未讀 | 容易被誤解為已理解；寫入量與隱私 Audit 範圍大 | Defer |
| B. 每個 Membership 保存個案層級的最後成功查看邊界 | 成本較小，可顯示其後可見的新事件 | 仍須定義何時推進邊界；不能當成逐筆已讀證明 | **Recommend for first slice** |
| C. 使用者每次手動選日期 | 無需保存查看狀態 | 操作負擔高，無法自然支援接續工作 | Fallback only |

### 16.3 推薦的 MVP 語意

第一條 Vertical Slice 正式納入最小「上次查看後的新變化」，建立概念層級的 per-member case view cursor。它只表達：

> 這個成員上次成功開啟此個案協作時間軸後，新增或改變、且目前仍有權查看的事件

不使用：

- 已讀
- 對方已理解
- 對方已確認
- 所有人都看過

必要 invariant：

- 查看邊界綁定 Case Membership，不只綁定 Account Identity
- 每位有效成員、每個個案各自保存一個 cursor，只供該成員本人使用
- cursor 使用不可倒退的系統紀錄順序或 high-water mark，不以可回填或更正的事件發生日期判斷新舊
- 只計算當前權限交集允許的事件，不顯示隱藏內容數量
- Membership 到期或撤銷後，不再提供新變化清單
- 歷史 cursor 不授予任何內容存取權
- 分享範圍後來縮小的內容不能因舊查看邊界而繼續顯示
- 更正、撤回、Question 狀態與 Action 狀態變更都可成為新變化事件
- 查看邊界不是 Audit Read Receipt，不證明使用者逐筆閱讀
- 系統只有在時間軸資料成功載入並呈現後才能推進邊界；載入失敗不得更新
- cursor 不得倒退
- 成員離開後重新加入是否沿用舊 cursor，留待 Logical Data Model Design Review

### 16.4 Slice 範圍建議

納入第一條 Vertical Slice 的最小內容：

- 顯示「上次開啟後有 N 筆新變化」
- 可篩選上次開啟後的可見 Observation、Question、Answer 與 Action 狀態事件
- 顯示作者、事件時間、類型及目前狀態
- 不做逐筆閱讀回條、通知、Email、Push、已讀人員名單或完整閱讀 Audit

此 cursor 是第一條 Vertical Slice 的正式 Domain requirement。Logical Data Model Review 必須處理多裝置競態、不可倒退順序及重新加入語意，但不得把 cursor 錯綁到跨個案 Account Identity，也不得以 cursor 洩漏不可見事件。

## 17. 第一條 Vertical Slice 的 Domain 流程

1. Person 使用 Account Identity 建立 Care Case 草稿
2. 系統只允許輸入最低辨識資料
3. 建立者提交 Authorization Declaration
4. 系統保存聲明事件，個案經瞬時 `AUTHORIZATION_DECLARED` 進入 `ACTIVE`
5. 授權者或有能力的管理者建立 Invitation
6. 受邀者在看不到健康內容的情況下接受或拒絕
7. 接受且服務期間開始後，Case Membership 進入 `ACTIVE`
8. 成員建立一筆 Observation，保存來源版本與分享範圍
9. 有權成員依 Observation 建立 Question 或 Action Item
10. Action 被指派後為 `PENDING_ACCEPTANCE`
11. 被指派者接受、開始並由本人完成
12. Question 提出者或明確治理角色獨立判斷是否 `RESOLVED`
13. 所有關鍵動作形成 Audit Event
14. 專業 Membership 到期後立即停止新存取
15. 符合條件的未完成 Action 進入 `NEEDS_REASSIGNMENT`，由有效角色建立新責任週期並重新指派，或由有權管理者取消

這條流程不包含 PDF、AI、Coverage Engine、完整機構後台、組織管理者或正式專業身分驗證。

16. 成員再次開啟個案時，只看到目前有權查看的「上次開啟後新變化」，且此提示不表示已讀或已理解

## 18. 反例與失敗情境檢查

| 情境 | 必須拒絕或保護的結果 |
|---|---|
| 建立者未聲明授權便邀請家屬 | 拒絕邀請；不揭露內容 |
| 管理者嘗試查看 `AUTHOR_ONLY` 觀察 | 拒絕內容查看；僅在必要治理事件中看到最小 metadata |
| 日照人員自行填寫機構名稱後查看同機構其他個案 | 拒絕；機構聲明不產生跨個案權限 |
| 邀請尚未接受便查看個案問題 | 拒絕；Invitation 不是 Membership |
| 專業人員服務到期後刷新既有內容頁 | 拒絕新讀取，不因曾經看過而保留線上權限 |
| 管理者替負責人接受或完成 Action | 拒絕；管理能力不包含代理履行 |
| Action 完成後系統自動解決 Question | 拒絕自動轉換；Question 維持獨立狀態 |
| 原作者修改已發布觀察 | 建立新版本，不覆寫原始版本 |
| 更正後既有 Action 默默改用新來源 | 禁止；保留原引用並提示新版本 |
| 唯一管理者刪除帳號 | 阻止刪除或要求先完成管理轉移／封存；個案不得連帶刪除 |
| 個案進入 `SUSPENDED` 後成員使用舊連結 | 拒絕內容存取與匯出 |
| 同一人兼具家庭與專業角色 | 依當次目的及分享範圍交集判斷，不取兩角色最大權限聯集 |
| 新變化統計包含已失去權限的內容 | 拒絕；只統計目前授權交集允許的事件，且不能洩漏隱藏筆數 |
| 時間軸載入失敗卻更新查看邊界 | 禁止；只有成功呈現後才能推進邊界 |

## 19. Audit Event 對照

| Domain 行為 | 必要 Audit Event |
|---|---|
| 授權聲明、撤回、爭議 | actor、case、聲明或原因版本、時間、前後狀態 |
| 個案狀態轉換 | actor、前後狀態、原因、時間 |
| 邀請及成員生命週期 | 邀請者／受邀者、目的、角色、期限、結果、時間 |
| 角色、目的、分享上限或期限變更 | 操作者、前後值、原因、時間 |
| Observation／Answer／Completion 建立 | 作者、來源、版本、時間、分享範圍 |
| 更正或撤回 | 原版本、新版本或撤回結果、操作者、原因、時間 |
| Question 狀態轉換 | 操作者、前後狀態、理由、時間 |
| Action 指派與狀態轉換 | 指派者、責任人、前後狀態、時間、原因 |
| 重新指派 | 舊責任週期、新責任週期、操作者、原因、時間 |

一般頁面閱讀 Audit、Phase 4 摘要與列印 Audit 不屬第一條 Vertical Slice。「上次查看後的新變化」使用的個案層級查看邊界只是產品導覽狀態，不等於完整閱讀 Audit 或逐筆已讀證明。

## 20. Domain Model Review 決策結果

### 20.1 本 Review 已固定

- Person、Account Identity、Care Case、Invitation、Membership 與 Role Grant 分離
- 個案不以帳號為生命週期根
- Question 作為 Care Update 家族中的獨立狀態物件，可連結 Action Item
- Question Answer 是追加式版本內容
- Action Item 有包含 `NEEDS_REASSIGNMENT` 的七狀態責任週期
- 重新指派建立新責任週期，不覆寫歷史
- 更正與撤回採不可變來源版本
- 來源更新不自動替換既有引用；顯示更新筆數並由有權使用者人工建立新引用
- Arrangement 第一版採單一指定確認者
- `SUSPENDED` 的最低治理操作與禁止範圍
- 邀請接受前可揭露的最低資訊
- 第一階段問題治理 capability 基線
- 授權判斷採七項條件交集
- 多重角色採完整 grant path 判斷，不允許跨角色拼接權限
- v1 模組採並存與明確映射，不直接偷換 Domain 語意
- 第一條 Vertical Slice 正式包含 Membership-scoped per-case view cursor，但不建立逐筆已讀模型

### 20.2 原五項 Domain TBD disposition

原草案提出的五項 Domain TBD 不再原封不動保留為未決。產品語意已固定；尚需處理的部分只進入 Logical Data Model Design Review，不得倒退為產品決策未定。

| 原 Domain TBD | 本輪 disposition | 已固定的 Domain Decision | 後續 Logical Model Question |
|---|---|---|---|
| 負責人失去資格後如何處理未完成 Action | **已決定** | `ACCEPTED`／`IN_PROGRESS` 轉為 `NEEDS_REASSIGNMENT`；重新指派建立新的不可變責任週期；`DECLINED` 後重新指派亦建立新週期 | 如何保證同一時間只有一個目前責任週期，以及狀態轉換與責任週期建立的原子性 |
| 被引用來源後續更正時如何處理 | **已決定** | Question、Answer 與 Action 保留建立當時的來源版本；只提示來源已有更新及可見更新筆數，不自動替換、合併、改寫或擴大分享範圍；有權使用者可人工新增引用 | 多來源同時更新時，如何計算可見更新筆數並避免重複處理 |
| Arrangement 由誰確認 | **已決定** | 第一版每項需確認安排只有一位目前指定確認者；確認者須具完整有效權限；管理身分不自然取得確認能力；確認者失權後須重新指定 | 如何無歧義表示目前確認者、待重新指定狀態及歷史確認責任 |
| 同一人具有多重角色時如何授權 | **已決定** | 每次操作必須由一條完整有效的 grant path 單獨滿足七項條件，不得跨角色拼接；新增或修改內容保存 acting role、purpose 與 sharing scope；結果有歧義時由使用者明確選擇身分 | 如何表達多項 Role Grant、選定 acting context，以及如何驗證每條路徑完整成立 |
| 是否將「上次查看後的新變化」納入第一條 Vertical Slice | **已決定並納入** | 使用 per-membership、per-case 的不可倒退 high-water cursor；Timeline 成功載入後才前移；不建立逐筆已讀或公開閱讀名單；cursor 不產生內容存取權 | 多裝置競態下如何維持不可倒退，以及成員離開後重新加入是否沿用舊 cursor |

因此，以上五項不再列為 Domain Model Gate 的未決事項。右欄問題只影響後續邏輯結構與一致性設計，不改變本輪已固定的產品語意。

### 20.3 可進入下一個設計 Gate 的項目

本文件完成後，可以進入「Logical Data Model Design Review」，討論概念物件如何映射成可驗證的邏輯資料結構、必要一致性與生命週期邊界。

這不等於允許：

- 建立 Migration 007
- 撰寫 SQL 或 RLS
- 修改現有 Schema
- 實作 App 或 API
- 搬移 v1 資料

### 20.4 Migration 007 前仍保留的硬性 BLOCKER

- 個案與既有唯一 owner／Cascade 結構的安全解耦方案
- 帳號離開後的歷史 actor reference 與顯示策略
- 最後管理者轉移的原子性與失敗回復
- 七項授權交集的可強制執行設計
- 到期及撤銷的即時 enforcement
- v1 既有資料的保留、相容、回滾及 preflight 策略
- 完整測試重新執行與 Coverage Engine 文件落差處理

## 21. 後續 Logical Model Questions 與非阻擋事項

### 21.1 Logical Data Model Design Review 必須處理

- 成員離開後重新加入同一個案時，是否沿用舊 per-member case view cursor
- high-water mark 在多裝置同時載入時如何維持不可倒退
- Action 多個不可變責任週期中「目前責任週期唯一」的邏輯 invariant
- Arrangement 確認者到期、撤銷或失權後，待重新指定確認者如何保持無歧義
- 多個來源同時更新時，更新筆數與人工新增引用如何避免重複處理

### 21.2 第一條 Vertical Slice 前須確認

- 未驗證專業身分及機構聲明的固定 UI 文案
- 授權聲明與限制提示的版本化文案
- 邀請最低個案顯示名稱是否會在實際場域造成身分洩漏
- `SUSPENDED`、到期、撤銷及重新指派的使用者可理解文案
- 虛構測試資料與研究同意規則

### 21.3 法律、隱私或場域專家確認

- 誰屬適當授權者，以及衝突聲明如何恢復個案
- 封存、刪除、去識別化與法定保存期限
- 專業與家庭分享範圍是否符合真實工作邊界
- 未驗證身分聲明能否避免使用者誤認
- Audit、作者識別與撤回內容的保存合法基礎

### 21.4 Defer

- 組織管理者與組織層級權限
- 正式專業身分及機構驗證
- 機構成員異動自動同步
- 多法人治理
- PDF／列印／離線摘要實作
- 全量閱讀 Audit
- AI 摘要與任務提取
- Coverage Engine 回接

## 22. Gate 判定

- **Phase 0.1 Governance Scope Freeze：** 已作為本 Review 的上游基準
- **Domain Model Design Review：** `PASS — PRODUCT DECISIONS INCORPORATED`
- **可進入 Logical Data Model Design Review：** 是；第 21.1 節項目是該 Gate 必須處理的邏輯設計問題，不再是本 Domain Gate 的未決產品語意
- **可直接建立 Migration 007：** 否，`BLOCKED`
- **可直接撰寫 SQL／RLS：** 否
- **可直接開始 Vertical Slice Implementation：** 否

本 Review 的成果是概念語意與責任邊界，不是技術實作授權。

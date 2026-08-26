# WinWin Core Object Model Design Review — Phase 2

> **狀態：DRAFT — Conceptual Design Review Only**
>
> **範圍：Invitation → Membership → Relationship／Service Relationship → Grant**
>
> 本文件不是 ERD，不定義資料表、欄位、FK、constraint、正式狀態碼、API、RPC、transaction、token、RLS、Migration 或前端實作。

## 1. Purpose and scope

本階段要回答：WinWin 如何讓特定對象受邀加入一個 Care Case，如何保存其個案參與生命週期、家庭或專業服務關係，以及如何用最小且可撤銷的 Grant 限制每次存取與操作。

本階段只處理：

- Invitation。
- Membership。
- Relationship／Service Relationship。
- Grant／Permission。
- 一條完整有效 Grant path 的產品語意。
- 多重身分下的 acting context。

本階段不完整設計 Question、Action、Action Assignment、Outcome、內容模型或 Care Circle 技術實作。文中提及 Action Assignment，只為維持「Assignment 不得建立 Membership 或 Grant」的既有產品邊界。

## 2. Authoritative baselines

本文件依據順序如下：

1. [`WINWIN_PRODUCT_DEFINITION_BOUNDARY_V1.0.md`](WINWIN_PRODUCT_DEFINITION_BOUNDARY_V1.0.md)。
2. [`WINWIN_CORE_OBJECT_MODEL_PHASE_1_DESIGN_REVIEW_DRAFT.md`](WINWIN_CORE_OBJECT_MODEL_PHASE_1_DESIGN_REVIEW_DRAFT.md)。
3. 既有 Prototype、舊 Domain 文件與 Migration 007／008，只作候選相容性參考。

Phase 1 已固定且本文件不得推翻：

- Care Case 具有獨立治理與協作生命週期。
- Person 是受限概念或 Case-scoped reference。
- Account Identity 與 Person／Care Case 分離；高齡者可沒有登入帳號。
- 每個 Care Case 恰好一位 Care Recipient Role。
- 不做跨 Care Case 真人自動比對、去重或合併。
- Care Circle 是有效關係與授權結果的權限化投影，不是存取真相來源。
- Account Identity 不得成為 Care Case 的生命週期根。
- 歷史參與不代表目前仍有存取權。
- 最後治理者具有正常移交及不可預期失效的兩階段保護。

本文件不得讓現有程式、資料表或 Migration 007／008 反向決定 WinWin 模型。

## 3. Terminology

| Term | Phase 2 conceptual meaning | Explicit boundary |
|---|---|---|
| Invitation | 向綁定的預定接收者提出加入特定 Care Case 關係的請求 | 不是 Membership、Relationship 或 Grant；credential 被開啟不代表接受 |
| Invitation credential | 同一邀請可透過連結、QR Code 或一次性代碼傳遞的受控憑證概念 | 三種載體不是三份邀請；不凍結 token 或 hash 技術 |
| Membership | 某個 Account Identity／受治理人物參照與特定 Care Case 之間的參與生命週期 | 只表達個案成員關係，不代表全部資料權限 |
| Relationship | 成員在該 Care Case 中與被照顧者或協作情境的關係事實 | 不是 Permission；家庭關係存在不保證目前可存取 |
| Service Relationship | 具有服務來源、目的及期間的專業個案服務關係 | 專業資格不等於正在服務某 Case |
| Professional identity verification | 對帳號所宣告專業身分的驗證事實 | 不是 Membership、Service Relationship 或 Case Grant |
| Grant／Permission | 在目的、資料範圍、能力及有效期間內允許特定操作的授權 | 不是身分、Membership 或 Relationship |
| Complete grant path | 單次操作由一條有效 identity、Membership、Relationship、Grant 及 Case context 共同成立的路徑 | 不得拼接不同角色或關係的部分條件 |
| Acting context | 當兩條以上有效路徑會產生不同結果時，本次操作明確選用的單一路徑脈絡 | 不是永久切換主要身分，也不允許能力合併 |
| Authorization generation | 一段可追溯且不可由舊失效關係自然恢復的新參與／關係／授權週期 | 不凍結資料識別碼或版本欄位 |

核心不等式：

`Invitation ≠ Membership ≠ Relationship／Service Relationship ≠ Grant／Permission`

## 4. Alternative models

### 4.1 方案 A — Membership contains role, relationship and all permissions

加入成員時，在同一概念中直接保存角色、關係及全部可見資料。

### 4.2 方案 B — Role-based only

只依 FAMILY、NURSE、CASE_ADMIN 等角色名稱決定權限。

### 4.3 方案 C — Invitation, Membership, Relationship and Grant separated

Invitation 表示加入請求；Membership 表示 Case 參與生命週期；Relationship 表示家庭或服務關係；Grant 表示目的、範圍、能力及期間。

### 4.4 方案 D — Per-record arbitrary ACL

每筆內容自由指定可見帳號或成員，不依穩定的關係與 Grant path。

### 4.5 Comparison

| 面向 | A：Membership 全包 | B：Role only | C：四概念分離 | D：逐筆任意 ACL |
|---|---|---|---|---|
| 使用者理解負擔 | 表面低，日後難解釋為何失權 | 低，但職稱被誤當權限 | 中；可用清楚 UI 隱藏內部複雜度 | 高；每筆都需判斷對象 |
| 權限過寬風險 | 高 | 很高 | 最低，可最小化目的與範圍 | 中高，容易誤選對象 |
| 專業服務到期 | 容易連同成員事實混合終止 | 角色仍在，難以自然到期 | Service Relationship／Grant 可依期間失效 | 必須逐筆撤回，易遺漏 |
| 多重身分 | 容易把角色塞入同一 Membership | 容易拼接 FAMILY＋NURSE | 可用單一完整 path 與 acting context | 帳號 ACL 無法表達 acting role |
| 歷史追溯 | Membership 改寫易失去舊脈絡 | 只知道角色，缺少關係與目的 | 可保留歷史 generation 與當時 context | 可見清單改動難解釋來源 |
| 轉職／離職 | 容易覆寫原 Membership | 仍有 NURSE 角色而誤授權 | 終止舊 Service Relationship，建立新週期 | 需人工掃描所有 ACL |
| 重複授權 | 欄位與角色容易重疊 | 多角色重疊 | 可治理 Grant path 與 generation | 高度分散、難偵測 |
| 撤銷與重新加入 | 常以恢復舊 Membership 處理 | 角色再次啟用可能恢復舊權限 | 新 Membership／Relationship／Grant generation | 需重建逐筆清單 |
| 學生 Prototype 可行性 | 高但語意債務大 | 很高但不符合產品原則 | 中；可先做概念與單一路徑示範 | 低 |
| 未來持久化複雜度 | 初期低、後期高 | 初期低、例外快速增加 | 中高但邊界清楚 | 很高 |
| 符合 Product Definition | 不符合概念分離 | 不符合完整授權路徑 | **最符合** | 不符合穩定、可追溯與最小授權主幹 |

**Accepted for Phase 2（PD-01）：方案 C。** 這項決策源自 Product Definition 與 Phase 1 邊界，不是因 Migration 007／008 已存在。

## 5. Recommended conceptual model

Phase 2 正式接受的產品概念鏈如下：

1. 具完整有效治理 Grant path 的成員，向指定接收者建立 Invitation。
2. Invitation 只表達受控加入請求，並綁定預定接收者；連結、QR Code 與一次性代碼是同一 credential 的不同傳遞方式。
3. 接收者以自己的 Account Identity 登入，完成可信接收者綁定與必要條件檢查後，才能明確接受。
4. 完成可信帳號綁定並明確接受後，可保存新的 Membership generation 與 Relationship generation；但「已接受」不保證立即具有可用 Grant。
5. Relationship 是產品層上位概念，至少區分 Family Relationship 與 Service Relationship，並保留不同證據、期間與終止語意。
6. Grant 依附有效 Membership 與 Relationship path，限制目的、資料範圍、能力及期間。
7. 每次操作必須由單一完整有效 path 通過；兩條路徑產生不同結果時，明確選擇 acting context。
8. Membership、Relationship 或 Grant 任一必要環節失效，目前存取立即 fail closed；歷史歸屬與當時 context 仍保留。
9. 日後重新加入建立新的 Membership、Relationship 與 Grant generation，不恢復或覆寫舊權限週期。

10. Action Assignment 只能指派給當時已有適當 Membership、Relationship 與完整 Grant path 的成員，不得建立其中任何一項。

這是 **Accepted for Phase 2** 的產品概念模型，不是資料結構或交易設計。

## 6. Invitation semantics and lifecycle

### 6.1 Product meaning

- Invitation 是向特定對象提出加入特定 Care Case 關係的邀請或請求。
- Invitation 本身不建立 Membership、Relationship、Grant 或 Action Assignment。
- 只有具相應邀請能力的完整有效 Grant path 才能發出 Invitation；職稱、主要身分或專業資格本身不產生邀請能力。
- 家屬與專業邀請共用同一核心概念，但可要求不同的接收條件、Relationship 證據、服務目的及期間。
- 第一版只支援指定接收者邀請，排除群組邀請、公開邀請及可轉傳給任意帳號接受的通用代碼（PD-03）。

### 6.2 Recipient binding and preview

- Invitation 必須綁定預定接收者；候選方式可為 confirmed Email 或其他後續受治理的可信帳號綁定。
- 未登入或尚未完成可信帳號綁定時，只可知道「這是一份 WinWin 協作邀請」、邀請是否仍有效，以及登入、註冊或確認帳號的指引；不得顯示高齡者名稱、邀請者、服務目的、日期、分享範圍或 Case 內容。
- 登入後，只有帳號與預定接收者綁定一致且必要帳號條件成立，才可查看最低必要預覽。
- 最低必要預覽可包含遮罩或最低必要的高齡者顯示名稱、邀請者顯示名稱、預定關係／專業角色、目的、分享範圍上限摘要、服務期間，以及專業身分或服務關係驗證狀態。
- 預覽不得顯示健康內容、時間軸、Question、Action、完整成員名單、其他個案或隱藏資訊數量。
- Email 尚未確認、帳號不符或 credential 被轉傳時，不得揭露預覽，也不得接受。

### 6.3 Credential channels

- 專屬連結、QR Code 與一次性代碼共用同一 Invitation credential，不是三份獨立授權。
- 開啟連結、掃描 QR 或輸入代碼都不直接授權，也不等於已確認接收、已閱讀或已接受。
- Invitation 應一次性且有期限；實際 credential 格式、長度、hash、儲存及驗證方式未凍結。

### 6.4 Product outcomes

| Outcome | Product meaning | Access effect |
|---|---|---|
| 接受 | 綁定的接收者明確同意加入請求，並進入必要條件判斷 | 不保證立即可查看；可能等待驗證或服務開始 |
| 拒絕 | 綁定接收者明確不接受該次邀請 | 不建立可用 Membership／Relationship／Grant |
| 撤回 | 有權邀請者終止尚未完成的邀請 | credential 不再可接受，不影響已存在的其他關係 |
| 逾期 | 依可信時間判斷已超過期限 | 即使未有背景排程改狀態，也不得接受或預覽敏感內容 |
| 重送 | 終止舊 Invitation credential 的效力，保留舊歷史並建立新的 credential | 新舊 credential 不得同時有效；舊 credential 不得復用或重新啟用 |

Invitation 的正式狀態名稱、事件模型、RPC 與原子交易未凍結。

## 7. Membership semantics and lifecycle

### 7.1 Product fact

Membership 保存某個 Account Identity／受治理人物參照與特定 Care Case 之間的一段參與生命週期。它回答「此人是否在這段期間與此 Case 具有成員關係」，不回答「能看哪些資料或做哪些事」。

- Membership 與 Care Case 綁定，但不使 Account Identity 成為 Case 生命週期根。
- Invitation acceptance 是建立 Membership generation 的可能入口，不是唯一永遠固定的建立機制。
- 只有必要條件成立且目前有效的 Membership，才可成為完整 Grant path 的一環。
- Membership 不代表全部資料權限，也不自然帶來治理能力。
- Care Circle 由目前有效 Membership、Relationship 與 Grant 結果投影，不另存第二份成員真相。

### 7.2 Relationship establishment in progress（PD-02／PD-09）

- 完成可信帳號綁定及明確接受後，可以保存新的 Membership generation 與 Relationship generation。
- 若專業身分仍待驗證、服務開始日尚未到、必要授權尚未成立或 Relationship 尚未生效，該 generation 只能表示「關係建立程序進行中」。
- 關係建立程序進行中不得形成可使用 Grant、進入有效 Care Circle 投影、查看 Case 內容、待辦數量、成員名單或任何可推測敏感資訊。
- 使用者只能查看自己的最低必要關係狀態與下一步指引，例如等待驗證、尚未開始或目前沒有內容存取權。
- 專業身分已驗證但尚未有 Case Membership／Service Relationship：仍不得存取任何 Case。

正式狀態名稱、資料欄位及建立／啟用 transaction 未凍結。

### 7.3 Lifecycle meanings

| Concept | Product distinction |
|---|---|
| 暫停 | 關係仍待治理處理，但目前不得作為存取路徑；是否可恢復需明確規則 |
| 撤銷 | 有權治理者在期限前明確終止未來有效性；保留原因與歷史 |
| 到期 | 可信時間已超過有效期間；不依賴背景排程才失效 |
| 離開 | 成員主動結束參與；須符合治理、責任與最後治理者限制 |

重新加入必須建立新的 Membership、Relationship 與 Grant generation（PD-07），因為新的邀請、目的、服務來源、期間、範圍及治理決定都可能不同。不得重新啟用、覆寫舊週期或自然恢復舊權限；相同 Account 或 Email 也不足以恢復。

歷史 Membership 失效後仍應保留最低必要的參與期間、終止方式、當時關係、歷史作者歸屬與必要治理事件；保留歷史不代表失權者仍可查看。

## 8. Relationship／Service Relationship

### 8.1 Why separate from Membership

Membership 表示「參與這個 Case 的生命週期」，Relationship 表示「以何種家庭或服務關係參與」。兩者分離可避免：

- 把家庭血緣／照顧關係誤當資料權限。
- 把專業職稱誤當正在服務某個 Case。
- 轉職時改寫歷史 Membership。
- 同一人在同一 Case 有家庭與專業兩種關係時拼接權限。

### 8.2 Relationship taxonomy

Phase 2 正式採用 Relationship 作為產品層上位概念（PD-05），至少區分 Family Relationship 與 Service Relationship。兩者的證據、期間與終止規則不同；正式分類 vocabulary 與資料結構未凍結。

| Example | Conceptual layer | Boundary |
|---|---|---|
| 女兒 | 家庭／親屬 Relationship | 不等於主要照顧責任或資料權限 |
| 主要家庭照顧者 | Case-specific caregiving Relationship／responsibility context | 不等於法律代理或全部敏感資料權限 |
| 護理師 | Account Identity 所宣告並可能驗證的專業類型 | 不等於正在服務某個 Case |
| 日照服務人員 | 專業／服務角色及 Service Relationship context | 機構職稱本身不產生 Case Grant |
| 協作管理者 | Case-level governance capability | 不是專業職稱，也不自然帶來全部內容權限 |

### 8.3 Family relationship

- 家庭 Relationship 可持續存在，但其 Membership 或 Grant 仍可暫停、撤銷或到期。
- 家庭成員不因親屬關係自然取得 Case 存取。
- 家庭關係、法律代理、實際照顧責任及協作治理能力是不同事實。

### 8.4 Professional Service Relationship

- 專業資格驗證與 Service Relationship 是不同事實。
- 個人具備護理師資格，不代表正在服務某個 Care Case。
- Service Relationship 必須具有明確服務目的與有效期間；服務來源及證明責任仍需專家確認。
- 離職、轉職、調離或不再負責 Case 時，應終止對應舊 Service Relationship 及依附其上的未來 Grant 使用；不終止 Account Identity 或其他獨立有效關係。
- 前往新機構或新職務時建立新的 Service Relationship generation，不改寫舊服務來源與期間。
- 相同 Email、相同 Account 或重新驗證專業資格，都不得自動恢復舊專業關係。
- 第一版採個別專業人員模式（PD-10）。組織管理員、組織成員目錄、批次加入／指派、機構級個案清單、多層法人治理、正式機構身分驗證與組織級報表 **Deferred**。
- Prototype 若顯示服務單位或機構資訊，必須標示為未驗證聲明，不得宣稱平台已證實任職關係。

### 8.5 Evidence responsibility

- 專業資格可由合適的資格驗證來源證明，但來源、責任與保存程度需法律／場域專家確認。
- 機構任職或服務來源應由機構或受治理證據證明，不能只靠使用者自述便形成正式事實。
- 個案 Service Relationship 需由具適當治理能力者及接收者共同形成，不因資格或機構任職自然存在。

## 9. Grant／Permission model

Grant 是產品層級的個案授權，不是身分、Membership 或 Relationship。

每項 Grant 至少表達：

- 照顧或協作目的。
- 可存取或分享的資料範圍上限。
- 可執行的能力。
- 有效期間。
- 所依附的有效 Membership 與 Relationship context。
- 授予與終止的可追溯治理事實。

產品原則：

- 採 default deny 與最小權限。
- Grant 必須依附一條有效 Membership＋Relationship path。
- 專業資格通過不自然產生任何 Case Grant。
- 管理能力不自然帶來敏感內容查看權。
- 具治理能力者可在必要範圍管理 Invitation、Membership、Relationship 狀態、Grant 上限與期間，以及移交、撤銷與到期處理；但只能取得完成治理操作所需的最低治理資訊（PD-08）。
- 管理成員不得自然取得完整照顧內容、專業限定內容或家庭限定內容。
- Grant scope 是分享範圍上限；個別內容可以更窄，不能更寬。
- Membership、Relationship、Grant 或有效期間任一必要條件失效，該 path 立即不可使用。
- 歷史作者與當時 acting context 仍須保留，但不授予歷史存取。

Capability 名稱、enum、資料欄位、RLS policy、helper 與演算法不在本階段決定。

## 10. Complete grant path

單次授權操作至少需由下列概念在同一條路徑中共同成立：

```text
Current Account Identity
  → selected acting identity／role
  → valid Care Case Membership
  → valid Relationship／Service Relationship
  → valid Grant for purpose, capability, scope and time
  → active／permitted Care Case context
  → individual content sharing boundary
  → authorized operation
```

此圖是判斷語意，不是演算法或資料 join 規格。

- 不得取 FAMILY path 的 Membership、NURSE path 的 capability 與 CASE_ADMIN path 的 scope 拼成一條權限。
- 同一人的兩條 path 必須各自完整成立。
- 到達服務截止時間後，產品語意上立即失去未來存取權；database clock、query、排程或其他技術方式未凍結。
- Action Assignment 只能交給已有適當完整 path 的成員；Assignment 不建立 Membership、Relationship 或 Grant。

## 11. Multiple identities and acting context

同一 Account 可在同一 Care Case 同時具有家庭與專業 Relationship，但兩條路徑保持獨立（PD-06）。

- 若只有一條有效且適用的 path，系統可直接使用該 context。
- 若兩條以上完整有效 path 會產生不同權限結果，使用者需選擇「這次以哪個身分／關係處理」。
- 每次只能使用一條 path；切換後重新計算可見內容與能力，不保留前一 context 的限定內容。
- 未驗證、尚未開始、到期、撤銷或暫停的 path 不可選。
- 未來可追溯紀錄概念上至少保存：acting identity／role、Relationship、purpose、sharing scope、validity，以及可追溯的操作時間或等效授權脈絡。
- Acting context 是操作脈絡，不是每日登入任意換身分，也不改變主要 Account Identity。

具體 context 儲存方式、選擇頻率與 UI 未凍結。

## 12. Conceptual relationship diagram（非 ERD）

```text
指定接收者
  ← Invitation（受控加入請求；credential 可由連結／QR／代碼傳遞）
  ↓ 明確接受 + 必要條件檢查
Membership generation（Case 參與生命週期）
  ↓
Relationship／Service Relationship generation（家庭或服務關係）
  ↓
Grant（目的 × 範圍上限 × 能力 × 期間）
  ↓
一條完整有效 grant path
  ↓
本次 acting context 下的 Case 操作

Care Circle
  ← 目前有效 Membership、Relationship 與 Grant 結果的權限化投影
  ✕ 不是獨立 access truth
```

箭頭不表示資料表、FK、Aggregate ownership、Cascade 或 transaction。

## 13. Fifteen walkthroughs

### 13.1 家屬受邀加入 Care Case

- **Invitation：** 綁定該家屬帳號，預覽通過後明確接受。
- **Membership：** 建立新的 generation；必要條件成立時目前有效。
- **Relationship：** 建立家庭 Relationship；不等於法律代理。
- **Grant：** 只依目的、範圍、能力及期間授予最低必要權限。
- **Can：** 在完整 path 允許的範圍內參與。
- **Reject：** 查看全部敏感內容、自然取得治理能力或特定 Action 責任。
- **Preserve：** 邀請、接受、關係、授權與 acting context 歷程。
- **Open／expert：** 家庭關係證明與授權者資格需後續治理／場域確認。

### 13.2 家屬拒絕邀請

- **Invitation：** 拒絕並終止該次接受機會。
- **Membership：** 不建立可用 Membership。
- **Relationship：** 不建立有效家庭 Relationship。
- **Grant：** 不建立可用 Grant。
- **Can：** 只能看到最低必要拒絕結果，不得進入 Case。
- **Reject：** 因曾收到邀請而保留預覽或 Case 存取。
- **Preserve：** 最低必要邀請與拒絕事件。
- **Open／expert：** 拒絕紀錄保存期間 Deferred。

### 13.3 Invitation 過期後重送

- **Invitation：** 舊邀請依可信時間逾期；重送終止舊 credential、保留歷史並建立新 credential，新舊不得同時有效。
- **Membership／Relationship／Grant：** 逾期本身不建立任何可用關係或權限。
- **Can：** 接收者可透過新邀請重新進行綁定與接受。
- **Reject：** 重新啟用舊 credential、背景 job 未更新便允許接受。
- **Preserve：** 舊邀請逾期與新邀請來源關係。
- **Open／expert：** 正式事件與 credential 實作 Deferred。

### 13.4 已確認帳號接受專業邀請，但專業身分尚未驗證

- **Invitation：** 接受事實可保留，但尚未完成專業啟用條件。
- **Membership：** 建立新的 generation，但只表示關係建立程序進行中，不得作為有效 access path。
- **Service Relationship：** 建立新的 pending generation，不進入 Care Circle 有效投影。
- **Grant：** 不可使用專業 Grant。
- **Can：** 只查看自己的最低必要等待驗證狀態與下一步指引，不得查看 Case 內容、待辦數量、成員名單或執行專業操作。
- **Reject：** 把 `PENDING_VERIFICATION` 當 Invitation 狀態，或因接受便授權。
- **Preserve：** 接受、身分驗證與待啟用事實各自歷程。
- **Open／expert：** 專業驗證來源需專家確認。

### 13.5 專業身分已驗證，但服務開始日尚未到

- **Invitation：** 已接受。
- **Membership：** 新 generation 存在但只表示關係建立程序進行中，目前不可用於內容存取。
- **Service Relationship：** 已約定但尚未生效。
- **Grant：** 可預先治理準備，但開始日前不可使用。
- **Can：** 只看自己的最低必要「關係尚未開始」狀態與指引，不得看 Case 內容、待辦、成員或隱含數量。
- **Reject：** 專業驗證或接受邀請被視為立即可查看。
- **Preserve：** 約定期間、授權決定與開始時間。
- **Open／expert：** 預先建立 Grant 的正式語意 Deferred。

### 13.6 服務期間開始後取得最低必要權限

- **Invitation：** 已完成，不能重播。
- **Membership／Service Relationship：** 目前有效。
- **Grant：** 在目的、能力、範圍及期間內可用。
- **Can：** 只執行該完整 path 允許的操作。
- **Reject：** 查看超過 Grant scope 或個別內容分享邊界的資訊。
- **Preserve：** 啟用條件及每次 acting context。
- **Open／expert：** 能力詞彙與技術判斷 Deferred。

### 13.7 專業人員服務到期

- **Invitation：** 歷史完成，不重新生效。
- **Membership：** 該服務 generation 不再可用；是否另有家庭 generation 需獨立判斷。
- **Service Relationship：** 依可信時間到期。
- **Grant：** 依附該服務 path 的目前使用立即失效。
- **Can：** 失權者不得再進入 Case；其他有效 path 不受影響。
- **Reject：** 以歷史作者身分繼續存取，或等待背景 job 才失權。
- **Preserve：** 原作者、服務來源、期間、責任及當時 context。
- **Open／expert：** 未完成責任處理屬後續 Action phase。

### 13.8 專業人員提前被撤銷

- **Invitation：** 不受改寫。
- **Membership／Service Relationship：** 對應未來效力被治理終止。
- **Grant：** 立即不可使用。
- **Can：** 其他獨立有效 path 仍需單獨判斷。
- **Reject：** 刪除歷史、影響其他成員或洩漏撤銷原因給無權者。
- **Preserve：** 撤銷者、時間、最低必要原因及歷史 context。
- **Open／expert：** 申訴與通知規則需治理／專家確認。

### 13.9 同一人在同一 Case 同時是家屬與護理師

- **Invitation／Membership：** 可有不同來源或 generation；不得合併成單一路徑捷徑。
- **Relationships：** FAMILY 與專業 Service Relationship 分開。
- **Grants：** 各自完整、各自到期與撤銷。
- **Can：** 只有一條完整有效 path 時直接使用；兩條以上完整有效 path 會產生不同結果時才選 acting context。
- **Reject：** 拼接家庭 scope、專業 capability 與治理權。
- **Preserve：** 每次操作使用的 identity、relationship、purpose、scope 與 validity。
- **Open／expert：** acting-context UI Deferred。

### 13.10 同一人離開原機構並到新機構任職

- **Invitation：** 新機構／新服務不得沿用舊邀請。
- **Membership：** 舊服務 generation 終止；其他獨立家庭 Membership 不受影響。
- **Service Relationship：** 舊機構關係保留歷史並終止，新機構建立新 generation。
- **Grant：** 舊 Grant 不可恢復；新關係需重新治理授予。
- **Can：** 只依新完整 path 操作。
- **Reject：** 因 Account、Email 或專業資格相同而恢復舊 Case 權限。
- **Preserve：** 兩段服務來源、期間與歷史責任。
- **Open／expert：** 機構證明責任需場域確認。

### 13.11 專業人員日後重新加入同一 Care Case

- **Invitation：** 建立新邀請與新 credential。
- **Membership／Service Relationship：** 必須建立新 generation，不改回或覆寫舊 generation。
- **Grant：** 必須建立新 generation，依新目的、範圍、能力與期間重新授予。
- **Can：** 新 path 生效後參與。
- **Reject：** 恢復舊 Grant、沿用舊服務期間或隱性取回舊 scope。
- **Preserve：** 舊與新 generation 的分界及各自歷史。
- **Open／expert：** generation 技術識別方式 Deferred。

### 13.12 錯誤帳號或被轉傳連結嘗試接受邀請

- **Invitation：** credential 可能有效，但接收者綁定不符，因此拒絕。
- **Membership／Relationship／Grant：** 均不得建立或啟用。
- **Can：** 只看一般化錯誤，不得知道高齡者、邀請者、角色或 Case 是否存在。
- **Reject：** 只憑持有連結、QR 或代碼接受。
- **Preserve：** 最低必要安全事件，不保存多餘資料。
- **Open／expert：** 防濫用保存與通知策略 Deferred。

### 13.13 具管理能力的成員嘗試查看未授權敏感內容

- **Invitation：** 不適用；既有邀請歷史不因本次查看嘗試而改寫。
- **Membership／Relationship：** 可有效。
- **Grant：** 治理 capability 有效，但沒有該敏感內容 scope。
- **Can：** 執行被授予的治理操作，並只查看完成該治理操作所需的最低治理資訊。
- **Reject：** 以管理能力推導全部內容查看權。
- **Preserve：** 被拒操作的最低必要稽核事實。
- **Open／expert：** 敏感內容分類留待內容模型。

### 13.14 Relationship 有效但 Grant 已撤銷

- **Invitation：** 歷史邀請結果不受改寫，也不能用來恢復 Grant。
- **Membership／Relationship：** 仍可有效，Care Circle 顯示須依查看者權限與有效授權結果決定。
- **Grant：** 已撤銷，不可使用。
- **Can：** 只查看自己的最低必要關係狀態與下一步指引；若另有獨立完整有效 path，才可透過該 path 執行操作。
- **Reject：** 由 Relationship 推定 Permission，或拼接另一 path。
- **Preserve：** 關係持續與 Grant 撤銷各自歷史。
- **Open／expert：** 關係狀態的正式用語與顯示細節留待後續 UI 設計。

### 13.15 Grant 尚在期間內，但 Membership 已失效

- **Invitation：** 歷史邀請結果不受改寫，也不能取代已失效 Membership。
- **Membership：** 已失效。
- **Relationship：** 即使形式上未到期，也不能構成完整 path。
- **Grant：** 日期未到期仍不可使用。
- **Can：** 無法透過該 path 存取。
- **Reject：** 只檢查 Grant 日期而忽略 Membership。
- **Preserve：** Membership 終止與 Grant 原始授予歷史。
- **Open／expert：** 是否同步終止依附 Grant 的技術策略 Deferred。

## 14. Domain invariants

| Candidate invariant | Classification | Rationale / remaining boundary |
|---|---|---|
| Invitation is not Membership | **Accepted for Phase 2** | Product Definition 已凍結概念分離 |
| Membership is not Permission | **Accepted for Phase 2** | 成員關係不代表全部權限 |
| Relationship is not Permission | **Accepted for Phase 2** | 親屬、照顧或服務事實不能直接授權 |
| Professional identity verification is not a Case relationship | **Accepted for Phase 2** | 驗證資格不代表服務某個 Case |
| Professional qualification does not create a Case Grant | **Accepted for Phase 2** | 防止以職稱自然取得權限 |
| Action Assignment cannot create Membership, Relationship or Grant | **Accepted for Phase 2** | Assignment 只能使用當時已存在的完整有效 path |
| Every authorized operation must pass through one complete valid grant path | **Accepted for Phase 2** | 防止部分條件拼接 |
| Grant paths from different roles or relationships must not be combined | **Accepted for Phase 2** | 多重身分保持單一路徑 |
| Expired or revoked future access must not erase historical attribution | **Accepted for Phase 2** | 目前存取與歷史追溯分離 |
| Rejoining creates new Membership, Relationship and Grant generations | **Accepted for Phase 2** | 不得恢復或覆寫舊目的、期間、範圍與撤銷歷史 |
| Current access must not be inferred from past participation | **Accepted for Phase 2** | Phase 1 基線 |
| Care Circle projection must not become an independent source of access truth | **Accepted for Phase 2** | Phase 1 已固定權限化投影 |
| Case governance capability must not imply access to all sensitive content | **Accepted for Phase 2** | 治理與內容 scope 分離 |
| Invitation preview must not disclose case content before trusted recipient binding | **Accepted for Phase 2** | 綁定前只顯示邀請性質、有效性與帳號指引 |
| Service expiry must take effect at the product boundary when the deadline is reached | **Accepted for Phase 2** | 技術時間判斷方式未凍結 |
| A forwarded credential must not allow the wrong account to accept an invitation | **Accepted for Phase 2** | 第一版只支援指定接收者 |
| A professional Service Relationship must have purpose and effective period | **Accepted for Phase 2** | 專業資格本身不等於 Case 關係 |
| Pending Membership／Relationship must not enter the effective Care Circle or reveal case-derived information | **Accepted for Phase 2** | 關係建立程序進行中不等於 access |
| Grant sharing scope is a ceiling and individual content may be narrower | **Accepted for Phase 2** | 個別內容不得擴張 Grant 上限 |
| The exact trusted recipient-binding evidence | **Requires legal／field expert confirmation** | Email 以外方式與證據強度未決定 |
| Formal state codes, tables, algorithms and transactions | **Deferred** | 超出概念設計範圍 |

## 15. Privacy and misuse risks

| Risk | Consequence | Phase 2 conceptual control |
|---|---|---|
| 轉傳 credential 被錯誤帳號使用 | 洩漏 Case 或建立錯誤關係 | 綁定接收者；未可信綁定前不顯示預覽 |
| 公開／群組邀請 | 無法知道誰加入及依據 | 第一版排除公開、群組與通用可轉傳代碼 |
| 職稱等同權限 | 專業人員看到非服務 Case | Verification、Service Relationship、Grant 分離 |
| Membership 等同全部存取 | 家屬或專業成員權限過寬 | 每次操作仍需完整 Grant path |
| 多重身分拼接 | 取得任何單一路徑都不允許的能力 | Acting context 單一路徑、切換後重算 |
| 服務到期依賴排程 | 排程延遲造成繼續存取 | 授權判斷使用可信時間衍生有效性 |
| 重新加入恢復舊權限 | 舊目的、scope 或機構關係復活 | 建立新的 authorization generation |
| 管理能力帶來內容全覽 | 治理者看到非必要敏感資訊 | Governance capability 與 content scope 分離 |
| Care Circle 成為第二真相 | 已失權者仍被視為有效成員 | Circle 只投影有效 Membership／Relationship／Grant 結果 |
| 歷史刪除以完成撤銷 | 失去來源及責任追溯 | 終止未來 access，保留最低必要歷史 attribution |

## 16. Existing asset compatibility review

本節只是概念對照，不證明既有資產與推薦模型相容，也不授權修改。

### 16.1 Current WinWin Prototype

| Observation | Compatibility finding | Treatment |
|---|---|---|
| Identity state 已區分主要身分與驗證狀態 | 可表達「資格驗證不等於 Case access」的部分語意 | 候選重用；仍需與 Phase 1 Account Identity／Person 邊界對齊 |
| Invitation UI 有連結、QR、代碼、預覽、接受／拒絕／逾期／重送 | 可示範同一 credential 與最低揭露流程 | In-memory 模擬，不證明正式 recipient binding 或 transaction |
| Prototype Membership 同時承擔部分 Relationship 與服務期間 | 語意仍混合 | 需在未來模型中拆分或明確投影，不能直接升格 |
| Circle member mock array 與 access selector 並存 | 可能形成 stored member list 與有效 path 雙重真相 | 必須改由有效結果投影；本階段不改前端 |
| Access selector 已嘗試檢查 Membership、Grant、期間與 Case access | 與完整 path 方向部分相容 | 候選概念，不代表正式授權演算法 |
| Demo role／acting context 可切換可見結果 | 可示範單一路徑 | 必須避免全域任意換身分或保留前一路徑內容 |
| 失權與 reassignment prototype 有歷史關聯 | 支援歷史與目前權限分離 | Action／Assignment 完整模型留待下一階段 |

### 16.2 Migration 007

| Observation | Compatibility finding | Treatment |
|---|---|---|
| Invitation acceptance 可原子建立 Actor、Membership、Grant | 可防孤立狀態，但可能把 acceptance 與立即啟用綁得過緊 | 必須重新審查等待驗證／未到開始日情境 |
| Membership 保存 relationship kind、期間及組織聲明 | 混合 Membership 與 Relationship／Service Relationship 語意 | 不能反向決定 Phase 2；未來需調整候選模型 |
| Role Grant 與 Membership 分離 | 與推薦概念部分相容 | 候選重用，不表示 purpose／scope／capability 模型已接受 |
| Email-bound invitation 與 confirmed Email 檢查 | 與 trusted recipient binding 方向部分相容 | 只是一種候選實作，不凍結產品證據方式 |
| 到期、撤銷及最後治理者保護 | 與 fail-closed 方向相容 | 仍需依新 Domain 重新驗證 |
| 缺少獨立 Service Relationship generation | 無法完整表達轉職、新機構及重新加入歷史 | 概念缺口 |

### 16.3 Migration 008

| Observation | Compatibility finding | Treatment |
|---|---|---|
| Identity verification 與 Membership identity alignment | 可表達驗證與 Case membership 為不同事實 | 候選重用；不代表驗證來源與治理已定案 |
| Grant templates 與 capabilities | 可表達一致授權詞彙 | 不得反向凍結 capability enum、模板或 scope |
| Membership 指向 Identity | 有助 acting identity，但仍未單獨表達 Relationship generation | 必須重新審查 |
| 歷史 verification events append-only | 與可追溯性相容 | 保存內容與法律效力仍需專家確認 |

### 16.4 Expressiveness gaps

- 「已接受邀請但專業身分尚未驗證」：Prototype 可模擬；Migration 007 的原子 acceptance 路徑可能無法表達安全等待階段。
- 「專業身分已驗證但尚無 Case Relationship」：Migration 008 的 identity layer 可部分表達，但不得因此形成 Case access。
- 「多重身分且禁止跨路徑拼接」：Prototype selectors 與 Migration 008 identity alignment 有候選基礎，但正式完整 path 尚未證明。
- 「歷史 generation 與 acting context」：既有 access events／activity 有部分歷史資訊；獨立 Relationship generation 與完整 context 仍有缺口。
- 「Membership／Relationship 存在但無可用 Grant」：Prototype 有部分等待／失權 UI；既有 schema 是否能完整且不洩漏地表達，尚未證明。
- 「治理資訊與敏感內容 scope 分離」：既有治理能力與 policy 必須依 Phase 2 決策重新審查，不得假設已符合。

以上缺口只用於未來資產評估；Phase 2 產品決策不表示既有 Prototype 或 Migration 已相容，也不授權修改或 Remote Apply。

### 16.5 備份心 boundary

Migration 001–006、Coverage Engine、Scenario、Backup Assignment、handoff 與 active v1 資產屬備份心。它們不因位於同一 Repository 而成為 Invitation、Membership、Relationship 或 Grant 的 WinWin 模型來源。

## 17. Product decision dispositions

原十項產品問題已全部完成 disposition：

| ID | Disposition | Accepted decision / remaining boundary |
|---|---|---|
| P2-PD01 | **Accepted** | Invitation → Membership → Relationship／Service Relationship → Grant 四者分離；Assignment 不得建立其中任何一項 |
| P2-PD02 | **Accepted with constraints** | 接受後可保存新 Membership／Relationship generation；任何必要條件未完成時只表示關係建立程序進行中，不得形成可用 Grant 或有效 Circle 投影 |
| P2-PD03 | **Accepted** | 重送終止舊 credential、保留歷史並建立新 credential；禁止新舊同時有效或復用舊 credential |
| P2-PD04 | **Accepted with constraints** | 第一版只支援指定接收者；可信綁定前只顯示邀請性質、有效性及帳號指引，公開／群組／通用邀請 Deferred |
| P2-PD05 | **Accepted with constraints** | Relationship 為上位概念；至少區分 Family 與 Service；Service 必須有目的及期間，正式 vocabulary Deferred |
| P2-PD06 | **Accepted** | 每次操作只用一條完整 path；只有多條完整有效 path 產生不同結果時才選 acting context |
| P2-PD07 | **Accepted** | 重新加入建立新的 Membership、Relationship、Grant generations，不恢復或覆寫舊週期 |
| P2-PD08 | **Accepted** | 治理 capability 與敏感內容 scope 分離；治理者只取得最低必要治理資訊 |
| P2-PD09 | **Accepted with constraints** | Membership／Relationship 可存在但無可用 Grant；只顯示自己的最低必要狀態與指引，不顯示任何 Case-derived 敏感資訊 |
| P2-PD10 | **Accepted for first version／Organization model Deferred** | 第一版採個別專業人員模式；所有組織級治理、目錄、批次、清單、驗證及報表延後 |

### Remaining open product details

- 正式 Relationship 分類 vocabulary。
- 等待驗證、尚未開始、暫停、到期及撤銷的使用者文案與 UI 層級。
- Acting context 的選擇頻率及介面呈現。
- 個別專業人員模式下，服務來源聲明的最低必要顯示方式。

以上細節不得推翻已接受的 fail-closed、單一路徑及最低揭露原則。

## 18. Legal／field expert questions

- 家庭 Relationship、主要家庭照顧責任、法律代理與授權聲明各需何種證據，由誰確認。
- 專業資格的可信來源、驗證頻率、失效與申訴程序。
- 機構任職、服務來源及調離／離職由誰證明，WinWin 可保存哪些最低必要證據。
- 專業驗證等待期間所需證據、程序及最低關係資訊顯示是否符合法律與場域要求。
- 新治理者或協作管理者可發出哪些邀請，是否需高齡者本人或適當授權者另行確認。
- 錯誤邀請、撤銷、爭議與安全事件的保存期限及通知責任。
- 家庭關係持續但資料 Grant 被撤銷時，Care Circle 中可顯示哪些最低資訊。
- 服務關係到期後，歷史 attribution 對哪些目前角色可見。

## 19. Decision log

| ID | Decision | Status | Reason |
|---|---|---|---|
| P2-D01 | Invitation、Membership、Relationship／Service Relationship、Grant 分離 | **Accepted for Phase 2** | 最符合 Product Definition、最小權限及歷史追溯 |
| P2-D02 | Invitation 不建立 Case relationship 或 Permission | **Accepted baseline** | Product Definition 已凍結 |
| P2-D03 | 邀請能力來自完整有效 Grant path，不來自職稱 | **Accepted for Phase 2** | 防止專業類型或管理名稱自然授權 |
| P2-D04 | Invitation 綁定指定接收者；公開／群組邀請排除第一版 | **Accepted with constraints** | 防止轉傳與最低揭露風險；綁定證據需專家確認 |
| P2-D05 | 重送終止舊邀請並建立新 credential | **Accepted for Phase 2** | 防止舊 credential 復活與重播 |
| P2-D06 | Pending verification／future start 只表示關係建立程序，不形成可用 Grant | **Accepted with constraints** | 接受與存取分離；正式狀態與 transaction 未凍結 |
| P2-D07 | Membership 與 Relationship 分離 | **Accepted for Phase 2** | 支援家庭／專業雙關係、轉職與歷史 generation |
| P2-D08 | 專業資格驗證不建立 Service Relationship 或 Grant | **Accepted baseline** | 身分、關係與權限分離 |
| P2-D09 | 每次操作使用一條完整有效 path，禁止拼接 | **Accepted baseline** | Product Definition 已凍結 |
| P2-D10 | 多條完整 path 結果不同時才選擇 acting context | **Accepted for Phase 2** | 避免多重身分能力合併及不必要反覆選擇 |
| P2-D11 | 重新加入建立新的 Membership、Relationship、Grant generations | **Accepted for Phase 2** | 不恢復或覆寫舊目的、範圍、期間與歷史 |
| P2-D12 | 管理 capability 不等於全部敏感內容 scope | **Accepted for Phase 2** | 治理與內容最小權限分離 |
| P2-D13 | 第一版採個別專業人員模式 | **Accepted for first version／Organization model Deferred** | 控制學生 MVP 範圍；機構聲明不得冒充已驗證事實 |
| P2-D14 | 正式狀態、資料表、RPC、transaction、RLS 與演算法 | **Deferred** | 必須等待產品決策與後續 Logical Model Gate |

## 20. Gate decision

**PASS — PHASE 2 PRODUCT DECISION REVIEW COMPLETE**

本文件已完成：

- 四種替代模型比較及推薦。
- Invitation、Membership、Relationship／Service Relationship、Grant 邊界。
- 完整 Grant path 與多重身分 acting context 原則。
- 十五項 walkthrough。
- Domain invariants、隱私風險及既有資產概念相容性審查。
- 十項產品問題的 Accepted／Accepted with constraints／Deferred disposition。

- **Phase 2 Product Decision Review：PASS。**
- **Phase 2 文件 checkpoint：可以建立。**
- **下一個 Core Object Model 階段：可規劃，但必須另行授權。**
- **法律／場域專家確認：仍為必要的平行 Gate。**

下列工作仍為 **BLOCKED**：

- ERD、Database Schema、Migration、SQL、RLS。
- 正式狀態碼、欄位、FK、constraint、RPC、transaction、token 或演算法。
- API 與前端實作。
- Migration 007／008 修改或 Remote Apply。
- Supabase 與 Production 操作。

## 21. Explicit next step

下一步應先進行 Phase 2 文件的唯讀 Document Review 與獨立 checkpoint。完成後，才可另行授權下一個 Core Object Model 階段；Question、Action、Assignment 與 Outcome 的正式範圍仍需先定義 Gate。

即使 Phase 2 產品決策已完成，仍不得：

- 畫 ERD 或設計資料表。
- 修改 Migration 001–008。
- 撰寫 SQL、RLS、API 或前端功能。
- 讓既有 Prototype 或 Migration 反向決定 Domain。
- 擴張至 Question、Action、Assignment 或 Outcome 的完整模型。

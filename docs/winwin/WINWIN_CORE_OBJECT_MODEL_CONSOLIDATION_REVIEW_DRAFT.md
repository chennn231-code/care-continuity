# WinWin Core Object Model Consolidation Review

> **狀態：DRAFT — Consolidated Conceptual Review Only**
>
> **整合來源：Product Definition & Boundary v1.0、Core Object Model Phase 1、Phase 2、Phase 3**
>
> 本文件不是 ERD，不定義資料表、欄位、PK、FK、constraint、Aggregate、inheritance、Cascade、API、RPC、transaction、RLS、Migration 或前端實作。

## 1. Purpose and authority

本文件將既有產品定義與 Phase 1–3 已接受決策串成單一概念模型，檢查跨階段是否存在重複真相、生命週期混淆、責任倒置或授權擴張，並以四個 Golden Scenarios 驗證資訊、責任、權限與歷史是否能連續。

權威順序如下：

1. [`WINWIN_PRODUCT_DEFINITION_BOUNDARY_V1.0.md`](WINWIN_PRODUCT_DEFINITION_BOUNDARY_V1.0.md)
2. [`WINWIN_CORE_OBJECT_MODEL_PHASE_1_DESIGN_REVIEW_DRAFT.md`](WINWIN_CORE_OBJECT_MODEL_PHASE_1_DESIGN_REVIEW_DRAFT.md)
3. [`WINWIN_CORE_OBJECT_MODEL_PHASE_2_DESIGN_REVIEW_DRAFT.md`](WINWIN_CORE_OBJECT_MODEL_PHASE_2_DESIGN_REVIEW_DRAFT.md)
4. [`WINWIN_CORE_OBJECT_MODEL_PHASE_3_DESIGN_REVIEW_DRAFT.md`](WINWIN_CORE_OBJECT_MODEL_PHASE_3_DESIGN_REVIEW_DRAFT.md)

Frontend Prototype、Migration 007／008 與舊技術資產只作相容性參考，不得反向決定本概念模型。

## 2. Consolidated Accepted Model

### 2.1 Product reading chain

```text
Person concept／limited Person reference
├─ Account Identity
└─ Care Recipient Role
       ↓
Care Case
       ↓
Care Circle（權限化投影）
       ↓
Invitation
       ↓
Membership generation
       ↓
Relationship／Service Relationship generation
       ↓
Grant generation
       ↓
Complete Grant Path／Acting Context
       ↓
Care Update／Observation
       ↓
Question
       ↓
Action
       ↓
Responsibility Cycle
       ↓
Outcome
```

這是產品概念導覽，不代表資料建立順序、因果鏈、資料表、FK、Aggregate、inheritance 或 Cascade。尤其：

- Care Circle 不產生 Invitation、Membership、Relationship 或 Grant。
- Care Circle 是當下有效 Membership、Relationship／Service Relationship 與 Grant 結果的權限化投影。
- Invitation 由具有適當治理能力的完整 Grant path 建立，不是由「位於照顧圈」自然產生。
- Observation 不必先產生 Question；Question 不必先產生 Action；Action 亦可不連結 Question。
- Outcome 不由 Action completion 自動產生或決定。

### 2.2 Non-causal conceptual relationship

```text
Limited Person reference                 Account Identity
          │                                      │
          └──── optional governed linkage ───────┘
                         │
                    Care Case
                         │ exactly one
                 Care Recipient Role
                         │
          ┌──────── governance boundary ────────┐
          │                                      │
  Invitation request                      existing member path
          │                                      │
          └─> Membership generation <────────────┘
                       │
             Relationship generation
                       │
                 Grant generation
                       │
       one complete valid Grant Path + Acting Context
                       │
       ┌───────────────┴────────────────┐
       │                                │
 current authorized operations    Care Circle projection
       │
 published source version / Observation
       │ optional pinned link
     Question ── 0..n ──> Action ── 0..n ──> Responsibility Cycle
                               │
                         evidence for, not equal to
                               │
                    Outcome product semantics
```

此圖亦不是 ERD。它只顯示責任邊界、授權前提及可選協作關係。

## 3. Consolidated vocabulary

| Concept | Single responsibility | Lifecycle boundary | Does not mean | History that must remain |
|---|---|---|---|---|
| Person concept／limited Person reference | 在必要範圍內指涉現實中的人 | 不作全平台已驗證真人主檔；跨 Case resolution Deferred | Account、Care Case 或可自動去重的人口主檔 | 受治理連結及爭議歷史（若未來建立） |
| Account Identity | 可登入、可追溯的帳號身分 | 可建立、驗證、停用或刪除；不控制 Case 存續 | Person 本人已法律驗證、Care Recipient 或 Case root | 歷史行為者 attribution；帳號失效不抹除作者 |
| Care Recipient Role | 指定某 Care Case 圍繞哪一位被照顧者 | 每個 Case 恰好一位；不主張真人跨 Case 唯一 | 可登入帳號、全平台 Older Adult master record | Case 中被照顧者角色的治理歷史 |
| Care Case | 以一位 Care Recipient Role 為中心的協作及治理空間 | 獨立於單一建立者或帳號；可有 DRAFT、有效、治理恢復等產品語意，但正式狀態 Deferred | Account、Person、家庭群組或單一內容容器 | Case、作者、治理及協作歷史 |
| Care Circle | 目前有效成員、關係與授權結果的產品／UI 投影 | 隨有效 Membership、Relationship、Grant 改變；不另有可獨立修改 truth | 群組權限、Membership、Grant、共同聊天室或全部資料可見性 | 不另存第二份成員真相；歷史由來源物件保留 |
| Invitation | 向指定可信接收者提出加入特定 Case 關係的請求 | 邀請、接受、拒絕、撤回、逾期、重送語意；正式狀態機 Deferred | Membership、Relationship、Grant 或內容權限 | credential generation、接收結果、失效及重送歷史 |
| Membership generation | 保存某身分參與特定 Case 的一段成員生命週期 | 接受後可建立；pending 不等於有效 access；重新加入建立新 generation | Relationship、Permission、Care Circle member truth 或全部內容權限 | 每段開始、終止、撤銷及世代關係 |
| Relationship generation | 說明成員為何與 Case 有關 | Family 或 Service Relationship 各自開始、有效、到期、撤銷；重新加入不復活舊 generation | 法律代理、專業資格驗證或 Permission | 關係種類、目的、期間、結束原因及舊 generation |
| Grant generation | 限定目的、能力、資料範圍上限及有效期間 | 授予、開始、到期、撤銷；重新加入建立新 generation | Identity、Membership、Relationship 或全部內容存取 | 授予上限、期間、撤銷及世代歷史 |
| Complete Grant Path | 單次操作的完整授權依據 | 每次操作重新判斷 identity、Membership、Relationship、purpose、capability、scope、有效期間等條件 | 可跨多條路徑拼接的角色集合 | 操作時採用的完整授權脈絡 |
| Acting Context | 多條完整有效 path 結果不同時，明確選定本次使用的一條 | 僅於歧義時選擇；切換後重新計算可見性 | 登入時任意換角色或合併多重身分能力 | 本次 acting role、relationship、purpose、scope 及有效脈絡 |
| Care Update／source envelope | 保存共同來源與可追溯外框 | 草稿可編輯；發布後採追加式版本語意 | 單一巨大物件、資料表、Aggregate 或所有內容共用狀態機 | 作者、acting context、雙時間、來源、scope、版本 lineage |
| Observation | 描述當時看見、聽見、量得或由當事人主述的最低必要事實 | 可發布、補充、更正、撤回或取代；正式技術表示 Deferred | 診斷、確定病因或未標明來源的專業結論 | 特定發布版本、作者、來源、時間與更正關係 |
| Question | 保存需回答、釐清或確認結果的獨立協作問題 | 可連結 0..n Actions；回答、結果與 Action 各自獨立 | Action、Assignment、已有人負責或已解決 | 作者、scope、pinned sources、回答／結果歷史 |
| Action | 保存需要完成的具體工作 | 可無 Assignment；最多一個主要 Question；可獨立存在 | Question、目前 assignee 或問題解決結果 | 工作目的、來源 links、狀態及所有 responsibility cycles |
| Responsibility Cycle | 保存一次 Action 指派與承接責任的週期 | 每次重新指派建立新 cycle；同時僅一個目前有效 cycle 是 Domain invariant | Membership、Relationship、Grant 或 Action 本身 | 指派者、被指派者、接受／拒絕、開始、完成／終止及原因 |
| Completion | 表示某 Action 在適當責任週期內完成了該項工作 | 只結束該工作語意；正式狀態機 Deferred | Question resolved、來源正確或 Outcome 已確認 | 完成者、acting context、時間、依據及 cycle |
| Outcome | 對 Question、原問題或後續安排的受治理結果語意 | 可為已解決、持續追蹤、新 Action、建議轉介等；最終物件形式 Deferred | Action completion、醫療診斷、已完成正式轉介 | 確認者、acting context、時間、可見來源及後續判斷歷史 |

## 4. Boundary distinctions and duplicate-truth review

### 4.1 Person／Account Identity／Care Recipient Role

- Person reference 只在必要範圍指涉人，不是平台人口主檔。
- Account Identity 是登入及追溯工具，不是 Person 的法律證明，也不是 Case root。
- Care Recipient Role 是特定 Case 內唯一被照顧者角色；高齡者可以沒有 Account Identity。
- 第一版禁止自動跨 Case 比對、去重或合併 Person／Case。

**Duplicate truth result：PASS。** 三者責任分離；未發現以 Account 保存 Person 或以 Person 控制 Case 生命週期的第二真相。

### 4.2 Care Case／Care Circle

- Care Case 是治理與協作生命週期根的產品概念。
- Care Circle 是有效 Membership、Relationship／Service Relationship 與 Grant 結果的投影。
- Circle 不授權、不邀請、不保存可獨立修改的成員 truth，也不暗示所有成員互見全部資料。

**Duplicate truth result：PASS。** 必須避免未來另存可獨立編輯的 `Care Circle member` truth；cache、view 或技術 ID 仍可在 Logical Model Review 比較，但不得成為授權來源。

### 4.3 Invitation／Membership／Relationship／Grant

```text
Invitation ≠ Membership ≠ Relationship ≠ Grant／Permission
```

- Invitation 只提出加入請求。
- Membership 保存參與週期。
- Relationship 說明參與原因。
- Grant 限定可做什麼及可見上限。
- pending verification、future start 或任何不完整條件都不得形成可使用 path。

**Duplicate truth result：PASS。** 現有概念沒有用任一層代替另一層；正式 transaction 尚未凍結。

### 4.4 Care Update／Observation

- Care Update／source envelope 統一來源、作者、雙時間、acting context、scope 與版本規則。
- Observation 保留可觀察事實的獨立 Domain 語意。
- 共用外框不等於所有內容使用同一狀態機或單一資料物件。

**Overlap result：RESOLVED CONCEPTUALLY。** Logical Model 必須比較共同外框的技術表示，避免 envelope 與 Observation 各保存一份可分歧來源 truth。

### 4.5 Question／Action

- Question 是需要釐清或判斷的問題。
- Action 是需要完成的工作。
- Question 可連結 0..n Actions；Action 可獨立存在且最多連結一個主要 Question。
- 建立 Question、回答 Question、完成 Action 與確認 Outcome 互不自動推定。

**Duplicate truth result：PASS。** 禁止以 Action 狀態保存 Question 結果，或以 Question 狀態保存責任進度。

### 4.6 Action／Responsibility Cycle

- Action 保存工作；Responsibility Cycle 保存一次指派及承接歷程。
- Action 不直接以「目前負責人」取代完整責任歷史。
- 重新指派結束舊 cycle 並建立新 cycle，不覆寫舊 assignee。
- Assignment 只能使用當時已存在的完整有效 path。

**Duplicate truth result：PASS WITH IMPLEMENTATION RISK。** Prototype 目前的 current assignee 加 responsibility history 只能作候選 UI；未來 Logical Model 必須選定唯一責任 truth。

### 4.7 Completion／Outcome

- Completion 只表示工作完成。
- Outcome 是對問題、原始狀況或後續安排的明確判斷。
- Outcome 確認者不得硬編碼為家屬或職稱，須由適當 capability、purpose、scope 與來源可見性判斷。

**Duplicate truth result：PASS。** Outcome 物件形式仍 Deferred，不得提前以 Question 或 Action 單一 status 取代完整結果語意。

## 5. Consolidated Domain Invariants

### 5.1 Identity, Case and governance

1. Account deletion must not delete Person reference、Care Case、authorship 或歷史。
2. Care Case 不依附任何單一 Account Identity 作生命週期根。
3. Care Recipient 可以沒有 Account Identity。
4. 每個 Care Case 恰好一位 Care Recipient Role，但不主張同一真人全平台只能有一個 Case。
5. 第一版不得依姓名、生日或其他屬性自動跨 Case 配對、去重或合併真人。
6. Case merge 必須經明確治理；正式 merge／split 流程 Deferred。
7. 可追溯帳號可建立受限 DRAFT，但啟用前不得邀請、分享或建立正式協作內容。
8. 最後治理者正常離開前必須有已接受的接任者；不可預期失效須 fail closed，且不得自動接任。
9. 治理能力不代表完整敏感內容存取。

### 5.2 Invitation, relationship and authorization

10. Invitation 不建立 Membership、Relationship 或 Grant。
11. Membership 不等於 Relationship，也不等於 Permission。
12. Relationship 存在不代表內容存取權。
13. 專業資格驗證不建立 Service Relationship 或 Case Grant。
14. 第一版 Invitation 綁定指定可信接收者；轉傳 credential 不得讓錯誤帳號接受。
15. pending Membership／Relationship 不進入有效 Care Circle，也不得洩漏 Case-derived 資訊。
16. 每次授權操作必須由一條完整有效 Grant path 單獨成立。
17. 不得拼接不同 identity、Relationship、purpose、scope、capability 或有效期間。
18. 只有多條完整有效 path 產生不同結果時才選 Acting Context。
19. Grant scope 是上限；個別內容可以更窄。
20. Membership、Relationship、Grant 或有效期間任一必要條件失效，該 path 即不可使用。
21. 服務截止時間到達時，產品語意上立即停止未來存取；技術 clock／query／排程方式未凍結。
22. 重新加入建立新的 Membership、Relationship 與 Grant generations，不恢復舊權限。
23. Care Circle 只由目前有效關係與授權結果投影，不保存第二份 access truth。

### 5.3 Information, source and versions

24. 資訊已建立不等於已提供／可取得、已確認接收、已閱讀、已理解或已接受責任。
25. 系統只依明確且可追溯事件描述狀態，不以畫面顯示、通知送出或頁面開啟推定閱讀或理解。
26. Observation 不得被表述為診斷；專業判斷與建議須標示來源身分及目的。
27. 發生時間與記錄時間不得混為一談。
28. 已發布內容不得直接覆寫；Correction、Addendum、Withdrawal、Supersede 均保留原始歷史。
29. 撤回不等於實體刪除；帳號失效不刪除作者 attribution。
30. 下游引用固定建立當時的特定可見來源版本。
31. 來源更新不得自動改寫 Question、Action、Responsibility Cycle 或 Outcome。
32. 更新提示只對目前仍有權查看者顯示，且不得洩漏版本數量或內容。
33. Link、摘要、通知、搜尋及計數都不得突破來源權限或暗示隱藏資料存在。
34. 多來源不得以 scope 聯集擴權；每位查看者需對所有必要來源及下游內容重新授權。

### 5.4 Question, work responsibility and results

35. Question 與 Action 使用獨立生命週期，但可明確連結。
36. Question 可連結 0..n Actions；Action 最多一個主要 Question，也可獨立存在。
37. 第一版不允許同一 Action 同時服務多個 Questions。
38. Action 可暫時沒有 Assignment，但不得宣稱有人承接、處理中或完成。
39. Action 與 Responsibility Cycle 分離。
40. 每次重新指派建立新 cycle，保留舊 assignee、狀態、時間及終止原因。
41. 同一時間只有一個目前有效 Responsibility Cycle；技術 constraint／locking 未凍結。
42. Action Assignment 不得反向建立 Membership、Relationship 或 Grant。
43. 指派不等於接受；接受不等於開始；開始不等於完成。
44. 接受、拒絕、開始及完成原則上只能由目前責任人以適當完整 path 操作；代理與代完成 Deferred。
45. Action completion 不等於 Question resolution。
46. Outcome 必須由具結果確認 capability、適用 purpose、完整 path 與必要來源可見性的人明確確認。
47. Outcome 不得覆寫 Question、Action 或 Responsibility Cycle 歷史。
48. 建議轉介不代表已掛號、已診斷、已治療或已完成正式轉介。

### 5.5 Loss of access and traceability

49. 到期、撤銷、Membership 終止或帳號失效後，未來存取與操作停止。
50. 歷史作者、來源、acting context、Grant generation、責任 cycle 及 Outcome attribution 保留。
51. 歷史參與、曾經看過或曾建立下游內容都不產生持續查看權。
52. 失權者不得經由舊 URL、下游摘要、搜尋、計數、通知或歷史活動推測內容。
53. 管理者只能取得治理所需最低資訊，不因重新指派能力取得完整專業或家庭限定原文。

## 6. Golden Scenario end-to-end walkthroughs

### 6.1 皮膚異常

**Account／Relationship**

- 日照人員使用已驗證專業 Identity，但專業驗證本身不授權。
- 該人須有目前有效 Membership generation 及日照 Service Relationship generation。

**Grant path**

- 本次以日照服務 purpose、允許 Observation 的 capability、適用 scope 及期間形成單一完整 path。
- 不得混入同一人的家庭身分 scope。

**Observation**

- 客觀記錄皮膚位置、外觀、當事人主述、發生／記錄時間及來源，不寫成診斷。
- 發布後形成不可直接覆寫的特定 source version。

**Question**

- 有權家屬或專業角色可引用該特定版本提出「是否需要進一步觀察或專業評估」。
- Question 不自動建立工作或責任。

**Action**

- 有相應 capability 者可建立「下次服務重新觀察」及「由護理人員評估」等獨立 Actions。
- 每個 Action 僅分享完成工作所需的最低資訊。

**Responsibility Cycle**

- 護理師 Assignment 只可指向當時已有完整有效 path 的人。
- 護理師明確接受、開始與完成；指派本身不代表接受。

**Outcome**

- Action 完成後，有適當結果確認能力者依可見來源判斷：已解決、持續追蹤、需新 Action 或建議轉介。
- 不得因完成評估自動將 Question resolved。

**後續／到期**

- 原 Observation 若更正，下游仍 pin 舊版本；只向目前有權者提示更新並人工評估。
- 護理服務到期後停止未來查看及操作，保留原作者與責任歷程。

**Result：PASS。** 資訊、責任、權限與歷史可完整連續。

### 6.2 進食量下降

**Account／Relationship**

- 家屬、照顧服務員或營養專業人員各自使用獨立 Identity／Relationship generations。
- 家庭關係不等於法律代理；營養師職稱不等於 Case Service Relationship。

**Grant path**

- 觀察者只能使用本次完整 path 記錄其有權分享的最低必要內容。
- 多重身分不可將家庭 scope 與專業 capability 拼接。

**Observation**

- 記錄實際餐次、可觀察份量變化與長輩主述，不將一次記錄轉譯為病因、營養診斷或「狀況穩定」。

**Question**

- 建立需釐清的 Question，例如「是否持續發生、是否需調整支持方式」。回答不等於已閱讀或已解決。

**Action**

- 可建立不同 Actions：後續數次服務記錄、家庭確認偏好、營養專業建議。
- 一個 Question 可連結多個 Actions，各自保持責任與 scope。

**Responsibility Cycle**

- 每個 Action 各自指派、接受及處理；任一完成不自動完成其他 Action。

**Outcome**

- 有權者可判定持續追蹤、需要新 Action 或建議轉介正式服務。
- 「建議轉介」不宣稱已完成醫療處置。

**後續／到期**

- 營養專業服務到期後不再查看個案；家庭或其他仍有效 path 不受影響。
- 失權專業人員的舊來源與作者 attribution 保留，但不產生持續存取。

**Result：PASS。** 多來源、多 Action 與不同 scope 不需合併權限即可連續協作。

### 6.3 專業服務到期

**Account／Relationship**

- 專業人員 Account Identity 仍存在，但該 Case 的 Service Relationship generation 到達截止時間。
- Account 持續存在不會延長 Membership、Relationship 或 Grant。

**Grant path**

- 截止後完整 path 立即不可用；不得只看 Grant 名義期限而忽略 Membership／Relationship。

**Observation／Question**

- 到期前建立的 source versions、Question 及作者 attribution 保留。
- 失權者不得從舊 URL、標題、搜尋、計數或摘要看見內容。

**Action**

- 已完成 Action 保留完成歷史。
- 未完成 Action 本身仍存在，但不代表舊 assignee 仍負責。

**Responsibility Cycle**

- 舊 cycle 以服務到期原因結束。
- Action 轉為「需要重新指派」產品語意；有治理 capability 者只能看到最低必要重新指派資訊。
- 不自動選定新負責人；重新指派建立新 cycle。

**Outcome**

- 服務到期本身不決定 Question 是否解決。
- 仍有完整 path 且具結果確認 capability 的角色才能確認 Outcome。

**重新加入／後續**

- 日後重新加入須建立新的 Membership、Service Relationship 與 Grant generations，不復活舊週期。
- 舊作者、舊角色、舊服務單位聲明、期間及責任 cycle 均保留。

**Result：PASS。** 目前存取、責任終止與歷史追溯保持分離。

### 6.4 治療師建議調整移位方式

**Account／Relationship**

- 治療師須有專業 Identity 條件及特定 Case 的有效 Service Relationship；資格驗證不等於個案權限。

**Grant path**

- 本次以復能服務 purpose、允許記錄專業建議的 capability、個別 scope 及期間形成單一 path。
- 若同一人也是家屬，只有在兩條完整 path 結果不同時選 Acting Context，且不可拼接。

**Observation／Care Update**

- 分開表達客觀移位觀察與具來源身分、目的的治療師建議。
- 建議不被標示為診斷，也不等於正式機構紀錄。

**Question**

- 可建立「現有照顧參與者是否理解並能安全採用此方式」的 Question。
- 資訊出現在畫面不等於已提供、已閱讀或已理解。

**Action**

- 可建立「由指定照顧人員確認接收指引」及「在下次服務依允許範圍回報執行情況」等 Actions。
- Action 只承載最低必要工作內容，不複製完整專業原文給無權者。

**Responsibility Cycle**

- 具適當 path 的照顧參與者明確接受 Assignment，處理與完成各自留痕。
- 管理者可重新指派，但無權因此查看完整專業限定原文。

**Outcome**

- 有結果確認能力者可判定已理解並持續採用、需再次說明、需新 Action 或需正式專業服務。
- Action completion 不自動證明使用者已理解，也不自動解決安全問題。

**後續／到期**

- 治療師後續更正建議時，下游 pin 原版本並提示有權者人工確認是否更新引用。
- 服務到期後治療師停止未來存取，照顧圈投影移除該有效關係，但歷史建議與作者保留。

**Result：PASS。** 明確區分資訊提供、接收、理解、責任承接、工作完成及結果確認。

## 7. Existing asset compatibility review

| Asset | Classification | Candidate reuse | Required treatment |
|---|---|---|---|
| Current WinWin Frontend Prototype | **可候選重用／部分必須重新設計** | Identity、Invitation、Workspace、access guard、Timeline、Question／Action 分離、correction UX、失權示範 | In-memory state 不是正式 truth；current assignee/history、source scope、Circle projection 與多 generation 需依整合模型重審 |
| Migration 007 Access Foundation | **必須重新審查** | Invitation、Membership、Grant、access events、最後治理者保護可作 authorization／audit 候選 | 混合的 Relationship 語意、pending activation、content-level scope 與 source authorization 不得視為已完成 |
| Migration 008 Identity／Grant alignment | **可候選重用／必須重新審查** | Identity verification separation、Membership identity alignment、capability vocabulary 可作候選 | Enum、template、capability 名稱不凍結；未表達完整 Relationship generation 與 Phase 3 content model |
| Migration 001–006 | **屬於備份心，不納入 WinWin** | 只作 repository history／v1 regression baseline | Coverage Engine、Scenario、Backup Assignment、handoff 不得映射為 WinWin Action、Responsibility Cycle 或 Outcome |
| v1 Frontend／tests | **屬於備份心，不納入 WinWin** | regression baseline | 不得以相同長照用語推定屬於 WinWin Domain |
| Existing Professional Record Prototype | **可候選重用** | append-only correction、author／acting context、family projection UX | 名稱不代表正式病歷；共同 source envelope、scope 與正式法律保存需重審 |

現有資產相容性結論：沒有任何既有程式或 Migration 足以直接成為整合模型的正式實作。候選重用必須在後續 Logical Data Model、Authorization 與 UX Gates 中逐項證明。

## 8. Vocabulary Conflicts

| Conflict | Consolidated resolution | Remaining risk |
|---|---|---|
| Person vs actor/account | Person 為受限真人參照；Account Identity 為登入身分；歷史 actor attribution 不等於持續 access | 現有 Migration actor vocabulary 可能混合帳號與人物參照 |
| Older adult vs Care Recipient | 高齡者是產品對象；Care Recipient Role 是特定 Case 角色 | 不得建立未審查的全平台 Older Adult master table |
| Care Circle vs member list | Circle 是權限化投影，不是可獨立修改清單 | Prototype 顯示資料不得成為第二 truth |
| Relationship in Membership | Membership 保存參與週期；Relationship 保存原因與服務週期 | Migration 007 的 relationship kind 需重審，不可直接沿用 |
| Grant path vs role | role／職稱只是 path 條件之一，不是 Permission | UI 文案與 capability template 容易被誤讀為自動授權 |
| Care Update vs content type | Care Update 是共同來源外框產品概念；Observation 等保留獨立語意 | Logical Model 若採單表需防巨大物件與空欄位 |
| Action status vs responsibility | Action 是工作；Cycle 是責任週期 | Prototype current assignee 與 history 可能重複真相 |
| Completed vs resolved | completed 是工作完成；resolved 是結果判斷 | 不得以狀態轉換捷徑自動同步 |
| Outcome vs status | Outcome 先固定產品語意，物件形式 Deferred | 過早建表或塞入 Question status 都可能限制未來模型 |

沒有發現 Phase 1–3 之間無法調和的 vocabulary conflict；上述項目是後續 Logical Model 必須保持的防混淆邊界。

## 9. Remaining Product Questions

以下不推翻整合模型，但在 Logical Data Model 或後續治理 Gate 前需取得 disposition：

1. 無來源 Question 的最低必要脈絡與可接受用途。
2. Family Relationship 的產品分類 vocabulary，以及與法律代理聲明的顯示界線。
3. Care Case DRAFT 放棄、授權遭拒、建立者帳號刪除時的產品處置。
4. 治理恢復期間允許的最低操作及資訊範圍。
5. 疑似重複 Care Case 的人工標示、暫停與未來 merge／split 產品流程。
6. Relationship 有效但沒有 Grant 時，Care Circle 對不同查看者顯示哪些最低資訊。
7. 服務開始前是否預先建立不可使用的 Grant generation，或到開始條件滿足才建立。
8. Question 結果後續改變時是否需要 reopen 產品語意；正式狀態機仍 Deferred。
9. Outcome 最終是獨立概念物件、Question decision event 或其他模型。
10. 多個 Questions 未來是否允許共享同一 Action；第一版已明確禁止。
11. 失權者可否看到完全一般化、不含 Case 推測資訊的自身歷史活動。
12. 第一版是否完全排除附件，以及附件若存在如何保持來源與 scope 邊界。

## 10. Requires Legal／Field Expert Confirmation

- Care Recipient、適當授權者、法律代理、意思能力及同意聲明的界線。
- 高齡者本人建立帳號後要求連結、爭議或撤回授權的治理程序。
- 最後治理者死亡、失聯或遭管理端刪帳時，新治理者資格、證據與爭議處理。
- 專業身分、資格、服務單位與服務關係的證明標準。
- Observation、專業評估、建議與醫療診斷的場域用語界線。
- Correction、Withdrawal、Supersede 及專業來源的法規保存與顯示方式。
- Assignment 拒絕理由、服務到期交接摘要與治理摘要的最低必要可見範圍。
- 不同 Outcome 所需的適當確認資格與 purpose。
- 建議轉介醫療／長照服務時的責任、用語、通知及免責界線。
- 個人資料保存、刪除請求、爭議保全與歷史 attribution 的法律要求。

## 11. Deferred Technical Decisions

- 正式 ERD、Aggregate、bounded-context physical ownership。
- 資料表、欄位、PK、FK、constraint、Cascade、indexes。
- Person／Account linkage、Case merge／split、DRAFT activation 與治理恢復資料結構。
- Invitation credential、hash、重送 transaction 及 recipient-binding 技術。
- Membership、Relationship、Grant generation 的識別、原子性與終止策略。
- Complete Grant Path 的正式授權演算法、RLS、source-level policy 與 acting-context persistence。
- Care Circle projection 的 view、cache、materialization 或 technical ID。
- Source envelope、Observation、Question、Action、Responsibility Cycle、Outcome 的資料表示。
- 正式狀態機、database clock、locking、concurrency 與唯一目前 cycle enforcement。
- Correction／Addendum／Withdrawal／Supersede 的版本表及 transaction。
- API、RPC、event、audit、cursor、notification 與搜尋索引。
- 前端資訊架構、UI、離線、部署及正式持久化。
- 完整 Event Sourcing。

上述項目全部仍為 **NOT FROZEN／BLOCKED**。本文件不授權任何技術實作。

## 12. Compatibility Risks

1. **Migration 007 semantic mixing：** Membership 內 relationship kind 可能使未來誤以為 Relationship 已獨立建模。
2. **Migration 007 activation coupling：** Invitation acceptance 原子建立 Membership／Grant，可能不適合 pending verification 或 future start。
3. **Migration 008 vocabulary lock-in：** capability enums 與 templates 可能反向限制尚未完成的 Logical Model。
4. **Prototype duplicate truth：** workspace、case、timeline、current assignee 與 history 若各自維護可能失去單一狀態來源。
5. **Care Circle persistence：** 若將 UI member list 直接持久化，會形成第二 access truth。
6. **Single content table pressure：** 共用 source envelope 可能被誤實作為含所有 Domain 狀態的巨大表。
7. **Scope laundering：** 下游摘要、通知或治理清單可能在未察覺下暴露較窄來源。
8. **Historical-access confusion：** 保留作者與責任歷史可能被錯誤轉換成持續查看權。
9. **v1 terminology reuse：** Backup Assignment、handoff 或 Coverage 狀態可能被錯映射為 WinWin Responsibility Cycle。
10. **Production overclaim：** Local Prototype 或 locally verified Migration 不等於 Remote／Production 已具備 WinWin 模型。

## 13. Consolidation findings

| Review question | Result | Rationale |
|---|---|---|
| 每個概念是否只有一個清楚責任 | **PASS** | Vocabulary table 已分離存在目的、生命週期與非語意 |
| Phase 1–3 是否有不可調和衝突 | **PASS** | 未發現；重疊處可由投影、generation、source envelope 與 cycle 邊界消歧 |
| Care Circle 是否始終只為投影 | **PASS** | 明確禁止獨立治理、授權及 member truth |
| Assignment 是否可能反向授權 | **PASS** | 全域 invariant 禁止建立 Membership、Relationship、Grant |
| 失權與歷史是否分離 | **PASS** | 未來 access 終止，作者、來源與責任 attribution 保留 |
| 來源版本規則是否接到下游 | **PASS** | append-only、pin specific version、manual review、no scope expansion 完整連續 |
| 管理能力與內容權限是否分離 | **PASS** | 治理者只取得最低治理資訊 |
| Golden Scenarios 是否能端到端成立 | **PASS** | 四情境均能連續描述資訊、責任、授權、結果及到期 |
| 是否提前凍結技術模型 | **PASS** | ERD、Schema、API、RLS、Migration、狀態機與實作全部 Deferred |

## 14. Gate decision

**PASS — CONSOLIDATED CORE OBJECT MODEL IS COHERENT**

整合模型已具備下列條件：

- Product Definition 與 Phase 1–3 的概念責任可以形成一致鏈。
- 沒有發現需要回退既有 Product Decision 的矛盾。
- 所有關鍵雙重真相風險已有明確禁止規則或後續審查條件。
- 四個 Golden Scenarios 可由單一完整 Grant path、pinned sources、獨立責任週期與 Outcome 邊界完整走通。
- 法律／場域問題與技術決策仍被明確隔離，未被誤寫為已完成。

本 Gate 只判斷概念整合一致，不代表 Logical Data Model 已完成，也不授權修改 Database、Migration、RLS、API 或 Frontend。

## 15. Explicit Next Gate

下一步可提案進入 **WinWin Logical Data Model Design Review Gate**，但必須另行授權並先：

1. 將本整合文件完成唯讀 Document Review 與獨立 checkpoint。
2. 明確列出 Logical Model 的候選實體與替代表示，不直接沿用 Migration 007／008。
3. 對每個候選 persistence boundary 標示其產品來源、單一 truth、歷史要求與授權影響。
4. 先做概念至邏輯模型的 traceability matrix，再比較 key、relationship、versioning 及 lifecycle 表示。
5. 維持 ERD、SQL、Migration、RLS、API 與前端實作 **BLOCKED**，直到 Logical Data Model 的產品及安全審查通過。

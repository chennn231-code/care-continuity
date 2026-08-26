# WinWin Core Object Model Design Review — Phase 3

> **狀態：DRAFT — Conceptual Design Review Only**
>
> **範圍：Care Update／Observation → Question → Action → Assignment → Outcome**
>
> 本文件不是 ERD，不定義資料表、欄位、FK、constraint、正式狀態碼、API、RPC、transaction、RLS、Migration 或前端實作。

## 1. Purpose and scope

本階段要回答：WinWin 如何保存跨角色協作所需的最低必要資訊，如何由有來源的觀察形成問題及處理事項，如何讓責任被明確指派、接受、處理、完成與重新指派，以及如何在不把「工作完成」誤認為「問題解決」的前提下描述結果。

本階段只處理：

- Care Update／Observation 的共同來源與獨立語意。
- Question 與 Action 的分離及連結。
- Action 與 Assignment／Responsibility Cycle 的分離。
- Outcome 的產品語意及替代方案。
- 已發布內容的版本、來源引用與最低必要分享邊界。
- 上述概念在 Phase 2 完整 Grant path 下的操作邊界。

本階段不完整設計 Answer、Arrangement、附件、通知、搜尋索引、醫療轉介系統或正式專業紀錄。本文件提及這些概念，只為檢查來源、分享及後續結果邊界。

## 2. Authoritative baselines

依據順序：

1. [`WINWIN_PRODUCT_DEFINITION_BOUNDARY_V1.0.md`](WINWIN_PRODUCT_DEFINITION_BOUNDARY_V1.0.md)。
2. [`WINWIN_CORE_OBJECT_MODEL_PHASE_1_DESIGN_REVIEW_DRAFT.md`](WINWIN_CORE_OBJECT_MODEL_PHASE_1_DESIGN_REVIEW_DRAFT.md)。
3. [`WINWIN_CORE_OBJECT_MODEL_PHASE_2_DESIGN_REVIEW_DRAFT.md`](WINWIN_CORE_OBJECT_MODEL_PHASE_2_DESIGN_REVIEW_DRAFT.md)。
4. 既有 Prototype、舊 Domain 文件與 Migration 007／008，只作候選相容性參考。

本文件必須維持：

- 資訊已建立不等於已提供、已確認接收、已閱讀或已理解。
- 知道一件事不等於接受處理責任。
- Action 完成不等於 Question 或原始問題已解決。
- Action Assignment 不得建立 Membership、Relationship 或 Grant。
- 所有操作仍須通過 Phase 2 的一條完整有效 Grant path。
- Grant scope 是分享上限；個別內容可更窄。
- WinWin 只保存跨角色協作所需的最低必要資訊。
- WinWin 內容不等於病歷、正式護理紀錄、診斷或機構法定紀錄。

既有 Prototype、Migration 或舊文件不得反向凍結本模型。

## 3. Terminology

| Term | Phase 3 conceptual meaning | Explicit boundary |
|---|---|---|
| Care Update | 保存共同來源脈絡並承載特定協作內容語意的產品概念 | 不等於單一巨大內容物件或正式照顧紀錄表 |
| Source envelope | 作者、acting context、來源、發生時間、記錄時間、分享範圍及版本關係等共同脈絡 | 是概念外框，不決定資料結構 |
| Observation | 對當時看見、聽見、量得或由當事人主述之事實的最低必要描述 | 不等於診斷、評估結論或醫療確認 |
| Question | 需要回答、釐清或確認後續結果的獨立協作問題 | 不等於 Action，也不自動建立責任 |
| Action | 為達成特定協作目的而需要處理的工作 | 不以目前負責人作為自身全部歷史 |
| Assignment／Responsibility Cycle | 一段 Action 責任由誰被指派、是否接受及何時終止的可追溯週期 | 不建立 Case Membership、Relationship 或 Grant |
| Outcome | 對問題或後續安排的受治理產品結果語意 | Phase 3 不先決定是否為獨立資料物件 |
| Published version | 已對授權對象形成可引用來源的不可直接覆寫內容版本 | 新版本不刪除原版本 |
| Source link | 下游概念建立時對特定、當時可見來源版本的引用 | 不自動漂移到最新版，也不擴大來源 scope |

## 4. Care Update and Observation alternatives

### 4.1 Alternative CU-A — One Care Update object differentiated only by type

Observation、Arrangement、Question 等全部放入單一 Care Update，只靠 type 及可選欄位區分。

優點：共同來源、作者、時間及分享範圍容易統一。缺點：容易形成巨大物件、充滿不適用欄位，並把 Question 狀態或 Observation 語意壓進同一 type switch。

### 4.2 Alternative CU-B — Fully separate objects

Observation、Arrangement、Question 等各自擁有完整作者、來源、時間、分享及版本模型。

優點：Domain 語意清楚。缺點：共同來源與版本規則重複，容易在不同物件出現不一致的更正與分享行為。

### 4.3 Alternative CU-C — Shared immutable source envelope with distinct domain semantics

共同的不可變來源外框保存作者、acting context、來源、發生時間、記錄時間、分享範圍及版本脈絡；Observation、Question 等維持各自 Domain 語意及規則。

優點：避免巨大物件與重複模型，同時保留一致的來源、版本及分享邊界。缺點：未來 Logical Model 必須清楚處理共同外框與各類語意的完整性。

### 4.4 Comparison

| 面向 | CU-A 單一物件 | CU-B 完全分離 | CU-C 共用外框＋獨立語意 |
|---|---|---|---|
| 作者、來源與雙時間 | 一致 | 容易重複 | 一致且可保留類型差異 |
| 分享範圍 | 一致但可能過度簡化 | 每類自行實作 | 共用上限，個別內容可更窄 |
| 更正／撤回 | type 分支複雜 | 規則可能不一致 | 共用版本語意，類型規則獨立 |
| 下游引用 | 易只指向可變單一物件 | 引用方式分散 | 可統一 pin 特定發布版本 |
| Observation 誤成診斷 | type 欄位容易混入結論 | 可清楚限制 | 可清楚限制且保留來源脈絡 |
| 巨大物件風險 | 高 | 低 | 低 |
| 重複模型風險 | 低 | 高 | 中低 |
| Prototype 可行性 | 高 | 中 | 中高 |
| 未來持久化複雜度 | 初期低、後期高 | 高 | 中高但邊界清楚 |

**Accepted for Phase 3：CU-C。** Care Update 是共同來源與可追溯外框的產品概念，Observation、Question、Action 等仍維持不同 Domain 語意。共同外框不代表單一巨大物件、資料表、Aggregate 或 inheritance；本階段也不凍結欄位或 Schema。

## 5. Question and Action alternatives

### 5.1 Alternative QA-A — Merge Question and Action

Question 同時保存回答、負責人、接受、處理及完成狀態。

結論：**Rejected alternative。** 提問會被誤認為已建立責任，回答、完成與解決狀態互相污染。

### 5.2 Alternative QA-B — Fully separate without explicit linkage

Question 與 Action 完全獨立，使用者只能靠文字理解兩者關係。

結論：不建議。雖可保持狀態分離，但無法追溯「這個 Action 為何產生」或「Question 有哪些處理事項」。

### 5.3 Alternative QA-C — Separate objects with explicit links

Question 與 Action 保持獨立生命週期，但可用受權限限制的明確連結描述其協作關係。

結論：**Accepted for Phase 3。**

必須守住：

- 提出 Question 不等於建立 Action 或處理責任。
- 回答 Question 不會自動完成任何 Action。
- Action 完成不會自動把 Question 標示為已解決。
- 一個 Question 可以連結零個、一個或多個 Actions，以支援多步處理。
- 一個 Action 最多連結一個主要 Question，也可以不連結 Question，代表獨立照顧安排或處理事項。
- Action 可引用多個可見來源版本；第一版不允許同一 Action 同時作為多個 Questions 的共同處理事項。多個問題若看似可由同一工作處理，仍應建立各自可追蹤的 Action，或由有權角色選定一個主要 Question。

## 6. Action and Assignment alternatives

### 6.1 Alternative AA-A — Action stores current assignee directly

Action 只保存目前負責人；重新指派時覆寫。

優點：簡單。缺點：會失去舊負責人、拒絕、服務到期及多次重新指派的責任歷程。

### 6.2 Alternative AA-B — Action and Responsibility Cycle separated

Action 保存工作本身；每次指派建立一段 Assignment／Responsibility Cycle，記錄被指派者、接受／拒絕、責任開始與終止原因。

優點：不覆寫歷史，可表達無目前負責人、拒絕、到期、撤銷及多次重新指派。缺點：需治理「目前週期」與 Action 狀態的一致性。

### 6.3 Alternative AA-C — Full event sourcing

只保存所有事件，由事件重建 Action 及責任狀態。

優點：完整追溯。缺點：學生 MVP 的重建、查詢、修復與除錯成本過高。

### 6.4 Accepted direction

正式接受 **AA-B**，拒絕覆寫 assignee，並將完整 Event Sourcing 延後。

產品語意至少需表達：

- 建立 Action 可暫時沒有目前 Assignment，但在被接受前不能宣稱有人負責。
- 未指派 Action 必須清楚標示為「尚待指派」或「需要重新指派」，只能出現在具適當治理能力者可見的最低必要工作清單；不得進入處理中或完成。
- 指派不等於接受；接受不等於開始；開始不等於完成。
- 被指派者可明確接受或拒絕自己的責任週期。
- 重新指派須結束舊週期並建立新週期，不覆寫原負責人。
- 同一時間只能有一個目前有效的 Responsibility Cycle；Cycle 結束不等於 Action 已完成。
- 負責人在 Action 未完成時到期、撤銷或失去必要完整 Grant path，舊週期結束，Action 進入需要治理重新指派的產品語意。
- Assignment 只能指向當時已有適當有效 Membership、Relationship 及完整 Grant path 的成員。

正式狀態名稱、狀態機、唯一目前週期 constraint 與 transaction 未凍結。

## 7. Outcome alternatives

### 7.1 Alternative O-A — Outcome only as Question or Action status

優點：物件少。缺點：容易把 Action 完成等同問題已解決，也難描述持續追蹤、轉介或新增 Action。

### 7.2 Alternative O-B — Independent Outcome object now

優點：可獨立保存確認者、依據與後續安排。缺點：Phase 3 尚未證明所有結果都需要獨立生命週期，可能過早建立抽象物件。

### 7.3 Alternative O-C — Preserve product-level outcome semantics, defer object form

固定結果語意與確認邊界，但延後決定 Outcome 是否為獨立物件、Question 狀態轉換或其他受治理紀錄。

**Accepted for Phase 3：O-C。** 第一版固定 Outcome 的產品語意，但不在本階段決定其最終物件形式。

至少支援：

- 已解決。
- 持續追蹤。
- 需要新的處理事項。
- 建議轉介正式醫療或長照服務。
- 其他受治理規則允許的後續安排。

Outcome 必須由當時具適當完整 Grant path、能查看必要來源且具結果確認能力的角色明確確認；不得把「家屬」硬編碼為唯一確認者。

## 8. Accepted conceptual model

```text
Published Care Update source version
  └─ Observation／其他獨立 Domain 語意
       ↓ 可被有權者引用
Question（回答／釐清／結果生命週期）
       ↓ 可建立零至多個明確 linked Actions
Action（最多一個主要 Question；也可獨立存在）
       ↓ 零至多段不可覆寫 Responsibility Cycles
Assignment／Responsibility Cycle
       ↓ 處理結果只提供 Outcome 判斷的依據
Outcome product semantics
       └─ 不由 Action completion 自動決定
```

所有箭頭均受來源可見性、個別分享範圍及 Phase 2 單一完整有效 Grant path 限制。此圖不是 ERD、Aggregate 或 transaction design。

## 9. Source envelope and Observation rules

每筆已發布協作內容的共同來源外框概念上應保留：

- 作者／行為者及當時 acting context。
- 來源或主述者類型。
- 發生時間。
- 記錄時間。
- 個別分享範圍。
- 發布與版本關係。
- 最低必要的內容語意。

共同外框不把 Observation、Question、Action 等合併為同一 Domain 物件。專業判斷或建議必須清楚標示來源身分及使用目的，且不得藉專業身分將 Observation 自然升格為診斷。

Observation 規則：

- 描述看見、聽見、量得或被主述的事實及必要脈絡。
- 不以診斷名稱、確定病因或未經確認的專業結論取代觀察。
- 發生時間與記錄時間不可混為一談。
- 來源必須可追溯，但不得因此保存不必要個資。
- 沒有新 Observation 不得被轉譯為「狀況穩定」。

## 10. Published content and version semantics

### 10.1 Published content is append-only

已發布內容不得直接覆寫。後續處理分為：

| Operation | Product meaning | Historical effect |
|---|---|---|
| Correction／更正 | 明確指出原內容有不準確處並提供修正版本 | 保留原文、作者、時間、更正者、理由及 lineage |
| Addendum／補充 | 新增後來取得的資訊，不宣稱原版本錯誤或失效 | 原版本及補充均保留來源與各自 scope |
| Withdrawal／撤回 | 聲明原版本不應繼續作為目前依據 | 保留原文、作者、時間、撤回者與理由；不得抹除既有歷史引用 |
| Supersede／取代 | 以新版本成為目前採用的完整表述 | 明確 lineage；不靜默刪除舊版本 |

未發布草稿可以編輯；已發布內容不得直接覆寫。更正者可以不是原作者，但必須具備適當完整 Grant path，並保存更正者、理由及時間。帳號失效不得刪除歷史作者歸屬。正式版本表、狀態碼、編號及 transaction 未凍結。

### 10.2 Source pinning

- Question、Action、Assignment 與 Outcome 應引用建立當時的特定可見來源版本，而不是自動指向可變「最新版」。
- 來源後續更正、撤回、取代或補充，不自動修改下游 Question、Action、Assignment 或 Outcome。
- 對目前仍有權查看更新的使用者，顯示「引用來源已有更新」；提示不得洩漏其無權查看的版本、數量或內容。
- 有權角色須人工確認是否建立新引用、重新評估或建立後續 Action；不得由系統靜默替換或自動合併。
- 舊引用、新引用及每次操作歷史全部保留，且不得因此自動變更責任歷程或分享範圍。

### 10.3 Sharing boundaries across links

- 建立下游連結不會擴大來源分享範圍。
- 下游 Question、Action、Assignment、Outcome、通知與摘要必須重新通過當次完整 Grant path，且其分享範圍不得突破所依賴來源中必要資訊的可用範圍。
- 多來源具有不同 scope 時，只能向同時有權查看必要來源的人顯示組合脈絡；不得以聯集、複製或摘要繞過最窄必要來源邊界。
- 回覆、附件及衍生摘要都是新的受治理內容，需各自判斷目的、scope、作者及來源；不能假設自然繼承較寬權限。
- 不得以「另有隱藏來源」或隱藏筆數向無權者洩漏資訊存在。
- 使用者失去來源查看權後，不得透過下游標題、摘要、引用、計數、搜尋或歷史參與推測來源；必要時只能顯示不洩漏內容的「來源目前無法查看」。

## 11. Question model

Question 保存「需要回答、釐清或確認結果」的協作問題，不保存 Action 的責任狀態。

產品原則：

- Question 可由具完整有效 Grant path 且能查看必要來源的成員建立。
- Question 可沒有來源，也可引用一個或多個特定來源版本；無來源 Question 仍須有最低必要脈絡。
- 回答使系統知道有人提供回答，不等於提問者已接收、閱讀、理解，也不等於問題已解決。
- Question 可以連結多個 Actions。
- Question 的結果需由具適當完整 Grant path、符合本次目的且能查看必要來源的角色明確確認。
- Question 提出者不自然成為唯一 Outcome 確認者，家屬也不被固定為唯一確認者。

## 12. Action model

Action 保存需要完成的工作目的、最低必要說明、相關來源及其獨立處理生命週期。

- 建立 Action 不等於已有人負責。
- Action 可由具相應 capability 的完整 Grant path 建立。
- Action 最多連結一個主要 Question，也可以不連結 Question；Action 可引用多個特定來源版本。
- 第一版禁止同一 Action 同時作為多個 Questions 的共同處理事項。
- Action 可在未指派狀態存在，但不能進入已接受或處理中語意。
- 未指派時須標示為「尚待指派」或「需要重新指派」，不得因通知已送出而宣稱已指派或有人承接。
- 完成 Action 只表示該項工作已由適當責任週期完成，不代表來源內容正確，也不自動解決 Question。
- 取消 Action、終止 Assignment 與撤回來源是三種不同事件。

## 13. Assignment／Responsibility Cycle

每次 Assignment／Responsibility Cycle 至少在產品層回答：

- 誰指派。
- 指派給誰及當時完整 Grant path 是否適用。
- 指派時間及預期期限。
- 被指派者是否接受或拒絕。
- 何時開始處理。
- 何時完成或為何終止。
- 是否因到期、撤銷、離職或失權需要重新指派。

權限語意：

- 建立／指派 Action 需要相應 capability，但不代表可查看所有來源全文。
- 被指派者只能在自己的完整有效 path 下接受、拒絕、開始或完成自己的 Responsibility Cycle。
- 管理者可有重新指派能力，但不能替被指派者接受或完成工作，也不自然取得敏感來源全文。
- 服務到期或失權後，原責任週期保留，未完成 Action 需進入重新指派治理；不得自動選定下一位。
- 重新指派建立新週期，舊 assignee、狀態、時間與終止原因不可覆寫。
- 同一時間只能有一個目前有效的 Responsibility Cycle；Cycle 結束不代表 Action 已完成。

## 14. Outcome product semantics

Outcome 表達對 Question、原始問題或後續安排的明確受治理判斷，不是 Action completion 的別名。

- Outcome 確認者必須具有完整有效 Grant path、結果確認 capability 及必要來源可見性。
- Outcome 必須保存確認者、acting context、時間及當時可見的具體來源版本。
- 管理能力本身不等於 Outcome 確認能力。
- 結果可為已解決、持續追蹤、需要新 Action、建議轉介正式服務或其他受治理安排。
- 「建議轉介」只記錄協作建議與後續責任，不代表完成醫療轉介、診斷或取得服務。
- 若 Outcome 需要新 Action，必須明確建立新的 Action；不得只靠結果文字暗示責任已存在。
- Outcome 後續可以被新的可追溯判斷更新，但不得覆寫原確認者、依據與時間。
- Outcome 不得改寫既有 Question、Action 或 Responsibility Cycle 歷史。

## 15. Permission and minimum-necessary information

所有下列操作均需 Phase 2 的單一完整有效 Grant path，且 individual content scope 可比 Grant ceiling 更窄：

| Concept / operation | Minimum product authorization boundary |
|---|---|
| 建立 Care Update／Observation | 能建立該類資訊、目的適用、可選的 scope 在 Grant 上限內 |
| 查看來源 | 目前可查看該特定版本；歷史作者身分不產生查看權 |
| 追加更正／撤回／取代／補充 | 具有相應內容治理能力及必要來源可見性；原作者也不一定永久有權 |
| 建立 Question | 可查看必要來源且具建立 Question 能力；不能藉 Question 分享來源給無權者 |
| 建立 Action | 具建立 Action 能力及必要最低來源脈絡 |
| 指派／重新指派 | 具指派能力；候選人當時已有適當 Membership、Relationship 與完整 Grant path |
| 接受／拒絕／開始／完成 | 被指派者本人使用該責任週期適用的完整 path；管理者不能代替 |
| 確認 Outcome | 具結果確認能力及必要來源可見性；不硬編碼為家屬 |

上述能力不得只因職稱或 Membership 自然取得。建立 Question、建立 Action、指派、重新指派、接受／拒絕、開始／完成、確認 Outcome，以及更正／補充／撤回／取代來源，均為需由完整有效 Grant path 個別判斷的能力。代理操作與管理者代完成維持 Deferred。

失權後：

- 未來建立、查看、修正、指派、處理及確認操作立即停止。
- 歷史作者、來源、版本、Assignment 與 Outcome attribution 保留。
- 保留歷史不代表失權者仍能查看。
- 下游頁面、搜尋、提示、摘要、通知及隱藏筆數都不得洩漏無權內容。

## 16. Conceptual relationship diagram（非 ERD）

```text
Shared source envelope
  ├─ author + acting context
  ├─ source
  ├─ occurred time / recorded time
  ├─ individual sharing boundary
  └─ immutable published-version lineage
       ↓
Observation / other distinct Care Update semantics
       ↓ pin exact visible version
Question ────────┐
  │ zero-to-many │ 每個 Action 最多一個主要 Question
  ↓              ↓
Action ── zero-to-many Responsibility Cycles
  │              ├─ assign
  │              ├─ accept / decline
  │              ├─ start / complete
  │              └─ end / reassign without overwrite
  ↓ evidence, not automatic result
Outcome product semantics
```

本圖不代表資料表、Aggregate、FK、Cascade 或 transaction。

## 17. Fifteen walkthroughs

### 17.1 日照人員發現皮膚異常

- **Objects：** Observation Care Update、published source version。
- **Allowed：** 以有效日照服務 path 記錄客觀位置、外觀、時間、來源與最低必要 scope。
- **Reject：** 寫成確定診斷、分享超出 Grant ceiling、因發布推定他人已閱讀。
- **Preserve：** 作者、acting context、發生／記錄時間、來源、版本及 scope。
- **Permission：** 只有當下可建立該 scope 的完整 path 可發布；查看者另行判斷。
- **Expert：** Observation 最低必要資訊與專業用語界線需場域確認；正式欄位仍 Deferred。

### 17.2 家屬提出問題

- **Objects：** Question、被引用 Observation 特定版本。
- **Allowed：** 有權家屬以可見來源建立 Question。
- **Reject：** 建立 Question 即視為有人接受責任，或向無權者暴露 Observation。
- **Preserve：** 問題作者、來源版本、建立時間及 scope。
- **Permission：** Question 自己的 scope 不得突破必要來源邊界。
- **Deferred：** 無來源 Question 的最低脈絡及正式欄位留待後續 Domain／Logical Model Review。

### 17.3 護理師接受處理事項

- **Objects：** Action、第一段 Responsibility Cycle、相關 Question／source links。
- **Allowed：** 護理師以適當完整服務 path 明確接受自己的 Assignment。
- **Reject：** 指派即當作接受，或由管理者代為接受。
- **Preserve：** 指派者、被指派者、接受時間、acting context 及來源版本。
- **Permission：** 接受不擴大護理師可見來源範圍。
- **Deferred：** 接受期限、逾時狀態名稱與 clock 實作留待後續狀態機及技術設計。

### 17.4 護理師完成評估，但問題仍需持續追蹤

- **Objects：** Action completion、Question、Outcome「持續追蹤」。
- **Allowed：** 護理師完成自己的 Action；另由有權角色確認持續追蹤。
- **Reject：** Action completion 自動把 Question 設為已解決。
- **Preserve：** 完成內容、責任週期、Outcome 確認者、依據及時間。
- **Permission：** Outcome 確認者需查看必要來源，不限定家屬。
- **Expert：** 各類 Outcome 所需資格與場域角色仍需法律／場域專家確認；產品原則已固定為完整有效 Grant path、目的適用及必要來源可見性。

### 17.5 一個問題需要兩個不同處理事項

- **Objects：** 一個 Question、兩個 Actions、各自 Responsibility Cycles。
- **Allowed：** 依不同目的建立兩個 linked Actions，分別追蹤。
- **Reject：** 任一 Action 完成即自動完成另一 Action 或解決 Question。
- **Preserve：** 每個 Action 的來源、責任、狀態與結果。
- **Permission：** 每個 Action 的參與者只看其工作必要資訊。
- **Deferred：** Question UI 如何呈現多 Action 結果留待前端資訊架構設計。

### 17.6 負責人拒絕後重新指派

- **Objects：** Action、已拒絕的舊 cycle、新 cycle。
- **Allowed：** 保留拒絕後由有權者建立新 Assignment。
- **Reject：** 覆寫舊 assignee、把新 assignee 視為已接受。
- **Preserve：** 兩段責任人、拒絕／指派時間及理由。
- **Permission：** 新 assignee 必須當時具有適當完整 path。
- **Expert：** 拒絕理由的最低必要可見範圍需場域確認。

### 17.7 負責人在處理中服務到期

- **Objects：** Action、進行中的 cycle、到期 Service Relationship、重新指派語意。
- **Allowed：** 截止時間到達即停止未來操作，結束舊 cycle，交由有權治理者重新指派。
- **Reject：** 等背景 job 才失權、自動指定新負責人、刪除舊責任。
- **Preserve：** 到期前行為、原責任人、處理進度及終止原因。
- **Permission：** 失權者不能再查看；管理者只看重新指派所需最低資訊。
- **Expert：** 未完成內容的最低必要交接摘要需場域確認。

### 17.8 原觀察被更正，但下游 Question 已建立

- **Objects：** 原 Observation version、更正版本、Question 的 pinned source link。
- **Allowed：** 保留 Question 原引用，向仍有權者提示來源更新並人工評估。
- **Reject：** 自動把 Question 改指新版本或改寫問題文字。
- **Preserve：** 原文、更正、理由、lineage 及原 source link。
- **Permission：** 無權看更正版本者不看到提示或隱藏版本數量。
- **Deferred：** 已固定只向目前有權者提示「引用來源已有更新」；提示的 UI 層級與互動留待前端設計。

### 17.9 使用者失去來源查看權，但曾建立 Action

- **Objects：** 歷史 Action、source link、失效 Grant path、作者 attribution。
- **Allowed：** 保留 Action 與建立者歷史；由仍有權者繼續治理。
- **Reject：** 因歷史作者身分繼續查看來源或 Action 內容。
- **Preserve：** 當時 acting context、來源版本 ID 的受控歷史參照及建立時間。
- **Permission：** 目前存取重新計算；歷史 attribution 不授權。
- **Deferred／Expert：** 失權者不得看來源或敏感下游內容；是否允許更廣的一般化歷史活動及其最小文字，留待治理與場域確認。

### 17.10 Action 完成後由有權角色判定問題仍未解決

- **Objects：** completed Action、Question、Outcome「持續追蹤／未解決」。
- **Allowed：** 有權確認者依必要來源明確判斷未解決，必要時建立新 Action。
- **Reject：** 回復已完成 Action 來假裝問題仍在處理，或自動建立責任。
- **Preserve：** Action completion 與 Outcome 判斷兩條獨立歷程。
- **Permission：** 確認者需獨立 capability，不因管理權自然取得。
- **Deferred：** Question 是否需要正式 reopen 狀態及其狀態機留待後續設計；本階段只固定 Outcome 可判定仍未解決。

### 17.11 建議轉介正式醫療服務

- **Objects：** Outcome「建議轉介」、可能的新 Action。
- **Allowed：** 記錄建議、原因來源及後續誰需處理；必要時明確建立 Action。
- **Reject：** 宣稱已完成轉介、已取得診斷或已建立院所預約。
- **Preserve：** 建議者、依據、時間、後續責任及 scope。
- **Permission：** 只向需要協作且有權者顯示最低必要內容。
- **Expert：** 醫療轉介用語及責任界線需專業／場域確認。

### 17.12 多條有效身分路徑需要選擇 Acting Context

- **Objects：** Care Update／Question／Action 操作、兩條完整 Grant paths、選定 context。
- **Allowed：** 僅在兩條完整有效 path 結果不同時選一條執行。
- **Reject：** 拼接家庭 scope 與專業 capability，或保留前一 context 的隱藏內容。
- **Preserve：** 本次 acting role、Relationship、purpose、scope 及 validity 脈絡。
- **Permission：** 建立及查看都以選定 path 重新計算。
- **Deferred：** Acting Context UI 不在本階段設計。

### 17.13 管理者有重新指派能力，但無權查看完整專業原文

- **Objects：** Action、Responsibility Cycle、受限專業 source version。
- **Allowed：** 查看足以識別工作與候選資格的最低治理摘要並重新指派。
- **Reject：** 因管理 capability 查看完整專業內容或家庭限定內容。
- **Preserve：** 重新指派者、原因、舊／新 cycle 及來源參照。
- **Permission：** Governance capability 與 content scope 分離；摘要不得扭曲來源。
- **Expert／Deferred：** 最低治理摘要是否足以安全交接需場域確認；正式欄位與 UI 留待後續設計。

### 17.14 來源包含不同分享範圍的多筆內容

- **Objects：** 多個 source versions、Question／Action、可能的衍生摘要。
- **Allowed：** 只在操作者可查看全部必要來源時建立組合內容，且下游 scope 不突破必要來源邊界。
- **Reject：** 以較寬來源 scope 覆蓋較窄來源，或暗示另有隱藏資料。
- **Preserve：** 各 source link、各自 scope、摘要作者與 purpose。
- **Permission：** 每位查看者分別重新判斷所有必要來源及下游內容。
- **Deferred：** 多來源仍採逐一授權且不得以聯集擴權；最窄邊界的 UI 提示方式留待前端設計。

### 17.15 已撤回內容仍被歷史責任週期引用

- **Objects：** 撤回 source version、歷史 Action、已結束 Responsibility Cycle。
- **Allowed：** 保留不可變歷史引用及撤回 lineage；目前使用者看到受治理的撤回提示。
- **Reject：** 刪除歷史引用、讓撤回內容繼續作為新 Action 的有效依據，或向無權者透露內容。
- **Preserve：** 原來源、撤回原因、Action、cycle、當時 acting context。
- **Permission：** 歷史可追溯仍受目前查看權限制。
- **Expert：** 撤回後法規保存與顯示方式需法律／場域確認。

## 18. Domain invariants

| Candidate invariant | Classification | Rationale / remaining boundary |
|---|---|---|
| Information creation is not delivery, receipt, reading or understanding | **Accepted for Phase 3** | Product Definition 已凍結 |
| Awareness is not responsibility acceptance | **Accepted for Phase 3** | Question、Action、Assignment 必須分離 |
| Action completion is not Question resolution | **Accepted for Phase 3** | Product Definition 已凍結 |
| Action Assignment cannot create Membership, Relationship or Grant | **Accepted for Phase 3** | Phase 2 已固定 |
| Every operation uses one complete valid grant path | **Accepted for Phase 3** | 禁止跨路徑拼接 |
| Observation must not be represented as diagnosis | **Accepted for Phase 3** | WinWin 不取代專業判斷 |
| Published content must not be directly overwritten | **Accepted for Phase 3** | 草稿可編輯；發布後採 Correction／Addendum／Withdrawal／Supersede 追加式語意 |
| Downstream links pin a specific source version | **Accepted for Phase 3** | 防止來源更新靜默改寫責任 |
| Source updates must not automatically rewrite downstream objects | **Accepted for Phase 3** | 只對目前有權者提示並由其人工建立新引用 |
| Linking or summarizing content must not expand source access | **Accepted for Phase 3** | 最低權限與個別 scope |
| Question and Action maintain independent lifecycles with explicit links | **Accepted for Phase 3** | QA-C 已接受 |
| One Question may link multiple Actions; one Action has at most one primary Question | **Accepted for Phase 3** | 支援多步處理但避免多問題共用工作造成責任模糊 |
| Responsibility reassignment creates a new cycle and preserves prior cycles | **Accepted for Phase 3** | AA-B 已接受；同時只有一個目前有效週期 |
| Action may temporarily have no Assignment | **Accepted for Phase 3** | 標示尚待指派／需要重新指派，不能進入處理中或完成 |
| Assignee loss of access ends future responsibility operations without erasing history | **Accepted for Phase 3** | 歷史與目前存取分離 |
| Outcome confirmation is independent from Action completion | **Accepted for Phase 3** | 結果需明確確認 |
| Outcome confirmer is not hard-coded to family | **Accepted for Phase 3** | 依完整 path 與 capability 判斷 |
| Outcome object form | **Deferred** | 先固定產品語意，不先決定獨立物件 |
| Formal state machines, schema, API, RLS and transactions | **Deferred** | 超出本 Gate |

## 19. Privacy and misuse risks

| Risk | Consequence | Conceptual control |
|---|---|---|
| Observation 被寫成診斷 | 誤導家庭與後續角色 | 客觀來源語意；診斷與專業結論排除 |
| 下游 link 擴大來源 scope | 無權角色間接看到敏感內容 | Source pinning 不授權；下游另判斷且不得突破來源 |
| 更正自動改寫 Question／Action | 歷史責任依據被靜默改變 | Pin 特定版本，只提示有權者 |
| Action completion 自動 resolve Question | 問題結果被錯判 | 分離 lifecycle 與 Outcome confirmation |
| 重新指派覆寫 assignee | 責任歷史消失 | 新 Responsibility Cycle，舊週期不可改寫 |
| 管理者查看完整來源 | 治理能力造成內容越權 | 最低治理摘要與 content scope 分離 |
| 隱藏來源數量提示 | 洩漏敏感資料存在 | 無權者不顯示筆數、搜尋結果或更新提示 |
| 撤回等同刪除 | 稽核、來源及責任斷裂 | 保留歷史 lineage，停止未來有效使用 |
| 專業內容被當法定紀錄 | 過度宣稱與合規風險 | 明示協作資訊，不取代正式系統 |

## 20. Existing asset compatibility review

本節是唯讀概念對照，不證明既有資產相容，也不授權修改。

### 20.1 Current WinWin Frontend Prototype

| Observation | Classification | Treatment |
|---|---|---|
| Timeline 保存作者、發生／記錄時間、來源與分享範圍 | **候選重用** | 可作 source envelope UI 參考，不代表 Domain 已定案 |
| Question 與 Action state 分離並有 linked ID | **候選重用** | 與 QA-C 部分相容；需重新審查多來源／多 Action |
| Action 使用單一目前 assignee 加上 responsibility history | **需要重新審查** | 需確認真正 Responsibility Cycle 邊界，避免雙重真相 |
| `NEEDS_REASSIGNMENT` 與服務到期流程 | **候選重用** | 產品語意相容；正式狀態名稱未凍結 |
| Professional Record 使用 correction lineage | **候選重用** | 可驗證 append-only UX；名稱不代表正式病歷或護理紀錄 |
| Timeline activity 由多種 state 衍生 | **需要重新審查** | 不得成為另一份 content／responsibility truth |
| 家屬 projection 過濾專業內容 | **候選重用** | 需用來源與下游 scope 規則重新驗證 |

### 20.2 Migration 007

- 只建立 Access Foundation；沒有 Care Update、Question、Action、Assignment 或 Outcome 資料物件。
- Access events、Membership 與 Grant 可作 authorization／audit 候選，但不能決定 Phase 3 content model。
- Invitation acceptance、管理者保護與 role grants 不證明內容版本、責任週期或 Outcome 已受支援。

分類：**需要重新審查；不可直接升格為 Phase 3 相容實作。**

### 20.3 Migration 008

- 宣告部分未來 content capabilities，但刻意不建立 content tables、policies 或 RPC。
- Capability 名稱只是候選 vocabulary，不能凍結建立、查看、更正、指派或結果確認模型。
- Identity／Grant alignment 可作完整 path 參考，但不證明 source-level authorization 或 acting context 已完整保存。

分類：**需要重新審查；Phase 3 不由既有 enum 決定。**

### 20.4 Product Definition and Phase 1／2

- Product Definition 對資訊狀態、責任與結果分離是 Phase 3 的強制基線。
- Phase 1 的 Case／Care Circle 邊界要求內容不依附單一帳號，且 Circle 不成為 access truth。
- Phase 2 的 Invitation／Membership／Relationship／Grant 分離及單一路徑授權直接約束所有 Phase 3 操作。

分類：**權威且一致。**

### 20.5 Incompatible／out-of-scope assets

- 將 v1 Backup Assignment、Coverage Engine、Scenario 或 Handoff 狀態解讀成 WinWin Action、Responsibility Cycle 或 Outcome：**不相容，拒絕。**
- Migration 001–006 及相關 v1 UI／測試屬備份心資產：**不得納入 WinWin Phase 3 model。**

## 21. Accepted for Phase 3

- Care Update 採共同不可變來源外框，Observation、Question、Action 等維持獨立 Domain 語意；不代表單一資料表。
- 未發布草稿可編輯；已發布內容採 Correction／Addendum／Withdrawal／Supersede 追加式語意，原文、作者、時間與 lineage 保留。
- 下游內容 pin 建立當時的特定來源版本；來源更新只提示目前有權者，不自動替換、合併或改寫責任歷程。
- Question 與 Action 分離但可明確連結；一個 Question 可有零至多個 Actions，一個 Action 最多一個主要 Question，也可獨立存在。
- Action 與 Responsibility Cycle 分離；重新指派建立新 cycle，同時只能有一個目前有效 cycle。
- Action 可暫時沒有 Assignment，但只能標示尚待指派／需要重新指派，不能宣稱有人承接或完成。
- Outcome 先固定產品結果語意，延後最終物件形式；確認者不固定為家屬。
- 下游 Question、Action、Assignment、Outcome、通知與摘要都不得突破來源權限或以聯集擴權。
- 資訊、接收、閱讀、理解及責任接受彼此不可推定。
- Action completion 與 Question resolution 分離。
- Assignment 不建立 Membership、Relationship 或 Grant。
- 所有操作通過 Phase 2 單一完整有效 Grant path。
- Observation 不等於診斷。
- Grant scope 是上限，個別內容、下游引用與摘要不得擴權。
- 歷史作者、來源與責任保留不代表未來查看權。
- Outcome 確認者不硬編碼為家屬。
- 管理能力不等於敏感來源查看權。

## 22. Product decision disposition

| Product decision | Disposition | Phase 3 effect |
|---|---|---|
| PD-01 共用不可變來源外框＋獨立 Domain 語意 | **Accepted** | 採 CU-C；欄位與 Schema 未凍結 |
| PD-02 已發布內容採追加式更正 | **Accepted** | 草稿可編輯；發布後不得直接覆寫 |
| PD-03 下游引用固定特定來源版本 | **Accepted** | 更新只提示目前有權者並由其人工建立新引用 |
| PD-04 Question 與 Action 分離但可連結 | **Accepted** | 獨立生命週期，不互相自動完成或解決 |
| PD-05 第一版 Question／Action cardinality | **Accepted with constraints** | Question 0..n Actions；Action 0..1 primary Question；不支援多 Question 共用 Action |
| PD-06 Action 與 Responsibility Cycle 分離 | **Accepted** | 新指派建立新 cycle，不覆寫責任歷史 |
| PD-07 Action 可暫時沒有 Assignment | **Accepted with constraints** | 只能尚待指派／需要重新指派，不能處理中或完成 |
| PD-08 操作能力分離 | **Accepted** | 各操作由單一完整有效 Grant path 個別判斷；代理及代完成 Deferred |
| PD-09 Outcome 維持產品層結果語意 | **Accepted with deferred object form** | 固定結果語意及確認邊界；物件形式延後 |
| PD-10 下游分享不得突破來源權限 | **Accepted** | 所有下游內容重新授權且不得以聯集、摘要、計數或搜尋擴權 |

原 Product Decision Review 問題均已取得 disposition；本節不再保留未決產品方案。UI 呈現、正式狀態機、技術表示及需專家確認的資格界線仍分別列於 Deferred 與 Expert sections。

## 23. Requires Legal／Field Expert Confirmation

- Observation、專業評估與診斷用語的場域界線。
- 何種更正、撤回或保存方式符合專業與機構要求。
- 專業來源被撤回後的法規保存、顯示及後續使用限制。
- 誰具有問題結果或轉介建議的適當確認資格。
- 建議轉介正式醫療／長照服務時的責任、用語及通知邊界。
- 拒絕 Assignment、到期交接與重新指派理由的最低必要可見範圍。
- 家庭與專業角色可見的最低治理摘要是否足以安全交接。
- 附件或正式專業文件是否完全排除第一版，及其法規處理要求。

## 24. Deferred

- Outcome 是否為獨立 Domain Object。
- Answer 與 Arrangement 的完整模型。
- 附件正式模型，以及通知、搜尋索引、游標與稽核實作。
- 正式狀態名稱與完整狀態機。
- Source envelope、version、link 與 Responsibility Cycle 的資料結構。
- 資料表、欄位、FK、constraint、ERD、Database Schema、Migration、SQL、RLS。
- API、RPC、transaction、database clock、locking 與 concurrency 演算法。
- 代理操作及管理者代接受、代處理或代完成。
- 前端資訊架構與 UI。
- 完整 Event Sourcing。

## 25. Rejected alternatives

- Question 與 Action 合併。
- Action 只保存並覆寫目前 assignee。
- 以 Action completion 自動 resolve Question。
- 下游物件永遠自動指向來源最新版。
- 以 link、摘要或通知擴大來源分享範圍。
- 以管理 capability 推導全部敏感內容存取。
- 以 Assignment 自動建立 Membership、Relationship 或 Grant。
- 第一版使用完整 Event Sourcing。

## 26. Decision log

| ID | Decision | Status | Reason |
|---|---|---|---|
| P3-D01 | Care Update 採共同來源外框＋獨立 Domain 語意 | **Accepted** | 平衡一致來源與語意完整性，不凍結資料結構 |
| P3-D02 | Observation 不等於診斷 | **Accepted baseline** | Product Definition 邊界 |
| P3-D03 | 已發布內容不可直接覆寫 | **Accepted** | 保留可信來源與版本歷程 |
| P3-D04 | 下游 pin 特定來源版本，不自動漂移 | **Accepted** | 防止靜默改寫責任依據 |
| P3-D05 | Question 與 Action 分離並可明確連結 | **Accepted** | 保留問題與工作獨立生命週期 |
| P3-D06 | Question 0..n Actions；Action 0..1 primary Question | **Accepted with constraints** | 支援多步協作並避免責任歸屬模糊 |
| P3-D07 | Action 與 Responsibility Cycle 分離 | **Accepted** | 不覆寫責任歷史 |
| P3-D08 | 重新指派建立新 cycle；可暫時無 Assignment | **Accepted with constraints** | 保留舊 assignee；未指派不能處理中或完成 |
| P3-D09 | Action completion 不自動 resolve Question | **Accepted baseline** | Product Definition 已凍結 |
| P3-D10 | Outcome 採 O-C，先固定語意、延後物件形式 | **Accepted with deferred object form** | 避免過早抽象化 |
| P3-D11 | Outcome confirmer 不固定為家屬 | **Accepted baseline** | 依完整 path 與能力判斷 |
| P3-D12 | 下游分享重新授權且不得突破來源 | **Accepted** | 最低必要資訊與 non-inference 邊界 |
| P3-D13 | ERD、Schema、API、RLS、Migration、前端 | **Deferred／Blocked** | 等待後續 Logical Model Review 與明確技術 Gate |

## 27. Gate decision

**PASS — PHASE 3 PRODUCT DECISIONS COMPLETE; READY FOR FINAL READ-ONLY DOCUMENT REVIEW**

本文件已完成：

- Care Update／Observation 三方案比較。
- Question／Action 三方案比較。
- Action／Assignment 三方案比較。
- Outcome 三方案比較。
- Source envelope、append-only version、source pinning 與分享邊界。
- 權限與最低必要資訊矩陣。
- 十五項 walkthrough。
- Domain invariants、風險與既有資產相容性審查。

PD-01 至 PD-10 均已取得明確 disposition。法律／場域專家事項仍保留，沒有被產品決策誤寫為已確認。下一步只可進行最終唯讀 Document Review；在審查通過前不得建立 checkpoint。

仍為 **BLOCKED**：

- ERD、Database Schema、Migration、SQL、RLS。
- 正式狀態、資料表、欄位、FK、constraint。
- API、RPC、transaction、concurrency、token 或 clock 實作。
- 前端、測試、Supabase、Production 或部署變更。

## 28. Explicit next step

下一步是對本文件進行最終唯讀 Document Review，重點核對 PD-01 至 PD-10、15 項 walkthrough、Domain invariants、專家事項與 Deferred 技術邊界的一致性。審查通過後，才可建立獨立 Phase 3 文件 checkpoint。

在後續 Logical Model Review 與明確技術 Gate 前，不得畫 ERD、設計資料庫、修改 Migration 001–008、撰寫 SQL／RLS／API 或修改前端。

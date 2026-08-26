# WinWin Core Object Model Design Review — Phase 1

> **狀態：DRAFT — Conceptual Design Review Only**
>
> **範圍：Person／Account Identity／Care Recipient Role／Care Case／Care Circle**
> 本文件不是 ERD，不定義資料表、欄位、API、RLS、Migration 或正式狀態機。

## 1. Purpose and scope

本階段要回答：WinWin 如何在不建立全平台真人主檔、不把個案綁死於登入帳號，也不把照顧圈誤解為共享全部資料的群組之前提下，描述「現實世界中的人、登入身分、被照顧者角色、協作空間及目前參與者」。

本階段只處理：

- Person。
- Account Identity。
- Care Recipient Role。
- Care Case。
- Care Circle。

本階段不處理完整 Membership、Relationship、Grant、Question、Action、Outcome 或資料庫設計。文中提及 Membership 或 Grant，只為說明上述五個概念的邊界，不能視為 Phase 2 已完成。

## 2. Authoritative product baseline

本文件的最高產品依據是 [`WINWIN_PRODUCT_DEFINITION_BOUNDARY_V1.0.md`](WINWIN_PRODUCT_DEFINITION_BOUNDARY_V1.0.md)。其凍結內容包括：

- WinWin 是以高齡者及其照顧圈為中心的跨角色照顧協作與責任交接平台。
- 只保存完成協作所需的最低必要資訊、來源與責任歷程。
- Invitation、Membership、Grant／Permission 與 Action Assignment 彼此分離。
- 存取至少受身分、個案關係、目的、範圍及期間限制，且須由一條完整有效授權路徑成立。
- WinWin 不取代正式醫療、護理、機構或長照行政系統。
- WinWin 與備份心是兩個獨立產品；備份心的 Coverage Engine、Scenario 與 Backup Assignment 不會自動由 WinWin 繼承。

既有 Prototype、舊 Domain 文件、Migration 007／008 及備份心資產只作候選參考，不得反向決定本模型。

## 3. Terminology

| Term | Phase 1 conceptual meaning | Explicit boundary |
|---|---|---|
| Person | 現實世界中的人物概念，用於理解某段照顧關係指向誰 | 不是已驗證的全平台真人主檔，不主張跨 Case 唯一性 |
| Account Identity | 能登入 WinWin 且具有帳號驗證狀態的數位身分 | 不等於 Person 已被法律驗證，不是 Care Case 生命週期根 |
| Care Recipient Role | 某個 Person reference 在特定 Care Case 中作為被照顧者的角色 | 不是另一個全平台 Person master record |
| Care Case | 圍繞一位被照顧者進行協作、治理與歷史保存的空間 | 不由單一建立者或管理者帳號擁有其生命週期 |
| Care Circle | 某個 Care Case 目前有效參與者、關係及授權結果的產品視圖 | 不等於共享全部資料的群組；Phase 1 不視為獨立生命週期根 |
| Person reference | 在一個 Case 或受治理流程內指向人物的最低必要參照 | 不證明與其他 Case reference 是同一真人 |
| Historical actor attribution | 記錄當時由誰、以何種關係或身分進行行為的歷史歸屬 | 不代表該人物目前仍有存取權 |

用語原則：高齡者／被照顧者描述人在特定 Care Case 中的產品角色；「個案」描述協作空間，不得把三者當成同一資料物件。

## 4. Alternative models

### 4.1 方案 A — Account-centric

帳號建立並擁有 Care Case，人物與其他資料依附帳號。

| 面向 | 評估 |
|---|---|
| 隱私風險 | 中；資料集中在建立者帳號，但容易把帳號控制誤當人物與個案所有權 |
| 帳號刪除後持續性 | 差；容易 Cascade 或留下無治理個案 |
| 無帳號高齡者 | 勉強可用代理資料，但角色與帳號容易混淆 |
| 重複個案 | 無法處理；不同帳號自然建立多份 |
| 誤連結風險 | 中；傾向以帳號資料快速綁定 |
| 授權治理 | 差；建立者容易成為永久 owner |
| 學生 Prototype 可行性 | 高，但錯誤假設日後成本高 |
| 未來擴充性 | 低至中 |
| 符合產品定義 | 不符合個案不依附單一帳號的原則 |

結論：**不推薦**。

### 4.2 方案 B — Global Person-centric

先建立全平台唯一 Person 主檔，再把 Account Identity、Care Case 及角色連結到 Person。

| 面向 | 評估 |
|---|---|
| 隱私風險 | 高；形成全平台人口索引與跨 Case 關聯能力 |
| 帳號刪除後持續性 | 好；Person 與帳號分離 |
| 無帳號高齡者 | 可支援 |
| 重複個案 | 理論可偵測，但需要可靠真人解析 |
| 誤連結風險 | 高；同名、生日、電話或 Email 都可能誤合併 |
| 授權治理 | 複雜；需處理 master-data 管理、拆分及爭議 |
| 學生 Prototype 可行性 | 低 |
| 未來擴充性 | 技術上高，但法遵與治理成本很高 |
| 符合產品定義 | 違反第一版資料最小化與不自動跨 Case 比對原則 |

結論：**第一版不採用**。

### 4.3 方案 C — Case-independent governance with limited Person concept

Care Case 獨立存在；Person 只作受限概念或 Case 範圍內人物參照；Account Identity 分離；不做跨 Case 真人自動比對或合併。

| 面向 | 評估 |
|---|---|
| 隱私風險 | 最低；不建立全平台真人搜尋或關聯索引 |
| 帳號刪除後持續性 | 好；Case、人物參照及歷史歸屬不依附帳號 |
| 無帳號高齡者 | 原生支援 |
| 重複個案 | 允許暫時並存，以治理流程處理，不做危險自動合併 |
| 誤連結風險 | 最低；帳號連結需明確治理確認 |
| 授權治理 | 清楚；Case 自有治理生命週期 |
| 學生 Prototype 可行性 | 中高；可先用 Case-scoped reference 驗證流程 |
| 未來擴充性 | 好；未來可另行設計受控 Person resolution |
| 符合產品定義 | 最符合資料最小化、帳號解耦與授權可追溯性 |

結論：**正式接受（PD-01）**。

## 5. Recommended conceptual model

Phase 1 正式接受方案 C：**Case-independent governance with limited Person concept（PD-01）**。

1. Care Case 是獨立治理與協作空間，不隸屬任何帳號。
2. 每個 Care Case 有一個被照顧者角色，該角色指向 Case 範圍內的最低必要 Person reference。
3. Person 是現實人物概念，不宣稱為全平台已驗證主檔。
4. Account Identity 只承擔登入、帳號驗證及可追溯的數位行為者身分。
5. Person 與 Account Identity 的連結必須經明確治理程序確認；不能靠屬性相似自動建立。
6. Care Circle 是從目前有效 Membership、Relationship／Service Relationship 與 Grant 結果形成的權限化產品視圖，不另建獨立治理根或可獨立修改的成員真相。
7. 歷史作者／行為者歸屬與目前存取資格分開保存與判定。

這是 **Accepted for Phase 1** 的概念方向。它不決定資料表、Aggregate、FK、Cascade、ERD 或資料庫模型；Account Identity 亦不得成為 Care Case 的生命週期根。

## 6. Person／Account Identity／Care Recipient Role

### 6.1 Person

Person 表示現實世界中的人物概念，但第一版不建立可跨所有 Care Case 搜尋、比對或合併的真人主檔。

**Accepted for Phase 1：**

- 高齡者可在沒有登入帳號時先被一個 Care Case 以最低必要 Person reference 描述。
- 同名、相同生日、相同電話、相同 Email 或其他相似屬性都不足以自動判定為同一真人。
- 禁止跨 Care Case 自動 Person matching、deduplication 或 merge。
- 人物參照應符合最低必要資料原則，不因「未來可能比對」而收集更多識別資料。

**Deferred：** 是否需要受控的跨 Case Person resolution，以及由誰執行。

### 6.2 Account Identity

Account Identity 表示可登入 WinWin 的數位帳號及其驗證狀態。它不是 Person 的同義詞，也不證明法律身分、代理權、同意或專業資格。

**Accepted for Phase 1：**

- 一個 Person 可以暫時沒有 Account Identity。
- Account Identity 可以提出連結既有 Care Case 中 Person reference 的請求，但不能自行完成連結。
- 姓名、Email、電話、生日或其他個人屬性不能單獨作為自動連結依據。
- 連結需要受治理確認，並留下提出者、確認者、依據、時間與結果的可追溯事件；具體資料與流程留待後續設計。
- 帳號停用、刪除或解除連結，不得刪除 Person reference、Care Case、歷史作者、責任或協作歷程。
- Account Identity 不能成為 Care Case 的生命週期根。

**Open product question：** 何種角色可核准或拒絕連結，以及爭議期間是否暫停所有連結權利。

### 6.3 Care Recipient Role（PD-02）

Care Recipient Role 表示某個 Person reference 在特定 Care Case 中是被照顧者。它不是獨立的全平台真人 master record。

**Accepted for Phase 1：**

- 每個 Care Case 只能有一位 Care Recipient Role；Care Case 是圍繞該位高齡者形成的協作與治理空間。
- Phase 1 不支援夫妻、家庭或多位被照顧者共用同一 Care Case。
- 上述限制不表示同一位現實高齡者在全平台只能存在一個 Care Case；系統不得宣稱能可靠判斷不同 Case reference 是否指向同一真人。
- 疑似重複 Case 只能標示為待治理處理，不得自動比對、去重或合併。
- 無帳號被照顧者可以存在。
- Prototype 可讓建立者聲明已取得適當授權，但必須顯示：使用者聲明不等於法律有效代理、本人意思能力、電子同意或法定授權已經驗證。

**Requires legal／field expert confirmation：** 無帳號高齡者的適當授權者、代理依據、爭議處理與需保存的證明程度。

**Deferred：** 正式 Care Case merge／split 程序及其身分確認、歷史與爭議治理。

## 7. Care Case lifecycle and governance

Care Case 是具有獨立治理、協作及歷史保存生命週期的空間。它不得因建立者、管理者或任一 Account Identity 消失而被刪除。

### 7.1 Lifecycle intent

以下只定義生命週期語意，不凍結正式狀態名稱或狀態機：

- **草稿階段：** 可建立最低必要被照顧者參照與治理聲明，但未滿足啟用條件前不得對外邀請或分享 Case 內容。
- **可協作階段：** 已有足以啟動協作的授權聲明與至少一條有效治理關係。
- **暫停階段：** 治理、授權或安全條件不足時，停止一般協作操作；歷史仍保留。
- **封存階段：** 日常協作結束但歷史仍需保存；封存不是刪除。
- **恢復：** 必須經明確治理程序重新確認，不因登入、建立新帳號或重新加入而自動發生。

### 7.2 Traceable account may create DRAFT（PD-04）

**Accepted with constraints for Phase 1：**

- 已登入且可追溯的 Account Identity 可以建立 Care Case DRAFT。
- DRAFT 建立者不等於 Care Recipient、適當授權者或正式協作治理者，也不因建立行為成為永久 owner。
- 啟用前只允許最低必要草稿資料及草稿治理操作；不得邀請成員、分享個案資料或建立正式協作內容。
- 必須先完成 Prototype 範圍內的授權聲明及受控啟用，才可進入有效協作。
- Prototype 只能記錄使用者聲明已取得授權，不代表已驗證法律代理、本人意思能力、文件真實性或電子同意效力。
- 暫停、封存或恢復只能由當時具相應有效治理能力者，或未來明確定義的安全恢復程序執行。
- 一般成員、歷史參與者或僅具內容存取者不得因曾參與而執行治理操作。

**Deferred：** DRAFT 正式狀態機、儲存欄位、activation transaction、草稿放棄與清理、帳號刪除及授權遭拒的處理規則。

### 7.3 Last-governor two-stage protection（PD-05）

**正常離開：**

- 最後一位有效治理者不得在新治理者完成接受移交前主動離開。
- 最後一位有效治理者不得撤銷自己的最後治理能力，也不得在未處理治理責任前完成一般 App 帳號刪除。
- 管理權移交不等於取得所有敏感內容權限。

**不可預期失效：**

- 若最後治理者因管理端直接刪帳、死亡、失聯或其他不可控原因失效，Care Case 必須 fail closed，進入概念上的治理恢復／暫停狀態。
- 不自動指定新治理者，也不允許歷史成員因曾參與而自然取得治理權。
- 停止邀請、分享及一般協作寫入，只允許最低必要的治理恢復操作。
- 保留 Care Case、歷史作者、既有內容及責任歷程。
- 新治理者的資格、證據、指定程序與爭議處理屬 **Requires legal／field expert confirmation**。

**Deferred：** 正式狀態名稱、狀態機、欄位、RPC、鎖定及恢復演算法。

### 7.4 Duplicate Case policy

- 每個 Care Case 只能有一位 Care Recipient Role，但這不是「每位現實高齡者在全平台只能有一個 Care Case」的唯一性宣告。
- 第一版無法安全證明跨 Case 是否為同一真人，因此不能強制全平台唯一。
- 兩個疑似代表同一人的 Care Case 可以暫時並存，但不得互相顯示內容、成員、存在數量或推測結果給無權使用者。
- 未經明確治理程序不得 merge Care Case。
- Merge 的身分確認、雙方授權、內容去重、衝突、歷史來源及 rollback 尚未設計，因此 **Deferred**。
- 封存重複 Case 也不得改寫或刪除其歷史來源。

## 8. Care Circle alternatives and recommendation

### 8.1 Alternative 1 — Independent Domain Object

Care Circle 有自己的 ID、狀態、管理者與生命週期。

優點：可直接呈現一個命名群組。缺點：容易形成 Case 之外的第二治理根、暗示群組成員共享全部資料，並造成 Membership 與 Circle membership 雙重真相。

結論：第一版不推薦。

### 8.2 Alternative 2 — Effective relationship projection

Care Circle 是 Care Case 中目前有效 Membership／Relationship 的集合視圖。

優點：只有一套關係真相；加入、到期、撤銷或暫停會自然改變投影；可依目前查看者權限提供最小化視圖。缺點：查詢與顯示需正確處理時間與權限。

結論：**Phase 1 正式採用**。

### 8.3 Alternative 3 — UI/product wording only

Care Circle 只是介面文案，不承諾穩定 Domain 語意。

優點：最簡單。缺點：若沒有明確投影規則，頁面容易各自組裝成員並產生不同真相。

結論：可作 UI 名稱，但仍需 Alternative 2 的概念投影規則。

### 8.4 Phase 1 accepted decision（PD-03）

- Care Circle 是 Care Case 中目前有效成員、關係及授權結果的產品／UI 視圖，不是獨立生命週期根，也不具有獨立治理權限。
- 它由某個 Care Case 當下有效的 Membership、Relationship／Service Relationship 與 Grant 結果產生。
- 不得同時保存一份可獨立修改的 Care Circle member truth，以避免雙重真相。
- 成員加入、服務開始、到期、撤銷或暫停時，Care Circle 投影隨有效關係改變。
- 歷史作者不因離開目前 Care Circle 而從既有紀錄消失。
- Care Circle 本身不授予資料存取權；加入照顧圈不等於取得全部資訊，實際可見內容仍需獨立授權判斷。
- 對沒有成員名單權限的使用者，不得洩漏隱藏成員的姓名、角色或數量。

**Not frozen：** Care Circle 是否需要技術識別碼、cache、view 或 materialized projection。

## 9. Relationship diagram — conceptual, not ERD

```text
現實世界中的人
  └─ Person concept / limited Person reference
       ├─ 可能沒有 Account Identity
       └─ 在特定 Care Case 中扮演 Care Recipient Role

Account Identity
  ├─ 用於登入、帳號驗證及可追溯行為
  ├─ 可提出連結 Person reference 的請求
  └─ 不擁有 Care Case 的生命週期

Care Case
  ├─ 獨立治理與協作生命週期
  ├─ 恰好一個 Care Recipient Role（Phase 1）
  ├─ 目前有效的參與關係（Phase 2 待設計）
  └─ Care Circle＝有效參與者／關係的權限化投影

歷史作者／責任歸屬
  └─ 即使 Account 或目前存取失效，仍保留當時可追溯性
```

箭頭只表示概念關係，不表示資料表、外鍵、Aggregate ownership 或 Cascade。

## 10. Ten walkthroughs

### 10.1 家屬先建立個案；高齡者沒有帳號

- **Objects：** 建立者 Account Identity、DRAFT Care Case、Case-scoped Person reference、Care Recipient Role。
- **Relationships：** 建立者只是提出草稿與授權聲明；尚未因此取得永久治理或全部內容權限。
- **Allowed：** 記錄最低必要 Person reference、提出 Prototype 範圍的授權聲明及完成受控啟用條件；啟用前僅能進行最低必要草稿治理。
- **Preserve：** 草稿建立者、聲明、時間與變更歷程。
- **Reject：** 把高齡者虛構成登入帳號、未啟用前邀請／分享、宣稱代理權已驗證。
- **Open：** 誰能確認授權聲明，需法律／場域確認。

### 10.2 高齡者日後建立帳號並要求連結既有 Case

- **Objects：** 新 Account Identity、既有 Person reference、Care Recipient Role、連結請求概念。
- **Relationships：** 請求尚未核准前，Account 與 Person／Case 不成立有效連結。
- **Allowed：** 提出請求、由有權治理程序核對並決定。
- **Preserve：** 請求、依據、確認者與結果歷程。
- **Reject：** 只因姓名、Email、電話或生日相符就自動綁定。
- **Open：** 本人證明、代理爭議及核准者資格需專家確認。

### 10.3 建立者刪除帳號

- **Objects：** Person reference、Care Case、Care Recipient Role、歷史 actor attribution 均保留。
- **Relationships：** 該 Account 的目前可登入連結失效；其他有效關係不受影響。
- **Allowed：** 依治理規則繼續 Case 協作。
- **Preserve：** 作者、聲明、責任及歷史事件。
- **Reject：** Cascade 刪除 Case、Person reference 或歷史。
- **Open：** 帳號刪除前的治理交接 UX 留待後續設計。

### 10.4 最後一位治理者即將離開

- **Objects：** Care Case、目前治理關係、候選接任關係。
- **Relationships：** 新治理關係有效後才能安全終止舊關係。
- **Allowed：** 新治理者接受移交後才終止舊治理能力；不可預期失效時 fail closed，僅允許最低必要治理恢復。
- **Preserve：** Case 與完整治理歷史。
- **Reject：** 在接任者接受前離開／自我撤銷／完成一般帳號刪除，留下開放但無治理 Case，或把治理權自動交給任一現有或歷史成員。
- **Open：** 緊急恢復權需法律／場域專家確認。

### 10.5 兩位家屬各自建立疑似同一高齡者 Case

- **Objects：** 兩個 Care Case、兩個 Case-scoped Person references、兩組獨立治理歷程。
- **Relationships：** 未經治理判定前互不相連。
- **Allowed：** 保持隔離，只標示為待治理處理，向具適當權限者提出重複個案審查。
- **Preserve：** 兩邊原始來源與歷史。
- **Reject：** 自動 merge、交叉顯示內容或透露另一 Case 的存在。
- **Open：** Governed merge／archive process 為 Deferred。

### 10.6 同名同生日但實際不同人

- **Objects：** 各自的 Care Case 與 Person reference。
- **Relationships：** 姓名生日相同不建立跨 Case 關係。
- **Allowed：** 各自獨立協作。
- **Preserve：** 個別歷史。
- **Reject：** 自動合併、推薦連結或共享成員／內容。
- **Open：** 未來是否提供人工重複審查工具為 Deferred。

### 10.7 錯誤帳號要求連結

- **Objects：** 請求者 Account Identity、目標 Person reference、Care Case、連結請求概念。
- **Relationships：** 未核准，不形成連結或存取。
- **Allowed：** 最低揭露的請求受理與拒絕流程。
- **Preserve：** 安全所需的請求與決定歷程，不保存多餘敏感內容。
- **Reject：** 顯示 Case 詳情、以屬性相符自動核准、透露其他成員。
- **Open：** 欺詐／誤連結的申訴與保存期間需專家確認。

### 10.8 高齡者或適當授權者提出爭議

- **Objects：** Care Case、爭議中的 Person／Account 連結、治理決定歷程。
- **Relationships：** 爭議中的連結不得被當成無爭議的授權來源。
- **Allowed：** 暫停相關未來存取或治理操作，啟動受控審查。
- **Preserve：** 原始內容、作者、決定與爭議歷程。
- **Reject：** 單方面覆寫歷史、刪除反對紀錄或自動恢復權限。
- **Open：** 暫停範圍、舉證及裁決者需法律／場域確認。

### 10.9 專業服務到期

- **Objects：** Account Identity、歷史 actor attribution、Care Case、Care Circle projection。
- **Relationships：** 專業人員不再出現在目前有效 Care Circle 投影；歷史參與仍可追溯。
- **Allowed：** 其他有效成員依各自權限繼續協作。
- **Preserve：** 當時作者、角色、服務期間、來源與責任歷程。
- **Reject：** 由歷史參與推定目前存取，或刪除過去作者。
- **Open：** 未完成責任的完整重新指派模型屬後續 Phase。

### 10.10 Care Circle 成員變化

- **Objects：** Care Case、有效關係集合、Care Circle projection、歷史 actor attribution。
- **Relationships：** Circle 由當下有效 Membership、Relationship／Service Relationship 與 Grant 結果投影，隨有效關係改變；過去紀錄不被改寫。
- **Allowed：** 依查看者權限顯示目前最低必要成員視圖。
- **Preserve：** 原作者、當時關係與時間。
- **Reject：** 另存可獨立修改的 Circle member truth、因成員離開改寫作者，或因加入 Circle 授予全部內容。
- **Open：** 不同角色可見的成員欄位與歷史成員可見性留待 Phase 2。

## 11. Domain invariants

| Candidate invariant | Phase 1 classification | Rationale / remaining boundary |
|---|---|---|
| Account deletion must not delete Person, Care Case, authorship, or history | **Accepted for Phase 1** | 符合個案與帳號生命週期分離 |
| A Care Case must not depend on one account as its lifecycle root | **Accepted for Phase 1** | 防止建立者離開造成 Case 消失 |
| An account must not be linked to a Person solely by matching personal attributes | **Accepted for Phase 1** | 防止錯誤真人綁定 |
| No automatic cross-case Person merge in the first version | **Accepted for Phase 1** | 資料最小化與誤連結風險 |
| Care Case merge must not occur without an explicit governed process | **Accepted for Phase 1** | Merge 流程本身 **Deferred** |
| Care Circle membership must not imply access to all case content | **Accepted for Phase 1** | Circle 只是目前關係投影，不是全資料群組 |
| Care Circle must be derived from effective Membership, Relationship／Service Relationship and Grant results, without a separately mutable member truth | **Accepted for Phase 1** | 防止雙重真相；技術識別碼與投影實作仍未凍結 |
| Historical actor identity must remain traceable after future access ends | **Accepted for Phase 1** | 追溯與目前權限分離 |
| A Care Recipient may exist without an Account Identity | **Accepted for Phase 1** | 原生支援無帳號高齡者 |
| Current access must not be inferred from historical participation | **Accepted for Phase 1** | 服務到期後立即停止未來存取 |
| Product wording must not claim unproven legal identity, agency, consent, or professional verification | **Accepted for Phase 1** | Prototype 不能證明法律／專業事實 |
| Each Care Case must have exactly one Care Recipient Role | **Accepted with constraints** | 不支援多人共用 Case；不主張同一真人全平台只有一個 Case |
| A DRAFT may be created by a traceable account without proving legal authority | **Accepted with constraints** | 啟用前只准最低必要草稿治理，不得邀請、分享或建立正式協作內容 |
| Last-governor normal departure requires an accepted successor | **Accepted with constraints** | 移交前不得主動離開、自我撤銷最後治理能力或完成一般帳號刪除 |
| Unexpected loss of the last governor must fail closed without automatic succession | **Accepted with constraints** | 保留歷史，只允許最低必要治理恢復 |
| Exact activation, suspension, archive and restoration authorities and state machines | **Deferred** | 後續治理設計，不在 Phase 1 凍結 |
| Legal representative, consent, dispute and emergency recovery rules | **Requires legal／field expert confirmation** | 不由 Prototype 自行宣稱 |
| Cross-case Person resolution and governed Case merge implementation | **Deferred** | 超出第一版範圍 |

## 12. Privacy and mistaken-linking risks

| Risk | Consequence | Phase 1 control |
|---|---|---|
| 同名／生日／電話／Email 誤合併 | 把兩人的照顧內容與關係混在一起 | 禁止屬性自動連結或 merge |
| 全平台 Person 搜尋 | 洩漏某人是否存在、參與哪些 Case | 第一版不建全平台真人主檔或搜尋 |
| 錯誤帳號連結 | 未授權存取、錯誤作者與治理者 | 連結必須受治理確認，核准前 fail closed |
| 建立者被視為所有者 | 帳號刪除造成資料消失或永久控制 | Care Case 生命週期獨立 |
| Care Circle 被視為全資料群組 | 成員看到超出目的與範圍的內容 | Circle membership 不授予全部內容；成員投影也受權限限制 |
| 歷史參與被當成目前權限 | 到期／撤銷後繼續存取 | 歷史 attribution 與 current access 分離 |
| 授權聲明被當成法律證明 | 誤導使用者或答辯 | 明示聲明不等於法律代理／同意已驗證 |
| 重複 Case 被自動合併 | 來源、責任、版本及權限污染 | 先隔離並存；未有 governed process 前不 merge |

## 13. Existing asset compatibility review

### 13.1 Current WinWin Prototype

| Observation | Compatibility assessment | Treatment |
|---|---|---|
| `PrototypeIdentity` 同時承擔帳號的主要身分、角色與作者 identity | Person 與 Account Identity 邊界仍混合 | 必須重新審查；不可直接升格為核心物件 |
| Mock Case 以顯示名稱表示被照顧者，沒有獨立 Person concept | 符合避免全平台 Person master 的方向，但語意不足 | 可作 UI 原型，Domain 不直接沿用 |
| Membership 與 Grant path 已分離 | 與 Product Definition 相容 | Phase 2 候選參考，不在本階段凍結 |
| Care Circle member 陣列與 selector projection 同時存在 | 可能產生 stored list 與有效關係投影雙重真相 | 推薦只保留概念上的有效關係投影；實作另行審查 |
| 歷史 activity 保留 identity／role label | 與歷史可追溯性方向相容 | 可重用概念，需與未來 Person／Account 邊界對齊 |

### 13.2 Migration 007

| Observation | Compatibility assessment | Treatment |
|---|---|---|
| `v2_actor_references.auth_user_id` 使用 `ON DELETE SET NULL` | 支援帳號刪除後保留 actor reference | 候選可重用概念 |
| Care Case 以 actor 建立，但 FK 為 RESTRICT，沒有 account-owned Cascade | 大致符合 Case 生命週期獨立 | 需確認建立者是否仍被過度當作治理根 |
| 沒有 Phase 1 Person／Care Recipient Role 概念 | 無法直接表達推薦模型 | **衝突／缺口：必須重新審查**，不得直接 Remote Apply 來決定 Domain |
| Membership／Grant／治理者保護已存在 | 與後續治理方向部分相容 | Phase 2 再評估，不在本階段接受 SQL 實作 |
| Access event tombstone 保留歷史識別 | 與可追溯性方向部分相容 | 需重新審查資料最小化與 Person 邊界 |

### 13.3 Migration 008

| Observation | Compatibility assessment | Treatment |
|---|---|---|
| `v2_identities` 對齊 actor reference 與身分類型 | 可能把 Account Identity、角色宣告與 Person 語意混在一起 | **必須重新審查** |
| Identity 可有專業類型與驗證狀態 | 可描述帳號身分聲明，但不等於 Person／法律身分 | 可作候選，不得反向凍結 Domain |
| Membership 對 Identity 的 alignment | 與單一路徑概念可能相容 | 留待 Phase 2 |
| 沒有全平台 Person table | 符合第一版不建全平台真人主檔 | 不代表 Phase 1 模型已完整 |

### 13.4 備份心 assets

Migration 001–006、Coverage Engine、Scenario、Backup Assignment、task handoff 與 active v1 schema／frontend 屬備份心資產。它們不因共用 Repository 或照顧語彙而成為 WinWin Core Object Model 的輸入。Phase 1 不重用、修改或重新分類這些資產。

## 14. Accepted decisions and remaining open questions

### Accepted／Accepted with constraints

1. **PD-01 — Accepted：** 方案 C；Care Case 獨立治理，Person 為受限概念，Account Identity 與兩者分離。
2. **PD-02 — Accepted with constraints：** 一個 Care Case 恰好一位 Care Recipient Role；不支援多人 Case，也不主張真人全平台 Case 唯一。
3. **PD-03 — Accepted with constraints：** Care Circle 採權限化投影；不具獨立治理或授權能力，不保存可獨立修改的 member truth；技術投影形式未凍結。
4. **PD-04 — Accepted with constraints：** 可追溯登入帳號可建立 DRAFT，但啟用前不得邀請、分享或建立正式協作內容。
5. **PD-05 — Accepted with constraints：** 正常離開須先完成治理移交；不可預期失效則 fail closed，不自動接任。

上述決策均為產品概念決策，不凍結資料表、Aggregate、FK、Cascade、正式狀態機、API、RPC、交易或恢復演算法。

### Requires legal／field expert confirmation

- 無帳號高齡者由誰提出與確認授權聲明。
- 高齡者本人、家屬、監護／輔助或其他適當授權者發生爭議時的優先順序。
- Account-to-Person linking 所需證據與保存期限。
- 緊急治理恢復與誰能指定新治理者。
- 新治理者資格、證據、指定程序與治理爭議處理。
- 專業資格、服務關係與到期證據的可信來源。

### Deferred

- 全平台 Person resolution。
- Care Case merge／split。
- Care Circle 技術識別碼、cache、view 或 materialized projection。
- DRAFT 狀態機、欄位、activation transaction、放棄／清理與授權遭拒處理。
- 最後治理者失效時的正式狀態、鎖定、RPC 及恢復演算法。
- 完整 Membership、Relationship 與 Grant 模型。
- Question、Action、Assignment、Outcome。
- Database Schema、Migration、API、RLS 與 UI information architecture。

## 15. Decision log

| ID | Decision | Status | Reason |
|---|---|---|---|
| P1-D01 | 採方案 C：Case-independent governance with limited Person concept | **Accepted for Phase 1** | 最符合隱私、無帳號高齡者及帳號刪除持續性；不凍結技術模型 |
| P1-D02 | Person 不作全平台已驗證真人主檔 | **Accepted for Phase 1** | 避免誤連結與過度蒐集 |
| P1-D03 | 禁止跨 Case 自動 Person matching／merge | **Accepted for Phase 1** | 同名或相同屬性不足以確認真人 |
| P1-D04 | Account Identity 與 Person／Care Case 生命週期分離 | **Accepted for Phase 1** | 帳號消失不刪除歷史與 Case |
| P1-D05 | 每個 Care Case 恰好一位 Care Recipient Role | **Accepted with constraints** | 不建立全平台 master record，不支援多人 Case，也不強制真人跨 Case 唯一 |
| P1-D06 | Care Circle 採有效 Membership、Relationship／Service Relationship 與 Grant 結果的權限化投影 | **Accepted with constraints** | 避免第二治理根、雙重真相與全資料群組誤解；技術形式未凍結 |
| P1-D07 | Care Case merge 必須受治理，第一版不實作 | **Accepted principle／Deferred implementation** | 需要高風險身分與歷史衝突處理 |
| P1-D08 | 最後治理者採正常移交與不可預期失效兩階段保護 | **Accepted with constraints** | 正常離開須先有已接受接任者；不可預期失效 fail closed 且不自動接任 |
| P1-D09 | Prototype 授權聲明不等於法律代理／同意已驗證 | **Accepted for Phase 1** | 避免產品過度宣稱 |
| P1-D10 | 可追溯 Account Identity 可建立受限 DRAFT | **Accepted with constraints** | 建立者不因此成為被照顧者、授權者或正式治理者；啟用前禁止正式協作 |

## 16. Gate decision

**PASS — PHASE 1 PRODUCT DECISION REVIEW COMPLETE**

Phase 1 已完成替代模型比較、五項產品決策、十項走查、Domain invariants、隱私風險及既有資產相容性審查。

- **Phase 1 Product Decision Review：PASS。**
- **Phase 1 文件 checkpoint：可以建立。**
- **Phase 2：可以進入 `Invitation → Membership → Relationship／Service Relationship → Grant` 概念設計。**
- **法律／場域專家確認：仍為必要的平行 Gate。**
- **ERD、Database Schema、Migration、SQL、RLS、API 與前端實作：BLOCKED。**

## 17. Explicit next step

下一步應先建立本文件的獨立 checkpoint，再進入 **Phase 2 Core Object Model Design Review：`Invitation → Membership → Relationship／Service Relationship → Grant`**。

Phase 2 僅能處理上述概念的責任、邊界、生命週期與 Golden Scenario 走查；不得擴張至 Question、Action 的完整設計。以下工作仍不得開始：

- 建立 ERD 或資料表。
- 修改 Migration 007／008。
- 撰寫 SQL、RLS 或 API。
- 讓既有 Prototype 反向決定 Domain。
- 將 Phase 1 或 Phase 2 概念直接升格為實作。

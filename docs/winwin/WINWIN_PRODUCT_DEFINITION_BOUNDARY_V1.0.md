# WinWin Product Definition & Boundary v1.0

> **狀態：FROZEN — Product Definition and Boundary Only**

## 1. 文件目的與凍結範圍

本文件固定 WinWin 的產品定義與產品邊界，作為後續 Domain、授權、資料、API 與 UI 設計的產品層級依據。凍結的是「WinWin 為何存在、解決什麼問題，以及不能越過哪些界線」，不是提前固定技術實作。

以下內容為 **FROZEN**：

- WinWin 的產品目的。
- WinWin 解決與明確不解決的問題。
- 核心協作主幹。
- 資訊連續性原則。
- 責任連續性原則。
- 授權邊界與可追溯性原則。
- Invitation、Membership、Grant／Permission 與 Action Assignment 的分離。
- Action 完成與 Question／原始問題解決的分離。
- 最低必要資料原則。
- 不取代醫療、護理、機構法定紀錄、診斷、專業判斷及既有長照行政系統的邊界。
- WinWin 與另一個獨立產品「備份心」的產品界線。

以下內容 **NOT FROZEN**：

- Domain Objects。
- 狀態機細節。
- 權限演算法。
- Database Schema。
- Migration。
- API。
- UI 資訊架構。
- 前端實作。
- 現有 Prototype 的重用、修改或退役決策。

本文件不得被解讀為既有程式、Migration 或 Prototype 物件已成為最終產品模型。

## 2. 產品核心定義

WinWin 是一個以高齡者及其照顧圈為中心的跨角色照顧協作與責任交接平台。

系統讓家屬、家庭照顧者及經適當授權的照服員、護理師、個案管理人員、治療師等角色，依其與高齡者的個案關係、照顧目的、授權範圍及有效期間參與協作。

WinWin 不以保存所有照顧資料為目的，而是保存完成跨角色協作所需的最低必要資訊、來源與責任歷程，讓重要照顧事項可以從發現與記錄，經過適當分享、責任指派、接受與處理，持續追蹤至具有明確結果或後續安排。

WinWin 不取代電子病歷、正式護理紀錄、機構照顧紀錄、醫療診斷、專業判斷或既有長照行政系統；它補足的是家庭、長照服務與不同專業角色之間的資訊傳遞、責任交接及後續追蹤斷點。

## 3. WinWin 解決的問題

不同時間、場域與角色所掌握的照顧資訊容易分散，使下一位參與者難以知道：

- 發生了什麼，以及資訊從何而來。
- 哪些資訊能在目前授權範圍內適當分享。
- 哪個問題仍待回應。
- 哪項工作已指派、是否有人接受，以及處理到哪裡。
- 工作完成後，原始問題是否真的解決，或仍需追蹤、轉介或建立新行動。
- 服務關係失效時，未完成責任如何被安全地重新安排。

WinWin 透過可追溯的資訊與責任歷程，減少跨角色協作中的資訊斷點、責任不明與後續失聯。

## 4. WinWin 明確不解決的問題

WinWin 不以成為下列系統為目標：

- 電子病歷或醫療資訊系統。
- 正式護理紀錄或法定機構照顧紀錄。
- 醫療診斷、治療決策或專業判斷替代工具。
- 既有長照行政、核銷、排班或機構營運系統的替代品。
- 保存所有健康、照顧或個人資料的集中資料庫。
- 以畫面出現、通知送達或技術事件推定使用者已閱讀、理解或採取行動的工具。

## 5. 核心協作主幹

WinWin 固定的產品協作主幹為：

```text
發現
→ 記錄
→ 適當分享
→ 提出問題或處理事項
→ 指派
→ 接受
→ 處理
→ 完成
→ 確認結果與後續狀態
```

這條主幹定義產品需要保存的協作語意，但不凍結每一階段的 Domain Object、狀態名稱、資料表或 UI 呈現。

## 6. Invitation、Membership、Grant 與 Action Assignment 分離

**Invitation ≠ Membership ≠ Grant／Permission ≠ Action Assignment**

- **Invitation：** 向特定對象提出加入個案協作關係的邀請或請求；Invitation 本身不建立 Membership，也不授予任何資料存取或操作權限。
- **Membership：** 保存某人與特定 Care Case 之間的成員關係及其生命週期；只有接受邀請並符合必要條件、且目前狀態有效的 Membership，才構成目前有效的個案關係。
- **Grant／Permission：** 在特定目的、資料範圍、能力與有效期間內，允許某位有效成員進行特定存取或操作；Membership 本身不代表擁有全部資料權限。
- **Action Assignment：** 將一項具體處理事項交由已具有適當有效 Membership 與完整 Grant path 的成員承接；不得藉由 Assignment 自動建立 Membership 或 Grant。

接受個案邀請不代表已接受任何特定工作責任。本文件不凍結 Invitation、Membership、Grant 或 Action Assignment 的正式狀態機、資料表、API 或原子交易實作。

## 7. 資訊連續性

WinWin 必須維持以下產品層級不變規則：

- 資訊已建立 ≠ 已提供或可取得。
- 已提供或可取得 ≠ 已確認接收。
- 已確認接收 ≠ 已閱讀。
- 已閱讀 ≠ 已理解。
- 已理解 ≠ 已接受處理責任。
- 已接受處理責任 ≠ 已採取行動或完成處理。

系統只能依明確發生且可追溯的事件描述狀態。不得因資訊出現在畫面、通知已送出或頁面曾被開啟，就推定使用者已閱讀、理解、接受責任或採取行動。

是否需要「確認接收」以及由誰確認，留待後續 Domain Model 與治理規則決定；本文件不凍結其狀態機或技術偵測方式。

資訊歷程應在最低必要範圍內保留來源、作者或歸屬、時間、授權範圍及必要的版本關係，使後續參與者能理解資訊的脈絡而不過度蒐集資料。

## 8. 責任連續性

WinWin 必須維持以下產品語意：

- 可見／可取得資訊 ≠ 已接受責任。
- 已接受責任 ≠ 正在處理。
- 正在處理 ≠ 已完成。
- Action 已完成 ≠ 原始 Question／問題已解決。

Action 完成後，原始問題的結果或後續狀態仍需由具適當權限的角色明確確認。確認者不得被硬編碼為只有家屬。

結果或後續狀態可包含：

- 已解決。
- 持續追蹤。
- 需要新的 Action。
- 轉介正式醫療或長照服務。
- 其他受治理的後續狀態。

上述詞彙是產品層級結果範圍，不凍結最終狀態機或資料結構。

## 9. 授權邊界與可追溯性

存取權至少受到下列條件共同限制：

- 身分。
- 個案關係。
- 照顧目的。
- 授權範圍。
- 有效期間。

每次存取或操作必須由一條完整且有效的授權路徑單獨成立，不得把不同身分、關係或授權的部分條件拼接成一條權限。

實際授權判斷未在本文件凍結。後續設計仍可納入身分驗證、個案狀態、Membership 狀態、操作能力、個別資訊分享範圍及其他必要條件。

服務到期、撤銷或關係失效後，未來存取應停止；既有資訊的來源、當時身分、責任與操作歷程仍應在適當治理下可追溯。可追溯性不代表失權者仍可查看資料。

## 10. 最低必要資料與專業資訊邊界

WinWin 只保存完成協作所需的最低必要資訊，並優先使用產品層級用語：

- 照顧更新。
- 觀察紀錄。
- 協作摘要。
- 專業人員提供的協作資訊。

現有 Prototype 中的 `Professional Record` 是 Prototype／UI 用語，不代表正式醫療紀錄、護理紀錄或機構法定紀錄，也不代表 WinWin 已取得保存或處理該類正式紀錄的法規與治理基礎。

觀察不得被自動轉譯為診斷；協作摘要不得扭曲來源語意；沒有新資訊也不得被推定為狀況穩定。

## 11. Care Case 與 Care Circle 概念邊界

Care Case 與 Care Circle 不是同一概念。本版本只保留以下概念假設：

- **Care Case** 可能是具有自身生命週期與治理規則的協作空間。
- **Care Circle** 可能是目前有效參與者及其關係的投影或集合。

本文件不凍結 Care Case 或 Care Circle 為資料庫 Entity，也不凍結其欄位、關聯、Aggregate 邊界或生命週期實作。

## 12. Person、Account Identity 與 Care Case 的待設計方向

後續 Core Domain Object Model 應優先比較並分離：

- **Person：** 現實世界中的人。
- **Account Identity：** 可登入 WinWin 的帳號身分。
- **Care Case：** 圍繞特定高齡者形成的協作與治理空間。

高齡者可先被理解為 Person 在 Care Case 中的 Care Recipient Role，而非立即建立全平台真人主檔。第一階段不應自動比對、合併跨個案真人，也不應建立全平台人口資料庫。

Person 可以沒有 Account Identity；帳號被停用或刪除，也不應因此刪除該人的歷史照顧資料。Care Case 不應因單一建立者帳號離開而消失。

以上仍是下一階段的設計問題，不是本文件凍結的 Domain Object Model。

## 13. Golden Scenarios

下列情境用於驗證後續 Domain、授權、資料與 UI 設計是否仍符合凍結的產品定義。

### 13.1 主情境：皮膚異常觀察

照顧角色觀察到皮膚異常
→ 在授權範圍內記錄與分享
→ 建立 Question 或 Action
→ 指派適當參與者
→ 對方明確接受
→ 處理
→ 完成 Action
→ 確認原始問題的結果或後續追蹤。

此流程不得把觀察表述為醫療診斷，也不得因 Action 完成自動宣稱問題已解決。

### 13.2 日常照顧：食量減少

發現高齡者食量減少
→ 記錄最低必要觀察與來源
→ 在授權範圍內讓家屬及相關服務角色知悉
→ 建立追蹤問題或處理事項
→ 明確分配責任
→ 依結果持續追蹤、建立新 Action 或轉介正式服務。

### 13.3 專業交接：移位方式調整

治療師提出調整移位方式的專業協作資訊
→ 在適當目的與範圍內提供給照服員
→ 照服員接收並回報實施情況
→ 保留來源、時間、責任與結果
→ 必要時由有權角色確認後續安排。

WinWin 不取代治療師的正式專業紀錄或機構內部法定紀錄。

### 13.4 授權邊界：專業服務到期

專業服務有效期間結束
→ 未來個案存取停止
→ 歷史作者與當時服務關係仍可追溯
→ 尚未完成的責任需要重新指派
→ 其他仍具有效授權的參與者不受影響。

失權後不得因歷史歸屬而繼續取得個案內容。

## 14. WinWin 與備份心的產品邊界

WinWin 與「備份心」是兩個獨立產品身份。

### WinWin

- 跨角色資訊與責任連續性。
- Care Circle 協作。
- 依授權範圍分享最低必要資訊。
- Question、Action、Assignment 與後續追蹤。

### 備份心

- 照顧者中斷風險。
- 備援覆蓋。
- 中斷情境。
- 24／72 小時／7 天模擬。
- Backup Assignment。
- Coverage Engine。

既有 Coverage Engine、Scenario、Backup Assignment 及相關 v1 資產屬於備份心，不會因為存在於同一 Repository 就自動由 WinWin 繼承。

同樣地，既有 WinWin Prototype 中的 Identity、Invitation、Membership、Grant、Question 與 Action 仍是候選技術／Domain 設計，不會因為已存在於程式碼而被本文件凍結。

目前 Repository 仍是混合狀態並包含備份心 v1 資產。本文件不會將現有備份心 Production、Migration 001–006 或目前 Remote Supabase backend 重新定義為 WinWin 資產，也不修改既有 Project Boundary & Cross-Project Contamination Audit 的發現。

## 15. 下一個授權設計階段

**Next authorized design stage: Core Domain Object Model**

優先決策順序：

1. Person／Account Identity／Care Case。
2. Membership／Relationship／Grant。
3. Care Update／Question／Action／Assignment／Outcome。
4. 使用四個 Golden Scenarios 逐一驗證。
5. 檢視現有 Prototype 與 Migration 007／008，決定重用、修改或退役。
6. Domain 決策完成後，才設計乾淨的 WinWin database。

Outcome 目前只保留為產品概念，不凍結為獨立資料物件。Care Update 可作為共用外框、Observation 可作為其中一種語意類型，但這些替代方案必須留待 Core Domain Object Model 比較後決定。

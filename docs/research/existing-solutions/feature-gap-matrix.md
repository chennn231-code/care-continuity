# 備份心｜現有工具功能與缺口矩陣

最後更新：2026-08-22

> 目的：拆解現有 caregiver contingency / emergency planning 工具與照顧協作 App，確認哪些做法已成熟、哪些可調整採用，以及「備份心」真正需要驗證的差異化。

## 1. 本輪重要修正

本輪搜尋後，不能再簡單宣稱「現有工具只有靜態清單，沒有時間化照顧任務」。

已有國際工具明確包含：

- 日常照顧工作（daily routine / task schedule）
- 工作發生時間
- Backup caregiver
- 可承接工作
- 共享行事曆／任務分派
- 任務接受與完成狀態

因此，「時間 × 照顧工作 × 負責者」本身**不是足以成立的創新點**。

目前較值得繼續驗證的差異，是：

> 在「主要照顧者被假設為不可用」的情境下，系統是否能主動重新檢查每一項必要照顧工作，並辨識哪些工作缺乏「已確認且可執行」的人力或正式服務承接。

這仍只是 **candidate differentiation（候選差異化）**，不可宣稱為已證實創新。

---

## 2. 功能矩陣

| 功能／概念 | 現有證據 | 現有程度 | 備份心判斷 |
|---|---|---|---|
| 被照顧者基本資訊 | 多數 contingency plans | 成熟 | A：直接採用概念，但資料最小化 |
| 醫療／用藥資訊 | Ontario、Family Caregivers BC、Family Carers Ireland 等 | 成熟 | B：只保留交接必要資訊，不做完整健康紀錄 |
| 緊急聯絡人 | 多數 emergency plans | 成熟 | A |
| Backup caregiver | 多數 contingency plans | 成熟 | A/B |
| Backup 是否知情／同意 | 多個實務指南要求事先討論或確認 | 有明確實務支持 | B：轉為可追蹤確認狀態 |
| 日常照顧工作 | Carers Trust Solihull、Family Support Institute BC 等 | 成熟 | A/B |
| 工作發生時間 | Solihull meal times；FSI BC task schedule 明列 timings | 已存在 | A/B；不能當創新點 |
| 白天／夜間照顧 | Solihull 直接詢問 daytime/night care | 已存在 | A/B |
| 個人照顧：如廁、洗澡、穿衣 | Solihull 等 | 已存在 | A/B |
| 替代者可承接哪些工作 | Solihull Emergency & Backup Contacts 要求 tasks they can cover | 已存在 | A/B；不能當創新點 |
| 照顧團隊共享／分工 | ianacare、Carely 類工具 | 已存在 | B |
| 任務指定日期與時間 | ianacare | 已存在 | B |
| 任務接受／確認 | ianacare 支援 supporter 接受 help request | 已存在 | B；需區分「平常任務接受」與「備援承諾」 |
| 未指派任務 | 專業 home-care scheduling 系統已有 unassigned task 概念 | 已存在 | 參考，不宣稱新穎 |
| 照顧工作時間軸 | 多種 care scheduling / task tools 已存在 | 已存在 | 只作 UX 手段，不作創新宣稱 |
| 24h／72h／7d caregiver absence simulation | 本輪尚未找到完全相同家庭照顧產品 | 未確認 | C/D：繼續查證 |
| 模擬移除主要照顧者後，自動重新檢查 coverage | 本輪尚未找到完全相同家庭照顧工具 | 未確認 | C/D：目前最重要候選差異 |
| 自動標示「必要工作無已確認承接者」 | 本輪尚未找到完全相同家庭照顧工具 | 未確認 | C/D |
| 正式長照服務作為 backup coverage | 現有 care plans 會記錄 professionals/services，但是否做情境 coverage 計算尚未確認 | 部分存在 | B/C：台灣情境值得深入 |
| 服務「可能可用」與「已確認可承接」分級 | 尚未找到一致標準化數位做法 | 待查 | B/C |

A＝成熟做法可直接採用概念；B＝有依據但需依備份心情境調整；C＝Prototype 自行提出候選；D＝尚待驗證。

---

## 3. 重要現有工具拆解

### 3.1 Carers Trust Solihull — Contingency Plan Builder

現行線上 Builder 已經非常接近「結構化照顧交接」，涵蓋：

- Carer details
- Cared-for details
- Health & treatment
- Care professionals & services
- Daily routine
- Nutrition & hydration
- Allergies & preferences
- Personal care
- Emergency / backup contacts
- Backup contact 可承接的 tasks
- 早餐、午餐、晚餐、點心的 typical time
- 白天與夜間通常提供哪些照顧
- 如廁、洗澡、穿脫衣等個人照顧

**對備份心的影響：**

不能宣稱「把照顧工作與時間整理出來」本身是創新。更合理的方向是研究如何從既有 care plan 資料進一步做 contingency coverage analysis。

來源：
https://solihullcarers.org/carers-contingency-plan/

### 3.2 Family Support Institute of BC — Creating a Care Plan

明確提出：

- Care Team Members
- Medical Information
- Emergency Care Instructions
- Care Schedule
- Task Schedule
- daily / weekly tasks
- timings
- 給 backup caregivers 的清楚 instructions

**對備份心的影響：**

「Task + Time + Backup instruction」已有成熟實務做法，可以參考資訊架構，但不應複製不必要欄位（例如財務密碼等高度敏感資訊）。

來源：
https://familysupportbc.com/toolkits/creating-a-care-plan/

### 3.3 ianacare

同行評審研究對 ianacare 的描述顯示，使用者可：

- 建立 support team
- 針對特定 caregiving task 求助
- 選擇需要協助的人
- 指定地點、日期與時間
- 支援者收到通知後接受任務
- 團隊可看到誰協助哪些工作

**對備份心的影響：**

「任務分工 + 時間 + 接受」已經存在於家庭照顧協作 App。

因此備份心不應做成另一個單純的家庭照顧任務分派 App。

學術來源：Ozluk et al., Journal of Medical Internet Research (2022), caregiver app evaluation.

### 3.4 Ontario Caregiver Organization

提供 Contingency Planning Toolkit 與 Emergency Planning Toolkit，協助照顧者整理 medical history、emergency contacts、food preferences 等重要資訊。

**對備份心的影響：**

支持 contingency planning 的必要性，但備份心應避免只把紙本 emergency plan 電子化。

來源：
https://ontariocaregiver.ca/managing-care/toolkits/

---

## 4. 華語／台灣鄰近市場與現有 App

### 4.1 照護日誌 Care Logger（2026）

Google Play 現行產品描述包含：

- 家庭照護圈
- 照護任務與班表共享
- 任務指派
- 交接紀錄
- 照護時間軸
- 用藥、就醫、過敏、緊急聯絡人
- 家庭成員同步

**判斷：**

這是非常重要的近端競品。它證明「家庭照顧任務＋班表＋交接＋資訊共享」在華語市場已經存在。

備份心若只做上述功能，差異不足。

來源：Google Play，照護日誌 - Care Logger，更新日期 2026-07-28。

### 4.2 AngelCare 宅天使（香港）

產品描述包含主要照顧者分派覆診、生命徵象、採購等任務給其他家人／照顧者，並處理家庭資訊共享與任務分工。

**判斷：**

再次支持「家庭任務分工」不是備份心的核心創新。

來源：
https://angelcare.dnow.hk/

---

## 5. 台灣制度證據

衛福部《家庭照顧者支持服務據點專業人員工作手冊》指出，長照家庭可能混合使用政府補助服務、外籍看護與家人照顧，並提出依不同失能階段建立「階段性照顧安排」及在不同照顧模式中彈性轉換的概念。

**對備份心的啟示：**

備援不能只等同「找另一個家人」。家庭實際 coverage model 應允許：

```text
家人
+ 外籍家庭看護工
+ 居家服務
+ 社區式服務
+ 喘息
+ 其他正式／合法支持
```

但各服務是否能在特定事件、日期與時間實際承接，仍需確認資格、服務範圍、時段與量能。

來源：衛生福利部《家庭照顧者支持服務據點專業人員工作手冊》（2025 現行資料）。

---

## 6. 目前較精準的產品缺口假說

### 不再使用的說法

❌「目前沒有工具把照顧工作排成時間軸。」

❌「目前沒有工具讓家人分配照顧工作。」

❌「目前沒有工具記錄 backup caregiver 可以做什麼。」

以上都已找到反例。

### 現階段可研究的說法

> 現有 contingency planning 工具已能整理照顧資訊、日常工作、時間與 backup caregiver；家庭協作 App 也能進行任務分派與接受。然而，本輪尚未確認有家庭長照工具會在假設主要照顧者暫時或長期不可用後，依必要照顧工作、時間、替代者能力／確認狀態及正式服務承接狀態，自動辨識尚未被覆蓋的照顧工作。

這只是**待驗證的產品缺口假說**。

---

## 7. 備份心核心邏輯候選 v2

```text
建立「平常如何照顧」的 baseline
↓
建立必要照顧工作與時段
↓
建立目前承接者
↓
建立替代人力／服務及可承接範圍
↓
確認哪些備援真的已同意／可用
↓
選擇中斷情境
例如：主要照顧者明天開始無法照顧 24 小時
↓
暫時從 coverage 中移除主要照顧者
↓
重新檢查每項必要工作
↓
已覆蓋 / 待確認 / 無承接
↓
將「待確認」與「無承接」轉成備援待辦
```

### 為什麼比單純任務排程更有意義

一般任務 App 回答：

> 今天誰要做什麼？

備份心希望回答：

> 如果原本最重要的那個人明天不能做了，哪些事情會沒有人接？

這是目前最值得繼續驗證的產品定位差異。

---

## 8. 下一步研究

### Priority 1 — 驗證核心差異是否真的存在

繼續搜尋：

- caregiver absence simulation
- care coverage analysis
- backup caregiver coverage
- contingency care scheduling
- care task coverage gaps
- emergency caregiver replacement planning
- caregiver unavailable scenario planning

並納入專業 home-care scheduling 系統作為鄰近領域比較，避免把其他產業已成熟的方法誤認為全新概念。

### Priority 2 — 定義「必要照顧工作」

如果核心差異仍成立，下一步不能自己列早餐、洗澡、如廁就算完成。

需要從：

- ADL（Activities of Daily Living，日常生活活動）
- IADL（Instrumental Activities of Daily Living，工具性日常生活活動）
- 台灣 CMS / 長照需要評估與服務項目
- caregiver emergency plans
- 實際家庭照顧工作研究

交叉建立最小必要照顧工作分類。

### Priority 3 — 區分三種 coverage 狀態

研究是否適合使用：

1. **已確認承接**
2. **可能承接／待確認**
3. **目前無承接**

並避免用未經驗證的風險分數取代具體狀態。

---

## 9. 研究紀律

- 找到反例時必須修改原本的創新主張。
- 「別人沒用這個名稱」不代表功能不存在。
- UI 不同不等於研究創新。
- 任務排程、共享行事曆、家庭分工本身不作為主要創新。
- 真正差異需能對應「降低照顧中斷風險／提升備援能力」。
- 在完整競品與文獻查證前，一律使用「候選差異」「產品缺口假說」，不使用「首創」。

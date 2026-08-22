# 備份心｜Product Data Model v1.1 — Low-Fi Baseline

> 本文件描述「備份心」用於家庭照顧備援盤點與情境模擬的產品資料模型。
>
> 此模型不是臨床量表、醫療診斷模型或正式長照風險評估工具。

## 1. 核心原則

備份心的底層邏輯不是「有沒有第二照顧者」，而是：

> 照顧任務 × 協助需求 × 現有來源 × 備援來源 × 確認狀態 × 時間覆蓋

系統只根據使用者已提供、已確認或已記錄的資料整理照顧安排，不替家庭推測誰一定能接手，也不自動宣稱某人具備特定照護能力。

---

## 2. CareRecipient｜被照顧者

- `recipient_id`: UUID
- `nickname`: String
- `relationship`: Enum / String

原則：MVP 只收集完成備援盤點所需的最低限度資料，不要求身分證、完整生日、病歷或 CMS 等級。

---

## 3. CareTask｜照顧任務

- `task_id`: UUID
- `recipient_id`: Ref -> CareRecipient
- `task_category`: Enum
  - `EATING`
  - `MEAL_PREP`
  - `MEDICATION`
  - `TOILETING`
  - `TRANSFER`
  - `BATHING`
  - `DRESSING`
  - `OUTING_MEDICAL`
  - `CUSTOM`
- `requirement_stage`: Enum
  - `CURRENT_NEED`
  - `PREPARED_IN_ADVANCE`

`CURRENT_NEED` 表示目前已需要他人協助；`PREPARED_IN_ADVANCE` 表示目前多數可自行處理，但家庭希望先做預防性準備。

---

## 4. TaskRequirement｜協助方式與可接受支援模式

- `task_id`: Ref -> CareTask
- `assistance_type`: Enum / task-specific enum
- `acceptable_support_modes`: Array<Enum>
  - `ON_SITE`
  - `REMOTE_COORDINATION`
  - `DELIVERY`
  - `TRANSPORT`
  - 其他後續經研究確認的模式

`assistance_type` 描述「這件事平常怎麼幫」，避免使用 `assistance_level` 或失能等級語言。

例：

```text
服藥：REMINDER / MEDICATION_PREPARATION / DIRECT_ASSISTANCE
如廁：STANDBY / VERBAL_GUIDANCE / PHYSICAL_ASSISTANCE
```

---

## 5. TaskOccurrence｜任務發生時間與頻率

- `occurrence_id`: UUID
- `task_id`: Ref -> CareTask
- `pattern`: Enum
  - `DAILY_FIXED_TIME`
  - `DAILY_FLEXIBLE_TIME`
  - `WEEKLY_SCHEDULED`
  - `DATE_SPECIFIC`
  - `AS_NEEDED`
- `time_slots`: Array<Object>
  - 可包含 `day_of_week`
  - `time_block`
  - `exact_time`
  - `specific_date`
- `is_timeline_rendered`: Boolean / derived

重要規則：`AS_NEEDED` 不應自動渲染到常態時間軸，以避免「就醫」等偶發事項被錯誤當成每天固定缺口。

---

## 6. CareSource｜照顧與支援來源

- `source_id`: UUID
- `source_name`: String
- `source_type`: Enum
  - `SELF_OPERATOR`
  - `INFORMAL_FAMILY`
  - `FORMAL_SERVICE`
- `support_modes_available`: Array<Enum>
  - `ON_SITE`
  - `REMOTE_COORDINATION`
  - 其他可用支援模式

原則：`support_modes_available` 只描述目前可提供的支援方式，不代表 App 認證該人具備特定照護技術。

若為正式服務，另記錄：

- `formal_service_schedule`
- `service_task_scope`
- `service_certainty_note`

正式服務只可覆蓋實際已記錄的服務內容與時段，不得因「有居服／有日照」就推定其他任務也已被承接。

---

## 7. CoverageAssignment｜任務承接與備援配對

- `assignment_id`: UUID
- `task_id`: Ref -> CareTask
- `source_id`: Ref -> CareSource
- `assignment_role`: Enum
  - `PRIMARY_CURRENT`
  - `BACKUP`
- `confirmation_status`: Enum（僅 BACKUP）
  - `POSSIBLE`
  - `CONFIRMED`
  - `CONFIRMED_WITH_LIMITS`
- `limitations`: Array<String / structured fields>

重要原則：

- `POSSIBLE` = 使用者認為對方可能可以，但尚未確認。
- `CONFIRMED` = 使用者手動標記已談過並同意，不等於「本人已驗證」。
- `CONFIRMED_WITH_LIMITS` = 已談過但有限制，例如特定時段、限短時間、距離限制、僅遠距協調。

「目前沒有備援」不使用 `confirmation_status = NONE` 表示，而是沒有 BACKUP assignment。

若需要記錄使用者已明確完成盤點且確認目前沒有備援，可另記：

- `backup_review_status`: `NO_BACKUP_IDENTIFIED`

以區分「尚未回答」與「已確認目前沒有」。

---

## 8. Scenario｜「如果」情境

- `scenario_id`: UUID
- `unavailable_source_id`: Ref -> CareSource
- `start_time`: Timestamp / Nullable
- `end_time`: Timestamp / Nullable
- `duration_type`: Enum
  - `HOURS`
  - `ONE_DAY`
  - `THREE_DAYS`
  - `SEVEN_DAYS`
  - `CUSTOM`
  - `UNKNOWN_DURATION`

MVP 首次流程可預設主要情境是「主要照顧者／操作者暫時無法提供原本支援」，但底層架構保留未來指定任一 CareSource 暫時不可用的能力。

---

## 9. Coverage Result｜衍生計算結果

Coverage Result 不一定永久寫入資料庫，可由以下資料運算產生：

```text
Scenario
× TaskOccurrence
× TaskRequirement
× CoverageAssignment
× CareSource available support modes
× time validity / limitations
= Coverage Result
```

建議使用者端三態：

- `COVERED` → 已經有安排
- `NEEDS_CONFIRMATION` → 還需要確認
- `NEEDS_PREPARATION` → 還需要準備

不得把結果轉換成未經驗證的風險分數或高／中／低風險等級。

---

## 10. ActionItem｜產品行動層資料

當使用者在結果頁將項目加入待辦時建立：

- `action_id`: UUID
- `task_id`: Ref -> CareTask
- `scenario_id`: Ref -> Scenario / Optional
- `action_type`: Enum
  - `CONFIRM_BACKUP`
  - `PREPARE_BACKUP`
- `status`: Enum
  - `OPEN`
  - `COMPLETED`
- `created_at`: Timestamp

此層支援未來 Dashboard 的「待確認」與「待準備」清單。

---

## 11. 與 Screen 04–09 對應

| Screen | 寫入／讀取資料 |
|---|---|
| Screen 04 | CareTask |
| Screen 05 | TaskRequirement + TaskOccurrence |
| Screen 06 | CareSource + PRIMARY CoverageAssignment |
| Screen 07 | BACKUP CoverageAssignment + backup review status |
| Screen 08 | Scenario |
| Screen 09 | Coverage Result；使用者加入待辦時建立 ActionItem |

---

## 12. 模型界線

此模型的用途是：

> 支援家庭照顧備援盤點、照顧安排整理與「如果主要照顧來源暫時不可用」的情境模擬。

此模型不是：

- ADL / IADL 評分工具
- CMS 評估替代工具
- 醫療診斷模型
- 經驗證的照顧中斷風險量表
- 長照資格判定工具

Low-Fi 與使用者測試期間若發現資料結構不足，本 Baseline 仍可版本化修正。
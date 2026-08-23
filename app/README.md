# App

「備份心」MVP 前端與 Coverage Engine。

## 已完成的前端 Gate

- React + Vite + TypeScript
- Supabase Email/Password Authentication
- 註冊、Email 確認狀態、登入、登出
- Session persistence 與 protected route
- Coverage Engine 與既有 Vitest 測試維持獨立
- 建立第一位被照顧者
- 照顧任務 CREATE／READ／UPDATE
- 照顧來源 CREATE／READ／UPDATE，以及主要照顧者本人的 `user_id` linkage
- 目前照顧分工 CREATE／READ／UPDATE／DELETE
- 備援安排 CREATE／READ／UPDATE／DELETE，並區分 `POSSIBLE`、`CONFIRMED` 與 `CONFIRMED_WITH_LIMITS`
- 24 小時、72 小時與 7 天主要照顧者中斷模擬
- Exact-time Care Gap 時間軸與非固定需求分區

Care Source 名單本身不代表已同意、有能力、有時間或已形成備援；只有符合時間與協助形式的已確認安排會形成 coverage。Scenario 仍在前端即時計算，尚未寫入 evaluation snapshot。

## Exact-time Coverage Engine contract

- 新的 Task／Assignment runtime contract 使用 `scheduled_times`（`HH:mm`），不再寫入 `time_blocks`、`MORNING` 或 `EVENING`。
- 所有固定時間在 MVP 中以 `Asia/Taipei` 解讀；目前不支援跨時區家庭。
- Scenario interval 採半開區間 `[valid_from, valid_until)`。
- 多筆符合的 `REGULAR` assignments 會保留穩定、去重的 `source_ids`；`source_id` 暫留以相容舊 consumer。
- 多筆符合的 confirmed backup assignments 同樣回傳穩定、去重的 `source_ids`。
- unavailable source 不得再次被 current／confirmed／possible backup 視為有效來源。
- `OCCASIONAL` candidate 必須同時符合時間與 support mode。
- `AS_NEEDED` 沒有 `scheduled_at`，放在 `unscheduled_considerations`，不納入固定時間 summary。

`supabase/seed.sql` 仍是已凍結、不可執行的 legacy fixture，保留舊 `time_blocks` vocabulary 作歷史參考；它不是目前 runtime contract。

## Gate 06 primary-caregiver interruption simulation

- `/scenario` 只模擬 self-linked Care Source 暫時 unavailable，且找不到本人來源時不猜測替代 UUID。
- 支援 24 小時、72 小時與 7 天，採 `Asia/Taipei` 及 `[valid_from, valid_until)`。
- DB rows 必須先通過 `scenarioContract.ts` adapter validation，React component 不直接把 Supabase rows 傳給 Engine。
- 結果只陳述現況安排、待確認與無可確認安排，不產生風險分數。
- `AS_NEEDED` 顯示在非固定需求區塊，不混入 scheduled timeline。
- Scenario 只在瀏覽器記憶體即時計算，不寫入 `care_scenarios` 或 `coverage_evaluations`；`backup_assignments` 由獨立的備援設定頁面管理。

## Supabase 安全基線

- Canonical baseline 與 Migration 002–005 已同步至遠端 migration history。
- Migration 002：single-owner ownership 與跨個案完整性。
- Migration 003：Auth profile provisioning 與 email lifecycle。
- Migration 004：9 張核心表 RLS 與 34 個 policies。
- Migration 005：Backup Assignment canonical semantics。
- 遠端 A/B RLS isolation、Auth lifecycle 與完整 cascade cleanup 已通過。
- `supabase/seed.sql` 維持 frozen，不執行。

## 本機設定

複製 `.env.example` 為 `.env.local`，填入 Supabase 的公開前端設定：

```text
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

前端不得使用 service-role／secret key 或資料庫密碼。

## 指令

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

開發伺服器固定使用 `http://localhost:3000`。

# Project Status — Offline Delivery Production Deployment

**日期：** 2026-08-23  
**狀態：** Production 已部署，Offline Delivery E2E 尚未執行

## 可驗證基線

- Repository branch：`main`
- Offline Delivery feature commit：`4d143b57512e1e8715ae1d67806c77f7a1770b33`
- Commit message：`feat: add offline handoff print workflow`
- 稽核當下 Local `main` 與 `origin/main` 一致
- Vercel project：`chen-b5e7/care-continuity`
- Connected repository：`chennn231-code/care-continuity`
- Production URL：<https://care-continuity-eta.vercel.app>
- Vercel Production deployment：Ready／Current
- 稽核當下 Production source：`main` commit `4d143b5`
- Root Directory：`app`
- Framework：Vite
- Build output：`dist`

## 本次部署事實

GitHub App 僅授權 `chennn231-code/care-continuity` 後，Vercel project 已連接該 repository。

第一次以 Git source 建立相同 commit 的 Production deployment 時，Vercel 使用 repository 根目錄，build log 顯示 `vite: command not found`，該次 deployment 為 Error。將 Root Directory 校正為既定的 `app` 後，以同一 commit 重新部署成功，duration 11 秒，production domain 指向新 deployment。

這個錯誤 deployment 仍可能出現在 Vercel 歷史中；它不是目前 Current production。

## Production smoke audit

已確認：

- `/handoffs/print` 存在於 production JavaScript bundle
- 未登入直接進入 `/handoffs/print` 會由 React protected route 導向 `/auth`
- Deep-link 沒有 Vercel 404
- Production bundle 正常載入，頁面標題為「備份心」
- Production CSS 含 `@media print`
- Production CSS 含 mobile breakpoint `@media(max-width:760px)`
- Production bundle asset：`index-DblgMeR_.js`
- Production stylesheet asset：`index-BOSxUEEM.css`

未宣稱已驗證：

- 有真實 Task／Backup／Handoff 資料的 Offline Delivery user flow
- 390 × 844 production viewport 的真實資料互動
- OS Browser Print Preview 的分頁、黑白、大字與長文字呈現
- Preview／`window.print()` 前後的 remote business-row no-write comparison

## 本機驗證

2026-08-23 重新執行：

- TypeScript typecheck：通過
- Vitest：14 files，167/167 tests 通過
- Production build：通過
- Build warning：主 JavaScript chunk 約 563 kB，超過 Vite 500 kB 提示門檻；目前不是 blocking error，但後續可評估 route-level code splitting

測試 `scenarioHandoffPresentation.test.ts` 會刻意模擬 handoff query failure，因此測試期間出現 `Unable to load scenario handoff data Error: offline` 的 stderr；該測試本身通過，這是預期的 failure-isolation fixture，不是測試失敗。

## 下一次開始位置

下一次從 **Handoff Offline Delivery Production E2E Gate** 繼續，不先新增功能。

執行前需要再次取得 action-time confirmation，才能建立一次性 confirmed Auth identity。Admin API 只建立 identity；Receiver、Tasks、Care Sources、Backup Assignments 與 Handoffs 必須從 Production React UI，以 authenticated session + RLS 建立。

最低驗證範圍：

1. 一位 Receiver、一位 self-linked source、兩位非本人且可無帳號的 sources
2. 至少四個 Tasks，涵蓋 MEDICATION、MEAL、BATHING、MEDICAL／ONCE
3. `POSSIBLE`、`CONFIRMED`、`CONFIRMED_WITH_LIMITS` backups
4. `READY_TO_SHARE`、`NEEDS_DETAILS`、`NOT_PREPARED` handoff states
5. 多 Task package、notes include/exclude、資料最小化與 freshness timestamps
6. 實際 Browser Print Preview 人工確認
7. Preview／print 前後 business data 完全一致
8. 測試完成後保留資料，另行取得 cleanup 授權

## 已知限制與待處理事項

- Offline Delivery Gate 目前只能判定為「本機實作與 Production deployment 通過」，不能判定完整 E2E 通過
- Production 390px 真實資料 smoke test 尚未完成
- OS print dialog 無法由目前自動化可靠讀取，必須保留人工確認
- 紙本／PDF 不會自動更新，使用前需確認是否仍為目前版本
- 沒有 Delivery／Received／Read／Understood tracking，且不應由列印行為推定這些狀態
- JavaScript bundle size 有非阻擋警告，若後續功能持續增加應優先考慮 lazy routes／code splitting
- Scenario persistence、Risk score、AI、通知、分享 token、備援者帳號均未納入目前 MVP

## 未變更範圍

本次 Git/Vercel 作業沒有修改 Supabase Schema、Migration、RLS、Policies、Auth settings、Coverage Engine 或遠端 business data，也沒有建立測試帳號。

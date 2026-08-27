# WinWin（高齡支持照顧系統）

> 讓不同時間、不同照顧者留下的變化，可以被下一位理解、接受並追蹤到完成

WinWin 以長者／個案為中心，連結家屬與專業照護團隊，在受控權限下支援照顧更新、交接與行動協作，並保留作者、時間與責任狀態，降低跨人員、跨班次與跨服務的資訊斷裂。

目前主要展示入口為 `/v2/prototype`；啟動本機前端後，開啟根路徑 `/` 也會導向此入口。

本 Repository 另行保存「備份心」舊專題／歷史原型及其研究與 regression assets。備份心不是 WinWin 的舊名稱或產品定義來源，也不界定 WinWin 現行產品邊界；其 Coverage、Scenario、Backup 與 Offline Handoff 僅按歷史脈絡保留，相關舊版 routes 不是目前 WinWin 主流程。

## 產品現況

| 範圍 | 狀態 | 說明 |
|---|---|---|
| 備份心 Historical Baseline | 保留舊版 routes 與歷史資產 | 聚焦照顧中斷、備援安排、Coverage、Scenario 與 Task Handoff；不作為現行入口 |
| WinWin Frontend Prototype | 開發中 | 聚焦跨角色照顧協作、來源、問題、責任狀態與服務期間權限；主要入口為 `/v2/prototype` |
| 目前工作分支 | `codex/v2-frontend-prototype` | 包含 v2 文件、Migration 007 release candidate 與純前端 Prototype |
| v2 Production | 尚未上線 | Prototype 與本機資料庫驗證不代表遠端或 Production 已具備 v2 能力 |
| `main` | 尚未包含本分支最新 WinWin 內容 | merge 與 Production deployment 必須經獨立審查；Repository 與 package 技術名稱暫時保留 |

目前狀態應區分為：

- **已完成：** v2 治理、Domain／Logical Model、Migration 007 本機驗證，以及純前端身分、照顧協作、Invitation、Multi-case Workspace 與 Professional Care Record Prototype。
- **已完成前端展示、尚未接後端：** Invitation & Multi-case Workspace 及護理師專業照顧紀錄流程已完成 in-memory clickable slice 與 Prototype 範圍的 access guard。
- **尚未部署：** Migration 007 remote apply、正式專業身分驗證、正式邀請後端補充契約及 v2 Production routes。

## WinWin v2 核心問題

家庭與專業照顧人員可能在不同時間、不同服務場域留下資訊，造成：

- 照顧變化散落在不同人、訊息或紀錄中。
- 後續人員重複詢問，或不知道前一次服務發現了什麼。
- 回報、問題、負責人、接受、處理與完成被混成同一種「已確認」。
- 專業服務結束後，原成員仍可能保有不應持續的個案存取。
- 為了交接而過度分享完整紀錄，超出當次照顧所需範圍。

WinWin v2 嘗試把不同參與者留下的照顧變化，轉成下一位看得懂、有人接受、可以追蹤到完成的交接流程；權限模型是必要的治理機制，但不能取代主要使用流程，也不應增加第一線人員大量重複登打。

## v2 核心原則

- 以長者個案為中心，不把個案永久綁定單一帳號或機構。
- 帳號身分不等於身分已驗證，也不等於個案權限。
- Invitation 是加入提議，不等於 Case Membership。
- Membership 表示個案關係，不等於可以查看所有內容。
- 每次操作必須由一條完整 grant path 單獨通過；不同角色的能力、目的、範圍與期限不得拼接。
- 協作管理者可以管理治理事項，但不因此取得所有敏感內容。
- 個案管理員／A 單位個管員是專業職稱，不等於 WinWin 協作管理者。
- 回報不等於確認。
- 指派不等於接受；接受不等於開始處理。
- 工作完成不等於相關問題已解決。
- 已發布內容採追加式更正，保留原作者、來源與版本歷程。
- 個案生命週期不依附單一帳號；刪除帳號不得直接刪除整個個案 Graph。
- 專業存取必須受服務目的、資料範圍與有效期間限制。
- 摘要、列印或其他衍生輸出不得突破原始資料權限。

## 已完成的 v2 Frontend Prototype

目前 Repository 已實作以下純前端、可點擊的 v2 展示：

- WinWin v2 品牌、Prototype Shell 與虛構資料提示。
- 主要身分註冊流程：長者本人、家屬／家庭照顧者、專業照顧人員。
- 專業職類選擇與未驗證提示。
- `DECLARED`、`PENDING_VERIFICATION`、`VERIFIED`、`REJECTED`、`EXPIRED` 身分驗證狀態展示。
- 「我的身分」、主要身分與新增第二身分概念。
- 虛構個案列表與個案首頁。
- 上次查看後的新變化呈現。
- 照顧變化時間軸與來源資訊。
- Observation、Arrangement 與 Question 的畫面語意。
- Action 的等待接受、已接受、處理中與已完成流程。
- Question 必須獨立標示解決，不會因 Action 完成而自動解決。
- 明確分離的 Prototype 權限預覽工具。
- 協作管理者建立虛構邀請，以及連結、QR Code 與一次性代碼的共同 credential 展示。
- 未登入邀請門檻、最低必要預覽、接受、拒絕、撤回、逾期與重送流程。
- 專業身分等待驗證，以及服務開始日前不顯示個案內容。
- 「我的個案」多個案工作區、安全搜尋與只有本人可見的私人標籤。
- 到期或撤銷後從可見集合與私人標籤移除，未完成事項標示為需要重新指派。
- 集中式 access selector 與共用個案 route guard；此 guard 僅供 Prototype 流程展示。
- 護理師展示情境的專業照顧紀錄長表單，包含服務資訊、客觀觀察、評估、處置、後續追蹤與分享範圍。
- 發布前家屬分享預覽，以及發布後的家屬最小必要資訊投影。
- 已發布專業紀錄不可直接覆寫；更正以新版本追加，並保留原作者、時間與版本關係。
- in-memory state；重新整理後重置。

### Prototype 限制

- 所有 v2 展示資料均為虛構資料，不使用真實照顧資料。
- 不收集真實證照、身分證、機構文件或法律授權文件。
- v2 Frontend Prototype 不連線 Supabase。
- 不使用 `localStorage`、IndexedDB 或正式後端持久化。
- 專業照顧紀錄不提供假的自動儲存；未發布內容離開頁面可能遺失。
- 畫面中的角色、驗證、Membership 與 Grant 都是流程展示，不代表正式權限 enforcement。
- 專業照顧紀錄目前只完成護理師展示情境，不代表其他專業職類已有正式紀錄模板。
- 專業照顧紀錄 Prototype 不是正式病歷、護理紀錄或機構法定紀錄。
- 使用者聲明授權不代表已完成身分代理、意思能力、電子簽章或法律效力驗證。
- Prototype 不代表已符合所有個資、醫療或長照法規。

## Professional Care Record Frontend Prototype 狀態

**狀態：in-memory Frontend Prototype implemented／正式持久化與後端權限尚未完成。**

目前已在護理師虛構展示情境中完成：

- 從「我的個案」進入有效個案並建立專業照顧紀錄。
- 明確顯示 acting role、服務目的與分享範圍。
- 填寫客觀觀察、評估、實際處置與後續追蹤。
- 發布前預覽家屬會看到與不會看到的資訊類型，不顯示隱藏內容數量。
- 發布後保留作者、發生時間、紀錄時間、身分、目的與分享範圍。
- 家屬只看到獲授權且不改寫原意的最小投影；專業限定內容不會出現在家屬畫面。
- 已發布內容只能追加更正，原始版本不會被覆寫或消失。
- 所有專業紀錄 routes 共用既有個案 access guard。

此流程仍只使用 React in-memory 虛構資料，重新整理後重置；未連接 Supabase，也未完成正式自動儲存、資料持久化、後端內容授權或 Production 部署。前端 guard 只用於 Prototype 流程展示，正式安全邊界仍須由後端授權與 RLS 強制執行。

前端測試基線以每次 checkpoint 實際執行結果為準；測試通過不代表正式病歷、機構紀錄、法律授權或 Production 能力已驗證。

## Invitation & Multi-case Workspace 狀態

**狀態：Design reviewed／in-memory Frontend Prototype implemented。**

目前已在純前端 Prototype 中展示：

- 協作管理者或具有完整邀請 grant path 的成員發出邀請。
- 專屬連結、QR Code 與一次性代碼共用同一個高熵 Invitation credential。
- 開啟連結或掃描 QR Code 不授予權限；受邀者仍需登入自己的帳號並完成必要核對。
- `PENDING_VERIFICATION` 是身分驗證狀態，不是 Invitation 狀態。
- 接受邀請不一定立即取得內容權限；服務開始日在未來時只能等待服務開始。
- 邀請是否逾期依 database clock 衍生判斷，不依賴背景排程改寫狀態。
- 私人資料夾與標籤只負責個人整理，不是協作群組，也不產生或延長權限。
- 失去個案權限後，不顯示空白卡、舊名稱、隱藏個案數量或其他可推測資訊。

邀請拒絕、安全預覽、重送、專業驗證等待、私人分類與 access guard 目前均為 in-memory Prototype 模擬。前端 guard 不是正式安全邊界；正式撤銷、失權與資料隔離仍須由 Supabase RLS 與後端授權共同強制執行，不得宣稱已由 Migration 007、Remote Supabase 或 Production 支援。

## Migration 007 Access Foundation

正式 migration candidate 已存在：

[`supabase/migrations/20260824220000_v2_access_foundation.sql`](supabase/migrations/20260824220000_v2_access_foundation.sql)

Repository 可確認的狀態：

- Migration 007 Access Foundation 已建立正式 migration 檔案。
- 已從 Migration 001 開始執行 fresh isolated local verification。
- Local verification：71/71 PASS，0 FAIL／0 SKIP／0 BLOCKED。
- Repository 已包含可重跑的 migration verification harness。
- Migration 007 尚未 apply 至 Remote Supabase。
- Production Remote Apply Gate 仍為 `BLOCKED`。
- 不得宣稱 Production 已存在 v2 tables、RLS policies 或 RPC。

本機驗證不等於遠端驗證。Remote migration history、Production Auth settings、備份／還原能力與 apply 後 smoke test 仍須在另行授權的 Gate 中確認。

## v1 的保留方式

- Repository 繼續保留「備份心」舊專題／歷史原型及其 regression baseline。
- v1 Coverage Engine、Scenario、Backup、Task Handoff、首頁 freshness reminder 與 Offline Handoff 保留為歷史研究及 regression baseline。
- v2 採 additive evolution，不改寫 Migration 001–006。
- v1 與 v2 可以在研究與 Prototype 階段並存。
- Coverage／Scenario 是否回接 v2 尚未決定，不能視為 v2 第一階段已完成能力。
- 歷史文件中的「備份心」名稱保留其時間與研究脈絡，不進行無差別全文替換。

## 技術棧

版本依 [`app/package.json`](app/package.json) 的目前宣告：

| 技術 | 版本／用途 |
|---|---|
| React | `^19.1.1` |
| React DOM | `^19.1.1` |
| React Router DOM | `^7.9.1` |
| TypeScript | `^5.6.3` |
| Vite | `^7.1.7` |
| Vitest | `^2.1.8` |
| Supabase JavaScript SDK | `^2.57.4` |
| PostgreSQL / Supabase | v1 與 v2 migration、RLS、RPC 基礎 |
| Vercel | 現有 v1 SPA deployment baseline；v2 尚未宣稱已部署 |

Repository 沒有導入 UI component library；v2 Prototype 沿用 React、TypeScript、現有 CSS 與 responsive patterns。

## 本機操作

以下指令從 Repository 根目錄執行，不需要真實照顧資料：

```bash
cd app
npm install
npm run dev
```

預設 Vite 顯示的本機網址啟動後，開啟：

```text
/v2/prototype
```

驗證指令：

```bash
cd app
npm test
npm run typecheck
npm run build
```

目前 v2 Frontend Prototype 使用記憶體狀態；重新整理頁面會重置展示資料。

## Repository 結構

```text
care-continuity/
├── README.md
├── app/                         # React + Vite；v1 App 與隔離的 v2 Prototype
├── docs/
│   ├── architecture/           # Domain、Logical Model、Migration 與流程設計
│   ├── requirements/           # 產品治理與權限需求
│   ├── research/               # v1／v2 市場與證據研究
│   └── verification/           # Migration 007 本機與 release verification
├── scripts/verification/       # 可重跑的本機 migration verification harness
└── supabase/
    ├── migrations/             # Migration 001–007
    └── tests/                  # Access Foundation verification SQL
```

## 重要文件導覽

### 產品治理與研究

- [v2 Product Governance & Permission Matrix](docs/requirements/V2_PRODUCT_GOVERNANCE_PERMISSION_MATRIX_DRAFT.md)
- [v2 Competitor Evidence Review](docs/research/existing-solutions/v2-competitor-evidence-review-2026-08-24.md)

### Domain、Logical Model 與流程設計

- [v2 Domain Model Design Review](docs/architecture/V2_DOMAIN_MODEL_DESIGN_REVIEW_DRAFT.md)
- [v2 Logical Data Model Design Review](docs/architecture/V2_LOGICAL_DATA_MODEL_DESIGN_REVIEW_DRAFT.md)
- [Migration 007 Access Foundation Design Review](docs/architecture/V2_MIGRATION_007_ACCESS_FOUNDATION_DESIGN_REVIEW_DRAFT.md)
- [Migration 007 Release Review](docs/architecture/V2_MIGRATION_007_RELEASE_REVIEW_DRAFT.md)
- [Invitation & Multi-case Workspace Design Review](docs/architecture/V2_INVITATION_MULTI_CASE_WORKSPACE_DESIGN_REVIEW_DRAFT.md)

### Migration 007 verification

- [Local Dry-run Report](docs/verification/V2_MIGRATION_007_LOCAL_DRY_RUN_REPORT.md)
- [Repository Harness Report](docs/verification/V2_MIGRATION_007_REPOSITORY_HARNESS_REPORT.md)
- [Release Candidate Verification Report](docs/verification/V2_MIGRATION_007_RELEASE_CANDIDATE_VERIFICATION_REPORT.md)
- [Remote Read-only Preflight Report](docs/verification/V2_MIGRATION_007_REMOTE_READ_ONLY_PREFLIGHT_REPORT.md)

## 安全與專題聲明

- WinWin v2 目前是學生 Prototype，不是正式醫療、護理、長照或法律系統。
- 不提供醫療診斷、處方、風險保證或緊急服務。
- 不宣稱市場首創、臺灣唯一或已降低真實照顧中斷事件。
- Local verification、設計文件及可點擊畫面不能替代 Production security review。
- 未經另行 Gate 與明確授權，不得將 v2 Prototype 狀態描述為遠端已部署能力。

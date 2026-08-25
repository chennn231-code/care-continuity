# WinWin v2 Contextual UX & Visual System Design Review Draft

> 文件狀態：Design Review Draft
>
> 本輪 Gate：設計與規格審查，不含任何實作
>
> 適用範圍：WinWin v2 專業個案紀錄、註冊／邀請、家屬關懷三種使用情境
>
> 最後更新：2026-08-25

## 0. 文件定位與既有文件關係

本文件定義「同一個 WinWin、三種情境密度」的全站系統層級原則。它不取代下列專項文件：

- [Professional Care Record UX & Visual Design Review](./V2_PROFESSIONAL_CARE_RECORD_UX_VISUAL_DESIGN_REVIEW_DRAFT.md)：專業紀錄的長表單、草稿、Sticky Action Bar 與元件細節為主要依據。
- [Invitation & Multi-case Workspace Design Review](../architecture/V2_INVITATION_MULTI_CASE_WORKSPACE_DESIGN_REVIEW_DRAFT.md)：邀請 credential、生命週期與最低必要預覽為安全依據。
- [Product Governance & Permission Matrix](../requirements/V2_PRODUCT_GOVERNANCE_PERMISSION_MATRIX_DRAFT.md)：角色、purpose、sharing scope 與單一完整 grant path 為權限依據。

若內容衝突：安全與權限採架構／治理文件；專業紀錄元件細節採專項 UX 文件；本文件負責跨情境的一致性與 context token 邊界。後續修改應更新單一主要來源並同步檢查其他引用文件，不複製成兩套互相漂移的規格。

### 0.1 決策摘要

- 保留一套 Global foundation：Logo、核心字型、主要霧藍、互動狀態、圓潤語言、資料最小化與誠實文案。
- 使用 context alias tokens 調整資訊密度、留白、圓角、色彩溫度、字級與引導程度；不建立三套元件庫或三種主要品牌色。
- 專業情境偏冷靜密集；註冊／邀請偏安全、逐步；家屬情境偏溫暖、適量，但不得製造「狀況穩定」等未被來源支持的安心感。
- 情境切換只改變呈現與任務框架，不改變權限。每次操作只能使用一條完整有效的 grant path。
- 現有 Prototype 已具共用 Logo、Prototype 說明、清楚 focus、skip link、reduced motion、邀請最低預覽與單一路徑說明等基礎；但 tokens 仍散落、全情境共用相同大標題／卡片、缺乏明確 context layer 與 forced-colors 規格。
- 本文件中的認知負荷、信任、情感設計及色彩心理學都屬設計依據與待驗證假設，不是成效宣稱。

## 1. 三種情境定義

| 情境 | 典型使用者心態 | 介面目標 | 密度／引導 | 不能造成的錯誤印象 |
| --- | --- | --- | --- | --- |
| 專業個案紀錄 | 高頻、大量資訊、需要專注 | 冷靜、秩序、高效率，但不冰冷 | 中高密度、中等留白、熟練操作優先 | 看似另一套醫療後台；假裝已保存；以高密度犧牲可讀性 |
| 註冊與邀請 | 低頻、不熟悉、具有不確定性 | 安全、簡單、明確引導 | 低密度、大量留白、一步一決策 | 過度承諾驗證或資料用途；邀請本身等於取得權限 |
| 家屬關懷 | 帶著關心或焦慮、需要快速理解 | 溫暖、清晰、資訊適量，但不製造錯誤安心 | 中低密度、寬鬆留白、摘要加來源 | 沒有新紀錄等於穩定；觀察等於診斷；摘要隱藏待處理風險 |

三種情境不是以帳號類型永久綁定。一位使用者可在不同個案、purpose 或時間使用不同情境；畫面應依「當次任務＋當次有效 grant path」決定，而不是只依 profile 中的自我聲明角色決定。

### 1.1 可以變動的情境屬性

- 資訊密度。
- 留白。
- Card 圓角。
- Canvas 的冷暖程度。
- 標題與重要內容字級。
- 教學、確認與解釋程度。

### 1.2 不可變成三套的屬性

- WinWin Logo、黑色手寫字標與黃色向日葵的正式品牌素材。
- 核心無襯線字型與 fallback 策略。
- Primary Accent 及 CTA 階層。
- Focus、錯誤、disabled、read-only、loading 等互動語意。
- Label、錯誤關聯、觸控目標及鍵盤規則。
- 圓潤線條、柔和陰影、低壓迫感與避免硬框的共同語言。
- 權限、資料最小化、來源保留與誠實文案。

## 2. 全站共用基礎

### 2.1 品牌基礎

全情境保留：

- 霧藍作為主要互動與信任節點。
- 暖奶白作為品牌背景或溫暖情境基底。
- 黑色手寫 WinWin Logo。
- 黃色向日葵品牌識別。
- 圓潤、溫和、可信任的整體語言。

Logo、Header 位置、共用導覽命名與主要 CTA 行為應保持一致。專業工作區可降低向日葵出現頻率、改用較冷 Canvas，但不能自行更換 Logo、加入另一個主色或改成傳統醫療系統的硬格線。

### 2.2 Token 分層

未來實作採 CSS variables 或等價 theme tokens，避免 Page 內散落硬編碼色碼：

```text
Global primitives
  ├─ color、type、space、radius、shadow、motion
  └─ 不直接描述特定 Page
        ↓
Global semantic tokens
  ├─ text、accent、focus、error、disabled、surface
  └─ 全站互動語意一致
        ↓
Context alias tokens
  ├─ professional
  ├─ registration-invitation
  └─ family
        ↓
Component tokens
  └─ card、field、pill、button、timeline、action bar
```

Context alias 只能覆寫被允許的溫度與密度屬性。`focus`、`error`、`disabled`、`danger`、觸控尺寸與權限語意不得被各 Page 任意改寫。

### 2.3 共用互動狀態

| 狀態 | 全站規則 |
| --- | --- |
| Focus | 使用 `:focus-visible` 清楚 outline／ring，不能只靠背景；不得被 overflow 或 sticky 區塊裁切 |
| Error | 欄位就近顯示具體訊息並以程式關聯；送出時有錯誤摘要；不只使用紅色 |
| Disabled | 保持可讀、說明原因或提供可達成條件；不可只降低 opacity；不應用 disabled 隱藏後續路徑 |
| Read-only | 與 disabled、一般文字及可編輯欄位明確區分，保留可選取／複製能力 |
| Loading | 顯示正在處理並防重複操作，不提前顯示成功 |
| Success | 只有實際狀態轉換或後端確認後才使用完成語言；Prototype 明示模擬 |
| Warning／danger | 文字說明後果，危險動作與主要 CTA 分離；不可只靠黃色／紅色 |

### 2.4 資料最小化與文案

- 每一步只要求完成當下目的所需的最低資料。
- 不因有欄位空間就收集證照、身分文件、個案健康資訊或家庭細節。
- 權限說明使用一般人能理解的語言，但不隱藏限制。
- 不寫「絕不分享」「已完成法律驗證」「可以安全離開」等超出實際機制或政策的承諾。
- Prototype 必須持續標示虛構資料、重新整理重置、未連線正式後端等真實邊界。

### 2.5 證據限制

本規格中的「減少干擾」「建立信任」「溫暖」「安心」「較易理解」與色彩／留白所推定的心理效果，均為設計依據與待驗證假設。除非有可靠研究來源或適當使用者測試，不得宣稱已證明能降低焦慮、認知負荷、眼睛疲勞或錯誤率。報告須區分設計意圖、測試觀察與可推論結論。

## 3. 專業紀錄情境

本節只定義跨系統定位；詳細規格以 [Professional Care Record UX & Visual Design Review](./V2_PROFESSIONAL_CARE_RECORD_UX_VISUAL_DESIGN_REVIEW_DRAFT.md) 為準。

### 3.1 核心感受與視覺

- 冷靜、專注、高效率，但不冰冷。
- Canvas `#F4F6F8`、Surface `#FFFFFF`、Primary Text `#1E293B`、Secondary Text `#64748B`。
- Primary Accent `#3B6978`，Field Background `#F8FAFC`，Divider `#E2E8F0`。
- Card radius 約 `12–16px`、中等留白、資訊密度可稍高。
- 長篇內文 `15–16px`、line-height 約 `1.7`；主標題不沿用品牌首頁的超大展示字級。

### 3.2 工作流原則

- 長表單採同一狀態模型下的步驟、Accordion、Tabs 或左側段落導覽；重要錯誤不得藏在未開啟區段。
- Textarea 可自動擴展，但有最小／最大高度，超過安全高度才內部捲動。
- Sticky Action Bar 必須避開最後欄位、safe area 與手機鍵盤，並支援 200% zoom。
- 高頻操作可降低說明密度，但必要 label、來源、時間、狀態與錯誤不能省略。
- 送出、取消、下一步與草稿的層級穩定，防止誤觸與重複提交。

### 3.3 草稿誠實性

- In-memory Prototype 不顯示「已自動儲存」「已保存至雲端」或真實感時間戳。
- Prototype 顯示：「此為流程展示，內容只保留在目前頁面；重新整理後會重置。」
- 只有後端確認目前版本寫入成功後，正式版才可顯示儲存時間。
- 前端計時器、debounce 或 local state 更新不是保存成功證據。

## 4. 註冊／登入情境

### 4.1 核心感受

安全、簡單、一步一步完成。延續現有 WinWin 身分註冊流程，不在本 Gate 重新設計資訊架構或驗證模型。

### 4.2 漸進式揭露

- 一次要求一個清楚決策；每畫面以 `1–2` 組主要輸入為候選上限，但以真實任務測試調整。
- 顯示目前步驟與剩餘步驟；若分支使總步數變動，使用「目前步驟／流程階段」而非誤導性的固定百分比。
- 允許返回上一個步驟，並保留已輸入內容、選項與可理解的 focus 位置。
- 錯誤就近顯示；送出失敗時保留輸入，不清空整頁。
- 專業驗證欄位按目的逐步揭露，不一次展示所有證照、機構與文件欄位。
- 不為了套用固定理論強迫三步流程；步驟數由任務、分支、風險與使用者測試決定。

### 4.3 視覺方向

- Background 候選 `#FBF9F6`，Surface `#FFFFFF`。
- Primary Text `#1E293B`、Secondary Text `#64748B`、Primary Accent `#3B6978`。
- 較大量留白、Card radius 約 `16px`。
- Input 高度約 `52px`，手機輸入文字 `16–17px`。
- 單一主要 CTA；返回或稍後處理採次要層級。
- 小型插畫或低彩度圖示必須延續 WinWin 線條語言、不能取代說明文字，也不能造成不成比例的下載或渲染負擔。
- 不引入風格不一致的圖庫插畫。

### 4.4 Microcopy 邊界

可以依真實目的寫：

> 我們只會依這個步驟的目的使用你提供的資訊。

但使用前仍須確認該步驟目的、後續處理與政策一致。不得無條件寫：

- 此資訊僅供身分確認。
- 我們絕不會分享任何資料。
- 已完成法律身分驗證。

完成畫面須區分「帳號建立」「身分自我登錄」「身分驗證」「個案成員關係」與「資料權限」，不能以單一「註冊成功」暗示全部完成。

## 5. 邀請情境

### 5.1 核心感受與內容層級

使用者應一眼知道這是 WinWin 邀請、目前能否處理，以及下一步是登入／註冊或回應邀請。內容順序：

1. WinWin 邀請識別。
2. 邀請目前是否有效。
3. 登入或註冊。
4. 登入後的最低必要預覽。
5. 接受或拒絕。
6. 安全與 Prototype 說明。

留白依 320–1440px 內容與可用空間調整，不硬性要求 60%。小螢幕優先確保邀請狀態、主要動作與安全說明在合理閱讀順序中。

### 5.2 Credential 安全邊界

- 不改為容易猜測的六位數純數字碼。
- 使用高熵 opaque invitation credential。
- 專屬連結、QR Code 與可輸入代碼只是同一 credential 的三種表示。
- Database 只保存 token hash；raw credential 只在必要交付時出現。
- 接受仍需登入；Email-bound invitation 仍需 confirmed Email 相符。
- Credential 一次性、有期限、可撤回；開啟、掃描或輸入本身不授權。

如需人工輸入：

- 高熵英數代碼可用連字號分組顯示，並容許使用者貼上含空白／連字號的完整字串。
- 底層使用單一語意 input，支援整段貼上、選取、刪除、autocomplete 策略與螢幕閱讀器名稱。
- 視覺可分格，但不建議使用六個獨立 input。
- 一般文案不出現 opaque credential、token hash、grant path 等技術術語；安全說明用任務語言表達。

### 5.3 最低必要預覽

- 未登入或未通過 confirmed Email 綁定前：只顯示 WinWin 邀請識別、是否仍可處理，以及登入／註冊指引。
- 登入且綁定符合後：才顯示最低或遮罩個案名稱、邀請者、角色／關係、purpose、分享範圍、服務期間與驗證狀態。
- 不在邀請預覽顯示健康內容、時間軸、問題、事項、其他成員、其他個案、UUID、token 或 Email 綁定細節。

### 5.4 發送端

可規劃：複製邀請連結、QR Code、可輸入代碼與系統分享。LINE／簡訊若未實際整合，不得顯示看似會傳送的正式按鈕；Prototype 必須標示模擬、不可掃描或不會對外傳送。

## 6. 家屬關懷情境

### 6.1 核心感受與視覺

溫暖、容易理解、資訊適量，但不製造錯誤安心。

- 延續 WinWin 暖奶白與霧藍。
- Warm Background 候選 `#FBF9F6`。
- Sage `#7A9A8B`、Oat `#EAE3D2` 只作輔助 Surface、圖示或局部情境色，不升格為主 CTA 色。
- Card radius 約 `18–20px`，留白較寬鬆。
- 大標題約 `22px` Semi-Bold，重要動態 `17–18px`，Body line-height 約 `1.7–1.8`。
- 手機維持清楚層級；不能把所有文字一起放大，使來源、時間與狀態難以區分。

### 6.2 專業資訊轉譯原則

家屬端可以減少術語、欄位與表格密度，但不能改變原始紀錄意義。摘要至少保留：

- 已確認的觀察。
- 發生時間與紀錄時間。
- 作者／紀錄來源。
- 是否有後續處理事項。
- 是否仍待確認。
- 最後更新時間。
- 更正、撤回或來源更新提示。

不得自行推論或顯示「今天狀況：良好穩定」，除非有權專業人員明確記錄、確認該判斷，且仍在定義清楚的有效時間範圍內。

生活化語言必須：

- 保留來源與時間。
- 不把觀察改寫成診斷。
- 不把「沒有新紀錄」寫成「狀況穩定」。
- 不因摘要省略待處理風險或不確定性。
- 不隱藏更正、撤回或來源已更新提示。
- 只顯示當次 family grant path 允許的資訊。

若無法忠實摘要，優先顯示較短的原始已授權內容與來源，而不是生成更肯定的生活化判斷。

### 6.3 Timeline

家屬端可使用垂直時間軸，例如：

```text
10:00　陪伴散步
12:30　完成午餐
15:00　新增一筆待確認觀察
```

每筆仍須保留作者／來源、發生時間、紀錄時間、狀態、權限範圍及更正／更新提示。視覺摘要不可讓「發生時間」與「紀錄時間」混為一談。不同個案資料不得合併到同一時間軸，也不顯示因權限不可見的紀錄數量來暗示敏感活動。

## 7. 安全與資訊轉譯邊界

### 7.1 呈現不得創造事實

| 原始狀態 | 可呈現 | 不可推論 |
| --- | --- | --- |
| 有一筆已確認觀察 | 觀察內容、來源、時間、確認狀態 | 診斷、整體穩定、未來風險 |
| 沒有新紀錄 | 「最後更新於…」或「目前沒有新的可見紀錄」 | 狀況良好、沒事、無風險 |
| 待確認觀察 | 清楚標示待確認與來源 | 當作已驗證事實或正式評估 |
| 已更正／撤回 | 顯示目前版本及更正提示；依權限提供必要歷史 | 靜默覆蓋成從未發生 |
| 有後續事項 | 顯示狀態、負責角色與期限（在授權範圍內） | 因已指派就宣稱已處理 |

### 7.2 權限先於摘要

- 摘要引擎或 UI 只能讀取一條完整 grant path 已允許的資料集合。
- 不先合併多條路徑可見資料再做摘要。
- 摘要、Timeline、搜尋、列印、匯出與 notification 都不能擴張權限。
- 不使用被遮蔽資料的數量、時間或存在與否作旁路提示。
- 來源更新、撤回或存取權變更後，舊摘要不得繼續當成目前事實。

### 7.3 Prototype 安全說明

- 只用虛構個案、credential、Email、身份與紀錄。
- 模擬登入、QR、分享、驗證、接受或保存都須就近標示，不靠使用者記得全站 Banner。
- 技術上的安全模型可在開發／審查工具呈現；一般任務畫面改用清楚的人類語言，不能把 opaque token 等術語當作主要說明。

## 8. 情境切換與多重身分

### 8.1 切換原則

同一使用者可能同時具有家屬與專業角色，但每次操作：

- 顯示目前 acting role。
- 顯示目前 purpose。
- 必要時顯示個案與 sharing scope 摘要。
- 使用一條完整、目前有效的 grant path。
- 不把兩條路徑的 capabilities、scope、期限或資料拼接。
- 不因切換視覺溫度取得額外資料。

若兩條有效路徑會產生不同結果，要求使用者明確選擇情境。無歧義時可以可見預設，但操作紀錄仍保存 acting role、purpose 與 sharing scope。

### 8.2 Context switcher 規格方向

- 位置固定在共用 Header 或個案 Context Bar，不埋在個人設定深處。
- 顯示「正在以家屬身分協助林奶奶」或「正在以護理專業進行皮膚狀況追蹤」等人類可讀摘要。
- 切換前預告可見內容與可用操作會改變；有未保存內容時先處理離頁風險。
- 切換後更新頁面標題、acting role、purpose 與內容集合；不能只換顏色。
- Focus 移至新的 context heading 或狀態訊息，讓鍵盤與螢幕閱讀器使用者察覺切換。
- 不提供「合併所有身分」選項。

### 8.3 品牌連續性

Header、Logo、主要導覽用語、按鈕層級、focus 與錯誤規則保持一致。Context 改變 Canvas、留白、圓角與資訊密度時採平順且低調的變化；reduced motion 下不播放過場。

## 9. Color／Typography／Spacing Tokens

### 9.1 Global semantic tokens

| Token | 候選值 | 規則 |
| --- | --- | --- |
| `--color-brand-accent` | `#3B6978` | 全站主要互動色；不因 context 改成 Sage 或森林綠 |
| `--color-text-primary` | `#1E293B` | 標題、正文、輸入文字 |
| `--color-text-secondary` | `#64748B` | 輔助內容；小字及暖底須特別驗證 |
| `--color-surface` | `#FFFFFF` | 主要內容 Surface |
| `--color-divider` | `#E2E8F0` | 柔和分隔與必要邊界 |
| `--color-focus` | `#3B6978` | 與主要互動色一致，另有 outline 幾何規格 |
| `--color-field` | `#F8FAFC` | 候選 Field 背景；不能作唯一邊界 |
| `--shadow-soft` | `0 2px 12px rgba(15, 23, 42, 0.04)` | 工作介面基準；品牌或家屬卡片可透過 alias 微調 |

Error、warning、success、disabled 與 info 需要完整狀態組（foreground、background、border、icon、focus／forced-colors），不在 Page 內自行指定。

### 9.2 Context alias tokens

| Alias | Professional | Registration／Invitation | Family |
| --- | --- | --- | --- |
| `--context-canvas` | `#F4F6F8` | `#FBF9F6` | `#FBF9F6` |
| `--context-surface` | `#FFFFFF` | `#FFFFFF` | `#FFFFFF`；Oat 可作次要 Surface |
| `--context-card-radius` | `12–16px` | 約 `16px` | `18–20px` |
| `--context-field-height` | 至少 `48px` | 約 `52px` | 至少 `48px` |
| `--context-density` | 中高 | 低 | 中低 |
| `--context-content-gap` | `20–24px` | `24–32px` | `24–32px` |
| `--context-body-leading` | 約 `1.7` | `1.6–1.7` | `1.7–1.8` |
| 輔助色 | 冷灰與狀態色 | 低彩度霧藍 | Sage `#7A9A8B`、Oat `#EAE3D2` |

範圍是候選值，不應在程式中以任意插值造成大量近似 token；實作前需選定離散值與使用條件。

### 9.3 Typography

```css
--font-zh: "PingFang TC", "Noto Sans TC", system-ui, sans-serif;
--font-latin: "Inter", system-ui, sans-serif;
```

- 全情境正文與密集 UI 使用共同無襯線字型。
- 若品牌節點保留既有襯線／手寫氣質，只限 Logo 或核准的展示位置，不作表單 label 或長篇紀錄字型。
- 手機 Input 實際文字至少 `16px`。
- 專業主標題約 `20px`；註冊標題可在清楚層級下稍大；家屬大標題候選約 `22px`。
- 不用超大字級取代資訊架構；320px 及 200% zoom 下標題需自然換行。
- 引入 Noto Sans TC／Inter Webfont 前先審查 bundle、subset、字重與 fallback，不因單頁載入大型依賴。

### 9.4 Spacing

Global spacing 採 `4px` 基準：`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40px`。Context 只能選擇不同組合，不建立新的任意數列。

- Professional：欄位垂直間距 `20–24px`，區段間 `32–40px`。
- Registration／Invitation：決策群組間 `24–32px`，以留白協助分段但不硬性保留比例。
- Family：卡片間及主要動態間 `20–24px`，摘要 metadata 可較緊密但不可小到難讀。
- 320px 水平 gutter 至少 `16px`；若裝置或 200% zoom 空間不足，以單欄重排，不壓縮觸控目標。

### 9.5 初步色彩對比計算

下表為指定純色的 sRGB 相對亮度計算，只是候選篩選，不代表透明度、實際字重、狀態、圖示或完整元件已通過：

| 前景／背景 | 對比 | 初步判讀 |
| --- | ---: | --- |
| Primary Text `#1E293B`／White | `14.63:1` | 一般文字候選可用 |
| Secondary Text `#64748B`／White | `4.76:1` | 接近邊界，不降低 opacity |
| Accent `#3B6978`／White | `6.04:1` | 文字與 CTA 候選可用 |
| Primary Text／Warm `#FBF9F6` | `13.92:1` | 一般文字候選可用 |
| Secondary Text／Warm `#FBF9F6` | `4.53:1` | 非常接近邊界，須實際重測 |
| Sage `#7A9A8B`／White | `3.08:1` | **不可作一般小字顏色** |
| Primary Text／Sage | `4.75:1` | 僅候選；Sage 作實色底時需實測 |
| Primary Text／Oat `#EAE3D2` | `11.44:1` | 候選可用 |
| Secondary Text／Oat | `3.72:1` | **不可作一般小字配對** |

因此 Sage 與 Oat 不能直接套用到所有文字／背景。實作時須驗證每個前景背景組合、focus indicator、控制項邊界與狀態；不得用 opacity 使原本勉強達標的配對失效。

## 10. Responsive 與 Accessibility

### 10.1 全站最低要求

- 手機 Input 文字至少 `16px`。
- 一般觸控目標至少 `44 × 44px`；CTA 高度可依 context 為 `48–52px`。
- 永久可見 label，不以 placeholder 取代。
- 狀態、目前項目與錯誤不只靠顏色。
- 清楚 `:focus-visible` outline／ring。
- 錯誤以程式關聯欄位，送出錯誤可被螢幕閱讀器察覺。
- 全流程可鍵盤完成，閱讀順序與 Tab 順序一致。
- 使用語意 heading、landmark、list、fieldset／legend、button、link，不以可點 div 模擬。
- 支援 reduced motion；狀態不以動畫作唯一提示。
- forced-colors／高對比模式下保留邊界、focus、狀態、active 與錯誤。
- 自動化掃描加人工鍵盤、螢幕閱讀器、縮放與對比檢查；自動化不能取代人工。

### 10.2 Viewport 行為

| Viewport | 共通要求 | 情境注意事項 |
| --- | --- | --- |
| `320px` | 單欄、無頁面水平捲動、長字串安全斷行 | 邀請 credential 可換行／整段貼上；Action Bar 不遮欄位；Timeline metadata 堆疊 |
| `375px` | 保持 44px 觸控目標與 16px Input | 註冊／邀請動作可滿寬；家屬重要動態與來源層級仍清楚 |
| `768px` | 依內容選單欄或有限雙欄，不把窄平板當桌面 | Tabs、外接鍵盤、橫直向與軟體鍵盤都須測 |
| `1440px` | 容器限制行長，不能把所有內容攤滿 | 專業可左導覽＋單一閱讀欄；家屬摘要維持適量，不因空間多而塞滿資訊 |

### 10.3 200% zoom 與重排

- 所有功能、狀態、錯誤與導覽仍存在。
- 按鈕可換行或垂直排列，不截字、不重疊、不要求雙向捲動。
- Sticky Header／Action Bar 不遮住 focus 目標。
- Tabs 若無法容納，退化為步驟選單、Accordion 或段落導覽。
- 固定高度容器不得裁切文字；Textarea 最大高度策略仍允許閱讀與操作。

## 11. 與現有 WinWin Prototype 的差異稽核

本節是 2026-08-25 的 repository 靜態稽核，不代表瀏覽器或輔助科技實測結果，也不授權立即修改。

| 項目 | 現況觀察 | 與本規格差異／風險 | 後續建議 |
| --- | --- | --- | --- |
| 共用品牌 | `PrototypeShell` 共用 WinWin Logo、Header 與 Prototype Notice | 符合單一產品方向 | 保留共用 Shell；新增 context 也不複製 Header |
| 品牌色與背景 | v2 使用暖奶白到霧藍 gradient、既有 `--mist-*`／`--cream-*` | 尚無 Global semantic＋context alias 分層 | 先盤點再建立 tokens，不直接全域替換 |
| 字型 | Body 為 Noto Sans TC／PingFang TC；全域 heading 使用 Noto Serif TC 等襯線 | 專業密集頁若沿用襯線與展示標題，可能偏離工作介面規格 | 將品牌 heading 與工作 heading 語意分離後測試 |
| 頁面標題 | v2 `h1` 使用 `clamp(2.2rem, 6vw, 4rem)` | 專業與家屬情境都可能過大；三情境未分層 | 以 context type tokens 收斂，不改品牌首頁展示字 |
| Card | 共用約 `1.35rem` radius、較強 `0 14px 38px` shadow | 尚未區分專業 12–16px、註冊 16px、家屬 18–20px；專業陰影偏重 | 建立 context aliases，先做視覺回歸比較 |
| Focus | v2 有 `3px solid #274f60` 且 offset `3px` 的 `:focus-visible` | 基礎良好，但須檢查所有自訂控制項、sticky／overflow 裁切與 forced-colors | 保留清晰度，統一成 semantic focus token |
| Reduced motion | 全站 media query 移除 transition 並關閉 smooth scroll | 已有基礎退化 | 實測 carousel、context switch、dialog 與 scroll management |
| Forced colors | 目前檢索未見 v2 專用 forced-colors 規則 | 背景、陰影、透明邊界消失後 active／selected 可能不清楚 | 列為共用 accessibility 首要補強 |
| Responsive | v2 主要在 720px、390px 重排 | 尚未形成 320／375／768／1440 與 200% zoom 驗證矩陣 | 先建立測試矩陣，再決定必要 breakpoint |
| Registration flow | 已分 Intro、Identity、Profession、Verification、Complete；可返回，並明示驗證邊界 | 缺少一致的「目前步驟／剩餘步驟」；Identity carousel 的 `1/3` 是選項序號而非流程進度，可能混淆 | 先測使用者理解，再定義分支進度模型 |
| Registration input density | 主要以選擇卡和逐頁流程呈現 | Identity cards 高 `23–26rem`、展示感強，窄螢幕與 200% zoom 需檢查；專業類別同頁量較多 | 不立即重設；先做鍵盤、SR、縮放與任務測試 |
| Invitation preview | 登入前不洩漏個案；登入後顯示最低必要預覽與接受／拒絕 | 與安全模型大致一致 | 補「邀請是否有效」在登入前的可理解呈現與完整錯誤狀態測試 |
| Invitation credential | 三種交付共用虛構 credential；明示 QR 不可掃描、不會外傳；不是六位數碼 | 展示頁直接顯示技術用語 `credential`，適合審查工具但不宜成為一般文案 | 區分 Prototype 審查層與一般使用者層；人工輸入仍需單一語意 input 規格 |
| Sharing | 目前未製作假的 LINE／簡訊傳送按鈕 | 符合誠實邊界 | 未整合前維持模擬標示或不呈現 |
| Acting context | Case Context 顯示家庭成員、驗證與 grant path，並有 Prototype role preview | 目前文字固定為家庭關係；工具可切角色，但 acting role、purpose 與 scope 未形成正式單一路徑 selector | 先定義 context selector 文案與狀態模型，不讓視覺切換變成權限切換 |
| Family timeline | 已保留發生／紀錄時間、作者角色、來源、分享範圍、版本與更正提示；依 case 與 role 篩選 | 共用卡片偏系統 metadata，尚未形成家屬摘要層；`active` tone 目前偏綠但語意是紀錄類型 | 保留必要來源，測試生活化排序與狀態命名，不自行產生穩定結論 |
| Prototype 誠實性 | 全站 Notice 說明虛構資料、重新整理重置，頁面亦就近標示模擬 | 基礎良好；後續新增草稿或分享不可只依賴全站 Banner | 高風險操作持續就近提示 |
| Token 硬編碼 | v2 CSS 同時使用 root variables、hex、rgba 與局部顏色 | 未來 context 擴充易造成漂移與主色分裂 | 先建立 token inventory／mapping，再做小範圍遷移 |

### 11.1 稽核限制

- Repository 目前有既存未提交前端變更；本輪只讀取，不修改也不歸因其作者。
- 本稽核未啟動 App、未做截圖比較、未跑 axe／螢幕閱讀器或裝置測試。
- 「已有基礎」不等於已通過 accessibility 或使用者測試。

## 12. 建議優先調整與 Defer 項目

### 12.1 下一個 Frontend Gate 可優先評估（本輪不實作）

1. 建立 token inventory：把現有 `--mist-*`、`--cream-*`、`--ink`、硬編碼色與元件用途對照到 Global semantic tokens。
2. 將 focus、error、disabled、read-only、loading 與 status 的共通規格補齊，包含 forced-colors。
3. 為 Shell 定義可見的 acting role／purpose／case context 模型，不先改權限或資料取得邏輯。
4. 為註冊分支建立誠實的流程進度模型，驗證返回保留與錯誤狀態。
5. 將邀請人工輸入定義為單一可存取欄位；保留現有高熵 credential 模型。
6. 以現有 Timeline 為基礎設計家屬摘要層，但完整保留來源、雙時間、狀態、scope 與版本提示。
7. 建立 320／375／768／1440、200% zoom、鍵盤、reduced motion、forced-colors 的視覺與互動測試矩陣。

### 12.2 Defer

- Dark Mode：沿用專業紀錄文件的 defer 條件，先解決正式淺色 Logo 與全狀態暗色對比。
- 正式自動儲存、離線草稿、版本衝突與 Supabase 持久化。
- 全面重設現有註冊／邀請資訊架構。
- LINE／簡訊第三方分享整合。
- 正式 QR Code 掃描／產生與 credential 發送。
- AI 生成家屬摘要或自動專業術語轉譯。
- 組織級專業後台與跨個案聚合時間軸。
- 全站 Webfont／插畫套件導入，直到 bundle 與品牌素材審查完成。
- Dark Mode、列印與圖表的完整 context variants。

## 13. 需要使用者測試驗證的假設

### 13.1 跨情境

1. 使用者能否辨識三種介面仍屬同一 WinWin，而非三套產品？
2. Context Bar 是否清楚表達 acting role、purpose、個案與資料範圍？
3. 情境切換前後，使用者是否誤以為視覺模式會增加權限？
4. 相同 focus、錯誤與 disabled 模式是否能在三種不同密度下維持可理解性？
5. 霧藍作唯一 Primary Accent 是否足以建立層級；Sage／Oat 是否被誤認為可操作或成功狀態？

### 13.2 專業紀錄

6. 中高密度、較小圓角及冷灰 Canvas 是否支持長時間工作，或只是主觀偏好？
7. 長表單在手機步驟、平板 Tabs、桌面側導覽下的定位、回查與跨區錯誤表現如何？
8. Textarea 自動增高與最大高度對真實長篇內容是否可預期？
9. Prototype 保存限制、離頁警告與正式草稿狀態是否被正確理解？

### 13.3 註冊／邀請

10. 一步一決策是否讓不熟悉者理解流程，或造成步驟過多與失去全貌？
11. 分支流程如何顯示進度才不會讓使用者誤解固定總步數？
12. 身分自我登錄、驗證、個案加入與資料權限是否仍會被混為一談？
13. 高熵英數代碼的分組、貼上、錯誤修正是否可順利完成？
14. 邀請有效性、登入要求與最低預覽順序是否能避免誤解與敏感資訊洩漏？

### 13.4 家屬關懷

15. 較暖 Canvas、較大圓角與較寬鬆留白是否被感受為清楚溫和，而非缺少資訊？
16. 家屬能否區分觀察、專業判斷、待確認、後續事項與沒有新紀錄？
17. 發生時間、紀錄時間、作者／來源、scope 與更正提示的呈現是否足夠清楚但不過量？
18. 生活化轉譯是否保留原意，是否產生比原始紀錄更肯定的理解？

### 13.5 測試條件

每組任務記錄角色、acting purpose、裝置、viewport、zoom、輸入方式與輔助科技。測試結果應保存任務完成、誤解、關鍵錯誤、原話摘要與研究限制；小樣本觀察是迭代訊號，不直接證明降低焦慮、認知負荷或眼睛疲勞。

## 14. Gate 判定

### 14.1 本輪 Gate

**Gate：Contextual visual system specification ready for stakeholder review；Frontend implementation not authorized。**

本輪只建立本文件。明確未授權：

- 修改前端、CSS 或既有註冊／邀請畫面。
- 建立六位數純數字邀請碼。
- 修改 Logo 或自行產生品牌變體。
- 修改 Migration 007、Supabase、資料或 Production。
- 修改 README。
- 部署、commit 或 push。

### 14.2 進入 Frontend planning 前的條件

- 產品、設計、專業代表與安全／權限負責人確認三種 context 定義。
- 確認 token 層級、命名、候選色對比與現有 token mapping。
- 確認 acting role／purpose／grant path 的產品文案與狀態來源。
- 釐清哪些頁面屬於哪個 context，以及同頁混合情境的優先規則。
- 建立 accessibility 與 responsive 驗證矩陣。
- 對高風險文案、家屬轉譯與邀請最低預覽完成內容審查。
- 將第一個 Frontend slice 限制為可回復、無後端變更的小範圍工作。

## 15. 後續 Frontend Slice 邊界

本節只定義未來另案的建議範圍，不構成本輪實作授權。

### 15.1 建議 Slice 1：Foundation inventory and aliases

可包含：

- 建立現有 v2 色彩、字型、spacing、radius、shadow 與狀態的 inventory。
- 新增 Global semantic 與 context alias variables，但第一步不改頁面視覺輸出。
- 為 tokens 建立示例／測試頁或既有開發環境內的可回歸檢查，是否建立新畫面須另行授權。
- 建立 contrast、forced-colors、200% zoom 與 viewport 驗證清單。

不可包含：

- 改動 Supabase、Migration、route、資料模型或 Production。
- 全站一次性視覺重寫。
- 以 token migration 為名順便重設註冊或邀請 flow。

### 15.2 建議 Slice 2：Shared interaction states

在 Slice 1 審查通過後，可另案統一 focus、error、disabled、read-only、loading、status 與觸控目標。必須先保留現有可用行為並完成視覺回歸、鍵盤、forced-colors 與 zoom 驗證。

### 15.3 建議 Slice 3：One context pilot

選擇單一、低風險、使用虛構資料的既有頁面作 context alias pilot；不新建正式專業紀錄 route、不加入假自動儲存、不改邀請 credential 或 grant path。Pilot 通過品牌一致性、responsive、accessibility 與使用者測試後，才考慮擴至其他 context。

### 15.4 獨立 Gate 項目

以下永遠需要獨立設計、安全與工程 Gate：

- 正式草稿持久化、自動儲存、離線與版本衝突。
- 邀請 credential 產生、發送、QR、token hash 與接受流程。
- 任何 Supabase／Migration／RLS 變更。
- AI 摘要或專業資訊自動轉譯。
- Context switch 對資料查詢與授權執行的影響。
- Logo、Dark Mode、第三方分享與 Production 部署。

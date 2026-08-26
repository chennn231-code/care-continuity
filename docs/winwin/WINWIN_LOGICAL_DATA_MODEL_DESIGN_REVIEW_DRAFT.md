# WinWin Logical Data Model Design Review

> **狀態：DRAFT — Product Decisions Accepted; Pending Final Read-only Review**
>
> **不屬於本文件：正式 ERD、table／column 名稱、PK、FK、constraint、SQL、Migration、RLS、RPC、API、transaction、locking、concurrency 或前端實作。**

## 1. Purpose and authority

本文件回答：「哪些已接受的 WinWin 產品概念值得成為獨立邏輯實體、哪些只應作內嵌語意、投影或延後決定？」它不授權建立 Schema，也不把候選識別方式翻譯成正式 database key。

產品權威依序為：

1. [`WINWIN_PRODUCT_DEFINITION_BOUNDARY_V1.0.md`](WINWIN_PRODUCT_DEFINITION_BOUNDARY_V1.0.md)
2. [`WINWIN_CORE_OBJECT_MODEL_PHASE_1_DESIGN_REVIEW_DRAFT.md`](WINWIN_CORE_OBJECT_MODEL_PHASE_1_DESIGN_REVIEW_DRAFT.md)
3. [`WINWIN_CORE_OBJECT_MODEL_PHASE_2_DESIGN_REVIEW_DRAFT.md`](WINWIN_CORE_OBJECT_MODEL_PHASE_2_DESIGN_REVIEW_DRAFT.md)
4. [`WINWIN_CORE_OBJECT_MODEL_PHASE_3_DESIGN_REVIEW_DRAFT.md`](WINWIN_CORE_OBJECT_MODEL_PHASE_3_DESIGN_REVIEW_DRAFT.md)
5. [`WINWIN_CORE_OBJECT_MODEL_CONSOLIDATION_REVIEW_DRAFT.md`](WINWIN_CORE_OBJECT_MODEL_CONSOLIDATION_REVIEW_DRAFT.md)

Frontend Prototype、Migration 007／008 只供相容性比較，不是模型權威。Migration 001–006、Coverage、Scenario、Backup Assignment 與 handoff 屬於「備份心」，不納入 WinWin Logical Model。

## 2. Decision boundary

本 Review 可以：

- 比較 logical persistence boundaries、識別責任、cardinality 與歷史要求。
- 指出未來需要 constraint 或 transaction 保護的 invariant，但不設計其技術形式。
- 將候選概念分類為獨立邏輯實體、內嵌／受控 vocabulary、projection 或 Deferred。
- 指出 Product Decision Blockers、法律／場域依賴及 migration risk。

本 Review 不可以：

- 以現有資料表名稱作正式命名。
- 以 locally verified Migration 007／008 證明產品模型已完成。
- 決定 physical schema、storage engine、RLS helper、RPC 或原子交易。
- 默認七項剩餘產品問題已有答案。

## 3. Whole-model alternatives

### 3.1 Option A — Directly extend Migration 007／008

將既有 v2 access foundation 與 identity／grant alignment 持續加欄位、內容實體及責任模型。

**優點：** 已有本機驗證、identity／invitation／membership／grant 基礎、短期開發量看似較低。

**缺點：** 現有 membership 混有 relationship 語意；invitation acceptance 與 grant activation 可能過度耦合；尚未表達獨立 Relationship generation、source version、Responsibility Cycle 與 Outcome 邊界。直接延伸容易讓既有名稱反向凍結產品模型。

### 3.2 Option B — Clean independent WinWin core model with coexistence and controlled bridges

建立以已凍結產品概念為來源的乾淨 logical boundaries；既有 v1 與 v2 structures 保持不變，只有經審查的資料或識別關係才透過 bridge／migration plan 銜接。

**優點：** 單一 truth 邊界最清楚；可保護 v1／既有 v2 non-regression；能逐步遷移及回滾；不需將 access foundation 誤當 content domain。

**缺點：** 第一版會存在並行模型與 bridge 成本；需明確 source-of-truth ownership；必須避免雙寫與影子 truth。

### 3.3 Option C — Refactor or replace current v2 structures in place

直接改寫 Migration 007／008 所建立的概念與相依關係，使其符合新模型。

**優點：** 長期表面上只有一套 v2 結構。

**缺點：** 回滾與既有驗證失效風險高；容易破壞既有 Prototype contract；在 Remote 尚未套用不代表可以忽略 repository history；資料映射與 non-regression 證明成本最高。

### 3.4 Option D — Full Event Sourcing as the core

所有狀態由不可變事件重建，projection 提供目前狀態。

**優點：** 歷史、版本、責任週期與 audit 表達能力強。

**缺點：** 第一版複雜度、projection 一致性、授權查詢、除錯與 migration 成本過高；學生 MVP 不需要完整 Event Sourcing 才能達成 append-only history。

### 3.5 Comparison

| Criterion | A Extend 007／008 | B Clean coexistence | C Replace／refactor | D Full Event Sourcing |
|---|---|---|---|---|
| Frozen product alignment | Partial | **Strongest** | Possible but risky | Strong but excessive |
| Least privilege | Existing foundation helps; content gap | **Clear independent boundaries** | High regression risk | Powerful but complex |
| Immutable history | Partial | **Targeted append-only entities** | Requires invasive rewrite | Strongest |
| v1／v2 non-regression | Medium risk | **Lowest risk with no dual writes** | Highest risk | Medium／high |
| Rollback／migration risk | Medium | **Controlled incremental risk** | High | High |
| First-version complexity | Low initially, grows quickly | **Moderate** | High | Very high |
| Future extensibility | Constrained by current coupling | **High** | Medium／high | High but costly |

**Accepted（PD-LDM-01）：Option B。** 建立乾淨、獨立的 WinWin logical model，與既有資料並存；WinWin 新模型是 WinWin 功能的 authoritative side。只有必要時才另行設計受控 bridge；bridge 必須明確指定資料方向、擁有者、失敗處理及停止條件，並禁止同一 truth 雙向同步。這項接受不核准 Schema、Migration、bridge 實作或資料搬移。

**Rejected for first version：** Option D。完整 Event Sourcing 超出 MVP；仍可用不可變版本、generation、responsibility cycle 與 audit events 保留必要歷史。

**Not recommended：** Option A 與 C。兩者都容易讓已存在的 v2 physical design 反向決定 WinWin Domain。

## 4. Recommended Logical Model

### 4.1 Logical relationship view（not ERD）

```text
Limited Person Reference ── optional governed link ── Account Identity
          │
          └── Care Recipient Role ── exactly one role per Care Case
                                           │
                                      Care Case
                                           │
                  ┌────────────────────────┴────────────────────────┐
             Invitation                                      Authorization Declaration
                  │
        Membership Generation
                  │
       Relationship Generation
          ┌───────┴────────┐
 Family Relationship   Service Relationship ── Professional Identity condition
                  │
          Grant Generation ── Role／Capability vocabulary
                  │
 Complete Grant Path + operation-scoped Acting Context
                  │
 Care Update／Source Envelope ── Content Version／Revision
                  │                         │
             Observation              Source Reference
                  │                         │
                  └──────── Question ───────┘
                                  │ 0..n
                                Action
                                  │ 0..n historical; max 1 current effective
                         Responsibility Cycle
                                  │ evidence only
                     append-only Outcome Decision

Care Circle = current authorized projection only
Audit Event = cross-cutting traceability, not access truth
```

此圖只表達 logical responsibility 與 cardinality 候選，不代表資料表、外鍵、Aggregate 或建立順序。

### 4.2 Candidate classification summary

以題目列出的 24 個候選概念計算：

- **First-version independent logical entity candidates：19**
- **Embedded／controlled vocabulary candidates：4**
- **Projection：1**
- **Product-decision-blocked entity form：0**

數量是 Review 分類，不是未來資料表數量。內嵌 vocabulary、projection 及候選 entity 仍可能在 Physical Model 合併或拆分。Professional Identity／Verification 可能在後續拆成 identity fact 與 append-only verification events；目前仍算一個候選領域。Care Circle 始終只是 projection，不因 physical representation 改變而成為第二份 access truth。

## 5. Candidate Logical Entities — responsibility and lifecycle

| Candidate | Classification／v1 | Single responsibility | Logical identity and lifecycle | Cardinality candidates | Immutable history／derived state |
|---|---|---|---|---|---|
| Limited Person Reference | Independent candidate／v1 | 最低限度指涉 Case 涉及的現實人物，不作全平台真人主檔 | 第一版採 Case-scoped 不透明 reference；建立、受治理帳號連結、爭議；不得用自然屬性當 identity | 每個 reference 第一版只屬一個 Case；可與 0..n Accounts 有受治理連結；跨 Case resolution Deferred | 連結／爭議歷史不可覆寫；「是否同一真人」不得衍生 |
| Account Identity | Independent logical reference／v1 | 表示可登入及可追溯的帳號身分 | 穩定 account reference；verified／disabled／deleted 等生命週期，正式狀態 Deferred | 一個 Account 可有 0..n identity／person links 與 Case paths | 歷史 actor attribution 不可隨帳號刪除；目前可登入性可由帳號事實衍生 |
| Care Case | Independent candidate／v1 | 承載一位 Care Recipient 的協作及治理生命週期 | Case-scoped opaque identity；DRAFT、啟用、暫停／治理恢復、結束語意待決 | 每 Case 恰好一 Care Recipient Role；0..n generations／content | Case 不隨建立者刪除；有效性可能由狀態及治理事實衍生 |
| Care Recipient Role | Independent case-scoped candidate／v1 | 指定該 Case 圍繞誰進行照顧協作 | Case-scoped role identity；建立後不得以另一人覆寫 | Care Case 1:1；指向一個 limited person reference | 原 recipient attribution 必須保留；更換 recipient 不應作一般 update |
| Authorization／Declaration | Independent append-only candidate／v1 | 記錄誰聲明已具備啟動或治理依據，以及聲明版本 | 每次聲明為新 generation／event；可失效、遭拒或被取代 | Case 0..n declarations；每次連到 declarant identity | 原聲明、版本、結果不可覆寫；有效聲明可由最新受治理結果衍生 |
| Invitation | Independent candidate／v1 | 向指定可信接收者提出加入關係的請求 | 每次 credential generation 有獨立 identity；接受／拒絕／撤回／逾期／重送 | Case 0..n；可產生最多一組新 membership／relationship generations | 舊 credential 與結果保留；逾期可由 deadline 衍生 |
| Membership Generation | Independent candidate／v1 | 保存某 identity 參與特定 Case 的一段週期 | 每次加入為新 generation identity；pending、有效、暫停、終止語意待正式化 | Case 0..n；Account／Identity 0..n；每 generation 有 1..n relationships 候選 | 開始、終止、原因不可覆寫；目前有效性由狀態、期間及必要條件衍生 |
| Relationship Generation | Independent candidate／v1 | 說明 Membership 為何與 Case 有關 | 每段 Family／Service relationship 為新 generation；重新加入不復活 | Membership 1..n；每 relationship 0..n grants | 類型、目的、期間、結束原因不可覆寫；有效性可由時間及狀態衍生 |
| Family Relationship | Embedded specialization／v1 | 描述家庭／照顧關係語意，不證明法律代理 | 作 Relationship 的受控 subtype／details；正式 vocabulary blocked／expert | 每 Relationship 恰一 subtype；Person／Case 關係不推導 authority | 自我聲明與更正歷史需保留；法律效力不可衍生 |
| Service Relationship | Embedded specialization／v1 | 描述個別專業人員對 Case 的服務目的及期間 | 作 Relationship 的受控 subtype／details；開始、到期、撤銷、新 generation | 每 Relationship 恰一 subtype；可依賴 professional identity condition | 服務來源聲明、目的、期間不可覆寫；到期可由 clock 衍生 |
| Professional Identity／Verification | Independent candidate family／v1 | 保存專業身分聲明及其獨立驗證歷程 | Professional identity reference + append-only verification decisions；不等於 Case access | Account 0..n professional identities；identity 0..n verification events | 每次驗證、拒絕、失效不可覆寫；目前 verification 可由最新有效決定衍生 |
| Role／Capability | Controlled vocabulary／v1 | 定義可被 Grant 引用的角色語意與細粒度操作能力 | 受版本治理的 vocabulary；不是使用者 permission instance | Grant 引用 1..n capabilities；職稱不自動映射全部能力 | vocabulary version 保留；是否具能力只能由 Grant path 判斷 |
| Grant Generation | Independent candidate／v1 | 在 purpose、capability、scope ceiling、期間內授權一條 relationship path | 每次授予／變更建立新 generation；到期、撤銷、supersede | Relationship 0..n grants；每 operation 恰由一條完整 path通過 | 授予者、上限、期間、撤銷原因不可覆寫；有效性可衍生 |
| Acting Context | Embedded operation snapshot／v1 | 記錄本次操作實際採用的唯一完整 path | 不作可任意切換的長期角色；嵌入被保留的 operation／content／audit attribution | 每受保留操作恰一 context；一 path 可被多次使用 | 操作當時 identity、relationship、purpose、scope、capability 脈絡不可覆寫 |
| Care Update／Source Envelope | Independent source candidate／v1 | 保存作者、雙時間、來源、acting context、scope 與版本 lineage | Source identity 穩定；draft 可編輯，發布後以 versions 演進 | Source 1..n versions；可有 0..n semantic contents／references | published lineage 不可覆寫；目前採用版本可由受治理指標衍生 |
| Content Version／Revision | Independent append-only candidate／v1 | 保存 Correction、Addendum、Withdrawal、Supersede 的具體版本事實 | 每次發布建立 version identity；版本關係不可變 | Source 1..n versions；version 0..n inbound references | 原文、作者、時間、理由不可覆寫；withdrawn／current 可由 revision graph 衍生 |
| Source Reference | Independent link candidate／v1 | 固定下游內容建立時引用的特定來源版本 | Link identity 或來源＋目標的邏輯唯一性候選；建立後不可自動 retarget | 一下游 0..n references；一 version 0..n downstream links | pinned version 與建立者保留；目前能否查看來源需重新授權 |
| Observation | Independent semantic content candidate／v1 | 保存可觀察事實／主述，不表達診斷 | Observation identity 連到 source envelope／published version；後續只追加更正 | Source 1..n semantic items 候選；Question／Action 可引用其 version | 原觀察及來源不可覆寫；是否仍為目前依據由 revision 語意衍生 |
| Question | Independent candidate／v1 | 保存需回答、釐清或確認結果的問題 | Question identity；提出、回答／評估、可能 reopen，正式 lifecycle blocked | Question 0..n Actions；0..n source references | 原問題、作者、回答／結果事件保留；resolved 不從 Action completion 衍生 |
| Action | Independent candidate／v1 | 保存需完成的具體工作 | Action identity；建立、可待指派、進行、完成／終止，正式狀態 Deferred | 最多 1 primary Question；0..n source refs；0..n cycles | 工作目的與 completion 歷史保留；current responsibility 由 cycles 衍生 |
| Responsibility Cycle | Independent append-only candidate／v1 | 保存一次指派、接受／拒絕、開始及結束責任週期 | 每次指派新 cycle identity；不可覆寫舊 assignee | Action 0..n cycles；同時最多 1 current effective cycle | 指派者、被指派者、時間、原因不可覆寫；current cycle 可衍生 |
| Outcome Decision | Independent append-only candidate／v1 | 表達對 Question／原問題／後續安排的受治理結果 | 每次明確確認建立獨立且不可變的 decision identity；不覆寫舊決定 | Question 0..n Outcome Decisions；可建議新 Action，但不自動建立 | 確認者、acting context、特定可見來源、時間與結果語意保留；目前結果由仍有效且時間最新的決定推導 |
| Audit Event | Independent append-only candidate／v1 | 保存高風險治理、授權及狀態操作的可追溯事實 | 每事件獨立 identity；append-only | 可指向一個主要 target 及必要 context；不得成 access truth | 全部 audit facts 不可覆寫；目前狀態不能只由不完整 audit 推定 |
| Care Circle projection | Projection／v1 UI | 顯示查看者當下可見的有效成員、關係及授權結果 | 沒有獨立 Domain lifecycle；technical cache／ID Deferred | 每 Case／viewer 產生一投影；來源為有效 generations | 不保存第二份 member truth；歷史由 Membership／Relationship／Grant 保留 |

### 5.1 Candidate-specific integrity, sensitivity and failure behavior

| Candidate | Future integrity requirement（logical only） | Sensitive information | Duplicate-truth risk | Deletion／expiry／revocation／rejoin behavior |
|---|---|---|---|---|
| Limited Person Reference | 禁止自然屬性自動 merge；受治理 linkage | 可識別人物的最低資料 | 與 Account／recipient profile 重複 | Account deletion 不刪 reference；爭議 linkage 留痕 |
| Account Identity | 穩定歷史 reference 不得被新同 Email 帳號接管 | 登入及驗證狀態 | 被誤作 Person master | deletion 停止登入，attribution 保留；重建帳號不恢復舊 access |
| Care Case | 恰一 recipient role；不 cascade from creator | 個案存在、治理狀態 | Case summary 與內容各自成 truth | 建立者刪除不刪 Case；abandon 與 authorization rejection 採已接受的不同治理語意 |
| Care Recipient Role | Case 內恰一且不可一般覆寫換人 | 被照顧者顯示及識別脈絡 | 與 Person／Case subject 欄位重複 | Account 變化不影響；疑似錯置須治理，不自動 merge |
| Authorization／Declaration | 每次聲明及決定 append-only；啟用條件一致 | 授權主張、版本、爭議 | Case status 被當成聲明 truth | rejected／superseded 保留；declarant deletion 不抹除歷史 |
| Invitation | intended recipient、credential generation、接受結果一致 | recipient binding、目的、期間 | 接受狀態複製到 Membership | expiry／revocation 禁止接受；resend 新 generation；不恢復舊 credential |
| Membership Generation | 每次加入新 generation；pending 不作 access | Case participation fact | 與 Relationship／Circle member 重複 | 終止即失去 path；rejoin 建新 generation；歷史保留 |
| Relationship Generation | subtype、purpose／period 與 Membership 對應一致 | 家庭／服務關係及原因 | relationship kind 被塞回 Membership | expiry／revocation 終止 path；rejoin 新 generation |
| Family Relationship | vocabulary 不推導 authority／legal agency | 親屬／照顧關係聲明 | 與法律代理 declaration 混用 | 更正保留聲明歷史；關係失效不刪既有 attribution |
| Service Relationship | 必須有 purpose、period、個別 professional subject | 服務單位聲明、服務期間 | 與 professional verification／Grant 混用 | 到期立即停未來 access；轉職／重返建立新 generation |
| Professional Identity／Verification | 驗證決定 append-only；verification 不作 Case access | 資格、驗證證據及結果 | 職稱、資格與 permission 合併 | expiry／rejection 使條件不可用；重新驗證不復活舊 Case path |
| Role／Capability | vocabulary version 與 Grant 引用一致 | 通常低敏感；組合可透露職務 | Role 被當成 direct permission | vocabulary 變更不改寫舊 Grant；新授權引用新版本語意 |
| Grant Generation | purpose、capability、scope、period、issuer 完整；不得 path stitching | 權限範圍及目的 | copied ACL／Circle truth | 到期／撤銷即失效；rejoin 建新 Grant generation |
| Acting Context | 每項需追溯的操作恰一完整 path snapshot | 角色、關係、目的、scope 脈絡 | page-level active role 被當歷史 truth | Account／path 後續失效不改寫舊 context，也不保留 access |
| Care Update／Source Envelope | published source identity 與 lineage 穩定 | 作者、時間、來源、scope | metadata 在 Observation／Record 重複 | author deletion 保留 attribution；withdrawal 不刪 source |
| Content Version／Revision | revision graph 不可循環／自動覆寫；published append-only | 照顧內容及更正理由 | current text 覆蓋 version history | withdrawal／supersede 保留所有 versions；access 仍逐次重算 |
| Source Reference | 必須指向特定 version；不得自動 retarget | link 本身可能透露敏感來源存在 | downstream copy 取代 pinned reference | 來源失權後顯示一般化不可查看；link history 保留 |
| Observation | 來源、作者、雙時間與 scope 必須可追溯 | 健康／照顧觀察與主述 | 與 source version 保存兩份原文 | 更正只追加 version；作者失權不刪 observation |
| Question | lifecycle 不由 Action completion 推導；direct Question 與 reopen 採已接受的追加式規則 | 問題、來源及可能健康脈絡 | resolved 同時存於可修改 status／Outcome Decision | 提問者失權不刪歷史；reopen 追加決定且不得覆寫舊結果 |
| Action | 最多一 primary Question；current responsibility 只由 cycles 得出 | 工作內容、來源、責任脈絡 | current assignee／status 與 cycle 重複 | assignee 失權不刪 Action；轉待重新指派；completion 保留 |
| Responsibility Cycle | 同時最多一 current effective cycle；每次 reassignment 新 cycle | 指派者、責任人、拒絕／終止原因 | Action 上另存可獨立修改的目前負責人快照，形成第二 truth | 到期／撤銷結束舊 cycle；新 assignee 建新 cycle |
| Outcome Decision | 確認者需 capability、purpose、source visibility；每次決定 append-only | 結果判斷、依據及轉介建議 | 被折疊成 Question／Action status，或另存可修改的 current outcome | confirmer 失權不刪 decision；後續改判追加新 decision；目前結果由有效決定推導 |
| Audit Event | append-only、target／actor／time 完整；不作授權來源 | 高風險操作及安全脈絡 | audit log 被當 current state | actor deletion 保留 attribution；retention 需法律審查 |
| Care Circle projection | 必須完全由 current authorized facts 計算 | 成員存在、關係及可見角色 | persisted member list 成第二 truth | expiry／revocation 即消失；rejoin 由新 generations 重新投影 |

## 6. Candidate Entities — integrity, sensitivity and failure behavior

| Candidate group | Future integrity／transaction need（not implementation） | Sensitive data | Duplicate-truth risk | Account deletion／expiry／revocation／rejoin behavior |
|---|---|---|---|---|
| Person／Account／Recipient | Exactly one recipient per Case；governed account-person linking；no natural-key merge | 身分連結、顯示名稱、可能識別資料 | Account 被誤作 Person master；recipient data duplicated in Case | Account deletion leaves stable attribution；recipient and Case remain；new account link is governed |
| Care Case／Declaration | DRAFT activation requires accepted declaration／governance conditions；last governor protection | 授權聲明、治理爭議 | Case status與declaration status互相代替 | Abandoned／rejected 已分流；保存期限 Deferred；Case never cascades from account |
| Invitation | Single intended recipient；one credential generation effective；acceptance does not imply access | recipient binding、邀請目的、期間 | invitation status copied into membership | Expiry blocks acceptance；resend creates new credential；history remains |
| Membership／Relationship／Grant | Generations separated；one complete path；no cross-path stitching；period consistency | 關係、服務單位聲明、scope、capabilities | relationship embedded in membership；Grant copied into UI member list | Any required fact invalid stops access；rejoin creates three new generations |
| Professional verification | Verification independent from Case relationship and Grant | 資格聲明、驗證證據／結果 | verification treated as permission | Expiry removes professional condition, not history；reverify does not restore old Case path |
| Source／Version／Observation | Published versions append-only；revision graph valid；specific version pinning | 照顧觀察、主述、專業內容 | source metadata duplicated across semantic objects | Author account deletion preserves attribution；withdrawal restricts current reliance, not history |
| Question／Action／Cycle／Outcome Decision | Cardinality enforced；max one effective cycle；completion separated from resolution；outcome authority | 問題、處理內容、責任人、結果 | current assignee duplicated on Action；Outcome Decision 被複製成可修改的 Question status | Assignee loss closes cycle and requires reassignment；old cycles remain; no access from history |
| Audit／Circle | Audit append-only；Circle derived at read time／controlled projection | 操作脈絡、成員可見性 | audit used as current truth；Circle persisted independently | Expiry removes projection visibility; audit remains under separate authorization |

## 7. Seven remaining product questions

以下七項已取得產品方 disposition。Recommendation 段落保留替代方案比較的理由；正式 disposition 以各節的 **Accepted** 文字及 7.8／7.9 為準。

### Q1. 無來源 Question 的最低必要脈絡

**Alternatives：**

- A. 禁止無來源 Question。
- B. 允許，但要求 case-scoped subject、提出目的、最低必要問題文字、作者／acting context、scope 與時間。
- C. 允許完全自由文字。

**Accepted（PD-LDM-04）：B。** 第一版允許直接提出 Question，但須明確標示「直接提出的問題」，保存 Case context、作者與 Acting Context、使用目的、分享範圍、提出時間及足以理解問題的最低必要文字。不得虛構 Observation、外部來源、專業評估或診斷。後續取得來源時只能新增明確 Source Reference，不得改寫原始 Question 的來源歷史。

**Disposition：Logical Model Freeze blocker closed。** Source Reference 對 Question 為 `0..n`；無來源 Question 仍有明確的最低 context truth。

### Q2. Family Relationship vocabulary

**Alternatives：**

- A. 只用單一 FAMILY，不記細分類。
- B. 小型受控 vocabulary，加「使用者自述／未驗證」，且不推定法律代理。
- C. 詳細親屬、代理及同意 taxonomy。

**Accepted with constraints（PD-LDM-08）：B。** 第一版採小型受控 vocabulary，所有家庭關係均標示為使用者聲明或未驗證，不推定法律代理、監護、同意權或完整資料權限；關係名稱不直接產生 Grant。

**Disposition：Migration 前 Freeze；需要法律／場域專家。** Logical Model 保留 Family subtype boundary；正式臺灣長照用語尚未凍結。

### Q3. DRAFT 放棄及授權遭拒

**Alternatives：**

- A. 直接刪除 DRAFT。
- B. 保留最低治理歷史並進入不可協作的 abandoned／authorization-rejected 語意。
- C. 無限期保留可編輯 DRAFT。

**Accepted with constraints（PD-LDM-05）：區分兩類治理結果。**

- **放棄未啟用 DRAFT：** 可追溯建立者只能放棄自己尚未啟用，且不存在 Invitation、Membership、分享或正式協作內容的 DRAFT。放棄後不得再作可用 Case；不永久保留不必要的高齡者或健康草稿內容，只保留最低治理事件，例如內部 reference、建立者、放棄時間與原因類型。
- **授權遭拒、撤回或爭議：** Case 不得啟用或繼續正式協作，不得新增 Invitation 或 Grant；授權聲明、拒絕／撤回／爭議及處理歷史保留。日後重新申請或恢復須新增授權決定事件，不得把舊聲明改回有效。爭議期間只允許最低治理及必要安全操作。

**Disposition：Logical Model Freeze blocker closed；保存與清除期間需要法律／隱私確認。** 正式狀態碼、保存天數與刪除技術仍 Deferred。

### Q4. 疑似重複 Care Case 的人工治理

**Alternatives：**

- A. 第一版完全不提供偵測或標示。
- B. 只允許有權者人工標示「疑似重複／待治理」，不合併、不互相洩漏內容。
- C. 自動比對並合併。

**Accepted with deferred execution（PD-LDM-09）：B；禁止 C。** 第一版只允許有權治理者人工標示「疑似重複、待治理」；不得自動比對、合併、轉移成員或整合內容，也不得向無權使用者透露另一 Case 存在。

**Disposition：Logical Model 可 Freeze；merge／split／cross-case transfer 全部 Deferred。** 若實作標示，須在 Migration 前另做產品、隱私與授權審查。

### Q5. Outcome 最終模型形式

**Alternatives：**

- A. Question／Action status 欄位。
- B. 獨立、不可變的 Outcome decision record，可保留多次判斷。
- C. 只存在 UI 計算，不持久化。

**Accepted（PD-LDM-06）：B。** Outcome 採獨立、不可變、追加式的 **Outcome Decision logical entity candidate**。Question 可有 `0..n` decisions；每筆保存確認者、Acting Context、時間、結果語意及所依據的特定可見來源版本。新決定不覆寫舊決定；目前結果由仍有效且時間最新的 decision 推導，不另存第二份 current truth。

Outcome Decision 不修改 Question、Action 或 Responsibility Cycle 歷史，Action Completion 不自動建立 decision；「建議轉介」也不表示正式轉介已完成。是否對應單一 physical table Deferred。

**Disposition：Logical Model Freeze blocker closed。**

### Q6. Question reopen 語意

**Alternatives：**

- A. 覆寫 Question 為 open。
- B. 保留每次 resolution／reopen decision，Question 的 current meaning 由事件序列衍生。
- C. 禁止 reopen，永遠建立新 Question 並連結舊 Question。

**Accepted（PD-LDM-07）：B，必要時另建 related Question。** Reopen 採追加式 decision history，不刪除或覆寫先前 resolution／Outcome Decision；保存操作者、Acting Context、時間、原因及新來源。只有具適當 capability 與完整有效 Grant Path 的角色可 reopen。

Reopen 不會重新開啟既有 Completed Action；需要新工作時必須建立新的 Action 與 Responsibility Cycle。若屬不同事件或新照顧問題，應建立新 Question，不反覆重開舊 Question。

**Disposition：Logical Model Freeze blocker closed；正式 reopen 狀態機與判斷門檻 Deferred。**

### Q7. 附件是否納入第一版

**Alternatives：**

- A. 第一版排除附件。
- B. 第一版支援受控圖片／文件附件。
- C. 只保存外部連結。

**Accepted for first-version exclusion（PD-LDM-10）：A。** 第一版不提供照片、PDF、醫療文件或其他檔案上傳，也不設計 Storage、附件分享或附件權限。Prototype 若出現附件圖示，須標示未實作或移除。

**Disposition：Logical Model 可 Freeze；附件 Deferred。** 未來加入前須另做 Storage、Privacy、Retention、Malware 與 authorization review。

### 7.8 Blocker summary

| Question | Freeze classification | Current disposition |
|---|---|---|
| Q1 無來源 Question | **Accepted** | 允許直接提出；最低 context truth 必填；不得虛構來源 |
| Q2 Family vocabulary | **Accepted with constraints／Migration 前＋Expert** | 小型聲明式 vocabulary；正式詞彙未凍結 |
| Q3 DRAFT abandoned／rejected | **Accepted with constraints／Expert retention** | 放棄與授權拒絕／撤回／爭議分流；保存期限 Deferred |
| Q4 Duplicate Case governance | **Accepted with deferred execution** | 僅人工標示；禁止自動 merge／transfer |
| Q5 Outcome form | **Accepted** | 獨立、不可變、追加式 Outcome Decision candidate |
| Q6 Question reopen | **Accepted with deferred state machine** | 追加式 reopen decision history；不重開 completed work |
| Q7 Attachments | **Accepted first-version exclusion** | 第一版不建附件／Storage 模型 |

### 7.9 Product Decision Log

| Decision | Disposition | Logical model effect | Still Deferred／Expert |
|---|---|---|---|
| PD-LDM-01 Option B | **Accepted** | WinWin 新模型為 authoritative side；既有資料並存，bridge 禁止雙向同步同一 truth | Bridge physical design、migration、data movement |
| PD-LDM-02 Case-scoped Limited Person Reference | **Accepted** | 第一版每 reference 只屬一 Case；不建 global person master | Governed account linking evidence；cross-case resolution |
| PD-LDM-03 24-concept classification | **Accepted with physical flexibility** | 19 independent candidates、4 embedded／vocabulary、1 projection | Physical merge／split；不等於 table count |
| PD-LDM-04 Direct Question | **Accepted with minimum context** | Source Reference 為 `0..n`；無來源時保留直接提出標記及 context | 正式欄位與 UI |
| PD-LDM-05 DRAFT／authorization failure | **Accepted with constraints** | 放棄與拒絕／撤回／爭議有不同 lifecycle semantics | 狀態碼、保存天數、法律／隱私確認 |
| PD-LDM-06 Outcome Decision | **Accepted** | Outcome 成為獨立 append-only logical entity candidate | Physical representation |
| PD-LDM-07 Question reopen | **Accepted with deferred state machine** | Reopen 追加決定歷史，不覆寫舊 Outcome 或重開舊 Action | 判斷門檻及正式狀態機 |
| PD-LDM-08 Family vocabulary | **Accepted with constraints** | 小型聲明式 vocabulary；不產生 Grant | Migration 前 Freeze；臺灣長照／法律確認 |
| PD-LDM-09 Duplicate Case | **Accepted with deferred execution** | 只允許人工疑似重複標示；Case 仍完全隔離 | merge／split／cross-case transfer |
| PD-LDM-10 Attachments | **Accepted first-version exclusion** | 第一版 Logical Model 不含附件與 Storage | 未來獨立安全及隱私 review |

## 8. Logical Invariants

下列為 future logical／integrity requirements，不指定 constraint 或 transaction 實作：

1. 每個 Care Case 在其生命週期內恰好對應一個 Care Recipient Role；不得以一般更新換成另一人。
2. Care Case 不以建立者 Account 作生命週期根，帳號刪除不刪 Case。
3. Limited Person Reference 不使用姓名、生日、Email 等自然屬性作跨 Case 自動 identity resolution。
4. Invitation 只建立加入請求；接受也不自然等於有效 Membership、Relationship 或 Grant。
5. Membership、Relationship、Grant 各有獨立 generation identity 與生命週期。
6. pending verification、future start、無有效 relationship 或無 grant 時不得形成可用 path。
7. 每次操作只能由一條包含 identity、有效 Membership、有效 Relationship、purpose、capability、scope 與期間的完整 path 通過。
8. 不得拼接多條 path；Acting Context 保存實際採用的一條 path。
9. Membership、Relationship、Grant、identity condition 或期間任一必要條件失效，未來存取立即停止。
10. 重新加入建立全新的 Membership、Relationship、Grant generations，不改寫或復活舊 generation。
11. Care Circle 只由當下有效 facts 投影，不可成為第二份 access truth。
12. Role／職稱與 professional verification 都不直接產生 Case capability。
13. 管理 capability 與敏感內容 scope 分離；治理操作只取得最低必要資訊。
14. Draft 可以編輯；published content 只能以 Correction、Addendum、Withdrawal、Supersede 追加版本。
15. 原始 published version、作者、雙時間、acting context、scope 與 revision lineage 不可覆寫。
16. 下游 Source Reference 固定特定版本，不自動 retarget 到最新版。
17. 下游 Question、Action、Cycle、Outcome Decision、摘要、搜尋與通知不得擴大來源可見範圍。
18. Observation 只保存觀察／主述；專業評估須有明確來源與目的，且不等於正式診斷。
19. Question 與 Action 使用獨立生命週期；Question 可連結 0..n Actions，Action 最多一個 primary Question，也可獨立存在。
20. 同一 Action 同一時間最多一個目前有效 Responsibility Cycle；技術 enforcement Deferred。
21. 每次重新指派建立新 cycle，舊 assignee、接受／拒絕、處理時間及結束原因不可覆寫。
22. Assignment 不建立 Membership、Relationship 或 Grant。
23. Action Completion 不自動產生 Question Resolution 或 Outcome Decision。
24. Outcome 必須由適當完整 path 與必要來源可見性的人明確確認；每次確認建立獨立、不可變、追加式 Outcome Decision。
25. 帳號刪除、服務到期或撤銷不刪歷史 actor、source、generation、cycle 或 outcome attribution。
26. Audit Event 是追溯證據，不單獨成為目前 access truth。
27. 任何 current state projection 都必須可追溯到單一權威 facts，不得與 source entities 雙寫。
28. 無來源 Question 必須標示為直接提出，保存最低 Case context、作者、Acting Context、目的、scope、時間與問題文字；後續來源只新增 reference。
29. 未啟用且從未進入正式協作的 DRAFT 可被建立者放棄；放棄後不得作可用 Case，並只保留最低治理事件。
30. 授權拒絕、撤回或爭議不得覆寫原聲明，也不得新增 Invitation／Grant；重新申請須新增授權決定事件。
31. Question reopen 必須追加 reopen decision，保留舊 Outcome Decisions；不得自動重開 completed Actions。
32. 疑似重複 Care Case 只能由有權者人工標示，不得自動比對、合併、轉移或向無權者洩漏另一 Case。
33. 第一版 Logical Model 排除附件與 Storage，不得以未審查的外部連結規避附件授權邊界。
34. WinWin 新模型是 WinWin truth 的 authoritative side；任何 bridge 必須單向且不得與既有模型雙寫同一 truth。

## 9. Walkthroughs

### 9.1 家屬建立無帳號長者個案

- 家屬 Account 建立 Case DRAFT 與 case-scoped Limited Person Reference／Care Recipient Role。
- 建立者不是 Care Recipient、法律代理或永久治理者。
- Authorization Declaration 保存聲明，不宣稱已驗證法律文件。
- 未啟用且沒有 Invitation、Membership、分享或正式協作內容的 DRAFT 可由建立者放棄，只保留最低治理事件；授權拒絕／撤回／爭議則保留完整決定歷史並禁止正式協作。
- Account 刪除不能 cascade Case 或 recipient history。

**Logical result：PASS；保存與清除期間仍需法律／隱私確認。**

### 9.2 長者日後連結帳號

- 新 Account Identity 透過受治理流程連到既有 Limited Person Reference。
- 不建立新 Care Recipient Role，也不因屬性相似自動連結。
- 連結不自然賦予治理或全部內容權限；仍需有效 path。
- 原作者與舊治理歷史不被新帳號覆寫。

**Logical result：PASS；正式 identity evidence 需 Expert。**

### 9.3 個別專業人員接受邀請但等待驗證

- Invitation 接受保存新的 pending Membership／Service Relationship generations。
- Professional Identity verification 尚未成立，因此不建立可用 Grant path，也不進 Care Circle。
- 只能查看自身最低必要關係狀態，不得看到 Case name inference、content、counts 或 member list。
- 驗證通過後仍須重新判斷 relationship、期間及 Grant，不自動取得所有權限。

**Logical result：PASS。**

### 9.4 服務開始與到期

- Service Relationship 有 purpose、start／end；Grant 有獨立期間與 scope ceiling。
- 開始前 path 不可用；開始後只有全部條件有效才可操作。
- deadline 到達後未來 access 立即停止，Care Circle projection 移除該有效關係。
- 歷史 source、actor、Grant generation 與 cycles 保留；重新加入建立新 generations。

**Logical result：PASS。**

### 9.5 皮膚異常完整協作鏈

- 有完整 path 的照顧人員建立 Care Update、published Observation version。
- Question 以 Source Reference pin 該版本；不自動建立 Action。
- 可建立護理評估與後續觀察兩個 Actions，各自有 Responsibility Cycles。
- 完成 Action 不解決 Question；Outcome Decision 由有權者依可見來源明確確認。
- 來源更正建立新 version，舊 link 不自動改寫。

**Logical result：PASS；Outcome Decision 已採獨立追加式候選。**

### 9.6 Question 對應多個 Actions

- Question 可直接提出並保留最低 context，也可 pin 一或多個來源版本；後補來源只新增 reference。
- Question 對 Action 為 0..n；每 Action 最多一 primary Question。
- 每 Action 可引用各自需要的來源版本及較窄 scope。
- 每 Action 有獨立 cycles，任一完成不改變其他 Action 或 Question resolution。
- 若後續有權者 reopen Question，須新增 reopen decision；既有 Outcome Decisions 及 completed Actions 保持不變，需要工作時另建新 Action／cycle。

**Logical result：PASS。**

### 9.7 負責人失權與重新指派

- Membership／Relationship／Grant 或期間失效時，舊 current cycle 以失權原因結束。
- Action 保持未完成並呈現需要重新指派；不得自動選新 assignee。
- 治理者只看最低必要重新指派資訊；新 assignee 必須已有完整 path。
- 新 Assignment 建立新 cycle，不覆寫舊責任歷史。

**Logical result：PASS。**

### 9.8 已發布 Observation 更正

- 原 published version 不變；Correction／Addendum／Withdrawal／Supersede 建立新 version relationship。
- 下游 Question／Action 繼續 pin 原版本，僅向仍有權者提示來源更新。
- 人工採用新版本時建立新 Source Reference，兩段歷史都保留。

**Logical result：PASS。**

### 9.9 帳號刪除但保留歷史

- Account 變成不可登入／deleted reference，不刪 Limited Person Reference、Case 或 content。
- Observation author、Invitation actor、Grant issuer、cycle assignee、Outcome Decision confirmer 仍由穩定 attribution 顯示。
- 歷史 attribution 不授予持續 access，也不允許以新同 Email 帳號自動接管。

**Logical result：PASS；顯示與保存期限需法律審查。**

### 9.10 疑似重複 Care Case

- 兩個 Cases 維持不同 identity、recipient roles、access paths 與 content spaces。
- 不以姓名或生日自動比對／合併，也不互相顯示敏感摘要。
- 可選人工「疑似重複」治理標示，但 merge／split、證據與 rollback Deferred。

**Logical result：PASS without merge；Q4 可延後。**

## 10. Existing Asset Compatibility

| Asset | Classification | Candidate reuse | Incompatibility／required review |
|---|---|---|---|
| Frontend Prototype | Candidate UX／flow reuse | Identity、Invitation、Workspace、guards、Question／Action separation、correction UX | In-memory shapes、current assignee、Circle list、status enums 不是 logical truth |
| Migration 007 | Access-foundation reference only | actor attribution、Case、Declaration、Invitation、Membership／Grant、access-event patterns | Membership 混入 Relationship；acceptance／activation coupling；缺 source、content version、cycle、Outcome Decision |
| Migration 008 | Identity／capability reference only | identity verification separation、capability vocabulary、grant template history candidates | template／enum 不凍結；Relationship generation、content authorization 與 Phase 3 entities 不完整 |
| Migration 001–006 | **備份心；不納入** | repository history／v1 regression only | Coverage、Scenario、Backup Assignment、handoff 不得 bridge 成 WinWin entities |
| Professional Record Prototype | UX candidate | append-only correction、acting context、family projection | 不代表正式 record model；scope、source envelope、retention 需重審 |

### 10.1 Bridge rules

- WinWin 新模型是 WinWin 功能的 authoritative side；Migration 007／008 及 Prototype 都不是平行 authoritative truth。
- Bridge 不得雙向同步同一 truth。
- 每項 bridge 必須指定 authoritative side、mapping version、failure behavior 與 rollback boundary。
- 不得為了沿用 existing IDs 而合併概念責任。
- 未證明 semantic equivalence 的 existing row 不得自動成為新的 Membership、Relationship、Grant、Question 或 Action。
- Migration 007／008 的 local verification 只證明既有 SQL contract，不證明符合本 Logical Model。

## 11. Migration Risks

1. **Semantic collision：** existing membership relationship kind 可能使 Relationship 無法獨立 generation。
2. **Activation coupling：** invitation acceptance 原子建立 access 可能跳過 verification／future start waiting state。
3. **Identity ambiguity：** actor、account、person reference 若直接對映會造成真人／帳號混淆。
4. **Enum lock-in：** existing role／capability enums 可能讓職稱變成自然 permission。
5. **Dual truth：** coexistence 若雙寫 current state，會讓 bridge 與新 model 分歧。
6. **Historical flattening：** 將舊 membership／grant update 成新 generation 可能遺失期間與撤銷歷史。
7. **Content scope laundering：** source、downstream link、summary 沒有獨立授權判斷可能擴權。
8. **Current assignee duplication：** Action current assignee 與 Responsibility Cycle 同時可改會分歧。
9. **Outcome collapse：** 以 Question／Action status 代替 Outcome Decision 會破壞 completion／resolution separation。
10. **Rollback ambiguity：** 新模型寫入既有 v2 tables 會讓回滾無法區分 source of truth。

## 12. Legal／Field Expert Dependencies

- Account 與 Person reference 連結所需證據、本人爭議與撤回流程。
- Authorization Declaration 的法律用語、保存期限與不得過度宣稱界線。
- Family Relationship vocabulary、法律代理及適當授權者區分。
- Professional identity、資格、服務單位及 Case Service Relationship 的證明標準。
- DRAFT abandoned／authorization rejected 的資料清理與爭議保全期限。
- Observation、專業評估、建議、正式病歷／法定紀錄的場域界線。
- Outcome Decision 各類型需要何種 capability／purpose 的確認者。
- Correction、Withdrawal、Supersede 的專業責任與保存要求。
- 帳號刪除請求與歷史 attribution／audit 保留的合法基礎。
- 疑似重複 Case 標示、治理者可見資訊及 merge／split 的風險。

## 13. Deferred Entities and Technical Decisions

### 13.1 Deferred／excluded from first version

- Attachments（第一版明確排除；未來另行審查）。
- 組織管理員、組織目錄、機構級 Case workspace 與法人治理。
- 跨 Case Person resolution／global master person。
- Case merge／split execution model。
- 完整 Event Sourcing。
- Notification、chat、calendar、AI、GPS、health monitoring 等非核心模組。

### 13.2 Technical decisions still blocked

- 正式 ERD、table／column、keys、constraints、indexes。
- Aggregate、physical bounded contexts、partitioning。
- SQL、Migration、RLS、authorization helpers。
- RPC、API、transaction、idempotency。
- Database clock、locking、concurrency、max-one-cycle enforcement。
- Version graph、current projection、Care Circle materialization。
- Audit retention、search、notification、attachment storage。
- Remote Supabase apply、data migration、bridge backfill 與 deployment。

## 14. Product Decision Closure

原四項 Logical Model Freeze blockers 已全部取得明確 disposition：

1. **Q1 closed：** 允許直接提出 Question，最低 context 及後補來源規則已固定。
2. **Q3 closed：** 未啟用 DRAFT 放棄與授權拒絕／撤回／爭議採不同治理語意。
3. **Q5 closed：** Outcome 採獨立、不可變、追加式 Outcome Decision logical entity candidate。
4. **Q6 closed：** Question reopen 採追加式 decision history，不覆寫舊 Outcome 或重開 completed work。

其餘三項亦有唯一 disposition：Q2 在 Migration 前 Freeze 並保留 expert dependency；Q4 接受人工標示、延後 merge／split；Q7 第一版排除附件。

**Remaining Product Decision Blockers：0。** 仍存在的 expert／technical dependencies 不阻止進入 Final Read-only Logical Model Review，但會阻止未經後續 Gate 直接實作 Migration。

## 15. Gate Decision

**READY FOR FINAL READ-ONLY LOGICAL MODEL REVIEW — PRODUCT DECISIONS COMPLETE**

Review 結論：

- **Accepted architecture：Option B — clean independent WinWin core model with coexistence and controlled bridges。**
- 24 個候選概念已分類；19 個為第一版獨立 logical entity candidates、4 個為內嵌／vocabulary、1 個 projection；這不等於 physical table count。
- 核心授權、generation、append-only version、Responsibility Cycle 與 attribution invariants 可被 logical model 表達。
- 七項剩餘產品問題均已取得唯一 disposition；原四項 Product Decision Blockers 全部關閉。
- Outcome Decision 已成為獨立 append-only logical entity candidate；Question reopen 與 DRAFT governance 的 logical semantics 已固定。
- 法律／場域依賴仍明確存在，不得宣稱已完成法律、專業或場域驗證。
- ERD、Schema、Migration、SQL、RLS、API、transaction 與前端實作全部維持 **BLOCKED**。

本 Gate 不自行宣告 Logical Model 已 Freeze。只有下一輪 Final Read-only Review 判定 PASS，才可將文件標示為 Freeze-ready 並建立獨立 checkpoint。

## 16. Explicit Next Gate

下一步只能是 **WinWin Logical Data Model Final Read-only Review Gate**：

1. 驗證 PD-LDM-01 至 PD-LDM-10 disposition 唯一且全文一致。
2. 驗證 24-concept classification、19 independent candidates、4 embedded／vocabulary 與 1 projection 無重複真相。
3. 驗證 Outcome Decision、Question reopen、DRAFT governance、direct Question 與 first-version attachment exclusion 已完整反映於 invariants／walkthroughs。
4. 驗證 Q2 expert dependency 與所有 technical decisions 仍 Deferred。
5. 若 PASS，再建立獨立 Logical Model document checkpoint，才視為 Product-level Logical Model Freeze。

Checkpoint 後的下一個提案 Gate 才可比較 Physical Data Model／ERD alternatives；仍不得直接建立 Migration、SQL、RLS、API 或操作 Supabase。

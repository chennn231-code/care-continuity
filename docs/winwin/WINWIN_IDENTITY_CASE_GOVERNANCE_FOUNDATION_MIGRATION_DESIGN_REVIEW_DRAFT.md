# WinWin Identity／Case／Governance Foundation Migration Design Review

> **狀態：DRAFT — Foundation Scope Product Decisions Accepted; Pending Final Read-only Review**
>
> 本文件只界定第一階段最小 Foundation 的候選範圍、依賴及 enforcement responsibilities。它不是 Migration、SQL、RLS、RPC、API 或 Remote Apply 授權，也不表示任何候選 table／column／constraint 已正式核准。

## 1. Purpose and authority

本 Review 從 Frozen Physical Model 選出第一個可安全落地的最小範圍，並回答：在 Membership／Relationship／Grant 尚未實作前，WinWin 能否安全支援 Care Case，以及 Case activation 應落在哪一階段。

權威來源依序為：

1. [`WINWIN_PRODUCT_DEFINITION_BOUNDARY_V1.0.md`](WINWIN_PRODUCT_DEFINITION_BOUNDARY_V1.0.md)
2. [`WINWIN_CORE_OBJECT_MODEL_PHASE_1_DESIGN_REVIEW_DRAFT.md`](WINWIN_CORE_OBJECT_MODEL_PHASE_1_DESIGN_REVIEW_DRAFT.md)
3. [`WINWIN_CORE_OBJECT_MODEL_PHASE_2_DESIGN_REVIEW_DRAFT.md`](WINWIN_CORE_OBJECT_MODEL_PHASE_2_DESIGN_REVIEW_DRAFT.md)
4. [`WINWIN_CORE_OBJECT_MODEL_PHASE_3_DESIGN_REVIEW_DRAFT.md`](WINWIN_CORE_OBJECT_MODEL_PHASE_3_DESIGN_REVIEW_DRAFT.md)
5. [`WINWIN_CORE_OBJECT_MODEL_CONSOLIDATION_REVIEW_DRAFT.md`](WINWIN_CORE_OBJECT_MODEL_CONSOLIDATION_REVIEW_DRAFT.md)
6. [`WINWIN_LOGICAL_DATA_MODEL_DESIGN_REVIEW_DRAFT.md`](WINWIN_LOGICAL_DATA_MODEL_DESIGN_REVIEW_DRAFT.md)
7. [`WINWIN_PHYSICAL_DATA_MODEL_ERD_DESIGN_REVIEW_DRAFT.md`](WINWIN_PHYSICAL_DATA_MODEL_ERD_DESIGN_REVIEW_DRAFT.md)

Frontend Prototype 與 Migration 007／008 僅供相容性比較。Migration 001–006、Coverage、Scenario、Backup Assignment 與 handoff 屬於「備份心」，不決定本 Foundation。

## 2. Non-negotiable boundary

- Auth Account 與 Stable Actor 分離。
- Auth 刪除不得 cascade Case、Person Reference、作者或歷史。
- 不依 Email、姓名或 metadata 自動重連 Actor。
- Limited Person Reference 只在 Case scope 內成立。
- 每個 Care Case 第一版恰好一個有效 Care Recipient Role。
- Care Case 不依附 creator account；creator 不自然成為授權者或治理者。
- Invitation、Membership、Relationship、Grant 與 Assignment 仍保持分離。
- DRAFT 啟用前不得邀請、分享、建立正式協作內容或顯示 Care Circle。
- Authorization Declaration 與 append-only Decision history 分離。
- 接受授權聲明不等於建立 Membership、Relationship、Grant 或治理能力。
- DRAFT abandonment 採資料最小化。
- Care Circle 沒有 authoritative table。

## 3. Foundation scope alternatives

### 3.1 Option A — Pure structural Foundation

建立 Stable Actor、Auth Mapping Generation、Case-scoped Person Reference、Care Case 與 Care Recipient Role，共 5 個候選 tables。

**優點：** 範圍最小；不會誤建權限；容易 isolated dry-run。

**限制：** 無法保存授權聲明與決定；DRAFT 只能停留在非常早期；後續 activation 前仍需補治理歷史。

**風險：** application 容易以臨時 flag 或外部流程保存 authorization truth，造成未來重建。

### 3.2 Option B — Structural plus authorization-governance Foundation

在 Option A 加入 Authorization Declaration 與 Authorization Decision，共 7 個候選 tables。DRAFT abandonment 由 Case lifecycle／minimum tombstone facts 與既有 Declaration／Decision history 表達；一般化 Audit Event table 仍延後。

**優點：** 能安全保存 DRAFT、聲明與治理決定；不把 accepted declaration 誤寫成 access；不需提前建立半套 Membership／Grant。

**限制：** 嚴格 DRAFT-only；即使 authorization accepted，仍不能啟用協作。Decision writer eligibility、retention 與 deletion policy 仍需後續審查。

**風險：** UI／API 若忽略 DRAFT-only Gate，可能把 accepted authorization 呈現為 Active。必須 fail closed。

### 3.3 Option C — Early participation and authorization subset

在 Foundation 提前加入部分 Membership、Relationship、Grant 與最低 Audit。

**優點：** 理論上可同時完成 Case activation 與 first governor。

**風險：** 需要完整 generation、vocabulary、capability、clock、verification、RLS、last-governor、transaction 與 Audit security；只取部分會形成半套 Complete Grant Path，日後重寫風險高。Scope 已接近第二階段。

### 3.4 Option D — Foundation plus full second stage

一次建立 Identity／Case／Governance 及 Invitation／Membership／Relationship／Grant。

**優點：** 可在單一 release 設計完整 activation。

**風險：** Migration、RLS、transaction、rollback 與驗證面積過大；違反 Frozen Physical Model 的 staged implementation 原則，學生 MVP 難以提供足夠證據。

### 3.5 Comparison and recommendation

| Criterion | A Pure structure | B Structure＋governance | C Early access subset | D Foundation＋stage 2 |
|---|---|---|---|---|
| DRAFT safety | Strong | **Strong** | Mixed | Strong if complete |
| Authorization history | Missing | **Complete for Foundation** | Partial／mixed | Complete |
| Active Case support | No | **No by design** | Possible but risky | Yes |
| Half-model risk | Low | **Low** | High | Moderate |
| RLS／transaction scope | Smallest | **Proportional** | High | Very high |
| Rework risk | Authorization added later | **Lowest** | Highest | Moderate |
| MVP reviewability | High | **High** | Low | Low |

**Accepted（FND-PD-01）：Option B。** 第一階段只建立 7 個候選 Foundation tables，支援受限 DRAFT 與 authorization-governance history。Case activation、first governor、Invitation、Membership、Relationship、Grant、Care Circle 及正式 collaboration 全部留到第二階段的完整 transaction／RLS Gate。

此接受只固定 Foundation scope，不核准正式 Schema、table／column、constraint、Migration 或 implementation。

## 4. Included candidate tables（recommended Option B）

| # | Frozen candidate | Why included | Candidate PK／FK boundary | Required field groups | History／retention | Sensitivity | Client direct write | Future RLS facts |
|---|---|---|---|---|---|---|---|---|
| 1 | `winwin_actor_references` | Stable attribution 不依附 Auth | opaque actor PK；被 mapping／Case／declaration 引用 | actor kind、historical label、created time | 不因 account delete 移除 | Identity | 禁止一般 client create／rewrite | 只供 attribution；不能單獨授權 |
| 2 | `winwin_account_actor_links` | 登入帳號與 actor generation mapping | mapping PK；actor FK；Auth logical reference | actor、account ref、generation、linked time、status；optional end reason | 每段 link retained；relink 新 generation | Auth linkage | 只允許受控 identity flow | current authenticated actor input，不是 Case access |
| 3 | `winwin_person_references` | Case-scoped minimum recipient reference | person PK；owning Case FK candidate | Case scope、minimum display、created time | abandoned DRAFT 時最小化；不跨 Case merge | Direct identifier | 只能在受控 DRAFT transaction | 不能產生 access |
| 4 | `winwin_cases` | DRAFT lifecycle root independent of creator | Case PK；creator actor FK；recipient relation candidate | lifecycle meaning、creator、created time；optional abandonment／hold facts | DRAFT tombstone retained minimally；active semantics Deferred | Case existence／governance | 建立／abandon 需受控 transaction | creator 可讀 minimum DRAFT only；不構成 governor |
| 5 | `winwin_care_recipient_roles` | 每 Case 唯一 recipient role | recipient-role PK；Case FK；Person FK | Case、Person、established time | 不以一般 update 換人；錯置需治理 | Recipient identity | 與 DRAFT creation atomic | 只繼承 DRAFT minimum visibility |
| 6 | `winwin_authorization_declarations` | 保存版本化使用者聲明 | declaration PK；Case／declarant actor FKs；optional supersedes | claim type／version、statement time、acting context | published append-only；新申請新 history | Legal／authorization claim | 只能透過受控 declaration operation | Case governance input，不是 access fact |
| 7 | `winwin_authorization_decisions` | 保存接受／拒絕／撤回／爭議／恢復 | decision PK；Declaration／Case／decision actor FKs；prior reference candidate | decision meaning、time、reason category | append-only；current result derived | Legal／governance outcome | client direct write 禁止；trusted reviewer flow only | activation prerequisite之一，不能單獨授權 |

### 4.1 Candidate constraints and checks

- `winwin_account_actor_links`：每個 Auth user 及每個 Actor 同時間各最多一段 active mapping；interval 合法；不以自然人資料作 unique key。
- `winwin_person_references`：Case-scoped；不得跨 Case update／merge；abandoned DRAFT payload 最小化。
- `winwin_cases`：第一階段只允許受限 DRAFT、authorization-pending／rejected／disputed／abandoned 等治理語意；不可進入 collaborative Active。
- `winwin_care_recipient_roles`：Case 唯一 candidate；其 Person Reference 必須屬同 Case。
- Declarations：version／lineage 合法；published rows append-only。
- Decisions：target Declaration／Case 一致；append-only；current authorization 不另存可修改 truth。

正式 constraint、index、column 與狀態 code 均留待 Foundation Schema Draft Gate。

## 5. Deferred candidate tables

| Frozen candidate | Deferred stage | Reason |
|---|---|---|
| `winwin_invitations` | Stage 2 | DRAFT 不得邀請；需要 governor path |
| `winwin_membership_generations` | Stage 2 | activation／first governor transaction 的完整參與 truth |
| `winwin_relationship_generations` | Stage 2 | 不能與 Membership 或 Grant 半套實作 |
| `winwin_professional_identities` | Stage 2／identity sub-review | 專業驗證與 Case Foundation access 分離 |
| `winwin_professional_verification_events` | Stage 2／identity sub-review | 需要 reviewer、evidence、retention review |
| `winwin_role_definitions` | Stage 2 | Grant vocabulary；第一階段不授權 |
| `winwin_capability_definitions` | Stage 2 | Grant capability；第一階段不授權 |
| `winwin_grant_generations` | Stage 2 | Complete Grant Path 與 activation 核心 |
| `winwin_grant_capabilities` | Stage 2 | 不可脫離 Grant generation |
| `winwin_source_envelopes` | Stage 3 | DRAFT Foundation 不建立正式協作內容 |
| `winwin_content_versions` | Stage 3 | published collaboration content Deferred |
| `winwin_observations` | Stage 3 | typed content Deferred |
| `winwin_source_references` | Stage 3 | 無下游 content 前不需要 |
| `winwin_questions` | Stage 4 | 正式 collaboration Deferred |
| `winwin_question_decisions` | Stage 4 | Question lifecycle Deferred |
| `winwin_actions` | Stage 4 | 正式 work／assignment Deferred |
| `winwin_responsibility_cycles` | Stage 4 | 需完整 actor access／assignment model |
| `winwin_outcome_decisions` | Stage 4 | Question／Action foundation 尚未存在 |
| `winwin_audit_events` | Stage 5；可另提 change request | controlled polymorphic writer／ACL／target validation 需獨立安全審查；Foundation 先由 immutable decisions＋minimum tombstone correlation 保留必要治理歷史 |

Included 7＋Deferred 19＝Frozen 26 candidates。Care Circle 仍是 projection，沒有 table，也不在 Foundation 顯示。

## 6. DRAFT-only and activation dependency

### 6.1 Direct answers

1. **沒有 Membership／Relationship／Grant 時，Case 只能停在 DRAFT：YES。**
2. **Authorization accepted 等於可協作：NO。** 它只是 activation prerequisite，不建立參與或權限。
3. **First governor 如何建立：** 第二階段由 accepted authorization、有效 actor、Membership Generation、治理 Relationship Generation、治理 Grant Generation 與必要 capability 在受控流程中共同建立。
4. **Activation 與 first governor 是否同一 transaction：YES。** transaction 必須確保完成後要麼 Case Active 且至少一條完整有效 governance path 存在，要麼全部不成立。
5. **第一階段 UI／API 可允許：** 建立／查看自己的 minimum DRAFT、建立新版 declaration、查看允許公開給自己的 decision 結果、在符合資格時放棄 DRAFT、管理自己的 Auth mapping lifecycle。不得邀請、分享、寫正式內容、查看 Care Circle 或宣稱 Active。
6. **Activation 是否移至第二階段：YES。** 第一階段不可提供 activation endpoint 或 lifecycle transition。
7. **避免 Active 無治理者：** 第一階段 schema／workflow 不允許 Active；第二階段把 Case activation 與 first complete governance path 放在同一原子 transaction，並另設 last-governor protection。

### 6.2 Future activation invariant

```text
Collaborative Active Case
requires
accepted current authorization prerequisite
AND effective Membership Generation
AND effective Relationship Generation
AND effective governance Grant Generation
AND required governance capability
AND one complete non-stitched Grant Path
```

此公式只是 frozen invariant 的設計需求，不是 SQL helper 或 API。

## 7. DRAFT creation and abandonment walkthrough

| Step | Candidate writes | Atomic boundary | Retained／minimized | Must reject |
|---|---|---|---|---|
| First authenticated use | Actor＋Account Link，或取得既有 active mapping | mapping lookup／create must prevent duplicate active mapping | actor attribution＋mapping generations | auto-link by Email／name／metadata |
| Create DRAFT | Case＋Person Ref＋Recipient Role；creator actor reference | minimum Case／Person／Recipient creation atomic | minimum recipient draft＋creator／time | partial Case、more than one recipient、automatic governor |
| Submit Declaration | new Declaration version | declaration＋lineage validation | original declaration／author／acting context | overwrite published declaration |
| Pending decision | no access generation | none or controlled review queue | declaration history | invitation／sharing／formal content／Active label |
| Authorization rejected | append Decision | decision＋target Case／Declaration validation | declaration＋rejection＋review actor／reason | mutate declaration or activate Case |
| Authorization disputed／revoked | append Decision | ordered decision＋Case governance hold facts where applicable | all prior decisions | restore old decision by UPDATE |
| Authorization accepted | append Decision only | decision write controlled | accepted prerequisite | Membership／Grant／Active Case creation in stage 1 |
| Abandon eligible DRAFT | minimize Person／draft payload＋close Case／minimum correlation | verify never activated、no invite、no Membership、no sharing、no formal content；then minimize atomically | opaque Case ref、creator、create／abandon time、reason、operation correlation | abandon collaborative／shared Case；recover content afterward |
| Creator deletes account | close Auth mapping；retain actor／Case／history | unlink fail-closed；DRAFT remains inaccessible until governed recovery or eligible cleanup | actor attribution、Case／decision history | cascade delete；new account takeover |

## 8. Account lifecycle design

### 8.1 First login

- Resolve current Auth reference to at most one active mapping.
- If no mapping exists and no conflict exists, a controlled identity operation may create one Stable Actor and one active mapping generation.
- The operation must be idempotent under concurrent first-login requests.
- Stable Actor creation does not create a Case or access permission.

### 8.2 Deletion and detachment

- Ordinary account deletion flow first checks unresolved DRAFT ownership／governance obligations and presents truthful consequences.
- Direct platform-side Auth deletion closes or invalidates the mapping fail-closed; it never deletes actor／Case／content／decision history.
- Candidate Auth FK behavior is non-cascading；exact FK feasibility against platform-managed Auth requires Schema Review.
- Detached Actor remains usable for historical attribution but cannot authenticate.
- A new account can relink only through a separately governed identity recovery process with explicit evidence；same Email、name or metadata is insufficient.
- Relink creates a new mapping generation and preserves the old one.

### 8.3 Expert dependencies

Identity recovery evidence、disputed identity、deceased／incapacitated creator handling and retention need legal／field input. These do not justify automatic relink or access.

## 9. Constraint／transaction matrix

| Rule | Single-table constraint | Cross-table transaction | DB clock | RLS／auth helper | Application workflow | Expert／policy |
|---|---|---|---|---|---|---|
| Active Auth mapping unique | partial unique candidates per account／actor | idempotent create／close／relink | mapping interval | auth→actor resolver | first login／recovery | identity evidence |
| One Recipient Role per Case | unique Case candidate | Case＋Person＋Recipient atomic | no | DRAFT visibility helper | DRAFT creation | dispute process |
| Case／Person／Recipient consistency | FK candidates insufficient for all scope checks | **required** same-Case validation | no | helper must not grant from Person | DRAFT creation | no |
| DRAFT creator traceability | creator actor non-null candidate | create actor／mapping before Case | recorded time | creator minimum DRAFT visibility | truthful creator label | retention |
| Authorization append-only | update／delete prohibition candidate | declaration／decision lineage＋correlation | recorded／effective ordering | reviewer／self-safe result helper | submit／review | evidence effect |
| Current authorization derived | no mutable current-result column | ordered decision append | effective time if allowed | narrow current-decision helper | display prerequisite, not access | legal meaning |
| DRAFT cannot collaborate | lifecycle allow-list candidate | reject invitation／content／activation writes | no | helper returns no Case content path | hide／disable collaboration UI | no |
| DRAFT abandonment eligibility | no single-table proof | **required** verify no invite／membership／share／content then minimize | abandoned time | creator／restricted cleanup helper | irreversible warning | retention／erasure |
| Auth delete fail-closed | non-cascade candidate | close mapping＋retain actor；block takeover | deleted／ended time | no mapping means no authentication path | deletion warning | recovery evidence |
| Case activation dependency | no Active in stage 1 allow-list | stage 2 activation＋governance path atomic | validity intervals | complete Grant Path helper | no activation CTA in stage 1 | authorization policy |
| First governor dependency | no single-table proof | stage 2 first Membership＋Relationship＋Grant＋Case transition | valid-from | governance capability helper | successor／first governor confirmation | eligibility／dispute |

There are **11 matrix rules**. “Required” identifies a future enforcement responsibility; it does not claim implementation.

## 10. RLS dependency planning（no policies）

### 10.1 Safe Foundation inputs

- Current Auth reference → exactly one active Actor mapping。
- DRAFT Case lifecycle fact。
- Case creator attribution, only for minimum DRAFT self-service。
- Authorization Declaration／Decision ownership and reviewer assignment facts, only for narrow governance views。
- Case／Person／Recipient same-scope facts。

These are not a complete Case access path. Authorization accepted、creator status、Person Reference、historical actor or Decision authorship never independently authorize collaboration content.

### 10.2 Minimum visibility

- DRAFT creator：自己的 minimum DRAFT identity、lifecycle、own declarations、safe decision result and next-step／abandonment guidance。
- Authorization declarant：own statement history and only the decision information policy permits them to receive。
- Decision actor／reviewer：only assigned minimum declaration／Case governance context required to decide；no health timeline or future content authority。
- Detached actor：no authenticated access merely because historical attribution remains。
- Other accounts：no Case existence、name、counts、decision queue or search hints。

### 10.3 Direct writes and controlled operations

Client direct write must be prohibited for actor mapping、Case lifecycle transitions、Recipient replacement、Authorization Decisions and DRAFT abandonment／minimization. Controlled transactions are candidates for first-login mapping、DRAFT creation、declaration publication、decision append、account unlink and abandonment.

### 10.4 Helper recursion and elevated roles

- Foundation helpers should inspect only narrow foundation facts and must not depend on future content policies。
- Helper output must be boolean／minimum decision data, not hidden rows or counts。
- SECURITY DEFINER, if later proposed, requires fixed `search_path`、schema qualification、minimal EXECUTE grants and adversarial tests。
- FORCE RLS does not constrain BYPASSRLS or qualifying owner contexts；operator／service-role access needs separate ACL and operational controls。
- Care Circle、Audit Event、UI labels and historical participation are not access facts。

## 11. Migration 001–008 compatibility

### 11.1 Repository migration fingerprints

| Order | Filename | Lines | Bytes | SHA-256 | Classification |
|---|---|---:|---:|---|---|
| 001 | `20260823022521_remote_schema.sql` | 236 | 15,702 | `64d3cdd9047c7a716dd031a51d1e55cdeef6b2ab7bc4409887e4c864fa493361` | 備份心／existing baseline |
| 002 | `20260823030000_ownership_and_integrity.sql` | 301 | 9,825 | `8b165af587111b1e961b55b5ec6836b9a5a3186a758198204c0aa05d8da3a7e6` | 備份心／existing baseline |
| 003 | `20260823040000_auth_identity_lifecycle.sql` | 154 | 5,130 | `4618316d35a014ace64457fc6ace15a242032901cacd678af95e3f120e04e70b` | 備份心／existing baseline |
| 004 | `20260823050000_rls_and_access_control.sql` | 584 | 19,686 | `7f8234ee1377d9b0a89fce5f07b6163d5da7dd2fbe17facb7a05d22b08f6bf40` | 備份心／existing baseline |
| 005 | `20260823060000_backup_assignment_semantics.sql` | 92 | 3,655 | `c5b673b56adeb8a7440b4de5cc828aca7931c4a56e2eb117c33587df293d2209` | 備份心／existing baseline |
| 006 | `20260823070000_task_handoffs.sql` | 304 | 10,926 | `fa10edfae8327e942e75238b771f8f2151bc87f14a9f5e44e33f9e7cf26c5f08` | 備份心／existing baseline |
| 007 | `20260824220000_v2_access_foundation.sql` | 2,043 | 77,811 | `84007ccc2e5c16246435a1186e6123951f805bc383725504612d67e3dfbf1389` | existing v2 candidate reference only |
| 008 | `20260825090000_v2_identity_grant_alignment.sql` | 563 | 22,954 | `e54ee8d571672243454b60e70cac86a6c909a2f19c05bf498492736072521e8d` | existing v2 candidate reference only |

### 11.2 Coexistence boundary

- New Foundation candidates use the accepted `public.winwin_*` naming direction; existing `v2_*` names do not collide, but namespace difference does not prove semantic compatibility or security。
- Migration 007／008 may inform threat cases、test patterns and rollback checks, but no object is approved for byte-level reuse。
- Migration 001–006 remain untouched and authoritative only for their existing「備份心」baseline。
- Foundation is authoritative only for new WinWin Foundation facts after a separately approved cutover；until then this document creates no runtime authority。
- No bridge is required for the DRAFT-only empty Foundation release unless an explicit inventory later proves existing WinWin rows need mapping。Default is **no bridge**。
- If mapping is later required, it must be one-way、idempotent、fail-closed and independently reviewed；dual write is forbidden。

### 11.3 Rollback／forward-fix classification

- Before any data or dependency：rollback candidate may remove an isolated failed Foundation only under a dedicated dry-run plan。
- After authoritative rows exist：destructive rollback is not assumed；disable new writes／cutover and use forward-fix while retaining history。
- If Auth mapping integration fails：fail closed, preserve Actor／Case histories and stop identity creation／relink。
- If any ambiguous mapping appears：do not backfill or grant access；record evidence and stop the Gate。

No Remote Supabase connection or schema comparison is performed in this Review。

## 12. Implementation stage sequence

| Gate | Purpose | Output boundary |
|---|---|---|
| 1. Foundation Scope Product Decision | Option B、7-table scope、DRAFT-only／activation boundary accepted | documentation only；completed for scope disposition |
| 2. Foundation Schema Draft | propose exact tables／columns／constraints／indexes and rollback assumptions | schema design document；no Migration |
| 3. Local PostgreSQL dry-run design | freeze empty／legacy／failure scenarios and harness | verification design；no Production |
| 4. RLS Design Review | policies、helper graph、ACL、direct-write and adversarial cases | security design document |
| 5. Auth lifecycle test design | first login、delete、direct admin delete、relink、race tests | test contract |
| 6. Migration release candidate | only after prior Gates PASS, propose Migration＋harness | local candidate；not Remote apply |
| 7. Remote read-only preflight | exact target、history、drift、backup／restore readiness | read-only evidence |
| 8. Remote apply | requires separate explicit authorization | mutation Gate |

This document only decides readiness for a Final Read-only Foundation Design Review。Gate 2 Foundation Schema Draft remains blocked until that review passes and this document receives a separate checkpoint。

## 13. Product／Legal／Technical blockers and decisions required

### 13.1 Foundation Scope Product Decision Log

| ID | Disposition | Accepted decision | Still Deferred／dependency |
|---|---|---|---|
| FND-PD-01 | **Accepted** | Option B；Stage 1 precisely includes 7 Foundation candidates | exact Schema、columns、constraints and Migration |
| FND-PD-02 | **Accepted** | Stage 1 is strictly DRAFT-only；no invitation、sharing、formal collaboration、Care Circle or general Case collaboration | DRAFT state codes and UI／API implementation |
| FND-PD-03 | **Accepted with atomicity requirement** | Activation moves to Stage 2 and must be atomic with the first effective Membership、Relationship and governance Grant path；Active-without-governor forbidden | transaction、locking、complete-path helper and last-governor design |
| FND-PD-04 | **Accepted with security dependency** | General `winwin_audit_events` is deferred；Stage 1 retains only dedicated append-only Declaration／Decision facts and minimum DRAFT tombstone correlation | Audit writer／ACL／RLS／SECURITY DEFINER review |
| FND-PD-05 | **Accepted** | No `v2_*`→`winwin_*` bridge by default；future mapping requires separate review and must be one-way、idempotent、stoppable、verifiable and fail-closed；dual write forbidden | evidence-driven future mapping review only |

Each FND-PD has exactly one disposition。No Foundation scope product decision remains open。Accepted decisions do not approve their deferred technical implementation。

### 13.2 Legal／field dependencies

- Authorization declaration／decision evidence and legal meaning。
- Who may append an accepted／rejected／disputed decision and what minimum context they may view。
- DRAFT abandonment、identity evidence、audit correlation and account deletion retention／erasure policy。
- Identity recovery／relink evidence, deceased／incapacitated creator and disputed Care Recipient handling。

### 13.3 Technical dependencies

- Exact platform Auth FK feasibility and non-cascade behavior。
- Concurrent active mapping uniqueness and idempotent first-login design。
- Cross-table Case／Person／Recipient consistency。
- Append-only enforcement and current authorization decision ordering。
- DRAFT-only RLS helper graph, ACL and owner／BYPASSRLS controls。
- Abandonment minimization transaction and failure recovery。
- Stage 2 activation／first-governor transaction and last-governor protection。

These dependencies remain unresolved and must not be represented as implemented capabilities。

## 14. Gate decision

**READY FOR FINAL READ-ONLY FOUNDATION DESIGN REVIEW — PRODUCT DECISIONS COMPLETE**

- Accepted minimum scope：Option B。
- Included candidate tables：7。
- Deferred candidate tables：19。
- Care Circle authoritative tables：0。
- Stage 1 is strictly DRAFT-only。
- Authorization accepted is a prerequisite, not activation, Membership or Grant。
- Case activation and first complete governance path move to Stage 2 and must be atomic。
- General Audit table is deferred；minimum immutable governance trace remains required。
- FND-PD-01 through FND-PD-05 each have one accepted disposition。
- Foundation Schema Draft remains blocked until Final Read-only Review PASS and a separate document checkpoint。
- Migration、SQL、RLS、RPC、API、Supabase operations and deployment remain **BLOCKED**。

## 15. Explicit next gate

Next step is **WinWin Identity／Case／Governance Foundation Final Read-only Design Review**：

1. verify FND-PD-01 through FND-PD-05 each has one consistent disposition；
2. verify the 7 included＋19 deferred＝26 candidate coverage；
3. verify DRAFT-only semantics and Stage 2 atomic activation／first-governor dependency；
4. verify Audit and bridge deferrals remain fail-closed；
5. verify Product Definition through Physical Model and Migration 001–008 non-regression；
6. only after PASS may this document receive a separate checkpoint；
7. only after that checkpoint may Foundation Schema Draft begin。

No Migration, SQL, RLS, Supabase operation or Production capability is authorized by this document。

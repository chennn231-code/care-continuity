# WinWin Identity／Case／Governance Foundation Migration Draft Design Review

> **狀態：DRAFT — Product／Security Decisions Recorded; Local Feasibility Spike Required**
>
> 本文件規劃第一份 WinWin Foundation Migration 未來可能建立的物件、順序、安全責任與本機驗證方式。它不是 SQL Draft、Migration、RLS policy、function、RPC、API、Remote Apply 或 Production 授權。所有名稱、數量與 enforcement mechanism 均為 **PROPOSED**。

## 1. Authority and immutable boundary

權威依據：

1. [`WINWIN_PRODUCT_DEFINITION_BOUNDARY_V1.0.md`](WINWIN_PRODUCT_DEFINITION_BOUNDARY_V1.0.md)
2. [`WINWIN_CORE_OBJECT_MODEL_PHASE_1_DESIGN_REVIEW_DRAFT.md`](WINWIN_CORE_OBJECT_MODEL_PHASE_1_DESIGN_REVIEW_DRAFT.md)
3. [`WINWIN_CORE_OBJECT_MODEL_PHASE_2_DESIGN_REVIEW_DRAFT.md`](WINWIN_CORE_OBJECT_MODEL_PHASE_2_DESIGN_REVIEW_DRAFT.md)
4. [`WINWIN_CORE_OBJECT_MODEL_PHASE_3_DESIGN_REVIEW_DRAFT.md`](WINWIN_CORE_OBJECT_MODEL_PHASE_3_DESIGN_REVIEW_DRAFT.md)
5. [`WINWIN_CORE_OBJECT_MODEL_CONSOLIDATION_REVIEW_DRAFT.md`](WINWIN_CORE_OBJECT_MODEL_CONSOLIDATION_REVIEW_DRAFT.md)
6. [`WINWIN_LOGICAL_DATA_MODEL_DESIGN_REVIEW_DRAFT.md`](WINWIN_LOGICAL_DATA_MODEL_DESIGN_REVIEW_DRAFT.md)
7. [`WINWIN_PHYSICAL_DATA_MODEL_ERD_DESIGN_REVIEW_DRAFT.md`](WINWIN_PHYSICAL_DATA_MODEL_ERD_DESIGN_REVIEW_DRAFT.md)
8. [`WINWIN_IDENTITY_CASE_GOVERNANCE_FOUNDATION_MIGRATION_DESIGN_REVIEW_DRAFT.md`](WINWIN_IDENTITY_CASE_GOVERNANCE_FOUNDATION_MIGRATION_DESIGN_REVIEW_DRAFT.md)
9. [`WINWIN_IDENTITY_CASE_GOVERNANCE_FOUNDATION_SCHEMA_DESIGN_REVIEW_DRAFT.md`](WINWIN_IDENTITY_CASE_GOVERNANCE_FOUNDATION_SCHEMA_DESIGN_REVIEW_DRAFT.md)

Stage 1 嚴格只有 7 張 Foundation tables，lifecycle 只有 DRAFT／ABANDONED。不得加入 Stage 2 Invitation、Membership、Relationship、Grant、activation、Care Circle table、正式內容、分享、通用 Audit table 或 bridge。Migration 001–008 不修改。

## 2. Migration release strategy

### 2.1 Existing timestamp chain

| Order | Existing filename | Ownership／use |
|---:|---|---|
| 001 | `20260823022521_remote_schema.sql` | 備份心 baseline |
| 002 | `20260823030000_ownership_and_integrity.sql` | 備份心 baseline |
| 003 | `20260823040000_auth_identity_lifecycle.sql` | 備份心 baseline |
| 004 | `20260823050000_rls_and_access_control.sql` | 備份心 baseline |
| 005 | `20260823060000_backup_assignment_semantics.sql` | 備份心 baseline |
| 006 | `20260823070000_task_handoffs.sql` | 備份心 baseline |
| 007 | `20260824220000_v2_access_foundation.sql` | existing v2 candidate reference only |
| 008 | `20260825090000_v2_identity_grant_alignment.sql` | existing v2 candidate reference only |

### 2.2 Proposed next filename

`20260827090000_winwin_identity_case_governance_foundation.sql`

此名稱只作 release planning，未建立檔案，也未預留不可改變的 timestamp。SQL Draft authorization 前必須重新檢查 migration chain 與 collision；若 Repository 已出現較新 timestamp，必須另選單調較新的名稱。

### 2.3 Single versus split migration

| Strategy | Benefits | Risks | Recommendation |
|---|---|---|---|
| One transactional Foundation Migration | 7 tables、helpers、controlled operations、RLS／ACL 可共同 fail or succeed；避免半套安全邊界 | 單檔較長；需要完整 local harness | **Accepted with local transactionality proof**；全部必要 DDL 必須在隔離 Local spike 證明可共同 commit／rollback |
| Split schema then security | 易分段閱讀 | 第一段 apply 後可能存在未受保護 exposed tables；部署順序與 rollback 複雜 | Rejected unless each part remains inaccessible and release is atomic at operator level |
| Split Auth mapping from Case governance | 降低單檔範圍 | Actor mapping 與 DRAFT creation 可能短暫不一致 | Rejected for Stage 1 release |

採單一 Migration candidate，但仍須由隔離 Local PostgreSQL／Supabase spike 證明 transactionality、extension 行為與 DDL rollback。若任何必要 DDL 不能安全納入同一 transaction，Gate 必須停止並重新進行 split-release security review，不得靜默分拆，也不得留下 tables 已存在而 RLS／ACL 尚未完成的中間狀態。

## 3. Exact proposed object inventory

### 3.1 Included tables（7）

1. `public.winwin_actor_references`
2. `public.winwin_account_actor_links`
3. `public.winwin_person_references`
4. `public.winwin_cases`
5. `public.winwin_care_recipient_roles`
6. `public.winwin_authorization_declarations`
7. `public.winwin_authorization_decisions`

Additional Foundation tables＝0；Care Circle tables＝0；Audit tables＝0；bridge tables＝0。

### 3.2 Candidate keys, constraints and indexes

| Object class | Proposed count／scope | Notes |
|---|---|---|
| Primary keys | 7 | one opaque UUID PK per table |
| Foreign-key relationships | up to 13 candidates | exact Auth FK feasibility and circular creation strategy require review |
| Active-link partial unique indexes | 2 | current Auth→Actor and Actor→Auth uniqueness |
| Generation／order uniqueness | at least 3 | actor-link generation、Declaration family generation、Decision order per Declaration |
| Case／recipient uniqueness | 1 Case-level candidate | one historical Role row in Stage 1; effective semantics lifecycle-aware |
| Idempotency uniqueness | per controlled mutating operation | operation-specific、caller-bound；至少包含 caller Actor、operation type、target／Case scope 與 opaque key，不新增通用 operation table |
| Query indexes | candidate set per Section 4 | only indexes tied to verified RLS／operation queries; no natural-person matching |
| Append-only protection | Declaration／Decision required; ended-link history protected | mechanism requires security decision |

Counts are planning bounds, not approved SQL inventory. SQL Draft must enumerate every object and explain each index query.

### 3.3 Private helper candidates（5）

1. Resolve current Auth reference to exactly one active Actor mapping.
2. Resolve exactly one current Declaration generation for a family.
3. Resolve highest valid Decision within that generation.
4. Derive current authorization prerequisite as fail-closed boolean.
5. Verify minimum DRAFT self-service／abandonment visibility without returning hidden rows or counts.

### 3.4 Controlled operation candidates（6）

1. Create／obtain Stable Actor mapping.
2. Create minimum DRAFT Case.
3. Publish Authorization Declaration generation.
4. Append Authorization Decision.
5. Abandon DRAFT.
6. Unlink／detach Auth mapping.

### 3.5 RLS／ACL inventory candidate

- RLS enabled and FORCE RLS candidate：7／7 tables。
- Authenticated SELECT policy families：up to 7 narrow policies, normally one per table; exact consolidation requires helper-recursion review。
- Client INSERT／UPDATE／DELETE policies：0 by default；writes only through approved controlled operations。
- Anon policies：0。
- Controlled operation EXECUTE grants：up to 6, individually reviewed；no broad schema EXECUTE grant。
- Private helper client EXECUTE grants：0；helpers callable only through policies／controlled functions as technically required。
- PUBLIC EXECUTE：0 after explicit revocation verification。

These counts are proposed review targets, not security approval.

## 4. Proposed SQL creation order

1. Begin transaction and assert supported PostgreSQL／Supabase prerequisites.
2. Verify required extension availability; do not create unrelated extensions.
3. Verify `public` object-name collisions and proposed private helper schema strategy.
4. Define small controlled vocabulary representation without freezing PostgreSQL enums by default.
5. Create stable Actor and Account–Actor Link tables.
6. Create Case table, then resolve Case／Person creation-order design and create Person／Recipient tables.
7. Create Declaration then Decision tables.
8. Add PKs and non-circular FKs; add composite／deferred integrity only after feasibility proof.
9. Add checks, partial uniqueness and generation／decision-order uniqueness.
10. Add query indexes justified by controlled operations／RLS.
11. Add append-only and historical mutation protection.
12. Create private read helpers with fail-closed semantics.
13. Create controlled mutating operations with locking／idempotency.
14. Enable RLS and FORCE RLS on all 7 tables.
15. Create narrow SELECT policies; no direct client mutation policies.
16. Revoke default／PUBLIC privileges, then grant minimum table visibility and per-operation EXECUTE.
17. Add comments recording DRAFT-only and non-authorizing facts.
18. Run in-transaction inventory／ownership／ACL assertions, then commit only if all pass.

No stage may expose writable tables before ACL／RLS closure. Exact order may change only through SQL Draft Review with equivalent fail-closed proof.

## 5. Constraint feasibility for all 17 frozen rules

| # | Frozen rule | Native／index candidate | Transaction／clock／locking | Workflow／expert responsibility |
|---:|---|---|---|---|
| 1 | Auth account active-link uniqueness | partial unique index | controlled create／close; DB clock; lock Auth scope | identity recovery evidence |
| 2 | Actor active-link uniqueness | partial unique index | controlled create／relink; lock Actor scope | privacy／identity policy |
| 3 | Case DRAFT-only | lifecycle check limited to DRAFT／ABANDONED | controlled transition; DB clock; Case lock | no activation UI／API |
| 4 | Case／Person／Recipient same-scope | composite FK candidate plus checks | atomic create; Case lock | no natural-person matching |
| 5 | One Recipient Role per usable Case | Case uniqueness plus ended-field check candidate | create／abandon transaction | dispute handling Deferred |
| 6 | Declaration append-only | revoke UPDATE／DELETE plus protection candidate | publication transaction; DB clock | evidence／retention policy |
| 7 | Current Declaration generation | family＋generation uniqueness; predecessor constraints | family／head lock; database order | lineage recovery adds generation |
| 8 | Decision append-only | revoke UPDATE／DELETE plus protection candidate | controlled append; DB clock | reviewer eligibility |
| 9 | Decision ordering | Declaration＋order unique | same-Declaration lock／serialization; DB allocation | recovery adds Decision |
| 10 | Current authorization derived | no mutable current column | current generation then current Decision consistent read | legal meaning of outcomes |
| 11 | DRAFT collaboration prohibition | lifecycle allow-list; absent Stage 2 tables | deny unsupported operations | truthful UI／API |
| 12 | Abandonment eligibility／completion | lifecycle／ended checks insufficient alone | 10-step transaction; Case／family／Role locks | retention／erasure |
| 13 | Auth deletion fail-closed | non-cascade／reference strategy candidate | detach transaction; DB clock; delete-race serialization | platform Auth behavior |
| 14 | Retry／idempotency | unique operation key candidate | replay-safe controlled operations | caller retry contract |
| 15 | Concurrent Declaration writes | family＋generation unique | family lock／serialization | conflict UX |
| 16 | Concurrent Decision writes | Declaration＋order unique | stream lock／serialization | contradictory decision policy |
| 17 | Stage 2 activation dependency | no ACTIVE in Stage 1 | no Stage 1 activation operation | Stage 2 atomic path／last-governor review |

ACL、RLS 與 controlled writer 是 append-only 的最低必要邊界。Published Declaration 與 Authorization Decision 可使用 targeted guard trigger 作 defense-in-depth candidate，但 trigger 不得取代前述邊界，也不得誤擋 Account Link 的受控 `ended_at` 終止。最終 trigger 清單、owner、restore、maintenance、replication 與 recursion 行為必須由隔離 Local spike 證明；application workflow 不能成為 access、append-only history 或 uniqueness 的唯一 enforcement。

## 6. Current authorization implementation plan

### 6.1 Unique resolution

```text
resolve one valid current Declaration generation in the family
→ resolve highest valid Decision order inside that generation
→ prerequisite is true only if that Decision means Accepted
```

- Declaration publication uses database-controlled, monotonic, non-reused generation order.
- Publication locks the family／current head, validates same Case／family and creates exactly one linear successor.
- New generation becomes current immediately; until it has Accepted Decision, prerequisite is false.
- Predecessor Accepted Decision is never inherited; old-generation Decisions never compete with current truth.
- Decision order is database-controlled, monotonic and non-reused within one Declaration; gaps are allowed.
- Generation and Decision orders are never combined or compared across levels.
- Branch、cycle、multiple heads、missing predecessor、duplicate order or scope mismatch cause fail-closed result.
- Publication and Decision append require separate idempotency keys and serialization scopes.
- Recovery only appends a valid generation or Decision; no historical UPDATE。

### 6.2 SQL Draft proof obligations

- Demonstrate one-current-head derivation without mutable duplicate truth.
- Demonstrate concurrent publication cannot create branches.
- Demonstrate concurrent Decision allocation cannot duplicate order.
- Demonstrate retries return the original semantic result.
- Demonstrate policy/helper ambiguity returns false without revealing row counts.

## 7. DRAFT abandonment migration plan

### 7.1 Ten-step controlled transaction

1. Lock Care Case.
2. Reverify DRAFT and never activated.
3. Verify no Invitation、Membership、Relationship、Grant、sharing or formal collaboration dependencies.
4. Lock related Declaration families and unique current heads.
5. Append idempotent terminal abandonment Decision for every current generation that could form a prerequisite.
6. End current Recipient Role, retaining row and original Case／Person FKs.
7. Set Person display label to null and clear non-essential inputs while retaining opaque scope facts.
8. Convert Case to ABANDONED minimum tombstone.
9. Clear non-authoritative unpublished form／temporary state.
10. Reverify all postconditions before commit.

### 7.2 Required postconditions／rollback

- Case＝ABANDONED and cannot recover／activate／invite／share／collaborate.
- Current authorization prerequisite＝false.
- No current Recipient Role; ended historical Role remains.
- Person label／non-essential data removed while Case／Person／Recipient FKs remain valid.
- Published Declaration／Decision history remains append-only but is hidden from general UI／self-service.
- Unpublished temporary content does not exist.
- Creator receives only minimum abandonment confirmation.
- Any failure rolls back terminal Decisions、Role ending、Person minimization and Case transition together.

No eighth table or general Audit table is added. Retention duration／final erasure remain Legal／Privacy dependencies.

## 8. Auth lifecycle plan

### 8.1 Stable Actor and mapping generations

- Stable Actor survives Auth deletion and remains the historical attribution target.
- Same Auth account and same Actor each have at most one active link, enforced database-side.
- New link／relink creates a new generation; ended generations remain immutable.
- Email、name、phone and metadata are neither link evidence nor automatic relink keys.

### 8.2 FK action alternatives

| Alternative | Benefit | Risk | Proposed disposition |
|---|---|---|---|
| Direct Auth FK with CASCADE | simple cleanup | destroys link history／may cascade identity meaning | Rejected |
| Direct non-cascade Auth FK | strong reference while account exists | platform admin delete may fail or race | Security review required |
| Nullable Auth FK on detach | permits account delete | loses stable correlation if cleared without evidence | Security／Privacy review required |
| Logical immutable Auth reference＋controlled detachment | preserves history independent of Auth row | requires careful privacy／platform compatibility | Preferred candidate pending review |

Auth delete／unlink must lock the current mapping, end it using DB time and leave no usable mapping. If platform deletion bypasses ordinary workflow, a separately reviewed fail-closed integration is mandatory; application cleanup alone is insufficient.

## 9. RLS／ACL security design

### 9.1 Read／write boundary

| Role／operation | SELECT | INSERT／UPDATE／DELETE |
|---|---|---|
| `anon` | none; only non-data guidance outside tables | none |
| `authenticated` | minimum own DRAFT／mapping／declaration outcome through narrow policies | none directly |
| controlled function owner | minimum rows required by one operation | only explicitly validated transaction writes |
| operator／service context | not automatically trusted by RLS | governed by separate ACL／runbook; BYPASSRLS acknowledged |

Creator、Person、Recipient Role、Accepted Decision、Declaration author、historical participation、Acting Context、UI role and Care Circle never independently authorize.

### 9.2 Function security candidates

- Prefer `SECURITY INVOKER` for pure helpers when policy recursion and permissions permit.
- Use `SECURITY DEFINER` only where controlled atomic writes cannot otherwise be secured.
- Every definer candidate requires a dedicated non-login owner, fixed empty `search_path` candidate, fully qualified objects, explicit ACL, input scope validation and adversarial tests.
- Revoke PUBLIC EXECUTE from every function; grant authenticated EXECUTE only on individually approved controlled operations.
- Helpers must not expose hidden rows／counts and must fail closed on missing／multiple mapping, invalid lineage or recursion.
- FORCE RLS does not constrain BYPASSRLS or qualifying owner contexts; tests must use realistic client and elevated roles.
- Stage 1 has no governance capability table, so only minimum DRAFT creator self-service and assigned authorization review are candidates; no content access exists.

## 10. Proposed controlled-operation contracts

| Operation | Caller／prerequisites | Locks | Writes | Idempotency／rollback | History／prohibited side effects |
|---|---|---|---|---|---|
| Create／obtain Actor mapping | authenticated account; no conflict | Auth account＋candidate Actor scope | Actor if needed＋one link generation | request key; concurrent duplicate returns same mapping or fails | no Case、Grant or automatic relink |
| Create minimum DRAFT | current Actor mapping | actor＋new Case scope | Case＋Person＋Recipient atomically | request key; all-or-nothing | creator is not governor; no invite／content |
| Publish Declaration | mapped actor、own eligible DRAFT、valid Acting Context | Case＋declaration family head | one immutable generation | publication key; no branch／duplicate | unpublished form remains non-authoritative; no access |
| Append Decision | authorized reviewer candidate＋minimum context | Declaration stream＋family head as needed | one immutable Decision＋DB order | decision key; serialize conflicts | no mutation of Declaration／Case access truth |
| Abandon DRAFT | eligible creator／controlled governance context | Case＋families＋Role／Person scope | terminal Decisions＋ended Role＋redacted Person＋Case tombstone | operation key; 10-step rollback | no Audit table、recovery、activation or content deletion ambiguity |
| Unlink／detach Auth mapping | current account or authorized recovery flow | Auth＋Actor mapping scope | end current link generation | operation key; fail closed on race | retain Actor／link history; no Email-based relink |

Exact caller authorization, signatures, return values and SQLSTATE remain Product／Security decisions; the table does not authorize RPC creation.

## 11. Compatibility and collision review

- Migration 001–006 remain the authoritative「備份心」baseline only.
- Migration 007／008 remain candidate references; no table、function、policy、index or SQL is approved for byte-level reuse.
- Proposed `public.winwin_*` table names do not currently appear in the migration chain, but SQL Draft must rerun namespace collision checks.
- Function、policy、constraint and index names require deterministic `winwin_` prefixes and preflight collision inventory.
- Default＝no bridge; dual write forbidden.
- Future mapping, if separately authorized, must be one-way、idempotent、stoppable、verifiable and fail closed.
- Existing data without explicit reviewed mapping remains outside WinWin authority and receives no access.

## 12. Repository local verification plan

The future harness must be isolated, reproducible and exit non-zero on any failed assertion. It must not print secrets, row content or credentials.

| Area | Required scenarios／assertions |
|---|---|
| Migration chain | fresh apply 001–008, then proposed Foundation parse／apply; exact ordering and fingerprint |
| Inventory | exactly 7 WinWin tables; no additional Foundation／Care Circle／Audit／bridge objects |
| DRAFT-only | only DRAFT／ABANDONED accepted; no activation／collaboration object or operation |
| Auth lifecycle | first mapping、idempotent retry、unlink、ordinary and admin delete simulation、no automatic relink |
| Mapping uniqueness | concurrent Auth and Actor active-link conflicts rejected |
| Case scope | atomic Case／Person／Recipient create; cross-Case mismatch rejected; one current Role |
| Declaration | linear generation、single head、concurrent publication、retry、branch／cycle／missing predecessor rejection |
| Decision | per-generation monotonic order、concurrent append、gap acceptance、duplicate rejection |
| Authorization | new generation without Accepted fails closed; old generation never competes; negative／terminal Decision false |
| Abandonment | all 10 steps; failure injection at each step; FK and history retained; general visibility denied |
| Direct writes | anon／authenticated INSERT、UPDATE、DELETE denied on all 7 tables |
| RLS isolation | actor A／B cases、declarations and minimum results isolated; counts／search hints hidden |
| Function security | owner、prosecdef／invoker inventory、fixed `search_path`、qualification、ACL、PUBLIC EXECUTE scan |
| Elevated roles | FORCE RLS limitations documented; owner／BYPASSRLS behavior tested separately |
| Non-regression | v1 Migration 001–006 and existing v2 Migration 007／008 harnesses remain PASS |
| Evidence hygiene | sanitized logs、no sensitive values、deterministic summary and failure exit code |

Fresh isolated apply must include empty database and compatible pre-existing 001–008 database scenarios. No Remote Supabase is involved.

## 13. Rollback and recovery boundaries

| State | Required response |
|---|---|
| Before apply | stop with no mutation if fingerprint、history、target or backup prerequisite differs |
| Transaction apply failure | rollback whole proposed Migration; preserve 001–008; collect sanitized error |
| Apply success, no WinWin rows | disabling／dropping isolated objects may be a reviewed local rollback candidate, never assumed for Remote |
| Apply success with DRAFT rows | no destructive generic down migration; stop writes, preserve history, use reviewed forward-fix |
| ACL／RLS defect | immediately fail closed／disable client path; do not broaden grants as workaround; forward-fix after review |
| Auth mapping anomaly | stop identity operations, retain Actor／link histories, reject access and relink |
| Ambiguous lineage／decision | current authorization false; append reviewed recovery facts only |

No universal down migration is promised. Destructive rollback is limited to isolated local evidence before authoritative data; after authoritative rows exist, default is stop writes＋forward-fix.

## 14. Recorded product and security decisions

本節只固定產品方向與安全底線，不核准具體 SQL、function、trigger、policy、owner、lock syntax 或 Supabase mutation。所有需要實測的 disposition 均受 Section 16 的隔離 Local feasibility spike 約束。

### 14.1 Product decisions（5／5）

| ID | Disposition | Recorded decision | Remaining proof／dependency |
|---|---|---|---|
| FND-MIG-PD-01 | **ACCEPTED WITH LOCAL TRANSACTIONALITY PROOF** | 採單一 transactional Foundation Migration；schema、constraints、functions、RLS 與 ACL 必須完整成立或共同 rollback，不得留下未封閉的中間狀態 | 隔離 Local spike 證明全部必要 DDL 可安全交易；失敗則停止並重做 split-release security review |
| FND-MIG-PD-02 | **ACCEPTED POLICY／EXACT FILENAME DEFERRED** | 不修改 Migration 001–008；`20260827090000_winwin_identity_case_governance_foundation.sql` 僅為 provisional candidate；SQL Draft 前重掃 chain／collision | 最終 filename 建立並驗證後不得任意改名；Migration、harness、report 使用同一 filename／fingerprint |
| FND-MIG-PD-03 | **ACCEPTED TECHNICAL REPRESENTATION WITH EXPERT-DEPENDENT VOCABULARY** | 採小型 immutable text machine codes＋CHECK candidates；不用 PostgreSQL enum、不建 vocabulary table、不允許 arbitrary free-text code；Case lifecycle 技術集合固定 DRAFT／ABANDONED | SQL Draft 前列出 authorization outcome、reason、declaration basis allowlist；法律文案與臺灣長照場域名稱仍需 Legal／Privacy／Field 確認 |
| FND-MIG-PD-04 | **ACCEPTED WITH CONCURRENCY PROOF** | 採 operation-specific、caller-bound idempotency；scope 至少包含 caller stable Actor、operation type、target／Case 與 opaque key；不新增通用 operation table | 同 key＋同 semantic payload 回傳同結果；不同 payload／caller／operation／Case fail closed；unique、retry、rollback 由 Local spike 證明 |
| FND-MIG-PD-05 | **ACCEPTED** | 不保存 server-side unpublished Declaration draft；未發布 form 不是 authoritative fact；publish failure 不留 Declaration row；不新增 draft table | 前端 temporary state 不得成為 RLS、authorization 或 Stage 2 activation fact |

Machine code 發布後不得改變既有語意；新增 machine code 只能透過後續 Migration。專家未確認前，任何 code 均不得宣稱代表法律代理、同意權、專業資格或法定證據效力。

### 14.2 Security decisions（6／6）

| ID | Disposition | Recorded security direction | Local proof still required |
|---|---|---|---|
| FND-MIG-SEC-01 | **ACCEPTED DIRECTION／IMPLEMENTATION BLOCKED PENDING AUTH LIFECYCLE PROOF** | Stable Actor 不依附 Auth 存活；Account–Actor Link 採 generation＋受控 detachment；禁止 CASCADE、app-only cleanup、自然屬性 relink；Auth missing／deleted／unlinked／multiple mappings 均 fail closed | Nullable FK、logical Auth reference、platform hook、ordinary／admin delete 與 race 的最終組合 |
| FND-MIG-SEC-02 | **ACCEPTED BASELINE WITH TARGETED DEFENSE IN DEPTH** | anon／authenticated direct INSERT／UPDATE／DELETE＝0；PUBLIC EXECUTE＝0；Published Declaration／Decision 只經受控 operation 追加；ended generation 不重啟；recovery 只新增 row | Declaration／Decision append-only guard trigger candidate 的 owner、restore、maintenance、replication、recursion，以及不誤擋 Account Link controlled termination |
| FND-MIG-SEC-03 | **ACCEPTED SECURITY MODEL／PER-FUNCTION PROOF REQUIRED** | Pure read helpers 優先 SECURITY INVOKER；只有無 direct table write 且需原子 mutation 的個別 operation 可考慮 SECURITY DEFINER；禁止全函式 DEFINER | Dedicated NOLOGIN、non-superuser、non-BYPASSRLS owner 可行性；每個 definer 的 allowlist、scope revalidation、fixed empty `search_path`、最小 privileges／EXECUTE |
| FND-MIG-SEC-04 | **ACCEPTED PRIVATE-HELPER DIRECTION／FINAL FUNCTION COUNT DEFERRED** | Helpers 位於 private non-client-exposed schema；無 PUBLIC／anon／authenticated direct EXECUTE；完整 qualification、fixed empty `search_path`；所有 ambiguity／scope mismatch fail closed；不得回傳 hidden rows／counts | 5 helpers 是語意候選上限，不是固定數量；policy 可否安全呼叫、recursion、合併責任與可測性 |
| FND-MIG-SEC-05 | **ACCEPTED NARROW-POLICY PRINCIPLE／EXACT GRAPH DEFERRED** | 採每表 narrow SELECT；anon table SELECT／DML／function EXECUTE＝0；authenticated 只取得核准的 minimum SELECT＋個別 operation EXECUTE，direct DML＝0；ABANDONED 只顯示最低 confirmation | Exact policy count、helper graph、authorization outcome projection、A／B isolation、search／count／empty-state leakage |
| FND-MIG-SEC-06 | **ACCEPTED LOCKING DIRECTION／FIXED ORDER REQUIRES LOCAL PROOF** | 採明確 lock order＋unique constraints；unique 只是最後防線；禁止 app-side mutex；generation／Decision order 由 database-controlled writer 配置，client 不得決定 | Per-operation fixed lock hierarchy、deadlock、retry、same／cross-scope concurrency、rollback；advisory lock／SERIALIZABLE 只在必要且實證後採用 |

Stage 2 不得自動沿用 Stage 1 DEFINER authority 或 creator policy。Stage 2 activation 必須另建完整 Grant Path policies，並重新審查更廣的 lock order。

### 14.3 Candidate lock hierarchy by controlled operation

下列只固定需要明確且一致的 lock hierarchy，不凍結 PostgreSQL lock primitive 或 SQL syntax：

| Operation | Candidate lock scope／order | Required invariant |
|---|---|---|
| Create／obtain Actor mapping | Auth identity scope → candidate Actor scope → active-link uniqueness | 每個 Auth／Actor 各最多一條 active generation；retry 不建立第二條 link |
| Create minimum DRAFT | caller Actor scope → new Case scope → Person／Recipient integrity scope | Case、Person、Recipient 全成或全 rollback；無 governance right |
| Publish Declaration | Case scope → declaration family → current head | 單一線性 generation head；DB 配發 order；new generation 立即 fail closed until Accepted |
| Append Decision | Case／family validation → current Declaration generation → Decision stream | 只在 current generation 配發單調 Decision order；舊 generation 不競爭 current truth |
| Abandon DRAFT | Case → related declaration family heads → current Recipient Role → Person minimization scope | terminal Decisions、Role ending、Person minimization、Case tombstone 同 transaction |
| Unlink／detach Auth mapping | Auth identity scope → Actor mapping scope | current link 結束後立即無 authenticated Actor path；歷史保留 |

若實測發現 hierarchy 產生不可接受的 deadlock 或不能涵蓋一致性，必須回到 Security Decision Review，不得由 App mutex 掩蓋。

### 14.4 Legal／Privacy／Field dependencies

- Authorization outcome、reason、declaration basis、reviewer eligibility 與 evidence meaning。
- Auth reference、detachment correlation、identity recovery 及最低 link history retention。
- Person label、published governance text、ABANDONED tombstone retention／erasure。
- Deceased／incapacitated creator and disputed recipient recovery processes。

這些依賴不授權降低安全 enforcement、擴張 Stage 1 或宣稱法律效力。

## 15. Rejected unsafe patterns

下列選項固定拒絕：

1. 修改或重寫 Migration 001–008。
2. PostgreSQL enum 作本 Stage vocabulary representation。
3. Arbitrary free-text machine vocabulary。
4. Server-side unpublished Declaration draft。
5. 第 8 張 Foundation table。
6. 通用 Audit table。
7. Care Circle authoritative table。
8. `v2_*`／`winwin_*` bridge 或同一 truth dual write。
9. App-only Auth cleanup 或 application workflow 作唯一安全 enforcement。
10. App-side mutex 作 concurrency security guarantee。
11. 全部 functions 使用 SECURITY DEFINER。
12. Function owner 是 superuser 或具有 BYPASSRLS。
13. PUBLIC EXECUTE。
14. Client direct Foundation INSERT／UPDATE／DELETE。
15. `now()` 或其他 volatile／time-moving expression 作 active partial-index predicate；active generation 以受控持久事實（例如 `ended_at IS NULL`）表達。
16. Payload-only deduplication。
17. Stage 1 ACTIVE Case、governance Grant、Invitation、Membership、Relationship、Care Circle 或正式內容能力。

任何替代設計若引入上述項目，必須判定 contract violation，不得作為便利性調整。

## 16. Foundation Security／Concurrency Feasibility Spike

**FOUNDATION SECURITY／CONCURRENCY FEASIBILITY SPIKE REQUIRED**

Spike 必須在全新、隔離、可丟棄的 Local Supabase／PostgreSQL 環境完成。它不是 Repository Migration、正式 SQL Draft、release candidate 或 Remote rehearsal；不得連線 Remote Supabase，也不得修改 Migration 001–008。

至少驗證：

1. 單一 transaction 內必要 DDL 的 commit／rollback 能力。
2. Supabase Auth ordinary unlink／delete／admin delete 行為。
3. Auth delete 與 mapping operation race。
4. Dedicated NOLOGIN non-BYPASSRLS function owner 可行性。
5. INVOKER／DEFINER 逐函式權限與最小 table privileges。
6. Private helper schema 可見性與 client non-exposure。
7. RLS policy 呼叫 helper 的 recursion／spoofing／fail-closed 行為。
8. ACL、anon／authenticated boundary 與 PUBLIC EXECUTE＝0。
9. Append-only guard trigger 與 controlled Account Link termination、restore／maintenance compatibility。
10. Operation-specific、caller-bound idempotency及same-key semantic mismatch。
11. Concurrent Declaration publication與single linear head。
12. Concurrent Decision ordering與current-generation isolation。
13. Concurrent DRAFT abandonment與partial-failure injection。
14. 固定 lock hierarchy、deadlock、retry、same-scope及cross-scope concurrency。
15. Actor A／B cross-Case isolation、hidden rows／counts／search hints。
16. ABANDONED minimum confirmation與Person／Declaration／Decision history不可見。
17. 每個 transaction failure完整 rollback，不留partial current truth。
18. Migration 001–008 byte-for-byte unchanged。
19. Remote Supabase connections／mutations＝0。
20. Evidence sanitized；不記錄secret、token、Email、UUID、row data或private recovery material，並保留可重現的非敏感command、版本及PASS／FAIL摘要。

Spike 的實驗性 SQL／state 只能存在於獲明確授權的隔離暫存環境，不得偷偷建立 Repository Migration。Spike 失敗時保存去敏證據、銷毀可丟棄環境並回到本文件修訂；不得以降低 RLS／ACL、擴權 owner 或跳過測試方式通過。

## 17. Updated gate sequence

1. **Migration Draft Design Review** — 本文件；11 項方向已記錄。
2. **Foundation Security／Concurrency Feasibility Spike Design／Authorization** — 先凍結隔離環境、命令、證據與清理邊界。
3. **Foundation Security／Concurrency Feasibility Spike Execution** — 只在另行授權的 disposable Local environment 實驗。
4. **Migration Draft Design Final Read-only Review** — 將 spike evidence 回填並關閉所有 proof-dependent disposition。
5. **Migration Design Freeze checkpoint** — 只提交通過審查的文件。
6. **SQL Draft authorization** — 另行明確授權後，才能建立一份 proposed Migration／harness。
7. **Static Security Review** — SQL scope、ownership、search path、ACL、RLS、destructive scan。
8. **Fresh Isolated Local Dry-run** — 對正式 candidate 執行 empty／001–008 pre-existing／failure scenarios。
9. **Release Candidate promotion** — local evidence與immutable fingerprint通過後才成立。
10. **Remote read-only preflight** — exact project、history、drift、backup／restore readiness。
11. **Remote apply** — 必須取得獨立 mutation authorization。

任何 Gate 都不自動授權下一個 Gate。

## 18. Gate decision

**PRODUCT／SECURITY DECISIONS RECORDED — LOCAL FEASIBILITY SPIKE REQUIRED BEFORE MIGRATION DESIGN FREEZE**

- Product dispositions：5／5，ID unique。
- Security dispositions：6／6，ID unique。
- Included tables：7。
- Additional Foundation tables：0。
- Care Circle tables：0。
- Audit tables：0。
- Bridge objects：0。
- Controlled operations：6。
- Private helpers：5 個語意 candidates上限；final function count Deferred to spike evidence。
- All 17 frozen constraint／transaction rules remain covered。
- Rejected unsafe patterns固定且不擴張 authoritative model。
- Migration Design Freeze：**BLOCKED pending spike**。
- SQL Draft：**BLOCKED**。
- Repository Migration：**BLOCKED**。
- Remote Supabase／Production：**BLOCKED**。

## 19. Explicit next step

下一步只能設計並取得 **Foundation Security／Concurrency Feasibility Spike** 的獨立授權，先固定 disposable Local environment、允許的實驗物件、命令、證據去敏、cleanup 與停止條件。本文件修訂本身不授權啟動 Local Supabase。

Spike 通過並回填 proof 後，須再進行 Migration Draft Design Final Read-only Review；只有其結果為 PASS 且建立文件 checkpoint 後，才可考慮另行授權 SQL Draft。

# WinWin Foundation Security／Concurrency Feasibility Spike Design

> **狀態：DRAFT — Disposable Local Technical Proof Design Only; Execution Not Authorized**
>
> 本文件只規劃隔離 Local Supabase／PostgreSQL 技術可行性驗證。Spike objects 不是正式 WinWin table、function、trigger、policy、Migration、RLS、RPC 或 API；任何 Spike 結果都不能自動升格為 Production 設計或 Remote Apply 授權。

## 1. Authority and immutable safety boundary

權威依據：

1. [`WINWIN_IDENTITY_CASE_GOVERNANCE_FOUNDATION_MIGRATION_DRAFT_DESIGN_REVIEW.md`](WINWIN_IDENTITY_CASE_GOVERNANCE_FOUNDATION_MIGRATION_DRAFT_DESIGN_REVIEW.md)
2. [`WINWIN_IDENTITY_CASE_GOVERNANCE_FOUNDATION_SCHEMA_DESIGN_REVIEW_DRAFT.md`](WINWIN_IDENTITY_CASE_GOVERNANCE_FOUNDATION_SCHEMA_DESIGN_REVIEW_DRAFT.md)
3. [`WINWIN_IDENTITY_CASE_GOVERNANCE_FOUNDATION_MIGRATION_DESIGN_REVIEW_DRAFT.md`](WINWIN_IDENTITY_CASE_GOVERNANCE_FOUNDATION_MIGRATION_DESIGN_REVIEW_DRAFT.md)

不可變邊界：

- 不修改 Migration 001–008。
- 不建立 Repository SQL Draft、正式 Migration 或正式 harness。
- 不連接、link 或操作 Remote Supabase／Production。
- 不使用真實個案、Email、password、token、key、健康資料或Production row。
- Fixture Email 只使用保留測試網域 `.invalid`，所有名稱與識別資料均為合成值。
- 不讀取或複製 Repository `.env`、Supabase `.temp`、remote link 或既有 Local data／volumes。
- Spike object 必須使用明確 `spike_*` 名稱並位於隔離 temp project；不得使用正式 `winwin_*` 名稱冒充候選 schema。
- Spike execution、Local stack start、SQL execution與cleanup均需要後續各自明確授權。

## 2. Read-only environment inventory

本輪只執行唯讀盤點，未啟動或停止服務：

| Item | Read-only finding | Design consequence |
|---|---|---|
| Supabase CLI | `2.115.0`；必須設定 `SUPABASE_TELEMETRY_DISABLED=1` 才不嘗試寫入使用者telemetry state | Execution command freeze必須固定此環境變數並重新記錄版本 |
| Docker CLI | `29.6.2` | CLI存在，但不代表daemon ready |
| Docker daemon | 本輪查詢結果為not running／unreachable | Environment Start Gate前須由operator確認daemon；本文件不得啟動Docker Desktop |
| Host `psql` | 未安裝／不在PATH | 未來查詢須使用隔離stack內受控client或另經核准的tool；不得臨時安裝 |
| Available disk | 約41 GiB | Start Gate仍須重新確認足夠空間及temp root所在filesystem |
| Existing containers／volumes | daemon未運行，無法取得authoritative inventory | Start Gate須在daemon ready後再次唯讀盤點；不得推定目前為0 |
| Repository ports | 既有config使用54321–54329中的多個ports | Spike不得使用Repository既有ports |
| Historical ports | Repository／evidence已知使用54320–54329、56320–56329、57320–57329與58320–58329 | 全部列為禁止重用；即使目前無listener也不是可用候選 |
| Candidate ports | 59320–59329在Repository歷史搜尋無命中，本輪亦未發現TCP listener | 只是design candidate；daemon未運行，container／volume collision仍未知，Start Gate必須重查，不構成reservation或安全核准 |

Docker daemon unavailable使container／volume inventory為**未確認**，不是0。這不阻擋設計文件，但阻擋Environment Start Authorization。

## 3. Execution strategy comparison

| Option | Platform fidelity | Isolation | Risks | Disposition |
|---|---|---|---|---|
| A. 全新隔離Local Supabase完整stack | 可驗證Auth schema、ordinary／admin delete、RLS角色、anon／authenticated／service／owner與Local PostgreSQL版本 | 高；獨立workdir、project ID、ports、volumes | 啟動成本較高；需嚴格過濾bootstrap credentials | **Recommended** |
| B. 單獨PostgreSQL container | 適合DDL、locking、RLS核心行為 | 高 | 無法代表Supabase Auth lifecycle與平台角色 | 可作補充，不足以單獨PASS |
| C. 既有Local database補建物件 | 低 | 低 | 舊state、volumes與未知objects污染證據 | **Rejected** |
| D. Remote／staging驗證 | Hosted fidelity較高 | 不可接受 | Remote mutation、資料與權限風險 | **Rejected／Blocked** |

推薦Option A。禁止使用舊Local database、既有volumes、remote link、Production、真實帳號或資料。若Local行為無法代表Hosted Supabase，結果須標示`PARTIAL`，不得推定Remote安全。

## 4. Disposable environment design（planning only）

未來執行前須凍結以下配置，但本輪不建立：

- 使用`mktemp -d`產生全新session root；不得重用先前目錄。
- 建立無Production語意的新local `project_id`；必須符合Section 4.1的固定ASCII格式、精確byte-count與歷史禁止重用規則，隨機性本身不構成唯一性證據。
- 將project ID與Repository、existing containers／volumes、temp roots及evidence中的全部歷史IDs逐一進行完整字串比較；不得只比較prefix。
- 任一project ID命中歷史紀錄或既有資產即停止；Environment Start前保存只含symbolic結果的去敏比對摘要，且stop前再次核對。
- 使用完整且固定的候選service-port mapping 59320–59329；543xx、563xx、573xx、583xx全部禁止作candidate或fallback。
- 設定`SUPABASE_TELEMETRY_DISABLED=1`及`umask 077`。
- 使用`supabase --workdir <isolated-root>`，不得從Repository root啟動。
- Seed disabled；不複製`.temp`、remote link、`.env`、config secrets或既有migration chain。
- Temp root與evidence directory權限0700；evidence files建立後驗證0600。
- Spike SQL、test harness、test／session scripts、generated config、raw logs、sanitized evidence、manifest、checksums及temporary fixtures全部只能存在專用temp root；Repository只保留本設計文件。
- Evidence destination必須是全新不存在路徑；禁止覆寫既有evidence。
- 不清除、attach或修改先前Local dry-run data、containers或volumes。
- Bootstrap輸出進log前必須先過濾credentials payload；若無法安全過濾，停止而不是記錄raw output。

Environment Start Gate重新確認：CLI versions、daemon、disk、containers、volumes、ports、workdir real path、remote link absent、Repository Git clean與Migration 001–008 hashes。

### 4.1 Project ID ownership boundary and frozen candidate format

#### Observed technical fact

在Supabase CLI `2.115.0`的本次Local環境實測中，requested project ID為42 ASCII bytes，但CLI／Docker ownership只採用前40 bytes，最後2 bytes遭截斷。Requested ID與實際ownership不一致，因此該次Environment Start判定失敗。這是本次版本與環境的實測邊界，不是所有Supabase版本永久不變的公開保證；未來CLI版本改變時仍須重新驗證，不得假設限制已消失。

本文件只保存上述去敏後的byte-count與ownership結果，不保存raw bootstrap內容、credential、JWT、URL key、password、connection string、完整Auth ID或raw log內容。

#### Frozen candidate ID rule

未來Foundation Spike project ID必須同時符合：

- 僅使用ASCII，且符合`^wwfnd-[0-9]{8}t[0-9]{6}z-[0-9a-f]{12}$`。
- 固定長度為35 ASCII bytes，絕對不得超過40 bytes，保留5 bytes安全餘裕。
- UTC timestamp精確到秒；suffix為12個小寫hex字元。
- 不允許空格、底線、大寫、Unicode或regex未允許的其他標點。
- 每一個新session只產生一個候選ID；不得保留fallback ID。
- 不得在啟動中自動縮短、重新產生或更換ID重試。
- 本設計修正不產生真正的新project ID；候選ID只能在後續獨立Gate取得授權後產生。

Environment Start前必須以byte-aware方式驗證ASCII-only、regex與byte count精確為35；不得只使用字元數或肉眼判斷。去敏evidence只可保存requested byte count、regex PASS／FAIL及uniqueness PASS／FAIL，不得保存suffix生成來源或其他private recovery material。

Start後必須立即驗證以下完整八方ownership equality：

```text
requested project ID
= config project_id
= Supabase CLI reported ownership ID
= com.supabase.cli.project label
= com.docker.compose.project label
= candidate container ownership
= candidate volume ownership
= candidate network ownership
```

上述比較必須涵蓋本次manifest預期的每一個candidate container、volume與network，並確認沒有混入其他ownership值。任何missing label、missing resource、mixed ownership、截斷、大小寫正規化、unexpected additional ownership value或其他不一致均須立即停止並保留現場；不得自動修正、換ID或重試。

#### Historical project ID denylist

下列完整ID均已使用、曾被要求、遭截斷或屬既有Repository identity，永久禁止作為新session ID重用：

```text
care-continuity-v2-007-dryrun
care-continuity-v2-007-dryrun-r2
care-continuity-v2-007-harness-202608241
cc-v2-007-20260824140240-5706
cc-v2-007-20260824140414-5979
cc-v2-007-rc-20260824141640-6608
cc-v2-007-rc-20260825065419-33765
cc-v2-007-rc-20260825065713-34084
cc-v2-007-rc-20260825070351-34976
cc-v2-008-legacy-34427
cc-v2-008-legacy-final-35240
cc-v2-008-rollback-34689
winwin-fnd-spike-20260827t052047z-645c81
winwin-fnd-spike-20260827t052047z-645c8132
care-continuity-mvp-engine-implementatio
```

此清單是最低禁止集合，不取代每次Environment Start前對Repository、containers、volumes、networks、temp roots、evidence與其他保存紀錄重新取聯集。現有失敗session的temp root及三個retained volumes只作歷史現場，不得attach、清除或供新session重用。

### 4.2 Frozen candidate service-port mapping

| Service | Config key | Candidate host port | Purpose | Environment Start verification | Collision response |
|---|---|---:|---|---|---|
| Shadow database | `[db].shadow_port` | 59320 | `db diff`／shadow operations | config parse＋`lsof`＋Docker published-port inventory | 立即停止；不得自動換port後續跑 |
| API gateway | `[api].port` | 59321 | REST／Auth／Storage／Realtime gateway | config parse＋TCP listener＋container mapping | 同上 |
| PostgreSQL database | `[db].port` | 59322 | Local database connection | config parse＋TCP listener＋DB container mapping | 同上 |
| Studio | `[studio].port` | 59323 | Local Studio UI | config parse＋TCP listener＋container mapping | 同上 |
| Inbucket／Email web UI | `[local_smtp].port` | 59324 | Local captured-email UI | config parse＋TCP listener＋container mapping | 同上 |
| SMTP | `[local_smtp].smtp_port` | 59325 | Optional local SMTP listener | 若啟用則確認config、listener與container；未啟用也保留禁止其他用途 | 同上 |
| POP3 | `[local_smtp].pop3_port` | 59326 | Optional local POP3 listener | 若CLI／config支援且啟用則確認；未啟用也保留禁止其他用途 | 同上 |
| Analytics | `[analytics].port` | 59327 | Local analytics endpoint | config parse＋TCP listener＋container mapping | 同上 |
| Edge Runtime inspector | `[edge_runtime].inspector_port` | 59328 | Optional debugger listener | config parse；若未啟用仍確認無其他listener／mapping | 同上 |
| Database pooler | `[db.pooler].port` | 59329 | Optional connection pooler | config parse；若disabled仍保留並驗證無listener | 同上 |

Auth、Realtime、Storage及S3 protocol目前經API gateway而沒有獨立host-port config key；Environment Start仍須以實際Docker published-port inventory確認CLI版本沒有增加未列出的host listener。任何新增listener均視為mapping mismatch並立即停止，而非臨時挑選其他port。

## 5. Minimal disposable proof objects

Spike只建立足以證明技術行為的縮減fixture，不複製正式7-table schema：

| Spike object candidate | Proof responsibility | Explicit non-goal |
|---|---|---|
| `spike_actor_mappings` | Stable actor reference＋Auth mapping generation、active uniqueness、controlled termination | 不是正式Actor／Account Link tables |
| `spike_draft_cases` | 合併最低DRAFT Case、Person label與Recipient lifecycle proof facts | 不代表正式Case／Person／Recipient table boundary |
| `spike_declaration_generations` | Family、linear head、database generation order、publication idempotency | 不是正式Declaration schema |
| `spike_authorization_decisions` | Per-generation decision order、append-only與terminal abandonment proof | 不是正式Decision vocabulary |
| private `spike_*` helpers | Actor resolution、current head／Decision、minimum DRAFT visibility | 不固定正式helper數量或signatures |
| controlled `spike_*` mutators | 六類operation的權限、transaction與locking proof | 不是正式RPC／API |
| narrow spike RLS policies | A／B isolation、helper recursion、hidden-count proof | 不核准正式policy graph |
| targeted append-only guard | Declaration／Decision UPDATE／DELETE rejection | 不核准正式trigger清單 |

不得增加完整Care Circle、Audit、bridge、Membership、Relationship、Grant、正式內容或ACTIVE lifecycle。Spike fixture SQL只可存在於後續獲授權的temp session，不得加入Repository。

## 6. Twenty required technical tests

每項測試須保存sanitized evidence、明確PASS／FAIL／PARTIAL與postconditions。Fixture IDs與Email不得出現在報告；以Actor A／B、Case A／B等符號呈現。

### Test 01 — Transactional DDL commit

- **Purpose：** 證明必要spike DDL可在單一transaction完整commit。**Preconditions：** 空白isolated stack、object／role allowlist frozen。**Fixture／initial state：** 無spike objects。**Actor／role：** migration role。**Session count：** 1。
- **Operation：** Session A開始transaction→依allowlist建立縮減tables、roles、helpers、guards、RLS／ACL→執行in-transaction inventory→符合才commit。**Expected result：** 全部共同commit。**Postconditions：** inventory精確符合allowlist，無半套security boundary。**Evidence：** sanitized transaction與inventory摘要。**Failure meaning：** 任一必要DDL不可交易。**Design decision impact：** PD-01回split-release security review。

### Test 02 — Failure-injected DDL rollback

- **Purpose：** 證明DDL故障不留殘件。**Preconditions：** Test 01可重建的空白baseline。**Fixture／initial state：** 無spike objects。**Actor／role：** migration role。**Session count：** 1。
- **Operation：** Session A開始同一DDL transaction→在預定中點執行受控必然失敗步驟→確認transaction aborted→rollback→重新查catalog。**Expected result：** 故障發生且整體rollback。**Postconditions：** 本次tables、functions、roles、policies、grants均不存在。**Evidence：** before／after inventory＋sanitized error class。**Failure meaning：** 任一殘留object。**Design decision impact：** transactional candidate FAIL。

### Test 03 — Ordinary Auth unlink

- **Purpose：** 驗證受控unlink立即fail closed。**Preconditions：** Actor A有一條active mapping。**Fixture／initial state：** 合成`.invalid` Auth A＋mapping generation。**Actor／role：** authenticated A。**Session count：** 1。
- **Operation：** Session A開始transaction→呼叫allowlisted unlink operation→operation鎖mapping、以DB time終止→commit→以新transaction解析current actor。**Expected result：** unlink成功。**Postconditions：** history保留、active mapping為0、resolver=false。**Evidence：** symbolic before／after mapping summary。**Failure meaning：** 仍可resolve或history消失。**Design decision impact：** SEC-01 FAIL。

### Test 04 — Local Auth user delete

- **Purpose：** 驗證Local Auth delete對mapping的影響。**Preconditions：** Auth A與active mapping存在，delete path已freeze。**Fixture／initial state：** 合成`.invalid` Auth A。**Actor／role：** local Auth delete caller＋DB observer。**Session count：** 2。
- **Operation：** Observer先記錄symbolic baseline→Delete session執行ordinary user delete並commit／由平台回報失敗→Observer等待完成後查mapping與resolver。**Expected result：** delete受控完成或明確fail；不得留下usable mapping。**Postconditions：** Stable Actor／最低history保留，resolver=false或delete未發生。**Evidence：** sanitized delete classification＋invariant summary。**Failure meaning：** usable mapping或history破壞。**Design decision impact：** SEC-01 implementation拒絕。

### Test 05 — Admin Auth delete

- **Purpose：** 驗證admin path不可繞過。**Preconditions：** fresh Auth B與active mapping。**Fixture／initial state：** 合成`.invalid` Auth B。**Actor／role：** local admin deletion path＋DB observer。**Session count：** 2。
- **Operation：** Observer建立baseline→Admin session發出delete→等待平台commit／failure→Observer查Auth existence、mapping與resolver。**Expected result：** 與ordinary path同樣fail closed且不依App cleanup。**Postconditions：** 無usable stale mapping。**Evidence：** sanitized admin result。**Failure meaning：** admin path繞過。**Design decision impact：** SEC-01 blocked；Local／Hosted差異標PARTIAL。

### Test 06 — Auth delete／mapping race

- **Purpose：** 驗證delete與create／detach競態只有單一合法終局。**Preconditions：** freeze barrier與兩種合法operation。**Fixture／initial state：** Auth A、Actor A、可競爭mapping scope。**Actor／role：** admin＋controlled mapping caller。**Session count：** 2–3。
- **Operation：** Session A開始delete並停在barrier；Session B同時create／detach mapping；Observer同步釋放barrier→兩方各自commit或rollback→新transaction查唯一性。**Expected result：** serialization或一方fail closed。**Postconditions：** 不得有second active link、orphan usable path。**Evidence：** timing／outcome分類。**Failure meaning：** multiple active或stale mapping。**Design decision impact：** SEC-01／SEC-06 FAIL。

### Test 07 — Dedicated function owner

- **Purpose：** 證明NOLOGIN、non-superuser、non-BYPASSRLS owner可行。**Preconditions：** migration role具建立測試role的isolated權限。**Fixture／initial state：** 最小table及function target。**Actor／role：** migration role＋catalog reader。**Session count：** 1。
- **Operation：** Session A開始transaction→建立dedicated role→授予最小privileges／function ownership→commit→讀`pg_roles`與ownership。**Expected result：** owner可用且attributes符合。**Postconditions：** owner不擁有tables、不具LOGIN／SUPERUSER／BYPASSRLS。**Evidence：** sanitized role inventory。**Failure meaning：** 必須升權才能運作。**Design decision impact：** SEC-03 blocking risk。

### Test 08 — SECURITY INVOKER helper

- **Purpose：** 驗證read helper保留caller權限。**Preconditions：** A／B各有隔離fixture。**Fixture／initial state：** mapping及minimum case facts。**Actor／role：** authenticated A、B。**Session count：** 2。
- **Operation：** A與B各自開始read transaction→呼叫approved policy path→再以cross-Case target、missing及ambiguous fixture重試→rollback read transaction。**Expected result：** own scope成功，其餘false／not found。**Postconditions：** 無writes、無hidden counts。**Evidence：** `prosecdef`／ACL＋symbolic result matrix。**Failure meaning：** elevation或leak。**Design decision impact：** SEC-03／04 FAIL。

### Test 09 — Minimal SECURITY DEFINER mutator

- **Purpose：** 驗證單一allowlisted atomic mutation。**Preconditions：** Test 07 owner已證明；client direct DML=0。**Fixture／initial state：** Actor A own DRAFT。**Actor／role：** authenticated A＋function owner context。**Session count：** 1–2。
- **Operation：** A呼叫mutator執行合法target並commit→以cross-Case／額外欄位輸入重開transaction→預期拒絕並rollback→查final writes。**Expected result：** 只允許一種合法寫入。**Postconditions：** 無cross-scope或arbitrary DML。**Evidence：** function metadata＋write inventory。**Failure meaning：** over-privileged mutator。**Design decision impact：** SEC-03／05 FAIL。

### Test 10 — Empty search path／schema spoofing

- **Purpose：** 驗證qualification與fixed empty `search_path`。**Preconditions：** 攻擊者可在其允許schema建立同名spike object。**Fixture／initial state：** legitimate與spoof objects。**Actor／role：** authenticated attacker＋DEFINER owner。**Session count：** 2。
- **Operation：** Attacker建立spoof並commit→呼叫target function→owner function只解析fully-qualified object→查`proconfig`→清理只留於isolated transaction scope。**Expected result：** spoof不被使用。**Postconditions：** legitimate target唯一被讀寫。**Evidence：** `proconfig`＋symbolic target result。**Failure meaning：** unqualified resolution成功。**Design decision impact：** critical SEC-03／04 FAIL。

### Test 11 — Private helper direct EXECUTE denial

- **Purpose：** 驗證private helper不可由client直接執行。**Preconditions：** helper ACL已套用。**Fixture／initial state：** minimum A／B facts。**Actor／role：** PUBLIC、anon、authenticated A、B。**Session count：** 至少4 contexts。
- **Operation：** 每個context各自開始transaction→直接EXECUTE helper→記錄拒絕→再由approved policy／mutator間接使用→結束transaction。**Expected result：** direct全部拒絕，approved internal path可用。**Postconditions：** PUBLIC EXECUTE=0。**Evidence：** function ACL matrix。**Failure meaning：** 任一direct EXECUTE。**Design decision impact：** SEC-04／05 FAIL。

### Test 12 — RLS helper recursion

- **Purpose：** 驗證policy呼叫helper不recursion或洩漏。**Preconditions：** narrow RLS＋private helper已建立。**Fixture／initial state：** A／B cases與ambiguous mapping negative fixture。**Actor／role：** authenticated A、B。**Session count：** 2。
- **Operation：** A／B同時執行own及cross-Case SELECT→等待query完成／timeout→重試ambiguous mapping→rollback read transactions。**Expected result：** queries終止、own scope正確，其餘空結果。**Postconditions：** 無recursion、counts／search hints。**Evidence：** explain-safe metadata＋result categories。**Failure meaning：** recursion、availability failure或leak。**Design decision impact：** SEC-04／05 redesign。

### Test 13 — Append-only guard

- **Purpose：** 驗證Published Declaration／Decision UPDATE／DELETE拒絕。**Preconditions：** 已append published rows、guard與ACL存在。**Fixture／initial state：** 一generation＋一Decision。**Actor／role：** authenticated、controlled owner、table-owner threat。**Session count：** 3 contexts。
- **Operation：** Client嘗試UPDATE／DELETE並rollback→approved writer append新row並commit→table-owner threat測試只記錄限制差異。**Expected result：** client mutation拒絕，append成功。**Postconditions：** 原rows未變。**Evidence：** trigger／ACL matrix。**Failure meaning：** ordinary client可改歷史。**Design decision impact：** SEC-02 FAIL。

### Test 14 — Controlled Account Link termination

- **Purpose：** 證明append-only guard不誤擋合法termination。**Preconditions：** active mapping與受控termination operation。**Fixture／initial state：** one active link。**Actor／role：** controlled identity caller／owner。**Session count：** 1。
- **Operation：** 開始transaction→鎖link→只設定DB-time ended facts→commit→另開transaction嘗試重啟／改actor並預期拒絕→rollback。**Expected result：** termination成功，其他mutation拒絕。**Postconditions：** history保留、active=0。**Evidence：** before／after invariant。**Failure meaning：** termination被擋或任意update放行。**Design decision impact：** SEC-02 redesign。

### Test 15 — Caller-bound idempotency

- **Purpose：** 驗證operation-specific、caller-bound retry。**Preconditions：** operation與key scope frozen。**Fixture／initial state：** A／B、Case A／B。**Actor／role：** authenticated A、B。**Session count：** 2–4。
- **Operation：** A以key K＋payload P執行並commit→A以K＋P重試→A以K＋不同payload、B以K、其他operation／Case以K分別執行並預期fail closed→查authoritative rows。**Expected result：** 只有first semantic result存在。**Postconditions：** 無cross-scope hit或duplicate。**Evidence：** symbolic result identity＋unique inventory。**Failure meaning：** deduplication錯誤。**Design decision impact：** PD-04 FAIL。

### Test 16 — Concurrent Declaration publication

- **Purpose：** 驗證single head與generation order。**Preconditions：** 同family current head、barrier及idempotency keys。**Fixture／initial state：** generation N。**Actor／role：** two authorized publishers。**Session count：** 2–4。
- **Operation：** A／B各自begin→同時讀／鎖family head→barrier釋放→各嘗試publish→一方commit、另一方retry或rollback→observer查lineage。**Expected result：** 唯一success或serial next generation依contract。**Postconditions：** single head、orders唯一單調。**Evidence：** timing＋lineage摘要。**Failure meaning：** branch／duplicate order。**Design decision impact：** SEC-06 FAIL。

### Test 17 — Concurrent Decision append

- **Purpose：** 驗證每generation唯一database order。**Preconditions：** current generation與兩reviewers。**Fixture／initial state：** Decision stream N。**Actor／role：** authorized reviewer A、B。**Session count：** 2–4。
- **Operation：** A／B begin→barrier同步append request且不提交client order→DB writer配置→commit／retry或rollback→observer查stream。**Expected result：** 每個成功Decision order唯一。**Postconditions：** 不跨generation競爭current truth。**Evidence：** timing＋order摘要。**Failure meaning：** duplicate／mixed generation。**Design decision impact：** SEC-06 FAIL。

### Test 18 — Abandonment versus publication／Decision

- **Purpose：** 驗證DRAFT abandonment競爭時原子fail closed。**Preconditions：** DRAFT、current family及可追加Decision。**Fixture／initial state：** non-abandoned Case。**Actor／role：** abandoner、publisher／reviewer。**Session count：** 2–3。
- **Operation：** A begin並依候選順序鎖Case→B begin嘗試publish／append→barrier控制commit順序→雙方commit或rollback→observer查全部postconditions；交換先後再測。**Expected result：** serialization或一方fail closed。**Postconditions：** 無ABANDONED＋valid prerequisite、partial terminal Decision或current Role。**Evidence：** transaction outcome matrix。**Failure meaning：** partial abandonment。**Design decision impact：** SEC-06／schema transaction review。

### Test 19 — Lock-order positive／negative controls and optional SERIALIZABLE evaluation

- **Purpose：** 以彼此分離的正向、反向及選配SERIALIZABLE子案例，驗證候選lock hierarchy、deadlock detection、完整rollback與安全retry。**Preconditions：** Target 1／2可由兩個transactions鎖定；候選固定正向hierarchy已記錄；可重現barrier已備妥且不依賴sleep或時間巧合。**Fixture／initial state：** mapping、Declaration head、Decision stream及DRAFT fixture可檢查。**Actor／role：** two controlled-operation sessions＋observer。**Session count：** 3。
- **Test 19A — 正常正向lock-order控制／Operation：** Session A與Session B都依候選固定正向lock hierarchy取得Target 1→Target 2；以明確barrier協調兩個sessions。第二個session可以等待，但不得形成deadlock；兩個transactions須依序安全serialize並完成commit。**Expected result：** 正向順序成功且無deadlock。**Postconditions：** 無partial mapping、multiple Declaration heads、duplicate generation order、duplicate Decision order或partial abandonment。**Evidence：** 去敏後的等待、commit及最終postcondition evidence。**Failure meaning：** 正常正向順序仍發生deadlock時，候選lock hierarchy判定FAIL。
- **Test 19B — 刻意反向lock-order負向控制／Operation：** Session A依Target 1→Target 2取得鎖；Session B刻意依Target 2→Target 1取得鎖；barrier確保兩方各自取得第一個鎖後才請求第二個鎖。在未採SERIALIZABLE的row／advisory lock子案例中，等待PostgreSQL deadlock detection。Deadlock victim須完整rollback，禁止在aborted transaction內局部續跑；retry須開啟全新transaction，改用正確固定順序及同idempotency key。**Expected result：** 反向順序觸發deadlock detection。**Postconditions：** 無partial mapping、multiple Declaration heads、duplicate generation／Decision order或partial abandonment。**Evidence：** 獨立保存去敏deadlock SQLSTATE（例如`40P01`或實際等價分類）、barrier順序、victim rollback、survivor結果及新transaction retry摘要。**Failure meaning：** 正常controlled operations可自然形成此反向順序、victim未完整rollback或留下partial state時，候選lock hierarchy判定FAIL。
- **Test 19C — SERIALIZABLE獨立候選子案例／Operation：** 只在後續證據顯示需要評估SERIALIZABLE時，以獨立操作序列、獨立expected result及獨立evidence執行；不得用serialization failure取代Test 19B的deadlock negative control。Serialization failure須獨立保存去敏SQLSTATE（例如`40001`或實際等價分類），retry必須開啟全新transaction。**Expected result：** 若執行，只判定該獨立SERIALIZABLE候選行為；若本次Spike未進入SERIALIZABLE評估，標記`NOT RUN／NOT APPLICABLE`，不得誤報PASS。**Postconditions：** 無partial mapping、multiple Declaration heads、duplicate generation／Decision order或partial abandonment。**Evidence：** 與19B deadlock evidence完全分離的serialization outcome、SQLSTATE、rollback及retry摘要。**Failure meaning：** 混用deadlock與serialization evidence、在舊transaction重試或留下partial state。**Design decision impact：** SERIALIZABLE仍只是候選，不因設計或執行本子案例而提前凍結；任何lock hierarchy缺陷回Migration Draft Design。

### Test 20 — Cross-Case isolation and hidden metadata

- **Purpose：** 驗證A／B隔離與ABANDONED minimum confirmation。**Preconditions：** A／B cases、one ABANDONED case、narrow policies。**Fixture／initial state：** 全合成資料。**Actor／role：** anon、A、B、service threat、table owner。**Session count：** 至少5 contexts。
- **Operation：** 各context獨立開始read transaction→執行own／cross-Case direct ID、search、autocomplete、count、empty-state及ABANDONED queries→記錄symbolic category→rollback。**Expected result：** A／B互不可見；elevated差異只作threat evidence。**Postconditions：** client只見own minimum及ABANDONED confirmation。**Evidence：** role×operation matrix。**Failure meaning：** row、count、hint或history leak。**Design decision impact：** critical SEC-05 FAIL。

Test 04／05若Local平台行為不能代表Hosted Supabase，只能標記`PARTIAL`；不得以Local PASS取代Remote readiness review。上述都是操作規格，不是test script；本輪不得建立或執行任何script。

## 7. Role and privilege verification matrix

| Context | Intended use | Required catalog／behavior assertions | Must not imply |
|---|---|---|---|
| `postgres`／migration role | 建立及撤銷spike objects、查看catalog | 記錄`rolsuper`、`rolbypassrls`、ownership；只用於migration／threat context | client可用權限 |
| Dedicated NOLOGIN function owner | 必要DEFINER candidate owner | `rolcanlogin=false`、`rolsuper=false`、`rolbypassrls=false`；可own function但不必own table；只有必要table privileges | 全schema或Stage 2 authority |
| `anon` | 未登入negative tests | table SELECT／DML、private helper EXECUTE、controlled mutator EXECUTE均拒絕 | 存在任何public access |
| Authenticated Actor A | own DRAFT positive及cross-Case negative | 只獲minimum SELECT與個別mutator EXECUTE；direct DML=0 | creator等於governor |
| Authenticated Actor B | isolation對照 | 與A完全對稱且互不可見 | shared tenant access |
| Service／BYPASSRLS role | 威脅與限制證據 | 明確記錄`rolbypassrls`與FORCE RLS無法限制它；不得作一般PASS caller | RLS保護elevated operator |
| Table owner context | owner bypass／FORCE RLS測試 | object owner、table privileges、RLS enabled／forced行為 | Production owner model已核准 |

每個function須盤點owner、EXECUTE ACL、`prosecdef`、`proconfig`／`search_path`；每張table須盤點owner、direct DML grants、RLS enabled／forced、policies。PUBLIC EXECUTE必須為0。

## 8. Auth deletion alternatives

| Alternative | Tests | PASS condition | Stop／follow-up |
|---|---|---|---|
| Nullable Auth FK＋controlled detach | delete前detach、delete後state、並行race | history保留但Auth reference依approved policy最小化；無usable mapping | 無法維持correlation／privacy→回SEC-01 |
| Logical Auth reference＋controlled detach | Auth row不存在時resolver、history、relink attempt | resolver fail closed；不依Email／metadata；history最小化 | 需要不必要PII→FAIL／Privacy review |
| Strict FK | ordinary／admin delete | 平台行為明確、無unsafe bypass；若阻擋delete需可治理runbook | admin delete不可控或race→不接受 |
| Auth schema trigger／hook candidate | ordinary／admin paths、failure、restore | hook不造成recursive／privileged side effects，失敗時mapping不可用 | 只靠App cleanup→FAIL |

停止條件：只能靠App cleanup、delete後仍有usable mapping、或保留history必須保存不必要Email／metadata，均為FAIL。Local／Hosted差異一律標示PARTIAL。

## 9. Function owner and RLS proof plan

必須證明：

- Local migration role能建立dedicated NOLOGIN、non-superuser、non-BYPASSRLS role，或明確證明不可行。
- Function owner可own function而不own tables，只取得operation所需最小privileges。
- Non-BYPASSRLS owner執行DEFINER時，RLS、table grants與explicit scope validation的實際互動。
- FORCE RLS不能限制BYPASSRLS的catalog與behavior證據。
- Policy使用`auth.uid()`時，INVOKER及DEFINER context不混淆caller identity。
- 每個DEFINER function重新解析caller，驗證Actor mapping、Case scope、operation allowlist及cross-Case mismatch。
- Private helper無direct client EXECUTE，policy呼叫不recursion、不洩漏counts。

若DEFINER owner必須取得BYPASSRLS或超出operation所需的廣泛table privileges，判定blocking risk，SQL Draft維持BLOCKED。

## 10. Candidate lock hierarchy（not frozen）

| Controlled operation | Candidate order | Missing-row strategy | Concurrency／retry responsibility |
|---|---|---|---|
| Actor mapping | Auth identity namespace → Actor scope → active-link rows | transaction advisory lock candidate keyed by isolated DB／operation namespace＋opaque target | DB writer配置generation；caller重試同idempotency key |
| Minimum DRAFT creation | caller Actor row → new Case scope → combined fixture integrity | idempotency unique fact先行；必要時target advisory lock | 全部fixture facts同commit／rollback |
| Declaration publication | Case row → family namespace／row → current head | family尚無row時使用namespaced transaction advisory lock candidate | DB配置generation；loser retry或fail closed |
| Decision append | Case／family validation → current generation row →Decision stream | stream尚無Decision時鎖generation row，不依app mutex | DB配置decision order；conflict rollback |
| DRAFT abandonment | Case row →family heads（deterministic order）→Recipient／Person scope | 不允許逐步client calls；鎖定所有current prerequisites | terminal Decisions、ended Role、minimization、tombstone原子完成 |
| Auth unlink／detach | Auth namespace →Actor mapping row | mapping missing時fail closed；不建立replacement | delete race只有一個合法終局 |

本輪不凍結row lock syntax、advisory key或SERIALIZABLE。若使用advisory lock，key須包含隔離database／project namespace、operation type與opaque target的穩定表示，並測試collision；不得使用可跨專案碰撞的裸hash。SERIALIZABLE只在較窄lock＋constraints無法證明安全時評估。Database負責serialization；App只依明確retry contract重試，不得使用app mutex作安全保證。

## 11. Evidence and sanitization plan

Evidence directory為0700，files為0600且不得覆寫。預定artifacts：

1. `preflight.txt`
2. `environment.txt`
3. `object-inventory.txt`
4. `role-inventory.txt`
5. `acl-inventory.txt`
6. `rls-inventory.txt`
7. `auth-delete-results.txt`
8. `transactionality-results.txt`
9. `concurrency-results.txt`
10. `test-summary.txt`
11. `manifest.json`
12. checksums file covering all sanitized artifacts

`manifest.json`只記錄test IDs、tool versions、sanitized filenames、checksums、PASS／FAIL／PARTIAL、start／end time與cleanup state；不保存row payload。

禁止寫入evidence／terminal transcript／report：

- local service-role key、anon key、JWT、Auth access／refresh token；
- database connection string、password、remote URL／project ref；
- 完整Email、UUID、fixture row、private recovery identity；
- Supabase bootstrap credential payload。

`.invalid` fixture Email只能在執行中的isolated database使用；evidence統一替換為Actor A／B。任何redaction失敗或credential落盤立即停止，不再執行後續測試。

### 11.1 Mandatory evidence scan gate

- 本Gate只適用於未來Local Spike execution產生的raw output與technical evidence；目前這份純設計文件不包含execution evidence。
- Raw output只能先寫入private temp root並維持0600；不得直接輸出至Repository、公開report或一般共享位置。
- Credential／identifier redaction scan未PASS時：不得建立sanitized evidence bundle、不得建立該次Spike execution的Technical Evidence checkpoint、不得產生或發布公開技術報告、不得複製任何結果進Repository，也不得進入Technical Evidence Gate。
- Scan失敗立即停止後續tests，只建立不含matching content、權限0600的minimum private failure marker。
- 修正redaction流程並重新掃描成功前，該次execution不得判定PARTIAL或PASS。
- 該次Spike execution的Technical Evidence checkpoint及公開技術報告只能引用已通過scan且checksums已固定的sanitized artifacts。
- 尚未執行Spike並不會阻止本設計文件在Final Read-only Review通過後建立獨立Design checkpoint。Design checkpoint不構成Execution Authorization、Environment Start Authorization或Technical Evidence checkpoint。
- 未來任何execution evidence只要redaction scan未PASS，仍不得建立Technical Evidence checkpoint或公開技術報告。

## 12. Stack stop and cleanup strategy

- Spike成功或失敗後只可考慮對精確workdir執行一般`supabase stop`。執行stop前必須重新核對exact temp root、exact workdir、exact project ID、Section 4.2完整service-port mapping、對應containers、對應volumes，以及它們不屬於Round 1、Round 2或其他歷史stack。
- Stop preflight必須再次證明沒有remote link／remote identity，project ID與ports和本次frozen manifest一致；任何一項不一致即不得執行stop，須停止回報並等待精確授權。
- 不使用`--no-backup`，不直接刪除Docker container／volume。
- 不使用`--all`。
- Stop後保留專用volumes、temp root與sanitized evidence供審查。
- 不清除既有evidence或其他project資產。
- Destructive cleanup須另取得精確target授權；本Gate與Execution Gate均不自動授權。
- 若stop失敗，停止並回報該isolated project狀態；禁止廣泛Docker cleanup或手動刪其他volumes。
- 未經cleanup授權，不得以`rm -rf`、`docker volume rm`或等效命令處理session artifacts。

## 13. Gates and blocking stop conditions

### 13.1 Gate sequence

1. **Spike Design Correction Gate** — 修正本文件的project ID ownership邊界；設計而不執行。
2. **Final Read-only Design Correction Review** — 唯讀確認格式、byte-count、denylist、既有隔離與stop規則無退步。
3. **Design Correction Checkpoint** — 只保存本設計文件；不構成任何執行授權。
4. **New Session Identity Reservation Gate** — 另經授權後只產生一個35-byte候選ID與全新temp root，完成歷史唯一性、ports及資產baseline核對；不得啟動stack。
5. **Environment Start Authorization Review** — 凍結exact ID、workdir、ports、commands、fixtures、evidence與cleanup exclusions。
6. **Environment Start Execution Gate** — operator明確授權後才可啟動指定隔離stack；不得同時執行SQL、Auth或Spike tests。
7. **Post-start Ownership Verification Gate** — 立即驗證Section 4.1的完整八方ownership equality；任何不一致立即停止並保留現場。
8. **Spike Test Execution Authorization Gate** — ownership驗證PASS後，才可另行授權SQL、Auth與20項tests。
9. **Technical Evidence Gate** — 執行20 tests、核對sanitized evidence與stop state。
10. **Decision Revision Gate** — 將證據回填Migration Draft Design的SEC／PD dispositions。
11. **Migration Design Freeze Gate** — 所有blocking proof關閉後才審查。
12. **SQL Draft Gate** — Freeze checkpoint後仍需獨立授權。

### 13.2 Immediate stop conditions

- Git／hash／target preflight mismatch或既有非目標working-tree change。
- Docker／Supabase環境不符合凍結版本、disk不足或candidate port collision。
- Temp project包含remote identity、link、`.env`、`.temp`、existing seed／volume。
- Credential、token、connection string或unredacted fixture identity寫入evidence。
- Dedicated NOLOGIN non-BYPASSRLS owner不可行或需過度privileges。
- Auth delete無法fail closed或只靠App cleanup。
- RLS recursion、schema spoofing、PUBLIC EXECUTE或client direct DML。
- Cross-Case row、count、search hint或ABANDONED history leakage。
- Concurrent publication／Decision產生multiple heads／duplicate orders。
- Abandonment留下partial Decisions、current Role、Person payload或valid prerequisite。
- DDL rollback不完整、deadlock無安全retry或transaction留partial state。
- Migration 001–008或任何Repository file發生變更。
- Remote Supabase connection／mutation跡象。

## 14. Output decision and proof backfill

**READY FOR FINAL READ-ONLY REVIEW FOR SPIKE DESIGN CHECKPOINT — EXECUTION NOT AUTHORIZED**

Gate狀態：

- Spike Design checkpoint：仍須Final Read-only Review。
- Execution Authorization：**NOT GRANTED**。
- Environment Start：**NOT AUTHORIZED**。
- Local Spike execution：**NOT AUTHORIZED**。
- Migration Design Freeze：**BLOCKED pending Local Spike evidence**。
- SQL Draft：**BLOCKED**。
- Repository Migration：**BLOCKED**。
- Remote Supabase／Production：**BLOCKED**。

仍未授權的操作：

- 啟動／停止Local Supabase或Docker stack；
- 建立Auth user、container、volume、schema、table、function、trigger、policy或role；
- 執行SQL、test、cleanup或destructive command；
- 建立Repository Migration／SQL Draft／harness；
- 連接Remote Supabase、Production或deployment。

Spike成功後須回填：

- PD-01 transactionality與PD-04 idempotency／concurrency proof；
- SEC-01 Auth reference／delete implementation候選；
- SEC-02 append-only trigger範圍；
- SEC-03 per-function INVOKER／DEFINER與owner；
- SEC-04 final helper count／private schema／recursion；
- SEC-05 exact RLS／ACL graph；
- SEC-06 fixed lock order、retry與serialization。

Spike failure回退路徑：

- 若只否定function owner、RLS helper、Auth deletion、ACL、lock primitive或transaction strategy，回到[`WINWIN_IDENTITY_CASE_GOVERNANCE_FOUNDATION_MIGRATION_DRAFT_DESIGN_REVIEW.md`](WINWIN_IDENTITY_CASE_GOVERNANCE_FOUNDATION_MIGRATION_DRAFT_DESIGN_REVIEW.md)修正。
- 若否定7-table Foundation entity boundary、relationship、lifecycle、invariant或data-model assumption，回到[`WINWIN_IDENTITY_CASE_GOVERNANCE_FOUNDATION_SCHEMA_DESIGN_REVIEW_DRAFT.md`](WINWIN_IDENTITY_CASE_GOVERNANCE_FOUNDATION_SCHEMA_DESIGN_REVIEW_DRAFT.md)修正。
- 若影響已凍結Product Definition的產品責任或Stage boundary，另開Product Decision Review，不得直接改SQL。
- 任何FAIL或PARTIAL都不自動授權SQL Draft、Migration Freeze或降級安全條件。

## 15. Explicit next step

下一步只能做本文件的Final Read-only Spike Design Review。Review PASS並建立獨立design-document checkpoint後，才可提出精確的Execution Authorization Gate；Execution仍不自動成立。

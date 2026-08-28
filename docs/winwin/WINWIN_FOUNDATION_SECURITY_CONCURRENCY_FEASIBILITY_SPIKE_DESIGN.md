# WinWin Foundation Security／Concurrency Feasibility Spike Design

> **狀態：INTRINSIC SIDE-EFFECTS NORMATIVE CORRECTION — Design Only; Execution Not Authorized**
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
- Spike execution、operator SQL與manual stop／cleanup均需要後續各自明確授權；未來Local stack start僅能按Section 4.4的compound contract授權，其中可包含經review的SQL-A／條件式SQL-B，不能包含未授權SQL-C／SQL-D。

## 2. Read-only environment inventory

以下是原始設計時的歷史唯讀盤點，不是本次correction的即時環境證據；本輪未查詢或啟動／停止Docker／Supabase：

| Item | Read-only finding | Design consequence |
|---|---|---|
| Supabase CLI | `2.115.0`；已接受的source研究證明`SUPABASE_TELEMETRY_DISABLED=1`不保證沒有home／telemetry state write | Section 4.4須分別限制傳輸、state、traces與home；不能把disabled當成zero-write證據 |
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
- 固定telemetry transmission disabled、update notifier disabled及`umask 077`；有效機制、home state與其他寫入仍須按Section 4.4逐項證明，不因設定一個環境變數而視為已隔離。
- 使用`supabase --workdir <isolated-root>`，不得從Repository root啟動。
- Seed disabled只是必要條件之一；SQL-C與bucket／object／function等project inputs須逐支證明absent或provably disabled。不複製既有`.temp`、remote link、`.env`、config secrets或migration chain；新CLI intrinsic `.temp`採Section 4.4 allowlist，不是一律禁止。
- Temp root與evidence directory權限0700；evidence files建立後驗證0600。
- Operator建立的Spike SQL、test harness、session scripts、generated config、sanitized evidence、manifest、checksums與fixtures只可位於專用temp root；secret-capable raw output不得落盤。CLI intrinsic OS-temp、home與Docker storage另受Section 4.4四區contract約束，不再宣稱所有start寫入都在session root。Repository只保存獲授權文件，不保存execution material。
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

Start後必須立即驗證以下Ownership Integrity Contract；它不是把多筆資產聚合成固定數量的單值，也不保留任何未被證明存在且獨立的第三個CLI ownership來源：

```text
requested project ID
= exact config project_id
AND for every observed candidate container accepted into the runtime set:
    raw com.supabase.cli.project = requested project ID
    raw com.docker.compose.project = requested project ID
AND for every observed candidate volume accepted into the runtime set:
    raw com.supabase.cli.project = requested project ID
    raw com.docker.compose.project = requested project ID
AND for every observed candidate network accepted into the runtime set:
    raw com.supabase.cli.project = requested project ID
    raw com.docker.compose.project = requested project ID
```

每個resource assertion都必須保存exact resource identity及兩個raw label values，逐列與requested ID做byte-for-byte comparison。禁止先聚合成unique ownership set、以`sort -u`消除差異、trim、case-fold、Unicode normalization、prefix／substring match、以resource name推論ownership，或以config值替代Docker observable。

任何missing／malformed label、truncated或normalized-only match、mixed／foreign ownership、unexpected candidate、ambiguous identity或其他不一致均須立即停止並保留現場；不得自動修正、換ID、換port或重試。Missing label不得轉成空值後繼續。只有Section 4.3的resource acceptance全部通過，該批資產才可形成`verified runtime resource set`。

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

Auth、Realtime、Storage及S3 protocol目前經API gateway而沒有獨立host-port config key。此10項是frozen service published-port set，不是所有start intrinsic network／port universe。Optional auxiliary／ephemeral port只有在Gate 5另有明確branch contract時才可存在；沒有contract或出現額外service mapping即FAIL，不臨時換port。必須逐筆驗證HostIP、host port、container port及protocol；localhost-only不可僅由port number推定，`0.0.0.0`／`::`不等於loopback。

### 4.3 Resource Expectation, discovery, and acceptance contract

Supabase CLI `2.115.0`目前沒有經本設計建立的pre-start dry-run／resource-plan observable，可在Environment Start前可靠列出所有exact runtime container、volume與network names。因此本設計不得假裝已知這些exact names，也不得從歷史stack猜測、複製，或在start後以actual資產倒填pre-start expected truth。

#### A. Pre-start Resource Expectation Contract

Environment Start前必須凍結當時可被可靠證明的constraint whitelist：

- requested 35-byte project／session identity及exact config `project_id`；
- frozen Supabase CLI version、exact workdir／session root及remote identity absent；
- allowed resource classes：container、volume、network，以及各類允許的service／purpose categories；
- Section 4.2完整allowed host-port set及每個service的port relationship；
- 每個candidate都必須具備的兩個raw ownership labels及byte-exact expected value；
- 只有經reviewed static evidence證明的naming derivation rule、required class或cardinality；無法靜態證明者須明列`unknown-until-discovery`，不得填入推測值；
- frozen discovery parser、resource acceptance comparator、evidence schema及checksums；
- foreign／mixed ownership、missing／additional／ambiguous resource及unexpected port的fail-closed rules。

Expectation Contract不得包含placeholder，亦不得聲稱unknown runtime exact names已知。只有具足夠independent constraints控制的runtime identity可為unknown-until-discovery；required class／cardinality或其他required acceptance證據缺失時，Gate 5即BLOCKED，不能先start再交Gate 7補證據。Gate 7仍須重驗完整性，不得接受缺失證據。

#### B. Post-start Candidate Resource Discovery

Environment Start成功只代表CLI process完成，不代表任何新資產已被接受。第一次inspection-only Docker discovery只產生`observed candidate resources`：逐一保存exact resource ID／name、resource class、allowlisted published ports，以及兩個allowlisted ownership labels；不得擷取all-label metadata或把discovery結果寫回Expectation Contract。

Discovery必須同時偵測：candidate scope內所有資產、指向candidate ownership的資產、使用allowed ports的資產，以及frozen native Docker CLI workdir／service／mount／attachment scope相關資產。CLI 2.115.0穩定start路徑不是Compose；label名稱含compose不構成Compose provenance。Parser crash、partial output、missing label、duplicate／ambiguous identity或無法完成全量inspection均FAIL，不得把未觀測到視為不存在。

#### C. Post-start Resource Acceptance

每個observed candidate必須逐項通過：

1. resource class與service／purpose category屬Expectation Contract allowlist；
2. resource位於核准session／workdir／project scope，沒有foreign或mixed ownership；
3. Section 4.1兩個raw ownership labels都與requested ID byte-for-byte相等；
4. service published ports及HostIP是Section 4.2與Gate 5允許的exact mapping；任何auxiliary／ephemeral exposure另有已授權contract，否則拒絕；
5. resource relationship符合已review的static naming／service contract；
6. required class／cardinality若已被static evidence凍結，實際集合必須精確符合；
7. unknown-until-discovery項目仍須由明確allowlist、ownership、scope、port及relationship assertions驗證，不能因「已被找到」而被接受；
8. absence、additional、ambiguous或無法分類的resource一律fail closed。

只有全部候選及集合層assertions通過，才形成不可倒填Expectation Contract的`verified runtime resource set`。明確禁止`actual = expected because actual was discovered`的循環驗證。Gate 7環境觀測為inspection-only；evidence持久化另需精確寫入授權。失敗後operator不修改candidate、不rename／repair、不換ID／port、不retry／cleanup，保留CLI返回後仍存在的現場並等待新授權；這不保證Section 4.4所述CLI intrinsic rollback尚未移除任何資產。

### 4.4 Environment Start intrinsic side-effects authorization contract

#### Compound model and source boundary

未來Environment Start必須被精確授權為 **AUTHORIZED COMPOUND CLI TRANSACTION**。這是授權範圍的集合，不是PostgreSQL atomic transaction，亦不是all-or-nothing filesystem／Docker rollback承諾。只有Frozen Gate 5 Compound Transaction Contract列出的CLI intrinsic branches可包含在S-06；文件完成本身不授權任何branch執行。

已接受的研究A結論足以修正舊規範，不等於installed binary與source完全對應或runtime acceptance已證明。[Correction artifact](WINWIN_FOUNDATION_ENVIRONMENT_START_INTRINSIC_SIDE_EFFECTS_CORRECTION.md)保存固定source provenance、已觀察行為與remaining blockers；本Design為normative authority，Runbook負責程序。版本變更必須重驗，不能把2.115.0行為當成永久API保證。

#### SQL taxonomy

| Class | Meaning／reachable branch | Future authorization boundary |
|---|---|---|
| SQL-A | CLI／platform intrinsic globals、roles、schema、API privileges、Auth／Storage／Realtime等platform service migrations及internal metadata bootstrap；須有固定source、trigger與local DB target | 可在S-06逐支明確接受；不是WinWin SQL，不授權operator psql或自製bootstrap |
| SQL-B | CONDITIONAL-INTRINSIC：existing-volume convergence，例如webhooks／pg_net與platform metadata調整 | Existing-volume branch不是read-only。此Foundation採fresh-only，B須證明不可達；未來改用existing需新設計與新授權，不能沿用本次contract |
| SQL-C | User／project migrations、roles.sql、declarative schema、seed SQL、vault values或其他project SQL inputs | 預設NOT AUTHORIZED；逐項absent或provably disabled，不能只靠seed／migration單一flag。無法排除即Gate 5 BLOCKED；獨立核准也須重新審scope，不能偷偷併入S-06 |
| SQL-D | Spike fixture、RLS／concurrency tests及任意operator SQL | 只能由Gate 8後獨立精確授權；start PASS、SQL-A授權或platform health check均不授權D |

Fresh／existing branch必須在start前freeze；fresh DB仍可執行SQL-A。不得reuse歷史volume；若觀測到existing DB／stopped-stack recovery branch或branch無法確定，停止，不接受CLI自行恢復舊stack。排除long-running service不等於排除其fresh platform migration。

#### Filesystem containment: four distinct zones

| Zone | Allowed only under reviewed contract | Required bounds／failure |
|---|---|---|
| Session／workdir | isolated config、operator scripts、sanitized evidence與明確CLI intrinsic paths | exact resolved root／relative path allowlist、symlink escape拒絕、0700／0600、writer與lifecycle、create-new evidence；禁止Repository／historical inputs |
| OS temporary storage | SQL staging等CLI／dependency scoped temp：`supabase-start-db-setup-`、`supabase-start-db-webhooks-`等已證明prefix | 保存API、實際temp parent解析方式、prefix、umask／file mode、normal finalizer、crash residue與secret risk。未證明redirect時標記 **NOT SESSION-CONTAINED BUT EXPLICITLY BOUNDED**；parent或permissions未能界定仍BLOCKED，不能憑標籤接受 |
| Supabase home／state／traces | 經review的telemetry state／cache寫入，不能因disabled而假定不存在 | 查明每個writer實際home解析方式、檔名／atomic temp、mode、retention；若使用`SUPABASE_HOME`須證明所有相關writer遵守，不重設系統HOME；不能界定時 **HOME-WRITE CONTAINMENT BLOCKER** |
| Docker storage | 指定local daemon內images、layers、container logs、volumes、network metadata | 不在session root；固定daemon/context endpoint、image／cache與storage scope、secret-bearing logs政策、retention與後續cleanup授權；不得聲稱stop可還原host |

`.temp`按artifact class管理：required／conditional intrinsic（例如Edge `start-secrets`及main script staging）、disabled／forbidden input或cache（例如未核准pgdelta、update cache、copied link pins）、secret-bearing artifact（只可記錄存在性、mode、size、lifecycle，禁止讀內容進evidence）。`.branches/_current_branch`是獨立非`.temp`metadata write，亦須列allowlist。Unknown file／writer或symlink escape即FAIL；不是整個`.temp`目錄必然FAIL，也不是任意CLI寫入皆允許。

Edge secrets可能成功後留存、失敗best-effort清除，main script mode另受umask／驗證；container內tar/copy配置與daemon logs可能含秘密，須與evidence分開管理，不能宣稱CLI從不產生credentials。Host bind mount的來源若不存在可能被Docker建立；rw mount、SELinux relabel與Docker socket mount均要獨立審查，read-only socket mount不代表API只讀。

#### Docker images, network, telemetry and auxiliary jobs

- 固定CLI version／binary hash與source correspondence status。既有tag/source映射不是reproducible-build證明；不補造缺失證據。
- 固定Docker client context、daemon實際endpoint與local／remote歸屬；禁止remote daemon或不明context，不能只驗證version／reachable。
- Image policy逐項freeze image refs、registry allowlist、tag／digest政策、cached-image acceptance、registry fallback、credential-helper使用邊界、pull/cache mutation與caller deadline。Cached tag不能證明digest；必要digest／provenance缺失為 **SUPPLY-CHAIN / IMAGE PROVENANCE BLOCKER**。不讀credential-helper值、不繼承未知registry authorization。
- CLI image retry／backoff／registry fallback與operator retry分開：只接受source已知且在contract內的branch；caller timeout／signal可能觸發rollback，須預先界定而不是事後kill保留現場。不得發明CLI retry或deadline flags。
- Telemetry transmission、consent／identity state、trace persistence與pruning分別審查。`SUPABASE_TELEMETRY_DISABLED=1`不保證legacy state不落盤，也不保證其他network activity不存在。Update notifier採 **DISABLED**，固定`SUPABASE_NO_UPDATE_NOTIFIER=1`機制並驗證適用路徑；不能讓successful start後的notifier偷偷新增GitHub request／cache write。
- Optional pgdelta採 **NOT IMPLICITLY ALLOWED**；預設須證明disabled。若未來要啟用，另審host-network branch、ephemeral loopback allocation、temporary container、package download／cache volume／CA與labels。Unknown reachability或未核准auxiliary port即Gate 5 BLOCKED。
- Network contract分ALLOWED／DISABLED／CONDITIONAL：image registries、telemetry、update request、service egress、SMTP、Auth hooks、GCP／external metadata、Edge dependency downloads及pgdelta等逐支審查。Local stack不等於zero egress；不能操作Remote Supabase／Production，也不得讀token。只允許明確local service topology及經授權registry egress，其他分支須證明disabled或另經精確審查。
- Project input audit涵蓋roles.sql、migrations、seed、experimental declarative schema、vault、Storage bucket／object seeds、functions／import dependencies及其他config driven inputs，須逐項證明absent或provably disabled。後置bucket seed不等於SQL seed，不能用SQL-A掩蓋；不把`migration.enabled`視為所有分支開關。
- Health/status可能輸出credentials或service logs。拒絕未審查的ignore-health-check選項；exit 0不代表healthy、所有service存在或resource accepted。必須以source-bound health criteria及Gate 7獨立驗證。

#### Intrinsic rollback, operator retry, and preservation

未來S-06可以只在已審查failure branches內包含CLI intrinsic stop、container prune、conditional volume prune、network prune及temporary secret cleanup。它們不是operator自動cleanup授權。Source研究顯示rollback可依`com.supabase.cli.project`篩選，而非只依本次新建ID清單；故pre-start collision必須排除舊資產落入該selector。Intrinsic volume prune的API行為不能被manual `supabase stop --all`禁令誤判為不存在。

不承諾失敗時完整保留所有containers／volumes／network。CLI可能在返回前或signal handling中已移除部分資產，cleanup可能部分失敗，image/cache/home殘留也不自動回復。需保存pre-start frozen inventory／contract、invocation、去敏CLI結果、post-return inventory、known rollback path與remaining／disappeared／unknown disposition；只有受核准的evidence write可持久化。

失敗後operator只可做已授權inspection與sanitized evidence保存，不得新start、換ID／port、manual stop／cleanup、recreate、repair或retry。CLI內建image pull retry不是第二次operator invocation；Spike transaction retry仍由Test 19及未來Gate 8的獨立scope約束。保存現場指不再改動CLI返回後的剩餘狀態，不聲稱能阻止已開始的CLI intrinsic rollback。

#### Frozen Gate 5 Compound Transaction Contract

Gate 5名稱為 **Environment Start Compound Transaction Authorization Review**。Runbook Section 5.2的20項逐一建立observable、expected value、branch status、evidence與reviewed helper checksum；任何required `NOT ESTABLISHED`／`NOT YET ESTABLISHED`／`CONFLICTING`／`BLOCKED`或unknown reachability均阻擋PASS。Contract包含以下不可省略項目：

| ID | Required review |
|---|---|
| CT-01 | CLI version／binary／source correspondence |
| CT-02 | Docker daemon／context／local endpoint |
| CT-03 | Planned config、writer與generated-config lifecycle |
| CT-04 | Fresh／existing branch及collision exclusion |
| CT-05 | SQL-A／conditional SQL-B intrinsic allowlist |
| CT-06 | SQL-C／project inputs與SQL-D exclusion |
| CT-07 | Images／digest／registry／cache／fallback policy |
| CT-08 | Update notifier disabled proof |
| CT-09 | Telemetry transmission、home／state／traces bounds |
| CT-10 | OS-temp API／parent／permissions／cleanup／residue |
| CT-11 | `.temp`及branch-marker artifact lifecycle |
| CT-12 | Edge staging／secrets／mounts／dependencies |
| CT-13 | Optional pgdelta branch disabled或完整獨立contract |
| CT-14 | Service HostIP／ports及auxiliary exposure |
| CT-15 | Registry／service／external network boundaries |
| CT-16 | Intrinsic rollback選取範圍與post-return preservation |
| CT-17 | Intrinsic retry與operator禁止retry／deadline |
| CT-18 | Output／health／status redaction與evidence persistence |
| CT-19 | Independent resource acceptance constraints |
| CT-20 | Required inspection／writer／redactor／comparator implementations與checksums |

Gate 5 PASS仍不授權執行。Gate 6維持6A config materialization、6B actual verification、6C獨立授權S-06；6C授權必須引用Frozen Gate 5 Compound Transaction Contract checksum及有效6B證據，不可只引用start字串hash。6A／6B不一致立即停止，不改config續跑。

Resource Acceptance Evidence Research在本次normative correction PASS前維持 **PAUSED UNTIL NORMATIVE CORRECTION PASS**。PASS後只能另開research，納入native Docker（不是Compose）、daemon/context、images／digest、rollback selector、auxiliary資產以及container→service、volume→mount、network→attachment第二層證據；不得以labels alone或discovery倒填expected。Gate 5仍BLOCKED，Environment Start仍須獨立授權。

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
- Secret-capable raw output不得先寫入private temp、quarantine、terminal transcript或Repository；只能在記憶體經已review的allowlist parser／redactor處理。只有已證明不含秘密且欄位在allowlist內的raw output才可依精確evidence-write授權保存，0600不構成先寫raw的例外。
- Credential／identifier redaction scan未PASS時：不得建立sanitized evidence bundle、不得建立該次Spike execution的Technical Evidence checkpoint、不得產生或發布公開技術報告、不得複製任何結果進Repository，也不得進入Technical Evidence Gate。
- Scan失敗立即停止後續tests；只有預先取得精確evidence-write授權才可建立不含matching content、權限0600的minimum private failure marker，否則不建立檔案。
- 修正redaction流程並重新掃描成功前，該次execution不得判定PARTIAL或PASS。
- 該次Spike execution的Technical Evidence checkpoint及公開技術報告只能引用已通過scan且checksums已固定的sanitized artifacts。
- 尚未執行Spike並不會阻止本設計文件在Final Read-only Review通過後建立獨立Design checkpoint。Design checkpoint不構成Execution Authorization、Environment Start Authorization或Technical Evidence checkpoint。
- 未來任何execution evidence只要redaction scan未PASS，仍不得建立Technical Evidence checkpoint或公開技術報告。

## 12. Stack stop and cleanup strategy

- 本節規範operator發起的stop／cleanup，不限制或否認Section 4.4已另行審查授權的S-06 intrinsic rollback。Spike成功或失敗後只可提出對精確workdir執行一般`supabase stop`的獨立授權請求。執行stop前必須重新核對exact temp root、exact workdir、exact project ID、Section 4.2 service-port／HostIP mapping、對應containers／volumes，以及它們不屬於其他歷史stack。
- Stop preflight必須再次證明沒有remote link／remote identity，project ID與ports符合本次frozen Resource Expectation Contract，且待停止的containers、volumes、network逐一屬於Gate 7形成的verified runtime resource set；任何一項不一致即不得執行stop，須停止回報並等待精確授權。
- 不使用`--no-backup`，不直接刪除Docker container／volume。
- 不使用`--all`。
- Operator一般stop採保留專用volumes與sanitized evidence的策略，但CLI已執行的intrinsic cleanup不得被報成完整保留。Stop後須觀測剩餘temp root／volumes及artifact disposition；stop不等於host rollback，不保證刪除image cache、OS-temp residue、home state或daemon logs。未形成Gate 7 verified set時不得套用一般pre-stop PASS，須另審精確故障處置。
- 不清除既有evidence或其他project資產。
- Destructive cleanup須另取得精確target授權；本Gate與Execution Gate均不自動授權。
- 若stop失敗，停止並回報該isolated project狀態；禁止廣泛Docker cleanup或手動刪其他volumes。
- 未經cleanup授權，不得以`rm -rf`、`docker volume rm`或等效命令處理session artifacts。

## 13. Gates and blocking stop conditions

### 13.1 Gate sequence

1. **Spike Design Correction Gate** — 修正project ID／ownership與intrinsic compound authorization邊界；設計而不執行。
2. **Final Read-only Design Correction Review** — 唯讀確認格式、byte-count、denylist、既有隔離與stop規則無退步。
3. **Design Correction Checkpoint** — 只保存當次明確授權的設計文件集合；原單檔checkpoint不授權其他檔。本次獨立授權僅在review PASS後保存Design、Runbook與correction artifact三檔，不構成任何執行授權。
4. **New Session Identity Reservation Gate** — 另經授權後只產生一個35-byte候選ID與全新temp root，完成歷史唯一性、ports及資產baseline核對，並凍結Section 4.3的Pre-start Resource Expectation Contract；不得啟動stack，不要求或猜測無法事前證明的runtime exact resource names。
5. **Environment Start Compound Transaction Authorization Review** — 依Section 4.4與Runbook CT-01至CT-20審查完整compound contract，而非只審start命令。Required evidence缺失即BLOCKED；PASS仍不授權Environment Start。
6. **Environment Start Execution Gate** — 6A materialize、6B verify、6C獨立授權S-06；只包含Frozen Gate 5 Compound Transaction Contract已審intrinsic SQL-A與Docker／filesystem／network／rollback分支；本Foundation fresh-only排除SQL-B，亦不包含SQL-C、SQL-D、Auth fixtures或Spike tests，不自動接受runtime資產。
7. **Post-start Resource Discovery／Ownership Integrity Verification Gate** — inspection-only依Section 4.3執行candidate discovery、exact identity capture、Section 4.1逐資產Ownership Integrity Contract、resource acceptance及verified runtime resource set formation。只有所有required assertions成立才PASS；任何不一致立即停止並保留現場。
8. **Spike Test Execution Authorization Gate** — 完整resource acceptance／ownership／persistent evidence PASS後，才可另行授權SQL-D、Auth fixtures與20項tests。
9. **Technical Evidence Gate** — 執行20 tests、核對sanitized evidence與stop state。
10. **Decision Revision Gate** — 將證據回填Migration Draft Design的SEC／PD dispositions。
11. **Migration Design Freeze Gate** — 所有blocking proof關閉後才審查。
12. **SQL Draft Gate** — Freeze checkpoint後仍需獨立授權。

### 13.2 Immediate stop conditions

- Git／hash／target preflight mismatch或既有非目標working-tree change。
- Docker／Supabase環境不符合凍結版本、disk不足或candidate port collision。
- Temp project包含remote identity、link、copied `.env`、未allowlist的`.temp`／branch metadata、未排除的project inputs／seed／existing volume；required intrinsic `.temp`依Section 4.4治理而非一律禁止。
- Compound contract出現未審branch／SQL-C／SQL-D、source correspondence／daemon／image provenance／home／OS-temp／HostIP／network／retry／rollback／redaction必要證據缺失。
- Resource Expectation Contract含未知exact names的推測值、placeholder或未經review的naming／cardinality assertion。
- Candidate discovery不完整、parser failure，或將observed actual倒填成expected truth。
- Candidate resource class／scope／port／relationship不在allowlist，或存在missing、additional、ambiguous、foreign／mixed ownership。
- 任一required ownership label missing／malformed／truncated／normalized-only match，或未與requested ID逐資產byte-exact相等。
- Credential、token、connection string或unredacted fixture identity寫入evidence。
- Dedicated NOLOGIN non-BYPASSRLS owner不可行或需過度privileges。
- Auth delete無法fail closed或只靠App cleanup。
- RLS recursion、schema spoofing、PUBLIC EXECUTE或client direct DML。
- Cross-Case row、count、search hint或ABANDONED history leakage。
- Concurrent publication／Decision產生multiple heads／duplicate orders。
- Abandonment留下partial Decisions、current Role、Person payload或valid prerequisite。
- DDL rollback不完整、deadlock無安全retry或transaction留partial state。
- 執行環境階段Migration 001–008或任何Repository file發生變更；本次明確授權的純文件correction及本機checkpoint不屬於環境執行。
- Remote Supabase connection／mutation跡象。

## 14. Output decision and proof backfill

**NORMATIVE CORRECTION DOCUMENTATION — EXECUTION NOT AUTHORIZED**

Gate狀態：

- 本次pre-correction基線：`e4084d82838bb00f805d4e542bb1abdeecdaef01`；當次checkpoint是否完成以Git metadata為準，不自我嵌入commit hash。
- Normative correction／Runbook／correction artifact：**STATIC CROSS-DOCUMENT REVIEW PASS — READY FOR LOCAL CHECKPOINT**；mechanical validation仍必須全PASS才可commit。這不是runtime evidence、新Human批准或execution授權。
- Resource Acceptance Evidence Research：**PAUSED UNTIL NORMATIVE CORRECTION PASS**；PASS後為另行授權的NEXT research，不在本輪執行。
- Gate 5：**BLOCKED pending compound contract and resource acceptance evidence**。
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

本次cross-document review與mechanical validation全PASS後，只可依本輪精確授權建立Design＋Runbook＋correction artifact的local checkpoint，不push。之後依序為另行授權Resource Acceptance Evidence Research → Gate 5重新審查 → 獨立Environment Start授權 → post-start verification → 獨立Spike execution授權；不是下一步就start。若发现不可界定的intrinsic branch／remote mutation、不能排除project SQL、不能區分platform／WinWin SQL、不能界定daemon，或必須先start才能證明基本模型自洽，判定C並停止，不以更寬allowlist掩蓋。

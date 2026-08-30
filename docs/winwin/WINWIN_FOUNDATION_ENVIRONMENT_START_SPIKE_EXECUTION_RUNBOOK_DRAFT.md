# WinWin Foundation Environment Start／Spike Execution Runbook

> **Status: INTRINSIC SIDE-EFFECTS CORRECTION STATIC REVIEW PASS — Documentation Only; Gate 5 Blocked; No Execution Authorization**
>
> 本文件把[`WINWIN_FOUNDATION_SECURITY_CONCURRENCY_FEASIBILITY_SPIKE_DESIGN.md`](WINWIN_FOUNDATION_SECURITY_CONCURRENCY_FEASIBILITY_SPIKE_DESIGN.md)轉換為可操作、可驗證、可停止的程序。它不授權push、建立session、啟動或停止Supabase／Docker、執行SQL／Migration、Auth mutation、Spike tests或cleanup。任何不確定是否改變狀態的命令，一律視為`STATE-CHANGING`。

## 1. Authority, scope, and frozen status

Normative source：

- [`WINWIN_FOUNDATION_SECURITY_CONCURRENCY_FEASIBILITY_SPIKE_DESIGN.md`](WINWIN_FOUNDATION_SECURITY_CONCURRENCY_FEASIBILITY_SPIKE_DESIGN.md)為normative authority；Section 4.4是本次compound authorization規範。`82854d21a1b928eba01e94a374a8c706b6df56e2853c247142be7a54e26c62c6`只代表本次修改前Design hash，不是現行文件hash。Pre-correction Git基線為`e4084d82838bb00f805d4e542bb1abdeecdaef01`。
- [Intrinsic Side-Effects Correction](WINWIN_FOUNDATION_ENVIRONMENT_START_INTRINSIC_SIDE_EFFECTS_CORRECTION.md)記錄已接受source findings、correction choices與remaining blockers；不取代Design、不授權執行。

目前狀態：

| Item | Frozen state |
|---|---|
| Foundation Spike Design Phase | `CLOSED` |
| Runbook Review Gate | `INTRINSIC CORRECTION STATIC REVIEW PASS — MECHANICAL VALIDATION REQUIRED BEFORE LOCAL CHECKPOINT` |
| Environment Start | `BLOCKED BY AUTHORIZATION` |
| Spike Execution | `NOT YET ENTERED` |
| Push／Remote Supabase／Production | `NOT AUTHORIZED` |
| SQL／Migration／Auth mutation／Spike tests | `NOT AUTHORIZED` |

本Runbook只能規範未來經獨立授權的隔離Local execution。Runbook完成、審查或checkpoint均不構成任何state-changing authorization。

### 1.1 Adopted post-Gate 6B implementation-status reconciliation（2026-08-30）

本節只修正本Runbook早於後續Foundation checkpoints所留下的implementation-status敘述，不改變Design的normative ownership、resource acceptance、image/digest或Environment Start授權邊界。語意規範仍以Normative Design為最高依據；已採用且fingerprint frozen的Gate 6A／6B closure與其對應implementation，優先於本文件下文較早的「尚未建立」或`<REVIEWED_...>` readiness敘述。歷史research／closure只保存當時狀態，不可覆寫現行Design。

截至本節日期，現行狀態為：

- I-17 exact parser已由`tools/winwin/foundation/lib/configuration.mjs`實作、測試並在真實reserved config上PASS；下文「I-17 implementation尚未建立」已被此adopted checkpoint取代。
- I-24中「generated materialized projection／independent effective projection／frozen static Config Contract／exact project identity」的bounded subset已由同一module實作、測試並PASS。原I-24文字另含SQL-C／project-input、remote-link及`.temp`完整start-boundary inspection；那些較廣scope不得因bounded Gate 6B comparator PASS而宣稱完成，仍屬pre-start blocker。
- I-25 fixed-scope reservation metadata reader已由`tools/winwin/foundation/lib/reservations.mjs`實作、測試並在唯一ACTIVE reservation上PASS；production caller不能替換index root。
- S-05 reviewed config materializer已由`foundationConfigService().materialize(requestedId)`實作，並只對reserved ID `wwfnd-20260830t060320z-b10f6599de24`成功執行一次。其後不得rematerialize、覆寫或以placeholder／alternate writer替代。
- I-21 retirement維持不變：不存在可被重新加入equality chain的獨立「Supabase CLI reported ownership ID」。Ownership authority仍只有exact requested／config identity與每個accepted container、volume、network的兩個raw labels。
- 尚無已freeze的instance Resource Expectation artifact、approved image manifest／platform／config digest records或image-preparation implementation；完整I-30 start-boundary closure、C-01至C-05 instance orchestration／inputs、S-06 launcher、stream redactor及S-12 evidence writer亦未完成。這些缺口維持Gate 5／Environment Start BLOCKED；Gate 6B PASS不授權image preparation或Environment Start。

因此，下文registry中的placeholder只可按本節區分為「已被adopted implementation取代的歷史template」或「仍未實作的runtime blocker」；不得把所有placeholder一律視為未完成，也不得把已完成的bounded subset擴張為完整start-boundary PASS。

## 2. Command classification contract

### 2.1 Classes

- `INSPECTION`：只讀取既有狀態，不建立檔案、不保留shell mutation、不啟動或停止服務、不改Docker／Supabase／Git refs。
- `STATE-CHANGING`：建立或修改任何file、directory、shell session reservation、container、volume、network、database、Auth row、Git ref或process lifecycle的命令；以及任何無法證明唯讀的命令。

規則：

1. 每條可執行命令必須使用本文件的command ID及classification。
2. 同一shell pipeline只要有一段可能改變狀態，整條command即為`STATE-CHANGING`。
3. Runbook記載`STATE-CHANGING`命令不代表該命令已獲授權。
4. 不得把多個不同授權階段串成單一shell command、script或automatic workflow。
5. 任一command的實際字串、參數、workdir或target與已核准manifest不符時不得執行。
6. 禁止臨時命令。Runbook命令須列於本registry；後續文件checkpoint／Decision Revision／SQL Draft及DB test assertions的命令須另列於該Gate獨立審查、checksum frozen且精確授權的command manifest，不能以本文件推定已核准。
7. `STATE-CHANGING — LOCAL EVIDENCE WRITE`仍屬STATE-CHANGING，不是第三種class。它是filesystem mutation，不是Docker／Supabase environment mutation；inspection authorization不包含此寫入授權。
8. Registry中的Evidence欄只指定未來artifact用途，不代表inspection command會寫檔。所有parser／comparator只輸出allowlisted記憶體結果；artifact、verified set、checksum file及sanitized bundle持久化一律由S-12依獨立Local Evidence Write authorization執行。
9. S-06分類為`STATE-CHANGING — AUTHORIZED SUPABASE START COMPOUND TRANSACTION`：其中AUTHORIZED描述未來需要的授權種類，不代表目前已授權。其intrinsic writes／rollback與operator commands分開；不以pipe最後一段成功推定CLI成功。

### 2.2 Inspection command registry

下列命令是未來Gate可引用的template；`<...>`均須在session manifest中被精確值取代。不得把placeholder直接交給shell。

| ID | Class | Command template | Observable fact | Evidence artifact |
|---|---|---|---|---|
| I-01 | INSPECTION | `git branch --show-current` | Repository branch | `preflight.json` |
| I-02 | INSPECTION | `git rev-parse HEAD` | Repository HEAD | `preflight.json` |
| I-03 | INSPECTION | `git --no-optional-locks status --short` | Working-tree／stage state；停用optional index refresh write | `preflight.json` |
| I-04 | INSPECTION | `shasum -a 256 <FILE>` | Normative file／Migration fingerprint | `checksums.txt` |
| I-05 | INSPECTION | `shasum -a 256 <CLI_BINARY>` | Binary fingerprint與I-26讀取的已審version／source provenance record核對；不執行CLI | `environment.json` |
| I-06 | INSPECTION | `docker version --format '{{json .Client.Version}} {{json .Server.Version}}'` | Docker client／daemon version | `environment.json` |
| I-07 | INSPECTION | `docker info --format '{{json .ServerVersion}}'` | Docker daemon reachability | `environment.json` |
| I-08 | INSPECTION | `df -Pk <SESSION_PARENT>` | Available disk | `environment.json` |
| I-09 | INSPECTION | `pwd -P` | Exact current workdir | `preflight.json` |
| I-10 | INSPECTION | `LC_ALL=C printf '%s' '<REQUESTED_ID>' \| wc -c` | Requested ID byte count | `session-identity.json` |
| I-11 | INSPECTION | `LC_ALL=C printf '%s\n' '<REQUESTED_ID>' \| grep -Eq '^wwfnd-[0-9]{8}t[0-9]{6}z-[0-9a-f]{12}$'` | ID regex／ASCII conformance | `session-identity.json` |
| I-12 | INSPECTION | `grep -Fqx -- '<REQUESTED_ID>' <FROZEN_DENYLIST>` | Historical ID collision | `collision.json` |
| I-13 | INSPECTION | `lsof -nP -iTCP:<PORT> -sTCP:LISTEN` | Host listener collision | `ports.json` |
| I-14 | INSPECTION | `docker ps -a --format '{{.ID}}\t{{.Names}}\t{{.Ports}}'` | Existing container IDs、names、published ports only | `docker-before.json` or `docker-after.json` |
| I-15 | INSPECTION | `docker volume ls --format '{{.Name}}'` | Existing volume names only | `docker-before.json` or `docker-after.json` |
| I-16 | INSPECTION | `docker network ls --format '{{.ID}}\t{{.Name}}'` | Existing network IDs／names only | `docker-before.json` or `docker-after.json` |
| I-17 | INSPECTION | `<REVIEWED_EXACT_PROJECT_ID_PARSER> --file <ISOLATED_CONFIG> --expected <REQUESTED_ID>` | Raw lexical and canonical config `project_id` without normalization | `ownership-values.json` |
| I-18 | INSPECTION | `docker inspect --format '{{.Name}}\t{{index .Config.Labels "com.supabase.cli.project"}}\t{{index .Config.Labels "com.docker.compose.project"}}' <CONTAINER_IDS...>` | Per-container ownership labels | `ownership-containers.json` |
| I-19 | INSPECTION | `docker volume inspect --format '{{.Name}}\t{{index .Labels "com.supabase.cli.project"}}\t{{index .Labels "com.docker.compose.project"}}' <VOLUME_NAMES...>` | Per-volume ownership labels | `ownership-volumes.json` |
| I-20 | INSPECTION | `docker network inspect --format '{{.Name}}\t{{index .Labels "com.supabase.cli.project"}}\t{{index .Labels "com.docker.compose.project"}}' <NETWORK_NAMES...>` | Per-network ownership labels | `ownership-networks.json` |
| I-21 | **RETIRED** | **No command and no future executable slot** | Superseded by the per-resource Ownership Integrity Contract; no independent CLI ownership source is required or permitted | none |
| I-22 | INSPECTION | `find <SESSION_ROOT> -mindepth 1 -maxdepth 3 -print` | Authorized session artifact inventory | `session-files.json` |
| I-23 | INSPECTION | `stat -f '%N\t%Sp\t%z' <EVIDENCE_PATHS...>` | Evidence permissions／sizes | `evidence-inventory.json` |
| I-24 | INSPECTION | `<REVIEWED_GENERATED_CONFIG_COMPARATOR> --file <ISOLATED_CONFIG> --contract <PLANNED_CONFIG_CONTRACT> --workdir <WORKDIR>` | Actual allowlisted static config／ports與plan一致，remote-link／seed absence及workdir scope；只輸出去敏結果 | `generated-config-verification.json` |
| I-25 | INSPECTION | `<REVIEWED_METADATA_INDEX_READER> --index <APPROVED_METADATA_INDEX>` | Historical ID／temp-root／evidence索引；只讀已核准非敏感metadata | `collision.json` |
| I-26 | INSPECTION | `<REVIEWED_LOCAL_ARTIFACT_READER> --file <APPROVED_FILE>` | 文件、planned contract、reviewed implementation或sanitized evidence的唯讀內容 | gate-specific review result |
| I-27 | INSPECTION | `docker context show` | Exact selected context name | `daemon-context.json` |
| I-28 | INSPECTION | `docker context inspect <EXACT_CONTEXT> --format '{{json .Endpoints.docker.Host}}'` | Context的Docker endpoint，不讀TLS material或credential | `daemon-context.json` |
| I-29 | INSPECTION | `docker info --format '{{json .ID}} {{json .Name}}'` | 實際daemon identity，不等於只看context名稱 | `daemon-context.json` |
| I-30 | INSPECTION | `<REVIEWED_START_BOUNDARY_INSPECTOR> --contract <FROZEN_COMPOUND_CONTRACT>` | Metadata-only逐項核對effective context／endpoint overrides、home/temp解析、輸入存在性、images／digest及HostIP等；不輸出env或secret值 | `compound-boundary.json` |
| C-01 | INSPECTION | `<REVIEWED_DISCOVERY_COMPLETENESS_COMPARATOR> --contract <FROZEN_EXPECTATION_CONTRACT>` | Section 6.2；接收allowlisted in-memory discovery stream | `candidate-discovery.json` |
| C-02 | INSPECTION | `<REVIEWED_RESOURCE_ACCEPTANCE_COMPARATOR> --contract <FROZEN_EXPECTATION_CONTRACT>` | Section 6.3；接收逐candidate in-memory assertions | `resource-acceptance.json` |
| C-03 | INSPECTION | `<REVIEWED_OWNERSHIP_COMPARATOR> --contract <FROZEN_EXPECTATION_CONTRACT>` | Section 6.4；接收config與逐資產raw-label assertions | `ownership-values.json` |
| C-04 | INSPECTION | `<REVIEWED_CARDINALITY_COMPARATOR> --contract <FROZEN_EXPECTATION_CONTRACT>` | Section 6.5；接收in-memory class／cardinality results | `cardinality.json` |
| C-05 | INSPECTION | `<REVIEWED_PRE_STOP_DRIFT_COMPARATOR> --contract <FROZEN_EXPECTATION_CONTRACT> --verified-set <FROZEN_VERIFIED_SET>` | Section 6.7；接收fresh in-memory accepted state | `pre-stop-drift.json` |

I-24至I-26、I-30及C-01至C-05只定義必要inspection slots，不宣稱implementation已存在。它們不得建立檔案、寫cache／telemetry或修改environment。各Gate實際依賴的implementation／input schema／allowlist／checksum必須在該次inspection前完成review；缺少時不得臨時實作或執行。Gate 4可盤點未建立的後續acceptance comparators，但自身collision inspection所需工具不能缺少。C-02所需service／purpose／scope／relationship observations尚待Resource Acceptance Evidence Research；其實際metadata-only查詢命令也必須先補入registry並review，不能假裝現有I-14至I-20已涵蓋。I-30不得藉metadata inspection執行CLI、image pull或容器probe；其缺失是Gate 5 blocker。

Safety notes：

- 不再把Supabase CLI invocation列為已證明INSPECTION；telemetry disabled不保證root wrapper無home write。版本核對使用I-05 binary hash＋I-26既有provenance。若需要新version invocation，須另列STATE-CHANGING並精確授權，不能偷偷放入I-05。
- I-27／I-28須與I-29實際daemon及I-30的effective override檢查一致；remote、ambiguous endpoint或無法證明local歸屬均FAIL。只查context名稱不夠。
- I-21已正式退休。不得重新加入placeholder parser、config reread、Docker-label wrapper、`supabase status` output、optional source、future slot或TODO executable command。Ownership authority只來自exact requested／config identity及I-18至I-20的逐資產raw-label assertions。
- I-14至I-16只列resource identity及必要ports，不輸出`{{.Labels}}`。I-18至I-20才可對observed candidates逐一讀取兩個allowlisted ownership keys；不得讀取container filesystem、environment values、logs或其他labels。
- I-12 exit `0`表示命中denylist，必須FAIL；exit `1`才表示未命中；其他exit status是inspection failure並FAIL。
- I-13在pre-start collision脈絡沒有輸出且exit `1`才代表該port無listener；任何listener或inspection error都FAIL。Post-start／pre-stop則逐port比較已核准的runtime mapping，不能套用零listener條件；額外／不符mapping或inspection error仍FAIL。

I-18、I-19、I-20是唯讀raw-label capture，不在命令內套用candidate equality。必須明確選擇使用脈絡：

- Gate 4／5 `COLLISION_CAPTURE`：對existing foreign／historical assets逐一讀取兩個allowlisted keys，保留exact resource identity、每個key的present／absent及raw value；只檢查requested ID是否已被使用及已建立的static-name collision。不要求歷史資產labels等於requested ID，也不對它們執行C-03或acceptance。可明確證明的label absence不是candidate ownership failure；不可將inspection error當absence。Ambiguous／malformed capture、資產消失或無法排除collision均FAIL。
- Gate 7及pre-stop `CANDIDATE_OWNERSHIP`：相同capture結果交給C-03；每個candidate兩個labels都必須存在且byte-exact等於requested ID。Missing label不得套用collision脈絡的例外。

Capture parser必須可區分absent key與raw string，不得把缺值顯示字串正規化成合法ownership。Implementation若不能證明此區分，collision／ownership inspection均BLOCKED；不得輸出all-label metadata。

#### I-17 exact config parser contract

I-17的implementation尚未建立。Gate 4只記錄其readiness／checksum；Gate 5 PASS前必須完成下列algorithm的code review並freeze checksum，不能因Gate 4／5沒有actual config就假報I-17已執行。首次actual verification在Gate 6B：

1. 以bytes讀取isolated `config.toml`，要求valid UTF-8、無BOM、NUL或非預期line ending；不得先trim、normalize或decode escapes後才驗證lexical form。
2. 在top-level逐行尋找key token精確為`project_id`的assignment。必須且只能有一筆。
3. 唯一允許的raw lexical line為`project_id = "<VALUE>"`：key前無indent、`=`兩側各一個ASCII space、value使用一組未escape的double quotes、closing quote後立即line ending。Comment、escape、multiline string、額外quote或trailing bytes全部FAIL。
4. 保存完整raw lexical line的SHA-256及以byte slice擷取、**未修改**的`<VALUE>`。不得使用trim、Unicode normalization、case folding、quote repair或whitespace removal。
5. Raw value須符合35-byte ASCII regex；再與requested ID做byte-for-byte equality。
6. Leading／trailing／embedded whitespace、malformed quotes、duplicate key、multiple conflicting values、unexpected encoding或任何normalized-only equality都FAIL。

Exit contract：`0=exact PASS`、`31=missing`、`32=duplicate／conflicting`、`33=lexical malformed`、`34=encoding invalid`、`35=regex／byte-count invalid`、`36=byte mismatch`、其他值為parser failure。Parser不得輸出修正後的value。

I-24比較actual generated config與Planned Config Contract的intended path、allowlisted static values及Design Section 4.2 port mapping，逐項驗證SQL-C／project inputs absent或provably disabled、無remote link，以及`.temp`／branch metadata符合CT-11 artifact allowlist。只查存在性及核准非秘密fields，不讀秘密內容；不是seed disabled就PASS，也不是整個`.temp`都FAIL。Missing／unexpected field、scope mismatch、無法判定或parser failure均FAIL，不改寫config。I-17／I-24／I-30與I-04共同構成Gate 6B的actual verification；S-06前任何contract／config／input drift使結果失效。

#### I-21 retirement record

Targeted Normative Design Correction已移除未被證明存在的第三個CLI ownership來源，Human Review判定Design PASS。I-21只保留此不可逆retirement record，避免編號被誤用；它不屬於可執行command registry coverage，也不產生evidence artifact。

### 2.3 State-changing command registry（recorded, not authorized）

| ID | Class | Command template | Separate authorization boundary | Evidence if later authorized |
|---|---|---|---|---|
| S-01 | STATE-CHANGING | `umask 077; mktemp -d /private/tmp/winwin-fnd-spike.XXXXXXXX` | New Session Identity Reservation Gate | `session-reservation.json` |
| S-02 | STATE-CHANGING | `date -u +%Y%m%dt%H%M%Sz` and `openssl rand -hex 6` used once to compose one candidate ID | New Session Identity Reservation Gate | only byte count／regex／uniqueness result; never suffix source |
| S-03 | STATE-CHANGING | `mkdir -m 700 <SESSION_ROOT>/{project,evidence-private,evidence-sanitized,bin}` | New Session Identity Reservation Gate | `session-files.json` |
| S-04 | STATE-CHANGING | `SUPABASE_TELEMETRY_DISABLED=1 supabase init --workdir <WORKDIR>` | Gate 6A Config Materialization的精確授權；不含start | sanitized initialization result |
| S-05 | STATE-CHANGING | `<REVIEWED_CONFIG_WRITER> <PLANNED_CONFIG_CONTRACT> <ISOLATED_CONFIG>` | Gate 6A Config Materialization的精確授權；不含start | config checksum and non-secret parsed values |
| S-06 | STATE-CHANGING — AUTHORIZED SUPABASE START COMPOUND TRANSACTION | `<REVIEWED_COMPOUND_START_LAUNCHER> --contract <FROZEN_COMPOUND_CONTRACT> --verification <VALID_6B_RECORD>` | Gate 6C獨立精確compound授權＋有效6B＋CT-01至20全部PASS；不是start command hash alone | CLI／launcher／redactor各exit status、已審intrinsic branches及sanitized result |
| S-07 | STATE-CHANGING | `<REVIEWED_SPIKE_DDL_RUNNER> <FROZEN_TEST_MANIFEST>` | Spike Test Execution Authorization Gate | transactionality artifacts |
| S-08 | STATE-CHANGING | `<REVIEWED_AUTH_FIXTURE_RUNNER> <FROZEN_TEST_MANIFEST>` | Spike Test Execution Authorization Gate | redacted Auth result matrix |
| S-09 | STATE-CHANGING | `<REVIEWED_CONCURRENCY_RUNNER> <FROZEN_TEST_MANIFEST>` | Spike Test Execution Authorization Gate | concurrency artifacts |
| S-10 | STATE-CHANGING | `SUPABASE_TELEMETRY_DISABLED=1 supabase stop --workdir <WORKDIR>` | Stop authorization boundary after pre-stop PASS | sanitized stop summary |
| S-11 | STATE-CHANGING | any `rm`, `docker rm`, `docker volume rm`, `docker network rm`, `docker system prune` or equivalent | Destructive Cleanup Gate, not covered by this Runbook | cleanup-specific evidence |
| S-12 | STATE-CHANGING — LOCAL EVIDENCE WRITE | `<REVIEWED_LOCAL_EVIDENCE_WRITER> --authorization <EXACT_WRITE_SCOPE> --destination <NEW_ARTIFACT_PATH>` | 獨立精確Local Evidence Write authorization；只接收已驗證的sanitized in-memory records | artifact／verified set／checksum file／sanitized bundle；不接收secret-capable raw output |

S-01至S-12本輪全部禁止執行。S-11沒有預先核准target，也不得因Runbook存在而執行。S-12不是environment、SQL、Auth、stop或cleanup授權，也不能代替S-04／S-05 config materialization。

S-06 launcher尚未實作，不得把placeholder當可執行方案。未來review必須展開底層唯一一次`supabase start --workdir <WORKDIR>` invocation、exact binary、arguments、effective env allowlist（包括telemetry disabled與`SUPABASE_NO_UPDATE_NOTIFIER=1`）、home/temp／daemon controls、deadline／signal handling、無raw落盤的stream redactor及各process exit capture。不得傳secret為argument、用shell tracing、auto retry或unreviewed fallback；不能因launcher包裝而免審任何intrinsic branch。Launcher、redactor及evidence writer都需checksum freeze；任何必要功能未證明即CT-20 BLOCKED。

S-04 init也是STATE-CHANGING，6A授權須獨立列其root wrapper／home/temp及config-write envelope；不能沿用S-06授權或假設只寫config。S-10的stop effect亦需另審，不保證還原host。S-11禁止operator未授權刪除；CLI在S-06內已授權的intrinsic prune不是S-11 operator command，也不授權operator模仿該prune。

S-12的write scope須預先固定session root、exact new destinations／有限命名規則、allowlisted record schema、writer／redactor checksums、0700／0600與create-new要求，並區分success artifact、failure marker及bundle用途。不得覆寫、保存未掃描raw stream或自動建立未授權failure artifact；任一寫入／checksum／permission驗證失敗即停止，保留現場，不retry。沒有write authorization時inspection結果只能暫存記憶體或依已授權的去敏回報管道交付，不能宣稱persistent evidence已成立。

## 3. Session identity reservation procedure

### 3.1 Candidate generation

未來取得Gate 4明確授權後，S-01建立全新root，S-02只執行一次，形成：

```text
wwfnd-YYYYMMDDtHHMMSSz-12-lowercase-hex
```

真正格式必須符合：

```text
^wwfnd-[0-9]{8}t[0-9]{6}z-[0-9a-f]{12}$
```

驗證順序：

1. I-10證明精確35 bytes。
2. I-11證明ASCII-only及regex PASS。
3. I-12與Section 3.2 denylist逐一完整字串比較。
4. I-14、I-15、I-16只列舉container、volume、network identity及必要ports；再以I-18、I-19、I-20的COLLISION_CAPTURE脈絡安全讀取每個existing resource的兩個allowlisted labels，確認candidate ID不存在於exact names或這兩個ownership labels。不對foreign／historical assets套用candidate equality，不得讀all-label metadata。
5. 以I-25搜尋已核准的temp-root／evidence索引；不得讀raw logs或credentials。需保存session-specific denylist及結果時使用另獲精確授權的S-12。

任一結果不是唯一明確PASS即停止。不得產生第二個ID、縮短、正規化、改timestamp、換suffix或重試。

### 3.2 Frozen minimum historical denylist

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

此清單只是不允許縮減的minimum。Gate 4必須將當時Repository metadata、Docker assets、temp-root index與sanitized evidence index取聯集，產生session-specific immutable denylist checksum。

## 4. Collision inspection contract

| Target | Inspection | Expected value | Evidence | Failure／stop behavior |
|---|---|---|---|---|
| Historical IDs | I-12＋approved metadata indexes | Candidate完整字串無命中 | `collision.json`＋denylist checksum | 命中或索引不可讀即停止；不換ID |
| Ports 59320–59329 | 每port執行I-13；I-14同時檢查published mappings | 全部無listener、無mapping | `ports.json` | 任一collision／inspection error即停止；不換port |
| Containers | I-14＋I-18，COLLISION_CAPTURE脈絡 | existing exact name及present raw labels無candidate ID，無已ESTABLISHED static-name collision | `docker-before.json` | 任一collision、missing inspected resource或parser error即停止；不rename／remove |
| Volumes | I-15＋I-19，COLLISION_CAPTURE脈絡 | 同上；historical volume不接受為本session資產 | `docker-before.json` | 任一collision、missing inspected resource或parser error即停止；不attach／remove |
| Networks | I-16＋I-20，COLLISION_CAPTURE脈絡 | 同上；historical network不接受為本session資產 | `docker-before.json` | 任一collision、missing inspected resource或parser error即停止；不rename／remove |
| Temp roots／evidence | I-25 approved metadata-only index＋I-22（只查candidate root） | candidate root全新，evidence destination不存在 | `collision.json` | 任一重用或無法證明即停止 |
| Repository／Migration | I-01至I-04 | frozen branch／HEAD／clean tree／hashes | `preflight.json`、`checksums.txt` | mismatch即停止，不stash／reset |
| Remote identity／link | Gate 4／5：I-22檢查新root inventory、I-26審查planned contract；Gate 6B：I-24檢查generated config及禁止artifact存在性 | Gate 4／5不宣稱actual config已存在；Gate 6B必須證明actual config無remote ref／link、seed disabled且無禁止artifacts | `environment.json`／`generated-config-verification.json` | unexpected existing config或無法排除remote linkage即停止；不得讀credential檔案 |

Collision response一律禁止自動換ID、換port、rename、remove、repair、recreate或retry。

## 5. Pre-start Resource Expectation Contract

Gate 4依精確文件寫入授權建立`resource-expectation-contract.json`，Gate 5再唯讀審查其已保存checksum。它只記錄Environment Start前可可靠知道的constraints，不列出或猜測未知runtime exact resource names。Gate 4／5的config部分是PLANNED CONFIG CONTRACT，不是actual-config驗證證據。

每個constraint row至少包含：`constraint_id`、`resource_class`、`dimension`、`status`、`value_or_rule`、`evidence_source`、`parser_or_comparator_id`、`checksum`、`required_for_acceptance`及`failure_semantics`。Status只能是：

- `ESTABLISHED`：已有reviewed static evidence及可重現parser／comparator；可作acceptance assertion。
- `UNKNOWN-UNTIL-DISCOVERY`：只有runtime identity事前不可知道；仍必須受其他已建立的獨立constraints控制。
- `NOT YET ESTABLISHED`：required constraint缺乏證據或implementation；Gate 5固定FAIL。
- `NOT APPLICABLE`：該resource class不適用，須有reviewed理由；不得用來跳過其他required assertion。

Contract至少凍結：requested 35-byte ID、下述Planned Config Contract、CLI version、session root、workdir、allowed resource classes、service／purpose registry、Design Section 4.2 ports、scope rules、resource relationship rules、已建立的naming／cardinality constraints、兩個required ownership label keys、exact expected ownership value、Candidate Discovery與Resource Acceptance procedures、parser／comparator IDs及checksums、evidence schema與redaction contract。Gate 4可如實標記未建立的required項目；Gate 5 PASS前其證據與implementation／checksum必須完整。

Planned Config Contract以獨立`planned-config-contract.json`保存，並由Resource Expectation Contract引用其checksum；它固定intended config path、intended exact `project_id`、intended port mapping、intended static config values、expected lexical form及reviewed config writer／template checksum。Intended ID必須等於requested ID，但不得宣稱actual config已存在或I-17已PASS。Gate 4可保存writer／parser readiness缺口，Gate 5不得在缺少required reviewed checksum時PASS。

Generated Config Verification是不同證據：Gate 6A另經授權以S-04／S-05產生actual config；Gate 6B執行I-17、I-24及I-04，證明lexical、byte-exact ID、ports與static values符合plan且remote linkage absent。結果以獨立verification record綁定Planned Config Contract與actual config checksums，不改寫frozen expected values。只有此實際驗證完成且另獲S-06授權，才可在Gate 6C start；這落實Design要求在真正Environment Start之前確認actual config，不要求Gate 4／5讀取尚未生成的檔案。

`UNKNOWN-UNTIL-DISCOVERY`不表示任意candidate合法、ownership labels足以單獨接受、discovered value可成為expected truth或其他constraint可省略。若某resource class除ownership labels外沒有足夠independent constraints，該class必須標記`RESOURCE ACCEPTANCE BLOCKER`，Gate 5不得PASS。

### 5.1 Current constraint registry blockers

Human Review目前只建立下列狀態；Runbook不得自行猜測缺失值：

| Resource class | Constraint | Status | Gate consequence |
|---|---|---|---|
| Container | Docker class、exact identity capture、published-port capture、兩個required labels | contract已定義；required implementation／checksum未review前仍為`NOT YET ESTABLISHED` | 不得以contract定義冒充Gate 5 readiness |
| Container | service／purpose allowlist、native Docker CLI workdir／service relationship、image provenance、naming rule、cardinality | `NOT YET ESTABLISHED` | `RESOURCE ACCEPTANCE BLOCKER` |
| Volume | Docker class、exact name capture、兩個required labels | contract已定義；required implementation／checksum未review前仍為`NOT YET ESTABLISHED` | 同上 |
| Volume | purpose mapping、accepted service／container relationship、naming rule、cardinality、CLI-version static model | `NOT YET ESTABLISHED` | `RESOURCE ACCEPTANCE BLOCKER` |
| Volume | published port | `NOT APPLICABLE` | 不取代purpose／relationship assertions |
| Network | Docker class、exact ID／name capture、兩個required labels | contract已定義；required implementation／checksum未review前仍為`NOT YET ESTABLISHED` | 同上 |
| Network | network purpose、accepted-container attachment graph、naming rule、cardinality、CLI-version static model | `NOT YET ESTABLISHED` | `RESOURCE ACCEPTANCE BLOCKER` |
| Network | published port | `NOT APPLICABLE` | container published ports仍須另驗 |

因此目前Gate 5與Environment Start維持BLOCKED。這是execution-readiness blocker，不是Normative Design blocker；Section 5.2列出的compound boundary證據也必須成立，不能再宣稱只剩resource acceptance一類缺口。

### 5.2 Frozen Gate 5 Compound Transaction Contract

Environment Start模型為 **AUTHORIZED COMPOUND CLI TRANSACTION**，僅代表未來精確授權集合，不是atomic DB transaction或host rollback。此contract將Resource Expectation、Planned Config、source correspondence、side-effect branch decisions、helpers、redactor及evidence scopes的checksums一起freeze。Gate 4可如實列缺口；Gate 5每個required項目必須有獨立證據，不能用known source behavior代替actual configuration／containment proof。

| ID | Observable／review input | Required expected value／branch decision | Evidence artifact |
|---|---|---|---|
| CT-01 | I-05 binary hash、I-26 pinned version／source record | 2.115.0實際binary與source correspondence達到已審標準；目前PARTIAL不得填PASS | `source-correspondence.json` |
| CT-02 | I-27／28／29及I-30 effective overrides | exact local daemon/context/endpoint，無remote／ambiguous override；not just reachable | `daemon-context.json` |
| CT-03 | I-26 planned config／writer、6A副作用規格 | intended config path／lexical ID／ports／writer checksum及allowed writes；actual evidence留6B，不能預填 | `config-lifecycle-contract.json` |
| CT-04 | I-14至20 COLLISION_CAPTURE、I-22／25／30 | fresh-only、無existing DB／stopped-stack recovery／歷史資產命中；branch uncertain FAIL | `db-branch-contract.json` |
| CT-05 | I-26 source call graph／platform SQL inventory | SQL-A逐支local target、trigger、service migration scope；SQL-B CONDITIONAL-INTRINSIC在fresh-only不可達 | `intrinsic-sql-contract.json` |
| CT-06 | I-22／24／30 metadata-only input audit | SQL-C／project migrations、roles.sql、declarative、seed、vault、bucket/object、functions等逐項absent或provably disabled；SQL-D完全排除 | `project-input-exclusion.json` |
| CT-07 | I-26 image source policy、I-30 metadata | refs／registries／digests／cache／fallback／credential-helper bounds／retry已審；缺provenance BLOCKED | `image-policy.json` |
| CT-08 | I-26 notifier branch／I-30 effective non-secret flag | DISABLED；`SUPABASE_NO_UPDATE_NOTIFIER=1`在固定路徑有效，無post-start update request／cache | `notifier-policy.json` |
| CT-09 | I-26 writer/path analysis、I-30 metadata | telemetry transmission disabled；state／traces／consent writers各home／mode／retention明確，不假設disabled=zero write | `home-telemetry-policy.json` |
| CT-10 | I-26 dependency temp API、I-30 resolved parent／mode | SQL staging prefixes、parent、umask／mode、scope cleanup及crash residue可界定；未證redirect時明列NOT SESSION-CONTAINED BUT EXPLICITLY BOUNDED | `os-temp-policy.json` |
| CT-11 | I-26 artifact lifecycle、I-22／24／30 metadata | `.temp` required／conditional／disabled／secret classes及`.branches/_current_branch`分開；unknown artifact拒絕 | `cli-artifact-policy.json` |
| CT-12 | I-26 Edge source／I-30 input/mount metadata | start-secrets、main staging、retention、rw binds／socket／dependency egress明確；秘密只查存在性／mode | `edge-policy.json` |
| CT-13 | I-26 pgdelta reachability、I-30 config | NOT IMPLICITLY ALLOWED；預設disabled可證。啟用需另審aux container／host network／ephemeral port／packages／CA／cache完整contract | `auxiliary-policy.json` |
| CT-14 | I-13／14及I-30 structured HostIP observations／static derivation | 10項service mapping不變，HostIP符合已審loopback限制；aux port另核准。0.0.0.0／::不能當localhost | `port-binding-policy.json` |
| CT-15 | I-26 network branches／I-30 target metadata | registries及local topology ALLOWED；telemetry／notifier DISABLED；SMTP／hooks／GCP／Edge／other egress逐支disabled或精確CONDITIONAL；無Remote Supabase | `network-policy.json` |
| CT-16 | I-26 rollback source／I-14至20 pre-state | selector、phase、stop/prune條件、partial failure及signal path已審；無舊matching assets；不承諾全保留 | `rollback-policy.json` |
| CT-17 | I-26 pull/backoff/fallback／launcher | intrinsic retry scope／caller deadline／termination effect已審；operator第二次start、換ID/port或repair prohibited | `retry-policy.json` |
| CT-18 | I-26 status/health/redactor、S-12 scope review | secret-capable raw不落盤；不使用ignore-health-check；CLI/redactor exits分開；exit0非healthy | `output-evidence-policy.json` |
| CT-19 | Section 5.1／6 constraints、source-backed service/mount/attachment facts | 每resource獨立acceptance，native Docker非Compose；required labels與relationships／cardinality完整；不能以observed倒填 | `resource-expectation-contract.json` |
| CT-20 | I-04／26所有required implementations | I-17／24／30、C-01至05、config writer、S-06 launcher、redactor、S-12皆reviewed且checksum frozen | `implementation-manifest.json` |

所有artifact只指定未來授權後的用途，本轮不建立execution evidence。Gate 5以I-26／I-04審其plan／source與已核准pre-start inspections，actual config在6B才產生與比對。CT-03不能以不存在的actual config作PASS依據，亦不能免除6B。

Required status為`NOT ESTABLISHED`、`NOT YET ESTABLISHED`、`CONFLICTING`、`BLOCKED`、未知reachability或未review helper均FAIL／CANNOT AUTHORIZE ENVIRONMENT START。`NOT APPLICABLE`須有不可達分支證據，不能用聲明skip。缺source/image、home/temp、HostIP或resource evidence可以阻擋執行而不阻擋本次誠實文件修正；無法界定基本模型／不得不先start才可自洽則回報C並停止。

### 5.3 SQL, filesystem and intrinsic failure procedures

- SQL-A為reviewed CLI/platform bootstrap；SQL-B為existing-volume conditional convergence，fresh-only排除；SQL-C為project SQL／inputs，預設NOT AUTHORIZED；SQL-D為Spike／operator SQL，僅Gate 8後獨立授權。Platform migration不因exclude long-running service就必然disabled；roles.sql、declarative及bucket/object seed不由單一seed flag統一控制。
- 6B按四區驗證：session/workdir（exact realpath／symlinks／allowlist）；OS-temp（已證API及effective parent／prefix／permissions／finalizer）；home/state/traces（每個writer解析與retention）；Docker storage（exact daemon與images/layers/logs/volumes）。後三區不假稱在session root。
- `.temp/start-secrets`等required／conditional artifacts只允許contract列出的writer與lifecycle；copied link/config-version pins、未授權pgdelta/update caches拒絕；secret-bearing files不读內容。branch marker獨立allowlist。Container配置及daemon logs可能含秘密，不能被複製成raw evidence。
- CLI自身failure rollback可依source既定selector stop/prune containers、條件式prune volumes、prune networks及清除temp；只限CT-16事前接受範圍。Operator禁止manual stop／cleanup與retry，不表示CLI rollback不存在。CLI返回前消失的資產須記錄disappeared或unknown，不能編造成「完整現場」。
- Pre-start保存baseline與frozen contract；invocation保存non-secret exact command／classification；return後只按授權inspection捕捉剩餘資產、known rollback path、消失資產及無法確認項。必須分開CLI／redactor／launcher結果，不由exit0推定healthy或Gate 7 PASS。
- CLI image retry/backoff／registry fallback只能在CT-07／17界內；它不是operator第二次start。Unexpected branch、timeout或failure後不重試、不換ID/port、不repair；保留post-return現場，等待新授權。已開始的CLI intrinsic rollback不能被「立即停止」誤解為可以安全阻止；signal亦可能觸發rollback。

## 6. Candidate Discovery, acceptance, and comparators

### 6.1 Candidate Discovery

I-14、I-15、I-16是Candidate Discovery輸入：

- I-14逐列取得container exact Docker ID、exact name及published ports。
- I-15逐列取得volume exact name。
- I-16逐列取得network exact Docker ID及exact name。

輸出只能稱為`observed candidate resources`，不得稱為expected、accepted、trusted或verified resources。Discovery須涵蓋candidate scope、candidate ownership labels、allowed ports及frozen native Docker CLI workdir／service／mount／network scope的聯集；不得只查已知名稱，不假設存在Compose。I-18至I-20逐candidate讀取兩個allowlisted labels，不擷取all labels。CT-07／14／19所需image、HostIP與relationship observations另依reviewed registry；labels本身不是充分接受條件。

### 6.2 Candidate Discovery Completeness Comparator

逐resource class驗證parser成功、每筆identity完整且唯一、無duplicate identity、無ambiguous class、inventory stream完整。禁止trim、normalization、prefix／substring join或以`sort -u`隱藏duplicate。Parser crash、non-zero exit、partial output、broken pipe或無法證明inventory完整均FAIL。

Exit contract：`0=discovery complete`、`41=parser failure`、`42=duplicate identity`、`43=ambiguous class`、`44=malformed identity`、`45=partial inventory`、`46=inventory completeness unproven`、其他值為comparator failure。

### 6.3 Resource Acceptance Comparator

每個candidate依序驗證：identity完整、class allowed、service／purpose成立、scope成立、port成立或N/A、relationship成立、已ESTABLISHED naming rule成立、已ESTABLISHED cardinality成立、Section 6.4 Ownership Integrity成立、無ambiguous classification、無foreign／mixed ownership且required labels完整有效。

任何required constraint為`NOT YET ESTABLISHED`，或某class只有ownership labels而缺乏獨立acceptance dimension，該candidate／class固定`REJECTED／BLOCKING`，Gate 5不得授權start，Gate 7不得形成verified set。不得自動repair、rename、換ID／port或retry。

Exit contract：`0=candidate accepted`、`51=class rejected`、`52=purpose／service rejected`、`53=scope rejected`、`54=port rejected`、`55=relationship rejected`、`56=naming rejected`、`57=cardinality rejected`、`58=ownership rejected`、`59=ambiguous`、`60=required constraint not established`、其他值為comparator failure。

### 6.4 Ownership Integrity Comparator

Requested project ID必須與I-17 exact config value byte-for-byte相等。每個candidate再逐列保存exact identity、expected ownership、raw `com.supabase.cli.project`、raw `com.docker.compose.project`及各自comparison result。

兩個labels都必須恰有一個raw string value，並分別與requested ID byte-for-byte相等。禁止aggregation、unique-set shortcut、normalization、resource-name inference或以config替代Docker observable。Missing、duplicate／ambiguous、malformed、truncated、normalized-only、mixed或foreign ownership均FAIL。

Exit contract：`0=ownership exact`、`61=config mismatch`、`62=missing label`、`63=duplicate／ambiguous label`、`64=malformed value`、`65=ownership mismatch`、`66=truncated／normalized-only match`、其他值為comparator failure。

### 6.5 Established Cardinality Comparator

只比較Resource Expectation Contract中已有reviewed static evidence且status=`ESTABLISHED`的cardinality。Unknown cardinality不得轉成0、任意值或discovered count；`NOT YET ESTABLISHED`且required時Gate 5 FAIL。

Exit contract：`0=all established cardinalities match`、`71=missing required class`、`72=additional disallowed class`、`73=cardinality mismatch`、`74=required cardinality not established`、其他值為comparator failure。

### 6.6 Verified Runtime Resource Set

只有Gate 7全部discovery、constraint、ownership及applicable cardinality assertions在記憶體判定PASS後，才形成in-memory verified result；這不授權建立檔案。只有另獲精確Local Evidence Write authorization，S-12才可將該結果持久化為`verified-runtime-resource-set.json`。每列至少保存exact identity、class、accepted service／purpose、accepted scope、applicable ports、accepted relationships、兩個raw ownership labels、acceptance evidence references及所有comparator results。S-12完成後以I-04／I-23驗證checksums、permissions及completeness，才可宣告Gate 7具完整persistent evidence並提出Gate 8。

不得由discovery inventory直接複製形成verified set，也不得採用`actual became expected because it was discovered`。任何rejected、blocking、ambiguous或未完成assertion的candidate都阻止整個Gate 7 PASS。

### 6.7 Pre-stop Drift Comparator

此comparator只在Gate 7 verified set已形成後使用。Fresh observed／accepted state逐exact identity與frozen verified set比較，偵測verified resource disappeared、new candidate appeared、identity、ownership、ports、scope或relationship drift。它不是首次discovery的expected／actual comparator。

Exit contract：`0=no drift`、`81=resource disappeared`、`82=new candidate`、`83=identity drift`、`84=ownership drift`、`85=port drift`、`86=scope drift`、`87=relationship drift`、`88=parser／acceptance failure`、其他值為comparator failure。

## 7. Verification phases and authorization boundaries

### 7.1 Pre-start verification

只允許當次Gate明確核准的inspection command子集合；I-21已退休，不得執行。Gate 4／5核對Git／hash、versions、daemon、disk、real workdir、ID、denylist、ports、existing Docker assets、root inventory、Planned Config Contract、constraint registry、discovery／acceptance implementation checksums及evidence destination；actual config lexical／identity／port／remote-link checks只在Gate 6B完成。Pre-start inspection本身不包含S-12或任何檔案建立；Gate 4準備工作與persistent evidence另需精確寫入授權。

### 7.2 Environment Start authorization boundary

Gate 5 PASS後，Gate 6授權分為6A config materialization、6B read-only verification與6C Environment Start。每份授權綁定ID、root、workdir、Frozen Gate 5 Compound Transaction Contract checksum、其引用的Expectation／Planned Config checksums、ports／HostIP、commands與implementations。S-04／S-05不授權S-06；6B PASS亦不授權S-06。6C另需精確compound授權且6B evidence仍有效；任何drift停止，不重寫config。Required CT-01至20有gap即Gate 5 FAIL，不得請求6A／6C。必要S-12 write scope須預先授權。6C可包含已review的SQL-A；本Foundation fresh-only排除SQL-B，不包含SQL-C、SQL-D、Auth fixtures或Spike tests，與原「完全不執行任何SQL」不同。

### 7.3 Post-start verification

S-06 exit0只代表process回報，不能證明healthy或所有服務存在；ignore-health-check不得用來取得假成功。成功返回的runtime state仍待Gate 7。依序以I-14至20、I-24／30、C-01、constraint evaluation、C-03、C-02、C-04形成in-memory結果；required observations/checksums缺少則BLOCKED。S-12 persistence是分離filesystem mutation。失敗返回時只做已授權inspection/evidence，記錄intrinsic rollback後剩餘／消失／未知資產，不執行S-07至09或manual stop／retry。無完整post-return證據不得假報現場全保留。

### 7.4 Spike execution authorization boundary

只有Gate 7 verified runtime resource set及其完整evidence PASS後，才能提出包含20 test IDs、fixtures、roles、scripts／checksums、barriers、evidence plan及S-07至S-09 exact commands的獨立授權。Environment Start授權不得推定Spike execution授權。

### 7.5 Pre-stop verification

Stop前以I-26／I-04重新載入並驗證frozen compound／Resource Expectation Contract與Gate 7 persistent verified set，執行I-09、I-13至20、I-24／27至30、C-01至04及已review的acceptance observations，再以C-05比較fresh accepted state。Disappeared/new candidate、daemon/context、identity／ownership／HostIP／scope／relationship drift、ambiguous resource或parser failure均禁止S-10。I-13／14比對accepted mapping，不使用pre-start零listener條件。Pre-stop PASS只可提出Stop Authorization Request，不自動stop；persistence仍需S-12及I-04／23驗證。Image/cache/home/temp residue另記disposition，不假裝屬於可由stop回復的runtime set。

### 7.6 Stop／cleanup authorization boundary

S-10需要另行精確授權；operator不得使用`--all`或`--no-backup`。S-11 destructive cleanup不包含於Environment Start、Spike Execution或Stop授權，必須另開Gate。Stop失敗不得改用Docker直接刪除。此限制不否認已review的S-06 intrinsic rollback/prune。Stop不等於host rollback：image/cache、home state、OS-temp及daemon logs可能保留；不得自動清除。若Gate 7 verified set未形成，不能套用C-05正常stop，須另開精確故障處置授權。

## 8. Twelve-gate execution map

共同命令依賴：下列任一Gate若另獲S-12 evidence-write授權，其精確command set必須同時列S-12（STATE-CHANGING — LOCAL EVIDENCE WRITE）及I-04／I-23（INSPECTION，驗證寫入結果）。這是顯式依賴規則，不是寫入授權；未取得write scope時不執行這組persistence流程。既有文件／Git checkpoint使用該Gate獨立核准的command manifest，不由S-12代為stage或commit。十二個頂層Gate數量不變。

### Gate 1 — Spike Design Correction

- **Purpose：** 固定40-byte實測邊界、35-byte ID、denylist、Ownership Integrity及compound side-effect contract；不是執行。
- **Authorization required：** 文件修改授權；不含execution。
- **Commands／class：** I-01至I-04、I-26（INSPECTION）；文件修改工具為STATE-CHANGING，只限另行核准的文件與command manifest。Review evidence如需寫檔，另用獨立授權的S-12。
- **Observable facts：** normative document diff、fingerprint、Git scope。
- **Expected values：** correction內容完整、非目標變更0。
- **Evidence：** Git diff、fingerprint、review report。
- **PASS／FAIL：** 唯讀review PASS／任一缺漏FAIL。
- **Stop：** mismatch即停止，不修非目標檔。
- **Permitted next action：** Gate 2。

### Gate 2 — Final Read-only Design Correction Review

- **Purpose：** 確認Correction non-regression。
- **Authorization required：** read-only review。
- **Commands／class：** I-01至I-04、I-26（INSPECTION）；本Gate只審文件，不執行runtime ownership checks。持久化review report須另獲S-12授權。
- **Observable facts：** 12 Gates、20 tests，以及requested ID／config exact equality、逐資產raw ownership assertions、evidence completeness、no aggregation與missing／malformed／foreign／mixed ownership拒絕規則；不以固定數量ownership facts作驗收。
- **Expected values：** 全部一致且無過度承諾。
- **Evidence：** final review report。
- **PASS／FAIL：** 全項PASS／任何blocker為FAIL或PARTIAL。
- **Stop：** 不得在review中修改。
- **Permitted next action：** Gate 3 checkpoint proposal。

### Gate 3 — Design Correction Checkpoint

- **Purpose：** 保存設計基線。
- **Authorization required：** 當次exact documentation file-set local commit authorization；原單檔Design checkpoint不授權其他檔。本輪另有Design＋Runbook＋correction artifact三檔條件式授權；push未授權。
- **Commands／class：** Git stage／commit均為STATE-CHANGING，須使用另行核准命令；I-03／I-04為INSPECTION。
- **Observable facts：** committed file count、commit SHA、clean tree。
- **Expected values：** 當次精確核准file set、無非目標檔、fingerprint一致；本輪三個文件均無file deletion。
- **Evidence：** local commit metadata。
- **PASS／FAIL：** exact checkpoint成立／scope mismatch FAIL。
- **Stop：** 不得自動push或改寫history。
- **Permitted next action：** Gate 4 proposal。

### Gate 4 — New Session Identity／Expectation Contract Reservation

- **Purpose：** 產生唯一session root／ID並freeze Resource Expectation Contract、constraint registry、parser／comparator contracts及evidence schema。
- **Authorization required：** S-01至S-03及Expectation／Planned Config Contract、parser files的精確本機寫入授權；evidence、denylist及checksum persistence須另有S-12精確write scope。不含S-04／S-05、start或actual config生成。
- **Commands／class：** I-01至I-16、I-18、I-19、I-20、I-22、I-23、I-25、I-26（INSPECTION；I-18／19／20僅COLLISION_CAPTURE）。S-01至S-03、獨立授權的S-12及已核准manifest中的contract／parser file writes均STATE-CHANGING。I-17／I-24尚不執行，只以I-26審查其planned implementation／readiness。
- **Observable facts：** 35-byte ID、regex、denylist／asset collision、exact root、Expectation／Planned Config Contract、每項constraint status、已建立parser／comparator checksums及未建立項目的明確gap records。
- **Expected values：** single candidate、no collision、Contract無placeholder；未知runtime identity標為`UNKNOWN-UNTIL-DISCOVERY`，required而缺證據者標為`NOT YET ESTABLISHED`，不得猜測exact names。
- **Evidence：** `session-reservation.json`、`session-identity.json`、`collision.json`、`resource-expectation-contract.json`、`planned-config-contract.json`及checksums；分別受contract preparation或S-12的精確授權，不從inspection隱含建立。
- **PASS／FAIL：** PASS只代表Expectation Contract and gap inventory are complete and truthful，不代表execution-ready。Collision、placeholder、未標狀態或把unknown填成猜測值即FAIL。`NOT YET ESTABLISHED`可被如實記錄並帶入Gate 5 READ-ONLY AUTHORIZATION REVIEW；它會阻擋Gate 5 readiness PASS，而非阻止該次唯讀審查。Gate 4自身所需collision tools、授權及evidence保存若缺少，仍FAIL。
- **Stop：** 不產生fallback，不啟動stack，不刪現有資產。
- **Permitted next action：** Gate 5唯讀review；不授權start。

### Gate 5 — Environment Start Compound Transaction Authorization Review

- **Purpose：** 逐項審查CT-01至CT-20，形成Frozen Gate 5 Compound Transaction Contract；不是只有Docker resources creation/start的審查。
- **Authorization required：** read-only review；不是start authorization本身。
- **Commands／class：** I-01至16、I-18至20、I-22／23／25／26、I-27至30（INSPECTION；existing資產只COLLISION_CAPTURE，I-30僅已存在的pre-start metadata）。I-26／04審所有required implementations／checksums及source-bound contracts；不對不存在config執行I-17／24，不執行CLI version invocation或S-04至06。Report persistence另需S-12授權。
- **Observable facts：** CT-01至20各source／branch／static policy／pre-start fact與checksum、Git／Migration hashes、6A／6B／6C及S-12 exact scopes；不能只保存總PASS。
- **Expected values：** 全20項required facts／policies已ESTABLISHED或有reviewed不可達N/A證據，無source/image、home/temp、network/HostIP、resource或helper blocker。Actual config此時未生成，不能假報6B PASS。
- **Evidence：** Section 5.2每項artifact references、`frozen-compound-transaction-contract.json`及全部引用checksums；本輪不建立這些execution artifacts。
- **PASS／FAIL：** 任一required NOT ESTABLISHED／NOT YET ESTABLISHED／CONFLICTING／BLOCKED、unknown branch reachability、missing helper或不確定envelope即FAIL／CANNOT AUTHORIZE ENVIRONMENT START。PASS仍不授權6A、S-12或start。
- **Stop：** PASS也不得執行S-04至S-06。
- **Permitted next action：** 目前只能另開缺口research／review；未來CT-01至20真正PASS後才可提出Gate 6精確授權請求。

### Gate 6 — Environment Start Execution

- **Purpose：** 依6A→6B→6C完成config materialization、actual verification及另行授權start；三個subphases仍只算一個頂層Gate。
- **Authorization required：** Gate 4／5 PASS後，6A另有S-04／05及其intrinsic filesystem envelope授權；6B另有read-only verification；6C另有S-06 compound授權，引用Frozen Gate 5 Compound Transaction Contract與有效6B checksums，不只是command hash。必要S-12 success/failure scope預先獨立授權。本輪全部未授權。
- **Commands／class：** 6A：S-04／05（STATE-CHANGING）。6B：I-17／24／30、I-04／09／22及I-27至29（INSPECTION），驗actual config與effective containment；S-12持久化另有授權，I-04／23核對。6C：I-04／09／13／14／26至30（INSPECTION，核對6B、compound contract及collision/context未漂移），再執行獨立授權S-06（STATE-CHANGING — AUTHORIZED SUPABASE START COMPOUND TRANSACTION）；S-12保存去敏結果，I-04／23核對。Required helpers尚未實作／review時禁止執行，不臨時補命令。
- **Observable facts：** 6A writer／side-effects與exit status；6B actual config、input exclusion、home/temp／daemon／image／port preconditions與checksums；6C exact compound授權、無drift、CLI／launcher／redactor結果及已發生intrinsic branch／rollback。
- **Expected values：** 6A只產生其審查envelope內的config／metadata；6B所有actual checks與evidence PASS；6C只執行contract內intrinsic branches，secret-bearing配置受policy管理但不得進evidence，無Remote Supabase／Production，不自動accept資產。
- **Evidence：** materialization record、`generated-config-verification.json`綁定compound／plan／actual checksums、S-06授權、sanitized start／rollback summary及post-return state；持久化由S-12，不記secret raw。
- **PASS／FAIL：** 6A成功不等於6B PASS；6B PASS不等於start授權。6C完成且無stop condition才表示Gate 6完成；任一check／evidence write失敗均停止，不得跳過或部分續跑。
- **Stop：** Actual config未驗證、checksum drift、缺任何授權／evidence即禁止S-06；失敗返回後operator不重寫config、retry、換ID/port、repair或cleanup。CLI在已授權範圍的intrinsic rollback可能已發生，不承諾返回時完整保留。
- **Permitted next action：** 6A完成只可進已授權6B；6B完成只可請求6C獨立授權；6C成功後只可進已授權Gate 7環境inspection。6A或6B的PASS都不隱含S-06授權。

### Gate 7 — Post-start Resource Integrity Verification

- **Purpose：** 依序完成Candidate Discovery、exact identity capture、constraint evaluation、逐資產Ownership Integrity、Resource Acceptance及Verified Runtime Resource Set formation。
- **Authorization required：** post-start environment inspection authorization；不含tests或檔案寫入。另需精確Local Evidence Write authorization才可執行S-12；若preservation為安全必要條件，其sanitized failure-record scope須在inspection前獨立核准。
- **Commands／class：** I-04、I-09、I-13至20、I-23／24／26至30、C-01至04（INSPECTION；I-13驗runtime mapping，I-18／19／20採CANDIDATE_OWNERSHIP，I-30核對image／HostIP／intrinsic-boundary metadata）。Required observations須先有reviewed commands/checksums，缺少即BLOCKED。S-12為分離的STATE-CHANGING — LOCAL EVIDENCE WRITE，不放入inspection pipeline；I-21退休，不執行或產生artifact。
- **Observable facts：** 每個observed candidate的exact identity、class、purpose／service、scope、ports、relationships、applicable naming／cardinality、兩個raw labels及每項comparator result。
- **Expected values：** 所有required candidates及constraints完整PASS，沒有ambiguous／foreign／mixed資產，兩個raw labels逐資產等於requested ID，並形成具完整evidence references的verified runtime set。
- **Evidence：** candidate discovery、constraint evaluation、逐資產ownership、acceptance rows及cardinality先在記憶體形成。Semantic PASS且另獲S-12授權才可保存`verified-runtime-resource-set.json`及checksums；任何failure evidence只依已授權preservation scope保存。
- **PASS／FAIL：** 7A唯讀observation／comparison→7B in-memory semantic PASS／FAIL→7C獨立授權S-12 persistence。任一candidate rejected／blocking、required constraint未建立、parser failure、missing／malformed label、mixed／foreign ownership、ambiguous classification或inventory不完整即FAIL。Semantic PASS不是持久化授權；只有semantic PASS、S-12另獲授權、寫入成功且I-04／I-23及evidence completeness驗證PASS，整個Gate 7才可供Gate 8使用。
- **Stop：** FAIL不得建立verified set或未授權artifact，只依已授權preservation mechanism處理。無S-12授權時停在in-memory結果，不宣告persistent Gate completion；不得改Expectation Contract、candidate資產、ID或繼續tests。
- **Permitted next action：** 完整persistent Gate 7 PASS才可提出Gate 8；semantic PASS但未持久化只能請求Local Evidence Write authorization；FAIL只可請求preservation／stop處置授權。7A／7B／7C不是新增頂層Gate。

### Gate 8 — Spike Test Execution Authorization

- **Purpose：** 審查20 tests的exact execution envelope。
- **Authorization required：** read-only review後，S-07至S-09另行明確授權。
- **Commands／class：** I-01至I-04、I-22、I-23、I-26（INSPECTION），只審查S-07至S-09及其獨立test command manifest，不在本Gate執行。Review report持久化須另獲S-12授權。
- **Observable facts：** test manifest、script checksums、roles、fixtures、barriers、rollback／retry rules。
- **Expected values：** 20／20 tests完整；Test 19A／B／C證據分離；所有scripts只在temp root。
- **Evidence：** authorization review report及test-manifest checksum。
- **PASS／FAIL：** exact scope完整／任一測試、redaction或rollback不明FAIL。
- **Stop：** review PASS不自動執行S-07至S-09。
- **Permitted next action：** 取得另行execution authorization後才進Gate 9。

### Gate 9 — Technical Evidence

- **Purpose：** 執行已核准的20 tests並形成sanitized evidence。
- **Authorization required：** exact S-07至S-09 authorization，及預先獨立明確核准的S-12 technical evidence／failure record write scope。
- **Commands／class：** S-07至S-09（STATE-CHANGING）；I-04、I-17、I-18、I-19、I-20、I-22、I-23、I-26、C-03及DB read assertions（INSPECTION，DB commands須另列於frozen test manifest；I-18／19／20採CANDIDATE_OWNERSHIP）。Evidence持久化只用S-12（STATE-CHANGING — LOCAL EVIDENCE WRITE），不得混入INSPECTION。
- **Observable facts：** 每test preconditions、transactions、SQLSTATE、postconditions、PASS／FAIL／PARTIAL。
- **Expected values：** 20 tests都有完整結果；19C可為`NOT RUN／NOT APPLICABLE`但不得誤報PASS。
- **Evidence：** normative design Section 11所列artifacts、manifest與checksums。
- **PASS／FAIL：** evidence完整且redaction scan PASS／任一secret、partial state或缺證據FAIL。
- **Stop：** 首個blocking condition即停止後續tests；不得自動retry或降級要求。
- **Permitted next action：** pre-stop review及Gate 10 Decision Revision；不自動Freeze。

### Gate 10 — Decision Revision

- **Purpose：** 將PD／SEC證據回填Migration Draft Design。
- **Authorization required：** read-only evidence review；任何文件修改另行授權。
- **Commands／class：** I-04／I-26為INSPECTION；文件修改與checkpoint為STATE-CHANGING，須另有該Gate精確command manifest與授權；technical review report寫入另用S-12。
- **Observable facts：** PD-01／04與SEC-01至06 dispositions、Local／Hosted差異。
- **Expected values：** 每項有唯一evidence-backed disposition；FAIL／PARTIAL不被改寫成PASS。
- **Evidence：** Decision Revision report／後續文件diff。
- **PASS／FAIL：** blockers都有明確處置／缺證據FAIL。
- **Stop：** 不得跳過本Gate直接Migration Freeze。
- **Permitted next action：** blockers全關閉才可提出Gate 11。

### Gate 11 — Migration Design Freeze

- **Purpose：** 判斷Migration Design是否可Freeze。
- **Authorization required：** independent final review及checkpoint authorization。
- **Commands／class：** I-01至I-04／I-26為INSPECTION；文件commit為STATE-CHANGING，須另有該Gate精確command manifest與授權；technical review report寫入另用S-12。
- **Observable facts：** 全部blocking proof、non-regression、exact scope。
- **Expected values：** 無未關閉FAIL／PARTIAL blocker。
- **Evidence：** Freeze review及checkpoint metadata。
- **PASS／FAIL：** review PASS／任何blocker FAIL。
- **Stop：** 不建立SQL或Repository Migration。
- **Permitted next action：** Gate 12 proposal。

### Gate 12 — SQL Draft

- **Purpose：** 在Freeze後另行設計Repository SQL Draft。
- **Authorization required：** independent SQL Draft authorization。
- **Commands／class：** SQL／Migration file creation、DB execution均為STATE-CHANGING。
- **Observable facts：** future scope only；本Runbook不提供SQL authorization。
- **Expected values：** Gate 11已PASS且新授權精確。
- **Evidence：** future SQL Draft review artifacts。
- **PASS／FAIL：** 由未來Gate決定。
- **Stop：** 本Runbook完成不得進入本Gate。
- **Permitted next action：** none under current authorization。

## 9. Global stop-condition handler

任何Gate遇到下列情況均fail closed：

- preflight、hash、branch、target或worktree mismatch；
- ID malformed、非35 bytes、truncated、normalized、reused或collision；
- port、container、volume、network、temp root或evidence collision；
- Resource Expectation Contract placeholder、未如實標示gap、discovery／acceptance failure、ambiguous candidate或ownership mismatch；required constraint未建立的Gate-specific處理見下段。Label presence／equality依Section 2.2的COLLISION_CAPTURE或CANDIDATE_OWNERSHIP脈絡判斷，不把historical asset可明確證明的absent label誤當candidate missing-label例外；
- remote link／identity、unexpected listener、secret exposure、redaction failure；
- command／script／parser checksum mismatch；
- partial DDL／mapping／Decision／abandonment、unsafe retry、deadlock handling failure；
- 任何Normative Design Section 13.2 stop condition。

Required constraint gaps採兩階段處理：Gate 4的如實gap inventory允許記錄`NOT YET ESTABLISHED`及missing future helper／checksum，這本身不是workflow integrity failure；只可進入另行允許的Gate 5唯讀審查，不代表execution-ready。Gate 5 readiness decision遇到任一required gap或`RESOURCE ACCEPTANCE BLOCKER`必須FAIL／CANNOT AUTHORIZE ENVIRONMENT START；任何後續需要該constraint的執行Gate也必須停止。這項例外不允許Gate 4在自身collision工具、授權或證據保存能力不足時執行，也不豁免collision、placeholder、false evidence或其他安全failure。

處理順序：

1. 立即停止operator後續command sequence及Gate；對已啟動的CLI不得臨時發signal宣稱可保留全部現場，signal／deadline只按事前review的contract處理。已授權CLI intrinsic rollback可能仍完成。
2. 在記憶體整理去敏timestamp、command ID／classification、exit status、已完成observable facts及failure category。只有已取得S-12 failure-record write scope時才可落盤；沒有該授權時僅使用已核准的去敏回報／preservation mechanism，不建立任何artifact。
3. 保留CLI返回後剩餘現場與既有evidence；不得由operator清理、刪除或改寫。記錄pre-state與post-return差異、known rollback及unknown，不把CLI已prune的資產報成仍保留。
4. 不得自動修復、換ID、換port、rename、recreate、retry或改Expectation Contract／verified runtime set。
5. 不得執行下一Gate或任何未授權state-changing command。
6. 回報精確現場並等待新的明確preservation、stop、correction或cleanup授權。保存現場指不改動既有資產，不隱含建立新的evidence file；缺少必要preservation寫入授權時不得開始依賴該保存能力的操作。

若failure發生於SQL-D test transaction，禁止在aborted transaction內續跑；retry須符合Test 19、完整rollback與獨立授權的fresh transaction範圍，不授權operator無界retry。S-06不是SQL transaction；其已審image-pull retry/backoff與operator第二次start不同，不套用DB rollback規則。

## 10. Evidence, completeness, and redaction

### 10.1 Directory and artifact contract

- 本節是未來execution evidence規格，不是本輪建立artifact的授權。所有下面的file creation、checksum file及bundle persistence均由S-12執行，需獨立精確Local Evidence Write authorization；INSPECTION只觀測／計算，不開啟output file。
- Session root及private／sanitized evidence directories：0700。
- Evidence files：0600、create-new、不得覆寫。
- Filename：`<gate-id>-<artifact-name>-<UTC>.json`；UTC採`YYYYMMDDtHHMMSSz`。
- 每筆command record至少包含：`gate_id`、`command_id`、`classification`、`started_at_utc`、`ended_at_utc`、實際執行的non-secret rendered command（及其checksum）、reviewed command-template checksum、exact workdir、exit status、raw-output policy、parsed values、expected values、PASS／FAIL／PARTIAL及failure category。任何secret都不得出現在command argument或rendered-command evidence中。
- Rendered command必須在建立任何command record、transcript或artifact**之前**完成allowlist validation並證明不含secret；不能採「先寫入、再redact」。Validation failure時不得建立該record，也不得執行command。
- Raw output不是sanitized evidence。任何可能含secret的raw stream不得先寫入filesystem、terminal transcript、pipe capture、temporary file或private quarantine；只能直接流入已review且checksum frozen的allowlist parser／redactor。不得提供fallback raw capture。
- 只有command contract已證明輸出不可能含secret，且該輸出欄位本身列入allowlist時，才可直接保存raw output；否則只保存parser產生的sanitized allowlisted fields。禁止保存all-label output。
- Ownership、resource及session identity是必要技術metadata，不得被redaction改寫；fixture identity則必須符號化為Actor A／B、Case A／B。

Persistence順序：read-only observation／allowlist parsing→in-memory comparison與redaction scan→檢查S-12 exact write scope→由S-12 create-new保存已核准records→I-04／I-23核對checksum、permissions及完整性。缺write authorization時停在記憶體結果，不假報persistent evidence成立。Failure時不得建立未授權artifact；若必要minimum failure marker已被預先授權，只能0600且不含敏感matching content。Runbook／review PASS從不自動授權此寫入。

### 10.2 Redaction rules

不得寫入evidence、terminal transcript或公開report：password、token、JWT、anon／service key、credential、connection string、remote URL／project ref、完整Email／UUID、private recovery identity、Auth access／refresh token或bootstrap credential payload。

若某inspection command可能輸出secret：

1. 必須在執行前有reviewed metadata-only parser／redactor及checksum。
2. 原始stream不得落盤、進shell command substitution、被`tee`複製或直接顯示；只允許單向傳給parser，且parser只輸出allowlisted fields。
3. Parser non-zero exit、crash、signal termination、partial output、broken pipe、unexpected field、output schema mismatch或redaction scan failure全部立即停止；任何已產生的partial sanitized artifact不得作為PASS evidence。
4. Scan未PASS不得建立sanitized evidence、Technical Evidence checkpoint、公開report或PASS／PARTIAL判定。

Redaction不得移除或正規化以下判斷資料：完整requested ID、config ID、兩種Docker raw labels、resource exact identities、candidate／accepted／verified classification、ports、scope、relationships、timestamps、command IDs、exit status及checksums。

### 10.3 Evidence completeness

每個Gate的PASS都必須能追溯到本文件列出的observable facts、constraint statuses及parsed values；要求persistent execution evidence的Gate還必須具備已授權保存的artifacts與checksums。只有文字`PASS`而缺少source values時，該Gate視為FAIL。Gate 7的in-memory semantic PASS不能取代persistent completion；未獲S-12授權或未完成寫入驗證時，必須標記`SEMANTIC CHECK COMPLETE — PERSISTENCE PENDING`，不得提出Gate 8。只有semantic PASS及獨立write authorization均成立，才保存每個candidate的identity、constraint、兩個raw ownership labels、acceptance result及verified-set evidence reference。

### 10.4 Design alignment and execution-readiness findings

歷史F1–F5與Ownership Integrity修正保留；本次另依已接受的Start Side-Effect Research A結論修正compound authorization。現在不再聲稱「只剩RESOURCE ACCEPTANCE EVIDENCE」。CT-01至20的source correspondence、daemon/context、image/digest、home／OS-temp containment、HostIP、project-input exclusion及required helpers皆需execution-readiness證據；已知source行為不是已完成的runtime proof。

Resource Acceptance Evidence Research：**PAUSED UNTIL NORMATIVE CORRECTION PASS**。本輪不重啟研究或環境；correction review PASS及local checkpoint後，才可另開research，確認：

- Native Docker CLI container→service／image／workdir relationship、naming與cardinality；不要建立虛構Compose模型。
- Volume→service/container mount relationship及network→attachment graph，不能只依兩個ownership labels。
- Daemon/context、images與digest／registry provenance、rollback selection domain與auxiliary branch資產。
- Required parsers／comparators／launcher／redactor實作及checksums；不是placeholder可執行。

以上缺口未關閉，Gate 5固定BLOCKED。不得用waiver把NOT ESTABLISHED改成PASS，也不得以Environment Start探測來補基本授權模型。

## 11. Current authorization boundary and Runbook decision

完成、審查或checkpoint本Runbook不代表授權：

- push或Git remote mutation；
- 建立session root／ID reservation；
- Local Evidence Write、verified set／checksum／sanitized bundle persistence；
- Supabase start／stop或Docker state-changing operation；
- Environment Start；
- SQL／Migration execution或Repository Migration；
- Auth user建立、修改或刪除；
- Spike／concurrency tests；
- cleanup、remove、prune、repair、recreate或retry；
- Remote Supabase／Production／deployment。

目前判定：

- Foundation Spike Design Phase：`CLOSED`。
- Runbook intrinsic correction：按本次cross-document static review驗證；歷史F1–F5不代表新增執行證據。
- Normative Design／Runbook semantic alignment：`STATIC CROSS-DOCUMENT REVIEW PASS`；mechanical validation亦全PASS才可建立精確文件local checkpoint，不宣稱新Human Review已執行。
- Runbook execution readiness：`BLOCKED — CT-01..CT-20 REQUIRED EVIDENCE PENDING`。
- Resource Acceptance Evidence Research：`PAUSED UNTIL NORMATIVE CORRECTION PASS`；之後只能另行授權。
- Runbook checkpoint readiness：本輪只在三檔review與validation全PASS時才成立；是否提交以Git metadata為準。
- Environment Start：`BLOCKED BY AUTHORIZATION`。
- Environment Start feasibility：`BLOCKED pending Gate 5 compound contract and resource acceptance evidence`。
- Spike Execution：`NOT YET ENTERED`。
- Runbook workflow commands executed by this documentation review：`0`；僅文件修訂及另獲授權的local Git checkpoint，不含任何Runbook execution。

本次獨立授權只允許Design＋Runbook＋Intrinsic Side-Effects Correction三檔在review與validation全PASS後建立local checkpoint，不含push；不是Gate PASS隱含commit權限。這是correction，不偽稱修改前hash仍代表現行文件。Checkpoint後下一步只能另開Resource Acceptance Evidence Research → Gate 5 re-evaluation → 獨立Environment Start授權；不是直接start。頂層仍12 Gates，6A／6B／6C與7A／7B／7C不是新增Gate。Migration Design Freeze、SQL Draft、Repository Migration、Remote Supabase／Production仍BLOCKED，Spike Execution仍NOT YET ENTERED。

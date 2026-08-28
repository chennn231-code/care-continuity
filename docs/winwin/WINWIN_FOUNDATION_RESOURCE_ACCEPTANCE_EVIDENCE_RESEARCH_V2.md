# WinWin Foundation — Resource Acceptance Evidence Research v2

Status: RESOURCE ACCEPTANCE EVIDENCE PARTIAL — ADDITIONAL STATIC CORRECTION REQUIRED (B)

STATIC-ONLY EVIDENCE RESEARCH + CONTRACT DESIGN — NOT EXECUTION AUTHORIZATION

## 1. Purpose

把 Compound Start 模型轉成資產、輸入、image、網路、filesystem 與 evidence contracts。本文件不是可執行 Runbook，不包含 helper implementation、SQL、實際 session ID、Docker inventory 或 execution evidence。研究報告完成不等於 evidence closure；Gate 5 不得判 PASS。

本輪只讀取 Repository 權威文件及固定版本公開 source，在記憶體分析；未下載 source tree 至磁碟、未執行 Supabase／Docker／Runbook command，也未讀取 private logs、credential files、環境變數值或歷史 volume 內容。下列命令均為未來介面模板，不是本輪操作。Inspection 只回傳記憶體；寫入 evidence 另屬 S-12 STATE-CHANGING，須獨立授權。

## 2. Frozen baseline

| Item | Verified baseline |
|---|---|
| Branch | `codex/foundation-spike-design-correction` |
| HEAD | `0f5c5b61305d308169fce698ce7c4280aa6adb17` |
| Commit message | `docs: model supabase start intrinsic side effects` |
| Initial working tree / staged | clean / 0 |
| Normative Design | 592 lines; 66,379 bytes; `2d72a26ebbe799fd6e5d830f8e352ab1f306402888a8fc019e074cd5f5ce92c6` |
| Runbook | 615 lines; 73,572 bytes; `32ed22c5ccc356936d3d23118e76c9821d695148041ae9d02bd7ace48d4bc914` |
| Intrinsic correction | 225 lines; 24,909 bytes; `408182da89564529a3603be94b8255e5eeb7b81441e032688dd38672e58f94d5` |

Authority: [Design](WINWIN_FOUNDATION_SECURITY_CONCURRENCY_FEASIBILITY_SPIKE_DESIGN.md), [Runbook](WINWIN_FOUNDATION_ENVIRONMENT_START_SPIKE_EXECUTION_RUNBOOK_DRAFT.md), [Intrinsic correction](WINWIN_FOUNDATION_ENVIRONMENT_START_INTRINSIC_SIDE_EFFECTS_CORRECTION.md). 三份文件不修改。Design Section 4.1 已改為 per-resource Ownership Integrity；不得恢復不存在的獨立 CLI ownership observable／舊八方單值模型。

## 3. Source authority

Target `v2.115.0`; fixed commit `18ae43a34a2257458197b62f74e2a97e2b5cf7f9`。既有 installed binary fingerprint `06179215a136f183ed24841e177e605fe15bf3e1ac1b6edac8312da71e835014` 是歷史證據，本輪未執行 binary。SOURCE CORRESPONDENCE PARTIAL：tag、version、binary hash 均不是 reproducible source-to-binary proof。

以下 S references 均固定同一 commit。研究日 2026-08-28；透過官方 raw source 唯讀取得。Confidence「source established」只指該函式可見行為，不是 installed runtime 已驗證；官方 Docker／Node 文件是通用語意，不取代本機 engine／Bun 證據。

| Ref | Primary source / inspected locus |
|---|---|
| S01 | [Native start handler](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/commands/start/start.handler.ts): service dispatch, stopped-stack recovery, health/status, rollback |
| S02 | [Service gates](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/commands/start/start.gates.ts), [service catalog](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/commands/start/start.services.ts) |
| S03 | [Docker IDs](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/shared/legacy-docker-ids.ts): project precedence, sanitization, suffixes |
| S04 | [Container lifecycle](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/shared/db-bootstrap/container-lifecycle.ts): ensure network/volume, volume probe, labels, secret delivery |
| S05 | [Create args](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/shared/db-bootstrap/docker-create-args.ts): port formatting, env keys, mounts, restart |
| S06 | [Start database](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/shared/db-bootstrap/start-database.ts), [Postgres spec](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/shared/db-bootstrap/postgres.service.ts) |
| S07 | [DB setup](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/shared/db-bootstrap/db-setup.ts): lines 645–712 jobs; 788–868 predicates; 1047–1111 SQL/temp; 1196–1264 cache |
| S08 | [Run args](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/shared/legacy-docker-run.args.ts), [container CLI selection](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/shared/legacy-container-cli.ts) |
| S09 | [Functions Docker](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/shared/functions/functions-docker.ts), [Edge serve](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/shared/functions/serve.ts): lines 1501–1768 |
| S10 | [Legacy Edge adapter](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/commands/start/services/edge-runtime.service.ts) |
| S11 | [Image manifest](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli-go/pkg/config/templates/Dockerfile), [manifest parser](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/shared/services/dockerfile-images.ts) |
| S12 | [Registry candidates](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/shared/legacy-docker-registry.ts), [cache/pull resolver](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/shared/legacy-docker-image-resolve.ts) |
| S13 | [DB image](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/shared/legacy-db-image.ts), [Edge image](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/shared/legacy-edge-runtime-image.ts), [service pins](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/shared/legacy-service-version-overrides.ts) |
| S14 | [Project context](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/shared/legacy-local-project-context.ts), [dotenv precedence](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/shared/legacy-project-environment.ts), [DB config reader](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/shared/legacy-db-config.toml-read.ts) |
| S15 | [Migrate/seed](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/shared/legacy-migrate-and-seed.ts), [pgdelta cache](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/shared/legacy-pgdelta.cache.ts), [pgdelta](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/shared/legacy-pgdelta.ts) |
| S16 | [Home resolver](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/shared/config/supabase-home.ts), [legacy profile](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/config/legacy-profile-file.ts), [legacy telemetry state](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/telemetry/legacy-telemetry-state.layer.ts) |
| S17 | [Consent](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/shared/telemetry/consent.ts), [runtime](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/shared/telemetry/runtime.layer.ts), [tracing](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/shared/telemetry/tracing.layer.ts), [NDJSON](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/shared/telemetry/exporters/ndjson.ts) |
| S18 | [Update notifier](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/shared/legacy-upgrade-notice.ts), [root runtime](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/shared/cli/run.ts) |
| S19 | [Rollback](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/shared/db-bootstrap/rollback.ts), [removal selectors](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/shared/legacy-docker-remove-all.ts) |
| D01 | [Docker port publishing](https://docs.docker.com/engine/network/port-publishing/), [bridge network](https://docs.docker.com/engine/network/drivers/bridge/) |
| D02 | [Docker contexts](https://docs.docker.com/engine/manage-resources/contexts/), [volumes](https://docs.docker.com/engine/storage/volumes/) |
| D03 | [Node os.tmpdir](https://nodejs.org/api/os.html#ostmpdir): 通用 POSIX temp 優先序，非 bundled Bun 行為證明 |

本文 service facts 另來自同一固定 tree 的 `apps/cli/src/legacy/commands/start/services/`：logflare、vector、kong、gotrue、mailpit、realtime、postgrest、storage、imgproxy、pg-meta、studio、supavisor 各 `.service.ts`；皆已逐一取得及核對資產相關 sections。不可把任何 Dockerfile tag 視為 immutable digest。

## 4. Native legacy start implications

S01 是 native TypeScript legacy start，不是 Compose plan。不存在由 `docker compose config` 合法替代本 CLI 資產計畫的證據。主要路徑為 image resolution → DB network/volume/container → fresh SQL-A/jobs → satellites/Edge → health/bucket seeding/status。Root wrapper 的 home/telemetry 與失敗 rollback 也屬 compound envelope。

SQL-A 是平台 bootstrap；SQL-B 是 existing-volume convergence，本次 fresh-only 必須不可達；SQL-C 是 project authored inputs；SQL-D 是 Spike SQL。後兩者不在 Start 授權內。`--ignore-health-check` 禁止作接受捷徑；status success 可以來自 config 推導，不能當 resource evidence。

## 5. Docker execution target contract

DOCKER EXECUTION TARGET CONTRACT：先固定 client executable canonical path/hash、runtime family Docker、client/server/API version、context name、effective endpoint、daemon ID、OS/arch、TLS policy、network defaults 與時間窗。拒絕 remote TCP/SSH context、Podman fallback、未知 wrapper、context drift；Docker Desktop VM 只能是已核准的本機 Desktop daemon，不等於任意 VM。

S08 先 spawn `docker`，spawn failure 才 fallback `podman`；daemon 非零 exit 不等於同一 fallback 條件。PATH 找到 Docker 不足以排除未來 fallback。需 freeze launcher 的受控 executable lookup、證明該 lookup 下 Podman 不可達，且所有呼叫點使用同一 daemon。不得靠事後發現已用錯 daemon 才 rollback。

未來 INSPECTION templates：`command -v docker`、`docker context show`、`docker context inspect <CONTEXT> --format '{{json .Endpoints.docker.Host}}'`、`docker info --format '{{json .ID}}'`、`docker version --format '{{json .Server.Version}}'`；需搭配安全 target inspector 計算 effective endpoint，不能把 context endpoint 當成忽略 DOCKER_HOST 的最終答案。不讀 Docker config auths、TLS key/cert 內容；有必要憑證讀取才可確認目標時先停止要求獨立權限。此輪未執行以上模板。

S14 可由 project dotenv 將 Docker client keys 帶入 process environment；因此 config/env audit 必須先於 daemon 與 mutation。Target snapshot 過期、另一進程修改 context、client 檔案變更均使 acceptance 無效。沒有穩定本機 daemon 與排他操作窗口則不 start；snapshot 不是對惡意同權限操作者的防護。

## 6. Container topology

Notation：P 是未來已驗證 requested ID（本輪不產生）；N 是其 generated user-defined network；`supabase_<suffix>_P` 是 S03 可證明公式，不是實際 manifest。每個 enabled predicate 必須使用 effective config，不能只讀 raw TOML。以下 cardinality 是角色條件，不猜測「一定 12 containers」。

| Role / suffix | Creator / predicate | Network / storage / lifecycle |
|---|---|---|
| PostgreSQL / db | S06, always in fresh start | N, db volume; unless-stopped; count 1 |
| Analytics / analytics | logflare builder; analytics enabled and not excluded | N alias analytics; postgres backend無 host bind；BigQuery branch須排除；0..1 |
| Vector / vector | vector builder; analytics enabled and not excluded | N; Docker socket bind／daemon connection conditional；unless-stopped；0..1 |
| API / kong | kong builder; not excluded，不能只看 api.enabled | N alias kong；email-template binds conditional；0..1 |
| Auth / auth | gotrue builder; auth enabled and not excluded | N alias auth；no explicit bind；0..1 |
| Mailpit / inbucket | mailpit builder; local_smtp enabled and not excluded | N alias inbucket；no explicit bind；0..1 |
| Realtime / realtime | realtime builder; enabled and not excluded | N aliases realtime及固定 local tenant alias；0..1 |
| REST / rest | postgrest builder; api enabled and not excluded | N alias rest；no explicit bind；0..1 |
| Storage / storage | storage builder; enabled and not excluded | N alias storage；named storage volume；0..1 |
| Imgproxy / imgproxy | storage及transformation gate且not excluded | N；volumes-from Storage，不建立另一份 storage truth；0..1 |
| PG Meta / pg_meta | studio enabled and not excluded | N；no explicit bind；0..1 |
| Studio / studio | studio enabled and not excluded | N；snippets rw bind及function binds；0..1 |
| Edge / edge_runtime | S09/S10; edge enabled and not excluded | N alias edge_runtime；separate `run -d` builder；沒有主 builder 的 restart flag；0..1 |
| Pooler / pooler | supavisor builder; pooler enabled and not excluded | N；mode-dependent host mapping；0..1 |
| Fresh platform Realtime job | S07 initSchema15, effective realtime enabled | unnamed `run --rm`, N, both project labels；one invocation per reached branch |
| Fresh platform Storage job | S07 initSchema15, effective storage enabled | unnamed `run --rm`, N, no explicit bind；platform migration command |
| Fresh platform Auth job | S07 initSchema15, effective auth enabled | unnamed `run --rm`, N, no explicit bind；platform migration command |
| PG ≤14 initializer | S07 alternate SQL template branch | 不套用PG15+三job規則；不是額外固定 service |
| Optional pg-delta / shadow / Edge-script job | S15 auxiliary call graph | 本契約預設排除；不得因名字像Edge而接受 |
| Health operations | S01/S06/S07 health callbacks | 多為既有container healthcheck或local HTTP/DB probe，不虛構獨立health container |
| Unknown temporary container | no proved role | FAIL；不是允許任意temp job的類 |

Main generic builders 都經 S04 加兩個 project labels與 workdir label；Edge另有相同兩 project labels及workdir label。S07 jobs有兩 project labels，但沒有 generic workdir label；不得將 workdir label 升格為所有 transient jobs必須有的第三 ownership label。Service images 見18節。角色 count **CONFIG-DEPENDENT**；generated runtime IDs及匿名names **UNKNOWN UNTIL DISCOVERY**；main name derivation **STATICALLY ESTABLISHED**。

## 7. Container acceptance

CONTAINER ACCEPTANCE CONTRACT：逐資產驗證 full daemon ID + container ID、exact name（若公式適用）、兩個 raw labels、唯一 role predicate、image ID/digest/OS/arch、network mode/attachments/aliases、mount targets/modes、published bindings、restart/auto-remove、readiness及時間階段。Labels只是必要條件，不是充分条件；相同labels的任意image不得通過。

穩態 enabled role 各一個；disabled role零個；job只在對應fresh阶段出現，正常完成後零個survivor。不能以主service數量計入已被`--rm`移除的jobs。Job退出證據必須包含建立時允許的identity/labels/image/network及exit/removal關係；只有end snapshot不能證明其生前合法。如何無raw-secret capture且無遺漏地取得極短job的資料仍是G-02靜態缺口，不假報已实现。

## 8. Volume topology

| Class | Source derivation / consumer | Labels / persistence / uncertainty |
|---|---|---|
| DB named | `supabase_db_P` → PG `/var/lib/postgresql/data`，S04/S06 | explicitly create both project labels；fresh-only；rollback可能prune |
| Storage named | `supabase_storage_P` → Storage `/mnt`；Imgproxy volumes-from | both labels；sharing是同一volume；不可重複建構成兩個 |
| Edge named | `supabase_edge_runtime_P`，S09 ensureDockerNamedVolume | both labels；serve core建立它，但其直接run argv未必掛載它；function bind builder可能使用，需依effective function set |
| Image-declared anonymous | image Config.Volumes未被explicit mount覆蓋的targets | source CLI無逐一volume-create標籤證明；name unknown；image config/digest前置核對必要 |
| Job image anonymous | S07 `binds: []`不代表image沒有VOLUME | `--rm`生命週期不代表從未建立；目前未建立完整image-config closure |
| Optional cache / pg-delta | S15 Edge/cache binds | disabled branch；不能納入前三個named volumes推定 |
| Historical retained | prior failed-session volumes | foreign history，只做collision metadata，不attach、不inspect contents、不prune |

三個 explicit named roles只在相應gate啟用時成立，不保證exact total volume count=3。Mountpoint是daemon storage path，只保存必要identity/driver資訊，不讀其內容。匿名volume labels不能從parentcontainer labels推導。

## 9. Volume acceptance

VOLUME ACCEPTANCE CONTRACT：逐name + daemon identity查driver、scope、兩 raw labels、read-only consumers graph、destination/mode、creation phase。DB與Storage expected driver須在pre-start契約固定（預期local driver不是 runtime 已查）；options只允許已審key，不dump可能有secret的driver options。Named volume absence必須在create前證明，permission/API error不是absence。

現行Design要求每個accepted volume兩labels。對image匿名volume，本研究不擅自豁免：Gate5前須由approved image configs证明沒有會產生未標記volume的reachable target，或提出獨立 **NORMATIVE CORRECTION REQUIRED** 評估；本輪尚未證明有必然衝突，也不能默默用parent關係取代labels。此G-01未關閉，所以不是A。任何確證 unavoidable unlabelled resource且無符合normative接受路徑時升級C並停止。

## 10. Fresh/existing path

FRESH PATH CONTRACT：S06在image/network/create前以精確DBvolume名稱探測。confirmed not-found才是不存在；非not-found inspect failure不能當fresh，且CLI保守路徑可能視為existing以避免prune。外部preflight必須把它判FAIL，不讓CLI進SQL-B。

同名DBcontainer（running、created、stopped均含）也必須不存在；S01有already-running及recover-stopped branch，不能以不running就當新session。拒絕backup input、existing volume、任何歷史ID。在Gate4與6B最後檢查，直到mutation前維持同一daemon、ID、names及排他窗口；TOCTOU無法被一份早期snapshot消除。Gate7只驗結果，不補做fresh的前置證明。

## 11. Collision contract

COLLISION CONTRACT查全daemon既有container（含stopped）、volumes、networks：exact candidate names、兩labels任一命中P、可證公式names、預留ports、與foreign attachments/consumers的交集。另將Design15項歷史denylist與核准的sanitized history索引合併。不得讀private root/raw logs；索引不完整須標BLOCKED，不以生成隨機ID替代唯一性證明。

Foreign inventory可以有missing project labels，不套candidate equality；一旦它涉及candidate name/port/mount/attachment就必須保留並拒絕。S19 rollback只以Supabase project label挑資產，並非完整acceptance comparator；故任何collision足以造成foreign destructive risk，必須start前阻擋。禁止operator prune/repair/rename/retry。若無法建立獨佔命名與daemon窗口，C而非start看看。

## 12. Network topology

S03/S09預設`supabase_network_P`；S04/S09 inspect-existing會reuse，否則network create附两project labels。Explicit `--network-id`、env override可改mode；`default/bridge/host/none/container:*`不是可接受的Foundation替代。只允許全新generated user-defined bridge N。

Main和fresh jobs都加入N；network aliases由各builder定義。Edge-only runner也ensure相同N，不可建立第二套未審network。Cardinality：本fresh常規model一個N；其ID、IPAM subnet、endpoint IDs為runtime-only，不能猜。Driver、scope、internal、IPv6、gateway mode與default options可受daemon影響，必須另有pre-start policy；CLI source沒有把它們都固定。

## 13. Network acceptance

NETWORK ACCEPTANCE CONTRACT逐network檢查ID/name/driver/scope/internal/IPv6/IPAM分類、allowlisted options、兩labels及完整container attachments。要求N只連到accepted main/transient角色；foreign endpoint、缺少requiredendpoint、多network、`host/container:`mode均FAIL。Default automatic aliases與service aliases分開比較，禁止用任意新增alias通配符。

IP地址只是topology evidence，不是identity；N被刪後同名重建必須由ID drift捕獲。Detached unused Edge namedvolume不等於missingnetwork；無expected network或network裡多一個陌生container都不接受。No network egress隔離保證可由「bridge」一詞直接推導（D01）。

## 14. Cross-resource relationships

資產圖為雙向核對：container Mounts的named volume → volume identity → all consumer IDs；container NetworkSettings.Networks的network ID → network Containers endpoints →相同container IDs；container image ID → approved platform manifest；每published tuple → role＋containerport＋N政策。

需要四層互相獨立的限制：source角色/數量、labels exact、image identity、graph/mount/port關係。兩labels由同一CLI寫出，不宣稱統計獨立；graph與image增加不同觀測，不是source-to-binary簽章。任何圖缺邊、外來邊或ambiguousrole均FAIL。不能以labels合格就接受對foreignvolume的掛載。

## 15. Ownership Integrity v2

P與config原始project_id精確相同；每個accepted container/volume/network的`com.supabase.cli.project`和`com.docker.compose.project`分別等於P。保存resource identity及兩原始值，禁止trim、casefold、Unicode normalize、prefix、substring、unique-set聚合。Missing與null與empty string分開拒絕。

Project ID須ASCII、regex `^wwfnd-[0-9]{8}t[0-9]{6}z-[0-9a-f]{12}$`、35bytes；此處無產生ID。S03的normalize/truncate是被測威脅，不是可呼叫的修復程序。Config lexical parser沿用Runbook I-17，不重定義寬鬆TOML parsing為ownership證據。兩label名稱相似也不接受近似key。

## 16. Candidate Discovery v2

CANDIDATE DISCOVERY CONTRACT先完整列metadata，再選候選；不能只用matching-label filter，否則失去missing/mixedlabel與additional資產。候選聯集由：pre/post新增ID、exact plannednames、任一label命中、reservedport、Nattachment、candidatevolume consumers、時間窗內已證jobevents形成。其聯集只用於discovery，不是ownership授權。

需分開：baseline foreign、candidate、unclassified delta。所有delta都要有disposition，非candidate新資產不能無聲忽略；如可能是其他使用者操作，停止而非刪除。CLI `ps` success但空輸出、APIerror、pagination頁漏失或不能觀測fulluniverse均FAIL。Event collector不足以替代snapshot，snapshot也不足以捕捉`--rm`jobs；G-02尚待靜態capture設計閉合。

## 17. Verified Runtime Resource Set

VERIFIED RUNTIME RESOURCE SET只在required comparators全部PASS後形成；現在不存在。Record schema包含schemaVersion、contractHash、daemonId、P、phase、start/endUTC、source/helper fingerprints、per-resourceobservations、per-assertionresult、missing/additionaldispositions、snapshotcompleteness及redactionresult。

穩態set與transient lifecycle ledger分開，不能把已消失job當現存資產。Set不可用來倒填pre-start expectation；與Gate7evidence、runtimeconfig/inputs、imageIDs綁定。Pre-stop重验drift後仍須獨立stop授權。任何對identity或必要label的redaction都不能保留PASS。

## 18. Image inventory

下表是S11的source defaults，不是已拉取／已核准digest。Main與fresh jobs共用相應image；不把一次性job漏出image inventory。Source存在其他用途image不代表start會使用。

| Role | Source reference | Override / branch |
|---|---|---|
| PG | `supabase/postgres:17.6.1.159` | major、OrioleDB、postgres-version pin；S13 |
| Kong | `library/kong:2.8.1` | registry candidate rewriting |
| Mailpit | `axllent/mailpit:v1.30.2` | registry |
| REST | `postgrest/postgrest:v16.1` | rest-version（major-dependent） |
| PG Meta | `supabase/postgres-meta:v0.98.0` | pgmeta-version |
| Studio | `supabase/studio:2026.08.17-sha-0c1da8f` | studio-version |
| Imgproxy | `darthsim/imgproxy:v3.8.0` | transformation gate |
| Edge / optional script image | `supabase/edge-runtime:v1.74.3` | edge-runtime-version；Deno1 override `v1.68.4` |
| Vector | `timberio/vector:0.53.0-alpine` | analytics gate |
| Pooler | `supabase/supavisor:2.9.7` | pooler-version |
| Auth / fresh Auth job | `supabase/gotrue:v2.195.0` | gotrue-version（major-dependent） |
| Realtime / fresh Realtime job | `supabase/realtime:v2.129.0` | realtime-version |
| Storage / fresh Storage job | `supabase/storage-api:v1.69.11` | storage-version |
| Analytics | `supabase/logflare:1.50.2` | logflare-version |
| Alternative PG | `supabase/postgres:14.1.0.89`, `supabase/postgres:15.8.1.085` | only approved major branch；not automatic fallback |
| Differ / Migra / pg_prove | S11 has separate aliases | NOT APPLICABLE to approved normal start branch；presence in manifest不是授权 |

S13的pin讀取有trim及read-error fallback；acceptance不能沿用這種寬鬆語意。Unexpected pin、不可讀pin、OrioleDB或registry override都先FAIL。Exact approved branch/tag list需由effective config建立，而非接受整個上表所有image。

## 19. Image provenance

IMAGE PROVENANCE CONTRACT比較四層：L1固定source tag/reference；L2本機image ID＋RepoDigests＋OS/arch；L3經獨立來源核准的registry manifest digest、platform child digest與image config；L4可重建並驗證的source-to-image供應鏈。L1不是immutable；L2只證明目前daemon內容，不能自己成為其信任根；L4成本最高且本輪未建立。

推薦最低L3＋L2實際比對，並明確保留CLI binary/source PARTIAL限制待Gate5人審，不假稱全鏈可重現。必要欄位：original reference、resolved candidate、registry、manifest digest、platform digest、image ID、OS/arch、Config.Volumes與允許的entrypoint結構證據。RepoDigest缺失、不同平台或未核准digest都不接受；不得只比tag。

本輪未讀registry image config/digest metadata，故匿名volume、image entrypoint附帶行為與最低digest provenance仍未閉合（G-01/G-03）。可透過獨立registry metadata research及pre-start image inspection研究，不需先start。不可把它們改標runtime-only。

## 20. Registry/fallback

S12未設定override時先查cache candidates：ECR `public.ecr.aws/supabase/<last-segment>`、GHCR `ghcr.io/supabase/<last-segment>`、原Docker Hub reference。所有cache候選皆無後才pull；每candidate最多3次attempt，4s/8s backoff及deadline分配。明確override只留一個registry candidate；registry字串有trim/lowercase行為，不能把不符planned值的輸入默默正規化後PASS。

| Policy option | Benefit | Required risk closure / recommendation |
|---|---|---|
| Already-cached approved digests only | 可在start前inspect image metadata、匿名volumes及platform | 推薦優先；仍須證明CLI實際選中同一candidate、排除cache eviction/tag drift；CLI無已證no-pull總開關，不能宣稱cache-only設定本身強制成功 |
| Explicit approved intrinsic pull | Compound model容許image/cache mutation | 須事前核准每個candidate digest、registry/auth/CDN egress及retry，不能下載後才決定trust；未閉合前BLOCKED |
| Arbitrary mirror/fallback | 無可接受安全收益 | REJECTED；不得因public registry就允許任意image |

選擇cache-only若需補image，只能另行Image Acquisition authorization，不能於本研究pull，也不能偷偷改S-06契約。任何尚未覆蓋的credential helper／registry proxy外連必須先審。

## 21. Port mapping

保留Design十項59320–59329；reserved不等於一定published。所有tuple明列TCP與HostIP；本研究未檢查實際listener。

| Role | Host port | Container port / condition |
|---|---:|---|
| Shadow DB | 59320 | 5432 only separate shadow branch；本normal start不允許shadow |
| Kong | 59321 | 8000，TLS時8443；TLS branch須另固定 |
| PG | 59322 | 5432 |
| Studio | 59323 | 3000 |
| Mailpit web | 59324 | 8025 |
| Mailpit SMTP | 59325 | 1025，configured/nonzero才publish |
| Mailpit POP3 | 59326 | 1110，configured/nonzero才publish |
| Analytics | 59327 | 4000 |
| Edge inspector | 59328 | start adapter inspectMode未指定，不publish；仍保留collision檢查 |
| Pooler | 59329 | transaction 6543／session 5432，依frozen mode |

Auth9999、Realtime4000、Storage、REST與Edge internal serving不另加hostport。Image exposed ports不是publishedports。Unexpected UDP、ephemeralport、額外IPv6 binding或disabledservice mapping均FAIL。不得把543xx/563xx/573xx/583xx當fallback。

## 22. HostIP

S05 `formatPortBindingFlag`只輸出hostPort:containerPort，沒有HostIP。Service hostname `127.0.0.1`及in-container health URL不是host binding證明。D01說明未指定IP通常綁所有介面；user-defined bridge可由daemon default-network-opts的host_binding_ipv4限定loopback。故不能直接判CLI永遠無法localhost，也不能假設目前daemon已配置。

HOSTIP CONTRACT：Gate5前須核准本機engine版本及既有default-network policy，Gate6B核對同daemon的精確值；拒絕routed/nat-unprotected/direct-routing例外及未審IPv6模式。Gate7逐一檢查HostConfig.PortBindings與NetworkSettings.Ports所有array elements；只接受明確核准的127.0.0.1／::1，空IP、0.0.0.0、::均FAIL。Docker早期版本loopback可被同L2主機到達的限制也須納入版本審查（D01）。

目前無daemon-policy evidence；這是PRE-START blocker，不是可延到start後的允許風險。本輪不修改daemon設定、不建立probe network。若後續證明指定環境無法事前限制HostIP，升級C停止；不得用修port/重啟嘗試解決。

## 23. Mounts

MOUNT CONTRACT逐container解析Type、Source、Destination、RW、Propagation與volume Name；一個destination不得有未審覆蓋，不能只驗source前綴。Class分named volume、bind、tmpfs、image-declared anonymous。Image自身VOLUME須由19節metadata預先審。

| Mount | Required treatment |
|---|---|
| PG data / Storage data | named volume role graph；不是host session path |
| Imgproxy volumes-from | 同Storagevolume及mode需一致，非任意container繼承 |
| Edge main/multiline files | S09 `.temp/start-secrets/<container>`下intrinsic生成；read-only bind規則依writer；env-file只確認path/mode、不讀內容 |
| Studio snippets | Sourced工作目錄下snippets rw bind；即使functions空也可能存在；Docker可能建立缺少host dir，列入compound write envelope |
| Function binds / email template | 空或核准synthetic來源才可；project functions/imports、個人檔案／repo一律排除 |
| Vector Docker socket | service builder可mount host socket；不是一般session file，read-only filesystem mount不代表Docker API只讀；若需保留analytics/vector必須另有service信任與socket最小權限審查（G-04），不默認允許 |
| PG backup bind / BigQuery credential bind | 本次branch禁止 |
| PG≤14 tmpfs init dir | conditional intrinsic，不混作named volume |

不允許Repository、home、Desktop、cloud folders、舊session或symlink alias逃出核准scope。Daemon storage zone另有owner/driver契約，不能為了session-contained誤判正常DBvolume。

## 24. Host-path canonicalization

HOST PATH CANONICALIZATION CONTRACT：保留raw輸入與canonical identity分開；對每component lstat、resolve實體ancestor、檢查symlink、device/inode與核准root。未存在leaf必須以已驗證parent＋exact basename驗證，不能假裝realpath成功。採path-component containment，不用字串prefix（避免root2）；拒絕`..`、NUL、別名逃逸與未審UNC／devicepath。

macOS case-insensitive／Unicode normalization、Docker Desktop path translation、mount propagation及同權限TOCTOU須明列；不能靠lowercase所有path解決。證據只保存核准token化root、relativepath、filesystemidentity、mode、symlink判定，不保存個人路徑。實際writer/read-only auditor不得以建立檔案測filesystem語意；不確定則BLOCKED。Canonical helper未實作，不能宣稱no-escape已驗證。

## 25. SQL-C exclusion

SQL-C EXCLUSION CONTRACT以call-site與actualinput雙重證明，不是Migration 001–008 unchanged就PASS。

| Input / route | Gate5 planned condition; Gate6B actual check | Failure |
|---|---|---|
| `supabase/roles.sql` | 必須不存在；S07在migrations/seed gates之外獨立檢查並執行它 | present、symlink或unknown即FAIL |
| migrations | 新isolatedworkdir無projectmigration，effective migrations.enabled=false | CLIreader default=true，不可依賴省略 |
| seed SQL / globs | seed.enabled=false且無seed.sql/custompaths/projectfiles | 不只檢查一個default檔 |
| declarative schema_paths | empty，experimental=false，paths不越界 | S15 declarative branch不受migrations.enabled完整控制 |
| vault config/secrets | 無project-authored entries及env expansion | S07先upsertvault再roles；seeddisabled無法排除 |
| storage buckets/objects/vector seeds | 空配置、無filesystemseed | S01 fresh health後仍可seed，不由db.seed單一控制 |
| Auth hooks/templates/external providers | absent/disabled，無自訂URL/SQL/hooks或credential input | 任何未審entry皆FAIL |
| Edge functions/import map/dependencies | 無project function/entrypoint/import/dependency；only reviewed intrinsic bootstrap | Studio也解析function binds，不只Edgeenabled才檢查 |
| `.temp` remote pins / linked state | 初始化前absent；之後只接受CT11核准CLI artifacts | linked project-ref/pooler-url/version overrides不能混入 |
| external remotes / project config discovery | 無remotes，不向上找到Repository config；effectiveprojectroot精確 | workdir引數不是唯一安全證據 |

Actual audit只讀核准syntheticconfig/nonsecretfields與path存在性，不讀任意credential檔案；遇到secret-capableunexpectedfile直接拒絕並停止。SQL-A平台模板仍可於未來明確Compound授權內執行；本輪SQL-A/B/C/D皆未執行。

## 26. Isolated input contract

ISOLATED INPUT CONTRACT需固定plan hash、workdir/root、fresh config writer來源、allowed relativefiles/dirs、每個syntheticinput hash、absentpath assertions、forbidden symlink/hardlink/foreignmount。不copyRepository的supabase tree、roles、migrations、.env、.temp或任何先前session。

Gate5核准生成規格不代表已存在config；Gate6A另授權materialization；Gate6B對實際bytes/fields/paths比較；6C前重新檢查drift。S-04 init自身wrapper/home effects也要授權，不能拿「只有init」略過。任何extra input不能改allowlist使其通過。

## 27. Effective config

EFFECTIVE CONFIG CONTRACT需記錄每個allowlistedkey的來源與resolved值：CLI flags、ambient allowlist、root/environment-specific dotenv、supabase dotenv、raw TOML、defaults、`.temp`pins、remote overlays及不同reader結果。S14有多個reader，project root探索與env key優先序不能用一條通用「env總是優先」取代。

Effective digest只對nonsecret canonical allowlist計算；secret值不hash、不輸出。對default、explicitfalse、absent、empty等distinct狀態保留。Snapshot包括project_id、gates、major/denoversion、networkmode、ports、migrations/seed/schema、vault/bucket/function counts、linked-stateabsence、registry policy、workdir及home/temp policy。任何reader差異、不明override或不是預期false都FAIL。

## 28. Environment contract

ENVIRONMENT CONTRACT不是dump env。未來launcher從明確allowlist建構最小環境；auditor輸出key、present/absent、policymatch及非秘密分類值，不保存secrets。未知envkey可影響execution則FAIL。不得現在改HOME或建立環境。

| Category | Policy |
|---|---|
| PATH / executable resolution | 固定可信binary lookup；排除shadow executable、Podman fallback；必要interpreter版本/hash |
| DOCKER_HOST / CONTEXT / CONFIG / TLS_VERIFY / CERT_PATH / API_VERSION | 只允許已核准local target組合；不讀credentialstore；S14 dotenv注入也要捕捉 |
| SUPABASE_PROJECT_ID / WORKDIR / NETWORK_ID / ENV | 與契約精確一致或明確absent；禁止env替換workdir／identity |
| SUPABASE_* config toggles / --experimental / excludes | 逐reader比較；BITBUCKET_CLONE_DIR必須absent（否則namedvolumes/安全選項被改寫） |
| Registry/proxy/CA settings | 固定可公開的host/category；含userinfo或未審proxy即拒絕，不輸出值 |
| Telemetry / notifier / debug | disabled=1、DO_NOT_TRACK=1、NO_UPDATE_NOTIFIER=1；debug/telemetrydebug关闭，无shell tracing |
| SUPABASE_HOME / TMPDIR/TMP/TEMP / runtime hooks | 範圍與writer見29–30；NODE_OPTIONS/BUN_OPTIONS等可注入或改temp/network的值不得默認繼承 |
| Cloud credentials / Auth keys / remote links | 不繼承Production／Remote credential；unexpected存在只報presence後停止，不讀值 |

Env auditor、launcher與所有subprocess的繼承規則須一致；不能只驗parent而忽略CLI將project-env寫回process.env的分支。

## 29. OS-temp

OS TEMP WRITE CONTRACT：S07 `makeTempDirectoryScoped({prefix: "supabase-start-db-setup-"})`沒有指定session dir，含平台SQLstaging並scopedcleanup。不能因workdir隔離宣稱此路徑也session-contained。Writer/reader/cleanup均屬未來Compound審查。

D03的POSIX Node tmpdir優先序是TMPDIR、TMP、TEMP後default；這只提供候選redirect方法，不證明bundled Bun＋Effect的所有scopedtemp/writer完全遵守。既有correction記錄Effect 4.0.0-beta.107；本輪未補完其installed dependency correspondence及所有temp call-site closure（G-05）。

最低contract：已核准專用temp parent、resolved canonicalroot、mode0700、建立的intrinsicprefix、檔案0600、cleanup時機、failure可保留/可被CLI移除的範圍。不允許讀OS全域temp內容或繼承unbounded sharedtemp；若不能redirect可只在明確bounded另一zone經獨立審查，不能以UNKNOWN當許可。Pre-start必要containment未證不能留待Gate7。

## 30. Supabase home

SUPABASE HOME WRITE CONTRACT：S16 resolver使用非空trimmed SUPABASE_HOME，否則真實home下`.supabase`。候選要求未來指定專用canonicalroot，不改系統HOME；所有實際writer的解析必須指向同一approvedroot。相對path／whitespace輸入不靠resolver trim修復。

| Writer | Static fact / retention |
|---|---|
| Legacy telemetry flush | S16每次command ensuring flush可能create/write telemetry.json，即使transmission disabled |
| Shared consent/identity | S17 sharedconfigdir；atomic `telemetry.json.tmp.<random>` write→rename；不是executionevidence |
| NDJSON exporter | S17 consent granted才初始化traces及append；需禁止該branch |
| Profile/state reader | S16同home resolver；禁止讀既有personalhome／profile credential；不要呼叫save profile |
| Other root/runtime dependencies | source入口已定位，完整writer reachability及permission verification仍待G-05，不宣稱一個env涵蓋一切 |

Evidence只保存path class、mode及write-policy結果，不保存device/session telemetry IDs或state內容。CLI自身private state與sanitized evidence分区；不能把telemetry.json複製進報告。

## 31. Telemetry

分別審：transmission、consent/identity persistence、state persistence、trace append/prune、debug exporter。S17 effective consent在SUPABASE_TELEMETRY_DISABLED=1或DO_NOT_TRACK=1時denied；tracing層以consent控制NDJSON。Legacy flush仍可能寫home，所以「disabled=無writes」錯誤。

最低策略：transmission disabled、traces disabled、debug disabled，home state confined。需source/root layer完整閉合及actual env核對；不以這些flags替代service egress審查。No real telemetry identifiers保存；若必要observable只能靠敏感raw才取得即BLOCKED。

## 32. Update notifier

S18 `legacyRunUpgradeNotice`先檢查SUPABASE_NO_UPDATE_NOTIFIER，再讀effective projectenv後再檢查。推薦在launcherambient明確設1，使早期分支返回；不執行CLI探測。Gate6B確認exact值、debug及wrapper入口。未禁用時可能GitHub release查詢／`.temp/cli-latest`cache，不能當registry egress。Post-success notifier不由Dockerlabels範圍控制。

## 33. pg-delta

OPTIONAL BRANCH UNREACHABILITY CONTRACT：S07 cacheEnabled由version空且（toml.pgDelta.enabled或SUPABASE_EXPERIMENTAL_PG_DELTA）決定，再看implementation legacy/next；不能只關一個flag。S15可涉及Edge script container、cache volume、hostnetwork、ephemeralport、npmregistry/CA讀取及catalogwrites，均非本次默認接受。

要求effective experimental=false、experimental.pgdelta.enabled=false、SUPABASE_EXPERIMENTAL_PG_DELTA=false/absent、schema paths空、no alternate next entrypoint、no pgdelta-version override、no customnpmregistry。`SUPABASE_USE_PG_DELTA_NEXT`只選implementation，不是總disabled開關。需逐call-site證明無reachableauxiliary；本輪未把全部dependency閉包宣稱已完成（G-06）。如auxiliary不可排除，先另審，不靠start觀察補安全。

## 34. Egress

EGRESS CONTRACT按actor分CLI、Docker daemon、container、helper。Registryallowlist不涵蓋containernpm/Edgeimports；localbridge不等於無internet。

| Category | Default treatment | Evidence needed before start |
|---|---|---|
| Approved image registries / auth / CDN | CONDITIONAL | exact approved registries、redirect/auth endpoint categories、digestpolicy；未知redirect拒絕 |
| CLI telemetry / notifier | DISABLED | effective flags及root call-site closure |
| Auth SMTP/hooks/providers/SMS | DISABLED external；僅核准localcapturedmail | nonsecret effectiveconfig counts與targetclass |
| BigQuery/GCP/cloud metadata | DISABLED | analytics postgresbranch、no external credentials；image behavior closure |
| Edge dependencies / pg-delta packages | DISABLED project/optional | emptyfunctiongraph與33節 |
| Local health/DB/container links | ALLOWED only frozen topology | exactlocal daemon／N／HostIP及serviceports |
| Remote Supabase / Production | FORBIDDEN | no remotes/linkedstate/token inputs；no external projectendpoint |

Source只證明CLIcallgraph，不完整證明14種image entrypoint的外連。最低imageconfig、servicebootstraps與daemon registrycredential/helper reachability尚須G-03/G-06；不聲稱已有firewall enforcement。若policy只能靠尚未授权改network才實現，先獨立審查，不在此輪配置。

## 35. Remote isolation

REMOTE ISOLATION CONTRACT：新root沒有link/remotes，不讀Production env；effective DBhost只能localapprovedendpoint，services內DBhost是N上指定DB，不接受任意URIoverride。S01註明Management API update hint未實作，並不保證整個wrapper、provider config或image零外連。

不需存DBURL/JWT來證明隔離：auditor在記憶體解析scope，只回localclass/port/presence assertions，不回secret或connectionstring。若出現未知remote能力、Auth callback或cloud mutation要求停止。禁止本輪真實Auth、HTTP smoke、remotequery；研究使用的官方source網路讀取不是runtime egress evidence。

## 36. Secret-safe evidence

SECRET-SAFE EVIDENCE CONTRACT：採structured allowlist擷取→memory parse→schema validation→sensitive scan→授權S-12 create-new寫入，不採先tee raw再redact。執行器不得把raw command arguments、process env、全部Docker inspect、container logs、Supabase status輸出、bootstrap stdout/stderr落盤。Pipeline每一段exit獨立保存；redactor失敗不得因CLI exit0報PASS。

Evidence envelope：schemaVersion、gate/subphase、commandRegistryId、classification、safe template ID（不rendersecret）、UTC start/end、exit status、source/helper hash、parsed allowlisted facts、assertions、redaction result。未來artifact有限名稱為`target.json`、`expectation.json`、`collision.json`、`discovery.json`、`acceptance.json`、`transient-ledger.json`、`drift.json`；均在已授權session evidence區，0700目錄/0600檔，create-new、不覆寫。

不可逆redaction不能破壞P、resource ID/name或兩labels；必要字段疑似secret則停止，不輸出觸發值、不hash敏感值當替代。Failure marker只含固定reason code、時間與檢查ID，0600；S-12沒授權則不建立。Memory stream也不得回顯terminal。State含credentials的intrinsic檔可在明確private zone內存在，但不得複製成evidence。

## 37. Docker inspect allowlist

下列僅是將來INSPECTION規格，未執行。禁止裸`docker inspect`輸出全部JSON；helper應只在記憶體接收精確projection，parser對unknown fields拒絕。Template須在implementation review確認Docker版本format/JSON行為。

| Object | Allowed metadata | Explicitly excluded |
|---|---|---|
| Container | Id、Name、Image ID、兩projectlabels、必要workdirlabel的scope結果、State.Status/Running/Health.Status、HostConfig.NetworkMode/RestartPolicy/AutoRemove、PortBindings、NetworkSettings.Ports、Mounts、NetworkSettings.Networks的ID/aliases/endpoints | Config.Env、Cmd/Entrypoint全文、Health.Log、logs、all labels、secretfiles |
| Volume | Name、Driver、Scope、兩labels、必要Options allowlist、Mountpoint scope classification | data contents、任意driveroptions或credential-bearingMountpoint輸出 |
| Network | Id、Name、Driver、Scope、Internal、EnableIPv6、allowlistedIPAM/options、兩labels、Containers ID/Name/endpoints | 任意plugin secrets/options、all labels |
| Image | Id、RepoTags、RepoDigests、Os/Architecture/Variant、Config.Volumes、approved entrypoint structural classification | Env values、history/Cmd raw、registry credentials |
| Daemon/context | approved identity/APIversion、endpointclass、networkpolicy、metadata摘要 | Docker credentialstore、TLSmaterial、all Info dump |

`docker container inspect --format '{{json .Id}}' <ID>`、`docker volume inspect --format '{{json .Name}}' <NAME>`、`docker network inspect --format '{{json .Id}}' <ID>`只是最小單field模板；完整批次projection由H-03設計，不用一個global`sort -u`抹掉個別觀測。Inspection若只接受label-filter結果，不能做complete discovery。

## 38. Parser contract

PARSER CONTRACT輸入schema：capturedAt、daemonId、resourceClass、captureContext（COLLISION/DISCOVERY/ACCEPTANCE/DRIFT）、typedrecordarray、querycoverage、queryexit。輸出：每record原始identity/labels、parsedfields、missing/invalidcodes及completeness；不得修改原始value修復。

拒絕duplicate JSON keys/record IDs、truncated截斷輸出、invalidUTF8、unknown字段、超限大小、pagination頁漏失、空值與type混淆。Names外層Docker既定leading slash若需語法處理，保存raw Name與獨立parsed Name，規則先freeze；ownership label絕不normalize。Ports陣列、所有networks/mounts逐項保留，不flatten掉多mapping。

候選pseudo-interface為`parse(capture, schema, limits) → records + errors`，不是可執行script。Common result codes：PASS、MISSING、MISMATCH、UNEXPECTED、AMBIGUOUS、INCOMPLETE、UNSAFE_OUTPUT、PARSER_ERROR；非PASS不啟動下一phase。Runbook I-17既有exit31–36不被本研究覆寫。

## 39. Comparator contract

命名空間明確為 **RA-v2/C-01至C-20**。Runbook既有C-01 discovery、C-02 acceptance、C-03 ownership、C-04 cardinality、C-05 drift是orchestration IDs，不被重新編號。Research C-01/02供其C-03；C-03至12供其C-02/04；C-13供collision；C-14至20供I-24/I-30及CT；所有結果供其C-05 drift。

每comparator共用schema：contractHash、ruleId、phase、expectedSource、actualCaptureHash、perResourceIdentity、expected/actual非秘密值、result、reason、completeness。只從freeze的expectedside讀約束，不能以actual產生expected。每列FAIL也涵蓋missing/unknown/parse error；未到phase標NOT RUN，不是PASS。

| ID | Expected source / actual input | Equality / PASS rule | Failure / emitted record |
|---|---|---|---|
| RA-v2/C-01 | Design ID規則＋reserved P / config lexical bytes | ASCII/35byte/regex且P exact | lexical/ID不符；project-id assertion |
| RA-v2/C-02 | P / 每資產兩raw labels | 每一label byte-exact | missing/mixed/normalized；two separate label assertions |
| RA-v2/C-03 | S02/S03角色及config / container records | 唯一role、name公式與branch匹配 | ambiguous/wrongservice；role binding |
| RA-v2/C-04 | 8–9節volume model / volume＋consumergraph | name/driver/labels/target符約束 | unlabeled/foreignvolume；volume binding |
| RA-v2/C-05 | N contract / network record | name/driver/scope/options/labels匹配 | extra network/mode；network assertion |
| RA-v2/C-06 | role→N edges /雙向endpointgraph | endpoints集合與必需aliases一致 | missing/foreignedge；per-edge結果 |
| RA-v2/C-07 | role→volume edges / mounts＋consumers | 每destination與consumer符contract | extra consumer/mount；per-edge結果 |
| RA-v2/C-08 | approvedroot/mountspec / canonical metadata | type/destination/mode/rootidentity一致 | escape/unknowncanonical；mount verdict |
| RA-v2/C-09 | 21–22節tuples / effectivebindings所有元素 | HostIP/protocol/host/containerport皆匹配 | wildcard/extra/missing；per-tuple結果 |
| RA-v2/C-10 | approveddigest/platform / image+container Image | L3與L2對應且declaredvolumes閉合 | tag-only/untrusted；image provenance result |
| RA-v2/C-11 | enabled-role及phase counts /完整candidate+ledger | required/excluded/lifecyclecardinality成立 | missingrole/duplicaterole；per-rolecounts |
| RA-v2/C-12 | allowedclasses/branches /全universe delta | 每delta有唯一已核准disposition | unexplainedadditional；delta ledger |
| RA-v2/C-13 | history/targetnames/ports /全baselineinventory | 無candidate交集、查詢完整 | anycollision/unknown；collision assertion |
| RA-v2/C-14 | fresh-only / pre-creation DB container/volume metadata | confirmed absent，無reuse/backup | existing/inspecterror；fresh-path record |
| RA-v2/C-15 | 25–26節exclusion / actualinputmetadata | 每projectbranch absent或proveddisabled | roles/seed/vault/otherreachable；input assertion |
| RA-v2/C-16 | configplan＋readerprecedence /actualresolvedsnapshot | 每allowlisted值/source一致，無overridegap | readerdrift/unknown；config result |
| RA-v2/C-17 | envallowlist /launcher/childenv auditor | key/policy結果完整、無unexpectedinheritance | remote/proxy/runtimehook；env verdict不含secret |
| RA-v2/C-18 | targetcontract / effectiveclient/context/daemon | 同localdaemon及trustedclient、nofallback | remote/drift；target assertion |
| RA-v2/C-19 | writerbounds /temp/homecanonicalpolicy与actualmetadata | 每writer解析/權限/lifecycle可覆蓋 | unboundedwriter；zone result |
| RA-v2/C-20 | egress/optionalbranches /staticcallgraph＋effectiveinputs | 每branch允許或proveddisabled、無remote | unknownreachable；branch disposition |

Comparator必須可用合成metadata單元測試missingfield、duplicateID、wronglabels、foreignedge、匿名volume、IPv6多tuple、fallback與partialsnapshot；本輪不建立tests、不執行tests。C-11不能因SQL-A jobs已消失而忽略其ledger；該ledger如何完整建立仍見G-02。

## 40. Helper requirements

只有requirements，不產生腳本或checksum假值。Common interface：讀核准metadata/contract→memory record，禁止mutation、networkfetch（除明確inspection）、SQL、Auth、configwrite、修復與retry。Invocation必須用exact已審binary/path；下面symbolic名字不是可執行命令。

| ID / proposed helper | Status | Inputs → outputs / security responsibility |
|---|---|---|
| H-01 target inspector | REQUIRED BEFORE GATE 5 | PATH/context/daemonallowlist→targetrecord；no credentialreads |
| H-02 candidate discovery | REQUIRED BEFORE GATE 5 | full allowlistedbaseline/postmetadata→candidate/delta；不只label filter |
| H-03 resource parser | REQUIRED BEFORE GATE 5 | boundedJSON→per-resourcevalidatedrecords；preserve raw labels |
| H-04 relationship comparator | REQUIRED BEFORE GATE 5 | expectedgraph＋records→per-edgeassertions |
| H-05 port comparator | REQUIRED BEFORE GATE 5 | allbindings＋HostIPpolicy→tupleresults |
| H-06 mount canonicalizer | REQUIRED BEFORE GATE 5 | rootpolicy＋lstat/realpathmetadata→containment；no probe writes |
| H-07 image identity inspector | REQUIRED BEFORE GATE 5 | approvedmanifest＋safeimagefields→digest/platform/volumeclosure |
| H-08 config auditor | REQUIRED BEFORE GATE 5 | frozenplan＋syntheticactualconfig→resolvednonsecretfacts |
| H-09 env auditor | REQUIRED BEFORE GATE 5 | scopedchildenv→presence/policyassertions，neverdump values |
| H-10 SQL-C exclusion auditor | REQUIRED BEFORE GATE 5 | inputmetadata/configbranchgraph→exclusionrecord |
| H-11 temp/home containment checker | REQUIRED BEFORE GATE 5 | writercatalog＋canonicalparents→bounds/permissions verdict |
| H-12 evidence redactor | REQUIRED BEFORE GATE 5 | memoryallowlistedrecords/stream→safe records或fixedfailure；無rawfallthrough |
| H-13 drift comparator | REQUIRED BEFORE GATE 5 | frozenbaseline/set＋newrecords→delta；不updateexpected |
| H-14 transient lifecycle collector | REQUIRED BEFORE GATE 5 | approvedcaptureprotocol→completejobledger；implementation方式仍G-02 |
| H-15 Compound launcher | REQUIRED BEFORE GATE 5 | approvedcontract＋6B→單次S-06；STATE-CHANGING，與inspectionhelper分離 |
| H-16 local evidence writer | REQUIRED BEFORE GATE 5 | sanitizedrecord＋S-12scope→create-newartifact；STATE-CHANGING，非inspection |
| H-17 source/digest human approval | MANUAL REVIEW ACCEPTABLE | signed/publicprovenance＋review→trust decision；不能代替comparator |
| H-18 resource actual IDs/health | RUNTIME-ONLY | 只有環境存在後可觀測；其parser/constraint仍須先freeze |

沒有把state-changinglauncher偽裝成acceptance helper。若接受資產必須透過create/mutate才能取得必要pre-start條件，mandatory stop C；不以「helper準備」作執行授權。

## 41. Helper checksum policy

HELPER IMMUTABILITY CONTRACT freeze：每個filepath、language/runtime及版本、source、SHA-256、exactinvocation、allowedinputs/outputs、schema/version、no-mutationassertion、failure/timeout/exitsemantics、依賴hash及testreview。Forbidden：latest helper、動態下載、unreviewed dependency、任意eval、fallback parser。

檔案改變後既有Gate5record失效；S-06前再比對launcher/redactor/writer與inspectors hash。Required helper尚不存在，本輪不捏造sha或宣稱PASS。S-12持久化也要獨立scopeauthorization，inspection成功不隱含write權限。

## 42. Static/runtime evidence phases

| Phase | Facts / artifacts | Boundary |
|---|---|---|
| STATIC PRE-GATE-5 | pinnedsource、role/image/inputbranchcatalog、approvedimageconfig/digest、writer/egresspolicy、helperreview/checksums、Planned Config Contract | 本輪只建立研究文件；不是所有列項已完成 |
| READ-ONLY PRE-START | actualclient/context/daemonpolicy、imagecache、baselineasset/ports/historycollision、canonicalrootmetadata | 需獨立inspection範圍；不能啟動daemon來做「唯讀」 |
| GATE-6B | materializedconfig/input/env/paths/permissions/checksums、再驗target/collision、SQL-C/optionalexclusion | 6A須先另授權；6B不是start；6C再授權 |
| POST-START GATE-7 | actualresourceIDs/names、兩labels、mounts/endpoints/ports/imagebindings、health、transientledger及acceptance | runtime結果不能回填expected；missing證據不得PASS |
| SPIKE-ONLY | 20 tests、Auth fixtures、SQL-D、concurrency結果 | 不屬Start；仍須Gate8独立授权 |

Pre-stop重驗currentset、drift、workdir/daemon/ownership與remoteabsence；stop和cleanup各自獨立，不是tests後自動操作。Gate5只可核准可操作且安全的contract及後續條件，不要求尚不存在的containerID；但HostIP/SQL-C/foreign-prune/image信任等pre-start必要條件不可推遲。

## 43. CT-01–20 readiness matrix

Statuses僅使用指定五種；目前沒有一列宣稱execution PASS。每列同時列出未來PASS條件，不代表現在授權。

| CT | Requirement / evidence source | Phase | Current status | Blocker / helper | PASS criteria |
|---|---|---|---|---|---|
| CT-01 | binary/source correspondence；2–3節/S01 | STATIC＋PRE-START | PARTIALLY ESTABLISHED | G-07/H-17 | 精確binary版本/hash/來源鏈及PARTIAL風險明確接受或閉合 |
| CT-02 | Docker target；S08/S14/5節 | PRE-START＋6B | PARTIALLY ESTABLISHED | G-08/H-01/09 | localdaemon/client固定，nofallback或remoteoverride |
| CT-03 | configwriter/lifecycle；26–28節 | STATIC＋6B | PARTIALLY ESTABLISHED | H-08/09/15 | plannedwriter審查及actualconfig/inputdrift全通過 |
| CT-04 | fresh/existing/collision；S01/04/06 | PRE-START＋6B | PARTIALLY ESTABLISHED | H-02/13 | DBcontainer/volume確定absent、nohistoricalcollision |
| CT-05 | SQL-A/B；S06/07 | STATIC＋6B | PARTIALLY ESTABLISHED | G-06/H-10 | platformbootstrapclosed、existing SQL-B不可達 |
| CT-06 | SQL-C/D exclusion；S07/14/15 | STATIC＋6B | PARTIALLY ESTABLISHED | G-06/H-08/10 | roles/vault/seed/schema/function等各branch排除，SQL-D未授權 |
| CT-07 | imageprovenance/cache；S11–13 | STATIC＋PRE-START＋7 | PARTIALLY ESTABLISHED | G-01/03/H-07 | approveddigests/config/platform，actualsame，registrypolicy足夠 |
| CT-08 | notifier；S18 | STATIC＋6B | PARTIALLY ESTABLISHED | H-09 | exactdisabled earlybranch，無notifiercache/network |
| CT-09 | telemetry/home；S16/17 | STATIC＋6B | PARTIALLY ESTABLISHED | G-05/H-09/11 | transmission/tracesoff，所有reachablehomewriters有界 |
| CT-10 | OS-temp；S07/D03 | STATIC＋PRE-START＋6B | PARTIALLY ESTABLISHED | G-05/H-11 | bundledruntime/dependency及alltempwriterclosure，實際parent權限可證 |
| CT-11 | `.temp`/branchmarker；S06/09/13 | STATIC＋6B＋7 | PARTIALLY ESTABLISHED | G-06/H-08/10/11 | allowlistedintrinsicfiles，noimportedlink/pins/secrets |
| CT-12 | Edge；S09/10 | STATIC＋6B＋7 | PARTIALLY ESTABLISHED | G-01/03/06/H-06/10 | intrinsic staging限定，emptyprojectfunctions，image/mount/network可接受 |
| CT-13 | pg-delta；S07/15 | STATIC＋6B | PARTIALLY ESTABLISHED | G-06/H-08/09/10 | 所有啟用分支false，不只next選項 |
| CT-14 | HostIP/ports；S05/D01 | STATIC＋PRE-START＋6B＋7 | PARTIALLY ESTABLISHED | G-08/H-05 | pre-startloopbackpolicy有證＋actualtuples全匹配 |
| CT-15 | network/egress；S04/09/D01 | STATIC＋PRE-START＋7 | PARTIALLY ESTABLISHED | G-03/04/08/H-04 | bridgeoptions/attachments/egress範圍及foreignisolation通過 |
| CT-16 | intrinsicrollback；S19 | STATIC＋PRE-START＋7 | PARTIALLY ESTABLISHED | G-08/H-02/13 | exactselector無foreignintersection，phase/failedrollbackreport完整 |
| CT-17 | intrinsicretry；S12/19/S07 | STATIC | PARTIALLY ESTABLISHED | G-03/H-15 | branchattempt/timeouts/fallback已核准；operatorretry仍禁止 |
| CT-18 | redaction/evidence；36–38節 | STATIC＋6B＋7 | NOT ESTABLISHED | H-12/16 | secret-safeimplementation/checksums/tests/出口全閉合 |
| CT-19 | independentacceptance；6–24/38–39節 | STATIC＋PRE-START＋7 | PARTIALLY ESTABLISHED | G-01/02/03/H-02至07/14 | fullrole/image/graph/labels與lifecycleevidence可驗，不靠labels alone |
| CT-20 | helpers/checksums；40–41節 | STATIC＋6B | NOT ESTABLISHED | requiredhelpers未實作 | 每requiredhelper/launcher/writer審查、測試、hashfreeze，無latest |

## 44. Remaining blockers

| Gap | Evidence / exact closure needed | Phase / classification |
|---|---|---|
| G-01 Image-declared anonymous volumes | CLI explicitbinds不等於image Config.Volumes空；需每approveddigest的config與targets覆蓋，含3jobs與Edge | STATIC PRE-GATE-5；尚可metadata研究；若必然unlabelled則normative review或C |
| G-02 Short-lived job evidence completeness | `run --rm`jobs可能在Gate7前消失；events可能不足以提供mount/image/labels完整projection；需設計可證完整且secret-safe的capture source，不允許更改CLI或暫停jobs偷補證 | STATIC PRE-GATE-5；capture contract尚未閉合，不是可直接實作的完成規格 |
| G-03 Image/registry/entrypoint trust | defaults已知，approveddigests、image-config、entrypoint/serviceegress與registryauth/CDN尚未固定 | STATIC＋PRE-START；不能用tag-only通過 |
| G-04 Vector/socket scope | CLI可把Docker socket交給container；filesystem ro不等於API readonly；是否保留該service、可接受風險與最小化方案需人審 | STATIC security/config decision；本輪不擅自關service或變更十portmapping |
| G-05 Temp/home complete closure | 已知home resolver及telemetrywriters；bundledBun/Effecttemp與所有rootwriter reachability/permissions仍未完整 | STATIC＋read-onlypolicy；不把Node docs當bundledbehavior證明 |
| G-06 Effective branch/input closure | config readers、pgdelta cache與functions/Studio/bucket/vault分支已定位；完整allowlist及all-reader equivalence仍待審查 | STATIC＋6B；不能只setseed=false |
| G-07 Binary/source provenance | SOURCE CORRESPONDENCE PARTIAL仍保留 | STATIC／人審；不得自稱reproducible |
| G-08 Actual target/policy/collision | daemon/client、loopbacknetworkdefaults、existingimages/resources/ports、exclusivewindow尚未inspection | READ-ONLY PRE-START；目前NOT VERIFIED，非需要先start才知道 |
| G-09 Helpers / safe evidence | H-01至16尚未實作review/freeze；G-02未定前不可把helper列單當完成 | STATIC后續獨立Gate；NOT AUTHORIZED |

RESOURCE ACCEPTANCE READINESS：Container PARTIAL（roles可證，image/job證據缺）；Volume PARTIAL（explicit三類可證，anonymous未閉）；Network PARTIAL（name/labels可證，policy/actualgraph未驗）；Cross-resource PARTIAL（contract已定，capture未閉）；Docker Target NOT VERIFIED；Images PARTIAL；Ports/HostIP PARTIAL；Mounts PARTIAL；Fresh Path PARTIAL；SQL-C Exclusion PARTIAL；Temp/Home PARTIAL；Optional Branches PARTIAL；Egress PARTIAL；Parser/Comparator DESIGN ONLY；Helpers NOT IMPLEMENTED。

本次尚未證明與normative根本不相容，也未確定必須修改Design/Runbook，因此不自動提出normative文字patch。若G-01/G-02等證實現行per-resource規則不可滿足，須明確NORMATIVE CORRECTION REQUIRED，由Human Review決定；不得降格label/evidence要求讓A成立。

## 45. Final classification

**B — RESOURCE ACCEPTANCE EVIDENCE PARTIAL — ADDITIONAL STATIC CORRECTION REQUIRED**。

理由：主要native資產規則、fresh path、registry與roles.sql等排除路徑有固定source證據；但匿名image volumes、短命jobs觀測完整性、image/bootstrap外連及temp dependency閉包仍有重要靜態缺口。不是只有有限helper實作或runtime ID未知，因此不選A/D。不把「尚未取得本機inspection」誤稱架構永久不可行；若後續觸發第44節根本衝突或必須先start才能證明安全必要條件，立即升級C。

未出現可授權start的結果；Gate5仍BLOCKED。Design/Runbook不改，無新session、無實際manifest/resource set、無helper、無SQL或executionevidence。B類本轮不stage、不commit、不push；保留研究artifact供Human Review，不自行套用blocker保存例外。

## 46. Resume criteria

下一步只可由明確授權進行B類靜態缺口整理：approvedimagemetadata/anonymousvolume、transientcapture完整性、Vector/socket安全選擇、temp/runtime與effectiveinputclosure。若需要超出read-only metadata的權限先停止；不能以研究名義pull/create/start。處理完再Human Review本研究，分類A/D後才考慮local research checkpoint與獨立helper implementation授權。

12個既有Gates不合併：Design Correction → Final Read-only Review → Design Correction Checkpoint → New Session Identity Reservation → Environment Start Compound Transaction Authorization Review（Gate5）→ Environment Start Execution（6A/6B/6C）→ Post-start Ownership Verification（Gate7）→ Spike Test Execution Authorization → Technical Evidence → Decision Revision → Migration Design Freeze → SQL Draft。每個state-changing phase另授權；本輪不生成ID、不啟動6A或6C。Manual stop/cleanup不由PASS自動授權。

| Final state | Value |
|---|---|
| Normative Correction | COMPLETED LOCALLY |
| Resource Acceptance Evidence Research v2 | COMPLETED — B/PARTIAL，evidence closure BLOCKED |
| Helper Implementation | NOT YET AUTHORIZED |
| Gate 5 | BLOCKED |
| Gate 6A / Gate 6C | NOT AUTHORIZED / NOT AUTHORIZED |
| Environment Start | NOT AUTHORIZED |
| Spike Execution | NOT YET ENTERED |
| SQL / Migration execution | NOT AUTHORIZED |
| Remote Supabase / Production | NOT AUTHORIZED |
| Push | NOT PERFORMED |

Static validation只核對此研究文件、三份baseline fingerprints、protected tracked files與Migration001–008byte comparison、links/whitespace/EOF/敏感patterns；不執行Runbook或任何runtime測試。Validation結果隨交付報告提供，不把本研究文件的selfhash寫入自身。

## Static Evidence Closure Addendum

### SC-01. Closure purpose, authority and supersession

2026-08-28，承接 Human Review 接受的 Research v2 B。本附錄是最後一輪 bounded static closure，不是第三份全量研究。原 Sections 1–46 保留為研究快照：原始 561 lines／66,864 bytes／SHA-256 `e175d2a02b9d12d9fac2ae8f5bd833ccd7bcb8c133f20f4ba090b0845a5742e0`，未列入既有 HEAD。此次 preflight：同分支、同 `0f5c5b61305d308169fce698ce7c4280aa6adb17`、tracked clean、staged 0；三份 normative fingerprints 與 Section 2 完全相同。

**本附錄為本 research artifact 的目前結論。** SC-02–15 更新七條 tracks；SC-16 逐項取代 G-01–09 的現況；SC-17 取代 helper readiness，SC-18 取代 CT readiness，SC-19/20 取代舊 Remaining blockers／Final classification／Resume criteria。它不凌駕 Design／Runbook，不把 proposed policy 視為已核准。原文中的「未取得 metadata，所以 static 未閉合」不能再單獨作 B 理由；實際值可留待有完整契約的 instance evidence。

本輪僅讀固定 source、公開 metadata／官方文件與 Git；固定 dependency archives 只透過記憶體管線讀取指定 source member，沒有落盤、安裝或執行。未執行 Docker／Supabase command、SQL、Auth、helper、環境盤點或 Runbook，未產生 session ID、config、fixture 或 execution evidence。失敗的公開 source 路徑查詢不作證據。

補充 primary evidence catalog（CLI 連結一律固定原 commit；Docker v28.0.0 source 只證明該版本語意，不假定本機 daemon 同版）：

| Ref | Source / inspected locus | Evidence boundary |
|---|---|---|
| CE-01 | [Dockerfile VOLUME](https://docs.docker.com/reference/dockerfile/#volume)、D02 volumes、[volume prune](https://docs.docker.com/reference/cli/docker/volume/prune/)、[Moby create_unix](https://github.com/moby/moby/blob/v28.0.0/daemon/create_unix.go) | image-declared target、已有 mount 跳過、匿名建立與 lifecycle；非目前 image metadata |
| CE-02 | [Docker events](https://docs.docker.com/reference/cli/docker/system/events/)、[event schema](https://github.com/moby/moby/blob/v28.0.0/api/types/events/events.go)、[event emitter](https://github.com/moby/moby/blob/v28.0.0/daemon/events.go) | event 有 ID／attributes／時間，不承諾 full inspect snapshot；重播歷史有限 |
| CE-03 | [Vector builder](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/commands/start/services/vector.service.ts)、S02 gates、[Docker daemon security](https://docs.docker.com/engine/security/#docker-daemon-attack-surface) | Unix socket `ro` bind 仍是 daemon API surface |
| CE-04 | [Dependency catalog](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/pnpm-workspace.yaml)、[fixed platform-bun archive](https://registry.npmjs.org/@effect/platform-bun/-/platform-bun-4.0.0-beta.107.tgz)、[fixed node-shared archive](https://registry.npmjs.org/@effect/platform-node-shared/-/platform-node-shared-4.0.0-beta.107.tgz) | `package/src/BunFileSystem.ts` delegates NodeFileSystem；`package/src/NodeFileSystem.ts` L145–190 uses OS.tmpdir／NFS.mkdtemp／scoped rm；本輪未驗證 npm attestation signature |
| CE-05 | [Bun Node compatibility](https://bun.sh/docs/runtime/nodejs-compat)、D03 Node os.tmpdir、[shared root](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/shared/cli/run.ts) | root uses BunServices；通用 compatibility 不等於 installed runtime 全部行為已實測 |
| CE-06 | [Local config values](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/shared/legacy-local-config-values.ts)、S14 context／dotenv／DB reader | 按 reader 分流，特別是 Docker-client env 與 BITBUCKET_CLONE_DIR 不同 |
| CE-07 | [Shared CLI config](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/next/config/cli-config.layer.ts)、[legacy analytics](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/telemetry/legacy-analytics.layer.ts)、S16–18 | home resolver、consent、read-only profile、notifier 與 start writer 可分層界定 |
| CE-08 | [Official release](https://github.com/supabase/cli/releases/tag/v2.115.0)、[release metadata](https://api.github.com/repos/supabase/cli/releases/tags/v2.115.0)、[published checksums](https://github.com/supabase/cli/releases/download/v2.115.0/checksums.txt) | release 確有 checksums；archive digest 不是 extracted binary hash，不冒稱簽章已驗證 |

### SC-02. Image-declared volume closure

**IMAGE DECLARED VOLUME ACCEPTANCE：需要；contract 靜態成立，實例 metadata 尚待。** Docker create/run 會處理 image Config.Volumes；沒有 explicit mount 覆蓋的 target 可建立 anonymous volume。CE-01 create_unix 在已有 mount 時跳過，否則以空 name、container reference 建立 volume，未傳兩個 project labels；SELinux relabel 不是 Docker metadata label 繼承。不能從 container labels 推得 volume labels。

Named／anonymous volumes 有獨立 lifecycle。一般 container removal 不保證刪 volume；`--rm` 會清其匿名 volume，但共用／仍被引用情況不能省略。Prune 的 unused／anonymous／all／label-filter 語意需依 API 版本核對；本輪一律不執行。無匿名 volume 的證明來自 exact image config 加上 effective mount plan，不來自「CLI binds 為空」或「最後 inventory 沒看到」。

| Start-reachable image role | Classification | Pre-start decision |
|---|---|---|
| PostgreSQL：核准的 14／15／17 分支之一 | IMAGE-CONFIG MUST BE INSPECTED | declared targets 逐一對 DB explicit mount／tmpfs 規則；不接受猜測 VOLUME 只有 data |
| Kong、Mailpit、REST、PG Meta、Studio、Imgproxy、Pooler | IMAGE-CONFIG MUST BE INSPECTED | 每個 enabled role 的 approved digest；disabled role 保存不可達 predicate |
| Auth main／Auth migrate job | IMAGE-CONFIG MUST BE INSPECTED | 同 image 不等於同 mount plan，job 另驗 |
| Realtime main／Realtime bootstrap job | IMAGE-CONFIG MUST BE INSPECTED | 同上；short-lived 不豁免 |
| Storage main／Storage migrate job | IMAGE-CONFIG MUST BE INSPECTED | main `/mnt` 與 job 無 explicit bind 分別求 uncovered destinations |
| Edge main／conditional auxiliary Edge image | IMAGE-CONFIG MUST BE INSPECTED | main staged binds 與 optional job 分开；本 profile 禁 auxiliary |
| Vector／Logflare | IMAGE-CONFIG MUST BE INSPECTED if enabled | SC-07 推薦 disabled；只有 predicate 已證才可 N/A |
| Differ／Migra／pg_prove 非本次 start 分支 | IMAGE-CONFIG NOT SAFETY-RELEVANT to approved invocation | 只因不可達，不代表 image 天生安全；可達性未知即 NOT ESTABLISHED |

Pre-start 只需公開 registry config 或另授權的 local image read-only inspect，無須 run image。每 image 保存 approved manifest/platform/config identity、declared destination 集合、effective mount coverage、每 target disposition。**現有 normative 下 uncovered declared destination 必須為零**；未標記 anonymous volume 不可藉本附錄改用 parent ownership 通過。若已核准 image 的必要分支有不可避免 uncovered target，停止 Gate 5、另提 normative／image strategy 決策，不偷偷 pre-create/mount 或換 image。

Post-start discovery 仍檢查所有新增 volumes＋container mounts＋全 consumer graph；random name 不是排除條件。任何預期之外的 anonymous volume、missing labels、foreign consumer 都 FAIL。若匿名資產已被 `--rm` 消除，不能靠 post-state 證明它未存在，須使用 SC-05/06 的明確短命證據政策。這是有限 image instance check，不再以未下載 image metadata 本身列 static blocker。

### SC-03. Image Config Acceptance Contract

建立每個 `(approved platform manifest, role, effective CLI overrides)` 的 projection。Image config 與 container effective config 不能混為一份；CLI override 不可省略。Raw Env、secret-bearing Cmd／Healthcheck／labels 不持久化；即使 image 是公開的也遵守 allowlist。

| Field | Rule | Evidence / rejection |
|---|---|---|
| Entrypoint / Cmd | EXACT MATCH for approved nonsecret structural template；secret slots only category/policy | 保留 image baseline 與 CLI override 的來源；新增 shell、download/bootstrap command 或 unknown payload 先拒絕，不以全文 command capture 補證 |
| User | ALLOWLISTED MATCH per role | root 不是全平台自動接受／拒絕；DB 等角色的 image default 與 CLI effective User 分別核准，空 default 明列 |
| WorkingDir | EXACT MATCH or approved role default | absolute container path；不等於 host path；未審差異 FAIL |
| ExposedPorts | ALLOWLISTED MATCH | 不代表 host publish；HostIP/PortBindings 另由 C-09 檢查 |
| Volumes | EXACT SET plus per-destination mount coverage | uncovered targets 按 SC-02 fail closed；不能忽略 image default |
| Env | KEYS/CATEGORIES + in-memory policy checks | credentials、local DB target、network toggles 分類；不保存 raw values 或可暴力反推的 secret hash |
| Healthcheck | approved structural command + timing policy | image 與 CLI override 分開；不保存 Health.Log；runtime health 只驗狀態 |
| OS / Architecture / Variant | EXACT MATCH approved platform | multiarch index 必須定位 child manifest；不把 host CPU 等同 image platform |
| Image ID / Config digest / RepoDigest | EXACT MATCH provenance binding | immutable content identity；tag-only、missing chain、wrong platform FAIL |
| Runtime mounts / networks / publish / health | RUNTIME-ONLY verification of already frozen constraints | 不要求 Gate 5 猜 actual ID；不允許 Gate 7 倒填 image approval |
| Full filesystem / complete reproducible build | NOT REQUIRED for this minimum contract | 不聲稱無漏洞／無惡意；以固定供應商、digest、least privilege、無真實資料限制 residual risk |

### SC-04. Entrypoint and minimum image provenance

| Option | Benefit / risk | Disposition |
|---|---|---|
| A tag/reference only | 最方便；tag mutable、cache 混淆、無 immutable identity | REJECTED |
| B local ID＋RepoDigest＋platform＋selected Config | 可確認 daemon 現有內容；缺獨立 approval anchor，不能讓同一 local image 自證可信 | CONDITIONAL；須另補批准來源，實質提升為 C |
| C approved manifest digest＋local identity＋Config projection | 對本 feasibility scope 有有限、可實作、可檢驗的信任鏈 | **RECOMMENDED MINIMUM**；保留 supply-chain residual risk |
| D complete reproducible supply-chain proof | 最強但成本與目標不相稱，且不消除 runtime 漏洞 | DEFERRED；不作本輪永久 blocker |

C 必須由官方 registry／release provenance metadata 或另行人工核准的供應來源給出 digest，並核對 platform child manifest→config digest→local Image ID。Tag 只用於解釋 CLI resolver 將選哪個候選，不能取代 digest。有效 override 與 readonly/privilege/network/mount envelope 限制 image 能碰的資源；不試圖證明 image 內全部程式碼。尚未取得特定 image metadata 屬 READ-ONLY PRE-START EVIDENCE，不等於模型不足；若無可信供應來源，該 instance 不可 start。

### SC-05. Ephemeral job inventory and model comparison

S07 L645–712 的 `legacyRunStartMigrateJob`、S08 run builder 與 `legacy-docker-run.service.ts` 是本次短命路徑。三個 PG15+ jobs 依 realtime→storage→auth 順序，取決於 setup config enabled，不等同 main `--exclude` gates。DB target 為本次 network 上的 local DB，密碼不進證據。

| Job class | Trigger / image / effects | Resource contract / lifetime / failure |
|---|---|---|
| Realtime platform bootstrap | fresh PG15+，realtime enabled；Section 18 Realtime image；平台啟動/tenant setup | `run --rm`，兩 project labels，N，binds empty，no publish，local DB；nonzero 傳出 setup failure |
| Storage platform migrations | fresh PG15+，storage enabled；Storage image；平台 storage migration | 同上；job `/mnt` 是否觸發 image VOLUME 必須另驗；main volume 不自動套用 |
| Auth platform migrations | fresh PG15+，auth enabled；Auth image；平台 Auth migration | 同上；不是建立 synthetic Auth user／Spike permission |
| PG14 platform initializer / health probes | S07 PG14 template與既有 DB connection | 不是另一個假定的 `run --rm` job；按 approved major 分支，不混入前三 job counts |
| Optional pg-delta / declarative exporter / Edge script | S15 cache/declarative paths；Edge auxiliary image，可含額外 cache/network | 本 Foundation profile 必須不可達；若任一 predicate 未證則拒絕，不納入 allowed ephemeral role |
| User-defined bootstrap/function/dependency jobs | project inputs | SQL-C／user workload 排除；不是因短命而允許 |

| Model | Advantages | Limits / disposition |
|---|---|---|
| A pre-authorized ephemeral roles | Gate 5 事先固定角色、predicate、image、mount、network、DB target與持久副作用；不要求 inspect 已消失資產 | 無法提供每次 invocation 的 full actual inspect；單独使用需明確信任固定 CLI，不能假報 observed |
| B safe wrapper stream | 記錄單次 S-06 boundary／exit；不讀 Env/logs | 現有 CLI `runStream` 給上層 exitCode/stderr，job stdout 丟棄；外層 wrapper 不是每個 Docker create 的中介，無法憑空取得 ID／mounts |
| C daemon event observation | Read-only GET stream，可及時保留 ID、labels、reference、lifecycle 與部分 network events | 不含完整 inspect；history 只保留有限事件，無 sequence gap-free 保證；不得用事後 poll 當確定性取證 |
| D persistent debug jobs | 容易 inspect | 改變 `--rm`、lifetime、rollback semantics；REJECTED，不修改 CLI、不暫停 jobs |

**推薦 A＋C：事前角色 contract＋safe event ledger＋persistent post-state acceptance。** B 只管 invocation boundary，不宣稱具有內部 job telemetry。這是供 Gate 5 核准的有限契約，不是改寫 normative 的例外。Design 4.3／Runbook 6.1–6.6 對 post-start observed candidates 建立 verified runtime resource set；已正常移除的 job 不加入該集合、不偽稱完成其 full inspect。Persistent containers／volumes／network 仍逐項完整 inspect；被移除的 jobs 另外保存 observed events 與 source-derived assertions。Gate 5 預先核准角色與 source/binary/image 信任，Gate 7 驗證角色 ledger、終止與持久副作用；未知、缺證據或仍存活 job 均不能豁免。此分層符合本輪明示的 Model A 範圍，沒有要求不存在的資產事後 inspect；不再將不存在的 full snapshot 當作 normative blocker。

### SC-06. Ephemeral Resource Evidence Contract

此 contract 是 SC-05 A＋C 的靜態契約，實例 profile／風險接受仍須 Gate 5 核准；未修改 Runbook、不產生 fake observed record，也未授權實作或執行。

- Observation start：在 S-06 前完成同一 daemon 的 baseline、建立 read-only stream，取得 HTTP subscription ready；不是以 sleep 等待。連線不可建立則不呼叫 S-06。
- Observation end：涵蓋 S-06 回傳及已知 jobs 的 terminal events、persistent post-snapshot；發生 crash／disconnect／buffer overflow 即 evidence INCOMPLETE。不得自動重連後宣稱無縫；後續處置需新授權。
- Allowed record：daemon ID、capture-local ordinal、Type、Action、Actor.ID、time/timeNano、兩個 raw project labels、nonsecret name／image reference、die exitCode、network-event container ID。其他 attributes 在記憶體丟棄；禁 all-label dump。
- Image reference 不是 image digest：透過 frozen cache resolver／approved image identity 表作 SOURCE-DERIVED binding，不能把 event 的 image 字串誤報 actual config digest。若短命 container 來得及 inspect 可附 OBSERVED projection，但它不是可靠必得的 acceptance 前提。
- 禁 Env、logs、Cmd、credential payload。Docker event API 可能在記憶體回傳其他 attributes；必須逐字段 projection 後才可傳輸出，不能直接 `{{json .}}` 或 tee raw stream。Frame-size／UTF-8／JSON errors fail closed。
- Duplicate handling：保留 arrival ordinal；只有 byte-identical event 重送可另標 replay duplicate，不能對資產做 `sort -u`。同 ID conflicting labels／reference 或非法 lifecycle transition FAIL。
- Order：使用每資產 transition graph＋capture ordinal；timeNano 只作事件時間，不假設全域唯一／嚴格單調。expected role count 依 predicate，不依 event數量；unknown extra IDs 均需 disposition。
- Missing create/start/die/destroy 或預期 job 未有完整 ledger：INCOMPLETE，不能靠 start exit0 補 PASS。事件只證它有記錄到的事情，不保證每個資產的所有 fields 或所有 foreign activity 都曾被觀測。
- No persistent candidate expected 不等於不用查：Gate 7 確認無 orphan jobs／unexpected volumes／foreign edges；失敗留下的 job 必須照常 full inspect，不豁免 labels。
- Projection／redaction PASS 後，且取得 S-12 精確授權，才由 writer保存 event records／source-derived assertions／coverage limitations；原生 CLI private staging 與 sanitized evidence 分開。

CE-02 的 Actor.Attributes 主要來自 labels、image reference、name；沒有 mandatory Mounts／HostConfig／Env schema。Network connect 可給部分 edge，不能證明不存在其他 bind。故這份 contract 不以 streaming「修復」不存在的 full snapshot：source-derived mount／DB target assertions 只屬事前角色契約，不冒稱 actual observations。角色預期與事件匹配使用固定 CLI 的 role/name/command-plan 來源、approved image resolver 與唯一 invocation window；無法唯一對應角色、同名／同 image 歧義或事件與來源計畫不一致均 FAIL。仍存在的 job 與其 mounts 必須 full inspect。已移除 job 的信任來自已核准 binary/image/role plan 加上有限實際事件，不構成獨立 runtime mount attestation；此 residual limitation 必須列入 Gate 5，不自動開啟執行。

### SC-07. Vector Docker socket decision

**推薦 V-A：Foundation Spike 停用 Vector／analytics；V-B 不推薦。** S02 的兩 gate 皆是 effective analytics.enabled 且未被各自 exclude；把 analytics.enabled 明確設 false 並禁止 env/remote override 可使二者不可達。需 H-08／09 重新驗證 actual inputs；單獨 exclude Vector 而仍允許 analytics 不是本推薦。此處只提出 config contract，未寫入任何 config 或更改 normative port table。

Vector image 為 Section 18 的 `timberio/vector:0.53.0-alpine`；CE-03 在 Unix branch 將已解析的 socket（Desktop/Colima 特殊情況用標準 daemon socket）bind 到容器標準 socket，mode `ro`。用途為收集 Docker logs 送 Logflare。`ro` 不限制透過 socket 送出的 API；V-B 會把高權限 daemon control surface交给 image，需另審，不能默認。

Foundation 20項 security/concurrency tests 的必要對象是 DB／Auth／controlled operations，不依賴 Vector log aggregation。Source 在兩 service gates 關閉時略過 image plan／start／health watch；Studio 的 analytics-enabled UI 行為也須使用同一 false。一般 Docker logs／CLI evidence 不因此變成 Vector 必要性。未跑 tests，不宣稱 runtime regression PASS。

驗收：effective analytics false、Vector／Logflare expected count 0、任何 container無 Docker socket bind／daemon TCP credential、無 BigQuery exporter。59327 繼續保留、檢查 collision，但不得有 analytics listener；其餘十項 port reservation不變。這是縮小未來 profile 的可行選擇，非更改 Foundation schema／test scope。

### SC-08. Host writer closure

**HOST WRITER SET SUFFICIENTLY CLOSED，限已界定的 fixed native start profile 與直接／固定 dependency-mediated CLI host writes。** 不聲稱第三方 runtime 永遠沒有未知 bug，亦不把 Docker container filesystem writes算作 CLI host writes。Required profile：fresh approved PG major、project SQL/workloads absent、pg-delta disabled、analytics disabled、telemetry/trace/notifier disabled、官方 standalone binary，不使用 package manager／development source launcher。

| Writer / source | Operations / zone | Reachability / bounded contract |
|---|---|---|
| S07 SQL staging＋CE-04 FileSystem | mkdtemp、writeFile、scoped recursive rm；OS-temp | fresh setup；prefix `supabase-start-db-setup-`，API effective parent 另驗；umask 077及owner-only parent；不得讀staged SQL/secret |
| S07 branch marker | mkdir＋writeFile `.branches/_current_branch`；workdir | intrinsic metadata，原mode0644仍受umask限制；只保存path/mode/assertion |
| S09 Edge staging | rm舊deterministic staging、mkdir、writeFile；`.temp/start-secrets` | enabled Edge bootstrap；docker.env／multiline／serve-main分類及0600/0700界限；不把 intrinsic rm當operator cleanup授權 |
| S04 secret delivery | memory archive→Docker cp；Docker storage | 不新增host bootstrap raw file；stdin/payload不得tee或紀錄 |
| S16／CE-07 legacy telemetry | mkdir、writeFile telemetry.json；Supabase home | transmission off仍可寫；root0700及umask077，檔案不可納入evidence |
| S17 shared identity/consent | mkdir、temporary write＋rename；Supabase home | consent/identity分支；同一root policy，即使分支不可達也不可混成全系統home承諾 |
| S17 NDJSON exporter | append、trace directory／retention removal；Supabase home | consent denied時不可達；debug也禁用 |
| S18 notifier | mkdir、open/write cache；`.temp/cli-latest` | ambient禁用early-return；不得為research呼叫latest notifier |
| S15 pg-delta cache／auxiliary | catalog write、mkdir、retention remove、package/cache／archive相關分支 | 全部不可達；cacheEnabled所有支點須驗，不以USE_PG_DELTA_NEXT=false替代 |
| S19／start-secret cleanup | stage-path rm與Docker資產處置 | 只依既有compound rollback界限；不是host完整restore |
| Studio／Edge／template bind parents | Docker可能mkdir source；daemon-mediated host bind side-effects | approved workdir內path＋mode，禁止外部／個人home；不存在target只能由已授權writer建立 |
| Docker image/layer/container/volume/network | create、extract、copy、cache、log；daemon storage | 單一核准local daemon；不可假稱session-contained或一般stop可還原 |
| Profile save／Auth login／repo init／migration writer／build-binary | write/copy/extract | 不在此native start command；只read profile metadata，不執行save／installer／build |

CE-04 固定 beta.107 的 BunFileSystem直接提供 NodeFileSystem.layer；其 temp factory 使用 explicit directory，否則 OS.tmpdir()，再 NFS.mkdtemp；scoped finalizer NFS.rm。此閉包可支援 path/permission/finalizer contract，不再要求先執行 start 才研究 temp。Bun 官方 compatibility與固定binary來源是residual vendor trust，不冒充已驗證installed Bun完全等價；API parent解析需隨 SB evidence固定，未知或衝突時 pre-start FAIL。

本輪搜查 writeFile／append／mkdir／mkdtemp／rename／chmod／rm／copy／archive／cache 的結果是上表分類，不代表呼叫它們。無核准的 external/global host writer。Kernel／Docker Desktop自身診斷檔屬平台既有runtime信任邊界，不可拿它們擴張CLI任意host寫入。新增reachable writer或改用dev/npm launcher使此 closure失效。

### SC-09. Supabase home closure

**ISOLATED SUPABASE HOME CONTRACT：成立；actual root／permissions 待6B。** S16 resolver採非空trimmed SUPABASE_HOME，否則 `<homeDir>/.supabase`；shared CLI config、legacy profile與legacy telemetry使用此resolver。推薦只指定child-process SUPABASE_HOME到核准專用root，不改系統HOME；不接受相對path／空白修復。Child environment中的值必須在root-layer建立之前生效，不倚賴project dotenv補設。

| Class | Disposition |
|---|---|
| Redirectable writers | legacy telemetry.json、shared telemetry atomic temp/rename；traces若開啟也在此root，但本profile禁止 |
| Nonredirectable by SUPABASE_HOME | `.temp/cli-latest`、Edge staging、OS-temp、daemon storage；各自用workdir／temp／daemon contract，不聲稱一個env管全部 |
| Read-only files | profile／link/version metadata的存在與來源；新home不帶既有credential；unexpected private file只報存在後拒絕 |
| Residual real-home writes | 本native profile沒有已確認必需writer；若metadata指出fallback至個人home，禁止start，不以「可能」授權 |

HOME只作fallback解析來源，XDG_CONFIG_HOME／XDG_CACHE_HOME不是這個Supabase resolver的替代root；不可把它們設了就宣稱完成隔離。Docker config／credential helper屬client分支，不能由SUPABASE_HOME覆蓋。新root權限、effective解析值與所有reader來源都要由H-08/09/11核對；失敗不允許fallback到real home。傳輸disabled不代表沒有state write。

### SC-10. Effective input reader-equivalence

**START EFFECTIVE INPUT CLOSURE：在下面的收斂profile下契約成立，待deterministic helper實作。** 不重現任意Supabase config組合；只接受一個核准literal TOML子集、明確flags、固定defaults及封閉child-env。Parser不得執行source module／CLI status來取effective值（那些入口可能寫home）；只能移植已審pure decoder／resolver語意並用合成metadata驗證。

一项原研究事實訂正：Sections 5／28 的「project dotenv會把Docker-client keys寫入process.env」過度概括。S14 `legacy-local-project-context.ts` L119–163只特別安裝 BITBUCKET_CLONE_DIR；明確不安裝 DOCKER_HOST／DOCKER_CONTEXT／DOCKER_CONFIG及SUPABASE_SERVICES_HOSTNAME。這些使用ambient client／hostname path；registry/config則可讀projectEnvValues。保留禁止所有dotenv及BITBUCKET_CLONE_DIR的安全政策，但修正reader事實，不改normative。

Input universe：工作目錄/ancestor探索、TOML與可能JSON差異、root及supabase dotenv系列、CLI flags、ambient及env(...)、Supabase home、Docker context/config/credential-helper/proxy、version pins/link/remotes、image metadata、OS temp/home、compiled defaults、runtime/module loader inputs。Gate6B不能只驗自己生成的TOML。

封閉profile拒絕：所有dotenv來源、remotes／linked metadata、未核准pins、env(...)及encrypted輸入、backup、schema/roles/seed/vault/buckets/functions/imports、自訂TLS檔案/hooks/providers/SMTP、unknownflags/keys、runtime preload、cloud/remotecredentials、project-onlyDocker overrides。配置省略與explicit false分開；用false、empty collection及absent file assertions共同排除。S14 primary與DB二次reader在此子集的輸出須相等；拒絕缺欄位、duplicatekeys、解析差異、寬鬆fallback，不能忽略未知reader。

Helper輸出schema：reader ID＋source fingerprint、input-set metadata/hash（nonsecret）、key、origin/default/explicit狀態、resolved nonsecret value／secret policy classification、downstream consumer、equality result。對 secret只比可用性／來源／scope，不持久化value或hash；no side-effect import、no SQL、no network config expansion。Implementation review須提供每個下面precedence row的positive/negative cases及完整consumer coverage，未實作不等於static契約不成立。

### SC-11. Input precedence and consumer matrix

共同dotenv precedence（S14）：ambient優先，其後supabase目錄，再project root；每目錄按 `.env.<env>.local`、`.env.local`（test除外）、`.env.<env>`、`.env` first-set-wins。Environment缺省development。`legacyEnvOverride`非空override優先config，支援env(...)；DB reader亦處理同來源但有自己的load/validation。matched remotes可高於env，故本profile**完全排除**remotes，不宣稱全域env永遠最高。

| Safety field | Fixed reader precedence / consumer | Frozen input / equivalence rule |
|---|---|---|
| Workdir | explicit `--workdir` → ambient SUPABASE_WORKDIR → cwd/ancestor fallback；root telemetry另讀env/cwd | explicit workdir、process cwd與核准root一致；禁止不同fallback；不向Repository尋config |
| Project ID | nonempty SUPABASE_PROJECT_ID → config project_id → basename；start無project-refflag；之後sanitize | 只允許config的35byte exact P；envoverride absent，basename不得被使用 |
| DB/Shadow ports | DB/config reader的field-specific envoverride → TOML → compiled defaults | 明列59322/59320，兩reader一致；不接受預設543xx |
| Service ports | main values與start handler逐欄env→TOML→defaults | 十項reservation固定；disabled service無listener，不能將reservation當enabled |
| Network | changed --network-id（含empty）→ SUPABASE_NETWORK_ID → generated P network | 無override，generated N；reject special mode與empty explicitflag，不靠normalize |
| Service hostname | ambient SUPABASE_SERVICES_HOSTNAME → runtime default | 與localtarget政策一致；project-onlydotenv不會安裝，不能當有效override |
| Image/version | effective major/Deno/OrioleDB＋`.temp/*-version` pin，再registry/cache resolver | 核准branch/defaults；no importedpins/OrioleDB；approveddigest對應每個可能cachecandidate |
| Migrations/seed/schema | 各自env/TOML/default；experimental schema path獨立 | false/false/empty；roles.sql absent；不合併成一個switch |
| Vault | resolved vault entries，fresh setup先於roles | empty、無env expansion，不能只關seed |
| Functions | resolved functions subtree＋filesystem、import/map/entrypoint；Studio也解析binds | empty workload及目錄allowlist；intrinsic Edge模板另列，不把兩者混為一談 |
| Storage bucket seed | effective storage/buckets/vector＋filesystem inputs | empty bucket/seed set，vector/storageanalytics禁external；不得被db.seed覆蓋 |
| Analytics/Vector | SUPABASE_ANALYTICS_ENABLED→TOML→default；各自exclude | SC-07 false；相應Studio setting一致；no socket |
| Auth providers/hooks | field-specific overrides＋raw-section presence＋defaults；部分built-inproviders可被env啟用 | 不只數TOMLentries；all effective enabled flags false，customURL/secret inputs absent |
| SMTP/SMS | local capture mail與Auth external SMTP為不同reader；optional-section gate＋override | local-only Mailpit可核准；external SMTP/SMS disabled／absent |
| pg-delta | version空＋toml.pgDelta.enabled或SUPABASE_EXPERIMENTAL_PG_DELTA；implementation選擇不是disable | 所有enable false、schema_paths empty；no aux cache/jobs |
| Telemetry | root effectiveenv flags disabled=1／DO_NOT_TRACK=1 → savedconsent | ambient前置固定，denied；local state仍可寫；debugoff |
| Notifier | early ambient NO_UPDATE_NOTIFIER，再projecteffective值 | ambient1，earlyreturn；不讀寫notifiercache |
| Docker context/host | Docker client自己的flag/env/context precedence；不是Supabase TOML優先序 | exactlocalcontext/endpoint；所有override來源明列；no Podmanfallback |
| Proxies/CA/registryauth | CLIchildenv、daemon設定、Docker config/credentialhelper分流 | 不繼承未審proxy/CA/credentials；cache-only避免把credentialhelper當默許外連 |
| Temp/home | Effect explicitdir或OS.tmpdir；SUPABASE_HOME resolver；root/method-time讀取 | 初始childenv固定，no dotenv；專用parent與mode；HOME不重設 |
| CLI defaults/runtime | fixedversion decoder/templates與standalonebundle；不得用floatingpackage launcher | 固定source/binary/schema版本；不接受Bun/nodepreload或devauto-install |

在封閉profile內沒有未指定的安全input precedence；未知設定或新reader不是runtime自動接受，而是H-08 completeness failure。這個結論不是宣稱已完成helper或已讀actualconfig。

### SC-12. Egress trust layers

| Layer | Recommended policy | Residual / evidence |
|---|---|---|
| 1 CLI/control plane＋daemon registry | cache-only；telemetry/notifieroff；不允許registry pull、credential-helper外連或未知proxy | cache需要另備；S-06內CLI仍有pull能力，不能冒稱已有no-pullflag；排他window與resolver證明必須成立 |
| 2 Platform services | local DB/network/mail targets；externalAuth/hooks/providers/SMS/cloud/exporters disabled | 信任approvedimage在核准inputs下行為；不聲稱bridge是硬性egress防火牆 |
| 3 User workload | 無functions/imports/package下载/usercallbacks/projectSQL | intrinsic Edge模板不是userworkload；不開新功能或藉workload補evidence |

目的不是證明image永遠不可能發封包，而是封閉已知可配置外連、沒有真實資料/remotecredentials，並明確接受受控供應商image residual risk。若要求強制deny-all network，需要獨立network安全設計，不能把此contract偽裝成已部署firewall。Remote Supabase／Production不在任何layer的allowlist。

### SC-13. Registry recommendation

**推薦 pre-cached approved digest only。** 最符合可重現性、無registrycredentials及本次學生專題的操作負擔；先準備一次可審cache，再做隔離Spike。Approved registry pull在操作便利性較好，但多了auth/CDN/proxy/redirect、cachemutation及intrinsicretry面向，本輪不推薦納入S-06。任一所需image未cached時停止；Image Preparation必須另行取得state-changing授權，不能藏在preflight。

Source S12沒有總no-pull開關：resolver先查ECR/GHCR/DockerHub candidates再pull。因此契約必須在pre-start與6B核對**每個角色/短命job**實際會選到的第一cachedcandidate、approveddigest/platform/config，維持單一操作者的daemon/cache穩定窗口；有更高優先未審cachedcandidate也FAIL。不可藉tag覆寫或刪image讓它選對。cacheeviction／resolver fallback／unexpectedpull使本次執行超出批准模型，禁止把它當正常retry；不承諾外層wrapper可原子攔截所有daemon行為。

這個策略接受受控本機daemon／無惡意同權限並行修改的前提；若該前提不能成立，必須在Gate5前選擇另行受控registry策略或停止，不能事後測一次。來源查核／image獲取與其驗證各自有獨立權限。

### SC-14. Service egress closure

以下是 proposed Foundation profile 的 contract分類，不是actualenv已確認。只有Gate6B已核对时才可把「DISABLED BY FROZEN CONFIG」用作實例PASS。

| Service/branch | Contract classification | Required condition |
|---|---|---|
| PG／pooler／PG Meta／REST | LOCAL-ONLY for configured DB targets | 本次N及localDB；no remote DB/address/configoverride；SQL-C禁止 |
| Kong | LOCAL-ONLY upstreams | upstreams限本次services；no external proxy/authtemplate/servicehostname override |
| Auth main／migration | LOCAL-ONLY DB；external providers/hooks = DISABLED BY FROZEN CONFIG | 對external/third-party/SMS/captcha/emailhooks逐項effective禁用；siteURL/redirect只核准local，無真實Auth E2E |
| Mailpit | LOCAL-ONLY | capturedmail；externalSMTP credentials/provider absent；無真實郵件操作 |
| Storage／Imgproxy | LOCAL-ONLY | file backend與localAPI/DB；禁S3/cloud/bucketseed；任意remote image source/URL未授權，不因內建功能存在而測試 |
| Realtime／bootstrap | LOCAL-ONLY configured DB/tenant | 無externaltenantURL或使用者callbacks |
| Vector／Logflare | DISABLED BY FROZEN CONFIG | analytics=false；no socket／BigQuery／externalexporter |
| Studio | LOCAL-ONLY configured platform endpoints；optional external features disabled | 不設定外部AI key／remoteproject；本gate不打開Studio browser或點擊外部功能 |
| Edge main | LOCAL-ONLY intrinsic bootstrap under approved template | emptyuserfunctions、noimportmap/customentrypoint；官方模板固定，不觸發使用者dependency下載 |
| pg-delta／shadow／aux Edge script | DISABLED BY FROZEN CONFIG | 全enable分支排除 |
| Image內未披露/惡意行為 | UNKNOWN residual vendor risk | 由SC-04明確信任決策承擔，不能宣稱network-zero；不能以此允許已知CONDITIONALLY EXTERNAL分支 |

All known CONDITIONALLY EXTERNAL project/service branches非Foundation必要者推薦disabled。這不是為任何productionendpoint放行，也不要求完整image程式碼鑑識。

### SC-15. Binary correspondence sufficiency

| Option | Judgment |
|---|---|
| SB-1 version string | 不足，任意binary可回報相同version |
| SB-2 version＋exactbinaryhash＋officialpackage/release metadata | 本Foundation最低可條件接受；要能將installed artifact連回release，而不只是抄一個版本號 |
| SB-3 publishedchecksum/signature matching | 推薦有checksum時採用；publicchecksum存在不代表signature已驗證 |
| SB-4 reproducible source equivalence | 非本feasibility最小要求；不拿缺少reproduciblebuild永遠卡住Gate5 |

CE-08已確認官方v2.115.0有checksums.txt。Darwin arm64 archive SHA-256為`5b25574efd0a67905073085783da3659737d237e5137e3adfe1a9858e94f40dc`；Darwin amd64為`0ef10f633c72ea14be92ccd2905af1a92472dfc1e7518e04e887bfca0b45b851`。這兩個是archive hashes，**不能**拿來與Section3的installedbinaryhash直接比較。本輪未下載releasebinary、未執行version、未核對archive member與installed檔案；也未聲稱存在已驗證vendor signature。

推薦分類：**PARTIAL BUT ACCEPTABLE WITH FROZEN HASH**，是對契約充分性的條件判定，不是Gate5已接受本機binary。有限instance要求為：唯讀解析release/package provenance及platform、驗archive checksum、在不執行的前提辨識exact member及其SHA-256、與installedbinary byte hash比對、固定shim/entrypoint/依賴身份、排除其他版本fallback。若安裝形式不是該archive，須提供相應官方package對應鏈，不猜測。

Source-to-binary仍PARTIAL；供應商／建置pipeline信任和runtimebug是explicit residual risk。此工作可由read-only package/archive/hash evidence完成，無須Environment Start；不足時屬該instance Gate5 blocker，不再列architecture static failure。

### SC-16. Static / local / runtime reclassification

每列只屬一個phase分類；同一舊G若含多層問題則拆子列，不把所有未執行項目都稱TRUE BLOCKER。

| Old gap / bounded item | Current classification | Closure / remaining work |
|---|---|---|
| G-01 volume model / no-label inheritance | STATICALLY CLOSED | SC-02/03：每declared destination覆蓋，uncovered拒絕；不假造noanonymous事實 |
| G-01 selected image config actual values | NEEDS READ-ONLY PRE-START LOCAL EVIDENCE | digest/config/declared destinations查核；若cache不存在先另授權準備 |
| G-02 evidence policy for already-removed jobs | STATICALLY CLOSED | SC-05/06：pre-authorized role／safe events／persistent post-state 分層；不要求不存在的 inspect，不改 runtime set 邊界 |
| G-02 observer implementation | NEEDS HELPER IMPLEMENTATION | SC-06 contract；缺事件或歧義 FAIL，source-derived 與 actual 欄位分離 |
| G-03 image/runtime trust policy | STATICALLY CLOSED | C最低provenance＋explicitresidual，不要求全image可重現 |
| G-03 approvedimage/cache/platform records | NEEDS READ-ONLY PRE-START LOCAL EVIDENCE | 每role含jobs及resolvercandidate順序 |
| G-04 socket model / V-A recommendation | STATICALLY CLOSED | source可disable；Gate5需接受推薦profile |
| G-04 effective analytics=false / no socket planned | NEEDS GATE-6B MATERIALIZED CONFIG EVIDENCE | 不以research建議冒充actualconfig |
| G-05 host writer categories / resolver model | STATICALLY CLOSED | SC-08/09 fixeddependency，boundedvendortrust |
| G-05 actual parent/home/permission metadata | NEEDS GATE-6B MATERIALIZED CONFIG EVIDENCE | H-11逐writer核對；若實際回到realhome拒絕 |
| G-06 allowed input/precedence subset | STATICALLY CLOSED | SC-10/11，訂正Docker-client dotenv概括錯誤 |
| G-06 decoder/equality implementation | NEEDS HELPER IMPLEMENTATION | fixedreader移植＋合成metadata測試，不呼叫CLI |
| G-06 actual inputs and no SQL-C | NEEDS GATE-6B MATERIALIZED CONFIG EVIDENCE | 所有來源與consumer，不能只讀生成的TOML |
| G-07 binary sufficiency policy | STATICALLY CLOSED | SB-2 minimum／SB-3 preferred，保留partialsourcecorrespondence |
| G-07 installed package/archive/hash match | NEEDS READ-ONLY PRE-START LOCAL EVIDENCE | 未執行，有限明確requirement |
| G-08 daemon/context/HostIP/collision/cache/exclusivewindow | NEEDS READ-ONLY PRE-START LOCAL EVIDENCE | contracts仍有效；不是新static研究理由 |
| G-08 actual resource IDs/graph/health/portbindings | POST-START ONLY | expectedconstraints須先凍結；runtime不能決定自己的allowlist |
| G-09 parsers/redactor/writer/launcher | NEEDS HELPER IMPLEMENTATION | sourceimplementation不等於executionpermission |

### SC-17. Revised helper matrix and comparator amendments

各helper仍只為requirements，不產生script或checksum。RO＝inspection／memory-only；SC＝STATE-CHANGING。Secret欄是潛在輸入風險，不表示本輪讀取過secret。

| Helper | Purpose / input → output | Class / phase | Secret risk / necessity |
|---|---|---|---|
| H-01 | client/context/daemon metadata→targetidentity | RO / pre-start,6B | endpoint/config可能敏感；REQUIRED |
| H-02 | fullinventory/baseline→candidate/delta集合 | RO / pre-start,7 | unknownlabel不得dump；REQUIRED |
| H-03 | boundedallowlistedcaptures→typedper-resource records | RO / allinspection | 原始projection可能惡意；REQUIRED |
| H-04 | expectedrolegraph＋actualedges→relationshipassertions | RO /7 | names/paths只保留必要欄位；REQUIRED |
| H-05 | daemonpolicy/porttuples→HostIP/mapping結果 | RO /pre-start,6B,7 | 不讀configcredentials；REQUIRED |
| H-06 | pathmetadata＋approvedroots→canonicalcontainment | RO /pre-start,6B,7 | userpath需token化；REQUIRED |
| H-07 | approvedmanifest＋imageConfig/cache→identity/volumecoverage | RO /pre-start,7 | Env/Cmd禁raw落盤；REQUIRED；不pull |
| H-08 | literalconfig＋fixedreaders→effectiveinputs/equality | RO /6B | noexec/noimports/secret政策而非值；REQUIRED |
| H-09 | approvedchildenv＋sourcecategories→presence/policymatch | RO /pre-start,6B | highrisk，禁止envdump；REQUIRED |
| H-10 | filemetadata/branchplan→SQL-C/auxexclusion | RO /6B | unexpectedsecret-capable檔只報存在；REQUIRED |
| H-11 | writercatalog＋actualparent/mode→zoneassertions | RO /pre-start,6B | 不讀privatefilecontents；REQUIRED |
| H-12 | in-memoryrecords→sanitizedrecords/failure | RO /evidencepipeline | highestredactionrisk；REQUIRED；不自動寫檔 |
| H-13 | frozenacceptance＋freshmetadata→drift | RO /6B,7,pre-stop | identity不得redact成假相等；REQUIRED |
| H-14 | read-onlyevents＋roleplan→ephemeralledger/limitations | RO /S-06window | allattributes需projection；REQUIRED for A+C；不作 full runtime inspect 替身 |
| H-15 | approvedcontract＋6B→一次S-06受控invocation | SC /6C | childstdout/stderr可能secret；REQUIRED；source可另授權實作，執行另授權 |
| H-16 | sanitizedrecord＋exactwritescope→newartifact/checksum | SC /S-12 | 只接收已過redaction的record；REQUIRED；不隱含materialize session |
| H-17 | source/digest/risk→humantrustdecision | MANUAL /Gate5前 | 不讀credential；可人工完成，不另做工具 |
| H-18 | actualIDs/health→runtimefacts | RUNTIME /7 | 由H-01–07收集；不是第18個helperimplementation |

不新增cleanuphelper、不將configwriter混進inspection；6A configwriter若後續需要，仍是獨立STATE-CHANGING scope。Helper implementation gate即使通過，禁止自動執行H-15/16。

下表只補正本輪直接涉及的comparators；其餘RA-v2/C IDs不重設、不改Runbook C-01–05：

| RA-v2 rule | Amendment / status |
|---|---|
| C-04 / C-07 / C-08 | image-declared targets加入expectedcoverage；匿名volume逐consumer查；uncovered/no-label不可接受；Vector socket expected absent |
| C-10 | SC-03 selectedConfig＋Cprovenance minimum；imagebaseline与CLIoverride分離，不用eventreference代digest |
| C-11 / C-12 | persistentcounts與ephemeralrole/events兩層；observed/source-derived欄不得混用；正常移除 job 不加入 verified runtime set；缺事件、未知角色、orphan、歧義或副作用不符 FAIL |
| C-15 / C-16 / C-17 | SC-10/11封閉輸入及多reader等價；Dockerclient不採project-onlydotenv安裝假設；未知來源拒絕 |
| C-18 | 接受target前的binary/sourcepolicy用SB-2/3證據，不要求SB-4；仍不將hash等同sourceequivalence |
| C-19 | SC-08/09有限writercatalog、temp/home per-writer範圍與mode，值留instance填 |
| C-20 | 三層egress、cache-only、analyticsdisabled、無userworkload；不聲稱硬網路隔離 |

### SC-18. Revised CT-01–20 readiness

Normative原五態registry不變。本表另列 **DESIGN READINESS** 与 **INSTANCE EVIDENCE READINESS**；不把CONTRACT ESTABLISHED寫回Runbook的ESTABLISHED/PASS，不把未執行測試視為已通過。必要Human profile/trust approval仍於Gate5明確取得。

| CT | Design readiness | Instance evidence / next finite task |
|---|---|---|
| CT-01 binary/source | CONTRACT ESTABLISHED | officialpackage/archive↔installedhash唯讀match待做；sourcecorrespondence仍partial |
| CT-02 daemon target | CONTRACT ESTABLISHED | client/context/daemon/locality/policy未盤點 |
| CT-03 writer/materialization | CONTRACT ESTABLISHED | helper實作及6A/6B另授權；未生成config |
| CT-04 fresh/collision | CONTRACT ESTABLISHED | 全daemonmetadata/history/ports absence未盤點 |
| CT-05 platform SQL-A / SQL-B | CONTRACT ESTABLISHED | fresh/major/enabled predicates待6B；SQL-A job取證完整性另受CT19制約 |
| CT-06 SQL-C/D exclusion | CONTRACT ESTABLISHED | H-08/10實作與actualfiles/effectiveinput待6B |
| CT-07 image trust | CONTRACT ESTABLISHED | approveddigest/config/cache/platform/declaredtargets未填；uncovered則拒絕instance |
| CT-08 notifier | CONTRACT ESTABLISHED | initialambientearlydisable待6B |
| CT-09 telemetry/home | CONTRACT ESTABLISHED | samehome、deniedconsent、statepermissions待6B |
| CT-10 OS-temp | CONTRACT ESTABLISHED | fixedruntime/APIparent、permission與prefix驗證待6B |
| CT-11 `.temp` | CONTRACT ESTABLISHED | intrinsicfileallowlist、noexternalpins/input待6B |
| CT-12 Edge | CONTRACT ESTABLISHED | approvedintrinsictemplate/Config、emptyworkload待6B/7 |
| CT-13 pg-delta | CONTRACT ESTABLISHED | everyenablebranchfalse與noauxinputs待6B |
| CT-14 ports/HostIP | CONTRACT ESTABLISHED | pre-startloopbackpolicy證據未收集；不可只等Gate7 |
| CT-15 network/egress | CONTRACT ESTABLISHED | V-A/profile/risk人審、localpolicy與actualgraph待做 |
| CT-16 intrinsic rollback | CONTRACT ESTABLISHED | pre-stateforeigncollision/exclusivewindow未證；runtimefailure證據只有事後可觀測 |
| CT-17 intrinsic retry | CONTRACT ESTABLISHED | cache-onlyresolvercoverage/helperguard未實作；operatorretry仍禁 |
| CT-18 safe evidence | CONTRACT ESTABLISHED | projection/redactor/writer未實作、未測試、未freezehash；無executionPASS |
| CT-19 resource acceptance | CONTRACT ESTABLISHED | persistent逐資產驗收＋ephemeral role ledger；source-derived 不冒稱 full actual snapshot；implementation與instance證據未完成 |
| CT-20 helper readiness | CONTRACT ESTABLISHED | helpers/checksums/tests全部未實作；H-14/C-11/12遵循SC-05/06分層契約 |

20/20映射；20列設計契約已建立，零列可作runtimePASS。CT-19的有限事件證據不等於所有短命資產的完整inspect；CT-20仍需真正實作、review與合成metadata測試。這比原「18 partial＋2 not established」更精確，但沒有改normative狀態registry。

### SC-19. Remaining true blocker / anti-loop disposition

**Remaining true static/normative blockers：0；execution-readiness 尚未成立。**

最後對照後撤銷研究過程暫列的 N-01：不能把 Design 4.3／Runbook 6 對 observed runtime candidates 的完整驗收，延伸成「已由 --rm 移除的 job 必须事後 inspect」。本輪 Track 2 明確允許事前核准 ephemeral role、Gate 7 驗證 persistent/post-state 的 Model A。SC-05/06 在此模型加上有限 safe event ledger，並未給 persistent missing-label 例外，也未把 disappeared job 冒充 verified runtime resource。故不需為這個過度延伸的要求修改 normative。

| Remaining finite requirement | Disposition / next gate |
|---|---|
| Helpers、typed parsers、redactor、event coverage、comparators 的實作與合成metadata測試 | NEEDS HELPER IMPLEMENTATION；只可在新明確授權範圍內建立，review完成不等於執行 |
| Binary/archive、image digest/Config/Volumes/cache、daemon/context、HostIP、collision證據 | NEEDS READ-ONLY PRE-START LOCAL EVIDENCE；沒有實際值不是static failure |
| Fresh identity、exact config、child environment、home/temp permissions及SQL-C exclusion | NEEDS GATE-6B MATERIALIZED CONFIG EVIDENCE；6A寫入另授權，6B不得自行補檔 |
| Resource IDs／actualgraph／health／eventledger／remaining-disappeared states | POST-START ONLY；期望約束必須先凍結，不得倒填 |
| Profile／image supply trust與短命source-derived限制的明示接受 | Gate 5 human acceptance，依已建立contract審具體instance；不隱含Environment Start授權 |

Anonymousvolume、digest、HostIP、binarymatch、temppermissions等均有明確拒絕條件。若instance事實證明不可避免未標記volume、無法建立可靠事件coverage或其他契約不能達成，按既有fail-closed處理；不能先核准例外，也不能把這些未測事實寫成已PASS。

本輪不修改Design／Runbook／Correction。下一工作包只能是 **Helper Implementation / Pre-start Instance Evidence Closure**，不得再開一般性Resource Acceptance research；實際開始仍需新的明確授權，不執行任何Runbook命令。

### SC-20. Final closure classification and authorization

**A — STATIC EVIDENCE CLOSURE PASS — READY FOR HELPER IMPLEMENTATION / PRE-START INSTANCE EVIDENCE。**

核心問題答案：**安全模型的有限契約已足以開始下一個獨立授權的helper implementation／pre-start evidence工作包；目前不能start。** 七條tracks均已形成有限contract；helper細節與local/materialized/runtime事實依SC-16/18等待各自授權。此A是static設計充分性，不是20項runtime evidence已PASS，也不是所有供應商程式行為已證明。

只有本轮指定的baseline、protected fingerprints、scope、links、whitespace、secret scan及Git驗證全PASS，才可依明確授權將原Research v2與本Addendum作單檔local checkpoint：`docs: close resource acceptance static evidence`。不push。Gate5仍BLOCKED；SC-07／SC-13的推薦不等於已批准config/image preparation。

| Boundary | Final state |
|---|---|
| Normative Correction | COMPLETED LOCALLY；本輪未修改 |
| Static Evidence Closure | COMPLETED — A；static contracts established，非execution PASS |
| Gate 5 | BLOCKED |
| Helper Implementation | NOT YET AUTHORIZED |
| Pre-start instance inspection | NOT YET EXECUTED |
| Gate 6A / Gate 6C | NOT AUTHORIZED / NOT AUTHORIZED |
| Environment Start | NOT AUTHORIZED |
| SQL / Migration execution | NOT AUTHORIZED |
| Spike | NOT YET ENTERED |
| Remote Supabase / Production | NOT AUTHORIZED |
| Push | NOT PERFORMED |

Static validation record：原561行／66,864 bytes prefix SHA-256完全相同；三份normative fingerprints符合SC-01基線；21份tracked protected documents/migrations與HEAD逐byte相同，其中Migration 001–008為8/8。SC-01–20、CT-01–20、H-01–18各自ID唯一；SC-16有18個phase分類子項。3個本機Markdown links存在，61個distinct external URLs均對應已取得的43個固定CLI sources及18個官方文件／固定Moby source／dependency archive／release來源。Whitespace、EOF newline、private key／token／credential URL／敏感值及實際本機使用者絕對路徑掃描通過；`parent/home/permission`只為概念標籤，不是使用者path。未讀private logs、環境credential或Docker assets；stage前目標是唯一untracked change、staged 0、`git diff --check`通過。

依上述條件完成單檔local checkpoint及post-commit Git驗證後STOP；不得執行本文件描述的任何environment、event observer、materialization或helper操作。若任一最終scope／fingerprint驗證不符，停止而不commit，不自行修復其他檔案。

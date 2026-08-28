# WinWin Foundation Environment Start Intrinsic Side-Effects Correction

> Documentation correction only — no Environment Start, SQL, Auth, Spike, Docker mutation or push authorization.
>
> 本artifact區分已接受的source findings、此次normative choices與尚待證明的execution readiness。它不是runtime evidence，不宣稱已完成新Human approval。只有三檔static review與mechanical validation全PASS，才可依本次明確授權建立local checkpoint。

## 1. Purpose

把Environment Start由「建立Docker資產且不做SQL／外部寫入」修正為有精確邊界的compound CLI operation。安全目標不放寬：拒絕未知branch、Remote Supabase／Production、未授權project SQL、operator retry／cleanup及scope擴張；但不再以與CLI真實行為衝突的絕對句子作為安全保證。

唯一文件集合為本artifact、[Normative Design](WINWIN_FOUNDATION_SECURITY_CONCURRENCY_FEASIBILITY_SPIKE_DESIGN.md)及[Runbook](WINWIN_FOUNDATION_ENVIRONMENT_START_SPIKE_EXECUTION_RUNBOOK_DRAFT.md)。不修改Migration、產品模型或其他文件，不建立任何execution script／config／evidence。

## 2. Source authority

Normative authority仍為Design；Runbook是其操作程序。此次source事實來自已完成且operator接受A判定的Supabase CLI 2.115.0 Start Intrinsic Side-Effects Boundary Research，未重新啟動研究或環境。以下是既有研究的可追溯primary source定位，不是本輪新增runtime驗證：

| Reference | Fixed source／scope | Supports |
|---|---|---|
| SRC-01 | [CLI source tree, pinned commit](https://github.com/supabase/cli/tree/18ae43a34a2257458197b62f74e2a97e2b5cf7f9) | 2.115.0研究使用的固定tree；不是floating main |
| SRC-02 | [Native legacy start handler](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/commands/start/start.handler.ts) | start branches、fresh/existing、health/status、failure flow |
| SRC-03 | [DB setup](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/shared/db-bootstrap/db-setup.ts) | intrinsic platform setup／SQL staging |
| SRC-04 | [Migrate and seed](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/shared/legacy-migrate-and-seed.ts) | project migration／seed分支，不可混作platform |
| SRC-05 | [Docker rollback removal](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/shared/legacy-docker-remove-all.ts) | label-selected stop/prune及條件式volume處置 |
| SRC-06 | [Image resolution](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/shared/legacy-docker-image-resolve.ts) | cache／pull／retry；registry policy仍需contract |
| SRC-07 | [Telemetry state](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/telemetry/legacy-telemetry-state.layer.ts) | disabled不等於沒有home state write |
| SRC-08 | [Update notifier](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/shared/legacy-upgrade-notice.ts) | post-success request/cache與disabled機制 |
| SRC-09 | [Optional pgdelta](https://github.com/supabase/cli/blob/18ae43a34a2257458197b62f74e2a97e2b5cf7f9/apps/cli/src/legacy/shared/legacy-pgdelta.ts) | auxiliary container、host network／ephemeral port、package/cache/CA分支 |

其他已研究的source定位同屬SRC-01 tree：`apps/cli/src/shared/cli/run.ts`、`apps/cli/src/shared/functions/serve.ts`、`apps/cli/src/shared/telemetry/exporters/ndjson.ts`；`apps/cli/src/legacy/shared/db-bootstrap/`下的`start-database.ts`及`container-lifecycle.ts`；`apps/cli/src/legacy/shared/`下的`legacy-docker-registry.ts`、`legacy-seed-buckets.ts`、`legacy-start-secrets-cleanup.ts`、`legacy-edge-runtime-script.layer.ts`與`legacy-service-version-overrides.ts`。Scoped temp dependency為已研究的Effect `4.0.0-beta.107`、`@effect/platform-node-shared/src/NodeFileSystem.ts`；保留dependency版本，不能把CLI wrapper沒有指定directory誤解為session-contained。本輪只核對既有pinned source links可達性，未擴張start研究。

Source correspondence狀態仍 **PARTIAL**：已知version/tag/source mapping與installed binary fingerprint，不具reproducible-build等價證明。先前研究記錄的binary SHA-256為`06179215a136f183ed24841e177e605fe15bf3e1ac1b6edac8312da71e835014`，本輪未重新執行CLI或補造binary provenance。Gate 5 CT-01必須獨立解決。Source位置與行為引用不等於將其函式核准為WinWin byte-level reuse。

## 3. Old assumptions invalidated

| Invalid old assumption | Corrected statement |
|---|---|
| start只是Docker create/start | 是Docker、DB、filesystem、images、network、metadata與failure handling的compound operation |
| Environment Start完全不執行SQL | 可以僅在精確授權內執行platform SQL-A；SQL-B條件式，SQL-C／D不隱含授權 |
| 所有寫入只在session root | Operator artifacts受session限制；CLI OS-temp、home與Docker storage另有明確四區邊界 |
| `.temp`存在即FAIL | 逐artifact的writer、purpose、permission、secret與lifecycle allowlist；unknown才FAIL |
| telemetry disabled就沒有home write／network | 傳輸、state、traces、notifier及service egress須各自證明 |
| 失敗必然保留完整現場 | CLI可能已rollback/prune；只保留post-return剩餘現場與完整可得的去敏證據 |
| 完全不retry | Operator不得擅自retry；已審CLI pull/backoff/fallback屬一次compound invocation內行為 |
| 10個service ports就是完整network universe | 保留10項mapping，另排除或界定auxiliary／ephemeral與HostIP／egress |
| 只剩resource acceptance缺口 | CT-01至20包括source、daemon、image、home/temp、network/HostIP、inputs及helpers證據 |
| label含compose代表Compose orchestration | Stable legacy start為native Docker CLI；label必須保留，但不是Compose執行證據 |

## 4. Compound Start model

未來精確授權名稱：**AUTHORIZED COMPOUND CLI TRANSACTION**。
S-06分類：**STATE-CHANGING — AUTHORIZED SUPABASE START COMPOUND TRANSACTION**。

AUTHORIZED不是現在已授權；TRANSACTION不是PostgreSQL transaction，不承諾原子成功／失敗或host restoration。允許集合必須在Frozen Gate 5 Compound Transaction Contract逐項列出CLI intrinsic Docker、platform DB、filesystem/temp、image/cache、network、metadata及failure rollback branches。

Source flow可包含root wrapper/config/telemetry → image resolution → Docker network/volume/DB create/start → platform bootstrap → project-input branches（本Foundation必須排除）→ optional auxiliary（預設排除）→ branch marker → services/Edge → health/bucket seed/status → telemetry/update hooks。非所有failure points共用同一rollback範圍；已接受的source研究不構成all-branches-runtime-test。

目前不准start。每個unknown branch不是「CLI自動所以接受」，而是Gate 5 blocker；若根本無法建立bounded model則回報 **BROADER EXECUTION MODEL BLOCKER**，不得硬修allowlist。

## 5. SQL taxonomy

| Category | Source behavior | Foundation policy |
|---|---|---|
| SQL-A | CLI/platform globals、roles、schema、API privileges、service migrations、internal metadata；依PG/platform分支觸發 | Future S-06可逐支核准local bootstrap；不是WinWin authoring或SQL-D permission |
| SQL-B | CONDITIONAL-INTRINSIC existing-volume convergence，例如pg_net/webhooks／metadata；可能mutation而非只read | 此次fresh-only，不reuse歷史volume；必須證明不可達，否則停止 |
| SQL-C | Project migration、roles.sql、experimental declarative schema、seed、vault values等 | 預設NOT AUTHORIZED；逐項absent或provably disabled，單一flag不夠 |
| SQL-D | Spike/test/operator SQL、fixtures、RLS／concurrency experiments | 僅Gate 8後獨立明確授權；S-06及其platform SQL從不授權D |

Fresh/existing在start前凍結。Existing DB不可以被稱為read-only；無法判定branch則不能start。Platform one-shot migration與long-running service是不同branch，不能只看service exclude list就推定SQL-A不存在。SQL-C分類不包含平台自行產生的roles，也不能把使用者roles.sql重新命名為SQL-A。

## 6. Filesystem taxonomy

| Zone | Examples | Required boundary |
|---|---|---|
| Session/workdir | config、operator scripts、sanitized evidence、CLI allowed metadata | realpath、symlink防逃逸、relative allowlist、writer、permissions、retention；raw secret不得持久化 |
| OS-temp | scoped SQL staging | API／effective parent／prefix／file mode／finalizer／crash residue；不能宣稱預設在session |
| Supabase home | state、atomic temp、traces/cache | 每個writer的home解析與transmission分離；未界定為HOME-WRITE CONTAINMENT BLOCKER |
| Docker daemon storage | images/layers/logs/volumes/network metadata | exact local daemon/context、secret storage與cleanup policy；不由session root或一般stop涵蓋 |

`NOT SESSION-CONTAINED BUT EXPLICITLY BOUNDED`只可在具體bounds已被review時使用，不是未知path的豁免。不能改設系統HOME來掩蓋多writer解析差異。Permissions要求須驗證有效結果，不因設定umask就假報所有writer均遵守。

## 7. Docker/image taxonomy

Container create/start、volume create、network attach、image pull/cache mutation與可達auxiliary jobs都須列contract。現有volume reuse不在fresh-only範圍；stopped-stack recovery是collision／branch failure，不自動繼續。

Image contract逐service／job列ref、registry、tag/digest、cached-image acceptance、fallback list、credential-helper行為、retry/deadline與expected daemon。Cached tag不能作digest proof；未知digest/provenance為 **SUPPLY-CHAIN / IMAGE PROVENANCE BLOCKER**。不擷取credentials，不任意清cache或拉image作「驗證」。Native Docker建立的labels／mount／network relations仍需Resource Acceptance Research。

Docker context名稱、endpoint override與actual daemon identity必須一致且local；read-only Docker socket bind不會讓Docker API變唯讀。Bind source不存在時可能建立host directory，`:Z`類relabel可能改host label；必須排除或精確核准，不能假設所有mount沒有host side effect。

## 8. Network taxonomy

Service ports保留59320–59329的原10項mapping及歷史禁止範圍；此處不新增port或產生session ID。每筆需HostIP、protocol、host/container port證據；`-p`沒有HostIP的source pattern不能证明loopback。若實際只能得到wildcard或未證config能收斂，CT-14 BLOCKED，不放寬localhost要求。

分類ALLOWED／DISABLED／CONDITIONAL：registry egress與local service topology須精確核准；telemetry/update transmission預設disabled；SMTP、Auth hooks、GCP/external metadata、Edge imports/dependencies及auxiliary network逐branch排除或另審。Remote Supabase／Production永不在本contract內。Registry允許不代表可以任意下載套件。

pgdelta auxiliary/ephemeral ports不被10項service set隱含允許；預設證明disabled。未知branch或任何unexpected listener／HostIP／remote target均FAIL。

## 9. Retry taxonomy

- Operator retry：第二次start、換ID/port、repair/recreate/reconfigure後續跑，均需新授權，不能自動。
- CLI intrinsic retry：已研究的image pull backoff／registry fallback可位於一次S-06內；contract須列source策略、registry、attempt/deadline semantics。已知4s／8s backoff不等於整個start有總deadline，不能發明不存在的flag。
- SQL-D transaction retry：Test 19A/B/C仍分離，fresh transaction與rollback規則不变，由Gate 8後精確授權；不與image retry共用證據或成功定義。

Caller timeout／signal如何處理必須先review，因為它可能觸發CLI intrinsic cleanup，而不是安全「凍結現場」。本輪不實作launcher或設定timeout。

## 10. Rollback taxonomy

Source已建立CLI intrinsic stop、container prune、conditional volume prune、network prune與temp cleanup分支，非全部failure point都被相同try/finalizer包覆。Rollback可依單一`com.supabase.cli.project`selector掃描all-state assets，不是只刪本次已驗證清單；因此新ID collision、daemon boundary與pre-state evidence不能省略。Intrinsic volume prune使用的API策略與operator禁止`--all`是不同層，不能混淆。

未来S-06只能包含預先review的intrinsic rollback範圍。Operator仍不得manual stop、remove、prune或cleanup；也不能為「保留現場」臨時阻擋CLI finalizer。Rollback可能部分完成或失敗，並不還原image/cache/home/OS-temp；只能以post-return observable記錄remaining／disappeared／unknown，不推測每個資產都成功回復。

## 11. Telemetry/home model

`SUPABASE_TELEMETRY_DISABLED=1`針對傳輸政策，不能证明legacy state flush不存在。Consent/identity、telemetry.json式state、atomic temp/rename、date trace append／prune、effective home resolution須分開列writer。未來若用`SUPABASE_HOME`redirect，須證明每個related writer真正遵守，不以單一路徑觀測替代全體證據。

Update notifier預設 **DISABLED**：source支持`SUPABASE_NO_UPDATE_NOTIFIER=1`的固定版本路徑；仍須核對有效config並排除successful-start後GitHub request／`.temp/cli-latest` cache。Disabled notifier不會停用service egress或image pulls。No home evidence → **HOME-WRITE CONTAINMENT BLOCKER**，而非「telemetry disabled所以PASS」。

## 12. Temp model

OS temp SQL staging使用scoped filesystem API；已研究的prefix包括`supabase-start-db-setup-`與`supabase-start-db-webhooks-`。CLI未指定parent時須追至dependency／OS temp解析，不假設TMPDIR redirect必有效。檔案permission、finalizer recursive cleanup與crash residue均需bounds；不可把含SQL/秘密的staging檔案讀入evidence。

`.temp`分類至少：

- Required/conditional intrinsic：Edge `start-secrets`的env/multiline secrets及main script staging，mode、正常保留與failure best-effort cleanup分開。
- Disabled/forbidden：未核准pgdelta cache、notifier cache、從舊session複製的service-version/link pins或remote linkage；「程式讀取」也不等於無影響。
- Secret-bearing：只保存path class、存在性、size、mode及lifecycle，不讀或複製內容。
- Non-`.temp` intrinsic：`.branches/_current_branch`等獨立metadata列allowlist，不能漏掉。

Container內Kong/PG/pooler等tar/copy設定與daemon logs是另一secret storage zone，不因host output redaction就消失。未來授權必須正面管理其保護／保存／清理，不宣稱start不產生秘密。

## 13. Project-authored input exclusion

| Input | Required pre-start disposition |
|---|---|
| roles.sql | Absent；與seed flag獨立查核 |
| Repository/user migration chain | 不複製；新workdir無未核准migration inputs |
| Declarative schema／experimental branch | 證明disabled及無schema sources，不單靠migration.enabled |
| Seed SQL／seed tracking | Disabled且無seed inputs，不能推導其他seed分支也關閉 |
| Vault values | 無project values／upsert inputs，不能記錄值作證據 |
| Storage buckets／object seed | 獨立disabled／absent，不能借platform Storage bootstrap權限執行 |
| Edge functions／imports／dependencies | 不包含未授權project function或external download；intrinsic main/secrets staging另列CT-12 |
| dotenv／linked config／version pins／other inputs | 無Repository/歷史/remote inputs；每個可達reader都要納入metadata-only audit |

任何未核准input只能停止，不自行刪除或關flag後重試。必要獨立授權也要先重新審scope，不得讓「future start授權」自然擴張成project SQL授權。SQL-C與SQL-D仍NOT AUTHORIZED。

## 14. Gate 5 impact

Gate 5改名 **Environment Start Compound Transaction Authorization Review**。Design Section 4.4與Runbook Section 5.2使用相同CT-01至CT-20：source、daemon、config、DB branch、platform SQL、project exclusion、images、notifier、telemetry/home、OS-temp、`.temp`、Edge、pgdelta、HostIP、network、rollback、retry、redaction、resource acceptance、helpers。

每項required fact／policy／implementation須有evidence reference、status與checksum。NOT ESTABLISHED／NOT YET ESTABLISHED／CONFLICTING／BLOCKED／unknown reachability均FAIL。Actual config未生成時只review plan／writer，不假造actual verification。缺resource relationship、image provenance、home containment或helper實作均阻擋start，不因文件PASS而關閉。

Gate 5只給readiness判定，不給state-changing權限；沒有任何「PASS後自動start」。研究／補證據也須獨立授權。

## 15. Gate 6 impact

6A config materialization（STATE-CHANGING，包含另審root-wrapper副作用）→6B generated config/effective bounds verification（INSPECTION，持久化另需S-12）→6C S-06 compound start（STATE-CHANGING，獨立授權）。

6C authorization必須引用 **Frozen Gate 5 Compound Transaction Contract**及有效6B evidence，不只是start command checksum。Runtime effective config／daemon／inputs／containment與frozen contract不一致時不得start，也不得改設定續跑。Launcher尚未實作；其review與checksum是CT-20 blocker，不能以文件內placeholder執行。

Top-level仍12：Design Correction → Final Read-only Review → Design Correction Checkpoint → New Session Identity Reservation → Environment Start Compound Transaction Authorization Review → Environment Start Execution → Post-start Resource Integrity Verification → Spike Test Execution Authorization → Technical Evidence → Decision Revision → Migration Design Freeze → SQL Draft。6A/B/C沒有新增第13 Gate，Resource research是補足前提的獨立工作包，不重編這12個Gate。

## 16. Failure handling

1. CLI可能在return或signal path前已執行intrinsic rollback；不宣稱exact pre-failure scene保留。
2. Operator停止額外state-changing commands；不retry、不換ID/port、不manual cleanup。
3. 只在已授權範圍做fresh inspection，記錄invocation、各exit、known rollback、remaining/disappeared resources、filesystem/temp remnants、可安全查核的image/cache變化及unknown。
4. 只保存已允許的sanitized evidence；secret-capable raw在任何落盤／terminal／transcript之前經reviewed parser/redactor，不能先private quarantine再redact。
5. 無failure-write authorization不建立marker；有授權才create-new 0600、不含matching secret。Partial output或scan FAIL不能作PASS／PARTIAL evidence。
6. 等待新授權。正常pre-stop需verified runtime set＋fresh discovery＋ownership＋acceptance＋drift；Gate 7未形成set時須獨立故障處置，不套用正常stop。Stop不是host reset，不清image/home/temp殘留。

Health/status的credentials與logs也採此邊界。推薦拒絕ignore-health-check；CLI exit0、健康條件、resource acceptance三者不可互相替代。Raw CLI stream不得tee或寫檔，rendered command不得含secret；必要ownership/session/resource technical IDs不得被redaction改寫。

## 17. Remaining blockers and static cross-document review

| Remaining execution dependency | Status／effect |
|---|---|
| Installed binary/source correspondence | PARTIAL；CT-01未關閉 |
| Exact daemon/context及effective endpoint | 尚未重新inspection，CT-02 BLOCKED；本輪不查Docker |
| Image digest/registry/cache/fallback provenance | SUPPLY-CHAIN / IMAGE PROVENANCE BLOCKER；不拉image補證 |
| Home/state/traces containment與effective redirect | HOME-WRITE CONTAINMENT BLOCKER；不能靠disabled聲明 |
| OS-temp／Edge／artifact permissions及完整lifecycle | Source方向已知，實際可執行contract證據待審 |
| Localhost HostIP／auxiliary exposure／egress | 不能由service port或local stack名稱推定；CT-13至15待證 |
| Fresh config及完整project-input exclusion | 未產生新session/config；plan與actual verification分離 |
| Resource service/mount/attachment/cardinality | Required independent acceptance constraints仍缺，不以labels代替 |
| Required launcher／parsers／comparators／redactor／writer | 未實作／review／freeze；CT-20 BLOCKED，不在本輪補script |

上述是誠實保留的execution prerequisites，不是把不可能bound的行為強行宣稱安全。若後續證明無法bound intrinsic、需Remote/Production mutation、project SQL不能排除、platform/project SQL不可區分、daemon無邊界、需修改產品/Migration或先start才能證明模型自洽，必須判定 **C — BROADER EXECUTION MODEL BLOCKER** 並停止；不得把C降成缺一筆runtime evidence。

本次static review逐項對照三檔：compound S-06、SQL-A/B/C/D、四區filesystem、operator/intrinsic retry、rollback/preservation、telemetry/home/temp、CT-01至20、Gate 6A/B/C、project inputs、manual stop/cleanup、resource blockers與12 Gates。修正後不允許false no-SQL、full-scene preservation、session-root-only或no-retry保證；20 tests、19A/B/C、6 controlled operations、7 roles及4 Auth alternatives不改其實質內容。

本次agent static cross-document review結果：**A — NORMATIVE CORRECTION PASS — READY FOR LOCAL CHECKPOINT**，仍須mechanical validation全PASS才可commit。若後續機械驗證或範圍不符立即停止；若文件矛盾為B，只在三檔內修正重審；C立即停止。不偽稱Human已批准執行，也不把未執行tests寫成PASS。實際commit以Git metadata為準。

| Static review item | Design／Runbook location | Result |
|---|---|---|
| Compound S-06與非atomic定義 | 4.4／2.3、5.2 | PASS |
| SQL-A/B/C/D與fresh-only B exclusion | 4.4、13.1／5.3、7.2 | PASS |
| 無false no-SQL promise | 1、4.4／7.2、Gate 6 | PASS |
| 無false full-scene preservation | 4.4、12／5.3、9 | PASS |
| 無false session-root-only promise | 4、4.4／5.2、5.3 | PASS |
| Operator retry與CLI retry分離 | 4.4／5.3、9 | PASS |
| Telemetry transmission與home state分離 | 2、4.4／CT-08至11 | PASS |
| Temp四區、artifact allowlist與秘密不落evidence | 4.4、11.1／5.3、10 | PASS |
| Gate 5二十項required contract | CT-01至20／CT-01至20、Gate 5 | PASS |
| Gate 6 6A/B/C與compound checksum | 13.1／7.2、Gate 6 | PASS |
| Project authored inputs不隱含授權 | 4.4／CT-06、5.3 | PASS |
| Manual stop/cleanup仍獨立且非host rollback | 12／7.5、7.6 | PASS |
| Resource與其他execution evidence blockers保留 | 4.4、14、15／5.1、5.2、10.4、11 | PASS |
| 十二Gates與Decision Revision/Freeze/SQL Draft獨立 | 13.1／8 | PASS |

## 18. Resource Acceptance resume criteria

本工作包維持 **PAUSED UNTIL NORMATIVE CORRECTION PASS**，不恢復完整research。三檔normative/static review PASS及local checkpoint後，下一步才可另行授權Resource Acceptance Evidence Research；其範圍必須包含native legacy start（非Compose）、daemon/context、image provenance、intrinsic rollback label selection、runtime service/mount/network relationships以及auxiliary branch排除。

Research完成不自动start；再逐項重新評估Gate 5，必要證據未ESTABLISHED仍BLOCKED。Environment Start、post-start inspection/evidence與Spike execution各需獨立精確授權，不能一包到底。

## 19. Authorization boundary

- 本輪允許：修改Design／Runbook、建立本artifact、static validation；全PASS後才依已給明確授權stage實際變更三檔並local commit。
- Suggested commit：`docs: model supabase start intrinsic side effects`；不使用execution approval或migration freeze語意。
- Push：NOT AUTHORIZED／NOT PERFORMED。
- Environment Start：NOT AUTHORIZED；Gate 5 BLOCKED。
- Spike Execution：NOT YET ENTERED；SQL-D、Auth fixtures、tests均未授權。
- Migration Design Freeze：BLOCKED pending Local Spike evidence；SQL Draft／Repository Migration／Remote Supabase／Production BLOCKED。
- 未授權Docker／Supabase start/stop、SQL、migration、Auth、container/volume/network建立刪除、manual retry/cleanup、前端或部署。文件中的future command不授權執行。
- 本次preflight基線`e4084d82838bb00f805d4e542bb1abdeecdaef01`；舊Design SHA `82854d21a1b928eba01e94a374a8c706b6df56e2853c247142be7a54e26c62c6`、舊Runbook SHA `a2cf7d7f5a7f0dc9f1787df682d22864a45aec53c91c6c173e5dad6fae6edcf4`只作before fingerprint，不代表after內容。
- Checkpoint是否已完成只看Git metadata與最終回報；不把此文件自我聲明當作commit證據。完成後STOP，等待下一個明確工作包。

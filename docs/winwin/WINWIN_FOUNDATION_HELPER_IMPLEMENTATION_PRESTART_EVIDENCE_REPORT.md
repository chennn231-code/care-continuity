# WinWin Foundation — Helper Implementation / Pre-start Evidence

Status: B — NETWORK INSPECT COMMAND CORRECTION PASS — NEW EXACT BLOCKER

The volume and semantic network projection corrections remain closed. The command-compatibility correction replaces the Docker 29.6.2-incompatible network Go template with one native structured-JSON inspect per enumerated full ID and passes 199 synthetic tests. Its single authorized full inspector execution passed D-01 through D-06 and volume regression, and the corrected network command reached native JSON parsing without a CLI error. It then stopped fail-closed at a new exact parser blocker: an actual IPAM row failed the selector's required-presence/type predicate for optional `IPRange`. No retry, same-round helper re-edit, environment mutation or checkpoint followed. Complete instance evidence remains unavailable.

## 1. Purpose

Implement deterministic inspection contracts, then review/test/freeze before any real instance inspection. No SQL, Supabase invocation, Docker mutation, session materialization, image pull, or runtime acceptance.

## 2. Frozen baseline

Branch `codex/foundation-spike-design-correction`; HEAD `c2d2580d02deb1bd31fb7a6f8308941ac2ec07ab`; initial working tree clean, staged 0. Design, Runbook, Correction and Research fingerprints match the user-specified baseline. Research: `a0a693664ad689bb3cfca404f5e2c5cd57bb4dda0be61fb167675bc13aada331`.

Protected sources: [Design](WINWIN_FOUNDATION_SECURITY_CONCURRENCY_FEASIBILITY_SPIKE_DESIGN.md), [Runbook](WINWIN_FOUNDATION_ENVIRONMENT_START_SPIKE_EXECUTION_RUNBOOK_DRAFT.md), [Intrinsic Correction](WINWIN_FOUNDATION_ENVIRONMENT_START_INTRINSIC_SIDE_EFFECTS_CORRECTION.md), [Research v2 / Static Closure](WINWIN_FOUNDATION_RESOURCE_ACCEPTANCE_EVIDENCE_RESEARCH_V2.md). This report does not amend any of their contracts.

## 3. Helper implementation plan / H-01–18 mapping

No existing Foundation tooling directory; bounded root: `tools/winwin/foundation/`. Node built-ins only; no dependency installation. Synthetic fixtures are not an execution config. Never use the Repository's Supabase configuration as a future isolated session.

| ID | Initial disposition | Implementation boundary |
|---|---|---|
| H-01 | IMPLEMENT NOW | executable lookup/hash, local endpoint guard, projected Docker metadata |
| H-02 | IMPLEMENT NOW | complete baseline, collision and freshness, no new session ID |
| H-03 | IMPLEMENT NOW | strict JSON, duplicates/types/null/error handling |
| H-04 | IMPLEMENT NOW | pure bidirectional resource graph comparison; fixtures first |
| H-05 | IMPLEMENT NOW | structured all-tuple port/HostIP comparison |
| H-06 | IMPLEMENT NOW | component containment and metadata-only canonicalization |
| H-07 | IMPLEMENT NOW | local image projection, independent digest comparison, volume predictor |
| H-08 | IMPLEMENT NOW / actual Gate 6B deferred | strict bounded literal config/profile audit; no materialization |
| H-09 | IMPLEMENT NOW | environment presence/policy; never dump values |
| H-10 | IMPLEMENT NOW / actual Gate 6B deferred | all SQL-C entrypoint metadata dispositions |
| H-11 | IMPLEMENT NOW | temp/home metadata; no file content or directory creation |
| H-12 | IMPLEMENT NOW | single safe projection/output envelope; fail without raw error |
| H-13 | IMPLEMENT NOW | pure baseline/record drift |
| H-14 | POST-START | pure event ledger comparator only; live observer deferred |
| H-15 | SOURCE-ONLY / DO NOT EXECUTE | launcher deferred; no start-capable implementation needed here |
| H-16 | SOURCE-ONLY / DO NOT EXECUTE | writer deferred; reviewed report persistence uses this package's explicit permission |
| H-17 | MANUAL REVIEW | independent image/platform digest and package provenance approval |
| H-18 | POST-START | no fabricated runtime IDs/health/verified set |

### Final classification

EXECUTED below means invoked against real read-only metadata, not successful acceptance; NOT EXECUTED excludes synthetic tests. All modules were exercised only within the bounded implementation described here. The classification is not a completeness claim.

| Helper | Final classification | Completeness / actual use |
|---|---|---|
| H-01 | IMPLEMENTED / READ-ONLY / EXECUTED | Local client/context/daemon identity collected; policy and final drift closure incomplete |
| H-02 | IMPLEMENTED / READ-ONLY / EXECUTED | Baseline IDs and selected metadata; no host listener or relationship graph capture; no reserved session |
| H-03 | IMPLEMENTED / READ-ONLY / EXECUTED | Strict selected-resource parser; image command compatibility failed before a complete image finding |
| H-04 | IMPLEMENTED / READ-ONLY / NOT EXECUTED | Pure graph comparator tested; actual edge collector remains missing |
| H-05 | IMPLEMENTED / READ-ONLY / NOT EXECUTED | Tuple comparator tested; zero observed containers does not prove host ports free or network defaults safe |
| H-06 | IMPLEMENTED / READ-ONLY / EXECUTED | Metadata only; original temp alias identity is under-specified after tokenization |
| H-07 | IMPLEMENTED / READ-ONLY / EXECUTED | Attempted image phase failed; no image evidence emitted; provenance comparator only fixture-tested |
| H-08 | IMPLEMENTED / READ-ONLY / NOT EXECUTED | Rejecting literal subset only; full fixed-reader adapter remains an implementation blocker, not merely pending config |
| H-09 | IMPLEMENTED / READ-ONLY / EXECUTED | Selected ambient key presence only; future complete scoped child input audit pending |
| H-10 | IMPLEMENTED / READ-ONLY / NOT EXECUTED | Pure entrypoint DTO auditor; actual materialized input evidence belongs to Gate 6B |
| H-11 | IMPLEMENTED / READ-ONLY / EXECUTED | Host temp/home metadata only; not approval of execution zones |
| H-12 | IMPLEMENTED / READ-ONLY / EXECUTED | Bounded projections and envelope accepted; unknown future output is not automatically safe |
| H-13 | IMPLEMENTED / READ-ONLY / NOT EXECUTED | Pure record comparator tested; collector's initial ID-set comparison is not full record drift closure |
| H-14 | POST-START ONLY | Real observation window is future; full SC-05/06 collector source must still be completed and reviewed BEFORE Gate 5 |
| H-15 | DEFERRED TO GATE 6B | SOURCE DEFERRED under request §45; launcher must be reviewed before Gate 5/6B approval, and execution remains Gate 6C only |
| H-16 | DEFERRED TO GATE 6B | SOURCE DEFERRED under request §45; safe writer needed before operational evidence; no automatic persistence authorization |
| H-17 | MANUAL DECISION | Approved image/package trust evidence has not been supplied or inferred from local cache |
| H-18 | POST-START ONLY | Runtime IDs/health not fabricated; pre-start existing IDs are not new-session IDs |

The H-15/16 deferral label identifies the next blocked boundary, not permission to delay required implementation until after it or to execute there. Both have zero implementation/execution in this package. H-14 has only a pure lifecycle comparator, not the required live collector.

## 4. Implemented helpers

Implemented modules: pure contracts/parsers, bounded input auditors, filesystem metadata inspector, guarded pre-start collector, envelope schema, synthetic fixtures and tests. Production app imports none of them. No package/dependency changes.

The implementation is deliberately not a full Gate 5 implementation: the literal TOML parser is a rejecting subset, not a port of every CLI reader; graph comparison is fixture-ready but collector relationship edges are not yet collected; live ephemeral observation remains deferred. These are explicit finite closure items, not permissions to start or to relax validation.

## 5. Non-executable helpers

H-15/H-16 remain deferred. H-14 live events and H-18 runtime collection will not run. No state-changing helper will execute.

## 6. Helper checksums

Frozen before first instance invocation; paths relative to `tools/winwin/foundation/`:

| File | SHA-256 |
|---|---|
| inspect/prestart.mjs | `ab1f6b09acd1100ae27872dc744148774020d7097963be56f3b3c43603df3ec1` |
| lib/contracts.mjs | `cb0dd7ee8eb73275f40f6504e87bc464a2fe104b2ca939ec6a77103d2a41d853` |
| lib/auditors.mjs | `b6b360d94ac2756dc1a2292a84a8fbcadbebdba906a91c2e9157d46ad80a2436` |
| lib/metadata.mjs | `8a5c7b8eb486d48c838729687ccdb04f227fbb2c7b44714b3e1d2c54c8d41679` |
| schemas/evidence.schema.json | `af7a268fce0f1cb1739171ff4238efebc248f06e1a57c9677d931ee1694faec5` |
| fixtures/synthetic.mjs | `c4eae0a4609da297506314967f20bf1628b6209d090452c3affe98e9ffd90776` |
| tests/contracts.test.mjs | `12b4ecf0f2b096f6c4267c90fe5a6a7c9393e7fcb7d23302371584a693ee7e77` |

Inspector dependency aggregate: SHA-256 of compact JSON ordered `{file,sha256}` rows for the first five files: `4a1ac32405776bb88e3a46b0019e419409951a17d8372c61bc1faecae07935ca`.

Runtime: Node `v24.18.0`, executable `/usr/local/bin/node`, SHA-256 `bf0cea6ab3631b6b53a9709ed54d62608dd0725187426d34d4d6af6644c5197f`. Exact permitted instance invocation: `/usr/local/bin/node tools/winwin/foundation/inspect/prestart.mjs`, no arguments, no redirected file, no exported execution values. Expected output: schema `schemas/evidence.schema.json` plus runtime `validateEnvelope`/per-kind field validation. A fixed rejection marker instead of evidence is permitted on unsafe-output failure; no raw error output.

Any source change invalidates this freeze and subsequent evidence. Fixtures/tests do not invoke `runInspection`; importing the inspector only exposes pure templates/guards/parsers.

## 7. Static mutation review

Static review performed before real inspection:

| Helper coverage | Source / behavior | Mutation / subprocess / secret review | Allowed execution |
|---|---|---|---|
| H-03/04/05/07 comparator/12/13 | contracts.mjs; pure bounded data transforms | No I/O; crypto hashes nonsecret inputs; rejects raw secret fields, duplicate keys and ambiguous identities | READ-ONLY EXECUTION APPROVED WITHIN THIS WORK PACKAGE; pure tests/approved metadata only |
| H-08/09/10/optional qualifiers | auditors.mjs; explicit DTOs and rejecting literal subset | No I/O; no source module imports, URL expansion or env writes; values of sensitive env keys never returned | Same; no actual materialized config in this package |
| H-06/11 / executable identity | metadata.mjs | access/lstat/stat/realpath/readFile only; contents read only for executable hash; no probe files or symlinks created | Same; approved path metadata only |
| H-01/02/07 collector | inspect/prestart.mjs | Only guarded execFileSync; shell=false; exact resolved Docker executable/hash checked before each subprocess; bounded pipes, timeout, fixed errors, no retries | Same; safety guard failure stops all later queries |
| H-14 lifecycle comparator | contracts.mjs eventLedger | Pure synthetic lifecycle ordering only; not full live event/image/label collector | Fixture tests only; live observer NOT IMPLEMENTED / NOT EXECUTED |
| H-15/H-16 | deferred | No launcher/writer source capable of changing environment | DO NOT EXECUTE IN THIS WORK PACKAGE |

Collector subprocess allowlist (INSPECTION, no arbitrary arguments): Docker `--version`; `context show`; exact context `inspect` with Host-only JSON format; explicit same-context `info` with five-field format; `ps -a --no-trunc`, volume/network/image list; per-resource inspect using the exact `FORMATS` constants. Full inspect, logs, Config.Env, all-label JSON, credential-helper commands and every mutation command are unreachable through `allowedCommand`.

Context endpoint must be one of the two local Unix-socket classes before any daemon query. Missing/ambiguous executable, Podman availability, endpoint override, unknown executable class, API error, drift, parser failure or unsafe output stops the collector. Child environment copies only HOME/PATH/LANG/LC_ALL/DOCKER_CONTEXT/DOCKER_CONFIG unchanged; no global environment mutation, no HOME/TMPDIR reset, no proxy/cloud inheritance. Local Docker API requests are GET-type metadata commands; no public network request or CLI plugin invocation is requested. Docker/client configuration is not parsed for credentials by our code.

Read-only safety approval covers the bounded command behavior, not full model completeness or target acceptance. Real target findings may still be PARTIAL/BLOCKED. Filesystem persistence of reviewed evidence in this report is separately permitted by this work package and is not performed by an inspector/H-16.

## 8. Secret review

Only selected metadata, exact two ownership labels, no Config.Env values, credential-helper output, raw logs, Supabase status, SQL contents or personal state. Untrusted error messages must not reach output. User paths are tokenized after in-memory identity/containment checks; identities needed for equality are never normalized.

## 9. Unit-test results

104/104 synthetic tests PASS, 0 failed/skipped. Includes strict JSON/UTF-8, duplicate/unknown fields, null, wrong labels/types, wildcard IPv4/IPv6, graph missing/foreign/duplicate edges, missing image/digest, uncovered volumes, synthetic symlink escape, SQL-C branches, optional predicates, secret rejection, option injection and mutation command rejection. No Docker/Supabase command, SQL, Auth, real session, temporary file or network was used by these tests. Fixture path metadata only reads an existing source fixture. Actual Go-template compatibility remains an instance check, not a test claim.

## 10. Docker execution target evidence

One invocation after §6–9 freeze/review, envelope timestamp `2026-08-28T08:27:33.277Z`. Docker client `29.6.2` build `dfc4efb`, context `desktop-linux`, endpoint `unix://$HOME/.docker/run/docker.sock`, resolved as a local Unix socket. No reachable Podman executable was observed. Daemon identity `b02bf6c6-551b-4153-bd8a-8e7afe614e23`, engine `29.6.2`, Docker Desktop, `aarch64`; this ID is Docker metadata, not an Auth identifier. Docker executable hash is preserved in Appendix A.

Target identity observation succeeded; network default policy is NOT ESTABLISHED. `localEndpoint=true` does not independently prove all service egress safe. `baseline.complete=true` means only the enumerated ID inventories and selected per-resource fields completed, not every required acceptance field.

Failure: `DOCKER_INSPECTION_ERROR` after baseline/freshness/collision findings and before the images finding. The source places this in image list/per-image inspection, but the exact subcommand, image and process failure class were intentionally not captured. No cause is inferred and raw stderr was not read or persisted. The terminal process exited 0 because it emitted a valid BLOCKED envelope; **exit 0 is not an inspection PASS**. Future callers must check envelope.result; command-stage diagnostics need closure B-01.

Initial resource IDs were enumerated, individually inspected and re-enumerated before baseline emission. Final daemon/context/resource checks after image collection were NOT REACHED. No end-to-end no-drift claim is made. No further Docker command was run after this failure.

## 11. Collision baseline

Observed 0 containers, 39 local volumes and 3 default networks (`bridge`, `host`, `none`). The 39 volumes cover 13 historical project IDs, each with db/edge-runtime/storage roles and both exact project labels. The three volumes of the failed truncated-ID session remain present. Every individual identity/label record is preserved in Appendix A, without collapsing labels into a set.

Default networks have neither Supabase nor Compose project label; that is a baseline fact, not a new candidate ownership PASS or a reason to delete them. No candidate resources exist because this package did not reserve a new session. Host listeners, network options and foreign attachment edges were not collected. Thus the full collision result is PARTIAL, not CLEAR. An empty container-port collision list is not evidence that all reserved host ports are free.

## 12. Fresh path evidence

AMBIGUOUS: `SESSION_ID_NOT_RESERVED`. Without an independently reserved requested ID, session-specific DB container/volume absence cannot be FRESH-QUALIFIED. Existing historical DB volumes are preserved; none is adopted, mounted, renamed or removed. No execution/session ID was generated.

## 13. Image evidence

BLOCKED by the image-phase inspection error. No complete local image metadata finding was emitted. Image count, missing required images, image platform, declared volumes and approved digest equality are NOT VERIFIED. No pull, create, registry login or registry request occurred. No approved manifest digest is manufactured from local RepoDigests.

The current image projection also records only Entrypoint/Cmd counts and Healthcheck presence, not the SC-03 per-role structural approval contract. Even successful collection would not close that separate implementation gap. Required image manifest and H-17 independent approval remain necessary.

## 14. Anonymous-volume evidence

Fixture contract only: prediction rejects uncovered declared image volume targets. Actual declared targets, enabled role mount coverage and any anonymous-volume prediction are BLOCKED pending image evidence and approved role/profile inputs. This is not a declaration that the daemon has zero anonymous volumes.

## 15. Port/HostIP contract readiness

Reserved range remains 59320–59329. Wildcard/empty HostIP is never loopback. Actual daemon default-network policy must be independently established.

Synthetic IPv4/IPv6/multiple-binding tests PASS. Actual container inventory is empty; host process listeners were not inspected. Pre-start loopback policy, all ten host port availability facts and later config equality remain PARTIAL / GATE-6B-PENDING; actual new bindings are GATE-7-PENDING.

## 16. Mount/path readiness

No string-prefix containment, lowercasing or Unicode normalization. Missing leaves and uncertain filesystem semantics fail closed.

No actual session mounts exist. Pure graph/path checks are fixture-tested, but container mount/network relationship capture is incomplete. Temp original/symlink aliases became `$UNAPPROVED_PATH`; this loses distinctions required for original-versus-resolved path evidence. The report does not reinterpret that token as a containment PASS or reconstruct an unobserved original value.

## 17. SQL-C exclusion

GATE-6B-PENDING. Repository migrations are protected history, not the future start workdir. The pure auditor covers eleven entrypoint categories and rejects unknown/reachable/unproven inputs, but has not inspected any real execution config or SQL contents. Full config-reader implementation is additionally required; no project SQL exclusion PASS is inferred from absent materialization.

## 18. Temp/home evidence

Host temp and Supabase home metadata were inspected without content reads. Existing host defaults are observations, not approved isolated execution roots.

Temp resolved token `$OS_TEMP`: exists, mode 700, device 16777231, inode 269600; original alias is under-specified as described in §16. `$HOME/.supabase`: exists, mode 700, device 16777231, inode 23697307, no symlink recorded. Both have `NO_APPROVED_ISOLATED_SESSION`. No files within these directories were opened, and no directory, config, marker or execution file was created. Same-home consent/state and future temp API/prefix checks remain GATE-6B-PENDING.

## 19. Telemetry/update/pg-delta

GATE-6B-PENDING. Transmission, state, traces, notifier and every pg-delta predicate remain distinct.

Selected ambient risk-key presence returned PASS with an empty rows list; this is scoped to the implemented list only. It does not establish future initial notifier disable, denied telemetry consent, trace routing, scoped home state, or the complete multi-reader pg-delta branch closure. No environment values were dumped or changed.

## 20. Vector/analytics

GATE-6B-PENDING. V-A is the planned profile; no config changes here.

Synthetic optional-branch checks do not prove Vector is disabled in an as-yet nonexistent execution config or that runtime socket mounts are absent. No V-B fallback is selected. Runtime verification remains GATE-7-PENDING.

## 21. Egress configuration

GATE-6B-PENDING. Configuration evidence cannot prove runtime zero-egress.

Pure twelve-category policy comparison is tested. Actual endpoints/disabled predicates require reviewed effective config; Docker default-network policy and image role approval are still missing. No public endpoint probe was performed, and the current report does not grant pull/update/telemetry egress.

## 22. Binary identity

Read/hash only; never execute Supabase even for its version. Historical expected hash is not source equivalence.

Installed path identifies a Homebrew 2.115.0 location; executable SHA-256 `06179215a136f183ed24841e177e605fe15bf3e1ac1b6edac8312da71e835014` matches the frozen historical expected hash. Result is PARTIAL-ACCEPTABLE, reason `HASH_ONLY_OFFICIAL_PACKAGE_CHAIN_PENDING`; official archive/package-to-installed correspondence is NOT VERIFIED. The version string is explicitly EXPECTED_NOT_EXECUTED. No Supabase command was invoked.

## 23. Remaining instance gaps

Only precise closure is appropriate; do not restart general resource research or automatically rerun the collector.

| ID | Current implementation/pre-start gap | Required closure evidence |
|---|---|---|
| B-01 | Docker image phase emitted only a fixed error, with no failing command ID or safe failure class | Review a per-command safe diagnostic DTO and synthetic subprocess/template compatibility cases; new checksum freeze before a separately approved real inspection. No raw stderr, automatic retry or presumed cause |
| B-02 | H-08 is a narrow literal subset; complete CLI fixed-reader/early-env/path resolver behavior is not implemented | Implement the already frozen SC-13 reader contracts with synthetic valid and rejected fixtures; do not execute imports or materialize config |
| B-03 | H-02/04/05 lack actual mount/endpoint edges, host listeners and daemon network-default policy capture | Reviewed secret-safe projections and per-asset/edge validation, host collision evidence and independent loopback policy proof; zero containers alone is insufficient |
| B-04 | H-07 image-role Config/declared-volume/provenance closure incomplete | Complete SC-03 structural comparators and role mount coverage; local cache evidence plus independent approved digest/platform/config decision, never self-approved local digest |
| B-05 | H-14 only a pure ledger comparator; H-15/16 source deferred | Full SC-05/06 read-only observer/readiness/limitations implementation and tests before operational approval; separately reviewed source-only launcher/writer; no live observation/start/materialization now |
| B-06 | Temp alias tokenization collapses unknown aliases into one token | Preserve stable distinct original/resolved/symlink evidence with a reviewed token namespace; no absolute user paths or false equality |
| B-07 | Installed binary hash not linked to approved official package evidence | H-17 independent provenance decision or explicit bounded risk acceptance; exact SHA is evidence, not provenance by itself |

Normal future phases, distinct from these current gaps: session reservation and Gate 6A materialization; Gate 6B actual config, SQL-C, temp, home, telemetry, egress and Vector verification and input freeze; Gate 7 actual new resources, health and runtime graph. They are NOT AUTHORIZED and not fabricated to complete this package.

## 24. CT-01–20 matrix

Contract readiness below refers to the unchanged, completed Static Evidence Closure design contracts, NOT a claim that all their helpers are implemented. The implementation column exposes current pre-Gate-5 gaps; instance columns never promote future facts to PASS.

| CT | Topic | Contract readiness | Implementation / current closure | Instance evidence readiness |
|---|---|---|---|---|
| CT-01 | Binary/source | PASS | B-07; hash comparator implemented | PARTIAL: installed hash only |
| CT-02 | Docker target | PASS | Local endpoint/client guard implemented; B-03 policy/final drift | PARTIAL: target identified, complete policy not proved |
| CT-03 | Writer/materialization | PASS | B-02/B-05 source closure | GATE-6B-PENDING: no execution config |
| CT-04 | Fresh/collision | PASS | B-03 complete capture required | PARTIAL: baseline complete only for selected fields; no candidate ID/host listeners |
| CT-05 | Platform SQL-A/B | PASS | B-02/B-05 predicates/observer | GATE-6B-PENDING: runtime job facts later GATE-7-PENDING |
| CT-06 | SQL-C/D exclusion | PASS | Pure auditor tested; B-02 reader integration | GATE-6B-PENDING |
| CT-07 | Image trust/volumes | PASS | B-01/B-04/B-07 | BLOCKED: no image finding emitted |
| CT-08 | Update notifier | PASS | Pure policy tested; B-02 early reader integration | GATE-6B-PENDING |
| CT-09 | Telemetry/home | PASS | B-02/B-06; host metadata only | GATE-6B-PENDING |
| CT-10 | OS temp | PASS | B-06 alias identity gap | PARTIAL: metadata available, execution API/root proof GATE-6B-PENDING |
| CT-11 | Intrinsic .temp | PASS | B-02 input catalog integration | GATE-6B-PENDING |
| CT-12 | Edge | PASS | B-04 image structure needed | GATE-6B-PENDING: runtime facts later GATE-7-PENDING |
| CT-13 | pg-delta | PASS | Pure predicates tested; B-02 full readers missing | GATE-6B-PENDING |
| CT-14 | Port/HostIP | PASS | B-03 policy/listeners missing; pure tuples tested | PARTIAL: pre-start policy still required, new tuples GATE-7-PENDING |
| CT-15 | Network/egress | PASS | B-03/B-04; pure comparator not actual graph | PARTIAL: default IDs known, options/graph/profile not qualified |
| CT-16 | Intrinsic rollback | PASS | B-03/B-05 selector/window guards | PARTIAL: historical resources observed; rollback never executed |
| CT-17 | Intrinsic retry | PASS | B-05 launcher/cache-only guard source not implemented | GATE-6B-PENDING: no start or operator retry |
| CT-18 | Safe evidence | PASS | Projection/redactor executed; B-01 diagnostics/B-05 writer/B-06 identity gaps | PARTIAL: sanitized BLOCKED envelope only, no runtime evidence |
| CT-19 | Independent acceptance | PASS | B-03/B-04/B-05; not complete operational collector | PARTIAL: baseline only, actual new acceptance GATE-7-PENDING |
| CT-20 | Helper readiness | PASS | PARTIAL: bounded code and tests/hash freeze, required source gaps above | PARTIAL: one attempt stopped, no execution readiness |

## 25. Gate 5 readiness

BLOCKED. Final classification **B — HELPER / PRE-START EVIDENCE PARTIAL — SPECIFIC CLOSURE REQUIRED**. Not A: required implementation and pre-start evidence remain incomplete. Not C on present evidence: no remote daemon, foreign candidate collision, actual mutation or secret exposure was observed; unknowns and command failure are not proof of any of those conditions. This is not assurance that unobserved fields are safe.

No local checkpoint, stage, commit or push. Next action is human review of B-01–07 and a bounded correction/closure authorization, not general research, Gate 6A/6B, or Environment Start.

## 26. Authorization boundary

Helper source and reviewed read-only inspection only. Static Evidence Closure remains COMPLETED (prior committed work); Helper Implementation PARTIAL; Pre-start instance evidence PARTIAL/BLOCKED; Gate 5 BLOCKED. Gate 6A/6B/6C, Environment Start, SQL, Migration execution, Auth, Remote Supabase, Production and push remain NOT AUTHORIZED. Spike NOT YET ENTERED. No Docker resources were created, modified, stopped or deleted by this package; no pull, cleanup or context switch was requested. No raw logs or credentials were read. Push NOT PERFORMED.

## 27. Final repository-only validation

After the inspector stopped, only report editing and repository/source/fixture validation continued; the real collector was not rerun. The seven helper source/schema/test files retain the §6 pre-inspection hashes.

| Check | Result / boundary |
|---|---|
| Branch / HEAD | Expected correction branch and `c2d2580d02deb1bd31fb7a6f8308941ac2ec07ab` unchanged |
| Normative fingerprints | 4/4 hash, lines and bytes match frozen values |
| Protected tracked documents | 14/14 byte-identical to HEAD; no normative edits |
| Migration 001–008 | 8/8 byte-identical to HEAD |
| Synthetic helper tests | 104/104 PASS; no real collector or Docker query invoked by test suite |
| Mutation / subprocess / network audit | Bounded source review in §7; no mutation call, shell, network client, unapproved import or writer; missing operational features remain B gaps |
| Helper checksum freeze | 7/7 unchanged after actual inspection |
| Evidence schema / output scan | Valid BLOCKED envelope, not PASS; selected fields only; no raw error or secret detected |
| Source / report secret scan | No credential material detected; tests deliberately contain short synthetic rejection strings and header markers, not usable secrets |
| Absolute user paths | None; an initial broad scan matched the prose fragment “home/telemetry”, not a filesystem path; wording clarified |
| Markdown links | 4/4 local protected-source links exist |
| CT matrix | 20 unique rows; contract readiness separate from implementation/instance status |
| Whitespace / EOF | All 8 new files checked; newline present; no trailing spaces/tabs or CR |
| git diff --check | PASS; untracked files additionally checked independently |
| Tracked changes / staged files | 0 / 0 |
| Non-target new files | 0; exactly report plus seven bounded helper/schema/fixture/test files |
| Commit / push | Neither performed; classification B |

Sanitized envelope canonical JSON SHA-256 (compact JSON preserving stored field order): `96e52fe7c9d9ee6c84bedc38e971cd5397d44f59446b107f5e2ead25d132c21d`. This hash identifies the partial record; it does not qualify missing evidence or authorize execution. The final report fingerprint is reported externally rather than embedded in itself.

## Appendix A. Sanitized partial inspection envelope

Captured only after in-memory allowlisted projection and validation. This is a pre-start metadata failure record, not Spike execution evidence or a Technical Evidence PASS. Individual resource records are retained; no original command stderr, credentials, environment values, Config.Env, raw logs, or full image command payload are included. The artifact contains no new reserved session identity.

```json
{
  "schema_version": "1",
  "helper_id": "FOUNDATION-PRESTART-1",
  "helper_sha256": "4a1ac32405776bb88e3a46b0019e419409951a17d8372c61bc1faecae07935ca",
  "timestamp": "2026-08-28T08:27:33.277Z",
  "phase": "READ_ONLY_PRESTART",
  "subject": "LOCAL_METADATA_NOT_EXECUTION_SESSION",
  "result": "BLOCKED",
  "findings": [
    {
      "kind": "source",
      "data": {
        "hashes": [
          {
            "file": "inspect/prestart.mjs",
            "sha256": "ab1f6b09acd1100ae27872dc744148774020d7097963be56f3b3c43603df3ec1"
          },
          {
            "file": "lib/contracts.mjs",
            "sha256": "cb0dd7ee8eb73275f40f6504e87bc464a2fe104b2ca939ec6a77103d2a41d853"
          },
          {
            "file": "lib/auditors.mjs",
            "sha256": "b6b360d94ac2756dc1a2292a84a8fbcadbebdba906a91c2e9157d46ad80a2436"
          },
          {
            "file": "lib/metadata.mjs",
            "sha256": "8a5c7b8eb486d48c838729687ccdb04f227fbb2c7b44714b3e1d2c54c8d41679"
          },
          {
            "file": "schemas/evidence.schema.json",
            "sha256": "af7a268fce0f1cb1739171ff4238efebc248f06e1a57c9677d931ee1694faec5"
          }
        ],
        "runtime": "v24.18.0",
        "runtimeSha256": "bf0cea6ab3631b6b53a9709ed54d62608dd0725187426d34d4d6af6644c5197f"
      }
    },
    {
      "kind": "ambientPresence",
      "data": {
        "result": "PASS",
        "rows": []
      }
    },
    {
      "kind": "supabaseBinary",
      "data": {
        "original": "/opt/homebrew/bin/supabase",
        "resolved": "/opt/homebrew/Cellar/supabase/2.115.0/bin/supabase",
        "sha256": "06179215a136f183ed24841e177e605fe15bf3e1ac1b6edac8312da71e835014",
        "version": "2.115.0_EXPECTED_NOT_EXECUTED",
        "result": "PARTIAL-ACCEPTABLE",
        "reason": "HASH_ONLY_OFFICIAL_PACKAGE_CHAIN_PENDING"
      }
    },
    {
      "kind": "tempMetadata",
      "data": {
        "original": "$UNAPPROVED_PATH",
        "realpath": "$OS_TEMP",
        "exists": true,
        "mode": "700",
        "device": 16777231,
        "inode": 269600,
        "symlinks": [
          "$UNAPPROVED_PATH"
        ],
        "containment": "NO_APPROVED_ISOLATED_SESSION",
        "contentsRead": false
      }
    },
    {
      "kind": "supabaseHomeMetadata",
      "data": {
        "original": "$HOME/.supabase",
        "realpath": "$HOME/.supabase",
        "exists": true,
        "mode": "700",
        "device": 16777231,
        "inode": 23697307,
        "symlinks": [],
        "containment": "NO_APPROVED_ISOLATED_SESSION",
        "contentsRead": false
      }
    },
    {
      "kind": "dockerExecutable",
      "data": {
        "original": "/usr/local/bin/docker",
        "resolved": "$DOCKER_APP/Contents/Resources/bin/docker",
        "aliases": [
          "/usr/local/bin/docker"
        ],
        "sha256": "c9766c884e4f2de2aadf8eba072d4a19f45e7f7535138cd0c8bac143f1c26644",
        "podmanReachable": false
      }
    },
    {
      "kind": "dockerContext",
      "data": {
        "version": "Docker version 29.6.2, build dfc4efb",
        "context": "desktop-linux",
        "endpoint": "unix://$HOME/.docker/run/docker.sock",
        "socketRealpath": "$HOME/.docker/run/docker.sock",
        "classification": "LOCAL_UNIX_SOCKET"
      }
    },
    {
      "kind": "daemon",
      "data": {
        "id": "b02bf6c6-551b-4153-bd8a-8e7afe614e23",
        "engine": "29.6.2",
        "os": "Docker Desktop",
        "architecture": "aarch64",
        "root": "$DAEMON_STORAGE",
        "localEndpoint": true,
        "rootPathObserved": true,
        "networkDefaultPolicy": "NOT_ESTABLISHED"
      }
    },
    {
      "kind": "baseline",
      "data": {
        "complete": true,
        "containers": [],
        "volumes": [
          {
            "name": "supabase_db_care-continuity-v2-007-dryrun",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "care-continuity-v2-007-dryrun"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "care-continuity-v2-007-dryrun"
              }
            }
          },
          {
            "name": "supabase_db_care-continuity-v2-007-dryrun-r2",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "care-continuity-v2-007-dryrun-r2"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "care-continuity-v2-007-dryrun-r2"
              }
            }
          },
          {
            "name": "supabase_db_care-continuity-v2-007-harness-202608241",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "care-continuity-v2-007-harness-202608241"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "care-continuity-v2-007-harness-202608241"
              }
            }
          },
          {
            "name": "supabase_db_cc-v2-007-20260824140240-5706",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "cc-v2-007-20260824140240-5706"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "cc-v2-007-20260824140240-5706"
              }
            }
          },
          {
            "name": "supabase_db_cc-v2-007-20260824140414-5979",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "cc-v2-007-20260824140414-5979"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "cc-v2-007-20260824140414-5979"
              }
            }
          },
          {
            "name": "supabase_db_cc-v2-007-rc-20260824141640-6608",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "cc-v2-007-rc-20260824141640-6608"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "cc-v2-007-rc-20260824141640-6608"
              }
            }
          },
          {
            "name": "supabase_db_cc-v2-007-rc-20260825065419-33765",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "cc-v2-007-rc-20260825065419-33765"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "cc-v2-007-rc-20260825065419-33765"
              }
            }
          },
          {
            "name": "supabase_db_cc-v2-007-rc-20260825065713-34084",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "cc-v2-007-rc-20260825065713-34084"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "cc-v2-007-rc-20260825065713-34084"
              }
            }
          },
          {
            "name": "supabase_db_cc-v2-007-rc-20260825070351-34976",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "cc-v2-007-rc-20260825070351-34976"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "cc-v2-007-rc-20260825070351-34976"
              }
            }
          },
          {
            "name": "supabase_db_cc-v2-008-legacy-34427",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "cc-v2-008-legacy-34427"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "cc-v2-008-legacy-34427"
              }
            }
          },
          {
            "name": "supabase_db_cc-v2-008-legacy-final-35240",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "cc-v2-008-legacy-final-35240"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "cc-v2-008-legacy-final-35240"
              }
            }
          },
          {
            "name": "supabase_db_cc-v2-008-rollback-34689",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "cc-v2-008-rollback-34689"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "cc-v2-008-rollback-34689"
              }
            }
          },
          {
            "name": "supabase_db_winwin-fnd-spike-20260827t052047z-645c81",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "winwin-fnd-spike-20260827t052047z-645c81"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "winwin-fnd-spike-20260827t052047z-645c81"
              }
            }
          },
          {
            "name": "supabase_edge_runtime_care-continuity-v2-007-dryrun",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "care-continuity-v2-007-dryrun"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "care-continuity-v2-007-dryrun"
              }
            }
          },
          {
            "name": "supabase_edge_runtime_care-continuity-v2-007-dryrun-r2",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "care-continuity-v2-007-dryrun-r2"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "care-continuity-v2-007-dryrun-r2"
              }
            }
          },
          {
            "name": "supabase_edge_runtime_care-continuity-v2-007-harness-202608241",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "care-continuity-v2-007-harness-202608241"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "care-continuity-v2-007-harness-202608241"
              }
            }
          },
          {
            "name": "supabase_edge_runtime_cc-v2-007-20260824140240-5706",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "cc-v2-007-20260824140240-5706"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "cc-v2-007-20260824140240-5706"
              }
            }
          },
          {
            "name": "supabase_edge_runtime_cc-v2-007-20260824140414-5979",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "cc-v2-007-20260824140414-5979"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "cc-v2-007-20260824140414-5979"
              }
            }
          },
          {
            "name": "supabase_edge_runtime_cc-v2-007-rc-20260824141640-6608",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "cc-v2-007-rc-20260824141640-6608"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "cc-v2-007-rc-20260824141640-6608"
              }
            }
          },
          {
            "name": "supabase_edge_runtime_cc-v2-007-rc-20260825065419-33765",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "cc-v2-007-rc-20260825065419-33765"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "cc-v2-007-rc-20260825065419-33765"
              }
            }
          },
          {
            "name": "supabase_edge_runtime_cc-v2-007-rc-20260825065713-34084",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "cc-v2-007-rc-20260825065713-34084"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "cc-v2-007-rc-20260825065713-34084"
              }
            }
          },
          {
            "name": "supabase_edge_runtime_cc-v2-007-rc-20260825070351-34976",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "cc-v2-007-rc-20260825070351-34976"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "cc-v2-007-rc-20260825070351-34976"
              }
            }
          },
          {
            "name": "supabase_edge_runtime_cc-v2-008-legacy-34427",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "cc-v2-008-legacy-34427"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "cc-v2-008-legacy-34427"
              }
            }
          },
          {
            "name": "supabase_edge_runtime_cc-v2-008-legacy-final-35240",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "cc-v2-008-legacy-final-35240"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "cc-v2-008-legacy-final-35240"
              }
            }
          },
          {
            "name": "supabase_edge_runtime_cc-v2-008-rollback-34689",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "cc-v2-008-rollback-34689"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "cc-v2-008-rollback-34689"
              }
            }
          },
          {
            "name": "supabase_edge_runtime_winwin-fnd-spike-20260827t052047z-645c81",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "winwin-fnd-spike-20260827t052047z-645c81"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "winwin-fnd-spike-20260827t052047z-645c81"
              }
            }
          },
          {
            "name": "supabase_storage_care-continuity-v2-007-dryrun",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "care-continuity-v2-007-dryrun"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "care-continuity-v2-007-dryrun"
              }
            }
          },
          {
            "name": "supabase_storage_care-continuity-v2-007-dryrun-r2",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "care-continuity-v2-007-dryrun-r2"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "care-continuity-v2-007-dryrun-r2"
              }
            }
          },
          {
            "name": "supabase_storage_care-continuity-v2-007-harness-202608241",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "care-continuity-v2-007-harness-202608241"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "care-continuity-v2-007-harness-202608241"
              }
            }
          },
          {
            "name": "supabase_storage_cc-v2-007-20260824140240-5706",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "cc-v2-007-20260824140240-5706"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "cc-v2-007-20260824140240-5706"
              }
            }
          },
          {
            "name": "supabase_storage_cc-v2-007-20260824140414-5979",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "cc-v2-007-20260824140414-5979"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "cc-v2-007-20260824140414-5979"
              }
            }
          },
          {
            "name": "supabase_storage_cc-v2-007-rc-20260824141640-6608",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "cc-v2-007-rc-20260824141640-6608"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "cc-v2-007-rc-20260824141640-6608"
              }
            }
          },
          {
            "name": "supabase_storage_cc-v2-007-rc-20260825065419-33765",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "cc-v2-007-rc-20260825065419-33765"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "cc-v2-007-rc-20260825065419-33765"
              }
            }
          },
          {
            "name": "supabase_storage_cc-v2-007-rc-20260825065713-34084",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "cc-v2-007-rc-20260825065713-34084"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "cc-v2-007-rc-20260825065713-34084"
              }
            }
          },
          {
            "name": "supabase_storage_cc-v2-007-rc-20260825070351-34976",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "cc-v2-007-rc-20260825070351-34976"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "cc-v2-007-rc-20260825070351-34976"
              }
            }
          },
          {
            "name": "supabase_storage_cc-v2-008-legacy-34427",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "cc-v2-008-legacy-34427"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "cc-v2-008-legacy-34427"
              }
            }
          },
          {
            "name": "supabase_storage_cc-v2-008-legacy-final-35240",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "cc-v2-008-legacy-final-35240"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "cc-v2-008-legacy-final-35240"
              }
            }
          },
          {
            "name": "supabase_storage_cc-v2-008-rollback-34689",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "cc-v2-008-rollback-34689"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "cc-v2-008-rollback-34689"
              }
            }
          },
          {
            "name": "supabase_storage_winwin-fnd-spike-20260827t052047z-645c81",
            "driver": "local",
            "scope": "local",
            "labels": {
              "com.supabase.cli.project": {
                "present": true,
                "value": "winwin-fnd-spike-20260827t052047z-645c81"
              },
              "com.docker.compose.project": {
                "present": true,
                "value": "winwin-fnd-spike-20260827t052047z-645c81"
              }
            }
          }
        ],
        "networks": [
          {
            "id": "4ccae31c955bc586af12ac1b298308080fc167848c3e000f9f1373e166d2513c",
            "name": "bridge",
            "driver": "bridge",
            "scope": "local",
            "internal": false,
            "ipv6": false,
            "labels": {
              "com.supabase.cli.project": {
                "present": false,
                "value": null
              },
              "com.docker.compose.project": {
                "present": false,
                "value": null
              }
            }
          },
          {
            "id": "be9239b58b41cea77af450506e1e8ad39e60c4de50d4c6757dc45bbfba30749b",
            "name": "host",
            "driver": "host",
            "scope": "local",
            "internal": false,
            "ipv6": false,
            "labels": {
              "com.supabase.cli.project": {
                "present": false,
                "value": null
              },
              "com.docker.compose.project": {
                "present": false,
                "value": null
              }
            }
          },
          {
            "id": "bb805e0d939357ff1d376416b06803535c78ec123e5fdd5da56eac7548a3c993",
            "name": "none",
            "driver": "null",
            "scope": "local",
            "internal": false,
            "ipv6": false,
            "labels": {
              "com.supabase.cli.project": {
                "present": false,
                "value": null
              },
              "com.docker.compose.project": {
                "present": false,
                "value": null
              }
            }
          }
        ]
      }
    },
    {
      "kind": "freshness",
      "data": {
        "result": "AMBIGUOUS",
        "reason": "SESSION_ID_NOT_RESERVED"
      }
    },
    {
      "kind": "collision",
      "data": {
        "result": "PARTIAL",
        "reason": "SESSION_ID_NOT_RESERVED_HOST_LISTENERS_AND_FOREIGN_GRAPH_NOT_COLLECTED",
        "reservedPortCollisions": []
      }
    }
  ],
  "error": "DOCKER_INSPECTION_ERROR"
}
```

## Pre-start Inspector Final Closure Addendum

### 1. Closure objective

This addendum closes the helper-specific diagnostic ambiguity without entering Gate 6A, Gate 6B, Environment Start, SQL, Auth, or any Docker mutation. The revised helper was statically reviewed, frozen by checksum, tested synthetically, and executed exactly once as a new decomposed read-only diagnostic inspection. It was not retried.

### 2. DAEMON_INFO decomposition

The former compound `DAEMON_INFO` query is replaced by these independently attributable read-only stages:

| Stage | Purpose | Result |
| --- | --- | --- |
| D-01 | Docker executable resolution and identity | PASS |
| D-02 | Client-side Docker version | PASS |
| D-03 | Active context name | PASS |
| D-04 | Safe context projection and local endpoint validation | PASS |
| D-05 | Minimal daemon connectivity through server-version projection | BLOCKED |
| D-06 | Safe daemon identity projection | NOT RUN because D-05 blocked |

Each executed stage records a safe stage identifier, executable SHA-256, fixed argument-template identifier, exit status, parse status, and bounded stderr classification. Raw command lines and raw stderr are not persisted.

### 3. Exact failing stage

The earlier generic Docker exit is now localized to **D-05 — daemon connectivity**.

- command class: `DAEMON_CONNECTIVITY`
- argument template: `SERVER_VERSION_JSON`
- exit code: `1`
- signal: none
- stdout presence: yes, not accepted because the command exited non-zero
- safe stderr classification: `PERMISSION_DENIED`
- retry: no

This is a **LOCAL INSTANCE BLOCKER**, not an inferred helper syntax defect. The authorized closure does not permit socket permission changes, Docker Desktop restart, context switching, login, or repair. D-06 and every daemon-dependent evidence branch therefore remained blocked.

### 4. Safe stderr classification

The in-memory classifier exposes only these bounded classes: daemon unreachable, permission denied, context missing, invalid endpoint, CLI usage error, response parse error, API version error, unknown safe classification, or absence. Raw stderr is never written to the evidence envelope or this report. Synthetic coverage includes known classes and the unknown fallback.

### 5. Docker 29.6.2 command compatibility

The revised helper uses fixed projection templates or bounded fixed outputs. It no longer requests the full human `docker info` display. Client identity and context complete successfully against Docker 29.6.2. The minimal D-05 server-version projection reached the CLI but was denied by the local instance. No alternate query was attempted because the failure is a permission disposition, not proof that the documented read-only query is unsupported.

### 6. Ambient environment disposition

The environment contract now separates execution-relevant allowlisted inputs, secret-sensitive presence-only inputs, reviewed known-irrelevant inputs, and unknown inputs. Unknown inputs remain fail-closed only when consumed or forwarded isolation has not been established.

`NODE_REPL_TRUSTED_BROWSER_CLIENT_SHA256S` is classified as `KNOWN-IRRELEVANT / NOT FORWARDED` because:

1. it belongs to the Node REPL trusted browser-client mechanism;
2. the helper never reads its value;
3. it is absent from the explicit Docker child environment allowlist;
4. it is absent from the future Foundation execution child contract represented by this helper; and
5. it does not alter the helper parser, fixed templates, or Node module execution semantics used here.

Its value was not recorded. The actual environment projection passed.

### 7. Security-relevant reader coverage matrix

All 25 required categories are represented with fixed source class, reader/adapter, precedence class, security relevance, test coverage, and disposition. The matrix contains **zero `GAP` rows**. Categories requiring the future materialized execution profile are explicitly `GATE-6B-PENDING`; they are not treated as absent or approved. The overall matrix is therefore `PARTIAL`, but it has no remaining helper-reader engineering gap.

Covered pre-start categories include root arguments, workdir, config catalog, process environment, Docker context/host, Supabase home, version pins, telemetry, update notifier, and temp/home paths. Dotenv, linked metadata, SQL-C sources, Auth/provider/SMTP, analytics/Vector, pg-delta, registry/proxy, and related effective inputs remain explicitly phase-gated to Gate 6B.

### 8. H14 closure

H14 now aggregates 22 named sources without producing expected values from actuals, suppressing failures, retrying, repairing, or cleaning. Each source keeps its own status. On this run:

- Docker-independent binary, environment, filesystem, reader, provenance, and listener branches were retained;
- daemon identity, baseline, image, mount, and network branches are `BLOCKED_BY_DAEMON_STAGE`;
- Gate 6B inputs remain `GATE-6B-PENDING`;
- telemetry, notifier, and pg-delta uncertainty remains visible rather than being normalized to PASS;
- H14 overall result is `BLOCKED` because D-05 blocked.

This closes the collector engineering gap while preserving the local-instance blocker.

### 9. Actual inspection run

- invocation count after checksum freeze: exactly one
- envelope timestamp: `2026-08-28T09:09:01.802Z`
- helper aggregate SHA-256: `0af10625a6a94416b1796328abd06f05b6effaf714a22521c1511c4872f76966`
- envelope result: `BLOCKED`
- error: `DOCKER_CLI_EXIT`
- state-changing command: none
- retry, repair, cleanup: none

### 10. Docker target

- client: Docker 29.6.2, build `dfc4efb`
- client executable SHA-256: `c9766c884e4f2de2aadf8eba072d4a19f45e7f7535138cd0c8bac143f1c26644`
- context: `desktop-linux`
- endpoint classification: local Unix socket, no TLS metadata in the safe context projection
- endpoint value: tokenized under `$HOME`; no private absolute path persisted
- Podman fallback: not reachable

The daemon itself was not accepted as reachable because D-05 failed.

### 11. Resource graph and baseline

Not collected. Containers, volumes, networks, mounts, relationships, freshness, and collision evidence are `BLOCKED_BY_DAEMON_STAGE`. The helper did not create, start, remove, prune, rename, or repair any resource.

### 12. Image evidence

Not collected because D-05 did not pass. No image list, image inspect, pull, registry access, or fallback occurred. Expected roles remain phase-gated rather than reported missing.

### 13. Listener evidence

The independent OS-level inspection completed for TCP and UDP over `59320–59329`:

- listener records: 0
- result: PASS
- Docker daemon dependency: none

### 14. Network-policy phase status

The local Docker context and endpoint classification were observed. Future published `HostIP`, materialized networks, egress, and effective service topology remain `GATE-6B-PENDING` or post-start evidence. No future network policy is declared PASS from the empty listener result.

### 15. Remaining Gate 6B items

Gate 6B must still supply or verify the effective execution profile for dotenv precedence, linked metadata, migrations, roles, seed, schema, vault, buckets, functions, Auth providers/hooks, SMTP, analytics/Vector, pg-delta, image/registry resolution, proxy, SQL-C exclusion, role-specific mounts, and materialized network/egress behavior. Gate 6B cannot replace the blocked D-05 precondition.

H15 and H16 remain `REQUIRED LATER`; neither was implemented or executed.

### 16. Updated tests

- tests: 132
- pass: 132
- fail: 0
- skipped: 0

New coverage includes daemon-stage attribution, executable/context/connectivity failure classes, safe unknown stderr, known-irrelevant ambient isolation, unknown-key fail closure, complete/pending/gap reader matrices, and H14 PASS/BLOCKED/MISSING/mixed behavior with no self-approval.

### 17. Updated helper hashes

| File | SHA-256 |
| --- | --- |
| `inspect/prestart.mjs` | `addce4ad73de50b19e6296df0ade014b479388a2e41a51b6073bc260bfa75552` |
| `lib/contracts.mjs` | `3712bc08279fa8443dfe813b32abb473faa8ade40643633cfe1357768c17407e` |
| `lib/auditors.mjs` | `164c892c5fded81c4640657371b02b37b8e449751c7a9492ae544ab9a299cf2c` |
| `lib/metadata.mjs` | `8b9a78b2e3baf7206bccf875220e6b96c1966f732f83386d48bb677a1b5c0c3d` |
| `schemas/evidence.schema.json` | `af7a268fce0f1cb1739171ff4238efebc248f06e1a57c9677d931ee1694faec5` |
| `fixtures/synthetic.mjs` | `40aaa8fba32a78524f47934673d3ac99825fdb4d38d1045c090bd1f12bba2563` |
| `tests/contracts.test.mjs` | `d82ba1a83f9f72bf72adf4415ea0ecace63696e6a837a4385c9882d6e7450b40` |

### 18. CT readiness

CT contract coverage remains available, but runtime CT readiness is blocked at the local daemon-connectivity prerequisite. No CT acceptance is inferred from synthetic coverage or listener absence.

### 19. Final classification

**C — LOCAL PRE-START SAFETY BLOCKER**

Reason: the exact official read-only daemon connectivity query failed at D-05 with safe classification `PERMISSION_DENIED`. Per the frozen disposition, this cannot be repaired, bypassed, or retried by this work package. Helper-specific ambient policy, reader-matrix, stage attribution, and H14 collector defects are closed; the unresolved blocker is local-instance access plus the evidence branches that depend on it.

Gate 5 remains **BLOCKED**. Gate 6A, Gate 6B, Gate 6C, Environment Start, Docker mutation, SQL, Migration execution, Auth, and Spike execution remain unauthorized.


## Specific Closure Addendum

### 1. Closure scope

This addendum addresses only B-01–B-07. The seven helper/schema/fixture/test files were modified; no normative document, application runtime, Supabase config or Migration 001–008 was changed. One newly reviewed pre-start inspection was attempted after tests, source review and checksum freeze. It stopped fail-closed at DAEMON_INFO. No retry or later instance query was performed.

### 2. Image inspection root cause

**NOT DIAGNOSED / IMAGE STAGE NOT REACHED.** The reviewed invocation stopped before baseline, graph, listener or image collection. Therefore no image root cause is guessed and no IMAGE-INSPECTION-CLOSED / IMAGE-MISSING result is claimed. Exact current failure: Docker CLI exit at safe command class DAEMON_INFO, exit code 1, signal null, stdout present, stderr PRESENT_REDACTED. Raw stderr was neither persisted nor displayed.

### 3. Command-stage diagnostics

Implemented separate structured stages: COMMAND_RESOLUTION, ARGUMENT_CONSTRUCTION, SUBPROCESS_SPAWN, DOCKER_CLI_EXIT, STDOUT_PARSE, SCHEMA_VALIDATION, PROJECTION and COMPARATOR. Diagnostics contain only stage, numeric exit/signal, safe class/categories, stderr classification, stdout presence and parser category. Synthetic spawn, CLI-exit and argument rejection tests PASS. The actual invocation proves the generic prior DOCKER_INSPECTION_ERROR was replaced with a bounded stage record.

### 4. Image compatibility

Synthetic existing-image projection, missing-image semantics, empty RepoDigests, malformed output, unsupported platform, Config.Volumes and structural Config projection tests PASS. Local Docker 29.6.2 image compatibility was **NOT EXECUTED** because DAEMON_INFO failed first. Missing required roles and multi-platform acceptance remain unknown. No image pull, registry fallback, credential helper or raw image Env was used.

### 5. Fixed config readers

Implemented a bounded key/catalog reader, early environment projection and source-to-consumer equality comparator. The protected repository config was not reached by the actual collector. The catalog is a safe metadata projection, not a complete byte-equivalent implementation of every Supabase CLI fixed reader or precedence rule. Full reader/consumer equivalence remains engineering defect D-03 before Gate 5; Gate 6B cannot substitute for missing reader behavior.

### 6. Environment projection

The actual projection recorded no values. HOME and TMPDIR were PRESENT / VALUE SAFE; one relevant unknown key, NODE_REPL_TRUSTED_BROWSER_CLIENT_SHA256S, was classified UNEXPECTED. It was not inherited by the Docker child allowlist, but policy disposition is not silently changed: environment projection result BLOCKED. Human review must decide whether a narrowly evidenced process-host key is out-of-scope or remains disallowed; the helper must then enforce the approved policy before later collection.

### 7. Actual resource graph

Graph capture source now projects selected container mounts/networks, network attachments and volume consumers without Config.Env or full Mountpoint paths. Synthetic foreign edge, extra consumer, missing/mixed label cases PASS. **Actual graph NOT EXECUTED** due the earlier DAEMON_INFO stop.

### 8. Host listener evidence

A fixed read-only lsof projection for TCP/UDP ports 59320–59329 and a bounded parser were implemented and reviewed. It never terminates a process. **Actual listener inspection NOT EXECUTED** because the collector stopped first; port availability is not PASS.

### 9. Image role table

Fourteen source-default role references are encoded as a review baseline, not an effective Gate 6B role selection. The planned output separates role/reference, present/missing, local ID, matching RepoDigests, platform and structural Config. Actual role rows were not emitted. Alternative PG branches and conditional role reachability still require effective config rather than automatic acceptance.

### 10. Image-declared volume coverage

Exact destination-minus-approved-mount comparator remains synthetic PASS. Actual role image Config and explicit role mount plans were not jointly available; coverage is IMAGE EVIDENCE PENDING / GATE-6B-PENDING, not an empty set claim.

### 11. Digest approval state

Actual local image digests were not collected. Approved expected image digests remain HUMAN APPROVAL PENDING and are never assigned from local actual values. This normal human dependency can remain after helper closure, but current image evidence is additionally blocked by D-01.

### 12. H-14 collector

A no-retry/no-repair/no-cleanup aggregator and a guarded orchestration path were added. The actual path stopped correctly. It is **not complete** against the requested minimum because SQL-C, optional telemetry/notifier/pg-delta, Vector and egress results are not yet wired into its finding set, and Research-v2 H-14 transient lifecycle observation remains a separate future source obligation. This is defect D-04, not Gate 6B evidence pending.

### 13. H-15/H-16 review

- H-15: **REQUIRED LATER**. A minimal single-invocation launcher remains justified to freeze the exact child input/command and prevent retry/fallback; state-changing surface is the one authorized S-06 invocation. A loose Runbook command cannot itself enforce this. No source implemented or executed.
- H-16: **REQUIRED LATER**. A create-new, 0600, sanitized-record-only writer remains needed for future Technical Evidence. Its state-changing surface is bounded evidence persistence only. No source implemented or executed.

Neither disposition authorizes Gate 6B/6C or execution.

### 14. Temp tokenization correction

Path identity now includes source category plus distinct SHA-256 tokens for original and resolved absolute byte strings and an explicit equality fact. Tests cover same basename/different parent, symlink-vs-real, Unicode-equivalent-looking, case difference, relative-vs-absolute identities, temp-vs-home and session-vs-unrelated roots. Actual temp and Supabase-home metadata emitted distinct stable tokens without an absolute user path. B-06 is CLOSED at the helper contract level; containment remains NO_APPROVED_ISOLATED_SESSION until a separately authorized session exists.

### 15. Binary provenance

Read-only local package metadata established: Homebrew package 2.115.0, arm64, tap commit 72d725a5d83dee0ecbc2f256ce6d238104733b20, official Darwin-arm64 archive SHA-256 5b25574efd0a67905073085783da3659737d237e5137e3adfe1a9858e94f40dc, and installed binary SHA-256 06179215a136f183ed24841e177e605fe15bf3e1ac1b6edac8312da71e835014. Formula URL/checksum and receipt-to-formula/binary linkage matched. Classification: PARTIAL-ACCEPTABLE — official archive/package linkage without reproducible-build or byte-for-byte source equivalence. B-07 is CLOSED under the accepted minimum; no executable/archive was downloaded or replaced and Supabase was not executed.

### 16. Freshness/session phase classification

Fresh qualification remains GATE-6A-PENDING because this work package forbids a real new session ID. Freshness qualifier capability remains tested. No fake/current ID was generated. The second actual collection did not reach baseline, so the prior 39-volume historical observation is not re-promoted or assumed unchanged.

### 17. Updated helper checksums

| File | SHA-256 |
|---|---|
| inspect/prestart.mjs | 55a6704b647d9e700943623d87f8ca34f3c686b425b74a389907e0fb472150ac |
| lib/contracts.mjs | 1d09be24ebea09884a7657b65637b1f3f53fcf1bbaed45dac43d6558a30dac6f |
| lib/auditors.mjs | e09393eb9ef9bfa9584bf3cb0b61a4305ab4e7a78fdcf1f317413b1406cb4265 |
| lib/metadata.mjs | 8b9a78b2e3baf7206bccf875220e6b96c1966f732f83386d48bb677a1b5c0c3d |
| schemas/evidence.schema.json | af7a268fce0f1cb1739171ff4238efebc248f06e1a57c9677d931ee1694faec5 |
| fixtures/synthetic.mjs | 40aaa8fba32a78524f47934673d3ac99825fdb4d38d1045c090bd1f12bba2563 |
| tests/contracts.test.mjs | b585170d0025e88b7099c4ed4df265f8c7b6b1600e74e42adfa62fc11fae0b25 |

Inspector dependency aggregate in the actual envelope: 995a99c28edc5db0c12d98470067014c695fdfeaa5f51501c106448846e14db5.

### 18. Updated tests

122/122 synthetic tests PASS, 0 failed/skipped after final checksum freeze. Added eighteen tests for image projection/missing/digests/platform/volumes, command-stage errors, aggregation, fixed input/environment/equivalence, provenance, listener parsing and path-token collisions. No test invoked Docker, Supabase, SQL, Auth, network, materialization or writer behavior.

### 19. Updated CT readiness

| CT group | Contract | Current implementation / instance status |
|---|---|---|
| CT-01 | PASS | PARTIAL-ACCEPTABLE provenance; no source equivalence claim |
| CT-02 | PASS | PARTIAL/BLOCKED at DAEMON_INFO D-01; endpoint identity was reconfirmed before failure |
| CT-03,05,06,08,09,11–13,17 | PASS | GATE-6B-PENDING plus D-03/D-04 where implementation is not complete |
| CT-04,14–16,19 | PASS | PARTIAL; second baseline/graph/listeners not reached; no fresh ID |
| CT-07 | PASS | BLOCKED: no actual image finding or role table |
| CT-10 | PASS | helper token correction CLOSED; execution root GATE-6B-PENDING |
| CT-18,20 | PASS | PARTIAL: safe diagnostics improved, but D-01–04 prevent helper readiness |

All CT-01–20 remain represented; no phase-pending item is falsely marked runtime PASS.

### 20. Remaining exact blockers

| ID | Exact defect / failed stage | Why Gate 6A/6B cannot solve it |
|---|---|---|
| D-01 | Reviewed local collector failed at DAEMON_INFO: Docker CLI exit 1 with safe diagnostic; exact environmental/CLI cause intentionally not inferred | Pre-start daemon metadata must be safely queryable before materialization. Gate 6A/6B cannot legitimize a failed prerequisite inspector |
| D-02 | Early environment policy encountered unexpected NODE_REPL_TRUSTED_BROWSER_CLIENT_SHA256S; no reviewed disposition exists | Input policy must be decided/enforced before child execution; materialization cannot silently whitelist ambient input |
| D-03 | Fixed config catalog is bounded and secret-safe but not a complete implementation of every CLI reader/precedence branch | Gate 6B needs a trusted reader to verify its materialized facts; it cannot validate itself with an incomplete reader |
| D-04 | H-14/pre-start collection omits wired SQL-C, optional telemetry/notifier/pg-delta, Vector and egress outputs; transient lifecycle source is also not complete | These are helper implementation prerequisites; later evidence cannot create absent collection logic |
| D-05 | Actual image, role Config, graph, listener and network-policy evidence was not reached | These include authorized pre-start facts and cannot all be deferred to Gate 6B/7 |

Only a new precise closure authorization may diagnose/fix these defects and refreeze helpers. Do not restart general Resource Acceptance Research.

### 21. Final classification

**B — SPECIFIC CLOSURE PARTIAL.** B-06 and B-07 are closed; command diagnostics and several source capabilities improved, but D-01–D-05 remain. Not A because the actual inspector is blocked before the required image/graph/listener evidence and config/H-14 source is incomplete. Not C because no remote daemon, mutation, secret leak, contradictory provenance, project SQL reachability or unavoidable unsafe socket was observed; unknowns are not treated as safety proof.

No checkpoint or push. Gate 5 remains BLOCKED. Gate 6A/6B/6C and Environment Start remain NOT AUTHORIZED.

### Appendix B. Sanitized Specific Closure attempt

```json
{
  "schema_version": "1",
  "helper_id": "FOUNDATION-PRESTART-1",
  "helper_sha256": "995a99c28edc5db0c12d98470067014c695fdfeaa5f51501c106448846e14db5",
  "timestamp": "2026-08-28T08:51:49.968Z",
  "phase": "READ_ONLY_PRESTART",
  "subject": "LOCAL_METADATA_NOT_EXECUTION_SESSION",
  "result": "BLOCKED",
  "findings": [
    {
      "kind": "source",
      "data": {
        "hashes": [
          {
            "file": "inspect/prestart.mjs",
            "sha256": "55a6704b647d9e700943623d87f8ca34f3c686b425b74a389907e0fb472150ac"
          },
          {
            "file": "lib/contracts.mjs",
            "sha256": "1d09be24ebea09884a7657b65637b1f3f53fcf1bbaed45dac43d6558a30dac6f"
          },
          {
            "file": "lib/auditors.mjs",
            "sha256": "e09393eb9ef9bfa9584bf3cb0b61a4305ab4e7a78fdcf1f317413b1406cb4265"
          },
          {
            "file": "lib/metadata.mjs",
            "sha256": "8b9a78b2e3baf7206bccf875220e6b96c1966f732f83386d48bb677a1b5c0c3d"
          },
          {
            "file": "schemas/evidence.schema.json",
            "sha256": "af7a268fce0f1cb1739171ff4238efebc248f06e1a57c9677d931ee1694faec5"
          }
        ],
        "runtime": "v24.18.0",
        "runtimeSha256": "bf0cea6ab3631b6b53a9709ed54d62608dd0725187426d34d4d6af6644c5197f"
      }
    },
    {
      "kind": "ambientPresence",
      "data": {
        "result": "BLOCKED",
        "rows": [
          {
            "key": "HOME",
            "consumer": "SUPABASE_HOME_AND_PROCESS",
            "state": "PRESENT / VALUE SAFE",
            "valueRecorded": false
          },
          {
            "key": "NODE_REPL_TRUSTED_BROWSER_CLIENT_SHA256S",
            "consumer": "UNEXPECTED",
            "state": "UNEXPECTED",
            "valueRecorded": false
          },
          {
            "key": "TMPDIR",
            "consumer": "OS_TEMP_PARENT",
            "state": "PRESENT / VALUE SAFE",
            "valueRecorded": false
          }
        ]
      }
    },
    {
      "kind": "supabaseBinary",
      "data": {
        "original": "/opt/homebrew/bin/supabase",
        "resolved": "/opt/homebrew/Cellar/supabase/2.115.0/bin/supabase",
        "sha256": "06179215a136f183ed24841e177e605fe15bf3e1ac1b6edac8312da71e835014",
        "version": "2.115.0_EXPECTED_NOT_EXECUTED",
        "result": "PARTIAL-ACCEPTABLE",
        "reason": "HASH_ONLY_OFFICIAL_PACKAGE_CHAIN_PENDING"
      }
    },
    {
      "kind": "provenance",
      "data": {
        "packageManager": "Homebrew",
        "packageVersion": "2.115.0",
        "architecture": "arm64",
        "formulaArchiveSha256": "5b25574efd0a67905073085783da3659737d237e5137e3adfe1a9858e94f40dc",
        "installedBinarySha256": "06179215a136f183ed24841e177e605fe15bf3e1ac1b6edac8312da71e835014",
        "sourceTapCommit": "72d725a5d83dee0ecbc2f256ce6d238104733b20",
        "result": "PARTIAL-ACCEPTABLE",
        "reason": "OFFICIAL_ARCHIVE_AND_PACKAGE_LINKAGE_NO_REPRODUCIBLE_BUILD_EQUIVALENCE"
      }
    },
    {
      "kind": "tempMetadata",
      "data": {
        "original": "path:TEMP:original:0f6698414312cd40eea147bcbe1415acd080ffef28fdba1486df48488d8be4f5",
        "realpath": "path:TEMP:resolved:46b06a597b64d59fd3eccc35a89948bcc549ea849e44409acd8582791506b8b0",
        "exists": true,
        "mode": "700",
        "device": 16777231,
        "inode": 269600,
        "symlinks": [
          "path:TEMP:original:c309689ef6f2432e55b81fdb6e139e2857ba1aba16ea4270daa3f5ab68181cd3"
        ],
        "containment": "NO_APPROVED_ISOLATED_SESSION",
        "contentsRead": false
      }
    },
    {
      "kind": "supabaseHomeMetadata",
      "data": {
        "original": "path:SUPABASE_HOME:original:01409e928bed56305263efb21dbb3a75df9936415e0c60d651562601f085d534",
        "realpath": "path:SUPABASE_HOME:resolved:01409e928bed56305263efb21dbb3a75df9936415e0c60d651562601f085d534",
        "exists": true,
        "mode": "700",
        "device": 16777231,
        "inode": 23697307,
        "symlinks": [],
        "containment": "NO_APPROVED_ISOLATED_SESSION",
        "contentsRead": false
      }
    },
    {
      "kind": "dockerExecutable",
      "data": {
        "original": "/usr/local/bin/docker",
        "resolved": "$DOCKER_APP/Contents/Resources/bin/docker",
        "aliases": [
          "/usr/local/bin/docker"
        ],
        "sha256": "c9766c884e4f2de2aadf8eba072d4a19f45e7f7535138cd0c8bac143f1c26644",
        "podmanReachable": false
      }
    },
    {
      "kind": "dockerContext",
      "data": {
        "version": "Docker version 29.6.2, build dfc4efb",
        "context": "desktop-linux",
        "endpoint": "unix://$HOME/.docker/run/docker.sock",
        "socketRealpath": "$HOME/.docker/run/docker.sock",
        "classification": "LOCAL_UNIX_SOCKET"
      }
    },
    {
      "kind": "diagnostic",
      "data": {
        "stage": "DOCKER_CLI_EXIT",
        "exitCode": 1,
        "signal": null,
        "commandClass": "DAEMON_INFO",
        "argumentCategories": [
          "FIXED_OR_VALIDATED_TOKEN",
          "FIXED_OR_VALIDATED_TOKEN",
          "FIXED_OR_VALIDATED_TOKEN",
          "FIXED_OR_VALIDATED_TOKEN",
          "FIXED_PROJECTION_TEMPLATE"
        ],
        "stderrClassification": "PRESENT_REDACTED",
        "stdoutPresence": true,
        "parserCategory": null
      }
    }
  ],
  "error": "DOCKER_CLI_EXIT"
}
```

## Human-Authorized Local Read-Only Inspection Addendum

### 1. Authorization and frozen target

One and only one human-authorized inspection was executed outside the restrictive sandbox, as the same non-root local user. The execution used the already-frozen inspector without modification and the previously verified Docker target: Docker client 29.6.2, context `desktop-linux`, and the same local Unix socket. It did not use `sudo`, change Docker context, restart or mutate Docker, invoke Supabase, execute SQL or Auth operations, create a session, or enter Gate 6A/6B/6C.

Frozen helper fingerprints at execution:

| Component | SHA-256 |
|---|---|
| `inspect/prestart.mjs` | `addce4ad73de50b19e6296df0ade014b479388a2e41a51b6073bc260bfa75552` |
| `lib/contracts.mjs` | `3712bc08279fa8443dfe813b32abb473faa8ade40643633cfe1357768c17407e` |
| `lib/auditors.mjs` | `164c892c5fded81c4640657371b02b37b8e449751c7a9492ae544ab9a299cf2c` |
| `lib/metadata.mjs` | `8b9a78b2e3baf7206bccf875220e6b96c1966f732f83386d48bb677a1b5c0c3d` |
| `schemas/evidence.schema.json` | `af7a268fce0f1cb1739171ff4238efebc248f06e1a57c9677d931ee1694faec5` |
| `fixtures/synthetic.mjs` | `40aaa8fba32a78524f47934673d3ac99825fdb4d38d1045c090bd1f12bba2563` |
| `tests/contracts.test.mjs` | `d82ba1a83f9f72bf72adf4415ea0ecace63696e6a837a4385c9882d6e7450b40` |

The aggregate helper fingerprint reported by the safe execution envelope was `0af10625a6a94416b1796328abd06f05b6effaf714a22521c1511c4872f76966`.

### 2. Decomposed Docker access result

| Stage | Result | Accepted fact |
|---|---|---|
| D-01 | PASS | Frozen Docker executable identity remained exact |
| D-02 | PASS | Context remained `desktop-linux` |
| D-03 | PASS | Endpoint remained the approved local Unix socket |
| D-04 | PASS | Socket and local target guards passed |
| D-05 | PASS | Normal-user daemon connectivity succeeded |
| D-06 | PASS | Safe daemon identity projection succeeded |

D-05 is therefore **CLOSED** for this target and execution boundary. D-06 reported Docker Engine 29.6.2, Docker Desktop on `aarch64`, and a safe daemon identity projection. The report does not reproduce credentials, connection material, raw stderr, or private environment values.

### 3. Actual fail-closed point

After D-01 through D-06 passed, the inspector entered actual resource-baseline collection and terminated with a safe `SCHEMA_VALIDATION_ERROR` diagnostic at:

- stage: `SCHEMA_VALIDATION`
- command class: `VOLUME_PROJECTION`
- parser category: `SCHEMA`
- raw stderr retained or exposed: no

The safe diagnostic does not identify a specific field or resource, so this report does not infer one. The frozen helper's current top-level resource-loop failure behavior terminated collection at that point. The one-execution authorization was consumed; no retry, alternate command, helper edit, Docker mutation, or manual workaround was attempted.

### 4. Evidence disposition

| Evidence area | Disposition after authorized execution |
|---|---|
| Docker target and daemon access | PASS for the frozen target |
| Ambient input policy | PASS for the executed child boundary; unexpected browser key was not forwarded |
| Reader coverage | PARTIAL; no unclassified reader gap, but Gate 6B categories remain pending |
| Resource baseline | NOT ACCEPTED; volume projection schema validation terminated collection |
| Freshness and historical residue | NOT ESTABLISHED by this execution |
| Container/volume/network graph | NOT REACHED |
| Image inventory and role evidence | NOT REACHED |
| Config and declared-volume evidence | NOT REACHED |
| Digest approval | NOT REACHED and remains independently pending |
| Host listener evidence | NOT REACHED in this execution; earlier sandbox evidence remains historical only |
| H-14 lifecycle evidence | NOT REACHED and not promoted to runtime PASS |

No missing or uncollected fact is treated as acceptance. No prior sandbox result is substituted for evidence from this normal-user execution.

### 5. Classification and next gate

**B — LOCAL READ-ONLY DOCKER ACCESS RESTORED — INSTANCE EVIDENCE PARTIAL.** This is B rather than C because the authorized normal-user inspection proved D-05 daemon access and D-06 safe daemon identity. It is not A because the volume projection schema failure prevented a complete, accepted resource baseline and all dependent instance evidence.

Gate 5 remains **BLOCKED**. A separate, explicitly authorized helper-correction and review gate is required before any future instance inspection can be considered. This addendum does not authorize a rerun, helper modification, Supabase/Docker state change, Gate 6, Environment Start, SQL, Auth, evidence checkpoint, commit, or push.

The frozen Local Docker Access Diagnostic artifact remains unchanged. No checkpoint is created because instance evidence is incomplete.

## Volume Projection Schema Correction Addendum

### 1. Previous failure

The prior authorized normal-user inspector execution passed D-01 through D-06, then stopped fail-closed with `SCHEMA_VALIDATION_ERROR` at `VOLUME_PROJECTION`. No raw volume inspect output, absolute Mountpoint, plugin options, unapproved labels or user-specific paths are persisted here.

### 2. Pipeline decomposition and exact mismatch before correction

| Stage | Contract | Diagnosis before correction |
|---|---|---|
| V-01 | Docker structured volume metadata | Legal Docker Desktop daemon metadata includes a daemon-VM absolute Mountpoint |
| V-02 | Safe structured parse | Selected JSON projection parses successfully |
| V-03 | Field projection | Name, driver, scope and approved-label projection are structurally available |
| V-04 | Path redaction/tokenization | **FAILED:** the helper attempted host-filesystem canonicalization of the daemon-VM Mountpoint |
| V-05 | Explicit semantic normalization | Not reached |
| V-06 | Evidence validation | Outer failure reported as `SCHEMA_VALIDATION_ERROR` |
| V-07 | Volume comparator | Not reached |

Exact mismatch:

- expected contract node: safe `mountpoint` classification/token produced from a daemon-internal absolute path;
- observed safe shape category: `canonicalMetadata()` returned `{ exists: false, realpath: null }` because the path belongs to the Docker Desktop daemon VM rather than the macOS host filesystem;
- failing operation: the classifier dereferenced `m.realpath.startsWith(...)` even though `realpath` was `null`;
- mismatch category: host/daemon path-domain confusion followed by null dereference;
- responsible layer: helper projection/tokenization, not the envelope schema and not Docker metadata.

A minimized in-memory synthetic reproduction produced the same outer `SCHEMA_VALIDATION_ERROR`, stage `SCHEMA_VALIDATION`, command class `VOLUME_PROJECTION`, and a host-realpath null-dereference cause category. It performed no Docker query and persisted no host evidence.

### 3. Correction classification

**CASE A — Projection bug.** The daemon metadata is representable within the existing normative safety contract. The bounded correction must validate the daemon path lexically, classify component containment against the independently observed daemon root, and derive an opaque stable token without consulting the host filesystem. No normative contract change is required.

### 4. Bounded correction and files changed

The correction:

- replaces host-filesystem canonicalization of daemon-VM Mountpoints with pure component-aware lexical containment against the independently observed daemon root;
- emits only an opaque `DAEMON_VOLUME` identity token, never the absolute Mountpoint;
- preserves `MISSING`, `NULL`, `EMPTY` and present states for optional scope/Mountpoint evidence;
- adds bounded labels/options state classifications (`NULL`, `EMPTY`, `PRESENT_NOT_CAPTURED`) without capturing arbitrary values;
- keeps exact approved-label projection and rejects unexpected safety-relevant fields;
- does not special-case any historical volume name.

Changed helper bundle files before execution: `inspect/prestart.mjs`, `lib/contracts.mjs`, `fixtures/synthetic.mjs`, and `tests/contracts.test.mjs`. The envelope schema, auditors and metadata helper remain unchanged. This report is the only documentation change. The frozen diagnostic remains unchanged.

### 5. Regression tests

All **155/155** synthetic tests pass: the existing 132 tests plus 23 volume-specific regressions. Coverage includes standard local volumes, optional missing/null/empty distinctions, label and option state distinctions, daemon path tokenization, unexpected safe drivers, malformed names/labels/options, unexpected fields, foreign/unapproved ownership, ambiguous projection, raw parse/projection/tokenization/schema/comparator failures, duplicate volumes, and cross-resource consumer relationships. Container, network, image, path tokenization, exact ownership and H-14 tests remain passing.

### 6. Re-frozen helper fingerprints before instance execution

| Component | SHA-256 |
|---|---|
| `inspect/prestart.mjs` | `32210250095ea781e0f70ae30782ffba42a90f57ee71d0f4a59c7bf1db50c10c` |
| `lib/contracts.mjs` | `c7776df28edeae843f7b778a838040db89fac86182ff980475bdbe69c27a1eb8` |
| `lib/auditors.mjs` | `164c892c5fded81c4640657371b02b37b8e449751c7a9492ae544ab9a299cf2c` |
| `lib/metadata.mjs` | `8b9a78b2e3baf7206bccf875220e6b96c1966f732f83386d48bb677a1b5c0c3d` |
| `schemas/evidence.schema.json` | `af7a268fce0f1cb1739171ff4238efebc248f06e1a57c9677d931ee1694faec5` |
| `fixtures/synthetic.mjs` | `c8cb92d3af806c435a32b6baa34b6365a3caf186d99ad6701529c0721481649b` |
| `tests/contracts.test.mjs` | `2f3af628025f46b35ea42c838b49a07c9547a658734feb8f21458ad8ecc87ee8` |

### 7. Static read-only safety review

PASS before real continuation: filesystem-write audit, bounded subprocess/allowlist audit, mutation-command audit, network-import audit, child-environment mutation audit, secret projection/raw-stderr policy, local absolute-path scan, whitespace scan and `git diff --check`. The only subprocess implementations remain the reviewed allowlisted Docker metadata commands and fixed-range `lsof` inspection. No writer, network client, retry, Docker mutation or Supabase invocation was introduced.

### 8. Execution identity guard

The one newly authorized full read-only inspector execution ran as the same normal user against the same reviewed target. D-01 through D-06 all passed again: frozen Docker executable, Docker 29.6.2, context `desktop-linux`, approved local Unix socket, daemon connectivity, and safe Docker Desktop `aarch64` identity. The execution envelope reported aggregate helper SHA-256 `808974924b21567290a8b316dcfda73d402df77674e3e27cf7d034853f91de9`.

No retry, repair, cleanup, context change, image pull, Docker mutation, Supabase invocation, SQL, Auth or Gate 6 action occurred.

### 9. Resource baseline and volume evidence

The correction is runtime-confirmed for the prior failure point: ordered baseline collection completed the container and volume projection phases and advanced to network projection. The previous `VOLUME_PROJECTION` schema failure did not recur.

This proves the generic daemon-path projection correction is effective for the observed historical volumes. It does **not** authorize those volumes for a future session, establish a reserved session identity, or accept a complete baseline. The helper adds the baseline finding only after every resource class completes, so no partial container/volume collection is promoted or persisted as accepted evidence.

### 10. New exact fail-closed point

The same single execution then stopped at a new concrete stage:

- stage: `SCHEMA_VALIDATION`
- command class: `NETWORK_PROJECTION`
- parser category: `INVALID_SCHEMA`
- stdout presence: true
- raw stderr or raw network metadata persisted: no

This package does not infer the failing network field, change the network contract, modify the helper again, or retry. The new exact stage requires a separate narrowly authorized correction gate.

### 11. Container/network evidence

Container projection completed before the new network-stage failure but was not emitted as a standalone accepted finding. Network projection failed. Therefore complete container/network evidence, attachment relationships, mixed ownership checks and resource cardinality remain **NOT ACCEPTED**.

### 12. Freshness and historical residue

Freshness remains `SESSION_ID_NOT_RESERVED` phase-pending and was not reached as an emitted finding. Historical volumes were successfully representable by the corrected projection, but no cleanup, future-session acceptance or deterministic collision decision was made. Network residue classification remains blocked by the new network projection failure.

### 13. Images, declared volumes and digests

Local image inventory, image Config, declared volumes and role evidence were **NOT REACHED** because the network baseline failed first. No image was pulled. Human digest approval and image preparation remain independent pending matters, not helper acceptance.

### 14. Resource graph

The graph was **NOT REACHED**. No partial resource relationship set is substituted for the missing complete baseline.

### 15. Host listeners

The fixed 59320–59329 listener inspection was **NOT REACHED** in this execution because the fail-closed outer collection stopped first. Earlier sandbox listener output remains historical only and is not treated as current evidence.

### 16. H-14 and CT-01–20 readiness

H-14 aggregate was **NOT REACHED** and is not reported as runtime PASS. All CT-01–20 contracts remain represented by the 155 passing synthetic tests, but actual readiness stays PARTIAL at the new network projection stage. Gate 6B phase-pending reader/config categories are not misclassified as helper defects, and the network schema failure is not misclassified as phase-pending.

### 17. Gate 5 readiness and final classification

Gate 5 remains **BLOCKED**; this is not ready for Gate 5 pre-authorization review because an unresolved helper defect remains in actual network projection.

**B — VOLUME PROJECTION CORRECTION PASS — INSTANCE EVIDENCE PARTIAL.** The exact new blocker is `NETWORK_PROJECTION` → `SCHEMA_VALIDATION` → `INVALID_SCHEMA`. This is B rather than A because complete pre-start instance evidence was not produced. It is not C because the volume contract remained safe and the bounded correction worked against the actual instance. It is not D because no foreign/colliding resource was accepted or proven to violate the contract before the network parser failed.

No checkpoint is permitted for classification B. The next allowed work, if separately authorized, is limited to the exact network projection failure. Gate 5 does not pass; Gate 6A/6B/6C, Environment Start, Docker mutation, SQL, Migration, Auth, cleanup, Remote Supabase, Production and push remain unauthorized.

## Network Projection Schema Correction Addendum

### 1. Previous network failure

The prior single authorized continuation confirmed the volume correction against actual metadata, then stopped fail-closed at `NETWORK_PROJECTION` with parser category `INVALID_SCHEMA`. No raw network inspect object, unapproved labels, private host metadata or attachment payload is persisted here.

### 2. Pipeline decomposition and exact root cause before correction

| Stage | Contract | Diagnosis before correction |
|---|---|---|
| N-01 | Docker structured network metadata | Builtin networks may legally expose `IPAM.Config` as `null` |
| N-02 | Safe structured parse | Selected JSON parses successfully |
| N-03 | Field projection | Required booleans and attachment array are safely projected |
| N-04 | Identity tokenization | Not the failing stage |
| N-05 | Network semantic projection | **FAILED:** `null` IPAM and builtin semantics were forced into the user-defined array-only path |
| N-06 | Schema selection | Correct explicit `network` branch selected |
| N-07 | Schema validation | Outer diagnostic reported `INVALID_SCHEMA` |
| N-08 | Comparator | Not reached |

The envelope JSON Schema document remains structurally valid and was not used as an incompatible per-resource schema selector. There is no evidence of `SCHEMA_DOCUMENT_INVALID`, `WRONG_SCHEMA_SELECTED` or `VALIDATOR_COMPATIBILITY_ERROR`.

Exact mismatch:

- expected network node: `ipamConfig` array;
- observed safe type/shape category: legitimate `null` for a builtin network, while `internal` and `ipv6` remained booleans and `attachments` remained an array;
- failure source: the combined manual network predicate required `Array.isArray(r.ipamConfig)` and emitted its default `INVALID_SCHEMA` code;
- mismatch category: builtin/user-defined semantic projection conflation and overly narrow nullable handling;
- responsible layer: helper network projection, not the normative safety boundary.

A minimized in-memory synthetic builtin-network reproduction produced the same outer `SCHEMA_VALIDATION_ERROR`, command class `NETWORK_PROJECTION` and parser category `INVALID_SCHEMA`. It did not query Docker or persist host evidence.

### 3. Correction classification

**CASE A — Projection bug.** Legal builtin metadata can be represented safely by preserving `NULL`, `EMPTY` and `PRESENT` IPAM states, explicitly classifying builtin networks as non-candidates, and keeping attachment edges separate from resource identity. No normative contract modification is required.

### 4. Schema validity and bounded correction

The correction keeps the envelope schema on JSON Schema draft 2020-12 and adds explicit tests that distinguish supported schema, wrong selector, unsupported dialect and malformed schema. It does not enable wildcard properties or add an alternate validator.

The safe network projection now:

- captures booleans for internal, attachable, ingress, config-only and IPv6;
- preserves labels, options and IPAM states as `NULL`, `EMPTY` or `PRESENT_NOT_CAPTURED` without arbitrary values;
- projects IPAM entries to address-family classification plus opaque tokens and auxiliary-address counts;
- classifies exact driver/name pairs for `bridge`, `host` and `none` as `BUILTIN_NETWORK / OWNERSHIP NOT APPLICABLE`;
- never treats a matching name alone as ownership or candidate acceptance;
- keeps `attachmentEdges` separate from resource identity and rejects duplicate/malformed edges;
- retains exact approved ownership-label records for independent later comparison.

No raw network Options, unapproved labels, exact subnet/gateway/range values or private host metadata is emitted.

### 5. Files changed

Bounded helper changes: `inspect/prestart.mjs`, `lib/contracts.mjs`, `fixtures/synthetic.mjs`, and `tests/contracts.test.mjs`. The envelope schema, auditors and metadata helper remain unchanged. This implementation report is the only documentation change; the diagnostic artifact remains frozen.

### 6. Regression tests

All **187/187** synthetic tests pass: the prior 155 plus 32 network-focused cases. Coverage includes schema validity/selection/dialect distinction, builtin bridge/host/none, user-defined networks, labels missing/empty/foreign/mixed, driver variability, internal/attachable flags, IPAM null/empty/single/multiple/IPv6/malformed shapes, zero/one/multiple/foreign/malformed/duplicate attachments, and missing/unexpected/duplicate/ambiguous/ID/ownership comparator failures. Volume daemon-path projection, container, image, ownership, listener and H-14 tests remain passing.

### 7. Re-frozen helper fingerprints before instance execution

| Component | SHA-256 |
|---|---|
| `inspect/prestart.mjs` | `53ccad517d8f6e60244772ee4a6d38549d6882d1f2e847260c4911a725dd6ec4` |
| `lib/contracts.mjs` | `1869f2fd0909a3a32fe30f727e03fee6472d484ace52a5a0c5a300354b667e6b` |
| `lib/auditors.mjs` | `164c892c5fded81c4640657371b02b37b8e449751c7a9492ae544ab9a299cf2c` |
| `lib/metadata.mjs` | `8b9a78b2e3baf7206bccf875220e6b96c1966f732f83386d48bb677a1b5c0c3d` |
| `schemas/evidence.schema.json` | `af7a268fce0f1cb1739171ff4238efebc248f06e1a57c9677d931ee1694faec5` |
| `fixtures/synthetic.mjs` | `57dea94a926373008682863e73032b0f7b6fbb870911463d03729558592a1fff` |
| `tests/contracts.test.mjs` | `3eb336ebc2dd7d88c65fe887f06ccb9ab7ca8d753ca654a75e7bde3110ddfb4a` |

### 8. Static read-only safety review

PASS before real continuation: filesystem-write audit, subprocess allowlist, Docker mutation denylist, network-import audit, explicit child-environment audit, raw stderr/secret projection policy, absolute user-path scan, whitespace scan and `git diff --check`. No writer, network client, retry, cleanup, Docker mutation or Supabase invocation was introduced.

### 9. Execution target guard

The authorization UI timed out once before process creation. The tool explicitly reported that the process had not started, so this did not consume the single execution allowance. The same reviewed command was then approved and started exactly once. There was no second inspector process and no execution retry.

The one actual normal-user inspector execution passed D-01 through D-06 again: frozen Docker executable, Docker 29.6.2, context `desktop-linux`, approved local Unix socket, daemon connectivity and safe Docker Desktop `aarch64` identity. The execution envelope recorded timestamp `2026-08-28T10:13:39.252Z` and aggregate helper SHA-256 `69133191a877dc3bc09526d368128fab83eb54cfa9144f2833feeb8fe06c606e`.

### 10. Volume regression confirmation

**PASS.** The ordered baseline collector completed container and volume projection and advanced to the network-inspect command. The corrected daemon-VM volume path projection did not regress, and the prior `VOLUME_PROJECTION` failure did not recur. This proves only that the volume projection phase completed in this execution; it does not promote partial resource data to an accepted baseline.

### 11. Actual networks

Actual network evidence is **NOT ACCEPTED**. Before safe network parsing or the corrected semantic projection could run, the reviewed Docker command template failed with this sanitized classification:

- stage: `DOCKER_CLI_EXIT`;
- sub-stage: `UNSPECIFIED`;
- argument template: `RESOURCE_SAFE_PROJECTION`;
- command class: `NETWORK_INSPECT`;
- exit code: `1`;
- stderr classification: `RESPONSE_PARSE_ERROR`;
- stdout presence: `true`;
- parser category: `null` because the safe parser was not reached.

No raw command output, network inspect object, unapproved label, endpoint payload or private host metadata is persisted in this report. The prior synthetic `INVALID_SCHEMA` defect is closed, but the actual Docker template failure is a new exact helper blocker. This gate does not infer which individual Go-template expression failed, edit the template again or rerun it.

### 12. Container evidence

Container projection completed before the new network command failure, but the collector emits the resource-baseline finding only after all three resource classes succeed. Container data is therefore not promoted as standalone accepted evidence.

### 13. Resource baseline

An `OBSERVED RESOURCE BASELINE` was **NOT FORMED**. Volume and container projection completed, but actual network inspection did not reach safe parsing. Missing network evidence cannot be replaced with partial container/volume results.

### 14. Freshness

Freshness/collision evaluation was **NOT REACHED**. Session state remains `SESSION_ID_NOT_RESERVED` and phase-pending. No session identity was produced or reserved.

### 15. Historical residue

Historical volumes remained representable through the corrected volume projection, but complete cross-resource residue classification was not reached. No historical container, volume or network was accepted for a future session, and no cleanup or mutation occurred.

### 16. Images

Local image inventory and image Config inspection were **NOT REACHED** because the resource baseline failed first. No image was pulled or modified.

### 17. Declared volumes and digests

Image-declared volumes, actual digest comparison and approved expected digest evaluation were **NOT REACHED**. Image preparation and human digest approval remain separate phase-pending matters, not evidence supplied by this execution.

### 18. Resource graph

The resource relationship graph was **NOT REACHED**. No partial attachment set or inferred edge is substituted for the missing complete network evidence.

### 19. Host listeners

The fixed `59320–59329` host-listener inspection was **NOT REACHED**. Historical listener output is not reused as current evidence.

### 20. H-14

The H-14 aggregate was **NOT REACHED** and is not reported as runtime PASS. Phase-pending branches cannot be aggregated while a concrete helper failure prevents completion of the resource baseline.

### 21. CT-01–20 readiness

All **187/187** synthetic contract tests pass, including the network-focused cases and every prior cross-regression. This demonstrates bounded contract coverage, not completed instance readiness. CT-01–20 actual readiness remains **PARTIAL/BLOCKED** at `NETWORK_INSPECT` before safe projection; phase-pending Gate 6A/6B matters are not misclassified as the cause.

### 22. Gate 5 readiness

Gate 5 remains **BLOCKED**. The package is not ready for Gate 5 pre-authorization review because the actual network-inspect command template has a new concrete helper defect. A separate, narrowly authorized correction/review gate is required before any future instance inspection may be considered.

### 23. Final classification

**B — NETWORK PROJECTION CORRECTION PASS — NEW EXACT INSTANCE/HELPER BLOCKER.**

The exact new blocker is `NETWORK_INSPECT` → `DOCKER_CLI_EXIT` → `RESPONSE_PARSE_ERROR` (argument template `RESOURCE_SAFE_PROJECTION`, exit code 1). This is B because the bounded semantic correction closes the prior synthetic `INVALID_SCHEMA` cause but the one actual execution cannot reach network parsing or complete pre-start evidence. It is not A because the legal phase boundary was not reached; not C because the existing contract safely represents the synthetic legal metadata; and not D because no foreign/colliding network or unacceptable option/attachment was accepted or established before the command failed.

### 24. Checkpoint

No checkpoint is permitted for classification B. No commit or push was performed. The next allowed work, only if separately authorized, is limited to static diagnosis and correction of the exact `NETWORK_INSPECT / RESOURCE_SAFE_PROJECTION` command-template failure; it must not reuse this gate as execution authorization.

### 25. Authorization boundary

Gate 5 does not pass. Gate 6A, Gate 6B, Gate 6C, Environment Start, Docker or Docker-network mutation, image pull, SQL, Migration, Auth, cleanup, Remote Supabase, Production, commit and push remain unauthorized. No retry, automatic repair, alternate template, context change, resource deletion or continuation occurred.

## Network Inspect Command Compatibility Addendum

### 1. Previous failure

The previous single authorized inspector execution stopped before the network parser at `NETWORK_INSPECT` → `DOCKER_CLI_EXIT` → `RESPONSE_PARSE_ERROR`, argument template `RESOURCE_SAFE_PROJECTION`, exit code 1. The semantic network `INVALID_SCHEMA` correction remained closed; this was a command-compatibility failure, not a schema failure.

### 2. Command decomposition

| Stage | Reviewed behavior | Before correction |
|---|---|---|
| NI-01 target enumeration | `network ls --no-trunc` emits JSON-encoded full IDs | PASS |
| NI-02 argument construction | Fixed executable and args array; one validated 64-hex ID | PASS |
| NI-03 subprocess spawn | Direct `execFileSync`; no shell | PASS |
| NI-04 Docker CLI execution | Fixed complex Go `--format` template | **EXIT 1** |
| NI-05 stdout presence/shape | stdout present, but not accepted | BLOCKED by NI-04 |
| NI-06 safe stderr classification | Prior generic enum was too broad | CORRECTED |
| NI-07 structured parse | Not reached | NOT REACHED |
| NI-08 semantic projection | Existing builtin/IPAM correction | NOT REACHED; unchanged |
| NI-09 schema validation | Existing safe selected shape | NOT REACHED; unchanged |
| NI-10 comparator | Exact resource/graph checks | NOT REACHED |

The command was `docker --context <validated-context> network inspect --format <fixed Go template> <one enumerated ID>`. Builtin and user-defined networks used the same read-only command. Empty enumeration produced no inspect invocation. IDs were passed as args, not interpolated into a shell command.

### 3. Exact exit-1 cause

A bounded Docker 29.6.2 compatibility probe against the builtin `bridge` network reproduced exit code 1 and classified the in-memory stderr as `INVALID_FORMAT_TEMPLATE`; raw stderr and network metadata were not persisted. Therefore the exact failing layer is NI-04: Docker 29.6.2 rejected the complex fixed Go-format projection before the safe parser could run.

This closes the previous generic `RESPONSE_PARSE_ERROR` label. It does not claim that any actual network resource is unsafe or missing.

### 4. Safe stderr class

The bounded classifier now distinguishes `NETWORK_NOT_FOUND`, `INVALID_FORMAT_TEMPLATE`, `INVALID_ARGUMENT`, `UNSUPPORTED_OUTPUT_FORMAT`, daemon error, permission error, CLI usage error and unknown safe classification without persisting raw stderr. A disappeared enumerated network produces `NETWORK_NOT_FOUND` and fails closed; it is never converted to an empty baseline or retried.

### 5. Docker 29.6.2 compatibility

The corrected command uses Docker's native structured JSON response:

`docker --context <validated-context> network inspect <one validated full ID>`

The bounded parser requires exactly one JSON document in the response array and extracts only approved structural fields in memory. It then invokes the already-reviewed semantic projection that tokenizes IPAM addresses, separates attachment edges and preserves builtin/non-candidate semantics. Native raw output, arbitrary Options, unapproved labels and private address values are never added to evidence.

### 6. Correction classification

**CASE B — CLI formatting compatibility bug.** Docker 29.6.2 rejected the complex Go template. Replacing only the network command layer with native structured JSON removes the fragile template while preserving the existing N-05/N-07 safe semantic contract. No normative document or contract relaxation is required.

### 7. Invocation model

Target enumeration remains deterministic and read-only. For N observed full IDs, the helper performs exactly N native JSON inspect invocations, in the frozen enumeration order, with at most one invocation per ID. This is normal enumeration, not retry. Empty target sets perform zero inspect calls and form an empty observed network set. Invalid IDs, multiple IDs in one call, legacy `--format` network commands, repeated failed targets and shell-based commands are rejected.

Each successful invocation records only a target hash token, template ID `NETWORK_NATIVE_JSON_SINGLE`, exit code, signal, stdout presence/parse category and safe stderr enum. Any invocation failure aborts the entire baseline; no partial network or container/volume baseline is promoted.

### 8. Tests

All **199/199** synthetic tests pass: the previous 187 plus 12 command-compatibility/native-document cases. Added coverage includes a single builtin, a single user-defined network, multiple response documents, empty target set, invalid/multiple target args, disappeared target, rejected legacy format, nonzero invalid argument, valid native JSON, empty/malformed stdout, and independent safe stderr classifications. All prior volume, semantic network, container, image, ownership, listener and H-14 regressions remain passing.

### 9. New hashes before real execution

| Component | SHA-256 |
|---|---|
| `inspect/prestart.mjs` | `6e6d1256c37cef570d939c3f2186b9145abe96d5ad1278b5bb57d9a2698a73bf` |
| `lib/contracts.mjs` | `7cb8b34f9372e40741cff6c639bd142790836afd0b7ef3cfaaa5988a183e1243` |
| `lib/auditors.mjs` | `164c892c5fded81c4640657371b02b37b8e449751c7a9492ae544ab9a299cf2c` |
| `lib/metadata.mjs` | `8b9a78b2e3baf7206bccf875220e6b96c1966f732f83386d48bb677a1b5c0c3d` |
| `schemas/evidence.schema.json` | `af7a268fce0f1cb1739171ff4238efebc248f06e1a57c9677d931ee1694faec5` |
| `fixtures/synthetic.mjs` | `04bf300fa3baf8f03da994a90aa38671af42731f39010cfa1d0addd3b047004b` |
| `tests/contracts.test.mjs` | `3adfe578690b1c0992f462ffeeaaad4f18edfdeabcf01ad20a5799fedd856639` |

### 10. Read-only audit

PASS before the one permitted full inspector execution: no writer import, shell execution, Docker mutation, network client, retry, raw stderr persistence, secret persistence or absolute user path. The child environment remains explicit. The allowlist permits only one native network inspect ID per invocation and rejects network mutation, raw format, empty, invalid and multi-target invocations. `git diff --check`, whitespace and synthetic regressions pass. Protected documents, the Docker diagnostic and Migration 001–008 remain unchanged.

### 11. Identity guard

The one authorized full normal-user inspector execution ran exactly once. D-01 through D-06 all passed: frozen Docker executable, Docker 29.6.2, context `desktop-linux`, approved local Unix socket, daemon connectivity and safe Docker Desktop `aarch64` identity. The envelope timestamp was `2026-08-28T10:36:35.230Z` and its aggregate helper SHA-256 was `7c88a6e84261e7aeca92182e52a1f10c533578545b2803a4a83aec36fa1c438e`.

The earlier bounded compatibility probe was not a full inspector execution; it invoked only the old fixed template against builtin `bridge`, persisted only a safe enum, and performed no retry or state change.

### 12. Volume regression

**PASS.** Container and volume projection completed and execution advanced into native network JSON parsing. The prior daemon-VM Mountpoint failure did not recur. Partial container/volume evidence is not promoted independently.

### 13. Actual network evidence

The command correction itself passed its former failure point:

- native `NETWORK_INSPECT` command: exit 0;
- argument template: `NETWORK_NATIVE_JSON_SINGLE`;
- stdout presence: true;
- raw stderr: absent/not persisted;
- native JSON document: entered bounded parse;
- legacy Docker Go template: not used.

The execution then stopped at a new exact safe-parser blocker:

- stage: `STDOUT_PARSE`;
- command class: `NETWORK_INSPECT`;
- parser category: `NETWORK_NATIVE_IPAM_IPRANGE`;
- failed predicate: an actual native IPAM config row did not satisfy “`IPRange` is present and is `null` or a string”;
- bounded evidence does not distinguish missing from a different safe type, so this report does not guess beyond that predicate;
- raw network JSON, addresses, labels and endpoint payload persisted in this report: no.

This package does not reinterpret missing as empty, modify the parser again, or rerun. Actual network evidence remains **NOT ACCEPTED** even though Docker command compatibility is closed.

### 14. Resource baseline

An `OBSERVED RESOURCE BASELINE` was **NOT FORMED**. Container and volume phases completed, but the first incomplete native network document stopped the all-resource baseline before network semantic projection/comparison could complete.

### 15. Freshness

Freshness/collision evaluation was **NOT REACHED**. `SESSION_ID_NOT_RESERVED` remains phase-pending; no new session identity was generated or reserved.

### 16. Historical residue

Historical volume metadata remained representable, but complete container/network residue, attachment and ownership classification was not reached. No resource was accepted for a future session and no cleanup occurred.

### 17. Images

Local image inventory and image Config inspection were **NOT REACHED**. No image was pulled or changed.

### 18. Declared volumes and digests

Image-declared volumes, actual digest state and approved expected digest evaluation were **NOT REACHED**. Human digest approval and image preparation remain independent phase-pending matters.

### 19. Resource graph

The resource graph was **NOT REACHED**. No partial container/volume/network relationship set is substituted for a complete baseline.

### 20. Listeners

The current `59320–59329` host-listener inspection was **NOT REACHED**. Historical results are not reused.

### 21. H14

H-14 aggregation was **NOT REACHED** and is not reported as runtime PASS. The concrete native network parser failure is not mislabeled as normal Gate 6 phase separation.

### 22. Gate 5 readiness

Gate 5 remains **BLOCKED**. The command-compatibility defect is closed, but the actual native parser has a new exact optional-field predicate defect. The package is not ready for Gate 5 pre-authorization review.

### 23. Final classification

**B — NETWORK INSPECT COMMAND CORRECTION PASS — NEW EXACT BLOCKER.**

The exact new blocker is `NETWORK_INSPECT` → `STDOUT_PARSE` → `NETWORK_NATIVE_IPAM_IPRANGE`. This is B because Docker 29.6.2 command compatibility succeeded but complete instance evidence did not reach its legal boundary. It is not A because the resource baseline, images, listeners and H-14 did not complete; not C because safe native JSON inspection worked; and not D because no unsafe local resource or daemon regression was established.

No checkpoint is permitted for B. No commit or push was performed. Any next work requires a separate authorization limited to the exact optional `IPRange` native-projection rule; this result does not authorize another inspector run.

## Network Native IPAM IPRange Predicate Addendum

### 1. Previous blocker

The preceding exact blocker was `NETWORK_INSPECT` → `STDOUT_PARSE` → `NETWORK_NATIVE_IPAM_IPRANGE`. The native projection incorrectly required every IPAM row to contain `IPRange`, even though the field can be absent in the observed Docker 29.6.2 shape. This addendum covers only that optional-field predicate and does not redesign the already verified native single-network inspect command.

### 2. Actual shape classification

A bounded read-only shape probe inspected three local networks without persisting native JSON, names, IDs, addresses, labels or endpoint payloads. It observed two networks with `IPAM.Config = null` and one IPAM row whose `IPRange` property was `PROPERTY_MISSING`. No observed row used a null, string, empty-string or other JSON type for this field. The result is evidence about this local Docker 29.6.2 instance, not a permanent guarantee for every Docker release.

### 3. Presence, null and type semantics

The corrected contract keeps these states distinct:

- missing property: accepted as `ABSENT` and the native-to-safe projection does not fabricate an `ipRange` property;
- explicit null: accepted as `NULL`;
- empty string: accepted as `PRESENT` plus `EMPTY`, never normalized to missing;
- non-empty string: accepted only after separate CIDR validation and then tokenized;
- number, boolean, object and array: fail closed.

`Subnet` and `Gateway` remain independently required on every IPAM config row and must each be null or a string. `AuxiliaryAddresses` remains independently validated by its pre-existing predicate. An optional `IPRange` does not make the rest of the row permissive.

### 4. Correction classification

**CASE A — Optional-field presence bug.** The observed legal row omitted the property, while the former predicate required it to be present. This is not a nullability expansion, a native-type expansion or acceptance of unsafe metadata.

### 5. Predicate change

The native projector now accepts `IPRange` only when it is absent, null or a string. It copies the field into the selected projection only when the native property exists. The semantic network parser allows the projected property to be absent and records explicit `presence` state. It does not accept arbitrary keys, arbitrary nesting or an arbitrary IPAM row.

The Docker command remains exactly the previously approved native form: one validated context, one `network inspect` operation and one validated 64-hex network ID, without Go-format, shell, multi-target formatting or alternate Docker commands.

### 6. Syntax validation

String type alone is not sufficient for a non-empty `IPRange`. A dedicated predicate requires an IPv4 or IPv6 CIDR with a numeric prefix in the correct range. Valid strings are represented only by address-family classification and a SHA-256 token; exact CIDR text is not retained in safe semantic evidence. Empty string remains its own state. Malformed CIDR fails closed as `NETWORK_IP_RANGE_CIDR`.

### 7. Regression tests

The synthetic suite passed **216/216**. Coverage includes missing, null, empty, valid IPv4 CIDR, valid IPv6 CIDR, malformed CIDR, number, boolean, object, array, missing `Config`, null `Config`, empty `Config`, and multiple rows with mixed optional presence. Native command compatibility, builtin networks, nullable IPAM config, volume, container, ownership, listener, image and H-14 tests continued to pass.

### 8. New hashes

The re-frozen bounded helper set is:

| Source | SHA-256 |
| --- | --- |
| `inspect/prestart.mjs` | `69c9c4e34a0155e2edb72eed9f73cc55685798b05d1be6caf83e75a773d8bb1c` |
| `lib/contracts.mjs` | `21d1fed853bc1ba9735bedc05df9eed7e3ed9db00a772bd081aefe7856975576` |
| `lib/auditors.mjs` | `164c892c5fded81c4640657371b02b37b8e449751c7a9492ae544ab9a299cf2c` |
| `lib/metadata.mjs` | `8b9a78b2e3baf7206bccf875220e6b96c1966f732f83386d48bb677a1b5c0c3d` |
| `schemas/evidence.schema.json` | `af7a268fce0f1cb1739171ff4238efebc248f06e1a57c9677d931ee1694faec5` |
| `fixtures/synthetic.mjs` | `04bf300fa3baf8f03da994a90aa38671af42731f39010cfa1d0addd3b047004b` |
| `tests/contracts.test.mjs` | `5047e4e731776c69ba5dc522f446ebef4d6484ef67617b2b51644c572360239b` |

Aggregate helper SHA-256: `a621f5f19da56ca65a0424934429a5422e6926c644baec6b48e582610966ed46`.

The protected Docker diagnostic remains `34471709780d63ac9429b1e4cbd363b298562421be9b113a5a3b5d24fd6886e9`.

### 9. Read-only audit

Static and synthetic audits passed: no filesystem writer, Docker mutation, shell invocation, retry, network client import, raw stderr persistence, raw Docker JSON persistence, secret output or absolute user path was introduced. Docker subprocesses retain their explicit child environment and fixed allowlist. `git diff --check` passed before the real execution. No Docker resource, context, network, image or Supabase state was changed.

### 10. Identity guard

The one permitted full read-only inspector execution ran under the same repository process identity. D-01 through D-06 all passed. The Docker executable SHA-256 was `c9766c884e4f2de2aadf8eba072d4a19f45e7f7535138cd0c8bac143f1c26644`; client-version parsing, `desktop-linux` context selection, approved local Unix endpoint validation, server connectivity and daemon safe projection passed. There was no fallback runtime, context change, retry or restart.

### 11. Actual network evidence

The real execution progressed beyond `NETWORK_NATIVE_IPAM_IPRANGE`, confirming that the observed missing-property row is now accepted without fabrication. It then stopped at a new exact safe-parser blocker:

- stage: `STDOUT_PARSE`;
- command class: `NETWORK_INSPECT`;
- argument template: `NETWORK_NATIVE_JSON_SINGLE`;
- parser/predicate: `NETWORK_NATIVE_AUXILIARY_ADDRESSES`;
- safe error classification: the native row failed the existing requirement that `AuxiliaryAddresses` be present and either null or an object; the bounded diagnostic does not distinguish property absence from another native type and does not guess;
- stdout presence: true;
- raw stderr observed or persisted: no;
- raw native network JSON persisted: no.

Per the new-exact-blocker and no-retry rules, no further probe, predicate change or inspector execution occurred.

### 12. Resource baseline

An `OBSERVED RESOURCE BASELINE` was **NOT FORMED**. The inspector stopped during native network projection before all network rows could be safely projected and before a complete all-resource baseline could be emitted. Partial container or volume observations are not substituted for a complete baseline.

### 13. Freshness

Freshness classification was **NOT REACHED**. `SESSION_ID_NOT_RESERVED` remains a legitimate phase-pending condition, but it was not the cause of this stop and is not reported as runtime PASS.

### 14. Historical residue

Complete historical container, volume, network, attachment and ownership residue classification was **NOT REACHED**. No historical asset was accepted for a future session, altered, removed or cleaned up.

### 15. Images

Local image inventory, image Config projection, declared-volume evaluation and digest status were **NOT REACHED**. No image was pulled, tagged, changed or approved. Independent digest approval and later image preparation remain separate phase-pending work.

### 16. Resource graph

The complete resource graph was **NOT REACHED** because no complete network baseline existed. No partial graph was promoted to accepted evidence.

### 17. Listeners

The `59320–59329` host-listener phase was **NOT REACHED**. Historical listener evidence was not reused and no port was changed.

### 18. H-14

H-14 aggregation was **NOT REACHED** and is not reported as PASS or normal phase separation. The concrete native auxiliary-address parser failure remains the controlling blocker.

### 19. Gate 5 readiness

Gate 5 remains **BLOCKED**. The bounded IPRange correction and its actual-data verification passed, but complete pre-start evidence did not reach the legal phase boundary because of the new exact helper predicate blocker. Gate 5 is not passed or entered.

### 20. Final classification

**B — NETWORK NATIVE IPAM IPRANGE CORRECTION PASS — NEW EXACT BLOCKER.**

The exact next blocker is `NETWORK_INSPECT` → `STDOUT_PARSE` → `NETWORK_NATIVE_AUXILIARY_ADDRESSES`. This is B because the permitted IPRange defect is closed but complete helper evidence remains incomplete. It is not A because the resource baseline, images, graph, listeners and H-14 did not complete; not C because the corrected IPRange contract remained fail-closed; and not D because this bounded evidence does not establish unsafe local network metadata.

No checkpoint is permitted for B. No commit or push was performed. Any next work requires separate authorization limited to the exact auxiliary-address native-projection predicate; this addendum does not authorize a probe, another inspector execution, Gate 5, Gate 6, Environment Start or any mutation.

## Network Native IPAM Row Optional-Field Final Closure Addendum

### 1. Prior AuxiliaryAddresses blocker

The prior exact blocker was `NETWORK_INSPECT` → `STDOUT_PARSE` → `NETWORK_NATIVE_AUXILIARY_ADDRESSES`. The former native predicate required every `IPAM.Config[]` row to contain `AuxiliaryAddresses` and required its value to be null or an object. This addendum closes the bounded native-row contract for `Subnet`, `IPRange`, `Gateway` and `AuxiliaryAddresses`; it does not redesign network inspection, ownership, resource acceptance or any normative document.

### 2. Actual shape

A bounded read-only shape inspection observed three local networks and one IPAM config row. Two networks had `IPAM.Config = null`. The one row was a valid object with no unknown field: `Subnet` and `Gateway` were strings, while `IPRange` and `AuxiliaryAddresses` were both `PROPERTY_MISSING`. No native JSON, network ID, name, address, label or attachment payload was persisted.

The actual AuxiliaryAddresses classification is therefore **PROPERTY_MISSING**. The parent row was not malformed and no unknown key was observed.

### 3. Full IPAM field matrix

The [Docker Engine API network model](https://docs.docker.com/reference/api/engine/version/v1.52/) represents these as properties of an IPAM config object without making this helper infer presence from one observed instance. The bounded safety projection retains the existing null/empty observation states while applying independent semantic validation:

| Field | Required | Optional | Nullable in safe observation contract | Valid native type when present | Non-empty semantic validation |
| --- | --- | --- | --- | --- | --- |
| `Subnet` | No | Yes | Yes | string or null | IPv4 or IPv6 CIDR |
| `IPRange` | No | Yes | Yes | string or null | IPv4 or IPv6 CIDR |
| `Gateway` | No | Yes | Yes | string or null | IPv4 or IPv6 address, without CIDR suffix |
| `AuxiliaryAddresses` | No | Yes | Yes | object map or null | bounded non-empty safe key; every value is an IPv4 or IPv6 address string |

Optionality does not imply arbitrary acceptance. The raw row may contain only these four reviewed fields. A non-object row, unknown field, invalid type or invalid non-empty value fails closed.

### 4. Presence and null semantics

All four fields preserve separate states:

- `ABSENT`: native property missing;
- `PRESENT_NULL`: native property explicitly null;
- `PRESENT_EMPTY`: empty string for address fields or empty object for auxiliary addresses;
- `PRESENT_VALID`: validated non-empty value;
- `PRESENT_INVALID_TYPE`: fail closed;
- `PRESENT_INVALID_VALUE`: fail closed.

Missing is never converted to null or empty; null and empty are never converted to absent. The safe projection records presence explicitly and never fabricates a native value.

### 5. AuxiliaryAddresses object contract

Missing projects to `{ presence: "ABSENT", count: 0, token: null }`; null remains `NULL`; `{}` remains `EMPTY`; a non-empty object becomes `PRESENT`. Every key must be non-empty, free of unsafe control/secret patterns and at most 255 UTF-8 bytes. Every value must be a non-null IPv4 or IPv6 address string. Number, boolean, scalar string, array, nested object, null map value and malformed IP all fail closed.

Validated entries are deterministically sorted and represented only by count plus a SHA-256 token. Keys and addresses are not retained in safe evidence.

### 6. Gateway contract

Gateway is optional. Missing, explicit null and empty string remain distinct safe observation states. A non-empty string must be a valid IPv4 or IPv6 address and must not include a CIDR suffix. Malformed strings, numbers, objects and arrays fail closed. Safe evidence stores only address-family classification and a SHA-256 token.

### 7. Subnet contract

Subnet is optional in the native-row projection. Missing, explicit null and empty string remain distinct safe observation states. A non-empty string must be a valid IPv4 or IPv6 CIDR with an in-range prefix. Malformed CIDR and non-string native types fail closed. This does not assert that an absent subnet is sufficient for later resource acceptance; it only permits accurate fail-closed observation without fabrication.

### 8. IPRange regression

The previously closed behavior remains intact: absent, null and present-empty are distinct; valid IPv4 and IPv6 CIDRs are classified and tokenized; malformed CIDR and non-string values fail closed. The native projector still omits the selected `ipRange` property when the source property is absent.

### 9. Unknown-field behavior

Every native IPAM config row must be an object whose keys are a subset of the four reviewed fields. Any additional key fails as `UNKNOWN_NATIVE_IPAM_FIELD`. No unknown safety-relevant field is silently dropped, normalized, accepted through `additionalProperties`, or deferred to a later execution.

### 10. Correction classification

The observed AuxiliaryAddresses blocker is **CASE A — Optional-field presence bug**. The bounded final closure also adds the required **CASE C — Native object-map handling** validation for auxiliary entries and **CASE D — IP semantic validation** for non-empty Subnet, IPRange, Gateway and auxiliary values. No CASE E metadata was observed or accepted.

### 11. Tests

The complete synthetic suite passed **259/259**. Added coverage includes all required AuxiliaryAddresses, Gateway, Subnet, IPRange, minimal-row, fully populated row, mixed-presence, multiple-row, malformed-row and unknown-field cases. Native network command, builtin networks, volume, container, ownership, image, listener and H-14 cross-regressions all remained PASS.

### 12. New hashes

The re-frozen helper set is:

| Source | SHA-256 |
| --- | --- |
| `inspect/prestart.mjs` | `8adf864f91534bc265bcdc0f11665690872cfb55f8c9ab5c959e9e3712eaa048` |
| `lib/contracts.mjs` | `7f520291495287f40a58c17410a7286d09041cb7bb0de2cbefead01fcf3dc9c9` |
| `lib/auditors.mjs` | `164c892c5fded81c4640657371b02b37b8e449751c7a9492ae544ab9a299cf2c` |
| `lib/metadata.mjs` | `8b9a78b2e3baf7206bccf875220e6b96c1966f732f83386d48bb677a1b5c0c3d` |
| `schemas/evidence.schema.json` | `af7a268fce0f1cb1739171ff4238efebc248f06e1a57c9677d931ee1694faec5` |
| `fixtures/synthetic.mjs` | `3daf216ba44a89ead9dc7f35df6309088e1fefaef97a56311d373b87a7f34c57` |
| `tests/contracts.test.mjs` | `8bd9891b824a3060cda9b0b0d763b4a84fec01e546092e892e9a6f3678875e3a` |

Aggregate helper SHA-256: `612faacbd7bfd8371c77d09d4519f6f1495d02a7e5ddcc7ab19af13126262140`.

The protected Docker diagnostic remains `34471709780d63ac9429b1e4cbd363b298562421be9b113a5a3b5d24fd6886e9`.

### 13. Read-only audit

Static and synthetic audits passed: no filesystem writer, Docker/network mutation, shell, retry, external network client import, raw stderr persistence, raw Docker JSON persistence, secret output or user absolute path was introduced. Docker child processes retain the explicit environment allowlist. `git diff --check` passed before the real execution. No image pull, Docker resource change, Supabase action or cleanup occurred.

### 14. Identity guard

The one authorized full read-only inspector execution used the same repository process identity and approved local Docker path. D-01 through D-06 passed. Docker executable SHA-256 was `c9766c884e4f2de2aadf8eba072d4a19f45e7f7535138cd0c8bac143f1c26644`; client-version parsing, `desktop-linux`, the approved local Unix endpoint, server connectivity and daemon safe projection all passed. There was no fallback runtime, context change, restart or retry.

### 15. Actual network evidence

Native inspection completed for all three enumerated networks. The single IPAM row safely projected as:

- Subnet: `PRESENT:IPV4`;
- IPRange: `ABSENT:ABSENT`;
- Gateway: `PRESENT:IPV4`;
- AuxiliaryAddresses: `ABSENT`, count zero.

Two networks retained `IPAM.Config = null`. This confirms the four-field row closure against the current instance without persisting exact addresses or identities.

### 16. Resource baseline

A complete persistent-resource baseline was formed before the later image-stage failure: zero containers, 39 volumes and three networks. All three network inspections completed, the one IPAM row passed full projection, and no partial network row was substituted. These counts are observation evidence, not acceptance of any asset for a future session.

### 17. Freshness

Freshness was reached and correctly returned `AMBIGUOUS` with reason `SESSION_ID_NOT_RESERVED`. This is expected phase separation, not a helper defect and not runtime PASS.

### 18. Historical residue

The baseline records historical local volume and default-network metadata without names or raw payloads in this report. No resource was assigned to a future session, accepted, modified, removed or cleaned up. Candidate-session collision evaluation remains partial because no session ID was reserved; the reserved port collision count observed in the resource baseline was zero.

### 19. Images

Local image ID enumeration was entered after the complete resource baseline. The first safe image Config projection stopped at a new exact non-IPAM blocker:

- stage: `DOCKER_CLI_EXIT`;
- command class: `IMAGE_INSPECT`;
- argument template: `IMAGE_SAFE_PROJECTION`;
- exit code: 1;
- stderr classification: `INVALID_FORMAT_TEMPLATE`;
- stdout presence: true;
- raw stderr or raw image JSON persisted: no.

No image projection, role table, declared-volume evaluation or digest status was emitted. No image was pulled or changed. Per the no-retry rule, the image command was not rerun and its template was not modified.

### 20. Resource graph

The graph phase was **NOT REACHED** because image inspection stopped the execution before graph construction. The completed resource baseline is not relabeled as a completed graph.

### 21. Current listeners

The current `59320–59329` listener phase was **NOT REACHED**. Historical listener results were not reused and no port or process was changed.

### 22. H-14

H-14 aggregation was **NOT REACHED** and is not reported as PASS. The new non-IPAM image-format blocker is not misclassified as normal Gate 6 phase separation.

### 23. CT-01–20

| Contract | Current bounded status |
| --- | --- |
| CT-01 | PASS/PARTIAL-ACCEPTABLE provenance; no source-equivalence claim |
| CT-02 | PASS through D-01–D-06; local endpoint and daemon identity reconfirmed |
| CT-03 | GATE-6B-PENDING; no writer or materialization occurred |
| CT-04 | PARTIAL: complete persistent baseline, but no reserved session identity |
| CT-05 | GATE-6B-PENDING; no platform SQL execution |
| CT-06 | GATE-6B-PENDING; SQL-C/D exclusion remains phase-pending |
| CT-07 | BLOCKED at `IMAGE_INSPECT` invalid format template before image evidence |
| CT-08 | GATE-6B-PENDING; notifier policy unchanged |
| CT-09 | GATE-6B-PENDING; telemetry/home policy unchanged |
| CT-10 | PARTIAL: safe temp metadata only; execution root remains phase-pending |
| CT-11 | GATE-6B-PENDING; intrinsic `.temp` remains later effective-config work |
| CT-12 | GATE-6B-PENDING; Edge runtime image/config evidence not reached |
| CT-13 | GATE-6B-PENDING; pg-delta effective reader proof remains pending |
| CT-14 | PARTIAL: resource port count observed, current host-listener phase not reached |
| CT-15 | PASS/PARTIAL: full current native IPAM projection and network baseline completed; later acceptance remains pending |
| CT-16 | PARTIAL: historical resources observed; rollback not executed |
| CT-17 | GATE-6B-PENDING; no execution retry occurred |
| CT-18 | PASS/PARTIAL: safe diagnostic emitted without raw payload persistence |
| CT-19 | PARTIAL: baseline formed, independent future-session acceptance not performed |
| CT-20 | BLOCKED by the new exact non-IPAM image format-template defect |

All CT-01–20 remain represented. Phase-pending items are not promoted to runtime PASS.

### 24. Gate 5 readiness

Gate 5 remains **BLOCKED**. IPAM row parsing, safe network projection and the complete persistent-resource baseline now pass, but the inspector did not reach its legal pre-start boundary because the image inspection helper has a new exact format-template compatibility defect. Gate 5 was neither entered nor passed.

### 25. Final classification

**B — IPAM ROW CONTRACT PASS — NEW NON-IPAM EXACT BLOCKER.**

The exact blocker is `IMAGE_INSPECT` → `DOCKER_CLI_EXIT` → `IMAGE_SAFE_PROJECTION` → `INVALID_FORMAT_TEMPLATE`. This is an allowed B because all four reviewed IPAM fields completed actual projection and the new defect is outside IPAM. It is not A because image evidence, graph, current listeners and H-14 did not complete; not C because unsafe IPAM shapes remain rejected; and not D because the observed network metadata passed the bounded safe contract.

No checkpoint is permitted for B. No commit or push was performed. The next work, if separately authorized, may address only the exact non-IPAM image format-template blocker. This result does not authorize Gate 5, Gate 6, Environment Start, image pull, Docker mutation, Supabase, SQL, Migration, Auth, cleanup or push.

## Foundation Pre-start Helper Final Closure

### 1. Baseline

This package continued from branch `codex/foundation-spike-design-correction` at HEAD `c2d2580d02deb1bd31fb7a6f8308941ac2ec07ab`. The immediately preceding effective baseline had 259/259 synthetic tests, aggregate helper SHA-256 `612faacbd7bfd8371c77d09d4519f6f1495d02a7e5ddcc7ab19af13126262140`, a complete zero-container/39-volume/three-network persistent baseline, and the exact blocker `IMAGE_INSPECT` → `DOCKER_CLI_EXIT` → `IMAGE_SAFE_PROJECTION` → `INVALID_FORMAT_TEMPLATE`.

The older numeric baseline quoted in the package request described an earlier IPAM stage. It was not used to overwrite or reinterpret the immediately preceding evidence. Protected normative documents, the Docker diagnostic, Product Definition and Migration 001–008 remained unchanged.

### 2. Authorized expanded scope

Work remained limited to the read-only pre-start helper, its safe contracts, synthetic fixtures/tests, evidence schema compatibility and this report. The package permitted bounded parser/projection corrections for container, volume, network and image native metadata, resource relationships and H-14 aggregation. It did not authorize Environment Start, Docker mutation, image pull, Supabase execution, SQL, Migration, Auth, cleanup or push.

### 3. Native field contract inventory

The static inventory covered every native field currently read by the helper. `Optional` means the property may be missing; nullable properties preserve explicit null separately. Missing is never fabricated as null or empty.

| Resource | Field | Required | Optional | Nullable | Valid native type | Semantic validation / safe treatment |
| --- | --- | --- | --- | --- | --- | --- |
| Container | `Id` | Yes | No | No | string | exact 64 lower-hex container identity |
| Container | `Name` | Yes | No | No | string | one bounded Docker name beginning with `/` |
| Container | `Image` | Yes | No | No | string | 64-hex identity with optional `sha256:` prefix |
| Container | `Config` | Yes | No | No | object | only ownership labels selected; Env and other fields not captured |
| Container | `Config.Labels` | No | Yes | Yes | object | only the two reviewed ownership labels selected; presence retained |
| Container | `State` | Yes | No | No | object | selected status/boolean/PID/exit-code fields preserve missing/null/value states; raw error omitted |
| Container | `HostConfig` | Yes | No | No | object | only `PortBindings` selected |
| Container | `HostConfig.PortBindings` | No | Yes | Yes | object | missing/null/empty/present distinct; every binding later validated |
| Container | `Mounts` | No | Yes | Yes | array | each row requires Type, Destination and RW; Name/Propagation optional; Source never captured |
| Container | `NetworkSettings` | Yes | No | No | object | only Ports and Networks selected |
| Container | `NetworkSettings.Ports` | No | Yes | Yes | object | missing/null/empty/present distinct; loopback-only published bindings enforced |
| Container | `NetworkSettings.Networks` | No | Yes | Yes | object | each map key retained as network name; IDs and aliases preserve optional states |
| Volume | `Name` | Yes | No | No | string | stable volume identity |
| Volume | `Driver` | Yes | No | No | string | `local` classified separately; other safe drivers observed, not approved |
| Volume | `Mountpoint` | No | Yes | Yes | string | daemon/VM lexical containment and opaque token; no host `realpath()` requirement |
| Volume | `Labels` | No | Yes | Yes | object | null/empty/present-not-captured state plus reviewed ownership labels only |
| Volume | `Scope` | No | Yes | Yes | string | missing/null/empty/present distinct |
| Volume | `Options` | No | Yes | Yes | object | values never captured; null/empty/present-not-captured distinct |
| Network | `Id` | Yes | No | No | string | exact network identity |
| Network | `Name`, `Driver` | Yes | No | No | string | builtin classification requires exact name/driver pair |
| Network | `Scope` | Yes in native document | No | No | string | null/empty/present retained by semantic layer where applicable |
| Network | `Internal`, `Attachable`, `Ingress`, `ConfigOnly`, `EnableIPv6` | Yes | No | No | boolean | retained as structural facts |
| Network | `IPAM` | Yes | No | No | object | Driver nullable; Config nullable array |
| Network | `IPAM.Config[]` | No | Yes through nullable Config | N/A | object rows | only Subnet, IPRange, Gateway, AuxiliaryAddresses accepted |
| Network | `Containers` | Yes in native document | No | Yes | object | every attachment retains validated container/endpoint relationship fields |
| Network | `Options`, `Labels` | Yes in native document | No | Yes | object | values excluded except reviewed ownership labels; collection state retained |
| Image | `Id` | Yes | No | No | string | exact `sha256:` config digest |
| Image | `RepoTags`, `RepoDigests` | No | Yes | Yes | array of strings | missing/null/empty/present distinct; evidence stores counts, while role matching remains in memory |
| Image | `Os`, `Architecture` | Yes | No | No | string | non-empty and not `unknown` |
| Image | `Variant` | No | Yes | Yes | string | missing/null/empty/present distinct |
| Image | `Config` | Yes | No | No | object | only reviewed safe structural fields selected; Env/Labels not captured |
| Image | `Config.Entrypoint`, `Config.Cmd` | No | Yes | Yes | array of strings | missing/null/empty/present distinct; only count and executable/network-bootstrap classes persist |
| Image | `Config.User`, `Config.WorkingDir` | No | Yes | Yes | string | missing/null/empty/present distinct |
| Image | `Config.ExposedPorts` | No | Yes | Yes | object | port/protocol keys validated; values must be empty objects or null |
| Image | `Config.Volumes` | No | Yes | Yes | object | destination keys must be absolute POSIX paths; values must be empty objects or null |
| Image | `Config.Healthcheck` | No | Yes | Yes | object | only Test, Interval, Timeout, Retries, StartPeriod and StartInterval; number fields are non-negative safe integers |

The presence contract is `ABSENT/MISSING`, `PRESENT_NULL/NULL`, `PRESENT_EMPTY/EMPTY`, `PRESENT_VALID/PRESENT`; invalid type and invalid value fail closed. Native JSON may be parsed in memory, but full inspect documents, Config.Env, unapproved labels, host sources, raw stderr and private host metadata are not persisted.

### 4. Parser and projection corrections

The image Go-format projection was removed from the allowlist and replaced with one native `image inspect <validated-sha256-id>` document followed by an in-memory safe-field selector. Legal missing fields observed across 15 local images no longer cause template failure. The output records explicit presence states and omits raw argv, Env, labels, history and rootfs payloads.

The container path was also closed statically before real execution. Its complex Go template was removed from the allowlist and replaced with one native `container inspect <validated-64-hex-id>` selector. Config.Env, mount Source, state Error and unrelated HostConfig/NetworkSettings fields are not captured. Container mount/network optional fields now preserve missing/null/empty/present semantics and retain relationship evidence without treating names as acceptance.

The already-successful volume Go projection was not redesigned. Network native JSON inspection and the four-field IPAM contract remained unchanged.

### 5. Network IPAM final contract

Subnet, IPRange and Gateway independently accept absent, null, empty and valid IPv4/IPv6 forms; malformed or wrong-type values fail closed. Non-empty Subnet/IPRange require CIDR; non-empty Gateway requires an address without CIDR. AuxiliaryAddresses independently accepts absent, null, empty object or a validated key-to-IP map; scalar, array, nested value, malformed key/IP and unknown IPAM-row field fail closed. Valid address content is represented only by family/count and SHA-256 token.

The actual three-network evidence retained two null Config collections and one safe row with Subnet/Gateway present, IPRange absent and AuxiliaryAddresses absent. Builtin `bridge`, `host` and `none` remain `BUILTIN_NETWORK / NOT FOUNDATION CANDIDATE`; their shape does not relax candidate acceptance.

### 6. Container audit

The native container projector and semantic parser cover required top-level identity/structural objects plus optional ports, mounts, networks, label and state subfields. Missing/null/empty port maps and resource collections remain distinguishable. Bind mounts may omit Name and Propagation without causing Source to enter evidence. Network ID, endpoint ID and aliases retain independent optional states. Unknown unselected native fields are not copied; malformed selected safety-relevant fields fail closed.

The real baseline contained zero containers, so no actual container document was invoked. This is a valid empty enumeration, not proof about a future runtime container shape; the synthetic closure prevents the prior template assumptions from being silently reused.

### 7. Volume regression

Volume regression remained PASS for all 39 observed local volumes. All used the local driver classification. Scope and Mountpoint optional states, label/options null-versus-empty states, daemon-VM path tokenization, unknown safety field rejection, ownership comparator and relationship comparator remained covered. Exact mountpoints and option values were not persisted.

### 8. Image audit

A bounded in-memory shape inventory covered 15 local images before the full inspector. Required Id/Os/Architecture/Config fields were present. Variant was missing on 14 and a string on one. Entrypoint, Cmd, User, WorkingDir, ExposedPorts and Healthcheck legitimately varied between missing and present; Volumes was missing on all 15. Healthcheck optional numeric fields also varied independently. This confirmed the old Go-template assumption was invalid without disclosing image identity, tag, digest, path or raw JSON.

Execution 1 safely projected all 15 images. None matched the 14 required Supabase role references. That outcome is `IMAGE PREPARATION REQUIRED — SEPARATE AUTHORIZATION`, not a helper failure; no pull occurred. Independent digest approval remains pending and actual data cannot approve itself.

### 9. Schema and comparator status

The evidence envelope remains strict and cannot report runtime PASS. Native document selectors require exactly one target document. Container/volume/network/image semantic outputs reject unknown selected fields and malformed types. Ownership comparisons remain independent from resource observation, resource names do not imply acceptance, graph comparators reject duplicates and foreign/missing edges, and expected values are never derived from actual values.

### 10. Synthetic tests

All **294/294** tests pass. Coverage includes container native shape variants; volume regressions; complete network IPAM optionality and malformed values; builtin/user-defined networks; attachment relationships; image native optionality and safe field selection; graph comparators; malformed/duplicate/truncated JSON; ownership; host listeners; H-14; source mutation audits; no raw capture; and command allowlist rejection of Docker mutations, shell/raw formats and noncanonical targets.

The count is evidence of the reviewed contract set, not an objective by itself.

### 11. Frozen helper hashes

| Source | SHA-256 |
| --- | --- |
| `inspect/prestart.mjs` | `7c77352891408d15fc534e34f802127f564fc55011a65fe38bc2d9437dee31c9` |
| `lib/contracts.mjs` | `4ea30e793791be29b339c949f4163c2d933908853d7e506dd99059a848ca93fa` |
| `lib/auditors.mjs` | `164c892c5fded81c4640657371b02b37b8e449751c7a9492ae544ab9a299cf2c` |
| `lib/metadata.mjs` | `8b9a78b2e3baf7206bccf875220e6b96c1966f732f83386d48bb677a1b5c0c3d` |
| `schemas/evidence.schema.json` | `af7a268fce0f1cb1739171ff4238efebc248f06e1a57c9677d931ee1694faec5` |
| `fixtures/synthetic.mjs` | `e9fc6808626425aabe5417b3b1f75bb01826a2ab62aa7c5c031065a1dcf080c9` |
| `tests/contracts.test.mjs` | `1de0940ecc024893ceabc03b7e0f765a92076078bf87e6f49da9ee8a9d876c05` |

Aggregate helper SHA-256: `6c7b4c123af8e19cdf42ad6b99922d0637345501e052945adcd2ed5f9bf7c353`.

The protected Docker diagnostic remained `34471709780d63ac9429b1e4cbd363b298562421be9b113a5a3b5d24fd6886e9`.

### 12. Read-only audits

Before Execution 1, syntax checks, `git diff --check`, 294 tests, source mutation audit, command allowlist tests and hash freeze passed. The helper contains no filesystem writer, shell execution, Supabase invocation, Docker mutation, automatic retry, cleanup or external network client. Docker receives an explicit child environment. Raw inspect JSON is processed only in memory; raw stderr and unapproved data are not persisted. Secret-pattern scan hits were confined to the detector expression and its synthetic rejection tests, not credentials or evidence. No absolute user path was introduced.

### 13. Execution 1

Execution 1 ran once at `2026-08-29T13:18:26.495Z` under effective numeric UID 501 and aggregate helper SHA-256 `6c7b4c123af8e19cdf42ad6b99922d0637345501e052945adcd2ed5f9bf7c353`. D-01 through D-06 all passed: the frozen Docker executable, Docker 29.6.2 parsing, `desktop-linux`, approved local user-scoped Unix endpoint, server connectivity and daemon safe projection. There was no target drift or fallback runtime.

The envelope result was `PARTIAL` with `error = null`, no diagnostic and no collection blocker. All 23 expected finding kinds were emitted. This is the intended legal pre-start result; the envelope is prohibited from claiming runtime PASS.

### 14. Bounded correction after Execution 1

Not used. Execution 1 encountered no in-scope parser, projection, schema, comparator or aggregation defect. No post-execution patch, retry, repair or cleanup occurred.

### 15. Execution 2

Not used and not needed. The package permits Execution 2 only after one in-scope Execution 1 defect is corrected on a newly frozen helper. Running it without such a defect would be an unauthorized extra execution, not verification.

### 16. Current observed resource baseline

`OBSERVED PRE-START RESOURCE BASELINE` formed successfully:

- containers: 0;
- volumes: 39, all classified `LOCAL`;
- networks: 3, all classified `BUILTIN_NETWORK`;
- network inspections: 3/3 native single-document PASS;
- network attachments: 0;
- reserved-port collisions from container mappings: 0.

This is observed persistent local metadata, not a verified future runtime resource set and not acceptance of historical assets for a new session.

### 17. Historical residue

Thirty-nine existing local volumes and three builtin networks were observed without cleanup or adoption. With no reserved session ID, they remain historical/foreign/ambiguous local residue rather than future-session candidates. No name or label was used to infer approval, and no resource was removed, renamed, repaired or reassigned.

### 18. Image and digest status

Fifteen existing images were inspected safely. The local image-ID enumeration was complete, but all 14 required role references were missing. `IMAGE PREPARATION REQUIRED — SEPARATE AUTHORIZATION` therefore remains phase-pending. Human-approved manifest/config digest evidence is also pending. No image was pulled, tagged, built, approved or modified.

### 19. Resource graph

The persistent resource graph was emitted with 0 container nodes, 39 volume nodes, three network nodes and zero container-mount, container-network or network-attachment edges. This is complete for the observed pre-start baseline. It does not predict the future Supabase runtime graph, establish ownership, or replace later resource-acceptance evidence.

### 20. Current host listeners

The current Execution 1 inspection of TCP and UDP listeners across `59320–59329` completed. Listener count was zero and the safe result was PASS. Historical listener evidence was not reused. No process was signalled and no port was changed.

### 21. H-14 aggregation

The real H-14 aggregate completed as `PARTIAL`, preserving the legal phase boundary:

- PASS: 13 sources;
- PARTIAL: 2 sources;
- `GATE-6B-PENDING`: 3 sources;
- UNKNOWN: 2 sources;
- `CONDITIONALLY EXTERNAL`: 1 source;
- DISABLED: 1 source.

No pending, missing or unknown source became PASS. `expectedValuesChanged`, `retryPerformed`, `repairPerformed` and `cleanupPerformed` all remained false.

### 22. CT-01–20 final bounded status

| Contract | Final bounded status |
| --- | --- |
| CT-01 | PASS/PARTIAL-ACCEPTABLE provenance; no source-equivalence claim |
| CT-02 | PASS through D-01–D-06; executable/context/endpoint/daemon reconfirmed |
| CT-03 | GATE-6B-PENDING; no writer or materialization |
| CT-04 | PARTIAL: complete observed baseline; session identity not reserved |
| CT-05 | GATE-6B-PENDING; no platform SQL execution |
| CT-06 | GATE-6B-PENDING; SQL-C/D effective exclusion remains later-phase |
| CT-07 | PARTIAL: 15 images projected; required image preparation and approved digests pending |
| CT-08 | GATE-6B-PENDING/CONDITIONALLY EXTERNAL notifier policy |
| CT-09 | GATE-6B-PENDING/UNKNOWN telemetry and execution-home policy |
| CT-10 | PARTIAL: safe temp metadata only; isolated execution root not materialized |
| CT-11 | GATE-6B-PENDING; intrinsic `.temp` remains effective-config work |
| CT-12 | GATE-6B-PENDING; Edge image/config unavailable without image preparation |
| CT-13 | GATE-6B-PENDING; pg-delta effective reader proof pending |
| CT-14 | PASS for current `59320–59329` listener scan |
| CT-15 | PASS/PARTIAL: native network projection and observed builtin baseline complete; candidate acceptance pending |
| CT-16 | PARTIAL: historical resources observed; rollback/cleanup not executed |
| CT-17 | PASS for no automatic retry; future execution retry policy remains gated |
| CT-18 | PASS/PARTIAL: safe complete envelope without raw payload persistence |
| CT-19 | PARTIAL: observed graph complete; independent future-session acceptance not performed |
| CT-20 | PASS for helper engineering closure to the legal pre-start boundary |

All 20 remain represented. A later-phase or unavailable-image status is not misclassified as a helper defect or runtime PASS.

### 23. Remaining legitimate phase-pending items

The remaining items are: Gate 6A session identity reservation; Gate 6B effective runtime configuration and input proofs; required image preparation; independent digest approval; future candidate resource-acceptance evidence; SQL-C/D runtime exclusion; notifier/telemetry/pg-delta policy closure; runtime/post-start graph and ownership equality; and all Environment Start evidence. Each requires its own applicable gate and authorization.

None is a remaining bounded parser/projection engineering defect. No session ID was generated to make freshness appear resolved.

### 24. Gate 5 readiness

**READY FOR GATE 5 PRE-AUTHORIZATION REVIEW.** Parser/projection engineering closure is complete, the current persistent baseline is formed, all locally readable images were safely projected, missing images and digest approval are correctly phase-classified, the observed graph and current listeners are complete, H-14 reached the legal pre-start boundary, and the collector reported no helper blocker.

Gate 5 itself is **NOT PASSED** and was not entered by this package.

### 25. Final classification

**A — FOUNDATION PRE-START HELPER FINAL CLOSURE PASS — READY FOR GATE 5 PRE-AUTHORIZATION REVIEW.**

This is A because no helper engineering defect remains and Execution 1 completed all pre-start collectors to their legal boundary. It does not claim required images exist, approve a digest, reserve a session identity, accept resources for a future session, pass Gate 5 or authorize Gate 6/Environment Start.

### 26. Checkpoint disposition

Classification A permits a bounded local checkpoint after final mechanical/non-regression verification. At most two commits may be used: one for the seven helper/test/schema files and one for the evidence report plus the pre-existing unchanged Docker diagnostic. Push remains prohibited. If staged scope, protected-file hashes, Migration 001–008 or final safety checks differ, checkpoint creation must stop.

### 27. Authorization boundary

Gate 5 PASS, Gate 6A, Gate 6B, Gate 6C, Environment Start, Docker mutation or cleanup, image pull/build, Supabase execution, SQL, Migration, Auth, Remote Supabase, Production, deployment and push remain unauthorized. This package made no state-changing Docker/Supabase action and grants no implied permission to continue.

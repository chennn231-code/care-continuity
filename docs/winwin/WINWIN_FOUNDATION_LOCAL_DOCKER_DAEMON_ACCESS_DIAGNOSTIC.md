# WinWin Foundation — Local Docker Daemon Access Diagnostic

Status: A — DIAGNOSTIC COMPLETE — SPECIFIC HUMAN-AUTHORIZED REPAIR IDENTIFIED

## 1. Purpose

Determine why the reviewed Foundation helper can resolve Docker Desktop's `desktop-linux` context and user-scoped Unix endpoint but receives `PERMISSION_DENIED` from the minimal read-only daemon query. This is a read-only diagnostic, not repair authorization, Gate progression, Environment Start, or Spike execution.

## 2. Frozen baseline

- Branch: `codex/foundation-spike-design-correction`
- HEAD: `c2d2580d02deb1bd31fb7a6f8308941ac2ec07ab`
- Initial tracked modifications: 0
- Initial staged files: 0
- Existing Foundation helper/report bundle: eight untracked files, unchanged by this diagnostic
- Implementation report fingerprint: 1,517 lines; 81,914 bytes; SHA-256 `d3cbe147202cbe4cd177ac28f44aa6f0df9ef4765dd0d1726e69692d59b0ed0b`
- Migration 001–008 and protected normative documents: unchanged

## 3. Previous D-05 evidence

The single reviewed decomposed inspector run established:

- D-01 executable resolution: PASS
- D-02 client version: PASS
- D-03 active context: PASS
- D-04 safe context projection: PASS
- D-05 minimal daemon connectivity: exit 1, `PERMISSION_DENIED`
- D-06 daemon identity: NOT RUN
- retry: none
- raw stderr: not persisted

No D-05 query was rerun in this diagnostic because filesystem/process evidence was sufficient to distinguish the dominant boundary.

## 4. Process identity

- effective UID classification: `EFFECTIVE_USER`
- effective GID classification: `EFFECTIVE_GROUP_SET`
- supplementary groups: present; numeric IDs and names not persisted
- working directory: `$REPOSITORY`
- parent PID: known
- process ancestry inspection: `BLOCKED_OR_UNAVAILABLE`
- full process-table inspection: `BLOCKED_OR_UNAVAILABLE`
- Codex permission/sandbox indicators: present; values not recorded

The inability to obtain process ancestry/process-table evidence is itself consistent with a restricted host-process observation boundary. It does not prove Docker Desktop is stopped.

## 5. Docker executable identity

- resolved class: `$DOCKER_APP/Contents/Resources/bin/docker`
- SHA-256: `c9766c884e4f2de2aadf8eba072d4a19f45e7f7535138cd0c8bac143f1c26644`
- version: Docker 29.6.2, build `dfc4efb`
- owner: `EFFECTIVE_USER`
- group: `EFFECTIVE_GROUP_SET`
- mode: `755`
- comparison with previous inspection: `UNCHANGED`

## 6. Active context

- active context: `desktop-linux`
- config `currentContext`: `desktop-linux`
- context metadata name: `desktop-linux`
- context metadata readable: yes
- endpoint scheme: `unix`
- endpoint: `unix://$HOME/.docker/run/docker.sock`
- TLS material: absent
- `SkipTLSVerify`: false

CLI config, active context, and context metadata agree. No context switch or alternate endpoint was tested.

## 7. Endpoint path resolution

The endpoint is a Docker Desktop user-scoped Unix socket, not a traditional Linux group-managed `/var/run/docker.sock` target.

| Path component | Exists | Type | Symlink | Owner | Group | Mode | Read | Write | Search |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `$HOME` | yes | directory | no | effective user | effective group set | `750` | allowed | denied | allowed |
| `$HOME/.docker` | yes | directory | no | effective user | effective group set | `755` | allowed | denied | allowed |
| `$HOME/.docker/run` | yes | directory | no | effective user | effective group set | `755` | allowed | denied | allowed |
| `$HOME/.docker/run/docker.sock` | yes | Unix socket | no | effective user | effective group set | `755` | allowed | denied | allowed |

Configured and canonical socket tokens are identical. No symlink or forwarding layer was observed in this path.

## 8. Socket metadata and access-layer distinction

Three different claims must remain separate:

1. **PATH ACCESSIBLE:** yes. The helper can resolve and traverse the endpoint path and inspect its metadata.
2. **SOCKET CONNECT PERMITTED:** no for the current process boundary. The socket is owned by the effective user and its owner mode includes write, yet `access(W_OK)` is denied and D-05 receives `PERMISSION_DENIED`.
3. **DOCKER API AUTHORIZED:** not established. The request cannot reach an accepted server response through this process boundary.

The mismatch between Unix ownership/mode and effective access is not explained by normal owner/group mode bits.

## 9. Environment overrides

All reviewed Docker routing overrides were absent:

- `DOCKER_HOST`
- `DOCKER_CONTEXT`
- `DOCKER_TLS_VERIFY`
- `DOCKER_CERT_PATH`
- `DOCKER_CONFIG`
- HTTP/HTTPS/all/no-proxy overrides

No environment conflict redirects context resolution or daemon connection.

## 10. Docker configuration metadata

- config directory/file: `$HOME/.docker/config.json`, readable
- keys observed: `auths`, `credsStore`, `currentContext`, `features`, `plugins`
- credential store: present; identifier/value not persisted
- registry auth section: presence observed; contents not read
- active context metadata source: tokenized `$HOME/.docker/contexts/meta/.../meta.json`
- config/context consistency: PASS

No credential, registry token, or encoded auth material was read or recorded.

## 11. Docker Desktop process state

Classification: `AMBIGUOUS`.

The process-table inspection itself was blocked or unavailable from the current process boundary. Therefore the absence of observed Docker processes cannot be reported as `NOT RUNNING`. The existing user-scoped socket and readable context metadata also do not independently prove backend health.

## 12. Access relation matrix

| Evidence | Result |
| --- | --- |
| Helper UID equals socket owner class | yes |
| Helper groups include socket group class | yes |
| Socket owner mode includes read/write/search | yes (`755`) |
| Parent directories are searchable | yes |
| Path/canonical socket resolution | PASS |
| Current process write-access evaluation | DENIED |
| Minimal Docker API query | `PERMISSION_DENIED` |
| Context/config endpoint consistency | PASS |
| Environment override conflict | absent |
| Host process-table observability | blocked/unavailable |

Overall relation: **FILESYSTEM METADATA APPEARS SUFFICIENT, BUT CURRENT PROCESS SANDBOX/PRIVACY BOUNDARY DENIES SOCKET ACCESS**.

## 13. Exact failure classification

Primary: **P-08 — Host process sandbox/privacy restriction**.

Supporting evidence:

- effective user and socket owner match;
- mode bits ordinarily grant owner access;
- path traversal and metadata reads succeed;
- process-level write access is denied;
- D-05 receives permission denied;
- Codex sandbox/permission-profile indicators are present;
- process ancestry and process-table observation are unavailable;
- context, config, and environment routing are internally consistent.

Secondary: **P-09 — Docker Desktop backend/session state cannot be fully observed from this boundary**.

There is insufficient evidence for P-01, P-02, P-03, P-04, P-05, P-06, or P-07 as the primary cause.

## 14. Confidence and limitations

Confidence in P-08: high.

Limitations:

- no direct Docker Desktop backend-process observation;
- no unsandboxed comparison query;
- no socket connection attempt beyond the previously authorized D-05 query;
- no API-level response was accepted;
- macOS privacy controls outside this process boundary were not changed or inspected through UI.

## 15. Minimal repair options

| Priority | Repair candidate | Exact issue addressed | State-changing? | Security consequence | Reversible | Changes target? | Human authorization |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Run the frozen, checksummed inspector once from a separately authorized local process boundary that permits access to the existing user-scoped Docker socket | P-08 current-process sandbox restriction | launches a new process; no Docker/config mutation | grants that process Docker daemon control-plane access; must remain exact-command and read-only scoped | yes, terminate process | no; retains `desktop-linux` | required |
| 2 | If option 1 still cannot connect, perform a separate Docker Desktop user-session/backend health review and decide whether a normal application restart is warranted | unresolved P-09 backend/session state | yes if restart chosen | interrupts Docker Desktop and may affect local assets/processes | generally yes, but operational impact exists | no | required |

Not recommended:

- `sudo docker ...`
- `chmod 666` on the socket
- Docker group changes
- switching to `default`
- setting `DOCKER_HOST`
- recreating the socket or context

These would change identity/target or broaden daemon access without addressing the evidenced process-boundary mismatch.

## 16. Recommended repair

Recommend option 1 only: obtain explicit authorization for one exact, frozen, read-only D-05/inspector invocation from an execution boundary that is allowed to connect to the existing `$HOME/.docker/run/docker.sock`, using the same effective user, `desktop-linux` context, binary hash, child environment allowlist, and no retry.

This is not authorization to restart Docker Desktop, modify socket permissions, switch context, start Supabase, or execute Gate 6A/6B.

## 17. Authorization required

Before the recommended action, Human Review must explicitly approve:

- the exact executable and checksum;
- the exact read-only command/template;
- execution outside the currently restrictive process sandbox;
- continued use of the same endpoint/context;
- one attempt only;
- fail-closed preservation if it still fails.

## 18. Final status

**A — DIAGNOSTIC COMPLETE — SPECIFIC HUMAN-AUTHORIZED REPAIR IDENTIFIED**

- Helper Implementation: COMPLETED
- Pre-start Inspector Closure: BLOCKED BY LOCAL INSTANCE
- Docker Access Diagnostic: COMPLETED
- Repair: NOT AUTHORIZED
- Gate 5: BLOCKED
- Gate 6A/6B/6C: NOT AUTHORIZED
- Environment Start: NOT AUTHORIZED
- Docker mutation: NOT AUTHORIZED
- SQL/Migration/Auth: NOT AUTHORIZED
- Spike: NOT YET ENTERED
- Remote Supabase/Production: NOT AUTHORIZED
- Push: NOT PERFORMED

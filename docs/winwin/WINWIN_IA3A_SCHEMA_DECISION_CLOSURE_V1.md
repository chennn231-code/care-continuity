# WinWin IA-3A Schema Decision Closure V1

Status: **Architecture decision closure — no migration, SQL, RLS, function, runtime, deployment, or production authorization**

Date: 2026-08-30

Baseline: `codex/foundation-spike-design-correction` at `b5393a40c0682d864907d860bf750c35ae3ff624`

IA-3 plan: `docs/winwin/WINWIN_IA3_BACKEND_PERSISTENCE_IMPLEMENTATION_PLAN_V1.md`, SHA-256 `090752202eb4d27273d39b8c03694b8d7f2e79fb8c12b24e7f4ccfa3d0ce483c`

## 1. Context and blocker summary

The first IA-3A Authority Foundation Schema implementation gate stopped correctly before mutation because four choices were not sufficiently frozen for safe physical authoring:

1. the gate used `QUESTION_CREATE` while the adopted Product/application vocabulary used `QUESTION_ASK`;
2. Logical Identity was semantically required but its separate-table disposition remained conditional;
3. the active and historical cardinality between Physical Actor/account and Logical Identity was not explicit;
4. capability and Grant-scope keys had no selected PostgreSQL representation.

This artifact closes only D1–D4. It does not create schema or reopen any other Product decision. The authoritative chain remains:

```text
Physical Actor / account link
→ selected Logical Identity
→ exact Case Membership lifecycle instance
→ exact Relationship lifecycle instance
→ one complete Grant lifecycle instance
→ Record Visibility / Responsibility Cycle
→ operation-specific Capability from that same Grant
→ Audit Event
```

## 2. D1 — Canonical Question capability

### Decision

The one canonical persisted capability is:

`QUESTION_ASK`

`QUESTION_CREATE` is a command/operation description only. It is not a persisted capability, synonym, alias, or compatibility value.

### Evidence

- `WINWIN_PRODUCT_AUTHORIZATION_WORKFLOW_DECISIONS_V1.md` freezes `QUESTION_ASK` in the final capability vocabulary.
- The adopted IA-2 `AuthorizationCapability` union contains `QUESTION_ASK` and not `QUESTION_CREATE`.
- `WINWIN_IA3_BACKEND_PERSISTENCE_IMPLEMENTATION_PLAN_V1.md` explicitly maps the `QUESTION_CREATE` operation to the frozen `QUESTION_ASK` capability.
- No later adopted authoritative artifact supersedes `QUESTION_ASK`.

The prior IA-3A reference to `QUESTION_CREATE` as a capability is therefore a drafting/gate wording error. It does not supersede the frozen vocabulary.

### Rejected alternatives

- **Persist `QUESTION_CREATE`: rejected.** It would diverge from both the frozen Product vocabulary and the adopted application contract.
- **Persist both names: rejected.** Aliases would create two authoritative spellings for one operation and invite inconsistent Grant proofs.
- **Rename all application/domain use now: rejected.** No later Product decision authorizes the rename, and stylistic preference is insufficient.

### Frozen invariant

Every Question-creation authorization decision tests `QUESTION_ASK` on one complete Grant Path. Unknown capability keys deny. No alias translation occurs inside authoritative storage or authorization queries.

### Future IA-3A migration impact

The initial capability definition rows are exactly:

- `RECORD_VIEW`
- `CARE_UPDATE_CREATE`
- `CARE_UPDATE_CORRECT`
- `QUESTION_ASK`
- `QUESTION_ANSWER`
- `QUESTION_RESOLVE`
- `ACTION_CREATE`
- `ACTION_ASSIGN`
- `ACTION_ACCEPT`
- `ACTION_DECLINE`
- `ACTION_START`
- `ACTION_COMPLETE`
- `ACTION_RELINQUISH`
- `ACTION_REASSIGN`
- `ACCESS_INVITE`
- `ACCESS_REVOKE`

There is no wildcard `ACTION_*`, `QUESTION_*`, or `ACCESS_*` row. Each listed capability is an exact controlled key. `ACCESS_GRANT` and any later capability require a separately reviewed additive vocabulary migration.

### Deferred

Question tables, commands, RLS, and UI remain Second Stage. Freezing `QUESTION_ASK` does not authorize their implementation.

## 3. D2 — Logical Identity physical persistence

### Decision

Choose **Option A: a separate `winwin_identities` table plus explicit lifecycle binding to the Foundation Physical Actor/account model**.

The minimum physical layers are:

```text
authentication provider account
→ winwin_account_actor_links
→ winwin_actor_references
→ winwin_identity_actor_bindings
→ winwin_identities
```

`winwin_identities.identity_id` is the stable WinWin domain identifier used by Membership, Relationship, Grant, authorship, participation, responsibility, cursor, activity, and audit facts. It is never `auth.users.id`, an email address, display name, profession, or `DemoRole`.

`winwin_actor_references` is the stable Physical Actor reference. `winwin_account_actor_links` is the replaceable authentication-account linkage. `winwin_identity_actor_bindings` is the explicit historical bridge from a Physical Actor to a Logical Identity.

A Logical Identity may be created before it has any Physical Actor binding. This supports invitation/assignment preparation and future participants who have not yet authenticated without inventing an account or using contact data as authority.

### Option comparison

| Option | Assessment | Decision |
|---|---|---|
| A. Separate `winwin_identities` plus explicit Actor/account binding | Strong semantic separation; supports non-login identities, multiple selected identities per account, account replacement, stable attribution, and new `winwin_*` isolation. Adds one small identity table and one lifecycle binding table | **SELECTED** |
| B. `winwin_identities` with one nullable/unique Actor FK | Separates the ID but makes binding a mutable column, obscures binding history, and makes Actor replacement or multiple identities per Actor awkward | Rejected |
| C. Foundation Actor row physically backs Logical Identity | Lowest table count, but makes the gate's required separation too easy to collapse and cannot naturally represent a Logical Identity without an authenticated Physical Actor | Rejected for IA-3 MVP |

### Rationale

- **Semantic separation:** the domain Identity has its own primary key and lifecycle.
- **Future non-login identities:** a participant can exist without an authentication binding.
- **Lifecycle stability:** account or Actor binding replacement does not change authorship, Membership, Grant, or responsibility references.
- **Historical attribution:** old bindings remain as lifecycle evidence.
- **Authorization joins:** Actor Context resolves an active account link and then an active Identity binding before evaluating a Case path.
- **Privacy/minimization:** identity rows need only opaque identity and server lifecycle metadata; profile, email, and health data are excluded.
- **MVP complexity:** two narrow tables are a bounded cost and avoid future migration of every Identity foreign key.
- **Legacy isolation:** no `v2_*` row becomes the new authority and migrations 001–008 remain historical.
- **Participant compatibility:** family/professional labels remain Relationship/display facts and never define Identity or authorization.

### Frozen invariant

Physical Actor and Logical Identity are separate authoritative entities. Authentication proves control of an account-to-Actor link; it does not itself prove which Logical Identity or Case path may be used.

### Future IA-3A migration impact

The restart may create these exact new-authority objects within its authorized scope:

- `winwin_actor_references`
- `winwin_account_actor_links`
- `winwin_identities`
- `winwin_identity_actor_bindings`

All foreign keys preserve history through restrictive deletion. No identity profile or care content belongs in these tables.

### Deferred

Identity verification, merge/split adjudication, organization ownership, delegation, impersonation, recovery UX, and profile data remain outside IA-3A.

## 4. D3 — Actor / Identity cardinality and lifecycle

### Active cardinality

For IA-3 MVP:

- one authentication-provider account subject has **at most one active** `winwin_account_actor_links` row;
- one Physical Actor has **at most one active authentication-account link** in the MVP;
- one Physical Actor may bind to **zero, one, or many active Logical Identities**;
- one Logical Identity binds to **zero or one active Physical Actor**;
- one Actor/Identity pair has **at most one active binding row**.

Allowing one Actor to bind multiple Logical Identities preserves the adopted account-session → selected-Identity model and the IA-2 evidence for secondary identities. It does not union their Memberships or Grants: every request selects exactly one Identity before constructing a Case authorization path.

Disallowing multiple active Actors for one Logical Identity avoids shared-account/impersonation semantics in the MVP. Such collaboration belongs to explicit Membership/Grant paths, not shared control of one Identity.

### Identity without Actor

Yes. A Logical Identity may exist with no Physical Actor binding. It has no authenticated Runtime Actor Context and cannot exercise authorization until an active account link and active Actor/Identity binding resolve it.

### Replacement and preservation

- Account replacement ends the old account-link lifecycle instance and creates a new account-link instance for the same Physical Actor where identity continuity is established by a later controlled workflow.
- Replacing a Physical Actor binding ends the old `winwin_identity_actor_bindings` row and creates a new row pointing to the same Logical Identity.
- The Logical Identity ID is preserved. Membership, Relationship, Grant, authorship, participant, and historical responsibility foreign keys do not change.
- Old account links and Actor/Identity bindings remain historical and cannot be reactivated.
- Replacement does not copy or union Grants; authorization is re-evaluated from the selected Logical Identity and its current exact Case path.

### Binding lifecycle object

The Actor/Identity binding is an explicit lifecycle object, not a mutable FK on `winwin_identities`.

Immutable binding facts:

- binding ID;
- Actor reference;
- Logical Identity reference;
- creation/server-effective time;
- source/correlation reference where available.

Controlled terminal facts:

- ended server time;
- bounded end reason.

An ended binding never becomes active again. Replacement always inserts a new binding lifecycle row.

### Expected uniqueness constraints

- active account-link uniqueness per provider account subject;
- active account-link uniqueness per Physical Actor for the MVP;
- active Actor/Identity pair uniqueness;
- active Actor binding uniqueness per Logical Identity;
- no active-only uniqueness on Physical Actor across Identity bindings, because one Actor may control multiple selected Identities;
- stable primary keys on every Actor, account-link, Identity, and binding lifecycle row.

### Rejected alternatives

- **One Actor ↔ exactly one Identity:** rejected because it contradicts the adopted selected/secondary-Identity model.
- **Many active Actors ↔ one Identity:** rejected because it introduces shared-control/impersonation policy not needed by the first slice.
- **Mutable Actor FK on Identity:** rejected because replacement would overwrite historical control attribution.
- **Reuse an ended binding:** rejected because lifecycle-instance resurrection violates the frozen model.

### Deferred

Concurrent shared control, guardian impersonation, organization-managed identities, identity merges/splits, delegation, and account-recovery adjudication require separate Product/security decisions.

## 5. D4 — Controlled-vocabulary persistence

### Decision

Choose **Option C: lookup/reference tables** for both capability keys and Grant scope keys.

The exact definition-table names are:

- `winwin_capability_definitions`
- `winwin_grant_scope_definitions`

Grant mapping tables remain:

- `winwin_grant_capabilities`
- `winwin_grant_scopes`

Each mapping uses a foreign key to its definition table and a composite primary/unique key preventing duplicate key assignment within one Grant. Definitions are seeded only by reviewed additive migrations. Ordinary application roles will receive no mutation privileges; later RLS/ACL authoring remains separate.

### Option comparison

| Representation | Evolution and integrity | Operational tradeoff | Decision |
|---|---|---|---|
| A. PostgreSQL ENUM | Strong typo prevention but adding/removing values has specialized migration and rollback behavior; tightly couples deployment order | Compact queries, less flexible additive evolution | Rejected |
| B. DOMAIN | Reusable type but changing allowed values still alters shared type constraints and does not provide reference metadata | More indirection without better lifecycle control | Rejected |
| C. Lookup/reference table | Additive reviewed rows, normal FKs, clear inventory, typo prevention, simple joins, and safe staged evolution | Requires two small joins and strict definition-table privileges | **Selected** |
| D. Text + CHECK | Simple MVP definition but every vocabulary addition rewrites a constraint and may require table validation/coordination | Lowest table count, weaker shared referential model | Rejected |

### Capability definitions

`winwin_capability_definitions` contains one row per exact canonical key listed in D1. A key's published meaning is immutable. A future capability is added only by a reviewed additive migration; it is never inferred from role, Relationship, recipient type, profession, or UI label.

### Grant scope definitions

`winwin_grant_scope_definitions` initially and exclusively contains:

- `CASE`
- `RECORD`

`FAMILY_TEAM`, `PROFESSIONAL_TEAM`, `EXPLICIT_GRANT`, visibility policies, object types, and roles are not Grant scopes. A future scope requires an explicit Product decision and additive migration.

### Frozen invariant

Each authorization decision evaluates capability and scope mappings correlated to one exact Grant ID. Definition tables control spelling and meaning but grant no authority by themselves. `CASE` never substitutes for `RECORD`, and a `RECORD` scope still requires `RECORD_VIEW` plus typed Record Visibility for a protected read.

### Future IA-3A migration impact

The restart may create and seed the two definition tables, then create Grant mapping tables whose foreign keys point to them. It must not create role-capability templates, wildcard keys, compatibility aliases, or a runtime authorization evaluator.

### Deferred

Vocabulary-administration UI, dynamic tenant-defined capabilities, policy templates, and all scope/capability additions remain out of scope.

## 6. Resulting IA-3A schema implications

The four blockers are closed. A separately authorized IA-3A restart can now implement exactly one additive migration containing only:

1. `winwin_actor_references`;
2. `winwin_account_actor_links`;
3. `winwin_identities`;
4. `winwin_identity_actor_bindings`;
5. the already-planned minimum `winwin_*` Case/care-recipient prerequisite objects;
6. `winwin_case_memberships` and membership lifecycle evidence;
7. `winwin_case_relationships` and relationship lifecycle evidence;
8. `winwin_grants` and Grant lifecycle evidence;
9. `winwin_capability_definitions` seeded with the exact D1 list;
10. `winwin_grant_scope_definitions` seeded with `CASE` and `RECORD` only;
11. `winwin_grant_capabilities` and `winwin_grant_scopes`.

The future migration must use restrictive historical-safe foreign keys, opaque primary keys, immutable lifecycle bindings, and active-row uniqueness matching D3. It must remain additive and isolated from legacy `v2_*` authority.

This closure does not decide exact SQL syntax, index names, trigger mechanics, RLS helper ownership, RPC signatures, or runtime execution. Those are implementation/security details within later authorized gates, provided they preserve D1–D4.

## 7. Frozen invariants

- Physical Actor/account and Logical Identity are distinct entities.
- An authenticated account resolves an Actor; a request then selects one active bound Logical Identity.
- One Actor may control multiple active Logical Identities; one Logical Identity has at most one active Actor in MVP.
- A Logical Identity may exist without an Actor but cannot exercise authorization.
- Binding replacement preserves the Logical Identity and all historical attribution.
- Ended account links and Actor/Identity bindings are retained and never resurrected.
- Membership and Relationship alone never authorize.
- Grant remains a separate lifecycle object.
- Capability and scope mappings belong to one exact Grant.
- `QUESTION_ASK` is the sole Question-create capability.
- Grant scope keys are exactly `CASE` and `RECORD`.
- Role, profession, relationship label, and `DemoRole` remain presentation/context only.
- Protected record read remains `RECORD_VIEW + RECORD + typed Record Visibility`.
- No cross-Grant stitching is permitted.
- Legacy `v2_*` objects are not promoted into new `winwin_*` authority.
- Migrations 001–008 remain immutable historical/runtime candidates.

## 8. Deferred items

This closure does not authorize or decide:

- migration or SQL creation;
- RLS, private authorization helpers, grants/ACLs, functions, or RPCs;
- invitation, activation, revocation, or identity-binding workflows;
- Record Visibility persistence;
- Care Update, Action, Responsibility, Question, Activity, Audit, Cursor, sequence, or idempotency persistence;
- runtime validation, Supabase/Docker start, cutover, backfill, deployment, or production;
- delegation, impersonation, organization hierarchy, shared Identity control, identity merge/split, clinical data, or profile expansion.

## 9. IA-3A restart prerequisites

A future implementation restart must:

1. require this decision artifact as an authoritative input and verify its fingerprint;
2. begin from an explicitly named clean branch/HEAD;
3. preserve the adopted IA-3 plan and all frozen Product decisions;
4. create exactly one new additive migration after immutable migrations 001–008;
5. use `QUESTION_ASK`, separate `winwin_identities`, lifecycle Actor bindings, lookup definition tables, and only `CASE|RECORD` scope keys;
6. restrict changes to the separately authorized authority-foundation schema objects;
7. perform static validation only unless database runtime execution is separately authorized;
8. stop on any requirement for RLS, workflow RPC, legacy cutover, data backfill, or unclosed Product decision.

## 10. Consistency conclusion

D1–D4 preserve the frozen authorization chain. Role remains presentation-only; Membership and Relationship remain non-authorizing context; Grant remains the single proof-path lifecycle object; capability and scope mappings stay correlated to one Grant; `CASE` is not a record-read substitute; legacy `v2_*` objects remain historical; and no migration or runtime action is performed by this closure.

All four prior IA-3A blockers are closed for a separately authorized implementation restart.

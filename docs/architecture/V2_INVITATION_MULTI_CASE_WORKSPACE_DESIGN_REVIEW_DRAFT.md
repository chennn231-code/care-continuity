# WinWin v2 Invitation & Multi-case Workspace Design Review

- Status: Proposed Draft
- Review date: 2026-08-25
- Scope: Product and flow design only
- Implementation status: Not implemented
- Supabase / Migration status: Not modified by this review

## 1. Purpose and boundaries

This review defines how an authenticated WinWin account may be invited into a specific care case and how one account may organize multiple independently authorized cases.

The following remain separate:

- Account identity is not identity verification.
- Identity verification is not case membership.
- Case membership is not a permission grant.
- An invitation is not case access.
- A private folder or tag is not a collaboration space or authorization source.

## 2. Invitation authority

An invitation may be issued or revoked only when one current, complete grant path independently satisfies all applicable conditions, including:

- the case is `ACTIVE`;
- the caller has a current Membership;
- the Membership is effective and is not suspended, expired, or revoked;
- the selected Role Grant is effective;
- the grant provides `MANAGE_INVITATIONS` for the case-governance purpose;
- the requested role, purpose, scope ceiling, and service period are valid.

Collaboration administrator is a case-level capability. A family relationship or professional title, including case manager / A-unit care manager, does not naturally grant invitation authority.

## 3. Shared invitation-token model

Dedicated links, QR Codes, and one-time codes are delivery representations of one invitation credential:

```text
Invitation
└─ one high-entropy opaque token
   ├─ dedicated link
   ├─ QR Code encoding the same link
   └─ one-time code representation for manual entry
```

Rules:

- the database stores only the token hash;
- the raw token is returned only when issued;
- the token is single-use, expiring, and revocable;
- opening a link, scanning a QR Code, or entering a code never grants access by itself;
- acceptance still requires authentication and matching confirmed Email;
- resend revokes the old invitation and issues a new invitation/token;
- the old token is never reused;
- a short, guessable numeric code is not acceptable.

## 4. Minimum invitation preview

Before authentication or confirmed-Email binding, show only:

- that this is a WinWin case-collaboration invitation;
- whether the invitation can still be processed;
- sign-in or registration guidance.

Do not disclose the elder's name, inviter, member list, case contents, counts, or summaries.

After authentication and confirmed-Email binding succeeds, the preview may show:

- the minimum or masked case display name;
- inviter display name;
- proposed relationship or professional role;
- invitation purpose;
- sharing-scope summary;
- service start and end dates;
- whether the professional or organization relationship is verified;
- accept and decline actions.

The preview must not show health content, timeline entries, questions, actions, other members, other cases, UUIDs, token values, or Email-binding details.

## 5. Invitation lifecycle

```text
INVITED
├─ accept  → ACCEPTED + Membership + Role Grant
├─ decline → DECLINED
├─ revoke  → REVOKED
└─ expire  → EXPIRED
```

### 5.1 Sign-in and registration

- Existing accounts sign in before acceptance.
- New users register and confirm their Email, then return to the invitation.
- A self-declared primary identity cannot replace recipient binding.
- Client-supplied verification flags, user metadata, and stale JWT Email claims are not trusted as the database boundary.

### 5.2 Accept

Acceptance must atomically:

1. lock and validate the Invitation;
2. validate token hash, state, expiration, case state, and confirmed Email;
3. create or safely reuse the current Auth account's Actor Reference;
4. create a new Membership generation;
5. create the initial Role Grant;
6. mark the Invitation accepted;
7. append the required Access Events.

No partial Actor, Membership, Grant, or event may remain after failure.

### 5.3 Decline, revoke, expire, and resend

- Decline creates no Membership or Grant and immediately invalidates the token.
- Revoke is available only to a complete, effective invitation-management grant path.
- Expiration is an effective state derived from database clock. Even when the stored row remains `INVITED`, the UI must display `EXPIRED` and disable acceptance after `expires_at`; no background scheduler is required to rewrite the row.
- Resend revokes the former invitation and creates a new one; both histories remain traceable.

### 5.4 Verification waiting does not add an Invitation state

`PENDING_VERIFICATION` belongs only to Identity Verification. It must not be added to the Invitation state vocabulary.

- A professional invitation remains `INVITED` while the recipient's professional identity is awaiting verification.
- Verification success does not automatically accept the invitation.
- After verification succeeds, the system must re-check token validity, invitation effective expiration, confirmed-Email binding, case status, service period, and current governance before acceptance.
- If any invitation condition has ceased to be valid during the wait, acceptance must fail without creating Membership or Grant.

## 6. Professional verification and activation

Professional verification remains independent from Invitation, Membership, and Role Grant.

```text
receive professional invitation
→ authenticate and confirm Email
→ professional identity is DECLARED or PENDING_VERIFICATION
→ wait for verification
→ verification becomes VERIFIED
→ re-evaluate invitation, service period, Membership, and Grant
→ activate authorized professional access
```

- `DECLARED` and `PENDING_VERIFICATION` do not permit professional case access.
- `VERIFIED` does not automatically create Membership.
- `REJECTED` and `EXPIRED` verification paths cannot be used for professional actions.
- The Prototype must not collect real licenses, identity documents, organization documents, or personal data.
- Waiting for professional verification is simulated in memory in the current Frontend Prototype; it is not enforced by Migration 007.

Migration 007 stores unverified professional and organization statements but does not implement a formal Identity Verification model. A production claim that unverified professionals are technically prevented from professional access requires a later Domain and Logical Model Review.

## 7. Membership, Grant, and service period

- Invitation acceptance creates Membership; Invitation alone never authorizes content.
- Membership identifies the relationship to one case.
- Role Grant identifies the role, purpose, scope ceiling, capabilities, and period.
- Acceptance before a future `starts_at` may create Membership and Grant, but the relationship remains accepted and waiting for service start. Before `starts_at`, only the minimum relationship metadata may be shown; case content remains inaccessible.
- Every operation uses one complete grant path; abilities from different grants cannot be combined.
- Effective access uses database clock and does not depend on a background scheduler.
- An expired, revoked, or suspended Membership or Grant immediately stops authorization.
- Service-period extension is a controlled governance operation, not a direct client date edit.
- Rejoining creates a new Membership generation and does not restore the former Membership.

## 8. Job change, departure, reassignment, and rejoining

### 8.1 Leaving an organization

- End the old service relationship and revoke or expire related Memberships and Grants.
- Preserve the personal account and immutable historical actor, role, organization statement, and timestamps.
- Neither the former nor new organization inherits case access.

### 8.2 Moving to a new organization

- Create and verify a new professional/service statement.
- Re-establish each case relationship independently.
- Do not reconnect detached history using Email alone.

### 8.3 No longer responsible for one case

- End only that case's Membership and Grants.
- Other case relationships remain independent.
- Private folders cannot preserve or extend access.

### 8.4 Unfinished actions

When an assignee in `ACCEPTED` or `IN_PROGRESS` loses the required effective relationship:

- the Action becomes `NEEDS_REASSIGNMENT`;
- the former Responsibility Cycle ends with its reason and time preserved;
- reassignment creates a new immutable Responsibility Cycle;
- the new assignee must independently accept;
- no administrator may mark another person's work completed.

Action and Responsibility Cycle are not part of Migration 007.

## 9. Multi-case workspace

Recommended hierarchy:

1. current identity and verification status;
2. invitations waiting for the user;
3. effective cases;
4. actions awaiting the user's acceptance;
5. this week's follow-up;
6. service relationships nearing expiration;
7. private folders and tags.

Each case card may show only data visible through the selected complete grant path:

- minimum case display name;
- the user's relationship/role;
- unverified service-organization statement where applicable;
- effective period;
- visible action counts;
- approaching-expiration notice.

Search, autocomplete, totals, empty states, and badge counts must operate only on the user's currently visible case set. They must not reveal the existence, name, count, or summary of unauthorized cases.

## 10. Private organization model

Private folders, tags, and sorting are account-scoped view preferences. They are not collaboration groups and do not grant access.

They may store:

- folder or tag name;
- color or icon;
- personal ordering;
- a case appearing in multiple tags;
- personal filter preferences.

They must not store or duplicate:

- sensitive case summaries;
- care content;
- family or member lists;
- counts the account cannot currently view;
- cross-case content;
- permissions transferable to another account.

After access is lost, the first-version behavior is to immediately hide or remove the case-to-folder/tag association. It must not leave an empty card, prior case name, summary, member list, hidden-case count, or any indication that an inaccessible case exists. A private reference cannot reveal changes during the inaccessible period. Persisting private organization requires a separate Domain and Logical Model Review and must not be added to Migration 007.

## 11. Walkthroughs

### 11.1 Family member

1. A member with `MANAGE_INVITATIONS` issues a confirmed-Email-bound family invitation.
2. The family member authenticates and confirms Email.
3. Only the minimum invitation preview is displayed.
4. Acceptance atomically creates the Family Membership, Role Grant, and events.
5. The case appears in My Cases.
6. The family member sees only the sharing scopes permitted by the selected grant path.

Migration 007 substantially supports this foundation.

### 11.2 Individual professional

1. A manager invites a nurse with a purpose, scope ceiling, and finite service period.
2. The nurse authenticates with matching confirmed Email.
3. A declared but unverified professional identity enters a waiting state.
4. Only after verification may professional access be activated.
5. At expiration, access stops immediately.
6. Rejoining later requires a new invitation and Membership generation.

Migration 007 supports invitation and time-bound access but not formal professional verification.

### 11.3 Day-care nurse with multiple cases

1. The nurse separately accepts invitations for several elders.
2. Every case has an independent Membership and Grant.
3. My Cases lists only currently authorized cases.
4. The nurse privately tags cases as day care, this-week follow-up, or expiring soon.
5. Leaving the organization ends the service relationships without deleting the account or historical authorship.
6. Unfinished actions move to `NEEDS_REASSIGNMENT` under the later Action model.
7. A new organization requires new verification and new case relationships.

## 12. Migration 007 coverage and gaps

| Capability | Migration 007 status |
|---|---|
| confirmed-Email-bound invitation issue | Supported |
| high-entropy token and hash-only storage | Supported |
| atomic acceptance, Membership, Grant, and events | Supported |
| invitation revoke | Supported |
| Membership/Grant service periods and revoke | Supported |
| new Membership generation on rejoin | Foundation supported |
| decline RPC | Missing |
| safe invitation-preview RPC | Missing |
| controlled resend operation | Missing |
| explicit effective-expiration query contract | Missing |
| formal professional identity verification | Missing |
| multi-case workspace query contract | Missing |
| persistent private folders/tags | Missing and intentionally deferred |
| Action/Responsibility Cycle and `NEEDS_REASSIGNMENT` execution | Outside Migration 007 |

Migration 007 must remain unchanged for this Prototype review. Missing production capabilities belong to later reviews and additive migrations.

The following capabilities are in-memory Prototype simulations only until their backend contracts are separately reviewed and implemented:

- invitation decline;
- minimum safe invitation preview;
- invitation resend;
- professional identity verification and waiting-state enforcement;
- private folders, tags, sorting, and access-loss cleanup.

Neither the UI nor verification reports may describe these simulated capabilities as supported by Migration 007, Supabase, or Production.

## 13. Recommended next Frontend Prototype slice

The next clickable slice may use only in-memory, fictional data to demonstrate:

- invitation creation form;
- one credential represented as link, QR concept, and one-time code;
- sign-in/registration return path and minimum preview;
- accept, decline, revoke, expire, and resend states;
- unverified-professional waiting state;
- accepted case appearing in My Cases;
- multi-case list, search, and minimum cards;
- private in-memory folders and tags;
- immediate removal from the visible set after simulated access loss;
- explicit Prototype and fictional-data notices.

It must not connect to Supabase or claim that Migration 007 implements invitation decline, safe preview, resend, formal identity verification, private folder persistence, access-loss cleanup, or Action reassignment.

## 14. Gate conclusion

| Gate | Result | Reason |
|---|---|---|
| Product Flow Design | `PASS WITH DEFERRED BACKEND CONTRACTS` | Product states and boundaries are fixed; listed backend contracts remain explicitly deferred |
| Invitation Flow Design | `PASS WITH DEFERRED BACKEND CONTRACTS` | Verification waiting stays outside Invitation state; future-start and derived-expiry behavior are fixed; decline, preview, and resend remain Prototype simulations |
| Service Relationship Lifecycle | `PASS WITH DEFERRED BACKEND CONTRACTS` | Acceptance, future start, expiration, revoke, and rejoin behavior are fixed; formal verification and Action reassignment remain outside Migration 007 |
| Multi-case Workspace | `PASS` for Prototype presentation | An in-memory, authorization-filtered presentation slice can proceed |
| Private Organization Model | `PASS` for product boundary; `PARTIAL` for persistence | It is strictly personal organization; persistence needs a later model review |
| Next Frontend Prototype slice | `APPROVED` with constraints | In-memory fictional data that resets on refresh; no formal enforcement claims |
| Formal persistence | `BLOCKED` | Missing backend contracts and model reviews must be completed first |
| New Domain / Logical Model Review | `REQUIRED` before persistence | Required for professional verification, private organization, and Action responsibility |
| Migration 007 | `UNCHANGED` | Do not expand the validated Access Foundation migration for Prototype UI |
| Remote Supabase | `NOT TOUCHED` | This review provides no remote-apply authorization |

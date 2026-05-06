# Delegation, Authority Link, And Exceptional Authority Repositories

`pc_0088` adds the durable substrate behind client delegation, authority readiness, and bounded internal exception handling. The implementation keeps these artifacts as explicit governed records rather than allowing connector callbacks, OAuth token state, or ad hoc override flags to stand in for auditable authority facts.

## Persistence model

- `DelegationGrant`, `AuthorityLink`, and `ExceptionalAuthorityGrant` all have a current register plus an immutable snapshot register.
- Current rows carry the hot-path indexed fields needed for authorization evaluation.
- Snapshot rows keep frozen payload lineage so `PrincipalContext`, `AuthorityLayerBoundaryContract`, and `AuthorizationDecision` can safely reference prior facts even after revalidation, revocation, expiry, or supersession.
- Transition logs are append-only. Exceptional authority also has an append-only usage ledger.

## Keys and lineage

- Primary keys:
  - `delegation_grant_id`
  - `authority_link_id`
  - `exceptional_grant_id`
- Snapshot refs are content-addressed:
  - `delegation-grant-snapshot.<stableJsonHash(record)>`
  - `authority-link-snapshot.<stableJsonHash(record)>`
  - `exceptional-authority-snapshot.<stableJsonHash(record)>`
- Lineage keys are stable hashes of the identity surface that must not silently rebind in place.
  - Delegation lineage includes tenant, reporting subject, delegate identity, authority scope, partition scope, basis type, evidence refs, and effective-from.
  - Authority-link lineage includes tenant, client, reporting subject, authorised party, authority tuple, provider tuple, delegation-grant ref, and partition scope.
  - Exceptional-authority lineage includes tenant, client, incident, action family, partition scope, requester, approver, and usage ceiling.
- Supersession is explicit through `superseded_by_*` columns. The repositories reject in-place identity mutation and illegal revival of revoked, expired, or superseded artifacts.

## Secret boundary

- The repositories never persist raw OAuth access tokens, refresh tokens, session cookies, or authority credentials.
- `AuthorityLink` stores only connector lineage and token-binding references such as `token_binding_profile_ref`, provider environment/version, and evidence refs.
- This preserves fast authorization lookups without leaking vault-owned secret material into the control-store rows.

## Freshness, health, and bounded use

- `DelegationFreshnessService` reads `config/access/delegation_freshness_policy.json` and computes governed freshness posture from timestamps only.
  - `CLIENT_GRANTED` remains `NOT_APPLICABLE`.
  - imported or digital-handshake grants move to `REVALIDATION_REQUIRED` when validation is missing, freshness is stale, or the revalidation window has opened.
- `AuthorityLinkBindingHealthService` makes token mismatch, delegation gap, limited scope, revocation, expiry, and unlinked posture explicit and queryable.
- Exceptional-authority consumption uses compare-and-swap on `remaining_uses` plus an append-only usage ledger.
  - callers may supply `expected_remaining_uses`
  - each successful consume appends a ledger entry with before/after counts
  - a stale caller gets `EXCEPTIONAL_AUTHORITY_CAS_MISMATCH` instead of silently double-spending

## Repository and service boundary

- Repositories own normalization, identity-stability guards, current-row replacement, snapshot capture, lineage indexes, transition recording, and bounded-use decrement semantics.
- `DelegationFreshnessService`, `AuthorityLinkBindingHealthService`, and `ExceptionalAuthorityBudgetService` own derived policy interpretation.
- `AuthorityEdgeResolutionService` composes current repository facts into authorization-facing edge posture while keeping delegation lifecycle, freshness, authority-link health, and exceptional-authority posture separate.
- Supporting-agent restrictions are fail-closed through policy, not hidden endpoint allowlists. Main-agent-only action families remain blocked even when a delegation grant exists.

## Query surface

Hot-path indexes and repository lookups cover:

- delegation by tenant, reporting subject, delegate, lineage, freshness timestamps, and lifecycle
- authority links by client, reporting subject, authorised party, delegation grant, token-binding profile, health, lifecycle, and lineage
- exceptional authority by client plus action family, incident, requester plus approver pair, usage ledger, and lineage

The result is a replay-safe authority substrate that later cards can query directly instead of reverse-engineering posture from session middleware or connector token state.

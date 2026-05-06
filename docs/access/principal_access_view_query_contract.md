# Principal Access View Query Contract

`pc_0096` adds the backend-owned `PrincipalAccessView` read contract for the governance access-principals workspace. The point of the contract is to mount one frozen principal access slice at a time and keep the browser out of the business of recomputing authority truth.

## Query Boundary

`PrincipalAccessViewQueryService.getView(...)` returns one fully mounted principal workspace, not a paginated directory-plus-detail pair.

Required input:

- `tenant_id`
- one of `principal_context_access_binding_hash` or `principal_id`

Optional route context:

- `active_filters`
- `selected_cell_ref`
- `selected_role_template_ref`
- `reviewed_policy_snapshot_hash`
- `role_editor_pending_change_refs`
- `workspace_mode`

When only `principal_id` is supplied, the service resolves the latest frozen principal context for that principal and rebuilds the view from persisted authorization decisions. The query stays read-side only: it does not rerun authorization, widen scope, or mutate policy state.

## Assembly Rules

`ActionMatrixAssembler` derives one matrix cell per `resource_class` plus `action_family` tuple from the latest frozen authorization decision for that tuple. Each cell keeps:

- exact decision vocabulary: `ALLOW`, `ALLOW_MASKED`, `REQUIRE_STEP_UP`, `REQUIRE_APPROVAL`, `DENY`
- ordered reason codes
- effective scope
- masking rules
- required approvals
- required authn level
- policy-path lineage
- ordered authority-chain layers

Stable ordering is fixed before projection:

- rows by the governed resource catalog order
- columns by the governed action catalog order
- cells by row order, then column order, then `cell_ref`
- delegation summaries by `client_id`
- active filter chips by route grammar group order:
  - `principal_type`
  - `principal_state`
  - `role`
  - `delegated_client`
  - `changed_by`

`selected_cell_ref` uses the canonical `cell.{resource_class}.{action_family}` identity. When the caller does not provide a selection, the projector chooses the most severe visible decision in this order: `DENY`, `REQUIRE_APPROVAL`, `REQUIRE_STEP_UP`, `ALLOW_MASKED`, `ALLOW`.

## Authority Chain

`AuthorityChainStackBuilder` keeps the explanation rails in the required fixed sequence:

1. `SESSION_AUTHN_POSTURE`
2. `TENANT_OPERATIONAL_AUTHORITY`
3. `CLIENT_DELEGATION_COVERAGE`
4. `EXTERNAL_AUTHORITY_LINK_READINESS`
5. optional `AUTHORITY_OF_RECORD_OUTCOME`

The first four layers never reorder. The fifth layer only appears for integrated authority flows or when authority-of-record evidence is explicitly present. This keeps route explanation aligned to the stored authorization boundary instead of letting the UI infer missing rails.

## Selection, Recovery, And Staleness

`PrincipalAccessViewProjector` preserves same-shell continuity around one mounted principal:

- `focus_anchor_ref` follows the selected visible cell
- `selected_action_detail` mirrors the mounted selected cell and never invents action detail when selection is unavailable
- `preserved_context_codes` stay limited to `ACTIVE_FILTERS`, `SELECTION`, `FOCUS_ANCHOR`, `PROMOTED_SUPPORT_SURFACE`, and `STAGED_DIFF`

Typed stale posture wins before filter recovery:

- `STALE_REVIEW_REQUIRED` plus `INLINE_REBASE` when the current policy snapshot hash differs from the frozen principal-context hash, or when `reviewed_policy_snapshot_hash` mismatches the current published hash

Typed recovery applies only when the view is not stale:

- `RECOVERY_REQUIRED` plus `ACCESS_REBIND_REQUIRED` when route filters exclude the mounted principal
- the same recovery posture when the requested selected cell no longer resolves in the mounted matrix

This keeps stale policy drift distinct from route-local selection/filter drift.

## Delegation And Simulator Context

`DelegationSummaryBuilder` turns delegation facts into explicit read-model summaries rather than UI inference. The summary lifecycle is derived from the strongest frozen delegation coverage posture across the mounted authorization decisions, with optional expiry evidence reattached from delegation snapshots when available.

`latest_simulation_ref` is advisory context only. The query service resolves it from published governance simulations for the selected cell's frozen authorization decision, but only when the caller requests `workspace_mode = SIMULATOR`. If no published simulation exists, the workspace falls back to `PRINCIPALS`. The committed selected decision remains the frozen authorization truth even when simulator context is present.

## Persistence And Invalidation

`PrincipalAccessViewRepository` stores projected views by a cache key derived from:

- tenant
- principal
- settlement state and recovery posture
- selected role and selected cell
- workspace mode
- latest simulation ref
- active filters
- `last_modified_at`

This keeps persisted views invalidation-safe against principal changes, policy drift, route slice drift, and simulator publication drift. Source lineage is stored alongside the view using the frozen principal-context access binding hash, the frozen authorization decision ids, and any linked simulation id.

The result is one authoritative backend query contract for access inspection: selection, explanation, stale posture, and simulator continuity all stay bound to persisted access facts instead of browser-local permission logic.

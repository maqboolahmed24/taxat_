# Governance Policy Snapshot And Environment Bindings

`GovernancePolicySnapshot` is the tenant policy stale-view anchor for
`GET /v1/governance/tenants/{tenant_id}/policy-snapshot`. The authoritative projector now lives in
`packages/backend-governance/src/projectors/build_governance_policy_snapshot.ts`; northbound route
code is only a thin adapter over persisted snapshots and the shared workspace builder.

## Durable Policy Basis

- `policy_snapshot_hash` is derived from the durable access-policy inputs loaded from `config/access`
  plus provider environment rows from `config/runtime/provider_environment_matrix.json`.
- `environment_bindings[]` normalizes provider environment, frozen-config requirements, callback-host
  requirements, and bootstrap posture into route-safe rows. Browser-local staged state never creates
  or removes environment bindings.
- `cache_isolation_contract` uses `GOVERNANCE_POLICY_SNAPSHOT`, the tenant route object anchor, and
  the policy hash as the projection version so reconnect and browser restore cannot mount an
  unguarded policy shell.

## Workspace And History

- `TenantConfigWorkspace.section_nav_order` is fixed:
  `TENANT_PROFILE -> SECURITY_POSTURE -> AUTHORITY_AND_ENVIRONMENTS -> CONNECTOR_POLICY -> APPROVAL_AND_CHANGE_CONTROL -> NOTIFICATIONS_AND_EVIDENCE`.
- `TenantConfigWorkspace.surface_order` is fixed:
  `SECTION_NAV -> CONFIG_FORM -> INLINE_POLICY_HELP -> BLAST_RADIUS_PANEL -> CHANGE_BASKET -> APPROVAL_COMPOSER -> CONFIG_HISTORY_TIMELINE`.
- `active_section_code` comes from the explicit route/query request, then prior workspace continuity,
  then `TENANT_PROFILE`.
- `inline_policy_help` remains `INLINE`; the builder preserves existing help refs and adds the active
  section's policy-help ref.
- `ConfigHistoryTimeline` always includes the latest material change and the selected historical
  anchor. `INLINE_REBASE` and stale baskets force `REBASE_REQUIRED` without erasing the selected
  historical change.

## Basket, Approval, And Blast Continuity

- Empty baskets clear active simulation, topology, mutation hazard, mutation basis, approval posture,
  required approvals, and staged groups.
- Atomic baskets require exactly one live `simulation_basis_hash`, one `dependency_topology_hash`,
  one `hazard_contract_hash`, one `basis_contract_hash`, one approval posture, and one required
  approval set across all staged groups.
- Mixed or stale baskets keep `submission_enabled = false` and clear basket-level active hazard and
  basis. The visible blast panel still points at one staged reviewed packet when the executable schema
  requires non-empty baskets to keep consequence review visible.
- Direct submission is enabled only for an atomic, non-stale, non-step-up, bounded-safe basket whose
  active hazard and basis both preserve `commit_authority_posture = BOUNDED_SAFE` and
  `approval_requirement = NOT_REQUIRED`.
- Approval composer state is `NOT_REQUIRED` only when the active basket does not require approval.
  Approval-required atomic baskets mirror the active mutation basis; `READY` requires approver scope,
  related object refs, required rationale when configured, and a non-`PREVIEW_ONLY` basis.
- Blast panel packets reuse the same reviewed hazard and basis as the active basket when atomic.
  Stale baskets publish `panel_state = STALE`.

## Stale-View Failure Surface

Mutation commands must still stale-reject with the latest policy hash and mutation-basis details in
typed problem envelopes. The snapshot projector keeps those basis fields explicit so the browser can
rebase from backend truth rather than inferring what changed from local form dirtiness.

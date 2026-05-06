# Governance Interaction Layer And Compaction Rules

`pc_0195` adds the backend-governance-owned `GovernanceInteractionLayer` projector at
`packages/backend-governance/src/projectors/build_governance_interaction_layer.ts`.
It is the server-authored interaction contract for governance density, filter chips, support-surface
precedence, staged diff and basket continuity, export binding, focus return, semantic selectors,
motion, and durable receipt / typed failure feedback.

## Shared Constants

Every emitted layer fixes the following shared contract values:

- `density_profile = GOVERNANCE_DENSITY_PROFILE_V1`
- `inventory_filter_grammar = CANONICAL_ROUTE_FILTER_GRAMMAR`
- `support_surface_policy = ONE_PROMOTED_SUPPORT_SURFACE_MAX`
- `diff_basket_policy = STAGED_DIFF_AND_BASKET_RETAIN_CONTEXT`
- `export_binding_policy = ACTIVE_FILTERED_SLICE_GOVERNS_EXPORT`
- `keyboard_focus_policy = RETURN_FOCUS_ANCHOR_OR_ROVING_SELECTION`
- `selector_profile = GOVERNANCE_SEMANTIC_SELECTORS_V1`
- `selection_persistence_mode = PRESERVE_WHILE_OBJECT_RESOLVES`
- `motion_profile = SUBTLE_CAUSAL_ONLY`
- `feedback_truth_policy = DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN`

The nested foundation contract is cloned for `GOVERNANCE_DENSITY_SHELL`, including
`GOVERNANCE_WORKSPACE_DENSITY_V1`, `GOVERNANCE_CANVAS_SPACING_V1`,
`GOVERNANCE_AUXILIARY_SURFACE_SPACING_V1`, and `GOVERNANCE_AUXILIARY_REDOCK_V1`.

## Filter Chip Echo

`deriveGovernanceFilterChipEcho` serializes active filters in the same dimension order enforced by
the contract validator:

- tenant overview: `environment`, `client`, `principal_class`, `risk_family`, `change_state`
- principal access: `principal_type`, `principal_state`, `role`, `delegated_client`, `changed_by`
- role template matrix: `resource_class`, `action_family`, `decision`
- authority links: `authority_scope`, `client`, `provider_environment`, `lifecycle_state`,
  `binding_health`, `expiry_risk`
- retention: `artifact_class`, `retention_class`, `client`, `legal_hold_state`,
  `release_eligibility`, `erasure_readiness`
- audit: `actor`, `event_family`, `client`, `manifest`, `authority_operation`, `object`,
  `window_from`, `window_to`

The service fails closed on empty tokens or duplicated chip refs.

## Preserved Context

`deriveGovernancePreservedContext` provides the route-specific continuity set:

- tenant overview: active filters, selection, focus anchor, promoted support surface
- policy snapshot: active section, promoted support surface, staged diff, change basket
- access and role matrices: active filters, selection, focus anchor, promoted support surface,
  staged diff
- authority links: active filters, selection, focus anchor, promoted support surface, guided
  handshake step
- retention: active filters, selection, focus anchor, promoted support surface, staged diff
- audit: active filters, selection, focus anchor, promoted support surface, query slice

Any compact posture must preserve `PROMOTED_SUPPORT_SURFACE`.

## Compaction And Focus

`deriveGovernanceFocusAndCompactionState` keeps the validator pairing rules:

- `WIDE` defaults to `SIDECAR` and cannot serialize `TRAY`
- `AUXILIARY_DRAWER` allows `DRAWER` or `INSPECTOR`
- `AUXILIARY_TRAY` requires `TRAY`
- `FOCUS_STACK` defaults to `DRAWER`
- compact postures cannot keep `SIDECAR`

Ordinary governance drawers and inspectors stay `NON_MODAL`. `MODAL_EXPLICIT` is accepted only when
the caller declares an explicit modal step-up ceremony.

## Support Surface Precedence

`deriveGovernanceSupportSurfacePresentation` returns one promoted support surface from declared
candidates. Multiple explicitly promoted surfaces fail closed, so blast-radius, audit, export,
approval, diff, and basket surfaces cannot all become primary at once.

## Route Wiring

The policy snapshot, tenant overview, authority-link inventory, retention frame, audit
investigation frame, principal access view, role matrix, and northbound audit frame now call the
shared projector instead of hand-authoring chip grammar or interaction constants locally.

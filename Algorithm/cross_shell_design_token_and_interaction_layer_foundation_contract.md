# Cross-Shell Design Token And Interaction-Layer Foundation Contract

## Purpose

This contract defines the shared `InteractionLayerFoundationContract` that sits beneath
`OperatorInteractionLayer`, `PortalInteractionLayer`, and `GovernanceInteractionLayer`.
It exists so shell behavior is bound through one explicit systems API instead of being encoded
indirectly through route-local spacing defaults, renderer-local motion choices, or platform-specific
preview and recovery heuristics.

The foundation is authoritative for:

- layout-density, surface-spacing, support-spacing, and responsive-compaction tokens
- selector profiles
- support-surface budget
- same-object continuity and recovery posture
- history/currentness posture
- preview posture
- notification posture
- secondary-window posture
- motion posture
- durable feedback-truth posture

## Governing model

Every interaction-layer payload SHALL carry one grouped
`foundation_contract = InteractionLayerFoundationContract`.
That grouped contract normalizes the cross-shell semantics that were previously duplicated or only
partially named across shell families.

The contract SHALL freeze:

- `design_token_binding_policy = EXPLICIT_SEMANTIC_BINDINGS_ONLY`
- one explicit `layout_density_token`
- one explicit `surface_spacing_token`
- one explicit `support_surface_spacing_token`
- one explicit `responsive_compaction_token`
- one explicit `selector_profile`
- one explicit `support_surface_policy`
- one explicit `continuity_policy`
- one explicit `recovery_surface_policy`
- one explicit `history_presentation_policy`
- one explicit `preview_surface_policy`
- one explicit `notification_surface_policy`
- one explicit `secondary_window_policy`
- one explicit `motion_profile` and `motion_token`
- one explicit `feedback_truth_policy`
- `platform_parity_policy = SAME_FAMILY_REUSES_SAME_INTERACTION_GRAMMAR`

## Required family mappings

### `CALM_SHELL`

`OperatorInteractionLayer` SHALL bind the calm-shell foundation. Its tokens and semantics freeze:

- `layout_density_token = CALM_FOUR_SURFACE_DENSITY_V1`
- `surface_spacing_token = CALM_FOUR_SURFACE_SPACING_V1`
- `support_surface_spacing_token = CALM_DETAIL_DRAWER_SUPPORT_SPACING_V1`
- `responsive_compaction_token = CALM_SUPPORT_REDOCK_V1`
- `selector_profile = OPERATOR_SEMANTIC_SELECTORS_V1`
- `continuity_policy = SAME_OBJECT_SAME_SHELL_INLINE_RECOVERY`
- `recovery_surface_policy = INLINE_EXPLICIT_REBASE`
- `history_presentation_policy = CURRENT_PRIMARY_HISTORY_SECONDARY`
- `preview_surface_policy = DETAIL_DRAWER_OR_PARENT_BOUND_SECONDARY_WINDOW`
- `notification_surface_policy = CONTEXT_BOUND_INLINE_FEEDBACK_OR_PARENT_MIRROR`
- `secondary_window_policy = SUPPORT_ONLY_PARENT_BOUND_CLOSE_RETURNS_FOCUS`

### `CLIENT_PORTAL_SHELL`

`PortalInteractionLayer` SHALL bind the portal foundation. Its tokens and semantics freeze:

- `layout_density_token = PORTAL_COMFORTABLE_TASK_DENSITY_V1`
- `surface_spacing_token = PORTAL_PRIMARY_STACK_SPACING_V1`
- `support_surface_spacing_token = PORTAL_INLINE_SUPPORT_SPACING_V1`
- `responsive_compaction_token = PORTAL_STACK_BELOW_PRIMARY_V1`
- `selector_profile = PORTAL_SEMANTIC_SELECTORS_V1`
- `continuity_policy = SAME_SHELL_CONTEXTUAL_RETURN`
- `recovery_surface_policy = INLINE_REVIEW_OR_RECOVERY_NOTICE`
- `history_presentation_policy = CURRENT_PRIMARY_HISTORY_SECONDARY`
- `preview_surface_policy = PRIMARY_CONTEXT_WITH_STACKED_SUPPORT`
- `notification_surface_policy = CONTEXT_BOUND_INLINE_FEEDBACK`
- `secondary_window_policy = NOT_APPLICABLE`

### `GOVERNANCE_DENSITY_SHELL`

`GovernanceInteractionLayer` SHALL bind the governance foundation. Its tokens and semantics freeze:

- `layout_density_token = GOVERNANCE_WORKSPACE_DENSITY_V1`
- `surface_spacing_token = GOVERNANCE_CANVAS_SPACING_V1`
- `support_surface_spacing_token = GOVERNANCE_AUXILIARY_SURFACE_SPACING_V1`
- `responsive_compaction_token = GOVERNANCE_AUXILIARY_REDOCK_V1`
- `selector_profile = GOVERNANCE_SEMANTIC_SELECTORS_V1`
- `continuity_policy = SAME_OBJECT_SAME_SHELL_CONTEXT_RETENTION`
- `recovery_surface_policy = INLINE_TYPED_CONTEXTUAL_RECOVERY`
- `history_presentation_policy = ACTIVE_SLICE_PRIMARY_CONTEXTUAL_HISTORY`
- `preview_surface_policy = AUXILIARY_SURFACE_CONTEXTUAL_ONLY`
- `notification_surface_policy = CONTEXT_BOUND_INLINE_FEEDBACK`
- `secondary_window_policy = NOT_APPLICABLE`

## Failure classes closed

This contract closes the following fragmentation paths:

- route-local spacing or density overrides that bypass shell-family semantics
- shell-family motion drift because one family never published motion posture explicitly
- portal, governance, or native embodiments re-encoding preview, recovery, or notification behavior
  in renderer-local wrappers
- collaboration, inbox, and native operator surfaces drifting from the calm-shell token and
  continuity grammar
- current-primary-history-secondary posture collapsing into component-local artifact ordering
- support-only parent-bound semantics disappearing when native support windows or redocked surfaces
  are rebuilt from local layout state

## Enforcement

The schema in `schemas/interaction_layer_foundation_contract.schema.json` is authoritative.
`validate_contracts.py` SHALL reject any interaction-layer payload whose `foundation_contract` drifts
from its shell-family mapping, and `forensic_contract_guard.py` SHALL reject schema drift that
removes or weakens this grouped foundation.

# Cross-Shell Design Token Binding And Interaction Semantics

`shell_family_token_registry.ts` is the canonical registry for shell-family token and interaction semantics. It is intentionally a registry plus factory wrapper: the registry owns immutable release-level semantics, while projectors return fresh schema payloads for callers that need `InteractionLayerFoundationContract`, `PortalInteractionLayer`, or the governance interaction seed.

## Registry Shape

Each registry entry contains:

- one schema-valid `foundation_contract`
- one stable `semantic_token_aliases` map for renderer binding
- one `renderer_binding_policy = ENUM_PAYLOAD_PLUS_STABLE_SEMANTIC_TOKEN_ALIASES`
- cross-shell field names shared by all shell families
- shell-specific field names that must not be copied across families

Renderer manifests carry enum payloads plus stable semantic aliases only. They do not carry CSS custom-property names, route-local override tables, tenant/client/principal data, object refs, or runtime theme state.

## Portal Layer

`projectPortalInteractionLayer` emits the shared `CLIENT_PORTAL_SHELL` interaction layer without projecting the full portal workspace. It binds the portal foundation and freezes:

- top-level tabs with contextual detail
- comfortable task-first spacing
- plain literal client-safe status language
- `PORTAL_SEMANTIC_SELECTORS_V1`
- one promoted support region
- same-shell contextual return
- return-focus-anchor-then-latest-visible focus restoration
- current-primary-history-secondary artifact hierarchy
- stacked support below the primary task
- subtle causal motion and durable receipt or typed-failure feedback truth

Portal `secondary_window_policy` remains `NOT_APPLICABLE`; portal recovery must stay same-shell and stacked, not detached.

## Governance Seed

`projectGovernanceInteractionSemanticsSeed` publishes the minimal reusable `GOVERNANCE_DENSITY_SHELL` interaction grammar for later governance cards. It is not a governance snapshot. It only freezes the shared density, filter grammar, support policy, diff/basket policy, export binding, keyboard-focus policy, selector profile, compaction/presentation pairing, preserved context codes, subtle motion, and feedback-truth semantics.

The seed keeps governance values distinct from calm and portal defaults, especially `GOVERNANCE_SEMANTIC_SELECTORS_V1`, `GOVERNANCE_WORKSPACE_DENSITY_V1`, `GOVERNANCE_CANVAS_SPACING_V1`, and `ACTIVE_SLICE_PRIMARY_CONTEXTUAL_HISTORY`.

## Validation

`validateCrossShellTokenBinding` rejects:

- foundation payloads that drift from the registry
- portal interaction layers that diverge from the shared portal projector
- governance seeds with invalid static semantics, duplicate chip/context refs, empty context preservation, or invalid compaction/presentation pairs
- semantic binding manifests that are not exactly deterministic registry exports

This keeps visual style and route behavior out of route-local code while leaving full portal and governance composition to their dedicated cards.

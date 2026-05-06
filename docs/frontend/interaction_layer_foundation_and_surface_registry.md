# Interaction Layer Foundation And Surface Registry

This note records the frontend implementation for `pc_0231`.

## Source Links

- [Cross shell design token and interaction layer foundation](../../Algorithm/cross_shell_design_token_and_interaction_layer_foundation_contract.md)
- [Frontend shell and interaction law](../../Algorithm/frontend_shell_and_interaction_law.md)
- [Low noise experience contract](../../Algorithm/low_noise_experience_contract.md)
- [Customer client portal experience contract](../../Algorithm/customer_client_portal_experience_contract.md)
- [Admin governance console architecture](../../Algorithm/admin_governance_console_architecture.md)
- [Interaction layer foundation schema](../../Algorithm/schemas/interaction_layer_foundation_contract.schema.json)
- [Operator interaction layer schema](../../Algorithm/schemas/operator_interaction_layer.schema.json)
- [Portal interaction layer schema](../../Algorithm/schemas/portal_interaction_layer.schema.json)
- [Governance interaction layer schema](../../Algorithm/schemas/governance_interaction_layer.schema.json)

## Implemented Runtime

The shared frontend interaction runtime lives under
`packages/frontend-shell-core/src/interaction/`.

- `foundation_contract.ts` builds exact `InteractionLayerFoundationContract` payloads for `CALM_SHELL`, `CLIENT_PORTAL_SHELL`, and `GOVERNANCE_DENSITY_SHELL`.
- `operator_interaction_layer.ts`, `portal_interaction_layer.ts`, and `governance_interaction_layer.ts` build schema-shaped interaction layers that always carry a required `foundation_contract`.
- `surface_registry.ts` is the single pure registry for allowed surfaces, reading order, promoted support eligibility, modal eligibility, live-region role, artifact-preview policy, and return-focus behavior.
- `support_surface_budget.ts` enforces `ONE_PROMOTED_SUPPORT_SURFACE_MAX` for default render paths.
- `interaction_contract_errors.ts` exposes typed fail-closed reason codes for tests and route fixtures.

The shared UI snapshot in
`packages/shared-ui/src/interaction/SurfaceRegistryDiagram.tsx` exposes a serializable diagram contract for internal route previews without route object data.

## Contract Rules Closed

- Support-region promotion is keyed by shell family plus explicit foundation contract, not component hierarchy.
- Default calm, portal, and governance plans allow one promoted support surface.
- Calm compare and audit support modes are explicit and mutually exclusive.
- Portal support and recovery surfaces use `STACK_BELOW_PRIMARY`, preventing a competing rail.
- Governance inspectors remain non-modal unless an explicit high-risk checkpoint reference is supplied.
- Registry decisions are deterministic and pure, so Playwright, native adapters, and route fixtures can reuse the same logical contract.

## Browser Proof

The internal foundation atlas now includes a Surface Registry Diagram at:

`/apps/operator-web/public/internal/frontend-shell-foundation-atlas/index.html`

The diagram renders one row per shell family:

- left: shell family and selector profile
- middle: allowed primary surfaces in canonical reading order
- right: exactly one promoted support region with budget and return-focus labels

Promotion and demotion use opacity and height transitions only. Under reduced motion, the diagram preserves labels, focus order, and support state while disabling visible movement.

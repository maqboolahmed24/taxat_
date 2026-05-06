# Cross Shell Design Tokens And Theme Runtime

`pc_0230` binds shell visual tokens to `InteractionLayerFoundationContract` instead of route-local CSS. The runtime lives in:

- [shell_token_contracts.ts](../../packages/frontend-shell-core/src/tokens/shell_token_contracts.ts)
- [interaction_foundation_to_theme.ts](../../packages/frontend-shell-core/src/tokens/interaction_foundation_to_theme.ts)
- [motion_tokens.ts](../../packages/frontend-shell-core/src/tokens/motion_tokens.ts)
- [responsive_compaction_tokens.ts](../../packages/frontend-shell-core/src/tokens/responsive_compaction_tokens.ts)
- [TaxatThemeProvider.tsx](../../packages/shared-ui/src/foundation/TaxatThemeProvider.tsx)
- [taxat-theme.css](../../packages/shared-ui/src/foundation/taxat-theme.css)
- [shellTheme.css](../../packages/shared-ui/src/foundation/shellTheme.css)

The internal proof surface is the [Frontend Shell Foundation Atlas](../../apps/operator-web/public/internal/frontend-shell-foundation-atlas/index.html). It renders one contract card per shell family:

- `CALM_SHELL`: four ordered planes, operator selector profile, calm support redock token.
- `CLIENT_PORTAL_SHELL`: primary task column with below-primary support shelf, portal selector profile.
- `GOVERNANCE_DENSITY_SHELL`: dense canvas with one auxiliary sidecar, governance selector profile.

Runtime rules:

- `shell_family` and `selector_profile` must match the schema-required pairing.
- Density, spacing, support spacing, compaction, motion, preview, notification, recovery, and current/history posture come from the foundation contract.
- Missing foundation contracts render `THEME_CONTRACT_MISSING_FOUNDATION` in internal fixtures.
- Route-local density or motion overrides are rejected unless explicitly bound to a shell-family token.
- Reduced motion changes `--taxat-motion-duration` and spatial displacement only; shell family, selector profile, focus order, and route meaning stay unchanged.

Verification is in [cross_shell_theme_runtime.spec.ts](../../tests/playwright/frontend/cross_shell_theme_runtime.spec.ts). The tests assert token variables, heading structure, visible focus rings, reduced-motion parity, compact viewport continuity, route-local motion ceiling, and fail-closed error rendering.

Authoritative sources:

- [cross_shell_design_token_and_interaction_layer_foundation_contract.md](../../Algorithm/cross_shell_design_token_and_interaction_layer_foundation_contract.md)
- [frontend_shell_and_interaction_law.md](../../Algorithm/frontend_shell_and_interaction_law.md)
- [low_noise_experience_contract.md](../../Algorithm/low_noise_experience_contract.md)
- [customer_client_portal_experience_contract.md](../../Algorithm/customer_client_portal_experience_contract.md)
- [admin_governance_console_architecture.md](../../Algorithm/admin_governance_console_architecture.md)
- [interaction_layer_foundation_contract.schema.json](../../Algorithm/schemas/interaction_layer_foundation_contract.schema.json)
- [operator_interaction_layer.schema.json](../../Algorithm/schemas/operator_interaction_layer.schema.json)
- [portal_interaction_layer.schema.json](../../Algorithm/schemas/portal_interaction_layer.schema.json)
- [governance_interaction_layer.schema.json](../../Algorithm/schemas/governance_interaction_layer.schema.json)

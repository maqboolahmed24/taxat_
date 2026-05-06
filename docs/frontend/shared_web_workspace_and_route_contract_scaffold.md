# Shared Web Workspace And Route Contract Scaffold

`pc_0229` establishes a shared web frontend route scaffold for the operator shell, governance shell, and client portal shell. The scaffold keeps route stability, semantic accessibility, interaction-layer foundation, and shell state taxonomy contracts in one fixture:

- [web_shell_contract_packets.json](../../packages/frontend-shell-core/src/fixtures/web_shell_contract_packets.json)
- [shell_family_registry.ts](../../packages/frontend-shell-core/src/shell_family_registry.ts)
- [route_contract_provider.tsx](../../packages/frontend-shell-core/src/providers/route_contract_provider.tsx)
- [TaxatThemeProvider.tsx](../../packages/shared-ui/src/foundation/TaxatThemeProvider.tsx)
- [web_shell_contract_fixture.ts](../../packages/playwright-kit/src/fixtures/web_shell_contract_fixture.ts)

The browser-visible route anchors are:

- [operator calm route](../../apps/operator-web/public/calm/index.html)
- [operator governance route](../../apps/operator-web/public/governance/index.html)
- [operator frontend shell foundation atlas](../../apps/operator-web/public/internal/frontend-shell-foundation-atlas/index.html)
- [client portal home route](../../apps/client-portal-web/public/home/index.html)

The TypeScript route boundaries are:

- [operator root](../../apps/operator-web/src/app/root.tsx)
- [operator calm route](../../apps/operator-web/src/routes/calm/index.tsx)
- [operator governance route](../../apps/operator-web/src/routes/governance/index.tsx)
- [frontend shell foundation atlas route](../../apps/operator-web/src/routes/internal/frontend-shell-foundation-atlas.tsx)
- [client portal root](../../apps/client-portal-web/src/app/root.tsx)
- [client portal home route](../../apps/client-portal-web/src/routes/home/index.tsx)

The implementation is checked by:

- [shared_workspace_scaffold.spec.ts](../../tests/playwright/frontend/shared_workspace_scaffold.spec.ts)
- [shared_workspace_route_contracts.spec.ts](../../tests/playwright/frontend/shared_workspace_route_contracts.spec.ts)

The fixture follows these Algorithm contracts:

- [route_stability_contract.schema.json](../../Algorithm/schemas/route_stability_contract.schema.json)
- [semantic_accessibility_contract.schema.json](../../Algorithm/schemas/semantic_accessibility_contract.schema.json)
- [interaction_layer_foundation_contract.schema.json](../../Algorithm/schemas/interaction_layer_foundation_contract.schema.json)
- [shell_state_taxonomy_contract.schema.json](../../Algorithm/schemas/shell_state_taxonomy_contract.schema.json)
- [semantic_accessibility_regression_pack.schema.json](../../Algorithm/schemas/semantic_accessibility_regression_pack.schema.json)

The scaffold rule is that each rendered browser anchor uses the same value for semantic anchor ref, `data-testid`, and native identifier. Responsive restacking and support-surface collapse can change layout, but they do not change `data-shell-route-key`, `data-workspace-route-key`, or the semantic anchor identifiers.

# Monorepo Bootstrap Runbook

- Status: Accepted bootstrap
- Card: `pc_0059`
- Scope: workspace root, initial package/app manifests, Python tooling entrypoint layout, native macOS boundary, and internal repository topology atlas

## Tooling Choice

- Package manager: `pnpm` workspace pinned through the root `packageManager` field
- Task graph: `turbo`
- Node runtime pin: `.node-version` set to `24.10.0` on the active Node 24 LTS line
- Python tooling boundary: `python/validators`
- Native boundary: `native/TaxatOperator`

`pc_0028` explicitly deferred the workspace manager choice while freezing the package families and ownership seams. `pc_0059` resolves that deferred choice in favor of `pnpm` plus `turbo`, which keeps the root private, makes workspace globs explicit, and leaves room for deterministic CI once the first real install hydrates `pnpm-lock.yaml`.

## Workspace Families

| Family | Bootstrap nodes | Why it exists |
| --- | --- | --- |
| `APPS` | `apps/control-plane-api`, `apps/operator-web`, `apps/client-portal-web`, `apps/internal-operator-macos`, `apps/provisioning-workbench` | Edge composition surfaces stay thin and do not absorb reusable legality or tooling logic. |
| `SHARED_PACKAGES` | `packages/contracts-core`, `packages/runtime-foundation`, `packages/domain-kernel`, `packages/web-platform`, `packages/native-platform`, `packages/testing-harnesses`, `tools/workspace-devx` | Shared logic stays cohesive and acyclic, aligned to the phase-00 package map. |
| `GENERATED` | `packages/generated-models` | Generated bindings stay downstream of contract sources. |
| `PYTHON_TOOLING` | `python/validators` | Validator and forensic entrypoints remain first-class without Node-only assumptions. |
| `NATIVE_MACOS` | `native/TaxatOperator` | Signed desktop delivery stays Xcode-owned while still visible in the repo topology. |

## ADR-Aligned Overrides

The `pc_0059` prompt used some generic package labels. Earlier accepted outputs already fixed stronger package IDs and paths, so the bootstrap records explicit overrides instead of silently renaming the accepted topology:

| Requested label | Adopted package/path | Why |
| --- | --- | --- |
| `packages/contracts` | `packages/contracts-core` | Phase-00 fixed `contracts-core` as the schema source-of-truth seam. |
| `packages/generated-types` | `packages/generated-models` | Generated bindings are already named `generated-models` in the accepted package map. |
| `packages/config` | `packages/runtime-foundation` | Config belongs with ids, hashes, decimals, time, and other runtime primitives. |
| `packages/shared-ui` | `packages/web-platform` | Shared browser selectors, routes, and tokens were accepted as the `web-platform` seam. |
| `packages/playwright-kit` | `packages/testing-harnesses` | Playwright support is part of the wider testing harness boundary, not a standalone permanent package. |
| `native/TaxatOperator` only | `apps/internal-operator-macos` plus `native/TaxatOperator` | The workspace graph needs an app identity, but the native code and signing boundary must remain outside Node-only build assumptions. |

## Bootstrapping Steps

1. Pin Node via `.node-version`.
2. Hydrate the workspace with `pnpm install` when the repository is ready to mint the first `pnpm-lock.yaml`.
3. Regenerate the internal topology atlas data with `node tools/workspace-devx/scripts/build-workspace-topology-atlas.mjs`.
4. Run repository unit coverage with `playwright test --config=playwright.config.ts --project=unit tests/unit/repository/workspace_graph.spec.ts`.
5. Run the internal atlas regression with `playwright test --config=playwright.config.ts --project=browser tests/playwright/internal/workspace_topology_atlas.spec.ts`.
6. Validate the algorithm corpus with `python3 Algorithm/scripts/validate_contracts.py --self-test`.

## Mapping Back To The Algorithm Corpus

- `Algorithm/README.md`: authoritative validator entrypoints, schema inventory, and shared spine vocabulary
- `Algorithm/modules.md`: module/domain seam inventory that justifies non-app shared packages
- `Algorithm/frontend_shell_and_interaction_law.md`: browser shell separation and internal route constraints for `apps/operator-web` and `apps/client-portal-web`
- `Algorithm/northbound_api_and_session_contract.md`: backend and session boundary for `apps/control-plane-api`
- `Algorithm/macos_native_operator_workspace_blueprint.md`: `apps/internal-operator-macos`, `packages/native-platform`, and `native/TaxatOperator`
- `Algorithm/security_and_runtime_hardening_contract.md`, `Algorithm/deployment_and_resilience_contract.md`, `Algorithm/verification_and_release_gates.md`: deterministic scripts, release-aware repo layout, and testing boundaries
- `docs/architecture/monorepo-package-boundaries-and-team-ownership-map.md`: accepted package IDs, paths, layers, and owner streams
- `data/analysis/language_runtime_role_assignment.json`: retained TypeScript, Python, and Swift runtime roles

## What This Bootstrap Does Not Do Yet

- no synthetic `pnpm-lock.yaml` is committed before the first real workspace install
- no concrete web framework or backend transport framework is chosen here
- no domain-runtime packages beyond the immediate skeleton are implemented yet
- no Xcode project is generated yet; the native boundary is reserved and named, but later native tasks still own the real app scaffold

The bootstrap is intentionally structural. It gives later agents deterministic destinations and one internal graph view before the feature implementation phases begin.

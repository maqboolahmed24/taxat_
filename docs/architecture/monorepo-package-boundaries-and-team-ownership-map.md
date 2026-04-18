# Monorepo Package Boundaries and Team Ownership Map

- Status: Accepted
- Date: 2026-04-18
- Decision: Domain-oriented monorepo with restrained shared packages and edge apps
- Score: 93.46

## Context

Taxat now has enough architectural law to freeze the repo shape before implementation begins. Earlier phase-00 outputs already normalized `209` named modules with `218` dependency edges, `45` read models, `10` authority operation families, `24` browser routes across two deployables, `7` native scenes across `8` native package roles, `13` release-evidence artifacts, and `10` mandatory test families. The remaining gap is structural: there is still no official package map telling later implementation tasks where code belongs.

That gap matters because phases 02 through 06 already define `333` implementation tasks. The repo cannot wait until phase 03 to decide whether schema authority, manifest legality, authority transport, projectors, app shells, release tooling, and test harnesses live in packages, in apps, or in a pile of ad hoc folders.

## Decision

Adopt a **domain-oriented monorepo with restrained shared packages and edge apps**:

- Four edge apps:
  - `apps/control-plane-api`
  - `apps/operator-web`
  - `apps/client-portal-web`
  - `apps/internal-operator-macos`
- Strong shared packages for:
  - contract sources and generated models
  - runtime foundations
  - domain legality seams
  - read-model projectors and northbound runtime
  - web and native shared platform layers
  - observability, release tooling, and test harnesses
- One workspace tooling package under `tools/` for codegen, linting, local-dev, and task orchestration.

This is intentionally not an apps-only repo and not a micro-package mesh. The chosen layout follows the backlog's real domain seams while keeping route-specific UI composition inside apps and keeping backend legality out of UI packages.

## Package Topology

| Package | Path | Owner | Type | Primary Tasks |
| --- | --- | --- | --- | --- |
| Contracts Core | packages/contracts-core | foundations_contracts | shared_foundation | 2 |
| Generated Models | packages/generated-models | foundations_contracts | shared_foundation | 1 |
| Runtime Foundation | packages/runtime-foundation | foundations_contracts | shared_foundation | 10 |
| Observability and Audit | packages/observability-audit | reliability_release | shared_support | 12 |
| Domain Kernel | packages/domain-kernel | engine_core | domain_core | 0 |
| Access and Session | packages/access-session | engine_core | domain_runtime | 13 |
| Manifest, Lineage, and Replay | packages/manifest-replay | engine_core | domain_runtime | 22 |
| Collection and Intake | packages/collection-intake | engine_core | domain_runtime | 12 |
| Compute Engine | packages/compute-engine | engine_core | domain_runtime | 12 |
| Authority Gateway | packages/authority-gateway | authority_workflow | domain_runtime | 12 |
| Workflow and Collaboration | packages/workflow-collaboration | authority_workflow | domain_runtime | 12 |
| Read-Model Projectors | packages/read-model-projectors | control_plane_runtime | projection_runtime | 30 |
| Northbound Runtime | packages/northbound-runtime | control_plane_runtime | transport_runtime | 13 |
| Web Platform | packages/web-platform | web_experience | experience_platform | 12 |
| Native Platform | packages/native-platform | native_experience | experience_platform | 0 |
| Release and Migration Tooling | packages/release-tooling | reliability_release | support_runtime | 13 |
| Testing Harnesses | packages/testing-harnesses | reliability_release | support_runtime | 92 |
| Workspace DevX | tools/workspace-devx | foundations_contracts | support_runtime | 5 |
| Control-Plane API App | apps/control-plane-api | control_plane_runtime | app | 0 |
| Operator Web App | apps/operator-web | web_experience | app | 34 |
| Client Portal Web App | apps/client-portal-web | web_experience | app | 14 |
| Internal Operator macOS App | apps/internal-operator-macos | native_experience | app | 12 |

The package count is deliberate: `22` total units covering `333` later tasks. That is enough resolution to express the corpus seams without creating one package per module or one package per route.

## Dependency Layers

| Layer | Packages |
| --- | --- |
| 0 | contracts-core |
| 1 | generated-models |
| 2 | observability-audit, runtime-foundation |
| 3 | domain-kernel |
| 4 | access-session, authority-gateway, collection-intake, compute-engine, manifest-replay, workflow-collaboration |
| 5 | read-model-projectors |
| 6 | native-platform, northbound-runtime, release-tooling, web-platform |
| 7 | testing-harnesses, workspace-devx |
| 8 | apps/client-portal-web, apps/control-plane-api, apps/internal-operator-macos, apps/operator-web |

Production dependencies are acyclic by construction. The only sanctioned span exceptions are `testing-harnesses` and `workspace-devx`, and both are one-way support packages that production runtime may not import.

## Ownership Streams

| Team | Handle | Owned Packages | Primary Tasks |
| --- | --- | --- | --- |
| Foundations and Contracts | @taxat/foundations-contracts | contracts-core, generated-models, runtime-foundation, workspace-devx | 18 |
| Engine Core | @taxat/engine-core | domain-kernel, access-session, manifest-replay, collection-intake, compute-engine | 59 |
| Authority and Workflow | @taxat/authority-workflow | authority-gateway, workflow-collaboration | 24 |
| Control-Plane Runtime | @taxat/control-plane-runtime | read-model-projectors, northbound-runtime, apps/control-plane-api | 43 |
| Web Experience | @taxat/web-experience | web-platform, apps/operator-web, apps/client-portal-web | 60 |
| Native Experience | @taxat/native-experience | native-platform, apps/internal-operator-macos | 12 |
| Reliability and Release | @taxat/reliability-release | observability-audit, release-tooling, testing-harnesses | 117 |

The package map creates `7` ownership streams rather than one team per folder. That is the right granularity for review and delivery: enough separation to protect contracts, engine core, runtime, web, native, and reliability concerns, but still broad enough to keep accountability at the stream level.

## Later Task Coverage

| Package | Primary Tasks | Secondary Tasks | Representative Clusters |
| --- | --- | --- | --- |
| testing-harnesses | 92 | 10 | testing_schema_contract, testing_engine_modules, testing_state_machine_model |
| apps/operator-web | 34 | 19 | frontend_low_noise, frontend_collaboration, frontend_governance |
| read-model-projectors | 30 | 0 | backend_low_noise, backend_portal, backend_governance |
| manifest-replay | 22 | 19 | backend_manifest, backend_recovery |
| apps/client-portal-web | 14 | 16 | frontend_portal |
| access-session | 13 | 0 | phase_02_seq_083, backend_access |
| northbound-runtime | 13 | 16 | backend_northbound |
| release-tooling | 13 | 6 | backend_release_resilience, phase_02_seq_066, phase_02_seq_080 |

Every phase 02-06 task maps to at least one owning package and one owning team. The full deterministic routing table lives in [later_task_to_package_map.json](/Users/test/Code/taxat_/data/analysis/later_task_to_package_map.json), with `333` mapped rows and `0` unmapped tasks.

## CODEOWNERS Draft

The draft ownership surface is intentionally package-first:

- package-specific globs: `22`
- repo-level globs: `3`

This keeps review boundaries aligned with the package map instead of relying on ad hoc team memory.

## Alternatives Considered

| Rank | Alternative | Weighted Score |
| --- | --- | --- |
| 1 | Domain-oriented monorepo with restrained shared packages and edge apps | 93.46 |
| 2 | Highly granular micro-package topology | 65.74 |
| 3 | Coarse apps-only or thin-package monorepo | 52.07 |

The winning option is **Domain-oriented monorepo with restrained shared packages and edge apps** with a weighted score of `93.46`.

## Why This Option Wins

- It is the only option that matches the real roadmap cluster shape: foundations in phase 02, backend domains in phase 03, read-side and recovery in phase 04, web/native apps in phase 05, and test/release harnesses in phase 06.
- It gives contracts and generated models a single source-of-truth boundary, which directly closes the schema/type ownership gap.
- It keeps browser and native shared semantics reusable without letting web UI code, native UI code, or backend legality leak across runtime boundaries.
- It makes autonomous routing practical: later task slugs like `backend_manifest`, `frontend_portal`, or `testing_authority_integration` now have obvious package destinations.
- It protects release and migration tooling from feature UI sprawl and keeps authority transport out of browser packages.

## Guardrails On The Decision

- `contracts-core` is the only source-of-truth package for schemas, sample payloads, and validator-owned contract artifacts.
- `generated-models` is a one-way generated output from `contracts-core`; consumers do not hand-edit generated types.
- Apps are leaf composition surfaces. Reusable logic belongs in packages.
- `web-platform` and `native-platform` may share contracts and semantic grammars, but not each other's runtime UI code.
- `authority-gateway` may not depend on browser/native UI packages or read-side-only packages.
- `release-tooling` and `testing-harnesses` stay separate from feature UI packages.
- Production packages may not depend on `testing-harnesses` or `workspace-devx`.

## Consequences

Positive consequences:

- later implementation tasks now have deterministic destinations
- CODEOWNERS and review boundaries can be drafted immediately
- backend legality, read-side projection, UI shells, native delivery, testing, and release concerns stop competing for the same folders

Negative consequences and tradeoffs:

- package governance matters; weak ownership would still let logic drift back into apps
- the shared package count is higher than an apps-only repo
- teams must keep route-specific and app-specific UI composition inside apps instead of promoting it prematurely into shared packages

## Deferred Decisions and Typed Gaps

- `workspace_manager_tool_choice_deferred` (DEFERRED_DECISION): The package boundary map fixes the workspace shape and ownership seams, but not the final package manager, task graph tool, or remote cache product.
- `shared_operating_contract_0022_0029_missing` (SOURCE_GAP): The referenced shared operating contract for cards 0022 through 0029 is absent, so this package map is grounded directly in named algorithm contracts, the checklist, and prior ADR outputs.

## References

- Package boundary matrix: [package_boundary_matrix.json](/Users/test/Code/taxat_/data/analysis/package_boundary_matrix.json)
- Dependency rules: [package_dependency_rules.json](/Users/test/Code/taxat_/data/analysis/package_dependency_rules.json)
- Team ownership map: [team_ownership_map.json](/Users/test/Code/taxat_/data/analysis/team_ownership_map.json)
- CODEOWNERS draft: [codeowners_draft.json](/Users/test/Code/taxat_/data/analysis/codeowners_draft.json)
- Later task routing: [later_task_to_package_map.json](/Users/test/Code/taxat_/data/analysis/later_task_to_package_map.json)
- Comparison notes: [monorepo-package-boundaries-and-team-ownership-map-comparison.md](/Users/test/Code/taxat_/docs/architecture/monorepo-package-boundaries-and-team-ownership-map-comparison.md)
- Diagram: [monorepo-package-boundaries.mmd](/Users/test/Code/taxat_/diagrams/analysis/monorepo-package-boundaries.mmd)

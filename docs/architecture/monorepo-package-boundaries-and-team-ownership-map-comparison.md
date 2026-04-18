# Monorepo Package Boundary Comparison

## Weighted Criteria

| Criterion | Weight | Priority | Rationale |
| --- | --- | --- | --- |
| Contract source-of-truth clarity | 14 | HARD_REQUIREMENT | Schemas, generated types, and validator-owned artifacts need one explicit authoritative home rather than being scattered across app folders. |
| Cohesion against later roadmap track clusters | 14 | HARD_REQUIREMENT | The package map should absorb the already-planned phase 02-06 tracks without forcing every implementation task to renegotiate repo structure. |
| Dependency direction and acyclicity | 12 | HARD_REQUIREMENT | UI, transport, release tooling, and authority code need explicit import boundaries so legal/business rules do not leak across layers or form cycles. |
| Cross-surface reuse without runtime leakage | 10 | HARD_REQUIREMENT | Web and native surfaces should share contracts, selectors, and route/runtime semantics without importing each other's UI runtimes or backend legality modules. |
| Native and web coexistence fit | 10 | HARD_REQUIREMENT | The topology must respect the separate operator web, portal web, and native macOS embodiments already chosen in prior ADRs. |
| Testing and release harness fit | 10 | HARD_REQUIREMENT | Testing fixtures, release evidence assembly, migration tooling, and contract guards need stable homes outside feature UI packages. |
| Team ownership and review boundary clarity | 10 | HARD_REQUIREMENT | Package seams should imply review and ownership streams cleanly enough to support CODEOWNERS and later autonomous agent routing. |
| Autonomous implementation destination clarity | 10 | HARD_REQUIREMENT | A later implementation agent should be able to pick a destination package from the task wording alone, without re-arguing structure. |
| Onboarding and cognitive load | 5 | TRADEOFF | The layout should be legible to humans and agents without collapsing into a giant app or exploding into an unreadable micro-package mesh. |
| Build graph and sprawl manageability | 5 | TRADEOFF | The package graph should stay strong enough to protect boundaries, but restrained enough that versioning, codegen, and review do not become an architecture tax. |

## Alternative Totals

| Rank | Alternative | Weighted Total | Summary |
| --- | --- | --- | --- |
| 1 | Domain-oriented monorepo with restrained shared packages and edge apps | 93.46 | Use a small number of strong domain and platform packages with four edge apps: control-plane API, operator web, client portal web, and native macOS. |
| 2 | Highly granular micro-package topology | 65.74 | Create many narrow libraries, often one per subdomain, contract family, or frontend subsystem, with aggressive isolation and many tiny package boundaries. |
| 3 | Coarse apps-only or thin-package monorepo | 52.07 | Keep most logic inside app folders with only a very small contracts/utilities layer, leaving backend, web, native, testing, and release concerns largely app-local. |

## Coverage Context

- Later tasks mapped: `333`
- Phase counts: `{"phase_02": 26, "phase_03": 84, "phase_04": 60, "phase_05": 72, "phase_06": 91}`
- Package coverage count: `19`
- Team coverage count: `7`

## Contract source-of-truth clarity

- Priority: `HARD_REQUIREMENT`
- Weight: `14`
- Rationale: Schemas, generated types, and validator-owned artifacts need one explicit authoritative home rather than being scattered across app folders.

| Alternative | Raw | Weighted | Reason |
| --- | --- | --- | --- |
| Domain-oriented monorepo with restrained shared packages and edge apps | 4.85 | 13.58 | A dedicated contracts source package plus one-way generated-model flow gives the clearest authority boundary. |
| Highly granular micro-package topology | 4.2 | 11.76 | It can preserve strong source-of-truth boundaries, but often splits the contracts layer more than the repo needs. |
| Coarse apps-only or thin-package monorepo | 2.45 | 6.86 | Thin shared layers tend to push schema consumers and generated code into app-local copies or convenience wrappers. |

## Cohesion against later roadmap track clusters

- Priority: `HARD_REQUIREMENT`
- Weight: `14`
- Rationale: The package map should absorb the already-planned phase 02-06 tracks without forcing every implementation task to renegotiate repo structure.

| Alternative | Raw | Weighted | Reason |
| --- | --- | --- | --- |
| Domain-oriented monorepo with restrained shared packages and edge apps | 4.75 | 13.3 | The phase 02-06 tracks map naturally into domain, projector, app, release, and test packages with little ambiguity. |
| Highly granular micro-package topology | 3.15 | 8.82 | The roadmap clusters are bigger than one-file or one-concept packages, so tasks would still need secondary routing logic. |
| Coarse apps-only or thin-package monorepo | 2.4 | 6.72 | The backlog's domain tracks are much more granular than an apps-only layout, so many tasks lose obvious destinations. |

## Dependency direction and acyclicity

- Priority: `HARD_REQUIREMENT`
- Weight: `12`
- Rationale: UI, transport, release tooling, and authority code need explicit import boundaries so legal/business rules do not leak across layers or form cycles.

| Alternative | Raw | Weighted | Reason |
| --- | --- | --- | --- |
| Domain-oriented monorepo with restrained shared packages and edge apps | 4.7 | 11.28 | The layout supports a clean layered graph: contracts -> foundations -> domains -> projectors/runtime -> apps, with test/devx as controlled exceptions. |
| Highly granular micro-package topology | 3.4 | 8.16 | Strict import control is possible, but only at the cost of a much more complex graph. |
| Coarse apps-only or thin-package monorepo | 2.1 | 5.04 | App-local logic encourages import leakage across frontend, transport, and domain concerns. |

## Cross-surface reuse without runtime leakage

- Priority: `HARD_REQUIREMENT`
- Weight: `10`
- Rationale: Web and native surfaces should share contracts, selectors, and route/runtime semantics without importing each other's UI runtimes or backend legality modules.

| Alternative | Raw | Weighted | Reason |
| --- | --- | --- | --- |
| Domain-oriented monorepo with restrained shared packages and edge apps | 4.65 | 9.3 | Web and native reuse shared contracts and runtime semantics, but their UI runtimes stay separate. |
| Highly granular micro-package topology | 4.0 | 8.0 | Runtime leakage is controllable, though many boundaries become ceremony instead of meaningful seams. |
| Coarse apps-only or thin-package monorepo | 2.6 | 5.2 | Reuse often happens through direct app-to-app borrowing or informal shared folders rather than protected interfaces. |

## Native and web coexistence fit

- Priority: `HARD_REQUIREMENT`
- Weight: `10`
- Rationale: The topology must respect the separate operator web, portal web, and native macOS embodiments already chosen in prior ADRs.

| Alternative | Raw | Weighted | Reason |
| --- | --- | --- | --- |
| Domain-oriented monorepo with restrained shared packages and edge apps | 4.75 | 9.5 | This matches ADR-006 and ADR-007 directly by keeping two web apps and one native app at the edges. |
| Highly granular micro-package topology | 3.45 | 6.9 | It can model web/native splits, but the number of tiny platform packages becomes hard to keep coherent. |
| Coarse apps-only or thin-package monorepo | 2.55 | 5.1 | Separate web and native embodiments exist, but shared semantics are harder to stabilize when most logic is app-local. |

## Testing and release harness fit

- Priority: `HARD_REQUIREMENT`
- Weight: `10`
- Rationale: Testing fixtures, release evidence assembly, migration tooling, and contract guards need stable homes outside feature UI packages.

| Alternative | Raw | Weighted | Reason |
| --- | --- | --- | --- |
| Domain-oriented monorepo with restrained shared packages and edge apps | 4.8 | 9.6 | Testing and release tooling get explicit homes instead of being stuffed into feature apps or backend runtime packages. |
| Highly granular micro-package topology | 3.55 | 7.1 | Test and release tooling can be isolated, but coordinating them across many packages becomes expensive. |
| Coarse apps-only or thin-package monorepo | 2.35 | 4.7 | Testing and release code tend to end up scattered through apps and scripts rather than controlled packages. |

## Team ownership and review boundary clarity

- Priority: `HARD_REQUIREMENT`
- Weight: `10`
- Rationale: Package seams should imply review and ownership streams cleanly enough to support CODEOWNERS and later autonomous agent routing.

| Alternative | Raw | Weighted | Reason |
| --- | --- | --- | --- |
| Domain-oriented monorepo with restrained shared packages and edge apps | 4.6 | 9.2 | Ownership streams stay coherent: foundations, engine core, authority/workflow, control-plane runtime, web, native, and reliability/release. |
| Highly granular micro-package topology | 3.1 | 6.2 | Ownership becomes precise but also fragmented, which weakens stream-level accountability. |
| Coarse apps-only or thin-package monorepo | 2.8 | 5.6 | CODEOWNERS can protect app folders, but cross-cutting backend/runtime ownership stays blurry. |

## Autonomous implementation destination clarity

- Priority: `HARD_REQUIREMENT`
- Weight: `10`
- Rationale: A later implementation agent should be able to pick a destination package from the task wording alone, without re-arguing structure.

| Alternative | Raw | Weighted | Reason |
| --- | --- | --- | --- |
| Domain-oriented monorepo with restrained shared packages and edge apps | 4.9 | 9.8 | Most later task slugs point to one obvious package family immediately. |
| Highly granular micro-package topology | 2.7 | 5.4 | Agents still need to decide among many near-neighbor packages, which reintroduces structural argument at implementation time. |
| Coarse apps-only or thin-package monorepo | 2.25 | 4.5 | Task wording like schema compatibility, projectors, or authority ingress does not map cleanly to one app folder. |

## Onboarding and cognitive load

- Priority: `TRADEOFF`
- Weight: `5`
- Rationale: The layout should be legible to humans and agents without collapsing into a giant app or exploding into an unreadable micro-package mesh.

| Alternative | Raw | Weighted | Reason |
| --- | --- | --- | --- |
| Domain-oriented monorepo with restrained shared packages and edge apps | 3.9 | 3.9 | There are enough packages to express the seams, but still far fewer than the number of domain tracks and surface variants in the roadmap. |
| Highly granular micro-package topology | 1.8 | 1.8 | The package count and indirection tax are too high for a repo that is already conceptually dense. |
| Coarse apps-only or thin-package monorepo | 4.25 | 4.25 | The low package count is initially easy to explain. |

## Build graph and sprawl manageability

- Priority: `TRADEOFF`
- Weight: `5`
- Rationale: The package graph should stay strong enough to protect boundaries, but restrained enough that versioning, codegen, and review do not become an architecture tax.

| Alternative | Raw | Weighted | Reason |
| --- | --- | --- | --- |
| Domain-oriented monorepo with restrained shared packages and edge apps | 4.0 | 4.0 | The graph is larger than an apps-only repo, but manageable because the shared packages are broad and deliberate rather than tiny. |
| Highly granular micro-package topology | 1.6 | 1.6 | This is the worst option for workspace sprawl, codegen fanout, and CI graph complexity. |
| Coarse apps-only or thin-package monorepo | 4.1 | 4.1 | Build graph management is easy because there are fewer packages, though the simplicity hides growing architectural drift. |

## Why The Runner-Ups Lost

- `Highly granular micro-package topology` lost because creates too much indirection for a repo that already has strong conceptual complexity in the algorithm corpus itself.
- `Coarse apps-only or thin-package monorepo` lost because backend legality, release tooling, and feature UI logic blur together quickly, especially for northbound, projector, and release tasks.

# ADR-001: Primary Implementation Stack

- Status: Accepted
- Date: 2026-04-17
- Deciders: Phase 00 architecture analysis pack

## Context

Taxat needs one declared product-core stack before later ADRs choose storage, identity/session details, authority-boundary implementation specifics, frontend topology, and testing/release strategies. The algorithm corpus is unusually demanding: canonical hashing, replay-safe execution, exact-decimal money rules, contract-heavy schemas, rich browser shells, Playwright-first validation, append-only auditability, and a first-class native macOS workspace all need to coexist without semantic drift.

The repository already shows two concrete implementation signals:

- Python is the live corpus-validation and analysis runtime through `Algorithm/scripts/validate_contracts.py`, `Algorithm/tools/forensic_contract_guard.py`, and the growing `tools/analysis/*.py` estate.
- Node/TypeScript is already present for Playwright and the browser-viewable analysis atlases, which matches the browser-product and selector-heavy obligations in the frontend contracts.

ADR-001 therefore has to pick a primary product stack while still preserving justified secondary runtimes that the corpus already implies.

## Decision

Adopt a **TypeScript-first product stack on the current active Node LTS line** for:

- browser product surfaces
- northbound APIs and stream/reconnect services
- authority-facing orchestration and gateway adapters
- shared product-runtime contract packages
- Playwright browser automation and browser-facing fixtures

Retain **Python** as a first-class supporting runtime for:

- corpus validators and forensic guards
- offline analysis builders
- deterministic fixture generation and verification
- contract-consumption smoke tests that validate cross-runtime drift

Retain **Swift** with **SwiftUI by default and targeted AppKit where the blueprint requires it** for:

- the native macOS operator workspace
- native UI automation via XCUITest
- native projection, cache, and command-client consumption of shared contracts

This is an intentionally polyglot decision, but only at the seams the corpus already justifies. Taxat is not adopting a 'best tool per file' culture.

## Decision Drivers

| Driver | Priority | Weight | Why It Matters |
| --- | --- | --- | --- |
| Deterministic serialization and hashing | HARD_REQUIREMENT | 12 | Replay, manifest sealing, and attestation depend on byte-stable serialization and hash equality across runtime boundaries. |
| Exact-decimal and money-safe computation support | HARD_REQUIREMENT | 10 | The compute and parity contracts explicitly forbid binary floating-point for money-bearing values and require canonical decimal-string persistence. |
| Contract and schema ergonomics | HARD_REQUIREMENT | 8 | The corpus is schema-heavy, closed by default, and expects route-visible artifacts, stream payloads, and state objects to stay machine-checkable across services and clients. |
| Browser product and design-system productivity | HARD_REQUIREMENT | 12 | The product surface is route-heavy, design-token-rich, and selector-governed across portal, collaboration, and governance shells. |
| Playwright and frontend automation ergonomics | HARD_REQUIREMENT | 7 | Browser automation is a first-class delivery and validation requirement, not a testing afterthought. |
| Backend API, streaming, and concurrency fit | HARD_REQUIREMENT | 10 | The backend must support typed command receipts, reconnect-safe streams, idempotent retries, and authority callbacks without compromising deterministic semantics. |
| Security ecosystem maturity | HARD_REQUIREMENT | 8 | The runtime must credibly support short-lived sessions, secret isolation, supply-chain integrity, and fail-closed authority handling. |
| Observability ecosystem fit | STRONG_PREFERENCE | 6 | The chosen runtime should work naturally with OpenTelemetry-style traces, metrics, logs, and correlation-aware audit overlays. |
| macOS-native coexistence strategy | HARD_REQUIREMENT | 7 | The browser and backend runtime choice cannot erase the first-class Swift macOS client or force it into a browser wrapper posture. |
| Shared type and contract reuse across surfaces | HARD_REQUIREMENT | 8 | The same contract set must drive browser routes, backend envelopes, automation fixtures, Python validators, and Swift native models without semantic drift. |
| Hiring, maintainability, and long-term operability | STRONG_PREFERENCE | 5 | The primary stack should minimize gratuitous language fragmentation while keeping the supporting Python and Swift estates credible and maintainable. |
| Migration complexity from current repo evidence | STRONG_PREFERENCE | 4 | Current repo evidence already shows Python analysis tooling and Node/Playwright browser automation, so the first product stack should preserve that leverage rather than restart from zero in every lane. |
| Performance profile under expected workloads | DEFERRED_CONCERN | 3 | The product needs credible streaming, validation, and compute throughput, but there is not yet enough live workload evidence to let raw throughput dominate the phase-00 stack choice. |

## Alternatives Considered

| Alternative | Weighted Score | Rank |
| --- | --- | --- |
| TypeScript/Node-centered product stack with Swift native and retained Python tooling | 89.7 | 1 |
| Kotlin/JVM backend with TypeScript web and Swift native | 84.8 | 2 |
| Python-centered backend with TypeScript web and Swift native | 82.35 | 3 |

The winning option is **TypeScript/Node-centered product stack with Swift native and retained Python tooling** with a weighted score of `89.7`.

## Why This Option Wins

- It is the strongest fit for the browser-heavy product surface, the semantic-selector contracts, and the Playwright-first validation model.
- It gives the cleanest shared-type story across browser UI, backend APIs, and automated browser tests, which is the largest avoidable source of drift at this phase.
- It preserves the substantial Python validator and analysis estate as a first-class support runtime instead of forcing a premature rewrite.
- It coexists cleanly with the server-authoritative Swift macOS client because the native blueprint already expects the server to own legal truth and the client to stay projection-and-command only.

## Guardrails on the Decision

- No money-bearing or hash-governing path may use imprecise binary floating-point primitives without a documented exact-decimal abstraction. In practice, persisted money values remain canonical decimal strings with fixed scale.
- Canonical serialization and hash calculation must live in one shared, versioned implementation boundary, not one ad hoc copy per service or client.
- Python remains authoritative for corpus self-tests and forensic guards until a concrete replacement plan exists. ADR-001 does not authorize deleting or sidelining that tooling estate.
- Swift remains the only acceptable runtime for the first-class native macOS client. ADR-001 does not authorize replacing the native workspace with a browser wrapper or embedded-web compromise.

## Runtime Role Assignment

| Role | Primary Runtime | Host Runtime | Why |
| --- | --- | --- | --- |
| browser_frontend | TypeScript | browser + Node-based build tooling | Portal, collaboration, and governance surfaces are selector-heavy, route-rich, and Playwright-first. |
| backend_northbound_apis_and_runtime_services | TypeScript on current active Node LTS | Node.js | Northbound command, snapshot, stream, and authority-adapter services benefit from sharing contract types and test fixtures with the browser layer. |
| shared_contract_and_model_packages | JSON Schema as source, TypeScript as primary product-consumption target | schema generation pipeline | The product core should consume generated or tightly aligned TypeScript models while Python and Swift consume the same schema source through dedicated adapters. |
| cli_analysis_and_forensic_tooling | Python | Python 3 | The repository already has a substantial Python validator, analysis, and forensic toolchain that should remain first-class rather than being rewritten prematurely. |
| browser_test_automation | TypeScript | Playwright on Node.js | Playwright is already present in the repo and is explicitly required by the UI/UX and browser-surface contracts. |
| native_desktop_client | Swift | SwiftUI with targeted AppKit | The macOS operator workspace is a first-class native embodiment and must not be reduced to a browser wrapper. |
| native_ui_automation | Swift | XCUITest | Native executable validation belongs in the design loop alongside Playwright for browser surfaces. |
| product_adjacent_glue_and_ops_scripts | TypeScript for product-adjacent automation, Python where existing validator/analysis scripts already own the job | Node.js or Python | Avoid inventing a fourth first-class runtime for ordinary glue. Prefer the existing product-core runtime unless Python already owns the tool surface. |

## Consequences

Positive consequences:

- Product-core browser and backend work can share one primary language and one primary contract-consumption target.
- Playwright, browser fixtures, and product DTOs stay in one ecosystem instead of straddling a harder backend seam.
- Python keeps its clear, justified ownership of validation and analysis rather than being forced into the live product core just because it already exists.
- Swift remains a principled client embodiment rather than a second compliance engine.

Negative consequences and tradeoffs:

- TypeScript requires stronger discipline than Python or Kotlin around exact-decimal safety and canonical serialization.
- Product engineers still need to operate in a polyglot repo: TypeScript for product core, Python for validation/tooling, and Swift for native.
- Some backend-only alternatives offer stronger raw throughput or built-in decimal ergonomics, but they lose too much on browser alignment and shared contract reuse for phase 00.

## Risks and Mitigations

| Risk | Why It Matters | Mitigation |
| --- | --- | --- |
| JS number drift in money-bearing paths | Violates exact-decimal and replay credibility. | Enforce fixed-scale decimal abstractions, canonical decimal-string persistence, and contract tests that reject binary-float drift. |
| Hash drift across runtimes | Breaks replay, manifest sealing, and deterministic attestation. | Centralize canonical serialization/hash helpers and validate them against Python fixtures and golden packs. |
| Type drift between TypeScript, Python, and Swift consumers | Causes browser/backend/native disagreement. | Keep schemas as the only machine-authoritative shape source and gate changes through cross-runtime fixture tests. |
| Backend framework details leak into ADR-001 | Would prematurely decide storage, transport, or identity implementation details. | Fence those items explicitly as deferred ADRs. |

## Rollback Posture

If the TypeScript/Node product core cannot satisfy exact-decimal discipline, canonical hashing, or operational requirements during implementation spikes, the rollback target is **not** a free-for-all rewrite. The rollback path is to preserve:

- the same prose contracts and JSON schemas
- the same Python validator and fixture estate
- the same Swift native client boundary

and to reconsider the backend/product-core runtime behind the same contract seam, with Kotlin/JVM as the strongest current fallback candidate. That rollback would be a later ADR superseding ADR-001 rather than a quiet per-service drift.

## Deferred Decisions

- storage and eventing topology
- identity, step-up, and session implementation details
- authority-boundary implementation specifics
- exact web framework and browser frontend topology
- exact decimal library and codegen tool choices
- monorepo package boundaries and team ownership splits

Those decisions are intentionally deferred to later ADRs or later phase-00 cards.

## Shared Contract Consumption Strategy

- Canonical sources: prose contracts, JSON schemas, deterministic fixtures, and validator self-tests.
- Primary product consumption target: TypeScript for browser and Node runtime code.
- Supporting consumption targets: Python for offline verification and analysis; Swift for native projection and command-client models.
- Drift guards: shared canonical decimal/hash law, Python validator self-test, TypeScript fixture tests, and native decode smoke tests.

## References

- Constraint matrix: [primary_stack_constraint_matrix.json](/Users/test/Code/taxat_/data/analysis/primary_stack_constraint_matrix.json)
- Runtime role map: [language_runtime_role_assignment.json](/Users/test/Code/taxat_/data/analysis/language_runtime_role_assignment.json)
- Contract consumption strategy: [shared_contract_consumption_strategy.json](/Users/test/Code/taxat_/data/analysis/shared_contract_consumption_strategy.json)
- Scorecard: [ADR-001-primary-implementation-stack-scorecard.json](/Users/test/Code/taxat_/docs/architecture/adr/ADR-001-primary-implementation-stack-scorecard.json)
- Comparison notes: [ADR-001-primary-implementation-stack-comparison.md](/Users/test/Code/taxat_/docs/architecture/adr/ADR-001-primary-implementation-stack-comparison.md)
- Decision diagram: [ADR-001-primary-implementation-stack.mmd](/Users/test/Code/taxat_/diagrams/analysis/ADR-001-primary-implementation-stack.mmd)

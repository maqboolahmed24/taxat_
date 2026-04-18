# ADR-001 Comparison Notes

This comparison expands the weighted scorecard that supports ADR-001.

## Ranking

| Rank | Alternative | Weighted Score | Leading Strengths |
| --- | --- | --- | --- |
| 1 | TypeScript/Node-centered product stack with Swift native and retained Python tooling | 89.7 | Best overall fit for the browser-first product surface and Playwright-first validation model.; Strongest shared-contract reuse story between browser UI, backend APIs, and automated tests. |
| 2 | Kotlin/JVM backend with TypeScript web and Swift native | 84.8 | Strongest backend-only story for exact-decimal rigor, concurrency, and raw performance headroom.; Very credible for long-lived service operability once fully adopted. |
| 3 | Python-centered backend with TypeScript web and Swift native | 82.35 | Strongest exact-decimal and validator continuity story with the current repo evidence.; Low conceptual drift between offline analysis tooling and backend implementation. |

## Criteria and Weights

| Criterion | Priority | Weight | Source Grounding |
| --- | --- | --- | --- |
| Deterministic serialization and hashing | HARD_REQUIREMENT | 12 | Algorithm/implementation_conventions.md::L26[3._Deterministic_serialization_and_hashing_conventions], Algorithm/manifest_and_config_freeze_contract.md::L744[5.9_Hash_contract], Algorithm/replay_and_reproducibility_contract.md::L341[Deterministic_outcome_contract] |
| Exact-decimal and money-safe computation support | HARD_REQUIREMENT | 10 | Algorithm/compute_parity_and_trust_formulas.md::L73[8.2_Standard_normalization_rules], Algorithm/compute_parity_and_trust_formulas.md::L78[binary_floating_forbidden], Algorithm/compute_parity_and_trust_formulas.md::L106[canonical_decimal_string] |
| Contract and schema ergonomics | HARD_REQUIREMENT | 8 | Algorithm/implementation_conventions.md::L19[2._Schema_conventions], Algorithm/README.md::L90[readme_schema_inventory], Algorithm/customer_client_portal_experience_contract.md::L488[portal_schema_requirements], Algorithm/admin_governance_console_architecture.md::L725[governance_read_models] |
| Browser product and design-system productivity | HARD_REQUIREMENT | 12 | Algorithm/frontend_shell_and_interaction_law.md::L190[3._Layout_topology_and_support-region_promotion], Algorithm/customer_client_portal_experience_contract.md::L104[Route_architecture], Algorithm/admin_governance_console_architecture.md::L661[7._Frontend_systems_architecture], Algorithm/cross_shell_design_token_and_interaction_layer_foundation_contract.md::L24[Governing_model], Algorithm/UIUX_DESIGN_SKILL.md::L195[Core_design_language] |
| Playwright and frontend automation ergonomics | HARD_REQUIREMENT | 7 | Algorithm/frontend_shell_and_interaction_law.md::L644[10._Automation_anchors_and_UI_observability_fencing], Algorithm/customer_client_portal_experience_contract.md::L701[Playwright_validation_minimum], Algorithm/collaboration_workspace_contract.md::L1953[12._Playwright_scenarios], Algorithm/UIUX_DESIGN_SKILL.md::L716[Playwright-first_XCUITest-first_design_expectation], package.json::L9[playwright_dependency] |
| Backend API, streaming, and concurrency fit | HARD_REQUIREMENT | 10 | Algorithm/northbound_api_and_session_contract.md::L295[3._Command_envelope], Algorithm/northbound_api_and_session_contract.md::L646[7._Stream_and_reconnect_rules], Algorithm/authority_interaction_protocol.md::L792[9.9A_Inbound_authority_ingress_protocol], Algorithm/authority_interaction_protocol.md::L621[9.8_Request_hashing_and_idempotency] |
| Security ecosystem maturity | HARD_REQUIREMENT | 8 | Algorithm/security_and_runtime_hardening_contract.md::L30[2._Identity_session_and_command_trust], Algorithm/security_and_runtime_hardening_contract.md::L50[3._Secret_key_and_token_handling], Algorithm/security_and_runtime_hardening_contract.md::L143[7._Supply-chain_and_build_integrity], Algorithm/security_and_runtime_hardening_contract.md::L161[8._Operational_security_release_gates] |
| Observability ecosystem fit | STRONG_PREFERENCE | 6 | Algorithm/observability_and_audit_contract.md::L24[14.2_Separation_of_concerns], Algorithm/observability_and_audit_contract.md::L386[14.7_Trace_contract], Algorithm/observability_and_audit_contract.md::L420[14.8_Metric_contract], Algorithm/observability_and_audit_contract.md::L556[14.11_Query_contracts] |
| macOS-native coexistence strategy | HARD_REQUIREMENT | 7 | Algorithm/macos_native_operator_workspace_blueprint.md::L46[3._Recommended_Xcode_workspace_topology], Algorithm/macos_native_operator_workspace_blueprint.md::L372[7._Authentication_and_session_strategy], Algorithm/macos_native_operator_workspace_blueprint.md::L428[9._SwiftUI_versus_AppKit_decision_matrix], Algorithm/macos_native_operator_workspace_blueprint.md::L473[11._Security_and_runtime_posture_for_the_desktop_client] |
| Shared type and contract reuse across surfaces | HARD_REQUIREMENT | 8 | Algorithm/implementation_conventions.md::L19[2._Schema_conventions], Algorithm/customer_client_portal_experience_contract.md::L479[Read-model_and_API_translation_requirements], Algorithm/README.md::L141[validator_entrypoint], Algorithm/README.md::L157[authoritative_python_entrypoints] |
| Hiring, maintainability, and long-term operability | STRONG_PREFERENCE | 5 | Algorithm/README.md::L157[python_toolchain_evidence], package.json::L4[node_module_repo_evidence] |
| Migration complexity from current repo evidence | STRONG_PREFERENCE | 4 | package.json::L9[existing_playwright_footprint], Algorithm/README.md::L158[existing_python_validation_footprint] |
| Performance profile under expected workloads | DEFERRED_CONCERN | 3 | Algorithm/macos_native_operator_workspace_blueprint.md::L502[12._Performance_strategy], Algorithm/replay_and_reproducibility_contract.md::L738[Implementation_shape], Algorithm/northbound_api_and_session_contract.md::L646[7._Stream_and_reconnect_rules] |

## Criterion-By-Criterion Scoring

### Browser product and design-system productivity

- Priority: `HARD_REQUIREMENT`
- Weight: `12`
- Rationale: The product surface is route-heavy, design-token-rich, and selector-governed across portal, collaboration, and governance shells.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| TypeScript/Node-centered product stack with Swift native and retained Python tooling | 5.0 | 12.0 | Best fit for the route-heavy browser product, semantic selector model, and design-system iteration loop. |
| Kotlin/JVM backend with TypeScript web and Swift native | 4.0 | 9.6 | The browser remains TypeScript, but the primary stack still spans two product runtimes instead of one. |
| Python-centered backend with TypeScript web and Swift native | 3.5 | 8.4 | Browser productivity remains strong on the frontend, but the primary product stack still splits between frontend and backend concerns. |

### Deterministic serialization and hashing

- Priority: `HARD_REQUIREMENT`
- Weight: `12`
- Rationale: Replay, manifest sealing, and attestation depend on byte-stable serialization and hash equality across runtime boundaries.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| TypeScript/Node-centered product stack with Swift native and retained Python tooling | 4.0 | 9.6 | Needs a deliberately centralized canonical serialization and hash library, but can share the same rules across browser, backend, and Playwright fixtures. |
| Kotlin/JVM backend with TypeScript web and Swift native | 4.5 | 10.8 | The JVM offers a very strong deterministic and schema-disciplined backend foundation when canonical serialization is centralized. |
| Python-centered backend with TypeScript web and Swift native | 4.5 | 10.8 | Python can express deterministic serialization and replay loaders clearly, especially alongside the existing validator estate. |

### Backend API, streaming, and concurrency fit

- Priority: `HARD_REQUIREMENT`
- Weight: `10`
- Rationale: The backend must support typed command receipts, reconnect-safe streams, idempotent retries, and authority callbacks without compromising deterministic semantics.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| TypeScript/Node-centered product stack with Swift native and retained Python tooling | 4.25 | 8.5 | A strong fit for northbound HTTP APIs, SSE-style streams, and I/O-bound authority integration, provided CPU-heavy deterministic math stays disciplined. |
| Kotlin/JVM backend with TypeScript web and Swift native | 4.75 | 9.5 | Excellent fit for high-concurrency APIs, typed streaming, and exact backend domain models. |
| Python-centered backend with TypeScript web and Swift native | 4.25 | 8.5 | Works well for typed APIs and orchestration, though stream fan-out and high-concurrency event handling often need more deliberate engineering choices. |

### Exact-decimal and money-safe computation support

- Priority: `HARD_REQUIREMENT`
- Weight: `10`
- Rationale: The compute and parity contracts explicitly forbid binary floating-point for money-bearing values and require canonical decimal-string persistence.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| TypeScript/Node-centered product stack with Swift native and retained Python tooling | 4.0 | 8.0 | Requires strict domain-level decimal abstractions and explicit prohibition of JS `number` for money-bearing paths, but remains workable through canonical decimal strings and fixed-scale libraries. |
| Kotlin/JVM backend with TypeScript web and Swift native | 4.75 | 9.5 | BigDecimal-backed exact-decimal handling is strong and credible for money-safe logic. |
| Python-centered backend with TypeScript web and Swift native | 5.0 | 10.0 | Python's decimal support is excellent for the exact-decimal contract. |

### Contract and schema ergonomics

- Priority: `HARD_REQUIREMENT`
- Weight: `8`
- Rationale: The corpus is schema-heavy, closed by default, and expects route-visible artifacts, stream payloads, and state objects to stay machine-checkable across services and clients.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| TypeScript/Node-centered product stack with Swift native and retained Python tooling | 4.5 | 7.2 | Strong JSON Schema tooling and shared type generation make the browser, backend, and tests align naturally. |
| Kotlin/JVM backend with TypeScript web and Swift native | 4.0 | 6.4 | Good schema ergonomics, but the browser/backend type seam still requires a stronger generation strategy than the TS-centered option. |
| Python-centered backend with TypeScript web and Swift native | 3.5 | 5.6 | Schema handling is solid, but the web/backend type boundary remains more fragmented than a TS-centered product core. |

### Security ecosystem maturity

- Priority: `HARD_REQUIREMENT`
- Weight: `8`
- Rationale: The runtime must credibly support short-lived sessions, secret isolation, supply-chain integrity, and fail-closed authority handling.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| TypeScript/Node-centered product stack with Swift native and retained Python tooling | 4.25 | 6.8 | Mature enough for OIDC, secret management, supply-chain controls, and OpenTelemetry instrumentation, though it depends on disciplined dependency and runtime governance. |
| Kotlin/JVM backend with TypeScript web and Swift native | 4.5 | 7.2 | Strong ecosystem for OIDC, supply-chain controls, and service hardening. |
| Python-centered backend with TypeScript web and Swift native | 4.25 | 6.8 | Security tooling is mature, especially around validators and data processing, but shared runtime parity with the browser layer is weaker. |

### Shared type and contract reuse across surfaces

- Priority: `HARD_REQUIREMENT`
- Weight: `8`
- Rationale: The same contract set must drive browser routes, backend envelopes, automation fixtures, Python validators, and Swift native models without semantic drift.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| TypeScript/Node-centered product stack with Swift native and retained Python tooling | 5.0 | 8.0 | Best cross-surface reuse story because browser, backend, and Playwright can consume one generated TypeScript model layer. |
| Kotlin/JVM backend with TypeScript web and Swift native | 3.5 | 5.6 | Better than Python for strongly typed backend models, but still weaker than TS end-to-end reuse for browser, backend, and tests. |
| Python-centered backend with TypeScript web and Swift native | 3.0 | 4.8 | The browser stack and backend stack stay separated by codegen and schema wrappers more often, increasing semantic-drift pressure. |

### macOS-native coexistence strategy

- Priority: `HARD_REQUIREMENT`
- Weight: `7`
- Rationale: The browser and backend runtime choice cannot erase the first-class Swift macOS client or force it into a browser wrapper posture.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| TypeScript/Node-centered product stack with Swift native and retained Python tooling | 4.5 | 6.3 | Pairs cleanly with a server-authoritative Swift client because TypeScript can own web/backend surfaces without trying to replace native UX. |
| Kotlin/JVM backend with TypeScript web and Swift native | 4.25 | 5.95 | Still compatible with a Swift native client because the native seam remains contract-based. |
| Python-centered backend with TypeScript web and Swift native | 4.25 | 5.95 | Still pairs fine with Swift because the native client is separate from backend language choice. |

### Playwright and frontend automation ergonomics

- Priority: `HARD_REQUIREMENT`
- Weight: `7`
- Rationale: Browser automation is a first-class delivery and validation requirement, not a testing afterthought.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| TypeScript/Node-centered product stack with Swift native and retained Python tooling | 5.0 | 7.0 | Matches the current Playwright footprint and keeps browser contracts, fixtures, and tests in one ecosystem. |
| Kotlin/JVM backend with TypeScript web and Swift native | 4.5 | 6.3 | Playwright remains strong on the frontend side, with the same caveat about cross-runtime contract drift. |
| Python-centered backend with TypeScript web and Swift native | 4.5 | 6.3 | Playwright remains strong because the web layer stays TypeScript, but contract drift risk across the backend seam increases. |

### Observability ecosystem fit

- Priority: `STRONG_PREFERENCE`
- Weight: `6`
- Rationale: The chosen runtime should work naturally with OpenTelemetry-style traces, metrics, logs, and correlation-aware audit overlays.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| TypeScript/Node-centered product stack with Swift native and retained Python tooling | 4.5 | 5.4 | Strong OpenTelemetry support and good compatibility with the current Node/Playwright observability layer. |
| Kotlin/JVM backend with TypeScript web and Swift native | 4.5 | 5.4 | Excellent OpenTelemetry and JVM observability support. |
| Python-centered backend with TypeScript web and Swift native | 4.25 | 5.1 | OpenTelemetry support is viable, though cross-language correlation and instrumentation discipline become more important. |

### Hiring, maintainability, and long-term operability

- Priority: `STRONG_PREFERENCE`
- Weight: `5`
- Rationale: The primary stack should minimize gratuitous language fragmentation while keeping the supporting Python and Swift estates credible and maintainable.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| TypeScript/Node-centered product stack with Swift native and retained Python tooling | 4.5 | 4.5 | Keeps the product core mostly in one runtime while still honoring the already-justified Python and Swift edges. |
| Kotlin/JVM backend with TypeScript web and Swift native | 3.5 | 3.5 | Operationally strong, but adds a new core runtime that the repo does not currently evidence. |
| Python-centered backend with TypeScript web and Swift native | 4.25 | 4.25 | Python is widely operable, but the product core becomes more polyglot sooner than necessary. |

### Migration complexity from current repo evidence

- Priority: `STRONG_PREFERENCE`
- Weight: `4`
- Rationale: Current repo evidence already shows Python analysis tooling and Node/Playwright browser automation, so the first product stack should preserve that leverage rather than restart from zero in every lane.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| TypeScript/Node-centered product stack with Swift native and retained Python tooling | 5.0 | 4.0 | Aligns directly with the current Node/Playwright footprint and preserves the Python tooling estate instead of displacing it. |
| Kotlin/JVM backend with TypeScript web and Swift native | 2.75 | 2.2 | Requires introducing a completely new backend runtime while still retaining both TypeScript and Swift, increasing initial setup cost substantially. |
| Python-centered backend with TypeScript web and Swift native | 4.5 | 3.6 | Preserves the current Python estate well, but does not capitalize as directly on the existing Node/Playwright browser and prototype footprint. |

### Performance profile under expected workloads

- Priority: `DEFERRED_CONCERN`
- Weight: `3`
- Rationale: The product needs credible streaming, validation, and compute throughput, but there is not yet enough live workload evidence to let raw throughput dominate the phase-00 stack choice.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| TypeScript/Node-centered product stack with Swift native and retained Python tooling | 4.0 | 2.4 | Good enough for the expected I/O-heavy product surface, with room to isolate hot compute or stream fan-out paths later if profiling demands it. |
| Kotlin/JVM backend with TypeScript web and Swift native | 4.75 | 2.85 | Best raw backend headroom of the three alternatives, though that advantage is not yet the dominant phase-00 concern. |
| Python-centered backend with TypeScript web and Swift native | 3.75 | 2.25 | Adequate for expected workloads, but lower raw concurrency headroom than a well-tuned Node or JVM option for event-heavy product APIs. |

## Why The Runner-Up Options Lost

- `Kotlin/JVM backend with TypeScript web and Swift native` is strongest on backend exact-decimal rigor and concurrency headroom, but it introduces a new core runtime and loses too much end-to-end contract reuse between browser UI, backend APIs, and Playwright fixtures.
- `Python-centered backend with TypeScript web and Swift native` is technically strong on backend rigor and throughput, but phase 00 would pay too much upfront in migration cost and runtime fragmentation for advantages that are not yet the dominant decision drivers.

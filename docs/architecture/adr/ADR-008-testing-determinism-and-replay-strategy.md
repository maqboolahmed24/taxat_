# ADR-008: Testing Determinism and Replay Strategy

- Status: Accepted
- Date: 2026-04-18
- Decision: Layered, contract-first, candidate-bound portfolio
- Score: 92.25

## Context

Taxat already specifies rich verification law, but the obligations were scattered across replay, release, surface, authority, and resilience contracts. The existing analysis packs already normalized `3` replay classes, `11` replay preconditions, `13` release-candidate identity fields, `10` authority operation families, and `8` native scene scenarios; ADR-008 turns those fragments into one test doctrine that later QA, release, and platform work can extend.

The governing constraint is that promotion evidence must stay candidate-bound, replay-safe, and admissible. The corpus explicitly requires a first-class `DeterministicGoldenPack`, exact replay with byte-identical basis hashes, explicit authority sandbox breadth evidence, Playwright for shipped web surfaces, XCUITest for native macOS scenes, restore drills for relevant releases, and blocking green posture that is neither quarantined nor manually waived.

## Decision

Adopt a layered, contract-first, candidate-bound testing portfolio:

1. Run schema and contract validation first.
2. Run deterministic module, formula, and model-based suites next, freezing one reviewed `DeterministicGoldenPack`.
3. Run northbound API and client-compatibility suites against the same candidate and reader-window boundary.
4. Run browser Playwright suites for semantic, continuity, focus-return, and upload-recovery obligations.
5. Run native automation and persistence-fixture suites for FE-75 hydration, restoration, and browser-handoff return.
6. Run authority sandbox and controlled-edge suites separately from UI suites, with one candidate-bound `authority_sandbox_coverage_contract`.
7. Run replay, restore, migration, security, performance, and canary suites as release-facing resilience families rather than optional postscript checks.
8. Assemble `ReleaseVerificationManifest` only from first-class suite artifacts and companion admissibility records.

This doctrine is intentionally layered rather than end-to-end-heavy. Deterministic suites answer the fastest and most replayable questions; browser, native, authority, and restore suites answer integration questions the core packs cannot prove. Each family keeps its own evidence boundary so later release tasks can bind green posture to machine-checkable artifacts instead of narratives.

## Family Portfolio

| Family | Release Gates | Primary Tooling | Primary Evidence |
| --- | --- | --- | --- |
| Schema and contract validation | SCHEMA_COMPATIBILITY, MIGRATION_VERIFICATION, SUITE_ADMISSIBILITY | schema validators, positive and negative fixture packs, contract self-tests | VerificationSuiteResult for suite_family = SCHEMA_CONTRACT_VALIDATION, negative-fixture failure ledger |
| Deterministic module and formula packs | DETERMINISTIC_AND_STATE_MACHINE, SUITE_ADMISSIBILITY | unit suites, formula vector suites, golden pack fixture review | VerificationSuiteResult for suite_family = DETERMINISTIC_AND_STATE_MACHINE, DeterministicGoldenPack ref and hash |
| State-machine and model-based suites | DETERMINISTIC_AND_STATE_MACHINE, SUITE_ADMISSIBILITY | model-based generators, explicit transition regression suites, property-based transition exploration | VerificationSuiteResult for suite_family = DETERMINISTIC_AND_STATE_MACHINE, transition coverage ledger |
| Northbound API and operator contract suites | NORTHBOUND_API, OPERATOR_CLIENT, SUITE_ADMISSIBILITY | API contract suites, receipt replay tests, supported-client compatibility matrix tests | VerificationSuiteResult for suite_family = NORTHBOUND_API, ClientCompatibilityMatrix where compatibility is judged |
| Browser Playwright acceptance and accessibility packs | OPERATOR_CLIENT, SUITE_ADMISSIBILITY | Playwright, semantic or role-based locators, browser continuity and focus harnesses | Playwright traces and screenshots, semantic_accessibility_regression_pack |
| Native automation, restoration, and persistence-fixture packs | OPERATOR_CLIENT, SUITE_ADMISSIBILITY | XCUITest, native preview or snapshot checks, persistence-fixture suites | XCUITest results, native preview or snapshot pack |
| Authority sandbox and controlled-edge suites | AUTHORITY_SANDBOX, SUITE_ADMISSIBILITY | provider sandbox integration suites, controlled-edge simulation fixtures, request-identity and ingress proof checks | VerificationSuiteResult for suite_family = AUTHORITY_SANDBOX, authority_sandbox_coverage_contract |
| Replay, recovery, restore, and migration-resilience suites | RESTORE_DRILL, MIGRATION_VERIFICATION, SUITE_ADMISSIBILITY | replay harnesses, restore drill environments, queue or broker loss fault injection | ReplayAttestation, RestoreDrillResult |
| Security and release-integrity suites | SECURITY, ARTIFACT_INTEGRITY_AND_NOTARIZATION, SUITE_ADMISSIBILITY | security regression suites, artifact provenance verification, cache isolation and redaction harnesses | security suite VerificationSuiteResult, artifact integrity and provenance refs |
| Performance, canary, and failure-mode suites | PERFORMANCE_CANARY, SUITE_ADMISSIBILITY | load or soak harnesses, fault injection, canary analysis and SLO checks | CanaryHealthSummary, performance suite VerificationSuiteResult |

## Deterministic Fixture and Replay Basis

Exact replay and exact recovery depend on one frozen basis model rather than an ambient runtime:

- Frozen basis dimensions: `6`
- Replay classes: `3`
- Exact replay preconditions: `11`
- Fixture artifacts in the doctrine: `8`

The durable fixture boundary is `DeterministicGoldenPack`. Green deterministic gates must retain that ref, together with candidate identity and deterministic hash lineage, so promotion and later refactors stay tied to one reviewed fixture pack instead of a generic test pass summary.

## Browser, Native, and Authority Edge Coverage

The doctrine keeps browser, native, and authority edges distinct on purpose:

- Browser rows: `3`
- Native rows: `3`
- Authority rows: `4`
- Authority operation families carried forward: `10`

Playwright is mandatory for browser acceptance and browser-owned handoffs. XCUITest plus persistence-fixture packs are mandatory for native scenes. Sandbox and controlled-edge suites are mandatory for authority breadth and ingress ambiguity because UI journeys cannot prove namespace isolation or no-blind-resend posture reliably.

## Flake and Quarantine Policy

| Family | Retry Policy | Quarantine Green? | Waiver Green? |
| --- | --- | --- | --- |
| schema_contract_validation | no_retry_for_product_failures; one infrastructure rerun only if the original suite never reached test execution | no | no |
| deterministic_formula_and_module | no_retry unless the runner crashed before fixture execution began | no | no |
| state_machine_and_model_based | seed-preserving rerun only when infrastructure noise interrupted execution | no | no |
| northbound_api_and_operator_contracts | same-candidate same-scope rerun permitted for confirmed environment noise | no | no |
| browser_surface_acceptance | same-candidate same-route-profile rerun allowed for actionability-safe infra noise only; preserve failing traces and screenshots | no | no |
| native_surface_automation | same-candidate same-scene rerun allowed only when device or simulator instability is isolated | no | no |
| authority_sandbox_and_controlled_edge | rerun only with the identical enabled provider-profile set, identical namespace scope, and explicit preservation of exercised operation families | no | no |
| replay_recovery_and_restore | same-candidate same-checkpoint rerun only when the drill environment failed before evidence completion; replay cases otherwise stay single-shot and deterministic | no | no |
| security_verification | same-candidate rerun allowed only for infrastructure failures in the harness; security findings themselves are never retried to green | no | no |
| performance_canary_and_failure_mode | bounded same-candidate rerun allowed for environment noise, but SLO or error-budget failures remain product-significant until disproven with equivalent scope | no | no |

Blocking green posture is valid only when the result is candidate-bound, same-scope, current, unquarantined, and unwaived. Reruns exist only to recover from verified environment noise and must preserve the same candidate tuple plus any compatibility or sandbox breadth boundary that the family depends on.

## Release Evidence Binding

| Gate | Expected Families | Required Evidence | Required Hash Echoes |
| --- | --- | --- | --- |
| SCHEMA_COMPATIBILITY | schema_contract_validation | VerificationSuiteResult, GateAdmissibilityRecord, schema_bundle_compatibility_gate_contract | candidate_identity_hash, compatibility_gate_hash |
| DETERMINISTIC_AND_STATE_MACHINE | deterministic_formula_and_module, state_machine_and_model_based | VerificationSuiteResult, GateAdmissibilityRecord, DeterministicGoldenPack | candidate_identity_hash |
| NORTHBOUND_API | northbound_api_and_operator_contracts | VerificationSuiteResult, GateAdmissibilityRecord | candidate_identity_hash |
| AUTHORITY_SANDBOX | authority_sandbox_and_controlled_edge | VerificationSuiteResult, GateAdmissibilityRecord, authority_sandbox_coverage_contract | candidate_identity_hash, authority_sandbox_coverage_hash_or_null |
| OPERATOR_CLIENT | northbound_api_and_operator_contracts, browser_surface_acceptance, native_surface_automation | VerificationSuiteResult, GateAdmissibilityRecord, ClientCompatibilityMatrix | candidate_identity_hash, compatibility_gate_hash |
| SECURITY | security_verification | VerificationSuiteResult, GateAdmissibilityRecord | candidate_identity_hash |
| PERFORMANCE_CANARY | performance_canary_and_failure_mode | VerificationSuiteResult, GateAdmissibilityRecord, CanaryHealthSummary | candidate_identity_hash |
| RESTORE_DRILL | replay_recovery_and_restore | VerificationSuiteResult, GateAdmissibilityRecord, RestoreDrillResult | candidate_identity_hash, compatibility_gate_hash |
| MIGRATION_VERIFICATION | schema_contract_validation, replay_recovery_and_restore | VerificationSuiteResult, GateAdmissibilityRecord, migration ledger outcome | candidate_identity_hash, compatibility_gate_hash |
| ARTIFACT_INTEGRITY_AND_NOTARIZATION | security_verification | BuildArtifact digest, SBOM, provenance attestation | candidate_identity_hash |
| SUITE_ADMISSIBILITY | schema_contract_validation, deterministic_formula_and_module, state_machine_and_model_based | GateAdmissibilityRecord | candidate_identity_hash, compatibility_gate_hash_or_null |

Promotion evidence therefore binds:

- one shared candidate tuple and canonical `candidate_identity_hash`
- one shared compatibility boundary and `compatibility_gate_hash` whenever schema or client-window safety is judged
- one `DeterministicGoldenPack` ref for green deterministic gates
- one `authority_sandbox_coverage_contract` hash for the authority sandbox gate
- explicit `RestoreDrillResult`, `RecoveryCheckpoint`, `CanaryHealthSummary`, and `ClientCompatibilityMatrix` refs where those gates apply

## Consequences

- Positive: later release, QA, native, browser, and platform tasks get a stable suite taxonomy and evidence model.
- Positive: replay, restore, authority, and client-compatibility safety become promotion-time questions, not after-the-fact investigations.
- Negative: the portfolio is broader and requires disciplined fixture maintenance, especially for golden packs, replay packs, and sandbox breadth evidence.
- Negative: more first-class artifacts must be produced and stored, which raises implementation cost but improves auditability.

## Rejected Alternatives

- End-to-end-heavy browser or system-level testing scored lower because it is the noisiest, weakest fit for admissible candidate-bound evidence, and would create pressure to quarantine blocking suites.
- Narrow unit-heavy or property-heavy testing scored lower because it cannot prove browser, native, authority, restore, and supported-client obligations to the standard the corpus requires.

## Rollback Posture

Rollback of the strategy means reducing the portfolio to a narrower test subset, which would immediately weaken release admissibility, replay evidence quality, and edge coverage. That is only acceptable if the release policy itself changes in a reviewed contract update. Operational tuning, such as splitting suites across pipelines or changing runners, is allowed as long as the family boundaries, evidence artifacts, and admissibility rules do not change.

## Deferred Decisions and Typed Gaps

- `defer_ci_vendor_selection` (DEFERRED_DECISION): The strategy fixes suite families, evidence shape, and admissibility rules but intentionally does not pick a CI vendor or hosted device farm yet.
- `shared_operating_contract_0022_0029_missing` (SOURCE_GAP): The referenced shared operating contract for cards 0022 through 0029 is absent, so ADR-008 is grounded directly in named algorithm contracts and prior analysis outputs.
- `fixture_materialization_tooling_deferred` (DEFERRED_DECISION): The strategy fixes what must be frozen and proven, but later implementation tasks may still choose the exact golden-pack materialization scripts or storage layout.
- `device_farm_vendor_deferred` (DEFERRED_DECISION): The doctrine requires Playwright and XCUITest, but does not yet choose a hosted browser or native device execution vendor.
- `non_blocking_quarantine_reclassification_process_deferred` (DEFERRED_DECISION): The governance process for reclassifying a family from blocking to non-blocking belongs to later platform or release operations work; ADR-008 only fixes the release-time constraint that the change cannot happen ad hoc during the judged release.
- `release_dashboard_visualization_deferred` (DEFERRED_DECISION): ADR-008 fixes evidence structure and gate bindings, but not the final UI shape of release dashboards or evidence viewers.

## Generated Artifacts

- `data/analysis/test_family_to_constraint_matrix.json`
- `data/analysis/deterministic_fixture_and_replay_basis_strategy.json`
- `data/analysis/browser_native_authority_test_matrix.json`
- `data/analysis/flakiness_budget_and_quarantine_rules.json`
- `data/analysis/release_candidate_test_evidence_binding.json`
- `data/analysis/test_suite_to_task_track_map.json`
- `diagrams/analysis/ADR-008-testing-determinism-replay-strategy.mmd`

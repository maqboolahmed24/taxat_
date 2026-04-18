# ADR-009: Release Evidence and Migration Strategy

- Status: Accepted
- Date: 2026-04-18
- Decision: Manifest-centered, candidate-bound release doctrine
- Score: 93.8

## Context

Taxat already had the raw law for safe promotion, but it was split across candidate identity, verification gates, migration chronology, restore governance, native delivery, and security hardening. Prior phase-00 outputs normalized `13` candidate-identity fields, `25` compatibility-gate fields, `11` blocking gate bindings, `7` checkpoint gates, and `9` security release gates. ADR-009 turns those fragments into one release doctrine.

The deciding constraint is not deployment fashion. Taxat needs one operational truth for how a candidate is identified, how migrations stay readable for in-flight and historical manifests, when rollback remains lawful, when fail-forward becomes mandatory, how restore drills count as release evidence, and how browser/native client compatibility blocks promotion instead of merely warning.

## Decision

Adopt a **manifest-centered, candidate-bound promotion strategy**:

1. Freeze one release candidate identity and canonical `candidate_identity_hash`.
2. Freeze one shared schema compatibility boundary and `compatibility_gate_hash`.
3. Run blocking suites, restore drills, client-window validation, and canary against that same candidate and compatibility posture.
4. Persist one first-class `ReleaseVerificationManifest` as the promotion-evidence root rather than reconstructing release truth from CI or deploy dashboards.
5. Execute schema change as `expand -> migrate/backfill -> verify -> contract`, carrying the same reader-window posture through migration ledgers, manifests, restore drills, and deployment records.
6. Allow rollback only while the compatibility window remains open and the shared gate still certifies safety.
7. Force explicit fail-forward once destructive change begins, the compatibility window closes, or rollback safety breaks.
8. Block promotion when supported browser/native client window evidence is missing or red, and when shipped macOS posture lacks signing, notarization, or hardened-runtime evidence.

This decision intentionally makes release evidence heavier than a generic dashboard workflow. That is the point: the corpus requires durable proof that the judged release, the migration posture, the restore posture, and the client window all refer to the same release basis.

## Decision Drivers

| Driver | Priority | Weight | Why It Matters |
| --- | --- | --- | --- |
| Candidate identity integrity | HARD_REQUIREMENT | 14 | Promotion evidence must describe one exact candidate tuple so release truth cannot silently mix builds, schema bundles, migration plans, provider profiles, or client windows. |
| Migration safety for in-flight and historical manifests | HARD_REQUIREMENT | 13 | Schema changes must preserve sealed, in-flight, replayed, and recovered manifests under frozen bundle and config refs, even while live defaults advance. |
| Rollback versus fail-forward safety | HARD_REQUIREMENT | 12 | Rollback is only lawful while compatibility guarantees still hold; after reader-window closure or destructive change, the system needs a typed fail-forward doctrine instead of operator judgment calls under pressure. |
| Replay and restore readability | HARD_REQUIREMENT | 10 | Release evidence, migration ledgers, and restore drills must preserve enough basis and reader-window detail to prove historical readability, replay admissibility, and recoverability later. |
| Web and native client compatibility governance | HARD_REQUIREMENT | 10 | Promotion must block when the supported client window or shipped native desktop posture is incompatible; compatibility cannot be treated as an advisory note after deploy. |
| Operator burden and operational clarity | STRONG_PREFERENCE | 9 | The strategy should be explainable in one promotion runbook so release operators know which artifact answers which question instead of triangulating CI pages, deploy logs, and oral history. |
| Auditability and mixed-evidence prevention | HARD_REQUIREMENT | 11 | The winning strategy must make mixed candidate, mixed compatibility-window, and mixed canary versus full-release evidence mechanically impossible or visibly inadmissible. |
| Restore-drill realism | HARD_REQUIREMENT | 8 | Restore drills must rehearse actual control, audit, object, queue, authority, and privacy posture so promotion evidence does not overclaim recoverability. |
| Security gate compatibility | HARD_REQUIREMENT | 7 | Release evidence needs to compose with signed-build, provenance, session-hardening, cache-isolation, and desktop notarization gates rather than bypassing them as a separate track. |
| Release speed versus correctness | TRADEOFF | 6 | The strategy should keep promotion reasonably fast, but must reject any shortcut that trades replay safety, migration clarity, or recoverability for nominal delivery speed. |

## Promotion Evidence Spine

| Artifact | Stage | Primary Gates | Candidate Binding |
| --- | --- | --- | --- |
| BuildArtifact | BUILD_AND_ATTEST | ARTIFACT_INTEGRITY_AND_NOTARIZATION, SECURITY | build_artifact_ref, artifact_digest, candidate_identity_hash |
| SchemaBundleCompatibilityGateContract | SCHEMA_COMPATIBILITY | SCHEMA_COMPATIBILITY, MIGRATION_VERIFICATION ... | candidate_identity_hash, schema_bundle_hash, migration_plan_ref_or_null |
| SchemaMigrationLedger | MIGRATION_VERIFICATION | MIGRATION_VERIFICATION | schema_bundle_hash, migration_plan_ref_or_null, candidate_identity_hash |
| VerificationSuiteResult | BLOCKING_SUITE_EXECUTION | SCHEMA_COMPATIBILITY, DETERMINISTIC_AND_STATE_MACHINE ... | candidate_identity_hash, build_artifact_ref, schema_bundle_hash |
| GateAdmissibilityRecord | SUITE_ADMISSIBILITY | SUITE_ADMISSIBILITY | candidate_identity_hash, build_artifact_ref, supported_client_window_ref_or_null |
| DeterministicGoldenPack | DETERMINISTIC_AND_STATE_MACHINE | DETERMINISTIC_AND_STATE_MACHINE | candidate_identity_hash, artifact_digest |
| AuthoritySandboxCoverageContract | AUTHORITY_SANDBOX | AUTHORITY_SANDBOX | candidate_identity_hash, enabled_provider_profile_refs[] |
| ClientCompatibilityMatrix | OPERATOR_CLIENT | OPERATOR_CLIENT | candidate_identity_hash, supported_client_window_ref_or_null, build_artifact_ref |

Every blocking release artifact appears in the generated evidence matrix, and every artifact that judges schema, restore, or client-window safety also carries the shared compatibility boundary rather than only a writer bundle hash.

## Migration Chronology and Reader Window

| Phase | Goal | Reader Window Expectation | Rollback Posture |
| --- | --- | --- | --- |
| EXPAND | Introduce new writer and reader shape without breaking the prior reader window. | reader window remains open to the prior protected bundle set | ROLLBACK_ALLOWED while the prior reader window still validates |
| MIGRATE_BACKFILL | Backfill or transform durable truth idempotently while preserving frozen historical references. | in-flight and sealed manifests continue on their frozen basis | ROLLBACK_ALLOWED only if backfill remains reversible or compatibility-preserving |
| VERIFY | Prove reader-window, replay, restore, migration, and client-window safety under the shared compatibility gate. | historical-manifest and replay or restore readability remain explicitly green | ROLLBACK_ALLOWED only if the compatibility gate says the rollback window is still open |
| CONTRACT | Remove legacy shape only after no protected in-flight, replay, restore, or client window depends on it. | compatibility window closes only after protected historical and operational readers are safe | FAIL_FORWARD_ONLY once the compatibility window closes or destructive change begins |
| FAIL_FORWARD_OR_SETTLE | If rollback safety ended, prove the compensating release plan and preserve prior truth instead of rewriting history. | closed windows stay closed; historical reads rely on preserved frozen basis | FAILED_FORWARD or FAIL_FORWARD_ONLY with explicit owner and runbook lineage |

This closes the prior gap where reader-window chronology was distributed across multiple contracts. The chosen strategy now centralizes `5` chronology steps, `6` historical-manifest guards, and `4` continuation or reclaim rules into one machine-readable pack.

## Rollback and Fail-Forward Governance

| Scenario | Decision | Reader Window | Native Window |
| --- | --- | --- | --- |
| canary_failure_before_contract_phase | ROLLBACK_ALLOWED | OPEN_AND_BACKWARD_COMPATIBLE | VERIFIED_COMPATIBLE |
| code_regression_with_open_reader_window | ROLLBACK_ALLOWED | OPEN_AND_BACKWARD_COMPATIBLE | VERIFIED_COMPATIBLE |
| native_supported_window_blocked | PROMOTION_BLOCKED | WINDOW_MAY_BE_OPEN | BLOCKED |
| destructive_contract_started_or_window_closed | FAIL_FORWARD_ONLY | CONTRACT_ELIGIBLE_WINDOW_CLOSED | VERIFIED_COMPATIBLE_OR_NOT_APPLICABLE |
| inflight_manifest_depends_on_old_shape | FAIL_FORWARD_ONLY | OPEN_FOR_PROTECTED_INFLIGHT_OR_HISTORICAL_MANIFESTS | VERIFIED_COMPATIBLE |

The critical rule is simple: rollback is a compatibility-bound permission, not a deployment operator preference. Once the shared compatibility gate or migration chronology says rollback is no longer safe, the system moves to explicit fail-forward with named ownership and compensating-release lineage.

## Client Compatibility Governance

| Platform | Scenario | Must Bind | Block If Red? |
| --- | --- | --- | --- |
| BROWSER | browser_oldest_supported_against_current_server | supported_client_window_ref, candidate_identity_hash, compatibility_gate_hash | yes |
| BROWSER | browser_current_against_rollback_safe_server | supported_client_window_ref, candidate_identity_hash, compatibility_gate_hash | yes |
| MACOS_NATIVE | macos_oldest_supported_against_current_server | supported_client_window_ref, candidate_identity_hash, compatibility_gate_hash, desktop_notarization_ref | yes |
| MACOS_NATIVE | macos_current_against_rollback_safe_server | supported_client_window_ref, candidate_identity_hash, compatibility_gate_hash, desktop_notarization_ref | yes |

Browser and native compatibility are judged together under the supported client window, but macOS adds one extra constraint: when the native desktop target ships, signature, notarization, hardened runtime, and entitlement posture become blocking release evidence rather than best-effort hygiene.

## Restore-Drill Promotion Binding

- Recovery tiers carried forward: `3`
- Checkpoint verification gates carried forward: `7`
- Privacy reconciliation states carried forward: `8`
- Ready-for-reopen states: `RECONCILED_NO_COMPENSATION_REQUIRED, RECONCILED_WITH_COMPENSATING_RE_ERASURE`

Restore drills therefore remain real promotion evidence only when they are candidate-bound, compatibility-bound, checkpoint-bound, and privacy-reconciled. A green restore run without those bindings is not admissible release proof.

## Alternatives Considered

| Rank | Alternative | Weighted Score |
| --- | --- | --- |
| 1 | Manifest-centered, candidate-bound release doctrine | 93.8 |
| 2 | Deployment-strategy-first promotion without a manifest-root evidence object | 56.94 |
| 3 | CI dashboard and checklist-driven release posture | 49.32 |

The winning option is **Manifest-centered, candidate-bound release doctrine** with a weighted score of `93.8`.

## Why This Option Wins

- It is the only alternative that directly matches the corpus's first-class evidence objects: candidate identity, compatibility gate, manifest assembly, restore drill, client compatibility, and deployment release.
- It centralizes migration chronology and rollback legality instead of leaving them spread across source documents or operator memory.
- It blocks the exact edge cases the task called out: mixed evidence, destructive migrations that strand historical manifests, blocked native windows, swapped restore lineage, and silent canary/full-release drift.
- It composes cleanly with security release gates instead of treating security as a separate approval stream.

## Consequences

Positive consequences:

- release, migration, and platform teams get one stable vocabulary for candidate identity, compatibility windows, restore proof, and rollback legality
- later implementation tasks can consume machine-readable matrices instead of re-deriving the doctrine from prose
- audit and incident review become easier because promotion truth lives in durable artifacts, not reconstructed dashboards

Negative consequences and tradeoffs:

- more first-class artifacts must be produced and stored before promotion
- release tooling must understand manifest assembly and compatibility boundaries explicitly
- rollout speed is intentionally subordinated to correctness whenever the two conflict

## Rollback Posture

Operational rollback remains allowed only while the chosen strategy's own compatibility gate says it is allowed. Rolling back the strategy itself would mean returning to weaker dashboard or deploy-log truth, which would reopen the mixed-evidence and migration-clarity gaps this ADR closes. That should only happen through an explicit contract revision.

## Deferred Decisions and Typed Gaps

- `deployment_vendor_and_rollout_percentage_deferred` (DEFERRED_DECISION): ADR-009 fixes required evidence and decision posture, but not the final deployment vendor or rollout percentage policy.
- `migration_executor_product_deferred` (DEFERRED_DECISION): ADR-009 fixes migration chronology and evidence boundaries, but not the final migration-runner product or orchestration engine.
- `traffic_split_mechanics_deferred` (DEFERRED_DECISION): ADR-009 chooses release truth and rollback legality, but not the exact traffic-splitting mechanics used during canary or global rollout.
- `exact_version_floor_policy_deferred` (DEFERRED_DECISION): ADR-009 fixes the supported-window governance model but not the exact client version floor or release-channel policy used to populate that window.
- `restore_environment_vendor_deferred` (DEFERRED_DECISION): ADR-009 fixes what a valid restore drill must prove, but not the exact infra product used to stand up restore rehearsal environments.
- `shared_operating_contract_0022_0029_missing` (SOURCE_GAP): The referenced shared operating contract for cards 0022 through 0029 is absent, so ADR-009 is grounded directly in named algorithm contracts and prior analysis outputs.

## Generated Artifacts

- `data/analysis/release_evidence_artifact_matrix.json`
- `data/analysis/schema_migration_and_reader_window_strategy.json`
- `data/analysis/rollback_fail_forward_decision_matrix.json`
- `data/analysis/client_compatibility_and_supported_window_strategy.json`
- `data/analysis/restore_drill_and_promotion_binding_rules.json`
- `data/analysis/candidate_identity_and_gate_binding_map.json`
- `diagrams/analysis/ADR-009-release-evidence-migration-strategy.mmd`

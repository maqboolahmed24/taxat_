# Acceptance Evidence Assembly Guide

Use this guide when an agent needs to decide what "done" means for a task without rereading the entire corpus.

## Procedure

1. Open `data/analysis/task_definition_of_done_matrix.json` and locate the `task_id`.
2. Confirm `roadmap_task_completion` by checking the checklist state, the card evidence, and the declared outputs.
3. Confirm `blueprint_coverage_closure` by reading the task's `blueprint_family_refs`, `test_vector_refs`, and `constraint_refs`.
4. Confirm `release_admissibility` only when the task has non-empty `release_gate_refs`. Use the bound suite families, exact validator commands, and evidence artifact refs instead of assuming that local completion equals release readiness.
5. If `blocking_gap_refs` is non-empty, treat the task as locally complete at most; never infer missing corpus proof.

## Exact Validator Commands

| Validator | Label | Command |
| --- | --- | --- |
| contract_self_test | Contract self-test | python3 Algorithm/scripts/validate_contracts.py --self-test |
| forensic_contract_guard | Forensic contract guard | python3 Algorithm/tools/forensic_contract_guard.py |
| build_definition_of_done_map | Definition-of-done builder | python3 tools/analysis/build_definition_of_done_map.py |
| acceptance_atlas_playwright | Acceptance atlas Playwright contract | npm exec --workspaces=false -- playwright test tests/playwright/analysis/acceptance-atlas.spec.ts |

## Blocking Gate Vocabulary

| Gate | Label | Meaning |
| --- | --- | --- |
| SCHEMA_COMPATIBILITY | Schema compatibility | Bundle compatibility, reader windows, and migration chronology stay candidate-bound. |
| DETERMINISTIC_AND_STATE_MACHINE | Deterministic and state-machine | Deterministic helpers, formulas, and lifecycle transitions remain replay-safe. |
| NORTHBOUND_API | Northbound API | Receipts, stale-view rejection, stream replay, and API contract behavior stay stable. |
| AUTHORITY_SANDBOX | Authority sandbox | Enabled provider profiles and controlled-edge cases are proven against sandbox truth. |
| OPERATOR_CLIENT | Operator client | Shipped browser and native clients preserve shell continuity, focus, and compatibility posture. |
| SECURITY | Security | Security, session, masking, and provenance controls are verified without critical unresolved gaps. |
| PERFORMANCE_CANARY | Performance and canary | Load, queue, stream, and failure-mode evidence remain inside governed operational envelopes. |
| RESTORE_DRILL | Restore drill | Recovery checkpoints and restore evidence preserve privacy, audit, and authority closure. |
| MIGRATION_VERIFICATION | Migration verification | Expand, backfill, verify, and contract chronology stays compatible with reader windows. |
| ARTIFACT_INTEGRITY_AND_NOTARIZATION | Artifact integrity and notarization | Build digests, provenance, signatures, and notarization remain candidate-bound. |
| SUITE_ADMISSIBILITY | Suite admissibility | Every blocking suite result is same-candidate, same-scope, unwaived, and unquarantined. |

## Evidence Bundle Inventory Sample

| Bundle | Layer | Blocking Gates |
| --- | --- | --- |
| roadmap_task_completion | roadmap_task_completion | n/a |
| blueprint_coverage_closure | blueprint_coverage_closure | n/a |
| BuildArtifact | release_admissibility | ARTIFACT_INTEGRITY_AND_NOTARIZATION, SECURITY |
| SchemaBundleCompatibilityGateContract | release_admissibility | SCHEMA_COMPATIBILITY, MIGRATION_VERIFICATION, OPERATOR_CLIENT |
| SchemaMigrationLedger | release_admissibility | MIGRATION_VERIFICATION |
| VerificationSuiteResult | release_admissibility | SCHEMA_COMPATIBILITY, DETERMINISTIC_AND_STATE_MACHINE, NORTHBOUND_API, AUTHORITY_SANDBOX, OPERATOR_CLIENT, SECURITY, PERFORMANCE_CANARY, RESTORE_DRILL, MIGRATION_VERIFICATION |
| GateAdmissibilityRecord | release_admissibility | SUITE_ADMISSIBILITY |
| DeterministicGoldenPack | release_admissibility | DETERMINISTIC_AND_STATE_MACHINE |
| AuthoritySandboxCoverageContract | release_admissibility | AUTHORITY_SANDBOX |
| ClientCompatibilityMatrix | release_admissibility | OPERATOR_CLIENT |

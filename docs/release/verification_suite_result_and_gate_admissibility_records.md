# Verification Suite Result And Gate Admissibility Records

## Scope

`VerificationSuiteResult` is the canonical persisted result for a first-class release verification suite. It binds the suite family to the exact release candidate identity, schema reader window, schema compatibility gate, suite-specific evidence refs, test run identifiers, result summary ref, and execution instant.

`GateAdmissibilityRecord` is the canonical release-gate intake decision derived from a suite result. It records whether the suite result is admissible evidence for release gating after candidate identity, freshness, contract-window, rerun-scope, quarantine, and reason-code checks.

## Suite Identity

Both record families carry the same release candidate and compatibility dimensions:

- candidate environment ref, artifact digest, candidate identity hash, and nested candidate identity contract
- schema bundle hash, nested schema reader-window contract, and nested schema bundle compatibility gate contract
- migration plan ref, supported client-window ref, restore drill/checkpoint refs, deterministic golden-pack ref, and authority sandbox coverage contract

The persistence models fail closed if a nested candidate contract, reader window, compatibility gate, or authority coverage contract drifts from the top-level suite scope. This keeps replayed suite results and admissibility rows tied to the exact candidate and schema-safety evidence they claim to describe.

## Suite-Family Dimensions

Suite-specific refs are explicit and null outside their owning family:

- `MIGRATION_VERIFICATION` requires `migration_plan_ref`
- `AUTHORITY_SANDBOX` requires enabled provider profiles and `authority_sandbox_coverage_contract_or_null`
- `OPERATOR_CLIENT` requires `supported_client_window_ref`
- `RESTORE_DRILL` requires both `restore_drill_ref` and `restore_checkpoint_ref`
- `DETERMINISTIC_AND_STATE_MACHINE` requires `deterministic_golden_pack_ref`

Stale restore or deterministic refs on another suite family are rejected instead of being silently carried forward.

## Admissibility Policy

`evaluateGateAdmissibilityRecord` derives `INADMISSIBLE` whenever any of these dimensions fail:

- suite result is not `PASSED`
- candidate identity does not match
- evidence freshness is not verified
- contract window is inconsistent
- rerun scope was not preserved
- quarantine state is `FLAKE_QUARANTINED`, `MUTED`, or `MANUAL_WAIVER`
- explicit reason codes are present

`ADMISSIBLE` requires a passed suite result, all boolean dimensions true, `quarantine_state: "NONE"`, and an empty `reason_codes[]`. Non-empty reason codes force `INADMISSIBLE`; an all-green `INADMISSIBLE` row is rejected as an impossible state.

## Canonical Ordering

The models sort and de-duplicate array dimensions before persistence:

- `VerificationSuiteResult.test_run_identifiers`
- `VerificationSuiteResult.enabled_provider_profile_refs`
- authority coverage enabled provider refs
- `GateAdmissibilityRecord.reason_codes`

Duplicate entries are rejected so immutable rows have stable hashes, stable JSON-schema payloads, and predictable query results.

## Persistence

`VerificationSuiteResultRepository` validates normalized payloads against `verification_suite_result` before storing immutable rows keyed by `suite_result_id`. It indexes by candidate identity hash, suite family, build artifact ref, and result state.

`GateAdmissibilityRecordRepository` validates normalized payloads against `gate_admissibility_record` before storing immutable rows keyed by `admissibility_id`. It indexes by candidate identity hash, suite result ref, suite family, and admissibility state.

Duplicate writes are idempotent only when the existing immutable payload is byte-stable under canonical JSON hashing. Reusing an id with a different payload is rejected.

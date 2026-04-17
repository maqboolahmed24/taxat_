# Invariant Enforcement and Fail-Closed Contract

`schemas/invariant_enforcement_contract.schema.json` is the authoritative boundary for how material
invariant failures become durable typed outcomes instead of comments, ad hoc assertions, or
process-level crashes.

## Purpose

The engine SHALL treat invariant failure as executable law:

- every material invariant violation SHALL persist a family-specific `ErrorRecord`
- every material invariant violation SHALL fail closed into the correct manifest terminal posture
- no invariant failure may normalize into success, review-required continuation, or silent partial
  mutation
- no assertion-only or generic-exception path may bypass durable error and audit evidence

The shared contract therefore binds:

- the invariant class
- the family-specific `error_family` / `error_code`
- the pre-start versus post-start failure stage
- the required `RunManifest.lifecycle_state`
- the required `state_transition_contract.transition_event_code`
- the required terminal audit event type
- the durable `error_record_ref_or_null` anchor

## Boundary scopes

The contract is required on:

- `RunManifest`, where it governs whether invariant failure is absent or has already been
  terminalized into `BLOCKED` / `FAILED`
- `ErrorRecord`, where it governs the invariant class, family-specific fault code, and terminal
  binding carried by the persisted failure object

Boundary-specific binding policies remain explicit:

- `RUN_MANIFEST` -> `MANIFEST_RETAINS_FAIL_CLOSED_STAGE_AND_PRIMARY_ERROR_LINK`
- `ERROR_RECORD` -> `ERROR_RETAINS_INVARIANT_CLASS_FAULT_CODE_AND_TERMINAL_BINDING`

## Stage mapping

The lifecycle mapping is fixed:

- `failure_stage_or_null = PRESTART` -> `RunManifest.lifecycle_state = BLOCKED`,
  `transition_event_code_or_null = system_fault`, terminal audit event `ManifestBlocked`
- `failure_stage_or_null = POSTSTART` -> `RunManifest.lifecycle_state = FAILED`,
  `transition_event_code_or_null = system_fault`, terminal audit event `ManifestFailed`

`PRESTART` means the run never legally entered execution. `POSTSTART` means `run_started` has
already committed and the engine must finalize as a failed attempt rather than reopening pre-start
posture.

## Invariant-class mapping

The contract freezes the invariant-class vocabulary and the allowed family-specific fault codes:

- `SCOPE_BINDING` -> `MANIFEST_ERROR` with `RUNTIME_SCOPE_EMPTY` or
  `RUNTIME_SCOPE_NOT_SUBSET_OF_REQUEST`
- `MANIFEST_REUSE` -> `MANIFEST_ERROR` with `REUSED_SEALED_CONTEXT_MUTATED` or
  `MANIFEST_NOT_SEALED_FOR_REUSE`
- `LIFECYCLE_TRANSITION` -> `MANIFEST_ERROR` with `MANIFEST_SEAL_TRANSITION_INVALID` or
  `MANIFEST_START_CLAIM_INVALID`
- `PRESEAL_GATE_CHAIN` -> `MANIFEST_ERROR` with `PRESEAL_GATE_CHAIN_MISMATCH`
- `INPUT_POLICY` -> `INPUT_BOUNDARY_ERROR` with `LATE_DATA_POLICY_UNKNOWN`
- `CANONICAL_PROMOTION` -> `CANONICALIZATION_ERROR` with `CROSS_PARTITION_PROMOTION_DETECTED`
- `GRAPH_PROVENANCE` -> `PROVENANCE_ERROR` with `GRAPH_QUALITY_MISSING`
- `AMENDMENT_SUBMISSION` -> `AMENDMENT_ERROR` with `AMENDMENT_CASE_NOT_FOUND` or
  `AMENDMENT_CASE_NOT_READY_TO_SUBMIT`
- `FILING_READINESS` -> `WORKFLOW_ERROR` with the filing notice / packet binding invariant codes
- `REPLAY_BASIS` -> `SYSTEM_FAULT` with the replay-basis integrity codes
- `AUTHORITY_PREFLIGHT` -> `AUTHORITY_PROTOCOL_ERROR` with
  `MANIFEST_NOT_READY_FOR_AUTHORITY_PREFLIGHT`

This mapping prevents generic `SYSTEM_FAULT` use when the engine already knows the failure family.

## Durable consequences

When `invariant_failure_state = TRIGGERED`:

- `error_record_ref_or_null` SHALL be non-null
- the manifest SHALL carry non-empty `audit_refs[]`
- the bound `ErrorRecord` SHALL carry non-empty `audit_refs[]`
- assertions and generic exceptions SHALL be converted into typed fail-closed artifacts before
  control leaves the boundary
- `SAFE_RETRY` posture is forbidden because invariant failure is not a transport flake or benign
  transient

When `invariant_failure_state = NOT_TRIGGERED`, every instance-specific field in the contract SHALL
remain null so absence of invariant failure stays explicit and replayable rather than implied.

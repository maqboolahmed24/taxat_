# Authority Calculation Contract

This contract defines the durable artifact surface for the authority-calculation layer.

The authority-calculation layer covers the trigger, retrieve, basis-capture, user-confirmation, and
readiness-context steps used by filing-preparation and amendment-intent journeys.

## Calculation artifacts

`AuthorityCalculationRequest` SHALL validate against
`schemas/authority_calculation_request.schema.json`.

It freezes:

- the selected calculation path
- runtime scope
- operation-profile linkage
- request-envelope and interaction linkage
- modeled-vs-live execution posture
- request-state lineage

Additional invariants:

- modeled requests SHALL clear `authority_operation_ref`, `request_envelope_ref`, and `authority_interaction_ref`
- `runtime_scope[]` SHALL use canonical scope-token ordering and SHALL never carry `submit` or `amendment_submit`
- `intent-to-amend` requests SHALL carry `amendment_intent` and SHALL NOT carry `prepare_submission`
- filing-preparation calculation requests SHALL carry `prepare_submission` and SHALL NOT carry `amendment_intent`
- request artifacts consumed by later filing or amendment gates SHALL remain current calculation
  requests rather than superseded placeholders

`AuthorityCalculationResult` SHALL validate against
`schemas/authority_calculation_result.schema.json`.

It freezes:

- calculation result identity
- retrieved-vs-modeled posture
- validation outcome
- calculation hash
- authority-response linkage
- supersession timing

Additional invariants:

- modeled results SHALL be non-`PASS`
- `reason_codes[]` SHALL use canonical sorted order
- `superseded_at` SHALL NOT predate `retrieved_at`
- `calculation_hash` SHALL be derived from a canonicalized payload that preserves exact-decimal
  money strings and the governing `money_profile`; retrieved or modeled calculation payloads SHALL
  never be hashed from binary floating-point renderings
- readiness-bearing calculation results SHALL remain the current retrieved result rather than a
  superseded historical result

`CalculationBasis` SHALL validate against `schemas/calculation_basis.schema.json`.

It freezes:

- the basis selected from the calculation result
- basis payload and hash
- parity or filing reuse posture
- confirmation linkage
- rejection or supersession rationale

Additional invariants:

- every selected basis SHALL retain non-null `basis_payload_ref` and `basis_hash`, even when the
  basis is provisional, rejected, or later superseded
- `parity_reusable` and `filing_reusable` SHALL be true only for `basis_status = CONFIRMED`
- `superseded_at` SHALL appear only for `basis_status = SUPERSEDED`
- `captured_at`, `confirmed_at`, and `superseded_at` SHALL remain forward-only
- `reason_codes[]` SHALL use canonical sorted order
- `basis_hash` SHALL be computed from canonical decimal-string payload rendering under the frozen
  `money_profile`, so confirmation and reuse never depend on locale or floating-point normalization
- confirmation lineage SHALL remain explicit on the basis object: non-null `user_confirmation_ref`
  or `confirmed_at` SHALL only appear on confirmed-or-superseded basis posture, never on
  provisional or rejected basis state

`CalculationUserConfirmation` SHALL validate against
`schemas/calculation_user_confirmation.schema.json`.

It freezes:

- what was shown to the user or agent
- who confirmed or declined it
- which basis hash was confirmed
- decline rationale when confirmation is withheld

Additional invariants:

- `confirmation_state = CONFIRMED` SHALL keep `reason_codes[]` empty
- non-empty `reason_codes[]` SHALL force `confirmation_state = DECLINED`
- `reason_codes[]` SHALL use canonical sorted order
- confirmation artifacts SHALL describe explicit posture only; a declined or pending confirmation
  SHALL never serialize a confirmed basis hash

`AuthorityCalculationReadinessContext` SHALL validate against
`schemas/authority_calculation_readiness_context.schema.json`.

It freezes:

- whether the context is for filing preparation or amendment intent
- the owning `FilingCase` or `AmendmentCase`
- calculation request, result, basis, and confirmation refs
- request-state, result-state, basis-status, and confirmation-state posture
- calculation and basis hashes used by downstream gate logic
- parity-versus-filing reuse posture
- validation outcome
- reason codes
- whether the current run executed a live authority call

Additional invariants:

- the readiness context SHALL be a sealed gate-consumption object rather than an opaque bag of refs;
  downstream filing or amendment logic SHALL consume its explicit request/result/basis/confirmation
  posture instead of reconstructing that posture from separate artifacts at decision time
- `validation_outcome in {PASS, PASS_WITH_NOTICE}` SHALL require a live retrieved calculation, a
  confirmed basis hash, a confirmed user-confirmation posture, and explicit reusable posture
- `live_authority_call_executed = false` SHALL force modeled request/result posture, clear
  calculation and basis hashes, clear confirmation posture, and clear reusable posture
- active readiness contexts SHALL NOT serialize superseded request, result, or basis posture

## Persistence rule

When a calculation path is required:

- `FilingCase` SHALL persist the calculation refs and readiness context before filing packet build or
  filing gate outcomes rely on them
- `FilingPacket` SHALL copy the active `readiness_context_ref`, `calculation_basis_ref`,
  `authority_calculation_ref`, and `user_confirmation_ref` at build time whenever the selected
  filing path depends on an authority-grounded calculation; filing-gate and packet-approval logic
  SHALL consume those sealed packet fields rather than reloading loose calculation artifacts
- `AmendmentCase` SHALL persist the calculation refs and readiness context before amendment gate
  outcomes rely on them

For amendment reuse, the engine SHALL also persist and evaluate freshness predicates over the exact
baseline envelope, retroactive-impact artifact, provider profile, and user-confirmed basis hash. A
previously `READY_TO_AMEND` case SHALL become stale when any of those predicates fail, and amendment
submission SHALL NOT continue until a fresh readiness context has been captured or review has closed
the discrepancy.

Before confirm-amendment transmission, the engine SHALL freeze an `AmendmentBundle` linking the
current amendment case, exact baseline envelope, retroactive-impact artifact, calculation basis,
user confirmation, and packet or payload hash. This prevents the authority-facing amendment package
from being reconstructed ad hoc from mutable local state.

This keeps filing and amendment progression bound to the exact authority-grounded calculation path
rather than to reconstructed local state.

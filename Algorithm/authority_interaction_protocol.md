# Authority Interaction Protocol

## Authority interaction protocol

The engine SHALL treat every external-authority call as a governed protocol event, not as an ordinary
API request. An authority interaction can create, change, confirm, reject, or qualify legal state. It
therefore requires stronger controls than internal compute or internal workflow.

The purpose of the authority interaction protocol is to ensure that every authority-facing step can
answer all of the following questions deterministically:

1. Which authority operation was being attempted?
2. For which tenant, client, obligation, period, and declared basis was it attempted?
3. Which sealed manifest authorized the attempt?
4. Which token, scope, and authority link were used?
5. Which exact request body was sent?
6. What did the authority acknowledge, reject, or leave unresolved?
7. Can the interaction be replayed, reconciled, or challenged later?

## 9.1 Boundary rule

The engine owns:

- authority-operation intent,
- request construction rules,
- token/client binding selection,
- request hashing,
- idempotency,
- response normalization,
- submission-state interpretation,
- reconciliation,
- and provenance linkage.

The engine does not own:

- authority sign-up,
- authority identity issuance,
- authority legal truth,
- or authority-side processing semantics beyond what is returned by the authority.

For HMRC specifically, sign-up by API is ruled out, customers and agents must first have the
appropriate sign-up/authorisation arrangements in place, and software then operates within that
authorised context. [2]

## 9.2 Protocol scope

The authority interaction protocol SHALL govern at least these operation families:

- `AUTH_READ_REFERENCE`
- `AUTH_READ_OBLIGATIONS`
- `AUTH_READ_CALCULATION`
- `AUTH_CREATE_OR_AMEND_DATA`
- `AUTH_DELETE_DATA`
- `AUTH_TRIGGER_CALCULATION`
- `AUTH_SUBMIT_FINAL_DECLARATION`
- `AUTH_SUBMIT_PERIODIC_UPDATE`
- `AUTH_SUBMIT_POST_FINALISATION_AMENDMENT`
- `AUTH_RECONCILE_STATUS`

In the HMRC embodiment, the protocol must support reading obligations, triggering/retrieving tax
calculations, sending quarterly-update related data, sending final declaration, and supporting
post-finalisation amendment flows. HMRC's own guidance distinguishes these journeys and APIs
explicitly. [3]

## 9.3 Core protocol objects

The protocol SHALL define these first-class objects.

### A. `AuthorityOperation`

A normalized description of the intended authority action.

Required fields:

- `operation_id`
- `operation_family`
- `authority_name`
- `authority_product_profile`
- raw `requested_scope[]`
- authorized `runtime_scope[]`
- `business_partitions[]`
- `period`
- `target_obligation_ref`
- `basis_type`
- `manifest_id`

Architectural note:
- raw `requested_scope[]` preserves caller intent for audit and replay narration
- authorized `runtime_scope[]` is the executable scope that governs duplicate handling, request hashing, amendment legality, and live authority side effects

### B. `AuthorityBinding`

The bound authority context used for the operation.

Required fields:

- `authority_link_ref`
- `token_binding_ref`
- `subject_ref`
- `acting_party_ref`
- `authority_scope`
- `provider_environment`
- `provider_api_version`

### C. `AuthorityRequestEnvelope`

The sealed request representation.

The envelope is the finalized, identity-complete request artifact. It is not a partially-populated
pre-hash stub.

Required fields:

- `request_id`
- `operation_id`
- `http_method`
- `resource_template`
- `resolved_path_params{}`
- `query_params{}`
- `header_profile_refs[]`
- `payload_ref`
- `canonical_path`
- `canonical_query`
- `request_body_hash`
- `request_hash`
- `idempotency_key`
- `access_binding_hash`
- `transmit_policy_ref`

### D. `AuthorityResponseEnvelope`

The normalized response representation.

Required fields:

- `response_id`
- `request_id`
- `received_at`
- `http_status`
- `response_headers_ref`
- `response_body_ref`
- `authority_reference`
- `response_class`
- `retry_class`

### E. `AuthorityInteractionRecord`

The durable linkage object.

Required fields:

- `interaction_id`
- `manifest_id`
- `operation_id`
- `request_id`
- `response_id`
- `submission_record_ref`
- `audit_refs[]`
- `provenance_refs[]`

## 9.4 Operation profiles

The engine SHALL not hard-code raw endpoint behavior into business logic. Instead it SHALL use a
frozen `AuthorityOperationProfile` for each operation family.

Each profile SHALL include:

- operation family
- provider/environment
- transport rules
- required scopes
- required fraud-header profile
- idempotency strategy
- success-response extraction rules
- pending/unknown rules
- reconciliation method
- legal-state interpretation rules

This matters in the HMRC embodiment because the documentation and APIs expose authority actions
through a combination of end-to-end guide wording and endpoint-specific parameterization. For example,
the year-end guide describes triggering final declaration calculation with the final-declaration
parameter set, while the Individual Calculations API exposes the final-declaration path through
`intent-to-finalise`; the engine should therefore freeze the provider contract profile rather than
relying on one hard-coded textual representation. [4]

## 9.5 Preflight sequence

Before any authority call, the engine SHALL execute this exact sequence:

1. `AUTHORIZE(principal, action, scope)`
2. verify the manifest envelope is sealed and `RunManifest.lifecycle_state in {SEALED, IN_PROGRESS}` for compliance-capable operations
3. resolve `AuthorityOperationProfile`
4. resolve `AuthorityBinding`
5. verify token/client binding
6. verify required approvals/step-up state
7. canonicalize request material (resolved path, canonical query, canonical payload bytes, header-profile refs) using a byte-stable procedure: path params rendered in declared segment order, query keys sorted lexicographically with repeated keys preserving declared item order, header-profile refs sorted lexicographically, Unicode normalized to NFC, and no wall-clock/generated nonce fields inside the canonical body
8. compute `request_body_hash`
9. compute `request_hash`
10. compute `idempotency_key`
11. build `AuthorityRequestEnvelope`
12. run duplicate/pending collision checks
13. attach fraud-prevention header set
14. transmit through the controlled gateway

Clarification:
- the sealed-state preflight in step 2 is distinct from `MANIFEST_GATE`
- `MANIFEST_GATE` is part of the ordered pre-seal gate chain and executes before `SEAL_MANIFEST(...)`
- authority preflight is the post-seal enforcement point that requires
  `RunManifest.lifecycle_state in {SEALED, IN_PROGRESS}`

If any step fails, no authority request SHALL be sent. `run_kind = REPLAY` or `replay_class != null`
SHALL never progress to a live authority mutation transmit step; any attempt to do so is a preflight
`HARD_BLOCK`.

## 9.6 Token and client binding rule

Where the authority uses user-restricted OAuth, the engine SHALL bind each authority call to the
correct subject-specific token context and SHALL fail closed on ambiguity.

In the HMRC model, an application may hold multiple OAuth 2.0 access tokens for an agent, but the
correct token must be used for each client or the call can fail with `401 Unauthorized`. That means
token resolution is not a convenience feature; it is part of legal-operational correctness. [1]

## 9.7 Fraud-prevention header rule

For authority profiles that require fraud-prevention data, the engine SHALL treat header generation as
part of protocol validity, not as optional transport metadata.

In the HMRC MTD context, fraud-prevention header data is legally required for Income Tax Self
Assessment (MTD) APIs and associated endpoints, and HMRC provides a sandbox validator API specifically
to test the submitted headers. HMRC also states that continuing to submit incorrect or missing data
after discussions can lead to fines or being blocked from using the APIs. [5]

The protocol SHALL therefore store:

- `fraud_header_profile_ref`
- `fraud_header_capture_ref`
- `fraud_header_validation_ref`
- `fraud_header_exemption_reason` if legitimately incomplete

## 9.8 Request hashing and idempotency

Every authority attempt SHALL derive:

- `executable_scope[] = manifest.access_decision.effective_scope[]` when present, else `manifest.requested_scope[]`
- `access_binding_hash = hash(manifest.access_decision.decision | ordered(executable_scope[]) | ordered(masking_rules[]) | ordered(required_approvals[]) | required_authn_level)`
- `canonical_query = stable_query(query_params)` where keys are sorted lexicographically and repeated values preserve declared order
- `canonical_path = stable_path(resource_template, resolved_path_params)` where params are rendered in declared template-segment order
- `request_body_hash = hash(canonical_payload_bytes)`
- `request_hash = hash(authority_name | authority_product_profile | provider_environment | authority_scope | operation_family | operation_profile | http_method | canonical_path | canonical_query | ordered(header_profile_refs[]) | request_body_hash | token_binding_ref | provider_api_version | access_binding_hash)`
- `attempt_lineage_manifest_id = root_manifest_id if present else manifest_id`
- `normalized_obligation_ref = obligation_ref if obligation_ref is present else "<NONE>"`
- `normalized_basis_type = basis_type if basis_type is present else "<NONE>"`
- `idempotency_key = hash(tenant_id | client_id | authority_name | provider_environment | authority_scope | provider_api_version | operation_family | operation_profile | normalized_obligation_ref | normalized_basis_type | access_binding_hash | attempt_lineage_manifest_id | canonical_path | canonical_query | ordered(header_profile_refs[]) | request_body_hash)`

This request-level `idempotency_key` is distinct from the manifest-level `RunManifest.idempotency_key`.
It is derived from stable frozen manifest lineage, executable access binding, and the specific authority
request body so that safe continuation/recovery manifests may reuse the same authority-attempt identity
only when the actual executable meaning is unchanged.

### Idempotency rule

The same business-meaningful attempt SHALL reuse the same idempotency key. A materially different
request body or materially different executable access binding SHALL never reuse the same idempotency
meaning silently.

### Collision rule

If the same idempotency key appears with a different request-body hash, the protocol SHALL classify the
attempt as `BODY_COLLISION` and `HARD_BLOCK` the transmit step.

## 9.9 Response classes

Every authority response SHALL be normalized into one of:

- `ACK_SUCCESS`
- `ACK_ACCEPTED_PENDING`
- `ACK_REJECTED_VALIDATION`
- `ACK_REJECTED_AUTH`
- `ACK_RETRYABLE_FAILURE`
- `ACK_TIMEOUT_OR_NO_RESOLUTION`
- `ACK_EXTERNAL_STATE_DISCOVERED`

### Default normalization rules

`ACK_SUCCESS`

- 2xx response with a valid authority reference or valid success contract
- creates or updates `SubmissionRecord` toward `CONFIRMED` or equivalent success path

`ACK_ACCEPTED_PENDING`

- 2xx/202-style response or accepted transmit where legal confirmation is not yet final
- creates or updates `SubmissionRecord = PENDING_ACK`

`ACK_REJECTED_VALIDATION`

- 4xx response indicating payload or business validation failure
- creates `SubmissionRecord = REJECTED`

`ACK_REJECTED_AUTH`

- 401/403 or equivalent authority/authentication failure
- no legal progression; high-severity audit event

`ACK_RETRYABLE_FAILURE`

- 5xx or equivalent transient provider failure
- `SubmissionRecord = PENDING_ACK` or `UNKNOWN` depending profile

`ACK_TIMEOUT_OR_NO_RESOLUTION`

- no confirmed authority outcome after transmit ambiguity
- `SubmissionRecord = UNKNOWN`

`ACK_EXTERNAL_STATE_DISCOVERED`

- obligations or returned status indicate the authority already holds a relevant legal state not created by the current packet flow
- `SubmissionRecord = OUT_OF_BAND`

## 9.10 Submission-state write rules

The authority protocol SHALL be the only layer allowed to create or mutate `SubmissionRecord`
legal-state transitions.

### Allowed write rules

The protocol MAY write:

- `INTENT_RECORDED`
- `TRANSMIT_PENDING`
- `TRANSMITTED`
- `PENDING_ACK`
- `CONFIRMED`
- `REJECTED`
- `UNKNOWN`
- `OUT_OF_BAND`

The protocol SHALL NOT:

- set `CONFIRMED` from internal optimism
- infer authority confirmation from UI completion
- infer legal success from request dispatch alone

In the HMRC year-end flow, software triggers the calculation, retrieves the calculation result, shows
it to the user, submits final declaration, and HMRC then confirms receipt and marks the obligation
fulfilled; the guide also notes it can take up to an hour for the obligation to be marked fulfilled in
HMRC's system. [4]

## 9.11 Calculation handshake protocol

For authority-calculation operations, the protocol SHALL distinguish three steps:

1. `TRIGGER_CALCULATION`
2. `RETRIEVE_CALCULATION`
3. `CONFIRM_CALCULATION_BASIS`

In the HMRC embodiment:

- in-year, annual forecast, and end-of-year calculations are retrieved from HMRC;
- the HMRC-returned calculation is the same one HMRC uses;
- final declaration is preceded by a trigger/retrieve calculation flow;
- amendments use an `intent-to-amend` calculation flow before confirmation. [6]

The engine SHALL therefore store:

- `calculation_request_ref`
- `calculation_id`
- `calculation_type`
- `calculation_hash`
- `calculation_basis_ref`
- `user_confirmation_ref`

For end-of-year final-declaration journeys, these fields SHALL be persisted on a `FilingCase` or
equivalent first-class artifact before filing-packet build, workflow closure, or terminal run
outcomes rely on them.

For amendment journeys, these fields SHALL be persisted on an `AmendmentCase` or equivalent first-class
artifact before packet build, workflow closure, or terminal run outcomes rely on them.

## 9.12 Duplicate and pending-state rules

Before transmit, the protocol SHALL search for existing `SubmissionRecord`s for the same:

- client
- authority scope
- business partition
- period
- obligation
- operation family

### Duplicate handling

- existing `CONFIRMED` + same meaning + current transmit is not an eligible amendment progression
  -> block duplicate submission
- existing `CONFIRMED` + current transmit is an eligible amendment progression
  (authorized `runtime_scope[]` contains `amendment_submit` and `AmendmentCase.lifecycle_state = READY_TO_AMEND`)
  -> allow amendment-safe progression rather than original-return duplicate block
- existing `PENDING_ACK` or `UNKNOWN` -> route to reconciliation, not blind resend
- existing identical packet + safe retry profile -> idempotent recovery permitted
- existing out-of-band legal state -> create reconciliation workflow, not direct overwrite

## 9.13 Reconciliation protocol

The protocol SHALL support a read-after-write or read-after-timeout reconciliation loop.

### Reconciliation inputs

- `SubmissionRecord`
- `ObligationMirror`
- `authority_reference`
- calculation or submission correlation keys
- provider operation profile

### Reconciliation outputs

- `RECONCILED_CONFIRMED`
- `RECONCILED_REJECTED`
- `RECONCILED_STILL_PENDING`
- `RECONCILED_OUT_OF_BAND`
- `RECONCILED_UNRESOLVED`
- updated `SubmissionRecord`
- updated `ObligationMirror`
- refreshed authority-state summary

The engine SHALL map these reconciliation outcomes to the corresponding audit events:

- `RECONCILED_CONFIRMED` -> `SubmissionConfirmed`
- `RECONCILED_REJECTED` -> `SubmissionRejected`
- `RECONCILED_STILL_PENDING` or `RECONCILED_UNRESOLVED` -> `SubmissionUnknown`
- `RECONCILED_OUT_OF_BAND` -> `OutOfBandStateObserved`

In the HMRC embodiment, obligations and final-declaration states are retrievable through the
Obligations API, and year-end amendment eligibility also depends on authority-recognised final
declaration state. [3]

## 9.14 Out-of-band and authority-correction semantics

If authority data indicates that a legal state already exists but did not originate from the current
packet flow, the protocol SHALL mark that state `OUT_OF_BAND` and open reconciliation rather than
silently absorbing it into the current manifest.

The protocol SHALL also reserve an explicit cause family for future authority-side corrections, because
HMRC's published MTD roadmap includes planned support for HMRC corrections to a tax return filed
through MTD software becoming visible in software. [7]

Recommended cause enums:

- `EXTERNAL_SOFTWARE_FILED`
- `AUTHORITY_STATE_DISCOVERED`
- `AUTHORITY_CORRECTION_APPLIED`
- `AUTHORITY_CORRECTION_PENDING_REVIEW`

## 9.15 Audit invariants

Every authority interaction SHALL emit:

- `AuthorityOperationPlanned`
- `AuthorityRequestBuilt`
- `AuthorityRequestSent`
- `AuthorityResponseReceived`
- `AuthorityStatusNormalized`
- `AuthorityReconciliationAttempted`
- `AuthorityReconciliationResolved`

Every event SHALL carry:

- `manifest_id`
- `operation_id`
- `request_hash`
- `idempotency_key`
- `authority_link_ref`
- `token_binding_ref`
- `client_id`
- `tenant_id`

## 9.16 One-sentence summary

The authority interaction protocol turns external filing and status calls into a sealed, hash-bound,
client-bound, authority-reconciled exchange model in which the engine records intent, packet identity,
acknowledgement semantics, and legal-state outcomes without ever confusing "sent" with "confirmed."

[1]: https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/user-restricted-endpoints
[2]: https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/prepare-for-mtd.html
[3]: https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/obligations-api/3.0?utm_source=chatgpt.com
[4]: https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/make-updates-at-tax-year-end.html?utm_source=chatgpt.com
[5]: https://developer.service.hmrc.gov.uk/guides/fraud-prevention?utm_source=chatgpt.com
[6]: https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/tax-calculations.html?utm_source=chatgpt.com
[7]: https://developer.service.hmrc.gov.uk/roadmaps/mtd-itsa-vendors-roadmap/apis.html?utm_source=chatgpt.com

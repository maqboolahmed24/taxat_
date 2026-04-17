# Authority Interaction Protocol

## Authority interaction protocol

The engine SHALL treat every external-authority call as a governed protocol event, not as an ordinary
API request. An authority interaction can create, change, confirm, reject, or qualify legal state. It
therefore requires stronger controls than internal compute or internal workflow.
This protocol operates behind the authority layer boundary and governs request issuance, callback
handling, polling, and any external handoff that crosses between Taxat and the provider.

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

These objects SHALL validate against dedicated JSON schemas in `schemas/authority_operation.schema.json`,
`schemas/authority_binding.schema.json`, `schemas/authority_request_envelope.schema.json`,
`schemas/authority_response_envelope.schema.json`, and
`schemas/authority_interaction_record.schema.json`.

### A. `AuthorityOperation`

A normalized description of the intended authority action.

Required fields:

- `artifact_type = AuthorityOperation`
- `operation_id`
- `tenant_id`
- `client_id`
- `operation_family`
- `authority_name`
- `authority_product_profile`
- `operation_profile_ref`
- `attempt_lineage_manifest_id`
- `provider_environment`
- `provider_api_version`
- `authority_scope`
- raw `requested_scope[]`
- authorized `runtime_scope[]`
- `policy_snapshot_hash`
- `authority_binding_ref`
- `authority_link_ref`
- `delegation_grant_ref`
- `binding_lineage_ref`
- `token_binding_ref`
- `subject_ref`
- `acting_party_ref`
- `business_partitions[]`
- `period`
- `target_obligation_ref`
- `basis_type`
- `manifest_id`
- `contract`

Architectural note:
- raw `requested_scope[]` preserves caller intent for audit and replay narration
- authorized `runtime_scope[]` is the executable scope that governs duplicate handling, request hashing, amendment legality, and live authority side effects
- `scope_execution_binding{...}` SHALL accompany authority operations and calculation requests so worker retries and downstream request builders reuse one frozen requested-versus-executable scope meaning instead of re-parsing token arrays ad hoc
- both arrays SHALL persist the canonical ordered scope grammar, with the reporting-scope token
  first and any action tokens following in frozen scope-grammar order
- `tenant_id`, `client_id`, and `attempt_lineage_manifest_id` SHALL be frozen on the operation itself so
  `AuthorityOperationPlanned` and later request-build events share the same tenant/client and
  continuation root, rather than recovering that lineage from adjacent manifest state after the fact
- `provider_environment`, `provider_api_version`, and `authority_scope` SHALL be persisted explicitly
  on the operation and SHALL NOT be reconstructed later only from a mutable profile ref or a freshly
  resolved binding
- the finalized operation SHALL freeze the exact `authority_binding_ref`, `authority_link_ref`,
  `delegation_grant_ref`, `binding_lineage_ref`, `token_binding_ref`, `subject_ref`,
  `acting_party_ref`, and `policy_snapshot_hash` chosen at preflight so replay, recovery, queued
  sends, and audit do not re-resolve live authority context after the fact
- `business_partitions[]` SHALL be present even when no partition-specific target exists; the explicit
  empty array means account-level or global read semantics, while live mutation and calculation
  families SHALL carry at least one concrete partition
- `business_partitions[]` SHALL exactly mirror the executable partition scope frozen in
  `scope_execution_binding.executable_partition_scope_refs[]`; partition narrowing from authorization
  SHALL not be widened, reordered, or recovered later from the live authority link
- `AUTH_SUBMIT_PERIODIC_UPDATE` SHALL carry executable `runtime_scope[]` including both
  `quarterly_update` and `submit`, and SHALL name the target obligation explicitly
- `AUTH_SUBMIT_FINAL_DECLARATION` SHALL carry `year_end` and `submit`, and SHALL persist a non-null
  `basis_type`
- `AUTH_SUBMIT_POST_FINALISATION_AMENDMENT` SHALL carry `year_end` and `amendment_submit`, and
  SHALL persist a non-null `basis_type`
- `AUTH_TRIGGER_CALCULATION` SHALL carry either `prepare_submission` or `amendment_intent`, never a
  live submit scope, and SHALL persist a non-null `basis_type`
- read, reconciliation, and other non-submit families SHALL NOT carry `submit` or
  `amendment_submit` in `runtime_scope[]`
- `business_partitions[]` SHALL remain canonically sorted, and mutation-capable, calculation, and
  submission families SHALL retain one or more concrete partitions rather than collapsing executable
  meaning into an implicit global scope

### B. `AuthorityBinding`

The bound authority context used for the operation.

Required fields:

- `artifact_type = AuthorityBinding`
- `tenant_id`
- `client_id`
- `principal_context_ref`
- `authorization_decision_ref`
- `authority_link_ref`
- `delegation_grant_ref`
- `delegation_state`
- `authority_link_state`
- `partition_scope_refs[]`
- `token_binding_ref`
- `binding_lineage_ref`
- `token_version_ref`
- `subject_ref`
- `acting_party_ref`
- `authority_scope`
- `provider_environment`
- `provider_api_version`
- `access_binding_hash`
- `policy_snapshot_hash`
- `token_client_binding_state`
- `binding_health`
- `last_validated_at`
- `expires_at`
- `blocked_reason_codes[]`
- `authority_layer_boundary{...}`
- `step_up_state`
- `step_up_evidence_ref`
- `approval_state`
- `approval_ref`
- `binding_resolved_at`

Binding note:
- lawful token rotation MAY advance `token_version_ref` only within the same `binding_lineage_ref`
- a changed subject, client, authority scope, or authority-link lineage is a materially different
  binding and SHALL require a new request identity
- narrowed delegation or partition scope SHALL remain explicit on the binding rather than inferred
  from the linked authority edge at replay time
- the binding SHALL retain the exact `principal_context_ref` and `authorization_decision_ref` that
  produced the executable `access_binding_hash`; internal permission, client delegation,
  authority-link readiness, and token/client binding SHALL remain distinct layers rather than
  collapsing into one opaque allow/deny result
- the resolved binding SHALL freeze the executable `access_binding_hash`, `policy_snapshot_hash`,
  and any satisfied step-up or approval evidence used to authorize the operation
- the binding SHALL also freeze `authority_layer_boundary{...}` so tenant permission, client
  delegation, imported freshness, authority-link readiness, human-gate evidence, and
  authority-of-record precedence remain separate machine-checkable layers at preflight and replay
- any browser or external authority-link handoff surfaced from that binding SHALL additionally stay
  behind one `externalization_governance_contract{...}` so preflight blockers, target link
  identity, and pending-return posture are preserved through the handoff rather than reconstructed
  from ambient route state on return
- `delegation_state` and `authority_link_state` SHALL expose typed blocked posture before transport;
  missing delegation, expired delegation, stale/limited authority links, and token/client mismatch
  SHALL not fall through as generic gateway failure
- `binding_health = CLIENT_BINDING_MISMATCH` SHALL retain `token_client_binding_state = MISMATCH`
- `binding_health in {HEALTHY, EXPIRING_SOON}` SHALL retain `token_client_binding_state = BOUND`
- `binding_health in {EXPIRING_SOON, EXPIRED}` SHALL retain non-null `expires_at`
- if `acting_party_ref` differs from `subject_ref`, the binding SHALL retain non-null `delegation_grant_ref`

### C. `AuthorityRequestEnvelope`

The sealed request representation.

The envelope is the finalized, identity-complete request artifact. It is not a partially-populated
pre-hash stub.
It SHALL not exist for an authority-integrated progression until any required step-up or approval
evidence is already frozen; pending human-gate posture belongs in authorization or workflow, not in
the sendable request envelope.

Required fields:

- `artifact_type = AuthorityRequestEnvelope`
- `request_id`
- `tenant_id`
- `client_id`
- `manifest_id`
- `attempt_lineage_manifest_id`
- `operation_id`
- `authority_name`
- `authority_product_profile`
- `provider_environment`
- `authority_scope`
- `operation_family`
- `operation_profile`
- `provider_api_version`
- `http_method`
- `resource_template`
- `resolved_path_params{}`
- `query_params{}`
- `header_profile_refs[]`
- `payload_ref`
- `canonical_path`
- `canonical_query`
- `identity_profile_version`
- `identity_namespace_hash`
- `normalized_obligation_ref`
- `normalized_basis_type`
- `duplicate_meaning_key`
- `request_body_hash`
- `request_hash`
- `idempotency_key`
- `request_identity_contract`
- `access_binding_hash`
- `policy_snapshot_hash`
- `authority_binding_ref`
- `authority_link_ref`
- `delegation_grant_ref`
- `authority_layer_boundary{...}`
- `subject_ref`
- `acting_party_ref`
- `token_binding_ref`
- `binding_lineage_ref`
- `business_partition_refs[]`
- `obligation_ref`
- `basis_type`
- `fraud_header_profile_ref`
- `fraud_header_capture_ref`
- `fraud_header_validation_ref`
- `fraud_header_exemption_reason`
- `transmit_policy_ref`

Identity-scoping fields that feed `request_hash` or `idempotency_key` SHALL be persisted explicitly
on the sealed envelope rather than reconstructed later from adjacent operation or binding objects.
Optional business context such as obligation or basis SHALL be represented explicitly as present
values or explicit nulls, never by omission.
`identity_profile_version` SHALL freeze the request-identity formula family,
`normalized_obligation_ref`/`normalized_basis_type` SHALL serialize the exact value or the explicit
`<NONE>` sentinel, `identity_namespace_hash` SHALL freeze the authority/provider/binding namespace
used for collision detection, and `duplicate_meaning_key` SHALL freeze the legal duplicate bucket
used by retry and reconciliation decisions.
The envelope SHALL therefore preserve the same frozen authority-binding lineage (`authority_binding_ref`,
`authority_link_ref`, `delegation_grant_ref`, `binding_lineage_ref`, `token_binding_ref`,
`subject_ref`, `acting_party_ref`, `access_binding_hash`, and `policy_snapshot_hash`) that was
authorized at preflight; queued sends and recovery SHALL not swap to live authority context later.
`request_identity_contract{...}` SHALL group that same identity spine into one byte-stable packet
that request-backed downstream artifacts may copy directly; interaction recovery, resend legality,
and submission reconciliation SHALL NOT rebuild request identity by re-reading adjacent
`AuthorityOperation`, `AuthorityBinding`, or manifest state.
`token_version_ref` is intentionally excluded from the sealed envelope identity because lawful
rotation may advance only within the same `binding_lineage_ref`; the concrete token version
authorised at byte-send time SHALL instead be persisted on the `AuthorityInteractionRecord`.
`header_profile_refs[]` and `business_partition_refs[]` SHALL remain canonically sorted, and
`request_body_hash` SHALL persist the explicit null-body sentinel `<NONE>` only when `payload_ref`
is null. Mutation-capable, calculation, and submit families SHALL retain non-empty
`business_partition_refs[]`, and period-update request envelopes SHALL retain a non-null
`obligation_ref` rather than relying on route-local context.

### D. `AuthorityResponseEnvelope`

The normalized response representation.

Required fields:

- `response_id`
- `request_id`
- `received_at`
- `provider_received_at`
- `http_status`
- `response_headers_ref`
- `response_body_ref`
- `response_body_hash`
- `authority_reference`
- `response_source`
- `provider_delivery_ref`
- `inbox_receipt_ref`
- `ingress_receipt_ref`
- `authority_ingress_proof_contract{...}`
- `derivation_posture`
- `legal_effect_posture`
- `supersedes_response_id`
- `corroborates_response_ids[]`
- `conflicting_response_ids[]`
- `recovery_basis_response_id`
- `correlation_status`
- `response_class`
- `retry_class`

Response note:
- `AuthorityResponseEnvelope` is one normalized authority observation, not an implicit
  last-writer-wins statement of final legal meaning for the interaction
- `response_source` SHALL distinguish at least `INLINE_HTTP`, `CALLBACK`, `POLL`, `TRANSPORT_TIMEOUT`,
  and `RECOVERY_READ`
- timeout/no-body cases SHALL still produce a normalized `AuthorityResponseEnvelope`, and every
  no-body response artifact SHALL persist `response_body_ref = null` and
  `response_body_hash = "<NONE>"`
- `correlation_status` SHALL distinguish at least `BOUND`, `BOUND_WITH_AUTHORITY_REFERENCE_ONLY`,
  `AMBIGUOUS`, and `UNBOUND`
- `provider_received_at` SHALL never be later than `received_at`
- `provider_delivery_ref` and `inbox_receipt_ref` SHALL remain null for `INLINE_HTTP`, and
  `ACK_TIMEOUT_OR_NO_RESOLUTION` SHALL serialize as a `TRANSPORT_TIMEOUT` response rather than as a
  synthetic success or pending response class
- any normalized asynchronous `AuthorityResponseEnvelope` sourced from `CALLBACK`, `POLL`, or
  `RECOVERY_READ` SHALL retain a non-null `ingress_receipt_ref` proving the durable
  `AuthorityIngressReceipt` checkpoint that existed before response normalization, plus a non-null
  `authority_ingress_proof_contract{...}` freezing the authenticated channel evidence, canonical
  delivery identity, exact lineage-binding basis, and mutation-gate posture used for that
  normalization
- `INLINE_HTTP` and `TRANSPORT_TIMEOUT` response sources SHALL keep
  `authority_ingress_proof_contract = null`; timeout placeholders SHALL not masquerade as
  authenticated ingress-backed responses
- `derivation_posture` SHALL distinguish at least `PRIMARY_OBSERVATION`,
  `CORROBORATING_OBSERVATION`, `SUPERSEDES_TIMEOUT_PLACEHOLDER`,
  `CONFLICTING_OBSERVATION`, and `TIMEOUT_PLACEHOLDER`
- `legal_effect_posture` SHALL distinguish whether the observation may drive direct state mutation,
  provisional-only state mutation, reconciliation-only handling, or no additional mutation
- `supersedes_response_id`, `corroborates_response_ids[]`, `conflicting_response_ids[]`, and
  `recovery_basis_response_id` SHALL preserve how a callback, poll, or recovery read was derived
  relative to earlier observations for the same interaction instead of collapsing source semantics at
  normalization time

### E. `AuthorityInteractionRecord`

The durable linkage object.

Required fields:

- `interaction_id`
- `manifest_id`
- `operation_id`
- `request_id`
- `request_hash`
- `idempotency_key`
- `identity_namespace_hash`
- `duplicate_meaning_key`
- `request_identity_contract`
- `authority_binding_ref`
- `authority_link_ref`
- `binding_lineage_ref`
- `access_binding_hash`
- `policy_snapshot_hash`
- `lifecycle_state`
- `created_at`
- `last_status_at`
- `active_response_id`
- `response_history_ids[]`
- `meaning_resolution_state`
- `submission_record_ref`
- `dispatch_ref`
- `send_revalidation_state`
- `send_revalidated_at`
- `send_authorized_token_version_ref`
- `send_revalidation_reason_codes[]`
- `reconciliation_method`
- `max_auto_reconciliation_attempts`
- `reconciliation_cadence_seconds`
- `reconciliation_budget_state`
- `next_reconciliation_at`
- `reconciliation_deadline_at`
- `reconciliation_escalated_at`
- `reconciliation_workflow_item_ref`
- `resend_legality_state`
- `resend_control_reason_codes[]`
- `audit_refs[]`
- `provenance_refs[]`
- `resolution_basis`
- `abandonment_reason_code`

Lifecycle note:
- `AuthorityInteractionRecord` SHALL be created no later than the transaction that persists the
  initial dispatch definition for the authority exchange
- the interaction record SHALL preserve the frozen `authority_binding_ref`, `authority_link_ref`,
  `binding_lineage_ref`, `access_binding_hash`, `policy_snapshot_hash`, exact-request
  `request_hash`, retry-stable `idempotency_key`, `identity_namespace_hash`, and
  `duplicate_meaning_key` chosen for the live attempt so reconciliation, recovery, and audit never
  consult live authority-link state to explain a historical send
- `request_identity_contract{...}` SHALL remain byte-identical to the grouped identity packet on the
  sealed `AuthorityRequestEnvelope` so replay, recovery, and ingress correlation can rely on one
  persisted request identity rather than recomposing it from multiple artifacts
- `active_response_id` MAY be null while the exchange is only queued, in flight, or awaiting the
  first provider-visible response artifact
- `active_response_id` SHALL mean the current legally admissible response meaning, not simply the
  most recently received raw provider observation
- every normalized response observation attached to the interaction SHALL remain in
  `response_history_ids[]`, and `active_response_id` SHALL always be a member of that history set
- `meaning_resolution_state` SHALL distinguish at least `NO_RESPONSE`, `PROVISIONAL_TIMEOUT`,
  `ACTIVE_DIRECT`, `ACTIVE_CORROBORATED`, `RECONCILIATION_REQUIRED`, and
  `RECONCILIATION_RESOLVED` so callback/poll/recovery competition is explicit at the interaction
  boundary
- `submission_record_ref` MAY be null for read-only or calculation-only operation families that do
  not create submission lineage
- `dispatch_ref` SHALL point to the outbox message, immediate gateway dispatch record, or equivalent
  durable handle that made the exchange visible to the transport layer
- `send_revalidation_state` SHALL remain `NOT_PERFORMED` while the exchange is only registered or
  queued, SHALL become `CLEAR_TO_SEND` only after the mandatory pre-send revalidation succeeds, and
  SHALL become `BLOCKED` only when the gateway aborts the send before bytes leave the process
- `send_revalidated_at` SHALL record the exact timestamp of the mandatory pre-send revalidation
- `send_authorized_token_version_ref` SHALL remain null until `send_revalidation_state =
  CLEAR_TO_SEND`, at which point it SHALL retain the concrete token version authorised immediately
  before transmit; the field therefore proves whether the gateway reused the sealed token version or
  accepted lawful rotation within the same `binding_lineage_ref`
- `send_revalidation_reason_codes[]` SHALL remain empty while revalidation has not run, SHALL contain
  exactly one lawful pass reason (`SEALED_TOKEN_VERSION_REUSED` or
  `TOKEN_ROTATED_WITHIN_LINEAGE`) when the exchange was cleared to send, and SHALL otherwise retain
  one or more explicit block reasons such as `BINDING_LINEAGE_DRIFT`,
  `AUTHORITY_LINK_NOT_ACTIVE`, `ACCESS_BINDING_HASH_DRIFT`, `POLICY_SNAPSHOT_HASH_DRIFT`,
  `DUPLICATE_BUCKET_CHANGED`, `STRONGER_EXTERNAL_TRUTH_PRESENT`, or
  `BODY_COLLISION_PRESENT`
- `reconciliation_method`, `max_auto_reconciliation_attempts`, and
  `reconciliation_cadence_seconds` SHALL freeze the governing automatic follow-up budget copied from
  the chosen `AuthorityOperationProfile`
- `reconciliation_budget_state` SHALL distinguish `NOT_OPENED`, currently active bounded follow-up,
  exhausted auto budget, escalated ownership, and closed no-resend posture
- `next_reconciliation_at` SHALL be the only durable schedule authority for the next follow-up read
  once a response enters `PENDING_ACK`, `UNKNOWN`, timeout-placeholder, or conflicting posture
- `reconciliation_escalated_at` and `reconciliation_workflow_item_ref` SHALL preserve when and
  where unresolved authority ambiguity was handed to operator or compliance ownership
- `resend_legality_state` SHALL distinguish queued/unassessed posture, in-flight idempotent-recovery
  only posture, bounded follow-up-read-only posture, blocked reconciliation posture,
  blocked-by-escalation posture, and closed no-resend posture
- `resend_control_reason_codes[]` SHALL make the blocking or recovery-only reason machine-readable so
  duplicate suppression, queue rebuild, stale worker reclaim, and audit all consult one persisted
  resend authority instead of inferring legality from local queue state
- `reconciliation_deadline_at` MAY be null when the operation family is terminal at first response and
  does not enter a pending legal-state window
- `resolution_basis` SHALL distinguish resolution by terminal response from resolution by explicit
  reconciliation result
- once the exchange reaches `RESOLVED` or `ABANDONED`, `reconciliation_deadline_at` SHALL clear so
  no stale pending-state clock survives terminal settlement
- `ABANDONED` exchanges SHALL preserve the attempted request lineage but SHALL keep
  `active_response_id = null` and `reconciliation_deadline_at = null`, because abandonment occurs
  before response capture or pending-state reconciliation begins
- `ABANDONED` exchanges MAY therefore retain either `send_revalidation_state = BLOCKED` when the
  send was stopped before transmit, or `send_revalidation_state = CLEAR_TO_SEND` when a previously
  lawful send later had to be quarantined or superseded before response capture; the contract SHALL
  not erase that distinction
- `abandonment_reason_code` SHALL be null unless the exchange has entered `ABANDONED`, in which case
  the abandonment reason SHALL be explicit and durable

## 9.4 Operation profiles

The engine SHALL not hard-code raw endpoint behavior into business logic. Instead it SHALL use a
frozen `AuthorityOperationProfile` for each operation family.

`AuthorityOperationProfile` SHALL validate against
`schemas/authority_operation_profile.schema.json`.

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
5. finalize `AuthorityOperation` with the frozen binding lineage selected in step 4
6. verify token/client binding
7. verify required approvals/step-up state
8. canonicalize request material (resolved path, canonical query, canonical payload bytes, header-profile refs) using a byte-stable procedure: path params rendered in declared segment order, query keys sorted lexicographically with repeated keys preserving declared item order, header-profile refs sorted lexicographically, Unicode normalized to NFC, and no wall-clock/generated nonce fields inside the canonical body
9. compute `request_body_hash`
10. compute `request_hash`
11. compute `idempotency_key`
12. build `AuthorityRequestEnvelope`
13. run duplicate/pending collision checks
14. attach fraud-prevention header set
15. acquire the exclusive gateway send claim, re-run send-time binding plus duplicate-bucket revalidation against the latest persisted authority truth, persist the resulting `AuthorityBindingDriftSentinelContract` plus `send_revalidation_*` evidence on `AuthorityInteractionRecord`, and block the interaction immediately if the sentinel does not clear the transmit
16. transmit through the controlled gateway

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

### Send-time revalidation rule

If the actual network send is delayed, delegated to a worker, or retried after queue recovery, the
controlled authority gateway SHALL revalidate the bound authority context immediately before bytes
leave the process.

That revalidation SHALL confirm all of the following against the persisted `AuthorityBinding`:

- `authority_link_ref` is still active for the same reporting subject and authority scope
- the usable token version still belongs to the same `binding_lineage_ref`
- the resolved token still binds to the same client/subject/legal scope as the preflighted request
- provider environment and API version still match the sealed request contract
- `access_binding_hash` and `policy_snapshot_hash` still match the executable authorization posture
- any required step-up or approval evidence frozen on the binding is still satisfied and current
- no newer `SubmissionRecord`, `ObligationMirror`, or authenticated `AuthorityIngressReceipt` for the same duplicate meaning has appeared since envelope seal in a way that would make the pending transmit duplicate, stale, or legally ambiguous

The gateway SHALL fail closed if any of those checks fail. It SHALL NOT silently swap to a different
token binding, different authority link, or different subject context after `request_hash` and
`idempotency_key` have been computed.
Replay, recovery, or resumed worker execution SHALL therefore reuse the persisted
`authority_binding_ref` / `binding_lineage_ref` and SHALL NOT resolve a fresh live authority binding
for an already-sealed request identity.
The gateway SHALL persist the grouped outcome of that mandatory revalidation as
`AuthorityInteractionRecord.binding_drift_sentinel_contract{ checked_action_class,
decision_state, checked_at, sealed_token_version_ref, checked_token_version_ref_or_null,
exclusive_send_claim_state, duplicate_truth_inputs_state, latest_submission_record_ref_or_null,
latest_obligation_mirror_ref_or_null, latest_ingress_receipt_ref_or_null,
pass_reason_code_or_null, block_reason_codes[] }` before it transitions to `TRANSMIT_IN_FLIGHT` or
a blocked non-send terminal path. `send_revalidation_state`, `send_revalidated_at`,
`send_authorized_token_version_ref`, and `send_revalidation_reason_codes[]` remain the transmit-only
projection of that grouped sentinel. Lawful within-lineage rotation SHALL therefore serialize as
`decision_state = CLEAR_TO_PROCEED`,
`pass_reason_code_or_null = TOKEN_ROTATED_WITHIN_LINEAGE`,
`send_revalidation_state = CLEAR_TO_SEND`,
`send_revalidation_reason_codes = [TOKEN_ROTATED_WITHIN_LINEAGE]`, and a non-null
`checked_token_version_ref_or_null` / `send_authorized_token_version_ref`; blocked non-sends SHALL
serialize `decision_state = BLOCKED`, keep both checked/send token-version fields null, and
preserve one or more explicit failure reasons.

The exclusive gateway send claim SHALL be a single-writer compare-and-swap on the persisted exchange
identity (`dispatch_ref`, `request_hash`, `duplicate_meaning_key`, and current lifecycle state). If
another worker already owns the claim, if the duplicate bucket changed before bytes left the process,
or if stronger external truth appeared during queue delay, the engine SHALL NOT send. It SHALL
instead persist a named non-send outcome such as `duplicate_bucket_changed_before_send`, route to
reconciliation where applicable, and preserve the aborted send as auditable lineage rather than as a
hidden retry race.

The same grouped sentinel logic SHALL be reused before any live `RECONCILIATION_POLL` or
`RECOVERY_READ`. Those later checks SHALL preserve the same binding identity tuple, the same
duplicate or stronger-truth consultation posture, and the same fail-closed block vocabulary rather
than re-deriving legality from worker-local token state or fresh authority-link lookup.

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

Where a legitimate exemption is serialized, the exemption SHALL remain explicit and SHALL NOT be
backfilled later into a synthetic capture or validation artifact for the same request identity.

## 9.8 Request hashing and idempotency

Every authority attempt SHALL derive:

- `identity_profile_version = AUTHORITY_REQUEST_IDENTITY_V2`
- `executable_scope[] = manifest.scope_execution_binding.executable_scope[]`
- `access_binding_hash = hash(manifest.scope_execution_binding.access_decision | manifest.scope_execution_binding.execution_mode_or_null | ordered(executable_scope[]) | ordered(executable_partition_scope_refs[]) | ordered(masking_rules[]) | ordered(required_approvals[]) | required_authn_level | policy/delegation/authority binding lineage)`
- `normalized_business_partitions = ordered(business_partitions[]) if |business_partitions[]| > 0 else ["<NONE>"]`
- `normalized_obligation_ref = obligation_ref if obligation_ref is present else "<NONE>"`
- `normalized_basis_type = basis_type if basis_type is present else "<NONE>"`
- `canonical_query = stable_query(query_params)` where keys are sorted lexicographically and repeated values preserve declared order
- `canonical_path = stable_path(resource_template, resolved_path_params)` where params are rendered in declared template-segment order
- `request_body_hash = hash(canonical_payload_bytes)`
- `attempt_lineage_manifest_id = root_manifest_id if present else manifest_id`
- `identity_namespace_hash = hash(identity_profile_version | authority_name | authority_product_profile | provider_environment | authority_scope | operation_family | operation_profile | provider_api_version | binding_lineage_ref)`
- `duplicate_meaning_key = hash(identity_profile_version | identity_namespace_hash | tenant_id | client_id | attempt_lineage_manifest_id | normalized_business_partitions | normalized_obligation_ref | normalized_basis_type | http_method | canonical_path | canonical_query | request_body_hash | access_binding_hash)`
- `request_hash = hash(identity_profile_version | identity_namespace_hash | duplicate_meaning_key | ordered(header_profile_refs[]) | token_binding_ref | authority_binding_ref | authority_link_ref | delegation_grant_ref_or_<NONE> | subject_ref | acting_party_ref | policy_snapshot_hash)`
- `idempotency_key = hash(identity_profile_version | duplicate_meaning_key)`

This request-level `idempotency_key` is distinct from the manifest-level `RunManifest.idempotency_key`.
It is derived from the persisted duplicate-meaning bucket so that safe continuation/recovery
manifests may reuse the same authority-attempt identity only when the actual executable meaning is
unchanged. `request_hash` remains the exact sealed-request identity, while `duplicate_meaning_key`
is the retry/reconcile bucket. Lawful token refresh or transport replay under the same frozen access
binding SHALL therefore preserve `duplicate_meaning_key` and `idempotency_key`, while a material
namespace, access-binding, path/query/body, obligation, basis, or lineage change SHALL not silently
collapse into the same bucket.

### Idempotency rule

The same business-meaningful attempt SHALL reuse the same idempotency key. A materially different
request body or materially different executable access binding SHALL never reuse the same idempotency
meaning silently.

### Collision rule

If the same idempotency key appears with a different request-body hash, the protocol SHALL classify the
attempt as `BODY_COLLISION` and `HARD_BLOCK` the transmit step.

If the same `idempotency_key` or `request_hash` is ever observed with a different frozen namespace
tuple (`authority_name`, `authority_product_profile`, `provider_environment`, `authority_scope`,
`operation_family`, `canonical_path`, `binding_lineage_ref`, or `attempt_lineage_manifest_id`), the
protocol SHALL classify the condition as `IDENTITY_NAMESPACE_COLLISION` and `HARD_BLOCK` the transmit
step even when the body hash matches. External side effects SHALL never proceed from a collided
authority namespace.

## 9.9 Response classes

Every authority response SHALL be normalized into one of:

- `ACK_SUCCESS`
- `ACK_ACCEPTED_PENDING`
- `ACK_REJECTED_VALIDATION`
- `ACK_REJECTED_AUTH`
- `ACK_RETRYABLE_FAILURE`
- `ACK_TIMEOUT_OR_NO_RESOLUTION`
- `ACK_EXTERNAL_STATE_DISCOVERED`
- `ACK_AMBIGUOUS_CORRELATION`
- `ACK_INCONSISTENT_STATE`

### Default normalization rules

`ACK_SUCCESS`

- 2xx response with a valid authority reference or valid success contract
- `correlation_status = BOUND`
- `derivation_posture = PRIMARY_OBSERVATION`
- `legal_effect_posture = DIRECT_STATE_MUTATION`
- creates or updates `SubmissionRecord` toward `CONFIRMED` or equivalent success path

`ACK_ACCEPTED_PENDING`

- 2xx/202-style response or accepted transmit where legal confirmation is not yet final
- `correlation_status = BOUND`
- `derivation_posture = PRIMARY_OBSERVATION`
- `legal_effect_posture = DIRECT_STATE_MUTATION`
- creates or updates `SubmissionRecord = PENDING_ACK`

`ACK_REJECTED_VALIDATION`

- 4xx response indicating payload or business validation failure
- `correlation_status = BOUND`
- `derivation_posture = PRIMARY_OBSERVATION`
- `legal_effect_posture = DIRECT_STATE_MUTATION`
- creates `SubmissionRecord = REJECTED`

`ACK_REJECTED_AUTH`

- 401/403 or equivalent authority/authentication failure
- `correlation_status = BOUND`
- `derivation_posture = PRIMARY_OBSERVATION`
- `legal_effect_posture = DIRECT_STATE_MUTATION`
- no legal progression; high-severity audit event

`ACK_RETRYABLE_FAILURE`

- 5xx or equivalent transient provider failure
- `correlation_status = BOUND`
- `derivation_posture = PRIMARY_OBSERVATION`
- `legal_effect_posture = DIRECT_STATE_MUTATION`
- `SubmissionRecord = PENDING_ACK` or `UNKNOWN` depending profile

`ACK_TIMEOUT_OR_NO_RESOLUTION`

- no confirmed authority outcome after transmit ambiguity
- `derivation_posture = TIMEOUT_PLACEHOLDER`
- `legal_effect_posture = PROVISIONAL_STATE_MUTATION`
- `SubmissionRecord = UNKNOWN`

`ACK_EXTERNAL_STATE_DISCOVERED`

- obligations or returned status indicate the authority already holds a relevant legal state not created by the active packet flow
- `correlation_status = BOUND`
- `derivation_posture = PRIMARY_OBSERVATION`
- `legal_effect_posture = DIRECT_STATE_MUTATION`
- `SubmissionRecord = OUT_OF_BAND`

`ACK_AMBIGUOUS_CORRELATION`

- an authenticated provider payload exists, but it cannot be safely bound to exactly one request lineage
- `legal_effect_posture = RECONCILIATION_ONLY`
- SHALL NOT mutate `SubmissionRecord` toward terminal success, pending success, or rejection
- SHALL quarantine or retain reconciliation ownership and set `retry_class` to at least `RECONCILE_THEN_RETRY`

`ACK_INCONSISTENT_STATE`

- an authenticated, bound authority observation conflicts with already persisted authority-grounded evidence for the same exact legal meaning
- `correlation_status in {BOUND, BOUND_WITH_AUTHORITY_REFERENCE_ONLY}`, but
  `BOUND_WITH_AUTHORITY_REFERENCE_ONLY` SHALL remain reconciliation-owned and SHALL NOT directly
  advance terminal or pending-success legal state
- `derivation_posture = CONFLICTING_OBSERVATION`
- `legal_effect_posture = RECONCILIATION_ONLY`
- SHALL NOT resolve by last-writer-wins, local optimism, or UI recency
- SHALL enter quantitative reconciliation before any terminal legal-state mutation

### 9.9B Multi-source response merge protocol

After one response observation is normalized, the protocol SHALL merge it into the interaction’s
response history before any downstream state mutation.

That merge step SHALL:

1. append the new `response_id` into `AuthorityInteractionRecord.response_history_ids[]`;
2. compare the new observation against the current `active_response_id`, if any, using response
   class, correlation posture, source family, authority reference, and other frozen request-lineage
   identity;
3. classify the new observation as exactly one of:
   `PRIMARY_OBSERVATION`, `CORROBORATING_OBSERVATION`, `SUPERSEDES_TIMEOUT_PLACEHOLDER`,
   `CONFLICTING_OBSERVATION`, or `TIMEOUT_PLACEHOLDER`;
4. preserve the lineage to earlier observations by populating `corroborates_response_ids[]`,
   `supersedes_response_id`, `conflicting_response_ids[]`, and `recovery_basis_response_id` as
   applicable instead of discarding the prior source context; and
5. update `AuthorityInteractionRecord.meaning_resolution_state` and `active_response_id` only when
   the resulting legal-effect posture is explicitly admissible.

Specific source-handling rules:

- a callback or poll observation that confirms the same already-admissible meaning SHALL normalize as
  `CORROBORATING_OBSERVATION`, SHALL retain `legal_effect_posture = NO_STATE_MUTATION`, and SHALL
  NOT produce a second legal-state mutation;
- a later callback, poll, or recovery read that would replace `ACK_TIMEOUT_OR_NO_RESOLUTION` SHALL
  normalize as `SUPERSEDES_TIMEOUT_PLACEHOLDER`, SHALL preserve the earlier timeout lineage via
  `supersedes_response_id`, and SHALL require explicit reconciliation before changing legal truth;
- `RECOVERY_READ` SHALL always retain `recovery_basis_response_id` pointing at the unresolved prior
  response or timeout that triggered the recovery attempt, so a later direct read is never treated as
  an uncontextualized fresh success;
- if two source families describe incompatible authority meaning for the same exact interaction, the
  later observation SHALL normalize as `CONFLICTING_OBSERVATION`,
  `AuthorityInteractionRecord.meaning_resolution_state` SHALL become `RECONCILIATION_REQUIRED`, and
  the protocol SHALL not silently choose the fresher or “stronger-looking” source.

## 9.9A Inbound authority ingress protocol

Any callback, poll result, inbox delivery, or worker-observed provider payload SHALL enter through an
authority-specific ingress checkpoint before response normalization or state mutation.

That ingress checkpoint SHALL:

1. authenticate the provider channel using the frozen provider profile, including signed-callback,
   mTLS, allowlisted source, or equivalent ingress policy as applicable;
2. compute a deterministic delivery dedupe identity from `provider_delivery_ref`,
   `response_body_hash`, and `ingress_channel_metadata_hash`, and use that same
   `delivery_dedupe_key` across callback, poll, and recovery ingestion of the same provider-visible
   delivery;
3. bind the payload to the expected request lineage using multiple frozen keys. `correlation_status
   = BOUND` SHALL require either an exact `request_hash` match or an exact
   `(idempotency_key, duplicate_meaning_key, identity_namespace_hash)` tuple that converges with
   `authority_reference` on one persisted `bound_interaction_ref`; a lone `authority_reference`
   match SHALL serialize only as `BOUND_WITH_AUTHORITY_REFERENCE_ONLY` and SHALL NOT be promoted to
   `BOUND`;
4. persist an `AuthorityIngressReceipt` before mutating `SubmissionRecord`, `ObligationMirror`, or
   user-visible truth, with `canonical_ingress_receipt_ref = null` on the first-seen delivery and
   `reconciliation_owner_ref` populated whenever quarantine ownership is opened, plus a durable
   `response_body_ref` and one `authority_ingress_correlation_contract{...}` capturing the
   extracted provider-visible identity claims and compared request-lineage candidates;
5. if the same `delivery_dedupe_key` was already checkpointed, persist a second
   `AuthorityIngressReceipt` with `receipt_state = DUPLICATE_SUPPRESSED`,
   `canonical_ingress_receipt_ref` pointing at the first-seen receipt, and no new normalized
   response ref or legal-state mutation; and
6. quarantine the first-seen payload, emit a high-severity audit event, and open explicit
   reconciliation ownership if channel authentication fails or
   `correlation_status in {BOUND_WITH_AUTHORITY_REFERENCE_ONLY, AMBIGUOUS, UNBOUND}`.

No provider-originated payload SHALL update legal posture directly from transport memory alone.
No asynchronous `AuthorityResponseEnvelope` SHALL be materialized unless the canonical
`AuthorityIngressReceipt` is already durable and the normalized response retains that
`ingress_receipt_ref`.

That persisted checkpoint SHALL validate against `schemas/authority_ingress_receipt.schema.json` so
authenticated-channel state, provider-delivery dedupe identity, request-lineage correlation, and
quarantine posture remain durable and machine-checkable. `receipt_state` SHALL therefore distinguish
first-seen persisted ingress, strong-bound normalized ingress, reconciliation-owned quarantines, and
duplicate-suppressed deliveries that point back to one canonical receipt instead of creating a
second mutation opportunity. `AuthorityIngressReceipt` is checkpoint truth only. It SHALL bind
`authority_ingress_proof_contract{ authenticated_channel_state, authentication_evidence_modes[],
delivery_identity_basis, lineage_binding_basis, canonical_ingress_receipt_ref_or_null,
request_lineage_proof_hash_or_null, mutation_gate_state, ... }`,
`authority_ingress_correlation_contract{ comparison_set_state, resolution_state,
extracted_*_or_null, candidate_lineages[], ... }`, and
`authority_truth_contract{ boundary_scope = AUTHORITY_INGRESS_RECEIPT, truth_surface_role =
AUTHORITY_INGRESS_CHECKPOINT, ... }`, and no internal workflow, portal projection, override,
accepted-risk note, or ingress-normalization shortcut may treat that checkpoint as confirmed legal
settlement before validated authority evidence updates `SubmissionRecord`.

An integration-facing investigation read model MAY project persisted ingress receipts into
`AuthorityIngressInvestigationSnapshot`, but that snapshot SHALL remain read-side only. It SHALL use
only the persisted receipt, `response_body_ref`, `authority_ingress_proof_contract{...}`,
`authority_ingress_correlation_contract{...}`, duplicate lineage, and append-only audit refs to
explain quarantine or duplicate suppression. It SHALL publish only non-mutating next actions such as
candidate-lineage comparison, reconciliation handoff, authentication-evidence review, canonical
duplicate review, or escalation, and it SHALL NOT mutate legal state directly from that
investigation surface.

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
- leave `reconciliation_deadline_at` populated once a `SubmissionRecord` reaches
  `CONFIRMED`, `REJECTED`, `OUT_OF_BAND`, or `SUPERSEDED`
- write `REJECTED` without a retained `authority_evidence_ref`
- persist a non-null `baseline_type` on transmit, pending-ack, rejected, or unknown submission states;
  only authority-grounded or external legal-state postures may carry baseline classification
- mutate `SubmissionRecord`, `ObligationMirror`, or any user-visible legal-state projection directly
  from callback, poll, or recovery transport memory before an authenticated
  `AuthorityIngressReceipt` is durably persisted and correlated
- persist request-backed `SubmissionRecord` or `ObligationMirror` authority-state changes without the
  bound `authority_ingress_proof_contract{...}` that names the canonical ingress receipt, exact
  lineage proof, and mutation-gate posture authorizing that mutation
- treat override, accepted-risk, workflow completion, or customer reassurance as a substitute for
  authority confirmation

`SubmissionRecord` is the only durable authority-settlement ledger in this flow. `ObligationMirror`,
`WorkflowItem`, and `ClientTimelineEvent` SHALL remain subordinate internal or customer-safe
projections with explicit typed authority posture rather than inferred confirmation.

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

Define the mutation-capable calculation handshake digest:

- `calculation_handshake_hash = hash(calculation_id | calculation_hash | calculation_basis_hash | user_confirmation_ref_or_<NONE> | authority_scope | provider_environment | operation_profile_ref | access_binding_hash | baseline_hash_or_<NONE>)`

Any filing-capable or amendment-capable transmit that depends on a calculation SHALL recompute and
verify `calculation_handshake_hash` immediately before packet build and again at send-time. If any
input term changes between retrieve, confirm, packet approval, or transmit, the handshake is stale:
the engine SHALL fail closed, supersede the readiness context, and require a fresh retrieve/confirm
cycle rather than silently reusing the older calculation basis.

These refs SHALL point to first-class calculation artifacts that validate against:

- `schemas/authority_calculation_request.schema.json`
- `schemas/authority_calculation_result.schema.json`
- `schemas/calculation_basis.schema.json`
- `schemas/calculation_user_confirmation.schema.json`
- `schemas/authority_calculation_readiness_context.schema.json`

For end-of-year final-declaration journeys, these fields SHALL be persisted on a `FilingCase` or
equivalent first-class artifact before filing-packet build, workflow closure, or terminal run
outcomes rely on them.

Where the persisted artifact is a `FilingCase`, it SHALL validate against
`schemas/filing_case.schema.json`.

For amendment journeys, these fields SHALL be persisted on an `AmendmentCase` or equivalent first-class
artifact before packet build, workflow closure, or terminal run outcomes rely on them.

## 9.12 Duplicate and pending-state rules

Before transmit, the protocol SHALL search for existing `SubmissionRecord`s for the same:

- client
- authority product profile
- provider environment
- authority scope
- business partition
- period
- obligation
- operation family
- basis type
- attempt lineage manifest

Duplicate meaning SHALL be keyed from the same frozen dimensions that feed authority-attempt
identity. The protocol SHALL use persisted `duplicate_meaning_key` for duplicate suppression and
resend-vs-reconcile decisions, `request_hash` for exact sealed-request reuse and collision
forensics, and `identity_namespace_hash` for cross-namespace collision blocking. It SHALL never
collapse sandbox and production, original and amendment-intent, or distinct basis-specific
submissions into the same duplicate bucket merely because a higher-level route looked similar.
Release-facing authority sandbox evidence SHALL prove that same namespace isolation through one
candidate-bound `authority_sandbox_coverage_contract{...}` tied to the exercised request envelopes,
bindings, interactions, and ingress receipts; sandbox reachability without that lineage is not
promotion-grade evidence.
The initial `SubmissionRecord` in `INTENT_RECORDED` SHALL already retain the exact `packet_ref`,
`request_envelope_ref`, `request_hash`, `idempotency_key`, `identity_namespace_hash`,
`duplicate_meaning_key`, `request_identity_contract{...}`, `proof_bundle_ref`, and
`proof_bundle_hash` that the duplicate and recovery path is reasoning about; the protocol SHALL NOT
backfill proof-bundle lineage or grouped request identity only after send-time. `OUT_OF_BAND` is
the only settlement posture allowed to clear the grouped request-identity contract later.

### Duplicate handling

- existing `CONFIRMED` + same meaning + current transmit is not an eligible amendment progression
  -> block duplicate submission
- existing `CONFIRMED` + current transmit is an eligible amendment progression
  (authorized `runtime_scope[]` contains `amendment_submit` and `AmendmentCase.lifecycle_state = READY_TO_AMEND`)
  -> allow amendment-safe progression rather than original-return duplicate block
- existing `PENDING_ACK` or `UNKNOWN`, or an open `AuthorityInteractionRecord` with
  `resend_legality_state in {FOLLOW_UP_READ_ONLY, BLOCKED_BY_RECONCILIATION, BLOCKED_BY_ESCALATION}`
  -> route to reconciliation, not blind resend
- existing identical packet + safe retry profile -> idempotent recovery permitted
- existing out-of-band legal state -> create reconciliation workflow, not direct overwrite
- any attempted resend after binding-lineage change or after `BODY_COLLISION` detection -> hard block

## 9.13 Reconciliation protocol

The protocol SHALL support a read-after-write or read-after-timeout reconciliation loop.

`SubmissionRecord` and `ObligationMirror` in this section SHALL validate against
`schemas/submission_record.schema.json` and `schemas/obligation_mirror.schema.json`.

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

`RECONCILE_AUTHORITY_STATE(...)` SHALL also preserve the split between
`ObligationMirror.current_submission_ref` and `ObligationMirror.last_confirmed_submission_ref`:
pending packet lineage SHALL stay current-only, while confirmed legal settlement SHALL move only the
confirmed pointer. When later authority evidence corrects or contradicts earlier posture, the
reconciliation result SHALL reopen downstream mirror, workflow, and customer-safe projection state
rather than leaving a previously resolved internal conclusion in place.

In the HMRC embodiment, obligations and final-declaration states are retrievable through the
Obligations API, and year-end amendment eligibility also depends on authority-recognised final
declaration state. [3]

## 9.13A Reconciliation budget and escalation rule

Every `AuthorityOperationProfile` SHALL define:

- a deterministic reconciliation cadence
- `max_auto_reconciliation_attempts`
- a visible `reconciliation_deadline_at` derivation rule
- escalation ownership and workflow policy for unresolved cases

Every `AuthorityInteractionRecord` SHALL then freeze the active runtime projection of that profile:

- `authority_operation_profile_ref`
- `reconciliation_method`
- `max_auto_reconciliation_attempts`
- `reconciliation_cadence_seconds`
- `reconciliation_budget_state`
- `next_reconciliation_at`
- `reconciliation_escalated_at`
- `reconciliation_workflow_item_ref`
- `resend_legality_state`
- `resend_control_reason_codes[]`
- `reconciliation_control_contract{ contract_version, binding_scope_class, control_contract_hash,
  authority_truth_state, reconciliation_method, reconciliation_budget_state,
  reconciliation_attempt_count, attempts_remaining_count, unresolved_authority_posture,
  resend_legality_state, replay_resume_policy, escalation_state, escalation_owner_ref_or_null,
  escalation_workflow_item_ref_or_null, escalation_evidence_refs[], outcome_class_for_analytics }`

For automatic reconciliation attempt index `k >= 1` counted from the first post-response follow-up
check, define:

- `beta = 1.6`
- `j_k = ((u64(hash(idempotency_key | "|reconcile|" | k)) mod 2001) - 1000) / 10000`, giving a deterministic jitter in `[-0.10, +0.10]`
- `raw_delay_k = cadence_seconds * beta^(k-1) * (1 + j_k)`
- `remaining_window_k = max(0, reconciliation_deadline_at - now)` in seconds
- `delay_k = floor(min(max(cadence_seconds, raw_delay_k), remaining_window_k))`
- `next_reconciliation_at = now + delay_k seconds`
- `auto_budget_open = 1` iff `k <= max_auto_reconciliation_attempts` and `remaining_window_k > 0`, else `0`

The jitter term is deterministic per exchange and attempt index so fleet-level retries spread without
breaking replay reproducibility. Automatic resend of mutation-capable packets SHALL additionally
require unchanged binding lineage, unchanged idempotency scope, zero collision flags, and sufficiently
low unresolved external ambiguity from the latest authority-grounded observations.

While the profile-defined reconciliation budget remains open, the protocol MAY continue bounded
read-after-write or read-after-timeout checks without emitting a duplicate mutation send. The
interaction SHALL persist `reconciliation_budget_state = ACTIVE`,
`resend_legality_state = FOLLOW_UP_READ_ONLY`, and a non-null `next_reconciliation_at`; duplicate
suppression, recovery, queue rebuild, and replay SHALL all treat that persisted state as the only
authority for whether a follow-up read is still legal.

Once bytes have left the process but no provider response is yet durable, the interaction SHALL
persist `resend_legality_state = IDEMPOTENT_RECOVERY_ONLY`; crash recovery, broker replay, or stale
worker reclaim MAY reuse the existing request lineage for exact idempotent recovery, but SHALL NOT
emit a fresh mutation packet under the guise of recovery.

Once the automatic budget is exhausted or mutually inconsistent provider evidence persists past
`reconciliation_deadline_at`, the protocol SHALL:

- stop blind automatic resend
- persist `reconciliation_budget_state = EXHAUSTED` or `ESCALATED`
- transition the exchange into an escalated reconciliation posture
- persist or update a workflow item owned by the configured escalation path
- persist `resend_legality_state = BLOCKED_BY_RECONCILIATION` or `BLOCKED_BY_ESCALATION` together
  with one or more `resend_control_reason_codes[]` naming budget exhaustion, deadline expiry,
  contradictory authority evidence, out-of-band state, duplicate-bucket occupancy, or stronger
  external truth
- preserve the most defensible legal state as `PENDING_ACK` or `UNKNOWN` based on the last
  authority-grounded evidence, never by operator optimism
- emit `AuthorityReconciliationEscalated`

Restore, replay, or continuation flows SHALL resume from the persisted reconciliation budget and
deadline; they SHALL NOT silently reset the escalation clock, the attempt count, the next
follow-up time, or the resend-block posture. That resume boundary SHALL be taken from the persisted
`reconciliation_control_contract{...}` copied onto `AuthorityInteractionRecord`, unresolved
`SubmissionRecord`, and unresolved `ObligationMirror`; recovery SHALL reuse the grouped control
packet rather than reconstructing budget, ambiguity, resend legality, or escalation posture from
queue timers, profile defaults, or transport retry logs.

`AuthorityReconciliationAnalyticsSnapshot` SHALL derive tuning and escalation economics only from
those persisted grouped control contracts plus the referenced interaction lineage. Retry-worker
telemetry, broker redelivery counts, or ephemeral retry backoff state MAY support debugging, but
they SHALL NOT act as authority for budget exhaustion, ambiguity counts, escalation latency, or
replay-resume analytics.

## 9.13B Quantitative reconciliation confidence and ambiguity

Let `X = {CONFIRMED, REJECTED, PENDING_ACK, OUT_OF_BAND}` and let `O` be the lineage-deduplicated set
of admissible authority-grounded observations for the exact legal meaning in scope. For each
observation `o in O`, define:

- `src_rel_o in (0,1]` from the frozen authority-state weighting policy for that source family
- `corr_o = 1` if `correlation_status = BOUND`, `0.70` if `BOUND_WITH_AUTHORITY_REFERENCE_ONLY`, `0.20` if `AMBIGUOUS`, and `0` if `UNBOUND`
- `fresh_o = exp(-ln(2) * age_seconds(o) / half_life_seconds(source_class(o)))`
- `clarity_o = 1` for an explicit terminal authority state, `0.75` for an explicit pending/accepted state, and `0.50` for an inferred status-only observation
- `w_o = src_rel_o * corr_o * fresh_o * clarity_o`

Then compute:

- `W = Σ(w_o)`
- `p_x = 0` if `W = 0`, else `Σ(w_o * 1[state(o) = x]) / W` for each `x in X`
- `reconciliation_confidence = max_x p_x`
- `state_margin = p_(1) - p_(2)` where `p_(1)` and `p_(2)` are the two largest state probabilities
- `external_truth_ambiguity = 1` if `W = 0`, else `-Σ_x p_x * ln(max(p_x, 1e-9)) / ln(|X|)`

A terminal reconciliation outcome may be emitted only if all of the following are true:

- `reconciliation_confidence >= 0.85`
- `external_truth_ambiguity <= 0.35`
- `state_margin >= 0.20`
- no `BODY_COLLISION` or `IDENTITY_NAMESPACE_COLLISION` is open for the same exact meaning
- no authenticated ambiguous/unbound ingress payload remains unresolved for the same exact meaning

If the winning state is `PENDING_ACK` and `auto_budget_open = 1`, the protocol SHALL emit
`RECONCILED_STILL_PENDING`. Otherwise the exchange SHALL remain `RECONCILED_UNRESOLVED` or escalate;
it SHALL not guess a terminal legal state from weak, stale, or contradictory external truth.

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
- `AuthorityReconciliationEscalated` when the automatic budget is exhausted without a defensible
  terminal resolution

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

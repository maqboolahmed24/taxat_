# Observability and Audit Contract

## Observability and audit contract

The engine SHALL separate operational telemetry from audit evidence, while still correlating them
through shared identifiers. Audit exists to prove what happened. Observability exists to understand how
and why it happened in runtime. They are related, but they are not the same artifact class.

This split matters because OpenTelemetry models observability through traces, metrics, and logs, with
resource and context propagation allowing correlation across services and signals, while OWASP guidance
on logging emphasizes secure, structured, security-relevant application logging. [1]

## 14.1 Purpose

The observability and audit contract SHALL ensure that the engine can answer all of the following:

1. What happened in the run?
2. In what order did it happen?
3. Which service, principal, and manifest caused it?
4. Which telemetry proves runtime behavior?
5. Which audit events prove compliance-significant decisions?
6. Can a reviewer reconstruct a filing or amendment episode end to end?

## 14.2 Separation of concerns

### A. Audit evidence

Audit evidence SHALL be:

- append-only
- legally or operationally significant
- minimally editable
- durable
- explainability-oriented

### B. Operational telemetry

Operational telemetry SHALL be:

- runtime-oriented
- high-volume
- potentially sampled
- performance/reliability-oriented
- correlation-capable

### C. Security telemetry

Security telemetry SHALL focus on:

- access decisions
- privilege changes
- step-up events
- suspicious binding mismatches
- export attempts
- session anomalies

### D. Privacy telemetry

Privacy telemetry SHALL focus on:

- data-access to sensitive views
- masking actions
- erasure requests
- legal-hold transitions
- export/delete operations

## 14.3 Signal model

The engine SHALL emit at minimum these signal families:

- `TRACES`
- `METRICS`
- `LOGS`
- `AUDIT_EVENTS`

OpenTelemetry's current model explicitly defines traces, metrics, and logs as primary telemetry
signals, with context propagation allowing them to be correlated across processes and services. [1]

## 14.4 Mandatory correlation keys

Every trace span, metric event, log record, and audit event SHALL carry as many of the following as
are applicable:

- `tenant_id`
- `client_id`
- `manifest_id`
- `root_manifest_id`
- `parent_manifest_id`
- `continuation_of_manifest_id`
- `replay_of_manifest_id`
- `nightly_batch_run_ref`
- `nightly_window_key`
- `selection_disposition`
- `trace_id`
- `span_id`
- `run_kind`
- `mode`
- `replay_class`
- `comparison_mode`
- `basis_validation_state`
- `idempotency_key`
- `request_hash`
- `identity_namespace_hash`
- `duplicate_meaning_key`
- `access_binding_hash`
- `policy_snapshot_hash`
- `authority_binding_ref`
- `authority_link_ref`
- `delegation_grant_ref`
- `continuation_basis`
- `input_inheritance_mode`
- `config_freeze_id`
- `config_inheritance_mode`
- `manifest_lineage_trace_ref`
- `manifest_branch_decision{ branch_action, idempotency_key, selected_manifest_continuation_basis, prior_manifest_id_or_null, prior_manifest_hash_at_decision_or_null, prior_manifest_lifecycle_state_or_null, root_manifest_id, parent_manifest_id_or_null, continuation_of_manifest_id_or_null, replay_of_manifest_id_or_null, supersedes_manifest_id_or_null, selected_manifest_generation, config_inheritance_mode_or_null, input_inheritance_mode_or_null, returned_decision_bundle_hash_or_null }`
- `gate_code`
- `workflow_item_id`
- `task_id`
- `investigation_id`
- `compensation_id`
- `accepted_risk_approval_id`
- `submission_record_id`
- `authority_operation_id`
- `error_id`
- `retention_class`
- `service_name`
- `environment_ref`
- `code_build_id`
- `expected_execution_basis_hash`
- `actual_execution_basis_hash`
- `expected_deterministic_outcome_hash`
- `actual_deterministic_outcome_hash`

### Correlation rule

No compliance-significant event may be emitted without a path back to either a `manifest_id`, a
`submission_record_id`, an `authority_operation_id`, or, for nightly control-plane events that
precede per-client manifest allocation, a frozen `nightly_batch_run_ref` + `nightly_window_key`
pair that durably binds the batch back to its selected manifest set.

### Lineage correlation rule

Any event that allocates, reuses, continues, replays, recovers, or reconfigures manifest context
SHALL carry enough lineage keys to replay the exact branch decision without dereferencing an
out-of-band side table. At minimum, such events SHALL include the applicable prior/parent/root
manifest refs plus `idempotency_key`, `request_hash`, `identity_namespace_hash`,
`duplicate_meaning_key`, `continuation_basis`, `access_binding_hash`, `policy_snapshot_hash`,
`authority_binding_ref` where authority execution lineage exists, and `manifest_branch_decision{...}`.
Branch-selection spans and audit events SHALL also carry `manifest_lineage_trace_ref` so the
request-time explorer artifact, selected manifest, and event narrative remain explicitly linked.
`config_inheritance_mode` and `input_inheritance_mode` SHALL be present whenever child-allocation
legality depended on inherited versus freshly resolved config/input basis.

## 14.5 Audit event contract

Each `AuditEvent` SHALL include:

- `audit_event_id`
- `event_type`
- `event_time`
- `recorded_at`
- `audit_stream_ref`
- `stream_sequence`
- `tenant_id`
- `client_id`
- `manifest_id`
- `actor_ref`
- `service_ref`
- `object_refs[]`
- `reason_codes[]`
- `event_payload_hash`
- `prev_event_hash` where hash chaining is enabled
- `visibility_class`
- `retention_class`
- `signature_ref` or integrity proof ref where applicable
- `retention_limited_explainability_contract{{...}}`
- `retained_context{{payload_availability_state, audit_sufficiency_state, payload_expiry_at_or_null, lineage_refs[], limitation_reason_codes[]}}`

At least one of `actor_ref` or `service_ref` SHALL be populated on every audit event. When
`correlation_context` repeats `tenant_id`, `client_id`, or `manifest_id`, those values SHALL mirror
the top-level event identity exactly rather than introducing a competing correlation identity.
`OutOfBandStateObserved` SHALL carry `submission_record_id` correlation because it is a
submission-lineage reconciliation event, not a free-floating observation. If a payload body ages out,
the audit event SHALL still retain object refs, reason codes, event payload hash, and lineage refs
so compliance-significant reconstruction remains possible.

### Deterministic ordering rule

`event_time` is the semantic time of the underlying occurrence and MAY originate from an external
authority, provider, or client clock. `recorded_at` is the durable append time assigned when the
engine commits the audit event.

Canonical audit order SHALL be derived from `audit_stream_ref` + `stream_sequence`, not from raw wall
clock time. `prev_event_hash`, when used, SHALL point to the immediately previous event in the same
audit stream. Query surfaces that merge multiple streams SHALL use `recorded_at` and then
`audit_stream_ref` + `stream_sequence` as the stable merge key. No audit surface may rely on
`event_time` alone for total ordering.

### Event integrity option

The engine SHOULD support tamper-evident audit streams through:

- event hashing
- chained hashes
- or signed event batches

This is a design requirement, not a dependency on any one storage product.

## 14.6 Required audit event families

The engine SHALL emit structured audit events at minimum for the following families.

### A. Identity and authority

- `PrincipalAuthenticated`
- `StepUpRequired`
- `StepUpSatisfied`
- `AuthorityLinked`
- `AuthorityRelinked`
- `AuthorityBindingMismatchDetected`

`AuthorityBindingMismatchDetected` SHALL carry the frozen `authority_binding_ref`,
`authority_link_ref`, `delegation_grant_ref_or_null`, `access_binding_hash`, `policy_snapshot_hash`,
typed `delegation_state`, typed `authority_link_state`, and the exact blocked/mismatch reason codes
so token/client mismatch, missing delegation, stale authority links, and partition narrowing drift do
not collapse into generic transport failure telemetry.

### A1. Idempotency, reuse, and continuation

- `AccessScopeBound`
- `ExistingDecisionBundleReturned`
- `ManifestContextReused`
- `ContinuationChildAllocated`
- `ConfigInheritanceResolved`

These events SHALL carry the lineage and branch-discriminating keys needed to distinguish idempotent
bundle return, same-manifest reuse, replay, recovery, amendment continuation, and fresh-child
continuation.

`ConfigInheritanceResolved` SHALL additionally carry `config_inheritance_mode`,
`config_resolution_basis`, `config_surface_hash`, `source_config_freeze_ref_or_null`, and
`config_consumption_mode` so telemetry can distinguish fresh request resolution from replay-exact,
recovery-exact, or historical explicit frozen reuse.

### B. Manifest lifecycle

- `ManifestAllocated`
- `ManifestFrozen`
- `ManifestSealed`
- `RunStarted`
- `RunStartClaimRejected`
- `ManifestFailed`
- `ManifestBlocked`
- `ManifestCompleted`
- `ManifestSuperseded`

`RunStartClaimRejected` SHALL carry the rejected `manifest_start_claim{ claim_state,
claim_status_code, stale_reclaim_reason_code_or_null, claim_release_reason_code_or_null }` posture
plus typed `reason_codes[]` so active-lease conflicts, stale-reclaim requirements, and
already-terminal reuse outcomes remain distinguishable in audit and telemetry.
`ManifestBlocked` and `ManifestFailed` SHALL additionally retain non-empty `reason_codes[]` plus
`correlation_context.error_id` so invariant-triggered terminal posture remains explainable without
log reconstruction. `ReplayBasisCorruptionDetected` SHALL also retain non-empty `reason_codes[]`
when basis integrity fails closed.

### B1. Nightly scheduler and portfolio autopilot

- `NightlyBatchAllocated`
- `NightlyPortfolioSelected`
- `NightlyClientExecutionDispatched`
- `NightlyClientExecutionDeferred`
- `NightlyClientExecutionSkipped`
- `NightlyClientExecutionEscalated`
- `NightlyBatchShardClaimed`
- `NightlyBatchShardReclaimed`
- `NightlyBatchQuiesced`
- `NightlyBatchCompleted`
- `NightlyBatchAbandoned`
- `OperatorMorningDigestPublished`

These events SHALL carry `nightly_batch_run_ref`, `nightly_window_key`,
`selection_disposition`, and client/manifest lineage keys where applicable so overnight portfolio
behavior can be reconstructed without inferring scheduler intent from queue side effects or worker
logs.

### C. Data and evidence

- `SourceCollectionStarted`
- `SourceCollectionCompleted`
- `SnapshotBuilt`
- `SnapshotValidated`
- `FactPromoted`
- `ConflictRecorded`

### D. Decisioning

- `GateEvaluated`
- `ComputeCompleted`
- `ParityEvaluated`
- `TrustSynthesized`
- `GraphBuilt`
- `TwinBuilt`

### E. Workflow and overrides

- `WorkflowOpened`
- `WorkflowResolved`
- `OverrideRequested`
- `OverrideApproved`
- `OverrideRejected`
- `OverrideExpired`

### F. Filing and authority interaction

- `FilingPacketPrepared`
- `SubmissionAttempted`
- `AuthorityOperationPlanned`
- `AuthorityRequestBuilt`
- `AuthorityRequestSent`
- `AuthorityResponseReceived`
- `AuthorityStatusNormalized`
- `AuthorityReconciliationAttempted`
- `AuthorityReconciliationResolved`
- `SubmissionReconciled`
- `SubmissionConfirmed`
- `SubmissionRejected`
- `SubmissionUnknown`
- `OutOfBandStateObserved`

Submission outcome events SHALL be derived from normalized/reconciled authority state, not from request
dispatch alone.

### G. Drift and amendment

- `BaselineSelected`
- `DriftDetected`
- `DriftClassified`
- `AmendmentEligibilityEvaluated`
- `IntentToAmendTriggered`
- `IntentToAmendValidated`
- `AmendmentSubmitted`
- `AmendmentConfirmed`
- `AuthorityCorrectionObserved`

### H. Retention and privacy

- `RetentionApplied`
- `RetentionLimited`
- `LegalHoldApplied`
- `LegalHoldReleased`
- `ErasureRequested`
- `ErasureCompleted`
- `SensitiveViewOpened`
- `MaskedExportProduced`

### I. Platform release, migration, and resilience

- `BuildAttested`
- `ReleaseCanaryStarted`
- `ReleasePromoted`
- `ReleaseRolledBack`
- `SchemaMigrationPlanned`
- `SchemaMigrationApplied`
- `SchemaMigrationVerified`
- `SecretRotated`
- `BackupCreated`
- `RestoreDrillExecuted`
- `DisasterRecoveryFailedOver`
- `DisasterRecoveryFailedBack`

### J. Error and remediation

- `ErrorRecorded`
- `RemediationOpened`
- `RemediationCompleted`
- `CompensationApplied`
- `CompensationVerified`

`RemediationOpened` and `RemediationCompleted` SHALL retain both `error_id` and `task_id`
correlation. `CompensationApplied` and `CompensationVerified` SHALL retain both `error_id` and
`compensation_id` correlation. The audit trail SHALL therefore identify the exact failure-control
artifact that changed, not only the parent error that originally opened the branch.
`ErrorRecorded` SHALL retain non-empty `reason_codes[]` plus `correlation_context.error_id` so
family-specific invariant failures remain typed in the audit layer, not only in the error object.

## 14.7 Trace contract

A compliance-capable run SHALL create a top-level trace rooted at `manifest_id`, with child spans for
at least:

- prior-manifest context load
- reuse / continuation decision
- config resolve or config inheritance decision
- existing decision-bundle reload when returned idempotently
- manifest freeze
- source collection
- snapshot build
- compute
- parity
- trust
- graph build
- filing packet build
- authority request build
- authority transmit
- authority reconcile
- drift detect
- amendment evaluate
- retention apply
- erasure execute

`RUN_ROOT` spans for `run_kind = NIGHTLY` SHALL carry `nightly_batch_run_ref` and
`nightly_window_key`. `RUN_ROOT` spans for `run_kind = REPLAY` SHALL carry `replay_class`.
`REUSE_CONTINUATION_DECISION` and `CONFIG_RESOLVE_OR_INHERITANCE_DECISION` spans SHALL carry
`access_binding_hash` because branch explanation is not replay-safe without the exact access basis
that influenced the decision.

OpenTelemetry's trace model is designed to represent the path of a request through an application and
to preserve structure and context across service boundaries. [2]

## 14.8 Metric contract

The engine SHALL emit at minimum these metric families.

### Reliability metrics

- run success/failure rate
- nightly batch completed / completed-with-failures / failed rate
- authority request success/reject/unknown rates
- reconciliation resolution rate
- amendment success/reject rate
- experience-stream resume success/rebase rate
- stale-view conflict rate
- release canary abort rate
- migration success/failure rate
- restore-drill success rate and age

### Quality metrics

- completeness score distribution
- data quality score distribution
- parity classification distribution
- trust-band distribution
- graph critical-path coverage distribution

### Operational metrics

- module latency
- queue delay
- operator digest publish latency
- nightly batch outcome rate
- nightly selection disposition count
- nightly selection count / defer count / skip count / escalation count
- stale-batch or stale-shard reclaim count
- retry volume
- duplicate-suppression volume
- reconciliation budget exhaustion rate
- resend refusal reason distribution
- reconciliation escalation latency distribution
- reconciliation replay-resume count
- unresolved authority ambiguity count
- retention-limitation volume
- erasure throughput
- stream heartbeat lag
- outbox backlog age
- inbox dedupe hit rate
- secret-rotation lag
- backup freshness by recovery tier

### Security/privacy metrics

- step-up events
- access denials
- masked vs full sensitive views
- export attempts
- legal-hold blocks
- erasure blocks
- CSRF rejection rate
- session revocations
- egress-policy violations
- signed-build verification failures

### Client-surface telemetry rules

Client-surface telemetry MAY emit shell-family codes, route-family codes, module codes, posture codes, action codes, resume or rebase outcomes, performance timings, accessibility-preference flags, and opaque object refs.
It SHALL NOT emit or derive from:

- free-form message bodies, declaration text, evidence text, audit-body content, or uploaded document text
- masked values or raw personal, tax, authority, health, or PHI-class content
- rendered screenshots, DOM snapshots of regulated surfaces, clipboard contents, or keystroke streams
- hidden internal-thread content, approval rationale, or secrets/tokens

When client-side analytics, crash capture, or replay tooling is used, it SHALL be redaction-safe by construction. If equivalent redaction cannot be proven for a surface, that capture mode SHALL be disabled on that surface.

## 14.9 Logging contract

Application logs SHALL be structured. Each log record SHALL include at minimum:

- immutable log-record identity
- timestamp
- severity
- log family
- access tier
- retention class
- service name
- environment
- event code
- correlation keys
- message template
- structured fields map

The log layer SHALL avoid:

- raw secrets
- full tokens
- unnecessary personal-data duplication
- unsafe raw payload dumping into general logs

Additional log rules:

- warning-or-higher logs SHALL carry structured fields and enough correlation to join back to the
  affected manifest, submission, authority operation, or workflow item when such operational impact exists
- error and fatal logs SHALL carry `error_id`
- session/access/authority-edge security logs SHALL be access-restricted more tightly than generic
  runtime logs, and privacy/retention logs SHALL remain separately restricted from routine operations views
- client-side error and interaction logs SHALL prefer shell/route/module codes, posture codes, opaque refs, and typed recovery identifiers over copied UI text or payload fragments
- client-side logging and crash capture SHALL not serialize masked fields, declaration text, evidence excerpts, document filenames when policy treats them as sensitive, or DOM/screenshot payloads from regulated surfaces

OWASP's logging guidance is specifically about building application logging mechanisms, especially for
security logging, and OWASP's session guidance specifically recommends logging session lifecycle events
such as creation, renewal, destruction, invalid use, and critical operations. [3]

`TelemetryResource`, `AuditEvent`, `TraceSpan`, `MetricEvent`, and `LogRecord` SHALL validate against
their dedicated JSON schemas in `schemas/`: `telemetry_resource.schema.json`,
`audit_event.schema.json`, `trace_span.schema.json`, `metric_event.schema.json`, and
`log_record.schema.json`.

## 14.10 Audit versus telemetry retention

The engine SHALL apply different retention and access profiles to:

- `AUDIT_EVENTS`
- `SECURITY_EVENTS`
- `OPERATIONAL_LOGS`
- `TRACES`
- `METRICS`

### Rules

- audit events SHALL not be dropped due to telemetry sampling
- traces MAY be sampled, but compliance-significant spans SHALL carry explicit sampling and retention posture and SHALL not use best-effort sampling for filing, amendment, authority, retention, or erasure operations
- operational logs MAY have shorter retention than audit evidence
- security and privacy events SHALL have stricter access control than generic metrics
- run-root spans SHALL carry explicit `run_kind` and `mode`, lineage-sensitive spans SHALL carry manifest-lineage anchors, and authority transmit/reconcile spans SHALL carry both authority-operation and submission/access-binding correlation keys
- error spans SHALL carry typed failure detail sufficient to distinguish what failed and where it failed, rather than relying on `error_id` alone

## 14.11 Query contracts

The observability and audit layer SHALL expose, at minimum:

### `get_audit_trail(root_ref, options)`

Returns ordered audit events for the requested object or run in canonical stream order together with
enough lineage metadata to explain reuse, continuation, replay, or recovery hops.

### `get_run_timeline(manifest_id)`

Returns the normalized runtime timeline combining audit milestones and major trace spans. The timeline
SHALL preserve audit stream ordering semantics rather than re-sorting durable audit facts solely by
event timestamps.

### `get_nightly_batch_timeline(batch_run_id)`

Returns the normalized overnight control-plane timeline combining selection, shard ownership,
per-client dispositions, quiescence, digest publication, and any successor-batch recovery linkage.

### `get_filing_evidence_ledger(submission_record_id)`

Returns the audit trail, authority protocol events, and linked provenance refs for a filing episode.

### `get_privacy_action_ledger(client_id, options)`

Returns masking, export, hold, and erasure actions affecting the client scope.

### `get_operator_morning_digest(tenant_id, coverage_date)`

Returns the published `OperatorMorningDigest` together with source batch refs, queue summaries, and
its `derivation_contract`, including explicit workflow/notification publication completion and any
supersession linkage for the requested coverage date.

These query contracts SHALL materialize as deterministic `AuditInvestigationFrame` slices or an
equivalent backend-owned query envelope that preserves:

- `query_contract_code`
- `query_anchor_ref`
- `ordering_basis`
- `ordered_event_refs[]`
- `supporting_trace_span_refs[]` where a timeline contract includes trace structure
- `supporting_log_record_refs[]` only as operational explanation, never as compliance proof

`AUDIT_TRAIL` queries SHALL use `ordering_basis = AUDIT_STREAM_SEQUENCE`. Merged timelines and
ledger-style slices SHALL use `ordering_basis = RECORDED_AT_THEN_STREAM_SEQUENCE`, with audit order
remaining canonical inside each merged position.

## 14.12 Conformance tests

The contract SHALL be testable. Minimum tests:

- trace-to-audit correlation test
- manifest-to-log correlation test
- event-hash integrity test
- step-up audit coverage test
- authority-operation trace coverage test
- nightly-batch reconstruction test
- operator-morning-digest lineage test
- filing episode reconstruction test
- erasure-proof preservation test
- sampled-trace / unsampled-audit separation test
- release-to-build provenance correlation test
- migration audit continuity test
- restore-drill hash-chain continuity test
- resume-token abuse detection test
- deterministic audit ordering test under clock skew
- continuation/replay/recovery audit reconstruction test
- compensation-to-error audit linkage test

ASVS is a useful verification backbone here because OWASP positions it as a framework of security
requirements for designing, developing, and testing modern web applications and web services. [4]

## 14.13 Invariants

The observability and audit contract SHALL satisfy these invariants:

1. no filing-critical action without audit event
2. no authority mutation without request/response correlation keys
3. no blocking gate without an audit trace
4. no step-up or approval without security audit evidence
5. no erasure without erasure-proof artifact
6. no sampled telemetry decision may remove mandatory audit history
7. no manifest reuse, replay, recovery, or continuation without lineage-safe audit evidence
8. no audit query may sort compliance history solely by raw `event_time`
9. no compensation or remediation without linked error audit evidence
10. no compliance-significant span without explicit sampling and retention posture
11. no run-root or lineage-decision span without the minimum correlation keys needed to reconstruct mode and manifest ancestry
12. no authority transmit or reconcile span without access-binding and submission correlation
13. no error span without typed failure detail

## 14.14A Replay and reproducibility observability

Replay-safe observability SHALL include the following additional event families where applicable:

- `ReplayPreflightValidated`
- `ReplayBasisCorruptionDetected`
- `FrozenPostSealBasisLoaded`
- `HistoricalAuthorityBasisReused`
- `HistoricalLateDataBasisReused`
- `ReplayOutcomeCompared`
- `ReplayAttested`

These events SHALL carry, at minimum, `manifest_id`, `replay_of_manifest_id`, `replay_class`,
`comparison_mode`, `basis_validation_state`, `expected_execution_basis_hash`,
`actual_execution_basis_hash`, and, when comparison is materially possible, both expected and actual
`deterministic_outcome_hash` values.

### Additional query contract

#### `get_replay_attestation(manifest_id)`

Returns the replay-comparison artifact, mismatch inventory, limitation codes, and linked audit events
for the requested replay child or replay target.

### Additional conformance tests

The observability suite SHALL also cover:

- replay-preflight audit completeness test
- exact replay hash-match audit reconstruction test
- corrupted replay-basis detection test
- counterfactual replay declared-difference audit test

### Additional invariants

14. no replay comparison outcome without a durable replay attestation or typed failure reason
15. no exact replay success without preserved historical basis hashes and comparison metadata

## 14.14 One-sentence summary

The observability and audit contract ensures that the engine is both operationally visible and
forensically explainable, with traces/metrics/logs for runtime understanding and append-only audit
evidence for legal and compliance proof.

[1]: https://opentelemetry.io/docs/what-is-opentelemetry/?utm_source=chatgpt.com
[2]: https://opentelemetry.io/docs/concepts/signals/traces/?utm_source=chatgpt.com
[3]: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html?utm_source=chatgpt.com
[4]: https://owasp.org/projects/?utm_source=chatgpt.com

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
- `trace_id`
- `span_id`
- `run_kind`
- `mode`
- `gate_code`
- `workflow_item_id`
- `submission_record_id`
- `authority_operation_id`
- `error_id`
- `retention_class`
- `service_name`
- `environment_ref`
- `code_build_id`

### Correlation rule

No compliance-significant event may be emitted without a path back to either a `manifest_id`, a
`submission_record_id`, or an `authority_operation_id`.

## 14.5 Audit event contract

Each `AuditEvent` SHALL include:

- `audit_event_id`
- `event_type`
- `event_time`
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

### B. Manifest lifecycle

- `ManifestAllocated`
- `ManifestFrozen`
- `ManifestSealed`
- `RunStarted`
- `ManifestFailed`
- `ManifestBlocked`
- `ManifestCompleted`
- `ManifestSuperseded`

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

## 14.7 Trace contract

A compliance-capable run SHALL create a top-level trace rooted at `manifest_id`, with child spans for
at least:

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

OpenTelemetry's trace model is designed to represent the path of a request through an application and
to preserve structure and context across service boundaries. [2]

## 14.8 Metric contract

The engine SHALL emit at minimum these metric families.

### Reliability metrics

- run success/failure rate
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
- retry volume
- duplicate-suppression volume
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

## 14.9 Logging contract

Application logs SHALL be structured. Each log record SHALL include at minimum:

- timestamp
- severity
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

OWASP's logging guidance is specifically about building application logging mechanisms, especially for
security logging, and OWASP's session guidance specifically recommends logging session lifecycle events
such as creation, renewal, destruction, invalid use, and critical operations. [3]

## 14.10 Audit versus telemetry retention

The engine SHALL apply different retention and access profiles to:

- `AUDIT_EVENTS`
- `SECURITY_EVENTS`
- `OPERATIONAL_LOGS`
- `TRACES`
- `METRICS`

### Rules

- audit events SHALL not be dropped due to telemetry sampling
- traces MAY be sampled, but filing/amendment-critical traces SHOULD be retained deterministically
- operational logs MAY have shorter retention than audit evidence
- security and privacy events SHALL have stricter access control than generic metrics

## 14.11 Query contracts

The observability and audit layer SHALL expose, at minimum:

### `get_audit_trail(root_ref, options)`

Returns ordered audit events for the requested object or run.

### `get_run_timeline(manifest_id)`

Returns the normalized runtime timeline combining audit milestones and major trace spans.

### `get_filing_evidence_ledger(submission_record_id)`

Returns the audit trail, authority protocol events, and linked provenance refs for a filing episode.

### `get_privacy_action_ledger(client_id, options)`

Returns masking, export, hold, and erasure actions affecting the client scope.

## 14.12 Conformance tests

The contract SHALL be testable. Minimum tests:

- trace-to-audit correlation test
- manifest-to-log correlation test
- event-hash integrity test
- step-up audit coverage test
- authority-operation trace coverage test
- filing episode reconstruction test
- erasure-proof preservation test
- sampled-trace / unsampled-audit separation test
- release-to-build provenance correlation test
- migration audit continuity test
- restore-drill hash-chain continuity test
- resume-token abuse detection test

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

## 14.14 One-sentence summary

The observability and audit contract ensures that the engine is both operationally visible and
forensically explainable, with traces/metrics/logs for runtime understanding and append-only audit
evidence for legal and compliance proof.

[1]: https://opentelemetry.io/docs/what-is-opentelemetry/?utm_source=chatgpt.com
[2]: https://opentelemetry.io/docs/concepts/signals/traces/?utm_source=chatgpt.com
[3]: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html?utm_source=chatgpt.com
[4]: https://owasp.org/projects/?utm_source=chatgpt.com

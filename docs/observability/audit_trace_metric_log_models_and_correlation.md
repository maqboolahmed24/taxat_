# Audit, Trace, Metric, And Log Correlation Models

This note records the backend observability model layer implemented for `pc_0214`.

## Scope

`packages/backend-observability` is the canonical backend boundary for serializing:

- `AuditEvent`
- `TraceSpan`
- `MetricEvent`
- `LogRecord`
- shared `TelemetryResource`
- shared `ObservabilityCorrelationContext`

Assumption recorded: `ASSUMPTION_BACKEND_OBSERVABILITY_PACKAGE_CREATED`. The repository already had `packages/audit` and `packages/telemetry`, but no `packages/backend-observability` package. The new package composes those existing packages instead of creating a second audit or telemetry dialect.

## Correlation Context

All signal emitters call `buildObservabilityCorrelationContext(...)`. The builder:

- defaults `service_name`, `environment_ref`, and `code_build_id` from the supplied `TelemetryResource`
- derives trace and span ids through the existing telemetry helpers
- preserves parent trace context while deriving a distinct child span id when a child span seed is supplied
- mirrors `ManifestBranchDecisionContract` into top-level correlation fields and fails closed on drift
- mirrors `ManifestStartClaimContract` into top-level correlation fields and fails closed on drift
- enforces paired nightly fields, replay fields, expected/actual execution-basis hashes, and expected/actual deterministic outcome hashes
- rejects manifest lineage refs that are not backed by a branch decision packet

Top-level signal identity is allowed only when it mirrors the nested correlation context. `AuditEvent.tenant_id`, `AuditEvent.client_id`, and `AuditEvent.manifest_id` are checked against `correlation_context`. `TraceSpan.trace_id`, `span_id`, and `manifest_id` are checked the same way. `LogRecord.service_name` and `environment_ref` mirror the resource-backed correlation context.

## Resource Tuple

`buildTelemetryResource(...)` wraps the existing telemetry resource builder and adds forward chronology validation. The shared tuple is:

- service name and namespace
- deployment environment
- service instance
- release candidate hash
- build artifact digest
- schema bundle hash
- workspace id

Every trace, metric, and log receives the same `resource_ref`; audit defaults `service_ref` from the resource when the caller does not provide an actor or service ref.

## Signal Boundaries

`TraceSpan` uses the closed schema span vocabulary. Authority, filing, retention, erasure, drift, and amendment spans are `MANDATORY_FORENSIC`; run-root, lineage, config, freeze, and start-claim spans are `DETERMINISTIC_RETAIN`; remaining runtime spans are `SAMPLED_OPERATIONAL`.

`MetricEvent` uses the closed metric-family vocabulary from `metric_event.schema.json`. Counter, histogram, and gauge behavior is derived from the family. Dimensions are scalar, bounded, lower-case keys. Nightly metric families require nightly batch and window correlation, and `NIGHTLY_SELECTION_DISPOSITION_COUNT` must mirror `selection_disposition` as both dimension and correlation context.

`LogRecord` uses these closed families: `RUNTIME`, `SESSION_SECURITY`, `ACCESS_CONTROL`, `PRIVACY_RETENTION`, and `AUTHORITY_EDGE`. Family determines access tier and retention class. Structured fields are allow-listed per family, secret-like keys and values are rejected, warning-or-higher logs require impact correlation, and error/fatal logs require `error_id`.

Logs and traces are supporting signals only. They never backfill missing audit truth and are not treated as proof of legal or compliance action.

## Audit Events

`BackendObservabilityAuditEventStore` is an append-only, in-memory persistence helper for model and contract tests. It uses `createAuditEventDraft(...)`, audit policy bundles, chain hashing, and stable event ids from `packages/audit`.

The store is schema-aligned for `audit_event.schema.json`: a root backend-observability event uses `stream_sequence = 0` with `prev_event_hash = null`; later rows carry the previous chain hash. The existing `packages/audit` writer remains one-based and was not rewritten as part of this card.

Retry safety is scoped by `audit_stream_ref + publicationRef`. A duplicate publication with the same payload is ignored; a duplicate with divergent payload fails closed. Every event must carry at least one of `actor_ref` or `service_ref`.

Post-expiry retained context is enforced:

- `FULL` requires `audit_sufficiency_state = SUFFICIENT`, null expiry, and no limitation reason codes
- `HASH_ONLY`, `TOMBSTONED`, and `ERASED` require `audit_sufficiency_state = LIMITED`, non-null expiry, non-empty event reason codes, non-empty object refs, non-empty lineage refs, and non-empty limitation reason codes

Nightly audit events require `nightly_batch_run_ref` and `nightly_window_key`; client-disposition nightly events also require `selection_disposition`. Replay audit events require replay lineage, replay class, comparison mode, basis validation state, and expected/actual execution-basis hashes. Replay outcome events also require expected/actual deterministic outcome hashes. Remediation and compensation events require the exact task or compensation correlation ids.

## Nightly And Replay Handling

Nightly keys remain local to nightly signals: `nightly_batch_run_ref`, `nightly_window_key`, and `selection_disposition` are required only for nightly audit, root-span, and metric families that need them.

Replay keys remain local to replay signals: `replay_class`, `replay_of_manifest_id`, `comparison_mode`, `basis_validation_state`, and expected/actual basis or outcome hashes are paired and cannot be half-populated. Replay and recovery logs must carry replay-safe lineage rather than degrade into generic service logs.

## Verification Hooks

The package tests are mirrored under `tests/unit/backend_observability` so the repository Playwright unit project can run the model tests directly. The focused suite covers:

- top-level and nested correlation mirror checks
- branch-decision and start-claim drift rejection
- audit append-only ordering, retained context, duplicate suppression, remediation, and compensation linkage
- nightly and replay root-span requirements
- nightly metric correlation
- secret-safe structured log rejection

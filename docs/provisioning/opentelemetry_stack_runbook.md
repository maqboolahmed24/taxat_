# OpenTelemetry Stack Runbook

This pack freezes Taxat's first-party OpenTelemetry collection posture for traces, metrics, logs, security telemetry, privacy telemetry, and telemetry-to-audit join indices.

## Scope

- hybrid direct-SDK plus workload-agent ingest
- environment-scoped OTLP gateway collectors
- first-party trace, metric, log, security, privacy, and join backends
- explicit vendor overlay bridge to the Sentry-compatible monitoring workspace from `pc_0044`
- shared resource-attribute, correlation-key, sampling, retention, and scrub policy

## Authoritative inputs

- `Algorithm/observability_and_audit_contract.md`
- `Algorithm/retention_error_and_observability_contract.md`
- `Algorithm/security_and_runtime_hardening_contract.md`
- `Algorithm/deployment_and_resilience_contract.md`
- `Algorithm/verification_and_release_gates.md`
- prior outputs from `pc_0044`, `pc_0050`, `pc_0051`, `pc_0052`, and `pc_0053`

## Deliverables

- [signal_backend_catalog.json](/Users/test/Code/taxat_/config/observability/signal_backend_catalog.json)
- [otlp_export_matrix.json](/Users/test/Code/taxat_/config/observability/otlp_export_matrix.json)
- [sampling_and_retention_policy.json](/Users/test/Code/taxat_/config/observability/sampling_and_retention_policy.json)
- [correlation_key_policy.json](/Users/test/Code/taxat_/config/observability/correlation_key_policy.json)
- [log_scrub_and_field_allowlist.json](/Users/test/Code/taxat_/config/observability/log_scrub_and_field_allowlist.json)
- [observability_inventory.template.json](/Users/test/Code/taxat_/data/provisioning/observability_inventory.template.json)

## Topology posture

- OTLP is the canonical ingest and interchange contract.
- Browser and native shells may emit directly to the environment gateway.
- Server workloads use workload-local agents where enrichment or local buffering is needed.
- Environment gateways own sampling, redaction, routing, batching, and exporter backpressure policy.
- Vendor monitoring is secondary-only and receives allowlisted traces or release overlays only.
- Audit, release evidence, and authority truth stay in first-party control, audit, object, and verification stores.

## Provider options reviewed

- `SELF_HOSTED_LGTM_COLLECTOR_STACK` - Keep collector, traces, metrics, logs, security, and privacy stores inside the first-party platform boundary. (SELF_HOST_DECISION_REQUIRED)
- `PLATFORM_NATIVE_OTLP_BACKENDS` - Use the eventual platform provider's OTLP-capable tracing, metrics, and logging stores behind the same gateway pattern. (BLOCKED_BY_PLATFORM_PROVIDER_SELECTION)
- `MANAGED_OTLP_SEARCH_AND_METRIC_STACK` - Keep the gateway and redaction in first party, then export to a managed backend that accepts OTLP or compatible transformed signals. (SELF_HOST_DECISION_REQUIRED)

## Signal family routing

- **Traces** -> `backend.first_party_traces`
- **Metrics** -> `backend.first_party_metrics`
- **Logs** -> `backend.first_party_logs`
- **Security telemetry** -> `backend.security_signal_store`
- **Privacy telemetry** -> `backend.privacy_signal_store`
- **Audit links** -> `backend.audit_join_index`

## Retention classes

- `retention.telemetry.trace_hot_14d` - hot 14d, warm 30d, runtime and incident operators only
- `retention.telemetry.metric_rollup_30d` - hot 30d, warm 90d, runtime, release, and SRE operators
- `retention.telemetry.logs_hot_30d` - hot 30d, warm 60d, runtime and restricted support operators with customer-safe filters
- `retention.telemetry.security_restricted_90d` - hot 90d, warm 180d, security and break-glass operators only
- `retention.telemetry.privacy_restricted_90d` - hot 90d, warm 180d, privacy and compliance operators only
- `retention.telemetry.audit_link_30d` - hot 30d, warm 90d, investigation and incident operators

## Exporter failure posture

1. Runtime correctness does not depend on telemetry backend availability.
2. Mandatory audit evidence and authority history continue through their first-party control paths even if telemetry exporters fail.
3. Gateway exporters use bounded queues, retry with backoff, and WAL-backed persistence on selected hops.
4. Vendor overlay exporters are non-blocking and may degrade independently of first-party telemetry backends.

## Debug and incident widening

- Elevated debug posture is time-bounded and requires explicit approval plus expiry.
- Incident posture may widen sampling or log capture only for affected service families.
- All widened posture still obeys the allowlist and redaction rules.
- No widened posture may add raw secrets, raw authority payloads, declaration text, evidence text, or DOM/screenshot capture.

## Typed gaps

- Concrete first-party trace, metric, log, security, and privacy backend products remain blocked by the broader platform-provider choice.
- Runtime SDK defaults still need to import the shared resource-attribute and log-allowlist contract.
- The inventory is therefore portable and adoption-safe, not a live control-plane mutation.

# OpenTelemetry Bootstrap And Correlation Runbook

## Purpose

`packages/telemetry` is the governed application-runtime seam for traces, metrics, logs, HTTP propagation, queue propagation, stream publication, upload continuation, and client-surface telemetry.
It exists so later services do not invent their own correlation shape, redaction rules, or sampling posture.

## Boundary

- Telemetry is operational explanation.
- Audit remains append-only proof.
- Shared correlation keys make traces, metrics, logs, and audit joinable.
- No runtime path may treat inbound transport baggage or trace headers as authoritative business truth.

## Bootstrap flow

1. Load `config/telemetry/telemetry_signal_catalog.json`.
   This declares the signal families and the explicit telemetry-versus-audit boundary.
2. Load `config/telemetry/correlation_key_matrix.json`.
   This declares the canonical correlation contract, mandatory resource attributes, and the per-boundary retained/redacted keys.
3. Load `config/telemetry/sampling_class_policy.json`.
   This maps span codes, metric families, and log families to retention and sampling posture.
4. Load `config/telemetry/log_redaction_policy.json`.
   This makes secret, token, copied-UI, DOM, screenshot, and payload leakage structurally impossible in the shared adapter.
5. Build one canonical `TelemetryResource`.
   Every later trace, metric, and log record points at that resource id.
6. Register propagators once.
   Use W3C `traceparent` for transport continuity plus the bounded internal correlation carrier only for trusted internal service and message boundaries.

## Resource identity

Every resource must include:

- `service.name`
- `service.namespace`
- `deployment.environment.name`
- `service.instance.id`
- `taxat.release.candidate_hash`
- `taxat.build.artifact_digest`
- `taxat.schema.bundle_hash`
- `taxat.workspace.id`

These attributes freeze the build/deployment tuple used to join runtime signals safely.

## Correlation rules

- `tenant_id`, `trace_id`, `service_name`, `environment_ref`, and `code_build_id` are mandatory on the shared correlation spine.
- `manifest_id`, `submission_record_id`, `authority_operation_id`, and `workflow_item_id` are the primary audit join anchors when applicable.
- Public HTTP ingress may contribute transport trace continuity only.
- Internal HTTP, queue, stream, and upload continuation may carry the bounded internal correlation carrier.
- Authoritative business lineage always comes from server-authored context, not from public headers or browser-authored baggage.

## Sampling rules

- `MANDATORY_FORENSIC`:
  authority, filing, amendment, retention, and erasure spans.
- `DETERMINISTIC_RETAIN`:
  run-root and lineage-decision spans.
- `SAMPLED_OPERATIONAL`:
  general operational spans such as source collection, compute, parity, trust, and snapshot build.
- `CLIENT_LOW_NOISE`:
  browser-owned route/module/posture/timing telemetry only.

Sampling may reduce operational trace volume.
It never removes mandatory audit evidence.

## Logging rules

- Logs are schema-aligned and structured.
- Warning-or-higher logs require structured fields.
- Error and fatal logs require `error_id`.
- Session, access-control, authority-edge, and privacy/retention logs use tighter access tiers than generic runtime logs.
- Raw secrets, tokens, cookies, masked values, copied UI text, DOM snapshots, screenshots, clipboard contents, and document text remain forbidden.

## Client-surface rules

Allowed client-side fields:

- `shell_family`
- `route_family`
- `module_code`
- `posture_code`
- `action_code`
- `recovery_outcome`
- `performance_bucket_ms`
- `accessibility_pref`
- `opaque_object_ref`
- `error_code`
- `error_id`

Forbidden client-side fields include:

- copied UI text
- document filenames
- clipboard contents
- DOM snapshots
- screenshot payloads
- declaration or evidence text
- keystroke streams

If a capture mode cannot prove redaction for a regulated surface, disable it on that surface.

## Boundary-specific notes

- Queue and upload continuation propagation may preserve hashed transport refs plus safe workflow/session/storage refs only.
- Stream publication may correlate through hashed resume bindings only.
- Client surfaces may correlate to server telemetry, but they never widen visibility or disclosure rights.

## Operator surface

`apps/operator-web/public/internal/telemetry-correlation-atlas` is a read-only explanatory viewer.
It shows:

- the root correlation contract
- the signal-family rails
- the HTTP, queue, stream, and client propagation boundaries
- the redacted versus retained keys
- the explicit audit join boundary

It is not a live telemetry or vendor-backend control plane.

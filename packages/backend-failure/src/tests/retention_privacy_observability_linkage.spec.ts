import { expect, test } from "@playwright/test";

import {
  applyLegalHold,
  applyRetentionPolicy,
  type RetentionLifecycleApplicationInput,
  type RetentionPolicySource,
} from "../../../backend-retention/src/index.ts";
import { BackendObservabilityAuditEventStore } from "../../../backend-observability/src/index.ts";
import { sampleTelemetryResource } from "../../../backend-observability/src/tests/fixtures.ts";
import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  emitRetentionErrorCorrelationEvidence,
  openRetentionOrPrivacyError,
} from "../index.ts";

const policy: RetentionPolicySource = {
  minimum_retention_days: 365,
  policy_ref: "retention-basis://pc0216/observability",
  policy_retention_days: 730,
  pseudonymisation_mode: "PSEUDONYMIZE_ALLOWED_AFTER_EXPIRY",
  retention_class: "regulated_record",
};

function input(
  overrides: Partial<RetentionLifecycleApplicationInput> = {},
): RetentionLifecycleApplicationInput {
  return {
    anchor_timestamp: "2026-05-01T09:00:00Z",
    artifact_ref: "source-record://pc0216/observability-file",
    erasure_decided_at: "2026-05-05T10:00:00Z",
    object_class: "SOURCE_RECORD",
    observed_at: "2026-05-05T10:05:00Z",
    policy,
    tenant_id: "tenant.pc0216",
    ...overrides,
  };
}

test("emits gate, error, retention audit events plus minimized trace and log evidence", async () => {
  const active = applyRetentionPolicy(input());
  const held = applyLegalHold({
    artifact_retention: active.artifact_retention,
    changed_at: "2026-05-05T10:06:00Z",
    hold_ref: "legal-hold://pc0216/observability",
    next_checkpoint_at: "2026-05-06T10:06:00Z",
    retention_tag: active.retention_tag,
    workflow_item_refs: ["workflow://pc0216/observability-hold"],
  });
  const opened = openRetentionOrPrivacyError({
    artifact_retention: held.artifact_retention,
    condition: "BLOCKED_LEGAL_HOLD",
    manifest_id: "manifest.pc0216.observability",
    opened_at: "2026-05-05T10:07:00Z",
    remediation_owner_ref: "operator://pc0216/observability",
    retention_tag: held.retention_tag,
    root_manifest_id: "manifest.pc0216.root",
    workflow_item_id: "workflow://pc0216/observability-hold",
  });
  const sink = {
    logRecords: [],
    traceSpans: [],
  };
  const store = await BackendObservabilityAuditEventStore.create();
  const evidence = await emitRetentionErrorCorrelationEvidence({
    artifact_retention: held.artifact_retention,
    client_id: "client.pc0216",
    event_time: "2026-05-05T10:08:00Z",
    gate_code: "RETENTION_EVIDENCE_GATE",
    opened_error: opened,
    resource: sampleTelemetryResource(),
    retention_tag: held.retention_tag,
    sink,
    store,
    tenant_id: "tenant.pc0216",
  });

  expect(evidence.audit_events.gate_evaluated.event.event_type).toBe("GateEvaluated");
  expect(evidence.audit_events.error_recorded.event.event_type).toBe("ErrorRecorded");
  expect(evidence.audit_events.retention_event.event.event_type).toBe("LegalHoldApplied");
  expect(evidence.audit_events.error_recorded.event.correlation_context.error_id).toBe(
    opened.error_record.error_id,
  );
  expect(evidence.audit_events.error_recorded.event.object_refs).toContain(
    held.artifact_retention.retention_id,
  );
  expect(evidence.log_record.log_family).toBe("PRIVACY_RETENTION");
  expect(evidence.log_record.structured_fields).toEqual(
    expect.objectContaining({
      artifact_retention_ref: held.artifact_retention.retention_id,
      reason_code: "LEGAL_HOLD_ACTIVE",
      retention_class: "regulated_record",
    }),
  );
  expect(Object.keys(evidence.log_record.structured_fields)).not.toContain("token_value");
  expect(Object.keys(evidence.log_record.structured_fields)).not.toContain("raw_payload");
  expect(evidence.trace_spans).toHaveLength(2);
  expect(evidence.trace_spans[1]?.correlation_context.error_id).toBe(
    opened.error_record.error_id,
  );
  expect(evidence.trace_spans[1]?.span_attributes).toMatchObject({
    failure_class: "RETENTION_PRIVACY",
    failure_phase: "RETENTION_ERROR_BINDING",
  });

  await validateContractSchema(
    "audit_event",
    evidence.audit_events.gate_evaluated.event,
  );
  await validateContractSchema(
    "audit_event",
    evidence.audit_events.error_recorded.event,
  );
  await validateContractSchema(
    "audit_event",
    evidence.audit_events.retention_event.event,
  );
  for (const span of evidence.trace_spans) {
    await validateContractSchema("trace_span", span);
  }
  await validateContractSchema("log_record", evidence.log_record);
});

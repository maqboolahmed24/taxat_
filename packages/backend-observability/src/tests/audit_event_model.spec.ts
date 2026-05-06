import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  BackendObservabilityAuditEventStore,
  emitAuditEvent,
} from "../index.ts";
import { sampleTelemetryResource } from "./fixtures.ts";

test("emits schema-valid append-only audit events with mirrored identity and duplicate suppression", async () => {
  const resource = sampleTelemetryResource();
  const store = await BackendObservabilityAuditEventStore.create();
  const full = await emitAuditEvent({
    clientIdOrNull: "client.pc0214",
    correlationContext: {
      client_id: "client.pc0214",
      manifest_id: "manifest.audit.pc0214",
      mode: "COMPLIANCE",
      root_manifest_id: "manifest.audit.pc0214",
      run_kind: "INTERACTIVE",
      tenant_id: "tenant.pc0214",
    },
    eventTime: "2026-05-05T09:10:00Z",
    eventType: "RetentionApplied",
    manifestIdOrNull: "manifest.audit.pc0214",
    objectRefs: ["artifact://pc0214/full"],
    publicationRef: "audit-pc0214-retention-applied",
    reasonCodes: ["RETENTION_POLICY_APPLIED"],
    resource,
    store,
    tenantId: "tenant.pc0214",
  });
  const duplicate = await emitAuditEvent({
    clientIdOrNull: "client.pc0214",
    correlationContext: {
      client_id: "client.pc0214",
      manifest_id: "manifest.audit.pc0214",
      mode: "COMPLIANCE",
      root_manifest_id: "manifest.audit.pc0214",
      run_kind: "INTERACTIVE",
      tenant_id: "tenant.pc0214",
    },
    eventTime: "2026-05-05T09:10:00Z",
    eventType: "RetentionApplied",
    manifestIdOrNull: "manifest.audit.pc0214",
    objectRefs: ["artifact://pc0214/full"],
    publicationRef: "audit-pc0214-retention-applied",
    reasonCodes: ["RETENTION_POLICY_APPLIED"],
    resource,
    store,
    tenantId: "tenant.pc0214",
  });

  expect(full.status).toBe("APPENDED");
  expect(full.storedEvent.event.stream_sequence).toBe(0);
  expect(full.storedEvent.event.prev_event_hash).toBeNull();
  expect(duplicate.status).toBe("DUPLICATE_IGNORED");
  expect(duplicate.storedEvent.event.audit_event_id).toBe(
    full.storedEvent.event.audit_event_id,
  );
  await validateContractSchema("audit_event", full.storedEvent.event);
});

test("preserves post-expiry retained context and remediation linkage", async () => {
  const resource = sampleTelemetryResource();
  const store = await BackendObservabilityAuditEventStore.create();
  const limited = await emitAuditEvent({
    clientIdOrNull: "client.pc0214",
    correlationContext: {
      client_id: "client.pc0214",
      error_id: "error://pc0214/remediation",
      manifest_id: "manifest.audit.limited.pc0214",
      mode: "COMPLIANCE",
      root_manifest_id: "manifest.audit.limited.pc0214",
      run_kind: "INTERACTIVE",
      task_id: "task://pc0214/remediation",
      tenant_id: "tenant.pc0214",
    },
    eventTime: "2026-05-05T09:20:00Z",
    eventType: "RemediationCompleted",
    limitationReasonCodes: ["PAYLOAD_EXPIRED"],
    lineageRefs: ["lineage://pc0214/remediation", "manifest.audit.limited.pc0214"],
    manifestIdOrNull: "manifest.audit.limited.pc0214",
    objectRefs: ["artifact://pc0214/limited"],
    payloadAvailabilityState: "HASH_ONLY",
    payloadExpiryAtOrNull: "2026-05-05T09:19:00Z",
    publicationRef: "audit-pc0214-remediation-completed",
    reasonCodes: ["PAYLOAD_EXPIRED", "TASK_COMPLETED"],
    resource,
    store,
    tenantId: "tenant.pc0214",
  });

  expect(limited.storedEvent.event.retained_context.audit_sufficiency_state).toBe(
    "LIMITED",
  );
  expect(limited.storedEvent.event.correlation_context.task_id).toBe(
    "task://pc0214/remediation",
  );
  await validateContractSchema("audit_event", limited.storedEvent.event);

  await expect(
    emitAuditEvent({
      clientIdOrNull: "client.pc0214",
      correlationContext: {
        client_id: "client.pc0214",
        error_id: "error://pc0214/remediation",
        manifest_id: "manifest.audit.limited.pc0214",
        tenant_id: "tenant.pc0214",
      },
      eventTime: "2026-05-05T09:21:00Z",
      eventType: "RemediationCompleted",
      manifestIdOrNull: "manifest.audit.limited.pc0214",
      objectRefs: ["artifact://pc0214/limited"],
      reasonCodes: ["TASK_COMPLETED"],
      resource,
      store,
      tenantId: "tenant.pc0214",
    }),
  ).rejects.toThrow(/AUDIT_CORRELATION_REQUIRED/);
});

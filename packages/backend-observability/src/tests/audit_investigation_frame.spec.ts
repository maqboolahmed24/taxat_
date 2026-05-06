import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import type { StoredBackendAuditEvent } from "../index.ts";
import {
  assertAuditInvestigationFrameContract,
  auditSliceEventFromStoredBackendAuditEvent,
  buildAuditInvestigationFrame,
  queryAuditSlice,
} from "../index.ts";

export const tenantId = "tenant.pc0215";
export const clientId = "client.pc0215";
export const manifestId = "manifest.pc0215.run";
export const targetObjectRef = "object://vat-return/pc0215";
export const nightlyBatchRunRef = "nightly-batch://pc0215/2026-05-05";
export const submissionRecordId = "submission://pc0215/vat";

function storedEvent(input: {
  auditStreamRef?: string;
  clientId?: string | null;
  eventRef: string;
  eventType: string;
  familyRef: string;
  manifestId?: string | null;
  objectRefs: readonly string[];
  recordedAt: string;
  streamSequence: number;
  traceOrdinal?: string | null;
  context?: Record<string, unknown>;
}): StoredBackendAuditEvent {
  const traceOrdinal = input.traceOrdinal ?? input.eventRef.split(".").at(-1) ?? "001";
  return {
    chain_hash: `chain-hash.${input.eventRef}`,
    event: {
      actor_ref: null,
      audit_event_id: input.eventRef,
      audit_stream_ref: input.auditStreamRef ?? "audit-stream.pc0215.manifest",
      client_id: input.clientId ?? clientId,
      correlation_context: {
        client_id: input.clientId ?? clientId,
        manifest_id: input.manifestId ?? manifestId,
        mode: "COMPLIANCE",
        run_kind: "INTERACTIVE",
        span_id: traceOrdinal === null ? undefined : `span${traceOrdinal}`,
        tenant_id: tenantId,
        trace_id: traceOrdinal === null ? undefined : "11111111111111111111111111111111",
        ...(input.context ?? {}),
      },
      event_payload_hash: `payload-hash.${input.eventRef}`,
      event_time: input.recordedAt,
      event_type: input.eventType,
      manifest_id: input.manifestId ?? manifestId,
      object_refs: [...input.objectRefs],
      prev_event_hash: input.streamSequence === 0 ? null : `chain-hash.previous.${input.eventRef}`,
      reason_codes: [`REASON_${input.streamSequence}`],
      recorded_at: input.recordedAt,
      retained_context: {
        audit_sufficiency_state: "SUFFICIENT",
        lineage_refs: [`lineage://${input.eventRef}`],
        limitation_reason_codes: [],
        payload_availability_state: "FULL",
        payload_expiry_at_or_null: null,
      },
      retention_class: "retention.audit.pc0215",
      retention_limited_explainability_contract: {},
      service_ref: "service://backend-observability-test",
      signature_ref: null,
      stream_sequence: input.streamSequence,
      tenant_id: tenantId,
      visibility_class: "STAFF_VISIBLE",
    },
    event_family_ref: input.familyRef,
    publication_ref: `publication.${input.eventRef}`,
  } as StoredBackendAuditEvent;
}

export function observabilityEvents(): StoredBackendAuditEvent[] {
  return [
    storedEvent({
      eventRef: "audit.pc0215.001",
      eventType: "ManifestStarted",
      familyRef: "ManifestLifecycle",
      objectRefs: [targetObjectRef, manifestId],
      recordedAt: "2026-05-05T09:05:00.000Z",
      streamSequence: 0,
      traceOrdinal: "001",
    }),
    storedEvent({
      eventRef: "audit.pc0215.002",
      eventType: "ManifestSealed",
      familyRef: "ManifestLifecycle",
      objectRefs: [targetObjectRef, manifestId],
      recordedAt: "2026-05-05T09:00:00.000Z",
      streamSequence: 1,
      traceOrdinal: "002",
    }),
    storedEvent({
      eventRef: "audit.pc0215.003",
      eventType: "ManifestCompleted",
      familyRef: "ManifestLifecycle",
      objectRefs: [targetObjectRef, manifestId, "log://runtime/pc0215/003"],
      recordedAt: "2026-05-05T09:02:00.000Z",
      streamSequence: 2,
      traceOrdinal: "003",
    }),
    storedEvent({
      auditStreamRef: "audit-stream.pc0215.nightly",
      eventRef: "audit.pc0215.nightly.001",
      eventType: "NightlyPortfolioSelected",
      familyRef: "NightlyBatch",
      objectRefs: [nightlyBatchRunRef, manifestId],
      recordedAt: "2026-05-05T09:03:00.000Z",
      streamSequence: 0,
      traceOrdinal: "101",
      context: {
        nightly_batch_run_ref: nightlyBatchRunRef,
        nightly_window_key: "2026-05-05",
        run_kind: "NIGHTLY",
        selection_disposition: "EXECUTE_NEW_MANIFEST",
      },
    }),
    storedEvent({
      auditStreamRef: "audit-stream.pc0215.nightly",
      eventRef: "audit.pc0215.nightly.002",
      eventType: "OperatorMorningDigestPublished",
      familyRef: "NightlyBatch",
      objectRefs: [nightlyBatchRunRef, "digest://operator-morning/pc0215"],
      recordedAt: "2026-05-05T09:04:00.000Z",
      streamSequence: 1,
      traceOrdinal: "102",
      context: {
        nightly_batch_run_ref: nightlyBatchRunRef,
        nightly_window_key: "2026-05-05",
        run_kind: "NIGHTLY",
      },
    }),
    storedEvent({
      auditStreamRef: "audit-stream.pc0215.filing",
      eventRef: "audit.pc0215.filing.001",
      eventType: "FilingPacketBuilt",
      familyRef: "FilingEvidence",
      objectRefs: [submissionRecordId, manifestId, "authority://hmrc/vat"],
      recordedAt: "2026-05-05T09:06:00.000Z",
      streamSequence: 0,
      traceOrdinal: "201",
      context: {
        authority_operation_id: "authority-operation://pc0215/vat",
        submission_record_id: submissionRecordId,
      },
    }),
    storedEvent({
      auditStreamRef: "audit-stream.pc0215.privacy",
      eventRef: "audit.pc0215.privacy.001",
      eventType: "ErasureRequested",
      familyRef: "PrivacyAction",
      objectRefs: [clientId, "retention://pc0215/client"],
      recordedAt: "2026-05-05T09:07:00.000Z",
      streamSequence: 0,
      traceOrdinal: "301",
      context: {
        client_id: clientId,
        retention_class: "regulated_record",
      },
    }),
    storedEvent({
      auditStreamRef: "audit-stream.pc0215.privacy",
      eventRef: "audit.pc0215.privacy.002",
      eventType: "MaskedExportPrepared",
      familyRef: "PrivacyAction",
      objectRefs: [clientId, "log://privacy/pc0215/002"],
      recordedAt: "2026-05-05T09:08:00.000Z",
      streamSequence: 1,
      traceOrdinal: "302",
      context: {
        client_id: clientId,
        retention_class: "regulated_record",
      },
    }),
  ];
}

test("builds schema-valid audit frames with explicit ordering basis and selected context", async () => {
  const events = observabilityEvents()
    .filter((entry) => entry.event_family_ref === "ManifestLifecycle")
    .map(auditSliceEventFromStoredBackendAuditEvent);
  const auditSlice = queryAuditSlice({
    events,
    queryAnchorRef: targetObjectRef,
    queryContractCode: "AUDIT_TRAIL",
    tenantId,
  });
  expect(auditSlice.orderingBasis).toBe("AUDIT_STREAM_SEQUENCE");
  expect(auditSlice.orderedEventRefs).toEqual([
    "audit.pc0215.001",
    "audit.pc0215.002",
    "audit.pc0215.003",
  ]);

  const frame = await buildAuditInvestigationFrame({
    events,
    focusEventRef: "audit.pc0215.002",
    includeStaffOnlySupportingRefs: true,
    queryAnchorRef: targetObjectRef,
    queryContractCode: "AUDIT_TRAIL",
    selectedObjectRef: targetObjectRef,
    tenantId,
  });

  expect(frame.object_anchor_ref).toBe(frame.query_anchor_ref);
  expect(frame.audit_tape.rows.map((row) => row.event_ref)).toEqual(frame.ordered_event_refs);
  expect(frame.focus_anchor_ref).toBe("audit.pc0215.002");
  expect(frame.supporting_log_record_refs).toEqual(["log://runtime/pc0215/003"]);
  assertAuditInvestigationFrameContract(frame);
  await validateContractSchema("audit_investigation_frame", frame);
});

test("keeps merged timelines deterministic under clock skew without log-only proof", async () => {
  const events = observabilityEvents()
    .filter((entry) => entry.event_family_ref === "ManifestLifecycle")
    .map(auditSliceEventFromStoredBackendAuditEvent);
  const frame = await buildAuditInvestigationFrame({
    activeFilters: {
      event_families: ["ManifestLifecycle"],
    },
    events,
    includeStaffOnlySupportingRefs: true,
    queryAnchorRef: manifestId,
    queryContractCode: "RUN_TIMELINE",
    selectedObjectRef: targetObjectRef,
    tenantId,
  });

  expect(frame.ordering_basis).toBe("RECORDED_AT_THEN_STREAM_SEQUENCE");
  expect(frame.ordered_event_refs).toEqual([
    "audit.pc0215.002",
    "audit.pc0215.003",
    "audit.pc0215.001",
  ]);
  expect(frame.supporting_trace_span_refs.length).toBeGreaterThan(0);
  expect(frame.supporting_log_record_refs).toEqual(["log://runtime/pc0215/003"]);
  expect(frame.ordered_event_refs.length).toBeGreaterThan(0);
  await validateContractSchema("audit_investigation_frame", frame);
});

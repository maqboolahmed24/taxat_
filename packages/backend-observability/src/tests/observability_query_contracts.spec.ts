import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  clientId,
  manifestId,
  nightlyBatchRunRef,
  observabilityEvents,
  submissionRecordId,
  targetObjectRef,
  tenantId,
} from "./query_fixtures.ts";
import {
  getAuditTrail,
  getFilingEvidenceLedger,
  getNightlyBatchTimeline,
  getPrivacyActionLedger,
  getRunTimeline,
} from "../index.ts";

function source() {
  return {
    listMergedView: () => observabilityEvents(),
  };
}

test("materializes every observability query mode as a schema-valid backend-owned frame", async () => {
  const frames = [
    await getAuditTrail({
      activeFilters: {
        event_families: ["ManifestLifecycle"],
      },
      auditEventSource: source(),
      includeStaffOnlySupportingRefs: true,
      rootRef: targetObjectRef,
      tenantId,
    }),
    await getRunTimeline({
      activeFilters: {
        event_families: ["ManifestLifecycle"],
      },
      auditEventSource: source(),
      includeStaffOnlySupportingRefs: true,
      manifestId,
      tenantId,
    }),
    await getNightlyBatchTimeline({
      auditEventSource: source(),
      includeStaffOnlySupportingRefs: true,
      batchRunId: nightlyBatchRunRef,
      tenantId,
    }),
    await getFilingEvidenceLedger({
      auditEventSource: source(),
      includeStaffOnlySupportingRefs: true,
      submissionRecordId,
      tenantId,
    }),
    await getPrivacyActionLedger({
      auditEventSource: source(),
      clientId,
      includeStaffOnlySupportingRefs: true,
      tenantId,
    }),
  ];

  expect(frames.map((frame) => frame.query_contract_code)).toEqual([
    "AUDIT_TRAIL",
    "RUN_TIMELINE",
    "NIGHTLY_BATCH_TIMELINE",
    "FILING_EVIDENCE_LEDGER",
    "PRIVACY_ACTION_LEDGER",
  ]);
  expect(frames.map((frame) => frame.ordering_basis)).toEqual([
    "AUDIT_STREAM_SEQUENCE",
    "RECORDED_AT_THEN_STREAM_SEQUENCE",
    "RECORDED_AT_THEN_STREAM_SEQUENCE",
    "RECORDED_AT_THEN_STREAM_SEQUENCE",
    "RECORDED_AT_THEN_STREAM_SEQUENCE",
  ]);
  expect(frames[2]?.correlation_keys).toContain("nightly_batch_run_ref");
  expect(frames[2]?.supporting_trace_span_refs.length).toBeGreaterThan(0);
  expect(frames[3]?.correlation_keys).toContain("submission_record_id");
  expect(frames[4]?.active_filters.client_refs).toContain(clientId);
  expect(frames[4]?.export_posture).toMatchObject({
    reason_codes: ["PRIVACY_LEDGER_MASKED_PREVIEW_REQUIRED"],
    state: "MASKED_ONLY",
  });
  for (const frame of frames) {
    expect(frame.export_eligibility_panel.active_slice_scope_ref).toBe(
      frame.query_anchor_ref,
    );
    expect(frame.audit_tape.rows.map((row) => row.event_ref)).toEqual(
      frame.ordered_event_refs,
    );
    await validateContractSchema("audit_investigation_frame", frame);
  }
});

test("keeps cursor, selected event, and export posture bound to the same query slice", async () => {
  const firstPage = await getRunTimeline({
    activeFilters: {
      event_families: ["ManifestLifecycle"],
    },
    auditEventSource: source(),
    focusEventRef: "audit.pc0215.003",
    includeStaffOnlySupportingRefs: true,
    limit: 2,
    manifestId,
    selectedObjectRef: targetObjectRef,
    tenantId,
  });

  expect(firstPage.query_contract_code).toBe("RUN_TIMELINE");
  expect(firstPage.query_anchor_ref).toBe(manifestId);
  expect(firstPage.active_filters.manifest_refs).toContain(manifestId);
  expect(firstPage.ordered_event_refs).toContain("audit.pc0215.003");
  expect(firstPage.focus_anchor_ref).toBe(firstPage.audit_workspace.selected_event_ref);
  expect(firstPage.next_cursor).not.toBeNull();
  expect(firstPage.export_eligibility_panel.invocation_posture).toBe(
    "ACTIVE_FILTERED_SLICE",
  );
  await validateContractSchema("audit_investigation_frame", firstPage);
});

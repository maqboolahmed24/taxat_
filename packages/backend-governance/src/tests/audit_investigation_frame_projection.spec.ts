import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  buildAuditInvestigationFrame,
  queryAuditSlice,
  type AuditSliceEventInput,
} from "../index.ts";

const tenantId = "tenant.pc0194";
const manifestRef = "manifest.pc0194.run";
const clientRef = "client.pc0194.alpha";
const targetObjectRef = "object://vat-return/pc0194";
const streamRef = "audit-stream.pc0194.main";

function auditEvents(): AuditSliceEventInput[] {
  return [
    {
      actorOrServiceRefOrNull: "service://control-plane-api",
      auditStreamRef: streamRef,
      changedFieldRefs: ["manifest.lifecycle_state"],
      clientRefOrNull: clientRef,
      correlationKeys: ["client_id", "manifest_id", "object_refs", "trace_id"],
      eventRef: "audit.pc0194.001",
      eventTime: "2026-05-04T09:00:00.000Z",
      familyRef: "ManifestLifecycle",
      logRecordRefs: ["log://runtime/pc0194/001"],
      manifestRefOrNull: manifestRef,
      objectRefs: [targetObjectRef],
      primaryObjectRefOrNull: targetObjectRef,
      recordedAt: "2026-05-04T09:02:00.000Z",
      streamSequence: 1,
      summaryRefOrNull: "audit-summary.pc0194.001",
      tenantId,
      traceSpanRefs: ["trace://pc0194/spans/001"],
    },
    {
      actorOrServiceRefOrNull: "principal://staff/investigator",
      auditStreamRef: streamRef,
      changedFieldRefs: ["authority.posture"],
      clientRefOrNull: clientRef,
      correlationKeys: ["actor_ref", "client_id", "manifest_id", "object_refs"],
      eventRef: "audit.pc0194.002",
      eventTime: "2026-05-04T09:01:00.000Z",
      familyRef: "AuthorityInteraction",
      manifestRefOrNull: manifestRef,
      objectRefs: [targetObjectRef, "authority://hmrc/vat"],
      primaryObjectRefOrNull: targetObjectRef,
      recordedAt: "2026-05-04T09:00:00.000Z",
      streamSequence: 2,
      summaryRefOrNull: "audit-summary.pc0194.002",
      tenantId,
      traceSpanRefs: ["trace://pc0194/spans/002"],
    },
    {
      actorOrServiceRefOrNull: "service://submission-worker",
      auditStreamRef: streamRef,
      changedFieldRefs: ["submission.status"],
      clientRefOrNull: clientRef,
      correlationKeys: ["client_id", "manifest_id", "object_refs", "submission_record_id"],
      eventRef: "audit.pc0194.003",
      eventTime: "2026-05-04T09:02:00.000Z",
      familyRef: "SubmissionLedger",
      logRecordRefs: ["log://runtime/pc0194/003"],
      manifestRefOrNull: manifestRef,
      objectRefs: [targetObjectRef, "submission://pc0194/vat"],
      primaryObjectRefOrNull: targetObjectRef,
      recordedAt: "2026-05-04T09:01:00.000Z",
      streamSequence: 3,
      summaryRefOrNull: "audit-summary.pc0194.003",
      tenantId,
      traceSpanRefs: ["trace://pc0194/spans/003"],
    },
  ];
}

test("projects an audit investigation frame with canonical route order and schema-valid panels", async () => {
  const activeFilters = {
    manifest_refs: [manifestRef],
    object_refs: [targetObjectRef],
    window_from: "2026-05-04T09:00:00.000Z",
    window_to: "2026-05-04T09:03:00.000Z",
  };
  const slice = queryAuditSlice({
    activeFilters,
    events: auditEvents(),
    limit: 3,
    queryAnchorRef: manifestRef,
    queryContractCode: "AUDIT_TRAIL",
    tenantId,
  });

  expect(slice.orderingBasis).toBe("AUDIT_STREAM_SEQUENCE");
  expect(slice.orderedEventRefs).toEqual([
    "audit.pc0194.001",
    "audit.pc0194.002",
    "audit.pc0194.003",
  ]);

  const frame = await buildAuditInvestigationFrame({
    activeFilters,
    events: auditEvents(),
    exportPosture: {
      reason_codes: [],
      state: "FULL_ALLOWED",
    },
    focusEventRef: "audit.pc0194.002",
    includeStaffOnlySupportingRefs: true,
    limit: 3,
    queryAnchorRef: manifestRef,
    queryContractCode: "AUDIT_TRAIL",
    selectedObjectRef: targetObjectRef,
    tenantId,
    updatedAt: "2026-05-04T09:04:00.000Z",
  });

  expect(frame.audit_workspace.surface_order).toEqual([
    "INVENTORY_RAIL",
    "WORKSPACE_CANVAS",
    "EVENT_DIFF_INSPECTOR",
    "AUDIT_SIDECAR",
  ]);
  expect(frame.ordered_event_refs).toEqual(slice.orderedEventRefs);
  expect(frame.audit_tape.rows.map((row) => row.event_ref)).toEqual(frame.ordered_event_refs);
  expect(frame.focus_anchor_ref).toBe("audit.pc0194.002");
  expect(frame.audit_workspace.selected_object_ref_or_null).toBe(targetObjectRef);
  expect(frame.object_neighborhood).toMatchObject({
    downstream_event_refs: ["audit.pc0194.003"],
    object_refs: [
      targetObjectRef,
      "authority://hmrc/vat",
      "submission://pc0194/vat",
    ],
    selected_event_ref: "audit.pc0194.002",
    selected_object_ref_or_null: targetObjectRef,
    upstream_event_refs: ["audit.pc0194.001"],
  });
  expect(frame.event_diff_inspector).toMatchObject({
    comparison_event_ref_or_null: "audit.pc0194.002",
    panel_mode: "CHANGE_NUCLEI",
    raw_payload_posture: "SUMMARY_FIRST",
  });
  expect(frame.export_eligibility_panel).toMatchObject({
    active_slice_scope_ref: manifestRef,
    invocation_posture: "ACTIVE_FILTERED_SLICE",
    panel_mode: "FULL_EXPORT_READY",
  });

  await validateContractSchema("audit_investigation_frame", frame);
});

test("keeps selected event stable when focus resolves outside the requested page", async () => {
  const frame = await buildAuditInvestigationFrame({
    activeFilters: {
      manifest_refs: [manifestRef],
      object_refs: [targetObjectRef],
      window_from: "2026-05-04T09:00:00.000Z",
      window_to: "2026-05-04T09:03:00.000Z",
    },
    cursorOffset: 0,
    events: auditEvents(),
    exportPosture: {
      reason_codes: [],
      state: "FULL_ALLOWED",
    },
    focusEventRef: "audit.pc0194.003",
    limit: 2,
    queryAnchorRef: manifestRef,
    queryContractCode: "AUDIT_TRAIL",
    selectedObjectRef: targetObjectRef,
    tenantId,
  });

  expect(frame.ordered_event_refs).toEqual(["audit.pc0194.002", "audit.pc0194.003"]);
  expect(frame.audit_workspace.selected_event_ref).toBe("audit.pc0194.003");
  expect(frame.audit_tape.selected_event_ref).toBe("audit.pc0194.003");
  expect(frame.object_neighborhood.selected_event_ref).toBe("audit.pc0194.003");

  await validateContractSchema("audit_investigation_frame", frame);
});

test("rejects inverted audit filter windows before frame projection", () => {
  expect(() =>
    queryAuditSlice({
      activeFilters: {
        manifest_refs: [manifestRef],
        object_refs: [targetObjectRef],
        window_from: "2026-05-04T10:00:00.000Z",
        window_to: "2026-05-04T09:00:00.000Z",
      },
      events: auditEvents(),
      limit: 3,
      queryAnchorRef: manifestRef,
      queryContractCode: "AUDIT_TRAIL",
      tenantId,
    }),
  ).toThrow(/AUDIT_SLICE_WINDOW_INVALID/);
});

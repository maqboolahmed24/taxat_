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

test("run timeline slices use recorded-at ordering while preserving audit refs and traces", async () => {
  const slice = queryAuditSlice({
    events: auditEvents(),
    limit: 3,
    queryAnchorRef: manifestRef,
    queryContractCode: "RUN_TIMELINE",
    tenantId,
  });

  expect(slice.orderingBasis).toBe("RECORDED_AT_THEN_STREAM_SEQUENCE");
  expect(slice.activeFilters.manifest_refs).toEqual([manifestRef]);
  expect(slice.orderedEventRefs).toEqual([
    "audit.pc0194.002",
    "audit.pc0194.003",
    "audit.pc0194.001",
  ]);

  const frame = await buildAuditInvestigationFrame({
    events: auditEvents(),
    exportPosture: {
      reason_codes: ["STAFF_ONLY_TRACE_SUPPORT"],
      state: "MASKED_ONLY",
    },
    includeStaffOnlySupportingRefs: true,
    limit: 3,
    queryAnchorRef: manifestRef,
    queryContractCode: "RUN_TIMELINE",
    selectedObjectRef: targetObjectRef,
    tenantId,
  });

  expect(frame.query_contract_code).toBe("RUN_TIMELINE");
  expect(frame.ordering_basis).toBe("RECORDED_AT_THEN_STREAM_SEQUENCE");
  expect(frame.supporting_trace_span_refs).toEqual([
    "trace://pc0194/spans/001",
    "trace://pc0194/spans/002",
    "trace://pc0194/spans/003",
  ]);
  expect(frame.export_eligibility_panel).toMatchObject({
    active_slice_scope_ref: manifestRef,
    panel_mode: "MASKED_EXPORT_ONLY",
    reason_codes: ["STAFF_ONLY_TRACE_SUPPORT"],
    state: "MASKED_ONLY",
  });
  expect(frame.audit_workspace.promoted_support_surface).toBe("EXPORT_ELIGIBILITY_PANEL");
  expect(frame.event_diff_inspector.panel_mode).toBe("MASKED_CHANGE_NUCLEI");
  expect(frame.externalization_governance_contract).toMatchObject({
    blocking_context_tokens: ["STAFF_ONLY_TRACE_SUPPORT"],
    context_anchor_ref: manifestRef,
    delivery_surface_kind: "FILTERED_AUDIT_EXPORT",
    history_meaning_state: "ACTIVE_FILTERED_SLICE",
    masking_state: "MASKED_EXPORT_ONLY",
    slice_binding_ref: manifestRef,
  });

  await validateContractSchema("audit_investigation_frame", frame);
});

test("restricted export postures never serialize full-export readiness or detached slices", async () => {
  for (const exportPosture of [
    {
      reason_codes: ["MASKED_FOR_LIMITED_READER"],
      state: "MASKED_ONLY" as const,
    },
    {
      reason_codes: ["INVESTIGATION_APPROVAL_REQUIRED"],
      state: "APPROVAL_REQUIRED" as const,
    },
    {
      reason_codes: ["AUDIT_EXPORT_POLICY_DENIED"],
      state: "DENIED" as const,
    },
  ]) {
    const frame = await buildAuditInvestigationFrame({
      activeFilters: {
        manifest_refs: [manifestRef],
        object_refs: [targetObjectRef],
      },
      events: auditEvents(),
      exportPosture,
      limit: 3,
      queryAnchorRef: manifestRef,
      queryContractCode: "AUDIT_TRAIL",
      selectedObjectRef: targetObjectRef,
      tenantId,
    });

    expect(frame.export_eligibility_panel.panel_mode).not.toBe("FULL_EXPORT_READY");
    expect(frame.export_eligibility_panel.active_slice_scope_ref).toBe(frame.query_anchor_ref);
    expect(frame.export_eligibility_panel.invocation_posture).toBe("ACTIVE_FILTERED_SLICE");
    expect(frame.audit_workspace.promoted_support_surface).toBe("EXPORT_ELIGIBILITY_PANEL");
    if (exportPosture.state === "APPROVAL_REQUIRED") {
      expect(frame.externalization_governance_contract.approval_requirement_token_or_null).toBe(
        frame.export_eligibility_panel.approval_requirement_ref_or_null,
      );
    }
    if (exportPosture.state === "DENIED") {
      expect(frame.event_diff_inspector.panel_mode).toBe("LIMITATION_NOTICE");
      expect(frame.externalization_governance_contract.eligibility_state).toBe("BLOCKED");
      expect(frame.externalization_governance_contract.masking_state).toBe("NOT_APPLICABLE");
    }

    await validateContractSchema("audit_investigation_frame", frame);
  }
});

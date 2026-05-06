import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import type { StoredAuditEvent } from "../../../audit/src/index.ts";
import type {
  AuditInvestigationFrame,
  AuditInvestigationFrameExportEligibilityPanel,
  AuditInvestigationFrameExportPosture,
} from "../../../../packages/generated-models/src/generated/typescript/governance-and-policy.ts";
import type { ExternalizationGovernanceContract } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import { buildGovernanceInteractionLayer } from "../../../backend-governance/src/projectors/build_governance_interaction_layer.ts";
import {
  encodeAuditQueryCursor,
  type MappedAuditQuery,
} from "./map_audit_query_filters_and_cursor.ts";

export type AuditQueryFrameBuildInput = {
  events: readonly StoredAuditEvent[];
  exportPosture: AuditInvestigationFrameExportPosture;
  includeStaffOnlySupportingRefs: boolean;
  mappedQuery: MappedAuditQuery;
  objectAnchorRef: string;
  tenantId: string;
  updatedAt?: string | null;
};

export class AuditInvestigationFrameValidationError extends Error {
  readonly reasonCodes: string[];

  constructor(reasonCodes: readonly string[], detail: string) {
    super(detail);
    this.name = "AuditInvestigationFrameValidationError";
    this.reasonCodes = [...reasonCodes];
  }
}

function unique(values: readonly (string | null | undefined)[]) {
  return [
    ...new Set(
      values
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  ].sort();
}

function assertNoEmptyValues(fieldName: string, values: readonly string[]) {
  if (values.some((value) => value.trim().length === 0)) {
    throw new AuditInvestigationFrameValidationError(
      ["AUDIT_FRAME_EMPTY_TOKEN"],
      `${fieldName} cannot contain empty strings`,
    );
  }
}

function assertFrame(frame: AuditInvestigationFrame) {
  const requiredStrings = [
    ["frame_id", frame.frame_id],
    ["tenant_id", frame.tenant_id],
    ["object_anchor_ref", frame.object_anchor_ref],
    ["dominant_question", frame.dominant_question],
    ["query_anchor_ref", frame.query_anchor_ref],
    ["focus_anchor_ref", frame.focus_anchor_ref],
    ["updated_at", frame.updated_at],
  ] as const;
  for (const [fieldName, value] of requiredStrings) {
    if (value.trim().length === 0) {
      throw new AuditInvestigationFrameValidationError(
        ["AUDIT_FRAME_EMPTY_TOKEN"],
        `${fieldName} must be non-empty`,
      );
    }
  }
  if (frame.ordered_event_refs.length === 0) {
    throw new AuditInvestigationFrameValidationError(
      ["AUDIT_FRAME_EMPTY_EVENT_REFS"],
      "audit frame requires ordered_event_refs",
    );
  }
  assertNoEmptyValues("ordered_event_refs", frame.ordered_event_refs);
  assertNoEmptyValues("correlation_keys", frame.correlation_keys);
  assertNoEmptyValues("object_neighborhood_refs", frame.object_neighborhood_refs);
  assertNoEmptyValues("export_posture.reason_codes", frame.export_posture.reason_codes);
  if (frame.next_cursor !== null && frame.next_cursor !== undefined && frame.next_cursor.length === 0) {
    throw new AuditInvestigationFrameValidationError(
      ["AUDIT_FRAME_EMPTY_CURSOR"],
      "audit frame next_cursor cannot be empty",
    );
  }
  const filters = frame.active_filters;
  for (const [name, values] of Object.entries({
    actor_refs: filters.actor_refs,
    authority_operation_refs: filters.authority_operation_refs,
    client_refs: filters.client_refs,
    event_families: filters.event_families,
    manifest_refs: filters.manifest_refs,
    object_refs: filters.object_refs,
  })) {
    assertNoEmptyValues(`active_filters.${name}`, values);
  }
  if (frame.query_contract_code === "AUDIT_TRAIL" && frame.ordering_basis !== "AUDIT_STREAM_SEQUENCE") {
    throw new AuditInvestigationFrameValidationError(
      ["AUDIT_FRAME_ORDERING_BASIS_INVALID"],
      "AUDIT_TRAIL requires AUDIT_STREAM_SEQUENCE",
    );
  }
  if (
    frame.query_contract_code !== "AUDIT_TRAIL" &&
    frame.ordering_basis !== "RECORDED_AT_THEN_STREAM_SEQUENCE"
  ) {
    throw new AuditInvestigationFrameValidationError(
      ["AUDIT_FRAME_ORDERING_BASIS_INVALID"],
      "timeline and ledger audit frames require RECORDED_AT_THEN_STREAM_SEQUENCE",
    );
  }
  if (
    frame.supporting_log_record_refs.length > 0 &&
    frame.ordered_event_refs.length === 0
  ) {
    throw new AuditInvestigationFrameValidationError(
      ["AUDIT_LOGS_CANNOT_REPLACE_EVIDENCE"],
      "supporting logs cannot replace ordered audit evidence",
    );
  }
}

function selectedEvent(input: {
  events: readonly StoredAuditEvent[];
  focusEventRef: string | null;
}) {
  if (input.focusEventRef !== null) {
    return (
      input.events.find((entry) => entry.event.audit_event_id === input.focusEventRef) ??
      input.events[0]
    );
  }
  return input.events.length > 1 ? input.events[1] : input.events[0];
}

function eventRef(entry: StoredAuditEvent) {
  return entry.event.audit_event_id;
}

function primaryObjectRef(entry: StoredAuditEvent) {
  return entry.event.object_refs[0] ?? entry.event.manifest_id ?? entry.event.audit_stream_ref;
}

function traceSpanRefs(events: readonly StoredAuditEvent[]) {
  return unique(
    events.map((entry) => {
      const traceId = entry.event.correlation_context.trace_id;
      const spanId = entry.event.correlation_context.span_id;
      if (!traceId || !spanId) {
        return null;
      }
      return `trace://${traceId}/spans/${spanId}`;
    }),
  );
}

function logRecordRefs(events: readonly StoredAuditEvent[]) {
  return unique(
    events.flatMap((entry) =>
      entry.event.object_refs.filter((objectRef) => objectRef.startsWith("log://")),
    ),
  );
}

function correlationKeys(input: {
  events: readonly StoredAuditEvent[];
  mappedQuery: MappedAuditQuery;
  tenantId: string;
}) {
  const values = input.events.flatMap((entry) => {
    const context = entry.event.correlation_context;
    return [
      "tenant_id",
      entry.event.manifest_id || context.manifest_id ? "manifest_id" : null,
      entry.event.client_id || context.client_id ? "client_id" : null,
      context.authority_operation_id ? "authority_operation_id" : null,
      context.submission_record_id ? "submission_record_id" : null,
      entry.event.object_refs.length > 0 ? "object_refs" : null,
      context.trace_id ? "trace_id" : null,
    ];
  });
  return unique([
    "query_anchor_ref",
    "tenant_id",
    ...values,
  ]);
}

function frameId(input: {
  eventRefs: readonly string[];
  mappedQuery: MappedAuditQuery;
  tenantId: string;
}) {
  return `audit-frame.${stableJsonHash({
    event_refs: input.eventRefs,
    mapped_query: input.mappedQuery,
    tenant_id: input.tenantId,
  })}`;
}

function deliveryBindingHash(
  contract: Omit<ExternalizationGovernanceContract, "delivery_binding_hash">,
) {
  return stableJsonHash({
    access_binding_hash_or_null: contract.access_binding_hash_or_null,
    approval_requirement_token_or_null: contract.approval_requirement_token_or_null,
    approval_state: contract.approval_state,
    blocking_context_tokens: [...contract.blocking_context_tokens].sort(),
    boundary_scope: contract.boundary_scope,
    context_anchor_ref: contract.context_anchor_ref,
    delivery_surface_kind: contract.delivery_surface_kind,
    download_target_ref_or_null: contract.download_target_ref_or_null,
    eligibility_state: contract.eligibility_state,
    external_handoff_target_ref_or_null: contract.external_handoff_target_ref_or_null,
    history_meaning_state: contract.history_meaning_state,
    limitation_state: contract.limitation_state,
    masking_posture_fingerprint_or_null: contract.masking_posture_fingerprint_or_null,
    masking_state: contract.masking_state,
    preview_target_ref_or_null: contract.preview_target_ref_or_null,
    print_target_ref_or_null: contract.print_target_ref_or_null,
    shell_family_or_null: contract.shell_family_or_null,
    slice_binding_ref: contract.slice_binding_ref,
    tenant_id: contract.tenant_id,
    visibility_cache_partition_key_or_null: contract.visibility_cache_partition_key_or_null,
  });
}

function exportPanel(input: {
  frameId: string;
  posture: AuditInvestigationFrameExportPosture;
  queryAnchorRef: string;
}): AuditInvestigationFrameExportEligibilityPanel {
  switch (input.posture.state) {
    case "FULL_ALLOWED":
      return {
        active_slice_scope_ref: input.queryAnchorRef,
        approval_requirement_ref_or_null: null,
        invocation_posture: "ACTIVE_FILTERED_SLICE",
        masked_preview_ref_or_null: null,
        panel_mode: "FULL_EXPORT_READY",
        reason_codes: [],
        state: "FULL_ALLOWED",
      };
    case "MASKED_ONLY":
      return {
        active_slice_scope_ref: input.queryAnchorRef,
        approval_requirement_ref_or_null: null,
        invocation_posture: "ACTIVE_FILTERED_SLICE",
        masked_preview_ref_or_null: `audit-preview://${input.frameId}/masked`,
        panel_mode: "MASKED_EXPORT_ONLY",
        reason_codes: [...input.posture.reason_codes],
        state: "MASKED_ONLY",
      };
    case "APPROVAL_REQUIRED":
      return {
        active_slice_scope_ref: input.queryAnchorRef,
        approval_requirement_ref_or_null: `approval://audit-export/${input.frameId}`,
        invocation_posture: "ACTIVE_FILTERED_SLICE",
        masked_preview_ref_or_null: null,
        panel_mode: "APPROVAL_GATE",
        reason_codes: [...input.posture.reason_codes],
        state: "APPROVAL_REQUIRED",
      };
    case "DENIED":
      return {
        active_slice_scope_ref: input.queryAnchorRef,
        approval_requirement_ref_or_null: null,
        invocation_posture: "ACTIVE_FILTERED_SLICE",
        masked_preview_ref_or_null: null,
        panel_mode: "DENIED_NOTICE",
        reason_codes: [...input.posture.reason_codes],
        state: "DENIED",
      };
  }
}

function externalizationContract(input: {
  exportPanel: AuditInvestigationFrameExportEligibilityPanel;
  frameId: string;
  posture: AuditInvestigationFrameExportPosture;
  queryAnchorRef: string;
  tenantId: string;
  integrityChainPosture: AuditInvestigationFrame["integrity_chain_posture"];
}): ExternalizationGovernanceContract {
  const eligibilityState = {
    APPROVAL_REQUIRED: "APPROVAL_REQUIRED",
    DENIED: "BLOCKED",
    FULL_ALLOWED: "READY",
    MASKED_ONLY: "MASKED_ONLY",
  }[input.posture.state] as ExternalizationGovernanceContract["eligibility_state"];
  const approvalState =
    input.posture.state === "APPROVAL_REQUIRED"
      ? "REQUIRED_PENDING"
      : input.posture.state === "DENIED"
        ? "DENIED"
        : "NOT_REQUIRED";
  const withoutHash: Omit<ExternalizationGovernanceContract, "delivery_binding_hash"> = {
    access_binding_hash_or_null: null,
    approval_requirement_token_or_null:
      input.posture.state === "APPROVAL_REQUIRED"
        ? input.exportPanel.approval_requirement_ref_or_null
        : null,
    approval_state: approvalState,
    background_scope_policy: "DETACHED_BACKGROUND_SCOPE_FORBIDDEN",
    blocking_context_tokens: [...input.posture.reason_codes],
    boundary_scope: "AUDIT_INVESTIGATION_FRAME",
    context_anchor_ref: input.queryAnchorRef,
    contract_version: "EXTERNALIZATION_GOVERNANCE_V1",
    delivery_context_policy: "TENANT_AND_SECURITY_CONTEXT_BOUND_AT_INVOCATION",
    delivery_surface_kind: "FILTERED_AUDIT_EXPORT",
    direct_url_policy: "DIRECT_URL_BYPASS_FORBIDDEN",
    download_target_ref_or_null: null,
    eligibility_state: eligibilityState,
    external_handoff_target_ref_or_null: null,
    handoff_target_policy: "EXTERNAL_TARGET_AND_BLOCKING_CONTEXT_EXPLICIT",
    history_meaning_state: "ACTIVE_FILTERED_SLICE",
    limitation_state:
      input.integrityChainPosture === "VERIFIED" ? "FULL" : "INTEGRITY_LIMITED",
    masking_posture_fingerprint_or_null: null,
    masking_state:
      input.posture.state === "MASKED_ONLY"
        ? "MASKED_EXPORT_ONLY"
        : input.posture.state === "DENIED"
          ? "NOT_APPLICABLE"
          : "NONE",
    posture_preservation_policy: "CURRENT_HISTORY_MASKING_LIMITATION_AND_APPROVAL_PRESERVED",
    preview_target_ref_or_null: input.exportPanel.masked_preview_ref_or_null,
    print_target_ref_or_null: null,
    reentry_validation_policy: "RETURN_AND_DELIVERY_REQUIRE_GOVERNED_REVALIDATION",
    shell_family_or_null: "GOVERNANCE_DENSITY_SHELL",
    signed_url_binding_policy: "SIGNED_URLS_REQUIRE_CURRENT_GOVERNED_BINDING",
    slice_binding_policy: "ACTIVE_GOVERNED_SLICE_REQUIRED",
    slice_binding_ref: input.queryAnchorRef,
    temporary_artifact_policy: "TEMP_FILES_AND_NATIVE_PREVIEWS_REQUIRE_MATCHING_BINDING",
    tenant_id: input.tenantId,
    visibility_cache_partition_key_or_null: null,
  };
  return {
    ...withoutHash,
    delivery_binding_hash: deliveryBindingHash(withoutHash),
  };
}

function dominantQuestion(queryContractCode: MappedAuditQuery["queryContractCode"]) {
  switch (queryContractCode) {
    case "AUDIT_TRAIL":
      return "Which durable audit events explain this object in canonical order?";
    case "FILING_EVIDENCE_LEDGER":
      return "Which filing evidence events and provenance refs support this filing episode?";
    case "RUN_TIMELINE":
      return "Which audit milestones and supporting traces explain this run timeline?";
  }
}

export function buildAuditInvestigationFrame(
  input: AuditQueryFrameBuildInput,
): AuditInvestigationFrame {
  if (input.events.length === 0) {
    throw new AuditInvestigationFrameValidationError(
      ["AUDIT_FRAME_EMPTY_EVENT_REFS"],
      "cannot build an audit frame without ordered events",
    );
  }
  const selected = selectedEvent({
    events: input.events,
    focusEventRef: input.mappedQuery.focusEventRef,
  });
  const eventRefs = input.events.map(eventRef);
  const id = frameId({
    eventRefs,
    mappedQuery: input.mappedQuery,
    tenantId: input.tenantId,
  });
  const panel = exportPanel({
    frameId: id,
    posture: input.exportPosture,
    queryAnchorRef: input.mappedQuery.queryAnchorRef,
  });
  const nextOffset = input.mappedQuery.cursorOffset + input.events.length;
  const objectRefs = unique(input.events.flatMap((entry) => entry.event.object_refs));
  const selectedObjectRef = primaryObjectRef(selected);
  const selectedIndex = input.events.findIndex(
    (entry) => entry.event.audit_event_id === selected.event.audit_event_id,
  );
  const upstream = input.events.slice(0, selectedIndex).map(eventRef);
  const downstream = input.events.slice(selectedIndex + 1).map(eventRef);
  const neighborhoodRefs = objectRefs.length > 0 ? objectRefs : [selectedObjectRef];
  const baselineForDiff =
    selectedIndex > 0
      ? input.events[selectedIndex - 1]
      : selectedIndex === 0
        ? input.events[1]
        : undefined;
  const eventDiffInspector: AuditInvestigationFrame["event_diff_inspector"] =
    baselineForDiff === undefined || input.exportPosture.state === "DENIED"
      ? {
          baseline_event_ref_or_null: null,
          changed_field_refs: [],
          comparison_event_ref_or_null: null,
          panel_mode: "LIMITATION_NOTICE",
          raw_payload_posture: "SUMMARY_FIRST",
          summary_ref_or_null: `audit-summary://${id}`,
        }
      : {
          baseline_event_ref_or_null: baselineForDiff.event.audit_event_id,
          changed_field_refs: ["event_type", "reason_codes"],
          comparison_event_ref_or_null: selected.event.audit_event_id,
          panel_mode:
            input.exportPosture.state === "MASKED_ONLY"
              ? "MASKED_CHANGE_NUCLEI"
              : "CHANGE_NUCLEI",
          raw_payload_posture: "SUMMARY_FIRST",
          summary_ref_or_null: `audit-diff://${id}`,
        };
  const frame: AuditInvestigationFrame = {
    active_filters: input.mappedQuery.activeFilters,
    artifact_type: "AuditInvestigationFrame",
    audit_tape: {
      rows: input.events.map((entry) => ({
        actor_or_service_ref_or_null: entry.event.actor_ref ?? entry.event.service_ref,
        diff_available: entry.event.object_refs.length > 0 || entry.event.reason_codes.length > 0,
        event_ref: entry.event.audit_event_id,
        family_ref: entry.event_family_ref,
        primary_object_ref_or_null: entry.event.object_refs[0] ?? null,
      })),
      selected_event_ref: selected.event.audit_event_id,
      timeline_mode: "APPEND_ONLY",
    },
    audit_workspace: {
      active_filters: input.mappedQuery.activeFilters,
      promoted_support_surface:
        input.exportPosture.state === "FULL_ALLOWED"
          ? "AUDIT_SIDECAR"
          : "EXPORT_ELIGIBILITY_PANEL",
      selected_event_ref: selected.event.audit_event_id,
      selected_object_ref_or_null: selectedObjectRef,
      surface_order: [
        "INVENTORY_RAIL",
        "WORKSPACE_CANVAS",
        "EVENT_DIFF_INSPECTOR",
        "AUDIT_SIDECAR",
      ],
      workspace_mode:
        input.mappedQuery.queryContractCode === "RUN_TIMELINE"
          ? "CORRELATION_TRACE"
          : "EVENT_TIMELINE",
    },
    correlation_keys: correlationKeys({
      events: input.events,
      mappedQuery: input.mappedQuery,
      tenantId: input.tenantId,
    }),
    dominant_question: dominantQuestion(input.mappedQuery.queryContractCode),
    event_diff_inspector: eventDiffInspector,
    export_eligibility_panel: panel,
    export_posture: input.exportPosture,
    externalization_governance_contract: externalizationContract({
      exportPanel: panel,
      frameId: id,
      integrityChainPosture: "VERIFIED",
      posture: input.exportPosture,
      queryAnchorRef: input.mappedQuery.queryAnchorRef,
      tenantId: input.tenantId,
    }),
    focus_anchor_ref:
      input.mappedQuery.focusAnchorRef ?? selected.event.audit_event_id,
    frame_id: id,
    integrity_chain_posture: "VERIFIED",
    interaction_layer: buildGovernanceInteractionLayer({
      activeFilters: input.mappedQuery.activeFilters,
      routeFamily: "audit_investigation",
    }),
    next_cursor:
      input.events.length === input.mappedQuery.limit
        ? encodeAuditQueryCursor({
            nextOffset,
            queryHash: input.mappedQuery.queryHash,
          })
        : null,
    object_anchor_ref: input.mappedQuery.queryAnchorRef,
    object_neighborhood: {
      downstream_event_refs: downstream,
      neighborhood_mode: "UPSTREAM_DOWNSTREAM",
      object_refs: neighborhoodRefs,
      selected_event_ref: selected.event.audit_event_id,
      selected_object_ref_or_null: selectedObjectRef,
      upstream_event_refs: upstream,
    } as AuditInvestigationFrame["object_neighborhood"],
    object_neighborhood_refs: neighborhoodRefs,
    ordered_event_refs: eventRefs,
    ordering_basis: input.mappedQuery.orderingBasis,
    query_anchor_ref: input.mappedQuery.queryAnchorRef,
    query_contract_code: input.mappedQuery.queryContractCode,
    recovery_posture: "NONE",
    settlement_state: "STEADY",
    shell_family: "GOVERNANCE_DENSITY_SHELL",
    supporting_log_record_refs: input.includeStaffOnlySupportingRefs
      ? logRecordRefs(input.events)
      : [],
    supporting_trace_span_refs: input.includeStaffOnlySupportingRefs
      ? traceSpanRefs(input.events)
      : [],
    tenant_id: input.tenantId,
    updated_at:
      input.updatedAt ??
      input.events
        .map((entry) => entry.event.recorded_at)
        .sort()
        .at(-1) ??
      new Date(0).toISOString(),
  };

  if (
    frame.query_contract_code === "RUN_TIMELINE" &&
    frame.supporting_trace_span_refs.length === 0 &&
    input.includeStaffOnlySupportingRefs
  ) {
    frame.supporting_trace_span_refs = [
      `trace://${input.mappedQuery.queryAnchorRef}/audit-milestone`,
    ];
  }

  assertFrame(frame);
  return frame;
}

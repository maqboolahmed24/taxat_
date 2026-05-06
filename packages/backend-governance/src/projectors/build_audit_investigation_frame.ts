import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import type { ExternalizationGovernanceContract } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type {
  AuditInvestigationFrame,
  AuditInvestigationFrameExportPosture,
} from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import { buildGovernanceInteractionLayer } from "./build_governance_interaction_layer.ts";
import {
  queryAuditSlice,
  type AuditInvestigationQueryContractCode,
  type AuditSliceEvent,
  type AuditSliceEventInput,
  type QueryAuditSliceInput,
} from "../queries/query_audit_slice.ts";
import { buildEventDiffInspector } from "../services/build_event_diff_inspector.ts";
import { buildExportEligibilityPanel } from "../services/build_export_eligibility_panel.ts";
import { buildObjectNeighborhood } from "../services/build_object_neighborhood.ts";

export type BuildAuditInvestigationFrameInput = Omit<
  QueryAuditSliceInput,
  "orderingBasis"
> & {
  dominantQuestion?: string | undefined;
  exportPosture?: AuditInvestigationFrameExportPosture | undefined;
  includeStaffOnlySupportingRefs?: boolean | undefined;
  integrityChainPosture?: AuditInvestigationFrame["integrity_chain_posture"] | undefined;
  recoveryPosture?: AuditInvestigationFrame["recovery_posture"] | undefined;
  settlementState?: AuditInvestigationFrame["settlement_state"] | undefined;
  updatedAt?: string | undefined;
};

function uniqueSorted(values: readonly string[]) {
  return [
    ...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)),
  ].sort((left, right) => left.localeCompare(right));
}

function dominantQuestion(queryContractCode: AuditInvestigationQueryContractCode) {
  switch (queryContractCode) {
    case "AUDIT_TRAIL":
      return "Which durable audit events explain this object in canonical order?";
    case "RUN_TIMELINE":
      return "Which audit milestones and supporting traces explain this run timeline?";
    case "NIGHTLY_BATCH_TIMELINE":
      return "Which nightly batch milestones explain the run and recovery lineage?";
    case "FILING_EVIDENCE_LEDGER":
      return "Which filing evidence events and provenance refs support this filing episode?";
    case "PRIVACY_ACTION_LEDGER":
      return "Which masking, hold, export, and erasure actions affect this client scope?";
  }
}

function workspaceMode(queryContractCode: AuditInvestigationQueryContractCode) {
  switch (queryContractCode) {
    case "RUN_TIMELINE":
    case "NIGHTLY_BATCH_TIMELINE":
      return "CORRELATION_TRACE" as const;
    case "PRIVACY_ACTION_LEDGER":
      return "OBJECT_TIMELINE" as const;
    case "AUDIT_TRAIL":
    case "FILING_EVIDENCE_LEDGER":
      return "EVENT_TIMELINE" as const;
  }
}

function frameIdFor(input: {
  activeFilters: AuditInvestigationFrame["active_filters"];
  orderedEventRefs: readonly string[];
  queryAnchorRef: string;
  queryContractCode: AuditInvestigationQueryContractCode;
  tenantId: string;
}) {
  return `audit-investigation-frame.${stableJsonHash({
    active_filters: input.activeFilters,
    ordered_event_refs: input.orderedEventRefs,
    query_anchor_ref: input.queryAnchorRef,
    query_contract_code: input.queryContractCode,
    tenant_id: input.tenantId,
  }).slice(0, 24)}`;
}

function supportTraceSpanRefs(input: {
  events: readonly AuditSliceEvent[];
  includeStaffOnlySupportingRefs: boolean;
  queryAnchorRef: string;
  queryContractCode: AuditInvestigationQueryContractCode;
}) {
  const refs = input.includeStaffOnlySupportingRefs
    ? uniqueSorted(input.events.flatMap((event) => event.traceSpanRefs))
    : [];
  if (refs.length > 0) {
    return refs;
  }
  return input.queryContractCode === "RUN_TIMELINE" ||
    input.queryContractCode === "NIGHTLY_BATCH_TIMELINE"
    ? [`trace://${input.queryAnchorRef}/audit-milestone`]
    : [];
}

function supportLogRecordRefs(input: {
  events: readonly AuditSliceEvent[];
  includeStaffOnlySupportingRefs: boolean;
}) {
  return input.includeStaffOnlySupportingRefs
    ? uniqueSorted(input.events.flatMap((event) => event.logRecordRefs))
    : [];
}

function correlationKeys(input: {
  activeFilters: AuditInvestigationFrame["active_filters"];
  events: readonly AuditSliceEvent[];
  queryContractCode: AuditInvestigationQueryContractCode;
}) {
  const keys = [
    "query_anchor_ref",
    "tenant_id",
    ...input.events.flatMap((event) => event.correlationKeys),
    ...(input.activeFilters.actor_refs.length > 0 ? ["actor_ref"] : []),
    ...(input.activeFilters.authority_operation_refs.length > 0
      ? ["authority_operation_id"]
      : []),
    ...(input.activeFilters.client_refs.length > 0 ? ["client_id"] : []),
    ...(input.activeFilters.manifest_refs.length > 0 ? ["manifest_id"] : []),
    ...(input.activeFilters.object_refs.length > 0 ? ["object_refs"] : []),
    ...(input.queryContractCode === "FILING_EVIDENCE_LEDGER" ? ["submission_record_id"] : []),
    ...(input.queryContractCode === "NIGHTLY_BATCH_TIMELINE" ? ["nightly_batch_run_ref"] : []),
  ];
  return uniqueSorted(keys);
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

function externalizationContract(input: {
  exportPanel: AuditInvestigationFrame["export_eligibility_panel"];
  exportPosture: AuditInvestigationFrame["export_posture"];
  integrityChainPosture: AuditInvestigationFrame["integrity_chain_posture"];
  queryAnchorRef: string;
  tenantId: string;
}) {
  const eligibility_state = {
    APPROVAL_REQUIRED: "APPROVAL_REQUIRED",
    DENIED: "BLOCKED",
    FULL_ALLOWED: "READY",
    MASKED_ONLY: "MASKED_ONLY",
  }[input.exportPosture.state] as ExternalizationGovernanceContract["eligibility_state"];
  const approval_state = {
    APPROVAL_REQUIRED: "REQUIRED_PENDING",
    DENIED: "DENIED",
    FULL_ALLOWED: "NOT_REQUIRED",
    MASKED_ONLY: "NOT_REQUIRED",
  }[input.exportPosture.state] as ExternalizationGovernanceContract["approval_state"];
  const masking_state = {
    APPROVAL_REQUIRED: "NONE",
    DENIED: "NOT_APPLICABLE",
    FULL_ALLOWED: "NONE",
    MASKED_ONLY: "MASKED_EXPORT_ONLY",
  }[input.exportPosture.state] as ExternalizationGovernanceContract["masking_state"];
  const base = {
    access_binding_hash_or_null: null,
    approval_requirement_token_or_null:
      input.exportPosture.state === "APPROVAL_REQUIRED"
        ? input.exportPanel.approval_requirement_ref_or_null
        : null,
    approval_state,
    background_scope_policy: "DETACHED_BACKGROUND_SCOPE_FORBIDDEN",
    blocking_context_tokens: [...input.exportPosture.reason_codes],
    boundary_scope: "AUDIT_INVESTIGATION_FRAME",
    context_anchor_ref: input.queryAnchorRef,
    contract_version: "EXTERNALIZATION_GOVERNANCE_V1",
    delivery_context_policy: "TENANT_AND_SECURITY_CONTEXT_BOUND_AT_INVOCATION",
    delivery_surface_kind: "FILTERED_AUDIT_EXPORT",
    direct_url_policy: "DIRECT_URL_BYPASS_FORBIDDEN",
    download_target_ref_or_null: null,
    eligibility_state,
    external_handoff_target_ref_or_null: null,
    handoff_target_policy: "EXTERNAL_TARGET_AND_BLOCKING_CONTEXT_EXPLICIT",
    history_meaning_state: "ACTIVE_FILTERED_SLICE",
    limitation_state:
      input.integrityChainPosture === "VERIFIED" ? "FULL" : "INTEGRITY_LIMITED",
    masking_posture_fingerprint_or_null: null,
    masking_state,
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
  } satisfies Omit<ExternalizationGovernanceContract, "delivery_binding_hash">;

  return {
    ...base,
    delivery_binding_hash: deliveryBindingHash(base),
  };
}

export async function buildAuditInvestigationFrame(
  input: BuildAuditInvestigationFrameInput,
): Promise<AuditInvestigationFrame> {
  const tenantId = input.tenantId ?? input.events[0]?.tenantId;
  if (tenantId === undefined || tenantId.trim().length === 0) {
    throw new Error("AuditInvestigationFrame requires a non-empty tenant id");
  }
  const slice = queryAuditSlice({
    activeFilters: input.activeFilters,
    cursorOffset: input.cursorOffset,
    events: input.events,
    focusEventRef: input.focusEventRef,
    limit: input.limit,
    queryAnchorRef: input.queryAnchorRef,
    queryContractCode: input.queryContractCode,
    selectedObjectRef: input.selectedObjectRef,
    tenantId,
  });
  const frame_id = frameIdFor({
    activeFilters: slice.activeFilters,
    orderedEventRefs: slice.orderedEventRefs,
    queryAnchorRef: slice.queryAnchorRef,
    queryContractCode: slice.queryContractCode,
    tenantId,
  });
  const { export_eligibility_panel, export_posture } = buildExportEligibilityPanel({
    activeSliceScopeRef: slice.activeSliceScopeRef,
    exportPosture: input.exportPosture,
    frameId: frame_id,
  });
  const { object_neighborhood, object_neighborhood_refs } = buildObjectNeighborhood({
    orderedEvents: slice.orderedEvents,
    selectedEventRef: slice.selectedEventRef,
    selectedObjectRefOrNull: slice.selectedObjectRefOrNull,
  });
  const integrity_chain_posture = input.integrityChainPosture ?? "VERIFIED";
  const updated_at = normalizeUtcInstantString(
    input.updatedAt ??
      [...slice.orderedEvents.map((event) => event.recordedAt)].sort().at(-1) ??
      new Date(0).toISOString(),
  );

  return {
    active_filters: slice.activeFilters,
    artifact_type: "AuditInvestigationFrame",
    audit_tape: {
      rows: slice.orderedEvents.map((event) => ({
        actor_or_service_ref_or_null: event.actorOrServiceRefOrNull,
        diff_available: event.diffAvailable,
        event_ref: event.eventRef,
        family_ref: event.familyRef,
        primary_object_ref_or_null: event.primaryObjectRefOrNull,
      })),
      selected_event_ref: slice.selectedEventRef,
      timeline_mode: "APPEND_ONLY",
    },
    audit_workspace: {
      active_filters: slice.activeFilters,
      promoted_support_surface:
        export_posture.state === "FULL_ALLOWED"
          ? "AUDIT_SIDECAR"
          : "EXPORT_ELIGIBILITY_PANEL",
      selected_event_ref: slice.selectedEventRef,
      selected_object_ref_or_null: slice.selectedObjectRefOrNull,
      surface_order: [
        "INVENTORY_RAIL",
        "WORKSPACE_CANVAS",
        "EVENT_DIFF_INSPECTOR",
        "AUDIT_SIDECAR",
      ],
      workspace_mode: workspaceMode(slice.queryContractCode),
    },
    correlation_keys: correlationKeys({
      activeFilters: slice.activeFilters,
      events: slice.orderedEvents,
      queryContractCode: slice.queryContractCode,
    }),
    dominant_question: input.dominantQuestion ?? dominantQuestion(slice.queryContractCode),
    event_diff_inspector: buildEventDiffInspector({
      exportState: export_posture.state,
      frameId: frame_id,
      orderedEvents: slice.orderedEvents,
      selectedEventRef: slice.selectedEventRef,
    }),
    export_eligibility_panel,
    export_posture,
    externalization_governance_contract: externalizationContract({
      exportPanel: export_eligibility_panel,
      exportPosture: export_posture,
      integrityChainPosture: integrity_chain_posture,
      queryAnchorRef: slice.queryAnchorRef,
      tenantId,
    }),
    focus_anchor_ref: slice.selectedEventRef,
    frame_id,
    integrity_chain_posture,
    interaction_layer: buildGovernanceInteractionLayer({
      activeFilters: slice.activeFilters,
      routeFamily: "audit_investigation",
    }),
    next_cursor: slice.nextCursor,
    object_anchor_ref: slice.queryAnchorRef,
    object_neighborhood: object_neighborhood as AuditInvestigationFrame["object_neighborhood"],
    object_neighborhood_refs,
    ordered_event_refs: slice.orderedEventRefs,
    ordering_basis: slice.orderingBasis,
    query_anchor_ref: slice.queryAnchorRef,
    query_contract_code: slice.queryContractCode,
    recovery_posture: input.recoveryPosture ?? "NONE",
    settlement_state: input.settlementState ?? "STEADY",
    shell_family: "GOVERNANCE_DENSITY_SHELL",
    supporting_log_record_refs: supportLogRecordRefs({
      events: slice.orderedEvents,
      includeStaffOnlySupportingRefs: input.includeStaffOnlySupportingRefs ?? false,
    }),
    supporting_trace_span_refs: supportTraceSpanRefs({
      events: slice.orderedEvents,
      includeStaffOnlySupportingRefs: input.includeStaffOnlySupportingRefs ?? false,
      queryAnchorRef: slice.queryAnchorRef,
      queryContractCode: slice.queryContractCode,
    }),
    tenant_id: tenantId,
    updated_at,
  };
}

import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import type { RetentionGovernanceFrame } from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import { buildGovernanceInteractionLayer } from "./build_governance_interaction_layer.ts";
import {
  buildErasureQueue,
  type RetentionErasureQueueItemInput,
} from "../services/build_erasure_queue.ts";
import {
  buildLegalHoldRegister,
  type RetentionLegalHoldInput,
} from "../services/build_legal_hold_register.ts";
import { buildRetentionImpactPreview } from "../services/build_retention_impact_preview.ts";
import {
  buildRetentionPolicyMatrix,
  type RetentionPolicyRowInput,
} from "../services/build_retention_policy_matrix.ts";

type RetentionWorkspaceMode =
  RetentionGovernanceFrame["retention_workspace"]["workspace_mode"];
type RetentionWorkspaceFilters =
  RetentionGovernanceFrame["retention_workspace"]["active_filters"];

export type BuildRetentionGovernanceFrameInput = {
  activeFilters?: Partial<RetentionWorkspaceFilters> | undefined;
  erasureItems?: readonly RetentionErasureQueueItemInput[] | undefined;
  erasureQueueRef?: string | undefined;
  frameId?: string | undefined;
  legalHoldRegisterRef?: string | undefined;
  legalHolds?: readonly RetentionLegalHoldInput[] | undefined;
  policyRows: readonly RetentionPolicyRowInput[];
  policySnapshotHash: string;
  recoveryPosture?: RetentionGovernanceFrame["recovery_posture"] | undefined;
  selectedErasureItemRef?: string | null | undefined;
  selectedLegalHoldRef?: string | null | undefined;
  selectedPolicyRowRef?: string | null | undefined;
  settlementState?: RetentionGovernanceFrame["settlement_state"] | undefined;
  tenantId: string;
  updatedAt: string;
  workspaceMode?: RetentionWorkspaceMode | undefined;
};

const retentionSurfaceOrder = [
  "INVENTORY_RAIL",
  "WORKSPACE_CANVAS",
  "RETENTION_IMPACT_PREVIEW",
  "AUDIT_SIDECAR",
] as const satisfies readonly RetentionGovernanceFrame["retention_workspace"]["surface_order"][number][];

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))].sort((left, right) =>
    left.localeCompare(right),
  );
}

function mergeFilters(
  input: Partial<RetentionWorkspaceFilters> | undefined,
  required: RetentionWorkspaceFilters,
): RetentionWorkspaceFilters {
  return {
    artifact_classes: uniqueSorted([
      ...(input?.artifact_classes ?? []),
      ...required.artifact_classes,
    ]),
    client_refs: uniqueSorted([...(input?.client_refs ?? []), ...required.client_refs]),
    erasure_readiness_states: uniqueSorted([
      ...(input?.erasure_readiness_states ?? []),
      ...required.erasure_readiness_states,
    ]) as RetentionWorkspaceFilters["erasure_readiness_states"],
    legal_hold_states: uniqueSorted([
      ...(input?.legal_hold_states ?? []),
      ...required.legal_hold_states,
    ]) as RetentionWorkspaceFilters["legal_hold_states"],
    release_eligibility_states: uniqueSorted([
      ...(input?.release_eligibility_states ?? []),
      ...required.release_eligibility_states,
    ]) as RetentionWorkspaceFilters["release_eligibility_states"],
    retention_classes: uniqueSorted([
      ...(input?.retention_classes ?? []),
      ...required.retention_classes,
    ]),
  };
}

function resolveWorkspaceMode(input: {
  erasureItems: readonly RetentionErasureQueueItemInput[];
  legalHolds: readonly RetentionLegalHoldInput[];
  requestedMode?: RetentionWorkspaceMode | undefined;
  selectedErasureItemRef?: string | null | undefined;
  selectedLegalHoldRef?: string | null | undefined;
}) {
  const holdRefs = new Set(input.legalHolds.map((hold) => hold.holdRef));
  const erasureRefs = new Set(input.erasureItems.map((item) => item.itemRef));
  if (input.requestedMode === "LEGAL_HOLDS" && holdRefs.size > 0) {
    return "LEGAL_HOLDS" as const;
  }
  if (input.requestedMode === "ERASURE" && erasureRefs.size > 0) {
    return "ERASURE" as const;
  }
  if (input.requestedMode === "POLICIES") {
    return "POLICIES" as const;
  }
  if (input.selectedLegalHoldRef && holdRefs.has(input.selectedLegalHoldRef)) {
    return "LEGAL_HOLDS" as const;
  }
  if (input.selectedErasureItemRef && erasureRefs.has(input.selectedErasureItemRef)) {
    return "ERASURE" as const;
  }
  return "POLICIES" as const;
}

function frameIdFor(input: {
  mode: RetentionWorkspaceMode;
  objectAnchorRef: string;
  policySnapshotHash: string;
  rowRefs: readonly string[];
  tenantId: string;
}) {
  return `retention-governance-frame.${stableJsonHash({
    mode: input.mode,
    object_anchor_ref: input.objectAnchorRef,
    policy_snapshot_hash: input.policySnapshotHash,
    row_refs: input.rowRefs,
    tenant_id: input.tenantId,
  }).slice(0, 24)}`;
}

function requiredFilters(input: {
  erasureItems: readonly RetentionErasureQueueItemInput[];
  legalHolds: readonly RetentionLegalHoldInput[];
  policyRows: readonly RetentionPolicyRowInput[];
}): RetentionWorkspaceFilters {
  return {
    artifact_classes: uniqueSorted([
      ...input.policyRows.map((row) => row.artifactClass),
      ...input.erasureItems.map((item) => item.artifactClass),
    ]),
    client_refs: uniqueSorted([
      ...input.policyRows.flatMap((row) => row.clientRefs ?? []),
      ...input.legalHolds.map((hold) => hold.clientRef),
      ...input.erasureItems.map((item) => item.clientRef),
    ]),
    erasure_readiness_states: uniqueSorted(
      input.erasureItems.map((item) => item.readinessState),
    ) as RetentionWorkspaceFilters["erasure_readiness_states"],
    legal_hold_states: uniqueSorted(
      input.legalHolds.map((hold) => hold.holdState),
    ) as RetentionWorkspaceFilters["legal_hold_states"],
    release_eligibility_states: uniqueSorted(
      input.legalHolds.map((hold) => hold.releaseEligibilityState),
    ) as RetentionWorkspaceFilters["release_eligibility_states"],
    retention_classes: uniqueSorted(input.policyRows.map((row) => row.retentionClass)),
  };
}

export async function buildRetentionGovernanceFrame(
  input: BuildRetentionGovernanceFrameInput,
): Promise<RetentionGovernanceFrame> {
  const updated_at = normalizeUtcInstantString(input.updatedAt);
  const legal_hold_register_ref =
    input.legalHoldRegisterRef ?? `legal-hold-register.${input.tenantId}`;
  const erasure_queue_ref = input.erasureQueueRef ?? `erasure-queue.${input.tenantId}`;
  const legalHolds = [...(input.legalHolds ?? [])];
  const erasureItems = [...(input.erasureItems ?? [])];
  const workspace_mode = resolveWorkspaceMode({
    erasureItems,
    legalHolds,
    requestedMode: input.workspaceMode,
    selectedErasureItemRef: input.selectedErasureItemRef,
    selectedLegalHoldRef: input.selectedLegalHoldRef,
  });
  const { artifact_rows, retention_policy_matrix: basePolicyMatrix } =
    buildRetentionPolicyMatrix({
      erasureQueueRef: erasure_queue_ref,
      legalHoldRegisterRef: legal_hold_register_ref,
      rows: input.policyRows,
      selectedRowRef: input.selectedPolicyRowRef,
    });
  const policyRowByRef = new Map(artifact_rows.map((row) => [row.row_ref, row] as const));
  const selected_policy_row_ref =
    workspace_mode === "POLICIES" ? basePolicyMatrix.selected_row_ref : null;
  const selectedPolicyRow =
    selected_policy_row_ref === null
      ? null
      : policyRowByRef.get(selected_policy_row_ref) ?? null;
  const sourcePolicyRow =
    selected_policy_row_ref === null
      ? null
      : input.policyRows.find((row) => row.rowRef === selected_policy_row_ref) ?? null;
  const { legal_hold_register, selectedHold } = buildLegalHoldRegister({
    holds: legalHolds,
    selectedHoldRef: input.selectedLegalHoldRef,
    workspaceMode: workspace_mode,
  });
  const { erasure_queue, selectedItem } = buildErasureQueue({
    items: erasureItems,
    selectedItemRef: input.selectedErasureItemRef,
    workspaceMode: workspace_mode,
  });
  const retention_impact_preview = buildRetentionImpactPreview({
    releaseActionPosture: legal_hold_register.release_action_posture,
    releasePreviewRef: legal_hold_register.release_preview_ref_or_null,
    selectedErasureItem: selectedItem,
    selectedHold,
    selectedPolicyRow,
    selectedPolicyRowClientRefs: sourcePolicyRow?.clientRefs,
    workspaceMode: workspace_mode,
  });
  const promoted_support_surface =
    workspace_mode === "POLICIES" && selectedPolicyRow?.warning_posture === "NONE"
      ? "AUDIT_SIDECAR"
      : "RETENTION_IMPACT_PREVIEW";
  const warning_posture =
    workspace_mode === "POLICIES"
      ? selectedPolicyRow?.warning_posture ?? "NONE"
      : retention_impact_preview.warning_posture;
  const selected_legal_hold_ref =
    workspace_mode === "LEGAL_HOLDS" ? legal_hold_register.selected_hold_ref_or_null : null;
  const selected_erasure_item_ref =
    workspace_mode === "ERASURE" ? erasure_queue.selected_item_ref_or_null : null;
  const object_anchor_ref =
    selected_policy_row_ref ??
    selected_legal_hold_ref ??
    selected_erasure_item_ref ??
    artifact_rows[0]!.row_ref;
  const active_filters = mergeFilters(
    input.activeFilters,
    requiredFilters({
      erasureItems,
      legalHolds,
      policyRows: input.policyRows,
    }),
  );
  const interaction_layer = buildGovernanceInteractionLayer({
    activeFilters: active_filters,
    routeFamily: "retention_governance",
  });
  const retention_policy_matrix = {
    ...basePolicyMatrix,
    selected_row_ref: selected_policy_row_ref,
  };

  return {
    artifact_rows,
    artifact_type: "RetentionGovernanceFrame",
    dominant_question:
      "Which retention policy, legal hold, or erasure candidate needs staged review before privacy action?",
    erasure_queue,
    erasure_queue_count:
      erasure_queue.eligible_item_refs.length +
      erasure_queue.blocked_item_refs.length +
      erasure_queue.pending_review_item_refs.length,
    erasure_queue_ref,
    focus_anchor_ref: object_anchor_ref,
    frame_id:
      input.frameId ??
      frameIdFor({
        mode: workspace_mode,
        objectAnchorRef: object_anchor_ref,
        policySnapshotHash: input.policySnapshotHash,
        rowRefs: artifact_rows.map((row) => row.row_ref),
        tenantId: input.tenantId,
      }),
    interaction_layer,
    legal_hold_count: legal_hold_register.hold_refs.length,
    legal_hold_register,
    legal_hold_register_ref,
    limitation_count: artifact_rows.reduce((sum, row) => sum + row.limitation_count, 0),
    object_anchor_ref,
    policy_snapshot_hash: input.policySnapshotHash,
    recovery_posture: input.recoveryPosture ?? "NONE",
    retention_impact_preview,
    retention_policy_matrix,
    retention_workspace: {
      active_filters,
      promoted_support_surface,
      selected_erasure_item_ref,
      selected_legal_hold_ref,
      selected_policy_row_ref,
      surface_order: [...retentionSurfaceOrder],
      warning_posture,
      workspace_mode,
    },
    settlement_state: input.settlementState ?? "STEADY",
    shell_family: "GOVERNANCE_DENSITY_SHELL",
    tenant_id: input.tenantId,
    updated_at,
  };
}

import type { RetentionGovernanceFrame } from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import type { RetentionErasureQueueItemInput } from "./build_erasure_queue.ts";
import type { RetentionLegalHoldInput } from "./build_legal_hold_register.ts";

type RetentionArtifactRow = RetentionGovernanceFrame["artifact_rows"][number];
type RetentionImpactPreview = RetentionGovernanceFrame["retention_impact_preview"];

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))].sort((left, right) =>
    left.localeCompare(right),
  );
}

function countUnique(values: readonly string[]) {
  return uniqueSorted(values).length;
}

function rowLimitationRefs(row: RetentionArtifactRow) {
  if (row.limitation_count === 0) {
    return [];
  }
  return Array.from({ length: row.limitation_count }, (_, index) =>
    `retention-limitation.${row.row_ref}.${index + 1}`,
  );
}

function policyActionPosture(row: RetentionArtifactRow): RetentionImpactPreview["action_posture"] {
  if (row.warning_posture === "STATUTORY_BLOCK" || row.warning_posture === "LEGAL_HOLD_BLOCK") {
    return "BLOCKED";
  }
  if (row.warning_posture === "APPROVAL_OR_STEP_UP_REQUIRED") {
    return "APPROVAL_OR_STEP_UP_REQUIRED";
  }
  return row.staged_change_ref_or_null === null ? "READ_ONLY" : "CHANGE_BASKET_REQUIRED";
}

function erasureActionPosture(
  item: RetentionErasureQueueItemInput,
): RetentionImpactPreview["action_posture"] {
  if (item.readinessState === "BLOCKED") {
    return "BLOCKED";
  }
  if (item.readinessState === "PENDING_REVIEW") {
    return "APPROVAL_OR_STEP_UP_REQUIRED";
  }
  return "CHANGE_BASKET_REQUIRED";
}

function erasureWarning(
  item: RetentionErasureQueueItemInput,
): RetentionImpactPreview["warning_posture"] {
  if (item.readinessState === "BLOCKED") {
    return "LEGAL_HOLD_BLOCK";
  }
  if (item.readinessState === "PENDING_REVIEW") {
    return "APPROVAL_OR_STEP_UP_REQUIRED";
  }
  return "DESTRUCTIVE_REVIEW";
}

export function buildRetentionImpactPreview(input: {
  releaseActionPosture: RetentionGovernanceFrame["legal_hold_register"]["release_action_posture"];
  releasePreviewRef: string | null;
  selectedErasureItem: RetentionErasureQueueItemInput | null;
  selectedHold: RetentionLegalHoldInput | null;
  selectedPolicyRow: RetentionArtifactRow | null;
  selectedPolicyRowClientRefs?: readonly string[] | undefined;
  workspaceMode: RetentionGovernanceFrame["retention_workspace"]["workspace_mode"];
}): RetentionImpactPreview {
  if (input.workspaceMode === "POLICIES" && input.selectedPolicyRow) {
    const row = input.selectedPolicyRow;
    return {
      action_posture: policyActionPosture(row),
      affected_artifact_count: row.affected_artifact_count,
      affected_client_count: countUnique(input.selectedPolicyRowClientRefs ?? []),
      blocked_reason_refs: [...row.blocking_reason_refs],
      panel_mode: "RETENTION_IMPACT_PREVIEW",
      preview_mode: "POLICY_CHANGE",
      preview_subject_ref_or_null: row.row_ref,
      projected_provenance_limitation_refs: rowLimitationRefs(row),
      projected_pseudonymisation_count:
        row.pseudonymisation_mode === "NONE" ? 0 : row.affected_artifact_count,
      warning_posture: row.warning_posture,
    };
  }

  if (input.workspaceMode === "LEGAL_HOLDS" && input.selectedHold) {
    const affectedArtifactCount =
      input.selectedHold.affectedArtifactCount ??
      input.selectedHold.blockedErasureItemRefs?.length ??
      0;
    return {
      action_posture:
        input.releaseActionPosture === "CHANGE_BASKET_REQUIRED"
          ? "CHANGE_BASKET_REQUIRED"
          : "READ_ONLY",
      affected_artifact_count: affectedArtifactCount,
      affected_client_count: 1,
      blocked_reason_refs: uniqueSorted(input.selectedHold.blockedErasureItemRefs ?? []),
      panel_mode: "RETENTION_IMPACT_PREVIEW",
      preview_mode: "HOLD_RELEASE",
      preview_subject_ref_or_null: input.releasePreviewRef,
      projected_provenance_limitation_refs: uniqueSorted(
        input.selectedHold.projectedProvenanceLimitationRefs ?? [],
      ),
      projected_pseudonymisation_count:
        input.selectedHold.projectedPseudonymisationCount ?? 0,
      warning_posture: affectedArtifactCount > 0 ? "DESTRUCTIVE_REVIEW" : "NONE",
    };
  }

  if (input.workspaceMode === "ERASURE" && input.selectedErasureItem) {
    const item = input.selectedErasureItem;
    return {
      action_posture: erasureActionPosture(item),
      affected_artifact_count: item.affectedArtifactCount ?? 1,
      affected_client_count: 1,
      blocked_reason_refs:
        item.readinessState === "BLOCKED"
          ? uniqueSorted(
              item.blockerRefs && item.blockerRefs.length > 0
                ? item.blockerRefs
                : [`retention-blocker.${item.itemRef}`],
            )
          : [],
      panel_mode: "RETENTION_IMPACT_PREVIEW",
      preview_mode: "ERASURE_ACTION",
      preview_subject_ref_or_null: item.itemRef,
      projected_provenance_limitation_refs: uniqueSorted(
        item.projectedProvenanceLimitationRefs ?? [],
      ),
      projected_pseudonymisation_count: item.projectedPseudonymisationCount ?? 0,
      warning_posture: erasureWarning(item),
    };
  }

  return {
    action_posture: "READ_ONLY",
    affected_artifact_count: 0,
    affected_client_count: 0,
    blocked_reason_refs: [],
    panel_mode: "RETENTION_IMPACT_PREVIEW",
    preview_mode: "NONE_SELECTED",
    preview_subject_ref_or_null: null,
    projected_provenance_limitation_refs: [],
    projected_pseudonymisation_count: 0,
    warning_posture: "NONE",
  };
}

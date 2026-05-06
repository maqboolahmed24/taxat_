import type { ActionStripState } from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import type {
  LowNoiseDetailModuleCode,
  LowNoiseRecoveryPosture,
  LowNoiseSettlementState,
} from "../models/low_noise_frame.ts";
import type {
  LowNoiseNormalizedPosture,
  LowNoiseSurfaceProjectorInput,
} from "../models/low_noise_surface_projector_input.ts";
import { enforceLowNoiseCopyBudget, uniqueLowNoiseStrings } from "../services/enforce_low_noise_copy_budgets.ts";
import { filterVisibleActions } from "../services/filter_visible_actions.ts";
import { detailFocusAnchorFor } from "../services/preserve_focus_anchor_on_detail_change.ts";
import { scoreAndSelectPrimaryAction } from "../services/score_and_select_primary_action.ts";

export type BuildActionStripStateResult = {
  actionStrip: ActionStripState;
  focusAnchorRef: string | null;
};

const noSafeOwnershipPostures = new Set<ActionStripState["ownership_posture"]>([
  "AUTHORITY_WAIT",
  "CUSTOMER_WAIT",
  "NONE",
  "SYSTEM_WAIT",
]);

export function mustFailClosedLowNoisePosture(input: {
  connectionState: LowNoiseNormalizedPosture["connectionState"];
  recoveryPosture: LowNoiseRecoveryPosture;
  settlementState: LowNoiseSettlementState;
}) {
  return (
    input.recoveryPosture !== "NONE" ||
    ["STALE_REVIEW_REQUIRED", "DEGRADED_READ_ONLY", "RECOVERY_REQUIRED"].includes(
      input.settlementState,
    ) ||
    ["STALE", "DEGRADED"].includes(input.connectionState)
  );
}

function modeSafetyPostureFor(input: LowNoiseNormalizedPosture) {
  return input.modePosture === "LIVE_COMPLIANCE" &&
    input.connectionState === "CONNECTED" &&
    !mustFailClosedLowNoisePosture(input)
    ? "LIVE_COMPLIANCE_MUTATIONS_ALLOWED"
    : "NON_LIVE_MUTATIONS_FORBIDDEN";
}

function focusAnchorRefFor(input: {
  activeDetailSurfaceCode: LowNoiseDetailModuleCode | null;
  focusAnchorRef?: string | null | undefined;
  manifestId: string;
}) {
  if (input.activeDetailSurfaceCode === null) {
    return null;
  }
  return input.focusAnchorRef ?? detailFocusAnchorFor(input);
}

function blockingReasonFor(reasonCode: string) {
  switch (reasonCode) {
    case "WAITING_ON_AUTHORITY":
      return "Waiting on authority response before actions are safe.";
    case "WAITING_ON_CUSTOMER":
      return "Waiting on customer input before actions are safe.";
    case "WAITING_ON_SYSTEM":
      return "Waiting on system recovery before actions are safe.";
    case "NO_LAWFUL_ACTION_CANDIDATE":
      return "No governed action candidate is safe to publish.";
    case "FRAME_RECOVERY_REQUIRED":
    default:
      return "Recovery must complete before actions are safe.";
  }
}

function noSafeReasonCodeFor(input: LowNoiseSurfaceProjectorInput) {
  if (input.noSafeActionReasonCode) {
    return input.noSafeActionReasonCode;
  }
  switch (input.ownershipPosture) {
    case "AUTHORITY_WAIT":
      return "WAITING_ON_AUTHORITY";
    case "CUSTOMER_WAIT":
      return "WAITING_ON_CUSTOMER";
    case "SYSTEM_WAIT":
      return "WAITING_ON_SYSTEM";
    default:
      return "FRAME_RECOVERY_REQUIRED";
  }
}

function ownershipLabelsFor(input: {
  ownershipPosture: ActionStripState["ownership_posture"];
  ownershipLabel?: string | null | undefined;
  waitingOnLabel?: string | null | undefined;
}) {
  switch (input.ownershipPosture) {
    case "AUTHORITY_WAIT":
      return {
        ownershipLabel: enforceLowNoiseCopyBudget(input.ownershipLabel, "ownerLabel", "Authority"),
        waitingOnLabel: enforceLowNoiseCopyBudget(input.waitingOnLabel, "ownerLabel", "Authority"),
      };
    case "CUSTOMER_WAIT":
      return {
        ownershipLabel: enforceLowNoiseCopyBudget(input.ownershipLabel, "ownerLabel", "Customer"),
        waitingOnLabel: enforceLowNoiseCopyBudget(input.waitingOnLabel, "ownerLabel", "Customer"),
      };
    case "SYSTEM_WAIT":
      return {
        ownershipLabel: enforceLowNoiseCopyBudget(input.ownershipLabel, "ownerLabel", "System"),
        waitingOnLabel: enforceLowNoiseCopyBudget(input.waitingOnLabel, "ownerLabel", "System"),
      };
    case "NONE":
      return { ownershipLabel: null, waitingOnLabel: null };
    default:
      return {
        ownershipLabel: enforceLowNoiseCopyBudget(input.ownershipLabel, "ownerLabel", "Operator"),
        waitingOnLabel: null,
      };
  }
}

export function buildActionStripState(
  input: LowNoiseSurfaceProjectorInput,
): BuildActionStripStateResult {
  const failClosed = mustFailClosedLowNoisePosture(input.posture);
  const requestedOwnershipPosture = input.ownershipPosture ?? "SELF";
  const forceNoSafeAction =
    failClosed ||
    input.actionabilityState === "NO_SAFE_ACTION" ||
    input.primaryAction === null ||
    noSafeOwnershipPostures.has(requestedOwnershipPosture);
  const modeSafetyPosture = forceNoSafeAction
    ? "NON_LIVE_MUTATIONS_FORBIDDEN"
    : modeSafetyPostureFor(input.posture);
  const selection = scoreAndSelectPrimaryAction({
    forceNoSafeAction,
    modeSafetyPosture,
    noSafeActionReasonCode: noSafeReasonCodeFor(input),
    objectAnchorRef: input.objectAnchorRef,
    primaryAction: input.primaryAction,
    primaryActionCandidates: input.primaryActionCandidates,
  });

  if (selection.actionabilityState === "NO_SAFE_ACTION") {
    const noSafeActionReasonCode =
      selection.machineReasonCodes[0] ?? noSafeReasonCodeFor(input);
    const suggestedDetailSurfaceCode =
      input.suggestedDetailSurfaceCode ?? input.activeDetailSurfaceCode ?? "FOCUS_LENS";
    const activeDetailSurfaceCode = input.activeDetailSurfaceCode ?? suggestedDetailSurfaceCode;
    const focusAnchorRef = focusAnchorRefFor({
      activeDetailSurfaceCode,
      focusAnchorRef: input.focusAnchorRef,
      manifestId: input.manifestId,
    });
    const ownershipPosture = noSafeOwnershipPostures.has(requestedOwnershipPosture)
      ? requestedOwnershipPosture
      : "NONE";
    const ownershipLabels = ownershipLabelsFor({
      ownershipLabel: input.ownershipLabel,
      ownershipPosture,
      waitingOnLabel: input.waitingOnLabel,
    });
    return {
      actionStrip: {
        actionability_state: "NO_SAFE_ACTION",
        active_detail_surface_code: activeDetailSurfaceCode,
        artifact_type: "ActionStripState",
        available_action_codes: [],
        blocked_action_codes:
          selection.blockedActionCodes.length > 0
            ? selection.blockedActionCodes.slice(0, 8)
            : ["MUTATE_MANIFEST"],
        blocking_reason: enforceLowNoiseCopyBudget(
          blockingReasonFor(noSafeActionReasonCode),
          "blockingReason",
          "Recovery must complete before actions are safe.",
        ),
        dominance_margin: 0,
        focus_anchor_ref: focusAnchorRef,
        full_text_ref: `low-noise-full-text://${input.manifestId}/action-strip`,
        investigation_entry_point: suggestedDetailSurfaceCode,
        machine_reason_codes: uniqueLowNoiseStrings(selection.machineReasonCodes).slice(0, 6),
        mode_safety_posture: "NON_LIVE_MUTATIONS_FORBIDDEN",
        no_safe_action_reason_code: noSafeActionReasonCode,
        ownership_label: ownershipLabels.ownershipLabel,
        ownership_posture: ownershipPosture,
        primary_action: null,
        primary_action_score: 0,
        runner_up_action_score: 0,
        secondary_actions: [],
        source_module_code: "WORKFLOW_CHOREOGRAPHER",
        suggested_detail_surface_code: suggestedDetailSurfaceCode,
        suppressed_secondary_count: 0,
        surface_code: "ACTION_STRIP",
        waiting_on_label: ownershipLabels.waitingOnLabel,
      },
      focusAnchorRef,
    };
  }

  const activeDetailSurfaceCode = input.activeDetailSurfaceCode ?? null;
  const focusAnchorRef = focusAnchorRefFor({
    activeDetailSurfaceCode,
    focusAnchorRef: input.focusAnchorRef,
    manifestId: input.manifestId,
  });
  const visibleActions = filterVisibleActions({
    blockedActionCodes: selection.blockedActionCodes,
    modeSafetyPosture,
    objectAnchorRef: input.objectAnchorRef,
    primaryAction: selection.primaryAction,
    secondaryActionCandidates: input.secondaryActionCandidates,
    secondaryActions: input.secondaryActions,
    selectedPrimaryCandidateCode: selection.selectedCandidate.actionCode,
    visibleSecondaryLimit: input.visibleSecondaryLimit,
  });
  const ownershipLabels = ownershipLabelsFor({
    ownershipLabel: input.ownershipLabel,
    ownershipPosture: requestedOwnershipPosture,
    waitingOnLabel: input.waitingOnLabel,
  });
  return {
    actionStrip: {
      actionability_state: "ACTION_AVAILABLE",
      active_detail_surface_code: activeDetailSurfaceCode,
      artifact_type: "ActionStripState",
      available_action_codes: visibleActions.availableActionCodes,
      blocked_action_codes: visibleActions.blockedActionCodes,
      blocking_reason: null,
      dominance_margin: selection.dominanceMargin,
      focus_anchor_ref: focusAnchorRef,
      full_text_ref: `low-noise-full-text://${input.manifestId}/action-strip`,
      investigation_entry_point: null,
      machine_reason_codes: uniqueLowNoiseStrings(selection.machineReasonCodes).slice(0, 6),
      mode_safety_posture: modeSafetyPosture,
      no_safe_action_reason_code: null,
      ownership_label: ownershipLabels.ownershipLabel,
      ownership_posture: requestedOwnershipPosture,
      primary_action: selection.primaryAction,
      primary_action_score: selection.primaryActionScore,
      runner_up_action_score: selection.runnerUpActionScore,
      secondary_actions: visibleActions.secondaryActions,
      source_module_code: "WORKFLOW_CHOREOGRAPHER",
      suggested_detail_surface_code: null,
      suppressed_secondary_count: visibleActions.suppressedSecondaryCount,
      surface_code: "ACTION_STRIP",
      waiting_on_label: null,
    },
    focusAnchorRef,
  };
}

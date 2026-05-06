import type { ActionStripState } from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import type { MutationPreconditionBinding } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import {
  type LowNoiseAction,
  lowNoiseCognitiveBudget,
  type LowNoiseDetailModuleCode,
} from "../models/low_noise_frame.ts";
import type { LowNoiseActionCandidate } from "../models/low_noise_surface_projector_input.ts";
import {
  enforceLowNoiseCopyBudget,
  requireLowNoiseString,
  uniqueLowNoiseStrings,
} from "./enforce_low_noise_copy_budgets.ts";

export const lowNoiseMutationActionKinds = [
  "AUTHORITY_MUTATION",
  "FILING_MUTATION",
  "APPROVAL_MUTATION",
  "OVERRIDE_MUTATION",
] as const satisfies readonly LowNoiseAction["action_kind"][];

const lowNoiseMutationActionKindSet = new Set<LowNoiseAction["action_kind"]>(
  lowNoiseMutationActionKinds,
);

type MutationPreconditionProfileSpec = {
  readonly invalidates_on_visibility_shift: boolean;
  readonly required_guard_fields: readonly MutationPreconditionBinding["required_guard_fields"][number][];
  readonly requires_live_freshness: boolean;
  readonly stale_guard_families: readonly MutationPreconditionBinding["stale_guard_families"][number][];
  readonly target_scope_classes: readonly MutationPreconditionBinding["target_scope_classes"][number][];
};

const mutationPreconditionProfileSpecs = {
  CLIENT_PORTAL_ROUTE_MUTATION: {
    invalidates_on_visibility_shift: true,
    required_guard_fields: ["if_match_client_portal_workspace_version"],
    requires_live_freshness: true,
    stale_guard_families: ["CLIENT_PORTAL_WORKSPACE_VERSION"],
    target_scope_classes: ["MANIFEST", "WORK_ITEM"],
  },
  GOVERNANCE_POLICY_MUTATION: {
    invalidates_on_visibility_shift: true,
    required_guard_fields: ["if_match_policy_snapshot_hash"],
    requires_live_freshness: true,
    stale_guard_families: ["POLICY_SNAPSHOT_HASH"],
    target_scope_classes: ["GOVERNANCE"],
  },
  GOVERNANCE_SIMULATION_COMMIT: {
    invalidates_on_visibility_shift: true,
    required_guard_fields: [
      "if_match_policy_snapshot_hash",
      "if_match_dependency_topology_hash",
      "simulation_basis_hash",
    ],
    requires_live_freshness: true,
    stale_guard_families: [
      "POLICY_SNAPSHOT_HASH",
      "DEPENDENCY_TOPOLOGY_HASH",
      "SIMULATION_BASIS_HASH",
      "MUTATION_BASIS_CONTRACT_HASH",
    ],
    target_scope_classes: ["GOVERNANCE"],
  },
  MANIFEST_APPROVAL_PACK_REVIEW: {
    invalidates_on_visibility_shift: false,
    required_guard_fields: [
      "if_match_decision_bundle_hash",
      "if_match_shell_stability_token",
      "if_match_frame_epoch",
      "if_match_approval_pack_hash",
    ],
    requires_live_freshness: true,
    stale_guard_families: [
      "DECISION_BUNDLE_HASH",
      "SHELL_STABILITY_TOKEN",
      "FRAME_EPOCH",
      "APPROVAL_PACK_HASH",
    ],
    target_scope_classes: ["MANIFEST"],
  },
  MANIFEST_RENDER_FRAME: {
    invalidates_on_visibility_shift: false,
    required_guard_fields: [
      "if_match_decision_bundle_hash",
      "if_match_shell_stability_token",
      "if_match_frame_epoch",
    ],
    requires_live_freshness: true,
    stale_guard_families: ["DECISION_BUNDLE_HASH", "SHELL_STABILITY_TOKEN", "FRAME_EPOCH"],
    target_scope_classes: ["MANIFEST"],
  },
  WORK_ITEM_CUSTOMER_APPEND: {
    invalidates_on_visibility_shift: true,
    required_guard_fields: [
      "if_match_work_item_version",
      "if_match_customer_head_sequence",
      "if_match_shell_stability_token",
    ],
    requires_live_freshness: true,
    stale_guard_families: [
      "WORK_ITEM_VERSION",
      "CUSTOMER_THREAD_HEAD",
      "SHELL_STABILITY_TOKEN",
    ],
    target_scope_classes: ["WORK_ITEM"],
  },
  WORK_ITEM_INTERNAL_APPEND: {
    invalidates_on_visibility_shift: true,
    required_guard_fields: [
      "if_match_work_item_version",
      "if_match_internal_head_sequence",
      "if_match_shell_stability_token",
    ],
    requires_live_freshness: true,
    stale_guard_families: [
      "WORK_ITEM_VERSION",
      "INTERNAL_THREAD_HEAD",
      "SHELL_STABILITY_TOKEN",
    ],
    target_scope_classes: ["WORK_ITEM"],
  },
  WORK_ITEM_REQUEST_RESPONSE: {
    invalidates_on_visibility_shift: true,
    required_guard_fields: [
      "if_match_work_item_version",
      "if_match_customer_head_sequence",
      "if_match_request_state_version",
      "if_match_shell_stability_token",
    ],
    requires_live_freshness: true,
    stale_guard_families: [
      "WORK_ITEM_VERSION",
      "CUSTOMER_THREAD_HEAD",
      "REQUEST_STATE_VERSION",
      "SHELL_STABILITY_TOKEN",
    ],
    target_scope_classes: ["WORK_ITEM"],
  },
  WORK_ITEM_STATE_MUTATION: {
    invalidates_on_visibility_shift: true,
    required_guard_fields: ["if_match_work_item_version", "if_match_shell_stability_token"],
    requires_live_freshness: true,
    stale_guard_families: ["WORK_ITEM_VERSION", "SHELL_STABILITY_TOKEN"],
    target_scope_classes: ["WORK_ITEM"],
  },
} as const satisfies Record<MutationPreconditionBinding["profile_code"], MutationPreconditionProfileSpec>;

export type LowNoiseScoredActionCandidate = LowNoiseActionCandidate & {
  originalIndex: number;
  rankScore: number;
};

export type LowNoisePrimaryActionSelection =
  | {
      actionabilityState: "ACTION_AVAILABLE";
      blockedActionCodes: string[];
      degradedFromActionCode: string | null;
      dominanceMargin: number;
      machineReasonCodes: string[];
      primaryAction: LowNoiseAction;
      primaryActionScore: number;
      runnerUpActionScore: number;
      selectedCandidate: LowNoiseScoredActionCandidate;
    }
  | {
      actionabilityState: "NO_SAFE_ACTION";
      blockedActionCodes: string[];
      degradedFromActionCode: null;
      dominanceMargin: 0;
      machineReasonCodes: string[];
      primaryAction: null;
      primaryActionScore: 0;
      runnerUpActionScore: 0;
      selectedCandidate: null;
    };

export function buildLowNoiseMutationPreconditionBinding(
  profileCode: MutationPreconditionBinding["profile_code"] = "MANIFEST_RENDER_FRAME",
): MutationPreconditionBinding {
  const spec = mutationPreconditionProfileSpecs[profileCode];
  return {
    profile_code: profileCode,
    invalidates_on_visibility_shift: spec.invalidates_on_visibility_shift,
    required_guard_fields: [...spec.required_guard_fields],
    requires_live_freshness: spec.requires_live_freshness,
    stale_guard_families: [...spec.stale_guard_families],
    target_scope_classes: [...spec.target_scope_classes],
  };
}

export function isLowNoiseMutationActionKind(actionKind: LowNoiseAction["action_kind"]) {
  return lowNoiseMutationActionKindSet.has(actionKind);
}

export function lowNoiseActionCandidateFromPartialAction(
  action: Partial<LowNoiseAction> | null | undefined,
  input: {
    fallbackActionCode: string;
    fallbackActionKind?: LowNoiseAction["action_kind"] | undefined;
    fallbackLabel: string;
    rankScore?: number | undefined;
  },
): LowNoiseActionCandidate {
  const actionKind = action?.action_kind ?? input.fallbackActionKind ?? "REFRESH";
  return {
    actionCode: requireLowNoiseString(
      "action.action_code",
      action?.action_code ?? input.fallbackActionCode,
    ),
    actionKind,
    label: enforceLowNoiseCopyBudget(action?.label, "actionLabel", input.fallbackLabel),
    mutationPreconditionBindingOrNull: action?.mutation_precondition_binding_or_null,
    rankScore: input.rankScore,
    requiresLiveFreshness: action?.requires_live_freshness,
    targetDetailSurfaceCode: action?.target_detail_surface_code,
    targetObjectRef: action?.target_object_ref,
  };
}

export function materializeLowNoiseActionCandidate(
  candidate: LowNoiseActionCandidate,
  input: { objectAnchorRef: string },
): LowNoiseAction {
  const actionKind = candidate.actionKind;
  const isMutation = isLowNoiseMutationActionKind(actionKind);
  const targetDetailSurfaceCode =
    actionKind === "INVESTIGATE" || actionKind === "COMPARE"
      ? (candidate.targetDetailSurfaceCode ?? "EVIDENCE_TIDE")
      : (candidate.targetDetailSurfaceCode ?? null);
  return {
    action_code: requireLowNoiseString("action.actionCode", candidate.actionCode),
    action_kind: actionKind,
    label: enforceLowNoiseCopyBudget(candidate.label, "actionLabel", "Review"),
    mutation_precondition_binding_or_null: isMutation
      ? (candidate.mutationPreconditionBindingOrNull ?? null)
      : null,
    requires_live_freshness: isMutation ? true : (candidate.requiresLiveFreshness ?? false),
    target_detail_surface_code: targetDetailSurfaceCode,
    target_object_ref:
      actionKind === "REFRESH" ? null : (candidate.targetObjectRef ?? (isMutation ? input.objectAnchorRef : null)),
  };
}

function clampScore(score: number) {
  if (!Number.isFinite(score)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function rankActionCandidates(candidates: readonly LowNoiseActionCandidate[]) {
  return candidates
    .map(
      (candidate, originalIndex): LowNoiseScoredActionCandidate => ({
        ...candidate,
        originalIndex,
        rankScore: clampScore(candidate.rankScore ?? (originalIndex === 0 ? 70 : 50 - originalIndex * 5)),
      }),
    )
    .sort(
      (left, right) =>
        right.rankScore - left.rankScore ||
        left.originalIndex - right.originalIndex ||
        left.actionCode.localeCompare(right.actionCode),
    );
}

function mutationBlockReasonForCandidate(input: {
  candidate: LowNoiseScoredActionCandidate;
  modeSafetyPosture: ActionStripState["mode_safety_posture"];
  objectAnchorRef: string;
  runnerUpScore: number;
}) {
  if (input.modeSafetyPosture !== "LIVE_COMPLIANCE_MUTATIONS_ALLOWED") {
    return "NON_LIVE_MUTATION_FORBIDDEN";
  }
  if (input.candidate.targetObjectRef !== undefined && input.candidate.targetObjectRef !== input.objectAnchorRef) {
    return "MUTATION_TARGET_DRIFT";
  }
  if (input.candidate.requiresLiveFreshness === false) {
    return "MUTATION_LIVE_FRESHNESS_REQUIRED";
  }
  if (input.candidate.mutationPreconditionBindingOrNull === undefined || input.candidate.mutationPreconditionBindingOrNull === null) {
    return "MUTATION_PRECONDITION_BINDING_REQUIRED";
  }
  if (input.candidate.mutationPreconditionBindingOrNull.requires_live_freshness !== true) {
    return "MUTATION_PRECONDITION_BINDING_REQUIRED";
  }
  if (input.candidate.rankScore < 60) {
    return "MUTATION_SCORE_BELOW_THRESHOLD";
  }
  const dominanceMargin = input.candidate.rankScore - input.runnerUpScore;
  if (dominanceMargin < lowNoiseCognitiveBudget.action_dominance_min_margin) {
    return "MUTATION_DOMINANCE_MARGIN_TOO_SMALL";
  }
  return null;
}

function degradeCandidateFromBlockedMutation(blockedCandidate: LowNoiseScoredActionCandidate) {
  const fallbackKind: LowNoiseAction["action_kind"] =
    blockedCandidate.actionKind === "FILING_MUTATION" ||
    blockedCandidate.actionKind === "APPROVAL_MUTATION"
      ? "REQUEST_REVIEW"
      : "INVESTIGATE";
  const fallbackCode = fallbackKind === "REQUEST_REVIEW" ? "REQUEST_REVIEW" : "INVESTIGATE_ACTION";
  return {
    actionCode: fallbackCode,
    actionKind: fallbackKind,
    label: fallbackKind === "REQUEST_REVIEW" ? "Request review" : "Investigate",
    originalIndex: blockedCandidate.originalIndex + 1000,
    rankScore: Math.max(60, Math.min(70, blockedCandidate.rankScore)),
    reasonCodes: ["MUTATION_PRIMARY_DEGRADED"],
    targetDetailSurfaceCode: fallbackKind === "INVESTIGATE" ? "EVIDENCE_TIDE" : null,
    targetObjectRef: fallbackKind === "REQUEST_REVIEW" ? blockedCandidate.targetObjectRef : null,
  } satisfies LowNoiseScoredActionCandidate;
}

export function scoreAndSelectPrimaryAction(input: {
  forceNoSafeAction?: boolean | undefined;
  modeSafetyPosture: ActionStripState["mode_safety_posture"];
  noSafeActionReasonCode?: string | undefined;
  objectAnchorRef: string;
  primaryAction?: Partial<LowNoiseAction> | null | undefined;
  primaryActionCandidates?: readonly LowNoiseActionCandidate[] | undefined;
}): LowNoisePrimaryActionSelection {
  if (input.forceNoSafeAction === true || input.primaryAction === null) {
    const reasonCode = input.noSafeActionReasonCode ?? "NO_SAFE_ACTION_PUBLISHED";
    return {
      actionabilityState: "NO_SAFE_ACTION",
      blockedActionCodes: ["MUTATE_MANIFEST"],
      degradedFromActionCode: null,
      dominanceMargin: 0,
      machineReasonCodes: [reasonCode],
      primaryAction: null,
      primaryActionScore: 0,
      runnerUpActionScore: 0,
      selectedCandidate: null,
    };
  }

  const requestedCandidate =
    input.primaryAction === undefined
      ? null
      : lowNoiseActionCandidateFromPartialAction(input.primaryAction, {
          fallbackActionCode: "REFRESH_FRAME",
          fallbackLabel: "Refresh",
          rankScore: 70,
        });
  const candidates = [
    ...(requestedCandidate === null ? [] : [requestedCandidate]),
    ...(input.primaryActionCandidates ?? []),
  ];
  const rankedCandidates = rankActionCandidates(
    candidates.length > 0
      ? candidates
      : [
          {
            actionCode: "REFRESH_FRAME",
            actionKind: "REFRESH",
            label: "Refresh",
            rankScore: 70,
          },
        ],
  );
  const blockedActionCodes: string[] = [];
  const machineReasonCodes = new Set<string>(["FRAME_ACTION_AVAILABLE"]);
  const validCandidates: LowNoiseScoredActionCandidate[] = [];
  const blockedMutationCandidates: LowNoiseScoredActionCandidate[] = [];

  for (const candidate of rankedCandidates) {
    if (candidate.blockedReasonCode) {
      blockedActionCodes.push(candidate.actionCode);
      machineReasonCodes.add(candidate.blockedReasonCode);
      continue;
    }
    if (!isLowNoiseMutationActionKind(candidate.actionKind)) {
      validCandidates.push(candidate);
      continue;
    }
    const runnerUpScore =
      rankedCandidates.find((runner) => runner.actionCode !== candidate.actionCode)?.rankScore ??
      Math.max(0, candidate.rankScore - 20);
    const blockReason = mutationBlockReasonForCandidate({
      candidate,
      modeSafetyPosture: input.modeSafetyPosture,
      objectAnchorRef: input.objectAnchorRef,
      runnerUpScore,
    });
    if (blockReason === null) {
      validCandidates.push(candidate);
      continue;
    }
    blockedActionCodes.push(candidate.actionCode);
    blockedMutationCandidates.push(candidate);
    machineReasonCodes.add(blockReason);
  }

  if (validCandidates.length === 0 && blockedMutationCandidates.length > 0) {
    const degradedCandidate = degradeCandidateFromBlockedMutation(blockedMutationCandidates[0]);
    validCandidates.push(degradedCandidate);
    machineReasonCodes.add("MUTATION_PRIMARY_DEGRADED");
  }

  const selectedCandidate = validCandidates[0];
  if (selectedCandidate === undefined) {
    const reasonCode = input.noSafeActionReasonCode ?? "NO_LAWFUL_ACTION_CANDIDATE";
    return {
      actionabilityState: "NO_SAFE_ACTION",
      blockedActionCodes: uniqueLowNoiseStrings(blockedActionCodes).slice(0, 8),
      degradedFromActionCode: null,
      dominanceMargin: 0,
      machineReasonCodes: uniqueLowNoiseStrings([reasonCode, ...machineReasonCodes]),
      primaryAction: null,
      primaryActionScore: 0,
      runnerUpActionScore: 0,
      selectedCandidate: null,
    };
  }

  const runnerUpActionScore =
    validCandidates.find((candidate) => candidate.actionCode !== selectedCandidate.actionCode)
      ?.rankScore ?? Math.max(0, selectedCandidate.rankScore - 20);
  const primaryActionScore = selectedCandidate.rankScore;
  return {
    actionabilityState: "ACTION_AVAILABLE",
    blockedActionCodes: uniqueLowNoiseStrings(blockedActionCodes).slice(0, 8),
    degradedFromActionCode: blockedMutationCandidates[0]?.actionCode ?? null,
    dominanceMargin: primaryActionScore - runnerUpActionScore,
    machineReasonCodes: uniqueLowNoiseStrings([...machineReasonCodes, ...(selectedCandidate.reasonCodes ?? [])]).slice(
      0,
      6,
    ),
    primaryAction: materializeLowNoiseActionCandidate(selectedCandidate, {
      objectAnchorRef: input.objectAnchorRef,
    }),
    primaryActionScore,
    runnerUpActionScore,
    selectedCandidate,
  };
}

import { isDeepStrictEqual } from "node:util";

import type {
  ShellDominanceContract,
  ShellStateTaxonomyContract,
} from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import type { LowNoiseExperienceFrameRecord } from "../models/low_noise_frame.ts";
import {
  projectShellDominanceContract,
  type PortalPromotedSupportRegion,
} from "./project_shell_dominance_contract.ts";
import { projectShellStateTaxonomyContract } from "./project_shell_state_taxonomy_contract.ts";
import type {
  ClientPortalRoute,
  ShellSalienceFamily,
} from "./derive_dominant_question_and_safe_action.ts";

export class ShellSalienceAlignmentError extends Error {
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: string[]) {
    super(message);
    this.name = "ShellSalienceAlignmentError";
    this.reasonCodes = reasonCodes;
  }
}

function fail(message: string, reasonCodes: string[]): never {
  throw new ShellSalienceAlignmentError(message, reasonCodes);
}

function assertEqual(left: unknown, right: unknown, message: string, reasonCodes: string[]) {
  if (!isDeepStrictEqual(left, right)) {
    fail(message, reasonCodes);
  }
}

function activeDetailEntry(frame: LowNoiseExperienceFrameRecord) {
  return frame.active_detail_surface_code === null
    ? null
    : (frame.detail_drawer.entry_points.find(
        (entry) => entry.module_code === frame.active_detail_surface_code,
      ) ?? null);
}

function expectedLowNoiseTaxonomyContract(frame: LowNoiseExperienceFrameRecord) {
  const detailEntry = activeDetailEntry(frame);
  const summaryEmptyState =
    frame.decision_summary.limitation_state === "NONE"
      ? null
      : frame.decision_summary.limitation_state;
  const detailEmptyState =
    detailEntry !== null && detailEntry.content_state !== "POPULATED"
      ? detailEntry.content_state
      : null;
  return projectShellStateTaxonomyContract({
    candidates: [
      {
        currentEmptyStateOrNull: summaryEmptyState,
        currentEmptySurfaceCodeOrNull:
          summaryEmptyState === null ? null : "DECISION_SUMMARY",
        limitationReasonCodes: frame.decision_summary.limitation_reason_codes,
        priority: 0,
      },
      {
        currentEmptyStateOrNull: detailEmptyState,
        currentEmptySurfaceCodeOrNull: detailEmptyState === null ? null : "DETAIL_DRAWER",
        limitationReasonCodes: detailEntry?.limitation_reason_codes,
        priority: 1,
      },
    ],
    recoveryPosture: frame.recovery_posture,
    settlementState: frame.settlement_state,
  });
}

export function validateShellSalienceAlignment(input: {
  actionabilityState?: ShellDominanceContract["safe_action_state"] | undefined;
  activeDetailSurfaceCode?: LowNoiseExperienceFrameRecord["active_detail_surface_code"] | undefined;
  auditModeExplicit?: boolean | undefined;
  compareModeExplicit?: boolean | undefined;
  dominanceContract: ShellDominanceContract;
  dominantActionRefOrNull?: string | null | undefined;
  dominantQuestion?: string | null | undefined;
  expectedLimitationReasonCodes?: readonly string[] | undefined;
  noSafeActionReasonCode?: string | null | undefined;
  portalRoute?: ClientPortalRoute | undefined;
  previousDominantQuestion?: string | null | undefined;
  primaryActionCode?: string | null | undefined;
  promotedSupportRegion?: PortalPromotedSupportRegion | undefined;
  recoveryPosture?: ShellStateTaxonomyContract["current_recovery_posture"] | undefined;
  settlementState?: ShellStateTaxonomyContract["current_settlement_state"] | undefined;
  shellFamily: ShellSalienceFamily;
  stateTaxonomyContract?: ShellStateTaxonomyContract | undefined;
}) {
  const expectedDominanceContract = projectShellDominanceContract(input);
  assertEqual(input.dominanceContract, expectedDominanceContract, "shell dominance contract drifted", [
    "SHELL_DOMINANCE_CONTRACT_DRIFT",
  ]);

  if (input.stateTaxonomyContract) {
    if (
      input.stateTaxonomyContract.current_empty_state_or_null === "LIMITED" &&
      input.stateTaxonomyContract.limitation_reason_codes.length === 0
    ) {
      fail("LIMITED shell taxonomy requires non-empty limitation reason codes", [
        "SHELL_LIMITED_REASON_CODES_REQUIRED",
      ]);
    }
    if (
      input.expectedLimitationReasonCodes &&
      !isDeepStrictEqual(
        input.stateTaxonomyContract.limitation_reason_codes,
        [...input.expectedLimitationReasonCodes],
      )
    ) {
      fail("shell taxonomy limitation reasons drifted from authoritative inputs", [
        "SHELL_TAXONOMY_LIMITATION_REASON_DRIFT",
      ]);
    }
  }

  return input;
}

export function validateLowNoiseShellSalienceAlignment(frame: LowNoiseExperienceFrameRecord) {
  validateShellSalienceAlignment({
    actionabilityState: frame.action_strip.actionability_state,
    activeDetailSurfaceCode: frame.active_detail_surface_code,
    auditModeExplicit: frame.detail_drawer.audit_mode_explicit,
    compareModeExplicit: frame.detail_drawer.compare_mode_explicit,
    dominanceContract: frame.dominance_contract,
    dominantActionRefOrNull: frame.action_strip.primary_action?.action_code ?? null,
    dominantQuestion: frame.dominant_question,
    noSafeActionReasonCode: frame.action_strip.no_safe_action_reason_code,
    primaryActionCode: frame.action_strip.primary_action?.action_code ?? null,
    recoveryPosture: frame.recovery_posture,
    settlementState: frame.settlement_state,
    shellFamily: "CALM_SHELL",
    stateTaxonomyContract: frame.state_taxonomy_contract,
  });
  assertEqual(
    frame.state_taxonomy_contract,
    expectedLowNoiseTaxonomyContract(frame),
    "low-noise shell taxonomy contract drifted",
    ["LOW_NOISE_STATE_TAXONOMY_DRIFT"],
  );
  return frame;
}

import type {
  ShellDominanceContract,
  ShellDominanceContractSupportSurfaceCode,
  ShellStateTaxonomyContract,
} from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import type { LowNoiseDetailModuleCode } from "../models/low_noise_frame.ts";
import {
  deriveDominantQuestionAndSafeAction,
  type ClientPortalRoute,
  type ShellSalienceFamily,
} from "./derive_dominant_question_and_safe_action.ts";

export type PortalPromotedSupportRegion =
  | "NONE"
  | "DRAFT_RESUME"
  | "LIMITATION_NOTICE"
  | "SUPPORT_PANEL";

const portalSupportSurfaceByRegion = {
  DRAFT_RESUME: "DRAFT_RESUME",
  LIMITATION_NOTICE: "LIMITATION_NOTICE",
  NONE: null,
  SUPPORT_PANEL: "SUPPORT_PANEL",
} as const satisfies Record<
  PortalPromotedSupportRegion,
  ShellDominanceContract["promoted_support_surface_code_or_null"]
>;

const portalSupportRoleByRegion = {
  DRAFT_RESUME: "RECOVERY",
  LIMITATION_NOTICE: "RECOVERY",
  NONE: "NONE",
  SUPPORT_PANEL: "SUBORDINATE",
} as const satisfies Record<PortalPromotedSupportRegion, ShellDominanceContract["support_surface_role"]>;

function calmShellSupport(input: {
  activeDetailSurfaceCode?: LowNoiseDetailModuleCode | null | undefined;
  auditModeExplicit?: boolean | undefined;
  compareModeExplicit?: boolean | undefined;
  safeActionState: ShellDominanceContract["safe_action_state"];
}) {
  const explicitMultifocusMode = input.auditModeExplicit
    ? "AUDIT"
    : input.compareModeExplicit
      ? "COMPARE"
      : "DEFAULT";
  const promotedSupportSurfaceCodeOrNull =
    input.activeDetailSurfaceCode !== null &&
    input.activeDetailSurfaceCode !== undefined
      ? "DETAIL_DRAWER"
      : explicitMultifocusMode === "DEFAULT"
        ? null
        : "DETAIL_DRAWER";
  const supportSurfaceRole =
    promotedSupportSurfaceCodeOrNull === null
      ? "NONE"
      : explicitMultifocusMode === "AUDIT" || explicitMultifocusMode === "COMPARE"
        ? "INVESTIGATION"
        : input.safeActionState === "NO_SAFE_ACTION"
          ? "RECOVERY"
          : "SUBORDINATE";
  return {
    explicitMultifocusMode,
    promotedSupportSurfaceCodeOrNull,
    supportSurfaceRole,
  };
}

function portalSupport(input: {
  portalRoute?: ClientPortalRoute | undefined;
  promotedSupportRegion?: PortalPromotedSupportRegion | undefined;
}) {
  if (input.portalRoute === "HELP") {
    return {
      promotedSupportSurfaceCodeOrNull: null,
      supportSurfaceRole: "NONE",
    } as const;
  }
  const region = input.promotedSupportRegion ?? "NONE";
  return {
    promotedSupportSurfaceCodeOrNull: portalSupportSurfaceByRegion[region],
    supportSurfaceRole: portalSupportRoleByRegion[region],
  };
}

export function projectShellDominanceContract(input: {
  actionabilityState?: ShellDominanceContract["safe_action_state"] | undefined;
  activeDetailSurfaceCode?: LowNoiseDetailModuleCode | null | undefined;
  auditModeExplicit?: boolean | undefined;
  compareModeExplicit?: boolean | undefined;
  dominantActionRefOrNull?: string | null | undefined;
  dominantQuestion?: string | null | undefined;
  noSafeActionReasonCode?: string | null | undefined;
  portalRoute?: ClientPortalRoute | undefined;
  previousDominantQuestion?: string | null | undefined;
  primaryActionCode?: string | null | undefined;
  promotedSupportRegion?: PortalPromotedSupportRegion | undefined;
  recoveryPosture?: ShellStateTaxonomyContract["current_recovery_posture"] | undefined;
  settlementState?: ShellStateTaxonomyContract["current_settlement_state"] | undefined;
  shellFamily: ShellSalienceFamily;
  supportSurfaceCodeOrNull?: ShellDominanceContractSupportSurfaceCode | null | undefined;
  supportSurfaceRole?: ShellDominanceContract["support_surface_role"] | undefined;
}): ShellDominanceContract {
  const salience = deriveDominantQuestionAndSafeAction(input);
  const support =
    input.supportSurfaceCodeOrNull !== undefined || input.supportSurfaceRole !== undefined
      ? {
          explicitMultifocusMode: input.auditModeExplicit
            ? "AUDIT"
            : input.compareModeExplicit
              ? "COMPARE"
              : "DEFAULT",
          promotedSupportSurfaceCodeOrNull: input.supportSurfaceCodeOrNull ?? null,
          supportSurfaceRole:
            input.supportSurfaceRole ?? (input.supportSurfaceCodeOrNull === null ? "NONE" : "SUBORDINATE"),
        }
      : input.shellFamily === "CLIENT_PORTAL_SHELL"
        ? {
            explicitMultifocusMode: "DEFAULT" as const,
            ...portalSupport(input),
          }
        : calmShellSupport({
            activeDetailSurfaceCode: input.activeDetailSurfaceCode,
            auditModeExplicit: input.auditModeExplicit,
            compareModeExplicit: input.compareModeExplicit,
            safeActionState: salience.safeActionState,
          });

  return {
    contract_version: "SHELL_DOMINANCE_V1",
    detached_support_policy: "SUPPORT_ONLY_NEVER_PRIMARY",
    dominant_action_ref_or_null: salience.dominantActionRefOrNull,
    dominant_action_surface_code: salience.dominantActionSurfaceCode,
    dominant_question_surface_code: salience.dominantQuestionSurfaceCode,
    explicit_multifocus_mode: support.explicitMultifocusMode,
    parallel_primary_posture: "DISALLOWED",
    promoted_support_surface_code_or_null: support.promotedSupportSurfaceCodeOrNull,
    renderer_salience_policy: "SERVER_AUTHORED_ONLY",
    responsive_collapse_policy: "PRESERVE_DOMINANT_SUMMARY_AND_ACTION",
    safe_action_state: salience.safeActionState,
    summary_action_alignment_policy: "SAME_DOMINANT_QUESTION",
    supplemental_queue_policy: salience.supplementalQueuePolicy,
    support_surface_role: support.supportSurfaceRole,
  };
}

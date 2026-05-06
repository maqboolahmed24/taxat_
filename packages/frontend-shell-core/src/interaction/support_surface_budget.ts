import type { ShellFamilyCode } from "../route_contracts/semantic_accessibility";
import { failInteractionContract } from "./interaction_contract_errors";

export type SupportSurfaceMode = "DEFAULT" | "COMPARE" | "AUDIT" | "BLOCKER" | "MODAL_CHECKPOINT";

export type PromotedSupportCandidate = {
  surface_code: string;
  shell_family: ShellFamilyCode;
  promoted_support_eligible: boolean;
  support_mode: "DEFAULT" | "COMPARE" | "AUDIT" | "BLOCKER" | "HELP" | "RECOVERY";
  writable_controls_allowed: boolean;
};

export type SupportSurfaceBudgetDecision = {
  policy: "ONE_PROMOTED_SUPPORT_SURFACE_MAX";
  mode: SupportSurfaceMode;
  promoted_surface_codes: readonly string[];
  default_limit: 1;
  explicit_exception: boolean;
  writable_surface_code_or_null: string | null;
};

function explicitExceptionAllowsSecondRegion(
  shellFamily: ShellFamilyCode,
  mode: SupportSurfaceMode,
) {
  if (shellFamily === "CLIENT_PORTAL_SHELL") {
    return false;
  }
  return mode === "COMPARE" || mode === "AUDIT" || mode === "BLOCKER" || mode === "MODAL_CHECKPOINT";
}

export function enforcePromotedSupportSurfaceBudget(input: {
  mode?: SupportSurfaceMode | undefined;
  shellFamily: ShellFamilyCode;
  supportCandidates: readonly PromotedSupportCandidate[];
}) {
  const mode = input.mode ?? "DEFAULT";
  const supportCandidates = input.supportCandidates.filter(
    (candidate) => candidate.surface_code !== "NONE",
  );

  for (const candidate of supportCandidates) {
    if (!candidate.promoted_support_eligible) {
      failInteractionContract(
        "SUPPORT_SURFACE_NOT_PROMOTABLE",
        `${candidate.surface_code} cannot be promoted as a support region.`,
        { shell_family: input.shellFamily, surface_code: candidate.surface_code },
      );
    }
  }

  const modeSet = new Set(supportCandidates.map((candidate) => candidate.support_mode));
  if (input.shellFamily === "CALM_SHELL" && modeSet.has("COMPARE") && modeSet.has("AUDIT")) {
    failInteractionContract(
      "SUPPORT_SURFACE_MODE_CONFLICT",
      "Calm compare and audit support modes are mutually exclusive.",
      {
        shell_family: input.shellFamily,
        promoted_surface_codes: supportCandidates.map((candidate) => candidate.surface_code),
      },
    );
  }

  const explicitException = explicitExceptionAllowsSecondRegion(input.shellFamily, mode);
  if (supportCandidates.length > 1 && !explicitException) {
    failInteractionContract(
      "SUPPORT_SURFACE_BUDGET_EXCEEDED",
      `${input.shellFamily} default render paths allow one promoted support surface.`,
      {
        shell_family: input.shellFamily,
        mode,
        promoted_surface_codes: supportCandidates.map((candidate) => candidate.surface_code),
      },
    );
  }

  if (supportCandidates.length > 2) {
    failInteractionContract(
      "SUPPORT_SURFACE_BUDGET_EXCEEDED",
      `${input.shellFamily} explicit support exceptions cannot promote more than two regions.`,
      {
        shell_family: input.shellFamily,
        mode,
        promoted_surface_codes: supportCandidates.map((candidate) => candidate.surface_code),
      },
    );
  }

  const writableCandidates = supportCandidates.filter((candidate) => candidate.writable_controls_allowed);
  if (writableCandidates.length > 1) {
    failInteractionContract(
      "SUPPORT_SURFACE_BUDGET_EXCEEDED",
      "Only one promoted support region may contain writable controls.",
      {
        shell_family: input.shellFamily,
        mode,
        writable_surface_codes: writableCandidates.map((candidate) => candidate.surface_code),
      },
    );
  }

  return {
    default_limit: 1,
    explicit_exception: explicitException && supportCandidates.length > 1,
    mode,
    policy: "ONE_PROMOTED_SUPPORT_SURFACE_MAX",
    promoted_surface_codes: supportCandidates.map((candidate) => candidate.surface_code),
    writable_surface_code_or_null: writableCandidates[0]?.surface_code ?? null,
  } satisfies SupportSurfaceBudgetDecision;
}

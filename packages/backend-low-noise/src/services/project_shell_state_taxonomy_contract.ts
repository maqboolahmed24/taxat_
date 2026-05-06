import type {
  ShellStateTaxonomyContract,
} from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import {
  normalizeShellLimitationAndEmptyState,
  type ShellEmptyStateCandidate,
} from "./normalize_shell_limitation_and_empty_state.ts";

export function mountedContextStateFor(input: {
  recoveryPosture: ShellStateTaxonomyContract["current_recovery_posture"];
  settlementState: ShellStateTaxonomyContract["current_settlement_state"];
}): ShellStateTaxonomyContract["mounted_context_state"] {
  switch (input.settlementState) {
    case "STEADY":
    case "RECEIPT_PENDING":
      return "PRESERVED";
    case "FRESHENING":
      return "INLINE_REFRESH";
    case "STALE_REVIEW_REQUIRED":
    case "DEGRADED_READ_ONLY":
      return "READ_ONLY_PRESERVED";
    case "RECOVERY_REQUIRED":
      return input.recoveryPosture === "OBJECT_SUPERSEDED" ? "SUPERSEDED" : "INLINE_RECOVERY";
  }
}

export function projectShellStateTaxonomyContract(input: {
  candidates?: readonly ShellEmptyStateCandidate[] | undefined;
  currentEmptyStateOrNull?: ShellStateTaxonomyContract["current_empty_state_or_null"] | undefined;
  currentEmptySurfaceCodeOrNull?:
    | ShellStateTaxonomyContract["current_empty_surface_code_or_null"]
    | undefined;
  limitationReasonCodes?: readonly string[] | undefined;
  recoveryPosture: ShellStateTaxonomyContract["current_recovery_posture"];
  settlementState: ShellStateTaxonomyContract["current_settlement_state"];
}): ShellStateTaxonomyContract {
  const emptyState = normalizeShellLimitationAndEmptyState(input);
  return {
    contract_version: "SHELL_STATE_TAXONOMY_V1",
    current_empty_state_or_null: emptyState.currentEmptyStateOrNull,
    current_empty_surface_code_or_null: emptyState.currentEmptySurfaceCodeOrNull,
    current_recovery_posture: input.recoveryPosture,
    current_settlement_state: input.settlementState,
    generic_placeholder_policy: "FORBID_GENERIC_EMPTY_SPINNER_WARNING",
    limitation_reason_codes: emptyState.limitationReasonCodes,
    limitation_reason_policy: "LIMITED_REQUIRES_EXPLICIT_REASON_CODES",
    loading_strategy: "INLINE_PRESERVE_PRIOR_CONTENT",
    mounted_context_state: mountedContextStateFor(input),
    profile_copy_policy: "PROFILE_COPY_MUST_MAP_TO_SHARED_TAXONOMY",
    recovery_navigation_policy: "PRESERVE_CURRENT_OBJECT_UNLESS_SUPERSEDED",
    stale_action_policy: "STALE_DEGRADED_AND_RECOVERY_REQUIRE_NO_SAFE_ACTION",
  };
}

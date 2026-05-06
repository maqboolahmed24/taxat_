import type { ManifestBranchAction } from "../models/manifest_branch_decision_contract.ts";
import type { LoadedPriorManifestContext } from "../types/manifest_prior_context_status.ts";

export type SupersessionDecisionGuardReasonCode =
  | "GUARD_NOT_APPLICABLE"
  | "PRIOR_CONTEXT_INVALID"
  | "PRIOR_MANIFEST_MISSING"
  | "SUPERSESSION_APPEND_ONLY_PREPARED";

export type SupersessionDecisionGuardResult = {
  append_only_policy: "NO_HISTORICAL_REWRITE" | "NOT_APPLICABLE";
  guard_state: "BLOCKED" | "NOT_APPLICABLE" | "PREPARED";
  reason_codes: SupersessionDecisionGuardReasonCode[];
  supersedes_manifest_id_or_null: string | null;
};

export function guardSupersessionDecision(input: {
  prior_context: LoadedPriorManifestContext;
  selected_branch_action: ManifestBranchAction | null;
}): SupersessionDecisionGuardResult {
  if (input.selected_branch_action !== "NEW_REQUEST_CHILD") {
    return {
      append_only_policy: "NOT_APPLICABLE",
      guard_state: "NOT_APPLICABLE",
      reason_codes: ["GUARD_NOT_APPLICABLE"],
      supersedes_manifest_id_or_null: null,
    };
  }

  if (input.prior_context.status !== "VALID") {
    return {
      append_only_policy: "NO_HISTORICAL_REWRITE",
      guard_state: "BLOCKED",
      reason_codes: ["PRIOR_CONTEXT_INVALID"],
      supersedes_manifest_id_or_null:
        input.prior_context.prior_manifest?.manifest_id ?? null,
    };
  }
  if (input.prior_context.prior_manifest === null) {
    return {
      append_only_policy: "NO_HISTORICAL_REWRITE",
      guard_state: "BLOCKED",
      reason_codes: ["PRIOR_MANIFEST_MISSING"],
      supersedes_manifest_id_or_null: null,
    };
  }

  return {
    append_only_policy: "NO_HISTORICAL_REWRITE",
    guard_state: "PREPARED",
    reason_codes: ["SUPERSESSION_APPEND_ONLY_PREPARED"],
    supersedes_manifest_id_or_null: input.prior_context.prior_manifest.manifest_id,
  };
}

export type ShellStateTaxonomyContract = {
  contract_version: "SHELL_STATE_TAXONOMY_V1";
  current_empty_state_or_null:
    | "NOT_REQUESTED"
    | "NOT_YET_MATERIALIZED"
    | "LIMITED"
    | "NOT_APPLICABLE"
    | null;
  current_empty_surface_code_or_null: string | null;
  limitation_reason_codes: readonly string[];
  current_settlement_state:
    | "STEADY"
    | "RECEIPT_PENDING"
    | "FRESHENING"
    | "STALE_REVIEW_REQUIRED"
    | "DEGRADED_READ_ONLY"
    | "RECOVERY_REQUIRED";
  current_recovery_posture:
    | "NONE"
    | "INLINE_RECONNECT"
    | "INLINE_REBASE"
    | "READ_ONLY_LIMITED"
    | "OBJECT_SUPERSEDED"
    | "ACCESS_REBIND_REQUIRED";
  mounted_context_state:
    | "PRESERVED"
    | "INLINE_REFRESH"
    | "READ_ONLY_PRESERVED"
    | "INLINE_RECOVERY"
    | "SUPERSEDED";
  generic_placeholder_policy: "FORBID_GENERIC_EMPTY_SPINNER_WARNING";
  loading_strategy: "INLINE_PRESERVE_PRIOR_CONTENT";
  limitation_reason_policy: "LIMITED_REQUIRES_EXPLICIT_REASON_CODES";
  stale_action_policy: "STALE_DEGRADED_AND_RECOVERY_REQUIRE_NO_SAFE_ACTION";
  recovery_navigation_policy: "PRESERVE_CURRENT_OBJECT_UNLESS_SUPERSEDED";
  profile_copy_policy: "PROFILE_COPY_MUST_MAP_TO_SHARED_TAXONOMY";
};

export function shellStateNeedsInlineNotice(contract: ShellStateTaxonomyContract) {
  return (
    contract.current_empty_state_or_null === "LIMITED" ||
    contract.current_settlement_state === "RECOVERY_REQUIRED" ||
    contract.current_settlement_state === "STALE_REVIEW_REQUIRED"
  );
}

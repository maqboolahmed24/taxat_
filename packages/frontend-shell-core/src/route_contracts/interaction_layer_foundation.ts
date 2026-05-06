import type { SelectorProfile, ShellFamilyCode } from "./semantic_accessibility";

export type InteractionLayerFoundationContract = {
  contract_version: "CROSS_SHELL_INTERACTION_FOUNDATION_V1";
  shell_family: ShellFamilyCode;
  design_token_binding_policy: "EXPLICIT_SEMANTIC_BINDINGS_ONLY";
  layout_density_token: string;
  surface_spacing_token: string;
  support_surface_spacing_token: string;
  responsive_compaction_token: string;
  selector_profile: SelectorProfile;
  support_surface_policy: "ONE_PROMOTED_SUPPORT_SURFACE_MAX";
  continuity_policy:
    | "SAME_OBJECT_SAME_SHELL_INLINE_RECOVERY"
    | "SAME_SHELL_CONTEXTUAL_RETURN"
    | "SAME_OBJECT_SAME_SHELL_CONTEXT_RETENTION";
  recovery_surface_policy:
    | "INLINE_EXPLICIT_REBASE"
    | "INLINE_REVIEW_OR_RECOVERY_NOTICE"
    | "INLINE_TYPED_CONTEXTUAL_RECOVERY";
  history_presentation_policy:
    | "CURRENT_PRIMARY_HISTORY_SECONDARY"
    | "ACTIVE_SLICE_PRIMARY_CONTEXTUAL_HISTORY";
  preview_surface_policy:
    | "DETAIL_DRAWER_OR_PARENT_BOUND_SECONDARY_WINDOW"
    | "PRIMARY_CONTEXT_WITH_STACKED_SUPPORT"
    | "AUXILIARY_SURFACE_CONTEXTUAL_ONLY";
  notification_surface_policy:
    | "CONTEXT_BOUND_INLINE_FEEDBACK_OR_PARENT_MIRROR"
    | "CONTEXT_BOUND_INLINE_FEEDBACK";
  secondary_window_policy: "SUPPORT_ONLY_PARENT_BOUND_CLOSE_RETURNS_FOCUS" | "NOT_APPLICABLE";
  motion_profile: "SUBTLE_CAUSAL_ONLY";
  motion_token: "SUBTLE_CAUSAL_MOTION_V1";
  feedback_truth_policy: "DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN";
  platform_parity_policy: "SAME_FAMILY_REUSES_SAME_INTERACTION_GRAMMAR";
};

export function interactionLayerTokenTuple(contract: InteractionLayerFoundationContract) {
  return [
    contract.shell_family,
    contract.layout_density_token,
    contract.surface_spacing_token,
    contract.support_surface_spacing_token,
    contract.responsive_compaction_token,
  ] as const;
}

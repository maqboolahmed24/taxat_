import type {
  InteractionLayerFoundationContract,
} from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";

export type InteractionLayerShellFamily = InteractionLayerFoundationContract["shell_family"];

export type ShellFamilySemanticTokenAliases = {
  artifact_hierarchy: string;
  continuity: string;
  feedback_truth: string;
  layout_density: string;
  motion: string;
  notification_surface: string;
  preview_surface: string;
  recovery_surface: string;
  responsive_compaction: string;
  secondary_window: string;
  selector_profile: string;
  support_surface_spacing: string;
  surface_spacing: string;
};

export type ShellFamilyTokenRegistryEntry = {
  cross_shell_semantic_fields: readonly (keyof InteractionLayerFoundationContract)[];
  foundation_contract: InteractionLayerFoundationContract;
  renderer_binding_policy: "ENUM_PAYLOAD_PLUS_STABLE_SEMANTIC_TOKEN_ALIASES";
  semantic_token_aliases: ShellFamilySemanticTokenAliases;
  shell_family: InteractionLayerShellFamily;
  shell_specific_semantic_fields: readonly (keyof InteractionLayerFoundationContract)[];
};

export const orderedInteractionLayerShellFamilies = [
  "CALM_SHELL",
  "CLIENT_PORTAL_SHELL",
  "GOVERNANCE_DENSITY_SHELL",
] as const satisfies readonly InteractionLayerShellFamily[];

const crossShellSemanticFields = [
  "contract_version",
  "design_token_binding_policy",
  "support_surface_policy",
  "motion_profile",
  "motion_token",
  "feedback_truth_policy",
  "platform_parity_policy",
] as const satisfies readonly (keyof InteractionLayerFoundationContract)[];

const shellSpecificSemanticFields = [
  "shell_family",
  "layout_density_token",
  "surface_spacing_token",
  "support_surface_spacing_token",
  "responsive_compaction_token",
  "selector_profile",
  "continuity_policy",
  "recovery_surface_policy",
  "history_presentation_policy",
  "preview_surface_policy",
  "notification_surface_policy",
  "secondary_window_policy",
] as const satisfies readonly (keyof InteractionLayerFoundationContract)[];

const baseFoundation = {
  contract_version: "CROSS_SHELL_INTERACTION_FOUNDATION_V1",
  design_token_binding_policy: "EXPLICIT_SEMANTIC_BINDINGS_ONLY",
  feedback_truth_policy: "DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN",
  motion_profile: "SUBTLE_CAUSAL_ONLY",
  motion_token: "SUBTLE_CAUSAL_MOTION_V1",
  platform_parity_policy: "SAME_FAMILY_REUSES_SAME_INTERACTION_GRAMMAR",
  support_surface_policy: "ONE_PROMOTED_SUPPORT_SURFACE_MAX",
} as const;

function entry(input: {
  foundation_contract: InteractionLayerFoundationContract;
  semantic_token_aliases: ShellFamilySemanticTokenAliases;
}): ShellFamilyTokenRegistryEntry {
  return Object.freeze({
    cross_shell_semantic_fields: crossShellSemanticFields,
    foundation_contract: Object.freeze(input.foundation_contract),
    renderer_binding_policy: "ENUM_PAYLOAD_PLUS_STABLE_SEMANTIC_TOKEN_ALIASES",
    semantic_token_aliases: Object.freeze(input.semantic_token_aliases),
    shell_family: input.foundation_contract.shell_family,
    shell_specific_semantic_fields: shellSpecificSemanticFields,
  });
}

export const shellFamilyTokenRegistry = Object.freeze({
  CALM_SHELL: entry({
    foundation_contract: {
      ...baseFoundation,
      continuity_policy: "SAME_OBJECT_SAME_SHELL_INLINE_RECOVERY",
      history_presentation_policy: "CURRENT_PRIMARY_HISTORY_SECONDARY",
      layout_density_token: "CALM_FOUR_SURFACE_DENSITY_V1",
      notification_surface_policy: "CONTEXT_BOUND_INLINE_FEEDBACK_OR_PARENT_MIRROR",
      preview_surface_policy: "DETAIL_DRAWER_OR_PARENT_BOUND_SECONDARY_WINDOW",
      recovery_surface_policy: "INLINE_EXPLICIT_REBASE",
      responsive_compaction_token: "CALM_SUPPORT_REDOCK_V1",
      secondary_window_policy: "SUPPORT_ONLY_PARENT_BOUND_CLOSE_RETURNS_FOCUS",
      selector_profile: "OPERATOR_SEMANTIC_SELECTORS_V1",
      shell_family: "CALM_SHELL",
      support_surface_spacing_token: "CALM_DETAIL_DRAWER_SUPPORT_SPACING_V1",
      surface_spacing_token: "CALM_FOUR_SURFACE_SPACING_V1",
    },
    semantic_token_aliases: {
      artifact_hierarchy: "semantic.artifact_hierarchy.current_primary_history_secondary.v1",
      continuity: "semantic.continuity.same_object_same_shell_inline_recovery.v1",
      feedback_truth: "semantic.feedback_truth.durable_receipt_typed_failure.v1",
      layout_density: "semantic.layout_density.calm_four_surface.v1",
      motion: "semantic.motion.subtle_causal.v1",
      notification_surface: "semantic.notification.context_bound_or_parent_mirror.v1",
      preview_surface: "semantic.preview.detail_drawer_or_parent_bound_secondary.v1",
      recovery_surface: "semantic.recovery.inline_explicit_rebase.v1",
      responsive_compaction: "semantic.compaction.calm_support_redock.v1",
      secondary_window: "semantic.secondary_window.support_only_parent_bound.v1",
      selector_profile: "semantic.selector.operator.v1",
      support_surface_spacing: "semantic.spacing.calm_detail_drawer_support.v1",
      surface_spacing: "semantic.spacing.calm_four_surface.v1",
    },
  }),
  CLIENT_PORTAL_SHELL: entry({
    foundation_contract: {
      ...baseFoundation,
      continuity_policy: "SAME_SHELL_CONTEXTUAL_RETURN",
      history_presentation_policy: "CURRENT_PRIMARY_HISTORY_SECONDARY",
      layout_density_token: "PORTAL_COMFORTABLE_TASK_DENSITY_V1",
      notification_surface_policy: "CONTEXT_BOUND_INLINE_FEEDBACK",
      preview_surface_policy: "PRIMARY_CONTEXT_WITH_STACKED_SUPPORT",
      recovery_surface_policy: "INLINE_REVIEW_OR_RECOVERY_NOTICE",
      responsive_compaction_token: "PORTAL_STACK_BELOW_PRIMARY_V1",
      secondary_window_policy: "NOT_APPLICABLE",
      selector_profile: "PORTAL_SEMANTIC_SELECTORS_V1",
      shell_family: "CLIENT_PORTAL_SHELL",
      support_surface_spacing_token: "PORTAL_INLINE_SUPPORT_SPACING_V1",
      surface_spacing_token: "PORTAL_PRIMARY_STACK_SPACING_V1",
    },
    semantic_token_aliases: {
      artifact_hierarchy: "semantic.artifact_hierarchy.current_primary_history_secondary.v1",
      continuity: "semantic.continuity.portal_same_shell_contextual_return.v1",
      feedback_truth: "semantic.feedback_truth.durable_receipt_typed_failure.v1",
      layout_density: "semantic.layout_density.portal_comfortable_task.v1",
      motion: "semantic.motion.subtle_causal.v1",
      notification_surface: "semantic.notification.portal_context_bound_inline_feedback.v1",
      preview_surface: "semantic.preview.portal_primary_context_stacked_support.v1",
      recovery_surface: "semantic.recovery.portal_inline_review_or_notice.v1",
      responsive_compaction: "semantic.compaction.portal_stack_below_primary.v1",
      secondary_window: "semantic.secondary_window.not_applicable.v1",
      selector_profile: "semantic.selector.portal.v1",
      support_surface_spacing: "semantic.spacing.portal_inline_support.v1",
      surface_spacing: "semantic.spacing.portal_primary_stack.v1",
    },
  }),
  GOVERNANCE_DENSITY_SHELL: entry({
    foundation_contract: {
      ...baseFoundation,
      continuity_policy: "SAME_OBJECT_SAME_SHELL_CONTEXT_RETENTION",
      history_presentation_policy: "ACTIVE_SLICE_PRIMARY_CONTEXTUAL_HISTORY",
      layout_density_token: "GOVERNANCE_WORKSPACE_DENSITY_V1",
      notification_surface_policy: "CONTEXT_BOUND_INLINE_FEEDBACK",
      preview_surface_policy: "AUXILIARY_SURFACE_CONTEXTUAL_ONLY",
      recovery_surface_policy: "INLINE_TYPED_CONTEXTUAL_RECOVERY",
      responsive_compaction_token: "GOVERNANCE_AUXILIARY_REDOCK_V1",
      secondary_window_policy: "NOT_APPLICABLE",
      selector_profile: "GOVERNANCE_SEMANTIC_SELECTORS_V1",
      shell_family: "GOVERNANCE_DENSITY_SHELL",
      support_surface_spacing_token: "GOVERNANCE_AUXILIARY_SURFACE_SPACING_V1",
      surface_spacing_token: "GOVERNANCE_CANVAS_SPACING_V1",
    },
    semantic_token_aliases: {
      artifact_hierarchy: "semantic.artifact_hierarchy.governance_active_slice_primary.v1",
      continuity: "semantic.continuity.governance_same_object_context_retention.v1",
      feedback_truth: "semantic.feedback_truth.durable_receipt_typed_failure.v1",
      layout_density: "semantic.layout_density.governance_workspace.v1",
      motion: "semantic.motion.subtle_causal.v1",
      notification_surface: "semantic.notification.governance_context_bound_inline_feedback.v1",
      preview_surface: "semantic.preview.governance_auxiliary_contextual_only.v1",
      recovery_surface: "semantic.recovery.governance_inline_typed_contextual.v1",
      responsive_compaction: "semantic.compaction.governance_auxiliary_redock.v1",
      secondary_window: "semantic.secondary_window.not_applicable.v1",
      selector_profile: "semantic.selector.governance.v1",
      support_surface_spacing: "semantic.spacing.governance_auxiliary_surface.v1",
      surface_spacing: "semantic.spacing.governance_canvas.v1",
    },
  }),
} as const satisfies Record<InteractionLayerShellFamily, ShellFamilyTokenRegistryEntry>);

export function getShellFamilyTokenRegistryEntry(input: {
  shellFamily: InteractionLayerShellFamily;
}): ShellFamilyTokenRegistryEntry {
  return shellFamilyTokenRegistry[input.shellFamily];
}

export function cloneFoundationContractForShell(input: {
  shellFamily: InteractionLayerShellFamily;
}): InteractionLayerFoundationContract {
  return {
    ...shellFamilyTokenRegistry[input.shellFamily].foundation_contract,
  };
}

import type {
  ShellContinuityFuzzHarnessAssertedInvariant,
  ShellContinuityFuzzHarnessContinuityScope,
  ShellContinuityFuzzHarnessFuzzCase,
  ShellContinuityFuzzHarnessPerturbation,
  ShellContinuityFuzzHarnessShellFamily,
  ShellContinuityFuzzHarnessStateSnapshot,
  ShellContinuityFuzzHarnessSurfaceType,
} from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";

export type ShellContinuityFuzzCase = ShellContinuityFuzzHarnessFuzzCase;
export type ShellContinuityStateSnapshot = ShellContinuityFuzzHarnessStateSnapshot;

export const shellContinuityRequiredInvariants = [
  "SHELL_FAMILY",
  "ROUTE_IDENTITY",
  "OBJECT_ANCHOR",
  "DOMINANT_QUESTION",
  "SETTLEMENT_STATE",
  "ACTIVE_CONTEXT",
  "FOCUS_ANCHOR",
  "RETURN_FOCUS_ANCHOR",
  "DOMINANT_MEANING",
] as const satisfies readonly ShellContinuityFuzzHarnessAssertedInvariant[];

export const shellContinuitySurfaceBindings = {
  LowNoiseExperienceFrame: {
    allowed_shell_families: ["CALM_SHELL"],
    continuity_scope: "MANIFEST_ROUTE",
  },
  WorkspaceSnapshot: {
    allowed_shell_families: ["CALM_SHELL", "CLIENT_PORTAL_SHELL"],
    continuity_scope: "WORKSPACE_ROUTE",
  },
  ClientPortalWorkspace: {
    allowed_shell_families: ["CLIENT_PORTAL_SHELL"],
    continuity_scope: "CLIENT_PORTAL_ROUTE",
  },
  TenantGovernanceSnapshot: {
    allowed_shell_families: ["GOVERNANCE_DENSITY_SHELL"],
    continuity_scope: "GOVERNANCE_ROUTE",
  },
  NativeOperatorWorkspaceScene: {
    allowed_shell_families: ["CALM_SHELL"],
    continuity_scope: "NATIVE_PRIMARY_SCENE",
  },
  NativeOperatorSecondaryWindowScene: {
    allowed_shell_families: ["CALM_SHELL"],
    continuity_scope: "NATIVE_SECONDARY_WINDOW",
  },
} as const satisfies Record<
  ShellContinuityFuzzHarnessSurfaceType,
  {
    allowed_shell_families: readonly ShellContinuityFuzzHarnessShellFamily[];
    continuity_scope: ShellContinuityFuzzHarnessContinuityScope;
  }
>;

export const shellContinuityBrowserScopes = [
  "MANIFEST_ROUTE",
  "WORKSPACE_ROUTE",
  "CLIENT_PORTAL_ROUTE",
  "GOVERNANCE_ROUTE",
] as const satisfies readonly ShellContinuityFuzzHarnessContinuityScope[];

export const shellContinuityNativeScopes = [
  "NATIVE_PRIMARY_SCENE",
  "NATIVE_SECONDARY_WINDOW",
] as const satisfies readonly ShellContinuityFuzzHarnessContinuityScope[];

export const shellContinuityNativePerturbations = [
  "NATIVE_SCENE_RESTORE",
  "SECONDARY_WINDOW_RESTORE",
] as const satisfies readonly ShellContinuityFuzzHarnessPerturbation[];

export type EnumerateShellContinuityCasesInput = {
  deterministic_seed?: number | undefined;
};

function state(input: ShellContinuityFuzzHarnessStateSnapshot) {
  return input;
}

function continuityCase(input: ShellContinuityFuzzHarnessFuzzCase) {
  return input;
}

export function enumerateShellContinuityCases(
  _input: EnumerateShellContinuityCasesInput = {},
): ShellContinuityFuzzHarnessFuzzCase[] {
  return [
    continuityCase({
      asserted_invariants: [...shellContinuityRequiredInvariants],
      case_id: "manifest-rebase-inline-recovery",
      continuity_scope: "MANIFEST_ROUTE",
      expected_inline_recovery_reason_or_null: "INLINE_REBASE",
      expected_outcome: "INLINE_RECOVERY",
      perturbations: ["REBASE", "FRAME_EPOCH_ADVANCE"],
      post_state: state({
        active_context_ref_or_null: "TWIN_PANEL",
        canonical_object_ref: "manifest-1",
        dominant_meaning_ref_or_null: "FILE_NOW",
        dominant_question: "Can this return file exactly as prepared?",
        focus_anchor_ref_or_null: "detail:twin:manifest-1",
        recovery_posture_or_null: "INLINE_REBASE",
        return_focus_anchor_ref_or_null: null,
        route_identity_ref: "/manifests/manifest-1",
        settlement_state_or_null: "STEADY",
        shell_family: "CALM_SHELL",
      }),
      pre_state: state({
        active_context_ref_or_null: "TWIN_PANEL",
        canonical_object_ref: "manifest-1",
        dominant_meaning_ref_or_null: "FILE_NOW",
        dominant_question: "Can this return file exactly as prepared?",
        focus_anchor_ref_or_null: "detail:twin:manifest-1",
        recovery_posture_or_null: "NONE",
        return_focus_anchor_ref_or_null: null,
        route_identity_ref: "/manifests/manifest-1",
        settlement_state_or_null: "STEADY",
        shell_family: "CALM_SHELL",
      }),
      shell_family: "CALM_SHELL",
      shrink_sequence: ["REBASE"],
      surface_type: "LowNoiseExperienceFrame",
      truth_change_detected: false,
    }),
    continuityCase({
      asserted_invariants: [...shellContinuityRequiredInvariants],
      case_id: "workspace-reconnect-catchup",
      continuity_scope: "WORKSPACE_ROUTE",
      expected_inline_recovery_reason_or_null: "INLINE_RECONNECT",
      expected_outcome: "INLINE_RECOVERY",
      perturbations: ["RECONNECT", "STREAM_CATCH_UP"],
      post_state: state({
        active_context_ref_or_null: "AUTHORITY_TUNNEL",
        canonical_object_ref: "item-1",
        dominant_meaning_ref_or_null: "REQUEST_CLIENT_INFO",
        dominant_question: "What is the next lawful move on this work item?",
        focus_anchor_ref_or_null: "request:block:item-1",
        recovery_posture_or_null: "INLINE_RECONNECT",
        return_focus_anchor_ref_or_null: "queue-row:item-1",
        route_identity_ref: "/work/items/item-1",
        settlement_state_or_null: "STEADY",
        shell_family: "CALM_SHELL",
      }),
      pre_state: state({
        active_context_ref_or_null: "AUTHORITY_TUNNEL",
        canonical_object_ref: "item-1",
        dominant_meaning_ref_or_null: "REQUEST_CLIENT_INFO",
        dominant_question: "What is the next lawful move on this work item?",
        focus_anchor_ref_or_null: "request:block:item-1",
        recovery_posture_or_null: "NONE",
        return_focus_anchor_ref_or_null: "queue-row:item-1",
        route_identity_ref: "/work/items/item-1",
        settlement_state_or_null: "STEADY",
        shell_family: "CALM_SHELL",
      }),
      shell_family: "CALM_SHELL",
      shrink_sequence: ["RECONNECT"],
      surface_type: "WorkspaceSnapshot",
      truth_change_detected: false,
    }),
    continuityCase({
      asserted_invariants: [...shellContinuityRequiredInvariants],
      case_id: "portal-responsive-collapse",
      continuity_scope: "CLIENT_PORTAL_ROUTE",
      expected_inline_recovery_reason_or_null: null,
      expected_outcome: "PRESERVED",
      perturbations: ["RESIZE_WIDE_TO_NARROW", "RESPONSIVE_COLLAPSE"],
      post_state: state({
        active_context_ref_or_null: "REQUEST_DETAIL",
        canonical_object_ref: "request-info-1",
        dominant_meaning_ref_or_null: "UPLOAD_REQUESTED_DOCUMENT",
        dominant_question: "What does the firm need from me next?",
        focus_anchor_ref_or_null: "request:block:request-info-1",
        recovery_posture_or_null: "NONE",
        return_focus_anchor_ref_or_null: "portal-task:request-info-1",
        route_identity_ref: "REQUEST_DETAIL",
        settlement_state_or_null: "STEADY",
        shell_family: "CLIENT_PORTAL_SHELL",
      }),
      pre_state: state({
        active_context_ref_or_null: "REQUEST_DETAIL",
        canonical_object_ref: "request-info-1",
        dominant_meaning_ref_or_null: "UPLOAD_REQUESTED_DOCUMENT",
        dominant_question: "What does the firm need from me next?",
        focus_anchor_ref_or_null: "request:block:request-info-1",
        recovery_posture_or_null: "NONE",
        return_focus_anchor_ref_or_null: "portal-task:request-info-1",
        route_identity_ref: "REQUEST_DETAIL",
        settlement_state_or_null: "STEADY",
        shell_family: "CLIENT_PORTAL_SHELL",
      }),
      shell_family: "CLIENT_PORTAL_SHELL",
      shrink_sequence: ["RESPONSIVE_COLLAPSE"],
      surface_type: "ClientPortalWorkspace",
      truth_change_detected: false,
    }),
    continuityCase({
      asserted_invariants: [...shellContinuityRequiredInvariants],
      case_id: "governance-reconnect-preserved",
      continuity_scope: "GOVERNANCE_ROUTE",
      expected_inline_recovery_reason_or_null: null,
      expected_outcome: "PRESERVED",
      perturbations: ["RECONNECT", "RESIZE_NARROW_TO_WIDE"],
      post_state: state({
        active_context_ref_or_null: "APPROVAL_PANEL",
        canonical_object_ref: "tenant-1",
        dominant_meaning_ref_or_null: "OPEN_PENDING_APPROVALS",
        dominant_question: "What is the one highest-risk governance action right now?",
        focus_anchor_ref_or_null: "approval-cell:tenant-1",
        recovery_posture_or_null: "NONE",
        return_focus_anchor_ref_or_null: null,
        route_identity_ref: "/governance/risk/pending-approvals",
        settlement_state_or_null: "STEADY",
        shell_family: "GOVERNANCE_DENSITY_SHELL",
      }),
      pre_state: state({
        active_context_ref_or_null: "APPROVAL_PANEL",
        canonical_object_ref: "tenant-1",
        dominant_meaning_ref_or_null: "OPEN_PENDING_APPROVALS",
        dominant_question: "What is the one highest-risk governance action right now?",
        focus_anchor_ref_or_null: "approval-cell:tenant-1",
        recovery_posture_or_null: "NONE",
        return_focus_anchor_ref_or_null: null,
        route_identity_ref: "/governance/risk/pending-approvals",
        settlement_state_or_null: "STEADY",
        shell_family: "GOVERNANCE_DENSITY_SHELL",
      }),
      shell_family: "GOVERNANCE_DENSITY_SHELL",
      shrink_sequence: ["RECONNECT"],
      surface_type: "TenantGovernanceSnapshot",
      truth_change_detected: false,
    }),
    continuityCase({
      asserted_invariants: [...shellContinuityRequiredInvariants],
      case_id: "native-primary-scene-restore",
      continuity_scope: "NATIVE_PRIMARY_SCENE",
      expected_inline_recovery_reason_or_null: "INLINE_RECONNECT",
      expected_outcome: "INLINE_RECOVERY",
      perturbations: ["NATIVE_SCENE_RESTORE", "RECONNECT"],
      post_state: state({
        active_context_ref_or_null: "TRAILING_INSPECTOR:FOCUS_LENS",
        canonical_object_ref: "item-1",
        dominant_meaning_ref_or_null: "REQUEST_CLIENT_INFO",
        dominant_question: "What is the next lawful move on this work item?",
        focus_anchor_ref_or_null: "inspector:item-1",
        recovery_posture_or_null: "INLINE_RECONNECT",
        return_focus_anchor_ref_or_null: null,
        route_identity_ref: "scene:primary:item-1",
        settlement_state_or_null: "STEADY",
        shell_family: "CALM_SHELL",
      }),
      pre_state: state({
        active_context_ref_or_null: "TRAILING_INSPECTOR:FOCUS_LENS",
        canonical_object_ref: "item-1",
        dominant_meaning_ref_or_null: "REQUEST_CLIENT_INFO",
        dominant_question: "What is the next lawful move on this work item?",
        focus_anchor_ref_or_null: "inspector:item-1",
        recovery_posture_or_null: "NONE",
        return_focus_anchor_ref_or_null: null,
        route_identity_ref: "scene:primary:item-1",
        settlement_state_or_null: "STEADY",
        shell_family: "CALM_SHELL",
      }),
      shell_family: "CALM_SHELL",
      shrink_sequence: ["NATIVE_SCENE_RESTORE"],
      surface_type: "NativeOperatorWorkspaceScene",
      truth_change_detected: false,
    }),
    continuityCase({
      asserted_invariants: [...shellContinuityRequiredInvariants],
      case_id: "native-secondary-return-anchor",
      continuity_scope: "NATIVE_SECONDARY_WINDOW",
      expected_inline_recovery_reason_or_null: "PARENT_ANCHOR_RESTORE",
      expected_outcome: "INLINE_RECOVERY",
      perturbations: ["SECONDARY_WINDOW_RESTORE", "RECONNECT"],
      post_state: state({
        active_context_ref_or_null: "SECONDARY_COMPARE",
        canonical_object_ref: "item-1",
        dominant_meaning_ref_or_null: "REVIEW_COMPARE_CONTEXT",
        dominant_question: "How does this evidence compare to the current filing basis?",
        focus_anchor_ref_or_null: "compare-row:item-1",
        recovery_posture_or_null: "PARENT_ANCHOR_RESTORE",
        return_focus_anchor_ref_or_null: "canvas:item-1",
        route_identity_ref: "scene:secondary:compare:item-1",
        settlement_state_or_null: "STEADY",
        shell_family: "CALM_SHELL",
      }),
      pre_state: state({
        active_context_ref_or_null: "SECONDARY_COMPARE",
        canonical_object_ref: "item-1",
        dominant_meaning_ref_or_null: "REVIEW_COMPARE_CONTEXT",
        dominant_question: "How does this evidence compare to the current filing basis?",
        focus_anchor_ref_or_null: "compare-row:item-1",
        recovery_posture_or_null: "NONE",
        return_focus_anchor_ref_or_null: "canvas:item-1",
        route_identity_ref: "scene:secondary:compare:item-1",
        settlement_state_or_null: "STEADY",
        shell_family: "CALM_SHELL",
      }),
      shell_family: "CALM_SHELL",
      shrink_sequence: ["SECONDARY_WINDOW_RESTORE"],
      surface_type: "NativeOperatorSecondaryWindowScene",
      truth_change_detected: false,
    }),
  ];
}

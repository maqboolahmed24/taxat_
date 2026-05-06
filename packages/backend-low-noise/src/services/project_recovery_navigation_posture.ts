import type {
  FocusRestoreReturnTargetHarnessTriggerAction,
} from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import type { LowNoiseRecoveryPosture } from "../models/low_noise_frame.ts";
import {
  projectReturnTargetAndFallback,
  type ProjectReturnTargetAndFallbackInput,
  type ReturnTargetKind,
} from "./project_return_target_and_fallback.ts";

export type RecoveryNavigationPosture = {
  contract_version: "RECOVERY_NAVIGATION_POSTURE_V1";
  fallback_order_policy: "REMAP_WITHIN_OBJECT_THEN_OBJECT_SUMMARY_THEN_PARENT_RETURN_THEN_NARROWEST_LIST";
  focus_anchor_ref_or_null: string | null;
  focus_lock_policy: "PRESERVE_ACTIVE_FOCUS_LOCK" | "NO_ACTIVE_FOCUS_LOCK";
  recovery_navigation_state:
    | "RESTORE_INVOKER"
    | "REMAP_WITHIN_OBJECT"
    | "REBASE_TO_OBJECT_SUMMARY"
    | "RETURN_TO_PARENT"
    | "FALLBACK_TO_NARROWEST_LIST"
    | "INVALIDATED";
  recovery_posture: LowNoiseRecoveryPosture | "CONTEXTUAL_REBASE" | "PARENT_RETURN";
  restoration_disposition: ReturnType<typeof projectReturnTargetAndFallback>["focusRestoration"]["restoration_disposition"];
  restoration_reason_code_or_null: string | null;
  route_or_scene_ref_or_null: string | null;
  target_kind: ReturnTargetKind;
  trigger_action: FocusRestoreReturnTargetHarnessTriggerAction;
};

function stateForTarget(targetKind: ReturnTargetKind): RecoveryNavigationPosture["recovery_navigation_state"] {
  switch (targetKind) {
    case "INVOKER":
      return "RESTORE_INVOKER";
    case "SAME_OBJECT_REMAP":
      return "REMAP_WITHIN_OBJECT";
    case "OBJECT_SUMMARY":
      return "REBASE_TO_OBJECT_SUMMARY";
    case "PARENT_RETURN":
      return "RETURN_TO_PARENT";
    case "NARROWEST_SURVIVING_LIST":
      return "FALLBACK_TO_NARROWEST_LIST";
    case "INVALIDATED":
      return "INVALIDATED";
  }
}

export function projectRecoveryNavigationPosture(
  input: ProjectReturnTargetAndFallbackInput & {
    recoveryPosture?: RecoveryNavigationPosture["recovery_posture"] | undefined;
  },
): RecoveryNavigationPosture {
  const selection = projectReturnTargetAndFallback(input);
  return {
    contract_version: "RECOVERY_NAVIGATION_POSTURE_V1",
    fallback_order_policy: selection.fallbackOrderPolicy,
    focus_anchor_ref_or_null: selection.focusAnchorRefOrNull,
    focus_lock_policy:
      input.activeFocusLockKindOrNull !== null && input.activeFocusLockKindOrNull !== undefined
        ? "PRESERVE_ACTIVE_FOCUS_LOCK"
        : "NO_ACTIVE_FOCUS_LOCK",
    recovery_navigation_state: stateForTarget(selection.targetKind),
    recovery_posture: input.recoveryPosture ?? "NONE",
    restoration_disposition: selection.focusRestoration.restoration_disposition,
    restoration_reason_code_or_null: selection.restorationReasonCodeOrNull,
    route_or_scene_ref_or_null: selection.routeOrSceneRefOrNull,
    target_kind: selection.targetKind,
    trigger_action: input.triggerAction,
  };
}

import type { WorkspaceSnapshot } from "../projectors/build_workspace_snapshot.ts";
import {
  buildWorkspaceRouteContinuityContract,
  type CanonicalCrossDeviceContinuityContract,
} from "../contracts/build_cross_device_continuity_contract.ts";
import {
  buildExactFocusRestorationContract,
  type CanonicalFocusRestorationContract,
} from "../contracts/build_focus_restoration_contract.ts";
import { cloneWorkflowRecord } from "../models/workflow_item.ts";

export type WorkspaceContinuityStampedSnapshot<T extends WorkspaceSnapshot = WorkspaceSnapshot> =
  Omit<T, "cross_device_continuity_contract" | "route_context"> & {
    cross_device_continuity_contract: CanonicalCrossDeviceContinuityContract;
    route_context: T["route_context"] & {
      focus_restoration: CanonicalFocusRestorationContract;
    };
  };

export function stampWorkspaceContinuityMetadata<T extends WorkspaceSnapshot>(input: {
  focus_restoration?: CanonicalFocusRestorationContract | undefined;
  snapshot: T;
}): WorkspaceContinuityStampedSnapshot<T> {
  const snapshot = cloneWorkflowRecord(input.snapshot);
  const focusRestoration =
    input.focus_restoration ??
    buildExactFocusRestorationContract(snapshot.route_context.focus_anchor_ref_or_null);

  return {
    ...snapshot,
    cross_device_continuity_contract: buildWorkspaceRouteContinuityContract({
      access_scope_hash_or_null: snapshot.access_binding_hash,
      canonical_object_ref: snapshot.object_anchor_ref,
      dominant_action_state_or_null: snapshot.action_strip.actionability_state,
      focus_anchor_ref_or_null: snapshot.route_context.focus_anchor_ref_or_null,
      masking_scope_fingerprint_or_null: snapshot.masking_posture_fingerprint,
      parent_context_ref_or_null: snapshot.route_context.return_route_ref,
      return_focus_anchor_ref_or_null: snapshot.route_context.return_focus_anchor_ref,
      route_identity_ref: snapshot.workspace_route_key,
      shell_family: snapshot.shell_family,
      stability_guard_hash_or_null: snapshot.stability_contract.guard_vector_hash,
      visibility_cache_partition_key_or_null: snapshot.visibility_partition.cache_partition_key,
    }),
    route_context: {
      ...snapshot.route_context,
      focus_restoration: focusRestoration,
    },
  };
}

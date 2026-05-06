import {
  buildCrossDeviceContinuityContract,
  type CrossDeviceContinuityContract,
  type WorkspaceActionabilityState,
  type WorkspaceShellFamily,
} from "./projection_contract_helpers.ts";

export type BuildWorkspaceCrossDeviceContinuityInput = {
  access_binding_hash: string;
  actionability_state: WorkspaceActionabilityState;
  canonical_object_ref: string;
  focus_anchor_ref_or_null: string | null;
  masking_posture_fingerprint: string;
  parent_context_ref_or_null: string;
  return_focus_anchor_ref_or_null: string;
  route_identity_ref: string;
  shell_family: WorkspaceShellFamily;
  stability_guard_hash_or_null: string;
  visibility_cache_partition_key_or_null: string;
};

export function buildWorkspaceCrossDeviceContinuity(
  input: BuildWorkspaceCrossDeviceContinuityInput,
): CrossDeviceContinuityContract {
  return buildCrossDeviceContinuityContract(input);
}

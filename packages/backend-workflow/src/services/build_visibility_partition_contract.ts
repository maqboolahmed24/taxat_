import {
  buildVisibilityPartitionContract,
  type VisibilityPartitionContract,
} from "../projectors/projection_contract_helpers.ts";
import {
  enforceVisibilityPartition,
  type VisibilityClass,
} from "../contracts/enforce_visibility_partition.ts";

export type BuildWorkflowVisibilityPartitionContractInput = {
  access_binding_hash: string;
  allowed_visibility_classes: VisibilityClass[];
  audience_class: VisibilityPartitionContract["audience_class"];
  badge_counter_policy: VisibilityPartitionContract["badge_counter_policy"];
  cache_partition_key?: string | undefined;
  masking_posture_fingerprint: string;
  ordering_side_channel_policy: VisibilityPartitionContract["ordering_side_channel_policy"];
  partition_scope: VisibilityPartitionContract["partition_scope"];
  subject_ref: string;
};

export function buildWorkflowVisibilityPartitionContract(
  input: BuildWorkflowVisibilityPartitionContractInput,
): VisibilityPartitionContract {
  const visibilityPartition = buildVisibilityPartitionContract(input);
  return enforceVisibilityPartition({
    artifact: {
      access_binding_hash: visibilityPartition.access_binding_hash,
      masking_posture_fingerprint: visibilityPartition.masking_posture_fingerprint,
      visibility_partition: visibilityPartition,
    },
    artifact_label: input.partition_scope,
    expected_allowed_visibility_classes: input.allowed_visibility_classes,
    expected_audience_class: input.audience_class,
    expected_partition_scope: input.partition_scope,
  });
}

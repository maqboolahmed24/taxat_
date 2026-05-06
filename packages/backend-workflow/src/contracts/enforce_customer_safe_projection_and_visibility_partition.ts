import type {
  CustomerSafeProjectionContract,
  VisibilityPartitionContract,
} from "../projectors/projection_contract_helpers.ts";
import {
  enforceCustomerSafeProjection,
  type CustomerSafeProjectionRequirement,
} from "./enforce_customer_safe_projection.ts";
import {
  enforceVisibilityPartition,
  type VisibilityClass,
  type VisibilityPartitionArtifactScope,
  type VisibilityPartitionAudienceClass,
} from "./enforce_visibility_partition.ts";

export type EnforcedCustomerSafeProjectionBoundary = {
  customer_safe_projection: CustomerSafeProjectionContract | null;
  visibility_partition: VisibilityPartitionContract;
};

export type EnforceCustomerSafeProjectionAndVisibilityPartitionInput = {
  artifact: Record<string, unknown>;
  artifact_label?: string | undefined;
  expected_allowed_visibility_classes?: readonly VisibilityClass[] | undefined;
  expected_boundary_scope?: CustomerSafeProjectionContract["boundary_scope"] | undefined;
  expected_partition_scope?: VisibilityPartitionArtifactScope | undefined;
  expected_projection_audience?: CustomerSafeProjectionContract["projection_audience"] | undefined;
  expected_visibility_audience_class?: VisibilityPartitionAudienceClass | undefined;
  requirement?: CustomerSafeProjectionRequirement | undefined;
};

export function enforceCustomerSafeProjectionAndVisibilityPartition(
  input: EnforceCustomerSafeProjectionAndVisibilityPartitionInput,
): EnforcedCustomerSafeProjectionBoundary {
  const visibilityPartition = enforceVisibilityPartition({
    artifact: input.artifact,
    artifact_label: input.artifact_label,
    expected_allowed_visibility_classes: input.expected_allowed_visibility_classes,
    expected_audience_class: input.expected_visibility_audience_class,
    expected_partition_scope: input.expected_partition_scope,
  });
  const customerSafeProjection = enforceCustomerSafeProjection({
    artifact: input.artifact,
    artifact_label: input.artifact_label,
    expected_boundary_scope: input.expected_boundary_scope,
    expected_projection_audience: input.expected_projection_audience,
    requirement: input.requirement,
    visibility_partition: visibilityPartition,
  });
  return {
    customer_safe_projection: customerSafeProjection,
    visibility_partition: visibilityPartition,
  };
}

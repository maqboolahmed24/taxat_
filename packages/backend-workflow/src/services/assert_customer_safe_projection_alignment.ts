import {
  enforceCustomerSafeProjectionAndVisibilityPartition,
  type EnforcedCustomerSafeProjectionBoundary,
} from "../contracts/enforce_customer_safe_projection_and_visibility_partition.ts";
import type { CustomerSafeProjectionRequirement } from "../contracts/enforce_customer_safe_projection.ts";
import type {
  CustomerSafeProjectionContract,
  VisibilityPartitionContract,
} from "../projectors/projection_contract_helpers.ts";

export type AssertCustomerSafeProjectionAlignmentInput = {
  artifact: Record<string, unknown>;
  artifact_label?: string | undefined;
  expected_allowed_visibility_classes?: readonly VisibilityPartitionContract["allowed_visibility_classes"][number][] | undefined;
  expected_boundary_scope?: CustomerSafeProjectionContract["boundary_scope"] | undefined;
  expected_partition_scope?: VisibilityPartitionContract["partition_scope"] | undefined;
  expected_projection_audience?: CustomerSafeProjectionContract["projection_audience"] | undefined;
  expected_visibility_audience_class?: VisibilityPartitionContract["audience_class"] | undefined;
  requirement?: CustomerSafeProjectionRequirement | undefined;
};

export function assertCustomerSafeProjectionAlignment(
  input: AssertCustomerSafeProjectionAlignmentInput,
): EnforcedCustomerSafeProjectionBoundary {
  return enforceCustomerSafeProjectionAndVisibilityPartition(input);
}

import {
  buildCustomerSafeProjectionContract,
  type CustomerSafeProjectionContract,
  type VisibilityPartitionContract,
} from "../projectors/projection_contract_helpers.ts";
import { enforceCustomerSafeProjection } from "../contracts/enforce_customer_safe_projection.ts";

export type BuildWorkflowCustomerSafeProjectionContractInput = {
  access_binding_hash: string;
  boundary_scope: CustomerSafeProjectionContract["boundary_scope"];
  masking_posture_fingerprint: string;
  projection_audience: CustomerSafeProjectionContract["projection_audience"];
  visibility_cache_partition_key: string;
  visibility_partition?: VisibilityPartitionContract | undefined;
};

export function buildWorkflowCustomerSafeProjectionContract(
  input: BuildWorkflowCustomerSafeProjectionContractInput,
): CustomerSafeProjectionContract {
  const customerSafeProjection = buildCustomerSafeProjectionContract(input);
  return enforceCustomerSafeProjection({
    artifact: {
      access_binding_hash: input.access_binding_hash,
      customer_safe_projection: customerSafeProjection,
      masking_posture_fingerprint: input.masking_posture_fingerprint,
      shell_family: "CLIENT_PORTAL_SHELL",
      visibility_partition: input.visibility_partition,
    },
    artifact_label: input.boundary_scope,
    expected_boundary_scope: input.boundary_scope,
    expected_projection_audience: input.projection_audience,
    requirement: "REQUIRED",
    visibility_partition: input.visibility_partition,
  })!;
}

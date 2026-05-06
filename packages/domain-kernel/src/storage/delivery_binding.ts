import {
  computeDeliveryBindingHash,
  verifyDeliveryBindingHash,
  type DeliveryBindingContext,
} from "../references/delivery_binding.ts";

import {
  findDeliveryBindingRows,
  StorageBoundaryError,
  type GovernedObjectRecord,
  type ObjectLifecyclePolicyBundle,
  type StorageDeliveryAffordance,
} from "./object_lifecycle.ts";

export type GovernedObjectDeliveryBinding = {
  affordance: StorageDeliveryAffordance;
  deliveryBindingHash: string;
  downloadRefOrNull: string | null;
  previewTargetRefOrNull: string | null;
  rowRef: string;
  signedDeliveryPolicy: string;
  targetRef: string;
};

export function createGovernedObjectDeliveryBinding(
  bundle: ObjectLifecyclePolicyBundle,
  record: GovernedObjectRecord,
  input: {
    affordance: StorageDeliveryAffordance;
    context: DeliveryBindingContext;
    downloadRefOrNull?: string | null;
    previewTargetRefOrNull?: string | null;
    targetRef: string;
  },
): GovernedObjectDeliveryBinding {
  const [row] = findDeliveryBindingRows(
    bundle,
    record.objectClassRef,
    record.lifecycleState,
    input.affordance,
  );
  if (!row) {
    throw new StorageBoundaryError({
      code: "DELIVERY_BINDING_ROW_MISSING",
      detail: `no delivery row for ${record.objectClassRef} at ${record.lifecycleState}`,
    });
  }
  if (row.delivery_law !== "ALLOW_GOVERNED_BINDING") {
    throw new StorageBoundaryError({
      code: "DELIVERY_BINDING_ROW_MISSING",
      detail: `${record.objectClassRef} is not deliverable in ${record.lifecycleState}`,
    });
  }
  if (
    row.customer_safe_derivative_required &&
    record.objectClassRef !== "CUSTOMER_SAFE_DERIVATIVE" &&
    record.objectClassRef !== "MASKED_EXPORT_BUNDLE"
  ) {
    throw new StorageBoundaryError({
      code: "DELIVERY_BINDING_ROW_MISSING",
      detail: `${record.objectClassRef} requires a customer-safe derivative before delivery`,
    });
  }

  return {
    affordance: input.affordance,
    deliveryBindingHash: computeDeliveryBindingHash({
      ...input.context,
      affordance: input.affordance === "EXTERNALIZATION" ? "EXTERNALIZATION" : input.affordance,
      targetRef: input.targetRef,
    }),
    downloadRefOrNull: input.downloadRefOrNull ?? null,
    previewTargetRefOrNull: input.previewTargetRefOrNull ?? null,
    rowRef: row.delivery_row_ref,
    signedDeliveryPolicy: row.signed_delivery_policy,
    targetRef: input.targetRef,
  };
}

export function assertGovernedObjectDeliveryBindingCurrent(
  record: GovernedObjectRecord,
  input: {
    bindingHash: string;
    context: DeliveryBindingContext;
  },
) {
  if (!record.deliveryBindingHashOrNull) {
    throw new StorageBoundaryError({
      code: "DELIVERY_BINDING_ROW_MISSING",
      detail: `${record.objectRef} has no active delivery binding`,
    });
  }
  if (
    record.deliveryBindingHashOrNull !== input.bindingHash ||
    !verifyDeliveryBindingHash(input.bindingHash, input.context)
  ) {
    throw new StorageBoundaryError({
      code: "DELIVERY_BINDING_ROW_MISSING",
      detail: `delivery binding drift detected for ${record.objectRef}`,
    });
  }
}

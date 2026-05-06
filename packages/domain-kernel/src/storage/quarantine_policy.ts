import {
  StorageBoundaryError,
  type GovernedObjectRecord,
  type ObjectLifecyclePolicyBundle,
  type QuarantineTransitionPolicyRow,
} from "./object_lifecycle.ts";

export type QuarantineEvaluation = {
  deliveryRevoked: boolean;
  reasonCodes: string[];
  row: QuarantineTransitionPolicyRow;
};

function selectTransitionRow(
  bundle: ObjectLifecyclePolicyBundle,
  input: {
    lifecycleState: GovernedObjectRecord["lifecycleState"];
    malwareScanState: GovernedObjectRecord["malwareScanState"];
    triggerRef: string;
  },
) {
  const row =
    bundle.quarantineTransitionPolicy.transition_rows.find(
      (entry) =>
        entry.trigger_ref === input.triggerRef &&
        entry.from_lifecycle_state === input.lifecycleState &&
        entry.malware_scan_state === input.malwareScanState,
    ) ?? null;

  if (!row) {
    throw new StorageBoundaryError({
      code: "POLICY_VALIDATION_FAILED",
      detail: `no quarantine transition for ${input.triggerRef} from ${input.lifecycleState}`,
    });
  }

  return row;
}

export function evaluateQuarantineTransition(
  bundle: ObjectLifecyclePolicyBundle,
  record: GovernedObjectRecord,
  input: {
    additionalReasonCodes?: string[];
    malwareScanState: GovernedObjectRecord["malwareScanState"];
    triggerRef: string;
  },
): QuarantineEvaluation {
  const row = selectTransitionRow(bundle, {
    lifecycleState: record.lifecycleState,
    malwareScanState: input.malwareScanState,
    triggerRef: input.triggerRef,
  });

  return {
    deliveryRevoked:
      row.customer_delivery_effect === "REVOKE_PREVIEW_AND_DOWNLOAD" ||
      row.customer_delivery_effect === "REVOKE_OR_KEEP_UNAVAILABLE",
    reasonCodes: [...row.required_reason_codes, ...(input.additionalReasonCodes ?? [])],
    row,
  };
}

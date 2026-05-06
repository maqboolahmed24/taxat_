import { WorkflowModelError } from "../models/workflow_item.ts";

export type CanonicalFocusRestorationContract = {
  requested_focus_anchor_ref_or_null: string | null;
  resolved_focus_anchor_ref_or_null: string | null;
  restoration_disposition:
    | "EXACT_FOCUS"
    | "REMAPPED_FOCUS"
    | "OBJECT_SUMMARY"
    | "PARENT_RETURN"
    | "INVALIDATED";
  restoration_reason_code_or_null: string | null;
};
export type FocusRestorationDisposition =
  CanonicalFocusRestorationContract["restoration_disposition"];

export type BuildCanonicalFocusRestorationContractInput = {
  requested_focus_anchor_ref_or_null: string | null;
  resolved_focus_anchor_ref_or_null: string | null;
  restoration_disposition: FocusRestorationDisposition;
  restoration_reason_code_or_null: string | null;
};

function continuityError(message: string): never {
  throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", message);
}

function normalizeNullableAnchor(label: string, value: string | null) {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    continuityError(`${label} must be null or a non-empty focus anchor`);
  }
  return trimmed;
}

export function validateFocusRestorationContract(
  contract: CanonicalFocusRestorationContract,
): CanonicalFocusRestorationContract {
  const requested = normalizeNullableAnchor(
    "focus_restoration.requested_focus_anchor_ref_or_null",
    contract.requested_focus_anchor_ref_or_null,
  );
  const resolved = normalizeNullableAnchor(
    "focus_restoration.resolved_focus_anchor_ref_or_null",
    contract.resolved_focus_anchor_ref_or_null,
  );
  const reason = normalizeNullableAnchor(
    "focus_restoration.restoration_reason_code_or_null",
    contract.restoration_reason_code_or_null,
  );

  switch (contract.restoration_disposition) {
    case "EXACT_FOCUS":
      if (requested !== resolved) {
        continuityError("EXACT_FOCUS must mirror requested and resolved focus anchors");
      }
      if (reason !== null) {
        continuityError("EXACT_FOCUS must clear restoration_reason_code_or_null");
      }
      break;
    case "REMAPPED_FOCUS":
      if (requested === null || resolved === null || requested === resolved) {
        continuityError("REMAPPED_FOCUS requires distinct requested and resolved anchors");
      }
      if (reason === null) {
        continuityError("REMAPPED_FOCUS requires a typed restoration reason");
      }
      break;
    case "OBJECT_SUMMARY":
    case "PARENT_RETURN":
    case "INVALIDATED":
      if (resolved !== null) {
        continuityError(`${contract.restoration_disposition} must clear resolved_focus_anchor_ref_or_null`);
      }
      if (reason === null) {
        continuityError(`${contract.restoration_disposition} requires a typed restoration reason`);
      }
      break;
    default:
      continuityError("focus_restoration.restoration_disposition is outside the governed vocabulary");
  }

  return {
    requested_focus_anchor_ref_or_null: requested,
    resolved_focus_anchor_ref_or_null: resolved,
    restoration_disposition: contract.restoration_disposition,
    restoration_reason_code_or_null: reason,
  };
}

export function buildCanonicalFocusRestorationContract(
  input: BuildCanonicalFocusRestorationContractInput,
): CanonicalFocusRestorationContract {
  return validateFocusRestorationContract({
    requested_focus_anchor_ref_or_null: input.requested_focus_anchor_ref_or_null,
    resolved_focus_anchor_ref_or_null: input.resolved_focus_anchor_ref_or_null,
    restoration_disposition: input.restoration_disposition,
    restoration_reason_code_or_null: input.restoration_reason_code_or_null,
  });
}

export function buildExactFocusRestorationContract(
  focusAnchorRefOrNull: string | null,
): CanonicalFocusRestorationContract {
  return buildCanonicalFocusRestorationContract({
    requested_focus_anchor_ref_or_null: focusAnchorRefOrNull,
    resolved_focus_anchor_ref_or_null: focusAnchorRefOrNull,
    restoration_disposition: "EXACT_FOCUS",
    restoration_reason_code_or_null: null,
  });
}

export function buildObjectSummaryFocusRestorationContract(input: {
  requested_focus_anchor_ref_or_null: string | null;
  reason_code: string;
}): CanonicalFocusRestorationContract {
  return buildCanonicalFocusRestorationContract({
    requested_focus_anchor_ref_or_null: input.requested_focus_anchor_ref_or_null,
    resolved_focus_anchor_ref_or_null: null,
    restoration_disposition: "OBJECT_SUMMARY",
    restoration_reason_code_or_null: input.reason_code,
  });
}

export function buildParentReturnFocusRestorationContract(input: {
  requested_focus_anchor_ref_or_null: string | null;
  reason_code: string;
}): CanonicalFocusRestorationContract {
  return buildCanonicalFocusRestorationContract({
    requested_focus_anchor_ref_or_null: input.requested_focus_anchor_ref_or_null,
    resolved_focus_anchor_ref_or_null: null,
    restoration_disposition: "PARENT_RETURN",
    restoration_reason_code_or_null: input.reason_code,
  });
}

export function buildInvalidatedFocusRestorationContract(input: {
  requested_focus_anchor_ref_or_null: string | null;
  reason_code: string;
}): CanonicalFocusRestorationContract {
  return buildCanonicalFocusRestorationContract({
    requested_focus_anchor_ref_or_null: input.requested_focus_anchor_ref_or_null,
    resolved_focus_anchor_ref_or_null: null,
    restoration_disposition: "INVALIDATED",
    restoration_reason_code_or_null: input.reason_code,
  });
}

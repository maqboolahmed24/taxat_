import type {
  FocusRestorationContract,
} from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";

export type FocusRestorationReasonCode =
  | "FOCUS_ANCHOR_REMAPPED_WITHIN_OBJECT"
  | "FOCUS_TARGET_STALE_OBJECT_SUMMARY"
  | "SERIALIZED_PARENT_RETURN_SELECTED"
  | "NARROWEST_SURVIVING_LIST_SELECTED"
  | "NO_LAWFUL_FOCUS_TARGET";

function normalizedAnchor(value: string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error("Focus anchors must be non-empty strings when present");
  }
  return trimmed;
}

export function projectFocusRestorationContract(input: {
  exactFocusAnchorRefOrNull?: string | null | undefined;
  invalidationReasonCode?: FocusRestorationReasonCode | undefined;
  narrowestListAvailable?: boolean | undefined;
  objectSummaryAvailable?: boolean | undefined;
  parentReturnAvailable?: boolean | undefined;
  reasonCode?: FocusRestorationReasonCode | undefined;
  remappedFocusAnchorRefOrNull?: string | null | undefined;
  requestedFocusAnchorRefOrNull?: string | null | undefined;
} = {}): FocusRestorationContract {
  const requestedFocusAnchorRefOrNull = normalizedAnchor(input.requestedFocusAnchorRefOrNull);
  const exactFocusAnchorRefOrNull = normalizedAnchor(input.exactFocusAnchorRefOrNull);
  const remappedFocusAnchorRefOrNull = normalizedAnchor(input.remappedFocusAnchorRefOrNull);

  if (exactFocusAnchorRefOrNull !== null) {
    return {
      requested_focus_anchor_ref_or_null: exactFocusAnchorRefOrNull,
      resolved_focus_anchor_ref_or_null: exactFocusAnchorRefOrNull,
      restoration_disposition: "EXACT_FOCUS",
      restoration_reason_code_or_null: null,
    };
  }

  if (remappedFocusAnchorRefOrNull !== null) {
    if (requestedFocusAnchorRefOrNull === null) {
      throw new Error("Remapped focus restoration requires the originally requested focus anchor");
    }
    return {
      requested_focus_anchor_ref_or_null: requestedFocusAnchorRefOrNull,
      resolved_focus_anchor_ref_or_null: remappedFocusAnchorRefOrNull,
      restoration_disposition: "REMAPPED_FOCUS",
      restoration_reason_code_or_null:
        input.reasonCode ?? "FOCUS_ANCHOR_REMAPPED_WITHIN_OBJECT",
    };
  }

  if (input.objectSummaryAvailable === true) {
    return {
      requested_focus_anchor_ref_or_null: requestedFocusAnchorRefOrNull,
      resolved_focus_anchor_ref_or_null: null,
      restoration_disposition: "OBJECT_SUMMARY",
      restoration_reason_code_or_null: input.reasonCode ?? "FOCUS_TARGET_STALE_OBJECT_SUMMARY",
    };
  }

  if (input.parentReturnAvailable === true) {
    return {
      requested_focus_anchor_ref_or_null: requestedFocusAnchorRefOrNull,
      resolved_focus_anchor_ref_or_null: null,
      restoration_disposition: "PARENT_RETURN",
      restoration_reason_code_or_null: input.reasonCode ?? "SERIALIZED_PARENT_RETURN_SELECTED",
    };
  }

  if (input.narrowestListAvailable === true) {
    return {
      requested_focus_anchor_ref_or_null: requestedFocusAnchorRefOrNull,
      resolved_focus_anchor_ref_or_null: null,
      restoration_disposition: "PARENT_RETURN",
      restoration_reason_code_or_null: input.reasonCode ?? "NARROWEST_SURVIVING_LIST_SELECTED",
    };
  }

  return {
    requested_focus_anchor_ref_or_null: requestedFocusAnchorRefOrNull,
    resolved_focus_anchor_ref_or_null: null,
    restoration_disposition: "INVALIDATED",
    restoration_reason_code_or_null: input.invalidationReasonCode ?? "NO_LAWFUL_FOCUS_TARGET",
  };
}

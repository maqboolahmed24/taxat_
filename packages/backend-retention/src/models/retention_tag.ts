import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";

export const RETENTION_CLASSES = [
  "regulated_record",
  "derived_artifact",
  "operational_log",
  "analytics_projection",
  "policy_governed_other",
] as const;

export const RETENTION_LEGAL_HOLD_STATES = [
  "NONE",
  "ACTIVE",
  "RELEASE_ELIGIBLE",
  "RELEASED",
] as const;

export const RETENTION_ERASURE_ELIGIBILITIES = [
  "ELIGIBLE",
  "BLOCKED_LEGAL_HOLD",
  "BLOCKED_STATUTORY_MINIMUM",
  "BLOCKED_PROOF_PRESERVATION",
  "BLOCKED_AUTHORITY_AMBIGUITY",
] as const;

export const RETENTION_LIMITATION_BEHAVIORS = [
  "NONE",
  "SURVIVE_WITH_LIMITATION_NOTES",
  "EXPIRED_PLACEHOLDER_ONLY",
  "PSEUDONYMISED_SURVIVAL",
] as const;

export type RetentionClass = (typeof RETENTION_CLASSES)[number];
export type RetentionLegalHoldState = (typeof RETENTION_LEGAL_HOLD_STATES)[number];
export type RetentionErasureEligibility = (typeof RETENTION_ERASURE_ELIGIBILITIES)[number];
export type RetentionLimitationBehavior = (typeof RETENTION_LIMITATION_BEHAVIORS)[number];

export type RetentionTagRecord = {
  artifact_type: "RetentionTag";
  retention_tag_id: string;
  retention_class: RetentionClass;
  anchor_event: string;
  anchor_timestamp: string;
  minimum_expiry_at: string;
  policy_expiry_at: string;
  effective_expiry_at: string;
  legal_hold_state: RetentionLegalHoldState;
  legal_hold_ref: string | null;
  legal_hold_changed_at: string | null;
  erasure_eligibility: RetentionErasureEligibility;
  erasure_decided_at: string;
  erasure_reason_codes: string[];
  pseudonymisation_mode: string;
  limitation_behavior: RetentionLimitationBehavior;
  limitation_reason_codes: string[];
  retention_basis_ref: string;
  proof_preservation_basis_ref: string | null;
  authority_ambiguity_ref: string | null;
};

export type RetentionTagInput = RetentionTagRecord;

export type RetentionModelErrorCode =
  | "RETENTION_FIELD_INVALID"
  | "RETENTION_CHRONOLOGY_INVALID"
  | "RETENTION_HOLD_POSTURE_INVALID"
  | "RETENTION_LIMITATION_INVALID"
  | "RETENTION_BLOCKING_BASIS_INVALID";

export class RetentionModelError extends Error {
  readonly code: RetentionModelErrorCode;

  constructor(code: RetentionModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "RetentionModelError";
    this.code = code;
  }
}

export function assertRetention(
  condition: unknown,
  code: RetentionModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new RetentionModelError(code, detail);
  }
}

export function assertNonEmptyRetentionString(label: string, value: unknown) {
  assertRetention(
    typeof value === "string" && value.length > 0,
    "RETENTION_FIELD_INVALID",
    `${label} must be a non-empty string`,
  );
  return value;
}

export function normalizeNullableRetentionString(label: string, value: unknown) {
  if (value === null) {
    return null;
  }
  return assertNonEmptyRetentionString(label, value);
}

export function uniqueSortedRetentionStrings(
  label: string,
  values: readonly string[],
  options: { allow_empty: boolean } = { allow_empty: true },
) {
  assertRetention(
    Array.isArray(values) && values.every((value) => typeof value === "string" && value.length > 0),
    "RETENTION_FIELD_INVALID",
    `${label} must contain only non-empty strings`,
  );
  const sorted = [...new Set(values)].sort((left, right) => left.localeCompare(right));
  assertRetention(
    sorted.length === values.length,
    "RETENTION_FIELD_INVALID",
    `${label} must not contain duplicate values`,
  );
  assertRetention(
    options.allow_empty || sorted.length > 0,
    "RETENTION_FIELD_INVALID",
    `${label} must not be empty`,
  );
  return sorted;
}

function normalizeEnumValue<T extends string>(
  label: string,
  value: unknown,
  allowedValues: readonly T[],
) {
  assertRetention(
    typeof value === "string" && allowedValues.includes(value as T),
    "RETENTION_FIELD_INVALID",
    `${label} must be one of ${allowedValues.join(", ")}`,
  );
  return value as T;
}

export function normalizeRetentionClass(value: unknown) {
  return normalizeEnumValue("retention_class", value, RETENTION_CLASSES);
}

export function normalizeRetentionLimitationBehavior(value: unknown) {
  return normalizeEnumValue("limitation_behavior", value, RETENTION_LIMITATION_BEHAVIORS);
}

export function normalizeRetentionTag(input: RetentionTagInput): RetentionTagRecord {
  assertRetention(
    input.artifact_type === "RetentionTag",
    "RETENTION_FIELD_INVALID",
    "artifact_type must be RetentionTag",
  );

  const tag: RetentionTagRecord = {
    artifact_type: "RetentionTag",
    retention_tag_id: assertNonEmptyRetentionString(
      "retention_tag_id",
      input.retention_tag_id,
    ),
    retention_class: normalizeRetentionClass(input.retention_class),
    anchor_event: assertNonEmptyRetentionString("anchor_event", input.anchor_event),
    anchor_timestamp: normalizeUtcInstantString(input.anchor_timestamp),
    minimum_expiry_at: normalizeUtcInstantString(input.minimum_expiry_at),
    policy_expiry_at: normalizeUtcInstantString(input.policy_expiry_at),
    effective_expiry_at: normalizeUtcInstantString(input.effective_expiry_at),
    legal_hold_state: normalizeEnumValue(
      "legal_hold_state",
      input.legal_hold_state,
      RETENTION_LEGAL_HOLD_STATES,
    ),
    legal_hold_ref: normalizeNullableRetentionString("legal_hold_ref", input.legal_hold_ref),
    legal_hold_changed_at:
      input.legal_hold_changed_at === null
        ? null
        : normalizeUtcInstantString(input.legal_hold_changed_at),
    erasure_eligibility: normalizeEnumValue(
      "erasure_eligibility",
      input.erasure_eligibility,
      RETENTION_ERASURE_ELIGIBILITIES,
    ),
    erasure_decided_at: normalizeUtcInstantString(input.erasure_decided_at),
    erasure_reason_codes: uniqueSortedRetentionStrings(
      "erasure_reason_codes",
      input.erasure_reason_codes,
      { allow_empty: false },
    ),
    pseudonymisation_mode: assertNonEmptyRetentionString(
      "pseudonymisation_mode",
      input.pseudonymisation_mode,
    ),
    limitation_behavior: normalizeRetentionLimitationBehavior(input.limitation_behavior),
    limitation_reason_codes: uniqueSortedRetentionStrings(
      "limitation_reason_codes",
      input.limitation_reason_codes,
    ),
    retention_basis_ref: assertNonEmptyRetentionString(
      "retention_basis_ref",
      input.retention_basis_ref,
    ),
    proof_preservation_basis_ref: normalizeNullableRetentionString(
      "proof_preservation_basis_ref",
      input.proof_preservation_basis_ref,
    ),
    authority_ambiguity_ref: normalizeNullableRetentionString(
      "authority_ambiguity_ref",
      input.authority_ambiguity_ref,
    ),
  };

  assertRetentionTagInvariants(tag);
  return tag;
}

function epoch(value: string) {
  return Date.parse(value);
}

function assertAtOrAfter(label: string, candidate: string, floorLabel: string, floor: string) {
  assertRetention(
    epoch(candidate) >= epoch(floor),
    "RETENTION_CHRONOLOGY_INVALID",
    `${label} must not be earlier than ${floorLabel}`,
  );
}

export function assertRetentionTagInvariants(tag: RetentionTagRecord) {
  assertAtOrAfter(
    "minimum_expiry_at",
    tag.minimum_expiry_at,
    "anchor_timestamp",
    tag.anchor_timestamp,
  );
  assertAtOrAfter(
    "policy_expiry_at",
    tag.policy_expiry_at,
    "anchor_timestamp",
    tag.anchor_timestamp,
  );
  assertAtOrAfter(
    "effective_expiry_at",
    tag.effective_expiry_at,
    "minimum_expiry_at",
    tag.minimum_expiry_at,
  );
  assertAtOrAfter(
    "effective_expiry_at",
    tag.effective_expiry_at,
    "policy_expiry_at",
    tag.policy_expiry_at,
  );
  assertAtOrAfter(
    "erasure_decided_at",
    tag.erasure_decided_at,
    "anchor_timestamp",
    tag.anchor_timestamp,
  );
  if (tag.legal_hold_changed_at !== null) {
    assertAtOrAfter(
      "legal_hold_changed_at",
      tag.legal_hold_changed_at,
      "anchor_timestamp",
      tag.anchor_timestamp,
    );
  }

  if (tag.legal_hold_state === "NONE") {
    assertRetention(
      tag.legal_hold_ref === null && tag.legal_hold_changed_at === null,
      "RETENTION_HOLD_POSTURE_INVALID",
      "legal_hold_state=NONE must not carry hold lineage",
    );
    assertRetention(
      tag.erasure_eligibility !== "BLOCKED_LEGAL_HOLD",
      "RETENTION_HOLD_POSTURE_INVALID",
      "legal_hold_state=NONE must not block erasure through legal hold",
    );
  }
  if (tag.legal_hold_state === "ACTIVE" || tag.legal_hold_state === "RELEASE_ELIGIBLE") {
    assertRetention(
      tag.legal_hold_ref !== null && tag.legal_hold_changed_at !== null,
      "RETENTION_HOLD_POSTURE_INVALID",
      "active or release-eligible legal holds require hold ref and changed timestamp",
    );
    assertRetention(
      tag.erasure_eligibility === "BLOCKED_LEGAL_HOLD",
      "RETENTION_HOLD_POSTURE_INVALID",
      "active or release-eligible legal holds must block erasure",
    );
  }
  if (tag.legal_hold_state === "RELEASED") {
    assertRetention(
      tag.legal_hold_ref !== null && tag.legal_hold_changed_at !== null,
      "RETENTION_HOLD_POSTURE_INVALID",
      "released legal holds retain hold ref and changed timestamp",
    );
    assertRetention(
      tag.erasure_eligibility !== "BLOCKED_LEGAL_HOLD",
      "RETENTION_HOLD_POSTURE_INVALID",
      "released legal holds must not keep legal-hold erasure blocking",
    );
  }

  if (tag.limitation_behavior === "NONE") {
    assertRetention(
      tag.limitation_reason_codes.length === 0,
      "RETENTION_LIMITATION_INVALID",
      "limitation_behavior=NONE must not carry limitation reasons",
    );
  } else {
    assertRetention(
      tag.limitation_reason_codes.length > 0,
      "RETENTION_LIMITATION_INVALID",
      "non-NONE limitation behavior requires limitation reasons",
    );
  }

  if (tag.erasure_eligibility === "BLOCKED_PROOF_PRESERVATION") {
    assertRetention(
      tag.proof_preservation_basis_ref !== null && tag.authority_ambiguity_ref === null,
      "RETENTION_BLOCKING_BASIS_INVALID",
      "proof-preservation blocking requires only proof_preservation_basis_ref",
    );
  } else if (tag.erasure_eligibility === "BLOCKED_AUTHORITY_AMBIGUITY") {
    assertRetention(
      tag.authority_ambiguity_ref !== null && tag.proof_preservation_basis_ref === null,
      "RETENTION_BLOCKING_BASIS_INVALID",
      "authority-ambiguity blocking requires only authority_ambiguity_ref",
    );
  } else {
    assertRetention(
      tag.proof_preservation_basis_ref === null && tag.authority_ambiguity_ref === null,
      "RETENTION_BLOCKING_BASIS_INVALID",
      "proof or authority basis refs must match their erasure blocking posture",
    );
  }
}

export function deriveRetentionTagId(input: {
  anchor_event: string;
  anchor_timestamp: string;
  artifact_ref: string;
  retention_basis_ref: string;
  retention_class: RetentionClass;
}) {
  return `retention-tag://${stableJsonHash({
    anchor_event: assertNonEmptyRetentionString("anchor_event", input.anchor_event),
    anchor_timestamp: normalizeUtcInstantString(input.anchor_timestamp),
    artifact_ref: assertNonEmptyRetentionString("artifact_ref", input.artifact_ref),
    retention_basis_ref: assertNonEmptyRetentionString(
      "retention_basis_ref",
      input.retention_basis_ref,
    ),
    retention_class: normalizeRetentionClass(input.retention_class),
  })}`;
}

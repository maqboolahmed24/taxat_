import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  assertNonEmptyRetentionString,
  assertRetention,
  deriveRetentionTagId,
  normalizeNullableRetentionString,
  normalizeRetentionClass,
  normalizeRetentionLimitationBehavior,
  normalizeRetentionTag,
  type RetentionClass,
  type RetentionErasureEligibility,
  type RetentionLegalHoldState,
  type RetentionLimitationBehavior,
  type RetentionTagRecord,
} from "../models/retention_tag.ts";

export const RETENTION_ANCHOR_EVENT_BY_OBJECT_CLASS = {
  SOURCE_RECORD: "SOURCE_RECORD_CAPTURED",
  EVIDENCE_ITEM: "EVIDENCE_ITEM_MATERIALIZED",
  CANONICAL_FACT: "CANONICAL_FACT_CREATED",
  DECISION_BUNDLE: "DECISION_BUNDLE_SEALED",
  PROOF_BUNDLE: "PROOF_BUNDLE_PERSISTED",
  EVIDENCE_GRAPH: "EVIDENCE_GRAPH_PERSISTED",
  ENQUIRY_PACK: "ENQUIRY_PACK_RENDERED",
  RUN_MANIFEST: "RUN_MANIFEST_STARTED",
  AUDIT_EVENT: "AUDIT_EVENT_APPENDED",
  ERROR_RECORD: "ERROR_RECORD_OPENED",
  REMEDIATION_OBJECT: "FAILURE_COMPANION_CREATED",
  DERIVED_PROJECTION: "DERIVED_PROJECTION_PUBLISHED",
  OPERATIONAL_LOG: "OPERATIONAL_LOG_EMITTED",
  ANALYTICS_PROJECTION: "ANALYTICS_PROJECTION_PUBLISHED",
  POLICY_GOVERNED_OTHER: "POLICY_GOVERNED_OBJECT_ANCHORED",
} as const;

export type RetentionObjectClass = keyof typeof RETENTION_ANCHOR_EVENT_BY_OBJECT_CLASS;

export type RetentionPolicySource = {
  policy_ref: string;
  retention_class: RetentionClass;
  minimum_retention_days: number;
  policy_retention_days: number;
  pseudonymisation_mode: string;
  limitation_behavior?: RetentionLimitationBehavior;
  limitation_reason_codes?: readonly string[];
  proof_preservation_basis_ref?: string | null;
  authority_ambiguity_ref?: string | null;
};

export type RetentionLegalHoldInput = {
  state: RetentionLegalHoldState;
  hold_ref: string | null;
  changed_at: string | null;
};

export type DeriveRetentionTagInput = {
  artifact_ref: string;
  anchor_timestamp: string;
  erasure_decided_at: string;
  object_class: RetentionObjectClass;
  policy: RetentionPolicySource;
  authority_ambiguity_ref?: string | null;
  effective_expiry_at?: string;
  legal_hold?: RetentionLegalHoldInput;
  limitation_behavior?: RetentionLimitationBehavior;
  limitation_reason_codes?: readonly string[];
  minimum_expiry_at?: string;
  policy_expiry_at?: string;
  proof_preservation_basis_ref?: string | null;
  retention_basis_ref?: string;
  retention_tag_id?: string;
};

const RETENTION_REASON_BY_ELIGIBILITY = {
  ELIGIBLE: "RETENTION_WINDOW_SATISFIED",
  BLOCKED_LEGAL_HOLD: "LEGAL_HOLD_ACTIVE",
  BLOCKED_STATUTORY_MINIMUM: "STATUTORY_RETENTION_ACTIVE",
  BLOCKED_PROOF_PRESERVATION: "PROOF_PRESERVATION_REQUIRED",
  BLOCKED_AUTHORITY_AMBIGUITY: "AUTHORITY_AMBIGUITY_UNRESOLVED",
} as const satisfies Record<RetentionErasureEligibility, string>;

function assertNonNegativeInteger(label: string, value: unknown) {
  assertRetention(
    Number.isInteger(value) && Number(value) >= 0,
    "RETENTION_FIELD_INVALID",
    `${label} must be a non-negative integer`,
  );
  return Number(value);
}

function formatInstant(date: Date) {
  const iso = date.toISOString();
  return iso.endsWith(".000Z") ? iso.replace(".000Z", "Z") : iso;
}

export function addRetentionDays(anchorTimestamp: string, days: number) {
  const normalizedAnchor = normalizeUtcInstantString(anchorTimestamp);
  const normalizedDays = assertNonNegativeInteger("retention_days", days);
  const date = new Date(normalizedAnchor);
  date.setUTCDate(date.getUTCDate() + normalizedDays);
  return formatInstant(date);
}

function maxInstant(left: string, right: string) {
  return Date.parse(left) >= Date.parse(right) ? left : right;
}

function normalizeLegalHold(input: RetentionLegalHoldInput | undefined): RetentionLegalHoldInput {
  if (input === undefined) {
    return {
      state: "NONE",
      hold_ref: null,
      changed_at: null,
    };
  }
  return {
    state: input.state,
    hold_ref: normalizeNullableRetentionString("legal_hold.hold_ref", input.hold_ref),
    changed_at: input.changed_at === null ? null : normalizeUtcInstantString(input.changed_at),
  };
}

function resolveErasureEligibility(input: {
  effective_expiry_at: string;
  erasure_decided_at: string;
  legal_hold: RetentionLegalHoldInput;
  proof_preservation_basis_ref: string | null;
  authority_ambiguity_ref: string | null;
}): RetentionErasureEligibility {
  assertRetention(
    !(input.proof_preservation_basis_ref && input.authority_ambiguity_ref),
    "RETENTION_BLOCKING_BASIS_INVALID",
    "proof-preservation and authority-ambiguity blockers are mutually exclusive on RetentionTag",
  );

  if (input.legal_hold.state === "ACTIVE" || input.legal_hold.state === "RELEASE_ELIGIBLE") {
    assertRetention(
      input.proof_preservation_basis_ref === null && input.authority_ambiguity_ref === null,
      "RETENTION_BLOCKING_BASIS_INVALID",
      "legal-hold blocking cannot silently discard proof or authority blocker refs",
    );
    return "BLOCKED_LEGAL_HOLD";
  }
  if (input.authority_ambiguity_ref !== null) {
    return "BLOCKED_AUTHORITY_AMBIGUITY";
  }
  if (input.proof_preservation_basis_ref !== null) {
    return "BLOCKED_PROOF_PRESERVATION";
  }
  if (Date.parse(input.erasure_decided_at) < Date.parse(input.effective_expiry_at)) {
    return "BLOCKED_STATUTORY_MINIMUM";
  }
  return "ELIGIBLE";
}

export function anchorEventForRetentionObjectClass(objectClass: RetentionObjectClass) {
  return RETENTION_ANCHOR_EVENT_BY_OBJECT_CLASS[objectClass];
}

export function deriveRetentionTag(input: DeriveRetentionTagInput): RetentionTagRecord {
  const artifactRef = assertNonEmptyRetentionString("artifact_ref", input.artifact_ref);
  const anchorEvent = anchorEventForRetentionObjectClass(input.object_class);
  const anchorTimestamp = normalizeUtcInstantString(input.anchor_timestamp);
  const erasureDecidedAt = normalizeUtcInstantString(input.erasure_decided_at);
  const retentionClass = normalizeRetentionClass(input.policy.retention_class);
  const retentionBasisRef = assertNonEmptyRetentionString(
    "retention_basis_ref",
    input.retention_basis_ref ?? input.policy.policy_ref,
  );

  const minimumExpiryAt =
    input.minimum_expiry_at ??
    addRetentionDays(anchorTimestamp, input.policy.minimum_retention_days);
  const policyExpiryAt =
    input.policy_expiry_at ?? addRetentionDays(anchorTimestamp, input.policy.policy_retention_days);
  const effectiveExpiryAt =
    input.effective_expiry_at ?? maxInstant(minimumExpiryAt, policyExpiryAt);

  const legalHold = normalizeLegalHold(input.legal_hold);
  const proofPreservationBasisRef = normalizeNullableRetentionString(
    "proof_preservation_basis_ref",
    input.proof_preservation_basis_ref ?? input.policy.proof_preservation_basis_ref ?? null,
  );
  const authorityAmbiguityRef = normalizeNullableRetentionString(
    "authority_ambiguity_ref",
    input.authority_ambiguity_ref ?? input.policy.authority_ambiguity_ref ?? null,
  );
  const erasureEligibility = resolveErasureEligibility({
    effective_expiry_at: normalizeUtcInstantString(effectiveExpiryAt),
    erasure_decided_at: erasureDecidedAt,
    legal_hold: legalHold,
    proof_preservation_basis_ref: proofPreservationBasisRef,
    authority_ambiguity_ref: authorityAmbiguityRef,
  });
  const limitationBehavior = normalizeRetentionLimitationBehavior(
    input.limitation_behavior ?? input.policy.limitation_behavior ?? "NONE",
  );

  return normalizeRetentionTag({
    artifact_type: "RetentionTag",
    retention_tag_id:
      input.retention_tag_id ??
      deriveRetentionTagId({
        anchor_event: anchorEvent,
        anchor_timestamp: anchorTimestamp,
        artifact_ref: artifactRef,
        retention_basis_ref: retentionBasisRef,
        retention_class: retentionClass,
      }),
    retention_class: retentionClass,
    anchor_event: anchorEvent,
    anchor_timestamp: anchorTimestamp,
    minimum_expiry_at: minimumExpiryAt,
    policy_expiry_at: policyExpiryAt,
    effective_expiry_at: effectiveExpiryAt,
    legal_hold_state: legalHold.state,
    legal_hold_ref: legalHold.hold_ref,
    legal_hold_changed_at: legalHold.changed_at,
    erasure_eligibility: erasureEligibility,
    erasure_decided_at: erasureDecidedAt,
    erasure_reason_codes: [RETENTION_REASON_BY_ELIGIBILITY[erasureEligibility]],
    pseudonymisation_mode: assertNonEmptyRetentionString(
      "policy.pseudonymisation_mode",
      input.policy.pseudonymisation_mode,
    ),
    limitation_behavior: limitationBehavior,
    limitation_reason_codes: [
      ...(input.limitation_reason_codes ?? input.policy.limitation_reason_codes ?? []),
    ],
    retention_basis_ref: retentionBasisRef,
    proof_preservation_basis_ref: proofPreservationBasisRef,
    authority_ambiguity_ref: authorityAmbiguityRef,
  });
}

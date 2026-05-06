import {
  AuthorityModelError,
  assertEnum,
  cloneRecord,
  hashObject,
  normalizeAuthorityIngressProofContract,
  normalizeNullableString,
  normalizeSortedStringSet,
  normalizeTimestamp,
  refFromId,
  requireString,
} from "./authority_common.ts";
import {
  type AuthorityIngressAuthenticatedChannelState,
  AUTHORITY_INGRESS_CHANNEL_CLASSES,
  AUTHORITY_INGRESS_CORRELATION_STATUSES,
  type AuthorityIngressChannelClass,
  normalizeAuthorityIngressCorrelationContract,
  type AuthorityIngressCorrelationContract,
  type AuthorityIngressCorrelationStatus,
  type AuthorityIngressReceipt,
  authorityIngressReceiptRef,
} from "./authority_ingress_receipt.ts";
import type { AuthorityIngressProofContract } from "./authority_common.ts";

export const AUTHORITY_INGRESS_SAFE_NEXT_ACTION_CODES = [
  "COMPARE_CANDIDATE_LINEAGES",
  "ESCALATE_PROVIDER_PAYLOAD",
  "OPEN_RECONCILIATION_WORKFLOW",
  "REVIEW_AUTHENTICATION_EVIDENCE",
  "REVIEW_CANONICAL_RECEIPT",
  "WAIT_FOR_SEPARATE_BINDING_DECISION",
] as const;

export type AuthorityIngressSafeNextActionCode = (typeof AUTHORITY_INGRESS_SAFE_NEXT_ACTION_CODES)[number];
export type AuthorityIngressInvestigationReceiptState = "QUARANTINED" | "DUPLICATE_SUPPRESSED";

export type AuthorityIngressInvestigationDeliveryLineage = {
  canonical_ingress_receipt_ref_or_self: string;
  delivery_novelty_state: "CANONICAL_FIRST_SEEN" | "DUPLICATE_SUPPRESSED";
  related_duplicate_receipt_refs: string[];
};

export type AuthorityIngressQuarantineExplainability = {
  blocked_mutation_reason_codes: string[];
  comparison_candidate_refs: string[];
  current_owner_ref_or_null: string | null;
  reason_codes: string[];
  resolution_state:
    | "ESCALATED"
    | "OPEN_DUPLICATE_REVIEW"
    | "OPEN_QUARANTINE"
    | "READY_FOR_CANONICAL_DUPLICATE_CLOSE"
    | "READY_FOR_SEPARATE_RECONCILIATION";
  supporting_audit_event_refs: string[];
};

export type AuthorityIngressInvestigationSnapshot = {
  artifact_type: "AuthorityIngressInvestigationSnapshot";
  authenticated_channel_state: AuthorityIngressAuthenticatedChannelState;
  authority_ingress_correlation_contract: AuthorityIngressCorrelationContract;
  authority_ingress_proof_contract: AuthorityIngressProofContract;
  authority_reference_or_null: string | null;
  bound_interaction_ref_or_null: string | null;
  correlation_status: AuthorityIngressCorrelationStatus;
  delivery_dedupe_key: string;
  delivery_lineage: AuthorityIngressInvestigationDeliveryLineage;
  ingress_channel_class: AuthorityIngressChannelClass;
  ingress_receipt_ref: string;
  investigation_id: string;
  investigation_source_policy: "PERSISTED_RECEIPT_PAYLOAD_AUDIT_AND_LINEAGE_ONLY";
  legal_mutation_policy: "NO_DIRECT_LEGAL_STATE_MUTATION_FROM_INVESTIGATION";
  normalized_response_ref_or_null: string | null;
  provider_environment: string;
  provider_profile_ref: string;
  quarantine_explainability: AuthorityIngressQuarantineExplainability;
  receipt_state: AuthorityIngressInvestigationReceiptState;
  response_body_hash: string;
  response_body_ref: string | null;
  safe_next_action_codes: AuthorityIngressSafeNextActionCode[];
  updated_at: string;
};

export type AuthorityIngressInvestigationSnapshotBuildInput = Partial<
  Omit<
    AuthorityIngressInvestigationSnapshot,
    | "artifact_type"
    | "authority_ingress_correlation_contract"
    | "authority_ingress_proof_contract"
    | "delivery_lineage"
    | "investigation_source_policy"
    | "legal_mutation_policy"
    | "quarantine_explainability"
    | "safe_next_action_codes"
  >
> & {
  authority_ingress_correlation_contract: AuthorityIngressCorrelationContract;
  authority_ingress_proof_contract: AuthorityIngressProofContract;
  delivery_lineage: AuthorityIngressInvestigationDeliveryLineage;
  quarantine_explainability: AuthorityIngressQuarantineExplainability;
  safe_next_action_codes: readonly AuthorityIngressSafeNextActionCode[];
};

function normalizeDeliveryLineage(
  input: AuthorityIngressInvestigationDeliveryLineage,
): AuthorityIngressInvestigationDeliveryLineage {
  return {
    canonical_ingress_receipt_ref_or_self: requireString(
      "delivery_lineage.canonical_ingress_receipt_ref_or_self",
      input.canonical_ingress_receipt_ref_or_self,
    ),
    delivery_novelty_state: assertEnum("delivery_lineage.delivery_novelty_state", input.delivery_novelty_state, [
      "CANONICAL_FIRST_SEEN",
      "DUPLICATE_SUPPRESSED",
    ] as const),
    related_duplicate_receipt_refs: normalizeSortedStringSet(
      "delivery_lineage.related_duplicate_receipt_refs",
      input.related_duplicate_receipt_refs,
    ),
  };
}

function normalizeQuarantineExplainability(
  input: AuthorityIngressQuarantineExplainability,
): AuthorityIngressQuarantineExplainability {
  return {
    blocked_mutation_reason_codes: normalizeSortedStringSet(
      "quarantine_explainability.blocked_mutation_reason_codes",
      input.blocked_mutation_reason_codes,
      { minItems: 1 },
    ),
    comparison_candidate_refs: normalizeSortedStringSet(
      "quarantine_explainability.comparison_candidate_refs",
      input.comparison_candidate_refs,
    ),
    current_owner_ref_or_null: normalizeNullableString(
      "quarantine_explainability.current_owner_ref_or_null",
      input.current_owner_ref_or_null,
    ),
    reason_codes: normalizeSortedStringSet("quarantine_explainability.reason_codes", input.reason_codes),
    resolution_state: assertEnum("quarantine_explainability.resolution_state", input.resolution_state, [
      "ESCALATED",
      "OPEN_DUPLICATE_REVIEW",
      "OPEN_QUARANTINE",
      "READY_FOR_CANONICAL_DUPLICATE_CLOSE",
      "READY_FOR_SEPARATE_RECONCILIATION",
    ] as const),
    supporting_audit_event_refs: normalizeSortedStringSet(
      "quarantine_explainability.supporting_audit_event_refs",
      input.supporting_audit_event_refs,
      { minItems: 1 },
    ),
  };
}

function assertSnapshotRules(snapshot: AuthorityIngressInvestigationSnapshot) {
  const requiredBlockReason = "DIRECT_LEGAL_STATE_MUTATION_FORBIDDEN";
  if (!snapshot.quarantine_explainability.blocked_mutation_reason_codes.includes(requiredBlockReason)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "AuthorityIngressInvestigationSnapshot must expose direct legal-state mutation as blocked",
    );
  }
  if (snapshot.delivery_lineage.related_duplicate_receipt_refs.includes(snapshot.ingress_receipt_ref)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "AuthorityIngressInvestigationSnapshot duplicate lineage must not repeat the investigated receipt",
    );
  }
  if (snapshot.receipt_state === "QUARANTINED") {
    if (
      snapshot.delivery_lineage.delivery_novelty_state !== "CANONICAL_FIRST_SEEN" ||
      snapshot.quarantine_explainability.reason_codes.length === 0 ||
      snapshot.quarantine_explainability.current_owner_ref_or_null === null ||
      snapshot.normalized_response_ref_or_null !== null
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "QUARANTINED investigation snapshots require canonical delivery lineage, owner, reason codes, and no normalized response ref",
      );
    }
  }
  if (snapshot.receipt_state === "DUPLICATE_SUPPRESSED") {
    if (
      snapshot.authenticated_channel_state !== "AUTHENTICATED" ||
      snapshot.delivery_lineage.delivery_novelty_state !== "DUPLICATE_SUPPRESSED" ||
      snapshot.quarantine_explainability.reason_codes.length > 0 ||
      snapshot.normalized_response_ref_or_null !== null ||
      !snapshot.safe_next_action_codes.includes("REVIEW_CANONICAL_RECEIPT")
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "DUPLICATE_SUPPRESSED investigation snapshots require duplicate lineage, canonical review, and no direct mutation refs",
      );
    }
  }
  if (
    ["BOUND_WITH_AUTHORITY_REFERENCE_ONLY", "AMBIGUOUS"].includes(snapshot.correlation_status) &&
    !snapshot.safe_next_action_codes.includes("OPEN_RECONCILIATION_WORKFLOW")
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "weak or ambiguous ingress investigations must expose reconciliation workflow as a safe next action",
    );
  }
  if (
    snapshot.authenticated_channel_state === "FAILED" &&
    !snapshot.safe_next_action_codes.includes("REVIEW_AUTHENTICATION_EVIDENCE")
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "failed ingress authentication investigations must expose authentication evidence review",
    );
  }
}

export function normalizeAuthorityIngressInvestigationSnapshot(
  input: AuthorityIngressInvestigationSnapshot,
): AuthorityIngressInvestigationSnapshot {
  const snapshot: AuthorityIngressInvestigationSnapshot = {
    artifact_type: "AuthorityIngressInvestigationSnapshot",
    authenticated_channel_state: assertEnum("authenticated_channel_state", input.authenticated_channel_state, [
      "AUTHENTICATED",
      "FAILED",
    ] as const),
    authority_ingress_correlation_contract: normalizeAuthorityIngressCorrelationContract(
      input.authority_ingress_correlation_contract,
    ),
    authority_ingress_proof_contract: normalizeAuthorityIngressProofContract(input.authority_ingress_proof_contract),
    authority_reference_or_null: normalizeNullableString("authority_reference_or_null", input.authority_reference_or_null),
    bound_interaction_ref_or_null: normalizeNullableString(
      "bound_interaction_ref_or_null",
      input.bound_interaction_ref_or_null,
    ),
    correlation_status: assertEnum("correlation_status", input.correlation_status, AUTHORITY_INGRESS_CORRELATION_STATUSES),
    delivery_dedupe_key: requireString("delivery_dedupe_key", input.delivery_dedupe_key),
    delivery_lineage: normalizeDeliveryLineage(input.delivery_lineage),
    ingress_channel_class: assertEnum("ingress_channel_class", input.ingress_channel_class, AUTHORITY_INGRESS_CHANNEL_CLASSES),
    ingress_receipt_ref: requireString("ingress_receipt_ref", input.ingress_receipt_ref),
    investigation_id: requireString("investigation_id", input.investigation_id),
    investigation_source_policy: "PERSISTED_RECEIPT_PAYLOAD_AUDIT_AND_LINEAGE_ONLY",
    legal_mutation_policy: "NO_DIRECT_LEGAL_STATE_MUTATION_FROM_INVESTIGATION",
    normalized_response_ref_or_null: normalizeNullableString(
      "normalized_response_ref_or_null",
      input.normalized_response_ref_or_null,
    ),
    provider_environment: requireString("provider_environment", input.provider_environment),
    provider_profile_ref: requireString("provider_profile_ref", input.provider_profile_ref),
    quarantine_explainability: normalizeQuarantineExplainability(input.quarantine_explainability),
    receipt_state: assertEnum("receipt_state", input.receipt_state, [
      "QUARANTINED",
      "DUPLICATE_SUPPRESSED",
    ] as const),
    response_body_hash: requireString("response_body_hash", input.response_body_hash),
    response_body_ref: normalizeNullableString("response_body_ref", input.response_body_ref),
    safe_next_action_codes: normalizeSortedStringSet(
      "safe_next_action_codes",
      input.safe_next_action_codes,
      { minItems: 1 },
    ) as AuthorityIngressSafeNextActionCode[],
    updated_at: normalizeTimestamp("updated_at", input.updated_at),
  };
  assertSnapshotRules(snapshot);
  return snapshot;
}

export function buildAuthorityIngressInvestigationSnapshot(
  input: AuthorityIngressInvestigationSnapshotBuildInput,
): AuthorityIngressInvestigationSnapshot {
  return normalizeAuthorityIngressInvestigationSnapshot({
    artifact_type: "AuthorityIngressInvestigationSnapshot",
    authenticated_channel_state: input.authenticated_channel_state ?? "AUTHENTICATED",
    authority_ingress_correlation_contract: input.authority_ingress_correlation_contract,
    authority_ingress_proof_contract: input.authority_ingress_proof_contract,
    authority_reference_or_null: input.authority_reference_or_null ?? null,
    bound_interaction_ref_or_null: input.bound_interaction_ref_or_null ?? null,
    correlation_status: input.correlation_status ?? input.authority_ingress_correlation_contract.correlation_status,
    delivery_dedupe_key: requireString("delivery_dedupe_key", input.delivery_dedupe_key),
    delivery_lineage: input.delivery_lineage,
    ingress_channel_class: requireString("ingress_channel_class", input.ingress_channel_class) as AuthorityIngressChannelClass,
    ingress_receipt_ref: requireString("ingress_receipt_ref", input.ingress_receipt_ref),
    investigation_id: requireString("investigation_id", input.investigation_id),
    investigation_source_policy: "PERSISTED_RECEIPT_PAYLOAD_AUDIT_AND_LINEAGE_ONLY",
    legal_mutation_policy: "NO_DIRECT_LEGAL_STATE_MUTATION_FROM_INVESTIGATION",
    normalized_response_ref_or_null: input.normalized_response_ref_or_null ?? null,
    provider_environment: requireString("provider_environment", input.provider_environment),
    provider_profile_ref: requireString("provider_profile_ref", input.provider_profile_ref),
    quarantine_explainability: input.quarantine_explainability,
    receipt_state: assertEnum("receipt_state", input.receipt_state, [
      "QUARANTINED",
      "DUPLICATE_SUPPRESSED",
    ] as const),
    response_body_hash: requireString("response_body_hash", input.response_body_hash),
    response_body_ref: input.response_body_ref ?? null,
    safe_next_action_codes: [...input.safe_next_action_codes],
    updated_at: normalizeTimestamp("updated_at", input.updated_at ?? new Date(0).toISOString()),
  });
}

export function buildAuthorityIngressInvestigationSnapshotFromReceipt(input: {
  receipt: AuthorityIngressReceipt;
  related_duplicate_receipt_refs?: readonly string[];
  updated_at?: string;
}) {
  const receipt = input.receipt;
  if (!["QUARANTINED", "DUPLICATE_SUPPRESSED"].includes(receipt.receipt_state)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "AuthorityIngressInvestigationSnapshot can only project quarantined or duplicate-suppressed receipts",
    );
  }
  const receiptRef = receipt.ingress_receipt_id;
  const receiptUriRef = authorityIngressReceiptRef(receipt);
  const candidateRefs = receipt.authority_ingress_correlation_contract.candidate_lineages.map(
    (candidate) => candidate.interaction_ref,
  );
  const duplicate = receipt.receipt_state === "DUPLICATE_SUPPRESSED";
  const relatedDuplicateReceiptRefs = (input.related_duplicate_receipt_refs ?? []).filter(
    (ref) => ref !== receiptRef && ref !== receiptUriRef,
  );
  const safeNextActionCodes: AuthorityIngressSafeNextActionCode[] = duplicate
    ? ["REVIEW_CANONICAL_RECEIPT", "WAIT_FOR_SEPARATE_BINDING_DECISION"]
    : receipt.authenticated_channel_state === "FAILED"
      ? ["REVIEW_AUTHENTICATION_EVIDENCE", "ESCALATE_PROVIDER_PAYLOAD", "OPEN_RECONCILIATION_WORKFLOW"]
      : receipt.correlation_status === "AMBIGUOUS"
        ? ["COMPARE_CANDIDATE_LINEAGES", "OPEN_RECONCILIATION_WORKFLOW"]
        : ["OPEN_RECONCILIATION_WORKFLOW", "WAIT_FOR_SEPARATE_BINDING_DECISION"];

  return buildAuthorityIngressInvestigationSnapshot({
    authenticated_channel_state: receipt.authenticated_channel_state,
    authority_ingress_correlation_contract: receipt.authority_ingress_correlation_contract,
    authority_ingress_proof_contract: receipt.authority_ingress_proof_contract,
    authority_reference_or_null: receipt.authority_reference,
    bound_interaction_ref_or_null: receipt.bound_interaction_ref,
    correlation_status: receipt.correlation_status,
    delivery_dedupe_key: receipt.delivery_dedupe_key,
    delivery_lineage: {
      canonical_ingress_receipt_ref_or_self: receipt.canonical_ingress_receipt_ref ?? receiptRef,
      delivery_novelty_state: duplicate ? "DUPLICATE_SUPPRESSED" : "CANONICAL_FIRST_SEEN",
      related_duplicate_receipt_refs: relatedDuplicateReceiptRefs,
    },
    ingress_channel_class: receipt.ingress_channel_class,
    ingress_receipt_ref: receiptRef,
    investigation_id: `authority-ingress-investigation:${receipt.ingress_receipt_id}`,
    normalized_response_ref_or_null: receipt.normalized_response_ref,
    provider_environment: receipt.provider_environment,
    provider_profile_ref: receipt.provider_profile_ref,
    quarantine_explainability: {
      blocked_mutation_reason_codes: duplicate
        ? ["DIRECT_LEGAL_STATE_MUTATION_FORBIDDEN", "DUPLICATE_SUPPRESSED_NO_SECOND_MUTATION"]
        : ["DIRECT_LEGAL_STATE_MUTATION_FORBIDDEN", "INGRESS_NOT_AUTHENTICATED_BOUND_AND_NORMALIZED_FOR_MUTATION"],
      comparison_candidate_refs: candidateRefs,
      current_owner_ref_or_null: receipt.reconciliation_owner_ref,
      reason_codes: duplicate ? [] : receipt.quarantine_reason_codes,
      resolution_state: duplicate ? "OPEN_DUPLICATE_REVIEW" : "OPEN_QUARANTINE",
      supporting_audit_event_refs: receipt.audit_event_refs,
    },
    receipt_state: receipt.receipt_state as AuthorityIngressInvestigationReceiptState,
    response_body_hash: receipt.response_body_hash,
    response_body_ref: receipt.response_body_ref,
    safe_next_action_codes: safeNextActionCodes,
    updated_at: input.updated_at ?? receipt.persisted_at,
  });
}

export function authorityIngressInvestigationSnapshotRef(
  snapshot: Pick<AuthorityIngressInvestigationSnapshot, "investigation_id"> | string,
) {
  return refFromId(
    "authority-ingress-investigation",
    typeof snapshot === "string" ? snapshot : snapshot.investigation_id,
  );
}

export function cloneAuthorityIngressInvestigationSnapshot(snapshot: AuthorityIngressInvestigationSnapshot) {
  return cloneRecord(snapshot);
}

export function authorityIngressInvestigationSnapshotContentFingerprint(
  snapshot: AuthorityIngressInvestigationSnapshot,
) {
  return hashObject(
    "AUTHORITY_INGRESS_INVESTIGATION_SNAPSHOT_MODEL_V1",
    normalizeAuthorityIngressInvestigationSnapshot(snapshot),
  );
}

import {
  type AuthorityIngressProofContract,
  type AuthorityReconciliationControlContract,
  type AuthorityTruthContract,
  type AuthorityTruthState,
  AuthorityModelError,
  buildAuthorityReconciliationControlContract,
  buildObligationMirrorAuthorityTruthContract,
  cloneRecord,
  normalizeAuthorityIngressProofContract,
  normalizeAuthorityReconciliationControlContract,
  normalizeNullableString,
  normalizeNullableTimestamp,
  normalizeObligationMirrorAuthorityTruthContract,
  normalizeSortedStringSet,
  normalizeTimestamp,
  refFromId,
  requireEmpty,
  requireNonNull,
  requireNull,
  requireString,
} from "./authority_common.ts";

export const OBLIGATION_MIRROR_LIFECYCLE_STATES = [
  "NOT_YET_OPEN",
  "OPEN",
  "DUE_SOON",
  "READY_TO_FILE",
  "SUBMITTED_PENDING",
  "MET_CONFIRMED",
  "LATE_UNMET",
  "NO_LONGER_RELEVANT",
] as const;

export type ObligationMirrorLifecycleState = (typeof OBLIGATION_MIRROR_LIFECYCLE_STATES)[number];

export type ObligationMirrorRecord = {
  artifact_type: "ObligationMirror";
  authority_ingress_proof_contract: AuthorityIngressProofContract | null;
  authority_refs: string[];
  authority_status_ref: string | null;
  authority_truth_contract: AuthorityTruthContract;
  authority_truth_state: AuthorityTruthState;
  blocked_reason_codes: string[];
  client_id: string;
  current_submission_ref: string | null;
  due_at: string | null;
  income_source_partition: string;
  last_authority_sync_at: string | null;
  last_confirmed_submission_ref: string | null;
  lifecycle_state: ObligationMirrorLifecycleState;
  obligation_mirror_id: string;
  period: string;
  ready_manifest_ref: string | null;
  reconciliation_control_contract_or_null: AuthorityReconciliationControlContract | null;
  tenant_id: string;
};

export type ObligationMirrorBuildInput = Partial<
  Omit<
    ObligationMirrorRecord,
    | "artifact_type"
    | "authority_refs"
    | "blocked_reason_codes"
    | "authority_truth_contract"
    | "authority_ingress_proof_contract"
    | "reconciliation_control_contract_or_null"
  >
> & {
  authority_ingress_proof_contract?: AuthorityIngressProofContract | null;
  authority_refs: readonly string[];
  authority_truth_contract?: AuthorityTruthContract;
  blocked_reason_codes?: readonly string[];
  client_id: string;
  income_source_partition: string;
  obligation_mirror_id?: string;
  period: string;
  reconciliation_control_contract_or_null?: AuthorityReconciliationControlContract | null;
  tenant_id: string;
};

export function obligationMirrorRef(mirror: Pick<ObligationMirrorRecord, "obligation_mirror_id"> | string) {
  return refFromId(
    "obligation-mirror",
    typeof mirror === "string" ? mirror : mirror.obligation_mirror_id,
  );
}

function defaultMirrorId(input: {
  client_id: string;
  income_source_partition: string;
  period: string;
  tenant_id: string;
}) {
  return [
    "obligation-mirror",
    requireString("tenant_id", input.tenant_id),
    requireString("client_id", input.client_id),
    requireString("income_source_partition", input.income_source_partition),
    requireString("period", input.period),
  ].join(".");
}

function normalizeControl(
  value: AuthorityReconciliationControlContract | null | undefined,
  record: Pick<ObligationMirrorRecord, "authority_truth_state" | "current_submission_ref" | "last_authority_sync_at">,
) {
  if (value) {
    return normalizeAuthorityReconciliationControlContract(value);
  }
  if (["PENDING_ACK", "UNKNOWN", "OUT_OF_BAND"].includes(record.authority_truth_state)) {
    return buildAuthorityReconciliationControlContract({
      authority_truth_state: record.authority_truth_state,
      last_budget_event_at: record.last_authority_sync_at ?? new Date(0).toISOString(),
      submission_lifecycle_state_or_null: record.current_submission_ref ? "PENDING_ACK" : null,
    });
  }
  if (record.authority_truth_state === "CONFIRMED") {
    return buildAuthorityReconciliationControlContract({
      authority_truth_state: "CONFIRMED",
      last_budget_event_at: record.last_authority_sync_at ?? new Date(0).toISOString(),
      submission_lifecycle_state_or_null: "CONFIRMED",
    });
  }
  return null;
}

export function buildObligationMirrorRecord(input: ObligationMirrorBuildInput): ObligationMirrorRecord {
  const lastAuthoritySyncAt = normalizeNullableTimestamp(
    "last_authority_sync_at",
    input.last_authority_sync_at,
  );
  const lifecycleState = input.lifecycle_state ?? "OPEN";
  const authorityTruthState = input.authority_truth_state ?? (lifecycleState === "READY_TO_FILE" ? "NOT_REQUESTED" : "UNKNOWN");
  const partial: ObligationMirrorRecord = {
    artifact_type: "ObligationMirror",
    authority_ingress_proof_contract: input.authority_ingress_proof_contract ?? null,
    authority_refs: normalizeSortedStringSet("authority_refs", input.authority_refs, { minItems: 1 }),
    authority_status_ref: normalizeNullableString("authority_status_ref", input.authority_status_ref),
    authority_truth_contract: input.authority_truth_contract ?? buildObligationMirrorAuthorityTruthContract(),
    authority_truth_state: authorityTruthState,
    blocked_reason_codes: normalizeSortedStringSet("blocked_reason_codes", input.blocked_reason_codes),
    client_id: requireString("client_id", input.client_id),
    current_submission_ref: normalizeNullableString("current_submission_ref", input.current_submission_ref),
    due_at: normalizeNullableTimestamp("due_at", input.due_at),
    income_source_partition: requireString("income_source_partition", input.income_source_partition),
    last_authority_sync_at: lastAuthoritySyncAt,
    last_confirmed_submission_ref: normalizeNullableString(
      "last_confirmed_submission_ref",
      input.last_confirmed_submission_ref,
    ),
    lifecycle_state: lifecycleState,
    obligation_mirror_id: input.obligation_mirror_id ?? defaultMirrorId(input),
    period: requireString("period", input.period),
    ready_manifest_ref: normalizeNullableString("ready_manifest_ref", input.ready_manifest_ref),
    reconciliation_control_contract_or_null: null,
    tenant_id: requireString("tenant_id", input.tenant_id),
  };
  partial.reconciliation_control_contract_or_null = normalizeControl(
    input.reconciliation_control_contract_or_null,
    partial,
  );
  return normalizeObligationMirrorRecord(partial);
}

export function normalizeObligationMirrorRecord(input: ObligationMirrorRecord): ObligationMirrorRecord {
  const record: ObligationMirrorRecord = {
    ...input,
    artifact_type: "ObligationMirror",
    authority_ingress_proof_contract: input.authority_ingress_proof_contract
      ? normalizeAuthorityIngressProofContract(input.authority_ingress_proof_contract)
      : null,
    authority_refs: normalizeSortedStringSet("authority_refs", input.authority_refs, { minItems: 1 }),
    authority_status_ref: normalizeNullableString("authority_status_ref", input.authority_status_ref),
    authority_truth_contract: normalizeObligationMirrorAuthorityTruthContract(input.authority_truth_contract),
    blocked_reason_codes: normalizeSortedStringSet("blocked_reason_codes", input.blocked_reason_codes),
    client_id: requireString("client_id", input.client_id),
    current_submission_ref: normalizeNullableString("current_submission_ref", input.current_submission_ref),
    due_at: normalizeNullableTimestamp("due_at", input.due_at),
    income_source_partition: requireString("income_source_partition", input.income_source_partition),
    last_authority_sync_at: normalizeNullableTimestamp("last_authority_sync_at", input.last_authority_sync_at),
    last_confirmed_submission_ref: normalizeNullableString(
      "last_confirmed_submission_ref",
      input.last_confirmed_submission_ref,
    ),
    obligation_mirror_id: requireString("obligation_mirror_id", input.obligation_mirror_id),
    period: requireString("period", input.period),
    ready_manifest_ref: normalizeNullableString("ready_manifest_ref", input.ready_manifest_ref),
    reconciliation_control_contract_or_null: input.reconciliation_control_contract_or_null
      ? normalizeAuthorityReconciliationControlContract(input.reconciliation_control_contract_or_null)
      : null,
    tenant_id: requireString("tenant_id", input.tenant_id),
  };

  if (
    [
      "OPEN",
      "DUE_SOON",
      "READY_TO_FILE",
      "SUBMITTED_PENDING",
      "MET_CONFIRMED",
      "LATE_UNMET",
    ].includes(record.lifecycle_state)
  ) {
    requireNonNull("due_at", record.due_at);
    record.due_at = normalizeTimestamp("due_at", record.due_at);
  }

  if (record.current_submission_ref !== null) {
    if (record.lifecycle_state !== "SUBMITTED_PENDING" || record.authority_truth_state !== "PENDING_ACK") {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "current_submission_ref is legal only for SUBMITTED_PENDING mirrors with PENDING_ACK authority truth",
      );
    }
    requireNonNull(
      "reconciliation_control_contract_or_null",
      record.reconciliation_control_contract_or_null,
    );
  }
  if (record.last_confirmed_submission_ref !== null) {
    if (record.lifecycle_state !== "MET_CONFIRMED" || record.authority_truth_state !== "CONFIRMED") {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "last_confirmed_submission_ref is legal only for MET_CONFIRMED mirrors with CONFIRMED authority truth",
      );
    }
  }
  if (record.ready_manifest_ref !== null) {
    if (record.lifecycle_state !== "READY_TO_FILE" || record.authority_truth_state !== "NOT_REQUESTED") {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "ready_manifest_ref is legal only for READY_TO_FILE mirrors with NOT_REQUESTED authority truth",
      );
    }
  }
  if (
    record.current_submission_ref !== null &&
    record.current_submission_ref === record.last_confirmed_submission_ref
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "pending and confirmed submission refs must remain distinct",
    );
  }

  switch (record.lifecycle_state) {
    case "NOT_YET_OPEN":
      requireNull("current_submission_ref", record.current_submission_ref);
      requireNull("last_confirmed_submission_ref", record.last_confirmed_submission_ref);
      requireNull("ready_manifest_ref", record.ready_manifest_ref);
      requireEmpty("blocked_reason_codes", record.blocked_reason_codes);
      break;
    case "OPEN":
    case "DUE_SOON":
      requireNull("current_submission_ref", record.current_submission_ref);
      requireNull("last_confirmed_submission_ref", record.last_confirmed_submission_ref);
      requireNull("ready_manifest_ref", record.ready_manifest_ref);
      break;
    case "READY_TO_FILE":
      requireNonNull("ready_manifest_ref", record.ready_manifest_ref);
      requireNull("current_submission_ref", record.current_submission_ref);
      requireNull("last_confirmed_submission_ref", record.last_confirmed_submission_ref);
      requireEmpty("blocked_reason_codes", record.blocked_reason_codes);
      if (record.authority_truth_state !== "NOT_REQUESTED") {
        throw new AuthorityModelError(
          "AUTHORITY_CONTRACT_INVALID",
          "READY_TO_FILE mirrors must remain pre-submit with NOT_REQUESTED authority truth",
        );
      }
      break;
    case "SUBMITTED_PENDING":
      requireNonNull("current_submission_ref", record.current_submission_ref);
      requireNull("last_confirmed_submission_ref", record.last_confirmed_submission_ref);
      requireNull("ready_manifest_ref", record.ready_manifest_ref);
      requireEmpty("blocked_reason_codes", record.blocked_reason_codes);
      if (record.authority_truth_state !== "PENDING_ACK") {
        throw new AuthorityModelError(
          "AUTHORITY_CONTRACT_INVALID",
          "SUBMITTED_PENDING mirrors must retain PENDING_ACK authority truth",
        );
      }
      break;
    case "MET_CONFIRMED":
      requireNull("current_submission_ref", record.current_submission_ref);
      requireNonNull("last_confirmed_submission_ref", record.last_confirmed_submission_ref);
      requireNull("ready_manifest_ref", record.ready_manifest_ref);
      requireEmpty("blocked_reason_codes", record.blocked_reason_codes);
      requireNonNull("last_authority_sync_at", record.last_authority_sync_at);
      requireNonNull("authority_status_ref", record.authority_status_ref);
      if (record.authority_truth_state !== "CONFIRMED") {
        throw new AuthorityModelError(
          "AUTHORITY_CONTRACT_INVALID",
          "MET_CONFIRMED mirrors must be grounded in CONFIRMED authority truth",
        );
      }
      break;
    case "LATE_UNMET":
      requireNull("current_submission_ref", record.current_submission_ref);
      requireNull("last_confirmed_submission_ref", record.last_confirmed_submission_ref);
      requireNull("ready_manifest_ref", record.ready_manifest_ref);
      if (record.blocked_reason_codes.length === 0) {
        throw new AuthorityModelError(
          "AUTHORITY_CONTRACT_INVALID",
          "LATE_UNMET mirrors require blocked_reason_codes",
        );
      }
      break;
    case "NO_LONGER_RELEVANT":
      requireNull("current_submission_ref", record.current_submission_ref);
      requireNull("last_confirmed_submission_ref", record.last_confirmed_submission_ref);
      requireNull("ready_manifest_ref", record.ready_manifest_ref);
      requireEmpty("blocked_reason_codes", record.blocked_reason_codes);
      break;
  }

  if (record.authority_truth_state === "PENDING_ACK") {
    if (record.lifecycle_state !== "SUBMITTED_PENDING" || record.current_submission_ref === null) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "PENDING_ACK authority truth requires SUBMITTED_PENDING current submission lineage",
      );
    }
    requireNonNull(
      "reconciliation_control_contract_or_null",
      record.reconciliation_control_contract_or_null,
    );
  }
  if (record.authority_truth_state === "CONFIRMED") {
    if (
      record.lifecycle_state !== "MET_CONFIRMED" ||
      record.last_confirmed_submission_ref === null ||
      record.authority_status_ref === null
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "CONFIRMED authority truth requires MET_CONFIRMED legal settlement and authority status ref",
      );
    }
  }
  if (["UNKNOWN", "REJECTED", "OUT_OF_BAND"].includes(record.authority_truth_state)) {
    requireNull("current_submission_ref", record.current_submission_ref);
    requireNull("last_confirmed_submission_ref", record.last_confirmed_submission_ref);
  }
  if (["PENDING_ACK", "UNKNOWN", "OUT_OF_BAND"].includes(record.authority_truth_state)) {
    const control = requireNonNull(
      "reconciliation_control_contract_or_null",
      record.reconciliation_control_contract_or_null,
    );
    if (control.reconciliation_budget_state === "NOT_OPENED" || control.reconciliation_budget_state === "CLOSED") {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "pending, unknown, and out-of-band mirrors must keep an open reconciliation budget",
      );
    }
  }
  if (
    record.authority_truth_state === "CONFIRMED" &&
    record.reconciliation_control_contract_or_null !== null &&
    record.reconciliation_control_contract_or_null.reconciliation_budget_state !== "CLOSED"
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "confirmed mirrors may retain reconciliation control only when the budget is CLOSED",
    );
  }
  if (record.authority_status_ref !== null && record.authority_ingress_proof_contract === null) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "authority-backed status mutations must retain authority_ingress_proof_contract",
    );
  }
  if (
    record.authority_ingress_proof_contract !== null &&
    record.authority_ingress_proof_contract.binding_scope_class !== "OBLIGATION_MIRROR"
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "obligation mirror ingress proof must be scoped to OBLIGATION_MIRROR",
    );
  }
  if (
    record.authority_status_ref !== null &&
    record.authority_ingress_proof_contract?.normalized_response_ref_or_null !== record.authority_status_ref
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "authority_status_ref must match authority_ingress_proof_contract.normalized_response_ref_or_null",
    );
  }
  return record;
}

export function cloneObligationMirrorRecord(record: ObligationMirrorRecord) {
  return cloneRecord(record);
}

import {
  type ExecutionModeBoundaryContract,
  type StateTransitionContract,
  type SubmissionLifecycleState,
  AuthorityModelError,
  assertEnum,
  assertLiveComplianceBoundary,
  buildLiveExecutionModeBoundaryContract,
  buildStateTransitionContract,
  cloneRecord,
  normalizeNullableString,
  normalizeNullableTimestamp,
  normalizeSortedStringSet,
  normalizeStateTransitionContract,
  normalizeTimestamp,
  refFromId,
  requireEmpty,
  requireNonNull,
  requireNull,
  requireString,
} from "./authority_common.ts";
import type { FilingPacketLifecycleState } from "./filing_packet.ts";

export const FILING_CASE_LIFECYCLE_STATES = [
  "NOT_STARTED",
  "PREPARING",
  "READY_REVIEW",
  "READY_TO_SUBMIT",
  "SUBMITTED_PENDING",
  "FILED_CONFIRMED",
  "FILED_UNKNOWN",
  "REJECTED",
  "AMENDMENT_ELIGIBLE",
  "AMENDMENT_IN_PROGRESS",
  "AMENDED_CONFIRMED",
  "CLOSED",
] as const;

export type FilingCaseLifecycleState = (typeof FILING_CASE_LIFECYCLE_STATES)[number];
export type FilingCaseTrustCurrencyState = "CURRENT" | "RECALC_REQUIRED" | "NOT_APPLICABLE_PRETRUST";
export type ProofClosureState = "NOT_APPLICABLE" | "CLOSED" | "OPEN";

export type FilingCaseRecord = {
  amendment_case_ref: string | null;
  artifact_type: "FilingCase";
  authority_calculation_ref: string | null;
  calculation_basis_ref: string | null;
  calculation_hash: string | null;
  calculation_id: string | null;
  calculation_request_ref: string | null;
  calculation_type: string | null;
  client_id: string;
  controlling_proof_bundle_ref: string | null;
  current_manifest_ref: string | null;
  current_packet_ref: string | null;
  current_parity_ref: string | null;
  current_submission_ref: string | null;
  current_submission_state: SubmissionLifecycleState | null;
  current_trust_ref: string | null;
  execution_mode_boundary_contract: ExecutionModeBoundaryContract;
  filing_case_id: string;
  last_transition_at: string;
  lifecycle_state: FilingCaseLifecycleState;
  packet_state: FilingPacketLifecycleState | null;
  period: string;
  proof_closure_state: ProofClosureState;
  readiness_context_ref: string | null;
  state_transition_contract: StateTransitionContract;
  temporal_propagation_event_refs: string[];
  tenant_id: string;
  trust_currency_state: FilingCaseTrustCurrencyState | null;
  trust_invalidated_at: string | null;
  trust_invalidation_dependency_refs: string[];
  trust_invalidation_reason_codes: string[];
  user_confirmation_ref: string | null;
};

export type FilingCaseBuildInput = Partial<
  Omit<
    FilingCaseRecord,
    | "artifact_type"
    | "execution_mode_boundary_contract"
    | "state_transition_contract"
    | "trust_invalidation_reason_codes"
    | "trust_invalidation_dependency_refs"
    | "temporal_propagation_event_refs"
  >
> & {
  client_id: string;
  execution_mode_boundary_contract?: ExecutionModeBoundaryContract;
  last_transition_at: string;
  period: string;
  state_transition_contract?: StateTransitionContract;
  temporal_propagation_event_refs?: readonly string[];
  tenant_id: string;
  trust_invalidation_dependency_refs?: readonly string[];
  trust_invalidation_reason_codes?: readonly string[];
};

export function filingCaseRef(filingCase: Pick<FilingCaseRecord, "filing_case_id"> | string) {
  return refFromId("filing-case", typeof filingCase === "string" ? filingCase : filingCase.filing_case_id);
}

function defaultCaseId(input: Pick<FilingCaseBuildInput, "tenant_id" | "client_id" | "period">) {
  return [
    "filing-case",
    requireString("tenant_id", input.tenant_id),
    requireString("client_id", input.client_id),
    requireString("period", input.period),
  ].join(".");
}

function normalizeSubmissionState(value: SubmissionLifecycleState | null | undefined) {
  return value == null
    ? null
    : assertEnum("current_submission_state", value, [
        "INTENT_RECORDED",
        "TRANSMIT_PENDING",
        "TRANSMITTED",
        "PENDING_ACK",
        "CONFIRMED",
        "REJECTED",
        "UNKNOWN",
        "OUT_OF_BAND",
        "SUPERSEDED",
      ] as const);
}

function normalizePacketState(value: FilingPacketLifecycleState | null | undefined) {
  return value == null
    ? null
    : assertEnum("packet_state", value, [
        "DRAFT",
        "PREPARED",
        "APPROVED_TO_SUBMIT",
        "SUBMITTED",
        "VOID",
        "SUPERSEDED",
      ] as const);
}

function hasCalculationLineage(record: Pick<
  FilingCaseRecord,
  | "authority_calculation_ref"
  | "calculation_basis_ref"
  | "calculation_hash"
  | "calculation_id"
  | "calculation_request_ref"
  | "calculation_type"
  | "user_confirmation_ref"
>) {
  return [
    record.authority_calculation_ref,
    record.calculation_basis_ref,
    record.calculation_hash,
    record.calculation_id,
    record.calculation_request_ref,
    record.calculation_type,
    record.user_confirmation_ref,
  ].some((value) => value !== null);
}

function requireFullCalculationLineage(record: FilingCaseRecord) {
  if (!hasCalculationLineage(record)) {
    return;
  }
  for (const field of [
    "authority_calculation_ref",
    "calculation_basis_ref",
    "calculation_hash",
    "calculation_id",
    "calculation_request_ref",
    "calculation_type",
    "readiness_context_ref",
  ] as const) {
    requireNonNull(field, record[field]);
  }
}

function assertPacketCaseCompatibility(record: FilingCaseRecord) {
  if ((record.current_packet_ref === null) !== (record.packet_state === null)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "current_packet_ref and packet_state must be present or null together",
    );
  }
  if (record.packet_state === null) {
    return;
  }
  const allowed: Record<FilingPacketLifecycleState, FilingCaseLifecycleState[]> = {
    APPROVED_TO_SUBMIT: ["READY_TO_SUBMIT"],
    DRAFT: ["PREPARING"],
    PREPARED: ["PREPARING", "READY_REVIEW"],
    SUBMITTED: [
      "SUBMITTED_PENDING",
      "FILED_CONFIRMED",
      "FILED_UNKNOWN",
      "REJECTED",
      "AMENDMENT_ELIGIBLE",
      "AMENDMENT_IN_PROGRESS",
      "AMENDED_CONFIRMED",
      "CLOSED",
    ],
    SUPERSEDED: ["PREPARING", "READY_REVIEW"],
    VOID: ["PREPARING", "READY_REVIEW"],
  };
  if (!allowed[record.packet_state].includes(record.lifecycle_state)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      `${record.packet_state} packet state is not legal for ${record.lifecycle_state} filing case`,
    );
  }
}

function assertTrustCurrency(record: FilingCaseRecord) {
  if (record.lifecycle_state === "NOT_STARTED") {
    requireNull("trust_currency_state", record.trust_currency_state);
    requireNull("current_trust_ref", record.current_trust_ref);
    requireNull("current_parity_ref", record.current_parity_ref);
    requireNull("trust_invalidated_at", record.trust_invalidated_at);
    requireEmpty("trust_invalidation_reason_codes", record.trust_invalidation_reason_codes);
    requireEmpty("trust_invalidation_dependency_refs", record.trust_invalidation_dependency_refs);
    return;
  }
  requireNonNull("trust_currency_state", record.trust_currency_state);
  if (record.trust_currency_state === "CURRENT") {
    requireNonNull("current_trust_ref", record.current_trust_ref);
    requireNonNull("current_parity_ref", record.current_parity_ref);
    requireNull("trust_invalidated_at", record.trust_invalidated_at);
    requireEmpty("trust_invalidation_reason_codes", record.trust_invalidation_reason_codes);
    requireEmpty("trust_invalidation_dependency_refs", record.trust_invalidation_dependency_refs);
  }
  if (record.trust_currency_state === "RECALC_REQUIRED") {
    requireNonNull("current_trust_ref", record.current_trust_ref);
    requireNonNull("current_parity_ref", record.current_parity_ref);
    requireNonNull("trust_invalidated_at", record.trust_invalidated_at);
    if (
      record.trust_invalidation_reason_codes.length === 0 ||
      record.trust_invalidation_dependency_refs.length === 0
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "RECALC_REQUIRED cases must retain invalidation reason and dependency refs",
      );
    }
    for (const temporalRef of record.temporal_propagation_event_refs) {
      if (!record.trust_invalidation_dependency_refs.includes(temporalRef)) {
        throw new AuthorityModelError(
          "AUTHORITY_CONTRACT_INVALID",
          "temporal propagation refs must be included in trust invalidation dependencies",
        );
      }
    }
    if (record.lifecycle_state === "READY_TO_SUBMIT") {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "trust invalidation must move READY_TO_SUBMIT cases back to review",
      );
    }
  }
  if (record.trust_currency_state === "NOT_APPLICABLE_PRETRUST") {
    if (!["PREPARING", "READY_REVIEW"].includes(record.lifecycle_state)) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "NOT_APPLICABLE_PRETRUST is legal only for PREPARING or READY_REVIEW filing cases",
      );
    }
    requireNull("current_trust_ref", record.current_trust_ref);
    requireNull("current_parity_ref", record.current_parity_ref);
    requireNull("trust_invalidated_at", record.trust_invalidated_at);
    requireEmpty("trust_invalidation_reason_codes", record.trust_invalidation_reason_codes);
    requireEmpty("trust_invalidation_dependency_refs", record.trust_invalidation_dependency_refs);
  }
}

export function buildFilingCaseRecord(input: FilingCaseBuildInput): FilingCaseRecord {
  const lifecycleState = input.lifecycle_state ?? "NOT_STARTED";
  const lastTransitionAt = normalizeTimestamp("last_transition_at", input.last_transition_at);
  const executionModeBoundaryContract = assertLiveComplianceBoundary(
    input.execution_mode_boundary_contract ?? buildLiveExecutionModeBoundaryContract(),
  );
  const trustCurrencyState =
    input.trust_currency_state ??
    (lifecycleState === "NOT_STARTED"
      ? null
      : input.current_trust_ref && input.current_parity_ref
        ? "CURRENT"
        : "NOT_APPLICABLE_PRETRUST");
  const record: FilingCaseRecord = {
    amendment_case_ref: normalizeNullableString("amendment_case_ref", input.amendment_case_ref),
    artifact_type: "FilingCase",
    authority_calculation_ref: normalizeNullableString(
      "authority_calculation_ref",
      input.authority_calculation_ref,
    ),
    calculation_basis_ref: normalizeNullableString("calculation_basis_ref", input.calculation_basis_ref),
    calculation_hash: normalizeNullableString("calculation_hash", input.calculation_hash),
    calculation_id: normalizeNullableString("calculation_id", input.calculation_id),
    calculation_request_ref: normalizeNullableString("calculation_request_ref", input.calculation_request_ref),
    calculation_type: normalizeNullableString("calculation_type", input.calculation_type),
    client_id: requireString("client_id", input.client_id),
    controlling_proof_bundle_ref: normalizeNullableString(
      "controlling_proof_bundle_ref",
      input.controlling_proof_bundle_ref,
    ),
    current_manifest_ref: normalizeNullableString("current_manifest_ref", input.current_manifest_ref),
    current_packet_ref: normalizeNullableString("current_packet_ref", input.current_packet_ref),
    current_parity_ref: normalizeNullableString("current_parity_ref", input.current_parity_ref),
    current_submission_ref: normalizeNullableString("current_submission_ref", input.current_submission_ref),
    current_submission_state: normalizeSubmissionState(input.current_submission_state),
    current_trust_ref: normalizeNullableString("current_trust_ref", input.current_trust_ref),
    execution_mode_boundary_contract: executionModeBoundaryContract,
    filing_case_id: input.filing_case_id ?? defaultCaseId(input),
    last_transition_at: lastTransitionAt,
    lifecycle_state: lifecycleState,
    packet_state: normalizePacketState(input.packet_state),
    period: requireString("period", input.period),
    proof_closure_state:
      input.proof_closure_state ??
      (input.controlling_proof_bundle_ref ? "CLOSED" : "NOT_APPLICABLE"),
    readiness_context_ref: normalizeNullableString("readiness_context_ref", input.readiness_context_ref),
    state_transition_contract:
      input.state_transition_contract ??
      buildStateTransitionContract({
        current_state: lifecycleState,
        object_family: "FILING_CASE",
        previous_state_or_null: null,
        transition_applied_at: lastTransitionAt,
        transition_event_code: lifecycleState === "NOT_STARTED" ? "case_initialized" : "case_upserted",
      }),
    temporal_propagation_event_refs: normalizeSortedStringSet(
      "temporal_propagation_event_refs",
      input.temporal_propagation_event_refs,
    ),
    tenant_id: requireString("tenant_id", input.tenant_id),
    trust_currency_state: trustCurrencyState,
    trust_invalidated_at: normalizeNullableTimestamp("trust_invalidated_at", input.trust_invalidated_at),
    trust_invalidation_dependency_refs: normalizeSortedStringSet(
      "trust_invalidation_dependency_refs",
      input.trust_invalidation_dependency_refs,
    ),
    trust_invalidation_reason_codes: normalizeSortedStringSet(
      "trust_invalidation_reason_codes",
      input.trust_invalidation_reason_codes,
    ),
    user_confirmation_ref: normalizeNullableString("user_confirmation_ref", input.user_confirmation_ref),
  };
  return normalizeFilingCaseRecord(record);
}

export function normalizeFilingCaseRecord(input: FilingCaseRecord): FilingCaseRecord {
  const record: FilingCaseRecord = {
    ...input,
    amendment_case_ref: normalizeNullableString("amendment_case_ref", input.amendment_case_ref),
    artifact_type: "FilingCase",
    authority_calculation_ref: normalizeNullableString(
      "authority_calculation_ref",
      input.authority_calculation_ref,
    ),
    calculation_basis_ref: normalizeNullableString("calculation_basis_ref", input.calculation_basis_ref),
    calculation_hash: normalizeNullableString("calculation_hash", input.calculation_hash),
    calculation_id: normalizeNullableString("calculation_id", input.calculation_id),
    calculation_request_ref: normalizeNullableString("calculation_request_ref", input.calculation_request_ref),
    calculation_type: normalizeNullableString("calculation_type", input.calculation_type),
    client_id: requireString("client_id", input.client_id),
    controlling_proof_bundle_ref: normalizeNullableString(
      "controlling_proof_bundle_ref",
      input.controlling_proof_bundle_ref,
    ),
    current_manifest_ref: normalizeNullableString("current_manifest_ref", input.current_manifest_ref),
    current_packet_ref: normalizeNullableString("current_packet_ref", input.current_packet_ref),
    current_parity_ref: normalizeNullableString("current_parity_ref", input.current_parity_ref),
    current_submission_ref: normalizeNullableString("current_submission_ref", input.current_submission_ref),
    current_submission_state: normalizeSubmissionState(input.current_submission_state),
    current_trust_ref: normalizeNullableString("current_trust_ref", input.current_trust_ref),
    execution_mode_boundary_contract: assertLiveComplianceBoundary(input.execution_mode_boundary_contract),
    filing_case_id: requireString("filing_case_id", input.filing_case_id),
    last_transition_at: normalizeTimestamp("last_transition_at", input.last_transition_at),
    lifecycle_state: assertEnum("lifecycle_state", input.lifecycle_state, FILING_CASE_LIFECYCLE_STATES),
    packet_state: normalizePacketState(input.packet_state),
    period: requireString("period", input.period),
    proof_closure_state: assertEnum("proof_closure_state", input.proof_closure_state, [
      "NOT_APPLICABLE",
      "CLOSED",
      "OPEN",
    ] as const),
    readiness_context_ref: normalizeNullableString("readiness_context_ref", input.readiness_context_ref),
    state_transition_contract: normalizeStateTransitionContract(input.state_transition_contract, {
      current_state: input.lifecycle_state,
      machine_code: "FILING_CASE_LIFECYCLE_V1",
      object_family: "FILING_CASE",
      state_field_name: "lifecycle_state",
      transition_applied_at: normalizeTimestamp("last_transition_at", input.last_transition_at),
    }),
    temporal_propagation_event_refs: normalizeSortedStringSet(
      "temporal_propagation_event_refs",
      input.temporal_propagation_event_refs,
    ),
    tenant_id: requireString("tenant_id", input.tenant_id),
    trust_currency_state: input.trust_currency_state == null
      ? null
      : assertEnum("trust_currency_state", input.trust_currency_state, [
          "CURRENT",
          "RECALC_REQUIRED",
          "NOT_APPLICABLE_PRETRUST",
        ] as const),
    trust_invalidated_at: normalizeNullableTimestamp("trust_invalidated_at", input.trust_invalidated_at),
    trust_invalidation_dependency_refs: normalizeSortedStringSet(
      "trust_invalidation_dependency_refs",
      input.trust_invalidation_dependency_refs,
    ),
    trust_invalidation_reason_codes: normalizeSortedStringSet(
      "trust_invalidation_reason_codes",
      input.trust_invalidation_reason_codes,
    ),
    user_confirmation_ref: normalizeNullableString("user_confirmation_ref", input.user_confirmation_ref),
  };

  if (record.lifecycle_state === "NOT_STARTED") {
    for (const field of [
      "current_manifest_ref",
      "current_trust_ref",
      "current_parity_ref",
      "current_submission_ref",
      "current_submission_state",
      "current_packet_ref",
      "packet_state",
      "calculation_basis_ref",
      "authority_calculation_ref",
      "amendment_case_ref",
      "calculation_request_ref",
      "calculation_id",
      "calculation_type",
      "calculation_hash",
      "readiness_context_ref",
      "user_confirmation_ref",
      "controlling_proof_bundle_ref",
    ] as const) {
      requireNull(field, record[field]);
    }
    requireEmpty("temporal_propagation_event_refs", record.temporal_propagation_event_refs);
    if (record.proof_closure_state !== "NOT_APPLICABLE") {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "NOT_STARTED cases must keep proof_closure_state NOT_APPLICABLE",
      );
    }
  } else {
    requireNonNull("current_manifest_ref", record.current_manifest_ref);
  }

  if (["PREPARING", "READY_REVIEW", "AMENDMENT_ELIGIBLE"].includes(record.lifecycle_state)) {
    requireNull("current_submission_ref", record.current_submission_ref);
    requireNull("current_submission_state", record.current_submission_state);
  }
  if (record.lifecycle_state === "READY_TO_SUBMIT") {
    requireNonNull("current_packet_ref", record.current_packet_ref);
    if (record.packet_state !== "APPROVED_TO_SUBMIT") {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "READY_TO_SUBMIT cases require an APPROVED_TO_SUBMIT packet",
      );
    }
    requireNull("current_submission_ref", record.current_submission_ref);
    requireNull("current_submission_state", record.current_submission_state);
    requireNonNull("controlling_proof_bundle_ref", record.controlling_proof_bundle_ref);
    if (record.proof_closure_state !== "CLOSED" || record.trust_currency_state !== "CURRENT") {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "READY_TO_SUBMIT cases require closed proof and CURRENT trust",
      );
    }
  }

  const submittedCaseStates: FilingCaseLifecycleState[] = [
    "SUBMITTED_PENDING",
    "FILED_CONFIRMED",
    "FILED_UNKNOWN",
    "REJECTED",
    "AMENDED_CONFIRMED",
    "CLOSED",
  ];
  if (submittedCaseStates.includes(record.lifecycle_state)) {
    requireNonNull("current_submission_ref", record.current_submission_ref);
    requireNonNull("current_submission_state", record.current_submission_state);
    requireNonNull("current_packet_ref", record.current_packet_ref);
    if (record.packet_state !== "SUBMITTED" || record.proof_closure_state !== "CLOSED") {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "submitted and filed case states require submitted packet lineage and closed proof",
      );
    }
  }
  if (
    record.lifecycle_state === "SUBMITTED_PENDING" &&
    !["INTENT_RECORDED", "TRANSMIT_PENDING", "TRANSMITTED", "PENDING_ACK", "UNKNOWN"].includes(
      record.current_submission_state ?? "",
    )
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "SUBMITTED_PENDING cases require an in-flight or unknown submission state",
    );
  }
  if (record.lifecycle_state === "FILED_CONFIRMED" && record.current_submission_state !== "CONFIRMED") {
    throw new AuthorityModelError("AUTHORITY_CONTRACT_INVALID", "FILED_CONFIRMED requires confirmed submission evidence");
  }
  if (record.lifecycle_state === "FILED_UNKNOWN" && record.current_submission_state !== "UNKNOWN") {
    throw new AuthorityModelError("AUTHORITY_CONTRACT_INVALID", "FILED_UNKNOWN requires UNKNOWN submission evidence");
  }
  if (record.lifecycle_state === "REJECTED" && record.current_submission_state !== "REJECTED") {
    throw new AuthorityModelError("AUTHORITY_CONTRACT_INVALID", "REJECTED requires rejected submission evidence");
  }
  if (["AMENDMENT_IN_PROGRESS", "AMENDED_CONFIRMED", "CLOSED"].includes(record.lifecycle_state)) {
    requireNonNull("amendment_case_ref", record.amendment_case_ref);
  }
  if (record.lifecycle_state === "AMENDED_CONFIRMED" && record.current_submission_state !== "CONFIRMED") {
    throw new AuthorityModelError("AUTHORITY_CONTRACT_INVALID", "AMENDED_CONFIRMED requires confirmed amendment submission evidence");
  }
  if (record.lifecycle_state === "CLOSED") {
    if (record.current_submission_state !== "CONFIRMED" || record.packet_state !== "SUBMITTED") {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "CLOSED cases must retain confirmed submission and submitted packet lineage",
      );
    }
  }

  requireFullCalculationLineage(record);
  assertPacketCaseCompatibility(record);
  assertTrustCurrency(record);
  return record;
}

export function cloneFilingCaseRecord(record: FilingCaseRecord) {
  return cloneRecord(record);
}

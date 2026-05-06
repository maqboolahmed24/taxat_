import {
  type ExecutionModeBoundaryContract,
  type StateTransitionContract,
  AuthorityModelError,
  assertEnum,
  assertLiveComplianceBoundary,
  buildLiveExecutionModeBoundaryContract,
  buildStateTransitionContract,
  cloneRecord,
  hashObject,
  normalizeNullableString,
  normalizeNullableTimestamp,
  normalizeOrderedStringSet,
  normalizeSortedStringSet,
  normalizeStateTransitionContract,
  normalizeTimestamp,
  refFromId,
  requireEmpty,
  requireNonNull,
  requireNull,
  requireString,
} from "./authority_common.ts";
import type { ProofClosureState } from "./filing_case.ts";

export const FILING_PACKET_LIFECYCLE_STATES = [
  "DRAFT",
  "PREPARED",
  "APPROVED_TO_SUBMIT",
  "SUBMITTED",
  "VOID",
  "SUPERSEDED",
] as const;

export type FilingPacketLifecycleState = (typeof FILING_PACKET_LIFECYCLE_STATES)[number];
export type FilingPacketApprovalState =
  | "NOT_REQUIRED"
  | "SATISFIED"
  | "REQUIRED_PENDING"
  | "UNSATISFIABLE"
  | "DENIED";
export type FilingPacketDeclaredBasisAckState =
  | "NOT_APPLICABLE"
  | "NOT_REQUIRED"
  | "SATISFIED"
  | "REQUIRED_PENDING"
  | "UNSATISFIABLE";

export type FilingPacketRecord = {
  approval_state: FilingPacketApprovalState | null;
  approved_at: string | null;
  artifact_type: "FilingPacket";
  authority_calculation_ref: string | null;
  calculation_basis_ref: string | null;
  controlling_proof_bundle_ref: string | null;
  created_at: string;
  declared_basis: string;
  declared_basis_ack_state: FilingPacketDeclaredBasisAckState | null;
  disclaimers: string[];
  execution_mode_boundary_contract: ExecutionModeBoundaryContract;
  filing_gate_ref: string | null;
  lifecycle_state: FilingPacketLifecycleState;
  manifest_binding_hash: string;
  manifest_id: string;
  notice_resolution_ref: string | null;
  notice_step_refs: string[];
  packet_id: string;
  payload_hash: string;
  payload_ref: string;
  proof_closure_state: ProofClosureState;
  readiness_context_ref: string | null;
  state_changed_at: string;
  state_transition_contract: StateTransitionContract;
  submitted_at: string | null;
  superseded_at: string | null;
  user_confirmation_ref: string | null;
  voided_at: string | null;
};

export type FilingPacketBuildInput = Partial<
  Omit<
    FilingPacketRecord,
    | "artifact_type"
    | "execution_mode_boundary_contract"
    | "state_transition_contract"
    | "disclaimers"
    | "notice_step_refs"
  >
> & {
  created_at: string;
  disclaimers?: readonly string[];
  execution_mode_boundary_contract?: ExecutionModeBoundaryContract;
  manifest_id: string;
  notice_step_refs?: readonly string[];
  payload_hash: string;
  payload_ref: string;
  state_changed_at?: string;
  state_transition_contract?: StateTransitionContract;
};

export function filingPacketRef(packet: Pick<FilingPacketRecord, "packet_id"> | string) {
  return refFromId("filing-packet", typeof packet === "string" ? packet : packet.packet_id);
}

function defaultPacketId(input: Pick<FilingPacketBuildInput, "manifest_id" | "payload_hash">) {
  return [
    "filing-packet",
    requireString("manifest_id", input.manifest_id),
    requireString("payload_hash", input.payload_hash).slice(0, 16),
  ].join(".");
}

function normalizeApprovalState(value: FilingPacketApprovalState | null | undefined) {
  return value == null
    ? null
    : assertEnum("approval_state", value, [
        "NOT_REQUIRED",
        "SATISFIED",
        "REQUIRED_PENDING",
        "UNSATISFIABLE",
        "DENIED",
      ] as const);
}

function normalizeAckState(value: FilingPacketDeclaredBasisAckState | null | undefined) {
  return value == null
    ? null
    : assertEnum("declared_basis_ack_state", value, [
        "NOT_APPLICABLE",
        "NOT_REQUIRED",
        "SATISFIED",
        "REQUIRED_PENDING",
        "UNSATISFIABLE",
      ] as const);
}

function assertResolvedApproval(record: FilingPacketRecord) {
  if (!["NOT_REQUIRED", "SATISFIED"].includes(record.approval_state ?? "")) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "APPROVED_TO_SUBMIT and SUBMITTED packets require resolved approval_state",
    );
  }
  if (!["NOT_APPLICABLE", "NOT_REQUIRED", "SATISFIED"].includes(record.declared_basis_ack_state ?? "")) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "APPROVED_TO_SUBMIT and SUBMITTED packets require resolved declared_basis_ack_state",
    );
  }
}

function assertTimestampOrder(record: FilingPacketRecord) {
  const created = Date.parse(record.created_at);
  const stateChanged = Date.parse(record.state_changed_at);
  const transitionTimes = [
    record.approved_at,
    record.submitted_at,
    record.voided_at,
    record.superseded_at,
  ].filter((value): value is string => value !== null);
  for (const [label, value] of [
    ["approved_at", record.approved_at],
    ["submitted_at", record.submitted_at],
    ["voided_at", record.voided_at],
    ["superseded_at", record.superseded_at],
  ] as const) {
    if (value !== null && Date.parse(value) < created) {
      throw new AuthorityModelError("AUTHORITY_CONTRACT_INVALID", `${label} cannot precede created_at`);
    }
  }
  if (
    record.approved_at !== null &&
    record.submitted_at !== null &&
    Date.parse(record.submitted_at) < Date.parse(record.approved_at)
  ) {
    throw new AuthorityModelError("AUTHORITY_CONTRACT_INVALID", "submitted_at cannot precede approved_at");
  }
  const latestTransition = Math.max(created, ...transitionTimes.map((value) => Date.parse(value)));
  if (stateChanged < latestTransition) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "state_changed_at must be at or after the latest packet transition timestamp",
    );
  }
}

function hasLineage(record: Pick<
  FilingPacketRecord,
  "authority_calculation_ref" | "calculation_basis_ref" | "readiness_context_ref" | "user_confirmation_ref"
>) {
  return (
    record.authority_calculation_ref !== null ||
    record.calculation_basis_ref !== null ||
    record.readiness_context_ref !== null ||
    record.user_confirmation_ref !== null
  );
}

export function filingPacketContentFingerprint(record: FilingPacketRecord) {
  return hashObject("FILING_PACKET_CONTENT_V1", {
    authority_calculation_ref: record.authority_calculation_ref,
    calculation_basis_ref: record.calculation_basis_ref,
    declared_basis: record.declared_basis,
    disclaimers: record.disclaimers,
    manifest_binding_hash: record.manifest_binding_hash,
    manifest_id: record.manifest_id,
    notice_step_refs: record.notice_step_refs,
    payload_hash: record.payload_hash,
    payload_ref: record.payload_ref,
    readiness_context_ref: record.readiness_context_ref,
    user_confirmation_ref: record.user_confirmation_ref,
  });
}

export function buildFilingPacketRecord(input: FilingPacketBuildInput): FilingPacketRecord {
  const lifecycleState = input.lifecycle_state ?? "DRAFT";
  const createdAt = normalizeTimestamp("created_at", input.created_at);
  const stateChangedAt = normalizeTimestamp("state_changed_at", input.state_changed_at ?? input.created_at);
  const executionModeBoundaryContract = assertLiveComplianceBoundary(
    input.execution_mode_boundary_contract ?? buildLiveExecutionModeBoundaryContract(),
  );
  const record: FilingPacketRecord = {
    approval_state: normalizeApprovalState(
      input.approval_state ?? (lifecycleState === "PREPARED" ? "REQUIRED_PENDING" : null),
    ),
    approved_at: normalizeNullableTimestamp("approved_at", input.approved_at),
    artifact_type: "FilingPacket",
    authority_calculation_ref: normalizeNullableString(
      "authority_calculation_ref",
      input.authority_calculation_ref,
    ),
    calculation_basis_ref: normalizeNullableString("calculation_basis_ref", input.calculation_basis_ref),
    controlling_proof_bundle_ref: normalizeNullableString(
      "controlling_proof_bundle_ref",
      input.controlling_proof_bundle_ref,
    ),
    created_at: createdAt,
    declared_basis: requireString("declared_basis", input.declared_basis ?? "AUTHORITY_CALCULATION_OR_MANIFEST"),
    declared_basis_ack_state: normalizeAckState(
      input.declared_basis_ack_state ?? (lifecycleState === "PREPARED" ? "REQUIRED_PENDING" : null),
    ),
    disclaimers: normalizeOrderedStringSet("disclaimers", input.disclaimers, { maxItems: 12 }),
    execution_mode_boundary_contract: executionModeBoundaryContract,
    filing_gate_ref: normalizeNullableString("filing_gate_ref", input.filing_gate_ref),
    lifecycle_state: lifecycleState,
    manifest_binding_hash: requireString("manifest_binding_hash", input.manifest_binding_hash),
    manifest_id: requireString("manifest_id", input.manifest_id),
    notice_resolution_ref: normalizeNullableString("notice_resolution_ref", input.notice_resolution_ref),
    notice_step_refs: normalizeOrderedStringSet("notice_step_refs", input.notice_step_refs, { maxItems: 8 }),
    packet_id: input.packet_id ?? defaultPacketId(input),
    payload_hash: requireString("payload_hash", input.payload_hash),
    payload_ref: requireString("payload_ref", input.payload_ref),
    proof_closure_state:
      input.proof_closure_state ??
      (input.controlling_proof_bundle_ref ? "OPEN" : "NOT_APPLICABLE"),
    readiness_context_ref: normalizeNullableString("readiness_context_ref", input.readiness_context_ref),
    state_changed_at: stateChangedAt,
    state_transition_contract:
      input.state_transition_contract ??
      buildStateTransitionContract({
        current_state: lifecycleState,
        object_family: "FILING_PACKET",
        previous_state_or_null: null,
        transition_applied_at: stateChangedAt,
        transition_event_code: lifecycleState === "DRAFT" ? "packet_initialized" : "packet_upserted",
      }),
    submitted_at: normalizeNullableTimestamp("submitted_at", input.submitted_at),
    superseded_at: normalizeNullableTimestamp("superseded_at", input.superseded_at),
    user_confirmation_ref: normalizeNullableString("user_confirmation_ref", input.user_confirmation_ref),
    voided_at: normalizeNullableTimestamp("voided_at", input.voided_at),
  };
  return normalizeFilingPacketRecord(record);
}

export function normalizeFilingPacketRecord(input: FilingPacketRecord): FilingPacketRecord {
  const record: FilingPacketRecord = {
    ...input,
    approval_state: normalizeApprovalState(input.approval_state),
    approved_at: normalizeNullableTimestamp("approved_at", input.approved_at),
    artifact_type: "FilingPacket",
    authority_calculation_ref: normalizeNullableString(
      "authority_calculation_ref",
      input.authority_calculation_ref,
    ),
    calculation_basis_ref: normalizeNullableString("calculation_basis_ref", input.calculation_basis_ref),
    controlling_proof_bundle_ref: normalizeNullableString(
      "controlling_proof_bundle_ref",
      input.controlling_proof_bundle_ref,
    ),
    created_at: normalizeTimestamp("created_at", input.created_at),
    declared_basis: requireString("declared_basis", input.declared_basis),
    declared_basis_ack_state: normalizeAckState(input.declared_basis_ack_state),
    disclaimers: normalizeOrderedStringSet("disclaimers", input.disclaimers, { maxItems: 12 }),
    execution_mode_boundary_contract: assertLiveComplianceBoundary(input.execution_mode_boundary_contract),
    filing_gate_ref: normalizeNullableString("filing_gate_ref", input.filing_gate_ref),
    lifecycle_state: assertEnum("lifecycle_state", input.lifecycle_state, FILING_PACKET_LIFECYCLE_STATES),
    manifest_binding_hash: requireString("manifest_binding_hash", input.manifest_binding_hash),
    manifest_id: requireString("manifest_id", input.manifest_id),
    notice_resolution_ref: normalizeNullableString("notice_resolution_ref", input.notice_resolution_ref),
    notice_step_refs: normalizeOrderedStringSet("notice_step_refs", input.notice_step_refs, { maxItems: 8 }),
    packet_id: requireString("packet_id", input.packet_id),
    payload_hash: requireString("payload_hash", input.payload_hash),
    payload_ref: requireString("payload_ref", input.payload_ref),
    proof_closure_state: assertEnum("proof_closure_state", input.proof_closure_state, [
      "NOT_APPLICABLE",
      "OPEN",
      "CLOSED",
    ] as const),
    readiness_context_ref: normalizeNullableString("readiness_context_ref", input.readiness_context_ref),
    state_changed_at: normalizeTimestamp("state_changed_at", input.state_changed_at),
    state_transition_contract: normalizeStateTransitionContract(input.state_transition_contract, {
      current_state: input.lifecycle_state,
      machine_code: "FILING_PACKET_LIFECYCLE_V1",
      object_family: "FILING_PACKET",
      state_field_name: "lifecycle_state",
      transition_applied_at: normalizeTimestamp("state_changed_at", input.state_changed_at),
    }),
    submitted_at: normalizeNullableTimestamp("submitted_at", input.submitted_at),
    superseded_at: normalizeNullableTimestamp("superseded_at", input.superseded_at),
    user_confirmation_ref: normalizeNullableString("user_confirmation_ref", input.user_confirmation_ref),
    voided_at: normalizeNullableTimestamp("voided_at", input.voided_at),
  };

  if (hasLineage(record)) {
    requireNonNull("readiness_context_ref", record.readiness_context_ref);
    if (record.authority_calculation_ref !== null) {
      requireNonNull("calculation_basis_ref", record.calculation_basis_ref);
    }
  }
  if (record.controlling_proof_bundle_ref === null) {
    if (record.proof_closure_state !== "NOT_APPLICABLE") {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "packets without controlling proof bundle must use proof_closure_state NOT_APPLICABLE",
      );
    }
  } else if (!["OPEN", "CLOSED"].includes(record.proof_closure_state)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "packets with controlling proof bundle require OPEN or CLOSED proof state",
    );
  }
  if (record.notice_resolution_ref !== null && record.notice_step_refs.length === 0) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "notice_resolution_ref requires ordered notice_step_refs",
    );
  }
  if (record.notice_step_refs.length === 0) {
    requireNull("notice_resolution_ref", record.notice_resolution_ref);
  }

  switch (record.lifecycle_state) {
    case "DRAFT":
      requireNull("approval_state", record.approval_state);
      requireNull("declared_basis_ack_state", record.declared_basis_ack_state);
      requireEmpty("notice_step_refs", record.notice_step_refs);
      requireNull("notice_resolution_ref", record.notice_resolution_ref);
      requireNull("filing_gate_ref", record.filing_gate_ref);
      requireNull("approved_at", record.approved_at);
      requireNull("submitted_at", record.submitted_at);
      requireNull("voided_at", record.voided_at);
      requireNull("superseded_at", record.superseded_at);
      requireNull("controlling_proof_bundle_ref", record.controlling_proof_bundle_ref);
      if (record.proof_closure_state !== "NOT_APPLICABLE") {
        throw new AuthorityModelError(
          "AUTHORITY_CONTRACT_INVALID",
          "DRAFT packets must not bind proof closure",
        );
      }
      break;
    case "PREPARED":
      requireNonNull("approval_state", record.approval_state);
      requireNonNull("declared_basis_ack_state", record.declared_basis_ack_state);
      requireNull("approved_at", record.approved_at);
      requireNull("submitted_at", record.submitted_at);
      requireNull("voided_at", record.voided_at);
      requireNull("superseded_at", record.superseded_at);
      break;
    case "APPROVED_TO_SUBMIT":
      assertResolvedApproval(record);
      requireNonNull("filing_gate_ref", record.filing_gate_ref);
      requireNonNull("controlling_proof_bundle_ref", record.controlling_proof_bundle_ref);
      requireNonNull("approved_at", record.approved_at);
      requireNull("submitted_at", record.submitted_at);
      requireNull("voided_at", record.voided_at);
      requireNull("superseded_at", record.superseded_at);
      if (record.proof_closure_state !== "CLOSED") {
        throw new AuthorityModelError(
          "AUTHORITY_CONTRACT_INVALID",
          "APPROVED_TO_SUBMIT packets require CLOSED proof",
        );
      }
      if (record.notice_step_refs.length > 0) {
        requireNonNull("notice_resolution_ref", record.notice_resolution_ref);
      }
      break;
    case "SUBMITTED":
      assertResolvedApproval(record);
      requireNonNull("filing_gate_ref", record.filing_gate_ref);
      requireNonNull("controlling_proof_bundle_ref", record.controlling_proof_bundle_ref);
      requireNonNull("approved_at", record.approved_at);
      requireNonNull("submitted_at", record.submitted_at);
      requireNull("voided_at", record.voided_at);
      requireNull("superseded_at", record.superseded_at);
      if (record.proof_closure_state !== "CLOSED") {
        throw new AuthorityModelError("AUTHORITY_CONTRACT_INVALID", "SUBMITTED packets require CLOSED proof");
      }
      if (record.notice_step_refs.length > 0) {
        requireNonNull("notice_resolution_ref", record.notice_resolution_ref);
      }
      break;
    case "VOID":
      requireNonNull("voided_at", record.voided_at);
      requireNull("approved_at", record.approved_at);
      requireNull("submitted_at", record.submitted_at);
      requireNull("superseded_at", record.superseded_at);
      break;
    case "SUPERSEDED":
      requireNonNull("superseded_at", record.superseded_at);
      requireNull("approved_at", record.approved_at);
      requireNull("submitted_at", record.submitted_at);
      requireNull("voided_at", record.voided_at);
      break;
  }

  assertTimestampOrder(record);
  return record;
}

export function cloneFilingPacketRecord(record: FilingPacketRecord) {
  return cloneRecord(record);
}

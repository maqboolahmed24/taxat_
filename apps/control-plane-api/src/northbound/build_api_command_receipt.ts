import { createReceiptTruthBoundaryContract, syntheticReceiptClientId } from "./policy.ts";
import type { ParsedCommandEnvelope } from "./parse_command_envelope.ts";
import type { ApiCommandReceipt } from "../../../../packages/generated-models/src/generated/typescript/manifest-and-release.ts";
import type { RouteStabilityContract } from "../../../../packages/generated-models/src/generated/typescript/surface-and-experience.ts";
import { stableJsonHash } from "../../../../packages/domain-kernel/src/primitives/hash.ts";

export type BuildApiCommandReceiptInput = {
  parsed: ParsedCommandEnvelope;
  acceptedAt: string;
  expiresAt: string;
  requestHash: string;
  acceptanceState: ApiCommandReceipt["acceptance_state"];
  reasonCodes?: string[];
  duplicateOfReceiptId?: string | null;
  originalAcceptanceState?: ApiCommandReceipt["original_acceptance_state"];
  semanticActionId?: string | null;
  resultRefOrNull?: string | null;
  projectionSequenceOrNull?: number | null;
  projectionRefOrNull?: string | null;
  staleGuardFamily?: ApiCommandReceipt["stale_guard_family"];
  latestStaleGuardValue?: ApiCommandReceipt["latest_stale_guard_value"];
  latestStabilityContractOrNull?: RouteStabilityContract | null;
  activityRefs?: string[];
  auditEventRefs?: string[];
  notificationRefs?: string[];
};

function defaultSemanticActionId(parsed: ParsedCommandEnvelope) {
  return `action.${parsed.command.command_type.toLowerCase()}.${parsed.command.command_id}`;
}

function defaultReceiptId(
  parsed: ParsedCommandEnvelope,
  requestHash: string,
  acceptanceState: ApiCommandReceipt["acceptance_state"],
) {
  return `receipt.${stableJsonHash({
    acceptance_state: acceptanceState,
    command_id: parsed.command.command_id,
    request_hash: requestHash,
  })}`;
}

function defaultResultRef(parsed: ParsedCommandEnvelope) {
  return `result.pending.${parsed.command.command_type.toLowerCase()}.${parsed.command.command_id}`;
}

function normalizeRefs(values: string[] | undefined) {
  return values ? [...new Set(values)] : [];
}

function validateProjectionFields(
  parsed: ParsedCommandEnvelope,
  projectionSequenceOrNull: number | null,
  projectionRefOrNull: string | null,
  acceptanceState: ApiCommandReceipt["acceptance_state"],
) {
  if (acceptanceState === "REJECTED_STALE_VIEW" && parsed.commandFamily.projection_stream_class === "NONE") {
    throw new Error(
      `${parsed.commandFamily.command_type} uses projection_stream_class=NONE, so stale rejection should surface as ProblemEnvelope rather than ApiCommandReceipt.`,
    );
  }
  if (parsed.commandFamily.projection_stream_class === "NONE") {
    return {
      latest_projection_sequence: null,
      latest_projection_ref: null,
      projection_stream_class: "NONE" as const,
    };
  }
  return {
    latest_projection_sequence: projectionSequenceOrNull,
    latest_projection_ref: projectionRefOrNull,
    projection_stream_class: parsed.commandFamily.projection_stream_class,
  };
}

export function buildApiCommandReceipt(input: BuildApiCommandReceiptInput): ApiCommandReceipt {
  const reasonCodes = [...new Set(input.reasonCodes ?? [])];
  const projection = validateProjectionFields(
    input.parsed,
    input.projectionSequenceOrNull ?? null,
    input.projectionRefOrNull ?? null,
    input.acceptanceState,
  );
  const successClass =
    input.acceptanceState === "ACCEPTED" || input.acceptanceState === "DUPLICATE_REPLAY";
  const semanticActionId = successClass ? input.semanticActionId ?? defaultSemanticActionId(input.parsed) : null;
  const resultRefOrNull =
    successClass &&
    input.resultRefOrNull === null &&
    projection.latest_projection_ref === null &&
    normalizeRefs(input.activityRefs).length === 0 &&
    normalizeRefs(input.auditEventRefs).length === 0 &&
    normalizeRefs(input.notificationRefs).length === 0
      ? defaultResultRef(input.parsed)
      : input.resultRefOrNull ?? null;

  return {
    artifact_type: "ApiCommandReceipt",
    receipt_id: defaultReceiptId(input.parsed, input.requestHash, input.acceptanceState),
    tenant_id: input.parsed.command.tenant_id,
    client_id: syntheticReceiptClientId(input.parsed.command, input.parsed.actorContext),
    principal_ref: input.parsed.actorContext.principal_ref,
    session_ref: input.parsed.actorContext.session_ref,
    command_id: input.parsed.command.command_id,
    command_type: input.parsed.command.command_type,
    target_scope_class: input.parsed.command.target_scope_class,
    manifest_id: input.parsed.command.manifest_id,
    work_item_id: input.parsed.command.work_item_id,
    governance_target_ref: input.parsed.command.governance_target_ref,
    request_hash: input.requestHash,
    dependency_topology_hash: input.parsed.command.if_match_dependency_topology_hash,
    simulation_basis_hash: input.parsed.command.simulation_basis_hash,
    latest_mutation_basis_contract_or_null: input.parsed.command.mutation_basis_contract,
    idempotency_key: input.parsed.command.idempotency_key,
    acceptance_state: input.acceptanceState,
    original_acceptance_state:
      input.acceptanceState === "EXPIRED" ? input.originalAcceptanceState ?? null : null,
    duplicate_of_receipt_id:
      input.acceptanceState === "DUPLICATE_REPLAY" || input.acceptanceState === "EXPIRED"
        ? input.duplicateOfReceiptId ?? null
        : null,
    projection_stream_class: projection.projection_stream_class,
    latest_projection_sequence: projection.latest_projection_sequence,
    latest_projection_ref: projection.latest_projection_ref,
    semantic_action_id: semanticActionId,
    result_ref:
      input.acceptanceState === "REJECTED_STALE_VIEW" ||
      input.acceptanceState === "REJECTED_POLICY" ||
      input.acceptanceState === "REJECTED_INVALID"
        ? null
        : resultRefOrNull,
    reason_codes: reasonCodes,
    truth_boundary_contract: createReceiptTruthBoundaryContract(),
    mutation_precondition_binding: input.parsed.command.mutation_precondition_binding,
    stale_guard_family:
      input.acceptanceState === "REJECTED_STALE_VIEW" || input.acceptanceState === "EXPIRED"
        ? input.staleGuardFamily ?? null
        : null,
    latest_stale_guard_value:
      input.acceptanceState === "REJECTED_STALE_VIEW" || input.acceptanceState === "EXPIRED"
        ? input.latestStaleGuardValue ?? null
        : null,
    latest_stability_contract_or_null:
      input.acceptanceState === "REJECTED_STALE_VIEW" || input.acceptanceState === "EXPIRED"
        ? input.latestStabilityContractOrNull ?? null
        : null,
    activity_refs:
      input.acceptanceState === "REJECTED_STALE_VIEW" ||
      input.acceptanceState === "REJECTED_POLICY" ||
      input.acceptanceState === "REJECTED_INVALID"
        ? []
        : normalizeRefs(input.activityRefs),
    audit_event_refs:
      input.acceptanceState === "REJECTED_STALE_VIEW" ||
      input.acceptanceState === "REJECTED_POLICY" ||
      input.acceptanceState === "REJECTED_INVALID"
        ? []
        : normalizeRefs(input.auditEventRefs),
    notification_refs:
      input.acceptanceState === "REJECTED_STALE_VIEW" ||
      input.acceptanceState === "REJECTED_POLICY" ||
      input.acceptanceState === "REJECTED_INVALID"
        ? []
        : normalizeRefs(input.notificationRefs),
    accepted_at: input.acceptedAt,
    expires_at: input.expiresAt,
  };
}

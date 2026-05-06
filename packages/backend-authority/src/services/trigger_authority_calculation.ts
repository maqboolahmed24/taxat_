import {
  type AuthorityCalculationType,
  normalizeCalculationRuntimeScope,
} from "../models/authority_calculation_common.ts";
import {
  buildAuthorityCalculationRequest,
  type AuthorityCalculationRequestRecord,
} from "../models/authority_calculation_request.ts";
import type { AuthorityOperation } from "../models/authority_operation.ts";
import { AuthorityModelError } from "../models/authority_common.ts";
import { AuthorityCalculationRequestRepository } from "../repositories/authority_calculation_request_repository.ts";

export type TriggerAuthorityCalculationInput = {
  access_binding_hash?: string;
  authority_interaction_ref?: string | null;
  authority_operation?: AuthorityOperation | null;
  authority_operation_ref?: string | null;
  calculation_request_id?: string;
  calculation_type: AuthorityCalculationType;
  client_id: string;
  local_precondition_reason_codes?: readonly string[];
  manifest_id: string;
  provider_contract?: {
    read_only_analysis_allowed?: boolean;
  };
  requested_at: string;
  request_envelope_ref?: string | null;
  repository?: AuthorityCalculationRequestRepository;
  runtime_scope?: readonly string[];
  tenant_id: string;
};

function scopeForCalculationType(calculationType: AuthorityCalculationType) {
  return calculationType === "intent-to-amend"
    ? (["year_end", "amendment_intent"] as const)
    : (["year_end", "prepare_submission"] as const);
}

function reasonCodesForModeled(input: TriggerAuthorityCalculationInput) {
  const local = [...(input.local_precondition_reason_codes ?? [])];
  if (local.length > 0) {
    return local;
  }
  const operation = input.authority_operation;
  if (operation?.scope_execution_binding.execution_mode_or_null === "ANALYSIS") {
    return ["AUTHORITY_LIVE_CALL_FORBIDDEN_IN_ANALYSIS"];
  }
  return ["AUTHORITY_CALCULATION_MODELED"];
}

export async function triggerAuthorityCalculation(input: TriggerAuthorityCalculationInput): Promise<{
  request: AuthorityCalculationRequestRecord;
  repository: AuthorityCalculationRequestRepository;
  stored: Awaited<ReturnType<AuthorityCalculationRequestRepository["persistAuthorityCalculationRequest"]>>;
}> {
  const repository = input.repository ?? new AuthorityCalculationRequestRepository();
  const operation = input.authority_operation ?? null;
  const runtimeScope = normalizeCalculationRuntimeScope({
    calculation_type: input.calculation_type,
    label: "runtime_scope",
    runtime_scope: input.runtime_scope ?? operation?.runtime_scope ?? scopeForCalculationType(input.calculation_type),
  });
  const analysisLiveForbidden =
    operation?.scope_execution_binding.execution_mode_or_null === "ANALYSIS" &&
    input.provider_contract?.read_only_analysis_allowed !== true;
  const modeled = (input.local_precondition_reason_codes?.length ?? 0) > 0 || analysisLiveForbidden;

  if (!modeled && operation === null && (!input.authority_operation_ref || !input.request_envelope_ref)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "live authority calculation trigger requires authority operation and request-envelope lineage",
    );
  }

  const request = buildAuthorityCalculationRequest({
    access_binding_hash: input.access_binding_hash ?? operation?.access_binding_hash,
    authority_interaction_ref: modeled
      ? null
      : input.authority_interaction_ref ?? `authority-interaction://${input.calculation_request_id ?? "calculation"}`,
    authority_operation_ref: modeled
      ? null
      : input.authority_operation_ref ??
        (operation ? `authority-operation://${operation.operation_id}` : null),
    authority_scope: operation?.authority_scope,
    calculation_request_id: input.calculation_request_id,
    calculation_type: input.calculation_type,
    client_id: input.client_id,
    live_authority_call_executed: !modeled,
    manifest_id: input.manifest_id,
    operation_profile_ref: operation?.operation_profile_ref,
    partition_scope_refs: operation?.business_partitions,
    provider_environment: operation?.provider_environment,
    reason_codes: modeled ? reasonCodesForModeled(input) : [],
    request_envelope_ref: modeled ? null : input.request_envelope_ref ?? null,
    request_state: modeled ? "MODELED_ONLY" : "TRIGGERED",
    requested_at: input.requested_at,
    runtime_scope: runtimeScope,
    scope_execution_binding:
      operation === null
        ? undefined
        : {
            ...operation.scope_execution_binding,
            binding_scope_class: "AUTHORITY_CALCULATION_REQUEST",
            executable_scope: runtimeScope,
            requested_scope: runtimeScope,
          },
    target_obligation_ref: operation?.target_obligation_ref,
    tenant_id: input.tenant_id,
  });
  const stored = await repository.persistAuthorityCalculationRequest({ request });
  return { request, repository, stored };
}

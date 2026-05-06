import {
  AuthorityModelError,
  assertEnum,
  hashObject,
  normalizeNullableString,
  requireNonNull,
  requireString,
} from "./authority_common.ts";
import {
  type AuthorityCalculationType,
  type CalculationScopeExecutionBinding,
  assertCalculationType,
  calculationRequestRef,
  cloneCalculationRecord,
  defaultCalculationId,
  normalizeCalculationReasonCodes,
  normalizeCalculationRuntimeScope,
  normalizeCalculationScopeExecutionBinding,
  normalizeCalculationTimestamp,
} from "./authority_calculation_common.ts";

export const AUTHORITY_CALCULATION_REQUEST_STATES = [
  "MODELED_ONLY",
  "TRIGGERED",
  "RETRIEVE_PENDING",
  "RETRIEVED",
  "SUPERSEDED",
] as const;

export type AuthorityCalculationRequestState =
  (typeof AUTHORITY_CALCULATION_REQUEST_STATES)[number];

export type AuthorityCalculationRequestRecord = Omit<
  {
    access_binding_hash: string;
    artifact_type: "AuthorityCalculationRequest";
    authority_interaction_ref: string | null;
    authority_operation_ref: string | null;
    authority_scope: string;
    calculation_request_id: string;
    calculation_type: AuthorityCalculationType;
    client_id: string;
    live_authority_call_executed: boolean;
    manifest_id: string;
    operation_profile_ref: string;
    provider_environment: string;
    reason_codes: string[];
    request_envelope_ref: string | null;
    request_state: AuthorityCalculationRequestState;
    requested_at: string;
    runtime_scope: string[];
    scope_execution_binding: CalculationScopeExecutionBinding;
    target_obligation_ref: string | null;
    tenant_id: string;
  },
  never
> & {
  calculation_type: AuthorityCalculationType;
  runtime_scope: string[];
  scope_execution_binding: CalculationScopeExecutionBinding;
};

export type AuthorityCalculationRequestBuildInput = Partial<
  Omit<
    AuthorityCalculationRequestRecord,
    | "artifact_type"
    | "calculation_request_id"
    | "calculation_type"
    | "client_id"
    | "manifest_id"
    | "requested_at"
    | "scope_execution_binding"
    | "tenant_id"
  >
> & {
  calculation_request_id?: string;
  calculation_type: AuthorityCalculationType;
  client_id: string;
  manifest_id: string;
  partition_scope_refs?: readonly string[];
  requested_at: string;
  scope_execution_binding?: Partial<CalculationScopeExecutionBinding>;
  tenant_id: string;
};

function defaultRequestId(input: {
  calculation_type: AuthorityCalculationType;
  client_id: string;
  manifest_id: string;
  requested_at: string;
}) {
  return defaultCalculationId([
    "authority-calculation-request",
    input.manifest_id,
    input.client_id,
    input.calculation_type,
    input.requested_at,
  ]);
}

function defaultRuntimeScope(calculationType: AuthorityCalculationType) {
  return calculationType === "intent-to-amend"
    ? ["year_end", "amendment_intent"]
    : ["year_end", "prepare_submission"];
}

export function normalizeAuthorityCalculationRequest(
  input: AuthorityCalculationRequestRecord,
): AuthorityCalculationRequestRecord {
  const calculationType = assertCalculationType("calculation_type", input.calculation_type);
  const runtimeScope = normalizeCalculationRuntimeScope({
    calculation_type: calculationType,
    label: "runtime_scope",
    runtime_scope: input.runtime_scope,
  });
  const accessBindingHash = requireString("access_binding_hash", input.access_binding_hash);
  const request: AuthorityCalculationRequestRecord = {
    access_binding_hash: accessBindingHash,
    artifact_type: "AuthorityCalculationRequest",
    authority_interaction_ref: normalizeNullableString(
      "authority_interaction_ref",
      input.authority_interaction_ref,
    ),
    authority_operation_ref: normalizeNullableString(
      "authority_operation_ref",
      input.authority_operation_ref,
    ),
    authority_scope: requireString("authority_scope", input.authority_scope),
    calculation_request_id: requireString("calculation_request_id", input.calculation_request_id),
    calculation_type: calculationType,
    client_id: requireString("client_id", input.client_id),
    live_authority_call_executed: Boolean(input.live_authority_call_executed),
    manifest_id: requireString("manifest_id", input.manifest_id),
    operation_profile_ref: requireString("operation_profile_ref", input.operation_profile_ref),
    provider_environment: requireString("provider_environment", input.provider_environment),
    reason_codes: normalizeCalculationReasonCodes("reason_codes", input.reason_codes),
    request_envelope_ref: normalizeNullableString("request_envelope_ref", input.request_envelope_ref),
    request_state: assertEnum(
      "request_state",
      input.request_state,
      AUTHORITY_CALCULATION_REQUEST_STATES,
    ),
    requested_at: normalizeCalculationTimestamp("requested_at", input.requested_at),
    runtime_scope: runtimeScope,
    scope_execution_binding: normalizeCalculationScopeExecutionBinding({
      access_binding_hash: accessBindingHash,
      calculation_type: calculationType,
      runtime_scope: runtimeScope,
      scope_execution_binding: input.scope_execution_binding,
    }),
    target_obligation_ref: normalizeNullableString("target_obligation_ref", input.target_obligation_ref),
    tenant_id: requireString("tenant_id", input.tenant_id),
  };

  if (!request.live_authority_call_executed) {
    if (request.request_state !== "MODELED_ONLY") {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "modeled authority calculation requests must use MODELED_ONLY request_state",
      );
    }
    for (const field of [
      "authority_operation_ref",
      "request_envelope_ref",
      "authority_interaction_ref",
    ] as const) {
      if (request[field] !== null) {
        throw new AuthorityModelError(
          "AUTHORITY_CONTRACT_INVALID",
          `${field} must be null when live_authority_call_executed=false`,
        );
      }
    }
    if (request.reason_codes.length === 0) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "modeled authority calculation requests must retain reason_codes",
      );
    }
    return request;
  }

  if (request.request_state === "MODELED_ONLY") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "live authority calculation requests must not use MODELED_ONLY request_state",
    );
  }
  requireNonNull("authority_operation_ref", request.authority_operation_ref);
  requireNonNull("request_envelope_ref", request.request_envelope_ref);
  requireNonNull("authority_interaction_ref", request.authority_interaction_ref);
  return request;
}

export function buildAuthorityCalculationRequest(
  input: AuthorityCalculationRequestBuildInput,
): AuthorityCalculationRequestRecord {
  const calculationType = assertCalculationType("calculation_type", input.calculation_type);
  const requestedAt = normalizeCalculationTimestamp("requested_at", input.requested_at);
  const liveAuthorityCallExecuted = input.live_authority_call_executed ?? true;
  const runtimeScope = normalizeCalculationRuntimeScope({
    calculation_type: calculationType,
    label: "runtime_scope",
    runtime_scope: input.runtime_scope ?? defaultRuntimeScope(calculationType),
  });
  const requestId =
    input.calculation_request_id ??
    defaultRequestId({
      calculation_type: calculationType,
      client_id: input.client_id,
      manifest_id: input.manifest_id,
      requested_at: requestedAt,
    });

  return normalizeAuthorityCalculationRequest({
    access_binding_hash: input.access_binding_hash ?? "hash.access-binding.authority-calculation",
    artifact_type: "AuthorityCalculationRequest",
    authority_interaction_ref: liveAuthorityCallExecuted
      ? input.authority_interaction_ref ?? `authority-interaction://${requestId}`
      : null,
    authority_operation_ref: liveAuthorityCallExecuted
      ? input.authority_operation_ref ?? `authority-operation://${requestId}`
      : null,
    authority_scope: input.authority_scope ?? "HMRC_ITSA",
    calculation_request_id: requestId,
    calculation_type: calculationType,
    client_id: input.client_id,
    live_authority_call_executed: liveAuthorityCallExecuted,
    manifest_id: input.manifest_id,
    operation_profile_ref:
      input.operation_profile_ref ?? `authority-operation-profile://calculation/${calculationType}`,
    provider_environment: input.provider_environment ?? "HMRC_SANDBOX",
    reason_codes: input.reason_codes ?? (liveAuthorityCallExecuted ? [] : ["AUTHORITY_CALCULATION_MODELED"]),
    request_envelope_ref: liveAuthorityCallExecuted
      ? input.request_envelope_ref ?? `authority-request-envelope://${requestId}`
      : null,
    request_state: input.request_state ?? (liveAuthorityCallExecuted ? "TRIGGERED" : "MODELED_ONLY"),
    requested_at: requestedAt,
    runtime_scope: runtimeScope,
    scope_execution_binding: normalizeCalculationScopeExecutionBinding({
      access_binding_hash: input.access_binding_hash ?? "hash.access-binding.authority-calculation",
      calculation_type: calculationType,
      partition_scope_refs: input.partition_scope_refs,
      runtime_scope: runtimeScope,
      scope_execution_binding: input.scope_execution_binding,
    }),
    target_obligation_ref: input.target_obligation_ref ?? null,
    tenant_id: input.tenant_id,
  });
}

export { calculationRequestRef as authorityCalculationRequestRef };

export function cloneAuthorityCalculationRequest(record: AuthorityCalculationRequestRecord) {
  return cloneCalculationRecord(record);
}

export function authorityCalculationRequestContentFingerprint(record: AuthorityCalculationRequestRecord) {
  return hashObject("AUTHORITY_CALCULATION_REQUEST_MODEL_V1", normalizeAuthorityCalculationRequest(record));
}

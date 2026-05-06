import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  AuthorityModelError,
  assertEnum,
  cloneRecord,
  hashObject,
  normalizeNullableTimestamp,
  normalizeSortedStringSet,
  normalizeTimestamp,
  refFromId,
  requireNonNull,
  requireString,
  stableEqual,
} from "./authority_common.ts";
import {
  type AuthorityScopeFamily,
  type AuthorityScopeToken,
  AUTHORITY_SCOPE_TOKENS,
  deriveAuthorityScopeFamily,
  normalizeAuthorityScopeSequence,
} from "./authority_operation.ts";

export const AUTHORITY_CALCULATION_TYPES = [
  "in-year",
  "intent-to-finalise",
  "intent-to-amend",
  "final-declaration",
] as const;

export const AUTHORITY_CALCULATION_VALIDATION_OUTCOMES = [
  "PASS",
  "PASS_WITH_NOTICE",
  "MANUAL_REVIEW",
  "OVERRIDABLE_BLOCK",
  "HARD_BLOCK",
] as const;

export type AuthorityCalculationType = (typeof AUTHORITY_CALCULATION_TYPES)[number];
export type AuthorityCalculationValidationOutcome =
  (typeof AUTHORITY_CALCULATION_VALIDATION_OUTCOMES)[number];

export type CalculationScopeExecutionBinding = {
  access_binding_hash: string;
  access_decision: "ALLOW" | "ALLOW_MASKED";
  binding_scope_class: "AUTHORITY_CALCULATION_REQUEST";
  executable_partition_scope_refs: string[];
  executable_scope: AuthorityScopeToken[];
  executable_scope_family: AuthorityScopeFamily;
  execution_mode_or_null: "COMPLIANCE" | "ANALYSIS" | null;
  masking_rules: string[];
  mutation_atomicity: "ATOMIC_REQUIRED" | "NARROWING_ALLOWED";
  reason_codes: string[];
  reduction_posture: "UNCHANGED" | "REDUCED_BY_AUTHORIZATION";
  requested_scope: AuthorityScopeToken[];
  requested_scope_family: AuthorityScopeFamily;
  required_approvals: string[];
  required_authn_level: "BASIC" | "MFA" | "STEP_UP" | null;
};

const CALCULATION_SCOPE_TOKEN_ORDER = new Map(
  AUTHORITY_SCOPE_TOKENS.map((token, index) => [token, index]),
);

function assertForwardTimestamp(input: {
  later: string | null;
  later_label: string;
  earlier: string | null;
  earlier_label: string;
}) {
  if (input.later === null || input.earlier === null) {
    return;
  }
  if (Date.parse(input.later) < Date.parse(input.earlier)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      `${input.later_label} cannot predate ${input.earlier_label}`,
    );
  }
}

export function normalizeCalculationTimestamp(label: string, value: unknown) {
  return normalizeTimestamp(label, value);
}

export function normalizeNullableCalculationTimestamp(label: string, value: unknown) {
  return normalizeNullableTimestamp(label, value);
}

export function assertCalculationType(label: string, value: unknown) {
  return assertEnum(label, value, AUTHORITY_CALCULATION_TYPES);
}

export function assertCalculationValidationOutcome(label: string, value: unknown) {
  return assertEnum(label, value, AUTHORITY_CALCULATION_VALIDATION_OUTCOMES);
}

export function normalizeCalculationReasonCodes(
  label: string,
  value: readonly string[] | null | undefined,
  options: { minItems?: number; maxItems?: number } = {},
) {
  return normalizeSortedStringSet(label, value ?? [], options);
}

export function calculationRequestRef(request: Pick<{ calculation_request_id: string }, "calculation_request_id"> | string) {
  return refFromId(
    "authority-calculation-request",
    typeof request === "string" ? request : request.calculation_request_id,
  );
}

export function authorityCalculationRef(result: Pick<{ calculation_id: string }, "calculation_id"> | string) {
  return refFromId("authority-calculation", typeof result === "string" ? result : result.calculation_id);
}

export function calculationBasisRef(basis: Pick<{ calculation_basis_id: string }, "calculation_basis_id"> | string) {
  return refFromId("calculation-basis", typeof basis === "string" ? basis : basis.calculation_basis_id);
}

export function calculationUserConfirmationRef(
  confirmation: Pick<{ user_confirmation_id: string }, "user_confirmation_id"> | string,
) {
  return refFromId(
    "calculation-user-confirmation",
    typeof confirmation === "string" ? confirmation : confirmation.user_confirmation_id,
  );
}

export function authorityCalculationReadinessContextRef(
  context:
    | Pick<{ calculation_readiness_context_id: string }, "calculation_readiness_context_id">
    | string,
) {
  return refFromId(
    "authority-calculation-readiness-context",
    typeof context === "string" ? context : context.calculation_readiness_context_id,
  );
}

export function defaultCalculationId(parts: readonly string[]) {
  return parts.map((part) => requireString("calculation_id_part", part)).join(".");
}

export function normalizeCalculationRuntimeScope(input: {
  calculation_type: AuthorityCalculationType;
  label: string;
  runtime_scope: readonly string[];
}) {
  const runtimeScope = normalizeAuthorityScopeSequence(input.label, input.runtime_scope);
  const runtime = new Set(runtimeScope);

  if (runtime.has("submit") || runtime.has("amendment_submit")) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "calculation runtime_scope must not include submit or amendment_submit",
    );
  }
  if (input.calculation_type === "intent-to-amend") {
    if (!runtime.has("amendment_intent") || runtime.has("prepare_submission")) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "intent-to-amend calculation requests require amendment_intent and must not carry prepare_submission",
      );
    }
    return runtimeScope;
  }
  if (!runtime.has("prepare_submission") || runtime.has("amendment_intent")) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "filing-preparation calculation requests require prepare_submission and must not carry amendment_intent",
    );
  }
  return runtimeScope;
}

function defaultScopeFamilyForCalculation(calculationType: AuthorityCalculationType) {
  return calculationType === "intent-to-amend" ? "AMENDMENT_INTENT" : "PREPARE_ONLY";
}

export function normalizeCalculationScopeExecutionBinding(input: {
  access_binding_hash: string;
  calculation_type: AuthorityCalculationType;
  partition_scope_refs?: readonly string[];
  runtime_scope: readonly string[];
  scope_execution_binding?: Partial<CalculationScopeExecutionBinding>;
}) {
  const requestedScope = normalizeCalculationRuntimeScope({
    calculation_type: input.calculation_type,
    label: "scope_execution_binding.requested_scope",
    runtime_scope: input.scope_execution_binding?.requested_scope ?? input.runtime_scope,
  });
  const executableScope = normalizeCalculationRuntimeScope({
    calculation_type: input.calculation_type,
    label: "scope_execution_binding.executable_scope",
    runtime_scope: input.scope_execution_binding?.executable_scope ?? input.runtime_scope,
  });
  const requestedScopeFamily = deriveAuthorityScopeFamily(requestedScope);
  const executableScopeFamily = deriveAuthorityScopeFamily(executableScope);
  const expectedFamily = defaultScopeFamilyForCalculation(input.calculation_type);
  if (requestedScopeFamily !== expectedFamily || executableScopeFamily !== expectedFamily) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      `calculation scope family must remain ${expectedFamily}`,
    );
  }
  const accessDecision = assertEnum(
    "scope_execution_binding.access_decision",
    input.scope_execution_binding?.access_decision ?? "ALLOW",
    ["ALLOW", "ALLOW_MASKED"] as const,
  );
  const maskingRules = normalizeCalculationReasonCodes(
    "scope_execution_binding.masking_rules",
    input.scope_execution_binding?.masking_rules ?? [],
  );
  if (accessDecision === "ALLOW" && maskingRules.length > 0) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "calculation scope masking_rules must be empty for ALLOW",
    );
  }
  if (accessDecision === "ALLOW_MASKED" && maskingRules.length === 0) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "calculation scope masking_rules must be non-empty for ALLOW_MASKED",
    );
  }
  if (!stableEqual(requestedScope, executableScope)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "calculation executable scope must not silently narrow requested scope",
    );
  }
  const binding: CalculationScopeExecutionBinding = {
    access_binding_hash: requireString(
      "scope_execution_binding.access_binding_hash",
      input.scope_execution_binding?.access_binding_hash ?? input.access_binding_hash,
    ),
    access_decision: accessDecision,
    binding_scope_class: assertEnum(
      "scope_execution_binding.binding_scope_class",
      input.scope_execution_binding?.binding_scope_class ?? "AUTHORITY_CALCULATION_REQUEST",
      ["AUTHORITY_CALCULATION_REQUEST"] as const,
    ),
    executable_partition_scope_refs: normalizeCalculationReasonCodes(
      "scope_execution_binding.executable_partition_scope_refs",
      input.scope_execution_binding?.executable_partition_scope_refs ?? input.partition_scope_refs ?? [],
    ),
    executable_scope: executableScope,
    executable_scope_family: assertEnum(
      "scope_execution_binding.executable_scope_family",
      input.scope_execution_binding?.executable_scope_family ?? executableScopeFamily,
      [expectedFamily] as const,
    ),
    execution_mode_or_null:
      input.scope_execution_binding?.execution_mode_or_null == null
        ? "COMPLIANCE"
        : assertEnum(
            "scope_execution_binding.execution_mode_or_null",
            input.scope_execution_binding.execution_mode_or_null,
            ["COMPLIANCE", "ANALYSIS"] as const,
          ),
    masking_rules: maskingRules,
    mutation_atomicity: assertEnum(
      "scope_execution_binding.mutation_atomicity",
      input.scope_execution_binding?.mutation_atomicity ?? "ATOMIC_REQUIRED",
      ["ATOMIC_REQUIRED"] as const,
    ),
    reason_codes: normalizeCalculationReasonCodes(
      "scope_execution_binding.reason_codes",
      input.scope_execution_binding?.reason_codes ?? ["AUTHORITY_CALCULATION_PREFLIGHT_ALLOWED"],
      { minItems: 1 },
    ),
    reduction_posture: assertEnum(
      "scope_execution_binding.reduction_posture",
      input.scope_execution_binding?.reduction_posture ?? "UNCHANGED",
      ["UNCHANGED"] as const,
    ),
    requested_scope: requestedScope,
    requested_scope_family: assertEnum(
      "scope_execution_binding.requested_scope_family",
      input.scope_execution_binding?.requested_scope_family ?? requestedScopeFamily,
      [expectedFamily] as const,
    ),
    required_approvals: normalizeCalculationReasonCodes(
      "scope_execution_binding.required_approvals",
      input.scope_execution_binding?.required_approvals ?? [],
    ),
    required_authn_level:
      input.scope_execution_binding?.required_authn_level == null
        ? null
        : assertEnum(
            "scope_execution_binding.required_authn_level",
            input.scope_execution_binding.required_authn_level,
            ["BASIC", "MFA", "STEP_UP"] as const,
          ),
  };
  if (binding.access_binding_hash !== input.access_binding_hash) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "calculation scope access_binding_hash must mirror the request access_binding_hash",
    );
  }
  return binding;
}

function assertExactDecimalSafeValue(value: unknown, path: string) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return;
  }
  if (typeof value === "number") {
    throw new AuthorityModelError(
      "AUTHORITY_FIELD_INVALID",
      `${path} must use exact decimal strings instead of JSON numbers`,
    );
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertExactDecimalSafeValue(entry, `${path}[${index}]`));
    return;
  }
  if (typeof value === "object") {
    if (Object.getPrototypeOf(value) !== Object.prototype) {
      throw new AuthorityModelError(
        "AUTHORITY_FIELD_INVALID",
        `${path} must be plain JSON when hashing calculation payloads`,
      );
    }
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      assertExactDecimalSafeValue(entry, `${path}.${key}`);
    }
    return;
  }
  throw new AuthorityModelError(
    "AUTHORITY_FIELD_INVALID",
    `${path} must be JSON-compatible for calculation hashing`,
  );
}

export function deriveExactDecimalCalculationHash(input: {
  money_profile: unknown;
  payload: unknown;
  profile?: string;
}) {
  assertExactDecimalSafeValue(input.money_profile, "money_profile");
  assertExactDecimalSafeValue(input.payload, "payload");
  return hashObject(input.profile ?? "AUTHORITY_CALCULATION_EXACT_DECIMAL_V1", {
    money_profile: input.money_profile,
    payload: input.payload,
  });
}

export function deriveCalculationHandshakeHash(input: {
  access_binding_hash: string;
  authority_scope: string;
  baseline_hash: string | null;
  calculation_basis_hash: string | null;
  calculation_hash: string | null;
  calculation_id: string;
  operation_profile_ref: string;
  provider_environment: string;
  user_confirmation_ref: string | null;
}) {
  return stableJsonHash([
    "CALCULATION_HANDSHAKE_V1",
    requireString("calculation_id", input.calculation_id),
    input.calculation_hash ?? "<NONE>",
    input.calculation_basis_hash ?? "<NONE>",
    input.user_confirmation_ref ?? "<NONE>",
    requireString("authority_scope", input.authority_scope),
    requireString("provider_environment", input.provider_environment),
    requireString("operation_profile_ref", input.operation_profile_ref),
    requireString("access_binding_hash", input.access_binding_hash),
    input.baseline_hash ?? "<NONE>",
  ]);
}

export function assertRetrievedBeforeSuperseded(input: {
  retrieved_at: string | null;
  superseded_at: string | null;
}) {
  assertForwardTimestamp({
    earlier: input.retrieved_at,
    earlier_label: "retrieved_at",
    later: input.superseded_at,
    later_label: "superseded_at",
  });
}

export function assertBasisChronology(input: {
  captured_at: string;
  confirmed_at: string | null;
  superseded_at: string | null;
}) {
  assertForwardTimestamp({
    earlier: input.captured_at,
    earlier_label: "captured_at",
    later: input.confirmed_at,
    later_label: "confirmed_at",
  });
  assertForwardTimestamp({
    earlier: input.confirmed_at ?? input.captured_at,
    earlier_label: input.confirmed_at === null ? "captured_at" : "confirmed_at",
    later: input.superseded_at,
    later_label: "superseded_at",
  });
}

export function requirePresentHash(label: string, value: string | null) {
  return requireNonNull(label, value);
}

export function sortedCalculationTokens(values: readonly string[]) {
  return [...values].sort(
    (left, right) =>
      (CALCULATION_SCOPE_TOKEN_ORDER.get(left as AuthorityScopeToken) ?? 99) -
      (CALCULATION_SCOPE_TOKEN_ORDER.get(right as AuthorityScopeToken) ?? 99),
  );
}

export function cloneCalculationRecord<T>(record: T): T {
  return cloneRecord(record);
}

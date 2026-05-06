import {
  type AuthorityLayerBoundaryContract,
  AuthorityModelError,
  assertEnum,
  buildAuthorityLayerBoundaryContract,
  cloneRecord,
  hashObject,
  normalizeAuthorityLayerBoundaryContract,
  normalizeNullableString,
  normalizeSortedStringSet,
  refFromId,
  requireString,
  stableEqual,
} from "./authority_common.ts";

export const AUTHORITY_OPERATION_FAMILIES = [
  "AUTH_READ_REFERENCE",
  "AUTH_READ_OBLIGATIONS",
  "AUTH_READ_CALCULATION",
  "AUTH_CREATE_OR_AMEND_DATA",
  "AUTH_DELETE_DATA",
  "AUTH_TRIGGER_CALCULATION",
  "AUTH_SUBMIT_FINAL_DECLARATION",
  "AUTH_SUBMIT_PERIODIC_UPDATE",
  "AUTH_SUBMIT_POST_FINALISATION_AMENDMENT",
  "AUTH_RECONCILE_STATUS",
] as const;

export const AUTHORITY_SCOPE_TOKENS = [
  "year_end",
  "quarterly_update",
  "estimate_only",
  "prepare_submission",
  "submit",
  "amendment_intent",
  "amendment_submit",
] as const;

export type AuthorityOperationFamily = (typeof AUTHORITY_OPERATION_FAMILIES)[number];
export type AuthorityScopeToken = (typeof AUTHORITY_SCOPE_TOKENS)[number];
export type AuthorityScopeFamily =
  | "READ_ONLY"
  | "PREPARE_ONLY"
  | "PREPARE_AND_SUBMIT"
  | "AMENDMENT_INTENT"
  | "AMENDMENT_SUBMIT";

export type AuthorityScopeExecutionBinding = {
  access_binding_hash: string;
  access_decision: "ALLOW" | "ALLOW_MASKED";
  binding_scope_class: "AUTHORITY_OPERATION";
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

export type AuthorityOperation = {
  access_binding_hash: string;
  acting_party_ref: string;
  artifact_type: "AuthorityOperation";
  attempt_lineage_manifest_id: string;
  authority_binding_ref: string;
  authority_layer_boundary: AuthorityLayerBoundaryContract;
  authority_link_ref: string;
  authority_name: string;
  authority_product_profile: string;
  authority_scope: string;
  basis_type: string | null;
  binding_lineage_ref: string;
  business_partitions: string[];
  client_id: string;
  contract: Record<string, unknown>;
  delegation_grant_ref: string | null;
  execution_basis_hash: string;
  manifest_hash: string;
  manifest_id: string;
  operation_family: AuthorityOperationFamily;
  operation_id: string;
  operation_profile_ref: string;
  period: string;
  policy_snapshot_hash: string;
  provider_api_version: string;
  provider_environment: string;
  requested_scope: AuthorityScopeToken[];
  runtime_scope: AuthorityScopeToken[];
  scope_execution_binding: AuthorityScopeExecutionBinding;
  subject_ref: string;
  target_obligation_ref: string | null;
  tenant_id: string;
  token_binding_ref: string;
};

export type AuthorityOperationBuildInput = Partial<
  Omit<
    AuthorityOperation,
    | "artifact_type"
    | "authority_layer_boundary"
    | "business_partitions"
    | "contract"
    | "requested_scope"
    | "runtime_scope"
    | "scope_execution_binding"
  >
> & {
  authority_layer_boundary?: AuthorityLayerBoundaryContract;
  business_partitions?: readonly string[];
  contract?: Record<string, unknown>;
  requested_scope: readonly string[];
  runtime_scope: readonly string[];
  scope_execution_binding?: Partial<AuthorityScopeExecutionBinding>;
  client_id: string;
  manifest_id: string;
  operation_family: AuthorityOperationFamily;
  operation_id: string;
  tenant_id: string;
};

const REPORTING_SCOPE_TOKENS = new Set<string>(["year_end", "quarterly_update", "estimate_only"]);
const LIVE_SCOPE_TOKENS = new Set<string>([
  "prepare_submission",
  "submit",
  "amendment_intent",
  "amendment_submit",
]);
const SCOPE_TOKEN_ORDER = new Map(AUTHORITY_SCOPE_TOKENS.map((token, index) => [token, index]));
const MUTATION_OR_CALCULATION_FAMILIES = new Set<AuthorityOperationFamily>([
  "AUTH_CREATE_OR_AMEND_DATA",
  "AUTH_DELETE_DATA",
  "AUTH_TRIGGER_CALCULATION",
  "AUTH_SUBMIT_FINAL_DECLARATION",
  "AUTH_SUBMIT_PERIODIC_UPDATE",
  "AUTH_SUBMIT_POST_FINALISATION_AMENDMENT",
]);
const READ_OR_RECONCILE_FAMILIES = new Set<AuthorityOperationFamily>([
  "AUTH_READ_REFERENCE",
  "AUTH_READ_OBLIGATIONS",
  "AUTH_READ_CALCULATION",
  "AUTH_TRIGGER_CALCULATION",
  "AUTH_RECONCILE_STATUS",
]);

function normalizeScopeToken(label: string, value: unknown) {
  return assertEnum(label, value, AUTHORITY_SCOPE_TOKENS);
}

export function normalizeAuthorityScopeSequence(
  label: string,
  values: readonly unknown[],
): AuthorityScopeToken[] {
  if (!Array.isArray(values) || values.length === 0) {
    throw new AuthorityModelError(
      "AUTHORITY_FIELD_INVALID",
      `${label} must contain a canonical reporting scope token`,
    );
  }
  const normalized = values.map((value) => normalizeScopeToken(label, value));
  if (new Set(normalized).size !== normalized.length) {
    throw new AuthorityModelError("AUTHORITY_FIELD_INVALID", `${label} must not contain duplicates`);
  }
  const reportingTokens = normalized.filter((token) => REPORTING_SCOPE_TOKENS.has(token));
  if (reportingTokens.length !== 1) {
    throw new AuthorityModelError(
      "AUTHORITY_FIELD_INVALID",
      `${label} must contain exactly one reporting scope token`,
    );
  }
  if (!REPORTING_SCOPE_TOKENS.has(normalized[0])) {
    throw new AuthorityModelError(
      "AUTHORITY_FIELD_INVALID",
      `${label} must keep the reporting scope token first`,
    );
  }
  const expected = [...normalized].sort(
    (left, right) => (SCOPE_TOKEN_ORDER.get(left) ?? 99) - (SCOPE_TOKEN_ORDER.get(right) ?? 99),
  );
  if (!stableEqual(normalized, expected)) {
    throw new AuthorityModelError(
      "AUTHORITY_FIELD_INVALID",
      `${label} must use canonical frozen scope-token order ${expected.join(",")}`,
    );
  }
  const actionTokens = normalized.filter((token) => !REPORTING_SCOPE_TOKENS.has(token));
  if (normalized[0] === "estimate_only" && actionTokens.length > 0) {
    throw new AuthorityModelError(
      "AUTHORITY_FIELD_INVALID",
      `${label} must not mix estimate_only with live action tokens`,
    );
  }
  if (actionTokens.includes("submit") && !actionTokens.includes("prepare_submission")) {
    throw new AuthorityModelError(
      "AUTHORITY_FIELD_INVALID",
      `${label} must include prepare_submission whenever submit is present`,
    );
  }
  if (actionTokens.includes("amendment_intent")) {
    const extras = actionTokens.filter((token) => token !== "amendment_intent");
    if (normalized[0] !== "year_end" || extras.length > 0) {
      throw new AuthorityModelError(
        "AUTHORITY_FIELD_INVALID",
        `${label} must anchor amendment_intent to year_end and no other action tokens`,
      );
    }
  }
  if (actionTokens.includes("amendment_submit")) {
    const extras = actionTokens.filter((token) => token !== "amendment_submit");
    if (normalized[0] !== "year_end" || extras.length > 0) {
      throw new AuthorityModelError(
        "AUTHORITY_FIELD_INVALID",
        `${label} must anchor amendment_submit to year_end and no other action tokens`,
      );
    }
  }
  return normalized;
}

export function deriveAuthorityScopeFamily(scope: readonly string[]): AuthorityScopeFamily {
  const normalized = normalizeAuthorityScopeSequence("scope", scope);
  const actionTokens = normalized.filter((token) => !REPORTING_SCOPE_TOKENS.has(token));
  if (actionTokens.length === 0) {
    return "READ_ONLY";
  }
  if (stableEqual(actionTokens, ["prepare_submission"])) {
    return "PREPARE_ONLY";
  }
  if (stableEqual(actionTokens, ["prepare_submission", "submit"])) {
    return "PREPARE_AND_SUBMIT";
  }
  if (stableEqual(actionTokens, ["amendment_intent"])) {
    return "AMENDMENT_INTENT";
  }
  if (stableEqual(actionTokens, ["amendment_submit"])) {
    return "AMENDMENT_SUBMIT";
  }
  throw new AuthorityModelError(
    "AUTHORITY_FIELD_INVALID",
    `scope must resolve to one explicit scope family, got ${normalized.join(",")}`,
  );
}

function mutationAtomicity(scope: readonly string[]) {
  return scope.some((token) => LIVE_SCOPE_TOKENS.has(token)) ? "ATOMIC_REQUIRED" : "NARROWING_ALLOWED";
}

function ensureSubset(label: string, subset: readonly string[], superset: readonly string[]) {
  const supersetSet = new Set(superset);
  const missing = subset.filter((token) => !supersetSet.has(token));
  if (missing.length > 0) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      `${label} must stay within requested_scope; missing ${missing.join(",")}`,
    );
  }
}

function normalizeScopeExecutionBinding(
  input: Partial<AuthorityScopeExecutionBinding> | undefined,
  operation: Pick<AuthorityOperation, "access_binding_hash" | "business_partitions" | "requested_scope" | "runtime_scope">,
): AuthorityScopeExecutionBinding {
  const requestedScope = normalizeAuthorityScopeSequence(
    "scope_execution_binding.requested_scope",
    input?.requested_scope ?? operation.requested_scope,
  );
  const executableScope = normalizeAuthorityScopeSequence(
    "scope_execution_binding.executable_scope",
    input?.executable_scope ?? operation.runtime_scope,
  );
  const requestedScopeFamily = deriveAuthorityScopeFamily(requestedScope);
  const executableScopeFamily = deriveAuthorityScopeFamily(executableScope);
  const executablePartitionScopeRefs = normalizeSortedStringSet(
    "scope_execution_binding.executable_partition_scope_refs",
    input?.executable_partition_scope_refs ?? operation.business_partitions,
  );
  const binding: AuthorityScopeExecutionBinding = {
    access_binding_hash: requireString(
      "scope_execution_binding.access_binding_hash",
      input?.access_binding_hash ?? operation.access_binding_hash,
    ),
    access_decision: assertEnum("scope_execution_binding.access_decision", input?.access_decision ?? "ALLOW", [
      "ALLOW",
      "ALLOW_MASKED",
    ] as const),
    binding_scope_class: assertEnum(
      "scope_execution_binding.binding_scope_class",
      input?.binding_scope_class ?? "AUTHORITY_OPERATION",
      ["AUTHORITY_OPERATION"] as const,
    ),
    executable_partition_scope_refs: executablePartitionScopeRefs,
    executable_scope: executableScope,
    executable_scope_family: assertEnum(
      "scope_execution_binding.executable_scope_family",
      input?.executable_scope_family ?? executableScopeFamily,
      [executableScopeFamily] as const,
    ),
    execution_mode_or_null: input?.execution_mode_or_null == null
      ? "COMPLIANCE"
      : assertEnum("scope_execution_binding.execution_mode_or_null", input.execution_mode_or_null, [
          "COMPLIANCE",
          "ANALYSIS",
        ] as const),
    masking_rules: normalizeSortedStringSet("scope_execution_binding.masking_rules", input?.masking_rules ?? []),
    mutation_atomicity: assertEnum(
      "scope_execution_binding.mutation_atomicity",
      input?.mutation_atomicity ?? mutationAtomicity(requestedScope),
      [mutationAtomicity(requestedScope)] as const,
    ),
    reason_codes: normalizeSortedStringSet(
      "scope_execution_binding.reason_codes",
      input?.reason_codes ?? ["AUTHORITY_PREFLIGHT_ALLOWED"],
      { minItems: 1 },
    ),
    reduction_posture: assertEnum(
      "scope_execution_binding.reduction_posture",
      input?.reduction_posture ?? (stableEqual(requestedScope, executableScope) ? "UNCHANGED" : "REDUCED_BY_AUTHORIZATION"),
      [stableEqual(requestedScope, executableScope) ? "UNCHANGED" : "REDUCED_BY_AUTHORIZATION"] as const,
    ),
    requested_scope: requestedScope,
    requested_scope_family: assertEnum(
      "scope_execution_binding.requested_scope_family",
      input?.requested_scope_family ?? requestedScopeFamily,
      [requestedScopeFamily] as const,
    ),
    required_approvals: normalizeSortedStringSet(
      "scope_execution_binding.required_approvals",
      input?.required_approvals ?? [],
    ),
    required_authn_level: input?.required_authn_level == null
      ? null
      : assertEnum("scope_execution_binding.required_authn_level", input.required_authn_level, [
          "BASIC",
          "MFA",
          "STEP_UP",
        ] as const),
  };

  ensureSubset("scope_execution_binding.executable_scope", binding.executable_scope, binding.requested_scope);
  if (binding.mutation_atomicity === "ATOMIC_REQUIRED" && !stableEqual(binding.requested_scope, binding.executable_scope)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "atomic live-capable authority operation scope must not be narrowed silently",
    );
  }
  if (binding.access_decision === "ALLOW" && binding.masking_rules.length > 0) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "scope_execution_binding.masking_rules must be empty for ALLOW",
    );
  }
  if (binding.access_decision === "ALLOW_MASKED" && binding.masking_rules.length === 0) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "scope_execution_binding.masking_rules must be non-empty for ALLOW_MASKED",
    );
  }
  if (!stableEqual(binding.requested_scope, operation.requested_scope)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "scope_execution_binding.requested_scope must mirror requested_scope",
    );
  }
  if (!stableEqual(binding.executable_scope, operation.runtime_scope)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "scope_execution_binding.executable_scope must mirror runtime_scope",
    );
  }
  if (binding.access_binding_hash !== operation.access_binding_hash) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "scope_execution_binding.access_binding_hash must mirror access_binding_hash",
    );
  }
  if (!stableEqual(binding.executable_partition_scope_refs, operation.business_partitions)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "scope_execution_binding.executable_partition_scope_refs must mirror business_partitions",
    );
  }
  return binding;
}

function validateOperationFamilyRules(operation: AuthorityOperation) {
  const runtime = new Set(operation.runtime_scope);
  if (MUTATION_OR_CALCULATION_FAMILIES.has(operation.operation_family) && operation.business_partitions.length === 0) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "mutation-capable, calculation, and submit AuthorityOperations require business_partitions",
    );
  }
  if (
    READ_OR_RECONCILE_FAMILIES.has(operation.operation_family) &&
    (runtime.has("submit") || runtime.has("amendment_submit"))
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "read, calculation, and reconciliation AuthorityOperations must not carry submit tokens",
    );
  }
  if (operation.operation_family === "AUTH_SUBMIT_PERIODIC_UPDATE") {
    if (!runtime.has("quarterly_update") || !runtime.has("prepare_submission") || !runtime.has("submit")) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "AUTH_SUBMIT_PERIODIC_UPDATE requires quarterly_update, prepare_submission, and submit runtime scope",
      );
    }
    if (operation.target_obligation_ref === null) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "AUTH_SUBMIT_PERIODIC_UPDATE requires target_obligation_ref",
      );
    }
  }
  if (operation.operation_family === "AUTH_SUBMIT_FINAL_DECLARATION") {
    if (!runtime.has("year_end") || !runtime.has("prepare_submission") || !runtime.has("submit")) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "AUTH_SUBMIT_FINAL_DECLARATION requires year_end, prepare_submission, and submit runtime scope",
      );
    }
    if (operation.basis_type === null) {
      throw new AuthorityModelError("AUTHORITY_CONTRACT_INVALID", "AUTH_SUBMIT_FINAL_DECLARATION requires basis_type");
    }
  }
  if (operation.operation_family === "AUTH_SUBMIT_POST_FINALISATION_AMENDMENT") {
    if (!runtime.has("year_end") || !runtime.has("amendment_submit")) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "AUTH_SUBMIT_POST_FINALISATION_AMENDMENT requires year_end and amendment_submit runtime scope",
      );
    }
    if (operation.basis_type === null) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "AUTH_SUBMIT_POST_FINALISATION_AMENDMENT requires basis_type",
      );
    }
  }
  if (operation.operation_family === "AUTH_TRIGGER_CALCULATION") {
    if (!runtime.has("prepare_submission") && !runtime.has("amendment_intent")) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "AUTH_TRIGGER_CALCULATION requires prepare_submission or amendment_intent runtime scope",
      );
    }
    if (operation.basis_type === null) {
      throw new AuthorityModelError("AUTHORITY_CONTRACT_INVALID", "AUTH_TRIGGER_CALCULATION requires basis_type");
    }
    if (runtime.has("submit") || runtime.has("amendment_submit")) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "AUTH_TRIGGER_CALCULATION must not carry submit runtime scope",
      );
    }
  }
}

function validateActingParty(operation: AuthorityOperation) {
  if (operation.acting_party_ref !== operation.subject_ref && operation.delegation_grant_ref === null) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "delegation_grant_ref must be populated when acting_party_ref differs from subject_ref",
    );
  }
  if (operation.acting_party_ref === operation.subject_ref && operation.delegation_grant_ref !== null) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "self-acting authority operations must not retain delegation_grant_ref",
    );
  }
  if (
    operation.acting_party_ref !== operation.subject_ref &&
    !["SATISFIED", "LIMITED"].includes(operation.authority_layer_boundary.client_delegation_state)
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "delegated authority operations require live-usable client delegation posture",
    );
  }
  if (
    operation.acting_party_ref === operation.subject_ref &&
    operation.authority_layer_boundary.client_delegation_state !== "NOT_REQUIRED"
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "self-acting authority operations require client_delegation_state NOT_REQUIRED",
    );
  }
}

export function normalizeAuthorityOperation(input: AuthorityOperation): AuthorityOperation {
  const requested_scope = normalizeAuthorityScopeSequence("requested_scope", input.requested_scope);
  const runtime_scope = normalizeAuthorityScopeSequence("runtime_scope", input.runtime_scope);
  ensureSubset("runtime_scope", runtime_scope, requested_scope);
  const operation: AuthorityOperation = {
    access_binding_hash: requireString("access_binding_hash", input.access_binding_hash),
    acting_party_ref: requireString("acting_party_ref", input.acting_party_ref),
    artifact_type: "AuthorityOperation",
    attempt_lineage_manifest_id: requireString(
      "attempt_lineage_manifest_id",
      input.attempt_lineage_manifest_id,
    ),
    authority_binding_ref: requireString("authority_binding_ref", input.authority_binding_ref),
    authority_layer_boundary: normalizeAuthorityLayerBoundaryContract(input.authority_layer_boundary, {
      expected_binding_scope_class: "AUTHORITY_OPERATION",
      expected_integration_capability: "AUTHORITY_INTEGRATED",
    }),
    authority_link_ref: requireString("authority_link_ref", input.authority_link_ref),
    authority_name: requireString("authority_name", input.authority_name),
    authority_product_profile: requireString("authority_product_profile", input.authority_product_profile),
    authority_scope: requireString("authority_scope", input.authority_scope),
    basis_type: normalizeNullableString("basis_type", input.basis_type),
    binding_lineage_ref: requireString("binding_lineage_ref", input.binding_lineage_ref),
    business_partitions: normalizeSortedStringSet("business_partitions", input.business_partitions),
    client_id: requireString("client_id", input.client_id),
    contract: cloneRecord(input.contract ?? {}),
    delegation_grant_ref: normalizeNullableString("delegation_grant_ref", input.delegation_grant_ref),
    execution_basis_hash: requireString("execution_basis_hash", input.execution_basis_hash),
    manifest_hash: requireString("manifest_hash", input.manifest_hash),
    manifest_id: requireString("manifest_id", input.manifest_id),
    operation_family: assertEnum("operation_family", input.operation_family, AUTHORITY_OPERATION_FAMILIES),
    operation_id: requireString("operation_id", input.operation_id),
    operation_profile_ref: requireString("operation_profile_ref", input.operation_profile_ref),
    period: requireString("period", input.period),
    policy_snapshot_hash: requireString("policy_snapshot_hash", input.policy_snapshot_hash),
    provider_api_version: requireString("provider_api_version", input.provider_api_version),
    provider_environment: requireString("provider_environment", input.provider_environment),
    requested_scope,
    runtime_scope,
    scope_execution_binding: input.scope_execution_binding,
    subject_ref: requireString("subject_ref", input.subject_ref),
    target_obligation_ref: normalizeNullableString("target_obligation_ref", input.target_obligation_ref),
    tenant_id: requireString("tenant_id", input.tenant_id),
    token_binding_ref: requireString("token_binding_ref", input.token_binding_ref),
  } as AuthorityOperation;
  operation.scope_execution_binding = normalizeScopeExecutionBinding(input.scope_execution_binding, operation);
  validateActingParty(operation);
  validateOperationFamilyRules(operation);
  return operation;
}

export function buildAuthorityOperation(input: AuthorityOperationBuildInput): AuthorityOperation {
  const subjectRef = input.subject_ref ?? `client://${input.client_id}`;
  const actingPartyRef = input.acting_party_ref ?? subjectRef;
  const delegated = actingPartyRef !== subjectRef;
  return normalizeAuthorityOperation({
    access_binding_hash: input.access_binding_hash ?? "hash.access-binding.authority-operation",
    acting_party_ref: actingPartyRef,
    artifact_type: "AuthorityOperation",
    attempt_lineage_manifest_id: input.attempt_lineage_manifest_id ?? input.manifest_id,
    authority_binding_ref: input.authority_binding_ref ?? `authority-binding://${input.operation_id}`,
    authority_layer_boundary:
      input.authority_layer_boundary ??
      buildAuthorityLayerBoundaryContract({
        binding_scope_class: "AUTHORITY_OPERATION",
        client_delegation_state: delegated ? "SATISFIED" : "NOT_REQUIRED",
      }),
    authority_link_ref: input.authority_link_ref ?? `authority-link://${input.client_id}`,
    authority_name: input.authority_name ?? "HMRC",
    authority_product_profile: input.authority_product_profile ?? "HMRC_ITSA",
    authority_scope: input.authority_scope ?? "HMRC_ITSA",
    basis_type: input.basis_type ?? null,
    binding_lineage_ref: input.binding_lineage_ref ?? `authority-binding-lineage://${input.client_id}`,
    business_partitions: [...(input.business_partitions ?? [])],
    client_id: input.client_id,
    contract: input.contract ?? {},
    delegation_grant_ref: input.delegation_grant_ref ?? null,
    execution_basis_hash: input.execution_basis_hash ?? "hash.execution-basis.authority-operation",
    manifest_hash: input.manifest_hash ?? "hash.manifest.authority-operation",
    manifest_id: input.manifest_id,
    operation_family: input.operation_family,
    operation_id: input.operation_id,
    operation_profile_ref: input.operation_profile_ref ?? `authority-operation-profile://${input.operation_family}`,
    period: input.period ?? "UNSPECIFIED_PERIOD",
    policy_snapshot_hash: input.policy_snapshot_hash ?? "hash.policy-snapshot.authority-operation",
    provider_api_version: input.provider_api_version ?? "v1",
    provider_environment: input.provider_environment ?? "SANDBOX",
    requested_scope: normalizeAuthorityScopeSequence("requested_scope", input.requested_scope),
    runtime_scope: normalizeAuthorityScopeSequence("runtime_scope", input.runtime_scope),
    scope_execution_binding: input.scope_execution_binding as AuthorityScopeExecutionBinding,
    subject_ref: subjectRef,
    target_obligation_ref: input.target_obligation_ref ?? null,
    tenant_id: input.tenant_id,
    token_binding_ref: input.token_binding_ref ?? `authority-token-binding://${input.client_id}`,
  });
}

export function authorityOperationRef(operation: Pick<AuthorityOperation, "operation_id"> | string) {
  return refFromId("authority-operation", typeof operation === "string" ? operation : operation.operation_id);
}

export function cloneAuthorityOperation(operation: AuthorityOperation) {
  return cloneRecord(operation);
}

export function authorityOperationContentFingerprint(operation: AuthorityOperation) {
  return hashObject("AUTHORITY_OPERATION_MODEL_V1", normalizeAuthorityOperation(operation));
}

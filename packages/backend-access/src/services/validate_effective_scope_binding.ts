import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { AuthorizationDecisionRecord } from "../models/authorization_decision.ts";
import type {
  ScopeExecutionBindingRecord,
} from "../models/scope_execution_binding.ts";
import {
  deriveScopeFamily,
  expectedScopeMutationAtomicity,
  isStringSubset,
  LIVE_MUTATION_SCOPE_TOKENS,
  normalizeScopeSequence,
  normalizeStringSet,
  requireTrimmedString,
  type ScopeExecutionBindingScopeFamily,
  type ScopeMutationAtomicity,
} from "./principal_context_normalizer.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const runtimeScopeFailureCodesPath = path.join(
  repoRoot,
  "config",
  "access",
  "runtime_scope_failure_codes.json",
);

export type RuntimeScopeFailureCode =
  | "RUNTIME_SCOPE_BINDING_NOT_FOUND"
  | "RUNTIME_SCOPE_DECISION_NOT_EXECUTABLE"
  | "RUNTIME_SCOPE_EMPTY"
  | "RUNTIME_SCOPE_NOT_SUBSET_OF_REQUEST"
  | "RUNTIME_SCOPE_EXCEEDS_EFFECTIVE_SCOPE"
  | "RUNTIME_SCOPE_INVALID_SCOPE_GRAMMAR"
  | "RUNTIME_SCOPE_ANALYSIS_REQUIRES_READ_ONLY"
  | "RUNTIME_SCOPE_MASKING_POSTURE_INVALID"
  | "RUNTIME_SCOPE_ATOMIC_REDUCTION_FORBIDDEN"
  | "RUNTIME_SCOPE_PARTITION_WIDENED"
  | "RUNTIME_SCOPE_ACCESS_BINDING_STALE"
  | "RUNTIME_SCOPE_SERVICE_PRINCIPAL_REUSE_FOR_CLIENT_ACTING";

type RuntimeScopeFailureCodeCatalog = {
  basis_statement: string;
  contract_version: "RUNTIME_SCOPE_FAILURE_CODES_V1";
  failure_codes: Array<{
    code: RuntimeScopeFailureCode;
    description: string;
    invariant_class: "SCOPE_BINDING";
    source_refs: string[];
  }>;
};

export type ValidateEffectiveScopeBindingInput = {
  access_decision: Pick<
    AuthorizationDecisionRecord,
    "decision" | "effective_partition_scope_refs" | "effective_scope" | "masking_rules"
  >;
  execution_mode_or_null: ScopeExecutionBindingRecord["execution_mode_or_null"];
  requested_partition_scope_refs: string[];
  requested_scope: string[];
  runtime_partition_scope_refs: string[];
  runtime_scope: string[];
};

export type ValidEffectiveScopeBindingResult = {
  executable_partition_scope_refs: string[];
  executable_scope_family: ScopeExecutionBindingScopeFamily;
  mutation_atomicity: ScopeMutationAtomicity;
  reason_code: null;
  reduction_posture: ScopeExecutionBindingRecord["reduction_posture"];
  requested_scope: string[];
  requested_scope_family: ScopeExecutionBindingScopeFamily;
  runtime_scope: string[];
  status: "VALID";
};

export type InvalidEffectiveScopeBindingResult = {
  detail: string;
  reason_code: RuntimeScopeFailureCode;
  requested_scope: string[];
  runtime_scope: string[];
  status: "INVALID";
};

export type ValidateEffectiveScopeBindingResult =
  | InvalidEffectiveScopeBindingResult
  | ValidEffectiveScopeBindingResult;

let cachedCatalog: Promise<RuntimeScopeFailureCodeCatalog> | null = null;

async function loadRuntimeScopeFailureCodeCatalog() {
  if (!cachedCatalog) {
    cachedCatalog = readFile(runtimeScopeFailureCodesPath, "utf8").then((raw) => {
      const parsed = JSON.parse(raw) as RuntimeScopeFailureCodeCatalog;
      if (parsed.contract_version !== "RUNTIME_SCOPE_FAILURE_CODES_V1") {
        throw new Error("Unexpected runtime scope failure code catalog version.");
      }
      return parsed;
    });
  }
  return cachedCatalog;
}

async function assertSupportedFailureCode(code: RuntimeScopeFailureCode) {
  const catalog = await loadRuntimeScopeFailureCodeCatalog();
  if (!catalog.failure_codes.some((entry) => entry.code === code)) {
    throw new Error(`Unsupported runtime scope failure code ${code}`);
  }
}

async function invalidResult(
  code: RuntimeScopeFailureCode,
  detail: string,
  requested_scope: string[],
  runtime_scope: string[],
): Promise<InvalidEffectiveScopeBindingResult> {
  await assertSupportedFailureCode(code);
  return {
    status: "INVALID",
    reason_code: code,
    detail,
    requested_scope,
    runtime_scope,
  };
}

function normalizeMode(
  value: ScopeExecutionBindingRecord["execution_mode_or_null"],
) {
  if (value === null) {
    return null;
  }
  const normalized = requireTrimmedString("execution_mode_or_null", value);
  if (normalized !== "COMPLIANCE" && normalized !== "ANALYSIS") {
    throw new Error("execution_mode_or_null must be COMPLIANCE, ANALYSIS, or null");
  }
  return normalized;
}

export async function validateEffectiveScopeBinding(
  input: ValidateEffectiveScopeBindingInput,
): Promise<ValidateEffectiveScopeBindingResult> {
  let requested_scope: string[];
  let runtime_scope: string[];
  let requested_partition_scope_refs: string[];
  let runtime_partition_scope_refs: string[];

  try {
    requested_scope = normalizeScopeSequence("requested_scope", input.requested_scope);
    runtime_scope = normalizeScopeSequence("runtime_scope", input.runtime_scope, {
      allowEmpty: true,
    });
    requested_partition_scope_refs = normalizeStringSet(
      "requested_partition_scope_refs",
      input.requested_partition_scope_refs ?? [],
    );
    runtime_partition_scope_refs = normalizeStringSet(
      "runtime_partition_scope_refs",
      input.runtime_partition_scope_refs ?? [],
    );
  } catch (error) {
    return invalidResult(
      "RUNTIME_SCOPE_INVALID_SCOPE_GRAMMAR",
      error instanceof Error ? error.message : "invalid runtime scope grammar",
      input.requested_scope ?? [],
      input.runtime_scope ?? [],
    );
  }

  const execution_mode_or_null = normalizeMode(input.execution_mode_or_null);
  if (
    input.access_decision.decision !== "ALLOW" &&
    input.access_decision.decision !== "ALLOW_MASKED"
  ) {
    return invalidResult(
      "RUNTIME_SCOPE_DECISION_NOT_EXECUTABLE",
      "runtime execution requires an ALLOW or ALLOW_MASKED authorization decision",
      requested_scope,
      runtime_scope,
    );
  }

  if (
    (input.access_decision.decision === "ALLOW" &&
      (input.access_decision.masking_rules?.length ?? 0) > 0) ||
    (input.access_decision.decision === "ALLOW_MASKED" &&
      (input.access_decision.masking_rules?.length ?? 0) === 0)
  ) {
    return invalidResult(
      "RUNTIME_SCOPE_MASKING_POSTURE_INVALID",
      "masking rules must match the executable access decision posture",
      requested_scope,
      runtime_scope,
    );
  }

  if (runtime_scope.length === 0) {
    return invalidResult(
      "RUNTIME_SCOPE_EMPTY",
      "runtime_scope must not be empty",
      requested_scope,
      runtime_scope,
    );
  }

  if (!isStringSubset(runtime_scope, requested_scope)) {
    return invalidResult(
      "RUNTIME_SCOPE_NOT_SUBSET_OF_REQUEST",
      "runtime_scope must stay within requested_scope",
      requested_scope,
      runtime_scope,
    );
  }

  if (!isStringSubset(runtime_scope, input.access_decision.effective_scope)) {
    return invalidResult(
      "RUNTIME_SCOPE_EXCEEDS_EFFECTIVE_SCOPE",
      "runtime_scope must stay within access_decision.effective_scope",
      requested_scope,
      runtime_scope,
    );
  }

  if (
    !isStringSubset(
      runtime_partition_scope_refs,
      input.access_decision.effective_partition_scope_refs,
    ) ||
    !isStringSubset(runtime_partition_scope_refs, requested_partition_scope_refs)
  ) {
    return invalidResult(
      "RUNTIME_SCOPE_PARTITION_WIDENED",
      "runtime partition scope refs must stay within both requested and authorized partition coverage",
      requested_scope,
      runtime_scope,
    );
  }

  const requested_scope_family = deriveScopeFamily(requested_scope);
  const executable_scope_family = deriveScopeFamily(runtime_scope);
  if (requested_scope_family === null || executable_scope_family === null) {
    return invalidResult(
      "RUNTIME_SCOPE_INVALID_SCOPE_GRAMMAR",
      "requested_scope and runtime_scope must resolve to explicit scope families",
      requested_scope,
      runtime_scope,
    );
  }

  const mutation_atomicity = expectedScopeMutationAtomicity(requested_scope);
  if (mutation_atomicity === null) {
    return invalidResult(
      "RUNTIME_SCOPE_INVALID_SCOPE_GRAMMAR",
      "requested_scope must publish a supported mutation atomicity",
      requested_scope,
      runtime_scope,
    );
  }

  if (execution_mode_or_null === "ANALYSIS") {
    if (
      requested_scope.some((token) => LIVE_MUTATION_SCOPE_TOKENS.has(token)) ||
      runtime_scope.some((token) => LIVE_MUTATION_SCOPE_TOKENS.has(token)) ||
      requested_scope_family !== "READ_ONLY" ||
      executable_scope_family !== "READ_ONLY"
    ) {
      return invalidResult(
        "RUNTIME_SCOPE_ANALYSIS_REQUIRES_READ_ONLY",
        "analysis-mode execution must remain READ_ONLY and may not carry live-capable scope tokens",
        requested_scope,
        runtime_scope,
      );
    }
  }

  if (
    mutation_atomicity === "ATOMIC_REQUIRED" &&
    requested_scope.join("|") !== runtime_scope.join("|")
  ) {
    return invalidResult(
      "RUNTIME_SCOPE_ATOMIC_REDUCTION_FORBIDDEN",
      "live-capable atomic requests may not silently narrow runtime_scope",
      requested_scope,
      runtime_scope,
    );
  }

  return {
    status: "VALID",
    reason_code: null,
    requested_scope,
    runtime_scope,
    requested_scope_family,
    executable_scope_family,
    executable_partition_scope_refs: runtime_partition_scope_refs,
    reduction_posture:
      requested_scope.join("|") === runtime_scope.join("|")
        ? "UNCHANGED"
        : "REDUCED_BY_AUTHORIZATION",
    mutation_atomicity,
  };
}

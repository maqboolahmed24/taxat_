import {
  isStringSubset,
  normalizeScopeSequence,
  type CanonicalScopeToken,
} from "../../../backend-access/src/services/principal_context_normalizer.ts";
import type { RunManifestScopeExecutionBinding } from "../models/run_manifest.ts";

export type RuntimeScopeBindingValidation = {
  reason_codes: string[];
  valid: boolean;
};

export class RuntimeScopeBindingValidationError extends Error {
  readonly reason_codes: string[];

  constructor(reasonCodes: string[]) {
    super(`RUNTIME_SCOPE_BINDING_INVALID: ${reasonCodes.join(", ")}`);
    this.name = "RuntimeScopeBindingValidationError";
    this.reason_codes = [...reasonCodes];
  }
}

export function validateRuntimeScopeBinding(input: {
  runtime_scope: CanonicalScopeToken[];
  scope_execution_binding: RunManifestScopeExecutionBinding;
}): RuntimeScopeBindingValidation {
  const reasonCodes: string[] = [];
  const runtimeScope = normalizeScopeSequence("runtime_scope", input.runtime_scope);
  if (!isStringSubset(runtimeScope, input.scope_execution_binding.executable_scope)) {
    reasonCodes.push("RUNTIME_SCOPE_EXCEEDS_EXECUTABLE_SCOPE");
  }
  if (
    input.scope_execution_binding.access_decision !== "ALLOW" &&
    input.scope_execution_binding.access_decision !== "ALLOW_MASKED"
  ) {
    reasonCodes.push("RUNTIME_SCOPE_NOT_RUNNABLE_ACCESS_DECISION");
  }
  if (
    input.scope_execution_binding.access_decision === "ALLOW_MASKED" &&
    input.scope_execution_binding.masking_rules.length === 0
  ) {
    reasonCodes.push("MASKED_RUNTIME_SCOPE_REQUIRES_MASKING_RULES");
  }
  return {
    valid: reasonCodes.length === 0,
    reason_codes: reasonCodes,
  };
}

export function assertRuntimeScopeBinding(input: {
  runtime_scope: CanonicalScopeToken[];
  scope_execution_binding: RunManifestScopeExecutionBinding;
}) {
  const validation = validateRuntimeScopeBinding(input);
  if (!validation.valid) {
    throw new RuntimeScopeBindingValidationError(validation.reason_codes);
  }
  return normalizeScopeSequence("runtime_scope", input.runtime_scope);
}

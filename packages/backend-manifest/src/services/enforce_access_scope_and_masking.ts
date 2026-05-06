import { normalizeStringSet, type CanonicalScopeToken } from "../../../backend-access/src/services/principal_context_normalizer.ts";
import type { RunManifestScopeExecutionBinding } from "../models/run_manifest.ts";
import { assertRuntimeScopeBinding } from "./validate_runtime_scope_binding.ts";

export type EnforcedAccessScope = {
  access_binding_hash: string;
  access_decision: RunManifestScopeExecutionBinding["access_decision"];
  masking_rules: string[];
  runtime_scope: CanonicalScopeToken[];
};

export function enforceAccessScopeAndMasking(input: {
  runtime_scope: CanonicalScopeToken[];
  scope_execution_binding: RunManifestScopeExecutionBinding;
}): EnforcedAccessScope {
  const runtimeScope = assertRuntimeScopeBinding(input);
  return {
    runtime_scope: runtimeScope,
    access_binding_hash: input.scope_execution_binding.access_binding_hash,
    access_decision: input.scope_execution_binding.access_decision,
    masking_rules: normalizeStringSet(
      "scope_execution_binding.masking_rules",
      input.scope_execution_binding.masking_rules,
    ),
  };
}

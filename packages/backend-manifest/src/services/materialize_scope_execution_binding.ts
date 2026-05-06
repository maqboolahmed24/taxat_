import {
  normalizeScopeExecutionBindingRecord,
  type CreateScopeExecutionBindingInput,
  type ScopeExecutionBindingRecord,
} from "../../../backend-access/src/models/scope_execution_binding.ts";
import {
  deriveScopeFamily,
  expectedScopeMutationAtomicity,
  normalizeScopeSequence,
  normalizeStringSet,
  type CanonicalScopeToken,
} from "../../../backend-access/src/services/principal_context_normalizer.ts";
import type { RunManifestAccessDecision } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { RunManifestMode } from "../models/run_manifest.ts";
import type { RuntimeAccessDecisionInput } from "../types/preseal_context_patch.ts";

export type MaterializeScopeExecutionBindingOutcome =
  | {
      access_decision: RunManifestAccessDecision;
      reason_codes: string[];
      scope_execution_binding: ScopeExecutionBindingRecord & { binding_scope_class: "RUN_MANIFEST" };
      status: "MATERIALIZED";
    }
  | {
      boundary_decision: Exclude<RuntimeAccessDecisionInput["decision"], "ALLOW" | "ALLOW_MASKED">;
      reason_codes: string[];
      scope_execution_binding: null;
      status: "PRESTART_BOUNDARY";
    };

export type MaterializeScopeExecutionBindingInput = {
  access_decision: RuntimeAccessDecisionInput;
  mode: RunManifestMode;
  requested_scope: CanonicalScopeToken[];
};

function requireScopeFamily(label: string, scope: readonly string[]) {
  const family = deriveScopeFamily(scope);
  if (family === null) {
    throw new Error(`${label} must resolve to one governed scope family`);
  }
  return family;
}

export function materializeScopeExecutionBinding(
  input: MaterializeScopeExecutionBindingInput,
): MaterializeScopeExecutionBindingOutcome {
  const requestedScope = normalizeScopeSequence(
    "materialize_scope_execution_binding.requested_scope",
    input.requested_scope,
  );
  const effectiveScope = normalizeScopeSequence(
    "materialize_scope_execution_binding.effective_scope",
    input.access_decision.effective_scope,
  );
  const reasonCodes = normalizeStringSet(
    "materialize_scope_execution_binding.reason_codes",
    input.access_decision.reason_codes,
    { minItems: 1 },
  );

  if (
    input.access_decision.decision === "REQUIRE_STEP_UP" ||
    input.access_decision.decision === "REQUIRE_APPROVAL" ||
    input.access_decision.decision === "DENY"
  ) {
    return {
      status: "PRESTART_BOUNDARY",
      boundary_decision: input.access_decision.decision,
      scope_execution_binding: null,
      reason_codes: reasonCodes,
    };
  }

  const maskingRules = normalizeStringSet(
    "materialize_scope_execution_binding.masking_rules",
    input.access_decision.masking_rules ?? [],
  );
  const accessDecision: RunManifestAccessDecision = {
    decision: input.access_decision.decision,
    effective_scope: effectiveScope,
    masking_rules: maskingRules,
    reason_codes: reasonCodes,
    required_approvals: [],
    required_authn_level: null,
  };
  const bindingInput: CreateScopeExecutionBindingInput = {
    binding_scope_class: "RUN_MANIFEST",
    execution_mode_or_null: input.mode,
    requested_scope: requestedScope,
    executable_scope: effectiveScope,
    executable_partition_scope_refs: input.access_decision.executable_partition_scope_refs ?? [],
    access_decision: input.access_decision.decision,
    masking_rules: maskingRules,
    required_approvals: [],
    required_authn_level: null,
    reason_codes: reasonCodes,
    requested_scope_family: requireScopeFamily("requested_scope", requestedScope),
    executable_scope_family: requireScopeFamily("effective_scope", effectiveScope),
    reduction_posture:
      requestedScope.join("|") === effectiveScope.join("|")
        ? "UNCHANGED"
        : "REDUCED_BY_AUTHORIZATION",
    mutation_atomicity: expectedScopeMutationAtomicity(requestedScope)!,
    authorization_decision_access_binding_hash:
      input.access_decision.authorization_decision_access_binding_hash,
  };
  if (input.access_decision.access_binding_hash !== undefined) {
    bindingInput.access_binding_hash = input.access_decision.access_binding_hash;
  }
  const binding = normalizeScopeExecutionBindingRecord(bindingInput) as ScopeExecutionBindingRecord & {
    binding_scope_class: "RUN_MANIFEST";
  };

  return {
    status: "MATERIALIZED",
    access_decision: accessDecision,
    scope_execution_binding: binding,
    reason_codes: reasonCodes,
  };
}

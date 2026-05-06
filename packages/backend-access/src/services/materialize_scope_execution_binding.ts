import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";

import type { AuthorizationDecisionRecord } from "../models/authorization_decision.ts";
import type { PrincipalContextRecord } from "../models/principal_context.ts";
import {
  normalizeScopeExecutionBindingRecord,
  type ScopeExecutionBindingRecord,
} from "../models/scope_execution_binding.ts";
import type {
  ScopeExecutionBindingRepository,
  StoredScopeExecutionBindingRecord,
} from "../repositories/scope_execution_binding_repository.ts";
import {
  validateEffectiveScopeBinding,
  type RuntimeScopeFailureCode,
  type ValidEffectiveScopeBindingResult,
} from "./validate_effective_scope_binding.ts";

export type MaterializeScopeExecutionBindingInput = {
  authorization_decision: AuthorizationDecisionRecord;
  binding_scope_class: ScopeExecutionBindingRecord["binding_scope_class"];
  binding_recorded_at?: string;
  execution_mode_or_null: ScopeExecutionBindingRecord["execution_mode_or_null"];
  executable_partition_scope_refs?: string[];
  executable_scope?: string[];
  persist?: boolean;
  principal_context: PrincipalContextRecord;
};

export type MaterializeScopeExecutionBindingResult = {
  scope_execution_binding: ScopeExecutionBindingRecord;
  stored_scope_execution_binding: StoredScopeExecutionBindingRecord | null;
  validation: ValidEffectiveScopeBindingResult;
};

export class MaterializeScopeExecutionBindingError extends Error {
  readonly code: RuntimeScopeFailureCode;

  constructor(code: RuntimeScopeFailureCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "MaterializeScopeExecutionBindingError";
    this.code = code;
  }
}

export class ScopeExecutionBindingMaterializer {
  constructor(
    private readonly dependencies?: {
      scopeExecutionBindingRepository?: ScopeExecutionBindingRepository;
    },
  ) {}

  async materialize(
    input: MaterializeScopeExecutionBindingInput,
  ): Promise<MaterializeScopeExecutionBindingResult> {
    const runtime_scope =
      input.executable_scope ?? input.authorization_decision.effective_scope;
    const runtime_partition_scope_refs =
      input.executable_partition_scope_refs ??
      input.authorization_decision.effective_partition_scope_refs;

    const validation = await validateEffectiveScopeBinding({
      requested_scope: input.principal_context.requested_scope,
      requested_partition_scope_refs: input.principal_context.partition_scope_refs,
      access_decision: {
        decision: input.authorization_decision.decision,
        effective_scope: input.authorization_decision.effective_scope,
        effective_partition_scope_refs:
          input.authorization_decision.effective_partition_scope_refs,
        masking_rules: input.authorization_decision.masking_rules,
      },
      runtime_scope,
      runtime_partition_scope_refs,
      execution_mode_or_null: input.execution_mode_or_null,
    });

    if (validation.status === "INVALID") {
      throw new MaterializeScopeExecutionBindingError(
        validation.reason_code,
        validation.detail,
      );
    }

    const access_decision = input.authorization_decision.decision;
    if (access_decision !== "ALLOW" && access_decision !== "ALLOW_MASKED") {
      throw new MaterializeScopeExecutionBindingError(
        "RUNTIME_SCOPE_DECISION_NOT_EXECUTABLE",
        "scope execution bindings require an executable ALLOW posture",
      );
    }

    const scope_execution_binding = normalizeScopeExecutionBindingRecord({
      authorization_decision_access_binding_hash: input.authorization_decision.access_binding_hash,
      binding_scope_class: input.binding_scope_class,
      execution_mode_or_null: input.execution_mode_or_null,
      requested_scope_family: validation.requested_scope_family,
      executable_scope_family: validation.executable_scope_family,
      requested_scope: validation.requested_scope,
      executable_scope: validation.runtime_scope,
      executable_partition_scope_refs: validation.executable_partition_scope_refs,
      access_decision,
      reduction_posture: validation.reduction_posture,
      mutation_atomicity: validation.mutation_atomicity,
      masking_rules: input.authorization_decision.masking_rules,
      required_approvals: input.authorization_decision.required_approvals,
      required_authn_level: input.authorization_decision.required_authn_level,
      reason_codes: input.authorization_decision.reason_codes,
    });

    let stored_scope_execution_binding: StoredScopeExecutionBindingRecord | null = null;
    if (input.persist && this.dependencies?.scopeExecutionBindingRepository) {
      stored_scope_execution_binding =
        await this.dependencies.scopeExecutionBindingRepository.storeScopeExecutionBinding({
          scope_execution_binding,
          authorization_decision: input.authorization_decision,
          principal_context: input.principal_context,
          binding_recorded_at: normalizeUtcInstantString(
            input.binding_recorded_at ?? input.authorization_decision.evaluated_at,
          ),
        });
    }

    return {
      scope_execution_binding,
      stored_scope_execution_binding,
      validation,
    };
  }
}

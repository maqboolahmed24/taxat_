import type { ScopeExecutionBindingRecord } from "../models/scope_execution_binding.ts";
import type { StoredScopeExecutionBindingRecord } from "../repositories/scope_execution_binding_repository.ts";
import {
  MaskingProjectionContextBuilder,
  type MaskingProjectionContext,
} from "./masking_projection_context_builder.ts";
import {
  ScopeExecutionBindingMaterializer,
  type MaterializeScopeExecutionBindingInput,
} from "./materialize_scope_execution_binding.ts";

export type EnforceAccessScopeAndMaskingInput = MaterializeScopeExecutionBindingInput;

export type EnforceAccessScopeAndMaskingResult = {
  masking_context: MaskingProjectionContext;
  runtime_scope: string[];
  scope_execution_binding: ScopeExecutionBindingRecord;
  stored_scope_execution_binding: StoredScopeExecutionBindingRecord | null;
};

export class AccessScopeAndMaskingEnforcer {
  private readonly maskingProjectionContextBuilder: MaskingProjectionContextBuilder;
  private readonly scopeExecutionBindingMaterializer: ScopeExecutionBindingMaterializer;

  constructor(dependencies?: {
    maskingProjectionContextBuilder?: MaskingProjectionContextBuilder;
    scopeExecutionBindingMaterializer?: ScopeExecutionBindingMaterializer;
  }) {
    this.maskingProjectionContextBuilder =
      dependencies?.maskingProjectionContextBuilder ??
      new MaskingProjectionContextBuilder();
    this.scopeExecutionBindingMaterializer =
      dependencies?.scopeExecutionBindingMaterializer ??
      new ScopeExecutionBindingMaterializer();
  }

  async enforce(
    input: EnforceAccessScopeAndMaskingInput,
  ): Promise<EnforceAccessScopeAndMaskingResult> {
    const materialized = await this.scopeExecutionBindingMaterializer.materialize(input);
    return {
      runtime_scope: [...materialized.scope_execution_binding.executable_scope],
      masking_context: this.maskingProjectionContextBuilder.build({
        principal_context: input.principal_context,
        scope_execution_binding: materialized.scope_execution_binding,
      }),
      scope_execution_binding: materialized.scope_execution_binding,
      stored_scope_execution_binding: materialized.stored_scope_execution_binding,
    };
  }
}

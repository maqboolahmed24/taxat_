import type { PrincipalContextRecord } from "../models/principal_context.ts";
import type { ScopeExecutionBindingRecord } from "../models/scope_execution_binding.ts";
import type {
  ScopeExecutionBindingRepository,
  StoredScopeExecutionBindingRecord,
} from "../repositories/scope_execution_binding_repository.ts";
import {
  MaskingProjectionContextBuilder,
  type MaskingProjectionContext,
} from "./masking_projection_context_builder.ts";
import {
  AccessScopeAndMaskingEnforcer,
  type EnforceAccessScopeAndMaskingInput,
  type EnforceAccessScopeAndMaskingResult,
} from "./enforce_access_scope_and_masking.ts";
import { ScopeExecutionBindingMaterializer } from "./materialize_scope_execution_binding.ts";
import {
  LIVE_MUTATION_SCOPE_TOKENS,
  normalizeScopeSequence,
  normalizeStringSet,
} from "./principal_context_normalizer.ts";

const CLIENT_ACTING_DELEGATION_BASES = new Set<PrincipalContextRecord["delegation_basis"]>([
  "SELF_ACTING",
  "CLIENT_GRANTED",
  "SELF_ASSESSMENT_IMPORTED",
  "DIGITAL_HANDSHAKE",
]);

type RuntimeScopeGuardErrorCode =
  | "RUNTIME_SCOPE_BINDING_NOT_FOUND"
  | "RUNTIME_SCOPE_ACCESS_BINDING_STALE"
  | "RUNTIME_SCOPE_SERVICE_PRINCIPAL_REUSE_FOR_CLIENT_ACTING"
  | "RUNTIME_SCOPE_EXCEEDS_EFFECTIVE_SCOPE"
  | "RUNTIME_SCOPE_PARTITION_WIDENED"
  | "RUNTIME_SCOPE_ANALYSIS_REQUIRES_READ_ONLY";

export class RuntimeScopeGuardError extends Error {
  readonly code: RuntimeScopeGuardErrorCode;

  constructor(code: RuntimeScopeGuardErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "RuntimeScopeGuardError";
    this.code = code;
  }
}

export type GuardStoredScopeExecutionBindingInput = {
  access_binding_hash: string;
  current_principal_context: PrincipalContextRecord;
  requested_partition_scope_refs?: string[];
  requested_scope?: string[];
};

export type GuardStoredScopeExecutionBindingResult = {
  masking_context: MaskingProjectionContext;
  runtime_scope: string[];
  scope_execution_binding: ScopeExecutionBindingRecord;
  stored_scope_execution_binding: StoredScopeExecutionBindingRecord;
};

export class RuntimeScopeGuard {
  private readonly accessScopeAndMaskingEnforcer: AccessScopeAndMaskingEnforcer;
  private readonly maskingProjectionContextBuilder: MaskingProjectionContextBuilder;

  constructor(
    private readonly dependencies?: {
      accessScopeAndMaskingEnforcer?: AccessScopeAndMaskingEnforcer;
      maskingProjectionContextBuilder?: MaskingProjectionContextBuilder;
      scopeExecutionBindingRepository?: ScopeExecutionBindingRepository;
    },
  ) {
    this.accessScopeAndMaskingEnforcer =
      dependencies?.accessScopeAndMaskingEnforcer ??
      new AccessScopeAndMaskingEnforcer({
        scopeExecutionBindingMaterializer: new ScopeExecutionBindingMaterializer({
          ...(dependencies?.scopeExecutionBindingRepository === undefined
            ? {}
            : {
                scopeExecutionBindingRepository:
                  dependencies.scopeExecutionBindingRepository,
              }),
        }),
      });
    this.maskingProjectionContextBuilder =
      dependencies?.maskingProjectionContextBuilder ??
      new MaskingProjectionContextBuilder();
  }

  async enforce(
    input: EnforceAccessScopeAndMaskingInput,
  ): Promise<EnforceAccessScopeAndMaskingResult> {
    return this.accessScopeAndMaskingEnforcer.enforce(input);
  }

  async guardStoredBinding(
    input: GuardStoredScopeExecutionBindingInput,
  ): Promise<GuardStoredScopeExecutionBindingResult> {
    const repository = this.dependencies?.scopeExecutionBindingRepository;
    if (!repository) {
      throw new RuntimeScopeGuardError(
        "RUNTIME_SCOPE_BINDING_NOT_FOUND",
        "runtime scope guard requires a scope execution binding repository for replay checks",
      );
    }

    const stored = await repository.getScopeExecutionBindingByAccessBindingHash(
      input.current_principal_context.tenant_id,
      input.access_binding_hash,
    );
    if (!stored) {
      throw new RuntimeScopeGuardError(
        "RUNTIME_SCOPE_BINDING_NOT_FOUND",
        `scope execution binding ${input.access_binding_hash} does not exist for replay`,
      );
    }

    if (
      input.current_principal_context.principal_type === "SERVICE" &&
      CLIENT_ACTING_DELEGATION_BASES.has(stored.delegation_basis)
    ) {
      throw new RuntimeScopeGuardError(
        "RUNTIME_SCOPE_SERVICE_PRINCIPAL_REUSE_FOR_CLIENT_ACTING",
        "service principals may not reuse client-acting frozen scope execution bindings",
      );
    }

    if (
      stored.principal_context_access_binding_hash !==
      input.current_principal_context.access_binding_hash
    ) {
      throw new RuntimeScopeGuardError(
        "RUNTIME_SCOPE_ACCESS_BINDING_STALE",
        "frozen scope execution binding no longer matches the current principal context access posture",
      );
    }

    const requested_scope =
      input.requested_scope === undefined
        ? stored.scope_execution_binding.executable_scope
        : normalizeScopeSequence("requested_scope", input.requested_scope);
    if (
      requested_scope.some(
        (token) => !stored.scope_execution_binding.executable_scope.includes(token),
      )
    ) {
      throw new RuntimeScopeGuardError(
        "RUNTIME_SCOPE_EXCEEDS_EFFECTIVE_SCOPE",
        "replay scope may not widen beyond the frozen executable scope",
      );
    }

    const requested_partition_scope_refs =
      input.requested_partition_scope_refs === undefined
        ? stored.scope_execution_binding.executable_partition_scope_refs
        : normalizeStringSet(
            "requested_partition_scope_refs",
            input.requested_partition_scope_refs,
          );
    if (
      requested_partition_scope_refs.some(
        (ref) =>
          !stored.scope_execution_binding.executable_partition_scope_refs.includes(ref),
      )
    ) {
      throw new RuntimeScopeGuardError(
        "RUNTIME_SCOPE_PARTITION_WIDENED",
        "replay partition scope refs may not widen beyond the frozen executable partition coverage",
      );
    }

    if (
      stored.scope_execution_binding.execution_mode_or_null === "ANALYSIS" &&
      requested_scope.some((token) => LIVE_MUTATION_SCOPE_TOKENS.has(token))
    ) {
      throw new RuntimeScopeGuardError(
        "RUNTIME_SCOPE_ANALYSIS_REQUIRES_READ_ONLY",
        "analysis-mode replay may not carry live-capable executable scope tokens",
      );
    }

    return {
      runtime_scope: [...stored.scope_execution_binding.executable_scope],
      masking_context: this.maskingProjectionContextBuilder.build({
        principal_context: input.current_principal_context,
        scope_execution_binding: stored.scope_execution_binding,
      }),
      scope_execution_binding: stored.scope_execution_binding,
      stored_scope_execution_binding: stored,
    };
  }
}

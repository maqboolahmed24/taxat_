import type { PrincipalContextRecord } from "../models/principal_context.ts";
import type { ScopeExecutionBindingRecord } from "../models/scope_execution_binding.ts";

export type MaskingProjectionContext = {
  access_binding_hash: string;
  apply_to_surfaces: Array<"API_PROJECTION" | "EXPORT" | "HUMAN_READ_MODEL">;
  ignore_for_layers: Array<
    "AUTHORITY_PACKET" | "CANONICAL_FACTS" | "COMPUTE" | "REQUEST_HASH"
  >;
  masking_active: boolean;
  masking_rules: string[];
  masking_scope: string;
  projection_policy: "PROJECTION_ONLY";
};

type MaskingProjectionContextBuilderErrorCode =
  | "RUNTIME_SCOPE_MASKING_POSTURE_INVALID";

export class MaskingProjectionContextBuilderError extends Error {
  readonly code: MaskingProjectionContextBuilderErrorCode;

  constructor(code: MaskingProjectionContextBuilderErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "MaskingProjectionContextBuilderError";
    this.code = code;
  }
}

export class MaskingProjectionContextBuilder {
  build(input: {
    principal_context: PrincipalContextRecord;
    scope_execution_binding: ScopeExecutionBindingRecord;
  }): MaskingProjectionContext {
    if (
      input.scope_execution_binding.access_decision === "ALLOW" &&
      input.scope_execution_binding.masking_rules.length > 0
    ) {
      throw new MaskingProjectionContextBuilderError(
        "RUNTIME_SCOPE_MASKING_POSTURE_INVALID",
        "ALLOW bindings must not project masking rules",
      );
    }

    if (
      input.scope_execution_binding.access_decision === "ALLOW_MASKED" &&
      input.scope_execution_binding.masking_rules.length === 0
    ) {
      throw new MaskingProjectionContextBuilderError(
        "RUNTIME_SCOPE_MASKING_POSTURE_INVALID",
        "ALLOW_MASKED bindings must retain masking rules for projection surfaces",
      );
    }

    return {
      access_binding_hash: input.scope_execution_binding.access_binding_hash,
      masking_active: input.scope_execution_binding.access_decision === "ALLOW_MASKED",
      masking_scope: input.principal_context.masking_scope,
      masking_rules: [...input.scope_execution_binding.masking_rules],
      projection_policy: "PROJECTION_ONLY",
      apply_to_surfaces: ["API_PROJECTION", "EXPORT", "HUMAN_READ_MODEL"],
      ignore_for_layers: [
        "AUTHORITY_PACKET",
        "CANONICAL_FACTS",
        "COMPUTE",
        "REQUEST_HASH",
      ],
    };
  }
}

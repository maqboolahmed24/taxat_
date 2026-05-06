import type { ScopeExecutionBinding as SchemaScopeExecutionBinding } from "../../../generated-models/src/generated/typescript/authority-and-access.ts";
import {
  asTaxatHash,
  unwrapIdentifier,
} from "../../../domain-kernel/src/primitives/identifier.ts";

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
} from "../services/principal_context_normalizer.ts";
import { buildScopeExecutionBindingAccessBindingHash } from "../hash/access_binding_hash.ts";

export type ScopeExecutionBindingRecord = Omit<
  SchemaScopeExecutionBinding,
  "requested_scope" | "executable_scope"
> & {
  executable_scope: string[];
  requested_scope: string[];
};

export type CreateScopeExecutionBindingInput = Omit<
  ScopeExecutionBindingRecord,
  "access_binding_hash"
> & {
  access_binding_hash?: string;
  authorization_decision_access_binding_hash: string;
};

type ScopeExecutionBindingModelErrorCode =
  | "SCOPE_EXECUTION_BINDING_ACCESS_BINDING_HASH_MISMATCH"
  | "SCOPE_EXECUTION_BINDING_FIELD_REQUIRED"
  | "SCOPE_EXECUTION_BINDING_INVALID_POSTURE"
  | "SCOPE_EXECUTION_BINDING_INVALID_SCOPE";

export class ScopeExecutionBindingModelError extends Error {
  readonly code: ScopeExecutionBindingModelErrorCode;

  constructor(code: ScopeExecutionBindingModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ScopeExecutionBindingModelError";
    this.code = code;
  }
}

function assertCondition(
  condition: unknown,
  code: ScopeExecutionBindingModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new ScopeExecutionBindingModelError(code, detail);
  }
}

function normalizeHash(label: string, value: unknown, family: string) {
  return unwrapIdentifier(asTaxatHash(requireTrimmedString(label, value), family));
}

function normalizeScopeFamily(
  label: string,
  value: unknown,
): ScopeExecutionBindingScopeFamily {
  const family = requireTrimmedString(label, value) as ScopeExecutionBindingScopeFamily;
  assertCondition(
    [
      "READ_ONLY",
      "PREPARE_ONLY",
      "PREPARE_AND_SUBMIT",
      "AMENDMENT_INTENT",
      "AMENDMENT_SUBMIT",
    ].includes(family),
    "SCOPE_EXECUTION_BINDING_FIELD_REQUIRED",
    `${label} must remain a supported scope family`,
  );
  return family;
}

function normalizeMutationAtomicity(
  value: unknown,
): ScopeMutationAtomicity {
  const atomicity = requireTrimmedString("mutation_atomicity", value) as ScopeMutationAtomicity;
  assertCondition(
    atomicity === "ATOMIC_REQUIRED" || atomicity === "NARROWING_ALLOWED",
    "SCOPE_EXECUTION_BINDING_FIELD_REQUIRED",
    "mutation_atomicity must remain a supported runtime atomicity posture",
  );
  return atomicity;
}

export function normalizeScopeExecutionBindingRecord(
  input: CreateScopeExecutionBindingInput,
): ScopeExecutionBindingRecord {
  try {
    const binding_scope_class = requireTrimmedString(
      "binding_scope_class",
      input.binding_scope_class,
    ) as ScopeExecutionBindingRecord["binding_scope_class"];
    const execution_mode_or_null =
      input.execution_mode_or_null === null
        ? null
        : (requireTrimmedString(
            "execution_mode_or_null",
            input.execution_mode_or_null,
          ) as ScopeExecutionBindingRecord["execution_mode_or_null"]);
    const requested_scope = normalizeScopeSequence(
      "requested_scope",
      input.requested_scope as readonly string[],
    );
    const executable_scope = normalizeScopeSequence(
      "executable_scope",
      input.executable_scope as readonly string[],
    );
    const executable_partition_scope_refs = normalizeStringSet(
      "executable_partition_scope_refs",
      input.executable_partition_scope_refs ?? [],
    );
    const access_decision = requireTrimmedString(
      "access_decision",
      input.access_decision,
    ) as ScopeExecutionBindingRecord["access_decision"];
    const masking_rules = normalizeStringSet(
      "masking_rules",
      input.masking_rules ?? [],
    );
    const required_approvals = normalizeStringSet(
      "required_approvals",
      input.required_approvals ?? [],
    );
    const required_authn_level =
      input.required_authn_level === null
        ? null
        : (requireTrimmedString(
            "required_authn_level",
            input.required_authn_level,
          ) as ScopeExecutionBindingRecord["required_authn_level"]);
    const reason_codes = normalizeStringSet("reason_codes", input.reason_codes, {
      minItems: 1,
    });
    const requested_scope_family = normalizeScopeFamily(
      "requested_scope_family",
      input.requested_scope_family,
    );
    const executable_scope_family = normalizeScopeFamily(
      "executable_scope_family",
      input.executable_scope_family,
    );
    const reduction_posture = requireTrimmedString(
      "reduction_posture",
      input.reduction_posture,
    ) as ScopeExecutionBindingRecord["reduction_posture"];
    const mutation_atomicity = normalizeMutationAtomicity(input.mutation_atomicity);
    const authorization_decision_access_binding_hash = normalizeHash(
      "authorization_decision_access_binding_hash",
      input.authorization_decision_access_binding_hash,
      "access_binding",
    );

    assertCondition(
      [
        "RUN_MANIFEST",
        "FROZEN_EXECUTION_BINDING",
        "AUTHORITY_OPERATION",
        "AUTHORITY_CALCULATION_REQUEST",
      ].includes(binding_scope_class),
      "SCOPE_EXECUTION_BINDING_FIELD_REQUIRED",
      "binding_scope_class must remain a supported scope-execution binding surface",
    );
    assertCondition(
      execution_mode_or_null === null ||
        execution_mode_or_null === "COMPLIANCE" ||
        execution_mode_or_null === "ANALYSIS",
      "SCOPE_EXECUTION_BINDING_FIELD_REQUIRED",
      "execution_mode_or_null must remain null, COMPLIANCE, or ANALYSIS",
    );
    assertCondition(
      access_decision === "ALLOW" || access_decision === "ALLOW_MASKED",
      "SCOPE_EXECUTION_BINDING_INVALID_POSTURE",
      "scope execution bindings only materialize executable ALLOW or ALLOW_MASKED decisions",
    );

    const derivedRequestedScopeFamily = deriveScopeFamily(requested_scope);
    const derivedExecutableScopeFamily = deriveScopeFamily(executable_scope);
    assertCondition(
      derivedRequestedScopeFamily !== null,
      "SCOPE_EXECUTION_BINDING_INVALID_SCOPE",
      "requested_scope must resolve to one explicit scope family",
    );
    assertCondition(
      derivedExecutableScopeFamily !== null,
      "SCOPE_EXECUTION_BINDING_INVALID_SCOPE",
      "executable_scope must resolve to one explicit executable scope family",
    );
    assertCondition(
      requested_scope_family === derivedRequestedScopeFamily,
      "SCOPE_EXECUTION_BINDING_INVALID_SCOPE",
      `requested_scope_family must equal ${derivedRequestedScopeFamily}`,
    );
    assertCondition(
      executable_scope_family === derivedExecutableScopeFamily,
      "SCOPE_EXECUTION_BINDING_INVALID_SCOPE",
      `executable_scope_family must equal ${derivedExecutableScopeFamily}`,
    );

    assertCondition(
      isStringSubset(executable_scope, requested_scope),
      "SCOPE_EXECUTION_BINDING_INVALID_SCOPE",
      "executable_scope must stay within requested_scope",
    );

    const expectedReductionPosture =
      requested_scope.join("|") === executable_scope.join("|")
        ? "UNCHANGED"
        : "REDUCED_BY_AUTHORIZATION";
    assertCondition(
      reduction_posture === expectedReductionPosture,
      "SCOPE_EXECUTION_BINDING_INVALID_POSTURE",
      `reduction_posture must equal ${expectedReductionPosture}`,
    );

    const expectedMutationAtomicity = expectedScopeMutationAtomicity(requested_scope);
    assertCondition(
      expectedMutationAtomicity !== null && mutation_atomicity === expectedMutationAtomicity,
      "SCOPE_EXECUTION_BINDING_INVALID_POSTURE",
      `mutation_atomicity must equal ${expectedMutationAtomicity}`,
    );

    if (expectedMutationAtomicity === "ATOMIC_REQUIRED") {
      assertCondition(
        requested_scope.join("|") === executable_scope.join("|"),
        "SCOPE_EXECUTION_BINDING_INVALID_POSTURE",
        "atomic live-capable bindings may not silently narrow executable scope",
      );
    }

    if (execution_mode_or_null === "ANALYSIS") {
      assertCondition(
        !requested_scope.some((token) => LIVE_MUTATION_SCOPE_TOKENS.has(token)),
        "SCOPE_EXECUTION_BINDING_INVALID_SCOPE",
        "analysis-mode requested scope must stay read-only",
      );
      assertCondition(
        !executable_scope.some((token) => LIVE_MUTATION_SCOPE_TOKENS.has(token)),
        "SCOPE_EXECUTION_BINDING_INVALID_SCOPE",
        "analysis-mode executable scope must stay read-only",
      );
      assertCondition(
        requested_scope_family === "READ_ONLY" &&
          executable_scope_family === "READ_ONLY",
        "SCOPE_EXECUTION_BINDING_INVALID_SCOPE",
        "analysis-mode scope families must remain READ_ONLY",
      );
      assertCondition(
        mutation_atomicity === "NARROWING_ALLOWED",
        "SCOPE_EXECUTION_BINDING_INVALID_POSTURE",
        "analysis-mode bindings must remain NARROWING_ALLOWED",
      );
    }

    if (access_decision === "ALLOW") {
      assertCondition(
        masking_rules.length === 0,
        "SCOPE_EXECUTION_BINDING_INVALID_POSTURE",
        "ALLOW bindings must not retain masking rules",
      );
    }
    if (access_decision === "ALLOW_MASKED") {
      assertCondition(
        masking_rules.length > 0,
        "SCOPE_EXECUTION_BINDING_INVALID_POSTURE",
        "ALLOW_MASKED bindings must retain non-empty masking rules",
      );
    }

    const expectedAccessBindingHash = buildScopeExecutionBindingAccessBindingHash({
      authorization_decision_access_binding_hash,
      execution_mode_or_null,
      requested_scope_family,
      executable_scope_family,
      requested_scope,
      executable_scope,
      executable_partition_scope_refs,
      access_decision,
      reduction_posture,
      mutation_atomicity,
      masking_rules,
      required_approvals,
      required_authn_level,
      reason_codes,
    });

    const access_binding_hash =
      input.access_binding_hash === undefined
        ? expectedAccessBindingHash
        : normalizeHash("access_binding_hash", input.access_binding_hash, "access_binding");

    if (input.access_binding_hash !== undefined) {
      assertCondition(
        access_binding_hash === expectedAccessBindingHash,
        "SCOPE_EXECUTION_BINDING_ACCESS_BINDING_HASH_MISMATCH",
        "access_binding_hash does not match the canonical scope-execution binding seed",
      );
    }

    return {
      binding_scope_class,
      execution_mode_or_null,
      requested_scope_family,
      executable_scope_family,
      requested_scope,
      executable_scope,
      executable_partition_scope_refs,
      access_decision,
      reduction_posture,
      mutation_atomicity,
      masking_rules,
      required_approvals,
      required_authn_level,
      access_binding_hash,
      reason_codes,
    };
  } catch (error) {
    if (error instanceof ScopeExecutionBindingModelError) {
      throw error;
    }
    throw new ScopeExecutionBindingModelError(
      "SCOPE_EXECUTION_BINDING_FIELD_REQUIRED",
      error instanceof Error ? error.message : "unknown scope-execution binding error",
    );
  }
}

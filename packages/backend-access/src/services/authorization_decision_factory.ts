import {
  compareDecisionChronology,
  normalizeAuthorizationDecisionRecord,
  type AuthorizationDecisionRecord,
} from "../models/authorization_decision.ts";
import type { PrincipalContextRecord } from "../models/principal_context.ts";
import { ReasonCodeRegistry } from "./reason_code_registry.ts";
import {
  assertStringSubset,
  normalizeScopeSequence,
} from "./principal_context_normalizer.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";

type AuthorizationDecisionFactoryErrorCode =
  | "CONFLICT_CHRONOLOGY_NON_MONOTONIC"
  | "AUTHORIZATION_DECISION_SCOPE_WIDENED";

export class AuthorizationDecisionFactoryError extends Error {
  readonly code: AuthorizationDecisionFactoryErrorCode;

  constructor(code: AuthorizationDecisionFactoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "AuthorizationDecisionFactoryError";
    this.code = code;
  }
}

export type CreateAuthorizationDecisionFactoryInput = {
  action_family: string;
  approval_requirement?: AuthorizationDecisionRecord["approval_requirement"];
  authority_layer_boundary: AuthorizationDecisionRecord["authority_layer_boundary"];
  authority_link_snapshot_refs?: string[];
  bounded_safe_mutation?: AuthorizationDecisionRecord["bounded_safe_mutation"];
  decision: AuthorizationDecisionRecord["decision"];
  decision_id?: string;
  delegation_snapshot_refs?: string[];
  dependency_topology_hash?: string | null;
  effective_partition_scope_refs?: string[];
  effective_scope?: string[];
  evaluated_at: string;
  masking_rules?: string[];
  policy_snapshot_hash?: string;
  principal_context: PrincipalContextRecord;
  reason_codes: string[];
  required_approvals?: string[];
  required_authn_level?: AuthorizationDecisionRecord["required_authn_level"];
  resource_class: string;
  simulation_basis_hash?: string | null;
};

export class AuthorizationDecisionFactory {
  private readonly reasonCodeRegistry: ReasonCodeRegistry;

  constructor(dependencies?: { reasonCodeRegistry?: ReasonCodeRegistry }) {
    this.reasonCodeRegistry = dependencies?.reasonCodeRegistry ?? new ReasonCodeRegistry();
  }

  async create(input: CreateAuthorizationDecisionFactoryInput) {
    const evaluatedAt = normalizeUtcInstantString(input.evaluated_at);
    if (
      compareDecisionChronology(input.principal_context.authorization_evaluated_at, evaluatedAt) > 0
    ) {
      throw new AuthorizationDecisionFactoryError(
        "CONFLICT_CHRONOLOGY_NON_MONOTONIC",
        "authorization decision evaluated_at cannot predate principal_context.authorization_evaluated_at",
      );
    }

    const effective_scope = normalizeScopeSequence(
      "effective_scope",
      input.effective_scope ??
        (input.decision === "DENY" ? [] : input.principal_context.requested_scope),
      {
        allowEmpty: input.decision === "DENY",
      },
    );
    const effective_partition_scope_refs =
      input.effective_partition_scope_refs ?? input.principal_context.partition_scope_refs;
    assertStringSubset(
      "effective_scope",
      effective_scope,
      input.principal_context.requested_scope,
    );
    assertStringSubset(
      "effective_partition_scope_refs",
      effective_partition_scope_refs,
      input.principal_context.partition_scope_refs,
    );

    if (
      input.required_authn_level !== null &&
      input.required_authn_level !== undefined &&
      input.decision === "REQUIRE_STEP_UP" &&
      input.required_authn_level === "BASIC"
    ) {
      throw new AuthorizationDecisionFactoryError(
        "AUTHORIZATION_DECISION_SCOPE_WIDENED",
        "REQUIRE_STEP_UP decisions may require MFA or STEP_UP, never BASIC",
      );
    }

    const reasonCodes = [...new Set(input.reason_codes)];
    await this.reasonCodeRegistry.assertSupported(reasonCodes, { decision: input.decision });

    return normalizeAuthorizationDecisionRecord({
      ...(input.decision_id !== undefined ? { decision_id: input.decision_id } : {}),
      principal_context_access_binding_hash: input.principal_context.access_binding_hash,
      principal_context_ref: input.principal_context.principal_id,
      resource_class: input.resource_class,
      action_family: input.action_family,
      decision: input.decision,
      reason_codes: reasonCodes,
      effective_scope,
      effective_partition_scope_refs,
      masking_rules: input.masking_rules ?? [],
      required_approvals: input.required_approvals ?? [],
      required_authn_level: input.required_authn_level ?? null,
      policy_snapshot_hash:
        input.policy_snapshot_hash ?? input.principal_context.policy_snapshot_hash,
      dependency_topology_hash: input.dependency_topology_hash ?? null,
      simulation_basis_hash: input.simulation_basis_hash ?? null,
      delegation_snapshot_refs:
        input.delegation_snapshot_refs ?? input.principal_context.delegation_snapshot_refs,
      authority_link_snapshot_refs:
        input.authority_link_snapshot_refs ??
        input.principal_context.authority_link_snapshot_refs,
      authority_layer_boundary: input.authority_layer_boundary,
      bounded_safe_mutation: input.bounded_safe_mutation ?? null,
      approval_requirement: input.approval_requirement ?? null,
      evaluated_at: evaluatedAt,
    });
  }
}

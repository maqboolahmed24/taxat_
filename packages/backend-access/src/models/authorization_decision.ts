import type {
  AuthorizationDecision as SchemaAuthorizationDecision,
  AuthorityLayerBoundaryContract,
} from "../../../generated-models/src/generated/typescript/authority-and-access.ts";
import {
  asTaxatHash,
  asTaxatRef,
  unwrapIdentifier,
} from "../../../domain-kernel/src/primitives/identifier.ts";
import {
  normalizeUtcInstantString,
  type ISO8601DateTimeString,
} from "../../../domain-kernel/src/primitives/time.ts";

import {
  buildAuthorizationDecisionId,
  normalizeScopeSequence,
  normalizeStringSet,
  requireTrimmedString,
} from "../services/principal_context_normalizer.ts";
import { buildAuthorizationDecisionAccessBindingHash } from "../hash/access_binding_hash.ts";

export type AuthorizationDecisionRecord = SchemaAuthorizationDecision;

export type CreateAuthorizationDecisionInput = Omit<
  AuthorizationDecisionRecord,
  "access_binding_hash" | "artifact_type" | "decision_id"
> & {
  access_binding_hash?: string;
  artifact_type?: "AuthorizationDecision";
  decision_id?: string;
  principal_context_access_binding_hash: string;
};

type AuthorizationDecisionModelErrorCode =
  | "AUTHORIZATION_DECISION_ACCESS_BINDING_HASH_MISMATCH"
  | "AUTHORIZATION_DECISION_FIELD_REQUIRED"
  | "AUTHORIZATION_DECISION_INVALID_BOUNDARY"
  | "AUTHORIZATION_DECISION_INVALID_POSTURE";

export class AuthorizationDecisionModelError extends Error {
  readonly code: AuthorizationDecisionModelErrorCode;

  constructor(code: AuthorizationDecisionModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "AuthorizationDecisionModelError";
    this.code = code;
  }
}

function assertCondition(
  condition: unknown,
  code: AuthorizationDecisionModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new AuthorizationDecisionModelError(code, detail);
  }
}

function normalizeHash(label: string, value: unknown, family: string) {
  return unwrapIdentifier(asTaxatHash(requireTrimmedString(label, value), family));
}

function normalizeOptionalHash(label: string, value: string | null, family: string) {
  return value === null ? null : normalizeHash(label, value, family);
}

function normalizePrincipalContextRef(value: unknown) {
  return unwrapIdentifier(asTaxatRef(requireTrimmedString("principal_context_ref", value), "principal_context"));
}

function normalizeAuthorityLayerBoundary(
  input: AuthorizationDecisionRecord["authority_layer_boundary"],
): AuthorityLayerBoundaryContract & { binding_scope_class?: "AUTHORIZATION_DECISION" } {
  const contract_version = requireTrimmedString("authority_layer_boundary.contract_version", input.contract_version);
  const binding_scope_class = requireTrimmedString(
    "authority_layer_boundary.binding_scope_class",
    input.binding_scope_class,
  ) as AuthorityLayerBoundaryContract["binding_scope_class"];
  const integration_capability = requireTrimmedString(
    "authority_layer_boundary.integration_capability",
    input.integration_capability,
  ) as AuthorityLayerBoundaryContract["integration_capability"];
  const active_principal_class = requireTrimmedString(
    "authority_layer_boundary.active_principal_class",
    input.active_principal_class,
  ) as AuthorityLayerBoundaryContract["active_principal_class"];
  const tenant_permission_state = requireTrimmedString(
    "authority_layer_boundary.tenant_permission_state",
    input.tenant_permission_state,
  ) as AuthorityLayerBoundaryContract["tenant_permission_state"];
  const client_delegation_state = requireTrimmedString(
    "authority_layer_boundary.client_delegation_state",
    input.client_delegation_state,
  ) as AuthorityLayerBoundaryContract["client_delegation_state"];
  const delegation_basis = requireTrimmedString(
    "authority_layer_boundary.delegation_basis",
    input.delegation_basis,
  ) as AuthorityLayerBoundaryContract["delegation_basis"];
  const delegation_freshness_state = requireTrimmedString(
    "authority_layer_boundary.delegation_freshness_state",
    input.delegation_freshness_state,
  ) as AuthorityLayerBoundaryContract["delegation_freshness_state"];
  const authority_link_state = requireTrimmedString(
    "authority_layer_boundary.authority_link_state",
    input.authority_link_state,
  ) as AuthorityLayerBoundaryContract["authority_link_state"];
  const exceptional_authority_state = requireTrimmedString(
    "authority_layer_boundary.exceptional_authority_state",
    input.exceptional_authority_state,
  ) as AuthorityLayerBoundaryContract["exceptional_authority_state"];
  const human_gate_requirement = requireTrimmedString(
    "authority_layer_boundary.human_gate_requirement",
    input.human_gate_requirement,
  ) as AuthorityLayerBoundaryContract["human_gate_requirement"];
  const human_gate_resolution_state = requireTrimmedString(
    "authority_layer_boundary.human_gate_resolution_state",
    input.human_gate_resolution_state,
  ) as AuthorityLayerBoundaryContract["human_gate_resolution_state"];
  const authority_truth_precedence_policy = requireTrimmedString(
    "authority_layer_boundary.authority_truth_precedence_policy",
    input.authority_truth_precedence_policy,
  );
  const tenant_permission_substitution_policy = requireTrimmedString(
    "authority_layer_boundary.tenant_permission_substitution_policy",
    input.tenant_permission_substitution_policy,
  );
  const link_delegation_independence_policy = requireTrimmedString(
    "authority_layer_boundary.link_delegation_independence_policy",
    input.link_delegation_independence_policy,
  );
  const exceptional_scope_policy = requireTrimmedString(
    "authority_layer_boundary.exceptional_scope_policy",
    input.exceptional_scope_policy,
  );

  assertCondition(
    contract_version === "AUTHORITY_LAYER_BOUNDARY_V1",
    "AUTHORIZATION_DECISION_INVALID_BOUNDARY",
    "authority_layer_boundary.contract_version must stay AUTHORITY_LAYER_BOUNDARY_V1",
  );
  assertCondition(
    binding_scope_class === "AUTHORIZATION_DECISION",
    "AUTHORIZATION_DECISION_INVALID_BOUNDARY",
    "authority_layer_boundary.binding_scope_class must stay AUTHORIZATION_DECISION",
  );
  assertCondition(
    ["INTERNAL_ONLY", "AUTHORITY_INTEGRATED"].includes(integration_capability),
    "AUTHORIZATION_DECISION_INVALID_BOUNDARY",
    "authority_layer_boundary.integration_capability must be supported",
  );
  assertCondition(
    ["HUMAN", "SERVICE", "EXTERNAL"].includes(active_principal_class),
    "AUTHORIZATION_DECISION_INVALID_BOUNDARY",
    "authority_layer_boundary.active_principal_class must be supported",
  );
  assertCondition(
    ["SATISFIED", "MASKED", "DENIED"].includes(tenant_permission_state),
    "AUTHORIZATION_DECISION_INVALID_BOUNDARY",
    "authority_layer_boundary.tenant_permission_state must be supported",
  );
  assertCondition(
    ["NOT_REQUIRED", "SATISFIED", "LIMITED", "MISSING", "EXPIRED"].includes(
      client_delegation_state,
    ),
    "AUTHORIZATION_DECISION_INVALID_BOUNDARY",
    "authority_layer_boundary.client_delegation_state must be supported",
  );
  assertCondition(
    [
      "SELF_ACTING",
      "CLIENT_GRANTED",
      "SELF_ASSESSMENT_IMPORTED",
      "DIGITAL_HANDSHAKE",
      "TENANT_INTERNAL",
      "SYSTEM_ASSIGNED",
    ].includes(delegation_basis),
    "AUTHORIZATION_DECISION_INVALID_BOUNDARY",
    "authority_layer_boundary.delegation_basis must be supported",
  );
  assertCondition(
    ["NOT_APPLICABLE", "CURRENT", "REVALIDATION_REQUIRED"].includes(
      delegation_freshness_state,
    ),
    "AUTHORIZATION_DECISION_INVALID_BOUNDARY",
    "authority_layer_boundary.delegation_freshness_state must be supported",
  );
  assertCondition(
    [
      "NOT_REQUIRED",
      "UNLINKED",
      "LINK_INITIATED",
      "AUTHORISED_ACTIVE",
      "AUTHORISED_LIMITED",
      "TOKEN_INVALID",
      "REVOKED",
      "EXPIRED",
      "SUPERSEDED",
    ].includes(authority_link_state),
    "AUTHORIZATION_DECISION_INVALID_BOUNDARY",
    "authority_layer_boundary.authority_link_state must be supported",
  );
  assertCondition(
    ["NOT_APPLICABLE", "BOUNDED_INTERNAL_EXCEPTION"].includes(exceptional_authority_state),
    "AUTHORIZATION_DECISION_INVALID_BOUNDARY",
    "authority_layer_boundary.exceptional_authority_state must be supported",
  );
  assertCondition(
    [
      "NOT_REQUIRED",
      "REQUIRE_STEP_UP",
      "REQUIRE_APPROVAL",
      "REQUIRE_STEP_UP_AND_APPROVAL",
    ].includes(human_gate_requirement),
    "AUTHORIZATION_DECISION_INVALID_BOUNDARY",
    "authority_layer_boundary.human_gate_requirement must be supported",
  );
  assertCondition(
    ["NOT_REQUIRED", "PENDING_EVIDENCE", "EVIDENCE_FROZEN"].includes(
      human_gate_resolution_state,
    ),
    "AUTHORIZATION_DECISION_INVALID_BOUNDARY",
    "authority_layer_boundary.human_gate_resolution_state must be supported",
  );

  assertCondition(
    authority_truth_precedence_policy === "EXTERNAL_TRUTH_SUPERSEDES_INTERNAL_EXCEPTION",
    "AUTHORIZATION_DECISION_INVALID_BOUNDARY",
    "authority-layer precedence policy must stay fixed",
  );
  assertCondition(
    tenant_permission_substitution_policy ===
      "INTERNAL_PERMISSION_NEVER_SUFFICIENT_FOR_AUTHORITY_MUTATION",
    "AUTHORIZATION_DECISION_INVALID_BOUNDARY",
    "tenant-permission substitution policy must stay fixed",
  );
  assertCondition(
    link_delegation_independence_policy === "AUTHORITY_LINK_NEVER_PROVES_CLIENT_DELEGATION",
    "AUTHORIZATION_DECISION_INVALID_BOUNDARY",
    "link/delegation independence policy must stay fixed",
  );
  assertCondition(
    exceptional_scope_policy ===
      "EXCEPTION_BOUND_TO_APPROVED_ACTION_CLIENT_AND_PARTITIONS",
    "AUTHORIZATION_DECISION_INVALID_BOUNDARY",
    "exceptional scope policy must stay fixed",
  );
  assertCondition(
    input.service_human_gate_satisfaction_permitted === false &&
      input.exceptional_authority_may_substitute_for_delegation === false &&
      input.exceptional_authority_may_override_authority_truth === false &&
      input.exceptional_authority_may_widen_client_scope === false &&
      input.exceptional_authority_may_widen_partition_scope === false,
    "AUTHORIZATION_DECISION_INVALID_BOUNDARY",
    "authority-layer false prohibitions must remain false",
  );

  if (human_gate_requirement === "NOT_REQUIRED") {
    assertCondition(
      human_gate_resolution_state === "NOT_REQUIRED",
      "AUTHORIZATION_DECISION_INVALID_BOUNDARY",
      "no-gate boundaries must keep human_gate_resolution_state = NOT_REQUIRED",
    );
  } else {
    assertCondition(
      ["PENDING_EVIDENCE", "EVIDENCE_FROZEN"].includes(human_gate_resolution_state),
      "AUTHORIZATION_DECISION_INVALID_BOUNDARY",
      "gated boundaries must keep pending or frozen evidence posture",
    );
  }

  if (active_principal_class === "SERVICE") {
    assertCondition(
      human_gate_resolution_state !== "EVIDENCE_FROZEN",
      "AUTHORIZATION_DECISION_INVALID_BOUNDARY",
      "service principals must not serialize satisfied human-gate evidence",
    );
    assertCondition(
      delegation_basis === "TENANT_INTERNAL" || delegation_basis === "SYSTEM_ASSIGNED",
      "AUTHORIZATION_DECISION_INVALID_BOUNDARY",
      "service principals must remain machine-scoped inside authority boundaries",
    );
  }

  if (client_delegation_state === "NOT_REQUIRED") {
    assertCondition(
      ["SELF_ACTING", "TENANT_INTERNAL", "SYSTEM_ASSIGNED"].includes(delegation_basis),
      "AUTHORIZATION_DECISION_INVALID_BOUNDARY",
      "delegation basis must stay self/internal/system when client delegation is not required",
    );
  } else {
    assertCondition(
      ["CLIENT_GRANTED", "SELF_ASSESSMENT_IMPORTED", "DIGITAL_HANDSHAKE"].includes(
        delegation_basis,
      ),
      "AUTHORIZATION_DECISION_INVALID_BOUNDARY",
      "explicit client delegation posture requires a client-scoped delegation basis",
    );
  }

  if (delegation_basis === "SELF_ASSESSMENT_IMPORTED" || delegation_basis === "DIGITAL_HANDSHAKE") {
    assertCondition(
      delegation_freshness_state === "CURRENT" ||
        delegation_freshness_state === "REVALIDATION_REQUIRED",
      "AUTHORIZATION_DECISION_INVALID_BOUNDARY",
      "imported or handshake delegation requires explicit freshness posture",
    );
  } else {
    assertCondition(
      delegation_freshness_state === "NOT_APPLICABLE",
      "AUTHORIZATION_DECISION_INVALID_BOUNDARY",
      "non-imported delegation bases must clear delegation_freshness_state",
    );
  }

  if (integration_capability === "INTERNAL_ONLY") {
    assertCondition(
      client_delegation_state === "NOT_REQUIRED" && authority_link_state === "NOT_REQUIRED",
      "AUTHORIZATION_DECISION_INVALID_BOUNDARY",
      "internal-only boundaries must not serialize authority-link or delegation posture",
    );
  } else {
    assertCondition(
      authority_link_state !== "NOT_REQUIRED",
      "AUTHORIZATION_DECISION_INVALID_BOUNDARY",
      "authority-integrated boundaries require explicit authority-link posture",
    );
  }

  if (exceptional_authority_state === "BOUNDED_INTERNAL_EXCEPTION") {
    assertCondition(
      human_gate_resolution_state === "EVIDENCE_FROZEN",
      "AUTHORIZATION_DECISION_INVALID_BOUNDARY",
      "exceptional authority requires frozen human evidence",
    );
  }

  return {
    contract_version,
    binding_scope_class: "AUTHORIZATION_DECISION",
    integration_capability,
    active_principal_class,
    tenant_permission_state,
    client_delegation_state,
    delegation_basis,
    delegation_freshness_state,
    authority_link_state,
    exceptional_authority_state,
    human_gate_requirement,
    human_gate_resolution_state,
    authority_truth_precedence_policy: "EXTERNAL_TRUTH_SUPERSEDES_INTERNAL_EXCEPTION",
    tenant_permission_substitution_policy:
      "INTERNAL_PERMISSION_NEVER_SUFFICIENT_FOR_AUTHORITY_MUTATION",
    link_delegation_independence_policy: "AUTHORITY_LINK_NEVER_PROVES_CLIENT_DELEGATION",
    exceptional_scope_policy: "EXCEPTION_BOUND_TO_APPROVED_ACTION_CLIENT_AND_PARTITIONS",
    service_human_gate_satisfaction_permitted: false,
    exceptional_authority_may_substitute_for_delegation: false,
    exceptional_authority_may_override_authority_truth: false,
    exceptional_authority_may_widen_client_scope: false,
    exceptional_authority_may_widen_partition_scope: false,
  };
}

export function normalizeAuthorizationDecisionRecord(
  input: CreateAuthorizationDecisionInput,
): AuthorizationDecisionRecord {
  try {
    const principal_context_ref = normalizePrincipalContextRef(input.principal_context_ref);
    const resource_class = requireTrimmedString("resource_class", input.resource_class);
    const action_family = requireTrimmedString("action_family", input.action_family);
    const decision = requireTrimmedString(
      "decision",
      input.decision,
    ) as AuthorizationDecisionRecord["decision"];
    const reason_codes = normalizeStringSet("reason_codes", input.reason_codes, { minItems: 1 });
    const effective_scope = normalizeScopeSequence("effective_scope", input.effective_scope, {
      allowEmpty: decision === "DENY",
    });
    const effective_partition_scope_refs = normalizeStringSet(
      "effective_partition_scope_refs",
      input.effective_partition_scope_refs ?? [],
    );
    const masking_rules = normalizeStringSet("masking_rules", input.masking_rules ?? []);
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
          ) as AuthorizationDecisionRecord["required_authn_level"]);
    const policy_snapshot_hash = normalizeHash(
      "policy_snapshot_hash",
      input.policy_snapshot_hash,
      "policy_snapshot",
    );
    const dependency_topology_hash = normalizeOptionalHash(
      "dependency_topology_hash",
      input.dependency_topology_hash,
      "dependency_topology",
    );
    const simulation_basis_hash = normalizeOptionalHash(
      "simulation_basis_hash",
      input.simulation_basis_hash,
      "simulation_basis",
    );
    const delegation_snapshot_refs = normalizeStringSet(
      "delegation_snapshot_refs",
      input.delegation_snapshot_refs ?? [],
    );
    const authority_link_snapshot_refs = normalizeStringSet(
      "authority_link_snapshot_refs",
      input.authority_link_snapshot_refs ?? [],
    );
    const authority_layer_boundary = normalizeAuthorityLayerBoundary(
      input.authority_layer_boundary,
    );
    const approval_requirement =
      input.approval_requirement === null
        ? null
        : (requireTrimmedString(
            "approval_requirement",
            input.approval_requirement,
          ) as AuthorizationDecisionRecord["approval_requirement"]);
    const evaluated_at = normalizeUtcInstantString(input.evaluated_at);
    const bounded_safe_mutation = input.bounded_safe_mutation;
    const principal_context_access_binding_hash = normalizeHash(
      "principal_context_access_binding_hash",
      input.principal_context_access_binding_hash,
      "access_binding",
    );

    assertCondition(
      ["ALLOW", "ALLOW_MASKED", "REQUIRE_STEP_UP", "REQUIRE_APPROVAL", "DENY"].includes(
        decision,
      ),
      "AUTHORIZATION_DECISION_FIELD_REQUIRED",
      "decision must remain one of the canonical authorization postures",
    );

    if (required_authn_level !== null) {
      assertCondition(
        ["BASIC", "MFA", "STEP_UP"].includes(required_authn_level),
        "AUTHORIZATION_DECISION_FIELD_REQUIRED",
        "required_authn_level must be BASIC, MFA, STEP_UP, or null",
      );
    }
    if (approval_requirement !== null) {
      assertCondition(
        [
          "NOT_REQUIRED",
          "SINGLE_APPROVER",
          "DUAL_APPROVER",
          "SECURITY_REVIEW",
          "CHANGE_ADVISORY_QUORUM",
        ].includes(approval_requirement),
        "AUTHORIZATION_DECISION_FIELD_REQUIRED",
        "approval_requirement must remain a governed approval requirement or null",
      );
    }
    assertCondition(
      bounded_safe_mutation === null ||
        bounded_safe_mutation === 0 ||
        bounded_safe_mutation === 1,
      "AUTHORIZATION_DECISION_FIELD_REQUIRED",
      "bounded_safe_mutation must be 0, 1, or null",
    );

    assertCondition(
      decision === "DENY" || effective_scope.length > 0,
      "AUTHORIZATION_DECISION_INVALID_POSTURE",
      "non-deny decisions must retain a non-empty effective_scope",
    );
    assertCondition(
      decision !== "ALLOW" || masking_rules.length === 0,
      "AUTHORIZATION_DECISION_INVALID_POSTURE",
      "ALLOW decisions must not persist masking_rules",
    );
    assertCondition(
      decision !== "ALLOW_MASKED" || masking_rules.length > 0,
      "AUTHORIZATION_DECISION_INVALID_POSTURE",
      "ALLOW_MASKED decisions must retain at least one masking rule",
    );
    assertCondition(
      required_authn_level === null || decision === "REQUIRE_STEP_UP",
      "AUTHORIZATION_DECISION_INVALID_POSTURE",
      "required_authn_level is only legal when decision = REQUIRE_STEP_UP",
    );
    assertCondition(
      decision !== "REQUIRE_STEP_UP" || required_authn_level !== null,
      "AUTHORIZATION_DECISION_INVALID_POSTURE",
      "REQUIRE_STEP_UP decisions must retain required_authn_level",
    );
    assertCondition(
      decision !== "REQUIRE_APPROVAL" || required_approvals.length > 0,
      "AUTHORIZATION_DECISION_INVALID_POSTURE",
      "REQUIRE_APPROVAL decisions must retain required_approvals",
    );

    assertCondition(
      (dependency_topology_hash === null) === (simulation_basis_hash === null),
      "AUTHORIZATION_DECISION_INVALID_POSTURE",
      "dependency_topology_hash and simulation_basis_hash must either both be null or both be populated",
    );
    assertCondition(
      (bounded_safe_mutation === null) === (approval_requirement === null),
      "AUTHORIZATION_DECISION_INVALID_POSTURE",
      "bounded_safe_mutation and approval_requirement must move together",
    );

    if (bounded_safe_mutation === null) {
      assertCondition(
        dependency_topology_hash === null && simulation_basis_hash === null,
        "AUTHORIZATION_DECISION_INVALID_POSTURE",
        "non-governance decisions must clear dependency_topology_hash and simulation_basis_hash",
      );
    }
    if (bounded_safe_mutation === 1) {
      assertCondition(
        approval_requirement === "NOT_REQUIRED",
        "AUTHORIZATION_DECISION_INVALID_POSTURE",
        "bounded_safe_mutation = 1 requires approval_requirement = NOT_REQUIRED",
      );
      assertCondition(
        dependency_topology_hash !== null && simulation_basis_hash !== null,
        "AUTHORIZATION_DECISION_INVALID_POSTURE",
        "bounded-safe governance decisions must retain both governance basis hashes",
      );
    }
    if (bounded_safe_mutation === 0) {
      assertCondition(
        approval_requirement !== null && approval_requirement !== "NOT_REQUIRED",
        "AUTHORIZATION_DECISION_INVALID_POSTURE",
        "bounded_safe_mutation = 0 requires an explicit approval requirement",
      );
      assertCondition(
        dependency_topology_hash !== null && simulation_basis_hash !== null,
        "AUTHORIZATION_DECISION_INVALID_POSTURE",
        "approval-gated governance decisions must retain both governance basis hashes",
      );
    }

    if (decision === "ALLOW") {
      assertCondition(
        authority_layer_boundary.tenant_permission_state === "SATISFIED",
        "AUTHORIZATION_DECISION_INVALID_POSTURE",
        "ALLOW decisions require SATISFIED tenant-permission posture",
      );
    }
    if (decision === "ALLOW_MASKED") {
      assertCondition(
        authority_layer_boundary.tenant_permission_state === "MASKED",
        "AUTHORIZATION_DECISION_INVALID_POSTURE",
        "ALLOW_MASKED decisions require MASKED tenant-permission posture",
      );
    }
    if (decision === "REQUIRE_STEP_UP") {
      assertCondition(
        authority_layer_boundary.human_gate_requirement === "REQUIRE_STEP_UP" ||
          authority_layer_boundary.human_gate_requirement === "REQUIRE_STEP_UP_AND_APPROVAL",
        "AUTHORIZATION_DECISION_INVALID_POSTURE",
        "REQUIRE_STEP_UP decisions must retain step-up human gate posture",
      );
      assertCondition(
        authority_layer_boundary.human_gate_resolution_state === "PENDING_EVIDENCE",
        "AUTHORIZATION_DECISION_INVALID_POSTURE",
        "REQUIRE_STEP_UP decisions must keep PENDING_EVIDENCE boundary state",
      );
    }
    if (decision === "REQUIRE_APPROVAL") {
      assertCondition(
        authority_layer_boundary.human_gate_requirement === "REQUIRE_APPROVAL" ||
          authority_layer_boundary.human_gate_requirement === "REQUIRE_STEP_UP_AND_APPROVAL",
        "AUTHORIZATION_DECISION_INVALID_POSTURE",
        "REQUIRE_APPROVAL decisions must retain approval human-gate posture",
      );
      assertCondition(
        authority_layer_boundary.human_gate_resolution_state === "PENDING_EVIDENCE",
        "AUTHORIZATION_DECISION_INVALID_POSTURE",
        "REQUIRE_APPROVAL decisions must keep PENDING_EVIDENCE boundary state",
      );
    }
    if (decision === "ALLOW" || decision === "ALLOW_MASKED") {
      if (authority_layer_boundary.human_gate_requirement === "NOT_REQUIRED") {
        assertCondition(
          authority_layer_boundary.human_gate_resolution_state === "NOT_REQUIRED",
          "AUTHORIZATION_DECISION_INVALID_POSTURE",
          "allow decisions without a human gate must keep NOT_REQUIRED resolution state",
        );
      } else {
        assertCondition(
          authority_layer_boundary.human_gate_resolution_state === "EVIDENCE_FROZEN",
          "AUTHORIZATION_DECISION_INVALID_POSTURE",
          "allow decisions that depended on a human gate must freeze evidence state",
        );
      }
    }

    if (authority_layer_boundary.integration_capability === "AUTHORITY_INTEGRATED") {
      if (
        ["SATISFIED", "LIMITED", "EXPIRED"].includes(
          authority_layer_boundary.client_delegation_state,
        )
      ) {
        assertCondition(
          delegation_snapshot_refs.length > 0,
          "AUTHORIZATION_DECISION_INVALID_POSTURE",
          "authority-integrated decisions with delegated client posture require delegation_snapshot_refs",
        );
      }
      if (
        authority_layer_boundary.authority_link_state !== "NOT_REQUIRED" &&
        authority_layer_boundary.authority_link_state !== "UNLINKED"
      ) {
        assertCondition(
          authority_link_snapshot_refs.length > 0,
          "AUTHORIZATION_DECISION_INVALID_POSTURE",
          "authority-integrated decisions require authority_link_snapshot_refs unless the link posture is explicitly NOT_REQUIRED or UNLINKED",
        );
      }
    } else {
      assertCondition(
        delegation_snapshot_refs.length === 0 && authority_link_snapshot_refs.length === 0,
        "AUTHORIZATION_DECISION_INVALID_POSTURE",
        "internal-only decisions must not serialize authority-link or delegation snapshot lineage",
      );
    }

    const expectedAccessBindingHash = buildAuthorizationDecisionAccessBindingHash({
      principal_context_access_binding_hash,
      resource_class,
      action_family,
      decision,
      reason_codes,
      effective_scope,
      effective_partition_scope_refs,
      masking_rules,
      required_approvals,
      required_authn_level,
      policy_snapshot_hash,
      delegation_snapshot_refs,
      authority_link_snapshot_refs,
      authority_layer_boundary,
      bounded_safe_mutation,
      approval_requirement,
      dependency_topology_hash,
      simulation_basis_hash,
    });
    const access_binding_hash =
      input.access_binding_hash === undefined
        ? expectedAccessBindingHash
        : normalizeHash("access_binding_hash", input.access_binding_hash, "access_binding");

    if (input.access_binding_hash !== undefined) {
      assertCondition(
        access_binding_hash === expectedAccessBindingHash,
        "AUTHORIZATION_DECISION_ACCESS_BINDING_HASH_MISMATCH",
        "access_binding_hash does not match the canonical authorization-decision binding seed",
      );
    }

    const decision_id =
      input.decision_id === undefined
        ? buildAuthorizationDecisionId({
            principal_context_ref,
            resource_class,
            action_family,
            decision,
            access_binding_hash,
            evaluated_at,
          })
        : requireTrimmedString("decision_id", input.decision_id);

    return {
      artifact_type: input.artifact_type ?? "AuthorizationDecision",
      decision_id,
      principal_context_ref,
      resource_class,
      action_family,
      decision,
      reason_codes,
      effective_scope,
      effective_partition_scope_refs,
      masking_rules,
      required_approvals,
      required_authn_level,
      policy_snapshot_hash,
      access_binding_hash,
      dependency_topology_hash,
      simulation_basis_hash,
      delegation_snapshot_refs,
      authority_link_snapshot_refs,
      authority_layer_boundary,
      bounded_safe_mutation,
      approval_requirement,
      evaluated_at,
    };
  } catch (error) {
    if (error instanceof AuthorizationDecisionModelError) {
      throw error;
    }
    throw new AuthorizationDecisionModelError(
      "AUTHORIZATION_DECISION_FIELD_REQUIRED",
      error instanceof Error ? error.message : "authorization decision normalization failed",
    );
  }
}

export function compareDecisionChronology(
  authorizationEvaluatedAt: ISO8601DateTimeString,
  decisionEvaluatedAt: ISO8601DateTimeString,
) {
  return authorizationEvaluatedAt.localeCompare(decisionEvaluatedAt);
}

import type {
  AuthorizationDecision,
  PrincipalContext,
} from "../../generated-models/src/generated/typescript/authority-and-access.ts";
import type { GovernanceAccessSimulation } from "../../generated-models/src/generated/typescript/governance-and-policy.ts";

import { resolveAuthorityLayerBoundaryContract } from "../../backend-access/src/services/authority_layer_boundary_resolver.ts";
import { buildGovernanceAccessSimulation } from "../../backend-governance/src/projectors/build_governance_access_simulation.ts";
import { stableJsonHash } from "../../domain-kernel/src/primitives/hash.ts";

import type { CompiledAccessCell } from "./access_matrix_compiler.ts";
import { loadAccessInputBundle } from "./role_seed_loader.ts";

export type SimulationScenario = {
  narrative: string;
  principal_context: PrincipalContext;
  scenario_id: string;
  simulation: GovernanceAccessSimulation;
  title: string;
};

function assertAllowedScope(scope: string[]): AuthorizationDecision["effective_scope"] {
  return scope as AuthorizationDecision["effective_scope"];
}

export async function simulateGovernanceAccess(input: {
  compiledCell: CompiledAccessCell;
  governance_target_ref: string | null;
  principal_context: PrincipalContext;
  simulated_at: string;
}) {
  const { compiledCell, governance_target_ref, principal_context, simulated_at } = input;
  const catalog = await loadAccessInputBundle({ reload: true });
  const actionRow = catalog.resourceActionCatalog.action_rows.find(
    (row) => row.action_family === compiledCell.action_family,
  );
  if (!actionRow) {
    throw new Error(`Unknown action family ${compiledCell.action_family}.`);
  }

  const hasClientDelegationBasis =
    principal_context.delegation_basis === "CLIENT_GRANTED" ||
    principal_context.delegation_basis === "DIGITAL_HANDSHAKE" ||
    principal_context.delegation_basis === "SELF_ASSESSMENT_IMPORTED";
  const requiresDelegation = actionRow.client_delegation_requirement === "REQUIRED";
  const serviceHumanBlocked = actionRow.human_only_action && principal_context.principal_type === "SERVICE";
  const explainsClientDelegation =
    (!serviceHumanBlocked && requiresDelegation) ||
    (!serviceHumanBlocked &&
      actionRow.client_delegation_requirement === "OPTIONAL" &&
      hasClientDelegationBasis);
  const delegationSatisfied =
    !requiresDelegation || hasClientDelegationBasis;
  const requiresAuthorityLink = actionRow.authority_link_requirement === "REQUIRED";
  const authorityLinkSatisfied = !requiresAuthorityLink || principal_context.authority_link_refs.length > 0;
  const authorityLinkLifecycleState = requiresAuthorityLink
    ? authorityLinkSatisfied
      ? "AUTHORISED_ACTIVE"
      : "UNLINKED"
    : explainsClientDelegation && delegationSatisfied
      ? "AUTHORISED_ACTIVE"
      : undefined;
  const stepUpSatisfied =
    compiledCell.required_authn_level === null ||
    principal_context.authn_level === "STEP_UP" ||
    (compiledCell.required_authn_level === "MFA" && principal_context.authn_level !== "BASIC");

  let decision: AuthorizationDecision["decision"] = compiledCell.decision;
  const reason_codes = new Set(compiledCell.reason_codes);
  let required_authn_level = compiledCell.required_authn_level;
  let required_approvals = compiledCell.required_approvals;
  const approval_requirement = null;

  if (serviceHumanBlocked) {
    decision = "DENY";
    reason_codes.add("SERVICE_PRINCIPAL_HUMAN_ACTION_BLOCKED");
    required_authn_level = null;
    required_approvals = [];
  } else if (!delegationSatisfied) {
    decision = "DENY";
    reason_codes.add("CLIENT_DELEGATION_REQUIRED");
    required_authn_level = null;
    required_approvals = [];
  } else if (!authorityLinkSatisfied) {
    decision = "DENY";
    reason_codes.add("AUTHORITY_LINK_REQUIRED");
    required_authn_level = null;
    required_approvals = [];
  } else if (compiledCell.decision === "REQUIRE_STEP_UP" && stepUpSatisfied) {
    decision = "ALLOW";
    reason_codes.add("STEP_UP_EVIDENCE_FROZEN");
    required_authn_level = null;
  }

  const boundary = resolveAuthorityLayerBoundaryContract({
    binding_scope_class: "AUTHORIZATION_DECISION",
    integration_capability:
      requiresAuthorityLink || explainsClientDelegation
        ? "AUTHORITY_INTEGRATED"
        : "INTERNAL_ONLY",
    principal_context,
    tenant_permission_state:
      decision === "DENY"
        ? "DENIED"
        : compiledCell.decision === "ALLOW_MASKED"
          ? "MASKED"
          : "SATISFIED",
    delegation: {
      required: explainsClientDelegation,
      state: serviceHumanBlocked
        ? "NOT_REQUIRED"
        : explainsClientDelegation
          ? delegationSatisfied
            ? "SATISFIED"
            : "MISSING"
          : "NOT_REQUIRED",
      freshness_state:
        principal_context.delegation_basis === "SELF_ASSESSMENT_IMPORTED" ||
        principal_context.delegation_basis === "DIGITAL_HANDSHAKE"
          ? principal_context.delegation_snapshot_refs.length > 0
            ? "CURRENT"
            : "REVALIDATION_REQUIRED"
          : undefined,
    },
    authority_link: {
      required: requiresAuthorityLink || explainsClientDelegation,
      lifecycle_state: authorityLinkLifecycleState,
    },
    human_gate: {
      requirement:
        serviceHumanBlocked
          ? "NOT_REQUIRED"
          : compiledCell.decision === "REQUIRE_STEP_UP"
            ? "REQUIRE_STEP_UP"
            : compiledCell.decision === "REQUIRE_APPROVAL"
              ? "REQUIRE_APPROVAL"
              : "NOT_REQUIRED",
      resolution_state:
        serviceHumanBlocked
          ? "NOT_REQUIRED"
          : compiledCell.decision === "REQUIRE_STEP_UP"
            ? stepUpSatisfied
              ? "EVIDENCE_FROZEN"
              : "PENDING_EVIDENCE"
            : compiledCell.decision === "REQUIRE_APPROVAL"
              ? "PENDING_EVIDENCE"
              : "NOT_REQUIRED",
    },
  });

  const authorization_decision = {
    artifact_type: "AuthorizationDecision",
    decision_id: `decision.${principal_context.principal_id}.${compiledCell.resource_class}.${compiledCell.action_family}`,
    principal_context_ref: principal_context.principal_id,
    resource_class: compiledCell.resource_class,
    action_family: compiledCell.action_family,
    decision,
    reason_codes: [...reason_codes].sort(),
    effective_scope: assertAllowedScope(decision === "DENY" ? [] : compiledCell.effective_scope),
    effective_partition_scope_refs:
      decision === "DENY" ? [] : [...principal_context.partition_scope_refs].sort(),
    masking_rules: decision === "ALLOW_MASKED" ? compiledCell.masking_rules : [],
    required_approvals: decision === "REQUIRE_APPROVAL" ? required_approvals : [],
    required_authn_level: decision === "REQUIRE_STEP_UP" ? required_authn_level : null,
    policy_snapshot_hash: principal_context.policy_snapshot_hash,
    access_binding_hash: stableJsonHash({
      access_binding_hash: principal_context.access_binding_hash,
      tuple_ref: compiledCell.tuple_ref,
      decision,
    }),
    dependency_topology_hash: null,
    simulation_basis_hash: null,
    delegation_snapshot_refs: principal_context.delegation_snapshot_refs,
    authority_link_snapshot_refs: principal_context.authority_link_snapshot_refs,
    authority_layer_boundary: boundary,
    bounded_safe_mutation: null,
    approval_requirement,
    evaluated_at: simulated_at,
  } satisfies AuthorizationDecision;

  const simulation = await buildGovernanceAccessSimulation({
    action_family: compiledCell.action_family,
    authorization_decision,
    authorityChainOptions: {
      ...(serviceHumanBlocked
        ? {
            authorityOfRecordOutcome: "DENY" as const,
            authorityOfRecordReasonCodes: [
              "SERVICE_PRINCIPAL_HUMAN_ACTION_BLOCKED",
            ],
          }
        : {}),
      tenantOperationalReasonCodes: compiledCell.reason_codes,
    },
    governance_target_ref,
    mutation_capable: false,
    principal_context,
    resource_class: compiledCell.resource_class,
    simulated_at,
    topology: {
      nodes: [],
    },
  });

  return simulation;
}

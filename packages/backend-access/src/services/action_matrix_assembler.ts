import type {
  PrincipalAccessViewActionMatrixCell,
} from "../../../generated-models/src/generated/typescript/authority-and-access.ts";

import type { AuthorizationDecisionRecord } from "../models/authorization_decision.ts";
import {
  loadGovernancePolicyProjectionInputs,
  type GovernancePolicyProjectionInputs,
} from "../projectors/governance_policy_snapshot_projector.ts";
import {
  loadAuthorizationPolicyRuntime,
  type AuthorizationPolicyRuntime,
} from "./authorization_tuple_evaluator.ts";
import { AuthorityChainStackBuilder } from "./authority_chain_stack_builder.ts";
import {
  normalizeScopeSequence,
  normalizeStringSet,
} from "./principal_context_normalizer.ts";

type DecisionLike = AuthorizationDecisionRecord & {
  evaluated_at: string;
};

export type AssembleActionMatrixInput = {
  authorization_decisions: readonly DecisionLike[];
  effective_role_set: readonly string[];
  frozen_policy_snapshot_hash: string;
};

export type AssembleActionMatrixResult = {
  action_matrix: PrincipalAccessViewActionMatrixCell[];
  source_decision_by_cell_ref: Map<string, DecisionLike>;
};

function joinedPolicyPath(policyPathRefs: Iterable<string>) {
  return normalizeStringSet("policy_path_refs", [...policyPathRefs], {
    minItems: 1,
  }).join(" | ");
}

function tupleRefForDecision(decision: DecisionLike) {
  return `${decision.resource_class}::${decision.action_family}`;
}

function latestDecisionForTuple(decisions: readonly DecisionLike[]) {
  return [...decisions].sort((left, right) => {
    const chronology = right.evaluated_at.localeCompare(left.evaluated_at);
    if (chronology !== 0) {
      return chronology;
    }
    return right.access_binding_hash.localeCompare(left.access_binding_hash);
  })[0]!;
}

function policyPathRefForDecision(input: {
  decision: DecisionLike;
  effective_role_set: readonly string[];
  governance_projection_inputs: GovernancePolicyProjectionInputs;
  frozen_policy_snapshot_hash: string;
  runtime: AuthorizationPolicyRuntime;
}) {
  const pathRefs = new Set<string>();
  const tupleRef = tupleRefForDecision(input.decision);
  const resourceRow = input.runtime.resource_rows_by_class.get(input.decision.resource_class);
  const actionRow = input.runtime.action_rows_by_family.get(input.decision.action_family);

  if (resourceRow) {
    pathRefs.add(resourceRow.policy_path_ref);
  }
  if (actionRow) {
    pathRefs.add(actionRow.policy_path_ref);
  }

  if (input.runtime.policy_snapshot_hash === input.frozen_policy_snapshot_hash) {
    for (const roleId of input.effective_role_set) {
      const roleTemplate = input.runtime.role_templates_by_id.get(roleId);
      const cell = roleTemplate?.cells.find(
        (candidate) =>
          candidate.resource_class === input.decision.resource_class &&
          candidate.action_family === input.decision.action_family &&
          candidate.decision !== "DENY",
      );
      if (cell) {
        pathRefs.add(cell.policy_path_ref);
      }
    }

    const authRule = input.governance_projection_inputs.authentication_level_policy.rules.find(
      (rule) =>
        `${rule.resource_class}::${rule.action_family}` === tupleRef &&
        input.decision.required_authn_level !== null,
    );
    if (authRule) {
      pathRefs.add(authRule.policy_path_ref);
    }

    const approvalRule =
      input.governance_projection_inputs.approval_requirement_resolution.rules.find(
        (rule) =>
          `${rule.resource_class}::${rule.action_family}` === tupleRef &&
          input.decision.required_approvals.length > 0,
      );
    if (approvalRule) {
      pathRefs.add(approvalRule.policy_path_ref);
    }
  } else {
    pathRefs.add(`frozen_policy_snapshot.${input.frozen_policy_snapshot_hash}`);
    pathRefs.add("policy_snapshot_lineage.stale_view");
  }

  if (pathRefs.size === 0) {
    pathRefs.add("resource_action_catalog.implicit_default_deny");
  }
  return joinedPolicyPath(pathRefs);
}

export class ActionMatrixAssembler {
  private readonly authorityChainStackBuilder: AuthorityChainStackBuilder;

  constructor(dependencies?: {
    authorityChainStackBuilder?: AuthorityChainStackBuilder;
  }) {
    this.authorityChainStackBuilder =
      dependencies?.authorityChainStackBuilder ?? new AuthorityChainStackBuilder();
  }

  async assemble(
    input: AssembleActionMatrixInput,
  ): Promise<AssembleActionMatrixResult> {
    const [runtime, governanceProjectionInputs] = await Promise.all([
      loadAuthorizationPolicyRuntime(),
      loadGovernancePolicyProjectionInputs(),
    ]);

    const resourceOrder = new Map(
      governanceProjectionInputs.access_bundle.resourceActionCatalog.resource_rows.map(
        (row, index) => [row.resource_class, index] as const,
      ),
    );
    const actionOrder = new Map(
      governanceProjectionInputs.access_bundle.resourceActionCatalog.action_rows.map(
        (row, index) => [row.action_family, index] as const,
      ),
    );
    const decisionsByTuple = new Map<string, DecisionLike[]>();
    for (const decision of input.authorization_decisions) {
      const tupleRef = tupleRefForDecision(decision);
      const current = decisionsByTuple.get(tupleRef) ?? [];
      current.push(decision);
      decisionsByTuple.set(tupleRef, current);
    }

    const source_decision_by_cell_ref = new Map<string, DecisionLike>();
    const action_matrix = await Promise.all(
      [...decisionsByTuple.entries()].map(async ([tupleRef, decisions]) => {
        const sourceDecision = latestDecisionForTuple(decisions);
        const authority_chain_layers = await this.authorityChainStackBuilder.build({
          authority_layer_boundary: sourceDecision.authority_layer_boundary,
        });
        const cell_ref = `cell.${sourceDecision.resource_class}.${sourceDecision.action_family}`;
        source_decision_by_cell_ref.set(cell_ref, sourceDecision);
        return {
          cell_ref,
          resource_class: sourceDecision.resource_class,
          action_family: sourceDecision.action_family,
          decision: sourceDecision.decision,
          reason_codes: normalizeStringSet(
            `${tupleRef}.reason_codes`,
            sourceDecision.reason_codes,
            { minItems: 1 },
          ),
          effective_scope:
            sourceDecision.decision === "DENY"
              ? []
              : normalizeScopeSequence(
                  `${tupleRef}.effective_scope`,
                  sourceDecision.effective_scope,
                  { allowEmpty: false },
                ),
          masking_rules: normalizeStringSet(
            `${tupleRef}.masking_rules`,
            sourceDecision.masking_rules,
          ),
          required_approvals: normalizeStringSet(
            `${tupleRef}.required_approvals`,
            sourceDecision.required_approvals,
          ),
          required_authn_level:
            sourceDecision.decision === "REQUIRE_STEP_UP"
              ? sourceDecision.required_authn_level
              : null,
          policy_path_ref: policyPathRefForDecision({
            decision: sourceDecision,
            effective_role_set: input.effective_role_set,
            governance_projection_inputs: governanceProjectionInputs,
            frozen_policy_snapshot_hash: input.frozen_policy_snapshot_hash,
            runtime,
          }),
          authority_chain_layers,
        } satisfies PrincipalAccessViewActionMatrixCell;
      }),
    );

    action_matrix.sort((left, right) => {
      const resourceDelta =
        (resourceOrder.get(left.resource_class) ?? Number.MAX_SAFE_INTEGER) -
        (resourceOrder.get(right.resource_class) ?? Number.MAX_SAFE_INTEGER);
      if (resourceDelta !== 0) {
        return resourceDelta;
      }
      const actionDelta =
        (actionOrder.get(left.action_family) ?? Number.MAX_SAFE_INTEGER) -
        (actionOrder.get(right.action_family) ?? Number.MAX_SAFE_INTEGER);
      if (actionDelta !== 0) {
        return actionDelta;
      }
      return left.cell_ref.localeCompare(right.cell_ref);
    });

    return {
      action_matrix,
      source_decision_by_cell_ref,
    };
  }
}

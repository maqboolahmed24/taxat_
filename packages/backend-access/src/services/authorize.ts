import type { AuthorizationDecisionRecord } from "../models/authorization_decision.ts";
import type { PrincipalContextRecord } from "../models/principal_context.ts";
import type {
  AuthorityBoundaryAuthorityLinkState,
  AuthorityBoundaryClientDelegationState,
  AuthorityBoundaryDelegationFreshnessState,
  AuthorityBoundaryExceptionalAuthorityState,
  AuthorityBoundaryHumanGateRequirement,
} from "../models/authority_layer_boundary_contract.ts";
import type { PrincipalContextRepository } from "../repositories/principal_context_repository.ts";
import { resolveAuthorityLayerBoundaryContract } from "./authority_layer_boundary_resolver.ts";
import {
  buildAccessBlockedResponse,
  type AccessBlockedResponse,
} from "./access_blocked_response.ts";
import { AuthorizationDecisionFactory } from "./authorization_decision_factory.ts";
import { AuthorizationDecisionPersistenceService } from "./authorization_decision_persistence_service.ts";
import {
  AuthorizationTupleEvaluator,
  loadAuthorizationPolicyRuntime,
  mapAuthorizationReasonCodes,
  resolveMergedPolicyCell,
} from "./authorization_tuple_evaluator.ts";
import { EffectiveScopeReducer } from "./effective_scope_reducer.ts";
import { PartitionScopeEvaluator, type AuthorizeOperationTarget } from "./partition_scope_evaluator.ts";
import { AuthorityEdgeResolutionService } from "./authority_edge_resolution_service.ts";
import type { AuthorityLinkRepository } from "../repositories/authority_link_repository.ts";
import type { DelegationGrantRepository } from "../repositories/delegation_grant_repository.ts";
import type { ExceptionalAuthorityGrantRepository } from "../repositories/exceptional_authority_grant_repository.ts";
import type { AuthorizationGovernanceBasisInput } from "./authorization_governance_basis.ts";

type AuthorizeErrorCode =
  | "AUTHORIZE_POLICY_SNAPSHOT_MISMATCH"
  | "AUTHORIZE_RESOURCE_ACTION_UNKNOWN";

export class AuthorizeServiceError extends Error {
  readonly code: AuthorizeErrorCode;

  constructor(code: AuthorizeErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "AuthorizeServiceError";
    this.code = code;
  }
}

export type AuthorizeInput = {
  action_family: string;
  evaluated_at: string;
  governance_basis?: AuthorizationGovernanceBasisInput | null;
  operation_target?: AuthorizeOperationTarget;
  persist?: boolean;
  principal_context: PrincipalContextRecord;
  resource_class: string;
  supporting_agent_posture?: boolean;
};

export type AuthorizeResult = {
  authorization_decision: AuthorizationDecisionRecord;
  blocked_response: AccessBlockedResponse | null;
  pending_approval_requirement: AuthorizationDecisionRecord["approval_requirement"];
  pending_required_approvals: string[];
  tuple_evaluations: Awaited<
    ReturnType<AuthorizationTupleEvaluator["evaluate"]>
  >;
};

function rankDelegationState(state: AuthorityBoundaryClientDelegationState) {
  const priority = {
    NOT_REQUIRED: 0,
    SATISFIED: 1,
    LIMITED: 2,
    EXPIRED: 3,
    MISSING: 4,
  } as const;
  return priority[state];
}

function rankAuthorityLinkState(state: AuthorityBoundaryAuthorityLinkState) {
  const priority = {
    NOT_REQUIRED: 0,
    AUTHORISED_ACTIVE: 1,
    AUTHORISED_LIMITED: 2,
    LINK_INITIATED: 3,
    UNLINKED: 4,
    SUPERSEDED: 5,
    EXPIRED: 6,
    REVOKED: 7,
    TOKEN_INVALID: 8,
  } as const;
  return priority[state];
}

function rankDelegationFreshnessState(state: AuthorityBoundaryDelegationFreshnessState) {
  const priority = {
    NOT_APPLICABLE: 0,
    CURRENT: 1,
    REVALIDATION_REQUIRED: 2,
  } as const;
  return priority[state];
}

function aggregateDelegationState(
  values: AuthorityBoundaryClientDelegationState[],
): AuthorityBoundaryClientDelegationState {
  return [...values].sort((left, right) => rankDelegationState(right) - rankDelegationState(left))[0]!;
}

function aggregateAuthorityLinkState(
  values: AuthorityBoundaryAuthorityLinkState[],
): AuthorityBoundaryAuthorityLinkState {
  return [...values].sort((left, right) => rankAuthorityLinkState(right) - rankAuthorityLinkState(left))[0]!;
}

function aggregateDelegationFreshnessState(
  values: AuthorityBoundaryDelegationFreshnessState[],
): AuthorityBoundaryDelegationFreshnessState {
  return [...values].sort(
    (left, right) =>
      rankDelegationFreshnessState(right) - rankDelegationFreshnessState(left),
  )[0]!;
}

function aggregateExceptionalAuthorityState(
  values: AuthorityBoundaryExceptionalAuthorityState[],
): AuthorityBoundaryExceptionalAuthorityState {
  return values.includes("BOUNDED_INTERNAL_EXCEPTION")
    ? "BOUNDED_INTERNAL_EXCEPTION"
    : "NOT_APPLICABLE";
}

function resolveHumanGateRequirement(input: {
  approval_required: boolean;
  step_up_required: boolean;
}): AuthorityBoundaryHumanGateRequirement {
  if (input.step_up_required && input.approval_required) {
    return "REQUIRE_STEP_UP_AND_APPROVAL";
  }
  if (input.step_up_required) {
    return "REQUIRE_STEP_UP";
  }
  if (input.approval_required) {
    return "REQUIRE_APPROVAL";
  }
  return "NOT_REQUIRED";
}

export class AuthorizeService {
  private readonly authorizationDecisionFactory: AuthorizationDecisionFactory;
  private readonly authorizationDecisionPersistenceService:
    | AuthorizationDecisionPersistenceService
    | undefined;
  private readonly authorityEdgeResolutionService: AuthorityEdgeResolutionService;
  private readonly effectiveScopeReducer: EffectiveScopeReducer;
  private readonly partitionScopeEvaluator: PartitionScopeEvaluator;
  private readonly tupleEvaluator: AuthorizationTupleEvaluator;

  constructor(
    private readonly dependencies: {
      authorityLinkRepository: AuthorityLinkRepository;
      delegationGrantRepository: DelegationGrantRepository;
      exceptionalAuthorityGrantRepository: ExceptionalAuthorityGrantRepository;
      principalContextRepository?: PrincipalContextRepository;
      authorizationDecisionFactory?: AuthorizationDecisionFactory;
      authorizationDecisionPersistenceService?: AuthorizationDecisionPersistenceService;
      authorityEdgeResolutionService?: AuthorityEdgeResolutionService;
      effectiveScopeReducer?: EffectiveScopeReducer;
      partitionScopeEvaluator?: PartitionScopeEvaluator;
      tupleEvaluator?: AuthorizationTupleEvaluator;
    },
  ) {
    this.authorizationDecisionFactory =
      dependencies.authorizationDecisionFactory ?? new AuthorizationDecisionFactory();
    this.authorityEdgeResolutionService =
      dependencies.authorityEdgeResolutionService ??
      new AuthorityEdgeResolutionService({
        authorityLinkRepository: dependencies.authorityLinkRepository,
        delegationGrantRepository: dependencies.delegationGrantRepository,
        exceptionalAuthorityGrantRepository:
          dependencies.exceptionalAuthorityGrantRepository,
      });
    this.partitionScopeEvaluator =
      dependencies.partitionScopeEvaluator ??
      new PartitionScopeEvaluator({
        authorityEdgeResolutionService: this.authorityEdgeResolutionService,
      });
    this.tupleEvaluator = dependencies.tupleEvaluator ?? new AuthorizationTupleEvaluator();
    this.effectiveScopeReducer =
      dependencies.effectiveScopeReducer ?? new EffectiveScopeReducer();
    this.authorizationDecisionPersistenceService =
      dependencies.authorizationDecisionPersistenceService ??
      (dependencies.principalContextRepository
        ? new AuthorizationDecisionPersistenceService({
            principalContextRepository: dependencies.principalContextRepository,
          })
        : undefined);
  }

  async authorize(input: AuthorizeInput): Promise<AuthorizeResult> {
    const runtime = await loadAuthorizationPolicyRuntime();
    if (runtime.policy_snapshot_hash !== input.principal_context.policy_snapshot_hash) {
      throw new AuthorizeServiceError(
        "AUTHORIZE_POLICY_SNAPSHOT_MISMATCH",
        `principal context policy snapshot ${input.principal_context.policy_snapshot_hash} does not match runtime snapshot ${runtime.policy_snapshot_hash}`,
      );
    }

    const actionRow = runtime.action_rows_by_family.get(input.action_family);
    const resourceRow = runtime.resource_rows_by_class.get(input.resource_class);
    if (!actionRow || !resourceRow || !resourceRow.action_families.includes(input.action_family)) {
      throw new AuthorizeServiceError(
        "AUTHORIZE_RESOURCE_ACTION_UNKNOWN",
        `unknown access tuple ${input.resource_class}::${input.action_family}`,
      );
    }

    const mergedPolicyCell = await resolveMergedPolicyCell(
      runtime,
      input.principal_context,
      input.resource_class,
      input.action_family,
    );
    const partitionEvaluatorInput = {
      action_family: input.action_family,
      evaluated_at: input.evaluated_at,
      principal_context: input.principal_context,
      requested_partition_scope_refs: input.principal_context.partition_scope_refs,
      requires_authority_link: actionRow.authority_link_requirement === "REQUIRED",
      requires_delegation: actionRow.client_delegation_requirement === "REQUIRED",
      ...(input.operation_target === undefined
        ? {}
        : { operation_target: input.operation_target }),
      ...(input.supporting_agent_posture === undefined
        ? {}
        : { supporting_agent_posture: input.supporting_agent_posture }),
    };
    const partitionEvaluations = await this.partitionScopeEvaluator.evaluate(
      partitionEvaluatorInput,
    );

    const tupleEvaluations = await this.tupleEvaluator.evaluate(
      {
        action_row: actionRow,
        governance_basis: input.governance_basis ?? null,
        merged_policy_cell: mergedPolicyCell,
        partition_evaluations: partitionEvaluations,
        principal_context: input.principal_context,
        requested_scope: input.principal_context.requested_scope,
      },
      runtime,
    );

    const reduction = this.effectiveScopeReducer.reduce({
      requested_scope: input.principal_context.requested_scope,
      requested_partition_scope_refs: input.principal_context.partition_scope_refs,
      tuple_evaluations: tupleEvaluations,
    });

    const clientDelegationState = aggregateDelegationState(
      reduction.tuple_evaluations.map((tuple) => tuple.delegation_state),
    );
    const authorityLinkState = aggregateAuthorityLinkState(
      reduction.tuple_evaluations.map((tuple) => tuple.authority_link_state),
    );
    const delegationFreshnessState = aggregateDelegationFreshnessState(
      reduction.tuple_evaluations.map((tuple) => tuple.delegation_freshness_state),
    );
    const exceptionalAuthorityState = aggregateExceptionalAuthorityState(
      reduction.tuple_evaluations.map((tuple) => tuple.exceptional_authority_state),
    );
    const usedStepUpEvidence = reduction.tuple_evaluations.some((tuple) =>
      tuple.reason_codes.includes("STEP_UP_EVIDENCE_FROZEN"),
    );
    const humanGateRequirement = resolveHumanGateRequirement({
      step_up_required:
        reduction.decision === "REQUIRE_STEP_UP" || usedStepUpEvidence,
      approval_required:
        reduction.decision === "REQUIRE_APPROVAL" ||
        (reduction.decision === "REQUIRE_STEP_UP" &&
          reduction.pending_required_approvals.length > 0),
    });

    const boundary = resolveAuthorityLayerBoundaryContract({
      binding_scope_class: "AUTHORIZATION_DECISION",
      integration_capability:
        actionRow.authority_link_requirement === "REQUIRED" ||
        actionRow.client_delegation_requirement === "REQUIRED"
          ? "AUTHORITY_INTEGRATED"
          : "INTERNAL_ONLY",
      principal_context: input.principal_context,
      tenant_permission_state:
        reduction.decision === "DENY"
          ? "DENIED"
          : reduction.decision === "ALLOW_MASKED"
            ? "MASKED"
            : "SATISFIED",
      delegation: {
        required: actionRow.client_delegation_requirement === "REQUIRED",
        state: clientDelegationState,
        freshness_state: delegationFreshnessState,
      },
      authority_link:
        authorityLinkState === "NOT_REQUIRED"
          ? {
              required: actionRow.authority_link_requirement === "REQUIRED",
            }
          : {
              required: actionRow.authority_link_requirement === "REQUIRED",
              lifecycle_state: authorityLinkState,
            },
      exceptional_authority: {
        active: exceptionalAuthorityState === "BOUNDED_INTERNAL_EXCEPTION",
        state: exceptionalAuthorityState,
        evidence_frozen:
          reduction.decision === "ALLOW" || reduction.decision === "ALLOW_MASKED",
      },
      human_gate: {
        requirement: humanGateRequirement,
        resolution_state:
          reduction.decision === "ALLOW" || reduction.decision === "ALLOW_MASKED"
            ? humanGateRequirement === "NOT_REQUIRED"
              ? "NOT_REQUIRED"
              : "EVIDENCE_FROZEN"
            : humanGateRequirement === "NOT_REQUIRED"
              ? "NOT_REQUIRED"
              : "PENDING_EVIDENCE",
      },
    });

    const authorizationDecision = await this.authorizationDecisionFactory.create({
      principal_context: input.principal_context,
      resource_class: input.resource_class,
      action_family: input.action_family,
      decision: reduction.decision,
      reason_codes: mapAuthorizationReasonCodes(runtime, reduction.reason_codes),
      effective_scope: reduction.effective_scope,
      effective_partition_scope_refs: reduction.effective_partition_scope_refs,
      masking_rules: reduction.masking_rules,
      required_approvals: reduction.required_approvals,
      required_authn_level: reduction.required_authn_level,
      delegation_snapshot_refs:
        boundary.integration_capability === "AUTHORITY_INTEGRATED"
          ? reduction.delegation_snapshot_refs
          : [],
      authority_link_snapshot_refs:
        boundary.integration_capability === "AUTHORITY_INTEGRATED"
          ? reduction.authority_link_snapshot_refs
          : [],
      authority_layer_boundary:
        boundary as AuthorizationDecisionRecord["authority_layer_boundary"],
      evaluated_at: input.evaluated_at,
      bounded_safe_mutation: input.governance_basis?.bounded_safe_mutation ?? null,
      approval_requirement:
        input.governance_basis?.approval_requirement ?? null,
      dependency_topology_hash:
        input.governance_basis?.dependency_topology_hash ?? null,
      simulation_basis_hash: input.governance_basis?.simulation_basis_hash ?? null,
    });

    if (input.persist !== false && this.authorizationDecisionPersistenceService) {
      await this.authorizationDecisionPersistenceService.persist({
        principal_context: input.principal_context,
        authorization_decision: authorizationDecision,
      });
    }

    return {
      authorization_decision: authorizationDecision,
      blocked_response:
        authorizationDecision.decision === "ALLOW" ||
        authorizationDecision.decision === "ALLOW_MASKED"
          ? null
          : buildAccessBlockedResponse({
              authorization_decision: authorizationDecision,
              principal_context_access_binding_hash:
                input.principal_context.access_binding_hash,
              pending_approval_requirement: reduction.approval_requirement,
              pending_required_approvals: reduction.pending_required_approvals,
            }),
      pending_required_approvals: reduction.pending_required_approvals,
      pending_approval_requirement: reduction.approval_requirement,
      tuple_evaluations: reduction.tuple_evaluations,
    };
  }
}

export async function authorize(
  input: AuthorizeInput,
  dependencies: ConstructorParameters<typeof AuthorizeService>[0],
) {
  return new AuthorizeService(dependencies).authorize(input);
}

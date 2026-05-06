import type {
  AuthorityBoundaryAuthorityLinkState,
  AuthorityBoundaryClientDelegationState,
  AuthorityBoundaryDelegationFreshnessState,
  AuthorityBoundaryExceptionalAuthorityState,
} from "../models/authority_layer_boundary_contract.ts";
import type { PrincipalContextRecord } from "../models/principal_context.ts";
import {
  AuthorityEdgeResolutionService,
  type AuthorityEdgeResolutionService as AuthorityEdgeResolutionServiceType,
} from "./authority_edge_resolution_service.ts";
import { ExceptionalAuthorityBudgetService } from "./exceptional_authority_budget_service.ts";

export type AuthorizeOperationTarget = {
  authority_name?: string;
  authority_scope?: string;
  authorised_party_ref?: string;
  client_id?: string;
  provider_api_version?: string;
  provider_environment?: string;
  reporting_subject_ref?: string;
};

export type PartitionScopeEvaluation = {
  authority_link_snapshot_refs: string[];
  authority_link_state: AuthorityBoundaryAuthorityLinkState;
  blocked_reason_codes: string[];
  delegation_freshness_state: AuthorityBoundaryDelegationFreshnessState;
  delegation_snapshot_refs: string[];
  delegation_state: AuthorityBoundaryClientDelegationState;
  exceptional_authority_state: AuthorityBoundaryExceptionalAuthorityState;
  partition_ref: string | null;
};

type RequireOperationTargetInput = {
  action_family: string;
  operation_target: AuthorizeOperationTarget | undefined;
  requires_authority_link: boolean;
  requires_delegation: boolean;
};

function assertOperationTarget(input: RequireOperationTargetInput) {
  const target = input.operation_target;
  if (!input.requires_authority_link && !input.requires_delegation) {
    return;
  }
  if (!target?.reporting_subject_ref) {
    throw new Error(
      `operation_target.reporting_subject_ref is required for ${input.action_family}`,
    );
  }
  if (!target.authority_scope) {
    throw new Error(`operation_target.authority_scope is required for ${input.action_family}`);
  }
  if (input.requires_authority_link) {
    if (!target.client_id) {
      throw new Error(`operation_target.client_id is required for ${input.action_family}`);
    }
    if (!target.authority_name) {
      throw new Error(`operation_target.authority_name is required for ${input.action_family}`);
    }
    if (!target.provider_environment) {
      throw new Error(
        `operation_target.provider_environment is required for ${input.action_family}`,
      );
    }
    if (!target.provider_api_version) {
      throw new Error(
        `operation_target.provider_api_version is required for ${input.action_family}`,
      );
    }
  }
}

export type PartitionScopeEvaluatorInput = {
  action_family: string;
  evaluated_at: string;
  operation_target?: AuthorizeOperationTarget;
  principal_context: PrincipalContextRecord;
  requested_partition_scope_refs: string[];
  requires_authority_link: boolean;
  requires_delegation: boolean;
  supporting_agent_posture?: boolean;
};

export class PartitionScopeEvaluator {
  private readonly authorityEdgeResolutionService: AuthorityEdgeResolutionServiceType;
  private readonly exceptionalAuthorityBudgetService: ExceptionalAuthorityBudgetService;

  constructor(
    private readonly dependencies: {
      authorityEdgeResolutionService: AuthorityEdgeResolutionServiceType;
      exceptionalAuthorityBudgetService?: ExceptionalAuthorityBudgetService;
    },
  ) {
    this.authorityEdgeResolutionService = dependencies.authorityEdgeResolutionService;
    this.exceptionalAuthorityBudgetService =
      dependencies.exceptionalAuthorityBudgetService ?? new ExceptionalAuthorityBudgetService();
  }

  private async evaluateNeutralPartition(
    partitionRef: string | null,
    input: PartitionScopeEvaluatorInput,
  ): Promise<PartitionScopeEvaluation> {
    const supportingAgentBlocked =
      await this.exceptionalAuthorityBudgetService.isMainAgentOnlyBlocked(
        input.supporting_agent_posture === undefined
          ? {
              action_family: input.action_family,
            }
          : {
              action_family: input.action_family,
              supporting_agent_posture: input.supporting_agent_posture,
            },
      );

    return {
      partition_ref: partitionRef,
      delegation_state: "NOT_REQUIRED",
      delegation_freshness_state: "NOT_APPLICABLE",
      authority_link_state: "NOT_REQUIRED",
      exceptional_authority_state: "NOT_APPLICABLE",
      delegation_snapshot_refs: [],
      authority_link_snapshot_refs: [],
      blocked_reason_codes: supportingAgentBlocked ? ["MAIN_AGENT_ONLY_ACTION_FAMILY"] : [],
    };
  }

  async evaluate(input: PartitionScopeEvaluatorInput): Promise<PartitionScopeEvaluation[]> {
    assertOperationTarget({
      action_family: input.action_family,
      operation_target: input.operation_target,
      requires_authority_link: input.requires_authority_link,
      requires_delegation: input.requires_delegation,
    });

    const partitions =
      input.requested_partition_scope_refs.length > 0
        ? [...input.requested_partition_scope_refs]
        : [null];

    const reporting_subject_ref =
      input.operation_target?.reporting_subject_ref ??
      `reporting-subject.synthetic.${input.principal_context.principal_id}`;
    const authority_scope =
      input.operation_target?.authority_scope ?? `authority-scope.${input.action_family}`;
    const authorised_party_ref =
      input.operation_target?.authorised_party_ref ?? reporting_subject_ref;

    return Promise.all(
      partitions.map(async (partitionRef) => {
        const shouldResolveEdge =
          input.requires_authority_link ||
          input.requires_delegation ||
          input.operation_target?.client_id !== undefined;

        if (!shouldResolveEdge) {
          return this.evaluateNeutralPartition(partitionRef, input);
        }

        const client_id =
          input.operation_target?.client_id ??
          `client.synthetic.${input.principal_context.tenant_id}`;
        const resolution = await this.authorityEdgeResolutionService.resolve({
          tenant_id: input.principal_context.tenant_id,
          client_id,
          reporting_subject_ref,
          authorised_party_ref,
          authority_name: input.operation_target?.authority_name ?? "INTERNAL_ONLY",
          authority_scope,
          provider_environment: input.operation_target?.provider_environment ?? "internal",
          provider_api_version: input.operation_target?.provider_api_version ?? "v1",
          action_family: input.action_family,
          evaluated_at: input.evaluated_at,
          partition_scope_refs: partitionRef === null ? [] : [partitionRef],
          requires_delegation: input.requires_delegation,
          requires_authority_link: input.requires_authority_link,
          ...(input.supporting_agent_posture === undefined
            ? {}
            : { supporting_agent_posture: input.supporting_agent_posture }),
        });

        return {
          partition_ref: partitionRef,
          delegation_state: resolution.delegation_state,
          delegation_freshness_state: resolution.delegation_freshness_state,
          authority_link_state: resolution.authority_link_state,
          exceptional_authority_state: resolution.exceptional_authority_state,
          delegation_snapshot_refs:
            resolution.delegation_grant === null
              ? []
              : [resolution.delegation_grant.snapshot_ref],
          authority_link_snapshot_refs:
            resolution.authority_link === null ? [] : [resolution.authority_link.snapshot_ref],
          blocked_reason_codes: [...resolution.blocked_reason_codes],
        };
      }),
    );
  }
}

export function buildDefaultPartitionScopeEvaluator(dependencies: {
  authorityEdgeResolutionService: AuthorityEdgeResolutionServiceType;
}) {
  return new PartitionScopeEvaluator({
    authorityEdgeResolutionService: dependencies.authorityEdgeResolutionService,
  });
}

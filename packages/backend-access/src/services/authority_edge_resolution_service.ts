import type {
  AuthorityBoundaryAuthorityLinkState,
  AuthorityBoundaryClientDelegationState,
  AuthorityBoundaryDelegationFreshnessState,
  AuthorityBoundaryExceptionalAuthorityState,
} from "../models/authority_layer_boundary_contract.ts";
import {
  deriveAuthorityLinkLifecycleState,
  type AuthorityLinkRecord,
} from "../models/authority_link.ts";
import {
  deriveDelegationGrantLifecycleState,
  type DelegationGrantRecord,
} from "../models/delegation_grant.ts";
import {
  deriveExceptionalAuthorityLifecycleState,
  type ExceptionalAuthorityGrantRecord,
} from "../models/exceptional_authority_grant.ts";
import {
  buildAuthorityLinkSnapshotRef,
  type AuthorityLinkRepository,
} from "../repositories/authority_link_repository.ts";
import {
  buildDelegationGrantSnapshotRef,
  type DelegationGrantRepository,
} from "../repositories/delegation_grant_repository.ts";
import {
  buildExceptionalAuthorityGrantSnapshotRef,
  type ExceptionalAuthorityGrantRepository,
} from "../repositories/exceptional_authority_grant_repository.ts";
import { AuthorityLinkBindingHealthService } from "./authority_link_binding_health_service.ts";
import { DelegationFreshnessService } from "./delegation_freshness_service.ts";
import { ExceptionalAuthorityBudgetService } from "./exceptional_authority_budget_service.ts";

export type AuthorityEdgeResolutionInput = {
  action_family: string;
  authority_name: string;
  authority_scope: string;
  authorised_party_ref: string;
  client_id: string;
  evaluated_at: string;
  partition_scope_refs?: string[];
  provider_api_version: string;
  provider_environment: string;
  reporting_subject_ref: string;
  requires_authority_link: boolean;
  requires_delegation: boolean;
  supporting_agent_posture?: boolean;
  tenant_id: string;
};

export type AuthorityEdgeResolution = {
  authority_link:
    | {
        record: AuthorityLinkRecord;
        snapshot_ref: string;
      }
    | null;
  authority_link_state: AuthorityBoundaryAuthorityLinkState;
  blocked_reason_codes: string[];
  delegation_freshness_state: AuthorityBoundaryDelegationFreshnessState;
  delegation_grant:
    | {
        record: DelegationGrantRecord;
        snapshot_ref: string;
      }
    | null;
  delegation_state: AuthorityBoundaryClientDelegationState;
  exceptional_authority_grant:
    | {
        record: ExceptionalAuthorityGrantRecord;
        snapshot_ref: string;
      }
    | null;
  exceptional_authority_state: AuthorityBoundaryExceptionalAuthorityState;
};

function uniqueReasonCodes(...groups: string[][]) {
  return [...new Set(groups.flat())].sort((left, right) => left.localeCompare(right));
}

function withOptionalField<Key extends string, Value>(
  key: Key,
  value: Value | undefined,
) {
  return value === undefined ? {} : ({ [key]: value } as Record<Key, Value>);
}

export class AuthorityEdgeResolutionService {
  private readonly authorityLinkBindingHealthService: AuthorityLinkBindingHealthService;
  private readonly delegationFreshnessService: DelegationFreshnessService;
  private readonly exceptionalAuthorityBudgetService: ExceptionalAuthorityBudgetService;

  constructor(
    private readonly dependencies: {
      authorityLinkRepository: AuthorityLinkRepository;
      delegationGrantRepository: DelegationGrantRepository;
      exceptionalAuthorityGrantRepository: ExceptionalAuthorityGrantRepository;
      authorityLinkBindingHealthService?: AuthorityLinkBindingHealthService;
      delegationFreshnessService?: DelegationFreshnessService;
      exceptionalAuthorityBudgetService?: ExceptionalAuthorityBudgetService;
    },
  ) {
    this.authorityLinkBindingHealthService =
      dependencies.authorityLinkBindingHealthService ??
      new AuthorityLinkBindingHealthService();
    this.delegationFreshnessService =
      dependencies.delegationFreshnessService ?? new DelegationFreshnessService();
    this.exceptionalAuthorityBudgetService =
      dependencies.exceptionalAuthorityBudgetService ??
      new ExceptionalAuthorityBudgetService();
  }

  private async resolveDelegation(
    input: AuthorityEdgeResolutionInput,
  ): Promise<{
    blocked_reason_codes: string[];
    delegation_freshness_state: AuthorityBoundaryDelegationFreshnessState;
    delegation_grant:
      | {
          record: DelegationGrantRecord;
          snapshot_ref: string;
        }
      | null;
    delegation_state: AuthorityBoundaryClientDelegationState;
  }> {
    const requiresDelegation =
      input.requires_delegation || input.authorised_party_ref !== input.reporting_subject_ref;

    if (!requiresDelegation) {
      return {
        delegation_grant: null,
        delegation_state: "NOT_REQUIRED",
        delegation_freshness_state: "NOT_APPLICABLE",
        blocked_reason_codes: [],
      };
    }

    const candidate = await this.dependencies.delegationGrantRepository.findBestCurrentGrant({
      tenant_id: input.tenant_id,
      reporting_subject_ref: input.reporting_subject_ref,
      delegate_ref: input.authorised_party_ref,
      authority_scope_ref: input.authority_scope,
      ...withOptionalField("partition_scope_refs", input.partition_scope_refs),
    });

    if (!candidate) {
      return {
        delegation_grant: null,
        delegation_state: "MISSING",
        delegation_freshness_state: "NOT_APPLICABLE",
        blocked_reason_codes: ["CLIENT_DELEGATION_REQUIRED"],
      };
    }

    const lifecycleState = deriveDelegationGrantLifecycleState(
      candidate.record,
      input.evaluated_at,
    );
    if (["REVOKED", "EXPIRED", "SUPERSEDED"].includes(lifecycleState)) {
      return {
        delegation_grant: candidate,
        delegation_state: "EXPIRED",
        delegation_freshness_state: "REVALIDATION_REQUIRED",
        blocked_reason_codes: ["CLIENT_DELEGATION_EXPIRED"],
      };
    }

    const freshnessResolution = await this.delegationFreshnessService.resolve(
      candidate.record,
      input.evaluated_at,
    );
    const mainAgentOnlyBlocked =
      await this.exceptionalAuthorityBudgetService.isMainAgentOnlyBlocked({
        action_family: input.action_family,
        ...withOptionalField(
          "supporting_agent_posture",
          input.supporting_agent_posture,
        ),
      });

    const delegationState =
      candidate.record.lifecycle_state === "PENDING_VALIDATION"
        ? "MISSING"
        : candidate.record.lifecycle_state === "LIMITED_SCOPE" ||
            candidate.record.limitation_reason_codes.length > 0
          ? "LIMITED"
          : "SATISFIED";
    const blockedReasonCodes = uniqueReasonCodes(
      delegationState === "LIMITED" ? candidate.record.limitation_reason_codes : [],
      freshnessResolution.live_usable ? [] : ["CLIENT_DELEGATION_REVALIDATION_REQUIRED"],
      mainAgentOnlyBlocked ? ["MAIN_AGENT_ONLY_ACTION_FAMILY"] : [],
    );

    if (delegationState === "LIMITED") {
      return {
        delegation_grant: candidate,
        delegation_state: delegationState,
        delegation_freshness_state: freshnessResolution.freshness_state,
        blocked_reason_codes: blockedReasonCodes,
      };
    }

    if (!freshnessResolution.live_usable || mainAgentOnlyBlocked) {
      return {
        delegation_grant: candidate,
        delegation_state: delegationState,
        delegation_freshness_state: freshnessResolution.freshness_state,
        blocked_reason_codes: blockedReasonCodes,
      };
    }

    return {
      delegation_grant: candidate,
      delegation_state: delegationState,
      delegation_freshness_state: freshnessResolution.freshness_state,
      blocked_reason_codes: [],
    };
  }

  private async resolveAuthorityLink(
    input: AuthorityEdgeResolutionInput,
    delegation: Awaited<ReturnType<AuthorityEdgeResolutionService["resolveDelegation"]>>,
  ): Promise<{
    authority_link:
      | {
          record: AuthorityLinkRecord;
          snapshot_ref: string;
        }
      | null;
    authority_link_state: AuthorityBoundaryAuthorityLinkState;
    blocked_reason_codes: string[];
  }> {
    if (!input.requires_authority_link) {
      return {
        authority_link: null,
        authority_link_state: "NOT_REQUIRED",
        blocked_reason_codes: [],
      };
    }

    const candidate = await this.dependencies.authorityLinkRepository.findBestCurrentLink({
      tenant_id: input.tenant_id,
      client_id: input.client_id,
      reporting_subject_ref: input.reporting_subject_ref,
      authorised_party_ref: input.authorised_party_ref,
      authority_name: input.authority_name,
      authority_scope: input.authority_scope,
      provider_environment: input.provider_environment,
      provider_api_version: input.provider_api_version,
      ...withOptionalField("partition_scope_refs", input.partition_scope_refs),
    });

    if (!candidate) {
      return {
        authority_link: null,
        authority_link_state: "UNLINKED",
        blocked_reason_codes: ["AUTHORITY_LINK_REQUIRED"],
      };
    }

    const lifecycleState = deriveAuthorityLinkLifecycleState(candidate.record, input.evaluated_at);
    if (lifecycleState === "SUPERSEDED") {
      return {
        authority_link: candidate,
        authority_link_state: "SUPERSEDED",
        blocked_reason_codes: ["AUTHORITY_LINK_SUPERSEDED"],
      };
    }

    const healthResolution = this.authorityLinkBindingHealthService.resolve(
      candidate.record,
      input.evaluated_at,
    );
    const blockedReasonCodes = uniqueReasonCodes(
      candidate.record.blocked_reason_codes,
      healthResolution.blocked_reason_codes,
      delegation.delegation_state === "SATISFIED" || delegation.delegation_state === "NOT_REQUIRED"
        ? []
        : ["AUTHORITY_LINK_DELEGATION_MISMATCH"],
    );

    return {
      authority_link: {
        record: candidate.record,
        snapshot_ref: candidate.snapshot_ref ?? buildAuthorityLinkSnapshotRef(candidate.record),
      },
      authority_link_state: healthResolution.lifecycle_state,
      blocked_reason_codes: blockedReasonCodes,
    };
  }

  private async resolveExceptionalAuthority(
    input: AuthorityEdgeResolutionInput,
  ): Promise<{
    blocked_reason_codes: string[];
    exceptional_authority_grant:
      | {
          record: ExceptionalAuthorityGrantRecord;
          snapshot_ref: string;
        }
      | null;
    exceptional_authority_state: AuthorityBoundaryExceptionalAuthorityState;
  }> {
    const candidate =
      await this.dependencies.exceptionalAuthorityGrantRepository.findBestCurrentGrant({
        tenant_id: input.tenant_id,
        client_id: input.client_id,
        action_family: input.action_family,
        ...withOptionalField("partition_scope_refs", input.partition_scope_refs),
      });

    if (!candidate) {
      return {
        exceptional_authority_grant: null,
        exceptional_authority_state: "NOT_APPLICABLE",
        blocked_reason_codes: [],
      };
    }

    const lifecycleState = deriveExceptionalAuthorityLifecycleState(
      candidate.record,
      input.evaluated_at,
    );
    if (["REVOKED", "EXPIRED", "EXHAUSTED", "PENDING_APPROVAL"].includes(lifecycleState)) {
      return {
        exceptional_authority_grant: candidate,
        exceptional_authority_state: "NOT_APPLICABLE",
        blocked_reason_codes: ["EXCEPTIONAL_AUTHORITY_NOT_USABLE"],
      };
    }

    const budgetResolution = await this.exceptionalAuthorityBudgetService.resolve(candidate.record, {
      action_family: input.action_family,
      evaluated_at: input.evaluated_at,
      ...withOptionalField("supporting_agent_posture", input.supporting_agent_posture),
    });
    if (!budgetResolution.usable) {
      return {
        exceptional_authority_grant: candidate,
        exceptional_authority_state: "NOT_APPLICABLE",
        blocked_reason_codes: budgetResolution.main_agent_only_blocked
          ? ["MAIN_AGENT_ONLY_ACTION_FAMILY"]
          : ["EXCEPTIONAL_AUTHORITY_NOT_USABLE"],
      };
    }

    return {
      exceptional_authority_grant: {
        record: candidate.record,
        snapshot_ref:
          candidate.snapshot_ref ??
          buildExceptionalAuthorityGrantSnapshotRef(candidate.record),
      },
      exceptional_authority_state: "BOUNDED_INTERNAL_EXCEPTION",
      blocked_reason_codes: [],
    };
  }

  async resolve(input: AuthorityEdgeResolutionInput): Promise<AuthorityEdgeResolution> {
    const delegation = await this.resolveDelegation(input);
    const authorityLink = await this.resolveAuthorityLink(input, delegation);
    const exceptionalAuthority = await this.resolveExceptionalAuthority(input);

    return {
      delegation_grant:
        delegation.delegation_grant === null
          ? null
          : {
              record: delegation.delegation_grant.record,
              snapshot_ref:
                delegation.delegation_grant.snapshot_ref ??
                buildDelegationGrantSnapshotRef(delegation.delegation_grant.record),
            },
      delegation_state: delegation.delegation_state,
      delegation_freshness_state: delegation.delegation_freshness_state,
      authority_link: authorityLink.authority_link,
      authority_link_state: authorityLink.authority_link_state,
      exceptional_authority_grant: exceptionalAuthority.exceptional_authority_grant,
      exceptional_authority_state: exceptionalAuthority.exceptional_authority_state,
      blocked_reason_codes: uniqueReasonCodes(
        delegation.blocked_reason_codes,
        authorityLink.blocked_reason_codes,
        exceptionalAuthority.blocked_reason_codes,
      ),
    };
  }
}

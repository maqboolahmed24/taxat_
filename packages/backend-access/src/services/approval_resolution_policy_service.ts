import type { AuthorizationDecisionRecord } from "../models/authorization_decision.ts";
import { normalizeStringSet, requireTrimmedString } from "./principal_context_normalizer.ts";
import {
  ApprovalCapabilityResolver,
  loadApprovalRequirementResolutionPolicy,
} from "./approval_capability_resolver.ts";

export type AuthorizationApprovalResolution = {
  approval_required: boolean;
  approval_requirement: AuthorizationDecisionRecord["approval_requirement"];
  blocked: boolean;
  blocking_reason_codes: string[];
  pending_required_approvals: string[];
  reason_codes: string[];
  required_approvals: string[];
};

export class ApprovalResolutionPolicyService {
  private readonly approvalCapabilityResolver: ApprovalCapabilityResolver;

  constructor(dependencies?: {
    approvalCapabilityResolver?: ApprovalCapabilityResolver;
  }) {
    this.approvalCapabilityResolver =
      dependencies?.approvalCapabilityResolver ??
      new ApprovalCapabilityResolver();
  }

  async resolveForAuthorization(input: {
    action_family: string;
    governance_basis?:
      | {
          approval_requirement: Exclude<
            AuthorizationDecisionRecord["approval_requirement"],
            null
          >;
          bounded_safe_mutation: Exclude<
            AuthorizationDecisionRecord["bounded_safe_mutation"],
            null
          >;
          commit_authority_posture: "APPROVAL_GATED" | "BOUNDED_SAFE" | "PREVIEW_ONLY";
          required_approvals: string[];
        }
      | null;
    resource_class: string;
  }): Promise<AuthorizationApprovalResolution> {
    const policy = await loadApprovalRequirementResolutionPolicy();
    const actionFamily = requireTrimmedString("action_family", input.action_family);
    const resourceClass = requireTrimmedString("resource_class", input.resource_class);
    const tupleRule =
      policy.rules.find(
        (rule) =>
          rule.resource_class === resourceClass &&
          rule.action_family === actionFamily,
      ) ?? null;
    const governanceApprovalRequired =
      input.governance_basis?.bounded_safe_mutation === 0;
    const requiredApprovals = normalizeStringSet(
      "required_approvals",
      [
        ...(tupleRule?.required_approvals ?? []),
        ...(governanceApprovalRequired
          ? input.governance_basis?.required_approvals ?? []
          : []),
      ],
    );
    const reasonCodes = normalizeStringSet(
      "approval_reason_codes",
      [
        ...(tupleRule?.reason_code === undefined ? [] : [tupleRule.reason_code]),
        ...(governanceApprovalRequired
          ? ["GOVERNANCE_MUTATION_APPROVAL_REQUIRED"]
          : []),
      ],
    );

    if (input.governance_basis?.commit_authority_posture === "PREVIEW_ONLY") {
      return {
        approval_required: false,
        approval_requirement: null,
        required_approvals: [],
        pending_required_approvals: requiredApprovals,
        blocked: true,
        blocking_reason_codes: [
          policy.governance_commit_posture_rules.PREVIEW_ONLY.reason_code!,
        ],
        reason_codes: normalizeStringSet("approval_reason_codes", [
          ...reasonCodes,
          policy.governance_commit_posture_rules.PREVIEW_ONLY.reason_code!,
        ]),
      };
    }

    const approvalRequirement =
      governanceApprovalRequired
        ? input.governance_basis?.approval_requirement ?? null
        : tupleRule?.approval_requirement ?? null;
    const approvalRequired =
      approvalRequirement !== null || requiredApprovals.length > 0;

    return {
      approval_required: approvalRequired,
      approval_requirement: approvalRequirement,
      required_approvals: requiredApprovals,
      pending_required_approvals: requiredApprovals,
      blocked: false,
      blocking_reason_codes: [],
      reason_codes: reasonCodes,
    };
  }

  async evaluateApproverEligibility(input: {
    approval_capabilities: string[];
    approval_requirement: AuthorizationDecisionRecord["approval_requirement"];
    approver_principal_id: string;
    requester_principal_id: string;
    required_approvals?: string[];
  }) {
    return this.approvalCapabilityResolver.evaluateApproverEligibility(input);
  }
}

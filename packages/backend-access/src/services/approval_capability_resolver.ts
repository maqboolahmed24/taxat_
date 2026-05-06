import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { AuthorizationDecisionRecord } from "../models/authorization_decision.ts";
import { normalizeStringSet, requireTrimmedString } from "./principal_context_normalizer.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const approvalRequirementResolutionPath = path.join(
  repoRoot,
  "config",
  "access",
  "approval_requirement_resolution.json",
);

type ApprovalResolutionRule = {
  action_family: string;
  approval_requirement: Exclude<
    AuthorizationDecisionRecord["approval_requirement"],
    null
  >;
  policy_path_ref: string;
  reason_code: string;
  required_approvals: string[];
  resource_class: string;
  rule_ref: string;
};

type GovernanceCommitPostureRule = {
  approval_conversion_permitted: boolean;
  reason_code: string | null;
};

type ApprovalCapabilityResolution = {
  capability: string;
  satisfies_approval_requirements: string[];
  satisfies_named_approvals: string[];
};

export type ApprovalRequirementResolutionPolicy = {
  basis_statement: string;
  capability_resolution: ApprovalCapabilityResolution[];
  contract_version: "APPROVAL_REQUIREMENT_RESOLUTION_V1";
  governance_commit_posture_rules: Record<
    "APPROVAL_GATED" | "BOUNDED_SAFE" | "PREVIEW_ONLY",
    GovernanceCommitPostureRule
  >;
  rules: ApprovalResolutionRule[];
  segregation_of_duties: {
    forbid_requester_self_approval: boolean;
    reason_code: string;
  };
};

export type ApprovalCapabilityMatch = {
  eligible: boolean;
  matched_capabilities: string[];
  matched_required_approvals: string[];
  missing_required_approvals: string[];
  reason_codes: string[];
};

let cachedApprovalRequirementResolutionPolicy:
  | Promise<ApprovalRequirementResolutionPolicy>
  | null = null;

function normalizeApprovalRequirementResolutionPolicy(
  parsed: ApprovalRequirementResolutionPolicy,
): ApprovalRequirementResolutionPolicy {
  if (parsed.contract_version !== "APPROVAL_REQUIREMENT_RESOLUTION_V1") {
    throw new Error("Unexpected approval-requirement resolution policy version.");
  }
  return {
    ...parsed,
    capability_resolution: parsed.capability_resolution.map((entry) => ({
      ...entry,
      capability: requireTrimmedString(
        "approval_requirement_resolution.capability_resolution[].capability",
        entry.capability,
      ),
      satisfies_approval_requirements: normalizeStringSet(
        "approval_requirement_resolution.capability_resolution[].satisfies_approval_requirements",
        entry.satisfies_approval_requirements,
      ),
      satisfies_named_approvals: normalizeStringSet(
        "approval_requirement_resolution.capability_resolution[].satisfies_named_approvals",
        entry.satisfies_named_approvals,
      ),
    })),
    rules: parsed.rules.map((rule) => ({
      ...rule,
      action_family: requireTrimmedString(
        "approval_requirement_resolution.rules[].action_family",
        rule.action_family,
      ),
      resource_class: requireTrimmedString(
        "approval_requirement_resolution.rules[].resource_class",
        rule.resource_class,
      ),
      reason_code: requireTrimmedString(
        "approval_requirement_resolution.rules[].reason_code",
        rule.reason_code,
      ),
      policy_path_ref: requireTrimmedString(
        "approval_requirement_resolution.rules[].policy_path_ref",
        rule.policy_path_ref,
      ),
      required_approvals: normalizeStringSet(
        "approval_requirement_resolution.rules[].required_approvals",
        rule.required_approvals,
        { minItems: 1 },
      ),
    })),
  };
}

export async function loadApprovalRequirementResolutionPolicy(options?: {
  reload?: boolean;
}) {
  if (!cachedApprovalRequirementResolutionPolicy || options?.reload) {
    cachedApprovalRequirementResolutionPolicy = readFile(
      approvalRequirementResolutionPath,
      "utf8",
    ).then((raw) =>
      normalizeApprovalRequirementResolutionPolicy(
        JSON.parse(raw) as ApprovalRequirementResolutionPolicy,
      ),
    );
  }
  return cachedApprovalRequirementResolutionPolicy;
}

export class ApprovalCapabilityResolver {
  async load(options?: { reload?: boolean }) {
    return loadApprovalRequirementResolutionPolicy(options);
  }

  async resolveCapabilityMatch(input: {
    approval_capabilities: string[];
    approval_requirement: AuthorizationDecisionRecord["approval_requirement"];
    required_approvals?: string[];
  }): Promise<ApprovalCapabilityMatch> {
    const policy = await this.load();
    const capabilities = normalizeStringSet(
      "approval_capabilities",
      input.approval_capabilities,
    );
    const requiredApprovals = normalizeStringSet(
      "required_approvals",
      input.required_approvals ?? [],
    );

    const matchedCapabilities = new Set<string>();
    const matchedRequiredApprovals = new Set<string>();

    for (const capability of capabilities) {
      const resolution =
        policy.capability_resolution.find(
          (entry) => entry.capability === capability,
        ) ?? null;
      if (!resolution) {
        continue;
      }

      if (
        input.approval_requirement !== null &&
        resolution.satisfies_approval_requirements.includes(
          input.approval_requirement,
        )
      ) {
        matchedCapabilities.add(capability);
      }

      for (const requiredApproval of requiredApprovals) {
        if (resolution.satisfies_named_approvals.includes(requiredApproval)) {
          matchedCapabilities.add(capability);
          matchedRequiredApprovals.add(requiredApproval);
        }
      }
    }

    const missingRequiredApprovals = requiredApprovals.filter(
      (requiredApproval) => !matchedRequiredApprovals.has(requiredApproval),
    );
    const eligible =
      input.approval_requirement === null && requiredApprovals.length === 0
        ? true
        : requiredApprovals.length > 0
          ? matchedRequiredApprovals.size > 0
          : matchedCapabilities.size > 0;

    return {
      eligible,
      matched_capabilities: [...matchedCapabilities].sort((left, right) =>
        left.localeCompare(right),
      ),
      matched_required_approvals: [...matchedRequiredApprovals].sort(
        (left, right) => left.localeCompare(right),
      ),
      missing_required_approvals: missingRequiredApprovals,
      reason_codes: eligible ? [] : ["APPROVER_CAPABILITY_MISSING"],
    };
  }

  async evaluateApproverEligibility(input: {
    approval_capabilities: string[];
    approval_requirement: AuthorizationDecisionRecord["approval_requirement"];
    approver_principal_id: string;
    requester_principal_id: string;
    required_approvals?: string[];
  }) {
    const policy = await this.load();
    if (
      policy.segregation_of_duties.forbid_requester_self_approval &&
      requireTrimmedString(
        "approver_principal_id",
        input.approver_principal_id,
      ) === requireTrimmedString("requester_principal_id", input.requester_principal_id)
    ) {
      return {
        eligible: false,
        matched_capabilities: [],
        matched_required_approvals: [],
        missing_required_approvals: normalizeStringSet(
          "required_approvals",
          input.required_approvals ?? [],
        ),
        reason_codes: [policy.segregation_of_duties.reason_code],
      } satisfies ApprovalCapabilityMatch;
    }
    return this.resolveCapabilityMatch(input);
  }
}

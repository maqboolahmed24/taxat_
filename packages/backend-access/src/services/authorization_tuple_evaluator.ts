import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { AuthorizationDecisionRecord } from "../models/authorization_decision.ts";
import type { PrincipalContextRecord } from "../models/principal_context.ts";
import {
  normalizeScopeSequence,
  normalizeStringSet,
  requireTrimmedString,
} from "./principal_context_normalizer.ts";
import type { PartitionScopeEvaluation } from "./partition_scope_evaluator.ts";
import { ApprovalResolutionPolicyService } from "./approval_resolution_policy_service.ts";
import type { AuthorizationGovernanceBasisInput } from "./authorization_governance_basis.ts";
import {
  MaskingProjectionPolicy,
  type MaskingProjectionTokenEvaluation,
} from "./masking_projection_policy.ts";
import { StepUpPolicyService } from "./step_up_policy_service.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const accessMatrixPath = path.join(repoRoot, "config", "access", "access_control_matrix.json");
const resourceActionCatalogPath = path.join(
  repoRoot,
  "config",
  "access",
  "resource_action_catalog.json",
);
const authorizationReasonCodeMapPath = path.join(
  repoRoot,
  "config",
  "access",
  "authorization_reason_code_map.json",
);

type RuntimeCompiledAccessCell = {
  action_family: string;
  approval_requirement: AuthorizationDecisionRecord["approval_requirement"];
  decision: AuthorizationDecisionRecord["decision"];
  effective_scope: string[];
  masking_rules: string[];
  policy_path_ref: string;
  reason_codes: string[];
  required_approvals: string[];
  required_authn_level: AuthorizationDecisionRecord["required_authn_level"];
  resource_class: string;
  tuple_ref: string;
};

type RuntimeMatrixRoleTemplate = {
  role_id: string;
  cells: RuntimeCompiledAccessCell[];
};

type RuntimeAccessMatrix = {
  contract_version: "ACCESS_CONTROL_MATRIX_V1";
  policy_snapshot_hash: string;
  role_templates: RuntimeMatrixRoleTemplate[];
};

export type AuthorizationActionRow = {
  action_family: string;
  authority_link_requirement: "NOT_REQUIRED" | "REQUIRED";
  client_delegation_requirement: "NOT_REQUIRED" | "OPTIONAL" | "REQUIRED";
  default_scope_profile: string;
  display_label: string;
  human_only_action: boolean;
  masked_variant_supported: boolean;
  policy_path_ref: string;
};

type AuthorizationResourceRow = {
  action_families: string[];
  display_label: string;
  policy_path_ref: string;
  resource_class: string;
};

type RuntimeResourceActionCatalog = {
  catalog_version: "RESOURCE_ACTION_CATALOG_V1";
  scope_profiles: Record<string, string[]>;
  action_rows: AuthorizationActionRow[];
  resource_rows: AuthorizationResourceRow[];
};

type AuthorizationReasonCodeMapArtifact = {
  basis_statement: string;
  client_portal_action_capabilities: Array<{
    action_family: string;
    denial_reason_code: string;
    required_capability: string;
  }>;
  contract_version: "AUTHORIZATION_REASON_CODE_MAP_V1";
  mappings: Array<{
    final_reason_code: string;
    internal_reason_code: string;
  }>;
};

export type AuthorizationPolicyRuntime = {
  access_matrix: RuntimeAccessMatrix;
  action_rows_by_family: Map<string, AuthorizationActionRow>;
  client_portal_capability_by_action: Map<
    string,
    {
      denial_reason_code: string;
      required_capability: string;
    }
  >;
  policy_snapshot_hash: string;
  reason_code_mappings: Map<string, string>;
  resource_rows_by_class: Map<string, AuthorizationResourceRow>;
  role_templates_by_id: Map<string, RuntimeMatrixRoleTemplate>;
};

const decisionPriority = {
  DENY: 5,
  REQUIRE_APPROVAL: 4,
  REQUIRE_STEP_UP: 3,
  ALLOW_MASKED: 2,
  ALLOW: 1,
} as const;

const authnLevelPriority = {
  BASIC: 0,
  MFA: 1,
  STEP_UP: 2,
} as const;

let cachedRuntime: Promise<AuthorizationPolicyRuntime> | null = null;

function compareDecisionSeverity(
  left: AuthorizationDecisionRecord["decision"],
  right: AuthorizationDecisionRecord["decision"],
) {
  return decisionPriority[left] - decisionPriority[right];
}

function sortAuthnRequirement(
  values: Array<AuthorizationDecisionRecord["required_authn_level"]>,
): AuthorizationDecisionRecord["required_authn_level"] {
  return values
    .filter(
      (value): value is Exclude<AuthorizationDecisionRecord["required_authn_level"], null> =>
        value !== null,
    )
    .sort(
      (left, right) => authnLevelPriority[right] - authnLevelPriority[left],
    )[0] ?? null;
}

function uniqueReasonCodes(...groups: string[][]) {
  return [...new Set(groups.flat().map((value) => requireTrimmedString("reason_code", value)))].sort(
    (left, right) => left.localeCompare(right),
  );
}

function mergeRuntimeCells(cells: readonly RuntimeCompiledAccessCell[]) {
  const winner = [...cells].sort((left, right) =>
    compareDecisionSeverity(right.decision, left.decision),
  )[0]!;
  return {
    action_family: winner.action_family,
    approval_requirement:
      winner.decision === "REQUIRE_APPROVAL" ? winner.approval_requirement : null,
    decision: winner.decision,
    effective_scope:
      winner.decision === "DENY"
        ? []
        : normalizeScopeSequence(
            "merged_cell.effective_scope",
            cells.flatMap((cell) => (cell.decision === "DENY" ? [] : cell.effective_scope)),
            { allowEmpty: false },
          ),
    masking_rules:
      winner.decision === "ALLOW_MASKED"
        ? normalizeStringSet(
            "merged_cell.masking_rules",
            cells.flatMap((cell) =>
              cell.decision === "ALLOW_MASKED" ? cell.masking_rules : [],
            ),
          )
        : [],
    policy_path_ref: [...new Set(cells.map((cell) => cell.policy_path_ref))]
      .sort((left, right) => left.localeCompare(right))[0]!,
    reason_codes: uniqueReasonCodes(...cells.map((cell) => cell.reason_codes)),
    required_approvals:
      winner.decision === "REQUIRE_APPROVAL"
        ? normalizeStringSet(
            "merged_cell.required_approvals",
            cells.flatMap((cell) =>
              cell.decision === "REQUIRE_APPROVAL" ? cell.required_approvals : [],
            ),
          )
        : [],
    required_authn_level:
      winner.decision === "REQUIRE_STEP_UP"
        ? sortAuthnRequirement(cells.map((cell) => cell.required_authn_level))
        : null,
    resource_class: winner.resource_class,
    tuple_ref: winner.tuple_ref,
  } satisfies RuntimeCompiledAccessCell;
}

function syntheticDenyCell(resourceClass: string, actionFamily: string, label: string) {
  return {
    action_family: actionFamily,
    approval_requirement: null,
    decision: "DENY",
    effective_scope: [],
    masking_rules: [],
    policy_path_ref: label,
    reason_codes: ["NO_ROLE_GRANT"],
    required_approvals: [],
    required_authn_level: null,
    resource_class: resourceClass,
    tuple_ref: `${resourceClass}::${actionFamily}`,
  } satisfies RuntimeCompiledAccessCell;
}

async function loadAuthorizationPolicyRuntimeInternal(): Promise<AuthorizationPolicyRuntime> {
  const [
    accessMatrixRaw,
    resourceActionCatalogRaw,
    authorizationReasonCodeMapRaw,
  ] = await Promise.all([
    readFile(accessMatrixPath, "utf8"),
    readFile(resourceActionCatalogPath, "utf8"),
    readFile(authorizationReasonCodeMapPath, "utf8"),
  ]);

  const access_matrix = JSON.parse(accessMatrixRaw) as RuntimeAccessMatrix;
  const resource_action_catalog = JSON.parse(
    resourceActionCatalogRaw,
  ) as RuntimeResourceActionCatalog;
  const reason_code_map = JSON.parse(
    authorizationReasonCodeMapRaw,
  ) as AuthorizationReasonCodeMapArtifact;

  return {
    access_matrix,
    policy_snapshot_hash: requireTrimmedString(
      "access_control_matrix.policy_snapshot_hash",
      access_matrix.policy_snapshot_hash,
    ),
    role_templates_by_id: new Map(
      access_matrix.role_templates.map((template) => [template.role_id, template] as const),
    ),
    action_rows_by_family: new Map(
      resource_action_catalog.action_rows.map((row) => [row.action_family, row] as const),
    ),
    resource_rows_by_class: new Map(
      resource_action_catalog.resource_rows.map((row) => [row.resource_class, row] as const),
    ),
    reason_code_mappings: new Map(
      reason_code_map.mappings.map((mapping) => [
        mapping.internal_reason_code,
        mapping.final_reason_code,
      ] as const),
    ),
    client_portal_capability_by_action: new Map(
      reason_code_map.client_portal_action_capabilities.map((mapping) => [
        mapping.action_family,
        {
          denial_reason_code: mapping.denial_reason_code,
          required_capability: mapping.required_capability,
        },
      ] as const),
    ),
  };
}

export async function loadAuthorizationPolicyRuntime(options?: { reload?: boolean }) {
  if (!cachedRuntime || options?.reload) {
    cachedRuntime = loadAuthorizationPolicyRuntimeInternal();
  }
  return cachedRuntime;
}

export async function resolveMergedPolicyCell(
  runtime: AuthorizationPolicyRuntime,
  principalContext: PrincipalContextRecord,
  resourceClass: string,
  actionFamily: string,
) {
  const tupleRef = `${resourceClass}::${actionFamily}`;
  const roleIds = normalizeStringSet(
    "effective_role_set",
    principalContext.effective_role_set,
    { minItems: 1 },
  );
  const cells = roleIds.map((roleId) => {
    const template = runtime.role_templates_by_id.get(roleId);
    if (!template) {
      return syntheticDenyCell(resourceClass, actionFamily, `effective_role_set.${roleId}`);
    }
    const cell = template.cells.find((entry) => entry.tuple_ref === tupleRef);
    return cell ?? syntheticDenyCell(resourceClass, actionFamily, `tuple.${tupleRef}`);
  });
  return mergeRuntimeCells(cells);
}

export function mapAuthorizationReasonCodes(
  runtime: AuthorizationPolicyRuntime,
  reasonCodes: readonly string[],
) {
  return normalizeStringSet(
    "authorization_reason_codes",
    reasonCodes.map((code) => runtime.reason_code_mappings.get(code) ?? code),
  );
}

export type AuthorizationTupleEvaluation = {
  approval_path: boolean;
  approval_requirement: AuthorizationDecisionRecord["approval_requirement"];
  authority_link_snapshot_refs: string[];
  authority_link_state: PartitionScopeEvaluation["authority_link_state"];
  blocked: boolean;
  delegation_freshness_state: PartitionScopeEvaluation["delegation_freshness_state"];
  delegation_snapshot_refs: string[];
  delegation_state: PartitionScopeEvaluation["delegation_state"];
  direct_allow: boolean;
  exceptional_authority_state: PartitionScopeEvaluation["exceptional_authority_state"];
  masking_active: boolean;
  partition_ref: string | null;
  reason_codes: string[];
  required_approvals: string[];
  required_authn_level: AuthorizationDecisionRecord["required_authn_level"];
  scope_token: string;
  step_up_path: boolean;
  tuple_ref: string;
};

export type AuthorizationTupleEvaluatorInput = {
  action_row: AuthorizationActionRow;
  governance_basis?: AuthorizationGovernanceBasisInput | null;
  merged_policy_cell: RuntimeCompiledAccessCell;
  partition_evaluations: PartitionScopeEvaluation[];
  principal_context: PrincipalContextRecord;
  requested_scope: string[];
};

export class AuthorizationTupleEvaluator {
  constructor(
    private readonly dependencies?: {
      approvalResolutionPolicyService?: ApprovalResolutionPolicyService;
      maskingProjectionPolicy?: MaskingProjectionPolicy;
      stepUpPolicyService?: StepUpPolicyService;
    },
  ) {}

  private get maskingProjectionPolicy() {
    return this.dependencies?.maskingProjectionPolicy ?? new MaskingProjectionPolicy();
  }

  private get approvalResolutionPolicyService() {
    return (
      this.dependencies?.approvalResolutionPolicyService ??
      new ApprovalResolutionPolicyService()
    );
  }

  private get stepUpPolicyService() {
    return this.dependencies?.stepUpPolicyService ?? new StepUpPolicyService();
  }

  private evaluatePortalCapability(
    runtime: AuthorizationPolicyRuntime,
    actionFamily: string,
    principalContext: PrincipalContextRecord,
  ) {
    const requirement = runtime.client_portal_capability_by_action.get(actionFamily);
    if (!requirement) {
      return [] as string[];
    }
    return principalContext.client_portal_capabilities.includes(requirement.required_capability)
      ? []
      : [requirement.denial_reason_code];
  }

  async evaluate(
    input: AuthorizationTupleEvaluatorInput,
    runtime: AuthorizationPolicyRuntime,
  ): Promise<AuthorizationTupleEvaluation[]> {
    const tupleRef = `${input.merged_policy_cell.resource_class}::${input.merged_policy_cell.action_family}`;
    const requestedScope = normalizeScopeSequence("requested_scope", input.requested_scope);
    const portalBlockedReasonCodes = this.evaluatePortalCapability(
      runtime,
      input.action_row.action_family,
      input.principal_context,
    );
    const approvalResolution =
      await this.approvalResolutionPolicyService.resolveForAuthorization({
        resource_class: input.merged_policy_cell.resource_class,
        action_family: input.merged_policy_cell.action_family,
        governance_basis: input.governance_basis ?? null,
      });

    return Promise.all(
      requestedScope.flatMap((scopeToken) =>
        input.partition_evaluations.map(async (partitionEvaluation) => {
          const exceptionalAuthorityActive =
            partitionEvaluation.exceptional_authority_state ===
            "BOUNDED_INTERNAL_EXCEPTION";
          const maskingEvaluation: MaskingProjectionTokenEvaluation =
            this.maskingProjectionPolicy.evaluateToken({
              action_family: input.action_row.action_family,
              masked_variant_supported: input.action_row.masked_variant_supported,
              masking_rules: input.merged_policy_cell.masking_rules,
              policy_decision: input.merged_policy_cell.decision,
              scope_token: scopeToken,
            });

          const policyAllow =
            input.merged_policy_cell.decision !== "DENY" &&
            input.merged_policy_cell.effective_scope.includes(scopeToken) &&
            maskingEvaluation.legal;

          const principalClassBlocked =
            input.action_row.human_only_action &&
            input.principal_context.principal_type === "SERVICE"
              ? ["SERVICE_PRINCIPAL_HUMAN_ACTION_BLOCKED"]
              : [];
          const coreBlockedReasonCodes = uniqueReasonCodes(
            portalBlockedReasonCodes,
            principalClassBlocked,
            partitionEvaluation.blocked_reason_codes,
            maskingEvaluation.blocked_reason_codes,
          );

          const coreCover = policyAllow && coreBlockedReasonCodes.length === 0;
          const stepUpResolution =
            await this.stepUpPolicyService.resolveForAuthorization({
              resource_class: input.merged_policy_cell.resource_class,
              action_family: input.merged_policy_cell.action_family,
              principal_context: input.principal_context,
              exceptional_authority_active: exceptionalAuthorityActive,
            });
          const stepUpGap =
            stepUpResolution.step_up_required && !stepUpResolution.step_up_satisfied;
          const approvalGap =
            !approvalResolution.blocked && approvalResolution.approval_required;
          const governanceGap =
            !approvalResolution.blocked &&
            input.governance_basis?.bounded_safe_mutation === 0;

          const direct_allow =
            coreCover &&
            !stepUpGap &&
            !approvalGap &&
            !governanceGap &&
            !approvalResolution.blocked;
          const step_up_path = coreCover && stepUpGap;
          const approval_path =
            coreCover &&
            !stepUpGap &&
            !approvalResolution.blocked &&
            (approvalGap || governanceGap);
          const blocked = !direct_allow && !step_up_path && !approval_path;

          const candidateReasonCodes = uniqueReasonCodes(
            input.merged_policy_cell.reason_codes.filter(
              (code) =>
                !(
                  stepUpResolution.required_authn_level !== null &&
                  !stepUpGap &&
                  (stepUpResolution.reason_codes.includes(code) ||
                    stepUpResolution.policy_requirement_reason_code === code)
                ),
            ),
            partitionEvaluation.delegation_state === "SATISFIED"
              ? ["CLIENT_DELEGATION_BOUND"]
              : [],
            partitionEvaluation.authority_link_state === "AUTHORISED_ACTIVE"
              ? ["AUTHORITY_LINK_ACTIVE"]
              : [],
            stepUpResolution.reason_codes,
            approvalResolution.reason_codes,
          );
          const blockedReasonCodes = uniqueReasonCodes(
            coreBlockedReasonCodes,
            approvalResolution.blocked
              ? approvalResolution.blocking_reason_codes
              : [],
            policyAllow ? [] : ["NO_ROLE_GRANT"],
          );

          return {
            tuple_ref: `${tupleRef}::${scopeToken}::${partitionEvaluation.partition_ref ?? "GLOBAL"}`,
            scope_token: scopeToken,
            partition_ref: partitionEvaluation.partition_ref,
            direct_allow,
            step_up_path,
            approval_path,
            blocked,
            masking_active: maskingEvaluation.active,
            reason_codes: blocked ? blockedReasonCodes : candidateReasonCodes,
            required_authn_level: step_up_path
              ? stepUpResolution.required_authn_level
              : null,
            required_approvals:
              approval_path || step_up_path
                ? approvalResolution.pending_required_approvals
                : [],
            approval_requirement:
              approval_path || step_up_path
                ? approvalResolution.approval_requirement
                : null,
            delegation_state: partitionEvaluation.delegation_state,
            delegation_freshness_state:
              partitionEvaluation.delegation_freshness_state,
            authority_link_state: partitionEvaluation.authority_link_state,
            exceptional_authority_state:
              partitionEvaluation.exceptional_authority_state,
            delegation_snapshot_refs: [...partitionEvaluation.delegation_snapshot_refs],
            authority_link_snapshot_refs: [
              ...partitionEvaluation.authority_link_snapshot_refs,
            ],
          };
        }),
      ),
    );
  }
}

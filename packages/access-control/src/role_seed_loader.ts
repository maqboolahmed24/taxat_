import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sortSetLikeStrings } from "../../domain-kernel/src/primitives/hash.ts";

export type DecisionCode =
  | "ALLOW"
  | "ALLOW_MASKED"
  | "REQUIRE_STEP_UP"
  | "REQUIRE_APPROVAL"
  | "DENY";

export type ScopeProfileRef = "READ_ONLY" | "OPERATE_PREPARE_ONLY" | "OPERATE_SUBMIT" | "AMENDMENT";

export type RequirementRef = "NOT_REQUIRED" | "OPTIONAL" | "REQUIRED";

export type ApprovalRequirementRef =
  | "NOT_REQUIRED"
  | "SINGLE_APPROVER"
  | "DUAL_APPROVER"
  | "SECURITY_REVIEW"
  | "CHANGE_ADVISORY_QUORUM";

export type ActionCatalogRow = {
  action_family: string;
  authority_link_requirement: RequirementRef;
  client_delegation_requirement: RequirementRef;
  default_scope_profile: ScopeProfileRef;
  display_label: string;
  human_only_action: boolean;
  masked_variant_supported: boolean;
  policy_path_ref: string;
};

export type ResourceCatalogRow = {
  action_families: string[];
  display_label: string;
  policy_path_ref: string;
  resource_class: string;
};

export type ResourceActionCatalog = {
  action_rows: ActionCatalogRow[];
  basis_statement: string;
  catalog_version: "RESOURCE_ACTION_CATALOG_V1";
  resource_rows: ResourceCatalogRow[];
  scope_profiles: Record<ScopeProfileRef, string[]>;
};

export type RoleGrantGroup = {
  action_families: string[];
  decision: Extract<DecisionCode, "ALLOW" | "ALLOW_MASKED">;
  effective_scope_profile: ScopeProfileRef;
  grant_group_ref: string;
  masking_rules?: string[];
  policy_path_ref?: string;
  reason_codes: string[];
  resource_classes: string[];
};

export type DefaultRoleSeed = {
  actor_profiles: string[];
  approval_capabilities: string[];
  client_portal_capabilities: string[];
  description: string;
  grant_groups: RoleGrantGroup[];
  principal_types: Array<"HUMAN" | "SERVICE" | "EXTERNAL">;
  role_id: string;
  role_label: string;
  run_kind_capabilities: string[];
};

export type DefaultRoleSeedBundle = {
  basis_statement: string;
  role_seed_version: "DEFAULT_ROLE_SEEDS_V1";
  roles: DefaultRoleSeed[];
};

export type ApprovalPolicyRule = {
  action_family: string;
  approval_requirement: Exclude<ApprovalRequirementRef, "NOT_REQUIRED">;
  policy_path_ref: string;
  reason_code: string;
  required_approvals: string[];
  resource_class: string;
  rule_ref: string;
};

export type ApprovalPolicy = {
  basis_statement: string;
  policy_version: "ACCESS_APPROVAL_POLICY_V1";
  rules: ApprovalPolicyRule[];
};

export type StepUpPolicyRule = {
  action_family: string;
  policy_path_ref: string;
  reason_code: string;
  required_authn_level: "MFA" | "STEP_UP";
  resource_class: string;
  rule_ref: string;
};

export type StepUpPolicy = {
  basis_statement: string;
  policy_version: "ACCESS_STEP_UP_POLICY_V1";
  rules: StepUpPolicyRule[];
};

export type AccessInputBundle = {
  approvalPolicy: ApprovalPolicy;
  resourceActionCatalog: ResourceActionCatalog;
  roleSeeds: DefaultRoleSeedBundle;
  stepUpPolicy: StepUpPolicy;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..");
const configDir = path.join(repoRoot, "config", "access");
const inputPaths = {
  approvalPolicy: path.join(configDir, "approval_policy.json"),
  resourceActionCatalog: path.join(configDir, "resource_action_catalog.json"),
  roleSeeds: path.join(configDir, "default_roles.json"),
  stepUpPolicy: path.join(configDir, "step_up_policy.json"),
} as const;

let cachedBundle: Promise<AccessInputBundle> | null = null;

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function validateCatalog(catalog: ResourceActionCatalog) {
  assert(catalog.catalog_version === "RESOURCE_ACTION_CATALOG_V1", "Unexpected access catalog version.");
  const actionRefs = new Set<string>();
  for (const row of catalog.action_rows) {
    assert(!actionRefs.has(row.action_family), `Duplicate action family ${row.action_family}.`);
    actionRefs.add(row.action_family);
    assert(catalog.scope_profiles[row.default_scope_profile] !== undefined, `Unknown scope profile ${row.default_scope_profile}.`);
  }
  const resourceRefs = new Set<string>();
  for (const row of catalog.resource_rows) {
    assert(!resourceRefs.has(row.resource_class), `Duplicate resource class ${row.resource_class}.`);
    resourceRefs.add(row.resource_class);
    for (const actionFamily of row.action_families) {
      assert(actionRefs.has(actionFamily), `Resource ${row.resource_class} references unknown action ${actionFamily}.`);
    }
  }
}

function validateRoleSeeds(bundle: DefaultRoleSeedBundle, catalog: ResourceActionCatalog) {
  assert(bundle.role_seed_version === "DEFAULT_ROLE_SEEDS_V1", "Unexpected default role seed version.");
  const roleRefs = new Set<string>();
  const resourceRefs = new Set(catalog.resource_rows.map((row) => row.resource_class));
  const actionRefs = new Set(catalog.action_rows.map((row) => row.action_family));
  for (const role of bundle.roles) {
    assert(!roleRefs.has(role.role_id), `Duplicate role seed ${role.role_id}.`);
    roleRefs.add(role.role_id);
    assert(role.grant_groups.length > 0, `Role ${role.role_id} must declare at least one grant group.`);
    for (const grantGroup of role.grant_groups) {
      assert(
        grantGroup.decision === "ALLOW" || grantGroup.decision === "ALLOW_MASKED",
        `Grant group ${role.role_id}/${grantGroup.grant_group_ref} must remain allow-based.`,
      );
      assert(
        catalog.scope_profiles[grantGroup.effective_scope_profile] !== undefined,
        `Grant group ${role.role_id}/${grantGroup.grant_group_ref} references unknown scope profile ${grantGroup.effective_scope_profile}.`,
      );
      for (const resourceClass of grantGroup.resource_classes) {
        assert(resourceRefs.has(resourceClass), `Grant group ${role.role_id}/${grantGroup.grant_group_ref} references unknown resource ${resourceClass}.`);
      }
      for (const actionFamily of grantGroup.action_families) {
        assert(actionRefs.has(actionFamily), `Grant group ${role.role_id}/${grantGroup.grant_group_ref} references unknown action ${actionFamily}.`);
      }
      if (grantGroup.decision === "ALLOW_MASKED") {
        assert(
          Array.isArray(grantGroup.masking_rules) && grantGroup.masking_rules.length > 0,
          `Grant group ${role.role_id}/${grantGroup.grant_group_ref} must define masking rules for ALLOW_MASKED.`,
        );
      }
    }
  }
}

function validateStepUpPolicy(policy: StepUpPolicy, catalog: ResourceActionCatalog) {
  assert(policy.policy_version === "ACCESS_STEP_UP_POLICY_V1", "Unexpected step-up policy version.");
  const tupleRefs = new Set<string>();
  const validTuples = new Set(
    catalog.resource_rows.flatMap((resourceRow) =>
      resourceRow.action_families.map((actionFamily) => `${resourceRow.resource_class}::${actionFamily}`),
    ),
  );
  for (const rule of policy.rules) {
    const tupleRef = `${rule.resource_class}::${rule.action_family}`;
    assert(validTuples.has(tupleRef), `Step-up rule ${rule.rule_ref} targets unknown tuple ${tupleRef}.`);
    assert(!tupleRefs.has(tupleRef), `Duplicate step-up tuple ${tupleRef}.`);
    tupleRefs.add(tupleRef);
  }
}

function validateApprovalPolicy(policy: ApprovalPolicy, catalog: ResourceActionCatalog) {
  assert(policy.policy_version === "ACCESS_APPROVAL_POLICY_V1", "Unexpected approval policy version.");
  const tupleRefs = new Set<string>();
  const validTuples = new Set(
    catalog.resource_rows.flatMap((resourceRow) =>
      resourceRow.action_families.map((actionFamily) => `${resourceRow.resource_class}::${actionFamily}`),
    ),
  );
  for (const rule of policy.rules) {
    const tupleRef = `${rule.resource_class}::${rule.action_family}`;
    assert(validTuples.has(tupleRef), `Approval rule ${rule.rule_ref} targets unknown tuple ${tupleRef}.`);
    assert(!tupleRefs.has(tupleRef), `Duplicate approval tuple ${tupleRef}.`);
    tupleRefs.add(tupleRef);
    assert(rule.required_approvals.length > 0, `Approval rule ${rule.rule_ref} must declare required approvals.`);
  }
}

function normalizeRoleSeeds(bundle: DefaultRoleSeedBundle): DefaultRoleSeedBundle {
  return {
    ...bundle,
	    roles: bundle.roles
	      .map((role) => ({
	        ...role,
	        actor_profiles: sortSetLikeStrings(role.actor_profiles),
	        approval_capabilities: sortSetLikeStrings(role.approval_capabilities),
	        client_portal_capabilities: sortSetLikeStrings(role.client_portal_capabilities),
	        grant_groups: role.grant_groups.map((grantGroup) => ({
	          ...grantGroup,
	          action_families: sortSetLikeStrings(grantGroup.action_families),
	          ...(grantGroup.masking_rules
	            ? {
	                masking_rules: sortSetLikeStrings(grantGroup.masking_rules),
	              }
	            : {}),
	          reason_codes: sortSetLikeStrings(grantGroup.reason_codes),
	          resource_classes: sortSetLikeStrings(grantGroup.resource_classes),
	        })),
	        principal_types: [...role.principal_types].sort(),
	        run_kind_capabilities: sortSetLikeStrings(role.run_kind_capabilities),
	      }))
	      .sort((left, right) => left.role_id.localeCompare(right.role_id)),
  };
}

async function buildBundle() {
  const resourceActionCatalog = await readJson<ResourceActionCatalog>(inputPaths.resourceActionCatalog);
  validateCatalog(resourceActionCatalog);

  const roleSeeds = normalizeRoleSeeds(await readJson<DefaultRoleSeedBundle>(inputPaths.roleSeeds));
  validateRoleSeeds(roleSeeds, resourceActionCatalog);

  const stepUpPolicy = await readJson<StepUpPolicy>(inputPaths.stepUpPolicy);
  validateStepUpPolicy(stepUpPolicy, resourceActionCatalog);

  const approvalPolicy = await readJson<ApprovalPolicy>(inputPaths.approvalPolicy);
  validateApprovalPolicy(approvalPolicy, resourceActionCatalog);

  return {
    approvalPolicy,
    resourceActionCatalog,
    roleSeeds,
    stepUpPolicy,
  } satisfies AccessInputBundle;
}

export async function loadAccessInputBundle(options?: { reload?: boolean }) {
  if (options?.reload || cachedBundle === null) {
    cachedBundle = buildBundle();
  }
  return cachedBundle;
}

export const accessInputPaths = inputPaths;
export { repoRoot as accessControlRepoRoot };

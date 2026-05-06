import { readFile } from "node:fs/promises";

import { stableJsonHash, sortSetLikeStrings } from "../../domain-kernel/src/primitives/hash.ts";

import type {
  AccessInputBundle,
  ActionCatalogRow,
  ApprovalRequirementRef,
  DefaultRoleSeed,
  ResourceCatalogRow,
} from "./role_seed_loader.ts";
import { accessInputPaths, loadAccessInputBundle } from "./role_seed_loader.ts";

export type CompiledAccessCell = {
  access_binding_hash: string;
  action_family: string;
  approval_requirement: ApprovalRequirementRef | null;
  decision: "ALLOW" | "ALLOW_MASKED" | "REQUIRE_STEP_UP" | "REQUIRE_APPROVAL" | "DENY";
  effective_scope: string[];
  masking_rules: string[];
  policy_path_ref: string;
  reason_codes: string[];
  required_approvals: string[];
  required_authn_level: "MFA" | "STEP_UP" | null;
  resource_class: string;
  tuple_ref: string;
};

export type CompiledRoleTemplate = {
  actor_profiles: string[];
  approval_capabilities: string[];
  cells: CompiledAccessCell[];
  client_portal_capabilities: string[];
  description: string;
  policy_snapshot_hash: string;
  principal_types: Array<"HUMAN" | "SERVICE" | "EXTERNAL">;
  role_id: string;
  role_label: string;
  run_kind_capabilities: string[];
  version_hash: string;
};

export type CompiledAccessMatrix = {
  basis_statement: string;
  compiled_catalog: {
    action_rows: ActionCatalogRow[];
    resource_rows: ResourceCatalogRow[];
    tuple_count: number;
  };
  contract_version: "ACCESS_CONTROL_MATRIX_V1";
  input_hashes: Record<string, string>;
  policy_snapshot_hash: string;
  role_templates: CompiledRoleTemplate[];
};

const decisionPriority = {
  DENY: 5,
  REQUIRE_APPROVAL: 4,
  REQUIRE_STEP_UP: 3,
  ALLOW_MASKED: 2,
  ALLOW: 1,
} as const;

const scopeTokenOrder = new Map(
  [
    "year_end",
    "quarterly_update",
    "estimate_only",
    "prepare_submission",
    "submit",
    "amendment_intent",
    "amendment_submit",
  ].map((token, index) => [token, index] as const),
);

let cachedMatrix: Promise<CompiledAccessMatrix> | null = null;

type MutableCompiledCell = {
  action_family: string;
  approval_requirement: ApprovalRequirementRef | null;
  decision: CompiledAccessCell["decision"];
  effective_scope: Set<string>;
  masking_rules: Set<string>;
  policy_path_refs: Set<string>;
  reason_codes: Set<string>;
  required_approvals: Set<string>;
  required_authn_level: "MFA" | "STEP_UP" | null;
  resource_class: string;
  tuple_ref: string;
};

function compareDecisionSeverity(
  left: CompiledAccessCell["decision"],
  right: CompiledAccessCell["decision"],
) {
  return decisionPriority[left] - decisionPriority[right];
}

function sortScopeTokens(values: readonly string[]) {
  return [...values].sort((left, right) => {
    const leftOrder = scopeTokenOrder.get(left) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = scopeTokenOrder.get(right) ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return left.localeCompare(right);
  });
}

function cloneWithDecision(cell: MutableCompiledCell) {
  return {
    ...cell,
    effective_scope: new Set(cell.effective_scope),
    masking_rules: new Set(cell.masking_rules),
    policy_path_refs: new Set(cell.policy_path_refs),
    reason_codes: new Set(cell.reason_codes),
    required_approvals: new Set(cell.required_approvals),
  };
}

function maskRulesForAction(actionFamily: string, existing: string[]) {
  if (actionFamily === "VIEW_MASKED") {
    return existing.length > 0 ? existing : ["mask.client_personal_fields"];
  }
  return existing;
}

function buildRoleCellIndex(bundle: AccessInputBundle, roleSeed: DefaultRoleSeed) {
  const actionRowsByRef = new Map(
    bundle.resourceActionCatalog.action_rows.map((row) => [row.action_family, row] as const),
  );
  const resourceRows = bundle.resourceActionCatalog.resource_rows;
  const validTuples = new Map<string, { actionRow: ActionCatalogRow; resourceRow: ResourceCatalogRow }>();
  for (const resourceRow of resourceRows) {
    for (const actionFamily of resourceRow.action_families) {
      const actionRow = actionRowsByRef.get(actionFamily);
      if (!actionRow) {
        continue;
      }
      validTuples.set(`${resourceRow.resource_class}::${actionFamily}`, {
        actionRow,
        resourceRow,
      });
    }
  }

  const compiled = new Map<string, MutableCompiledCell>();
  for (const [tupleRef, tuple] of validTuples) {
    compiled.set(tupleRef, {
      action_family: tuple.actionRow.action_family,
      approval_requirement: null,
      decision: "DENY",
      effective_scope: new Set<string>(),
      masking_rules: new Set<string>(),
      policy_path_refs: new Set<string>([tuple.actionRow.policy_path_ref, tuple.resourceRow.policy_path_ref]),
      reason_codes: new Set<string>(["NO_ROLE_GRANT"]),
      required_approvals: new Set<string>(),
      required_authn_level: null,
      resource_class: tuple.resourceRow.resource_class,
      tuple_ref: tupleRef,
    });
  }

  for (const grantGroup of roleSeed.grant_groups) {
    for (const resourceClass of grantGroup.resource_classes) {
      const resourceRow = resourceRows.find((row) => row.resource_class === resourceClass);
      if (!resourceRow) {
        continue;
      }
      for (const actionFamily of grantGroup.action_families) {
        if (!resourceRow.action_families.includes(actionFamily)) {
          continue;
        }
        const tupleRef = `${resourceClass}::${actionFamily}`;
        const existing = compiled.get(tupleRef);
        if (!existing) {
          continue;
        }
        const scope = bundle.resourceActionCatalog.scope_profiles[grantGroup.effective_scope_profile] ?? [];
        existing.decision = grantGroup.decision;
        existing.effective_scope = new Set(scope);
        existing.masking_rules = new Set(maskRulesForAction(actionFamily, grantGroup.masking_rules ?? []));
        existing.reason_codes = new Set(grantGroup.reason_codes);
        existing.required_approvals = new Set<string>();
        existing.required_authn_level = null;
        existing.policy_path_refs.add(
          grantGroup.policy_path_ref ?? `default_roles.roles.${roleSeed.role_id}.grant_groups.${grantGroup.grant_group_ref}`,
        );
      }
    }
  }

  for (const rule of bundle.stepUpPolicy.rules) {
    const tupleRef = `${rule.resource_class}::${rule.action_family}`;
    const existing = compiled.get(tupleRef);
    if (!existing || existing.decision === "DENY") {
      continue;
    }
    const next = cloneWithDecision(existing);
    next.decision = "REQUIRE_STEP_UP";
    next.reason_codes.add(rule.reason_code);
    next.required_authn_level = rule.required_authn_level;
    next.required_approvals.clear();
    next.approval_requirement = null;
    next.masking_rules = new Set(
      next.decision === "ALLOW_MASKED" ? maskRulesForAction(rule.action_family, [...next.masking_rules]) : [],
    );
    next.policy_path_refs.add(rule.policy_path_ref);
    compiled.set(tupleRef, next);
  }

  for (const rule of bundle.approvalPolicy.rules) {
    const tupleRef = `${rule.resource_class}::${rule.action_family}`;
    const existing = compiled.get(tupleRef);
    if (!existing || existing.decision === "DENY") {
      continue;
    }
    const next = cloneWithDecision(existing);
    next.decision = "REQUIRE_APPROVAL";
    next.reason_codes.add(rule.reason_code);
    next.required_authn_level = null;
    next.approval_requirement = rule.approval_requirement;
    next.required_approvals = new Set(rule.required_approvals);
    next.masking_rules.clear();
    next.policy_path_refs.add(rule.policy_path_ref);
    compiled.set(tupleRef, next);
  }

  return [...compiled.values()]
    .map((cell) => {
      const policy_path_ref = [...cell.policy_path_refs].sort()[0]!;
      const accessBindingSeed = {
        action_family: cell.action_family,
        decision: cell.decision,
        effective_scope: sortScopeTokens([...cell.effective_scope]),
        policy_snapshot_hash: "",
        reason_codes: sortSetLikeStrings([...cell.reason_codes]),
        resource_class: cell.resource_class,
        role_id: roleSeed.role_id,
      };
      return {
        access_binding_hash: stableJsonHash(accessBindingSeed),
        action_family: cell.action_family,
        approval_requirement:
          cell.decision === "REQUIRE_APPROVAL" ? cell.approval_requirement ?? "NOT_REQUIRED" : null,
        decision: cell.decision,
        effective_scope: cell.decision === "DENY" ? [] : sortScopeTokens([...cell.effective_scope]),
        masking_rules:
          cell.decision === "ALLOW_MASKED" ? sortSetLikeStrings([...cell.masking_rules]) : [],
        policy_path_ref,
        reason_codes: sortSetLikeStrings([...cell.reason_codes]),
        required_approvals:
          cell.decision === "REQUIRE_APPROVAL" ? sortSetLikeStrings([...cell.required_approvals]) : [],
        required_authn_level: cell.decision === "REQUIRE_STEP_UP" ? cell.required_authn_level : null,
        resource_class: cell.resource_class,
        tuple_ref: cell.tuple_ref,
      } satisfies CompiledAccessCell;
    })
    .sort((left, right) => left.tuple_ref.localeCompare(right.tuple_ref));
}

async function inputHashes() {
  const entries = await Promise.all(
    Object.entries(accessInputPaths).map(async ([key, filePath]) => {
      const contents = await readFile(filePath, "utf8");
      return [key, stableJsonHash(JSON.parse(contents))] as const;
    }),
  );
  return Object.fromEntries(entries);
}

async function buildCompiledAccessMatrix() {
  const bundle = await loadAccessInputBundle({ reload: true });
  const hashes = await inputHashes();
  const policy_snapshot_hash = stableJsonHash({
    approvalPolicy: hashes.approvalPolicy,
    resourceActionCatalog: hashes.resourceActionCatalog,
    roleSeeds: hashes.roleSeeds,
    stepUpPolicy: hashes.stepUpPolicy,
  });

  const role_templates = bundle.roleSeeds.roles.map((roleSeed) => {
    const cells = buildRoleCellIndex(bundle, roleSeed).map((cell) => ({
      ...cell,
      access_binding_hash: stableJsonHash({
        ...cell,
        policy_snapshot_hash,
        role_id: roleSeed.role_id,
      }),
    }));
    return {
      actor_profiles: roleSeed.actor_profiles,
      approval_capabilities: roleSeed.approval_capabilities,
      cells,
      client_portal_capabilities: roleSeed.client_portal_capabilities,
      description: roleSeed.description,
      policy_snapshot_hash,
      principal_types: roleSeed.principal_types,
      role_id: roleSeed.role_id,
      role_label: roleSeed.role_label,
      run_kind_capabilities: roleSeed.run_kind_capabilities,
      version_hash: stableJsonHash({
        policy_snapshot_hash,
        role_id: roleSeed.role_id,
        cells,
      }),
    } satisfies CompiledRoleTemplate;
  });

  return {
    basis_statement: `${bundle.roleSeeds.basis_statement} ${bundle.stepUpPolicy.basis_statement} ${bundle.approvalPolicy.basis_statement}`,
    compiled_catalog: {
      action_rows: bundle.resourceActionCatalog.action_rows,
      resource_rows: bundle.resourceActionCatalog.resource_rows,
      tuple_count: bundle.resourceActionCatalog.resource_rows.reduce(
        (sum, row) => sum + row.action_families.length,
        0,
      ),
    },
    contract_version: "ACCESS_CONTROL_MATRIX_V1",
    input_hashes: hashes,
    policy_snapshot_hash,
    role_templates,
  } satisfies CompiledAccessMatrix;
}

export async function compileAccessMatrix(options?: { reload?: boolean }) {
  if (options?.reload || cachedMatrix === null) {
    cachedMatrix = buildCompiledAccessMatrix();
  }
  return cachedMatrix;
}

export function compiledRoleById(matrix: CompiledAccessMatrix, roleId: string) {
  const role = matrix.role_templates.find((entry) => entry.role_id === roleId);
  if (!role) {
    throw new Error(`Unknown compiled role ${roleId}.`);
  }
  return role;
}

export function compiledCellByTuple(
  role: CompiledRoleTemplate,
  resourceClass: string,
  actionFamily: string,
) {
  const tupleRef = `${resourceClass}::${actionFamily}`;
  const cell = role.cells.find((entry) => entry.tuple_ref === tupleRef);
  if (!cell) {
    throw new Error(`Role ${role.role_id} does not declare tuple ${tupleRef}.`);
  }
  return cell;
}

export function mergeCompiledCells(cells: readonly CompiledAccessCell[]) {
  if (cells.length === 0) {
    throw new Error("At least one compiled cell is required.");
  }

  const winner = [...cells].sort((left, right) => compareDecisionSeverity(right.decision, left.decision))[0]!;
  const effective_scope =
    winner.decision === "DENY"
      ? []
      : sortScopeTokens(cells.flatMap((cell) => (cell.decision === "DENY" ? [] : cell.effective_scope)));
  const masking_rules =
    winner.decision === "ALLOW_MASKED"
      ? sortSetLikeStrings(cells.flatMap((cell) => (cell.decision === "ALLOW_MASKED" ? cell.masking_rules : [])))
      : [];
  const required_approvals =
    winner.decision === "REQUIRE_APPROVAL"
      ? sortSetLikeStrings(cells.flatMap((cell) => (cell.decision === "REQUIRE_APPROVAL" ? cell.required_approvals : [])))
      : [];
  const required_authn_level =
    winner.decision === "REQUIRE_STEP_UP"
      ? cells
          .filter((cell) => cell.decision === "REQUIRE_STEP_UP")
          .map((cell) => cell.required_authn_level)
          .find((value): value is "MFA" | "STEP_UP" => value !== null) ?? null
      : null;

  return {
    access_binding_hash: stableJsonHash({
      tuple_ref: winner.tuple_ref,
      winner_decision: winner.decision,
      role_cell_hashes: cells.map((cell) => cell.access_binding_hash).sort(),
    }),
    action_family: winner.action_family,
    approval_requirement: winner.decision === "REQUIRE_APPROVAL" ? winner.approval_requirement : null,
    decision: winner.decision,
    effective_scope,
    masking_rules,
    policy_path_ref: [...cells.map((cell) => cell.policy_path_ref)].sort()[0]!,
    reason_codes: sortSetLikeStrings(cells.flatMap((cell) => cell.reason_codes)),
    required_approvals,
    required_authn_level,
    resource_class: winner.resource_class,
    tuple_ref: winner.tuple_ref,
  } satisfies CompiledAccessCell;
}

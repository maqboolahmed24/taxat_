import type {
  RoleTemplateMatrixMatrixDecision,
  RoleTemplateMatrixMatrixRow,
} from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import { createCacheIsolationContract } from "../../../domain-kernel/src/cache/cache_isolation_key.ts";

import { buildGovernancePolicySnapshotHash } from "../hash/policy_snapshot_hash.ts";
import {
  buildRoleTemplateVersionHash,
  type RoleTemplateVersionHashCell,
} from "../hash/role_template_version_hash.ts";
import {
  normalizeRoleTemplateMatrixRecord,
  type RoleTemplateMatrixRecord,
} from "../read_models/role_template_matrix.ts";
import {
  buildGovernanceInteractionLayer,
  buildGovernancePolicySnapshotHashInput,
  loadGovernancePolicyProjectionInputs,
} from "./governance_policy_snapshot_projector.ts";
import {
  normalizeStringSet,
  requireTrimmedString,
} from "../services/principal_context_normalizer.ts";

type RoleMatrixFilterState = RoleTemplateMatrixRecord["role_matrix_workspace"]["active_filters"] & {
  pending_change_presence?: "ALL" | "ONLY_PENDING" | "ONLY_CLEAN";
};

export type ProjectRoleTemplateMatrixInput = {
  active_filters?: Partial<RoleMatrixFilterState>;
  captured_at?: string;
  latest_simulation_ref?: string | null;
  pending_change_map?: Record<string, string | null | undefined>;
  reviewed_policy_snapshot_hash?: string | null;
  role_editor_pending_change_refs?: readonly string[];
  role_id: string;
  selected_cell_ref?: string | null;
  tenant_id?: string;
};

type ProjectedMatrixCell = RoleTemplateMatrixRecord["matrix_cells"][number];

const decisionOrder = new Map<RoleTemplateMatrixMatrixDecision, number>([
  ["ALLOW", 0],
  ["ALLOW_MASKED", 1],
  ["REQUIRE_STEP_UP", 2],
  ["REQUIRE_APPROVAL", 3],
  ["DENY", 4],
]);

const authnOrder = new Map([
  ["BASIC", 0],
  ["MFA", 1],
  ["STEP_UP", 2],
] as const);

function titleCaseResourceLabel(resourceClass: string) {
  return resourceClass.replaceAll(/([A-Z])/g, " $1").trim();
}

function titleCaseActionLabel(actionFamily: string) {
  return actionFamily
    .split("_")
    .map((segment) => `${segment.slice(0, 1)}${segment.slice(1).toLowerCase()}`)
    .join(" ");
}

function sortDecisionOutcomes(values: readonly RoleTemplateMatrixMatrixDecision[]) {
  return [...new Set(values)].sort(
    (left, right) =>
      (decisionOrder.get(left) ?? Number.MAX_SAFE_INTEGER) -
      (decisionOrder.get(right) ?? Number.MAX_SAFE_INTEGER),
  );
}

function applyPendingChange(
  cell: ProjectedMatrixCell,
  pendingChangeMap: Record<string, string | null | undefined>,
) {
  return {
    ...cell,
    pending_change_ref_or_null:
      pendingChangeMap[cell.cell_ref] === undefined
        ? null
        : pendingChangeMap[cell.cell_ref] ?? null,
  } satisfies ProjectedMatrixCell;
}

function maxAuthnLevel(
  current: "BASIC" | "MFA" | "STEP_UP" | null,
  next: "BASIC" | "MFA" | "STEP_UP" | null,
) {
  if (current === null) {
    return next;
  }
  if (next === null) {
    return current;
  }
  return (authnOrder.get(current) ?? 0) >= (authnOrder.get(next) ?? 0)
    ? current
    : next;
}

function joinedPolicyPath(policyPathRefs: Iterable<string>) {
  return normalizeStringSet("policy_path_refs", [...policyPathRefs], {
    minItems: 1,
  }).join(" | ");
}

function cellMatchesFilters(
  cell: ProjectedMatrixCell,
  filters: RoleMatrixFilterState,
) {
  const resourceClassMatch =
    filters.resource_classes.length === 0 ||
    filters.resource_classes.includes(cell.resource_class);
  const actionFamilyMatch =
    filters.action_families.length === 0 ||
    filters.action_families.includes(cell.action_family);
  const decisionMatch =
    filters.decision_outcomes.length === 0 ||
    filters.decision_outcomes.includes(cell.decision);
  const pendingMatch =
    !filters.pending_change_presence ||
    filters.pending_change_presence === "ALL" ||
    (filters.pending_change_presence === "ONLY_PENDING" &&
      cell.pending_change_ref_or_null !== null) ||
    (filters.pending_change_presence === "ONLY_CLEAN" &&
      cell.pending_change_ref_or_null === null);
  return (
    resourceClassMatch && actionFamilyMatch && decisionMatch && pendingMatch
  );
}

export class RoleTemplateMatrixProjector {
  async project(
    input: ProjectRoleTemplateMatrixInput,
  ): Promise<RoleTemplateMatrixRecord> {
    const tenant_id = input.tenant_id ?? "tenant.taxat-sandbox";
    const captured_at = input.captured_at ?? "2026-04-23T12:40:00Z";
    const projectionInputs = await loadGovernancePolicyProjectionInputs();
    const role = projectionInputs.access_bundle.roleSeeds.roles.find(
      (candidate) => candidate.role_id === input.role_id,
    );
    if (!role) {
      throw new Error(`Unknown role template ${input.role_id}.`);
    }

    const policy_snapshot_hash = requireTrimmedString(
      "policy_snapshot_hash",
      buildGovernancePolicySnapshotHash(
        buildGovernancePolicySnapshotHashInput(projectionInputs),
      ),
    );
    const pendingChangeMap = Object.fromEntries(
      Object.entries(input.pending_change_map ?? {}).map(([cellRef, changeRef]) => [
        cellRef,
        changeRef ?? null,
      ]),
    );
    const role_editor_pending_change_refs = normalizeStringSet(
      "role_editor_pending_change_refs",
      input.role_editor_pending_change_refs ??
        Object.values(pendingChangeMap).filter(
          (value): value is string => value !== null,
        ),
    );

    const actionRowsByFamily = new Map(
      projectionInputs.access_bundle.resourceActionCatalog.action_rows.map((row) => [
        row.action_family,
        row,
      ] as const),
    );
    const supportedTupleRefs = new Set(
      projectionInputs.access_bundle.resourceActionCatalog.resource_rows.flatMap((resourceRow) =>
        resourceRow.action_families.map(
          (actionFamily) => `${resourceRow.resource_class}::${actionFamily}`,
        ),
      ),
    );
    const authRuleByTuple = new Map<
      string,
      (typeof projectionInputs.authentication_level_policy.rules)[number]
    >(
      projectionInputs.authentication_level_policy.rules.map((rule) => [
        `${rule.resource_class}::${rule.action_family}`,
        rule,
      ] as const),
    );
    const approvalRuleByTuple = new Map<
      string,
      (typeof projectionInputs.approval_requirement_resolution.rules)[number]
    >(
      projectionInputs.approval_requirement_resolution.rules.map((rule) => [
        `${rule.resource_class}::${rule.action_family}`,
        rule,
      ] as const),
    );

    const committedCellsByTuple = new Map<
      string,
      {
        action_family: string;
        baseline_decision: "ALLOW" | "ALLOW_MASKED" | "DENY";
        effective_scope: string[];
        masking_rules: string[];
        policy_path_refs: Set<string>;
        reason_codes: Set<string>;
        required_approvals: Set<string>;
        required_authn_level: "BASIC" | "MFA" | "STEP_UP" | null;
        resource_class: string;
      }
    >();

    for (const resourceRow of projectionInputs.access_bundle.resourceActionCatalog.resource_rows) {
      for (const actionFamily of projectionInputs.access_bundle.resourceActionCatalog.action_rows.map(
        (row) => row.action_family,
      )) {
        const tupleRef = `${resourceRow.resource_class}::${actionFamily}`;
        committedCellsByTuple.set(tupleRef, {
          action_family: actionFamily,
          baseline_decision: "DENY",
          effective_scope: [],
          masking_rules: [],
          policy_path_refs: new Set(
            supportedTupleRefs.has(tupleRef)
              ? [
                  resourceRow.policy_path_ref,
                  actionRowsByFamily.get(actionFamily)?.policy_path_ref ??
                    "resource_action_catalog.action_rows.unknown",
                ]
              : ["resource_action_catalog.implicit_default_deny"],
          ),
          reason_codes: new Set(["NO_ROLE_GRANT"]),
          required_approvals: new Set<string>(),
          required_authn_level: null,
          resource_class: resourceRow.resource_class,
        });
      }
    }

    for (const grantGroup of role.grant_groups) {
      const effectiveScope =
        projectionInputs.access_bundle.resourceActionCatalog.scope_profiles[
          grantGroup.effective_scope_profile
        ] ?? [];
      for (const resourceClass of grantGroup.resource_classes) {
        for (const actionFamily of grantGroup.action_families) {
          const tupleRef = `${resourceClass}::${actionFamily}`;
          const current = committedCellsByTuple.get(tupleRef);
          if (!current) {
            continue;
          }
          current.baseline_decision = grantGroup.decision;
          current.effective_scope = [...effectiveScope];
          current.masking_rules =
            grantGroup.decision === "ALLOW_MASKED"
              ? normalizeStringSet(
                  "grant_group.masking_rules",
                  grantGroup.masking_rules ?? [],
                )
              : [];
          current.reason_codes = new Set(grantGroup.reason_codes);
          current.policy_path_refs.add(
            grantGroup.policy_path_ref ??
              `default_roles.roles.${role.role_id}.grant_groups.${grantGroup.grant_group_ref}`,
          );
        }
      }
    }

    const matrix_cells = [...committedCellsByTuple.entries()]
      .map(([tupleRef, cell]) => {
        if (cell.baseline_decision !== "DENY") {
          const authRule = authRuleByTuple.get(tupleRef);
          if (authRule) {
            cell.required_authn_level = maxAuthnLevel(
              cell.required_authn_level,
              authRule.required_authn_level,
            );
            cell.reason_codes.add(authRule.reason_code);
            cell.policy_path_refs.add(authRule.policy_path_ref);
          }

          const approvalRule = approvalRuleByTuple.get(tupleRef);
          if (approvalRule) {
            for (const approvalRef of approvalRule.required_approvals) {
              cell.required_approvals.add(approvalRef);
            }
            cell.reason_codes.add(approvalRule.reason_code);
            cell.policy_path_refs.add(approvalRule.policy_path_ref);
          }
        }

        const finalDecision: RoleTemplateMatrixMatrixDecision =
          cell.baseline_decision === "DENY"
            ? "DENY"
            : cell.required_approvals.size > 0
              ? "REQUIRE_APPROVAL"
              : cell.required_authn_level !== null &&
                  cell.required_authn_level !== "BASIC"
                ? "REQUIRE_STEP_UP"
                : cell.baseline_decision === "ALLOW_MASKED"
                  ? "ALLOW_MASKED"
                  : "ALLOW";

        return applyPendingChange(
          {
            cell_ref: `cell.${cell.resource_class}.${cell.action_family}`,
            resource_class: cell.resource_class,
            action_family: cell.action_family,
            decision: finalDecision,
            reason_codes: normalizeStringSet(
              "matrix_cell.reason_codes",
              [...cell.reason_codes],
              { minItems: 1 },
            ),
            effective_scope:
              finalDecision === "DENY"
                ? []
                : normalizeStringSet(
                    "matrix_cell.effective_scope",
                    cell.effective_scope,
                  ),
            masking_rules:
              cell.masking_rules.length === 0
                ? []
                : normalizeStringSet(
                    "matrix_cell.masking_rules",
                    cell.masking_rules,
                  ),
            required_approvals: normalizeStringSet(
              "matrix_cell.required_approvals",
              [...cell.required_approvals],
            ),
            required_authn_level: cell.required_authn_level,
            policy_path_ref: joinedPolicyPath(cell.policy_path_refs),
            pending_change_ref_or_null: null,
          },
          pendingChangeMap,
        );
      })
      .sort((left, right) => left.cell_ref.localeCompare(right.cell_ref));

    const matrix_columns = projectionInputs.access_bundle.resourceActionCatalog.action_rows.map(
      (row) => ({
        action_family: row.action_family,
        column_label: titleCaseActionLabel(row.action_family),
      }),
    );

    const matrix_rows = projectionInputs.access_bundle.resourceActionCatalog.resource_rows.map(
      (row) => ({
        resource_class: row.resource_class,
        row_label: titleCaseResourceLabel(row.resource_class),
        cell_refs: matrix_cells
          .filter((cell) => cell.resource_class === row.resource_class)
          .map((cell) => cell.cell_ref),
      }),
    ) satisfies RoleTemplateMatrixMatrixRow[];

    const version_hash = buildRoleTemplateVersionHash({
      role_id: role.role_id,
      role_label: role.role_label,
      policy_snapshot_hash,
      matrix_rows,
      matrix_columns,
      matrix_cells: matrix_cells.map((cell) => ({
        ...cell,
      })) satisfies RoleTemplateVersionHashCell[],
      role_editor_pending_change_refs,
    });

    const filters: RoleMatrixFilterState = {
      resource_classes: normalizeStringSet(
        "active_filters.resource_classes",
        input.active_filters?.resource_classes ?? [],
      ),
      action_families: normalizeStringSet(
        "active_filters.action_families",
        input.active_filters?.action_families ?? [],
      ),
      decision_outcomes: sortDecisionOutcomes(
        input.active_filters?.decision_outcomes ?? [],
      ),
      pending_change_presence: input.active_filters?.pending_change_presence ?? "ALL",
    };

    const requestedSelectedCellRef =
      input.selected_cell_ref ??
      matrix_cells.find((cell) => cell.decision !== "DENY")?.cell_ref ??
      matrix_cells[0]?.cell_ref ??
      null;
    const visibleCells = matrix_cells.filter((cell) => cellMatchesFilters(cell, filters));
    const selectedCell =
      requestedSelectedCellRef === null
        ? null
        : visibleCells.find((cell) => cell.cell_ref === requestedSelectedCellRef) ??
          null;

    const reviewed_policy_snapshot_hash =
      input.reviewed_policy_snapshot_hash === undefined
        ? policy_snapshot_hash
        : input.reviewed_policy_snapshot_hash;
    const stale = reviewed_policy_snapshot_hash !== null &&
      reviewed_policy_snapshot_hash !== policy_snapshot_hash;
    const selectionFilteredOut =
      requestedSelectedCellRef !== null && selectedCell === null;

    const settlement_state = stale
      ? "STALE_REVIEW_REQUIRED"
      : selectionFilteredOut
        ? "RECOVERY_REQUIRED"
        : "STEADY";
    const recovery_posture = stale
      ? "INLINE_REBASE"
      : selectionFilteredOut
        ? "ACCESS_REBIND_REQUIRED"
        : "NONE";
    const inspector_state = role_editor_pending_change_refs.length > 0
      ? "ROLE_EDITING"
      : selectedCell !== null
        ? "CELL_SELECTED"
        : "HIDDEN";
    const selected_cell_ref = selectedCell?.cell_ref ?? null;

    const cache_isolation_contract = await createCacheIsolationContract({
      cacheScopeClass: "ROLE_TEMPLATE_MATRIX",
      canonicalObjectRef: "/governance/access/roles",
      principalClass: "STAFF_FULL",
      projectionVersionRef: version_hash,
      routeIdentityRef: "/governance/access/roles",
      sessionBindingHash: `session-binding.role-template-matrix.${role.role_id.toLowerCase()}`,
      shellFamily: "GOVERNANCE_DENSITY_SHELL",
      tenantId: tenant_id,
    });

    return normalizeRoleTemplateMatrixRecord({
      artifact_type: "RoleTemplateMatrix",
      tenant_id,
      shell_family: "GOVERNANCE_DENSITY_SHELL",
      object_anchor_ref: "/governance/access/roles",
      dominant_question:
        "Which tuples does this role commit to, and what authn, approval, masking, and pending-change posture remains visible?",
      settlement_state,
      recovery_posture,
      interaction_layer: buildGovernanceInteractionLayer([
        ...filters.resource_classes.map((value) => `resource_class:${value}`),
        ...filters.action_families.map((value) => `action_family:${value}`),
        ...filters.decision_outcomes.map((value) => `decision:${value}`),
      ]),
      cache_isolation_contract,
      role_id: role.role_id,
      role_label: role.role_label,
      policy_snapshot_hash,
      version_hash,
      focus_anchor_ref: selected_cell_ref,
      role_matrix_workspace: {
        surface_order: [
          "PRINCIPAL_DIRECTORY",
          "WORKSPACE_CANVAS",
          "ACCESS_INSPECTOR",
          "AUTHORITY_CHAIN_PANEL",
          "POLICY_SIMULATOR",
        ],
        active_filters: {
          resource_classes: filters.resource_classes,
          action_families: filters.action_families,
          decision_outcomes: filters.decision_outcomes,
        },
        selected_role_template_ref: role.role_id,
        selected_cell_ref,
        grid_navigation_model: "ROW_COLUMN_ROVING_TABINDEX",
        inspector_state,
        promoted_support_surface:
          input.latest_simulation_ref !== null &&
          input.latest_simulation_ref !== undefined
            ? "POLICY_SIMULATOR"
            : "AUDIT_SIDECAR",
        latest_simulation_ref: input.latest_simulation_ref ?? null,
        role_editor_pending_change_refs,
      },
      matrix_rows,
      matrix_columns,
      matrix_cells,
      selected_action_detail:
        selectedCell === null
          ? null
          : {
              panel_mode: "ACCESS_INSPECTOR",
              ...selectedCell,
            },
      captured_at,
    });
  }
}

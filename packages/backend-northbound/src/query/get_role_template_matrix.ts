import {
  normalizeRoleTemplateMatrixRecord,
  type RoleTemplateMatrixRecord,
} from "../../../backend-access/src/read_models/role_template_matrix.ts";
import { buildGovernanceInteractionLayer } from "../../../backend-governance/src/projectors/build_governance_interaction_layer.ts";
import {
  RoleTemplateMatrixRepository,
  type StoredRoleTemplateMatrixRecord,
} from "../../../backend-access/src/repositories/role_template_matrix_repository.ts";
import {
  governanceRefOrUndefined,
  normalizeRoleTemplateMatrixFilters,
  type GovernanceReadQueryInput,
} from "../services/normalize_governance_query_filters.ts";

export { RoleTemplateMatrixRepository };
export type { RoleTemplateMatrixRecord, StoredRoleTemplateMatrixRecord };

export type RoleTemplateMatrixRepositoryLike = {
  listRoleMatricesByTenantAndRole: (
    tenantId: string,
    roleId: string,
  ) =>
    | Promise<StoredRoleTemplateMatrixRecord[]>
    | StoredRoleTemplateMatrixRecord[];
};

export class RoleTemplateMatrixPublicationError extends Error {
  readonly reasonCodes: string[];

  constructor(detail: string, reasonCodes: readonly string[]) {
    super(`ROLE_TEMPLATE_MATRIX_INVALID: ${detail}`);
    this.name = "RoleTemplateMatrixPublicationError";
    this.reasonCodes = [...reasonCodes];
  }
}

function fail(detail: string, reasonCodes: readonly string[]): never {
  throw new RoleTemplateMatrixPublicationError(detail, reasonCodes);
}

function assertNonEmptyTokens(label: string, values: readonly string[], minItems = 0) {
  if (values.length < minItems) {
    fail(`${label} must include at least ${minItems} token(s)`, [
      "ROLE_TEMPLATE_MATRIX_EMPTY_TOKEN_SET",
    ]);
  }
  for (const value of values) {
    if (value.trim().length === 0) {
      fail(`${label} must not contain empty tokens`, [
        "ROLE_TEMPLATE_MATRIX_EMPTY_TOKEN",
      ]);
    }
  }
}

function validateMatrixCell(cell: RoleTemplateMatrixRecord["matrix_cells"][number]) {
  assertNonEmptyTokens("matrix_cell.reason_codes", cell.reason_codes, 1);
  assertNonEmptyTokens("matrix_cell.effective_scope", cell.effective_scope, cell.decision === "DENY" ? 0 : 1);
  assertNonEmptyTokens("matrix_cell.masking_rules", cell.masking_rules);
  assertNonEmptyTokens("matrix_cell.required_approvals", cell.required_approvals);
  if (cell.decision === "ALLOW_MASKED" && cell.masking_rules.length === 0) {
    fail("ALLOW_MASKED matrix cells must keep explicit masking_rules", [
      "ROLE_TEMPLATE_MATRIX_MASKING_POSTURE_MISSING",
    ]);
  }
  if (cell.decision === "REQUIRE_APPROVAL" && cell.required_approvals.length === 0) {
    fail("REQUIRE_APPROVAL matrix cells must keep required_approvals", [
      "ROLE_TEMPLATE_MATRIX_APPROVAL_POSTURE_MISSING",
    ]);
  }
  if (cell.decision === "REQUIRE_STEP_UP" && cell.required_authn_level === null) {
    fail("REQUIRE_STEP_UP matrix cells must keep required_authn_level", [
      "ROLE_TEMPLATE_MATRIX_STEP_UP_POSTURE_MISSING",
    ]);
  }
  if (cell.decision === "DENY" && cell.effective_scope.length > 0) {
    fail("DENY matrix cells must not imply executable effective_scope", [
      "ROLE_TEMPLATE_MATRIX_DENY_SCOPE_INVALID",
    ]);
  }
}

export function validateRoleTemplateMatrixPublication(matrix: RoleTemplateMatrixRecord) {
  const normalized = normalizeRoleTemplateMatrixRecord(matrix);
  if (normalized.matrix_rows.length === 0 || normalized.matrix_columns.length === 0) {
    fail("matrix_rows and matrix_columns must not be empty", [
      "ROLE_TEMPLATE_MATRIX_GRID_EMPTY",
    ]);
  }
  if (normalized.matrix_cells.length === 0) {
    fail("matrix_cells must not be empty", ["ROLE_TEMPLATE_MATRIX_CELLS_EMPTY"]);
  }
  for (const row of normalized.matrix_rows) {
    assertNonEmptyTokens("matrix_row.cell_refs", row.cell_refs, 1);
  }
  for (const cell of normalized.matrix_cells) {
    validateMatrixCell(cell);
  }
  if (normalized.role_matrix_workspace.selected_role_template_ref !== normalized.role_id) {
    fail("selected_role_template_ref must stay pinned to role_id", [
      "ROLE_TEMPLATE_MATRIX_SELECTED_ROLE_MISMATCH",
    ]);
  }
  if (normalized.role_matrix_workspace.selected_cell_ref !== null) {
    if (normalized.focus_anchor_ref !== normalized.role_matrix_workspace.selected_cell_ref) {
      fail("focus_anchor_ref must stay pinned to selected_cell_ref", [
        "ROLE_TEMPLATE_MATRIX_FOCUS_CELL_MISMATCH",
      ]);
    }
    if (
      normalized.selected_action_detail?.cell_ref !==
      normalized.role_matrix_workspace.selected_cell_ref
    ) {
      fail("selected_action_detail must stay mounted on selected_cell_ref", [
        "ROLE_TEMPLATE_MATRIX_SELECTED_DETAIL_MISMATCH",
      ]);
    }
  }
  if (
    normalized.role_matrix_workspace.role_editor_pending_change_refs.length > 0 &&
    normalized.role_matrix_workspace.inspector_state !== "ROLE_EDITING"
  ) {
    fail("pending role-editor changes must keep ROLE_EDITING inspector state", [
      "ROLE_TEMPLATE_MATRIX_PENDING_CHANGE_STATE_INVALID",
    ]);
  }
  return normalized;
}

function splitQueryList(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function applyRoleMatrixQueryContinuity(input: {
  matrix: RoleTemplateMatrixRecord;
  query?: GovernanceReadQueryInput;
}) {
  const matrix = structuredClone(input.matrix);
  const selectedCellRef = governanceRefOrUndefined(input.query, [
    "selected_cell_ref",
    "selectedCellRef",
  ]);
  const latestSimulationRef = governanceRefOrUndefined(input.query, [
    "latest_simulation_ref",
    "latestSimulationRef",
  ]);
  const roleEditorPendingChanges = splitQueryList(
    governanceRefOrUndefined(input.query, [
      "role_editor_pending_change_refs",
      "roleEditorPendingChangeRefs",
    ]) ?? undefined,
  );
  const activeFilters = normalizeRoleTemplateMatrixFilters(
    input.query,
    matrix.role_matrix_workspace.active_filters,
  );
  const selectedCell =
    selectedCellRef === undefined
      ? (matrix.matrix_cells.find(
          (cell) => cell.cell_ref === matrix.role_matrix_workspace.selected_cell_ref,
        ) ?? null)
      : selectedCellRef === null
        ? null
        : matrix.matrix_cells.find((cell) => cell.cell_ref === selectedCellRef) ?? null;
  if (selectedCellRef !== undefined && selectedCellRef !== null && selectedCell === null) {
    throw new RoleTemplateMatrixPublicationError(
      `selected cell ${selectedCellRef} does not resolve in matrix_cells`,
      ["ROLE_TEMPLATE_MATRIX_SELECTED_CELL_NOT_FOUND"],
    );
  }

  const resolvedPendingChanges =
    roleEditorPendingChanges ?? matrix.role_matrix_workspace.role_editor_pending_change_refs;
  const resolvedLatestSimulationRef =
    latestSimulationRef === undefined
      ? matrix.role_matrix_workspace.latest_simulation_ref
      : latestSimulationRef;
  matrix.role_matrix_workspace = {
    ...matrix.role_matrix_workspace,
    active_filters: activeFilters,
    inspector_state:
      resolvedPendingChanges.length > 0
        ? "ROLE_EDITING"
        : selectedCell !== null
          ? "CELL_SELECTED"
          : "HIDDEN",
    latest_simulation_ref: resolvedLatestSimulationRef,
    promoted_support_surface: resolvedLatestSimulationRef
      ? "POLICY_SIMULATOR"
      : "AUDIT_SIDECAR",
    role_editor_pending_change_refs: resolvedPendingChanges,
    selected_cell_ref: selectedCell?.cell_ref ?? null,
    selected_role_template_ref: matrix.role_id,
  };
  matrix.focus_anchor_ref = selectedCell?.cell_ref ?? null;
  matrix.selected_action_detail =
    selectedCell === null
      ? null
      : {
          panel_mode: "ACCESS_INSPECTOR",
          ...selectedCell,
        };
  matrix.interaction_layer = buildGovernanceInteractionLayer({
    activeFilters,
    routeFamily: "role_template_matrix",
  });
  return validateRoleTemplateMatrixPublication(matrix);
}

export async function getRoleTemplateMatrix(input: {
  query?: GovernanceReadQueryInput;
  roleId: string;
  roleTemplateMatrixRepository: RoleTemplateMatrixRepositoryLike;
  tenantId: string;
}) {
  const matrices = await input.roleTemplateMatrixRepository.listRoleMatricesByTenantAndRole(
    input.tenantId,
    input.roleId,
  );
  const current = matrices
    .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
    .at(-1);
  if (!current) {
    return null;
  }
  return {
    ...current,
    role_matrix: applyRoleMatrixQueryContinuity({
      matrix: current.role_matrix,
      query: input.query,
    }),
  } satisfies StoredRoleTemplateMatrixRecord;
}

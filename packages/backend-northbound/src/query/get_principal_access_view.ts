import {
  normalizePrincipalAccessViewRecord,
  type PrincipalAccessViewRecord,
} from "../../../backend-access/src/read_models/principal_access_view.ts";
import { buildGovernanceInteractionLayer } from "../../../backend-governance/src/projectors/build_governance_interaction_layer.ts";
import {
  governanceRefOrUndefined,
  normalizePrincipalAccessFilters,
  type GovernanceReadQueryInput,
} from "../services/normalize_governance_query_filters.ts";

export type { PrincipalAccessViewRecord };

export type StoredPrincipalAccessViewReadRecord = {
  persisted_at: string;
  principal_context_access_binding_hash: string;
  source_refs: string[];
  view: PrincipalAccessViewRecord;
};

export type PrincipalAccessViewReadRepositoryLike = {
  listViewsByTenantAndPrincipalId: (
    tenantId: string,
    principalId: string,
  ) =>
    | Promise<StoredPrincipalAccessViewReadRecord[]>
    | StoredPrincipalAccessViewReadRecord[];
  listViewsByTenantId: (
    tenantId: string,
  ) =>
    | Promise<StoredPrincipalAccessViewReadRecord[]>
    | StoredPrincipalAccessViewReadRecord[];
};

export class PrincipalAccessViewPublicationError extends Error {
  readonly reasonCodes: string[];

  constructor(detail: string, reasonCodes: readonly string[]) {
    super(`PRINCIPAL_ACCESS_VIEW_INVALID: ${detail}`);
    this.name = "PrincipalAccessViewPublicationError";
    this.reasonCodes = [...reasonCodes];
  }
}

function fail(detail: string, reasonCodes: readonly string[]): never {
  throw new PrincipalAccessViewPublicationError(detail, reasonCodes);
}

function assertNonEmptyTokens(label: string, values: readonly string[], minItems = 0) {
  if (values.length < minItems) {
    fail(`${label} must include at least ${minItems} token(s)`, [
      "PRINCIPAL_ACCESS_VIEW_EMPTY_TOKEN_SET",
    ]);
  }
  for (const value of values) {
    if (typeof value !== "string" || value.trim().length === 0) {
      fail(`${label} must not contain empty tokens`, [
        "PRINCIPAL_ACCESS_VIEW_EMPTY_TOKEN",
      ]);
    }
  }
}

const authorityLayerOrder = [
  "SESSION_AUTHN_POSTURE",
  "TENANT_OPERATIONAL_AUTHORITY",
  "CLIENT_DELEGATION_COVERAGE",
  "EXTERNAL_AUTHORITY_LINK_READINESS",
] as const;

function validateActionCell(cell: PrincipalAccessViewRecord["action_matrix"][number]) {
  assertNonEmptyTokens("action_matrix.reason_codes", cell.reason_codes, 1);
  assertNonEmptyTokens("action_matrix.effective_scope", cell.effective_scope, cell.decision === "DENY" ? 0 : 1);
  assertNonEmptyTokens("action_matrix.masking_rules", cell.masking_rules);
  assertNonEmptyTokens("action_matrix.required_approvals", cell.required_approvals);
  if (cell.decision === "ALLOW_MASKED" && cell.masking_rules.length === 0) {
    fail("ALLOW_MASKED cells must keep explicit masking_rules", [
      "PRINCIPAL_ACCESS_MASKING_REASON_POSTURE_MISSING",
    ]);
  }
  if (cell.decision === "REQUIRE_APPROVAL" && cell.required_approvals.length === 0) {
    fail("REQUIRE_APPROVAL cells must keep required_approvals", [
      "PRINCIPAL_ACCESS_APPROVAL_POSTURE_MISSING",
    ]);
  }
  if (cell.decision === "REQUIRE_STEP_UP" && cell.required_authn_level === null) {
    fail("REQUIRE_STEP_UP cells must keep required_authn_level", [
      "PRINCIPAL_ACCESS_STEP_UP_POSTURE_MISSING",
    ]);
  }
  if (cell.decision === "DENY" && cell.effective_scope.length > 0) {
    fail("DENY cells must not imply executable effective_scope", [
      "PRINCIPAL_ACCESS_DENY_SCOPE_INVALID",
    ]);
  }
  if (cell.authority_chain_layers.length < 4 || cell.authority_chain_layers.length > 5) {
    fail("authority_chain_layers must keep four layers plus optional authority-of-record layer", [
      "PRINCIPAL_ACCESS_AUTHORITY_CHAIN_INVALID",
    ]);
  }
  authorityLayerOrder.forEach((layerCode, index) => {
    if (cell.authority_chain_layers[index]?.layer_code !== layerCode) {
      fail("authority_chain_layers must retain the fixed governance access order", [
        "PRINCIPAL_ACCESS_AUTHORITY_CHAIN_ORDER_INVALID",
      ]);
    }
  });
  for (const layer of cell.authority_chain_layers) {
    assertNonEmptyTokens("authority_chain_layers.reason_codes", layer.reason_codes, 1);
  }
}

export function validatePrincipalAccessViewPublication(view: PrincipalAccessViewRecord) {
  const normalized = normalizePrincipalAccessViewRecord(view);
  assertNonEmptyTokens("effective_role_set", normalized.effective_role_set, 1);
  assertNonEmptyTokens("approval_capabilities", normalized.approval_capabilities);
  assertNonEmptyTokens("run_kind_capabilities", normalized.run_kind_capabilities);
  if (normalized.action_matrix.length === 0) {
    fail("action_matrix must not be empty", ["PRINCIPAL_ACCESS_ACTION_MATRIX_EMPTY"]);
  }
  for (const delegation of normalized.delegation_summaries) {
    if (delegation.client_id.length === 0 || delegation.lifecycle_state.length === 0) {
      fail("delegation summaries must preserve client and lifecycle refs", [
        "PRINCIPAL_ACCESS_DELEGATION_REF_INVALID",
      ]);
    }
    assertNonEmptyTokens("delegation_summaries.scope_refs", delegation.scope_refs, 1);
  }
  for (const cell of normalized.action_matrix) {
    validateActionCell(cell);
  }
  if (normalized.access_workspace.selected_principal_ref !== normalized.principal_id) {
    fail("selected_principal_ref must stay mounted on the principal view subject", [
      "PRINCIPAL_ACCESS_SELECTED_PRINCIPAL_MISMATCH",
    ]);
  }
  if (normalized.access_workspace.selected_cell_ref !== null) {
    if (normalized.focus_anchor_ref !== normalized.access_workspace.selected_cell_ref) {
      fail("focus_anchor_ref must stay pinned to selected_cell_ref", [
        "PRINCIPAL_ACCESS_FOCUS_CELL_MISMATCH",
      ]);
    }
    if (
      normalized.selected_action_detail?.cell_ref !==
      normalized.access_workspace.selected_cell_ref
    ) {
      fail("selected_action_detail must stay mounted on selected_cell_ref", [
        "PRINCIPAL_ACCESS_SELECTED_DETAIL_MISMATCH",
      ]);
    }
  }
  return normalized;
}

export class PrincipalAccessViewReadRepository
  implements PrincipalAccessViewReadRepositoryLike
{
  readonly #viewsByTenantId = new Map<string, StoredPrincipalAccessViewReadRecord[]>();

  async persistView(input: {
    persistedAt?: string;
    principalContextAccessBindingHash?: string;
    sourceRefs?: readonly string[];
    view: PrincipalAccessViewRecord;
  }) {
    const view = validatePrincipalAccessViewPublication(input.view);
    const stored = {
      persisted_at: input.persistedAt ?? view.last_modified_at,
      principal_context_access_binding_hash:
        input.principalContextAccessBindingHash ??
        view.cache_isolation_contract.access_binding_hash_or_null ??
        `principal-access.${view.tenant_id}.${view.principal_id}`,
      source_refs: [...(input.sourceRefs ?? [])].sort((left, right) =>
        left.localeCompare(right),
      ),
      view,
    } satisfies StoredPrincipalAccessViewReadRecord;
    const existing = this.#viewsByTenantId.get(view.tenant_id) ?? [];
    this.#viewsByTenantId.set(view.tenant_id, [...existing, structuredClone(stored)]);
    return structuredClone(stored);
  }

  async listViewsByTenantId(tenantId: string) {
    return [...(this.#viewsByTenantId.get(tenantId) ?? [])]
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => structuredClone(record));
  }

  async listViewsByTenantAndPrincipalId(tenantId: string, principalId: string) {
    return (await this.listViewsByTenantId(tenantId)).filter(
      (record) => record.view.principal_id === principalId,
    );
  }
}

function selectedWorkspaceMode(
  query: GovernanceReadQueryInput | undefined,
  fallback: PrincipalAccessViewRecord["access_workspace"]["workspace_mode"],
) {
  const value = governanceRefOrUndefined(query, ["workspace_mode", "workspaceMode"]);
  if (value === undefined || value === null) {
    return fallback;
  }
  if (value !== "PRINCIPALS" && value !== "ROLES" && value !== "SIMULATOR") {
    throw new PrincipalAccessViewPublicationError(
      `unsupported workspace_mode ${value}`,
      ["PRINCIPAL_ACCESS_WORKSPACE_MODE_INVALID"],
    );
  }
  return value;
}

function applyPrincipalAccessQueryContinuity(input: {
  query?: GovernanceReadQueryInput;
  view: PrincipalAccessViewRecord;
}) {
  const view = structuredClone(input.view);
  const selectedCellRef = governanceRefOrUndefined(input.query, [
    "selected_cell_ref",
    "selectedCellRef",
  ]);
  const selectedRoleTemplateRef = governanceRefOrUndefined(input.query, [
    "selected_role_template_ref",
    "selectedRoleTemplateRef",
  ]);
  const latestSimulationRef = governanceRefOrUndefined(input.query, [
    "latest_simulation_ref",
    "latestSimulationRef",
  ]);
  const roleEditorPendingChangeRefs = governanceRefOrUndefined(input.query, [
    "role_editor_pending_change_refs",
    "roleEditorPendingChangeRefs",
  ]);
  const resolvedLatestSimulationRef =
    latestSimulationRef === undefined
      ? view.access_workspace.latest_simulation_ref
      : latestSimulationRef;
  const workspaceMode = resolvedLatestSimulationRef
    ? "SIMULATOR"
    : selectedWorkspaceMode(input.query, view.access_workspace.workspace_mode);
  const activeFilters = normalizePrincipalAccessFilters(
    input.query,
    view.access_workspace.active_filters,
  );
  const selectedCell =
    selectedCellRef === undefined
      ? (view.action_matrix.find(
          (cell) => cell.cell_ref === view.access_workspace.selected_cell_ref,
        ) ?? null)
      : selectedCellRef === null
        ? null
        : view.action_matrix.find((cell) => cell.cell_ref === selectedCellRef) ?? null;

  if (selectedCellRef !== undefined && selectedCellRef !== null && selectedCell === null) {
    throw new PrincipalAccessViewPublicationError(
      `selected cell ${selectedCellRef} does not resolve in action_matrix`,
      ["PRINCIPAL_ACCESS_SELECTED_CELL_NOT_FOUND"],
    );
  }

  view.access_workspace = {
    ...view.access_workspace,
    active_filters: activeFilters,
    inspector_state:
      workspaceMode === "ROLES"
        ? "ROLE_EDITING"
        : selectedCell !== null
          ? "CELL_SELECTED"
          : "HIDDEN",
    latest_simulation_ref:
      workspaceMode === "SIMULATOR" ? resolvedLatestSimulationRef : null,
    promoted_support_surface:
      workspaceMode === "SIMULATOR"
        ? "POLICY_SIMULATOR"
        : selectedCell !== null
          ? "AUTHORITY_CHAIN_PANEL"
          : "AUDIT_SIDECAR",
    role_editor_pending_change_refs:
      roleEditorPendingChangeRefs === undefined || roleEditorPendingChangeRefs === null
        ? view.access_workspace.role_editor_pending_change_refs
        : [roleEditorPendingChangeRefs],
    selected_cell_ref: selectedCell?.cell_ref ?? null,
    selected_principal_ref: view.principal_id,
    selected_role_template_ref:
      workspaceMode === "ROLES"
        ? selectedRoleTemplateRef ?? view.effective_role_set[0] ?? null
        : null,
    workspace_mode: workspaceMode,
  };
  view.focus_anchor_ref = selectedCell?.cell_ref ?? null;
  view.selected_action_detail =
    selectedCell === null
      ? null
      : {
          panel_mode: "ACCESS_INSPECTOR",
          ...selectedCell,
          policy_path_ref:
            selectedCell.policy_path_ref ??
            "resource_action_catalog.implicit_default_deny",
        };
  view.interaction_layer = buildGovernanceInteractionLayer({
    activeFilters,
    routeFamily: "principal_access_view",
  });
  return validatePrincipalAccessViewPublication(view);
}

export async function getPrincipalAccessView(input: {
  principalAccessViewRepository: PrincipalAccessViewReadRepositoryLike;
  principalId?: string | null;
  query?: GovernanceReadQueryInput;
  tenantId: string;
}) {
  const queryPrincipalId =
    governanceRefOrUndefined(input.query, [
      "principal_id",
      "principalId",
      "selected_principal_ref",
      "selectedPrincipalRef",
    ]) ?? input.principalId;
  const views =
    queryPrincipalId === undefined || queryPrincipalId === null
      ? await input.principalAccessViewRepository.listViewsByTenantId(input.tenantId)
      : await input.principalAccessViewRepository.listViewsByTenantAndPrincipalId(
          input.tenantId,
          queryPrincipalId,
        );
  const current = views
    .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
    .at(-1);
  if (!current) {
    return null;
  }
  return {
    ...current,
    view: applyPrincipalAccessQueryContinuity({
      query: input.query,
      view: current.view,
    }),
  } satisfies StoredPrincipalAccessViewReadRecord;
}

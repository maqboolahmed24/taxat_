import type { ActorSessionRecord } from "../models/actor_session.ts";
import type { PrincipalContextRecord } from "../models/principal_context.ts";
import { createCacheIsolationContract } from "../../../domain-kernel/src/cache/cache_isolation_key.ts";

import {
  normalizePrincipalAccessViewRecord,
  type PrincipalAccessViewRecord,
} from "../read_models/principal_access_view.ts";
import { buildGovernanceInteractionLayer } from "./governance_policy_snapshot_projector.ts";

type DecisionLike = {
  access_binding_hash: string;
  evaluated_at: string;
};

export type ProjectPrincipalAccessViewInput = {
  action_matrix: PrincipalAccessViewRecord["action_matrix"];
  active_filters: PrincipalAccessViewRecord["access_workspace"]["active_filters"];
  actor_session: ActorSessionRecord;
  current_policy_snapshot_hash: string;
  delegation_summaries: PrincipalAccessViewRecord["delegation_summaries"];
  last_modified_at: string;
  principal_context: PrincipalContextRecord;
  principal_state: string;
  recent_change_owner_ref: string;
  reviewed_policy_snapshot_hash: string | null | undefined;
  role_editor_pending_change_refs: readonly string[] | undefined;
  selected_cell_ref: string | null | undefined;
  selected_role_template_ref: string | null | undefined;
  source_decision_by_cell_ref: ReadonlyMap<string, DecisionLike>;
  workspace_mode: PrincipalAccessViewRecord["access_workspace"]["workspace_mode"] | undefined;
  latest_simulation_ref: string | null | undefined;
};

const decisionPriority = new Map<
  PrincipalAccessViewRecord["action_matrix"][number]["decision"],
  number
>([
  ["DENY", 5],
  ["REQUIRE_APPROVAL", 4],
  ["REQUIRE_STEP_UP", 3],
  ["ALLOW_MASKED", 2],
  ["ALLOW", 1],
]);

function principalMatchesFilters(input: {
  active_filters: PrincipalAccessViewRecord["access_workspace"]["active_filters"];
  principal_context: PrincipalContextRecord;
  principal_state: string;
  recent_change_owner_ref: string;
}) {
  const typeMatch =
    input.active_filters.principal_types.length === 0 ||
    input.active_filters.principal_types.includes(input.principal_context.principal_type);
  const stateMatch =
    input.active_filters.principal_states.length === 0 ||
    input.active_filters.principal_states.includes(input.principal_state);
  const roleMatch =
    input.active_filters.role_refs.length === 0 ||
    input.active_filters.role_refs.some((roleRef) =>
      input.principal_context.effective_role_set.includes(roleRef),
    );
  const delegatedClientMatch =
    input.active_filters.delegated_client_refs.length === 0 ||
    input.active_filters.delegated_client_refs.some((clientRef) =>
      input.principal_context.client_scope.includes(clientRef),
    );
  const recentChangeOwnerMatch =
    input.active_filters.recent_change_owner_refs.length === 0 ||
    input.active_filters.recent_change_owner_refs.includes(input.recent_change_owner_ref);
  return (
    typeMatch &&
    stateMatch &&
    roleMatch &&
    delegatedClientMatch &&
    recentChangeOwnerMatch
  );
}

function defaultSelectedCell(
  action_matrix: PrincipalAccessViewRecord["action_matrix"],
) {
  return [...action_matrix].sort((left, right) => {
    const severity =
      (decisionPriority.get(right.decision) ?? 0) -
      (decisionPriority.get(left.decision) ?? 0);
    if (severity !== 0) {
      return severity;
    }
    return left.cell_ref.localeCompare(right.cell_ref);
  })[0] ?? null;
}

function buildPrincipalAccessInteractionLayer(
  active_filters: PrincipalAccessViewRecord["access_workspace"]["active_filters"],
) {
  return {
    ...buildGovernanceInteractionLayer([]),
    selected_filter_chip_refs: [
      ...active_filters.principal_types.map((value) => `principal_type:${value}`),
      ...active_filters.principal_states.map((value) => `principal_state:${value}`),
      ...active_filters.role_refs.map((value) => `role:${value}`),
      ...active_filters.delegated_client_refs.map(
        (value) => `delegated_client:${value}`,
      ),
      ...active_filters.recent_change_owner_refs.map((value) => `changed_by:${value}`),
    ],
    preserved_context_codes: [
      "ACTIVE_FILTERS",
      "SELECTION",
      "FOCUS_ANCHOR",
      "PROMOTED_SUPPORT_SURFACE",
      "STAGED_DIFF",
    ],
  };
}

function deriveRequestedSelection(input: {
  action_matrix: PrincipalAccessViewRecord["action_matrix"];
  requested_selected_cell_ref: string | null | undefined;
}) {
  const cellByRef = new Map(input.action_matrix.map((cell) => [cell.cell_ref, cell] as const));
  if (input.requested_selected_cell_ref === undefined) {
    return {
      selected_cell: defaultSelectedCell(input.action_matrix),
      selection_filtered_out: false,
    };
  }
  if (input.requested_selected_cell_ref === null) {
    return {
      selected_cell: defaultSelectedCell(input.action_matrix),
      selection_filtered_out: false,
    };
  }
  return {
    selected_cell: cellByRef.get(input.requested_selected_cell_ref) ?? null,
    selection_filtered_out: !cellByRef.has(input.requested_selected_cell_ref),
  };
}

export class PrincipalAccessViewProjector {
  async project(
    input: ProjectPrincipalAccessViewInput,
  ): Promise<PrincipalAccessViewRecord> {
    const principalVisible = principalMatchesFilters({
      active_filters: input.active_filters,
      principal_context: input.principal_context,
      principal_state: input.principal_state,
      recent_change_owner_ref: input.recent_change_owner_ref,
    });
    const requestedSelection = deriveRequestedSelection({
      action_matrix: input.action_matrix,
      requested_selected_cell_ref: input.selected_cell_ref,
    });
    const currentPolicyDrift =
      input.current_policy_snapshot_hash !== input.principal_context.policy_snapshot_hash;
    const reviewedPolicySnapshotHash =
      input.reviewed_policy_snapshot_hash === undefined
        ? input.current_policy_snapshot_hash
        : input.reviewed_policy_snapshot_hash;
    const reviewedMismatch =
      reviewedPolicySnapshotHash !== null &&
      reviewedPolicySnapshotHash !== input.current_policy_snapshot_hash;
    const stale = currentPolicyDrift || reviewedMismatch;
    const recoveryRequired =
      !stale &&
      (!principalVisible || requestedSelection.selection_filtered_out);

    const selectedCell =
      recoveryRequired || !principalVisible ? null : requestedSelection.selected_cell;
    const requestedWorkspaceMode = input.workspace_mode ?? "PRINCIPALS";
    const hasSimulation = input.latest_simulation_ref !== null && input.latest_simulation_ref !== undefined;
    const workspace_mode =
      requestedWorkspaceMode === "SIMULATOR" && selectedCell !== null && hasSimulation
        ? "SIMULATOR"
        : requestedWorkspaceMode === "ROLES"
          ? "ROLES"
          : "PRINCIPALS";
    const selected_role_template_ref =
      workspace_mode === "ROLES"
        ? input.selected_role_template_ref ?? input.principal_context.effective_role_set[0] ?? null
        : null;
    const role_editor_pending_change_refs =
      workspace_mode === "ROLES"
        ? [...(input.role_editor_pending_change_refs ?? [])]
        : [];
    const latest_simulation_ref =
      workspace_mode === "SIMULATOR" ? input.latest_simulation_ref ?? null : null;
    const settlement_state = stale
      ? "STALE_REVIEW_REQUIRED"
      : recoveryRequired
        ? "RECOVERY_REQUIRED"
        : "STEADY";
    const recovery_posture = stale
      ? "INLINE_REBASE"
      : recoveryRequired
        ? "ACCESS_REBIND_REQUIRED"
        : "NONE";
    const promoted_support_surface =
      workspace_mode === "SIMULATOR"
        ? "POLICY_SIMULATOR"
        : selectedCell !== null
          ? "AUTHORITY_CHAIN_PANEL"
          : "AUDIT_SIDECAR";
    const inspector_state =
      workspace_mode === "ROLES"
        ? "ROLE_EDITING"
        : selectedCell !== null
          ? "CELL_SELECTED"
          : "HIDDEN";

    const selected_action_detail =
      selectedCell === null
        ? null
        : {
            panel_mode: "ACCESS_INSPECTOR" as const,
            ...selectedCell,
            policy_path_ref:
              selectedCell.policy_path_ref ?? "resource_action_catalog.implicit_default_deny",
          };
    const object_anchor_ref = `/governance/access/principals/${input.principal_context.principal_id}`;
    const cache_isolation_contract = await createCacheIsolationContract({
      cacheScopeClass: "PRINCIPAL_ACCESS_VIEW",
      canonicalObjectRef: object_anchor_ref,
      principalClass: "STAFF_FULL",
      projectionVersionRef: input.last_modified_at,
      routeIdentityRef: object_anchor_ref,
      sessionBindingHash: input.actor_session.session_binding_hash,
      shellFamily: "GOVERNANCE_DENSITY_SHELL",
      tenantId: input.principal_context.tenant_id,
    });

    return normalizePrincipalAccessViewRecord({
      artifact_type: "PrincipalAccessView",
      tenant_id: input.principal_context.tenant_id,
      shell_family: "GOVERNANCE_DENSITY_SHELL",
      object_anchor_ref,
      dominant_question:
        "What may this principal do right now without collapsing delegation, approval, and authority-link truth?",
      settlement_state,
      recovery_posture,
      interaction_layer: buildPrincipalAccessInteractionLayer(input.active_filters),
      cache_isolation_contract,
      principal_id: input.principal_context.principal_id,
      principal_type: input.principal_context.principal_type,
      effective_role_set: input.principal_context.effective_role_set,
      delegation_summaries: input.delegation_summaries,
      authn_level: input.principal_context.authn_level,
      approval_capabilities: input.principal_context.approval_capabilities,
      run_kind_capabilities: input.principal_context.run_kind_capabilities,
      action_matrix: input.action_matrix,
      focus_anchor_ref: selectedCell?.cell_ref ?? null,
      access_workspace: {
        surface_order: [
          "PRINCIPAL_DIRECTORY",
          "WORKSPACE_CANVAS",
          "ACCESS_INSPECTOR",
          "AUTHORITY_CHAIN_PANEL",
          "POLICY_SIMULATOR",
        ],
        workspace_mode,
        active_filters: input.active_filters,
        selected_principal_ref: input.principal_context.principal_id,
        selected_role_template_ref,
        selected_cell_ref: selectedCell?.cell_ref ?? null,
        grid_navigation_model: "ROW_COLUMN_ROVING_TABINDEX",
        inspector_state,
        promoted_support_surface,
        latest_simulation_ref,
        role_editor_pending_change_refs,
      },
      selected_action_detail,
      last_step_up_at:
        input.actor_session.step_up_completed_at as PrincipalAccessViewRecord["last_step_up_at"],
      last_modified_at: input.last_modified_at,
    });
  }
}

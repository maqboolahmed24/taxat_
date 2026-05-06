import type {
  PrincipalAccessView,
  PrincipalContext,
} from "../../generated-models/src/generated/typescript/authority-and-access.ts";
import type { RoleTemplateMatrix } from "../../generated-models/src/generated/typescript/governance-and-policy.ts";

import { createCacheIsolationContract } from "../../domain-kernel/src/cache/cache_isolation_key.ts";
import { stableJsonHash } from "../../domain-kernel/src/primitives/hash.ts";

import {
  compileAccessMatrix,
  compiledCellByTuple,
  compiledRoleById,
  mergeCompiledCells,
  type CompiledAccessCell,
  type CompiledAccessMatrix,
  type CompiledRoleTemplate,
} from "./access_matrix_compiler.ts";
import { simulateGovernanceAccess, type SimulationScenario } from "./governance_access_simulator.ts";

type GovernanceInteractionLayer =
  PrincipalAccessView["interaction_layer"] &
  RoleTemplateMatrix["interaction_layer"];

type PreviewBundle = {
  principal_view: PrincipalAccessView;
  role_template_matrix: RoleTemplateMatrix;
  simulation_scenarios: SimulationScenario[];
};

function governanceInteractionLayer(): GovernanceInteractionLayer {
  return {
    foundation_contract: {
      contract_version: "CROSS_SHELL_INTERACTION_FOUNDATION_V1",
      shell_family: "GOVERNANCE_DENSITY_SHELL",
      design_token_binding_policy: "EXPLICIT_SEMANTIC_BINDINGS_ONLY",
      layout_density_token: "GOVERNANCE_WORKSPACE_DENSITY_V1",
      surface_spacing_token: "GOVERNANCE_CANVAS_SPACING_V1",
      support_surface_spacing_token: "GOVERNANCE_AUXILIARY_SURFACE_SPACING_V1",
      responsive_compaction_token: "GOVERNANCE_AUXILIARY_REDOCK_V1",
      selector_profile: "GOVERNANCE_SEMANTIC_SELECTORS_V1",
      support_surface_policy: "ONE_PROMOTED_SUPPORT_SURFACE_MAX",
      continuity_policy: "SAME_OBJECT_SAME_SHELL_CONTEXT_RETENTION",
      recovery_surface_policy: "INLINE_TYPED_CONTEXTUAL_RECOVERY",
      history_presentation_policy: "ACTIVE_SLICE_PRIMARY_CONTEXTUAL_HISTORY",
      preview_surface_policy: "AUXILIARY_SURFACE_CONTEXTUAL_ONLY",
      notification_surface_policy: "CONTEXT_BOUND_INLINE_FEEDBACK",
      secondary_window_policy: "NOT_APPLICABLE",
      motion_profile: "SUBTLE_CAUSAL_ONLY",
      motion_token: "SUBTLE_CAUSAL_MOTION_V1",
      feedback_truth_policy: "DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN",
      platform_parity_policy: "SAME_FAMILY_REUSES_SAME_INTERACTION_GRAMMAR",
    },
    density_profile: "GOVERNANCE_DENSITY_PROFILE_V1",
    inventory_filter_grammar: "CANONICAL_ROUTE_FILTER_GRAMMAR",
    support_surface_policy: "ONE_PROMOTED_SUPPORT_SURFACE_MAX",
    diff_basket_policy: "STAGED_DIFF_AND_BASKET_RETAIN_CONTEXT",
    export_binding_policy: "ACTIVE_FILTERED_SLICE_GOVERNS_EXPORT",
    keyboard_focus_policy: "RETURN_FOCUS_ANCHOR_OR_ROVING_SELECTION",
    selector_profile: "GOVERNANCE_SEMANTIC_SELECTORS_V1",
    selected_filter_chip_refs: [],
    compaction_mode: "WIDE",
    auxiliary_surface_presentation: "SIDECAR",
    focus_trap_mode: "NON_MODAL",
    selection_persistence_mode: "PRESERVE_WHILE_OBJECT_RESOLVES",
    preserved_context_codes: [
      "ACTIVE_FILTERS",
      "SELECTION",
      "FOCUS_ANCHOR",
      "PROMOTED_SUPPORT_SURFACE",
      "STAGED_DIFF",
    ],
    motion_profile: "SUBTLE_CAUSAL_ONLY",
    feedback_truth_policy: "DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN",
  };
}

function principalContext(input: {
  access_binding_hash: string;
  approval_capabilities: string[];
  authn_level: "BASIC" | "MFA" | "STEP_UP";
  authority_link_refs: string[];
  authority_link_snapshot_refs: string[];
  client_portal_capabilities: string[];
  delegation_basis: PrincipalContext["delegation_basis"];
  delegation_snapshot_refs: string[];
  principal_id: string;
  principal_type: PrincipalContext["principal_type"];
  requested_scope: PrincipalContext["requested_scope"];
  role: CompiledRoleTemplate;
  run_kind_capabilities: string[];
  service_identity_ref: string | null;
}) {
  return {
    artifact_type: "PrincipalContext",
    principal_id: input.principal_id,
    principal_type: input.principal_type,
    effective_role_set: [input.role.role_id],
    tenant_id: "tenant.taxat-sandbox",
    client_scope: ["client.taxpayer.001"],
    requested_scope: input.requested_scope,
    partition_scope_refs: ["partition.uk.vat", "period.2026-Q1"],
    authn_level: input.authn_level,
    subject_identity_assurance_level:
      input.principal_type === "SERVICE"
        ? "UNVERIFIED"
        : input.authn_level === "STEP_UP"
          ? "STEP_UP_VERIFIED"
          : "VERIFIED",
    session_id: `session.${input.principal_id}`,
    service_identity_ref: input.service_identity_ref,
    delegation_basis: input.delegation_basis,
    authorization_evaluated_at: "2026-04-23T09:30:00Z",
    policy_snapshot_hash: input.role.policy_snapshot_hash,
    access_binding_hash: input.access_binding_hash,
    delegation_snapshot_refs: input.delegation_snapshot_refs,
    authority_link_refs: input.authority_link_refs,
    authority_link_snapshot_refs: input.authority_link_snapshot_refs,
    masking_scope: input.principal_type === "SERVICE" ? "SERVICE_SUPPORT_MASKING" : "TENANT_ADMIN_UNMASKED",
    approval_capabilities: input.approval_capabilities,
    client_portal_capabilities: input.client_portal_capabilities,
    run_kind_capabilities: input.run_kind_capabilities,
  } satisfies PrincipalContext;
}

function principalMatrixTuples() {
  return [
    ["Client", "VIEW_MASKED"],
    ["Client", "VIEW_FULL"],
    ["WorkflowItem", "REQUEST_CLIENT_INFO"],
    ["EvidenceItem", "UPLOAD_CLIENT_DOCUMENT"],
    ["SubmissionRecord", "SIGN_CLIENT_DECLARATION"],
    ["SubmissionRecord", "SUBMIT_TO_AUTHORITY"],
    ["Override", "CREATE_OVERRIDE"],
    ["ConfigChangeRequest", "APPROVE_CONFIG"],
    ["RetentionAction", "EXECUTE_ERASURE"],
  ] as const;
}

function roleMatrixColumns() {
  return [
    "VIEW_FULL",
    "REQUEST_CLIENT_INFO",
    "SUBMIT_TO_AUTHORITY",
    "CREATE_OVERRIDE",
    "APPROVE_CONFIG",
    "EXECUTE_ERASURE",
  ] as const;
}

function roleMatrixRows() {
  return [
    "Client",
    "WorkflowItem",
    "SubmissionRecord",
    "Override",
    "ConfigChangeRequest",
    "RetentionAction",
  ] as const;
}

function principalActionCell(
  cell: CompiledAccessCell,
  authority_chain_layers: PrincipalAccessView["action_matrix"][number]["authority_chain_layers"],
) {
  return {
    cell_ref: `cell.${cell.resource_class}.${cell.action_family}`,
    resource_class: cell.resource_class,
    action_family: cell.action_family,
    decision: cell.decision,
    reason_codes: cell.reason_codes,
    effective_scope: cell.effective_scope,
    masking_rules: cell.masking_rules,
    required_approvals: cell.required_approvals,
    required_authn_level: cell.required_authn_level,
    policy_path_ref: cell.policy_path_ref,
    authority_chain_layers,
  } satisfies PrincipalAccessView["action_matrix"][number];
}

async function buildPrincipalPreview(matrix: CompiledAccessMatrix) {
  const role = compiledRoleById(matrix, "TENANT_ADMIN");
  const submissionCell = compiledCellByTuple(role, "SubmissionRecord", "SUBMIT_TO_AUTHORITY");
  const selectedContext = principalContext({
    access_binding_hash: submissionCell.access_binding_hash,
    approval_capabilities: role.approval_capabilities,
    authn_level: "MFA",
    authority_link_refs: ["authority-link.hmrc-vat.001"],
    authority_link_snapshot_refs: ["authority-link-snapshot.hmrc-vat.001"],
    client_portal_capabilities: role.client_portal_capabilities,
    delegation_basis: "CLIENT_GRANTED",
    delegation_snapshot_refs: ["delegation.grant.client.taxpayer.001"],
    principal_id: "principal.tenant-admin.alex",
    principal_type: "HUMAN",
    requested_scope: submissionCell.effective_scope as PrincipalContext["requested_scope"],
    role,
    run_kind_capabilities: role.run_kind_capabilities,
    service_identity_ref: null,
  });
  const selectedSimulation = await simulateGovernanceAccess({
    compiledCell: submissionCell,
    governance_target_ref: "submission.case-2026-Q1",
    principal_context: selectedContext,
    simulated_at: "2026-04-23T09:30:00Z",
  });

  const action_matrix = await Promise.all(
    principalMatrixTuples().map(async ([resourceClass, actionFamily]) => {
      const merged = mergeCompiledCells([compiledCellByTuple(role, resourceClass, actionFamily)]);
      const requested_scope = merged.effective_scope.length > 0 ? merged.effective_scope : ["year_end"];
      const simulation = await simulateGovernanceAccess({
        compiledCell: merged,
        governance_target_ref: `governance-target.${resourceClass}.${actionFamily}`,
        principal_context: principalContext({
          access_binding_hash: merged.access_binding_hash,
          approval_capabilities: role.approval_capabilities,
          authn_level: actionFamily === "SUBMIT_TO_AUTHORITY" ? "MFA" : "STEP_UP",
          authority_link_refs:
            actionFamily === "SUBMIT_TO_AUTHORITY" ? ["authority-link.hmrc-vat.001"] : [],
          authority_link_snapshot_refs:
            actionFamily === "SUBMIT_TO_AUTHORITY" ? ["authority-link-snapshot.hmrc-vat.001"] : [],
          client_portal_capabilities: role.client_portal_capabilities,
          delegation_basis:
            actionFamily === "APPROVE_CONFIG" || actionFamily === "EXECUTE_ERASURE"
              ? "TENANT_INTERNAL"
              : "CLIENT_GRANTED",
          delegation_snapshot_refs:
            actionFamily === "APPROVE_CONFIG" || actionFamily === "EXECUTE_ERASURE"
              ? []
              : ["delegation.grant.client.taxpayer.001"],
          principal_id: "principal.tenant-admin.alex",
          principal_type: "HUMAN",
          requested_scope: requested_scope as PrincipalContext["requested_scope"],
          role,
          run_kind_capabilities: role.run_kind_capabilities,
          service_identity_ref: null,
        }),
        simulated_at: "2026-04-23T09:30:00Z",
      });
      return principalActionCell(
        {
          ...merged,
          decision: simulation.authorization_decision.decision,
          effective_scope: simulation.authorization_decision.effective_scope,
          masking_rules: simulation.authorization_decision.masking_rules,
          required_approvals: simulation.authorization_decision.required_approvals,
          required_authn_level: simulation.authorization_decision.required_authn_level,
          reason_codes: simulation.authorization_decision.reason_codes,
        },
        simulation.authority_chain_layers as PrincipalAccessView["action_matrix"][number]["authority_chain_layers"],
      );
    }),
  );

  const selected_action_detail = principalActionCell(
    {
      ...submissionCell,
      decision: selectedSimulation.authorization_decision.decision,
      effective_scope: selectedSimulation.authorization_decision.effective_scope,
      masking_rules: selectedSimulation.authorization_decision.masking_rules,
      required_approvals: selectedSimulation.authorization_decision.required_approvals,
      required_authn_level: selectedSimulation.authorization_decision.required_authn_level,
      reason_codes: selectedSimulation.authorization_decision.reason_codes,
    },
    selectedSimulation.authority_chain_layers as PrincipalAccessView["action_matrix"][number]["authority_chain_layers"],
  );

  const cache_isolation_contract = await createCacheIsolationContract({
    cacheScopeClass: "PRINCIPAL_ACCESS_VIEW",
    canonicalObjectRef: "/governance/access/principals",
    principalClass: "STAFF_FULL",
    projectionVersionRef: "2026-04-23T09:30:00Z",
    routeIdentityRef: "/governance/access/principals",
    sessionBindingHash: "session-binding.principal-access-view.alex",
    shellFamily: "GOVERNANCE_DENSITY_SHELL",
    tenantId: "tenant.taxat-sandbox",
  });

  return {
    artifact_type: "PrincipalAccessView",
    tenant_id: "tenant.taxat-sandbox",
    shell_family: "GOVERNANCE_DENSITY_SHELL",
    object_anchor_ref: "/governance/access/principals",
    dominant_question: "What may this principal do right now without collapsing delegation, approval, and authority-link truth into one opaque outcome?",
    settlement_state: "STEADY",
    recovery_posture: "NONE",
    interaction_layer: {
      ...governanceInteractionLayer(),
      selected_filter_chip_refs: [
        "principal_type:HUMAN",
        "principal_state:ACTIVE",
        "role:TENANT_ADMIN",
        "delegated_client:client.taxpayer.001",
        "changed_by:principal.tenant-admin.alex",
      ],
    },
    cache_isolation_contract,
    principal_id: selectedContext.principal_id,
    principal_type: selectedContext.principal_type,
    effective_role_set: selectedContext.effective_role_set,
    delegation_summaries: [
      {
        client_id: "client.taxpayer.001",
        delegation_basis: "CLIENT_GRANTED",
        scope_refs: ["year_end", "prepare_submission", "submit"],
        lifecycle_state: "ACTIVE",
        expires_at: "2026-12-31T23:59:59Z",
      },
    ],
    authn_level: selectedContext.authn_level,
    approval_capabilities: role.approval_capabilities,
    run_kind_capabilities: role.run_kind_capabilities,
    action_matrix,
    focus_anchor_ref: selected_action_detail.cell_ref,
    access_workspace: {
      surface_order: [
        "PRINCIPAL_DIRECTORY",
        "WORKSPACE_CANVAS",
        "ACCESS_INSPECTOR",
        "AUTHORITY_CHAIN_PANEL",
        "POLICY_SIMULATOR",
      ],
      workspace_mode: "PRINCIPALS",
      active_filters: {
        principal_types: ["HUMAN"],
        principal_states: ["ACTIVE"],
        role_refs: [role.role_id],
        delegated_client_refs: ["client.taxpayer.001"],
        recent_change_owner_refs: ["principal.tenant-admin.alex"],
      },
      selected_principal_ref: selectedContext.principal_id,
      selected_role_template_ref: null,
      selected_cell_ref: selected_action_detail.cell_ref,
      grid_navigation_model: "ROW_COLUMN_ROVING_TABINDEX",
      inspector_state: "CELL_SELECTED",
      promoted_support_surface: "AUTHORITY_CHAIN_PANEL",
      latest_simulation_ref: null,
      role_editor_pending_change_refs: [],
    },
    selected_action_detail: {
      panel_mode: "ACCESS_INSPECTOR",
      ...selected_action_detail,
    },
    last_step_up_at: "2026-04-18T11:00:00Z",
    last_modified_at: "2026-04-23T09:30:00Z",
  } satisfies PrincipalAccessView;
}

async function buildRoleMatrixPreview(matrix: CompiledAccessMatrix) {
  const role = compiledRoleById(matrix, "TENANT_ADMIN");
  const selectedCell = compiledCellByTuple(role, "SubmissionRecord", "SUBMIT_TO_AUTHORITY");
  const matrix_columns = roleMatrixColumns().map((actionFamily) => ({
    action_family: actionFamily,
    column_label: actionFamily.replaceAll("_", " "),
  }));
  const matrix_rows = roleMatrixRows().map((resourceClass) => ({
    resource_class: resourceClass,
    row_label: resourceClass.replaceAll(/([A-Z])/g, " $1").trim(),
    cell_refs: matrix_columns.map((column) => `cell.${resourceClass}.${column.action_family}`),
  }));
  const matrix_cells = matrix_rows.flatMap((row) =>
    matrix_columns.map((column) => {
      const tupleCell = role.cells.find(
        (cell) => cell.resource_class === row.resource_class && cell.action_family === column.action_family,
      ) ?? {
        access_binding_hash: stableJsonHash({ resource_class: row.resource_class, action_family: column.action_family, role_id: role.role_id }),
        action_family: column.action_family,
        approval_requirement: null,
        decision: "DENY" as const,
        effective_scope: [],
        masking_rules: [],
        policy_path_ref: "resource_action_catalog.implicit_default_deny",
        reason_codes: ["NO_ROLE_GRANT"],
        required_approvals: [],
        required_authn_level: null,
        resource_class: row.resource_class,
        tuple_ref: `${row.resource_class}::${column.action_family}`,
      };
      return {
        cell_ref: `cell.${row.resource_class}.${column.action_family}`,
        resource_class: row.resource_class,
        action_family: column.action_family,
        decision: tupleCell.decision,
        reason_codes: tupleCell.reason_codes,
        effective_scope: tupleCell.effective_scope,
        masking_rules: tupleCell.masking_rules,
        required_approvals: tupleCell.required_approvals,
        required_authn_level: tupleCell.required_authn_level,
        policy_path_ref: tupleCell.policy_path_ref,
        pending_change_ref_or_null: null,
      } satisfies RoleTemplateMatrix["matrix_cells"][number];
    }),
  );
  const cache_isolation_contract = await createCacheIsolationContract({
    cacheScopeClass: "ROLE_TEMPLATE_MATRIX",
    canonicalObjectRef: "/governance/access/roles",
    principalClass: "STAFF_FULL",
    projectionVersionRef: role.version_hash,
    routeIdentityRef: "/governance/access/roles",
    sessionBindingHash: "session-binding.role-template-matrix.tenant-admin",
    shellFamily: "GOVERNANCE_DENSITY_SHELL",
    tenantId: "tenant.taxat-sandbox",
  });
  return {
    artifact_type: "RoleTemplateMatrix",
    tenant_id: "tenant.taxat-sandbox",
    shell_family: "GOVERNANCE_DENSITY_SHELL",
    object_anchor_ref: "/governance/access/roles",
    dominant_question: "Which baseline tuples does this role template grant directly before simulator context narrows or blocks them?",
    settlement_state: "STEADY",
    recovery_posture: "NONE",
    interaction_layer: {
      ...governanceInteractionLayer(),
      selected_filter_chip_refs: [
        "resource_class:ConfigChangeRequest",
        "resource_class:Override",
        "resource_class:SubmissionRecord",
        "action_family:APPROVE_CONFIG",
        "action_family:CREATE_OVERRIDE",
        "action_family:SUBMIT_TO_AUTHORITY",
        "decision:ALLOW",
        "decision:REQUIRE_STEP_UP",
        "decision:REQUIRE_APPROVAL",
      ],
    },
    cache_isolation_contract,
    role_id: role.role_id,
    role_label: role.role_label,
    policy_snapshot_hash: role.policy_snapshot_hash,
    version_hash: role.version_hash,
    focus_anchor_ref: `cell.${selectedCell.resource_class}.${selectedCell.action_family}`,
    role_matrix_workspace: {
      surface_order: [
        "PRINCIPAL_DIRECTORY",
        "WORKSPACE_CANVAS",
        "ACCESS_INSPECTOR",
        "AUTHORITY_CHAIN_PANEL",
        "POLICY_SIMULATOR",
      ],
      active_filters: {
        resource_classes: ["ConfigChangeRequest", "Override", "SubmissionRecord"],
        action_families: ["APPROVE_CONFIG", "CREATE_OVERRIDE", "SUBMIT_TO_AUTHORITY"],
        decision_outcomes: ["ALLOW", "REQUIRE_STEP_UP", "REQUIRE_APPROVAL"],
      },
      selected_role_template_ref: role.role_id,
      selected_cell_ref: `cell.${selectedCell.resource_class}.${selectedCell.action_family}`,
      grid_navigation_model: "ROW_COLUMN_ROVING_TABINDEX",
      inspector_state: "CELL_SELECTED",
      promoted_support_surface: "AUDIT_SIDECAR",
      latest_simulation_ref: null,
      role_editor_pending_change_refs: [],
    },
    matrix_rows,
    matrix_columns,
    matrix_cells,
    selected_action_detail: {
      panel_mode: "ACCESS_INSPECTOR",
      cell_ref: `cell.${selectedCell.resource_class}.${selectedCell.action_family}`,
      resource_class: selectedCell.resource_class,
      action_family: selectedCell.action_family,
      decision: selectedCell.decision,
      reason_codes: selectedCell.reason_codes,
      effective_scope: selectedCell.effective_scope,
      masking_rules: selectedCell.masking_rules,
      required_approvals: selectedCell.required_approvals,
      required_authn_level: selectedCell.required_authn_level,
      policy_path_ref: selectedCell.policy_path_ref,
      pending_change_ref_or_null: null,
    },
    captured_at: "2026-04-23T09:30:00Z",
  } satisfies RoleTemplateMatrix;
}

async function buildSimulationScenarios(matrix: CompiledAccessMatrix) {
  const adminRole = compiledRoleById(matrix, "TENANT_ADMIN");
  const supportRole = compiledRoleById(matrix, "SUPPORT_OPERATOR");
  const submitCell = compiledCellByTuple(adminRole, "SubmissionRecord", "SUBMIT_TO_AUTHORITY");
  const erasureCell = compiledCellByTuple(adminRole, "RetentionAction", "EXECUTE_ERASURE");
  const signCell = mergeCompiledCells([
    compiledCellByTuple(supportRole, "SubmissionRecord", "SIGN_CLIENT_DECLARATION"),
  ]);

  const stepUpContext = principalContext({
    access_binding_hash: submitCell.access_binding_hash,
    approval_capabilities: adminRole.approval_capabilities,
    authn_level: "MFA",
    authority_link_refs: ["authority-link.hmrc-vat.001"],
    authority_link_snapshot_refs: ["authority-link-snapshot.hmrc-vat.001"],
    client_portal_capabilities: adminRole.client_portal_capabilities,
    delegation_basis: "CLIENT_GRANTED",
    delegation_snapshot_refs: ["delegation.grant.client.taxpayer.001"],
    principal_id: "principal.tenant-admin.alex",
    principal_type: "HUMAN",
    requested_scope: submitCell.effective_scope as PrincipalContext["requested_scope"],
    role: adminRole,
    run_kind_capabilities: adminRole.run_kind_capabilities,
    service_identity_ref: null,
  });
  const linkedStepUp = await simulateGovernanceAccess({
    compiledCell: submitCell,
    governance_target_ref: "submission.case-2026-Q1",
    principal_context: stepUpContext,
    simulated_at: "2026-04-23T09:30:00Z",
  });

  const brokenLinkContext = {
    ...stepUpContext,
    authn_level: "STEP_UP" as const,
    authority_link_refs: [],
    authority_link_snapshot_refs: ["authority-link-snapshot.hmrc-vat.stale"],
  };
  const brokenLink = await simulateGovernanceAccess({
    compiledCell: submitCell,
    governance_target_ref: "submission.case-2026-Q1",
    principal_context: brokenLinkContext,
    simulated_at: "2026-04-23T09:35:00Z",
  });

  const erasureContext = principalContext({
    access_binding_hash: erasureCell.access_binding_hash,
    approval_capabilities: adminRole.approval_capabilities,
    authn_level: "STEP_UP",
    authority_link_refs: [],
    authority_link_snapshot_refs: [],
    client_portal_capabilities: adminRole.client_portal_capabilities,
    delegation_basis: "TENANT_INTERNAL",
    delegation_snapshot_refs: [],
    principal_id: "principal.tenant-admin.alex",
    principal_type: "HUMAN",
    requested_scope: ["year_end"],
    role: adminRole,
    run_kind_capabilities: adminRole.run_kind_capabilities,
    service_identity_ref: null,
  });
  const erasureSimulation = await simulateGovernanceAccess({
    compiledCell: erasureCell,
    governance_target_ref: "retention-action.case-2026-Q1",
    principal_context: erasureContext,
    simulated_at: "2026-04-23T09:40:00Z",
  });

  const serviceContext = principalContext({
    access_binding_hash: signCell.access_binding_hash,
    approval_capabilities: supportRole.approval_capabilities,
    authn_level: "BASIC",
    authority_link_refs: [],
    authority_link_snapshot_refs: [],
    client_portal_capabilities: supportRole.client_portal_capabilities,
    delegation_basis: "SYSTEM_ASSIGNED",
    delegation_snapshot_refs: [],
    principal_id: "principal.support-bot.001",
    principal_type: "SERVICE",
    requested_scope: ["year_end", "prepare_submission"],
    role: supportRole,
    run_kind_capabilities: supportRole.run_kind_capabilities,
    service_identity_ref: "svc.support-bot.001",
  });
  const serviceSimulation = await simulateGovernanceAccess({
    compiledCell: signCell,
    governance_target_ref: "submission.case-2026-Q1",
    principal_context: serviceContext,
    simulated_at: "2026-04-23T09:45:00Z",
  });

  return [
    {
      narrative:
        "Tenant admins may stage filings, but submit posture stays blocked behind explicit step-up even when delegation and link evidence are already bound.",
      principal_context: stepUpContext,
      scenario_id: "tenant-admin-submit-step-up",
      simulation: linkedStepUp,
      title: "Tenant admin may submit filing only with step up and linked authority evidence",
    },
    {
      narrative:
        "Authority-link truth remains an independent layer. Step-up alone does not rescue a submission when the connector is missing or stale.",
      principal_context: brokenLinkContext,
      scenario_id: "tenant-admin-submit-link-missing",
      simulation: brokenLink,
      title: "Authority-link drift blocks filing even after step up",
    },
    {
      narrative:
        "High-consequence retention actions stay approval-gated. The simulator surfaces that requirement without pretending the mutation can run inline.",
      principal_context: erasureContext,
      scenario_id: "tenant-admin-erasure-security-review",
      simulation: erasureSimulation,
      title: "Erasure execution requires explicit security review",
    },
    {
      narrative:
        "Service principals may hold support posture, but they cannot satisfy human-only declaration actions or step-up evidence.",
      principal_context: serviceContext,
      scenario_id: "service-principal-human-declaration-block",
      simulation: serviceSimulation,
      title: "Service principal cannot sign client declaration",
    },
  ] satisfies SimulationScenario[];
}

export async function buildPrincipalAccessPreviewBundle(options?: { reload?: boolean }) {
  const matrix = await compileAccessMatrix({ reload: options?.reload });
  const [principal_view, role_template_matrix, simulation_scenarios] = await Promise.all([
    buildPrincipalPreview(matrix),
    buildRoleMatrixPreview(matrix),
    buildSimulationScenarios(matrix),
  ]);
  return {
    principal_view,
    role_template_matrix,
    simulation_scenarios,
  } satisfies PreviewBundle;
}

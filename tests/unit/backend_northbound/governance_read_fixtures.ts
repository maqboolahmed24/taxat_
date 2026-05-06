import {
  buildGovernanceInteractionLayer,
  RoleTemplateMatrixProjector,
} from "../../../packages/backend-access/src/index.ts";
import { buildGovernancePolicySnapshot } from "../../../packages/backend-governance/src/index.ts";
import {
  GovernancePolicySnapshotRepository,
  governanceOverviewFilterChipRefs,
  PrincipalAccessViewReadRepository,
  type PrincipalAccessViewRecord,
  type RoleTemplateMatrixRecord,
  RoleTemplateMatrixRepository,
  type TenantGovernanceSnapshotRecord,
  TenantGovernanceSnapshotRepository,
} from "../../../packages/backend-northbound/src/index.ts";
import { createCacheIsolationContract } from "../../../packages/domain-kernel/src/cache/cache_isolation_key.ts";
import type {
  CrossDeviceContinuityContract,
  SemanticAccessibilityContract,
  ShellDominanceContract,
  ShellStateTaxonomyContract,
} from "../../../packages/generated-models/src/generated/typescript/surface-and-experience.ts";
import { actorContext } from "./post_commands_fixtures.ts";

export const governanceTenantId = "tenant.taxat-sandbox";
export const governanceReadActorContext = actorContext({
  tenant_id: governanceTenantId,
});

function dominanceContract() {
  return {
    contract_version: "SHELL_DOMINANCE_V1",
    detached_support_policy: "SUPPORT_ONLY_NEVER_PRIMARY",
    dominant_action_ref_or_null: "worklist.governance.pending-approvals",
    dominant_action_surface_code: "ATTENTION_SUMMARY",
    dominant_question_surface_code: "ATTENTION_SUMMARY",
    explicit_multifocus_mode: "DEFAULT",
    parallel_primary_posture: "DISALLOWED",
    promoted_support_surface_code_or_null: "AUDIT_SIDECAR",
    renderer_salience_policy: "SERVER_AUTHORED_ONLY",
    responsive_collapse_policy: "PRESERVE_DOMINANT_SUMMARY_AND_ACTION",
    safe_action_state: "ACTION_AVAILABLE",
    summary_action_alignment_policy: "SAME_DOMINANT_QUESTION",
    supplemental_queue_policy: "SECONDARY_TO_PRIMARY_ACTION",
    support_surface_role: "SUBORDINATE",
  } satisfies ShellDominanceContract;
}

function stateTaxonomyContract() {
  return {
    contract_version: "SHELL_STATE_TAXONOMY_V1",
    current_empty_state_or_null: null,
    current_empty_surface_code_or_null: null,
    current_recovery_posture: "NONE",
    current_settlement_state: "STEADY",
    generic_placeholder_policy: "FORBID_GENERIC_EMPTY_SPINNER_WARNING",
    limitation_reason_codes: [],
    limitation_reason_policy: "LIMITED_REQUIRES_EXPLICIT_REASON_CODES",
    loading_strategy: "INLINE_PRESERVE_PRIOR_CONTENT",
    mounted_context_state: "PRESERVED",
    profile_copy_policy: "PROFILE_COPY_MUST_MAP_TO_SHARED_TAXONOMY",
    recovery_navigation_policy: "PRESERVE_CURRENT_OBJECT_UNLESS_SUPERSEDED",
    stale_action_policy: "STALE_DEGRADED_AND_RECOVERY_REQUIRE_NO_SAFE_ACTION",
  } satisfies ShellStateTaxonomyContract;
}

function crossDeviceContinuityContract(input: {
  focusAnchorRef: string;
  policySnapshotHash: string;
  selectedObjectRef: string;
}) {
  return {
    access_scope_hash_or_null: null,
    action_posture_policy: "DOMINANCE_AND_SETTLEMENT_SERVER_AUTHORED_ONLY",
    allowed_embodiments: ["BROWSER_WIDE", "BROWSER_NARROW_STACKED"],
    canonical_object_ref: input.selectedObjectRef,
    compatibility_basis_class: "ROUTE_GUARD_ONLY",
    continuity_scope: "GOVERNANCE_ROUTE",
    contract_version: "CROSS_DEVICE_CONTINUITY_V1",
    deep_link_return_policy: "EXPLICIT_PARENT_CONTEXT_AND_FOCUS",
    dominant_action_state_or_null: "ACTION_AVAILABLE",
    focus_anchor_ref_or_null: input.focusAnchorRef,
    hydration_compatibility_policy: "TENANT_ACCESS_MASKING_AND_SESSION_BOUND",
    masking_scope_fingerprint_or_null: null,
    narrow_layout_policy: "STACK_WITHIN_SAME_SHELL",
    parent_context_ref_or_null: null,
    restoration_mode_policy: "EXPLICIT_CARRY_FORWARD_OR_REBASE_ONLY",
    return_focus_anchor_ref_or_null: null,
    route_identity_ref: "/governance",
    same_object_policy: "PRESERVE_EXACT_OBJECT_OR_EXPLICIT_LAWFUL_FALLBACK",
    same_shell_policy: "PRESERVE_SAME_SHELL_FAMILY",
    secondary_window_policy: "NOT_APPLICABLE",
    session_scope_ref_or_null: null,
    shell_family: "GOVERNANCE_DENSITY_SHELL",
    stability_guard_hash_or_null: input.policySnapshotHash,
    supported_invalidation_reason_codes: [
      "POLICY_SNAPSHOT_CHANGE",
      "TENANT_SWITCH",
      "PRIVILEGE_DOWNGRADE",
    ],
    visibility_cache_partition_key_or_null: null,
  } satisfies CrossDeviceContinuityContract;
}

function semanticAccessibilityContract() {
  return {
    announced_change_kinds: [
      "ACTIVITY_DELTA",
      "BADGE_DELTA",
      "RECOVERY_NOTICE",
      "COMMAND_FAILURE",
      "TERMINAL_SETTLEMENT",
    ],
    artifact_handoff_policy: "CURRENT_AND_HISTORY_ANCHORS_SEPARATE",
    browser_identifier_policy: "DATA_TESTID_MIRRORS_SEMANTIC_ANCHOR",
    conditional_notice_anchor_policy: "LIMITATION_AND_RECOVERY_NOTICES_REQUIRE_ADDRESSABLE_ANCHORS",
    contract_version: "SEMANTIC_ACCESSIBILITY_V1",
    detail_module_access_policy: "SUPPORT_MODULES_KEYBOARD_AND_ASSISTIVE_TECH_REACHABLE",
    focus_entry_policy: "REQUESTED_ANCHOR_OR_PRIMARY_HEADING_OR_EXPLICIT_NOTICE",
    focus_order_policy: "VISIBLE_SEMANTIC_ORDER_ONLY",
    focus_restore_policy: "RETURN_TO_INVOKER_OR_LAWFUL_ANCESTOR",
    heading_navigation_policy: "PRIMARY_HEADING_AND_PROMOTED_REGION_HEADINGS",
    identifier_semantics_policy: "DOMAIN_MEANING_OVER_VISUAL_STYLING",
    keyboard_completion_policy: "ALL_GOVERNED_ACTIONS_KEYBOARD_OPERABLE",
    landmark_structure_policy: "STABLE_SHELL_SUMMARY_ACTION_SUPPORT_AND_NOTICE_LANDMARKS",
    live_region_policy: "POLITE_ACTIVITY_ASSERTIVE_FAILURE_ONLY",
    live_update_focus_policy: "NEVER_STEAL_ACTIVE_INPUT_OR_PICKER_FOCUS",
    native_identifier_policy: "ACCESSIBILITY_IDENTIFIER_MIRRORS_SEMANTIC_ANCHOR",
    reduced_motion_policy: "MEANING_PRESERVED_WITH_MINIMAL_OR_NO_MOTION",
    required_anchor_codes: [
      "SHELL_ROOT",
      "SHELL_FAMILY",
      "OBJECT_ANCHOR",
      "DOMINANT_QUESTION",
      "DOMINANT_ACTION",
      "SETTLEMENT_POSTURE",
      "RECOVERY_POSTURE",
      "SECTION_NAV",
      "PRIMARY_WORKLIST",
      "WORKSPACE_HEADER",
      "ATTENTION_SUMMARY",
      "RISK_LEDGER",
      "PROMOTED_SUPPORT_REGION",
      "RECOVERY_NOTICE",
    ],
    selector_profile: "GOVERNANCE_SEMANTIC_SELECTORS_V1",
    semantic_focus_order: [
      "SECTION_NAV",
      "PRIMARY_WORKLIST",
      "WORKSPACE_HEADER",
      "ATTENTION_SUMMARY",
      "PROMOTED_AUXILIARY_SURFACE",
    ],
    shell_family: "GOVERNANCE_DENSITY_SHELL",
    support_region_access_policy: "PROMOTED_SUPPORT_REGION_KEYBOARD_REACHABLE_AND_ESCAPABLE",
  } satisfies SemanticAccessibilityContract;
}

export async function tenantGovernanceSnapshotFixture(input: {
  policySnapshotHash: string;
  tenantId?: string;
}): Promise<TenantGovernanceSnapshotRecord> {
  const tenantId = input.tenantId ?? governanceTenantId;
  const active_filters = {
    change_states: ["AWAITING_APPROVAL"],
    client_refs: ["client.taxpayer-2001"],
    environment_ref: "environment.hmrc.production",
    principal_classes: ["HUMAN", "SERVICE"],
    risk_families: ["PENDING_APPROVALS", "AUTHORITY_LINK_RISKS"],
  } satisfies TenantGovernanceSnapshotRecord["active_filters"];
  const selectedObjectRef = "approval.change.change-007";
  const focusAnchorRef = "approval.change.change-007";
  const cacheIsolationContract = await createCacheIsolationContract({
    cacheScopeClass: "TENANT_GOVERNANCE_SNAPSHOT",
    canonicalObjectRef: "/governance",
    principalClass: "STAFF_FULL",
    projectionVersionRef: input.policySnapshotHash,
    routeIdentityRef: "/governance",
    sessionBindingHash: "session-binding.governance-overview",
    shellFamily: "GOVERNANCE_DENSITY_SHELL",
    tenantId,
  });

  return {
    active_filters,
    artifact_type: "TenantGovernanceSnapshot",
    attention_summary: {
      affected_scope_label: "2 approval queues across 1 client",
      attention_family: "PENDING_APPROVALS",
      headline: "Two governance approvals need review",
      next_legal_action_label: "Review approvals",
      primary_action_label: "Open approval worklist",
      primary_worklist_ref: "worklist.governance.pending-approvals",
      secondary_issue_count: 4,
      supporting_text:
        "The promoted queue is the only dominant action; drift, authority-link, retention, and audit lanes remain supporting.",
      why_now_label: "Oldest approval is beyond the 16 hour review target",
    },
    audit_hotspot_refs: ["audit.hotspot.authority-link-drift"],
    audit_hotspot_worklist_ref: "worklist.governance.audit-hotspots",
    authority_link_risk_refs: ["authority-link.hmrc.client-2001"],
    authority_link_risk_worklist_ref: "worklist.governance.authority-link-risks",
    cache_isolation_contract: cacheIsolationContract,
    configuration_drift_worklist_ref: "worklist.governance.configuration-drift",
    cross_device_continuity_contract: crossDeviceContinuityContract({
      focusAnchorRef,
      policySnapshotHash: input.policySnapshotHash,
      selectedObjectRef,
    }),
    dominance_contract: dominanceContract(),
    dominant_question: "Which governance issue needs operator attention first?",
    environment_ref: active_filters.environment_ref,
    expiring_authority_link_count: 1,
    focus_anchor_ref: focusAnchorRef,
    interaction_layer: {
      ...buildGovernanceInteractionLayer(governanceOverviewFilterChipRefs(active_filters)),
      preserved_context_codes: [
        "ACTIVE_FILTERS",
        "SELECTION",
        "FOCUS_ANCHOR",
        "PROMOTED_SUPPORT_SURFACE",
        "CHANGE_BASKET",
      ],
    },
    object_anchor_ref: "/governance",
    pending_approval_count: 2,
    pending_approval_worklist_ref: "worklist.governance.pending-approvals",
    pending_change_refs: ["change.pending.step-up-policy", "change.pending.hmrc-link"],
    pending_change_worklist_ref: "worklist.governance.pending-changes",
    policy_snapshot_hash: input.policySnapshotHash,
    primary_queue_code: "PENDING_APPROVALS",
    primary_worklist_ref: "worklist.governance.pending-approvals",
    recent_change_refs: ["audit.event.governance-policy-updated"],
    retention_exception_count: 1,
    retention_exception_refs: ["retention.exception.client-2001"],
    retention_exception_worklist_ref: "worklist.governance.retention-exceptions",
    risky_configuration_drift_count: 1,
    risk_ledger_entries: [
      {
        affected_scope_label: "2 tenant policy changes",
        headline: "Pending approvals",
        next_action_label: "Review approvals",
        open_count: 2,
        queue_code: "PENDING_APPROVALS",
        worklist_ref: "worklist.governance.pending-approvals",
      },
      {
        affected_scope_label: "1 connector policy",
        headline: "Configuration drift",
        next_action_label: "Compare drift",
        open_count: 1,
        queue_code: "CONFIGURATION_DRIFT",
        worklist_ref: "worklist.governance.configuration-drift",
      },
      {
        affected_scope_label: "1 HMRC authority link",
        headline: "Authority-link risks",
        next_action_label: "Inspect link",
        open_count: 1,
        queue_code: "AUTHORITY_LINK_RISKS",
        worklist_ref: "worklist.governance.authority-link-risks",
      },
      {
        affected_scope_label: "1 retention override",
        headline: "Retention exceptions",
        next_action_label: "Review exception",
        open_count: 1,
        queue_code: "RETENTION_EXCEPTIONS",
        worklist_ref: "worklist.governance.retention-exceptions",
      },
      {
        affected_scope_label: "1 audit hotspot",
        headline: "Audit hotspots",
        next_action_label: "Open tape",
        open_count: 1,
        queue_code: "AUDIT_HOTSPOTS",
        worklist_ref: "worklist.governance.audit-hotspots",
      },
    ],
    recovery_posture: "NONE",
    selected_canvas_object_ref: selectedObjectRef,
    semantic_accessibility_contract: semanticAccessibilityContract(),
    settlement_state: "STEADY",
    shell_family: "GOVERNANCE_DENSITY_SHELL",
    snapshot_id: "tenant-governance-snapshot.fixture.001",
    state_taxonomy_contract: stateTaxonomyContract(),
    support_region_state: {
      mode: "AUDIT",
      reason_code: "AUDIT_SIDECAR_SUPPORTS_SELECTED_APPROVAL",
      selected_object_ref: selectedObjectRef,
    },
    tenant_id: tenantId,
    updated_at: "2026-05-04T09:00:00.000Z",
  };
}

function authorityChainLayersForCell(
  cell: RoleTemplateMatrixRecord["matrix_cells"][number],
): PrincipalAccessViewRecord["action_matrix"][number]["authority_chain_layers"] {
  const tenantOutcome = cell.decision;
  return [
    {
      layer_code: "SESSION_AUTHN_POSTURE",
      layer_outcome: cell.decision === "REQUIRE_STEP_UP" ? "REQUIRE_STEP_UP" : "ALLOW",
      reason_codes:
        cell.decision === "REQUIRE_STEP_UP"
          ? ["SESSION_STEP_UP_REQUIRED"]
          : ["SESSION_AUTHN_CURRENT"],
    },
    {
      layer_code: "TENANT_OPERATIONAL_AUTHORITY",
      layer_outcome: tenantOutcome,
      reason_codes: [...cell.reason_codes],
    },
    {
      layer_code: "CLIENT_DELEGATION_COVERAGE",
      layer_outcome: cell.decision === "DENY" ? "DENY" : "ALLOW",
      reason_codes:
        cell.decision === "DENY"
          ? ["CLIENT_DELEGATION_NOT_APPLICABLE_TO_DENY"]
          : ["CLIENT_DELEGATION_ACTIVE"],
    },
    {
      layer_code: "EXTERNAL_AUTHORITY_LINK_READINESS",
      layer_outcome: cell.action_family === "SUBMIT_TO_AUTHORITY" ? "REQUIRE_STEP_UP" : "ALLOW",
      reason_codes:
        cell.action_family === "SUBMIT_TO_AUTHORITY"
          ? ["AUTHORITY_LINK_READY_WITH_STEP_UP"]
          : ["AUTHORITY_LINK_NOT_MATERIAL"],
    },
  ] satisfies PrincipalAccessViewRecord["action_matrix"][number]["authority_chain_layers"];
}

async function principalAccessViewFixture(input: { roleMatrix: RoleTemplateMatrixRecord }) {
  const selectedCell =
    input.roleMatrix.selected_action_detail ??
    input.roleMatrix.matrix_cells.find((cell) => cell.decision !== "DENY") ??
    input.roleMatrix.matrix_cells[0]!;
  const action_matrix = input.roleMatrix.matrix_cells.map((cell) => ({
    action_family: cell.action_family,
    authority_chain_layers: authorityChainLayersForCell(cell),
    cell_ref: cell.cell_ref,
    decision: cell.decision,
    effective_scope: [...cell.effective_scope],
    masking_rules: [...cell.masking_rules],
    policy_path_ref: cell.policy_path_ref,
    reason_codes: [...cell.reason_codes],
    required_approvals: [...cell.required_approvals],
    required_authn_level: cell.decision === "REQUIRE_STEP_UP" ? cell.required_authn_level : null,
    resource_class: cell.resource_class,
  })) satisfies PrincipalAccessViewRecord["action_matrix"];
  const selectedActionCell = action_matrix.find((cell) => cell.cell_ref === selectedCell.cell_ref)!;
  const objectAnchorRef = "/governance/access/principals/principal.tenant-admin.alex";
  const cacheIsolationContract = await createCacheIsolationContract({
    cacheScopeClass: "PRINCIPAL_ACCESS_VIEW",
    canonicalObjectRef: objectAnchorRef,
    principalClass: "STAFF_FULL",
    projectionVersionRef: "2026-05-04T09:10:00.000Z",
    routeIdentityRef: objectAnchorRef,
    sessionBindingHash: "session-binding.principal-access-view.fixture",
    shellFamily: "GOVERNANCE_DENSITY_SHELL",
    tenantId: governanceTenantId,
  });
  const activeFilters = {
    delegated_client_refs: ["client.taxpayer.001"],
    principal_states: ["ACTIVE"],
    principal_types: ["HUMAN"],
    recent_change_owner_refs: ["principal.tenant-admin.alex"],
    role_refs: [input.roleMatrix.role_id],
  } satisfies PrincipalAccessViewRecord["access_workspace"]["active_filters"];

  return {
    access_workspace: {
      active_filters: activeFilters,
      grid_navigation_model: "ROW_COLUMN_ROVING_TABINDEX",
      inspector_state: "CELL_SELECTED",
      latest_simulation_ref: null,
      promoted_support_surface: "AUTHORITY_CHAIN_PANEL",
      role_editor_pending_change_refs: [],
      selected_cell_ref: selectedActionCell.cell_ref,
      selected_principal_ref: "principal.tenant-admin.alex",
      selected_role_template_ref: null,
      surface_order: [
        "PRINCIPAL_DIRECTORY",
        "WORKSPACE_CANVAS",
        "ACCESS_INSPECTOR",
        "AUTHORITY_CHAIN_PANEL",
        "POLICY_SIMULATOR",
      ],
      workspace_mode: "PRINCIPALS",
    },
    action_matrix,
    approval_capabilities: ["APPROVE_CONFIG", "APPROVE_OVERRIDE"],
    artifact_type: "PrincipalAccessView",
    authn_level: "STEP_UP",
    cache_isolation_contract: cacheIsolationContract,
    delegation_summaries: [
      {
        client_id: "client.taxpayer.001",
        delegation_basis: "CLIENT_GRANTED",
        expires_at: "2026-12-31T23:59:59Z",
        lifecycle_state: "ACTIVE",
        scope_refs: ["year_end", "prepare_submission", "submit"],
      },
    ],
    dominant_question:
      "What may this principal do right now without collapsing delegation, approval, and authority-link truth?",
    effective_role_set: [input.roleMatrix.role_id],
    focus_anchor_ref: selectedActionCell.cell_ref,
    interaction_layer: {
      ...buildGovernanceInteractionLayer([
        "principal_type:HUMAN",
        "principal_state:ACTIVE",
        `role:${input.roleMatrix.role_id}`,
        "delegated_client:client.taxpayer.001",
        "changed_by:principal.tenant-admin.alex",
      ]),
      preserved_context_codes: [
        "ACTIVE_FILTERS",
        "SELECTION",
        "FOCUS_ANCHOR",
        "PROMOTED_SUPPORT_SURFACE",
        "STAGED_DIFF",
      ],
    },
    last_modified_at: "2026-05-04T09:10:00.000Z",
    last_step_up_at: "2026-05-04T08:45:00.000Z",
    object_anchor_ref: objectAnchorRef,
    principal_id: "principal.tenant-admin.alex",
    principal_type: "HUMAN",
    recovery_posture: "NONE",
    run_kind_capabilities: ["PREPARE_FILING", "SUBMIT_TO_AUTHORITY"],
    selected_action_detail: {
      ...selectedActionCell,
      panel_mode: "ACCESS_INSPECTOR",
      policy_path_ref:
        selectedActionCell.policy_path_ref ?? "resource_action_catalog.implicit_default_deny",
    },
    settlement_state: "STEADY",
    shell_family: "GOVERNANCE_DENSITY_SHELL",
    tenant_id: governanceTenantId,
  } satisfies PrincipalAccessViewRecord;
}

export async function governanceReadRepositoriesFixture() {
  const overviewRepository = new TenantGovernanceSnapshotRepository();
  const governancePolicySnapshotRepository = new GovernancePolicySnapshotRepository();
  const principalAccessViewRepository = new PrincipalAccessViewReadRepository();
  const roleTemplateMatrixRepository = new RoleTemplateMatrixRepository();
  const policySnapshot = await buildGovernancePolicySnapshot({
    tenantId: governanceTenantId,
  });
  const roleTemplateMatrix = await new RoleTemplateMatrixProjector().project({
    role_id: "TENANT_ADMIN",
    tenant_id: governanceTenantId,
  });
  const principalView = await principalAccessViewFixture({
    roleMatrix: roleTemplateMatrix,
  });
  const accessPreview = {
    principal_view: principalView,
    role_template_matrix: roleTemplateMatrix,
  };
  const overview = await tenantGovernanceSnapshotFixture({
    policySnapshotHash: policySnapshot.policy_snapshot_hash,
  });

  await overviewRepository.persistSnapshot({ snapshot: overview });
  await governancePolicySnapshotRepository.storeSnapshot({
    persisted_at: policySnapshot.captured_at,
    snapshot: policySnapshot,
  });
  await principalAccessViewRepository.persistView({
    view: accessPreview.principal_view,
  });
  await roleTemplateMatrixRepository.storeRoleMatrix({
    persisted_at: accessPreview.role_template_matrix.captured_at,
    role_matrix: accessPreview.role_template_matrix,
  });

  return {
    accessPreview,
    governancePolicySnapshotRepository,
    overview,
    overviewRepository,
    policySnapshot,
    principalAccessViewRepository,
    roleTemplateMatrixRepository,
  };
}

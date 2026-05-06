import { expect, test } from "@playwright/test";

import {
  ActionMatrixAssembler,
  ActorSessionRepository,
  AuthorizeService,
  AuthorityLinkRepository,
  DelegationGrantRepository,
  ExceptionalAuthorityGrantRepository,
  PrincipalAccessViewProjector,
  PrincipalContextBuilder,
  PrincipalContextRepository,
  SessionLifecycleService,
  TenantRepository,
  UserRepository,
  buildAuthorityLayerBoundaryContract,
  loadAuthorizationPolicyRuntime,
  normalizeAuthorizationDecisionRecord,
} from "../../../packages/backend-access/src/index.ts";

async function buildFixture(options?: {
  authn_level?: "BASIC" | "MFA" | "STEP_UP";
  role_id?: string;
  session_id?: string;
  tenant_id?: string;
  user_id?: string;
}) {
  const tenantRepository = new TenantRepository();
  const userRepository = new UserRepository({ tenantRepository });
  const actorSessionRepository = new ActorSessionRepository({
    tenantRepository,
    userRepository,
  });
  const sessionLifecycleService = new SessionLifecycleService({
    actorSessionRepository,
    tenantRepository,
    userRepository,
  });
  const principalContextBuilder = new PrincipalContextBuilder({
    actorSessionRepository,
    tenantRepository,
    userRepository,
  });
  const principalContextRepository = new PrincipalContextRepository();
  const delegationGrantRepository = new DelegationGrantRepository({ tenantRepository });
  const authorityLinkRepository = new AuthorityLinkRepository({
    tenantRepository,
    delegationGrantRepository,
  });
  const exceptionalAuthorityGrantRepository = new ExceptionalAuthorityGrantRepository({
    tenantRepository,
  });
  const authorizeService = new AuthorizeService({
    authorityLinkRepository,
    delegationGrantRepository,
    exceptionalAuthorityGrantRepository,
    principalContextRepository,
  });
  const tenant_id = options?.tenant_id ?? "tenant.taxat";
  const user_id = options?.user_id ?? "user.operator.300";
  const session_id = options?.session_id ?? "session.browser.300";

  await tenantRepository.create({
    artifact_type: "Tenant",
    tenant_id,
    name: "Taxat Sandbox",
    policy_profile_id: "policy.default",
    default_retention_profile_id: "retention.default",
    lifecycle_state: "ACTIVE",
    disabled_at: null,
    created_at: "2026-04-23T08:00:00Z",
  });
  await userRepository.create({
    artifact_type: "User",
    user_id,
    tenant_id,
    roles: [options?.role_id ?? "TENANT_ADMIN"],
    attributes: {
      locale: "en-GB",
    },
    mfa_state: "SATISFIED",
    lifecycle_state: "ACTIVE",
    disabled_at: null,
    created_at: "2026-04-23T08:00:00Z",
  });
  await sessionLifecycleService.issueBrowserSession({
    tenant_id,
    user_id,
    session_id,
    authn_level: options?.authn_level ?? "MFA",
    step_up_state:
      (options?.authn_level ?? "MFA") === "STEP_UP" ? "SATISFIED" : "NOT_REQUIRED",
    session_binding_hash: `hash.binding.${session_id}`,
    csrf_ref: `csrf.${session_id}`,
    issued_at: "2026-04-23T08:00:00Z",
    expires_at: "2026-04-23T18:00:00Z",
  });

  return {
    actorSessionRepository,
    authorizeService,
    principalContextBuilder,
    tenant_id,
    session_id,
    user_id,
  };
}

async function seedTenantAdminDecisionSet() {
  const fixture = await buildFixture({
    authn_level: "MFA",
    role_id: "TENANT_ADMIN",
    session_id: "session.browser.310",
    user_id: "user.operator.310",
  });
  const runtime = await loadAuthorizationPolicyRuntime();
  const principal_context = await fixture.principalContextBuilder.build({
    tenant_id: fixture.tenant_id,
    session_id: fixture.session_id,
    delegation_basis: "SELF_ACTING",
    client_scope: ["client.taxpayer.310"],
    requested_scope: ["year_end", "prepare_submission", "submit", "amendment_intent"],
    partition_scope_refs: ["partition.uk.vat"],
    masking_scope: "TENANT_ADMIN_UNMASKED",
    authorization_evaluated_at: "2026-04-23T09:00:00Z",
    policy_context_override: {
      policy_snapshot_hash: runtime.policy_snapshot_hash,
    },
  });

  const decisions = [
    normalizeAuthorizationDecisionRecord({
      principal_context_ref: principal_context.principal_id,
      principal_context_access_binding_hash: principal_context.access_binding_hash,
      resource_class: "Client",
      action_family: "VIEW_MASKED",
      decision: "ALLOW_MASKED",
      reason_codes: ["ROLE_TENANT_ADMIN_BASELINE_ALLOW_MASKED"],
      effective_scope: ["year_end"],
      effective_partition_scope_refs: [],
      masking_rules: ["mask.client_personal_fields"],
      required_approvals: [],
      required_authn_level: null,
      policy_snapshot_hash: runtime.policy_snapshot_hash,
      dependency_topology_hash: null,
      simulation_basis_hash: null,
      delegation_snapshot_refs: [],
      authority_link_snapshot_refs: [],
      authority_layer_boundary: buildAuthorityLayerBoundaryContract({
        binding_scope_class: "AUTHORIZATION_DECISION",
        integration_capability: "INTERNAL_ONLY",
        active_principal_class: "HUMAN",
        tenant_permission_state: "MASKED",
        client_delegation_state: "NOT_REQUIRED",
        delegation_basis: "SELF_ACTING",
        delegation_freshness_state: "NOT_APPLICABLE",
        authority_link_state: "NOT_REQUIRED",
        exceptional_authority_state: "NOT_APPLICABLE",
        human_gate_requirement: "NOT_REQUIRED",
        human_gate_resolution_state: "NOT_REQUIRED",
      }),
      bounded_safe_mutation: null,
      approval_requirement: null,
      evaluated_at: "2026-04-23T09:05:00Z",
    }),
    normalizeAuthorizationDecisionRecord({
      principal_context_ref: principal_context.principal_id,
      principal_context_access_binding_hash: principal_context.access_binding_hash,
      resource_class: "WorkflowItem",
      action_family: "REQUEST_CLIENT_INFO",
      decision: "ALLOW",
      reason_codes: ["ROLE_TENANT_ADMIN_CAN_OPERATE_CLIENT_WORK"],
      effective_scope: ["year_end", "prepare_submission"],
      effective_partition_scope_refs: [],
      masking_rules: [],
      required_approvals: [],
      required_authn_level: null,
      policy_snapshot_hash: runtime.policy_snapshot_hash,
      dependency_topology_hash: null,
      simulation_basis_hash: null,
      delegation_snapshot_refs: [],
      authority_link_snapshot_refs: [],
      authority_layer_boundary: buildAuthorityLayerBoundaryContract({
        binding_scope_class: "AUTHORIZATION_DECISION",
        integration_capability: "INTERNAL_ONLY",
        active_principal_class: "HUMAN",
        tenant_permission_state: "SATISFIED",
        client_delegation_state: "NOT_REQUIRED",
        delegation_basis: "SELF_ACTING",
        delegation_freshness_state: "NOT_APPLICABLE",
        authority_link_state: "NOT_REQUIRED",
        exceptional_authority_state: "NOT_APPLICABLE",
        human_gate_requirement: "NOT_REQUIRED",
        human_gate_resolution_state: "NOT_REQUIRED",
      }),
      bounded_safe_mutation: null,
      approval_requirement: null,
      evaluated_at: "2026-04-23T09:06:00Z",
    }),
    normalizeAuthorizationDecisionRecord({
      principal_context_ref: principal_context.principal_id,
      principal_context_access_binding_hash: principal_context.access_binding_hash,
      resource_class: "Override",
      action_family: "CREATE_OVERRIDE",
      decision: "REQUIRE_APPROVAL",
      reason_codes: ["APPROVAL_REQUIRED_FOR_OVERRIDE_CREATION"],
      effective_scope: ["year_end", "amendment_intent"],
      effective_partition_scope_refs: [],
      masking_rules: [],
      required_approvals: ["approval.override.single-approver"],
      required_authn_level: null,
      policy_snapshot_hash: runtime.policy_snapshot_hash,
      dependency_topology_hash: "1111111111111111111111111111111111111111111111111111111111111111",
      simulation_basis_hash: "2222222222222222222222222222222222222222222222222222222222222222",
      delegation_snapshot_refs: [],
      authority_link_snapshot_refs: [],
      authority_layer_boundary: buildAuthorityLayerBoundaryContract({
        binding_scope_class: "AUTHORIZATION_DECISION",
        integration_capability: "INTERNAL_ONLY",
        active_principal_class: "HUMAN",
        tenant_permission_state: "SATISFIED",
        client_delegation_state: "NOT_REQUIRED",
        delegation_basis: "SELF_ACTING",
        delegation_freshness_state: "NOT_APPLICABLE",
        authority_link_state: "NOT_REQUIRED",
        exceptional_authority_state: "NOT_APPLICABLE",
        human_gate_requirement: "REQUIRE_APPROVAL",
        human_gate_resolution_state: "PENDING_EVIDENCE",
      }),
      bounded_safe_mutation: 0,
      approval_requirement: "SINGLE_APPROVER",
      evaluated_at: "2026-04-23T09:07:00Z",
    }),
    normalizeAuthorizationDecisionRecord({
      principal_context_ref: principal_context.principal_id,
      principal_context_access_binding_hash: principal_context.access_binding_hash,
      resource_class: "ConfigChangeRequest",
      action_family: "APPROVE_CONFIG",
      decision: "REQUIRE_STEP_UP",
      reason_codes: ["STEP_UP_REQUIRED_FOR_CONFIG_APPROVAL"],
      effective_scope: ["year_end"],
      effective_partition_scope_refs: [],
      masking_rules: [],
      required_approvals: [],
      required_authn_level: "STEP_UP",
      policy_snapshot_hash: runtime.policy_snapshot_hash,
      dependency_topology_hash: null,
      simulation_basis_hash: null,
      delegation_snapshot_refs: [],
      authority_link_snapshot_refs: [],
      authority_layer_boundary: buildAuthorityLayerBoundaryContract({
        binding_scope_class: "AUTHORIZATION_DECISION",
        integration_capability: "INTERNAL_ONLY",
        active_principal_class: "HUMAN",
        tenant_permission_state: "SATISFIED",
        client_delegation_state: "NOT_REQUIRED",
        delegation_basis: "SELF_ACTING",
        delegation_freshness_state: "NOT_APPLICABLE",
        authority_link_state: "NOT_REQUIRED",
        exceptional_authority_state: "NOT_APPLICABLE",
        human_gate_requirement: "REQUIRE_STEP_UP",
        human_gate_resolution_state: "PENDING_EVIDENCE",
      }),
      bounded_safe_mutation: null,
      approval_requirement: null,
      evaluated_at: "2026-04-23T09:08:00Z",
    }),
    normalizeAuthorizationDecisionRecord({
      principal_context_ref: principal_context.principal_id,
      principal_context_access_binding_hash: principal_context.access_binding_hash,
      resource_class: "SubmissionRecord",
      action_family: "SUBMIT_TO_AUTHORITY",
      decision: "DENY",
      reason_codes: ["CLIENT_DELEGATION_MISSING", "AUTHORITY_LINK_UNLINKED"],
      effective_scope: [],
      effective_partition_scope_refs: [],
      masking_rules: [],
      required_approvals: [],
      required_authn_level: null,
      policy_snapshot_hash: runtime.policy_snapshot_hash,
      dependency_topology_hash: null,
      simulation_basis_hash: null,
      delegation_snapshot_refs: [],
      authority_link_snapshot_refs: [],
      authority_layer_boundary: buildAuthorityLayerBoundaryContract({
        binding_scope_class: "AUTHORIZATION_DECISION",
        integration_capability: "AUTHORITY_INTEGRATED",
        active_principal_class: "HUMAN",
        tenant_permission_state: "SATISFIED",
        client_delegation_state: "MISSING",
        delegation_basis: "CLIENT_GRANTED",
        delegation_freshness_state: "NOT_APPLICABLE",
        authority_link_state: "UNLINKED",
        exceptional_authority_state: "NOT_APPLICABLE",
        human_gate_requirement: "REQUIRE_STEP_UP",
        human_gate_resolution_state: "PENDING_EVIDENCE",
      }),
      bounded_safe_mutation: null,
      approval_requirement: null,
      evaluated_at: "2026-04-23T09:09:00Z",
    }),
  ];
  const actor_session = await fixture.actorSessionRepository.requireBySessionId(
    fixture.tenant_id,
    fixture.session_id,
  );
  return {
    actor_session,
    principal_context,
    decisions,
    runtime,
  };
}

test("assembles one deterministic action matrix with distinct masked, approval, step-up, and deny outcomes", async () => {
  const seeded = await seedTenantAdminDecisionSet();
  const assembler = new ActionMatrixAssembler();
  const projection = await assembler.assemble({
    authorization_decisions: seeded.decisions,
    effective_role_set: seeded.principal_context.effective_role_set,
    frozen_policy_snapshot_hash: seeded.principal_context.policy_snapshot_hash,
  });

  expect(projection.action_matrix.map((cell) => cell.cell_ref)).toEqual([
    "cell.Client.VIEW_MASKED",
    "cell.WorkflowItem.REQUEST_CLIENT_INFO",
    "cell.SubmissionRecord.SUBMIT_TO_AUTHORITY",
    "cell.Override.CREATE_OVERRIDE",
    "cell.ConfigChangeRequest.APPROVE_CONFIG",
  ]);
  expect(
    projection.action_matrix.map((cell) => [cell.cell_ref, cell.decision]),
  ).toEqual([
    ["cell.Client.VIEW_MASKED", "ALLOW_MASKED"],
    ["cell.WorkflowItem.REQUEST_CLIENT_INFO", "ALLOW"],
    ["cell.SubmissionRecord.SUBMIT_TO_AUTHORITY", "DENY"],
    ["cell.Override.CREATE_OVERRIDE", "REQUIRE_APPROVAL"],
    ["cell.ConfigChangeRequest.APPROVE_CONFIG", "REQUIRE_STEP_UP"],
  ]);

  const deniedSubmission = projection.action_matrix.find(
    (cell) => cell.cell_ref === "cell.SubmissionRecord.SUBMIT_TO_AUTHORITY",
  )!;
  expect(deniedSubmission.authority_chain_layers).toHaveLength(5);
  expect(
    deniedSubmission.authority_chain_layers.map((layer) => layer.layer_code),
  ).toEqual([
    "SESSION_AUTHN_POSTURE",
    "TENANT_OPERATIONAL_AUTHORITY",
    "CLIENT_DELEGATION_COVERAGE",
    "EXTERNAL_AUTHORITY_LINK_READINESS",
    "AUTHORITY_OF_RECORD_OUTCOME",
  ]);
  expect(deniedSubmission.authority_chain_layers[3]?.layer_outcome).toBe("DENY");

  const stepUpCell = projection.action_matrix.find(
    (cell) => cell.cell_ref === "cell.ConfigChangeRequest.APPROVE_CONFIG",
  )!;
  expect(stepUpCell.authority_chain_layers).toHaveLength(4);
  expect(stepUpCell.required_authn_level).toBe("STEP_UP");
  expect(stepUpCell.required_approvals).toEqual([]);

  const maskedCell = projection.action_matrix.find(
    (cell) => cell.cell_ref === "cell.Client.VIEW_MASKED",
  )!;
  expect(maskedCell.masking_rules.length).toBeGreaterThan(0);
  expect(maskedCell.policy_path_ref).toContain("resource_action_catalog.action_rows.VIEW_MASKED");
});

test("projector preserves selected cell when the mounted principal stays inside the route slice", async () => {
  const seeded = await seedTenantAdminDecisionSet();
  const assembler = new ActionMatrixAssembler();
  const projection = await assembler.assemble({
    authorization_decisions: seeded.decisions,
    effective_role_set: seeded.principal_context.effective_role_set,
    frozen_policy_snapshot_hash: seeded.principal_context.policy_snapshot_hash,
  });
  const projector = new PrincipalAccessViewProjector();

  const view = await projector.project({
    action_matrix: projection.action_matrix,
    active_filters: {
      principal_types: ["HUMAN"],
      principal_states: ["ACTIVE"],
      role_refs: ["TENANT_ADMIN"],
      delegated_client_refs: ["client.taxpayer.310"],
      recent_change_owner_refs: [seeded.principal_context.principal_id],
    },
    actor_session: seeded.actor_session,
    current_policy_snapshot_hash: seeded.runtime.policy_snapshot_hash,
    delegation_summaries: [
      {
        client_id: "client.taxpayer.310",
        delegation_basis: "CLIENT_GRANTED",
        scope_refs: ["year_end", "prepare_submission", "submit", "amendment_intent"],
        lifecycle_state: "MISSING",
      },
    ],
    last_modified_at: "2026-04-23T09:09:00Z",
    latest_simulation_ref: undefined,
    principal_context: seeded.principal_context,
    principal_state: "ACTIVE",
    recent_change_owner_ref: seeded.principal_context.principal_id,
    reviewed_policy_snapshot_hash: seeded.runtime.policy_snapshot_hash,
    role_editor_pending_change_refs: undefined,
    selected_cell_ref: "cell.Override.CREATE_OVERRIDE",
    selected_role_template_ref: undefined,
    source_decision_by_cell_ref: projection.source_decision_by_cell_ref,
    workspace_mode: "PRINCIPALS",
  });

  expect(view.settlement_state).toBe("STEADY");
  expect(view.recovery_posture).toBe("NONE");
  expect(view.focus_anchor_ref).toBe("cell.Override.CREATE_OVERRIDE");
  expect(view.access_workspace.selected_cell_ref).toBe("cell.Override.CREATE_OVERRIDE");
  expect(view.selected_action_detail?.decision).toBe("REQUIRE_APPROVAL");
  expect(view.access_workspace.promoted_support_surface).toBe("AUTHORITY_CHAIN_PANEL");
});

test("projector surfaces typed recovery when filters exclude the mounted principal and stale posture when policy drift appears", async () => {
  const seeded = await seedTenantAdminDecisionSet();
  const assembler = new ActionMatrixAssembler();
  const projection = await assembler.assemble({
    authorization_decisions: seeded.decisions,
    effective_role_set: seeded.principal_context.effective_role_set,
    frozen_policy_snapshot_hash: seeded.principal_context.policy_snapshot_hash,
  });
  const projector = new PrincipalAccessViewProjector();

  const recoveryView = await projector.project({
    action_matrix: projection.action_matrix,
    active_filters: {
      principal_types: ["SERVICE"],
      principal_states: ["ACTIVE"],
      role_refs: ["TENANT_ADMIN"],
      delegated_client_refs: ["client.taxpayer.310"],
      recent_change_owner_refs: [seeded.principal_context.principal_id],
    },
    actor_session: seeded.actor_session,
    current_policy_snapshot_hash: seeded.runtime.policy_snapshot_hash,
    delegation_summaries: [],
    last_modified_at: "2026-04-23T09:09:00Z",
    latest_simulation_ref: undefined,
    principal_context: seeded.principal_context,
    principal_state: "ACTIVE",
    recent_change_owner_ref: seeded.principal_context.principal_id,
    reviewed_policy_snapshot_hash: seeded.runtime.policy_snapshot_hash,
    role_editor_pending_change_refs: undefined,
    selected_cell_ref: "cell.Override.CREATE_OVERRIDE",
    selected_role_template_ref: undefined,
    source_decision_by_cell_ref: projection.source_decision_by_cell_ref,
    workspace_mode: "PRINCIPALS",
  });
  expect(recoveryView.settlement_state).toBe("RECOVERY_REQUIRED");
  expect(recoveryView.recovery_posture).toBe("ACCESS_REBIND_REQUIRED");
  expect(recoveryView.focus_anchor_ref).toBeNull();
  expect(recoveryView.selected_action_detail).toBeNull();

  const staleView = await projector.project({
    action_matrix: projection.action_matrix,
    active_filters: {
      principal_types: ["HUMAN"],
      principal_states: ["ACTIVE"],
      role_refs: ["TENANT_ADMIN"],
      delegated_client_refs: ["client.taxpayer.310"],
      recent_change_owner_refs: [seeded.principal_context.principal_id],
    },
    actor_session: seeded.actor_session,
    current_policy_snapshot_hash: `${"0".repeat(63)}1`,
    delegation_summaries: [],
    last_modified_at: "2026-04-23T09:09:00Z",
    latest_simulation_ref: undefined,
    principal_context: seeded.principal_context,
    principal_state: "ACTIVE",
    recent_change_owner_ref: seeded.principal_context.principal_id,
    reviewed_policy_snapshot_hash: seeded.runtime.policy_snapshot_hash,
    role_editor_pending_change_refs: undefined,
    selected_cell_ref: "cell.ConfigChangeRequest.APPROVE_CONFIG",
    selected_role_template_ref: undefined,
    source_decision_by_cell_ref: projection.source_decision_by_cell_ref,
    workspace_mode: "PRINCIPALS",
  });
  expect(staleView.settlement_state).toBe("STALE_REVIEW_REQUIRED");
  expect(staleView.recovery_posture).toBe("INLINE_REBASE");
  expect(staleView.access_workspace.selected_cell_ref).toBe("cell.ConfigChangeRequest.APPROVE_CONFIG");
});

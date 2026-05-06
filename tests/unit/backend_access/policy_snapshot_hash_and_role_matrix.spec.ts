import { expect, test } from "@playwright/test";

import {
  GovernancePolicySnapshotProjector,
  RoleTemplateMatrixProjector,
  buildGovernancePolicySnapshotHash,
  buildRoleTemplateVersionHash,
} from "../../../packages/backend-access/src/index.ts";

test("policy snapshot hash stays stable across equivalent policy ordering drift", async () => {
  const input = {
    environment_bindings: [
      {
        environment_ref: "env_preproduction_verification",
        provider_environment: "sandbox",
        status: "READ_ONLY" as const,
      },
      {
        environment_ref: "env_shared_sandbox_integration",
        provider_environment: "sandbox",
        status: "ACTIVE" as const,
      },
    ],
    session_security_posture: {
      browser_session_allowed: true,
      native_session_allowed: true,
      automation_session_allowed: true,
      csrf_binding_required: true,
      native_device_binding_required: true,
      step_up_rotation_required: true,
    },
    step_up_rules: [
      {
        action_family: "SUBMIT_TO_AUTHORITY",
        required_authn_level: "STEP_UP" as const,
        reason_codes: ["STEP_UP_REQUIRED_FOR_AUTHORITY_SUBMISSION"],
      },
      {
        action_family: "EXECUTE_ERASURE",
        required_authn_level: "STEP_UP" as const,
        reason_codes: ["STEP_UP_REQUIRED_FOR_ERASURE_EXECUTION"],
      },
    ],
    approval_rules: [
      {
        action_family: "EXECUTE_ERASURE",
        approval_required: true,
        approval_scope: "approval.erasure.security-review",
      },
      {
        action_family: "CREATE_OVERRIDE",
        approval_required: true,
        approval_scope: "approval.override.single-approver",
      },
    ],
    masking_defaults: [
      "mask.client_personal_fields",
      "mask.authority_secret_material",
    ],
    non_delegable_action_families: [
      "SUBMIT_TO_AUTHORITY",
      "EXECUTE_ERASURE",
    ],
    role_templates: [
      {
        role_id: "TENANT_ADMIN",
        actor_profiles: ["TENANT_ADMIN"],
        approval_capabilities: ["SINGLE_APPROVER"],
        client_portal_capabilities: ["REQUEST_ASSISTANCE_ON_BEHALF"],
        principal_types: ["HUMAN"],
        run_kind_capabilities: ["GOVERNANCE_SIMULATION"],
        grant_groups: [
          {
            grant_group_ref: "admin-read-masked",
            resource_classes: ["Client", "SubmissionRecord"],
            action_families: ["VIEW_MASKED"],
            decision: "ALLOW_MASKED" as const,
            effective_scope_profile: "READ_ONLY",
            masking_rules: [
              "mask.client_personal_fields",
              "mask.authority_secret_material",
            ],
            reason_codes: ["ROLE_TENANT_ADMIN_BASELINE_ALLOW_MASKED"],
          },
        ],
      },
    ],
    resource_action_catalog: {
      scope_profiles: {
        READ_ONLY: ["year_end"],
        OPERATE_SUBMIT: ["year_end", "prepare_submission", "submit"],
      },
      action_rows: [
        {
          action_family: "SUBMIT_TO_AUTHORITY",
          policy_path_ref: "resource_action_catalog.action_rows.SUBMIT_TO_AUTHORITY",
        },
        {
          action_family: "VIEW_MASKED",
          policy_path_ref: "resource_action_catalog.action_rows.VIEW_MASKED",
        },
      ],
      resource_rows: [
        {
          resource_class: "SubmissionRecord",
          action_families: ["SUBMIT_TO_AUTHORITY", "VIEW_MASKED"],
          policy_path_ref: "resource_action_catalog.resource_rows.SubmissionRecord",
        },
        {
          resource_class: "Client",
          action_families: ["VIEW_MASKED"],
          policy_path_ref: "resource_action_catalog.resource_rows.Client",
        },
      ],
    },
    material_config_hashes: {
      authentication_level_policy: "hash.authn.001",
      approval_requirement_resolution: "hash.approval.001",
      default_roles: "hash.roles.001",
      resource_action_catalog: "hash.catalog.001",
    },
  };

  const reordered = {
    ...input,
    environment_bindings: [...input.environment_bindings].reverse(),
    step_up_rules: [...input.step_up_rules].reverse(),
    approval_rules: [...input.approval_rules].reverse(),
    masking_defaults: [...input.masking_defaults].reverse(),
    non_delegable_action_families: [...input.non_delegable_action_families].reverse(),
    role_templates: [...input.role_templates].map((role) => ({
      ...role,
      grant_groups: [...role.grant_groups].reverse(),
    })),
    resource_action_catalog: {
      scope_profiles: {
        OPERATE_SUBMIT: ["submit", "prepare_submission", "year_end"],
        READ_ONLY: ["year_end"],
      },
      action_rows: [...input.resource_action_catalog.action_rows].reverse(),
      resource_rows: [...input.resource_action_catalog.resource_rows].reverse(),
    },
    material_config_hashes: {
      resource_action_catalog: "hash.catalog.001",
      default_roles: "hash.roles.001",
      approval_requirement_resolution: "hash.approval.001",
      authentication_level_policy: "hash.authn.001",
    },
  };

  expect(buildGovernancePolicySnapshotHash(reordered)).toBe(
    buildGovernancePolicySnapshotHash(input),
  );
});

test("role template version hash ignores row and cell ordering drift but preserves pending edit identity", async () => {
  const input = {
    role_id: "TENANT_ADMIN",
    role_label: "Tenant Admin",
    policy_snapshot_hash: "policy.snapshot.hash.0095",
    role_editor_pending_change_refs: [
      "pending-change.role.tenant-admin.001",
      "pending-change.role.tenant-admin.002",
    ],
    matrix_rows: [
      {
        resource_class: "SubmissionRecord",
        row_label: "Submission Record",
        cell_refs: [
          "cell.SubmissionRecord.SUBMIT_TO_AUTHORITY",
          "cell.SubmissionRecord.VIEW_MASKED",
        ],
      },
    ],
    matrix_columns: [
      {
        action_family: "SUBMIT_TO_AUTHORITY",
        column_label: "Submit To Authority",
      },
      {
        action_family: "VIEW_MASKED",
        column_label: "View Masked",
      },
    ],
    matrix_cells: [
      {
        cell_ref: "cell.SubmissionRecord.SUBMIT_TO_AUTHORITY",
        resource_class: "SubmissionRecord",
        action_family: "SUBMIT_TO_AUTHORITY",
        decision: "REQUIRE_STEP_UP" as const,
        reason_codes: ["STEP_UP_REQUIRED_FOR_AUTHORITY_SUBMISSION"],
        effective_scope: ["submit", "prepare_submission", "year_end"],
        masking_rules: [],
        required_approvals: [],
        required_authn_level: "STEP_UP" as const,
        policy_path_ref: "authentication_level_policy.rules.submit-to-authority",
        pending_change_ref_or_null: "pending-change.role.tenant-admin.002",
      },
      {
        cell_ref: "cell.SubmissionRecord.VIEW_MASKED",
        resource_class: "SubmissionRecord",
        action_family: "VIEW_MASKED",
        decision: "ALLOW_MASKED" as const,
        reason_codes: ["ROLE_TENANT_ADMIN_BASELINE_ALLOW_MASKED"],
        effective_scope: ["year_end"],
        masking_rules: ["mask.client_personal_fields"],
        required_approvals: [],
        required_authn_level: null,
        policy_path_ref: "default_roles.roles.TENANT_ADMIN.grant_groups.admin-read-masked",
        pending_change_ref_or_null: null,
      },
    ],
  };

  const reordered = {
    ...input,
    role_editor_pending_change_refs: [...input.role_editor_pending_change_refs].reverse(),
    matrix_rows: [...input.matrix_rows].reverse(),
    matrix_columns: [...input.matrix_columns].reverse(),
    matrix_cells: [...input.matrix_cells].reverse().map((cell) =>
      cell.cell_ref === "cell.SubmissionRecord.SUBMIT_TO_AUTHORITY"
        ? {
            ...cell,
            effective_scope: ["year_end", "prepare_submission", "submit"],
          }
        : cell,
    ),
  };

  expect(buildRoleTemplateVersionHash(reordered)).toBe(
    buildRoleTemplateVersionHash(input),
  );
});

test("projected role matrix preserves ALLOW_MASKED and keeps step-up plus approval visible without contaminating the policy hash", async () => {
  const snapshotProjector = new GovernancePolicySnapshotProjector();
  const roleProjector = new RoleTemplateMatrixProjector();

  const baselineSnapshot = await snapshotProjector.project();
  const pendingSnapshot = await snapshotProjector.project({
    selected_filter_chip_refs: ["section:SECURITY_POSTURE", "policy:CURRENT"],
  });

  expect(pendingSnapshot.policy_snapshot_hash).toBe(
    baselineSnapshot.policy_snapshot_hash,
  );

  const baseMatrix = await roleProjector.project({
    role_id: "TENANT_ADMIN",
    selected_cell_ref: "cell.Client.VIEW_MASKED",
  });
  const pendingMatrix = await roleProjector.project({
    role_id: "TENANT_ADMIN",
    selected_cell_ref: "cell.RetentionAction.EXECUTE_ERASURE",
    role_editor_pending_change_refs: ["pending-change.role.tenant-admin.001"],
    pending_change_map: {
      "cell.RetentionAction.EXECUTE_ERASURE":
        "pending-change.role.tenant-admin.001",
    },
  });

  const maskedCell = baseMatrix.matrix_cells.find(
    (cell) => cell.cell_ref === "cell.Client.VIEW_MASKED",
  );
  const fullCell = baseMatrix.matrix_cells.find(
    (cell) => cell.cell_ref === "cell.Client.VIEW_FULL",
  );

  expect(maskedCell?.decision).toBe("ALLOW_MASKED");
  expect(maskedCell?.masking_rules).toContain("mask.client_personal_fields");
  expect(fullCell?.decision).toBe("ALLOW");

  expect(pendingMatrix.policy_snapshot_hash).toBe(baseMatrix.policy_snapshot_hash);
  expect(pendingMatrix.version_hash).not.toBe(baseMatrix.version_hash);
  expect(pendingMatrix.role_matrix_workspace.inspector_state).toBe("ROLE_EDITING");
  expect(pendingMatrix.selected_action_detail?.decision).toBe("REQUIRE_APPROVAL");
  expect(pendingMatrix.selected_action_detail?.required_authn_level).toBe(
    "STEP_UP",
  );
  expect(
    pendingMatrix.selected_action_detail?.required_approvals,
  ).toContain("approval.erasure.security-review");
  expect(
    pendingMatrix.selected_action_detail?.pending_change_ref_or_null,
  ).toBe("pending-change.role.tenant-admin.001");
});

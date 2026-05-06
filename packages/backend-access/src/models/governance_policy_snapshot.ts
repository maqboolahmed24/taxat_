import type {
  GovernancePolicySnapshot as SchemaGovernancePolicySnapshot,
  GovernancePolicySnapshotApprovalRequirementNullable,
  GovernancePolicySnapshotRecoveryPosture,
  GovernancePolicySnapshotSectionCode,
  GovernancePolicySnapshotSettlementState,
} from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";

import {
  normalizeStringSet,
  requireTrimmedString,
} from "../services/principal_context_normalizer.ts";

export type GovernancePolicySnapshotApprovalComposerRecord = Omit<
  SchemaGovernancePolicySnapshot["approval_composer"],
  "expires_at"
> & {
  expires_at: string | null;
};

export type GovernancePolicySnapshotRecord = Omit<
  SchemaGovernancePolicySnapshot,
  "approval_composer"
> & {
  approval_composer: GovernancePolicySnapshotApprovalComposerRecord;
};

export type CreateGovernancePolicySnapshotInput = GovernancePolicySnapshotRecord;

type GovernancePolicySnapshotModelErrorCode =
  | "GOVERNANCE_POLICY_SNAPSHOT_FIELD_REQUIRED"
  | "GOVERNANCE_POLICY_SNAPSHOT_INVALID";

export class GovernancePolicySnapshotModelError extends Error {
  readonly code: GovernancePolicySnapshotModelErrorCode;

  constructor(
    code: GovernancePolicySnapshotModelErrorCode,
    detail: string,
  ) {
    super(`${code}: ${detail}`);
    this.name = "GovernancePolicySnapshotModelError";
    this.code = code;
  }
}

function assertCondition(
  condition: unknown,
  code: GovernancePolicySnapshotModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new GovernancePolicySnapshotModelError(code, detail);
  }
}

function normalizeSettlementState(value: unknown) {
  const state = requireTrimmedString(
    "settlement_state",
    value,
  ) as GovernancePolicySnapshotSettlementState;
  assertCondition(
    [
      "STEADY",
      "RECEIPT_PENDING",
      "FRESHENING",
      "STALE_REVIEW_REQUIRED",
      "DEGRADED_READ_ONLY",
      "RECOVERY_REQUIRED",
    ].includes(state),
    "GOVERNANCE_POLICY_SNAPSHOT_FIELD_REQUIRED",
    "settlement_state must remain a supported governance snapshot posture",
  );
  return state;
}

function normalizeRecoveryPosture(value: unknown) {
  const posture = requireTrimmedString(
    "recovery_posture",
    value,
  ) as GovernancePolicySnapshotRecoveryPosture;
  assertCondition(
    [
      "NONE",
      "INLINE_RECONNECT",
      "INLINE_REBASE",
      "READ_ONLY_LIMITED",
      "OBJECT_SUPERSEDED",
      "ACCESS_REBIND_REQUIRED",
    ].includes(posture),
    "GOVERNANCE_POLICY_SNAPSHOT_FIELD_REQUIRED",
    "recovery_posture must remain a supported governance snapshot recovery posture",
  );
  return posture;
}

function normalizeApprovalRequirement(
  value: unknown,
): GovernancePolicySnapshotApprovalRequirementNullable {
  if (value === null) {
    return null;
  }
  const requirement = requireTrimmedString(
    "approval_requirement",
    value,
  ) as Exclude<GovernancePolicySnapshotApprovalRequirementNullable, null>;
  assertCondition(
    [
      "NOT_REQUIRED",
      "SINGLE_APPROVER",
      "DUAL_APPROVER",
      "SECURITY_REVIEW",
      "CHANGE_ADVISORY_QUORUM",
    ].includes(requirement),
    "GOVERNANCE_POLICY_SNAPSHOT_FIELD_REQUIRED",
    "approval_requirement must remain a supported governed approval posture",
  );
  return requirement;
}

function normalizeSectionCode(value: unknown) {
  const section = requireTrimmedString(
    "tenant_config_workspace.active_section_code",
    value,
  ) as GovernancePolicySnapshotSectionCode;
  assertCondition(
    [
      "TENANT_PROFILE",
      "SECURITY_POSTURE",
      "AUTHORITY_AND_ENVIRONMENTS",
      "CONNECTOR_POLICY",
      "APPROVAL_AND_CHANGE_CONTROL",
      "NOTIFICATIONS_AND_EVIDENCE",
    ].includes(section),
    "GOVERNANCE_POLICY_SNAPSHOT_FIELD_REQUIRED",
    "active_section_code must remain a supported governance policy section",
  );
  return section;
}

export function normalizeGovernancePolicySnapshotRecord(
  input: CreateGovernancePolicySnapshotInput,
): GovernancePolicySnapshotRecord {
  try {
    const artifact_type = requireTrimmedString("artifact_type", input.artifact_type);
    const snapshot_id = requireTrimmedString("snapshot_id", input.snapshot_id);
    const tenant_id = requireTrimmedString("tenant_id", input.tenant_id);
    const shell_family = requireTrimmedString("shell_family", input.shell_family);
    const object_anchor_ref = requireTrimmedString(
      "object_anchor_ref",
      input.object_anchor_ref,
    );
    const dominant_question = requireTrimmedString(
      "dominant_question",
      input.dominant_question,
    );
    const settlement_state = normalizeSettlementState(input.settlement_state);
    const recovery_posture = normalizeRecoveryPosture(input.recovery_posture);
    const policy_snapshot_hash = requireTrimmedString(
      "policy_snapshot_hash",
      input.policy_snapshot_hash,
    );
    const captured_at = normalizeUtcInstantString(input.captured_at);
    const last_material_change_ref = requireTrimmedString(
      "last_material_change_ref",
      input.last_material_change_ref,
    );

    assertCondition(
      artifact_type === "GovernancePolicySnapshot",
      "GOVERNANCE_POLICY_SNAPSHOT_FIELD_REQUIRED",
      "artifact_type must be GovernancePolicySnapshot",
    );
    assertCondition(
      shell_family === "GOVERNANCE_DENSITY_SHELL",
      "GOVERNANCE_POLICY_SNAPSHOT_FIELD_REQUIRED",
      "shell_family must remain GOVERNANCE_DENSITY_SHELL",
    );

    const environment_bindings = [...input.environment_bindings]
      .map((binding) => ({
        environment_ref: requireTrimmedString(
          "environment_bindings[].environment_ref",
          binding.environment_ref,
        ),
        provider_environment: requireTrimmedString(
          "environment_bindings[].provider_environment",
          binding.provider_environment,
        ),
        status: requireTrimmedString(
          "environment_bindings[].status",
          binding.status,
        ) as GovernancePolicySnapshotRecord["environment_bindings"][number]["status"],
      }))
      .sort((left, right) =>
        left.environment_ref.localeCompare(right.environment_ref),
      );

    const session_security_posture = {
      browser_session_allowed: Boolean(
        input.session_security_posture.browser_session_allowed,
      ),
      native_session_allowed: Boolean(
        input.session_security_posture.native_session_allowed,
      ),
      automation_session_allowed: Boolean(
        input.session_security_posture.automation_session_allowed,
      ),
      csrf_binding_required: Boolean(
        input.session_security_posture.csrf_binding_required,
      ),
      native_device_binding_required: Boolean(
        input.session_security_posture.native_device_binding_required,
      ),
      step_up_rotation_required: Boolean(
        input.session_security_posture.step_up_rotation_required,
      ),
    };

    const step_up_rules = [...input.step_up_rules]
      .map((rule) => ({
        action_family: requireTrimmedString(
          "step_up_rules[].action_family",
          rule.action_family,
        ),
        required_authn_level: requireTrimmedString(
          "step_up_rules[].required_authn_level",
          rule.required_authn_level,
        ) as GovernancePolicySnapshotRecord["step_up_rules"][number]["required_authn_level"],
        reason_codes: normalizeStringSet(
          "step_up_rules[].reason_codes",
          rule.reason_codes,
          { minItems: 1 },
        ),
      }))
      .sort((left, right) =>
        left.action_family.localeCompare(right.action_family),
      );

    const approval_rules = [...input.approval_rules]
      .map((rule) => ({
        action_family: requireTrimmedString(
          "approval_rules[].action_family",
          rule.action_family,
        ),
        approval_required: Boolean(rule.approval_required),
        approval_scope:
          rule.approval_scope === null
            ? null
            : requireTrimmedString(
                "approval_rules[].approval_scope",
                rule.approval_scope,
              ),
      }))
      .sort((left, right) =>
        left.action_family.localeCompare(right.action_family),
      );

    const masking_defaults = normalizeStringSet(
      "masking_defaults",
      input.masking_defaults,
    );

    const tenant_config_workspace = {
      surface_order: input.tenant_config_workspace.surface_order,
      section_nav_order: input.tenant_config_workspace.section_nav_order,
      active_section_code: normalizeSectionCode(
        input.tenant_config_workspace.active_section_code,
      ),
      visible_form_section_refs: normalizeStringSet(
        "tenant_config_workspace.visible_form_section_refs",
        input.tenant_config_workspace.visible_form_section_refs,
        { minItems: 1 },
      ),
      inline_policy_help: {
        help_mode: "INLINE" as const,
        help_refs: normalizeStringSet(
          "tenant_config_workspace.inline_policy_help.help_refs",
          input.tenant_config_workspace.inline_policy_help.help_refs,
          { minItems: 1 },
        ),
      },
    };

    const change_basket = {
      basket_state: requireTrimmedString(
        "change_basket.basket_state",
        input.change_basket.basket_state,
      ) as GovernancePolicySnapshotRecord["change_basket"]["basket_state"],
      simulation_atomicity: requireTrimmedString(
        "change_basket.simulation_atomicity",
        input.change_basket.simulation_atomicity,
      ) as GovernancePolicySnapshotRecord["change_basket"]["simulation_atomicity"],
      submission_enabled: Boolean(input.change_basket.submission_enabled),
      active_simulation_basis_hash:
        input.change_basket.active_simulation_basis_hash === null
          ? null
          : requireTrimmedString(
              "change_basket.active_simulation_basis_hash",
              input.change_basket.active_simulation_basis_hash,
            ),
      active_dependency_topology_hash:
        input.change_basket.active_dependency_topology_hash === null
          ? null
          : requireTrimmedString(
              "change_basket.active_dependency_topology_hash",
              input.change_basket.active_dependency_topology_hash,
            ),
      active_mutation_hazard_or_null:
        input.change_basket.active_mutation_hazard_or_null === null
          ? null
          : structuredClone(input.change_basket.active_mutation_hazard_or_null),
      active_mutation_basis_contract_or_null:
        input.change_basket.active_mutation_basis_contract_or_null === null
          ? null
          : structuredClone(input.change_basket.active_mutation_basis_contract_or_null),
      step_up_pending: Boolean(input.change_basket.step_up_pending),
      approval_requirement: normalizeApprovalRequirement(
        input.change_basket.approval_requirement,
      ),
      bounded_safe_mutation: input.change_basket.bounded_safe_mutation,
      required_approvals: normalizeStringSet(
        "change_basket.required_approvals",
        input.change_basket.required_approvals,
      ),
      staged_change_groups: structuredClone(input.change_basket.staged_change_groups),
    };

    const approval_composer = {
      composer_state: requireTrimmedString(
        "approval_composer.composer_state",
        input.approval_composer.composer_state,
      ) as GovernancePolicySnapshotRecord["approval_composer"]["composer_state"],
      requested_approver_scope: normalizeStringSet(
        "approval_composer.requested_approver_scope",
        input.approval_composer.requested_approver_scope,
      ),
      related_object_refs: normalizeStringSet(
        "approval_composer.related_object_refs",
        input.approval_composer.related_object_refs,
      ),
      rationale_required: Boolean(input.approval_composer.rationale_required),
      rationale_ref:
        input.approval_composer.rationale_ref === null
          ? null
          : requireTrimmedString(
              "approval_composer.rationale_ref",
              input.approval_composer.rationale_ref,
            ),
      expires_at:
        input.approval_composer.expires_at === null
          ? null
          : normalizeUtcInstantString(input.approval_composer.expires_at),
      mutation_basis_contract_or_null:
        input.approval_composer.mutation_basis_contract_or_null === null
          ? null
          : structuredClone(input.approval_composer.mutation_basis_contract_or_null),
    };

    const blast_radius_panel = {
      panel_state: requireTrimmedString(
        "blast_radius_panel.panel_state",
        input.blast_radius_panel.panel_state,
      ) as GovernancePolicySnapshotRecord["blast_radius_panel"]["panel_state"],
      mutation_hazard_or_null:
        input.blast_radius_panel.mutation_hazard_or_null === null
          ? null
          : structuredClone(input.blast_radius_panel.mutation_hazard_or_null),
      mutation_basis_contract_or_null:
        input.blast_radius_panel.mutation_basis_contract_or_null === null
          ? null
          : structuredClone(input.blast_radius_panel.mutation_basis_contract_or_null),
    };

    const config_history_timeline = {
      timeline_state: requireTrimmedString(
        "config_history_timeline.timeline_state",
        input.config_history_timeline.timeline_state,
      ) as GovernancePolicySnapshotRecord["config_history_timeline"]["timeline_state"],
      latest_change_ref: requireTrimmedString(
        "config_history_timeline.latest_change_ref",
        input.config_history_timeline.latest_change_ref,
      ),
      selected_change_ref: requireTrimmedString(
        "config_history_timeline.selected_change_ref",
        input.config_history_timeline.selected_change_ref,
      ),
      visible_change_refs: normalizeStringSet(
        "config_history_timeline.visible_change_refs",
        input.config_history_timeline.visible_change_refs,
        { minItems: 1 },
      ),
    };

    return {
      artifact_type: "GovernancePolicySnapshot",
      snapshot_id,
      tenant_id,
      shell_family: "GOVERNANCE_DENSITY_SHELL",
      object_anchor_ref,
      dominant_question,
      settlement_state,
      recovery_posture,
      interaction_layer: structuredClone(input.interaction_layer),
      cache_isolation_contract: structuredClone(input.cache_isolation_contract),
      policy_snapshot_hash,
      environment_bindings,
      session_security_posture,
      step_up_rules,
      approval_rules,
      masking_defaults,
      last_material_change_ref,
      tenant_config_workspace,
      change_basket,
      approval_composer,
      blast_radius_panel,
      config_history_timeline,
      captured_at,
    } satisfies GovernancePolicySnapshotRecord;
  } catch (error) {
    if (error instanceof GovernancePolicySnapshotModelError) {
      throw error;
    }
    throw new GovernancePolicySnapshotModelError(
      "GOVERNANCE_POLICY_SNAPSHOT_INVALID",
      error instanceof Error ? error.message : String(error),
    );
  }
}

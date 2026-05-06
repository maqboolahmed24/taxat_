import type { CanonicalJsonValue } from "../../../domain-kernel/src/primitives/hash.ts";

import {
  buildCanonicalHashVector,
  canonicalHashDigest,
  normalizeCanonicalHashValue,
  normalizeCanonicalStringSet,
  requireCanonicalString,
  sortSetLikeStrings,
} from "./canonical_hash_serializer.ts";

export type GovernancePolicySnapshotHashEnvironmentBinding = {
  environment_ref: string;
  provider_environment: string;
  status: "ACTIVE" | "READ_ONLY" | "DISABLED";
};

export type GovernancePolicySnapshotHashSessionSecurityPosture = {
  automation_session_allowed: boolean;
  browser_session_allowed: boolean;
  csrf_binding_required: boolean;
  native_device_binding_required: boolean;
  native_session_allowed: boolean;
  step_up_rotation_required: boolean;
};

export type GovernancePolicySnapshotHashStepUpRule = {
  action_family: string;
  reason_codes: readonly string[];
  required_authn_level: "BASIC" | "MFA" | "STEP_UP";
};

export type GovernancePolicySnapshotHashApprovalRule = {
  action_family: string;
  approval_required: boolean;
  approval_scope: string | null;
};

export type GovernancePolicySnapshotHashRoleGrantGroup = {
  action_families: readonly string[];
  decision: "ALLOW" | "ALLOW_MASKED";
  effective_scope_profile: string;
  grant_group_ref: string;
  masking_rules?: readonly string[] | undefined;
  policy_path_ref?: string | undefined;
  reason_codes: readonly string[];
  resource_classes: readonly string[];
};

export type GovernancePolicySnapshotHashRoleTemplate = {
  actor_profiles: readonly string[];
  approval_capabilities: readonly string[];
  client_portal_capabilities: readonly string[];
  grant_groups: readonly GovernancePolicySnapshotHashRoleGrantGroup[];
  principal_types: readonly string[];
  role_id: string;
  run_kind_capabilities: readonly string[];
};

export type GovernancePolicySnapshotHashResourceActionCatalog = {
  action_rows: readonly Record<string, unknown>[];
  resource_rows: readonly Record<string, unknown>[];
  scope_profiles: Record<string, readonly string[]>;
};

export type GovernancePolicySnapshotHashInput = {
  approval_rules: readonly GovernancePolicySnapshotHashApprovalRule[];
  environment_bindings: readonly GovernancePolicySnapshotHashEnvironmentBinding[];
  masking_defaults: readonly string[];
  material_config_hashes: Record<string, string>;
  non_delegable_action_families: readonly string[];
  resource_action_catalog: GovernancePolicySnapshotHashResourceActionCatalog;
  role_templates: readonly GovernancePolicySnapshotHashRoleTemplate[];
  session_security_posture: GovernancePolicySnapshotHashSessionSecurityPosture;
  step_up_rules: readonly GovernancePolicySnapshotHashStepUpRule[];
};

export function buildGovernancePolicySnapshotHashVector(
  input: GovernancePolicySnapshotHashInput,
) {
  const payload = {
    artifact_type: "GovernancePolicySnapshot",
    policy_contract_boundary: "GOVERNANCE_POLICY_SNAPSHOT_HASH_V1",
    environment_bindings: [...input.environment_bindings]
      .map((binding) => ({
        environment_ref: requireCanonicalString(
          "environment_bindings[].environment_ref",
          binding.environment_ref,
        ),
        provider_environment: requireCanonicalString(
          "environment_bindings[].provider_environment",
          binding.provider_environment,
        ),
        status: requireCanonicalString(
          "environment_bindings[].status",
          binding.status,
        ),
      }))
      .sort((left, right) =>
        left.environment_ref.localeCompare(right.environment_ref),
      ),
    session_security_posture: {
      automation_session_allowed: Boolean(
        input.session_security_posture.automation_session_allowed,
      ),
      browser_session_allowed: Boolean(
        input.session_security_posture.browser_session_allowed,
      ),
      csrf_binding_required: Boolean(
        input.session_security_posture.csrf_binding_required,
      ),
      native_device_binding_required: Boolean(
        input.session_security_posture.native_device_binding_required,
      ),
      native_session_allowed: Boolean(
        input.session_security_posture.native_session_allowed,
      ),
      step_up_rotation_required: Boolean(
        input.session_security_posture.step_up_rotation_required,
      ),
    },
    step_up_rules: [...input.step_up_rules]
      .map((rule) => ({
        action_family: requireCanonicalString(
          "step_up_rules[].action_family",
          rule.action_family,
        ),
        required_authn_level: requireCanonicalString(
          "step_up_rules[].required_authn_level",
          rule.required_authn_level,
        ),
        reason_codes: normalizeCanonicalStringSet(
          "step_up_rules[].reason_codes",
          rule.reason_codes,
          { minItems: 1 },
        ),
      }))
      .sort((left, right) =>
        left.action_family.localeCompare(right.action_family),
      ),
    approval_rules: [...input.approval_rules]
      .map((rule) => ({
        action_family: requireCanonicalString(
          "approval_rules[].action_family",
          rule.action_family,
        ),
        approval_required: Boolean(rule.approval_required),
        approval_scope:
          rule.approval_scope === null
            ? null
            : requireCanonicalString(
                "approval_rules[].approval_scope",
                rule.approval_scope,
              ),
      }))
      .sort((left, right) =>
        left.action_family.localeCompare(right.action_family),
      ),
    masking_defaults: normalizeCanonicalStringSet(
      "masking_defaults",
      input.masking_defaults,
    ),
    non_delegable_action_families: normalizeCanonicalStringSet(
      "non_delegable_action_families",
      input.non_delegable_action_families,
    ),
    role_templates: [...input.role_templates]
      .map((role) => ({
        role_id: requireCanonicalString("role_templates[].role_id", role.role_id),
        actor_profiles: normalizeCanonicalStringSet(
          "role_templates[].actor_profiles",
          role.actor_profiles,
        ),
        approval_capabilities: normalizeCanonicalStringSet(
          "role_templates[].approval_capabilities",
          role.approval_capabilities,
        ),
        client_portal_capabilities: normalizeCanonicalStringSet(
          "role_templates[].client_portal_capabilities",
          role.client_portal_capabilities,
        ),
        principal_types: normalizeCanonicalStringSet(
          "role_templates[].principal_types",
          role.principal_types,
        ),
        run_kind_capabilities: normalizeCanonicalStringSet(
          "role_templates[].run_kind_capabilities",
          role.run_kind_capabilities,
        ),
        grant_groups: [...role.grant_groups]
          .map((group) => ({
            grant_group_ref: requireCanonicalString(
              "role_templates[].grant_groups[].grant_group_ref",
              group.grant_group_ref,
            ),
            decision: requireCanonicalString(
              "role_templates[].grant_groups[].decision",
              group.decision,
            ),
            effective_scope_profile: requireCanonicalString(
              "role_templates[].grant_groups[].effective_scope_profile",
              group.effective_scope_profile,
            ),
            action_families: normalizeCanonicalStringSet(
              "role_templates[].grant_groups[].action_families",
              group.action_families,
              { minItems: 1 },
            ),
            resource_classes: normalizeCanonicalStringSet(
              "role_templates[].grant_groups[].resource_classes",
              group.resource_classes,
              { minItems: 1 },
            ),
            masking_rules: normalizeCanonicalStringSet(
              "role_templates[].grant_groups[].masking_rules",
              group.masking_rules ?? [],
            ),
            reason_codes: normalizeCanonicalStringSet(
              "role_templates[].grant_groups[].reason_codes",
              group.reason_codes,
              { minItems: 1 },
            ),
            policy_path_ref:
              group.policy_path_ref === undefined
                ? null
                : requireCanonicalString(
                    "role_templates[].grant_groups[].policy_path_ref",
                    group.policy_path_ref,
                  ),
          }))
          .sort((left, right) =>
            left.grant_group_ref.localeCompare(right.grant_group_ref),
          ),
      }))
      .sort((left, right) => left.role_id.localeCompare(right.role_id)),
    resource_action_catalog: {
      action_rows: [...input.resource_action_catalog.action_rows]
        .map((row) => normalizeCanonicalHashValue(row))
        .sort((left, right) =>
          JSON.stringify(left).localeCompare(JSON.stringify(right)),
        ),
      resource_rows: [...input.resource_action_catalog.resource_rows]
        .map((row) => normalizeCanonicalHashValue(row))
        .sort((left, right) =>
          JSON.stringify(left).localeCompare(JSON.stringify(right)),
        ),
      scope_profiles: Object.fromEntries(
        Object.entries(input.resource_action_catalog.scope_profiles)
          .map(([profile, scopeTokens]) => [
            requireCanonicalString("scope_profiles key", profile),
            normalizeCanonicalStringSet("scope_profiles values", scopeTokens),
          ] as const)
          .sort(([left], [right]) => left.localeCompare(right)),
      ),
    },
    material_config_hashes: Object.fromEntries(
      Object.entries(input.material_config_hashes)
        .map(([configRef, digest]) => [
          requireCanonicalString("material_config_hashes key", configRef),
          requireCanonicalString("material_config_hashes digest", digest),
        ] as const)
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
  } satisfies CanonicalJsonValue;

  return buildCanonicalHashVector(payload);
}

export function buildGovernancePolicySnapshotHash(
  input: GovernancePolicySnapshotHashInput,
) {
  return canonicalHashDigest(
    buildGovernancePolicySnapshotHashVector(input).payload,
  );
}

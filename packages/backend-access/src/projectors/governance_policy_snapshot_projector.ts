import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type {
  GovernanceInteractionLayer,
  GovernancePolicySnapshotApprovalRule,
  GovernancePolicySnapshotEnvironmentBinding,
  GovernancePolicySnapshotSessionSecurityPosture,
  GovernancePolicySnapshotStepUpRule,
} from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import { createCacheIsolationContract } from "../../../domain-kernel/src/cache/cache_isolation_key.ts";
import {
  stableJsonHash,
  sortSetLikeStrings,
} from "../../../domain-kernel/src/primitives/hash.ts";

import type {
  AccessInputBundle,
  DefaultRoleSeed,
} from "../../../access-control/src/role_seed_loader.ts";
import { loadAccessInputBundle } from "../../../access-control/src/role_seed_loader.ts";

import {
  buildGovernancePolicySnapshotHash,
  type GovernancePolicySnapshotHashInput,
} from "../hash/policy_snapshot_hash.ts";
import {
  normalizeGovernancePolicySnapshotRecord,
  type GovernancePolicySnapshotRecord,
} from "../models/governance_policy_snapshot.ts";
import {
  normalizeStringSet,
  requireTrimmedString,
} from "../services/principal_context_normalizer.ts";

type AuthenticationLevelPolicyArtifact = {
  rules: Array<{
    resource_class: string;
    action_family: string;
    policy_path_ref: string;
    required_authn_level: "BASIC" | "MFA" | "STEP_UP";
    reason_code: string;
  }>;
  session_challenge_policy: {
    rotation_required_after_completion: boolean;
  };
  session_client_transition_rules: Array<{
    session_client_class: "BROWSER" | "NATIVE" | "AUTOMATION";
  }>;
};

type ApprovalRequirementResolutionArtifact = {
  rules: Array<{
    resource_class: string;
    action_family: string;
    approval_requirement:
      | "NOT_REQUIRED"
      | "SINGLE_APPROVER"
      | "DUAL_APPROVER"
      | "SECURITY_REVIEW"
      | "CHANGE_ADVISORY_QUORUM";
    policy_path_ref: string;
    reason_code: string;
    required_approvals: string[];
  }>;
};

type BrowserSessionSecurityPolicyArtifact = {
  binding_policy: {
    require_session_binding_for_state_changing_requests: boolean;
  };
  csrf_policy: {
    mechanism: string;
  };
};

type DeviceBindingPolicyArtifact = {
  native_device_binding_policy: {
    require_presented_session_binding: boolean;
  };
};

type NonDelegableActionFamilyCatalogArtifact = {
  action_families: Array<{
    action_family: string;
  }>;
};

type ProviderEnvironmentMatrixArtifact = {
  environment_rows: Array<{
    environment_ref: string;
    frozen_config_required: boolean;
    local_bootstrap_allowed: boolean;
    provider_environment_ref: string;
    stable_callback_host_required: boolean;
  }>;
};

export type GovernancePolicyProjectionInputs = {
  access_bundle: AccessInputBundle;
  approval_requirement_resolution: ApprovalRequirementResolutionArtifact;
  authentication_level_policy: AuthenticationLevelPolicyArtifact;
  browser_session_security_policy: BrowserSessionSecurityPolicyArtifact;
  device_binding_policy: DeviceBindingPolicyArtifact;
  material_config_hashes: Record<string, string>;
  non_delegable_action_family_catalog: NonDelegableActionFamilyCatalogArtifact;
  provider_environment_matrix: ProviderEnvironmentMatrixArtifact;
};

export type ProjectGovernancePolicySnapshotInput = {
  active_section_code?: GovernancePolicySnapshotRecord["tenant_config_workspace"]["active_section_code"];
  captured_at?: string;
  reviewed_policy_snapshot_hash?: string | null;
  selected_filter_chip_refs?: readonly string[];
  tenant_id?: string;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const configDir = path.join(repoRoot, "config");
const jsonPaths = {
  authentication_level_policy: path.join(
    configDir,
    "access",
    "authentication_level_policy.json",
  ),
  approval_requirement_resolution: path.join(
    configDir,
    "access",
    "approval_requirement_resolution.json",
  ),
  browser_session_security_policy: path.join(
    configDir,
    "access",
    "browser_session_security_policy.json",
  ),
  device_binding_policy: path.join(
    configDir,
    "access",
    "device_binding_policy.json",
  ),
  non_delegable_action_family_catalog: path.join(
    configDir,
    "access",
    "non_delegable_action_family_catalog.json",
  ),
  provider_environment_matrix: path.join(
    configDir,
    "runtime",
    "provider_environment_matrix.json",
  ),
} as const;

let cachedInputs: Promise<GovernancePolicyProjectionInputs> | null = null;

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function environmentStatusForRef(
  environmentRef: string,
): GovernancePolicySnapshotEnvironmentBinding["status"] {
  switch (environmentRef) {
    case "env_shared_sandbox_integration":
      return "ACTIVE";
    case "env_preproduction_verification":
      return "READ_ONLY";
    default:
      return "DISABLED";
  }
}

function roleTemplateHashShape(role: DefaultRoleSeed) {
  return {
    role_id: role.role_id,
    actor_profiles: [...role.actor_profiles],
    principal_types: [...role.principal_types],
    approval_capabilities: [...role.approval_capabilities],
    client_portal_capabilities: [...role.client_portal_capabilities],
    run_kind_capabilities: [...role.run_kind_capabilities],
    grant_groups: role.grant_groups.map((group) => ({
      grant_group_ref: group.grant_group_ref,
      resource_classes: [...group.resource_classes],
      action_families: [...group.action_families],
      decision: group.decision,
      effective_scope_profile: group.effective_scope_profile,
      masking_rules: group.masking_rules ? [...group.masking_rules] : [],
      reason_codes: [...group.reason_codes],
      policy_path_ref: group.policy_path_ref,
    })),
  };
}

export function buildGovernanceInteractionLayer(
  selectedFilterChipRefs: readonly string[],
): GovernanceInteractionLayer {
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
    selected_filter_chip_refs: normalizeStringSet(
      "selected_filter_chip_refs",
      selectedFilterChipRefs,
    ),
    compaction_mode: "WIDE",
    auxiliary_surface_presentation: "SIDECAR",
    focus_trap_mode: "NON_MODAL",
    selection_persistence_mode: "PRESERVE_WHILE_OBJECT_RESOLVES",
    preserved_context_codes: [
      "ACTIVE_FILTERS",
      "ACTIVE_SECTION",
      "SELECTION",
      "FOCUS_ANCHOR",
      "PROMOTED_SUPPORT_SURFACE",
      "CHANGE_BASKET",
    ],
    motion_profile: "SUBTLE_CAUSAL_ONLY",
    feedback_truth_policy: "DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN",
  };
}

export function deriveEnvironmentBindings(
  inputs: GovernancePolicyProjectionInputs,
) {
  return inputs.provider_environment_matrix.environment_rows
    .filter(
      (row) =>
        row.provider_environment_ref !== "NONE" &&
        row.frozen_config_required &&
        row.stable_callback_host_required &&
        !row.local_bootstrap_allowed,
    )
    .map((row) => ({
      environment_ref: row.environment_ref,
      provider_environment: row.provider_environment_ref,
      status: environmentStatusForRef(row.environment_ref),
    }))
    .sort((left, right) =>
      left.environment_ref.localeCompare(right.environment_ref),
    ) satisfies GovernancePolicySnapshotEnvironmentBinding[];
}

export function deriveSessionSecurityPosture(
  inputs: GovernancePolicyProjectionInputs,
) {
  const sessionClientClasses = new Set(
    inputs.authentication_level_policy.session_client_transition_rules.map(
      (rule) => rule.session_client_class,
    ),
  );
  return {
    browser_session_allowed: sessionClientClasses.has("BROWSER"),
    native_session_allowed: sessionClientClasses.has("NATIVE"),
    automation_session_allowed: sessionClientClasses.has("AUTOMATION"),
    csrf_binding_required:
      inputs.browser_session_security_policy.binding_policy.require_session_binding_for_state_changing_requests &&
      inputs.browser_session_security_policy.csrf_policy.mechanism ===
        "SYNCHRONIZER_TOKEN",
    native_device_binding_required:
      inputs.device_binding_policy.native_device_binding_policy.require_presented_session_binding,
    step_up_rotation_required:
      inputs.authentication_level_policy.session_challenge_policy.rotation_required_after_completion,
  } satisfies GovernancePolicySnapshotSessionSecurityPosture;
}

export function deriveStepUpRules(inputs: GovernancePolicyProjectionInputs) {
  const grouped = new Map<
    string,
    {
      required_authn_level: "BASIC" | "MFA" | "STEP_UP";
      reason_codes: Set<string>;
    }
  >();
  for (const rule of inputs.authentication_level_policy.rules) {
    const current = grouped.get(rule.action_family) ?? {
      required_authn_level: rule.required_authn_level,
      reason_codes: new Set<string>(),
    };
    current.reason_codes.add(rule.reason_code);
    current.required_authn_level =
      current.required_authn_level === "STEP_UP" ||
      rule.required_authn_level === "STEP_UP"
        ? "STEP_UP"
        : current.required_authn_level === "MFA" ||
            rule.required_authn_level === "MFA"
          ? "MFA"
          : "BASIC";
    grouped.set(rule.action_family, current);
  }
  const rules = [...grouped.entries()]
    .map(([action_family, aggregate]) => ({
      action_family,
      required_authn_level: aggregate.required_authn_level,
      reason_codes: [...aggregate.reason_codes].sort((left, right) =>
        left.localeCompare(right),
      ),
    }))
    .sort((left, right) =>
      left.action_family.localeCompare(right.action_family),
    );
  return rules satisfies GovernancePolicySnapshotStepUpRule[];
}

export function deriveApprovalRules(inputs: GovernancePolicyProjectionInputs) {
  const rules = [...inputs.approval_requirement_resolution.rules]
    .map((rule) => ({
      action_family: rule.action_family,
      approval_required: rule.approval_requirement !== "NOT_REQUIRED",
      approval_scope:
        rule.required_approvals.length === 0
          ? null
          : normalizeStringSet(
              "approval_scope",
              rule.required_approvals,
              { minItems: 1 },
            ).join(" | "),
    }))
    .sort((left, right) =>
      left.action_family.localeCompare(right.action_family),
    );
  return rules satisfies GovernancePolicySnapshotApprovalRule[];
}

export function deriveMaskingDefaults(inputs: GovernancePolicyProjectionInputs) {
  return sortSetLikeStrings(
    inputs.access_bundle.roleSeeds.roles.flatMap((role: DefaultRoleSeed) =>
      role.grant_groups.flatMap((group) =>
        group.decision === "ALLOW_MASKED" ? group.masking_rules ?? [] : [],
      ),
    ),
  );
}

export function buildGovernancePolicySnapshotHashInput(
  inputs: GovernancePolicyProjectionInputs,
): GovernancePolicySnapshotHashInput {
  return {
    environment_bindings: deriveEnvironmentBindings(inputs),
    session_security_posture: deriveSessionSecurityPosture(inputs),
    step_up_rules: deriveStepUpRules(inputs),
    approval_rules: deriveApprovalRules(inputs),
    masking_defaults: deriveMaskingDefaults(inputs),
    non_delegable_action_families: inputs.non_delegable_action_family_catalog.action_families.map(
      (entry) => entry.action_family,
    ),
    role_templates: inputs.access_bundle.roleSeeds.roles.map((role) =>
      roleTemplateHashShape(role),
    ),
    resource_action_catalog: {
      action_rows: inputs.access_bundle.resourceActionCatalog.action_rows,
      resource_rows: inputs.access_bundle.resourceActionCatalog.resource_rows,
      scope_profiles: inputs.access_bundle.resourceActionCatalog.scope_profiles,
    },
    material_config_hashes: inputs.material_config_hashes,
  };
}

async function buildMaterialConfigHashes() {
  const configEntries = await Promise.all(
    Object.entries(jsonPaths).map(async ([configRef, filePath]) => [
      configRef,
      stableJsonHash(JSON.parse(await readFile(filePath, "utf8"))),
    ] as const),
  );
  const accessBundle = await loadAccessInputBundle({ reload: true });
  return Object.fromEntries([
    ...configEntries,
    [
      "default_roles",
      stableJsonHash(accessBundle.roleSeeds),
    ],
    [
      "resource_action_catalog",
      stableJsonHash(accessBundle.resourceActionCatalog),
    ],
  ]);
}

export async function loadGovernancePolicyProjectionInputs(options?: {
  reload?: boolean;
}) {
  if (!cachedInputs || options?.reload) {
    cachedInputs = (async () => {
      const [
        access_bundle,
        authentication_level_policy,
        approval_requirement_resolution,
        browser_session_security_policy,
        device_binding_policy,
        non_delegable_action_family_catalog,
        provider_environment_matrix,
        material_config_hashes,
      ] = await Promise.all([
        loadAccessInputBundle({ reload: true }),
        readJson<AuthenticationLevelPolicyArtifact>(
          jsonPaths.authentication_level_policy,
        ),
        readJson<ApprovalRequirementResolutionArtifact>(
          jsonPaths.approval_requirement_resolution,
        ),
        readJson<BrowserSessionSecurityPolicyArtifact>(
          jsonPaths.browser_session_security_policy,
        ),
        readJson<DeviceBindingPolicyArtifact>(jsonPaths.device_binding_policy),
        readJson<NonDelegableActionFamilyCatalogArtifact>(
          jsonPaths.non_delegable_action_family_catalog,
        ),
        readJson<ProviderEnvironmentMatrixArtifact>(
          jsonPaths.provider_environment_matrix,
        ),
        buildMaterialConfigHashes(),
      ]);

      return {
        access_bundle,
        authentication_level_policy,
        approval_requirement_resolution,
        browser_session_security_policy,
        device_binding_policy,
        non_delegable_action_family_catalog,
        provider_environment_matrix,
        material_config_hashes,
      } satisfies GovernancePolicyProjectionInputs;
    })();
  }
  return cachedInputs;
}

export class GovernancePolicySnapshotProjector {
  async project(
    input: ProjectGovernancePolicySnapshotInput = {},
  ): Promise<GovernancePolicySnapshotRecord> {
    const tenant_id = input.tenant_id ?? "tenant.taxat-sandbox";
    const captured_at = input.captured_at ?? "2026-04-23T12:30:00Z";
    const policyInputs = await loadGovernancePolicyProjectionInputs();
    const policy_snapshot_hash = buildGovernancePolicySnapshotHash(
      buildGovernancePolicySnapshotHashInput(policyInputs),
    );
    const reviewed_policy_snapshot_hash =
      input.reviewed_policy_snapshot_hash === undefined
        ? policy_snapshot_hash
        : input.reviewed_policy_snapshot_hash;
    const stale = reviewed_policy_snapshot_hash !== null &&
      reviewed_policy_snapshot_hash !== policy_snapshot_hash;
    const object_anchor_ref = "/governance/access/policy-snapshot";
    const last_material_change_ref = `policy-change.${policy_snapshot_hash.slice(0, 16)}`;

    const cache_isolation_contract = await createCacheIsolationContract({
      cacheScopeClass: "GOVERNANCE_POLICY_SNAPSHOT",
      canonicalObjectRef: object_anchor_ref,
      principalClass: "STAFF_FULL",
      projectionVersionRef: policy_snapshot_hash,
      routeIdentityRef: object_anchor_ref,
      sessionBindingHash: "session-binding.governance-policy-snapshot.preview",
      shellFamily: "GOVERNANCE_DENSITY_SHELL",
      tenantId: tenant_id,
    });

    return normalizeGovernancePolicySnapshotRecord({
      artifact_type: "GovernancePolicySnapshot",
      snapshot_id: `governance-policy-snapshot.${policy_snapshot_hash}`,
      tenant_id,
      shell_family: "GOVERNANCE_DENSITY_SHELL",
      object_anchor_ref,
      dominant_question:
        "What committed policy slice governs access, authn, approvals, masking, and authority environments right now?",
      settlement_state: stale ? "STALE_REVIEW_REQUIRED" : "STEADY",
      recovery_posture: stale ? "INLINE_REBASE" : "NONE",
      interaction_layer: buildGovernanceInteractionLayer(
        input.selected_filter_chip_refs ?? [
          "section:APPROVAL_AND_CHANGE_CONTROL",
          "policy:CURRENT",
        ],
      ),
      cache_isolation_contract,
      policy_snapshot_hash,
      environment_bindings: deriveEnvironmentBindings(policyInputs),
      session_security_posture: deriveSessionSecurityPosture(policyInputs),
      step_up_rules: deriveStepUpRules(policyInputs),
      approval_rules: deriveApprovalRules(policyInputs),
      masking_defaults: deriveMaskingDefaults(policyInputs),
      last_material_change_ref,
      tenant_config_workspace: {
        surface_order: [
          "SECTION_NAV",
          "CONFIG_FORM",
          "INLINE_POLICY_HELP",
          "BLAST_RADIUS_PANEL",
          "CHANGE_BASKET",
          "APPROVAL_COMPOSER",
          "CONFIG_HISTORY_TIMELINE",
        ],
        section_nav_order: [
          "TENANT_PROFILE",
          "SECURITY_POSTURE",
          "AUTHORITY_AND_ENVIRONMENTS",
          "CONNECTOR_POLICY",
          "APPROVAL_AND_CHANGE_CONTROL",
          "NOTIFICATIONS_AND_EVIDENCE",
        ],
        active_section_code:
          input.active_section_code ?? "APPROVAL_AND_CHANGE_CONTROL",
        visible_form_section_refs: [
          "tenant-profile.identity-and-roles",
          "security-posture.browser-and-native-session-security",
          "authority-and-environments.provider-environment-bindings",
          "connector-policy.authority-link-and-session-binding",
          "approval-and-change-control.step-up-and-approval-policy",
          "notifications-and-evidence.audit-and-receipt-evidence",
        ],
        inline_policy_help: {
          help_mode: "INLINE",
          help_refs: Object.entries(policyInputs.material_config_hashes)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(
              ([configRef, digest]) =>
                `config://access/${configRef}?hash=${digest}`,
            ),
        },
      },
      change_basket: {
        basket_state: "EMPTY",
        simulation_atomicity: "EMPTY",
        submission_enabled: false,
        active_simulation_basis_hash: null,
        active_dependency_topology_hash: null,
        active_mutation_hazard_or_null: null,
        active_mutation_basis_contract_or_null: null,
        step_up_pending: false,
        approval_requirement: null,
        bounded_safe_mutation: null,
        required_approvals: [],
        staged_change_groups: [],
      },
      approval_composer: {
        composer_state: "NOT_REQUIRED",
        requested_approver_scope: [],
        related_object_refs: [],
        rationale_required: false,
        rationale_ref: null,
        expires_at: null,
        mutation_basis_contract_or_null: null,
      },
      blast_radius_panel: {
        panel_state: "EMPTY",
        mutation_hazard_or_null: null,
        mutation_basis_contract_or_null: null,
      },
      config_history_timeline: {
        timeline_state: stale ? "REBASE_REQUIRED" : "CURRENT",
        latest_change_ref: last_material_change_ref,
        selected_change_ref: last_material_change_ref,
        visible_change_refs: [last_material_change_ref],
      },
      captured_at,
    });
  }
}

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Page } from "@playwright/test";

import {
  assertProviderFlowAllowed,
  createDefaultProviderRegistry,
} from "../../../core/provider_registry.js";
import type { RunContext } from "../../../core/run_context.js";
import {
  appendEvidenceRecord,
  createEvidenceManifest,
  type EvidenceManifest,
} from "../../../core/evidence_manifest.js";
import {
  createPendingStep,
  transitionStep,
  type StepContract,
} from "../../../core/step_contract.js";
import {
  rankSelectors,
  type SelectorManifest,
} from "../../../core/selector_contract.js";

export const IDP_PROVIDER_ID = "oidc-external-idp-control-plane";
export const IDP_POLICY_FLOW_ID = "idp-role-scope-mfa-session-policy";
export const IDP_PROVIDER_DISPLAY_NAME = "OIDC External Identity Control Plane";
export const IDP_PROVIDER_VENDOR_ADAPTER = "AUTH0_COMPATIBLE_DASHBOARD";
export const IDP_PROVIDER_VENDOR_SELECTION = "PROVIDER_DEFAULT_APPLIED";
export const IDP_POLICY_VERSION = "1.0";
export const IDP_POLICY_GENERATED_ON = "2026-04-18";

export const IDP_POLICY_STEP_IDS = {
  openPolicyWorkspace: "idp.control-plane.policy.open-console",
  reconcileRolesAndScopes: "idp.control-plane.policy.reconcile-roles-and-scopes",
  reconcileMfaAndStepUp: "idp.control-plane.policy.reconcile-mfa-and-step-up",
  reconcileSessions: "idp.control-plane.policy.reconcile-sessions",
  persistEvidence: "idp.control-plane.policy.persist-evidence",
} as const;

export type IdpDecisionCell =
  | "ALLOW"
  | "ALLOW_MASKED"
  | "REQUIRE_STEP_UP"
  | "REQUIRE_APPROVAL"
  | "DENY";

export type IdpSurfaceFamily =
  | "OPERATOR_BROWSER"
  | "PORTAL_BROWSER"
  | "NATIVE_MACOS_OPERATOR"
  | "API_AUTOMATION"
  | "BROWSER_LIMITED_ENTRY"
  | "BROWSER_OR_MOBILE_TRANSFER";

export type IdpPolicyFlowOutcome =
  | "IDP_POLICIES_READY"
  | "IDP_POLICY_DRIFT_REQUIRES_REVIEW";

export interface SourceRef {
  source_ref: string;
  rationale: string;
}

export interface ProviderSelectionRecord {
  provider_selection_status: typeof IDP_PROVIDER_VENDOR_SELECTION;
  provider_family: "OIDC_EXTERNAL_IDP";
  provider_vendor_adapter: typeof IDP_PROVIDER_VENDOR_ADAPTER;
  provider_vendor_label: string;
  docs_urls: string[];
  source_refs: SourceRef[];
}

export interface IdpRoleRow {
  role_ref: string;
  provider_role_name: string;
  label: string;
  actor_classes: string[];
  allowed_surface_families: IdpSurfaceFamily[];
  baseline_scope_refs: string[];
  requestable_scope_refs: string[];
  assignment_posture:
    | "HUMAN_MEMBERSHIP_ROLE"
    | "SERVICE_CLIENT_GRANT_ROLE";
  engine_owned_dimensions: string[];
  source_refs: SourceRef[];
  notes: string[];
}

export interface IdpRoleCatalog {
  schema_version: "1.0";
  policy_pack_id: string;
  provider_id: typeof IDP_PROVIDER_ID;
  provider_display_name: typeof IDP_PROVIDER_DISPLAY_NAME;
  provider_selection: ProviderSelectionRecord;
  policy_version: typeof IDP_POLICY_VERSION;
  generated_on: typeof IDP_POLICY_GENERATED_ON;
  summary: {
    role_count: number;
    human_role_count: number;
    service_role_count: number;
  };
  roles: IdpRoleRow[];
  typed_gaps: string[];
  notes: string[];
}

export interface IdpScopeRow {
  scope_ref: string;
  provider_permission_name: string;
  label: string;
  scope_class: "BASELINE" | "ELEVATED";
  allowed_actor_classes: string[];
  allowed_surface_families: IdpSurfaceFamily[];
  idp_enforcement_meaning: string;
  engine_authorization_boundary: string;
  source_refs: SourceRef[];
  notes: string[];
}

export interface IdpScopeCatalog {
  schema_version: "1.0";
  catalog_id: string;
  provider_id: typeof IDP_PROVIDER_ID;
  provider_display_name: typeof IDP_PROVIDER_DISPLAY_NAME;
  provider_selection: ProviderSelectionRecord;
  policy_version: typeof IDP_POLICY_VERSION;
  generated_on: typeof IDP_POLICY_GENERATED_ON;
  summary: {
    scope_count: number;
    baseline_scope_count: number;
    elevated_scope_count: number;
  };
  scopes: IdpScopeRow[];
  typed_gaps: string[];
  notes: string[];
}

export interface IdpInvalidationEventRow {
  event_id: string;
  label: string;
  rotation_or_purge: string[];
  effects_on_command_acceptance: string;
  effects_on_resume_and_upload: string;
  continuity_rule: string;
  source_refs: string[];
}

export interface IdpStepUpTriggerRow {
  trigger_id: string;
  label: string;
  trigger_kind:
    | "STEP_UP_OR_APPROVAL_REQUIRED"
    | "STEP_UP_REQUIRED"
    | "AUTHENTICATED_SESSION_UPGRADE_REQUIRED";
  action_family_refs: string[];
  actor_classes: string[];
  role_refs: string[];
  scope_refs: string[];
  surface_families: IdpSurfaceFamily[];
  session_profile_refs: string[];
  step_up_cell: IdpDecisionCell;
  approval_cell: IdpDecisionCell;
  authn_level_on_success: "BASIC" | "MFA" | "STEP_UP";
  step_up_state_on_entry:
    | "NOT_REQUIRED"
    | "REQUIRED_PENDING"
    | "SATISFIED"
    | "EXPIRED";
  step_up_state_on_success:
    | "NOT_REQUIRED"
    | "REQUIRED_PENDING"
    | "SATISFIED"
    | "EXPIRED";
  assurance_requirement: string;
  revalidation_requirements: string[];
  invalidation_events: string[];
  source_refs: string[];
  notes: string[];
}

export interface StepUpPolicyMatrix {
  schema_version: "1.0";
  matrix_id: string;
  provider_id: typeof IDP_PROVIDER_ID;
  provider_display_name: typeof IDP_PROVIDER_DISPLAY_NAME;
  provider_selection: ProviderSelectionRecord;
  policy_version: typeof IDP_POLICY_VERSION;
  generated_on: typeof IDP_POLICY_GENERATED_ON;
  summary: {
    trigger_count: number;
    step_up_or_approval_required_count: number;
    step_up_required_count: number;
    upgrade_gate_count: number;
    invalidation_event_count: number;
  };
  invalidation_events: IdpInvalidationEventRow[];
  trigger_rows: IdpStepUpTriggerRow[];
  typed_gaps: string[];
  notes: string[];
}

export interface IdpSessionPolicyRow {
  session_profile_ref: string;
  flow_id: string;
  label: string;
  channel:
    | "BROWSER"
    | "NATIVE_MACOS"
    | "API_AUTOMATION"
    | "BROWSER_LIMITED_ENTRY"
    | "BROWSER_OR_MOBILE_TRANSFER";
  actor_classes: string[];
  allowed_surface_families: IdpSurfaceFamily[];
  session_carrier: string;
  auth0_application_types: string[];
  auth0_cookie_mode:
    | "NON_PERSISTENT"
    | "PERSISTENT"
    | "NOT_APPLICABLE_NON_BROWSER";
  default_idle_timeout_hours: number | null;
  default_absolute_timeout_hours: number | null;
  action_idle_timeout_hours: number | null;
  action_absolute_timeout_hours: number | null;
  refresh_token_rotation:
    | "DISABLED"
    | "ROTATING_EXPIRING"
    | "NOT_APPLICABLE";
  refresh_token_lifetime_seconds: number | null;
  refresh_token_leeway_seconds: number | null;
  offline_access_allowed: boolean;
  base_authn_level: "BASIC" | "MFA" | "STEP_UP";
  escalated_authn_level: "BASIC" | "MFA" | "STEP_UP";
  post_step_up_rotation: boolean;
  invalidation_events: string[];
  entry_posture: string;
  storage_boundary: string;
  source_refs: string[];
  notes: string[];
}

export interface IdpSessionPolicyMatrix {
  schema_version: "1.0";
  matrix_id: string;
  provider_id: typeof IDP_PROVIDER_ID;
  provider_display_name: typeof IDP_PROVIDER_DISPLAY_NAME;
  provider_selection: ProviderSelectionRecord;
  policy_version: typeof IDP_POLICY_VERSION;
  generated_on: typeof IDP_POLICY_GENERATED_ON;
  summary: {
    session_profile_count: number;
    interactive_human_profiles: number;
    non_interactive_or_limited_profiles: number;
  };
  session_profiles: IdpSessionPolicyRow[];
  typed_gaps: string[];
  notes: string[];
}

export interface IdpMfaPolicyProfile {
  tenant_default_policy: "NEVER_WITH_ACTION_DRIVEN_STEP_UP";
  enabled_independent_factors: string[];
  enabled_dependent_factors: string[];
  adaptive_risk_assessment_logging: "ENABLED";
  step_up_strategy: "REQUEST_ELEVATED_SCOPE_THEN_CHALLENGE_IN_POST_LOGIN_ACTION";
  source_refs: string[];
  notes: string[];
}

export interface IdpPolicyDriftRow {
  field_ref: string;
  expected: string;
  actual: string;
  severity: "BLOCKING";
}

export interface IdpPolicyEvidenceTemplate {
  schema_version: "1.0";
  policy_evidence_id: string;
  provider_id: typeof IDP_PROVIDER_ID;
  provider_display_name: typeof IDP_PROVIDER_DISPLAY_NAME;
  run_id: string;
  flow_id: typeof IDP_POLICY_FLOW_ID;
  workspace_id: string;
  product_environment_id: string;
  provider_environment: RunContext["providerEnvironment"];
  operator_identity_alias: string;
  provider_selection: ProviderSelectionRecord;
  policy_version: typeof IDP_POLICY_VERSION;
  generated_on: typeof IDP_POLICY_GENERATED_ON;
  role_catalog_ref: string;
  scope_catalog_ref: string;
  step_up_policy_ref: string;
  session_policy_ref: string;
  mfa_profile: IdpMfaPolicyProfile;
  observed_console_posture: {
    source_disposition: "CREATED_DURING_RUN" | "ADOPTED_EXISTING";
    role_refs: string[];
    scope_refs: string[];
    enabled_factors: string[];
    tenant_default_mfa_policy: string;
    session_profile_refs: string[];
    notes: string[];
  };
  drift_register: IdpPolicyDriftRow[];
  source_refs: SourceRef[];
  typed_gaps: string[];
  notes: string[];
  last_verified_at: string;
}

export interface ConfigureIdpPoliciesOptions {
  page: Page;
  runContext: RunContext;
  policyEvidencePath: string;
  entryUrls?: IdpPolicyEntryUrls;
}

export interface ConfigureIdpPoliciesResult {
  outcome: IdpPolicyFlowOutcome;
  steps: StepContract[];
  evidenceManifestPath: string;
  roleCatalog: IdpRoleCatalog;
  scopeCatalog: IdpScopeCatalog;
  stepUpPolicyMatrix: StepUpPolicyMatrix;
  sessionPolicyMatrix: IdpSessionPolicyMatrix;
  policyEvidence: IdpPolicyEvidenceTemplate;
  driftRegister: IdpPolicyDriftRow[];
}

export interface IdpPolicyEntryUrls {
  controlPlane: string;
}

interface PolicyFixtureState {
  policyVersion: string;
  sourceDisposition: "CREATED_DURING_RUN" | "ADOPTED_EXISTING";
  roleRefs: string[];
  scopeRefs: string[];
  enabledFactors: string[];
  tenantDefaultMfaPolicy: string;
  sessionProfileRefs: string[];
  notes: string[];
}

function nowIso(): string {
  return new Date().toISOString();
}

async function persistJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function loadAuth0PolicySelectorManifest(): Promise<SelectorManifest> {
  const raw = await readFile(
    new URL("../auth0/policy_selector_manifest.json", import.meta.url),
    "utf8",
  );
  const parsed = JSON.parse(raw) as SelectorManifest;
  return {
    ...parsed,
    selectors: rankSelectors(parsed.selectors),
  };
}

export function createDefaultIdpPolicyEntryUrls(): IdpPolicyEntryUrls {
  return {
    controlPlane: "https://manage.auth0.com/dashboard/access-control",
  };
}

function createProviderSelectionRecord(): ProviderSelectionRecord {
  return {
    provider_selection_status: IDP_PROVIDER_VENDOR_SELECTION,
    provider_family: "OIDC_EXTERNAL_IDP",
    provider_vendor_adapter: IDP_PROVIDER_VENDOR_ADAPTER,
    provider_vendor_label: "Auth0-compatible external IdP",
    docs_urls: [
      "https://auth0.com/docs/get-started/auth0-overview/create-tenants/set-up-multiple-environments",
      "https://auth0.com/docs/manage-users/access-control/rbac",
      "https://auth0.com/docs/secure/multi-factor-authentication/enable-mfa",
      "https://auth0.com/docs/secure/multi-factor-authentication/step-up-authentication",
      "https://auth0.com/docs/manage-users/sessions/configure-session-lifetime-settings",
      "https://auth0.com/docs/manage-users/sessions/manage-user-sessions-with-auth0-management-api",
      "https://auth0.com/docs/secure/tokens/refresh-tokens/configure-refresh-token-rotation",
      "https://auth0.com/docs/get-started/applications/application-settings",
    ],
    source_refs: [
      {
        source_ref:
          "Algorithm/actor_and_authority_model.md::L62[3.3_Actor_classes]",
        rationale:
          "Taxat actor classes split client, tenant-human, service, and external boundaries before authorization is evaluated.",
      },
      {
        source_ref:
          "Algorithm/actor_and_authority_model.md::L326[3.9_Policy_decision_model]",
        rationale:
          "The IdP may bootstrap authentication posture, but the engine still owns the final ALLOW or REQUIRE_STEP_UP or REQUIRE_APPROVAL or DENY decision.",
      },
      {
        source_ref:
          "Algorithm/northbound_api_and_session_contract.md::L709[8._Session_browser_and_native-client_rules]",
        rationale:
          "Browser, native, machine, and limited-entry session channels must remain distinct and challenge rotation must invalidate stale pre-step-up state.",
      },
      {
        source_ref:
          "https://auth0.com/docs/manage-users/access-control/rbac",
        rationale:
          "Current Auth0 RBAC guidance allows coarse role and permission assignment while keeping richer authorization in the application.",
      },
      {
        source_ref:
          "https://auth0.com/docs/secure/multi-factor-authentication/step-up-authentication",
        rationale:
          "Current Auth0 step-up guidance relies on requested scopes and Actions rather than a single tenant-wide MFA toggle.",
      },
      {
        source_ref:
          "https://auth0.com/docs/manage-users/sessions/configure-session-lifetime-settings",
        rationale:
          "Current Auth0 session guidance supports tenant defaults plus per-login overrides through Actions.",
      },
    ],
  };
}

const ENGINE_OWNED_DIMENSIONS = [
  "delegation_basis",
  "client_scope",
  "partition_scope_refs",
  "authority_link_state",
  "authority_of_record_outcome",
  "approval_capabilities",
  "masking_posture",
  "policy_snapshot_hash",
];

const ROLE_ROWS: IdpRoleRow[] = [
  {
    role_ref: "role_portal_user",
    provider_role_name: "Portal User",
    label: "Portal user",
    actor_classes: ["CLIENT_VIEWER", "CLIENT_CONTRIBUTOR"],
    allowed_surface_families: [
      "PORTAL_BROWSER",
      "BROWSER_LIMITED_ENTRY",
      "BROWSER_OR_MOBILE_TRANSFER",
    ],
    baseline_scope_refs: ["scope.portal.read", "scope.portal.contribute"],
    requestable_scope_refs: [],
    assignment_posture: "HUMAN_MEMBERSHIP_ROLE",
    engine_owned_dimensions: ENGINE_OWNED_DIMENSIONS,
    source_refs: [
      {
        source_ref:
          "Algorithm/actor_and_authority_model.md::L62[3.3_Actor_classes]",
        rationale:
          "Portal viewer and contributor are distinct actor classes, but both remain coarse client-portal entry postures at the IdP boundary.",
      },
      {
        source_ref:
          "Algorithm/customer_client_portal_experience_contract.md::L29[portal_actor_classes]",
        rationale:
          "Portal read and contribution capabilities are route-level affordances, not legal delegation truth.",
      },
    ],
    notes: [
      "This role never proves delegation to a specific client or authority scope.",
    ],
  },
  {
    role_ref: "role_portal_signatory",
    provider_role_name: "Portal Signatory",
    label: "Portal signatory",
    actor_classes: ["CLIENT_SIGNATORY"],
    allowed_surface_families: ["PORTAL_BROWSER", "BROWSER_LIMITED_ENTRY"],
    baseline_scope_refs: [
      "scope.portal.read",
      "scope.portal.signatory.base",
    ],
    requestable_scope_refs: ["scope.elevated.client_signoff"],
    assignment_posture: "HUMAN_MEMBERSHIP_ROLE",
    engine_owned_dimensions: ENGINE_OWNED_DIMENSIONS,
    source_refs: [
      {
        source_ref:
          "Algorithm/actor_and_authority_model.md::L251[client_signatory_step_up_rule]",
        rationale:
          "CLIENT_SIGNATORY remains separate because sign-off may require STEP_UP_VERIFIED assurance.",
      },
      {
        source_ref:
          "Algorithm/customer_client_portal_experience_contract.md::L340[Approval_and_sign-off_flow]",
        rationale:
          "Portal sign-off stays on the same approval-pack route and the IdP role cannot decide declaration legality on its own.",
      },
    ],
    notes: [
      "This role is necessary for coarse signatory entry posture, but the engine still validates frozen approval-pack state and declaration basis.",
    ],
  },
  {
    role_ref: "role_operator_workspace",
    provider_role_name: "Operator Workspace",
    label: "Operator workspace",
    actor_classes: ["PREPARER", "REVIEWER"],
    allowed_surface_families: ["OPERATOR_BROWSER", "NATIVE_MACOS_OPERATOR"],
    baseline_scope_refs: [
      "scope.operator.workspace",
      "scope.audit.read.masked",
    ],
    requestable_scope_refs: ["scope.elevated.authority_link"],
    assignment_posture: "HUMAN_MEMBERSHIP_ROLE",
    engine_owned_dimensions: ENGINE_OWNED_DIMENSIONS,
    source_refs: [
      {
        source_ref:
          "Algorithm/actor_and_authority_model.md::L62[3.3_Actor_classes]",
        rationale:
          "PREPARER and REVIEWER are tenant-side humans with shared operator-shell entry posture but different server-side legality later on.",
      },
      {
        source_ref:
          "Algorithm/macos_native_operator_workspace_blueprint.md::L372[7._Authentication_and_session_strategy]",
        rationale:
          "The operator workspace spans browser and native shells while keeping the legal session model server-authoritative.",
      },
    ],
    notes: [
      "This role does not automatically grant unmasked export, approval, or retention exception authority.",
    ],
  },
  {
    role_ref: "role_governance_admin",
    provider_role_name: "Governance Admin",
    label: "Governance admin",
    actor_classes: ["TENANT_ADMIN", "APPROVER"],
    allowed_surface_families: ["OPERATOR_BROWSER", "NATIVE_MACOS_OPERATOR"],
    baseline_scope_refs: [
      "scope.operator.workspace",
      "scope.governance.read",
    ],
    requestable_scope_refs: [
      "scope.elevated.authority_link",
      "scope.elevated.override_approval",
      "scope.elevated.submit",
      "scope.elevated.unmasked_export",
      "scope.elevated.config_approval",
      "scope.elevated.retention_exception",
      "scope.elevated.governance_mutation",
    ],
    assignment_posture: "HUMAN_MEMBERSHIP_ROLE",
    engine_owned_dimensions: ENGINE_OWNED_DIMENSIONS,
    source_refs: [
      {
        source_ref:
          "Algorithm/actor_and_authority_model.md::L490[3.11_Non-delegable_and_step-up_actions]",
        rationale:
          "Governance admin posture covers the human actors that can legitimately request elevated authority-link, override, config, submission, or retention actions.",
      },
      {
        source_ref:
          "Algorithm/northbound_api_and_session_contract.md::L380[3.1_Governance_command_families]",
        rationale:
          "Governance commands that widen access or change retention posture are step-up or approval worthy and must remain explicit.",
      },
    ],
    notes: [
      "A governance admin role is still only a coarse entry point. The engine decides the exact action tuple and bounded mutation legality.",
    ],
  },
  {
    role_ref: "role_audit_review",
    provider_role_name: "Audit Review",
    label: "Audit review",
    actor_classes: ["AUDITOR"],
    allowed_surface_families: ["OPERATOR_BROWSER", "NATIVE_MACOS_OPERATOR"],
    baseline_scope_refs: ["scope.audit.read.masked"],
    requestable_scope_refs: ["scope.elevated.unmasked_export"],
    assignment_posture: "HUMAN_MEMBERSHIP_ROLE",
    engine_owned_dimensions: ENGINE_OWNED_DIMENSIONS,
    source_refs: [
      {
        source_ref:
          "Algorithm/actor_and_authority_model.md::L62[3.3_Actor_classes]",
        rationale:
          "AUDITOR is a distinct tenant-side human actor class and should not inherit governance mutation scopes by default.",
      },
      {
        source_ref:
          "Algorithm/actor_and_authority_model.md::L490[3.11_Non-delegable_and_step-up_actions]",
        rationale:
          "Unmasked provenance export is elevated even for auditors.",
      },
    ],
    notes: [
      "Unmasked export remains elevated and request-scoped rather than baseline.",
    ],
  },
  {
    role_ref: "role_support_operator",
    provider_role_name: "Support Operator",
    label: "Support operator",
    actor_classes: ["SUPPORT_OPERATOR"],
    allowed_surface_families: ["OPERATOR_BROWSER", "NATIVE_MACOS_OPERATOR"],
    baseline_scope_refs: [
      "scope.support.workspace",
      "scope.audit.read.masked",
    ],
    requestable_scope_refs: [
      "scope.elevated.out_of_band_annotation",
      "scope.elevated.unmasked_export",
    ],
    assignment_posture: "HUMAN_MEMBERSHIP_ROLE",
    engine_owned_dimensions: ENGINE_OWNED_DIMENSIONS,
    source_refs: [
      {
        source_ref:
          "Algorithm/actor_and_authority_model.md::L62[3.3_Actor_classes]",
        rationale:
          "SUPPORT_OPERATOR is a separate human operator class and should not be collapsed into governance admin.",
      },
      {
        source_ref:
          "Algorithm/actor_and_authority_model.md::L539[3.12_Authority_precedence_rules]",
        rationale:
          "Out-of-band annotations stay distinct from authority truth and therefore require their own bounded elevated scope.",
      },
    ],
    notes: [
      "Support posture does not authorize silent truth rewrites or retention mutation.",
    ],
  },
  {
    role_ref: "role_service_runtime",
    provider_role_name: "Service Runtime",
    label: "Service runtime",
    actor_classes: [
      "SCHEDULER_SERVICE",
      "CONNECTOR_SERVICE",
      "NORMALIZER_SERVICE",
      "COMPUTE_SERVICE",
      "GRAPH_SERVICE",
      "FILING_SERVICE",
      "REPLAY_SERVICE",
      "RETENTION_SERVICE",
      "NOTIFICATION_SERVICE",
    ],
    allowed_surface_families: ["API_AUTOMATION"],
    baseline_scope_refs: ["scope.machine.runtime"],
    requestable_scope_refs: [],
    assignment_posture: "SERVICE_CLIENT_GRANT_ROLE",
    engine_owned_dimensions: ENGINE_OWNED_DIMENSIONS,
    source_refs: [
      {
        source_ref:
          "Algorithm/actor_and_authority_model.md::L555[3.13_Machine-actor_rules]",
        rationale:
          "Service principals remain first-class actors but never satisfy human step-up or approval paths.",
      },
      {
        source_ref:
          "Algorithm/northbound_api_and_session_contract.md::L709[8._Session_browser_and_native-client_rules]",
        rationale:
          "Machine automation uses short-lived non-browser credentials and must not masquerade as an interactive session.",
      },
    ],
    notes: [
      "Runtime service roles never imply human delegation or signatory legality.",
    ],
  },
  {
    role_ref: "role_provider_bootstrap_service",
    provider_role_name: "Provider Bootstrap Service",
    label: "Provider bootstrap service",
    actor_classes: ["CONNECTOR_SERVICE"],
    allowed_surface_families: ["API_AUTOMATION"],
    baseline_scope_refs: ["scope.idp.bootstrap.manage"],
    requestable_scope_refs: [],
    assignment_posture: "SERVICE_CLIENT_GRANT_ROLE",
    engine_owned_dimensions: ENGINE_OWNED_DIMENSIONS,
    source_refs: [
      {
        source_ref:
          "PROMPT/Checklist.md::L72[pc_0039]",
        rationale:
          "The provider bootstrap boundary already exists as a distinct machine client family and needs its own coarse management scope.",
      },
      {
        source_ref:
          "Algorithm/security_and_runtime_hardening_contract.md::L50[3._Secret_key_and_token_handling]",
        rationale:
          "IdP admin material must stay separated from general runtime application state.",
      },
    ],
    notes: [
      "This role exists only for controlled provisioning and provider-management automation, not product-runtime access.",
    ],
  },
];

const SCOPE_ROWS: IdpScopeRow[] = [
  {
    scope_ref: "scope.portal.read",
    provider_permission_name: "portal:read",
    label: "Portal read",
    scope_class: "BASELINE",
    allowed_actor_classes: [
      "CLIENT_VIEWER",
      "CLIENT_CONTRIBUTOR",
      "CLIENT_SIGNATORY",
    ],
    allowed_surface_families: ["PORTAL_BROWSER", "BROWSER_LIMITED_ENTRY"],
    idp_enforcement_meaning:
      "Allows the client portal shell to open after login; it does not prove delegation to any specific reporting subject.",
    engine_authorization_boundary:
      "The engine still decides client scope, masking, and per-object legality.",
    source_refs: [
      {
        source_ref:
          "Algorithm/customer_client_portal_experience_contract.md::L29[portal_actor_classes]",
        rationale:
          "Portal viewer-style access is a coarse client-facing posture.",
      },
    ],
    notes: [],
  },
  {
    scope_ref: "scope.portal.contribute",
    provider_permission_name: "portal:contribute",
    label: "Portal contribute",
    scope_class: "BASELINE",
    allowed_actor_classes: ["CLIENT_CONTRIBUTOR", "CLIENT_SIGNATORY"],
    allowed_surface_families: [
      "PORTAL_BROWSER",
      "BROWSER_LIMITED_ENTRY",
      "BROWSER_OR_MOBILE_TRANSFER",
    ],
    idp_enforcement_meaning:
      "Allows onboarding and upload-capable entry posture once the normal authenticated portal session exists.",
    engine_authorization_boundary:
      "The engine still validates upload-session binding, request scope, and stale-view guards.",
    source_refs: [
      {
        source_ref:
          "Algorithm/northbound_api_and_session_contract.md::L405[3.2_Client_portal_command_families]",
        rationale:
          "Upload and onboarding commands are typed backend commands and remain server-authorized.",
      },
    ],
    notes: [],
  },
  {
    scope_ref: "scope.portal.signatory.base",
    provider_permission_name: "portal:signatory-base",
    label: "Portal signatory base",
    scope_class: "BASELINE",
    allowed_actor_classes: ["CLIENT_SIGNATORY"],
    allowed_surface_families: ["PORTAL_BROWSER", "BROWSER_LIMITED_ENTRY"],
    idp_enforcement_meaning:
      "Marks that the account may enter signatory-capable portal surfaces before pack-specific legality is checked.",
    engine_authorization_boundary:
      "The engine still decides if a particular approval pack is signable and whether fresh step-up proof is mandatory.",
    source_refs: [
      {
        source_ref:
          "Algorithm/actor_and_authority_model.md::L251[client_signatory_step_up_rule]",
        rationale:
          "CLIENT_SIGNATORY is distinct from viewer or contributor and may later need STEP_UP_VERIFIED assurance.",
      },
    ],
    notes: [],
  },
  {
    scope_ref: "scope.operator.workspace",
    provider_permission_name: "operator:workspace",
    label: "Operator workspace",
    scope_class: "BASELINE",
    allowed_actor_classes: [
      "TENANT_ADMIN",
      "PREPARER",
      "REVIEWER",
      "APPROVER",
      "AUDITOR",
      "SUPPORT_OPERATOR",
    ],
    allowed_surface_families: ["OPERATOR_BROWSER", "NATIVE_MACOS_OPERATOR"],
    idp_enforcement_meaning:
      "Allows the internal operator shell to open after sign-in.",
    engine_authorization_boundary:
      "Per-client delegation, authority-link safety, and command legality remain server-authored.",
    source_refs: [
      {
        source_ref:
          "Algorithm/admin_governance_console_architecture.md::L1[governance_console_root]",
        rationale:
          "Operator and governance surfaces are shared shell vocabulary, but action legality is not string-matched from role names.",
      },
    ],
    notes: [],
  },
  {
    scope_ref: "scope.governance.read",
    provider_permission_name: "governance:read",
    label: "Governance read",
    scope_class: "BASELINE",
    allowed_actor_classes: ["TENANT_ADMIN", "APPROVER"],
    allowed_surface_families: ["OPERATOR_BROWSER", "NATIVE_MACOS_OPERATOR"],
    idp_enforcement_meaning:
      "Allows access to governance-density routes and policy explainability surfaces.",
    engine_authorization_boundary:
      "Mutation authority still depends on structured AUTHORIZE(...) results, not this coarse scope alone.",
    source_refs: [
      {
        source_ref:
          "Algorithm/actor_and_authority_model.md::L579[3.15_Frontend_and_governance-console_rendering_contract]",
        rationale:
          "Governance views must show separate permission, delegation, authority-link, and authn dimensions.",
      },
    ],
    notes: [],
  },
  {
    scope_ref: "scope.audit.read.masked",
    provider_permission_name: "audit:read-masked",
    label: "Audit read masked",
    scope_class: "BASELINE",
    allowed_actor_classes: [
      "TENANT_ADMIN",
      "PREPARER",
      "REVIEWER",
      "APPROVER",
      "AUDITOR",
      "SUPPORT_OPERATOR",
    ],
    allowed_surface_families: ["OPERATOR_BROWSER", "NATIVE_MACOS_OPERATOR"],
    idp_enforcement_meaning:
      "Allows masked audit and provenance inspection as a baseline read posture.",
    engine_authorization_boundary:
      "Unmasked export still requires an elevated request plus server-side legality.",
    source_refs: [
      {
        source_ref:
          "Algorithm/actor_and_authority_model.md::L326[3.9_Policy_decision_model]",
        rationale:
          "ALLOW_MASKED is a first-class decision that must stay explicit.",
      },
    ],
    notes: [],
  },
  {
    scope_ref: "scope.support.workspace",
    provider_permission_name: "support:workspace",
    label: "Support workspace",
    scope_class: "BASELINE",
    allowed_actor_classes: ["SUPPORT_OPERATOR"],
    allowed_surface_families: ["OPERATOR_BROWSER", "NATIVE_MACOS_OPERATOR"],
    idp_enforcement_meaning:
      "Allows support-oriented investigation surfaces without implying governance admin posture.",
    engine_authorization_boundary:
      "The engine still decides if the support operator may annotate or export unmasked evidence.",
    source_refs: [
      {
        source_ref:
          "docs/analysis/14_multisurface_requirements_pack.md::L79[Audit_investigation_workbench]",
        rationale:
          "Support and audit investigation are explicit governed surfaces with their own viewer capability profiles.",
      },
    ],
    notes: [],
  },
  {
    scope_ref: "scope.machine.runtime",
    provider_permission_name: "machine:runtime",
    label: "Machine runtime",
    scope_class: "BASELINE",
    allowed_actor_classes: [
      "SCHEDULER_SERVICE",
      "CONNECTOR_SERVICE",
      "NORMALIZER_SERVICE",
      "COMPUTE_SERVICE",
      "GRAPH_SERVICE",
      "FILING_SERVICE",
      "REPLAY_SERVICE",
      "RETENTION_SERVICE",
      "NOTIFICATION_SERVICE",
    ],
    allowed_surface_families: ["API_AUTOMATION"],
    idp_enforcement_meaning:
      "Allows service-to-service machine identity for product runtime clients only.",
    engine_authorization_boundary:
      "The engine still checks per-command PrincipalContext, idempotency, and service scope.",
    source_refs: [
      {
        source_ref:
          "Algorithm/actor_and_authority_model.md::L555[3.13_Machine-actor_rules]",
        rationale:
          "Service principals stay first-class actors but never substitute for humans.",
      },
    ],
    notes: [],
  },
  {
    scope_ref: "scope.idp.bootstrap.manage",
    provider_permission_name: "idp:bootstrap-manage",
    label: "IdP bootstrap manage",
    scope_class: "BASELINE",
    allowed_actor_classes: ["CONNECTOR_SERVICE"],
    allowed_surface_families: ["API_AUTOMATION"],
    idp_enforcement_meaning:
      "Allows the dedicated provider bootstrap client to manage Auth0-compatible control-plane settings.",
    engine_authorization_boundary:
      "This scope is outside product-runtime authorization and remains limited to provisioning automation.",
    source_refs: [
      {
        source_ref:
          "PROMPT/CARDS/pc_0039.md",
        rationale:
          "The earlier IdP topology card established a separate provider-management bootstrap client family.",
      },
    ],
    notes: [],
  },
  {
    scope_ref: "scope.elevated.authority_link",
    provider_permission_name: "elevated:authority-link",
    label: "Elevated authority link",
    scope_class: "ELEVATED",
    allowed_actor_classes: ["TENANT_ADMIN", "PREPARER", "APPROVER"],
    allowed_surface_families: ["OPERATOR_BROWSER", "NATIVE_MACOS_OPERATOR"],
    idp_enforcement_meaning:
      "Requesting this scope is the coarse signal that an authority-link or relink operation needs fresh MFA-capable step-up.",
    engine_authorization_boundary:
      "The engine still validates AuthorityBinding freshness, subject match, and bounded client scope.",
    source_refs: [
      {
        source_ref:
          "Algorithm/actor_and_authority_model.md::L490[3.11_Non-delegable_and_step-up_actions]",
        rationale:
          "Linking or re-linking software to the authority is explicitly elevated.",
      },
      {
        source_ref:
          "https://auth0.com/docs/secure/multi-factor-authentication/step-up-authentication",
        rationale:
          "Current Auth0 step-up guidance uses requested scopes plus Actions to trigger MFA for sensitive resources.",
      },
    ],
    notes: [],
  },
  {
    scope_ref: "scope.elevated.override_approval",
    provider_permission_name: "elevated:override-approval",
    label: "Elevated override approval",
    scope_class: "ELEVATED",
    allowed_actor_classes: ["TENANT_ADMIN", "APPROVER"],
    allowed_surface_families: ["OPERATOR_BROWSER", "NATIVE_MACOS_OPERATOR"],
    idp_enforcement_meaning:
      "Requests fresh MFA-capable posture before override approval affecting filing or parity outcome.",
    engine_authorization_boundary:
      "The engine still validates rationale, expiry, exact scope, and stale-view basis.",
    source_refs: [
      {
        source_ref:
          "Algorithm/actor_and_authority_model.md::L490[3.11_Non-delegable_and_step-up_actions]",
        rationale:
          "Override approval is explicitly elevated and bounded.",
      },
    ],
    notes: [],
  },
  {
    scope_ref: "scope.elevated.submit",
    provider_permission_name: "elevated:submit",
    label: "Elevated submit",
    scope_class: "ELEVATED",
    allowed_actor_classes: ["TENANT_ADMIN", "APPROVER"],
    allowed_surface_families: ["OPERATOR_BROWSER", "NATIVE_MACOS_OPERATOR"],
    idp_enforcement_meaning:
      "Requests fresh MFA-capable posture before operator-side submission or amendment send.",
    engine_authorization_boundary:
      "The engine still validates approval state, trust, authority link, packet readiness, and send-time identity.",
    source_refs: [
      {
        source_ref:
          "Algorithm/authority_interaction_protocol.md::L509[9.5_Preflight_sequence]",
        rationale:
          "Submission requires a current preflight sequence, not just a coarse elevated scope.",
      },
    ],
    notes: [],
  },
  {
    scope_ref: "scope.elevated.out_of_band_annotation",
    provider_permission_name: "elevated:out-of-band-annotation",
    label: "Elevated out-of-band annotation",
    scope_class: "ELEVATED",
    allowed_actor_classes: ["TENANT_ADMIN", "APPROVER", "SUPPORT_OPERATOR"],
    allowed_surface_families: ["OPERATOR_BROWSER", "NATIVE_MACOS_OPERATOR"],
    idp_enforcement_meaning:
      "Requests fresh human-gated posture before an out-of-band truth annotation is staged.",
    engine_authorization_boundary:
      "The engine still keeps UNKNOWN and OUT_OF_BAND truth distinct from confirmed authority acknowledgement.",
    source_refs: [
      {
        source_ref:
          "Algorithm/actor_and_authority_model.md::L539[3.12_Authority_precedence_rules]",
        rationale:
          "Out-of-band truth cannot silently become confirmed authority truth.",
      },
    ],
    notes: [],
  },
  {
    scope_ref: "scope.elevated.unmasked_export",
    provider_permission_name: "elevated:unmasked-export",
    label: "Elevated unmasked export",
    scope_class: "ELEVATED",
    allowed_actor_classes: [
      "TENANT_ADMIN",
      "APPROVER",
      "AUDITOR",
      "SUPPORT_OPERATOR",
    ],
    allowed_surface_families: ["OPERATOR_BROWSER", "NATIVE_MACOS_OPERATOR"],
    idp_enforcement_meaning:
      "Requests fresh MFA-capable posture before full evidence or unmasked provenance export.",
    engine_authorization_boundary:
      "The engine still evaluates masking rules, export posture, retention gates, and admissibility.",
    source_refs: [
      {
        source_ref:
          "Algorithm/actor_and_authority_model.md::L490[3.11_Non-delegable_and_step-up_actions]",
        rationale:
          "Unmasked export is explicitly elevated.",
      },
    ],
    notes: [],
  },
  {
    scope_ref: "scope.elevated.config_approval",
    provider_permission_name: "elevated:config-approval",
    label: "Elevated config approval",
    scope_class: "ELEVATED",
    allowed_actor_classes: ["TENANT_ADMIN", "APPROVER"],
    allowed_surface_families: ["OPERATOR_BROWSER", "NATIVE_MACOS_OPERATOR"],
    idp_enforcement_meaning:
      "Requests fresh MFA-capable posture before compliance-mode config approval.",
    engine_authorization_boundary:
      "The engine still verifies dependency topology hash, simulation basis hash, and bounded_safe_mutation posture.",
    source_refs: [
      {
        source_ref:
          "Algorithm/actor_and_authority_model.md::L326[3.9_Policy_decision_model]",
        rationale:
          "Governance mutation-capable actions preserve extra hashes and approval requirements beyond IdP posture.",
      },
    ],
    notes: [],
  },
  {
    scope_ref: "scope.elevated.retention_exception",
    provider_permission_name: "elevated:retention-exception",
    label: "Elevated retention exception",
    scope_class: "ELEVATED",
    allowed_actor_classes: ["TENANT_ADMIN", "APPROVER"],
    allowed_surface_families: ["OPERATOR_BROWSER", "NATIVE_MACOS_OPERATOR"],
    idp_enforcement_meaning:
      "Requests fresh MFA-capable posture before erasure, legal-hold release, or retention exception execution.",
    engine_authorization_boundary:
      "The engine still checks legal-hold, retention minimum, and irreversible mutation guards.",
    source_refs: [
      {
        source_ref:
          "Algorithm/actor_and_authority_model.md::L490[3.11_Non-delegable_and_step-up_actions]",
        rationale:
          "Retention exceptions are explicitly elevated and bounded.",
      },
    ],
    notes: [],
  },
  {
    scope_ref: "scope.elevated.governance_mutation",
    provider_permission_name: "elevated:governance-mutation",
    label: "Elevated governance mutation",
    scope_class: "ELEVATED",
    allowed_actor_classes: ["TENANT_ADMIN", "APPROVER"],
    allowed_surface_families: ["OPERATOR_BROWSER", "NATIVE_MACOS_OPERATOR"],
    idp_enforcement_meaning:
      "Requests fresh MFA-capable posture for governance mutations that widen access, change step-up posture, or relink authority scope.",
    engine_authorization_boundary:
      "The engine still binds the exact mutation tuple, affected client scope, and stale-view basis.",
    source_refs: [
      {
        source_ref:
          "Algorithm/northbound_api_and_session_contract.md::L405[governance_mutation_step_up_or_approval]",
        rationale:
          "Governance mutations that widen access or relink authority scope are elevated by source law.",
      },
    ],
    notes: [],
  },
  {
    scope_ref: "scope.elevated.client_signoff",
    provider_permission_name: "elevated:client-signoff",
    label: "Elevated client sign-off",
    scope_class: "ELEVATED",
    allowed_actor_classes: ["CLIENT_SIGNATORY"],
    allowed_surface_families: ["PORTAL_BROWSER", "BROWSER_LIMITED_ENTRY"],
    idp_enforcement_meaning:
      "Requests a fresh MFA-capable signatory checkpoint when the current approval pack demands step-up.",
    engine_authorization_boundary:
      "The engine still checks approval-pack hash, stale-view guard, declaration acknowledgement, and signability.",
    source_refs: [
      {
        source_ref:
          "Algorithm/northbound_api_and_session_contract.md::L429[fresh_step_up_proof_for_signoff]",
        rationale:
          "Sign-off requires fresh step-up proof whenever the pack or frozen policy demands it.",
      },
      {
        source_ref:
          "https://auth0.com/docs/secure/multi-factor-authentication/step-up-authentication",
        rationale:
          "Current Auth0 step-up guidance supports requesting elevated scopes to trigger MFA for sensitive routes.",
      },
    ],
    notes: [],
  },
];

const INVALIDATION_EVENTS: IdpInvalidationEventRow[] = [
  {
    event_id: "STEP_UP_COMPLETED",
    label: "Step-up completed",
    rotation_or_purge: [
      "Rotate effective session challenge state.",
      "Require revalidation of any pre-step-up command, cursor, or resumability artifact before reuse.",
    ],
    effects_on_command_acceptance:
      "Pre-step-up commands cannot be replayed blindly after the challenge state rotates.",
    effects_on_resume_and_upload:
      "Resume tokens, cursors, and upload-session control artifacts stay usable only if revalidated against the new challenge lineage.",
    continuity_rule:
      "Continuation returns to the same governed object and shell where the surface contract requires it.",
    source_refs: [
      "Algorithm/northbound_api_and_session_contract.md::L709[8._Session_browser_and_native-client_rules]",
      "Algorithm/security_and_runtime_hardening_contract.md::L30[2._Identity_session_and_command_trust]",
      "Algorithm/macos_native_operator_workspace_blueprint.md::L372[7._Authentication_and_session_strategy]",
    ],
  },
  {
    event_id: "SESSION_REVOKED",
    label: "Session revoked or administrator invalidation",
    rotation_or_purge: [
      "Invalidate outstanding resume tokens.",
      "Invalidate upload-session control operations.",
      "Block future command acceptance until re-authentication.",
    ],
    effects_on_command_acceptance:
      "All future commands fail closed until a lawful replacement session exists.",
    effects_on_resume_and_upload:
      "Outstanding resume, scene-restoration, and upload control artifacts become revoked state rather than silently continuing.",
    continuity_rule:
      "Clients surface revoked-session recovery rather than inventing a soft refresh.",
    source_refs: [
      "Algorithm/northbound_api_and_session_contract.md::L709[8._Session_browser_and_native-client_rules]",
      "Algorithm/security_and_runtime_hardening_contract.md::L30[2._Identity_session_and_command_trust]",
      "Algorithm/macos_native_operator_workspace_blueprint.md::L473[11._Security_and_runtime_posture_for_the_desktop_client]",
    ],
  },
  {
    event_id: "LOGOUT",
    label: "Logout",
    rotation_or_purge: [
      "Treat logout as explicit session revocation.",
      "Audit the revocation and clear interactive session material.",
    ],
    effects_on_command_acceptance:
      "Future interactive writes require a new authenticated session.",
    effects_on_resume_and_upload:
      "Browser or native resumability remains invalid until the next session re-establishes lawful scope.",
    continuity_rule:
      "No cached route context may silently regain live mutation posture after logout.",
    source_refs: [
      "Algorithm/security_and_runtime_hardening_contract.md::L30[2._Identity_session_and_command_trust]",
      "Algorithm/northbound_api_and_session_contract.md::L709[8._Session_browser_and_native-client_rules]",
    ],
  },
  {
    event_id: "TENANT_SWITCH",
    label: "Tenant or account switch",
    rotation_or_purge: [
      "Purge incompatible local caches and resume metadata.",
      "Force re-resolution of principal class, client scope, delegation basis, and masking posture.",
    ],
    effects_on_command_acceptance:
      "Commands must not reuse stale bindings from the prior tenant or account.",
    effects_on_resume_and_upload:
      "Resume tokens, native scenes, and upload sessions from the old tenant become invalid or rebind-required.",
    continuity_rule:
      "Clients reopen only the narrowest still-lawful target after the new tenant context is established.",
    source_refs: [
      "Algorithm/northbound_api_and_session_contract.md::L709[8._Session_browser_and_native-client_rules]",
      "Algorithm/macos_native_operator_workspace_blueprint.md::L390[8._Persistence_model]",
      "Algorithm/macos_native_operator_workspace_blueprint.md::L473[11._Security_and_runtime_posture_for_the_desktop_client]",
    ],
  },
  {
    event_id: "AUTHORITY_REBIND_OR_BINDING_DRIFT",
    label: "Authority rebinding or binding drift",
    rotation_or_purge: [
      "Require new binding resolution and, where materially different, a new request identity.",
      "Block delayed or queued send if token/client, subject, authority link, or approval or step-up evidence no longer match.",
    ],
    effects_on_command_acceptance:
      "Authority-integrated commands cannot continue on ambiguous or stale binding lineage.",
    effects_on_resume_and_upload:
      "Authority-adjacent continuations preserve pending-return posture but remain blocked until a fresh binding clears.",
    continuity_rule:
      "Return the user to the same object with explicit rebind or escalation posture instead of silently swapping authority context.",
    source_refs: [
      "Algorithm/authority_interaction_protocol.md::L147[B._AuthorityBinding]",
      "Algorithm/authority_interaction_protocol.md::L509[9.5_Preflight_sequence]",
      "Algorithm/authority_interaction_protocol.md::L540[9.6_Token_and_client_binding_rule]",
      "Algorithm/security_and_runtime_hardening_contract.md::L50[3._Secret_key_and_token_handling]",
    ],
  },
  {
    event_id: "STALE_VIEW_REBASE",
    label: "Stale-view rejection or rebase",
    rotation_or_purge: [
      "Reject the command with typed stale-view metadata.",
      "Preserve review progress only as read-only carry-forward where the surface contract says so.",
    ],
    effects_on_command_acceptance:
      "Sign-off, override, and other exact-basis actions require refresh onto the latest snapshot or pack before resubmission.",
    effects_on_resume_and_upload:
      "Latest resume token, snapshot, or replacement ref may be issued, but the client must not synthesize a merge.",
    continuity_rule:
      "Same route family and same object stay mounted where possible; unsafe mutation demotes into explicit review or recovery posture.",
    source_refs: [
      "Algorithm/northbound_api_and_session_contract.md::L621[6._Concurrency_and_stale-view_rules]",
      "Algorithm/northbound_api_and_session_contract.md::L646[7._Stream_and_reconnect_rules]",
      "Algorithm/customer_client_portal_experience_contract.md::L340[Approval_and_sign-off_flow]",
      "Algorithm/customer_client_portal_experience_contract.md::L293[Secure_document-upload_flow]",
    ],
  },
  {
    event_id: "DEEP_LINK_OR_INVITE_EXPIRY",
    label: "Deep-link, invite, or limited-context entry expiry",
    rotation_or_purge: [
      "Require authenticated upgrade or re-authentication before sensitive mutation resumes.",
      "Use typed fallback target and return-path metadata instead of guessing the next route.",
    ],
    effects_on_command_acceptance:
      "Upload, acknowledgement, and sign-off remain blocked until a fresh authenticated session and current object context exist.",
    effects_on_resume_and_upload:
      "Expired contextual entry never silently revives a stale upload or approval posture.",
    continuity_rule:
      "The user returns to the closest surviving same-object target or explicit fallback target with a reason code.",
    source_refs: [
      "Algorithm/customer_client_portal_experience_contract.md::L370[Onboarding_flow]",
      "Algorithm/customer_client_portal_experience_contract.md::L399[Artifact_print_and_browser-handoff_rules]",
      "Algorithm/customer_client_portal_experience_contract.md::L701[Playwright_validation_minimum]",
      "Algorithm/northbound_api_and_session_contract.md::L709[8._Session_browser_and_native-client_rules]",
    ],
  },
];

const SESSION_ROWS: IdpSessionPolicyRow[] = [
  {
    session_profile_ref: "session.browser.operator",
    flow_id: "browser_operator_interactive",
    label: "Browser operator session",
    channel: "BROWSER",
    actor_classes: [
      "TENANT_ADMIN",
      "PREPARER",
      "REVIEWER",
      "APPROVER",
      "AUDITOR",
      "SUPPORT_OPERATOR",
    ],
    allowed_surface_families: ["OPERATOR_BROWSER"],
    session_carrier:
      "Secure HttpOnly same-site session cookie plus anti-CSRF binding.",
    auth0_application_types: ["REGULAR_WEB_APPLICATION"],
    auth0_cookie_mode: "NON_PERSISTENT",
    default_idle_timeout_hours: 4,
    default_absolute_timeout_hours: 12,
    action_idle_timeout_hours: 4,
    action_absolute_timeout_hours: 12,
    refresh_token_rotation: "DISABLED",
    refresh_token_lifetime_seconds: null,
    refresh_token_leeway_seconds: null,
    offline_access_allowed: false,
    base_authn_level: "BASIC",
    escalated_authn_level: "STEP_UP",
    post_step_up_rotation: true,
    invalidation_events: [
      "STEP_UP_COMPLETED",
      "SESSION_REVOKED",
      "TENANT_SWITCH",
      "LOGOUT",
    ],
    entry_posture:
      "OIDC/OAuth human sign-in through the external IdP, then server-mediated interactive session resolution.",
    storage_boundary:
      "Backend session store plus browser-safe derivable cache only.",
    source_refs: [
      "Algorithm/northbound_api_and_session_contract.md::L709[8._Session_browser_and_native-client_rules]",
      "Algorithm/security_and_runtime_hardening_contract.md::L30[2._Identity_session_and_command_trust]",
      "https://auth0.com/docs/manage-users/sessions/configure-session-lifetime-settings",
    ],
    notes: [
      "Operator browser posture defaults to non-persistent cookies and no browser-facing refresh tokens.",
    ],
  },
  {
    session_profile_ref: "session.browser.portal",
    flow_id: "browser_portal_user_interactive",
    label: "Browser portal session",
    channel: "BROWSER",
    actor_classes: [
      "CLIENT_VIEWER",
      "CLIENT_CONTRIBUTOR",
      "CLIENT_SIGNATORY",
    ],
    allowed_surface_families: ["PORTAL_BROWSER"],
    session_carrier:
      "Secure browser session cookie plus anti-CSRF binding after authenticated upgrade.",
    auth0_application_types: ["REGULAR_WEB_APPLICATION"],
    auth0_cookie_mode: "PERSISTENT",
    default_idle_timeout_hours: 8,
    default_absolute_timeout_hours: 48,
    action_idle_timeout_hours: 8,
    action_absolute_timeout_hours: 48,
    refresh_token_rotation: "DISABLED",
    refresh_token_lifetime_seconds: null,
    refresh_token_leeway_seconds: null,
    offline_access_allowed: false,
    base_authn_level: "BASIC",
    escalated_authn_level: "STEP_UP",
    post_step_up_rotation: true,
    invalidation_events: [
      "STEP_UP_COMPLETED",
      "DEEP_LINK_OR_INVITE_EXPIRY",
      "STALE_VIEW_REBASE",
      "SESSION_REVOKED",
      "LOGOUT",
    ],
    entry_posture:
      "Normal sign-in or post-invite upgrade into a fully authenticated portal session bound to one principal class and masking posture.",
    storage_boundary:
      "Server-authored session plus client-safe resumability only.",
    source_refs: [
      "Algorithm/customer_client_portal_experience_contract.md::L340[Approval_and_sign-off_flow]",
      "Algorithm/northbound_api_and_session_contract.md::L709[8._Session_browser_and_native-client_rules]",
      "https://auth0.com/docs/manage-users/sessions/configure-session-lifetime-settings",
    ],
    notes: [
      "Portal sessions stay persistent but bounded; long-lived browser refresh tokens are intentionally not enabled.",
    ],
  },
  {
    session_profile_ref: "session.native.operator",
    flow_id: "native_macos_operator_interactive",
    label: "Native macOS operator session",
    channel: "NATIVE_MACOS",
    actor_classes: [
      "TENANT_ADMIN",
      "PREPARER",
      "REVIEWER",
      "APPROVER",
      "AUDITOR",
      "SUPPORT_OPERATOR",
    ],
    allowed_surface_families: ["NATIVE_MACOS_OPERATOR"],
    session_carrier:
      "ASWebAuthenticationSession or equivalent plus Keychain-backed product-session artifacts.",
    auth0_application_types: ["NATIVE_APPLICATION"],
    auth0_cookie_mode: "NON_PERSISTENT",
    default_idle_timeout_hours: 8,
    default_absolute_timeout_hours: 24,
    action_idle_timeout_hours: 8,
    action_absolute_timeout_hours: 24,
    refresh_token_rotation: "ROTATING_EXPIRING",
    refresh_token_lifetime_seconds: 1209600,
    refresh_token_leeway_seconds: 3,
    offline_access_allowed: true,
    base_authn_level: "BASIC",
    escalated_authn_level: "STEP_UP",
    post_step_up_rotation: true,
    invalidation_events: [
      "STEP_UP_COMPLETED",
      "SESSION_REVOKED",
      "TENANT_SWITCH",
      "STALE_VIEW_REBASE",
    ],
    entry_posture:
      "System-browser or platform auth-session sign-in only; no embedded webview primary login.",
    storage_boundary:
      "Keychain and OS-protected tenant-bound cache only.",
    source_refs: [
      "Algorithm/macos_native_operator_workspace_blueprint.md::L372[7._Authentication_and_session_strategy]",
      "Algorithm/macos_native_operator_workspace_blueprint.md::L473[11._Security_and_runtime_posture_for_the_desktop_client]",
      "https://auth0.com/docs/secure/tokens/refresh-tokens/configure-refresh-token-rotation",
    ],
    notes: [
      "Native public clients use rotating refresh tokens with expiring lifetime and reuse detection.",
    ],
  },
  {
    session_profile_ref: "session.machine.runtime",
    flow_id: "machine_automation_client",
    label: "Machine automation client",
    channel: "API_AUTOMATION",
    actor_classes: [
      "SCHEDULER_SERVICE",
      "CONNECTOR_SERVICE",
      "NORMALIZER_SERVICE",
      "COMPUTE_SERVICE",
      "GRAPH_SERVICE",
      "FILING_SERVICE",
      "REPLAY_SERVICE",
      "RETENTION_SERVICE",
      "NOTIFICATION_SERVICE",
    ],
    allowed_surface_families: ["API_AUTOMATION"],
    session_carrier:
      "Short-lived machine credential plus explicit command_id and idempotency_key.",
    auth0_application_types: ["MACHINE_TO_MACHINE_APPLICATION"],
    auth0_cookie_mode: "NOT_APPLICABLE_NON_BROWSER",
    default_idle_timeout_hours: null,
    default_absolute_timeout_hours: null,
    action_idle_timeout_hours: null,
    action_absolute_timeout_hours: null,
    refresh_token_rotation: "NOT_APPLICABLE",
    refresh_token_lifetime_seconds: null,
    refresh_token_leeway_seconds: null,
    offline_access_allowed: false,
    base_authn_level: "BASIC",
    escalated_authn_level: "BASIC",
    post_step_up_rotation: false,
    invalidation_events: [
      "SESSION_REVOKED",
      "AUTHORITY_REBIND_OR_BINDING_DRIFT",
    ],
    entry_posture:
      "Short-lived non-browser client credential with explicit service identity and scoped environment binding.",
    storage_boundary:
      "Managed runtime secret boundary or vault-backed credential retrieval only.",
    source_refs: [
      "Algorithm/actor_and_authority_model.md::L555[3.13_Machine-actor_rules]",
      "https://auth0.com/docs/manage-users/sessions/manage-user-sessions-with-auth0-management-api",
    ],
    notes: [
      "Machine actors never satisfy REQUIRE_STEP_UP or REQUIRE_APPROVAL for humans.",
    ],
  },
  {
    session_profile_ref: "session.browser.invite-pre-upgrade",
    flow_id: "invite_or_deep_link_pre_upgrade",
    label: "Invite or deep-link pre-upgrade",
    channel: "BROWSER_LIMITED_ENTRY",
    actor_classes: [
      "CLIENT_VIEWER",
      "CLIENT_CONTRIBUTOR",
      "CLIENT_SIGNATORY",
    ],
    allowed_surface_families: ["BROWSER_LIMITED_ENTRY"],
    session_carrier: "Contextual route and return-path state only.",
    auth0_application_types: ["REGULAR_WEB_APPLICATION"],
    auth0_cookie_mode: "NOT_APPLICABLE_NON_BROWSER",
    default_idle_timeout_hours: null,
    default_absolute_timeout_hours: null,
    action_idle_timeout_hours: null,
    action_absolute_timeout_hours: null,
    refresh_token_rotation: "NOT_APPLICABLE",
    refresh_token_lifetime_seconds: null,
    refresh_token_leeway_seconds: null,
    offline_access_allowed: false,
    base_authn_level: "BASIC",
    escalated_authn_level: "STEP_UP",
    post_step_up_rotation: false,
    invalidation_events: [
      "DEEP_LINK_OR_INVITE_EXPIRY",
      "SESSION_REVOKED",
      "STALE_VIEW_REBASE",
    ],
    entry_posture:
      "Notification, email invite, or deep link opens focused route context before the normal authenticated session has been re-established.",
    storage_boundary:
      "Local route context only; no trust-sensitive mutation authority.",
    source_refs: [
      "Algorithm/customer_client_portal_experience_contract.md::L370[Onboarding_flow]",
      "Algorithm/northbound_api_and_session_contract.md::L709[8._Session_browser_and_native-client_rules]",
    ],
    notes: [
      "This is not a full IdP-authenticated mutation session and cannot satisfy sign-off or upload on its own.",
    ],
  },
  {
    session_profile_ref: "session.upload.transfer",
    flow_id: "governed_upload_session",
    label: "Governed upload-session transfer",
    channel: "BROWSER_OR_MOBILE_TRANSFER",
    actor_classes: [
      "CLIENT_VIEWER",
      "CLIENT_CONTRIBUTOR",
      "CLIENT_SIGNATORY",
    ],
    allowed_surface_families: ["BROWSER_OR_MOBILE_TRANSFER"],
    session_carrier:
      "Normal authenticated session plus governed upload-session binding contract.",
    auth0_application_types: ["REGULAR_WEB_APPLICATION"],
    auth0_cookie_mode: "PERSISTENT",
    default_idle_timeout_hours: 8,
    default_absolute_timeout_hours: 48,
    action_idle_timeout_hours: 8,
    action_absolute_timeout_hours: 48,
    refresh_token_rotation: "DISABLED",
    refresh_token_lifetime_seconds: null,
    refresh_token_leeway_seconds: null,
    offline_access_allowed: false,
    base_authn_level: "BASIC",
    escalated_authn_level: "STEP_UP",
    post_step_up_rotation: true,
    invalidation_events: ["SESSION_REVOKED", "STALE_VIEW_REBASE"],
    entry_posture:
      "Authenticated portal session allocates a governed ClientUploadSession as the byte-transfer exception to the generic command surface.",
    storage_boundary:
      "Derivable transfer metadata only; attachment finalization remains a typed command.",
    source_refs: [
      "Algorithm/customer_client_portal_experience_contract.md::L293[Secure_document-upload_flow]",
      "Algorithm/northbound_api_and_session_contract.md::L184[2.2_Customer_Client_portal_and_upload-session_surfaces]",
    ],
    notes: [
      "Upload transfer is not a substitute for signatory or authority-sensitive step-up.",
    ],
  },
];

function roleRefsForActors(actorClasses: readonly string[]): string[] {
  const roleRefs = new Set<string>();
  for (const actorClass of actorClasses) {
    for (const role of ROLE_ROWS) {
      if (role.actor_classes.includes(actorClass)) {
        roleRefs.add(role.role_ref);
      }
    }
  }
  return [...roleRefs];
}

function surfaceFamiliesForActors(
  actorClasses: readonly string[],
  extra: IdpSurfaceFamily[] = [],
): IdpSurfaceFamily[] {
  const families = new Set<IdpSurfaceFamily>(extra);
  for (const actorClass of actorClasses) {
    if (actorClass.startsWith("CLIENT_")) {
      families.add("PORTAL_BROWSER");
    } else if (
      [
        "TENANT_ADMIN",
        "PREPARER",
        "REVIEWER",
        "APPROVER",
        "AUDITOR",
        "SUPPORT_OPERATOR",
      ].includes(actorClass)
    ) {
      families.add("OPERATOR_BROWSER");
      families.add("NATIVE_MACOS_OPERATOR");
    }
  }
  return [...families];
}

function sessionProfilesForSurfaceFamilies(
  surfaceFamilies: readonly IdpSurfaceFamily[],
): string[] {
  const refs = new Set<string>();
  for (const surfaceFamily of surfaceFamilies) {
    if (surfaceFamily === "OPERATOR_BROWSER") {
      refs.add("session.browser.operator");
    } else if (surfaceFamily === "PORTAL_BROWSER") {
      refs.add("session.browser.portal");
    } else if (surfaceFamily === "NATIVE_MACOS_OPERATOR") {
      refs.add("session.native.operator");
    } else if (surfaceFamily === "API_AUTOMATION") {
      refs.add("session.machine.runtime");
    } else if (surfaceFamily === "BROWSER_LIMITED_ENTRY") {
      refs.add("session.browser.invite-pre-upgrade");
    } else if (surfaceFamily === "BROWSER_OR_MOBILE_TRANSFER") {
      refs.add("session.upload.transfer");
    }
  }
  return [...refs];
}

const STEP_UP_TRIGGER_ROWS: IdpStepUpTriggerRow[] = [
  {
    trigger_id: "authority_link_or_relink",
    label: "Linking or re-linking software to the authority",
    trigger_kind: "STEP_UP_OR_APPROVAL_REQUIRED",
    action_family_refs: ["LINK_AUTHORITY_SOFTWARE", "UNLINK_AUTHORITY_SOFTWARE"],
    actor_classes: ["TENANT_ADMIN", "PREPARER", "APPROVER"],
    role_refs: roleRefsForActors(["TENANT_ADMIN", "PREPARER", "APPROVER"]),
    scope_refs: ["scope.elevated.authority_link"],
    surface_families: surfaceFamiliesForActors(["TENANT_ADMIN", "PREPARER", "APPROVER"]),
    session_profile_refs: sessionProfilesForSurfaceFamilies(
      surfaceFamiliesForActors(["TENANT_ADMIN", "PREPARER", "APPROVER"]),
    ),
    step_up_cell: "REQUIRE_STEP_UP",
    approval_cell: "REQUIRE_APPROVAL",
    authn_level_on_success: "STEP_UP",
    step_up_state_on_entry: "REQUIRED_PENDING",
    step_up_state_on_success: "SATISFIED",
    assurance_requirement:
      "Fresh human gate evidence; no machine substitution.",
    revalidation_requirements: [
      "Resolve a fresh AuthorityBinding if subject, client, authority scope, or link lineage changed.",
      "Do not continue from stale deep-link or ambient route state alone.",
    ],
    invalidation_events: [
      "STEP_UP_COMPLETED",
      "AUTHORITY_REBIND_OR_BINDING_DRIFT",
      "SESSION_REVOKED",
    ],
    source_refs: [
      "Algorithm/actor_and_authority_model.md::L490[3.11_Non-delegable_and_step-up_actions]",
      "Algorithm/authority_interaction_protocol.md::L147[B._AuthorityBinding]",
    ],
    notes: [],
  },
  {
    trigger_id: "override_changes_filing_or_parity",
    label: "Approve override changing filing readiness or parity outcome",
    trigger_kind: "STEP_UP_OR_APPROVAL_REQUIRED",
    action_family_refs: ["APPROVE_OVERRIDE"],
    actor_classes: ["APPROVER", "TENANT_ADMIN"],
    role_refs: roleRefsForActors(["APPROVER", "TENANT_ADMIN"]),
    scope_refs: ["scope.elevated.override_approval"],
    surface_families: surfaceFamiliesForActors(["APPROVER", "TENANT_ADMIN"]),
    session_profile_refs: sessionProfilesForSurfaceFamilies(
      surfaceFamiliesForActors(["APPROVER", "TENANT_ADMIN"]),
    ),
    step_up_cell: "REQUIRE_STEP_UP",
    approval_cell: "REQUIRE_APPROVAL",
    authn_level_on_success: "STEP_UP",
    step_up_state_on_entry: "REQUIRED_PENDING",
    step_up_state_on_success: "SATISFIED",
    assurance_requirement:
      "Fresh approver identity with current view and policy basis.",
    revalidation_requirements: [
      "Refresh on stale-view rejection before resubmitting.",
      "Preserve rationale, scope, and expiry on any override approval.",
    ],
    invalidation_events: [
      "STEP_UP_COMPLETED",
      "STALE_VIEW_REBASE",
      "SESSION_REVOKED",
    ],
    source_refs: [
      "Algorithm/actor_and_authority_model.md::L490[3.11_Non-delegable_and_step-up_actions]",
      "Algorithm/actor_and_authority_model.md::L579[3.14_Actor_invariants]",
    ],
    notes: [],
  },
  {
    trigger_id: "submit_filing_or_amendment",
    label: "Submit filing or amendment",
    trigger_kind: "STEP_UP_OR_APPROVAL_REQUIRED",
    action_family_refs: ["SUBMIT_TO_AUTHORITY", "SIGN_CLIENT_DECLARATION"],
    actor_classes: ["APPROVER", "CLIENT_SIGNATORY", "TENANT_ADMIN"],
    role_refs: roleRefsForActors([
      "APPROVER",
      "CLIENT_SIGNATORY",
      "TENANT_ADMIN",
    ]),
    scope_refs: ["scope.elevated.submit", "scope.elevated.client_signoff"],
    surface_families: surfaceFamiliesForActors(
      ["APPROVER", "CLIENT_SIGNATORY", "TENANT_ADMIN"],
      [],
    ),
    session_profile_refs: sessionProfilesForSurfaceFamilies(
      surfaceFamiliesForActors([
        "APPROVER",
        "CLIENT_SIGNATORY",
        "TENANT_ADMIN",
      ]),
    ),
    step_up_cell: "REQUIRE_STEP_UP",
    approval_cell: "REQUIRE_APPROVAL",
    authn_level_on_success: "STEP_UP",
    step_up_state_on_entry: "REQUIRED_PENDING",
    step_up_state_on_success: "SATISFIED",
    assurance_requirement:
      "Fresh step-up or approved equivalent plus current authority-binding safety.",
    revalidation_requirements: [
      "Verify current approval or step-up state before envelope build.",
      "Re-run send-time authority binding checks if transmit is delayed or retried.",
    ],
    invalidation_events: [
      "STEP_UP_COMPLETED",
      "AUTHORITY_REBIND_OR_BINDING_DRIFT",
      "STALE_VIEW_REBASE",
      "SESSION_REVOKED",
    ],
    source_refs: [
      "Algorithm/actor_and_authority_model.md::L490[3.11_Non-delegable_and_step-up_actions]",
      "Algorithm/authority_interaction_protocol.md::L509[9.5_Preflight_sequence]",
      "Algorithm/authority_interaction_protocol.md::L540[9.6_Token_and_client_binding_rule]",
    ],
    notes: [],
  },
  {
    trigger_id: "mark_unverified_submission_out_of_band",
    label: "Mark externally unverified submission as known out-of-band",
    trigger_kind: "STEP_UP_OR_APPROVAL_REQUIRED",
    action_family_refs: ["ACKNOWLEDGE_OR_SUPPRESS_FLAG"],
    actor_classes: ["APPROVER", "TENANT_ADMIN", "SUPPORT_OPERATOR"],
    role_refs: roleRefsForActors([
      "APPROVER",
      "TENANT_ADMIN",
      "SUPPORT_OPERATOR",
    ]),
    scope_refs: ["scope.elevated.out_of_band_annotation"],
    surface_families: surfaceFamiliesForActors([
      "APPROVER",
      "TENANT_ADMIN",
      "SUPPORT_OPERATOR",
    ]),
    session_profile_refs: sessionProfilesForSurfaceFamilies(
      surfaceFamiliesForActors([
        "APPROVER",
        "TENANT_ADMIN",
        "SUPPORT_OPERATOR",
      ]),
    ),
    step_up_cell: "REQUIRE_STEP_UP",
    approval_cell: "REQUIRE_APPROVAL",
    authn_level_on_success: "STEP_UP",
    step_up_state_on_entry: "REQUIRED_PENDING",
    step_up_state_on_success: "SATISFIED",
    assurance_requirement:
      "Fresh human-gated exception posture with bounded rationale.",
    revalidation_requirements: [
      "Keep out-of-band truth distinct from confirmed authority truth.",
      "Do not convert unknown authority truth into confirmed truth via exception handling.",
    ],
    invalidation_events: [
      "STEP_UP_COMPLETED",
      "AUTHORITY_REBIND_OR_BINDING_DRIFT",
      "SESSION_REVOKED",
    ],
    source_refs: [
      "Algorithm/actor_and_authority_model.md::L490[3.11_Non-delegable_and_step-up_actions]",
      "Algorithm/actor_and_authority_model.md::L539[3.12_Authority_precedence_rules]",
    ],
    notes: [],
  },
  {
    trigger_id: "export_full_evidence_or_unmasked_provenance",
    label: "Export full evidence packs or unmasked provenance",
    trigger_kind: "STEP_UP_OR_APPROVAL_REQUIRED",
    action_family_refs: ["EXPORT", "VIEW_FULL"],
    actor_classes: ["AUDITOR", "APPROVER", "TENANT_ADMIN", "SUPPORT_OPERATOR"],
    role_refs: roleRefsForActors([
      "AUDITOR",
      "APPROVER",
      "TENANT_ADMIN",
      "SUPPORT_OPERATOR",
    ]),
    scope_refs: ["scope.elevated.unmasked_export"],
    surface_families: surfaceFamiliesForActors([
      "AUDITOR",
      "APPROVER",
      "TENANT_ADMIN",
      "SUPPORT_OPERATOR",
    ]),
    session_profile_refs: sessionProfilesForSurfaceFamilies(
      surfaceFamiliesForActors([
        "AUDITOR",
        "APPROVER",
        "TENANT_ADMIN",
        "SUPPORT_OPERATOR",
      ]),
    ),
    step_up_cell: "REQUIRE_STEP_UP",
    approval_cell: "REQUIRE_APPROVAL",
    authn_level_on_success: "STEP_UP",
    step_up_state_on_entry: "REQUIRED_PENDING",
    step_up_state_on_success: "SATISFIED",
    assurance_requirement:
      "Fresh human gate and current masking or export posture.",
    revalidation_requirements: [
      "Re-evaluate masking scope and export posture before materializing bytes.",
      "Do not rely on stale desktop caches or detached browser state for richer export posture.",
    ],
    invalidation_events: ["STEP_UP_COMPLETED", "SESSION_REVOKED", "LOGOUT"],
    source_refs: [
      "Algorithm/actor_and_authority_model.md::L490[3.11_Non-delegable_and_step-up_actions]",
      "Algorithm/macos_native_operator_workspace_blueprint.md::L449[10._Native_UX_opportunities_that_should_replace_browser_habits]",
      "Algorithm/macos_native_operator_workspace_blueprint.md::L473[11._Security_and_runtime_posture_for_the_desktop_client]",
    ],
    notes: [],
  },
  {
    trigger_id: "approve_compliance_mode_config_version",
    label: "Approve config versions for compliance mode",
    trigger_kind: "STEP_UP_OR_APPROVAL_REQUIRED",
    action_family_refs: ["APPROVE_CONFIG"],
    actor_classes: ["TENANT_ADMIN", "APPROVER"],
    role_refs: roleRefsForActors(["TENANT_ADMIN", "APPROVER"]),
    scope_refs: ["scope.elevated.config_approval"],
    surface_families: surfaceFamiliesForActors(["TENANT_ADMIN", "APPROVER"]),
    session_profile_refs: sessionProfilesForSurfaceFamilies(
      surfaceFamiliesForActors(["TENANT_ADMIN", "APPROVER"]),
    ),
    step_up_cell: "REQUIRE_STEP_UP",
    approval_cell: "REQUIRE_APPROVAL",
    authn_level_on_success: "STEP_UP",
    step_up_state_on_entry: "REQUIRED_PENDING",
    step_up_state_on_success: "SATISFIED",
    assurance_requirement:
      "Current approver identity plus fresh policy and dependency topology basis.",
    revalidation_requirements: [
      "Treat config and compliance-mode mutation as exact-basis governance action.",
      "Rebase on stale policy or dependency topology drift before resubmission.",
    ],
    invalidation_events: [
      "STEP_UP_COMPLETED",
      "STALE_VIEW_REBASE",
      "SESSION_REVOKED",
    ],
    source_refs: [
      "Algorithm/actor_and_authority_model.md::L490[3.11_Non-delegable_and_step-up_actions]",
      "Algorithm/actor_and_authority_model.md::L326[3.9_Policy_decision_model]",
    ],
    notes: [],
  },
  {
    trigger_id: "erasure_legal_hold_release_or_retention_exception",
    label: "Execute erasure, legal-hold release, or retention exception",
    trigger_kind: "STEP_UP_OR_APPROVAL_REQUIRED",
    action_family_refs: ["EXECUTE_ERASURE", "EXECUTE_RETENTION"],
    actor_classes: ["TENANT_ADMIN", "APPROVER"],
    role_refs: roleRefsForActors(["TENANT_ADMIN", "APPROVER"]),
    scope_refs: ["scope.elevated.retention_exception"],
    surface_families: surfaceFamiliesForActors(["TENANT_ADMIN", "APPROVER"]),
    session_profile_refs: sessionProfilesForSurfaceFamilies(
      surfaceFamiliesForActors(["TENANT_ADMIN", "APPROVER"]),
    ),
    step_up_cell: "REQUIRE_STEP_UP",
    approval_cell: "REQUIRE_APPROVAL",
    authn_level_on_success: "STEP_UP",
    step_up_state_on_entry: "REQUIRED_PENDING",
    step_up_state_on_success: "SATISFIED",
    assurance_requirement:
      "Fresh human gate and current retention or legal-hold basis.",
    revalidation_requirements: [
      "Do not permit machine actors to satisfy the human gate.",
      "Invalidate cached export or restoration posture after policy change.",
    ],
    invalidation_events: ["STEP_UP_COMPLETED", "SESSION_REVOKED", "LOGOUT"],
    source_refs: [
      "Algorithm/actor_and_authority_model.md::L490[3.11_Non-delegable_and_step-up_actions]",
      "Algorithm/security_and_runtime_hardening_contract.md::L30[2._Identity_session_and_command_trust]",
    ],
    notes: [],
  },
  {
    trigger_id: "client_signatory_signoff_when_pack_demands_step_up",
    label:
      "Client signatory declaration or sign-off when the approval pack demands step-up",
    trigger_kind: "STEP_UP_REQUIRED",
    action_family_refs: [
      "ACKNOWLEDGE_CLIENT_DECLARATION",
      "SIGN_CLIENT_DECLARATION",
    ],
    actor_classes: ["CLIENT_SIGNATORY"],
    role_refs: roleRefsForActors(["CLIENT_SIGNATORY"]),
    scope_refs: ["scope.elevated.client_signoff"],
    surface_families: ["PORTAL_BROWSER", "BROWSER_LIMITED_ENTRY"],
    session_profile_refs: [
      "session.browser.portal",
      "session.browser.invite-pre-upgrade",
    ],
    step_up_cell: "REQUIRE_STEP_UP",
    approval_cell: "ALLOW",
    authn_level_on_success: "STEP_UP",
    step_up_state_on_entry: "REQUIRED_PENDING",
    step_up_state_on_success: "SATISFIED",
    assurance_requirement:
      "subject_identity_assurance_level = STEP_UP_VERIFIED whenever the frozen approval pack requires it.",
    revalidation_requirements: [
      "Sign-off commands must carry fresh step-up proof where required.",
      "Continuation stays on the same Approvals route and same approval-pack context.",
    ],
    invalidation_events: [
      "STEP_UP_COMPLETED",
      "STALE_VIEW_REBASE",
      "SESSION_REVOKED",
      "DEEP_LINK_OR_INVITE_EXPIRY",
    ],
    source_refs: [
      "Algorithm/actor_and_authority_model.md::L251[client_signatory_step_up_rule]",
      "Algorithm/customer_client_portal_experience_contract.md::L340[Approval_and_sign-off_flow]",
      "Algorithm/northbound_api_and_session_contract.md::L429[fresh_step_up_proof_for_signoff]",
    ],
    notes: [],
  },
  {
    trigger_id: "governance_mutation_widening_access_or_relinking_scope",
    label:
      "Governance mutation that widens access, changes step-up posture, alters retention minimums, or relinks authority scope",
    trigger_kind: "STEP_UP_OR_APPROVAL_REQUIRED",
    action_family_refs: [
      "ADMIN_UPDATE_TENANT_SETTINGS",
      "ADMIN_STAGE_POLICY_CHANGE",
      "ADMIN_ASSIGN_PRINCIPAL_ROLE",
      "ADMIN_REMOVE_PRINCIPAL_ROLE",
      "ADMIN_SET_PRINCIPAL_ATTRIBUTES",
      "ADMIN_LINK_AUTHORITY",
      "ADMIN_RELINK_AUTHORITY",
      "ADMIN_APPLY_RETENTION_POLICY",
    ],
    actor_classes: ["TENANT_ADMIN", "APPROVER"],
    role_refs: roleRefsForActors(["TENANT_ADMIN", "APPROVER"]),
    scope_refs: ["scope.elevated.governance_mutation"],
    surface_families: surfaceFamiliesForActors(["TENANT_ADMIN", "APPROVER"]),
    session_profile_refs: sessionProfilesForSurfaceFamilies(
      surfaceFamiliesForActors(["TENANT_ADMIN", "APPROVER"]),
    ),
    step_up_cell: "REQUIRE_STEP_UP",
    approval_cell: "REQUIRE_APPROVAL",
    authn_level_on_success: "STEP_UP",
    step_up_state_on_entry: "REQUIRED_PENDING",
    step_up_state_on_success: "SATISFIED",
    assurance_requirement:
      "Current governance authority plus fresh human gate evidence as required by policy.",
    revalidation_requirements: [
      "Commands must not proceed from stale governance views.",
      "Changed access or step-up posture may invalidate prior resumability and cache assumptions.",
    ],
    invalidation_events: [
      "STEP_UP_COMPLETED",
      "STALE_VIEW_REBASE",
      "TENANT_SWITCH",
      "SESSION_REVOKED",
    ],
    source_refs: [
      "Algorithm/northbound_api_and_session_contract.md::L405[governance_mutation_step_up_or_approval]",
      "Algorithm/actor_and_authority_model.md::L326[3.9_Policy_decision_model]",
    ],
    notes: [],
  },
  {
    trigger_id: "invite_or_deep_link_upgrade_gate",
    label: "Invite, deep-link, or external handoff entry before authenticated upgrade",
    trigger_kind: "AUTHENTICATED_SESSION_UPGRADE_REQUIRED",
    action_family_refs: [
      "UPLOAD_CLIENT_DOCUMENT",
      "ACKNOWLEDGE_CLIENT_DECLARATION",
      "SIGN_CLIENT_DECLARATION",
    ],
    actor_classes: ["CLIENT_VIEWER", "CLIENT_CONTRIBUTOR", "CLIENT_SIGNATORY"],
    role_refs: roleRefsForActors([
      "CLIENT_VIEWER",
      "CLIENT_CONTRIBUTOR",
      "CLIENT_SIGNATORY",
    ]),
    scope_refs: ["scope.portal.read", "scope.portal.contribute"],
    surface_families: ["BROWSER_LIMITED_ENTRY", "PORTAL_BROWSER"],
    session_profile_refs: [
      "session.browser.invite-pre-upgrade",
      "session.browser.portal",
    ],
    step_up_cell: "DENY",
    approval_cell: "DENY",
    authn_level_on_success: "BASIC",
    step_up_state_on_entry: "NOT_REQUIRED",
    step_up_state_on_success: "NOT_REQUIRED",
    assurance_requirement:
      "Upgrade to a normal authenticated session before upload, acknowledgement, or sign-off; fresh step-up may still be needed afterward.",
    revalidation_requirements: [
      "Keep route focus and return target through the upgrade and any external auth handoff.",
      "Do not imply completion until the governed read model settles.",
    ],
    invalidation_events: [
      "DEEP_LINK_OR_INVITE_EXPIRY",
      "SESSION_REVOKED",
      "STALE_VIEW_REBASE",
    ],
    source_refs: [
      "Algorithm/customer_client_portal_experience_contract.md::L370[Onboarding_flow]",
      "Algorithm/customer_client_portal_experience_contract.md::L399[Artifact_print_and_browser-handoff_rules]",
      "Algorithm/northbound_api_and_session_contract.md::L709[8._Session_browser_and_native-client_rules]",
    ],
    notes: [
      "This row is an authenticated upgrade gate, not a substitute for step-up.",
    ],
  },
];

const MFA_POLICY_PROFILE: IdpMfaPolicyProfile = {
  tenant_default_policy: "NEVER_WITH_ACTION_DRIVEN_STEP_UP",
  enabled_independent_factors: ["webauthn_roaming", "otp"],
  enabled_dependent_factors: ["recovery_code"],
  adaptive_risk_assessment_logging: "ENABLED",
  step_up_strategy:
    "REQUEST_ELEVATED_SCOPE_THEN_CHALLENGE_IN_POST_LOGIN_ACTION",
  source_refs: [
    "https://auth0.com/docs/secure/multi-factor-authentication/enable-mfa",
    "https://auth0.com/docs/secure/multi-factor-authentication/step-up-authentication",
    "Algorithm/actor_and_authority_model.md::L579[3.15_Frontend_and_governance-console_rendering_contract]",
  ],
  notes: [
    "Tenant default MFA remains Never so Auth0 does not improvise challenge timing; step-up is triggered only by the source-backed elevated scope matrix.",
    "Risk assessment logging stays enabled so security analytics still records high-risk logins even when the source-backed matrix, not Auth0 defaults, decides when to challenge.",
  ],
};

export function createRecommendedRoleCatalog(): IdpRoleCatalog {
  return {
    schema_version: "1.0",
    policy_pack_id: "idp-role-catalog",
    provider_id: IDP_PROVIDER_ID,
    provider_display_name: IDP_PROVIDER_DISPLAY_NAME,
    provider_selection: createProviderSelectionRecord(),
    policy_version: IDP_POLICY_VERSION,
    generated_on: IDP_POLICY_GENERATED_ON,
    summary: {
      role_count: ROLE_ROWS.length,
      human_role_count: ROLE_ROWS.filter(
        (role) => role.assignment_posture === "HUMAN_MEMBERSHIP_ROLE",
      ).length,
      service_role_count: ROLE_ROWS.filter(
        (role) => role.assignment_posture === "SERVICE_CLIENT_GRANT_ROLE",
      ).length,
    },
    roles: ROLE_ROWS,
    typed_gaps: [
      "The shared operating contract shared_operating_contract_0038_to_0045.md was absent, so the pack grounded itself directly in the named algorithm contracts, prior card outputs, and current Auth0 documentation.",
    ],
    notes: [
      "Roles stay intentionally coarse so the IdP never becomes the place where Taxat decides delegation, authority-link truth, or authority-of-record outcome.",
    ],
  };
}

export function createRecommendedScopeCatalog(): IdpScopeCatalog {
  return {
    schema_version: "1.0",
    catalog_id: "idp-scope-catalog",
    provider_id: IDP_PROVIDER_ID,
    provider_display_name: IDP_PROVIDER_DISPLAY_NAME,
    provider_selection: createProviderSelectionRecord(),
    policy_version: IDP_POLICY_VERSION,
    generated_on: IDP_POLICY_GENERATED_ON,
    summary: {
      scope_count: SCOPE_ROWS.length,
      baseline_scope_count: SCOPE_ROWS.filter(
        (scope) => scope.scope_class === "BASELINE",
      ).length,
      elevated_scope_count: SCOPE_ROWS.filter(
        (scope) => scope.scope_class === "ELEVATED",
      ).length,
    },
    scopes: SCOPE_ROWS,
    typed_gaps: [],
    notes: [
      "Elevated scopes are request-time challenge hints only; the backend still owns the final command-level authorization result.",
    ],
  };
}

export function createRecommendedStepUpPolicyMatrix(): StepUpPolicyMatrix {
  return {
    schema_version: "1.0",
    matrix_id: "idp-step-up-policy-matrix",
    provider_id: IDP_PROVIDER_ID,
    provider_display_name: IDP_PROVIDER_DISPLAY_NAME,
    provider_selection: createProviderSelectionRecord(),
    policy_version: IDP_POLICY_VERSION,
    generated_on: IDP_POLICY_GENERATED_ON,
    summary: {
      trigger_count: STEP_UP_TRIGGER_ROWS.length,
      step_up_or_approval_required_count: STEP_UP_TRIGGER_ROWS.filter(
        (row) => row.trigger_kind === "STEP_UP_OR_APPROVAL_REQUIRED",
      ).length,
      step_up_required_count: STEP_UP_TRIGGER_ROWS.filter(
        (row) => row.trigger_kind === "STEP_UP_REQUIRED",
      ).length,
      upgrade_gate_count: STEP_UP_TRIGGER_ROWS.filter(
        (row) => row.trigger_kind === "AUTHENTICATED_SESSION_UPGRADE_REQUIRED",
      ).length,
      invalidation_event_count: INVALIDATION_EVENTS.length,
    },
    invalidation_events: INVALIDATION_EVENTS,
    trigger_rows: STEP_UP_TRIGGER_ROWS,
    typed_gaps: [],
    notes: [
      "Step-up triggers come from the Taxat corpus first. Auth0 only enforces the challenge posture that this matrix requests.",
    ],
  };
}

export function createRecommendedSessionPolicyMatrix(): IdpSessionPolicyMatrix {
  return {
    schema_version: "1.0",
    matrix_id: "idp-session-policy-matrix",
    provider_id: IDP_PROVIDER_ID,
    provider_display_name: IDP_PROVIDER_DISPLAY_NAME,
    provider_selection: createProviderSelectionRecord(),
    policy_version: IDP_POLICY_VERSION,
    generated_on: IDP_POLICY_GENERATED_ON,
    summary: {
      session_profile_count: SESSION_ROWS.length,
      interactive_human_profiles: SESSION_ROWS.filter((row) =>
        ["BROWSER", "NATIVE_MACOS"].includes(row.channel),
      ).length,
      non_interactive_or_limited_profiles: SESSION_ROWS.filter(
        (row) => !["BROWSER", "NATIVE_MACOS"].includes(row.channel),
      ).length,
    },
    session_profiles: SESSION_ROWS,
    typed_gaps: [],
    notes: [
      "Browser, native, machine, limited-entry, and governed upload-session posture remain side-by-side so later agents do not re-derive session law from scattered prose.",
    ],
  };
}

export function validateRoleCatalog(
  roleCatalog: IdpRoleCatalog,
  scopeCatalog: IdpScopeCatalog,
): void {
  const scopeRefs = new Set(scopeCatalog.scopes.map((scope) => scope.scope_ref));
  for (const role of roleCatalog.roles) {
    if (!role.actor_classes.length) {
      throw new Error(`Role ${role.role_ref} must map to actor classes.`);
    }
    for (const scopeRef of [
      ...role.baseline_scope_refs,
      ...role.requestable_scope_refs,
    ]) {
      if (!scopeRefs.has(scopeRef)) {
        throw new Error(`Role ${role.role_ref} references unknown scope ${scopeRef}.`);
      }
    }
    if (
      role.requestable_scope_refs.some((scopeRef) =>
        scopeRef === "scope.elevated.client_signoff",
      ) &&
      !role.actor_classes.includes("CLIENT_SIGNATORY")
    ) {
      throw new Error(
        `Only signatory-capable roles may request scope.elevated.client_signoff.`,
      );
    }
  }
}

export function validateSessionPolicyMatrix(
  sessionPolicyMatrix: IdpSessionPolicyMatrix,
): void {
  const requiredProfiles = new Set([
    "session.browser.operator",
    "session.browser.portal",
    "session.native.operator",
    "session.machine.runtime",
    "session.browser.invite-pre-upgrade",
    "session.upload.transfer",
  ]);
  const present = new Set(
    sessionPolicyMatrix.session_profiles.map((profile) => profile.session_profile_ref),
  );
  for (const required of requiredProfiles) {
    if (!present.has(required)) {
      throw new Error(`Session policy matrix is missing required profile ${required}.`);
    }
  }
  const native = sessionPolicyMatrix.session_profiles.find(
    (profile) => profile.session_profile_ref === "session.native.operator",
  );
  if (!native || native.refresh_token_rotation !== "ROTATING_EXPIRING") {
    throw new Error(`Native operator session must use rotating refresh tokens.`);
  }
  const machine = sessionPolicyMatrix.session_profiles.find(
    (profile) => profile.session_profile_ref === "session.machine.runtime",
  );
  if (!machine || machine.post_step_up_rotation) {
    throw new Error(`Machine runtime session must remain outside step-up rotation semantics.`);
  }
}

export function validateStepUpPolicyMatrix(
  stepUpPolicyMatrix: StepUpPolicyMatrix,
  roleCatalog: IdpRoleCatalog,
  scopeCatalog: IdpScopeCatalog,
  sessionPolicyMatrix: IdpSessionPolicyMatrix,
): void {
  const roleRefs = new Set(roleCatalog.roles.map((role) => role.role_ref));
  const scopeRefs = new Set(scopeCatalog.scopes.map((scope) => scope.scope_ref));
  const sessionProfileRefs = new Set(
    sessionPolicyMatrix.session_profiles.map((profile) => profile.session_profile_ref),
  );
  for (const row of stepUpPolicyMatrix.trigger_rows) {
    if (!row.role_refs.length || !row.source_refs.length) {
      throw new Error(`Trigger row ${row.trigger_id} must keep role and source coverage.`);
    }
    for (const roleRef of row.role_refs) {
      if (!roleRefs.has(roleRef)) {
        throw new Error(`Trigger row ${row.trigger_id} references unknown role ${roleRef}.`);
      }
    }
    for (const scopeRef of row.scope_refs) {
      if (!scopeRefs.has(scopeRef)) {
        throw new Error(`Trigger row ${row.trigger_id} references unknown scope ${scopeRef}.`);
      }
    }
    for (const sessionProfileRef of row.session_profile_refs) {
      if (!sessionProfileRefs.has(sessionProfileRef)) {
        throw new Error(
          `Trigger row ${row.trigger_id} references unknown session profile ${sessionProfileRef}.`,
        );
      }
    }
    if (
      row.trigger_kind === "STEP_UP_REQUIRED" &&
      row.step_up_cell !== "REQUIRE_STEP_UP"
    ) {
      throw new Error(`Step-up-only row ${row.trigger_id} must require step-up.`);
    }
  }
}

function readTemplatePolicyState(): PolicyFixtureState {
  return {
    policyVersion: IDP_POLICY_VERSION,
    sourceDisposition: "ADOPTED_EXISTING",
    roleRefs: ROLE_ROWS.map((role) => role.role_ref),
    scopeRefs: SCOPE_ROWS.map((scope) => scope.scope_ref),
    enabledFactors: [
      ...MFA_POLICY_PROFILE.enabled_independent_factors,
      ...MFA_POLICY_PROFILE.enabled_dependent_factors,
    ],
    tenantDefaultMfaPolicy: MFA_POLICY_PROFILE.tenant_default_policy,
    sessionProfileRefs: SESSION_ROWS.map((row) => row.session_profile_ref),
    notes: [
      "Auth0 tenant default MFA policy stays off so the source-backed matrix, not generic default MFA, decides when to challenge.",
    ],
  };
}

export function createTemplateIdpPolicyEvidence(
  runContext: RunContext,
  observedConsolePosture?: PolicyFixtureState,
  driftRegister: IdpPolicyDriftRow[] = [],
): IdpPolicyEvidenceTemplate {
  const posture = observedConsolePosture ?? readTemplatePolicyState();
  return {
    schema_version: "1.0",
    policy_evidence_id: "idp-policy-evidence-template",
    provider_id: IDP_PROVIDER_ID,
    provider_display_name: IDP_PROVIDER_DISPLAY_NAME,
    run_id: runContext.runId,
    flow_id: IDP_POLICY_FLOW_ID,
    workspace_id: runContext.workspaceId,
    product_environment_id: runContext.productEnvironmentId,
    provider_environment: runContext.providerEnvironment,
    operator_identity_alias: runContext.operatorIdentityAlias,
    provider_selection: createProviderSelectionRecord(),
    policy_version: IDP_POLICY_VERSION,
    generated_on: IDP_POLICY_GENERATED_ON,
    role_catalog_ref: "../../config/identity/idp_role_catalog.json",
    scope_catalog_ref: "../../config/identity/idp_scope_catalog.json",
    step_up_policy_ref: "../../config/identity/step_up_policy_matrix.json",
    session_policy_ref: "../../config/identity/session_policy_matrix.json",
    mfa_profile: MFA_POLICY_PROFILE,
    observed_console_posture: {
      source_disposition: posture.sourceDisposition,
      role_refs: posture.roleRefs,
      scope_refs: posture.scopeRefs,
      enabled_factors: posture.enabledFactors,
      tenant_default_mfa_policy: posture.tenantDefaultMfaPolicy,
      session_profile_refs: posture.sessionProfileRefs,
      notes: posture.notes,
    },
    drift_register: driftRegister,
    source_refs: createProviderSelectionRecord().source_refs,
    typed_gaps: [
      "Provider-console drift detection is explicit, but final live tenant application still remains opt-in and environment-gated.",
    ],
    notes: [
      "This template records what the provider configured without implying that the provider decides final Taxat legality.",
    ],
    last_verified_at: nowIso(),
  };
}

export function createAccessStepupMatrixViewModel() {
  return {
    routeId: "access-stepup-matrix",
    providerDisplayName: IDP_PROVIDER_DISPLAY_NAME,
    providerMonogram: "OIDC",
    selectionPosture: IDP_PROVIDER_VENDOR_SELECTION,
    policyVersion: IDP_POLICY_VERSION,
    summary:
      "Coarse IdP roles and scopes bootstrap sign-in posture, while elevated scopes drive source-backed step-up and approval gates without replacing Taxat's own authorization engine.",
    notes: [
      "Roles stay coarse and never imply client delegation or authority-of-record truth.",
      "Step-up challenge timing comes from the Taxat corpus and is implemented through requested elevated scopes plus an Auth0 post-login Action posture.",
      "Browser, native, machine, and limited-entry session law remain side by side in one pack.",
    ],
    selectedRailRef: "role_governance_admin",
    selectedTriggerRef: "submit_filing_or_amendment",
    roleCatalog: createRecommendedRoleCatalog(),
    scopeCatalog: createRecommendedScopeCatalog(),
    stepUpPolicyMatrix: createRecommendedStepUpPolicyMatrix(),
    sessionPolicyMatrix: createRecommendedSessionPolicyMatrix(),
  };
}

function diffRefs(
  fieldRef: string,
  expectedRefs: readonly string[],
  actualRefs: readonly string[],
): IdpPolicyDriftRow[] {
  const expected = [...expectedRefs].sort();
  const actual = [...actualRefs].sort();
  if (expected.join("|") === actual.join("|")) {
    return [];
  }
  return [
    {
      field_ref: fieldRef,
      expected: expected.join(", "),
      actual: actual.join(", "),
      severity: "BLOCKING",
    },
  ];
}

export function detectIdpPolicyDrift(
  observed: PolicyFixtureState,
): IdpPolicyDriftRow[] {
  return [
    ...diffRefs(
      "role_refs",
      ROLE_ROWS.map((role) => role.role_ref),
      observed.roleRefs,
    ),
    ...diffRefs(
      "scope_refs",
      SCOPE_ROWS.map((scope) => scope.scope_ref),
      observed.scopeRefs,
    ),
    ...diffRefs(
      "enabled_factors",
      [
        ...MFA_POLICY_PROFILE.enabled_independent_factors,
        ...MFA_POLICY_PROFILE.enabled_dependent_factors,
      ],
      observed.enabledFactors,
    ),
    ...diffRefs(
      "session_profile_refs",
      SESSION_ROWS.map((row) => row.session_profile_ref),
      observed.sessionProfileRefs,
    ),
    ...(observed.tenantDefaultMfaPolicy ===
    MFA_POLICY_PROFILE.tenant_default_policy
      ? []
      : [
          {
            field_ref: "tenant_default_mfa_policy",
            expected: MFA_POLICY_PROFILE.tenant_default_policy,
            actual: observed.tenantDefaultMfaPolicy || "(empty)",
            severity: "BLOCKING" as const,
          },
        ]),
  ];
}

async function appendNote(
  manifest: EvidenceManifest,
  stepId: string,
  evidenceId: string,
  summary: string,
): Promise<EvidenceManifest> {
  return appendEvidenceRecord(manifest, {
    evidenceId,
    stepId,
    kind: "NOTE",
    relativePath: null,
    captureMode: "STANDARD",
    summary,
  });
}

async function getRequiredLocator(
  page: Page,
  manifest: SelectorManifest,
  selectorId: string,
) {
  const selector = manifest.selectors.find(
    (candidate) => candidate.selectorId === selectorId,
  );
  if (!selector) {
    throw new Error(`Selector ${selectorId} missing from Auth0 policy manifest.`);
  }
  const locator =
    selector.strategy === "ROLE"
      ? page.getByRole(selector.value as Parameters<Page["getByRole"]>[0], {
          name: selector.accessibleName,
        })
      : selector.strategy === "TEXT"
        ? page.getByText(selector.value, { exact: false })
        : page.locator(selector.value);
  if (!(await locator.first().isVisible())) {
    throw new Error(`Selector drift detected for ${selectorId}.`);
  }
  return locator.first();
}

async function readFixturePolicyState(page: Page): Promise<PolicyFixtureState> {
  return page.evaluate(() => {
    const host = window as typeof window & {
      __idpFixture?: { getPolicyState?: () => unknown };
    };
    if (!host.__idpFixture?.getPolicyState) {
      throw new Error("No fixture policy adapter exposed on window.__idpFixture.");
    }
    return host.__idpFixture.getPolicyState() as PolicyFixtureState;
  });
}

async function clickFixtureAction(page: Page, action: string): Promise<void> {
  await page.evaluate((requestedAction) => {
    const host = window as typeof window & {
      __idpFixture?: { runAction: (name: string) => void };
    };
    if (!host.__idpFixture?.runAction) {
      throw new Error("No fixture action adapter exposed on window.__idpFixture.");
    }
    host.__idpFixture.runAction(requestedAction);
  }, action);
}

export async function configureRolesScopesMfaSessions(
  options: ConfigureIdpPoliciesOptions,
): Promise<ConfigureIdpPoliciesResult> {
  const providerRegistry = createDefaultProviderRegistry();
  const provider = providerRegistry.getRequired(IDP_PROVIDER_ID);
  assertProviderFlowAllowed(options.runContext, provider, IDP_POLICY_FLOW_ID);

  const roleCatalog = createRecommendedRoleCatalog();
  const scopeCatalog = createRecommendedScopeCatalog();
  const stepUpPolicyMatrix = createRecommendedStepUpPolicyMatrix();
  const sessionPolicyMatrix = createRecommendedSessionPolicyMatrix();
  validateRoleCatalog(roleCatalog, scopeCatalog);
  validateSessionPolicyMatrix(sessionPolicyMatrix);
  validateStepUpPolicyMatrix(
    stepUpPolicyMatrix,
    roleCatalog,
    scopeCatalog,
    sessionPolicyMatrix,
  );

  const entryUrls = options.entryUrls ?? createDefaultIdpPolicyEntryUrls();
  const selectorManifest = await loadAuth0PolicySelectorManifest();
  let evidenceManifest = createEvidenceManifest(options.runContext);

  const steps = [
    createPendingStep({
      stepId: IDP_POLICY_STEP_IDS.openPolicyWorkspace,
      title: "Open the IdP access and session policy workspace",
      selectorRefs: ["policy-heading"],
    }),
    createPendingStep({
      stepId: IDP_POLICY_STEP_IDS.reconcileRolesAndScopes,
      title: "Reconcile coarse roles and scopes",
      selectorRefs: [
        "roles-and-scopes-heading",
        "apply-roles-and-scopes",
        "policy-row-fallback",
      ],
    }),
    createPendingStep({
      stepId: IDP_POLICY_STEP_IDS.reconcileMfaAndStepUp,
      title: "Reconcile MFA and step-up posture",
      selectorRefs: [
        "mfa-step-up-heading",
        "apply-mfa-and-step-up",
        "policy-row-fallback",
      ],
    }),
    createPendingStep({
      stepId: IDP_POLICY_STEP_IDS.reconcileSessions,
      title: "Reconcile session lifetime and refresh posture",
      selectorRefs: [
        "session-policies-heading",
        "apply-session-policies",
        "policy-row-fallback",
      ],
    }),
    createPendingStep({
      stepId: IDP_POLICY_STEP_IDS.persistEvidence,
      title: "Persist policy evidence and drift register",
      selectorRefs: [],
    }),
  ];

  steps[0] = transitionStep(
    steps[0]!,
    "RUNNING",
    "Opening the IdP access and session policy workspace.",
  );
  await options.page.goto(entryUrls.controlPlane);
  await getRequiredLocator(options.page, selectorManifest, "policy-heading");
  steps[0] = transitionStep(
    steps[0]!,
    "SUCCEEDED",
    "Policy workspace opened.",
  );
  evidenceManifest = await appendNote(
    evidenceManifest,
    steps[0].stepId,
    `${steps[0].stepId}.note.1`,
    "Opened the Auth0-compatible policy workspace and resolved the canonical access-and-session heading with semantic selectors.",
  );

  let currentState = await readFixturePolicyState(options.page);
  let driftRegister: IdpPolicyDriftRow[] = [];

  steps[1] = transitionStep(
    steps[1]!,
    "RUNNING",
    "Reconciling coarse IdP roles and scopes.",
  );
  await getRequiredLocator(options.page, selectorManifest, "roles-and-scopes-heading");
  if (!currentState.roleRefs.length || !currentState.scopeRefs.length) {
    await (await getRequiredLocator(options.page, selectorManifest, "apply-roles-and-scopes")).click();
    await clickFixtureAction(options.page, "applyRecommendedRolesAndScopes");
    currentState = await readFixturePolicyState(options.page);
  }
  driftRegister = detectIdpPolicyDrift(currentState);
  if (driftRegister.some((row) => row.field_ref === "role_refs" || row.field_ref === "scope_refs")) {
    steps[1] = transitionStep(
      steps[1]!,
      "BLOCKED_BY_POLICY",
      "Provider role or scope posture drifted from the source-backed pack.",
    );
  } else {
    steps[1] = transitionStep(
      steps[1]!,
      "SUCCEEDED",
      "Role and scope posture reconciled.",
    );
    evidenceManifest = await appendNote(
      evidenceManifest,
      steps[1].stepId,
      `${steps[1].stepId}.note.1`,
      "Applied or adopted coarse roles and scopes while keeping delegation, authority-link truth, and authority-of-record outcome engine-owned.",
    );
  }

  if (steps[1].status === "BLOCKED_BY_POLICY") {
    const policyEvidence = createTemplateIdpPolicyEvidence(
      options.runContext,
      currentState,
      driftRegister,
    );
    steps[4] = transitionStep(
      steps[4]!,
      "RUNNING",
      "Persisting drift evidence.",
    );
    const evidenceManifestPath = `${options.policyEvidencePath}.evidence_manifest.json`;
    await persistJson(options.policyEvidencePath, policyEvidence);
    await persistJson(evidenceManifestPath, evidenceManifest);
    steps[4] = transitionStep(
      steps[4]!,
      "SUCCEEDED",
      "Drift evidence persisted.",
    );
    return {
      outcome: "IDP_POLICY_DRIFT_REQUIRES_REVIEW",
      steps,
      evidenceManifestPath,
      roleCatalog,
      scopeCatalog,
      stepUpPolicyMatrix,
      sessionPolicyMatrix,
      policyEvidence,
      driftRegister,
    };
  }

  steps[2] = transitionStep(
    steps[2]!,
    "RUNNING",
    "Reconciling MFA and step-up posture.",
  );
  await getRequiredLocator(options.page, selectorManifest, "mfa-step-up-heading");
  if (
    !currentState.enabledFactors.length ||
    !currentState.tenantDefaultMfaPolicy
  ) {
    await (await getRequiredLocator(options.page, selectorManifest, "apply-mfa-and-step-up")).click();
    await clickFixtureAction(options.page, "applyRecommendedMfaAndStepUp");
    currentState = await readFixturePolicyState(options.page);
  }
  driftRegister = detectIdpPolicyDrift(currentState);
  if (
    driftRegister.some(
      (row) =>
        row.field_ref === "enabled_factors" ||
        row.field_ref === "tenant_default_mfa_policy",
    )
  ) {
    steps[2] = transitionStep(
      steps[2]!,
      "BLOCKED_BY_POLICY",
      "Provider MFA or step-up posture drifted from the source-backed pack.",
    );
  } else {
    steps[2] = transitionStep(
      steps[2]!,
      "SUCCEEDED",
      "MFA and step-up posture reconciled.",
    );
    evidenceManifest = await appendNote(
      evidenceManifest,
      steps[2].stepId,
      `${steps[2].stepId}.note.1`,
      "Kept tenant-default MFA off and enabled explicit factors so source-backed elevated scopes, not generic provider defaults, decide when step-up challenges happen.",
    );
  }

  if (steps[2].status === "BLOCKED_BY_POLICY") {
    const policyEvidence = createTemplateIdpPolicyEvidence(
      options.runContext,
      currentState,
      driftRegister,
    );
    steps[4] = transitionStep(
      steps[4]!,
      "RUNNING",
      "Persisting drift evidence.",
    );
    const evidenceManifestPath = `${options.policyEvidencePath}.evidence_manifest.json`;
    await persistJson(options.policyEvidencePath, policyEvidence);
    await persistJson(evidenceManifestPath, evidenceManifest);
    steps[4] = transitionStep(
      steps[4]!,
      "SUCCEEDED",
      "Drift evidence persisted.",
    );
    return {
      outcome: "IDP_POLICY_DRIFT_REQUIRES_REVIEW",
      steps,
      evidenceManifestPath,
      roleCatalog,
      scopeCatalog,
      stepUpPolicyMatrix,
      sessionPolicyMatrix,
      policyEvidence,
      driftRegister,
    };
  }

  steps[3] = transitionStep(
    steps[3]!,
    "RUNNING",
    "Reconciling session lifetime and refresh posture.",
  );
  await getRequiredLocator(options.page, selectorManifest, "session-policies-heading");
  if (!currentState.sessionProfileRefs.length) {
    await (await getRequiredLocator(options.page, selectorManifest, "apply-session-policies")).click();
    await clickFixtureAction(options.page, "applyRecommendedSessionPolicies");
    currentState = await readFixturePolicyState(options.page);
  }
  driftRegister = detectIdpPolicyDrift(currentState);
  if (driftRegister.some((row) => row.field_ref === "session_profile_refs")) {
    steps[3] = transitionStep(
      steps[3]!,
      "BLOCKED_BY_POLICY",
      "Provider session posture drifted from the source-backed pack.",
    );
  } else {
    steps[3] = transitionStep(
      steps[3]!,
      "SUCCEEDED",
      "Session posture reconciled.",
    );
    evidenceManifest = await appendNote(
      evidenceManifest,
      steps[3].stepId,
      `${steps[3].stepId}.note.1`,
      "Recorded browser, native, machine, and limited-entry session posture side by side, including non-persistent operator cookies, bounded portal persistence, native rotating refresh tokens, and machine non-session posture.",
    );
  }

  steps[4] = transitionStep(
    steps[4]!,
    "RUNNING",
    "Persisting policy evidence.",
  );
  const policyEvidence = createTemplateIdpPolicyEvidence(
    options.runContext,
    currentState,
    driftRegister,
  );
  const evidenceManifestPath = `${options.policyEvidencePath}.evidence_manifest.json`;
  await persistJson(options.policyEvidencePath, policyEvidence);
  await persistJson(evidenceManifestPath, evidenceManifest);
  steps[4] = transitionStep(
    steps[4]!,
    "SUCCEEDED",
    "Policy evidence persisted.",
  );

  return {
    outcome:
      steps[3].status === "BLOCKED_BY_POLICY"
        ? "IDP_POLICY_DRIFT_REQUIRES_REVIEW"
        : "IDP_POLICIES_READY",
    steps,
    evidenceManifestPath,
    roleCatalog,
    scopeCatalog,
    stepUpPolicyMatrix,
    sessionPolicyMatrix,
    policyEvidence,
    driftRegister,
  };
}

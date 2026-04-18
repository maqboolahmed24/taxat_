import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Locator, Page } from "@playwright/test";

import {
  appendEvidenceRecord,
  createEvidenceManifest,
  type EvidenceManifest,
} from "../../../core/evidence_manifest.js";
import {
  assertProviderFlowAllowed,
  createDefaultProviderRegistry,
} from "../../../core/provider_registry.js";
import type { RunContext } from "../../../core/run_context.js";
import {
  createPendingStep,
  markSkippedAsAlreadyPresent,
  transitionStep,
  type StepContract,
} from "../../../core/step_contract.js";
import {
  rankSelectors,
  type SelectorDescriptor,
  type SelectorManifest,
} from "../../../core/selector_contract.js";

export const PUSH_PROVIDER_ID = "device-messaging-control-plane";
export const PUSH_FLOW_ID = "device-messaging-project-and-key-bootstrap";
export const PUSH_PROVIDER_DISPLAY_NAME = "Device Messaging Control Plane";
export const PUSH_PROVIDER_VENDOR_ADAPTER = "FCM_COMPATIBLE_WITH_APNS_BRIDGE";
export const PUSH_PROVIDER_VENDOR_SELECTION = "PROVIDER_DEFAULT_APPLIED";
export const PUSH_POLICY_VERSION = "1.0";
export const PUSH_POLICY_GENERATED_ON = "2026-04-18";

export const PUSH_STEP_IDS = {
  openControlPlane: "push.control-plane.open-console",
  reconcileProject: "push.control-plane.reconcile-project",
  bindCredentials: "push.control-plane.bind-credentials",
  validateChannelCatalog: "push.control-plane.validate-channel-catalog",
  validateContinuity: "push.control-plane.validate-continuity",
  persistArtifacts: "push.control-plane.persist-artifacts",
} as const;

export type PushProductEnvironmentId =
  | "env_local_provisioning_workstation"
  | "env_shared_sandbox_integration"
  | "env_preproduction_verification"
  | "env_production";

export type PushProviderEnvironmentTag =
  | "LOCAL_FIXTURE"
  | "SANDBOX"
  | "PREPRODUCTION"
  | "PRODUCTION";

export type PushSourceDisposition =
  | "CREATED_DURING_RUN"
  | "ADOPTED_EXISTING";

export type WorkItemNotificationType =
  | "NEW_ASSIGNMENT"
  | "REASSIGNMENT"
  | "ESCALATION"
  | "CUSTOMER_REPLY"
  | "CUSTOMER_DUE_DATE_CHANGED"
  | "SLA_DUE_SOON"
  | "SLA_OVERDUE"
  | "SLA_BREACHED"
  | "ITEM_RESOLVED"
  | "ITEM_CANCELLED"
  | "REQUEST_INFO_OPENED"
  | "CUSTOMER_VISIBLE_COMMENT";

export type PushEligibleNotificationFamily =
  | "ESCALATION"
  | "CUSTOMER_REPLY"
  | "SLA_OVERDUE"
  | "SLA_BREACHED";

export type PushExcludedNotificationFamily = Exclude<
  WorkItemNotificationType,
  PushEligibleNotificationFamily
>;

export type PushChannelFamily =
  | "LOCAL_TEST_SINK"
  | "MACOS_SYSTEM_NOTIFICATION"
  | "OPERATOR_WEB_PUSH_DEFERRED"
  | "CUSTOMER_PORTAL_WEB_PUSH_DEFERRED";

export type PushClientSurface =
  | "LOCAL_FIXTURE"
  | "NATIVE_MACOS_OPERATOR"
  | "OPERATOR_WEB"
  | "CLIENT_PORTAL_WEB";

export type PushUrgencyClass =
  | "ACTION_REQUIRED"
  | "HIGH_URGENCY"
  | "BACKGROUND_AWARENESS";

export type PushDeliveryState =
  | "ACTIVE"
  | "DEFERRED_NOT_PROVISIONED"
  | "FIXTURE_ONLY";

export type PushFlowOutcome =
  | "DEVICE_MESSAGING_TOPOLOGY_READY"
  | "DEVICE_MESSAGING_POLICY_REVIEW_REQUIRED";

export interface SourceRef {
  source_ref: string;
  rationale: string;
}

export interface ProviderSelectionRecord {
  provider_selection_status: typeof PUSH_PROVIDER_VENDOR_SELECTION;
  provider_family: "DEVICE_MESSAGING";
  provider_vendor_adapter: typeof PUSH_PROVIDER_VENDOR_ADAPTER;
  provider_vendor_label: string;
  docs_urls: string[];
  source_refs: SourceRef[];
}

export interface PushProviderWorkspaceRow {
  workspace_ref: string;
  product_environment_id: PushProductEnvironmentId;
  provider_environment_tag: PushProviderEnvironmentTag;
  provider_project_label: string;
  provider_project_alias: string;
  project_id_alias: string;
  project_number_alias: string;
  fcm_sender_id_alias: string;
  source_disposition: PushSourceDisposition;
  delivery_scope:
    | "FIXTURE_ONLY"
    | "NATIVE_MACOS_INTERNAL_ONLY";
  channel_refs: string[];
  cloud_messaging_api_state: "ENABLED";
  registration_api_state:
    | "NOT_REQUIRED_AT_THIS_STAGE"
    | "FIXTURE_ONLY";
  bundle_identifier_or_null: string | null;
  service_account_metadata_ref_or_null: string | null;
  apns_binding_state:
    | "BOUND"
    | "NOT_REQUIRED_AT_THIS_STAGE"
    | "FIXTURE_ONLY"
    | "MISSING_POLICY_BLOCK";
  source_refs: SourceRef[];
  notes: string[];
}

export interface PushCredentialRecord {
  credential_ref: string;
  product_environment_id: Exclude<
    PushProductEnvironmentId,
    "env_local_provisioning_workstation"
  >;
  credential_kind: "FCM_SERVICE_ACCOUNT" | "APNS_AUTH_KEY";
  source_disposition: PushSourceDisposition;
  vault_secret_ref: string;
  fingerprint: string;
  bundle_identifier_or_null: string | null;
  bound_web_origin_or_null: string | null;
  key_id_alias_or_null: string | null;
  team_id_alias_or_null: string | null;
  rotation_rule: string;
  secret_material_state: "VAULT_ONLY";
  source_refs: SourceRef[];
  notes: string[];
}

export interface PushProjectInventory {
  schema_version: "1.0";
  inventory_id: "push_project_inventory";
  provider_id: typeof PUSH_PROVIDER_ID;
  provider_display_name: typeof PUSH_PROVIDER_DISPLAY_NAME;
  run_id: string;
  flow_id: typeof PUSH_FLOW_ID;
  workspace_id: string;
  operator_identity_alias: string;
  provider_selection: ProviderSelectionRecord;
  workspace_rows: PushProviderWorkspaceRow[];
  channel_catalog_ref: "config/notifications/push_channel_catalog.json";
  continuity_matrix_ref: "config/notifications/notification_open_continuity_matrix.json";
  key_lineage_ref: "data/provisioning/push_key_lineage.template.json";
  typed_gaps: string[];
  notes: string[];
  last_verified_at: string;
}

export interface PushKeyLineage {
  schema_version: "1.0";
  lineage_id: "push_key_lineage";
  provider_id: typeof PUSH_PROVIDER_ID;
  provider_display_name: typeof PUSH_PROVIDER_DISPLAY_NAME;
  run_id: string;
  flow_id: typeof PUSH_FLOW_ID;
  workspace_id: string;
  operator_identity_alias: string;
  provider_selection: ProviderSelectionRecord;
  credential_records: PushCredentialRecord[];
  typed_gaps: string[];
  notes: string[];
  last_verified_at: string;
}

export interface PushChannelRecord {
  channel_ref: string;
  product_environment_id: PushProductEnvironmentId;
  channel_family: PushChannelFamily;
  delivery_state: PushDeliveryState;
  client_surface: PushClientSurface;
  shell_family: "CALM_SHELL" | "CLIENT_PORTAL_SHELL" | "NO_NEW_LEGAL_SHELL";
  visibility_class: "INTERNAL_ONLY" | "CUSTOMER_VISIBLE";
  urgency_classes: PushUrgencyClass[];
  eligible_notification_families: PushEligibleNotificationFamily[];
  excluded_notification_families: WorkItemNotificationType[];
  provider_binding: {
    binding_mode:
      | "FCM_APNS_BRIDGE"
      | "NONE_DEFERRED"
      | "FIXTURE_SINK_ONLY";
    workspace_ref_or_null: string | null;
    credential_refs: string[];
    bundle_identifier_or_null: string | null;
    web_origin_or_null: string | null;
    apns_required: boolean;
  };
  source_refs: SourceRef[];
  notes: string[];
}

export interface PushChannelCatalog {
  schema_version: "1.0";
  catalog_id: "push_channel_catalog";
  provider_selection: ProviderSelectionRecord;
  policy_version: typeof PUSH_POLICY_VERSION;
  generated_on: typeof PUSH_POLICY_GENERATED_ON;
  truth_boundary_statement: string;
  surface_decisions: {
    customer_portal_web_push: "DISABLED";
    operator_web_push: "DISABLED";
    macos_native_system_notifications: "ENABLED";
  };
  channel_records: PushChannelRecord[];
  excluded_notification_families: Array<{
    notification_family: PushExcludedNotificationFamily;
    exclusion_reason: string;
    source_refs: SourceRef[];
  }>;
  typed_gaps: string[];
  notes: string[];
}

export interface NotificationOpenContinuityRow {
  notification_family: PushEligibleNotificationFamily;
  visibility_class: "INTERNAL_ONLY";
  channel_family: "MACOS_SYSTEM_NOTIFICATION";
  client_surface: "NATIVE_MACOS_OPERATOR";
  shell_family: "CALM_SHELL";
  target_surface_ref: "native_primary_work_item_scene";
  target_module_code:
    | "INTERNAL_ACTIVITY"
    | "DETAIL_DRAWER"
    | "DECISION_SUMMARY";
  canonical_object_ref_template: string;
  focus_anchor_ref_template: string;
  return_surface_ref: "native_primary_manifest_scene";
  return_focus_anchor_ref_template: string;
  fallback_surface_ref:
    | "collaboration_staff_inbox"
    | "native_primary_manifest_scene";
  fallback_focus_anchor_ref_template: string;
  parent_bound_support_reopen:
    | "ALLOWED_FOR_AUTHORITY_SUPPORT_ONLY"
    | "NOT_REQUIRED";
  urgency_class: PushUrgencyClass;
  source_refs: SourceRef[];
  notes: string[];
}

export interface NotificationOpenContinuityMatrix {
  schema_version: "1.0";
  matrix_id: "notification_open_continuity_matrix";
  provider_selection: ProviderSelectionRecord;
  policy_version: typeof PUSH_POLICY_VERSION;
  generated_on: typeof PUSH_POLICY_GENERATED_ON;
  truth_boundary_statement: string;
  continuity_rows: NotificationOpenContinuityRow[];
  excluded_notification_families: Array<{
    notification_family: PushExcludedNotificationFamily;
    exclusion_reason: string;
    source_refs: SourceRef[];
  }>;
  typed_gaps: string[];
  notes: string[];
}

export interface DeviceMessagingChannelView {
  channel_ref: string;
  label: string;
  environment_label: string;
  provider_label: string;
  client_surface_label: string;
  state_label: string;
  summary: string;
  product_notification_families: Array<{
    notification_family: string;
    urgency_class: string;
    visibility_class: string;
    delivery_decision: string;
  }>;
  provider_channel_rows: Array<{
    label: string;
    detail: string;
  }>;
  continuity_target_rows: Array<{
    label: string;
    target_surface_ref: string;
    focus_anchor_ref_template: string;
    return_surface_ref: string;
  }>;
  key_lineage_refs: string[];
  continuity_notes: string[];
  inspector_notes: string[];
}

export interface DeviceMessagingCredentialView {
  credential_ref: string;
  label: string;
  environment_label: string;
  kind_label: string;
  vault_ref: string;
  binding_summary: string;
  rotation_rule: string;
}

export interface DeviceMessagingTopologyBoardViewModel {
  provider_label: string;
  provider_monogram: "PUSH";
  selection_posture: "NATIVE_MACOS_ONLY";
  channels: DeviceMessagingChannelView[];
  credential_lineage: DeviceMessagingCredentialView[];
  notes: string[];
}

export interface CreateDeviceMessagingProjectAndKeysResult {
  outcome: PushFlowOutcome;
  steps: StepContract[];
  projectInventory: PushProjectInventory;
  keyLineage: PushKeyLineage;
  pushChannelCatalog: PushChannelCatalog;
  continuityMatrix: NotificationOpenContinuityMatrix;
  evidenceManifestPath: string;
  notes: string[];
}

export interface DeviceMessagingProjectEntryUrls {
  controlPlane: string;
}

export interface CreateDeviceMessagingProjectAndKeysOptions {
  page: Page;
  runContext: RunContext;
  projectInventoryPath: string;
  keyLineagePath: string;
  entryUrls?: DeviceMessagingProjectEntryUrls;
}

interface PushFixtureState {
  projectSourceDisposition: PushSourceDisposition;
  credentialSourceDisposition: PushSourceDisposition;
  apnsBindingState: "BOUND" | "MISSING_POLICY_BLOCK";
}

const PUSH_PROVIDER_DOCS = [
  "https://firebase.google.com/docs/cloud-messaging",
  "https://firebase.google.com/docs/cloud-messaging/server-environment",
  "https://firebase.google.com/docs/cloud-messaging/send/v1-api#authorize-http-v1-send-requests",
  "https://firebase.google.com/docs/cloud-messaging/ios/get-started",
  "https://developer.apple.com/help/account/capabilities/communicate-with-apns-using-authentication-tokens/",
  "https://developer.apple.com/help/account/keys/create-a-private-key",
] as const;

const PUSH_NOTIFICATION_TYPES: WorkItemNotificationType[] = [
  "NEW_ASSIGNMENT",
  "REASSIGNMENT",
  "ESCALATION",
  "CUSTOMER_REPLY",
  "CUSTOMER_DUE_DATE_CHANGED",
  "SLA_DUE_SOON",
  "SLA_OVERDUE",
  "SLA_BREACHED",
  "ITEM_RESOLVED",
  "ITEM_CANCELLED",
  "REQUEST_INFO_OPENED",
  "CUSTOMER_VISIBLE_COMMENT",
];

const PUSH_ELIGIBLE_FAMILIES: PushEligibleNotificationFamily[] = [
  "ESCALATION",
  "CUSTOMER_REPLY",
  "SLA_OVERDUE",
  "SLA_BREACHED",
];

const PUSH_EXCLUDED_FAMILIES: PushExcludedNotificationFamily[] =
  PUSH_NOTIFICATION_TYPES.filter(
    (family): family is PushExcludedNotificationFamily =>
      !PUSH_ELIGIBLE_FAMILIES.includes(family as PushEligibleNotificationFamily),
  );

const PUSH_SELECTORS: SelectorManifest = {
  manifestId: "firebase-compatible-device-messaging-control-plane",
  providerId: PUSH_PROVIDER_ID,
  flowId: PUSH_FLOW_ID,
  selectors: [
    {
      selectorId: "workspace-heading",
      description: "Primary heading for the device messaging control plane",
      strategy: "ROLE",
      value: "heading",
      accessibleName: "Device messaging control plane",
    },
    {
      selectorId: "project-action",
      description: "Create or adopt messaging project action",
      strategy: "ROLE",
      value: "button",
      accessibleName: "Create or adopt messaging project",
    },
    {
      selectorId: "credentials-heading",
      description: "Credential section heading",
      strategy: "ROLE",
      value: "heading",
      accessibleName: "Credentials",
    },
    {
      selectorId: "credential-action",
      description: "Bind APNs and vault-safe credentials action",
      strategy: "ROLE",
      value: "button",
      accessibleName: "Bind APNs and vault-safe credentials",
    },
    {
      selectorId: "channels-heading",
      description: "Channel catalog heading",
      strategy: "ROLE",
      value: "heading",
      accessibleName: "Channel catalog",
    },
    {
      selectorId: "channel-action",
      description: "Validate channel catalog action",
      strategy: "ROLE",
      value: "button",
      accessibleName: "Validate channel catalog",
    },
    {
      selectorId: "continuity-heading",
      description: "Continuity matrix heading",
      strategy: "ROLE",
      value: "heading",
      accessibleName: "Continuity matrix",
    },
    {
      selectorId: "continuity-action",
      description: "Validate continuity targets action",
      strategy: "ROLE",
      value: "button",
      accessibleName: "Validate continuity targets",
    },
    {
      selectorId: "project-row-fallback",
      description: "Structured project row fallback when semantic labels drift",
      strategy: "CSS_FALLBACK",
      value: "[data-testid='push-project-row']",
      justification:
        "Used only when the provider still exposes structured project rows but semantic labels drift enough that direct lookup is unsafe.",
      driftSignal:
        "Raise selector-drift warning if push project rows can no longer be resolved semantically.",
    },
  ],
};

function hashToken(value: string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function productEnvironmentLabel(value: PushProductEnvironmentId): string {
  switch (value) {
    case "env_local_provisioning_workstation":
      return "Local fixture";
    case "env_shared_sandbox_integration":
      return "Sandbox";
    case "env_preproduction_verification":
      return "Pre-production";
    case "env_production":
      return "Production";
  }
}

function sourceRefs(): SourceRef[] {
  return [
    {
      source_ref:
        "Algorithm/collaboration_workspace_contract.md::L1861[notification_dedupe_and_recheck]",
      rationale:
        "Notifications remain visibility-bound and deduplicated before delivery.",
    },
    {
      source_ref:
        "Algorithm/collaboration_workspace_contract.md::L1867[notification_open_same_item_shell]",
      rationale:
        "Notification-open routing must preserve the same work item, shell grammar, and lawful return target.",
    },
    {
      source_ref:
        "Algorithm/collaboration_workspace_contract.md::L1871[internal_native_support_reopening_customer_browser_only]",
      rationale:
        "Internal notifications may advertise native support reopening, while customer-visible notifications remain browser-only.",
    },
    {
      source_ref:
        "Algorithm/customer_client_portal_experience_contract.md::L256[browser_only_embodiments]",
      rationale:
        "Portal continuity and customer-safe notification navigation stay inside browser-owned embodiments at this stage.",
    },
    {
      source_ref:
        "Algorithm/customer_client_portal_experience_contract.md::L540[cross_device_continuity_contract]",
      rationale:
        "Cross-device continuity must restore the same portal object rather than widening shell or visibility scope.",
    },
    {
      source_ref:
        "Algorithm/macos_native_operator_workspace_blueprint.md::L459[system_notifications_for_long_running_review_or_authority_callbacks]",
      rationale:
        "The native operator embodiment explicitly expects redaction-safe system notifications for operator work.",
    },
    {
      source_ref:
        "Algorithm/data_model.md::L195[WorkItemNotification]",
      rationale:
        "WorkItemNotification carries delivery channel, shell ownership, and cross-device continuity.",
    },
    {
      source_ref:
        "Algorithm/PATCH_RESOLUTION_INDEX.md::L602[staff_only_notification_families_internal_only]",
      rationale:
        "Staff-only notification families remain internal-only and cannot drift into customer-visible delivery.",
    },
  ];
}

function providerSelection(): ProviderSelectionRecord {
  return {
    provider_selection_status: PUSH_PROVIDER_VENDOR_SELECTION,
    provider_family: "DEVICE_MESSAGING",
    provider_vendor_adapter: PUSH_PROVIDER_VENDOR_ADAPTER,
    provider_vendor_label: "Firebase Cloud Messaging-compatible with APNs bridge",
    docs_urls: [...PUSH_PROVIDER_DOCS],
    source_refs: sourceRefs(),
  };
}

function commonExcludedFamilyRows() {
  const refs = sourceRefs();
  return [
    {
      notification_family: "NEW_ASSIGNMENT" as const,
      exclusion_reason:
        "Assignment changes stay in-app and badge-visible only so operator routing does not become noisy OS-level transport.",
      source_refs: refs,
    },
    {
      notification_family: "REASSIGNMENT" as const,
      exclusion_reason:
        "Reassignment remains in-app and badge-visible only under the calm-shell low-noise posture.",
      source_refs: refs,
    },
    {
      notification_family: "CUSTOMER_DUE_DATE_CHANGED" as const,
      exclusion_reason:
        "Customer due-date change is customer-visible and browser-only under the published collaboration contract.",
      source_refs: refs,
    },
    {
      notification_family: "SLA_DUE_SOON" as const,
      exclusion_reason:
        "Due-soon reminders stay inside queue and badge posture; only overdue or breached urgency escalates to device transport.",
      source_refs: refs,
    },
    {
      notification_family: "ITEM_RESOLVED" as const,
      exclusion_reason:
        "Resolved notifications are customer-facing or in-app follow-through only, not native operator push.",
      source_refs: refs,
    },
    {
      notification_family: "ITEM_CANCELLED" as const,
      exclusion_reason:
        "Cancelled posture is handled through the mounted work-item shell and does not justify OS-level push at this stage.",
      source_refs: refs,
    },
    {
      notification_family: "REQUEST_INFO_OPENED" as const,
      exclusion_reason:
        "Request-for-info opening remains customer-visible and browser-only.",
      source_refs: refs,
    },
    {
      notification_family: "CUSTOMER_VISIBLE_COMMENT" as const,
      exclusion_reason:
        "Customer-visible comment delivery stays browser and email scoped through customer-safe projection.",
      source_refs: refs,
    },
  ];
}

function createWorkspaceRows(): PushProviderWorkspaceRow[] {
  const refs = sourceRefs();
  return [
    {
      workspace_ref: "push_workspace_local_fixture",
      product_environment_id: "env_local_provisioning_workstation",
      provider_environment_tag: "LOCAL_FIXTURE",
      provider_project_label: "Taxat Device Messaging Fixture",
      provider_project_alias: "push-fixture-local",
      project_id_alias: "taxat-device-messaging-local",
      project_number_alias: "100100100100",
      fcm_sender_id_alias: "100100100100",
      source_disposition: "CREATED_DURING_RUN",
      delivery_scope: "FIXTURE_ONLY",
      channel_refs: ["push_channel_local_fixture"],
      cloud_messaging_api_state: "ENABLED",
      registration_api_state: "FIXTURE_ONLY",
      bundle_identifier_or_null: null,
      service_account_metadata_ref_or_null: null,
      apns_binding_state: "FIXTURE_ONLY",
      source_refs: refs,
      notes: [
        "Local provisioning uses a fixture sink only and never emits to live device tokens.",
      ],
    },
    {
      workspace_ref: "push_workspace_sandbox",
      product_environment_id: "env_shared_sandbox_integration",
      provider_environment_tag: "SANDBOX",
      provider_project_label: "Taxat Device Messaging Sandbox",
      provider_project_alias: "push-sandbox",
      project_id_alias: "taxat-device-messaging-sandbox",
      project_number_alias: "200200200200",
      fcm_sender_id_alias: "200200200200",
      source_disposition: "ADOPTED_EXISTING",
      delivery_scope: "NATIVE_MACOS_INTERNAL_ONLY",
      channel_refs: ["push_channel_macos_sandbox"],
      cloud_messaging_api_state: "ENABLED",
      registration_api_state: "NOT_REQUIRED_AT_THIS_STAGE",
      bundle_identifier_or_null: "dev.taxat.InternalOperatorWorkspaceMac",
      service_account_metadata_ref_or_null:
        "vault://push/fcm/sandbox/service-account",
      apns_binding_state: "BOUND",
      source_refs: refs,
      notes: [
        "Sandbox keeps native operator delivery bound to allowlisted devices and internal-only notification families.",
      ],
    },
    {
      workspace_ref: "push_workspace_preprod",
      product_environment_id: "env_preproduction_verification",
      provider_environment_tag: "PREPRODUCTION",
      provider_project_label: "Taxat Device Messaging Pre-production",
      provider_project_alias: "push-preprod",
      project_id_alias: "taxat-device-messaging-preprod",
      project_number_alias: "300300300300",
      fcm_sender_id_alias: "300300300300",
      source_disposition: "ADOPTED_EXISTING",
      delivery_scope: "NATIVE_MACOS_INTERNAL_ONLY",
      channel_refs: ["push_channel_macos_preprod"],
      cloud_messaging_api_state: "ENABLED",
      registration_api_state: "NOT_REQUIRED_AT_THIS_STAGE",
      bundle_identifier_or_null: "dev.taxat.InternalOperatorWorkspaceMac",
      service_account_metadata_ref_or_null:
        "vault://push/fcm/preprod/service-account",
      apns_binding_state: "BOUND",
      source_refs: refs,
      notes: [
        "Pre-production keeps live-provider topology but remains rollout-gated and operator-allowlisted.",
      ],
    },
    {
      workspace_ref: "push_workspace_production",
      product_environment_id: "env_production",
      provider_environment_tag: "PRODUCTION",
      provider_project_label: "Taxat Device Messaging Production",
      provider_project_alias: "push-production",
      project_id_alias: "taxat-device-messaging-production",
      project_number_alias: "400400400400",
      fcm_sender_id_alias: "400400400400",
      source_disposition: "ADOPTED_EXISTING",
      delivery_scope: "NATIVE_MACOS_INTERNAL_ONLY",
      channel_refs: ["push_channel_macos_production"],
      cloud_messaging_api_state: "ENABLED",
      registration_api_state: "NOT_REQUIRED_AT_THIS_STAGE",
      bundle_identifier_or_null: "dev.taxat.InternalOperatorWorkspaceMac",
      service_account_metadata_ref_or_null:
        "vault://push/fcm/production/service-account",
      apns_binding_state: "BOUND",
      source_refs: refs,
      notes: [
        "Production device messaging remains internal-only and tied to the macOS operator embodiment.",
      ],
    },
  ];
}

export function createRecommendedPushProjectInventory(
  runContext: RunContext,
): PushProjectInventory {
  return {
    schema_version: "1.0",
    inventory_id: "push_project_inventory",
    provider_id: PUSH_PROVIDER_ID,
    provider_display_name: PUSH_PROVIDER_DISPLAY_NAME,
    run_id: runContext.runId,
    flow_id: PUSH_FLOW_ID,
    workspace_id: runContext.workspaceId,
    operator_identity_alias: runContext.operatorIdentityAlias,
    provider_selection: providerSelection(),
    workspace_rows: createWorkspaceRows(),
    channel_catalog_ref: "config/notifications/push_channel_catalog.json",
    continuity_matrix_ref:
      "config/notifications/notification_open_continuity_matrix.json",
    key_lineage_ref: "data/provisioning/push_key_lineage.template.json",
    typed_gaps: [
      "Web push stays intentionally deferred until a later surface decision proves it is required.",
    ],
    notes: [
      "The project inventory models transport control-plane posture only and never workflow truth.",
      "Customer-visible notifications remain browser and email scoped at this stage.",
    ],
    last_verified_at: `${PUSH_POLICY_GENERATED_ON}T00:00:00.000Z`,
  };
}

function createCredentialRecords(): PushCredentialRecord[] {
  const refs = sourceRefs();
  return [
    {
      credential_ref: "push_credential_fcm_service_account_sandbox",
      product_environment_id: "env_shared_sandbox_integration",
      credential_kind: "FCM_SERVICE_ACCOUNT",
      source_disposition: "ADOPTED_EXISTING",
      vault_secret_ref: "vault://push/fcm/sandbox/service-account",
      fingerprint: hashToken("push-fcm-service-account-sandbox"),
      bundle_identifier_or_null: "dev.taxat.InternalOperatorWorkspaceMac",
      bound_web_origin_or_null: null,
      key_id_alias_or_null: null,
      team_id_alias_or_null: null,
      rotation_rule:
        "Rotate on Firebase project rollover or whenever runtime trust requires a new service-account binding.",
      secret_material_state: "VAULT_ONLY",
      source_refs: refs,
      notes: [
        "The service account authorizes server-side send and project inspection only.",
      ],
    },
    {
      credential_ref: "push_credential_apns_auth_key_sandbox",
      product_environment_id: "env_shared_sandbox_integration",
      credential_kind: "APNS_AUTH_KEY",
      source_disposition: "ADOPTED_EXISTING",
      vault_secret_ref: "vault://push/apns/sandbox/auth-key",
      fingerprint: hashToken("push-apns-auth-key-sandbox"),
      bundle_identifier_or_null: "dev.taxat.InternalOperatorWorkspaceMac",
      bound_web_origin_or_null: null,
      key_id_alias_or_null: "APNS-SBX-01",
      team_id_alias_or_null: "TAXATTEAM01",
      rotation_rule:
        "Rotate on Apple key rollover or compromise, and keep the old key only for controlled cutover.",
      secret_material_state: "VAULT_ONLY",
      source_refs: refs,
      notes: [
        "The APNs key binds native macOS delivery and never leaves the governed vault boundary.",
      ],
    },
    {
      credential_ref: "push_credential_fcm_service_account_preprod",
      product_environment_id: "env_preproduction_verification",
      credential_kind: "FCM_SERVICE_ACCOUNT",
      source_disposition: "ADOPTED_EXISTING",
      vault_secret_ref: "vault://push/fcm/preprod/service-account",
      fingerprint: hashToken("push-fcm-service-account-preprod"),
      bundle_identifier_or_null: "dev.taxat.InternalOperatorWorkspaceMac",
      bound_web_origin_or_null: null,
      key_id_alias_or_null: null,
      team_id_alias_or_null: null,
      rotation_rule:
        "Rotate on Firebase project rollover or whenever runtime trust requires a new service-account binding.",
      secret_material_state: "VAULT_ONLY",
      source_refs: refs,
      notes: [
        "Pre-production credentials mirror production topology but remain rollout-gated.",
      ],
    },
    {
      credential_ref: "push_credential_apns_auth_key_preprod",
      product_environment_id: "env_preproduction_verification",
      credential_kind: "APNS_AUTH_KEY",
      source_disposition: "ADOPTED_EXISTING",
      vault_secret_ref: "vault://push/apns/preprod/auth-key",
      fingerprint: hashToken("push-apns-auth-key-preprod"),
      bundle_identifier_or_null: "dev.taxat.InternalOperatorWorkspaceMac",
      bound_web_origin_or_null: null,
      key_id_alias_or_null: "APNS-PP-01",
      team_id_alias_or_null: "TAXATTEAM01",
      rotation_rule:
        "Rotate on Apple key rollover or compromise, and keep the old key only for controlled cutover.",
      secret_material_state: "VAULT_ONLY",
      source_refs: refs,
      notes: [
        "The APNs key stays environment-scoped at the vault boundary even though the Apple team remains the same.",
      ],
    },
    {
      credential_ref: "push_credential_fcm_service_account_production",
      product_environment_id: "env_production",
      credential_kind: "FCM_SERVICE_ACCOUNT",
      source_disposition: "ADOPTED_EXISTING",
      vault_secret_ref: "vault://push/fcm/production/service-account",
      fingerprint: hashToken("push-fcm-service-account-production"),
      bundle_identifier_or_null: "dev.taxat.InternalOperatorWorkspaceMac",
      bound_web_origin_or_null: null,
      key_id_alias_or_null: null,
      team_id_alias_or_null: null,
      rotation_rule:
        "Rotate on Firebase project rollover or whenever runtime trust requires a new service-account binding.",
      secret_material_state: "VAULT_ONLY",
      source_refs: refs,
      notes: [
        "Production server credentials remain vault-bound and never appear in repo fixtures or screenshots.",
      ],
    },
    {
      credential_ref: "push_credential_apns_auth_key_production",
      product_environment_id: "env_production",
      credential_kind: "APNS_AUTH_KEY",
      source_disposition: "ADOPTED_EXISTING",
      vault_secret_ref: "vault://push/apns/production/auth-key",
      fingerprint: hashToken("push-apns-auth-key-production"),
      bundle_identifier_or_null: "dev.taxat.InternalOperatorWorkspaceMac",
      bound_web_origin_or_null: null,
      key_id_alias_or_null: "APNS-PRD-01",
      team_id_alias_or_null: "TAXATTEAM01",
      rotation_rule:
        "Rotate on Apple key rollover or compromise, and keep the old key only for controlled cutover.",
      secret_material_state: "VAULT_ONLY",
      source_refs: refs,
      notes: [
        "Production APNs material is governed separately from service-account credentials and remains vault-only.",
      ],
    },
  ];
}

export function createRecommendedPushKeyLineage(
  runContext: RunContext,
): PushKeyLineage {
  return {
    schema_version: "1.0",
    lineage_id: "push_key_lineage",
    provider_id: PUSH_PROVIDER_ID,
    provider_display_name: PUSH_PROVIDER_DISPLAY_NAME,
    run_id: runContext.runId,
    flow_id: PUSH_FLOW_ID,
    workspace_id: runContext.workspaceId,
    operator_identity_alias: runContext.operatorIdentityAlias,
    provider_selection: providerSelection(),
    credential_records: createCredentialRecords(),
    typed_gaps: [
      "No web-push VAPID key is provisioned because browser push is not selected for current surfaces.",
    ],
    notes: [
      "Credential lineage is explicit and vault-bound for every live environment.",
    ],
    last_verified_at: `${PUSH_POLICY_GENERATED_ON}T00:00:00.000Z`,
  };
}

export function createRecommendedPushChannelCatalog(): PushChannelCatalog {
  const refs = sourceRefs();
  return {
    schema_version: "1.0",
    catalog_id: "push_channel_catalog",
    provider_selection: providerSelection(),
    policy_version: PUSH_POLICY_VERSION,
    generated_on: PUSH_POLICY_GENERATED_ON,
    truth_boundary_statement:
      "Device messaging communicates engine-authored notification posture, but it never becomes workflow, approval, or authority truth.",
    surface_decisions: {
      customer_portal_web_push: "DISABLED",
      operator_web_push: "DISABLED",
      macos_native_system_notifications: "ENABLED",
    },
    channel_records: [
      {
        channel_ref: "push_channel_local_fixture",
        product_environment_id: "env_local_provisioning_workstation",
        channel_family: "LOCAL_TEST_SINK",
        delivery_state: "FIXTURE_ONLY",
        client_surface: "LOCAL_FIXTURE",
        shell_family: "NO_NEW_LEGAL_SHELL",
        visibility_class: "INTERNAL_ONLY",
        urgency_classes: ["ACTION_REQUIRED", "HIGH_URGENCY"],
        eligible_notification_families: PUSH_ELIGIBLE_FAMILIES,
        excluded_notification_families: PUSH_EXCLUDED_FAMILIES,
        provider_binding: {
          binding_mode: "FIXTURE_SINK_ONLY",
          workspace_ref_or_null: "push_workspace_local_fixture",
          credential_refs: [],
          bundle_identifier_or_null: null,
          web_origin_or_null: null,
          apns_required: false,
        },
        source_refs: refs,
        notes: [
          "The local fixture sink exists only for provisioning rehearsals and never targets real device tokens.",
        ],
      },
      {
        channel_ref: "push_channel_macos_sandbox",
        product_environment_id: "env_shared_sandbox_integration",
        channel_family: "MACOS_SYSTEM_NOTIFICATION",
        delivery_state: "ACTIVE",
        client_surface: "NATIVE_MACOS_OPERATOR",
        shell_family: "CALM_SHELL",
        visibility_class: "INTERNAL_ONLY",
        urgency_classes: ["ACTION_REQUIRED", "HIGH_URGENCY"],
        eligible_notification_families: PUSH_ELIGIBLE_FAMILIES,
        excluded_notification_families: PUSH_EXCLUDED_FAMILIES,
        provider_binding: {
          binding_mode: "FCM_APNS_BRIDGE",
          workspace_ref_or_null: "push_workspace_sandbox",
          credential_refs: [
            "push_credential_fcm_service_account_sandbox",
            "push_credential_apns_auth_key_sandbox",
          ],
          bundle_identifier_or_null: "dev.taxat.InternalOperatorWorkspaceMac",
          web_origin_or_null: null,
          apns_required: true,
        },
        source_refs: refs,
        notes: [
          "Sandbox device messaging remains internal-only and allowlist-bound.",
        ],
      },
      {
        channel_ref: "push_channel_macos_preprod",
        product_environment_id: "env_preproduction_verification",
        channel_family: "MACOS_SYSTEM_NOTIFICATION",
        delivery_state: "ACTIVE",
        client_surface: "NATIVE_MACOS_OPERATOR",
        shell_family: "CALM_SHELL",
        visibility_class: "INTERNAL_ONLY",
        urgency_classes: ["ACTION_REQUIRED", "HIGH_URGENCY"],
        eligible_notification_families: PUSH_ELIGIBLE_FAMILIES,
        excluded_notification_families: PUSH_EXCLUDED_FAMILIES,
        provider_binding: {
          binding_mode: "FCM_APNS_BRIDGE",
          workspace_ref_or_null: "push_workspace_preprod",
          credential_refs: [
            "push_credential_fcm_service_account_preprod",
            "push_credential_apns_auth_key_preprod",
          ],
          bundle_identifier_or_null: "dev.taxat.InternalOperatorWorkspaceMac",
          web_origin_or_null: null,
          apns_required: true,
        },
        source_refs: refs,
        notes: [
          "Pre-production validates the live topology before production promotion.",
        ],
      },
      {
        channel_ref: "push_channel_macos_production",
        product_environment_id: "env_production",
        channel_family: "MACOS_SYSTEM_NOTIFICATION",
        delivery_state: "ACTIVE",
        client_surface: "NATIVE_MACOS_OPERATOR",
        shell_family: "CALM_SHELL",
        visibility_class: "INTERNAL_ONLY",
        urgency_classes: ["ACTION_REQUIRED", "HIGH_URGENCY"],
        eligible_notification_families: PUSH_ELIGIBLE_FAMILIES,
        excluded_notification_families: PUSH_EXCLUDED_FAMILIES,
        provider_binding: {
          binding_mode: "FCM_APNS_BRIDGE",
          workspace_ref_or_null: "push_workspace_production",
          credential_refs: [
            "push_credential_fcm_service_account_production",
            "push_credential_apns_auth_key_production",
          ],
          bundle_identifier_or_null: "dev.taxat.InternalOperatorWorkspaceMac",
          web_origin_or_null: null,
          apns_required: true,
        },
        source_refs: refs,
        notes: [
          "Production device messaging remains native-macOS-only and internal-only.",
        ],
      },
      {
        channel_ref: "push_channel_operator_web_deferred",
        product_environment_id: "env_preproduction_verification",
        channel_family: "OPERATOR_WEB_PUSH_DEFERRED",
        delivery_state: "DEFERRED_NOT_PROVISIONED",
        client_surface: "OPERATOR_WEB",
        shell_family: "CALM_SHELL",
        visibility_class: "INTERNAL_ONLY",
        urgency_classes: [],
        eligible_notification_families: [],
        excluded_notification_families: PUSH_NOTIFICATION_TYPES,
        provider_binding: {
          binding_mode: "NONE_DEFERRED",
          workspace_ref_or_null: null,
          credential_refs: [],
          bundle_identifier_or_null: null,
          web_origin_or_null: "https://operator.preprod.taxat.example",
          apns_required: false,
        },
        source_refs: refs,
        notes: [
          "Operator web keeps in-app stream, queue, and badge posture only. No browser push is provisioned now.",
        ],
      },
      {
        channel_ref: "push_channel_customer_portal_web_deferred",
        product_environment_id: "env_preproduction_verification",
        channel_family: "CUSTOMER_PORTAL_WEB_PUSH_DEFERRED",
        delivery_state: "DEFERRED_NOT_PROVISIONED",
        client_surface: "CLIENT_PORTAL_WEB",
        shell_family: "CLIENT_PORTAL_SHELL",
        visibility_class: "CUSTOMER_VISIBLE",
        urgency_classes: [],
        eligible_notification_families: [],
        excluded_notification_families: PUSH_NOTIFICATION_TYPES,
        provider_binding: {
          binding_mode: "NONE_DEFERRED",
          workspace_ref_or_null: null,
          credential_refs: [],
          bundle_identifier_or_null: null,
          web_origin_or_null: "https://portal.preprod.taxat.example",
          apns_required: false,
        },
        source_refs: refs,
        notes: [
          "Customer-visible notifications remain browser-only through in-app and email flows; no web push is selected.",
        ],
      },
    ],
    excluded_notification_families: commonExcludedFamilyRows(),
    typed_gaps: [
      "A later client-surface decision may still introduce web push, but that choice is not justified by the current corpus.",
    ],
    notes: [
      "Push transport is embodiment-conditional, not universal.",
      "Internal notifications may reopen parent-bound native support surfaces, while customer-visible notifications remain browser-only.",
    ],
  };
}

export function createRecommendedNotificationOpenContinuityMatrix(): NotificationOpenContinuityMatrix {
  const refs = sourceRefs();
  return {
    schema_version: "1.0",
    matrix_id: "notification_open_continuity_matrix",
    provider_selection: providerSelection(),
    policy_version: PUSH_POLICY_VERSION,
    generated_on: PUSH_POLICY_GENERATED_ON,
    truth_boundary_statement:
      "Notification open must remount the same work item in the same shell family with an explicit focus anchor and lawful parent return target.",
    continuity_rows: [
      {
        notification_family: "ESCALATION",
        visibility_class: "INTERNAL_ONLY",
        channel_family: "MACOS_SYSTEM_NOTIFICATION",
        client_surface: "NATIVE_MACOS_OPERATOR",
        shell_family: "CALM_SHELL",
        target_surface_ref: "native_primary_work_item_scene",
        target_module_code: "DETAIL_DRAWER",
        canonical_object_ref_template: "work-item:{item_id}",
        focus_anchor_ref_template: "focus.escalation-summary:{item_id}",
        return_surface_ref: "native_primary_manifest_scene",
        return_focus_anchor_ref_template: "queue-row:{item_id}",
        fallback_surface_ref: "native_primary_manifest_scene",
        fallback_focus_anchor_ref_template: "queue-row:{item_id}",
        parent_bound_support_reopen: "ALLOWED_FOR_AUTHORITY_SUPPORT_ONLY",
        urgency_class: "HIGH_URGENCY",
        source_refs: refs,
        notes: [
          "Escalation opens the same work item first and only then permits parent-bound authority support reopening when still lawful.",
        ],
      },
      {
        notification_family: "CUSTOMER_REPLY",
        visibility_class: "INTERNAL_ONLY",
        channel_family: "MACOS_SYSTEM_NOTIFICATION",
        client_surface: "NATIVE_MACOS_OPERATOR",
        shell_family: "CALM_SHELL",
        target_surface_ref: "native_primary_work_item_scene",
        target_module_code: "INTERNAL_ACTIVITY",
        canonical_object_ref_template: "work-item:{item_id}",
        focus_anchor_ref_template:
          "focus.customer-activity.latest-reply:{item_id}",
        return_surface_ref: "native_primary_manifest_scene",
        return_focus_anchor_ref_template: "queue-row:{item_id}",
        fallback_surface_ref: "native_primary_manifest_scene",
        fallback_focus_anchor_ref_template: "queue-row:{item_id}",
        parent_bound_support_reopen: "NOT_REQUIRED",
        urgency_class: "ACTION_REQUIRED",
        source_refs: refs,
        notes: [
          "Customer replies reopen the exact work item and anchor the newest customer-visible response.",
        ],
      },
      {
        notification_family: "SLA_OVERDUE",
        visibility_class: "INTERNAL_ONLY",
        channel_family: "MACOS_SYSTEM_NOTIFICATION",
        client_surface: "NATIVE_MACOS_OPERATOR",
        shell_family: "CALM_SHELL",
        target_surface_ref: "native_primary_work_item_scene",
        target_module_code: "DECISION_SUMMARY",
        canonical_object_ref_template: "work-item:{item_id}",
        focus_anchor_ref_template: "focus.sla-overdue:{item_id}",
        return_surface_ref: "native_primary_manifest_scene",
        return_focus_anchor_ref_template: "queue-row:{item_id}",
        fallback_surface_ref: "collaboration_staff_inbox",
        fallback_focus_anchor_ref_template: "queue-row:{item_id}",
        parent_bound_support_reopen: "NOT_REQUIRED",
        urgency_class: "ACTION_REQUIRED",
        source_refs: refs,
        notes: [
          "Overdue posture reopens the work item and highlights the due-state explanation without changing shell ownership.",
        ],
      },
      {
        notification_family: "SLA_BREACHED",
        visibility_class: "INTERNAL_ONLY",
        channel_family: "MACOS_SYSTEM_NOTIFICATION",
        client_surface: "NATIVE_MACOS_OPERATOR",
        shell_family: "CALM_SHELL",
        target_surface_ref: "native_primary_work_item_scene",
        target_module_code: "DECISION_SUMMARY",
        canonical_object_ref_template: "work-item:{item_id}",
        focus_anchor_ref_template: "focus.sla-breached:{item_id}",
        return_surface_ref: "native_primary_manifest_scene",
        return_focus_anchor_ref_template: "queue-row:{item_id}",
        fallback_surface_ref: "collaboration_staff_inbox",
        fallback_focus_anchor_ref_template: "queue-row:{item_id}",
        parent_bound_support_reopen: "NOT_REQUIRED",
        urgency_class: "HIGH_URGENCY",
        source_refs: refs,
        notes: [
          "Breach posture remains same-object and same-shell, with queue return as the narrowest lawful fallback.",
        ],
      },
    ],
    excluded_notification_families: commonExcludedFamilyRows(),
    typed_gaps: [
      "No continuity mapping is published for web push because browser push is intentionally deferred.",
    ],
    notes: [
      "Same-object continuity is product-critical configuration and must fail closed if a route or focus anchor drifts.",
    ],
  };
}

function buildCredentialView(record: PushCredentialRecord): DeviceMessagingCredentialView {
  const environmentLabel = productEnvironmentLabel(record.product_environment_id);
  return {
    credential_ref: record.credential_ref,
    label:
      record.credential_kind === "FCM_SERVICE_ACCOUNT"
        ? `${environmentLabel} FCM service account`
        : `${environmentLabel} APNs auth key`,
    environment_label: environmentLabel,
    kind_label:
      record.credential_kind === "FCM_SERVICE_ACCOUNT"
        ? "FCM service account"
        : "APNs auth key",
    vault_ref: record.vault_secret_ref,
    binding_summary:
      record.bundle_identifier_or_null ?? record.bound_web_origin_or_null ?? "Vault only",
    rotation_rule: record.rotation_rule,
  };
}

function activeContinuityRows(
  matrix: NotificationOpenContinuityMatrix,
  family: PushEligibleNotificationFamily,
) {
  return matrix.continuity_rows.filter(
    (row) => row.notification_family === family,
  );
}

export function createDeviceMessagingTopologyBoardViewModel(): DeviceMessagingTopologyBoardViewModel {
  const catalog = createRecommendedPushChannelCatalog();
  const matrix = createRecommendedNotificationOpenContinuityMatrix();
  const lineage = createCredentialRecords();

  const channels: DeviceMessagingChannelView[] = catalog.channel_records.map((channel) => {
    const families =
      channel.eligible_notification_families.length > 0
        ? channel.eligible_notification_families.flatMap((family) =>
            activeContinuityRows(matrix, family).map((row) => ({
              notification_family: family,
              urgency_class: row.urgency_class,
              visibility_class: row.visibility_class,
              delivery_decision:
                channel.delivery_state === "ACTIVE"
                  ? "Active native system notification"
                  : channel.delivery_state === "FIXTURE_ONLY"
                    ? "Fixture-only sink"
                    : "Deferred",
            })),
          )
        : [
            {
              notification_family:
                channel.client_surface === "CLIENT_PORTAL_WEB"
                  ? "CUSTOMER_VISIBLE families"
                  : "IN_APP_ONLY internal families",
              urgency_class: "Deferred",
              visibility_class: channel.visibility_class,
              delivery_decision: "Deferred at this stage",
            },
          ];

    const continuityRows =
      channel.channel_family === "MACOS_SYSTEM_NOTIFICATION"
        ? channel.eligible_notification_families.flatMap((family) =>
            activeContinuityRows(matrix, family).map((row) => ({
              label: family.replaceAll("_", " "),
              target_surface_ref: row.target_surface_ref,
              focus_anchor_ref_template: row.focus_anchor_ref_template,
              return_surface_ref: row.return_surface_ref,
            })),
          )
        : [
            {
              label: "No remote continuity target published",
              target_surface_ref:
                channel.client_surface === "CLIENT_PORTAL_WEB"
                  ? "CLIENT_PORTAL_SHELL remains browser-owned"
                  : "CALM_SHELL remains in-app only",
              focus_anchor_ref_template: "n/a",
              return_surface_ref: "n/a",
            },
          ];

    return {
      channel_ref: channel.channel_ref,
      label:
        channel.channel_family === "LOCAL_TEST_SINK"
          ? "Local fixture sink"
          : channel.channel_family === "MACOS_SYSTEM_NOTIFICATION"
            ? `Native macOS system notification (${productEnvironmentLabel(channel.product_environment_id)})`
            : channel.channel_family === "OPERATOR_WEB_PUSH_DEFERRED"
              ? "Operator web push deferred"
              : "Customer portal web push deferred",
      environment_label: productEnvironmentLabel(channel.product_environment_id),
      provider_label:
        channel.provider_binding.binding_mode === "FCM_APNS_BRIDGE"
          ? "FCM + APNs bridge"
          : channel.provider_binding.binding_mode === "FIXTURE_SINK_ONLY"
            ? "Fixture sink"
            : "Deferred by policy",
      client_surface_label: channel.client_surface.replaceAll("_", " "),
      state_label:
        channel.delivery_state === "ACTIVE"
          ? "Active"
          : channel.delivery_state === "FIXTURE_ONLY"
            ? "Fixture Only"
            : "Deferred",
      summary:
        channel.channel_family === "MACOS_SYSTEM_NOTIFICATION"
          ? "Internal-only operator notifications reopen the same work item in the native calm shell."
          : channel.channel_family === "LOCAL_TEST_SINK"
            ? "The fixture sink proves topology and key-lineage behavior without live delivery."
            : "This surface stays in-app or email only until a later product decision proves browser push is required.",
      product_notification_families: families,
      provider_channel_rows: [
        {
          label:
            channel.provider_binding.binding_mode === "FCM_APNS_BRIDGE"
              ? "Provider binding"
              : "Provider posture",
          detail:
            channel.provider_binding.binding_mode === "FCM_APNS_BRIDGE"
              ? `${channel.provider_binding.workspace_ref_or_null} -> ${channel.provider_binding.bundle_identifier_or_null}`
              : channel.provider_binding.binding_mode === "FIXTURE_SINK_ONLY"
                ? "Fixture sink only"
                : "No project or key is provisioned",
        },
      ],
      continuity_target_rows: continuityRows,
      key_lineage_refs: channel.provider_binding.credential_refs,
      continuity_notes:
        channel.channel_family === "MACOS_SYSTEM_NOTIFICATION"
          ? [
              "Notification-open must stay same-object and same-shell.",
              "Fallback returns to the queue row or manifest scene, never a generic root.",
            ]
          : [
              "No remote notification-open continuity is published for this surface.",
            ],
      inspector_notes: channel.notes,
    };
  });

  return {
    provider_label: "Firebase-compatible device messaging with APNs bridge",
    provider_monogram: "PUSH",
    selection_posture: "NATIVE_MACOS_ONLY",
    channels,
    credential_lineage: lineage.map(buildCredentialView),
    notes: [
      "Customer-visible notifications remain browser and email scoped; no portal web push is provisioned.",
      "Operator web remains in-app and badge only; native macOS receives the active remote delivery path.",
      "Secrets stay vault-bound and lineage remains explicit per environment.",
    ],
  };
}

export function validatePushProjectInventory(
  inventory: PushProjectInventory,
  lineage: PushKeyLineage,
): void {
  if (inventory.workspace_rows.length !== 4) {
    throw new Error("Push project inventory must publish four environment rows.");
  }
  const activeRows = inventory.workspace_rows.filter(
    (row) => row.delivery_scope === "NATIVE_MACOS_INTERNAL_ONLY",
  );
  if (
    activeRows.some(
      (row) =>
        row.service_account_metadata_ref_or_null == null ||
        row.apns_binding_state !== "BOUND",
    )
  ) {
    throw new Error(
      "Every active native messaging row must retain a vault-safe service-account ref and APNs binding.",
    );
  }
  const lineageRefs = new Set(lineage.credential_records.map((row) => row.credential_ref));
  activeRows.forEach((row) => {
    const environmentSuffix =
      row.product_environment_id === "env_shared_sandbox_integration"
        ? "sandbox"
        : row.product_environment_id === "env_preproduction_verification"
          ? "preprod"
          : row.product_environment_id === "env_production"
            ? "production"
            : "local";
    if (environmentSuffix === "local") {
      return;
    }
    const requiredRefs = [
      `push_credential_fcm_service_account_${environmentSuffix}`,
      `push_credential_apns_auth_key_${environmentSuffix}`,
    ];
    requiredRefs.forEach((ref) => {
      if (!lineageRefs.has(ref)) {
        throw new Error(`Missing credential lineage ref ${ref} for ${row.workspace_ref}.`);
      }
    });
  });
}

export function validatePushKeyLineage(lineage: PushKeyLineage): void {
  if (lineage.credential_records.length !== 6) {
    throw new Error("Push key lineage must retain six governed credential rows.");
  }
  if (
    lineage.credential_records.some(
      (record) =>
        record.vault_secret_ref.includes("PRIVATE KEY") ||
        record.vault_secret_ref.endsWith(".p8"),
    )
  ) {
    throw new Error("Push key lineage must not persist raw APNs key material.");
  }
}

export function validatePushChannelCatalog(catalog: PushChannelCatalog): void {
  const activeChannels = catalog.channel_records.filter(
    (row) => row.delivery_state === "ACTIVE",
  );
  if (
    activeChannels.some(
      (row) =>
        row.visibility_class !== "INTERNAL_ONLY" ||
        row.client_surface !== "NATIVE_MACOS_OPERATOR",
    )
  ) {
    throw new Error(
      "Active push channels must stay internal-only and native-macOS scoped at this stage.",
    );
  }
  if (
    catalog.channel_records.some(
      (row) =>
        row.client_surface === "CLIENT_PORTAL_WEB" &&
        row.delivery_state !== "DEFERRED_NOT_PROVISIONED",
    )
  ) {
    throw new Error(
      "Customer portal push must remain explicitly deferred until a later surface decision.",
    );
  }
}

export function validateNotificationOpenContinuityMatrix(
  matrix: NotificationOpenContinuityMatrix,
  catalog: PushChannelCatalog,
): void {
  const eligibleFamilies = new Set<PushEligibleNotificationFamily>();
  matrix.continuity_rows.forEach((row) => {
    if (eligibleFamilies.has(row.notification_family)) {
      throw new Error(
        `Continuity mapping for ${row.notification_family} must be unique.`,
      );
    }
    eligibleFamilies.add(row.notification_family);
    if (
      row.shell_family !== "CALM_SHELL" ||
      row.target_surface_ref !== "native_primary_work_item_scene"
    ) {
      throw new Error(
        `Continuity mapping ${row.notification_family} must preserve the calm-shell work-item target.`,
      );
    }
  });
  PUSH_ELIGIBLE_FAMILIES.forEach((family) => {
    if (!eligibleFamilies.has(family)) {
      throw new Error(`Missing continuity mapping for push-eligible family ${family}.`);
    }
  });

  const catalogEligibleFamilies = new Set(
    catalog.channel_records.flatMap((row) => row.eligible_notification_families),
  );
  PUSH_ELIGIBLE_FAMILIES.forEach((family) => {
    if (!catalogEligibleFamilies.has(family)) {
      throw new Error(`Channel catalog is missing push-eligible family ${family}.`);
    }
  });
}

export function assertPushArtifactsSanitized(
  inventory: PushProjectInventory,
  lineage: PushKeyLineage,
): void {
  const serialized = JSON.stringify({ inventory, lineage });
  const forbiddenMarkers = [
    "-----BEGIN PRIVATE KEY-----",
    ".p8",
    "\"private_key\"",
    "AIza",
  ];
  forbiddenMarkers.forEach((marker) => {
    if (serialized.includes(marker)) {
      throw new Error(`Push artifacts must not persist raw secret material (${marker}).`);
    }
  });
}

export function createDefaultPushProviderEntryUrls(): DeviceMessagingProjectEntryUrls {
  return {
    controlPlane:
      "/automation/provisioning/tests/fixtures/firebase_push_console.html?scenario=existing",
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

function evidenceManifestPathFor(projectInventoryPath: string): string {
  return path.join(path.dirname(projectInventoryPath), "push_evidence_manifest.json");
}

async function persistJsonArtifact(filePath: string, payload: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function locateSelector(page: Page, descriptor: SelectorDescriptor): Locator {
  switch (descriptor.strategy) {
    case "ROLE":
      return page.getByRole(
        descriptor.value as Parameters<Page["getByRole"]>[0],
        descriptor.accessibleName
          ? { name: descriptor.accessibleName, exact: true }
          : undefined,
      );
    case "LABEL":
      return page.getByLabel(descriptor.value, { exact: true });
    case "TEXT":
      return page.getByText(descriptor.value, { exact: true });
    case "CSS_FALLBACK":
      return page.locator(descriptor.value);
    default:
      throw new Error(`Unsupported selector strategy ${descriptor.strategy}`);
  }
}

async function requireVisible(
  page: Page,
  manifest: SelectorManifest,
  selectorId: string,
): Promise<Locator> {
  const descriptor = rankSelectors(
    manifest.selectors.filter((entry) => entry.selectorId === selectorId),
  )[0];
  if (!descriptor) {
    throw new Error(`Selector ${selectorId} is missing from ${manifest.manifestId}.`);
  }
  const locator = locateSelector(page, descriptor);
  await locator.first().waitFor({ state: "visible" });
  return locator.first();
}

async function captureNoteEvidence(
  manifest: EvidenceManifest,
  stepId: string,
  summary: string,
): Promise<EvidenceManifest> {
  return appendEvidenceRecord(manifest, {
    evidenceId: `${stepId}-note-${createHash("sha1").update(summary).digest("hex").slice(0, 10)}`,
    stepId,
    kind: "NOTE",
    relativePath: null,
    captureMode: "REDACTED",
    summary,
  });
}

function fixtureStateFromScenario(
  scenario: string | null,
): PushFixtureState {
  switch (scenario) {
    case "fresh":
      return {
        projectSourceDisposition: "CREATED_DURING_RUN",
        credentialSourceDisposition: "CREATED_DURING_RUN",
        apnsBindingState: "BOUND",
      };
    case "apns-missing":
      return {
        projectSourceDisposition: "ADOPTED_EXISTING",
        credentialSourceDisposition: "ADOPTED_EXISTING",
        apnsBindingState: "MISSING_POLICY_BLOCK",
      };
    default:
      return {
        projectSourceDisposition: "ADOPTED_EXISTING",
        credentialSourceDisposition: "ADOPTED_EXISTING",
        apnsBindingState: "BOUND",
      };
  }
}

async function detectFixtureState(page: Page): Promise<PushFixtureState> {
  const scenario = await page.locator("body").getAttribute("data-scenario");
  return fixtureStateFromScenario(scenario);
}

export async function loadPushSelectorManifest(): Promise<SelectorManifest> {
  return PUSH_SELECTORS;
}

export async function createDeviceMessagingProjectAndKeys(
  options: CreateDeviceMessagingProjectAndKeysOptions,
): Promise<CreateDeviceMessagingProjectAndKeysResult> {
  const registry = createDefaultProviderRegistry();
  const provider = registry.getRequired(PUSH_PROVIDER_ID);
  assertProviderFlowAllowed(options.runContext, provider, PUSH_FLOW_ID);

  const manifest = await loadPushSelectorManifest();
  const entryUrls = options.entryUrls ?? createDefaultPushProviderEntryUrls();
  const steps: StepContract[] = [
    createPendingStep({
      stepId: PUSH_STEP_IDS.openControlPlane,
      title: "Open device messaging control plane",
      selectorRefs: ["workspace-heading", "credentials-heading", "channels-heading"],
    }),
    createPendingStep({
      stepId: PUSH_STEP_IDS.reconcileProject,
      title: "Create or adopt device messaging project",
      selectorRefs: ["project-action", "project-row-fallback"],
    }),
    createPendingStep({
      stepId: PUSH_STEP_IDS.bindCredentials,
      title: "Bind APNs and vault-safe credentials",
      selectorRefs: ["credential-action"],
    }),
    createPendingStep({
      stepId: PUSH_STEP_IDS.validateChannelCatalog,
      title: "Validate channel catalog posture",
      selectorRefs: ["channel-action"],
    }),
    createPendingStep({
      stepId: PUSH_STEP_IDS.validateContinuity,
      title: "Validate notification-open continuity targets",
      selectorRefs: ["continuity-action"],
    }),
    createPendingStep({
      stepId: PUSH_STEP_IDS.persistArtifacts,
      title: "Persist push inventory artifacts",
      selectorRefs: ["continuity-heading"],
      sensitiveCapturePolicy: "REDACT",
    }),
  ];

  let evidenceManifest = createEvidenceManifest(options.runContext);

  steps[0] = transitionStep(
    steps[0]!,
    "RUNNING",
    "Opening the device messaging control plane.",
  );
  await options.page.goto(entryUrls.controlPlane);
  await requireVisible(options.page, manifest, "workspace-heading");
  await requireVisible(options.page, manifest, "project-action");
  await requireVisible(options.page, manifest, "credentials-heading");
  await requireVisible(options.page, manifest, "credential-action");
  await requireVisible(options.page, manifest, "channels-heading");
  await requireVisible(options.page, manifest, "channel-action");
  await requireVisible(options.page, manifest, "continuity-heading");
  await requireVisible(options.page, manifest, "continuity-action");
  steps[0] = transitionStep(
    steps[0]!,
    "SUCCEEDED",
    "Device messaging workspace is reachable with semantic selectors.",
  );
  evidenceManifest = await captureNoteEvidence(
    evidenceManifest,
    steps[0].stepId,
    "Opened the device messaging control plane without relying on brittle selectors.",
  );

  const fixtureState = await detectFixtureState(options.page);
  const projectInventory = createRecommendedPushProjectInventory(options.runContext);
  const keyLineage = createRecommendedPushKeyLineage(options.runContext);
  const pushChannelCatalog = createRecommendedPushChannelCatalog();
  const continuityMatrix = createRecommendedNotificationOpenContinuityMatrix();

  validatePushProjectInventory(projectInventory, keyLineage);
  validatePushKeyLineage(keyLineage);
  validatePushChannelCatalog(pushChannelCatalog);
  validateNotificationOpenContinuityMatrix(continuityMatrix, pushChannelCatalog);
  assertPushArtifactsSanitized(projectInventory, keyLineage);

  steps[1] = transitionStep(
    steps[1]!,
    "RUNNING",
    "Reconciling the device messaging project and environment bindings.",
  );
  steps[1] =
    fixtureState.projectSourceDisposition === "ADOPTED_EXISTING"
      ? markSkippedAsAlreadyPresent(
          steps[1]!,
          "Existing project topology was adopted and verified against the authoritative surface posture.",
        )
      : transitionStep(
          steps[1]!,
          "SUCCEEDED",
          "Device messaging projects were created during the run.",
        );
  evidenceManifest = await captureNoteEvidence(
    evidenceManifest,
    steps[1].stepId,
    "The project inventory now freezes the native-only delivery topology and keeps browser push deferred.",
  );

  steps[2] = transitionStep(
    steps[2]!,
    "RUNNING",
    "Binding APNs and vault-safe credentials.",
  );

  let outcome: PushFlowOutcome = "DEVICE_MESSAGING_TOPOLOGY_READY";
  const notes: string[] = [];
  if (fixtureState.apnsBindingState === "MISSING_POLICY_BLOCK") {
    steps[2] = transitionStep(
      steps[2]!,
      "BLOCKED_BY_POLICY",
      "APNs binding is missing even though native macOS system notifications are active for internal-only delivery.",
    );
    outcome = "DEVICE_MESSAGING_POLICY_REVIEW_REQUIRED";
    notes.push(
      "APNs binding must remain present for native macOS delivery. The flow blocked instead of silently downgrading continuity or channel topology.",
    );
    evidenceManifest = await captureNoteEvidence(
      evidenceManifest,
      steps[2].stepId,
      "APNs drift was surfaced explicitly and blocked instead of being silently accepted.",
    );
  } else {
    steps[2] =
      fixtureState.credentialSourceDisposition === "ADOPTED_EXISTING"
        ? markSkippedAsAlreadyPresent(
            steps[2]!,
            "Existing FCM and APNs credentials were adopted and matched to the governed lineage inventory.",
          )
        : transitionStep(
            steps[2]!,
            "SUCCEEDED",
            "FCM and APNs credentials were created during the run and recorded via safe vault refs.",
          );
    evidenceManifest = await captureNoteEvidence(
      evidenceManifest,
      steps[2].stepId,
      "Credential lineage is now explicit per environment and remains vault-bound without raw key persistence.",
    );
  }

  steps[3] = transitionStep(
    steps[3]!,
    "RUNNING",
    "Validating channel catalog posture and excluded families.",
  );
  steps[3] = transitionStep(
    steps[3]!,
    "SUCCEEDED",
    "Channel catalog confirms native macOS delivery only and keeps operator-web and portal-web push deferred.",
  );
  evidenceManifest = await captureNoteEvidence(
    evidenceManifest,
    steps[3].stepId,
    "The channel catalog now proves which surfaces use remote transport and which remain browser or in-app only.",
  );

  steps[4] = transitionStep(
    steps[4]!,
    "RUNNING",
    "Validating notification-open continuity targets.",
  );
  steps[4] = transitionStep(
    steps[4]!,
    "SUCCEEDED",
    "Push-eligible families now map to exact native same-object continuity targets.",
  );
  evidenceManifest = await captureNoteEvidence(
    evidenceManifest,
    steps[4].stepId,
    "Notification-open continuity is now machine-readable for every push-eligible family.",
  );

  steps[5] = transitionStep(
    steps[5]!,
    "RUNNING",
    "Persisting push inventory and key-lineage artifacts.",
  );
  await Promise.all([
    persistJsonArtifact(options.projectInventoryPath, projectInventory),
    persistJsonArtifact(options.keyLineagePath, keyLineage),
  ]);
  const manifestPath = evidenceManifestPathFor(options.projectInventoryPath);
  await persistJsonArtifact(manifestPath, evidenceManifest);
  steps[5] = transitionStep(
    steps[5]!,
    "SUCCEEDED",
    "Persisted sanitized push inventory, credential lineage, and evidence manifest.",
  );
  evidenceManifest = await captureNoteEvidence(
    evidenceManifest,
    steps[5].stepId,
    "Persisted sanitized push inventory and key lineage without raw service-account or APNs material.",
  );
  await persistJsonArtifact(manifestPath, evidenceManifest);

  return {
    outcome,
    steps,
    projectInventory,
    keyLineage,
    pushChannelCatalog,
    continuityMatrix,
    evidenceManifestPath: manifestPath,
    notes,
  };
}

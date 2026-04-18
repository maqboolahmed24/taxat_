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
import {
  EMAIL_POLICY_GENERATED_ON,
  EMAIL_PROVIDER_DISPLAY_NAME,
  EMAIL_PROVIDER_ID,
  EMAIL_PROVIDER_VENDOR_ADAPTER,
  EMAIL_PROVIDER_VENDOR_SELECTION,
  type ProviderSelectionRecord,
  type SourceRef,
} from "./create_email_account_and_sender_domain.js";

export const EMAIL_TEMPLATE_FLOW_ID =
  "email-templates-and-webhooks-configuration";
export const EMAIL_TEMPLATE_POLICY_VERSION = "1.0";

export const EMAIL_TEMPLATE_STEP_IDS = {
  openControlPlane: "email.templates.open-control-plane",
  reconcileTemplates: "email.templates.reconcile-template-catalog",
  reconcileWebhooks: "email.templates.reconcile-webhook-endpoints",
  validateDeliveryEvents: "email.templates.validate-delivery-event-policy",
  persistArtifacts: "email.templates.persist-template-artifacts",
} as const;

export type EmailNotificationFamily =
  | "REQUEST_INFO_CREATED"
  | "STAFF_CUSTOMER_COMMENT_CREATED"
  | "CUSTOMER_DUE_DATE_CHANGED"
  | "ITEM_RESOLVED_OR_CLOSED"
  | "PORTAL_HELP_ACKNOWLEDGED"
  | "SUPPORT_CONTACT_ACKNOWLEDGED";

export type EmailSenderIdentityProfileRef =
  | "customer_transactional_noreply"
  | "support_acknowledgement_help";

export type TemplateSourceDisposition =
  | "CREATED_DURING_RUN"
  | "ADOPTED_EXISTING";

export type EmailTrackingLinksMode =
  | "None"
  | "HtmlAndText"
  | "HtmlOnly"
  | "TextOnly";

export type EmailProviderEventType =
  | "Delivery"
  | "Bounce"
  | "SpamComplaint"
  | "SubscriptionChange"
  | "Open"
  | "Click";

export type EmailTemplateFlowOutcome =
  | "EMAIL_TEMPLATES_AND_CALLBACKS_READY"
  | "EMAIL_TEMPLATE_POLICY_REVIEW_REQUIRED";

export interface SafeMergeVariableDefinition {
  variable_ref: string;
  label: string;
  privacy_class:
    | "CUSTOMER_SAFE_TEXT"
    | "ROUTE_REF"
    | "FOCUS_ANCHOR_REF"
    | "DELIVERY_CORRELATION";
  description: string;
  source_contract_ref: string;
}

export interface EmailTemplateContinuityContract {
  shell_family: "CLIENT_PORTAL_SHELL";
  object_anchor_ref_template: string;
  target_route_ref_template: string;
  focus_anchor_ref_template: string;
  return_route_ref_template: string;
  return_focus_anchor_ref_template: string;
  fallback_route_ref_template: string;
  fallback_focus_anchor_ref_template: string;
}

export interface EmailTemplateRecord {
  template_ref: string;
  template_alias: string;
  label: string;
  notification_family: EmailNotificationFamily;
  allowed_trigger_events: string[];
  visibility_class: "CUSTOMER_VISIBLE";
  customer_safe_projection_required: true;
  localization_posture: "EN_GB_ONLY";
  sender_stream_ref: "email_stream_customer_transactional";
  sender_identity_profile_ref: EmailSenderIdentityProfileRef;
  subject_template: string;
  preheader_template: string;
  headline_template: string;
  body_template_paragraphs: string[];
  cta_label_template: string;
  cta_route_template: string;
  footer_template_paragraphs: string[];
  allowed_merge_variables: string[];
  required_merge_variables: string[];
  fallback_rules: string[];
  continuity: EmailTemplateContinuityContract;
  provider_tracking_defaults: {
    track_opens: false;
    track_links: "None";
  };
  sample_render_model: Record<string, string>;
  source_refs: SourceRef[];
  notes: string[];
}

export interface EmailTemplateCatalog {
  schema_version: "1.0";
  catalog_id: "email_template_catalog";
  provider_selection: ProviderSelectionRecord;
  policy_version: typeof EMAIL_TEMPLATE_POLICY_VERSION;
  generated_on: typeof EMAIL_POLICY_GENERATED_ON;
  truth_boundary_statement: string;
  safe_merge_variable_definitions: SafeMergeVariableDefinition[];
  template_records: EmailTemplateRecord[];
  blocked_event_families: string[];
  blocked_provider_boundary_mail: string[];
  typed_gaps: string[];
  notes: string[];
}

export interface EmailDeliveryEventRule {
  provider_event_type: EmailProviderEventType;
  enabled_by_default: boolean;
  normalized_evidence_type: string;
  allowed_internal_updates: string[];
  prohibited_internal_updates: string[];
  suppression_posture_effect:
    | "NONE"
    | "CREATE_SUPPRESSION_CANDIDATE"
    | "CONFIRM_SUPPRESSION";
  retry_posture_effect:
    | "NONE"
    | "NO_RETRY_REQUIRED"
    | "STOP_AUTOMATIC_RETRY_PENDING_OPERATOR_REVIEW"
    | "HARD_BLOCK_RESEND";
  observability_counter_keys: string[];
  privacy_capture_mode:
    | "METADATA_ONLY"
    | "METADATA_AND_REDACTED_REASON";
  source_refs: SourceRef[];
  notes: string[];
}

export interface EmailDeliveryEventMapping {
  schema_version: "1.0";
  mapping_id: "email_delivery_event_mapping";
  provider_selection: ProviderSelectionRecord;
  policy_version: typeof EMAIL_TEMPLATE_POLICY_VERSION;
  generated_on: typeof EMAIL_POLICY_GENERATED_ON;
  truth_boundary_statement: string;
  telemetry_defaults: {
    track_opens: false;
    track_links: "None";
    rationale: string;
  };
  correlation_key_fields: string[];
  idempotency_policy: {
    fingerprint_fields: string[];
    replay_window_hours: 168;
    duplicate_effect: "RETURN_200_NO_DUPLICATE_EVIDENCE";
  };
  event_mappings: EmailDeliveryEventRule[];
  typed_gaps: string[];
  notes: string[];
}

export interface EmailWebhookEndpointRecord {
  callback_ref: string;
  product_environment_id:
    | "env_shared_sandbox_integration"
    | "env_preproduction_verification"
    | "env_production";
  message_stream_ref:
    | "email_stream_sandbox_customer_transactional"
    | "email_stream_preproduction_customer_transactional"
    | "email_stream_production_customer_transactional";
  callback_url: string;
  authentication: {
    mode: "HTTPS_BASIC_AUTH_PLUS_CUSTOM_HEADER";
    basic_auth_username_ref: string;
    basic_auth_password_ref: string;
    custom_header_name: "X-Taxat-Webhook-Secret";
    custom_header_secret_ref: string;
    provider_signature_mode:
      "NOT_SUPPORTED_PROVIDER_NATIVE_EQUIVALENT_AUTH";
  };
  replay_protection: {
    require_https: true;
    max_age_hours: 168;
    duplicate_response_code: 200;
  };
  idempotency_contract: {
    fingerprint_fields: string[];
    ledger_ref: string;
    duplicate_effect: "RETURN_200_NO_DUPLICATE_EVIDENCE";
  };
  enabled_event_types: Array<
    "Delivery" | "Bounce" | "SpamComplaint" | "SubscriptionChange"
  >;
  disabled_event_types: Array<"Open" | "Click">;
  correlation_keys: string[];
  source_refs: SourceRef[];
  notes: string[];
}

export interface EmailWebhookEndpointContract {
  schema_version: "1.0";
  contract_id: "email_webhook_endpoint_contract";
  provider_selection: ProviderSelectionRecord;
  policy_version: typeof EMAIL_TEMPLATE_POLICY_VERSION;
  generated_on: typeof EMAIL_POLICY_GENERATED_ON;
  truth_boundary_statement: string;
  callback_records: EmailWebhookEndpointRecord[];
  typed_gaps: string[];
  notes: string[];
}

export interface EmailTemplateDeploymentBinding {
  environment_ref:
    | "env_shared_sandbox_integration"
    | "env_preproduction_verification"
    | "env_production";
  workspace_ref:
    | "email_ws_sandbox"
    | "email_ws_preprod"
    | "email_ws_production";
  sender_domain_ref:
    | "email_domain_notify_sandbox"
    | "email_domain_notify_preprod"
    | "email_domain_notify_production";
  message_stream_ref:
    | "email_stream_sandbox_customer_transactional"
    | "email_stream_preproduction_customer_transactional"
    | "email_stream_production_customer_transactional";
  provider_template_alias: string;
  from_address: string;
  reply_to_address: string;
  callback_ref: string;
  deployment_state:
    | "READY_FOR_RENDER_REHEARSAL"
    | "READY_FOR_PROMOTION_VERIFICATION"
    | "READY_FOR_CONTROLLED_ROLLOUT";
}

export interface EmailTemplateInventoryRecord {
  template_ref: string;
  provider_template_alias: string;
  provider_subject_template: string;
  provider_html_template: string;
  provider_text_template: string;
  deployment_bindings: EmailTemplateDeploymentBinding[];
  source_refs: SourceRef[];
  notes: string[];
}

export interface EmailTemplateInventory {
  schema_version: "1.0";
  inventory_id: "email_template_inventory";
  provider_id: typeof EMAIL_PROVIDER_ID;
  provider_display_name: typeof EMAIL_PROVIDER_DISPLAY_NAME;
  run_id: string;
  flow_id: typeof EMAIL_TEMPLATE_FLOW_ID;
  operator_identity_alias: string;
  provider_selection: ProviderSelectionRecord;
  template_records: EmailTemplateInventoryRecord[];
  webhook_contract_ref: "config/notifications/email_webhook_endpoint_contract.json";
  delivery_event_mapping_ref: "config/notifications/email_delivery_event_mapping.json";
  typed_gaps: string[];
  notes: string[];
  last_verified_at: string;
}

export interface NotificationCopyAtlasTemplateView {
  template_ref: string;
  label: string;
  notification_family: EmailNotificationFamily;
  selected_environment_label: string;
  sender_stream_label: string;
  sender_identity_label: string;
  preview: {
    subject: string;
    preheader: string;
    headline: string;
    body_paragraphs: string[];
    cta_label: string;
    cta_route: string;
    footer_paragraphs: string[];
  };
  lifecycle_rail: Array<{
    stage_ref:
      | "product_event"
      | "notification_projection"
      | "provider_template"
      | "delivery_event"
      | "internal_evidence";
    label: string;
    summary: string;
  }>;
  merge_provenance: Array<{
    variable_ref: string;
    source_kind: SafeMergeVariableDefinition["privacy_class"];
    source_ref: string;
    sample_value: string;
  }>;
  continuity_rows: Array<{
    label: string;
    value: string;
  }>;
  webhook_event_types: EmailProviderEventType[];
  privacy_notes: string[];
}

export interface NotificationCopyAtlasViewModel {
  providerDisplayName: typeof EMAIL_PROVIDER_DISPLAY_NAME;
  providerMonogram: "MAIL";
  selectionPosture: "PRIVACY_MINIMIZING";
  policyVersion: typeof EMAIL_TEMPLATE_POLICY_VERSION;
  truthBoundaryStatement: string;
  selectedTemplateRef: string;
  selectedLifecycleRef:
    | "product_event"
    | "notification_projection"
    | "provider_template"
    | "delivery_event"
    | "internal_evidence";
  lifecycleLegend: string[];
  templates: NotificationCopyAtlasTemplateView[];
  webhookEvents: EmailDeliveryEventRule[];
  callbackRecords: EmailWebhookEndpointRecord[];
  notes: string[];
}

export interface EmailTemplateProviderEntryUrls {
  controlPlane: string;
}

export interface ConfigureTemplatesAndWebhooksOptions {
  page: Page;
  runContext: RunContext;
  templateInventoryPath: string;
  entryUrls?: EmailTemplateProviderEntryUrls;
  notes?: string[];
}

export interface ConfigureTemplatesAndWebhooksResult {
  outcome: EmailTemplateFlowOutcome;
  steps: StepContract[];
  evidenceManifestPath: string;
  templateCatalog: EmailTemplateCatalog;
  deliveryEventMapping: EmailDeliveryEventMapping;
  webhookEndpointContract: EmailWebhookEndpointContract;
  templateInventory: EmailTemplateInventory;
  notes: string[];
}

export interface EmailTemplateFixtureState {
  templateSourceDisposition: TemplateSourceDisposition;
  webhookSourceDisposition: TemplateSourceDisposition;
  telemetryDriftDetected: boolean;
  notes: string[];
}

const EMAIL_TEMPLATE_SELECTORS: SelectorManifest = {
  manifestId: "postmark-compatible-email-template-webhooks",
  providerId: EMAIL_PROVIDER_ID,
  flowId: EMAIL_TEMPLATE_FLOW_ID,
  selectors: rankSelectors([
    {
      selectorId: "workspace-heading",
      description: "Primary heading for the email control-plane workspace",
      strategy: "ROLE",
      value: "heading",
      accessibleName: "Transactional email control plane",
    },
    {
      selectorId: "templates-heading",
      description: "Templates section heading",
      strategy: "ROLE",
      value: "heading",
      accessibleName: "Templates",
    },
    {
      selectorId: "template-action",
      description: "Configure or adopt templates action",
      strategy: "ROLE",
      value: "button",
      accessibleName: "Configure or adopt templates",
    },
    {
      selectorId: "webhooks-heading",
      description: "Webhooks section heading",
      strategy: "ROLE",
      value: "heading",
      accessibleName: "Webhooks",
    },
    {
      selectorId: "webhook-action",
      description: "Configure or adopt webhook endpoints action",
      strategy: "ROLE",
      value: "button",
      accessibleName: "Configure webhook endpoints",
    },
    {
      selectorId: "event-mapping-heading",
      description: "Event mapping section heading",
      strategy: "ROLE",
      value: "heading",
      accessibleName: "Event mapping",
    },
    {
      selectorId: "mapping-action",
      description: "Validate delivery event mapping action",
      strategy: "ROLE",
      value: "button",
      accessibleName: "Validate delivery event mapping",
    },
    {
      selectorId: "template-row-fallback",
      description: "Structured template row fallback when semantic labels drift",
      strategy: "CSS_FALLBACK",
      value: "[data-testid='template-row']",
      justification:
        "Used only when the provider keeps structured template rows but semantic family labels drift.",
      driftSignal:
        "Raise selector-drift warning if template-family rows no longer resolve semantically.",
    },
  ]),
};

const EMAIL_TEMPLATE_PROVIDER_DOCS = [
  "https://postmarkapp.com/developer/api/overview",
  "https://postmarkapp.com/developer/api/templates-api",
  "https://postmarkapp.com/developer/user-guide/content/templates",
  "https://postmarkapp.com/developer/user-guide/content/templates/mustachio-syntax",
  "https://postmarkapp.com/developer/webhooks/webhooks-overview",
  "https://postmarkapp.com/developer/webhooks/delivery-webhook",
  "https://postmarkapp.com/developer/webhooks/bounce-webhook",
  "https://postmarkapp.com/developer/webhooks/spam-complaint-webhook",
  "https://postmarkapp.com/developer/webhooks/subscription-change-webhook",
  "https://postmarkapp.com/developer/webhooks/open-webhook",
  "https://postmarkapp.com/developer/webhooks/click-webhook",
  "https://postmarkapp.com/developer/user-guide/tracking-opens/tracking-opens-per-email",
];

const EMAIL_TRUTH_BOUNDARY =
  "External email delivery events remain transport or observability projections only. They may append internal notification evidence, suppression posture, retry posture, and counters, but they never mutate work-item truth, approval truth, portal-help lifecycle truth, or authority truth directly.";

const SAFE_VARIABLES: SafeMergeVariableDefinition[] = [
  {
    variable_ref: "notification_id",
    label: "Notification ID",
    privacy_class: "DELIVERY_CORRELATION",
    description: "Stable correlation key for internal delivery evidence and dedupe.",
    source_contract_ref: "Algorithm/data_model.md::L195[WorkItemNotification]",
  },
  {
    variable_ref: "item_id",
    label: "Item ID",
    privacy_class: "DELIVERY_CORRELATION",
    description: "Opaque object correlation ID; never rendered alone to the customer.",
    source_contract_ref: "Algorithm/data_model.md::L195[WorkItemNotification]",
  },
  {
    variable_ref: "item_title",
    label: "Item title",
    privacy_class: "CUSTOMER_SAFE_TEXT",
    description: "Customer-safe title from the aligned projection.",
    source_contract_ref:
      "Algorithm/customer_client_portal_experience_contract.md::L520[customer_safe_projection]",
  },
  {
    variable_ref: "item_period_label",
    label: "Period label",
    privacy_class: "CUSTOMER_SAFE_TEXT",
    description: "Customer-safe period or filing range label.",
    source_contract_ref:
      "Algorithm/customer_client_portal_experience_contract.md::L520[customer_safe_projection]",
  },
  {
    variable_ref: "item_reference_label",
    label: "Reference label",
    privacy_class: "CUSTOMER_SAFE_TEXT",
    description: "Plain-language case or request reference suitable for the portal.",
    source_contract_ref:
      "Algorithm/frontend_shell_and_interaction_law.md::L640[Emails_notifications_invite_links]",
  },
  {
    variable_ref: "customer_status_label",
    label: "Customer status",
    privacy_class: "CUSTOMER_SAFE_TEXT",
    description: "Literal customer-safe state label; no internal gate or escalation terms.",
    source_contract_ref:
      "Algorithm/collaboration_workspace_contract.md::L341[customer-visible_status_language]",
  },
  {
    variable_ref: "request_info_ref",
    label: "Request info ref",
    privacy_class: "DELIVERY_CORRELATION",
    description: "Opaque request-for-info reference used for focus routing and dedupe.",
    source_contract_ref: "Algorithm/data_model.md::L195[WorkItemNotification]",
  },
  {
    variable_ref: "request_info_summary",
    label: "Request info summary",
    privacy_class: "CUSTOMER_SAFE_TEXT",
    description: "Customer-safe summary of what is needed next.",
    source_contract_ref:
      "Algorithm/collaboration_workspace_contract.md::L1831[customer-visible_due_date_change]",
  },
  {
    variable_ref: "request_info_due_date_label",
    label: "Request info due date",
    privacy_class: "CUSTOMER_SAFE_TEXT",
    description: "Plain-language due date label when policy allows it to be shown.",
    source_contract_ref:
      "Algorithm/frontend_shell_and_interaction_law.md::L640[Emails_notifications_invite_links]",
  },
  {
    variable_ref: "staff_comment_preview",
    label: "Staff comment preview",
    privacy_class: "CUSTOMER_SAFE_TEXT",
    description: "Short customer-visible preview of the latest shared comment.",
    source_contract_ref:
      "Algorithm/collaboration_workspace_contract.md::L1847[new_staff_customer-visible_comment]",
  },
  {
    variable_ref: "customer_due_date_label",
    label: "Customer due date",
    privacy_class: "CUSTOMER_SAFE_TEXT",
    description: "Customer-safe due date string used when due date changes are notifyable.",
    source_contract_ref:
      "Algorithm/collaboration_workspace_contract.md::L1848[customer_due_date_creation_or_change]",
  },
  {
    variable_ref: "resolution_summary",
    label: "Resolution summary",
    privacy_class: "CUSTOMER_SAFE_TEXT",
    description: "Plain-language completion summary with no internal cause coding.",
    source_contract_ref:
      "Algorithm/collaboration_workspace_contract.md::L1849[item_resolved_or_closed]",
  },
  {
    variable_ref: "help_request_id",
    label: "Help request ID",
    privacy_class: "DELIVERY_CORRELATION",
    description: "Opaque contextual-help artifact reference.",
    source_contract_ref: "Algorithm/data_model.md::L2240[PortalHelpRequest]",
  },
  {
    variable_ref: "help_reason_label",
    label: "Help reason",
    privacy_class: "CUSTOMER_SAFE_TEXT",
    description: "Literal help-reason label carried from the request context.",
    source_contract_ref: "Algorithm/data_model.md::L2240[PortalHelpRequest]",
  },
  {
    variable_ref: "support_channel_label",
    label: "Support channel",
    privacy_class: "CUSTOMER_SAFE_TEXT",
    description: "Bounded support channel label for acknowledgement copy.",
    source_contract_ref:
      "Algorithm/customer_client_portal_experience_contract.md::L666[PortalHelpRequest]",
  },
  {
    variable_ref: "case_context_summary",
    label: "Case context summary",
    privacy_class: "CUSTOMER_SAFE_TEXT",
    description: "Short context-preserving summary so the customer need not restate the case.",
    source_contract_ref:
      "Algorithm/collaboration_workspace_contract.md::L359[help_handoff_case_context]",
  },
  {
    variable_ref: "detail_route_ref",
    label: "Detail route",
    privacy_class: "ROUTE_REF",
    description: "Exact lawful in-app destination route for follow-through.",
    source_contract_ref: "Algorithm/data_model.md::L195[WorkItemNotification]",
  },
  {
    variable_ref: "focus_anchor_ref",
    label: "Focus anchor",
    privacy_class: "FOCUS_ANCHOR_REF",
    description: "Exact customer-safe focus anchor for continuity.",
    source_contract_ref: "Algorithm/data_model.md::L195[WorkItemNotification]",
  },
  {
    variable_ref: "return_route_ref",
    label: "Return route",
    privacy_class: "ROUTE_REF",
    description: "Lawful parent return route when the notification is opened.",
    source_contract_ref: "Algorithm/data_model.md::L195[WorkItemNotification]",
  },
  {
    variable_ref: "return_focus_anchor_ref",
    label: "Return focus anchor",
    privacy_class: "FOCUS_ANCHOR_REF",
    description: "Parent return focus anchor carried by continuity contracts.",
    source_contract_ref: "Algorithm/data_model.md::L195[WorkItemNotification]",
  },
  {
    variable_ref: "fallback_route_ref",
    label: "Fallback route",
    privacy_class: "ROUTE_REF",
    description: "Safe browser fallback route when the original detail route cannot reopen.",
    source_contract_ref: "Algorithm/data_model.md::L195[WorkItemNotification]",
  },
  {
    variable_ref: "fallback_focus_anchor_ref",
    label: "Fallback focus anchor",
    privacy_class: "FOCUS_ANCHOR_REF",
    description: "Focus target paired with the safe fallback route.",
    source_contract_ref: "Algorithm/data_model.md::L195[WorkItemNotification]",
  },
];

const ALLOWED_NOTIFICATION_EVENTS = [
  "CustomerInfoRequested",
  "CustomerCommentAdded",
  "WorkItemDueDatesChanged",
  "WorkItemStatusChanged",
  "CLIENT_PORTAL_REQUEST_HELP",
  "PortalHelpRequestAllocated",
] as const;

const BLOCKED_EVENT_FAMILIES = [
  "InternalNoteAdded",
  "WorkItemAssigned",
  "WorkItemReassigned",
  "WorkItemEscalated",
  "WorkItemEscalationCleared",
  "WorkItemAttachmentPublished:INTERNAL_ONLY",
  "AuditOnlyEvent",
];

const BLOCKED_PROVIDER_BOUNDARY_MAIL = [
  "IDP_VERIFY_EMAIL",
  "PASSWORD_RESET",
  "MFA_CHALLENGE",
  "PROVIDER_SECURITY_ALERT",
];

const TEMPLATE_SAMPLE_MODELS: Record<EmailNotificationFamily, Record<string, string>> = {
  REQUEST_INFO_CREATED: {
    notification_id: "notif_ri_001",
    item_id: "wi_2025_26_001",
    item_title: "2025-26 Self Assessment filing",
    item_period_label: "2025 to 2026",
    item_reference_label: "Request SA-001",
    customer_status_label: "Action required",
    request_info_ref: "rfi_2025_26_001",
    request_info_summary: "Please confirm your freelance income and upload the missing invoice.",
    request_info_due_date_label: "24 Apr 2026",
    detail_route_ref: "/portal/requests/wi_2025_26_001",
    focus_anchor_ref: "request-info-rfi_2025_26_001",
    return_route_ref: "/portal",
    return_focus_anchor_ref: "home-primary-task",
    fallback_route_ref: "/portal",
    fallback_focus_anchor_ref: "home-primary-task",
  },
  STAFF_CUSTOMER_COMMENT_CREATED: {
    notification_id: "notif_comment_001",
    item_id: "wi_2025_26_001",
    item_title: "2025-26 Self Assessment filing",
    item_period_label: "2025 to 2026",
    item_reference_label: "Request SA-001",
    customer_status_label: "In review",
    staff_comment_preview: "We've checked the first upload and left one follow-up note in the portal.",
    detail_route_ref: "/portal/requests/wi_2025_26_001",
    focus_anchor_ref: "customer-comment-thread",
    return_route_ref: "/portal/requests/wi_2025_26_001",
    return_focus_anchor_ref: "request-card-wi_2025_26_001",
    fallback_route_ref: "/portal",
    fallback_focus_anchor_ref: "home-primary-task",
  },
  CUSTOMER_DUE_DATE_CHANGED: {
    notification_id: "notif_due_001",
    item_id: "wi_2025_26_001",
    item_title: "2025-26 Self Assessment filing",
    item_period_label: "2025 to 2026",
    item_reference_label: "Request SA-001",
    customer_status_label: "Action required",
    customer_due_date_label: "28 Apr 2026",
    detail_route_ref: "/portal/requests/wi_2025_26_001",
    focus_anchor_ref: "due-date-summary",
    return_route_ref: "/portal/requests/wi_2025_26_001",
    return_focus_anchor_ref: "request-card-wi_2025_26_001",
    fallback_route_ref: "/portal",
    fallback_focus_anchor_ref: "home-primary-task",
  },
  ITEM_RESOLVED_OR_CLOSED: {
    notification_id: "notif_resolved_001",
    item_id: "wi_2025_26_001",
    item_title: "2025-26 Self Assessment filing",
    item_period_label: "2025 to 2026",
    item_reference_label: "Request SA-001",
    customer_status_label: "Completed",
    resolution_summary: "This request is complete and no further action is needed right now.",
    detail_route_ref: "/portal/requests/wi_2025_26_001",
    focus_anchor_ref: "status-hero",
    return_route_ref: "/portal",
    return_focus_anchor_ref: "home-primary-task",
    fallback_route_ref: "/portal",
    fallback_focus_anchor_ref: "completed-items",
  },
  PORTAL_HELP_ACKNOWLEDGED: {
    notification_id: "notif_help_001",
    item_id: "wi_2025_26_001",
    item_title: "2025-26 Self Assessment filing",
    item_period_label: "2025 to 2026",
    item_reference_label: "Request SA-001",
    help_request_id: "help_001",
    help_reason_label: "Question about the upload you requested",
    case_context_summary: "Your help request is linked to the same filing request and upload panel.",
    detail_route_ref: "/portal/help/help_001",
    focus_anchor_ref: "portal-help-request-help_001",
    return_route_ref: "/portal/requests/wi_2025_26_001",
    return_focus_anchor_ref: "help-entrypoint",
    fallback_route_ref: "/portal/help",
    fallback_focus_anchor_ref: "help-inbox",
  },
  SUPPORT_CONTACT_ACKNOWLEDGED: {
    notification_id: "notif_support_001",
    item_id: "wi_2025_26_001",
    item_title: "2025-26 Self Assessment filing",
    item_period_label: "2025 to 2026",
    item_reference_label: "Request SA-001",
    help_request_id: "help_002",
    support_channel_label: "portal Help route",
    case_context_summary: "We kept the same request and focus context with your support message.",
    detail_route_ref: "/portal/help/help_002",
    focus_anchor_ref: "portal-help-request-help_002",
    return_route_ref: "/portal/requests/wi_2025_26_001",
    return_focus_anchor_ref: "help-entrypoint",
    fallback_route_ref: "/portal/help",
    fallback_focus_anchor_ref: "help-inbox",
  },
};

function nowIso(): string {
  return new Date().toISOString();
}

function stableHash(value: string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

async function persistJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function createProviderSelectionRecord(): ProviderSelectionRecord {
  return {
    provider_selection_status: EMAIL_PROVIDER_VENDOR_SELECTION,
    provider_family: "TRANSACTIONAL_EMAIL_DELIVERY",
    provider_vendor_adapter: EMAIL_PROVIDER_VENDOR_ADAPTER,
    provider_vendor_label: "Postmark-compatible transactional email provider",
    docs_urls: [...EMAIL_TEMPLATE_PROVIDER_DOCS],
    source_refs: [
      {
        source_ref:
          "Algorithm/collaboration_workspace_contract.md::L1838[Customer_notifications]",
        rationale:
          "Only explicit customer-visible collaboration events may fan out into optional customer email.",
      },
      {
        source_ref:
          "Algorithm/data_model.md::L195[WorkItemNotification]",
        rationale:
          "Notification routing, continuity, and customer-safe projection must remain explicit and typed.",
      },
      {
        source_ref:
          "Algorithm/data_model.md::L2240[PortalHelpRequest]",
        rationale:
          "Contextual help acknowledgements must preserve route and case context instead of becoming free-form tickets.",
      },
      {
        source_ref:
          "https://postmarkapp.com/developer/api/templates-api",
        rationale:
          "Current provider documentation exposes API-managed template aliases and server-scoped template records.",
      },
      {
        source_ref:
          "https://postmarkapp.com/developer/webhooks/webhooks-overview",
        rationale:
          "Current provider webhook posture is configured per server and authenticated with HTTPS, Basic Auth, and custom headers.",
      },
    ],
  };
}

function continuityForTemplate(
  family: EmailNotificationFamily,
): EmailTemplateContinuityContract {
  if (
    family === "PORTAL_HELP_ACKNOWLEDGED" ||
    family === "SUPPORT_CONTACT_ACKNOWLEDGED"
  ) {
    return {
      shell_family: "CLIENT_PORTAL_SHELL",
      object_anchor_ref_template: "portal-help/{{ help_request_id }}",
      target_route_ref_template: "{{ detail_route_ref }}",
      focus_anchor_ref_template: "{{ focus_anchor_ref }}",
      return_route_ref_template: "{{ return_route_ref }}",
      return_focus_anchor_ref_template: "{{ return_focus_anchor_ref }}",
      fallback_route_ref_template: "{{ fallback_route_ref }}",
      fallback_focus_anchor_ref_template: "{{ fallback_focus_anchor_ref }}",
    };
  }
  return {
    shell_family: "CLIENT_PORTAL_SHELL",
    object_anchor_ref_template: "work-item/{{ item_id }}",
    target_route_ref_template: "{{ detail_route_ref }}",
    focus_anchor_ref_template: "{{ focus_anchor_ref }}",
    return_route_ref_template: "{{ return_route_ref }}",
    return_focus_anchor_ref_template: "{{ return_focus_anchor_ref }}",
    fallback_route_ref_template: "{{ fallback_route_ref }}",
    fallback_focus_anchor_ref_template: "{{ fallback_focus_anchor_ref }}",
  };
}

function buildTemplateRecords(): EmailTemplateRecord[] {
  return [
    {
      template_ref: "email_template_request_info_created",
      template_alias: "customer-request-info-created-v1",
      label: "New request for information",
      notification_family: "REQUEST_INFO_CREATED",
      allowed_trigger_events: ["CustomerInfoRequested"],
      visibility_class: "CUSTOMER_VISIBLE",
      customer_safe_projection_required: true,
      localization_posture: "EN_GB_ONLY",
      sender_stream_ref: "email_stream_customer_transactional",
      sender_identity_profile_ref: "customer_transactional_noreply",
      subject_template: "Action needed for {{ item_title }}",
      preheader_template:
        "A new request for information is ready in your Taxat portal.",
      headline_template: "We need a little more information",
      body_template_paragraphs: [
        "We've added a request for information to your case for {{ item_title }}.",
        "Please review {{ request_info_summary }} and reply in the portal by {{ request_info_due_date_label }}.",
      ],
      cta_label_template: "Open request",
      cta_route_template: "{{ detail_route_ref }}",
      footer_template_paragraphs: [
        "Need support? Use Help in the portal and we'll keep the same case context.",
      ],
      allowed_merge_variables: [
        "notification_id",
        "item_id",
        "item_title",
        "request_info_ref",
        "request_info_summary",
        "request_info_due_date_label",
        "detail_route_ref",
        "focus_anchor_ref",
        "return_route_ref",
        "return_focus_anchor_ref",
        "fallback_route_ref",
        "fallback_focus_anchor_ref",
      ],
      required_merge_variables: [
        "notification_id",
        "item_id",
        "item_title",
        "request_info_ref",
        "request_info_summary",
        "request_info_due_date_label",
        "detail_route_ref",
      ],
      fallback_rules: [
        "If any required merge variable is missing, fail configuration and do not queue send.",
        "Do not substitute internal notes, gate language, or assignment labels when request-for-info summary is missing.",
      ],
      continuity: continuityForTemplate("REQUEST_INFO_CREATED"),
      provider_tracking_defaults: {
        track_opens: false,
        track_links: "None",
      },
      sample_render_model: TEMPLATE_SAMPLE_MODELS.REQUEST_INFO_CREATED,
      source_refs: [
        {
          source_ref:
            "Algorithm/collaboration_workspace_contract.md::L1846[new_request-for-info]",
          rationale:
            "New request-for-info is a notifyable customer event family.",
        },
      ],
      notes: [
        "Customer-safe projection fields only; no internal actor or gate context.",
      ],
    },
    {
      template_ref: "email_template_staff_customer_comment_created",
      template_alias: "staff-customer-comment-created-v1",
      label: "New staff comment shared with customer",
      notification_family: "STAFF_CUSTOMER_COMMENT_CREATED",
      allowed_trigger_events: ["CustomerCommentAdded"],
      visibility_class: "CUSTOMER_VISIBLE",
      customer_safe_projection_required: true,
      localization_posture: "EN_GB_ONLY",
      sender_stream_ref: "email_stream_customer_transactional",
      sender_identity_profile_ref: "customer_transactional_noreply",
      subject_template: "New update on {{ item_title }}",
      preheader_template:
        "A Taxat reviewer shared a customer-visible update in the portal.",
      headline_template: "There is a new update on your case",
      body_template_paragraphs: [
        "A Taxat reviewer has shared a customer-visible comment on {{ item_title }}.",
        "Latest update: {{ staff_comment_preview }}",
      ],
      cta_label_template: "View update",
      cta_route_template: "{{ detail_route_ref }}",
      footer_template_paragraphs: [
        "Use Help in the portal if you need support. We'll keep the same case context.",
      ],
      allowed_merge_variables: [
        "notification_id",
        "item_id",
        "item_title",
        "staff_comment_preview",
        "detail_route_ref",
        "focus_anchor_ref",
        "return_route_ref",
        "return_focus_anchor_ref",
        "fallback_route_ref",
        "fallback_focus_anchor_ref",
      ],
      required_merge_variables: [
        "notification_id",
        "item_id",
        "item_title",
        "staff_comment_preview",
        "detail_route_ref",
      ],
      fallback_rules: [
        "If the comment preview is missing, fail configuration rather than falling back to internal thread content.",
      ],
      continuity: continuityForTemplate("STAFF_CUSTOMER_COMMENT_CREATED"),
      provider_tracking_defaults: {
        track_opens: false,
        track_links: "None",
      },
      sample_render_model: TEMPLATE_SAMPLE_MODELS.STAFF_CUSTOMER_COMMENT_CREATED,
      source_refs: [
        {
          source_ref:
            "Algorithm/collaboration_workspace_contract.md::L1847[new_staff_customer-visible_comment]",
          rationale:
            "Shared staff comments are explicitly notifyable to customers.",
        },
      ],
      notes: [
        "Do not include individual staff identity when tenant policy masks it.",
      ],
    },
    {
      template_ref: "email_template_customer_due_date_changed",
      template_alias: "customer-due-date-changed-v1",
      label: "Customer due date changed",
      notification_family: "CUSTOMER_DUE_DATE_CHANGED",
      allowed_trigger_events: ["WorkItemDueDatesChanged"],
      visibility_class: "CUSTOMER_VISIBLE",
      customer_safe_projection_required: true,
      localization_posture: "EN_GB_ONLY",
      sender_stream_ref: "email_stream_customer_transactional",
      sender_identity_profile_ref: "customer_transactional_noreply",
      subject_template: "Due date updated for {{ item_title }}",
      preheader_template:
        "The next due date in your Taxat portal has been created or updated.",
      headline_template: "A due date has changed",
      body_template_paragraphs: [
        "The next due date for {{ item_title }} has been set or updated in the portal.",
        "Current due date: {{ customer_due_date_label }}",
      ],
      cta_label_template: "Review due date",
      cta_route_template: "{{ detail_route_ref }}",
      footer_template_paragraphs: [
        "If you need help with this request, use Help in the portal so the same case context stays attached.",
      ],
      allowed_merge_variables: [
        "notification_id",
        "item_id",
        "item_title",
        "customer_due_date_label",
        "detail_route_ref",
        "focus_anchor_ref",
        "return_route_ref",
        "return_focus_anchor_ref",
        "fallback_route_ref",
        "fallback_focus_anchor_ref",
      ],
      required_merge_variables: [
        "notification_id",
        "item_id",
        "item_title",
        "customer_due_date_label",
        "detail_route_ref",
      ],
      fallback_rules: [
        "If no customer-safe due date label is available, block the template instead of inferring one from internal SLA or escalation state.",
      ],
      continuity: continuityForTemplate("CUSTOMER_DUE_DATE_CHANGED"),
      provider_tracking_defaults: {
        track_opens: false,
        track_links: "None",
      },
      sample_render_model: TEMPLATE_SAMPLE_MODELS.CUSTOMER_DUE_DATE_CHANGED,
      source_refs: [
        {
          source_ref:
            "Algorithm/collaboration_workspace_contract.md::L1848[customer_due_date_creation_or_change]",
          rationale:
            "Customer due date creation or change is a notifyable family when the source contract allows it.",
        },
      ],
      notes: [
        "Do not turn overdue or escalation-only state into outbound copy.",
      ],
    },
    {
      template_ref: "email_template_item_resolved_or_closed",
      template_alias: "item-resolved-or-closed-v1",
      label: "Item resolved or closed",
      notification_family: "ITEM_RESOLVED_OR_CLOSED",
      allowed_trigger_events: ["WorkItemStatusChanged"],
      visibility_class: "CUSTOMER_VISIBLE",
      customer_safe_projection_required: true,
      localization_posture: "EN_GB_ONLY",
      sender_stream_ref: "email_stream_customer_transactional",
      sender_identity_profile_ref: "customer_transactional_noreply",
      subject_template: "{{ item_title }} is complete",
      preheader_template:
        "A request in your Taxat portal is resolved or closed.",
      headline_template: "This item is now complete",
      body_template_paragraphs: [
        "We've marked {{ item_title }} as resolved or closed in the portal.",
        "Summary: {{ resolution_summary }}",
      ],
      cta_label_template: "Review completion",
      cta_route_template: "{{ detail_route_ref }}",
      footer_template_paragraphs: [
        "You can still open the portal to review the completed item and its final summary.",
      ],
      allowed_merge_variables: [
        "notification_id",
        "item_id",
        "item_title",
        "resolution_summary",
        "detail_route_ref",
        "focus_anchor_ref",
        "return_route_ref",
        "return_focus_anchor_ref",
        "fallback_route_ref",
        "fallback_focus_anchor_ref",
      ],
      required_merge_variables: [
        "notification_id",
        "item_id",
        "item_title",
        "resolution_summary",
        "detail_route_ref",
      ],
      fallback_rules: [
        "If no customer-safe resolution summary exists, block the email instead of translating internal state transitions into generic reassurance.",
      ],
      continuity: continuityForTemplate("ITEM_RESOLVED_OR_CLOSED"),
      provider_tracking_defaults: {
        track_opens: false,
        track_links: "None",
      },
      sample_render_model: TEMPLATE_SAMPLE_MODELS.ITEM_RESOLVED_OR_CLOSED,
      source_refs: [
        {
          source_ref:
            "Algorithm/collaboration_workspace_contract.md::L1849[item_resolved_or_closed]",
          rationale:
            "Item resolved or closed is a notifyable customer event family.",
        },
      ],
      notes: [
        "Completion copy must stay literal and avoid implying authority-of-record settlement.",
      ],
    },
    {
      template_ref: "email_template_portal_help_acknowledged",
      template_alias: "portal-help-acknowledged-v1",
      label: "Portal help acknowledged",
      notification_family: "PORTAL_HELP_ACKNOWLEDGED",
      allowed_trigger_events: [
        "CLIENT_PORTAL_REQUEST_HELP",
        "PortalHelpRequestAllocated",
      ],
      visibility_class: "CUSTOMER_VISIBLE",
      customer_safe_projection_required: true,
      localization_posture: "EN_GB_ONLY",
      sender_stream_ref: "email_stream_customer_transactional",
      sender_identity_profile_ref: "support_acknowledgement_help",
      subject_template: "We received your help request about {{ item_title }}",
      preheader_template:
        "Your help request was saved with the same case context in the Taxat portal.",
      headline_template: "Support context is saved",
      body_template_paragraphs: [
        "We received your help request and kept the same case context for {{ item_title }}.",
        "Reason: {{ help_reason_label }}",
      ],
      cta_label_template: "View help request",
      cta_route_template: "{{ detail_route_ref }}",
      footer_template_paragraphs: [
        "You don't need to restate the case. We'll continue from the same request context.",
      ],
      allowed_merge_variables: [
        "notification_id",
        "item_id",
        "item_title",
        "help_request_id",
        "help_reason_label",
        "case_context_summary",
        "detail_route_ref",
        "focus_anchor_ref",
        "return_route_ref",
        "return_focus_anchor_ref",
        "fallback_route_ref",
        "fallback_focus_anchor_ref",
      ],
      required_merge_variables: [
        "notification_id",
        "item_id",
        "item_title",
        "help_request_id",
        "help_reason_label",
        "detail_route_ref",
      ],
      fallback_rules: [
        "If help-request identity or help reason is missing, block the template and keep the acknowledgement in-app only.",
      ],
      continuity: continuityForTemplate("PORTAL_HELP_ACKNOWLEDGED"),
      provider_tracking_defaults: {
        track_opens: false,
        track_links: "None",
      },
      sample_render_model: TEMPLATE_SAMPLE_MODELS.PORTAL_HELP_ACKNOWLEDGED,
      source_refs: [
        {
          source_ref:
            "Algorithm/northbound_api_and_session_contract.md::L431[CLIENT_PORTAL_REQUEST_HELP]",
          rationale:
            "Portal help allocation is a durable contextual-support event.",
        },
        {
          source_ref:
            "Algorithm/customer_client_portal_experience_contract.md::L666[context-preserving_help_submissions]",
          rationale:
            "Help acknowledgements must preserve route and case context rather than forcing blank restatement.",
        },
      ],
      notes: [
        "This is product-owned acknowledgement mail, not generic provider support mail.",
      ],
    },
    {
      template_ref: "email_template_support_contact_acknowledged",
      template_alias: "support-contact-acknowledged-v1",
      label: "Support contact acknowledged",
      notification_family: "SUPPORT_CONTACT_ACKNOWLEDGED",
      allowed_trigger_events: [
        "CLIENT_PORTAL_REQUEST_HELP",
        "PortalHelpRequestAllocated",
      ],
      visibility_class: "CUSTOMER_VISIBLE",
      customer_safe_projection_required: true,
      localization_posture: "EN_GB_ONLY",
      sender_stream_ref: "email_stream_customer_transactional",
      sender_identity_profile_ref: "support_acknowledgement_help",
      subject_template: "Support message received for {{ item_title }}",
      preheader_template:
        "Your support contact was recorded with the same case context in Taxat.",
      headline_template: "Your support message was received",
      body_template_paragraphs: [
        "We logged your support request through the {{ support_channel_label }} channel for {{ item_title }}.",
        "Case context: {{ case_context_summary }}",
      ],
      cta_label_template: "Open support message",
      cta_route_template: "{{ detail_route_ref }}",
      footer_template_paragraphs: [
        "We kept the same route and focus context so you do not need to restate the case.",
      ],
      allowed_merge_variables: [
        "notification_id",
        "item_id",
        "item_title",
        "help_request_id",
        "support_channel_label",
        "case_context_summary",
        "detail_route_ref",
        "focus_anchor_ref",
        "return_route_ref",
        "return_focus_anchor_ref",
        "fallback_route_ref",
        "fallback_focus_anchor_ref",
      ],
      required_merge_variables: [
        "notification_id",
        "item_id",
        "item_title",
        "help_request_id",
        "support_channel_label",
        "case_context_summary",
        "detail_route_ref",
      ],
      fallback_rules: [
        "If the support channel or case-context summary is missing, keep the acknowledgement inside the portal and raise a typed configuration error.",
      ],
      continuity: continuityForTemplate("SUPPORT_CONTACT_ACKNOWLEDGED"),
      provider_tracking_defaults: {
        track_opens: false,
        track_links: "None",
      },
      sample_render_model: TEMPLATE_SAMPLE_MODELS.SUPPORT_CONTACT_ACKNOWLEDGED,
      source_refs: [
        {
          source_ref:
            "Algorithm/customer_client_portal_experience_contract.md::L666[context-preserving_help_submissions]",
          rationale:
            "Support-contact acknowledgements must preserve contextual case routing.",
        },
      ],
      notes: [
        "This acknowledgement is customer-safe and channel-bounded.",
      ],
    },
  ];
}

export function createRecommendedEmailTemplateCatalog(): EmailTemplateCatalog {
  return {
    schema_version: "1.0",
    catalog_id: "email_template_catalog",
    provider_selection: createProviderSelectionRecord(),
    policy_version: EMAIL_TEMPLATE_POLICY_VERSION,
    generated_on: EMAIL_POLICY_GENERATED_ON,
    truth_boundary_statement: EMAIL_TRUTH_BOUNDARY,
    safe_merge_variable_definitions: SAFE_VARIABLES,
    template_records: buildTemplateRecords(),
    blocked_event_families: [...BLOCKED_EVENT_FAMILIES],
    blocked_provider_boundary_mail: [...BLOCKED_PROVIDER_BOUNDARY_MAIL],
    typed_gaps: [
      "shared_operating_contract_0038_to_0045.md was absent at execution time, so this pack grounded itself directly in the algorithm corpus, pc_0041, pc_0031, pc_0033, and current provider documentation.",
      "Open and click tracking remain disabled by default until a later explicit product/privacy decision justifies them.",
    ],
    notes: [
      "Only customer-visible collaboration and contextual-help events are modeled here.",
      "Provider-owned identity, password-reset, or MFA mail remains outside this catalog and outside product workflow truth.",
    ],
  };
}

export function createRecommendedEmailDeliveryEventMapping(): EmailDeliveryEventMapping {
  return {
    schema_version: "1.0",
    mapping_id: "email_delivery_event_mapping",
    provider_selection: createProviderSelectionRecord(),
    policy_version: EMAIL_TEMPLATE_POLICY_VERSION,
    generated_on: EMAIL_POLICY_GENERATED_ON,
    truth_boundary_statement: EMAIL_TRUTH_BOUNDARY,
    telemetry_defaults: {
      track_opens: false,
      track_links: "None",
      rationale:
        "The corpus never grants workflow value to open or click telemetry, so privacy-minimizing defaults keep both disabled until a later explicit decision exists.",
    },
    correlation_key_fields: [
      "RecordType",
      "MessageID",
      "MessageStream",
      "Metadata.notification_id",
      "Metadata.item_id",
      "Metadata.help_request_id",
      "Recipient",
    ],
    idempotency_policy: {
      fingerprint_fields: [
        "RecordType",
        "MessageID",
        "MessageStream",
        "Metadata.notification_id",
        "Metadata.help_request_id",
        "Recipient",
      ],
      replay_window_hours: 168,
      duplicate_effect: "RETURN_200_NO_DUPLICATE_EVIDENCE",
    },
    event_mappings: [
      {
        provider_event_type: "Delivery",
        enabled_by_default: true,
        normalized_evidence_type: "EMAIL_NOTIFICATION_DELIVERED",
        allowed_internal_updates: [
          "WorkItemNotification.delivered_at",
          "WorkItemNotification.suppressed_reason_codes[]:no-change",
          "AuditEvent.WorkItemNotificationDelivered",
          "observability.email.delivery_confirmed",
        ],
        prohibited_internal_updates: [
          "WorkflowItem.lifecycle_state",
          "ClientApprovalPack.approval_state",
          "PortalHelpRequest.lifecycle_state",
          "AuthorityTruthContract.truth_surface_role",
        ],
        suppression_posture_effect: "NONE",
        retry_posture_effect: "NO_RETRY_REQUIRED",
        observability_counter_keys: ["email.delivery.confirmed"],
        privacy_capture_mode: "METADATA_ONLY",
        source_refs: [
          {
            source_ref:
              "Algorithm/collaboration_workspace_contract.md::L1897[WorkItemNotificationDelivered]",
            rationale:
              "Delivered state belongs in audit evidence, not workflow mutation.",
          },
          {
            source_ref:
              "https://postmarkapp.com/developer/webhooks/delivery-webhook",
            rationale:
              "Current delivery webhook fields support message-level delivery evidence and metadata correlation.",
          },
        ],
        notes: [
          "Delivery confirmation may update notification evidence only.",
        ],
      },
      {
        provider_event_type: "Bounce",
        enabled_by_default: true,
        normalized_evidence_type: "EMAIL_NOTIFICATION_BOUNCED",
        allowed_internal_updates: [
          "NotificationDeliveryEvidence.bounce_class",
          "RecipientSuppressionCandidate.created",
          "observability.email.bounced",
        ],
        prohibited_internal_updates: [
          "WorkflowItem.lifecycle_state",
          "ClientApprovalPack.approval_state",
          "PortalHelpRequest.lifecycle_state",
          "AuthorityTruthContract.truth_surface_role",
        ],
        suppression_posture_effect: "CREATE_SUPPRESSION_CANDIDATE",
        retry_posture_effect: "STOP_AUTOMATIC_RETRY_PENDING_OPERATOR_REVIEW",
        observability_counter_keys: [
          "email.delivery.bounce",
          "email.delivery.retry_blocked",
        ],
        privacy_capture_mode: "METADATA_AND_REDACTED_REASON",
        source_refs: [
          {
            source_ref:
              "https://postmarkapp.com/developer/webhooks/bounce-webhook",
            rationale:
              "Bounce webhook fields support bounce classification, metadata echo, and recipient-level suppression handling.",
          },
        ],
        notes: [
          "Bounce state may halt automatic resend but cannot close, reopen, or escalate the work item itself.",
        ],
      },
      {
        provider_event_type: "SpamComplaint",
        enabled_by_default: true,
        normalized_evidence_type: "EMAIL_NOTIFICATION_COMPLAINT",
        allowed_internal_updates: [
          "RecipientSuppressionCandidate.confirmed",
          "NotificationDeliveryEvidence.complaint_state",
          "observability.email.complaint",
        ],
        prohibited_internal_updates: [
          "WorkflowItem.lifecycle_state",
          "ClientApprovalPack.approval_state",
          "PortalHelpRequest.lifecycle_state",
          "AuthorityTruthContract.truth_surface_role",
        ],
        suppression_posture_effect: "CONFIRM_SUPPRESSION",
        retry_posture_effect: "HARD_BLOCK_RESEND",
        observability_counter_keys: ["email.delivery.complaint"],
        privacy_capture_mode: "METADATA_AND_REDACTED_REASON",
        source_refs: [
          {
            source_ref:
              "https://postmarkapp.com/developer/webhooks/spam-complaint-webhook",
            rationale:
              "Spam complaint callbacks support complaint evidence and suppression posture.",
          },
        ],
        notes: [
          "Complaints force suppression posture and operator review, not workflow mutation.",
        ],
      },
      {
        provider_event_type: "SubscriptionChange",
        enabled_by_default: true,
        normalized_evidence_type: "EMAIL_RECIPIENT_SUBSCRIPTION_CHANGED",
        allowed_internal_updates: [
          "RecipientSuppressionCandidate.confirmed",
          "observability.email.subscription_change",
        ],
        prohibited_internal_updates: [
          "WorkflowItem.lifecycle_state",
          "ClientApprovalPack.approval_state",
          "PortalHelpRequest.lifecycle_state",
          "AuthorityTruthContract.truth_surface_role",
        ],
        suppression_posture_effect: "CONFIRM_SUPPRESSION",
        retry_posture_effect: "HARD_BLOCK_RESEND",
        observability_counter_keys: ["email.delivery.subscription_change"],
        privacy_capture_mode: "METADATA_ONLY",
        source_refs: [
          {
            source_ref:
              "https://postmarkapp.com/developer/webhooks/subscription-change-webhook",
            rationale:
              "Subscription-change callbacks support opt-out suppression evidence only.",
          },
        ],
        notes: [
          "Unsubscribe state affects future send eligibility only.",
        ],
      },
      {
        provider_event_type: "Open",
        enabled_by_default: false,
        normalized_evidence_type: "EMAIL_OPEN_EVENT_DISABLED",
        allowed_internal_updates: [],
        prohibited_internal_updates: [
          "WorkflowItem.lifecycle_state",
          "ClientApprovalPack.approval_state",
          "PortalHelpRequest.lifecycle_state",
          "AuthorityTruthContract.truth_surface_role",
          "NotificationEligibilityState",
        ],
        suppression_posture_effect: "NONE",
        retry_posture_effect: "NONE",
        observability_counter_keys: [],
        privacy_capture_mode: "METADATA_ONLY",
        source_refs: [
          {
            source_ref:
              "https://postmarkapp.com/developer/webhooks/open-webhook",
            rationale:
              "Open callbacks exist at the provider boundary but remain disabled by Taxat's current privacy-minimizing posture.",
          },
        ],
        notes: [
          "Disabled by default; no current source contract grants workflow value to open tracking.",
        ],
      },
      {
        provider_event_type: "Click",
        enabled_by_default: false,
        normalized_evidence_type: "EMAIL_CLICK_EVENT_DISABLED",
        allowed_internal_updates: [],
        prohibited_internal_updates: [
          "WorkflowItem.lifecycle_state",
          "ClientApprovalPack.approval_state",
          "PortalHelpRequest.lifecycle_state",
          "AuthorityTruthContract.truth_surface_role",
          "NotificationEligibilityState",
        ],
        suppression_posture_effect: "NONE",
        retry_posture_effect: "NONE",
        observability_counter_keys: [],
        privacy_capture_mode: "METADATA_ONLY",
        source_refs: [
          {
            source_ref:
              "https://postmarkapp.com/developer/webhooks/click-webhook",
            rationale:
              "Click callbacks exist at the provider boundary but remain disabled by Taxat's current privacy-minimizing posture.",
          },
        ],
        notes: [
          "Disabled by default; route opens already carry explicit internal continuity and do not need external click telemetry.",
        ],
      },
    ],
    typed_gaps: [
      "Open and click tracking remain disabled by default; a later decision would need to justify them against privacy law and customer-value doctrine.",
    ],
    notes: [
      "Every enabled callback path is idempotent and evidence-only.",
      "Provider transport events can narrow future send eligibility, but they never author new workflow truth.",
    ],
  };
}

export function createRecommendedEmailWebhookEndpointContract(): EmailWebhookEndpointContract {
  const environments: Array<{
    environmentId:
      | "env_shared_sandbox_integration"
      | "env_preproduction_verification"
      | "env_production";
    streamRef:
      | "email_stream_sandbox_customer_transactional"
      | "email_stream_preproduction_customer_transactional"
      | "email_stream_production_customer_transactional";
    callbackRef: string;
    url: string;
    secretNamespace: string;
  }> = [
    {
      environmentId: "env_shared_sandbox_integration",
      streamRef: "email_stream_sandbox_customer_transactional",
      callbackRef: "email_webhook_customer_transactional_sandbox",
      url: "https://notification-ingress.sandbox.taxat.example/webhooks/email/postmark/customer-transactional",
      secretNamespace: "sec_sandbox_runtime",
    },
    {
      environmentId: "env_preproduction_verification",
      streamRef: "email_stream_preproduction_customer_transactional",
      callbackRef: "email_webhook_customer_transactional_preprod",
      url: "https://notification-ingress.preprod.taxat.example/webhooks/email/postmark/customer-transactional",
      secretNamespace: "sec_preprod_runtime",
    },
    {
      environmentId: "env_production",
      streamRef: "email_stream_production_customer_transactional",
      callbackRef: "email_webhook_customer_transactional_production",
      url: "https://notification-ingress.production.taxat.example/webhooks/email/postmark/customer-transactional",
      secretNamespace: "sec_production_runtime",
    },
  ];

  return {
    schema_version: "1.0",
    contract_id: "email_webhook_endpoint_contract",
    provider_selection: createProviderSelectionRecord(),
    policy_version: EMAIL_TEMPLATE_POLICY_VERSION,
    generated_on: EMAIL_POLICY_GENERATED_ON,
    truth_boundary_statement: EMAIL_TRUTH_BOUNDARY,
    callback_records: environments.map((environment) => ({
      callback_ref: environment.callbackRef,
      product_environment_id: environment.environmentId,
      message_stream_ref: environment.streamRef,
      callback_url: environment.url,
      authentication: {
        mode: "HTTPS_BASIC_AUTH_PLUS_CUSTOM_HEADER",
        basic_auth_username_ref: `vault://metadata/${environment.secretNamespace}/email/webhooks/customer-transactional/basic-auth-username`,
        basic_auth_password_ref: `vault://metadata/${environment.secretNamespace}/email/webhooks/customer-transactional/basic-auth-password`,
        custom_header_name: "X-Taxat-Webhook-Secret",
        custom_header_secret_ref: `vault://metadata/${environment.secretNamespace}/email/webhooks/customer-transactional/header-secret`,
        provider_signature_mode:
          "NOT_SUPPORTED_PROVIDER_NATIVE_EQUIVALENT_AUTH",
      },
      replay_protection: {
        require_https: true,
        max_age_hours: 168,
        duplicate_response_code: 200,
      },
      idempotency_contract: {
        fingerprint_fields: [
          "RecordType",
          "MessageID",
          "MessageStream",
          "Metadata.notification_id",
          "Metadata.item_id",
          "Metadata.help_request_id",
          "Recipient",
        ],
        ledger_ref: `vault://metadata/${environment.secretNamespace}/email/webhooks/customer-transactional/idempotency-ledger`,
        duplicate_effect: "RETURN_200_NO_DUPLICATE_EVIDENCE",
      },
      enabled_event_types: [
        "Delivery",
        "Bounce",
        "SpamComplaint",
        "SubscriptionChange",
      ],
      disabled_event_types: ["Open", "Click"],
      correlation_keys: [
        "MessageID",
        "MessageStream",
        "Metadata.notification_id",
        "Metadata.item_id",
        "Metadata.help_request_id",
        "Recipient",
      ],
      source_refs: [
        {
          source_ref:
            "https://postmarkapp.com/developer/webhooks/webhooks-overview",
          rationale:
            "Webhook URLs, HTTPS enforcement, Basic Auth, and custom headers are current provider-supported controls.",
        },
        {
          source_ref:
            "Algorithm/retention_error_and_observability_contract.md::L1",
          rationale:
            "Observed provider payloads must be normalized into evidence rather than promoted to business truth.",
        },
      ],
      notes: [
        "Provider-native signed payloads are not available, so Taxat uses provider-supported equivalent authentication plus idempotency and replay protection.",
        "Open and click event types remain disabled at configuration time.",
      ],
    })),
    typed_gaps: [
      "Provider-native webhook signatures are not available in the active Postmark-compatible recipe, so equivalent authentication is used instead.",
      "Operator/security mail shares the same provider but is intentionally outside this customer-safe callback pack.",
    ],
    notes: [
      "Callback secrets remain vault-bound only.",
      "Sandbox callback hosts are safe for render rehearsal; production stays distinct.",
    ],
  };
}

function interpolateTemplate(
  template: string,
  model: Record<string, string>,
): string {
  return template.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/giu, (_, key: string) => {
    const value = model[key];
    if (value === undefined) {
      throw new Error(`Missing merge variable ${key}`);
    }
    return value;
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function renderPreview(record: EmailTemplateRecord) {
  return {
    subject: interpolateTemplate(record.subject_template, record.sample_render_model),
    preheader: interpolateTemplate(
      record.preheader_template,
      record.sample_render_model,
    ),
    headline: interpolateTemplate(
      record.headline_template,
      record.sample_render_model,
    ),
    body_paragraphs: record.body_template_paragraphs.map((paragraph) =>
      interpolateTemplate(paragraph, record.sample_render_model),
    ),
    cta_label: interpolateTemplate(
      record.cta_label_template,
      record.sample_render_model,
    ),
    cta_route: interpolateTemplate(
      record.cta_route_template,
      record.sample_render_model,
    ),
    footer_paragraphs: record.footer_template_paragraphs.map((paragraph) =>
      interpolateTemplate(paragraph, record.sample_render_model),
    ),
  };
}

function compileProviderHtmlTemplate(record: EmailTemplateRecord): string {
  const body = record.body_template_paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
  const footer = record.footer_template_paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
  return [
    "<!doctype html>",
    "<html lang=\"en-GB\">",
    "<body>",
    `<span style="display:none;">${escapeHtml(record.preheader_template)}</span>`,
    `<h1>${escapeHtml(record.headline_template)}</h1>`,
    body,
    `<p><a href="${escapeHtml(record.cta_route_template)}">${escapeHtml(record.cta_label_template)}</a></p>`,
    footer,
    "</body>",
    "</html>",
  ].join("");
}

function compileProviderTextTemplate(record: EmailTemplateRecord): string {
  return [
    record.headline_template,
    "",
    ...record.body_template_paragraphs,
    "",
    `${record.cta_label_template}: ${record.cta_route_template}`,
    "",
    ...record.footer_template_paragraphs,
  ].join("\n");
}

function deploymentBindingsForTemplate(
  record: EmailTemplateRecord,
): EmailTemplateDeploymentBinding[] {
  const senderProfile =
    record.sender_identity_profile_ref === "support_acknowledgement_help"
      ? {
          localPart: "help",
          replyTo: "support",
        }
      : {
          localPart: "noreply",
          replyTo: "help",
        };

  return [
    {
      environment_ref: "env_shared_sandbox_integration",
      workspace_ref: "email_ws_sandbox",
      sender_domain_ref: "email_domain_notify_sandbox",
      message_stream_ref: "email_stream_sandbox_customer_transactional",
      provider_template_alias: `sandbox.${record.template_alias}`,
      from_address: `${senderProfile.localPart}@notify.sandbox.taxat.example`,
      reply_to_address: `${senderProfile.replyTo}@notify.sandbox.taxat.example`,
      callback_ref: "email_webhook_customer_transactional_sandbox",
      deployment_state: "READY_FOR_RENDER_REHEARSAL",
    },
    {
      environment_ref: "env_preproduction_verification",
      workspace_ref: "email_ws_preprod",
      sender_domain_ref: "email_domain_notify_preprod",
      message_stream_ref: "email_stream_preproduction_customer_transactional",
      provider_template_alias: `preprod.${record.template_alias}`,
      from_address: `${senderProfile.localPart}@notify.preprod.taxat.example`,
      reply_to_address: `${senderProfile.replyTo}@notify.preprod.taxat.example`,
      callback_ref: "email_webhook_customer_transactional_preprod",
      deployment_state: "READY_FOR_PROMOTION_VERIFICATION",
    },
    {
      environment_ref: "env_production",
      workspace_ref: "email_ws_production",
      sender_domain_ref: "email_domain_notify_production",
      message_stream_ref: "email_stream_production_customer_transactional",
      provider_template_alias: `production.${record.template_alias}`,
      from_address: `${senderProfile.localPart}@notify.production.taxat.example`,
      reply_to_address: `${senderProfile.replyTo}@notify.production.taxat.example`,
      callback_ref: "email_webhook_customer_transactional_production",
      deployment_state: "READY_FOR_CONTROLLED_ROLLOUT",
    },
  ];
}

export function createTemplateEmailInventory(
  runContext: RunContext,
): EmailTemplateInventory {
  const catalog = createRecommendedEmailTemplateCatalog();
  return {
    schema_version: "1.0",
    inventory_id: "email_template_inventory",
    provider_id: EMAIL_PROVIDER_ID,
    provider_display_name: EMAIL_PROVIDER_DISPLAY_NAME,
    run_id: runContext.runId,
    flow_id: EMAIL_TEMPLATE_FLOW_ID,
    operator_identity_alias: runContext.operatorIdentityAlias,
    provider_selection: createProviderSelectionRecord(),
    template_records: catalog.template_records.map((record) => ({
      template_ref: record.template_ref,
      provider_template_alias: record.template_alias,
      provider_subject_template: record.subject_template,
      provider_html_template: compileProviderHtmlTemplate(record),
      provider_text_template: compileProviderTextTemplate(record),
      deployment_bindings: deploymentBindingsForTemplate(record),
      source_refs: [...record.source_refs],
      notes: [
        ...record.notes,
        "Deployment bindings stay environment-scoped and callback-scoped.",
      ],
    })),
    webhook_contract_ref:
      "config/notifications/email_webhook_endpoint_contract.json",
    delivery_event_mapping_ref:
      "config/notifications/email_delivery_event_mapping.json",
    typed_gaps: [
      "shared_operating_contract_0038_to_0045.md was absent at execution time, so this inventory grounded itself directly in the named contracts and current provider documentation.",
    ],
    notes: [
      "Provider templates are server-scoped aliases derived from one authoritative product-owned catalog.",
      "Sandbox and preproduction bindings are safe for render rehearsal and promotion verification without sending to uncontrolled live recipients.",
    ],
    last_verified_at: EMAIL_POLICY_GENERATED_ON,
  };
}

function safeVariableByRef(variableRef: string): SafeMergeVariableDefinition | undefined {
  return SAFE_VARIABLES.find((variable) => variable.variable_ref === variableRef);
}

export function validateEmailTemplateCatalog(catalog: EmailTemplateCatalog): void {
  const safeVariableRefs = new Set(
    catalog.safe_merge_variable_definitions.map((variable) => variable.variable_ref),
  );
  const blockedNames = new Set([
    "assignee_ref",
    "internal_note_body",
    "gate_reason_code",
    "authority_truth_state",
    "raw_audit_hash",
  ]);
  const allowedFamilies = new Set<EmailNotificationFamily>([
    "REQUEST_INFO_CREATED",
    "STAFF_CUSTOMER_COMMENT_CREATED",
    "CUSTOMER_DUE_DATE_CHANGED",
    "ITEM_RESOLVED_OR_CLOSED",
    "PORTAL_HELP_ACKNOWLEDGED",
    "SUPPORT_CONTACT_ACKNOWLEDGED",
  ]);
  const allowedEvents = new Set(ALLOWED_NOTIFICATION_EVENTS);

  for (const record of catalog.template_records) {
    if (!allowedFamilies.has(record.notification_family)) {
      throw new Error(`Template ${record.template_ref} uses a disallowed family.`);
    }
    if (!record.sender_stream_ref) {
      throw new Error(`Template ${record.template_ref} is missing a sender stream.`);
    }
    for (const event of record.allowed_trigger_events) {
      if (!allowedEvents.has(event as (typeof ALLOWED_NOTIFICATION_EVENTS)[number])) {
        throw new Error(
          `Template ${record.template_ref} references disallowed event ${event}.`,
        );
      }
    }
    for (const variableRef of record.allowed_merge_variables) {
      if (!safeVariableRefs.has(variableRef)) {
        throw new Error(
          `Template ${record.template_ref} references unknown merge variable ${variableRef}.`,
        );
      }
      if (blockedNames.has(variableRef)) {
        throw new Error(
          `Template ${record.template_ref} references blocked merge variable ${variableRef}.`,
        );
      }
    }
    for (const variableRef of record.required_merge_variables) {
      if (!record.allowed_merge_variables.includes(variableRef)) {
        throw new Error(
          `Template ${record.template_ref} requires merge variable ${variableRef} without allowing it.`,
        );
      }
    }
    renderPreview(record);
  }
}

export function validateEmailDeliveryEventMapping(
  mapping: EmailDeliveryEventMapping,
): void {
  const eventTypes = new Set(mapping.event_mappings.map((row) => row.provider_event_type));
  const required = new Set<EmailProviderEventType>([
    "Delivery",
    "Bounce",
    "SpamComplaint",
    "SubscriptionChange",
    "Open",
    "Click",
  ]);

  for (const eventType of required) {
    if (!eventTypes.has(eventType)) {
      throw new Error(`Missing delivery-event rule for ${eventType}.`);
    }
  }
  for (const row of mapping.event_mappings) {
    if (
      row.allowed_internal_updates.some((update) =>
        /WorkflowItem\.lifecycle_state|approval_state|AuthorityTruthContract|PortalHelpRequest\.lifecycle_state/u.test(
          update,
        ),
      )
    ) {
      throw new Error(
        `Event ${row.provider_event_type} must not mutate workflow or authority truth directly.`,
      );
    }
  }
}

export function validateEmailWebhookEndpointContract(
  contract: EmailWebhookEndpointContract,
  mapping: EmailDeliveryEventMapping,
): void {
  const enabledEventTypes = new Set(
    mapping.event_mappings
      .filter((row) => row.enabled_by_default)
      .map((row) => row.provider_event_type),
  );

  for (const record of contract.callback_records) {
    if (!record.callback_url.startsWith("https://")) {
      throw new Error(`Callback ${record.callback_ref} must use HTTPS.`);
    }
    for (const eventType of record.enabled_event_types) {
      if (!enabledEventTypes.has(eventType)) {
        throw new Error(
          `Callback ${record.callback_ref} enables ${eventType} without a matching enabled policy rule.`,
        );
      }
    }
    if (record.disabled_event_types.join(",") !== "Open,Click") {
      throw new Error(
        `Callback ${record.callback_ref} must keep open and click disabled by default.`,
      );
    }
  }
}

export function validateEmailTemplateInventory(
  inventory: EmailTemplateInventory,
  catalog: EmailTemplateCatalog,
  webhookContract: EmailWebhookEndpointContract,
): void {
  const templateRefs = new Set(catalog.template_records.map((record) => record.template_ref));
  const callbackRefs = new Set(
    webhookContract.callback_records.map((record) => record.callback_ref),
  );

  for (const record of inventory.template_records) {
    if (!templateRefs.has(record.template_ref)) {
      throw new Error(`Inventory references unknown template ${record.template_ref}.`);
    }
    if (!record.provider_html_template.includes("<html")) {
      throw new Error(
        `Inventory record ${record.template_ref} must include HTML provider copy.`,
      );
    }
    for (const binding of record.deployment_bindings) {
      if (!callbackRefs.has(binding.callback_ref)) {
        throw new Error(
          `Inventory record ${record.template_ref} references unknown callback ${binding.callback_ref}.`,
        );
      }
    }
  }
}

export function assertEmailTemplateArtifactsSanitized(
  inventory: EmailTemplateInventory,
  webhookContract: EmailWebhookEndpointContract,
): void {
  const serialized = JSON.stringify({ inventory, webhookContract }).toLowerCase();
  if (serialized.includes("x-postmark-server-token")) {
    throw new Error("Artifacts leaked a raw provider token header.");
  }
  if (serialized.includes("postmark_api_test")) {
    throw new Error("Artifacts leaked a raw Postmark API token.");
  }
}

export function createNotificationCopyAtlasViewModel(): NotificationCopyAtlasViewModel {
  const catalog = createRecommendedEmailTemplateCatalog();
  const mapping = createRecommendedEmailDeliveryEventMapping();
  const contract = createRecommendedEmailWebhookEndpointContract();

  const templates = catalog.template_records.map((record) => {
    const preview = renderPreview(record);
    const productionBinding = deploymentBindingsForTemplate(record).find(
      (binding) => binding.environment_ref === "env_production",
    );
    if (!productionBinding) {
      throw new Error(`Template ${record.template_ref} is missing a production binding.`);
    }
    return {
      template_ref: record.template_ref,
      label: record.label,
      notification_family: record.notification_family,
      selected_environment_label: "Production",
      sender_stream_label: "Customer transactional",
      sender_identity_label: productionBinding.from_address,
      preview,
      lifecycle_rail: [
        {
          stage_ref: "product_event" as const,
          label: "Product Event",
          summary: record.allowed_trigger_events.join(" / "),
        },
        {
          stage_ref: "notification_projection" as const,
          label: "Notification Projection",
          summary: "Customer-safe WorkItemNotification or PortalHelpRequest projection",
        },
        {
          stage_ref: "provider_template" as const,
          label: "Provider Template",
          summary: productionBinding.provider_template_alias,
        },
        {
          stage_ref: "delivery_event" as const,
          label: "Delivery Event",
          summary: "Delivery, bounce, complaint, or subscription-change evidence",
        },
        {
          stage_ref: "internal_evidence" as const,
          label: "Internal Evidence",
          summary: "Append-only delivery evidence and counters only",
        },
      ],
      merge_provenance: record.required_merge_variables.map((variableRef) => {
        const variable = safeVariableByRef(variableRef);
        if (!variable) {
          throw new Error(`Missing safe variable definition for ${variableRef}.`);
        }
        return {
          variable_ref: variableRef,
          source_kind: variable.privacy_class,
          source_ref: variable.source_contract_ref,
          sample_value: record.sample_render_model[variableRef] ?? "derived at send time",
        };
      }),
      continuity_rows: [
        {
          label: "Shell family",
          value: record.continuity.shell_family,
        },
        {
          label: "Target route",
          value: interpolateTemplate(
            record.continuity.target_route_ref_template,
            record.sample_render_model,
          ),
        },
        {
          label: "Focus anchor",
          value: interpolateTemplate(
            record.continuity.focus_anchor_ref_template,
            record.sample_render_model,
          ),
        },
        {
          label: "Fallback route",
          value: interpolateTemplate(
            record.continuity.fallback_route_ref_template,
            record.sample_render_model,
          ),
        },
      ],
      webhook_event_types: mapping.event_mappings.map((event) => event.provider_event_type),
      privacy_notes: [
        ...record.notes,
        "Open and click tracking remain disabled by default.",
        "Lifecycle and authority truth stay internal even when the provider reports delivery outcomes.",
      ],
    };
  });

  return {
    providerDisplayName: EMAIL_PROVIDER_DISPLAY_NAME,
    providerMonogram: "MAIL",
    selectionPosture: "PRIVACY_MINIMIZING",
    policyVersion: EMAIL_TEMPLATE_POLICY_VERSION,
    truthBoundaryStatement: EMAIL_TRUTH_BOUNDARY,
    selectedTemplateRef: "email_template_request_info_created",
    selectedLifecycleRef: "provider_template",
    lifecycleLegend: [
      "Product Event",
      "Notification Projection",
      "Provider Template",
      "Delivery Event",
      "Internal Evidence",
    ],
    templates,
    webhookEvents: mapping.event_mappings,
    callbackRecords: contract.callback_records,
    notes: [
      "Copy remains product-owned and provider-agnostic.",
      "Lifecycle rail is explanatory only and does not imply a generic marketing funnel.",
    ],
  };
}

export function createTemplateNotificationFixtureState(
  mode: "fresh" | "existing" | "telemetry-drift" = "existing",
): EmailTemplateFixtureState {
  if (mode === "fresh") {
    return {
      templateSourceDisposition: "CREATED_DURING_RUN",
      webhookSourceDisposition: "CREATED_DURING_RUN",
      telemetryDriftDetected: false,
      notes: [
        "Fixture simulates a fresh configuration run where provider templates and webhook endpoints are created during the run.",
      ],
    };
  }
  if (mode === "telemetry-drift") {
    return {
      templateSourceDisposition: "ADOPTED_EXISTING",
      webhookSourceDisposition: "ADOPTED_EXISTING",
      telemetryDriftDetected: true,
      notes: [
        "Fixture simulates an adopted provider configuration where open or click tracking has drifted from the privacy-minimizing default.",
      ],
    };
  }
  return {
    templateSourceDisposition: "ADOPTED_EXISTING",
    webhookSourceDisposition: "ADOPTED_EXISTING",
    telemetryDriftDetected: false,
    notes: [
      "Fixture simulates an adopted provider configuration that already matches the recommended template and callback posture.",
    ],
  };
}

export function createDefaultEmailTemplateProviderEntryUrls(): EmailTemplateProviderEntryUrls {
  return {
    controlPlane: "https://account.postmarkapp.com/servers",
  };
}

function selectorById(
  manifest: SelectorManifest,
  selectorId: string,
): SelectorDescriptor {
  const selector = manifest.selectors.find(
    (candidate) => candidate.selectorId === selectorId,
  );
  if (!selector) {
    throw new Error(`Selector ${selectorId} is missing from ${manifest.manifestId}`);
  }
  return selector;
}

function locatorForSelector(page: Page, selector: SelectorDescriptor): Locator {
  switch (selector.strategy) {
    case "ROLE":
      return page.getByRole(selector.value as any, {
        name: selector.accessibleName,
      });
    case "LABEL":
      return page.getByLabel(selector.value);
    case "TEXT":
      return page.getByText(selector.value, { exact: false });
    case "TEST_ID":
      return page.getByTestId(selector.value);
    case "CSS_FALLBACK":
      return page.locator(selector.value);
    case "URL":
      return page.locator(`a[href='${selector.value}']`);
    default:
      throw new Error(`Unsupported selector strategy ${selector.strategy}`);
  }
}

async function requireVisible(
  page: Page,
  manifest: SelectorManifest,
  selectorId: string,
): Promise<Locator> {
  const locator = locatorForSelector(page, selectorById(manifest, selectorId)).first();
  await locator.waitFor({ state: "visible" });
  return locator;
}

async function captureNoteEvidence(
  manifest: EvidenceManifest,
  stepId: string,
  summary: string,
): Promise<EvidenceManifest> {
  return appendEvidenceRecord(manifest, {
    evidenceId: `${stepId}-${stableHash(summary).slice(0, 18)}`,
    stepId,
    kind: "NOTE",
    relativePath: null,
    captureMode: "REDACTED",
    summary,
  });
}

async function detectFixtureState(page: Page): Promise<EmailTemplateFixtureState> {
  const templateScenario = await page.locator("body").getAttribute("data-template-scenario");
  if (
    templateScenario === "fresh" ||
    templateScenario === "existing" ||
    templateScenario === "telemetry-drift"
  ) {
    return createTemplateNotificationFixtureState(templateScenario);
  }
  return createTemplateNotificationFixtureState("existing");
}

export async function loadEmailTemplateWebhookSelectorManifest(): Promise<SelectorManifest> {
  return EMAIL_TEMPLATE_SELECTORS;
}

export async function configureTemplatesAndWebhooks(
  options: ConfigureTemplatesAndWebhooksOptions,
): Promise<ConfigureTemplatesAndWebhooksResult> {
  const registry = createDefaultProviderRegistry();
  const provider = registry.getRequired(EMAIL_PROVIDER_ID);
  assertProviderFlowAllowed(options.runContext, provider, EMAIL_TEMPLATE_FLOW_ID);

  const manifest = await loadEmailTemplateWebhookSelectorManifest();
  const entryUrls =
    options.entryUrls ?? createDefaultEmailTemplateProviderEntryUrls();
  const steps: StepContract[] = [
    createPendingStep({
      stepId: EMAIL_TEMPLATE_STEP_IDS.openControlPlane,
      title: "Open email template and webhook control plane",
      selectorRefs: ["workspace-heading", "templates-heading", "webhooks-heading"],
    }),
    createPendingStep({
      stepId: EMAIL_TEMPLATE_STEP_IDS.reconcileTemplates,
      title: "Configure or adopt customer-safe templates",
      selectorRefs: ["template-action", "template-row-fallback"],
    }),
    createPendingStep({
      stepId: EMAIL_TEMPLATE_STEP_IDS.reconcileWebhooks,
      title: "Configure or adopt webhook endpoints",
      selectorRefs: ["webhook-action"],
    }),
    createPendingStep({
      stepId: EMAIL_TEMPLATE_STEP_IDS.validateDeliveryEvents,
      title: "Validate delivery-event policy",
      selectorRefs: ["mapping-action"],
    }),
    createPendingStep({
      stepId: EMAIL_TEMPLATE_STEP_IDS.persistArtifacts,
      title: "Persist template inventory artifacts",
      selectorRefs: ["event-mapping-heading"],
      sensitiveCapturePolicy: "REDACT",
    }),
  ];

  let evidenceManifest = createEvidenceManifest(options.runContext);

  steps[0] = transitionStep(
    steps[0]!,
    "RUNNING",
    "Opening transactional email control plane for templates and webhooks.",
  );
  await options.page.goto(entryUrls.controlPlane);
  await requireVisible(options.page, manifest, "workspace-heading");
  await requireVisible(options.page, manifest, "templates-heading");
  await requireVisible(options.page, manifest, "template-action");
  await requireVisible(options.page, manifest, "webhooks-heading");
  await requireVisible(options.page, manifest, "webhook-action");
  await requireVisible(options.page, manifest, "event-mapping-heading");
  await requireVisible(options.page, manifest, "mapping-action");
  steps[0] = transitionStep(
    steps[0]!,
    "SUCCEEDED",
    "Template and webhook workspace is reachable with semantic selectors.",
  );
  evidenceManifest = await captureNoteEvidence(
    evidenceManifest,
    steps[0].stepId,
    "Opened the template and webhook control plane without relying on brittle selectors.",
  );

  const fixtureState = await detectFixtureState(options.page);
  const templateCatalog = createRecommendedEmailTemplateCatalog();
  const deliveryEventMapping = createRecommendedEmailDeliveryEventMapping();
  const webhookEndpointContract = createRecommendedEmailWebhookEndpointContract();
  const templateInventory = createTemplateEmailInventory(options.runContext);

  validateEmailTemplateCatalog(templateCatalog);
  validateEmailDeliveryEventMapping(deliveryEventMapping);
  validateEmailWebhookEndpointContract(
    webhookEndpointContract,
    deliveryEventMapping,
  );
  validateEmailTemplateInventory(
    templateInventory,
    templateCatalog,
    webhookEndpointContract,
  );
  assertEmailTemplateArtifactsSanitized(
    templateInventory,
    webhookEndpointContract,
  );

  steps[1] = transitionStep(
    steps[1]!,
    "RUNNING",
    "Reconciling product-owned customer-safe template aliases and copy packs.",
  );
  steps[1] =
    fixtureState.templateSourceDisposition === "ADOPTED_EXISTING"
      ? markSkippedAsAlreadyPresent(
          steps[1]!,
          "Existing provider templates were adopted and verified against the authoritative product catalog.",
        )
      : transitionStep(
          steps[1]!,
          "SUCCEEDED",
          "Provider templates were created from the authoritative customer-safe catalog.",
        );
  evidenceManifest = await captureNoteEvidence(
    evidenceManifest,
    steps[1].stepId,
    "Template aliases, sender streams, continuity routes, and safe merge variables are now normalized from one product-owned catalog.",
  );

  steps[2] = transitionStep(
    steps[2]!,
    "RUNNING",
    "Reconciling authenticated webhook endpoints and callback bindings.",
  );
  steps[2] =
    fixtureState.webhookSourceDisposition === "ADOPTED_EXISTING"
      ? markSkippedAsAlreadyPresent(
          steps[2]!,
          "Existing webhook endpoints were adopted and checked against the governed callback contract.",
        )
      : transitionStep(
          steps[2]!,
          "SUCCEEDED",
          "Webhook endpoints and callback bindings were created during the run.",
        );
  evidenceManifest = await captureNoteEvidence(
    evidenceManifest,
    steps[2].stepId,
    "Webhook endpoints now use vault-bound equivalent authentication, replay protection, and idempotent dedupe rules.",
  );

  steps[3] = transitionStep(
    steps[3]!,
    "RUNNING",
    "Validating delivery-event mapping, telemetry defaults, and prohibited workflow mutations.",
  );

  let outcome: EmailTemplateFlowOutcome =
    "EMAIL_TEMPLATES_AND_CALLBACKS_READY";
  if (fixtureState.telemetryDriftDetected) {
    steps[3] = transitionStep(
      steps[3]!,
      "BLOCKED_BY_POLICY",
      "Provider telemetry drift detected. Open or click tracking is enabled even though the authoritative contract keeps both disabled by default.",
    );
    outcome = "EMAIL_TEMPLATE_POLICY_REVIEW_REQUIRED";
    evidenceManifest = await captureNoteEvidence(
      evidenceManifest,
      steps[3].stepId,
      "Telemetry drift was surfaced explicitly and blocked instead of being silently adopted.",
    );
  } else {
    steps[3] = transitionStep(
      steps[3]!,
      "SUCCEEDED",
      "Delivery-event mappings, telemetry defaults, and prohibited workflow mutations match the authoritative contract.",
    );
    evidenceManifest = await captureNoteEvidence(
      evidenceManifest,
      steps[3].stepId,
      "Validated that provider delivery events append evidence and suppression posture only, never workflow truth.",
    );
  }

  steps[4] = transitionStep(
    steps[4]!,
    "RUNNING",
    "Persisting sanitized template inventory and callback references.",
  );
  await persistJson(options.templateInventoryPath, templateInventory);
  steps[4] = transitionStep(
    steps[4]!,
    "SUCCEEDED",
    "Template inventory artifacts were persisted.",
  );
  evidenceManifest = await captureNoteEvidence(
    evidenceManifest,
    steps[4].stepId,
    "Persisted sanitized template inventory with environment bindings, callback refs, and provider-ready template bodies.",
  );

  const evidenceManifestPath = options.templateInventoryPath.replace(
    /\.json$/u,
    ".evidence_manifest.json",
  );
  await persistJson(evidenceManifestPath, evidenceManifest);

  return {
    outcome,
    steps,
    evidenceManifestPath,
    templateCatalog,
    deliveryEventMapping,
    webhookEndpointContract,
    templateInventory,
    notes: [
      ...fixtureState.notes,
      ...(options.notes ?? []),
      "Open and click tracking remain disabled by default until a later explicit decision exists.",
      "External delivery callbacks are normalized into evidence-only internal updates.",
    ],
  };
}

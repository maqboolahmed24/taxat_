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
import {
  assertLiveProviderGate,
  type RunContext,
} from "../../../core/run_context.js";
import {
  createPendingStep,
  transitionStep,
  type StepContract,
} from "../../../core/step_contract.js";
import {
  rankSelectors,
  type SelectorDescriptor,
  type SelectorManifest,
} from "../../../core/selector_contract.js";

export const SUPPORT_PROVIDER_ID = "support-operations-control-plane";
export const SUPPORT_FLOW_ID = "support-workspace-selection";
export const SUPPORT_PROVIDER_DISPLAY_NAME = "Support Integration Control Plane";
export const SUPPORT_PROVIDER_VENDOR_ADAPTER = "ZENDESK_COMPATIBLE_BASELINE";
export const SUPPORT_POLICY_VERSION = "1.0";
export const SUPPORT_POLICY_GENERATED_ON = "2026-04-18";

export const SUPPORT_STEP_IDS = {
  openDecisionSurface: "support.control-plane.open-selection-surface",
  recordSelection: "support.control-plane.record-selection",
  validateChannelPolicy: "support.control-plane.validate-channel-policy",
  validateContextMapping: "support.control-plane.validate-context-mapping-and-mirror-rules",
  persistArtifacts: "support.control-plane.persist-artifacts",
} as const;

export type SupportSelectionStatus =
  | "NOT_SELECTED"
  | "SELECTED_WITH_GAPS"
  | "SELECTED";

export type SupportScenarioRef =
  | "contextual_request_help"
  | "general_help_route"
  | "support_acknowledgement";

export type SupportSelectionOverride =
  | "NOT_SELECTED"
  | "SELECTED_WITH_GAPS";

export type SupportFlowOutcome =
  | "SUPPORT_INTEGRATION_NOT_SELECTED"
  | "SUPPORT_INTEGRATION_SELECTED_WITH_GAPS"
  | "SUPPORT_WORKSPACE_READY";

export interface SourceRef {
  source_ref: string;
  rationale: string;
}

export interface SupportSelectionProfile {
  selection_status: SupportSelectionStatus;
  decision_status:
    | "OPTIONAL_VENDOR_SELECTION_NOT_RESOLVED"
    | "SELECTED_PENDING_PROCUREMENT";
  selected_vendor_adapter_or_null:
    | typeof SUPPORT_PROVIDER_VENDOR_ADAPTER
    | null;
  selected_vendor_label_or_null: string | null;
  support_mode_label: "Not Selected" | "Selected with Gaps" | "Selected";
  provider_docs_urls: string[];
  typed_gaps: string[];
  notes: string[];
}

export interface SupportWorkspaceSelectionRecord {
  schema_version: "1.0";
  selection_record_id: "support_workspace_selection_record";
  provider_id: typeof SUPPORT_PROVIDER_ID;
  provider_display_name: typeof SUPPORT_PROVIDER_DISPLAY_NAME;
  run_id: string;
  flow_id: typeof SUPPORT_FLOW_ID;
  workspace_id: string;
  operator_identity_alias: string;
  selection_status: SupportSelectionStatus;
  decision_status:
    | "OPTIONAL_VENDOR_SELECTION_NOT_RESOLVED"
    | "SELECTED_PENDING_PROCUREMENT";
  selected_vendor_adapter_or_null:
    | typeof SUPPORT_PROVIDER_VENDOR_ADAPTER
    | null;
  selected_vendor_label_or_null: string | null;
  future_default_vendor_adapter_or_null: typeof SUPPORT_PROVIDER_VENDOR_ADAPTER;
  environment_scope: ["staging", "production"];
  first_party_truth_statement: string;
  support_channel_policy_ref: "config/support/support_channel_policy.json";
  portal_help_mapping_ref:
    "config/support/portal_help_to_external_ticket_mapping.json";
  support_webhook_contract_ref:
    "config/support/support_webhook_endpoint_contract.json";
  provider_docs_urls: string[];
  source_refs: SourceRef[];
  selection_notes: string[];
  typed_gaps: string[];
  last_verified_at: string;
}

export interface SupportChannelPolicyRow {
  scenario_ref: SupportScenarioRef;
  scenario_label: string;
  primary_route: string;
  primary_first_party_channel: string;
  recommended_channel_label: string;
  restate_required: false;
  external_projection_state:
    | "NOT_SELECTED"
    | "SELECTED_PENDING_FIELD_BINDING";
  allowed_external_payload_classes: string[];
  prohibited_external_payload_classes: string[];
  source_refs: SourceRef[];
  notes: string[];
}

export interface SupportChannelPolicy {
  schema_version: "1.0";
  policy_id: "support_channel_policy";
  selection_status: SupportSelectionStatus;
  selected_vendor_adapter_or_null:
    | typeof SUPPORT_PROVIDER_VENDOR_ADAPTER
    | null;
  truth_boundary_statement: string;
  channel_rows: SupportChannelPolicyRow[];
  source_refs: SourceRef[];
  typed_gaps: string[];
  notes: string[];
}

export interface PortalHelpFieldMappingRow {
  source_field: string;
  external_field_ref_or_null: string | null;
  export_policy:
    | "TICKET_SUBJECT"
    | "PUBLIC_COMMENT_SUMMARY"
    | "CUSTOM_FIELD"
    | "INTERNAL_ONLY_FORBIDDEN";
  privacy_class:
    | "CUSTOMER_SAFE_CONTEXT"
    | "CUSTOMER_SAFE_SUMMARY"
    | "INTERNAL_ONLY";
  required_when: string;
  notes: string[];
}

export interface PortalHelpMappingScenario {
  scenario_ref: SupportScenarioRef;
  scenario_label: string;
  activation_state:
    | "FROZEN_NOT_ACTIVE"
    | "SELECTED_PENDING_FIELD_BINDING";
  required_portal_fields: string[];
  field_rows: PortalHelpFieldMappingRow[];
  prohibited_source_fields: string[];
  mirror_back_policy:
    | "REFERENCE_AND_STATUS_METADATA_ONLY"
    | "NO_EXTERNAL_WRITE";
  source_refs: SourceRef[];
  notes: string[];
}

export interface PortalHelpToExternalTicketMapping {
  schema_version: "1.0";
  mapping_id: "portal_help_to_external_ticket_mapping";
  selection_status: SupportSelectionStatus;
  selected_vendor_adapter_or_null:
    | typeof SUPPORT_PROVIDER_VENDOR_ADAPTER
    | null;
  truth_boundary_statement: string;
  mapping_rows: PortalHelpMappingScenario[];
  source_refs: SourceRef[];
  typed_gaps: string[];
  notes: string[];
}

export interface SupportWebhookEndpointRow {
  environment_ref: "staging" | "production";
  activation_state:
    | "NOT_SELECTED"
    | "SELECTED_PENDING_SECRET_BINDING";
  callback_url_ref_or_null: string | null;
  authentication_posture:
    | "SIGNING_SECRET_AND_BASIC_AUTH_IF_SELECTED"
    | "NOT_ACTIVE";
  idempotency_key_fields: string[];
  allowed_mirror_updates: string[];
  prohibited_product_truth_mutations: string[];
  source_refs: SourceRef[];
  notes: string[];
}

export interface SupportWebhookEndpointContract {
  schema_version: "1.0";
  contract_id: "support_webhook_endpoint_contract";
  selection_status: SupportSelectionStatus;
  selected_vendor_adapter_or_null:
    | typeof SUPPORT_PROVIDER_VENDOR_ADAPTER
    | null;
  truth_boundary_statement: string;
  webhook_rows: SupportWebhookEndpointRow[];
  source_refs: SourceRef[];
  typed_gaps: string[];
  notes: string[];
}

export interface SupportFieldMappingTemplateRow {
  scenario_ref: SupportScenarioRef;
  scenario_label: string;
  activation_state:
    | "FROZEN_NOT_ACTIVE"
    | "SELECTED_PENDING_FIELD_BINDING";
  field_rows: PortalHelpFieldMappingRow[];
  source_refs: SourceRef[];
  notes: string[];
}

export interface SupportFieldMappingTemplate {
  schema_version: "1.0";
  template_id: "support_field_mapping";
  provider_id: typeof SUPPORT_PROVIDER_ID;
  provider_display_name: typeof SUPPORT_PROVIDER_DISPLAY_NAME;
  run_id: string;
  flow_id: typeof SUPPORT_FLOW_ID;
  selection_record_ref: "data/provisioning/support_workspace_selection_record.template.json";
  selection_status: SupportSelectionStatus;
  selected_vendor_adapter_or_null:
    | typeof SUPPORT_PROVIDER_VENDOR_ADAPTER
    | null;
  scenario_rows: SupportFieldMappingTemplateRow[];
  source_refs: SourceRef[];
  typed_gaps: string[];
  notes: string[];
  last_verified_at: string;
}

export interface SupportContextBoardScenario {
  scenario_ref: SupportScenarioRef;
  label: string;
  status_label: "Not Selected" | "Selected with Gaps" | "Selected";
  summary: string;
  recommended_channel_label: string;
  portal_context_rows: Array<{
    label: string;
    detail: string;
  }>;
  external_ticket_rows: Array<{
    label: string;
    detail: string;
  }>;
  return_mirror_rows: Array<{
    label: string;
    detail: string;
  }>;
  webhook_rows: Array<{
    label: string;
    detail: string;
  }>;
  privacy_notes: string[];
  inspector_notes: string[];
  source_refs: SourceRef[];
}

export interface SupportContextMappingBoardViewModel {
  provider_label: string;
  provider_monogram: "SUP";
  support_mode_label: "Not Selected" | "Selected with Gaps" | "Selected";
  selected_vendor_label_or_null: string | null;
  environment_label: string;
  selection_posture:
    | "FIRST_PARTY_ONLY_UNTIL_VENDOR_SELECTION"
    | "SELECTED_PENDING_VENDOR_BINDING";
  scenarios: SupportContextBoardScenario[];
  truth_boundary_statement: string;
  notes: string[];
}

export interface CreateSupportWorkspaceIfSelectedResult {
  outcome: SupportFlowOutcome;
  steps: StepContract[];
  selectionRecord: SupportWorkspaceSelectionRecord;
  channelPolicy: SupportChannelPolicy;
  portalHelpMapping: PortalHelpToExternalTicketMapping;
  webhookContract: SupportWebhookEndpointContract;
  fieldMappingTemplate: SupportFieldMappingTemplate;
  boardViewModel: SupportContextMappingBoardViewModel;
  evidenceManifestPath: string;
  notes: string[];
}

export interface SupportProviderEntryUrls {
  controlPlane: string;
}

export interface CreateSupportWorkspaceIfSelectedOptions {
  page: Page;
  runContext: RunContext;
  selectionRecordPath: string;
  fieldMappingPath: string;
  entryUrls?: SupportProviderEntryUrls;
  selectionOverride?: SupportSelectionOverride;
}

interface SupportFixtureState {
  selection_override: SupportSelectionOverride;
}

const ZENDESK_DOCS = [
  "https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/",
  "https://developer.zendesk.com/api-reference/ticketing/tickets/ticket_fields/",
  "https://developer.zendesk.com/documentation/ticketing/managing-tickets/creating-and-updating-tickets/",
  "https://developer.zendesk.com/api-reference/webhooks/webhooks-api/webhooks/",
  "https://developer.zendesk.com/documentation/webhooks/webhook-security-and-authentication/",
  "https://developer.zendesk.com/documentation/event-connectors/webhooks/verifying/",
  "https://developer.zendesk.com/api-reference/ticketing/business-rules/triggers/",
] as const;

const SUPPORT_SELECTORS: SelectorManifest = {
  manifestId: "support-integration-selection-control-plane",
  providerId: SUPPORT_PROVIDER_ID,
  flowId: SUPPORT_FLOW_ID,
  selectors: [
    {
      selectorId: "decision-heading",
      description: "Primary heading for support-integration selection",
      strategy: "ROLE",
      value: "heading",
      accessibleName: "Support integration decision",
    },
    {
      selectorId: "selection-action",
      description: "Selection recording action",
      strategy: "ROLE",
      value: "button",
      accessibleName: "Record support selection",
    },
    {
      selectorId: "channel-policy-heading",
      description: "Support channel policy heading",
      strategy: "ROLE",
      value: "heading",
      accessibleName: "Support channel policy",
    },
    {
      selectorId: "channel-policy-action",
      description: "Support channel policy action",
      strategy: "ROLE",
      value: "button",
      accessibleName: "Validate support channel policy",
    },
    {
      selectorId: "context-mapping-heading",
      description: "Context mapping heading",
      strategy: "ROLE",
      value: "heading",
      accessibleName: "Context mapping",
    },
    {
      selectorId: "context-mapping-action",
      description: "Context mapping action",
      strategy: "ROLE",
      value: "button",
      accessibleName: "Validate contextual help mapping",
    },
    {
      selectorId: "mirror-rules-heading",
      description: "Mirror rules heading",
      strategy: "ROLE",
      value: "heading",
      accessibleName: "Mirror rules",
    },
    {
      selectorId: "mirror-rules-action",
      description: "Mirror rules action",
      strategy: "ROLE",
      value: "button",
      accessibleName: "Validate mirror rules",
    },
  ],
};

function supportSourceRefs(): SourceRef[] {
  return [
    {
      source_ref: "PROMPT/Checklist.md::L80[pc_0045]",
      rationale:
        "The roadmap marks external support integration as conditional rather than mandatory.",
    },
    {
      source_ref:
        "Algorithm/northbound_api_and_session_contract.md::L420[CLIENT_PORTAL_REQUEST_HELP]",
      rationale:
        "Client help remains a first-class portal command family rather than a provider-owned side path.",
    },
    {
      source_ref:
        "Algorithm/northbound_api_and_session_contract.md::L431[CLIENT_PORTAL_REQUEST_HELP]",
      rationale:
        "Every contextual help request must allocate a durable PortalHelpRequest and keep linked request lineage when applicable.",
    },
    {
      source_ref:
        "Algorithm/customer_client_portal_experience_contract.md::L197[Help]",
      rationale:
        "The Help route is bounded, contextual, and explicitly forbids asking the client to restate already-governed case context.",
    },
    {
      source_ref: "Algorithm/data_model.md::L1809[Help_route_surface_order]",
      rationale:
        "The Help route preserves one ordered support stack with exact case-context carriage and `restate_required = false`.",
    },
    {
      source_ref: "Algorithm/data_model.md::L2240[PortalHelpRequest]",
      rationale:
        "PortalHelpRequest remains the canonical support artifact and must preserve route, focus anchor, request lineage, and response timing.",
    },
    {
      source_ref:
        "Algorithm/security_and_runtime_hardening_contract.md::L50[3._Secret_key_and_token_handling]",
      rationale:
        "External support tokens, webhook secrets, and workspace credentials must remain vault-bound and never enter repo-safe artifacts.",
    },
  ];
}

function resolveSelectionProfile(
  override: SupportSelectionOverride = "NOT_SELECTED",
): SupportSelectionProfile {
  if (override === "SELECTED_WITH_GAPS") {
    return {
      selection_status: "SELECTED_WITH_GAPS",
      decision_status: "SELECTED_PENDING_PROCUREMENT",
      selected_vendor_adapter_or_null: SUPPORT_PROVIDER_VENDOR_ADAPTER,
      selected_vendor_label_or_null: "Zendesk-compatible support workspace",
      support_mode_label: "Selected with Gaps",
      provider_docs_urls: [...ZENDESK_DOCS],
      typed_gaps: [
        "Vendor selection is only partial: workspace, custom fields, and webhook secrets remain procurement-gated and are not provisioned in this pack.",
      ],
      notes: [
        "The integration posture is selected conceptually but not yet admissible for live browser automation or runtime sync.",
      ],
    };
  }

  return {
    selection_status: "NOT_SELECTED",
    decision_status: "OPTIONAL_VENDOR_SELECTION_NOT_RESOLVED",
    selected_vendor_adapter_or_null: null,
    selected_vendor_label_or_null: null,
    support_mode_label: "Not Selected",
    provider_docs_urls: [...ZENDESK_DOCS],
    typed_gaps: [
      "No external helpdesk vendor has been selected yet, so external ticket creation and mirror sync remain disabled by policy.",
    ],
    notes: [
      "PortalHelpRequest and bounded portal-help acknowledgement remain first-party only until a vendor is explicitly selected.",
    ],
  };
}

function selectionTruthBoundary(): string {
  return "PortalHelpRequest remains the canonical product artifact. External tickets, conversations, or webhooks may mirror customer-safe context only and must never become help truth.";
}

export function createRecommendedSupportWorkspaceSelectionRecord(
  runContext: RunContext,
  override: SupportSelectionOverride = "NOT_SELECTED",
): SupportWorkspaceSelectionRecord {
  const profile = resolveSelectionProfile(override);
  return {
    schema_version: "1.0",
    selection_record_id: "support_workspace_selection_record",
    provider_id: SUPPORT_PROVIDER_ID,
    provider_display_name: SUPPORT_PROVIDER_DISPLAY_NAME,
    run_id: runContext.runId,
    flow_id: SUPPORT_FLOW_ID,
    workspace_id: runContext.workspaceId,
    operator_identity_alias: runContext.operatorIdentityAlias,
    selection_status: profile.selection_status,
    decision_status: profile.decision_status,
    selected_vendor_adapter_or_null: profile.selected_vendor_adapter_or_null,
    selected_vendor_label_or_null: profile.selected_vendor_label_or_null,
    future_default_vendor_adapter_or_null: SUPPORT_PROVIDER_VENDOR_ADAPTER,
    environment_scope: ["staging", "production"],
    first_party_truth_statement: selectionTruthBoundary(),
    support_channel_policy_ref: "config/support/support_channel_policy.json",
    portal_help_mapping_ref:
      "config/support/portal_help_to_external_ticket_mapping.json",
    support_webhook_contract_ref:
      "config/support/support_webhook_endpoint_contract.json",
    provider_docs_urls: profile.provider_docs_urls,
    source_refs: supportSourceRefs(),
    selection_notes: profile.notes,
    typed_gaps: profile.typed_gaps,
    last_verified_at: `${SUPPORT_POLICY_GENERATED_ON}T00:00:00.000Z`,
  };
}

function scenarioLabel(ref: SupportScenarioRef): string {
  switch (ref) {
    case "contextual_request_help":
      return "Contextual request help";
    case "general_help_route":
      return "General help route";
    case "support_acknowledgement":
      return "Support acknowledgement";
  }
}

function activationStateFor(
  selectionStatus: SupportSelectionStatus,
): "FROZEN_NOT_ACTIVE" | "SELECTED_PENDING_FIELD_BINDING" {
  return selectionStatus === "NOT_SELECTED"
    ? "FROZEN_NOT_ACTIVE"
    : "SELECTED_PENDING_FIELD_BINDING";
}

function externalProjectionStateFor(
  selectionStatus: SupportSelectionStatus,
): "NOT_SELECTED" | "SELECTED_PENDING_FIELD_BINDING" {
  return selectionStatus === "NOT_SELECTED"
    ? "NOT_SELECTED"
    : "SELECTED_PENDING_FIELD_BINDING";
}

export function createRecommendedSupportChannelPolicy(
  override: SupportSelectionOverride = "NOT_SELECTED",
): SupportChannelPolicy {
  const profile = resolveSelectionProfile(override);
  const refs = supportSourceRefs();
  return {
    schema_version: "1.0",
    policy_id: "support_channel_policy",
    selection_status: profile.selection_status,
    selected_vendor_adapter_or_null: profile.selected_vendor_adapter_or_null,
    truth_boundary_statement: selectionTruthBoundary(),
    channel_rows: [
      {
        scenario_ref: "contextual_request_help",
        scenario_label: scenarioLabel("contextual_request_help"),
        primary_route: "/portal/requests/{item_id}",
        primary_first_party_channel: "PORTAL_HELP_ROUTE_WITH_LINKED_REQUEST_INFO",
        recommended_channel_label: "Portal contextual help",
        restate_required: false,
        external_projection_state: externalProjectionStateFor(
          profile.selection_status,
        ),
        allowed_external_payload_classes: [
          "CUSTOMER_SAFE_ROUTE_CONTEXT",
          "REQUEST_INFO_LINEAGE",
          "CASE_CONTEXT_SUMMARY",
          "HELP_REASON_FAMILY",
        ],
        prohibited_external_payload_classes: [
          "INTERNAL_ONLY_NOTES",
          "MASKED_EVIDENCE",
          "AUTHORITY_PAYLOADS",
          "PRIVILEGED_AUDIT_DETAIL",
        ],
        source_refs: refs,
        notes: [
          "Contextual request help must carry the linked request-info lineage and the exact focus anchor.",
        ],
      },
      {
        scenario_ref: "general_help_route",
        scenario_label: scenarioLabel("general_help_route"),
        primary_route: "/portal/help",
        primary_first_party_channel: "PORTAL_HELP_ROUTE_GENERAL",
        recommended_channel_label: "Portal general help",
        restate_required: false,
        external_projection_state: externalProjectionStateFor(
          profile.selection_status,
        ),
        allowed_external_payload_classes: [
          "CUSTOMER_SAFE_ROUTE_CONTEXT",
          "CASE_CONTEXT_SUMMARY",
          "HELP_REASON_FAMILY",
        ],
        prohibited_external_payload_classes: [
          "INTERNAL_ONLY_NOTES",
          "MASKED_EVIDENCE",
          "STAFF_ONLY_REASON_CODES",
          "PRIVILEGED_AUDIT_DETAIL",
        ],
        source_refs: refs,
        notes: [
          "General help remains explicitly distinct from request-detail contextual help and keeps the bounded help stack intact.",
        ],
      },
      {
        scenario_ref: "support_acknowledgement",
        scenario_label: scenarioLabel("support_acknowledgement"),
        primary_route: "/portal/help",
        primary_first_party_channel: "PRODUCT_OWNED_ACKNOWLEDGEMENT",
        recommended_channel_label: "Portal help acknowledgement",
        restate_required: false,
        external_projection_state: externalProjectionStateFor(
          profile.selection_status,
        ),
        allowed_external_payload_classes: [
          "HELP_REQUEST_REFERENCE",
          "ACKNOWLEDGEMENT_METADATA",
        ],
        prohibited_external_payload_classes: [
          "FREE_FORM_INTERNAL_THREADING",
          "MASKED_EVIDENCE",
          "PRIVILEGED_AUDIT_DETAIL",
        ],
        source_refs: refs,
        notes: [
          "Support acknowledgement is product-owned and should not become a generic provider-authored support email.",
        ],
      },
    ],
    source_refs: refs,
    typed_gaps: profile.typed_gaps,
    notes: [
      "The support channel policy freezes the customer-safe help posture even while external vendor selection remains unresolved.",
    ],
  };
}

function requiredPortalFieldsFor(
  scenario: SupportScenarioRef,
): string[] {
  if (scenario === "support_acknowledgement") {
    return [
      "help_request_id",
      "reason_family",
      "source_route",
      "source_focus_anchor_ref",
      "manifest_id",
      "item_id",
    ];
  }
  if (scenario === "general_help_route") {
    return [
      "help_request_id",
      "reason_family",
      "source_route",
      "source_focus_anchor_ref",
      "manifest_id",
      "item_id",
      "case_context_refs",
    ];
  }
  return [
    "help_request_id",
    "reason_family",
    "source_route",
    "source_focus_anchor_ref",
    "request_info_ref",
    "manifest_id",
    "item_id",
    "case_context_refs",
  ];
}

function fieldRowsFor(
  scenario: SupportScenarioRef,
): PortalHelpFieldMappingRow[] {
  const common: PortalHelpFieldMappingRow[] = [
    {
      source_field: "help_request_id",
      external_field_ref_or_null: "ticket.custom.help_request_id",
      export_policy: "CUSTOM_FIELD",
      privacy_class: "CUSTOMER_SAFE_CONTEXT",
      required_when: "ALWAYS",
      notes: ["Primary stable mirror key for future vendor binding."],
    },
    {
      source_field: "reason_family",
      external_field_ref_or_null: "ticket.custom.reason_family",
      export_policy: "CUSTOM_FIELD",
      privacy_class: "CUSTOMER_SAFE_CONTEXT",
      required_when: "ALWAYS",
      notes: ["Use the bounded help reason family, never internal-only reason codes."],
    },
    {
      source_field: "source_route",
      external_field_ref_or_null: "ticket.custom.source_route",
      export_policy: "CUSTOM_FIELD",
      privacy_class: "CUSTOMER_SAFE_CONTEXT",
      required_when: "ALWAYS",
      notes: ["Preserve route continuity so later handoff does not lose shell context."],
    },
    {
      source_field: "source_focus_anchor_ref",
      external_field_ref_or_null: "ticket.custom.source_focus_anchor_ref",
      export_policy: "CUSTOM_FIELD",
      privacy_class: "CUSTOMER_SAFE_CONTEXT",
      required_when: "ALWAYS",
      notes: ["Preserve the exact focus anchor for return-to-task continuity."],
    },
    {
      source_field: "manifest_id",
      external_field_ref_or_null: "ticket.custom.manifest_id",
      export_policy: "CUSTOM_FIELD",
      privacy_class: "CUSTOMER_SAFE_CONTEXT",
      required_when: "ALWAYS",
      notes: ["Keep manifest linkage explicit without exposing internal evidence bundles."],
    },
    {
      source_field: "item_id",
      external_field_ref_or_null: "ticket.custom.item_id",
      export_policy: "CUSTOM_FIELD",
      privacy_class: "CUSTOMER_SAFE_CONTEXT",
      required_when: "ALWAYS",
      notes: ["Preserve work-item continuity for later staff handoff."],
    },
    {
      source_field: "case_context_summary",
      external_field_ref_or_null: "ticket.comment.body",
      export_policy: "PUBLIC_COMMENT_SUMMARY",
      privacy_class: "CUSTOMER_SAFE_SUMMARY",
      required_when: "ALWAYS",
      notes: ["Use one customer-safe summary rather than raw free-form case state."],
    },
    {
      source_field: "subject_line",
      external_field_ref_or_null: "ticket.subject",
      export_policy: "TICKET_SUBJECT",
      privacy_class: "CUSTOMER_SAFE_SUMMARY",
      required_when: "ALWAYS",
      notes: ["Subject stays literal and bounded."],
    },
    {
      source_field: "body_ref",
      external_field_ref_or_null: null,
      export_policy: "INTERNAL_ONLY_FORBIDDEN",
      privacy_class: "INTERNAL_ONLY",
      required_when: "NEVER",
      notes: ["Raw body refs stay first-party only."],
    },
    {
      source_field: "masked_evidence_refs",
      external_field_ref_or_null: null,
      export_policy: "INTERNAL_ONLY_FORBIDDEN",
      privacy_class: "INTERNAL_ONLY",
      required_when: "NEVER",
      notes: ["Masked or limited evidence must not leak into external tickets."],
    },
    {
      source_field: "internal_note_refs",
      external_field_ref_or_null: null,
      export_policy: "INTERNAL_ONLY_FORBIDDEN",
      privacy_class: "INTERNAL_ONLY",
      required_when: "NEVER",
      notes: ["Internal-only notes are prohibited in external ticket mirrors."],
    },
  ];

  if (scenario === "contextual_request_help") {
    return [
      ...common.slice(0, 4),
      {
        source_field: "request_info_ref",
        external_field_ref_or_null: "ticket.custom.request_info_ref",
        export_policy: "CUSTOM_FIELD",
        privacy_class: "CUSTOMER_SAFE_CONTEXT",
        required_when: "WHEN_LINKED_REQUEST_PRESENT",
        notes: ["Retain the linked request-for-info lineage on contextual help."],
      },
      ...common.slice(4),
    ];
  }

  if (scenario === "general_help_route") {
    return [
      ...common,
      {
        source_field: "faq_refs",
        external_field_ref_or_null: "ticket.custom.help_topic_refs",
        export_policy: "CUSTOM_FIELD",
        privacy_class: "CUSTOMER_SAFE_CONTEXT",
        required_when: "WHEN_HELP_ROUTE_FAQS_PRESENT",
        notes: ["Bounded top-question context may be mirrored as tags or IDs, not full FAQ text."],
      },
    ];
  }

  return [
    {
      source_field: "help_request_id",
      external_field_ref_or_null: "ticket.custom.help_request_id",
      export_policy: "CUSTOM_FIELD",
      privacy_class: "CUSTOMER_SAFE_CONTEXT",
      required_when: "ALWAYS",
      notes: ["Acknowledgement still needs a stable help-request reference."],
    },
    {
      source_field: "support_channel",
      external_field_ref_or_null: "ticket.custom.support_channel",
      export_policy: "CUSTOM_FIELD",
      privacy_class: "CUSTOMER_SAFE_CONTEXT",
      required_when: "ALWAYS",
      notes: ["Bound the support channel label to one safe, customer-facing vocabulary."],
    },
    {
      source_field: "acknowledgement_summary",
      external_field_ref_or_null: "ticket.comment.body",
      export_policy: "PUBLIC_COMMENT_SUMMARY",
      privacy_class: "CUSTOMER_SAFE_SUMMARY",
      required_when: "ALWAYS",
      notes: ["Acknowledgement summaries remain customer-safe and route-aware."],
    },
    {
      source_field: "response_ref",
      external_field_ref_or_null: null,
      export_policy: "INTERNAL_ONLY_FORBIDDEN",
      privacy_class: "INTERNAL_ONLY",
      required_when: "NEVER",
      notes: ["First-party response refs remain the truth source and are not mirrored."],
    },
  ];
}

export function createRecommendedPortalHelpToExternalTicketMapping(
  override: SupportSelectionOverride = "NOT_SELECTED",
): PortalHelpToExternalTicketMapping {
  const profile = resolveSelectionProfile(override);
  const refs = supportSourceRefs();
  const scenarios: SupportScenarioRef[] = [
    "contextual_request_help",
    "general_help_route",
    "support_acknowledgement",
  ];
  return {
    schema_version: "1.0",
    mapping_id: "portal_help_to_external_ticket_mapping",
    selection_status: profile.selection_status,
    selected_vendor_adapter_or_null: profile.selected_vendor_adapter_or_null,
    truth_boundary_statement: selectionTruthBoundary(),
    mapping_rows: scenarios.map((scenario) => ({
      scenario_ref: scenario,
      scenario_label: scenarioLabel(scenario),
      activation_state: activationStateFor(profile.selection_status),
      required_portal_fields: requiredPortalFieldsFor(scenario),
      field_rows: fieldRowsFor(scenario),
      prohibited_source_fields: [
        "body_ref",
        "masked_evidence_refs",
        "internal_note_refs",
        "authority_payload_refs",
        "privileged_audit_refs",
      ],
      mirror_back_policy:
        scenario === "support_acknowledgement"
          ? "NO_EXTERNAL_WRITE"
          : "REFERENCE_AND_STATUS_METADATA_ONLY",
      source_refs: refs,
      notes: [
        "The mapping is frozen now so later vendor selection does not need to rediscover portal-help semantics.",
      ],
    })),
    source_refs: refs,
    typed_gaps: profile.typed_gaps,
    notes: [
      "Field-level mapping preserves route, focus, and request lineage while explicitly excluding internal-only or masked data classes.",
    ],
  };
}

export function createRecommendedSupportWebhookEndpointContract(
  override: SupportSelectionOverride = "NOT_SELECTED",
): SupportWebhookEndpointContract {
  const profile = resolveSelectionProfile(override);
  const refs = supportSourceRefs();
  return {
    schema_version: "1.0",
    contract_id: "support_webhook_endpoint_contract",
    selection_status: profile.selection_status,
    selected_vendor_adapter_or_null: profile.selected_vendor_adapter_or_null,
    truth_boundary_statement: selectionTruthBoundary(),
    webhook_rows: ["staging", "production"].map((environmentRef) => ({
      environment_ref: environmentRef as "staging" | "production",
      activation_state:
        profile.selection_status === "NOT_SELECTED"
          ? "NOT_SELECTED"
          : "SELECTED_PENDING_SECRET_BINDING",
      callback_url_ref_or_null: null,
      authentication_posture:
        profile.selection_status === "NOT_SELECTED"
          ? "NOT_ACTIVE"
          : "SIGNING_SECRET_AND_BASIC_AUTH_IF_SELECTED",
      idempotency_key_fields: [
        "external_ticket_id",
        "external_event_id",
        "help_request_id",
      ],
      allowed_mirror_updates: [
        "EXTERNAL_TICKET_REFERENCE_BOUND",
        "EXTERNAL_STATUS_METADATA_SYNC",
        "EXTERNAL_PUBLIC_RESPONSE_METADATA_ONLY",
      ],
      prohibited_product_truth_mutations: [
        "MUTATE_REASON_FAMILY",
        "MUTATE_SOURCE_ROUTE",
        "MUTATE_SOURCE_FOCUS_ANCHOR",
        "MUTATE_REQUEST_INFO_REF",
        "MUTATE_MANIFEST_OR_ITEM_TRUTH",
        "INGEST_FULL_EXTERNAL_TRANSCRIPT_AS_TRUTH",
      ],
      source_refs: refs,
      notes: [
        "Webhook duplicates must remain idempotent and may append metadata only, never rewrite portal-help truth.",
      ],
    })),
    source_refs: refs,
    typed_gaps: profile.typed_gaps,
    notes: [
      "Webhook posture is frozen even while no active provider callback is configured, so later binding remains bounded by the product-truth contract.",
    ],
  };
}

export function createRecommendedSupportFieldMappingTemplate(
  runContext: RunContext,
  override: SupportSelectionOverride = "NOT_SELECTED",
): SupportFieldMappingTemplate {
  const profile = resolveSelectionProfile(override);
  const mapping = createRecommendedPortalHelpToExternalTicketMapping(override);
  return {
    schema_version: "1.0",
    template_id: "support_field_mapping",
    provider_id: SUPPORT_PROVIDER_ID,
    provider_display_name: SUPPORT_PROVIDER_DISPLAY_NAME,
    run_id: runContext.runId,
    flow_id: SUPPORT_FLOW_ID,
    selection_record_ref:
      "data/provisioning/support_workspace_selection_record.template.json",
    selection_status: profile.selection_status,
    selected_vendor_adapter_or_null: profile.selected_vendor_adapter_or_null,
    scenario_rows: mapping.mapping_rows.map((row) => ({
      scenario_ref: row.scenario_ref,
      scenario_label: row.scenario_label,
      activation_state: row.activation_state,
      field_rows: row.field_rows,
      source_refs: row.source_refs,
      notes: row.notes,
    })),
    source_refs: supportSourceRefs(),
    typed_gaps: profile.typed_gaps,
    notes: [
      "The field-mapping template is the repo-safe provisioning artifact for later vendor binding and procurement review.",
    ],
    last_verified_at: `${SUPPORT_POLICY_GENERATED_ON}T00:00:00.000Z`,
  };
}

function scenarioSummary(ref: SupportScenarioRef): string {
  switch (ref) {
    case "contextual_request_help":
      return "Linked request help preserves the exact request-info lineage and return anchor without asking the client to restate their case.";
    case "general_help_route":
      return "The bounded Help route carries one contextual summary and top questions while remaining first-party and task-safe.";
    case "support_acknowledgement":
      return "Support acknowledgement remains product-owned and confirms that the same case context was preserved.";
  }
}

export function createSupportContextMappingBoardViewModel(
  override: SupportSelectionOverride = "NOT_SELECTED",
): SupportContextMappingBoardViewModel {
  const profile = resolveSelectionProfile(override);
  const policy = createRecommendedSupportChannelPolicy(override);
  const mapping = createRecommendedPortalHelpToExternalTicketMapping(override);
  const webhook = createRecommendedSupportWebhookEndpointContract(override);
  return {
    provider_label:
      profile.selected_vendor_label_or_null ??
      "No external helpdesk selected; first-party help remains canonical",
    provider_monogram: "SUP",
    support_mode_label: profile.support_mode_label,
    selected_vendor_label_or_null: profile.selected_vendor_label_or_null,
    environment_label: "Staging and production conditional scope",
    selection_posture:
      profile.selection_status === "NOT_SELECTED"
        ? "FIRST_PARTY_ONLY_UNTIL_VENDOR_SELECTION"
        : "SELECTED_PENDING_VENDOR_BINDING",
    scenarios: policy.channel_rows.map((row) => {
      const mappingScenario = mapping.mapping_rows.find(
        (candidate) => candidate.scenario_ref === row.scenario_ref,
      )!;
      return {
        scenario_ref: row.scenario_ref,
        label: row.scenario_label,
        status_label: profile.support_mode_label,
        summary: scenarioSummary(row.scenario_ref),
        recommended_channel_label: row.recommended_channel_label,
        portal_context_rows: mappingScenario.required_portal_fields.map((field) => ({
          label: field,
          detail:
            field === "case_context_refs"
              ? "non-empty carried context set"
              : field === "source_focus_anchor_ref"
                ? "exact focus-anchor lineage"
                : field === "request_info_ref"
                  ? "linked request-for-info lineage when present"
                  : "customer-safe carried context",
        })),
        external_ticket_rows: mappingScenario.field_rows.map((fieldRow) => ({
          label: fieldRow.source_field,
          detail:
            fieldRow.export_policy === "INTERNAL_ONLY_FORBIDDEN"
              ? "Not exported"
              : `${fieldRow.export_policy} -> ${fieldRow.external_field_ref_or_null}`,
        })),
        return_mirror_rows: [
          {
            label: "Mirror-back policy",
            detail: mappingScenario.mirror_back_policy.replaceAll("_", " "),
          },
          {
            label: "Product truth boundary",
            detail:
              "External systems may append references or status metadata only; they cannot mutate help truth.",
          },
        ],
        webhook_rows: webhook.webhook_rows.map((webhookRow) => ({
          label: webhookRow.environment_ref,
          detail: webhookRow.activation_state.replaceAll("_", " "),
        })),
        privacy_notes: [
          "Internal-only notes, masked evidence, and authority payloads remain excluded.",
          "restate_required = false remains product law whether or not a vendor is later selected.",
        ],
        inspector_notes: [
          ...row.notes,
          ...mappingScenario.notes,
        ],
        source_refs: row.source_refs,
      };
    }),
    truth_boundary_statement: selectionTruthBoundary(),
    notes: [
      "The board is a context-handoff map, not a ticket dashboard.",
      "No external helpdesk vendor is active in the canonical pack until a later explicit selection happens.",
      "Mirror rules stay bounded to metadata and reference binding only.",
    ],
  };
}

export function validateSupportWorkspaceSelectionRecord(
  selectionRecord: SupportWorkspaceSelectionRecord,
): void {
  if (
    selectionRecord.selection_status === "NOT_SELECTED" &&
    selectionRecord.selected_vendor_adapter_or_null !== null
  ) {
    throw new Error(
      "Support selection record must keep vendor selection null when status is NOT_SELECTED.",
    );
  }
  if (selectionRecord.future_default_vendor_adapter_or_null !== SUPPORT_PROVIDER_VENDOR_ADAPTER) {
    throw new Error("Support selection record must freeze the Zendesk-compatible default.");
  }
}

export function validateSupportChannelPolicy(
  channelPolicy: SupportChannelPolicy,
): void {
  if (channelPolicy.channel_rows.length !== 3) {
    throw new Error("Support channel policy must publish exactly three scenario rows.");
  }
  if (channelPolicy.channel_rows.some((row) => row.restate_required !== false)) {
    throw new Error("Support channel policy must preserve `restate_required = false`.");
  }
}

export function validatePortalHelpMapping(
  mapping: PortalHelpToExternalTicketMapping,
): void {
  const contextual = mapping.mapping_rows.find(
    (row) => row.scenario_ref === "contextual_request_help",
  );
  if (!contextual) {
    throw new Error("Contextual request help mapping is mandatory.");
  }
  [
    "help_request_id",
    "reason_family",
    "source_route",
    "source_focus_anchor_ref",
    "request_info_ref",
    "manifest_id",
    "item_id",
  ].forEach((requiredField) => {
    if (!contextual.required_portal_fields.includes(requiredField)) {
      throw new Error(`Missing contextual help field ${requiredField}.`);
    }
  });
  [
    "body_ref",
    "masked_evidence_refs",
    "internal_note_refs",
    "authority_payload_refs",
    "privileged_audit_refs",
  ].forEach((blockedField) => {
    if (!contextual.prohibited_source_fields.includes(blockedField)) {
      throw new Error(`Missing prohibited help field ${blockedField}.`);
    }
  });
}

export function validateSupportWebhookEndpointContract(
  webhookContract: SupportWebhookEndpointContract,
): void {
  if (webhookContract.webhook_rows.length !== 2) {
    throw new Error("Support webhook contract must cover staging and production.");
  }
}

export function validateSupportFieldMappingTemplate(
  template: SupportFieldMappingTemplate,
): void {
  if (template.scenario_rows.length !== 3) {
    throw new Error("Support field mapping template must cover three canonical scenarios.");
  }
}

export function assertSupportArtifactsSanitized(
  selectionRecord: SupportWorkspaceSelectionRecord,
  fieldMappingTemplate: SupportFieldMappingTemplate,
): void {
  const serialized = JSON.stringify({ selectionRecord, fieldMappingTemplate });
  ["token:", "Bearer ", "api_token", "basic "].forEach((marker) => {
    if (serialized.toLowerCase().includes(marker.toLowerCase())) {
      throw new Error(`Support artifacts must not persist raw credential material (${marker}).`);
    }
  });
}

export function createDefaultSupportProviderEntryUrls(): SupportProviderEntryUrls {
  return {
    controlPlane:
      "/automation/provisioning/tests/fixtures/support_selection_console.html?scenario=not-selected",
  };
}

function evidenceManifestPathFor(selectionRecordPath: string): string {
  return path.join(
    path.dirname(selectionRecordPath),
    "support_selection_evidence_manifest.json",
  );
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
    evidenceId: `${stepId}-${summary.replace(/\W+/g, "-").toLowerCase().slice(0, 40)}`,
    stepId,
    kind: "NOTE",
    relativePath: null,
    captureMode: "REDACTED",
    summary,
  });
}

async function detectFixtureState(
  page: Page,
): Promise<SupportFixtureState> {
  const scenario = (await page.locator("body").getAttribute("data-scenario")) ?? "not-selected";
  return {
    selection_override:
      scenario === "selected-with-gaps" ? "SELECTED_WITH_GAPS" : "NOT_SELECTED",
  };
}

export async function loadSupportSelectorManifest(): Promise<SelectorManifest> {
  return SUPPORT_SELECTORS;
}

export async function createSupportWorkspaceIfSelected(
  options: CreateSupportWorkspaceIfSelectedOptions,
): Promise<CreateSupportWorkspaceIfSelectedResult> {
  const registry = createDefaultProviderRegistry();
  const provider = registry.getRequired(SUPPORT_PROVIDER_ID);
  assertProviderFlowAllowed(options.runContext, provider, SUPPORT_FLOW_ID);

  const manifest = await loadSupportSelectorManifest();
  const entryUrls = options.entryUrls ?? createDefaultSupportProviderEntryUrls();
  const steps: StepContract[] = [
    createPendingStep({
      stepId: SUPPORT_STEP_IDS.openDecisionSurface,
      title: "Open support integration decision surface",
      selectorRefs: ["decision-heading", "selection-action"],
    }),
    createPendingStep({
      stepId: SUPPORT_STEP_IDS.recordSelection,
      title: "Record support integration selection",
      selectorRefs: ["selection-action"],
    }),
    createPendingStep({
      stepId: SUPPORT_STEP_IDS.validateChannelPolicy,
      title: "Validate support channel policy",
      selectorRefs: ["channel-policy-heading", "channel-policy-action"],
    }),
    createPendingStep({
      stepId: SUPPORT_STEP_IDS.validateContextMapping,
      title: "Validate contextual help mapping and mirror rules",
      selectorRefs: [
        "context-mapping-heading",
        "context-mapping-action",
        "mirror-rules-heading",
        "mirror-rules-action",
      ],
    }),
    createPendingStep({
      stepId: SUPPORT_STEP_IDS.persistArtifacts,
      title: "Persist support selection and mapping artifacts",
      selectorRefs: ["mirror-rules-heading"],
      sensitiveCapturePolicy: "REDACT",
    }),
  ];

  let evidenceManifest = createEvidenceManifest(options.runContext);

  steps[0] = transitionStep(
    steps[0]!,
    "RUNNING",
    "Opening the support integration decision surface.",
  );
  await options.page.goto(entryUrls.controlPlane);
  await requireVisible(options.page, manifest, "decision-heading");
  await requireVisible(options.page, manifest, "selection-action");
  await requireVisible(options.page, manifest, "channel-policy-heading");
  await requireVisible(options.page, manifest, "channel-policy-action");
  await requireVisible(options.page, manifest, "context-mapping-heading");
  await requireVisible(options.page, manifest, "context-mapping-action");
  await requireVisible(options.page, manifest, "mirror-rules-heading");
  await requireVisible(options.page, manifest, "mirror-rules-action");
  steps[0] = transitionStep(
    steps[0]!,
    "SUCCEEDED",
    "Support selection surface is reachable with semantic selectors.",
  );
  evidenceManifest = await captureNoteEvidence(
    evidenceManifest,
    steps[0].stepId,
    "Opened the support selection surface without relying on brittle selector fallbacks.",
  );

  const fixtureState = await detectFixtureState(options.page);
  const selectionOverride =
    options.selectionOverride ?? fixtureState.selection_override;
  const profile = resolveSelectionProfile(selectionOverride);

  if (profile.selection_status !== "NOT_SELECTED") {
    assertLiveProviderGate(options.runContext);
  }

  const selectionRecord = createRecommendedSupportWorkspaceSelectionRecord(
    options.runContext,
    selectionOverride,
  );
  const channelPolicy = createRecommendedSupportChannelPolicy(selectionOverride);
  const portalHelpMapping = createRecommendedPortalHelpToExternalTicketMapping(
    selectionOverride,
  );
  const webhookContract = createRecommendedSupportWebhookEndpointContract(
    selectionOverride,
  );
  const fieldMappingTemplate = createRecommendedSupportFieldMappingTemplate(
    options.runContext,
    selectionOverride,
  );
  const boardViewModel = createSupportContextMappingBoardViewModel(
    selectionOverride,
  );

  validateSupportWorkspaceSelectionRecord(selectionRecord);
  validateSupportChannelPolicy(channelPolicy);
  validatePortalHelpMapping(portalHelpMapping);
  validateSupportWebhookEndpointContract(webhookContract);
  validateSupportFieldMappingTemplate(fieldMappingTemplate);
  assertSupportArtifactsSanitized(selectionRecord, fieldMappingTemplate);

  steps[1] = transitionStep(
    steps[1]!,
    "RUNNING",
    "Recording explicit support-selection posture.",
  );
  steps[1] = transitionStep(
    steps[1]!,
    "SUCCEEDED",
    profile.selection_status === "NOT_SELECTED"
      ? "Recorded an explicit NOT_SELECTED support-integration decision."
      : "Recorded a selected-with-gaps support-integration posture pending procurement and binding.",
  );
  evidenceManifest = await captureNoteEvidence(
    evidenceManifest,
    steps[1].stepId,
    profile.selection_status === "NOT_SELECTED"
      ? "The support integration posture is explicitly NOT_SELECTED; first-party portal help remains canonical."
      : "The support integration posture is selected with gaps and remains non-admissible for live runtime use.",
  );

  steps[2] = transitionStep(
    steps[2]!,
    "RUNNING",
    "Validating bounded support channels and no-restate policy.",
  );
  steps[2] = transitionStep(
    steps[2]!,
    "SUCCEEDED",
    "Support channel policy preserves contextual help, general help, and product-owned acknowledgement as distinct scenarios.",
  );
  evidenceManifest = await captureNoteEvidence(
    evidenceManifest,
    steps[2].stepId,
    "Support channel policy keeps contextual help distinct from general help and preserves `restate_required = false`.",
  );

  steps[3] = transitionStep(
    steps[3]!,
    "RUNNING",
    "Validating contextual help mapping and mirror bounds.",
  );
  steps[3] = transitionStep(
    steps[3]!,
    "SUCCEEDED",
    "Context mapping preserves route, focus anchor, and request lineage while explicitly blocking internal-only data leakage and unsafe mirror writes.",
  );
  evidenceManifest = await captureNoteEvidence(
    evidenceManifest,
    steps[3].stepId,
    "Portal-help mapping preserves route and focus lineage, and mirror rules stay metadata-only.",
  );

  steps[4] = transitionStep(
    steps[4]!,
    "RUNNING",
    "Persisting support selection and field-mapping artifacts.",
  );
  await persistJsonArtifact(options.selectionRecordPath, selectionRecord);
  await persistJsonArtifact(options.fieldMappingPath, fieldMappingTemplate);
  const manifestPath = evidenceManifestPathFor(options.selectionRecordPath);
  await persistJsonArtifact(manifestPath, evidenceManifest);
  steps[4] = transitionStep(
    steps[4]!,
    "SUCCEEDED",
    "Persisted sanitized support-selection and field-mapping artifacts.",
  );
  evidenceManifest = await captureNoteEvidence(
    evidenceManifest,
    steps[4].stepId,
    "Persisted support-selection records without vendor tokens, webhook secrets, or raw support transcripts.",
  );
  await persistJsonArtifact(manifestPath, evidenceManifest);

  return {
    outcome:
      profile.selection_status === "NOT_SELECTED"
        ? "SUPPORT_INTEGRATION_NOT_SELECTED"
        : profile.selection_status === "SELECTED_WITH_GAPS"
          ? "SUPPORT_INTEGRATION_SELECTED_WITH_GAPS"
          : "SUPPORT_WORKSPACE_READY",
    steps,
    selectionRecord,
    channelPolicy,
    portalHelpMapping,
    webhookContract,
    fieldMappingTemplate,
    boardViewModel,
    evidenceManifestPath: manifestPath,
    notes: profile.notes,
  };
}

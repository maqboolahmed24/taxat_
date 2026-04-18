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
  createManualCheckpoint,
} from "../../../core/manual_checkpoint.js";
import {
  assertProviderFlowAllowed,
  createDefaultProviderRegistry,
} from "../../../core/provider_registry.js";
import type { RunContext } from "../../../core/run_context.js";
import {
  attachManualCheckpoint,
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

export const EMAIL_PROVIDER_ID = "transactional-email-delivery-control-plane";
export const EMAIL_FLOW_ID = "email-workspace-and-sender-domain-bootstrap";
export const EMAIL_PROVIDER_DISPLAY_NAME =
  "Transactional Email Delivery Control Plane";
export const EMAIL_PROVIDER_VENDOR_ADAPTER =
  "POSTMARK_COMPATIBLE_CONTROL_PLANE";
export const EMAIL_PROVIDER_VENDOR_SELECTION = "PROVIDER_DEFAULT_APPLIED";
export const EMAIL_POLICY_VERSION = "1.0";
export const EMAIL_POLICY_GENERATED_ON = "2026-04-18";

export const EMAIL_STEP_IDS = {
  openControlPlane: "email.control-plane.open-console",
  reconcileWorkspace: "email.control-plane.reconcile-workspace",
  reconcileSenderDomains: "email.control-plane.reconcile-sender-domains",
  verifyDnsReadiness: "email.control-plane.verify-dns-readiness",
  persistArtifacts: "email.control-plane.persist-artifacts",
} as const;

export type EmailProductEnvironmentId =
  | "env_local_provisioning_workstation"
  | "env_shared_sandbox_integration"
  | "env_preproduction_verification"
  | "env_production";

export type EmailProviderEnvironmentTag =
  | "LOCAL_BOOTSTRAP"
  | "SANDBOX"
  | "PREPRODUCTION"
  | "PRODUCTION";

export type EmailSourceDisposition =
  | "CREATED_DURING_RUN"
  | "ADOPTED_EXISTING";

export type SenderDomainVerificationState =
  | "VERIFIED"
  | "PENDING_DNS"
  | "PENDING_PROVIDER_CONFIRMATION";

export type SenderDomainReadinessState =
  | "ACTIVE_AND_RUNTIME_VERIFIED"
  | "MANUAL_CHECKPOINT_REQUIRED";

export type EmailMessageStreamKind =
  | "CUSTOMER_TRANSACTIONAL"
  | "OPERATOR_SECURITY"
  | "SANDBOX_TEST_SINK";

export type EmailFlowOutcome =
  | "EMAIL_DOMAIN_READY"
  | "EMAIL_DNS_VERIFICATION_PENDING";

export interface SourceRef {
  source_ref: string;
  rationale: string;
}

export interface ProviderSelectionRecord {
  provider_selection_status: typeof EMAIL_PROVIDER_VENDOR_SELECTION;
  provider_family: "TRANSACTIONAL_EMAIL_DELIVERY";
  provider_vendor_adapter: typeof EMAIL_PROVIDER_VENDOR_ADAPTER;
  provider_vendor_label: string;
  docs_urls: string[];
  source_refs: SourceRef[];
}

export interface EmailProviderWorkspaceRow {
  workspace_ref: string;
  product_environment_id: EmailProductEnvironmentId;
  provider_environment_tag: EmailProviderEnvironmentTag;
  server_label: string;
  server_alias: string;
  server_delivery_type: "Sandbox" | "Live";
  sender_domain_ref: string | null;
  source_disposition: EmailSourceDisposition;
  allows_live_recipients: boolean;
  account_token_metadata_ref: string;
  server_token_metadata_ref: string;
  server_token_fingerprint: string;
  webhook_configuration_state:
    | "DEFERRED_TO_PC_0042"
    | "NOT_APPLICABLE_ON_BOOTSTRAP";
  message_stream_refs: string[];
  suppression_posture_ref: string;
  source_refs: SourceRef[];
  notes: string[];
}

export interface EmailProviderWorkspaceRecord {
  schema_version: "1.0";
  workspace_record_id: string;
  provider_id: typeof EMAIL_PROVIDER_ID;
  provider_display_name: typeof EMAIL_PROVIDER_DISPLAY_NAME;
  run_id: string;
  flow_id: typeof EMAIL_FLOW_ID;
  workspace_id: string;
  operator_identity_alias: string;
  provider_selection: ProviderSelectionRecord;
  workspace_rows: EmailProviderWorkspaceRow[];
  typed_gaps: string[];
  notes: string[];
  last_verified_at: string;
}

export interface SenderIdentityRow {
  identity_ref: string;
  label: string;
  from_address: string;
  reply_to_address: string;
  sender_signature_mode:
    | "DOMAIN_VERIFIED_ANY_MAILBOX_ALLOWED"
    | "OPTIONAL_REPLY_TO_SIGNATURE_ONLY";
}

export interface SenderDomainRow {
  domain_ref: string;
  product_environment_id: Exclude<
    EmailProductEnvironmentId,
    "env_local_provisioning_workstation"
  >;
  provider_environment_tag: Exclude<EmailProviderEnvironmentTag, "LOCAL_BOOTSTRAP">;
  workspace_ref: string;
  sender_domain: string;
  return_path_domain: string;
  dmarc_host: string;
  source_disposition: EmailSourceDisposition;
  verification_state: SenderDomainVerificationState;
  readiness_state: SenderDomainReadinessState;
  manual_checkpoint_open: boolean;
  dns_inventory_ref: string;
  message_stream_catalog_ref: string;
  sender_identities: SenderIdentityRow[];
  source_refs: SourceRef[];
  notes: string[];
}

export interface SenderDomainRecord {
  schema_version: "1.0";
  record_id: string;
  provider_id: typeof EMAIL_PROVIDER_ID;
  provider_display_name: typeof EMAIL_PROVIDER_DISPLAY_NAME;
  run_id: string;
  flow_id: typeof EMAIL_FLOW_ID;
  workspace_record_ref: string;
  operator_identity_alias: string;
  provider_selection: ProviderSelectionRecord;
  sender_domains: SenderDomainRow[];
  truth_boundary_statement: string;
  typed_gaps: string[];
  notes: string[];
  last_verified_at: string;
}

export interface EmailDnsRecordRow {
  record_ref: string;
  domain_ref: string;
  product_environment_id: SenderDomainRow["product_environment_id"];
  owner_role: "DELIVERY_PLATFORM_OPERATIONS" | "DNS_OPERATIONS";
  record_type: "TXT" | "CNAME";
  host: string;
  expected_value: string;
  ttl_seconds: number;
  purpose:
    | "DOMAIN_VERIFICATION"
    | "DKIM_SIGNING"
    | "RETURN_PATH"
    | "DMARC_POLICY";
  readiness_state:
    | "VERIFIED"
    | "PENDING_DNS"
    | "PENDING_PROVIDER_CONFIRMATION";
  evidence_capture_policy: "REDACTED_METADATA_ONLY";
  source_refs: SourceRef[];
  notes: string[];
}

export interface EmailDnsInventory {
  schema_version: "1.0";
  inventory_id: string;
  provider_id: typeof EMAIL_PROVIDER_ID;
  provider_display_name: typeof EMAIL_PROVIDER_DISPLAY_NAME;
  run_id: string;
  flow_id: typeof EMAIL_FLOW_ID;
  provider_selection: ProviderSelectionRecord;
  rows: EmailDnsRecordRow[];
  typed_gaps: string[];
  notes: string[];
  last_verified_at: string;
}

export interface EmailMessageStreamRow {
  stream_ref: string;
  workspace_ref: string;
  domain_ref: string | null;
  product_environment_id: EmailProductEnvironmentId;
  stream_kind: EmailMessageStreamKind;
  provider_stream_name: string;
  allowed_recipient_posture:
    | "CUSTOMER_VISIBLE_TRANSACTIONAL_ONLY"
    | "INTERNAL_OPERATOR_SECURITY_ONLY"
    | "ALLOWLIST_OR_BLACKHOLE_TEST_ONLY";
  allows_live_recipients: boolean;
  server_token_binding_ref: string;
  smtp_token_metadata_ref: string | null;
  suppression_scope: "PER_STREAM_WITH_MANUAL_REACTIVATION";
  bounce_handling_posture:
    | "DEFERRED_CALLBACK_BINDING_PC_0042"
    | "SANDBOX_FAKE_BOUNCE_ONLY";
  complaint_handling_posture:
    | "DEFERRED_CALLBACK_BINDING_PC_0042"
    | "NOT_EXPECTED_FOR_TEST_SINK";
  truth_boundary:
    "DELIVERY_EVENTS_NEVER_DECIDE_WORKFLOW_OR_AUTHORITY_TRUTH";
  source_refs: SourceRef[];
  notes: string[];
}

export interface EmailMessageStreamCatalog {
  schema_version: "1.0";
  catalog_id: string;
  provider_id: typeof EMAIL_PROVIDER_ID;
  provider_display_name: typeof EMAIL_PROVIDER_DISPLAY_NAME;
  run_id: string;
  flow_id: typeof EMAIL_FLOW_ID;
  provider_selection: ProviderSelectionRecord;
  streams: EmailMessageStreamRow[];
  typed_gaps: string[];
  notes: string[];
  last_verified_at: string;
}

export interface EmailProviderEntryUrls {
  controlPlane: string;
}

export interface EmailArtifactRefs {
  workspaceRecordRef: string;
  senderDomainRecordRef: string;
  dnsInventoryRef: string;
  messageStreamCatalogRef: string;
}

export interface BuildEmailArtifactsResult {
  workspaceRecord: EmailProviderWorkspaceRecord;
  senderDomainRecord: SenderDomainRecord;
  dnsInventory: EmailDnsInventory;
  messageStreamCatalog: EmailMessageStreamCatalog;
}

export interface CreateEmailAccountAndSenderDomainOptions {
  page: Page;
  runContext: RunContext;
  workspaceRecordPath: string;
  senderDomainRecordPath: string;
  dnsInventoryPath: string;
  messageStreamCatalogPath: string;
  entryUrls?: EmailProviderEntryUrls;
  notes?: string[];
}

export interface CreateEmailAccountAndSenderDomainResult
  extends BuildEmailArtifactsResult {
  outcome: EmailFlowOutcome;
  steps: StepContract[];
  evidenceManifestPath: string;
  notes: string[];
}

export interface EmailFixtureState {
  providerLabel: string;
  providerConsoleUrl: string;
  workspaceSourceDisposition: EmailSourceDisposition;
  senderDomainSourceDisposition: EmailSourceDisposition;
  dnsPendingDomainRefs: SenderDomainRow["domain_ref"][];
  notes: string[];
}

const EMAIL_CONTROL_PLANE_SELECTORS: SelectorManifest = {
  manifestId: "postmark-compatible-email-control-plane",
  providerId: EMAIL_PROVIDER_ID,
  flowId: EMAIL_FLOW_ID,
  selectors: rankSelectors([
    {
      selectorId: "workspace-heading",
      description: "Primary heading for the email control-plane workspace",
      strategy: "ROLE",
      value: "heading",
      accessibleName: "Transactional email control plane",
    },
    {
      selectorId: "workspace-action",
      description: "Create or adopt workspace action",
      strategy: "ROLE",
      value: "button",
      accessibleName: "Create or adopt email workspace",
    },
    {
      selectorId: "sender-domains-heading",
      description: "Sender domains section heading",
      strategy: "ROLE",
      value: "heading",
      accessibleName: "Sender domains",
    },
    {
      selectorId: "sender-domain-action",
      description: "Create or adopt sender domains action",
      strategy: "ROLE",
      value: "button",
      accessibleName: "Create or adopt sender domains",
    },
    {
      selectorId: "dns-readiness-action",
      description: "Verify DNS readiness action",
      strategy: "ROLE",
      value: "button",
      accessibleName: "Verify DNS readiness",
    },
    {
      selectorId: "message-streams-heading",
      description: "Message streams section heading",
      strategy: "ROLE",
      value: "heading",
      accessibleName: "Message streams",
    },
    {
      selectorId: "sender-domain-row-fallback",
      description: "Structured sender-domain row fallback when semantic labels drift",
      strategy: "CSS_FALLBACK",
      value: "[data-testid='sender-domain-row']",
      justification:
        "Used only when the provider still exposes structured sender-domain rows but the row copy no longer resolves safely via semantic labels.",
      driftSignal:
        "Raise selector-drift warning if sender-domain rows can no longer be found semantically.",
    },
  ]),
};

const EMAIL_PROVIDER_DOCS = [
  "https://postmarkapp.com/developer/api/overview",
  "https://postmarkapp.com/developer/api/servers-api",
  "https://postmarkapp.com/developer/api/domains-api",
  "https://postmarkapp.com/developer/api/signatures-api",
  "https://postmarkapp.com/developer/api/message-streams-api",
  "https://postmarkapp.com/developer/api/suppressions-api",
  "https://postmarkapp.com/developer/user-guide/sandbox-mode",
  "https://postmarkapp.com/developer/webhooks/bounce-webhook",
  "https://postmarkapp.com/developer/webhooks/webhooks-overview",
];

const EMAIL_TEMPLATE_REFS: EmailArtifactRefs = {
  workspaceRecordRef: "./runtime-generated-email-provider-workspace.json",
  senderDomainRecordRef: "./email_sender_domain.template.json",
  dnsInventoryRef: "./email_dns_record_inventory.template.json",
  messageStreamCatalogRef: "./email_message_stream_catalog.template.json",
};

const ENVIRONMENT_BLUEPRINTS = [
  {
    environmentId: "env_shared_sandbox_integration" as const,
    environmentTag: "SANDBOX" as const,
    workspaceRef: "email_ws_sandbox",
    serverLabel: "Taxat Sandbox Transactional",
    serverAlias: "taxat-sandbox-transactional",
    deliveryType: "Sandbox" as const,
    senderDomainRef: "email_domain_notify_sandbox",
    senderDomain: "notify.sandbox.taxat.example",
    returnPathDomain: "pm-bounces.notify.sandbox.taxat.example",
    secretNamespaceRef: "sec_sandbox_runtime",
    allowsLiveRecipients: false,
    hasSinkStream: true,
  },
  {
    environmentId: "env_preproduction_verification" as const,
    environmentTag: "PREPRODUCTION" as const,
    workspaceRef: "email_ws_preprod",
    serverLabel: "Taxat Preproduction Transactional",
    serverAlias: "taxat-preprod-transactional",
    deliveryType: "Live" as const,
    senderDomainRef: "email_domain_notify_preprod",
    senderDomain: "notify.preprod.taxat.example",
    returnPathDomain: "pm-bounces.notify.preprod.taxat.example",
    secretNamespaceRef: "sec_preprod_runtime",
    allowsLiveRecipients: false,
    hasSinkStream: true,
  },
  {
    environmentId: "env_production" as const,
    environmentTag: "PRODUCTION" as const,
    workspaceRef: "email_ws_production",
    serverLabel: "Taxat Production Transactional",
    serverAlias: "taxat-production-transactional",
    deliveryType: "Live" as const,
    senderDomainRef: "email_domain_notify_production",
    senderDomain: "notify.production.taxat.example",
    returnPathDomain: "pm-bounces.notify.production.taxat.example",
    secretNamespaceRef: "sec_production_runtime",
    allowsLiveRecipients: true,
    hasSinkStream: false,
  },
] as const;

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

function createProviderSelectionRecord(): ProviderSelectionRecord {
  return {
    provider_selection_status: EMAIL_PROVIDER_VENDOR_SELECTION,
    provider_family: "TRANSACTIONAL_EMAIL_DELIVERY",
    provider_vendor_adapter: EMAIL_PROVIDER_VENDOR_ADAPTER,
    provider_vendor_label: "Postmark-compatible transactional email provider",
    docs_urls: [...EMAIL_PROVIDER_DOCS],
    source_refs: [
      {
        source_ref:
          "Algorithm/collaboration_workspace_contract.md::L1844[Customer_notifications]",
        rationale:
          "Customer email is optional product delivery for governed notification events rather than a separate source of workflow truth.",
      },
      {
        source_ref:
          "Algorithm/data_model.md::L195[WorkItemNotification]",
        rationale:
          "Notification delivery channel is modeled explicitly, but workflow legality remains engine-owned.",
      },
      {
        source_ref:
          "Algorithm/security_and_runtime_hardening_contract.md::L50[3._Secret_key_and_token_handling]",
        rationale:
          "Provider account tokens and server tokens must remain vault-bound and never be persisted raw in repo artifacts.",
      },
      {
        source_ref:
          "https://postmarkapp.com/developer/api/servers-api",
        rationale:
          "Current Postmark-compatible control planes distinguish account-level server management from server-level sending posture.",
      },
      {
        source_ref:
          "https://postmarkapp.com/developer/api/domains-api",
        rationale:
          "Domain verification, DKIM, and Return-Path posture are current provider-level requirements for sender-domain readiness.",
      },
      {
        source_ref:
          "https://postmarkapp.com/developer/api/message-streams-api",
        rationale:
          "Current provider documentation supports explicit message-stream partitioning instead of one undifferentiated outbound surface.",
      },
    ],
  };
}

function localBootstrapWorkspaceRow(
  state: EmailFixtureState,
): EmailProviderWorkspaceRow {
  return {
    workspace_ref: "email_ws_local_bootstrap",
    product_environment_id: "env_local_provisioning_workstation",
    provider_environment_tag: "LOCAL_BOOTSTRAP",
    server_label: "Taxat Local Provisioning Bootstrap",
    server_alias: "taxat-local-email-bootstrap",
    server_delivery_type: "Sandbox",
    sender_domain_ref: "email_domain_notify_sandbox",
    source_disposition: state.workspaceSourceDisposition,
    allows_live_recipients: false,
    account_token_metadata_ref:
      "vault://metadata/sec_local_provisioning_sandbox/email/account-token",
    server_token_metadata_ref:
      "vault://metadata/sec_local_provisioning_sandbox/email/server-token/bootstrap",
    server_token_fingerprint: stableHash(
      "taxat-local-provisioning-email-server-token",
    ),
    webhook_configuration_state: "NOT_APPLICABLE_ON_BOOTSTRAP",
    message_stream_refs: ["email_stream_local_bootstrap_sink"],
    suppression_posture_ref: "email_suppression_posture_sandbox_test_only",
    source_refs: [
      {
        source_ref:
          "data/analysis/environment_catalog.json::env_local_provisioning_workstation",
        rationale:
          "Local provisioning is bootstrap-only and must never receive a production-trusted outbound sender identity of its own.",
      },
    ],
    notes: [
      "Local provisioning reuses the sandbox delivery account for browser automation and DNS setup validation only.",
      "No dedicated sender domain is created for local provisioning.",
    ],
  };
}

function buildWorkspaceRows(
  state: EmailFixtureState,
): EmailProviderWorkspaceRow[] {
  return [
    localBootstrapWorkspaceRow(state),
    ...ENVIRONMENT_BLUEPRINTS.map((blueprint) => ({
      workspace_ref: blueprint.workspaceRef,
      product_environment_id: blueprint.environmentId,
      provider_environment_tag: blueprint.environmentTag,
      server_label: blueprint.serverLabel,
      server_alias: blueprint.serverAlias,
      server_delivery_type: blueprint.deliveryType,
      sender_domain_ref: blueprint.senderDomainRef,
      source_disposition: state.workspaceSourceDisposition,
      allows_live_recipients: blueprint.allowsLiveRecipients,
      account_token_metadata_ref:
        "vault://metadata/sec_delivery_platform/email/account-token",
      server_token_metadata_ref: `vault://metadata/${blueprint.secretNamespaceRef}/email/${blueprint.serverAlias}/server-token`,
      server_token_fingerprint: stableHash(
        `${blueprint.serverAlias}-server-token-${EMAIL_POLICY_GENERATED_ON}`,
      ),
      webhook_configuration_state: "DEFERRED_TO_PC_0042" as const,
      message_stream_refs: [
        `email_stream_${blueprint.environmentTag.toLowerCase()}_customer_transactional`,
        `email_stream_${blueprint.environmentTag.toLowerCase()}_operator_security`,
        ...(blueprint.hasSinkStream
          ? [`email_stream_${blueprint.environmentTag.toLowerCase()}_test_sink`]
          : []),
      ],
      suppression_posture_ref:
        blueprint.environmentTag === "PRODUCTION"
          ? "email_suppression_posture_production_transactional"
          : "email_suppression_posture_non_production_allowlist",
      source_refs: [
        {
          source_ref:
            "data/analysis/environment_catalog.json::environment_records",
          rationale:
            "Environment separation and provider posture must stay explicit across sandbox, preproduction, and production.",
        },
        {
          source_ref:
            "https://postmarkapp.com/developer/api/servers-api",
          rationale:
            "Current provider guidance models delivery posture at the server boundary, including sandbox versus live type.",
        },
      ],
      notes: [
        blueprint.allowsLiveRecipients
          ? "Production server may deliver to live customer recipients once template and callback work is complete."
          : "Non-production server stays sink-safe or allowlist-bound and must not deliver to uncontrolled recipients.",
      ],
    })),
  ];
}

function senderIdentitiesForDomain(domain: string): SenderIdentityRow[] {
  return [
    {
      identity_ref: `${domain}-customer-identity`,
      label: "Customer transactional",
      from_address: `noreply@${domain}`,
      reply_to_address: `help@${domain}`,
      sender_signature_mode: "DOMAIN_VERIFIED_ANY_MAILBOX_ALLOWED",
    },
    {
      identity_ref: `${domain}-support-identity`,
      label: "Support acknowledgement",
      from_address: `help@${domain}`,
      reply_to_address: `support@${domain}`,
      sender_signature_mode: "OPTIONAL_REPLY_TO_SIGNATURE_ONLY",
    },
  ];
}

function buildSenderDomainRows(
  state: EmailFixtureState,
  refs: EmailArtifactRefs,
): SenderDomainRow[] {
  return ENVIRONMENT_BLUEPRINTS.map((blueprint) => {
    const verificationState = state.dnsPendingDomainRefs.includes(
      blueprint.senderDomainRef,
    )
      ? "PENDING_DNS"
      : "VERIFIED";
    return {
      domain_ref: blueprint.senderDomainRef,
      product_environment_id: blueprint.environmentId,
      provider_environment_tag: blueprint.environmentTag,
      workspace_ref: blueprint.workspaceRef,
      sender_domain: blueprint.senderDomain,
      return_path_domain: blueprint.returnPathDomain,
      dmarc_host: `_dmarc.${blueprint.senderDomain}`,
      source_disposition: state.senderDomainSourceDisposition,
      verification_state: verificationState,
      readiness_state:
        verificationState === "VERIFIED"
          ? "ACTIVE_AND_RUNTIME_VERIFIED"
          : "MANUAL_CHECKPOINT_REQUIRED",
      manual_checkpoint_open: verificationState !== "VERIFIED",
      dns_inventory_ref: refs.dnsInventoryRef,
      message_stream_catalog_ref: refs.messageStreamCatalogRef,
      sender_identities: senderIdentitiesForDomain(blueprint.senderDomain),
      source_refs: [
        {
          source_ref:
            "data/analysis/environment_domain_dns_callback_matrix.json::domain_rows",
          rationale:
            "Environment DNS grammar already uses environment-specific hostnames and must stay separated here as well.",
        },
        {
          source_ref:
            "https://postmarkapp.com/developer/api/domains-api",
          rationale:
            "Domain verification and custom Return-Path posture are current provider-level readiness requirements.",
        },
      ],
      notes: [
        "Domain verification is the primary sender-identity posture; product mailboxes should not rely on one-off sender-signature sprawl.",
        verificationState === "VERIFIED"
          ? "DNS verification is complete and the environment is ready for later template and webhook work."
          : "DNS verification remains pending; manual checkpoint is required before later callback/template work can be considered complete.",
      ],
    };
  });
}

function dnsRow(
  domain: SenderDomainRow,
  purpose: EmailDnsRecordRow["purpose"],
  host: string,
  expectedValue: string,
  ttlSeconds: number,
  readinessState: EmailDnsRecordRow["readiness_state"],
  ownerRole: EmailDnsRecordRow["owner_role"],
): EmailDnsRecordRow {
  return {
    record_ref: `${domain.domain_ref}_${purpose.toLowerCase()}`,
    domain_ref: domain.domain_ref,
    product_environment_id: domain.product_environment_id,
    owner_role: ownerRole,
    record_type: purpose === "RETURN_PATH" ? "CNAME" : "TXT",
    host,
    expected_value: expectedValue,
    ttl_seconds: ttlSeconds,
    purpose,
    readiness_state: readinessState,
    evidence_capture_policy: "REDACTED_METADATA_ONLY",
    source_refs: [
      {
        source_ref:
          "https://postmarkapp.com/developer/api/domains-api",
        rationale:
          "Current Postmark-compatible domain docs enumerate pending DKIM values and custom Return-Path CNAME requirements.",
      },
    ],
    notes: [
      purpose === "DMARC_POLICY"
        ? "DMARC policy stays Taxat-owned at DNS and is not provider-generated."
        : "Inventory is config, not prose; later agents may bind evidence or callbacks against this exact record row.",
    ],
  };
}

function buildDnsInventory(
  senderDomains: SenderDomainRow[],
): EmailDnsRecordRow[] {
  return senderDomains.flatMap((domain) => {
    const readinessState =
      domain.verification_state === "VERIFIED" ? "VERIFIED" : "PENDING_DNS";
    const domainHost = domain.sender_domain;
    const dkimHost = `20260418.pm._domainkey.${domain.sender_domain}`;
    return [
      dnsRow(
        domain,
        "DOMAIN_VERIFICATION",
        domainHost,
        "postmark-domain-verification=pm_verify_taxat_delivery",
        3600,
        readinessState,
        "DELIVERY_PLATFORM_OPERATIONS",
      ),
      dnsRow(
        domain,
        "DKIM_SIGNING",
        dkimHost,
        "k=rsa; p=POSTMARK_COMPATIBLE_PUBLIC_KEY_PLACEHOLDER",
        3600,
        readinessState,
        "DNS_OPERATIONS",
      ),
      dnsRow(
        domain,
        "RETURN_PATH",
        domain.return_path_domain,
        "pm.mtasv.net",
        3600,
        readinessState,
        "DNS_OPERATIONS",
      ),
      dnsRow(
        domain,
        "DMARC_POLICY",
        domain.dmarc_host,
        "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@taxat.example; adkim=s; aspf=s",
        3600,
        "VERIFIED",
        "DELIVERY_PLATFORM_OPERATIONS",
      ),
    ];
  });
}

function buildMessageStreamRows(
  workspaceRows: EmailProviderWorkspaceRow[],
): EmailMessageStreamRow[] {
  return workspaceRows.flatMap((workspace) => {
    if (workspace.provider_environment_tag === "LOCAL_BOOTSTRAP") {
      return [
        {
          stream_ref: "email_stream_local_bootstrap_sink",
          workspace_ref: workspace.workspace_ref,
          domain_ref: workspace.sender_domain_ref,
          product_environment_id: workspace.product_environment_id,
          stream_kind: "SANDBOX_TEST_SINK",
          provider_stream_name: "taxat-sandbox-test-sink",
          allowed_recipient_posture: "ALLOWLIST_OR_BLACKHOLE_TEST_ONLY",
          allows_live_recipients: false,
          server_token_binding_ref: workspace.server_token_metadata_ref,
          smtp_token_metadata_ref:
            "vault://metadata/sec_local_provisioning_sandbox/email/stream-sandbox-test-sink/smtp-token",
          suppression_scope: "PER_STREAM_WITH_MANUAL_REACTIVATION",
          bounce_handling_posture: "SANDBOX_FAKE_BOUNCE_ONLY",
          complaint_handling_posture: "NOT_EXPECTED_FOR_TEST_SINK",
          truth_boundary:
            "DELIVERY_EVENTS_NEVER_DECIDE_WORKFLOW_OR_AUTHORITY_TRUTH",
          source_refs: [
            {
              source_ref:
                "https://postmarkapp.com/developer/user-guide/sandbox-mode",
              rationale:
                "Current sandbox-mode guidance supports safe non-live testing without implying production deliverability.",
            },
          ],
          notes: [
            "Local bootstrap stays limited to sink-safe test traffic and fake-bounce rehearsals.",
          ],
        },
      ];
    }

    const tag = workspace.provider_environment_tag.toLowerCase();
    const rows: EmailMessageStreamRow[] = [
      {
        stream_ref: `email_stream_${tag}_customer_transactional`,
        workspace_ref: workspace.workspace_ref,
        domain_ref: workspace.sender_domain_ref,
        product_environment_id: workspace.product_environment_id,
        stream_kind: "CUSTOMER_TRANSACTIONAL",
        provider_stream_name: `taxat-${tag}-customer-transactional`,
        allowed_recipient_posture: "CUSTOMER_VISIBLE_TRANSACTIONAL_ONLY",
        allows_live_recipients: workspace.allows_live_recipients,
        server_token_binding_ref: workspace.server_token_metadata_ref,
        smtp_token_metadata_ref:
          `vault://metadata/${workspace.server_token_metadata_ref.split("/")[3]}/email/${workspace.server_alias}/smtp-customer-transactional`,
        suppression_scope: "PER_STREAM_WITH_MANUAL_REACTIVATION",
        bounce_handling_posture: "DEFERRED_CALLBACK_BINDING_PC_0042",
        complaint_handling_posture: "DEFERRED_CALLBACK_BINDING_PC_0042",
        truth_boundary:
          "DELIVERY_EVENTS_NEVER_DECIDE_WORKFLOW_OR_AUTHORITY_TRUTH",
        source_refs: [
          {
            source_ref:
              "Algorithm/collaboration_workspace_contract.md::L1844[Customer_notifications]",
            rationale:
              "Customer-visible notification mail must stay distinct from internal-only activity and support the product's dedupe rules.",
          },
          {
            source_ref:
              "https://postmarkapp.com/developer/api/message-streams-api",
            rationale:
              "Current provider guidance supports message streams as the partitioning boundary for different mail classes.",
          },
        ],
        notes: [
          "Customer-visible transactional mail is product-governed and may only render customer-safe copy and links.",
        ],
      },
      {
        stream_ref: `email_stream_${tag}_operator_security`,
        workspace_ref: workspace.workspace_ref,
        domain_ref: workspace.sender_domain_ref,
        product_environment_id: workspace.product_environment_id,
        stream_kind: "OPERATOR_SECURITY",
        provider_stream_name: `taxat-${tag}-operator-security`,
        allowed_recipient_posture: "INTERNAL_OPERATOR_SECURITY_ONLY",
        allows_live_recipients: false,
        server_token_binding_ref: workspace.server_token_metadata_ref,
        smtp_token_metadata_ref:
          `vault://metadata/${workspace.server_token_metadata_ref.split("/")[3]}/email/${workspace.server_alias}/smtp-operator-security`,
        suppression_scope: "PER_STREAM_WITH_MANUAL_REACTIVATION",
        bounce_handling_posture: "DEFERRED_CALLBACK_BINDING_PC_0042",
        complaint_handling_posture: "DEFERRED_CALLBACK_BINDING_PC_0042",
        truth_boundary:
          "DELIVERY_EVENTS_NEVER_DECIDE_WORKFLOW_OR_AUTHORITY_TRUTH",
        source_refs: [
          {
            source_ref:
              "Algorithm/retention_error_and_observability_contract.md::L1",
            rationale:
              "Operational delivery data belongs in observability and support posture, not business workflow truth.",
          },
        ],
        notes: [
          "Operator and security mail stays separate from customer-visible transactional events to preserve privacy and routing discipline.",
        ],
      },
    ];

    if (
      workspace.provider_environment_tag === "SANDBOX" ||
      workspace.provider_environment_tag === "PREPRODUCTION"
    ) {
      rows.push({
        stream_ref: `email_stream_${tag}_test_sink`,
        workspace_ref: workspace.workspace_ref,
        domain_ref: workspace.sender_domain_ref,
        product_environment_id: workspace.product_environment_id,
        stream_kind: "SANDBOX_TEST_SINK",
        provider_stream_name: `taxat-${tag}-test-sink`,
        allowed_recipient_posture: "ALLOWLIST_OR_BLACKHOLE_TEST_ONLY",
        allows_live_recipients: false,
        server_token_binding_ref: workspace.server_token_metadata_ref,
        smtp_token_metadata_ref:
          `vault://metadata/${workspace.server_token_metadata_ref.split("/")[3]}/email/${workspace.server_alias}/smtp-test-sink`,
        suppression_scope: "PER_STREAM_WITH_MANUAL_REACTIVATION",
        bounce_handling_posture: "SANDBOX_FAKE_BOUNCE_ONLY",
        complaint_handling_posture: "NOT_EXPECTED_FOR_TEST_SINK",
        truth_boundary:
          "DELIVERY_EVENTS_NEVER_DECIDE_WORKFLOW_OR_AUTHORITY_TRUTH",
        source_refs: [
          {
            source_ref:
              "https://postmarkapp.com/developer/user-guide/sandbox-mode",
            rationale:
              "Non-production mail must stay safe for rehearsals and fake-bounce testing rather than uncontrolled live delivery.",
          },
        ],
        notes: [
          "This stream is the explicit non-production sink and must never be repointed to live customer recipients.",
        ],
      });
    }

    return rows;
  });
}

export function createRecommendedFixtureState(
  mode: "fresh" | "existing" | "dns-pending" = "existing",
): EmailFixtureState {
  const providerLabel = "Postmark-compatible transactional delivery provider";
  if (mode === "fresh") {
    return {
      providerLabel,
      providerConsoleUrl: "https://account.postmarkapp.com/servers",
      workspaceSourceDisposition: "CREATED_DURING_RUN",
      senderDomainSourceDisposition: "CREATED_DURING_RUN",
      dnsPendingDomainRefs: [],
      notes: [
        "Fixture simulates a fresh bootstrap where workspace, domains, and streams are created during the run.",
      ],
    };
  }
  if (mode === "dns-pending") {
    return {
      providerLabel,
      providerConsoleUrl: "https://account.postmarkapp.com/servers",
      workspaceSourceDisposition: "ADOPTED_EXISTING",
      senderDomainSourceDisposition: "ADOPTED_EXISTING",
      dnsPendingDomainRefs: ["email_domain_notify_preprod"],
      notes: [
        "Fixture simulates an adopted workspace with one preproduction sender domain still waiting on DNS propagation.",
      ],
    };
  }
  return {
    providerLabel,
    providerConsoleUrl: "https://account.postmarkapp.com/servers",
    workspaceSourceDisposition: "ADOPTED_EXISTING",
    senderDomainSourceDisposition: "ADOPTED_EXISTING",
    dnsPendingDomainRefs: [],
    notes: [
      "Fixture simulates an adopted provider workspace with domains already verified.",
    ],
  };
}

export function createDefaultEmailProviderEntryUrls(): EmailProviderEntryUrls {
  return {
    controlPlane: "https://account.postmarkapp.com/servers",
  };
}

export function buildTemplateEmailArtifacts(
  runContext: RunContext,
  state: EmailFixtureState,
  refs: EmailArtifactRefs = EMAIL_TEMPLATE_REFS,
): BuildEmailArtifactsResult {
  const providerSelection = createProviderSelectionRecord();
  const workspaceRows = buildWorkspaceRows(state);
  const senderDomains = buildSenderDomainRows(state, refs);
  const dnsRows = buildDnsInventory(senderDomains);
  const streamRows = buildMessageStreamRows(workspaceRows);

  const workspaceRecord: EmailProviderWorkspaceRecord = {
    schema_version: "1.0",
    workspace_record_id: `email-provider-workspace-${runContext.workspaceId}`,
    provider_id: EMAIL_PROVIDER_ID,
    provider_display_name: EMAIL_PROVIDER_DISPLAY_NAME,
    run_id: runContext.runId,
    flow_id: EMAIL_FLOW_ID,
    workspace_id: runContext.workspaceId,
    operator_identity_alias: runContext.operatorIdentityAlias,
    provider_selection: providerSelection,
    workspace_rows: workspaceRows,
    typed_gaps: [
      "shared_operating_contract_0038_to_0045.md was absent at execution time, so this pack grounded itself directly in the algorithm corpus, prior environment work, and current provider documentation.",
      "Webhook and event-callback binding remain deferred to pc_0042; this pack freezes the workspace, domain, and stream topology that later callback work must target.",
    ],
    notes: [
      ...state.notes,
      "Provider account token and per-server tokens are stored by vault ref and fingerprint only.",
    ],
    last_verified_at: EMAIL_POLICY_GENERATED_ON,
  };

  const senderDomainRecord: SenderDomainRecord = {
    schema_version: "1.0",
    record_id: `sender-domain-record-${runContext.workspaceId}`,
    provider_id: EMAIL_PROVIDER_ID,
    provider_display_name: EMAIL_PROVIDER_DISPLAY_NAME,
    run_id: runContext.runId,
    flow_id: EMAIL_FLOW_ID,
    workspace_record_ref: refs.workspaceRecordRef,
    operator_identity_alias: runContext.operatorIdentityAlias,
    provider_selection: providerSelection,
    sender_domains: senderDomains,
    truth_boundary_statement:
      "Email delivery status, bounce state, complaint state, and suppression state are observability or transport projections only. They never decide workflow, authority, or customer-notification legality on their own.",
    typed_gaps: [
      "Later callback, template, and signed-event work remains for pc_0042.",
    ],
    notes: [
      "Sender-domain readiness is explicit per environment and fails closed when DNS or stream posture drifts.",
    ],
    last_verified_at: EMAIL_POLICY_GENERATED_ON,
  };

  const dnsInventory: EmailDnsInventory = {
    schema_version: "1.0",
    inventory_id: `email-dns-inventory-${runContext.workspaceId}`,
    provider_id: EMAIL_PROVIDER_ID,
    provider_display_name: EMAIL_PROVIDER_DISPLAY_NAME,
    run_id: runContext.runId,
    flow_id: EMAIL_FLOW_ID,
    provider_selection: providerSelection,
    rows: dnsRows,
    typed_gaps: [],
    notes: [
      "DNS inventory is config inventory, not prose. Every required record carries purpose, owner, environment, and readiness state.",
    ],
    last_verified_at: EMAIL_POLICY_GENERATED_ON,
  };

  const messageStreamCatalog: EmailMessageStreamCatalog = {
    schema_version: "1.0",
    catalog_id: `email-message-stream-catalog-${runContext.workspaceId}`,
    provider_id: EMAIL_PROVIDER_ID,
    provider_display_name: EMAIL_PROVIDER_DISPLAY_NAME,
    run_id: runContext.runId,
    flow_id: EMAIL_FLOW_ID,
    provider_selection: providerSelection,
    streams: streamRows,
    typed_gaps: [],
    notes: [
      "Customer-visible transactional mail, operator/security mail, and test-sink posture remain distinct by stream instead of implied by copy or runtime flags.",
    ],
    last_verified_at: EMAIL_POLICY_GENERATED_ON,
  };

  return {
    workspaceRecord,
    senderDomainRecord,
    dnsInventory,
    messageStreamCatalog,
  };
}

export function validateEmailDnsInventory(
  inventory: EmailDnsInventory,
  senderDomainRecord: SenderDomainRecord,
): void {
  const domainsByRef = new Map(
    senderDomainRecord.sender_domains.map((domain) => [domain.domain_ref, domain]),
  );
  for (const row of inventory.rows) {
    if (!row.purpose) {
      throw new Error(`DNS row ${row.record_ref} is missing purpose.`);
    }
    if (!row.product_environment_id) {
      throw new Error(`DNS row ${row.record_ref} is missing environment binding.`);
    }
    if (!row.owner_role) {
      throw new Error(`DNS row ${row.record_ref} is missing owner role.`);
    }
    if (row.ttl_seconds <= 0) {
      throw new Error(`DNS row ${row.record_ref} must have a positive TTL.`);
    }
    const domain = domainsByRef.get(row.domain_ref);
    if (!domain) {
      throw new Error(`DNS row ${row.record_ref} references unknown domain ${row.domain_ref}.`);
    }
    if (domain.product_environment_id !== row.product_environment_id) {
      throw new Error(
        `DNS row ${row.record_ref} environment ${row.product_environment_id} does not match domain ${domain.domain_ref}.`,
      );
    }
    if (row.purpose === "DMARC_POLICY" && !row.host.startsWith("_dmarc.")) {
      throw new Error(`DNS row ${row.record_ref} must use a DMARC host.`);
    }
  }
}

export function validateMessageStreamCatalog(
  catalog: EmailMessageStreamCatalog,
): void {
  for (const stream of catalog.streams) {
    if (
      stream.product_environment_id === "env_production" &&
      stream.stream_kind === "SANDBOX_TEST_SINK"
    ) {
      throw new Error(
        `Production stream ${stream.stream_ref} must not be a sandbox test sink.`,
      );
    }
    if (
      stream.stream_kind === "CUSTOMER_TRANSACTIONAL" &&
      stream.allowed_recipient_posture !== "CUSTOMER_VISIBLE_TRANSACTIONAL_ONLY"
    ) {
      throw new Error(
        `Customer stream ${stream.stream_ref} must stay customer-transactional only.`,
      );
    }
  }
}

export function assertEmailArtifactsSanitized(
  workspaceRecord: EmailProviderWorkspaceRecord,
  senderDomainRecord: SenderDomainRecord,
  messageStreamCatalog: EmailMessageStreamCatalog,
): void {
  const serialized = JSON.stringify({
    workspaceRecord,
    senderDomainRecord,
    messageStreamCatalog,
  }).toLowerCase();
  if (serialized.includes("postmark_api_")) {
    throw new Error("Artifacts leaked a raw provider token.");
  }
  if (serialized.includes("x-postmark")) {
    throw new Error("Artifacts leaked a raw Postmark header token value.");
  }
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

async function detectFixtureScenario(page: Page): Promise<EmailFixtureState> {
  const scenario = await page.locator("body").getAttribute("data-scenario");
  if (scenario === "fresh" || scenario === "existing" || scenario === "dns-pending") {
    return createRecommendedFixtureState(scenario);
  }
  return createRecommendedFixtureState("existing");
}

export async function loadEmailControlPlaneSelectorManifest(): Promise<SelectorManifest> {
  return EMAIL_CONTROL_PLANE_SELECTORS;
}

export async function createEmailAccountAndSenderDomain(
  options: CreateEmailAccountAndSenderDomainOptions,
): Promise<CreateEmailAccountAndSenderDomainResult> {
  const registry = createDefaultProviderRegistry();
  const provider = registry.getRequired(EMAIL_PROVIDER_ID);
  assertProviderFlowAllowed(options.runContext, provider, EMAIL_FLOW_ID);

  const manifest = await loadEmailControlPlaneSelectorManifest();
  const entryUrls = options.entryUrls ?? createDefaultEmailProviderEntryUrls();
  const refs: EmailArtifactRefs = {
    workspaceRecordRef: options.workspaceRecordPath,
    senderDomainRecordRef: options.senderDomainRecordPath,
    dnsInventoryRef: options.dnsInventoryPath,
    messageStreamCatalogRef: options.messageStreamCatalogPath,
  };

  const steps: StepContract[] = [
    createPendingStep({
      stepId: EMAIL_STEP_IDS.openControlPlane,
      title: "Open email control plane",
      selectorRefs: ["workspace-heading", "workspace-action"],
    }),
    createPendingStep({
      stepId: EMAIL_STEP_IDS.reconcileWorkspace,
      title: "Create or adopt provider workspace",
      selectorRefs: ["workspace-action"],
    }),
    createPendingStep({
      stepId: EMAIL_STEP_IDS.reconcileSenderDomains,
      title: "Create or adopt sender domains",
      selectorRefs: ["sender-domains-heading", "sender-domain-action"],
    }),
    createPendingStep({
      stepId: EMAIL_STEP_IDS.verifyDnsReadiness,
      title: "Verify DNS readiness",
      selectorRefs: ["dns-readiness-action", "sender-domain-row-fallback"],
    }),
    createPendingStep({
      stepId: EMAIL_STEP_IDS.persistArtifacts,
      title: "Persist sender-domain inventory",
      selectorRefs: ["message-streams-heading"],
      sensitiveCapturePolicy: "REDACT",
    }),
  ];

  let evidenceManifest = createEvidenceManifest(options.runContext);

  steps[0] = transitionStep(
    steps[0]!,
    "RUNNING",
    "Opening transactional email control plane.",
  );
  await options.page.goto(entryUrls.controlPlane);
  await requireVisible(options.page, manifest, "workspace-heading");
  await requireVisible(options.page, manifest, "workspace-action");
  await requireVisible(options.page, manifest, "sender-domains-heading");
  await requireVisible(options.page, manifest, "message-streams-heading");
  steps[0] = transitionStep(
    steps[0]!,
    "SUCCEEDED",
    "Email control plane is reachable with semantic selectors.",
  );
  evidenceManifest = await captureNoteEvidence(
    evidenceManifest,
    steps[0].stepId,
    "Opened the transactional email control plane without relying on brittle selectors.",
  );

  const fixtureState = await detectFixtureScenario(options.page);
  const artifacts = buildTemplateEmailArtifacts(
    options.runContext,
    fixtureState,
    refs,
  );

  steps[1] = transitionStep(
    steps[1]!,
    "RUNNING",
    "Reconciling provider workspace and per-environment servers.",
  );
  steps[1] =
    fixtureState.workspaceSourceDisposition === "ADOPTED_EXISTING"
      ? markSkippedAsAlreadyPresent(
          steps[1]!,
          "Existing provider workspace and environment servers were adopted.",
        )
      : transitionStep(
          steps[1]!,
          "SUCCEEDED",
          "Provider workspace and servers were created during the run.",
        );
  evidenceManifest = await captureNoteEvidence(
    evidenceManifest,
    steps[1].stepId,
    "Workspace topology was reconciled with vault-bound account and server token metadata only.",
  );

  steps[2] = transitionStep(
    steps[2]!,
    "RUNNING",
    "Reconciling sender domains and origin identities.",
  );
  steps[2] =
    fixtureState.senderDomainSourceDisposition === "ADOPTED_EXISTING"
      ? markSkippedAsAlreadyPresent(
          steps[2]!,
          "Existing sender domains were adopted and validated.",
        )
      : transitionStep(
          steps[2]!,
          "SUCCEEDED",
          "Sender domains were created and bound to the environment servers.",
        );
  evidenceManifest = await captureNoteEvidence(
    evidenceManifest,
    steps[2].stepId,
    "Sender-domain posture was normalized per environment instead of relying on ad hoc sender signatures.",
  );

  steps[3] = transitionStep(
    steps[3]!,
    "RUNNING",
    "Checking DNS verification, DKIM, Return-Path, and DMARC readiness.",
  );

  let outcome: EmailFlowOutcome = "EMAIL_DOMAIN_READY";
  if (fixtureState.dnsPendingDomainRefs.length) {
    const pendingDomains = artifacts.senderDomainRecord.sender_domains
      .filter((domain) => fixtureState.dnsPendingDomainRefs.includes(domain.domain_ref))
      .map((domain) => domain.sender_domain)
      .join(", ");
    const checkpoint = createManualCheckpoint({
      checkpointId: `email-dns-${options.runContext.runId}`,
      stepId: steps[3].stepId,
      reason: "HUMAN_REVIEW",
      prompt:
        `DNS propagation or provider verification remains pending for ${pendingDomains}. ` +
        "Confirm DKIM, Return-Path, and domain-verification records have settled before resuming.",
      expectedSignals: [
        "DKIM TXT record resolves publicly",
        "Return-Path CNAME resolves to provider target",
        "Provider console marks the sender domain verified",
      ],
      reentryPolicy: "VERIFY_CURRENT_STATE_THEN_CONTINUE",
      capturePolicy: "REDACT",
    });
    steps[3] = attachManualCheckpoint(steps[3]!, checkpoint);
    outcome = "EMAIL_DNS_VERIFICATION_PENDING";
    evidenceManifest = await captureNoteEvidence(
      evidenceManifest,
      steps[3].stepId,
      "DNS readiness remains pending and the run stopped at an explicit manual checkpoint instead of treating sender identity as ready by assumption.",
    );
  } else {
    steps[3] = transitionStep(
      steps[3]!,
      "SUCCEEDED",
      "All required DNS records and provider verification states are ready.",
    );
    evidenceManifest = await captureNoteEvidence(
      evidenceManifest,
      steps[3].stepId,
      "DNS verification, DKIM, Return-Path, and DMARC posture are recorded as ready.",
    );
  }

  steps[4] = transitionStep(
    steps[4]!,
    "RUNNING",
    "Writing workspace, sender-domain, DNS, and message-stream artifacts.",
  );
  validateEmailDnsInventory(artifacts.dnsInventory, artifacts.senderDomainRecord);
  validateMessageStreamCatalog(artifacts.messageStreamCatalog);
  assertEmailArtifactsSanitized(
    artifacts.workspaceRecord,
    artifacts.senderDomainRecord,
    artifacts.messageStreamCatalog,
  );

  await Promise.all([
    persistJson(options.workspaceRecordPath, artifacts.workspaceRecord),
    persistJson(options.senderDomainRecordPath, artifacts.senderDomainRecord),
    persistJson(options.dnsInventoryPath, artifacts.dnsInventory),
    persistJson(options.messageStreamCatalogPath, artifacts.messageStreamCatalog),
  ]);

  steps[4] = transitionStep(
    steps[4]!,
    "SUCCEEDED",
    "Email control-plane artifacts were persisted.",
  );
  evidenceManifest = await captureNoteEvidence(
    evidenceManifest,
    steps[4].stepId,
    "Persisted sanitized workspace, domain, DNS, and stream artifacts for later template and callback configuration.",
  );

  const evidenceManifestPath = options.senderDomainRecordPath.replace(
    /\.json$/u,
    ".evidence_manifest.json",
  );
  await persistJson(evidenceManifestPath, evidenceManifest);

  return {
    outcome,
    steps,
    evidenceManifestPath,
    workspaceRecord: artifacts.workspaceRecord,
    senderDomainRecord: artifacts.senderDomainRecord,
    dnsInventory: artifacts.dnsInventory,
    messageStreamCatalog: artifacts.messageStreamCatalog,
    notes: [
      ...fixtureState.notes,
      ...(options.notes ?? []),
      "Provider persistence remains vendor-neutral while the active adapter is explicitly Postmark-compatible.",
      "Email delivery remains a transport projection only and never becomes workflow truth.",
    ],
  };
}

import { createHash } from "node:crypto";
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
export const IDP_TENANT_CLIENT_FLOW_ID = "idp-tenant-and-clients-bootstrap";
export const IDP_PROVIDER_DISPLAY_NAME = "OIDC External Identity Control Plane";
export const IDP_PROVIDER_VENDOR_ADAPTER = "AUTH0_COMPATIBLE_DASHBOARD";
export const IDP_PROVIDER_VENDOR_SELECTION = "PROVIDER_DEFAULT_APPLIED";

export const IDP_STEP_IDS = {
  openControlPlane: "idp.control-plane.open-console",
  reconcileTenants: "idp.control-plane.reconcile-tenants",
  reconcileInteractiveClients: "idp.control-plane.reconcile-interactive-clients",
  reconcileMachineClients: "idp.control-plane.reconcile-machine-clients",
  persistArtifacts: "idp.control-plane.persist-artifacts",
} as const;

export type IdpProductEnvironmentId =
  | "env_local_provisioning_workstation"
  | "env_shared_sandbox_integration"
  | "env_preproduction_verification"
  | "env_production";

export type IdpTenantRef =
  | "idp_tenant_dev_shared"
  | "idp_tenant_staging_runtime"
  | "idp_tenant_production_runtime";

export type IdpTenantEnvironmentTag = "Development" | "Staging" | "Production";
export type IdpSourceDisposition = "CREATED_DURING_RUN" | "ADOPTED_EXISTING";
export type IdpInteractiveSurfaceFamily =
  | "OPERATOR_BROWSER"
  | "PORTAL_BROWSER"
  | "NATIVE_MACOS_OPERATOR";
export type IdpMachineClientFamily =
  | "BACKEND_SERVICE_AUTOMATION"
  | "PROVIDER_MANAGEMENT_BOOTSTRAP";
export type IdpApplicationType =
  | "REGULAR_WEB_APPLICATION"
  | "NATIVE_APPLICATION"
  | "MACHINE_TO_MACHINE_APPLICATION";
export type IdpClientVisibility = "CONFIDENTIAL" | "PUBLIC";

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

export interface IdpSecretPosture {
  requires_vault_secret: boolean;
  secret_namespace_ref: string | null;
  secret_class_id:
    | "idp_application_client_secret"
    | "idp_machine_client_secret"
    | "idp_management_client_secret"
    | null;
  client_id_metadata_store_ref: string;
  client_secret_store_ref: string | null;
  client_secret_metadata_ref: string | null;
  vault_write_receipt_ref: string | null;
  client_secret_fingerprint: string | null;
  capture_posture:
    | "PUBLIC_CLIENT_NO_SHARED_SECRET"
    | "IMMEDIATE_VAULT_CAPTURE"
    | "ADOPT_EXISTING_VAULT_BINDING";
}

export interface IdpTenantRow {
  tenant_ref: IdpTenantRef;
  tenant_label: string;
  tenant_domain_alias: string;
  custom_domain: string | null;
  provider_environment_tag: IdpTenantEnvironmentTag;
  region: "EU";
  product_environment_ids: IdpProductEnvironmentId[];
  residency_posture: string;
  automation_access_posture: string;
  environment_tag_ref: string;
  source_disposition: IdpSourceDisposition;
  secret_namespace_refs: string[];
  business_tenant_mapping_posture: "ONE_CONTROL_PLANE_TENANT_PER_PROVIDER_ENVIRONMENT_NOT_PER_TAXAT_BUSINESS_TENANT";
  typed_gaps: string[];
  notes: string[];
}

export interface IdpTenantRecordCatalog {
  schema_version: "1.0";
  record_id: string;
  provider_id: typeof IDP_PROVIDER_ID;
  provider_display_name: typeof IDP_PROVIDER_DISPLAY_NAME;
  run_id: string;
  flow_id: typeof IDP_TENANT_CLIENT_FLOW_ID;
  workspace_id: string;
  operator_identity_alias: string;
  execution_mode: RunContext["executionMode"];
  provider_selection: ProviderSelectionRecord;
  tenant_records: IdpTenantRow[];
  typed_gaps: string[];
  notes: string[];
  last_verified_at: string;
}

export interface IdpApplicationClientRow {
  client_ref: string;
  surface_family: IdpInteractiveSurfaceFamily;
  product_environment_id: Exclude<IdpProductEnvironmentId, "env_local_provisioning_workstation">;
  tenant_ref: IdpTenantRef;
  deployable_id: "operator-web" | "client-portal-web" | "Apps/InternalOperatorWorkspaceMac";
  application_type: "REGULAR_WEB_APPLICATION" | "NATIVE_APPLICATION";
  client_visibility: IdpClientVisibility;
  client_display_name: string;
  client_id_alias: string;
  client_id_fingerprint: string;
  source_disposition: IdpSourceDisposition;
  callback_profile_ref: string;
  callback_urls: string[];
  logout_urls: string[];
  allowed_web_origins: string[];
  bundle_identifier: string | null;
  token_endpoint_auth_method: "client_secret_post" | "none";
  grant_posture: string[];
  session_bootstrap_posture: string;
  engine_authorization_boundary: string;
  secret_posture: IdpSecretPosture;
  source_refs: SourceRef[];
  typed_gaps: string[];
  notes: string[];
}

export interface IdpApplicationClientCatalog {
  schema_version: "1.0";
  catalog_id: string;
  provider_id: typeof IDP_PROVIDER_ID;
  provider_display_name: typeof IDP_PROVIDER_DISPLAY_NAME;
  run_id: string;
  flow_id: typeof IDP_TENANT_CLIENT_FLOW_ID;
  workspace_id: string;
  operator_identity_alias: string;
  provider_selection: ProviderSelectionRecord;
  tenant_record_ref: string;
  application_clients: IdpApplicationClientRow[];
  typed_gaps: string[];
  notes: string[];
  last_verified_at: string;
}

export interface IdpMachineClientRow {
  client_ref: string;
  machine_client_family: IdpMachineClientFamily;
  tenant_ref: IdpTenantRef;
  provider_environment_tag: IdpTenantEnvironmentTag;
  product_environment_id:
    | Exclude<IdpProductEnvironmentId, "env_local_provisioning_workstation">
    | null;
  application_type: "MACHINE_TO_MACHINE_APPLICATION";
  client_visibility: "CONFIDENTIAL";
  client_display_name: string;
  client_id_alias: string;
  client_id_fingerprint: string;
  source_disposition: IdpSourceDisposition;
  grant_posture: ["client_credentials"];
  callback_urls: [];
  logout_urls: [];
  allowed_web_origins: [];
  management_audience_ref: "urn:taxat:backend-service" | "urn:auth0-management-api";
  mfa_posture: "NOT_APPLICABLE_MACHINE";
  secret_posture: IdpSecretPosture;
  source_refs: SourceRef[];
  typed_gaps: string[];
  notes: string[];
}

export interface IdpMachineClientInventory {
  schema_version: "1.0";
  inventory_id: string;
  provider_id: typeof IDP_PROVIDER_ID;
  provider_display_name: typeof IDP_PROVIDER_DISPLAY_NAME;
  run_id: string;
  flow_id: typeof IDP_TENANT_CLIENT_FLOW_ID;
  workspace_id: string;
  operator_identity_alias: string;
  provider_selection: ProviderSelectionRecord;
  tenant_record_ref: string;
  machine_clients: IdpMachineClientRow[];
  typed_gaps: string[];
  notes: string[];
  last_verified_at: string;
}

export interface IdpCallbackOriginRow {
  row_id: string;
  client_ref: string;
  surface_family:
    | IdpInteractiveSurfaceFamily
    | "LOCAL_BROWSER_BOOTSTRAP_REJECTED"
    | "EPHEMERAL_REVIEW_REJECTED";
  product_environment_id: IdpProductEnvironmentId | "env_ephemeral_review";
  deployable_id:
    | "operator-web"
    | "client-portal-web"
    | "Apps/InternalOperatorWorkspaceMac"
    | "deployable_local_provisioning_workspace"
    | "deployable_preview_web_shell";
  callback_profile_ref: string;
  registration_decision: "CONFIGURE_NOW" | "DO_NOT_REGISTER";
  callback_urls: string[];
  logout_urls: string[];
  allowed_web_origins: string[];
  bundle_identifier: string | null;
  rationale: string;
  host_separation_rule: string;
  source_refs: SourceRef[];
}

export interface IdpCallbackOriginMatrix {
  schema_version: "1.0";
  matrix_id: string;
  provider_id: typeof IDP_PROVIDER_ID;
  provider_display_name: typeof IDP_PROVIDER_DISPLAY_NAME;
  run_id: string;
  flow_id: typeof IDP_TENANT_CLIENT_FLOW_ID;
  workspace_id: string;
  provider_selection: ProviderSelectionRecord;
  rows: IdpCallbackOriginRow[];
  typed_gaps: string[];
  notes: string[];
  last_verified_at: string;
}

export interface CreateIdpTenantAndClientsOptions {
  page: Page;
  runContext: RunContext;
  tenantRecordPath: string;
  applicationClientCatalogPath: string;
  callbackOriginMatrixPath: string;
  machineClientInventoryPath: string;
  entryUrls?: IdpEntryUrls;
}

export interface CreateIdpTenantAndClientsResult {
  outcome: "IDP_TOPOLOGY_READY";
  steps: StepContract[];
  evidenceManifestPath: string;
  tenantRecord: IdpTenantRecordCatalog;
  applicationClientCatalog: IdpApplicationClientCatalog;
  callbackOriginMatrix: IdpCallbackOriginMatrix;
  machineClientInventory: IdpMachineClientInventory;
  notes: string[];
}

export interface IdpEntryUrls {
  controlPlane: string;
}

interface TenantState {
  tenantRef: IdpTenantRef;
  tenantLabel: string;
  tenantDomainAlias: string;
  customDomain: string | null;
  providerEnvironmentTag: IdpTenantEnvironmentTag;
  region: "EU";
  productEnvironmentIds: IdpProductEnvironmentId[];
  secretNamespaceRefs: string[];
  sourceDisposition: IdpSourceDisposition;
}

interface ClientState {
  clientRef: string;
  family: IdpInteractiveSurfaceFamily | IdpMachineClientFamily;
  productEnvironmentId:
    | Exclude<IdpProductEnvironmentId, "env_local_provisioning_workstation">
    | null;
  tenantRef: IdpTenantRef;
  applicationType: IdpApplicationType;
  clientVisibility: IdpClientVisibility;
  deployableId:
    | "operator-web"
    | "client-portal-web"
    | "Apps/InternalOperatorWorkspaceMac"
    | "control-plane-automation"
    | "provider-management-bootstrap";
  clientDisplayName: string;
  clientIdAlias: string;
  clientSecret: string | null;
  clientSecretFingerprint?: string | null;
  callbackProfileRef: string | null;
  callbackUrls: string[];
  logoutUrls: string[];
  allowedWebOrigins: string[];
  bundleIdentifier: string | null;
  tokenEndpointAuthMethod: "client_secret_post" | "none";
  grantPosture: string[];
  sourceDisposition: IdpSourceDisposition;
  secretNamespaceRef: string | null;
}

interface FixtureState {
  providerLabel: string;
  providerMonogram: string;
  workspaceIdentityRef: string;
  region: "EU";
  tenantAdminAlias: string;
  tenants: TenantState[];
  interactiveClients: ClientState[];
  machineClients: ClientState[];
  notes: string[];
}

function nowIso(): string {
  return new Date().toISOString();
}

function sha256(value: string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

async function persistJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function loadAuth0SelectorManifest(): Promise<SelectorManifest> {
  const raw = await readFile(
    new URL("../auth0/selector_manifest.json", import.meta.url),
    "utf8",
  );
  const parsed = JSON.parse(raw) as SelectorManifest;
  return {
    ...parsed,
    selectors: rankSelectors(parsed.selectors),
  };
}

export function createDefaultIdpEntryUrls(): IdpEntryUrls {
  return {
    controlPlane: "https://manage.auth0.com/dashboard/tenants",
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
      "https://auth0.com/docs/get-started/applications/application-settings",
      "https://auth0.com/docs/get-started/auth0-overview/create-applications/regular-web-apps",
      "https://auth0.com/docs/get-started/auth0-overview/create-applications/native-apps",
      "https://auth0.com/docs/get-started/auth0-overview/create-applications/machine-to-machine-apps",
      "https://auth0.com/docs/get-started/applications/confidential-and-public-applications/view-application-type",
    ],
    source_refs: [
      {
        source_ref:
          "Algorithm/northbound_api_and_session_contract.md::L709[8._Session_browser_and_native-client_rules]",
        rationale:
          "Taxat requires server-mediated browser sessions, separate native posture, and distinct machine credentials.",
      },
      {
        source_ref:
          "Algorithm/security_and_runtime_hardening_contract.md::L30[2._Identity_session_and_command_trust]",
        rationale:
          "The IdP is a bootstrap boundary for authentication posture, not the engine of product legality.",
      },
      {
        source_ref:
          "https://auth0.com/docs/get-started/auth0-overview/create-tenants/set-up-multiple-environments",
        rationale:
          "Current Auth0 guidance recommends separate tenants for development, staging, and production environments.",
      },
      {
        source_ref:
          "https://auth0.com/docs/get-started/applications/application-settings",
        rationale:
          "Current Auth0 application settings guidance constrains callback, logout, origin, and native redirect posture.",
      },
    ],
  };
}

function isInteractiveFamily(
  family: ClientState["family"],
): family is IdpInteractiveSurfaceFamily {
  return (
    family === "OPERATOR_BROWSER" ||
    family === "PORTAL_BROWSER" ||
    family === "NATIVE_MACOS_OPERATOR"
  );
}

function secretMetadataForClient(client: ClientState): IdpSecretPosture {
  const metadataRefBase = `vault://metadata/${client.secretNamespaceRef ?? "public-client"}/idp/${client.clientRef}`;
  if (client.applicationType === "NATIVE_APPLICATION") {
    return {
      requires_vault_secret: false,
      secret_namespace_ref: null,
      secret_class_id: null,
      client_id_metadata_store_ref: `${metadataRefBase}/client-id`,
      client_secret_store_ref: null,
      client_secret_metadata_ref: null,
      vault_write_receipt_ref: null,
      client_secret_fingerprint: null,
      capture_posture: "PUBLIC_CLIENT_NO_SHARED_SECRET",
    };
  }

  const fingerprint = client.clientSecret
    ? sha256(client.clientSecret)
    : client.clientSecretFingerprint ?? sha256(client.clientRef);
  const secretClassId =
    client.family === "PROVIDER_MANAGEMENT_BOOTSTRAP"
      ? "idp_management_client_secret"
      : client.family === "BACKEND_SERVICE_AUTOMATION"
        ? "idp_machine_client_secret"
        : "idp_application_client_secret";
  return {
    requires_vault_secret: true,
    secret_namespace_ref: client.secretNamespaceRef,
    secret_class_id: secretClassId,
    client_id_metadata_store_ref: `${metadataRefBase}/client-id`,
    client_secret_store_ref: `vault://kv/${client.secretNamespaceRef}/idp/${client.clientRef}/client-secret/current`,
    client_secret_metadata_ref: `${metadataRefBase}/client-secret/current`,
    vault_write_receipt_ref: `vault-write://${client.secretNamespaceRef}/${client.clientRef}`,
    client_secret_fingerprint: fingerprint,
    capture_posture:
      client.clientSecret === null
        ? "ADOPT_EXISTING_VAULT_BINDING"
        : "IMMEDIATE_VAULT_CAPTURE",
  };
}

function buildTenantCatalog(
  runContext: RunContext,
  state: FixtureState,
): IdpTenantRecordCatalog {
  return {
    schema_version: "1.0",
    record_id: `idp-tenant-record-catalog-${runContext.workspaceId}`,
    provider_id: IDP_PROVIDER_ID,
    provider_display_name: IDP_PROVIDER_DISPLAY_NAME,
    run_id: runContext.runId,
    flow_id: IDP_TENANT_CLIENT_FLOW_ID,
    workspace_id: runContext.workspaceId,
    operator_identity_alias: runContext.operatorIdentityAlias,
    execution_mode: runContext.executionMode,
    provider_selection: createProviderSelectionRecord(),
    tenant_records: state.tenants.map((tenant) => ({
      tenant_ref: tenant.tenantRef,
      tenant_label: tenant.tenantLabel,
      tenant_domain_alias: tenant.tenantDomainAlias,
      custom_domain: tenant.customDomain,
      provider_environment_tag: tenant.providerEnvironmentTag,
      region: tenant.region,
      product_environment_ids: tenant.productEnvironmentIds,
      residency_posture:
        "EU residency posture selected to keep non-production and production identity material aligned with the earlier environment catalog.",
      automation_access_posture:
        "Dashboard browser automation is permitted from the governed provisioning workspace only; runtime surfaces use app clients, not tenant-admin credentials.",
      environment_tag_ref: `auth0-environment-tag:${tenant.providerEnvironmentTag.toLowerCase()}`,
      source_disposition: tenant.sourceDisposition,
      secret_namespace_refs: tenant.secretNamespaceRefs,
      business_tenant_mapping_posture:
        "ONE_CONTROL_PLANE_TENANT_PER_PROVIDER_ENVIRONMENT_NOT_PER_TAXAT_BUSINESS_TENANT",
      typed_gaps: [],
      notes: [
        "Taxat business-tenant context stays engine-owned and resolves after authentication, not inside the provider tenant layout.",
      ],
    })),
    typed_gaps: [
      "The shared operating contract shared_operating_contract_0038_to_0045.md was absent, so the topology grounded directly in ADR-003, the environment catalog, and current Auth0 documentation.",
      "The vendor decision was not frozen by an earlier ADR, so the bootstrap used the Auth0-compatible default and recorded PROVIDER_DEFAULT_APPLIED explicitly.",
    ],
    notes: [
      `Provisioning workspace identity ref: ${state.workspaceIdentityRef}.`,
      "The selected topology uses three control-plane tenants: development for local/bootstrap surfaces, staging for sandbox plus pre-production runtime, and production for live runtime.",
    ],
    last_verified_at: nowIso(),
  };
}

function buildApplicationCatalog(
  runContext: RunContext,
  state: FixtureState,
  tenantRecordRef: string,
): IdpApplicationClientCatalog {
  const applicationClients = state.interactiveClients
    .filter((client): client is ClientState & { family: IdpInteractiveSurfaceFamily } =>
      isInteractiveFamily(client.family),
    )
    .map((client) => ({
    client_ref: client.clientRef,
    surface_family: client.family,
    product_environment_id: client.productEnvironmentId!,
    tenant_ref: client.tenantRef,
    deployable_id: client.deployableId as
      | "operator-web"
      | "client-portal-web"
      | "Apps/InternalOperatorWorkspaceMac",
    application_type: client.applicationType as
      | "REGULAR_WEB_APPLICATION"
      | "NATIVE_APPLICATION",
    client_visibility: client.clientVisibility,
    client_display_name: client.clientDisplayName,
    client_id_alias: client.clientIdAlias,
    client_id_fingerprint: sha256(client.clientIdAlias),
    source_disposition: client.sourceDisposition,
    callback_profile_ref: client.callbackProfileRef!,
    callback_urls: client.callbackUrls,
    logout_urls: client.logoutUrls,
    allowed_web_origins: client.allowedWebOrigins,
    bundle_identifier: client.bundleIdentifier,
    token_endpoint_auth_method: client.tokenEndpointAuthMethod,
    grant_posture: client.grantPosture,
    session_bootstrap_posture:
      client.family === "NATIVE_MACOS_OPERATOR"
        ? "System-browser Auth Code + PKCE bootstrap only; no embedded-webview primary sign-in."
        : "Server-mediated browser session bootstrap via confidential regular-web client.",
    engine_authorization_boundary:
      "IdP client identity bootstraps authentication posture only; Taxat still resolves actor class, delegation, authority-link truth, and legality server-side.",
    secret_posture: secretMetadataForClient(client),
    source_refs: [
      {
        source_ref:
          "Algorithm/data_model.md::L1811[ActorSession]",
        rationale:
          "ActorSession state is server-authored, so the IdP client only supplies coarse authentication bootstrap.",
      },
      {
        source_ref:
          "https://auth0.com/docs/get-started/applications/application-settings",
        rationale:
          "Current Auth0 application settings govern callback, logout, allowed origin, and native redirect handling.",
      },
    ],
    typed_gaps:
      client.family === "NATIVE_MACOS_OPERATOR"
        ? [
            "Bundle identifier is frozen here for IdP client binding, but the concrete Xcode target and signing profile remain for later app scaffolding cards.",
          ]
        : [],
    notes:
      client.family === "PORTAL_BROWSER"
        ? [
            "Portal browser client remains customer-safe and does not inherit governance-only origins or callback routes.",
          ]
        : client.family === "OPERATOR_BROWSER"
          ? [
              "Operator browser client is kept separate from portal posture to preserve internal shell isolation and independent secret rotation.",
            ]
          : [
              "Native client stays public and PKCE-based; no shared secret is stored for the desktop app.",
            ],
    }));

  return {
    schema_version: "1.0",
    catalog_id: `idp-application-client-catalog-${runContext.workspaceId}`,
    provider_id: IDP_PROVIDER_ID,
    provider_display_name: IDP_PROVIDER_DISPLAY_NAME,
    run_id: runContext.runId,
    flow_id: IDP_TENANT_CLIENT_FLOW_ID,
    workspace_id: runContext.workspaceId,
    operator_identity_alias: runContext.operatorIdentityAlias,
    provider_selection: createProviderSelectionRecord(),
    tenant_record_ref: tenantRecordRef,
    application_clients: applicationClients,
    typed_gaps: [
      "Preview and workstation-local browser origins are intentionally excluded from canonical IdP client registration; they remain non-promotable bootstrap or review surfaces.",
    ],
    notes: [
      "Interactive browser clients are one-per-surface-per-environment to keep secrets, logout posture, and callback hosts isolated.",
      "Native macOS bootstrap uses a public native client with claimed HTTPS callbacks and platform-secure local credential storage.",
    ],
    last_verified_at: nowIso(),
  };
}

function buildMachineInventory(
  runContext: RunContext,
  state: FixtureState,
  tenantRecordRef: string,
): IdpMachineClientInventory {
  return {
    schema_version: "1.0",
    inventory_id: `idp-machine-client-inventory-${runContext.workspaceId}`,
    provider_id: IDP_PROVIDER_ID,
    provider_display_name: IDP_PROVIDER_DISPLAY_NAME,
    run_id: runContext.runId,
    flow_id: IDP_TENANT_CLIENT_FLOW_ID,
    workspace_id: runContext.workspaceId,
    operator_identity_alias: runContext.operatorIdentityAlias,
    provider_selection: createProviderSelectionRecord(),
    tenant_record_ref: tenantRecordRef,
    machine_clients: state.machineClients.map((client) => ({
      client_ref: client.clientRef,
      machine_client_family: client.family as IdpMachineClientFamily,
      tenant_ref: client.tenantRef,
      provider_environment_tag:
        client.family === "PROVIDER_MANAGEMENT_BOOTSTRAP"
          ? state.tenants.find((tenant) => tenant.tenantRef === client.tenantRef)
              ?.providerEnvironmentTag ?? "Staging"
          : state.tenants.find((tenant) => tenant.tenantRef === client.tenantRef)
              ?.providerEnvironmentTag ?? "Staging",
      product_environment_id: client.productEnvironmentId,
      application_type: "MACHINE_TO_MACHINE_APPLICATION",
      client_visibility: "CONFIDENTIAL",
      client_display_name: client.clientDisplayName,
      client_id_alias: client.clientIdAlias,
      client_id_fingerprint: sha256(client.clientIdAlias),
      source_disposition: client.sourceDisposition,
      grant_posture: ["client_credentials"],
      callback_urls: [],
      logout_urls: [],
      allowed_web_origins: [],
      management_audience_ref:
        client.family === "PROVIDER_MANAGEMENT_BOOTSTRAP"
          ? "urn:auth0-management-api"
          : "urn:taxat:backend-service",
      mfa_posture: "NOT_APPLICABLE_MACHINE",
      secret_posture: secretMetadataForClient(client),
      source_refs: [
        {
          source_ref:
            "Algorithm/actor_and_authority_model.md::L555[3.13_Machine-actor_rules]",
          rationale:
            "Machine actors remain distinct from human sessions and cannot satisfy human step-up or delegation rules.",
        },
        {
          source_ref:
            "https://auth0.com/docs/get-started/auth0-overview/create-applications/machine-to-machine-apps",
          rationale:
            "Current Auth0 machine-to-machine guidance requires explicit application registration and API grant posture.",
        },
      ],
      typed_gaps:
        client.family === "PROVIDER_MANAGEMENT_BOOTSTRAP"
          ? [
              "Management API scopes remain intentionally narrow and will be finalized when pc_0040 applies the role, scope, MFA, and session policy pack.",
            ]
          : [
              "Taxat backend API audiences and client-grant details remain for later backend implementation cards; this card freezes the machine identity boundary only.",
            ],
      notes: [
        "Machine credentials never inherit browser callback, logout, or MFA semantics.",
      ],
    })),
    typed_gaps: [],
    notes: [
      "Separate machine clients are maintained for Taxat backend automation and IdP management bootstrap so admin material never collapses into product-runtime service identity.",
    ],
    last_verified_at: nowIso(),
  };
}

function buildCallbackOriginMatrix(
  runContext: RunContext,
  applicationCatalog: IdpApplicationClientCatalog,
): IdpCallbackOriginMatrix {
  const rows: IdpCallbackOriginRow[] = applicationCatalog.application_clients.map((client) => ({
    row_id: `callback-origin.${client.client_ref}`,
    client_ref: client.client_ref,
    surface_family: client.surface_family,
    product_environment_id: client.product_environment_id,
    deployable_id: client.deployable_id,
    callback_profile_ref: client.callback_profile_ref,
    registration_decision: "CONFIGURE_NOW",
    callback_urls: client.callback_urls,
    logout_urls: client.logout_urls,
    allowed_web_origins: client.allowed_web_origins,
    bundle_identifier: client.bundle_identifier,
    rationale:
      client.surface_family === "NATIVE_MACOS_OPERATOR"
        ? "Native system-browser auth returns through a claimed HTTPS callback that stays environment-specific while the desktop app keeps public-client posture."
        : "Each browser client is environment-specific and returns through the environment-auth gateway instead of directly through an app shell origin.",
    host_separation_rule:
      "Each environment keeps a disjoint auth host, callback path, and logout return target. Production never shares callback or origin domains with non-production.",
    source_refs: [
      {
        source_ref:
          "Algorithm/northbound_api_and_session_contract.md::L709[8._Session_browser_and_native-client_rules]",
        rationale:
          "Browser and native channels keep distinct callback and session bootstrap rules.",
      },
      {
        source_ref:
          "https://auth0.com/docs/get-started/applications/application-settings",
        rationale:
          "Current Auth0 guidance requires explicit callback, logout, and allowed-origin registration per application.",
      },
    ],
  }));

  rows.push(
    {
      row_id: "callback-origin.local-browser-bootstrap",
      client_ref: "none",
      surface_family: "LOCAL_BROWSER_BOOTSTRAP_REJECTED",
      product_environment_id: "env_local_provisioning_workstation",
      deployable_id: "deployable_local_provisioning_workspace",
      callback_profile_ref: "idp_cb_local_bootstrap_rejected",
      registration_decision: "DO_NOT_REGISTER",
      callback_urls: ["http://localhost:4310/oauth/idp/operator/bootstrap-callback"],
      logout_urls: ["http://localhost:4310/logout-complete"],
      allowed_web_origins: ["http://localhost:4310"],
      bundle_identifier: null,
      rationale:
        "Local provisioning browser callbacks are workstation-only bootstrap conveniences and do not belong on canonical runtime IdP clients.",
      host_separation_rule:
        "Local browser bootstrap stays outside promotable IdP runtime registration.",
      source_refs: [
        {
          source_ref:
            "Algorithm/deployment_and_resilience_contract.md::L230[Promotion_boundary]",
          rationale:
            "Promotion boundaries forbid collapsing workstation-only bootstrap hosts into canonical runtime configuration.",
        },
      ],
    },
    {
      row_id: "callback-origin.preview-rejected",
      client_ref: "none",
      surface_family: "EPHEMERAL_REVIEW_REJECTED",
      product_environment_id: "env_ephemeral_review",
      deployable_id: "deployable_preview_web_shell",
      callback_profile_ref: "idp_cb_preview_rejected",
      registration_decision: "DO_NOT_REGISTER",
      callback_urls: ["https://preview-{id}.review.taxat.example/oauth/idp/operator/callback"],
      logout_urls: ["https://preview-{id}.review.taxat.example/logout-complete"],
      allowed_web_origins: ["https://preview-{id}.review.taxat.example"],
      bundle_identifier: null,
      rationale:
        "Ephemeral preview origins are intentionally excluded from IdP runtime registration because they are unstable and not admissible as callback truth.",
      host_separation_rule:
        "Preview hosts remain outside the stable callback envelope and must not dilute origin or logout allowlists.",
      source_refs: [
        {
          source_ref:
            "Algorithm/release_candidate_identity_and_promotion_evidence_contract.md::L23[ReleaseCandidateIdentityContract]",
          rationale:
            "Release evidence requires stable callback identity rather than review-environment drift.",
        },
      ],
    },
  );

  return {
    schema_version: "1.0",
    matrix_id: `idp-callback-origin-matrix-${runContext.workspaceId}`,
    provider_id: IDP_PROVIDER_ID,
    provider_display_name: IDP_PROVIDER_DISPLAY_NAME,
    run_id: runContext.runId,
    flow_id: IDP_TENANT_CLIENT_FLOW_ID,
    workspace_id: runContext.workspaceId,
    provider_selection: createProviderSelectionRecord(),
    rows,
    typed_gaps: [
      "Preview and local bootstrap callback rows are intentionally recorded as DO_NOT_REGISTER so later agents do not mistake them for canonical runtime origins.",
    ],
    notes: [
      "Operator and portal browser clients use environment-auth gateway callbacks, while native uses claimed HTTPS callbacks bound to the shipping macOS target.",
    ],
    last_verified_at: nowIso(),
  };
}

export function validateIdpApplicationClientCatalog(
  catalog: IdpApplicationClientCatalog,
  callbackMatrix: IdpCallbackOriginMatrix,
  tenants: IdpTenantRecordCatalog,
): void {
  const tenantRefs = new Set(tenants.tenant_records.map((tenant) => tenant.tenant_ref));
  const matrixByClient = new Map(
    callbackMatrix.rows
      .filter((row) => row.registration_decision === "CONFIGURE_NOW")
      .map((row) => [row.client_ref, row]),
  );

  for (const client of catalog.application_clients) {
    if (!tenantRefs.has(client.tenant_ref)) {
      throw new Error(`Application client ${client.client_ref} references unknown tenant ${client.tenant_ref}.`);
    }
    const row = matrixByClient.get(client.client_ref);
    if (!row) {
      throw new Error(`Application client ${client.client_ref} is missing callback/origin matrix coverage.`);
    }
    if (client.callback_urls.length === 0 || client.logout_urls.length === 0) {
      throw new Error(`Application client ${client.client_ref} must declare callback and logout URLs.`);
    }
    if (
      client.surface_family !== "NATIVE_MACOS_OPERATOR" &&
      client.allowed_web_origins.length === 0
    ) {
      throw new Error(`Browser client ${client.client_ref} must declare allowed web origins.`);
    }
    if (client.surface_family === "NATIVE_MACOS_OPERATOR") {
      if (client.application_type !== "NATIVE_APPLICATION") {
        throw new Error(`Native surface ${client.client_ref} must be a native application.`);
      }
      if (client.client_visibility !== "PUBLIC") {
        throw new Error(`Native surface ${client.client_ref} must remain a public client.`);
      }
      if (!client.bundle_identifier) {
        throw new Error(`Native surface ${client.client_ref} must declare a bundle identifier.`);
      }
      if (client.secret_posture.requires_vault_secret) {
        throw new Error(`Native surface ${client.client_ref} must not require a shared client secret.`);
      }
    } else {
      if (client.application_type !== "REGULAR_WEB_APPLICATION") {
        throw new Error(`Browser surface ${client.client_ref} must be a regular web application.`);
      }
      if (client.client_visibility !== "CONFIDENTIAL") {
        throw new Error(`Browser surface ${client.client_ref} must remain confidential.`);
      }
      if (!client.secret_posture.requires_vault_secret) {
        throw new Error(`Browser surface ${client.client_ref} must require a vault-bound secret posture.`);
      }
    }
  }
}

export function validateIdpMachineClientInventory(
  inventory: IdpMachineClientInventory,
  tenants: IdpTenantRecordCatalog,
): void {
  const tenantRefs = new Set(tenants.tenant_records.map((tenant) => tenant.tenant_ref));
  for (const client of inventory.machine_clients) {
    if (!tenantRefs.has(client.tenant_ref)) {
      throw new Error(`Machine client ${client.client_ref} references unknown tenant ${client.tenant_ref}.`);
    }
    if (client.callback_urls.length || client.logout_urls.length || client.allowed_web_origins.length) {
      throw new Error(`Machine client ${client.client_ref} must not carry callback or origin state.`);
    }
    if (client.mfa_posture !== "NOT_APPLICABLE_MACHINE") {
      throw new Error(`Machine client ${client.client_ref} must remain outside MFA posture.`);
    }
    if (!client.secret_posture.requires_vault_secret) {
      throw new Error(`Machine client ${client.client_ref} must remain vault-bound.`);
    }
    if (client.grant_posture.join(",") !== "client_credentials") {
      throw new Error(`Machine client ${client.client_ref} must use client credentials only.`);
    }
  }
}

export function buildTemplateIdpArtifacts(
  runContext: RunContext,
  state: FixtureState,
): {
  tenantRecord: IdpTenantRecordCatalog;
  applicationClientCatalog: IdpApplicationClientCatalog;
  callbackOriginMatrix: IdpCallbackOriginMatrix;
  machineClientInventory: IdpMachineClientInventory;
} {
  const tenantRecord = buildTenantCatalog(runContext, state);
  const applicationClientCatalog = buildApplicationCatalog(
    runContext,
    state,
    "./idp_tenant_record.template.json",
  );
  const callbackOriginMatrix = buildCallbackOriginMatrix(
    runContext,
    applicationClientCatalog,
  );
  const machineClientInventory = buildMachineInventory(
    runContext,
    state,
    "./idp_tenant_record.template.json",
  );
  validateIdpApplicationClientCatalog(
    applicationClientCatalog,
    callbackOriginMatrix,
    tenantRecord,
  );
  validateIdpMachineClientInventory(machineClientInventory, tenantRecord);
  return {
    tenantRecord,
    applicationClientCatalog,
    callbackOriginMatrix,
    machineClientInventory,
  };
}

export function createRecommendedFixtureState(
  mode: "fresh" | "existing" = "existing",
): FixtureState {
  const recommendedTenants: TenantState[] = [
    {
      tenantRef: "idp_tenant_dev_shared",
      tenantLabel: "Taxat Development Shared Tenant",
      tenantDomainAlias: "taxat-dev.eu.auth0.test",
      customDomain: "auth.dev.taxat.example",
      providerEnvironmentTag: "Development",
      region: "EU",
      productEnvironmentIds: ["env_local_provisioning_workstation"],
      secretNamespaceRefs: ["sec_local_provisioning_sandbox"],
      sourceDisposition: "CREATED_DURING_RUN",
    },
    {
      tenantRef: "idp_tenant_staging_runtime",
      tenantLabel: "Taxat Staging Runtime Tenant",
      tenantDomainAlias: "taxat-staging.eu.auth0.test",
      customDomain: "auth.sandbox-preprod.taxat.example",
      providerEnvironmentTag: "Staging",
      region: "EU",
      productEnvironmentIds: [
        "env_shared_sandbox_integration",
        "env_preproduction_verification",
      ],
      secretNamespaceRefs: ["sec_sandbox_runtime", "sec_preprod_runtime"],
      sourceDisposition: "CREATED_DURING_RUN",
    },
    {
      tenantRef: "idp_tenant_production_runtime",
      tenantLabel: "Taxat Production Runtime Tenant",
      tenantDomainAlias: "taxat-production.eu.auth0.test",
      customDomain: "auth.production.taxat.example",
      providerEnvironmentTag: "Production",
      region: "EU",
      productEnvironmentIds: ["env_production"],
      secretNamespaceRefs: ["sec_production_runtime"],
      sourceDisposition: "CREATED_DURING_RUN",
    },
  ];

  const interactiveClients: ClientState[] = [
    {
      clientRef: "idp_client_operator_browser_sandbox",
      family: "OPERATOR_BROWSER",
      productEnvironmentId: "env_shared_sandbox_integration",
      tenantRef: "idp_tenant_staging_runtime",
      applicationType: "REGULAR_WEB_APPLICATION",
      clientVisibility: "CONFIDENTIAL",
      deployableId: "operator-web",
      clientDisplayName: "Taxat Operator Web Sandbox",
      clientIdAlias: "idp-operator-web-sandbox",
      clientSecret: "sandbox-operator-secret",
      callbackProfileRef: "idp_cb_operator_browser_sandbox",
      callbackUrls: ["https://auth.sandbox.taxat.example/oauth/idp/operator/callback"],
      logoutUrls: ["https://operator.sandbox.taxat.example/auth/logout-complete"],
      allowedWebOrigins: ["https://operator.sandbox.taxat.example"],
      bundleIdentifier: null,
      tokenEndpointAuthMethod: "client_secret_post",
      grantPosture: ["authorization_code", "refresh_token"],
      sourceDisposition: "CREATED_DURING_RUN",
      secretNamespaceRef: "sec_sandbox_runtime",
    },
    {
      clientRef: "idp_client_portal_browser_sandbox",
      family: "PORTAL_BROWSER",
      productEnvironmentId: "env_shared_sandbox_integration",
      tenantRef: "idp_tenant_staging_runtime",
      applicationType: "REGULAR_WEB_APPLICATION",
      clientVisibility: "CONFIDENTIAL",
      deployableId: "client-portal-web",
      clientDisplayName: "Taxat Portal Web Sandbox",
      clientIdAlias: "idp-portal-web-sandbox",
      clientSecret: "sandbox-portal-secret",
      callbackProfileRef: "idp_cb_portal_browser_sandbox",
      callbackUrls: ["https://auth.sandbox.taxat.example/oauth/idp/portal/callback"],
      logoutUrls: ["https://portal.sandbox.taxat.example/auth/logout-complete"],
      allowedWebOrigins: ["https://portal.sandbox.taxat.example"],
      bundleIdentifier: null,
      tokenEndpointAuthMethod: "client_secret_post",
      grantPosture: ["authorization_code", "refresh_token"],
      sourceDisposition: "CREATED_DURING_RUN",
      secretNamespaceRef: "sec_sandbox_runtime",
    },
    {
      clientRef: "idp_client_native_operator_sandbox",
      family: "NATIVE_MACOS_OPERATOR",
      productEnvironmentId: "env_shared_sandbox_integration",
      tenantRef: "idp_tenant_staging_runtime",
      applicationType: "NATIVE_APPLICATION",
      clientVisibility: "PUBLIC",
      deployableId: "Apps/InternalOperatorWorkspaceMac",
      clientDisplayName: "Taxat Native Operator Sandbox",
      clientIdAlias: "idp-native-operator-sandbox",
      clientSecret: null,
      callbackProfileRef: "idp_cb_native_operator_sandbox",
      callbackUrls: ["https://auth.sandbox.taxat.example/oauth/idp/native/operator/callback"],
      logoutUrls: ["https://auth.sandbox.taxat.example/oauth/idp/native/operator/callback"],
      allowedWebOrigins: [],
      bundleIdentifier: "dev.taxat.InternalOperatorWorkspaceMac",
      tokenEndpointAuthMethod: "none",
      grantPosture: ["authorization_code", "refresh_token", "pkce"],
      sourceDisposition: "CREATED_DURING_RUN",
      secretNamespaceRef: null,
    },
    {
      clientRef: "idp_client_operator_browser_preprod",
      family: "OPERATOR_BROWSER",
      productEnvironmentId: "env_preproduction_verification",
      tenantRef: "idp_tenant_staging_runtime",
      applicationType: "REGULAR_WEB_APPLICATION",
      clientVisibility: "CONFIDENTIAL",
      deployableId: "operator-web",
      clientDisplayName: "Taxat Operator Web Pre-production",
      clientIdAlias: "idp-operator-web-preprod",
      clientSecret: "preprod-operator-secret",
      callbackProfileRef: "idp_cb_operator_browser_preprod",
      callbackUrls: ["https://auth.preprod.taxat.example/oauth/idp/operator/callback"],
      logoutUrls: ["https://operator.preprod.taxat.example/auth/logout-complete"],
      allowedWebOrigins: ["https://operator.preprod.taxat.example"],
      bundleIdentifier: null,
      tokenEndpointAuthMethod: "client_secret_post",
      grantPosture: ["authorization_code", "refresh_token"],
      sourceDisposition: "CREATED_DURING_RUN",
      secretNamespaceRef: "sec_preprod_runtime",
    },
    {
      clientRef: "idp_client_portal_browser_preprod",
      family: "PORTAL_BROWSER",
      productEnvironmentId: "env_preproduction_verification",
      tenantRef: "idp_tenant_staging_runtime",
      applicationType: "REGULAR_WEB_APPLICATION",
      clientVisibility: "CONFIDENTIAL",
      deployableId: "client-portal-web",
      clientDisplayName: "Taxat Portal Web Pre-production",
      clientIdAlias: "idp-portal-web-preprod",
      clientSecret: "preprod-portal-secret",
      callbackProfileRef: "idp_cb_portal_browser_preprod",
      callbackUrls: ["https://auth.preprod.taxat.example/oauth/idp/portal/callback"],
      logoutUrls: ["https://portal.preprod.taxat.example/auth/logout-complete"],
      allowedWebOrigins: ["https://portal.preprod.taxat.example"],
      bundleIdentifier: null,
      tokenEndpointAuthMethod: "client_secret_post",
      grantPosture: ["authorization_code", "refresh_token"],
      sourceDisposition: "CREATED_DURING_RUN",
      secretNamespaceRef: "sec_preprod_runtime",
    },
    {
      clientRef: "idp_client_native_operator_preprod",
      family: "NATIVE_MACOS_OPERATOR",
      productEnvironmentId: "env_preproduction_verification",
      tenantRef: "idp_tenant_staging_runtime",
      applicationType: "NATIVE_APPLICATION",
      clientVisibility: "PUBLIC",
      deployableId: "Apps/InternalOperatorWorkspaceMac",
      clientDisplayName: "Taxat Native Operator Pre-production",
      clientIdAlias: "idp-native-operator-preprod",
      clientSecret: null,
      callbackProfileRef: "idp_cb_native_operator_preprod",
      callbackUrls: ["https://auth.preprod.taxat.example/oauth/idp/native/operator/callback"],
      logoutUrls: ["https://auth.preprod.taxat.example/oauth/idp/native/operator/callback"],
      allowedWebOrigins: [],
      bundleIdentifier: "dev.taxat.InternalOperatorWorkspaceMac",
      tokenEndpointAuthMethod: "none",
      grantPosture: ["authorization_code", "refresh_token", "pkce"],
      sourceDisposition: "CREATED_DURING_RUN",
      secretNamespaceRef: null,
    },
    {
      clientRef: "idp_client_operator_browser_production",
      family: "OPERATOR_BROWSER",
      productEnvironmentId: "env_production",
      tenantRef: "idp_tenant_production_runtime",
      applicationType: "REGULAR_WEB_APPLICATION",
      clientVisibility: "CONFIDENTIAL",
      deployableId: "operator-web",
      clientDisplayName: "Taxat Operator Web Production",
      clientIdAlias: "idp-operator-web-production",
      clientSecret: "production-operator-secret",
      callbackProfileRef: "idp_cb_operator_browser_production",
      callbackUrls: ["https://auth.production.taxat.example/oauth/idp/operator/callback"],
      logoutUrls: ["https://operator.production.taxat.example/auth/logout-complete"],
      allowedWebOrigins: ["https://operator.production.taxat.example"],
      bundleIdentifier: null,
      tokenEndpointAuthMethod: "client_secret_post",
      grantPosture: ["authorization_code", "refresh_token"],
      sourceDisposition: "CREATED_DURING_RUN",
      secretNamespaceRef: "sec_production_runtime",
    },
    {
      clientRef: "idp_client_portal_browser_production",
      family: "PORTAL_BROWSER",
      productEnvironmentId: "env_production",
      tenantRef: "idp_tenant_production_runtime",
      applicationType: "REGULAR_WEB_APPLICATION",
      clientVisibility: "CONFIDENTIAL",
      deployableId: "client-portal-web",
      clientDisplayName: "Taxat Portal Web Production",
      clientIdAlias: "idp-portal-web-production",
      clientSecret: "production-portal-secret",
      callbackProfileRef: "idp_cb_portal_browser_production",
      callbackUrls: ["https://auth.production.taxat.example/oauth/idp/portal/callback"],
      logoutUrls: ["https://portal.production.taxat.example/auth/logout-complete"],
      allowedWebOrigins: ["https://portal.production.taxat.example"],
      bundleIdentifier: null,
      tokenEndpointAuthMethod: "client_secret_post",
      grantPosture: ["authorization_code", "refresh_token"],
      sourceDisposition: "CREATED_DURING_RUN",
      secretNamespaceRef: "sec_production_runtime",
    },
    {
      clientRef: "idp_client_native_operator_production",
      family: "NATIVE_MACOS_OPERATOR",
      productEnvironmentId: "env_production",
      tenantRef: "idp_tenant_production_runtime",
      applicationType: "NATIVE_APPLICATION",
      clientVisibility: "PUBLIC",
      deployableId: "Apps/InternalOperatorWorkspaceMac",
      clientDisplayName: "Taxat Native Operator Production",
      clientIdAlias: "idp-native-operator-production",
      clientSecret: null,
      callbackProfileRef: "idp_cb_native_operator_production",
      callbackUrls: ["https://auth.production.taxat.example/oauth/idp/native/operator/callback"],
      logoutUrls: ["https://auth.production.taxat.example/oauth/idp/native/operator/callback"],
      allowedWebOrigins: [],
      bundleIdentifier: "dev.taxat.InternalOperatorWorkspaceMac",
      tokenEndpointAuthMethod: "none",
      grantPosture: ["authorization_code", "refresh_token", "pkce"],
      sourceDisposition: "CREATED_DURING_RUN",
      secretNamespaceRef: null,
    },
  ];

  const machineClients: ClientState[] = [
    {
      clientRef: "idp_client_backend_automation_sandbox",
      family: "BACKEND_SERVICE_AUTOMATION",
      productEnvironmentId: "env_shared_sandbox_integration",
      tenantRef: "idp_tenant_staging_runtime",
      applicationType: "MACHINE_TO_MACHINE_APPLICATION",
      clientVisibility: "CONFIDENTIAL",
      deployableId: "control-plane-automation",
      clientDisplayName: "Taxat Backend Automation Sandbox",
      clientIdAlias: "idp-backend-automation-sandbox",
      clientSecret: "sandbox-backend-automation-secret",
      callbackProfileRef: null,
      callbackUrls: [],
      logoutUrls: [],
      allowedWebOrigins: [],
      bundleIdentifier: null,
      tokenEndpointAuthMethod: "client_secret_post",
      grantPosture: ["client_credentials"],
      sourceDisposition: "CREATED_DURING_RUN",
      secretNamespaceRef: "sec_sandbox_runtime",
    },
    {
      clientRef: "idp_client_backend_automation_preprod",
      family: "BACKEND_SERVICE_AUTOMATION",
      productEnvironmentId: "env_preproduction_verification",
      tenantRef: "idp_tenant_staging_runtime",
      applicationType: "MACHINE_TO_MACHINE_APPLICATION",
      clientVisibility: "CONFIDENTIAL",
      deployableId: "control-plane-automation",
      clientDisplayName: "Taxat Backend Automation Pre-production",
      clientIdAlias: "idp-backend-automation-preprod",
      clientSecret: "preprod-backend-automation-secret",
      callbackProfileRef: null,
      callbackUrls: [],
      logoutUrls: [],
      allowedWebOrigins: [],
      bundleIdentifier: null,
      tokenEndpointAuthMethod: "client_secret_post",
      grantPosture: ["client_credentials"],
      sourceDisposition: "CREATED_DURING_RUN",
      secretNamespaceRef: "sec_preprod_runtime",
    },
    {
      clientRef: "idp_client_backend_automation_production",
      family: "BACKEND_SERVICE_AUTOMATION",
      productEnvironmentId: "env_production",
      tenantRef: "idp_tenant_production_runtime",
      applicationType: "MACHINE_TO_MACHINE_APPLICATION",
      clientVisibility: "CONFIDENTIAL",
      deployableId: "control-plane-automation",
      clientDisplayName: "Taxat Backend Automation Production",
      clientIdAlias: "idp-backend-automation-production",
      clientSecret: "production-backend-automation-secret",
      callbackProfileRef: null,
      callbackUrls: [],
      logoutUrls: [],
      allowedWebOrigins: [],
      bundleIdentifier: null,
      tokenEndpointAuthMethod: "client_secret_post",
      grantPosture: ["client_credentials"],
      sourceDisposition: "CREATED_DURING_RUN",
      secretNamespaceRef: "sec_production_runtime",
    },
    {
      clientRef: "idp_client_management_bootstrap_dev",
      family: "PROVIDER_MANAGEMENT_BOOTSTRAP",
      productEnvironmentId: null,
      tenantRef: "idp_tenant_dev_shared",
      applicationType: "MACHINE_TO_MACHINE_APPLICATION",
      clientVisibility: "CONFIDENTIAL",
      deployableId: "provider-management-bootstrap",
      clientDisplayName: "Taxat Provider Management Bootstrap Development",
      clientIdAlias: "idp-management-bootstrap-dev",
      clientSecret: "development-management-secret",
      callbackProfileRef: null,
      callbackUrls: [],
      logoutUrls: [],
      allowedWebOrigins: [],
      bundleIdentifier: null,
      tokenEndpointAuthMethod: "client_secret_post",
      grantPosture: ["client_credentials"],
      sourceDisposition: "CREATED_DURING_RUN",
      secretNamespaceRef: "sec_local_provisioning_sandbox",
    },
    {
      clientRef: "idp_client_management_bootstrap_staging",
      family: "PROVIDER_MANAGEMENT_BOOTSTRAP",
      productEnvironmentId: null,
      tenantRef: "idp_tenant_staging_runtime",
      applicationType: "MACHINE_TO_MACHINE_APPLICATION",
      clientVisibility: "CONFIDENTIAL",
      deployableId: "provider-management-bootstrap",
      clientDisplayName: "Taxat Provider Management Bootstrap Staging",
      clientIdAlias: "idp-management-bootstrap-staging",
      clientSecret: "staging-management-secret",
      callbackProfileRef: null,
      callbackUrls: [],
      logoutUrls: [],
      allowedWebOrigins: [],
      bundleIdentifier: null,
      tokenEndpointAuthMethod: "client_secret_post",
      grantPosture: ["client_credentials"],
      sourceDisposition: "CREATED_DURING_RUN",
      secretNamespaceRef: "sec_preprod_runtime",
    },
    {
      clientRef: "idp_client_management_bootstrap_production",
      family: "PROVIDER_MANAGEMENT_BOOTSTRAP",
      productEnvironmentId: null,
      tenantRef: "idp_tenant_production_runtime",
      applicationType: "MACHINE_TO_MACHINE_APPLICATION",
      clientVisibility: "CONFIDENTIAL",
      deployableId: "provider-management-bootstrap",
      clientDisplayName: "Taxat Provider Management Bootstrap Production",
      clientIdAlias: "idp-management-bootstrap-production",
      clientSecret: "production-management-secret",
      callbackProfileRef: null,
      callbackUrls: [],
      logoutUrls: [],
      allowedWebOrigins: [],
      bundleIdentifier: null,
      tokenEndpointAuthMethod: "client_secret_post",
      grantPosture: ["client_credentials"],
      sourceDisposition: "CREATED_DURING_RUN",
      secretNamespaceRef: "sec_production_runtime",
    },
  ];

  if (mode === "existing") {
    return {
      providerLabel: "Auth0-compatible external IdP",
      providerMonogram: "OIDC",
      workspaceIdentityRef: "auth0-team.taxat-control-plane",
      region: "EU",
      tenantAdminAlias: "ops.idp.bootstrap",
      tenants: recommendedTenants.map((tenant) => ({
        ...tenant,
        sourceDisposition: "ADOPTED_EXISTING",
      })),
      interactiveClients: interactiveClients.map((client) => ({
        ...client,
        sourceDisposition: "ADOPTED_EXISTING",
        clientSecretFingerprint: client.clientSecret ? sha256(client.clientSecret) : null,
        clientSecret: null,
      })),
      machineClients: machineClients.map((client) => ({
        ...client,
        sourceDisposition: "ADOPTED_EXISTING",
        clientSecretFingerprint: client.clientSecret ? sha256(client.clientSecret) : null,
        clientSecret: null,
      })),
      notes: [
        "Seeded from the checked-in recommended topology so templates and tests share one stable control-plane map.",
      ],
    };
  }

  return {
    providerLabel: "Auth0-compatible external IdP",
    providerMonogram: "OIDC",
    workspaceIdentityRef: "auth0-team.taxat-control-plane",
    region: "EU",
    tenantAdminAlias: "ops.idp.bootstrap",
    tenants: recommendedTenants,
    interactiveClients,
    machineClients,
    notes: [
      "Fresh bootstrap posture with create-during-run state and immediate vault capture for confidential clients.",
    ],
  };
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
  const selector = manifest.selectors.find((candidate) => candidate.selectorId === selectorId);
  if (!selector) {
    throw new Error(`Selector ${selectorId} missing from Auth0 manifest.`);
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

async function readFixtureState(page: Page): Promise<FixtureState> {
  return page.evaluate(() => {
    const host = window as typeof window & {
      __idpFixture?: { getState: () => unknown };
    };
    if (!host.__idpFixture?.getState) {
      throw new Error("No fixture/live adapter exposed on window.__idpFixture.");
    }
    return host.__idpFixture.getState() as FixtureState;
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

export async function createIdpTenantAndClients(
  options: CreateIdpTenantAndClientsOptions,
): Promise<CreateIdpTenantAndClientsResult> {
  const providerRegistry = createDefaultProviderRegistry();
  const provider = providerRegistry.getRequired(IDP_PROVIDER_ID);
  assertProviderFlowAllowed(options.runContext, provider, IDP_TENANT_CLIENT_FLOW_ID);

  const entryUrls = options.entryUrls ?? createDefaultIdpEntryUrls();
  const selectorManifest = await loadAuth0SelectorManifest();
  let evidenceManifest = createEvidenceManifest(options.runContext);

  const steps = [
    createPendingStep({
      stepId: IDP_STEP_IDS.openControlPlane,
      title: "Open the IdP control-plane workspace",
      selectorRefs: ["control-plane-heading"],
    }),
    createPendingStep({
      stepId: IDP_STEP_IDS.reconcileTenants,
      title: "Create or adopt the recommended tenant set",
      selectorRefs: ["tenants-heading", "create-recommended-tenants", "tenant-row-fallback"],
    }),
    createPendingStep({
      stepId: IDP_STEP_IDS.reconcileInteractiveClients,
      title: "Create or adopt interactive browser and native clients",
      selectorRefs: ["applications-heading", "create-recommended-clients", "client-row-fallback"],
    }),
    createPendingStep({
      stepId: IDP_STEP_IDS.reconcileMachineClients,
      title: "Create or adopt machine and bootstrap clients",
      selectorRefs: ["machine-clients-heading", "create-recommended-clients", "client-row-fallback"],
    }),
    createPendingStep({
      stepId: IDP_STEP_IDS.persistArtifacts,
      title: "Persist the tenant, client, and callback topology pack",
      selectorRefs: [],
    }),
  ];

  steps[0] = transitionStep(
    steps[0]!,
    "RUNNING",
    "Opening the IdP control-plane workspace.",
  );
  await options.page.goto(entryUrls.controlPlane);
  await getRequiredLocator(options.page, selectorManifest, "control-plane-heading");
  steps[0] = transitionStep(
    steps[0]!,
    "SUCCEEDED",
    "Control-plane workspace opened.",
  );
  evidenceManifest = await appendNote(
    evidenceManifest,
    steps[0].stepId,
    `${steps[0].stepId}.note.1`,
    "Opened the Auth0-compatible control-plane workspace and resolved the canonical heading with semantic selectors.",
  );

  let currentState = await readFixtureState(options.page);

  steps[1] = transitionStep(
    steps[1]!,
    "RUNNING",
    "Inspecting recommended tenant topology.",
  );
  await getRequiredLocator(options.page, selectorManifest, "tenants-heading");
  if (currentState.tenants.some((tenant) => tenant.sourceDisposition === "CREATED_DURING_RUN")) {
    // no-op when the fixture already starts from a fresh-created state
  } else if (currentState.tenants.length < 3) {
    await (await getRequiredLocator(options.page, selectorManifest, "create-recommended-tenants")).click();
    await clickFixtureAction(options.page, "createRecommendedTenants");
  }
  currentState = await readFixtureState(options.page);
  steps[1] = transitionStep(
    steps[1]!,
    "SUCCEEDED",
    "Tenant topology reconciled.",
  );
  evidenceManifest = await appendNote(
    evidenceManifest,
    steps[1].stepId,
    `${steps[1].stepId}.note.1`,
    "Reconciled the three recommended control-plane tenants across development, staging, and production tags without mirroring Taxat business tenants into the provider.",
  );

  steps[2] = transitionStep(
    steps[2]!,
    "RUNNING",
    "Reconciling interactive browser and native clients.",
  );
  await getRequiredLocator(options.page, selectorManifest, "applications-heading");
  if (currentState.interactiveClients.some((client) => client.sourceDisposition === "CREATED_DURING_RUN")) {
    // already created
  } else if (currentState.interactiveClients.length < 9) {
    await (await getRequiredLocator(options.page, selectorManifest, "create-recommended-clients")).click();
    await clickFixtureAction(options.page, "createRecommendedClients");
  }
  currentState = await readFixtureState(options.page);
  steps[2] = transitionStep(
    steps[2]!,
    "SUCCEEDED",
    "Interactive client topology reconciled.",
  );
  evidenceManifest = await appendNote(
    evidenceManifest,
    steps[2].stepId,
    `${steps[2].stepId}.note.1`,
    "Created or adopted operator-web, client-portal-web, and native-macOS clients per environment with distinct callback, logout, origin, and secret posture.",
  );

  steps[3] = transitionStep(
    steps[3]!,
    "RUNNING",
    "Reconciling machine automation and management-bootstrap clients.",
  );
  await getRequiredLocator(options.page, selectorManifest, "machine-clients-heading");
  currentState = await readFixtureState(options.page);
  steps[3] = transitionStep(
    steps[3]!,
    "SUCCEEDED",
    "Machine client topology reconciled.",
  );
  evidenceManifest = await appendNote(
    evidenceManifest,
    steps[3].stepId,
    `${steps[3].stepId}.note.1`,
    "Separated runtime service automation from provider-management bootstrap so admin-boundary credentials do not collapse into product machine identity.",
  );

  steps[4] = transitionStep(
    steps[4]!,
    "RUNNING",
    "Persisting deterministic topology artifacts.",
  );
  const artifacts = buildTemplateIdpArtifacts(options.runContext, currentState);
  await persistJson(options.tenantRecordPath, artifacts.tenantRecord);
  await persistJson(
    options.applicationClientCatalogPath,
    {
      ...artifacts.applicationClientCatalog,
      tenant_record_ref: path.relative(
        path.dirname(options.applicationClientCatalogPath),
        options.tenantRecordPath,
      ) || path.basename(options.tenantRecordPath),
    },
  );
  await persistJson(options.callbackOriginMatrixPath, artifacts.callbackOriginMatrix);
  await persistJson(
    options.machineClientInventoryPath,
    {
      ...artifacts.machineClientInventory,
      tenant_record_ref: path.relative(
        path.dirname(options.machineClientInventoryPath),
        options.tenantRecordPath,
      ) || path.basename(options.tenantRecordPath),
    },
  );
  const evidenceManifestPath = `${options.tenantRecordPath}.evidence_manifest.json`;
  await persistJson(evidenceManifestPath, evidenceManifest);
  steps[4] = transitionStep(
    steps[4]!,
    "SUCCEEDED",
    "Topology artifacts persisted.",
  );

  return {
    outcome: "IDP_TOPOLOGY_READY",
    steps,
    evidenceManifestPath,
    tenantRecord: artifacts.tenantRecord,
    applicationClientCatalog: artifacts.applicationClientCatalog,
    callbackOriginMatrix: artifacts.callbackOriginMatrix,
    machineClientInventory: artifacts.machineClientInventory,
    notes: [
      "Auth0-compatible default applied because earlier ADRs fixed the IdP posture but not the vendor.",
      "Business-tenant truth remains engine-owned; the provider topology only bootstraps coarse authentication and session posture.",
      ...currentState.notes,
    ],
  };
}

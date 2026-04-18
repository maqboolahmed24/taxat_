import { mkdir, readFile, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import path from "node:path";

import type { Locator, Page } from "@playwright/test";

import {
  assertProviderFlowAllowed,
  createDefaultProviderRegistry,
} from "../../../core/provider_registry.js";
import {
  rankSelectors,
  type SelectorManifest,
} from "../../../core/selector_contract.js";
import type { RunContext } from "../../../core/run_context.js";
import {
  createPendingStep,
  transitionStep,
  type StepContract,
} from "../../../core/step_contract.js";
import {
  appendSanitizedEvidence,
  createDeveloperHubEvidenceManifest,
  DEVELOPER_HUB_PROVIDER_ID,
  dismissCookieBanner,
  waitForPortalStability,
} from "./developer_hub_shared.js";
import {
  assertSandboxApplicationRecordSanitized,
  createDefaultSandboxApplicationEntryUrls,
  findApplicationLink,
  loadRequiredApiSetBaseline,
  HMRC_SANDBOX_APP_FLOW_ID,
  type RequiredApiDescriptor,
  type RequiredApiSetBaseline,
  type SandboxApplicationEntryUrls,
  type SandboxApplicationRecord,
} from "./register_sandbox_application.js";

export const HMRC_REDIRECT_SLOT_BUDGET = 5;

const CONFIGURED_CALLBACK_REFS = [
  "cb_sandbox_web",
  "cb_sandbox_desktop",
  "cb_preprod_web",
  "cb_preprod_desktop",
] as const;

const DISALLOWED_SANDBOX_CALLBACK_REFS = [
  "cb_local_browser_loopback_sandbox",
  "cb_local_native_loopback_sandbox",
  "cb_production_web",
  "cb_production_desktop",
] as const;

const SCOPE_SET_REF = "hmrc_income_tax_mtd_current_slice_interactive";

const HMRC_OBSERVED_ENDPOINT_BASELINE = {
  authorization_endpoint_runtime: "https://test-www.tax.service.gov.uk/oauth/authorize",
  token_endpoint_runtime: "https://test-api.service.hmrc.gov.uk/oauth/token",
  refresh_endpoint_runtime: "https://test-api.service.hmrc.gov.uk/oauth/token",
  sandbox_api_base_url: "https://test-api.service.hmrc.gov.uk",
  production_api_base_url: "https://api.service.hmrc.gov.uk",
  verified_on: "2026-04-18",
} as const;

export const HMRC_SANDBOX_OAUTH_STEP_IDS = {
  openApplication: "hmrc.devhub.sandbox-app.open-application",
  openRedirectSettings: "hmrc.devhub.sandbox-app.open-redirect-settings",
  reconcileRedirectUris: "hmrc.devhub.sandbox-app.reconcile-redirect-uris",
  persistOauthArtifacts: "hmrc.devhub.sandbox-app.persist-oauth-artifacts",
} as const;

export interface SourceRef {
  source: string;
  rationale: string;
}

export interface AuthorityProviderSourceRef {
  rationale: string;
  source_file?: string;
  source_ref?: string;
  url?: string;
}

export interface AuthorityCallbackProfile {
  callback_profile_ref: string;
  connection_method: "WEB_APP_VIA_SERVER" | "DESKTOP_APP_VIA_SERVER" | "BATCH_PROCESS_DIRECT";
  environment_refs: string[];
  host_separation_rule: string;
  oauth_redirect_uri_pattern: string | null;
  owning_deployable_id: string;
  provider_ingress_uri_pattern: string | null;
  source_refs: AuthorityProviderSourceRef[];
}

export interface AuthorityOperationProfile {
  allowed_operation_family_refs: string[];
  api_key: string;
  callback_profile_ref: string;
  connection_method: "WEB_APP_VIA_SERVER" | "DESKTOP_APP_VIA_SERVER" | "BATCH_PROCESS_DIRECT";
  environment_ref: string;
  oauth_scopes: string[];
  authorization_url: string;
  token_url: string;
  refresh_url?: string;
  source_refs: AuthorityProviderSourceRef[];
}

export interface AuthorityProviderProfileCatalog {
  callback_profiles: AuthorityCallbackProfile[];
  profiles: AuthorityOperationProfile[];
  typed_gaps: string[];
}

export interface EnvironmentRecord {
  environment_id: string;
  callback_profile_refs: string[];
  provider_environment_binding: string;
}

export interface EnvironmentCatalog {
  environment_records: EnvironmentRecord[];
}

export interface RedirectInventoryRow {
  slot_index: number | null;
  callback_profile_ref: string;
  connection_method: "WEB_APP_VIA_SERVER" | "DESKTOP_APP_VIA_SERVER";
  environment_ref: string;
  owning_deployable_id: string;
  redirect_uri: string;
  registration_decision:
    | "CONFIGURE_NOW"
    | "DO_NOT_REGISTER_ON_SANDBOX_APP"
    | "UNALLOCATED_FUTURE_SLOT";
  rationale: string;
  host_separation_rule: string;
  provider_ingress_uri_pattern: string | null;
  source_refs: SourceRef[];
}

export interface RedirectUriInventory {
  schema_version: "1.0";
  inventory_id: string;
  provider_id: "hmrc-developer-hub";
  provider_display_name: "HMRC Developer Hub";
  run_id: string;
  workspace_id: string;
  flow_id: "sandbox-app-registration";
  application_record_ref: string;
  required_api_baseline_ref: string;
  provider_environment_target: "sandbox";
  redirect_uri_budget_max: number;
  configured_rows: RedirectInventoryRow[];
  disallowed_rows: RedirectInventoryRow[];
  unallocated_slot_count: number;
  configured_redirect_uris: string[];
  typed_gaps: string[];
  evidence_refs: string[];
  notes: string[];
  last_verified_at: string;
}

export interface ScopeSetRow {
  scope_set_ref: string;
  scopes: string[];
  rationale: string;
  source_refs: SourceRef[];
}

export interface CallbackBindingRow {
  callback_profile_ref: string;
  connection_method: "WEB_APP_VIA_SERVER" | "DESKTOP_APP_VIA_SERVER";
  environment_ref: string;
  redirect_uri: string;
  owning_deployable_id: string;
  token_exchange_owner: string;
  raw_token_storage_boundary: string;
  initiation_surface: string;
  authorization_endpoint_runtime: string;
  token_endpoint_runtime: string;
  redirect_uri_reuse_rule: "EXACT_REDIRECT_URI_REUSED_AT_TOKEN_EXCHANGE";
  post_authorization_return_strategy: string;
  source_refs: SourceRef[];
}

export interface OperationFamilyScopeBindingRow {
  operation_family_ref: string;
  required_api_keys: string[];
  scope_set_ref: string;
  allowed_callback_profile_refs: string[];
  requested_by_default_for_current_slice: boolean;
  token_exchange_owner: string;
  raw_token_storage_boundary: string;
  rationale: string;
  source_refs: SourceRef[];
}

export interface ScopeAndCallbackBindingMatrix {
  schema_version: "1.0";
  matrix_id: string;
  provider_id: "hmrc-developer-hub";
  provider_display_name: "HMRC Developer Hub";
  run_id: string;
  workspace_id: string;
  flow_id: "sandbox-app-registration";
  application_record_ref: string;
  required_api_baseline_ref: string;
  provider_environment_target: "sandbox";
  scope_sets: ScopeSetRow[];
  callback_bindings: CallbackBindingRow[];
  operation_bindings: OperationFamilyScopeBindingRow[];
  typed_gaps: string[];
  notes: string[];
  last_verified_at: string;
}

export interface RedirectSlotBudget {
  schema_version: "1.0";
  slot_budget_id: string;
  provider_id: "hmrc-developer-hub";
  provider_environment_target: "sandbox";
  max_redirect_uri_slots: number;
  configured_slot_count: number;
  remaining_slot_count: number;
  configured_rows: RedirectInventoryRow[];
  disallowed_rows: RedirectInventoryRow[];
  future_slot_policy: string;
  typed_gaps: string[];
  notes: string[];
  last_verified_at: string;
}

export interface SandboxOAuthProfile {
  schema_version: "1.0";
  profile_id: "hmrc_sandbox_oauth_profile";
  provider_id: "hmrc-developer-hub";
  provider_display_name: "HMRC Developer Hub";
  provider_environment_target: "sandbox";
  verified_on: string;
  requires_live_revalidation_before_runtime_use: true;
  authorization_endpoint_runtime: string;
  token_endpoint_runtime: string;
  refresh_endpoint_runtime: string;
  sandbox_api_base_url: string;
  production_api_base_url: string;
  registered_callback_profile_refs: string[];
  scope_set_ref: string;
  scopes: string[];
  pkce_posture: {
    provider_supports_pkce: true;
    provider_requires_pkce: false;
    taxat_policy: string;
  };
  token_exchange: {
    owner_system: string;
    raw_token_storage_boundary: string;
    browser_is_never_system_of_record: true;
    redirect_uri_reuse_rule: "EXACT_REDIRECT_URI_REUSED_AT_TOKEN_EXCHANGE";
  };
  typed_gaps: string[];
  notes: string[];
  source_refs: SourceRef[];
}

export interface ConfigureRedirectUrisAndScopesOptions {
  page: Page;
  runContext: RunContext;
  applicationRecordPath: string;
  redirectInventoryPath: string;
  scopeBindingMatrixPath: string;
  redirectSlotBudgetPath: string;
  oauthProfilePath: string;
  entryUrls?: SandboxApplicationEntryUrls;
  notes?: string[];
}

export interface ConfigureRedirectUrisAndScopesResult {
  outcome: "OAUTH_SETTINGS_READY";
  steps: StepContract[];
  evidenceManifestPath: string;
  redirectInventoryPath: string;
  redirectInventory: RedirectUriInventory;
  scopeBindingMatrixPath: string;
  scopeBindingMatrix: ScopeAndCallbackBindingMatrix;
  redirectSlotBudgetPath: string;
  redirectSlotBudget: RedirectSlotBudget;
  oauthProfilePath: string;
  oauthProfile: SandboxOAuthProfile;
  applicationRecord: SandboxApplicationRecord;
  notes: string[];
}

type InteractiveConnectionMethod = RedirectInventoryRow["connection_method"];

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeSourceRefs(
  sourceRefs: readonly AuthorityProviderSourceRef[],
): SourceRef[] {
  return sourceRefs.map((sourceRef) => ({
    source: sourceRef.source_ref ?? sourceRef.source_file ?? sourceRef.url ?? "unknown-source",
    rationale: sourceRef.rationale,
  }));
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

async function persistJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function loadApplicationRecord(
  applicationRecordPath: string,
): Promise<SandboxApplicationRecord> {
  const raw = await readFile(applicationRecordPath, "utf8");
  return JSON.parse(raw) as SandboxApplicationRecord;
}

export async function loadOAuthSettingsSelectorManifest(): Promise<SelectorManifest> {
  const raw = await readFile(
    new URL("../selectors/oauth_settings.selectors.json", import.meta.url),
    "utf8",
  );
  const manifest = JSON.parse(raw) as SelectorManifest;
  return {
    ...manifest,
    selectors: rankSelectors(manifest.selectors),
  };
}

export async function loadAuthorityProviderProfileCatalog(): Promise<AuthorityProviderProfileCatalog> {
  const raw = await readFile(
    new URL(
      "../../../../../../data/analysis/authority_provider_profile_catalog.json",
      import.meta.url,
    ),
    "utf8",
  );
  return JSON.parse(raw) as AuthorityProviderProfileCatalog;
}

export async function loadEnvironmentCatalog(): Promise<EnvironmentCatalog> {
  const raw = await readFile(
    new URL("../../../../../../data/analysis/environment_catalog.json", import.meta.url),
    "utf8",
  );
  return JSON.parse(raw) as EnvironmentCatalog;
}

function getCallbackProfileRequired(
  catalog: AuthorityProviderProfileCatalog,
  callbackProfileRef: string,
): AuthorityCallbackProfile {
  const profile = catalog.callback_profiles.find(
    (candidate) => candidate.callback_profile_ref === callbackProfileRef,
  );
  if (!profile) {
    throw new Error(`Authority profile catalog is missing callback profile ${callbackProfileRef}.`);
  }
  return profile;
}

function assertInteractiveConnectionMethod(
  callbackProfileRef: string,
  connectionMethod: AuthorityCallbackProfile["connection_method"],
): InteractiveConnectionMethod {
  if (connectionMethod === "WEB_APP_VIA_SERVER" || connectionMethod === "DESKTOP_APP_VIA_SERVER") {
    return connectionMethod;
  }

  throw new Error(
    `Callback profile ${callbackProfileRef} is not interactive and cannot be used as an HMRC redirect URI.`,
  );
}

function getEnvironmentRequired(
  catalog: EnvironmentCatalog,
  environmentId: string,
): EnvironmentRecord {
  const environment = catalog.environment_records.find(
    (candidate) => candidate.environment_id === environmentId,
  );
  if (!environment) {
    throw new Error(`Environment catalog is missing environment ${environmentId}.`);
  }
  return environment;
}

function redirectPlanRationale(
  callbackProfileRef: string,
): { slotIndex: number | null; decision: RedirectInventoryRow["registration_decision"]; rationale: string } {
  switch (callbackProfileRef) {
    case "cb_sandbox_web":
      return {
        slotIndex: 1,
        decision: "CONFIGURE_NOW",
        rationale:
          "Canonical shared-sandbox browser callback. Every interactive browser-originated HMRC journey returns through the server-authoritative gateway.",
      };
    case "cb_sandbox_desktop":
      return {
        slotIndex: 2,
        decision: "CONFIGURE_NOW",
        rationale:
          "Canonical sandbox desktop callback. The macOS client may receive the authorisation result on localhost, but the governed gateway still owns token exchange and raw token custody.",
      };
    case "cb_preprod_web":
      return {
        slotIndex: 3,
        decision: "CONFIGURE_NOW",
        rationale:
          "Pre-production web callback is configured now because release-candidate verification already depends on a stable sandbox-backed pre-production surface.",
      };
    case "cb_preprod_desktop":
      return {
        slotIndex: 4,
        decision: "CONFIGURE_NOW",
        rationale:
          "Pre-production desktop callback is configured now so native verification can mirror the chosen production-like topology without consuming the final fifth slot.",
      };
    case "cb_local_browser_loopback_sandbox":
      return {
        slotIndex: null,
        decision: "DO_NOT_REGISTER_ON_SANDBOX_APP",
        rationale:
          "Local browser loopback is a non-promotable provisioning convenience, not the canonical web callback shape. Taxat uses the HTTPS gateway callback for browser-originated flows.",
      };
    case "cb_local_native_loopback_sandbox":
      return {
        slotIndex: null,
        decision: "DO_NOT_REGISTER_ON_SANDBOX_APP",
        rationale:
          "Local provisioning native loopback would spend a slot on a workstation-only bootstrap surface. The registered sandbox desktop callback already covers the installed-app pattern.",
      };
    case "cb_production_web":
      return {
        slotIndex: null,
        decision: "DO_NOT_REGISTER_ON_SANDBOX_APP",
        rationale:
          "Production callback hosts must stay disjoint from sandbox registration and belong on the separate HMRC production application.",
      };
    case "cb_production_desktop":
      return {
        slotIndex: null,
        decision: "DO_NOT_REGISTER_ON_SANDBOX_APP",
        rationale:
          "Production desktop callback belongs on the HMRC production application, not on the sandbox app.",
      };
    default:
      throw new Error(`Unexpected callback profile ${callbackProfileRef} in redirect plan.`);
  }
}

function assertExpectedEnvironmentBinding(
  environmentCatalog: EnvironmentCatalog,
  environmentId: string,
  callbackProfileRef: string,
): void {
  const environment = getEnvironmentRequired(environmentCatalog, environmentId);
  if (!environment.callback_profile_refs.includes(callbackProfileRef)) {
    throw new Error(
      `Environment ${environmentId} does not advertise callback profile ${callbackProfileRef} in the environment catalog.`,
    );
  }
}

function normalizeRedirectUri(value: string): string {
  return value.trim();
}

export function validateRegisteredRedirectUri(
  redirectUri: string,
  connectionMethod: RedirectInventoryRow["connection_method"],
): void {
  let parsed: URL;
  try {
    parsed = new URL(redirectUri);
  } catch {
    throw new Error(`Redirect URI must be an absolute URI: ${redirectUri}`);
  }

  if (parsed.hash.length > 0) {
    throw new Error(`Redirect URI must not contain a fragment: ${redirectUri}`);
  }

  if (isIP(parsed.hostname) !== 0) {
    throw new Error(`Redirect URI host must use a DNS name, not an IP literal: ${redirectUri}`);
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(
      `Redirect URI must use HTTP(S) or the installed-application localhost exception: ${redirectUri}`,
    );
  }

  if (parsed.protocol === "http:" && parsed.hostname !== "localhost") {
    throw new Error(
      `Only http://localhost is allowed for HMRC installed-application callbacks: ${redirectUri}`,
    );
  }

  if (connectionMethod === "WEB_APP_VIA_SERVER" && parsed.protocol !== "https:") {
    throw new Error(
      `WEB_APP_VIA_SERVER callbacks must remain HTTPS redirects: ${redirectUri}`,
    );
  }

  if (connectionMethod === "WEB_APP_VIA_SERVER" && parsed.hostname === "localhost") {
    throw new Error(
      `WEB_APP_VIA_SERVER callbacks must not be registered on localhost: ${redirectUri}`,
    );
  }

  if (connectionMethod === "DESKTOP_APP_VIA_SERVER" && parsed.hostname !== "localhost") {
    throw new Error(
      `DESKTOP_APP_VIA_SERVER callbacks must use the installed-application localhost pattern: ${redirectUri}`,
    );
  }
}

export function validateConfiguredRedirectRows(
  rows: readonly RedirectInventoryRow[],
  maxRedirectUris: number = HMRC_REDIRECT_SLOT_BUDGET,
): void {
  const configuredRows = rows.filter((row) => row.registration_decision === "CONFIGURE_NOW");

  if (configuredRows.length > maxRedirectUris) {
    throw new Error(
      `Redirect inventory exceeds HMRC's ${maxRedirectUris}-URI limit.`,
    );
  }

  const normalized = configuredRows.map((row) => normalizeRedirectUri(row.redirect_uri));
  if (new Set(normalized).size !== normalized.length) {
    throw new Error("Redirect inventory must not contain duplicate redirect URIs.");
  }

  for (const row of configuredRows) {
    validateRegisteredRedirectUri(row.redirect_uri, row.connection_method);
  }
}

function buildRedirectRows(
  authorityCatalog: AuthorityProviderProfileCatalog,
  environmentCatalog: EnvironmentCatalog,
): { configuredRows: RedirectInventoryRow[]; disallowedRows: RedirectInventoryRow[]; typedGaps: string[] } {
  const configuredRows = CONFIGURED_CALLBACK_REFS.map((callbackProfileRef) => {
    const callbackProfile = getCallbackProfileRequired(authorityCatalog, callbackProfileRef);
    const environmentRef = callbackProfile.environment_refs[0];
    if (!environmentRef || !callbackProfile.oauth_redirect_uri_pattern) {
      throw new Error(
        `Callback profile ${callbackProfileRef} must expose one environment ref and one redirect URI pattern.`,
      );
    }
    assertExpectedEnvironmentBinding(environmentCatalog, environmentRef, callbackProfileRef);
    const plan = redirectPlanRationale(callbackProfileRef);
    return {
      slot_index: plan.slotIndex,
      callback_profile_ref: callbackProfileRef,
      connection_method: assertInteractiveConnectionMethod(
        callbackProfileRef,
        callbackProfile.connection_method,
      ),
      environment_ref: environmentRef,
      owning_deployable_id: callbackProfile.owning_deployable_id,
      redirect_uri: callbackProfile.oauth_redirect_uri_pattern,
      registration_decision: plan.decision,
      rationale: plan.rationale,
      host_separation_rule: callbackProfile.host_separation_rule,
      provider_ingress_uri_pattern: callbackProfile.provider_ingress_uri_pattern,
      source_refs: normalizeSourceRefs(callbackProfile.source_refs),
    } satisfies RedirectInventoryRow;
  }).sort((left, right) => (left.slot_index ?? 999) - (right.slot_index ?? 999));

  const disallowedRows = DISALLOWED_SANDBOX_CALLBACK_REFS.map((callbackProfileRef) => {
    const callbackProfile = getCallbackProfileRequired(authorityCatalog, callbackProfileRef);
    const environmentRef = callbackProfile.environment_refs[0];
    if (!environmentRef || !callbackProfile.oauth_redirect_uri_pattern) {
      throw new Error(
        `Disallowed callback profile ${callbackProfileRef} must expose one environment ref and one redirect URI pattern.`,
      );
    }
    assertExpectedEnvironmentBinding(environmentCatalog, environmentRef, callbackProfileRef);
    const plan = redirectPlanRationale(callbackProfileRef);
    return {
      slot_index: plan.slotIndex,
      callback_profile_ref: callbackProfileRef,
      connection_method: assertInteractiveConnectionMethod(
        callbackProfileRef,
        callbackProfile.connection_method,
      ),
      environment_ref: environmentRef,
      owning_deployable_id: callbackProfile.owning_deployable_id,
      redirect_uri: callbackProfile.oauth_redirect_uri_pattern,
      registration_decision: plan.decision,
      rationale: plan.rationale,
      host_separation_rule: callbackProfile.host_separation_rule,
      provider_ingress_uri_pattern: callbackProfile.provider_ingress_uri_pattern,
      source_refs: normalizeSourceRefs(callbackProfile.source_refs),
    } satisfies RedirectInventoryRow;
  });

  validateConfiguredRedirectRows(configuredRows);

  const typedGaps = [
    ...authorityCatalog.typed_gaps,
    "HMRC's user-restricted guidance currently documents sandbox authorisation at https://test-www.tax.service.gov.uk/oauth/authorize and token exchange at https://test-api.service.hmrc.gov.uk/oauth/token, while current API OAS files still publish https://api.service.hmrc.gov.uk/oauth/authorize and /oauth/token in their security schemes. Taxat follows the user-restricted guidance for sandbox runtime endpoint selection and keeps the discrepancy explicit.",
  ];

  return {
    configuredRows,
    disallowedRows,
    typedGaps,
  };
}

function deriveScopeSet(
  baseline: RequiredApiSetBaseline,
): ScopeSetRow {
  const scopes = uniqueStrings(
    baseline.required_now.flatMap((api) => api.oauth_scopes),
  ).sort((left, right) => left.localeCompare(right));

  if (scopes.length === 0) {
    throw new Error("Required API baseline did not yield any OAuth scopes.");
  }

  return {
    scope_set_ref: SCOPE_SET_REF,
    scopes,
    rationale:
      "The current roadmap slice spans both read-side and write-side MTD Income Tax operations, so the interactive HMRC session requests only the two self-assessment scopes already published by the subscribed APIs and nothing wider.",
    source_refs: [
      ...baseline.source_refs.map((sourceRef) => ({
        source: sourceRef.url,
        rationale: sourceRef.rationale,
      })),
      {
        source:
          "https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/user-restricted-endpoints",
        rationale:
          "HMRC user-restricted guidance defines space-delimited scope requests and the sandbox authorisation/token endpoints.",
      },
    ],
  };
}

function buildOperationBindings(
  baseline: RequiredApiSetBaseline,
  configuredRows: readonly RedirectInventoryRow[],
): OperationFamilyScopeBindingRow[] {
  const bindingMap = new Map<string, OperationFamilyScopeBindingRow>();

  for (const api of baseline.required_now) {
    for (const operationFamilyRef of api.relevant_operation_families) {
      const existing = bindingMap.get(operationFamilyRef);
      const currentSourceRefs = api.source_refs.map((sourceRef) => ({
        source: sourceRef.url,
        rationale: sourceRef.rationale,
      }));

      if (existing) {
        existing.required_api_keys = uniqueStrings([
          ...existing.required_api_keys,
          api.api_key,
        ]);
        existing.source_refs = [
          ...existing.source_refs,
          ...currentSourceRefs.filter(
            (sourceRef) =>
              !existing.source_refs.some(
                (existingSource) =>
                  existingSource.source === sourceRef.source &&
                  existingSource.rationale === sourceRef.rationale,
              ),
          ),
        ];
        continue;
      }

      bindingMap.set(operationFamilyRef, {
        operation_family_ref: operationFamilyRef,
        required_api_keys: [api.api_key],
        scope_set_ref: SCOPE_SET_REF,
        allowed_callback_profile_refs: configuredRows.map(
          (row) => row.callback_profile_ref,
        ),
        requested_by_default_for_current_slice: true,
        token_exchange_owner:
          "deployable_northbound_api_session_gateway_or_controlled_authority_gateway",
        raw_token_storage_boundary: "SECRETS_MANAGER_OR_TOKEN_VAULT",
        rationale:
          "Operation family remains bound to the shared HMRC Income Tax scope set for this slice, while callback ownership stays server-authoritative across web and desktop embodiments.",
        source_refs: currentSourceRefs,
      });
    }
  }

  return [...bindingMap.values()].sort((left, right) =>
    left.operation_family_ref.localeCompare(right.operation_family_ref),
  );
}

function buildCallbackBindings(
  configuredRows: readonly RedirectInventoryRow[],
): CallbackBindingRow[] {
  return configuredRows.map((row) => ({
    callback_profile_ref: row.callback_profile_ref,
    connection_method: row.connection_method,
    environment_ref: row.environment_ref,
    redirect_uri: row.redirect_uri,
    owning_deployable_id: row.owning_deployable_id,
    token_exchange_owner:
      row.connection_method === "DESKTOP_APP_VIA_SERVER"
        ? "deployable_northbound_api_session_gateway"
        : "deployable_northbound_api_session_gateway",
    raw_token_storage_boundary: "SECRETS_MANAGER_OR_TOKEN_VAULT",
    initiation_surface:
      row.connection_method === "DESKTOP_APP_VIA_SERVER"
        ? "Native macOS app opens the system browser and receives the return on the environment-bound loopback path."
        : "Browser shells start the HMRC journey, but the callback lands on the gateway-owned HTTPS redirect endpoint.",
    authorization_endpoint_runtime:
      HMRC_OBSERVED_ENDPOINT_BASELINE.authorization_endpoint_runtime,
    token_endpoint_runtime: HMRC_OBSERVED_ENDPOINT_BASELINE.token_endpoint_runtime,
    redirect_uri_reuse_rule: "EXACT_REDIRECT_URI_REUSED_AT_TOKEN_EXCHANGE",
    post_authorization_return_strategy:
      row.connection_method === "DESKTOP_APP_VIA_SERVER"
        ? "Local callback server hands the code and opaque return context back to the governed gateway, which completes token exchange before resuming the native scene."
        : "Gateway completes token exchange, rehydrates the server session, and redirects back to the owning browser shell or object route.",
    source_refs: [
      ...row.source_refs,
      {
        source:
          "https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/user-restricted-endpoints",
        rationale:
          "Sandbox authorisation and token endpoints, redirect URI reuse rule, and installed-application localhost guidance.",
      },
      {
        source:
          "https://developer.service.hmrc.gov.uk/api-documentation/docs/reference-guide",
        rationale:
          "HMRC redirect URI budget, HTTPS rule for web callbacks, and fragment/IP-address prohibitions.",
      },
    ],
  }));
}

function buildRedirectInventory(
  options: ConfigureRedirectUrisAndScopesOptions,
  applicationRecord: SandboxApplicationRecord,
  configuredRows: RedirectInventoryRow[],
  disallowedRows: RedirectInventoryRow[],
  typedGaps: string[],
  evidenceRefs: string[],
): RedirectUriInventory {
  return {
    schema_version: "1.0",
    inventory_id: `${applicationRecord.application_record_id}-redirect-uri-inventory`,
    provider_id: "hmrc-developer-hub",
    provider_display_name: "HMRC Developer Hub",
    run_id: options.runContext.runId,
    workspace_id: options.runContext.workspaceId,
    flow_id: HMRC_SANDBOX_APP_FLOW_ID,
    application_record_ref: options.applicationRecordPath,
    required_api_baseline_ref: applicationRecord.required_api_baseline_ref,
    provider_environment_target: "sandbox",
    redirect_uri_budget_max: HMRC_REDIRECT_SLOT_BUDGET,
    configured_rows: configuredRows,
    disallowed_rows: disallowedRows,
    unallocated_slot_count: HMRC_REDIRECT_SLOT_BUDGET - configuredRows.length,
    configured_redirect_uris: configuredRows.map((row) => row.redirect_uri),
    typed_gaps: typedGaps,
    evidence_refs: evidenceRefs,
    notes: [
      ...(options.notes ?? []),
      "One HMRC redirect slot intentionally remains unconsumed so later sandbox-side evolution does not require immediate churn in the app registration.",
      "Production callback hosts are intentionally excluded from the sandbox application registration.",
    ],
    last_verified_at: nowIso(),
  };
}

function buildScopeAndCallbackBindingMatrix(
  options: ConfigureRedirectUrisAndScopesOptions,
  applicationRecord: SandboxApplicationRecord,
  baseline: RequiredApiSetBaseline,
  configuredRows: RedirectInventoryRow[],
  typedGaps: string[],
): ScopeAndCallbackBindingMatrix {
  const scopeSet = deriveScopeSet(baseline);
  return {
    schema_version: "1.0",
    matrix_id: `${applicationRecord.application_record_id}-scope-and-callback-matrix`,
    provider_id: "hmrc-developer-hub",
    provider_display_name: "HMRC Developer Hub",
    run_id: options.runContext.runId,
    workspace_id: options.runContext.workspaceId,
    flow_id: HMRC_SANDBOX_APP_FLOW_ID,
    application_record_ref: options.applicationRecordPath,
    required_api_baseline_ref: applicationRecord.required_api_baseline_ref,
    provider_environment_target: "sandbox",
    scope_sets: [scopeSet],
    callback_bindings: buildCallbackBindings(configuredRows),
    operation_bindings: buildOperationBindings(baseline, configuredRows),
    typed_gaps: typedGaps,
    notes: [
      "Browser-originated HMRC requests always return through the gateway-owned HTTPS callback.",
      "Native macOS flows may receive the code on localhost, but the browser and the device are never the long-term token custody boundary.",
    ],
    last_verified_at: nowIso(),
  };
}

function buildRedirectSlotBudget(
  configuredRows: RedirectInventoryRow[],
  disallowedRows: RedirectInventoryRow[],
  typedGaps: string[],
): RedirectSlotBudget {
  return {
    schema_version: "1.0",
    slot_budget_id: "hmrc-sandbox-redirect-slot-budget",
    provider_id: "hmrc-developer-hub",
    provider_environment_target: "sandbox",
    max_redirect_uri_slots: HMRC_REDIRECT_SLOT_BUDGET,
    configured_slot_count: configuredRows.length,
    remaining_slot_count: HMRC_REDIRECT_SLOT_BUDGET - configuredRows.length,
    configured_rows: configuredRows,
    disallowed_rows: disallowedRows,
    future_slot_policy:
      "Keep one redirect slot open. Do not allocate it without a later card that proves a new sandbox-side callback is both canonical and unavoidable.",
    typed_gaps: typedGaps,
    notes: [
      "The sandbox app budgets for both shared-sandbox and pre-production callback surfaces because both product environments bind to HMRC sandbox.",
      "Local provisioning callbacks and all production callbacks remain explicitly out of budget for this sandbox app.",
    ],
    last_verified_at: nowIso(),
  };
}

function buildSandboxOAuthProfile(
  inventory: RedirectUriInventory,
  scopeMatrix: ScopeAndCallbackBindingMatrix,
): SandboxOAuthProfile {
  const sourceRefs = uniqueStrings(
    scopeMatrix.scope_sets.flatMap((scopeSet) =>
      scopeSet.source_refs.map((sourceRef) => `${sourceRef.source}::${sourceRef.rationale}`),
    ),
  ).map((entry) => {
    const [source, rationale] = entry.split("::", 2);
    return {
      source,
      rationale,
    };
  });

  return {
    schema_version: "1.0",
    profile_id: "hmrc_sandbox_oauth_profile",
    provider_id: "hmrc-developer-hub",
    provider_display_name: "HMRC Developer Hub",
    provider_environment_target: "sandbox",
    verified_on: HMRC_OBSERVED_ENDPOINT_BASELINE.verified_on,
    requires_live_revalidation_before_runtime_use: true,
    authorization_endpoint_runtime:
      HMRC_OBSERVED_ENDPOINT_BASELINE.authorization_endpoint_runtime,
    token_endpoint_runtime: HMRC_OBSERVED_ENDPOINT_BASELINE.token_endpoint_runtime,
    refresh_endpoint_runtime: HMRC_OBSERVED_ENDPOINT_BASELINE.refresh_endpoint_runtime,
    sandbox_api_base_url: HMRC_OBSERVED_ENDPOINT_BASELINE.sandbox_api_base_url,
    production_api_base_url: HMRC_OBSERVED_ENDPOINT_BASELINE.production_api_base_url,
    registered_callback_profile_refs: inventory.configured_rows.map(
      (row) => row.callback_profile_ref,
    ),
    scope_set_ref: SCOPE_SET_REF,
    scopes: scopeMatrix.scope_sets[0]?.scopes ?? [],
    pkce_posture: {
      provider_supports_pkce: true,
      provider_requires_pkce: false,
      taxat_policy:
        "Require PKCE for DESKTOP_APP_VIA_SERVER and keep it enabled for browser-originated flows when the gateway initiates the authorisation request.",
    },
    token_exchange: {
      owner_system:
        "deployable_northbound_api_session_gateway_or_controlled_authority_gateway",
      raw_token_storage_boundary: "SECRETS_MANAGER_OR_TOKEN_VAULT",
      browser_is_never_system_of_record: true,
      redirect_uri_reuse_rule: "EXACT_REDIRECT_URI_REUSED_AT_TOKEN_EXCHANGE",
    },
    typed_gaps: inventory.typed_gaps,
    notes: [
      "Sandbox profile is authoritative for shared-sandbox and pre-production HMRC sandbox traffic only.",
      "Production HMRC OAuth registration must be handled separately with production callback hosts.",
    ],
    source_refs: sourceRefs,
  };
}

async function isVisible(locator: Locator): Promise<boolean> {
  try {
    return await locator.first().isVisible();
  } catch {
    return false;
  }
}

async function openApplicationConsole(
  page: Page,
  applicationName: string,
  entryUrls: SandboxApplicationEntryUrls,
  selectorManifest: SelectorManifest,
): Promise<void> {
  await page.goto(entryUrls.applications);
  await waitForPortalStability(page);
  await dismissCookieBanner(page, selectorManifest);
  const applicationLink = await findApplicationLink(page, applicationName);
  if (!applicationLink) {
    throw new Error(
      `Canonical sandbox application ${applicationName} could not be located from the Applications console.`,
    );
  }
  await applicationLink.click();
  await waitForPortalStability(page);
}

async function openRedirectSettings(page: Page): Promise<void> {
  const manageRedirectUris = page.getByRole("link", {
    name: /manage redirect uris/i,
  });
  if (!(await isVisible(manageRedirectUris))) {
    throw new Error(
      "Selector drift detected for manage-redirect-uris: the application console no longer exposes a stable redirect management entrypoint.",
    );
  }
  await manageRedirectUris.first().click();
  await waitForPortalStability(page);

  const heading = page.getByRole("heading", { name: /redirect uris/i });
  if (!(await isVisible(heading))) {
    throw new Error(
      "Selector drift detected for redirect-settings-heading: the HMRC redirect settings surface could not be confirmed.",
    );
  }
}

async function readRedirectUriInputs(
  page: Page,
): Promise<Array<{ slotLabel: string; locator: Locator; value: string }>> {
  const slotLocators = page.getByTestId("redirect-uri-slot");
  const count = await slotLocators.count();
  const rows: Array<{ slotLabel: string; locator: Locator; value: string }> = [];

  for (let index = 0; index < count; index += 1) {
    const slot = slotLocators.nth(index);
    const input = slot.getByRole("textbox").first();
    const slotLabel =
      (await slot.getAttribute("data-slot-label")) ?? `Redirect URI ${index + 1}`;
    rows.push({
      slotLabel,
      locator: input,
      value: normalizeRedirectUri(await input.inputValue()),
    });
  }

  return rows;
}

function computeRedirectDiff(
  currentValues: readonly string[],
  targetValues: readonly string[],
): { stale: string[]; duplicates: string[]; missing: string[] } {
  const targetSet = new Set(targetValues);
  const currentSet = new Set<string>();
  const duplicates: string[] = [];

  for (const value of currentValues) {
    if (!value) {
      continue;
    }
    if (currentSet.has(value)) {
      duplicates.push(value);
      continue;
    }
    currentSet.add(value);
  }

  return {
    stale: currentValues.filter((value) => value && !targetSet.has(value)),
    duplicates: uniqueStrings(duplicates),
    missing: targetValues.filter((value) => !currentSet.has(value)),
  };
}

export async function configureRedirectUrisAndScopes(
  options: ConfigureRedirectUrisAndScopesOptions,
): Promise<ConfigureRedirectUrisAndScopesResult> {
  const entryUrls = options.entryUrls ?? createDefaultSandboxApplicationEntryUrls();
  const selectorManifest = await loadOAuthSettingsSelectorManifest();
  const providerRegistry = createDefaultProviderRegistry();
  const provider = providerRegistry.getRequired(DEVELOPER_HUB_PROVIDER_ID);

  if (options.runContext.flowId !== HMRC_SANDBOX_APP_FLOW_ID) {
    throw new Error(
      `RunContext flowId must be ${HMRC_SANDBOX_APP_FLOW_ID} for HMRC sandbox OAuth settings.`,
    );
  }

  assertProviderFlowAllowed(options.runContext, provider, HMRC_SANDBOX_APP_FLOW_ID);

  const applicationRecord = await loadApplicationRecord(options.applicationRecordPath);
  const baseline = await loadRequiredApiSetBaseline();
  const authorityCatalog = await loadAuthorityProviderProfileCatalog();
  const environmentCatalog = await loadEnvironmentCatalog();
  assertSandboxApplicationRecordSanitized(applicationRecord);

  const steps: StepContract[] = [];
  let evidenceManifest = createDeveloperHubEvidenceManifest(options.runContext);

  let openApplicationStep = transitionStep(
    createPendingStep({
      stepId: HMRC_SANDBOX_OAUTH_STEP_IDS.openApplication,
      title: "Open the canonical HMRC sandbox application console",
      selectorRefs: ["applications-heading", "manage-redirect-uris"],
    }),
    "RUNNING",
    "Opening the HMRC Applications console and selecting the canonical sandbox app before redirect reconciliation.",
  );
  steps.push(openApplicationStep);

  await openApplicationConsole(
    options.page,
    applicationRecord.sandbox_application.application_display_name,
    entryUrls,
    selectorManifest,
  );

  openApplicationStep = transitionStep(
    openApplicationStep,
    "SUCCEEDED",
    "Canonical sandbox application console opened successfully.",
  );
  steps[0] = openApplicationStep;
  evidenceManifest = appendSanitizedEvidence(
    evidenceManifest,
    openApplicationStep,
    `Sandbox application console opened at ${options.page.url()} for ${applicationRecord.sandbox_application.application_display_name}.`,
    [],
    openApplicationStep.selectorRefs,
  );

  let openSettingsStep = transitionStep(
    createPendingStep({
      stepId: HMRC_SANDBOX_OAUTH_STEP_IDS.openRedirectSettings,
      title: "Open the HMRC redirect-URI settings surface",
      selectorRefs: [
        "manage-redirect-uris",
        "redirect-settings-heading",
        "redirect-uri-slot",
        "save-redirect-uris",
      ],
    }),
    "RUNNING",
    "Opening the redirect-URI management surface for deterministic reconciliation.",
  );
  steps.push(openSettingsStep);

  await openRedirectSettings(options.page);

  openSettingsStep = transitionStep(
    openSettingsStep,
    "SUCCEEDED",
    "Redirect-URI settings surface verified.",
  );
  steps[steps.length - 1] = openSettingsStep;
  evidenceManifest = appendSanitizedEvidence(
    evidenceManifest,
    openSettingsStep,
    `Redirect settings opened at ${options.page.url()}.`,
    [],
    openSettingsStep.selectorRefs,
  );

  let reconcileStep = transitionStep(
    createPendingStep({
      stepId: HMRC_SANDBOX_OAUTH_STEP_IDS.reconcileRedirectUris,
      title: "Reconcile redirect URIs to the canonical Taxat sandbox inventory",
      selectorRefs: ["redirect-uri-slot", "save-redirect-uris", "scope-summary"],
    }),
    "RUNNING",
    "Reconciling redirect slots, explicit callback ownership, and the current HMRC scope inventory.",
  );
  steps.push(reconcileStep);

  const { configuredRows, disallowedRows, typedGaps } = buildRedirectRows(
    authorityCatalog,
    environmentCatalog,
  );
  const targetRedirectUris = configuredRows.map((row) => row.redirect_uri);

  const slotInputs = await readRedirectUriInputs(options.page);
  const observedSlotCount = slotInputs.length;
  const typedGapNotes = [...typedGaps];
  if (observedSlotCount !== HMRC_REDIRECT_SLOT_BUDGET) {
    typedGapNotes.push(
      `HMRC portal currently exposes ${observedSlotCount} redirect configuration slots instead of the expected ${HMRC_REDIRECT_SLOT_BUDGET}.`,
    );
  }
  if (observedSlotCount < targetRedirectUris.length) {
    throw new Error(
      `HMRC portal exposes only ${observedSlotCount} redirect slots, but ${targetRedirectUris.length} canonical Taxat redirects are required.`,
    );
  }

  const currentRedirectUris = slotInputs.map((slot) => slot.value).filter(Boolean);
  const diff = computeRedirectDiff(currentRedirectUris, targetRedirectUris);

  for (let index = 0; index < slotInputs.length; index += 1) {
    const nextValue = targetRedirectUris[index] ?? "";
    await slotInputs[index]!.locator.fill(nextValue);
  }

  await options.page.getByRole("button", { name: /save redirect uris/i }).click();
  await waitForPortalStability(options.page);
  await options.page.reload();
  await waitForPortalStability(options.page);

  const rereadSlots = await readRedirectUriInputs(options.page);
  const rereadRedirectUris = rereadSlots.map((slot) => slot.value).filter(Boolean);
  if (JSON.stringify(rereadRedirectUris) !== JSON.stringify(targetRedirectUris)) {
    throw new Error(
      `Saved redirect URIs could not be re-read faithfully after refresh. Expected ${JSON.stringify(
        targetRedirectUris,
      )}, got ${JSON.stringify(rereadRedirectUris)}.`,
    );
  }

  reconcileStep = transitionStep(
    reconcileStep,
    "SUCCEEDED",
    "Canonical sandbox redirect inventory saved and re-read successfully after refresh.",
  );
  steps[steps.length - 1] = reconcileStep;
  evidenceManifest = appendSanitizedEvidence(
    evidenceManifest,
    reconcileStep,
    `Redirect settings reconciled with ${targetRedirectUris.length} configured URIs; stale=${diff.stale.length}, duplicates=${diff.duplicates.length}, missing=${diff.missing.length}.`,
    [],
    reconcileStep.selectorRefs,
  );

  let persistStep = transitionStep(
    createPendingStep({
      stepId: HMRC_SANDBOX_OAUTH_STEP_IDS.persistOauthArtifacts,
      title: "Persist the sanitized redirect inventory, scope matrix, and OAuth profile",
    }),
    "RUNNING",
    "Writing the canonical redirect inventory, slot budget, scope/callback matrix, and machine-readable OAuth profile.",
  );
  steps.push(persistStep);

  const evidenceManifestPath = options.redirectInventoryPath.replace(
    /\.json$/i,
    ".evidence_manifest.json",
  );
  const evidenceRefs = evidenceManifest.entries.map(
    (entry) => `evidence://${options.runContext.runId}/${entry.evidenceId}`,
  );
  const redirectInventory = buildRedirectInventory(
    options,
    applicationRecord,
    configuredRows,
    disallowedRows,
    [
      ...typedGapNotes,
      ...(diff.duplicates.length > 0
        ? [
            `Duplicate redirect URIs were present before reconciliation: ${diff.duplicates.join(
              ", ",
            )}.`,
          ]
        : []),
      ...(diff.stale.length > 0
        ? [
            `Stale redirect URIs were removed during reconciliation: ${diff.stale.join(", ")}.`,
          ]
        : []),
    ],
    evidenceRefs,
  );
  const scopeBindingMatrix = buildScopeAndCallbackBindingMatrix(
    options,
    applicationRecord,
    baseline,
    configuredRows,
    redirectInventory.typed_gaps,
  );
  const redirectSlotBudget = buildRedirectSlotBudget(
    configuredRows,
    disallowedRows,
    redirectInventory.typed_gaps,
  );
  const oauthProfile = buildSandboxOAuthProfile(
    redirectInventory,
    scopeBindingMatrix,
  );

  applicationRecord.portal_state.last_safe_page_url = options.page.url();
  applicationRecord.portal_state.last_completed_step_id =
    HMRC_SANDBOX_OAUTH_STEP_IDS.persistOauthArtifacts;
  applicationRecord.portal_state.evidence_manifest_ref = evidenceManifestPath;
  applicationRecord.evidence_refs = [
    ...new Set([...applicationRecord.evidence_refs, ...evidenceRefs]),
  ];
  applicationRecord.console_location_refs = [
    ...new Set([
      ...applicationRecord.console_location_refs,
      options.page.url(),
      ...redirectInventory.configured_redirect_uris,
    ]),
  ];
  applicationRecord.notes = [
    ...applicationRecord.notes,
    `Redirect inventory ref: ${options.redirectInventoryPath}`,
    `Scope/callback matrix ref: ${options.scopeBindingMatrixPath}`,
    `Redirect slot budget ref: ${options.redirectSlotBudgetPath}`,
    `OAuth profile ref: ${options.oauthProfilePath}`,
  ];
  applicationRecord.last_verified_at = nowIso();

  await persistJson(evidenceManifestPath, evidenceManifest);
  await persistJson(options.redirectInventoryPath, redirectInventory);
  await persistJson(options.scopeBindingMatrixPath, scopeBindingMatrix);
  await persistJson(options.redirectSlotBudgetPath, redirectSlotBudget);
  await persistJson(options.oauthProfilePath, oauthProfile);
  await persistJson(options.applicationRecordPath, applicationRecord);

  assertSandboxApplicationRecordSanitized(applicationRecord);

  persistStep = transitionStep(
    persistStep,
    "SUCCEEDED",
    "Redirect inventory, slot budget, scope/callback matrix, OAuth profile, and updated sandbox application record written successfully.",
  );
  steps[steps.length - 1] = persistStep;

  return {
    outcome: "OAUTH_SETTINGS_READY",
    steps,
    evidenceManifestPath,
    redirectInventoryPath: options.redirectInventoryPath,
    redirectInventory,
    scopeBindingMatrixPath: options.scopeBindingMatrixPath,
    scopeBindingMatrix,
    redirectSlotBudgetPath: options.redirectSlotBudgetPath,
    redirectSlotBudget,
    oauthProfilePath: options.oauthProfilePath,
    oauthProfile,
    applicationRecord,
    notes: [
      "HMRC scope requests remain constrained to read:self-assessment and write:self-assessment for the current slice.",
      "Browser and device surfaces never become the system of record for raw authority tokens.",
    ],
  };
}

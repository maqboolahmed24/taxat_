import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Page } from "@playwright/test";

import {
  assertProviderFlowAllowed,
  createDefaultProviderRegistry,
} from "../../../core/provider_registry.js";
import type { RunContext } from "../../../core/run_context.js";
import { assertLiveProviderGate } from "../../../core/run_context.js";
import {
  createPendingStep,
  attachManualCheckpoint,
  markSkippedAsAlreadyPresent,
  transitionStep,
  type StepContract,
} from "../../../core/step_contract.js";
import {
  createManualCheckpoint,
  type ManualCheckpointRecord,
} from "../../../core/manual_checkpoint.js";
import {
  createDefaultRedactionRules,
  redactStructuredValue,
  type RedactionRule,
} from "../../../core/redaction.js";
import {
  appendSanitizedEvidence,
  createDeveloperHubEvidenceManifest,
  DEVELOPER_HUB_PROVIDER_ID,
  dismissCookieBanner,
  sanitizeAlias,
  waitForPortalStability,
  getRequiredLocator,
} from "./developer_hub_shared.js";
import {
  createDefaultSandboxApplicationEntryUrls,
  type SandboxApplicationEntryUrls,
  type SandboxApplicationRecord,
} from "./register_sandbox_application.js";
import type { SandboxOAuthProfile } from "./configure_redirect_uris_and_scopes.js";
import type { HmrcSandboxProfileBindingEvidence } from "./validate_fraud_prevention_headers.js";
import {
  rankSelectors,
  type SelectorManifest,
} from "../../../core/selector_contract.js";

export const HMRC_CLIENT_EXPORT_FLOW_ID = "sandbox-client-credential-export";

export const HMRC_CLIENT_EXPORT_STEP_IDS = {
  openApplicationConsole: "hmrc.devhub.client-export.open-application",
  openCredentialsConsole: "hmrc.devhub.client-export.open-credentials",
  validateBindings: "hmrc.devhub.client-export.validate-bindings",
  exportSecretToVault: "hmrc.devhub.client-export.export-secret",
  persistArtifacts: "hmrc.devhub.client-export.persist-artifacts",
} as const;

export const HMRC_CLIENT_SECRET_POLICY_PROFILE =
  "policy.hmrc.client-secret.rotate-90d";

export type CredentialExportErrorCode =
  | "SELECTOR_DRIFT"
  | "MANUAL_CHECKPOINT_REQUIRED"
  | "VAULT_WRITE_FAILED"
  | "PORTAL_PERMISSION_FAILURE"
  | "BINDING_MISMATCH";

export class CredentialExportError extends Error {
  constructor(
    readonly code: CredentialExportErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CredentialExportError";
  }
}

export interface SourceRef {
  source_ref: string;
  rationale: string;
}

export interface AuthorityProviderProfileCatalog {
  callback_profiles: Array<{
    callback_profile_ref: string;
    connection_method: "WEB_APP_VIA_SERVER" | "DESKTOP_APP_VIA_SERVER" | "BATCH_PROCESS_DIRECT";
    environment_refs: string[];
    oauth_redirect_uri_pattern: string | null;
    owning_deployable_id: string;
    provider_ingress_uri_pattern: string | null;
    source_refs: Array<{
      source_ref?: string;
      source_file?: string;
      rationale: string;
    }>;
  }>;
  profiles: Array<{
    profile_id: string;
    environment_ref: string;
    provider_environment: string;
    callback_profile_ref: string;
    connection_method: "WEB_APP_VIA_SERVER" | "DESKTOP_APP_VIA_SERVER" | "BATCH_PROCESS_DIRECT";
    token_binding_profile_ref: string;
    fraud_header_profile_ref: string;
    allowed_operation_family_refs: string[];
  }>;
}

export interface ProvisioningSecretInventory {
  secret_inventory: Array<{
    secret_class_id: string;
    namespace_refs: string[];
    vault_namespace_pattern: string;
    key_naming_pattern: string;
  }>;
}

export interface DimensionSourceRow {
  dimension: string;
  source_refs: SourceRef[];
}

export interface BindingSummaryRow {
  environment_ref: string;
  connection_method: "WEB_APP_VIA_SERVER" | "DESKTOP_APP_VIA_SERVER";
  callback_profile_ref: string;
  scope_set_ref: string;
  scopes: string[];
  fraud_header_profile_ref: string;
  token_binding_profile_ref: string;
  authority_profile_refs: string[];
}

export interface HmrcClientCredentialRecord {
  schema_version: "1.0";
  inventory_id: string;
  provider_id: "hmrc-developer-hub";
  provider_display_name: "HMRC Developer Hub";
  run_id: string;
  flow_id: typeof HMRC_CLIENT_EXPORT_FLOW_ID;
  workspace_id: string;
  product_environment_id: string;
  provider_environment_target: "sandbox";
  application_record_ref: string;
  oauth_profile_ref: string;
  fraud_binding_evidence_ref: string;
  authority_provider_profile_catalog_ref: string;
  operator_identity_alias: string;
  application_identity: {
    application_alias: string;
    application_display_name: string;
    hmrc_application_id_alias: string;
    portal_environment: "SANDBOX";
    application_console_url: string;
    credentials_console_url: string;
  };
  client_id_binding: {
    client_id_alias: string;
    client_id_fingerprint: string;
    client_id_hash: string;
    client_id_metadata_store_ref: string;
    client_id_secret_class_id: "hmrc_sandbox_client_id_ref";
    source_disposition: "CAPTURED_DURING_RUN" | "ADOPTED_EXISTING_LINEAGE";
    last_captured_at: string;
  };
  binding_summary: BindingSummaryRow[];
  secret_export_posture: {
    binding_lineage_ref: string;
    active_secret_version_id: string;
    active_secret_count: number;
    provider_limit_max_active_secrets: 5;
    taxat_overlap_limit_max_active_secrets: 2;
    one_time_reveal_posture:
      | "MANUAL_CHECKPOINT_REQUIRED_IF_VISIBLE"
      | "ADOPT_EXISTING_LINEAGE";
    capture_method:
      | "PROVIDER_ONE_TIME_REVEAL_CAPTURE"
      | "ADOPT_EXISTING_LINEAGE";
    attestation_state:
      | "ATTESTED_PENDING_RUNTIME_VERIFICATION"
      | "ACTIVE_AND_RUNTIME_VERIFIED";
    rotation_posture: string;
    retirement_posture: string;
  };
  evidence_refs: string[];
  vault_write_receipt_refs: string[];
  manual_checkpoint_refs: string[];
  attestation_refs: string[];
  dimension_source_map: DimensionSourceRow[];
  typed_gaps: string[];
  notes: string[];
  last_verified_at: string;
}

export interface HmrcClientVaultBinding {
  schema_version: "1.0";
  binding_id: string;
  provider_id: "hmrc-developer-hub";
  provider_display_name: "HMRC Developer Hub";
  run_id: string;
  flow_id: typeof HMRC_CLIENT_EXPORT_FLOW_ID;
  workspace_id: string;
  provider_environment_target: "sandbox";
  application_inventory_ref: string;
  secret_lineage_ref: string;
  capture_boundary: {
    capture_channel_id:
      | "PROVIDER_ONE_TIME_REVEAL_CAPTURE"
      | "ADOPT_EXISTING_LINEAGE";
    manual_checkpoint_policy:
      | "MANUAL_CHECKPOINT_REQUIRED_IF_VISIBLE"
      | "NOT_REQUIRED_FOR_ADOPTION";
    raw_secret_persistence_policy: "EPHEMERAL_MEMORY_ONLY_UNTIL_VAULT_WRITE";
    sanitized_evidence_manifest_ref: string;
  };
  environment_bindings: Array<{
    binding_row_id: string;
    environment_ref: string;
    connection_method: "WEB_APP_VIA_SERVER" | "DESKTOP_APP_VIA_SERVER";
    namespace_ref: string;
    callback_profile_ref: string;
    token_binding_profile_ref: string;
    fraud_header_profile_ref: string;
    authority_profile_refs: string[];
    scope_set_ref: string;
    scopes: string[];
    client_id_store_ref: string;
    client_secret_store_ref: string;
    client_secret_metadata_ref: string;
    active_secret_version_id: string;
    vault_write_receipt_ref: string;
    attestation_ref: string;
  }>;
  typed_gaps: string[];
  notes: string[];
  last_verified_at: string;
}

export interface SecretVersionContract {
  artifact_type: "SecretVersion";
  secret_version_id: string;
  secret_class: "HMRC_SANDBOX_CLIENT_SECRET_VERSION_REF";
  store_ref: string;
  key_version_ref: string;
  policy_profile_ref: string;
  lineage_ref: string;
  issued_at: string;
  expires_at: string | null;
  rotation_state:
    | "ISSUED"
    | "ATTESTED"
    | "ACTIVE"
    | "ROTATING"
    | "RETIRED"
    | "REVOKED";
  last_attested_at: string | null;
  attestation_ref: string | null;
  activated_at: string | null;
  rotation_started_at: string | null;
  retired_at: string | null;
  revoked_at: string | null;
  revocation_reason_code: string | null;
  historical_read_window_until: string | null;
  superseded_by_secret_version_id: string | null;
}

export interface HmrcClientSecretLineage {
  schema_version: "1.0";
  lineage_id: string;
  provider_id: "hmrc-developer-hub";
  provider_display_name: "HMRC Developer Hub";
  run_id: string;
  flow_id: typeof HMRC_CLIENT_EXPORT_FLOW_ID;
  workspace_id: string;
  provider_environment_target: "sandbox";
  application_inventory_ref: string;
  secret_class_id: "hmrc_sandbox_client_secret_version_ref";
  binding_lineage_ref: string;
  provider_limit_max_active_secrets: 5;
  taxat_overlap_limit_max_active_secrets: 2;
  versions: Array<{
    version_row_id: string;
    secret_version_contract: SecretVersionContract;
    client_secret_fingerprint: string;
    capture_channel_id:
      | "PROVIDER_ONE_TIME_REVEAL_CAPTURE"
      | "ADOPT_EXISTING_LINEAGE";
    capture_method: string;
    manual_checkpoint_ref_or_null: string | null;
    vault_write_receipt_ref: string;
    token_exchange_verification_ref_or_null: string | null;
    retirement_ref_or_null: string | null;
    source_evidence_refs: string[];
  }>;
  active_version_ids: string[];
  retired_version_ids: string[];
  supersession_edges: Array<{
    from_secret_version_id: string;
    to_secret_version_id: string;
    transition_reason: string;
  }>;
  typed_gaps: string[];
  notes: string[];
  last_verified_at: string;
}

export interface VaultWriteReceipt {
  store_ref: string;
  key_version_ref: string;
  write_receipt_ref: string;
  attestation_ref: string;
  metadata_ref: string;
  written_at: string;
}

export interface VaultWriter {
  writeMetadata(input: {
    namespace_ref: string;
    path_suffix: string;
    value: string;
    value_fingerprint: string;
    operator_identity_alias: string;
  }): Promise<VaultWriteReceipt>;
  writeSecret(input: {
    namespace_ref: string;
    path_suffix: string;
    value: string;
    value_fingerprint: string;
    operator_identity_alias: string;
  }): Promise<VaultWriteReceipt>;
}

export interface ExportClientCredentialsOptions {
  page: Page;
  runContext: RunContext;
  applicationRecordPath: string;
  applicationInventoryPath: string;
  vaultBindingPath: string;
  secretLineagePath: string;
  oauthProfilePath?: string;
  fraudBindingEvidencePath?: string;
  authorityProviderProfileCatalogPath?: string;
  secretInventoryPath?: string;
  entryUrls?: SandboxApplicationEntryUrls;
  notes?: string[];
  allowOneTimeSecretReveal?: boolean;
  vaultWriter?: VaultWriter;
}

export interface ExportClientCredentialsResult {
  outcome:
    | "CLIENT_CREDENTIALS_EXPORTED"
    | "MANUAL_CHECKPOINT_REQUIRED";
  steps: StepContract[];
  applicationInventory: HmrcClientCredentialRecord;
  vaultBinding: HmrcClientVaultBinding;
  secretLineage: HmrcClientSecretLineage;
  evidenceManifestPath: string;
  checkpoint: ManualCheckpointRecord | null;
  notes: string[];
}

function nowIso(): string {
  return new Date().toISOString();
}

function sha256Fingerprint(value: string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function buildRecordId(prefix: string, workspaceId: string, applicationAlias: string): string {
  return `${prefix}-${sanitizeAlias(workspaceId)}-${sanitizeAlias(applicationAlias)}`;
}

function buildSecretVersionId(applicationAlias: string, ordinal: number): string {
  return `secver-${sanitizeAlias(applicationAlias)}-${String(ordinal).padStart(3, "0")}`;
}

function buildBindingLineageRef(applicationAlias: string): string {
  return `binding.hmrc.${sanitizeAlias(applicationAlias)}.client-credential`;
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

async function persistJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function loadJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

export async function loadApplicationCredentialSelectorManifest(): Promise<SelectorManifest> {
  const raw = await readFile(
    new URL("../selectors/application_credentials.selectors.json", import.meta.url),
    "utf8",
  );
  const manifest = JSON.parse(raw) as SelectorManifest;
  return {
    ...manifest,
    selectors: rankSelectors(manifest.selectors),
  };
}

function defaultOauthProfilePath(): string {
  return new URL(
    "../../../../../../config/authority/hmrc/oauth/hmrc_sandbox_oauth_profile.json",
    import.meta.url,
  ).pathname;
}

function defaultFraudBindingEvidencePath(): string {
  return new URL(
    "../../../../../../data/provisioning/hmrc_sandbox_profile_binding_evidence.template.json",
    import.meta.url,
  ).pathname;
}

function defaultAuthorityProviderProfileCatalogPath(): string {
  return new URL(
    "../../../../../../data/analysis/authority_provider_profile_catalog.json",
    import.meta.url,
  ).pathname;
}

function defaultSecretInventoryPath(): string {
  return new URL(
    "../../../../../../data/security/provisioning_secret_inventory.json",
    import.meta.url,
  ).pathname;
}

function createFixtureVaultWriter(): VaultWriter {
  return {
    async writeMetadata(input) {
      const version = input.value_fingerprint.slice(-12);
      return {
        store_ref: `vault://metadata/${input.namespace_ref}/${input.path_suffix}`,
        key_version_ref: `meta-${version}`,
        write_receipt_ref: `vault-write://${input.namespace_ref}/${version}`,
        attestation_ref: `attest://${input.namespace_ref}/${version}`,
        metadata_ref: `vault://metadata/${input.namespace_ref}/${input.path_suffix}/metadata`,
        written_at: nowIso(),
      };
    },
    async writeSecret(input) {
      const version = input.value_fingerprint.slice(-12);
      return {
        store_ref: `vault://secret/${input.namespace_ref}/${input.path_suffix}`,
        key_version_ref: `kv-${version}`,
        write_receipt_ref: `vault-write://${input.namespace_ref}/${version}`,
        attestation_ref: `attest://${input.namespace_ref}/${version}`,
        metadata_ref: `vault://metadata/${input.namespace_ref}/${input.path_suffix}/metadata`,
        written_at: nowIso(),
      };
    },
  };
}

function getRequiredSecretPolicy(
  secretInventory: ProvisioningSecretInventory,
  secretClassId: string,
): ProvisioningSecretInventory["secret_inventory"][number] {
  const item = secretInventory.secret_inventory.find(
    (candidate) => candidate.secret_class_id === secretClassId,
  );
  if (!item) {
    throw new Error(`Secret inventory is missing ${secretClassId}.`);
  }
  return item;
}

function renderNamespaceRef(
  environmentRef: string,
  connectionMethod: "WEB_APP_VIA_SERVER" | "DESKTOP_APP_VIA_SERVER",
): string {
  if (environmentRef === "env_shared_sandbox_integration") {
    return connectionMethod === "WEB_APP_VIA_SERVER"
      ? "sec_sandbox_web_authority"
      : "sec_sandbox_desktop_authority";
  }
  if (environmentRef === "env_preproduction_verification") {
    return connectionMethod === "WEB_APP_VIA_SERVER"
      ? "sec_preprod_web_authority"
      : "sec_preprod_desktop_authority";
  }
  throw new CredentialExportError(
    "BINDING_MISMATCH",
    `Unsupported environment binding ${environmentRef} for HMRC client credential export.`,
  );
}

function environmentScope(
  environmentRef: string,
): "sandbox" | "preprod" {
  return environmentRef === "env_preproduction_verification" ? "preprod" : "sandbox";
}

function connectionScope(
  connectionMethod: "WEB_APP_VIA_SERVER" | "DESKTOP_APP_VIA_SERVER",
): "web_app_via_server" | "desktop_app_via_server" {
  return connectionMethod === "WEB_APP_VIA_SERVER"
    ? "web_app_via_server"
    : "desktop_app_via_server";
}

function sourceRefsForDimension(sourceRef: string, rationale: string): SourceRef[] {
  return [{ source_ref: sourceRef, rationale }];
}

function deriveDimensionSourceMap(
  oauthProfilePath: string,
  fraudBindingEvidencePath: string,
  authorityProviderProfileCatalogPath: string,
): DimensionSourceRow[] {
  return [
    {
      dimension: "provider_and_environment_capture",
      source_refs: [
        ...sourceRefsForDimension(
          "Algorithm/manifest_and_config_freeze_contract.md::L1036[5.12_Provider_and_environment_capture]",
          "Provider and environment context must remain explicit for HMRC sandbox credentials.",
        ),
        ...sourceRefsForDimension(
          oauthProfilePath,
          "The current sandbox OAuth profile freezes callback refs and scope truth for this credential export.",
        ),
      ],
    },
    {
      dimension: "token_client_binding_and_callback_scope_profiles",
      source_refs: [
        ...sourceRefsForDimension(
          "Algorithm/authority_interaction_protocol.md::L540[9.6_Token_and_client_binding_rule]",
          "Token and client binding must remain stable across queued or resumed authority sends.",
        ),
        ...sourceRefsForDimension(
          authorityProviderProfileCatalogPath,
          "The authority provider profile catalog contributes token-binding profile refs and environment-specific callback bindings.",
        ),
      ],
    },
    {
      dimension: "fraud_header_profile_binding",
      source_refs: [
        ...sourceRefsForDimension(
          "Algorithm/authority_interaction_protocol.md::L601[9.7_Fraud-prevention_header_rule]",
          "Fraud-header profile bindings must remain explicit on the exported credential record.",
        ),
        ...sourceRefsForDimension(
          fraudBindingEvidencePath,
          "The sandbox fraud-profile evidence proves the currently bound connection-method profiles.",
        ),
      ],
    },
    {
      dimension: "secret_lineage_and_rotation",
      source_refs: [
        ...sourceRefsForDimension(
          "Algorithm/security_and_runtime_hardening_contract.md::L50[3._Secret_key_and_token_handling]",
          "Secret versions must remain attestable and fail closed on ambiguous rotation.",
        ),
        ...sourceRefsForDimension(
          "Algorithm/data_model.md::L856[SecretVersion]",
          "SecretVersion freezes issuance, attestation, activation, retirement, and supersession chronology.",
        ),
      ],
    },
  ];
}

function validateBindingProfiles(
  oauthProfile: SandboxOAuthProfile,
  fraudBindingEvidence: HmrcSandboxProfileBindingEvidence,
  authorityCatalog: AuthorityProviderProfileCatalog,
): BindingSummaryRow[] {
  const interactiveCallbacks = oauthProfile.registered_callback_profile_refs.filter(
    (ref) => ref === "cb_sandbox_web" ||
      ref === "cb_sandbox_desktop" ||
      ref === "cb_preprod_web" ||
      ref === "cb_preprod_desktop",
  );

  const validationsByProfile = new Set(
    fraudBindingEvidence.profile_validations.map(
      (entry) => entry.fraud_header_profile_ref,
    ),
  );
  if (!validationsByProfile.has("fph_web_app_via_server") ||
      !validationsByProfile.has("fph_desktop_app_via_server")) {
    throw new CredentialExportError(
      "BINDING_MISMATCH",
      "Fraud-profile validation evidence is missing one of the required interactive HMRC profile refs.",
    );
  }

  const rows = interactiveCallbacks.map((callbackProfileRef) => {
    const matchingProfiles = authorityCatalog.profiles.filter(
      (profile) =>
        profile.provider_environment === "sandbox" &&
        profile.callback_profile_ref === callbackProfileRef &&
        (profile.connection_method === "WEB_APP_VIA_SERVER" ||
          profile.connection_method === "DESKTOP_APP_VIA_SERVER"),
    );
    if (matchingProfiles.length === 0) {
      throw new CredentialExportError(
        "BINDING_MISMATCH",
        `No authority-provider profile rows were found for callback profile ${callbackProfileRef}.`,
      );
    }

    const sample = matchingProfiles[0]!;
    const fraudRefs = uniqueSorted(
      matchingProfiles.map((profile) => profile.fraud_header_profile_ref),
    );
    const tokenRefs = uniqueSorted(
      matchingProfiles.map((profile) => profile.token_binding_profile_ref),
    );
    if (fraudRefs.length !== 1 || tokenRefs.length !== 1) {
      throw new CredentialExportError(
        "BINDING_MISMATCH",
        `Callback profile ${callbackProfileRef} resolved ambiguous fraud or token binding refs.`,
      );
    }

    const connectionMethod: BindingSummaryRow["connection_method"] =
      sample.connection_method === "WEB_APP_VIA_SERVER"
        ? "WEB_APP_VIA_SERVER"
        : "DESKTOP_APP_VIA_SERVER";

    return {
      environment_ref: sample.environment_ref,
      connection_method: connectionMethod,
      callback_profile_ref: callbackProfileRef,
      scope_set_ref: oauthProfile.scope_set_ref,
      scopes: [...oauthProfile.scopes],
      fraud_header_profile_ref: fraudRefs[0]!,
      token_binding_profile_ref: tokenRefs[0]!,
      authority_profile_refs: uniqueSorted(
        matchingProfiles.map((profile) => profile.profile_id),
      ),
    };
  });

  if (rows.length < 2) {
    throw new CredentialExportError(
      "BINDING_MISMATCH",
      "HMRC credential export requires at least the sandbox web and sandbox desktop callback bindings.",
    );
  }
  return rows.sort((left, right) =>
    `${left.environment_ref}:${left.connection_method}`.localeCompare(
      `${right.environment_ref}:${right.connection_method}`,
    ),
  );
}

function buildClientIdAlias(applicationAlias: string): string {
  return `hmrc-client-id-${sanitizeAlias(applicationAlias).toLowerCase()}`;
}

function buildApplicationIdAlias(applicationId: string): string {
  return `hmrc-app-${sanitizeAlias(applicationId).toLowerCase()}`;
}

function assertBindingConsistency(
  applicationRecord: SandboxApplicationRecord,
  bindingSummary: BindingSummaryRow[],
): void {
  const expectedCallbacks = uniqueSorted(bindingSummary.map((row) => row.callback_profile_ref));
  const hasPreprod = expectedCallbacks.includes("cb_preprod_web") &&
    expectedCallbacks.includes("cb_preprod_desktop");
  const hasSandbox = expectedCallbacks.includes("cb_sandbox_web") &&
    expectedCallbacks.includes("cb_sandbox_desktop");
  if (!hasSandbox || !hasPreprod) {
    throw new CredentialExportError(
      "BINDING_MISMATCH",
      "Credential export requires both sandbox and pre-production interactive callback bindings.",
    );
  }

  if (applicationRecord.sandbox_application.portal_environment !== "SANDBOX") {
    throw new CredentialExportError(
      "BINDING_MISMATCH",
      "Only HMRC sandbox application material may be exported in this flow.",
    );
  }
}

function buildCredentialRedactionRules(values: string[]): RedactionRule[] {
  return createDefaultRedactionRules(values.filter(Boolean));
}

export function assertNoRawCredentialPersistence(
  value: unknown,
  forbiddenValues: readonly string[],
): void {
  const serialized = JSON.stringify(value);
  for (const forbiddenValue of forbiddenValues) {
    if (forbiddenValue && serialized.includes(forbiddenValue)) {
      throw new Error(
        "Credential persistence check failed: raw sensitive value appeared in repo-safe output.",
      );
    }
  }
}

export function validateVaultBindingCompleteness(
  binding: HmrcClientVaultBinding,
  lineage: HmrcClientSecretLineage,
): void {
  const activeVersionIds = new Set(lineage.active_version_ids);
  if (binding.environment_bindings.length < 4) {
    throw new Error("Vault binding must cover the four interactive sandbox/preprod rows.");
  }
  for (const row of binding.environment_bindings) {
    if (!row.callback_profile_ref || !row.token_binding_profile_ref || !row.fraud_header_profile_ref) {
      throw new Error(`Binding row ${row.binding_row_id} is missing profile refs.`);
    }
    if (!row.scopes.length || !row.authority_profile_refs.length) {
      throw new Error(`Binding row ${row.binding_row_id} is missing scope or authority bindings.`);
    }
    if (!activeVersionIds.has(row.active_secret_version_id)) {
      throw new Error(
        `Binding row ${row.binding_row_id} references inactive secret version ${row.active_secret_version_id}.`,
      );
    }
  }
}

export function validateSecretLineageOrdering(
  lineage: HmrcClientSecretLineage,
): void {
  for (const row of lineage.versions) {
    const contract = row.secret_version_contract;
    const timestamps = [
      contract.issued_at,
      contract.last_attested_at,
      contract.activated_at,
      contract.rotation_started_at,
      contract.retired_at,
      contract.revoked_at,
    ].filter(Boolean) as string[];
    const ordered = [...timestamps].sort();
    if (timestamps.join("|") !== ordered.join("|")) {
      throw new Error(
        `Secret version ${contract.secret_version_id} has inverted chronology.`,
      );
    }
    if (contract.superseded_by_secret_version_id === contract.secret_version_id) {
      throw new Error(
        `Secret version ${contract.secret_version_id} cannot self-supersede.`,
      );
    }
  }
}

async function readCredentialField(
  page: Page,
  manifest: SelectorManifest,
  selectorId: string,
): Promise<string> {
  const locator = await getRequiredLocator(page, manifest, selectorId);
  return locator.evaluate((node) => {
    if (
      node instanceof HTMLInputElement ||
      node instanceof HTMLTextAreaElement ||
      node instanceof HTMLSelectElement
    ) {
      return node.value.trim();
    }

    const nestedField = node.querySelector("input, textarea, select");
    if (
      nestedField instanceof HTMLInputElement ||
      nestedField instanceof HTMLTextAreaElement ||
      nestedField instanceof HTMLSelectElement
    ) {
      return nestedField.value.trim();
    }

    return (node.textContent ?? "").trim();
  });
}

async function ensureOnCredentialsConsole(
  page: Page,
  manifest: SelectorManifest,
  applicationRecord: SandboxApplicationRecord,
): Promise<void> {
  await dismissCookieBanner(page, manifest);
  await page.goto(applicationRecord.sandbox_application.application_console_url);
  await waitForPortalStability(page);
  await (await getRequiredLocator(page, manifest, "manage-application-credentials")).click();
  await waitForPortalStability(page);
  await getRequiredLocator(page, manifest, "credentials-heading");
}

function deriveSecretLineageFromExisting(
  existing: HmrcClientSecretLineage,
): {
  activeVersionId: string;
  captureMethod: "ADOPT_EXISTING_LINEAGE";
  manualCheckpointRef: string | null;
  versionRow: HmrcClientSecretLineage["versions"][number];
} {
  const activeVersionId = existing.active_version_ids[0];
  const versionRow = existing.versions.find(
    (entry) => entry.secret_version_contract.secret_version_id === activeVersionId,
  );
  if (!activeVersionId || !versionRow) {
    throw new CredentialExportError(
      "BINDING_MISMATCH",
      "Existing secret lineage file is missing an active version row.",
    );
  }
  return {
    activeVersionId,
    captureMethod: "ADOPT_EXISTING_LINEAGE",
    manualCheckpointRef: versionRow.manual_checkpoint_ref_or_null,
    versionRow,
  };
}

function createManualRevealCheckpoint(stepId: string): ManualCheckpointRecord {
  return createManualCheckpoint({
    checkpointId: `${stepId}.checkpoint`,
    stepId,
    reason: "POLICY_CONFIRMATION",
    prompt:
      "Confirm the vault writer and redaction posture are ready before revealing the HMRC client secret. Resume only when the next action can ingest the revealed value directly into the governed secret boundary.",
    expectedSignals: [
      "Vault writer is configured",
      "Evidence capture remains suppressed or redacted",
      "The operator is ready to handle a one-time secret reveal",
    ],
    reentryPolicy: "VERIFY_CURRENT_STATE_THEN_CONTINUE",
    capturePolicy: "SUPPRESS",
  });
}

function nextVersionOrdinal(existing: HmrcClientSecretLineage | null): number {
  return (existing?.versions.length ?? 0) + 1;
}

function buildExistingVaultBinding(
  existingBinding: HmrcClientVaultBinding | null,
  environmentBindings: HmrcClientVaultBinding["environment_bindings"],
  captureBoundary: HmrcClientVaultBinding["capture_boundary"],
  inventoryPath: string,
  lineagePath: string,
  runContext: RunContext,
  applicationAlias: string,
): HmrcClientVaultBinding {
  const now = nowIso();
  return {
    schema_version: "1.0",
    binding_id:
      existingBinding?.binding_id ??
      buildRecordId(
        "hmrc-client-vault-binding",
        runContext.workspaceId,
        applicationAlias,
      ),
    provider_id: "hmrc-developer-hub",
    provider_display_name: "HMRC Developer Hub",
    run_id: runContext.runId,
    flow_id: HMRC_CLIENT_EXPORT_FLOW_ID,
    workspace_id: runContext.workspaceId,
    provider_environment_target: "sandbox",
    application_inventory_ref: inventoryPath,
    secret_lineage_ref: lineagePath,
    capture_boundary: captureBoundary,
    environment_bindings: environmentBindings,
    typed_gaps: [
      "Vault roots remain template-governed until the dedicated secrets-manager and KMS/HSM provisioning track is implemented in pc_0049.",
    ],
    notes: [
      "Repo-tracked output stores only vault refs, metadata refs, and attestation refs.",
    ],
    last_verified_at: now,
  };
}

function buildEnvironmentBindings(input: {
  bindingSummary: BindingSummaryRow[];
  applicationAlias: string;
  activeSecretVersionId: string;
  clientIdPolicy: ProvisioningSecretInventory["secret_inventory"][number];
  clientSecretPolicy: ProvisioningSecretInventory["secret_inventory"][number];
  vaultWriteReceiptRef: string;
  attestationRef: string;
}): HmrcClientVaultBinding["environment_bindings"] {
  return input.bindingSummary.map((row) => {
    const namespaceRef = renderNamespaceRef(
      row.environment_ref,
      row.connection_method,
    );
    const envScope = environmentScope(row.environment_ref);
    const connScope = connectionScope(row.connection_method);

    return {
      binding_row_id: `credential-binding.${row.environment_ref}.${connScope}`,
      environment_ref: row.environment_ref,
      connection_method: row.connection_method,
      namespace_ref: namespaceRef,
      callback_profile_ref: row.callback_profile_ref,
      token_binding_profile_ref: row.token_binding_profile_ref,
      fraud_header_profile_ref: row.fraud_header_profile_ref,
      authority_profile_refs: row.authority_profile_refs,
      scope_set_ref: row.scope_set_ref,
      scopes: row.scopes,
      client_id_store_ref:
        `vault://${input.clientIdPolicy.vault_namespace_pattern
          .replace("${environment_scope}", envScope)
          .replace("${connection_method}", connScope)}/${input.clientIdPolicy.key_naming_pattern
          .replace("${app_ref}", input.applicationAlias)}`,
      client_secret_store_ref:
        `vault://${input.clientSecretPolicy.vault_namespace_pattern
          .replace("${environment_scope}", envScope)
          .replace("${connection_method}", connScope)}/${input.clientSecretPolicy.key_naming_pattern
          .replace("${app_ref}", input.applicationAlias)
          .replace("${secret_version_id}", input.activeSecretVersionId)}`,
      client_secret_metadata_ref:
        `vault://metadata/${namespaceRef}/hmrc/${input.applicationAlias}/client-secret/${input.activeSecretVersionId}`,
      active_secret_version_id: input.activeSecretVersionId,
      vault_write_receipt_ref: input.vaultWriteReceiptRef,
      attestation_ref: input.attestationRef,
    };
  });
}

export async function exportClientCredentialsToVault(
  options: ExportClientCredentialsOptions,
): Promise<ExportClientCredentialsResult> {
  assertLiveProviderGate(options.runContext);
  const registry = createDefaultProviderRegistry();
  const manifest = await loadApplicationCredentialSelectorManifest();
  const provider = registry.getRequired(DEVELOPER_HUB_PROVIDER_ID);
  assertProviderFlowAllowed(
    options.runContext,
    provider,
    HMRC_CLIENT_EXPORT_FLOW_ID,
  );

  const oauthProfilePath = options.oauthProfilePath ?? defaultOauthProfilePath();
  const fraudBindingEvidencePath =
    options.fraudBindingEvidencePath ?? defaultFraudBindingEvidencePath();
  const authorityCatalogPath =
    options.authorityProviderProfileCatalogPath ??
    defaultAuthorityProviderProfileCatalogPath();
  const secretInventoryPath =
    options.secretInventoryPath ?? defaultSecretInventoryPath();
  options.entryUrls ?? createDefaultSandboxApplicationEntryUrls();

  const applicationRecord = await loadJson<SandboxApplicationRecord>(
    options.applicationRecordPath,
  );
  const oauthProfile = await loadJson<SandboxOAuthProfile>(oauthProfilePath);
  const fraudBindingEvidence = await loadJson<HmrcSandboxProfileBindingEvidence>(
    fraudBindingEvidencePath,
  );
  const authorityCatalog = await loadJson<AuthorityProviderProfileCatalog>(
    authorityCatalogPath,
  );
  const secretInventory = await loadJson<ProvisioningSecretInventory>(
    secretInventoryPath,
  );
  const clientIdPolicy = getRequiredSecretPolicy(
    secretInventory,
    "hmrc_sandbox_client_id_ref",
  );
  const clientSecretPolicy = getRequiredSecretPolicy(
    secretInventory,
    "hmrc_sandbox_client_secret_version_ref",
  );
  const existingLineage = await (async () => {
    try {
      return await loadJson<HmrcClientSecretLineage>(options.secretLineagePath);
    } catch {
      return null;
    }
  })();
  const existingBinding = await (async () => {
    try {
      return await loadJson<HmrcClientVaultBinding>(options.vaultBindingPath);
    } catch {
      return null;
    }
  })();

  const steps: StepContract[] = [
    createPendingStep({
      stepId: HMRC_CLIENT_EXPORT_STEP_IDS.openApplicationConsole,
      title: "Open sandbox application console",
      selectorRefs: ["manage-application-credentials"],
      sensitiveCapturePolicy: "REDACT",
    }),
    createPendingStep({
      stepId: HMRC_CLIENT_EXPORT_STEP_IDS.openCredentialsConsole,
      title: "Open HMRC application credentials",
      selectorRefs: ["credentials-heading", "client-id-field", "application-id-field"],
      sensitiveCapturePolicy: "SUPPRESS",
    }),
    createPendingStep({
      stepId: HMRC_CLIENT_EXPORT_STEP_IDS.validateBindings,
      title: "Validate callback, scope, fraud, and token bindings",
      selectorRefs: ["secret-rotation-banner"],
      sensitiveCapturePolicy: "REDACT",
    }),
    createPendingStep({
      stepId: HMRC_CLIENT_EXPORT_STEP_IDS.exportSecretToVault,
      title: "Export current client secret into governed vault refs",
      selectorRefs: ["generate-client-secret", "revealed-client-secret"],
      sensitiveCapturePolicy: "SUPPRESS",
    }),
    createPendingStep({
      stepId: HMRC_CLIENT_EXPORT_STEP_IDS.persistArtifacts,
      title: "Persist sanitized credential inventory and lineage",
      sensitiveCapturePolicy: "REDACT",
    }),
  ];

  const evidenceManifest = createDeveloperHubEvidenceManifest(options.runContext);
  const notes = [...(options.notes ?? [])];
  const bindingSummary = validateBindingProfiles(
    oauthProfile,
    fraudBindingEvidence,
    authorityCatalog,
  );
  assertBindingConsistency(applicationRecord, bindingSummary);

  steps[0] = transitionStep(steps[0]!, "RUNNING", "Opening the canonical sandbox application console.");
  await ensureOnCredentialsConsole(options.page, manifest, applicationRecord);
  steps[0] = transitionStep(
    steps[0]!,
    "SUCCEEDED",
    "Sandbox application console opened and credentials entrypoint resolved.",
  );

  steps[1] = transitionStep(
    steps[1]!,
    "RUNNING",
    "Reading safe HMRC application identifiers from the credentials surface.",
  );
  const applicationId = await readCredentialField(
    options.page,
    manifest,
    "application-id-field",
  );
  const clientId = await readCredentialField(
    options.page,
    manifest,
    "client-id-field",
  );
  steps[1] = transitionStep(
    steps[1]!,
    "SUCCEEDED",
    "Application ID alias and client ID metadata were read from the portal without persisting raw values.",
  );

  steps[2] = transitionStep(
    steps[2]!,
    "RUNNING",
    "Cross-checking OAuth, callback, fraud, and authority provider binding refs.",
  );
  steps[2] = transitionStep(
    steps[2]!,
    "SUCCEEDED",
    "Interactive callback, scope, fraud, and token-binding refs aligned with the current sandbox provider-profile set.",
  );

  const redactionRules = buildCredentialRedactionRules([applicationId, clientId]);
  let evidence = appendSanitizedEvidence(
    evidenceManifest,
    steps[2]!,
    `Validated ${bindingSummary.length} interactive credential binding rows against the current HMRC sandbox OAuth and fraud-profile artifacts.`,
    redactionRules,
    ["secret-rotation-banner"],
  );

  let activeSecretVersionId: string;
  let captureMethod: "PROVIDER_ONE_TIME_REVEAL_CAPTURE" | "ADOPT_EXISTING_LINEAGE";
  let manualCheckpoint: ManualCheckpointRecord | null = null;
  let secretLineage: HmrcClientSecretLineage;
  let clientSecretReceipt: VaultWriteReceipt;
  let clientIdReceipt: VaultWriteReceipt;
  const writer =
    options.vaultWriter ??
    (options.runContext.executionMode === "fixture"
      ? createFixtureVaultWriter()
      : null);
  if (!writer) {
    throw new CredentialExportError(
      "VAULT_WRITE_FAILED",
      "Client credential export requires an explicit vault writer outside fixture mode.",
    );
  }

  const clientIdNamespaceRef = "sec_local_provisioning_sandbox";
  try {
    clientIdReceipt = await writer.writeMetadata({
      namespace_ref: clientIdNamespaceRef,
      path_suffix: `hmrc/${applicationRecord.sandbox_application.application_alias}/client-id`,
      value: clientId,
      value_fingerprint: sha256Fingerprint(clientId),
      operator_identity_alias: options.runContext.operatorIdentityAlias,
    });
  } catch (error) {
    throw new CredentialExportError(
      "VAULT_WRITE_FAILED",
      `Client ID metadata write failed before the secret export could complete: ${String(error)}`,
    );
  }

  const existingState = existingLineage ? deriveSecretLineageFromExisting(existingLineage) : null;
  if (existingState) {
    const adoptedLineage = existingLineage;
    if (!adoptedLineage) {
      throw new CredentialExportError(
        "BINDING_MISMATCH",
        "Expected existing governed client-secret lineage during adoption.",
      );
    }
    steps[3] = markSkippedAsAlreadyPresent(
      steps[3]!,
      "Existing governed client-secret lineage was adopted; no new secret reveal was required.",
    );
    activeSecretVersionId = existingState.activeVersionId;
    captureMethod = "ADOPT_EXISTING_LINEAGE";
    manualCheckpoint = existingState.manualCheckpointRef
      ? createManualCheckpoint({
          checkpointId: existingState.manualCheckpointRef,
          stepId: HMRC_CLIENT_EXPORT_STEP_IDS.exportSecretToVault,
          reason: "POLICY_CONFIRMATION",
          prompt: "Previously recorded checkpoint reference adopted from existing lineage.",
          expectedSignals: ["Existing lineage remains authoritative."],
          reentryPolicy: "ADOPT_EXISTING_RESOURCE_THEN_CONTINUE",
          capturePolicy: "SUPPRESS",
        })
      : null;
    secretLineage = {
      ...adoptedLineage,
      run_id: options.runContext.runId,
      workspace_id: options.runContext.workspaceId,
      flow_id: HMRC_CLIENT_EXPORT_FLOW_ID,
      provider_environment_target: "sandbox",
      application_inventory_ref: options.applicationInventoryPath,
      last_verified_at: nowIso(),
      notes: [
        ...adoptedLineage.notes,
        "Credential export revalidated the existing lineage without generating a duplicate HMRC client secret.",
      ],
    };
    clientSecretReceipt = {
      store_ref: existingState.versionRow.secret_version_contract.store_ref,
      key_version_ref: existingState.versionRow.secret_version_contract.key_version_ref,
      write_receipt_ref: existingState.versionRow.vault_write_receipt_ref,
      attestation_ref:
        existingState.versionRow.secret_version_contract.attestation_ref ??
        existingState.versionRow.vault_write_receipt_ref,
      metadata_ref: existingState.versionRow.vault_write_receipt_ref,
      written_at: nowIso(),
    };
  } else {
    if (!options.allowOneTimeSecretReveal) {
      manualCheckpoint = createManualRevealCheckpoint(
        HMRC_CLIENT_EXPORT_STEP_IDS.exportSecretToVault,
      );
      steps[3] = attachManualCheckpoint(steps[3]!, manualCheckpoint);
      const emptyInventory = buildEmptyArtifacts(
        options,
        applicationRecord,
        bindingSummary,
        applicationId,
        clientId,
        clientIdReceipt,
        oauthProfilePath,
        fraudBindingEvidencePath,
        authorityCatalogPath,
        buildEnvironmentBindings({
          bindingSummary,
          applicationAlias: applicationRecord.sandbox_application.application_alias,
          activeSecretVersionId: buildSecretVersionId(
            applicationRecord.sandbox_application.application_alias,
            1,
          ),
          clientIdPolicy,
          clientSecretPolicy,
          vaultWriteReceiptRef: "vault-write://pending/manual-checkpoint",
          attestationRef: "attest://pending/manual-checkpoint",
        }),
      );
      emptyInventory.applicationInventory.evidence_refs = evidence.entries.map(
        (entry) => `evidence://${options.runContext.runId}/${entry.evidenceId}`,
      );
      await persistJson(options.applicationInventoryPath, emptyInventory.applicationInventory);
      await persistJson(options.vaultBindingPath, emptyInventory.vaultBinding);
      await persistJson(options.secretLineagePath, emptyInventory.secretLineage);
      const evidenceManifestPath = options.applicationInventoryPath.replace(
        /\.json$/i,
        ".evidence_manifest.json",
      );
      await persistJson(evidenceManifestPath, evidence);
      return {
        outcome: "MANUAL_CHECKPOINT_REQUIRED",
        steps,
        applicationInventory: emptyInventory.applicationInventory,
        vaultBinding: emptyInventory.vaultBinding,
        secretLineage: emptyInventory.secretLineage,
        evidenceManifestPath,
        checkpoint: manualCheckpoint,
        notes: [
          ...notes,
          "Manual checkpoint opened before any one-time secret reveal.",
        ],
      };
    }

    steps[3] = transitionStep(
      steps[3]!,
      "RUNNING",
      "Generating a new HMRC client secret and streaming it directly into the governed vault writer.",
    );
    await (await getRequiredLocator(options.page, manifest, "generate-client-secret")).click();
    await waitForPortalStability(options.page);
    const rawClientSecret = await readCredentialField(
      options.page,
      manifest,
      "revealed-client-secret",
    );
    const clientSecretFingerprint = sha256Fingerprint(rawClientSecret);
    const secretVersionId = buildSecretVersionId(
      applicationRecord.sandbox_application.application_alias,
      nextVersionOrdinal(existingLineage),
    );
    const bindingLineageRef = buildBindingLineageRef(
      applicationRecord.sandbox_application.application_alias,
    );

    try {
      clientSecretReceipt = await writer.writeSecret({
        namespace_ref: "sec_local_provisioning_sandbox",
        path_suffix: `hmrc/${applicationRecord.sandbox_application.application_alias}/client-secret/${secretVersionId}`,
        value: rawClientSecret,
        value_fingerprint: clientSecretFingerprint,
        operator_identity_alias: options.runContext.operatorIdentityAlias,
      });
    } catch (error) {
      throw new CredentialExportError(
        "VAULT_WRITE_FAILED",
        `HMRC client secret reveal occurred but the governed vault write failed closed: ${String(error)}`,
      );
    }

    const secretVersionContract: SecretVersionContract = {
      artifact_type: "SecretVersion",
      secret_version_id: secretVersionId,
      secret_class: "HMRC_SANDBOX_CLIENT_SECRET_VERSION_REF",
      store_ref: clientSecretReceipt.store_ref,
      key_version_ref: clientSecretReceipt.key_version_ref,
      policy_profile_ref: HMRC_CLIENT_SECRET_POLICY_PROFILE,
      lineage_ref: bindingLineageRef,
      issued_at: clientSecretReceipt.written_at,
      expires_at: null,
      rotation_state: "ATTESTED",
      last_attested_at: clientSecretReceipt.written_at,
      attestation_ref: clientSecretReceipt.attestation_ref,
      activated_at: null,
      rotation_started_at: null,
      retired_at: null,
      revoked_at: null,
      revocation_reason_code: null,
      historical_read_window_until: null,
      superseded_by_secret_version_id: null,
    };
    secretLineage = {
      schema_version: "1.0",
      lineage_id: buildRecordId(
        "hmrc-client-secret-lineage",
        options.runContext.workspaceId,
        applicationRecord.sandbox_application.application_alias,
      ),
      provider_id: "hmrc-developer-hub",
      provider_display_name: "HMRC Developer Hub",
      run_id: options.runContext.runId,
      flow_id: HMRC_CLIENT_EXPORT_FLOW_ID,
      workspace_id: options.runContext.workspaceId,
      provider_environment_target: "sandbox",
      application_inventory_ref: options.applicationInventoryPath,
      secret_class_id: "hmrc_sandbox_client_secret_version_ref",
      binding_lineage_ref: bindingLineageRef,
      provider_limit_max_active_secrets: 5,
      taxat_overlap_limit_max_active_secrets: 2,
      versions: [
        ...(existingLineage?.versions ?? []),
        {
          version_row_id: `${secretVersionId}.row`,
          secret_version_contract: secretVersionContract,
          client_secret_fingerprint: clientSecretFingerprint,
          capture_channel_id: "PROVIDER_ONE_TIME_REVEAL_CAPTURE",
          capture_method: "GENERATED_IN_PROVIDER_PORTAL_AND_STREAMED_TO_GOVERNED_VAULT",
          manual_checkpoint_ref_or_null: null,
          vault_write_receipt_ref: clientSecretReceipt.write_receipt_ref,
          token_exchange_verification_ref_or_null: null,
          retirement_ref_or_null: null,
          source_evidence_refs: [
            `evidence://${options.runContext.runId}/${HMRC_CLIENT_EXPORT_STEP_IDS.exportSecretToVault}.note.1`,
          ],
        },
      ],
      active_version_ids: [secretVersionId],
      retired_version_ids: existingLineage?.retired_version_ids ?? [],
      supersession_edges: existingLineage?.active_version_ids?.[0]
        ? [
            ...(existingLineage.supersession_edges ?? []),
            {
              from_secret_version_id: existingLineage.active_version_ids[0],
              to_secret_version_id: secretVersionId,
              transition_reason:
                "Generated new HMRC client secret during governed vault export.",
            },
          ]
        : [],
      typed_gaps: [
        "Secret export is attested and vault-bound, but runtime token-exchange proof remains for later authority-sandbox execution cards.",
      ],
      notes: [
        "Raw HMRC client secret was held only in memory until the vault writer returned a governed store ref.",
      ],
      last_verified_at: nowIso(),
    };
    activeSecretVersionId = secretVersionId;
    captureMethod = "PROVIDER_ONE_TIME_REVEAL_CAPTURE";
    steps[3] = transitionStep(
      steps[3]!,
      "SUCCEEDED",
      "One-time HMRC client secret was captured directly into governed vault refs and the raw value was discarded from process memory.",
    );
    evidence = appendSanitizedEvidence(
      evidence,
      steps[3]!,
      "Generated a new HMRC client secret, wrote it into governed vault refs, and persisted only sanitized lineage metadata.",
      buildCredentialRedactionRules([applicationId, clientId, rawClientSecret]),
      ["revealed-client-secret"],
    );
  }

  validateSecretLineageOrdering(secretLineage);

  const applicationAlias = applicationRecord.sandbox_application.application_alias;
  const applicationInventory: HmrcClientCredentialRecord = {
    schema_version: "1.0",
    inventory_id: buildRecordId(
      "hmrc-client-application-inventory",
      options.runContext.workspaceId,
      applicationAlias,
    ),
    provider_id: "hmrc-developer-hub",
    provider_display_name: "HMRC Developer Hub",
    run_id: options.runContext.runId,
    flow_id: HMRC_CLIENT_EXPORT_FLOW_ID,
    workspace_id: options.runContext.workspaceId,
    product_environment_id: options.runContext.productEnvironmentId,
    provider_environment_target: "sandbox",
    application_record_ref: options.applicationRecordPath,
    oauth_profile_ref: oauthProfilePath,
    fraud_binding_evidence_ref: fraudBindingEvidencePath,
    authority_provider_profile_catalog_ref: authorityCatalogPath,
    operator_identity_alias: options.runContext.operatorIdentityAlias,
    application_identity: {
      application_alias: applicationAlias,
      application_display_name: applicationRecord.sandbox_application.application_display_name,
      hmrc_application_id_alias: buildApplicationIdAlias(applicationId),
      portal_environment: "SANDBOX",
      application_console_url: applicationRecord.sandbox_application.application_console_url,
      credentials_console_url:
        `${applicationRecord.sandbox_application.application_console_url}/credentials`,
    },
    client_id_binding: {
      client_id_alias: buildClientIdAlias(applicationAlias),
      client_id_fingerprint: sha256Fingerprint(clientId),
      client_id_hash: sha256Fingerprint(clientId),
      client_id_metadata_store_ref: clientIdReceipt.store_ref,
      client_id_secret_class_id: "hmrc_sandbox_client_id_ref",
      source_disposition:
        captureMethod === "ADOPT_EXISTING_LINEAGE"
          ? "ADOPTED_EXISTING_LINEAGE"
          : "CAPTURED_DURING_RUN",
      last_captured_at: nowIso(),
    },
    binding_summary: bindingSummary,
    secret_export_posture: {
      binding_lineage_ref: buildBindingLineageRef(applicationAlias),
      active_secret_version_id: activeSecretVersionId,
      active_secret_count: secretLineage.active_version_ids.length,
      provider_limit_max_active_secrets: 5,
      taxat_overlap_limit_max_active_secrets: 2,
      one_time_reveal_posture:
        captureMethod === "ADOPT_EXISTING_LINEAGE"
          ? "ADOPT_EXISTING_LINEAGE"
          : "MANUAL_CHECKPOINT_REQUIRED_IF_VISIBLE",
      capture_method: captureMethod,
      attestation_state: "ATTESTED_PENDING_RUNTIME_VERIFICATION",
      rotation_posture:
        "GENERATE_NEW_SECRET_IN_PARALLEL_VERIFY_EXCHANGE_AND_ONLY_THEN_RETIRE_OLD_SECRET",
      retirement_posture:
        "NO_RETIREMENT_UNTIL_THE_NEW_SECRET_VERSION_IS_ATTESTED_AGAINST_THE_SAME_BINDING_LINEAGE",
    },
    evidence_refs: evidence.entries.map(
      (entry) => `evidence://${options.runContext.runId}/${entry.evidenceId}`,
    ),
    vault_write_receipt_refs: uniqueSorted([
      clientIdReceipt.write_receipt_ref,
      clientSecretReceipt.write_receipt_ref,
    ]),
    manual_checkpoint_refs: manualCheckpoint ? [manualCheckpoint.checkpointId] : [],
    attestation_refs: uniqueSorted([
      clientIdReceipt.attestation_ref,
      clientSecretReceipt.attestation_ref,
    ]),
    dimension_source_map: deriveDimensionSourceMap(
      oauthProfilePath,
      fraudBindingEvidencePath,
      authorityCatalogPath,
    ),
    typed_gaps: [
      "The shared operating contract shared_operating_contract_0038_to_0045.md is absent, so the export grounded directly in the named algorithm contracts and prior task outputs.",
      "The governed vault root remains template-governed until the dedicated secrets-manager and KMS/HSM provisioning track is implemented in pc_0049.",
      "The export records attested secret lineage now, but live HMRC token-exchange proof remains deferred to later authority-sandbox cards.",
    ],
    notes: [
      "No raw HMRC client ID or client secret appears in this repo-tracked inventory.",
      "Callback, scope, fraud, and token-binding refs are attached directly so later authority runs do not need to rediscover them from portal memory.",
    ],
    last_verified_at: nowIso(),
  };

  const environmentBindings = buildEnvironmentBindings({
    bindingSummary,
    applicationAlias,
    activeSecretVersionId,
    clientIdPolicy,
    clientSecretPolicy,
    vaultWriteReceiptRef: clientSecretReceipt.write_receipt_ref,
    attestationRef: clientSecretReceipt.attestation_ref,
  });

  const vaultBinding = buildExistingVaultBinding(
    existingBinding,
    environmentBindings,
    {
      capture_channel_id: captureMethod,
      manual_checkpoint_policy:
        captureMethod === "ADOPT_EXISTING_LINEAGE"
          ? "NOT_REQUIRED_FOR_ADOPTION"
          : "MANUAL_CHECKPOINT_REQUIRED_IF_VISIBLE",
      raw_secret_persistence_policy: "EPHEMERAL_MEMORY_ONLY_UNTIL_VAULT_WRITE",
      sanitized_evidence_manifest_ref: options.applicationInventoryPath.replace(
        /\.json$/i,
        ".evidence_manifest.json",
      ),
    },
    options.applicationInventoryPath,
    options.secretLineagePath,
    options.runContext,
    applicationAlias,
  );

  validateVaultBindingCompleteness(vaultBinding, secretLineage);

  assertNoRawCredentialPersistence(applicationInventory, [clientId]);
  assertNoRawCredentialPersistence(vaultBinding, [clientId]);
  assertNoRawCredentialPersistence(secretLineage, []);

  steps[4] = transitionStep(
    steps[4]!,
    "RUNNING",
    "Writing sanitized HMRC client credential inventory, vault binding, and secret lineage artifacts.",
  );

  const evidenceManifestPath = options.applicationInventoryPath.replace(
    /\.json$/i,
    ".evidence_manifest.json",
  );
  await persistJson(evidenceManifestPath, evidence);
  await persistJson(options.applicationInventoryPath, applicationInventory);
  await persistJson(options.vaultBindingPath, vaultBinding);
  await persistJson(options.secretLineagePath, secretLineage);
  steps[4] = transitionStep(
    steps[4]!,
    "SUCCEEDED",
    "Sanitized HMRC client credential artifacts were persisted successfully.",
  );

  return {
    outcome: "CLIENT_CREDENTIALS_EXPORTED",
    steps,
    applicationInventory,
    vaultBinding,
    secretLineage,
    evidenceManifestPath,
    checkpoint: manualCheckpoint,
    notes: [
      ...notes,
      captureMethod === "ADOPT_EXISTING_LINEAGE"
        ? "Existing client-secret lineage was adopted without a new provider reveal."
        : "A new HMRC client secret version was exported into governed vault refs.",
    ],
  };
}

function buildEmptyArtifacts(
  options: ExportClientCredentialsOptions,
  applicationRecord: SandboxApplicationRecord,
  bindingSummary: BindingSummaryRow[],
  applicationId: string,
  clientId: string,
  clientIdReceipt: VaultWriteReceipt,
  oauthProfilePath: string,
  fraudBindingEvidencePath: string,
  authorityCatalogPath: string,
  environmentBindings: HmrcClientVaultBinding["environment_bindings"],
): {
  applicationInventory: HmrcClientCredentialRecord;
  vaultBinding: HmrcClientVaultBinding;
  secretLineage: HmrcClientSecretLineage;
} {
  const applicationAlias = applicationRecord.sandbox_application.application_alias;
  const emptySecretVersionId = buildSecretVersionId(applicationAlias, 1);
  const secretLineage: HmrcClientSecretLineage = {
    schema_version: "1.0",
    lineage_id: buildRecordId(
      "hmrc-client-secret-lineage",
      options.runContext.workspaceId,
      applicationAlias,
    ),
    provider_id: "hmrc-developer-hub",
    provider_display_name: "HMRC Developer Hub",
    run_id: options.runContext.runId,
    flow_id: HMRC_CLIENT_EXPORT_FLOW_ID,
    workspace_id: options.runContext.workspaceId,
    provider_environment_target: "sandbox",
    application_inventory_ref: options.applicationInventoryPath,
    secret_class_id: "hmrc_sandbox_client_secret_version_ref",
    binding_lineage_ref: buildBindingLineageRef(applicationAlias),
    provider_limit_max_active_secrets: 5,
    taxat_overlap_limit_max_active_secrets: 2,
    versions: [
      {
        version_row_id: `${emptySecretVersionId}.row`,
        secret_version_contract: {
          artifact_type: "SecretVersion",
          secret_version_id: emptySecretVersionId,
          secret_class: "HMRC_SANDBOX_CLIENT_SECRET_VERSION_REF",
          store_ref: environmentBindings[0]?.client_secret_store_ref ?? "vault://pending/manual-checkpoint",
          key_version_ref: "pending-manual-checkpoint",
          policy_profile_ref: HMRC_CLIENT_SECRET_POLICY_PROFILE,
          lineage_ref: buildBindingLineageRef(applicationAlias),
          issued_at: nowIso(),
          expires_at: null,
          rotation_state: "ISSUED",
          last_attested_at: null,
          attestation_ref: null,
          activated_at: null,
          rotation_started_at: null,
          retired_at: null,
          revoked_at: null,
          revocation_reason_code: null,
          historical_read_window_until: null,
          superseded_by_secret_version_id: null,
        },
        client_secret_fingerprint:
          "sha256:0000000000000000000000000000000000000000000000000000000000000000",
        capture_channel_id: "PROVIDER_ONE_TIME_REVEAL_CAPTURE",
        capture_method: "MANUAL_CHECKPOINT_REQUIRED_BEFORE_REVEAL",
        manual_checkpoint_ref_or_null: `${HMRC_CLIENT_EXPORT_STEP_IDS.exportSecretToVault}.checkpoint`,
        vault_write_receipt_ref: "vault-write://pending/manual-checkpoint",
        token_exchange_verification_ref_or_null: null,
        retirement_ref_or_null: null,
        source_evidence_refs: [],
      },
    ],
    active_version_ids: [emptySecretVersionId],
    retired_version_ids: [],
    supersession_edges: [],
    typed_gaps: [
      "The client secret was not revealed yet because a manual checkpoint is required before any one-time provider secret disclosure.",
    ],
    notes: [
      "Placeholder lineage persists the intended governed shape without storing any raw secret or false runtime attestation.",
    ],
    last_verified_at: nowIso(),
  };

  const applicationInventory: HmrcClientCredentialRecord = {
    schema_version: "1.0",
    inventory_id: buildRecordId(
      "hmrc-client-application-inventory",
      options.runContext.workspaceId,
      applicationAlias,
    ),
    provider_id: "hmrc-developer-hub",
    provider_display_name: "HMRC Developer Hub",
    run_id: options.runContext.runId,
    flow_id: HMRC_CLIENT_EXPORT_FLOW_ID,
    workspace_id: options.runContext.workspaceId,
    product_environment_id: options.runContext.productEnvironmentId,
    provider_environment_target: "sandbox",
    application_record_ref: options.applicationRecordPath,
    oauth_profile_ref: oauthProfilePath,
    fraud_binding_evidence_ref: fraudBindingEvidencePath,
    authority_provider_profile_catalog_ref: authorityCatalogPath,
    operator_identity_alias: options.runContext.operatorIdentityAlias,
    application_identity: {
      application_alias: applicationAlias,
      application_display_name: applicationRecord.sandbox_application.application_display_name,
      hmrc_application_id_alias: buildApplicationIdAlias(applicationId),
      portal_environment: "SANDBOX",
      application_console_url: applicationRecord.sandbox_application.application_console_url,
      credentials_console_url:
        `${applicationRecord.sandbox_application.application_console_url}/credentials`,
    },
    client_id_binding: {
      client_id_alias: buildClientIdAlias(applicationAlias),
      client_id_fingerprint: sha256Fingerprint(clientId),
      client_id_hash: sha256Fingerprint(clientId),
      client_id_metadata_store_ref: clientIdReceipt.store_ref,
      client_id_secret_class_id: "hmrc_sandbox_client_id_ref",
      source_disposition: "CAPTURED_DURING_RUN",
      last_captured_at: nowIso(),
    },
    binding_summary: bindingSummary,
    secret_export_posture: {
      binding_lineage_ref: buildBindingLineageRef(applicationAlias),
      active_secret_version_id: emptySecretVersionId,
      active_secret_count: 1,
      provider_limit_max_active_secrets: 5,
      taxat_overlap_limit_max_active_secrets: 2,
      one_time_reveal_posture: "MANUAL_CHECKPOINT_REQUIRED_IF_VISIBLE",
      capture_method: "PROVIDER_ONE_TIME_REVEAL_CAPTURE",
      attestation_state: "ATTESTED_PENDING_RUNTIME_VERIFICATION",
      rotation_posture:
        "GENERATE_NEW_SECRET_IN_PARALLEL_VERIFY_EXCHANGE_AND_ONLY_THEN_RETIRE_OLD_SECRET",
      retirement_posture:
        "NO_RETIREMENT_UNTIL_THE_NEW_SECRET_VERSION_IS_ATTESTED_AGAINST_THE_SAME_BINDING_LINEAGE",
    },
    evidence_refs: [],
    vault_write_receipt_refs: [clientIdReceipt.write_receipt_ref],
    manual_checkpoint_refs: [`${HMRC_CLIENT_EXPORT_STEP_IDS.exportSecretToVault}.checkpoint`],
    attestation_refs: [clientIdReceipt.attestation_ref],
    dimension_source_map: deriveDimensionSourceMap(
      oauthProfilePath,
      fraudBindingEvidencePath,
      authorityCatalogPath,
    ),
    typed_gaps: [
      "Manual checkpoint is still open before any one-time secret reveal can occur.",
    ],
    notes: [
      "Placeholder artifact exists only to freeze the lawful post-checkpoint shape.",
    ],
    last_verified_at: nowIso(),
  };

  const vaultBinding: HmrcClientVaultBinding = {
    schema_version: "1.0",
    binding_id: buildRecordId(
      "hmrc-client-vault-binding",
      options.runContext.workspaceId,
      applicationAlias,
    ),
    provider_id: "hmrc-developer-hub",
    provider_display_name: "HMRC Developer Hub",
    run_id: options.runContext.runId,
    flow_id: HMRC_CLIENT_EXPORT_FLOW_ID,
    workspace_id: options.runContext.workspaceId,
    provider_environment_target: "sandbox",
    application_inventory_ref: options.applicationInventoryPath,
    secret_lineage_ref: options.secretLineagePath,
    capture_boundary: {
      capture_channel_id: "PROVIDER_ONE_TIME_REVEAL_CAPTURE",
      manual_checkpoint_policy: "MANUAL_CHECKPOINT_REQUIRED_IF_VISIBLE",
      raw_secret_persistence_policy: "EPHEMERAL_MEMORY_ONLY_UNTIL_VAULT_WRITE",
      sanitized_evidence_manifest_ref: options.applicationInventoryPath.replace(
        /\.json$/i,
        ".evidence_manifest.json",
      ),
    },
    environment_bindings: environmentBindings,
    typed_gaps: [
      "Environment bindings are predeclared, but the active secret version remains pending manual checkpoint completion before vault write attestation can be finalized.",
    ],
    notes: [
      "No raw HMRC secret was exported yet; the record only freezes the target vault bindings and pending attestation posture.",
    ],
    last_verified_at: nowIso(),
  };

  return { applicationInventory, vaultBinding, secretLineage };
}

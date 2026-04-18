import { test, expect } from "@playwright/test";

import {
  type HmrcClientSecretLineage,
  type HmrcClientVaultBinding,
  validateSecretLineageOrdering,
  validateVaultBindingCompleteness,
} from "../../src/providers/hmrc/flows/export_client_credentials_to_vault.js";

function buildLineage(): HmrcClientSecretLineage {
  return {
    schema_version: "1.0",
    lineage_id: "hmrc-client-secret-lineage-wk-local-taxat-sandbox-income-tax",
    provider_id: "hmrc-developer-hub",
    provider_display_name: "HMRC Developer Hub",
    run_id: "run-fixture-hmrc-export",
    flow_id: "sandbox-client-credential-export",
    workspace_id: "wk-local-provisioning-sandbox",
    provider_environment_target: "sandbox",
    application_inventory_ref: "./hmrc_client_application_inventory.template.json",
    secret_class_id: "hmrc_sandbox_client_secret_version_ref",
    binding_lineage_ref: "binding.hmrc.taxat-sandbox-income-tax.client-credential",
    provider_limit_max_active_secrets: 5,
    taxat_overlap_limit_max_active_secrets: 2,
    versions: [
      {
        version_row_id: "secver-taxat-sandbox-income-tax-001.row",
        secret_version_contract: {
          artifact_type: "SecretVersion",
          secret_version_id: "secver-taxat-sandbox-income-tax-001",
          secret_class: "HMRC_SANDBOX_CLIENT_SECRET_VERSION_REF",
          store_ref:
            "vault://kv/taxat/sandbox/authority/web_app_via_server/hmrc-client-secret/hmrc/taxat-sandbox-income-tax/client-secret/secver-taxat-sandbox-income-tax-001",
          key_version_ref: "kv-7dd55a3ff207",
          policy_profile_ref: "policy.hmrc.client-secret.rotate-90d",
          lineage_ref: "binding.hmrc.taxat-sandbox-income-tax.client-credential",
          issued_at: "2026-04-18T15:20:00.000Z",
          expires_at: null,
          rotation_state: "ATTESTED",
          last_attested_at: "2026-04-18T15:20:00.000Z",
          attestation_ref: "attest://sec_local_provisioning_sandbox/7dd55a3ff207",
          activated_at: null,
          rotation_started_at: null,
          retired_at: null,
          revoked_at: null,
          revocation_reason_code: null,
          historical_read_window_until: null,
          superseded_by_secret_version_id: null,
        },
        client_secret_fingerprint:
          "sha256:7dd55a3ff20743e78fd562ecae67ce85e0ece8a7026705f2dd8e4356f26d4d0f",
        capture_channel_id: "PROVIDER_ONE_TIME_REVEAL_CAPTURE",
        capture_method: "GENERATED_IN_PROVIDER_PORTAL_AND_STREAMED_TO_GOVERNED_VAULT",
        manual_checkpoint_ref_or_null: null,
        vault_write_receipt_ref: "vault-write://sec_local_provisioning_sandbox/7dd55a3ff207",
        token_exchange_verification_ref_or_null: null,
        retirement_ref_or_null: null,
        source_evidence_refs: [
          "evidence://run-fixture-hmrc-export/hmrc.devhub.client-export.export-secret.note.1",
        ],
      },
    ],
    active_version_ids: ["secver-taxat-sandbox-income-tax-001"],
    retired_version_ids: [],
    supersession_edges: [],
    typed_gaps: [],
    notes: [],
    last_verified_at: "2026-04-18T15:20:00.000Z",
  };
}

function buildBinding(): HmrcClientVaultBinding {
  const environments = [
    [
      "env_shared_sandbox_integration",
      "WEB_APP_VIA_SERVER",
      "cb_sandbox_web",
      "fph_web_app_via_server",
      "tb_sandbox_web_gateway_bound",
    ],
    [
      "env_shared_sandbox_integration",
      "DESKTOP_APP_VIA_SERVER",
      "cb_sandbox_desktop",
      "fph_desktop_app_via_server",
      "tb_sandbox_desktop_gateway_bound",
    ],
    [
      "env_preproduction_verification",
      "WEB_APP_VIA_SERVER",
      "cb_preprod_web",
      "fph_web_app_via_server",
      "tb_preprod_web_gateway_bound",
    ],
    [
      "env_preproduction_verification",
      "DESKTOP_APP_VIA_SERVER",
      "cb_preprod_desktop",
      "fph_desktop_app_via_server",
      "tb_preprod_desktop_gateway_bound",
    ],
  ] as const;

  return {
    schema_version: "1.0",
    binding_id: "hmrc-client-vault-binding-wk-local-taxat-sandbox-income-tax",
    provider_id: "hmrc-developer-hub",
    provider_display_name: "HMRC Developer Hub",
    run_id: "run-fixture-hmrc-export",
    flow_id: "sandbox-client-credential-export",
    workspace_id: "wk-local-provisioning-sandbox",
    provider_environment_target: "sandbox",
    application_inventory_ref: "./hmrc_client_application_inventory.template.json",
    secret_lineage_ref: "./hmrc_client_secret_lineage.template.json",
    capture_boundary: {
      capture_channel_id: "PROVIDER_ONE_TIME_REVEAL_CAPTURE",
      manual_checkpoint_policy: "MANUAL_CHECKPOINT_REQUIRED_IF_VISIBLE",
      raw_secret_persistence_policy: "EPHEMERAL_MEMORY_ONLY_UNTIL_VAULT_WRITE",
      sanitized_evidence_manifest_ref: "./hmrc_client_application_inventory.evidence_manifest.json",
    },
    environment_bindings: environments.map(
      ([environmentRef, connectionMethod, callbackProfileRef, fraudHeaderProfileRef, tokenBindingProfileRef]) => ({
        binding_row_id: `binding.${environmentRef}.${connectionMethod}`,
        environment_ref: environmentRef,
        connection_method: connectionMethod,
        namespace_ref: "sec_sandbox_web_authority",
        callback_profile_ref: callbackProfileRef,
        token_binding_profile_ref: tokenBindingProfileRef,
        fraud_header_profile_ref: fraudHeaderProfileRef,
        authority_profile_refs: ["authority-profile-001"],
        scope_set_ref: "hmrc_income_tax_mtd_current_slice_interactive",
        scopes: ["read:self-assessment", "write:self-assessment"],
        client_id_store_ref:
          "vault://kv/taxat/sandbox/authority/web_app_via_server/hmrc-client-id/hmrc/taxat-sandbox-income-tax/client-id",
        client_secret_store_ref:
          "vault://kv/taxat/sandbox/authority/web_app_via_server/hmrc-client-secret/hmrc/taxat-sandbox-income-tax/client-secret/secver-taxat-sandbox-income-tax-001",
        client_secret_metadata_ref:
          "vault://metadata/sec_sandbox_web_authority/hmrc/taxat-sandbox-income-tax/client-secret/secver-taxat-sandbox-income-tax-001",
        active_secret_version_id: "secver-taxat-sandbox-income-tax-001",
        vault_write_receipt_ref: "vault-write://sec_local_provisioning_sandbox/7dd55a3ff207",
        attestation_ref: "attest://sec_local_provisioning_sandbox/7dd55a3ff207",
      }),
    ),
    typed_gaps: [],
    notes: [],
    last_verified_at: "2026-04-18T15:20:00.000Z",
  };
}

test("vault binding completeness accepts the canonical four-row HMRC interactive binding set", () => {
  expect(() => validateVaultBindingCompleteness(buildBinding(), buildLineage())).not.toThrow();
});

test("vault binding completeness rejects missing fraud or token binding data", () => {
  const binding = buildBinding();
  binding.environment_bindings[0].fraud_header_profile_ref = "";

  expect(() => validateVaultBindingCompleteness(binding, buildLineage())).toThrow(
    /missing profile refs/i,
  );
});

test("secret lineage ordering rejects inverted attestation chronology", () => {
  const lineage = buildLineage();
  lineage.versions[0].secret_version_contract.last_attested_at = "2026-04-18T15:10:00.000Z";

  expect(() => validateSecretLineageOrdering(lineage)).toThrow(/inverted chronology/i);
});

import { expect, test } from "@playwright/test";

import {
  AuthorityEdgeResolutionService,
  AuthorityLinkModelError,
  AuthorityLinkRepository,
  DelegationGrantModelError,
  DelegationGrantRepository,
  ExceptionalAuthorityGrantModelError,
  ExceptionalAuthorityGrantRepository,
  TenantRepository,
  normalizeAuthorityLinkRecord,
  normalizeDelegationGrantRecord,
  normalizeExceptionalAuthorityGrantRecord,
} from "../../../packages/backend-access/src/index.ts";

test("imported or handshake delegation must retain freshness evidence once active", async () => {
  expect(() =>
    normalizeDelegationGrantRecord({
      delegation_grant_id: "delegation-grant.dg-001",
      tenant_id: "tenant.taxat",
      reporting_subject_ref: "reporting-subject.client-001",
      delegate_ref: "delegate.agent-001",
      delegate_class: "HUMAN",
      authority_scope_refs: ["submit_returns"],
      partition_scope_refs: ["partition.uk.vat"],
      basis_type: "DIGITAL_HANDSHAKE",
      basis_evidence_refs: ["evidence.authorisation-link.001"],
      effective_from: "2026-04-23T08:00:00Z",
      expires_at: null,
      revoked_at: null,
      superseded_by_grant_id: null,
      lifecycle_state: "ACTIVE",
      last_validated_at: "2026-04-23T08:30:00Z",
      imported_evidence_fresh_until: null,
      limitation_reason_codes: [],
    }),
  ).toThrowError(DelegationGrantModelError);
});

test("authority links fail closed on client-binding mismatch and delegated/not-required contradictions", async () => {
  expect(() =>
    normalizeAuthorityLinkRecord({
      authority_link_id: "authority-link.al-001",
      tenant_id: "tenant.taxat",
      client_id: "client.taxpayer.001",
      reporting_subject_ref: "reporting-subject.client-001",
      authority_name: "HMRC-MTD",
      authority_scope: "submit_returns",
      provider_environment: "sandbox",
      provider_api_version: "v1",
      authorised_party_ref: "reporting-subject.client-001",
      delegation_grant_ref: null,
      partition_scope_refs: ["partition.uk.vat"],
      token_binding_profile_ref: "token-binding-profile.001",
      validated_at: "2026-04-23T09:00:00Z",
      expires_at: "2026-05-23T09:00:00Z",
      revoked_at: null,
      superseded_by_link_id: null,
      lifecycle_state: "AUTHORISED_ACTIVE",
      binding_health: "HEALTHY",
      delegation_state: "NOT_REQUIRED",
      token_client_binding_state: "MISMATCH",
      source_evidence_refs: ["evidence.authority-link.001"],
      blocked_reason_codes: [],
      last_binding_check_at: "2026-04-23T09:15:00Z",
    }),
  ).toThrowError(AuthorityLinkModelError);

  expect(() =>
    normalizeAuthorityLinkRecord({
      authority_link_id: "authority-link.al-002",
      tenant_id: "tenant.taxat",
      client_id: "client.taxpayer.001",
      reporting_subject_ref: "reporting-subject.client-001",
      authority_name: "HMRC-MTD",
      authority_scope: "submit_returns",
      provider_environment: "sandbox",
      provider_api_version: "v1",
      authorised_party_ref: "delegate.agent-001",
      delegation_grant_ref: null,
      partition_scope_refs: ["partition.uk.vat"],
      token_binding_profile_ref: null,
      validated_at: null,
      expires_at: null,
      revoked_at: null,
      superseded_by_link_id: null,
      lifecycle_state: "UNLINKED",
      binding_health: "UNLINKED",
      delegation_state: "NOT_REQUIRED",
      token_client_binding_state: "UNVERIFIED",
      source_evidence_refs: ["evidence.authority-link.002"],
      blocked_reason_codes: ["AUTHORITY_LINK_REQUIRED"],
      last_binding_check_at: null,
    }),
  ).toThrowError(AuthorityLinkModelError);
});

test("exceptional authority requires requester and approver separation", async () => {
  expect(() =>
    normalizeExceptionalAuthorityGrantRecord({
      exceptional_grant_id: "exceptional-authority.ea-001",
      incident_ref: "incident.inc-001",
      target_action_family: "CREATE_OVERRIDE",
      tenant_id: "tenant.taxat",
      client_id: "client.taxpayer.001",
      partition_scope_refs: ["partition.uk.vat"],
      requesting_principal_ref: "principal.operator.001",
      requesting_principal_class: "HUMAN",
      approving_principal_ref: "principal.operator.001",
      approving_principal_class: "HUMAN",
      activated_at: "2026-04-23T10:00:00Z",
      expires_at: "2026-04-23T12:00:00Z",
      revoked_at: null,
      usage_limit: 1,
      remaining_uses: 1,
      rationale: "bounded override",
      compensating_control_refs: ["control.reviewed"],
      lifecycle_state: "ACTIVE",
      approval_step_up_state: "SATISFIED",
      approval_step_up_evidence_ref: "step-up-evidence.001",
      self_approved: false,
      authority_acknowledgement_override_permitted: false,
      delegation_substitution_permitted: false,
      silent_client_widening_permitted: false,
      declaration_sign_without_signatory_basis_permitted: false,
      truth_confirmation_override_permitted: false,
      silent_partition_widening_permitted: false,
    }),
  ).toThrowError(ExceptionalAuthorityGrantModelError);
});

test("edge resolution preserves freshness separately and blocks supporting-agent posture for main-agent-only actions", async () => {
  const tenantRepository = new TenantRepository();
  const delegationGrantRepository = new DelegationGrantRepository({ tenantRepository });
  const authorityLinkRepository = new AuthorityLinkRepository({
    tenantRepository,
    delegationGrantRepository,
  });
  const exceptionalAuthorityGrantRepository = new ExceptionalAuthorityGrantRepository({
    tenantRepository,
  });
  const edgeResolutionService = new AuthorityEdgeResolutionService({
    delegationGrantRepository,
    authorityLinkRepository,
    exceptionalAuthorityGrantRepository,
  });

  await tenantRepository.create({
    artifact_type: "Tenant",
    tenant_id: "tenant.taxat",
    name: "Taxat Sandbox",
    policy_profile_id: "policy.default",
    default_retention_profile_id: "retention.default",
    lifecycle_state: "ACTIVE",
    disabled_at: null,
    created_at: "2026-04-23T08:00:00Z",
  });

  await delegationGrantRepository.create({
    delegation_grant_id: "delegation-grant.dg-010",
    tenant_id: "tenant.taxat",
    reporting_subject_ref: "reporting-subject.client-010",
    delegate_ref: "delegate.agent-010",
    delegate_class: "HUMAN",
    authority_scope_refs: ["submit_returns"],
    partition_scope_refs: ["partition.uk.vat"],
    basis_type: "SELF_ASSESSMENT_IMPORTED",
    basis_evidence_refs: ["evidence.import.010"],
    effective_from: "2026-04-23T08:00:00Z",
    expires_at: null,
    revoked_at: null,
    superseded_by_grant_id: null,
    lifecycle_state: "ACTIVE",
    last_validated_at: "2026-04-23T09:00:00Z",
    imported_evidence_fresh_until: "2026-04-25T00:00:00Z",
    limitation_reason_codes: [],
  });

  const resolution = await edgeResolutionService.resolve({
    tenant_id: "tenant.taxat",
    client_id: "client.taxpayer.010",
    reporting_subject_ref: "reporting-subject.client-010",
    authorised_party_ref: "delegate.agent-010",
    authority_name: "HMRC-MTD",
    authority_scope: "submit_returns",
    provider_environment: "sandbox",
    provider_api_version: "v1",
    action_family: "SUBMIT_TO_AUTHORITY",
    evaluated_at: "2026-04-24T12:30:00Z",
    partition_scope_refs: ["partition.uk.vat"],
    requires_delegation: true,
    requires_authority_link: false,
    supporting_agent_posture: true,
  });

  expect(resolution.delegation_state).toBe("SATISFIED");
  expect(resolution.delegation_freshness_state).toBe("REVALIDATION_REQUIRED");
  expect(resolution.blocked_reason_codes).toEqual(
    expect.arrayContaining([
      "CLIENT_DELEGATION_REVALIDATION_REQUIRED",
      "MAIN_AGENT_ONLY_ACTION_FAMILY",
    ]),
  );
});

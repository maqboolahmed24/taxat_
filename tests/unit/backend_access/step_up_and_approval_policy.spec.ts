import { expect, test } from "@playwright/test";

import {
  ActorSessionRepository,
  ApprovalCapabilityResolver,
  ApprovalResolutionPolicyService,
  PrincipalContextBuilder,
  StepUpPolicyService,
  SessionLifecycleService,
  TenantRepository,
  UserRepository,
} from "../../../packages/backend-access/src/index.ts";

async function buildHumanPrincipalContext(options?: {
  authn_level?: "BASIC" | "MFA" | "STEP_UP";
  authorization_evaluated_at?: string;
  session_id?: string;
  step_up_state?: "NOT_REQUIRED" | "REQUIRED_PENDING" | "SATISFIED";
}) {
  const tenantRepository = new TenantRepository();
  const userRepository = new UserRepository({ tenantRepository });
  const actorSessionRepository = new ActorSessionRepository({
    tenantRepository,
    userRepository,
  });
  const sessionLifecycleService = new SessionLifecycleService({
    actorSessionRepository,
    tenantRepository,
    userRepository,
  });
  const principalContextBuilder = new PrincipalContextBuilder({
    actorSessionRepository,
    tenantRepository,
    userRepository,
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
  await userRepository.create({
    artifact_type: "User",
    user_id: "user.operator.201",
    tenant_id: "tenant.taxat",
    roles: ["TENANT_ADMIN"],
    attributes: {
      locale: "en-GB",
    },
    mfa_state: "SATISFIED",
    lifecycle_state: "ACTIVE",
    disabled_at: null,
    created_at: "2026-04-23T08:00:00Z",
  });
  await sessionLifecycleService.issueBrowserSession({
    tenant_id: "tenant.taxat",
    user_id: "user.operator.201",
    session_id: options?.session_id ?? "session.browser.201",
    authn_level: options?.authn_level ?? "MFA",
    step_up_state: options?.step_up_state ?? "REQUIRED_PENDING",
    session_binding_hash: "hash.binding.browser.201",
    csrf_ref: "csrf.binding.201",
    issued_at: "2026-04-23T08:00:00Z",
    expires_at: "2026-04-23T18:00:00Z",
  });

  const principal_context = await principalContextBuilder.build({
    tenant_id: "tenant.taxat",
    session_id: options?.session_id ?? "session.browser.201",
    delegation_basis: "TENANT_INTERNAL",
    client_scope: ["client.taxpayer.201"],
    requested_scope: ["year_end"],
    partition_scope_refs: [],
    masking_scope: "TENANT_ADMIN_UNMASKED",
    authorization_evaluated_at:
      options?.authorization_evaluated_at ?? "2026-04-23T09:00:00Z",
  });

  return {
    actorSessionRepository,
    principal_context,
  };
}

async function buildSessionFixture() {
  const tenantRepository = new TenantRepository();
  const userRepository = new UserRepository({ tenantRepository });
  const actorSessionRepository = new ActorSessionRepository({
    tenantRepository,
    userRepository,
  });
  const sessionLifecycleService = new SessionLifecycleService({
    actorSessionRepository,
    tenantRepository,
    userRepository,
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
  await userRepository.create({
    artifact_type: "User",
    user_id: "user.operator.202",
    tenant_id: "tenant.taxat",
    roles: ["TENANT_ADMIN"],
    attributes: {
      locale: "en-GB",
    },
    mfa_state: "SATISFIED",
    lifecycle_state: "ACTIVE",
    disabled_at: null,
    created_at: "2026-04-23T08:00:00Z",
  });

  return {
    actorSessionRepository,
    sessionLifecycleService,
  };
}

test("step-up policy resolves sensitive human actions deterministically", async () => {
  const stepUpPolicyService = new StepUpPolicyService();
  const mfaFixture = await buildHumanPrincipalContext({
    authn_level: "MFA",
    step_up_state: "REQUIRED_PENDING",
  });
  const first = await stepUpPolicyService.resolveForAuthorization({
    resource_class: "ConnectorBinding",
    action_family: "LINK_AUTHORITY_SOFTWARE",
    principal_context: mfaFixture.principal_context,
  });
  const second = await stepUpPolicyService.resolveForAuthorization({
    resource_class: "ConnectorBinding",
    action_family: "LINK_AUTHORITY_SOFTWARE",
    principal_context: mfaFixture.principal_context,
  });

  expect(first).toEqual(second);
  expect(first).toEqual({
    policy_requirement_reason_code: "STEP_UP_REQUIRED_FOR_AUTHORITY_LINK",
    principal_class_supported: true,
    reason_codes: ["STEP_UP_REQUIRED_FOR_AUTHORITY_LINK"],
    required_authn_level: "STEP_UP",
    step_up_required: true,
    step_up_satisfied: false,
  });

  const satisfiedFixture = await buildHumanPrincipalContext({
    authn_level: "STEP_UP",
    step_up_state: "SATISFIED",
    session_id: "session.browser.202",
  });
  const satisfied = await stepUpPolicyService.resolveForAuthorization({
    resource_class: "ConnectorBinding",
    action_family: "LINK_AUTHORITY_SOFTWARE",
    principal_context: satisfiedFixture.principal_context,
  });

  expect(satisfied).toEqual({
    policy_requirement_reason_code: "STEP_UP_REQUIRED_FOR_AUTHORITY_LINK",
    principal_class_supported: true,
    reason_codes: ["STEP_UP_EVIDENCE_FROZEN"],
    required_authn_level: "STEP_UP",
    step_up_required: true,
    step_up_satisfied: true,
  });
});

test("approval resolution keeps preview-only governance blocked while retaining frozen obligations", async () => {
  const approvalResolutionPolicyService = new ApprovalResolutionPolicyService();
  const first = await approvalResolutionPolicyService.resolveForAuthorization({
    resource_class: "ConnectorBinding",
    action_family: "LINK_AUTHORITY_SOFTWARE",
    governance_basis: {
      approval_requirement: "SECURITY_REVIEW",
      bounded_safe_mutation: 0,
      commit_authority_posture: "PREVIEW_ONLY",
      required_approvals: ["approval.governance.security-review"],
    },
  });
  const second = await approvalResolutionPolicyService.resolveForAuthorization({
    resource_class: "ConnectorBinding",
    action_family: "LINK_AUTHORITY_SOFTWARE",
    governance_basis: {
      approval_requirement: "SECURITY_REVIEW",
      bounded_safe_mutation: 0,
      commit_authority_posture: "PREVIEW_ONLY",
      required_approvals: ["approval.governance.security-review"],
    },
  });

  expect(first).toEqual(second);
  expect(first).toEqual({
    approval_required: false,
    approval_requirement: null,
    blocked: true,
    blocking_reason_codes: ["GOVERNANCE_MUTATION_ADVISORY_ONLY"],
    pending_required_approvals: [
      "approval.connector-link.single-approver",
      "approval.governance.security-review",
    ],
    reason_codes: [
      "APPROVAL_REQUIRED_FOR_AUTHORITY_LINK",
      "GOVERNANCE_MUTATION_ADVISORY_ONLY",
      "GOVERNANCE_MUTATION_APPROVAL_REQUIRED",
    ],
    required_approvals: [],
  });
});

test("approval capability resolution enforces requester approver separation", async () => {
  const approvalCapabilityResolver = new ApprovalCapabilityResolver();
  const result = await approvalCapabilityResolver.evaluateApproverEligibility({
    approval_capabilities: ["DUAL_APPROVER", "CHANGE_BOARD"],
    approval_requirement: "DUAL_APPROVER",
    approver_principal_id: "principal.same",
    requester_principal_id: "principal.same",
    required_approvals: ["CHANGE_BOARD"],
  });

  expect(result).toEqual({
    eligible: false,
    matched_capabilities: [],
    matched_required_approvals: [],
    missing_required_approvals: ["CHANGE_BOARD"],
    reason_codes: ["APPROVER_REQUESTER_SEPARATION_REQUIRED"],
  });
});

test("session authentication posture expires stale step-up proof", async () => {
  const { actorSessionRepository, sessionLifecycleService } =
    await buildSessionFixture();
  const stepUpPolicyService = new StepUpPolicyService();

  await sessionLifecycleService.issueBrowserSession({
    tenant_id: "tenant.taxat",
    user_id: "user.operator.202",
    session_id: "session.browser.203",
    authn_level: "STEP_UP",
    step_up_state: "SATISFIED",
    session_binding_hash: "hash.binding.browser.203",
    csrf_ref: "csrf.binding.203",
    issued_at: "2026-04-23T08:00:00Z",
    expires_at: "2026-04-23T18:00:00Z",
  });
  const session = await actorSessionRepository.requireBySessionId(
    "tenant.taxat",
    "session.browser.203",
  );

  const posture = await stepUpPolicyService.evaluateSession({
    as_of: "2026-04-23T08:16:00Z",
    required_authn_level: "STEP_UP",
    session,
  });

  expect(posture).toEqual({
    reason_codes: ["STEP_UP_PROOF_EXPIRED"],
    required: true,
    required_authn_level: "STEP_UP",
    rotation_required_after_completion: true,
    satisfied: false,
    state: "EXPIRED",
    step_up_expires_at: "2026-04-23T08:15:00.000Z",
  });
});

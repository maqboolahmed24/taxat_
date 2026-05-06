import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  ActorSessionRepository,
  AuthorityLinkRepository,
  AuthorizeService,
  DelegationGrantRepository,
  ExceptionalAuthorityGrantRepository,
  PrincipalContextBuilder,
  PrincipalContextRepository,
  SessionLifecycleService,
  TenantRepository,
  UserRepository,
} from "../../../packages/backend-access/src/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

async function validatePayloadAgainstSchema(schemaName: string, payload: unknown) {
  const script = `
import json
import pathlib
import sys

repo = pathlib.Path(sys.argv[1])
sys.path.insert(0, str(repo / "packages" / "contracts-core" / "python"))
from validate_contracts import (  # type: ignore
    CUSTOM_VALIDATORS,
    Draft202012Validator,
    build_registry,
    load_json,
)

schema_name = sys.argv[2]
payload = json.loads(sys.argv[3])
schema = load_json(repo / "packages" / "contracts-core" / "schemas" / schema_name)
validator = Draft202012Validator(
    schema,
    registry=build_registry(),
    format_checker=Draft202012Validator.FORMAT_CHECKER,
)
issues = [
    f"schema:<{'/'.join(map(str, error.absolute_path)) or '<root>'}>: {error.message}"
    for error in sorted(validator.iter_errors(payload), key=lambda error: list(error.absolute_path))
]
custom_validator = CUSTOM_VALIDATORS.get(schema_name.replace(".schema.json", ""))
if custom_validator:
    issues.extend(
        f"custom:{getattr(issue, 'location', 'inline')}: {getattr(issue, 'message', str(issue))}"
        for issue in custom_validator(payload, "inline")
    )
if issues:
    raise SystemExit("\\n".join(issues))
`;

  await execFileAsync(path.join(repoRoot, ".venv", "bin", "python3"), [
    "-c",
    script,
    repoRoot,
    schemaName,
    JSON.stringify(payload),
  ]);
}

async function buildIntegrationFixture() {
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
  const principalContextRepository = new PrincipalContextRepository();
  const delegationGrantRepository = new DelegationGrantRepository({ tenantRepository });
  const authorityLinkRepository = new AuthorityLinkRepository({
    tenantRepository,
    delegationGrantRepository,
  });
  const exceptionalAuthorityGrantRepository = new ExceptionalAuthorityGrantRepository({
    tenantRepository,
  });
  const authorizeService = new AuthorizeService({
    authorityLinkRepository,
    delegationGrantRepository,
    exceptionalAuthorityGrantRepository,
    principalContextRepository,
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
    user_id: "user.operator.100",
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
    user_id: "user.operator.100",
    session_id: "session.browser.100",
    authn_level: "STEP_UP",
    step_up_state: "SATISFIED",
    session_binding_hash: "hash.binding.browser.100",
    csrf_ref: "csrf.binding.100",
    issued_at: "2026-04-23T08:00:00Z",
    expires_at: "2026-04-23T18:00:00Z",
  });

  return {
    authorizeService,
    authorityLinkRepository,
    delegationGrantRepository,
    principalContextBuilder,
    principalContextRepository,
  };
}

test("authorizes a fully bound authority submission and persists the frozen decision", async () => {
  const {
    authorizeService,
    authorityLinkRepository,
    delegationGrantRepository,
    principalContextBuilder,
    principalContextRepository,
  } = await buildIntegrationFixture();

  const delegationGrant = await delegationGrantRepository.create({
    delegation_grant_id: "delegation-grant.dg-100",
    tenant_id: "tenant.taxat",
    reporting_subject_ref: "reporting-subject.client-100",
    delegate_ref: "delegate.agent-100",
    delegate_class: "HUMAN",
    authority_scope_refs: ["submit_returns"],
    partition_scope_refs: ["partition.uk.vat", "period.2026-Q1"],
    basis_type: "CLIENT_GRANTED",
    basis_evidence_refs: ["evidence.client-delegation.100"],
    effective_from: "2026-04-23T08:00:00Z",
    expires_at: null,
    revoked_at: null,
    superseded_by_grant_id: null,
    lifecycle_state: "ACTIVE",
    last_validated_at: "2026-04-23T08:30:00Z",
    imported_evidence_fresh_until: null,
    limitation_reason_codes: [],
  });

  await authorityLinkRepository.create({
    authority_link_id: "authority-link.al-100",
    tenant_id: "tenant.taxat",
    client_id: "client.taxpayer.100",
    reporting_subject_ref: "reporting-subject.client-100",
    authority_name: "HMRC-MTD",
    authority_scope: "submit_returns",
    provider_environment: "sandbox",
    provider_api_version: "v1",
    authorised_party_ref: "delegate.agent-100",
    delegation_grant_ref: delegationGrant.record.delegation_grant_id,
    partition_scope_refs: ["partition.uk.vat", "period.2026-Q1"],
    token_binding_profile_ref: "token-binding-profile.100",
    validated_at: "2026-04-23T08:30:00Z",
    expires_at: "2026-05-23T08:30:00Z",
    revoked_at: null,
    superseded_by_link_id: null,
    lifecycle_state: "AUTHORISED_ACTIVE",
    binding_health: "HEALTHY",
    delegation_state: "SATISFIED",
    token_client_binding_state: "BOUND",
    source_evidence_refs: ["evidence.authority-link.100"],
    blocked_reason_codes: [],
    last_binding_check_at: "2026-04-23T09:00:00Z",
  });

  const principalContext = await principalContextBuilder.build({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.100",
    delegation_basis: "CLIENT_GRANTED",
    client_scope: ["client.taxpayer.100"],
    requested_scope: ["year_end", "prepare_submission", "submit"],
    partition_scope_refs: ["partition.uk.vat", "period.2026-Q1"],
    masking_scope: "TENANT_ADMIN_UNMASKED",
    authorization_evaluated_at: "2026-04-23T09:00:00Z",
  });

  const result = await authorizeService.authorize({
    principal_context: principalContext,
    resource_class: "SubmissionRecord",
    action_family: "SUBMIT_TO_AUTHORITY",
    evaluated_at: "2026-04-23T09:10:00Z",
    operation_target: {
      client_id: "client.taxpayer.100",
      reporting_subject_ref: "reporting-subject.client-100",
      authorised_party_ref: "delegate.agent-100",
      authority_name: "HMRC-MTD",
      authority_scope: "submit_returns",
      provider_environment: "sandbox",
      provider_api_version: "v1",
    },
  });

  await validatePayloadAgainstSchema(
    "authorization_decision.schema.json",
    result.authorization_decision,
  );

  expect(result.authorization_decision.decision).toBe("ALLOW");
  expect(result.authorization_decision.delegation_snapshot_refs).toHaveLength(1);
  expect(result.authorization_decision.authority_link_snapshot_refs).toHaveLength(1);
  expect(result.authorization_decision.authority_layer_boundary.human_gate_requirement).toBe(
    "REQUIRE_STEP_UP",
  );
  expect(result.authorization_decision.authority_layer_boundary.human_gate_resolution_state).toBe(
    "EVIDENCE_FROZEN",
  );
  expect(result.blocked_response).toBeNull();

  const stored = await principalContextRepository.listAuthorizationDecisionsByContextAccessBindingHash(
    "tenant.taxat",
    principalContext.access_binding_hash,
  );
  expect(stored).toHaveLength(1);
  expect(stored[0]?.access_binding_hash).toBe(result.authorization_decision.access_binding_hash);
});

test("serializes authority-integrated denials with an explicit UNLINKED posture and no fake link snapshot", async () => {
  const {
    authorizeService,
    delegationGrantRepository,
    principalContextBuilder,
    principalContextRepository,
  } = await buildIntegrationFixture();

  await delegationGrantRepository.create({
    delegation_grant_id: "delegation-grant.dg-101",
    tenant_id: "tenant.taxat",
    reporting_subject_ref: "reporting-subject.client-101",
    delegate_ref: "delegate.agent-101",
    delegate_class: "HUMAN",
    authority_scope_refs: ["submit_returns"],
    partition_scope_refs: ["partition.uk.vat", "period.2026-Q1"],
    basis_type: "CLIENT_GRANTED",
    basis_evidence_refs: ["evidence.client-delegation.101"],
    effective_from: "2026-04-23T08:00:00Z",
    expires_at: null,
    revoked_at: null,
    superseded_by_grant_id: null,
    lifecycle_state: "ACTIVE",
    last_validated_at: "2026-04-23T08:30:00Z",
    imported_evidence_fresh_until: null,
    limitation_reason_codes: [],
  });

  const principalContext = await principalContextBuilder.build({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.100",
    delegation_basis: "CLIENT_GRANTED",
    client_scope: ["client.taxpayer.101"],
    requested_scope: ["year_end", "prepare_submission", "submit"],
    partition_scope_refs: ["partition.uk.vat", "period.2026-Q1"],
    masking_scope: "TENANT_ADMIN_UNMASKED",
    authorization_evaluated_at: "2026-04-23T09:00:00Z",
  });

  const result = await authorizeService.authorize({
    principal_context: principalContext,
    resource_class: "SubmissionRecord",
    action_family: "SUBMIT_TO_AUTHORITY",
    evaluated_at: "2026-04-23T09:20:00Z",
    operation_target: {
      client_id: "client.taxpayer.101",
      reporting_subject_ref: "reporting-subject.client-101",
      authorised_party_ref: "delegate.agent-101",
      authority_name: "HMRC-MTD",
      authority_scope: "submit_returns",
      provider_environment: "sandbox",
      provider_api_version: "v1",
    },
  });

  await validatePayloadAgainstSchema(
    "authorization_decision.schema.json",
    result.authorization_decision,
  );

  expect(result.authorization_decision.decision).toBe("DENY");
  expect(result.authorization_decision.authority_link_snapshot_refs).toEqual([]);
  expect(result.authorization_decision.authority_layer_boundary.integration_capability).toBe(
    "AUTHORITY_INTEGRATED",
  );
  expect(result.authorization_decision.authority_layer_boundary.authority_link_state).toBe(
    "UNLINKED",
  );

  const stored = await principalContextRepository.listAuthorizationDecisionsByContextAccessBindingHash(
    "tenant.taxat",
    principalContext.access_binding_hash,
  );
  expect(stored).toHaveLength(1);
  expect(stored[0]?.reason_codes).toContain("AUTHORITY_LINK_REQUIRED");
});

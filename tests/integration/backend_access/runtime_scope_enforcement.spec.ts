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
  RuntimeScopeGuard,
  ScopeExecutionBindingRepository,
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

async function buildFixture() {
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
  const scopeExecutionBindingRepository = new ScopeExecutionBindingRepository();
  const authorizeService = new AuthorizeService({
    authorityLinkRepository,
    delegationGrantRepository,
    exceptionalAuthorityGrantRepository,
    principalContextRepository,
  });
  const runtimeScopeGuard = new RuntimeScopeGuard({
    scopeExecutionBindingRepository,
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

  return {
    actorSessionRepository,
    authorityLinkRepository,
    authorizeService,
    delegationGrantRepository,
    principalContextBuilder,
    runtimeScopeGuard,
    scopeExecutionBindingRepository,
    sessionLifecycleService,
    tenantRepository,
    userRepository,
  };
}

test("materializes, validates, stores, and reuses a masked execution binding", async () => {
  const fixture = await buildFixture();

  await fixture.userRepository.create({
    artifact_type: "User",
    user_id: "user.auditor.100",
    tenant_id: "tenant.taxat",
    roles: ["AUDITOR"],
    attributes: {
      locale: "en-GB",
    },
    mfa_state: "SATISFIED",
    lifecycle_state: "ACTIVE",
    disabled_at: null,
    created_at: "2026-04-23T08:00:00Z",
  });
  await fixture.sessionLifecycleService.issueBrowserSession({
    tenant_id: "tenant.taxat",
    user_id: "user.auditor.100",
    session_id: "session.browser.100",
    authn_level: "STEP_UP",
    step_up_state: "SATISFIED",
    session_binding_hash: "hash.binding.browser.100",
    csrf_ref: "csrf.binding.100",
    issued_at: "2026-04-23T08:00:00Z",
    expires_at: "2026-04-23T18:00:00Z",
  });

  const principal_context = await fixture.principalContextBuilder.build({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.100",
    delegation_basis: "TENANT_INTERNAL",
    client_scope: [],
    requested_scope: ["year_end"],
    partition_scope_refs: [],
    masking_scope: "AUDITOR_MASKED",
    authorization_evaluated_at: "2026-04-23T09:00:00Z",
  });

  const authorization = await fixture.authorizeService.authorize({
    principal_context,
    resource_class: "Client",
    action_family: "VIEW_MASKED",
    evaluated_at: "2026-04-23T09:05:00Z",
    persist: false,
  });

  const enforced = await fixture.runtimeScopeGuard.enforce({
    authorization_decision: authorization.authorization_decision,
    principal_context,
    binding_scope_class: "FROZEN_EXECUTION_BINDING",
    execution_mode_or_null: "ANALYSIS",
    persist: true,
  });

  await validatePayloadAgainstSchema(
    "scope_execution_binding.schema.json",
    enforced.scope_execution_binding,
  );

  expect(enforced.runtime_scope).toEqual(["year_end"]);
  expect(enforced.masking_context.masking_active).toBe(true);

  const stored = await fixture.scopeExecutionBindingRepository.getScopeExecutionBindingByAccessBindingHash(
    "tenant.taxat",
    enforced.scope_execution_binding.access_binding_hash,
  );
  expect(stored?.scope_execution_binding.access_binding_hash).toBe(
    enforced.scope_execution_binding.access_binding_hash,
  );

  const replay = await fixture.runtimeScopeGuard.guardStoredBinding({
    access_binding_hash: enforced.scope_execution_binding.access_binding_hash,
    current_principal_context: principal_context,
  });
  expect(replay.runtime_scope).toEqual(["year_end"]);
  expect(replay.masking_context.projection_policy).toBe("PROJECTION_ONLY");
});

test("pre-step-up frozen bindings fail replay after challenge-state rotation", async () => {
  const fixture = await buildFixture();

  await fixture.userRepository.create({
    artifact_type: "User",
    user_id: "user.auditor.101",
    tenant_id: "tenant.taxat",
    roles: ["AUDITOR"],
    attributes: {
      locale: "en-GB",
    },
    mfa_state: "SATISFIED",
    lifecycle_state: "ACTIVE",
    disabled_at: null,
    created_at: "2026-04-23T08:00:00Z",
  });
  await fixture.sessionLifecycleService.issueBrowserSession({
    tenant_id: "tenant.taxat",
    user_id: "user.auditor.101",
    session_id: "session.browser.101",
    authn_level: "MFA",
    step_up_state: "REQUIRED_PENDING",
    session_binding_hash: "hash.binding.browser.101",
    csrf_ref: "csrf.binding.101",
    issued_at: "2026-04-23T08:00:00Z",
    expires_at: "2026-04-23T18:00:00Z",
  });

  const principal_context_before = await fixture.principalContextBuilder.build({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.101",
    delegation_basis: "TENANT_INTERNAL",
    client_scope: [],
    requested_scope: ["year_end"],
    partition_scope_refs: [],
    masking_scope: "AUDITOR_MASKED",
    authorization_evaluated_at: "2026-04-23T09:00:00Z",
  });

  const authorization = await fixture.authorizeService.authorize({
    principal_context: principal_context_before,
    resource_class: "Client",
    action_family: "VIEW_MASKED",
    evaluated_at: "2026-04-23T09:05:00Z",
    persist: false,
  });

  const enforced = await fixture.runtimeScopeGuard.enforce({
    authorization_decision: authorization.authorization_decision,
    principal_context: principal_context_before,
    binding_scope_class: "FROZEN_EXECUTION_BINDING",
    execution_mode_or_null: "ANALYSIS",
    persist: true,
  });

  await fixture.sessionLifecycleService.completeStepUp({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.101",
    completed_at: "2026-04-23T09:20:00Z",
    rotated_session_binding_hash: "hash.binding.browser.101.rotated",
  });

  const principal_context_after = await fixture.principalContextBuilder.build({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.101",
    delegation_basis: "TENANT_INTERNAL",
    client_scope: [],
    requested_scope: ["year_end"],
    partition_scope_refs: [],
    masking_scope: "AUDITOR_MASKED",
    authorization_evaluated_at: "2026-04-23T09:25:00Z",
  });

  await expect(
    fixture.runtimeScopeGuard.guardStoredBinding({
      access_binding_hash: enforced.scope_execution_binding.access_binding_hash,
      current_principal_context: principal_context_after,
    }),
  ).rejects.toMatchObject({
    code: "RUNTIME_SCOPE_ACCESS_BINDING_STALE",
  });
});

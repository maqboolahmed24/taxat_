import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  ActorSessionRepository,
  AuthorityChainStackBuilder,
  AuthorityLinkRepository,
  AuthorizeService,
  DelegationGrantRepository,
  ExceptionalAuthorityGrantRepository,
  GovernanceAccessSimulationRepository,
  PrincipalAccessViewQueryService,
  PrincipalAccessViewRepository,
  PrincipalContextBuilder,
  PrincipalContextRepository,
  SessionLifecycleService,
  TenantRepository,
  UserRepository,
  buildAuthorityLayerBoundaryContract,
  getPrincipalAccessView,
  loadAuthorizationPolicyRuntime,
  normalizeAuthorizationDecisionRecord,
  normalizeGovernanceAccessSimulationRecord,
  normalizePrincipalContextRecord,
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

async function buildFixture(options?: {
  authn_level?: "BASIC" | "MFA" | "STEP_UP";
  role_id?: string;
  session_id?: string;
  tenant_id?: string;
  user_id?: string;
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
  const principalContextRepository = new PrincipalContextRepository();
  const principalAccessViewRepository = new PrincipalAccessViewRepository();
  const governanceAccessSimulationRepository = new GovernanceAccessSimulationRepository();
  const delegationGrantRepository = new DelegationGrantRepository({ tenantRepository });
  const authorityLinkRepository = new AuthorityLinkRepository({
    tenantRepository,
    delegationGrantRepository,
  });
  const authorizeService = new AuthorizeService({
    authorityLinkRepository,
    delegationGrantRepository,
    exceptionalAuthorityGrantRepository: new ExceptionalAuthorityGrantRepository({
      tenantRepository,
    }),
    principalContextRepository,
  });
  const queryService = new PrincipalAccessViewQueryService({
    actorSessionRepository,
    delegationGrantRepository,
    governanceAccessSimulationRepository,
    principalAccessViewRepository,
    principalContextRepository,
  });

  const tenant_id = options?.tenant_id ?? "tenant.taxat";
  const user_id = options?.user_id ?? "user.operator.320";
  const session_id = options?.session_id ?? "session.browser.320";

  await tenantRepository.create({
    artifact_type: "Tenant",
    tenant_id,
    name: "Taxat Sandbox",
    policy_profile_id: "policy.default",
    default_retention_profile_id: "retention.default",
    lifecycle_state: "ACTIVE",
    disabled_at: null,
    created_at: "2026-04-23T08:00:00Z",
  });
  await userRepository.create({
    artifact_type: "User",
    user_id,
    tenant_id,
    roles: [options?.role_id ?? "TENANT_ADMIN"],
    attributes: {
      locale: "en-GB",
    },
    mfa_state: "SATISFIED",
    lifecycle_state: "ACTIVE",
    disabled_at: null,
    created_at: "2026-04-23T08:00:00Z",
  });
  await sessionLifecycleService.issueBrowserSession({
    tenant_id,
    user_id,
    session_id,
    authn_level: options?.authn_level ?? "MFA",
    step_up_state:
      (options?.authn_level ?? "MFA") === "STEP_UP" ? "SATISFIED" : "NOT_REQUIRED",
    session_binding_hash: `hash.binding.${session_id}`,
    csrf_ref: `csrf.${session_id}`,
    issued_at: "2026-04-23T08:00:00Z",
    expires_at: "2026-04-23T18:00:00Z",
  });

  return {
    actorSessionRepository,
    authorityLinkRepository,
    authorizeService,
    delegationGrantRepository,
    governanceAccessSimulationRepository,
    principalAccessViewRepository,
    principalContextBuilder,
    principalContextRepository,
    queryService,
    tenant_id,
    session_id,
    user_id,
  };
}

async function seedGovernancePrincipal(options?: { stale_policy_hash?: string }) {
  const fixture = await buildFixture({
    authn_level: "MFA",
    role_id: "TENANT_ADMIN",
    session_id: "session.browser.321",
    user_id: "user.operator.321",
  });
  const runtime = await loadAuthorizationPolicyRuntime();
  const principal_context = await fixture.principalContextBuilder.build({
    tenant_id: fixture.tenant_id,
    session_id: fixture.session_id,
    delegation_basis: "SELF_ACTING",
    client_scope: ["client.taxpayer.321"],
    requested_scope: ["year_end", "prepare_submission", "submit", "amendment_intent"],
    partition_scope_refs: ["partition.uk.vat"],
    masking_scope: "TENANT_ADMIN_UNMASKED",
    authorization_evaluated_at: "2026-04-23T09:00:00Z",
    policy_context_override: {
      policy_snapshot_hash: runtime.policy_snapshot_hash,
    },
  });

  const results = [
    await fixture.authorizeService.authorize({
      principal_context,
      resource_class: "WorkflowItem",
      action_family: "REQUEST_CLIENT_INFO",
      evaluated_at: "2026-04-23T09:05:00Z",
      ...(options?.stale_policy_hash ? { persist: false } : {}),
    }),
    await fixture.authorizeService.authorize({
      principal_context,
      resource_class: "Override",
      action_family: "CREATE_OVERRIDE",
      evaluated_at: "2026-04-23T09:06:00Z",
      ...(options?.stale_policy_hash ? { persist: false } : {}),
    }),
    await fixture.authorizeService.authorize({
      principal_context,
      resource_class: "ConfigChangeRequest",
      action_family: "APPROVE_CONFIG",
      evaluated_at: "2026-04-23T09:07:00Z",
      ...(options?.stale_policy_hash ? { persist: false } : {}),
    }),
  ];
  let frozen_principal_context = principal_context;

  if (options?.stale_policy_hash) {
    const {
      access_binding_hash: _ignoredAccessBindingHash,
      artifact_type: _ignoredArtifactType,
      ...principalContextSeed
    } = principal_context;
    const stale_principal_context = normalizePrincipalContextRecord({
      ...principalContextSeed,
      policy_snapshot_hash: options.stale_policy_hash,
    });
    frozen_principal_context = stale_principal_context;
    await fixture.principalContextRepository.storePrincipalContext(
      stale_principal_context,
    );
    for (const result of results) {
      const {
        access_binding_hash: _ignoredDecisionAccessBindingHash,
        artifact_type: _ignoredDecisionArtifactType,
        decision_id: _ignoredDecisionId,
        ...decisionSeed
      } = result.authorization_decision;
      await fixture.principalContextRepository.storeAuthorizationDecision({
        authorization_decision: normalizeAuthorizationDecisionRecord({
          ...decisionSeed,
          policy_snapshot_hash: options.stale_policy_hash,
          principal_context_access_binding_hash: stale_principal_context.access_binding_hash,
        }),
        principal_context: stale_principal_context,
      });
    }
  }

  return {
    fixture,
    principal_context: frozen_principal_context,
    results,
    runtime,
  };
}

test("query service returns one schema-valid mounted principal view and persists it by frozen principal context", async () => {
  const seeded = await seedGovernancePrincipal();
  const response = await getPrincipalAccessView(seeded.fixture.queryService, {
    tenant_id: seeded.fixture.tenant_id,
    principal_id: seeded.principal_context.principal_id,
    selected_cell_ref: "cell.Override.CREATE_OVERRIDE",
  });

  await validatePayloadAgainstSchema(
    "principal_access_view.schema.json",
    response.view,
  );

  expect(response.view.access_workspace.workspace_mode).toBe("PRINCIPALS");
  expect(response.view.access_workspace.selected_principal_ref).toBe(
    seeded.principal_context.principal_id,
  );
  expect(response.view.access_workspace.latest_simulation_ref).toBeNull();
  expect(response.view.selected_action_detail?.decision).toBe("REQUIRE_APPROVAL");
  expect(response.view.interaction_layer.selected_filter_chip_refs).toEqual([
    "principal_type:HUMAN",
    "principal_state:ACTIVE",
    "role:TENANT_ADMIN",
    "delegated_client:client.taxpayer.321",
    `changed_by:${seeded.principal_context.principal_id}`,
  ]);

  const stored =
    await seeded.fixture.principalAccessViewRepository.getLatestViewByPrincipalContextAccessBindingHash(
      seeded.fixture.tenant_id,
      seeded.principal_context.access_binding_hash,
    );
  expect(stored?.view.focus_anchor_ref).toBe("cell.Override.CREATE_OVERRIDE");
  expect(stored?.source_refs).toContain(seeded.principal_context.access_binding_hash);
});

test("query service exposes stale frozen policy posture and only enters simulator mode when a published simulation exists", async () => {
  const staleHash = `${"0".repeat(63)}2`;
  const seeded = await seedGovernancePrincipal({ stale_policy_hash: staleHash });
  const stackBuilder = new AuthorityChainStackBuilder();
  const {
    access_binding_hash: _ignoredCreateOverrideAccessBindingHash,
    artifact_type: _ignoredCreateOverrideArtifactType,
    decision_id: _ignoredCreateOverrideDecisionId,
    ...createOverrideDecisionSeed
  } = seeded.results[1]!.authorization_decision;
  const createOverrideDecision = normalizeAuthorizationDecisionRecord({
    ...createOverrideDecisionSeed,
    policy_snapshot_hash: staleHash,
    principal_context_access_binding_hash: seeded.principal_context.access_binding_hash,
  });
  const chain = await stackBuilder.build({
    authority_layer_boundary: createOverrideDecision.authority_layer_boundary,
  });

  const withoutSimulation = await seeded.fixture.queryService.getView({
    tenant_id: seeded.fixture.tenant_id,
    principal_context_access_binding_hash: seeded.principal_context.access_binding_hash,
    selected_cell_ref: "cell.Override.CREATE_OVERRIDE",
    workspace_mode: "SIMULATOR",
  });
  expect(withoutSimulation.view.access_workspace.workspace_mode).toBe("PRINCIPALS");
  expect(withoutSimulation.view.access_workspace.latest_simulation_ref).toBeNull();
  expect(withoutSimulation.view.settlement_state).toBe("STALE_REVIEW_REQUIRED");
  expect(withoutSimulation.view.recovery_posture).toBe("INLINE_REBASE");

  const simulation = normalizeGovernanceAccessSimulationRecord({
    tenant_id: seeded.fixture.tenant_id,
    policy_snapshot_hash: staleHash,
    principal_context_ref: seeded.principal_context.principal_id,
    governance_target_ref: "override.create.321",
    resource_class: createOverrideDecision.resource_class,
    action_family: createOverrideDecision.action_family,
    requested_scope: createOverrideDecision.effective_scope,
    requested_partition_scope_refs: createOverrideDecision.effective_partition_scope_refs,
    authorization_decision: createOverrideDecision,
    authority_chain_layers: chain as Parameters<
      typeof normalizeGovernanceAccessSimulationRecord
    >[0]["authority_chain_layers"],
    simulated_at: "2026-04-23T09:12:00Z",
    simulator_posture: "READ_ONLY_DECISION",
    mutation_hazard: null,
    mutation_basis_contract: null,
  });
  await seeded.fixture.governanceAccessSimulationRepository.storeSimulation({
    persisted_at: "2026-04-23T09:12:30Z",
    principal_context: seeded.principal_context,
    simulation,
  });

  const withSimulation = await seeded.fixture.queryService.getView({
    tenant_id: seeded.fixture.tenant_id,
    principal_context_access_binding_hash: seeded.principal_context.access_binding_hash,
    selected_cell_ref: "cell.Override.CREATE_OVERRIDE",
    workspace_mode: "SIMULATOR",
  });

  await validatePayloadAgainstSchema(
    "principal_access_view.schema.json",
    withSimulation.view,
  );

  expect(withSimulation.view.settlement_state).toBe("STALE_REVIEW_REQUIRED");
  expect(withSimulation.view.access_workspace.workspace_mode).toBe("SIMULATOR");
  expect(withSimulation.view.access_workspace.latest_simulation_ref).toBe(
    simulation.simulation_id,
  );
  expect(withSimulation.view.selected_action_detail?.decision).toBe("REQUIRE_APPROVAL");
  expect(withSimulation.view.access_workspace.promoted_support_surface).toBe(
    "POLICY_SIMULATOR",
  );
});

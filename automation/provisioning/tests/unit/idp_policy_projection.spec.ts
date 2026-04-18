import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import { createRunContext } from "../../src/core/run_context.js";
import {
  createAccessStepupMatrixViewModel,
  createRecommendedRoleCatalog,
  createRecommendedScopeCatalog,
  createRecommendedSessionPolicyMatrix,
  createRecommendedStepUpPolicyMatrix,
  createTemplateIdpPolicyEvidence,
  IDP_POLICY_FLOW_ID,
  IDP_PROVIDER_ID,
  validateRoleCatalog,
  validateSessionPolicyMatrix,
  validateStepUpPolicyMatrix,
  type IdpPolicyEvidenceTemplate,
} from "../../src/providers/idp/flows/configure_roles_scopes_mfa_sessions.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
);

async function readJson<T>(segments: string[]): Promise<T> {
  const filePath = path.join(repoRoot, ...segments);
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function templateRunContext() {
  return createRunContext({
    runId: "run-template-idp-policy",
    providerId: IDP_PROVIDER_ID,
    flowId: IDP_POLICY_FLOW_ID,
    productEnvironmentId: "env_shared_sandbox_integration",
    providerEnvironment: "fixture",
    executionMode: "fixture",
    operatorIdentityAlias: "ops.idp.template",
    workspaceId: "wk-shared-sandbox-idp-policy",
    evidenceRoot: "artifacts/runs/idp-policy-template",
  });
}

test("checked-in role, scope, session, evidence, and viewer artifacts stay aligned with the policy builders", async () => {
  const persistedRoleCatalog = await readJson([
    "config",
    "identity",
    "idp_role_catalog.json",
  ]);
  const persistedScopeCatalog = await readJson([
    "config",
    "identity",
    "idp_scope_catalog.json",
  ]);
  const persistedStepUpMatrix = await readJson([
    "config",
    "identity",
    "step_up_policy_matrix.json",
  ]);
  const persistedSessionMatrix = await readJson([
    "config",
    "identity",
    "session_policy_matrix.json",
  ]);
  const persistedEvidence = await readJson<IdpPolicyEvidenceTemplate>([
    "data",
    "provisioning",
    "idp_policy_evidence.template.json",
  ]);
  const sampleRun = await readJson<{
    accessStepupMatrix: ReturnType<typeof createAccessStepupMatrixViewModel>;
  }>([
    "automation",
    "provisioning",
    "report_viewer",
    "data",
    "sample_run.json",
  ]);

  expect(persistedRoleCatalog).toEqual(createRecommendedRoleCatalog());
  expect(persistedScopeCatalog).toEqual(createRecommendedScopeCatalog());
  expect(persistedStepUpMatrix).toEqual(createRecommendedStepUpPolicyMatrix());
  expect(persistedSessionMatrix).toEqual(createRecommendedSessionPolicyMatrix());
  expect(sampleRun.accessStepupMatrix).toEqual(createAccessStepupMatrixViewModel());

  const expectedEvidence = createTemplateIdpPolicyEvidence(templateRunContext());
  expectedEvidence.last_verified_at = persistedEvidence.last_verified_at;
  expect(persistedEvidence).toEqual(expectedEvidence);
  expect(persistedEvidence.last_verified_at).toMatch(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
  );
});

test("configured roles and scopes remain coarse, source-grounded, and engine-bounded", () => {
  const roleCatalog = createRecommendedRoleCatalog();
  const scopeCatalog = createRecommendedScopeCatalog();

  validateRoleCatalog(roleCatalog, scopeCatalog);

  for (const role of roleCatalog.roles) {
    expect(role.actor_classes.length).toBeGreaterThan(0);
    expect(role.allowed_surface_families.length).toBeGreaterThan(0);
    expect(role.source_refs.length).toBeGreaterThan(0);
    expect(role.engine_owned_dimensions).toEqual(
      expect.arrayContaining([
        "delegation_basis",
        "authority_link_state",
        "authority_of_record_outcome",
      ]),
    );
  }

  for (const scope of scopeCatalog.scopes) {
    expect(scope.allowed_actor_classes.length).toBeGreaterThan(0);
    expect(scope.allowed_surface_families.length).toBeGreaterThan(0);
    expect(scope.source_refs.length).toBeGreaterThan(0);
  }

  const serviceRoles = roleCatalog.roles.filter(
    (role) => role.assignment_posture === "SERVICE_CLIENT_GRANT_ROLE",
  );
  expect(
    serviceRoles.every(
      (role) => !role.requestable_scope_refs.includes("scope.elevated.client_signoff"),
    ),
  ).toBe(true);
});

test("session coverage and step-up consequences stay explicit across every supported channel", () => {
  const roleCatalog = createRecommendedRoleCatalog();
  const scopeCatalog = createRecommendedScopeCatalog();
  const sessionPolicyMatrix = createRecommendedSessionPolicyMatrix();
  const stepUpPolicyMatrix = createRecommendedStepUpPolicyMatrix();

  validateSessionPolicyMatrix(sessionPolicyMatrix);
  validateStepUpPolicyMatrix(
    stepUpPolicyMatrix,
    roleCatalog,
    scopeCatalog,
    sessionPolicyMatrix,
  );

  expect(sessionPolicyMatrix.summary.session_profile_count).toBe(6);
  expect(
    new Set(sessionPolicyMatrix.session_profiles.map((profile) => profile.channel)),
  ).toEqual(
    new Set([
      "BROWSER",
      "NATIVE_MACOS",
      "API_AUTOMATION",
      "BROWSER_LIMITED_ENTRY",
      "BROWSER_OR_MOBILE_TRANSFER",
    ]),
  );

  for (const row of stepUpPolicyMatrix.trigger_rows) {
    expect(row.source_refs.length).toBeGreaterThan(0);
    expect(row.invalidation_events.length).toBeGreaterThan(0);
    expect(row.session_profile_refs.length).toBeGreaterThan(0);
    expect(row.assurance_requirement.length).toBeGreaterThan(0);
  }

  expect(
    stepUpPolicyMatrix.trigger_rows.some(
      (row) =>
        row.trigger_id === "submit_filing_or_amendment" &&
        row.step_up_cell === "REQUIRE_STEP_UP" &&
        row.approval_cell === "REQUIRE_APPROVAL",
    ),
  ).toBe(true);
  expect(
    stepUpPolicyMatrix.invalidation_events.map((event) => event.event_id),
  ).toEqual(
    expect.arrayContaining([
      "STEP_UP_COMPLETED",
      "TENANT_SWITCH",
      "SESSION_REVOKED",
    ]),
  );
});

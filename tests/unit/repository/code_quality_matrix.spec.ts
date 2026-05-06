import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

async function readJson(relativePath: string) {
  return JSON.parse(await readFile(path.join(repoRoot, relativePath), "utf8"));
}

async function runVerifier(args: string[]) {
  return execFileAsync(
    "node",
    ["--experimental-strip-types", "./tools/repository/verify_code_quality_coverage.ts", ...args],
    {
      cwd: repoRoot,
    },
  );
}

test("code quality matrix and generated policy declare the atlas surface and required guardrail families", async () => {
  const [matrix, policy] = await Promise.all([
    readJson("config/tooling/code_quality_matrix.json"),
    readJson("config/tooling/generated_fixture_and_external_code_policy.json"),
  ]);

  expect(matrix.matrixVersion).toBe("CODE_QUALITY_MATRIX_V1");
  expect(
    matrix.toolFamilies.map((family: { toolFamilyRef: string }) => family.toolFamilyRef),
  ).toEqual(["FORMAT", "LINT", "TYPECHECK", "HOOKS", "PLAYWRIGHT"]);

  const routeArea = matrix.areas.find(
    (area: { areaRef: string }) => area.areaRef === "OPERATOR_WEB_INTERNAL_ROUTE_METADATA",
  );
  const atlasArea = matrix.areas.find(
    (area: { areaRef: string }) => area.areaRef === "OPERATOR_WEB_INTERNAL_STATIC_ATLASES",
  );
  const governanceRouteArea = matrix.areas.find(
    (area: { areaRef: string }) => area.areaRef === "OPERATOR_WEB_GOVERNANCE_ACCESS_ROUTE_METADATA",
  );
  const governanceStaticArea = matrix.areas.find(
    (area: { areaRef: string }) =>
      area.areaRef === "OPERATOR_WEB_GOVERNANCE_ACCESS_STATIC_SURFACES",
  );

  expect(routeArea.pathGlobs).toContain(
    "apps/operator-web/src/routes/internal/audit-stream-atlas.tsx",
  );
  expect(routeArea.pathGlobs).toContain(
    "apps/operator-web/src/routes/internal/code-quality-atlas.tsx",
  );
  expect(routeArea.pathGlobs).toContain(
    "apps/operator-web/src/routes/internal/contracts-observatory/index.tsx",
  );
  expect(routeArea.pathGlobs).toContain(
    "apps/operator-web/src/routes/internal/contracts-observatory/[artifact].tsx",
  );
  expect(routeArea.pathGlobs).toContain(
    "apps/operator-web/src/components/contracts-observatory/**",
  );
  expect(routeArea.pathGlobs).toContain(
    "apps/operator-web/src/routes/internal/config-resolution-atlas.tsx",
  );
  expect(routeArea.pathGlobs).toContain(
    "apps/operator-web/src/routes/internal/canonical-primitives-atlas.tsx",
  );
  expect(routeArea.pathGlobs).toContain(
    "apps/operator-web/src/routes/internal/canonical-domain-example-atlas.tsx",
  );
  expect(routeArea.pathGlobs).toContain(
    "apps/operator-web/src/routes/internal/cache-isolation-atlas.tsx",
  );
  expect(routeArea.pathGlobs).toContain(
    "apps/operator-web/src/routes/internal/environment-basis-atlas.tsx",
  );
  expect(routeArea.pathGlobs).toContain(
    "apps/operator-web/src/routes/internal/local-runtime-observatory.tsx",
  );
  expect(routeArea.pathGlobs).toContain(
    "apps/operator-web/src/routes/internal/migration-window-atlas.tsx",
  );
  expect(routeArea.pathGlobs).toContain(
    "apps/operator-web/src/routes/internal/northbound-boundary-atlas.tsx",
  );
  expect(routeArea.pathGlobs).toContain(
    "apps/operator-web/src/routes/internal/object-lifecycle-atlas.tsx",
  );
  expect(routeArea.pathGlobs).toContain(
    "apps/operator-web/src/routes/internal/queue-fabric-atlas.tsx",
  );
  expect(routeArea.pathGlobs).toContain(
    "apps/operator-web/src/routes/internal/reference-grammar-atlas.tsx",
  );
  expect(routeArea.pathGlobs).toContain(
    "apps/operator-web/src/routes/internal/schema-compatibility-atlas.tsx",
  );
  expect(routeArea.pathGlobs).toContain(
    "apps/operator-web/src/routes/internal/stream-recovery-atlas.tsx",
  );
  expect(routeArea.pathGlobs).toContain(
    "apps/operator-web/src/routes/internal/telemetry-correlation-atlas.tsx",
  );
  expect(routeArea.pathGlobs).toContain(
    "apps/operator-web/src/routes/internal/upload-transfer-atlas.tsx",
  );
  expect(atlasArea.pathGlobs).toContain("apps/operator-web/public/internal/audit-stream-atlas/**");
  expect(atlasArea.pathGlobs).toContain(
    "apps/operator-web/public/internal/canonical-primitives-atlas/**",
  );
  expect(atlasArea.pathGlobs).toContain(
    "apps/operator-web/public/internal/canonical-domain-example-atlas/**",
  );
  expect(atlasArea.pathGlobs).toContain(
    "apps/operator-web/public/internal/cache-isolation-atlas/**",
  );
  expect(atlasArea.pathGlobs).toContain(
    "apps/operator-web/public/internal/config-resolution-atlas/**",
  );
  expect(atlasArea.pathGlobs).toContain("apps/operator-web/public/internal/code-quality-atlas/**");
  expect(atlasArea.pathGlobs).toContain(
    "apps/operator-web/public/internal/contracts-observatory/**",
  );
  expect(atlasArea.pathGlobs).toContain(
    "apps/operator-web/public/internal/environment-basis-atlas/**",
  );
  expect(atlasArea.pathGlobs).toContain(
    "apps/operator-web/public/internal/local-runtime-observatory/**",
  );
  expect(atlasArea.pathGlobs).toContain(
    "apps/operator-web/public/internal/migration-window-atlas/**",
  );
  expect(atlasArea.pathGlobs).toContain(
    "apps/operator-web/public/internal/northbound-boundary-atlas/**",
  );
  expect(atlasArea.pathGlobs).toContain(
    "apps/operator-web/public/internal/object-lifecycle-atlas/**",
  );
  expect(atlasArea.pathGlobs).toContain("apps/operator-web/public/internal/queue-fabric-atlas/**");
  expect(atlasArea.pathGlobs).toContain(
    "apps/operator-web/public/internal/reference-grammar-atlas/**",
  );
  expect(atlasArea.pathGlobs).toContain(
    "apps/operator-web/public/internal/schema-compatibility-atlas/**",
  );
  expect(atlasArea.pathGlobs).toContain(
    "apps/operator-web/public/internal/stream-recovery-atlas/**",
  );
  expect(atlasArea.pathGlobs).toContain(
    "apps/operator-web/public/internal/telemetry-correlation-atlas/**",
  );
  expect(atlasArea.pathGlobs).toContain(
    "apps/operator-web/public/internal/upload-transfer-atlas/**",
  );
  expect(routeArea.coverage.playwright.toolRef).toBe("PLAYWRIGHT_INTERNAL_ATLAS_BROWSER");
  expect(governanceRouteArea.pathGlobs).toContain(
    "apps/operator-web/src/routes/governance/access/index.tsx",
  );
  expect(governanceRouteArea.pathGlobs).toContain(
    "apps/operator-web/src/routes/governance/access/simulator.tsx",
  );
  expect(governanceStaticArea.pathGlobs).toContain("apps/operator-web/public/governance/access/**");
  expect(governanceRouteArea.coverage.typechecker.toolRef).toBe("TSC_REPO");
  expect(governanceStaticArea.coverage.playwright.toolRef).toBe(
    "PLAYWRIGHT_INTERNAL_ATLAS_BROWSER",
  );

  const rootArea = matrix.areas.find(
    (area: { areaRef: string }) => area.areaRef === "ROOT_REPOSITORY_TOOLING",
  );
  expect(rootArea.pathGlobs).toContain("config/audit/**");
  expect(rootArea.pathGlobs).toContain("config/access/**");
  expect(rootArea.pathGlobs).toContain("db/migrations/**/*.sql");
  expect(rootArea.pathGlobs).toContain("config/runtime/**");
  expect(rootArea.pathGlobs).toContain("config/cache/**");
  expect(rootArea.pathGlobs).toContain("config/configuration/**");
  expect(rootArea.pathGlobs).toContain("config/docs/**");
  expect(rootArea.pathGlobs).toContain("config/storage/**");
  expect(rootArea.pathGlobs).toContain("config/streaming/**");
  expect(rootArea.pathGlobs).toContain("config/telemetry/**");
  expect(rootArea.pathGlobs).toContain("config/uploads/**");
  expect(rootArea.pathGlobs).toContain("config/migrations/**");
  expect(rootArea.pathGlobs).toContain("schemas/**/*.json");
  expect(rootArea.pathGlobs).toContain("config/northbound/**");
  expect(rootArea.pathGlobs).toContain("config/primitives/**");
  expect(rootArea.pathGlobs).toContain("config/queue/**");
  expect(rootArea.pathGlobs).toContain("config/release/**");
  expect(rootArea.pathGlobs).toContain("config/references/**");
  expect(rootArea.pathGlobs).toContain("docs/audit/**");
  expect(rootArea.pathGlobs).toContain("docs/access/**");
  expect(rootArea.pathGlobs).toContain("docs/api/**");
  expect(rootArea.pathGlobs).toContain("docs/cache/**");
  expect(rootArea.pathGlobs).toContain("docs/configuration/**");
  expect(rootArea.pathGlobs).toContain("docs/fixtures/**");
  expect(rootArea.pathGlobs).toContain("docs/datastore/**");
  expect(rootArea.pathGlobs).toContain("tools/database/**");
  expect(rootArea.pathGlobs).toContain("docs/runtime/**");
  expect(rootArea.pathGlobs).toContain("docs/storage/**");
  expect(rootArea.pathGlobs).toContain("docs/streaming/**");
  expect(rootArea.pathGlobs).toContain("docs/telemetry/**");
  expect(rootArea.pathGlobs).toContain("docs/testing/**");
  expect(rootArea.pathGlobs).toContain("docs/uploads/**");
  expect(rootArea.pathGlobs).toContain("docs/repository/task_runner_and_agent_entrypoints.md");
  expect(rootArea.pathGlobs).toContain("scripts/tasks/**/*.json");
  expect(rootArea.pathGlobs).toContain("docs/primitives/**");
  expect(rootArea.pathGlobs).toContain("docs/queue/**");
  expect(rootArea.pathGlobs).toContain("docs/release/**");
  expect(rootArea.pathGlobs).toContain("docs/references/**");
  expect(rootArea.pathGlobs).toContain("scripts/contracts/**/*.ts");
  expect(rootArea.pathGlobs).toContain("scripts/release/**/*.ts");
  expect(rootArea.pathGlobs).toContain("tools/fixtures/**/*.ts");

  const localInfraArea = matrix.areas.find(
    (area: { areaRef: string }) => area.areaRef === "LOCAL_RUNTIME_INFRA_CONTRACTS",
  );
  expect(localInfraArea.pathGlobs).toContain("infra/local/compose.yaml");
  expect(localInfraArea.pathGlobs).toContain("infra/local/**/*.json");
  expect(localInfraArea.coverage.hooks.toolRef).toBe("PRE_COMMIT_SCOPED");
  expect(localInfraArea.coverage.typechecker.toolRef).toBe("TYPECHECK_EXEMPT_POLICY");

  const ephemeralInfraArea = matrix.areas.find(
    (area: { areaRef: string }) => area.areaRef === "EPHEMERAL_TEST_INFRA_CONTRACTS",
  );
  expect(ephemeralInfraArea.pathGlobs).toContain("infra/test/**/*.json");
  expect(ephemeralInfraArea.coverage.hooks.toolRef).toBe("PRE_COMMIT_SCOPED");
  expect(ephemeralInfraArea.coverage.typechecker.toolRef).toBe("TYPECHECK_EXEMPT_POLICY");

  const localScriptsArea = matrix.areas.find(
    (area: { areaRef: string }) => area.areaRef === "LOCAL_RUNTIME_BOOTSTRAP_SCRIPTS",
  );
  expect(localScriptsArea.pathGlobs).toContain("scripts/local/**/*.py");
  expect(localScriptsArea.coverage.formatter.toolRef).toBe("RUFF_FORMAT");
  expect(localScriptsArea.coverage.linter.toolRef).toBe("RUFF_LINT");
  expect(localScriptsArea.coverage.typechecker.toolRef).toBe("PYRIGHT");

  const ephemeralScriptsArea = matrix.areas.find(
    (area: { areaRef: string }) => area.areaRef === "EPHEMERAL_TEST_LIFECYCLE_SCRIPTS",
  );
  expect(ephemeralScriptsArea.pathGlobs).toContain("scripts/test/**/*.py");
  expect(ephemeralScriptsArea.coverage.formatter.toolRef).toBe("RUFF_FORMAT");
  expect(ephemeralScriptsArea.coverage.linter.toolRef).toBe("RUFF_LINT");
  expect(ephemeralScriptsArea.coverage.typechecker.toolRef).toBe("PYRIGHT");

  const taskRunnerPythonArea = matrix.areas.find(
    (area: { areaRef: string }) => area.areaRef === "REPOSITORY_TASK_RUNNER_PYTHON",
  );
  expect(taskRunnerPythonArea.pathGlobs).toContain("scripts/tasks/**/*.py");
  expect(taskRunnerPythonArea.pathGlobs).toContain("scripts/agent/**/*.py");
  expect(taskRunnerPythonArea.coverage.formatter.toolRef).toBe("RUFF_FORMAT");
  expect(taskRunnerPythonArea.coverage.linter.toolRef).toBe("RUFF_LINT");
  expect(taskRunnerPythonArea.coverage.typechecker.toolRef).toBe("PYRIGHT");

  const taskRunnerShellArea = matrix.areas.find(
    (area: { areaRef: string }) => area.areaRef === "REPOSITORY_TASK_RUNNER_SHELL_SURFACES",
  );
  expect(taskRunnerShellArea.pathGlobs).toContain("Makefile");
  expect(taskRunnerShellArea.pathGlobs).toContain("scripts/agent/**/*.sh");
  expect(taskRunnerShellArea.pathGlobs).toContain("tests/integration/repository/**/*.sh");
  expect(taskRunnerShellArea.coverage.hooks.toolRef).toBe("PRE_COMMIT_SCOPED");
  expect(taskRunnerShellArea.coverage.typechecker.toolRef).toBe("TYPECHECK_EXEMPT_POLICY");

  const controlPlaneDbArea = matrix.areas.find(
    (area: { areaRef: string }) => area.areaRef === "CONTROL_PLANE_DB_WORKSPACE",
  );
  expect(controlPlaneDbArea.pathGlobs).toContain("packages/control-plane-db/package.json");
  expect(controlPlaneDbArea.pathGlobs).toContain("packages/control-plane-db/src/**");

  const backendAccessArea = matrix.areas.find(
    (area: { areaRef: string }) => area.areaRef === "BACKEND_ACCESS_WORKSPACE",
  );
  expect(backendAccessArea.pathGlobs).toContain("packages/backend-access/package.json");
  expect(backendAccessArea.pathGlobs).toContain("packages/backend-access/src/**");
  expect(backendAccessArea.coverage.typechecker.toolRef).toBe("TSC_REPO");

  const packagesTsBoundariesArea = matrix.areas.find(
    (area: { areaRef: string }) => area.areaRef === "PACKAGES_TS_BOUNDARIES",
  );
  expect(packagesTsBoundariesArea.pathGlobs).toContain("packages/audit/package.json");
  expect(packagesTsBoundariesArea.pathGlobs).toContain("packages/audit/src/**");
  expect(packagesTsBoundariesArea.pathGlobs).toContain("packages/access-control/package.json");
  expect(packagesTsBoundariesArea.pathGlobs).toContain("packages/access-control/src/**");
  expect(packagesTsBoundariesArea.pathGlobs).toContain("packages/contracts-tools/package.json");
  expect(packagesTsBoundariesArea.pathGlobs).toContain("packages/contracts-tools/src/**");
  expect(packagesTsBoundariesArea.pathGlobs).toContain("packages/contracts-docs/package.json");
  expect(packagesTsBoundariesArea.pathGlobs).toContain("packages/contracts-docs/src/**");
  expect(packagesTsBoundariesArea.pathGlobs).toContain("packages/telemetry/package.json");
  expect(packagesTsBoundariesArea.pathGlobs).toContain("packages/telemetry/src/**");

  const generatorSync = matrix.toolDefinitions.find(
    (tool: { toolRef: string }) => tool.toolRef === "GENERATOR_SYNC",
  );
  expect(generatorSync.commandRef).toContain(
    "packages/domain-kernel/src/config/build_config_resolution_atlas.ts --check",
  );
  expect(generatorSync.commandRef).toContain(
    "packages/runtime-foundation/src/load_runtime_profile.ts --check",
  );
  expect(generatorSync.commandRef).toContain(
    "packages/runtime-foundation/src/build_local_runtime_observatory.ts --check",
  );
  expect(generatorSync.commandRef).toContain(
    "packages/domain-kernel/src/references/build_reference_grammar_atlas.ts --check",
  );
  expect(generatorSync.commandRef).toContain(
    "packages/domain-kernel/src/cache/build_cache_isolation_atlas.ts --check",
  );
  expect(generatorSync.commandRef).toContain(
    "packages/domain-kernel/src/storage/build_object_lifecycle_atlas.ts --check",
  );
  expect(generatorSync.commandRef).toContain(
    "packages/domain-kernel/src/queue/build_queue_fabric_atlas.ts --check",
  );
  expect(generatorSync.commandRef).toContain(
    "packages/domain-kernel/src/streaming/build_stream_recovery_atlas.ts --check",
  );
  expect(generatorSync.commandRef).toContain(
    "packages/audit/src/build_audit_stream_atlas.ts --check",
  );
  expect(generatorSync.commandRef).toContain(
    "packages/telemetry/src/build_telemetry_correlation_atlas.ts --check",
  );
  expect(generatorSync.commandRef).toContain(
    "packages/domain-kernel/src/uploads/build_upload_transfer_atlas.ts --check",
  );
  expect(generatorSync.commandRef).toContain(
    "packages/contracts-docs/src/generate_contract_observatory.ts --check",
  );
  expect(generatorSync.commandRef).toContain(
    "packages/control-plane-db/src/build_migration_window_atlas.ts --check",
  );
  expect(generatorSync.commandRef).toContain(
    "packages/access-control/src/emit_baseline_access_artifacts.ts --check",
  );
  expect(generatorSync.commandRef).toContain(
    "apps/control-plane-api/src/northbound/build_northbound_boundary_atlas.ts --check",
  );
  expect(generatorSync.commandRef).toContain(
    "tools/fixtures/build_deterministic_fixture_pack.ts --check",
  );
  expect(generatorSync.commandRef).toContain(
    "scripts/contracts/generate_migration_readiness_report.ts --check",
  );

  expect(policy.pathPolicies.map((entry: { policyRef: string }) => entry.policyRef)).toEqual(
    expect.arrayContaining([
      "GENERATED_TS_BINDINGS",
      "GENERATED_PY_BINDINGS",
      "GENERATED_SWIFT_BINDINGS",
      "GENERATED_CONTRACT_SCHEMA_CATALOG",
      "IMPORTED_CONTRACT_SCHEMA_MIRROR",
      "IMPORTED_CONTRACT_SAMPLE_MIRROR",
      "IMPORTED_CONTRACT_VALIDATOR_MIRROR",
      "GENERATED_ATLAS_DATA",
      "GENERATED_SYNTHETIC_FIXTURE_PACK",
      "PLAYWRIGHT_SNAPSHOTS_AND_ARTIFACTS",
    ]),
  );
  expect(
    policy.pathPolicies.find(
      (entry: { policyRef: string }) => entry.policyRef === "GENERATED_TS_BINDINGS",
    ).editPosture,
  ).toBe("REGENERATE_ONLY");

  const { stdout } = await runVerifier(["--check"]);
  expect(stdout).toContain("verified code quality coverage");
});

test("stage guard rejects direct edits to generator-owned TypeScript bindings", async () => {
  await expect(
    runVerifier(["--stage-guard", "packages/generated-models/src/generated/typescript/index.ts"]),
  ).rejects.toMatchObject({
    stderr: expect.stringContaining("GENERATED_TS_BINDINGS"),
  });
});

test("stage guard rejects direct edits to imported validator mirrors", async () => {
  await expect(
    runVerifier(["--stage-guard", "packages/contracts-core/python/validate_contracts.py"]),
  ).rejects.toMatchObject({
    stderr: expect.stringContaining("IMPORTED_CONTRACT_VALIDATOR_MIRROR"),
  });
});

test("stage guard rejects direct edits to generated contracts-core schema catalog", async () => {
  await expect(
    runVerifier(["--stage-guard", "packages/contracts-core/src/schemaCatalog.ts"]),
  ).rejects.toMatchObject({
    stderr: expect.stringContaining("GENERATED_CONTRACT_SCHEMA_CATALOG"),
  });
});

test("stage guard rejects direct edits to generated synthetic fixture pack artifacts", async () => {
  await expect(
    runVerifier(["--stage-guard", "fixtures/synthetic/deterministic_seed_catalog.json"]),
  ).rejects.toMatchObject({
    stderr: expect.stringContaining("GENERATED_SYNTHETIC_FIXTURE_PACK"),
  });
});

test("verifier fails when a new workspace appears without a declared coverage area", async () => {
  const uncoveredWorkspace = path.join(repoRoot, "apps", "uncovered-quality-fixture");

  await mkdir(uncoveredWorkspace, { recursive: true });
  await writeFile(
    path.join(uncoveredWorkspace, "package.json"),
    JSON.stringify(
      {
        name: "@taxat/uncovered-quality-fixture",
        private: true,
        version: "0.0.0",
      },
      null,
      2,
    ),
  );

  try {
    await expect(runVerifier(["--check"])).rejects.toMatchObject({
      stderr: expect.stringContaining("Uncovered workspace root: apps/uncovered-quality-fixture"),
    });
  } finally {
    await rm(uncoveredWorkspace, { recursive: true, force: true });
  }
});

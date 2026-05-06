import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  WORKFLOW_FAMILY_REFS,
  createDeliveryPipelineAtlasViewModel,
  createEnvironmentSecretResolution,
  createPipelineGateMatrix,
  createRunnerPoolCatalog,
  validateEnvironmentSecretResolution,
  type DeliveryPipelineAtlasViewModel,
  type EnvironmentSecretResolution,
} from "../../../../infra/ci/bootstrap/provision_ci_cd_runners_and_preview_accounts.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

async function readJson<T>(segments: string[]): Promise<T> {
  return JSON.parse(await readFile(path.join(repoRoot, ...segments), "utf8")) as T;
}

test("checked-in environment secret resolution and sample atlas match the builder", async () => {
  const persistedResolution = await readJson<EnvironmentSecretResolution>([
    "config",
    "ci",
    "environment_secret_resolution.json",
  ]);
  const sampleRun = await readJson<{
    deliveryPipelineAtlas: DeliveryPipelineAtlasViewModel;
  }>(["automation", "provisioning", "report_viewer", "data", "sample_run.json"]);

  expect(persistedResolution).toEqual(createEnvironmentSecretResolution());
  expect(sampleRun.deliveryPipelineAtlas).toEqual(createDeliveryPipelineAtlasViewModel());
});

test("every workflow family has an explicit runner, identity, and gate posture", () => {
  const catalog = createRunnerPoolCatalog();
  const resolution = createEnvironmentSecretResolution();
  const gateMatrix = createPipelineGateMatrix();

  validateEnvironmentSecretResolution(resolution, catalog, gateMatrix);

  const runnerCoverage = new Set(
    catalog.runner_pool_rows.flatMap((row) => row.workflow_family_refs),
  );
  const identityCoverage = new Set(
    resolution.secret_resolution_rows.map((row) => row.workflow_family_ref),
  );
  const gateCoverage = new Set(gateMatrix.gate_rows.map((row) => row.workflow_family_ref));

  for (const workflowFamilyRef of WORKFLOW_FAMILY_REFS) {
    expect(runnerCoverage.has(workflowFamilyRef)).toBe(true);
    expect(identityCoverage.has(workflowFamilyRef)).toBe(true);
    expect(gateCoverage.has(workflowFamilyRef)).toBe(true);
  }

  const productionWorkflow = resolution.secret_resolution_rows.find(
    (row) => row.workflow_family_ref === "WF_PRODUCTION_PROMOTE",
  );
  expect(productionWorkflow?.identity_mode).toBe("BROKERED_STATIC_EXCEPTION_ON_TOP_OF_OIDC");
  expect(productionWorkflow?.required_runner_pool_refs).toEqual([
    "runner.release-linux.controlled",
  ]);
});

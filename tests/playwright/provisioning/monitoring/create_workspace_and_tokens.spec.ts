import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { createRunContext } from "../../../../automation/provisioning/src/core/run_context.js";
import {
  createErrorMonitoringWorkspace,
  MONITORING_FLOW_ID,
  MONITORING_PROVIDER_ID,
  type CreateErrorMonitoringWorkspaceResult,
  type MonitoringWorkspaceEntryUrls,
  type MonitoringWorkspaceTemplate,
} from "../../../../automation/provisioning/src/providers/monitoring/flows/create_error_monitoring_workspace.js";

function fixtureEntryUrls(
  scenario: "fresh" | "existing" | "scrub-drift",
): MonitoringWorkspaceEntryUrls {
  return {
    controlPlane:
      `/automation/provisioning/tests/fixtures/sentry_monitoring_console.html?scenario=${scenario}`,
  };
}

function fixtureRunContext() {
  return createRunContext({
    runId: "run-fixture-monitoring-governance",
    providerId: MONITORING_PROVIDER_ID,
    flowId: MONITORING_FLOW_ID,
    productEnvironmentId: "env_local_provisioning_workstation",
    providerEnvironment: "fixture",
    executionMode: "fixture",
    operatorIdentityAlias: "ops.monitoring.fixture",
    workspaceId: "wk-local-monitoring-governance",
    evidenceRoot: "artifacts/runs/monitoring-governance-fixture",
  });
}

async function runFixtureFlow(
  page: Parameters<typeof createErrorMonitoringWorkspace>[0]["page"],
  scenario: "fresh" | "existing" | "scrub-drift",
) {
  const rootDir = await mkdtemp(
    path.join(os.tmpdir(), `taxat-monitoring-${scenario}-`),
  );
  const workspaceTemplatePath = path.join(rootDir, "monitoring_workspace.template.json");

  const result = await createErrorMonitoringWorkspace({
    page,
    runContext: fixtureRunContext(),
    workspaceTemplatePath,
    entryUrls: fixtureEntryUrls(scenario),
  });

  const [workspaceTemplateRaw, evidenceManifestRaw] = await Promise.all([
    readFile(workspaceTemplatePath, "utf8"),
    readFile(result.evidenceManifestPath, "utf8"),
  ]);

  return {
    result,
    workspaceTemplateRaw,
    evidenceManifestRaw,
    workspaceTemplate: JSON.parse(workspaceTemplateRaw) as MonitoringWorkspaceTemplate,
  };
}

function expectSuccessfulStatuses(result: CreateErrorMonitoringWorkspaceResult) {
  expect(result.steps.map((step) => step.status)).toEqual([
    "SUCCEEDED",
    "SUCCEEDED",
    "SUCCEEDED",
    "SUCCEEDED",
    "SUCCEEDED",
    "SUCCEEDED",
  ]);
}

test("fresh fixture bootstrap creates the monitoring governance topology without persisting raw secrets", async ({
  page,
}) => {
  const flow = await runFixtureFlow(page, "fresh");

  expect(flow.result.outcome).toBe("MONITORING_GOVERNANCE_READY");
  expectSuccessfulStatuses(flow.result);
  expect(flow.workspaceTemplate.workspace_rows).toHaveLength(4);
  expect(flow.workspaceTemplate.project_rows).toHaveLength(16);
  expect(flow.result.projectCatalog.project_rows).toHaveLength(16);
  expect(flow.result.scrubRules.scrub_rule_rows).toHaveLength(8);
  expect(flow.result.alertPolicy.alert_rules).toHaveLength(7);
  expect(flow.result.releaseMapping.release_tracks).toHaveLength(5);
  expect(flow.workspaceTemplateRaw).not.toContain("sntrys_");
  expect(flow.workspaceTemplateRaw).not.toContain("sntryu_");
  expect(flow.workspaceTemplateRaw).not.toContain("sentry_key=");
  expect(flow.workspaceTemplateRaw).not.toContain("-----BEGIN");
  expect(flow.evidenceManifestRaw).toContain(
    "Persisted sanitized monitoring workspace data without raw DSNs, auth tokens, or vendor secrets.",
  );
});

test("existing fixture bootstrap adopts the current monitoring topology instead of duplicating it", async ({
  page,
}) => {
  const flow = await runFixtureFlow(page, "existing");

  expect(flow.result.outcome).toBe("MONITORING_GOVERNANCE_READY");
  expect(flow.result.steps.map((step) => step.status)).toEqual([
    "SUCCEEDED",
    "SKIPPED_AS_ALREADY_PRESENT",
    "SKIPPED_AS_ALREADY_PRESENT",
    "SUCCEEDED",
    "SUCCEEDED",
    "SUCCEEDED",
  ]);
});

test("scrub posture drift blocks policy acceptance instead of being silently accepted", async ({
  page,
}) => {
  const flow = await runFixtureFlow(page, "scrub-drift");

  expect(flow.result.outcome).toBe("MONITORING_POLICY_REVIEW_REQUIRED");
  expect(flow.result.steps[3]?.status).toBe("BLOCKED_BY_POLICY");
  expect(flow.result.steps[5]?.status).toBe("SUCCEEDED");
  expect(flow.result.notes).toEqual(
    expect.arrayContaining([
      expect.stringContaining("Scrub and capture posture drift"),
    ]),
  );
  expect(flow.evidenceManifestRaw).toContain(
    "Scrub-policy drift was surfaced explicitly and blocked instead of being silently accepted.",
  );
});

test("live-provider execution remains blocked unless the run context explicitly opts in", async ({
  page,
}) => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "taxat-monitoring-live-gate-"));

  await expect(
    createErrorMonitoringWorkspace({
      page,
      runContext: createRunContext({
        providerId: MONITORING_PROVIDER_ID,
        flowId: MONITORING_FLOW_ID,
        productEnvironmentId: "env_shared_sandbox_integration",
        providerEnvironment: "sandbox",
        executionMode: "sandbox",
        operatorIdentityAlias: "ops.monitoring.live",
        workspaceId: "wk-live-monitoring-topology",
        evidenceRoot: "artifacts/runs/monitoring-topology-live",
      }),
      workspaceTemplatePath: path.join(rootDir, "monitoring_workspace.template.json"),
    }),
  ).rejects.toThrow(/live provider execution is not enabled/i);
});

test("signal governance board renders governed lanes and safe refs only", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(
    "/automation/provisioning/report_viewer/index.html?fixture=./data/sample_run.json&page=signal-governance-board",
  );

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(
    page.getByRole("navigation", { name: "Monitoring projects" }),
  ).toBeVisible();
  await expect(page.locator("#main-title")).toHaveText("Sandbox Backend runtime");
  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Scrubbing", exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Inbound Filters", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Alerts & Release Mapping", exact: true }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: /^Production Client portal web\b/i })
    .click();
  await expect(page.locator("#drawer-title")).toHaveText("Production Client portal web");
  await expect(
    page.getByText("vault://monitoring/sentry/production/client-portal-web/dsn"),
  ).toBeVisible();
  await expect(page.getByText("sntrys_")).toHaveCount(0);
  await expect(page.getByText("sntryu_")).toHaveCount(0);
});

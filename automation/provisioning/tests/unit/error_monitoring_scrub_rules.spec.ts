import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import { createRunContext } from "../../src/core/run_context.js";
import {
  createRecommendedErrorMonitoringAlertPolicy,
  createRecommendedErrorMonitoringProjectCatalog,
  createRecommendedErrorMonitoringReleaseMapping,
  createRecommendedErrorMonitoringScrubRules,
  createRecommendedMonitoringWorkspaceTemplate,
  createSignalGovernanceBoardViewModel,
  MONITORING_FLOW_ID,
  MONITORING_PROVIDER_ID,
  validateErrorMonitoringAlertPolicy,
  validateErrorMonitoringProjectCatalog,
  validateErrorMonitoringReleaseMapping,
  validateErrorMonitoringScrubRules,
  validateMonitoringWorkspaceTemplate,
  type ErrorMonitoringAlertPolicy,
  type ErrorMonitoringProjectCatalog,
  type ErrorMonitoringReleaseMapping,
  type ErrorMonitoringScrubRules,
  type MonitoringWorkspaceTemplate,
  type SignalGovernanceBoardViewModel,
} from "../../src/providers/monitoring/flows/create_error_monitoring_workspace.js";

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

function monitoringRunContext() {
  return createRunContext({
    runId: "monitoring-workspace-2026-04-18",
    providerId: MONITORING_PROVIDER_ID,
    flowId: MONITORING_FLOW_ID,
    productEnvironmentId: "env_shared_sandbox_integration",
    providerEnvironment: "fixture",
    executionMode: "fixture",
    operatorIdentityAlias: "ops.monitoring.control",
    workspaceId: "wk-monitoring-control-plane",
    evidenceRoot: "artifacts/runs/monitoring-control-plane",
  });
}

test("checked-in monitoring artifacts and signal board match the builders", async () => {
  const persistedCatalog = await readJson<ErrorMonitoringProjectCatalog>([
    "config",
    "observability",
    "error_monitoring_project_catalog.json",
  ]);
  const persistedScrubRules = await readJson<ErrorMonitoringScrubRules>([
    "config",
    "observability",
    "error_monitoring_scrub_rules.json",
  ]);
  const persistedAlertPolicy = await readJson<ErrorMonitoringAlertPolicy>([
    "config",
    "observability",
    "error_monitoring_alert_policy.json",
  ]);
  const persistedReleaseMapping = await readJson<ErrorMonitoringReleaseMapping>([
    "config",
    "observability",
    "error_monitoring_release_mapping.json",
  ]);
  const persistedTemplate = await readJson<MonitoringWorkspaceTemplate>([
    "data",
    "provisioning",
    "error_monitoring_workspace.template.json",
  ]);
  const sampleRun = await readJson<{
    signalGovernanceBoard: SignalGovernanceBoardViewModel;
  }>([
    "automation",
    "provisioning",
    "report_viewer",
    "data",
    "sample_run.json",
  ]);

  expect(persistedCatalog).toEqual(createRecommendedErrorMonitoringProjectCatalog());
  expect(persistedScrubRules).toEqual(createRecommendedErrorMonitoringScrubRules());
  expect(persistedAlertPolicy).toEqual(createRecommendedErrorMonitoringAlertPolicy());
  expect(persistedReleaseMapping).toEqual(createRecommendedErrorMonitoringReleaseMapping());
  expect(persistedTemplate).toEqual(
    createRecommendedMonitoringWorkspaceTemplate(monitoringRunContext()),
  );
  expect(sampleRun.signalGovernanceBoard).toEqual(
    createSignalGovernanceBoardViewModel(),
  );
});

test("monitoring scrub posture keeps high-risk payload classes excluded and capture modes disabled", () => {
  const catalog = createRecommendedErrorMonitoringProjectCatalog();
  const scrubRules = createRecommendedErrorMonitoringScrubRules();
  const alertPolicy = createRecommendedErrorMonitoringAlertPolicy();
  const releaseMapping = createRecommendedErrorMonitoringReleaseMapping();
  const template = createRecommendedMonitoringWorkspaceTemplate(monitoringRunContext());

  validateErrorMonitoringProjectCatalog(catalog);
  validateErrorMonitoringScrubRules(scrubRules);
  validateErrorMonitoringAlertPolicy(alertPolicy);
  validateErrorMonitoringReleaseMapping(releaseMapping);
  validateMonitoringWorkspaceTemplate(template);

  expect(catalog.project_rows).toHaveLength(16);
  expect(template.project_rows).toHaveLength(16);
  const protectedClasses = new Set(
    scrubRules.scrub_rule_rows.flatMap((row) => row.protected_classes),
  );
  [
    "RAW_SECRETS",
    "FULL_TOKENS",
    "AUTHORITY_CREDENTIALS",
    "CUSTOMER_PERSONAL_IDENTIFIERS",
    "GOVERNMENT_TAX_IDENTIFIERS",
    "DECLARATION_TEXT",
    "EVIDENCE_TEXT",
    "MASKED_OR_MINIMIZED_FIELDS",
  ].forEach((protectedClass) => {
    expect(protectedClasses.has(protectedClass)).toBe(true);
  });
  expect(scrubRules.disabled_capture_modes.map((row) => row.capture_mode)).toEqual(
    expect.arrayContaining([
      "SESSION_REPLAY",
      "ATTACHMENTS",
      "DOM_CAPTURE",
      "RAW_REQUEST_BODY_CAPTURE",
      "PROFILE_PAYLOAD_COLLECTION",
    ]),
  );
  expect(
    catalog.project_rows.every(
      (row) => !row.capture_modes.session_replay && !row.capture_modes.attachments,
    ),
  ).toBe(true);
});

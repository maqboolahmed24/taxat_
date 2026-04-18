import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  createRecommendedTelemetryVsAuditBoundary,
  validateTelemetryVsAuditBoundary,
  type TelemetryVsAuditBoundary,
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

test("checked-in telemetry boundary matches the builder", async () => {
  const persistedBoundary = await readJson<TelemetryVsAuditBoundary>([
    "config",
    "observability",
    "telemetry_vs_audit_boundary.json",
  ]);

  expect(persistedBoundary).toEqual(createRecommendedTelemetryVsAuditBoundary());
});

test("telemetry boundary keeps audit truth first-party only and preserves mandatory correlation keys", () => {
  const boundary = createRecommendedTelemetryVsAuditBoundary();

  validateTelemetryVsAuditBoundary(boundary);

  const vendorVisible = new Set(
    boundary.vendor_visible_families.map((row) => row.family_ref),
  );
  const firstPartyOnly = new Set(
    boundary.first_party_only_families.map((row) => row.family_ref),
  );

  expect(vendorVisible.has("AUDIT_EVENTS")).toBe(false);
  expect(vendorVisible.has("PRIVACY_ACTION_LEDGER")).toBe(false);
  [
    "AUDIT_EVENTS",
    "PRIVACY_ACTION_LEDGER",
    "AUTHORITY_PROTOCOL_RECORDS",
    "FAILURE_LIFECYCLE_DASHBOARD",
    "RELEASE_PROMOTION_EVIDENCE",
  ].forEach((family) => {
    expect(firstPartyOnly.has(family)).toBe(true);
  });
  for (const family of firstPartyOnly) {
    expect(vendorVisible.has(family)).toBe(false);
  }
  expect(boundary.mandatory_correlation_keys).toEqual(
    expect.arrayContaining([
      "tenant_id",
      "manifest_id",
      "trace_id",
      "service_name",
      "environment_ref",
    ]),
  );
});

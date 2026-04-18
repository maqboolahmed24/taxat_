import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  createCorrelationKeyPolicy,
  createObservabilityInventoryTemplate,
  createTelemetrySignalAtlasViewModel,
  validateCorrelationKeyPolicy,
  type CorrelationKeyPolicy,
  type ObservabilityInventoryTemplate,
  type TelemetrySignalAtlasViewModel,
} from "../../../../infra/observability/bootstrap/provision_otel_collection_and_backends.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
);

async function readJson<T>(segments: string[]): Promise<T> {
  return JSON.parse(await readFile(path.join(repoRoot, ...segments), "utf8")) as T;
}

test("checked-in correlation policy, inventory, and atlas payload match the builder", async () => {
  const persistedPolicy = await readJson<CorrelationKeyPolicy>([
    "config",
    "observability",
    "correlation_key_policy.json",
  ]);
  const persistedInventory = await readJson<ObservabilityInventoryTemplate>([
    "data",
    "provisioning",
    "observability_inventory.template.json",
  ]);
  const sampleRun = await readJson<{
    telemetrySignalAtlas: TelemetrySignalAtlasViewModel;
  }>([
    "automation",
    "provisioning",
    "report_viewer",
    "data",
    "sample_run.json",
  ]);

  expect(persistedPolicy).toEqual(createCorrelationKeyPolicy());
  expect(persistedInventory).toEqual(createObservabilityInventoryTemplate());
  expect(sampleRun.telemetrySignalAtlas).toEqual(
    createTelemetrySignalAtlasViewModel(),
  );
});

test("correlation policy keeps shared resource identity and durable join anchors for every signal family", () => {
  const policy = createCorrelationKeyPolicy();
  validateCorrelationKeyPolicy(policy);

  expect(policy.signal_rows).toHaveLength(6);
  expect(policy.resource_attribute_policy.required_attributes).toEqual(
    expect.arrayContaining([
      "service.name",
      "service.namespace",
      "deployment.environment.name",
      "taxat.release.candidate_hash",
      "taxat.build.artifact_digest",
      "taxat.schema.bundle_hash",
      "taxat.workspace.id",
    ]),
  );

  const traceRow = policy.signal_rows.find(
    (row) => row.signal_family_ref === "TRACES",
  );
  expect(traceRow?.mandatory_keys).toEqual(
    expect.arrayContaining([
      "trace_id",
      "manifest_id",
      "root_manifest_id",
      "authority_operation_id",
      "submission_record_id",
      "request_hash",
      "access_binding_hash",
      "code_build_id",
    ]),
  );

  const securityRow = policy.signal_rows.find(
    (row) => row.signal_family_ref === "SECURITY",
  );
  expect(securityRow?.mandatory_keys).toEqual(
    expect.arrayContaining([
      "authority_binding_ref",
      "accepted_risk_approval_id",
      "access_binding_hash",
    ]),
  );
  expect(securityRow?.audit_join_anchor_types).toEqual(
    expect.arrayContaining([
      "approval audit evidence",
      "AuthorityBindingMismatchDetected",
    ]),
  );

  const auditLinkRow = policy.signal_rows.find(
    (row) => row.signal_family_ref === "AUDIT_LINKS",
  );
  expect(auditLinkRow?.mandatory_keys).toEqual(
    expect.arrayContaining([
      "trace_id",
      "manifest_id",
      "submission_record_id",
      "authority_operation_id",
      "taxat.release.candidate_hash",
      "taxat.schema.bundle_hash",
    ]),
  );
});

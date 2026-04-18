import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  createLogScrubAndFieldAllowlist,
  createOtlpExportMatrix,
  createSamplingAndRetentionPolicy,
  createSignalBackendCatalog,
  validateLogScrubAndFieldAllowlist,
  validateOtlpExportMatrix,
  validateSamplingAndRetentionPolicy,
  validateSignalBackendCatalog,
  type LogScrubAndFieldAllowlist,
  type OtlpExportMatrix,
  type SamplingAndRetentionPolicy,
  type SignalBackendCatalog,
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

test("checked-in signal, export, sampling, and scrub artifacts match the builder", async () => {
  const persistedCatalog = await readJson<SignalBackendCatalog>([
    "config",
    "observability",
    "signal_backend_catalog.json",
  ]);
  const persistedExportMatrix = await readJson<OtlpExportMatrix>([
    "config",
    "observability",
    "otlp_export_matrix.json",
  ]);
  const persistedSamplingPolicy = await readJson<SamplingAndRetentionPolicy>([
    "config",
    "observability",
    "sampling_and_retention_policy.json",
  ]);
  const persistedLogPolicy = await readJson<LogScrubAndFieldAllowlist>([
    "config",
    "observability",
    "log_scrub_and_field_allowlist.json",
  ]);

  expect(persistedCatalog).toEqual(createSignalBackendCatalog());
  expect(persistedExportMatrix).toEqual(createOtlpExportMatrix());
  expect(persistedSamplingPolicy).toEqual(createSamplingAndRetentionPolicy());
  expect(persistedLogPolicy).toEqual(createLogScrubAndFieldAllowlist());
});

test("every signal family stays bound to a backend, retention class, and scrub posture while forbidden fields remain structurally blocked", () => {
  const catalog = createSignalBackendCatalog();
  const exportMatrix = createOtlpExportMatrix();
  const samplingPolicy = createSamplingAndRetentionPolicy();
  const logPolicy = createLogScrubAndFieldAllowlist();

  validateSignalBackendCatalog(catalog);
  validateOtlpExportMatrix(exportMatrix);
  validateSamplingAndRetentionPolicy(samplingPolicy);
  validateLogScrubAndFieldAllowlist(logPolicy);

  const backendRefs = new Set(catalog.backend_rows.map((row) => row.backend_ref));
  const retentionRefs = new Set(
    samplingPolicy.retention_class_rows.map((row) => row.retention_class_ref),
  );
  const samplingRefs = new Set(
    samplingPolicy.policy_rows.map((row) => row.sampling_policy_ref),
  );

  expect(catalog.signal_rows).toHaveLength(6);
  catalog.signal_rows.forEach((row) => {
    expect(backendRefs.has(row.primary_backend_ref)).toBe(true);
    expect(retentionRefs.has(row.retention_class_ref)).toBe(true);
    expect(samplingRefs.has(row.sampling_policy_ref)).toBe(true);
  });

  const traceRow = catalog.signal_rows.find((row) => row.signal_family_ref === "TRACES");
  expect(traceRow?.secondary_backend_refs).toEqual(
    expect.arrayContaining(["backend.vendor_monitoring_overlay"]),
  );
  expect(
    catalog.signal_rows
      .filter((row) => row.signal_family_ref !== "TRACES")
      .every((row) => row.vendor_exportability === "FIRST_PARTY_ONLY"),
  ).toBe(true);

  expect(
    samplingPolicy.policy_rows.every((row) =>
      ["default", "elevated_debug", "incident", "privacy_constrained"].every(
        (posture) =>
          row.posture_variants.some((variant) => variant.posture_ref === posture),
      ),
    ),
  ).toBe(true);
  expect(
    samplingPolicy.policy_rows.every((row) =>
      row.posture_variants
        .filter((variant) => variant.posture_ref !== "default")
        .every(
          (variant) =>
            variant.max_window_minutes_or_null === null ||
            variant.max_window_minutes_or_null <= 240,
        ),
    ),
  ).toBe(true);

  const tracePipeline = exportMatrix.pipeline_rows.find(
    (row) => row.pipeline_ref === "pipeline.gateway.priority_traces",
  );
  expect(tracePipeline?.processors).toEqual(
    expect.arrayContaining(["tail_sampling", "filter/vendor_export_allowlist"]),
  );

  expect(logPolicy.global_forbidden_field_classes).toEqual(
    expect.arrayContaining([
      "RAW_SECRETS",
      "AUTHORITY_PAYLOADS",
      "ONE_TIME_CODES",
      "DOCUMENT_BODY_TEXT",
      "SCREENSHOT_BYTES",
      "RAW_PERSONAL_IDENTIFIERS",
    ]),
  );
  expect(
    logPolicy.family_rows.every((row) =>
      logPolicy.global_hash_only_fields.every((field) =>
        row.hash_only_fields.includes(field),
      ),
    ),
  ).toBe(true);
});

import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  buildDefaultMigrationReadinessContext,
  buildReleaseCandidateIdentityContract,
  compareSchemaBundles,
  createSyntheticSchemaArtifactSnapshot,
  createSyntheticSchemaBundleMaterialization,
  evaluateMigrationReadiness,
  loadSchemaDriftPolicy,
  stableHash,
} from "../../../packages/contracts-tools/src/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const generateScript = path.join(
  repoRoot,
  "scripts/contracts/generate_migration_readiness_report.ts",
);
const checkScript = path.join(repoRoot, "scripts/contracts/check_schema_drift.ts");
const reportPath = path.join(repoRoot, "data/contracts/schema_drift_report.json");
const gatePath = path.join(
  repoRoot,
  "data/contracts/schema_bundle_compatibility_gate.materialized.json",
);
const atlasPath = path.join(
  repoRoot,
  "apps/operator-web/public/internal/schema-compatibility-atlas/data/schema-compatibility-atlas.json",
);

test.describe.configure({ mode: "serial" });
test.setTimeout(180_000);

function createReleaseSchema() {
  return createSyntheticSchemaArtifactSnapshot({
    schemaName: "release_candidate_identity_contract.schema.json",
    schemaId: "https://taxat.dev/schemas/release_candidate_identity_contract.schema.json",
    document: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://taxat.dev/schemas/release_candidate_identity_contract.schema.json",
      type: "object",
      properties: {
        candidate_environment_ref: {
          type: "string",
        },
        build_artifact_ref: {
          type: "string",
        },
      },
      required: ["candidate_environment_ref", "build_artifact_ref"],
      additionalProperties: false,
    },
  });
}

test("destructive drift stays blocked while the reader window remains open", async () => {
  const policy = await loadSchemaDriftPolicy();
  const context = await buildDefaultMigrationReadinessContext();
  const baselineSchema = createReleaseSchema();
  const candidateSchema = createSyntheticSchemaArtifactSnapshot({
    ...baselineSchema,
    document: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://taxat.dev/schemas/release_candidate_identity_contract.schema.json",
      type: "object",
      properties: {
        candidate_environment_ref: {
          type: "string",
        },
      },
      required: ["candidate_environment_ref"],
      additionalProperties: false,
    },
  });

  const baselineBundle = createSyntheticSchemaBundleMaterialization({
    bundleRef: "baseline.reader-window",
    bundleRole: "BASELINE",
    schemas: [baselineSchema],
  });
  const candidateBundle = createSyntheticSchemaBundleMaterialization({
    bundleRef: "candidate.reader-window",
    bundleRole: "CANDIDATE",
    schemas: [candidateSchema],
  });
  const diffResult = compareSchemaBundles({
    baselineBundle,
    candidateBundle,
    policy,
  });
  const candidateIdentity = await buildReleaseCandidateIdentityContract({
    configBundleHash: stableHash("reader-window-open"),
    migrationPlanRefOrNull: context.currentCatalogEntry.migrationId,
    schemaBundleHash: candidateBundle.schemaBundleHash,
  });

  const evaluation = evaluateMigrationReadiness({
    candidateIdentity,
    context,
    diffResult,
    policy,
  });

  expect(evaluation.verdictRef).toBe("BLOCKED_PENDING_READER_WINDOW");
  expect(evaluation.admissibilityState).toBe("BLOCKED");
  expect(evaluation.reasonCodes).toContain("READER_WINDOW_STILL_OPEN");
});

test("backfill-required drift stays blocked until resumable backfill evidence exists", async () => {
  const policy = await loadSchemaDriftPolicy();
  const context = await buildDefaultMigrationReadinessContext();
  const baselineSchema = createReleaseSchema();
  const candidateSchema = createSyntheticSchemaArtifactSnapshot({
    ...baselineSchema,
    document: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://taxat.dev/schemas/release_candidate_identity_contract.schema.json",
      type: "object",
      properties: {
        candidate_environment_ref: {
          type: "string",
        },
        build_artifact_ref: {
          type: "integer",
        },
      },
      required: ["candidate_environment_ref", "build_artifact_ref"],
      additionalProperties: false,
    },
  });

  const baselineBundle = createSyntheticSchemaBundleMaterialization({
    bundleRef: "baseline.backfill",
    bundleRole: "BASELINE",
    schemas: [baselineSchema],
  });
  const candidateBundle = createSyntheticSchemaBundleMaterialization({
    bundleRef: "candidate.backfill",
    bundleRole: "CANDIDATE",
    schemas: [candidateSchema],
  });
  const diffResult = compareSchemaBundles({
    baselineBundle,
    candidateBundle,
    policy,
  });
  const candidateIdentity = await buildReleaseCandidateIdentityContract({
    configBundleHash: stableHash("backfill-required"),
    migrationPlanRefOrNull: context.currentCatalogEntry.migrationId,
    schemaBundleHash: candidateBundle.schemaBundleHash,
  });

  const evaluation = evaluateMigrationReadiness({
    candidateIdentity,
    context,
    diffResult,
    policy,
  });

  expect(evaluation.verdictRef).toBe("BLOCKED_PENDING_BACKFILL");
  expect(evaluation.reasonCodes).toContain("BACKFILL_EXECUTION_CONTRACT_INCOMPLETE");
});

test("generated report, atlas payload, and materialized compatibility gate stay deterministic", async () => {
  await execFileAsync("node", ["--experimental-strip-types", generateScript, "--emit"], {
    cwd: repoRoot,
    maxBuffer: 32 * 1024 * 1024,
  });

  const [reportBefore, gateBefore, atlasBefore] = await Promise.all([
    readFile(reportPath, "utf8"),
    readFile(gatePath, "utf8"),
    readFile(atlasPath, "utf8"),
  ]);

  const check = await execFileAsync("node", ["--experimental-strip-types", generateScript, "--check"], {
    cwd: repoRoot,
    maxBuffer: 32 * 1024 * 1024,
  });
  expect(check.stdout).toContain("verified schema drift artifacts");

  const driftCheck = await execFileAsync(
    "node",
    ["--experimental-strip-types", checkScript],
    {
      cwd: repoRoot,
      maxBuffer: 32 * 1024 * 1024,
    },
  );
  expect(driftCheck.stdout).toContain("schema drift verdict: ROLLBACK_SAFE");

  const validator = await execFileAsync(
    path.join(repoRoot, ".venv/bin/python3"),
    [
      "-c",
      `
import importlib.util
import json
import pathlib
import sys

repo_root = pathlib.Path(sys.argv[1])
validator_path = repo_root / "packages/contracts-core/python/validate_contracts.py"
spec = importlib.util.spec_from_file_location("validate_contracts", validator_path)
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)
payload = json.loads((repo_root / "data/contracts/schema_bundle_compatibility_gate.materialized.json").read_text())
issues = module.validate_schema_bundle_compatibility_gate_contract_payload(payload, "generated_gate")
if issues:
    raise SystemExit("\\n".join(getattr(issue, "message", str(issue)) for issue in issues))
print("gate-valid")
      `.trim(),
      repoRoot,
    ],
    {
      cwd: repoRoot,
      maxBuffer: 32 * 1024 * 1024,
    },
  );
  expect(validator.stdout).toContain("gate-valid");

  const [reportAfter, gateAfter, atlasAfter] = await Promise.all([
    readFile(reportPath, "utf8"),
    readFile(gatePath, "utf8"),
    readFile(atlasPath, "utf8"),
  ]);

  expect(reportAfter).toBe(reportBefore);
  expect(gateAfter).toBe(gateBefore);
  expect(atlasAfter).toBe(atlasBefore);
});

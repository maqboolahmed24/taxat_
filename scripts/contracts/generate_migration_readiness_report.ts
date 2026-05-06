import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { emitOrCheckMigrationReadinessArtifacts } from "../../packages/contracts-tools/src/index.ts";

export async function main() {
  const args = new Set(process.argv.slice(2));
  const mode = args.has("--emit") ? "emit" : "check";
  const artifacts = await emitOrCheckMigrationReadinessArtifacts(mode);

  console.log(
    `${mode === "emit" ? "wrote" : "verified"} schema drift artifacts: ${artifacts.report.readiness_verdict.verdict_ref}`,
  );
  console.log(`report: data/contracts/schema_drift_report.json`);
  console.log(`atlas: apps/operator-web/public/internal/schema-compatibility-atlas/data/schema-compatibility-atlas.json`);
  if (artifacts.compatibilityGateMaterialization.state === "MATERIALIZED") {
    console.log(`gate: data/contracts/schema_bundle_compatibility_gate.materialized.json`);
  } else {
    console.log(
      `gate blocked by: ${artifacts.compatibilityGateMaterialization.reasonCodes.join(", ") || "none"}`,
    );
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

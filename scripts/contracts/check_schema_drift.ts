import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { buildMigrationReadinessArtifacts } from "../../packages/contracts-tools/src/index.ts";

export async function main() {
  const artifacts = await buildMigrationReadinessArtifacts();
  const { evaluation, report } = artifacts;

  console.log(`schema drift verdict: ${evaluation.verdictRef}`);
  console.log(`candidate bundle: ${report.candidate_bundle.schema_bundle_hash}`);
  console.log(`baseline bundle: ${report.baseline_bundle.schema_bundle_hash}`);
  console.log(`delta count: ${report.drift_summary.total_delta_count}`);

  if (evaluation.reasonCodes.length > 0) {
    console.log(`reason codes: ${evaluation.reasonCodes.join(", ")}`);
  }

  if (evaluation.admissibilityState !== "ADMISSIBLE") {
    throw new Error(
      `schema drift blocks promotion: ${evaluation.verdictRef} (${evaluation.reasonCodes.join(", ") || "no reason code"})`,
    );
  }

  console.log(`compatibility gate posture: ${artifacts.compatibilityGateMaterialization.state}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

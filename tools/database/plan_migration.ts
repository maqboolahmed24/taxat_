import { writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  createSimulationState,
  createMigrationPlan,
  createPlannedLedgerRecord,
  loadMigrationPolicyBundle,
  loadSimulationState,
} from "../../packages/control-plane-db/src/index.ts";

function readFlag(name: string) {
  const prefix = `${name}=`;
  const matched = process.argv.slice(2).find((argument) => argument.startsWith(prefix));
  return matched ? matched.slice(prefix.length) : null;
}

function hasFlag(name: string) {
  return process.argv.slice(2).includes(name);
}

async function main() {
  const targetVersion = readFlag("--target-version");
  const candidateIdentityRefOrNull = readFlag("--candidate-identity-ref");
  const outPath = readFlag("--out");
  const stateFile = readFlag("--state-file");

  if (!targetVersion) {
    throw new Error("Missing required flag --target-version=<six-digit version>.");
  }

  const policyBundle = await loadMigrationPolicyBundle();
  const state = stateFile
    ? await loadSimulationState(stateFile, policyBundle)
    : createSimulationState(policyBundle);
  const record =
    state.ledgers.find((entry) => entry.target_version === targetVersion) ??
    createPlannedLedgerRecord(policyBundle);
  const plan = createMigrationPlan(policyBundle, record, candidateIdentityRefOrNull);
  const payload = `${JSON.stringify(plan, null, 2)}\n`;

  if (outPath) {
    await writeFile(outPath, payload, "utf8");
    console.log(`wrote plan: ${path.relative(process.cwd(), outPath)}`);
  } else {
    process.stdout.write(payload);
  }

  if (!hasFlag("--quiet")) {
    console.log(
      `planned migration ${plan.migrationId} for target version ${plan.targetVersion} under ${plan.advisoryLockPosture.lockFunction}`,
    );
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

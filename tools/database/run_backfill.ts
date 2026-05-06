import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createSimulationState,
  loadMigrationPolicyBundle,
  loadSimulationState,
  runBackfillInSimulationState,
  saveSimulationState,
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
  const action = readFlag("--action");
  const runId = readFlag("--run-id") ?? "backfill-run-local";
  const stateFile = readFlag("--state-file");

  if (!targetVersion) {
    throw new Error("Missing required flag --target-version=<six-digit version>.");
  }
  if (!action) {
    throw new Error("Missing required flag --action=<start|resume|complete|halt|fail>.");
  }

  const policyBundle = await loadMigrationPolicyBundle();
  const state = stateFile
    ? await loadSimulationState(stateFile, policyBundle)
    : createSimulationState(policyBundle);
  const result = runBackfillInSimulationState({
    action: action as Parameters<typeof runBackfillInSimulationState>[0]["action"],
    holdLock: hasFlag("--hold-lock"),
    policyBundle,
    runId,
    state,
    targetVersion,
  });

  if (stateFile) {
    await saveSimulationState(stateFile, state);
  }

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

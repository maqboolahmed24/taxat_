import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function nowIso() {
  return new Date().toISOString();
}

function parseArgs(argv) {
  const args = {
    root: "./artifacts/resume",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    args[key] = next;
    index += 1;
  }

  for (const required of ["run", "checkpoint", "by", "note"]) {
    if (!args[required]) {
      throw new Error(
        `Missing required argument --${required}. Expected: --run <run-id> --checkpoint <checkpoint-id> --by <alias> --note <text>`,
      );
    }
  }

  return args;
}

async function loadSnapshot(root, runId) {
  const latestPath = path.join(root, runId, "latest.json");
  const raw = await readFile(latestPath, "utf8");
  return {
    latestPath,
    snapshot: JSON.parse(raw),
  };
}

async function saveSnapshot(root, runId, snapshot) {
  const runDir = path.join(root, runId);
  const revisionsDir = path.join(runDir, "revisions");
  await mkdir(revisionsDir, { recursive: true });
  const payload = JSON.stringify(snapshot, null, 2);
  await writeFile(path.join(runDir, "latest.json"), payload);
  await writeFile(path.join(revisionsDir, `${snapshot.revision}.json`), payload);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { snapshot } = await loadSnapshot(args.root, args.run);

  if (!snapshot.checkpoint || snapshot.checkpoint.checkpointId !== args.checkpoint) {
    throw new Error(
      `Run ${args.run} does not have open checkpoint ${args.checkpoint}.`,
    );
  }
  if (snapshot.checkpoint.status !== "OPEN") {
    throw new Error(
      `Checkpoint ${args.checkpoint} has status ${snapshot.checkpoint.status} and cannot be resumed.`,
    );
  }

  const resumedAt = nowIso();
  const resumedCheckpoint = {
    ...snapshot.checkpoint,
    status: "RESUMED",
    resumeHistory: [
      ...(snapshot.checkpoint.resumeHistory ?? []),
      {
        resumedAt,
        resumedByAlias: args.by,
        note: args.note,
      },
    ],
  };

  const updatedSteps = snapshot.steps.map((step) => {
    if (step.stepId !== resumedCheckpoint.stepId) {
      return step;
    }
    return {
      ...step,
      status: "RUNNING",
      attempts: (step.attempts ?? 0) + 1,
      manualCheckpoint: null,
      history: [
        ...(step.history ?? []),
        {
          status: "RUNNING",
          changedAt: resumedAt,
          reason: `Resumed after manual checkpoint ${args.checkpoint}`,
        },
      ],
    };
  });

  const updatedSnapshot = {
    ...snapshot,
    revision: (snapshot.revision ?? 0) + 1,
    updatedAt: resumedAt,
    checkpoint: resumedCheckpoint,
    steps: updatedSteps,
    notes: [
      ...(snapshot.notes ?? []),
      `Resumed by ${args.by}: ${args.note}`,
    ],
  };

  await saveSnapshot(args.root, args.run, updatedSnapshot);

  process.stdout.write(
    `${updatedSnapshot.runContext.runId} resumed at revision ${updatedSnapshot.revision}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});

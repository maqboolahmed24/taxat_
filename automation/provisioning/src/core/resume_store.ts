import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { resumeManualCheckpoint } from "./manual_checkpoint.js";
import type { ManualCheckpointRecord } from "./manual_checkpoint.js";
import { clearManualCheckpoint, transitionStep } from "./step_contract.js";
import type { StepContract } from "./step_contract.js";
import type { RunContextSummary } from "./run_context.js";

export interface ResumeSnapshotInput {
  runContext: RunContextSummary;
  steps: StepContract[];
  checkpoint: ManualCheckpointRecord | null;
  notes?: string[];
  browserStorageStateRef?: string | null;
}

export interface ResumeSnapshot extends ResumeSnapshotInput {
  revision: number;
  updatedAt: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

export class FileResumeStore {
  constructor(private readonly rootDir: string) {}

  private runDir(runId: string): string {
    return path.join(this.rootDir, runId);
  }

  private latestPath(runId: string): string {
    return path.join(this.runDir(runId), "latest.json");
  }

  private revisionPath(runId: string, revision: number): string {
    return path.join(this.runDir(runId), "revisions", `${revision}.json`);
  }

  async saveSnapshot(input: ResumeSnapshotInput): Promise<ResumeSnapshot> {
    const runId = input.runContext.runId;
    const existing = await this.loadLatest(runId);
    const snapshot: ResumeSnapshot = {
      ...input,
      revision: (existing?.revision ?? 0) + 1,
      updatedAt: nowIso(),
      notes: input.notes ?? [],
      browserStorageStateRef: input.browserStorageStateRef ?? null,
    };

    await mkdir(path.join(this.runDir(runId), "revisions"), {
      recursive: true,
    });
    const payload = JSON.stringify(snapshot, null, 2);
    await writeFile(this.latestPath(runId), payload);
    await writeFile(this.revisionPath(runId, snapshot.revision), payload);
    return snapshot;
  }

  async loadLatest(runId: string): Promise<ResumeSnapshot | undefined> {
    try {
      const raw = await readFile(this.latestPath(runId), "utf8");
      return JSON.parse(raw) as ResumeSnapshot;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return undefined;
      }
      throw error;
    }
  }

  async listRuns(): Promise<ResumeSnapshot[]> {
    try {
      const directories = await readdir(this.rootDir, { withFileTypes: true });
      const snapshots = await Promise.all(
        directories
          .filter((entry) => entry.isDirectory())
          .map((entry) => this.loadLatest(entry.name)),
      );
      return snapshots
        .filter((snapshot): snapshot is ResumeSnapshot => Boolean(snapshot))
        .sort((left, right) =>
          left.updatedAt < right.updatedAt ? 1 : left.updatedAt > right.updatedAt ? -1 : 0,
        );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  async markCheckpointResumed(
    runId: string,
    checkpointId: string,
    resumedByAlias: string,
    note: string,
  ): Promise<ResumeSnapshot> {
    const snapshot = await this.loadLatest(runId);
    if (!snapshot) {
      throw new Error(`No resume snapshot found for run ${runId}`);
    }
    if (!snapshot.checkpoint || snapshot.checkpoint.checkpointId !== checkpointId) {
      throw new Error(
        `Run ${runId} does not have open checkpoint ${checkpointId}`,
      );
    }

    const resumedCheckpoint = resumeManualCheckpoint(
      snapshot.checkpoint,
      resumedByAlias,
      note,
    );
    const updatedSteps = snapshot.steps.map((step) => {
      if (step.stepId !== resumedCheckpoint.stepId) {
        return step;
      }
      return transitionStep(
        clearManualCheckpoint(step),
        "RUNNING",
        `Resumed after manual checkpoint ${checkpointId}`,
      );
    });

    return this.saveSnapshot({
      ...snapshot,
      steps: updatedSteps,
      checkpoint: resumedCheckpoint,
      notes: [...(snapshot.notes ?? []), `Resumed by ${resumedByAlias}: ${note}`],
    });
  }
}

import type { RunContext } from "./run_context.js";
import type { StepContract } from "./step_contract.js";
import type { RedactionNote } from "./redaction.js";

export type EvidenceKind =
  | "SCREENSHOT"
  | "DOM_SNAPSHOT"
  | "TRACE_REFERENCE"
  | "STRUCTURED_LOG"
  | "NOTE";

export type EvidenceCaptureMode = "STANDARD" | "REDACTED" | "SUPPRESSED";

export interface EvidenceRecordInput {
  evidenceId: string;
  stepId: string;
  kind: EvidenceKind;
  relativePath: string | null;
  captureMode: EvidenceCaptureMode;
  summary: string;
  locatorRefs?: string[];
  redactionNotes?: RedactionNote[];
}

export interface EvidenceRecord extends EvidenceRecordInput {
  recordedAt: string;
}

export interface EvidenceManifest {
  runId: string;
  providerId: string;
  productEnvironmentId: string;
  evidenceRoot: string;
  entries: EvidenceRecord[];
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createEvidenceManifest(context: RunContext): EvidenceManifest {
  return {
    runId: context.runId,
    providerId: context.providerId,
    productEnvironmentId: context.productEnvironmentId,
    evidenceRoot: context.evidenceRoot,
    entries: [],
  };
}

export function appendEvidenceRecord(
  manifest: EvidenceManifest,
  input: EvidenceRecordInput,
): EvidenceManifest {
  return {
    ...manifest,
    entries: [
      ...manifest.entries,
      {
        ...input,
        recordedAt: nowIso(),
      },
    ],
  };
}

export function summarizeEvidenceForStep(
  manifest: EvidenceManifest,
  step: StepContract,
): EvidenceRecord[] {
  return manifest.entries.filter((entry) => entry.stepId === step.stepId);
}

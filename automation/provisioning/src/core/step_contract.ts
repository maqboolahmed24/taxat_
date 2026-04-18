import type { ManualCheckpointRecord } from "./manual_checkpoint.js";

export const STEP_STATUSES = [
  "PENDING",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "MANUAL_CHECKPOINT_REQUIRED",
  "BLOCKED_BY_POLICY",
  "SKIPPED_AS_ALREADY_PRESENT",
] as const;

export type StepStatus = (typeof STEP_STATUSES)[number];
export type SensitiveCapturePolicy = "ALLOW" | "REDACT" | "SUPPRESS";

export interface StepTransition {
  status: StepStatus;
  changedAt: string;
  reason: string;
}

export interface StepContract {
  stepId: string;
  title: string;
  status: StepStatus;
  attempts: number;
  selectorRefs: string[];
  sensitiveCapturePolicy: SensitiveCapturePolicy;
  history: StepTransition[];
  manualCheckpoint: ManualCheckpointRecord | null;
  retryOfStepId: string | null;
  policyBlockReason: string | null;
}

export interface StepInput {
  stepId: string;
  title: string;
  selectorRefs?: string[];
  sensitiveCapturePolicy?: SensitiveCapturePolicy;
  retryOfStepId?: string | null;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createPendingStep(input: StepInput): StepContract {
  return {
    stepId: input.stepId,
    title: input.title,
    status: "PENDING",
    attempts: 0,
    selectorRefs: input.selectorRefs ?? [],
    sensitiveCapturePolicy: input.sensitiveCapturePolicy ?? "REDACT",
    history: [
      {
        status: "PENDING",
        changedAt: nowIso(),
        reason: "Step created",
      },
    ],
    manualCheckpoint: null,
    retryOfStepId: input.retryOfStepId ?? null,
    policyBlockReason: null,
  };
}

export function transitionStep(
  step: StepContract,
  status: StepStatus,
  reason: string,
): StepContract {
  const attempts =
    status === "RUNNING" ? step.attempts + 1 : step.attempts;
  return {
    ...step,
    status,
    attempts,
    history: [
      ...step.history,
      {
        status,
        changedAt: nowIso(),
        reason,
      },
    ],
    policyBlockReason:
      status === "BLOCKED_BY_POLICY" ? reason : step.policyBlockReason,
  };
}

export function attachManualCheckpoint(
  step: StepContract,
  checkpoint: ManualCheckpointRecord,
): StepContract {
  return {
    ...transitionStep(
      step,
      "MANUAL_CHECKPOINT_REQUIRED",
      `Manual checkpoint required: ${checkpoint.reason}`,
    ),
    manualCheckpoint: checkpoint,
  };
}

export function markSkippedAsAlreadyPresent(
  step: StepContract,
  reason: string,
): StepContract {
  return transitionStep(step, "SKIPPED_AS_ALREADY_PRESENT", reason);
}

export function clearManualCheckpoint(step: StepContract): StepContract {
  return {
    ...step,
    manualCheckpoint: null,
  };
}

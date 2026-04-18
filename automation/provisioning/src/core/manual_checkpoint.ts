export const MANUAL_CHECKPOINT_REASONS = [
  "EMAIL_VERIFICATION",
  "CAPTCHA",
  "MFA",
  "HUMAN_REVIEW",
  "LEGAL_APPROVAL",
  "POLICY_CONFIRMATION",
] as const;

export type ManualCheckpointReason =
  (typeof MANUAL_CHECKPOINT_REASONS)[number];

export type ManualCheckpointStatus = "OPEN" | "RESUMED" | "CANCELLED";
export type ReentryPolicy =
  | "VERIFY_CURRENT_STATE_THEN_CONTINUE"
  | "ADOPT_EXISTING_RESOURCE_THEN_CONTINUE"
  | "STOP_AND_ESCALATE";

export interface ResumeEvent {
  resumedAt: string;
  resumedByAlias: string;
  note: string;
}

export interface ManualCheckpointRecord {
  checkpointId: string;
  stepId: string;
  reason: ManualCheckpointReason;
  prompt: string;
  openedAt: string;
  status: ManualCheckpointStatus;
  expectedSignals: string[];
  reentryPolicy: ReentryPolicy;
  capturePolicy: "REDACT" | "SUPPRESS";
  resumeHistory: ResumeEvent[];
}

export interface ManualCheckpointInput {
  checkpointId: string;
  stepId: string;
  reason: ManualCheckpointReason;
  prompt: string;
  expectedSignals: string[];
  reentryPolicy: ReentryPolicy;
  capturePolicy?: "REDACT" | "SUPPRESS";
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createManualCheckpoint(
  input: ManualCheckpointInput,
): ManualCheckpointRecord {
  return {
    checkpointId: input.checkpointId,
    stepId: input.stepId,
    reason: input.reason,
    prompt: input.prompt,
    openedAt: nowIso(),
    status: "OPEN",
    expectedSignals: [...input.expectedSignals],
    reentryPolicy: input.reentryPolicy,
    capturePolicy: input.capturePolicy ?? "SUPPRESS",
    resumeHistory: [],
  };
}

export function resumeManualCheckpoint(
  checkpoint: ManualCheckpointRecord,
  resumedByAlias: string,
  note: string,
): ManualCheckpointRecord {
  if (checkpoint.status !== "OPEN") {
    throw new Error(
      `Checkpoint ${checkpoint.checkpointId} is not open and cannot be resumed.`,
    );
  }
  return {
    ...checkpoint,
    status: "RESUMED",
    resumeHistory: [
      ...checkpoint.resumeHistory,
      {
        resumedAt: nowIso(),
        resumedByAlias,
        note,
      },
    ],
  };
}

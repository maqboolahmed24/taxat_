import type {
  CursorInvalidationReasonCode,
  ExperienceCursorRecord,
} from "../models/experience_cursor.ts";
import type { ExperienceCursorRepositoryLike } from "../repositories/experience_cursor_repository.ts";
import { invalidateResumeTokenOnBindingDrift } from "./invalidate_resume_token_on_binding_drift.ts";

export type MarkExperienceCursorResult = {
  cursor: ExperienceCursorRecord;
  problemKind: "ACCESS_REBIND_REQUIRED" | "REBASE_REQUIRED";
};

const accessRebindReasons = new Set<Exclude<CursorInvalidationReasonCode, null>>([
  "ACCESS_BINDING_CHANGED",
  "MASKING_POSTURE_CHANGED",
  "PRINCIPAL_CLASS_CHANGED",
  "SCHEMA_INCOMPATIBLE",
  "SESSION_BINDING_CHANGED",
  "SESSION_REVOKED",
  "TENANT_SWITCHED",
]);

export async function markExperienceCursorRebasedOrRevoked(input: {
  at: string;
  cursor: ExperienceCursorRecord;
  reasonCode: Exclude<CursorInvalidationReasonCode, null>;
  replacementSnapshotRef?: string | null;
  replacementStabilityContractOrNull?: Record<string, unknown> | null;
  repository: ExperienceCursorRepositoryLike;
}): Promise<MarkExperienceCursorResult> {
  const accessRebind = accessRebindReasons.has(input.reasonCode);
  const cursor = (await invalidateResumeTokenOnBindingDrift({
    at: input.at,
    cursor: input.cursor,
    latestSnapshotRef: input.replacementSnapshotRef ?? null,
    latestStabilityContractOrNull: input.replacementStabilityContractOrNull ?? null,
    reasonCode: input.reasonCode,
    repository: input.repository,
  })) as ExperienceCursorRecord;
  return {
    cursor,
    problemKind: accessRebind ? "ACCESS_REBIND_REQUIRED" : "REBASE_REQUIRED",
  };
}

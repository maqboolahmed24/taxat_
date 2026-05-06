import type {
  CursorInvalidationReasonCode,
  ExperienceCursorRecord,
  StreamCursorState,
} from "../models/experience_cursor.ts";
import type { ExperienceCursorRepositoryLike } from "../repositories/experience_cursor_repository.ts";
import type {
  WorkspaceCursorRecord,
  WorkspaceCursorRepositoryLike,
} from "../repositories/workspace_cursor_repository.ts";
import { issueReplacementResumeAnchor } from "./issue_replacement_resume_anchor.ts";

export type InvalidatedResumeTokenCursor = ExperienceCursorRecord | WorkspaceCursorRecord;

const accessRebindReasons = new Set<Exclude<CursorInvalidationReasonCode, null>>([
  "ACCESS_BINDING_CHANGED",
  "MASKING_POSTURE_CHANGED",
  "PRINCIPAL_CLASS_CHANGED",
  "SCHEMA_INCOMPATIBLE",
  "SESSION_BINDING_CHANGED",
  "SESSION_REVOKED",
  "TENANT_SWITCHED",
]);

function nextStateForReason(
  reasonCode: Exclude<CursorInvalidationReasonCode, null>,
): Exclude<StreamCursorState, "LIVE"> {
  return accessRebindReasons.has(reasonCode) ? "REVOKED" : "REBASED";
}

export async function invalidateResumeTokenOnBindingDrift(input: {
  at: string;
  cursor: InvalidatedResumeTokenCursor;
  latestSnapshotRef?: string | null;
  latestStabilityContractOrNull?: Record<string, unknown> | null;
  reasonCode: Exclude<CursorInvalidationReasonCode, null>;
  repository: ExperienceCursorRepositoryLike | WorkspaceCursorRepositoryLike;
}): Promise<InvalidatedResumeTokenCursor> {
  const nextState = nextStateForReason(input.reasonCode);
  const replacement =
    nextState === "REBASED" && input.latestSnapshotRef !== undefined && input.latestSnapshotRef !== null
      ? issueReplacementResumeAnchor({
          currentStabilityContract: input.cursor.stability_contract,
          latestSnapshotRef: input.latestSnapshotRef,
          latestStabilityContractOrNull: input.latestStabilityContractOrNull ?? null,
        })
      : null;
  return input.repository.transitionCursor(input.cursor.cursor_id, {
    at: input.at,
    nextState,
    reasonCode: input.reasonCode,
    replacementSnapshotRef: replacement?.replacementSnapshotRef ?? null,
    replacementStabilityContractOrNull:
      replacement?.replacementStabilityContractOrNull ?? null,
  }) as Promise<InvalidatedResumeTokenCursor> | InvalidatedResumeTokenCursor;
}

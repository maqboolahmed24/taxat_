import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  artifactRetentionFromTag,
  type ArtifactRetentionRecord,
} from "../models/artifact_retention.ts";
import {
  assertNonEmptyRetentionString,
  assertRetention,
  normalizeRetentionTag,
  type RetentionTagRecord,
} from "../models/retention_tag.ts";
import { assertRetentionTagArtifactAlignment } from "./propagate_limitation_and_expiry.ts";

export type LegalHoldReleasePreview = {
  release_preview_ref: string;
  eligible_after_release: boolean;
  action_posture: "RELEASE_PREVIEW_REQUIRED" | "ERASURE_STILL_BLOCKED_MINIMUM";
  candidate_artifact_retention_ref: string;
  retained_hold_ref: string;
};

export type LegalHoldRelease = {
  retention_tag: RetentionTagRecord;
  artifact_retention: ArtifactRetentionRecord;
  release_preview: LegalHoldReleasePreview;
};

export function releaseLegalHold(input: {
  artifact_retention: ArtifactRetentionRecord;
  changed_at: string;
  release_preview_ref: string;
  retention_tag: RetentionTagRecord;
}): LegalHoldRelease {
  assertRetentionTagArtifactAlignment(input);
  assertRetention(
    input.retention_tag.legal_hold_state === "ACTIVE" ||
      input.retention_tag.legal_hold_state === "RELEASE_ELIGIBLE",
    "RETENTION_HOLD_POSTURE_INVALID",
    "legal-hold release requires an active or release-eligible hold",
  );
  assertRetention(
    input.retention_tag.legal_hold_ref !== null,
    "RETENTION_HOLD_POSTURE_INVALID",
    "legal-hold release requires retained legal_hold_ref lineage",
  );
  const changedAt = normalizeUtcInstantString(input.changed_at);
  const eligibleAfterRelease =
    Date.parse(changedAt) >= Date.parse(input.retention_tag.effective_expiry_at);
  const tag = normalizeRetentionTag({
    ...input.retention_tag,
    legal_hold_state: "RELEASED",
    legal_hold_changed_at: changedAt,
    erasure_eligibility: eligibleAfterRelease ? "ELIGIBLE" : "BLOCKED_STATUTORY_MINIMUM",
    erasure_decided_at: changedAt,
    erasure_reason_codes: [
      eligibleAfterRelease ? "RETENTION_WINDOW_SATISFIED" : "STATUTORY_RETENTION_ACTIVE",
    ],
  });

  return {
    retention_tag: tag,
    artifact_retention: artifactRetentionFromTag({
      artifact_ref: input.artifact_retention.artifact_ref,
      last_evaluated_at: changedAt,
      lifecycle_state: "ACTIVE",
      retention_id: input.artifact_retention.retention_id,
      retention_tag: tag,
      state_changed_at: changedAt,
      tenant_id: input.artifact_retention.tenant_id,
    }),
    release_preview: {
      release_preview_ref: assertNonEmptyRetentionString(
        "release_preview_ref",
        input.release_preview_ref,
      ),
      eligible_after_release: eligibleAfterRelease,
      action_posture: eligibleAfterRelease
        ? "RELEASE_PREVIEW_REQUIRED"
        : "ERASURE_STILL_BLOCKED_MINIMUM",
      candidate_artifact_retention_ref: input.artifact_retention.retention_id,
      retained_hold_ref: input.retention_tag.legal_hold_ref,
    },
  };
}

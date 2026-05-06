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

export type LegalHoldApplication = {
  retention_tag: RetentionTagRecord;
  artifact_retention: ArtifactRetentionRecord;
};

export function applyLegalHold(input: {
  artifact_retention: ArtifactRetentionRecord;
  changed_at: string;
  hold_ref: string;
  next_checkpoint_at: string;
  retention_tag: RetentionTagRecord;
  workflow_item_refs: readonly string[];
}): LegalHoldApplication {
  assertRetentionTagArtifactAlignment(input);
  assertRetention(
    input.retention_tag.proof_preservation_basis_ref === null &&
      input.retention_tag.authority_ambiguity_ref === null,
    "RETENTION_BLOCKING_BASIS_INVALID",
    "legal-hold application must not overwrite proof-preservation or authority blockers",
  );
  const changedAt = normalizeUtcInstantString(input.changed_at);
  const holdRef = assertNonEmptyRetentionString("hold_ref", input.hold_ref);
  const tag = normalizeRetentionTag({
    ...input.retention_tag,
    legal_hold_state: "ACTIVE",
    legal_hold_ref: holdRef,
    legal_hold_changed_at: changedAt,
    erasure_eligibility: "BLOCKED_LEGAL_HOLD",
    erasure_decided_at: changedAt,
    erasure_reason_codes: ["LEGAL_HOLD_ACTIVE"],
  });

  return {
    retention_tag: tag,
    artifact_retention: artifactRetentionFromTag({
      artifact_ref: input.artifact_retention.artifact_ref,
      hold_ref: holdRef,
      last_evaluated_at: changedAt,
      lifecycle_state: "LEGAL_HOLD",
      next_checkpoint_at: input.next_checkpoint_at,
      retention_id: input.artifact_retention.retention_id,
      retention_tag: tag,
      state_changed_at: changedAt,
      tenant_id: input.artifact_retention.tenant_id,
      workflow_item_refs: input.workflow_item_refs,
    }),
  };
}

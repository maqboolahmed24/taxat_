import type { NorthboundActorContext } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import { hashTransportResumeToken } from "../../../domain-kernel/src/streaming/stream_recovery.ts";
import type {
  LowNoiseExperienceFrameRecord,
  StoredLowNoiseExperienceFrameRecord,
} from "../query/get_latest_low_noise_experience_frame.ts";
import {
  manifestResumeBindingFromActor,
  type ManifestResumeBinding,
} from "./issue_manifest_resume_token.ts";

export type ManifestResumeTokenFailureKind =
  | "ACCESS_REBIND_REQUIRED"
  | "REBASE_REQUIRED"
  | "RESUME_TOKEN_REQUIRED";

export class ManifestResumeTokenError extends Error {
  readonly kind: ManifestResumeTokenFailureKind;
  readonly reasonCodes: string[];

  constructor(kind: ManifestResumeTokenFailureKind, message: string, reasonCodes: string[]) {
    super(message);
    this.name = "ManifestResumeTokenError";
    this.kind = kind;
    this.reasonCodes = reasonCodes;
  }
}

export type ValidatedManifestResumeToken = {
  actorContext: NorthboundActorContext;
  binding: ManifestResumeBinding;
  frame: LowNoiseExperienceFrameRecord;
  frameRef: string;
  publicationGeneration: number;
  rawResumeToken: string;
  resumeTokenHash: string;
  storedFrame: StoredLowNoiseExperienceFrameRecord;
};

function fail(
  kind: ManifestResumeTokenFailureKind,
  message: string,
  reasonCodes: string[],
): never {
  throw new ManifestResumeTokenError(kind, message, reasonCodes);
}

function nonEmptyResumeToken(resumeToken: string | null | undefined) {
  if (resumeToken === undefined || resumeToken === null || resumeToken.length === 0) {
    fail("RESUME_TOKEN_REQUIRED", "manifest stream requires a resume token", [
      "MANIFEST_RESUME_TOKEN_REQUIRED",
    ]);
  }
  if (!resumeToken.startsWith("resume.manifest.")) {
    fail("ACCESS_REBIND_REQUIRED", "resume token is not scoped to manifest experience", [
      "MANIFEST_RESUME_TOKEN_SCOPE_INVALID",
    ]);
  }
  return resumeToken;
}

function assertEqual(
  actual: unknown,
  expected: unknown,
  kind: ManifestResumeTokenFailureKind,
  message: string,
  reasonCodes: string[],
) {
  if (actual !== expected) {
    fail(kind, message, reasonCodes);
  }
}

function assertPublicationStillCurrent(input: {
  binding: ManifestResumeBinding;
  frame: LowNoiseExperienceFrameRecord;
  manifestId: string;
  storedFrame: StoredLowNoiseExperienceFrameRecord;
}) {
  const streamRecovery = input.frame.stream_recovery_contract;
  assertEqual(input.frame.manifest_id, input.manifestId, "REBASE_REQUIRED", "manifest drifted", [
    "MANIFEST_STREAM_SUBJECT_DRIFT",
  ]);
  assertEqual(
    input.frame.shell_route_key,
    input.manifestId,
    "REBASE_REQUIRED",
    "shell route key drifted",
    ["MANIFEST_STREAM_ROUTE_DRIFT"],
  );
  assertEqual(
    streamRecovery.stream_scope_class,
    "MANIFEST_EXPERIENCE",
    "REBASE_REQUIRED",
    "stream scope drifted",
    ["MANIFEST_STREAM_SCOPE_DRIFT"],
  );
  assertEqual(
    streamRecovery.route_key,
    input.manifestId,
    "REBASE_REQUIRED",
    "stream route key drifted",
    ["MANIFEST_STREAM_ROUTE_DRIFT"],
  );
  assertEqual(
    streamRecovery.subject_ref,
    input.manifestId,
    "REBASE_REQUIRED",
    "stream subject drifted",
    ["MANIFEST_STREAM_SUBJECT_DRIFT"],
  );
  assertEqual(
    streamRecovery.shell_stability_token,
    input.storedFrame.shell_stability_token,
    "REBASE_REQUIRED",
    "shell stability token drifted",
    ["SHELL_STABILITY_CHANGED"],
  );
  assertEqual(
    streamRecovery.frame_epoch,
    input.storedFrame.frame_epoch,
    "REBASE_REQUIRED",
    "frame epoch advanced",
    ["FRAME_EPOCH_ADVANCED"],
  );
  assertEqual(
    streamRecovery.last_published_sequence,
    input.storedFrame.last_published_sequence,
    "REBASE_REQUIRED",
    "published frontier drifted",
    ["MANIFEST_STREAM_FRONTIER_DRIFT"],
  );
  assertEqual(
    streamRecovery.publication_generation,
    input.binding.publicationGeneration,
    "REBASE_REQUIRED",
    "publication generation drifted",
    ["MANIFEST_STREAM_PUBLICATION_GENERATION_DRIFT"],
  );
  if (
    streamRecovery.compaction_floor_sequence_or_null !== null &&
    streamRecovery.compaction_floor_sequence_or_null >
      streamRecovery.last_published_sequence
  ) {
    fail("REBASE_REQUIRED", "compaction floor moved beyond the published frontier", [
      "HISTORY_COMPACTED",
    ]);
  }
}

function assertActorBinding(input: {
  binding: ManifestResumeBinding;
  storedFrame: StoredLowNoiseExperienceFrameRecord;
}) {
  const streamRecovery = input.storedFrame.record.stream_recovery_contract;
  assertEqual(
    streamRecovery.session_ref,
    input.binding.sessionRef,
    "ACCESS_REBIND_REQUIRED",
    "session ref drifted",
    ["SESSION_BINDING_CHANGED"],
  );
  assertEqual(
    streamRecovery.session_binding_hash,
    input.binding.sessionBindingHash,
    "ACCESS_REBIND_REQUIRED",
    "session binding drifted",
    ["SESSION_BINDING_CHANGED"],
  );
  assertEqual(
    streamRecovery.access_binding_hash,
    input.binding.accessBindingHash,
    "ACCESS_REBIND_REQUIRED",
    "access binding drifted",
    ["ACCESS_BINDING_CHANGED"],
  );
  assertEqual(
    streamRecovery.masking_context_hash,
    input.binding.maskingContextHash,
    "ACCESS_REBIND_REQUIRED",
    "masking posture drifted",
    ["MASKING_POSTURE_CHANGED"],
  );
}

export function validateManifestResumeToken(input: {
  actorContext: NorthboundActorContext;
  frame: LowNoiseExperienceFrameRecord;
  manifestId: string;
  resumeToken: string | null | undefined;
  schemaCompatibilityRef?: string;
  storedFrame: StoredLowNoiseExperienceFrameRecord;
}): ValidatedManifestResumeToken {
  const resumeToken = nonEmptyResumeToken(input.resumeToken);
  const publicationGeneration = input.frame.stability_contract.publication_generation;
  if (!Number.isInteger(publicationGeneration) || publicationGeneration < 0) {
    fail("REBASE_REQUIRED", "stream publication generation is invalid", [
      "MANIFEST_STREAM_PUBLICATION_GENERATION_INVALID",
    ]);
  }
  const binding = manifestResumeBindingFromActor({
    actorContext: input.actorContext,
    frameEpoch: input.frame.frame_epoch,
    lastPublishedSequence: input.frame.last_published_sequence,
    manifestId: input.manifestId,
    publicationGeneration,
    schemaCompatibilityRef: input.schemaCompatibilityRef,
    shellRouteKey: input.frame.shell_route_key,
    shellStabilityToken: input.frame.shell_stability_token,
  });

  assertPublicationStillCurrent({
    binding,
    frame: input.frame,
    manifestId: input.manifestId,
    storedFrame: input.storedFrame,
  });
  assertActorBinding({ binding, storedFrame: input.storedFrame });

  if (
    input.frame.stream_recovery_contract.resume_binding_representation !== "RAW_TOKEN" ||
    input.frame.stream_recovery_contract.resume_binding_ref_or_null !== resumeToken ||
    input.frame.stability_contract.resume_token_or_null !== resumeToken ||
    input.frame.resume_token !== resumeToken
  ) {
    fail("ACCESS_REBIND_REQUIRED", "resume token does not match the grouped stream contract", [
      "MANIFEST_RESUME_TOKEN_BINDING_MISMATCH",
    ]);
  }
  if (input.frame.stream_recovery_contract.delivery_window_state !== "LIVE_RESUMABLE") {
    fail("REBASE_REQUIRED", "resume token no longer has a live delivery window", [
      input.frame.stream_recovery_contract.rebase_reason_code_or_null ??
        "MANIFEST_STREAM_DELIVERY_WINDOW_DRIFT",
    ]);
  }

  return {
    actorContext: input.actorContext,
    binding,
    frame: input.frame,
    frameRef: input.storedFrame.frame_ref,
    publicationGeneration,
    rawResumeToken: resumeToken,
    resumeTokenHash: hashTransportResumeToken(resumeToken),
    storedFrame: input.storedFrame,
  };
}

import type { StreamRecoveryContract } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import { createStreamRecoveryContract } from "../../../domain-kernel/src/streaming/stream_recovery.ts";

export function buildManifestStreamRecoveryContract(input: {
  accessBindingHash: string;
  compactionFloorSequenceOrNull?: number | null;
  frameEpoch: number;
  lastPublishedSequence: number;
  manifestId: string;
  maskingContextHash: string;
  publicationGeneration: number;
  resumeToken: string;
  sessionBindingHash: string;
  sessionRef: string;
  shellRouteKey: string;
  shellStabilityToken: string;
}): StreamRecoveryContract {
  return createStreamRecoveryContract({
    access_binding_hash: input.accessBindingHash,
    compaction_floor_sequence_or_null: input.compactionFloorSequenceOrNull ?? null,
    delivery_window_state: "LIVE_RESUMABLE",
    frame_epoch: input.frameEpoch,
    last_published_sequence: input.lastPublishedSequence,
    masking_context_hash: input.maskingContextHash,
    publication_generation: input.publicationGeneration,
    rebase_reason_code_or_null: null,
    resume_binding_ref_or_null: input.resumeToken,
    resume_binding_representation: "RAW_TOKEN",
    route_key: input.shellRouteKey,
    session_binding_hash: input.sessionBindingHash,
    session_ref: input.sessionRef,
    shell_stability_token: input.shellStabilityToken,
    stream_scope_class: "MANIFEST_EXPERIENCE",
    subject_ref: input.manifestId,
  });
}

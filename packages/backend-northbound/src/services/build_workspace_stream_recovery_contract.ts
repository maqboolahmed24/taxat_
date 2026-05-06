import type { StreamRecoveryContract } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import { createStreamRecoveryContract } from "../../../domain-kernel/src/streaming/stream_recovery.ts";

export type WorkspaceStreamRecoveryInput = {
  accessBindingHash: string;
  compactionFloorSequenceOrNull?: number | null;
  deliveryWindowState?: StreamRecoveryContract["delivery_window_state"];
  frameEpoch: number;
  lastPublishedSequence: number;
  maskingPostureFingerprint: string;
  publicationGeneration: number;
  rebaseReasonCodeOrNull?: StreamRecoveryContract["rebase_reason_code_or_null"];
  resumeToken?: string | null;
  routeKey: string;
  sessionBindingHash: string;
  sessionRef: string;
  shellStabilityToken: string;
  subjectRef: string;
};

export function buildWorkspaceStreamRecoveryContract(
  input: WorkspaceStreamRecoveryInput,
): StreamRecoveryContract {
  return createStreamRecoveryContract({
    access_binding_hash: input.accessBindingHash,
    compaction_floor_sequence_or_null: input.compactionFloorSequenceOrNull ?? null,
    delivery_window_state: input.deliveryWindowState ?? "LIVE_RESUMABLE",
    frame_epoch: input.frameEpoch,
    last_published_sequence: input.lastPublishedSequence,
    masking_context_hash: input.maskingPostureFingerprint,
    publication_generation: input.publicationGeneration,
    rebase_reason_code_or_null: input.rebaseReasonCodeOrNull ?? null,
    resume_binding_ref_or_null: input.resumeToken ?? null,
    resume_binding_representation: "RAW_TOKEN",
    route_key: input.routeKey,
    session_binding_hash: input.sessionBindingHash,
    session_ref: input.sessionRef,
    shell_stability_token: input.shellStabilityToken,
    stream_scope_class: "WORKSPACE",
    subject_ref: input.subjectRef,
  });
}

export function buildWorkspaceStreamRecoveryContractFromSnapshot(input: {
  snapshot: {
    access_binding_hash: string;
    frame_epoch: number;
    last_published_sequence: number;
    masking_posture_fingerprint: string;
    resume_token: string;
    shell_stability_token: string;
    stream_recovery_contract: StreamRecoveryContract;
    workspace_route_key: string;
    workspace_version: number;
    item_id: string;
  };
}) {
  const recovery = input.snapshot.stream_recovery_contract;
  return buildWorkspaceStreamRecoveryContract({
    accessBindingHash: input.snapshot.access_binding_hash,
    compactionFloorSequenceOrNull: recovery.compaction_floor_sequence_or_null,
    frameEpoch: input.snapshot.frame_epoch,
    lastPublishedSequence: input.snapshot.last_published_sequence,
    maskingPostureFingerprint: input.snapshot.masking_posture_fingerprint,
    publicationGeneration: input.snapshot.workspace_version,
    resumeToken: input.snapshot.resume_token,
    routeKey: input.snapshot.workspace_route_key,
    sessionBindingHash: recovery.session_binding_hash,
    sessionRef: recovery.session_ref,
    shellStabilityToken: input.snapshot.shell_stability_token,
    subjectRef: input.snapshot.item_id,
  });
}

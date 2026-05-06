import type { StreamRecoveryContract } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { RouteStabilityContract } from "../../../../packages/generated-models/src/generated/typescript/surface-and-experience.ts";

export type LowNoiseExperienceFrameRecord = Record<string, unknown> & {
  action_strip: Record<string, unknown>;
  active_detail_surface_code: string | null;
  artifact_type: "LowNoiseExperienceFrame";
  attention_policy: Record<string, unknown>;
  connection_state: string;
  context_bar: Record<string, unknown>;
  decision_bundle_hash: string;
  decision_bundle_ref: string;
  decision_summary: Record<string, unknown>;
  detail_drawer: Record<string, unknown>;
  experience_profile: "LOW_NOISE";
  focus_anchor_ref: string | null;
  frame_epoch: number;
  frame_id: string;
  interaction_layer: Record<string, unknown>;
  last_published_sequence: number;
  low_noise_budget_audit: Record<string, unknown>;
  manifest_id: string;
  object_anchor_ref: string;
  recovery_posture: string;
  rendered_at: string;
  resume_token: string;
  settlement_state: string;
  shell_family: "CALM_SHELL";
  shell_route_key: string;
  shell_stability_token: string;
  stability_contract: RouteStabilityContract;
  stream_recovery_contract: StreamRecoveryContract;
  surface_order: string[];
  truth_origin: string;
};

export type StoredLowNoiseExperienceFrameRecord = {
  decision_bundle_hash: string;
  frame_epoch: number;
  frame_id: string;
  frame_ref: string;
  last_published_sequence: number;
  manifest_id: string;
  record: LowNoiseExperienceFrameRecord;
  rendered_at: string;
  shell_stability_token: string;
};

export type PersistLowNoiseExperienceFrameInput = {
  frame: LowNoiseExperienceFrameRecord;
  frameRef?: string;
};

export type LowNoiseExperienceFrameRepositoryLike = {
  listFramesByManifestId: (
    manifestId: string,
  ) => Promise<StoredLowNoiseExperienceFrameRecord[]> | StoredLowNoiseExperienceFrameRecord[];
};

function assertNonEmptyString(label: string, value: unknown): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function assertNonNegativeInteger(label: string, value: unknown): asserts value is number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
}

export class LowNoiseExperienceFrameRepository implements LowNoiseExperienceFrameRepositoryLike {
  readonly #framesByManifestId = new Map<string, StoredLowNoiseExperienceFrameRecord[]>();

  async persistFrame(
    input: PersistLowNoiseExperienceFrameInput,
  ): Promise<StoredLowNoiseExperienceFrameRecord> {
    const frame = input.frame;
    assertNonEmptyString("frame.frame_id", frame.frame_id);
    assertNonEmptyString("frame.manifest_id", frame.manifest_id);
    assertNonEmptyString("frame.decision_bundle_hash", frame.decision_bundle_hash);
    assertNonEmptyString("frame.shell_stability_token", frame.shell_stability_token);
    assertNonNegativeInteger("frame.frame_epoch", frame.frame_epoch);
    assertNonNegativeInteger("frame.last_published_sequence", frame.last_published_sequence);
    assertNonEmptyString("frame.rendered_at", frame.rendered_at);
    const stored = {
      decision_bundle_hash: frame.decision_bundle_hash,
      frame_epoch: frame.frame_epoch,
      frame_id: frame.frame_id,
      frame_ref: input.frameRef ?? `low-noise-frame://${frame.frame_id}`,
      last_published_sequence: frame.last_published_sequence,
      manifest_id: frame.manifest_id,
      record: frame,
      rendered_at: frame.rendered_at,
      shell_stability_token: frame.shell_stability_token,
    } satisfies StoredLowNoiseExperienceFrameRecord;
    const existing = this.#framesByManifestId.get(frame.manifest_id) ?? [];
    this.#framesByManifestId.set(frame.manifest_id, [...existing, stored]);
    return stored;
  }

  async listFramesByManifestId(manifestId: string) {
    return [...(this.#framesByManifestId.get(manifestId) ?? [])];
  }
}

function renderedAtEpoch(record: StoredLowNoiseExperienceFrameRecord) {
  const value = Date.parse(record.rendered_at);
  return Number.isFinite(value) ? value : 0;
}

function sortByCurrentFrameOrder(
  left: StoredLowNoiseExperienceFrameRecord,
  right: StoredLowNoiseExperienceFrameRecord,
) {
  if (left.frame_epoch !== right.frame_epoch) {
    return left.frame_epoch - right.frame_epoch;
  }
  if (left.last_published_sequence !== right.last_published_sequence) {
    return left.last_published_sequence - right.last_published_sequence;
  }
  return renderedAtEpoch(left) - renderedAtEpoch(right);
}

export async function getLatestLowNoiseExperienceFrame(input: {
  lowNoiseExperienceFrameRepository: LowNoiseExperienceFrameRepositoryLike;
  manifestId: string;
}) {
  const frames = await input.lowNoiseExperienceFrameRepository.listFramesByManifestId(
    input.manifestId,
  );
  return frames.sort(sortByCurrentFrameOrder).at(-1) ?? null;
}

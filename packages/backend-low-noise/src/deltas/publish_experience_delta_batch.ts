import type { ExperienceDelta } from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import type { LowNoiseExperienceFrameRecord } from "../models/low_noise_frame.ts";
import {
  buildExperienceDelta,
  type BuildExperienceDeltaInput,
  type BuildExperienceDeltaResult,
  type LowNoiseDeltaMateriality,
} from "./build_experience_delta.ts";

export type PublishExperienceDeltaBatchResult = {
  deltas: ExperienceDelta[];
  nextExperienceSequence: number;
  suppressed: BuildExperienceDeltaResult[];
};

export function publishExperienceDeltaBatch(input: {
  causeRef: string;
  deliveryClass?: ExperienceDelta["delivery_class"] | undefined;
  frames: readonly LowNoiseExperienceFrameRecord[];
  materiality?: LowNoiseDeltaMateriality | undefined;
  occurredAt?: string | undefined;
  previousFrame?: LowNoiseExperienceFrameRecord | null | undefined;
  startingExperienceSequence: number;
}) {
  const frameEpochs = new Set(input.frames.map((frame) => frame.frame_epoch));
  if (frameEpochs.size > 1) {
    throw new Error("low-noise delta batches cannot mix frame epochs");
  }

  const deltas: ExperienceDelta[] = [];
  const suppressed: BuildExperienceDeltaResult[] = [];
  const publishedFrameIds = new Set<string>();
  let previousPublishedFrame = input.previousFrame ?? null;
  let nextExperienceSequence = input.startingExperienceSequence;

  for (const frame of input.frames) {
    if (publishedFrameIds.has(frame.frame_id)) {
      continue;
    }
    publishedFrameIds.add(frame.frame_id);
    const buildInput = {
      causeRef: input.causeRef,
      deliveryClass: input.deliveryClass,
      experienceSequence: nextExperienceSequence,
      materiality: input.materiality,
      nextFrame: frame,
      occurredAt: input.occurredAt,
      previousFrame: previousPublishedFrame,
    } satisfies BuildExperienceDeltaInput;
    const result = buildExperienceDelta(buildInput);
    if (result.delta === null) {
      suppressed.push(result);
      continue;
    }
    deltas.push(result.delta);
    nextExperienceSequence += 1;
    previousPublishedFrame = frame;
  }

  return {
    deltas,
    nextExperienceSequence,
    suppressed,
  } satisfies PublishExperienceDeltaBatchResult;
}

import type { ExperienceDelta } from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import type { LowNoiseExperienceFrameRecord } from "../models/low_noise_frame.ts";

export type LowNoiseDeltaPostureState = ExperienceDelta["posture_state"];
export type LowNoiseSemanticMotion = ExperienceDelta["semantic_motion"];

export function deriveDeltaPostureState(input: {
  deliveryClass: ExperienceDelta["delivery_class"];
  nextFrame: LowNoiseExperienceFrameRecord;
}): LowNoiseDeltaPostureState {
  if (input.nextFrame.connection_state === "DEGRADED") {
    return "FRACTURED";
  }
  if (input.deliveryClass === "CATCH_UP" || input.nextFrame.connection_state === "CATCHING_UP") {
    return "BRIDGED";
  }
  if (
    input.nextFrame.connection_state === "STALE" ||
    input.nextFrame.recovery_posture !== "NONE"
  ) {
    return "FROZEN";
  }
  if (input.nextFrame.action_strip.actionability_state === "NO_SAFE_ACTION") {
    return "CONTAINED";
  }
  return "STREAMING";
}

export function deriveSemanticMotion(input: {
  affectedSurfaceCount: number;
  coalesced?: boolean | undefined;
  deliveryClass: ExperienceDelta["delivery_class"];
  focusAnchorLost?: boolean | undefined;
  nextFrame: LowNoiseExperienceFrameRecord;
}): LowNoiseSemanticMotion {
  if (input.coalesced) {
    return "ECHO";
  }
  if (input.deliveryClass === "SNAPSHOT") {
    return "SEAL";
  }
  if (input.nextFrame.connection_state === "DEGRADED") {
    return "FRACTURE";
  }
  if (input.deliveryClass === "CATCH_UP" || input.nextFrame.connection_state === "CATCHING_UP") {
    return "BRIDGE";
  }
  if (input.focusAnchorLost) {
    return "RIPPLE";
  }
  if (input.affectedSurfaceCount > 1) {
    return "RIPPLE";
  }
  if (input.affectedSurfaceCount === 1) {
    return "TRACE";
  }
  return "ORBIT";
}

export function prominentMotionCountForSemanticMotion(motion: LowNoiseSemanticMotion) {
  return motion === "RIPPLE" || motion === "BRIDGE" || motion === "FRACTURE" ? 1 : 0;
}

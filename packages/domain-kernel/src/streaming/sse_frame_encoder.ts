import type { WorkspaceStreamEvent } from "../../../generated-models/src/generated/typescript/client-and-collaboration.ts";
import type { ExperienceStreamEvent } from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import {
  streamEventRouteKey,
  streamEventScopeClass,
  streamEventSequence,
  streamEventSubjectRef,
} from "./stream_scope.ts";

export type StreamSequenceEvent = ExperienceStreamEvent | WorkspaceStreamEvent;

export function sseFrameId(event: StreamSequenceEvent) {
  return [
    streamEventScopeClass(event),
    streamEventSubjectRef(event),
    event.frame_epoch,
    streamEventSequence(event),
  ].join(":");
}

function sseDataLines(payload: unknown) {
  const encoded = JSON.stringify(payload);
  return encoded.split("\n").map((line) => `data: ${line}`);
}

export function encodeHeartbeatComment(event: StreamSequenceEvent) {
  return [
    `: heartbeat scope=${streamEventScopeClass(event)} route=${streamEventRouteKey(event)} epoch=${event.frame_epoch} frontier=${event.stream_recovery_contract.last_published_sequence}`,
    "",
  ].join("\n");
}

export function encodeSseFrame(event: StreamSequenceEvent) {
  if (event.event_type === "heartbeat") {
    return encodeHeartbeatComment(event);
  }

  return [
    `id: ${sseFrameId(event)}`,
    `event: ${event.event_type}`,
    ...sseDataLines(event),
    "",
  ].join("\n");
}

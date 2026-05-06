import {
  buildTemporalPropagationEventRecord,
  type TemporalPropagationEventBuildInput,
} from "../models/temporal_propagation_event.ts";
import { TemporalPropagationEventRepository } from "../repositories/temporal_propagation_event_repository.ts";

export type BuildTemporalPropagationEventInput = TemporalPropagationEventBuildInput & {
  repository?: TemporalPropagationEventRepository;
};

export async function buildTemporalPropagationEvent(input: BuildTemporalPropagationEventInput) {
  const repository = input.repository ?? new TemporalPropagationEventRepository();
  const event = buildTemporalPropagationEventRecord(input);
  const stored = await repository.persistTemporalPropagationEvent({ event });
  return { event, repository, stored };
}

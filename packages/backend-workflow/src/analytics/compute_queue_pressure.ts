import { roundScore } from "../models/collaboration_routing_contract.ts";
import { WorkflowModelError } from "../models/workflow_item.ts";

export type QueuePressureBand = "LOW" | "ELEVATED" | "HIGH" | "SATURATED";

export type QueuePressureComputation = {
  pressure_band: QueuePressureBand;
  queue_health_score_q: number;
  queue_pressure_score_q: number;
};

function assertScore(label: string, value: number) {
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", `${label} must be an integer in 0..100`);
  }
  return value;
}

export function computeQueuePressure(input: {
  queue_health_score_q: number;
}): QueuePressureComputation {
  const queueHealthScore = assertScore("queue_health_score_q", roundScore(input.queue_health_score_q));
  const queuePressureScore = Math.max(0, 100 - queueHealthScore);
  const pressureBand: QueuePressureBand =
    queuePressureScore >= 80
      ? "SATURATED"
      : queuePressureScore >= 55
        ? "HIGH"
        : queuePressureScore >= 30
          ? "ELEVATED"
          : "LOW";

  return {
    pressure_band: pressureBand,
    queue_health_score_q: queueHealthScore,
    queue_pressure_score_q: queuePressureScore,
  };
}

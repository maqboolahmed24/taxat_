export type QueueHealthPreviewContract = {
  basis_hash: string;
  intervention_recommendation_state: string;
  queue_health_score: number;
  queue_health_state: string;
  queue_pressure_score: number;
  reason_codes: readonly string[];
};

export const queueHealthPreviewContract = {
  component_id: "queue-health-preview",
  required_selectors: [
    "queue-health-band",
    "queue-pressure-strip",
    "queue-intervention-card",
    "queue-reason-table",
  ],
  source_policy: "PERSISTED_WORK_QUEUE_HEALTH_CONTRACT_ONLY",
} as const;

export function queueHealthPreviewSummary(contract: QueueHealthPreviewContract) {
  return `${contract.queue_health_state} ${contract.queue_health_score}/100 pressure ${contract.queue_pressure_score}/100 recommendation ${contract.intervention_recommendation_state}`;
}

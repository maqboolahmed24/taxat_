import {
  buildDecisionBundleRecord,
  type DecisionBundleOutcomeClass,
  type DecisionBundleRecord,
} from "../../../packages/backend-compute/src/models/decision_bundle.ts";
import { DecisionBundleRepository } from "../../../packages/backend-compute/src/repositories/decision_bundle_repository.ts";

export function decisionBundleFixture(input: {
  manifestId: string;
  decisionBundleId?: string;
  outcomeClass?: DecisionBundleOutcomeClass;
  persistedAt?: string;
  reasonCodes?: string[];
}): DecisionBundleRecord {
  const outcomeClass = input.outcomeClass ?? "FINAL_SUCCESS";
  const needsWorkflow = [
    "APPROVAL_PENDING",
    "AUTHORITY_PENDING",
    "AUTHORITY_UNKNOWN",
    "HUMAN_REVIEW",
    "LATE_DATA_PENDING",
    "OUT_OF_BAND_REVIEW",
  ].includes(outcomeClass);
  return buildDecisionBundleRecord({
    decision_bundle_id: input.decisionBundleId,
    manifest_id: input.manifestId,
    next_action_codes: needsWorkflow ? ["OPEN_REVIEW_WORKFLOW"] : [],
    outcome_class: outcomeClass,
    persisted_at: input.persistedAt ?? "2026-05-03T10:00:00.000Z",
    reason_codes: input.reasonCodes ?? [
      outcomeClass === "FINAL_BLOCKED"
        ? "TERMINAL_BLOCKED"
        : outcomeClass === "FINAL_SUCCESS"
          ? "TERMINAL_COMPLETE"
          : "REVIEW_REQUIRED",
    ],
    workflow_item_refs: needsWorkflow ? [`workflow-item://${input.manifestId}`] : [],
  });
}

export async function persistedDecisionBundleFixture(input: {
  manifestId: string;
  decisionBundleId?: string;
  outcomeClass?: DecisionBundleOutcomeClass;
  persistedAt?: string;
  reasonCodes?: string[];
  repository?: DecisionBundleRepository;
}) {
  const repository = input.repository ?? new DecisionBundleRepository();
  const decisionBundle = decisionBundleFixture(input);
  const stored = await repository.persistDecisionBundle({
    decision_bundle: decisionBundle,
  });
  return {
    decisionBundle,
    repository,
    stored,
  };
}

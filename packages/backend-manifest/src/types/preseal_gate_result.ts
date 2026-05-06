import type { PresealGateEvaluationContract } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type {
  RunManifestGateDecisionRecord,
  RunManifestRecord,
} from "../models/run_manifest.ts";
import type { StoredRunManifestRecord } from "../repositories/run_manifest_repository.ts";

export type PresealGateCompletionState =
  PresealGateEvaluationContract["completion_state"];

export type PresealGateResult = {
  blocking_gate_codes: PresealGateEvaluationContract["blocking_gate_codes"];
  completion_state: PresealGateCompletionState;
  gate_records: RunManifestGateDecisionRecord[];
  missing_prerequisite_refs: string[];
  preseal_gate_evaluation: PresealGateEvaluationContract;
  reason_codes: string[];
};

export type SealManifestOutcomeCode = "SEALED" | "BLOCKED_PRESTART";

export type SealManifestOutcome = {
  gate_records: RunManifestGateDecisionRecord[];
  manifest: RunManifestRecord;
  outcome_code: SealManifestOutcomeCode;
  preseal_gate_evaluation: PresealGateEvaluationContract;
  reason_codes: string[];
  stored_manifest: StoredRunManifestRecord;
};

import type { RunManifestRecord } from "../../../backend-manifest/src/index.ts";
import {
  deriveDecisionBundleContentHash,
  normalizeDecisionBundleRecord,
  type DecisionBundleRecord,
} from "../models/decision_bundle.ts";
import {
  DecisionBundleRepository,
  type StoredDecisionBundleRecord,
} from "../repositories/decision_bundle_repository.ts";
import type { GateDecisionRecord } from "../models/gate_decision_record.ts";
import { computeDecisionBundleDeterministicOutcomeHash } from "./compute_deterministic_outcome_hash.ts";
import { synchronizeManifestTerminalProjection } from "./synchronize_manifest_terminal_projection.ts";
import { validateTerminalRefSet } from "./validate_terminal_ref_set.ts";

export type PersistDecisionBundleResult = {
  decision_bundle_hash: string;
  deterministic_outcome_hash: string;
  manifest: RunManifestRecord | null;
  stored_decision_bundle: StoredDecisionBundleRecord;
};

export async function persistDecisionBundle(input: {
  audit_refs?: readonly string[];
  decision_bundle: DecisionBundleRecord;
  decision_bundle_hash?: string | null;
  drift_refs?: readonly string[];
  gate_records?: readonly GateDecisionRecord[];
  manifest?: RunManifestRecord | null;
  pre_start_blocked?: boolean;
  repository: DecisionBundleRepository;
}) {
  const decisionBundle = normalizeDecisionBundleRecord(input.decision_bundle);
  validateTerminalRefSet({
    decision_bundle: decisionBundle,
    gate_records: input.gate_records,
    pre_start_blocked: input.pre_start_blocked,
  });
  const decisionBundleHash =
    input.decision_bundle_hash ??
    decisionBundle.contract.artifact_content_hash ??
    deriveDecisionBundleContentHash(decisionBundle);
  const deterministicOutcome = computeDecisionBundleDeterministicOutcomeHash({
    decision_bundle: decisionBundle,
    gate_records: input.gate_records,
  });
  const stored = await input.repository.persistDecisionBundle({
    decision_bundle: decisionBundle,
    decision_bundle_hash: decisionBundleHash,
    persisted_at: decisionBundle.persisted_at,
  });
  const manifest =
    input.manifest == null
      ? null
      : synchronizeManifestTerminalProjection({
          audit_refs: input.audit_refs,
          decision_bundle: decisionBundle,
          decision_bundle_hash: decisionBundleHash,
          deterministic_outcome_hash: deterministicOutcome.deterministic_outcome_hash,
          drift_refs: input.drift_refs,
          gate_records: input.gate_records,
          manifest: input.manifest,
        });

  return {
    decision_bundle_hash: decisionBundleHash,
    deterministic_outcome_hash: deterministicOutcome.deterministic_outcome_hash,
    manifest,
    stored_decision_bundle: stored,
  } satisfies PersistDecisionBundleResult;
}

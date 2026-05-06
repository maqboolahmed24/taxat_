import type { RunManifestRecord } from "../../../backend-manifest/src/index.ts";
import {
  DecisionBundleRepository,
  type StoredDecisionBundleRecord,
} from "../repositories/decision_bundle_repository.ts";

export type ReloadTerminalBundleForSameRequestRetryResult = {
  child_manifest_allocated: false;
  decision_bundle_hash: string;
  reload_state: "RETURN_EXISTING_BUNDLE";
  stored_decision_bundle: StoredDecisionBundleRecord;
};

export async function reloadTerminalBundleForSameRequestRetry(input: {
  manifest: Pick<RunManifestRecord, "decision_bundle_hash" | "lifecycle_state" | "manifest_id">;
  repository: DecisionBundleRepository;
}) {
  if (
    !["COMPLETED", "BLOCKED", "FAILED", "SUPERSEDED", "REPLAY_ONLY", "RETIRED"].includes(
      input.manifest.lifecycle_state,
    )
  ) {
    throw new Error("same-request terminal retry requires a terminal manifest");
  }
  if (input.manifest.decision_bundle_hash == null) {
    throw new Error("same-request terminal retry requires manifest.decision_bundle_hash");
  }
  const stored = await input.repository.requireDecisionBundleByHash(
    input.manifest.decision_bundle_hash,
  );
  if (stored.manifest_id !== input.manifest.manifest_id) {
    throw new Error("terminal retry bundle hash belongs to a different manifest");
  }
  return {
    child_manifest_allocated: false,
    decision_bundle_hash: input.manifest.decision_bundle_hash,
    reload_state: "RETURN_EXISTING_BUNDLE",
    stored_decision_bundle: stored,
  } satisfies ReloadTerminalBundleForSameRequestRetryResult;
}

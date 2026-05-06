import type {
  DecisionBundleRepository,
  StoredDecisionBundleRecord,
} from "../../../backend-compute/src/repositories/decision_bundle_repository.ts";

export async function getLatestDecisionBundleForManifest(input: {
  decisionBundleRepository: DecisionBundleRepository;
  manifestId: string;
}): Promise<StoredDecisionBundleRecord | null> {
  const records = await input.decisionBundleRepository.listDecisionBundlesByManifestId(
    input.manifestId,
  );
  return records.at(-1) ?? null;
}

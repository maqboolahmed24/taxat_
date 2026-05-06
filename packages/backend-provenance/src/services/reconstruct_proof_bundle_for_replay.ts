import {
  deriveProofBundleContentHash,
  normalizeProofBundleRecord,
  type ProofBundleRecord,
} from "../models/proof_bundle.ts";
import type { ProvenancePathRecord } from "../models/provenance_path.ts";
import type { EvidenceGraphRecord } from "../models/evidence_graph.ts";

export type ReconstructProofBundleForReplayInput = {
  bundle: ProofBundleRecord;
  graph?: EvidenceGraphRecord | null;
  paths?: readonly ProvenancePathRecord[];
  available_artifact_refs?: readonly string[];
};

export type ReconstructedProofBundleReplay = {
  replayable: boolean;
  bundle_hash_verified: boolean;
  reconstructed_bundle_hash: string;
  recorded_bundle_hash: string;
  path_ref_order: string[];
  missing_artifact_refs: string[];
  unresolved_path_refs: string[];
  graph_ref_verified: boolean;
};

export function reconstructProofBundleForReplay(
  input: ReconstructProofBundleForReplayInput,
): ReconstructedProofBundleReplay {
  const bundle = normalizeProofBundleRecord(input.bundle);
  const reconstructedBundleHash = deriveProofBundleContentHash(bundle);
  const availableArtifactRefs = new Set(input.available_artifact_refs ?? bundle.replay_recipe.required_artifact_refs);
  const missingArtifactRefs = bundle.replay_recipe.required_artifact_refs.filter(
    (artifactRef) => !availableArtifactRefs.has(artifactRef),
  );
  const pathMap = new Map((input.paths ?? []).map((path) => [path.path_id, path]));
  const unresolvedPathRefs = input.paths
    ? bundle.replay_recipe.path_ref_order.filter((pathRef) => !pathMap.has(pathRef))
    : [];
  const graphRefVerified = input.graph
    ? bundle.graph_ref === `evidence-graph://${input.graph.graph_id}`
    : true;

  return {
    bundle_hash_verified: reconstructedBundleHash === bundle.bundle_hash,
    graph_ref_verified: graphRefVerified,
    missing_artifact_refs: missingArtifactRefs,
    path_ref_order: [...bundle.replay_recipe.path_ref_order],
    reconstructed_bundle_hash: reconstructedBundleHash,
    recorded_bundle_hash: bundle.bundle_hash,
    replayable:
      bundle.replay_recipe.replayable &&
      reconstructedBundleHash === bundle.bundle_hash &&
      missingArtifactRefs.length === 0 &&
      unresolvedPathRefs.length === 0 &&
      graphRefVerified,
    unresolved_path_refs: unresolvedPathRefs,
  };
}

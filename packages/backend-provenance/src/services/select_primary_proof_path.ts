import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import type { ProofBundleRejectedPathEntry, ProofBundleRejectedPathClass } from "../models/proof_bundle.ts";
import type { ProvenancePathRecord } from "../models/provenance_path.ts";
import { normalizeSortedStringSet, ProvenanceModelError } from "../models/provenance_common.ts";

export type PrimaryProofPathSelectionInput = {
  paths: readonly ProvenancePathRecord[];
  target_ref?: string | null;
  authority_satisfied_path_refs?: readonly string[];
};

export type PrimaryProofPathSelection = {
  primary_path: ProvenancePathRecord | null;
  rejected_paths: ProvenancePathRecord[];
  rejected_path_entries: ProofBundleRejectedPathEntry[];
  ordered_paths: ProvenancePathRecord[];
};

type RankedPath = {
  path: ProvenancePathRecord;
  material_key: string;
  rank: {
    admissible_contradiction_free: number;
    authority_prerequisite_satisfied_without_inferred_support: number;
    weakest_support_confidence: number;
    limitation_count: number;
    stale_or_tombstoned_count: number;
    hop_count: number;
    path_id: string;
  };
};

function authorityPrerequisiteSatisfied(path: ProvenancePathRecord, explicitSatisfiedRefs: ReadonlySet<string>) {
  const authorityLinked =
    path.path_class === "PATH_AUTHORITY_STATE" || path.anchor_class === "AUTHORITY_RESPONSE";
  if (explicitSatisfiedRefs.has(path.path_id)) {
    return !path.inferred_decisive_segment_present;
  }
  return authorityLinked ? !path.inferred_decisive_segment_present : true;
}

function materialKey(path: ProvenancePathRecord) {
  return stableJsonHash({
    anchor_class: path.anchor_class,
    anchor_ref: path.anchor_ref,
    decisive_edge_refs: path.decisive_edge_refs,
    edge_refs: path.edge_refs,
    lineage_boundary_refs: path.lineage_boundary_refs,
    manifest_refs: path.manifest_refs,
    node_refs: path.node_refs,
    target_ref: path.target_ref,
  });
}

function rankPath(path: ProvenancePathRecord, explicitSatisfiedRefs: ReadonlySet<string>): RankedPath {
  return {
    material_key: materialKey(path),
    path,
    rank: {
      admissible_contradiction_free:
        path.admissibility_state === "ADMISSIBLE" && path.contradiction_refs.length === 0 ? 0 : 1,
      authority_prerequisite_satisfied_without_inferred_support: authorityPrerequisiteSatisfied(
        path,
        explicitSatisfiedRefs,
      )
        ? 0
        : 1,
      hop_count: path.hop_count,
      limitation_count: path.limitation_codes.length,
      path_id: path.path_id,
      stale_or_tombstoned_count: path.stale_segment_count + path.tombstoned_segment_count,
      weakest_support_confidence: path.weakest_support_confidence,
    },
  };
}

function compareRankedPath(left: RankedPath, right: RankedPath) {
  return (
    left.rank.admissible_contradiction_free - right.rank.admissible_contradiction_free ||
    left.rank.authority_prerequisite_satisfied_without_inferred_support -
      right.rank.authority_prerequisite_satisfied_without_inferred_support ||
    right.rank.weakest_support_confidence - left.rank.weakest_support_confidence ||
    left.rank.limitation_count - right.rank.limitation_count ||
    left.rank.stale_or_tombstoned_count - right.rank.stale_or_tombstoned_count ||
    left.rank.hop_count - right.rank.hop_count ||
    left.rank.path_id.localeCompare(right.rank.path_id)
  );
}

function rejectionForPath(
  path: ProvenancePathRecord,
  explicitSatisfiedRefs: ReadonlySet<string>,
): {
  rejection_class: ProofBundleRejectedPathClass;
  rejection_reason_codes: string[];
} {
  const reasons = new Set<string>(["LOWER_RANKED_BY_PROOF_PATH_SELECTION_V1"]);
  if (path.contradiction_refs.length > 0) {
    path.contradiction_refs.forEach((ref) => reasons.add(`CONTRADICTION_REF:${ref}`));
    return {
      rejection_class: "CONTRADICTS_PRIMARY",
      rejection_reason_codes: normalizeSortedStringSet("rejection_reason_codes", [...reasons]),
    };
  }
  if (path.stale_segment_count > 0 || path.tombstoned_segment_count > 0) {
    if (path.stale_segment_count > 0) reasons.add("STALE_SEGMENT_PRESENT");
    if (path.tombstoned_segment_count > 0) reasons.add("TOMBSTONED_SEGMENT_PRESENT");
    return {
      rejection_class: "STALE_OR_SUPERSEDED",
      rejection_reason_codes: normalizeSortedStringSet("rejection_reason_codes", [...reasons]),
    };
  }
  if (!path.replayable) {
    reasons.add("PATH_NOT_REPLAYABLE");
    return {
      rejection_class: "REPLAY_CLOSURE_FAILURE",
      rejection_reason_codes: normalizeSortedStringSet("rejection_reason_codes", [...reasons]),
    };
  }
  if (
    path.inferred_decisive_segment_present ||
    path.limitation_codes.includes("SILENT_LIMITATION_AMBIGUITY")
  ) {
    if (path.inferred_decisive_segment_present) reasons.add("INFERRED_DECISIVE_SEGMENT_PRESENT");
    if (path.limitation_codes.includes("SILENT_LIMITATION_AMBIGUITY")) {
      reasons.add("SILENT_LIMITATION_AMBIGUITY_PRESENT");
    }
    return {
      rejection_class: "SILENT_LIMITATION_AMBIGUITY",
      rejection_reason_codes: normalizeSortedStringSet("rejection_reason_codes", [...reasons]),
    };
  }
  if (!authorityPrerequisiteSatisfied(path, explicitSatisfiedRefs)) {
    reasons.add("AUTHORITY_PREREQUISITE_NOT_SATISFIED");
    return {
      rejection_class: "AUTHORITY_CLOSURE_FAILURE",
      rejection_reason_codes: normalizeSortedStringSet("rejection_reason_codes", [...reasons]),
    };
  }
  for (const limitationCode of path.limitation_codes) {
    reasons.add(`LIMITATION:${limitationCode}`);
  }
  return {
    rejection_class: "WEAKER_SUPPORT",
    rejection_reason_codes: normalizeSortedStringSet("rejection_reason_codes", [...reasons]),
  };
}

export function selectPrimaryProofPath(input: PrimaryProofPathSelectionInput): PrimaryProofPathSelection {
  const explicitSatisfiedRefs = new Set(input.authority_satisfied_path_refs ?? []);
  const candidatePaths = input.paths.filter((path) => !input.target_ref || path.target_ref === input.target_ref);
  if (candidatePaths.length === 0) {
    return {
      ordered_paths: [],
      primary_path: null,
      rejected_path_entries: [],
      rejected_paths: [],
    };
  }
  const ranked = candidatePaths.map((path) => rankPath(path, explicitSatisfiedRefs)).sort(compareRankedPath);
  const distinctRanked: RankedPath[] = [];
  const seenMaterialKeys = new Set<string>();
  for (const candidate of ranked) {
    if (seenMaterialKeys.has(candidate.material_key)) {
      continue;
    }
    seenMaterialKeys.add(candidate.material_key);
    distinctRanked.push(candidate);
  }
  const primary = distinctRanked[0]?.path ?? null;
  if (!primary) {
    throw new ProvenanceModelError("PROVENANCE_CONTRACT_INVALID", "primary proof path selection produced no primary");
  }
  const rejectedPaths = distinctRanked.slice(1).map((entry) => entry.path);
  const rejectedPathEntries = rejectedPaths.map((path, index) => ({
    path_rank: index + 2,
    path_ref: path.path_id,
    ...rejectionForPath(path, explicitSatisfiedRefs),
  }));
  return {
    ordered_paths: distinctRanked.map((entry) => entry.path),
    primary_path: primary,
    rejected_path_entries: rejectedPathEntries,
    rejected_paths: rejectedPaths,
  };
}

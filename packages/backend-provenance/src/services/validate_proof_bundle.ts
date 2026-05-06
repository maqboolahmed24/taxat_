import {
  normalizeProofBundleRecord,
  type ProofBundleRecord,
} from "../models/proof_bundle.ts";
import type { ProvenancePathRecord } from "../models/provenance_path.ts";
import type { EvidenceGraphRecord } from "../models/evidence_graph.ts";

export type ProofBundleValidationIssue = {
  code: string;
  path: string;
  detail: string;
};

export type ProofBundleValidationInput = {
  bundle: ProofBundleRecord;
  graph?: EvidenceGraphRecord | null;
  paths?: readonly ProvenancePathRecord[];
};

function issue(code: string, path: string, detail: string): ProofBundleValidationIssue {
  return { code, detail, path };
}

export function validateProofBundle(input: ProofBundleValidationInput) {
  const issues: ProofBundleValidationIssue[] = [];
  let bundle: ProofBundleRecord;
  try {
    bundle = normalizeProofBundleRecord(input.bundle);
  } catch (error) {
    return {
      issues: [
        issue(
          "PROOF_BUNDLE_NORMALIZATION_FAILED",
          "$",
          error instanceof Error ? error.message : String(error),
        ),
      ],
      valid: false,
    };
  }

  if (input.graph) {
    const expectedGraphRef = `evidence-graph://${input.graph.graph_id}`;
    if (bundle.graph_ref !== expectedGraphRef) {
      issues.push(
        issue(
          "GRAPH_REF_MISMATCH",
          "$.graph_ref",
          `bundle graph_ref ${bundle.graph_ref} does not match graph ${expectedGraphRef}`,
        ),
      );
    }
    const graphTarget = input.graph.target_assessments.find((assessment) => assessment.target_ref === bundle.target_ref);
    if (!graphTarget) {
      issues.push(
        issue(
          "TARGET_ASSESSMENT_MISSING",
          "$.target_ref",
          `graph does not retain a target assessment for ${bundle.target_ref}`,
        ),
      );
    }
  }

  const pathMap = new Map((input.paths ?? []).map((path) => [path.path_id, path]));
  if (input.paths) {
    if (bundle.primary_path_ref && !pathMap.has(bundle.primary_path_ref)) {
      issues.push(
        issue(
          "PRIMARY_PATH_UNRESOLVED",
          "$.primary_path_ref",
          `primary path ${bundle.primary_path_ref} is absent from persisted path inputs`,
        ),
      );
    }
    for (const pathRef of [...bundle.decisive_path_refs, ...bundle.rejected_path_refs]) {
      if (!pathMap.has(pathRef)) {
        issues.push(
          issue("PATH_UNRESOLVED", "$.replay_recipe.path_ref_order", `path ${pathRef} is absent from persisted path inputs`),
        );
      }
    }
    for (const pathRef of bundle.rejected_path_refs) {
      const rejected = pathMap.get(pathRef);
      if (rejected && rejected.target_ref !== bundle.target_ref) {
        issues.push(
          issue(
            "REJECTED_PATH_TARGET_MISMATCH",
            "$.rejected_path_refs",
            `rejected path ${pathRef} targets ${rejected.target_ref}, not ${bundle.target_ref}`,
          ),
        );
      }
    }
    if (bundle.primary_path_ref) {
      const primary = pathMap.get(bundle.primary_path_ref);
      if (primary && primary.target_ref !== bundle.target_ref) {
        issues.push(
          issue(
            "PRIMARY_PATH_TARGET_MISMATCH",
            "$.primary_path_ref",
            `primary path ${bundle.primary_path_ref} targets ${primary.target_ref}, not ${bundle.target_ref}`,
          ),
        );
      }
    }
  }

  const decisiveSet = new Set(bundle.decisive_path_refs);
  for (const rejectedPathRef of bundle.rejected_path_refs) {
    if (decisiveSet.has(rejectedPathRef)) {
      issues.push(
        issue(
          "REJECTED_PATH_OVERLAPS_DECISIVE_SET",
          "$.rejected_path_refs",
          `rejected path ${rejectedPathRef} also appears in decisive_path_refs`,
        ),
      );
    }
  }

  if (bundle.support_state === "STALE" && !bundle.temporal_propagation_event_refs.length) {
    issues.push(
      issue(
        "STALE_PROOF_WITHOUT_TEMPORAL_EVENT",
        "$.temporal_propagation_event_refs",
        "stale proof must retain temporal propagation event refs",
      ),
    );
  }
  if (bundle.support_state === "CONTRADICTED" && !bundle.contradiction_refs.length) {
    issues.push(
      issue(
        "CONTRADICTED_PROOF_WITHOUT_CONTRADICTION_REF",
        "$.contradiction_refs",
        "contradicted proof must retain contradiction refs",
      ),
    );
  }
  return {
    bundle,
    issues,
    valid: issues.length === 0,
  };
}

export function assertProofBundleValid(input: ProofBundleValidationInput) {
  const result = validateProofBundle(input);
  if (!result.valid) {
    throw new Error(result.issues.map((entry) => `${entry.code} ${entry.path}: ${entry.detail}`).join("\n"));
  }
  return result.bundle;
}

import {
  normalizeEnquiryPackRecord,
  type EnquiryPackRecord,
} from "../models/enquiry_pack.ts";
import type { EvidenceGraphRecord } from "../models/evidence_graph.ts";
import { proofBundleRef, type ProofBundleRecord } from "../models/proof_bundle.ts";
import type { ProvenancePathRecord } from "../models/provenance_path.ts";

export type EnquiryPackValidationIssue = {
  code: string;
  path: string;
  detail: string;
};

export type EnquiryPackValidationInput = {
  pack: EnquiryPackRecord;
  graph?: EvidenceGraphRecord | null;
  proof_bundle?: ProofBundleRecord | null;
  paths?: readonly ProvenancePathRecord[];
};

function issue(code: string, path: string, detail: string): EnquiryPackValidationIssue {
  return { code, detail, path };
}

export function validateEnquiryPack(input: EnquiryPackValidationInput) {
  const issues: EnquiryPackValidationIssue[] = [];
  let pack: EnquiryPackRecord;
  try {
    pack = normalizeEnquiryPackRecord(input.pack);
  } catch (error) {
    return {
      issues: [
        issue(
          "ENQUIRY_PACK_NORMALIZATION_FAILED",
          "$",
          error instanceof Error ? error.message : String(error),
        ),
      ],
      valid: false,
    };
  }

  if (input.graph) {
    const expectedGraphRef = `evidence-graph://${input.graph.graph_id}`;
    if (pack.graph_ref !== expectedGraphRef) {
      issues.push(
        issue(
          "GRAPH_REF_MISMATCH",
          "$.graph_ref",
          `pack graph_ref ${pack.graph_ref} does not match graph ${expectedGraphRef}`,
        ),
      );
    }
    if (pack.target_ref !== input.proof_bundle?.target_ref && !input.graph.target_assessments.some((assessment) => assessment.target_ref === pack.target_ref)) {
      issues.push(
        issue(
          "TARGET_ASSESSMENT_MISSING",
          "$.target_ref",
          `graph does not retain target assessment ${pack.target_ref}`,
        ),
      );
    }
  }

  if (input.proof_bundle) {
    const expectedProofBundleRef = proofBundleRef(input.proof_bundle);
    if (pack.proof_bundle_ref !== expectedProofBundleRef) {
      issues.push(
        issue(
          "PROOF_BUNDLE_REF_MISMATCH",
          "$.proof_bundle_ref",
          `pack proof_bundle_ref ${pack.proof_bundle_ref} does not match proof ${expectedProofBundleRef}`,
        ),
      );
    }
    if (pack.primary_path_ref !== input.proof_bundle.primary_path_ref) {
      issues.push(
        issue(
          "PRIMARY_PATH_REF_MISMATCH",
          "$.primary_path_ref",
          "pack primary_path_ref must mirror the controlling proof bundle primary_path_ref",
        ),
      );
    }
  }

  const pathMap = new Map((input.paths ?? []).map((path) => [path.path_id, path]));
  if (input.paths) {
    for (const pathRef of pack.critical_path_refs) {
      if (!pathMap.has(pathRef)) {
        issues.push(
          issue("CRITICAL_PATH_UNRESOLVED", "$.critical_path_refs", `critical path ${pathRef} is absent from persisted paths`),
        );
      }
    }
  }

  if (!pack.critical_path_refs.includes(pack.primary_path_ref)) {
    issues.push(
      issue(
        "PRIMARY_PATH_NOT_CRITICAL",
        "$.critical_path_refs",
        "primary_path_ref must appear in critical_path_refs",
      ),
    );
  }

  if (pack.explanation_status !== "AVAILABLE" && pack.limitation_notes.length === 0) {
    issues.push(
      issue(
        "LIMITED_EXPLANATION_WITHOUT_LIMITATION_NOTE",
        "$.limitation_notes",
        "limited or failed enquiry packs must retain limitation notes",
      ),
    );
  }

  if (pack.masking_posture !== "NONE" && pack.omission_entries.length === 0) {
    issues.push(
      issue(
        "MASKING_WITHOUT_OMISSION",
        "$.omission_entries",
        "masked or retention-limited packs must retain omission entries",
      ),
    );
  }

  if (pack.explanation_status === "FAILED") {
    const renderRefs = pack.render_contract;
    if (renderRefs.operator_render_ref || renderRefs.reviewer_render_ref || renderRefs.filing_artifact_ref) {
      issues.push(
        issue(
          "FAILED_RENDER_REF_PRESENT",
          "$.render_contract",
          "failed explanation posture must clear operator, reviewer, and filing render refs",
        ),
      );
    }
  }

  return {
    issues,
    pack,
    valid: issues.length === 0,
  };
}

export function assertEnquiryPackValid(input: EnquiryPackValidationInput) {
  const result = validateEnquiryPack(input);
  if (!result.valid) {
    throw new Error(result.issues.map((entry) => `${entry.code} ${entry.path}: ${entry.detail}`).join("\n"));
  }
  return result.pack;
}

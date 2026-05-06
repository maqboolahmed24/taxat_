import type { CollectionSourceClass } from "../models/collection_control_common.ts";
import type { EvidenceItemKind } from "../models/evidence_item.ts";
import type { CandidateFactFamily } from "../types/candidate_fact_draft.ts";

export type FactFamilyClassification = {
  fact_family: CandidateFactFamily;
  rationale_code: string;
};

export function classifyFactFamily(input: {
  evidence_kind: EvidenceItemKind;
  fact_family_hint?: CandidateFactFamily;
  source_class: CollectionSourceClass;
  value_payload_ref?: string;
}): FactFamilyClassification {
  if (input.fact_family_hint !== undefined) {
    return {
      fact_family: input.fact_family_hint,
      rationale_code: "FACT_FAMILY_HINT",
    };
  }
  if (input.value_payload_ref?.includes("/adjustment/")) {
    return {
      fact_family: "ADJUSTMENT_FACT",
      rationale_code: "VALUE_PAYLOAD_ADJUSTMENT_HINT",
    };
  }
  if (input.evidence_kind === "GOVERNANCE_CONTROL_RECORD") {
    return {
      fact_family: "WORKFLOW_CONTEXT_FACT",
      rationale_code: "GOVERNANCE_EVIDENCE",
    };
  }
  if (input.evidence_kind === "DECLARED_ASSERTION_TEXT") {
    return {
      fact_family: "PROFILE_FACT",
      rationale_code: "DECLARED_ASSERTION_EVIDENCE",
    };
  }
  if (input.source_class === "AUTHORITY_ACKNOWLEDGEMENT") {
    return {
      fact_family: "SUBMISSION_STATE_FACT",
      rationale_code: "AUTHORITY_ACKNOWLEDGEMENT",
    };
  }
  if (input.source_class === "AUTHORITY_REFERENCE") {
    return {
      fact_family: "OBLIGATION_FACT",
      rationale_code: "AUTHORITY_REFERENCE",
    };
  }
  if (input.source_class === "PROBABILISTIC_INFERENCE") {
    return {
      fact_family: "RISK_FEATURE_FACT",
      rationale_code: "PROBABILISTIC_INFERENCE",
    };
  }
  if (input.source_class === "INSTITUTIONAL_FEED" || input.source_class === "BOOKS_OF_ENTRY") {
    return {
      fact_family: "RECORD_FACT",
      rationale_code: "STRUCTURED_RECORD_SOURCE",
    };
  }
  return {
    fact_family: "RECORD_FACT",
    rationale_code: "DOCUMENTARY_OR_DEFAULT_RECORD_SOURCE",
  };
}

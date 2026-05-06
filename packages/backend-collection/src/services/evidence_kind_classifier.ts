import type { CollectionSourceClass } from "../models/collection_control_common.ts";
import type {
  EvidenceExtractionMethod,
  EvidenceItemKind,
} from "../models/evidence_item.ts";

export type EvidenceClassification = {
  default_extraction_confidence: number;
  evidence_kind: EvidenceItemKind;
  extraction_method: EvidenceExtractionMethod;
};

export function classifyEvidenceKind(input: {
  extraction_available?: boolean;
  quarantined?: boolean;
  source_class: CollectionSourceClass;
}): EvidenceClassification {
  if (input.quarantined) {
    return {
      default_extraction_confidence: 0,
      evidence_kind: "QUARANTINED_CONTENT",
      extraction_method: "QUARANTINE_BLOCKED_EXTRACTION",
    };
  }

  switch (input.source_class) {
    case "DOCUMENTARY_EVIDENCE":
      if (input.extraction_available) {
        return {
          default_extraction_confidence: 0.65,
          evidence_kind: "DOCUMENTARY_RAW_PAYLOAD",
          extraction_method: "OCR_TEXT_EXTRACTION",
        };
      }
      return {
        default_extraction_confidence: 0,
        evidence_kind: "EXTRACTION_REVIEW_REQUIRED",
        extraction_method: "NO_TEXT_EXTRACTION_RETAINED",
      };
    case "DECLARED_ASSERTION":
      return {
        default_extraction_confidence: 0.8,
        evidence_kind: "DECLARED_ASSERTION_TEXT",
        extraction_method: "DECLARED_TEXT_DIRECT",
      };
    case "GOVERNANCE_ARTIFACT":
      return {
        default_extraction_confidence: 1,
        evidence_kind: "GOVERNANCE_CONTROL_RECORD",
        extraction_method: "STRUCTURED_PAYLOAD_DIRECT",
      };
    default:
      return {
        default_extraction_confidence: 1,
        evidence_kind: "STRUCTURED_PROVIDER_PAYLOAD",
        extraction_method: "STRUCTURED_PAYLOAD_DIRECT",
      };
  }
}

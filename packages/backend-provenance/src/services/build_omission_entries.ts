import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  type EnquiryPackExplanationStatus,
  type EnquiryPackMaskingPosture,
  type EnquiryPackOmissionClass,
  type EnquiryPackOmissionEntry,
} from "../models/enquiry_pack.ts";
import type { ProofBundleLimitationNote, ProofBundleRetentionBinding } from "../models/proof_bundle.ts";
import { normalizeSortedStringSet } from "../models/provenance_common.ts";

export type BuildOmissionEntriesInput = {
  primary_path_ref: string;
  critical_path_refs: readonly string[];
  proof_bundle_ref?: string | null;
  explanation_status: EnquiryPackExplanationStatus;
  masking_posture: EnquiryPackMaskingPosture;
  retention_binding: ProofBundleRetentionBinding;
  limitation_notes?: readonly ProofBundleLimitationNote[];
  omission_entries?: readonly EnquiryPackOmissionEntry[];
};

function omissionEntry(input: {
  omission_class: EnquiryPackOmissionClass;
  affected_refs: readonly string[];
  declared_reason_code: string;
}) {
  const affectedRefs = normalizeSortedStringSet("omission_entries.affected_refs", input.affected_refs, {
    minItems: 1,
  });
  return {
    affected_refs: affectedRefs,
    declared_reason_code: input.declared_reason_code,
    omission_class: input.omission_class,
    omission_id: `omission.${stableJsonHash({
      affected_refs: affectedRefs,
      declared_reason_code: input.declared_reason_code,
      omission_class: input.omission_class,
    })}`,
  } satisfies EnquiryPackOmissionEntry;
}

export function buildOmissionEntries(input: BuildOmissionEntriesInput): EnquiryPackOmissionEntry[] {
  const entries = [...(input.omission_entries ?? [])];
  if (input.masking_posture === "NONE") {
    return [];
  }
  const criticalRefs = [
    input.primary_path_ref,
    ...input.critical_path_refs,
    ...(input.proof_bundle_ref ? [input.proof_bundle_ref] : []),
  ];
  const retentionLimited = ["LIMITED", "TOMBSTONED", "PSEUDONYMISED"].includes(
    input.retention_binding.limitation_behavior,
  );
  const noteClasses = new Set((input.limitation_notes ?? []).map((note) => note.note_class));
  if (retentionLimited || noteClasses.has("RETENTION")) {
    entries.push(
      omissionEntry({
        affected_refs: criticalRefs,
        declared_reason_code: "RETENTION_LIMITED_EXPLANATION_MATERIAL",
        omission_class: "RETENTION",
      }),
    );
  }
  if (noteClasses.has("PRIVACY")) {
    entries.push(
      omissionEntry({
        affected_refs: criticalRefs,
        declared_reason_code: "PRIVACY_LIMITED_EXPLANATION_MATERIAL",
        omission_class: "PRIVACY",
      }),
    );
  }
  if (input.explanation_status === "FAILED") {
    entries.push(
      omissionEntry({
        affected_refs: criticalRefs,
        declared_reason_code: "RENDER_FAILED_EXPLANATION_MATERIAL_UNAVAILABLE",
        omission_class: retentionLimited ? "RETENTION" : "EXTERNAL_LIMITATION",
      }),
    );
  }
  if (entries.length === 0) {
    entries.push(
      omissionEntry({
        affected_refs: criticalRefs,
        declared_reason_code: "MASKED_EXPLANATION_MATERIAL",
        omission_class: "MASKING",
      }),
    );
  }
  const byId = new Map(entries.map((entry) => [entry.omission_id, entry]));
  return [...byId.values()].sort((left, right) => left.omission_id.localeCompare(right.omission_id));
}

import {
  RecoveryCheckpointModelError,
  requireTrimmedString,
  type RestorePrivacyResurrectedPosture,
} from "../models/recovery_checkpoint.ts";

export type RestoreResurrectedDataPostureClassification = {
  resurrected_data_posture: RestorePrivacyResurrectedPosture;
  resurrected_subject_count_or_null: number | null;
  resurrected_data_detection_basis_ref_or_null: string | null;
  evaluated_erasure_or_pseudonymisation_refs: readonly string[];
};

export type ClassifyRestoreResurrectedDataPostureInput = {
  reconciliation_completed: boolean;
  resurrected_restricted_data_subject_count_or_null: number | null;
  resurrected_data_detection_basis_ref_or_null: string | null;
  evaluated_erasure_or_pseudonymisation_refs: readonly string[];
};

function requireSubjectCount(value: number | null) {
  if (value === null || !Number.isInteger(value) || value < 0) {
    throw new RecoveryCheckpointModelError(
      "RECOVERY_CHECKPOINT_PRIVACY_INVALID",
      "resurrected restricted-data detection requires a non-negative integer subject count once reconciled",
    );
  }
  return value;
}

function normalizeRefList(label: string, refs: readonly string[]) {
  const normalized = refs.map((ref, index) => requireTrimmedString(`${label}[${index}]`, ref));
  return [...new Set(normalized)].sort((left, right) => left.localeCompare(right));
}

export function classifyRestoreResurrectedDataPosture(
  input: ClassifyRestoreResurrectedDataPostureInput,
): RestoreResurrectedDataPostureClassification {
  const evaluatedRefs = normalizeRefList(
    "restore_resurrected_data.evaluated_erasure_or_pseudonymisation_refs",
    input.evaluated_erasure_or_pseudonymisation_refs,
  );

  if (!input.reconciliation_completed) {
    if (input.resurrected_restricted_data_subject_count_or_null !== null) {
      throw new RecoveryCheckpointModelError(
        "RECOVERY_CHECKPOINT_PRIVACY_INVALID",
        "unreconciled restore privacy posture cannot publish a resurrected subject count",
      );
    }
    return {
      resurrected_data_posture: "UNKNOWN_UNTIL_RECONCILED",
      resurrected_subject_count_or_null: null,
      resurrected_data_detection_basis_ref_or_null: null,
      evaluated_erasure_or_pseudonymisation_refs: evaluatedRefs,
    };
  }

  const detectionBasisRef = requireTrimmedString(
    "restore_resurrected_data.resurrected_data_detection_basis_ref_or_null",
    input.resurrected_data_detection_basis_ref_or_null,
  );
  const subjectCount = requireSubjectCount(input.resurrected_restricted_data_subject_count_or_null);

  if (subjectCount === 0) {
    return {
      resurrected_data_posture: "NONE_DETECTED",
      resurrected_subject_count_or_null: 0,
      resurrected_data_detection_basis_ref_or_null: detectionBasisRef,
      evaluated_erasure_or_pseudonymisation_refs: evaluatedRefs,
    };
  }

  if (evaluatedRefs.length === 0) {
    throw new RecoveryCheckpointModelError(
      "RECOVERY_CHECKPOINT_PRIVACY_INVALID",
      "resurrected restricted data requires at least one erased or pseudonymised lineage ref",
    );
  }
  return {
    resurrected_data_posture: "ERASURE_OR_PSEUDONYMISATION_RESURRECTED",
    resurrected_subject_count_or_null: subjectCount,
    resurrected_data_detection_basis_ref_or_null: detectionBasisRef,
    evaluated_erasure_or_pseudonymisation_refs: evaluatedRefs,
  };
}

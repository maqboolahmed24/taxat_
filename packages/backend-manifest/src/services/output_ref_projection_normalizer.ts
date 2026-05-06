import { stableJsonHash, sortSetLikeStrings } from "../../../domain-kernel/src/primitives/hash.ts";

import type {
  RunManifestAppendOnlyOutcomeProjectionRecord,
  RunManifestOutputLinkMapRecord,
  RunManifestRecord,
} from "../models/run_manifest.ts";

type OutputProjectionNormalizerErrorCode =
  | "RUN_MANIFEST_OUTPUT_LINK_INVALID"
  | "RUN_MANIFEST_OUTPUT_LINK_MISSING";

export class OutputProjectionNormalizerError extends Error {
  readonly code: OutputProjectionNormalizerErrorCode;

  constructor(code: OutputProjectionNormalizerErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "OutputProjectionNormalizerError";
    this.code = code;
  }
}

function assertCondition(condition: unknown, detail: string): asserts condition {
  if (!condition) {
    throw new OutputProjectionNormalizerError(
      "RUN_MANIFEST_OUTPUT_LINK_INVALID",
      detail,
    );
  }
}

function normalizeOutputLinkMap(outputRefs: RunManifestOutputLinkMapRecord) {
  const normalizedEntries = Object.entries(outputRefs)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => {
      assertCondition(
        typeof entry === "object" && entry !== null,
        `${key} must remain a structured output-link entry`,
      );
      assertCondition(
        typeof entry.artifact_ref === "string" && entry.artifact_ref.length > 0,
        `${key}.artifact_ref must be a non-empty string`,
      );
      assertCondition(
        typeof entry.artifact_type === "string" && entry.artifact_type.length > 0,
        `${key}.artifact_type must be a non-empty string`,
      );
      assertCondition(
        typeof entry.produced_by_manifest_id === "string" &&
          entry.produced_by_manifest_id.length > 0,
        `${key}.produced_by_manifest_id must be a non-empty string`,
      );
      return [
        key,
        {
          ...structuredClone(entry),
          dependency_identity_refs: sortSetLikeStrings(entry.dependency_identity_refs ?? []),
        },
      ] as const;
    });
  return Object.fromEntries(normalizedEntries) as RunManifestOutputLinkMapRecord;
}

function deriveProjectionHash(
  projection: Omit<RunManifestAppendOnlyOutcomeProjectionRecord, "projection_hash">,
) {
  return stableJsonHash(projection);
}

export function normalizeAppendOnlyOutcomeProjection(
  projection: RunManifestAppendOnlyOutcomeProjectionRecord,
) {
  const normalizedProjection = structuredClone(projection);
  normalizedProjection.gating_decisions = structuredClone(
    normalizedProjection.gating_decisions,
  );
  normalizedProjection.audit_refs = sortSetLikeStrings(
    normalizedProjection.audit_refs ?? [],
  );
  normalizedProjection.submission_refs = sortSetLikeStrings(
    normalizedProjection.submission_refs ?? [],
  );
  normalizedProjection.drift_refs = sortSetLikeStrings(
    normalizedProjection.drift_refs ?? [],
  );
  normalizedProjection.output_refs = normalizeOutputLinkMap(
    normalizedProjection.output_refs ?? {},
  );
  normalizedProjection.post_seal_basis = {
    ...structuredClone(normalizedProjection.post_seal_basis),
    baseline_envelope_refs: sortSetLikeStrings(
      normalizedProjection.post_seal_basis.baseline_envelope_refs ?? [],
    ),
    baseline_envelope_hashes: sortSetLikeStrings(
      normalizedProjection.post_seal_basis.baseline_envelope_hashes ?? [],
    ),
    temporal_propagation_event_refs: sortSetLikeStrings(
      normalizedProjection.post_seal_basis.temporal_propagation_event_refs ?? [],
    ),
    temporal_propagation_event_hashes: sortSetLikeStrings(
      normalizedProjection.post_seal_basis.temporal_propagation_event_hashes ?? [],
    ),
    authority_calculation_result_refs: sortSetLikeStrings(
      normalizedProjection.post_seal_basis.authority_calculation_result_refs ?? [],
    ),
    authority_calculation_result_hashes: sortSetLikeStrings(
      normalizedProjection.post_seal_basis.authority_calculation_result_hashes ?? [],
    ),
    drift_record_refs: sortSetLikeStrings(
      normalizedProjection.post_seal_basis.drift_record_refs ?? [],
    ),
    drift_record_hashes: sortSetLikeStrings(
      normalizedProjection.post_seal_basis.drift_record_hashes ?? [],
    ),
  };
  normalizedProjection.post_seal_basis.post_seal_basis_hash = stableJsonHash({
    basis_state: normalizedProjection.post_seal_basis.basis_state,
    authority_context_ref: normalizedProjection.post_seal_basis.authority_context_ref,
    authority_context_hash: normalizedProjection.post_seal_basis.authority_context_hash,
    late_data_monitor_result_ref:
      normalizedProjection.post_seal_basis.late_data_monitor_result_ref,
    late_data_monitor_result_hash:
      normalizedProjection.post_seal_basis.late_data_monitor_result_hash,
    baseline_envelope_refs: normalizedProjection.post_seal_basis.baseline_envelope_refs,
    baseline_envelope_hashes:
      normalizedProjection.post_seal_basis.baseline_envelope_hashes,
    temporal_propagation_event_refs:
      normalizedProjection.post_seal_basis.temporal_propagation_event_refs,
    temporal_propagation_event_hashes:
      normalizedProjection.post_seal_basis.temporal_propagation_event_hashes,
    authority_calculation_result_refs:
      normalizedProjection.post_seal_basis.authority_calculation_result_refs,
    authority_calculation_result_hashes:
      normalizedProjection.post_seal_basis.authority_calculation_result_hashes,
    drift_record_refs: normalizedProjection.post_seal_basis.drift_record_refs,
    drift_record_hashes: normalizedProjection.post_seal_basis.drift_record_hashes,
  });
  normalizedProjection.projection_hash = deriveProjectionHash({
    ...structuredClone(normalizedProjection),
  });

  if (
    normalizedProjection.decision_bundle_hash !== null &&
    !Object.values(normalizedProjection.output_refs).some(
      (entry) => entry.linkage_role_code === "DECISION_BUNDLE",
    )
  ) {
    throw new OutputProjectionNormalizerError(
      "RUN_MANIFEST_OUTPUT_LINK_MISSING",
      "decision_bundle_hash requires a structured DECISION_BUNDLE output link",
    );
  }
  for (const submissionRef of normalizedProjection.submission_refs) {
    if (
      !Object.values(normalizedProjection.output_refs).some(
        (entry) =>
          entry.linkage_role_code === "SUBMISSION_RECORD" &&
          entry.artifact_ref === submissionRef,
      )
    ) {
      throw new OutputProjectionNormalizerError(
        "RUN_MANIFEST_OUTPUT_LINK_MISSING",
        `missing structured SUBMISSION_RECORD link for ${submissionRef}`,
      );
    }
  }
  for (const driftRef of normalizedProjection.drift_refs) {
    if (
      !Object.values(normalizedProjection.output_refs).some(
        (entry) =>
          entry.linkage_role_code === "DRIFT_RECORD" &&
          entry.artifact_ref === driftRef,
      )
    ) {
      throw new OutputProjectionNormalizerError(
        "RUN_MANIFEST_OUTPUT_LINK_MISSING",
        `missing structured DRIFT_RECORD link for ${driftRef}`,
      );
    }
  }

  return normalizedProjection;
}

export function synchronizeManifestOutcomeProjectionMirrors(
  manifest: RunManifestRecord,
) {
  if (manifest.append_only_outcome_projection == null) {
    return structuredClone(manifest);
  }

  const normalizedProjection = normalizeAppendOnlyOutcomeProjection(
    manifest.append_only_outcome_projection,
  );
  return {
    ...structuredClone(manifest),
    append_only_outcome_projection: normalizedProjection,
    gating_decisions: structuredClone(normalizedProjection.gating_decisions),
    output_refs: structuredClone(normalizedProjection.output_refs),
    audit_refs: structuredClone(normalizedProjection.audit_refs),
    submission_refs: structuredClone(normalizedProjection.submission_refs),
    drift_refs: structuredClone(normalizedProjection.drift_refs),
    decision_bundle_hash: normalizedProjection.decision_bundle_hash,
    deterministic_outcome_hash: normalizedProjection.deterministic_outcome_hash,
    replay_attestation_ref: normalizedProjection.replay_attestation_ref,
  };
}

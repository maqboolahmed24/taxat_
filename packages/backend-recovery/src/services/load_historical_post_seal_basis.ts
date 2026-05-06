import type {
  ReplayBasisIntegrityContract,
} from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import {
  deriveRunManifestPostSealBasisHash,
  type RunManifestRecord,
} from "../../../backend-manifest/src/index.ts";
import {
  ensureHistoricalArtifactReadable,
  HistoricalReplayBasisLoadError,
  type HistoricalArtifactLoadReceipt,
  type HistoricalArtifactReadPolicy,
} from "./load_historical_config_freeze.ts";

type PostSealBasis = NonNullable<
  RunManifestRecord["append_only_outcome_projection"]
>["post_seal_basis"];

export type LoadedHistoricalPostSealBasis = {
  artifact_load_receipt: HistoricalArtifactLoadReceipt;
  basis_integrity_fragment: Pick<
    ReplayBasisIntegrityContract,
    | "authority_basis_source_class"
    | "baseline_basis_source_class"
    | "late_data_basis_source_class"
    | "temporal_propagation_event_source_class"
  >;
  post_seal_basis: PostSealBasis;
};

function assertRefHashPair(input: {
  artifact_kind: "AUTHORITY_POST_SEAL" | "LATE_DATA_POST_SEAL";
  hash: string | null;
  label: string;
  ref: string | null;
}) {
  if ((input.ref === null) !== (input.hash === null)) {
    throw new HistoricalReplayBasisLoadError({
      artifact_kind: input.artifact_kind,
      basis_validation_state: "CORRUPT",
      code: "HISTORICAL_ARTIFACT_HASH_MISMATCH",
      detail: `${input.label} ref/hash pair must be both present or both null`,
    });
  }
}

function assertRefHashArrayPair(input: {
  artifact_kind:
    | "BASELINE_POST_SEAL"
    | "TEMPORAL_PROPAGATION_POST_SEAL"
    | "AUTHORITY_POST_SEAL";
  hashes: readonly string[];
  label: string;
  refs: readonly string[];
}) {
  if (input.refs.length !== input.hashes.length) {
    throw new HistoricalReplayBasisLoadError({
      artifact_kind: input.artifact_kind,
      basis_validation_state: "CORRUPT",
      code: "HISTORICAL_ARTIFACT_HASH_MISMATCH",
      detail: `${input.label} refs and hashes must have the same cardinality`,
    });
  }
}

function sourceClassForMaterial(
  material: boolean,
): "HISTORICAL_POST_SEAL_REUSED" | "NOT_MATERIAL" {
  return material ? "HISTORICAL_POST_SEAL_REUSED" : "NOT_MATERIAL";
}

export function loadHistoricalPostSealBasis(input: {
  read_policy?: HistoricalArtifactReadPolicy;
  require_material_basis?: boolean;
  source_manifest: RunManifestRecord;
}): LoadedHistoricalPostSealBasis {
  ensureHistoricalArtifactReadable({
    artifact_kind: "POST_SEAL",
    policy: input.read_policy,
  });

  const postSealBasis = input.source_manifest.append_only_outcome_projection?.post_seal_basis;
  if (postSealBasis == null) {
    throw new HistoricalReplayBasisLoadError({
      artifact_kind: "POST_SEAL",
      basis_validation_state: "MISSING_DEPENDENCY",
      code: "HISTORICAL_POST_SEAL_BASIS_MISSING",
      detail: "source manifest does not retain append_only_outcome_projection.post_seal_basis",
    });
  }
  if (input.require_material_basis === true && postSealBasis.basis_state !== "MATERIAL") {
    throw new HistoricalReplayBasisLoadError({
      artifact_kind: "POST_SEAL",
      basis_validation_state: "MISSING_DEPENDENCY",
      code: "HISTORICAL_POST_SEAL_BASIS_MISSING",
      detail: "a material historical post-seal basis is required for this replay",
    });
  }

  const expectedHash = deriveRunManifestPostSealBasisHash(postSealBasis);
  if (postSealBasis.post_seal_basis_hash !== expectedHash) {
    throw new HistoricalReplayBasisLoadError({
      artifact_kind: "POST_SEAL",
      basis_validation_state: "CORRUPT",
      code: "HISTORICAL_ARTIFACT_HASH_MISMATCH",
      detail: "post_seal_basis_hash must match retained post-seal basis content",
    });
  }

  assertRefHashPair({
    artifact_kind: "AUTHORITY_POST_SEAL",
    hash: postSealBasis.authority_context_hash,
    label: "authority_context",
    ref: postSealBasis.authority_context_ref,
  });
  assertRefHashPair({
    artifact_kind: "LATE_DATA_POST_SEAL",
    hash: postSealBasis.late_data_monitor_result_hash,
    label: "late_data_monitor_result",
    ref: postSealBasis.late_data_monitor_result_ref,
  });
  assertRefHashArrayPair({
    artifact_kind: "BASELINE_POST_SEAL",
    hashes: postSealBasis.baseline_envelope_hashes,
    label: "baseline_envelope",
    refs: postSealBasis.baseline_envelope_refs,
  });
  assertRefHashArrayPair({
    artifact_kind: "TEMPORAL_PROPAGATION_POST_SEAL",
    hashes: postSealBasis.temporal_propagation_event_hashes,
    label: "temporal_propagation_event",
    refs: postSealBasis.temporal_propagation_event_refs,
  });
  assertRefHashArrayPair({
    artifact_kind: "AUTHORITY_POST_SEAL",
    hashes: postSealBasis.authority_calculation_result_hashes,
    label: "authority_calculation_result",
    refs: postSealBasis.authority_calculation_result_refs,
  });
  assertRefHashArrayPair({
    artifact_kind: "AUTHORITY_POST_SEAL",
    hashes: postSealBasis.drift_record_hashes,
    label: "drift_record",
    refs: postSealBasis.drift_record_refs,
  });

  return {
    artifact_load_receipt: {
      artifact_kind: "POST_SEAL",
      artifact_ref: `post-seal-basis://${input.source_manifest.manifest_id}`,
      artifact_type: "RunManifestPostSealBasis",
      basis_validation_state: "VALID",
      content_hash: postSealBasis.post_seal_basis_hash,
      decryptability_verified: input.read_policy?.decryptable !== false,
      schema_reader_compatible: input.read_policy?.reader_schema_compatible !== false,
    },
    basis_integrity_fragment: {
      authority_basis_source_class: sourceClassForMaterial(
        postSealBasis.authority_context_ref !== null ||
          postSealBasis.authority_calculation_result_refs.length > 0 ||
          postSealBasis.drift_record_refs.length > 0,
      ),
      baseline_basis_source_class: sourceClassForMaterial(
        postSealBasis.baseline_envelope_refs.length > 0,
      ),
      late_data_basis_source_class: sourceClassForMaterial(
        postSealBasis.late_data_monitor_result_ref !== null,
      ),
      temporal_propagation_event_source_class: sourceClassForMaterial(
        postSealBasis.temporal_propagation_event_refs.length > 0,
      ),
    },
    post_seal_basis: structuredClone(postSealBasis),
  };
}

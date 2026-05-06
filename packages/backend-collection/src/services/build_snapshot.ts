import {
  buildSnapshotContract,
  buildSnapshotStateTransitionContract,
  deriveSnapshotContentHash,
  deriveSnapshotId,
  normalizeSnapshotRecord,
  type SnapshotRecord,
} from "../models/snapshot.ts";
import { normalizeCollectionString, normalizeCollectionStringSet } from "../models/collection_control_common.ts";
import type { SnapshotRepository } from "../repositories/snapshot_repository.ts";
import type {
  SnapshotAssemblyCompletenessInput,
  SnapshotAssemblyQualityInput,
  SnapshotAssemblySetBindings,
  SnapshotBoundSetArtifactType,
  SnapshotBoundSetRef,
} from "../types/snapshot_assembly_input.ts";
import { measureSnapshotCompleteness } from "./measure_snapshot_completeness.ts";
import { validateSnapshotQuality } from "./validate_snapshot_quality.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";

export type BuildSnapshotErrorCode =
  | "SNAPSHOT_ANALYSIS_BASIS_REQUIRED"
  | "SNAPSHOT_EXECUTION_MODE_MISMATCH"
  | "SNAPSHOT_SET_ARTIFACT_TYPE_INVALID"
  | "SNAPSHOT_SET_MANIFEST_MISMATCH";

export class BuildSnapshotError extends Error {
  readonly code: BuildSnapshotErrorCode;

  constructor(code: BuildSnapshotErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "BuildSnapshotError";
    this.code = code;
  }
}

export type BuildSnapshotInput = {
  analysis_only?: boolean;
  audit_refs?: readonly string[];
  built_at: string;
  completeness?: SnapshotAssemblyCompletenessInput;
  counterfactual_basis?: string | null;
  execution_mode?: "COMPLIANCE" | "ANALYSIS";
  manifest_id: string;
  non_compliance_config_refs?: readonly string[];
  persisted_at?: string;
  provenance_refs?: readonly string[];
  quality?: SnapshotAssemblyQualityInput;
  repository?: SnapshotRepository;
  schema_bundle_hash?: string;
  set_bindings: SnapshotAssemblySetBindings;
  snapshot_id?: string;
  transition_audit_ref?: string;
  writer_build_id?: string;
};

function defaultTransitionAuditRef(snapshotId: string) {
  return `audit://snapshot/${snapshotId}/snapshot_built`;
}

function normalizeSetBinding<TArtifactType extends SnapshotBoundSetArtifactType>(
  label: string,
  expectedArtifactType: TArtifactType,
  manifestId: string,
  binding: SnapshotBoundSetRef<TArtifactType>,
): SnapshotBoundSetRef<TArtifactType> {
  if (binding.artifact_type !== expectedArtifactType) {
    throw new BuildSnapshotError(
      "SNAPSHOT_SET_ARTIFACT_TYPE_INVALID",
      `${label} must bind ${expectedArtifactType}`,
    );
  }
  const bindingManifestId = normalizeCollectionString(
    `${label}.manifest_id`,
    binding.manifest_id,
  );
  if (bindingManifestId !== manifestId) {
    throw new BuildSnapshotError(
      "SNAPSHOT_SET_MANIFEST_MISMATCH",
      `${label} manifest_id must match snapshot manifest_id`,
    );
  }
  return {
    ...(binding.artifact_contract_hash === undefined
      ? {}
      : {
          artifact_contract_hash: normalizeCollectionString(
            `${label}.artifact_contract_hash`,
            binding.artifact_contract_hash,
          ),
        }),
    artifact_type: expectedArtifactType,
    ...(binding.item_count === undefined ? {} : { item_count: binding.item_count }),
    ...(binding.item_identity_hash === undefined
      ? {}
      : {
          item_identity_hash: normalizeCollectionString(
            `${label}.item_identity_hash`,
            binding.item_identity_hash,
          ),
        }),
    manifest_id: bindingManifestId,
    ...(binding.produced_at === undefined
      ? {}
      : { produced_at: normalizeUtcInstantString(binding.produced_at) }),
    set_hash: normalizeCollectionString(`${label}.set_hash`, binding.set_hash),
    set_ref: normalizeCollectionString(`${label}.set_ref`, binding.set_ref),
  };
}

function normalizeSetBindings(
  manifestId: string,
  input: SnapshotAssemblySetBindings,
): SnapshotAssemblySetBindings {
  return {
    candidate_fact_set: normalizeSetBinding(
      "snapshot.candidate_fact_set",
      "CandidateFactSet",
      manifestId,
      input.candidate_fact_set,
    ),
    canonical_fact_set: normalizeSetBinding(
      "snapshot.canonical_fact_set",
      "CanonicalFactSet",
      manifestId,
      input.canonical_fact_set,
    ),
    conflict_set: normalizeSetBinding(
      "snapshot.conflict_set",
      "ConflictSet",
      manifestId,
      input.conflict_set,
    ),
    evidence_item_set: normalizeSetBinding(
      "snapshot.evidence_item_set",
      "EvidenceItemSet",
      manifestId,
      input.evidence_item_set,
    ),
    source_record_set: normalizeSetBinding(
      "snapshot.source_record_set",
      "SourceRecordSet",
      manifestId,
      input.source_record_set,
    ),
  };
}

function resolveExecutionMode(input: {
  analysis_only?: boolean;
  counterfactual_basis?: string | null;
  execution_mode?: "COMPLIANCE" | "ANALYSIS";
}) {
  const counterfactualBasis =
    input.counterfactual_basis === undefined
      ? null
      : input.counterfactual_basis === null
        ? null
        : normalizeCollectionString("snapshot.counterfactual_basis", input.counterfactual_basis);
  const inferredAnalysisOnly =
    input.analysis_only ?? (input.execution_mode === "ANALYSIS" || counterfactualBasis !== null);
  const executionMode = inferredAnalysisOnly ? "ANALYSIS" : "COMPLIANCE";

  if (input.execution_mode !== undefined && input.execution_mode !== executionMode) {
    throw new BuildSnapshotError(
      "SNAPSHOT_EXECUTION_MODE_MISMATCH",
      "execution_mode must match analysis_only and counterfactual basis",
    );
  }
  if (executionMode === "ANALYSIS" && counterfactualBasis === null) {
    throw new BuildSnapshotError(
      "SNAPSHOT_ANALYSIS_BASIS_REQUIRED",
      "ANALYSIS snapshots require a counterfactual basis",
    );
  }

  return {
    analysis_only: inferredAnalysisOnly,
    counterfactual_basis: counterfactualBasis,
    execution_mode: executionMode,
  };
}

export function buildSnapshotRecord(input: BuildSnapshotInput): SnapshotRecord {
  const manifestId = normalizeCollectionString("snapshot.manifest_id", input.manifest_id);
  const builtAt = normalizeUtcInstantString(input.built_at);
  const setBindings = normalizeSetBindings(manifestId, input.set_bindings);
  const execution = resolveExecutionMode(input);
  const snapshotId =
    input.snapshot_id ??
    deriveSnapshotId({
      candidate_fact_set_hash: setBindings.candidate_fact_set.set_hash,
      canonical_fact_set_hash: setBindings.canonical_fact_set.set_hash,
      conflict_set_hash: setBindings.conflict_set.set_hash,
      counterfactual_basis: execution.counterfactual_basis,
      evidence_item_set_hash: setBindings.evidence_item_set.set_hash,
      execution_mode: execution.execution_mode,
      manifest_id: manifestId,
      source_record_set_hash: setBindings.source_record_set.set_hash,
    });
  const transitionAuditRef = input.transition_audit_ref ?? defaultTransitionAuditRef(snapshotId);
  const quality = validateSnapshotQuality({
    ...(input.quality ?? {}),
    set_bindings: setBindings,
  });
  const completeness = measureSnapshotCompleteness({
    ...(input.completeness ?? {}),
    set_bindings: setBindings,
  });
  const auditRefs = normalizeCollectionStringSet(
    "snapshot.audit_refs",
    [transitionAuditRef, ...(input.audit_refs ?? [])],
    { minItems: 1 },
  );
  const provenanceRefs = normalizeCollectionStringSet("snapshot.provenance_refs", [
    setBindings.source_record_set.set_ref,
    setBindings.evidence_item_set.set_ref,
    setBindings.candidate_fact_set.set_ref,
    setBindings.conflict_set.set_ref,
    setBindings.canonical_fact_set.set_ref,
    ...(input.provenance_refs ?? []),
  ]);
  const nonComplianceConfigRefs =
    execution.execution_mode === "COMPLIANCE"
      ? []
      : normalizeCollectionStringSet(
          "snapshot.non_compliance_config_refs",
          input.non_compliance_config_refs ?? [],
        );
  const contractless = {
    analysis_only: execution.analysis_only,
    artifact_type: "Snapshot" as const,
    audit_refs: auditRefs,
    candidate_fact_set_hash: setBindings.candidate_fact_set.set_hash,
    candidate_fact_set_ref: setBindings.candidate_fact_set.set_ref,
    canonical_fact_set_hash: setBindings.canonical_fact_set.set_hash,
    canonical_fact_set_ref: setBindings.canonical_fact_set.set_ref,
    completeness,
    conflict_set_hash: setBindings.conflict_set.set_hash,
    conflict_set_ref: setBindings.conflict_set.set_ref,
    counterfactual_basis: execution.counterfactual_basis,
    created_at: builtAt,
    erasure_proof_ref_or_null: null,
    evidence_item_set_hash: setBindings.evidence_item_set.set_hash,
    evidence_item_set_ref: setBindings.evidence_item_set.set_ref,
    execution_mode: execution.execution_mode,
    lifecycle_state: "BUILT" as const,
    manifest_id: manifestId,
    non_compliance_config_refs: nonComplianceConfigRefs,
    provenance_refs: provenanceRefs,
    quality,
    retention_limitation_ref_or_null: null,
    snapshot_id: snapshotId,
    source_record_set_hash: setBindings.source_record_set.set_hash,
    source_record_set_ref: setBindings.source_record_set.set_ref,
    state_changed_at: builtAt,
    state_transition_contract: buildSnapshotStateTransitionContract({
      current_state: "BUILT",
      previous_state_or_null: null,
      transition_applied_at: builtAt,
      transition_audit_ref: transitionAuditRef,
      transition_event_code: "snapshot_built",
    }),
    superseded_by_snapshot_id_or_null: null,
  };
  const contentHash = deriveSnapshotContentHash(contractless);
  const contract = buildSnapshotContract({
    ...(input.schema_bundle_hash === undefined
      ? {}
      : { schema_bundle_hash: input.schema_bundle_hash }),
    snapshot_content_hash: contentHash,
    snapshot_id: snapshotId,
    ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
  });

  return normalizeSnapshotRecord({
    ...contractless,
    contract,
  });
}

export async function buildSnapshot(input: BuildSnapshotInput): Promise<SnapshotRecord> {
  const snapshot = buildSnapshotRecord(input);
  if (input.repository) {
    await input.repository.persistSnapshot({
      persisted_at: input.persisted_at ?? input.built_at,
      snapshot,
    });
  }
  return snapshot;
}

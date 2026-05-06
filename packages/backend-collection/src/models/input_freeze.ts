import { InputFreezeSchemaLineage } from "../../../generated-models/src/generated/typescript/provenance-and-evidence.ts";
import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  buildCollectionArtifactContract,
  deriveCollectionControlHash,
  normalizeCollectionRuntimeScopes,
  normalizeCollectionSourceClassOrNull,
  normalizeCollectionString,
  normalizeCollectionStringSet,
  normalizeLateDataPolicyRef,
  type CollectionLateDataPolicyRef,
  type CollectionSourceClassOrNull,
} from "./collection_control_common.ts";
import type { CollectionBoundaryDisposition } from "./collection_boundary.ts";
import type { ConflictResolutionFrontier } from "./conflict_set.ts";
import type { DominantConflictBlockingClass } from "./conflict_record.ts";
import {
  normalizeLateDataPolicyBinding,
  type LateDataPolicyBindingRecord,
  type LateDataRuntimeScopeRefs,
} from "./late_data_indicator.ts";

export type InputFreezeSourceDomainPostureRecord = {
  boundary_disposition: CollectionBoundaryDisposition;
  canonical_fact_count: number;
  candidate_fact_count: number;
  conflict_count: number;
  evidence_item_count: number;
  late_data_policy_ref: CollectionLateDataPolicyRef;
  partition_scope_refs: string[];
  runtime_scope_refs: LateDataRuntimeScopeRefs;
  source_class: CollectionSourceClassOrNull;
  source_domain: string;
  source_record_count: number;
};

export type InputFreezeRecord = {
  artifact_contract_hash: string;
  artifact_contract_refs: string[];
  artifact_type: "InputFreeze";
  blocking_conflict_count: number;
  candidate_fact_refs: string[];
  canonical_fact_refs: string[];
  collection_boundary_hash: string;
  collection_boundary_ref: string;
  conflict_refs: string[];
  connector_build_id: string;
  connector_profile_ref: string;
  contract: SchemaBundleArtifactContract;
  cursor_checkpoint_refs: string[];
  dominant_blocking_class: DominantConflictBlockingClass | null;
  evidence_item_refs: string[];
  exclusion_refs: string[];
  input_consumption_mode: "FROZEN_INPUT_ONLY";
  input_freeze_id: string;
  input_policy_ref: string;
  input_set_hash: string;
  late_data_adoption_policy: "CHILD_REVIEW_OR_EXCLUDE_ONLY";
  late_data_policy_bindings: LateDataPolicyBindingRecord[];
  manifest_id: string;
  missing_source_declarations: string[];
  no_data_confirmed_declarations: string[];
  normalization_context_hash: string;
  normalization_context_ref: string;
  open_conflict_count: number;
  provider_api_versions: string[];
  provider_environment_refs: string[];
  provider_schema_versions: string[];
  read_cutoff_at: string;
  request_audit_refs: string[];
  resolution_frontier: ConflictResolutionFrontier;
  source_domain_postures: InputFreezeSourceDomainPostureRecord[];
  source_plan_hash: string;
  source_plan_ref: string;
  source_record_refs: string[];
  source_window_hash: string;
  source_window_ref: string;
  stale_source_declarations: string[];
};

export type InputFreezeContractlessRecord = Omit<InputFreezeRecord, "contract">;

export type InputFreezeModelErrorCode =
  | "INPUT_FREEZE_ARTIFACT_CONTRACT_REFS_REQUIRED"
  | "INPUT_FREEZE_ARTIFACT_TYPE_INVALID"
  | "INPUT_FREEZE_CONFLICT_FRONTIER_MISMATCH"
  | "INPUT_FREEZE_CONSTANT_INVALID"
  | "INPUT_FREEZE_DECLARATION_POSTURE_MISMATCH"
  | "INPUT_FREEZE_HASH_REQUIRED"
  | "INPUT_FREEZE_POSTURE_DUPLICATE"
  | "INPUT_FREEZE_POSTURE_INVALID";

export class InputFreezeModelError extends Error {
  readonly code: InputFreezeModelErrorCode;

  constructor(code: InputFreezeModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "InputFreezeModelError";
    this.code = code;
  }
}

function normalizeConflictFrontier(value: unknown): ConflictResolutionFrontier {
  const normalized = normalizeCollectionString("input_freeze.resolution_frontier", value);
  if (
    normalized !== "CLEAR" &&
    normalized !== "MONITORING_ONLY" &&
    normalized !== "BLOCKING_PRESENT"
  ) {
    throw new InputFreezeModelError(
      "INPUT_FREEZE_CONFLICT_FRONTIER_MISMATCH",
      "resolution_frontier must be CLEAR, MONITORING_ONLY, or BLOCKING_PRESENT",
    );
  }
  return normalized;
}

function normalizeDominantBlockingClass(value: DominantConflictBlockingClass | null) {
  if (value === null) {
    return null;
  }
  const normalized = normalizeCollectionString("input_freeze.dominant_blocking_class", value);
  if (
    normalized !== "BLOCKS_AUTOMATION" &&
    normalized !== "BLOCKS_REVIEW_PROGRESS" &&
    normalized !== "BLOCKS_FILING" &&
    normalized !== "BLOCKS_AMENDMENT" &&
    normalized !== "BLOCKS_ERASURE" &&
    normalized !== "BLOCKS_RUN" &&
    normalized !== "BLOCKS_AUTHORITY_CALL"
  ) {
    throw new InputFreezeModelError(
      "INPUT_FREEZE_CONFLICT_FRONTIER_MISMATCH",
      "dominant_blocking_class must be null or a blocking conflict class",
    );
  }
  return normalized as DominantConflictBlockingClass;
}

function normalizeDisposition(value: unknown): CollectionBoundaryDisposition {
  const normalized = normalizeCollectionString(
    "input_freeze.source_domain_posture.boundary_disposition",
    value,
  );
  if (
    normalized !== "IN_SCOPE_COLLECTED" &&
    normalized !== "NO_DATA_CONFIRMED_AT_CUTOFF" &&
    normalized !== "EXCLUDED_BY_POLICY" &&
    normalized !== "MISSING_AT_CUTOFF" &&
    normalized !== "STALE_AT_CUTOFF"
  ) {
    throw new InputFreezeModelError(
      "INPUT_FREEZE_POSTURE_INVALID",
      "boundary_disposition must be canonical",
    );
  }
  return normalized;
}

function normalizeCount(label: string, value: number) {
  if (!Number.isInteger(value) || value < 0) {
    throw new InputFreezeModelError(
      "INPUT_FREEZE_POSTURE_INVALID",
      `${label} must be a non-negative integer`,
    );
  }
  return value;
}

export function inputFreezeRef(record: Pick<InputFreezeRecord, "input_freeze_id">) {
  return `input-freeze://${record.input_freeze_id}`;
}

export function normalizeInputFreezeSourceDomainPosture(
  input: InputFreezeSourceDomainPostureRecord,
): InputFreezeSourceDomainPostureRecord {
  const posture: InputFreezeSourceDomainPostureRecord = {
    boundary_disposition: normalizeDisposition(input.boundary_disposition),
    canonical_fact_count: normalizeCount(
      "source_domain_posture.canonical_fact_count",
      input.canonical_fact_count,
    ),
    candidate_fact_count: normalizeCount(
      "source_domain_posture.candidate_fact_count",
      input.candidate_fact_count,
    ),
    conflict_count: normalizeCount("source_domain_posture.conflict_count", input.conflict_count),
    evidence_item_count: normalizeCount(
      "source_domain_posture.evidence_item_count",
      input.evidence_item_count,
    ),
    late_data_policy_ref: normalizeLateDataPolicyRef(
      "source_domain_posture.late_data_policy_ref",
      input.late_data_policy_ref,
    ),
    partition_scope_refs: normalizeCollectionStringSet(
      "source_domain_posture.partition_scope_refs",
      input.partition_scope_refs,
    ),
    runtime_scope_refs: normalizeCollectionRuntimeScopes(
      "source_domain_posture.runtime_scope_refs",
      input.runtime_scope_refs,
    ) as LateDataRuntimeScopeRefs,
    source_class: normalizeCollectionSourceClassOrNull(
      "source_domain_posture.source_class",
      input.source_class,
    ),
    source_domain: normalizeCollectionString("source_domain_posture.source_domain", input.source_domain),
    source_record_count: normalizeCount(
      "source_domain_posture.source_record_count",
      input.source_record_count,
    ),
  };
  const nonzeroCounts = [
    posture.canonical_fact_count,
    posture.candidate_fact_count,
    posture.conflict_count,
    posture.evidence_item_count,
    posture.source_record_count,
  ].some((count) => count > 0);
  if (posture.boundary_disposition === "IN_SCOPE_COLLECTED" && posture.source_record_count < 1) {
    throw new InputFreezeModelError(
      "INPUT_FREEZE_POSTURE_INVALID",
      "collected source-domain postures require at least one source record",
    );
  }
  if (posture.boundary_disposition !== "IN_SCOPE_COLLECTED" && nonzeroCounts) {
    throw new InputFreezeModelError(
      "INPUT_FREEZE_POSTURE_INVALID",
      "non-collected source-domain postures must keep artifact counts at zero",
    );
  }
  return posture;
}

function assertConflictFrontier(input: InputFreezeRecord) {
  if (input.blocking_conflict_count > input.open_conflict_count) {
    throw new InputFreezeModelError(
      "INPUT_FREEZE_CONFLICT_FRONTIER_MISMATCH",
      "blocking_conflict_count cannot exceed open_conflict_count",
    );
  }
  if (input.open_conflict_count > input.conflict_refs.length) {
    throw new InputFreezeModelError(
      "INPUT_FREEZE_CONFLICT_FRONTIER_MISMATCH",
      "open_conflict_count cannot exceed conflict_refs length",
    );
  }
  if (
    input.open_conflict_count === 0 &&
    (input.blocking_conflict_count !== 0 ||
      input.resolution_frontier !== "CLEAR" ||
      input.dominant_blocking_class !== null)
  ) {
    throw new InputFreezeModelError(
      "INPUT_FREEZE_CONFLICT_FRONTIER_MISMATCH",
      "zero open conflicts require CLEAR frontier and null dominant_blocking_class",
    );
  }
  if (
    input.open_conflict_count > 0 &&
    input.blocking_conflict_count === 0 &&
    (input.resolution_frontier !== "MONITORING_ONLY" || input.dominant_blocking_class !== null)
  ) {
    throw new InputFreezeModelError(
      "INPUT_FREEZE_CONFLICT_FRONTIER_MISMATCH",
      "open non-blocking conflicts require MONITORING_ONLY frontier",
    );
  }
  if (
    input.blocking_conflict_count > 0 &&
    (input.resolution_frontier !== "BLOCKING_PRESENT" || input.dominant_blocking_class === null)
  ) {
    throw new InputFreezeModelError(
      "INPUT_FREEZE_CONFLICT_FRONTIER_MISMATCH",
      "blocking conflicts require BLOCKING_PRESENT frontier and dominant_blocking_class",
    );
  }
}

function assertPostures(input: InputFreezeRecord) {
  const postureDomains = input.source_domain_postures.map((posture) => posture.source_domain);
  const seen = new Set<string>();
  for (const sourceDomain of postureDomains) {
    if (seen.has(sourceDomain)) {
      throw new InputFreezeModelError(
        "INPUT_FREEZE_POSTURE_DUPLICATE",
        `source_domain_postures contains duplicate domain ${sourceDomain}`,
      );
    }
    seen.add(sourceDomain);
  }
  if (postureDomains.length === 0) {
    throw new InputFreezeModelError(
      "INPUT_FREEZE_POSTURE_INVALID",
      "source_domain_postures must explicitly account for at least one source domain",
    );
  }
  const expectedOrder = [...postureDomains].sort();
  if (JSON.stringify(postureDomains) !== JSON.stringify(expectedOrder)) {
    throw new InputFreezeModelError(
      "INPUT_FREEZE_POSTURE_INVALID",
      "source_domain_postures must be sorted by source_domain",
    );
  }

  const expectedByDisposition = {
    EXCLUDED_BY_POLICY: input.source_domain_postures
      .filter((posture) => posture.boundary_disposition === "EXCLUDED_BY_POLICY")
      .map((posture) => posture.source_domain),
    MISSING_AT_CUTOFF: input.source_domain_postures
      .filter((posture) => posture.boundary_disposition === "MISSING_AT_CUTOFF")
      .map((posture) => posture.source_domain),
    NO_DATA_CONFIRMED_AT_CUTOFF: input.source_domain_postures
      .filter((posture) => posture.boundary_disposition === "NO_DATA_CONFIRMED_AT_CUTOFF")
      .map((posture) => posture.source_domain),
    STALE_AT_CUTOFF: input.source_domain_postures
      .filter((posture) => posture.boundary_disposition === "STALE_AT_CUTOFF")
      .map((posture) => posture.source_domain),
  };
  const actual = {
    EXCLUDED_BY_POLICY: input.exclusion_refs,
    MISSING_AT_CUTOFF: input.missing_source_declarations,
    NO_DATA_CONFIRMED_AT_CUTOFF: input.no_data_confirmed_declarations,
    STALE_AT_CUTOFF: input.stale_source_declarations,
  };
  for (const key of Object.keys(expectedByDisposition) as Array<
    keyof typeof expectedByDisposition
  >) {
    if (JSON.stringify(expectedByDisposition[key]) !== JSON.stringify(actual[key])) {
      throw new InputFreezeModelError(
        "INPUT_FREEZE_DECLARATION_POSTURE_MISMATCH",
        `${key} declaration refs must mirror source_domain_postures`,
      );
    }
  }
}

function normalizeInputFreezeContractless(
  input: InputFreezeContractlessRecord,
): InputFreezeContractlessRecord {
  if (input.artifact_type !== "InputFreeze") {
    throw new InputFreezeModelError(
      "INPUT_FREEZE_ARTIFACT_TYPE_INVALID",
      "input freeze records must carry artifact_type InputFreeze",
    );
  }
  if (input.input_consumption_mode !== "FROZEN_INPUT_ONLY") {
    throw new InputFreezeModelError(
      "INPUT_FREEZE_CONSTANT_INVALID",
      "input_consumption_mode must be FROZEN_INPUT_ONLY",
    );
  }
  if (input.late_data_adoption_policy !== "CHILD_REVIEW_OR_EXCLUDE_ONLY") {
    throw new InputFreezeModelError(
      "INPUT_FREEZE_CONSTANT_INVALID",
      "late_data_adoption_policy must be CHILD_REVIEW_OR_EXCLUDE_ONLY",
    );
  }
  const artifactContractRefs = normalizeCollectionStringSet(
    "input_freeze.artifact_contract_refs",
    input.artifact_contract_refs,
    { minItems: 10 },
  );
  if (artifactContractRefs.length < 10) {
    throw new InputFreezeModelError(
      "INPUT_FREEZE_ARTIFACT_CONTRACT_REFS_REQUIRED",
      "artifact_contract_refs must cover the full pre-seal intake pack",
    );
  }
  const artifactContractHash = normalizeCollectionString(
    "input_freeze.artifact_contract_hash",
    input.artifact_contract_hash,
  );
  const inputSetHash = normalizeCollectionString("input_freeze.input_set_hash", input.input_set_hash);

  const record: InputFreezeContractlessRecord = {
    artifact_contract_hash: artifactContractHash,
    artifact_contract_refs: artifactContractRefs,
    artifact_type: "InputFreeze",
    blocking_conflict_count: normalizeCount(
      "input_freeze.blocking_conflict_count",
      input.blocking_conflict_count,
    ),
    candidate_fact_refs: normalizeCollectionStringSet(
      "input_freeze.candidate_fact_refs",
      input.candidate_fact_refs,
    ),
    canonical_fact_refs: normalizeCollectionStringSet(
      "input_freeze.canonical_fact_refs",
      input.canonical_fact_refs,
    ),
    collection_boundary_hash: normalizeCollectionString(
      "input_freeze.collection_boundary_hash",
      input.collection_boundary_hash,
    ),
    collection_boundary_ref: normalizeCollectionString(
      "input_freeze.collection_boundary_ref",
      input.collection_boundary_ref,
    ),
    conflict_refs: normalizeCollectionStringSet("input_freeze.conflict_refs", input.conflict_refs),
    connector_build_id: normalizeCollectionString(
      "input_freeze.connector_build_id",
      input.connector_build_id,
    ),
    connector_profile_ref: normalizeCollectionString(
      "input_freeze.connector_profile_ref",
      input.connector_profile_ref,
    ),
    cursor_checkpoint_refs: normalizeCollectionStringSet(
      "input_freeze.cursor_checkpoint_refs",
      input.cursor_checkpoint_refs,
    ),
    dominant_blocking_class: normalizeDominantBlockingClass(input.dominant_blocking_class),
    evidence_item_refs: normalizeCollectionStringSet(
      "input_freeze.evidence_item_refs",
      input.evidence_item_refs,
    ),
    exclusion_refs: normalizeCollectionStringSet("input_freeze.exclusion_refs", input.exclusion_refs),
    input_consumption_mode: "FROZEN_INPUT_ONLY",
    input_freeze_id: normalizeCollectionString(
      "input_freeze.input_freeze_id",
      input.input_freeze_id,
    ),
    input_policy_ref: normalizeCollectionString("input_freeze.input_policy_ref", input.input_policy_ref),
    input_set_hash: inputSetHash,
    late_data_adoption_policy: "CHILD_REVIEW_OR_EXCLUDE_ONLY",
    late_data_policy_bindings: input.late_data_policy_bindings
      .map((binding) => normalizeLateDataPolicyBinding(binding))
      .sort(
        (left, right) =>
          left.precedence_rank - right.precedence_rank ||
          left.source_domain.localeCompare(right.source_domain) ||
          (left.source_class ?? "").localeCompare(right.source_class ?? "") ||
          left.partition_scope_refs.join("\u001f").localeCompare(right.partition_scope_refs.join("\u001f")) ||
          left.runtime_scope_refs.join("\u001f").localeCompare(right.runtime_scope_refs.join("\u001f")) ||
          left.late_data_policy_ref.localeCompare(right.late_data_policy_ref),
      ),
    manifest_id: normalizeCollectionString("input_freeze.manifest_id", input.manifest_id),
    missing_source_declarations: normalizeCollectionStringSet(
      "input_freeze.missing_source_declarations",
      input.missing_source_declarations,
    ),
    no_data_confirmed_declarations: normalizeCollectionStringSet(
      "input_freeze.no_data_confirmed_declarations",
      input.no_data_confirmed_declarations,
    ),
    normalization_context_hash: normalizeCollectionString(
      "input_freeze.normalization_context_hash",
      input.normalization_context_hash,
    ),
    normalization_context_ref: normalizeCollectionString(
      "input_freeze.normalization_context_ref",
      input.normalization_context_ref,
    ),
    open_conflict_count: normalizeCount(
      "input_freeze.open_conflict_count",
      input.open_conflict_count,
    ),
    provider_api_versions: normalizeCollectionStringSet(
      "input_freeze.provider_api_versions",
      input.provider_api_versions,
    ),
    provider_environment_refs: normalizeCollectionStringSet(
      "input_freeze.provider_environment_refs",
      input.provider_environment_refs,
    ),
    provider_schema_versions: normalizeCollectionStringSet(
      "input_freeze.provider_schema_versions",
      input.provider_schema_versions,
    ),
    read_cutoff_at: normalizeUtcInstantString(input.read_cutoff_at),
    request_audit_refs: normalizeCollectionStringSet(
      "input_freeze.request_audit_refs",
      input.request_audit_refs,
    ),
    resolution_frontier: normalizeConflictFrontier(input.resolution_frontier),
    source_domain_postures: input.source_domain_postures
      .map((posture) => normalizeInputFreezeSourceDomainPosture(posture))
      .sort((left, right) => left.source_domain.localeCompare(right.source_domain)),
    source_plan_hash: normalizeCollectionString(
      "input_freeze.source_plan_hash",
      input.source_plan_hash,
    ),
    source_plan_ref: normalizeCollectionString("input_freeze.source_plan_ref", input.source_plan_ref),
    source_record_refs: normalizeCollectionStringSet(
      "input_freeze.source_record_refs",
      input.source_record_refs,
    ),
    source_window_hash: normalizeCollectionString(
      "input_freeze.source_window_hash",
      input.source_window_hash,
    ),
    source_window_ref: normalizeCollectionString(
      "input_freeze.source_window_ref",
      input.source_window_ref,
    ),
    stale_source_declarations: normalizeCollectionStringSet(
      "input_freeze.stale_source_declarations",
      input.stale_source_declarations,
    ),
  };
  if (record.late_data_policy_bindings.length === 0) {
    throw new InputFreezeModelError(
      "INPUT_FREEZE_CONSTANT_INVALID",
      "late_data_policy_bindings must contain at least one frozen binding",
    );
  }
  if (
    (record.candidate_fact_refs.length > 0 || record.canonical_fact_refs.length > 0) &&
    record.evidence_item_refs.length === 0
  ) {
    throw new InputFreezeModelError(
      "INPUT_FREEZE_POSTURE_INVALID",
      "candidate or canonical facts require evidence_item_refs in the frozen input set",
    );
  }
  if (record.canonical_fact_refs.length > 0 && record.candidate_fact_refs.length === 0) {
    throw new InputFreezeModelError(
      "INPUT_FREEZE_POSTURE_INVALID",
      "canonical facts require candidate_fact_refs in the frozen input set",
    );
  }
  return record;
}

export function normalizeInputFreezeRecord(input: InputFreezeRecord): InputFreezeRecord {
  const record = {
    ...normalizeInputFreezeContractless(input),
    contract: structuredClone(input.contract),
  };
  assertConflictFrontier(record);
  assertPostures(record);
  return record;
}

export function deriveInputFreezeContentHash(record: InputFreezeContractlessRecord) {
  return `input-freeze-content-hash://${deriveCollectionControlHash({
    artifact_family: "INPUT_FREEZE_CONTENT",
    payload: normalizeInputFreezeContractless(record),
  })}`;
}

export function deriveInputFreezeArtifactContractHash(contract: SchemaBundleArtifactContract) {
  return `artifact-contract-hash://${deriveCollectionControlHash({
    artifact_family: "INPUT_FREEZE_ARTIFACT_CONTRACT",
    payload: contract,
  })}`;
}

export function buildInputFreezeContract(input: {
  input_freeze_content_hash: string;
  input_freeze_id: string;
  schema_bundle_hash?: string;
  writer_build_id?: string;
}) {
  return buildCollectionArtifactContract({
    artifact_content_hash: input.input_freeze_content_hash,
    artifact_id: inputFreezeRef({ input_freeze_id: input.input_freeze_id }),
    artifact_type: "InputFreeze",
    ...(input.schema_bundle_hash === undefined
      ? {}
      : { schema_bundle_hash: input.schema_bundle_hash }),
    schema_id: InputFreezeSchemaLineage.schemaId,
    schema_source_hash: InputFreezeSchemaLineage.sourceHash,
    writer_build_id: input.writer_build_id ?? "build.taxat.collection.0117",
  });
}

export function deriveInputFreezeId(input: {
  input_set_hash: string;
  manifest_id: string;
}) {
  return `input-freeze.${deriveCollectionControlHash({
    artifact_family: "INPUT_FREEZE_ID",
    payload: {
      input_set_hash: normalizeCollectionString("input_freeze.input_set_hash", input.input_set_hash),
      manifest_id: normalizeCollectionString("input_freeze.manifest_id", input.manifest_id),
    },
  })}`;
}

export function cloneInputFreezeRecord(record: InputFreezeRecord) {
  return structuredClone(record);
}

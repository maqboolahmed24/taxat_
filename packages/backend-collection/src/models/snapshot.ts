import { SnapshotSchemaLineage } from "../../../generated-models/src/generated/typescript/provenance-and-evidence.ts";
import type { Snapshot as GeneratedSnapshot } from "../../../generated-models/src/generated/typescript/provenance-and-evidence.ts";
import type {
  SchemaBundleArtifactContract,
  StateTransitionContract,
} from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  buildCollectionArtifactContract,
  deriveCollectionControlHash,
  normalizeCollectionString,
  normalizeCollectionStringSet,
} from "./collection_control_common.ts";

export type SnapshotLifecycleState = GeneratedSnapshot["lifecycle_state"];

export type SnapshotTransitionEventCode =
  | "snapshot_built"
  | "snapshot_validation_passed"
  | "snapshot_validation_warned"
  | "snapshot_validation_failed"
  | "snapshot_superseded"
  | "snapshot_retention_limited"
  | "erasure_complete";

export type SnapshotStateTransitionContract = StateTransitionContract & {
  object_family: "SNAPSHOT";
  machine_code: "SNAPSHOT_LIFECYCLE_V1";
  state_field_name: "lifecycle_state";
  transition_event_code: SnapshotTransitionEventCode;
};

export type SnapshotQualityRecord = {
  data_quality_score: number;
  invalid_domain_refs: string[];
  reason_codes: string[];
};

export type SnapshotCompletenessRecord = {
  completeness_score: number;
  missing_domain_refs: string[];
  reason_codes: string[];
};

export type SnapshotRecord = Omit<
  GeneratedSnapshot,
  "completeness" | "contract" | "lifecycle_state" | "quality" | "state_transition_contract"
> & {
  completeness: SnapshotCompletenessRecord;
  contract: SchemaBundleArtifactContract;
  lifecycle_state: SnapshotLifecycleState;
  quality: SnapshotQualityRecord;
  state_transition_contract: SnapshotStateTransitionContract;
};

export type SnapshotContractlessRecord = Omit<SnapshotRecord, "contract">;

export type SnapshotModelErrorCode =
  | "SNAPSHOT_ARTIFACT_TYPE_INVALID"
  | "SNAPSHOT_EXECUTION_MODE_INVALID"
  | "SNAPSHOT_LIFECYCLE_METADATA_INVALID"
  | "SNAPSHOT_QUALITY_SHAPE_INVALID"
  | "SNAPSHOT_STATE_CONTRACT_INVALID"
  | "SNAPSHOT_STATE_INVALID";

export class SnapshotModelError extends Error {
  readonly code: SnapshotModelErrorCode;

  constructor(code: SnapshotModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SnapshotModelError";
    this.code = code;
  }
}

export const SNAPSHOT_MACHINE_CODE = "SNAPSHOT_LIFECYCLE_V1";
export const SNAPSHOT_OBJECT_FAMILY = "SNAPSHOT";
export const SNAPSHOT_STATE_FIELD = "lifecycle_state";

const SNAPSHOT_LIFECYCLE_STATES = new Set<SnapshotLifecycleState>([
  "BUILT",
  "VALID",
  "WARNED",
  "INVALID",
  "SUPERSEDED",
  "RETENTION_LIMITED",
  "ERASED",
]);

const SNAPSHOT_TRANSITION_EVENTS = new Set<SnapshotTransitionEventCode>([
  "snapshot_built",
  "snapshot_validation_passed",
  "snapshot_validation_warned",
  "snapshot_validation_failed",
  "snapshot_superseded",
  "snapshot_retention_limited",
  "erasure_complete",
]);

function normalizeLifecycleState(value: unknown): SnapshotLifecycleState {
  const normalized = normalizeCollectionString("snapshot.lifecycle_state", value);
  if (!SNAPSHOT_LIFECYCLE_STATES.has(normalized as SnapshotLifecycleState)) {
    throw new SnapshotModelError(
      "SNAPSHOT_STATE_INVALID",
      `unsupported snapshot lifecycle_state ${normalized}`,
    );
  }
  return normalized as SnapshotLifecycleState;
}

function normalizeTransitionEventCode(value: unknown): SnapshotTransitionEventCode {
  const normalized = normalizeCollectionString(
    "snapshot.state_transition_contract.transition_event_code",
    value,
  );
  if (!SNAPSHOT_TRANSITION_EVENTS.has(normalized as SnapshotTransitionEventCode)) {
    throw new SnapshotModelError(
      "SNAPSHOT_STATE_CONTRACT_INVALID",
      `unsupported snapshot transition_event_code ${normalized}`,
    );
  }
  return normalized as SnapshotTransitionEventCode;
}

function normalizeNullableString(label: string, value: unknown) {
  if (value === null) {
    return null;
  }
  return normalizeCollectionString(label, value);
}

function normalizeScore(label: string, value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new SnapshotModelError(
      "SNAPSHOT_QUALITY_SHAPE_INVALID",
      `${label} must be a finite number between 0 and 100`,
    );
  }
  return Number(value.toFixed(4));
}

export function snapshotRef(record: Pick<SnapshotRecord, "snapshot_id">) {
  return `snapshot://${record.snapshot_id}`;
}

export function buildSnapshotStateTransitionContract(input: {
  current_state: SnapshotLifecycleState;
  previous_state_or_null: SnapshotLifecycleState | null;
  transition_applied_at: string;
  transition_audit_ref: string;
  transition_event_code: SnapshotTransitionEventCode;
}): SnapshotStateTransitionContract {
  return {
    audit_evidence_policy: "EVERY_TRANSITION_RETAINS_AUDIT_EVENT_REF",
    concurrency_guard_policy: "COMPARE_AND_SWAP_OR_SINGLE_WRITER_LEASE",
    contract_version: "STATE_TRANSITION_CONTRACT_V1",
    current_state: input.current_state,
    illegal_transition_policy: "REJECT_WITH_TYPED_REASON_AND_NO_PARTIAL_WRITE",
    machine_code: SNAPSHOT_MACHINE_CODE,
    object_family: SNAPSHOT_OBJECT_FAMILY,
    previous_state_or_null: input.previous_state_or_null,
    recovery_supersession_policy:
      "RECOVERY_AND_SUPERSESSION_ALLOCATE_SUCCESSOR_OR_SUPERSEDING_LINEAGE",
    state_field_name: SNAPSHOT_STATE_FIELD,
    terminal_reentry_policy: "TERMINAL_STATES_REQUIRE_NEW_LINEAGE",
    transition_applied_at: normalizeUtcInstantString(input.transition_applied_at),
    transition_application_policy: "NAMED_EVENT_ONLY",
    transition_audit_ref: normalizeCollectionString(
      "snapshot.transition_audit_ref",
      input.transition_audit_ref,
    ),
    transition_event_code: input.transition_event_code,
    typed_rejection_family: "ILLEGAL_STATE_TRANSITION",
  };
}

function normalizeStateTransitionContract(
  contract: SnapshotStateTransitionContract,
  lifecycleState: SnapshotLifecycleState,
): SnapshotStateTransitionContract {
  if (
    contract.contract_version !== "STATE_TRANSITION_CONTRACT_V1" ||
    contract.object_family !== SNAPSHOT_OBJECT_FAMILY ||
    contract.machine_code !== SNAPSHOT_MACHINE_CODE ||
    contract.state_field_name !== SNAPSHOT_STATE_FIELD ||
    contract.current_state !== lifecycleState
  ) {
    throw new SnapshotModelError(
      "SNAPSHOT_STATE_CONTRACT_INVALID",
      "state_transition_contract must mirror the Snapshot lifecycle state machine",
    );
  }

  return {
    audit_evidence_policy: "EVERY_TRANSITION_RETAINS_AUDIT_EVENT_REF",
    concurrency_guard_policy: "COMPARE_AND_SWAP_OR_SINGLE_WRITER_LEASE",
    contract_version: "STATE_TRANSITION_CONTRACT_V1",
    current_state: lifecycleState,
    illegal_transition_policy: "REJECT_WITH_TYPED_REASON_AND_NO_PARTIAL_WRITE",
    machine_code: SNAPSHOT_MACHINE_CODE,
    object_family: SNAPSHOT_OBJECT_FAMILY,
    previous_state_or_null:
      contract.previous_state_or_null === null
        ? null
        : normalizeLifecycleState(contract.previous_state_or_null),
    recovery_supersession_policy:
      "RECOVERY_AND_SUPERSESSION_ALLOCATE_SUCCESSOR_OR_SUPERSEDING_LINEAGE",
    state_field_name: SNAPSHOT_STATE_FIELD,
    terminal_reentry_policy: "TERMINAL_STATES_REQUIRE_NEW_LINEAGE",
    transition_applied_at: normalizeUtcInstantString(contract.transition_applied_at),
    transition_application_policy: "NAMED_EVENT_ONLY",
    transition_audit_ref: normalizeCollectionString(
      "snapshot.state_transition_contract.transition_audit_ref",
      contract.transition_audit_ref,
    ),
    transition_event_code: normalizeTransitionEventCode(contract.transition_event_code),
    typed_rejection_family: "ILLEGAL_STATE_TRANSITION",
  };
}

function normalizeQuality(input: SnapshotRecord["quality"]): SnapshotQualityRecord {
  return {
    data_quality_score: normalizeScore(
      "snapshot.quality.data_quality_score",
      input.data_quality_score,
    ),
    invalid_domain_refs: normalizeCollectionStringSet(
      "snapshot.quality.invalid_domain_refs",
      input.invalid_domain_refs ?? [],
    ),
    reason_codes: normalizeCollectionStringSet(
      "snapshot.quality.reason_codes",
      input.reason_codes ?? [],
    ),
  };
}

function normalizeCompleteness(
  input: SnapshotRecord["completeness"],
): SnapshotCompletenessRecord {
  return {
    completeness_score: normalizeScore(
      "snapshot.completeness.completeness_score",
      input.completeness_score,
    ),
    missing_domain_refs: normalizeCollectionStringSet(
      "snapshot.completeness.missing_domain_refs",
      input.missing_domain_refs ?? [],
    ),
    reason_codes: normalizeCollectionStringSet(
      "snapshot.completeness.reason_codes",
      input.reason_codes ?? [],
    ),
  };
}

function assertExecutionShape(record: SnapshotContractlessRecord) {
  if (record.analysis_only && record.execution_mode !== "ANALYSIS") {
    throw new SnapshotModelError(
      "SNAPSHOT_EXECUTION_MODE_INVALID",
      "analysis_only snapshots must use execution_mode ANALYSIS",
    );
  }
  if (!record.analysis_only && record.execution_mode !== "COMPLIANCE") {
    throw new SnapshotModelError(
      "SNAPSHOT_EXECUTION_MODE_INVALID",
      "compliance snapshots must use execution_mode COMPLIANCE",
    );
  }
  if (record.execution_mode === "COMPLIANCE") {
    if (
      record.counterfactual_basis !== null ||
      record.non_compliance_config_refs.length !== 0
    ) {
      throw new SnapshotModelError(
        "SNAPSHOT_EXECUTION_MODE_INVALID",
        "COMPLIANCE snapshots cannot bind non-compliance config refs or counterfactual basis",
      );
    }
    return;
  }
  if (record.counterfactual_basis === null) {
    throw new SnapshotModelError(
      "SNAPSHOT_EXECUTION_MODE_INVALID",
      "ANALYSIS snapshots require a counterfactual basis",
    );
  }
}

function assertLifecycleMetadata(record: SnapshotContractlessRecord) {
  if (record.lifecycle_state === "WARNED" || record.lifecycle_state === "INVALID") {
    if (
      record.quality.reason_codes.length === 0 &&
      record.completeness.reason_codes.length === 0
    ) {
      throw new SnapshotModelError(
        "SNAPSHOT_LIFECYCLE_METADATA_INVALID",
        "WARNED and INVALID snapshots require quality or completeness reason codes",
      );
    }
  }

  switch (record.lifecycle_state) {
    case "BUILT":
    case "VALID":
    case "WARNED":
    case "INVALID":
      if (
        record.superseded_by_snapshot_id_or_null !== null ||
        record.retention_limitation_ref_or_null !== null ||
        record.erasure_proof_ref_or_null !== null
      ) {
        throw new SnapshotModelError(
          "SNAPSHOT_LIFECYCLE_METADATA_INVALID",
          `${record.lifecycle_state} snapshots cannot carry terminal lifecycle refs`,
        );
      }
      return;
    case "SUPERSEDED":
      if (
        record.superseded_by_snapshot_id_or_null === null ||
        record.retention_limitation_ref_or_null !== null ||
        record.erasure_proof_ref_or_null !== null
      ) {
        throw new SnapshotModelError(
          "SNAPSHOT_LIFECYCLE_METADATA_INVALID",
          "SUPERSEDED snapshots require a superseding snapshot id and no retention or erasure refs",
        );
      }
      return;
    case "RETENTION_LIMITED":
      if (
        record.superseded_by_snapshot_id_or_null !== null ||
        record.retention_limitation_ref_or_null === null
      ) {
        throw new SnapshotModelError(
          "SNAPSHOT_LIFECYCLE_METADATA_INVALID",
          "RETENTION_LIMITED snapshots require a retention limitation ref and no superseding id",
        );
      }
      return;
    case "ERASED":
      if (
        record.superseded_by_snapshot_id_or_null !== null ||
        record.erasure_proof_ref_or_null === null
      ) {
        throw new SnapshotModelError(
          "SNAPSHOT_LIFECYCLE_METADATA_INVALID",
          "ERASED snapshots require an erasure proof ref and no superseding id",
        );
      }
      return;
  }
}

export function normalizeSnapshotContractless(
  input: SnapshotContractlessRecord,
): SnapshotContractlessRecord {
  if (input.artifact_type !== "Snapshot") {
    throw new SnapshotModelError(
      "SNAPSHOT_ARTIFACT_TYPE_INVALID",
      "snapshot records must carry artifact_type Snapshot",
    );
  }
  const lifecycleState = normalizeLifecycleState(input.lifecycle_state);
  const stateTransitionContract = normalizeStateTransitionContract(
    input.state_transition_contract,
    lifecycleState,
  );
  const stateChangedAt = normalizeUtcInstantString(input.state_changed_at);
  if (stateChangedAt !== stateTransitionContract.transition_applied_at) {
    throw new SnapshotModelError(
      "SNAPSHOT_STATE_CONTRACT_INVALID",
      "state_changed_at must equal state_transition_contract.transition_applied_at",
    );
  }

  const record: SnapshotContractlessRecord = {
    analysis_only: Boolean(input.analysis_only),
    artifact_type: "Snapshot",
    audit_refs: normalizeCollectionStringSet("snapshot.audit_refs", input.audit_refs, {
      minItems: 1,
    }),
    candidate_fact_set_hash: normalizeCollectionString(
      "snapshot.candidate_fact_set_hash",
      input.candidate_fact_set_hash,
    ),
    candidate_fact_set_ref: normalizeCollectionString(
      "snapshot.candidate_fact_set_ref",
      input.candidate_fact_set_ref,
    ),
    canonical_fact_set_hash: normalizeCollectionString(
      "snapshot.canonical_fact_set_hash",
      input.canonical_fact_set_hash,
    ),
    canonical_fact_set_ref: normalizeCollectionString(
      "snapshot.canonical_fact_set_ref",
      input.canonical_fact_set_ref,
    ),
    completeness: normalizeCompleteness(input.completeness),
    conflict_set_hash: normalizeCollectionString(
      "snapshot.conflict_set_hash",
      input.conflict_set_hash,
    ),
    conflict_set_ref: normalizeCollectionString("snapshot.conflict_set_ref", input.conflict_set_ref),
    counterfactual_basis: normalizeNullableString(
      "snapshot.counterfactual_basis",
      input.counterfactual_basis,
    ),
    created_at: normalizeUtcInstantString(input.created_at),
    erasure_proof_ref_or_null: normalizeNullableString(
      "snapshot.erasure_proof_ref_or_null",
      input.erasure_proof_ref_or_null,
    ),
    evidence_item_set_hash: normalizeCollectionString(
      "snapshot.evidence_item_set_hash",
      input.evidence_item_set_hash,
    ),
    evidence_item_set_ref: normalizeCollectionString(
      "snapshot.evidence_item_set_ref",
      input.evidence_item_set_ref,
    ),
    execution_mode: input.execution_mode,
    lifecycle_state: lifecycleState,
    manifest_id: normalizeCollectionString("snapshot.manifest_id", input.manifest_id),
    non_compliance_config_refs: normalizeCollectionStringSet(
      "snapshot.non_compliance_config_refs",
      input.non_compliance_config_refs,
    ),
    provenance_refs: normalizeCollectionStringSet(
      "snapshot.provenance_refs",
      input.provenance_refs,
    ),
    quality: normalizeQuality(input.quality),
    retention_limitation_ref_or_null: normalizeNullableString(
      "snapshot.retention_limitation_ref_or_null",
      input.retention_limitation_ref_or_null,
    ),
    snapshot_id: normalizeCollectionString("snapshot.snapshot_id", input.snapshot_id),
    source_record_set_hash: normalizeCollectionString(
      "snapshot.source_record_set_hash",
      input.source_record_set_hash,
    ),
    source_record_set_ref: normalizeCollectionString(
      "snapshot.source_record_set_ref",
      input.source_record_set_ref,
    ),
    state_changed_at: stateChangedAt,
    state_transition_contract: stateTransitionContract,
    superseded_by_snapshot_id_or_null: normalizeNullableString(
      "snapshot.superseded_by_snapshot_id_or_null",
      input.superseded_by_snapshot_id_or_null,
    ),
  };

  assertExecutionShape(record);
  assertLifecycleMetadata(record);
  return record;
}

export function normalizeSnapshotRecord(input: SnapshotRecord): SnapshotRecord {
  return {
    ...normalizeSnapshotContractless(input),
    contract: structuredClone(input.contract),
  };
}

export function deriveSnapshotContentHash(record: SnapshotContractlessRecord) {
  return `snapshot-content-hash://${deriveCollectionControlHash({
    artifact_family: "SNAPSHOT_CONTENT",
    payload: normalizeSnapshotContractless(record),
  })}`;
}

export function deriveSnapshotArtifactContractHash(contract: SchemaBundleArtifactContract) {
  return `artifact-contract-hash://${deriveCollectionControlHash({
    artifact_family: "SNAPSHOT_ARTIFACT_CONTRACT",
    payload: contract,
  })}`;
}

export function buildSnapshotContract(input: {
  schema_bundle_hash?: string;
  snapshot_content_hash: string;
  snapshot_id: string;
  writer_build_id?: string;
}) {
  return buildCollectionArtifactContract({
    artifact_content_hash: input.snapshot_content_hash,
    artifact_id: snapshotRef({ snapshot_id: input.snapshot_id } as Pick<SnapshotRecord, "snapshot_id">),
    artifact_type: "Snapshot",
    ...(input.schema_bundle_hash === undefined
      ? {}
      : { schema_bundle_hash: input.schema_bundle_hash }),
    schema_id: SnapshotSchemaLineage.schemaId,
    schema_source_hash: SnapshotSchemaLineage.sourceHash,
    writer_build_id: input.writer_build_id ?? "build.taxat.collection.0118",
  });
}

export function deriveSnapshotId(input: {
  candidate_fact_set_hash: string;
  canonical_fact_set_hash: string;
  conflict_set_hash: string;
  counterfactual_basis: string | null;
  evidence_item_set_hash: string;
  execution_mode: "COMPLIANCE" | "ANALYSIS";
  manifest_id: string;
  source_record_set_hash: string;
}) {
  return `snapshot.${deriveCollectionControlHash({
    artifact_family: "SNAPSHOT_ID",
    payload: {
      candidate_fact_set_hash: normalizeCollectionString(
        "snapshot.candidate_fact_set_hash",
        input.candidate_fact_set_hash,
      ),
      canonical_fact_set_hash: normalizeCollectionString(
        "snapshot.canonical_fact_set_hash",
        input.canonical_fact_set_hash,
      ),
      conflict_set_hash: normalizeCollectionString(
        "snapshot.conflict_set_hash",
        input.conflict_set_hash,
      ),
      counterfactual_basis: input.counterfactual_basis,
      evidence_item_set_hash: normalizeCollectionString(
        "snapshot.evidence_item_set_hash",
        input.evidence_item_set_hash,
      ),
      execution_mode: input.execution_mode,
      manifest_id: normalizeCollectionString("snapshot.manifest_id", input.manifest_id),
      source_record_set_hash: normalizeCollectionString(
        "snapshot.source_record_set_hash",
        input.source_record_set_hash,
      ),
    },
  })}`;
}

export function cloneSnapshotRecord(record: SnapshotRecord) {
  return structuredClone(record);
}

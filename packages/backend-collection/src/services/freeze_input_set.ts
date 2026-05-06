import {
  collectionBoundaryRef,
  normalizeCollectionBoundaryRecord,
  type CollectionBoundaryRecord,
} from "../models/collection_boundary.ts";
import { candidateFactRef, normalizeCandidateFactRecord, type CandidateFactRecord } from "../models/candidate_fact.ts";
import { canonicalFactRef, normalizeCanonicalFactRecord, type CanonicalFactRecord } from "../models/canonical_fact.ts";
import { conflictRecordRef, normalizeConflictRecordRecord, type ConflictRecordRecord } from "../models/conflict_record.ts";
import {
  normalizeConflictSetRecord,
  projectConflictSetFrontier,
  type ConflictSetRecord,
} from "../models/conflict_set.ts";
import { evidenceItemRef, normalizeEvidenceItemRecord, type EvidenceItemRecord } from "../models/evidence_item.ts";
import {
  buildInputFreezeContract,
  deriveInputFreezeContentHash,
  deriveInputFreezeId,
  normalizeInputFreezeRecord,
  type InputFreezeRecord,
} from "../models/input_freeze.ts";
import {
  normalizationContextRef,
  normalizeNormalizationContextRecord,
  type NormalizationContextRecord,
} from "../models/normalization_context.ts";
import type { SourceDomainDeclarationRecord } from "../models/source_domain_declaration.ts";
import { sourcePlanRef, normalizeSourcePlanRecord, type SourcePlanRecord } from "../models/source_plan.ts";
import { sourceRecordRef, normalizeSourceRecordRecord, type SourceRecordRecord } from "../models/source_record.ts";
import { sourceWindowRef, normalizeSourceWindowRecord, type SourceWindowRecord } from "../models/source_window.ts";
import type { InputFreezeRepository } from "../repositories/input_freeze_repository.ts";
import {
  normalizeCollectionRuntimeScopes,
  normalizeCollectionString,
  normalizeCollectionStringSet,
} from "../models/collection_control_common.ts";
import {
  projectCollectionLateDataBindings,
  type CollectionLateDataBindingPrecedence,
} from "./collection_late_data_bindings.ts";
import type { LateDataPolicyBindingRecord } from "../models/late_data_indicator.ts";
import { buildSourceDomainPostures } from "./source_domain_posture_builder.ts";
import { buildInputSetHashPreimage, deriveInputSetHash } from "./input_set_hash_builder.ts";

export type FreezeInputSetErrorCode =
  | "INPUT_FREEZE_ARTIFACT_CONTRACTS_REQUIRED"
  | "INPUT_FREEZE_BOUNDARY_MISMATCH";

export class FreezeInputSetError extends Error {
  readonly code: FreezeInputSetErrorCode;

  constructor(code: FreezeInputSetErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "FreezeInputSetError";
    this.code = code;
  }
}

function requireArtifactContracts(input: {
  artifact_contract_hash: string;
  artifact_contract_refs: readonly string[];
}) {
  const refs = normalizeCollectionStringSet(
    "input_freeze.artifact_contract_refs",
    input.artifact_contract_refs,
  );
  if (refs.length < 10) {
    throw new FreezeInputSetError(
      "INPUT_FREEZE_ARTIFACT_CONTRACTS_REQUIRED",
      "InputFreeze assembly requires at least ten artifact contract refs for the pre-seal intake pack",
    );
  }
  return {
    artifact_contract_hash: normalizeCollectionString(
      "input_freeze.artifact_contract_hash",
      input.artifact_contract_hash,
    ),
    artifact_contract_refs: refs,
  };
}

function assertBoundaryRefs(input: {
  collection_boundary: CollectionBoundaryRecord;
  source_plan: SourcePlanRecord;
  source_window: SourceWindowRecord;
}) {
  const expectedSourcePlanRef = sourcePlanRef(input.source_plan);
  if (
    input.collection_boundary.source_plan_ref !== expectedSourcePlanRef ||
    input.source_window.source_plan_ref !== expectedSourcePlanRef ||
    input.collection_boundary.source_window_id !== input.source_window.source_window_id
  ) {
    throw new FreezeInputSetError(
      "INPUT_FREEZE_BOUNDARY_MISMATCH",
      "source plan, source window, and collection boundary refs must describe the same frozen intake boundary",
    );
  }
}

export async function freezeInputSet(input: {
  artifact_contract_hash: string;
  artifact_contract_refs: readonly string[];
  candidate_facts?: readonly CandidateFactRecord[];
  canonical_facts?: readonly CanonicalFactRecord[];
  collection_boundary: CollectionBoundaryRecord;
  conflict_records?: readonly ConflictRecordRecord[];
  conflict_set?: ConflictSetRecord;
  evidence_items?: readonly EvidenceItemRecord[];
  input_freeze_id?: string;
  input_policy_ref: string;
  late_data_policy_bindings?: readonly LateDataPolicyBindingRecord[];
  normalization_context: NormalizationContextRecord;
  persisted_at?: string;
  repository?: InputFreezeRepository;
  runtime_scope_refs: readonly string[];
  schema_bundle_hash?: string;
  source_domain_declarations?: readonly SourceDomainDeclarationRecord[];
  source_plan: SourcePlanRecord;
  source_records?: readonly SourceRecordRecord[];
  source_window: SourceWindowRecord;
  writer_build_id?: string;
}): Promise<InputFreezeRecord> {
  const sourcePlan = normalizeSourcePlanRecord(input.source_plan);
  const sourceWindow = normalizeSourceWindowRecord(input.source_window);
  const boundary = normalizeCollectionBoundaryRecord(input.collection_boundary);
  const normalizationContext = normalizeNormalizationContextRecord(input.normalization_context);
  assertBoundaryRefs({ collection_boundary: boundary, source_plan: sourcePlan, source_window: sourceWindow });
  const artifactContracts = requireArtifactContracts({
    artifact_contract_hash: input.artifact_contract_hash,
    artifact_contract_refs: input.artifact_contract_refs,
  });
  const runtimeScopeRefs = normalizeCollectionRuntimeScopes(
    "input_freeze.runtime_scope_refs",
    input.runtime_scope_refs,
  );
  const sourceRecords = (input.source_records ?? []).map((record) =>
    normalizeSourceRecordRecord(record),
  );
  const evidenceItems = (input.evidence_items ?? []).map((item) =>
    normalizeEvidenceItemRecord(item),
  );
  const candidateFacts = (input.candidate_facts ?? []).map((fact) =>
    normalizeCandidateFactRecord(fact),
  );
  const canonicalFacts = (input.canonical_facts ?? []).map((fact) =>
    normalizeCanonicalFactRecord(fact),
  );
  const conflictSet = input.conflict_set
    ? normalizeConflictSetRecord(input.conflict_set)
    : null;
  const conflictRecords = conflictSet
    ? conflictSet.items.map((record) => normalizeConflictRecordRecord(record))
    : (input.conflict_records ?? []).map((record) => normalizeConflictRecordRecord(record));
  const frontier = conflictSet
    ? {
        blocking_conflict_count: conflictSet.blocking_conflict_count,
        blocking_conflict_ids: conflictSet.blocking_conflict_ids,
        dominant_blocking_class: conflictSet.dominant_blocking_class,
        open_conflict_count: conflictSet.open_conflict_count,
        open_conflict_ids: conflictSet.open_conflict_ids,
        resolution_frontier: conflictSet.resolution_frontier,
      }
    : projectConflictSetFrontier(conflictRecords);
  const postures = buildSourceDomainPostures({
    candidate_facts: candidateFacts,
    canonical_facts: canonicalFacts,
    collection_boundary: boundary,
    conflict_records: conflictRecords,
    evidence_items: evidenceItems,
    source_domain_declarations: input.source_domain_declarations ?? [],
    source_records: sourceRecords,
  });
  const lateDataPolicyBindings =
    input.late_data_policy_bindings === undefined
      ? projectCollectionLateDataBindings({
          collection_boundary: boundary,
          runtime_scope_refs: runtimeScopeRefs,
        })
      : [...input.late_data_policy_bindings];
  const sourceWindowRef = sourceWindowRefAlias(sourceWindow);
  const inputSetHash = deriveInputSetHash(
    buildInputSetHashPreimage({
      artifact_contract_hash: artifactContracts.artifact_contract_hash,
      artifact_contract_refs: artifactContracts.artifact_contract_refs,
      candidate_facts: candidateFacts,
      canonical_facts: canonicalFacts,
      collection_boundary: boundary,
      conflict_records: conflictRecords,
      evidence_items: evidenceItems,
      normalization_context_hash: normalizationContext.normalization_context_hash,
      source_domain_postures: postures.source_domain_postures,
      source_plan_hash: sourcePlan.source_plan_hash,
      source_records: sourceRecords,
      source_window_hash: sourceWindow.source_window_hash,
      source_window_ref: sourceWindowRef,
    }),
  );
  const inputFreezeId =
    input.input_freeze_id ??
    deriveInputFreezeId({
      input_set_hash: inputSetHash,
      manifest_id: sourcePlan.manifest_id,
    });
  const contractless = {
    artifact_contract_hash: artifactContracts.artifact_contract_hash,
    artifact_contract_refs: artifactContracts.artifact_contract_refs,
    artifact_type: "InputFreeze" as const,
    blocking_conflict_count: frontier.blocking_conflict_count,
    candidate_fact_refs: candidateFacts.map((fact) => candidateFactRef(fact)),
    canonical_fact_refs: canonicalFacts.map((fact) => canonicalFactRef(fact)),
    collection_boundary_hash: boundary.collection_boundary_hash,
    collection_boundary_ref: collectionBoundaryRef(boundary),
    conflict_refs: conflictRecords.map((record) => conflictRecordRef(record)),
    connector_build_id: boundary.connector_build_id,
    connector_profile_ref: boundary.connector_profile_ref,
    cursor_checkpoint_refs: boundary.source_boundaries.map(
      (sourceBoundary) => sourceBoundary.cursor_checkpoint_ref,
    ),
    dominant_blocking_class: frontier.dominant_blocking_class,
    evidence_item_refs: evidenceItems.map((item) => evidenceItemRef(item)),
    exclusion_refs: postures.exclusion_refs,
    input_consumption_mode: "FROZEN_INPUT_ONLY" as const,
    input_freeze_id: inputFreezeId,
    input_policy_ref: input.input_policy_ref,
    input_set_hash: inputSetHash,
    late_data_adoption_policy: "CHILD_REVIEW_OR_EXCLUDE_ONLY" as const,
    late_data_policy_bindings: lateDataPolicyBindings,
    manifest_id: sourcePlan.manifest_id,
    missing_source_declarations: postures.missing_source_declarations,
    no_data_confirmed_declarations: postures.no_data_confirmed_declarations,
    normalization_context_hash: normalizationContext.normalization_context_hash,
    normalization_context_ref: normalizationContextRef(normalizationContext),
    open_conflict_count: frontier.open_conflict_count,
    provider_api_versions: boundary.source_boundaries.map(
      (sourceBoundary) => sourceBoundary.provider_api_version,
    ),
    provider_environment_refs: boundary.source_boundaries.map(
      (sourceBoundary) => sourceBoundary.provider_environment_ref,
    ),
    provider_schema_versions: boundary.source_boundaries.map(
      (sourceBoundary) => sourceBoundary.provider_schema_version,
    ),
    read_cutoff_at: boundary.read_cutoff_at,
    request_audit_refs: boundary.source_boundaries.flatMap((sourceBoundary) => [
      ...sourceBoundary.request_audit_refs,
      ...sourceBoundary.page_request_audit_refs,
    ]),
    resolution_frontier: frontier.resolution_frontier,
    source_domain_postures: postures.source_domain_postures,
    source_plan_hash: sourcePlan.source_plan_hash,
    source_plan_ref: sourcePlanRefAlias(sourcePlan),
    source_record_refs: sourceRecords.map((record) => sourceRecordRef(record)),
    source_window_hash: sourceWindow.source_window_hash,
    source_window_ref: sourceWindowRef,
    stale_source_declarations: postures.stale_source_declarations,
  };
  const contentHash = deriveInputFreezeContentHash(contractless);
  const contract = buildInputFreezeContract({
    input_freeze_content_hash: contentHash,
    input_freeze_id: inputFreezeId,
    ...(input.schema_bundle_hash === undefined
      ? {}
      : { schema_bundle_hash: input.schema_bundle_hash }),
    ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
  });
  const inputFreeze = normalizeInputFreezeRecord({
    ...contractless,
    contract,
  });
  if (input.repository) {
    await input.repository.persistInputFreeze({
      input_freeze: inputFreeze,
      persisted_at: input.persisted_at ?? boundary.read_cutoff_at,
    });
  }
  return inputFreeze;
}

function sourcePlanRefAlias(sourcePlan: SourcePlanRecord) {
  return sourcePlanRef(sourcePlan);
}

function sourceWindowRefAlias(sourceWindow: SourceWindowRecord) {
  return sourceWindowRef(sourceWindow);
}

export type { CollectionLateDataBindingPrecedence };

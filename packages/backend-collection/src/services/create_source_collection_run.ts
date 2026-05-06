import {
  buildSourceCollectionRunStateTransitionContract,
  normalizeSourceCollectionRunRecord,
  type SourceCollectionRunRecord,
} from "../models/source_collection_run.ts";
import {
  SourceCollectionRunRepositoryError,
  type SourceCollectionRunRepository,
  type StoredSourceCollectionRunRecord,
} from "../repositories/source_collection_run_repository.ts";
import { normalizeCollectionStringSet } from "../models/collection_control_common.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import { allocateSourceWindowAnchor } from "./source_window_anchor_allocator.ts";

export type BuildSourceCollectionRunInput = {
  audit_refs?: readonly string[];
  collection_run_id?: string;
  created_at: string;
  manifest_id: string;
  provenance_refs?: readonly string[];
  source_window_id?: string;
  transition_audit_ref?: string;
};

export type CreateOrReuseSourceCollectionRunResult = {
  reused_existing: boolean;
  stored_run: StoredSourceCollectionRunRecord;
};

function defaultCollectionRunId(manifestId: string) {
  return `source-collection-run.${manifestId}`;
}

function defaultTransitionAuditRef(collectionRunId: string) {
  return `audit://source-collection-run/${collectionRunId}/collection_run_allocated`;
}

export function buildSourceCollectionRun(
  input: BuildSourceCollectionRunInput,
): SourceCollectionRunRecord {
  const createdAt = normalizeUtcInstantString(input.created_at);
  const anchor = allocateSourceWindowAnchor(
    input.source_window_id === undefined
      ? { manifest_id: input.manifest_id }
      : { manifest_id: input.manifest_id, source_window_id: input.source_window_id },
  );
  const collectionRunId = input.collection_run_id ?? defaultCollectionRunId(anchor.manifest_id);
  const transitionAuditRef =
    input.transition_audit_ref ?? defaultTransitionAuditRef(collectionRunId);
  const auditRefs = normalizeCollectionStringSet(
    "source_collection_run.audit_refs",
    [transitionAuditRef, ...(input.audit_refs ?? [])],
    { minItems: 1 },
  );

  return normalizeSourceCollectionRunRecord({
    abandoned_reason_code_or_null: null,
    artifact_type: "SourceCollectionRun",
    audit_refs: auditRefs,
    collection_run_id: collectionRunId,
    completed_at_or_null: null,
    failure_reason_code_or_null: null,
    fetch_audit_refs: [],
    lifecycle_state: "NOT_STARTED",
    manifest_id: anchor.manifest_id,
    partial_gap_refs: [],
    provenance_refs: [...(input.provenance_refs ?? [])],
    source_window_ref: anchor.source_window_ref,
    started_at_or_null: null,
    state_changed_at: createdAt,
    state_transition_contract: buildSourceCollectionRunStateTransitionContract({
      current_state: "NOT_STARTED",
      previous_state_or_null: null,
      transition_applied_at: createdAt,
      transition_audit_ref: transitionAuditRef,
      transition_event_code: "collection_run_allocated",
    }),
  });
}

export async function createOrReuseSourceCollectionRun(input: {
  audit_refs?: readonly string[];
  collection_run_id?: string;
  created_at: string;
  manifest_id: string;
  provenance_refs?: readonly string[];
  repository: SourceCollectionRunRepository;
  source_window_id?: string;
  transition_audit_ref?: string;
}): Promise<CreateOrReuseSourceCollectionRunResult> {
  const existing = await input.repository.getSourceCollectionRunByManifestId(input.manifest_id);
  if (existing) {
    return { reused_existing: true, stored_run: existing };
  }

  const collectionRun = buildSourceCollectionRun(input);
  try {
    const storedRun = await input.repository.createSourceCollectionRun({
      collection_run: collectionRun,
      persisted_at: input.created_at,
    });
    return { reused_existing: false, stored_run: storedRun };
  } catch (error) {
    if (
      error instanceof SourceCollectionRunRepositoryError &&
      error.code === "SOURCE_COLLECTION_RUN_MANIFEST_COLLISION"
    ) {
      const racedExisting = await input.repository.getSourceCollectionRunByManifestId(
        collectionRun.manifest_id,
      );
      if (racedExisting) {
        return { reused_existing: true, stored_run: racedExisting };
      }
    }
    throw error;
  }
}

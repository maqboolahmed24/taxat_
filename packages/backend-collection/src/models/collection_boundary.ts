import type { CollectionBoundary as GeneratedCollectionBoundary } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import { CollectionBoundarySchemaLineage } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
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

export const COLLECTION_BOUNDARY_DISPOSITIONS = [
  "IN_SCOPE_COLLECTED",
  "NO_DATA_CONFIRMED_AT_CUTOFF",
  "EXCLUDED_BY_POLICY",
  "MISSING_AT_CUTOFF",
  "STALE_AT_CUTOFF",
] as const;

export type CollectionBoundaryDisposition =
  (typeof COLLECTION_BOUNDARY_DISPOSITIONS)[number];

export type CollectionBoundarySourceBoundaryRecord = {
  boundary_disposition: CollectionBoundaryDisposition;
  completeness_expectation_ref: string;
  cursor_checkpoint_ref: string;
  late_data_policy_ref: CollectionLateDataPolicyRef;
  page_request_audit_refs: string[];
  partition_scope_refs: string[];
  provider_api_version: string;
  provider_environment_ref: string;
  provider_schema_version: string;
  request_audit_refs: string[];
  revision_ref: string;
  runtime_scope_refs: string[];
  source_class: CollectionSourceClassOrNull;
  source_domain: string;
};

export type CollectionBoundaryRecord = Omit<
  GeneratedCollectionBoundary,
  "contract" | "source_boundaries"
> & {
  contract: SchemaBundleArtifactContract;
  source_boundaries: CollectionBoundarySourceBoundaryRecord[];
};

export type CollectionBoundaryDraft = Omit<
  CollectionBoundaryRecord,
  "collection_boundary_hash" | "contract"
>;

export type CollectionBoundaryModelErrorCode =
  | "COLLECTION_BOUNDARY_ARTIFACT_TYPE_INVALID"
  | "COLLECTION_BOUNDARY_AUDIT_REFS_REQUIRED"
  | "COLLECTION_BOUNDARY_COVERAGE_STATE_INVALID"
  | "COLLECTION_BOUNDARY_DISPOSITION_INVALID"
  | "COLLECTION_BOUNDARY_HASH_MISMATCH";

export class CollectionBoundaryModelError extends Error {
  readonly code: CollectionBoundaryModelErrorCode;

  constructor(code: CollectionBoundaryModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "CollectionBoundaryModelError";
    this.code = code;
  }
}

function sourceBoundaryKey(boundary: CollectionBoundarySourceBoundaryRecord) {
  return [
    boundary.source_domain,
    boundary.partition_scope_refs.join("\u001f"),
    boundary.source_class ?? "<null>",
    boundary.provider_environment_ref,
    boundary.cursor_checkpoint_ref,
  ].join("\u001e");
}

function normalizeDisposition(value: unknown): CollectionBoundaryDisposition {
  const normalized = normalizeCollectionString(
    "source_boundary.boundary_disposition",
    value,
  );
  if (!COLLECTION_BOUNDARY_DISPOSITIONS.includes(normalized as CollectionBoundaryDisposition)) {
    throw new CollectionBoundaryModelError(
      "COLLECTION_BOUNDARY_DISPOSITION_INVALID",
      "boundary_disposition must be canonical",
    );
  }
  return normalized as CollectionBoundaryDisposition;
}

export function collectionBoundaryRef(
  boundary: Pick<CollectionBoundaryRecord, "collection_boundary_id">,
) {
  return `collection-boundary://${boundary.collection_boundary_id}`;
}

export function normalizeSourceBoundary(
  boundary: CollectionBoundarySourceBoundaryRecord,
): CollectionBoundarySourceBoundaryRecord {
  const requestAuditRefs = normalizeCollectionStringSet(
    "source_boundary.request_audit_refs",
    boundary.request_audit_refs ?? [],
  );
  const pageRequestAuditRefs = normalizeCollectionStringSet(
    "source_boundary.page_request_audit_refs",
    boundary.page_request_audit_refs ?? [],
  );
  if (requestAuditRefs.length === 0 && pageRequestAuditRefs.length === 0) {
    throw new CollectionBoundaryModelError(
      "COLLECTION_BOUNDARY_AUDIT_REFS_REQUIRED",
      "source boundaries require request_audit_refs or page_request_audit_refs",
    );
  }

  return {
    source_domain: normalizeCollectionString(
      "source_boundary.source_domain",
      boundary.source_domain,
    ),
    source_class: normalizeCollectionSourceClassOrNull(
      "source_boundary.source_class",
      boundary.source_class,
    ),
    partition_scope_refs: normalizeCollectionStringSet(
      "source_boundary.partition_scope_refs",
      boundary.partition_scope_refs ?? [],
    ),
    runtime_scope_refs: normalizeCollectionRuntimeScopes(
      "source_boundary.runtime_scope_refs",
      boundary.runtime_scope_refs ?? [],
    ),
    provider_environment_ref: normalizeCollectionString(
      "source_boundary.provider_environment_ref",
      boundary.provider_environment_ref,
    ),
    provider_api_version: normalizeCollectionString(
      "source_boundary.provider_api_version",
      boundary.provider_api_version,
    ),
    provider_schema_version: normalizeCollectionString(
      "source_boundary.provider_schema_version",
      boundary.provider_schema_version,
    ),
    cursor_checkpoint_ref: normalizeCollectionString(
      "source_boundary.cursor_checkpoint_ref",
      boundary.cursor_checkpoint_ref,
    ),
    revision_ref: normalizeCollectionString(
      "source_boundary.revision_ref",
      boundary.revision_ref,
    ),
    request_audit_refs: requestAuditRefs,
    page_request_audit_refs: pageRequestAuditRefs,
    completeness_expectation_ref: normalizeCollectionString(
      "source_boundary.completeness_expectation_ref",
      boundary.completeness_expectation_ref,
    ),
    late_data_policy_ref: normalizeLateDataPolicyRef(
      "source_boundary.late_data_policy_ref",
      boundary.late_data_policy_ref,
    ),
    boundary_disposition: normalizeDisposition(boundary.boundary_disposition),
  };
}

export function normalizeCollectionBoundaryDraft(
  input: CollectionBoundaryDraft,
): CollectionBoundaryDraft {
  if (input.artifact_type !== "CollectionBoundary") {
    throw new CollectionBoundaryModelError(
      "COLLECTION_BOUNDARY_ARTIFACT_TYPE_INVALID",
      "collection boundaries must carry artifact_type CollectionBoundary",
    );
  }
  if (input.boundary_coverage_state !== "EXPLICIT_SOURCE_DOMAIN_ACCOUNTING") {
    throw new CollectionBoundaryModelError(
      "COLLECTION_BOUNDARY_COVERAGE_STATE_INVALID",
      "boundary_coverage_state must be EXPLICIT_SOURCE_DOMAIN_ACCOUNTING",
    );
  }
  const sourceBoundaries = input.source_boundaries
    .map((boundary) => normalizeSourceBoundary(boundary))
    .sort((left, right) => sourceBoundaryKey(left).localeCompare(sourceBoundaryKey(right)));

  return {
    collection_boundary_id: normalizeCollectionString(
      "collection_boundary.collection_boundary_id",
      input.collection_boundary_id,
    ),
    manifest_id: normalizeCollectionString("collection_boundary.manifest_id", input.manifest_id),
    artifact_type: "CollectionBoundary",
    source_plan_ref: normalizeCollectionString(
      "collection_boundary.source_plan_ref",
      input.source_plan_ref,
    ),
    source_window_id: normalizeCollectionString(
      "collection_boundary.source_window_id",
      input.source_window_id,
    ),
    read_cutoff_at: normalizeUtcInstantString(input.read_cutoff_at),
    connector_profile_ref: normalizeCollectionString(
      "collection_boundary.connector_profile_ref",
      input.connector_profile_ref,
    ),
    connector_build_id: normalizeCollectionString(
      "collection_boundary.connector_build_id",
      input.connector_build_id,
    ),
    boundary_coverage_state: "EXPLICIT_SOURCE_DOMAIN_ACCOUNTING",
    source_boundaries: sourceBoundaries,
  };
}

export function deriveCollectionBoundaryHash(input: CollectionBoundaryDraft) {
  return `collection-boundary-hash://${deriveCollectionControlHash({
    artifact_family: "COLLECTION_BOUNDARY",
    payload: normalizeCollectionBoundaryDraft(input),
  })}`;
}

export function buildCollectionBoundaryContract(input: {
  collection_boundary_hash: string;
  collection_boundary_id: string;
  schema_bundle_hash?: string;
  writer_build_id?: string;
}) {
  return buildCollectionArtifactContract({
    artifact_content_hash: input.collection_boundary_hash,
    artifact_id: collectionBoundaryRef({
      collection_boundary_id: input.collection_boundary_id,
    }),
    artifact_type: "CollectionBoundary",
    schema_bundle_hash: input.schema_bundle_hash,
    schema_id: CollectionBoundarySchemaLineage.schemaId,
    schema_source_hash: CollectionBoundarySchemaLineage.sourceHash,
    writer_build_id: input.writer_build_id,
  });
}

export function normalizeCollectionBoundaryRecord(
  input: CollectionBoundaryRecord,
): CollectionBoundaryRecord {
  const draft = normalizeCollectionBoundaryDraft(input);
  const expectedHash = deriveCollectionBoundaryHash(draft);
  if (input.collection_boundary_hash !== expectedHash) {
    throw new CollectionBoundaryModelError(
      "COLLECTION_BOUNDARY_HASH_MISMATCH",
      "collection_boundary_hash must match the canonical boundary payload",
    );
  }
  return {
    ...draft,
    collection_boundary_hash: expectedHash,
    contract: structuredClone(input.contract),
  };
}

export function cloneCollectionBoundaryRecord(record: CollectionBoundaryRecord) {
  return structuredClone(record);
}

import type {
  CollectionBoundaryDraft,
  CollectionBoundaryRecord,
  CollectionBoundarySourceBoundaryRecord,
} from "../models/collection_boundary.ts";
import {
  buildCollectionBoundaryContract,
  deriveCollectionBoundaryHash,
  normalizeCollectionBoundaryDraft,
  normalizeCollectionBoundaryRecord,
} from "../models/collection_boundary.ts";
import type { SourcePlanRecord } from "../models/source_plan.ts";
import { sourcePlanRef } from "../models/source_plan.ts";
import type { SourceWindowRecord } from "../models/source_window.ts";
import { validateBoundaryDisposition } from "./boundary_disposition_validator.ts";

export type BuildCollectionBoundaryInput = {
  collection_boundary_id?: string;
  connector_build_id: string;
  connector_profile_ref: string;
  schema_bundle_hash?: string;
  source_boundaries: CollectionBoundarySourceBoundaryRecord[];
  source_plan: SourcePlanRecord;
  source_window: SourceWindowRecord;
  writer_build_id?: string;
};

export type CollectionBoundaryFactoryErrorCode =
  | "COLLECTION_BOUNDARY_SOURCE_WINDOW_PLAN_MISMATCH";

export class CollectionBoundaryFactoryError extends Error {
  readonly code: CollectionBoundaryFactoryErrorCode;

  constructor(code: CollectionBoundaryFactoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "CollectionBoundaryFactoryError";
    this.code = code;
  }
}

export function buildCollectionBoundary(
  input: BuildCollectionBoundaryInput,
): CollectionBoundaryRecord {
  const expectedSourcePlanRef = sourcePlanRef(input.source_plan);
  if (input.source_window.source_plan_ref !== expectedSourcePlanRef) {
    throw new CollectionBoundaryFactoryError(
      "COLLECTION_BOUNDARY_SOURCE_WINDOW_PLAN_MISMATCH",
      "source window must reference the same source plan as the boundary",
    );
  }

  const draft: CollectionBoundaryDraft = normalizeCollectionBoundaryDraft({
    artifact_type: "CollectionBoundary",
    boundary_coverage_state: "EXPLICIT_SOURCE_DOMAIN_ACCOUNTING",
    collection_boundary_id:
      input.collection_boundary_id ?? `collection-boundary.${input.source_plan.manifest_id}`,
    connector_build_id: input.connector_build_id,
    connector_profile_ref: input.connector_profile_ref,
    manifest_id: input.source_plan.manifest_id,
    read_cutoff_at: input.source_window.read_cutoff_at,
    source_boundaries: input.source_boundaries,
    source_plan_ref: expectedSourcePlanRef,
    source_window_id: input.source_window.source_window_id,
  });
  const collectionBoundaryHash = deriveCollectionBoundaryHash(draft);
  const boundary = normalizeCollectionBoundaryRecord({
    ...draft,
    collection_boundary_hash: collectionBoundaryHash,
    contract: buildCollectionBoundaryContract({
      collection_boundary_hash: collectionBoundaryHash,
      collection_boundary_id: draft.collection_boundary_id,
      schema_bundle_hash: input.schema_bundle_hash,
      writer_build_id: input.writer_build_id,
    }),
  });
  validateBoundaryDisposition({
    collection_boundary: boundary,
    source_plan: input.source_plan,
  });
  return boundary;
}

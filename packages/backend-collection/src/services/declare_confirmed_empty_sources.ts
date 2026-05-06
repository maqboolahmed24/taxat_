import {
  collectionBoundaryRef,
  normalizeCollectionBoundaryRecord,
  type CollectionBoundaryRecord,
  type CollectionBoundarySourceBoundaryRecord,
} from "../models/collection_boundary.ts";
import { buildSourceDomainDeclarationRecord, type SourceDomainDeclarationRecord } from "../models/source_domain_declaration.ts";

function evidenceRefsForBoundary(
  boundaryRef: string,
  sourceBoundary: CollectionBoundarySourceBoundaryRecord,
) {
  return [
    boundaryRef,
    ...sourceBoundary.request_audit_refs,
    ...sourceBoundary.page_request_audit_refs,
  ];
}

export function declareConfirmedEmptySources(input: {
  collection_boundary: CollectionBoundaryRecord;
  produced_at: string;
  reason_code?: "EMPTY_RESPONSE_CONFIRMED" | "NO_DATA_BOUNDARY_DISPOSITION";
  schema_bundle_hash?: string;
  writer_build_id?: string;
}): SourceDomainDeclarationRecord[] {
  const boundary = normalizeCollectionBoundaryRecord(input.collection_boundary);
  const boundaryRef = collectionBoundaryRef(boundary);
  return boundary.source_boundaries
    .filter(
      (sourceBoundary) => sourceBoundary.boundary_disposition === "NO_DATA_CONFIRMED_AT_CUTOFF",
    )
    .map((sourceBoundary) =>
      buildSourceDomainDeclarationRecord({
        collection_boundary_ref: boundaryRef,
        declaration_kind: "NO_DATA_CONFIRMED_AT_CUTOFF",
        evidence_refs: evidenceRefsForBoundary(boundaryRef, sourceBoundary),
        late_data_policy_ref: sourceBoundary.late_data_policy_ref,
        manifest_id: boundary.manifest_id,
        partition_scope_refs: sourceBoundary.partition_scope_refs,
        produced_at: input.produced_at,
        reason_code: input.reason_code ?? "EMPTY_RESPONSE_CONFIRMED",
        runtime_scope_refs: sourceBoundary.runtime_scope_refs,
        source_class: sourceBoundary.source_class,
        source_domain: sourceBoundary.source_domain,
        source_plan_ref: boundary.source_plan_ref,
        ...(input.schema_bundle_hash === undefined ? {} : { schema_bundle_hash: input.schema_bundle_hash }),
        ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
      }),
    );
}

import {
  collectionBoundaryRef,
  normalizeCollectionBoundaryRecord,
  type CollectionBoundaryRecord,
  type CollectionBoundarySourceBoundaryRecord,
} from "../models/collection_boundary.ts";
import { buildSourceDomainDeclarationRecord, type SourceDomainDeclarationRecord } from "../models/source_domain_declaration.ts";
import { normalizeSourcePlanRecord, sourcePlanRef, type SourcePlanPlannedSourceRecord, type SourcePlanRecord } from "../models/source_plan.ts";

function plannedKey(source: Pick<SourcePlanPlannedSourceRecord, "partition_scope_refs" | "source_domain">) {
  return `${source.source_domain}\u001e${source.partition_scope_refs.join("\u001f")}`;
}

function boundaryKey(
  sourceBoundary: Pick<CollectionBoundarySourceBoundaryRecord, "partition_scope_refs" | "source_domain">,
) {
  return `${sourceBoundary.source_domain}\u001e${sourceBoundary.partition_scope_refs.join("\u001f")}`;
}

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

export function declareMissingSources(input: {
  collection_boundary: CollectionBoundaryRecord;
  produced_at: string;
  reason_code?: "MISSING_AT_CUTOFF" | "NO_DATA_CONFIRMATION_MISSING";
  schema_bundle_hash?: string;
  source_plan?: SourcePlanRecord;
  writer_build_id?: string;
}): SourceDomainDeclarationRecord[] {
  const boundary = normalizeCollectionBoundaryRecord(input.collection_boundary);
  const boundaryRef = collectionBoundaryRef(boundary);
  const declarations = boundary.source_boundaries
    .filter((sourceBoundary) => sourceBoundary.boundary_disposition === "MISSING_AT_CUTOFF")
    .map((sourceBoundary) =>
      buildSourceDomainDeclarationRecord({
        collection_boundary_ref: boundaryRef,
        declaration_kind: "MISSING_AT_CUTOFF",
        evidence_refs: evidenceRefsForBoundary(boundaryRef, sourceBoundary),
        late_data_policy_ref: sourceBoundary.late_data_policy_ref,
        manifest_id: boundary.manifest_id,
        partition_scope_refs: sourceBoundary.partition_scope_refs,
        produced_at: input.produced_at,
        reason_code: input.reason_code ?? "MISSING_AT_CUTOFF",
        runtime_scope_refs: sourceBoundary.runtime_scope_refs,
        source_class: sourceBoundary.source_class,
        source_domain: sourceBoundary.source_domain,
        source_plan_ref: boundary.source_plan_ref,
        ...(input.schema_bundle_hash === undefined ? {} : { schema_bundle_hash: input.schema_bundle_hash }),
        ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
      }),
    );

  if (input.source_plan === undefined) {
    return declarations;
  }

  const sourcePlan = normalizeSourcePlanRecord(input.source_plan);
  const seenBoundaryKeys = new Set(boundary.source_boundaries.map((sourceBoundary) => boundaryKey(sourceBoundary)));
  for (const plannedSource of sourcePlan.planned_sources) {
    if (seenBoundaryKeys.has(plannedKey(plannedSource))) {
      continue;
    }
    declarations.push(
      buildSourceDomainDeclarationRecord({
        collection_boundary_ref: boundaryRef,
        declaration_kind: "MISSING_AT_CUTOFF",
        evidence_refs: [
          sourcePlanRef(sourcePlan),
          boundaryRef,
          plannedSource.completeness_expectation_ref,
        ],
        late_data_policy_ref: plannedSource.late_data_policy_ref,
        manifest_id: sourcePlan.manifest_id,
        partition_scope_refs: plannedSource.partition_scope_refs,
        produced_at: input.produced_at,
        reason_code: "NO_BOUNDARY_DISPOSITION",
        runtime_scope_refs: [],
        source_class: plannedSource.source_class,
        source_domain: plannedSource.source_domain,
        source_plan_ref: sourcePlanRef(sourcePlan),
        ...(input.schema_bundle_hash === undefined ? {} : { schema_bundle_hash: input.schema_bundle_hash }),
        ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
      }),
    );
  }
  return declarations;
}

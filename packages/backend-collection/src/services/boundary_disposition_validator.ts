import type {
  CollectionBoundaryRecord,
  CollectionBoundarySourceBoundaryRecord,
} from "../models/collection_boundary.ts";
import { normalizeCollectionBoundaryRecord } from "../models/collection_boundary.ts";
import type { SourcePlanPlannedSourceRecord, SourcePlanRecord } from "../models/source_plan.ts";
import { normalizeSourcePlanRecord, sourcePlanRef } from "../models/source_plan.ts";

export type BoundaryDispositionValidationErrorCode =
  | "BOUNDARY_AUDIT_REFS_REQUIRED"
  | "BOUNDARY_DUPLICATE_SOURCE_DISPOSITION"
  | "BOUNDARY_PLANNED_SOURCE_OMITTED"
  | "BOUNDARY_SOURCE_OUTSIDE_PLAN"
  | "BOUNDARY_SOURCE_PLAN_REF_MISMATCH";

export class BoundaryDispositionValidationError extends Error {
  readonly code: BoundaryDispositionValidationErrorCode;

  constructor(code: BoundaryDispositionValidationErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "BoundaryDispositionValidationError";
    this.code = code;
  }
}

function plannedKey(source: SourcePlanPlannedSourceRecord) {
  return `${source.source_domain}\u001e${source.partition_scope_refs.join("\u001f")}`;
}

function boundaryKey(boundary: CollectionBoundarySourceBoundaryRecord) {
  return `${boundary.source_domain}\u001e${boundary.partition_scope_refs.join("\u001f")}`;
}

export function validateBoundaryDisposition(input: {
  collection_boundary: CollectionBoundaryRecord;
  source_plan: SourcePlanRecord;
}) {
  const sourcePlan = normalizeSourcePlanRecord(input.source_plan);
  const boundary = normalizeCollectionBoundaryRecord(input.collection_boundary);
  const expectedPlanRef = sourcePlanRef(sourcePlan);
  if (boundary.source_plan_ref !== expectedPlanRef) {
    throw new BoundaryDispositionValidationError(
      "BOUNDARY_SOURCE_PLAN_REF_MISMATCH",
      "collection boundary must reference the frozen source plan ref",
    );
  }

  const plannedSourcesByKey = new Map(
    sourcePlan.planned_sources.map((source) => [plannedKey(source), source] as const),
  );
  const seenBoundaryKeys = new Set<string>();

  for (const sourceBoundary of boundary.source_boundaries) {
    if (
      sourceBoundary.request_audit_refs.length === 0 &&
      sourceBoundary.page_request_audit_refs.length === 0
    ) {
      throw new BoundaryDispositionValidationError(
        "BOUNDARY_AUDIT_REFS_REQUIRED",
        "source boundary dispositions must retain request or page audit refs",
      );
    }

    const key = boundaryKey(sourceBoundary);
    if (!plannedSourcesByKey.has(key)) {
      throw new BoundaryDispositionValidationError(
        "BOUNDARY_SOURCE_OUTSIDE_PLAN",
        `boundary source ${sourceBoundary.source_domain} with partition set ${sourceBoundary.partition_scope_refs.join(",")} is not in the source plan`,
      );
    }
    if (seenBoundaryKeys.has(key)) {
      throw new BoundaryDispositionValidationError(
        "BOUNDARY_DUPLICATE_SOURCE_DISPOSITION",
        `boundary source ${sourceBoundary.source_domain} has more than one disposition for the same partition set`,
      );
    }
    seenBoundaryKeys.add(key);
  }

  for (const [key, source] of plannedSourcesByKey) {
    if (!seenBoundaryKeys.has(key)) {
      throw new BoundaryDispositionValidationError(
        "BOUNDARY_PLANNED_SOURCE_OMITTED",
        `planned source ${source.source_domain} with partition set ${source.partition_scope_refs.join(",")} has no explicit boundary disposition`,
      );
    }
  }

  return {
    boundary_disposition_count: boundary.source_boundaries.length,
    planned_source_count: sourcePlan.planned_sources.length,
  };
}

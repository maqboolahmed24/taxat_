import {
  collectionBoundaryRef,
  normalizeCollectionBoundaryRecord,
  type CollectionBoundaryRecord,
} from "../models/collection_boundary.ts";
import {
  normalizeSourceDomainDeclarationRecord,
  sourceDomainDeclarationKey,
  sourceDomainDeclarationRef,
  type SourceDomainDeclarationKind,
  type SourceDomainDeclarationRecord,
} from "../models/source_domain_declaration.ts";
import {
  normalizeSourcePlanRecord,
  sourcePlanRef,
  type SourcePlanPlannedSourceRecord,
  type SourcePlanRecord,
} from "../models/source_plan.ts";

export type SourceDomainDeclarationValidationErrorCode =
  | "SOURCE_DOMAIN_DECLARATION_BOUNDARY_MISMATCH"
  | "SOURCE_DOMAIN_DECLARATION_CONFLICTING_KIND"
  | "SOURCE_DOMAIN_DECLARATION_DUPLICATE"
  | "SOURCE_DOMAIN_DECLARATION_FOR_COLLECTED_SOURCE"
  | "SOURCE_DOMAIN_DECLARATION_MANIFEST_MISMATCH"
  | "SOURCE_DOMAIN_DECLARATION_MISSING_REQUIRED_POSTURE"
  | "SOURCE_DOMAIN_DECLARATION_PLAN_MISMATCH"
  | "SOURCE_DOMAIN_DECLARATION_SOURCE_CLASS_MISMATCH"
  | "SOURCE_DOMAIN_DECLARATION_SOURCE_OUTSIDE_PLAN";

export class SourceDomainDeclarationValidationError extends Error {
  readonly code: SourceDomainDeclarationValidationErrorCode;

  constructor(code: SourceDomainDeclarationValidationErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SourceDomainDeclarationValidationError";
    this.code = code;
  }
}

function plannedKey(source: Pick<SourcePlanPlannedSourceRecord, "partition_scope_refs" | "source_domain">) {
  return `${source.source_domain}\u001e${source.partition_scope_refs.join("\u001f")}`;
}

function declarationPlanKey(
  declaration: Pick<SourceDomainDeclarationRecord, "partition_scope_refs" | "source_domain">,
) {
  return `${declaration.source_domain}\u001e${declaration.partition_scope_refs.join("\u001f")}`;
}

function declarationRefSets(declarations: SourceDomainDeclarationRecord[]) {
  const refs = {
    exclusion_refs: [] as string[],
    missing_source_declarations: [] as string[],
    no_data_confirmed_declarations: [] as string[],
    stale_source_declarations: [] as string[],
  };

  for (const declaration of declarations) {
    const ref = sourceDomainDeclarationRef(declaration);
    if (declaration.declaration_kind === "EXCLUDED_BY_POLICY") {
      refs.exclusion_refs.push(ref);
    } else if (declaration.declaration_kind === "NO_DATA_CONFIRMED_AT_CUTOFF") {
      refs.no_data_confirmed_declarations.push(ref);
    } else if (declaration.declaration_kind === "MISSING_AT_CUTOFF") {
      refs.missing_source_declarations.push(ref);
    } else {
      refs.stale_source_declarations.push(ref);
    }
  }

  return {
    exclusion_refs: refs.exclusion_refs.sort(),
    missing_source_declarations: refs.missing_source_declarations.sort(),
    no_data_confirmed_declarations: refs.no_data_confirmed_declarations.sort(),
    stale_source_declarations: refs.stale_source_declarations.sort(),
  };
}

export function validateSourceDomainDeclarations(input: {
  collection_boundary: CollectionBoundaryRecord;
  declarations: readonly SourceDomainDeclarationRecord[];
  source_plan: SourcePlanRecord;
}) {
  const sourcePlan = normalizeSourcePlanRecord(input.source_plan);
  const boundary = normalizeCollectionBoundaryRecord(input.collection_boundary);
  const boundaryRef = collectionBoundaryRef(boundary);
  const planRef = sourcePlanRef(sourcePlan);
  if (boundary.source_plan_ref !== planRef) {
    throw new SourceDomainDeclarationValidationError(
      "SOURCE_DOMAIN_DECLARATION_PLAN_MISMATCH",
      "collection boundary must reference the same source plan as declarations",
    );
  }

  const plannedSourcesByKey = new Map<string, SourcePlanPlannedSourceRecord>();
  for (const plannedSource of sourcePlan.planned_sources) {
    plannedSourcesByKey.set(plannedKey(plannedSource), plannedSource);
  }
  const boundariesByKey = new Map(
    boundary.source_boundaries.map((sourceBoundary) => [
      `${sourceBoundary.source_domain}\u001e${sourceBoundary.partition_scope_refs.join("\u001f")}`,
      sourceBoundary,
    ] as const),
  );
  const normalizedDeclarations = input.declarations
    .map((declaration) => normalizeSourceDomainDeclarationRecord(declaration))
    .sort((left, right) => sourceDomainDeclarationKey(left).localeCompare(sourceDomainDeclarationKey(right)));

  const declarationByPlanKey = new Map<string, SourceDomainDeclarationRecord>();
  const declarationKeyByPlanKey = new Map<string, SourceDomainDeclarationKind>();
  for (const declaration of normalizedDeclarations) {
    if (declaration.manifest_id !== sourcePlan.manifest_id || declaration.manifest_id !== boundary.manifest_id) {
      throw new SourceDomainDeclarationValidationError(
        "SOURCE_DOMAIN_DECLARATION_MANIFEST_MISMATCH",
        "source-domain declarations must match source plan and collection boundary manifest",
      );
    }
    if (declaration.source_plan_ref !== planRef) {
      throw new SourceDomainDeclarationValidationError(
        "SOURCE_DOMAIN_DECLARATION_PLAN_MISMATCH",
        "source-domain declarations must reference the frozen source plan",
      );
    }
    if (declaration.collection_boundary_ref !== boundaryRef) {
      throw new SourceDomainDeclarationValidationError(
        "SOURCE_DOMAIN_DECLARATION_BOUNDARY_MISMATCH",
        "source-domain declarations must reference the frozen collection boundary",
      );
    }

    const key = declarationPlanKey(declaration);
    const plannedSource = plannedSourcesByKey.get(key);
    if (!plannedSource) {
      throw new SourceDomainDeclarationValidationError(
        "SOURCE_DOMAIN_DECLARATION_SOURCE_OUTSIDE_PLAN",
        `source-domain declaration ${declaration.declaration_id} is outside the frozen source plan`,
      );
    }
    if (declaration.source_class !== plannedSource.source_class) {
      throw new SourceDomainDeclarationValidationError(
        "SOURCE_DOMAIN_DECLARATION_SOURCE_CLASS_MISMATCH",
        `source-domain declaration ${declaration.declaration_id} has a source_class mismatch`,
      );
    }

    const existing = declarationKeyByPlanKey.get(key);
    if (existing !== undefined) {
      if (existing !== declaration.declaration_kind) {
        throw new SourceDomainDeclarationValidationError(
          "SOURCE_DOMAIN_DECLARATION_CONFLICTING_KIND",
          `source ${declaration.source_domain} has conflicting declarations for the same partition scope`,
        );
      }
      throw new SourceDomainDeclarationValidationError(
        "SOURCE_DOMAIN_DECLARATION_DUPLICATE",
        `source ${declaration.source_domain} has duplicate declarations for the same partition scope`,
      );
    }
    declarationKeyByPlanKey.set(key, declaration.declaration_kind);
    declarationByPlanKey.set(key, declaration);

    const sourceBoundary = boundariesByKey.get(key);
    if (sourceBoundary?.boundary_disposition === "IN_SCOPE_COLLECTED") {
      throw new SourceDomainDeclarationValidationError(
        "SOURCE_DOMAIN_DECLARATION_FOR_COLLECTED_SOURCE",
        `collected source ${declaration.source_domain} cannot also have an omission declaration`,
      );
    }
    if (
      sourceBoundary !== undefined &&
      sourceBoundary.boundary_disposition !== declaration.declaration_kind
    ) {
      throw new SourceDomainDeclarationValidationError(
        "SOURCE_DOMAIN_DECLARATION_CONFLICTING_KIND",
        `source ${declaration.source_domain} declaration does not match the frozen boundary disposition`,
      );
    }
  }

  for (const [key, plannedSource] of plannedSourcesByKey) {
    const sourceBoundary = boundariesByKey.get(key);
    if (sourceBoundary?.boundary_disposition === "IN_SCOPE_COLLECTED") {
      continue;
    }
    if (!declarationByPlanKey.has(key)) {
      throw new SourceDomainDeclarationValidationError(
        "SOURCE_DOMAIN_DECLARATION_MISSING_REQUIRED_POSTURE",
        `planned source ${plannedSource.source_domain} has no collected posture or explicit declaration`,
      );
    }
  }

  return {
    declaration_count: normalizedDeclarations.length,
    declared_source_count: declarationByPlanKey.size,
    ...declarationRefSets(normalizedDeclarations),
  };
}

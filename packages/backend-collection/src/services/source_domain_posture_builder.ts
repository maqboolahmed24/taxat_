import {
  normalizeCollectionBoundaryRecord,
  type CollectionBoundaryRecord,
  type CollectionBoundarySourceBoundaryRecord,
} from "../models/collection_boundary.ts";
import { candidateFactRef, normalizeCandidateFactRecord, type CandidateFactRecord } from "../models/candidate_fact.ts";
import { canonicalFactRef, normalizeCanonicalFactRecord, type CanonicalFactRecord } from "../models/canonical_fact.ts";
import { conflictRecordRef, normalizeConflictRecordRecord, type ConflictRecordRecord } from "../models/conflict_record.ts";
import { normalizeEvidenceItemRecord, type EvidenceItemRecord } from "../models/evidence_item.ts";
import {
  normalizeInputFreezeSourceDomainPosture,
  type InputFreezeSourceDomainPostureRecord,
} from "../models/input_freeze.ts";
import {
  sourceDomainDeclarationRef,
  normalizeSourceDomainDeclarationRecord,
  type SourceDomainDeclarationRecord,
} from "../models/source_domain_declaration.ts";
import { normalizeSourceRecordRecord, type SourceRecordRecord } from "../models/source_record.ts";
import {
  normalizeCollectionRuntimeScopes,
  normalizeCollectionSourceClassOrNull,
  normalizeCollectionString,
  normalizeCollectionStringSet,
} from "../models/collection_control_common.ts";

export type SourceDomainPostureBuildResult = {
  exclusion_refs: string[];
  missing_source_declarations: string[];
  no_data_confirmed_declarations: string[];
  source_domain_postures: InputFreezeSourceDomainPostureRecord[];
  stale_source_declarations: string[];
};

export type SourceDomainPostureBuilderErrorCode =
  | "SOURCE_DOMAIN_DECLARATION_REQUIRED"
  | "SOURCE_DOMAIN_POSTURE_CONFLICT"
  | "SOURCE_DOMAIN_POSTURE_REQUIRED";

export class SourceDomainPostureBuilderError extends Error {
  readonly code: SourceDomainPostureBuilderErrorCode;

  constructor(code: SourceDomainPostureBuilderErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SourceDomainPostureBuilderError";
    this.code = code;
  }
}

type DomainGroup = {
  boundaries: CollectionBoundarySourceBoundaryRecord[];
  source_domain: string;
};

function groupBoundaryDomains(boundary: CollectionBoundaryRecord): DomainGroup[] {
  const groups = new Map<string, CollectionBoundarySourceBoundaryRecord[]>();
  for (const sourceBoundary of boundary.source_boundaries) {
    const key = sourceBoundary.source_domain;
    groups.set(key, [...(groups.get(key) ?? []), sourceBoundary]);
  }
  return [...groups.entries()]
    .map(([sourceDomain, boundaries]) => ({
      boundaries,
      source_domain: sourceDomain,
    }))
    .sort((left, right) => left.source_domain.localeCompare(right.source_domain));
}

function requireSingleValue<T>(
  label: string,
  values: readonly T[],
  equals: (left: T, right: T) => boolean = (left, right) => left === right,
) {
  const first = values[0];
  if (first === undefined) {
    throw new SourceDomainPostureBuilderError(
      "SOURCE_DOMAIN_POSTURE_REQUIRED",
      `${label} requires at least one boundary value`,
    );
  }
  if (!values.every((value) => equals(value, first))) {
    throw new SourceDomainPostureBuilderError(
      "SOURCE_DOMAIN_POSTURE_CONFLICT",
      `${label} cannot be represented as one source-domain posture because values differ`,
    );
  }
  return first;
}

function intersects(left: readonly string[], right: readonly string[]) {
  const rightSet = new Set(right);
  return left.some((value) => rightSet.has(value));
}

function sourceRecordsForDomain(
  sourceRecords: readonly SourceRecordRecord[],
  boundaries: readonly CollectionBoundarySourceBoundaryRecord[],
) {
  return sourceRecords.filter((record) => {
    const sourceRecord = normalizeSourceRecordRecord(record);
    return boundaries.some(
      (boundary) =>
        boundary.boundary_disposition === "IN_SCOPE_COLLECTED" &&
        boundary.source_class === sourceRecord.source_class &&
        intersects(boundary.partition_scope_refs, [sourceRecord.business_partition]),
    );
  });
}

function evidenceForSources(
  evidenceItems: readonly EvidenceItemRecord[],
  sourceRecords: readonly SourceRecordRecord[],
) {
  const sourceIds = new Set(sourceRecords.map((record) => record.source_record_id));
  return evidenceItems.filter((item) =>
    sourceIds.has(normalizeEvidenceItemRecord(item).source_record_id),
  );
}

function candidatesForSources(
  candidateFacts: readonly CandidateFactRecord[],
  sourceRecords: readonly SourceRecordRecord[],
) {
  const sourceRefs = new Set(sourceRecords.map((record) => `source-record://${record.source_record_id}`));
  return candidateFacts.filter((fact) =>
    normalizeCandidateFactRecord(fact).source_record_refs.some((ref) => sourceRefs.has(ref)),
  );
}

function canonicalForCandidates(
  canonicalFacts: readonly CanonicalFactRecord[],
  candidateFacts: readonly CandidateFactRecord[],
) {
  const candidateRefs = new Set(candidateFacts.map((fact) => candidateFactRef(fact)));
  return canonicalFacts.filter((fact) =>
    normalizeCanonicalFactRecord(fact).promoted_from_candidate_fact_refs.some((ref) =>
      candidateRefs.has(ref),
    ),
  );
}

function conflictsForFacts(
  conflictRecords: readonly ConflictRecordRecord[],
  candidateFacts: readonly CandidateFactRecord[],
  canonicalFacts: readonly CanonicalFactRecord[],
) {
  const factRefs = new Set([
    ...candidateFacts.map((fact) => candidateFactRef(fact)),
    ...canonicalFacts.map((fact) => canonicalFactRef(fact)),
  ]);
  return conflictRecords.filter((record) =>
    normalizeConflictRecordRecord(record).involved_fact_refs.some((ref) => factRefs.has(ref)),
  );
}

function declarationDomains(input: {
  declarations: readonly SourceDomainDeclarationRecord[];
  kind: SourceDomainDeclarationRecord["declaration_kind"];
}) {
  return new Set(
    input.declarations
      .map((declaration) => normalizeSourceDomainDeclarationRecord(declaration))
      .filter((declaration) => declaration.declaration_kind === input.kind)
      .map((declaration) => declaration.source_domain),
  );
}

function assertDeclarationExists(input: {
  declarations: readonly SourceDomainDeclarationRecord[];
  disposition: SourceDomainDeclarationRecord["declaration_kind"];
  source_domain: string;
}) {
  const matching = input.declarations
    .map((declaration) => normalizeSourceDomainDeclarationRecord(declaration))
    .filter(
      (declaration) =>
        declaration.declaration_kind === input.disposition &&
        declaration.source_domain === input.source_domain,
    );
  if (matching.length === 0) {
    throw new SourceDomainPostureBuilderError(
      "SOURCE_DOMAIN_DECLARATION_REQUIRED",
      `${input.disposition} posture for ${input.source_domain} requires a source-domain declaration`,
    );
  }
  return matching.map((declaration) => sourceDomainDeclarationRef(declaration));
}

export function buildSourceDomainPostures(input: {
  candidate_facts?: readonly CandidateFactRecord[];
  canonical_facts?: readonly CanonicalFactRecord[];
  collection_boundary: CollectionBoundaryRecord;
  conflict_records?: readonly ConflictRecordRecord[];
  evidence_items?: readonly EvidenceItemRecord[];
  source_domain_declarations?: readonly SourceDomainDeclarationRecord[];
  source_records?: readonly SourceRecordRecord[];
}): SourceDomainPostureBuildResult {
  const boundary = normalizeCollectionBoundaryRecord(input.collection_boundary);
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
  const conflictRecords = (input.conflict_records ?? []).map((record) =>
    normalizeConflictRecordRecord(record),
  );
  const declarations = (input.source_domain_declarations ?? []).map((declaration) =>
    normalizeSourceDomainDeclarationRecord(declaration),
  );
  const postures: InputFreezeSourceDomainPostureRecord[] = [];
  const exclusionRefs: string[] = [];
  const noDataDeclarations: string[] = [];
  const missingDeclarations: string[] = [];
  const staleDeclarations: string[] = [];

  for (const group of groupBoundaryDomains(boundary)) {
    const disposition = requireSingleValue(
      `${group.source_domain}.boundary_disposition`,
      group.boundaries.map((sourceBoundary) => sourceBoundary.boundary_disposition),
    );
    const lateDataPolicyRef = requireSingleValue(
      `${group.source_domain}.late_data_policy_ref`,
      group.boundaries.map((sourceBoundary) => sourceBoundary.late_data_policy_ref),
    );
    const sourceClass = requireSingleValue(
      `${group.source_domain}.source_class`,
      group.boundaries.map((sourceBoundary) => sourceBoundary.source_class),
      (left, right) => left === right,
    );
    const partitionScopeRefs = normalizeCollectionStringSet(
      "source_domain_posture.partition_scope_refs",
      group.boundaries.flatMap((sourceBoundary) => sourceBoundary.partition_scope_refs),
    );
    const runtimeScopeRefs = normalizeCollectionRuntimeScopes(
      "source_domain_posture.runtime_scope_refs",
      group.boundaries.flatMap((sourceBoundary) => sourceBoundary.runtime_scope_refs),
    );
    const domainSourceRecords =
      disposition === "IN_SCOPE_COLLECTED"
        ? sourceRecordsForDomain(sourceRecords, group.boundaries)
        : [];
    const domainEvidence = evidenceForSources(evidenceItems, domainSourceRecords);
    const domainCandidates = candidatesForSources(candidateFacts, domainSourceRecords);
    const domainCanonical = canonicalForCandidates(canonicalFacts, domainCandidates);
    const domainConflicts = conflictsForFacts(
      conflictRecords,
      domainCandidates,
      domainCanonical,
    );

    if (disposition === "EXCLUDED_BY_POLICY") {
      assertDeclarationExists({
        declarations,
        disposition,
        source_domain: group.source_domain,
      });
      exclusionRefs.push(group.source_domain);
    } else if (disposition === "NO_DATA_CONFIRMED_AT_CUTOFF") {
      assertDeclarationExists({
        declarations,
        disposition,
        source_domain: group.source_domain,
      });
      noDataDeclarations.push(group.source_domain);
    } else if (disposition === "MISSING_AT_CUTOFF") {
      assertDeclarationExists({
        declarations,
        disposition,
        source_domain: group.source_domain,
      });
      missingDeclarations.push(group.source_domain);
    } else if (disposition === "STALE_AT_CUTOFF") {
      assertDeclarationExists({
        declarations,
        disposition,
        source_domain: group.source_domain,
      });
      staleDeclarations.push(group.source_domain);
    }

    postures.push(
      normalizeInputFreezeSourceDomainPosture({
        boundary_disposition: disposition,
        canonical_fact_count: domainCanonical.length,
        candidate_fact_count: domainCandidates.length,
        conflict_count: domainConflicts.length,
        evidence_item_count: domainEvidence.length,
        late_data_policy_ref: lateDataPolicyRef,
        partition_scope_refs: partitionScopeRefs,
        runtime_scope_refs: runtimeScopeRefs as InputFreezeSourceDomainPostureRecord["runtime_scope_refs"],
        source_class: normalizeCollectionSourceClassOrNull(
          "source_domain_posture.source_class",
          sourceClass,
        ),
        source_domain: normalizeCollectionString(
          "source_domain_posture.source_domain",
          group.source_domain,
        ),
        source_record_count: domainSourceRecords.length,
      }),
    );
  }

  const declaredDomains = new Set([
    ...declarationDomains({ declarations, kind: "EXCLUDED_BY_POLICY" }),
    ...declarationDomains({ declarations, kind: "NO_DATA_CONFIRMED_AT_CUTOFF" }),
    ...declarationDomains({ declarations, kind: "MISSING_AT_CUTOFF" }),
    ...declarationDomains({ declarations, kind: "STALE_AT_CUTOFF" }),
  ]);
  const postureDomains = new Set(postures.map((posture) => posture.source_domain));
  for (const sourceDomain of declaredDomains) {
    if (!postureDomains.has(sourceDomain)) {
      throw new SourceDomainPostureBuilderError(
        "SOURCE_DOMAIN_POSTURE_REQUIRED",
        `declaration for ${sourceDomain} has no matching source_domain_posture`,
      );
    }
  }

  return {
    exclusion_refs: normalizeCollectionStringSet(
      "input_freeze.exclusion_refs",
      exclusionRefs,
    ),
    missing_source_declarations: normalizeCollectionStringSet(
      "input_freeze.missing_source_declarations",
      missingDeclarations,
    ),
    no_data_confirmed_declarations: normalizeCollectionStringSet(
      "input_freeze.no_data_confirmed_declarations",
      noDataDeclarations,
    ),
    source_domain_postures: postures.sort((left, right) =>
      left.source_domain.localeCompare(right.source_domain),
    ),
    stale_source_declarations: normalizeCollectionStringSet(
      "input_freeze.stale_source_declarations",
      staleDeclarations,
    ),
  };
}

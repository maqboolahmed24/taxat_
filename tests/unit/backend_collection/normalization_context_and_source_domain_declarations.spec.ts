import { expect, test } from "@playwright/test";

import {
  SourceDomainDeclarationValidationError,
  buildCollectionBoundary,
  buildCollectionBoundaryContract,
  buildSourceDomainDeclarationRecord,
  buildSourcePlan,
  buildSourceWindow,
  declareConfirmedEmptySources,
  declareExclusions,
  declareMissingSources,
  declareStaleSources,
  deriveCollectionBoundaryHash,
  freezeNormalizationContext,
  normalizeCollectionBoundaryRecord,
  validateSourceDomainDeclarations,
  type CollectionBoundaryRecord,
  type CollectionBoundarySourceBoundaryRecord,
  type SourcePlanPlannedSourceRecord,
} from "../../../packages/backend-collection/src/index.ts";

function plannedSource(source_domain: string): SourcePlanPlannedSourceRecord {
  return {
    completeness_expectation_ref: `completeness://${source_domain}`,
    cursor_strategy_ref: `cursor-strategy://${source_domain}`,
    freshness_slo_ref: `freshness://${source_domain}`,
    late_data_policy_ref: "REVIEW_IF_LATE",
    partition_scope_refs: [`partition://${source_domain}/primary`],
    provider_binding_ref: `provider-binding://${source_domain}`,
    query_basis_ref: `query-basis://${source_domain}`,
    read_model: "AS_OF",
    required_schema_refs: [`schema://${source_domain}/v1`],
    required_source_class_refs: [],
    source_class: "AUTHORITY_REFERENCE",
    source_domain,
  };
}

function sourceBoundary(
  source_domain: string,
  boundary_disposition: CollectionBoundarySourceBoundaryRecord["boundary_disposition"],
): CollectionBoundarySourceBoundaryRecord {
  return {
    boundary_disposition,
    completeness_expectation_ref: `completeness://${source_domain}`,
    cursor_checkpoint_ref: `cursor://${source_domain}`,
    late_data_policy_ref: "REVIEW_IF_LATE",
    page_request_audit_refs: [],
    partition_scope_refs: [`partition://${source_domain}/primary`],
    provider_api_version: "api.v1",
    provider_environment_ref: "provider-env://hmrc/sandbox",
    provider_schema_version: "schema.v1",
    request_audit_refs: [`audit://${source_domain}/request`],
    revision_ref: `revision://${source_domain}`,
    runtime_scope_refs: ["year_end"],
    source_class: "AUTHORITY_REFERENCE",
    source_domain,
  };
}

function buildArtifacts() {
  const domains = ["income_sources", "vat_obligations", "payroll", "pensions", "bank_interest"];
  const sourcePlan = buildSourcePlan({
    manifest_id: "manifest-0113",
    planned_sources: domains.map((domain) => plannedSource(domain)),
    required_domains: domains,
  });
  const sourceWindow = buildSourceWindow({
    collection_completed_at: "2026-04-27T11:05:00Z",
    collection_started_at: "2026-04-27T11:00:00Z",
    read_cutoff_at: "2026-04-27T11:10:00Z",
    source_plan: sourcePlan,
  });
  const collectionBoundary = buildCollectionBoundary({
    collection_boundary_id: "collection-boundary.manifest-0113",
    connector_build_id: "connector-build://hmrc/0113",
    connector_profile_ref: "connector-profile://hmrc",
    source_boundaries: [
      sourceBoundary("income_sources", "IN_SCOPE_COLLECTED"),
      sourceBoundary("vat_obligations", "NO_DATA_CONFIRMED_AT_CUTOFF"),
      sourceBoundary("payroll", "EXCLUDED_BY_POLICY"),
      sourceBoundary("pensions", "MISSING_AT_CUTOFF"),
      sourceBoundary("bank_interest", "STALE_AT_CUTOFF"),
    ],
    source_plan: sourcePlan,
    source_window: sourceWindow,
  });
  return { collectionBoundary, sourcePlan, sourceWindow };
}

function withoutBoundary(
  boundary: CollectionBoundaryRecord,
  source_domain: string,
): CollectionBoundaryRecord {
  const draft = {
    artifact_type: "CollectionBoundary" as const,
    boundary_coverage_state: boundary.boundary_coverage_state,
    collection_boundary_id: boundary.collection_boundary_id,
    connector_build_id: boundary.connector_build_id,
    connector_profile_ref: boundary.connector_profile_ref,
    manifest_id: boundary.manifest_id,
    read_cutoff_at: boundary.read_cutoff_at,
    source_boundaries: boundary.source_boundaries.filter(
      (sourceBoundary) => sourceBoundary.source_domain !== source_domain,
    ),
    source_plan_ref: boundary.source_plan_ref,
    source_window_id: boundary.source_window_id,
  };
  const collectionBoundaryHash = deriveCollectionBoundaryHash(draft);
  return normalizeCollectionBoundaryRecord({
    ...draft,
    collection_boundary_hash: collectionBoundaryHash,
    contract: buildCollectionBoundaryContract({
      collection_boundary_hash: collectionBoundaryHash,
      collection_boundary_id: draft.collection_boundary_id,
    }),
  });
}

test("normalization context freezes deterministic transformation version lineage", () => {
  const first = freezeNormalizationContext({
    connector_build_refs: ["connector-build://b", "connector-build://a"],
    evidence_rules_ref: "evidence-rules://2026-04",
    extractor_build_refs: ["extractor-build://ocr-v1"],
    mapping_rules_ref: "mapping-rules://2026-04",
    manifest_id: "manifest-0113",
    normalization_rules_ref: "normalization-rules://2026-04",
    produced_at: "2026-04-27T11:12:00Z",
    promotion_rules_ref: "promotion-rules://2026-04",
    schema_bundle_hash: "schema-bundle-hash://0113",
  });
  const replay = freezeNormalizationContext({
    connector_build_refs: ["connector-build://a", "connector-build://b"],
    evidence_rules_ref: "evidence-rules://2026-04",
    extractor_build_refs: ["extractor-build://ocr-v1"],
    mapping_rules_ref: "mapping-rules://2026-04",
    manifest_id: "manifest-0113",
    normalization_rules_ref: "normalization-rules://2026-04",
    produced_at: "2026-04-27T11:12:00Z",
    promotion_rules_ref: "promotion-rules://2026-04",
    schema_bundle_hash: "schema-bundle-hash://0113",
  });

  expect(first.normalization_context_hash).toBe(replay.normalization_context_hash);
  expect(first.transformation_version_set).toEqual([...first.transformation_version_set].sort());
  expect(first.transformation_version_set).toHaveLength(8);
  expect(() =>
    freezeNormalizationContext({
      evidence_rules_ref: "evidence-rules://2026-04",
      mapping_rules_ref: " ",
      manifest_id: "manifest-0113",
      normalization_rules_ref: "normalization-rules://2026-04",
      produced_at: "2026-04-27T11:12:00Z",
      promotion_rules_ref: "promotion-rules://2026-04",
    }),
  ).toThrow();
});

test("declaration helpers preserve confirmed-empty, excluded, missing, and stale posture", () => {
  const { collectionBoundary, sourcePlan } = buildArtifacts();
  const declarations = [
    ...declareExclusions({
      collection_boundary: collectionBoundary,
      produced_at: "2026-04-27T11:12:00Z",
    }),
    ...declareConfirmedEmptySources({
      collection_boundary: collectionBoundary,
      produced_at: "2026-04-27T11:12:00Z",
    }),
    ...declareMissingSources({
      collection_boundary: collectionBoundary,
      produced_at: "2026-04-27T11:12:00Z",
    }),
    ...declareStaleSources({
      collection_boundary: collectionBoundary,
      produced_at: "2026-04-27T11:12:00Z",
    }),
  ];
  const validation = validateSourceDomainDeclarations({
    collection_boundary: collectionBoundary,
    declarations,
    source_plan: sourcePlan,
  });

  expect(validation.declaration_count).toBe(4);
  expect(validation.exclusion_refs).toHaveLength(1);
  expect(validation.no_data_confirmed_declarations).toHaveLength(1);
  expect(validation.missing_source_declarations).toHaveLength(1);
  expect(validation.stale_source_declarations).toHaveLength(1);
  expect(
    declarations.find((declaration) => declaration.source_domain === "vat_obligations"),
  ).toMatchObject({
    declaration_kind: "NO_DATA_CONFIRMED_AT_CUTOFF",
    reason_code: "EMPTY_RESPONSE_CONFIRMED",
  });
});

test("omitted planned source becomes explicit missing declaration when boundary row is absent", () => {
  const { collectionBoundary, sourcePlan } = buildArtifacts();
  const incompleteBoundary = withoutBoundary(collectionBoundary, "pensions");
  const declarations = [
    ...declareExclusions({
      collection_boundary: incompleteBoundary,
      produced_at: "2026-04-27T11:12:00Z",
    }),
    ...declareConfirmedEmptySources({
      collection_boundary: incompleteBoundary,
      produced_at: "2026-04-27T11:12:00Z",
    }),
    ...declareMissingSources({
      collection_boundary: incompleteBoundary,
      produced_at: "2026-04-27T11:12:00Z",
      source_plan: sourcePlan,
    }),
    ...declareStaleSources({
      collection_boundary: incompleteBoundary,
      produced_at: "2026-04-27T11:12:00Z",
    }),
  ];

  expect(
    declarations.find((declaration) => declaration.source_domain === "pensions"),
  ).toMatchObject({
    declaration_kind: "MISSING_AT_CUTOFF",
    reason_code: "NO_BOUNDARY_DISPOSITION",
  });
  expect(() =>
    validateSourceDomainDeclarations({
      collection_boundary: incompleteBoundary,
      declarations,
      source_plan: sourcePlan,
    }),
  ).not.toThrow();
});

test("declaration validation rejects contradictory and collected-source declarations", () => {
  const { collectionBoundary, sourcePlan } = buildArtifacts();
  const [confirmedEmpty] = declareConfirmedEmptySources({
    collection_boundary: collectionBoundary,
    produced_at: "2026-04-27T11:12:00Z",
  });
  const conflictingMissing = buildSourceDomainDeclarationRecord({
    collection_boundary_ref: confirmedEmpty!.collection_boundary_ref,
    declaration_kind: "MISSING_AT_CUTOFF",
    evidence_refs: confirmedEmpty!.evidence_refs,
    late_data_policy_ref: confirmedEmpty!.late_data_policy_ref,
    manifest_id: confirmedEmpty!.manifest_id,
    partition_scope_refs: confirmedEmpty!.partition_scope_refs,
    produced_at: confirmedEmpty!.produced_at,
    reason_code: "MISSING_AT_CUTOFF",
    runtime_scope_refs: confirmedEmpty!.runtime_scope_refs,
    source_class: confirmedEmpty!.source_class,
    source_domain: confirmedEmpty!.source_domain,
    source_plan_ref: confirmedEmpty!.source_plan_ref,
  });

  expect(() =>
    validateSourceDomainDeclarations({
      collection_boundary: collectionBoundary,
      declarations: [confirmedEmpty!, conflictingMissing],
      source_plan: sourcePlan,
    }),
  ).toThrow(SourceDomainDeclarationValidationError);

  const collectedDeclaration = buildSourceDomainDeclarationRecord({
    collection_boundary_ref: confirmedEmpty!.collection_boundary_ref,
    declaration_kind: "EXCLUDED_BY_POLICY",
    evidence_refs: ["audit://income_sources/request"],
    late_data_policy_ref: "REVIEW_IF_LATE",
    manifest_id: "manifest-0113",
    partition_scope_refs: ["partition://income_sources/primary"],
    produced_at: "2026-04-27T11:12:00Z",
    reason_code: "POLICY_EXCLUDED",
    runtime_scope_refs: ["year_end"],
    source_class: "AUTHORITY_REFERENCE",
    source_domain: "income_sources",
    source_plan_ref: confirmedEmpty!.source_plan_ref,
  });

  expect(() =>
    validateSourceDomainDeclarations({
      collection_boundary: collectionBoundary,
      declarations: [collectedDeclaration],
      source_plan: sourcePlan,
    }),
  ).toThrow(SourceDomainDeclarationValidationError);
});

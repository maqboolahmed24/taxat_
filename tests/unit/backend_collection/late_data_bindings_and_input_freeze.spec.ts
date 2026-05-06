import { expect, test } from "@playwright/test";

import {
  CollectionLateDataBindingError,
  FreezeInputSetError,
  buildCollectionBoundary,
  buildConflictSet,
  buildSourcePlan,
  buildSourceWindow,
  classifyCollectionLateData,
  collectionBoundaryRef,
  declareConfirmedEmptySources,
  declareExclusions,
  declareMissingSources,
  declareStaleSources,
  extractCandidateFacts,
  freezeInputSet,
  freezeNormalizationContext,
  inputFreezeRef,
  materializeEvidenceItems,
  materializeSourceRecords,
  projectCollectionLateDataBindings,
  promoteCanonicalFacts,
  selectLateDataPolicyBinding,
  type CollectionBoundaryRecord,
  type FetchDispatchResult,
  type SourcePlanPlannedSourceRecord,
} from "../../../packages/backend-collection/src/index.ts";

function plannedSource(input: {
  domain: string;
  partition: string;
  policy: "EXCLUDE_LATE" | "REVIEW_IF_LATE" | "SPAWN_CHILD_MANIFEST";
  source_class?: SourcePlanPlannedSourceRecord["source_class"];
}): SourcePlanPlannedSourceRecord {
  return {
    completeness_expectation_ref: `completeness://${input.domain}`,
    cursor_strategy_ref: `cursor-strategy://${input.domain}`,
    freshness_slo_ref: `freshness-slo://${input.domain}`,
    late_data_policy_ref: input.policy,
    partition_scope_refs: [input.partition],
    provider_binding_ref: `provider-binding://${input.domain}`,
    query_basis_ref: `query-basis://${input.domain}`,
    read_model: "AS_OF",
    required_schema_refs: [`schema://${input.domain}/v1`],
    required_source_class_refs: [],
    source_class: input.source_class ?? "INSTITUTIONAL_FEED",
    source_domain: input.domain,
  };
}

function fetchResult(input: { domain: string; raw_payload_ref: string }): FetchDispatchResult {
  return {
    cursor_checkpoint_ref: `cursor://${input.domain}/checkpoint-1`,
    empty_response_confirmed: false,
    fetch_audit_refs: [`audit://fetch/${input.domain}`],
    fetch_gap_code_or_null: null,
    fetch_posture: "FETCHED",
    observed_provider_schema_version: `schema://${input.domain}/v1`,
    outcome_code: "SOURCE_FETCHED",
    page_audit_refs: [`audit://fetch/${input.domain}/page-1`],
    provider_api_version: "mtd-v1",
    provider_environment_ref: "provider-env://hmrc/sandbox",
    raw_payload_refs: [{ page_index: 1, raw_payload_ref: input.raw_payload_ref }],
    request_audit_refs: [`audit://request/${input.domain}`],
    revision_ref: `revision://${input.domain}/1`,
    source_domain: input.domain,
  };
}

function buildBoundary(input?: {
  manifest_id?: string;
  policy?: "EXCLUDE_LATE" | "REVIEW_IF_LATE" | "SPAWN_CHILD_MANIFEST";
  source_domain?: string;
}): {
  boundary: CollectionBoundaryRecord;
  plan: ReturnType<typeof buildSourcePlan>;
  window: ReturnType<typeof buildSourceWindow>;
} {
  const manifestId = input?.manifest_id ?? "manifest-0117-unit";
  const sourceDomain = input?.source_domain ?? "vat_obligations";
  const policy = input?.policy ?? "REVIEW_IF_LATE";
  const plan = buildSourcePlan({
    manifest_id: manifestId,
    planned_sources: [
      plannedSource({
        domain: sourceDomain,
        partition: "partition://vat/main",
        policy,
      }),
    ],
    required_domains: [sourceDomain],
  });
  const window = buildSourceWindow({
    collection_completed_at: "2026-04-27T13:50:00Z",
    collection_started_at: "2026-04-27T13:00:00Z",
    read_cutoff_at: "2026-04-27T14:00:00Z",
    source_plan: plan,
  });
  const boundary = buildCollectionBoundary({
    collection_boundary_id: `collection-boundary.${manifestId}`,
    connector_build_id: "connector-build://hmrc/0117",
    connector_profile_ref: "connector-profile://hmrc/mtd",
    source_boundaries: [
      {
        boundary_disposition: "IN_SCOPE_COLLECTED",
        completeness_expectation_ref: `completeness://${sourceDomain}`,
        cursor_checkpoint_ref: `cursor://${sourceDomain}/checkpoint-1`,
        late_data_policy_ref: policy,
        page_request_audit_refs: [`audit://fetch/${sourceDomain}/page-1`],
        partition_scope_refs: ["partition://vat/main"],
        provider_api_version: "mtd-v1",
        provider_environment_ref: "provider-env://hmrc/sandbox",
        provider_schema_version: `schema://${sourceDomain}/v1`,
        request_audit_refs: [`audit://request/${sourceDomain}`],
        revision_ref: `revision://${sourceDomain}/1`,
        runtime_scope_refs: ["prepare_submission"],
        source_class: "INSTITUTIONAL_FEED",
        source_domain: sourceDomain,
      },
    ],
    source_plan: plan,
    source_window: window,
  });
  return { boundary, plan, window };
}

function artifactContractRefs() {
  return [
    "artifact-contract://source-plan",
    "artifact-contract://source-window",
    "artifact-contract://collection-boundary",
    "artifact-contract://normalization-context",
    "artifact-contract://source-record-set",
    "artifact-contract://evidence-item-set",
    "artifact-contract://candidate-fact-set",
    "artifact-contract://conflict-set",
    "artifact-contract://canonical-fact-set",
    "artifact-contract://snapshot",
  ];
}

function normalizationContext(manifest_id: string) {
  return freezeNormalizationContext({
    connector_build_refs: ["connector-build://hmrc/0117"],
    evidence_rules_ref: "evidence-rules://2026-04",
    manifest_id,
    mapping_rules_ref: "mapping-rules://2026-04",
    normalization_rules_ref: "normalization-rules://2026-04",
    produced_at: "2026-04-27T13:55:00Z",
    promotion_rules_ref: "promotion-rules://2026-04",
  });
}

function collectedArtifacts(boundary: CollectionBoundaryRecord) {
  const sources = materializeSourceRecords({
    business_partition: "partition://vat/main",
    captured_at: "2026-04-27T13:45:00Z",
    client_id: "client-0117",
    collection_boundary_ref: collectionBoundaryRef(boundary),
    effective_period: "tax-year://2025-2026",
    fetch_result: fetchResult({
      domain: "vat_obligations",
      raw_payload_ref: "raw://hmrc/vat/0117",
    }),
    ingestion_run_ref: "source-collection-run://0117",
    manifest_id: boundary.manifest_id,
    planned_partition_scope_refs: ["partition://vat/main"],
    provider: "HMRC",
    provider_account_ref: "provider-account://vrn/999999999",
    source_class: "INSTITUTIONAL_FEED",
    tenant_id: "tenant-0117",
  });
  const evidence = materializeEvidenceItems({
    evidence_extraction_available: true,
    expected_partition_scope_refs: ["partition://vat/main"],
    source_records: sources,
  });
  const candidates = extractCandidateFacts({
    evidence_items: evidence,
    extraction_overrides: [
      {
        evidence_item_id: evidence[0]!.evidence_item_id,
        value_payload_ref: "candidate-value://vat/0117",
      },
    ],
    normalization_context: normalizationContext(boundary.manifest_id),
    source_records: sources,
  });
  const conflictSet = buildConflictSet({
    candidate_facts: candidates,
    conflict_detection_policy_ref: "conflict-policy://unit/0117",
    conflict_records: [],
    normalization_context_ref: candidates[0]!.normalization_context_ref,
    produced_at: "2026-04-27T13:57:00Z",
  });
  const canonical = promoteCanonicalFacts({
    candidate_facts: candidates,
    conflict_set: conflictSet,
    evidence_items: evidence,
    promoted_at: "2026-04-27T13:58:00Z",
    source_records: sources,
  });
  return { canonical, candidates, conflictSet, evidence, sources };
}

test("late-data binding projection uses runtime before partition, class, and domain scopes", () => {
  const { boundary } = buildBoundary();
  const bindings = projectCollectionLateDataBindings({
    collection_boundary: boundary,
    runtime_scope_refs: ["prepare_submission"],
  });

  expect(bindings.map((binding) => binding.binding_scope)).toEqual([
    "RUNTIME_SCOPED",
    "PARTITION_SCOPED",
    "SOURCE_CLASS",
    "DOMAIN_WIDE",
  ]);
  const selected = selectLateDataPolicyBinding({
    bindings,
    partition_scope_refs: ["partition://vat/main"],
    runtime_scope_refs: ["prepare_submission"],
    source_class: "INSTITUTIONAL_FEED",
    source_domain: "vat_obligations",
  });
  expect(selected.binding_scope).toBe("RUNTIME_SCOPED");
});

test("same-precedence binding policy ties fail closed", () => {
  const base = {
    partition_scope_refs: ["partition://vat/main"],
    runtime_scope_refs: [],
    source_class: "INSTITUTIONAL_FEED" as const,
    source_domain: "vat_obligations",
  };
  expect(() =>
    selectLateDataPolicyBinding({
      bindings: [
        {
          ...base,
          binding_id: "binding-a",
          binding_scope: "PARTITION_SCOPED",
          late_data_policy_ref: "EXCLUDE_LATE",
          precedence_rank: 2,
        },
        {
          ...base,
          binding_id: "binding-b",
          binding_scope: "PARTITION_SCOPED",
          late_data_policy_ref: "REVIEW_IF_LATE",
          precedence_rank: 2,
        },
      ],
      partition_scope_refs: ["partition://vat/main"],
      runtime_scope_refs: [],
      source_class: "INSTITUTIONAL_FEED",
      source_domain: "vat_obligations",
    }),
  ).toThrow(CollectionLateDataBindingError);
});

test("classification persists no-late-data and review-required monitor posture", async () => {
  const { boundary, window } = buildBoundary();
  const noLate = await classifyCollectionLateData({
    classified_at: "2026-04-27T14:05:00Z",
    collection_boundary: boundary,
    execution_basis_hash: "execution-basis-hash://unit/no-late",
    input_freeze_ref: "input-freeze://pending",
    manifest_hash: "manifest-hash://unit/no-late",
    runtime_scope_refs: ["prepare_submission"],
    source_window_ref: `source-window://${window.source_window_id}`,
  });
  expect(noLate.indicator_set.items).toEqual([]);
  expect(noLate.monitor_result.late_data_status).toBe("NO_LATE_DATA");

  const review = await classifyCollectionLateData({
    classified_at: "2026-04-27T14:06:00Z",
    collection_boundary: boundary,
    execution_basis_hash: "execution-basis-hash://unit/review",
    input_freeze_ref: "input-freeze://pending",
    manifest_hash: "manifest-hash://unit/review",
    observations: [
      {
        discovered_at: "2026-04-27T14:06:00Z",
        drift_signal: "POST_CUTOFF_RECORD_OBSERVED",
        partition_scope_refs: ["partition://vat/main"],
        request_audit_ref: "audit://request/vat/post-cutoff",
        runtime_scope_refs: ["prepare_submission"],
        source_class: "INSTITUTIONAL_FEED",
        source_domain: "vat_obligations",
        source_record_ref: "source-record://late-vat",
        t_effective_or_null: "2026-04-27T13:30:00Z",
        t_visible_or_null: "2026-04-27T14:03:00Z",
      },
    ],
    runtime_scope_refs: ["prepare_submission"],
    source_window_ref: `source-window://${window.source_window_id}`,
  });
  expect(review.indicator_set.items[0]!.indicator_type).toBe("POST_CUTOFF_RECORD");
  expect(review.indicator_set.items[0]!.detection_basis).toBe("SOURCE_RECORD_TIMESTAMP");
  expect(review.monitor_result.late_data_status).toBe("REVIEW_REQUIRED");
  expect(review.findings[0]!.finding_state).toBe("REVIEW_REQUIRED");
});

test("classification resolves excluded-only and child-manifest late data", async () => {
  const excludedBoundary = buildBoundary({
    manifest_id: "manifest-0117-excluded",
    policy: "EXCLUDE_LATE",
  });
  const excluded = await classifyCollectionLateData({
    classified_at: "2026-04-27T14:07:00Z",
    collection_boundary: excludedBoundary.boundary,
    execution_basis_hash: "execution-basis-hash://unit/excluded",
    input_freeze_ref: "input-freeze://pending",
    manifest_hash: "manifest-hash://unit/excluded",
    observations: [
      {
        discovered_at: "2026-04-27T14:07:00Z",
        drift_signal: "CURSOR_ADVANCED_AFTER_CUTOFF",
        partition_scope_refs: ["partition://vat/main"],
        request_audit_ref: "audit://request/vat/cursor-advanced",
        runtime_scope_refs: ["prepare_submission"],
        source_class: "INSTITUTIONAL_FEED",
        source_domain: "vat_obligations",
      },
    ],
    runtime_scope_refs: ["prepare_submission"],
    source_window_ref: `source-window://${excludedBoundary.window.source_window_id}`,
  });
  expect(excluded.monitor_result.late_data_status).toBe("EXCLUDED_LATE_ONLY");
  expect(excluded.findings[0]!.finding_state).toBe("EXCLUDED_FROM_ACTIVE_MANIFEST");

  const childBoundary = buildBoundary({
    manifest_id: "manifest-0117-child",
    policy: "SPAWN_CHILD_MANIFEST",
  });
  const child = await classifyCollectionLateData({
    classified_at: "2026-04-27T14:08:00Z",
    collection_boundary: childBoundary.boundary,
    execution_basis_hash: "execution-basis-hash://unit/child",
    input_freeze_ref: "input-freeze://pending",
    manifest_hash: "manifest-hash://unit/child",
    observations: [
      {
        discovered_at: "2026-04-27T14:08:00Z",
        drift_signal: "SCHEMA_VERSION_ADVANCED_AFTER_CUTOFF",
        partition_scope_refs: ["partition://vat/main"],
        request_audit_ref: "audit://request/vat/schema-advanced",
        runtime_scope_refs: ["prepare_submission"],
        source_class: "INSTITUTIONAL_FEED",
        source_domain: "vat_obligations",
      },
    ],
    runtime_scope_refs: ["prepare_submission"],
    source_window_ref: `source-window://${childBoundary.window.source_window_id}`,
  });
  expect(child.monitor_result.late_data_status).toBe("SPAWN_CHILD_MANIFEST_REQUIRED");
  expect(child.findings[0]!.finding_state).toBe("CHILD_MANIFEST_SPAWNED");
  expect(child.monitor_result.child_manifest_refs).toHaveLength(1);
});

test("freezeInputSet assembles stable postures and a stable input_set_hash", async () => {
  const manifestId = "manifest-0117-freeze-unit";
  const plan = buildSourcePlan({
    manifest_id: manifestId,
    planned_sources: [
      plannedSource({
        domain: "vat_obligations",
        partition: "partition://vat/main",
        policy: "REVIEW_IF_LATE",
      }),
      plannedSource({
        domain: "paye_income",
        partition: "partition://paye/main",
        policy: "EXCLUDE_LATE",
        source_class: "DECLARED_ASSERTION",
      }),
      plannedSource({
        domain: "cis_statement",
        partition: "partition://cis/main",
        policy: "EXCLUDE_LATE",
      }),
      plannedSource({
        domain: "bank_interest",
        partition: "partition://bank/main",
        policy: "REVIEW_IF_LATE",
        source_class: "DOCUMENTARY_EVIDENCE",
      }),
      plannedSource({
        domain: "company_filing",
        partition: "partition://company/main",
        policy: "SPAWN_CHILD_MANIFEST",
        source_class: "AUTHORITY_REFERENCE",
      }),
    ],
    required_domains: [
      "bank_interest",
      "cis_statement",
      "company_filing",
      "paye_income",
      "vat_obligations",
    ],
  });
  const window = buildSourceWindow({
    collection_completed_at: "2026-04-27T13:50:00Z",
    collection_started_at: "2026-04-27T13:00:00Z",
    read_cutoff_at: "2026-04-27T14:00:00Z",
    source_plan: plan,
  });
  const boundary = buildCollectionBoundary({
    collection_boundary_id: `collection-boundary.${manifestId}`,
    connector_build_id: "connector-build://hmrc/0117",
    connector_profile_ref: "connector-profile://hmrc/mtd",
    source_boundaries: plan.planned_sources.map((source) => ({
      boundary_disposition:
        source.source_domain === "vat_obligations"
          ? "IN_SCOPE_COLLECTED"
          : source.source_domain === "paye_income"
            ? "EXCLUDED_BY_POLICY"
            : source.source_domain === "cis_statement"
              ? "NO_DATA_CONFIRMED_AT_CUTOFF"
              : source.source_domain === "bank_interest"
                ? "MISSING_AT_CUTOFF"
                : "STALE_AT_CUTOFF",
      completeness_expectation_ref: source.completeness_expectation_ref,
      cursor_checkpoint_ref: `cursor://${source.source_domain}/checkpoint-1`,
      late_data_policy_ref: source.late_data_policy_ref,
      page_request_audit_refs: [`audit://fetch/${source.source_domain}/page-1`],
      partition_scope_refs: source.partition_scope_refs,
      provider_api_version: "mtd-v1",
      provider_environment_ref: "provider-env://hmrc/sandbox",
      provider_schema_version: `schema://${source.source_domain}/v1`,
      request_audit_refs: [`audit://request/${source.source_domain}`],
      revision_ref: `revision://${source.source_domain}/1`,
      runtime_scope_refs: ["prepare_submission"],
      source_class: source.source_class,
      source_domain: source.source_domain,
    })),
    source_plan: plan,
    source_window: window,
  });
  const artifacts = collectedArtifacts(boundary);
  const declarations = [
    ...declareExclusions({
      collection_boundary: boundary,
      produced_at: "2026-04-27T13:59:00Z",
    }),
    ...declareConfirmedEmptySources({
      collection_boundary: boundary,
      produced_at: "2026-04-27T13:59:00Z",
    }),
    ...declareMissingSources({
      collection_boundary: boundary,
      produced_at: "2026-04-27T13:59:00Z",
    }),
    ...declareStaleSources({
      collection_boundary: boundary,
      produced_at: "2026-04-27T13:59:00Z",
    }),
  ];

  const common = {
    artifact_contract_hash: "artifact-contract-hash://unit/0117",
    artifact_contract_refs: artifactContractRefs(),
    candidate_facts: artifacts.candidates,
    canonical_facts: artifacts.canonical,
    collection_boundary: boundary,
    conflict_set: artifacts.conflictSet,
    evidence_items: artifacts.evidence,
    input_policy_ref: "input-policy://unit/0117",
    normalization_context: normalizationContext(manifestId),
    runtime_scope_refs: ["prepare_submission"],
    source_domain_declarations: declarations,
    source_plan: plan,
    source_records: artifacts.sources,
    source_window: window,
  };
  const first = await freezeInputSet(common);
  const second = await freezeInputSet(common);

  expect(second.input_set_hash).toBe(first.input_set_hash);
  expect(first.input_consumption_mode).toBe("FROZEN_INPUT_ONLY");
  expect(first.exclusion_refs).toEqual(["paye_income"]);
  expect(first.no_data_confirmed_declarations).toEqual(["cis_statement"]);
  expect(first.missing_source_declarations).toEqual(["bank_interest"]);
  expect(first.stale_source_declarations).toEqual(["company_filing"]);
  expect(first.source_domain_postures.map((posture) => posture.source_domain)).toEqual([
    "bank_interest",
    "cis_statement",
    "company_filing",
    "paye_income",
    "vat_obligations",
  ]);
  expect(inputFreezeRef(first)).toBe(`input-freeze://${first.input_freeze_id}`);
});

test("freezeInputSet fails closed without the full artifact contract pack", async () => {
  const { boundary, plan, window } = buildBoundary();
  await expect(
    freezeInputSet({
      artifact_contract_hash: "artifact-contract-hash://too-small",
      artifact_contract_refs: ["artifact-contract://source-plan"],
      collection_boundary: boundary,
      input_policy_ref: "input-policy://unit/0117",
      normalization_context: normalizationContext(boundary.manifest_id),
      runtime_scope_refs: ["prepare_submission"],
      source_plan: plan,
      source_window: window,
    }),
  ).rejects.toThrow(FreezeInputSetError);
});

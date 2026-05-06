import { expect, test } from "@playwright/test";

import {
  BoundaryDispositionValidationError,
  CollectionBoundaryModelError,
  PlanCoverageValidationError,
  SourceWindowModelError,
  buildCollectionBoundary,
  buildSourcePlan,
  buildSourceWindow,
  normalizeSourceWindowRecord,
  type CollectionBoundarySourceBoundaryRecord,
  type SourcePlanPlannedSourceRecord,
} from "../../../packages/backend-collection/src/index.ts";

function plannedSource(
  source_domain: string,
  partition_scope_refs = [`partition://${source_domain}/primary`],
): SourcePlanPlannedSourceRecord {
  return {
    source_domain,
    source_class: "AUTHORITY_REFERENCE",
    provider_binding_ref: `provider-binding://${source_domain}`,
    partition_scope_refs,
    query_basis_ref: `query-basis://${source_domain}`,
    cursor_strategy_ref: `cursor-strategy://${source_domain}`,
    read_model: "AS_OF",
    late_data_policy_ref: "REVIEW_IF_LATE",
    completeness_expectation_ref: `completeness://${source_domain}`,
    freshness_slo_ref: `freshness://${source_domain}`,
    required_schema_refs: [`schema://${source_domain}`],
    required_source_class_refs: [],
  };
}

function sourceBoundary(
  source_domain: string,
  disposition: CollectionBoundarySourceBoundaryRecord["boundary_disposition"],
  partition_scope_refs = [`partition://${source_domain}/primary`],
): CollectionBoundarySourceBoundaryRecord {
  return {
    source_domain,
    source_class: "AUTHORITY_REFERENCE",
    partition_scope_refs,
    runtime_scope_refs: ["year_end"],
    provider_environment_ref: `provider-env://${source_domain}`,
    provider_api_version: "api.v1",
    provider_schema_version: "schema.v1",
    cursor_checkpoint_ref: `cursor://${source_domain}`,
    revision_ref: `revision://${source_domain}`,
    request_audit_refs: [`audit://${source_domain}/request`],
    page_request_audit_refs: [],
    completeness_expectation_ref: `completeness://${source_domain}`,
    late_data_policy_ref: "REVIEW_IF_LATE",
    boundary_disposition: disposition,
  };
}

function validPlan() {
  return buildSourcePlan({
    manifest_id: "manifest.run.collection.0109",
    required_domains: ["vat_obligations", "income_sources"],
    planned_sources: [
      plannedSource("income_sources", ["partition://b", "partition://a"]),
      plannedSource("vat_obligations"),
    ],
  });
}

function validWindow() {
  return buildSourceWindow({
    source_plan: validPlan(),
    collection_started_at: "2026-04-26T08:00:00Z",
    collection_completed_at: "2026-04-26T08:15:00Z",
    read_cutoff_at: "2026-04-26T08:30:00Z",
  });
}

test("source plan factory canonicalizes ordering and hashes deterministically", () => {
  const first = buildSourcePlan({
    manifest_id: "manifest.run.collection.plan.0109",
    required_domains: ["vat_obligations", "income_sources"],
    planned_sources: [
      plannedSource("income_sources", ["partition://b", "partition://a"]),
      plannedSource("vat_obligations"),
    ],
  });
  const second = buildSourcePlan({
    manifest_id: "manifest.run.collection.plan.0109",
    required_domains: ["income_sources", "vat_obligations"],
    planned_sources: [
      plannedSource("vat_obligations"),
      plannedSource("income_sources", ["partition://a", "partition://b"]),
    ],
  });

  expect(first.required_domains).toEqual(["income_sources", "vat_obligations"]);
  expect(first.planned_sources[0].source_domain).toBe("income_sources");
  expect(first.planned_sources[0].partition_scope_refs).toEqual([
    "partition://a",
    "partition://b",
  ]);
  expect(first.source_plan_hash).toBe(second.source_plan_hash);
  expect(first.contract.artifact_content_hash).toBe(first.source_plan_hash);
});

test("plan coverage rejects missing, out-of-scope, and ambiguous planned sources", () => {
  expect(() =>
    buildSourcePlan({
      manifest_id: "manifest.run.collection.missing.0109",
      required_domains: ["income_sources", "vat_obligations"],
      planned_sources: [plannedSource("income_sources")],
    }),
  ).toThrow(PlanCoverageValidationError);

  expect(() =>
    buildSourcePlan({
      manifest_id: "manifest.run.collection.outside.0109",
      required_domains: ["income_sources"],
      planned_sources: [plannedSource("income_sources"), plannedSource("vat_obligations")],
    }),
  ).toThrow(PlanCoverageValidationError);

  expect(() =>
    buildSourcePlan({
      manifest_id: "manifest.run.collection.ambiguous.0109",
      required_domains: ["income_sources"],
      planned_sources: [
        plannedSource("income_sources", ["partition://a"]),
        {
          ...plannedSource("income_sources", ["partition://a"]),
          provider_binding_ref: "provider-binding://alternate",
        },
      ],
    }),
  ).toThrow(PlanCoverageValidationError);
});

test("source window enforces hard cutoff posture and timestamp ordering", () => {
  const plan = validPlan();
  const window = buildSourceWindow({
    source_plan: plan,
    collection_started_at: "2026-04-26T08:00:00Z",
    collection_completed_at: "2026-04-26T08:15:00Z",
    read_cutoff_at: "2026-04-26T08:30:00Z",
  });

  expect(window.cutoff_enforcement_state).toBe("HARD_CLOSED_AT_READ_CUTOFF");
  expect(window.post_cutoff_observation_mode).toBe("LATE_DATA_ONLY");

  expect(() =>
    buildSourceWindow({
      source_plan: plan,
      collection_started_at: "2026-04-26T08:20:00Z",
      collection_completed_at: "2026-04-26T08:15:00Z",
      read_cutoff_at: "2026-04-26T08:30:00Z",
    }),
  ).toThrow(SourceWindowModelError);

  expect(() =>
    buildSourceWindow({
      source_plan: plan,
      collection_started_at: "2026-04-26T08:00:00Z",
      collection_completed_at: "2026-04-26T08:31:00Z",
      read_cutoff_at: "2026-04-26T08:30:00Z",
    }),
  ).toThrow(SourceWindowModelError);

  expect(() =>
    normalizeSourceWindowRecord({
      ...window,
      cutoff_enforcement_state: "SOFT_CLOSED" as "HARD_CLOSED_AT_READ_CUTOFF",
    }),
  ).toThrow(SourceWindowModelError);
});

test("collection boundary requires one explicit disposition for every planned source", () => {
  const plan = validPlan();
  const window = buildSourceWindow({
    source_plan: plan,
    collection_started_at: "2026-04-26T08:00:00Z",
    collection_completed_at: "2026-04-26T08:15:00Z",
    read_cutoff_at: "2026-04-26T08:30:00Z",
  });
  const boundary = buildCollectionBoundary({
    source_plan: plan,
    source_window: window,
    connector_profile_ref: "connector-profile://hmrc",
    connector_build_id: "connector-build://0109",
    source_boundaries: [
      sourceBoundary("income_sources", "NO_DATA_CONFIRMED_AT_CUTOFF", [
        "partition://a",
        "partition://b",
      ]),
      sourceBoundary("vat_obligations", "IN_SCOPE_COLLECTED"),
    ],
  });

  expect(boundary.boundary_coverage_state).toBe("EXPLICIT_SOURCE_DOMAIN_ACCOUNTING");
  expect(boundary.source_boundaries.map((entry) => entry.source_domain)).toEqual([
    "income_sources",
    "vat_obligations",
  ]);
  expect(boundary.contract.artifact_content_hash).toBe(boundary.collection_boundary_hash);

  expect(() =>
    buildCollectionBoundary({
      source_plan: plan,
      source_window: window,
      connector_profile_ref: "connector-profile://hmrc",
      connector_build_id: "connector-build://0109",
      source_boundaries: [sourceBoundary("income_sources", "IN_SCOPE_COLLECTED", [
        "partition://a",
        "partition://b",
      ])],
    }),
  ).toThrow(BoundaryDispositionValidationError);

  expect(() =>
    buildCollectionBoundary({
      source_plan: plan,
      source_window: window,
      connector_profile_ref: "connector-profile://hmrc",
      connector_build_id: "connector-build://0109",
      source_boundaries: [
        sourceBoundary("income_sources", "IN_SCOPE_COLLECTED", [
          "partition://a",
          "partition://b",
        ]),
        sourceBoundary("vat_obligations", "IN_SCOPE_COLLECTED"),
        sourceBoundary("vat_obligations", "STALE_AT_CUTOFF"),
      ],
    }),
  ).toThrow(BoundaryDispositionValidationError);
});

test("boundary validation rejects out-of-plan sources and missing audit refs", () => {
  const plan = validPlan();
  const window = validWindow();

  expect(() =>
    buildCollectionBoundary({
      source_plan: plan,
      source_window: window,
      connector_profile_ref: "connector-profile://hmrc",
      connector_build_id: "connector-build://0109",
      source_boundaries: [
        sourceBoundary("income_sources", "IN_SCOPE_COLLECTED", [
          "partition://a",
          "partition://b",
        ]),
        sourceBoundary("vat_obligations", "IN_SCOPE_COLLECTED"),
        sourceBoundary("payroll", "NO_DATA_CONFIRMED_AT_CUTOFF"),
      ],
    }),
  ).toThrow(BoundaryDispositionValidationError);

  expect(() =>
    buildCollectionBoundary({
      source_plan: plan,
      source_window: window,
      connector_profile_ref: "connector-profile://hmrc",
      connector_build_id: "connector-build://0109",
      source_boundaries: [
        {
          ...sourceBoundary("income_sources", "IN_SCOPE_COLLECTED", [
            "partition://a",
            "partition://b",
          ]),
          request_audit_refs: [],
          page_request_audit_refs: [],
        },
        sourceBoundary("vat_obligations", "IN_SCOPE_COLLECTED"),
      ],
    }),
  ).toThrow(CollectionBoundaryModelError);
});

import { expect, test } from "@playwright/test";

import {
  CollectionFetchRequestError,
  ConnectorBindingResolutionError,
  buildCollectionFetchRequest,
  resolveConnectorBinding,
  type ConnectorBindingRecord,
  type SourcePlanPlannedSourceRecord,
} from "../../../packages/backend-collection/src/index.ts";

function plannedSource(overrides: Partial<SourcePlanPlannedSourceRecord> = {}): SourcePlanPlannedSourceRecord {
  return {
    completeness_expectation_ref: "completeness://income",
    cursor_strategy_ref: "cursor-strategy://income/as-of",
    freshness_slo_ref: "freshness://income",
    late_data_policy_ref: "REVIEW_IF_LATE",
    partition_scope_refs: ["partition://income/primary"],
    provider_binding_ref: "connector-binding://hmrc-income-binding",
    query_basis_ref: "query-basis://income",
    read_model: "AS_OF",
    required_schema_refs: ["schema://hmrc/income/v1"],
    required_source_class_refs: [],
    source_class: "AUTHORITY_REFERENCE",
    source_domain: "income_sources",
    ...overrides,
  };
}

function activeBinding(overrides: Partial<ConnectorBindingRecord> = {}): ConnectorBindingRecord {
  return {
    artifact_type: "ConnectorBinding",
    binding_id: "hmrc-income-binding",
    binding_lineage_ref: "binding-lineage://hmrc-income",
    blocked_reason_codes: [],
    client_binding_state: "BOUND",
    client_id: "client-001",
    delegation_state: "SATISFIED",
    expires_at: "2026-04-27T16:00:00Z",
    health_state: "HEALTHY",
    last_validated_at: "2026-04-27T10:00:00Z",
    lifecycle_state: "ACTIVE",
    partition_scope_refs: ["partition://income/primary", "partition://vat/primary"],
    provider: "HMRC",
    provider_api_version: "mtd-it-v1",
    provider_environment: "sandbox",
    revoked_at: null,
    scopes: ["income_sources", "vat_obligations"],
    source_evidence_refs: ["evidence://binding/hmrc-income"],
    subject_ref: "subject://utr/1234567890",
    superseded_by_binding_id: null,
    tenant_id: "tenant-001",
    token_ref: "token://hmrc/income",
    token_version_ref: "token-version://hmrc/income/1",
    ...overrides,
  };
}

function resolve(overrides: {
  binding?: Partial<ConnectorBindingRecord>;
  planned_source?: Partial<SourcePlanPlannedSourceRecord>;
} = {}) {
  return resolveConnectorBinding({
    bindings: [activeBinding(overrides.binding)],
    client_id: "client-001",
    planned_source: plannedSource(overrides.planned_source),
    provider: "HMRC",
    provider_api_version: "mtd-it-v1",
    provider_environment: "sandbox",
    resolved_at: "2026-04-27T11:00:00Z",
    subject_ref: "subject://utr/1234567890",
    tenant_id: "tenant-001",
  });
}

test("connector binding resolution selects the exact planned binding and freezes precedence", () => {
  const resolution = resolve();

  expect(resolution.resolved_binding.binding_id).toBe("hmrc-income-binding");
  expect(resolution.binding_ref).toBe("connector-binding://hmrc-income-binding");
  expect(resolution.precedence_key).toEqual([
    "connector-binding://hmrc-income-binding",
    "HMRC",
    "sandbox",
    "mtd-it-v1",
    "client-001",
    "subject://utr/1234567890",
    "partition://income/primary",
  ]);
});

test("connector binding resolution fails closed on mismatches and invalid posture", () => {
  expect(() => resolve({ binding: { provider_environment: "production" } })).toThrow(
    ConnectorBindingResolutionError,
  );
  expect(() => resolve({ binding: { client_id: "other-client" } })).toThrow(
    ConnectorBindingResolutionError,
  );
  expect(() =>
    resolve({
      binding: {
        blocked_reason_codes: ["REVOKED_BY_CLIENT"],
        health_state: "REVOKED",
        lifecycle_state: "REVOKED",
        revoked_at: "2026-04-27T10:30:00Z",
      },
    }),
  ).toThrow(ConnectorBindingResolutionError);
  expect(() =>
    resolve({
      binding: {
        blocked_reason_codes: ["SUPERSEDED"],
        lifecycle_state: "SUPERSEDED",
        superseded_by_binding_id: "hmrc-income-binding-v2",
      },
    }),
  ).toThrow(ConnectorBindingResolutionError);
  expect(() => resolve({ binding: { scopes: ["vat_obligations"] } })).toThrow(
    ConnectorBindingResolutionError,
  );
});

test("collection fetch request maps read models and hashes deterministically", () => {
  const resolution = resolve();
  const request = buildCollectionFetchRequest({
    binding: resolution.resolved_binding,
    collection_run_id: "source-collection-run.manifest-0111",
    created_at: "2026-04-27T11:05:00Z",
    manifest_id: "manifest-0111",
    planned_source: plannedSource({ partition_scope_refs: ["partition://income/primary"] }),
    read_cutoff_at: "2026-04-27T12:00:00Z",
    source_window_ref: "source-window://source-window.manifest-0111",
    tenant_id: "tenant-001",
  });
  const replay = buildCollectionFetchRequest({
    binding: resolution.resolved_binding,
    collection_run_id: "source-collection-run.manifest-0111",
    created_at: "2026-04-27T11:05:00Z",
    manifest_id: "manifest-0111",
    planned_source: plannedSource({ partition_scope_refs: ["partition://income/primary"] }),
    read_cutoff_at: "2026-04-27T12:00:00Z",
    source_window_ref: "source-window://source-window.manifest-0111",
    tenant_id: "tenant-001",
  });
  const windowed = buildCollectionFetchRequest({
    binding: resolution.resolved_binding,
    collection_run_id: "source-collection-run.manifest-0111",
    created_at: "2026-04-27T11:05:00Z",
    manifest_id: "manifest-0111",
    planned_source: plannedSource({ read_model: "WINDOWED" }),
    read_cutoff_at: "2026-04-27T12:00:00Z",
    source_window_ref: "source-window://source-window.manifest-0111",
    tenant_id: "tenant-001",
  });

  expect(request.request_hash).toBe(replay.request_hash);
  expect(request.read_model_contract).toEqual({
    as_of_at: "2026-04-27T12:00:00Z",
    mode: "AS_OF",
    read_cutoff_at: "2026-04-27T12:00:00Z",
  });
  expect(windowed.read_model_contract).toEqual({
    mode: "WINDOWED",
    read_cutoff_at: "2026-04-27T12:00:00Z",
    window_basis_ref: "query-basis://income",
    window_closed_at: "2026-04-27T12:00:00Z",
  });
  expect(request.gateway_policy.direct_provider_call_policy).toBe("APPLICATION_CODE_FORBIDDEN");
});

test("collection fetch request cannot be built after read cutoff", () => {
  const resolution = resolve();

  expect(() =>
    buildCollectionFetchRequest({
      binding: resolution.resolved_binding,
      collection_run_id: "source-collection-run.manifest-0111",
      created_at: "2026-04-27T12:01:00Z",
      manifest_id: "manifest-0111",
      planned_source: plannedSource(),
      read_cutoff_at: "2026-04-27T12:00:00Z",
      source_window_ref: "source-window://source-window.manifest-0111",
      tenant_id: "tenant-001",
    }),
  ).toThrow(CollectionFetchRequestError);
});

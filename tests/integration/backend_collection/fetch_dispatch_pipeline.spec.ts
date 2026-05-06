import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  ControlledGatewayError,
  ScriptedControlledGatewayClient,
  buildCollectionFetchRequest,
  dispatchCollectionFetch,
  resolveConnectorBinding,
  type CollectionFetchRequestEnvelope,
  type ConnectorBindingRecord,
  type ControlledGatewayClient,
  type ControlledGatewayFetchResponse,
  type SourcePlanPlannedSourceRecord,
} from "../../../packages/backend-collection/src/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

async function validatePayloadAgainstSchema(schemaName: string, payload: unknown) {
  const script = `
import json
import pathlib
import sys

repo = pathlib.Path(sys.argv[1])
sys.path.insert(0, str(repo / "packages" / "contracts-core" / "python"))
from validate_contracts import Draft202012Validator, build_registry, load_json  # type: ignore

schema_name = sys.argv[2]
payload = json.loads(sys.argv[3])
schema = load_json(repo / "packages" / "contracts-core" / "schemas" / schema_name)
validator = Draft202012Validator(
    schema,
    registry=build_registry(),
    format_checker=Draft202012Validator.FORMAT_CHECKER,
)
issues = [
    f"{'/'.join(map(str, error.absolute_path)) or '<root>'}: {error.message}"
    for error in sorted(validator.iter_errors(payload), key=lambda error: list(error.absolute_path))
]
if issues:
    raise SystemExit("\\n".join(issues))
`;

  await execFileAsync(path.join(repoRoot, ".venv", "bin", "python3"), [
    "-c",
    script,
    repoRoot,
    schemaName,
    JSON.stringify(payload),
  ]);
}

function plannedSource(overrides: Partial<SourcePlanPlannedSourceRecord> = {}): SourcePlanPlannedSourceRecord {
  return {
    completeness_expectation_ref: "completeness://vat",
    cursor_strategy_ref: "cursor-strategy://vat/paged",
    freshness_slo_ref: "freshness://vat",
    late_data_policy_ref: "REVIEW_IF_LATE",
    partition_scope_refs: ["partition://vat/primary"],
    provider_binding_ref: "connector-binding://hmrc-vat-binding",
    query_basis_ref: "query-basis://vat-obligations",
    read_model: "AS_OF",
    required_schema_refs: ["schema://hmrc/vat/v1"],
    required_source_class_refs: [],
    source_class: "AUTHORITY_REFERENCE",
    source_domain: "vat_obligations",
    ...overrides,
  };
}

function activeBinding(overrides: Partial<ConnectorBindingRecord> = {}): ConnectorBindingRecord {
  return {
    artifact_type: "ConnectorBinding",
    binding_id: "hmrc-vat-binding",
    binding_lineage_ref: "binding-lineage://hmrc-vat",
    blocked_reason_codes: [],
    client_binding_state: "BOUND",
    client_id: "client-0111",
    delegation_state: "SATISFIED",
    expires_at: "2026-04-28T00:00:00Z",
    health_state: "HEALTHY",
    last_validated_at: "2026-04-27T10:00:00Z",
    lifecycle_state: "ACTIVE",
    partition_scope_refs: ["partition://vat/primary"],
    provider: "HMRC",
    provider_api_version: "mtd-vat-v1",
    provider_environment: "sandbox",
    revoked_at: null,
    scopes: ["vat_obligations"],
    source_evidence_refs: ["evidence://binding/hmrc-vat"],
    subject_ref: "subject://vrn/999999999",
    superseded_by_binding_id: null,
    tenant_id: "tenant-0111",
    token_ref: "token://hmrc/vat",
    token_version_ref: "token-version://hmrc/vat/1",
    ...overrides,
  };
}

function requestFor(sourceOverrides: Partial<SourcePlanPlannedSourceRecord> = {}) {
  const source = plannedSource(sourceOverrides);
  const binding = activeBinding();
  const resolution = resolveConnectorBinding({
    bindings: [binding],
    client_id: "client-0111",
    planned_source: source,
    provider: "HMRC",
    provider_api_version: "mtd-vat-v1",
    provider_environment: "sandbox",
    resolved_at: "2026-04-27T11:00:00Z",
    subject_ref: "subject://vrn/999999999",
    tenant_id: "tenant-0111",
  });
  return buildCollectionFetchRequest({
    binding: resolution.resolved_binding,
    collection_run_id: "source-collection-run.manifest-0111",
    created_at: "2026-04-27T11:00:00Z",
    manifest_id: "manifest-0111",
    planned_source: source,
    read_cutoff_at: "2026-04-27T12:00:00Z",
    source_window_ref: "source-window://source-window.manifest-0111",
    tenant_id: "tenant-0111",
  });
}

function gatewayResponse(
  request: CollectionFetchRequestEnvelope,
  overrides: Partial<ControlledGatewayFetchResponse> = {},
): ControlledGatewayFetchResponse {
  return {
    gateway_exchange_ref: `gateway-exchange://${request.request_id}`,
    observed_provider_schema_version: "schema://hmrc/vat/v1",
    pages: [
      {
        cursor_token_or_null: "cursor-2",
        page_index: 1,
        raw_payload_ref_or_null: "raw://vat/page-1",
        revision_marker_or_null: "rev-1",
        status: "SUCCESS",
      },
      {
        cursor_token_or_null: null,
        page_index: 2,
        raw_payload_ref_or_null: "raw://vat/page-2",
        revision_marker_or_null: "rev-2",
        status: "SUCCESS",
      },
    ],
    received_at: "2026-04-27T11:01:00Z",
    response_status: "SUCCESS",
    ...overrides,
  };
}

test("connector binding fixture remains schema-valid", async () => {
  await validatePayloadAgainstSchema("connector_binding.schema.json", activeBinding());
});

test("controlled gateway dispatch normalizes paginated success deterministically", async () => {
  const request = requestFor();
  const gateway = new ScriptedControlledGatewayClient([
    { request_hash: request.request_hash, response: gatewayResponse(request) },
  ]);

  const first = await dispatchCollectionFetch({
    gateway,
    now: "2026-04-27T11:00:30Z",
    request,
  });
  const replay = await dispatchCollectionFetch({
    gateway,
    now: "2026-04-27T11:00:30Z",
    request,
  });

  expect(first.outcome_code).toBe("SOURCE_FETCHED");
  expect(first.fetch_posture).toBe("FETCHED");
  expect(first.raw_payload_refs).toEqual([
    { page_index: 1, raw_payload_ref: "raw://vat/page-1" },
    { page_index: 2, raw_payload_ref: "raw://vat/page-2" },
  ]);
  expect(first.cursor_checkpoint_ref).toBe(replay.cursor_checkpoint_ref);
  expect(first.revision_ref).toBe(replay.revision_ref);
  expect(new Set([...first.fetch_audit_refs, ...first.page_audit_refs]).size).toBe(
    first.fetch_audit_refs.length + first.page_audit_refs.length,
  );
});

test("empty audited gateway response is success, not missing-source posture", async () => {
  const request = requestFor();
  const gateway = new ScriptedControlledGatewayClient([
    {
      request_hash: request.request_hash,
      response: gatewayResponse(request, {
        pages: [
          {
            cursor_token_or_null: null,
            page_index: 1,
            raw_payload_ref_or_null: null,
            revision_marker_or_null: "empty-rev",
            status: "EMPTY",
          },
        ],
        response_status: "EMPTY",
      }),
    },
  ]);

  const result = await dispatchCollectionFetch({
    gateway,
    now: "2026-04-27T11:00:30Z",
    request,
  });

  expect(result.outcome_code).toBe("SOURCE_EMPTY_CONFIRMED");
  expect(result.empty_response_confirmed).toBe(true);
  expect(result.partial_gap_refs).toEqual([]);
  expect(result.raw_payload_refs).toEqual([]);
});

test("page success followed by timeout becomes explicit partial-gap posture", async () => {
  const request = requestFor();
  const gateway = new ScriptedControlledGatewayClient([
    {
      request_hash: request.request_hash,
      response: gatewayResponse(request, {
        pages: [
          {
            cursor_token_or_null: "cursor-2",
            page_index: 1,
            raw_payload_ref_or_null: "raw://vat/page-1",
            revision_marker_or_null: "rev-1",
            status: "SUCCESS",
          },
          {
            cursor_token_or_null: null,
            page_index: 2,
            raw_payload_ref_or_null: null,
            revision_marker_or_null: null,
            status: "TIMEOUT",
          },
        ],
        response_status: "PARTIAL",
      }),
    },
  ]);

  const result = await dispatchCollectionFetch({
    gateway,
    now: "2026-04-27T11:00:30Z",
    request,
  });

  expect(result.outcome_code).toBe("SOURCE_PARTIAL_GAP");
  expect(result.fetch_gap_code_or_null).toBe("TIMEOUT");
  expect(result.partial_gap_code_or_null).toBe("PARTIAL_PROVIDER_RESPONSE");
  expect(result.partial_gap_refs).toHaveLength(1);
  expect(result.raw_payload_refs).toEqual([{ page_index: 1, raw_payload_ref: "raw://vat/page-1" }]);
});

test("schema drift preserves observed provider schema version as typed gap posture", async () => {
  const request = requestFor();
  const gateway = new ScriptedControlledGatewayClient([
    {
      request_hash: request.request_hash,
      response: gatewayResponse(request, {
        observed_provider_schema_version: "schema://hmrc/vat/v2",
        pages: [
          {
            cursor_token_or_null: null,
            observed_provider_schema_version: "schema://hmrc/vat/v2",
            page_index: 1,
            raw_payload_ref_or_null: "raw://vat/page-1",
            revision_marker_or_null: "rev-schema-v2",
            status: "SCHEMA_DRIFT",
          },
        ],
        response_status: "PARTIAL",
      }),
    },
  ]);

  const result = await dispatchCollectionFetch({
    gateway,
    now: "2026-04-27T11:00:30Z",
    request,
  });

  expect(result.outcome_code).toBe("SOURCE_PARTIAL_GAP");
  expect(result.fetch_gap_code_or_null).toBe("SCHEMA_DRIFT");
  expect(result.partial_gap_code_or_null).toBe("STALE_AT_CUTOFF");
  expect(result.observed_provider_schema_version).toBe("schema://hmrc/vat/v2");
});

test("gateway timeout and read-cutoff violation produce fatal failures without direct provider escape", async () => {
  const request = requestFor();
  const timeoutGateway = new ScriptedControlledGatewayClient([
    {
      request_hash: request.request_hash,
      response: new ControlledGatewayError("TIMEOUT", "gateway timed out before page receipt"),
    },
  ]);
  const timeout = await dispatchCollectionFetch({
    gateway: timeoutGateway,
    now: "2026-04-27T11:00:30Z",
    request,
  });

  class CountingGateway implements ControlledGatewayClient {
    calls = 0;
    async sendCollectionFetch() {
      this.calls += 1;
      return gatewayResponse(request);
    }
  }
  const cutoffGateway = new CountingGateway();
  const cutoff = await dispatchCollectionFetch({
    gateway: cutoffGateway,
    now: "2026-04-27T12:00:01Z",
    request,
  });

  expect(timeout.outcome_code).toBe("SOURCE_FATAL_FAILURE");
  expect(timeout.fetch_gap_code_or_null).toBe("TIMEOUT");
  expect(cutoff.outcome_code).toBe("SOURCE_FATAL_FAILURE");
  expect(cutoff.fetch_gap_code_or_null).toBe("READ_CUTOFF_EXCEEDED");
  expect(cutoffGateway.calls).toBe(0);
});

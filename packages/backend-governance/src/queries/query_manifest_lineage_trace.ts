import type {
  StoredManifestLineageTraceRecord,
  StoredRunManifestRecord,
} from "../../../backend-manifest/src/index.ts";
import {
  buildManifestLineageExplorer,
  type ManifestLineageExplorerProjection,
} from "../projectors/build_manifest_lineage_explorer.ts";

export type ManifestLineageTraceReader = {
  getTraceById(
    tenantId: string,
    lineageTraceId: string,
  ): Promise<StoredManifestLineageTraceRecord | null>;
  listTracesForManifest(
    tenantId: string,
    selectedManifestId: string,
  ): Promise<StoredManifestLineageTraceRecord[]>;
  listTracesByIdempotencyKey?(
    tenantId: string,
    idempotencyKey: string,
  ): Promise<StoredManifestLineageTraceRecord[]>;
  listTracesByRequestIdentity?(
    tenantId: string,
    requestIdentityHash: string,
  ): Promise<StoredManifestLineageTraceRecord[]>;
};

export type ManifestLineageSelectedManifestReader = {
  requireManifestById(
    tenantId: string,
    manifestId: string,
  ): Promise<StoredRunManifestRecord>;
};

export type ManifestLineageTraceQueryMode =
  | "BY_LINEAGE_TRACE_ID"
  | "BY_REQUEST_IDENTITY"
  | "BY_SELECTED_MANIFEST";

export type ManifestLineageTracePrimarySelectionPolicy =
  | "EXPLICIT_LINEAGE_TRACE_ID"
  | "LATEST_PERSISTED_TRACE_FOR_REQUEST_IDENTITY"
  | "LATEST_PERSISTED_TRACE_FOR_SELECTED_MANIFEST";

export type ManifestLineageTraceQueryResult = {
  query_mode: ManifestLineageTraceQueryMode;
  primary_selection_policy: ManifestLineageTracePrimarySelectionPolicy;
  selected_manifest: StoredRunManifestRecord;
  stored_trace: StoredManifestLineageTraceRecord;
  explorer: ManifestLineageExplorerProjection;
  candidate_trace_refs: string[];
};

export type ManifestLineageTraceQueryErrorCode =
  | "MANIFEST_LINEAGE_TRACE_QUERY_BACKING_INDEX_MISSING"
  | "MANIFEST_LINEAGE_TRACE_QUERY_NOT_FOUND";

export class ManifestLineageTraceQueryError extends Error {
  readonly code: ManifestLineageTraceQueryErrorCode;

  constructor(code: ManifestLineageTraceQueryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ManifestLineageTraceQueryError";
    this.code = code;
  }
}

function assertQuery(
  condition: unknown,
  code: ManifestLineageTraceQueryErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new ManifestLineageTraceQueryError(code, detail);
  }
}

function sortStoredTracesLatestFirst(records: readonly StoredManifestLineageTraceRecord[]) {
  return [...records].sort((left, right) => {
    const persistedAtOrder = right.persisted_at.localeCompare(left.persisted_at);
    if (persistedAtOrder !== 0) {
      return persistedAtOrder;
    }
    return right.lineage_trace_id.localeCompare(left.lineage_trace_id);
  });
}

async function buildQueryResult(input: {
  mode: ManifestLineageTraceQueryMode;
  primarySelectionPolicy: ManifestLineageTracePrimarySelectionPolicy;
  runManifestReader: ManifestLineageSelectedManifestReader;
  storedTrace: StoredManifestLineageTraceRecord;
  tenantId: string;
  candidateTraceRecords: readonly StoredManifestLineageTraceRecord[];
}): Promise<ManifestLineageTraceQueryResult> {
  const selectedManifest = await input.runManifestReader.requireManifestById(
    input.tenantId,
    input.storedTrace.selected_manifest_id,
  );
  const explorer = buildManifestLineageExplorer({
    expected_selected_manifest_continuation_basis:
      selectedManifest.manifest.continuation_basis,
    expected_selected_manifest_id: selectedManifest.manifest.manifest_id,
    selected_manifest_lineage_trace_refs:
      selectedManifest.manifest.manifest_lineage_trace_refs,
    trace: input.storedTrace.trace,
  });
  return {
    query_mode: input.mode,
    primary_selection_policy: input.primarySelectionPolicy,
    selected_manifest: selectedManifest,
    stored_trace: input.storedTrace,
    explorer,
    candidate_trace_refs: input.candidateTraceRecords.map(
      (record) => record.lineage_trace_ref,
    ),
  };
}

export async function queryManifestLineageTraceById(input: {
  lineage_trace_id: string;
  run_manifest_reader: ManifestLineageSelectedManifestReader;
  tenant_id: string;
  trace_reader: ManifestLineageTraceReader;
}): Promise<ManifestLineageTraceQueryResult> {
  const storedTrace = await input.trace_reader.getTraceById(
    input.tenant_id,
    input.lineage_trace_id,
  );
  assertQuery(
    storedTrace !== null,
    "MANIFEST_LINEAGE_TRACE_QUERY_NOT_FOUND",
    `manifest lineage trace ${input.lineage_trace_id} was not found for tenant ${input.tenant_id}`,
  );
  return buildQueryResult({
    candidateTraceRecords: [storedTrace],
    mode: "BY_LINEAGE_TRACE_ID",
    primarySelectionPolicy: "EXPLICIT_LINEAGE_TRACE_ID",
    runManifestReader: input.run_manifest_reader,
    storedTrace,
    tenantId: input.tenant_id,
  });
}

export async function queryManifestLineageTraceForSelectedManifest(input: {
  lineage_trace_id?: string | undefined;
  run_manifest_reader: ManifestLineageSelectedManifestReader;
  selected_manifest_id: string;
  tenant_id: string;
  trace_reader: ManifestLineageTraceReader;
}): Promise<ManifestLineageTraceQueryResult> {
  const traces = await input.trace_reader.listTracesForManifest(
    input.tenant_id,
    input.selected_manifest_id,
  );
  const selectedTrace =
    input.lineage_trace_id === undefined
      ? sortStoredTracesLatestFirst(traces)[0]
      : traces.find((trace) => trace.lineage_trace_id === input.lineage_trace_id);
  assertQuery(
    selectedTrace !== undefined,
    "MANIFEST_LINEAGE_TRACE_QUERY_NOT_FOUND",
    input.lineage_trace_id === undefined
      ? `selected manifest ${input.selected_manifest_id} has no persisted lineage traces`
      : `lineage trace ${input.lineage_trace_id} is not linked to selected manifest ${input.selected_manifest_id}`,
  );
  return buildQueryResult({
    candidateTraceRecords: sortStoredTracesLatestFirst(traces),
    mode: "BY_SELECTED_MANIFEST",
    primarySelectionPolicy:
      input.lineage_trace_id === undefined
        ? "LATEST_PERSISTED_TRACE_FOR_SELECTED_MANIFEST"
        : "EXPLICIT_LINEAGE_TRACE_ID",
    runManifestReader: input.run_manifest_reader,
    storedTrace: selectedTrace,
    tenantId: input.tenant_id,
  });
}

export async function queryManifestLineageTraceByRequestIdentity(input: {
  idempotency_key?: string | undefined;
  lineage_trace_id?: string | undefined;
  request_identity_hash: string;
  run_manifest_reader: ManifestLineageSelectedManifestReader;
  selected_manifest_id?: string | undefined;
  tenant_id: string;
  trace_reader: ManifestLineageTraceReader;
}): Promise<ManifestLineageTraceQueryResult> {
  assertQuery(
    input.trace_reader.listTracesByRequestIdentity !== undefined,
    "MANIFEST_LINEAGE_TRACE_QUERY_BACKING_INDEX_MISSING",
    "request-identity lineage trace queries require a persisted request identity index",
  );
  const byRequestIdentity = await input.trace_reader.listTracesByRequestIdentity(
    input.tenant_id,
    input.request_identity_hash,
  );
  let traces = byRequestIdentity;

  if (input.idempotency_key !== undefined) {
    assertQuery(
      input.trace_reader.listTracesByIdempotencyKey !== undefined,
      "MANIFEST_LINEAGE_TRACE_QUERY_BACKING_INDEX_MISSING",
      "idempotency-bounded lineage trace queries require a persisted idempotency index",
    );
    const idempotencyTraceIds = new Set(
      (
        await input.trace_reader.listTracesByIdempotencyKey(
          input.tenant_id,
          input.idempotency_key,
        )
      ).map((trace) => trace.lineage_trace_id),
    );
    traces = traces.filter((trace) => idempotencyTraceIds.has(trace.lineage_trace_id));
  }

  if (input.selected_manifest_id !== undefined) {
    traces = traces.filter(
      (trace) => trace.selected_manifest_id === input.selected_manifest_id,
    );
  }

  const selectedTrace =
    input.lineage_trace_id === undefined
      ? sortStoredTracesLatestFirst(traces)[0]
      : traces.find((trace) => trace.lineage_trace_id === input.lineage_trace_id);
  assertQuery(
    selectedTrace !== undefined,
    "MANIFEST_LINEAGE_TRACE_QUERY_NOT_FOUND",
    `request identity ${input.request_identity_hash} has no matching persisted lineage trace`,
  );
  return buildQueryResult({
    candidateTraceRecords: sortStoredTracesLatestFirst(traces),
    mode: "BY_REQUEST_IDENTITY",
    primarySelectionPolicy:
      input.lineage_trace_id === undefined
        ? "LATEST_PERSISTED_TRACE_FOR_REQUEST_IDENTITY"
        : "EXPLICIT_LINEAGE_TRACE_ID",
    runManifestReader: input.run_manifest_reader,
    storedTrace: selectedTrace,
    tenantId: input.tenant_id,
  });
}

import type { ManifestLineageTrace } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";

import {
  cloneManifestLineageTrace,
  manifestLineageTraceRef,
  normalizeManifestLineageTrace,
  type ManifestLineageTraceRecord,
} from "../models/manifest_lineage_trace.ts";
import type { RunManifestRecord } from "../models/run_manifest.ts";
import {
  RunManifestRepository,
  type StoredRunManifestRecord,
} from "./run_manifest_repository.ts";
import { validateBranchCandidateEvaluations } from "../services/branch_candidate_evaluation_validator.ts";
import { evaluateManifestLineageMirrorConsistency } from "../services/mirror_consistency_state_evaluator.ts";

export type StoredManifestLineageTraceRecord = {
  lineage_trace_id: string;
  lineage_trace_ref: string;
  persisted_at: string;
  request_identity_hash: string;
  selected_branch_action: ManifestLineageTrace["selected_branch_action"];
  selected_manifest_id: string;
  selected_manifest_row_version_after_append: number;
  selected_manifest_row_version_before_append: number;
  tenant_id: string;
  trace: ManifestLineageTraceRecord;
};

export type ManifestLineageTraceRepositoryErrorCode =
  | "MANIFEST_LINEAGE_TRACE_DUPLICATE"
  | "MANIFEST_LINEAGE_TRACE_SELECTED_MANIFEST_MISMATCH";

export class ManifestLineageTraceRepositoryError extends Error {
  readonly code: ManifestLineageTraceRepositoryErrorCode;

  constructor(code: ManifestLineageTraceRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ManifestLineageTraceRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredManifestLineageTraceRecord) {
  return structuredClone(record);
}

function compositeKey(...parts: Array<string | null>) {
  return parts.map((part) => part ?? "<null>").join("::");
}

function assertTraceRepository(
  condition: unknown,
  code: ManifestLineageTraceRepositoryErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new ManifestLineageTraceRepositoryError(code, detail);
  }
}

function assertTraceMatchesSelectedManifest(input: {
  selectedManifest: RunManifestRecord;
  trace: ManifestLineageTraceRecord;
}) {
  const { selectedManifest, trace } = input;
  const checks: Array<[string, unknown, unknown]> = [
    ["selected_manifest_id", trace.selected_manifest_id, selectedManifest.manifest_id],
    [
      "selected_manifest_continuation_basis",
      trace.selected_manifest_continuation_basis,
      selectedManifest.continuation_basis,
    ],
    ["selected_manifest_generation", trace.selected_manifest_generation, selectedManifest.manifest_generation],
    ["root_manifest_id", trace.root_manifest_id, selectedManifest.root_manifest_id],
    ["parent_manifest_id_or_null", trace.parent_manifest_id_or_null, selectedManifest.parent_manifest_id],
    [
      "continuation_of_manifest_id_or_null",
      trace.continuation_of_manifest_id_or_null,
      selectedManifest.continuation_of_manifest_id,
    ],
    ["replay_of_manifest_id_or_null", trace.replay_of_manifest_id_or_null, selectedManifest.replay_of_manifest_id],
    ["supersedes_manifest_id_or_null", trace.supersedes_manifest_id_or_null, selectedManifest.supersedes_manifest_id],
  ];
  for (const [label, left, right] of checks) {
    assertTraceRepository(
      JSON.stringify(left) === JSON.stringify(right),
      "MANIFEST_LINEAGE_TRACE_SELECTED_MANIFEST_MISMATCH",
      `${label} does not match selected manifest lineage`,
    );
  }

  if (trace.selected_branch_action === "RETURN_EXISTING_BUNDLE") {
    assertTraceRepository(
      ["COMPLETED", "BLOCKED"].includes(selectedManifest.lifecycle_state) &&
        selectedManifest.decision_bundle_hash === trace.returned_decision_bundle_hash_or_null,
      "MANIFEST_LINEAGE_TRACE_SELECTED_MANIFEST_MISMATCH",
      "bundle-return trace must point at a terminal selected manifest with the same decision bundle hash",
    );
  }
  if (trace.selected_branch_action === "REUSE_SEALED_MANIFEST") {
    assertTraceRepository(
      selectedManifest.lifecycle_state === "SEALED",
      "MANIFEST_LINEAGE_TRACE_SELECTED_MANIFEST_MISMATCH",
      "sealed reuse trace must point at a SEALED selected manifest",
    );
  }
}

export class ManifestLineageTraceRepository {
  private readonly traces = new Map<string, StoredManifestLineageTraceRecord>();
  private readonly traceIdsByIdempotencyKey = new Map<string, string[]>();
  private readonly traceIdsByRequestIdentityHash = new Map<string, string[]>();
  private readonly traceIdsBySelectedManifest = new Map<string, string[]>();
  private readonly runManifestRepository: RunManifestRepository;

  constructor(input: { runManifestRepository: RunManifestRepository }) {
    this.runManifestRepository = input.runManifestRepository;
  }

  private pushSelectedManifestIndex(selectedManifestId: string, lineageTraceId: string) {
    const current = this.traceIdsBySelectedManifest.get(selectedManifestId) ?? [];
    if (!current.includes(lineageTraceId)) {
      current.push(lineageTraceId);
      this.traceIdsBySelectedManifest.set(selectedManifestId, current);
    }
  }

  private pushTraceIndex(index: Map<string, string[]>, key: string, lineageTraceId: string) {
    const current = index.get(key) ?? [];
    if (!current.includes(lineageTraceId)) {
      current.push(lineageTraceId);
      index.set(key, current);
    }
  }

  private async appendTraceRefToSelectedManifest(input: {
    lineageTraceRef: string;
    persistedAt: string;
    selectedManifest: StoredRunManifestRecord;
  }) {
    const currentRefs = input.selectedManifest.manifest.manifest_lineage_trace_refs;
    if (currentRefs.includes(input.lineageTraceRef)) {
      return input.selectedManifest;
    }
    return this.runManifestRepository.compareAndSwapManifest({
      expected_manifest_row_version: input.selectedManifest.manifest_row_version,
      next_manifest: {
        ...input.selectedManifest.manifest,
        manifest_lineage_trace_refs: [...currentRefs, input.lineageTraceRef],
      },
      persisted_at: input.persistedAt,
    });
  }

  async persistTrace(input: {
    persisted_at: string;
    tenant_id: string;
    trace: ManifestLineageTraceRecord;
  }) {
    const trace = normalizeManifestLineageTrace(input.trace);
    validateBranchCandidateEvaluations({
      candidate_evaluations: trace.candidate_evaluations,
      selected_branch_action: trace.selected_branch_action,
    });

    const selectedManifest = await this.runManifestRepository.requireManifestById(
      input.tenant_id,
      trace.selected_manifest_id,
    );
    evaluateManifestLineageMirrorConsistency(selectedManifest.manifest);
    assertTraceMatchesSelectedManifest({
      selectedManifest: selectedManifest.manifest,
      trace,
    });

    const lineageTraceRef = manifestLineageTraceRef(trace);
    const existing = this.traces.get(trace.lineage_trace_id);
    if (existing) {
      assertTraceRepository(
        JSON.stringify(existing.trace) === JSON.stringify(trace),
        "MANIFEST_LINEAGE_TRACE_DUPLICATE",
        `trace ${trace.lineage_trace_id} already exists with a different payload`,
      );
      return cloneStored(existing);
    }

    const updatedManifest = await this.appendTraceRefToSelectedManifest({
      lineageTraceRef,
      persistedAt: input.persisted_at,
      selectedManifest,
    });

    const stored: StoredManifestLineageTraceRecord = {
      tenant_id: input.tenant_id,
      lineage_trace_id: trace.lineage_trace_id,
      lineage_trace_ref: lineageTraceRef,
      request_identity_hash: trace.request_identity_hash,
      selected_branch_action: trace.selected_branch_action,
      selected_manifest_id: trace.selected_manifest_id,
      selected_manifest_row_version_before_append: selectedManifest.manifest_row_version,
      selected_manifest_row_version_after_append: updatedManifest.manifest_row_version,
      persisted_at: input.persisted_at,
      trace: cloneManifestLineageTrace(trace),
    };
    this.traces.set(stored.lineage_trace_id, cloneStored(stored));
    this.pushSelectedManifestIndex(stored.selected_manifest_id, stored.lineage_trace_id);
    this.pushTraceIndex(
      this.traceIdsByRequestIdentityHash,
      compositeKey(stored.tenant_id, stored.request_identity_hash),
      stored.lineage_trace_id,
    );
    this.pushTraceIndex(
      this.traceIdsByIdempotencyKey,
      compositeKey(stored.tenant_id, stored.trace.idempotency_key),
      stored.lineage_trace_id,
    );
    return cloneStored(stored);
  }

  async getTraceById(tenantId: string, lineageTraceId: string) {
    const stored = this.traces.get(lineageTraceId);
    if (!stored || stored.tenant_id !== tenantId) {
      return null;
    }
    return cloneStored(stored);
  }

  async listTracesForManifest(tenantId: string, selectedManifestId: string) {
    return (this.traceIdsBySelectedManifest.get(selectedManifestId) ?? [])
      .map((lineageTraceId) => this.traces.get(lineageTraceId))
      .filter(
        (record): record is StoredManifestLineageTraceRecord =>
          record !== undefined && record.tenant_id === tenantId,
      )
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneStored(record));
  }

  async listTracesByRequestIdentity(tenantId: string, requestIdentityHash: string) {
    return (this.traceIdsByRequestIdentityHash.get(compositeKey(tenantId, requestIdentityHash)) ?? [])
      .map((lineageTraceId) => this.traces.get(lineageTraceId))
      .filter(
        (record): record is StoredManifestLineageTraceRecord =>
          record !== undefined && record.tenant_id === tenantId,
      )
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneStored(record));
  }

  async listTracesByIdempotencyKey(tenantId: string, idempotencyKey: string) {
    return (this.traceIdsByIdempotencyKey.get(compositeKey(tenantId, idempotencyKey)) ?? [])
      .map((lineageTraceId) => this.traces.get(lineageTraceId))
      .filter(
        (record): record is StoredManifestLineageTraceRecord =>
          record !== undefined && record.tenant_id === tenantId,
      )
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneStored(record));
  }
}

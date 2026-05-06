import { expect, test } from "@playwright/test";

import { buildBaseAllocatedManifest } from "../../../../tests/fixtures/run_manifest_fixture.ts";
import type { ManifestLineageTraceCandidateEvaluation } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import {
  ManifestLineageTraceRepository,
  RunManifestRepository,
  buildManifestBranchDecisionContract,
  buildManifestLineageTrace,
  buildRunManifestStartClaimContract,
  manifestLineageTraceRef,
  type ManifestBranchAction,
  type RunManifestRecord,
} from "../../../backend-manifest/src/index.ts";
import {
  ManifestLineageExplorerProjectionError,
  ManifestLineageTraceQueryError,
  queryManifestLineageTraceById,
  queryManifestLineageTraceByRequestIdentity,
  queryManifestLineageTraceForSelectedManifest,
} from "../index.ts";

const branchActions = [
  "NEW_MANIFEST",
  "RETURN_EXISTING_BUNDLE",
  "REUSE_SEALED_MANIFEST",
  "REPLAY_CHILD",
  "RECOVERY_CHILD",
  "CONTINUATION_CHILD",
  "NEW_REQUEST_CHILD",
] as const satisfies readonly ManifestBranchAction[];

const rejectedReasonByAction = {
  NEW_MANIFEST: ["CHILD_ALLOCATION_NOT_REQUIRED"],
  RETURN_EXISTING_BUNDLE: ["RETURNED_BUNDLE_NOT_AVAILABLE"],
  REUSE_SEALED_MANIFEST: ["PRIOR_MANIFEST_NOT_SEALED"],
  REPLAY_CHILD: ["REPLAY_NOT_REQUESTED"],
  RECOVERY_CHILD: ["RECOVERY_NOT_REQUIRED"],
  CONTINUATION_CHILD: ["CONTINUATION_NOT_LEGAL"],
  NEW_REQUEST_CHILD: ["REQUEST_IDENTITY_CONTINUATION_NOT_REQUIRED"],
} as const satisfies Record<
  ManifestBranchAction,
  ManifestLineageTraceCandidateEvaluation["disqualifier_reason_codes"]
>;

function candidateEvaluations(input: {
  prior_manifest_hash: string;
  selected_action: "RETURN_EXISTING_BUNDLE";
  selected_manifest: RunManifestRecord;
}): ManifestLineageTraceCandidateEvaluation[] {
  return branchActions.map((candidateAction) => {
    const selected = candidateAction === input.selected_action;
    const comparedManifestId =
      candidateAction === "NEW_MANIFEST" ? null : input.selected_manifest.manifest_id;
    return {
      candidate_action: candidateAction,
      evaluation_state: selected ? "SELECTED" : "REJECTED",
      compared_manifest_id_or_null: comparedManifestId,
      compared_manifest_hash_or_null:
        comparedManifestId === null ? null : input.prior_manifest_hash,
      compared_manifest_lifecycle_state_or_null:
        comparedManifestId === null ? null : input.selected_manifest.lifecycle_state,
      disqualifier_reason_codes: selected ? [] : [...rejectedReasonByAction[candidateAction]],
    };
  });
}

function completedNightlyManifest(manifestId: string): RunManifestRecord {
  const base = buildBaseAllocatedManifest({
    access_binding_hash: `access-binding-hash://pc0197/query/${manifestId}`,
    idempotency_key: `idempotency://pc0197/query/${manifestId}`,
    manifest_id: manifestId,
    manifest_lineage_trace_refs: [`manifest-lineage-trace://${manifestId}/initial`],
    nightly_batch_run_ref: `nightly-batch://pc0197/query/${manifestId}`,
    nightly_window_key: "2026-W20",
    run_kind: "NIGHTLY",
  });
  return {
    ...base,
    completed_at: "2026-05-05T09:00:00Z",
    decision_bundle_hash: `decision-bundle-hash://pc0197/query/${manifestId}`,
    lifecycle_state: "COMPLETED",
    manifest_start_claim: buildRunManifestStartClaimContract({
      access_binding_hash: base.access_binding_hash,
      claim_acquired_at_or_null: "2026-05-05T08:30:00Z",
      claim_released_at_or_null: "2026-05-05T09:00:00Z",
      claim_release_reason_code_or_null: "COMPLETED",
      claim_state: "TERMINAL_RESULT_RECORDED",
      execution_basis_hash: `execution-basis-hash://pc0197/query/${manifestId}`,
      manifest_hash: `manifest-hash://pc0197/query/${manifestId}`,
      manifest_id: manifestId,
    }),
  };
}

function bundleReturnTrace(input: {
  lineage_trace_id: string;
  request_identity_hash?: string | undefined;
  selected_manifest: RunManifestRecord;
}) {
  const priorManifestHash = `manifest-hash://pc0197/query/${input.selected_manifest.manifest_id}`;
  const branchDecision = buildManifestBranchDecisionContract({
    access_binding_hash: input.selected_manifest.access_binding_hash,
    branch_action: "RETURN_EXISTING_BUNDLE",
    idempotency_key: input.selected_manifest.idempotency_key,
    manifest_id: input.selected_manifest.manifest_id,
    mode: input.selected_manifest.mode,
    nightly_window_key_or_null: input.selected_manifest.nightly_window_key ?? null,
    prior_manifest_hash_at_decision_or_null: priorManifestHash,
    prior_manifest_id_or_null: input.selected_manifest.manifest_id,
    prior_manifest_lifecycle_state_or_null: "COMPLETED",
    requested_scope: input.selected_manifest.requested_scope,
    request_identity_hash:
      input.request_identity_hash ??
      `request-identity-hash://pc0197/query/${input.selected_manifest.manifest_id}`,
    returned_decision_bundle_hash_or_null:
      input.selected_manifest.decision_bundle_hash,
    run_kind: input.selected_manifest.run_kind,
  });
  return buildManifestLineageTrace({
    branch_decision_audit_refs: [
      `audit://pc0197/query/${input.lineage_trace_id}/branch`,
    ],
    branch_decision_trace_span_refs: [
      `trace://pc0197/query/${input.lineage_trace_id}/branch`,
    ],
    candidate_evaluations: candidateEvaluations({
      prior_manifest_hash: priorManifestHash,
      selected_action: "RETURN_EXISTING_BUNDLE",
      selected_manifest: input.selected_manifest,
    }),
    lineage_trace_id: input.lineage_trace_id,
    nightly_predecessor_context: {
      nightly_context_reason_code: "SAME_WINDOW_REUSE",
      predecessor_batch_run_ref_or_null:
        "nightly-batch://pc0197/query/predecessor",
      predecessor_manifest_hash_or_null: priorManifestHash,
      predecessor_manifest_id_or_null: input.selected_manifest.manifest_id,
    },
    request_branch_decision: branchDecision,
    selected_manifest: input.selected_manifest,
  });
}

async function persistedRepositoriesFixture() {
  const runManifestRepository = new RunManifestRepository();
  const lineageTraceRepository = new ManifestLineageTraceRepository({
    runManifestRepository,
  });
  const manifest = completedNightlyManifest("manifest.pc0197.query.bundle");
  await runManifestRepository.createManifest({
    manifest,
    persisted_at: "2026-05-05T09:00:00Z",
  });
  const firstTrace = bundleReturnTrace({
    lineage_trace_id: "mlt.pc0197.query.first",
    selected_manifest: manifest,
  });
  const firstStored = await lineageTraceRepository.persistTrace({
    persisted_at: "2026-05-05T09:01:00Z",
    tenant_id: manifest.tenant_id,
    trace: firstTrace,
  });
  const secondTrace = bundleReturnTrace({
    lineage_trace_id: "mlt.pc0197.query.second",
    selected_manifest: manifest,
  });
  const secondStored = await lineageTraceRepository.persistTrace({
    persisted_at: "2026-05-05T09:02:00Z",
    tenant_id: manifest.tenant_id,
    trace: secondTrace,
  });

  return {
    firstStored,
    lineageTraceRepository,
    manifest,
    runManifestRepository,
    secondStored,
  };
}

test("queries a lineage trace by explicit trace id and renders the persisted decision summary", async () => {
  const fixture = await persistedRepositoriesFixture();
  const result = await queryManifestLineageTraceById({
    lineage_trace_id: fixture.firstStored.lineage_trace_id,
    run_manifest_reader: fixture.runManifestRepository,
    tenant_id: fixture.manifest.tenant_id,
    trace_reader: fixture.lineageTraceRepository,
  });

  expect(result.query_mode).toBe("BY_LINEAGE_TRACE_ID");
  expect(result.primary_selection_policy).toBe("EXPLICIT_LINEAGE_TRACE_ID");
  expect(result.stored_trace.lineage_trace_id).toBe(fixture.firstStored.lineage_trace_id);
  expect(result.explorer.selected_path.selected_branch_action).toBe(
    "RETURN_EXISTING_BUNDLE",
  );
  expect(result.explorer.decision_summary.selected_branch_action_differs_from_manifest_continuation_basis).toBe(
    true,
  );
});

test("selects the latest append-only trace for a manifest unless an explicit trace id is provided", async () => {
  const fixture = await persistedRepositoriesFixture();
  const latest = await queryManifestLineageTraceForSelectedManifest({
    run_manifest_reader: fixture.runManifestRepository,
    selected_manifest_id: fixture.manifest.manifest_id,
    tenant_id: fixture.manifest.tenant_id,
    trace_reader: fixture.lineageTraceRepository,
  });
  expect(latest.primary_selection_policy).toBe(
    "LATEST_PERSISTED_TRACE_FOR_SELECTED_MANIFEST",
  );
  expect(latest.stored_trace.lineage_trace_id).toBe(fixture.secondStored.lineage_trace_id);
  expect(latest.candidate_trace_refs).toEqual([
    fixture.secondStored.lineage_trace_ref,
    fixture.firstStored.lineage_trace_ref,
  ]);

  const explicit = await queryManifestLineageTraceForSelectedManifest({
    lineage_trace_id: fixture.firstStored.lineage_trace_id,
    run_manifest_reader: fixture.runManifestRepository,
    selected_manifest_id: fixture.manifest.manifest_id,
    tenant_id: fixture.manifest.tenant_id,
    trace_reader: fixture.lineageTraceRepository,
  });
  expect(explicit.primary_selection_policy).toBe("EXPLICIT_LINEAGE_TRACE_ID");
  expect(explicit.stored_trace.lineage_trace_id).toBe(fixture.firstStored.lineage_trace_id);
});

test("queries by request identity and idempotency using persisted repository indexes", async () => {
  const fixture = await persistedRepositoriesFixture();
  const result = await queryManifestLineageTraceByRequestIdentity({
    idempotency_key: fixture.manifest.idempotency_key,
    request_identity_hash: fixture.firstStored.request_identity_hash,
    run_manifest_reader: fixture.runManifestRepository,
    selected_manifest_id: fixture.manifest.manifest_id,
    tenant_id: fixture.manifest.tenant_id,
    trace_reader: fixture.lineageTraceRepository,
  });

  expect(result.query_mode).toBe("BY_REQUEST_IDENTITY");
  expect(result.primary_selection_policy).toBe(
    "LATEST_PERSISTED_TRACE_FOR_REQUEST_IDENTITY",
  );
  expect(result.stored_trace.lineage_trace_id).toBe(fixture.secondStored.lineage_trace_id);
  expect(result.candidate_trace_refs).toContain(manifestLineageTraceRef(fixture.firstStored.trace));
  expect(result.candidate_trace_refs).toContain(manifestLineageTraceRef(fixture.secondStored.trace));
});

test("fails closed when no trace exists or selected manifest refs no longer include the stored trace", async () => {
  const fixture = await persistedRepositoriesFixture();
  await expect(
    queryManifestLineageTraceById({
      lineage_trace_id: "mlt.pc0197.query.missing",
      run_manifest_reader: fixture.runManifestRepository,
      tenant_id: fixture.manifest.tenant_id,
      trace_reader: fixture.lineageTraceRepository,
    }),
  ).rejects.toThrow(ManifestLineageTraceQueryError);

  await fixture.runManifestRepository.unsafeCorruptManifestForTesting({
    manifest_id: fixture.manifest.manifest_id,
    mutate: (manifest) => ({
      ...manifest,
      manifest_lineage_trace_refs: manifest.manifest_lineage_trace_refs.filter(
        (traceRef) => traceRef !== fixture.firstStored.lineage_trace_ref,
      ),
    }),
  });
  await expect(
    queryManifestLineageTraceById({
      lineage_trace_id: fixture.firstStored.lineage_trace_id,
      run_manifest_reader: fixture.runManifestRepository,
      tenant_id: fixture.manifest.tenant_id,
      trace_reader: fixture.lineageTraceRepository,
    }),
  ).rejects.toThrow(ManifestLineageExplorerProjectionError);
});

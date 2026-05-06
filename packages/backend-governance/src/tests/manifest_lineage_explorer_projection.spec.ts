import { expect, test } from "@playwright/test";

import {
  buildBaseAllocatedManifest,
} from "../../../../tests/fixtures/run_manifest_fixture.ts";
import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import type { ManifestLineageTraceCandidateEvaluation } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import {
  buildManifestBranchDecisionContract,
  buildManifestLineageTrace,
  buildRunManifestContinuationSet,
  manifestLineageTraceRef,
  type ManifestBranchAction,
  type ManifestLineageTraceRecord,
  type RunManifestRecord,
} from "../../../backend-manifest/src/index.ts";
import {
  ManifestLineageExplorerAssertionError,
  ManifestLineageExplorerProjectionError,
  buildManifestLineageExplorer,
  buildManifestReuseDecisionSummary,
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

function manifestHash(manifestId: string) {
  return `manifest-hash://pc0197/${manifestId}`;
}

function candidateEvaluations(input: {
  prior_manifest_hash_or_null: string | null;
  prior_manifest_id_or_null: string | null;
  prior_manifest_lifecycle_state_or_null: ManifestLineageTraceRecord["prior_manifest_lifecycle_state_or_null"];
  selected_action: ManifestBranchAction;
  selected_manifest_id: string;
}): ManifestLineageTraceCandidateEvaluation[] {
  return branchActions.map((candidateAction) => {
    const selected = candidateAction === input.selected_action;
    const comparedManifestId =
      candidateAction === "NEW_MANIFEST"
        ? null
        : candidateAction === "RETURN_EXISTING_BUNDLE" ||
            candidateAction === "REUSE_SEALED_MANIFEST"
          ? input.prior_manifest_id_or_null ?? input.selected_manifest_id
          : input.prior_manifest_id_or_null;
    return {
      candidate_action: candidateAction,
      evaluation_state: selected ? "SELECTED" : "REJECTED",
      compared_manifest_id_or_null: comparedManifestId,
      compared_manifest_hash_or_null:
        comparedManifestId === null ? null : input.prior_manifest_hash_or_null,
      compared_manifest_lifecycle_state_or_null:
        comparedManifestId === null
          ? null
          : input.prior_manifest_lifecycle_state_or_null,
      disqualifier_reason_codes: selected ? [] : [...rejectedReasonByAction[candidateAction]],
    };
  });
}

function rootManifest(input: {
  lifecycle_state?: RunManifestRecord["lifecycle_state"] | undefined;
  manifest_id: string;
  run_kind?: RunManifestRecord["run_kind"] | undefined;
}) {
  const runKind = input.run_kind ?? "INTERACTIVE";
  return {
    ...buildBaseAllocatedManifest({
      access_binding_hash: `access-binding-hash://pc0197/${input.manifest_id}`,
      idempotency_key: `idempotency://pc0197/${input.manifest_id}`,
      manifest_id: input.manifest_id,
      manifest_lineage_trace_refs: [`manifest-lineage-trace://${input.manifest_id}/initial`],
      nightly_batch_run_ref:
        runKind === "NIGHTLY" ? `nightly-batch://pc0197/${input.manifest_id}` : null,
      nightly_window_key: runKind === "NIGHTLY" ? "2026-W18" : null,
      run_kind: runKind,
    }),
    lifecycle_state: input.lifecycle_state ?? "ALLOCATED",
  } satisfies RunManifestRecord;
}

function sameManifestTrace(input: {
  action: "RETURN_EXISTING_BUNDLE" | "REUSE_SEALED_MANIFEST";
  lifecycle_state: "COMPLETED" | "SEALED";
  manifest_id: string;
  run_kind?: RunManifestRecord["run_kind"] | undefined;
}) {
  const selectedManifest = rootManifest({
    lifecycle_state: input.lifecycle_state,
    manifest_id: input.manifest_id,
    run_kind: input.run_kind,
  });
  const returnedBundleHash =
    input.action === "RETURN_EXISTING_BUNDLE"
      ? `decision-bundle-hash://pc0197/${input.manifest_id}`
      : null;
  const withTerminalState = {
    ...selectedManifest,
    completed_at: input.lifecycle_state === "COMPLETED" ? "2026-05-05T08:20:00Z" : null,
    sealed_at: input.lifecycle_state === "SEALED" ? "2026-05-05T08:10:00Z" : null,
    decision_bundle_hash: returnedBundleHash,
  } satisfies RunManifestRecord;
  const priorManifestHash = manifestHash(input.manifest_id);
  const branchDecision = buildManifestBranchDecisionContract({
    access_binding_hash: withTerminalState.access_binding_hash,
    branch_action: input.action,
    idempotency_key: withTerminalState.idempotency_key,
    manifest_id: withTerminalState.manifest_id,
    mode: withTerminalState.mode,
    nightly_window_key_or_null: withTerminalState.nightly_window_key ?? null,
    prior_manifest_hash_at_decision_or_null: priorManifestHash,
    prior_manifest_id_or_null: withTerminalState.manifest_id,
    prior_manifest_lifecycle_state_or_null: input.lifecycle_state,
    requested_scope: withTerminalState.requested_scope,
    request_identity_hash: `request-identity-hash://pc0197/${input.manifest_id}`,
    returned_decision_bundle_hash_or_null: returnedBundleHash,
    run_kind: withTerminalState.run_kind,
  });
  return buildManifestLineageTrace({
    branch_decision_audit_refs: [`audit://pc0197/${input.manifest_id}/branch`],
    branch_decision_trace_span_refs: [`trace://pc0197/${input.manifest_id}/branch`],
    candidate_evaluations: candidateEvaluations({
      prior_manifest_hash_or_null: priorManifestHash,
      prior_manifest_id_or_null: withTerminalState.manifest_id,
      prior_manifest_lifecycle_state_or_null: input.lifecycle_state,
      selected_action: input.action,
      selected_manifest_id: withTerminalState.manifest_id,
    }),
    nightly_predecessor_context:
      withTerminalState.run_kind === "NIGHTLY"
        ? {
            nightly_context_reason_code: "SAME_WINDOW_REUSE",
            predecessor_batch_run_ref_or_null: `nightly-batch://pc0197/${input.manifest_id}/predecessor`,
            predecessor_manifest_hash_or_null: priorManifestHash,
            predecessor_manifest_id_or_null: withTerminalState.manifest_id,
          }
        : undefined,
    request_branch_decision: branchDecision,
    selected_manifest: withTerminalState,
  });
}

function childTrace(input: {
  action: "REPLAY_CHILD" | "RECOVERY_CHILD" | "CONTINUATION_CHILD" | "NEW_REQUEST_CHILD";
  manifest_id: string;
  parent_lifecycle_state: "COMPLETED" | "IN_PROGRESS";
  run_kind?: RunManifestRecord["run_kind"] | undefined;
}) {
  const parentManifestId = `${input.manifest_id}.parent`;
  const parentHash = manifestHash(parentManifestId);
  const parentManifest = {
    ...rootManifest({
      lifecycle_state: input.parent_lifecycle_state,
      manifest_id: parentManifestId,
      run_kind: input.run_kind,
    }),
    hash_set: {
      access_binding_hash: `access-binding-hash://pc0197/${parentManifestId}`,
      config_freeze_hash: "config-freeze-hash://pc0197/parent",
      config_surface_hash: "config-surface-hash://pc0197/parent",
      input_set_hash: "input-set-hash://pc0197/parent",
      execution_basis_hash: "execution-basis-hash://pc0197/parent",
      manifest_hash: parentHash,
    },
  } satisfies RunManifestRecord;
  const runKind = input.run_kind ?? "INTERACTIVE";
  const preliminaryChild = buildBaseAllocatedManifest({
    access_binding_hash: `access-binding-hash://pc0197/${input.manifest_id}`,
    idempotency_key: `idempotency://pc0197/${input.manifest_id}`,
    manifest_id: input.manifest_id,
    manifest_lineage_trace_refs: [`manifest-lineage-trace://${input.manifest_id}/initial`],
    nightly_batch_run_ref:
      runKind === "NIGHTLY" ? `nightly-batch://pc0197/${input.manifest_id}` : null,
    nightly_window_key: runKind === "NIGHTLY" ? "2026-W19" : null,
    run_kind: runKind,
  });
  const branchDecision = buildManifestBranchDecisionContract({
    access_binding_hash: preliminaryChild.access_binding_hash,
    branch_action: input.action,
    idempotency_key: preliminaryChild.idempotency_key,
    manifest_id: preliminaryChild.manifest_id,
    mode: preliminaryChild.mode,
    nightly_window_key_or_null: preliminaryChild.nightly_window_key ?? null,
    parent_manifest_id_or_null: parentManifest.manifest_id,
    prior_manifest_hash_at_decision_or_null: parentHash,
    prior_manifest_id_or_null: parentManifest.manifest_id,
    prior_manifest_lifecycle_state_or_null: parentManifest.lifecycle_state,
    requested_scope: preliminaryChild.requested_scope,
    request_identity_hash: `request-identity-hash://pc0197/${input.manifest_id}`,
    root_manifest_id: parentManifest.root_manifest_id ?? parentManifest.manifest_id,
    run_kind: preliminaryChild.run_kind,
    selected_manifest_generation: parentManifest.manifest_generation + 1,
    continuation_of_manifest_id_or_null:
      input.action === "REPLAY_CHILD" ? null : parentManifest.manifest_id,
    replay_of_manifest_id_or_null:
      input.action === "REPLAY_CHILD" ? parentManifest.manifest_id : null,
    supersedes_manifest_id_or_null:
      input.action === "NEW_REQUEST_CHILD" ? parentManifest.manifest_id : null,
  });
  const selectedManifest = {
    ...preliminaryChild,
    continuation_basis: input.action,
    continuation_of_manifest_id: branchDecision.continuation_of_manifest_id_or_null,
    continuation_set: buildRunManifestContinuationSet(branchDecision),
    manifest_branch_decision: branchDecision,
    manifest_generation: branchDecision.selected_manifest_generation,
    parent_manifest_id: parentManifest.manifest_id,
    replay_of_manifest_id: branchDecision.replay_of_manifest_id_or_null,
    root_manifest_id: branchDecision.root_manifest_id,
    supersedes_manifest_id: branchDecision.supersedes_manifest_id_or_null,
  } satisfies RunManifestRecord;
  return buildManifestLineageTrace({
    branch_decision_audit_refs: [`audit://pc0197/${input.manifest_id}/branch`],
    branch_decision_trace_span_refs: [`trace://pc0197/${input.manifest_id}/branch`],
    candidate_evaluations: candidateEvaluations({
      prior_manifest_hash_or_null: parentHash,
      prior_manifest_id_or_null: parentManifest.manifest_id,
      prior_manifest_lifecycle_state_or_null: parentManifest.lifecycle_state,
      selected_action: input.action,
      selected_manifest_id: selectedManifest.manifest_id,
    }),
    nightly_predecessor_context:
      input.action === "CONTINUATION_CHILD" && runKind === "NIGHTLY"
        ? {
            nightly_context_reason_code: "WINDOW_ADVANCE_FROM_PREDECESSOR",
            predecessor_batch_run_ref_or_null:
              "nightly-batch://pc0197/continuation/predecessor",
            predecessor_manifest_hash_or_null: parentHash,
            predecessor_manifest_id_or_null: parentManifest.manifest_id,
          }
        : undefined,
    request_branch_decision: branchDecision,
    selected_manifest: selectedManifest,
  });
}

function traceScenarios() {
  const newManifest = rootManifest({ manifest_id: "manifest.pc0197.new" });
  const newBranchDecision = buildManifestBranchDecisionContract({
    access_binding_hash: newManifest.access_binding_hash,
    branch_action: "NEW_MANIFEST",
    idempotency_key: newManifest.idempotency_key,
    manifest_id: newManifest.manifest_id,
    mode: newManifest.mode,
    requested_scope: newManifest.requested_scope,
    request_identity_hash: "request-identity-hash://pc0197/new",
    run_kind: newManifest.run_kind,
  });
  return [
    buildManifestLineageTrace({
      branch_decision_audit_refs: ["audit://pc0197/new/branch"],
      branch_decision_trace_span_refs: ["trace://pc0197/new/branch"],
      candidate_evaluations: candidateEvaluations({
        prior_manifest_hash_or_null: null,
        prior_manifest_id_or_null: null,
        prior_manifest_lifecycle_state_or_null: null,
        selected_action: "NEW_MANIFEST",
        selected_manifest_id: newManifest.manifest_id,
      }),
      request_branch_decision: newBranchDecision,
      selected_manifest: newManifest,
    }),
    sameManifestTrace({
      action: "RETURN_EXISTING_BUNDLE",
      lifecycle_state: "COMPLETED",
      manifest_id: "manifest.pc0197.return-bundle",
      run_kind: "NIGHTLY",
    }),
    sameManifestTrace({
      action: "REUSE_SEALED_MANIFEST",
      lifecycle_state: "SEALED",
      manifest_id: "manifest.pc0197.reuse-sealed",
    }),
    childTrace({
      action: "REPLAY_CHILD",
      manifest_id: "manifest.pc0197.replay-child",
      parent_lifecycle_state: "COMPLETED",
    }),
    childTrace({
      action: "RECOVERY_CHILD",
      manifest_id: "manifest.pc0197.recovery-child",
      parent_lifecycle_state: "IN_PROGRESS",
    }),
    childTrace({
      action: "CONTINUATION_CHILD",
      manifest_id: "manifest.pc0197.continuation-child",
      parent_lifecycle_state: "COMPLETED",
      run_kind: "NIGHTLY",
    }),
    childTrace({
      action: "NEW_REQUEST_CHILD",
      manifest_id: "manifest.pc0197.new-request-child",
      parent_lifecycle_state: "COMPLETED",
    }),
  ];
}

test("projects schema-valid lineage traces without adjacency inference", async () => {
  for (const trace of traceScenarios()) {
    await validateContractSchema("manifest_lineage_trace", trace);
    const explorer = buildManifestLineageExplorer({
      expected_selected_manifest_continuation_basis:
        trace.selected_manifest_continuation_basis,
      expected_selected_manifest_id: trace.selected_manifest_id,
      selected_manifest_lineage_trace_refs: [
        `manifest-lineage-trace://${trace.selected_manifest_id}/initial`,
        manifestLineageTraceRef(trace),
      ],
      trace,
    });

    expect(explorer.query_truth_policy).toBe("PERSISTED_MANIFEST_LINEAGE_TRACE_ONLY");
    expect(explorer.candidate_matrix.coverage_state).toBe("EXHAUSTIVE_CANONICAL_ACTIONS");
    expect(explorer.candidate_matrix.canonical_action_order).toEqual([...branchActions]);
    expect(explorer.candidate_matrix.selected_candidate.candidate_action).toBe(
      trace.selected_branch_action,
    );
    expect(explorer.mirror_evidence.mirror_sources).toEqual([
      "RUN_MANIFEST_TOP_LEVEL",
      "CONTINUATION_SET",
      "MANIFEST_BRANCH_DECISION",
    ]);
    expect(explorer.evidence_refs.branch_decision_audit_refs).toEqual(
      trace.branch_decision_audit_refs,
    );
  }
});

test("summarizes reuse and child allocation evidence without collapsing branch action into local basis", () => {
  const bundleTrace = traceScenarios().find(
    (trace) => trace.selected_branch_action === "RETURN_EXISTING_BUNDLE",
  )!;
  const bundleSummary = buildManifestReuseDecisionSummary(bundleTrace);
  expect(bundleSummary.reuse_disposition).toBe("EXISTING_DECISION_BUNDLE_RETURNED");
  expect(bundleSummary.selected_branch_action_differs_from_manifest_continuation_basis).toBe(
    true,
  );
  expect(bundleSummary.selected_manifest_continuation_basis).toBe("NEW_MANIFEST");
  expect(bundleSummary.returned_decision_bundle_hash_or_null).toBe(
    "decision-bundle-hash://pc0197/manifest.pc0197.return-bundle",
  );
  expect(bundleSummary.nightly_predecessor_context.predecessor_manifest_id_or_null).toBe(
    bundleTrace.prior_manifest_id_or_null,
  );

  const replayTrace = traceScenarios().find(
    (trace) => trace.selected_branch_action === "REPLAY_CHILD",
  )!;
  const replaySummary = buildManifestReuseDecisionSummary(replayTrace);
  expect(replaySummary.inheritance_modes).toEqual({
    config_inheritance_mode_or_null: "REPLAY_EXACT",
    input_inheritance_mode_or_null: "REPLAY_EXACT",
  });
  expect(replaySummary.selected_lineage.replay_of_manifest_id_or_null).toBe(
    replayTrace.prior_manifest_id_or_null,
  );
});

test("fails closed when selected trace ref, mirror sources, or candidate bindings diverge", () => {
  const trace = sameManifestTrace({
    action: "REUSE_SEALED_MANIFEST",
    lifecycle_state: "SEALED",
    manifest_id: "manifest.pc0197.fail-closed",
  });

  expect(() =>
    buildManifestLineageExplorer({
      selected_manifest_lineage_trace_refs: ["manifest-lineage-trace://different"],
      trace,
    }),
  ).toThrow(ManifestLineageExplorerProjectionError);

  expect(() =>
    buildManifestLineageExplorer({
      selected_manifest_lineage_trace_refs: [manifestLineageTraceRef(trace)],
      trace: {
        ...trace,
        mirror_sources: ["RUN_MANIFEST_TOP_LEVEL", "CONTINUATION_SET"],
      },
    }),
  ).toThrow(ManifestLineageExplorerAssertionError);

  const invalidCandidateTrace = {
    ...trace,
    candidate_evaluations: trace.candidate_evaluations.map((candidate) =>
      candidate.evaluation_state === "SELECTED"
        ? {
            ...candidate,
            compared_manifest_id_or_null: "manifest.pc0197.unrelated",
          }
        : candidate,
    ),
  } satisfies ManifestLineageTraceRecord;
  expect(() =>
    buildManifestLineageExplorer({
      selected_manifest_lineage_trace_refs: [manifestLineageTraceRef(invalidCandidateTrace)],
      trace: invalidCandidateTrace,
    }),
  ).toThrow(ManifestLineageExplorerAssertionError);
});

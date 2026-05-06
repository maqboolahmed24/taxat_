import { expect, test } from "@playwright/test";

import {
  BranchCandidateEvaluationValidationError,
  buildManifestBranchDecisionContract,
  buildManifestLineageTrace,
  deriveManifestLineageTraceStableHash,
  evaluateManifestLineageMirrorConsistency,
  type ManifestBranchAction,
  ManifestLineageMirrorConsistencyError,
  ManifestLineageTraceError,
  type ManifestLineageTraceRecord,
  normalizeManifestLineageTrace,
  validateBranchCandidateEvaluations,
} from "../../../packages/backend-manifest/src/index.ts";
import type { ManifestLineageTraceCandidateEvaluation } from "../../../packages/generated-models/src/generated/typescript/manifest-and-release.ts";
import { buildBaseAllocatedManifest } from "../../fixtures/run_manifest_fixture.ts";

function candidateEvaluations(
  selectedAction: ManifestBranchAction,
): ManifestLineageTraceCandidateEvaluation[] {
  return [
    {
      candidate_action: "NEW_MANIFEST",
      evaluation_state: selectedAction === "NEW_MANIFEST" ? "SELECTED" : "REJECTED",
      compared_manifest_id_or_null: null,
      compared_manifest_hash_or_null: null,
      compared_manifest_lifecycle_state_or_null: null,
      disqualifier_reason_codes:
        selectedAction === "NEW_MANIFEST" ? [] : ["CHILD_ALLOCATION_NOT_REQUIRED"],
    },
    {
      candidate_action: "RETURN_EXISTING_BUNDLE",
      evaluation_state: selectedAction === "RETURN_EXISTING_BUNDLE" ? "SELECTED" : "REJECTED",
      compared_manifest_id_or_null: "manifest.run.return.0098",
      compared_manifest_hash_or_null: "manifest-hash://return.0098",
      compared_manifest_lifecycle_state_or_null: "COMPLETED",
      disqualifier_reason_codes:
        selectedAction === "RETURN_EXISTING_BUNDLE" ? [] : ["RETURNED_BUNDLE_NOT_AVAILABLE"],
    },
    {
      candidate_action: "REUSE_SEALED_MANIFEST",
      evaluation_state: selectedAction === "REUSE_SEALED_MANIFEST" ? "SELECTED" : "REJECTED",
      compared_manifest_id_or_null: "manifest.run.return.0098",
      compared_manifest_hash_or_null: "manifest-hash://return.0098",
      compared_manifest_lifecycle_state_or_null: "COMPLETED",
      disqualifier_reason_codes:
        selectedAction === "REUSE_SEALED_MANIFEST"
          ? []
          : ["PRIOR_MANIFEST_NOT_SEALED", "PRIOR_MANIFEST_ALREADY_STARTED"],
    },
    {
      candidate_action: "REPLAY_CHILD",
      evaluation_state: selectedAction === "REPLAY_CHILD" ? "SELECTED" : "REJECTED",
      compared_manifest_id_or_null: "manifest.run.return.0098",
      compared_manifest_hash_or_null: "manifest-hash://return.0098",
      compared_manifest_lifecycle_state_or_null: "COMPLETED",
      disqualifier_reason_codes:
        selectedAction === "REPLAY_CHILD" ? [] : ["REPLAY_CLASS_MISMATCH", "REPLAY_NOT_REQUESTED"],
    },
    {
      candidate_action: "RECOVERY_CHILD",
      evaluation_state: selectedAction === "RECOVERY_CHILD" ? "SELECTED" : "REJECTED",
      compared_manifest_id_or_null: "manifest.run.return.0098",
      compared_manifest_hash_or_null: "manifest-hash://return.0098",
      compared_manifest_lifecycle_state_or_null: "COMPLETED",
      disqualifier_reason_codes:
        selectedAction === "RECOVERY_CHILD" ? [] : ["RECOVERY_NOT_REQUIRED"],
    },
    {
      candidate_action: "CONTINUATION_CHILD",
      evaluation_state: selectedAction === "CONTINUATION_CHILD" ? "SELECTED" : "REJECTED",
      compared_manifest_id_or_null: "manifest.run.return.0098",
      compared_manifest_hash_or_null: "manifest-hash://return.0098",
      compared_manifest_lifecycle_state_or_null: "COMPLETED",
      disqualifier_reason_codes:
        selectedAction === "CONTINUATION_CHILD" ? [] : ["CONTINUATION_NOT_LEGAL"],
    },
    {
      candidate_action: "NEW_REQUEST_CHILD",
      evaluation_state: selectedAction === "NEW_REQUEST_CHILD" ? "SELECTED" : "REJECTED",
      compared_manifest_id_or_null: "manifest.run.return.0098",
      compared_manifest_hash_or_null: "manifest-hash://return.0098",
      compared_manifest_lifecycle_state_or_null: "COMPLETED",
      disqualifier_reason_codes:
        selectedAction === "NEW_REQUEST_CHILD"
          ? []
          : ["REQUEST_IDENTITY_CONTINUATION_NOT_REQUIRED"],
    },
  ];
}

function buildCompletedManifest() {
  const manifest = buildBaseAllocatedManifest({
    manifest_id: "manifest.run.return.0098",
    access_binding_hash: "access-binding-hash://manifest.run.return.0098",
    idempotency_key: "idempotency://manifest.run.return.0098",
    manifest_lineage_trace_refs: ["manifest-lineage-trace://manifest.run.return.0098/original"],
  });
  return {
    ...manifest,
    lifecycle_state: "COMPLETED" as const,
    completed_at: "2026-04-24T11:00:00Z",
    decision_bundle_hash: "decision-bundle-hash://manifest.run.return.0098",
  };
}

function buildReturnBranchDecision(selectedManifest = buildCompletedManifest()) {
  return buildManifestBranchDecisionContract({
    branch_action: "RETURN_EXISTING_BUNDLE",
    access_binding_hash: selectedManifest.access_binding_hash,
    idempotency_key: selectedManifest.idempotency_key,
    manifest_id: selectedManifest.manifest_id,
    mode: selectedManifest.mode,
    requested_scope: selectedManifest.requested_scope,
    run_kind: "NIGHTLY",
    nightly_window_key_or_null: "2026-W17",
    prior_manifest_id_or_null: selectedManifest.manifest_id,
    prior_manifest_hash_at_decision_or_null: "manifest-hash://return.0098",
    prior_manifest_lifecycle_state_or_null: "COMPLETED",
    request_identity_hash: "request-identity-hash://return.0098",
    returned_decision_bundle_hash_or_null: selectedManifest.decision_bundle_hash,
  });
}

function buildReturnTrace() {
  const selectedManifest = buildCompletedManifest();
  return buildManifestLineageTrace({
    selected_manifest: selectedManifest,
    request_branch_decision: buildReturnBranchDecision(selectedManifest),
    candidate_evaluations: candidateEvaluations("RETURN_EXISTING_BUNDLE"),
    branch_decision_audit_refs: ["audit://manifest.run.return.0098/branch"],
    branch_decision_trace_span_refs: ["trace://manifest.run.return.0098/branch"],
  });
}

test("factory preserves bundle-return branch outcome separately from manifest-local basis", () => {
  const trace = buildReturnTrace();
  const secondTrace = buildReturnTrace();

  expect(trace.selected_branch_action).toBe("RETURN_EXISTING_BUNDLE");
  expect(trace.selected_manifest_continuation_basis).toBe("NEW_MANIFEST");
  expect(trace.returned_decision_bundle_hash_or_null).toBe(
    "decision-bundle-hash://manifest.run.return.0098",
  );
  expect(deriveManifestLineageTraceStableHash(trace)).toBe(
    deriveManifestLineageTraceStableHash(secondTrace),
  );
});

test("factory records sealed-manifest reuse without fabricating child lineage refs", () => {
  const selectedManifest = {
    ...buildBaseAllocatedManifest({
      manifest_id: "manifest.run.reuse-sealed.0098",
      access_binding_hash: "access-binding-hash://manifest.run.reuse-sealed.0098",
      idempotency_key: "idempotency://manifest.run.reuse-sealed.0098",
    }),
    lifecycle_state: "SEALED" as const,
    sealed_at: "2026-04-24T10:00:00Z",
  };
  const requestBranchDecision = buildManifestBranchDecisionContract({
    branch_action: "REUSE_SEALED_MANIFEST",
    access_binding_hash: selectedManifest.access_binding_hash,
    idempotency_key: selectedManifest.idempotency_key,
    manifest_id: selectedManifest.manifest_id,
    mode: selectedManifest.mode,
    requested_scope: selectedManifest.requested_scope,
    run_kind: selectedManifest.run_kind,
    prior_manifest_id_or_null: selectedManifest.manifest_id,
    prior_manifest_hash_at_decision_or_null: "manifest-hash://reuse-sealed.0098",
    prior_manifest_lifecycle_state_or_null: "SEALED",
    request_identity_hash: "request-identity-hash://reuse-sealed.0098",
  });

  const trace = buildManifestLineageTrace({
    selected_manifest: selectedManifest,
    request_branch_decision: requestBranchDecision,
    candidate_evaluations: candidateEvaluations("REUSE_SEALED_MANIFEST"),
    branch_decision_audit_refs: ["audit://manifest.run.reuse-sealed.0098/branch"],
    branch_decision_trace_span_refs: ["trace://manifest.run.reuse-sealed.0098/branch"],
  });

  expect(trace.selected_branch_action).toBe("REUSE_SEALED_MANIFEST");
  expect(trace.selected_manifest_continuation_basis).toBe("NEW_MANIFEST");
  expect(trace.parent_manifest_id_or_null).toBeNull();
  expect(trace.continuation_of_manifest_id_or_null).toBeNull();
  expect(trace.replay_of_manifest_id_or_null).toBeNull();
  expect(trace.supersedes_manifest_id_or_null).toBeNull();
  expect(trace.returned_decision_bundle_hash_or_null).toBeNull();
});

test("candidate validator requires exhaustive order, one selection, and typed rejection reasons", () => {
  expect(() =>
    validateBranchCandidateEvaluations({
      candidate_evaluations: candidateEvaluations("RETURN_EXISTING_BUNDLE").slice(1),
      selected_branch_action: "RETURN_EXISTING_BUNDLE",
    }),
  ).toThrow(BranchCandidateEvaluationValidationError);

  const missingReason = candidateEvaluations("RETURN_EXISTING_BUNDLE");
  missingReason[0] = {
    ...missingReason[0]!,
    disqualifier_reason_codes: [],
  };
  expect(() =>
    validateBranchCandidateEvaluations({
      candidate_evaluations: missingReason,
      selected_branch_action: "RETURN_EXISTING_BUNDLE",
    }),
  ).toThrow(BranchCandidateEvaluationValidationError);

  const duplicateSelected = candidateEvaluations("RETURN_EXISTING_BUNDLE");
  duplicateSelected[0] = {
    ...duplicateSelected[0]!,
    evaluation_state: "SELECTED",
    disqualifier_reason_codes: [],
  };
  expect(() =>
    validateBranchCandidateEvaluations({
      candidate_evaluations: duplicateSelected,
      selected_branch_action: "RETURN_EXISTING_BUNDLE",
    }),
  ).toThrow(BranchCandidateEvaluationValidationError);
});

test("mirror consistency fails closed when selected-manifest lineage mirrors drift", () => {
  const manifest = buildCompletedManifest();
  expect(evaluateManifestLineageMirrorConsistency(manifest).mirror_sources).toEqual([
    "RUN_MANIFEST_TOP_LEVEL",
    "CONTINUATION_SET",
    "MANIFEST_BRANCH_DECISION",
  ]);

  expect(() =>
    evaluateManifestLineageMirrorConsistency({
      ...manifest,
      continuation_set: {
        ...manifest.continuation_set,
        root_manifest_id: "manifest.run.other-root",
      },
    }),
  ).toThrow(ManifestLineageMirrorConsistencyError);
});

test("trace validation keeps nightly same-window reuse distinct from window advancement", () => {
  const trace = buildReturnTrace();
  expect(trace.nightly_context_reason_code_or_null).toBe("SAME_WINDOW_REUSE");

  expect(() =>
    normalizeManifestLineageTrace({
      ...trace,
      selected_branch_action: "CONTINUATION_CHILD",
      selected_branch_reason_code: "NIGHTLY_WINDOW_ADVANCED",
      returned_decision_bundle_hash_or_null: null,
    } satisfies ManifestLineageTraceRecord),
  ).toThrow(ManifestLineageTraceError);
});

test("returned decision bundle hash is legal only for bundle-return traces", () => {
  const trace = buildReturnTrace();
  expect(() =>
    normalizeManifestLineageTrace({
      ...trace,
      selected_branch_action: "REUSE_SEALED_MANIFEST",
    } satisfies ManifestLineageTraceRecord),
  ).toThrow(ManifestLineageTraceError);
});

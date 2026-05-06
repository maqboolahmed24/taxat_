import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  DecisionBundleRepository,
  finalizeTerminalOutcome,
  reloadTerminalBundleForSameRequestRetry,
} from "../../../packages/backend-compute/src/index.ts";
import {
  buildRunManifestStartClaimContract,
  RunManifestRepository,
  type RunManifestRecord,
} from "../../../packages/backend-manifest/src/index.ts";
import {
  buildBaseAllocatedManifest,
  buildFrozenBasis,
  buildSealReadyPresealEvaluation,
  buildStartedManifestClaim,
} from "../../fixtures/run_manifest_fixture.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const migrationPath = path.join(
  repoRoot,
  "db",
  "migrations",
  "phase03_0127_decision_bundle_and_terminal_finalization.sql",
);

function buildStartedManifest(manifestId: string): RunManifestRecord {
  const allocated = buildBaseAllocatedManifest({
    manifest_id: manifestId,
    idempotency_key: `idempotency://${manifestId}`,
  });
  const frozen = {
    ...allocated,
    lifecycle_state: "FROZEN" as const,
    frozen_at: "2026-04-28T09:10:00Z",
    ...buildFrozenBasis(allocated),
  } as unknown as RunManifestRecord;
  const { gates, evaluation } = buildSealReadyPresealEvaluation(frozen);
  const sealed = {
    ...frozen,
    lifecycle_state: "SEALED" as const,
    sealed_at: "2026-04-28T09:20:00Z",
    preseal_gate_evaluation: evaluation,
    append_only_outcome_projection: {
      ...frozen.append_only_outcome_projection!,
      gating_decisions: gates,
    },
    gating_decisions: gates,
    manifest_start_claim: buildRunManifestStartClaimContract({
      access_binding_hash: frozen.access_binding_hash,
      claim_state: "UNCLAIMED_SEALED",
      execution_basis_hash: frozen.hash_set!.execution_basis_hash,
      manifest_hash: frozen.hash_set!.manifest_hash,
      manifest_id: frozen.manifest_id,
    }),
  } as RunManifestRecord;
  const openedAt = "2026-04-28T09:25:00Z";
  return {
    ...sealed,
    lifecycle_state: "IN_PROGRESS" as const,
    opened_at: openedAt,
    manifest_start_claim: buildStartedManifestClaim(sealed, openedAt),
  } as RunManifestRecord;
}

test("migration defines decision bundle register, invariants, indexes, and RLS", async () => {
  const sql = await readFile(migrationPath, "utf8");

  expect(sql).toContain("CREATE TABLE IF NOT EXISTS control_compute.decision_bundle_register");
  expect(sql).toContain("decision_bundle_reason_compression_chk");
  expect(sql).toContain("decision_bundle_action_available_chk");
  expect(sql).toContain("decision_bundle_primary_proof_graph_chk");
  expect(sql).toContain("decision_bundle_manifest_idx");
  expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
});

test("review-required terminal bundles complete the manifest and reload on retry", async () => {
  const manifest = buildStartedManifest("manifest-0127-terminal-sync");
  const decisionBundles = new DecisionBundleRepository();
  const manifests = new RunManifestRepository();
  await manifests.createManifest({
    manifest,
    persisted_at: "2026-04-28T09:25:00Z",
  });

  const finalized = await finalizeTerminalOutcome({
    decision_bundle_input: {
      active_detail_surface_code: "AUTHORITY_TUNNEL",
      blocked_action_codes: ["DECLARE_CONFIRMED_FILED"],
      focus_anchor_ref: "submission-record://0127-terminal-sync",
      manifest_id: manifest.manifest_id,
      next_action_codes: ["AWAIT_AUTHORITY_RECONCILIATION"],
      outcome_class: "AUTHORITY_PENDING",
      persisted_at: "2026-04-28T09:40:00Z",
      reason_codes: [
        "SUBMISSION_PENDING_EXTERNAL_CONFIRMATION",
        "AUTHORITY_PENDING",
        "GATE_PASS_WITH_NOTICE",
        "APPROVAL_PENDING",
      ],
      submission_record_id: "submission-record://0127-terminal-sync",
      workflow_item_refs: ["workflow-item://authority-open"],
    },
    expected_manifest_row_version: 1,
    manifest,
    repository: decisionBundles,
    run_manifest_repository: manifests,
  });

  expect(finalized.manifest_transition_event_code).toBe("run_completed");
  expect(finalized.manifest?.lifecycle_state).toBe("COMPLETED");
  expect(finalized.stored_decision_bundle.record.decision_status).toBe("REVIEW_REQUIRED");
  expect(finalized.manifest?.decision_bundle_hash).toBe(finalized.decision_bundle_hash);
  expect(finalized.manifest?.deterministic_outcome_hash).toBe(finalized.deterministic_outcome_hash);
  expect(finalized.manifest?.submission_refs).toEqual(["submission-record://0127-terminal-sync"]);
  expect(Object.values(finalized.manifest?.output_refs ?? {})).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        artifact_hash_or_null: finalized.decision_bundle_hash,
        linkage_role_code: "DECISION_BUNDLE",
      }),
      expect.objectContaining({
        artifact_ref: "submission-record://0127-terminal-sync",
        linkage_role_code: "SUBMISSION_RECORD",
      }),
    ]),
  );

  const retry = await reloadTerminalBundleForSameRequestRetry({
    manifest: finalized.manifest!,
    repository: decisionBundles,
  });
  expect(retry.reload_state).toBe("RETURN_EXISTING_BUNDLE");
  expect(retry.child_manifest_allocated).toBe(false);
  expect(retry.decision_bundle_hash).toBe(finalized.decision_bundle_hash);

  const secondFinalize = await finalizeTerminalOutcome({
    decision_bundle: finalized.stored_decision_bundle.record,
    repository: decisionBundles,
    run_manifest_repository: manifests,
    tenant_id: manifest.tenant_id,
  });
  expect(secondFinalize.reloaded_existing_bundle).toBe(true);
  expect(secondFinalize.manifest_transition_event_code).toBeNull();
});

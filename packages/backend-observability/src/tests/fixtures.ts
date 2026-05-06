import type {
  ManifestBranchDecisionContract,
  ManifestStartClaimContract,
} from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { buildTelemetryResource } from "../index.ts";

export function sampleTelemetryResource() {
  return buildTelemetryResource({
    buildArtifactDigest: "sha256:artifact.pc0214",
    buildRef: "build://pc0214",
    deploymentRef: "deployment://pc0214",
    environmentRef: "env://test",
    instanceRef: "instance://pc0214/1",
    releaseCandidateHash: "release-hash-pc0214",
    schemaBundleHash: "schema-hash-pc0214",
    serviceName: "backend-observability",
    startedAt: "2026-05-05T09:00:00Z",
    workspaceId: "workspace://taxat/test",
  });
}

export function sampleBranchDecision(
  overrides: Partial<ManifestBranchDecisionContract> = {},
): ManifestBranchDecisionContract {
  return {
    access_binding_hash: "access-binding-hash.pc0214",
    branch_action: "NEW_MANIFEST",
    branch_reason_code: "NO_PRIOR_MANIFEST",
    config_inheritance_mode_or_null: null,
    continuation_of_manifest_id_or_null: null,
    effective_scope: ["quarterly_update"] as never,
    idempotency_key: "idem.pc0214",
    input_inheritance_mode_or_null: null,
    mode: "COMPLIANCE",
    nightly_window_key_or_null: null,
    parent_manifest_id_or_null: null,
    prior_manifest_hash_at_decision_or_null: null,
    prior_manifest_id_or_null: null,
    prior_manifest_lifecycle_state_or_null: null,
    replay_class_or_null: null,
    replay_of_manifest_id_or_null: null,
    request_identity_hash: "request-identity-hash.pc0214",
    requested_scope: ["quarterly_update"] as never,
    returned_decision_bundle_hash_or_null: null,
    root_manifest_id: "manifest.pc0214",
    run_kind: "INTERACTIVE",
    selected_manifest_continuation_basis: "NEW_MANIFEST",
    selected_manifest_generation: 0,
    selected_manifest_id: "manifest.pc0214",
    supersedes_manifest_id_or_null: null,
    ...overrides,
  };
}

export function sampleStartClaim(
  overrides: Partial<ManifestStartClaimContract> = {},
): ManifestStartClaimContract {
  return {
    access_binding_hash: "access-binding-hash.pc0214",
    attempt_lineage_ref: "attempt-lineage://pc0214",
    claim_acquired_at_or_null: "2026-05-05T09:00:02Z",
    claim_epoch: 1,
    claim_expires_at_or_null: "2026-05-05T09:05:02Z",
    claim_holder_ref_or_null: "worker://pc0214",
    claim_publication_atomicity: "CLAIM_AND_FIRST_PUBLICATION_COMMIT_TOGETHER",
    claim_release_reason_code_or_null: null,
    claim_released_at_or_null: null,
    claim_state: "ACTIVE_LEASED",
    claim_status_code: "ALREADY_ACTIVE",
    claim_token_or_null: "claim-token-hash.pc0214",
    concurrency_policy: "SINGLE_WRITER_LEASED_START_ONLY",
    contract_class: "MANIFEST_START_CLAIM",
    execution_basis_hash: "execution-basis-hash.pc0214",
    first_publication_committed_at_or_null: "2026-05-05T09:00:03Z",
    manifest_hash: "manifest-hash.pc0214",
    manifest_id: "manifest.pc0214",
    nightly_reclaim_policy: "DEFER_DUPLICATE_START_WHILE_ACTIVE_LEASE",
    outbox_batch_ref_or_null: "outbox-batch://pc0214",
    publication_state: "PUBLISHED_WITH_ACTIVE_LEASE",
    recovery_child_policy: "FORBID_WHILE_ACTIVE_LEASE",
    stage_dag_ref_or_null: "stage-dag://pc0214",
    stale_reclaim_policy: "EXPLICIT_SUCCESSOR_PROOF_REQUIRED",
    stale_reclaim_reason_code_or_null: null,
    ...overrides,
  } as ManifestStartClaimContract;
}

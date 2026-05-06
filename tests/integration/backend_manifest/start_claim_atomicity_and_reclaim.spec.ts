import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  RunManifestRepository,
  buildRunManifestStartClaimContract,
  buildStartClaimAtomicPublication,
  claimManifestStart,
  reclaimManifestStart,
  type RunManifestRecord,
} from "../../../packages/backend-manifest/src/index.ts";
import {
  buildBaseAllocatedManifest,
  buildFrozenBasis,
  buildSealReadyPresealEvaluation,
} from "../../fixtures/run_manifest_fixture.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const migrationPath = path.join(
  repoRoot,
  "db",
  "migrations",
  "phase03_0103_manifest_start_claim_protocol.sql",
);

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

function sealedManifest(overrides?: Partial<RunManifestRecord>): RunManifestRecord {
  const allocated = buildBaseAllocatedManifest(overrides);
  const frozen = {
    ...allocated,
    lifecycle_state: "FROZEN" as const,
    frozen_at: "2026-04-26T13:10:00Z",
    ...buildFrozenBasis(allocated),
  } as unknown as RunManifestRecord;
  const { gates, evaluation } = buildSealReadyPresealEvaluation(frozen);
  return {
    ...frozen,
    lifecycle_state: "SEALED" as const,
    sealed_at: "2026-04-26T13:20:00Z",
    preseal_gate_evaluation: evaluation,
    append_only_outcome_projection: {
      ...frozen.append_only_outcome_projection!,
      gating_decisions: gates,
    },
    gating_decisions: gates,
    manifest_start_claim: buildRunManifestStartClaimContract({
      manifest_id: frozen.manifest_id,
      manifest_hash: frozen.hash_set!.manifest_hash,
      execution_basis_hash: frozen.hash_set!.execution_basis_hash,
      access_binding_hash: frozen.access_binding_hash,
      claim_state: "UNCLAIMED_SEALED",
    }),
  } as RunManifestRecord;
}

test("migration records start-claim indexes, atomicity posture, and claim-state checks", async () => {
  const sql = await readFile(migrationPath, "utf8");

  expect(sql).toContain("run_manifest_start_claim_attempt_lookup");
  expect(sql).toContain("attempt_lineage_ref");
  expect(sql).toContain("run_manifest_start_claim_prestart_or_active_check");
  expect(sql).toContain("CLAIM_AND_FIRST_PUBLICATION_COMMIT_TOGETHER");
  expect(sql).toContain("SINGLE_WRITER");
});

test("claimManifestStart commits lifecycle, lease, and first publication atomically", async () => {
  const repository = new RunManifestRepository();
  const sealed = sealedManifest({
    manifest_id: "manifest.run.claim.0103",
    idempotency_key: "idempotency://manifest.run.claim.0103",
  });
  const created = await repository.createManifest({
    manifest: sealed,
    persisted_at: "2026-04-26T13:20:00Z",
  });

  const claimed = await claimManifestStart({
    run_manifest_repository: repository,
    tenant_id: sealed.tenant_id,
    manifest_id: sealed.manifest_id,
    expected_manifest_row_version: created.manifest_row_version,
    claimed_at: "2026-04-26T13:25:00Z",
    claim_expires_at: "2026-04-26T13:55:00Z",
    claim_holder_ref: "worker://claim-integration",
    claim_token: "claim-token://claim-integration",
    first_stage_dag_ref: "stage-dag://claim-integration",
    outbox_batch_ref: "outbox-batch://claim-integration",
  });

  expect(claimed.outcome_code).toBe("CLAIM_GRANTED");
  expect(claimed.manifest.lifecycle_state).toBe("IN_PROGRESS");
  expect(claimed.manifest.opened_at).toBe("2026-04-26T13:25:00Z");
  expect(claimed.manifest_start_claim?.claim_token_or_null).toBe(
    "claim-token://claim-integration",
  );
  expect(claimed.manifest_start_claim?.stage_dag_ref_or_null).toBe(
    "stage-dag://claim-integration",
  );
  expect(claimed.manifest_start_claim?.outbox_batch_ref_or_null).toBe(
    "outbox-batch://claim-integration",
  );
  await validatePayloadAgainstSchema(
    "manifest_start_claim_contract.schema.json",
    claimed.manifest_start_claim,
  );

  const duplicate = await claimManifestStart({
    run_manifest_repository: repository,
    tenant_id: sealed.tenant_id,
    manifest_id: sealed.manifest_id,
    expected_manifest_row_version: created.manifest_row_version,
    claimed_at: "2026-04-26T13:26:00Z",
    claim_expires_at: "2026-04-26T13:56:00Z",
    claim_holder_ref: "worker://duplicate",
    claim_token: "claim-token://duplicate",
    first_stage_dag_ref: "stage-dag://duplicate",
    outbox_batch_ref: "outbox-batch://duplicate",
  });
  expect(duplicate.outcome_code).toBe("ALREADY_ACTIVE");

  const reloaded = await repository.requireManifestById(sealed.tenant_id, sealed.manifest_id);
  expect(reloaded.manifest.manifest_start_claim?.claim_token_or_null).toBe(
    "claim-token://claim-integration",
  );
  expect(await repository.listTransitions(sealed.tenant_id, sealed.manifest_id)).toHaveLength(1);
});

test("claimManifestStart rejects terminal and stale targets with typed outcomes", async () => {
  const repository = new RunManifestRepository();
  const terminalBase = sealedManifest({
    manifest_id: "manifest.run.claim-terminal.0103",
    idempotency_key: "idempotency://manifest.run.claim-terminal.0103",
  });
  const terminal = buildStartClaimAtomicPublication({
    manifest: terminalBase,
    claim_acquired_at: "2026-04-26T14:00:00Z",
    claim_expires_at: "2026-04-26T14:30:00Z",
    claim_holder_ref: "worker://terminal",
    claim_token: "claim-token://terminal",
    stage_dag_ref: "stage-dag://terminal",
    outbox_batch_ref: "outbox-batch://terminal",
  });
  await repository.createManifest({
    manifest: {
      ...terminal,
      lifecycle_state: "COMPLETED",
      completed_at: "2026-04-26T14:20:00Z",
      manifest_start_claim: {
        ...terminal.manifest_start_claim!,
        claim_state: "TERMINAL_RESULT_RECORDED",
        claim_status_code: "ALREADY_TERMINAL",
        publication_state: "PUBLISHED_TERMINAL",
        claim_released_at_or_null: "2026-04-26T14:20:00Z",
        claim_release_reason_code_or_null: "COMPLETED",
      },
    } as RunManifestRecord,
    persisted_at: "2026-04-26T14:20:00Z",
  });

  const terminalOutcome = await claimManifestStart({
    run_manifest_repository: repository,
    tenant_id: terminal.tenant_id,
    manifest_id: terminal.manifest_id,
    claimed_at: "2026-04-26T14:25:00Z",
    claim_expires_at: "2026-04-26T14:55:00Z",
    claim_holder_ref: "worker://later",
    claim_token: "claim-token://later",
    first_stage_dag_ref: "stage-dag://later",
    outbox_batch_ref: "outbox-batch://later",
  });
  expect(terminalOutcome.outcome_code).toBe("ALREADY_TERMINAL");

  const staleBase = sealedManifest({
    manifest_id: "manifest.run.claim-stale.0103",
    idempotency_key: "idempotency://manifest.run.claim-stale.0103",
  });
  const active = buildStartClaimAtomicPublication({
    manifest: staleBase,
    claim_acquired_at: "2026-04-26T15:00:00Z",
    claim_expires_at: "2026-04-26T15:10:00Z",
    claim_holder_ref: "worker://stale-original",
    claim_token: "claim-token://stale-original",
    stage_dag_ref: "stage-dag://stale",
    outbox_batch_ref: "outbox-batch://stale",
  });
  await repository.createManifest({
    manifest: {
      ...active,
      manifest_start_claim: {
        ...active.manifest_start_claim!,
        claim_state: "STALE_RECLAIM_REQUIRED",
        claim_status_code: "STALE_RECLAIM_REQUIRED",
        publication_state: "PUBLISHED_STALE_RECLAIM_REQUIRED",
        stale_reclaim_reason_code_or_null: "LEASE_EXPIRED_OWNER_UNHEALTHY",
      },
    },
    persisted_at: "2026-04-26T15:10:00Z",
  });

  const staleOutcome = await claimManifestStart({
    run_manifest_repository: repository,
    tenant_id: active.tenant_id,
    manifest_id: active.manifest_id,
    claimed_at: "2026-04-26T15:20:00Z",
    claim_expires_at: "2026-04-26T15:50:00Z",
    claim_holder_ref: "worker://claim-on-stale",
    claim_token: "claim-token://claim-on-stale",
    first_stage_dag_ref: "stage-dag://claim-on-stale",
    outbox_batch_ref: "outbox-batch://claim-on-stale",
  });
  expect(staleOutcome.outcome_code).toBe("RECOVERY_REQUIRED");
});

test("reclaimManifestStart preserves attempt lineage and rejects active leases", async () => {
  const repository = new RunManifestRepository();
  const activeBase = sealedManifest({
    manifest_id: "manifest.run.reclaim-active.0103",
    idempotency_key: "idempotency://manifest.run.reclaim-active.0103",
  });
  const active = buildStartClaimAtomicPublication({
    manifest: activeBase,
    claim_acquired_at: "2026-04-26T16:00:00Z",
    claim_expires_at: "2026-04-26T16:30:00Z",
    claim_holder_ref: "worker://active-original",
    claim_token: "claim-token://active-original",
    stage_dag_ref: "stage-dag://active",
    outbox_batch_ref: "outbox-batch://active",
  });
  await repository.createManifest({
    manifest: active,
    persisted_at: "2026-04-26T16:00:00Z",
  });

  const rejected = await reclaimManifestStart({
    run_manifest_repository: repository,
    tenant_id: active.tenant_id,
    manifest_id: active.manifest_id,
    reclaimed_at: "2026-04-26T16:05:00Z",
    claim_expires_at: "2026-04-26T16:35:00Z",
    claim_holder_ref: "worker://too-early",
    claim_token: "claim-token://too-early",
    stale_reclaim_evidence_ref: "reclaim-evidence://too-early",
  });
  expect(rejected.outcome_code).toBe("RECLAIM_REJECTED_ACTIVE_LEASE");

  const staleBase = sealedManifest({
    manifest_id: "manifest.run.reclaim-stale.0103",
    idempotency_key: "idempotency://manifest.run.reclaim-stale.0103",
  });
  const staleActive = buildStartClaimAtomicPublication({
    manifest: staleBase,
    claim_acquired_at: "2026-04-26T17:00:00Z",
    claim_expires_at: "2026-04-26T17:10:00Z",
    claim_holder_ref: "worker://stale-original",
    claim_token: "claim-token://stale-original",
    stage_dag_ref: "stage-dag://reclaim-stale",
    outbox_batch_ref: "outbox-batch://reclaim-stale",
  });
  const stale = {
    ...staleActive,
    manifest_start_claim: {
      ...staleActive.manifest_start_claim!,
      claim_state: "STALE_RECLAIM_REQUIRED" as const,
      claim_status_code: "STALE_RECLAIM_REQUIRED" as const,
      publication_state: "PUBLISHED_STALE_RECLAIM_REQUIRED" as const,
      stale_reclaim_reason_code_or_null: "LEASE_EXPIRED_OWNER_UNHEALTHY" as const,
    },
  } as RunManifestRecord;
  await repository.createManifest({
    manifest: stale,
    persisted_at: "2026-04-26T17:10:00Z",
  });

  const reclaimed = await reclaimManifestStart({
    run_manifest_repository: repository,
    tenant_id: stale.tenant_id,
    manifest_id: stale.manifest_id,
    reclaimed_at: "2026-04-26T17:20:00Z",
    claim_expires_at: "2026-04-26T17:50:00Z",
    claim_holder_ref: "worker://successor",
    claim_token: "claim-token://successor",
    stale_reclaim_evidence_ref: "reclaim-evidence://stale-successor",
  });

  expect(reclaimed.outcome_code).toBe("RECLAIM_GRANTED");
  expect(reclaimed.manifest_start_claim?.attempt_lineage_ref).toBe(
    stale.manifest_start_claim!.attempt_lineage_ref,
  );
  expect(reclaimed.manifest_start_claim?.first_publication_committed_at_or_null).toBe(
    "2026-04-26T17:00:00Z",
  );
  expect(reclaimed.manifest_start_claim?.claim_holder_ref_or_null).toBe("worker://successor");
  await validatePayloadAgainstSchema(
    "manifest_start_claim_contract.schema.json",
    reclaimed.manifest_start_claim,
  );
});

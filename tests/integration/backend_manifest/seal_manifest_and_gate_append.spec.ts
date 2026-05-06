import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  AppendManifestGatesError,
  RunManifestRepository,
  TransitionManifestService,
  appendManifestGates,
  assertPresealGateChain,
  buildRunManifestGateDecisionRecord,
  sealManifest,
  type RunManifestGateDecisionRecord,
  type RunManifestRecord,
} from "../../../packages/backend-manifest/src/index.ts";
import {
  buildBaseAllocatedManifest,
  buildFrozenBasis,
  buildPresealPassGates,
} from "../../fixtures/run_manifest_fixture.ts";

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

async function createFrozenManifest(input: {
  manifest_id: string;
  repository: RunManifestRepository;
}) {
  const transitionService = new TransitionManifestService({
    runManifestRepository: input.repository,
  });
  const allocated = buildBaseAllocatedManifest({
    manifest_id: input.manifest_id,
    idempotency_key: `idempotency://${input.manifest_id}`,
  });
  const frozenBasis = buildFrozenBasis(allocated) as unknown as Partial<RunManifestRecord>;
  const created = await input.repository.createManifest({
    manifest: allocated,
    persisted_at: "2026-04-27T13:00:00Z",
  });
  return transitionService.transition({
    tenant_id: allocated.tenant_id,
    manifest_id: allocated.manifest_id,
    expected_manifest_row_version: created.manifest_row_version,
    event_code: "freeze_success",
    persisted_at: "2026-04-27T13:10:00Z",
    transition_audit_ref: `audit://${allocated.manifest_id}/freeze-success`,
    transition_reason_code: "FREEZE_SUCCESS",
    mutate: (manifest) =>
      ({
        ...manifest,
        frozen_at: "2026-04-27T13:10:00Z",
        ...frozenBasis,
      }) as RunManifestRecord,
  });
}

function blockedGate(
  manifest: RunManifestRecord,
  priorGates: RunManifestGateDecisionRecord[],
) {
  return buildRunManifestGateDecisionRecord({
    manifest_id: manifest.manifest_id,
    gate_code: "DATA_QUALITY_GATE",
    gate_stage_index: 4,
    effective_scope: manifest.access_decision?.effective_scope ?? manifest.requested_scope,
    decision: "HARD_BLOCK",
    reason_codes: ["DATA_QUALITY_HARD_BLOCK"],
    prerequisite_gate_refs: priorGates.map((gate) => gate.gate_decision_id),
    decided_at: "2026-04-27T13:15:00Z",
  });
}

test("sealManifest persists ready preseal tape and transitions atomically", async () => {
  const repository = new RunManifestRepository();
  const frozen = await createFrozenManifest({
    repository,
    manifest_id: "manifest.run.seal-ready.0105",
  });
  const gates = buildPresealPassGates(frozen.manifest);

  const sealed = await sealManifest({
    run_manifest_repository: repository,
    tenant_id: frozen.manifest.tenant_id,
    manifest_id: frozen.manifest.manifest_id,
    expected_manifest_row_version: frozen.manifest_row_version,
    sealed_at: "2026-04-27T13:20:00Z",
    gate_records: gates,
  });

  expect(sealed.outcome_code).toBe("SEALED");
  expect(sealed.manifest.lifecycle_state).toBe("SEALED");
  expect(sealed.manifest.manifest_start_claim?.claim_state).toBe("UNCLAIMED_SEALED");
  expect(sealed.manifest.preseal_gate_evaluation!.ordered_gate_decision_ids).toEqual(
    gates.map((gate) => gate.gate_decision_id),
  );
  await validatePayloadAgainstSchema(
    "preseal_gate_evaluation_contract.schema.json",
    sealed.manifest.preseal_gate_evaluation,
  );
  await validatePayloadAgainstSchema("gate_decision_record.schema.json", gates[0]);
  await validatePayloadAgainstSchema("run_manifest.schema.json", sealed.manifest);
  expect(await repository.listTransitions(sealed.manifest.tenant_id, sealed.manifest.manifest_id)).toHaveLength(
    2,
  );
});

test("blocked prestart gate tape persists without sealing", async () => {
  const repository = new RunManifestRepository();
  const frozen = await createFrozenManifest({
    repository,
    manifest_id: "manifest.run.seal-blocked.0105",
  });
  const passPrefix = buildPresealPassGates(frozen.manifest).slice(0, 3);
  const gates = [...passPrefix, blockedGate(frozen.manifest, passPrefix)];

  const blocked = await sealManifest({
    run_manifest_repository: repository,
    tenant_id: frozen.manifest.tenant_id,
    manifest_id: frozen.manifest.manifest_id,
    expected_manifest_row_version: frozen.manifest_row_version,
    sealed_at: "2026-04-27T13:25:00Z",
    gate_records: gates,
  });

  expect(blocked.outcome_code).toBe("BLOCKED_PRESTART");
  expect(blocked.manifest.lifecycle_state).toBe("BLOCKED");
  expect(blocked.manifest.sealed_at).toBeNull();
  expect(blocked.manifest.preseal_gate_evaluation!.completion_state).toBe(
    "COMPLETE_BLOCKED_PRESTART",
  );
  expect(blocked.manifest.preseal_gate_evaluation!.blocking_gate_codes).toEqual([
    "DATA_QUALITY_GATE",
  ]);
  await validatePayloadAgainstSchema(
    "preseal_gate_evaluation_contract.schema.json",
    blocked.manifest.preseal_gate_evaluation,
  );
  await validatePayloadAgainstSchema("run_manifest.schema.json", blocked.manifest);
});

test("persisted preseal tape reloads and later append cannot rewrite prefix", async () => {
  const repository = new RunManifestRepository();
  const frozen = await createFrozenManifest({
    repository,
    manifest_id: "manifest.run.seal-append.0105",
  });
  const sealed = await sealManifest({
    run_manifest_repository: repository,
    tenant_id: frozen.manifest.tenant_id,
    manifest_id: frozen.manifest.manifest_id,
    expected_manifest_row_version: frozen.manifest_row_version,
    sealed_at: "2026-04-27T13:30:00Z",
    gate_records: buildPresealPassGates(frozen.manifest),
  });
  const reloaded = await repository.requireManifestById(
    sealed.manifest.tenant_id,
    sealed.manifest.manifest_id,
  );
  assertPresealGateChain({
    manifest: reloaded.manifest,
    gate_records: reloaded.manifest.gating_decisions,
    evaluation: reloaded.manifest.preseal_gate_evaluation!,
  });

  const postSealGate = buildRunManifestGateDecisionRecord({
    manifest_id: reloaded.manifest.manifest_id,
    gate_code: "TRUST_GATE",
    gate_stage_index: 5,
    effective_scope:
      reloaded.manifest.access_decision?.effective_scope ?? reloaded.manifest.requested_scope,
    decision: "PASS_WITH_NOTICE",
    reason_codes: ["TRUST_NOTICE_RETAINED"],
    decided_at: "2026-04-27T13:35:00Z",
  });
  const appended = appendManifestGates({
    manifest: reloaded.manifest,
    gate_records: [postSealGate],
  });
  const storedAppend = await repository.compareAndSwapManifest({
    expected_manifest_row_version: reloaded.manifest_row_version,
    next_manifest: appended,
    persisted_at: "2026-04-27T13:35:00Z",
  });
  expect(storedAppend.manifest.gating_decisions).toHaveLength(5);

  expect(() =>
    appendManifestGates({
      manifest: storedAppend.manifest,
      gate_records: [
        {
          ...storedAppend.manifest.gating_decisions[0]!,
          decision: "PASS_WITH_NOTICE",
          reason_codes: ["PRESEAL_PREFIX_REWRITE"],
        },
      ],
    }),
  ).toThrow(AppendManifestGatesError);
});

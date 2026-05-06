import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  type RunManifestGateDecisionRecord,
  type RunManifestRecord,
} from "../models/run_manifest.ts";
import type { RunManifestRepository } from "../repositories/run_manifest_repository.ts";
import {
  applyRunManifestTransitionDefaults,
  validateRunManifestTransition,
} from "../state/manifest_transition_validator.ts";
import type { SealManifestOutcome } from "../types/preseal_gate_result.ts";
import { persistGateBatch } from "./persist_gate_batch.ts";
import { assertPresealGateChain } from "./preseal_gate_chain_validator.ts";
import { assertSealReadiness } from "./seal_readiness_validator.ts";

export type SealManifestErrorCode =
  | "SEAL_MANIFEST_ALREADY_STARTED"
  | "SEAL_MANIFEST_NOT_FROZEN"
  | "SEAL_MANIFEST_PENDING_PREREQUISITES";

export class SealManifestError extends Error {
  readonly code: SealManifestErrorCode;

  constructor(code: SealManifestErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SealManifestError";
    this.code = code;
  }
}

function assertSealTarget(manifest: RunManifestRecord) {
  if (manifest.lifecycle_state === "SEALED" || manifest.opened_at !== null) {
    throw new SealManifestError(
      "SEAL_MANIFEST_ALREADY_STARTED",
      "sealed or post-start manifests cannot be sealed again",
    );
  }
  if (manifest.lifecycle_state !== "FROZEN") {
    throw new SealManifestError(
      "SEAL_MANIFEST_NOT_FROZEN",
      "seal requires lifecycle_state FROZEN",
    );
  }
}

function buildGatePersistence(input: {
  gate_records?: RunManifestGateDecisionRecord[];
  manifest: RunManifestRecord;
}) {
  if (input.gate_records !== undefined) {
    return persistGateBatch({
      manifest: input.manifest,
      gate_records: input.gate_records,
      batch_kind: "PRESEAL",
    });
  }
  if (
    input.manifest.preseal_gate_evaluation?.completion_state !== "PENDING_PREREQUISITES" &&
    input.manifest.preseal_gate_evaluation != null
  ) {
    assertPresealGateChain({
      manifest: input.manifest,
      gate_records: input.manifest.gating_decisions,
      evaluation: input.manifest.preseal_gate_evaluation,
    });
    return {
      manifest: input.manifest,
      preseal_gate_evaluation: input.manifest.preseal_gate_evaluation,
      completion_state: input.manifest.preseal_gate_evaluation.completion_state,
      gate_records: input.manifest.gating_decisions.slice(0, 4),
      blocking_gate_codes: input.manifest.preseal_gate_evaluation.blocking_gate_codes,
      missing_prerequisite_refs: input.manifest.preseal_gate_evaluation.missing_prerequisite_refs,
      persisted_gate_refs: input.manifest.preseal_gate_evaluation.ordered_gate_decision_ids,
      reason_codes: ["PRESEAL_PERSISTED_TAPE_REUSED"],
    };
  }
  return persistGateBatch({
    manifest: input.manifest,
    gate_records: [],
    batch_kind: "PRESEAL",
  });
}

export async function sealManifest(input: {
  expected_manifest_row_version?: number;
  gate_records?: RunManifestGateDecisionRecord[];
  manifest_id: string;
  run_manifest_repository: RunManifestRepository;
  sealed_at: string;
  tenant_id: string;
  transition_audit_ref?: string;
  transition_reason_code?: string;
}): Promise<SealManifestOutcome> {
  const stored = await input.run_manifest_repository.requireManifestById(
    input.tenant_id,
    input.manifest_id,
  );
  assertSealTarget(stored.manifest);

  const persistedAt = normalizeUtcInstantString(input.sealed_at);
  const gatePersistenceInput: Parameters<typeof buildGatePersistence>[0] = {
    manifest: stored.manifest,
  };
  if (input.gate_records !== undefined) {
    gatePersistenceInput.gate_records = input.gate_records;
  }
  const gatePersistence = buildGatePersistence(gatePersistenceInput);

  if (gatePersistence.completion_state === "PENDING_PREREQUISITES") {
    throw new SealManifestError(
      "SEAL_MANIFEST_PENDING_PREREQUISITES",
      "pending pre-seal prerequisites cannot transition to SEALED",
    );
  }

  const eventCode =
    gatePersistence.completion_state === "COMPLETE_BLOCKED_PRESTART"
      ? "seal_blocked"
      : "seal_success";
  const nextManifest: RunManifestRecord = {
    ...structuredClone(gatePersistence.manifest),
    sealed_at:
      gatePersistence.completion_state === "COMPLETE_READY_TO_SEAL" ? persistedAt : null,
  };

  if (eventCode === "seal_success") {
    assertSealReadiness(gatePersistence.manifest);
  }
  applyRunManifestTransitionDefaults({
    current_manifest: stored.manifest,
    event_code: eventCode,
    transition_applied_at: persistedAt,
    transition_audit_ref:
      input.transition_audit_ref ?? `audit://${stored.manifest.manifest_id}/${eventCode}`,
    next_manifest: nextManifest,
  });
  validateRunManifestTransition({
    current_manifest: stored.manifest,
    event_code: eventCode,
    next_manifest: nextManifest,
  });

  const updated = await input.run_manifest_repository.compareAndSwapManifest({
    expected_manifest_row_version:
      input.expected_manifest_row_version ?? stored.manifest_row_version,
    next_manifest: nextManifest,
    persisted_at: persistedAt,
    transition: {
      event_code: eventCode,
      from_lifecycle_state: stored.manifest.lifecycle_state,
      to_lifecycle_state: nextManifest.lifecycle_state,
      transition_audit_ref:
        input.transition_audit_ref ?? `audit://${stored.manifest.manifest_id}/${eventCode}`,
      transition_reason_code:
        input.transition_reason_code ??
        (eventCode === "seal_success" ? "SEAL_SUCCESS" : "SEAL_BLOCKED_PRESTART"),
      transitioned_at: persistedAt,
    },
  });

  return {
    outcome_code: eventCode === "seal_success" ? "SEALED" : "BLOCKED_PRESTART",
    manifest: updated.manifest,
    stored_manifest: updated,
    preseal_gate_evaluation: updated.manifest.preseal_gate_evaluation!,
    gate_records: gatePersistence.gate_records,
    reason_codes: gatePersistence.reason_codes,
  };
}

export class SealManifestService {
  constructor(
    private readonly dependencies: {
      runManifestRepository: RunManifestRepository;
    },
  ) {}

  async seal(input: Omit<Parameters<typeof sealManifest>[0], "run_manifest_repository">) {
    return sealManifest({
      ...input,
      run_manifest_repository: this.dependencies.runManifestRepository,
    });
  }
}

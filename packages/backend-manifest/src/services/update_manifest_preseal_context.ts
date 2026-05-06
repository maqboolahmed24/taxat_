import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import type { ScopeExecutionBindingRecord } from "../../../backend-access/src/models/scope_execution_binding.ts";
import type { RunManifestAccessDecision } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import {
  normalizeRunManifestRecord,
  type RunManifestRecord,
  type RunManifestScopeExecutionBinding,
} from "../models/run_manifest.ts";
import type { RunManifestRepository } from "../repositories/run_manifest_repository.ts";
import type {
  PresealContextPatch,
  PresealContextPatchResult,
  RuntimeAccessDecisionInput,
} from "../types/preseal_context_patch.ts";
import { validateRunManifestMirrorConsistency } from "./manifest_mirror_consistency_validator.ts";
import { synchronizeManifestOutcomeProjectionMirrors } from "./output_ref_projection_normalizer.ts";
import { buildFrozenExecutionBinding } from "./build_frozen_execution_binding.ts";
import { materializeScopeExecutionBinding } from "./materialize_scope_execution_binding.ts";
import { syncManifestPresealMirrors } from "./sync_manifest_preseal_mirrors.ts";
import { assertManifestLineageProjection } from "./validate_manifest_lineage_projection.ts";

export type UpdateManifestPresealContextErrorCode =
  | "PRESEAL_ACCESS_BOUNDARY_NOT_RUNNABLE"
  | "PRESEAL_CONTEXT_ACCESS_BINDING_HASH_MISMATCH"
  | "PRESEAL_CONTEXT_PARTIAL_FREEZE_PATCH"
  | "PRESEAL_CONTEXT_PATCH_SEALED";

export class UpdateManifestPresealContextError extends Error {
  readonly code: UpdateManifestPresealContextErrorCode;
  readonly reason_codes: string[];

  constructor(
    code: UpdateManifestPresealContextErrorCode,
    detail: string,
    reasonCodes: string[] = [],
  ) {
    super(`${code}: ${detail}`);
    this.name = "UpdateManifestPresealContextError";
    this.code = code;
    this.reason_codes = [...reasonCodes];
  }
}

function assertPresealMutable(manifest: RunManifestRecord) {
  if (
    manifest.sealed_at !== null ||
    ["SEALED", "IN_PROGRESS", "COMPLETED", "FAILED", "SUPERSEDED", "REPLAY_ONLY", "RETIRED"].includes(
      manifest.lifecycle_state,
    )
  ) {
    throw new UpdateManifestPresealContextError(
      "PRESEAL_CONTEXT_PATCH_SEALED",
      "sealed or post-start manifests cannot rewrite config/input/scope/access/frozen pre-seal fields",
    );
  }
}

function isRuntimeAccessDecisionInput(
  value: PresealContextPatch["access_decision"],
): value is RuntimeAccessDecisionInput {
  return value != null && "authorization_decision_access_binding_hash" in value;
}

function normalizeManifestAccessDecision(
  accessDecision: RunManifestAccessDecision,
): RunManifestAccessDecision {
  return {
    decision: accessDecision.decision,
    effective_scope: [...accessDecision.effective_scope],
    masking_rules: [...accessDecision.masking_rules].sort((left, right) => left.localeCompare(right)),
    reason_codes: [...accessDecision.reason_codes].sort((left, right) => left.localeCompare(right)),
    required_approvals: [...accessDecision.required_approvals].sort((left, right) =>
      left.localeCompare(right),
    ),
    required_authn_level: null,
  };
}

function normalizeRunManifestScopeBinding(
  input: ScopeExecutionBindingRecord & { binding_scope_class: "RUN_MANIFEST" },
): RunManifestScopeExecutionBinding {
  if (input.binding_scope_class !== "RUN_MANIFEST") {
    throw new UpdateManifestPresealContextError(
      "PRESEAL_CONTEXT_ACCESS_BINDING_HASH_MISMATCH",
      "pre-seal manifest scope bindings must use RUN_MANIFEST binding_scope_class",
    );
  }
  return structuredClone(input) as RunManifestScopeExecutionBinding;
}

function assertAccessBindingHashMatches(manifest: RunManifestRecord) {
  if (manifest.scope_execution_binding.access_binding_hash !== manifest.access_binding_hash) {
    throw new UpdateManifestPresealContextError(
      "PRESEAL_CONTEXT_ACCESS_BINDING_HASH_MISMATCH",
      "scope_execution_binding.access_binding_hash must mirror manifest.access_binding_hash",
    );
  }
}

function applyAccessAndScopePatch(input: {
  manifest: RunManifestRecord;
  patch: PresealContextPatch;
  patched_fields: string[];
}): RunManifestRecord {
  let nextManifest = structuredClone(input.manifest);
  if (input.patch.access_decision !== undefined) {
    if (isRuntimeAccessDecisionInput(input.patch.access_decision)) {
      const materialized = materializeScopeExecutionBinding({
        requested_scope: nextManifest.requested_scope,
        mode: nextManifest.mode,
        access_decision: {
          ...input.patch.access_decision,
          access_binding_hash:
            input.patch.access_decision.access_binding_hash ?? nextManifest.access_binding_hash,
        },
      });
      if (materialized.status === "PRESTART_BOUNDARY") {
        throw new UpdateManifestPresealContextError(
          "PRESEAL_ACCESS_BOUNDARY_NOT_RUNNABLE",
          `${materialized.boundary_decision} must be resolved before pre-seal execution binding`,
          materialized.reason_codes,
        );
      }
      nextManifest.access_decision = materialized.access_decision;
      nextManifest.scope_execution_binding = materialized.scope_execution_binding;
      input.patched_fields.push("access_decision", "scope_execution_binding");
    } else {
      nextManifest.access_decision = normalizeManifestAccessDecision(input.patch.access_decision);
      input.patched_fields.push("access_decision");
    }
  }
  if (input.patch.scope_execution_binding !== undefined && input.patch.scope_execution_binding !== null) {
    nextManifest.scope_execution_binding = normalizeRunManifestScopeBinding(input.patch.scope_execution_binding);
    input.patched_fields.push("scope_execution_binding");
  }
  assertAccessBindingHashMatches(nextManifest);
  return nextManifest;
}

export function applyManifestPresealContextPatch(input: {
  manifest: RunManifestRecord;
  patch: PresealContextPatch;
}): PresealContextPatchResult {
  assertPresealMutable(input.manifest);
  const patchedFields: string[] = [];
  let nextManifest = syncManifestPresealMirrors({
    manifest: input.manifest,
    continuation_set_patch: input.patch.continuation_set_patch,
  });
  if (input.patch.continuation_set_patch !== undefined) {
    patchedFields.push("continuation_set", "manifest_branch_decision");
  }

  nextManifest = applyAccessAndScopePatch({
    manifest: nextManifest,
    patch: input.patch,
    patched_fields: patchedFields,
  });

  const nextConfigFreeze = input.patch.config_freeze ?? nextManifest.config_freeze ?? null;
  const nextInputFreeze = input.patch.input_freeze ?? nextManifest.input_freeze ?? null;
  const freezePatchPresent =
    input.patch.config_freeze !== undefined || input.patch.input_freeze !== undefined;
  if (freezePatchPresent && (nextConfigFreeze === null || nextInputFreeze === null)) {
    throw new UpdateManifestPresealContextError(
      "PRESEAL_CONTEXT_PARTIAL_FREEZE_PATCH",
      "config_freeze and input_freeze must be patched together before publishing a frozen execution binding",
    );
  }

  if (nextConfigFreeze !== null && nextInputFreeze !== null) {
    const frozen = buildFrozenExecutionBinding({
      manifest: nextManifest,
      config_freeze: nextConfigFreeze,
      input_freeze: nextInputFreeze,
      scope_execution_binding: nextManifest.scope_execution_binding,
      access_decision_effective_scope: nextManifest.access_decision?.effective_scope,
    });
    nextManifest = {
      ...nextManifest,
      config_freeze: nextConfigFreeze,
      input_freeze: nextInputFreeze,
      hash_set: frozen.hash_set,
      frozen_execution_binding: frozen.frozen_execution_binding,
      append_only_outcome_projection:
        nextManifest.append_only_outcome_projection ?? frozen.append_only_outcome_projection,
    };
    patchedFields.push("config_freeze", "input_freeze", "hash_set", "frozen_execution_binding");
  }

  if (input.patch.preseal_gate_evaluation !== undefined) {
    nextManifest.preseal_gate_evaluation = input.patch.preseal_gate_evaluation;
    patchedFields.push("preseal_gate_evaluation");
  }

  const normalized = validateRunManifestMirrorConsistency(
    synchronizeManifestOutcomeProjectionMirrors(normalizeRunManifestRecord(assertManifestLineageProjection(nextManifest))),
  );
  return {
    manifest: normalized,
    patched_fields: [...new Set(patchedFields)].sort((left, right) => left.localeCompare(right)),
  };
}

export async function updateManifestPresealContext(input: {
  expected_manifest_row_version: number;
  manifest_id: string;
  patch: PresealContextPatch;
  persisted_at: string;
  run_manifest_repository: RunManifestRepository;
  tenant_id: string;
}) {
  const stored = await input.run_manifest_repository.requireManifestById(
    input.tenant_id,
    input.manifest_id,
  );
  const patched = applyManifestPresealContextPatch({
    manifest: stored.manifest,
    patch: input.patch,
  });
  const persistedAt = normalizeUtcInstantString(input.persisted_at);
  const updated = await input.run_manifest_repository.compareAndSwapManifest({
    expected_manifest_row_version: input.expected_manifest_row_version,
    next_manifest: patched.manifest,
    persisted_at: persistedAt,
  });
  return {
    ...patched,
    stored_manifest: updated,
  };
}

export class UpdateManifestPresealContextService {
  constructor(
    private readonly dependencies: {
      runManifestRepository: RunManifestRepository;
    },
  ) {}

  async update(input: Omit<Parameters<typeof updateManifestPresealContext>[0], "run_manifest_repository">) {
    return updateManifestPresealContext({
      ...input,
      run_manifest_repository: this.dependencies.runManifestRepository,
    });
  }
}

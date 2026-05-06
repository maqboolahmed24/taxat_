import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";

import type { RunManifestRecord, RunManifestTransitionEventCode } from "../models/run_manifest.ts";
import type { RunManifestRepository } from "../repositories/run_manifest_repository.ts";
import {
  applyRunManifestTransitionDefaults,
  validateRunManifestTransition,
} from "../state/manifest_transition_validator.ts";
import { synchronizeManifestOutcomeProjectionMirrors } from "./output_ref_projection_normalizer.ts";

export class TransitionManifestService {
  constructor(
    private readonly dependencies: {
      runManifestRepository: RunManifestRepository;
    },
  ) {}

  async transition(input: {
    expected_manifest_row_version: number;
    event_code: RunManifestTransitionEventCode;
    manifest_id: string;
    mutate: (manifest: RunManifestRecord) => RunManifestRecord;
    persisted_at: string;
    tenant_id: string;
    transition_audit_ref: string;
    transition_reason_code: string;
  }) {
    const existing = await this.dependencies.runManifestRepository.requireManifestById(
      input.tenant_id,
      input.manifest_id,
    );
    const nextManifest = input.mutate(structuredClone(existing.manifest));
    applyRunManifestTransitionDefaults({
      current_manifest: existing.manifest,
      event_code: input.event_code,
      transition_applied_at: input.persisted_at,
      transition_audit_ref: input.transition_audit_ref,
      next_manifest: nextManifest,
    });
    const synchronizedManifest = synchronizeManifestOutcomeProjectionMirrors(nextManifest);
    validateRunManifestTransition({
      current_manifest: existing.manifest,
      event_code: input.event_code,
      next_manifest: synchronizedManifest,
    });

    return this.dependencies.runManifestRepository.compareAndSwapManifest({
      expected_manifest_row_version: input.expected_manifest_row_version,
      next_manifest: synchronizedManifest,
      persisted_at: normalizeUtcInstantString(input.persisted_at),
      transition: {
        event_code: input.event_code,
        from_lifecycle_state: existing.manifest.lifecycle_state,
        to_lifecycle_state: synchronizedManifest.lifecycle_state,
        transition_audit_ref: input.transition_audit_ref,
        transition_reason_code: input.transition_reason_code,
        transitioned_at: normalizeUtcInstantString(input.persisted_at),
      },
    });
  }
}

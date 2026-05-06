import {
  buildRunManifestPresealGateEvaluation,
  markManifestStartClaimTerminal,
  TransitionManifestService,
  type RunManifestRecord,
  type RunManifestRepository,
  type RunManifestTransitionEventCode,
} from "../../../backend-manifest/src/index.ts";
import {
  buildDecisionBundleRecord,
  type DecisionBundleBuildInput,
  type DecisionBundleRecord,
} from "../models/decision_bundle.ts";
import { DecisionBundleRepository } from "../repositories/decision_bundle_repository.ts";
import type { GateDecisionRecord } from "../models/gate_decision_record.ts";
import {
  persistDecisionBundle,
  type PersistDecisionBundleResult,
} from "./persist_decision_bundle.ts";
import { reloadTerminalBundleForSameRequestRetry } from "./reload_terminal_bundle_for_same_request_retry.ts";
import { synchronizeManifestTerminalProjection } from "./synchronize_manifest_terminal_projection.ts";

export type FinalizeTerminalOutcomeResult = PersistDecisionBundleResult & {
  manifest_transition_event_code: RunManifestTransitionEventCode | null;
  reloaded_existing_bundle: boolean;
};

function deriveTransitionEvent(input: {
  current_manifest: RunManifestRecord;
  decision_bundle: DecisionBundleRecord;
  pre_start_blocked?: boolean;
}): RunManifestTransitionEventCode {
  if (input.pre_start_blocked) {
    return "seal_blocked";
  }
  if (input.decision_bundle.decision_status === "BLOCKED") {
    return "gate_block";
  }
  return "run_completed";
}

function releaseReasonForBundle(bundle: DecisionBundleRecord) {
  return bundle.decision_status === "BLOCKED" ? "BLOCKED" : "COMPLETED";
}

export async function finalizeTerminalOutcome(input: {
  audit_refs?: readonly string[];
  decision_bundle?: DecisionBundleRecord;
  decision_bundle_input?: DecisionBundleBuildInput;
  drift_refs?: readonly string[];
  expected_manifest_row_version?: number;
  gate_records?: readonly GateDecisionRecord[];
  manifest?: RunManifestRecord | null;
  pre_start_blocked?: boolean;
  repository: DecisionBundleRepository;
  run_manifest_repository?: RunManifestRepository;
  tenant_id?: string;
  transition_audit_ref?: string;
}) {
  const decisionBundle =
    input.decision_bundle ??
    buildDecisionBundleRecord({
      ...(input.decision_bundle_input ?? {}),
      gate_records: input.gate_records,
    });
  const persistResult = await persistDecisionBundle({
    audit_refs: input.audit_refs,
    decision_bundle: decisionBundle,
    drift_refs: input.drift_refs,
    gate_records: input.gate_records,
    manifest: input.manifest,
    pre_start_blocked: input.pre_start_blocked,
    repository: input.repository,
  });

  if (!input.run_manifest_repository) {
    return {
      ...persistResult,
      manifest_transition_event_code: null,
      reloaded_existing_bundle: false,
    } satisfies FinalizeTerminalOutcomeResult;
  }

  const tenantId =
    input.tenant_id ?? input.manifest?.tenant_id ?? persistResult.manifest?.tenant_id;
  if (tenantId == null) {
    throw new Error("finalize_terminal_outcome requires tenant_id when updating manifest repository");
  }
  const existing = await input.run_manifest_repository.requireManifestById(
    tenantId,
    decisionBundle.manifest_id,
  );
  if (
    ["COMPLETED", "BLOCKED", "FAILED", "SUPERSEDED", "REPLAY_ONLY", "RETIRED"].includes(
      existing.manifest.lifecycle_state,
    ) &&
    existing.manifest.decision_bundle_hash === persistResult.decision_bundle_hash
  ) {
    await reloadTerminalBundleForSameRequestRetry({
      manifest: existing.manifest,
      repository: input.repository,
    });
    return {
      ...persistResult,
      manifest: existing.manifest,
      manifest_transition_event_code: null,
      reloaded_existing_bundle: true,
    } satisfies FinalizeTerminalOutcomeResult;
  }

  const eventCode = deriveTransitionEvent({
    current_manifest: existing.manifest,
    decision_bundle: decisionBundle,
    pre_start_blocked: input.pre_start_blocked,
  });
  const transitionService = new TransitionManifestService({
    runManifestRepository: input.run_manifest_repository,
  });
  const transitionAuditRef =
    input.transition_audit_ref ?? `audit://${decisionBundle.manifest_id}/decision-bundle-finalized`;
  const transitioned = await transitionService.transition({
    expected_manifest_row_version:
      input.expected_manifest_row_version ?? existing.manifest_row_version,
    event_code: eventCode,
    manifest_id: decisionBundle.manifest_id,
    persisted_at: decisionBundle.persisted_at,
    tenant_id: tenantId,
    transition_audit_ref: transitionAuditRef,
    transition_reason_code: decisionBundle.dominant_reason_code,
    mutate: (manifest) => {
      const synchronized = synchronizeManifestTerminalProjection({
        audit_refs: [...(input.audit_refs ?? []), transitionAuditRef],
        decision_bundle: decisionBundle,
        decision_bundle_hash: persistResult.decision_bundle_hash,
        deterministic_outcome_hash: persistResult.deterministic_outcome_hash,
        drift_refs: input.drift_refs,
        gate_records: input.gate_records,
        manifest,
      });
      if (eventCode === "seal_blocked") {
        return {
          ...synchronized,
          opened_at: null,
          preseal_gate_evaluation: buildRunManifestPresealGateEvaluation({
            access_binding_hash: synchronized.access_binding_hash,
            authorized_scope:
              synchronized.access_decision?.effective_scope ??
              synchronized.scope_execution_binding.executable_scope,
            blocking_gate_codes: ["MANIFEST_GATE"],
            completion_state: "COMPLETE_BLOCKED_PRESTART",
            execution_basis_hash:
              synchronized.hash_set?.execution_basis_hash ?? "hash.execution_basis.missing",
            manifest_id: synchronized.manifest_id,
            ordered_gate_decision_ids: [],
          }),
        };
      }
      const terminal = markManifestStartClaimTerminal({
        manifest: synchronized,
        release_reason_code: releaseReasonForBundle(decisionBundle),
        released_at: decisionBundle.persisted_at,
      });
      return {
        ...terminal,
        completed_at:
          eventCode === "run_completed" ? decisionBundle.persisted_at : terminal.completed_at,
      };
    },
  });

  return {
    ...persistResult,
    manifest: transitioned.manifest,
    manifest_transition_event_code: eventCode,
    reloaded_existing_bundle: false,
  } satisfies FinalizeTerminalOutcomeResult;
}

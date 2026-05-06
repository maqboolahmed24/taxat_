import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  createExperienceCursor,
  expireStreamCursorIfNeeded,
  transitionStreamCursor,
} from "../../../packages/domain-kernel/src/streaming/cursor_store.ts";
import { assessStreamResume } from "../../../packages/domain-kernel/src/streaming/rebase_decider.ts";
import {
  advanceSequenceWindow,
  openSequenceWindow,
} from "../../../packages/domain-kernel/src/streaming/sequence_window.ts";
import {
  createStreamRecoveryContract,
  hashTransportResumeToken,
} from "../../../packages/domain-kernel/src/streaming/stream_recovery.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function workspaceContract(overrides = {}) {
  return createStreamRecoveryContract({
    access_binding_hash: "access-binding-hash-42",
    compaction_floor_sequence_or_null: 12,
    delivery_window_state: "LIVE_RESUMABLE",
    frame_epoch: 3,
    last_published_sequence: 21,
    masking_context_hash: "masking-hash-42",
    publication_generation: 8,
    rebase_reason_code_or_null: null,
    resume_binding_ref_or_null: "resume-token-42",
    resume_binding_representation: "RAW_TOKEN",
    route_key: "workspace-route-item-42",
    session_binding_hash: "session-binding-hash-42",
    session_ref: "session-42",
    shell_stability_token: "shell-token-42",
    stream_scope_class: "WORKSPACE",
    subject_ref: "item-42",
    ...overrides,
  });
}

function experienceContract(overrides = {}) {
  return createStreamRecoveryContract({
    access_binding_hash: "access-binding.experience.42",
    compaction_floor_sequence_or_null: 18,
    delivery_window_state: "LIVE_RESUMABLE",
    frame_epoch: 3,
    last_published_sequence: 20,
    masking_context_hash: "masking.experience.42",
    publication_generation: 8,
    rebase_reason_code_or_null: null,
    resume_binding_ref_or_null: hashTransportResumeToken("resume.experience.42"),
    resume_binding_representation: "HASHED_TOKEN",
    route_key: "manifest-route-42",
    session_binding_hash: "session-binding.experience.42",
    session_ref: "session.experience.42",
    shell_stability_token: "shell.experience.42",
    stream_scope_class: "MANIFEST_EXPERIENCE",
    subject_ref: "manifest-42",
    ...overrides,
  });
}

function experienceEvent(
  sequence: number,
  eventType: "experience.snapshot" | "experience.delta" | "terminal.bundle" | "heartbeat",
  contract = experienceContract(),
) {
  return {
    artifact_type: "ExperienceStreamEvent",
    delta_ref: eventType === "experience.delta" ? `delta.experience.${sequence}` : null,
    event_type: eventType,
    experience_sequence: sequence,
    frame_epoch: contract.frame_epoch,
    manifest_id: "manifest-42",
    occurred_at: "2026-04-23T09:00:00Z",
    resume_token: "resume.experience.42",
    shell_route_key: "manifest-route-42",
    shell_stability_token: "shell.experience.42",
    snapshot_ref: eventType === "experience.snapshot" ? `snapshot.experience.${sequence}` : null,
    stability_contract: {},
    stream_recovery_contract: contract,
    stream_scope_class: "MANIFEST_EXPERIENCE",
    terminal_bundle_ref: eventType === "terminal.bundle" ? `terminal.experience.${sequence}` : null,
  } as const;
}

test("sample stream recovery contract stays byte-for-byte compatible with the canonical sample", async () => {
  const sample = JSON.parse(
    await readFile(
      path.join(repoRoot, "packages/contracts-core/samples/sample_stream_recovery_contract.json"),
      "utf8",
    ),
  );

  expect(workspaceContract()).toEqual(sample);
});

test("sequence window enforces snapshot, catch-up, duplicate idempotency, live handoff, and gap blocking", () => {
  const baselineContract = experienceContract({ last_published_sequence: 20 });
  const window = openSequenceWindow({
    initial_last_applied_sequence: 17,
    stream_recovery_contract: baselineContract,
  });

  const snapshot = advanceSequenceWindow(window, experienceEvent(18, "experience.snapshot", baselineContract));
  expect(snapshot.decision.code).toBe("APPLY");
  expect(snapshot.decision.phase_ref).toBe("SNAPSHOT");

  const catchUp = advanceSequenceWindow(
    snapshot.next_state,
    experienceEvent(19, "experience.delta", baselineContract),
  );
  expect(catchUp.decision.phase_ref).toBe("CATCH_UP");

  const duplicate = advanceSequenceWindow(
    catchUp.next_state,
    experienceEvent(19, "experience.delta", baselineContract),
  );
  expect(duplicate.decision.code).toBe("ACK_DUPLICATE");

  const frontier = advanceSequenceWindow(
    catchUp.next_state,
    experienceEvent(20, "experience.delta", baselineContract),
  );
  expect(frontier.next_state.pending_catch_up).toBe(false);

  const liveContract = experienceContract({ last_published_sequence: 21 });
  const live = advanceSequenceWindow(
    frontier.next_state,
    experienceEvent(21, "experience.delta", liveContract),
  );
  expect(live.decision.phase_ref).toBe("LIVE");

  const gap = advanceSequenceWindow(live.next_state, experienceEvent(23, "experience.delta", liveContract));
  expect(gap.decision.code).toBe("BLOCK_GAP");
});

test("resume assessment fails closed on compaction and access drift even when the raw token is present", async () => {
  const current = experienceContract();

  const compactionAssessment = await assessStreamResume({
    current_contract: current,
    raw_resume_token_or_null: "resume.experience.42",
    requested_contract: current,
    requested_next_sequence: 17,
    schema_compatibility_matches: true,
  });
  expect(compactionAssessment.delivery_window_state).toBe("REBASE_REQUIRED");
  expect(compactionAssessment.reason_code_or_null).toBe("HISTORY_COMPACTED");

  const accessAssessment = await assessStreamResume({
    current_contract: current,
    raw_resume_token_or_null: "resume.experience.42",
    requested_contract: experienceContract({
      access_binding_hash: "access-binding.experience.changed",
    }),
    requested_next_sequence: 19,
    schema_compatibility_matches: true,
  });
  expect(accessAssessment.delivery_window_state).toBe("ACCESS_REBIND_REQUIRED");
  expect(accessAssessment.reason_code_or_null).toBe("ACCESS_BINDING_CHANGED");
});

test("cursor transitions move from live to rebased and expired without silent reopen", () => {
  const liveCursor = createExperienceCursor({
    expires_at: "2026-04-23T10:30:00Z",
    last_ack_sequence: 20,
    latest_snapshot_ref: "snapshot.experience.manifest-42.20",
    manifest_id: "manifest-42",
    masking_posture_hash: "masking.experience.42",
    native_cache_hydration_contract: {},
    now: "2026-04-23T10:00:00Z",
    principal_class: "STAFF_USER",
    principal_ref: "principal.staff.42",
    raw_resume_token: "resume.experience.42",
    schema_compatibility_ref: "stream.schema.current",
    stability_contract: {},
    stream_recovery_contract: experienceContract(),
    tenant_id: "tenant.taxat-sandbox",
    truth_boundary_contract: {},
  });

  const rebased = transitionStreamCursor(liveCursor, {
    at: "2026-04-23T10:05:00Z",
    next_state: "REBASED",
    reason_code: "FRAME_EPOCH_ADVANCED",
    replacement_snapshot_ref: "snapshot.experience.manifest-42.epoch-4",
  });
  expect(rebased.cursor_state).toBe("REBASED");
  expect(rebased.replacement_snapshot_ref).toBe("snapshot.experience.manifest-42.epoch-4");

  const expired = expireStreamCursorIfNeeded(
    createExperienceCursor({
      expires_at: "2026-04-23T10:00:30Z",
      last_ack_sequence: 20,
      latest_snapshot_ref: "snapshot.experience.manifest-42.20",
      manifest_id: "manifest-42",
      masking_posture_hash: "masking.experience.42",
      native_cache_hydration_contract: {},
      now: "2026-04-23T10:00:00Z",
      principal_class: "STAFF_USER",
      principal_ref: "principal.staff.42",
      raw_resume_token: "resume.experience.42",
      schema_compatibility_ref: "stream.schema.current",
      stability_contract: {},
      stream_recovery_contract: experienceContract(),
      tenant_id: "tenant.taxat-sandbox",
      truth_boundary_contract: {},
    }),
    "2026-04-23T10:01:00Z",
  );
  expect(expired.cursor_state).toBe("EXPIRED");
  expect(expired.invalidation_reason_code).toBe("CURSOR_TTL_ELAPSED");
});

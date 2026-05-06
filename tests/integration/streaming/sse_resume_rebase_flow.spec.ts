import { expect, test } from "@playwright/test";

import {
  createExperienceCursor,
  createInMemoryStreamCursorStore,
  createWorkspaceCursor,
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
import { encodeSseFrame } from "../../../packages/domain-kernel/src/streaming/sse_frame_encoder.ts";

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

function workspaceContract(overrides = {}) {
  return createStreamRecoveryContract({
    access_binding_hash: "access-binding.workspace.72",
    compaction_floor_sequence_or_null: 12,
    delivery_window_state: "LIVE_RESUMABLE",
    frame_epoch: 3,
    last_published_sequence: 21,
    masking_context_hash: "masking.workspace.72",
    publication_generation: 8,
    rebase_reason_code_or_null: null,
    resume_binding_ref_or_null: hashTransportResumeToken("resume.workspace.72"),
    resume_binding_representation: "HASHED_TOKEN",
    route_key: "workspace-route-item-72",
    session_binding_hash: "session-binding.workspace.72",
    session_ref: "session.workspace.72",
    shell_stability_token: "shell.workspace.72",
    stream_scope_class: "WORKSPACE",
    subject_ref: "item-72",
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
    occurred_at: "2026-04-23T11:00:00Z",
    resume_token: "resume.experience.42",
    shell_route_key: "manifest-route-42",
    shell_stability_token: "shell.experience.42",
    snapshot_ref: eventType === "experience.snapshot" ? `snapshot.experience.${sequence}` : null,
    stability_contract: {},
    stream_recovery_contract: contract,
    stream_scope_class: "MANIFEST_EXPERIENCE",
    terminal_bundle_ref: null,
  } as const;
}

test("snapshot to catch-up to live progression survives reconnect under the same authoritative contract", async () => {
  const store = await createInMemoryStreamCursorStore();
  const recovery = experienceContract({ last_published_sequence: 20 });
  const cursor = createExperienceCursor({
    expires_at: "2026-04-23T12:00:00Z",
    last_ack_sequence: 17,
    latest_snapshot_ref: "snapshot.experience.manifest-42.18",
    manifest_id: "manifest-42",
    masking_posture_hash: "masking.experience.42",
    native_cache_hydration_contract: {},
    now: "2026-04-23T11:00:00Z",
    principal_class: "STAFF_USER",
    principal_ref: "principal.staff.42",
    raw_resume_token: "resume.experience.42",
    schema_compatibility_ref: "stream.schema.current",
    stability_contract: {},
    stream_recovery_contract: recovery,
    tenant_id: "tenant.taxat-sandbox",
    truth_boundary_contract: {},
  });
  store.put(cursor);

  let window = openSequenceWindow({
    initial_last_applied_sequence: cursor.last_ack_sequence,
    stream_recovery_contract: recovery,
  });

  for (const event of [
    experienceEvent(18, "experience.snapshot", recovery),
    experienceEvent(19, "experience.delta", recovery),
    experienceEvent(20, "experience.delta", recovery),
  ]) {
    const advanced = advanceSequenceWindow(window, event);
    expect(advanced.decision.code).toBe("APPLY");
    window = advanced.next_state;
    store.acknowledge(cursor.cursor_id, {
      at: "2026-04-23T11:00:30Z",
      last_published_sequence_or_null: event.stream_recovery_contract.last_published_sequence,
      sequence: event.experience_sequence,
    });
    expect(encodeSseFrame(event)).toContain(`event: ${event.event_type}`);
  }

  const resume = await assessStreamResume({
    current_contract: recovery,
    raw_resume_token_or_null: "resume.experience.42",
    requested_contract: recovery,
    requested_next_sequence: 21,
    schema_compatibility_matches: true,
  });
  expect(resume.allowed).toBe(true);

  const liveContract = experienceContract({ last_published_sequence: 21 });
  const liveEvent = experienceEvent(21, "experience.delta", liveContract);
  const live = advanceSequenceWindow(window, liveEvent);
  expect(live.decision.phase_ref).toBe("LIVE");
  store.acknowledge(cursor.cursor_id, {
    at: "2026-04-23T11:01:00Z",
    last_published_sequence_or_null: 21,
    sequence: 21,
  });

  const heartbeat = encodeSseFrame({
    ...liveEvent,
    delta_ref: null,
    event_type: "heartbeat",
  });
  expect(heartbeat.startsWith(": heartbeat")).toBe(true);
  expect(store.get(cursor.cursor_id).last_ack_sequence).toBe(21);
});

test("compaction, epoch advance, and access drift fail closed into rebase or access rebind posture", async () => {
  const store = await createInMemoryStreamCursorStore();
  const workspaceCursor = createWorkspaceCursor({
    customer_head_sequence: 21,
    expires_at: "2026-04-23T13:00:00Z",
    internal_head_sequence_or_null: 21,
    item_id: "item-72",
    last_ack_sequence: 14,
    latest_snapshot_ref: "snapshot.workspace.item-72.14",
    masking_posture_fingerprint: "masking.workspace.72",
    native_cache_hydration_contract: {},
    now: "2026-04-23T12:00:00Z",
    principal_class: "STAFF_USER",
    principal_ref: "principal.staff.72",
    raw_resume_token: "resume.workspace.72",
    request_state_version_or_null: 3,
    schema_compatibility_ref: "stream.schema.current",
    session_visibility_class: "STAFF_FULL",
    stability_contract: {},
    stream_recovery_contract: workspaceContract(),
    tenant_id: "tenant.taxat-sandbox",
    workspace_version: 21,
  });
  store.put(workspaceCursor);

  const compaction = await assessStreamResume({
    current_contract: workspaceContract(),
    raw_resume_token_or_null: "resume.workspace.72",
    requested_contract: workspaceContract(),
    requested_next_sequence: 11,
    schema_compatibility_matches: true,
  });
  expect(compaction.delivery_window_state).toBe("REBASE_REQUIRED");
  expect(compaction.reason_code_or_null).toBe("HISTORY_COMPACTED");

  const epochWindow = openSequenceWindow({
    initial_last_applied_sequence: 20,
    stream_recovery_contract: workspaceContract({ last_published_sequence: 21 }),
  });
  const epochAdvance = advanceSequenceWindow(epochWindow, {
    access_binding_hash: "access-binding.workspace.72",
    activity_ref: null,
    artifact_type: "WorkspaceStreamEvent",
    audit_ref: null,
    customer_safe_projection: null,
    delta_ref: "delta.workspace.22",
    event_type: "workspace.delta",
    frame_epoch: 4,
    item_id: "item-72",
    masking_posture_fingerprint: "masking.workspace.72",
    notification_ref: null,
    object_anchor_ref: "item-72",
    occurred_at: "2026-04-23T12:05:00Z",
    queue_projection_or_null: null,
    resume_token: "resume.workspace.72",
    session_visibility_class: "STAFF_FULL",
    shell_family: "CALM_SHELL",
    shell_stability_token: "shell.workspace.72",
    snapshot_ref: null,
    stability_contract: {},
    stream_recovery_contract: workspaceContract({ frame_epoch: 4, last_published_sequence: 22 }),
    stream_scope_class: "WORKSPACE",
    visibility_partition: {},
    workspace_route_key: "workspace-route-item-72",
    workspace_sequence: 22,
    workspace_version: 22,
  } as const);
  expect(epochAdvance.decision.code).toBe("REBASE_REQUIRED");

  const accessDrift = await assessStreamResume({
    current_contract: workspaceContract(),
    raw_resume_token_or_null: "resume.workspace.72",
    requested_contract: workspaceContract({
      access_binding_hash: "access-binding.workspace.72.changed",
      masking_context_hash: "masking.workspace.72.changed",
    }),
    requested_next_sequence: 15,
    schema_compatibility_matches: true,
  });
  expect(accessDrift.delivery_window_state).toBe("ACCESS_REBIND_REQUIRED");
  expect(accessDrift.reason_code_or_null).toBe("ACCESS_BINDING_CHANGED");
});

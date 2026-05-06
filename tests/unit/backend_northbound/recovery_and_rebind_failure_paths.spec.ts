import { expect, test } from "@playwright/test";

import {
  buildAccessRebindRequiredProblem,
  buildRebaseRequiredProblem,
  detectAccessBindingOrMaskingRebindRequirement,
  detectRouteOrEpochRebaseRequirement,
  ExperienceCursorRepository,
  ExperienceStreamEventRepository,
  getManifestExperienceStreamEndpoint,
  validateShellStabilityGuard,
} from "../../../packages/backend-northbound/src/index.ts";
import { hashTransportResumeToken } from "../../../packages/domain-kernel/src/streaming/stream_recovery.ts";
import { validateContractSchema } from "./audit_and_enquiry_fixtures.ts";
import {
  defaultExperienceActorContext,
  experienceStreamEventFixture,
  persistedExperienceFrameFixture,
} from "./experience_snapshot_fixtures.ts";

test("detects access rebinding and route rebase causes without blurring them", () => {
  expect(
    detectAccessBindingOrMaskingRebindRequirement({
      current: {
        accessBindingHash: "access.old",
        maskingContextHash: "mask.same",
        schemaCompatibilityRef: "schema.current",
        sessionBindingHash: "session.same",
        sessionRef: "session.same",
      },
      expected: {
        accessBindingHash: "access.new",
        maskingContextHash: "mask.same",
        schemaCompatibilityRef: "schema.current",
        sessionBindingHash: "session.same",
        sessionRef: "session.same",
      },
    })?.reasonCode,
  ).toBe("ACCESS_BINDING_CHANGED");

  expect(
    detectRouteOrEpochRebaseRequirement({
      frameEpoch: 8,
      reasonCodes: ["FRAME_EPOCH_ADVANCED"],
      scope: "MANIFEST_EXPERIENCE",
      shellStabilityToken: "shell.current",
    }),
  ).toMatchObject({
    latestStaleGuardValue: 8,
    staleGuardFamily: "FRAME_EPOCH",
  });

  expect(
    validateShellStabilityGuard({
      authoritativeShellStabilityToken: "shell.current",
      frameEpoch: 4,
      ifMatchShellStabilityToken: "shell.stale",
      scope: "WORKSPACE",
      workspaceVersion: 17,
    }),
  ).toMatchObject({
    outcome: "REBASE_REQUIRED",
    requirement: {
      latestStaleGuardValue: "shell.current",
      staleGuardFamily: "SHELL_STABILITY_TOKEN",
    },
  });
});

test("builds schema-valid access-rebind and rebase problem envelopes", async () => {
  const { frame } = await persistedExperienceFrameFixture({
    manifestId: "manifest-recovery-problem",
  });
  const access = buildAccessRebindRequiredProblem({
    correlationId: "corr.pc0168.access",
    manifestId: frame.manifest_id,
    reasonCodes: ["ACCESS_BINDING_CHANGED"],
  });
  expect(access.status).toBe(403);
  expect(access.body.latest_resume_token).toBeNull();
  await validateContractSchema("problem_envelope", access.body);

  const rebase = buildRebaseRequiredProblem({
    correlationId: "corr.pc0168.rebase",
    latestResumeToken: frame.resume_token,
    latestStabilityContract: frame.stability_contract,
    latestStaleGuardValue: frame.frame_epoch,
    manifestId: frame.manifest_id,
    reasonCodes: ["FRAME_EPOCH_ADVANCED"],
    scope: "MANIFEST_EXPERIENCE",
    staleGuardFamily: "FRAME_EPOCH",
  });
  expect(rebase.status).toBe(409);
  expect(rebase.body.latest_resume_token).toBe(frame.resume_token);
  await validateContractSchema("problem_envelope", rebase.body);
});

test("persists hashed cursor recovery bindings and revokes them on schema drift", async () => {
  const { frame, repository: frameRepository } = await persistedExperienceFrameFixture({
    manifestId: "manifest-cursor-schema-drift",
  });
  const cursorRepository = new ExperienceCursorRepository();
  const eventRepository = new ExperienceStreamEventRepository();
  const first = await getManifestExperienceStreamEndpoint(
    {
      actorContext: defaultExperienceActorContext,
      correlationId: "corr.pc0168.cursor.live",
      includeHeartbeat: false,
      manifestId: frame.manifest_id,
      method: "GET",
      now: "2026-05-04T09:00:00.000Z",
      resumeToken: frame.resume_token,
    },
    {
      experienceCursorRepository: cursorRepository,
      experienceStreamEventRepository: eventRepository,
      lowNoiseExperienceFrameRepository: frameRepository,
    },
  );
  expect(first.status).toBe(200);
  if (first.status !== 200) {
    throw new Error(first.body.problem_code);
  }
  expect(first.cursor.stream_recovery_contract.resume_binding_representation).toBe("HASHED_TOKEN");
  expect(first.cursor.stream_recovery_contract.resume_binding_ref_or_null).toBe(
    hashTransportResumeToken(frame.resume_token),
  );
  await validateContractSchema("experience_cursor", first.cursor);

  const reconnect = await getManifestExperienceStreamEndpoint(
    {
      actorContext: defaultExperienceActorContext,
      correlationId: "corr.pc0168.cursor.reconnect",
      manifestId: frame.manifest_id,
      method: "GET",
      now: "2026-05-04T09:00:30.000Z",
      resumeToken: frame.resume_token,
    },
    {
      experienceCursorRepository: cursorRepository,
      experienceStreamEventRepository: eventRepository,
      lowNoiseExperienceFrameRepository: frameRepository,
    },
  );
  expect(reconnect.status).toBe(200);
  if (reconnect.status !== 200) {
    throw new Error(reconnect.body.problem_code);
  }
  expect(reconnect.cursor.stream_recovery_contract.resume_binding_representation).toBe(
    "HASHED_TOKEN",
  );
  expect(reconnect.events[0]?.stream_recovery_contract.resume_binding_representation).toBe(
    "RAW_TOKEN",
  );
  expect(reconnect.events[0]?.stream_recovery_contract.resume_binding_ref_or_null).toBe(
    frame.resume_token,
  );
  await validateContractSchema("experience_cursor", reconnect.cursor);

  const drift = await getManifestExperienceStreamEndpoint(
    {
      actorContext: defaultExperienceActorContext,
      correlationId: "corr.pc0168.cursor.schema-drift",
      includeHeartbeat: false,
      manifestId: frame.manifest_id,
      method: "GET",
      now: "2026-05-04T09:01:00.000Z",
      resumeToken: frame.resume_token,
      schemaCompatibilityRef: "low_noise_experience_frame.schema.json@next",
    },
    {
      experienceCursorRepository: cursorRepository,
      experienceStreamEventRepository: eventRepository,
      lowNoiseExperienceFrameRepository: frameRepository,
    },
  );
  expect(drift.status).toBe(403);
  expect(drift.body.problem_code).toBe("ACCESS_REBIND_REQUIRED");
  await validateContractSchema("problem_envelope", drift.body);

  const [cursor] = await cursorRepository.listCursors();
  expect(cursor.cursor_state).toBe("REVOKED");
  expect(cursor.stream_recovery_contract.delivery_window_state).toBe("ACCESS_REBIND_REQUIRED");
  expect(cursor.stream_recovery_contract.resume_binding_ref_or_null).toBeNull();
  expect(cursor.native_cache_hydration_contract.resume_binding_ref_or_null).toBeNull();
  await validateContractSchema("experience_cursor", cursor);
});

test("rebases cursor recovery contracts with a replacement anchor on catch-up gaps", async () => {
  const { frame, repository: frameRepository } = await persistedExperienceFrameFixture({
    lastPublishedSequence: 3,
    manifestId: "manifest-cursor-gap-rebase",
  });
  const cursorRepository = new ExperienceCursorRepository();
  const eventRepository = new ExperienceStreamEventRepository();
  eventRepository.persistEvent({ event: experienceStreamEventFixture({ frame, sequence: 3 }) });

  const response = await getManifestExperienceStreamEndpoint(
    {
      actorContext: defaultExperienceActorContext,
      correlationId: "corr.pc0168.cursor.gap",
      includeHeartbeat: false,
      initialLastAckSequence: 1,
      manifestId: frame.manifest_id,
      method: "GET",
      now: "2026-05-04T09:02:00.000Z",
      resumeToken: frame.resume_token,
    },
    {
      experienceCursorRepository: cursorRepository,
      experienceStreamEventRepository: eventRepository,
      lowNoiseExperienceFrameRepository: frameRepository,
    },
  );
  expect(response.status).toBe(409);
  expect(response.body.problem_code).toBe("REBASE_REQUIRED");
  await validateContractSchema("problem_envelope", response.body);

  const [cursor] = await cursorRepository.listCursors();
  expect(cursor.cursor_state).toBe("REBASED");
  expect(cursor.stream_recovery_contract.delivery_window_state).toBe("REBASE_REQUIRED");
  expect(cursor.replacement_snapshot_ref).not.toBe(cursor.latest_snapshot_ref);
  await validateContractSchema("experience_cursor", cursor);
});

import { expect, test } from "@playwright/test";

import {
  ExperienceCursorRepository,
  ExperienceStreamEventRepository,
  getManifestExperienceStreamEndpoint,
} from "../../../packages/backend-northbound/src/index.ts";
import {
  defaultExperienceActorContext,
  experienceStreamEventFixture,
  persistedExperienceFrameFixture,
} from "../../unit/backend_northbound/experience_snapshot_fixtures.ts";

test("resumes a cursor with catch-up ordered before the heartbeat", async () => {
  const { frame, repository: frameRepository } = await persistedExperienceFrameFixture({
    lastPublishedSequence: 3,
    manifestId: "manifest-stream-catch-up",
  });
  const cursorRepository = new ExperienceCursorRepository();
  const eventRepository = new ExperienceStreamEventRepository();
  eventRepository.persistEvent({ event: experienceStreamEventFixture({ frame, sequence: 2 }) });
  eventRepository.persistEvent({ event: experienceStreamEventFixture({ frame, sequence: 2 }) });
  eventRepository.persistEvent({
    event: experienceStreamEventFixture({
      eventType: "terminal.bundle",
      frame,
      sequence: 3,
    }),
  });

  const response = await getManifestExperienceStreamEndpoint(
    {
      actorContext: defaultExperienceActorContext,
      correlationId: "corr.stream.catch-up",
      initialLastAckSequence: 1,
      manifestId: frame.manifest_id,
      method: "GET",
      now: "2026-05-03T11:00:00.000Z",
      resumeToken: frame.resume_token,
    },
    {
      experienceCursorRepository: cursorRepository,
      experienceStreamEventRepository: eventRepository,
      lowNoiseExperienceFrameRepository: frameRepository,
    },
  );

  expect(response.status).toBe(200);
  if (response.status !== 200) {
    throw new Error(response.body.problem_code);
  }
  expect(response.headers["Content-Type"]).toBe("text/event-stream");
  expect(response.events.map((event) => event.event_type)).toEqual([
    "experience.delta",
    "terminal.bundle",
    "heartbeat",
  ]);
  expect(response.events.map((event) => event.experience_sequence)).toEqual([2, 3, 3]);
  expect(response.body.indexOf("event: experience.delta")).toBeLessThan(
    response.body.indexOf("event: terminal.bundle"),
  );
  expect(response.body.indexOf("event: terminal.bundle")).toBeLessThan(
    response.body.indexOf(": heartbeat"),
  );
  expect(response.cursor.last_ack_sequence).toBe(3);
});

test("fails closed with REBASE_REQUIRED when catch-up history has a gap", async () => {
  const { frame, repository: frameRepository } = await persistedExperienceFrameFixture({
    lastPublishedSequence: 3,
    manifestId: "manifest-stream-gap",
  });
  const cursorRepository = new ExperienceCursorRepository();
  const eventRepository = new ExperienceStreamEventRepository();
  eventRepository.persistEvent({ event: experienceStreamEventFixture({ frame, sequence: 3 }) });

  const response = await getManifestExperienceStreamEndpoint(
    {
      actorContext: defaultExperienceActorContext,
      correlationId: "corr.stream.gap",
      initialLastAckSequence: 1,
      manifestId: frame.manifest_id,
      method: "GET",
      now: "2026-05-03T11:05:00.000Z",
      resumeToken: frame.resume_token,
    },
    {
      experienceCursorRepository: cursorRepository,
      experienceStreamEventRepository: eventRepository,
      lowNoiseExperienceFrameRepository: frameRepository,
    },
  );
  const cursors = await cursorRepository.listCursors();

  expect(response.status).toBe(409);
  expect(response.body.problem_code).toBe("REBASE_REQUIRED");
  expect(response.body.reason_codes).toContain("SEQUENCE_GAP_DETECTED");
  expect(cursors).toHaveLength(1);
  expect(cursors[0].cursor_state).toBe("REBASED");
  expect(cursors[0].replacement_snapshot_ref).not.toBe(cursors[0].latest_snapshot_ref);
});

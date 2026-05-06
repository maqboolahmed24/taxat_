import { expect, test } from "@playwright/test";

import {
  ExperienceCursorRepository,
  ExperienceStreamEventRepository,
  getManifestExperienceStreamRoutePath,
  registerGetManifestExperienceStreamRoute,
} from "../../../packages/backend-northbound/src/index.ts";
import {
  defaultExperienceActorContext,
  experienceStreamEventFixture,
  persistedExperienceFrameFixture,
} from "../../unit/backend_northbound/experience_snapshot_fixtures.ts";

test("GET /v1/manifests/{manifest_id}/experience/stream returns no-store SSE catch-up", async () => {
  const { frame, repository: frameRepository } = await persistedExperienceFrameFixture({
    lastPublishedSequence: 2,
    manifestId: "manifest-api-stream",
  });
  const cursorRepository = new ExperienceCursorRepository();
  const eventRepository = new ExperienceStreamEventRepository();
  eventRepository.persistEvent({ event: experienceStreamEventFixture({ frame, sequence: 1 }) });
  eventRepository.persistEvent({
    event: experienceStreamEventFixture({
      eventType: "experience.snapshot",
      frame,
      sequence: 2,
    }),
  });
  let registeredPath: string | null = null;
  let registeredHandler: unknown = null;
  const handler = registerGetManifestExperienceStreamRoute(
    {
      get: (path, routeHandler) => {
        registeredPath = path;
        registeredHandler = routeHandler;
      },
    },
    {
      experienceCursorRepository: cursorRepository,
      experienceStreamEventRepository: eventRepository,
      lowNoiseExperienceFrameRepository: frameRepository,
    },
  );

  expect(registeredPath).toBe(getManifestExperienceStreamRoutePath);
  expect(registeredHandler).toBe(handler);

  const response = await handler({
    actorContext: defaultExperienceActorContext,
    correlationId: "corr.api.stream",
    initialLastAckSequence: 0,
    method: "GET",
    now: "2026-05-03T12:00:00.000Z",
    path: `/v1/manifests/${encodeURIComponent(
      frame.manifest_id,
    )}/experience/stream?resume_token=${encodeURIComponent(frame.resume_token)}`,
  });

  expect(response.status).toBe(200);
  if (response.status !== 200) {
    throw new Error(response.body.problem_code);
  }
  expect(response.headers["Cache-Control"]).toBe("no-store");
  expect(response.headers["Content-Type"]).toBe("text/event-stream");
  expect(response.body).toContain("event: experience.delta");
  expect(response.body).toContain("event: experience.snapshot");
  expect(response.body).toContain(": heartbeat scope=MANIFEST_EXPERIENCE");
  expect(response.events.map((event) => event.experience_sequence)).toEqual([1, 2, 2]);
});

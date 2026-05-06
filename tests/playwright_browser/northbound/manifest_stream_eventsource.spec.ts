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

test("browser EventSource consumes manifest stream events in sequence without fixed sleeps", async ({
  page,
}) => {
  const { frame, repository: frameRepository } = await persistedExperienceFrameFixture({
    lastPublishedSequence: 2,
    manifestId: "manifest-browser-stream",
  });
  const eventRepository = new ExperienceStreamEventRepository();
  eventRepository.persistEvent({ event: experienceStreamEventFixture({ frame, sequence: 1 }) });
  eventRepository.persistEvent({
    event: experienceStreamEventFixture({
      eventType: "terminal.bundle",
      frame,
      sequence: 2,
    }),
  });
  const response = await getManifestExperienceStreamEndpoint(
    {
      actorContext: defaultExperienceActorContext,
      correlationId: "corr.browser.stream",
      initialLastAckSequence: 0,
      manifestId: frame.manifest_id,
      method: "GET",
      now: "2026-05-03T12:05:00.000Z",
      resumeToken: frame.resume_token,
    },
    {
      experienceCursorRepository: new ExperienceCursorRepository(),
      experienceStreamEventRepository: eventRepository,
      lowNoiseExperienceFrameRepository: frameRepository,
    },
  );
  expect(response.status).toBe(200);
  if (response.status !== 200) {
    throw new Error(response.body.problem_code);
  }

  const streamUrl = `http://manifest-stream.test/v1/manifests/${encodeURIComponent(
    frame.manifest_id,
  )}/experience/stream?resume_token=${encodeURIComponent(frame.resume_token)}`;
  await page.route(streamUrl, (route) =>
    route.fulfill({
      body: response.body,
      contentType: "text/event-stream",
      headers: {
        "Cache-Control": "no-store",
      },
      status: 200,
    }),
  );
  await page.goto("about:blank");

  const received = await page.evaluate(
    ({ url }) =>
      new Promise<Array<{ sequence: number; type: string }>>((resolve, reject) => {
        const events: Array<{ sequence: number; type: string }> = [];
        const source = new EventSource(url);
        const timeout = window.setTimeout(() => {
          source.close();
          reject(new Error(`Timed out waiting for EventSource events: ${JSON.stringify(events)}`));
        }, 5000);
        const record = (message: MessageEvent<string>) => {
          const parsed = JSON.parse(message.data) as {
            event_type: string;
            experience_sequence: number;
          };
          events.push({
            sequence: parsed.experience_sequence,
            type: parsed.event_type,
          });
          if (events.length === 2) {
            window.clearTimeout(timeout);
            source.close();
            resolve(events);
          }
        };
        source.addEventListener("experience.delta", record);
        source.addEventListener("terminal.bundle", record);
      }),
    { url: streamUrl },
  );

  expect(received).toEqual([
    { sequence: 1, type: "experience.delta" },
    { sequence: 2, type: "terminal.bundle" },
  ]);
});

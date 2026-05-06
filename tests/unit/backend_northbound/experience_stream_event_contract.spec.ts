import { expect, test } from "@playwright/test";

import {
  serializeExperienceStreamEvent,
  validateExperienceStreamEvent,
} from "../../../packages/backend-northbound/src/index.ts";
import {
  experienceFrameFixture,
  experienceStreamEventFixture,
} from "./experience_snapshot_fixtures.ts";

test("serializes schema-valid experience stream events as SSE frames", () => {
  const frame = experienceFrameFixture({ manifestId: "manifest-stream-event" });
  const delta = experienceStreamEventFixture({
    frame,
    sequence: 8,
  });
  const terminal = experienceStreamEventFixture({
    eventType: "terminal.bundle",
    frame,
    sequence: 9,
  });

  const deltaFrame = serializeExperienceStreamEvent(delta);
  const terminalFrame = serializeExperienceStreamEvent(terminal);

  expect(deltaFrame).toContain("id: MANIFEST_EXPERIENCE:manifest-stream-event:3:8");
  expect(deltaFrame).toContain("event: experience.delta");
  expect(deltaFrame).toContain('"delta_ref":"delta://manifest-stream-event/8"');
  expect(terminalFrame).toContain("event: terminal.bundle");
  expect(terminalFrame).toContain(
    '"terminal_bundle_ref":"terminal-bundle://manifest-stream-event"',
  );
});

test("heartbeats serialize as comments and do not advance payload refs", () => {
  const frame = experienceFrameFixture({ manifestId: "manifest-stream-heartbeat" });
  const heartbeat = experienceStreamEventFixture({
    eventType: "heartbeat",
    frame,
    sequence: frame.last_published_sequence,
  });

  const serialized = serializeExperienceStreamEvent(heartbeat);

  expect(serialized).toContain(
    ": heartbeat scope=MANIFEST_EXPERIENCE route=manifest-stream-heartbeat",
  );
  expect(serialized).not.toContain("event:");
  expect(serialized).not.toContain("data:");
});

test("rejects mixed payload refs and grouped contract drift", () => {
  const frame = experienceFrameFixture({ manifestId: "manifest-stream-invalid" });
  const delta = experienceStreamEventFixture({
    frame,
    sequence: 8,
  });

  expect(() =>
    validateExperienceStreamEvent({
      ...delta,
      snapshot_ref: "snapshot://unexpected",
    }),
  ).toThrow(/only delta_ref/);

  expect(() =>
    validateExperienceStreamEvent({
      ...delta,
      stream_recovery_contract: {
        ...delta.stream_recovery_contract,
        route_key: "other-route",
      },
    }),
  ).toThrow(/route key drifted/);
});

import { expect, test } from "@playwright/test";

import {
  ExperienceCursorRepository,
  openOrResumeExperienceCursor,
  validateExperienceCursorRecord,
  validateManifestResumeToken,
} from "../../../packages/backend-northbound/src/index.ts";
import {
  defaultExperienceActorContext,
  persistedExperienceFrameFixture,
} from "./experience_snapshot_fixtures.ts";

async function liveCursorFixture() {
  const { frame, stored } = await persistedExperienceFrameFixture({
    manifestId: "manifest-cursor-rules",
  });
  const repository = new ExperienceCursorRepository();
  const validation = validateManifestResumeToken({
    actorContext: defaultExperienceActorContext,
    frame,
    manifestId: frame.manifest_id,
    resumeToken: frame.resume_token,
    storedFrame: stored,
  });
  const cursor = await openOrResumeExperienceCursor({
    experienceCursorRepository: repository,
    now: "2026-05-03T10:01:00.000Z",
    validation,
  });
  return {
    cursor,
    frame,
    repository,
    validation,
  };
}

test("validates the ExperienceCursor schema gaps closed by the patch index", async () => {
  const { cursor, frame } = await liveCursorFixture();

  expect(() =>
    validateExperienceCursorRecord({
      ...cursor,
      last_ack_sequence: cursor.last_published_sequence + 1,
    }),
  ).toThrow(/last_ack_sequence/);

  expect(() =>
    validateExperienceCursorRecord({
      ...cursor,
      cursor_state: "REBASED",
      invalidated_at: "2026-05-03T10:03:00.000Z",
      invalidation_reason_code: "FRAME_EPOCH_ADVANCED",
      replacement_snapshot_ref: cursor.latest_snapshot_ref,
      replacement_stability_contract_or_null: frame.stability_contract,
    }),
  ).toThrow(/stale latest snapshot/);

  expect(() =>
    validateExperienceCursorRecord({
      ...cursor,
      cursor_state: "REVOKED",
      invalidated_at: "2026-05-03T10:00:00.000Z",
      invalidation_reason_code: "ACCESS_BINDING_CHANGED",
    }),
  ).toThrow(/invalidated_at cannot predate last_seen_at/);

  expect(() =>
    validateExperienceCursorRecord({
      ...cursor,
      cursor_state: "EXPIRED",
      expires_at: "2026-05-03T10:10:00.000Z",
      invalidated_at: "2026-05-03T10:09:00.000Z",
      invalidation_reason_code: "CURSOR_TTL_ELAPSED",
    }),
  ).toThrow(/before expires_at/);
});

test("expired cursor records remain terminal and recovery allocates a successor", async () => {
  const { repository, validation } = await liveCursorFixture();

  const first = await openOrResumeExperienceCursor({
    cursorExpiresAt: "2026-05-03T10:02:00.000Z",
    experienceCursorRepository: repository,
    now: "2026-05-03T10:01:30.000Z",
    validation,
  });
  const successor = await openOrResumeExperienceCursor({
    experienceCursorRepository: repository,
    now: "2026-05-03T10:03:00.000Z",
    validation,
  });
  const cursors = await repository.listCursors();

  expect(successor.cursor_id).not.toBe(first.cursor_id);
  expect(cursors.some((cursor) => cursor.cursor_state === "EXPIRED")).toBe(true);
  expect(successor.cursor_state).toBe("LIVE");
});

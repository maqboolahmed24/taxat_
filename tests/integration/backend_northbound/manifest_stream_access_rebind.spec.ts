import { expect, test } from "@playwright/test";

import {
  ExperienceCursorRepository,
  ExperienceStreamEventRepository,
  getManifestExperienceStreamEndpoint,
} from "../../../packages/backend-northbound/src/index.ts";
import {
  defaultExperienceActorContext,
  persistedExperienceFrameFixture,
} from "../../unit/backend_northbound/experience_snapshot_fixtures.ts";
import { actorContext } from "../../unit/backend_northbound/post_commands_fixtures.ts";

test("rejects cross-session resume token replay with ACCESS_REBIND_REQUIRED", async () => {
  const { frame, repository: frameRepository } = await persistedExperienceFrameFixture({
    manifestId: "manifest-stream-cross-session",
  });
  const response = await getManifestExperienceStreamEndpoint(
    {
      actorContext: actorContext({
        principal_ref: "principal-experience",
        session_ref: "session-other",
        tenant_id: "tenant-experience",
      }),
      correlationId: "corr.stream.cross-session",
      manifestId: frame.manifest_id,
      method: "GET",
      now: "2026-05-03T11:10:00.000Z",
      resumeToken: frame.resume_token,
    },
    {
      experienceCursorRepository: new ExperienceCursorRepository(),
      experienceStreamEventRepository: new ExperienceStreamEventRepository(),
      lowNoiseExperienceFrameRepository: frameRepository,
    },
  );

  expect(response.status).toBe(403);
  expect(response.body.problem_code).toBe("ACCESS_REBIND_REQUIRED");
  expect(response.body.reason_codes).toContain("SESSION_BINDING_CHANGED");
  expect(response.body.latest_resume_token).toBeNull();
});

test("rejects access and masking drift without emitting cached deltas", async () => {
  const { frame, repository: frameRepository } = await persistedExperienceFrameFixture({
    manifestId: "manifest-stream-access-drift",
  });
  const response = await getManifestExperienceStreamEndpoint(
    {
      actorContext: {
        ...defaultExperienceActorContext,
        access_binding_hash_or_null: "access-binding-other",
        masking_posture_fingerprint_or_null: "masking-other",
      },
      correlationId: "corr.stream.access-drift",
      manifestId: frame.manifest_id,
      method: "GET",
      now: "2026-05-03T11:12:00.000Z",
      resumeToken: frame.resume_token,
    },
    {
      experienceCursorRepository: new ExperienceCursorRepository(),
      experienceStreamEventRepository: new ExperienceStreamEventRepository(),
      lowNoiseExperienceFrameRepository: frameRepository,
    },
  );

  expect(response.status).toBe(403);
  expect(response.body.problem_code).toBe("ACCESS_REBIND_REQUIRED");
  expect(response.body.reason_codes).toEqual(expect.arrayContaining(["ACCESS_BINDING_CHANGED"]));
});

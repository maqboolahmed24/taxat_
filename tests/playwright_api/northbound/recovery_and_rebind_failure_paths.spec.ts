import { expect, test } from "@playwright/test";

import {
  ExperienceCursorRepository,
  ExperienceStreamEventRepository,
  getManifestExperienceStreamRoutePath,
  registerGetManifestExperienceStreamRoute,
} from "../../../packages/backend-northbound/src/index.ts";
import { validateContractSchema } from "../../unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  defaultExperienceActorContext,
  persistedExperienceFrameFixture,
} from "../../unit/backend_northbound/experience_snapshot_fixtures.ts";

test("registered manifest stream route maps schema drift to ACCESS_REBIND_REQUIRED", async () => {
  const { frame, repository: frameRepository } = await persistedExperienceFrameFixture({
    manifestId: "manifest-api-pc0168-rebind",
  });
  const cursorRepository = new ExperienceCursorRepository();
  const eventRepository = new ExperienceStreamEventRepository();
  const paths: string[] = [];
  const handler = registerGetManifestExperienceStreamRoute(
    {
      get: (path) => {
        paths.push(path);
      },
    },
    {
      experienceCursorRepository: cursorRepository,
      experienceStreamEventRepository: eventRepository,
      lowNoiseExperienceFrameRepository: frameRepository,
    },
  );

  expect(paths).toEqual([getManifestExperienceStreamRoutePath]);

  const path = `/v1/manifests/${encodeURIComponent(
    frame.manifest_id,
  )}/experience/stream?resume_token=${encodeURIComponent(frame.resume_token)}`;
  const first = await handler({
    actorContext: defaultExperienceActorContext,
    includeHeartbeat: false,
    method: "GET",
    now: "2026-05-04T09:20:00.000Z",
    path,
  });
  expect(first.status).toBe(200);

  const drift = await handler({
    actorContext: defaultExperienceActorContext,
    correlationId: "corr.pc0168.api.schema-drift",
    includeHeartbeat: false,
    method: "GET",
    now: "2026-05-04T09:21:00.000Z",
    path,
    schemaCompatibilityRef: "low_noise_experience_frame.schema.json@next",
  });

  expect(drift.status).toBe(403);
  expect(drift.headers["Cache-Control"]).toBe("no-store");
  expect(drift.body.problem_code).toBe("ACCESS_REBIND_REQUIRED");
  expect(drift.body.latest_decision_bundle_ref).toBeNull();
  expect(drift.body.latest_resume_token).toBeNull();
  await validateContractSchema("problem_envelope", drift.body);
});

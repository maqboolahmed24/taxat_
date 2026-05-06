import { expect, test } from "@playwright/test";

import {
  getExperienceSnapshotEndpoint,
  LowNoiseExperienceFrameRepository,
} from "../../../packages/backend-northbound/src/index.ts";
import {
  defaultExperienceActorContext,
  experienceFrameFixture,
  persistedExperienceFrameFixture,
} from "../../unit/backend_northbound/experience_snapshot_fixtures.ts";

test("no materialized frame returns typed not-ready problem instead of empty success", async () => {
  const response = await getExperienceSnapshotEndpoint(
    {
      actorContext: defaultExperienceActorContext,
      correlationId: "corr.snapshot.not-ready",
      manifestId: "manifest-snapshot-not-ready",
      method: "GET",
    },
    {
      lowNoiseExperienceFrameRepository: new LowNoiseExperienceFrameRepository(),
    },
  );

  expect(response.status).toBe(404);
  expect(response.body.artifact_type).toBe("ProblemEnvelope");
  expect(response.body.problem_code).toBe("EXPERIENCE_SNAPSHOT_NOT_READY");
  expect(response.body.retryable).toBe(true);
  expect(response.body.latest_resume_token).toBeNull();
});

test("mixed-generation frame fails closed with corrupt publication evidence", async () => {
  const repository = new LowNoiseExperienceFrameRepository();
  const frame = experienceFrameFixture({
    manifestId: "manifest-snapshot-corrupt-generation",
  });
  const corruptFrame = {
    ...frame,
    shell_stability_token: "shell-token-drifted",
  };
  await repository.persistFrame({ frame: corruptFrame });

  const response = await getExperienceSnapshotEndpoint(
    {
      actorContext: defaultExperienceActorContext,
      correlationId: "corr.snapshot.corrupt",
      manifestId: corruptFrame.manifest_id,
      method: "GET",
    },
    {
      lowNoiseExperienceFrameRepository: repository,
    },
  );

  expect(response.status).toBe(500);
  expect(response.body.artifact_type).toBe("ProblemEnvelope");
  expect(response.body.problem_code).toBe("EXPERIENCE_SNAPSHOT_CORRUPT");
  expect(response.body.reason_codes).toContain("LOW_NOISE_STABILITY_SHELL_TOKEN_DRIFT");
});

test("hidden authorization does not leak whether a materialized frame exists", async () => {
  const { repository, stored } = await persistedExperienceFrameFixture({
    manifestId: "manifest-snapshot-hidden",
  });
  const response = await getExperienceSnapshotEndpoint(
    {
      actorContext: defaultExperienceActorContext,
      correlationId: "corr.snapshot.hidden",
      manifestId: stored.manifest_id,
      method: "GET",
    },
    {
      authorizeRead: () => ({
        authorized: false,
        hidden: true,
      }),
      lowNoiseExperienceFrameRepository: repository,
    },
  );

  expect(response.status).toBe(404);
  expect(response.body.problem_code).toBe("EXPERIENCE_SNAPSHOT_NOT_READY");
});

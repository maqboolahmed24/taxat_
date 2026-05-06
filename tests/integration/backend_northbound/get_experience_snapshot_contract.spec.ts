import { expect, test } from "@playwright/test";

import { getExperienceSnapshotEndpoint } from "../../../packages/backend-northbound/src/index.ts";
import {
  defaultExperienceActorContext,
  type ExperienceSnapshotPosture,
  persistedExperienceFrameFixture,
} from "../../unit/backend_northbound/experience_snapshot_fixtures.ts";

test("returns steady, freshening, stale-review, and degraded materialized frames with coherent grouped contracts", async () => {
  const postures: ExperienceSnapshotPosture[] = [
    "STEADY",
    "FRESHENING",
    "STALE_REVIEW_REQUIRED",
    "DEGRADED_READ_ONLY",
  ];
  for (const posture of postures) {
    const { frame, repository, stored } = await persistedExperienceFrameFixture({
      manifestId: `manifest-snapshot-${posture.toLowerCase()}`,
      posture,
    });
    const response = await getExperienceSnapshotEndpoint(
      {
        actorContext: defaultExperienceActorContext,
        correlationId: `corr.snapshot.${posture}`,
        manifestId: stored.manifest_id,
        method: "GET",
        resumeTokenIssuedAt: "2026-05-03T11:00:00.000Z",
        resumeTokenNonce: `fresh-${posture}`,
      },
      {
        lowNoiseExperienceFrameRepository: repository,
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers["Cache-Control"]).toBe("no-store");
    expect(response.body.artifact_type).toBe("LowNoiseExperienceFrame");
    expect(response.body.resume_token).not.toBe(frame.resume_token);
    expect(response.body.stability_contract.resume_token_or_null).toBe(response.body.resume_token);
    expect(response.body.stability_contract.guard_vector_components).toMatchObject({
      decision_bundle_hash_or_null: frame.decision_bundle_hash,
      frame_epoch_or_null: frame.frame_epoch,
      shell_stability_token_or_null: frame.shell_stability_token,
    });
    expect(response.body.stream_recovery_contract).toMatchObject({
      delivery_window_state: "LIVE_RESUMABLE",
      frame_epoch: frame.frame_epoch,
      last_published_sequence: frame.last_published_sequence,
      resume_binding_ref_or_null: response.body.resume_token,
      route_key: frame.manifest_id,
      stream_scope_class: "MANIFEST_EXPERIENCE",
      subject_ref: frame.manifest_id,
    });
    expect(response.body.shell_route_key).toBe(frame.manifest_id);
    if (posture === "STALE_REVIEW_REQUIRED" || posture === "DEGRADED_READ_ONLY") {
      expect(response.body.action_strip.actionability_state).toBe("NO_SAFE_ACTION");
      expect(response.body.recovery_posture).not.toBe("NONE");
    }
  }
});

test("latest materialized frame wins current-only snapshot readback", async () => {
  const first = await persistedExperienceFrameFixture({
    frameEpoch: 1,
    lastPublishedSequence: 2,
    manifestId: "manifest-snapshot-latest",
  });
  await persistedExperienceFrameFixture({
    frameEpoch: 2,
    lastPublishedSequence: 8,
    manifestId: "manifest-snapshot-latest",
    repository: first.repository,
  });

  const response = await getExperienceSnapshotEndpoint(
    {
      actorContext: defaultExperienceActorContext,
      correlationId: "corr.snapshot.latest",
      manifestId: "manifest-snapshot-latest",
      method: "GET",
      resumeTokenIssuedAt: "2026-05-03T11:00:00.000Z",
      resumeTokenNonce: "fresh-latest",
    },
    {
      lowNoiseExperienceFrameRepository: first.repository,
    },
  );

  expect(response.status).toBe(200);
  expect(response.body.frame_epoch).toBe(2);
  expect(response.body.last_published_sequence).toBe(8);
});

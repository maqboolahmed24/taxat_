import { expect, test } from "@playwright/test";

import {
  getExperienceSnapshotRoutePath,
  registerGetExperienceSnapshotRoute,
} from "../../../packages/backend-northbound/src/index.ts";
import {
  defaultExperienceActorContext,
  persistedExperienceFrameFixture,
} from "../../unit/backend_northbound/experience_snapshot_fixtures.ts";

test("GET /v1/manifests/{manifest_id}/experience/snapshot publishes grouped contracts and fresh token", async () => {
  const { frame, repository, stored } = await persistedExperienceFrameFixture({
    manifestId: "manifest-api-snapshot",
  });
  let registeredPath: string | null = null;
  let registeredHandler: unknown = null;
  const handler = registerGetExperienceSnapshotRoute(
    {
      get: (path, routeHandler) => {
        registeredPath = path;
        registeredHandler = routeHandler;
      },
    },
    {
      lowNoiseExperienceFrameRepository: repository,
    },
  );

  expect(registeredPath).toBe(getExperienceSnapshotRoutePath);
  expect(registeredHandler).toBe(handler);

  const first = await handler({
    actorContext: defaultExperienceActorContext,
    correlationId: "corr.api.snapshot.first",
    method: "GET",
    path: `/v1/manifests/${encodeURIComponent(stored.manifest_id)}/experience/snapshot`,
    resumeTokenIssuedAt: "2026-05-03T12:00:00.000Z",
    resumeTokenNonce: "api-first",
  });
  const second = await handler({
    actorContext: defaultExperienceActorContext,
    correlationId: "corr.api.snapshot.second",
    method: "GET",
    path: `/v1/manifests/${encodeURIComponent(stored.manifest_id)}/experience/snapshot`,
    resumeTokenIssuedAt: "2026-05-03T12:00:00.000Z",
    resumeTokenNonce: "api-second",
  });

  expect(first.status).toBe(200);
  expect(second.status).toBe(200);
  expect(first.body.artifact_type).toBe("LowNoiseExperienceFrame");
  expect(first.body.resume_token).not.toBe(frame.resume_token);
  expect(second.body.resume_token).not.toBe(first.body.resume_token);
  expect(first.body.stability_contract.resume_token_or_null).toBe(first.body.resume_token);
  expect(first.body.stream_recovery_contract.resume_binding_ref_or_null).toBe(
    first.body.resume_token,
  );
  expect(first.body.stream_recovery_contract.route_key).toBe(stored.manifest_id);
  expect(first.body.shell_route_key).toBe(stored.manifest_id);
});

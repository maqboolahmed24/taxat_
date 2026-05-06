import { expect, test } from "@playwright/test";

import {
  getDecisionBundleRoutePath,
  registerGetDecisionBundleRoute,
} from "../../../packages/backend-northbound/src/index.ts";
import { persistedDecisionBundleFixture } from "../../unit/backend_northbound/decision_bundle_fixtures.ts";
import { actorContext } from "../../unit/backend_northbound/post_commands_fixtures.ts";

test("GET /v1/manifests/{manifest_id}/decision-bundle returns ETag and exact 304", async () => {
  const { repository, stored } = await persistedDecisionBundleFixture({
    manifestId: "manifest-api-bundle-etag",
  });
  let registeredPath: string | null = null;
  let registeredHandler: unknown = null;
  const handler = registerGetDecisionBundleRoute(
    {
      get: (path, routeHandler) => {
        registeredPath = path;
        registeredHandler = routeHandler;
      },
    },
    {
      decisionBundleRepository: repository,
    },
  );

  expect(registeredPath).toBe(getDecisionBundleRoutePath);
  expect(registeredHandler).toBe(handler);

  const first = await handler({
    actorContext: actorContext(),
    correlationId: "corr.api.bundle.first",
    method: "GET",
    path: `/v1/manifests/${encodeURIComponent(stored.manifest_id)}/decision-bundle`,
  });

  expect(first.status).toBe(200);
  expect(first.headers.ETag).toBe(stored.decision_bundle_hash);
  expect(first.body.artifact_type).toBe("DecisionBundle");

  const notModified = await handler({
    actorContext: actorContext(),
    correlationId: "corr.api.bundle.304",
    ifNoneMatch: stored.decision_bundle_hash,
    method: "GET",
    path: `/v1/manifests/${encodeURIComponent(stored.manifest_id)}/decision-bundle`,
  });
  expect(notModified.status).toBe(304);
  expect(notModified.body).toBeNull();
  expect(notModified.headers.ETag).toBe(stored.decision_bundle_hash);

  const staleHash = await handler({
    actorContext: actorContext(),
    correlationId: "corr.api.bundle.stale",
    ifNoneMatch: `${stored.decision_bundle_hash}.stale`,
    method: "GET",
    path: `/v1/manifests/${encodeURIComponent(stored.manifest_id)}/decision-bundle`,
  });
  expect(staleHash.status).toBe(200);
  expect(staleHash.body.artifact_type).toBe("DecisionBundle");
});

test("matching If-None-Match does not bypass authorization", async () => {
  const { repository, stored } = await persistedDecisionBundleFixture({
    manifestId: "manifest-api-bundle-hidden",
  });
  const handler = registerGetDecisionBundleRoute(
    {
      register: (route) => {
        void route;
      },
    },
    {
      authorizeRead: () => ({
        authorized: false,
        hidden: true,
      }),
      decisionBundleRepository: repository,
    },
  );

  const hidden = await handler({
    actorContext: actorContext(),
    correlationId: "corr.api.bundle.hidden",
    ifNoneMatch: stored.decision_bundle_hash,
    manifestId: stored.manifest_id,
    method: "GET",
  });

  expect(hidden.status).toBe(404);
  expect(hidden.body?.artifact_type).toBe("ProblemEnvelope");
  expect(hidden.body?.problem_code).toBe("DECISION_BUNDLE_NOT_READY");
});

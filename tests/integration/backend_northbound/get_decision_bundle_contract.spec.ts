import { expect, test } from "@playwright/test";

import { getDecisionBundleEndpoint } from "../../../packages/backend-northbound/src/index.ts";
import { persistedDecisionBundleFixture } from "../../unit/backend_northbound/decision_bundle_fixtures.ts";
import { actorContext } from "../../unit/backend_northbound/post_commands_fixtures.ts";

test("returns completed, blocked, and review-required persisted bundles with ETag", async () => {
  for (const [manifestId, outcomeClass, expectedStatus] of [
    ["manifest-bundle-completed", "FINAL_SUCCESS", "COMPLETED"],
    ["manifest-bundle-blocked", "FINAL_BLOCKED", "BLOCKED"],
    ["manifest-bundle-review", "HUMAN_REVIEW", "REVIEW_REQUIRED"],
  ] as const) {
    const { repository, stored } = await persistedDecisionBundleFixture({
      manifestId,
      outcomeClass,
    });

    const response = await getDecisionBundleEndpoint(
      {
        actorContext: actorContext(),
        correlationId: `corr.bundle.${manifestId}`,
        manifestId,
        method: "GET",
      },
      {
        decisionBundleRepository: repository,
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers["Cache-Control"]).toBe("no-store");
    expect(response.headers.ETag).toBe(stored.decision_bundle_hash);
    expect(response.body.artifact_type).toBe("DecisionBundle");
    expect(response.body.manifest_id).toBe(manifestId);
    expect(response.body.decision_status).toBe(expectedStatus);
    expect(response.body.decision_reason_codes).toEqual(response.body.reason_codes.slice(0, 3));
  }
});

test("latest persisted bundle for a manifest wins current-only readback", async () => {
  const { repository } = await persistedDecisionBundleFixture({
    decisionBundleId: "decision-bundle.manifest-current.first",
    manifestId: "manifest-bundle-current",
    outcomeClass: "HUMAN_REVIEW",
    persistedAt: "2026-05-03T10:00:00.000Z",
  });
  const { stored: latest } = await persistedDecisionBundleFixture({
    decisionBundleId: "decision-bundle.manifest-current.second",
    manifestId: "manifest-bundle-current",
    outcomeClass: "FINAL_SUCCESS",
    persistedAt: "2026-05-03T10:05:00.000Z",
    repository,
  });

  const response = await getDecisionBundleEndpoint(
    {
      actorContext: actorContext(),
      manifestId: "manifest-bundle-current",
      method: "GET",
    },
    {
      decisionBundleRepository: repository,
    },
  );

  expect(response.status).toBe(200);
  expect(response.body.decision_bundle_id).toBe(latest.decision_bundle_id);
  expect(response.headers.ETag).toBe(latest.decision_bundle_hash);
});

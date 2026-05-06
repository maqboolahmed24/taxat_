import { expect, test } from "@playwright/test";

import {
  applyDecisionBundleConditionalRequest,
  getDecisionBundleEndpoint,
} from "../../../packages/backend-northbound/src/index.ts";
import { persistedDecisionBundleFixture } from "./decision_bundle_fixtures.ts";
import { actorContext } from "./post_commands_fixtures.ts";

test("conditional request matches only the current decision bundle hash", () => {
  expect(
    applyDecisionBundleConditionalRequest({
      currentDecisionBundleHash: "decision-bundle-content-hash://live",
      ifNoneMatch: "decision-bundle-content-hash://live",
    }),
  ).toMatchObject({
    etag: "decision-bundle-content-hash://live",
    status: "NOT_MODIFIED",
  });
  expect(
    applyDecisionBundleConditionalRequest({
      currentDecisionBundleHash: "decision-bundle-content-hash://live",
      ifNoneMatch: '"decision-bundle-content-hash://live"',
    }).status,
  ).toBe("NOT_MODIFIED");
  expect(
    applyDecisionBundleConditionalRequest({
      currentDecisionBundleHash: "decision-bundle-content-hash://live",
      ifNoneMatch: "decision-bundle-content-hash://old, decision-bundle-content-hash://live",
    }).status,
  ).toBe("NOT_MODIFIED");
  expect(
    applyDecisionBundleConditionalRequest({
      currentDecisionBundleHash: "decision-bundle-content-hash://live",
      ifNoneMatch: "*",
    }).status,
  ).toBe("SEND_BODY");
  expect(
    applyDecisionBundleConditionalRequest({
      currentDecisionBundleHash: "decision-bundle-content-hash://live",
      ifNoneMatch: 'W/"decision-bundle-content-hash://live"',
    }).status,
  ).toBe("SEND_BODY");
});

test("304 is emitted only after the current actor is authorized", async () => {
  const { repository, stored } = await persistedDecisionBundleFixture({
    manifestId: "manifest-etag-auth",
  });

  const authorized = await getDecisionBundleEndpoint(
    {
      actorContext: actorContext(),
      ifNoneMatch: stored.decision_bundle_hash,
      manifestId: stored.manifest_id,
      method: "GET",
    },
    {
      authorizeRead: () => ({
        authorized: true,
      }),
      decisionBundleRepository: repository,
    },
  );
  expect(authorized.status).toBe(304);
  expect(authorized.body).toBeNull();
  expect(authorized.headers.ETag).toBe(stored.decision_bundle_hash);

  const hidden = await getDecisionBundleEndpoint(
    {
      actorContext: actorContext(),
      ifNoneMatch: stored.decision_bundle_hash,
      manifestId: stored.manifest_id,
      method: "GET",
    },
    {
      authorizeRead: () => ({
        authorized: false,
        hidden: true,
        reasonCodes: ["DECISION_BUNDLE_SCOPE_HIDDEN"],
      }),
      decisionBundleRepository: repository,
    },
  );
  expect(hidden.status).toBe(404);
  expect(hidden.body?.artifact_type).toBe("ProblemEnvelope");
  expect(hidden.body?.problem_code).toBe("DECISION_BUNDLE_NOT_READY");
});

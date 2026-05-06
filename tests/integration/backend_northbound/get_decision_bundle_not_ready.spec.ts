import { expect, test } from "@playwright/test";

import { DecisionBundleRepository } from "../../../packages/backend-compute/src/repositories/decision_bundle_repository.ts";
import { getDecisionBundleEndpoint } from "../../../packages/backend-northbound/src/index.ts";
import { actorContext } from "../../unit/backend_northbound/post_commands_fixtures.ts";

test("no persisted bundle returns typed not-ready problem instead of empty success", async () => {
  const response = await getDecisionBundleEndpoint(
    {
      actorContext: actorContext(),
      correlationId: "corr.bundle.not-ready",
      manifestId: "manifest-bundle-not-ready",
      method: "GET",
    },
    {
      decisionBundleRepository: new DecisionBundleRepository(),
    },
  );

  expect(response.status).toBe(404);
  expect(response.headers["Cache-Control"]).toBe("no-store");
  expect(response.body.artifact_type).toBe("ProblemEnvelope");
  expect(response.body.problem_code).toBe("DECISION_BUNDLE_NOT_READY");
  expect(response.body.manifest_id).toBe("manifest-bundle-not-ready");
  expect(response.body.reason_codes).toEqual(["DECISION_BUNDLE_NOT_READY"]);
  expect(response.body.rebase_required).toBe(false);
});

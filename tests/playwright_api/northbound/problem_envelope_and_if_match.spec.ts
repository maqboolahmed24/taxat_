import { expect, test } from "@playwright/test";

import {
  applyIfMatchPreconditionGuard,
  buildPreconditionFailedProblemEnvelope,
} from "../../../packages/backend-northbound/src/index.ts";
import { validateContractSchema } from "../../unit/backend_northbound/audit_and_enquiry_fixtures.ts";

test("problem envelope and If-Match transport helpers expose API-safe status and headers", async () => {
  const failed = applyIfMatchPreconditionGuard({
    authoritative: "policy.snapshot.current",
    correlationId: "corr.pc0167.api.if-match",
    ifMatch: '"policy.snapshot.stale"',
    requireIfMatch: true,
    suggestedDetailSurfaceCode: "AUDIT_TRAIL",
  });

  expect(failed.outcome).toBe("FAILED");
  if (failed.outcome !== "FAILED") {
    throw new Error("expected failed If-Match response");
  }
  expect(failed.status).toBe(412);
  expect(failed.headers["Cache-Control"]).toBe("no-store");
  expect(failed.headers.ETag).toBe("policy.snapshot.current");
  await validateContractSchema("problem_envelope", failed.body);

  const direct = buildPreconditionFailedProblemEnvelope({
    audience: "PORTAL",
    correlationId: "corr.pc0167.api.portal",
    suggestedDetailSurfaceCode: "AUDIT_TRAIL",
  });
  expect(direct.body.suggested_detail_surface_code).toBe("CUSTOMER_ACTIVITY");
  await validateContractSchema("problem_envelope", direct.body);
});

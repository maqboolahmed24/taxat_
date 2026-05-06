import { expect, test } from "@playwright/test";

import { buildRouteStabilityContract } from "../../../apps/control-plane-api/src/northbound/index.ts";
import {
  applyIfMatchPreconditionGuard,
  buildStaleViewProblemEnvelope,
  deriveAuthoritativeEtag,
  restrictProblemRecoveryFamily,
  selectPortalSafeDetailSurface,
  validateCommandEnvelope,
  validateIfMatchAgainstAuthoritativeGuard,
} from "../../../packages/backend-northbound/src/index.ts";
import { validateContractSchema } from "./audit_and_enquiry_fixtures.ts";
import {
  actorContext,
  workItemCommandEnvelope,
  workspaceRouteState,
} from "./post_commands_fixtures.ts";

test("builds a schema-valid stale-view problem with one coherent recovery family", async () => {
  const parsed = await validateCommandEnvelope({
    actorContext: actorContext(),
    envelope: await workItemCommandEnvelope({
      if_match_work_item_version: 27,
    }),
  });
  const routeState = workspaceRouteState();
  const response = buildStaleViewProblemEnvelope({
    correlationId: "corr.pc0167.stale",
    latestStabilityContract: buildRouteStabilityContract(routeState),
    latestStaleGuardValue: 28,
    mutationPreconditionBinding: parsed.command.mutation_precondition_binding,
    recoveryRefs: {
      latestCommandReceiptRef: "receipt.pc0167.stale",
      latestWorkspaceSnapshotRef: "workspace.snapshot.live",
    },
    staleGuardFamily: "WORK_ITEM_VERSION",
  });

  expect(response.status).toBe(409);
  expect(response.body.problem_code).toBe("VIEW_STALE");
  expect(response.body.latest_workspace_snapshot_ref).toBe("workspace.snapshot.live");
  expect(response.body.latest_client_portal_workspace_ref).toBeNull();
  expect(response.body.latest_policy_snapshot_ref).toBeNull();
  expect(response.body.latest_stale_guard_value).toBe(28);
  await validateContractSchema("problem_envelope", response.body);
});

test("rejects mixed recovery families and clamps portal detail surfaces", () => {
  expect(() =>
    restrictProblemRecoveryFamily({
      refs: {
        latestCommandReceiptRef: "receipt.mixed",
        latestPolicySnapshotRef: "policy.live",
        latestWorkspaceSnapshotRef: "workspace.live",
      },
    }),
  ).toThrow(/multiple non-manifest recovery families/);

  expect(
    selectPortalSafeDetailSurface({
      audience: "PORTAL",
      preferredSurface: "AUDIT_TRAIL",
      recoveryFamily: "PORTAL_WORKSPACE",
    }),
  ).toBe("CUSTOMER_ACTIVITY");
  expect(
    selectPortalSafeDetailSurface({
      audience: "PORTAL",
      preferredSurface: "AUDIT_TRAIL",
      recoveryFamily: "PORTAL_UPLOAD",
    }),
  ).toBe("FILES");
});

test("validates If-Match with strong authoritative validators only", async () => {
  const current = deriveAuthoritativeEtag({
    basis: "GUARD_VALUE",
    staleGuardFamily: "DECISION_BUNDLE_HASH",
    value: "decision-bundle-hash.current",
  });

  expect(
    validateIfMatchAgainstAuthoritativeGuard({
      authoritative: current,
      ifMatch: '"decision-bundle-hash.current"',
      requireIfMatch: true,
    }).outcome,
  ).toBe("MATCH");
  expect(
    validateIfMatchAgainstAuthoritativeGuard({
      authoritative: current,
      ifMatch: 'W/"decision-bundle-hash.current"',
      requireIfMatch: true,
    }).outcome,
  ).toBe("INVALID");

  let mutationCount = 0;
  const guard = applyIfMatchPreconditionGuard({
    authoritative: current,
    correlationId: "corr.pc0167.if-match",
    ifMatch: '"decision-bundle-hash.stale"',
    requireIfMatch: true,
  });
  if (guard.outcome === "PASSED") {
    mutationCount += 1;
  }

  expect(guard.outcome).toBe("FAILED");
  if (guard.outcome !== "FAILED") {
    throw new Error("expected failed precondition guard");
  }
  expect(guard.status).toBe(412);
  expect(guard.headers.ETag).toBe(current);
  expect(mutationCount).toBe(0);
  await validateContractSchema("problem_envelope", guard.body);
});

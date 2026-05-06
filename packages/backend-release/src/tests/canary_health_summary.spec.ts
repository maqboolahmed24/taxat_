import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  deriveCandidateIdentityContract,
  evaluateCanaryHealthSummary,
  normalizeCanaryHealthSummaryRecord,
} from "../index.ts";

const candidateIdentityContract = deriveCandidateIdentityContract({
  artifact_digest:
    "sha256:pc0220canary907775aeb31c49363ee96508f756d6273c42eda8a99694c7cf6cef62cd1d",
  build_artifact_ref: "build.pc0220.release.0001",
  candidate_environment_ref: "candidate-env.preproduction.pc0220",
  config_bundle_hash: "config-bundle-hash.pc0220",
  enabled_provider_profile_refs: ["provider.github-actions.oidc", "provider.sigstore.keyless"],
  migration_plan_ref_or_null: null,
  schema_bundle_hash: "schema-bundle-hash.pc0220",
  supported_client_window_ref_or_null: "client-window.operator.stable.pc0220",
});

function canarySummaryFixture(overrides: {
  latency_budget_state?: "WITHIN_BUDGET" | "BREACHED";
  error_budget_state?: "WITHIN_BUDGET" | "BREACHED";
  abort_recommended?: boolean;
  evaluated_at?: string;
} = {}) {
  return evaluateCanaryHealthSummary({
    candidate_identity_contract: candidateIdentityContract,
    canary_fraction: 0.05,
    slo_profile_ref: "slo-profile://pc0220/preprod",
    error_budget_profile_ref: "error-budget-profile://pc0220/preprod",
    latency_budget_state: overrides.latency_budget_state ?? "WITHIN_BUDGET",
    error_budget_state: overrides.error_budget_state ?? "WITHIN_BUDGET",
    summary_ref: "canary-report://pc0220/preprod/0001",
    evaluated_at: overrides.evaluated_at ?? "2026-05-05T10:15:00+00:00",
    abort_recommended: overrides.abort_recommended,
  });
}

test("maps canary budget posture into schema-valid health gates", async () => {
  const green = canarySummaryFixture();
  const latencyBreach = canarySummaryFixture({
    latency_budget_state: "BREACHED",
    evaluated_at: "2026-05-05T10:16:00Z",
  });
  const explicitAbort = canarySummaryFixture({
    error_budget_state: "BREACHED",
    abort_recommended: true,
    evaluated_at: "2026-05-05T10:17:00Z",
  });
  const red = canarySummaryFixture({
    latency_budget_state: "BREACHED",
    error_budget_state: "BREACHED",
    evaluated_at: "2026-05-05T10:18:00Z",
  });

  expect(green).toMatchObject({
    health_gate_state: "GREEN",
    abort_recommended: false,
    evaluated_at: "2026-05-05T10:15:00Z",
  });
  expect(latencyBreach).toMatchObject({
    health_gate_state: "AMBER",
    abort_recommended: false,
  });
  expect(explicitAbort).toMatchObject({
    health_gate_state: "RED",
    abort_recommended: true,
  });
  expect(red).toMatchObject({
    health_gate_state: "RED",
    abort_recommended: true,
  });

  await validateContractSchema("canary_health_summary", green);
  await validateContractSchema("canary_health_summary", latencyBreach);
  await validateContractSchema("canary_health_summary", explicitAbort);
  await validateContractSchema("canary_health_summary", red);
});

test("rejects canary summaries whose posture or candidate tuple mirrors drift", () => {
  const green = canarySummaryFixture();

  expect(() =>
    normalizeCanaryHealthSummaryRecord({
      ...green,
      latency_budget_state: "BREACHED",
      health_gate_state: "GREEN",
    }),
  ).toThrow("CANARY_HEALTH_POSTURE_INVALID");

  expect(() =>
    normalizeCanaryHealthSummaryRecord({
      ...green,
      candidate_identity_hash: "stale-candidate-hash",
    }),
  ).toThrow("RELEASE_CANDIDATE_IDENTITY_CONTRACT_INVALID");
});

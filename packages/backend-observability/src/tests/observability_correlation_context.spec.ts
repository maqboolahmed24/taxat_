import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  buildObservabilityCorrelationContext,
} from "../index.ts";
import {
  sampleBranchDecision,
  sampleStartClaim,
  sampleTelemetryResource,
} from "./fixtures.ts";

test("builds one resource-backed correlation context with branch and start-claim mirrors", async () => {
  const resource = sampleTelemetryResource();
  const context = buildObservabilityCorrelationContext({
    manifestBranchDecision: sampleBranchDecision(),
    manifestStartClaim: sampleStartClaim(),
    manifest_lineage_trace_ref: "manifest-lineage-trace://pc0214",
    resource,
    spanSeed: "start-claim",
    traceSeed: "manifest.pc0214",
  });

  expect(context.service_name).toBe(resource.service_name);
  expect(context.environment_ref).toBe(resource.environment_ref);
  expect(context.code_build_id).toBe(resource.build_ref);
  expect(context.manifest_id).toBe("manifest.pc0214");
  expect(context.access_binding_hash).toBe("access-binding-hash.pc0214");
  expect(context.manifest_branch_decision?.selected_manifest_id).toBe("manifest.pc0214");
  expect(context.manifest_start_claim?.claim_state).toBe("ACTIVE_LEASED");
  await validateContractSchema("telemetry_resource", resource);
});

test("rejects branch, nightly, and replay correlation drift before any signal is emitted", () => {
  expect(() =>
    buildObservabilityCorrelationContext({
      manifestBranchDecision: sampleBranchDecision(),
      manifest_id: "manifest.drift",
      manifest_lineage_trace_ref: "manifest-lineage-trace://pc0214",
    }),
  ).toThrow(/BRANCH_MIRROR_DRIFT/);

  expect(() =>
    buildObservabilityCorrelationContext({
      nightly_batch_run_ref: "nightly-batch://pc0214",
      nightly_window_key: "2026-05-05",
      run_kind: "INTERACTIVE",
    }),
  ).toThrow(/NIGHTLY_DRIFT/);

  expect(() =>
    buildObservabilityCorrelationContext({
      replay_class: "STANDARD_REPLAY",
      run_kind: "INTERACTIVE",
    }),
  ).toThrow(/REPLAY_DRIFT/);
});

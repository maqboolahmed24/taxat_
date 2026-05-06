import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  recordLogRecord,
  recordMetricEvent,
  recordTraceSpan,
} from "../index.ts";
import {
  sampleBranchDecision,
  sampleStartClaim,
  sampleTelemetryResource,
} from "./fixtures.ts";

test("records nightly and replay root spans with required correlation", async () => {
  const resource = sampleTelemetryResource();
  const nightly = recordTraceSpan({
    correlationContext: {
      client_id: "client.pc0214",
      manifest_id: "manifest.nightly.pc0214",
      mode: "COMPLIANCE",
      nightly_batch_run_ref: "nightly-batch://pc0214",
      nightly_window_key: "2026-05-05",
      run_kind: "NIGHTLY",
      tenant_id: "tenant.pc0214",
    },
    endedAtOrNull: "2026-05-05T09:30:30Z",
    manifestId: "manifest.nightly.pc0214",
    resource,
    spanCode: "RUN_ROOT",
    spanSeed: "nightly-root",
    startedAt: "2026-05-05T09:30:00Z",
    statusCode: "OK",
    traceSeed: "nightly-root",
  });
  const replay = recordTraceSpan({
    correlationContext: {
      actual_execution_basis_hash: "execution-basis-hash.pc0214",
      basis_validation_state: "VALID",
      comparison_mode: "EXACT_HASH_MATCH",
      expected_execution_basis_hash: "execution-basis-hash.pc0214",
      manifest_id: "manifest.replay.pc0214",
      mode: "COMPLIANCE",
      replay_class: "STANDARD_REPLAY",
      replay_of_manifest_id: "manifest.original.pc0214",
      run_kind: "REPLAY",
      tenant_id: "tenant.pc0214",
    },
    endedAtOrNull: "2026-05-05T09:31:30Z",
    manifestId: "manifest.replay.pc0214",
    resource,
    spanCode: "RUN_ROOT",
    spanSeed: "replay-root",
    startedAt: "2026-05-05T09:31:00Z",
    statusCode: "OK",
    traceSeed: "replay-root",
  });

  expect(nightly.correlation_context.nightly_batch_run_ref).toBe("nightly-batch://pc0214");
  expect(replay.correlation_context.replay_class).toBe("STANDARD_REPLAY");
  await validateContractSchema("trace_span", nightly);
  await validateContractSchema("trace_span", replay);
});

test("records branch-decision and start-claim spans without bundle-return drift", async () => {
  const resource = sampleTelemetryResource();
  const parent = recordTraceSpan({
    correlationContext: {
      manifest_id: "manifest.pc0214",
      mode: "COMPLIANCE",
      root_manifest_id: "manifest.pc0214",
      run_kind: "INTERACTIVE",
      tenant_id: "tenant.pc0214",
    },
    endedAtOrNull: "2026-05-05T09:35:01Z",
    manifestId: "manifest.pc0214",
    resource,
    spanCode: "RUN_ROOT",
    spanSeed: "interactive-root",
    startedAt: "2026-05-05T09:35:00Z",
    statusCode: "OK",
    traceSeed: "interactive-root",
  });
  const config = recordTraceSpan({
    correlationContext: {
      manifest_branch_decision: sampleBranchDecision({
        branch_action: "NEW_REQUEST_CHILD",
        branch_reason_code: "REQUEST_IDENTITY_CHANGED",
        config_inheritance_mode_or_null: "FRESH_CHILD_RESOLUTION",
        continuation_of_manifest_id_or_null: "manifest.parent.pc0214",
        input_inheritance_mode_or_null: "FRESH_CHILD_COLLECTION",
        parent_manifest_id_or_null: "manifest.parent.pc0214",
        prior_manifest_hash_at_decision_or_null: "manifest-parent-hash.pc0214",
        prior_manifest_id_or_null: "manifest.parent.pc0214",
        prior_manifest_lifecycle_state_or_null: "COMPLETED",
        selected_manifest_continuation_basis: "NEW_REQUEST_CHILD",
        selected_manifest_generation: 1,
      }),
      manifest_lineage_trace_ref: "manifest-lineage-trace://pc0214",
      span_id: parent.span_id,
      trace_id: parent.trace_id,
    },
    endedAtOrNull: "2026-05-05T09:35:04Z",
    manifestId: "manifest.pc0214",
    parentSpanIdOrNull: parent.span_id,
    resource,
    spanAttributes: {
      config_resolution_ref: "config-resolution://pc0214",
    },
    spanCode: "CONFIG_RESOLVE_OR_INHERITANCE_DECISION",
    spanSeed: "config-resolution",
    startedAt: "2026-05-05T09:35:02Z",
    statusCode: "OK",
  });
  const startClaim = recordTraceSpan({
    correlationContext: {
      manifest_branch_decision: sampleBranchDecision({
        branch_action: "NEW_REQUEST_CHILD",
        branch_reason_code: "REQUEST_IDENTITY_CHANGED",
        config_inheritance_mode_or_null: "FRESH_CHILD_RESOLUTION",
        continuation_of_manifest_id_or_null: "manifest.parent.pc0214",
        input_inheritance_mode_or_null: "FRESH_CHILD_COLLECTION",
        parent_manifest_id_or_null: "manifest.parent.pc0214",
        prior_manifest_hash_at_decision_or_null: "manifest-parent-hash.pc0214",
        prior_manifest_id_or_null: "manifest.parent.pc0214",
        prior_manifest_lifecycle_state_or_null: "COMPLETED",
        selected_manifest_continuation_basis: "NEW_REQUEST_CHILD",
        selected_manifest_generation: 1,
      }),
      manifest_lineage_trace_ref: "manifest-lineage-trace://pc0214",
      manifest_start_claim: sampleStartClaim(),
      span_id: parent.span_id,
      trace_id: parent.trace_id,
    },
    endedAtOrNull: "2026-05-05T09:35:07Z",
    manifestId: "manifest.pc0214",
    parentSpanIdOrNull: parent.span_id,
    resource,
    spanAttributes: {
      start_claim_publication_ref: "outbox-batch://pc0214",
    },
    spanCode: "MANIFEST_START_CLAIM",
    spanSeed: "start-claim",
    startedAt: "2026-05-05T09:35:05Z",
    statusCode: "OK",
  });

  expect(config.correlation_context.manifest_branch_decision?.branch_action).toBe(
    "NEW_REQUEST_CHILD",
  );
  expect(config.parent_span_id).toBe(parent.span_id);
  expect(config.span_id).not.toBe(parent.span_id);
  expect(startClaim.correlation_context.manifest_start_claim?.claim_state).toBe(
    "ACTIVE_LEASED",
  );
  expect(startClaim.parent_span_id).toBe(parent.span_id);
  expect(startClaim.span_id).not.toBe(parent.span_id);
  await validateContractSchema("trace_span", config);
  await validateContractSchema("trace_span", startClaim);
});

test("records nightly metrics and secret-safe structured logs", async () => {
  const resource = sampleTelemetryResource();
  const metric = recordMetricEvent({
    correlationContext: {
      manifest_id: "manifest.nightly.pc0214",
      mode: "COMPLIANCE",
      nightly_batch_run_ref: "nightly-batch://pc0214",
      nightly_window_key: "2026-05-05",
      run_kind: "NIGHTLY",
      selection_disposition: "EXECUTE_NEW_MANIFEST",
      tenant_id: "tenant.pc0214",
    },
    metricFamily: "NIGHTLY_SELECTION_DISPOSITION_COUNT",
    observedAt: "2026-05-05T09:40:00Z",
    resource,
    unit: "count",
    value: 1,
  });
  const log = recordLogRecord({
    correlationContext: {
      error_id: "error://pc0214/replay",
      manifest_id: "manifest.replay.pc0214",
      replay_class: "STANDARD_REPLAY",
      replay_of_manifest_id: "manifest.original.pc0214",
      run_kind: "REPLAY",
      tenant_id: "tenant.pc0214",
    },
    eventCode: "REPLAY_RECOVERY_REBASE_RECORDED",
    logFamily: "RUNTIME",
    messageTemplate: "Replay recovery posture changed",
    resource,
    severity: "ERROR",
    structuredFields: {
      error_code: "REPLAY_REBASE_REQUIRED",
      failure_class: "RECOVERY",
      failure_phase: "REPLAY",
      recovery_outcome: "REBASE_REQUIRED",
    },
    timestamp: "2026-05-05T09:41:00Z",
  });

  expect(metric.dimensions.selection_disposition).toBe("EXECUTE_NEW_MANIFEST");
  expect(log.access_tier).toBe("STANDARD_OPERATIONS");
  await validateContractSchema("metric_event", metric);
  await validateContractSchema("log_record", log);

  expect(() =>
    recordLogRecord({
      correlationContext: {
        manifest_id: "manifest.pc0214",
        tenant_id: "tenant.pc0214",
      },
      eventCode: "AUTHORITY_SECRET_LEAK_ATTEMPT",
      logFamily: "RUNTIME",
      messageTemplate: "Authority edge rejected unsafe field",
      resource,
      severity: "WARN",
      structuredFields: {
        token_value: "Bearer unsafe",
      },
      timestamp: "2026-05-05T09:42:00Z",
    }),
  ).toThrow(/secret-like/);
});

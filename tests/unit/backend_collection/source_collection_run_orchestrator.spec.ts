import { expect, test } from "@playwright/test";

import {
  SourceCollectionRunModelError,
  SourceCollectionRunOrchestrator,
  SourceCollectionRunRepository,
  SourceCollectionRunTransitionError,
  buildSourceCollectionRun,
  createOrReuseSourceCollectionRun,
  normalizeSourceCollectionRunRecord,
  rollupFetchResults,
  sourceWindowRef,
  transitionSourceCollectionRun,
} from "../../../packages/backend-collection/src/index.ts";

function sequenceClock(...instants: string[]) {
  let index = 0;
  return () => {
    if (instants.length === 0) {
      throw new Error("sequenceClock requires at least one instant");
    }
    const value = instants[Math.min(index, instants.length - 1)];
    index += 1;
    return value!;
  };
}

test("source collection run creation reserves a stable future source-window anchor", async () => {
  const repository = new SourceCollectionRunRepository();
  const first = await createOrReuseSourceCollectionRun({
    created_at: "2026-04-26T08:00:00Z",
    manifest_id: "manifest.collection.0110.anchor",
    repository,
  });
  const second = await createOrReuseSourceCollectionRun({
    created_at: "2026-04-26T08:05:00Z",
    manifest_id: "manifest.collection.0110.anchor",
    repository,
  });

  expect(first.reused_existing).toBe(false);
  expect(second.reused_existing).toBe(true);
  expect(second.stored_run).toEqual(first.stored_run);
  expect(first.stored_run.collection_run.lifecycle_state).toBe("NOT_STARTED");
  expect(first.stored_run.collection_run.started_at_or_null).toBeNull();
  expect(first.stored_run.collection_run.completed_at_or_null).toBeNull();
  expect(first.stored_run.source_window_ref).toBe(
    sourceWindowRef({ source_window_id: "source-window.manifest.collection.0110.anchor" }),
  );
});

test("state model rejects invalid timestamp and reason/gap shapes", () => {
  const run = buildSourceCollectionRun({
    created_at: "2026-04-26T09:00:00Z",
    manifest_id: "manifest.collection.0110.shape",
  });

  expect(() =>
    normalizeSourceCollectionRunRecord({
      ...run,
      completed_at_or_null: "2026-04-26T08:59:00Z",
      failure_reason_code_or_null: "FATAL_PROVIDER_FAILURE",
      lifecycle_state: "FAILED",
      started_at_or_null: "2026-04-26T09:00:00Z",
      state_transition_contract: {
        ...run.state_transition_contract,
        current_state: "FAILED",
      },
    }),
  ).toThrow(SourceCollectionRunModelError);

  expect(() =>
    normalizeSourceCollectionRunRecord({
      ...run,
      completed_at_or_null: "2026-04-26T09:10:00Z",
      lifecycle_state: "PARTIAL",
      started_at_or_null: "2026-04-26T09:00:00Z",
      state_transition_contract: {
        ...run.state_transition_contract,
        current_state: "PARTIAL",
      },
    }),
  ).toThrow(SourceCollectionRunModelError);

  expect(() =>
    normalizeSourceCollectionRunRecord({
      ...run,
      completed_at_or_null: "2026-04-26T09:10:00Z",
      failure_reason_code_or_null: "UNBOUNDED_TEXT" as "FATAL_PROVIDER_FAILURE",
      lifecycle_state: "FAILED",
      started_at_or_null: "2026-04-26T09:00:00Z",
      state_transition_contract: {
        ...run.state_transition_contract,
        current_state: "FAILED",
      },
    }),
  ).toThrow(SourceCollectionRunModelError);
});

test("transition helper enforces legal state-machine moves and terminal fields", () => {
  const run = buildSourceCollectionRun({
    created_at: "2026-04-26T10:00:00Z",
    manifest_id: "manifest.collection.0110.transitions",
  });
  const fetching = transitionSourceCollectionRun({
    event_code: "fetch_begin",
    run,
    transitioned_at: "2026-04-26T10:01:00Z",
    transition_audit_ref: "audit://run/fetch-begin",
  });
  const partial = transitionSourceCollectionRun({
    event_code: "some_sources_returned_with_gaps",
    fetch_audit_refs: ["audit://fetch/b", "audit://fetch/a", "audit://fetch/a"],
    partial_gap_refs: ["partial-gap://vat/MISSING_AT_CUTOFF"],
    run: fetching,
    transitioned_at: "2026-04-26T10:05:00Z",
    transition_audit_ref: "audit://run/partial",
  });
  const abandoned = transitionSourceCollectionRun({
    abandoned_reason_code: "OPERATOR_ABORT",
    event_code: "operator_abort",
    run: partial,
    transitioned_at: "2026-04-26T10:07:00Z",
    transition_audit_ref: "audit://run/abort",
  });

  expect(partial.lifecycle_state).toBe("PARTIAL");
  expect(partial.fetch_audit_refs).toEqual(["audit://fetch/a", "audit://fetch/b"]);
  expect(abandoned.lifecycle_state).toBe("ABANDONED");
  expect(abandoned.abandoned_reason_code_or_null).toBe("OPERATOR_ABORT");

  expect(() =>
    transitionSourceCollectionRun({
      event_code: "all_sources_returned",
      run,
      transitioned_at: "2026-04-26T10:02:00Z",
      transition_audit_ref: "audit://run/illegal",
    }),
  ).toThrow(SourceCollectionRunTransitionError);

  expect(() =>
    transitionSourceCollectionRun({
      event_code: "fatal_provider_failure",
      run: fetching,
      transitioned_at: "2026-04-26T10:03:00Z",
      transition_audit_ref: "audit://run/failure",
    }),
  ).toThrow(SourceCollectionRunTransitionError);
});

test("fetch rollup keeps fatal failures from being normalized into fetched", () => {
  const rollup = rollupFetchResults({
    results: [
      {
        fetch_audit_refs: ["audit://fetch/success"],
        outcome_code: "SOURCE_FETCHED",
        page_audit_refs: ["audit://page/1"],
        source_domain: "income_sources",
      },
      {
        failure_reason_code_or_null: "DISPATCH_FATAL_FAILURE",
        fetch_audit_refs: ["audit://fetch/fatal"],
        outcome_code: "SOURCE_FATAL_FAILURE",
        source_domain: "vat_obligations",
      },
    ],
  });

  expect(rollup.terminal_state).toBe("FAILED");
  expect(rollup.failure_reason_code_or_null).toBe("DISPATCH_FATAL_FAILURE");
  expect(rollup.fetch_audit_refs).toEqual([
    "audit://fetch/fatal",
    "audit://fetch/success",
    "audit://page/1",
  ]);
  expect(rollup.partial_gap_refs).toEqual([]);
});

test("orchestrator drives successful and partial fetches through CAS persistence", async () => {
  const successRepository = new SourceCollectionRunRepository();
  const successOrchestrator = new SourceCollectionRunOrchestrator({
    dispatch: async () => [
      {
        fetch_audit_refs: ["audit://fetch/2", "audit://fetch/1", "audit://fetch/1"],
        outcome_code: "SOURCE_FETCHED",
        page_audit_refs: ["audit://page/1"],
        source_domain: "income_sources",
      },
    ],
    now: sequenceClock("2026-04-26T11:01:00Z", "2026-04-26T11:02:00Z"),
    repository: successRepository,
  });
  const success = await successOrchestrator.runManifestCollection({
    created_at: "2026-04-26T11:00:00Z",
    manifest_id: "manifest.collection.0110.success",
  });

  expect(success.action).toBe("CREATED_AND_FETCHED");
  expect(success.stored_run.collection_run.lifecycle_state).toBe("FETCHED");
  expect(success.stored_run.collection_run.fetch_audit_refs).toEqual([
    "audit://fetch/1",
    "audit://fetch/2",
    "audit://page/1",
  ]);

  const partialRepository = new SourceCollectionRunRepository();
  const partialOrchestrator = new SourceCollectionRunOrchestrator({
    dispatch: async () => [
      {
        fetch_audit_refs: ["audit://fetch/partial"],
        outcome_code: "SOURCE_PARTIAL_GAP",
        partial_gap_code_or_null: "MISSING_AT_CUTOFF",
        source_domain: "vat_obligations",
      },
    ],
    now: sequenceClock("2026-04-26T12:01:00Z", "2026-04-26T12:02:00Z"),
    repository: partialRepository,
  });
  const partial = await partialOrchestrator.runManifestCollection({
    created_at: "2026-04-26T12:00:00Z",
    manifest_id: "manifest.collection.0110.partial",
  });
  const abandoned = await partialOrchestrator.abandonPartialRun({
    collection_run_id: partial.stored_run.collection_run_id,
    transitioned_at: "2026-04-26T12:03:00Z",
  });

  expect(partial.stored_run.collection_run.lifecycle_state).toBe("PARTIAL");
  expect(partial.stored_run.collection_run.partial_gap_refs).toEqual([
    "partial-gap://vat_obligations/MISSING_AT_CUTOFF",
  ]);
  expect(abandoned.collection_run.lifecycle_state).toBe("ABANDONED");
  expect(await partialRepository.listTransitions(partial.stored_run.collection_run_id)).toHaveLength(3);
});

import type {
  SourceCollectionRunAbandonedReasonCode,
  SourceCollectionRunRecord,
} from "../models/source_collection_run.ts";
import {
  type SourceCollectionRunRepository,
  type StoredSourceCollectionRunRecord,
} from "../repositories/source_collection_run_repository.ts";
import type {
  SourceCollectionFetchOutcome,
  SourceCollectionFetchResultRollup,
} from "../types/source_collection_outcome.ts";
import { createOrReuseSourceCollectionRun } from "./create_source_collection_run.ts";
import { rollupFetchResults } from "./fetch_result_rollup.ts";
import { transitionSourceCollectionRun } from "./transition_source_collection_run.ts";

export type SourceCollectionRunDispatchInput = {
  collection_run: SourceCollectionRunRecord;
  collection_run_id: string;
  manifest_id: string;
  source_window_ref: string;
};

export type SourceCollectionRunDispatch = (
  input: SourceCollectionRunDispatchInput,
) => Promise<readonly SourceCollectionFetchOutcome[]>;

export type SourceCollectionRunOrchestrationResult = {
  action:
    | "CREATED_AND_FETCHED"
    | "CREATED_AND_FAILED"
    | "CREATED_AND_PARTIAL"
    | "REUSED_AND_FETCHED"
    | "REUSED_AND_FAILED"
    | "REUSED_AND_PARTIAL"
    | "REUSED_TERMINAL";
  created_new_run: boolean;
  rollup: SourceCollectionFetchResultRollup | null;
  stored_run: StoredSourceCollectionRunRecord;
};

export class SourceCollectionRunOrchestrator {
  private readonly dispatch: SourceCollectionRunDispatch;
  private readonly now: () => string;
  private readonly repository: SourceCollectionRunRepository;

  constructor(input: {
    dispatch: SourceCollectionRunDispatch;
    now?: () => string;
    repository: SourceCollectionRunRepository;
  }) {
    this.dispatch = input.dispatch;
    this.now = input.now ?? (() => new Date().toISOString());
    this.repository = input.repository;
  }

  private transitionAuditRef(collectionRunId: string, eventCode: string) {
    return `audit://source-collection-run/${collectionRunId}/${eventCode}`;
  }

  private async persistTransition(input: {
    event_code:
      | "fetch_begin"
      | "all_sources_returned"
      | "some_sources_returned_with_gaps"
      | "fatal_provider_failure"
      | "operator_abort";
    expected: StoredSourceCollectionRunRecord;
    next_run: SourceCollectionRunRecord;
    transitioned_at: string;
    transition_audit_ref: string;
  }) {
    return this.repository.compareAndSwapSourceCollectionRun({
      expected_source_collection_run_row_version:
        input.expected.source_collection_run_row_version,
      next_collection_run: input.next_run,
      persisted_at: input.transitioned_at,
      transition: {
        event_code: input.event_code,
        from_lifecycle_state: input.expected.lifecycle_state,
        to_lifecycle_state: input.next_run.lifecycle_state,
        transition_audit_ref: input.transition_audit_ref,
        transitioned_at: input.transitioned_at,
      },
    });
  }

  private async ensureFetchingRun(
    stored: StoredSourceCollectionRunRecord,
  ): Promise<StoredSourceCollectionRunRecord> {
    if (stored.lifecycle_state === "FETCHING") {
      return stored;
    }
    if (stored.lifecycle_state !== "NOT_STARTED") {
      return stored;
    }

    const transitionedAt = this.now();
    const transitionAuditRef = this.transitionAuditRef(stored.collection_run_id, "fetch_begin");
    const nextRun = transitionSourceCollectionRun({
      event_code: "fetch_begin",
      run: stored.collection_run,
      transitioned_at: transitionedAt,
      transition_audit_ref: transitionAuditRef,
    });
    return this.persistTransition({
      event_code: "fetch_begin",
      expected: stored,
      next_run: nextRun,
      transitioned_at: transitionedAt,
      transition_audit_ref: transitionAuditRef,
    });
  }

  async runManifestCollection(input: {
    audit_refs?: readonly string[];
    created_at?: string;
    manifest_id: string;
    provenance_refs?: readonly string[];
    source_window_id?: string;
  }): Promise<SourceCollectionRunOrchestrationResult> {
    const createdAt = input.created_at ?? this.now();
    const creation = await createOrReuseSourceCollectionRun({
      ...(input.audit_refs === undefined ? {} : { audit_refs: input.audit_refs }),
      created_at: createdAt,
      manifest_id: input.manifest_id,
      ...(input.provenance_refs === undefined ? {} : { provenance_refs: input.provenance_refs }),
      repository: this.repository,
      ...(input.source_window_id === undefined ? {} : { source_window_id: input.source_window_id }),
    });

    const fetchingOrTerminal = await this.ensureFetchingRun(creation.stored_run);
    if (fetchingOrTerminal.lifecycle_state !== "FETCHING") {
      return {
        action: "REUSED_TERMINAL",
        created_new_run: !creation.reused_existing,
        rollup: null,
        stored_run: fetchingOrTerminal,
      };
    }

    let results: readonly SourceCollectionFetchOutcome[];
    try {
      results = await this.dispatch({
        collection_run: fetchingOrTerminal.collection_run,
        collection_run_id: fetchingOrTerminal.collection_run_id,
        manifest_id: fetchingOrTerminal.manifest_id,
        source_window_ref: fetchingOrTerminal.source_window_ref,
      });
    } catch {
      results = [
        {
          failure_reason_code_or_null: "SYSTEM_FAULT",
          outcome_code: "SOURCE_FATAL_FAILURE",
          source_domain: "SOURCE_COLLECTION_DISPATCH",
        },
      ];
    }

    const rollup = rollupFetchResults({
      existing_fetch_audit_refs: fetchingOrTerminal.fetch_audit_refs,
      existing_partial_gap_refs: fetchingOrTerminal.partial_gap_refs,
      results,
    });
    const transitionedAt = this.now();

    if (rollup.terminal_state === "FETCHED") {
      const transitionAuditRef = this.transitionAuditRef(
        fetchingOrTerminal.collection_run_id,
        "all_sources_returned",
      );
      const nextRun = transitionSourceCollectionRun({
        event_code: "all_sources_returned",
        fetch_audit_refs: rollup.fetch_audit_refs,
        run: fetchingOrTerminal.collection_run,
        transitioned_at: transitionedAt,
        transition_audit_ref: transitionAuditRef,
      });
      const storedRun = await this.persistTransition({
        event_code: "all_sources_returned",
        expected: fetchingOrTerminal,
        next_run: nextRun,
        transitioned_at: transitionedAt,
        transition_audit_ref: transitionAuditRef,
      });
      return {
        action: creation.reused_existing ? "REUSED_AND_FETCHED" : "CREATED_AND_FETCHED",
        created_new_run: !creation.reused_existing,
        rollup,
        stored_run: storedRun,
      };
    }

    if (rollup.terminal_state === "PARTIAL") {
      const transitionAuditRef = this.transitionAuditRef(
        fetchingOrTerminal.collection_run_id,
        "some_sources_returned_with_gaps",
      );
      const nextRun = transitionSourceCollectionRun({
        event_code: "some_sources_returned_with_gaps",
        fetch_audit_refs: rollup.fetch_audit_refs,
        partial_gap_refs: rollup.partial_gap_refs,
        run: fetchingOrTerminal.collection_run,
        transitioned_at: transitionedAt,
        transition_audit_ref: transitionAuditRef,
      });
      const storedRun = await this.persistTransition({
        event_code: "some_sources_returned_with_gaps",
        expected: fetchingOrTerminal,
        next_run: nextRun,
        transitioned_at: transitionedAt,
        transition_audit_ref: transitionAuditRef,
      });
      return {
        action: creation.reused_existing ? "REUSED_AND_PARTIAL" : "CREATED_AND_PARTIAL",
        created_new_run: !creation.reused_existing,
        rollup,
        stored_run: storedRun,
      };
    }

    const transitionAuditRef = this.transitionAuditRef(
      fetchingOrTerminal.collection_run_id,
      "fatal_provider_failure",
    );
    const nextRun = transitionSourceCollectionRun({
      event_code: "fatal_provider_failure",
      failure_reason_code: rollup.failure_reason_code_or_null ?? "FATAL_PROVIDER_FAILURE",
      fetch_audit_refs: rollup.fetch_audit_refs,
      run: fetchingOrTerminal.collection_run,
      transitioned_at: transitionedAt,
      transition_audit_ref: transitionAuditRef,
    });
    const storedRun = await this.persistTransition({
      event_code: "fatal_provider_failure",
      expected: fetchingOrTerminal,
      next_run: nextRun,
      transitioned_at: transitionedAt,
      transition_audit_ref: transitionAuditRef,
    });
    return {
      action: creation.reused_existing ? "REUSED_AND_FAILED" : "CREATED_AND_FAILED",
      created_new_run: !creation.reused_existing,
      rollup,
      stored_run: storedRun,
    };
  }

  async abandonPartialRun(input: {
    abandoned_reason_code?: SourceCollectionRunAbandonedReasonCode;
    collection_run_id: string;
    transitioned_at?: string;
  }) {
    const stored = await this.repository.requireSourceCollectionRunById(input.collection_run_id);
    const transitionedAt = input.transitioned_at ?? this.now();
    const transitionAuditRef = this.transitionAuditRef(stored.collection_run_id, "operator_abort");
    const nextRun = transitionSourceCollectionRun({
      abandoned_reason_code: input.abandoned_reason_code ?? "OPERATOR_ABORT",
      event_code: "operator_abort",
      run: stored.collection_run,
      transitioned_at: transitionedAt,
      transition_audit_ref: transitionAuditRef,
    });
    return this.persistTransition({
      event_code: "operator_abort",
      expected: stored,
      next_run: nextRun,
      transitioned_at: transitionedAt,
      transition_audit_ref: transitionAuditRef,
    });
  }
}

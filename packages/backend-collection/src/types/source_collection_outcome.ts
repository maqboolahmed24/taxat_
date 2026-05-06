import type {
  SourceCollectionRunFailureReasonCode,
  SourceCollectionRunLifecycleState,
} from "../models/source_collection_run.ts";

export type SourceCollectionFetchOutcomeCode =
  | "SOURCE_FETCHED"
  | "SOURCE_EMPTY_CONFIRMED"
  | "SOURCE_PARTIAL_GAP"
  | "SOURCE_FATAL_FAILURE";

export type SourceCollectionPartialGapCode =
  | "MISSING_AT_CUTOFF"
  | "STALE_AT_CUTOFF"
  | "PARTIAL_PROVIDER_RESPONSE"
  | "MANUAL_CHECKPOINT_REQUIRED"
  | "NO_DATA_CONFIRMATION_MISSING";

export type SourceCollectionFetchOutcome = {
  fetch_audit_refs?: readonly string[];
  failure_reason_code_or_null?: SourceCollectionRunFailureReasonCode | null;
  outcome_code: SourceCollectionFetchOutcomeCode;
  page_audit_refs?: readonly string[];
  partial_gap_code_or_null?: SourceCollectionPartialGapCode | null;
  partial_gap_refs?: readonly string[];
  source_domain: string;
};

export type SourceCollectionTerminalLifecycleState = Extract<
  SourceCollectionRunLifecycleState,
  "FETCHED" | "PARTIAL" | "FAILED"
>;

export type SourceCollectionFetchResultRollup = {
  fetch_audit_refs: string[];
  failure_reason_code_or_null: SourceCollectionRunFailureReasonCode | null;
  partial_gap_refs: string[];
  terminal_state: SourceCollectionTerminalLifecycleState;
};

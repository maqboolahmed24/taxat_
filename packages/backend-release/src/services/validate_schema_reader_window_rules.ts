import {
  normalizeSchemaReaderWindowContract,
  type SchemaReaderWindowContractRecord,
  type SchemaReaderWindowState,
} from "../models/schema_reader_window_contract.ts";

export type NativeClientWindowState =
  | "NOT_APPLICABLE"
  | "VERIFIED_COMPATIBLE"
  | "BLOCKED";

export type SchemaReaderWindowRuleState = "ALLOWED" | "BLOCKED";

export type SchemaReaderWindowRuleResult = {
  reader_window_state: SchemaReaderWindowState;
  destructive_contract_state:
    | "BLOCKED_UNTIL_WINDOW_CLOSE"
    | "ELIGIBLE_AFTER_WINDOW_CLOSE";
  rollback_boundary_state: "ROLLBACK_ALLOWED" | "FAIL_FORWARD_ONLY";
  fail_forward_required: boolean;
  historical_manifest_guard_state: "PROTECTED" | "BLOCKED";
  replay_restore_guard_state: "PROTECTED" | "BLOCKED";
  native_client_window_state: NativeClientWindowState;
  overall_state: SchemaReaderWindowRuleState;
  reason_codes: string[];
};

export function validateSchemaReaderWindowRules(input: {
  contract: SchemaReaderWindowContractRecord;
  historical_schema_bundle_hash_or_null?: string | null;
  replay_reader_schema_bundle_hash_or_null?: string | null;
  exact_historical_bundle_available?: boolean;
  native_client_window_state?: NativeClientWindowState;
}): SchemaReaderWindowRuleResult {
  const contract = normalizeSchemaReaderWindowContract(input.contract);
  const nativeClientWindowState =
    input.native_client_window_state ?? "NOT_APPLICABLE";
  const reasonCodes = new Set<string>();
  const windowClosed =
    contract.window_state === "CONTRACT_ELIGIBLE_WINDOW_CLOSED";

  if (windowClosed) {
    reasonCodes.add("FAIL_FORWARD_REQUIRED_AFTER_WINDOW_CLOSE");
  } else {
    reasonCodes.add("DESTRUCTIVE_CHANGE_BLOCKED_UNTIL_WINDOW_CLOSED");
  }

  const historicalHash = input.historical_schema_bundle_hash_or_null;
  const historicalProtected =
    historicalHash === null ||
    typeof historicalHash === "undefined" ||
    contract.supported_reader_schema_bundle_hashes.includes(historicalHash) ||
    contract.protected_historical_schema_bundle_hashes.includes(historicalHash) ||
    historicalHash === contract.writer_schema_bundle_hash;
  if (!historicalProtected) {
    reasonCodes.add("HISTORICAL_SCHEMA_BUNDLE_NOT_SUPPORTED");
  }

  const replayReaderHash = input.replay_reader_schema_bundle_hash_or_null;
  const replayProtected =
    replayReaderHash === null ||
    typeof replayReaderHash === "undefined" ||
    input.exact_historical_bundle_available === true ||
    replayReaderHash === contract.writer_schema_bundle_hash ||
    contract.supported_reader_schema_bundle_hashes.includes(replayReaderHash);
  if (!replayProtected) {
    reasonCodes.add("REPLAY_RESTORE_SCHEMA_READER_INCOMPATIBLE");
  }

  if (nativeClientWindowState === "BLOCKED") {
    reasonCodes.add("NATIVE_CLIENT_WINDOW_BLOCKED");
  }

  const overallState =
    historicalProtected && replayProtected && nativeClientWindowState !== "BLOCKED"
      ? "ALLOWED"
      : "BLOCKED";

  return {
    reader_window_state: contract.window_state,
    destructive_contract_state: windowClosed
      ? "ELIGIBLE_AFTER_WINDOW_CLOSE"
      : "BLOCKED_UNTIL_WINDOW_CLOSE",
    rollback_boundary_state: windowClosed ? "FAIL_FORWARD_ONLY" : "ROLLBACK_ALLOWED",
    fail_forward_required: windowClosed,
    historical_manifest_guard_state: historicalProtected ? "PROTECTED" : "BLOCKED",
    replay_restore_guard_state: replayProtected ? "PROTECTED" : "BLOCKED",
    native_client_window_state: nativeClientWindowState,
    overall_state: overallState,
    reason_codes: [...reasonCodes].sort(),
  };
}

import type {
  SchemaReaderWindowContractRecord,
  SchemaReaderWindowState,
} from "../models/schema_reader_window_contract.ts";
import { normalizeSchemaReaderWindowContract } from "../models/schema_reader_window_contract.ts";

export type NativeClientWindowState =
  | "NOT_APPLICABLE"
  | "VERIFIED_COMPATIBLE"
  | "BLOCKED";
export type SchemaReaderWindowGuardState = "ALLOWED" | "BLOCKED";

export type SchemaReaderWindowGuardResult = {
  destructive_contract_state:
    | "BLOCKED_UNTIL_WINDOW_CLOSE"
    | "ELIGIBLE_AFTER_WINDOW_CLOSE";
  fail_forward_required: boolean;
  historical_manifest_guard_state: "PROTECTED" | "BLOCKED";
  native_client_window_state: NativeClientWindowState;
  overall_state: SchemaReaderWindowGuardState;
  reader_window_state: SchemaReaderWindowState;
  reason_codes: string[];
  replay_restore_guard_state: "PROTECTED" | "BLOCKED";
  rollback_boundary_state: "ROLLBACK_ALLOWED" | "FAIL_FORWARD_ONLY";
};

export function evaluateSchemaReaderWindowGuard(input: {
  contract: SchemaReaderWindowContractRecord;
  exact_historical_bundle_available?: boolean;
  historical_schema_bundle_hash_or_null?: string | null;
  native_client_window_state?: NativeClientWindowState;
  replay_reader_schema_bundle_hash_or_null?: string | null;
}) {
  const contract = normalizeSchemaReaderWindowContract(input.contract);
  const nativeClientWindowState = input.native_client_window_state ?? "NOT_APPLICABLE";
  const reasonCodes: string[] = [];
  const closed = contract.window_state === "CONTRACT_ELIGIBLE_WINDOW_CLOSED";
  const destructiveContractState = closed
    ? "ELIGIBLE_AFTER_WINDOW_CLOSE"
    : "BLOCKED_UNTIL_WINDOW_CLOSE";
  if (!closed) {
    reasonCodes.push("DESTRUCTIVE_CHANGE_BLOCKED_UNTIL_WINDOW_CLOSED");
  } else {
    reasonCodes.push("FAIL_FORWARD_REQUIRED_AFTER_WINDOW_CLOSE");
  }

  const historicalHash = input.historical_schema_bundle_hash_or_null;
  const historicalProtected =
    historicalHash == null ||
    contract.supported_reader_schema_bundle_hashes.includes(historicalHash) ||
    contract.protected_historical_schema_bundle_hashes.includes(historicalHash) ||
    historicalHash === contract.writer_schema_bundle_hash;
  if (!historicalProtected) {
    reasonCodes.push("HISTORICAL_SCHEMA_BUNDLE_NOT_SUPPORTED");
  }

  const replayReaderHash = input.replay_reader_schema_bundle_hash_or_null;
  const replayProtected =
    replayReaderHash == null ||
    contract.supported_reader_schema_bundle_hashes.includes(replayReaderHash) ||
    replayReaderHash === contract.writer_schema_bundle_hash ||
    input.exact_historical_bundle_available === true;
  if (!replayProtected) {
    reasonCodes.push("REPLAY_RESTORE_SCHEMA_READER_INCOMPATIBLE");
  }

  if (nativeClientWindowState === "BLOCKED") {
    reasonCodes.push("NATIVE_CLIENT_WINDOW_BLOCKED");
  }

  const overallState =
    historicalProtected && replayProtected && nativeClientWindowState !== "BLOCKED"
      ? "ALLOWED"
      : "BLOCKED";

  return {
    reader_window_state: contract.window_state,
    destructive_contract_state: destructiveContractState,
    rollback_boundary_state: closed ? "FAIL_FORWARD_ONLY" : "ROLLBACK_ALLOWED",
    fail_forward_required: closed,
    historical_manifest_guard_state: historicalProtected ? "PROTECTED" : "BLOCKED",
    replay_restore_guard_state: replayProtected ? "PROTECTED" : "BLOCKED",
    native_client_window_state: nativeClientWindowState,
    reason_codes: reasonCodes,
    overall_state: overallState,
  } satisfies SchemaReaderWindowGuardResult;
}

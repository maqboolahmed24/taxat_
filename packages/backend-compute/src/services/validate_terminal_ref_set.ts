import type { GateDecisionRecord } from "../models/gate_decision_record.ts";
import type { DecisionBundleRecord } from "../models/decision_bundle.ts";

export class TerminalRefSetValidationError extends Error {
  readonly code:
    | "TERMINAL_REF_SET_PRESTART_FORBIDDEN"
    | "TERMINAL_REF_SET_REFERENCE_IMPLICATION_INVALID"
    | "TERMINAL_REF_SET_SUBMISSION_REQUIRED";

  constructor(code: TerminalRefSetValidationError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "TerminalRefSetValidationError";
    this.code = code;
  }
}

function assertCondition(
  condition: unknown,
  code: TerminalRefSetValidationError["code"],
  detail: string,
): asserts condition {
  if (!condition) {
    throw new TerminalRefSetValidationError(code, detail);
  }
}

const CHILD_REF_FIELDS = [
  "snapshot_id",
  "compute_id",
  "forecast_id",
  "risk_id",
  "parity_id",
  "trust_id",
  "graph_id",
  "twin_id",
  "filing_packet_id",
  "submission_record_id",
  "filing_case_id",
  "amendment_case_id",
  "replay_attestation_ref",
  "primary_proof_bundle_ref",
] as const;

export function validateTerminalRefSet(input: {
  decision_bundle: Pick<
    DecisionBundleRecord,
    | "checkpoint_state"
    | "filing_case_id"
    | "filing_packet_id"
    | "amendment_case_id"
    | "compute_id"
    | "forecast_id"
    | "graph_id"
    | "parity_id"
    | "primary_proof_bundle_ref"
    | "replay_attestation_ref"
    | "risk_id"
    | "snapshot_id"
    | "submission_record_id"
    | "trust_id"
    | "twin_id"
  >;
  gate_records?: readonly GateDecisionRecord[];
  pre_start_blocked?: boolean;
}) {
  const bundle = input.decision_bundle;
  assertCondition(
    bundle.primary_proof_bundle_ref == null || bundle.graph_id != null,
    "TERMINAL_REF_SET_REFERENCE_IMPLICATION_INVALID",
    "primary_proof_bundle_ref requires graph_id",
  );
  assertCondition(
    bundle.twin_id == null || (bundle.graph_id != null && bundle.parity_id != null),
    "TERMINAL_REF_SET_REFERENCE_IMPLICATION_INVALID",
    "twin_id requires graph_id and parity_id",
  );
  if (["CONFIRMED", "REJECTED", "UNKNOWN", "OUT_OF_BAND"].includes(bundle.checkpoint_state)) {
    assertCondition(
      bundle.submission_record_id != null,
      "TERMINAL_REF_SET_SUBMISSION_REQUIRED",
      `${bundle.checkpoint_state} requires submission_record_id`,
    );
  }
  if (input.pre_start_blocked) {
    for (const field of CHILD_REF_FIELDS) {
      assertCondition(
        bundle[field] == null,
        "TERMINAL_REF_SET_PRESTART_FORBIDDEN",
        `pre-start blocked bundles must not reference ${field}`,
      );
    }
    assertCondition(
      (input.gate_records ?? []).length === 0,
      "TERMINAL_REF_SET_PRESTART_FORBIDDEN",
      "pre-start blocked bundles must not reference gate decision records",
    );
  }
}

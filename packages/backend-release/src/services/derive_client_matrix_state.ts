export const CLIENT_COMPATIBILITY_SCENARIOS = [
  "OLDEST_SUPPORTED_TO_CURRENT_SERVER",
  "CURRENT_CLIENT_TO_ROLLBACK_SAFE_SERVER",
] as const;

export type ClientCompatibilityScenario =
  (typeof CLIENT_COMPATIBILITY_SCENARIOS)[number];

export type ClientCompatibilityOutcome = "COMPATIBLE" | "INCOMPATIBLE";
export type ClientMatrixState = "GREEN" | "RED";
export type NativeClientWindowState =
  | "NOT_APPLICABLE"
  | "VERIFIED_COMPATIBLE"
  | "BLOCKED";

export type ClientCompatibilityMatrixRow = {
  client_version: string;
  scenario: ClientCompatibilityScenario;
  outcome: ClientCompatibilityOutcome;
  suite_result_ref: string;
};

export const CLIENT_COMPATIBILITY_SCENARIO_INDEX = new Map<
  ClientCompatibilityScenario,
  number
>(
  CLIENT_COMPATIBILITY_SCENARIOS.map((scenario, index) => [scenario, index]),
);

export type ClientMatrixStateDerivationErrorCode =
  | "CLIENT_MATRIX_NATIVE_GATE_INVALID"
  | "CLIENT_MATRIX_STATE_INVALID";

export class ClientMatrixStateDerivationError extends Error {
  readonly code: ClientMatrixStateDerivationErrorCode;

  constructor(code: ClientMatrixStateDerivationErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ClientMatrixStateDerivationError";
    this.code = code;
  }
}

function assertClientMatrixState(
  condition: unknown,
  code: ClientMatrixStateDerivationErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new ClientMatrixStateDerivationError(code, detail);
  }
}

function compareLexicographic(left: string, right: string) {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

export function compareClientCompatibilityRows(
  left: Pick<ClientCompatibilityMatrixRow, "client_version" | "scenario">,
  right: Pick<ClientCompatibilityMatrixRow, "client_version" | "scenario">,
) {
  return (
    compareLexicographic(left.client_version, right.client_version) ||
    (CLIENT_COMPATIBILITY_SCENARIO_INDEX.get(left.scenario) ??
      CLIENT_COMPATIBILITY_SCENARIOS.length) -
      (CLIENT_COMPATIBILITY_SCENARIO_INDEX.get(right.scenario) ??
        CLIENT_COMPATIBILITY_SCENARIOS.length)
  );
}

export function clientMatrixHasIncompatibleRow(input: {
  browser_rows: readonly Pick<ClientCompatibilityMatrixRow, "outcome">[];
  macos_rows: readonly Pick<ClientCompatibilityMatrixRow, "outcome">[];
}) {
  return [...input.browser_rows, ...input.macos_rows].some(
    (row) => row.outcome === "INCOMPATIBLE",
  );
}

export function deriveClientMatrixState(input: {
  browser_rows: readonly Pick<ClientCompatibilityMatrixRow, "outcome">[];
  macos_rows: readonly Pick<ClientCompatibilityMatrixRow, "outcome">[];
  native_client_window_state: NativeClientWindowState;
}): ClientMatrixState {
  const hasIncompatibleRow = clientMatrixHasIncompatibleRow(input);
  if (hasIncompatibleRow) {
    assertClientMatrixState(
      input.native_client_window_state === "BLOCKED",
      "CLIENT_MATRIX_STATE_INVALID",
      "incompatible client rows require native_client_window_state=BLOCKED",
    );
    return "RED";
  }

  assertClientMatrixState(
    input.native_client_window_state === "VERIFIED_COMPATIBLE",
    input.native_client_window_state === "NOT_APPLICABLE"
      ? "CLIENT_MATRIX_NATIVE_GATE_INVALID"
      : "CLIENT_MATRIX_STATE_INVALID",
    "compatible client rows require native_client_window_state=VERIFIED_COMPATIBLE",
  );
  return "GREEN";
}

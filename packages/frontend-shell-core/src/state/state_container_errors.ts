export type StateContainerErrorCode =
  | "STATE_CONTAINER_ACCESS_REBIND_REQUIRED"
  | "STATE_CONTAINER_ILLEGAL_MIXED_GENERATION_BASIS"
  | "STATE_CONTAINER_MISSING_GUARD"
  | "STATE_CONTAINER_ROUTE_SCOPE_MISMATCH"
  | "STATE_CONTAINER_SNAPSHOT_ONLY_RESUME_FORBIDDEN"
  | "STATE_CONTAINER_STALE_GUARD";

export type StateContainerErrorDetails = Readonly<
  Record<string, string | number | boolean | null | readonly string[]>
>;

export class StateContainerError extends Error {
  readonly details: StateContainerErrorDetails;
  readonly reason_code: StateContainerErrorCode;

  constructor(
    reasonCode: StateContainerErrorCode,
    message: string,
    details: StateContainerErrorDetails = {},
  ) {
    super(message);
    this.name = "StateContainerError";
    this.reason_code = reasonCode;
    this.details = details;
  }
}

export function isStateContainerError(
  error: unknown,
  reasonCode?: StateContainerErrorCode,
): error is StateContainerError {
  if (!(error instanceof StateContainerError)) {
    return false;
  }
  return reasonCode === undefined || error.reason_code === reasonCode;
}

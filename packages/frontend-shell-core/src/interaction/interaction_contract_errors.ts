export type InteractionContractReasonCode =
  | "INTERACTION_FOUNDATION_MISSING"
  | "INTERACTION_FOUNDATION_FAMILY_MISMATCH"
  | "INTERACTION_FOUNDATION_SELECTOR_MISMATCH"
  | "INTERACTION_FOUNDATION_TOKEN_MISMATCH"
  | "INTERACTION_LAYER_FAMILY_MISMATCH"
  | "SURFACE_REGISTRY_UNKNOWN_SURFACE"
  | "SURFACE_REGISTRY_FAMILY_MISMATCH"
  | "SURFACE_REGISTRY_READING_ORDER_DRIFT"
  | "SUPPORT_SURFACE_NOT_PROMOTABLE"
  | "SUPPORT_SURFACE_BUDGET_EXCEEDED"
  | "SUPPORT_SURFACE_MODE_CONFLICT"
  | "PORTAL_SUPPORT_MUST_STACK_BELOW_PRIMARY"
  | "GOVERNANCE_MODAL_CHECKPOINT_REQUIRED"
  | "GOVERNANCE_MODAL_SURFACE_NOT_ELIGIBLE";

export class InteractionContractError extends Error {
  readonly reason_code: InteractionContractReasonCode;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(
    reasonCode: InteractionContractReasonCode,
    message: string,
    details: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);
    this.name = "InteractionContractError";
    this.reason_code = reasonCode;
    this.details = details;
  }
}

export function failInteractionContract(
  reasonCode: InteractionContractReasonCode,
  message: string,
  details: Readonly<Record<string, unknown>> = {},
): never {
  throw new InteractionContractError(reasonCode, message, details);
}

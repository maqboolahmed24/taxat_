import { AuthorityModelError } from "../models/authority_common.ts";
import type {
  AuthorityBindingDriftSentinelContract,
  BindingDriftSentinelBlockReason,
  BindingDriftSentinelPassReason,
} from "./build_binding_drift_sentinel_contract.ts";

export type SendRevalidationState = "NOT_PERFORMED" | "CLEAR_TO_SEND" | "BLOCKED";

export type SendRevalidationProjection = {
  send_authorized_token_version_ref: string | null;
  send_revalidated_at: string | null;
  send_revalidation_reason_codes: (BindingDriftSentinelPassReason | BindingDriftSentinelBlockReason)[];
  send_revalidation_state: SendRevalidationState;
};

export function classifySendRevalidationOutcome(
  sentinel: AuthorityBindingDriftSentinelContract,
): SendRevalidationProjection {
  if (sentinel.checked_action_class !== "TRANSMIT_MUTATION" && sentinel.decision_state !== "NOT_EVALUATED") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "send revalidation projection may only be derived from transmit-owned binding drift sentinels",
    );
  }
  if (sentinel.decision_state === "NOT_EVALUATED") {
    return {
      send_authorized_token_version_ref: null,
      send_revalidated_at: null,
      send_revalidation_reason_codes: [],
      send_revalidation_state: "NOT_PERFORMED",
    };
  }
  if (sentinel.decision_state === "CLEAR_TO_PROCEED") {
    if (sentinel.checked_token_version_ref_or_null === null || sentinel.pass_reason_code_or_null === null) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "clear send revalidation requires checked token and pass reason",
      );
    }
    return {
      send_authorized_token_version_ref: sentinel.checked_token_version_ref_or_null,
      send_revalidated_at: sentinel.checked_at,
      send_revalidation_reason_codes: [sentinel.pass_reason_code_or_null],
      send_revalidation_state: "CLEAR_TO_SEND",
    };
  }
  return {
    send_authorized_token_version_ref: null,
    send_revalidated_at: sentinel.checked_at,
    send_revalidation_reason_codes: [...sentinel.block_reason_codes],
    send_revalidation_state: "BLOCKED",
  };
}

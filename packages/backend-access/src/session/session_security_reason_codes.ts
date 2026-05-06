export const SESSION_SECURITY_REASON_CODES = {
  browser_csrf_binding_stale: "BROWSER_CSRF_BINDING_STALE",
  browser_csrf_expired: "BROWSER_CSRF_EXPIRED",
  browser_csrf_invalid: "BROWSER_CSRF_INVALID",
  browser_csrf_required: "BROWSER_CSRF_REQUIRED",
  browser_csrf_token_invalidated: "BROWSER_CSRF_TOKEN_INVALIDATED",
  browser_origin_mismatch: "BROWSER_ORIGIN_MISMATCH",
  device_binding_mismatch: "DEVICE_BINDING_MISMATCH",
  device_binding_proof_required: "DEVICE_BINDING_PROOF_REQUIRED",
  device_binding_revocation_recommended: "DEVICE_BINDING_REVOCATION_RECOMMENDED",
  device_binding_unverified: "DEVICE_BINDING_UNVERIFIED",
  device_environment_change_challenge: "DEVICE_ENVIRONMENT_CHANGE_CHALLENGE",
  session_binding_mismatch: "SESSION_BINDING_MISMATCH",
  session_binding_proof_required: "SESSION_BINDING_PROOF_REQUIRED",
  session_command_rejected: "SESSION_COMMAND_REJECTED",
  session_continuation_invalidated: "SESSION_CONTINUATION_INVALIDATED",
  session_continuation_stale: "SESSION_CONTINUATION_STALE",
  session_environment_change_challenge: "SESSION_ENVIRONMENT_CHANGE_CHALLENGE",
} as const;

export type SessionSecurityReasonCode =
  (typeof SESSION_SECURITY_REASON_CODES)[keyof typeof SESSION_SECURITY_REASON_CODES];

export const SESSION_SECURITY_PROBLEM_CODES = {
  browser_client_class_invalid: "BROWSER_CLIENT_CLASS_INVALID",
  browser_session_binding_rejected: "BROWSER_SESSION_BINDING_REJECTED",
  browser_session_csrf_rejected: "BROWSER_SESSION_CSRF_REJECTED",
  browser_session_not_usable: "BROWSER_SESSION_NOT_USABLE",
  browser_session_origin_rejected: "BROWSER_SESSION_ORIGIN_REJECTED",
  browser_session_revalidation_required: "BROWSER_SESSION_REVALIDATION_REQUIRED",
  session_binding_rejected: "SESSION_BINDING_REJECTED",
  session_bound_artifact_invalidated: "SESSION_BOUND_ARTIFACT_INVALIDATED",
  session_bound_artifact_not_found: "SESSION_BOUND_ARTIFACT_NOT_FOUND",
  session_bound_artifact_stale: "SESSION_BOUND_ARTIFACT_STALE",
  session_not_usable: "SESSION_NOT_USABLE",
} as const;

export type SessionSecurityProblemCode =
  (typeof SESSION_SECURITY_PROBLEM_CODES)[keyof typeof SESSION_SECURITY_PROBLEM_CODES];

export function dedupeReasonCodes(reasonCodes: readonly string[]) {
  return [...new Set(reasonCodes)];
}

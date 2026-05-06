import type { AuthorizationDecisionRecord } from "../models/authorization_decision.ts";

export type AccessBlockedResponse = {
  access_binding_hash: string;
  artifact_type: "AccessBlockedResponse";
  decision: Extract<
    AuthorizationDecisionRecord["decision"],
    "DENY" | "REQUIRE_APPROVAL" | "REQUIRE_STEP_UP"
  >;
  decision_id: string;
  effective_partition_scope_refs: string[];
  effective_scope: string[];
  evaluated_at: string;
  pending_approval_requirement: AuthorizationDecisionRecord["approval_requirement"];
  policy_snapshot_hash: string;
  principal_context_access_binding_hash: string;
  reason_codes: string[];
  required_approvals: string[];
  required_authn_level: AuthorizationDecisionRecord["required_authn_level"];
  response_code:
    | "ACCESS_APPROVAL_REQUIRED"
    | "ACCESS_DENIED"
    | "ACCESS_STEP_UP_REQUIRED";
};

export function buildAccessBlockedResponse(input: {
  authorization_decision: AuthorizationDecisionRecord;
  principal_context_access_binding_hash: string;
  pending_approval_requirement?: AuthorizationDecisionRecord["approval_requirement"];
  pending_required_approvals?: string[];
}): AccessBlockedResponse {
  if (
    input.authorization_decision.decision !== "DENY" &&
    input.authorization_decision.decision !== "REQUIRE_STEP_UP" &&
    input.authorization_decision.decision !== "REQUIRE_APPROVAL"
  ) {
    throw new Error("access blocked responses require a blocked authorization decision");
  }

  return {
    artifact_type: "AccessBlockedResponse",
    response_code:
      input.authorization_decision.decision === "DENY"
        ? "ACCESS_DENIED"
        : input.authorization_decision.decision === "REQUIRE_STEP_UP"
          ? "ACCESS_STEP_UP_REQUIRED"
          : "ACCESS_APPROVAL_REQUIRED",
    decision: input.authorization_decision.decision,
    decision_id: input.authorization_decision.decision_id,
    access_binding_hash: input.authorization_decision.access_binding_hash,
    principal_context_access_binding_hash: input.principal_context_access_binding_hash,
    policy_snapshot_hash: input.authorization_decision.policy_snapshot_hash,
    reason_codes: [...input.authorization_decision.reason_codes],
    effective_scope: [...input.authorization_decision.effective_scope],
    effective_partition_scope_refs: [
      ...input.authorization_decision.effective_partition_scope_refs,
    ],
    required_authn_level: input.authorization_decision.required_authn_level,
    required_approvals:
      input.authorization_decision.decision === "REQUIRE_APPROVAL"
        ? [...input.authorization_decision.required_approvals]
        : [...(input.pending_required_approvals ?? [])],
    pending_approval_requirement:
      input.authorization_decision.decision === "REQUIRE_APPROVAL"
        ? input.pending_approval_requirement ?? null
        : (input.pending_approval_requirement ?? null),
    evaluated_at: input.authorization_decision.evaluated_at,
  };
}

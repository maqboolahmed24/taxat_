import type { AuthorizationDecisionRecord } from "../models/authorization_decision.ts";
import type { AuthorizationTupleEvaluation } from "./authorization_tuple_evaluator.ts";
import {
  LIVE_MUTATION_SCOPE_TOKENS,
  normalizeScopeSequence,
  normalizeStringSet,
} from "./principal_context_normalizer.ts";

export type EffectiveScopeReduction = {
  approval_requirement: AuthorizationDecisionRecord["approval_requirement"];
  atomic_request: boolean;
  authority_link_snapshot_refs: string[];
  decision: AuthorizationDecisionRecord["decision"];
  delegation_snapshot_refs: string[];
  effective_partition_scope_refs: string[];
  effective_scope: string[];
  masking_rules: string[];
  pending_required_approvals: string[];
  reason_codes: string[];
  required_approvals: string[];
  required_authn_level: AuthorizationDecisionRecord["required_authn_level"];
  tuple_evaluations: AuthorizationTupleEvaluation[];
};

function compareAuthnLevel(
  left: AuthorizationDecisionRecord["required_authn_level"],
  right: AuthorizationDecisionRecord["required_authn_level"],
) {
  const priority = {
    null: 0,
    BASIC: 1,
    MFA: 2,
    STEP_UP: 3,
  } as const;
  return priority[left ?? "null"] - priority[right ?? "null"];
}

export class EffectiveScopeReducer {
  reduce(input: {
    requested_partition_scope_refs: string[];
    requested_scope: string[];
    tuple_evaluations: AuthorizationTupleEvaluation[];
  }): EffectiveScopeReduction {
    const requestedScope = normalizeScopeSequence("requested_scope", input.requested_scope);
    const requestedPartitions = normalizeStringSet(
      "requested_partition_scope_refs",
      input.requested_partition_scope_refs,
    );
    const tupleEvaluations = [...input.tuple_evaluations];

    const atomicRequest = requestedScope.some((token) =>
      LIVE_MUTATION_SCOPE_TOKENS.has(token),
    );
    const hasNonDirectTuple = tupleEvaluations.some(
      (tuple) => tuple.step_up_path || tuple.approval_path || tuple.blocked,
    );

    const effectiveTuples = tupleEvaluations.map((tuple) => ({
      ...tuple,
      direct_allow:
        atomicRequest && hasNonDirectTuple ? false : tuple.direct_allow,
    }));

    const candidateTuples = effectiveTuples.filter(
      (tuple) => tuple.direct_allow || tuple.step_up_path || tuple.approval_path,
    );
    const directAllowTuples = effectiveTuples.filter((tuple) => tuple.direct_allow);
    const stepUpTuples = effectiveTuples.filter((tuple) => tuple.step_up_path);
    const approvalTuples = effectiveTuples.filter((tuple) => tuple.approval_path);
    const blockedTuples = effectiveTuples.filter((tuple) => tuple.blocked);

    let decision: AuthorizationDecisionRecord["decision"] = "ALLOW";
    if (
      candidateTuples.length === 0 ||
      (atomicRequest &&
        hasNonDirectTuple &&
        directAllowTuples.length === 0 &&
        stepUpTuples.length === 0 &&
        approvalTuples.length === 0)
    ) {
      decision = "DENY";
    } else if (directAllowTuples.length === 0 && stepUpTuples.length > 0) {
      decision = "REQUIRE_STEP_UP";
    } else if (
      directAllowTuples.length === 0 &&
      stepUpTuples.length === 0 &&
      approvalTuples.length > 0
    ) {
      decision = "REQUIRE_APPROVAL";
    } else if (directAllowTuples.some((tuple) => tuple.masking_active)) {
      decision = "ALLOW_MASKED";
    }

    const reasonCodesSource =
      decision === "DENY"
        ? blockedTuples.length > 0
          ? blockedTuples
          : candidateTuples
        : candidateTuples.length > 0
          ? candidateTuples
          : blockedTuples;
    const effective_scope =
      decision === "DENY"
        ? []
        : normalizeScopeSequence(
            "effective_scope",
            candidateTuples.map((tuple) => tuple.scope_token),
          );
    const effective_partition_scope_refs =
      decision === "DENY"
        ? []
        : normalizeStringSet(
            "effective_partition_scope_refs",
            candidateTuples.flatMap((tuple) =>
              tuple.partition_ref === null ? [] : [tuple.partition_ref],
            ),
          );
    const masking_rules =
      decision === "ALLOW_MASKED"
        ? normalizeStringSet(
            "masking_rules",
            directAllowTuples.flatMap((tuple) =>
              tuple.masking_active ? ["mask.client_personal_fields"] : [],
            ),
          )
        : [];

    const required_authn_level =
      decision === "REQUIRE_STEP_UP"
        ? stepUpTuples
            .map((tuple) => tuple.required_authn_level)
            .sort(compareAuthnLevel)
            .at(-1) ?? null
        : null;
    const pending_required_approvals = normalizeStringSet(
      "pending_required_approvals",
      [...stepUpTuples, ...approvalTuples].flatMap(
        (tuple) => tuple.required_approvals,
      ),
    );
    const required_approvals =
      decision === "REQUIRE_APPROVAL" ? pending_required_approvals : [];
    const approval_requirement =
      [...stepUpTuples, ...approvalTuples]
        .map((tuple) => tuple.approval_requirement)
        .find((value) => value !== null) ?? null;

    const preferredMaskingRules =
      decision === "ALLOW_MASKED"
        ? directAllowTuples.some((tuple) => tuple.masking_active)
          ? normalizeStringSet(
              "masking_rules",
              directAllowTuples.flatMap((tuple) =>
                tuple.masking_active ? ["mask.client_personal_fields"] : [],
              ),
            )
          : []
        : [];

    return {
      decision,
      effective_scope,
      effective_partition_scope_refs:
        requestedPartitions.length === 0 ? [] : effective_partition_scope_refs,
      masking_rules: preferredMaskingRules.length > 0 ? preferredMaskingRules : masking_rules,
      required_authn_level,
      required_approvals,
      pending_required_approvals,
      approval_requirement,
      reason_codes: normalizeStringSet(
        "effective_scope_reducer.reason_codes",
        reasonCodesSource.flatMap((tuple) => tuple.reason_codes),
        { minItems: 1 },
      ),
      delegation_snapshot_refs: normalizeStringSet(
        "delegation_snapshot_refs",
        reasonCodesSource.flatMap((tuple) => tuple.delegation_snapshot_refs),
      ),
      authority_link_snapshot_refs: normalizeStringSet(
        "authority_link_snapshot_refs",
        reasonCodesSource.flatMap((tuple) => tuple.authority_link_snapshot_refs),
      ),
      atomic_request: atomicRequest,
      tuple_evaluations: effectiveTuples,
    };
  }
}

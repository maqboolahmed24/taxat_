import type {
  PrincipalAccessViewDelegationSummary,
} from "../../../generated-models/src/generated/typescript/authority-and-access.ts";

import type { AuthorizationDecisionRecord } from "../models/authorization_decision.ts";
import type { PrincipalContextRecord } from "../models/principal_context.ts";
import type { DelegationGrantRepository } from "../repositories/delegation_grant_repository.ts";
import {
  normalizeScopeSequence,
} from "./principal_context_normalizer.ts";

type DelegationCoverageState =
  AuthorizationDecisionRecord["authority_layer_boundary"]["client_delegation_state"];

export type BuildDelegationSummariesInput = {
  authorization_decisions: readonly AuthorizationDecisionRecord[];
  delegation_grant_repository: DelegationGrantRepository | undefined;
  principal_context: PrincipalContextRecord;
};

const delegationStatePriority = new Map<DelegationCoverageState, number>([
  ["MISSING", 5],
  ["EXPIRED", 4],
  ["LIMITED", 3],
  ["SATISFIED", 2],
  ["NOT_REQUIRED", 1],
]);

function lifecycleStateForCoverageState(state: DelegationCoverageState) {
  switch (state) {
    case "MISSING":
      return "MISSING";
    case "EXPIRED":
      return "EXPIRED";
    case "LIMITED":
      return "LIMITED_SCOPE";
    case "SATISFIED":
      return "ACTIVE";
    case "NOT_REQUIRED":
      return "NOT_REQUIRED";
  }
}

export class DelegationSummaryBuilder {
  async build(
    input: BuildDelegationSummariesInput,
  ): Promise<PrincipalAccessViewDelegationSummary[]> {
    if (input.principal_context.client_scope.length === 0) {
      return [];
    }

    const strongestDelegationState = input.authorization_decisions
      .map((decision) => decision.authority_layer_boundary.client_delegation_state)
      .sort(
        (left, right) =>
          (delegationStatePriority.get(right) ?? 0) -
          (delegationStatePriority.get(left) ?? 0),
      )[0] ?? "NOT_REQUIRED";

    let expires_at: string | undefined;
    if (
      input.delegation_grant_repository &&
      input.principal_context.delegation_snapshot_refs.length > 0
    ) {
      const expiryCandidates = (
        await Promise.all(
          input.principal_context.delegation_snapshot_refs.map(async (snapshotRef) => {
            const snapshot =
              await input.delegation_grant_repository!.getSnapshotByRef(snapshotRef);
            return snapshot?.record.expires_at ?? null;
          }),
        )
      )
        .filter((value): value is string => value !== null)
        .sort((left, right) => left.localeCompare(right));
      expires_at = expiryCandidates[0];
    }

    return [...input.principal_context.client_scope]
      .sort((left, right) => left.localeCompare(right))
      .map((client_id) => ({
        client_id,
        delegation_basis: input.principal_context.delegation_basis,
        scope_refs: normalizeScopeSequence(
          "delegation_summary.scope_refs",
          input.principal_context.requested_scope,
          { allowEmpty: false },
        ),
        lifecycle_state: lifecycleStateForCoverageState(strongestDelegationState),
        ...(expires_at === undefined ? {} : { expires_at }),
      }));
  }
}

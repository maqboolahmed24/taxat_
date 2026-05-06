import type { CanonicalJsonValue } from "../../../domain-kernel/src/primitives/hash.ts";

import {
  normalizeStringSet,
  requireTrimmedString,
} from "../services/principal_context_normalizer.ts";
import {
  canonicalHashDigest,
  normalizeCanonicalHashValue,
} from "./canonical_hash_serializer.ts";

export type SimulationBasisHashInput = {
  acting_principal_ref: string;
  dependency_topology_hash: string;
  policy_snapshot_hash: string;
  proposed_diff: unknown;
  requested_approver_scope: readonly string[];
  simulation_profile_ref: string;
};

export function buildSimulationBasisHashVector(input: SimulationBasisHashInput) {
  return {
    policy_snapshot_hash: requireTrimmedString(
      "policy_snapshot_hash",
      input.policy_snapshot_hash,
    ),
    dependency_topology_hash: requireTrimmedString(
      "dependency_topology_hash",
      input.dependency_topology_hash,
    ),
    proposed_diff: normalizeCanonicalHashValue(input.proposed_diff ?? null),
    acting_principal_ref: requireTrimmedString(
      "acting_principal_ref",
      input.acting_principal_ref,
    ),
    requested_approver_scope: normalizeStringSet(
      "requested_approver_scope",
      input.requested_approver_scope,
    ),
    simulation_profile_ref: requireTrimmedString(
      "simulation_profile_ref",
      input.simulation_profile_ref,
    ),
  } satisfies CanonicalJsonValue;
}

export function buildSimulationBasisHash(input: SimulationBasisHashInput) {
  return canonicalHashDigest(buildSimulationBasisHashVector(input));
}

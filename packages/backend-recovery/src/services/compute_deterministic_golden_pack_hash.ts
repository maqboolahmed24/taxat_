import type { DeterministicGoldenPack } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import {
  assertDeterministicGoldenPackHash,
  canonicalizeDeterministicGoldenPackHashPayload,
  deriveDeterministicGoldenPackHash,
  deterministicGoldenPackFailureTrace,
} from "../models/deterministic_golden_pack.ts";

export function computeDeterministicGoldenPackHash(
  pack: Pick<
    DeterministicGoldenPack,
    | "artifact_type"
    | "contract_version"
    | "candidate_identity_hash"
    | "schema_bundle_hash"
    | "config_bundle_hash"
    | "canonical_serialization_policy"
    | "exact_decimal_policy"
    | "null_slot_policy"
    | "replay_comparison_policy"
    | "state_transition_policy"
    | "cadence_policy"
    | "module_fixtures"
    | "state_transition_fixtures"
    | "replay_fixtures"
    | "cadence_fixtures"
  >,
) {
  return deriveDeterministicGoldenPackHash(pack);
}

export function deterministicGoldenPackHashPayload(
  pack: Parameters<typeof canonicalizeDeterministicGoldenPackHashPayload>[0],
) {
  return canonicalizeDeterministicGoldenPackHashPayload(pack);
}

export function verifyDeterministicGoldenPackHash(pack: DeterministicGoldenPack) {
  return assertDeterministicGoldenPackHash(pack);
}

export function deterministicGoldenPackSerializedFailureTrace(payload: unknown) {
  return deterministicGoldenPackFailureTrace(payload);
}

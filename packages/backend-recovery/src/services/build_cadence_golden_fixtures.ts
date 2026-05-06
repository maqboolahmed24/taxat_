import type { DeterministicGoldenPackCadenceFixture } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import {
  DETERMINISTIC_GOLDEN_PACK_CADENCE_JITTER_POLICY,
  normalizeDeterministicCadenceFixture,
} from "../models/deterministic_golden_pack.ts";

export type BuildCadenceGoldenFixtureInput = {
  fixture_id: string;
  scope_binding_hash: string;
  cadence_family: DeterministicGoldenPackCadenceFixture["cadence_family"];
  attempt_index: number;
  expected_cadence_seconds: number;
  jitter_policy?: DeterministicGoldenPackCadenceFixture["jitter_policy"];
  schedule_derivation_basis: string;
};

export function buildCadenceGoldenFixture(
  input: BuildCadenceGoldenFixtureInput,
): DeterministicGoldenPackCadenceFixture {
  return normalizeDeterministicCadenceFixture({
    fixture_id: input.fixture_id,
    scope_binding_hash: input.scope_binding_hash,
    cadence_family: input.cadence_family,
    attempt_index: input.attempt_index,
    expected_cadence_seconds: input.expected_cadence_seconds,
    jitter_policy: input.jitter_policy ?? DETERMINISTIC_GOLDEN_PACK_CADENCE_JITTER_POLICY,
    schedule_derivation_basis: input.schedule_derivation_basis,
  });
}

export function buildCadenceGoldenFixtures(
  inputs: readonly BuildCadenceGoldenFixtureInput[],
): DeterministicGoldenPackCadenceFixture[] {
  return inputs
    .map((input) => buildCadenceGoldenFixture(input))
    .sort((left, right) => (left.fixture_id < right.fixture_id ? -1 : left.fixture_id > right.fixture_id ? 1 : 0));
}

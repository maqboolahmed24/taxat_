import type {
  DeterministicGoldenPackReplayFixture,
  ReplayAttestation,
} from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import {
  DETERMINISTIC_GOLDEN_PACK_REPLAY_BINDING_POLICY,
  DeterministicGoldenPackModelError,
  normalizeDeterministicReplayFixture,
  requireGoldenPackTrimmedString,
} from "../models/deterministic_golden_pack.ts";

export type BuildReplayGoldenFixtureInput = {
  fixture_id: string;
  scope_binding_hash: string;
  replay_class: DeterministicGoldenPackReplayFixture["replay_class"];
  comparison_mode: DeterministicGoldenPackReplayFixture["comparison_mode"];
  expected_outcome_class: DeterministicGoldenPackReplayFixture["expected_outcome_class"];
  expected_execution_basis_hash: string;
  expected_deterministic_outcome_hash: string;
};

export function replayGoldenFixtureInputFromAttestation(input: {
  fixture_id: string;
  scope_binding_hash: string;
  attestation: ReplayAttestation;
}): BuildReplayGoldenFixtureInput {
  if (
    input.attestation.expected_execution_basis_hash === null ||
    input.attestation.expected_deterministic_outcome_hash === null
  ) {
    throw new DeterministicGoldenPackModelError(
      "DETERMINISTIC_GOLDEN_PACK_FIXTURE_INVALID",
      "replay golden fixtures require non-null expected execution-basis and deterministic-outcome hashes",
    );
  }
  return {
    fixture_id: input.fixture_id,
    scope_binding_hash: input.scope_binding_hash,
    replay_class: input.attestation.replay_class,
    comparison_mode: input.attestation.comparison_mode,
    expected_outcome_class: input.attestation.outcome_class,
    expected_execution_basis_hash: input.attestation.expected_execution_basis_hash,
    expected_deterministic_outcome_hash: input.attestation.expected_deterministic_outcome_hash,
  };
}

export function buildReplayGoldenFixture(
  input: BuildReplayGoldenFixtureInput,
): DeterministicGoldenPackReplayFixture {
  return normalizeDeterministicReplayFixture({
    fixture_id: input.fixture_id,
    scope_binding_hash: input.scope_binding_hash,
    replay_class: input.replay_class,
    comparison_mode: input.comparison_mode,
    expected_outcome_class: input.expected_outcome_class,
    expected_execution_basis_hash: requireGoldenPackTrimmedString(
      "replay_fixture.expected_execution_basis_hash",
      input.expected_execution_basis_hash,
    ),
    expected_deterministic_outcome_hash: requireGoldenPackTrimmedString(
      "replay_fixture.expected_deterministic_outcome_hash",
      input.expected_deterministic_outcome_hash,
    ),
    comparison_binding_policy: DETERMINISTIC_GOLDEN_PACK_REPLAY_BINDING_POLICY,
  });
}

export function buildReplayGoldenFixtures(
  inputs: readonly BuildReplayGoldenFixtureInput[],
): DeterministicGoldenPackReplayFixture[] {
  return inputs
    .map((input) => buildReplayGoldenFixture(input))
    .sort((left, right) => (left.fixture_id < right.fixture_id ? -1 : left.fixture_id > right.fixture_id ? 1 : 0));
}

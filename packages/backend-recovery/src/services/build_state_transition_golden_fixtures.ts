import type {
  DeterministicGoldenPackStateTransitionFixture,
  StateTransitionContract,
} from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import {
  DETERMINISTIC_GOLDEN_PACK_TRANSITION_BINDING_POLICY,
  normalizeDeterministicStateTransitionFixture,
} from "../models/deterministic_golden_pack.ts";

export type BuildStateTransitionGoldenFixtureInput = {
  fixture_id: string;
  scope_binding_hash: string;
  state_transition_contract: StateTransitionContract;
  expected_current_state?: string;
  expected_previous_state_or_null?: string | null;
  expected_transition_event_code?: string;
};

export function buildStateTransitionGoldenFixture(
  input: BuildStateTransitionGoldenFixtureInput,
): DeterministicGoldenPackStateTransitionFixture {
  return normalizeDeterministicStateTransitionFixture({
    fixture_id: input.fixture_id,
    scope_binding_hash: input.scope_binding_hash,
    state_transition_contract: input.state_transition_contract,
    expected_current_state:
      input.expected_current_state ?? input.state_transition_contract.current_state,
    expected_previous_state_or_null:
      input.expected_previous_state_or_null ??
      input.state_transition_contract.previous_state_or_null,
    expected_transition_event_code:
      input.expected_transition_event_code ??
      input.state_transition_contract.transition_event_code,
    transition_binding_policy: DETERMINISTIC_GOLDEN_PACK_TRANSITION_BINDING_POLICY,
  });
}

export function buildStateTransitionGoldenFixtures(
  inputs: readonly BuildStateTransitionGoldenFixtureInput[],
): DeterministicGoldenPackStateTransitionFixture[] {
  return inputs
    .map((input) => buildStateTransitionGoldenFixture(input))
    .sort((left, right) => (left.fixture_id < right.fixture_id ? -1 : left.fixture_id > right.fixture_id ? 1 : 0));
}

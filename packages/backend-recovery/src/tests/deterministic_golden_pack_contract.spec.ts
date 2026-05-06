import { expect, test } from "@playwright/test";

import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { buildReleaseCandidateIdentityContract } from "../../../backend-manifest/src/index.ts";
import type {
  DeterministicGoldenPack,
  ReleaseCandidateIdentityContract,
  StateTransitionContract,
} from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  DeterministicGoldenPackModelError,
  buildCadenceGoldenFixture,
  buildDeterministicGoldenPack,
  buildModuleGoldenFixture,
  buildReplayGoldenFixture,
  buildStateTransitionGoldenFixture,
  computeDeterministicGoldenPackHash,
  deterministicGoldenPackSerializedFailureTrace,
  verifyDeterministicGoldenPackHash,
} from "../index.ts";

export function candidateIdentityFixture(): ReleaseCandidateIdentityContract {
  return buildReleaseCandidateIdentityContract({
    candidate_environment_ref: "candidate-env-1",
    build_artifact_ref: "build-1",
    artifact_digest: "artifact-digest-1",
    schema_bundle_hash: "schema-hash-1",
    config_bundle_hash: "config-hash-1",
    migration_plan_ref_or_null: null,
    enabled_provider_profile_refs: ["provider-a"],
    supported_client_window_ref_or_null: "client-window-1",
  });
}

export function stateTransitionContractFixture(
  overrides: Partial<StateTransitionContract> = {},
): StateTransitionContract {
  return {
    contract_version: "STATE_TRANSITION_CONTRACT_V1",
    object_family: "RELEASE_VERIFICATION_MANIFEST",
    machine_code: "RELEASE_VERIFICATION_MANIFEST_DECISION_V1",
    state_field_name: "decision_state",
    current_state: "APPROVED",
    previous_state_or_null: "PENDING",
    transition_event_code: "approval_granted",
    transition_applied_at: "2026-03-31T10:00:00+00:00",
    transition_audit_ref: "audit-1",
    transition_application_policy: "NAMED_EVENT_ONLY",
    illegal_transition_policy: "REJECT_WITH_TYPED_REASON_AND_NO_PARTIAL_WRITE",
    concurrency_guard_policy: "COMPARE_AND_SWAP_OR_SINGLE_WRITER_LEASE",
    terminal_reentry_policy: "TERMINAL_STATES_REQUIRE_NEW_LINEAGE",
    recovery_supersession_policy:
      "RECOVERY_AND_SUPERSESSION_ALLOCATE_SUCCESSOR_OR_SUPERSEDING_LINEAGE",
    audit_evidence_policy: "EVERY_TRANSITION_RETAINS_AUDIT_EVENT_REF",
    typed_rejection_family: "ILLEGAL_STATE_TRANSITION",
    ...overrides,
  };
}

function modulePayload(overrides: Record<string, unknown> = {}) {
  return {
    output_refs: {
      primary_notice_ref: "notice-1",
      secondary_notice_ref: null,
    },
    submission_refs: {
      receipt_ref: null,
    },
    totals: {
      gross_due: "200.00",
      net_due: "123.45",
    },
    gating_decisions: ["schema_compatibility", "deterministic_and_state_machine"],
    ...overrides,
  };
}

function moduleFixture(fixtureId: string, payload = modulePayload()) {
  return buildModuleGoldenFixture({
    fixture_id: fixtureId,
    module_code: "PERSIST_DECISION_BUNDLE",
    artifact_family: "DECISION_BUNDLE",
    scope_binding_hash: "scope-binding-hash-1",
    payload,
    expected_decimal_fields: [
      { field_path: "totals.net_due", decimal_value: "123.45" },
      { field_path: "totals.gross_due", decimal_value: "200.00" },
    ],
    expected_ordered_array_fields: [
      {
        field_path: "gating_decisions",
        expected_values: ["schema_compatibility", "deterministic_and_state_machine"],
      },
    ],
  });
}

export function deterministicGoldenPackFixture(
  input: {
    golden_pack_id?: string;
    module_fixture_ids?: readonly string[];
    module_payload?: Record<string, unknown>;
  } = {},
): DeterministicGoldenPack {
  const moduleFixtureIds = input.module_fixture_ids ?? [
    "decision-bundle-golden-b",
    "decision-bundle-golden-a",
  ];
  return buildDeterministicGoldenPack({
    golden_pack_id: input.golden_pack_id ?? "golden-pack-1",
    candidate_identity_contract: candidateIdentityFixture(),
    module_fixtures: moduleFixtureIds.map((fixtureId) =>
      moduleFixture(fixtureId, modulePayload(input.module_payload)),
    ),
    state_transition_fixtures: [
      buildStateTransitionGoldenFixture({
        fixture_id: "release-approval-transition-1",
        scope_binding_hash: "scope-binding-hash-2",
        state_transition_contract: stateTransitionContractFixture(),
      }),
    ],
    replay_fixtures: [
      buildReplayGoldenFixture({
        fixture_id: "standard-replay-golden-1",
        scope_binding_hash: "scope-binding-hash-3",
        replay_class: "STANDARD_REPLAY",
        comparison_mode: "EXACT_HASH_MATCH",
        expected_outcome_class: "EXACT_MATCH",
        expected_execution_basis_hash: "execution-basis-hash-1",
        expected_deterministic_outcome_hash: "deterministic-outcome-hash-1",
      }),
    ],
    cadence_fixtures: [
      buildCadenceGoldenFixture({
        fixture_id: "reconciliation-cadence-1",
        scope_binding_hash: "scope-binding-hash-4",
        cadence_family: "RECONCILIATION",
        attempt_index: 2,
        expected_cadence_seconds: 300,
        schedule_derivation_basis: "authority-interaction:exchange-1|attempt=2",
      }),
    ],
  });
}

test("builds schema-valid deterministic golden packs with frozen nulls, decimals, ordering, replay hashes, and cadence", async () => {
  const pack = deterministicGoldenPackFixture();

  await validateContractSchema("deterministic_golden_pack", pack);
  expect(pack.artifact_type).toBe("DeterministicGoldenPack");
  expect(pack.module_fixtures.map((fixture) => fixture.fixture_id)).toEqual([
    "decision-bundle-golden-a",
    "decision-bundle-golden-b",
  ]);
  expect(pack.module_fixtures[0]!.expected_null_field_paths).toEqual([
    "output_refs.secondary_notice_ref",
    "submission_refs.receipt_ref",
  ]);
  expect(pack.module_fixtures[0]!.expected_decimal_fields).toEqual([
    { field_path: "totals.gross_due", decimal_value: "200.00" },
    { field_path: "totals.net_due", decimal_value: "123.45" },
  ]);
  expect(typeof pack.module_fixtures[0]!.expected_decimal_fields[0]!.decimal_value).toBe(
    "string",
  );
  expect(pack.module_fixtures[0]!.expected_ordered_array_fields[0]).toEqual({
    field_path: "gating_decisions",
    ordering_policy: "PRESERVE_DECLARED_ORDER",
    expected_values: ["schema_compatibility", "deterministic_and_state_machine"],
  });
  expect(pack.replay_fixtures[0]!.expected_execution_basis_hash).toBe(
    "execution-basis-hash-1",
  );
  expect(pack.replay_fixtures[0]!.expected_deterministic_outcome_hash).toBe(
    "deterministic-outcome-hash-1",
  );
  expect(pack.cadence_fixtures[0]!.jitter_policy).toBe("NONE");
  expect(pack.golden_pack_hash).toBe(computeDeterministicGoldenPackHash(pack));
});

test("keeps fixture order canonical and changes the pack hash on material fixture content changes", () => {
  const left = deterministicGoldenPackFixture({
    module_fixture_ids: ["decision-bundle-golden-b", "decision-bundle-golden-a"],
  });
  const right = deterministicGoldenPackFixture({
    module_fixture_ids: ["decision-bundle-golden-a", "decision-bundle-golden-b"],
  });
  expect(left.golden_pack_hash).toBe(right.golden_pack_hash);
  expect(left.module_fixtures.map((fixture) => fixture.fixture_id)).toEqual(
    right.module_fixtures.map((fixture) => fixture.fixture_id),
  );

  const changedPayload = modulePayload({
    totals: {
      gross_due: "200.00",
      net_due: "123.46",
    },
  });
  const changedFixture = buildModuleGoldenFixture({
    fixture_id: "decision-bundle-golden-a",
    module_code: "PERSIST_DECISION_BUNDLE",
    artifact_family: "DECISION_BUNDLE",
    scope_binding_hash: "scope-binding-hash-1",
    payload: changedPayload,
    expected_decimal_fields: [
      { field_path: "totals.gross_due", decimal_value: "200.00" },
      { field_path: "totals.net_due", decimal_value: "123.46" },
    ],
    expected_ordered_array_fields: [
      {
        field_path: "gating_decisions",
        expected_values: ["schema_compatibility", "deterministic_and_state_machine"],
      },
    ],
  });
  const changedPack = buildDeterministicGoldenPack({
    ...left,
    module_fixtures: [changedFixture, left.module_fixtures[1]!],
    candidate_identity_contract: left.candidate_identity_contract,
  });
  expect(changedFixture.canonical_payload_hash).toBe(stableJsonHash(changedPayload));
  expect(changedPack.golden_pack_hash).not.toBe(left.golden_pack_hash);
});

test("rejects missing null slots, non-canonical decimals, replay contradictions, and cadence jitter", () => {
  expect(() =>
    buildModuleGoldenFixture({
      fixture_id: "missing-null-slot",
      module_code: "PERSIST_DECISION_BUNDLE",
      artifact_family: "DECISION_BUNDLE",
      scope_binding_hash: "scope-binding-hash-1",
      payload: { totals: { net_due: "123.45" }, gating_decisions: ["gate-a"] },
      expected_decimal_fields: [{ field_path: "totals.net_due", decimal_value: "123.45" }],
      expected_ordered_array_fields: [
        { field_path: "gating_decisions", expected_values: ["gate-a"] },
      ],
    }),
  ).toThrow(DeterministicGoldenPackModelError);

  expect(() =>
    buildModuleGoldenFixture({
      fixture_id: "decimal-exponent",
      module_code: "PERSIST_DECISION_BUNDLE",
      artifact_family: "DECISION_BUNDLE",
      scope_binding_hash: "scope-binding-hash-1",
      payload: modulePayload({ totals: { gross_due: "200.00", net_due: "1e3" } }),
      expected_decimal_fields: [{ field_path: "totals.net_due", decimal_value: "1e3" }],
      expected_ordered_array_fields: [
        {
          field_path: "gating_decisions",
          expected_values: ["schema_compatibility", "deterministic_and_state_machine"],
        },
      ],
    }),
  ).toThrow(/exact decimal string/);

  expect(() =>
    buildModuleGoldenFixture({
      fixture_id: "decimal-float-payload",
      module_code: "PERSIST_DECISION_BUNDLE",
      artifact_family: "DECISION_BUNDLE",
      scope_binding_hash: "scope-binding-hash-1",
      payload: modulePayload({ totals: { gross_due: "200.00", net_due: 123.45 } }),
      expected_decimal_fields: [{ field_path: "totals.net_due", decimal_value: "123.45" }],
      expected_ordered_array_fields: [
        {
          field_path: "gating_decisions",
          expected_values: ["schema_compatibility", "deterministic_and_state_machine"],
        },
      ],
    }),
  ).toThrow(/exact string value/);

  expect(() =>
    buildReplayGoldenFixture({
      fixture_id: "bad-replay",
      scope_binding_hash: "scope-binding-hash-3",
      replay_class: "STANDARD_REPLAY",
      comparison_mode: "EXACT_HASH_MATCH",
      expected_outcome_class: "UNEXPECTED_MISMATCH",
      expected_execution_basis_hash: "execution-basis-hash-1",
      expected_deterministic_outcome_hash: "deterministic-outcome-hash-1",
    }),
  ).toThrow(/EXACT_HASH_MATCH/);

  expect(() =>
    buildCadenceGoldenFixture({
      fixture_id: "bad-cadence",
      scope_binding_hash: "scope-binding-hash-4",
      cadence_family: "RETRY",
      attempt_index: 1,
      expected_cadence_seconds: 60,
      jitter_policy: "RANDOM" as "NONE",
      schedule_derivation_basis: "retry:attempt=1",
    }),
  ).toThrow(/jitter_policy=NONE/);
});

test("includes serialized payload trace when canonical pack hashes drift", () => {
  const pack = deterministicGoldenPackFixture();
  const stale = { ...pack, golden_pack_hash: "stale-hash" };
  expect(() => verifyDeterministicGoldenPackHash(stale)).toThrow(/trace=/);
  expect(deterministicGoldenPackSerializedFailureTrace(stale)).toContain(
    "deterministic_outcome_hash",
  );
});

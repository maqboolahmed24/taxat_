import type { LowNoiseBudgetAuditPack } from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  buildBudgetScenarioMatrix,
  defaultLowNoiseBudgetAuditSeed,
  type LowNoiseBudgetScenarioFixture,
} from "./build_budget_scenario_matrix.ts";
import { assertLowNoiseBudgetWithinFrozenRules } from "./build_low_noise_budget_audit.ts";

export function runLowNoiseBudgetAuditPack(input: {
  deterministicSeed?: number;
  fixtures?: readonly LowNoiseBudgetScenarioFixture[];
} = {}): LowNoiseBudgetAuditPack {
  const deterministicSeed = input.deterministicSeed ?? defaultLowNoiseBudgetAuditSeed;
  const cases = buildBudgetScenarioMatrix({
    deterministicSeed,
    fixtures: input.fixtures,
  }).sort((left, right) => left.case_id.localeCompare(right.case_id));

  for (const auditCase of cases) {
    assertLowNoiseBudgetWithinFrozenRules(auditCase.audit);
  }

  const packHash = stableJsonHash({
    cases,
    deterministic_seed: deterministicSeed,
    run_mode: "DETERMINISTIC_SEEDED_ENUMERATION",
    suite_profile: "CALM_SHELL_SURFACE_COMPRESSION_AND_NOISE_BUDGET_MATRIX",
  });

  return {
    cases,
    coalescing_policy: "NON_MATERIAL_DELTAS_COALESCE_BEFORE_ATTENTION_REORDER",
    contract_version: "LOW_NOISE_BUDGET_AUDIT_PACK_V1",
    copy_budget_policy: "FROZEN_MICROCOPY_BUDGETS_AND_LOSSLESS_DECISIVE_ATOMS",
    deterministic_seed: deterministicSeed,
    dominant_story_policy: "ONE_PRIMARY_ISSUE_AND_ONE_SAFE_NEXT_MOVE",
    pack_id: `low-noise-budget-audit-pack.${deterministicSeed}.${packHash.slice(0, 16)}`,
    posture_deduplication_policy: "ANALYSIS_MASKING_AND_LIMITATION_VISIBLE_ONCE",
    run_mode: "DETERMINISTIC_SEEDED_ENUMERATION",
    suite_profile: "CALM_SHELL_SURFACE_COMPRESSION_AND_NOISE_BUDGET_MATRIX",
  };
}

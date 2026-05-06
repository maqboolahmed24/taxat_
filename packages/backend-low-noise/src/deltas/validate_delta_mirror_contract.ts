import { isDeepStrictEqual } from "node:util";

import type { ExperienceDelta } from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import { lowNoiseCognitiveBudget } from "../models/low_noise_frame.ts";

export class LowNoiseDeltaPublicationError extends Error {
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: string[]) {
    super(message);
    this.name = "LowNoiseDeltaPublicationError";
    this.reasonCodes = reasonCodes;
  }
}

function fail(message: string, reasonCodes: string[]): never {
  throw new LowNoiseDeltaPublicationError(message, reasonCodes);
}

function assertMirror(
  deltaValue: unknown,
  policyValue: unknown,
  fieldName: string,
) {
  if (!isDeepStrictEqual(deltaValue, policyValue)) {
    fail(`ExperienceDelta field ${fieldName} drifted from attention_policy`, [
      "LOW_NOISE_DELTA_ATTENTION_MIRROR_DRIFT",
    ]);
  }
}

export function validateDeltaMirrorContract(delta: ExperienceDelta) {
  if (delta.shell_route_key !== delta.manifest_id) {
    fail("ExperienceDelta shell_route_key must equal manifest_id", [
      "LOW_NOISE_DELTA_ROUTE_KEY_DRIFT",
    ]);
  }

  for (const fieldName of [
    "attention_state",
    "primary_object_ref",
    "actionability_state",
    "primary_action_code",
    "no_safe_action_reason_code",
    "secondary_notice_count",
    "detail_entry_points",
    "suggested_detail_surface_code",
  ] as const) {
    assertMirror(delta[fieldName], delta.attention_policy[fieldName], fieldName);
  }

  const updateSurfaceCodes = delta.surface_updates.map((update) => update.surface_code).sort();
  const affectedSurfaceCodes = [...delta.affected_surface_codes].sort();
  if (!isDeepStrictEqual(updateSurfaceCodes, affectedSurfaceCodes)) {
    fail("ExperienceDelta affected surfaces must match surface update set", [
      "LOW_NOISE_DELTA_AFFECTED_SURFACE_DRIFT",
    ]);
  }

  if (
    delta.attention_policy.dominance_margin !==
    delta.attention_policy.primary_rank_score - delta.attention_policy.runner_up_rank_score
  ) {
    fail("ExperienceDelta attention dominance margin drifted from rank scores", [
      "LOW_NOISE_DELTA_DOMINANCE_MARGIN_DRIFT",
    ]);
  }

  if (!isDeepStrictEqual(delta.cognitive_budget, lowNoiseCognitiveBudget)) {
    fail("ExperienceDelta cognitive budget constants drifted", [
      "LOW_NOISE_DELTA_COGNITIVE_BUDGET_DRIFT",
    ]);
  }

  if (
    delta.active_detail_surface_code !== null &&
    delta.active_detail_surface_code !== undefined &&
    !delta.detail_entry_points?.includes(delta.active_detail_surface_code)
  ) {
    fail("ExperienceDelta active detail module must be ranked in detail_entry_points", [
      "LOW_NOISE_DELTA_ACTIVE_DETAIL_NOT_RANKED",
    ]);
  }

  for (const update of delta.surface_updates) {
    if (update.surface_code !== "ACTION_STRIP") {
      continue;
    }
    const payload = update.payload as Record<string, unknown>;
    if (
      delta.actionability_state === "ACTION_AVAILABLE" &&
      payload.action_state !== "ACTIONABLE"
    ) {
      fail("Action strip payload must be actionable when shell actionability is available", [
        "LOW_NOISE_DELTA_ACTION_STRIP_STATE_DRIFT",
      ]);
    }
    if (
      delta.actionability_state === "NO_SAFE_ACTION" &&
      payload.action_state === "ACTIONABLE"
    ) {
      fail("Action strip payload cannot be actionable when shell has no safe action", [
        "LOW_NOISE_DELTA_ACTION_STRIP_STATE_DRIFT",
      ]);
    }
  }

  return delta;
}

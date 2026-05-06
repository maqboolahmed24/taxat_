import { isDeepStrictEqual } from "node:util";

import type { LowNoiseExperienceFrameRecord } from "../models/low_noise_frame.ts";
import {
  assertLowNoiseBudgetWithinFrozenRules,
  deriveFrameSurfaceBudgetContract,
} from "./derive_surface_budget_contract.ts";
import { validateOperatorInteractionLayerContract } from "./validate_operator_interaction_layer_contract.ts";
import { validateLowNoiseShellSalienceAlignment } from "./validate_shell_salience_alignment.ts";
import { validatePublishedSurfaceOrder } from "./validate_published_surface_order.ts";

export class LowNoiseFramePublicationError extends Error {
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: string[]) {
    super(message);
    this.name = "LowNoiseFramePublicationError";
    this.reasonCodes = reasonCodes;
  }
}

function fail(message: string, reasonCodes: string[]): never {
  throw new LowNoiseFramePublicationError(message, reasonCodes);
}

function assertEqual(left: unknown, right: unknown, message: string, reasonCodes: string[]) {
  if (!isDeepStrictEqual(left, right)) {
    fail(message, reasonCodes);
  }
}

const forbiddenRouteLocalSalienceKeys = new Set([
  "client_salience",
  "client_salience_rank",
  "local_surface_rank",
  "renderer_local_salience",
  "route_local_salience",
  "surface_priority",
  "surface_salience_override",
  "surface_weights",
]);

function assertNoRouteLocalClientSalience(value: unknown, path = "frame") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoRouteLocalClientSalience(entry, `${path}[${index}]`));
    return;
  }
  if (typeof value !== "object" || value === null) {
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenRouteLocalSalienceKeys.has(key)) {
      fail(`${path}.${key} cannot publish route-local or client salience`, [
        "LOW_NOISE_ROUTE_LOCAL_SALIENCE_FORBIDDEN",
      ]);
    }
    assertNoRouteLocalClientSalience(child, `${path}.${key}`);
  }
}

function assertSurfaceMirrors(frame: LowNoiseExperienceFrameRecord) {
  assertEqual(frame.context_bar.connection_state, frame.connection_state, "context connection drifted", [
    "LOW_NOISE_CONTEXT_CONNECTION_DRIFT",
  ]);
  assertEqual(frame.context_bar.truth_origin, frame.truth_origin, "context truth origin drifted", [
    "LOW_NOISE_CONTEXT_TRUTH_ORIGIN_DRIFT",
  ]);
  assertEqual(
    frame.decision_summary.attention_state,
    frame.attention_policy.attention_state,
    "decision summary attention state drifted",
    ["LOW_NOISE_SUMMARY_ATTENTION_DRIFT"],
  );
  assertEqual(
    frame.decision_summary.visible_warning_count,
    frame.attention_policy.visible_warning_count,
    "visible warning count drifted",
    ["LOW_NOISE_WARNING_COUNT_DRIFT"],
  );
  assertEqual(
    frame.action_strip.actionability_state,
    frame.attention_policy.actionability_state,
    "actionability state drifted",
    ["LOW_NOISE_ACTIONABILITY_DRIFT"],
  );
  assertEqual(
    frame.action_strip.suggested_detail_surface_code,
    frame.attention_policy.suggested_detail_surface_code,
    "suggested detail surface drifted",
    ["LOW_NOISE_SUGGESTED_DETAIL_DRIFT"],
  );
  assertEqual(
    frame.action_strip.active_detail_surface_code,
    frame.active_detail_surface_code,
    "active detail surface drifted in action strip",
    ["LOW_NOISE_ACTIVE_DETAIL_DRIFT"],
  );
  assertEqual(
    frame.detail_drawer.expanded_module_code,
    frame.active_detail_surface_code,
    "active detail surface drifted in detail drawer",
    ["LOW_NOISE_ACTIVE_DETAIL_DRIFT"],
  );
  assertEqual(frame.action_strip.focus_anchor_ref, frame.focus_anchor_ref, "action focus drifted", [
    "LOW_NOISE_FOCUS_DRIFT",
  ]);
  assertEqual(frame.detail_drawer.focus_anchor_ref, frame.focus_anchor_ref, "drawer focus drifted", [
    "LOW_NOISE_FOCUS_DRIFT",
  ]);
  assertEqual(
    frame.detail_drawer.entry_points.map((entry) => entry.module_code),
    frame.attention_policy.detail_entry_points,
    "detail drawer entry order drifted from attention policy",
    ["LOW_NOISE_DETAIL_ENTRY_ORDER_DRIFT"],
  );
  if (
    frame.active_detail_surface_code !== null &&
    !frame.attention_policy.detail_entry_points.includes(frame.active_detail_surface_code)
  ) {
    fail("active detail module must appear in attention policy detail entry points", [
      "LOW_NOISE_ACTIVE_DETAIL_NOT_RANKED",
    ]);
  }

  if (frame.attention_policy.actionability_state === "ACTION_AVAILABLE") {
    assertEqual(
      frame.attention_policy.primary_action_code,
      frame.action_strip.primary_action?.action_code ?? null,
      "primary action code drifted",
      ["LOW_NOISE_PRIMARY_ACTION_DRIFT"],
    );
  } else {
    assertEqual(
      frame.attention_policy.no_safe_action_reason_code,
      frame.action_strip.no_safe_action_reason_code,
      "no-safe-action reason drifted",
      ["LOW_NOISE_NO_SAFE_ACTION_REASON_DRIFT"],
    );
  }
}

function assertFailClosedRecoveryPosture(frame: LowNoiseExperienceFrameRecord) {
  const requiresNoSafeAction =
    frame.recovery_posture !== "NONE" ||
    ["STALE_REVIEW_REQUIRED", "DEGRADED_READ_ONLY", "RECOVERY_REQUIRED"].includes(
      frame.settlement_state,
    ) ||
    ["STALE", "DEGRADED"].includes(frame.connection_state);
  if (!requiresNoSafeAction) {
    return;
  }
  assertEqual(frame.action_strip.actionability_state, "NO_SAFE_ACTION", "recovery must fail closed", [
    "LOW_NOISE_RECOVERY_ACTIONABILITY_DRIFT",
  ]);
  assertEqual(
    frame.action_strip.mode_safety_posture,
    "NON_LIVE_MUTATIONS_FORBIDDEN",
    "recovery must forbid non-live mutations",
    ["LOW_NOISE_RECOVERY_SAFETY_DRIFT"],
  );
}

function assertContinuityAndCacheContracts(frame: LowNoiseExperienceFrameRecord) {
  assertEqual(frame.shell_route_key, frame.manifest_id, "shell route key drifted from manifest id", [
    "LOW_NOISE_ROUTE_KEY_DRIFT",
  ]);
  assertEqual(
    frame.cross_device_continuity_contract.continuity_scope,
    "MANIFEST_ROUTE",
    "continuity scope drifted",
    ["LOW_NOISE_CONTINUITY_SCOPE_DRIFT"],
  );
  assertEqual(
    frame.cross_device_continuity_contract.canonical_object_ref,
    frame.object_anchor_ref,
    "continuity object anchor drifted",
    ["LOW_NOISE_CONTINUITY_OBJECT_DRIFT"],
  );
  assertEqual(
    frame.cross_device_continuity_contract.route_identity_ref,
    frame.shell_route_key,
    "continuity route identity drifted",
    ["LOW_NOISE_CONTINUITY_ROUTE_DRIFT"],
  );
  assertEqual(
    frame.cross_device_continuity_contract.focus_anchor_ref_or_null,
    frame.focus_anchor_ref,
    "continuity focus anchor drifted",
    ["LOW_NOISE_CONTINUITY_FOCUS_DRIFT"],
  );
  assertEqual(
    frame.cross_device_continuity_contract.dominant_action_state_or_null,
    frame.action_strip.actionability_state,
    "continuity dominant action state drifted",
    ["LOW_NOISE_CONTINUITY_ACTION_DRIFT"],
  );
  assertEqual(
    frame.cache_isolation_contract.cache_scope_class,
    "LOW_NOISE_FRAME",
    "cache scope drifted",
    ["LOW_NOISE_CACHE_SCOPE_DRIFT"],
  );
  assertEqual(
    frame.cache_isolation_contract.route_identity_ref,
    frame.shell_route_key,
    "cache route identity drifted",
    ["LOW_NOISE_CACHE_ROUTE_DRIFT"],
  );
  assertEqual(
    frame.cache_isolation_contract.canonical_object_ref,
    frame.object_anchor_ref,
    "cache object anchor drifted",
    ["LOW_NOISE_CACHE_OBJECT_DRIFT"],
  );
}

export function validateLowNoiseFramePublication(frame: LowNoiseExperienceFrameRecord) {
  assertNoRouteLocalClientSalience(frame);
  assertEqual(frame.artifact_type, "LowNoiseExperienceFrame", "artifact type drifted", [
    "LOW_NOISE_FRAME_SCHEMA_INVALID",
  ]);
  assertEqual(frame.experience_profile, "LOW_NOISE", "experience profile drifted", [
    "LOW_NOISE_FRAME_PROFILE_DRIFT",
  ]);
  assertEqual(frame.shell_family, "CALM_SHELL", "shell family drifted", [
    "LOW_NOISE_FRAME_SHELL_FAMILY_DRIFT",
  ]);
  validatePublishedSurfaceOrder({
    budgetRenderedSurfaceOrder: frame.low_noise_budget_audit.rendered_surface_order,
    surfaceOrder: frame.surface_order,
  });
  assertSurfaceMirrors(frame);
  assertFailClosedRecoveryPosture(frame);
  assertContinuityAndCacheContracts(frame);
  validateOperatorInteractionLayerContract({
    actionabilityState: frame.action_strip.actionability_state,
    interactionLayer: frame.interaction_layer,
    recoveryPosture: frame.recovery_posture,
    settlementState: frame.settlement_state,
  });

  const expectedBudgetAudit = deriveFrameSurfaceBudgetContract(frame);
  assertLowNoiseBudgetWithinFrozenRules(expectedBudgetAudit);
  assertEqual(frame.low_noise_budget_audit, expectedBudgetAudit, "budget audit drifted", [
    "LOW_NOISE_BUDGET_AUDIT_DRIFT",
  ]);

  validateLowNoiseShellSalienceAlignment(frame);

  return frame;
}

import type { ContextBarState } from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import type { LowNoiseSurfaceProjectorInput } from "../models/low_noise_surface_projector_input.ts";
import { enforceLowNoiseCopyBudget } from "../services/enforce_low_noise_copy_budgets.ts";

export function normalizedContextConnectionState(
  connectionState: ContextBarState["connection_state"] | undefined,
): ContextBarState["connection_state"] {
  return connectionState === "RECONNECTING" ? "CATCHING_UP" : (connectionState ?? "CONNECTED");
}

export function freshnessStateFor(
  connectionState: ContextBarState["connection_state"],
): ContextBarState["freshness_state"] {
  switch (connectionState) {
    case "CONNECTED":
      return "FRESH";
    case "CATCHING_UP":
    case "RECONNECTING":
      return "CATCHING_UP";
    case "STALE":
      return "STALE";
    case "DEGRADED":
      return "DEGRADED";
  }
}

export function buildContextBarState(input: LowNoiseSurfaceProjectorInput): ContextBarState {
  const ownerHandoffPosture = input.ownerHandoffPosture ?? "UNASSIGNED";
  const limitationStatement =
    input.posture.modePosture === "LIVE_COMPLIANCE"
      ? null
      : enforceLowNoiseCopyBudget(
          input.contextLimitationStatement,
          "blockingReason",
          "Read-only while the manifest is recovering.",
        );
  return {
    artifact_type: "ContextBarState",
    connection_state: input.posture.connectionState,
    freshness_state: freshnessStateFor(input.posture.connectionState),
    full_text_ref: `low-noise-full-text://${input.manifestId}/context-bar`,
    limitation_statement: limitationStatement,
    manifest_label: enforceLowNoiseCopyBudget(
      input.manifestLabel,
      "manifestLabel",
      `Manifest ${input.manifestId}`,
    ),
    mode_posture: input.posture.modePosture,
    owner_handoff_posture: ownerHandoffPosture,
    owner_label:
      ownerHandoffPosture === "UNASSIGNED"
        ? null
        : enforceLowNoiseCopyBudget(input.ownerLabel, "ownerLabel", "Operator"),
    period_label: enforceLowNoiseCopyBudget(input.periodLabel, "contextLabel", "Current period"),
    phase_label: enforceLowNoiseCopyBudget(input.workflowPhaseLabel, "contextLabel", "Published"),
    scope_label: enforceLowNoiseCopyBudget(input.scopeLabel, "contextLabel", "Manifest"),
    source_module_code: "MANIFEST_RIBBON",
    surface_code: "CONTEXT_BAR",
    truth_origin: input.truthOrigin,
  };
}

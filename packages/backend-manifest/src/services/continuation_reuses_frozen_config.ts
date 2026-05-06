import type { ConfigFreezeRunKind } from "../models/config_freeze.ts";
import {
  mapConfigInheritanceModeToResolutionBasis,
  type ContinuationConfigInheritanceMode,
} from "./config_basis_mapper.ts";

export type ReplayClass =
  | "COUNTERFACTUAL_ANALYSIS"
  | "EXACT_REPLAY"
  | "HISTORICAL_REPLAY"
  | "OPERATIONAL_REPLAY"
  | null;

export type ContinuationConfigReuseInput = {
  fresh_child_requested?: boolean;
  historical_explicit_config_ref?: string | null;
  recovery_requested?: boolean;
  replay_class?: ReplayClass;
  run_kind: ConfigFreezeRunKind;
};

export type ContinuationConfigReuseDecision = {
  config_resolution_basis: ReturnType<typeof mapConfigInheritanceModeToResolutionBasis>;
  continuation_config_inheritance_mode: ContinuationConfigInheritanceMode;
  reason_code:
    | "FRESH_CHILD_DIRECT_RESOLUTION"
    | "HISTORICAL_EXPLICIT_REUSE"
    | "RECOVERY_EXACT_REUSE"
    | "REPLAY_EXACT_REUSE"
    | "ROOT_DIRECT_RESOLUTION";
  reuse_frozen_config: boolean;
  source_config_freeze_required: boolean;
};

export function continuationReusesFrozenConfig(
  input: ContinuationConfigReuseInput,
): ContinuationConfigReuseDecision {
  const mode: ContinuationConfigInheritanceMode = input.recovery_requested
    ? "RECOVERY_EXACT"
    : input.run_kind === "REPLAY" && input.replay_class !== "COUNTERFACTUAL_ANALYSIS"
      ? "REPLAY_EXACT"
      : input.historical_explicit_config_ref
        ? "HISTORICAL_EXPLICIT"
        : input.fresh_child_requested
          ? "FRESH_CHILD_RESOLUTION"
          : null;
  const basis = mapConfigInheritanceModeToResolutionBasis(mode);
  const reuse = basis !== "DIRECT_REQUEST_RESOLUTION";
  const reasonCode =
    mode === null
      ? "ROOT_DIRECT_RESOLUTION"
      : mode === "FRESH_CHILD_RESOLUTION"
        ? "FRESH_CHILD_DIRECT_RESOLUTION"
        : mode === "REPLAY_EXACT"
          ? "REPLAY_EXACT_REUSE"
          : mode === "RECOVERY_EXACT"
            ? "RECOVERY_EXACT_REUSE"
            : "HISTORICAL_EXPLICIT_REUSE";
  return {
    continuation_config_inheritance_mode: mode,
    config_resolution_basis: basis,
    reuse_frozen_config: reuse,
    source_config_freeze_required: reuse,
    reason_code: reasonCode,
  };
}

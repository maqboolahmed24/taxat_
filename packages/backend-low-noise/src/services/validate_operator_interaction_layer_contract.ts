import { isDeepStrictEqual } from "node:util";

import type { OperatorInteractionLayer } from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import type {
  LowNoiseActionabilityState,
  LowNoiseRecoveryPosture,
  LowNoiseSettlementState,
} from "../models/low_noise_frame.ts";
import { projectOperatorInteractionLayer } from "./project_operator_interaction_layer.ts";
import type { CalmShellEmbodiment } from "./derive_calm_shell_preview_notification_and_history_posture.ts";

export class OperatorInteractionLayerContractError extends Error {
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: string[]) {
    super(message);
    this.name = "OperatorInteractionLayerContractError";
    this.reasonCodes = reasonCodes;
  }
}

function fail(message: string, reasonCodes: string[]): never {
  throw new OperatorInteractionLayerContractError(message, reasonCodes);
}

export function validateOperatorInteractionLayerContract(input: {
  actionabilityState?: LowNoiseActionabilityState | undefined;
  embodiment?: CalmShellEmbodiment | undefined;
  interactionLayer: OperatorInteractionLayer;
  recoveryPosture?: LowNoiseRecoveryPosture | undefined;
  settlementState?: LowNoiseSettlementState | undefined;
}) {
  const expected = projectOperatorInteractionLayer({
    actionabilityState: input.actionabilityState,
    embodiment: input.embodiment,
    recoveryPosture: input.recoveryPosture,
    settlementState: input.settlementState,
  });
  if (!isDeepStrictEqual(input.interactionLayer, expected)) {
    fail("Operator interaction layer drifted from the calm-shell projector", [
      "OPERATOR_INTERACTION_LAYER_DRIFT",
    ]);
  }
  if (
    input.interactionLayer.recovery_notice_surface === "IDENTITY_HEADER" &&
    input.interactionLayer.artifact_preview_surface !== "SECONDARY_WINDOW_BODY"
  ) {
    fail("Identity-header recovery is lawful only for parent-bound secondary windows", [
      "OPERATOR_INTERACTION_IDENTITY_HEADER_WITHOUT_SECONDARY_WINDOW",
    ]);
  }
  return input.interactionLayer;
}

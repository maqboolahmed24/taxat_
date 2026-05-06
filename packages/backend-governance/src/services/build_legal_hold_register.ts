import type { RetentionGovernanceFrame } from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";

export const retentionLegalHoldColumnOrder = [
  "CLIENT",
  "OBJECT_REF",
  "HOLD_REASON",
  "RELEASE_ELIGIBILITY",
  "BLOCKED_ERASURE_COUNT",
  "LAST_CHANGED_AT",
] as const satisfies readonly RetentionGovernanceFrame["legal_hold_register"]["column_order"][number][];

export type RetentionLegalHoldInput = {
  affectedArtifactCount?: number | undefined;
  blockedErasureItemRefs?: readonly string[] | undefined;
  clientRef: string;
  holdReasonRef: string;
  holdRef: string;
  holdState: RetentionGovernanceFrame["retention_workspace"]["active_filters"]["legal_hold_states"][number];
  lastChangedAt: string;
  objectRef: string;
  projectedProvenanceLimitationRefs?: readonly string[] | undefined;
  projectedPseudonymisationCount?: number | undefined;
  releaseEligibilityState: RetentionGovernanceFrame["retention_workspace"]["active_filters"]["release_eligibility_states"][number];
  releasePreviewRef?: string | null | undefined;
};

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))].sort((left, right) =>
    left.localeCompare(right),
  );
}

export function releasePreviewRefFor(holdRef: string) {
  return `legal-hold-release-preview.${holdRef}`;
}

export function buildLegalHoldRegister(input: {
  holds?: readonly RetentionLegalHoldInput[] | undefined;
  selectedHoldRef?: string | null | undefined;
  workspaceMode: RetentionGovernanceFrame["retention_workspace"]["workspace_mode"];
}): {
  legal_hold_register: RetentionGovernanceFrame["legal_hold_register"];
  selectedHold: RetentionLegalHoldInput | null;
} {
  const holds = [...(input.holds ?? [])].sort((left, right) =>
    left.holdRef.localeCompare(right.holdRef),
  );
  const hold_refs = holds.map((hold) => hold.holdRef);
  const blocking_hold_refs = uniqueSorted(
    holds
      .filter((hold) => hold.releaseEligibilityState === "BLOCKED")
      .map((hold) => hold.holdRef),
  );
  const release_candidate_hold_refs = uniqueSorted(
    holds
      .filter((hold) => hold.releaseEligibilityState === "RELEASE_ELIGIBLE")
      .map((hold) => hold.holdRef),
  );
  const selected_hold_ref_or_null =
    input.workspaceMode === "LEGAL_HOLDS" && hold_refs.length > 0
      ? input.selectedHoldRef && hold_refs.includes(input.selectedHoldRef)
        ? input.selectedHoldRef
        : release_candidate_hold_refs[0] ?? hold_refs[0]!
      : null;
  const selectedHold =
    selected_hold_ref_or_null === null
      ? null
      : holds.find((hold) => hold.holdRef === selected_hold_ref_or_null) ?? null;
  const release_action_posture =
    selectedHold === null
      ? "NONE_SELECTED"
      : selectedHold.releaseEligibilityState === "RELEASE_ELIGIBLE"
        ? "CHANGE_BASKET_REQUIRED"
        : "PREVIEW_ONLY";
  const release_preview_ref_or_null =
    selectedHold === null
      ? null
      : selectedHold.releasePreviewRef ?? releasePreviewRefFor(selectedHold.holdRef);

  return {
    legal_hold_register: {
      blocking_hold_refs,
      column_order: [...retentionLegalHoldColumnOrder],
      hold_refs,
      release_action_posture,
      release_candidate_hold_refs,
      release_preview_ref_or_null,
      selected_hold_ref_or_null,
    },
    selectedHold,
  };
}

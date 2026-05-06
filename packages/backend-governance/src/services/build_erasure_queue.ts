import type { RetentionGovernanceFrame } from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";

export const retentionErasureSectionOrder = [
  "ELIGIBLE",
  "BLOCKED",
  "PENDING_REVIEW",
] as const satisfies readonly RetentionGovernanceFrame["erasure_queue"]["section_order"][number][];

export type RetentionErasureQueueItemInput = {
  affectedArtifactCount?: number | undefined;
  artifactClass: string;
  artifactRef: string;
  blockerRefs?: readonly string[] | undefined;
  clientRef: string;
  itemRef: string;
  projectedProvenanceLimitationRefs?: readonly string[] | undefined;
  projectedPseudonymisationCount?: number | undefined;
  readinessState: RetentionGovernanceFrame["retention_workspace"]["active_filters"]["erasure_readiness_states"][number];
};

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))].sort((left, right) =>
    left.localeCompare(right),
  );
}

export function buildErasureQueue(input: {
  items?: readonly RetentionErasureQueueItemInput[] | undefined;
  selectedItemRef?: string | null | undefined;
  workspaceMode: RetentionGovernanceFrame["retention_workspace"]["workspace_mode"];
}): {
  erasure_queue: RetentionGovernanceFrame["erasure_queue"];
  selectedItem: RetentionErasureQueueItemInput | null;
} {
  const items = [...(input.items ?? [])].sort((left, right) =>
    left.itemRef.localeCompare(right.itemRef),
  );
  const eligible_item_refs = uniqueSorted(
    items.filter((item) => item.readinessState === "ELIGIBLE").map((item) => item.itemRef),
  );
  const blocked_item_refs = uniqueSorted(
    items.filter((item) => item.readinessState === "BLOCKED").map((item) => item.itemRef),
  );
  const pending_review_item_refs = uniqueSorted(
    items
      .filter((item) => item.readinessState === "PENDING_REVIEW")
      .map((item) => item.itemRef),
  );
  const allRefs = [...eligible_item_refs, ...blocked_item_refs, ...pending_review_item_refs];
  const selected_item_ref_or_null =
    input.workspaceMode === "ERASURE" && allRefs.length > 0
      ? input.selectedItemRef && allRefs.includes(input.selectedItemRef)
        ? input.selectedItemRef
        : blocked_item_refs[0] ?? pending_review_item_refs[0] ?? eligible_item_refs[0]!
      : null;
  const selectedItem =
    selected_item_ref_or_null === null
      ? null
      : items.find((item) => item.itemRef === selected_item_ref_or_null) ?? null;
  const primary_blocker_ref_or_null =
    blocked_item_refs.length === 0
      ? null
      : selected_item_ref_or_null && blocked_item_refs.includes(selected_item_ref_or_null)
        ? selected_item_ref_or_null
        : blocked_item_refs[0]!;

  return {
    erasure_queue: {
      blocked_item_refs,
      destructive_flow_mode: "CHANGE_BASKET_ONLY",
      eligible_item_refs,
      pending_review_item_refs,
      primary_blocker_ref_or_null,
      section_order: [...retentionErasureSectionOrder],
      selected_item_ref_or_null,
    },
    selectedItem,
  };
}

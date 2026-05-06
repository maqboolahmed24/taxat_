import type {
  GovernancePolicySnapshotChangeBasket,
  GovernancePolicySnapshotConfigHistoryTimeline,
  GovernancePolicySnapshotRecoveryPosture,
} from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";

export type BuildConfigHistoryTimelineInput = {
  changeBasket?: GovernancePolicySnapshotChangeBasket | undefined;
  lastMaterialChangeRef: string;
  recoveryPosture?: GovernancePolicySnapshotRecoveryPosture | undefined;
  selectedChangeRef?: string | null | undefined;
  visibleChangeRefs?: readonly string[] | undefined;
};

export class ConfigHistoryTimelineProjectionError extends Error {
  constructor(detail: string) {
    super(`CONFIG_HISTORY_TIMELINE_INVALID: ${detail}`);
    this.name = "ConfigHistoryTimelineProjectionError";
  }
}

function requireNonEmptyString(label: string, value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  if (normalized.length === 0) {
    throw new ConfigHistoryTimelineProjectionError(`${label} must be a non-empty string`);
  }
  return normalized;
}

function uniquePreservingOrder(values: readonly string[]) {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    if (!seen.has(value)) {
      output.push(value);
      seen.add(value);
    }
  }
  return output;
}

function boundedVisibleRefs(input: {
  latest: string;
  selected: string;
  visibleRefs: readonly string[];
}) {
  const normalized = uniquePreservingOrder(
    input.visibleRefs.map((ref) => requireNonEmptyString("visibleChangeRefs[]", ref)),
  );
  const required = uniquePreservingOrder([input.latest, input.selected, ...normalized]);
  if (required.length <= 12) {
    return required;
  }
  return uniquePreservingOrder([
    input.latest,
    input.selected,
    ...required.filter((ref) => ref !== input.latest && ref !== input.selected).slice(0, 10),
  ]);
}

export function buildConfigHistoryTimeline(
  input: BuildConfigHistoryTimelineInput,
): GovernancePolicySnapshotConfigHistoryTimeline {
  const latest_change_ref = requireNonEmptyString(
    "lastMaterialChangeRef",
    input.lastMaterialChangeRef,
  );
  const selected_change_ref = requireNonEmptyString(
    "selectedChangeRef",
    input.selectedChangeRef ?? latest_change_ref,
  );
  const visible_change_refs = boundedVisibleRefs({
    latest: latest_change_ref,
    selected: selected_change_ref,
    visibleRefs: input.visibleChangeRefs ?? [latest_change_ref],
  });
  const rebaseRequired =
    input.recoveryPosture === "INLINE_REBASE" ||
    input.changeBasket?.basket_state === "STALE_REBASE_REQUIRED";

  return {
    latest_change_ref,
    selected_change_ref,
    timeline_state: rebaseRequired
      ? "REBASE_REQUIRED"
      : selected_change_ref === latest_change_ref
        ? "CURRENT"
        : "HISTORICAL_REVIEW",
    visible_change_refs,
  };
}

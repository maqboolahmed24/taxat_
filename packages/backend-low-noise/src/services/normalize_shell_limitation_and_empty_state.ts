import type {
  ShellStateTaxonomyContract,
} from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";

export class ShellStateTaxonomyProjectionError extends Error {
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: string[]) {
    super(message);
    this.name = "ShellStateTaxonomyProjectionError";
    this.reasonCodes = reasonCodes;
  }
}

export type ShellEmptyState = ShellStateTaxonomyContract["current_empty_state_or_null"];
export type ShellEmptySurfaceCode = NonNullable<
  ShellStateTaxonomyContract["current_empty_surface_code_or_null"]
>;

export type ShellEmptyStateCandidate = {
  currentEmptyStateOrNull: ShellEmptyState;
  currentEmptySurfaceCodeOrNull: ShellEmptySurfaceCode | null;
  limitationReasonCodes?: readonly string[] | undefined;
  priority?: number | undefined;
};

export type NormalizedShellLimitationAndEmptyState = {
  currentEmptyStateOrNull: ShellEmptyState;
  currentEmptySurfaceCodeOrNull: ShellStateTaxonomyContract["current_empty_surface_code_or_null"];
  limitationReasonCodes: string[];
};

function fail(message: string, reasonCodes: string[]): never {
  throw new ShellStateTaxonomyProjectionError(message, reasonCodes);
}

function uniqueNonEmptyStrings(values: readonly string[] | undefined) {
  return [
    ...new Set(
      (values ?? []).map((value) => value.trim()).filter((value) => value.length > 0),
    ),
  ];
}

export function normalizeShellLimitationAndEmptyState(input: {
  candidates?: readonly ShellEmptyStateCandidate[] | undefined;
  currentEmptyStateOrNull?: ShellEmptyState | undefined;
  currentEmptySurfaceCodeOrNull?:
    | ShellStateTaxonomyContract["current_empty_surface_code_or_null"]
    | undefined;
  limitationReasonCodes?: readonly string[] | undefined;
}): NormalizedShellLimitationAndEmptyState {
  const directCandidate =
    input.currentEmptyStateOrNull === undefined
      ? null
      : {
          currentEmptyStateOrNull: input.currentEmptyStateOrNull,
          currentEmptySurfaceCodeOrNull: input.currentEmptySurfaceCodeOrNull ?? null,
          limitationReasonCodes: input.limitationReasonCodes,
          priority: -1,
        };
  const candidates = [...(directCandidate ? [directCandidate] : []), ...(input.candidates ?? [])]
    .map((candidate, originalIndex) => ({ ...candidate, originalIndex }))
    .sort(
      (left, right) =>
        (left.priority ?? left.originalIndex) - (right.priority ?? right.originalIndex),
    );
  const selected =
    candidates.find((candidate) => candidate.currentEmptyStateOrNull !== null) ?? null;

  if (selected === null) {
    return {
      currentEmptyStateOrNull: null,
      currentEmptySurfaceCodeOrNull: null,
      limitationReasonCodes: [],
    };
  }
  if (selected.currentEmptySurfaceCodeOrNull === null) {
    fail("Shell empty-state projection requires a canonical non-empty surface code", [
      "SHELL_EMPTY_SURFACE_REQUIRED",
    ]);
  }

  if (selected.currentEmptyStateOrNull === "LIMITED") {
    const limitationReasonCodes = uniqueNonEmptyStrings(selected.limitationReasonCodes);
    if (limitationReasonCodes.length === 0) {
      fail("Shell LIMITED taxonomy requires typed limitation reason codes", [
        "SHELL_LIMITED_REASON_CODES_REQUIRED",
      ]);
    }
    return {
      currentEmptyStateOrNull: "LIMITED",
      currentEmptySurfaceCodeOrNull: selected.currentEmptySurfaceCodeOrNull,
      limitationReasonCodes,
    };
  }

  const nonLimitedReasonCodes = uniqueNonEmptyStrings(selected.limitationReasonCodes);
  if (nonLimitedReasonCodes.length > 0) {
    fail("Shell limitation reason codes must clear unless the empty state is LIMITED", [
      "SHELL_NON_LIMITED_REASON_CODES_FORBIDDEN",
    ]);
  }
  return {
    currentEmptyStateOrNull: selected.currentEmptyStateOrNull,
    currentEmptySurfaceCodeOrNull: selected.currentEmptySurfaceCodeOrNull,
    limitationReasonCodes: [],
  };
}

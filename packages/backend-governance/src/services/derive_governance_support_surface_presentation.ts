export type GovernanceSupportSurfaceCode =
  | "ACCESS_INSPECTOR"
  | "APPROVAL_COMPOSER"
  | "AUDIT_SIDECAR"
  | "AUTHORITY_CHAIN_PANEL"
  | "BLAST_RADIUS_PANEL"
  | "CHANGE_BASKET"
  | "EXPORT_ELIGIBILITY_PANEL"
  | "GUIDED_HANDSHAKE_STEPPER"
  | "POLICY_SIMULATOR"
  | "RETENTION_IMPACT_PREVIEW";

export type GovernanceSupportSurfaceCandidate = {
  priority: number;
  promoted?: boolean | undefined;
  surface: GovernanceSupportSurfaceCode;
};

export class GovernanceSupportSurfacePresentationError extends Error {
  readonly code:
    | "GOVERNANCE_SUPPORT_SURFACE_CONFLICT"
    | "GOVERNANCE_SUPPORT_SURFACE_DUPLICATE";

  constructor(code: GovernanceSupportSurfacePresentationError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "GovernanceSupportSurfacePresentationError";
    this.code = code;
  }
}

export function deriveGovernanceSupportSurfacePresentation(input: {
  candidates: readonly GovernanceSupportSurfaceCandidate[];
}): GovernanceSupportSurfaceCode | null {
  const uniqueSurfaces = new Set<GovernanceSupportSurfaceCode>();
  for (const candidate of input.candidates) {
    if (uniqueSurfaces.has(candidate.surface)) {
      throw new GovernanceSupportSurfacePresentationError(
        "GOVERNANCE_SUPPORT_SURFACE_DUPLICATE",
        `support surface ${candidate.surface} cannot be declared twice`,
      );
    }
    uniqueSurfaces.add(candidate.surface);
  }
  const explicitlyPromoted = input.candidates.filter(
    (candidate) => candidate.promoted === true,
  );
  if (explicitlyPromoted.length > 1) {
    throw new GovernanceSupportSurfacePresentationError(
      "GOVERNANCE_SUPPORT_SURFACE_CONFLICT",
      "governance routes may promote only one support surface",
    );
  }
  if (explicitlyPromoted.length === 1) {
    return explicitlyPromoted[0]!.surface;
  }
  return [...input.candidates]
    .sort(
      (left, right) =>
        right.priority - left.priority || left.surface.localeCompare(right.surface),
    )
    .at(0)?.surface ?? null;
}


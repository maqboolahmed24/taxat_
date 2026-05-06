import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";

export type ProblemAudienceClass = "AUTOMATION" | "PORTAL" | "STAFF";
export type ProblemRecoveryFamily =
  | "COLLABORATION"
  | "GOVERNANCE"
  | "MANIFEST"
  | "NONE"
  | "PORTAL_APPROVAL"
  | "PORTAL_UPLOAD"
  | "PORTAL_WORKSPACE";

const portalSafeSurfaces = new Set<
  NonNullable<ProblemEnvelope["suggested_detail_surface_code"]>
>(["CUSTOMER_ACTIVITY", "FILES"]);

export function selectPortalSafeDetailSurface(input: {
  audience: ProblemAudienceClass;
  preferredSurface: ProblemEnvelope["suggested_detail_surface_code"];
  recoveryFamily?: ProblemRecoveryFamily | null;
}) {
  if (input.audience !== "PORTAL") {
    return input.preferredSurface;
  }
  if (input.preferredSurface === null) {
    return null;
  }
  if (portalSafeSurfaces.has(input.preferredSurface)) {
    return input.preferredSurface;
  }
  return input.recoveryFamily === "PORTAL_UPLOAD" ? "FILES" : "CUSTOMER_ACTIVITY";
}


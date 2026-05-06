export type ProblemRecoveryRefs = {
  latestApprovalPackRef: string | null;
  latestClientPortalWorkspaceRef: string | null;
  latestCommandReceiptRef: string | null;
  latestDecisionBundleRef: string | null;
  latestPolicySnapshotRef: string | null;
  latestResumeToken: string | null;
  latestUploadSessionRef: string | null;
  latestWorkspaceSnapshotRef: string | null;
};

export type RecoveryFamilyRestriction =
  | "COLLABORATION"
  | "GOVERNANCE"
  | "MANIFEST"
  | "NONE"
  | "PORTAL_APPROVAL"
  | "PORTAL_UPLOAD"
  | "PORTAL_WORKSPACE";

export class ProblemRecoveryFamilyError extends Error {
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: readonly string[]) {
    super(message);
    this.name = "ProblemRecoveryFamilyError";
    this.reasonCodes = [...reasonCodes];
  }
}

export const nullProblemRecoveryRefs: ProblemRecoveryRefs = {
  latestApprovalPackRef: null,
  latestClientPortalWorkspaceRef: null,
  latestCommandReceiptRef: null,
  latestDecisionBundleRef: null,
  latestPolicySnapshotRef: null,
  latestResumeToken: null,
  latestUploadSessionRef: null,
  latestWorkspaceSnapshotRef: null,
};

function assertRef(fieldName: string, value: string | null) {
  if (value !== null && value.trim().length === 0) {
    throw new ProblemRecoveryFamilyError(
      `${fieldName} cannot be an empty recovery ref`,
      ["PROBLEM_RECOVERY_REF_EMPTY"],
    );
  }
}

function activeNonManifestFamilies(refs: ProblemRecoveryRefs) {
  return [
    refs.latestWorkspaceSnapshotRef !== null ? "COLLABORATION" : null,
    refs.latestPolicySnapshotRef !== null ? "GOVERNANCE" : null,
    refs.latestClientPortalWorkspaceRef !== null ? "PORTAL_WORKSPACE" : null,
    refs.latestApprovalPackRef !== null ? "PORTAL_APPROVAL" : null,
    refs.latestUploadSessionRef !== null ? "PORTAL_UPLOAD" : null,
  ].filter((family): family is Exclude<RecoveryFamilyRestriction, "MANIFEST" | "NONE"> =>
    family !== null,
  );
}

function portalFamilies(refs: ProblemRecoveryRefs) {
  return [
    refs.latestClientPortalWorkspaceRef !== null ? "PORTAL_WORKSPACE" : null,
    refs.latestApprovalPackRef !== null ? "PORTAL_APPROVAL" : null,
    refs.latestUploadSessionRef !== null ? "PORTAL_UPLOAD" : null,
  ].filter((family): family is "PORTAL_APPROVAL" | "PORTAL_UPLOAD" | "PORTAL_WORKSPACE" =>
    family !== null,
  );
}

function inferredRestriction(refs: ProblemRecoveryRefs): RecoveryFamilyRestriction {
  const nonManifest = activeNonManifestFamilies(refs);
  if (nonManifest.length > 1) {
    throw new ProblemRecoveryFamilyError(
      `ProblemEnvelope cannot publish multiple non-manifest recovery families: ${nonManifest.join(", ")}`,
      ["PROBLEM_RECOVERY_FAMILY_MIXED"],
    );
  }
  const portal = portalFamilies(refs);
  if (portal.length > 1) {
    throw new ProblemRecoveryFamilyError(
      `ProblemEnvelope cannot publish multiple portal recovery refs: ${portal.join(", ")}`,
      ["PROBLEM_PORTAL_RECOVERY_REF_MIXED"],
    );
  }
  if (nonManifest.length === 1) {
    return nonManifest[0];
  }
  if (refs.latestDecisionBundleRef !== null || refs.latestResumeToken !== null) {
    return "MANIFEST";
  }
  return "NONE";
}

export function restrictProblemRecoveryFamily(input: {
  hiddenOrUnauthorized?: boolean;
  refs?: Partial<ProblemRecoveryRefs> | null;
  restrictTo?: RecoveryFamilyRestriction | null;
}): { family: RecoveryFamilyRestriction; refs: ProblemRecoveryRefs } {
  if (input.hiddenOrUnauthorized === true) {
    return { family: "NONE", refs: { ...nullProblemRecoveryRefs } };
  }

  const refs = {
    ...nullProblemRecoveryRefs,
    ...(input.refs ?? {}),
  };
  for (const [fieldName, value] of Object.entries(refs)) {
    assertRef(fieldName, value);
  }

  const restriction = input.restrictTo ?? inferredRestriction(refs);
  const pruned: ProblemRecoveryRefs = {
    ...nullProblemRecoveryRefs,
    latestCommandReceiptRef: refs.latestCommandReceiptRef,
  };

  switch (restriction) {
    case "COLLABORATION":
      pruned.latestWorkspaceSnapshotRef = refs.latestWorkspaceSnapshotRef;
      break;
    case "GOVERNANCE":
      pruned.latestPolicySnapshotRef = refs.latestPolicySnapshotRef;
      break;
    case "MANIFEST":
      pruned.latestDecisionBundleRef = refs.latestDecisionBundleRef;
      pruned.latestResumeToken = refs.latestResumeToken;
      break;
    case "PORTAL_APPROVAL":
      pruned.latestApprovalPackRef = refs.latestApprovalPackRef;
      break;
    case "PORTAL_UPLOAD":
      pruned.latestUploadSessionRef = refs.latestUploadSessionRef;
      break;
    case "PORTAL_WORKSPACE":
      pruned.latestClientPortalWorkspaceRef = refs.latestClientPortalWorkspaceRef;
      break;
    case "NONE":
      break;
  }

  if (pruned.latestResumeToken !== null) {
    pruned.latestWorkspaceSnapshotRef = null;
    pruned.latestClientPortalWorkspaceRef = null;
    pruned.latestApprovalPackRef = null;
    pruned.latestUploadSessionRef = null;
    pruned.latestPolicySnapshotRef = null;
  }

  const hasProjectionRef =
    pruned.latestDecisionBundleRef !== null ||
    pruned.latestWorkspaceSnapshotRef !== null ||
    pruned.latestClientPortalWorkspaceRef !== null ||
    pruned.latestApprovalPackRef !== null ||
    pruned.latestUploadSessionRef !== null ||
    pruned.latestPolicySnapshotRef !== null;
  if (hasProjectionRef && pruned.latestCommandReceiptRef === null) {
    throw new ProblemRecoveryFamilyError(
      "Projection recovery refs require a durable command receipt recovery anchor",
      ["PROBLEM_PROJECTION_REF_WITHOUT_RECEIPT"],
    );
  }

  return { family: restriction, refs: pruned };
}


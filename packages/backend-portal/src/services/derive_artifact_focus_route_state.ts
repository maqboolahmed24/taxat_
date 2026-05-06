import type {
  ClientPortalContextRouteCode,
  ClientPortalRouteCode,
  ClientPortalRouteQueryInput,
} from "../types.ts";

export class ArtifactFocusRouteStateError extends Error {
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: readonly string[]) {
    super(message);
    this.name = "ArtifactFocusRouteStateError";
    this.reasonCodes = [...reasonCodes];
  }
}

export type ArtifactFocusRouteState = {
  artifact_focus_bucket_or_null: "HISTORY" | "LIMITATION_NOTICE" | "PRIMARY" | null;
  artifact_focus_subject_ref_or_null: string | null;
};

export type BrowserHandoffReturnContinuity = ArtifactFocusRouteState & {
  external_handoff_target_ref_or_null: string | null;
  handoff_allowed: boolean;
  handoff_explanation_code: "AUTHORITY_OR_IDENTITY_OWNED" | "PORTAL_OWNED_BLOCKED";
  return_focus_anchor_ref: string;
  return_route: ClientPortalRouteCode;
};

function maybeNonEmpty(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized.length === 0 ? null : normalized;
}

function carriesArtifactFocus(contextRoute: ClientPortalContextRouteCode) {
  return contextRoute === "REQUEST_DETAIL" || contextRoute === "APPROVAL_DETAIL";
}

export function deriveArtifactFocusRouteState(input: {
  contextObjectRefOrNull: string | null;
  contextRoute: ClientPortalContextRouteCode;
  query?: ClientPortalRouteQueryInput | undefined;
  visiblePrimarySubjectRefOrNull?: string | null | undefined;
}): ArtifactFocusRouteState {
  if (!carriesArtifactFocus(input.contextRoute)) {
    return {
      artifact_focus_bucket_or_null: null,
      artifact_focus_subject_ref_or_null: null,
    };
  }

  const explicitSubject = maybeNonEmpty(input.query?.artifact_focus_subject_ref_or_null);
  const fallbackSubject =
    maybeNonEmpty(input.visiblePrimarySubjectRefOrNull) ??
    maybeNonEmpty(input.contextObjectRefOrNull);
  const subjectRef = explicitSubject ?? fallbackSubject;
  const bucket = input.query?.artifact_focus_bucket_or_null ?? (subjectRef === null ? null : "PRIMARY");

  if (bucket !== null && subjectRef === null) {
    throw new ArtifactFocusRouteStateError(
      "artifact focus bucket requires an artifact focus subject",
      ["ARTIFACT_FOCUS_ROUTE_SUBJECT_REQUIRED"],
    );
  }

  return {
    artifact_focus_bucket_or_null: bucket,
    artifact_focus_subject_ref_or_null: bucket === null ? null : subjectRef,
  };
}

export function deriveBrowserHandoffReturnContinuity(input: {
  artifactFocus: ArtifactFocusRouteState;
  externalHandoffTargetRefOrNull: string | null;
  handoffOwner: "AUTHORITY_PROVIDER" | "IDENTITY_PROVIDER" | "PORTAL_OWNED" | "SYSTEM_BROWSER_AUTH_SESSION";
  returnFocusAnchorRef: string;
  returnRoute: ClientPortalRouteCode;
}): BrowserHandoffReturnContinuity {
  const handoffAllowed =
    input.externalHandoffTargetRefOrNull !== null && input.handoffOwner !== "PORTAL_OWNED";
  if (input.externalHandoffTargetRefOrNull !== null && !handoffAllowed) {
    throw new ArtifactFocusRouteStateError(
      "portal-owned artifact actions must stay same-shell and must not create browser handoff targets",
      ["ARTIFACT_FOCUS_ROUTE_PORTAL_HANDOFF_FORBIDDEN"],
    );
  }
  if (
    handoffAllowed &&
    (input.artifactFocus.artifact_focus_bucket_or_null === null ||
      input.artifactFocus.artifact_focus_subject_ref_or_null === null)
  ) {
    throw new ArtifactFocusRouteStateError(
      "lawful browser handoff requires preserved artifact focus context for return",
      ["ARTIFACT_FOCUS_ROUTE_HANDOFF_RETURN_CONTEXT_REQUIRED"],
    );
  }

  return {
    ...input.artifactFocus,
    external_handoff_target_ref_or_null: input.externalHandoffTargetRefOrNull,
    handoff_allowed: handoffAllowed,
    handoff_explanation_code: handoffAllowed
      ? "AUTHORITY_OR_IDENTITY_OWNED"
      : "PORTAL_OWNED_BLOCKED",
    return_focus_anchor_ref: input.returnFocusAnchorRef,
    return_route: input.returnRoute,
  };
}

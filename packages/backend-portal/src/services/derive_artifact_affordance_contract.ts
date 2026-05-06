import type {
  ArtifactAffordanceContractRecord,
  ClientDocumentHistoryDisclosureState,
} from "../types.ts";

export class ArtifactAffordanceContractError extends Error {
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: readonly string[]) {
    super(message);
    this.name = "ArtifactAffordanceContractError";
    this.reasonCodes = [...reasonCodes];
  }
}

export function deriveArtifactPreviewOpenPolicy(
  historyAffordanceState: ArtifactAffordanceContractRecord["history_affordance_state"],
): ArtifactAffordanceContractRecord["preview_open_policy"] {
  return historyAffordanceState === "NONE"
    ? "CURRENT_SUMMARY_FIRST_ONLY"
    : "CURRENT_SUMMARY_FIRST_THEN_HISTORY_ON_DEMAND";
}

export function deriveArtifactHistoryAffordanceState(input: {
  historicalSubjectRefs: readonly string[];
  historyDisclosureState?: ClientDocumentHistoryDisclosureState | undefined;
}): ArtifactAffordanceContractRecord["history_affordance_state"] {
  if (input.historicalSubjectRefs.length === 0) {
    return "NONE";
  }
  if (
    input.historyDisclosureState === "LIMITED" ||
    input.historyDisclosureState === "MASKED_PRESENT"
  ) {
    return "EXPLICIT_SECONDARY_LIMITED";
  }
  return "EXPLICIT_SECONDARY";
}

function assertNoCurrentTarget(
  role: ArtifactAffordanceContractRecord["primary_subject_role"],
  visiblePrimarySubjectRefOrNull: string | null,
  targets: readonly (string | null)[],
) {
  if (role !== "NO_CURRENT_ARTIFACT") {
    return;
  }
  if (visiblePrimarySubjectRefOrNull !== null || targets.some((target) => target !== null)) {
    throw new ArtifactAffordanceContractError(
      "NO_CURRENT_ARTIFACT must clear the visible primary subject and all default targets",
      ["ARTIFACT_AFFORDANCE_NO_CURRENT_TARGET_DRIFT"],
    );
  }
}

export function deriveArtifactAffordanceContract(input: {
  affordanceScope: ArtifactAffordanceContractRecord["affordance_scope"];
  defaultDownloadTargetRefOrNull: string | null;
  defaultPreviewTargetRefOrNull: string | null;
  defaultPrintTargetRefOrNull: string | null;
  headerPosture: ArtifactAffordanceContractRecord["header_posture"];
  historyAffordanceState: ArtifactAffordanceContractRecord["history_affordance_state"];
  primarySubjectRefOrNull: string | null;
  primarySubjectRole: ArtifactAffordanceContractRecord["primary_subject_role"];
}): ArtifactAffordanceContractRecord {
  assertNoCurrentTarget(input.primarySubjectRole, input.primarySubjectRefOrNull, [
    input.defaultPreviewTargetRefOrNull,
    input.defaultDownloadTargetRefOrNull,
    input.defaultPrintTargetRefOrNull,
  ]);

  return {
    affordance_scope: input.affordanceScope,
    contract_version: "ARTIFACT_AFFORDANCE_V1",
    default_download_target_ref_or_null: input.defaultDownloadTargetRefOrNull,
    default_preview_target_ref_or_null: input.defaultPreviewTargetRefOrNull,
    default_print_target_ref_or_null: input.defaultPrintTargetRefOrNull,
    header_posture: input.headerPosture,
    history_affordance_state: input.historyAffordanceState,
    invocation_validation_policy:
      "VISIBLE_PRIMARY_AND_DEFAULT_TARGETS_MUST_MATCH_GOVERNED_POSTURE",
    label_visibility_policy: "EXPLICIT_POSTURE_LABELS_REQUIRED",
    preview_open_policy: deriveArtifactPreviewOpenPolicy(input.historyAffordanceState),
    primary_slot_policy: "CURRENT_PRIMARY_HISTORY_EXPLICIT",
    primary_subject_role: input.primarySubjectRole,
    visible_primary_subject_ref_or_null: input.primarySubjectRefOrNull,
  };
}

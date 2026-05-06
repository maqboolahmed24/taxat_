import type {
  ArtifactSelectionContractRecord,
  ClientDocumentHistoryDisclosureState,
} from "../types.ts";

export function deriveRequestArtifactSelectionContract(input: {
  authoritativeSubjectRefOrNull: string | null;
  defaultDownloadTargetRefOrNull?: string | null | undefined;
  defaultPreviewTargetRefOrNull?: string | null | undefined;
  defaultPrintTargetRefOrNull?: string | null | undefined;
  historicalSubjectRefs: readonly string[];
  historyDisclosureState?: ClientDocumentHistoryDisclosureState | undefined;
  limitedHistoryCountOrNull?: number | null | undefined;
  primarySubjectRefOrNull: string | null;
  publishDownloadTarget?: boolean | undefined;
}): ArtifactSelectionContractRecord {
  const historyState =
    input.historyDisclosureState === "LIMITED"
      ? "LIMITED"
      : input.historyDisclosureState === "MASKED_PRESENT"
        ? "MASKED_PRESENT"
        : "NONE";
  const authoritativeSubjectRefs =
    input.authoritativeSubjectRefOrNull === null ? [] : [input.authoritativeSubjectRefOrNull];
  const primarySubjectRefs =
    input.primarySubjectRefOrNull === null ? [] : [input.primarySubjectRefOrNull];
  const historicalSubjectRefs = [...new Set(input.historicalSubjectRefs)];
  const limitedHistoryCountOrNull =
    historyState === "NONE"
      ? null
      : (input.limitedHistoryCountOrNull ?? (historicalSubjectRefs.length || 1));
  const defaultTarget = input.authoritativeSubjectRefOrNull;
  const defaultPreviewTarget =
    input.defaultPreviewTargetRefOrNull === undefined
      ? defaultTarget
      : input.defaultPreviewTargetRefOrNull;
  const defaultDownloadTarget =
    input.defaultDownloadTargetRefOrNull === undefined
      ? input.publishDownloadTarget === true
        ? defaultTarget
        : null
      : input.defaultDownloadTargetRefOrNull;

  return {
    authoritative_subject_refs: authoritativeSubjectRefs,
    default_download_target_ref_or_null: defaultDownloadTarget,
    default_preview_target_ref_or_null: defaultPreviewTarget,
    default_print_target_ref_or_null: input.defaultPrintTargetRefOrNull ?? null,
    historical_subject_refs: historicalSubjectRefs,
    limited_history_count_or_null: limitedHistoryCountOrNull,
    limited_history_state: historyState,
    presentation_mode: "CURRENT_PRIMARY_HISTORY_SECONDARY",
    primary_subject_refs: primarySubjectRefs,
    selection_scope: "CLIENT_DOCUMENT_REQUEST",
  };
}

import type {
  ArtifactAffordanceContractRecord,
  ClientDocumentHistoryDisclosureState,
} from "../types.ts";
import {
  deriveArtifactAffordanceContract,
  deriveArtifactHistoryAffordanceState,
} from "./derive_artifact_affordance_contract.ts";

export function deriveMinimalRequestArtifactAffordanceAdapter(input: {
  defaultDownloadTargetRefOrNull?: string | null | undefined;
  defaultPreviewTargetRefOrNull: string | null;
  headerPosture:
    | "AWAITING_CURRENT_REPLACEMENT"
    | "CURRENT"
    | "CURRENT_WITH_HISTORY"
    | "EXPIRED"
    | "REJECTED"
    | "SUPERSEDED";
  historicalSubjectRefs: readonly string[];
  historyDisclosureState?: ClientDocumentHistoryDisclosureState | undefined;
  primarySubjectRefOrNull: string | null;
  primarySubjectRole:
    | "CURRENT_ARTIFACT"
    | "CURRENT_REQUEST_UPLOAD"
    | "NO_CURRENT_ARTIFACT";
}): ArtifactAffordanceContractRecord {
  return deriveArtifactAffordanceContract({
    affordanceScope: "CLIENT_DOCUMENT_REQUEST",
    defaultDownloadTargetRefOrNull: input.defaultDownloadTargetRefOrNull ?? null,
    defaultPreviewTargetRefOrNull: input.defaultPreviewTargetRefOrNull,
    defaultPrintTargetRefOrNull: null,
    headerPosture: input.headerPosture,
    historyAffordanceState: deriveArtifactHistoryAffordanceState({
      historicalSubjectRefs: input.historicalSubjectRefs,
      historyDisclosureState: input.historyDisclosureState,
    }),
    primarySubjectRefOrNull: input.primarySubjectRefOrNull,
    primarySubjectRole: input.primarySubjectRole,
  });
}

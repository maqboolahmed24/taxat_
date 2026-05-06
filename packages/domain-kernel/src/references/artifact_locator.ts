import { stableJsonHash } from "../primitives/index.ts";
import {
  assertCustomerDeliveryHandle,
  computeDeliveryBindingHash,
  type DeliveryBindingContext,
  type DeliveryBindingHash,
} from "./delivery_binding.ts";
import { assertReferenceFamily, assertReferenceKeyLiteral } from "./reference_key.ts";

export type ArtifactExposurePosture = "CUSTOMER_SAFE" | "INTERNAL_ONLY";
export type ArtifactLineageRole = "CURRENT" | "HISTORICAL";

export type ArtifactTimelineEntry = {
  artifactRef: string;
  derivativeSourceArtifactRefOrNull?: string | null;
  downloadRefOrNull: string | null;
  exposurePosture: ArtifactExposurePosture;
  lineageRole: ArtifactLineageRole;
  previewTargetRefOrNull: string | null;
  printTargetRefOrNull: string | null;
  storageRefOrNull: string | null;
};

export type ArtifactPresentationTargets = {
  currentArtifactRefOrNull: string | null;
  defaultDownloadRefOrNull: string | null;
  defaultPreviewTargetRefOrNull: string | null;
  defaultPrintTargetRefOrNull: string | null;
  selectedHistoricalTargetsOrNull: {
    artifactRef: string;
    downloadRefOrNull: string | null;
    previewTargetRefOrNull: string | null;
    printTargetRefOrNull: string | null;
  } | null;
  selectionHash: string;
  warnings: string[];
};

export type CustomerDeliveryAffordance = {
  artifactRef: string;
  deliveryBindingHash: DeliveryBindingHash;
  downloadRef: string;
  sourceStorageRefExposed: false;
  targetRef: string;
};

export type CustomerSafeDerivativeLocator = {
  customerDelivery: CustomerDeliveryAffordance;
  derivativeArtifactRef: string;
  sourceArtifactRef: string;
  sourceStorageRefExposed: false;
};

export type UploadSessionStorageContinuity = {
  continuityHash: string;
  nextRequestVersionRef: string;
  previousRequestVersionRef: string;
  stableStorageRef: string;
  uploadSessionId: string;
};

type ArtifactLocatorErrorCode =
  | "ARTIFACT_HISTORY_SELECTION_MISSING"
  | "ARTIFACT_STORAGE_REF_EXPOSED"
  | "UPLOAD_SESSION_STORAGE_DRIFT";

type ArtifactLocatorErrorInit = {
  code: ArtifactLocatorErrorCode;
  detail: string;
};

export class ArtifactLocatorError extends Error {
  readonly code: ArtifactLocatorErrorCode;

  constructor(init: ArtifactLocatorErrorInit) {
    super(`${init.code}: ${init.detail}`);
    this.name = "ArtifactLocatorError";
    this.code = init.code;
  }
}

function assertArtifactTimelineEntry(entry: ArtifactTimelineEntry) {
  assertReferenceFamily("artifact_ref", "REFERENCE", entry.artifactRef);

  if (entry.storageRefOrNull !== null) {
    assertReferenceFamily("storage_ref", "STORAGE_REF", entry.storageRefOrNull);
  }
  if (entry.previewTargetRefOrNull !== null) {
    assertReferenceFamily("preview_target_ref", "TARGET_REF", entry.previewTargetRefOrNull);
  }
  if (entry.downloadRefOrNull !== null) {
    assertReferenceFamily("download_ref", "DELIVERY_BINDING", entry.downloadRefOrNull);
  }
  if (entry.printTargetRefOrNull !== null) {
    assertReferenceFamily("print_target_ref", "TARGET_REF", entry.printTargetRefOrNull);
  }
  if (
    entry.derivativeSourceArtifactRefOrNull !== undefined &&
    entry.derivativeSourceArtifactRefOrNull !== null
  ) {
    assertReferenceFamily("artifact_ref", "REFERENCE", entry.derivativeSourceArtifactRefOrNull);
  }
}

export function computeArtifactPresentationTargets(input: {
  currentArtifactOrNull: ArtifactTimelineEntry | null;
  historicalArtifacts: ArtifactTimelineEntry[];
  selectedHistoricalArtifactRefOrNull?: string | null;
}): ArtifactPresentationTargets {
  const warnings: string[] = [];

  if (input.currentArtifactOrNull !== null) {
    assertArtifactTimelineEntry(input.currentArtifactOrNull);
  }

  input.historicalArtifacts.forEach(assertArtifactTimelineEntry);

  if (
    input.currentArtifactOrNull?.storageRefOrNull !== null &&
    input.currentArtifactOrNull?.storageRefOrNull !== undefined &&
    (!input.currentArtifactOrNull?.previewTargetRefOrNull ||
      !input.currentArtifactOrNull?.downloadRefOrNull)
  ) {
    warnings.push("STORAGE_REF_NEVER_IMPLIES_CUSTOMER_TARGET");
  }

  let selectedHistoricalTargetsOrNull: ArtifactPresentationTargets["selectedHistoricalTargetsOrNull"] =
    null;
  if (input.selectedHistoricalArtifactRefOrNull) {
    const selected = input.historicalArtifacts.find(
      (entry) => entry.artifactRef === input.selectedHistoricalArtifactRefOrNull,
    );
    if (!selected) {
      throw new ArtifactLocatorError({
        code: "ARTIFACT_HISTORY_SELECTION_MISSING",
        detail: `No historical artifact matched ${input.selectedHistoricalArtifactRefOrNull}`,
      });
    }

    selectedHistoricalTargetsOrNull = {
      artifactRef: selected.artifactRef,
      downloadRefOrNull: selected.downloadRefOrNull,
      previewTargetRefOrNull: selected.previewTargetRefOrNull,
      printTargetRefOrNull: selected.printTargetRefOrNull,
    };
  }

  return {
    currentArtifactRefOrNull: input.currentArtifactOrNull?.artifactRef ?? null,
    defaultDownloadRefOrNull: input.currentArtifactOrNull?.downloadRefOrNull ?? null,
    defaultPreviewTargetRefOrNull: input.currentArtifactOrNull?.previewTargetRefOrNull ?? null,
    defaultPrintTargetRefOrNull: input.currentArtifactOrNull?.printTargetRefOrNull ?? null,
    selectedHistoricalTargetsOrNull,
    selectionHash: stableJsonHash({
      current_artifact_ref_or_null: input.currentArtifactOrNull?.artifactRef ?? null,
      historical_artifact_refs: input.historicalArtifacts.map((entry) => entry.artifactRef),
      selected_historical_artifact_ref_or_null: input.selectedHistoricalArtifactRefOrNull ?? null,
    }),
    warnings,
  };
}

export function materializeCustomerDeliveryAffordance(input: {
  artifactRef: string;
  deliveryBindingHash: string;
  downloadRef: string;
  sourceStorageRefOrNull?: string | null;
  targetRef: string;
}): CustomerDeliveryAffordance {
  assertReferenceFamily("artifact_ref", "REFERENCE", input.artifactRef);
  assertReferenceFamily("target_ref", "TARGET_REF", input.targetRef);
  const delivery = assertCustomerDeliveryHandle(input.downloadRef, input.deliveryBindingHash);

  if (input.sourceStorageRefOrNull !== undefined && input.sourceStorageRefOrNull !== null) {
    assertReferenceFamily("storage_ref", "STORAGE_REF", input.sourceStorageRefOrNull);

    if (
      input.sourceStorageRefOrNull === input.downloadRef ||
      input.sourceStorageRefOrNull === input.targetRef
    ) {
      throw new ArtifactLocatorError({
        code: "ARTIFACT_STORAGE_REF_EXPOSED",
        detail:
          "customer delivery affordances may not reuse raw storage refs as target or download truth",
      });
    }
  }

  return {
    artifactRef: input.artifactRef,
    deliveryBindingHash: delivery.deliveryBindingHash,
    downloadRef: delivery.downloadRef,
    sourceStorageRefExposed: false,
    targetRef: input.targetRef,
  };
}

export function materializeCustomerSafeDerivativeLocator(input: {
  deliveryContext: DeliveryBindingContext;
  derivativeArtifactRef: string;
  derivativeDownloadRef: string;
  derivativePreviewTargetRef: string;
  sourceArtifactRef: string;
  sourceStorageRefOrNull?: string | null;
}): CustomerSafeDerivativeLocator {
  assertReferenceFamily("artifact_ref", "REFERENCE", input.sourceArtifactRef);
  assertReferenceFamily("artifact_ref", "REFERENCE", input.derivativeArtifactRef);
  assertReferenceKeyLiteral("preview_target_ref", input.derivativePreviewTargetRef);

  return {
    customerDelivery: materializeCustomerDeliveryAffordance({
      artifactRef: input.derivativeArtifactRef,
      deliveryBindingHash: computeDeliveryBindingHash(input.deliveryContext),
      downloadRef: input.derivativeDownloadRef,
      sourceStorageRefOrNull: input.sourceStorageRefOrNull ?? null,
      targetRef: input.derivativePreviewTargetRef,
    }),
    derivativeArtifactRef: input.derivativeArtifactRef,
    sourceArtifactRef: input.sourceArtifactRef,
    sourceStorageRefExposed: false,
  };
}

export function assertUploadSessionStorageContinuity(input: {
  nextRequestVersionRef: string;
  nextStorageRef: string;
  previousRequestVersionRef: string;
  previousStorageRef: string;
  uploadSessionId: string;
}): UploadSessionStorageContinuity {
  assertReferenceFamily("upload_session_id", "IDENTITY", input.uploadSessionId);
  assertReferenceFamily("request_version_ref", "REFERENCE", input.previousRequestVersionRef);
  assertReferenceFamily("request_version_ref", "REFERENCE", input.nextRequestVersionRef);
  assertReferenceFamily("storage_ref", "STORAGE_REF", input.previousStorageRef);
  assertReferenceFamily("storage_ref", "STORAGE_REF", input.nextStorageRef);

  if (input.previousStorageRef !== input.nextStorageRef) {
    throw new ArtifactLocatorError({
      code: "UPLOAD_SESSION_STORAGE_DRIFT",
      detail:
        "resume and request rebase must preserve the same storage_ref across the upload session",
    });
  }

  return {
    continuityHash: stableJsonHash({
      next_request_version_ref: input.nextRequestVersionRef,
      previous_request_version_ref: input.previousRequestVersionRef,
      stable_storage_ref: input.previousStorageRef,
      upload_session_id: input.uploadSessionId,
    }),
    nextRequestVersionRef: input.nextRequestVersionRef,
    previousRequestVersionRef: input.previousRequestVersionRef,
    stableStorageRef: input.previousStorageRef,
    uploadSessionId: input.uploadSessionId,
  };
}

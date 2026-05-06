import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  ArtifactAffordanceContractError,
  ArtifactFocusRouteStateError,
  ArtifactTargetAlignmentError,
  deriveArtifactAffordanceContract,
  deriveArtifactFocusRouteState,
  deriveBrowserHandoffReturnContinuity,
  derivePortalExternalizationGovernanceContract,
  validateArtifactTargetAlignment,
  type ArtifactSelectionContractRecord,
} from "../index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

async function pythonDeliveryBindingHash(payload: unknown) {
  const script = `
import json
import pathlib
import sys

repo = pathlib.Path(sys.argv[1])
sys.path.insert(0, str(repo / "packages" / "contracts-core" / "python"))
from validate_contracts import derive_externalization_delivery_binding_hash  # type: ignore

payload = json.loads(sys.argv[2])
print(derive_externalization_delivery_binding_hash(payload))
`;
  const { stdout } = await execFileAsync(path.join(repoRoot, ".venv", "bin", "python3"), [
    "-c",
    script,
    repoRoot,
    JSON.stringify(payload),
  ]);
  return stdout.trim();
}

test("derives schema-valid affordance posture and preview policy from history state", async () => {
  const currentWithHistory = deriveArtifactAffordanceContract({
    affordanceScope: "CLIENT_DOCUMENT_REQUEST",
    defaultDownloadTargetRefOrNull: "artifact.upload.current.download",
    defaultPreviewTargetRefOrNull: "upload.current",
    defaultPrintTargetRefOrNull: null,
    headerPosture: "CURRENT_WITH_HISTORY",
    historyAffordanceState: "EXPLICIT_SECONDARY",
    primarySubjectRefOrNull: "upload.current",
    primarySubjectRole: "CURRENT_ARTIFACT",
  });

  expect(currentWithHistory.preview_open_policy).toBe(
    "CURRENT_SUMMARY_FIRST_THEN_HISTORY_ON_DEMAND",
  );
  await validateContractSchema("artifact_affordance_contract", currentWithHistory);

  const noCurrent = deriveArtifactAffordanceContract({
    affordanceScope: "CLIENT_DOCUMENT_REQUEST",
    defaultDownloadTargetRefOrNull: null,
    defaultPreviewTargetRefOrNull: null,
    defaultPrintTargetRefOrNull: null,
    headerPosture: "AWAITING_CURRENT_REPLACEMENT",
    historyAffordanceState: "NONE",
    primarySubjectRefOrNull: null,
    primarySubjectRole: "NO_CURRENT_ARTIFACT",
  });
  expect(noCurrent.visible_primary_subject_ref_or_null).toBeNull();
  expect(noCurrent.preview_open_policy).toBe("CURRENT_SUMMARY_FIRST_ONLY");
  await validateContractSchema("artifact_affordance_contract", noCurrent);

  expect(() =>
    deriveArtifactAffordanceContract({
      affordanceScope: "CLIENT_DOCUMENT_REQUEST",
      defaultDownloadTargetRefOrNull: null,
      defaultPreviewTargetRefOrNull: "upload.history",
      defaultPrintTargetRefOrNull: null,
      headerPosture: "AWAITING_CURRENT_REPLACEMENT",
      historyAffordanceState: "NONE",
      primarySubjectRefOrNull: "upload.history",
      primarySubjectRole: "NO_CURRENT_ARTIFACT",
    }),
  ).toThrow(ArtifactAffordanceContractError);
});

test("derives externalization contracts with validator-matched delivery binding hashes", async () => {
  const externalization = derivePortalExternalizationGovernanceContract({
    accessBindingHash: "access.portal.hash-test",
    boundaryScope: "CLIENT_DOCUMENT_REQUEST",
    contextAnchorRef: "request.hash-test",
    downloadTargetRefOrNull: "artifact.upload.current.download",
    eligibilityState: "READY",
    historyMeaningState: "CURRENT_WITH_HISTORY_EXPLICIT",
    limitationState: "HISTORY_LIMITED",
    maskingPostureFingerprint: "mask.portal.hash-test",
    previewTargetRefOrNull: "upload.current",
    printTargetRefOrNull: null,
    sliceBindingRef: "request.hash-test.v2",
    tenantId: "tenant.portal.hash-test",
    visibilityCachePartitionKey: "visibility.portal.hash-test",
  });

  expect(externalization.delivery_binding_hash).toBe(
    await pythonDeliveryBindingHash(externalization),
  );
  await validateContractSchema("externalization_governance_contract", externalization);
});

test("rejects historical default-target drift across selection, affordance, and externalization", () => {
  const selection: ArtifactSelectionContractRecord = {
    authoritative_subject_refs: ["upload.current"],
    default_download_target_ref_or_null: "upload.history",
    default_preview_target_ref_or_null: "upload.history",
    default_print_target_ref_or_null: null,
    historical_subject_refs: ["upload.history"],
    limited_history_count_or_null: null,
    limited_history_state: "NONE",
    presentation_mode: "CURRENT_PRIMARY_HISTORY_SECONDARY",
    primary_subject_refs: ["upload.current"],
    selection_scope: "CLIENT_DOCUMENT_REQUEST",
  };
  const affordance = deriveArtifactAffordanceContract({
    affordanceScope: "CLIENT_DOCUMENT_REQUEST",
    defaultDownloadTargetRefOrNull: "upload.history",
    defaultPreviewTargetRefOrNull: "upload.history",
    defaultPrintTargetRefOrNull: null,
    headerPosture: "CURRENT_WITH_HISTORY",
    historyAffordanceState: "EXPLICIT_SECONDARY",
    primarySubjectRefOrNull: "upload.current",
    primarySubjectRole: "CURRENT_ARTIFACT",
  });
  const externalization = derivePortalExternalizationGovernanceContract({
    accessBindingHash: "access.portal.drift-test",
    boundaryScope: "CLIENT_DOCUMENT_REQUEST",
    contextAnchorRef: "request.drift-test",
    downloadTargetRefOrNull: "upload.history",
    eligibilityState: "READY",
    historyMeaningState: "CURRENT_WITH_HISTORY_EXPLICIT",
    limitationState: "HISTORY_LIMITED",
    maskingPostureFingerprint: "mask.portal.drift-test",
    previewTargetRefOrNull: "upload.history",
    printTargetRefOrNull: null,
    sliceBindingRef: "request.drift-test.v1",
    tenantId: "tenant.portal.drift-test",
    visibilityCachePartitionKey: "visibility.portal.drift-test",
  });

  expect(() =>
    validateArtifactTargetAlignment({
      artifactAffordance: affordance,
      artifactSelection: selection,
      externalizationGovernanceContract: externalization,
    }),
  ).toThrow(ArtifactTargetAlignmentError);
});

test("preserves artifact focus across browser handoff return and blocks portal-owned handoff targets", () => {
  const focus = deriveArtifactFocusRouteState({
    contextObjectRefOrNull: "request.identity",
    contextRoute: "REQUEST_DETAIL",
    query: {
      artifact_focus_bucket_or_null: "HISTORY",
      artifact_focus_subject_ref_or_null: "upload.identity.rejected",
    },
  });

  expect(focus).toEqual({
    artifact_focus_bucket_or_null: "HISTORY",
    artifact_focus_subject_ref_or_null: "upload.identity.rejected",
  });
  expect(
    deriveBrowserHandoffReturnContinuity({
      artifactFocus: focus,
      externalHandoffTargetRefOrNull: "identity-provider.checkpoint",
      handoffOwner: "IDENTITY_PROVIDER",
      returnFocusAnchorRef: "portal.documents.request.identity.focus",
      returnRoute: "DOCUMENTS",
    }),
  ).toMatchObject({
    handoff_allowed: true,
    return_route: "DOCUMENTS",
    artifact_focus_subject_ref_or_null: "upload.identity.rejected",
  });
  expect(
    deriveBrowserHandoffReturnContinuity({
      artifactFocus: focus,
      externalHandoffTargetRefOrNull: null,
      handoffOwner: "PORTAL_OWNED",
      returnFocusAnchorRef: "portal.documents.request.identity.focus",
      returnRoute: "DOCUMENTS",
    }).handoff_allowed,
  ).toBe(false);
  expect(() =>
    deriveBrowserHandoffReturnContinuity({
      artifactFocus: focus,
      externalHandoffTargetRefOrNull: "detached.portal.download",
      handoffOwner: "PORTAL_OWNED",
      returnFocusAnchorRef: "portal.documents.request.identity.focus",
      returnRoute: "DOCUMENTS",
    }),
  ).toThrow(ArtifactFocusRouteStateError);
});

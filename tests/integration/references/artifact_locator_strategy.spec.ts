import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  ArtifactLocatorError,
  assertUploadSessionStorageContinuity,
  computeArtifactPresentationTargets,
  computeDeliveryBindingHash,
  materializeCustomerSafeDerivativeLocator,
} from "../../../packages/domain-kernel/src/references/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const builderTool = path.join(
  repoRoot,
  "packages/domain-kernel/src/references/build_reference_grammar_atlas.ts",
);
const atlasPayloadPath = path.join(
  repoRoot,
  "apps/operator-web/public/internal/reference-grammar-atlas/data/reference-grammar-atlas.json",
);

test.describe.configure({ mode: "serial" });

test("reference grammar atlas generator re-emits without drift and records the canonical substitution rule", async () => {
  const before = await readFile(atlasPayloadPath, "utf8");

  await execFileAsync("node", ["--experimental-strip-types", builderTool, "--emit"], {
    cwd: repoRoot,
    maxBuffer: 16 * 1024 * 1024,
  });

  const after = await readFile(atlasPayloadPath, "utf8");
  expect(after).toBe(before);

  const payload = JSON.parse(after);
  expect(payload.selectedFamilyRef).toBe("DELIVERY_BINDING");
  expect(payload.families.map((family: { family_ref: string }) => family.family_ref)).toEqual([
    "IDENTITY",
    "REFERENCE",
    "HASH",
    "TARGET_REF",
    "STORAGE_REF",
    "DELIVERY_BINDING",
    "ROUTE_TOKEN",
  ]);
  expect(
    payload.transitionRules.some(
      (rule: { accessible_label: string }) =>
        rule.accessible_label === "storage ref cannot be used as customer download ref",
    ),
  ).toBe(true);
});

test("artifact locator strategy keeps current and history targets separate and preserves derivative delivery law", () => {
  const selection = computeArtifactPresentationTargets({
    currentArtifactOrNull: {
      artifactRef: "artifact.manifest-2026-q2.current",
      downloadRefOrNull: "download.current.manifest-2026-q2",
      exposurePosture: "CUSTOMER_SAFE",
      lineageRole: "CURRENT",
      previewTargetRefOrNull: "target.preview.manifest-2026-q2.current",
      printTargetRefOrNull: "target.print.manifest-2026-q2.current",
      storageRefOrNull: "storage.retained-evidence.manifest-2026-q2.current",
    },
    historicalArtifacts: [
      {
        artifactRef: "artifact.manifest-2025-q4.v7",
        downloadRefOrNull: "download.history.manifest-2025-q4.v7",
        exposurePosture: "CUSTOMER_SAFE",
        lineageRole: "HISTORICAL",
        previewTargetRefOrNull: "target.preview.manifest-2025-q4.v7",
        printTargetRefOrNull: "target.print.manifest-2025-q4.v7",
        storageRefOrNull: "storage.retained-evidence.manifest-2025-q4.v7",
      },
    ],
    selectedHistoricalArtifactRefOrNull: "artifact.manifest-2025-q4.v7",
  });

  expect(selection.defaultPreviewTargetRefOrNull).toBe("target.preview.manifest-2026-q2.current");
  expect(selection.defaultDownloadRefOrNull).toBe("download.current.manifest-2026-q2");
  expect(selection.selectedHistoricalTargetsOrNull).toEqual({
    artifactRef: "artifact.manifest-2025-q4.v7",
    downloadRefOrNull: "download.history.manifest-2025-q4.v7",
    previewTargetRefOrNull: "target.preview.manifest-2025-q4.v7",
    printTargetRefOrNull: "target.print.manifest-2025-q4.v7",
  });

  const deliveryContext = {
    accessBindingHashOrNull: "5ef1450d289ee6f042ef37003dd46f96f26f95ece6f088be6c3081df41ff57d6",
    affordance: "DOWNLOAD" as const,
    canonicalObjectRef: "artifact.customer-safe.manifest-2026-q2.current",
    customerSafeProjectionRefOrNull: "projection.customer-safe.manifest-2026-q2.current",
    maskingPostureHashOrNull: "69c974270fa4f8727b5bcf8f4fbb5dfa136b29f8e7b0a8e5afefaaed8e1c5367",
    previewSubjectRefOrNull: "artifact.customer-safe.manifest-2026-q2.current.page-1",
    principalScopeRef: "scope.portal.customer",
    routeIdentityRef: "/portal/requests/{item_id}",
    sessionBindingHash: "f80a7163b8f9dcb7a7f7dc91fe4421bdf538713ff4fc29fd7aaac912ad6d4630",
    targetRef: "target.preview.customer-safe.manifest-2026-q2.current",
    tenantId: "tenant.taxat-sandbox",
    visibilityPartitionRefOrNull: "visibility.customer-safe.portal",
  };

  const derivative = materializeCustomerSafeDerivativeLocator({
    deliveryContext,
    derivativeArtifactRef: "artifact.customer-safe.manifest-2026-q2.current",
    derivativeDownloadRef: "download.customer-safe.manifest-2026-q2",
    derivativePreviewTargetRef: "target.preview.customer-safe.manifest-2026-q2.current",
    sourceArtifactRef: "artifact.operator-only.manifest-2026-q2.current",
    sourceStorageRefOrNull: "storage.retained-evidence.manifest-2026-q2.operator-only",
  });

  expect(derivative.sourceStorageRefExposed).toBe(false);
  expect(derivative.customerDelivery.deliveryBindingHash).toBe(
    computeDeliveryBindingHash(deliveryContext),
  );
  expect(derivative.customerDelivery.downloadRef).toBe("download.customer-safe.manifest-2026-q2");

  const continuity = assertUploadSessionStorageContinuity({
    nextRequestVersionRef: "request-version.req-2026-q2.r4",
    nextStorageRef: "storage.upload-staging.upload-session-2026-04-23",
    previousRequestVersionRef: "request-version.req-2026-q2.r3",
    previousStorageRef: "storage.upload-staging.upload-session-2026-04-23",
    uploadSessionId: "upload-session-2026-04-23-0001",
  });
  expect(continuity.stableStorageRef).toBe("storage.upload-staging.upload-session-2026-04-23");

  expect(() =>
    assertUploadSessionStorageContinuity({
      nextRequestVersionRef: "request-version.req-2026-q2.r5",
      nextStorageRef: "storage.upload-staging.upload-session-2026-04-24",
      previousRequestVersionRef: "request-version.req-2026-q2.r4",
      previousStorageRef: "storage.upload-staging.upload-session-2026-04-23",
      uploadSessionId: "upload-session-2026-04-23-0001",
    }),
  ).toThrowError(ArtifactLocatorError);
});

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { loadUploadChecksumCatalogBundle } from "./chunk_checksum.ts";
import { loadUploadCompletionBoundaryPolicy } from "./upload_completion_boundary.ts";
import { loadUploadExpiryAndGcPolicy } from "./upload_transfer_service.ts";
import { loadUploadResumePolicy } from "./upload_transfer_resume.ts";

type AtlasStageRef =
  | "ALLOCATED"
  | "UPLOADING"
  | "CHECKSUM"
  | "SCANNING"
  | "VALIDATION"
  | "ATTACHMENT";

type AtlasRung = {
  accessibleLabel: string;
  checksumDigest: string;
  checksumState: "FAILED" | "PENDING" | "VERIFIED";
  chunkIndex: number;
  requestBindingState: "ORIGINAL_CURRENT" | "RECONFIRMATION_REQUIRED" | "RECONFIRMED_CURRENT";
  resumeOffsetAfterChunk: number;
  rungId: string;
  stageRef: AtlasStageRef;
  storageLineageNote: string;
  summary: string;
  windowLabel: string;
};

type AtlasSession = {
  attachmentState: string;
  byteCount: number;
  bytesTransferred: number;
  checksumPolicyChip: string;
  displayName: string;
  frozenRequestVersionRef: string;
  liveRequestVersionRef: string;
  nextActionCode: string;
  requestBindingBadge: string;
  requestBindingState: "ORIGINAL_CURRENT" | "RECONFIRMATION_REQUIRED" | "RECONFIRMED_CURRENT";
  resumabilityChip: string;
  selectedRungId: string;
  sessionId: string;
  stageRef: AtlasStageRef;
  stageSummary: string;
  storageRef: string;
  transferState: string;
  validationState: string;
  rungs: AtlasRung[];
  seams: Array<{
    seamId: string;
    stageRef: AtlasStageRef;
    title: string;
    note: string;
  }>;
};

type UploadTransferAtlasPayload = {
  basisStatement: string;
  generationBasis: {
    emittedAtBasis: string;
    inputHashes: Record<string, string>;
  };
  palette: Record<string, string>;
  routeId: "upload-transfer-atlas";
  selectedSessionId: string;
  stages: Array<{
    label: string;
    stageRef: AtlasStageRef;
    summary: string;
  }>;
  subtitle: string;
  title: string;
  sessions: AtlasSession[];
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const atlasDataPath = path.join(
  repoRoot,
  "apps",
  "operator-web",
  "public",
  "internal",
  "upload-transfer-atlas",
  "data",
  "upload-transfer-atlas.json",
);

const inputPaths = {
  checksumCatalog: path.join(repoRoot, "config", "uploads", "checksum_algorithm_catalog.json"),
  completionPolicy: path.join(
    repoRoot,
    "config",
    "uploads",
    "upload_completion_boundary_policy.json",
  ),
  expiryPolicy: path.join(repoRoot, "config", "uploads", "upload_expiry_and_gc_policy.json"),
  resumePolicy: path.join(repoRoot, "config", "uploads", "upload_resume_policy.json"),
};

async function readUtf8(filePath: string) {
  return readFile(filePath, "utf8");
}

async function inputHashes() {
  const { stableJsonHash } = await import("../primitives/hash.ts");
  const entries = await Promise.all(
    Object.entries(inputPaths).map(async ([key, filePath]) => [key, stableJsonHash(await readUtf8(filePath))] as const),
  );
  return Object.fromEntries(entries);
}

async function emitAtlasPayload(payload: unknown) {
  await mkdir(path.dirname(atlasDataPath), { recursive: true });
  await writeFile(atlasDataPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function checkAtlasPayload(payload: unknown) {
  const expected = `${JSON.stringify(payload, null, 2)}\n`;
  const existing = await readFile(atlasDataPath, "utf8");
  if (existing !== expected) {
    throw new Error(`Out-of-sync generated file: ${path.relative(repoRoot, atlasDataPath)}`);
  }
}

function stageSummary(stageRef: AtlasStageRef) {
  switch (stageRef) {
    case "ALLOCATED":
      return "Frozen request identity, resumable session, and one governed storage lineage.";
    case "UPLOADING":
      return "Chunk windows advance only at the contiguous resume offset or as duplicate-safe replays.";
    case "CHECKSUM":
      return "Chunk digests verify independently before the transfer closes over the manifest checksum.";
    case "SCANNING":
      return "Transfer success can settle while malware or checksum delay still blocks attachment meaning.";
    case "VALIDATION":
      return "Validation decides whether bytes are acceptable evidence, replacement-only, or rejected.";
    case "ATTACHMENT":
      return "Attachment and current-request satisfaction remain explicit and never piggyback on transfer success.";
  }
}

function baseRungs(): AtlasRung[] {
  return [
    {
      accessibleLabel:
        "upload chunk range 0 to 262143 verified checksum and remains bound to original current request",
      checksumDigest: "6b35ad31e7f5",
      checksumState: "VERIFIED",
      chunkIndex: 0,
      requestBindingState: "ORIGINAL_CURRENT",
      resumeOffsetAfterChunk: 262144,
      rungId: "chunk-0",
      stageRef: "UPLOADING",
      storageLineageNote: "storage_ref remains stable across reconnect and reload",
      summary: "Initial window survives mobile reconnect without minting a second session.",
      windowLabel: "0-262143",
    },
    {
      accessibleLabel:
        "upload chunk range 262144 to 524287 verified checksum and remains bound to original current request",
      checksumDigest: "3de7fd640cbc",
      checksumState: "VERIFIED",
      chunkIndex: 1,
      requestBindingState: "ORIGINAL_CURRENT",
      resumeOffsetAfterChunk: 524288,
      rungId: "chunk-1",
      stageRef: "UPLOADING",
      storageLineageNote: "duplicate allocation retry reuses this same session and storage_ref",
      summary: "Duplicate allocation retries collapse onto the existing chunk ledger.",
      windowLabel: "262144-524287",
    },
    {
      accessibleLabel:
        "upload chunk range 524288 to 786431 pending checksum and remains bound to original current request",
      checksumDigest: "pending",
      checksumState: "PENDING",
      chunkIndex: 2,
      requestBindingState: "ORIGINAL_CURRENT",
      resumeOffsetAfterChunk: 524288,
      rungId: "chunk-2",
      stageRef: "CHECKSUM",
      storageLineageNote: "cross-device continuation resumes from the same offset and lineage",
      summary: "The next lawful append must begin exactly at the stored contiguous resume offset.",
      windowLabel: "524288-786431",
    },
    {
      accessibleLabel:
        "upload chunk range 786432 to 1048575 pending checksum and requires reconfirmation before current request attachment",
      checksumDigest: "pending",
      checksumState: "PENDING",
      chunkIndex: 3,
      requestBindingState: "RECONFIRMATION_REQUIRED",
      resumeOffsetAfterChunk: 524288,
      rungId: "chunk-3",
      stageRef: "ATTACHMENT",
      storageLineageNote: "same session and storage_ref survive the request rebase seam",
      summary: "A request rebase does not relabel staged bytes onto the new request silently.",
      windowLabel: "786432-1048575",
    },
  ];
}

function buildPayload(input: {
  checksumLabel: string;
  completionBasis: string;
  emittedAtBasis: string;
  expiryPolicyHours: number;
  inputHashes: Record<string, string>;
  resumeBasis: string;
  scenarioCount: number;
}) {
  const sessions: AtlasSession[] = [
    {
      attachmentState: "STAGED",
      byteCount: 1_048_576,
      bytesTransferred: 524_288,
      checksumPolicyChip: input.checksumLabel,
      displayName: "Session A · reconnect-safe current request",
      frozenRequestVersionRef: "request-version.client-doc.2026-04-23.v3",
      liveRequestVersionRef: "request-version.client-doc.2026-04-23.v3",
      nextActionCode: "RESUME_UPLOAD",
      requestBindingBadge: "original current",
      requestBindingState: "ORIGINAL_CURRENT",
      resumabilityChip: `resumable / ${input.expiryPolicyHours}h active ttl`,
      selectedRungId: "chunk-2",
      sessionId: "upload-session-2026-04-23-072A",
      stageRef: "CHECKSUM",
      stageSummary:
        "Bytes 0-524287 are durable and verified. The next append begins at offset 524288 with the same session and storage ref.",
      storageRef: "storage.upload-staging.upload-session-2026-04-23-072A",
      transferState: "UPLOADING",
      validationState: "PENDING",
      rungs: baseRungs(),
      seams: [
        {
          seamId: "mobile-reconnect",
          stageRef: "UPLOADING",
          title: "Reconnect seam",
          note: "Mobile reconnect, browser reload, and duplicate retry all re-enter through the same governed offset ledger.",
        },
      ],
    },
    {
      attachmentState: "REBIND_REQUIRED",
      byteCount: 1_048_576,
      bytesTransferred: 1_048_576,
      checksumPolicyChip: input.checksumLabel,
      displayName: "Session B · accepted stale upload",
      frozenRequestVersionRef: "request-version.client-doc.2026-04-23.v3",
      liveRequestVersionRef: "request-version.client-doc.2026-04-23.v4",
      nextActionCode: "RECONFIRM_REQUEST",
      requestBindingBadge: "reconfirmation required",
      requestBindingState: "RECONFIRMATION_REQUIRED",
      resumabilityChip: "closed / accepted stale",
      selectedRungId: "chunk-3",
      sessionId: "upload-session-2026-04-23-072B",
      stageRef: "ATTACHMENT",
      stageSummary:
        "Transfer, scan, and validation finished, but current-request satisfaction is still blocked until explicit reconfirmation.",
      storageRef: "storage.upload-staging.upload-session-2026-04-23-072B",
      transferState: "ACCEPTED",
      validationState: "ACCEPTED",
      rungs: baseRungs().map((rung) => ({
        ...rung,
        checksumDigest: rung.checksumState === "PENDING" ? "9f18d0ac1d74" : rung.checksumDigest,
        checksumState: "VERIFIED",
        requestBindingState:
          rung.chunkIndex < 3 ? "ORIGINAL_CURRENT" : "RECONFIRMATION_REQUIRED",
        stageRef: rung.chunkIndex < 2 ? "CHECKSUM" : rung.chunkIndex === 2 ? "VALIDATION" : "ATTACHMENT",
      })),
      seams: [
        {
          seamId: "stale-rebase",
          stageRef: "ATTACHMENT",
          title: "Rebase seam",
          note: "The live request advanced while the upload was in flight, so the same bytes remain historical until a fresh reconfirmation command adopts them.",
        },
        {
          seamId: "scanner-delay",
          stageRef: "SCANNING",
          title: "Scanner delay seam",
          note: "Transfer completion never collapses scan or validation delay into implicit attachment truth.",
        },
      ],
    },
  ];

  return {
    basisStatement: `${input.resumeBasis} ${input.completionBasis} The atlas renders ${input.scenarioCount} deterministic recovery cases without exposing payload bytes or provider URLs.`,
    generationBasis: {
      emittedAtBasis: input.emittedAtBasis,
      inputHashes: input.inputHashes,
    },
    palette: {
      accentOlive: "#64715C",
      accentRust: "#8A5F42",
      accentTeal: "#3F6672",
      background: "#F5F5F2",
      danger: "#A53A31",
      hairline: "rgba(16,20,24,0.08)",
      ink: "#101418",
      muted: "#68717A",
      secondary: "#EEF0EC",
      success: "#17624B",
      surface: "#FFFFFF",
      warning: "#8C5D1B",
    },
    routeId: "upload-transfer-atlas",
    selectedSessionId: sessions[0].sessionId,
    stages: [
      { label: "ALLOCATED", stageRef: "ALLOCATED", summary: stageSummary("ALLOCATED") },
      { label: "UPLOADING", stageRef: "UPLOADING", summary: stageSummary("UPLOADING") },
      { label: "CHECKSUM", stageRef: "CHECKSUM", summary: stageSummary("CHECKSUM") },
      { label: "SCANNING", stageRef: "SCANNING", summary: stageSummary("SCANNING") },
      { label: "VALIDATION", stageRef: "VALIDATION", summary: stageSummary("VALIDATION") },
      { label: "ATTACHMENT", stageRef: "ATTACHMENT", summary: stageSummary("ATTACHMENT") },
    ],
    subtitle:
      "Governed byte transfer, checksum, rebase, and attachment posture for reconnect-safe upload sessions.",
    title: "Taxat Upload Transfer Atlas",
    sessions,
  } satisfies UploadTransferAtlasPayload;
}

async function main() {
  const mode = process.argv.includes("--emit")
    ? "emit"
    : process.argv.includes("--check")
      ? "check"
      : null;
  if (mode === null) {
    throw new Error("Pass --emit or --check.");
  }

  const [checksumBundle, completionPolicy, expiryPolicy, resumePolicy, hashes] = await Promise.all([
    loadUploadChecksumCatalogBundle(),
    loadUploadCompletionBoundaryPolicy(),
    loadUploadExpiryAndGcPolicy(),
    loadUploadResumePolicy(),
    inputHashes(),
  ]);

  const payload = buildPayload({
    checksumLabel: checksumBundle.recommended.display_name,
    completionBasis: completionPolicy.basis_statement,
    emittedAtBasis: "2026-04-23T00:00:00Z",
    expiryPolicyHours: expiryPolicy.active_resume_ttl_hours,
    inputHashes: hashes,
    resumeBasis: resumePolicy.basis_statement,
    scenarioCount: resumePolicy.scenario_profiles.length,
  });

  if (mode === "emit") {
    await emitAtlasPayload(payload);
    return;
  }
  await checkAtlasPayload(payload);
}

await main();

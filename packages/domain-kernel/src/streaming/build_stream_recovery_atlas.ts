import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import type { StreamRecoveryContract } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import {
  createStreamRecoveryContract,
  hashTransportResumeToken,
} from "./stream_recovery.ts";
import { loadRebaseTriggerMatrix } from "./rebase_decider.ts";
import { cursorStatePolicy } from "./cursor_store.ts";
import { loadStreamingCatalogBundle, type StreamPhaseRef } from "./stream_scope.ts";

type AtlasMarker = {
  accessibleLabel: string;
  detail: string;
  eventType: string;
  frameEpoch: number;
  markerId: string;
  phaseRef: StreamPhaseRef;
  refs: string[];
  sequenceOrNull: number | null;
  summary: string;
};

type AtlasRibbon = {
  compactionFloorSequenceOrNull: number | null;
  contract: StreamRecoveryContract;
  cursorState: string;
  displayName: string;
  duplicatePolicyChip: string;
  exactMatchChip: string;
  inspectorNotes: string[];
  railLabel: string;
  rebaseBadge: string;
  rebasePanel: {
    replacementEpoch: number;
    replacementSnapshotRef: string;
    summary: string;
    triggerCodes: string[];
  };
  replacementContract: StreamRecoveryContract;
  streamScopeClass: StreamRecoveryContract["stream_scope_class"];
  markers: AtlasMarker[];
};

type AtlasPayload = {
  basisStatement: string;
  generationBasis: {
    emittedAtBasis: string;
    inputHashes: Record<string, string>;
  };
  overlayToggleLabel: string;
  palette: Record<string, string>;
  phases: Array<{
    label: string;
    phaseRef: StreamPhaseRef;
    summary: string;
  }>;
  ribbons: AtlasRibbon[];
  routeId: "stream-recovery-atlas";
  selectedMarkerId: string;
  selectedPhaseRef: StreamPhaseRef;
  selectedStreamScopeClass: StreamRecoveryContract["stream_scope_class"];
  subtitle: string;
  title: string;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const atlasDataPath = path.join(
  repoRoot,
  "apps",
  "operator-web",
  "public",
  "internal",
  "stream-recovery-atlas",
  "data",
  "stream-recovery-atlas.json",
);

const inputPaths = {
  catchUpDeliveryPolicy: path.join(repoRoot, "config", "streaming", "catch_up_delivery_policy.json"),
  cursorStatePolicy: path.join(repoRoot, "config", "streaming", "cursor_state_policy.json"),
  eventTypeCatalog: path.join(repoRoot, "config", "streaming", "event_type_catalog.json"),
  rebaseTriggerMatrix: path.join(repoRoot, "config", "streaming", "rebase_trigger_matrix.json"),
  streamScopeCatalog: path.join(repoRoot, "config", "streaming", "stream_scope_catalog.json"),
};

function sha256Hex(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

async function readUtf8(filePath: string) {
  return readFile(filePath, "utf8");
}

async function inputHashes() {
  const entries = await Promise.all(
    Object.entries(inputPaths).map(async ([key, filePath]) => [key, sha256Hex(await readUtf8(filePath))] as const),
  );
  return Object.fromEntries(entries);
}

function experienceContract() {
  return createStreamRecoveryContract({
    access_binding_hash: "access-binding.experience.42",
    compaction_floor_sequence_or_null: 18,
    delivery_window_state: "LIVE_RESUMABLE",
    frame_epoch: 3,
    last_published_sequence: 21,
    masking_context_hash: "masking.experience.42",
    publication_generation: 8,
    rebase_reason_code_or_null: null,
    resume_binding_ref_or_null: hashTransportResumeToken("resume.experience.42"),
    resume_binding_representation: "HASHED_TOKEN",
    route_key: "manifest-route-42",
    session_binding_hash: "session-binding.experience.42",
    session_ref: "session.experience.42",
    shell_stability_token: "shell.experience.42",
    stream_scope_class: "MANIFEST_EXPERIENCE",
    subject_ref: "manifest-42",
  });
}

function experienceReplacementContract() {
  return createStreamRecoveryContract({
    access_binding_hash: "access-binding.experience.42",
    compaction_floor_sequence_or_null: 22,
    delivery_window_state: "REBASE_REQUIRED",
    frame_epoch: 4,
    last_published_sequence: 24,
    masking_context_hash: "masking.experience.42",
    publication_generation: 9,
    rebase_reason_code_or_null: "FRAME_EPOCH_ADVANCED",
    resume_binding_ref_or_null: null,
    resume_binding_representation: "HASHED_TOKEN",
    route_key: "manifest-route-42",
    session_binding_hash: "session-binding.experience.42",
    session_ref: "session.experience.42",
    shell_stability_token: "shell.experience.42",
    stream_scope_class: "MANIFEST_EXPERIENCE",
    subject_ref: "manifest-42",
  });
}

function workspaceContract() {
  return createStreamRecoveryContract({
    access_binding_hash: "access-binding.workspace.72",
    compaction_floor_sequence_or_null: 12,
    delivery_window_state: "LIVE_RESUMABLE",
    frame_epoch: 3,
    last_published_sequence: 21,
    masking_context_hash: "masking.workspace.72",
    publication_generation: 8,
    rebase_reason_code_or_null: null,
    resume_binding_ref_or_null: hashTransportResumeToken("resume.workspace.72"),
    resume_binding_representation: "HASHED_TOKEN",
    route_key: "workspace-route-item-72",
    session_binding_hash: "session-binding.workspace.72",
    session_ref: "session.workspace.72",
    shell_stability_token: "shell.workspace.72",
    stream_scope_class: "WORKSPACE",
    subject_ref: "item-72",
  });
}

function workspaceReplacementContract() {
  return createStreamRecoveryContract({
    access_binding_hash: "access-binding.workspace.72.new",
    compaction_floor_sequence_or_null: 22,
    delivery_window_state: "ACCESS_REBIND_REQUIRED",
    frame_epoch: 3,
    last_published_sequence: 24,
    masking_context_hash: "masking.workspace.72.new",
    publication_generation: 9,
    rebase_reason_code_or_null: "ACCESS_BINDING_CHANGED",
    resume_binding_ref_or_null: null,
    resume_binding_representation: "HASHED_TOKEN",
    route_key: "workspace-route-item-72",
    session_binding_hash: "session-binding.workspace.72",
    session_ref: "session.workspace.72",
    shell_stability_token: "shell.workspace.72",
    stream_scope_class: "WORKSPACE",
    subject_ref: "item-72",
  });
}

function markersForScope(
  streamScopeClass: StreamRecoveryContract["stream_scope_class"],
): AtlasMarker[] {
  if (streamScopeClass === "MANIFEST_EXPERIENCE") {
    return [
      {
        accessibleLabel:
          "manifest experience stream sequence 18 in epoch 3 requires exact route session scope masking match",
        detail:
          "Snapshot baseline anchors the experience shell before replay begins and keeps route and shell lineage explicit.",
        eventType: "experience.snapshot",
        frameEpoch: 3,
        markerId: "manifest-experience-18",
        phaseRef: "SNAPSHOT",
        refs: ["snapshot.experience.manifest-42.18"],
        sequenceOrNull: 18,
        summary: "Snapshot establishes epoch 3 baseline.",
      },
      {
        accessibleLabel:
          "manifest experience stream sequence 19 in epoch 3 requires exact route session scope masking match",
        detail:
          "Catch-up delta applies only after sequence 18 and remains subordinate to the same recovery contract.",
        eventType: "experience.delta",
        frameEpoch: 3,
        markerId: "manifest-experience-19",
        phaseRef: "CATCH_UP",
        refs: ["delta.experience.manifest-42.19"],
        sequenceOrNull: 19,
        summary: "Catch-up delta 19 remains gap-free.",
      },
      {
        accessibleLabel:
          "manifest experience stream sequence 20 in epoch 3 requires exact route session scope masking match",
        detail:
          "Catch-up sequence 20 closes the replay window and prepares live delivery without mixed-generation state.",
        eventType: "experience.delta",
        frameEpoch: 3,
        markerId: "manifest-experience-20",
        phaseRef: "CATCH_UP",
        refs: ["delta.experience.manifest-42.20"],
        sequenceOrNull: 20,
        summary: "Catch-up frontier reaches the published edge.",
      },
      {
        accessibleLabel:
          "manifest experience stream sequence 21 in epoch 3 requires exact route session scope masking match",
        detail:
          "Live delta sequence 21 is legal only after the cursor finishes catch-up and still matches the authoritative contract.",
        eventType: "experience.delta",
        frameEpoch: 3,
        markerId: "manifest-experience-21",
        phaseRef: "LIVE",
        refs: ["delta.experience.manifest-42.21"],
        sequenceOrNull: 21,
        summary: "Live continuity begins at sequence 21.",
      },
      {
        accessibleLabel:
          "manifest experience stream heartbeat in epoch 3 requires exact route session scope masking match",
        detail:
          "Heartbeat preserves liveness and the published frontier without behaving like a business mutation.",
        eventType: "heartbeat",
        frameEpoch: 3,
        markerId: "manifest-experience-heartbeat",
        phaseRef: "HEARTBEAT",
        refs: ["frontier=21"],
        sequenceOrNull: 21,
        summary: "Heartbeat keeps the stream warm without advancing state.",
      },
      {
        accessibleLabel:
          "manifest experience stream rebase to epoch 4 requires fresh snapshot and exact route session scope masking match",
        detail:
          "Epoch 4 replaces epoch 3 entirely. No mixed-epoch markers remain once the client accepts rebase.",
        eventType: "rebase.explanation",
        frameEpoch: 4,
        markerId: "manifest-experience-rebase",
        phaseRef: "REBASE",
        refs: ["snapshot.experience.manifest-42.epoch-4"],
        sequenceOrNull: 22,
        summary: "Rebase forces fresh epoch 4 snapshot.",
      },
      {
        accessibleLabel:
          "manifest experience stream revoke closes the cursor after the operator or client ends continuity",
        detail:
          "Cursor revocation or client close halts live resume and requires a clean reconnect path.",
        eventType: "cursor.revoked",
        frameEpoch: 4,
        markerId: "manifest-experience-revoke",
        phaseRef: "REVOKE",
        refs: ["cursor.state=CLOSED"],
        sequenceOrNull: null,
        summary: "Closed cursors never reopen in place.",
      },
    ];
  }

  return [
    {
      accessibleLabel:
        "workspace stream sequence 18 in epoch 3 requires exact route session scope masking match",
      detail:
        "Workspace snapshot baseline freezes route, session visibility, and masking posture before replay resumes.",
      eventType: "workspace.snapshot",
      frameEpoch: 3,
      markerId: "workspace-18",
      phaseRef: "SNAPSHOT",
      refs: ["snapshot.workspace.item-72.18"],
      sequenceOrNull: 18,
      summary: "Snapshot anchors workspace epoch 3.",
    },
    {
      accessibleLabel:
        "workspace stream sequence 19 in epoch 3 requires exact route session scope masking match",
      detail:
        "Catch-up delta 19 stays customer-safe and monotonic while the cursor closes the replay window.",
      eventType: "workspace.delta",
      frameEpoch: 3,
      markerId: "workspace-19",
      phaseRef: "CATCH_UP",
      refs: ["delta.workspace.item-72.19"],
      sequenceOrNull: 19,
      summary: "Catch-up delta 19 remains lawful.",
    },
    {
      accessibleLabel:
        "workspace stream sequence 20 in epoch 3 requires exact route session scope masking match",
      detail:
        "Activity sequence 20 reaches the current frontier without skipping or replaying hidden data.",
      eventType: "activity.appended",
      frameEpoch: 3,
      markerId: "workspace-20",
      phaseRef: "CATCH_UP",
      refs: ["activity.workspace.item-72.20"],
      sequenceOrNull: 20,
      summary: "Catch-up stays gap-free through activity append.",
    },
    {
      accessibleLabel:
        "workspace stream sequence 21 in epoch 3 requires exact route session scope masking match",
      detail:
        "Live notification sequence 21 remains legal only while access and masking still match the cursor bind.",
      eventType: "notification.badge",
      frameEpoch: 3,
      markerId: "workspace-21",
      phaseRef: "LIVE",
      refs: ["notification.workspace.item-72.21"],
      sequenceOrNull: 21,
      summary: "Live notification sequence 21 stays in the same epoch.",
    },
    {
      accessibleLabel:
        "workspace stream heartbeat in epoch 3 requires exact route session scope masking match",
      detail:
        "Heartbeat preserves liveness while the workspace remains resumable under the same session and masking posture.",
      eventType: "heartbeat",
      frameEpoch: 3,
      markerId: "workspace-heartbeat",
      phaseRef: "HEARTBEAT",
      refs: ["frontier=21"],
      sequenceOrNull: 21,
      summary: "Heartbeat shows current frontier only.",
    },
    {
      accessibleLabel:
        "workspace stream rebase to epoch 3 requires access rebind before new data may resume",
      detail:
        "Access drift kept the epoch stable but still invalidated resume. The client must refresh bindings before consuming later events.",
      eventType: "rebase.explanation",
      frameEpoch: 3,
      markerId: "workspace-rebase",
      phaseRef: "REBASE",
      refs: ["snapshot.workspace.item-72.rebind"],
      sequenceOrNull: 22,
      summary: "Access rebind blocks continued live replay.",
    },
    {
      accessibleLabel:
        "workspace stream revoke closes the cursor after explicit close or expiry",
      detail:
        "Revoked or expired workspace cursors stop replay and require a new continuity bind.",
      eventType: "cursor.revoked",
      frameEpoch: 3,
      markerId: "workspace-revoke",
      phaseRef: "REVOKE",
      refs: ["cursor.state=REVOKED"],
      sequenceOrNull: null,
      summary: "Revoked cursor state is terminal.",
    },
  ];
}

function ribbonForScope(
  displayName: string,
  railLabel: string,
  streamScopeClass: StreamRecoveryContract["stream_scope_class"],
  contract: StreamRecoveryContract,
  replacementContract: StreamRecoveryContract,
): AtlasRibbon {
  return {
    compactionFloorSequenceOrNull: contract.compaction_floor_sequence_or_null,
    contract,
    cursorState: streamScopeClass === "MANIFEST_EXPERIENCE" ? "LIVE" : "LIVE",
    displayName,
    duplicatePolicyChip: "scope / epoch / sequence",
    exactMatchChip: "exact route / session / scope / masking",
    inspectorNotes: [
      "Raw transport resume tokens never become the primary continuity object.",
      "Catch-up must complete before live delivery is treated as current.",
      "No ribbon may mix epochs after a rebase selection.",
    ],
    markers: markersForScope(streamScopeClass),
    railLabel,
    rebaseBadge:
      replacementContract.delivery_window_state === "ACCESS_REBIND_REQUIRED"
        ? "access rebind required"
        : "rebase required",
    rebasePanel: {
      replacementEpoch: replacementContract.frame_epoch,
      replacementSnapshotRef:
        streamScopeClass === "MANIFEST_EXPERIENCE"
          ? "snapshot.experience.manifest-42.epoch-4"
          : "snapshot.workspace.item-72.rebind",
      summary:
        replacementContract.delivery_window_state === "ACCESS_REBIND_REQUIRED"
          ? "Access or masking drift blocks resume even though the route stayed mounted."
          : "Epoch advance invalidates prior sequence windows and forces a fresh frame baseline.",
      triggerCodes:
        replacementContract.delivery_window_state === "ACCESS_REBIND_REQUIRED"
          ? ["ACCESS_BINDING_CHANGED", "MASKING_POSTURE_CHANGED"]
          : ["FRAME_EPOCH_ADVANCED", "HISTORY_COMPACTED"],
    },
    replacementContract,
    streamScopeClass,
  };
}

function buildAtlasPayload() {
  const manifest = ribbonForScope(
    "Manifest experience",
    "EXPERIENCE",
    "MANIFEST_EXPERIENCE",
    experienceContract(),
    experienceReplacementContract(),
  );
  const workspace = ribbonForScope(
    "Workspace",
    "WORKSPACE",
    "WORKSPACE",
    workspaceContract(),
    workspaceReplacementContract(),
  );

  return {
    basisStatement:
      "Stream recovery stays authoritative only when route, subject, shell, session, access, masking, epoch, and frontier truth remain aligned. Resume tokens alone never prove continuity.",
    overlayToggleLabel: "Show duplicate and compaction posture",
    palette: {
      accentBlue: "#44627A",
      accentPine: "#5C725E",
      accentPlum: "#65596F",
      background: "#F4F5F2",
      danger: "#A53A31",
      hairline: "rgba(16,20,24,0.08)",
      ink: "#101418",
      mutedInk: "#68717A",
      secondarySurface: "#EEF0EC",
      success: "#17614B",
      surface: "#FFFFFF",
      warning: "#8C5D1B",
    },
    phases: [
      { label: "SNAPSHOT", phaseRef: "SNAPSHOT", summary: "Baseline frame before replay." },
      { label: "CATCH-UP", phaseRef: "CATCH_UP", summary: "Gap-free replay to frontier." },
      { label: "LIVE", phaseRef: "LIVE", summary: "Current epoch stream after replay." },
      { label: "HEARTBEAT", phaseRef: "HEARTBEAT", summary: "Liveness without business mutation." },
      { label: "REBASE", phaseRef: "REBASE", summary: "Fresh frame or access rebind required." },
      { label: "REVOKE", phaseRef: "REVOKE", summary: "Cursor closed, revoked, or expired." },
    ],
    ribbons: [manifest, workspace],
    routeId: "stream-recovery-atlas",
    selectedMarkerId: "workspace-21",
    selectedPhaseRef: "LIVE",
    selectedStreamScopeClass: "WORKSPACE",
    subtitle:
      "Inspect snapshot, catch-up, live continuity, epoch seams, and access rebind posture without turning stream law into client heuristics.",
    title: "Taxat Stream Recovery Atlas",
  } satisfies Omit<AtlasPayload, "generationBasis">;
}

async function atlasPayload() {
  const [catalogBundle, rebaseTriggerMatrix, hashes] = await Promise.all([
    loadStreamingCatalogBundle(),
    loadRebaseTriggerMatrix(),
    inputHashes(),
  ]);
  const payload = buildAtlasPayload();
  return {
    ...payload,
    basisStatement: `${payload.basisStatement} ${catalogBundle.streamScopeCatalog.basis_statement}`,
    generationBasis: {
      emittedAtBasis: "Deterministic config and policy payloads only. No live transport data.",
      inputHashes: {
        ...hashes,
        rebaseTriggerMatrix: sha256Hex(JSON.stringify(rebaseTriggerMatrix)),
        streamScopeCatalog: sha256Hex(JSON.stringify(catalogBundle.streamScopeCatalog)),
        cursorStatePolicy: sha256Hex(JSON.stringify(cursorStatePolicy)),
      },
    },
  } satisfies AtlasPayload;
}

async function emitAtlasPayload(payload: AtlasPayload) {
  await mkdir(path.dirname(atlasDataPath), { recursive: true });
  await writeFile(atlasDataPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function checkAtlasPayload(payload: AtlasPayload) {
  const existing = await readUtf8(atlasDataPath);
  const expected = `${JSON.stringify(payload, null, 2)}\n`;
  if (existing !== expected) {
    throw new Error(`Out-of-sync generated file: ${path.relative(repoRoot, atlasDataPath)}`);
  }
}

async function main() {
  const payload = await atlasPayload();
  const mode = process.argv.includes("--check") ? "check" : "emit";
  if (mode === "check") {
    await checkAtlasPayload(payload);
    console.log("verified stream recovery atlas");
    return;
  }
  await emitAtlasPayload(payload);
  console.log(`emitted ${path.relative(repoRoot, atlasDataPath)}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}

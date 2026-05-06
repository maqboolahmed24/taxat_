import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { stableJsonHash } from "../../domain-kernel/src/primitives/hash.ts";
import {
  type StoredAuditEvent,
  createAppendOnlyAuditWriter,
} from "./append_only_audit_writer.ts";
import { loadAuditPolicyBundle, type AuditFamilyRef } from "./audit_visibility_and_retention.ts";

type AtlasFamilyRailRow = {
  accessibleLabel: string;
  familyRef: AuditFamilyRef;
  label: string;
  signaturePosture: string;
};

type AtlasEventRow = {
  accessibleLabel: string;
  actorRefOrNull: string | null;
  auditEventId: string;
  auditSufficiencyState: string;
  chainHash: string;
  eventType: string;
  limitationReasonCodes: string[];
  lineageRefs: string[];
  objectRefs: string[];
  payloadAvailabilityState: string;
  payloadExpiryAtOrNull: string | null;
  prevEventHashOrNull: string | null;
  reasonCodes: string[];
  recordedAt: string;
  serviceRefOrNull: string | null;
  signatureFailureReasonCodeOrNull: string | null;
  signatureRefOrNull: string | null;
  signatureState: string;
  streamSequence: number;
  summary: string;
  visibilityClass: string;
};

type AtlasStreamRow = {
  accessibleLabel: string;
  continuityState: string;
  displayName: string;
  events: AtlasEventRow[];
  familyRef: AuditFamilyRef;
  headHashOrNull: string | null;
  headSequence: number;
  signaturePosture: string;
  streamRef: string;
  summary: string;
};

type AtlasMergedRow = {
  accessibleLabel: string;
  eventType: string;
  recordedAt: string;
  streamRef: string;
  streamSequence: number;
  summary: string;
};

type AtlasScenario = {
  displayName: string;
  focusNote: string;
  mergedView: AtlasMergedRow[];
  retentionChip: string;
  scenarioId: string;
  selectedFamilyRef: AuditFamilyRef;
  selectedStreamRef: string;
  streams: AtlasStreamRow[];
  summary: string;
};

type AuditStreamAtlasPayload = {
  basisStatement: string;
  familyRail: AtlasFamilyRailRow[];
  generationBasis: {
    emittedAtBasis: string;
    inputHashes: Record<string, string>;
  };
  mergedModes: Array<{
    accessibleLabel: string;
    label: string;
    modeId: "STRICT_STREAM" | "MERGED_EXPLANATION";
  }>;
  palette: Record<string, string>;
  routeId: "audit-stream-atlas";
  scenarios: AtlasScenario[];
  selectedMergedMode: "STRICT_STREAM" | "MERGED_EXPLANATION";
  selectedScenarioId: string;
  subtitle: string;
  title: string;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..");
const atlasDataPath = path.join(
  repoRoot,
  "apps",
  "operator-web",
  "public",
  "internal",
  "audit-stream-atlas",
  "data",
  "audit-stream-atlas.json",
);

const inputPaths = {
  auditEventFamilyCatalog: path.join(
    repoRoot,
    "config",
    "audit",
    "audit_event_family_catalog.json",
  ),
  auditOrderingPolicy: path.join(repoRoot, "config", "audit", "audit_ordering_policy.json"),
  auditSignaturePolicy: path.join(repoRoot, "config", "audit", "audit_signature_policy.json"),
  auditStreamPartitionPolicy: path.join(
    repoRoot,
    "config",
    "audit",
    "audit_stream_partition_policy.json",
  ),
} as const;

function eventLabel(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .toLowerCase();
}

async function readUtf8(filePath: string) {
  return readFile(filePath, "utf8");
}

async function inputHashes() {
  const entries = await Promise.all(
    Object.entries(inputPaths).map(
      async ([key, filePath]) => [key, stableJsonHash(await readUtf8(filePath))] as const,
    ),
  );
  return Object.fromEntries(entries);
}

async function emitAtlasPayload(payload: AuditStreamAtlasPayload) {
  await mkdir(path.dirname(atlasDataPath), { recursive: true });
  await writeFile(atlasDataPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function checkAtlasPayload(payload: AuditStreamAtlasPayload) {
  const expected = `${JSON.stringify(payload, null, 2)}\n`;
  const existing = await readFile(atlasDataPath, "utf8");
  if (existing !== expected) {
    throw new Error(`Out-of-sync generated file: ${path.relative(repoRoot, atlasDataPath)}`);
  }
}

function serializeStoredEvent(storedEvent: StoredAuditEvent): AtlasEventRow {
  const event = storedEvent.event;
  const continuityLabel = event.prev_event_hash ? "prior hash continuity" : "root continuity";
  return {
    accessibleLabel: `audit stream sequence ${event.stream_sequence} records ${eventLabel(event.event_type)} with ${continuityLabel}`,
    actorRefOrNull: event.actor_ref,
    auditEventId: event.audit_event_id,
    auditSufficiencyState: event.retained_context.audit_sufficiency_state,
    chainHash: storedEvent.chain_hash,
    eventType: event.event_type,
    limitationReasonCodes: event.retained_context.limitation_reason_codes,
    lineageRefs: event.retained_context.lineage_refs,
    objectRefs: event.object_refs,
    payloadAvailabilityState: event.retained_context.payload_availability_state,
    payloadExpiryAtOrNull: event.retained_context.payload_expiry_at_or_null,
    prevEventHashOrNull: event.prev_event_hash,
    reasonCodes: event.reason_codes,
    recordedAt: event.recorded_at,
    serviceRefOrNull: event.service_ref,
    signatureFailureReasonCodeOrNull: storedEvent.signature_failure_reason_code_or_null,
    signatureRefOrNull: event.signature_ref,
    signatureState: storedEvent.signature_batch_state,
    streamSequence: event.stream_sequence,
    summary: `${event.event_type} stays immutable at sequence ${event.stream_sequence}.`,
    visibilityClass: event.visibility_class,
  };
}

function mergedView(writer: Awaited<ReturnType<typeof createAppendOnlyAuditWriter>>): AtlasMergedRow[] {
  return writer.listMergedView().map((storedEvent) => ({
    accessibleLabel: `merged explanation row ${storedEvent.event.recorded_at} ${storedEvent.event.event_type} from ${storedEvent.event.audit_stream_ref}`,
    eventType: storedEvent.event.event_type,
    recordedAt: storedEvent.event.recorded_at,
    streamRef: storedEvent.event.audit_stream_ref,
    streamSequence: storedEvent.event.stream_sequence,
    summary: `${storedEvent.event.event_type} is visible in merged review without changing the strict stream order.`,
  }));
}

function buildScenarioStream(
  writer: Awaited<ReturnType<typeof createAppendOnlyAuditWriter>>,
  familyRef: AuditFamilyRef,
  streamRef: string,
) {
  const events = writer.readStream(streamRef);
  const verification = writer.verifyStream(streamRef);
  const batches = writer
    .listSignatureBatches()
    .filter((entry) => entry.audit_stream_ref === streamRef);
  return {
    accessibleLabel: `Audit stream ${streamRef} for ${familyRef}`,
    continuityState: verification.status === "VERIFIED" ? "STRICT_CONTINUITY_VERIFIED" : "BROKEN",
    displayName: streamRef.split(".").slice(-2).join(" / "),
    events: events.map((entry) => serializeStoredEvent(entry)),
    familyRef,
    headHashOrNull: verification.lastChainHashOrNull,
    headSequence: verification.eventCount,
    signaturePosture:
      batches.length === 0
        ? "NO_SIGNATURE_BATCH"
        : batches.some((entry) => entry.state === "FAILED")
          ? "BATCH_FAILED_AFTER_APPEND"
          : batches.some((entry) => entry.state === "SIGNED")
            ? "BATCH_SIGNED"
            : "BATCH_PENDING",
    streamRef,
    summary: `${verification.eventCount} rows remain in strict append-only order for ${familyRef}.`,
  } satisfies AtlasStreamRow;
}

async function buildStrictManifestScenario() {
  const writer = await createAppendOnlyAuditWriter();
  const tenantId = "tenant.taxat";
  const manifestId = "manifest.audit.076.strict";
  const workflowId = "workflow.audit.076.strict";

  const auth = await writer.append({
    actorRefOrNull: "principal.staff.audit.076",
    correlationContext: {
      authority_operation_id: "authority.operation.076",
      manifest_id: manifestId,
      tenant_id: tenantId,
      workflow_item_id: workflowId,
    },
    eventTime: "2026-04-23T10:00:00Z",
    eventType: "PrincipalAuthenticated",
    publicationRef: "strict-auth-1",
    tenantId,
  });
  const frozen = await writer.append({
    correlationContext: {
      manifest_id: manifestId,
      mode: "COMPLIANCE",
      root_manifest_id: manifestId,
      run_kind: "INTERACTIVE",
      tenant_id: tenantId,
      workflow_item_id: workflowId,
    },
    eventTime: "2026-04-23T10:01:00Z",
    eventType: "ManifestFrozen",
    publicationRef: "strict-manifest-1",
    serviceRefOrNull: "service.control-plane-api",
    tenantId,
  });
  await writer.append({
    correlationContext: {
      manifest_id: manifestId,
      mode: "COMPLIANCE",
      root_manifest_id: manifestId,
      run_kind: "INTERACTIVE",
      tenant_id: tenantId,
      workflow_item_id: workflowId,
    },
    eventTime: "2026-04-23T10:02:00Z",
    eventType: "ManifestSealed",
    publicationRef: "strict-manifest-2",
    serviceRefOrNull: "service.control-plane-api",
    tenantId,
  });
  await writer.append({
    correlationContext: {
      manifest_id: manifestId,
      mode: "COMPLIANCE",
      root_manifest_id: manifestId,
      run_kind: "INTERACTIVE",
      tenant_id: tenantId,
      workflow_item_id: workflowId,
    },
    eventTime: "2026-04-23T10:03:00Z",
    eventType: "ManifestCompleted",
    publicationRef: "strict-manifest-3",
    serviceRefOrNull: "service.control-plane-api",
    tenantId,
  });

  const authStream = auth.storedEvent.event.audit_stream_ref;
  const manifestStream = frozen.storedEvent.event.audit_stream_ref;
  return {
    displayName: "Manifest chain stays strict while merged review stays secondary",
    focusNote:
      "The manifest stream remains the source of truth. Merged explanation can correlate related auth activity, but it never reorders the manifest chain.",
    mergedView: mergedView(writer),
    retentionChip: "FULL_EVIDENCE",
    scenarioId: "manifest-chain-strict",
    selectedFamilyRef: "WORKFLOW" as const,
    selectedStreamRef: manifestStream,
    streams: [
      buildScenarioStream(writer, "AUTH", authStream),
      buildScenarioStream(writer, "WORKFLOW", manifestStream),
    ],
    summary:
      "One manifest stream preserves strict continuity while merged review only adds supporting context.",
  } satisfies AtlasScenario;
}

async function buildRetentionLimitedScenario() {
  const writer = await createAppendOnlyAuditWriter();
  const tenantId = "tenant.taxat";
  const manifestId = "manifest.audit.076.retention";
  const workflowId = "workflow.audit.076.retention";

  await writer.append({
    correlationContext: {
      manifest_id: manifestId,
      retention_class: "regulated_record",
      tenant_id: tenantId,
      workflow_item_id: workflowId,
    },
    eventTime: "2026-04-23T11:00:00Z",
    eventType: "RetentionApplied",
    objectRefs: ["artifact.proof.076"],
    publicationRef: "retention-1",
    serviceRefOrNull: "service.retention-engine",
    tenantId,
  });
  const limited = await writer.append({
    correlationContext: {
      manifest_id: manifestId,
      retention_class: "regulated_record",
      tenant_id: tenantId,
      workflow_item_id: workflowId,
    },
    eventTime: "2026-04-23T11:30:00Z",
    eventType: "RetentionLimited",
    limitationReasonCodes: ["PAYLOAD_EXPIRED", "RETENTION_LIMIT_ACTIVE"],
    lineageRefs: ["lineage.retention.076", "manifest.audit.076.retention"],
    objectRefs: ["artifact.proof.076"],
    payloadAvailabilityState: "HASH_ONLY",
    payloadExpiryAtOrNull: "2026-04-23T11:30:00Z",
    publicationRef: "retention-2",
    reasonCodes: ["PAYLOAD_EXPIRED"],
    serviceRefOrNull: "service.retention-engine",
    tenantId,
  });

  const streamRef = limited.storedEvent.event.audit_stream_ref;
  return {
    displayName: "Retention-limited proof remains explicit",
    focusNote:
      "Limited audit truth keeps typed reason codes, limitation codes, and lineage refs after the original payload expires.",
    mergedView: mergedView(writer),
    retentionChip: "LIMITED_BUT_EXPLICIT",
    scenarioId: "retention-limited-proof",
    selectedFamilyRef: "RETENTION" as const,
    selectedStreamRef: streamRef,
    streams: [buildScenarioStream(writer, "RETENTION", streamRef)],
    summary:
      "Retention-limited rows remain present and typed instead of silently disappearing from audit history.",
  } satisfies AtlasScenario;
}

async function buildReleaseFailureScenario() {
  const writer = await createAppendOnlyAuditWriter();
  const tenantId = "tenant.taxat";

  const attested = await writer.append({
    eventTime: "2026-04-23T12:00:00Z",
    eventType: "BuildAttested",
    objectRefs: ["release.bundle.076"],
    publicationRef: "release-1",
    reasonCodes: ["ATTESTATION_PUBLISHED"],
    serviceRefOrNull: "service.release-orchestrator",
    tenantId,
  });
  const promoted = await writer.append({
    eventTime: "2026-04-23T12:05:00Z",
    eventType: "ReleasePromoted",
    objectRefs: ["release.bundle.076"],
    publicationRef: "release-2",
    reasonCodes: ["PROMOTION_APPROVED"],
    serviceRefOrNull: "service.release-orchestrator",
    tenantId,
  });

  writer.markSignatureBatchOutcome({
    failureReasonCodeOrNull: "KMS_BATCH_TIMEOUT",
    signatureRef: promoted.storedEvent.event.signature_ref!,
    state: "FAILED",
  });

  const streamRef = attested.storedEvent.event.audit_stream_ref;
  return {
    displayName: "Signature batch failure does not rewrite the row",
    focusNote:
      "Release rows reserve signature_ref at append time, then record batch failure beside the row without mutating sequence, hashes, or event identifiers.",
    mergedView: mergedView(writer),
    retentionChip: "SIGNED_OR_FAILED_OUT_OF_BAND",
    scenarioId: "release-batch-failure",
    selectedFamilyRef: "RELEASE" as const,
    selectedStreamRef: streamRef,
    streams: [buildScenarioStream(writer, "RELEASE", streamRef)],
    summary:
      "Signature failure is follow-up metadata only; the append-only row remains unchanged.",
  } satisfies AtlasScenario;
}

async function createAtlasPayload(): Promise<AuditStreamAtlasPayload> {
  const policyBundle = await loadAuditPolicyBundle({ reload: true });
  const [strictManifestScenario, retentionLimitedScenario, releaseFailureScenario] =
    await Promise.all([
      buildStrictManifestScenario(),
      buildRetentionLimitedScenario(),
      buildReleaseFailureScenario(),
    ]);

  return {
    basisStatement:
      "The atlas explains append-only audit stream law. It stays read-only and does not behave like a mutable audit admin console.",
    familyRail: policyBundle.familyCatalog.family_rows.map((row) => ({
      accessibleLabel: `Audit family ${row.family_ref} with ${policyBundle.signatureRowsByFamily.get(row.family_ref)?.signature_profile.toLowerCase().replaceAll("_", " ")} signature posture`,
      familyRef: row.family_ref,
      label: row.label,
      signaturePosture:
        policyBundle.signatureRowsByFamily.get(row.family_ref)?.signature_profile ?? "NONE",
    })),
    generationBasis: {
      emittedAtBasis: "2026-04-23T12:30:00Z",
      inputHashes: await inputHashes(),
    },
    mergedModes: [
      {
        accessibleLabel: "Show strict stream mode",
        label: "Strict stream",
        modeId: "STRICT_STREAM",
      },
      {
        accessibleLabel: "Show merged explanation mode",
        label: "Merged explanation",
        modeId: "MERGED_EXPLANATION",
      },
    ],
    palette: {
      accentCobalt: "#45657A",
      accentEmber: "#9A5E30",
      accentForest: "#4D6C5C",
      background: "#F4F1EB",
      danger: "#A53A31",
      hairline: "rgba(17,20,24,0.08)",
      ink: "#111418",
      muted: "#66707A",
      secondary: "#ECE7DE",
      success: "#165F49",
      surface: "#FFFFFF",
      warning: "#8B5F20",
    },
    routeId: "audit-stream-atlas",
    scenarios: [strictManifestScenario, retentionLimitedScenario, releaseFailureScenario],
    selectedMergedMode: "STRICT_STREAM",
    selectedScenarioId: "manifest-chain-strict",
    subtitle:
      "Shows one-based sequence continuity, retained context, family rails, and signature follow-up posture without collapsing strict stream order into a merged narrative.",
    title: "Audit Stream Atlas",
  };
}

async function main() {
  const payload = await createAtlasPayload();
  if (process.argv.includes("--check")) {
    await checkAtlasPayload(payload);
    return;
  }
  await emitAtlasPayload(payload);
}

await main();

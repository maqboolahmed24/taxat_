import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { createEventEnvelope, type MessageFamilyRef } from "./event_envelope.ts";
import { buildAuthorityRequestIdentity } from "./idempotency.ts";

type SourceLineageEntry = {
  rationale: string;
  source_file: string;
  source_heading_or_logical_block: string;
};

type EventEnvelopeCatalog = {
  basis_statement: string;
  catalog_id: string;
  contract_version: string;
  message_family_rows: Array<{
    allowed_payload_fields: string[];
    channel_refs: string[];
    display_name: string;
    duplicate_scope_ref: string;
    durable_truth_anchor: string;
    family_ref: MessageFamilyRef;
    forbidden_payload_fields: string[];
    notes: string[];
    rail_label: string;
    required_identity_fields: string[];
    required_packet_fields: string[];
    source_record_family: string;
    transport_boundary: string;
  }>;
  source_lineage: SourceLineageEntry[];
};

type IdempotencyScopeMatrix = {
  basis_statement: string;
  contract_version: string;
  matrix_id: string;
  scope_rows: Array<{
    authority_side_tuple: string[];
    collision_rule: string;
    consumer_dedupe_tuple: string[];
    display_name: string;
    notes: string[];
    producer_duplicate_tuple: string[];
    recovery_posture: string;
    scope_ref: string;
  }>;
};

type RetryAndDeadLetterPolicy = {
  basis_statement: string;
  contract_version: string;
  policy_id: string;
  policy_rows: Array<{
    channel_refs: string[];
    dead_letter_mode: "DEAD_LETTER_QUEUE_REQUIRED" | "QUARANTINE_INBOX_REQUIRED";
    family_ref: MessageFamilyRef;
    initial_backoff_seconds: number;
    max_backoff_seconds: number;
    max_delivery_attempts: number;
    notes: string[];
    redrive_gate: string;
    terminal_posture: string;
  }>;
};

type MessageRedactionPolicy = {
  basis_statement: string;
  contract_version: string;
  policy_id: string;
  surface_rows: Array<{
    allowed_fields: string[];
    applies_to_family_refs: MessageFamilyRef[];
    forbidden_content: string[];
    masking_posture: string;
    notes: string[];
    surface_ref: string;
  }>;
};

type AtlasPayload = {
  basisStatement: string;
  envelopeBadge: string;
  families: Array<{
    alerts: Array<{
      label: string;
      text: string;
    }>;
    channels: string[];
    collisionRule: string;
    displayName: string;
    duplicateScopeRef: string;
    exampleIdentity: {
      duplicate_meaning_key: string;
      idempotency_key: string;
      note: string;
      packet_id: string;
      request_hash: string;
      source_record_ref: string;
    };
    familyRef: MessageFamilyRef;
    laneCards: Array<{
      accessible_label: string;
      label: string;
      lane_ref: string;
      overline: string;
      summary: string;
    }>;
    notes: string[];
    railLabel: string;
    redactionSummary: string;
    retrySummary: string;
    tone: "plum" | "teal" | "bronze" | "olive" | "scarlet";
    truthAnchor: string;
  }>;
  generationBasis: {
    emittedAtBasis: string;
    inputHashes: Record<string, string>;
  };
  lanes: Array<{
    label: string;
    lane_ref: string;
    summary: string;
  }>;
  routeId: string;
  selectedFamilyRef: MessageFamilyRef;
  selectedLaneRef: string;
  subtitle: string;
  title: string;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const configDir = path.join(repoRoot, "config", "messaging");
const atlasDataPath = path.join(
  repoRoot,
  "apps",
  "operator-web",
  "public",
  "internal",
  "event-envelope-atlas",
  "data",
  "event-envelope-atlas.json",
);

const jsonPaths = {
  eventEnvelopeCatalog: path.join(configDir, "event_envelope_catalog.json"),
  idempotencyScopeMatrix: path.join(configDir, "idempotency_scope_matrix.json"),
  messageRedactionPolicy: path.join(configDir, "message_redaction_policy.json"),
  retryAndDeadLetterPolicy: path.join(configDir, "retry_and_dead_letter_policy.json"),
};

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function sha256Hex(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function familyTone(familyRef: MessageFamilyRef) {
  switch (familyRef) {
    case "NORTHBOUND_COMMAND":
      return "teal";
    case "STAGE_TASK":
      return "bronze";
    case "ARTIFACT_EVENT":
      return "olive";
    case "AUTHORITY_REQUEST":
      return "plum";
    case "AUTHORITY_INGRESS":
      return "scarlet";
  }
}

function assertKeys(label: string, value: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (!(key in value)) {
      throw new Error(`${label} is missing required key ${key}.`);
    }
  }
}

function sampleEnvelope(familyRef: MessageFamilyRef) {
  switch (familyRef) {
    case "NORTHBOUND_COMMAND":
      return createEventEnvelope({
        channelRef: "channel.api.command.accepted",
        durableTruthStatement: "ApiCommandReceipt remains the durable command source.",
        genericIdentityInput: {
          channelRef: "channel.api.command.accepted",
          consumerRef: "api.command-handler",
          familyRef: "ApiCommandReceipt",
          payload: {
            command_ref: "command.receipt.case-2026-04-23",
            manifest_ref: "manifest.case-2026-04-23",
            requested_scope_ref: "scope.submit.sa100",
          },
          producerRef: "api.command.acceptor",
          scopeRef: "NORTHBOUND_COMMAND",
          semanticOperationRef: "SUBMIT_RETURN",
          semanticTargetRef: "command.receipt.case-2026-04-23",
          sourceRecordRef: "command.receipt.case-2026-04-23",
          sourceRecordVersionHash:
            "f87f7e99d78201c59c6d38caaa8ad6ef6b9cac56b5123f6072a3b6d0a78598e8",
          tenantId: "tenant.taxat-sandbox",
        },
        messageFamilyRef: "NORTHBOUND_COMMAND",
        packetId: "packet.command.case-2026-04-23.01",
        payload: {
          command_ref: "command.receipt.case-2026-04-23",
          manifest_ref: "manifest.case-2026-04-23",
        },
        payloadRefOrNull: "packet.command.case-2026-04-23.01",
        producedAt: "2026-04-23T09:00:00.000Z",
        producerRef: "api.command.acceptor",
        sourceRecordRef: "command.receipt.case-2026-04-23",
        sourceRecordVersionHash:
          "f87f7e99d78201c59c6d38caaa8ad6ef6b9cac56b5123f6072a3b6d0a78598e8",
      });
    case "STAGE_TASK":
      return createEventEnvelope({
        channelRef: "channel.manifest.stage.dispatch",
        durableTruthStatement:
          "Manifest stage dispatch receipts and execution claims remain the legal worker truth.",
        genericIdentityInput: {
          channelRef: "channel.manifest.stage.dispatch",
          consumerRef: "worker.stage-runner",
          familyRef: "ManifestStageDispatchReceipt",
          payload: {
            command_receipt_ref: "command.receipt.case-2026-04-23",
            manifest_ref: "manifest.case-2026-04-23",
            precondition_hash:
              "3d297f287271a6c71e75645d704d2218dd188098caec1b2bc774d3b307277a88",
            stage_code: "COMPUTE_OBLIGATIONS",
          },
          producerRef: "orchestrator.stage-dispatch",
          scopeRef: "STAGE_TASK",
          semanticOperationRef: "COMPUTE_OBLIGATIONS",
          semanticTargetRef: "manifest.case-2026-04-23.stage.compute-obligations",
          sourceRecordRef: "dispatch.stage.case-2026-04-23.compute-obligations",
          sourceRecordVersionHash:
            "009ed2e6777f1f3f550dd7afd7d9c285679364e037ef0ef3874f6dfebeaa5c60",
          tenantId: "tenant.taxat-sandbox",
        },
        messageFamilyRef: "STAGE_TASK",
        packetId: "packet.stage.case-2026-04-23.01",
        payload: {
          manifest_ref: "manifest.case-2026-04-23",
          stage_code: "COMPUTE_OBLIGATIONS",
        },
        payloadRefOrNull: "packet.stage.case-2026-04-23.01",
        producedAt: "2026-04-23T09:05:00.000Z",
        producerRef: "orchestrator.stage-dispatch",
        sourceRecordRef: "dispatch.stage.case-2026-04-23.compute-obligations",
        sourceRecordVersionHash:
          "009ed2e6777f1f3f550dd7afd7d9c285679364e037ef0ef3874f6dfebeaa5c60",
      });
    case "ARTIFACT_EVENT":
      return createEventEnvelope({
        channelRef: "channel.upload.scan.request",
        durableTruthStatement:
          "Immutable object-version receipts and artifact processing rows remain durable truth.",
        genericIdentityInput: {
          channelRef: "channel.upload.scan.request",
          consumerRef: "worker.artifact-scan",
          familyRef: "ImmutableObjectVersionEventReceipt",
          payload: {
            artifact_ref: "artifact.upload.case-2026-04-23",
            event_id_or_sequencer: "s3-sequencer-0001",
            object_version_ref: "object.version.case-2026-04-23.0001",
            scan_policy_hash:
              "b20bc4d38a056329eb2d422f4f0d4151a605b52185e5231cfdb4014f4ee4bf4a",
          },
          producerRef: "storage.event-adapter",
          scopeRef: "ARTIFACT_EVENT",
          semanticOperationRef: "SCAN_UPLOAD",
          semanticTargetRef: "object.version.case-2026-04-23.0001",
          sourceRecordRef: "receipt.object-event.case-2026-04-23.0001",
          sourceRecordVersionHash:
            "7c8826fa57a655f3cca4f9454087ff2f8d21b8f85d1528c0d3dd7cb88c481e43",
          tenantId: "tenant.taxat-sandbox",
        },
        messageFamilyRef: "ARTIFACT_EVENT",
        packetId: "packet.artifact.case-2026-04-23.01",
        payload: {
          object_version_ref: "object.version.case-2026-04-23.0001",
          scan_policy_hash:
            "b20bc4d38a056329eb2d422f4f0d4151a605b52185e5231cfdb4014f4ee4bf4a",
        },
        payloadRefOrNull: "packet.artifact.case-2026-04-23.01",
        producedAt: "2026-04-23T09:10:00.000Z",
        producerRef: "storage.event-adapter",
        sourceRecordRef: "receipt.object-event.case-2026-04-23.0001",
        sourceRecordVersionHash:
          "7c8826fa57a655f3cca4f9454087ff2f8d21b8f85d1528c0d3dd7cb88c481e43",
      });
    case "AUTHORITY_REQUEST": {
      const authorityIdentity = buildAuthorityRequestIdentity({
        accessBindingHash:
          "ce0b340730dbe4c4c352f335f445f7e9597eec56e4ff9c37d32eb662f1abec8d",
        actingPartyRef: "party.operator.caseworker-17",
        attemptLineageManifestId: "manifest.case-2026-04-23",
        authorityBindingRef: "authority.binding.hmrc.sa-sandbox",
        authorityLinkRef: "authority.link.hmrc.sa-sandbox",
        authorityName: "HMRC",
        authorityProductProfile: "MTD_ITSA",
        authorityScope: "income-tax",
        bindingLineageRef: "binding.lineage.hmrc.sa.operator-17",
        body: {
          taxable_profit: "120000.55",
          tax_year: "2025-26",
        },
        businessPartitionRefs: ["period.2025-26"],
        clientId: "client.taxpayer-2001",
        headerProfileRefs: ["hmrc.fraud-prevention.v1", "hmrc.itsa.core.v1"],
        httpMethod: "POST",
        obligationRefOrNull: "obligation.hmrc.itsa.2025-26",
        operationFamily: "SUBMIT_RETURN",
        operationProfile: "ITSA_FINAL_DECLARATION",
        pathParams: {
          nino: "AB123456C",
        },
        policySnapshotHash:
          "3489c2f6f18ff4d1e0f84f8db92ab6688f7820b4c5da498cc6d1977d48f8e672",
        providerApiVersion: "2026-01",
        providerEnvironment: "sandbox",
        queryParams: {
          taxYear: "2025-26",
        },
        resourceTemplate: "/income-tax/income-tax-view-change/{nino}/self-employment",
        subjectRef: "subject.taxpayer-2001",
        tenantId: "tenant.taxat-sandbox",
        tokenBindingRef: "token.binding.hmrc.operator-17.v5",
      });

      return createEventEnvelope({
        authorityIdentityOrNull: authorityIdentity,
        channelRef: "channel.authority.transmit.dispatch",
        durableTruthStatement:
          "AuthorityRequestEnvelope and AuthorityInteractionRecord remain the durable send truth.",
        messageFamilyRef: "AUTHORITY_REQUEST",
        packetId: "packet.authority.case-2026-04-23.01",
        payload: {
          authority_request_envelope_ref: "authority.request.case-2026-04-23",
          request_hash: authorityIdentity.requestHash,
        },
        payloadRefOrNull: "authority.request.case-2026-04-23",
        producedAt: "2026-04-23T09:15:00.000Z",
        producerRef: "authority.gateway.dispatch",
        sourceRecordRef: "authority.request.case-2026-04-23",
        sourceRecordVersionHash:
          "41bfc3bc62994947f4fbab7f1b10a638e916b9e7d7436f9e2554afb318518a24",
      });
    }
    case "AUTHORITY_INGRESS":
      return createEventEnvelope({
        channelRef: "channel.authority.callback.ingress",
        durableTruthStatement:
          "AuthorityIngressReceipt remains the durable ingress checkpoint before normalization.",
        genericIdentityInput: {
          channelRef: "channel.authority.callback.ingress",
          consumerRef: "authority.ingress-normalizer",
          familyRef: "AuthorityIngressReceipt",
          payload: {
            authority_reference: "hmrc-submission-0001",
            canonical_ingress_receipt_ref: "ingress.receipt.hmrc.case-2026-04-23",
            provider_delivery_ref: "provider.delivery.hmrc-0001",
          },
          producerRef: "authority.callback-adapter",
          scopeRef: "AUTHORITY_INGRESS",
          semanticOperationRef: "NORMALIZE_INGRESS",
          semanticTargetRef: "ingress.receipt.hmrc.case-2026-04-23",
          sourceRecordRef: "ingress.receipt.hmrc.case-2026-04-23",
          sourceRecordVersionHash:
            "48f4e21c51d1b9f717b1ac4736bff73a4fa5f6ca7ad04dcaf6fe6696e8dfe70b",
          tenantId: "tenant.taxat-sandbox",
        },
        messageFamilyRef: "AUTHORITY_INGRESS",
        packetId: "packet.ingress.case-2026-04-23.01",
        payload: {
          authority_reference: "hmrc-submission-0001",
          canonical_ingress_receipt_ref: "ingress.receipt.hmrc.case-2026-04-23",
        },
        payloadRefOrNull: "ingress.receipt.hmrc.case-2026-04-23",
        producedAt: "2026-04-23T09:20:00.000Z",
        producerRef: "authority.callback-adapter",
        sourceRecordRef: "ingress.receipt.hmrc.case-2026-04-23",
        sourceRecordVersionHash:
          "48f4e21c51d1b9f717b1ac4736bff73a4fa5f6ca7ad04dcaf6fe6696e8dfe70b",
      });
  }
}

function laneCardsForFamily(
  family: EventEnvelopeCatalog["message_family_rows"][number],
  retryPolicy: RetryAndDeadLetterPolicy["policy_rows"][number],
) {
  return [
    {
      accessible_label: "Packet lane node PRODUCER durable source record",
      label: "Durable source record",
      lane_ref: "PRODUCER",
      overline: "PRODUCER",
      summary: `${family.source_record_family} is already persisted before any packet exists.`,
    },
    {
      accessible_label: "Packet lane node OUTBOX transactional outbox seal",
      label: "Transactional outbox seal",
      lane_ref: "OUTBOX",
      overline: "OUTBOX",
      summary: `${family.required_identity_fields.join(", ")} freeze on durable truth before publication.`,
    },
    {
      accessible_label: "Packet lane node BROKER transport packet handoff",
      label: "Transport packet handoff",
      lane_ref: "BROKER",
      overline: "BROKER",
      summary: family.transport_boundary,
    },
    {
      accessible_label: "Packet lane node INBOX durable inbox gate",
      label: "Durable inbox gate",
      lane_ref: "INBOX",
      overline: "INBOX",
      summary: `Consumer dedupe happens before mutation. Safe retries stop after ${retryPolicy.max_delivery_attempts} attempts.`,
    },
    {
      accessible_label: "Packet lane node LEDGER truth-side mutation or quarantine",
      label: "Truth-side mutation or quarantine",
      lane_ref: "LEDGER",
      overline: "LEDGER",
      summary: retryPolicy.terminal_posture,
    },
  ];
}

async function createAtlasPayload(): Promise<AtlasPayload> {
  const [catalogBuffer, scopeBuffer, retryBuffer, redactionBuffer] = await Promise.all([
    readFile(jsonPaths.eventEnvelopeCatalog),
    readFile(jsonPaths.idempotencyScopeMatrix),
    readFile(jsonPaths.retryAndDeadLetterPolicy),
    readFile(jsonPaths.messageRedactionPolicy),
  ]);
  const catalog = JSON.parse(catalogBuffer.toString("utf8")) as EventEnvelopeCatalog;
  const scopeMatrix = JSON.parse(scopeBuffer.toString("utf8")) as IdempotencyScopeMatrix;
  const retryPolicy = JSON.parse(retryBuffer.toString("utf8")) as RetryAndDeadLetterPolicy;
  const redactionPolicy = JSON.parse(redactionBuffer.toString("utf8")) as MessageRedactionPolicy;

  assertKeys("event_envelope_catalog", catalog as Record<string, unknown>, [
    "catalog_id",
    "basis_statement",
    "message_family_rows",
  ]);
  assertKeys("idempotency_scope_matrix", scopeMatrix as Record<string, unknown>, [
    "matrix_id",
    "basis_statement",
    "scope_rows",
  ]);
  assertKeys("retry_and_dead_letter_policy", retryPolicy as Record<string, unknown>, [
    "policy_id",
    "basis_statement",
    "policy_rows",
  ]);
  assertKeys("message_redaction_policy", redactionPolicy as Record<string, unknown>, [
    "policy_id",
    "basis_statement",
    "surface_rows",
  ]);

  const scopeRows = new Map(scopeMatrix.scope_rows.map((entry) => [entry.scope_ref, entry]));
  const retryRows = new Map(retryPolicy.policy_rows.map((entry) => [entry.family_ref, entry]));
  const redactionRows = new Map(
    catalog.message_family_rows.map((row) => [
      row.family_ref,
      redactionPolicy.surface_rows.filter((entry) => entry.applies_to_family_refs.includes(row.family_ref)),
    ]),
  );

  return {
    basisStatement: catalog.basis_statement,
    envelopeBadge: "PACKET V1",
    families: catalog.message_family_rows.map((family) => {
      const scope = scopeRows.get(family.duplicate_scope_ref);
      const retry = retryRows.get(family.family_ref);
      const redaction = redactionRows.get(family.family_ref) ?? [];

      if (!scope || !retry) {
        throw new Error(`Missing scope or retry row for ${family.family_ref}.`);
      }

      const exampleEnvelope = sampleEnvelope(family.family_ref);
      return {
        alerts: [
          {
            label: "Collision rule",
            text: scope.collision_rule,
          },
          {
            label: "Recovery posture",
            text: scope.recovery_posture,
          },
          {
            label: "Terminal posture",
            text: retry.terminal_posture,
          },
          {
            label: "Redrive gate",
            text: retry.redrive_gate,
          },
        ],
        channels: family.channel_refs,
        collisionRule: scope.collision_rule,
        displayName: family.display_name,
        duplicateScopeRef: family.duplicate_scope_ref,
        exampleIdentity: {
          duplicate_meaning_key: exampleEnvelope.identity.duplicateMeaningKey,
          idempotency_key: exampleEnvelope.identity.idempotencyKey,
          note:
            family.family_ref === "AUTHORITY_REQUEST"
              ? "Token rotation can change request_hash while leaving duplicate meaning and idempotency stable."
              : "A fresh packet id must not mint a fresh semantic meaning.",
          packet_id: exampleEnvelope.packetId,
          request_hash: exampleEnvelope.identity.requestHash,
          source_record_ref: exampleEnvelope.sourceRecordRef,
        },
        familyRef: family.family_ref,
        laneCards: laneCardsForFamily(family, retry),
        notes: [...family.notes, ...scope.notes],
        railLabel: family.rail_label,
        redactionSummary: redaction
          .map((entry) => `${entry.surface_ref}: ${entry.masking_posture}`)
          .join(" / "),
        retrySummary: `${retry.dead_letter_mode} after ${retry.max_delivery_attempts} safe attempts`,
        tone: familyTone(family.family_ref),
        truthAnchor: family.durable_truth_anchor,
      };
    }),
    generationBasis: {
      emittedAtBasis: "CONFIG_DRIVEN_STATIC_ATLAS",
      inputHashes: {
        event_envelope_catalog: sha256Hex(catalogBuffer),
        idempotency_scope_matrix: sha256Hex(scopeBuffer),
        message_redaction_policy: sha256Hex(redactionBuffer),
        retry_and_dead_letter_policy: sha256Hex(retryBuffer),
      },
    },
    lanes: [
      {
        label: "PRODUCER",
        lane_ref: "PRODUCER",
        summary: "Durable source truth is persisted before transport publication exists.",
      },
      {
        label: "OUTBOX",
        lane_ref: "OUTBOX",
        summary: "Exact identity freezes in a transactional outbox record.",
      },
      {
        label: "BROKER",
        lane_ref: "BROKER",
        summary: "Transport-only handoff. Packet ids are evidence, not truth.",
      },
      {
        label: "INBOX",
        lane_ref: "INBOX",
        summary: "Durable dedupe and continuity checks run before mutation.",
      },
      {
        label: "LEDGER",
        lane_ref: "LEDGER",
        summary: "Apply one mutation, or dead-letter and quarantine explicitly.",
      },
    ],
    routeId: "event-envelope-atlas",
    selectedFamilyRef: "AUTHORITY_REQUEST",
    selectedLaneRef: "INBOX",
    subtitle:
      "One packet lane for commands, worker tasks, artifact events, and authority traffic, with durable duplicate meaning and inbox truth ahead of any mutation.",
    title: "Taxat Event Envelope Atlas",
  };
}

async function emitAtlasPayload(payload: AtlasPayload) {
  await mkdir(path.dirname(atlasDataPath), { recursive: true });
  await writeFile(atlasDataPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function checkAtlasPayload(payload: AtlasPayload) {
  const existing = await readFile(atlasDataPath, "utf8");
  const expected = `${JSON.stringify(payload, null, 2)}\n`;
  if (existing !== expected) {
    throw new Error(`Out-of-sync generated file: ${path.relative(repoRoot, atlasDataPath)}`);
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const mode = args.has("--emit") ? "emit" : "check";
  const payload = await createAtlasPayload();

  if (mode === "emit") {
    await emitAtlasPayload(payload);
  } else {
    await checkAtlasPayload(payload);
  }

  console.log(
    `${mode === "emit" ? "wrote" : "verified"} event envelope atlas: ${payload.families.length} families`,
  );
  console.log(`atlas payload: ${path.relative(repoRoot, atlasDataPath)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  loadDeadLetterPolicyBundle,
  type DeadLetterResolutionClass,
} from "./dead_letter_classifier.ts";
import {
  loadQueuePolicyBundle,
  type QueueFamilyRef,
  type QueueOrderingScopeRef,
  type WorkerQueueCatalogRow,
} from "./order_domain_policy.ts";
import { loadQueueRetryPolicyBundle } from "./retry_scheduler.ts";

type AtlasStageRef = "OUTBOX" | "QUEUE" | "CLAIM" | "WORKER" | "INBOX" | "AUDIT";

type AtlasStage = {
  stageRef: AtlasStageRef;
  label: string;
  summary: string;
};

type AtlasNode = {
  accessibleLabel: string;
  detail: string;
  stageRef: AtlasStageRef;
  summary: string;
  title: string;
  tone: "danger" | "evergreen" | "indigo" | "bronze";
};

type AtlasFamily = {
  deadLetterPostureChip: string;
  displayName: string;
  familyRef: QueueFamilyRef;
  notes: string[];
  orderingScopeBadge: string;
  orderingScopeRef: QueueOrderingScopeRef;
  orderingSummary: string;
  producerFamilies: string[];
  queueRef: string;
  queueRoutingKey: string;
  railLabel: string;
  retryBudgetClass: string;
  retrySummary: string;
  stageNodes: AtlasNode[];
  workerClassRef: string;
};

type QueueFabricAtlasPayload = {
  basisStatement: string;
  deadLetterPostureChip: string;
  families: AtlasFamily[];
  payloadSafetyStatement: string;
  routeId: "queue-fabric-atlas";
  selectedFamilyRef: QueueFamilyRef;
  selectedStageRef: AtlasStageRef;
  stages: AtlasStage[];
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
  "queue-fabric-atlas",
  "data",
  "queue-fabric-atlas.json",
);

async function checkAtlasPayload(payload: unknown) {
  const expected = `${JSON.stringify(payload, null, 2)}\n`;
  const existing = await readFile(atlasDataPath, "utf8");
  if (existing !== expected) {
    throw new Error(`Out-of-sync generated file: ${path.relative(repoRoot, atlasDataPath)}`);
  }
}

async function emitAtlasPayload(payload: unknown) {
  await mkdir(path.dirname(atlasDataPath), { recursive: true });
  await writeFile(atlasDataPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function nodeTone(familyRef: QueueFamilyRef, stageRef: AtlasStageRef): AtlasNode["tone"] {
  if (stageRef === "QUEUE" || stageRef === "CLAIM") {
    return familyRef === "AUTHORITY_TRANSMIT" ? "bronze" : "indigo";
  }
  if (stageRef === "AUDIT") {
    return "evergreen";
  }
  if (stageRef === "WORKER" && familyRef === "AUTHORITY_TRANSMIT") {
    return "danger";
  }
  return familyRef === "STAGE_WORK" || familyRef === "PROJECTION_REFRESH" ? "indigo" : "evergreen";
}

function familyStageNodes(row: WorkerQueueCatalogRow): AtlasNode[] {
  const baseLabel = row.display_name.toLowerCase();
  return [
    {
      accessibleLabel: `${baseLabel} outbox packet references durable outbox truth and stays opaque`,
      detail:
        "Outbox publication stays coordinated with durable command or interaction state so transport never becomes the legal record.",
      stageRef: "OUTBOX",
      summary: "Transactional outbox emits only refs, hashes, and policy lineage.",
      title: "Outbox anchor",
      tone: nodeTone(row.queue_family_ref, "OUTBOX"),
    },
    {
      accessibleLabel:
        row.queue_family_ref === "AUTHORITY_TRANSMIT"
          ? "authority transmit queue packet references interaction record and uses resend legality queued unassessed"
          : `${baseLabel} queue packet references durable record and preserves one order domain only`,
      detail:
        row.queue_family_ref === "AUTHORITY_TRANSMIT"
          ? "Queued authority sends remain subordinate to persisted resend legality and must revalidate immediately before transmit."
          : "Queue transport keeps ordering local to one declared domain key and never serializes unrelated work globally.",
      stageRef: "QUEUE",
      summary: "Broker packets stay small, rebuildable, and never substitute for durable truth.",
      title: "Queue fabric",
      tone: nodeTone(row.queue_family_ref, "QUEUE"),
    },
    {
      accessibleLabel: `${baseLabel} claim lease fences stale workers with visibility timeout reclaim`,
      detail:
        "Claim fencing prevents a stale worker from acking or dead-lettering after visibility expiry and successor reclaim.",
      stageRef: "CLAIM",
      summary: "Leases are explicit, fenced, and reclaimable after timeout.",
      title: "Claim lease",
      tone: nodeTone(row.queue_family_ref, "CLAIM"),
    },
    {
      accessibleLabel:
        row.queue_family_ref === "AUTHORITY_TRANSMIT"
          ? "authority transmit worker revalidates binding lineage and send legality before side effects"
          : `${baseLabel} worker persists effect proof before ack`,
      detail:
        row.queue_family_ref === "AUTHORITY_TRANSMIT"
          ? "Authority workers fail closed on send-time revalidation drift and may recover only from persisted idempotent lineage."
          : "Workers persist effect proof or reconcile failure posture before ack so duplicate delivery remains safe.",
      stageRef: "WORKER",
      summary: "Consumers are idempotent and treat broker delivery as at-least-once transport.",
      title: "Worker execution",
      tone: nodeTone(row.queue_family_ref, "WORKER"),
    },
    {
      accessibleLabel: `${baseLabel} inbox gate deduplicates packet delivery before mutation`,
      detail:
        "Transactional inbox truth captures duplicate packet, duplicate meaning, and source continuity before any state transition.",
      stageRef: "INBOX",
      summary: "Inbox truth owns duplicate suppression and safe replay posture.",
      title: "Inbox gate",
      tone: nodeTone(row.queue_family_ref, "INBOX"),
    },
    {
      accessibleLabel: `${baseLabel} audit evidence links queue delay retry lineage and dead letter posture`,
      detail:
        "Audit evidence and telemetry explain backlog, redrive, and rebuild posture from persisted refs and reason codes rather than packet memory.",
      stageRef: "AUDIT",
      summary: "Append-only audit and metrics stay typed, correlated, and redaction-safe.",
      title: "Audit trail",
      tone: nodeTone(row.queue_family_ref, "AUDIT"),
    },
  ];
}

function deadLetterChip(resolutionClass: DeadLetterResolutionClass) {
  switch (resolutionClass) {
    case "SAFE_REPLAY_FROM_DURABLE_TRUTH":
      return "safe replay";
    case "RECONCILE_THEN_RETRY":
      return "reconcile then retry";
    case "REBUILD_FROM_DURABLE_TRUTH":
      return "rebuild then retry";
    case "OPERATOR_REVIEW_REQUIRED":
      return "operator review";
    case "TERMINAL_NO_RETRY":
      return "terminal";
  }
}

function retrySummary(row: WorkerQueueCatalogRow, budgetLabel: string) {
  if (row.queue_family_ref === "AUTHORITY_TRANSMIT") {
    return `${budgetLabel}: deterministic backoff only while send-time legality, binding lineage, and duplicate-bucket truth remain clear.`;
  }
  if (row.queue_family_ref === "PROJECTION_REFRESH" || row.queue_family_ref === "RECOVERY_JOB") {
    return `${budgetLabel}: rebuildable workers gate retry on fresh upstream truth rather than blind broker redrive.`;
  }
  return `${budgetLabel}: deterministic backoff with explicit dead-letter posture once budget or economic gate is exhausted.`;
}

function buildAtlasPayload(input: {
  deadLetterByFamily: Map<QueueFamilyRef, DeadLetterResolutionClass>;
  orderingSummaryByScope: Map<QueueOrderingScopeRef, string>;
  queueRows: WorkerQueueCatalogRow[];
  retrySummaryByClass: Map<string, string>;
}) {
  return {
    basisStatement:
      "Queue transport is rebuildable delivery fabric only. Durable outbox, inbox, interaction, and audit truth remain authoritative.",
    deadLetterPostureChip: "Dead letter is policy, not convention",
    families: input.queueRows.map((row) => ({
      deadLetterPostureChip: deadLetterChip(
        input.deadLetterByFamily.get(row.queue_family_ref) ?? "OPERATOR_REVIEW_REQUIRED",
      ),
      displayName: row.display_name,
      familyRef: row.queue_family_ref,
      notes: row.notes.slice(),
      orderingScopeBadge:
        row.ordering_scope_ref === "MANIFEST_STAGE_DOMAIN"
          ? "manifest ordered"
          : row.ordering_scope_ref === "AUTHORITY_TRANSMIT_DOMAIN"
            ? "authority ordered"
            : row.ordering_scope_ref === "AUTHORITY_RECONCILIATION_DOMAIN"
              ? "interaction ordered"
              : row.ordering_scope_ref === "PROJECTION_MANIFEST_DOMAIN"
                ? "projection ordered"
                : "recovery ordered",
      orderingScopeRef: row.ordering_scope_ref,
      orderingSummary: input.orderingSummaryByScope.get(row.ordering_scope_ref) ?? row.ordering_basis_statement,
      producerFamilies: row.lawful_producer_families.slice(),
      queueRef: row.queue_ref,
      queueRoutingKey: row.routing_key,
      railLabel: row.rail_label,
      retryBudgetClass: row.retry_budget_class,
      retrySummary: input.retrySummaryByClass.get(row.retry_budget_class) ?? row.retry_budget_class,
      stageNodes: familyStageNodes(row),
      workerClassRef: row.consumer_worker_class_ref,
    })),
    payloadSafetyStatement:
      "Packets render refs, hashes, routing keys, and policy lineage only. No declaration text, credential material, upload bytes, or authority tokens are shown anywhere in the atlas.",
    routeId: "queue-fabric-atlas",
    selectedFamilyRef: "AUTHORITY_TRANSMIT",
    selectedStageRef: "QUEUE",
    stages: [
      {
        stageRef: "OUTBOX",
        label: "OUTBOX",
        summary: "Durable command publication anchor.",
      },
      {
        stageRef: "QUEUE",
        label: "QUEUE",
        summary: "Disposable broker fabric.",
      },
      {
        stageRef: "CLAIM",
        label: "CLAIM",
        summary: "Lease and visibility fence.",
      },
      {
        stageRef: "WORKER",
        label: "WORKER",
        summary: "Idempotent consumer execution.",
      },
      {
        stageRef: "INBOX",
        label: "INBOX",
        summary: "Durable dedupe and effect proof.",
      },
      {
        stageRef: "AUDIT",
        label: "AUDIT",
        summary: "Typed lineage, delay, and redrive evidence.",
      },
    ],
    subtitle:
      "Dispatch loom for worker packets, retries, stale reclaim, and dead-letter posture across stage, authority, projection, and recovery families.",
    title: "Taxat Queue Fabric Atlas",
  } satisfies QueueFabricAtlasPayload;
}

export async function mainBuildQueueFabricAtlas() {
  const mode = new Set(process.argv.slice(2)).has("--emit") ? "emit" : "check";
  const [queueBundle, retryBundle, deadLetterBundle] = await Promise.all([
    loadQueuePolicyBundle({ reload: true }),
    loadQueueRetryPolicyBundle({ reload: true }),
    loadDeadLetterPolicyBundle({ reload: true }),
  ]);

  const orderingSummaryByScope = new Map(
    queueBundle.orderDomainScopeMatrix.ordering_scope_rows.map((row) => [
      row.ordering_scope_ref,
      `${row.scope_chip}: ${row.formula_statement}`,
    ]),
  );
  const retrySummaryByClass = new Map(
    retryBundle.retryBudgetMatrix.retry_budget_rows.map((row) => [
      row.retry_budget_class,
      retrySummary(
        queueBundle.workerQueueCatalog.queue_family_rows.find((familyRow) =>
          familyRow.retry_budget_class === row.retry_budget_class,
        )!,
        row.display_name,
      ),
    ]),
  );
  const deadLetterByFamily = new Map<QueueFamilyRef, DeadLetterResolutionClass>();
  for (const row of deadLetterBundle.deadLetterResolutionPolicy.resolution_rows) {
    for (const familyRef of row.queue_family_refs) {
      if (!deadLetterByFamily.has(familyRef)) {
        deadLetterByFamily.set(familyRef, row.resolution_class);
      }
    }
  }

  const payload = buildAtlasPayload({
    deadLetterByFamily,
    orderingSummaryByScope,
    queueRows: queueBundle.workerQueueCatalog.queue_family_rows,
    retrySummaryByClass,
  });

  if (mode === "emit") {
    await emitAtlasPayload(payload);
  } else {
    await checkAtlasPayload(payload);
  }

  console.log(`${mode === "emit" ? "wrote" : "verified"} queue fabric atlas`);
  console.log(`queue families: ${payload.families.length}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  mainBuildQueueFabricAtlas().catch((error) => {
    console.error(String(error));
    process.exitCode = 1;
  });
}

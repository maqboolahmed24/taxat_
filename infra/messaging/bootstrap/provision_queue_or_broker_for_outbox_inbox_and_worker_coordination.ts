import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MESSAGING_PROVIDER_ID = "message-coordination-fabric";
export const MESSAGING_FLOW_ID =
  "provision-queue-or-broker-for-outbox-inbox-and-worker-coordination";
export const MESSAGING_POLICY_VERSION = "1.0";
export const MESSAGING_LAST_VERIFIED_AT = "2026-04-18T18:55:00Z";

export type MessagingProviderFamily =
  | "AWS_SQS_FIFO"
  | "GCP_PUBSUB"
  | "AZURE_SERVICE_BUS"
  | "SELF_HOSTED_RABBITMQ_QUORUM";

export type MessagingSelectionStatus =
  | "PROVIDER_SELECTION_REQUIRED"
  | "PROVIDER_SELECTED";

export type MessagingManagedDefaultStatus =
  | "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION"
  | "READY_TO_ADOPT_PLATFORM_MESSAGING";

export type MessagingTopologyMode =
  "TRANSACTIONAL_OUTBOX_AND_AUTHENTICATED_DEDUPE_INBOX_REBUILDABLE_TRANSPORT_ONLY_BROKER";

export type ChannelOutboxMode =
  | "TRANSACTIONAL_OUTBOX_REQUIRED"
  | "NONE_EXTERNAL_SOURCE";

export type BrokerDeliveryClass =
  | "ORDERED_PARTITION_CHANNEL"
  | "UNORDERED_FANOUT_CHANNEL"
  | "AUTHENTICATED_CALLBACK_CHANNEL";

export type InboxMode =
  | "WORKER_EXECUTION_INBOX_REQUIRED"
  | "AUTHENTICATED_DEDUPE_INBOX_REQUIRED"
  | "DELIVERY_EVIDENCE_INBOX_REQUIRED"
  | "RESTORE_REBUILD_INBOX_REQUIRED";

export interface SourceRef {
  source_file: string;
  source_heading_or_logical_block: string;
  source_ref: string;
  rationale: string;
}

export interface ProviderOptionRow {
  provider_family: MessagingProviderFamily;
  selection_state:
    | "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION"
    | "SELF_HOST_DECISION_REQUIRED";
  provider_label: string;
  docs_urls: string[];
  delivery_summary: string;
  ordering_summary: string;
  retry_dead_letter_summary: string;
  dedupe_summary: string;
  notes: string[];
  source_refs: SourceRef[];
}

export interface EnvironmentMessagingRow {
  environment_ref: string;
  label: string;
  namespace_prefix: string;
  credential_namespace_ref: string;
  runtime_secret_alias_ref: string;
  admin_secret_alias_ref: string;
  provider_binding_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION";
  recovery_posture:
    | "FIXTURE_ONLY_NO_AUTHORITATIVE_RECOVERY"
    | "REBUILD_FROM_DURABLE_TRUTH_ONLY"
    | "RESTORE_DRILL_REBUILD_FROM_DURABLE_TRUTH_ONLY";
  source_refs: SourceRef[];
  notes: string[];
}

export interface ChannelFamilyRow {
  family_ref: string;
  label: string;
  center_lane_emphasis: string;
  description: string;
  source_refs: SourceRef[];
  notes: string[];
}

export interface ChannelMatrixRow {
  channel_ref: string;
  label: string;
  family_ref: string;
  outbox_mode: ChannelOutboxMode;
  outbox_ref_or_null: string | null;
  outbox_identity_fields: string[];
  broker_delivery_class: BrokerDeliveryClass;
  broker_entity_alias_template: string;
  inbox_mode: InboxMode;
  inbox_ref: string;
  consumer_binding_ref: string;
  payload_posture:
    | "OPAQUE_REFS_AND_BASIS_HASHES_ONLY"
    | "OPAQUE_REFS_PLUS_AUTH_METADATA_NO_SECRETS";
  ordering_policy_ref: string;
  retry_policy_ref: string;
  dedupe_policy_ref: string;
  rebuild_basis_refs: string[];
  truth_boundary_statement: string;
  source_refs: SourceRef[];
  notes: string[];
}

export interface OutboxInboxChannelMatrix {
  schema_version: "1.0";
  matrix_id: "messaging_outbox_inbox_channel_matrix";
  selection_status: MessagingSelectionStatus;
  managed_default_status: MessagingManagedDefaultStatus;
  topology_mode: MessagingTopologyMode;
  family_rows: ChannelFamilyRow[];
  channel_rows: ChannelMatrixRow[];
  source_refs: SourceRef[];
  typed_gaps: string[];
  notes: string[];
}

export interface RetryPolicyRow {
  policy_ref: string;
  label: string;
  channel_refs: string[];
  initial_backoff_seconds: number;
  max_backoff_seconds: number;
  max_delivery_attempts: number;
  dead_letter_mode:
    | "DEAD_LETTER_QUEUE_REQUIRED"
    | "DEAD_LETTER_TOPIC_REQUIRED"
    | "QUARANTINE_INBOX_REQUIRED"
    | "MANUAL_REVIEW_REQUIRED";
  poison_message_action: string;
  redrive_gate: string;
  source_refs: SourceRef[];
  notes: string[];
}

export interface RetryDeadLetterPolicy {
  schema_version: "1.0";
  policy_id: "messaging_retry_dead_letter_policy";
  selection_status: MessagingSelectionStatus;
  topology_mode: MessagingTopologyMode;
  policy_rows: RetryPolicyRow[];
  source_refs: SourceRef[];
  typed_gaps: string[];
  notes: string[];
}

export interface OrderingPolicyRow {
  policy_ref: string;
  label: string;
  channel_refs: string[];
  partition_key_fields: string[];
  strict_order_scope: string;
  concurrency_rule: string;
  backlog_hazard: string;
  source_refs: SourceRef[];
  notes: string[];
}

export interface OrderingAndPartitioningPolicy {
  schema_version: "1.0";
  policy_id: "messaging_ordering_and_partitioning_policy";
  selection_status: MessagingSelectionStatus;
  topology_mode: MessagingTopologyMode;
  policy_rows: OrderingPolicyRow[];
  source_refs: SourceRef[];
  typed_gaps: string[];
  notes: string[];
}

export interface DedupePolicyRow {
  policy_ref: string;
  label: string;
  channel_refs: string[];
  dedupe_key_fields: string[];
  window_posture: string;
  inbox_requirement: string;
  mutation_gate: string;
  replay_protection: string;
  source_refs: SourceRef[];
  notes: string[];
}

export interface IdempotencyAndDedupePolicy {
  schema_version: "1.0";
  policy_id: "messaging_idempotency_and_dedupe_policy";
  selection_status: MessagingSelectionStatus;
  topology_mode: MessagingTopologyMode;
  policy_rows: DedupePolicyRow[];
  source_refs: SourceRef[];
  typed_gaps: string[];
  notes: string[];
}

export interface MessagingInventoryTemplate {
  schema_version: "1.0";
  inventory_id: "messaging_inventory";
  provider_id: typeof MESSAGING_PROVIDER_ID;
  flow_id: typeof MESSAGING_FLOW_ID;
  policy_version: typeof MESSAGING_POLICY_VERSION;
  run_id: string;
  workspace_id: string;
  operator_identity_alias: string;
  selection_status: MessagingSelectionStatus;
  managed_default_status: MessagingManagedDefaultStatus;
  selected_provider_family_or_null: MessagingProviderFamily | null;
  topology_mode: MessagingTopologyMode;
  provider_option_rows: ProviderOptionRow[];
  environment_rows: EnvironmentMessagingRow[];
  channel_rows: ChannelMatrixRow[];
  outbox_inbox_channel_matrix_ref:
    "config/messaging/outbox_inbox_channel_matrix.json";
  retry_dead_letter_policy_ref:
    "config/messaging/retry_dead_letter_policy.json";
  ordering_and_partitioning_policy_ref:
    "config/messaging/ordering_and_partitioning_policy.json";
  idempotency_and_dedupe_policy_ref:
    "config/messaging/idempotency_and_dedupe_policy.json";
  source_refs: SourceRef[];
  typed_gaps: string[];
  notes: string[];
  last_verified_at: string;
}

export interface MessageFabricAtlasViewModel {
  routeId: "message-fabric-atlas";
  providerDisplayName: string;
  providerMonogram: string;
  selectionPosture: MessagingSelectionStatus;
  managedDefaultStatus: MessagingManagedDefaultStatus;
  recoveryChipLabel: string;
  topologyModeLabel: string;
  summary: string;
  notes: string[];
  environments: Array<{
    environment_ref: string;
    label: string;
    namespace_prefix: string;
    recovery_posture: string;
  }>;
  families: Array<{
    family_ref: string;
    label: string;
    center_lane_emphasis: string;
    description: string;
    channel_count: number;
    note: string;
  }>;
  channels: Array<{
    channel_ref: string;
    family_ref: string;
    label: string;
    outbox_mode: ChannelOutboxMode;
    outbox_ref_or_null: string | null;
    broker_delivery_class: BrokerDeliveryClass;
    broker_entity_alias_template: string;
    inbox_mode: InboxMode;
    inbox_ref: string;
    consumer_binding_ref: string;
    ordering_policy_ref: string;
    retry_policy_ref: string;
    dedupe_policy_ref: string;
    note: string;
  }>;
  orderingPolicies: Array<{
    policy_ref: string;
    label: string;
    partition_key_fields: string[];
    note: string;
  }>;
  retryPolicies: Array<{
    policy_ref: string;
    label: string;
    max_delivery_attempts: number;
    dead_letter_mode: string;
    note: string;
  }>;
  dedupePolicies: Array<{
    policy_ref: string;
    label: string;
    dedupe_key_fields: string[];
    note: string;
  }>;
  selectedEnvironmentRef: string;
  selectedFamilyRef: string;
  selectedChannelRef: string;
  selectedPolicyKind: "ordering" | "retry" | "dedupe";
}

export interface MinimalRunContext {
  runId: string;
  workspaceId: string;
  operatorIdentityAlias: string;
}

export interface ProvisionMessagingStep {
  step_id: string;
  title: string;
  status:
    | "SUCCEEDED"
    | "BLOCKED_BY_POLICY"
    | "SKIPPED_AS_ALREADY_PRESENT"
    | "BLOCKED_BY_DRIFT";
  reason: string;
}

export interface ProvisionMessagingResult {
  outcome:
    | "MESSAGING_TOPOLOGY_DECLARED_PROVIDER_SELECTION_REQUIRED"
    | "MESSAGING_TOPOLOGY_READY_FOR_PROVIDER_ADOPTION"
    | "MESSAGING_TOPOLOGY_DRIFT_REVIEW_REQUIRED";
  selection_status: MessagingSelectionStatus;
  inventory: MessagingInventoryTemplate;
  outboxInboxChannelMatrix: OutboxInboxChannelMatrix;
  retryDeadLetterPolicy: RetryDeadLetterPolicy;
  orderingAndPartitioningPolicy: OrderingAndPartitioningPolicy;
  idempotencyAndDedupePolicy: IdempotencyAndDedupePolicy;
  atlasViewModel: MessageFabricAtlasViewModel;
  steps: ProvisionMessagingStep[];
  notes: string[];
}

const docsUrls = {
  awsCreateQueue:
    "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_CreateQueue.html",
  awsOutageRecovery:
    "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/designing-for-outage-recovery-scenarios.html",
  awsDeadLetter:
    "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-configure-dead-letter-queue.html",
  gcpDeadLetter: "https://cloud.google.com/pubsub/docs/dead-letter-topics",
  gcpSubscriptionProperties:
    "https://cloud.google.com/pubsub/docs/subscription-properties",
  gcpOrdering: "https://cloud.google.com/pubsub/docs/ordering",
  gcpExactlyOnce:
    "https://docs.cloud.google.com/pubsub/docs/exactly-once-delivery",
  azureAdvanced:
    "https://learn.microsoft.com/en-us/azure/service-bus-messaging/advanced-features-overview",
  azureDuplicateDetection:
    "https://learn.microsoft.com/en-us/azure/service-bus-messaging/duplicate-detection",
  azureSessions:
    "https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-sessions",
  azurePartitioning:
    "https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-partitioning",
  rabbitmqQuorum: "https://www.rabbitmq.com/docs/quorum-queues",
  rabbitmqDlq: "https://www.rabbitmq.com/docs/next/dlx",
  rabbitmqConsumerAcks: "https://www.rabbitmq.com/docs/confirms",
} as const;

const sourceRefs: SourceRef[] = [
  {
    source_file: "docs/architecture/adr/ADR-002-storage-and-eventing-topology.md",
    source_heading_or_logical_block: "Decision",
    source_ref: "docs/architecture/adr/ADR-002-storage-and-eventing-topology.md::Decision",
    rationale:
      "ADR-002 fixed the broker as a transport-only fabric fed by transactional outbox and inbox receipts, explicitly rebuildable from durable truth.",
  },
  {
    source_file: "Algorithm/deployment_and_resilience_contract.md",
    source_heading_or_logical_block: "1. Reference runtime topology",
    source_ref:
      "Algorithm/deployment_and_resilience_contract.md::L26[1._Reference_runtime_topology]",
    rationale:
      "The runtime topology names a queue or broker for outbox and worker coordination while forbidding it from becoming legal truth.",
  },
  {
    source_file: "Algorithm/deployment_and_resilience_contract.md",
    source_heading_or_logical_block: "5. Backup, restore, and DR rules",
    source_ref:
      "Algorithm/deployment_and_resilience_contract.md::L155[5._Backup_restore_and_DR_rules]",
    rationale:
      "Queue backlog rebuild must come from durable outbox, inbox, interaction, workflow, and audit truth rather than broker history.",
  },
  {
    source_file: "Algorithm/security_and_runtime_hardening_contract.md",
    source_heading_or_logical_block: "3. Secret, key, and token handling",
    source_ref:
      "Algorithm/security_and_runtime_hardening_contract.md::L55[3._Secret_key_and_token_handling]",
    rationale:
      "Outbox messages, queues, read models, and general logs may only carry opaque refs and basis hashes, never raw tokens or secrets.",
  },
  {
    source_file: "Algorithm/security_and_runtime_hardening_contract.md",
    source_heading_or_logical_block:
      "5. Service-to-service and network hardening",
    source_ref:
      "Algorithm/security_and_runtime_hardening_contract.md::L99[5._Service-to-service_and_network_hardening]",
    rationale:
      "Inbound callbacks and worker results must enter through authenticated transactional inbox and dedupe layers before any state transition.",
  },
  {
    source_file: "Algorithm/authority_interaction_protocol.md",
    source_heading_or_logical_block:
      "9.4 Request identity, idempotency, and ingress proof",
    source_ref:
      "Algorithm/authority_interaction_protocol.md::L123[9.4_Request_identity_idempotency_and_ingress_proof]",
    rationale:
      "Authority callbacks and recovery reads must preserve request lineage, canonical ingress receipts, and duplicate suppression before mutation.",
  },
  {
    source_file: "data/analysis/dependency_register.json",
    source_heading_or_logical_block:
      "QUEUE_OR_BROKER_COORDINATION_FABRIC dependency row",
    source_ref:
      "data/analysis/dependency_register.json::QUEUE_OR_BROKER_COORDINATION_FABRIC",
    rationale:
      "The dependency register marks the broker as MVP-required but still unresolved as a procurement or platform choice.",
  },
  {
    source_file: "config/object_storage/event_notification_contract.json",
    source_heading_or_logical_block: "route rows",
    source_ref: "config/object_storage/event_notification_contract.json::route_rows",
    rationale:
      "Object-store notifications already freeze logical channel names for scan, validation, evidence binding, preview, export, quarantine, retention, and restore flows.",
  },
  {
    source_file: "config/notifications/email_webhook_endpoint_contract.json",
    source_heading_or_logical_block: "truth boundary statement",
    source_ref:
      "config/notifications/email_webhook_endpoint_contract.json::truth_boundary_statement",
    rationale:
      "Delivery callbacks remain evidence-only transport inputs and must not upgrade workflow truth directly.",
  },
  {
    source_file: "Algorithm/nightly_autopilot_contract.md",
    source_heading_or_logical_block: "scheduler identity contract",
    source_ref:
      "Algorithm/nightly_autopilot_contract.md::L73[scheduler_dedupe_key]",
    rationale:
      "Scheduler and retry work must preserve durable dedupe tuples rather than deriving legality from worker-local retry memory.",
  },
];

const source_refs = sourceRefs;

const topologyMode: MessagingTopologyMode =
  "TRANSACTIONAL_OUTBOX_AND_AUTHENTICATED_DEDUPE_INBOX_REBUILDABLE_TRANSPORT_ONLY_BROKER";

const providerOptionRows: ProviderOptionRow[] = [
  {
    provider_family: "AWS_SQS_FIFO",
    selection_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    provider_label: "Amazon SQS FIFO",
    docs_urls: [
      docsUrls.awsCreateQueue,
      docsUrls.awsOutageRecovery,
      docsUrls.awsDeadLetter,
    ],
    delivery_summary:
      "FIFO queues provide ordered processing per message group, visibility timeout controls, and explicit DLQ redrive settings.",
    ordering_summary:
      "Strict ordering is bounded to MessageGroupId rather than the whole queue, so durable partition keys still need to be designed deliberately.",
    retry_dead_letter_summary:
      "Retries depend on visibility timeout and maxReceiveCount. Dead-letter queues must match source queue type.",
    dedupe_summary:
      "Broker-side dedupe is bounded to the FIFO deduplication window and cannot replace durable idempotency ledgers.",
    notes: [
      "Fits the queue-first variant cleanly, but the five-minute deduplication window is insufficient for Taxat truth guarantees by itself.",
    ],
    source_refs,
  },
  {
    provider_family: "GCP_PUBSUB",
    selection_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    provider_label: "Google Cloud Pub/Sub",
    docs_urls: [
      docsUrls.gcpDeadLetter,
      docsUrls.gcpSubscriptionProperties,
      docsUrls.gcpOrdering,
      docsUrls.gcpExactlyOnce,
    ],
    delivery_summary:
      "Topic plus subscription posture provides push or pull delivery with configurable retry and dead-letter topics.",
    ordering_summary:
      "Ordering keys give per-key order, but dead-letter forwarding is best effort and ordering across keys is not guaranteed.",
    retry_dead_letter_summary:
      "Retry can be immediate or exponential. Dead-lettering is subscription-scoped with configurable delivery-attempt bounds.",
    dedupe_summary:
      "Exactly-once delivery exists only within constrained regional semantics and still does not replace durable application-side idempotency.",
    notes: [
      "This option matches topic-plus-subscription fanout well, but application truth still has to live in outbox and inbox ledgers.",
    ],
    source_refs,
  },
  {
    provider_family: "AZURE_SERVICE_BUS",
    selection_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    provider_label: "Azure Service Bus",
    docs_urls: [
      docsUrls.azureAdvanced,
      docsUrls.azureDuplicateDetection,
      docsUrls.azureSessions,
      docsUrls.azurePartitioning,
    ],
    delivery_summary:
      "Queues and topics support sessions, built-in DLQs, duplicate detection windows, and partition-aware routing.",
    ordering_summary:
      "Sessions provide ordered processing for related sequences, while partitioning and session identity must remain aligned.",
    retry_dead_letter_summary:
      "Poison or expired messages move into the DLQ, and retry semantics stay broker-managed only for transport, not truth.",
    dedupe_summary:
      "Duplicate detection is windowed and sender-controlled via MessageId, so durable replay protection still needs an inbox ledger.",
    notes: [
      "Sessions make the authority and upload ordering cases attractive, but provider choice is still deferred.",
    ],
    source_refs,
  },
  {
    provider_family: "SELF_HOSTED_RABBITMQ_QUORUM",
    selection_state: "SELF_HOST_DECISION_REQUIRED",
    provider_label: "Self-hosted RabbitMQ quorum queues",
    docs_urls: [
      docsUrls.rabbitmqQuorum,
      docsUrls.rabbitmqDlq,
      docsUrls.rabbitmqConsumerAcks,
    ],
    delivery_summary:
      "Quorum queues provide replicated queue state, consumer acknowledgements, publisher confirms, and safer dead lettering.",
    ordering_summary:
      "Ordering is queue-local and applications still need explicit partition topology rather than one global ordered queue.",
    retry_dead_letter_summary:
      "At-least-once dead lettering requires quorum queues and still permits duplicates at the target, so durable dedupe remains mandatory.",
    dedupe_summary:
      "Broker confirms and acknowledgements help transport safety but do not create durable application idempotency.",
    notes: [
      "Self-host is lawful only with explicit ownership for upgrades, quorum health, dead-letter monitoring, and encryption posture.",
    ],
    source_refs,
  },
];

const environmentRows: EnvironmentMessagingRow[] = [
  {
    environment_ref: "env_local_provisioning_workstation",
    label: "Local provisioning workstation",
    namespace_prefix: "taxat-local-msg",
    credential_namespace_ref: "sec_local_provisioning_sandbox",
    runtime_secret_alias_ref: "messaging/runtime-client/local",
    admin_secret_alias_ref: "messaging/admin-bootstrap/local",
    provider_binding_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    recovery_posture: "FIXTURE_ONLY_NO_AUTHORITATIVE_RECOVERY",
    source_refs,
    notes: [
      "Local queues are fixture-only and exist for deterministic dry runs, smoke tests, and atlas payload verification.",
    ],
  },
  {
    environment_ref: "env_shared_sandbox_integration",
    label: "Shared sandbox integration",
    namespace_prefix: "taxat-sbx-msg",
    credential_namespace_ref: "sec_sandbox_runtime",
    runtime_secret_alias_ref: "messaging/runtime-client/sandbox",
    admin_secret_alias_ref: "messaging/admin-bootstrap/sandbox",
    provider_binding_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    recovery_posture: "REBUILD_FROM_DURABLE_TRUTH_ONLY",
    source_refs,
    notes: [
      "Sandbox uses the same transport law as production, but queue identities remain isolated from preproduction and production.",
    ],
  },
  {
    environment_ref: "env_preproduction_verification",
    label: "Preproduction verification",
    namespace_prefix: "taxat-pre-msg",
    credential_namespace_ref: "sec_preprod_runtime",
    runtime_secret_alias_ref: "messaging/runtime-client/preprod",
    admin_secret_alias_ref: "messaging/admin-bootstrap/preprod",
    provider_binding_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    recovery_posture: "REBUILD_FROM_DURABLE_TRUTH_ONLY",
    source_refs,
    notes: [
      "Preproduction must prove broker rebuild, DLQ handling, and callback-ingress dedupe before any promotion claim is lawful.",
    ],
  },
  {
    environment_ref: "env_production",
    label: "Production",
    namespace_prefix: "taxat-prod-msg",
    credential_namespace_ref: "sec_production_runtime",
    runtime_secret_alias_ref: "messaging/runtime-client/production",
    admin_secret_alias_ref: "messaging/admin-bootstrap/production",
    provider_binding_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    recovery_posture: "REBUILD_FROM_DURABLE_TRUTH_ONLY",
    source_refs,
    notes: [
      "Production broker credentials remain runtime-scoped and cannot cross into sandbox, preproduction, or restore namespaces.",
    ],
  },
  {
    environment_ref: "env_disaster_recovery_drill",
    label: "Disaster recovery drill",
    namespace_prefix: "taxat-drill-msg",
    credential_namespace_ref: "sec_restore_drill_runtime",
    runtime_secret_alias_ref: "messaging/runtime-client/drill",
    admin_secret_alias_ref: "messaging/admin-bootstrap/drill",
    provider_binding_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    recovery_posture: "RESTORE_DRILL_REBUILD_FROM_DURABLE_TRUTH_ONLY",
    source_refs,
    notes: [
      "Restore drills prove queue rebuild from durable truth only; they do not copy production backlog or treat broker snapshots as legal history.",
    ],
  },
];

const familyRows: ChannelFamilyRow[] = [
  {
    family_ref: "family.stage_orchestrator_and_workers",
    label: "Stage Orchestrator / Workers",
    center_lane_emphasis: "Manifest stage dispatch and worker claims",
    description:
      "Durable stage receipts publish transport work without allowing the broker to become manifest truth.",
    source_refs,
    notes: [
      "A broker gap may slow dispatch, but it must not create a second legal source of stage ownership or status.",
    ],
  },
  {
    family_ref: "family.upload_and_evidence_processing",
    label: "Upload / Evidence Processing",
    center_lane_emphasis: "Artifact processing and preview registration",
    description:
      "Object-change routes become durable work only after immutable refs, request lineage, and scan posture are frozen.",
    source_refs,
    notes: [
      "Object store notifications are already logical channels from pc_0051; this family binds them to one broker fabric without changing their truth boundary.",
    ],
  },
  {
    family_ref: "family.authority_send_and_ingress",
    label: "Authority Send / Ingress",
    center_lane_emphasis: "Outbound authority work and authenticated callback ingress",
    description:
      "Authority send, poll, callback, and response normalization all remain request-lineage-bound and ingress-receipt-first.",
    source_refs,
    notes: [
      "Authority/provider callbacks enter an authenticated dedupe inbox before any legal-state mutation or settlement update.",
    ],
  },
  {
    family_ref: "family.external_delivery_and_governance",
    label: "External Delivery / Governance",
    center_lane_emphasis: "Notifications, exports, and retention evidence",
    description:
      "Delivery and governance channels append evidence, counters, or attestations without becoming workflow truth.",
    source_refs,
    notes: [
      "Notification and export channels remain observational or attestational unless a durable command or state row already authorized the change.",
    ],
  },
  {
    family_ref: "family.restore_and_rebuild",
    label: "Restore / Rebuild",
    center_lane_emphasis: "Archive indexing and queue reconstruction",
    description:
      "Restore work rebuilds broker state from outbox, inbox, workflow, and audit truth only.",
    source_refs,
    notes: [
      "This family exists to make queue-loss and restore-law posture explicit rather than implicit runbook prose.",
    ],
  },
];

const channelRows: ChannelMatrixRow[] = [
  {
    channel_ref: "channel.manifest.stage.dispatch",
    label: "Manifest stage dispatch",
    family_ref: "family.stage_orchestrator_and_workers",
    outbox_mode: "TRANSACTIONAL_OUTBOX_REQUIRED",
    outbox_ref_or_null: "control_async.manifest_command_outbox",
    outbox_identity_fields: ["tenant_id", "manifest_ref", "stage_code", "command_receipt_ref"],
    broker_delivery_class: "ORDERED_PARTITION_CHANNEL",
    broker_entity_alias_template: "{namespace_prefix}.manifest-stage-dispatch",
    inbox_mode: "WORKER_EXECUTION_INBOX_REQUIRED",
    inbox_ref: "control_async.worker_execution_inbox",
    consumer_binding_ref: "worker.stage-runner",
    payload_posture: "OPAQUE_REFS_AND_BASIS_HASHES_ONLY",
    ordering_policy_ref: "ordering.manifest_ref_fifo",
    retry_policy_ref: "retry.worker_dispatch",
    dedupe_policy_ref: "dedupe.command_receipt_and_manifest",
    rebuild_basis_refs: ["RunManifest", "ManifestStageRecord", "CommandReceipt"],
    truth_boundary_statement:
      "Broker messages are transport copies of durable stage receipts only. Queue loss may delay worker pickup but cannot invent or erase stage truth.",
    source_refs,
    notes: [
      "Workers claim stage work from inbox mirrors keyed by manifest and stage, not from broker-local ownership.",
    ],
  },
  {
    channel_ref: "channel.upload.scan.request",
    label: "Upload scan request",
    family_ref: "family.upload_and_evidence_processing",
    outbox_mode: "TRANSACTIONAL_OUTBOX_REQUIRED",
    outbox_ref_or_null: "control_async.storage_event_outbox",
    outbox_identity_fields: ["tenant_id", "upload_session_id", "object_version_ref", "event_id_or_sequencer"],
    broker_delivery_class: "ORDERED_PARTITION_CHANNEL",
    broker_entity_alias_template: "{namespace_prefix}.upload-scan-request",
    inbox_mode: "WORKER_EXECUTION_INBOX_REQUIRED",
    inbox_ref: "control_async.artifact_processing_inbox",
    consumer_binding_ref: "worker.malware-scan-orchestrator",
    payload_posture: "OPAQUE_REFS_AND_BASIS_HASHES_ONLY",
    ordering_policy_ref: "ordering.upload_session_fifo",
    retry_policy_ref: "retry.document_artifact_processing",
    dedupe_policy_ref: "dedupe.object_version_and_event",
    rebuild_basis_refs: ["UploadSession", "EvidenceItem", "ImmutableObjectRef"],
    truth_boundary_statement:
      "The broker coordinates scan work against immutable upload refs. Acceptance, preview, and attachment truth still live in control records.",
    source_refs,
    notes: [
      "This channel binds the logical route already frozen in object-storage notifications to one durable inbox/outbox contract.",
    ],
  },
  {
    channel_ref: "channel.upload.validation.recheck",
    label: "Upload validation recheck",
    family_ref: "family.upload_and_evidence_processing",
    outbox_mode: "TRANSACTIONAL_OUTBOX_REQUIRED",
    outbox_ref_or_null: "control_async.storage_event_outbox",
    outbox_identity_fields: ["tenant_id", "upload_session_id", "object_version_ref", "metageneration_or_etag"],
    broker_delivery_class: "ORDERED_PARTITION_CHANNEL",
    broker_entity_alias_template: "{namespace_prefix}.upload-validation-recheck",
    inbox_mode: "WORKER_EXECUTION_INBOX_REQUIRED",
    inbox_ref: "control_async.artifact_processing_inbox",
    consumer_binding_ref: "worker.upload-validation-rechecker",
    payload_posture: "OPAQUE_REFS_AND_BASIS_HASHES_ONLY",
    ordering_policy_ref: "ordering.upload_session_fifo",
    retry_policy_ref: "retry.document_artifact_processing",
    dedupe_policy_ref: "dedupe.object_version_and_event",
    rebuild_basis_refs: ["UploadSession", "UploadRequestBinding", "ImmutableObjectRef"],
    truth_boundary_statement:
      "Validation refresh is a durable follow-up to frozen upload lineage, not a mutable interpretation of object metadata alone.",
    source_refs,
    notes: [
      "Metadata changes may trigger rechecks, but broker redelivery cannot widen upload legality or customer-visible success posture.",
    ],
  },
  {
    channel_ref: "channel.evidence.manifest.binding",
    label: "Evidence manifest binding",
    family_ref: "family.upload_and_evidence_processing",
    outbox_mode: "TRANSACTIONAL_OUTBOX_REQUIRED",
    outbox_ref_or_null: "control_async.storage_event_outbox",
    outbox_identity_fields: ["tenant_id", "manifest_ref", "evidence_item_ref", "object_version_ref"],
    broker_delivery_class: "ORDERED_PARTITION_CHANNEL",
    broker_entity_alias_template: "{namespace_prefix}.evidence-manifest-binding",
    inbox_mode: "WORKER_EXECUTION_INBOX_REQUIRED",
    inbox_ref: "control_async.artifact_processing_inbox",
    consumer_binding_ref: "worker.evidence-binding",
    payload_posture: "OPAQUE_REFS_AND_BASIS_HASHES_ONLY",
    ordering_policy_ref: "ordering.manifest_ref_fifo",
    retry_policy_ref: "retry.document_artifact_processing",
    dedupe_policy_ref: "dedupe.object_version_and_event",
    rebuild_basis_refs: ["EvidenceItem", "RunManifest", "ImmutableObjectRef"],
    truth_boundary_statement:
      "Manifest binding updates durable metadata only after immutable evidence refs exist; bucket listing or broker position never becomes the source of currentness.",
    source_refs,
    notes: [
      "Binding work must remain idempotent across repeated storage events and queue redelivery.",
    ],
  },
  {
    channel_ref: "channel.preview.registration",
    label: "Preview registration",
    family_ref: "family.upload_and_evidence_processing",
    outbox_mode: "TRANSACTIONAL_OUTBOX_REQUIRED",
    outbox_ref_or_null: "control_async.storage_event_outbox",
    outbox_identity_fields: ["tenant_id", "artifact_version_ref", "preview_variant_ref", "event_id_or_sequencer"],
    broker_delivery_class: "ORDERED_PARTITION_CHANNEL",
    broker_entity_alias_template: "{namespace_prefix}.preview-registration",
    inbox_mode: "WORKER_EXECUTION_INBOX_REQUIRED",
    inbox_ref: "control_async.artifact_processing_inbox",
    consumer_binding_ref: "worker.preview-registration",
    payload_posture: "OPAQUE_REFS_AND_BASIS_HASHES_ONLY",
    ordering_policy_ref: "ordering.upload_session_fifo",
    retry_policy_ref: "retry.document_artifact_processing",
    dedupe_policy_ref: "dedupe.object_version_and_event",
    rebuild_basis_refs: ["EvidenceItem", "CustomerSafeProjection", "ImmutableObjectRef"],
    truth_boundary_statement:
      "Preview availability remains a derived registration. Transport success cannot redefine evidence availability, masking, or limitation posture.",
    source_refs,
    notes: [
      "The derived preview can be rebuilt from retained evidence and durable projection rules if the broker is lost.",
    ],
  },
  {
    channel_ref: "channel.authority.transmit.dispatch",
    label: "Authority transmit dispatch",
    family_ref: "family.authority_send_and_ingress",
    outbox_mode: "TRANSACTIONAL_OUTBOX_REQUIRED",
    outbox_ref_or_null: "control_async.authority_send_outbox",
    outbox_identity_fields: ["tenant_id", "authority_interaction_ref", "request_hash", "idempotency_key"],
    broker_delivery_class: "ORDERED_PARTITION_CHANNEL",
    broker_entity_alias_template: "{namespace_prefix}.authority-transmit-dispatch",
    inbox_mode: "WORKER_EXECUTION_INBOX_REQUIRED",
    inbox_ref: "control_async.authority_execution_inbox",
    consumer_binding_ref: "worker.authority-send",
    payload_posture: "OPAQUE_REFS_PLUS_AUTH_METADATA_NO_SECRETS",
    ordering_policy_ref: "ordering.authority_interaction_fifo",
    retry_policy_ref: "retry.authority_send",
    dedupe_policy_ref: "dedupe.authority_request_identity",
    rebuild_basis_refs: ["AuthorityInteractionRecord", "SubmissionRecord", "AuthorityIngressReceipt"],
    truth_boundary_statement:
      "A queued authority send remains a transport instruction derived from persisted request lineage, binding state, and token metadata. The broker never becomes the authority timeline.",
    source_refs,
    notes: [
      "Any redrive must recheck token lineage, client binding, and send legality immediately before transmission.",
    ],
  },
  {
    channel_ref: "channel.authority.reconciliation.poll",
    label: "Authority reconciliation poll",
    family_ref: "family.authority_send_and_ingress",
    outbox_mode: "TRANSACTIONAL_OUTBOX_REQUIRED",
    outbox_ref_or_null: "control_async.authority_send_outbox",
    outbox_identity_fields: ["tenant_id", "authority_interaction_ref", "canonical_ingress_receipt_ref", "poll_window_ref"],
    broker_delivery_class: "ORDERED_PARTITION_CHANNEL",
    broker_entity_alias_template: "{namespace_prefix}.authority-reconciliation-poll",
    inbox_mode: "WORKER_EXECUTION_INBOX_REQUIRED",
    inbox_ref: "control_async.authority_execution_inbox",
    consumer_binding_ref: "worker.authority-reconciliation",
    payload_posture: "OPAQUE_REFS_PLUS_AUTH_METADATA_NO_SECRETS",
    ordering_policy_ref: "ordering.authority_interaction_fifo",
    retry_policy_ref: "retry.authority_send",
    dedupe_policy_ref: "dedupe.authority_request_identity",
    rebuild_basis_refs: ["AuthorityInteractionRecord", "SubmissionRecord", "ReconciliationControlContract"],
    truth_boundary_statement:
      "Reconciliation cadence is durable control truth. Worker-local retry memory or broker jitter must not redefine it during recovery.",
    source_refs,
    notes: [
      "Recovery resumes from persisted reconciliation control contracts, not from transport logs or consumer-local retry counters.",
    ],
  },
  {
    channel_ref: "channel.authority.callback.ingress",
    label: "Authority callback ingress",
    family_ref: "family.authority_send_and_ingress",
    outbox_mode: "NONE_EXTERNAL_SOURCE",
    outbox_ref_or_null: null,
    outbox_identity_fields: [],
    broker_delivery_class: "AUTHENTICATED_CALLBACK_CHANNEL",
    broker_entity_alias_template: "{namespace_prefix}.authority-callback-ingress",
    inbox_mode: "AUTHENTICATED_DEDUPE_INBOX_REQUIRED",
    inbox_ref: "control_async.authority_ingress_inbox",
    consumer_binding_ref: "worker.authority-ingress-normalizer",
    payload_posture: "OPAQUE_REFS_PLUS_AUTH_METADATA_NO_SECRETS",
    ordering_policy_ref: "ordering.authority_ingress_delivery",
    retry_policy_ref: "retry.authority_callback_normalization",
    dedupe_policy_ref: "dedupe.authority_delivery_identity",
    rebuild_basis_refs: ["AuthorityIngressReceipt", "AuthorityInteractionRecord", "AuthorityIngressProof"],
    truth_boundary_statement:
      "Provider callbacks enter an authenticated dedupe inbox before legal-state mutation. Duplicate suppression, request-lineage proof, and quarantine happen before normalization or state change.",
    source_refs,
    notes: [
      "This row intentionally has no outbox. The external provider edge authenticates and checkpoints into the inbox boundary first.",
    ],
  },
  {
    channel_ref: "channel.authority.payload.normalization",
    label: "Authority payload normalization",
    family_ref: "family.authority_send_and_ingress",
    outbox_mode: "TRANSACTIONAL_OUTBOX_REQUIRED",
    outbox_ref_or_null: "control_async.storage_event_outbox",
    outbox_identity_fields: ["authority_profile_ref", "payload_body_ref", "canonical_ingress_receipt_ref", "event_id_or_sequencer"],
    broker_delivery_class: "ORDERED_PARTITION_CHANNEL",
    broker_entity_alias_template: "{namespace_prefix}.authority-payload-normalization",
    inbox_mode: "AUTHENTICATED_DEDUPE_INBOX_REQUIRED",
    inbox_ref: "control_async.authority_ingress_inbox",
    consumer_binding_ref: "worker.authority-response-normalizer",
    payload_posture: "OPAQUE_REFS_PLUS_AUTH_METADATA_NO_SECRETS",
    ordering_policy_ref: "ordering.authority_ingress_delivery",
    retry_policy_ref: "retry.authority_callback_normalization",
    dedupe_policy_ref: "dedupe.authority_delivery_identity",
    rebuild_basis_refs: ["AuthorityIngressReceipt", "AuthorityResponseEnvelope", "ImmutableObjectRef"],
    truth_boundary_statement:
      "Normalized responses derive from authenticated ingress receipts and immutable payload refs. Storage finalization and broker delivery alone cannot create authority truth.",
    source_refs,
    notes: [
      "This row bridges immutable payload storage to the same dedupe inbox used for direct callbacks and recovery payloads.",
    ],
  },
  {
    channel_ref: "channel.notification.transactional.send",
    label: "Transactional notification send",
    family_ref: "family.external_delivery_and_governance",
    outbox_mode: "TRANSACTIONAL_OUTBOX_REQUIRED",
    outbox_ref_or_null: "control_async.notification_outbox",
    outbox_identity_fields: ["tenant_id", "notification_ref", "delivery_binding_hash", "template_family_ref"],
    broker_delivery_class: "UNORDERED_FANOUT_CHANNEL",
    broker_entity_alias_template: "{namespace_prefix}.notification-transactional-send",
    inbox_mode: "DELIVERY_EVIDENCE_INBOX_REQUIRED",
    inbox_ref: "control_async.notification_delivery_inbox",
    consumer_binding_ref: "worker.notification-delivery",
    payload_posture: "OPAQUE_REFS_AND_BASIS_HASHES_ONLY",
    ordering_policy_ref: "ordering.delivery_binding_partition",
    retry_policy_ref: "retry.external_delivery_attestation",
    dedupe_policy_ref: "dedupe.delivery_binding",
    rebuild_basis_refs: ["NotificationRecord", "DeliveryBinding", "NotificationEvidence"],
    truth_boundary_statement:
      "Provider delivery status appends notification evidence only. It never becomes work-item, help-request, or authority truth.",
    source_refs,
    notes: [
      "The broker may fan out transactional notifications, but the durable delivery binding still governs audience, masking, and retry posture.",
    ],
  },
  {
    channel_ref: "channel.export.delivery.attestation",
    label: "Masked export delivery attestation",
    family_ref: "family.external_delivery_and_governance",
    outbox_mode: "TRANSACTIONAL_OUTBOX_REQUIRED",
    outbox_ref_or_null: "control_async.export_outbox",
    outbox_identity_fields: ["tenant_id", "export_version_ref", "delivery_binding_hash", "masking_posture"],
    broker_delivery_class: "UNORDERED_FANOUT_CHANNEL",
    broker_entity_alias_template: "{namespace_prefix}.export-delivery-attestation",
    inbox_mode: "DELIVERY_EVIDENCE_INBOX_REQUIRED",
    inbox_ref: "control_async.delivery_evidence_inbox",
    consumer_binding_ref: "worker.export-attestation",
    payload_posture: "OPAQUE_REFS_AND_BASIS_HASHES_ONLY",
    ordering_policy_ref: "ordering.delivery_binding_partition",
    retry_policy_ref: "retry.external_delivery_attestation",
    dedupe_policy_ref: "dedupe.delivery_binding",
    rebuild_basis_refs: ["ExportRecord", "DeliveryBinding", "AuditEvent"],
    truth_boundary_statement:
      "Export delivery attestations append evidence and counters only. They do not widen audience or alter the underlying export authorization.",
    source_refs,
    notes: [
      "Masked export and restricted export delivery remain distinct channels even when they derive from the same manifest lineage.",
    ],
  },
  {
    channel_ref: "channel.export.delivery.attestation.restricted",
    label: "Restricted export delivery attestation",
    family_ref: "family.external_delivery_and_governance",
    outbox_mode: "TRANSACTIONAL_OUTBOX_REQUIRED",
    outbox_ref_or_null: "control_async.export_outbox",
    outbox_identity_fields: ["tenant_id", "export_version_ref", "delivery_binding_hash", "step_up_binding_ref"],
    broker_delivery_class: "UNORDERED_FANOUT_CHANNEL",
    broker_entity_alias_template:
      "{namespace_prefix}.export-delivery-attestation-restricted",
    inbox_mode: "DELIVERY_EVIDENCE_INBOX_REQUIRED",
    inbox_ref: "control_async.delivery_evidence_inbox",
    consumer_binding_ref: "worker.export-attestation-restricted",
    payload_posture: "OPAQUE_REFS_AND_BASIS_HASHES_ONLY",
    ordering_policy_ref: "ordering.delivery_binding_partition",
    retry_policy_ref: "retry.external_delivery_attestation",
    dedupe_policy_ref: "dedupe.delivery_binding",
    rebuild_basis_refs: ["ExportRecord", "DeliveryBinding", "AuditEvent"],
    truth_boundary_statement:
      "Restricted export delivery remains operator-step-up-bound and evidence-only. Broker replay cannot make a restricted export look like a customer-safe delivery.",
    source_refs,
    notes: [
      "This row intentionally stays separate from the masked-export lane to prevent silent disclosure drift.",
    ],
  },
  {
    channel_ref: "channel.retention.limitation.audit",
    label: "Retention limitation audit",
    family_ref: "family.external_delivery_and_governance",
    outbox_mode: "TRANSACTIONAL_OUTBOX_REQUIRED",
    outbox_ref_or_null: "control_async.governance_outbox",
    outbox_identity_fields: ["tenant_id", "artifact_ref", "retention_event_ref", "event_id_or_sequencer"],
    broker_delivery_class: "UNORDERED_FANOUT_CHANNEL",
    broker_entity_alias_template: "{namespace_prefix}.retention-limitation-audit",
    inbox_mode: "DELIVERY_EVIDENCE_INBOX_REQUIRED",
    inbox_ref: "control_async.governance_inbox",
    consumer_binding_ref: "worker.retention-audit",
    payload_posture: "OPAQUE_REFS_AND_BASIS_HASHES_ONLY",
    ordering_policy_ref: "ordering.delivery_binding_partition",
    retry_policy_ref: "retry.external_delivery_attestation",
    dedupe_policy_ref: "dedupe.object_version_and_event",
    rebuild_basis_refs: ["ArtifactRetention", "AuditEvent", "ImmutableObjectRef"],
    truth_boundary_statement:
      "Retention and limitation events update governance evidence and projections. Broker delivery cannot bypass durable retention law or omission posture.",
    source_refs,
    notes: [
      "At-least-once object lifecycle events require durable dedupe against retention event identity.",
    ],
  },
  {
    channel_ref: "channel.restore.archive.index",
    label: "Restore archive index",
    family_ref: "family.restore_and_rebuild",
    outbox_mode: "TRANSACTIONAL_OUTBOX_REQUIRED",
    outbox_ref_or_null: "control_async.restore_outbox",
    outbox_identity_fields: ["checkpoint_ref", "candidate_identity_hash", "artifact_version_ref", "event_id_or_sequencer"],
    broker_delivery_class: "ORDERED_PARTITION_CHANNEL",
    broker_entity_alias_template: "{namespace_prefix}.restore-archive-index",
    inbox_mode: "RESTORE_REBUILD_INBOX_REQUIRED",
    inbox_ref: "control_async.restore_rebuild_inbox",
    consumer_binding_ref: "worker.restore-indexer",
    payload_posture: "OPAQUE_REFS_AND_BASIS_HASHES_ONLY",
    ordering_policy_ref: "ordering.restore_checkpoint_partition",
    retry_policy_ref: "retry.restore_rebuild",
    dedupe_policy_ref: "dedupe.restore_checkpoint_identity",
    rebuild_basis_refs: ["RecoveryCheckpoint", "RestoreDrillResult", "ImmutableObjectRef"],
    truth_boundary_statement:
      "Restore indexing supports evidence discovery only. Queue recovery and environment reopen still depend on durable restore checkpoints and gates.",
    source_refs,
    notes: [
      "This channel makes queue-rebuild law visible: restore indexing may be replayed safely from durable checkpoint evidence.",
    ],
  },
];

const retryPolicyRows: RetryPolicyRow[] = [
  {
    policy_ref: "retry.worker_dispatch",
    label: "Worker dispatch backoff",
    channel_refs: ["channel.manifest.stage.dispatch"],
    initial_backoff_seconds: 30,
    max_backoff_seconds: 900,
    max_delivery_attempts: 12,
    dead_letter_mode: "DEAD_LETTER_QUEUE_REQUIRED",
    poison_message_action:
      "Move the work item into DLQ posture and require operator redrive after durable state preconditions are rechecked.",
    redrive_gate:
      "Redrive is legal only when the same command receipt, manifest stage, and stage-precondition hash still match current truth.",
    source_refs,
    notes: [
      "A blocked or poisoned worker dispatch must not be hidden behind endless requeue loops.",
    ],
  },
  {
    policy_ref: "retry.document_artifact_processing",
    label: "Artifact processing backoff",
    channel_refs: [
      "channel.upload.scan.request",
      "channel.upload.validation.recheck",
      "channel.evidence.manifest.binding",
      "channel.preview.registration",
    ],
    initial_backoff_seconds: 60,
    max_backoff_seconds: 1800,
    max_delivery_attempts: 8,
    dead_letter_mode: "DEAD_LETTER_QUEUE_REQUIRED",
    poison_message_action:
      "Dead-letter the transport event and surface durable processing failure so scan, preview, or binding repair can re-drive from immutable refs.",
    redrive_gate:
      "Redrive requires the same object version, upload-session lineage, and downstream safety preconditions to remain valid.",
    source_refs,
    notes: [
      "At-least-once storage events and downstream retries must converge onto one immutable object-version identity.",
    ],
  },
  {
    policy_ref: "retry.authority_send",
    label: "Authority send and poll backoff",
    channel_refs: [
      "channel.authority.transmit.dispatch",
      "channel.authority.reconciliation.poll",
    ],
    initial_backoff_seconds: 120,
    max_backoff_seconds: 3600,
    max_delivery_attempts: 6,
    dead_letter_mode: "QUARANTINE_INBOX_REQUIRED",
    poison_message_action:
      "Stop live transport work, preserve the request lineage, and move the execution attempt into a quarantined inbox record for explicit operator or control-plane review.",
    redrive_gate:
      "Before re-drive, the runtime must revalidate token lineage, authority link, request identity, and persisted reconciliation control against current truth.",
    source_refs,
    notes: [
      "No blind resend is legal just because a message left the broker without confirmation of downstream completion.",
    ],
  },
  {
    policy_ref: "retry.authority_callback_normalization",
    label: "Authority ingress normalization backoff",
    channel_refs: [
      "channel.authority.callback.ingress",
      "channel.authority.payload.normalization",
    ],
    initial_backoff_seconds: 15,
    max_backoff_seconds: 300,
    max_delivery_attempts: 5,
    dead_letter_mode: "MANUAL_REVIEW_REQUIRED",
    poison_message_action:
      "Quarantine the ingress receipt and block any legal-state mutation until authenticated correlation and canonical dedupe are resolved explicitly.",
    redrive_gate:
      "Normalization may replay only from the canonical ingress receipt and request-lineage packet, never from raw transport timestamps or broker-only identifiers.",
    source_refs,
    notes: [
      "Callback duplicates are expected and lawful only when they collapse onto one canonical ingress receipt.",
    ],
  },
  {
    policy_ref: "retry.external_delivery_attestation",
    label: "Delivery evidence backoff",
    channel_refs: [
      "channel.notification.transactional.send",
      "channel.export.delivery.attestation",
      "channel.export.delivery.attestation.restricted",
      "channel.retention.limitation.audit",
    ],
    initial_backoff_seconds: 30,
    max_backoff_seconds: 900,
    max_delivery_attempts: 7,
    dead_letter_mode: "DEAD_LETTER_QUEUE_REQUIRED",
    poison_message_action:
      "Dead-letter the evidence append and surface a durable review item rather than inventing successful delivery or governance completion.",
    redrive_gate:
      "Delivery evidence redrive is legal only if the same delivery binding, masking posture, or retention event identity still exists in durable truth.",
    source_refs,
    notes: [
      "Delivery and governance channels stay observational; repeated transport failure must not mutate workflow truth by implication.",
    ],
  },
  {
    policy_ref: "retry.restore_rebuild",
    label: "Restore and rebuild backoff",
    channel_refs: ["channel.restore.archive.index"],
    initial_backoff_seconds: 300,
    max_backoff_seconds: 3600,
    max_delivery_attempts: 10,
    dead_letter_mode: "DEAD_LETTER_QUEUE_REQUIRED",
    poison_message_action:
      "Move failed restore indexing into DLQ posture and keep environment reopen blocked until checkpoint evidence is repaired.",
    redrive_gate:
      "Redrive requires the same checkpoint, candidate identity hash, restore evidence bundle, and reopen gate set to remain current.",
    source_refs,
    notes: [
      "Restore-time queue work is admissibility-bound and therefore intentionally conservative.",
    ],
  },
];

const orderingPolicyRows: OrderingPolicyRow[] = [
  {
    policy_ref: "ordering.manifest_ref_fifo",
    label: "Per-manifest ordered partition",
    channel_refs: [
      "channel.manifest.stage.dispatch",
      "channel.evidence.manifest.binding",
    ],
    partition_key_fields: ["tenant_id", "manifest_ref"],
    strict_order_scope:
      "All messages for one manifest must preserve stage or evidence-binding order; cross-manifest order is intentionally unconstrained.",
    concurrency_rule:
      "One active consumer claim per partition key at a time; horizontal scale comes from many manifests, not from reordering one manifest.",
    backlog_hazard:
      "A poison message can stall one manifest lane, so dead-letter posture must unblock later work for other manifests without skipping durable truth.",
    source_refs,
    notes: [
      "This keeps one manifest from becoming a distributed race between worker instances.",
    ],
  },
  {
    policy_ref: "ordering.upload_session_fifo",
    label: "Per-upload-session ordered partition",
    channel_refs: [
      "channel.upload.scan.request",
      "channel.upload.validation.recheck",
      "channel.preview.registration",
    ],
    partition_key_fields: ["tenant_id", "upload_session_id"],
    strict_order_scope:
      "Upload-session lifecycle events stay ordered per session so scan, validation, and preview registration cannot overtake one another.",
    concurrency_rule:
      "Independent upload sessions may process concurrently; one upload session remains serial at the broker lane.",
    backlog_hazard:
      "Long-running scan or validation work must not block unrelated upload sessions or prompt unsafe key reuse.",
    source_refs,
    notes: [
      "This matches the upload recovery law that a session keeps one governed identity across reconnect and retry.",
    ],
  },
  {
    policy_ref: "ordering.authority_interaction_fifo",
    label: "Per-authority-interaction ordered partition",
    channel_refs: [
      "channel.authority.transmit.dispatch",
      "channel.authority.reconciliation.poll",
    ],
    partition_key_fields: ["tenant_id", "authority_interaction_ref"],
    strict_order_scope:
      "One authority interaction preserves send, poll, and retry order under a single interaction ref.",
    concurrency_rule:
      "Independent authority interactions may run concurrently, but one interaction cannot have overlapping active send or poll claims.",
    backlog_hazard:
      "A stuck interaction must not permit blind resend or poll floods that outrun the durable reconciliation contract.",
    source_refs,
    notes: [
      "This row keeps request-backed authority recovery deterministic after queue or worker loss.",
    ],
  },
  {
    policy_ref: "ordering.authority_ingress_delivery",
    label: "Authority delivery dedupe partition",
    channel_refs: [
      "channel.authority.callback.ingress",
      "channel.authority.payload.normalization",
    ],
    partition_key_fields: ["authority_profile_ref", "delivery_dedupe_key"],
    strict_order_scope:
      "Ingress processing serializes per provider-delivery identity until one canonical receipt and outcome exist.",
    concurrency_rule:
      "Different delivery identities may normalize in parallel, but one dedupe key must never have two concurrent mutation-capable consumers.",
    backlog_hazard:
      "Provider duplicate storms can stall one dedupe key, so canonical receipt collapse is mandatory before higher-cost normalization repeats.",
    source_refs,
    notes: [
      "This is the key transport boundary that keeps provider callback duplication from becoming legal-state duplication.",
    ],
  },
  {
    policy_ref: "ordering.delivery_binding_partition",
    label: "Per-delivery-binding partition",
    channel_refs: [
      "channel.notification.transactional.send",
      "channel.export.delivery.attestation",
      "channel.export.delivery.attestation.restricted",
      "channel.retention.limitation.audit",
    ],
    partition_key_fields: ["tenant_id", "delivery_binding_hash"],
    strict_order_scope:
      "Evidence append order is preserved per delivery binding or governance binding only; global order is unnecessary.",
    concurrency_rule:
      "Delivery and governance work may fan out freely across bindings but should serialize within one binding identity.",
    backlog_hazard:
      "Provider retries or webhook duplicates can flood one binding, so the inbox ledger must absorb duplicates without generating duplicate evidence.",
    source_refs,
    notes: [
      "The binding hash is a safer ordering dimension than recipient address or export filename alone.",
    ],
  },
  {
    policy_ref: "ordering.restore_checkpoint_partition",
    label: "Per-checkpoint restore partition",
    channel_refs: ["channel.restore.archive.index"],
    partition_key_fields: ["checkpoint_ref", "candidate_identity_hash"],
    strict_order_scope:
      "Restore indexing stays ordered per checkpoint and candidate identity because reopen gates are checkpoint-bound.",
    concurrency_rule:
      "Different checkpoints may index concurrently; one checkpoint lane remains serial until evidence and reopen gates settle.",
    backlog_hazard:
      "A broken restore-index task must block only its checkpoint lane and keep reopen law explicit rather than losing evidence in a broad retry storm.",
    source_refs,
    notes: [
      "This row makes disaster-recovery admissibility mechanically explainable.",
    ],
  },
];

const dedupePolicyRows: DedupePolicyRow[] = [
  {
    policy_ref: "dedupe.command_receipt_and_manifest",
    label: "Command receipt + manifest dedupe",
    channel_refs: ["channel.manifest.stage.dispatch"],
    dedupe_key_fields: ["tenant_id", "manifest_ref", "stage_code", "command_receipt_ref"],
    window_posture:
      "DURABLE_LEDGER_REQUIRED_BROKER_WINDOW_ALONE_INSUFFICIENT",
    inbox_requirement:
      "Worker inbox must persist the command receipt identity and current stage-precondition hash before execution can begin.",
    mutation_gate:
      "A duplicate stage dispatch may only return the same durable execution claim or an already-finished receipt; it may not create a second stage mutation.",
    replay_protection:
      "Rebuild from durable manifest and inbox truth rather than re-consuming broker-local delivery history.",
    source_refs,
    notes: [
      "This policy prevents a duplicate broker delivery from inventing a second stage runner.",
    ],
  },
  {
    policy_ref: "dedupe.object_version_and_event",
    label: "Object version + event dedupe",
    channel_refs: [
      "channel.upload.scan.request",
      "channel.upload.validation.recheck",
      "channel.evidence.manifest.binding",
      "channel.preview.registration",
      "channel.retention.limitation.audit",
    ],
    dedupe_key_fields: [
      "tenant_id",
      "object_version_ref",
      "event_type",
      "event_id_or_sequencer_or_metageneration",
    ],
    window_posture:
      "DURABLE_LEDGER_REQUIRED_OBJECT_STORE_EVENTS_ARE_AT_LEAST_ONCE",
    inbox_requirement:
      "Artifact-processing inbox entries must persist immutable object-version identity and event identity together before work claims begin.",
    mutation_gate:
      "Repeated object events may only collapse onto one durable processing record for the same immutable object version.",
    replay_protection:
      "If the broker is lost, re-drive from object refs plus durable inbox rows rather than trusting provider event ordering.",
    source_refs,
    notes: [
      "This policy matches the storage event route contract from pc_0051.",
    ],
  },
  {
    policy_ref: "dedupe.authority_request_identity",
    label: "Authority request identity dedupe",
    channel_refs: [
      "channel.authority.transmit.dispatch",
      "channel.authority.reconciliation.poll",
    ],
    dedupe_key_fields: ["tenant_id", "authority_interaction_ref", "request_hash", "idempotency_key"],
    window_posture:
      "DURABLE_LEDGER_REQUIRED_MUST_SURVIVE_TOKEN_ROTATION_AND_RESTORE",
    inbox_requirement:
      "Authority execution inbox must bind request hash, client lineage, and canonical interaction ref before any send or poll execution.",
    mutation_gate:
      "Duplicate transport work may only reuse the same authority interaction or enter quarantined review; it may not create a new legal mutation path.",
    replay_protection:
      "Send and poll recovery read from AuthorityInteractionRecord and ReconciliationControlContract rather than from broker attempt logs.",
    source_refs,
    notes: [
      "This policy is the operational form of the no-blind-resend rule.",
    ],
  },
  {
    policy_ref: "dedupe.authority_delivery_identity",
    label: "Authority delivery dedupe",
    channel_refs: [
      "channel.authority.callback.ingress",
      "channel.authority.payload.normalization",
    ],
    dedupe_key_fields: [
      "authority_profile_ref",
      "delivery_dedupe_key",
      "canonical_ingress_receipt_ref_or_null",
      "request_hash_or_null",
    ],
    window_posture:
      "DURABLE_LEDGER_REQUIRED_CANONICAL_RECEIPT_MUST_OUTLIVE_TRANSPORT_WINDOW",
    inbox_requirement:
      "Authenticated dedupe inbox must persist the provider-delivery identity and canonical ingress receipt before any normalized response is emitted.",
    mutation_gate:
      "Legal-state mutation is blocked until the ingress receipt is authenticated, correlated, and either uniquely bound or explicitly quarantined.",
    replay_protection:
      "Callback replay and recovery payload replay both collapse onto the same canonical ingress receipt lineage.",
    source_refs,
    notes: [
      "This policy is the critical callback-ingress safety barrier for the whole messaging topology.",
    ],
  },
  {
    policy_ref: "dedupe.delivery_binding",
    label: "Delivery binding dedupe",
    channel_refs: [
      "channel.notification.transactional.send",
      "channel.export.delivery.attestation",
      "channel.export.delivery.attestation.restricted",
    ],
    dedupe_key_fields: ["tenant_id", "delivery_binding_hash", "provider_delivery_id_or_attempt_ref"],
    window_posture:
      "DURABLE_LEDGER_REQUIRED_PROVIDER_WEBHOOK_WINDOWS_ARE_NOT_SUFFICIENT",
    inbox_requirement:
      "Delivery-evidence inbox must persist delivery binding identity before any evidence append or counter change occurs.",
    mutation_gate:
      "Duplicate provider callbacks may append at most one canonical evidence record per delivery binding and provider delivery id.",
    replay_protection:
      "Evidence append re-drives from durable binding and inbox state rather than from provider-local delivery history.",
    source_refs,
    notes: [
      "This policy prevents notification or export evidence from double-counting on repeated callback delivery.",
    ],
  },
  {
    policy_ref: "dedupe.restore_checkpoint_identity",
    label: "Restore checkpoint identity dedupe",
    channel_refs: ["channel.restore.archive.index"],
    dedupe_key_fields: ["checkpoint_ref", "candidate_identity_hash", "artifact_version_ref", "event_id_or_sequencer"],
    window_posture:
      "DURABLE_LEDGER_REQUIRED_RESTORE_EVIDENCE_MUST_SURVIVE_DRILL_REPLAY",
    inbox_requirement:
      "Restore inbox entries must persist checkpoint and candidate identity before any index mutation or reopen signal can advance.",
    mutation_gate:
      "Duplicate restore index events may only update the same checkpoint-bound evidence row, never create conflicting reopen posture.",
    replay_protection:
      "Restore indexing replays from RecoveryCheckpoint and immutable artifact refs only.",
    source_refs,
    notes: [
      "This keeps restore queue rebuild admissibility-bound instead of best-effort.",
    ],
  },
];

function clone<T>(value: T): T {
  return structuredClone(value);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function managedDefaultStatusFor(
  selectionStatus: MessagingSelectionStatus,
): MessagingManagedDefaultStatus {
  return selectionStatus === "PROVIDER_SELECTED"
    ? "READY_TO_ADOPT_PLATFORM_MESSAGING"
    : "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION";
}

export function createOutboxInboxChannelMatrix(
  selectionStatus: MessagingSelectionStatus = "PROVIDER_SELECTION_REQUIRED",
): OutboxInboxChannelMatrix {
  return {
    schema_version: "1.0",
    matrix_id: "messaging_outbox_inbox_channel_matrix",
    selection_status: selectionStatus,
    managed_default_status: managedDefaultStatusFor(selectionStatus),
    topology_mode: topologyMode,
    family_rows: clone(familyRows),
    channel_rows: clone(channelRows),
    source_refs: clone(sourceRefs),
    typed_gaps: [
      "Provider product choice is unresolved, so broker entity aliases remain portable namespace templates rather than live queue/topic identifiers.",
      "Broker-side delivery guarantees remain intentionally subordinate to durable outbox, inbox, and audit truth.",
    ],
    notes: [
      "The broker is transport-only and explicitly rebuildable from durable truth.",
      "Callback ingress has no durable outbox by design; it must authenticate into the inbox boundary first.",
    ],
  };
}

export function createRetryDeadLetterPolicy(
  selectionStatus: MessagingSelectionStatus = "PROVIDER_SELECTION_REQUIRED",
): RetryDeadLetterPolicy {
  return {
    schema_version: "1.0",
    policy_id: "messaging_retry_dead_letter_policy",
    selection_status: selectionStatus,
    topology_mode: topologyMode,
    policy_rows: clone(retryPolicyRows),
    source_refs: clone(sourceRefs),
    typed_gaps: [
      "Provider-specific retry and DLQ tuning values remain unresolved until the platform chooses one broker family.",
    ],
    notes: [
      "Poison-message handling is explicit and must never degrade into infinite requeue loops.",
    ],
  };
}

export function createOrderingAndPartitioningPolicy(
  selectionStatus: MessagingSelectionStatus = "PROVIDER_SELECTION_REQUIRED",
): OrderingAndPartitioningPolicy {
  return {
    schema_version: "1.0",
    policy_id: "messaging_ordering_and_partitioning_policy",
    selection_status: selectionStatus,
    topology_mode: topologyMode,
    policy_rows: clone(orderingPolicyRows),
    source_refs: clone(sourceRefs),
    typed_gaps: [
      "Provider-specific throughput quotas per partition or session are deferred until the broker family is selected.",
    ],
    notes: [
      "Ordering is intentionally per durable identity boundary, never one global queue-wide order.",
    ],
  };
}

export function createIdempotencyAndDedupePolicy(
  selectionStatus: MessagingSelectionStatus = "PROVIDER_SELECTION_REQUIRED",
): IdempotencyAndDedupePolicy {
  return {
    schema_version: "1.0",
    policy_id: "messaging_idempotency_and_dedupe_policy",
    selection_status: selectionStatus,
    topology_mode: topologyMode,
    policy_rows: clone(dedupePolicyRows),
    source_refs: clone(sourceRefs),
    typed_gaps: [
      "No provider-side dedupe feature is treated as sufficient for durable legal truth or replay safety.",
    ],
    notes: [
      "Dedupe and idempotency live in durable ledgers, not inside volatile consumer memory or short broker windows.",
    ],
  };
}

export function createMessagingInventoryTemplate(
  runContext: Partial<MinimalRunContext> = {},
  selectionStatus: MessagingSelectionStatus = "PROVIDER_SELECTION_REQUIRED",
  providerFamilySelection: MessagingProviderFamily | null = null,
): MessagingInventoryTemplate {
  return {
    schema_version: "1.0",
    inventory_id: "messaging_inventory",
    provider_id: MESSAGING_PROVIDER_ID,
    flow_id: MESSAGING_FLOW_ID,
    policy_version: MESSAGING_POLICY_VERSION,
    run_id: runContext.runId ?? "run-template-messaging-topology-001",
    workspace_id:
      runContext.workspaceId ?? "wk-local-provisioning-messaging-topology",
    operator_identity_alias:
      runContext.operatorIdentityAlias ?? "ops.messaging.bootstrap",
    selection_status: selectionStatus,
    managed_default_status: managedDefaultStatusFor(selectionStatus),
    selected_provider_family_or_null: providerFamilySelection,
    topology_mode: topologyMode,
    provider_option_rows: clone(providerOptionRows),
    environment_rows: clone(environmentRows),
    channel_rows: clone(channelRows),
    outbox_inbox_channel_matrix_ref:
      "config/messaging/outbox_inbox_channel_matrix.json",
    retry_dead_letter_policy_ref: "config/messaging/retry_dead_letter_policy.json",
    ordering_and_partitioning_policy_ref:
      "config/messaging/ordering_and_partitioning_policy.json",
    idempotency_and_dedupe_policy_ref:
      "config/messaging/idempotency_and_dedupe_policy.json",
    source_refs: clone(sourceRefs),
    typed_gaps: [
      "Platform provider selection is unresolved, so queue/topic/subscription creation remains blocked while the logical topology is still frozen.",
      "Broker credentials are represented as alias refs only; concrete secret bindings are deferred until provider adoption.",
    ],
    notes: [
      "No raw secrets, tokens, or callback payload bodies appear in this inventory.",
      "Environment isolation is strict; namespace prefixes and secret aliases remain environment-bound.",
    ],
    last_verified_at: MESSAGING_LAST_VERIFIED_AT,
  };
}

export function createMessageFabricAtlasViewModel(): MessageFabricAtlasViewModel {
  return {
    routeId: "message-fabric-atlas",
    providerDisplayName: "Message Coordination Fabric",
    providerMonogram: "MSG",
    selectionPosture: "PROVIDER_SELECTION_REQUIRED",
    managedDefaultStatus: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    recoveryChipLabel: "Rebuild From Durable Truth",
    topologyModeLabel:
      "Transactional outboxes + authenticated dedupe inboxes + rebuildable broker",
    summary:
      "Durable outboxes, authenticated dedupe inboxes, and partitioned broker channels keep transport ephemeral and recoverable. Broker loss is delivery loss only; truth remains in control, audit, and immutable refs.",
    notes: [
      "The broker is not the system of record for manifests, authority state, workflow, or retention control.",
      "Authority/provider callbacks enter the authenticated dedupe inbox before any legal-state mutation.",
      "Payloads stay opaque and secret-free in transit. Durable tables carry the real lineage and admissibility basis.",
    ],
    environments: clone(environmentRows).map((environment) => ({
      environment_ref: environment.environment_ref,
      label: environment.label,
      namespace_prefix: environment.namespace_prefix,
      recovery_posture: environment.recovery_posture,
    })),
    families: clone(familyRows).map((family) => ({
      family_ref: family.family_ref,
      label: family.label,
      center_lane_emphasis: family.center_lane_emphasis,
      description: family.description,
      channel_count: channelRows.filter(
        (channel) => channel.family_ref === family.family_ref,
      ).length,
      note: family.notes[0] ?? family.description,
    })),
    channels: clone(channelRows).map((channel) => ({
      channel_ref: channel.channel_ref,
      family_ref: channel.family_ref,
      label: channel.label,
      outbox_mode: channel.outbox_mode,
      outbox_ref_or_null: channel.outbox_ref_or_null,
      broker_delivery_class: channel.broker_delivery_class,
      broker_entity_alias_template: channel.broker_entity_alias_template,
      inbox_mode: channel.inbox_mode,
      inbox_ref: channel.inbox_ref,
      consumer_binding_ref: channel.consumer_binding_ref,
      ordering_policy_ref: channel.ordering_policy_ref,
      retry_policy_ref: channel.retry_policy_ref,
      dedupe_policy_ref: channel.dedupe_policy_ref,
      note: channel.notes[0] ?? channel.truth_boundary_statement,
    })),
    orderingPolicies: clone(orderingPolicyRows).map((policy) => ({
      policy_ref: policy.policy_ref,
      label: policy.label,
      partition_key_fields: policy.partition_key_fields,
      note: policy.notes[0] ?? policy.strict_order_scope,
    })),
    retryPolicies: clone(retryPolicyRows).map((policy) => ({
      policy_ref: policy.policy_ref,
      label: policy.label,
      max_delivery_attempts: policy.max_delivery_attempts,
      dead_letter_mode: policy.dead_letter_mode,
      note: policy.notes[0] ?? policy.redrive_gate,
    })),
    dedupePolicies: clone(dedupePolicyRows).map((policy) => ({
      policy_ref: policy.policy_ref,
      label: policy.label,
      dedupe_key_fields: policy.dedupe_key_fields,
      note: policy.notes[0] ?? policy.replay_protection,
    })),
    selectedEnvironmentRef: "env_preproduction_verification",
    selectedFamilyRef: "family.authority_send_and_ingress",
    selectedChannelRef: "channel.authority.callback.ingress",
    selectedPolicyKind: "ordering",
  };
}

function stableInventoryComparable(
  inventory: MessagingInventoryTemplate,
): Record<string, unknown> {
  return {
    ...inventory,
    run_id: "__RUN__",
    workspace_id: "__WORKSPACE__",
    operator_identity_alias: "__OPERATOR__",
    last_verified_at: "__VERIFIED_AT__",
  };
}

export function validateOutboxInboxChannelMatrix(
  matrix: OutboxInboxChannelMatrix,
): void {
  const familyRefs = new Set(matrix.family_rows.map((family) => family.family_ref));
  const orderingRefs = new Set(orderingPolicyRows.map((row) => row.policy_ref));
  const retryRefs = new Set(retryPolicyRows.map((row) => row.policy_ref));
  const dedupeRefs = new Set(dedupePolicyRows.map((row) => row.policy_ref));
  const channelRefs = new Set<string>();

  matrix.channel_rows.forEach((channel) => {
    assert(!channelRefs.has(channel.channel_ref), `Duplicate channel ref ${channel.channel_ref}`);
    channelRefs.add(channel.channel_ref);
    assert(
      familyRefs.has(channel.family_ref),
      `Unknown family ref ${channel.family_ref} on ${channel.channel_ref}`,
    );
    assert(
      orderingRefs.has(channel.ordering_policy_ref),
      `Unknown ordering policy ${channel.ordering_policy_ref}`,
    );
    assert(
      retryRefs.has(channel.retry_policy_ref),
      `Unknown retry policy ${channel.retry_policy_ref}`,
    );
    assert(
      dedupeRefs.has(channel.dedupe_policy_ref),
      `Unknown dedupe policy ${channel.dedupe_policy_ref}`,
    );
    assert(
      channel.payload_posture !== "OPAQUE_REFS_PLUS_AUTH_METADATA_NO_SECRETS" ||
        !channel.notes.join(" ").toLowerCase().includes("token value"),
      `Channel ${channel.channel_ref} leaks secret posture in notes`,
    );
    if (channel.outbox_mode === "NONE_EXTERNAL_SOURCE") {
      assert(
        channel.outbox_ref_or_null === null,
        `External-source channel ${channel.channel_ref} must not declare a durable outbox ref`,
      );
      assert(
        channel.inbox_mode === "AUTHENTICATED_DEDUPE_INBOX_REQUIRED",
        `External-source channel ${channel.channel_ref} must land in the authenticated dedupe inbox`,
      );
    } else {
      assert(
        typeof channel.outbox_ref_or_null === "string" &&
          channel.outbox_ref_or_null.length > 0,
        `Transactional channel ${channel.channel_ref} must declare an outbox ref`,
      );
      assert(
        channel.outbox_identity_fields.length >= 3,
        `Transactional channel ${channel.channel_ref} must expose durable outbox identity fields`,
      );
    }
  });
}

export function validateRetryDeadLetterPolicy(
  policy: RetryDeadLetterPolicy,
): void {
  const knownChannels = new Set(channelRows.map((row) => row.channel_ref));
  policy.policy_rows.forEach((row) => {
    assert(
      row.initial_backoff_seconds > 0 &&
        row.max_backoff_seconds >= row.initial_backoff_seconds,
      `Retry policy ${row.policy_ref} has invalid backoff values`,
    );
    assert(
      row.max_delivery_attempts >= 3,
      `Retry policy ${row.policy_ref} must allow at least three attempts`,
    );
    row.channel_refs.forEach((channelRef) => {
      assert(
        knownChannels.has(channelRef),
        `Retry policy ${row.policy_ref} references unknown channel ${channelRef}`,
      );
    });
  });
}

export function validateOrderingAndPartitioningPolicy(
  policy: OrderingAndPartitioningPolicy,
): void {
  const knownChannels = new Set(channelRows.map((row) => row.channel_ref));
  policy.policy_rows.forEach((row) => {
    assert(
      row.partition_key_fields.length >= 2,
      `Ordering policy ${row.policy_ref} must declare lineage-rich partition keys`,
    );
    row.channel_refs.forEach((channelRef) => {
      assert(
        knownChannels.has(channelRef),
        `Ordering policy ${row.policy_ref} references unknown channel ${channelRef}`,
      );
    });
  });
}

export function validateIdempotencyAndDedupePolicy(
  policy: IdempotencyAndDedupePolicy,
): void {
  const knownChannels = new Set(channelRows.map((row) => row.channel_ref));
  policy.policy_rows.forEach((row) => {
    assert(
      row.dedupe_key_fields.length >= 3,
      `Dedupe policy ${row.policy_ref} must declare enough identity fields`,
    );
    assert(
      row.window_posture.includes("DURABLE_LEDGER_REQUIRED"),
      `Dedupe policy ${row.policy_ref} must remain durable-ledger-bound`,
    );
    row.channel_refs.forEach((channelRef) => {
      assert(
        knownChannels.has(channelRef),
        `Dedupe policy ${row.policy_ref} references unknown channel ${channelRef}`,
      );
    });
  });
}

function createMessagingBootstrapRunbookMarkdown(): string {
  const providerLines = providerOptionRows
    .map(
      (row) =>
        `- \`${row.provider_family}\` (${row.provider_label}): ${row.docs_urls
          .map((url) => `<${url}>`)
          .join(", ")}`,
    )
    .join("\n");

  return `# Messaging Bootstrap Runbook

- Last verified: ${MESSAGING_LAST_VERIFIED_AT}
- Flow ID: \`${MESSAGING_FLOW_ID}\`
- Provider posture: \`PROVIDER_SELECTION_REQUIRED\`
- Topology mode: \`${topologyMode}\`

## Purpose

Freeze the transport-only message fabric for transactional outboxes, authenticated dedupe inboxes,
worker coordination, authority callback ingress, delivery evidence, and restore rebuild work.

## Non-negotiable boundaries

- The broker is never the system of record for manifests, workflow, authority truth, or retention control.
- Queue loss is delivery loss only. Backlog rebuilds from durable outbox, inbox, workflow, interaction, and audit truth.
- Provider callbacks must authenticate into the dedupe inbox before normalization or legal-state mutation.
- Messages and headers carry opaque refs and basis hashes only. No raw tokens, secrets, or credential material may transit the fabric.
- Dead-letter posture must be explicit, reviewable, and redrivable only after durable preconditions are rechecked.
- Environment isolation is strict. Sandbox, preproduction, production, and restore drill namespaces do not mix.

## Channel families

- Stage Orchestrator / Workers
- Upload / Evidence Processing
- Authority Send / Ingress
- External Delivery / Governance
- Restore / Rebuild

## Provider options reviewed

${providerLines}

## Bootstrap sequence

1. Resolve whether the platform has selected a broker family. If not, keep the topology in portable blocked-contract mode.
2. Materialize or adopt the sanitized inventory under \`data/provisioning/messaging_inventory.template.json\`.
3. Freeze the outbox/inbox channel matrix and linked retry, ordering, and dedupe policy packs.
4. Wire the atlas payload into the provisioning viewer so operators can inspect the exact outbox, broker, inbox, and policy boundary.
5. When the platform later selects a provider family, bind concrete queue/topic/subscription names without altering the logical channel refs or truth boundaries.

## Recovery posture

- Rebuild worker-dispatch backlog from \`RunManifest\`, \`ManifestStageRecord\`, and durable inbox/outbox rows.
- Rebuild authority-send and reconciliation backlog from \`AuthorityInteractionRecord\`, \`SubmissionRecord\`, and \`ReconciliationControlContract\`.
- Rebuild callback and normalization backlog from \`AuthorityIngressReceipt\`, \`AuthorityIngressProof\`, and immutable payload refs.
- Rebuild export, notification, and retention evidence from the same delivery-binding or governance rows that originally authorized them.
- Restore drills stay blocked until queue rebuild, audit continuity, privacy reconciliation, and authority rebuild gates all pass.

## Typed gaps

- Concrete broker product, namespace creation, throughput quota, and IAM details remain blocked by platform/provider selection.
- Secret aliases are frozen as logical refs only; live credentials are deferred to the future provider-adoption pass.
`;
}

export async function provisionQueueOrBrokerForOutboxInboxAndWorkerCoordination(
  options: {
    runContext: MinimalRunContext;
    inventoryPath: string;
    existingInventoryPath?: string;
    providerFamilySelection?: MessagingProviderFamily | null;
  },
): Promise<ProvisionMessagingResult> {
  const selectionStatus: MessagingSelectionStatus = options.providerFamilySelection
    ? "PROVIDER_SELECTED"
    : "PROVIDER_SELECTION_REQUIRED";

  const outboxInboxChannelMatrix = createOutboxInboxChannelMatrix(selectionStatus);
  const retryDeadLetterPolicy = createRetryDeadLetterPolicy(selectionStatus);
  const orderingAndPartitioningPolicy =
    createOrderingAndPartitioningPolicy(selectionStatus);
  const idempotencyAndDedupePolicy =
    createIdempotencyAndDedupePolicy(selectionStatus);

  validateOutboxInboxChannelMatrix(outboxInboxChannelMatrix);
  validateRetryDeadLetterPolicy(retryDeadLetterPolicy);
  validateOrderingAndPartitioningPolicy(orderingAndPartitioningPolicy);
  validateIdempotencyAndDedupePolicy(idempotencyAndDedupePolicy);

  const inventory = createMessagingInventoryTemplate(
    options.runContext,
    selectionStatus,
    options.providerFamilySelection ?? null,
  );

  let adoptionStep: ProvisionMessagingStep = {
    step_id: "messaging.adopt-or-verify-existing-topology",
    title: "Adopt or verify existing topology",
    status: "SUCCEEDED",
    reason:
      "No prior inventory was supplied; a sanitized message-fabric inventory will be created.",
  };

  if (options.existingInventoryPath) {
    try {
      const existingInventory = JSON.parse(
        await readFile(options.existingInventoryPath, "utf8"),
      ) as MessagingInventoryTemplate;
      if (
        JSON.stringify(stableInventoryComparable(existingInventory)) !==
        JSON.stringify(stableInventoryComparable(inventory))
      ) {
        return {
          outcome: "MESSAGING_TOPOLOGY_DRIFT_REVIEW_REQUIRED",
          selection_status: selectionStatus,
          inventory,
          outboxInboxChannelMatrix,
          retryDeadLetterPolicy,
          orderingAndPartitioningPolicy,
          idempotencyAndDedupePolicy,
          atlasViewModel: createMessageFabricAtlasViewModel(),
          steps: [
            {
              step_id: "messaging.resolve-provider-selection",
              title: "Resolve messaging provider family",
              status: options.providerFamilySelection
                ? "SUCCEEDED"
                : "BLOCKED_BY_POLICY",
              reason: options.providerFamilySelection
                ? `Provider family ${options.providerFamilySelection} was supplied explicitly.`
                : "Provider family remains unresolved, so the flow stays in portable blocked-contract mode.",
            },
            {
              step_id: "messaging.adopt-or-verify-existing-topology",
              title: "Adopt or verify existing topology",
              status: "BLOCKED_BY_DRIFT",
              reason:
                "Existing messaging inventory differs from the frozen topology signature. The flow stopped without overwriting the prior record.",
            },
          ],
          notes: [
            "No existing inventory file was overwritten because messaging topology drift requires review.",
          ],
        };
      }
      adoptionStep = {
        step_id: "messaging.adopt-or-verify-existing-topology",
        title: "Adopt or verify existing topology",
        status: "SKIPPED_AS_ALREADY_PRESENT",
        reason:
          "Existing inventory matches the frozen topology signature and can be adopted without drift.",
      };
    } catch {
      adoptionStep = {
        step_id: "messaging.adopt-or-verify-existing-topology",
        title: "Adopt or verify existing topology",
        status: "SUCCEEDED",
        reason:
          "No prior inventory could be read; a sanitized message-fabric inventory will be created.",
      };
    }
  }

  await mkdir(path.dirname(options.inventoryPath), { recursive: true });
  await writeFile(options.inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");

  const steps: ProvisionMessagingStep[] = [
    {
      step_id: "messaging.resolve-provider-selection",
      title: "Resolve messaging provider family",
      status: options.providerFamilySelection ? "SUCCEEDED" : "BLOCKED_BY_POLICY",
      reason: options.providerFamilySelection
        ? `Provider family ${options.providerFamilySelection} was supplied explicitly.`
        : "The dependency register still marks the queue or broker fabric as a procurement or platform choice, so live namespace creation remains blocked.",
    },
    {
      step_id: "messaging.freeze-channel-matrix",
      title: "Freeze outbox, broker, and inbox channel matrix",
      status: "SUCCEEDED",
      reason:
        "Channel families and logical lanes now expose durable outbox refs, broker aliases, authenticated inbox posture, and rebuild bases.",
    },
    {
      step_id: "messaging.freeze-retry-and-dead-letter-policy",
      title: "Freeze retry and dead-letter policy",
      status: "SUCCEEDED",
      reason:
        "Retry budgets, poison-message actions, DLQ or quarantine posture, and redrive gates are now machine-readable for every channel family.",
    },
    {
      step_id: "messaging.freeze-ordering-and-dedupe-policy",
      title: "Freeze ordering and idempotency policy",
      status: "SUCCEEDED",
      reason:
        "Partition keys, durable dedupe tuples, callback-ingress collapse rules, and replay protections now exist independently of any one provider feature.",
    },
    adoptionStep,
    {
      step_id: "messaging.persist-sanitized-inventory",
      title: "Persist sanitized inventory",
      status: "SUCCEEDED",
      reason:
        "Sanitized inventory persisted with logical channel refs, alias refs, and provider-option rows only.",
    },
  ];

  return {
    outcome: options.providerFamilySelection
      ? "MESSAGING_TOPOLOGY_READY_FOR_PROVIDER_ADOPTION"
      : "MESSAGING_TOPOLOGY_DECLARED_PROVIDER_SELECTION_REQUIRED",
    selection_status: selectionStatus,
    inventory,
    outboxInboxChannelMatrix,
    retryDeadLetterPolicy,
    orderingAndPartitioningPolicy,
    idempotencyAndDedupePolicy,
    atlasViewModel: createMessageFabricAtlasViewModel(),
    steps,
    notes: [
      "No live provider mutation occurred.",
      "This flow is safe to rerun because unresolved-provider posture only writes sanitized inventory and compares drift explicitly.",
    ],
  };
}

export async function emitCheckedInArtifacts(repoRoot: string): Promise<void> {
  const outboxInboxChannelMatrix = createOutboxInboxChannelMatrix();
  const retryDeadLetterPolicy = createRetryDeadLetterPolicy();
  const orderingAndPartitioningPolicy = createOrderingAndPartitioningPolicy();
  const idempotencyAndDedupePolicy = createIdempotencyAndDedupePolicy();
  const inventory = createMessagingInventoryTemplate();
  const atlasViewModel = createMessageFabricAtlasViewModel();
  const runbookMarkdown = createMessagingBootstrapRunbookMarkdown();

  const writes: Array<[string, string]> = [
    [
      "config/messaging/outbox_inbox_channel_matrix.json",
      `${JSON.stringify(outboxInboxChannelMatrix, null, 2)}\n`,
    ],
    [
      "config/messaging/retry_dead_letter_policy.json",
      `${JSON.stringify(retryDeadLetterPolicy, null, 2)}\n`,
    ],
    [
      "config/messaging/ordering_and_partitioning_policy.json",
      `${JSON.stringify(orderingAndPartitioningPolicy, null, 2)}\n`,
    ],
    [
      "config/messaging/idempotency_and_dedupe_policy.json",
      `${JSON.stringify(idempotencyAndDedupePolicy, null, 2)}\n`,
    ],
    [
      "data/provisioning/messaging_inventory.template.json",
      `${JSON.stringify(inventory, null, 2)}\n`,
    ],
    ["docs/provisioning/messaging_bootstrap_runbook.md", runbookMarkdown],
  ];

  for (const [relativePath, content] of writes) {
    const targetPath = path.join(repoRoot, relativePath);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, content, "utf8");
  }

  const sampleRunPath = path.join(
    repoRoot,
    "automation/provisioning/report_viewer/data/sample_run.json",
  );
  const sampleRun = JSON.parse(await readFile(sampleRunPath, "utf8")) as Record<
    string,
    unknown
  >;
  sampleRun.messageFabricAtlas = atlasViewModel;
  await writeFile(sampleRunPath, `${JSON.stringify(sampleRun, null, 2)}\n`, "utf8");
}

async function main() {
  const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
  const selfPath = fileURLToPath(import.meta.url);
  if (invokedPath !== selfPath) {
    return;
  }

  if (process.argv.includes("--emit")) {
    const repoRoot = path.resolve(path.dirname(selfPath), "..", "..", "..");
    await emitCheckedInArtifacts(repoRoot);
  }
}

await main();

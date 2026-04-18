# Messaging Bootstrap Runbook

- Last verified: 2026-04-18T18:55:00Z
- Flow ID: `provision-queue-or-broker-for-outbox-inbox-and-worker-coordination`
- Provider posture: `PROVIDER_SELECTION_REQUIRED`
- Topology mode: `TRANSACTIONAL_OUTBOX_AND_AUTHENTICATED_DEDUPE_INBOX_REBUILDABLE_TRANSPORT_ONLY_BROKER`

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

- `AWS_SQS_FIFO` (Amazon SQS FIFO): <https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_CreateQueue.html>, <https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/designing-for-outage-recovery-scenarios.html>, <https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-configure-dead-letter-queue.html>
- `GCP_PUBSUB` (Google Cloud Pub/Sub): <https://cloud.google.com/pubsub/docs/dead-letter-topics>, <https://cloud.google.com/pubsub/docs/subscription-properties>, <https://cloud.google.com/pubsub/docs/ordering>, <https://docs.cloud.google.com/pubsub/docs/exactly-once-delivery>
- `AZURE_SERVICE_BUS` (Azure Service Bus): <https://learn.microsoft.com/en-us/azure/service-bus-messaging/advanced-features-overview>, <https://learn.microsoft.com/en-us/azure/service-bus-messaging/duplicate-detection>, <https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-sessions>, <https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-partitioning>
- `SELF_HOSTED_RABBITMQ_QUORUM` (Self-hosted RabbitMQ quorum queues): <https://www.rabbitmq.com/docs/quorum-queues>, <https://www.rabbitmq.com/docs/next/dlx>, <https://www.rabbitmq.com/docs/confirms>

## Bootstrap sequence

1. Resolve whether the platform has selected a broker family. If not, keep the topology in portable blocked-contract mode.
2. Materialize or adopt the sanitized inventory under `data/provisioning/messaging_inventory.template.json`.
3. Freeze the outbox/inbox channel matrix and linked retry, ordering, and dedupe policy packs.
4. Wire the atlas payload into the provisioning viewer so operators can inspect the exact outbox, broker, inbox, and policy boundary.
5. When the platform later selects a provider family, bind concrete queue/topic/subscription names without altering the logical channel refs or truth boundaries.

## Recovery posture

- Rebuild worker-dispatch backlog from `RunManifest`, `ManifestStageRecord`, and durable inbox/outbox rows.
- Rebuild authority-send and reconciliation backlog from `AuthorityInteractionRecord`, `SubmissionRecord`, and `ReconciliationControlContract`.
- Rebuild callback and normalization backlog from `AuthorityIngressReceipt`, `AuthorityIngressProof`, and immutable payload refs.
- Rebuild export, notification, and retention evidence from the same delivery-binding or governance rows that originally authorized them.
- Restore drills stay blocked until queue rebuild, audit continuity, privacy reconciliation, and authority rebuild gates all pass.

## Typed gaps

- Concrete broker product, namespace creation, throughput quota, and IAM details remain blocked by platform/provider selection.
- Secret aliases are frozen as logical refs only; live credentials are deferred to the future provider-adoption pass.

# Cache And Resume Store Runbook

- Last verified: 2026-04-18T20:40:00Z
- Flow ID: `provision-cache-and-stream-resume-store`
- Provider posture: `PROVIDER_SELECTION_REQUIRED`
- Topology mode: `DISPOSABLE_SHARED_CACHE_PLUS_ROUTE_BOUND_RESUME_METADATA_WITH_STRICT_PARTITION_ISOLATION`

## Purpose

Freeze the disposable shared-cache and route-bound resume topology for manifest shells, workspace continuity,
portal continuity, upload-session recovery, and native hydration without letting cache speed outrun legal visibility.

## Non-negotiable boundaries

- Caches and resume stores are accelerators only. They are never the legal source of route, session, visibility, or workflow truth.
- Raw resume tokens are transport material only. Persisted state stores hashed envelopes, frontier, and invalidation posture only.
- Tenant, client, session, access, masking, route, object, and preview drift all invalidate reuse immediately even if TTL remains.
- Cache-only restoration may restore bounded read-only context only. Mutation remains blocked until fresh legality is re-established.
- Structured cache purge also clears local derivatives that could leak stale legal posture: scene restoration payloads, previews, temp exports, and local indices.

## Surface families

- Manifest experience
- Collaboration workspace
- Client portal workspace
- Upload-session recovery
- Native hydration

## Provider options reviewed

- `AWS_ELASTICACHE_SERVERLESS_VALKEY` (Amazon ElastiCache Serverless (Valkey / Redis OSS)): <https://docs.aws.amazon.com/AmazonElastiCache/latest/APIReference/API_CreateServerlessCache.html>, <https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/in-transit-encryption.html>, <https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Clusters.RBAC.html>, <https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/data-security.html>
- `GCP_MEMORYSTORE_REDIS_CLUSTER` (Google Cloud Memorystore for Redis Cluster): <https://cloud.google.com/memorystore/docs/cluster/memorystore-for-redis-cluster-overview>, <https://cloud.google.com/memorystore/docs/cluster/manage-iam-auth>, <https://cloud.google.com/memorystore/docs/cluster/manage-in-transit-encryption>, <https://cloud.google.com/memorystore/docs/cluster/about-persistence>, <https://cloud.google.com/memorystore/docs/cluster/about-cmek>
- `AZURE_MANAGED_REDIS` (Azure Managed Redis): <https://learn.microsoft.com/en-us/azure/redis/overview>, <https://learn.microsoft.com/en-us/azure/redis/secure-azure-managed-redis>, <https://learn.microsoft.com/en-us/azure/redis/entra-for-authentication>, <https://learn.microsoft.com/en-us/azure/redis/tls-configuration>, <https://learn.microsoft.com/en-us/azure/redis/how-to-persistence>
- `SELF_HOSTED_REDIS_CLUSTER` (Self-hosted Redis Cluster): <https://redis.io/docs/latest/operate/oss_and_stack/management/security/>, <https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/>, <https://redis.io/docs/latest/operate/oss_and_stack/management/security/encryption/>, <https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/>

## Bootstrap sequence

1. Resolve whether the platform has selected a cache provider family. If not, keep the topology in portable blocked-contract mode.
2. Materialize or adopt the sanitized inventory under `data/provisioning/cache_inventory.template.json`.
3. Freeze the partition-key contract, resume-token binding policy, TTL plus invalidation matrix, local-versus-shared policy, and contract-map bridge.
4. Wire the atlas payload into the provisioning viewer so operators can inspect identity, resume law, TTL, and purge posture without using provider-console vocabulary.
5. When a cache provider is later selected, bind namespaces, ACLs, and runtime aliases without altering the logical family refs, key law, or invalidation semantics.

## Recovery posture

- Shared-cache loss is recoverable by re-reading durable projections, snapshots, and stream fronts from server truth.
- Resume metadata loss is recoverable by issuing a fresh snapshot or explicit rebase rather than replaying guessed local continuity.
- Native disk cache loss is acceptable; relaunch falls back to fresh snapshot and live legality.
- Restore drills must prove cold-cache behavior, schema-drift purge, access-rebind posture, and cache-only restoration gates before promotion.

## Typed gaps

- Concrete cache product, namespace creation, ACL surface, and encryption binding remain blocked by platform/provider selection.
- Runtime secret aliases remain logical refs only; live credentials are deferred to the future provider-adoption pass.

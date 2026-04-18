# Secret Store and KMS Bootstrap Runbook

Generated for `pc_0049` on `2026-04-18`.

This runbook governs the root secret boundary that later platform, provider, and runtime tasks must adopt. It closes the gap between the repository's existing secret law and an executable, machine-readable topology for:

- secret namespaces
- alias families
- wrapping-key families
- provider selection posture
- least-privilege access grants
- rotation, revoke, and recovery evidence

The checked-in machine-readable sources for this runbook are:

- [`config/secrets/secret_alias_catalog.json`](../../config/secrets/secret_alias_catalog.json)
- [`config/secrets/key_hierarchy_and_envelope_policy.json`](../../config/secrets/key_hierarchy_and_envelope_policy.json)
- [`config/secrets/access_policy_matrix.json`](../../config/secrets/access_policy_matrix.json)
- [`config/secrets/rotation_and_revocation_policy.json`](../../config/secrets/rotation_and_revocation_policy.json)
- [`data/provisioning/secret_root_inventory.template.json`](../../data/provisioning/secret_root_inventory.template.json)
- [`infra/secrets/contracts/secret_root_topology.schema.json`](../../infra/secrets/contracts/secret_root_topology.schema.json)

## Current Decision Posture

The cloud platform and secret provider are still unresolved in the repository's dependency register. Because of that, this task deliberately does **not** pretend that AWS, GCP, Azure, or Vault has already been selected.

The active posture is:

- `selection_status = PROVIDER_SELECTION_REQUIRED`
- `root_posture = LOGICAL_TOPOLOGY_FROZEN_PROVIDER_UNRESOLVED`
- `phase_hsm_requirement = CLOUD_KMS_OR_MANAGED_HSM_CAPABLE_ROOT_SATISFIES_PHASE_01`

This means:

- alias names, namespace boundaries, grant posture, and rotation law are frozen now
- live resource IDs, account IDs, project IDs, subscription IDs, and policy document IDs remain deferred
- later provider bootstrap work must adopt these names and grants instead of inventing new ones

## Candidate Provider Stacks

The current official sources used to freeze the option matrix were revalidated on `2026-04-18`:

- AWS: [Secrets Manager data protection](https://docs.aws.amazon.com/secretsmanager/latest/userguide/data-protection.html), [Secrets Manager encryption](https://docs.aws.amazon.com/secretsmanager/latest/userguide/security-encryption.html), [AWS KMS rotation](https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html)
- Google Cloud: [Secret Manager CMEK](https://docs.cloud.google.com/secret-manager/docs/cmek), [Cloud HSM](https://docs.cloud.google.com/kms/docs/hsm), [Use Cloud KMS keys in Google Cloud](https://docs.cloud.google.com/kms/docs/use-keys-google-cloud)
- Azure: [About keys](https://learn.microsoft.com/en-us/azure/key-vault/keys/about-keys), [Managed HSM](https://learn.microsoft.com/en-us/azure/key-vault/managed-hsm/), [Soft-delete overview](https://learn.microsoft.com/en-us/azure/key-vault/general/soft-delete-overview)
- Vault: [How Vault works](https://developer.hashicorp.com/vault/docs/about-vault/how-vault-works), [Secrets engines](https://developer.hashicorp.com/vault/docs/secrets), [KV engine](https://developer.hashicorp.com/vault/docs/secrets/kv)

The current design inference from those sources plus the algorithm corpus is:

- a customer-managed KMS root is the phase-01 default
- an HSM-capable root is enough for production-like and break-glass partitions in this phase
- a dedicated single-tenant HSM fleet is **not** mandatory until a later compliance or platform decision explicitly requires it

That final point is an implementation inference from the corpus, not a direct statement from any provider source.

## Namespace Law

The canonical namespace plan is reused directly from the environment catalog work:

- local and bootstrap only:
  - `sec_local_authoring`
  - `sec_local_provisioning_sandbox`
  - `sec_ci_ephemeral`
  - `sec_ephemeral_review`
- runtime:
  - `sec_sandbox_runtime`
  - `sec_preprod_runtime`
  - `sec_production_runtime`
  - `sec_drill_runtime`
- authority:
  - `sec_sandbox_web_authority`
  - `sec_sandbox_desktop_authority`
  - `sec_sandbox_batch_authority`
  - `sec_preprod_web_authority`
  - `sec_preprod_desktop_authority`
  - `sec_preprod_batch_authority`
  - `sec_production_web_authority`
  - `sec_production_desktop_authority`
  - `sec_production_batch_authority`
- restore and break-glass:
  - `sec_drill_restore_material`

Non-negotiable rule:

- sandbox, preprod, production, and drill never share a concrete namespace
- any alias family that spans multiple environments must keep the namespace placeholder in its path template

## Key Hierarchy Law

The hierarchy is intentionally simple:

1. provider-managed default secret-store key
2. customer-managed KMS root
3. optional HSM-capable root
4. wrapping families:
   - `key.wrap.runtime-config`
   - `key.wrap.authority-credentials`
   - `key.wrap.provider-ingest`
   - `key.wrap.bootstrap-and-tooling`
   - `key.wrap.break-glass`

The separation matters:

- secret storage responsibility is not the same as wrapping-key responsibility
- authority credentials do not share a wrapping family with general runtime passwords
- one-time provider reveal material uses the provider-ingest family
- break-glass and restore material stay in their own wrapping family

## Access Policy Law

The access matrix intentionally separates:

- metadata listing
- secret write
- secret read
- decrypt or unwrap
- rotate version
- disable or revoke
- policy administration
- attestation or audit

Current role posture:

- `role.bootstrap_operator`: may create placeholders and manage bootstrap policy, but is not a standing read client
- `role.ci_deploy`: metadata and attestation only
- `role.runtime_api`: runtime config and callback verification only
- `role.runtime_worker`: authority and provider secret consumer
- `role.projection_service`: metadata only
- `role.support_adapter`: explicit adapter scope only
- `role.observability_agent`: monitoring scope only
- `role.security_rotation`: write, rotate, revoke, attest; no general read path
- `role.audit_reader`: metadata only
- `role.break_glass_operator`: production and drill only, dual-control required

## Rotation and Revocation Law

Every rotatable alias family has a policy row. The most important ones are:

- runtime database credentials: `90` day cadence, short overlap
- HMRC authority client secrets: `180` day cadence, one-time reveal, max `2` active versions during planned cutover
- IdP client secrets: `180` day cadence
- email tokens and webhook secrets: `180` day cadence
- monitoring DSNs: `365` day cadence
- push provider keys: `365` day cadence with a longer overlap window
- bootstrap operator tokens: `1` day cadence
- break-glass recovery material: rotate after any real use and at least annually

Soft-delete conflict law:

- if a provider keeps deleted versions recoverable, Taxat still marks the alias `REVOKED` immediately
- provider recovery windows are treated as infrastructure recovery affordances, not as continued active authorization

## Bootstrap Procedure

Use the canonical bootstrap flow in [`infra/secrets/bootstrap/provision_secrets_manager_kms_or_hsm_roots.ts`](../../infra/secrets/bootstrap/provision_secrets_manager_kms_or_hsm_roots.ts).

Current safe execution modes:

1. declare-only or dry-run inventory generation
2. provider-option review against the official docs above
3. later provider adoption once the cloud/platform choice is made

Current blocked posture:

- do not invent cloud resource IDs
- do not invent IAM policies or vault policy paths
- do not silently choose AWS, GCP, Azure, or Vault

## Recovery and Emergency Handling

For compromise, mis-rotation, or restore events:

1. mark the affected alias version revoked immediately
2. preserve append-only lineage and attestation refs
3. issue a replacement version under the same canonical alias family
4. prove cutover or recovery through verification artifacts
5. keep any provider soft-delete or recoverable state out of the active authorization model

Break-glass recovery material is special:

- dual-control is mandatory
- scope is narrow
- use is auditable
- post-use rotation is mandatory

## Known Gaps

The remaining explicit gaps are intentional and machine-registered:

- no provider stack has been selected yet
- no cloud resource IDs or policy document IDs are frozen yet
- `pc_0038` created vault-binding outputs before this root bootstrap existed, so the ordering tension remains explicit rather than hidden

That gap is now structurally contained: later provider tasks can adopt this topology without renaming aliases, widening grants, or collapsing authority, runtime, and break-glass boundaries together.

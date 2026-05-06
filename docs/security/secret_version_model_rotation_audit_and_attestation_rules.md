# SecretVersion Model, Rotation Audit, and Attestation Rules

Status: `pc_0211` implemented.

Assumption recorded: `ASSUMPTION_BACKEND_SECURITY_PACKAGE_CREATED`. The repository did not have `packages/backend-security`, so this card creates it as the canonical backend boundary for governed secret-version lineage.

## Canonical State Machine

`SecretVersion` is the only package-level contract for runtime secret/key-version activation, cutover, retirement, revocation, historical reads, and send-time revalidation.

Legal transitions:

- `ISSUED -> ATTESTED -> ACTIVE -> ROTATING -> RETIRED`
- `ISSUED|ATTESTED|ACTIVE|ROTATING|RETIRED -> REVOKED`
- `RETIRED` is historical-read only and requires `rotation_started_at`, `retired_at`, `historical_read_window_until`, and `superseded_by_secret_version_id`.
- `REVOKED` is not send-capable and not historical-readable. It carries `revoked_at` and `revocation_reason_code`, and clears activation, rotation, retirement, historical-window, and supersession fields.

State/time posture follows `Algorithm/schemas/secret_version.schema.json`, `Algorithm/scripts/validate_contracts.py`, and `Algorithm/tools/forensic_contract_guard.py`:

- `activated_at` is legal only for `ACTIVE`, `ROTATING`, and `RETIRED`.
- `rotation_started_at` is legal only for `ROTATING` and `RETIRED`.
- `retired_at`, `historical_read_window_until`, and `superseded_by_secret_version_id` imply `RETIRED`.
- `revoked_at` and `revocation_reason_code` imply `REVOKED`.
- `expires_at`, attestation, activation, rotation, retirement, historical-window, and revocation chronology must never invert.
- `superseded_by_secret_version_id` cannot point to the same version or create a cycle.

## Attestation Payload

`buildSecretVersionAttestationPayload` binds:

- `secret_version_id`
- `secret_class`
- `store_ref`
- `key_version_ref`
- `policy_profile_ref`
- `lineage_ref`
- `issued_at`
- `expires_at`
- `attested_at`
- `attestation_authority_ref`
- sorted non-empty `attestation_evidence_refs`
- attestation scope: `RUNTIME_ACTIVATION`, `ROTATION_CANDIDATE`, or `RELEASE_PROMOTION`

The persisted `attestation_ref` is deterministic:

```text
secret-attestation://sha256/<stable-json-hash(attestation-payload)>
```

Activation is refused unless attestation is known. Live resolution also fails closed when the caller supplies a required attestation ref that does not match the active record.

## Cutover And Historical Reads

`startSecretVersionRotation` moves the current version from `ACTIVE` to `ROTATING` and activates the successor only after validating same-lineage cutover:

- same `lineage_ref`, which represents subject/client/scope binding
- same `secret_class`
- same `policy_profile_ref`
- same governed `store_ref`
- successor must be attested
- successor activation cannot predate `rotation_started_at`

`retireRotatedSecretVersion` converts the rotating predecessor to `RETIRED`, records the successor id, and opens an explicit historical-read window. `resolveHistoricalSecretVersion` returns retired records only inside that window and only when attestation is known.

## Send-Time Revalidation

`validateQueuedAuthoritySecretVersionForSend` is the central send-time boundary for queued authority work. It rechecks the queued version id, lineage, policy profile, optional secret class, optional key version, and optional attestation before resolving the current active version.

If the queued version is still active, the send remains clear. If rotation completed while the send was queued, the function only allows rebinding when:

- the queued version is `RETIRED`;
- its `superseded_by_secret_version_id` equals the current active version; and
- the queued work carries `explicit_rotation_successor_secret_version_id`.

This preserves the Taxat rule that rotation may happen only inside the same subject/client/scope lineage and never silently swaps a request to a different authority link, subject, policy, or secret lineage.

## Raw Secret Boundary

The model and repository persist only opaque references. `SecretVersion` rejects known raw-material keys such as `raw_secret`, `secret_material`, `access_token`, `refresh_token`, `bearer_token`, `private_key`, and `plaintext`. Raw values remain outside this package in the governed secret store or vault boundary.

## Verification

Deterministic tests cover activation, rotation, retirement, revocation, historical-read windows, attestation failure, send-time revalidation, explicit successor rebinding, lineage drift, self-supersession, cyclic supersession, and raw-material rejection.

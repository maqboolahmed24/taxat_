# Config Version, CCR, and Config Freeze Models

This package now treats governed configuration as three separate durable objects:

- `ConfigVersion` is the immutable release artifact for one governed config type. It carries the content hash, lifecycle state, approval or verification evidence, and supersession/revocation posture.
- `ConfigChangeRequest` is the mutation lane. It records review, test, approval, implementation, and rollback lineage for a proposed config change without pretending to be the released config itself.
- `ConfigFreeze` is the manifest-bound execution basis. It records exactly one frozen entry for each required config type plus the top-level policy/profile refs that make up the whole config surface.

## Catalog and Completeness

The required config-type catalog is `CONFIG_TYPE_CATALOG_V1`, in this canonical order:

1. `COMPUTATION_RULES`
2. `PARITY_THRESHOLDS`
3. `TRUST_THRESHOLDS`
4. `RISK_THRESHOLDS`
5. `WORKFLOW_POLICY`
6. `OVERRIDE_POLICY`
7. `RETENTION_POLICY`
8. `EVIDENCE_CONFIDENCE_POLICY`
9. `CANONICALIZATION_RULES`
10. `CONNECTOR_MAPPING_RULES`
11. `PROVIDER_CONTRACT_PROFILE`
12. `MATERIALITY_PROFILE`
13. `AMENDMENT_MATERIALITY_PROFILE`
14. `MASKING_EXPORT_POLICY`

`ConfigFreeze.entries[]` is normalized to that order and must contain exactly one entry per type. `required_config_types_present[]` must equal the same ordered list, `config_completeness_state` must be `COMPLETE_REQUIRED_CONFIG_SET`, and `config_consumption_mode` must be `FROZEN_CONFIG_ONLY`.

## Hash Inputs

`config_freeze_hash` is computed from the ordered entry vector:

`config_type`, `version_id`, `content_hash`, `provider_api_version`, `provider_schema_version`, and `status_at_freeze`.

`config_surface_hash` is computed from:

`config_freeze_hash`, approval snapshot ref, materiality refs, retention/profile/policy refs, schema bundle hash, and feature flag snapshot hash. A null feature flag snapshot uses the explicit `<NONE>` sentinel, so null posture is deterministic and distinct from a concrete hash.

## Source Lineage

`DIRECT_REQUEST_RESOLUTION` means the current manifest freshly resolved config. All `source_config_*` fields must be null, even if another freeze happens to have identical hashes.

`REPLAY_EXACT_REUSE`, `RECOVERY_EXACT_REUSE`, and `HISTORICAL_EXPLICIT_REUSE` mean the current manifest reuses a prior frozen surface. All `source_config_*` fields must be present, and `config_freeze_hash` and `config_surface_hash` must exactly equal the source hash mirrors.

## Compliance Use

New compliance-capable runs can freeze only `APPROVED` versions. Compliance replay may reference historically frozen `DEPRECATED` or `REVOKED` versions only under the replay carve-out. Analysis mode may freeze draft, candidate, verified, approved, or deprecated config but may not consume revoked config.

The lifecycle machines enforce named transitions:

- `ConfigVersion`: `DRAFT -> CANDIDATE -> VERIFIED -> APPROVED -> DEPRECATED|REVOKED -> RETIRED`
- `ConfigChangeRequest`: `OPEN -> UNDER_REVIEW -> TESTING -> APPROVED|REJECTED -> IMPLEMENTED -> ROLLED_BACK`

Every persisted state carries a `STATE_TRANSITION_CONTRACT_V1` contract with the machine code, state field, named event, applied timestamp, and audit ref.

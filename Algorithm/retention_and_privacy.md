# Retention & Privacy

## Retention tagging
Every artifact and evidence item is created with `RetentionTag`:
- retention_class (e.g., regulated_record, derived_artifact, operational_log, analytics_projection)
- expires_at (computed from tenant policy + statutory baseline)
- legal_hold (boolean / reference)
- erasure_constraints (what can be erased and how)

## Expiry behaviour
When underlying evidence expires:
- derived artifacts remain, but MUST record a limitation note that upstream evidence is unavailable
- provenance paths still resolve, but link to "expired" placeholders

## Erasure workflow
- mark client as `ERASURE_REQUESTED`
- resolve holds and statutory constraints
- delete or pseudonymize eligible evidence
- re-project analytics graphs if policy allows
- emit `ErasureCompleted` with full audit record

## Data minimisation defaults
- do not store authority login credentials (store tokens only, encrypted)
- store least data needed for evidence and traceability
- implement per-tenant keying / envelope encryption for object payloads

Detailed retention classes, legal-hold rules, error taxonomy, and observability correlation semantics
are defined in `retention_error_and_observability_contract.md`.

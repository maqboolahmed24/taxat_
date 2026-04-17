# Implementation Conventions

This document defines standing authoring and schema-discipline conventions for the Algorithm corpus.

## 1. Corpus authoring conventions

- Terms SHALL be defined consistently across `glossary.md`, `data_model.md`, and the contracts that serialize or interpret them.
- The end-to-end technical flow SHALL remain in `core_engine.md`, while reusable procedures and bounded modules SHALL remain in `modules.md`.
- Implementation variants and worked embodiments MAY appear where they clarify required behavior, but they SHALL NOT weaken or restate normative rules inconsistently.
- Invariants, failure handling, and executable-style scenarios SHALL stay aligned with `invariants_and_gates.md` and `test_vectors.md`.
- Blueprint-facing support docs SHALL move together when a first-class object family, interaction layer, or route-visible read model is introduced or renamed. At minimum, `README.md`, `glossary.md`, `constraint_coverage_index.md`, `embodiments_and_examples.md`, `invention_and_system_boundary.md`, `AUDIT_FINDINGS.md`, and `PATCH_RESOLUTION_INDEX.md` SHALL not lag the authoritative contracts by release time.
- `constraint_traceability_register.json` SHALL move in the same change set as `constraint_coverage_index.md`, `README.md`, `test_vectors.md`, and every named downstream contract whenever a live named constraint changes; coverage entries SHALL remain concrete file-plus-term anchors, not vague prose pointers.
- Shared interaction contracts such as `PortalInteractionLayer`, `OperatorInteractionLayer`, and `GovernanceInteractionLayer` SHALL be referenced by canonical name in support docs; standalone queue/list read models such as `WorkInboxSnapshot` and `CustomerRequestListSnapshot` SHALL not be collapsed back into their parent surfaces as if they were only implementation detail.
- Support/reference docs SHALL point at the current end-to-end architecture and closure model rather than stale phases, stale object names, or implied pre-`SYS-01` shell grammars.
- `README.md`, `constraint_coverage_index.md`, and `test_vectors.md` SHALL keep explicit prompt-stage coverage maps for major blueprint families, critical constraint families, and high-signal acceptance-vector ranges so no blueprint family is left outside an owning execution path.
- Live obligations SHALL stay distinct from historical cleanup notes. Historical numbered defects belong in `AUDIT_FINDINGS.md` and `PATCH_RESOLUTION_INDEX.md`; `constraint_coverage_index.md` and `constraint_traceability_register.json` SHALL describe only current authoritative constraints.
- The blueprint SHALL NOT claim end-to-end completion until the full `SYS-00 -> SYS-04` system-pass chain is closed and `Algorithm/scripts/validate_contracts.py --self-test` passes on the current corpus.

## 2. Schema conventions

- Sealed contracts SHALL be schema-closed by default with `additionalProperties: false` for direct objects.
- Composed schemas that rely on `allOf`, `oneOf`, or equivalent composition SHALL use `unevaluatedProperties: false` to prevent silent shape drift.
- Intake artifacts SHALL use versioned first-class schemas in `schemas/`, and artifact envelopes SHALL record schema identity explicitly.
- Schema changes SHALL preserve deterministic replay semantics and SHALL remain synchronized with the prose contracts that define the same objects.

## 3. Deterministic serialization and hashing conventions

- Canonical hashes SHALL be produced from a single project-wide canonical serialization profile. The
  profile SHALL freeze Unicode normalization, object-key ordering, array ordering rules, number
  formatting, null handling, and timezone normalization before bytes are hashed.
- `execution_basis_hash` and `deterministic_outcome_hash` SHALL exclude persistence-only identifiers,
  queue metadata, and write timestamps unless those fields change legal meaning.
- Equality by semantic intent is insufficient where replay contracts require equality by frozen basis;
  implementations SHALL compare the canonical hashes and surface typed mismatch reasons when they differ.

## 4. Replay-safe runtime conventions

- Exact replay code paths SHALL read historical artifacts through dedicated replay loaders rather than
  ordinary live connectors or mutable caches.
- Recovery or replay orchestration SHALL fail closed on missing, corrupt, or schema-incompatible
  historical artifacts; it SHALL not silently fall back to fresh collection or fresh authority reads.
- Replay attestation generation SHALL be part of terminalization, not an optional log-side helper, so
  every replay outcome becomes durably queryable.

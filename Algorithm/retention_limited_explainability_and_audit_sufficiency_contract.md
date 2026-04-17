# Retention-Limited Explainability And Audit Sufficiency Contract

## Purpose

The system SHALL preserve retention limitation as typed, scrutiny-safe evidence posture instead of
allowing decisive proof, enquiry output, or compliance-significant audit history to collapse into
silent absence after expiry, pseudonymisation, tombstoning, or erasure.

The shared machine contract for this boundary is
`schemas/retention_limited_explainability_contract.schema.json`.

## Governing Model

Each governed artifact SHALL bind one `retention_limited_explainability_contract{...}` with:

- `boundary_scope`
- `surface_role`
- `surface_specific_binding_policy`
- fixed policies that require:
  - decisive limitations to remain typed and present;
  - `AVAILABLE` explanation posture only when full decisive renderability survives;
  - omissions and limitation notes to stay explicit instead of degrading into negative absence;
  - post-expiry audit evidence to retain object, reason, and lineage minimums; and
  - silent limitation ambiguity to fail closed.

The governed surfaces are:

- `PROOF_BUNDLE`: `ProofBundle`
- `EVIDENCE_GRAPH`: `EvidenceGraph`
- `ENQUIRY_PACK`: `EnquiryPack`
- `AUDIT_EVENT`: `AuditEvent`

## Artifact Rules

`ProofBundle` SHALL retain both `retention_binding{...}` and `limitation_notes[]`. If decisive
support survives only as a limited, tombstoned, or pseudonymised artifact, the bundle SHALL
degrade render posture from `AVAILABLE` to `LIMITED` or `FAILED` and SHALL keep the affected
decisive refs explicit in `limitation_notes[]`.

`EvidenceGraph` SHALL treat retention limitation as current graph posture, not as a missing edge.
When critical limited or erased counts are non-zero, the graph SHALL retain `limitation_notes[]`
and at least one filing-critical target assessment SHALL stop advertising `AVAILABLE`.

`EnquiryPack` SHALL retain `retention_binding{...}`, `limitation_notes[]`, and `omission_entries[]`
whenever exportable explanation is retention-limited. A pack SHALL not appear complete while
silently excluding decisive proof.

`AuditEvent` SHALL retain minimum reconstruction context even after payload expiry. Hash-only,
tombstoned, or erased payload posture SHALL still preserve object refs, reason codes, event payload
hash, and explicit lineage refs so legally significant history remains reconstructible.

## Required Outcomes

The architecture SHALL reject these ambiguity classes:

- decisive proof degradation that removes edges or artifacts without typed retention notes;
- `explanation_status = AVAILABLE` when decisive retained support survives only as limited,
  tombstoned, pseudonymised, or erased evidence;
- enquiry exports that omit retention binding, omission entries, or limitation notes under
  retention pressure;
- audit events whose payload bodies expire without preserving object, reason, and lineage minimums;
  and
- retention-limited truth rendered as simple absence instead of explicit present-but-limited
  evidence.

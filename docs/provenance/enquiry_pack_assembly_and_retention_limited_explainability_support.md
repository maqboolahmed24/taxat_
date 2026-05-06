# Enquiry Pack Assembly And Retention-Limited Explainability Support

`pc_0130` adds the durable explanation artifact that sits after `EvidenceGraph` and `ProofBundle`.

## Source Set

`generateEnquiryPack` binds exactly one graph, one proof bundle, one target, one primary path, and one bounded supporting set. It reuses persisted graph lineage, proof bundle path refs, decisive evidence refs, authority refs, config refs, limitation notes, and retention binding. It does not embed raw source payloads.

## Critical Paths

`primary_path_ref` is always first in `critical_path_refs[]`. The remaining critical refs are deterministic: the proof bundle rejected path refs, plus any explicit critical path refs, sorted after the primary ref.

## Omission Grammar

Omissions are typed records:

- `omission_class`: `MASKING`, `RETENTION`, `PRIVACY`, `AUTHORITY_LIMIT`, or `EXTERNAL_LIMITATION`
- `affected_refs[]`: primary path, critical paths, or controlling proof bundle refs
- `declared_reason_code`: machine-readable reason for why material is withheld

Retention-limited packs always carry both limitation notes and omission entries bound to the affected critical refs.

## Masking And Externalization

`buildMaskingPosture` derives `NONE`, `MASKED`, `REDACTED`, or `LIMITED_EXPORT` from explanation status, retention binding, and limitation/omission classes.

`buildExternalizationGovernance` persists the export/download/preview policy packet. It freezes the target slice, masking state, limitation state, delivery targets, and blocking context tokens. Preview points to the human-readable render ref and download points to the machine-readable ref unless explanation status is `FAILED`.

## Render Contract

The pack stores stable semantic refs:

- top-level `human_readable_ref`
- top-level `machine_readable_ref`
- `render_contract.operator_render_ref`
- `render_contract.reviewer_render_ref`
- `render_contract.filing_artifact_ref`

`AVAILABLE` requires all render-contract refs, `LIMITED` requires at least one, and `FAILED` clears all three while keeping auditable human/machine target refs on the pack itself.

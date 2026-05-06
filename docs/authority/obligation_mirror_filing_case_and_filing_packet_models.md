# Authority Foundation Models

`pc_0133` adds `packages/backend-authority`, marked `ASSUMPTION_AUTHORITY_PACKAGE_CREATED` because the shared operating contract requires an authority package and none existed.

The implementation cross-checks `obligation_mirror`, `filing_case`, `filing_packet`, `authority_truth_contract`, `authority_ingress_proof_contract`, `authority_reconciliation_control_contract`, `execution_mode_boundary_contract`, and `state_transition_contract` schemas; Algorithm data model, state-machine, modules, authority interaction protocol, patch-resolution notes, and authority test vectors.

## Boundaries

- `ObligationMirror.ready_manifest_ref` is legal only in `READY_TO_FILE`.
- `ObligationMirror.current_submission_ref` is legal only in `SUBMITTED_PENDING`.
- `ObligationMirror.last_confirmed_submission_ref` is legal only in `MET_CONFIRMED`.
- `MET_CONFIRMED` requires authority evidence, status ref, and confirmed settlement lineage. Internal readiness cannot produce it.
- `FilingCase.current_packet_ref` is the durable packet-legality anchor; case services do not reconstruct packet approval, declaration acknowledgement, notice resolution, or filing gate posture.
- `FilingPacket.PREPARED` can persist with pending approval and declaration acknowledgement.
- `FilingPacket.APPROVED_TO_SUBMIT` requires current trust/parity or explicit override, bound filing gate, closed proof, resolved approval and declared-basis acknowledgement, and notice resolution when notice steps exist.
- `FilingPacket` records cannot mutate in place after `SUBMITTED`.

## Submission Boundary

No `pc_0133` service creates or transitions `SubmissionRecord`. The package only accepts refs to existing submission artifacts where the schemas allow them. `SubmissionRecord` lifecycle ownership remains with `pc_0134`.

## Generated Binding Note

Generated type names exist for these schemas, but the generated shard currently serializes nullable schema timestamp fields as non-null TypeScript aliases. The backend-authority models therefore use local schema-shaped record types, matching the backend-twin precedent, while enforcing the authoritative JSON schema and Python validator invariants.

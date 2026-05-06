# Filing Notice Step And Resolution Flow

`pc_0143` makes packet-local filing notices durable artifacts instead of UI-local prompts.

## Derivation

`DERIVE_PACKET_NOTICE_STEPS(...)` runs only after `BUILD_FILING_PACKET(...)` has produced a
`PREPARED` packet. The canonical step order is:

1. `DECLARED_BASIS_ACK_REQUIRED`
2. `DISCLAIMER_ACK_REQUIRED`
3. `PACKET_APPROVAL_REQUIRED`

The step id is stable for the manifest, packet, and ordered step code. Each step carries the owning
`packet_id` in `packet_refs[]`; repository and service validation fail closed if the step set drifts
from the owning packet.

## Resolution

`RESOLVE_FILING_NOTICES(...)` turns the ordered step set into exactly one
`FilingNoticeResolution`. `notice_refs[]` mirrors `notice_step_refs[]` byte-for-byte. A satisfied
resolution requires resolved approval posture, resolved declaration-basis acknowledgement posture,
and no unresolved reason codes. An unsatisfied resolution requires non-empty
`unresolved_reason_codes[]` and at least one unresolved component state.

`declared_basis_ack_state = NOT_APPLICABLE` is explicit and legal when no declaration-basis notice
exists. That state may appear in a satisfied resolution and on promoted packets that have no
declaration-basis acknowledgement step.

## Packet Promotion

`applyNoticeResolutionToFilingPacket(...)` persists the resolved step records, persists the
resolution, and promotes the packet with:

- ordered `notice_step_refs[]`
- `notice_resolution_ref`
- `approval_state` copied from the resolution
- `declared_basis_ack_state` copied from the resolution
- `filing_gate_ref`

An unsatisfied resolution cannot promote a packet. A packet carrying notice steps cannot become
`APPROVED_TO_SUBMIT` without a non-null `notice_resolution_ref`.

## Portal Contract

The portal consumes a backend-authored packet notice view model. It may render acknowledgements,
blocked posture, stale posture, and compact satisfied state, but it does not recompute filing
legality from checkboxes or query parameters. Stale or superseded packets keep old acknowledgements
as read-only carry-forward context and keep sign-off disabled.

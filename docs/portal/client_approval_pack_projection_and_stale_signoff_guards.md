# Client Approval Pack Projection and Stale Sign-Off Guards

`ClientApprovalPack` is now projected by `buildClientApprovalPack(...)`; workspace approval rows are built from the same source through `buildClientApprovalCenterPack(...)` and `buildClientApprovalCenter(...)`.

## Guard Boundary

- `approval_pack_hash` identifies the exact legal pack content and acknowledgement basis the client reviewed. Sign and acknowledgement commands must echo it through `if_match_approval_pack_hash`.
- `view_guard_ref` identifies the current portal/render guard for the approval surface. A pack with matching content but stale route guard becomes `REBASE_REQUIRED` and remains read-only until reconfirmed.
- `stale_protection_state` is derived from durable blocker inputs: `SUPERSEDED` for replaced content, `EXPIRED` for expired packs, `REBASE_REQUIRED` for guard drift or cancellation cleanup, and `CURRENT` only when the pack/hash/guard remains authoritative.

## Readiness and Recovery

The readiness score is the frozen schema formula:

`0.15*view + 0.20*digest_ack + 0.20*declaration_ack + 0.15*approval_ack + 0.30*min(stale_factor, step_up_factor)`

`SUPERSEDED` and `EXPIRED` force readiness to `0`; expired step-up proof caps readiness at `40`. Signed states fail closed unless the pack is `CURRENT`, readiness is at least `85`, digest and declaration acknowledgement lineage exists, and required step-up proof is still fresh.

Recovery posture is derived from blockers:

- `RECONFIRM_INLINE`: route/view guard drift.
- `STALE_REVIEW_REQUIRED`: superseded or expired pack.
- `STEP_UP_RETRY`: missing or expired required step-up.
- `HARD_RESET_REQUIRED`: cancelled pack.
- `NONE`: signable current pack or settled signed receipt only.

## Artifact Targets

Standalone `ClientApprovalPack` artifacts expose declaration preview only. Workspace approval rows expose declaration preview plus declaration download/print while the pack is current and unsigned. Once a receipt is issued, workspace download/print targets switch to receipt refs; declaration refs remain distinct and never masquerade as receipts.

Non-current packs keep `primary_subject_refs` for labelled context but clear authoritative/default targets and publish blocked externalization with a stale context token.

## Command Rejection

`CLIENT_PORTAL_SIGN_APPROVAL_PACK` stale hash rejection now returns `VIEW_STALE` with:

- `latest_approval_pack_ref`
- `stale_guard_family = APPROVAL_PACK_HASH`
- `latest_stale_guard_value`
- the frozen mutation-precondition binding
- portal-safe recovery surface `CUSTOMER_ACTIVITY`


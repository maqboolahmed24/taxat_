# Twin Reconciliation, Interpretation, and Portfolio Summary Services

`pc_0132` completes the twin follow-up layer in `packages/backend-twin`. It cross-checks the three twin follow-up schemas, validator functions, forensic guards, `twin_view_contract.md`, `modules.md`, `state_machines.md`, `data_model.md`, authority-truth separation, patch notes, and test vectors `TV-45`, `TV-49D`, and `TV-50`.

## Reconciliation State

- The reconciliation dedupe key is `TWIN_RECONCILIATION_DEDUPE_V1 + twin_id + sorted target_mismatch_refs[]`. It is repository-indexed for active states only, so identical unresolved deltas map to one active reconciliation state per comparison subject chain while resolved and superseded history remains queryable.
- `ACK_PENDING` stays `WAITING_ON_AUTHORITY` only while the persisted automatic budget and deadline are still open.
- Expired waiting, exhausted automatic budget, baseline-missing, contradictory, rejected, and out-of-band postures open `WAITING_ON_OPERATOR` with a deterministic workflow ref and `primary_workflow_item_ref_or_null`.
- Attempt counters, maximum attempts, deadlines, last attempt time, workflow refs, and budget state are carried forward by transition helpers. No transition path resets an exhausted budget back to a live automatic resend lane.
- `RESOLVED` requires an explicit terminal `resolution_state` and `resolved_at`; absence of workflow is not treated as proof of resolution.

## Interpretation State

`TwinInterpretationState` persists one low-noise `TWIN_PANEL` posture per twin:

- default view space: `AUTHORITY_SPACE`
- enabled spaces: source, computation, and authority
- compare mode: `DELTA_COMPARE` only when a dominant delta is retained
- default sort: `PRIORITY_RANK`
- noise filter: `ACTIONABLE_ONLY`
- summary priority: authority-first whenever reconciliation, waiting, out-of-band, or contradiction dominates
- matches collapse by default, and informational deltas are suppressed when higher-severity work exists

This keeps the operator focus stable across reconnects and prevents surfaces from falling back to audit-first rendering when the durable twin posture says reconciliation or authority waiting is the primary meaning.

## Portfolio Summary

`TwinPortfolioSummary` aggregates persisted `TwinReadinessState`, `TwinMismatchSummary`, optional `TwinView`, and optional `TwinReconciliationState` records. It does not inspect raw twin subjects or recompute comparison semantics.

The attention rank is:

```text
1000 for BLOCKED
 800 for RECONCILIATION_REQUIRED
 600 for WAITING_ON_AUTHORITY
 400 for REVIEW_REQUIRED
 200 for READY
+ 50 when safe_action_state = NO_SAFE_ACTION
+ 25 when safe_action_state = REFRESH_REQUIRED
+ highest_priority_rank from persisted TwinMismatchSummary
```

Ties are deterministic: rank descending, top mismatch ref ascending, then twin ref ascending. `top_mismatch_refs[]` is selected from persisted summaries in the same ranked order and never from raw subject comparison.

## Generated Binding Note

Generated twin types exist, but the generated shard still imports unresolved cross-file symbols when used directly. The follow-up models therefore follow the same pc0131 approach: local schema-shaped record types with field names and invariants matched to the authoritative JSON schemas and Python validator rules.

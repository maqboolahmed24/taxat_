# Artifact Affordance, Export, Print, and Browser Handoff

## Sources Cross-Checked

- `PROMPT/CARDS/pc_0188.md`
- `PROMPT/shared_operating_contract_0182_to_0189.md`
- `Algorithm/customer_client_portal_experience_contract.md`
- `Algorithm/frontend_shell_and_interaction_law.md`
- `Algorithm/data_model.md`
- `Algorithm/glossary.md`
- `Algorithm/PATCH_RESOLUTION_INDEX.md`
- `Algorithm/schemas/artifact_selection_contract.schema.json`
- `Algorithm/schemas/artifact_affordance_contract.schema.json`
- `Algorithm/schemas/externalization_governance_contract.schema.json`
- `Algorithm/scripts/validate_contracts.py`

## Runtime Contract

`packages/backend-portal/src/services/derive_artifact_affordance_contract.ts` is the portal
affordance constructor. It always emits `ARTIFACT_AFFORDANCE_V1`, keeps the visible primary subject
explicit, derives `preview_open_policy` from `history_affordance_state`, and fails closed if
`NO_CURRENT_ARTIFACT` keeps a visible subject or default target.

`packages/backend-portal/src/services/derive_portal_externalization_governance_contract.ts` is the
portal externalization constructor. It emits `EXTERNALIZATION_GOVERNANCE_V1`, binds tenant, access,
masking, visibility partition, route context, slice binding, preview/download/print targets, and
approval posture into the canonical `delivery_binding_hash`, matching the Python validator hash.
Portal document requests force print and browser handoff targets to `null`.

`packages/backend-portal/src/services/validate_artifact_target_alignment.ts` is the reusable guard.
It rejects drift between `artifact_selection`, `artifact_affordance`, and
`externalization_governance_contract`, including historical default targets, target mismatches,
wrong delivery hashes, missing blocked-context tokens, and forbidden portal handoff targets.

`packages/backend-portal/src/services/derive_artifact_focus_route_state.ts` preserves
`artifact_focus_bucket_or_null` and `artifact_focus_subject_ref_or_null` for request and approval
detail routes. Browser handoff return continuity requires the same route and focused artifact
context before any identity- or authority-owned external checkpoint is treated as lawful.

## Mapping Decisions

- `history_affordance_state = NONE` maps to
  `preview_open_policy = CURRENT_SUMMARY_FIRST_ONLY`.
- Any explicit or limited history state maps to
  `preview_open_policy = CURRENT_SUMMARY_FIRST_THEN_HISTORY_ON_DEMAND`.
- Document requests use `CURRENT_ARTIFACT` only when `current_artifact_upload_ref` points at an
  accepted current upload. Rejected or in-flight uploads use `CURRENT_REQUEST_UPLOAD`; absent current
  subjects use `NO_CURRENT_ARTIFACT`.
- Header posture is current-first: `CURRENT`, `CURRENT_WITH_HISTORY`,
  `AWAITING_CURRENT_REPLACEMENT`, `REJECTED`, `EXPIRED`, `SUPERSEDED`, `HISTORICAL`, or
  `QUARANTINED`.
- Portal document preview targets use the current upload id only when same-shell preview is
  supported. Download targets use the upload row's governed `download_ref`. Print targets stay
  `null` for binary uploads.
- Approval preview targets stay on the declaration text. Workspace approval download and print
  targets use declaration artifacts until an issued receipt exists, then move to receipt-specific
  artifacts. Declaration refs and receipt refs remain separate fields.
- `delivery_binding_hash` is derived from the same canonical payload used by
  `derive_externalization_delivery_binding_hash(...)` in the Python validator.
- External browser handoff is blocked for portal-owned artifact delivery. Identity or authority
  checkpoint handoff can be represented only with explicit return route, return focus anchor, and
  artifact focus context; return never implies completion until the governed read model settles.

## Regression Coverage

- `artifact_affordance_contract_and_handoff.spec.ts`
- `portal_artifact_selection_alignment.spec.ts`
- Existing document request, approval pack, workspace, and contract-validation tests

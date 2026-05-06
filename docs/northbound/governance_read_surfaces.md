# Governance Read Surfaces

The northbound governance read family exposes control-plane read models for dense staff/admin governance screens:

- `GET /v1/governance/tenants/{tenant_id}/overview` returns `TenantGovernanceSnapshot`.
- `GET /v1/governance/tenants/{tenant_id}/policy-snapshot` returns `GovernancePolicySnapshot`.
- `GET /v1/governance/tenants/{tenant_id}/principals` returns the mounted `PrincipalAccessView` for the selected or latest principal.
- `GET /v1/governance/tenants/{tenant_id}/roles/{role_id}` returns `RoleTemplateMatrix`.

Design decisions:

- All successful responses use `Cache-Control: no-store`.
- The principal route deliberately returns `PrincipalAccessView` rather than a separate directory DTO so the route keeps the same access workspace contract: selected principal, selected cell, active filters, focus anchor, authority-chain layers, and simulator linkage.
- Governance reads are staff/control-plane surfaces. Tenant mismatches and explicit customer/portal-only principal classes are hidden with typed `ProblemEnvelope` responses.
- Query filters are normalized into the schema-native `active_filters` objects and echoed through `interaction_layer.selected_filter_chip_refs`.
- Selection continuity remains route-visible: overview preserves `selected_canvas_object_ref` and `focus_anchor_ref`; access reads preserve `selected_principal_ref`, `selected_role_template_ref`, `selected_cell_ref`, and mounted inspector state.
- Masking, step-up, approval, and deny decisions stay in the original `AUTHORIZE(...)` vocabulary. The API does not collapse them into a local permission enum.

Contract guards:

- `TenantGovernanceSnapshot.attention_summary.attention_family`, `primary_queue_code`, and `primary_worklist_ref` are checked together before publication.
- `PrincipalAccessView` requires non-empty principal, role, capability, delegation, matrix, and authority-chain reason tokens.
- `RoleTemplateMatrix` requires stable `policy_snapshot_hash`, `version_hash`, selected-cell/focus alignment, and pending role-editor context.

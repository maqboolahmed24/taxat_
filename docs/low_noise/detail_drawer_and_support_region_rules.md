# Detail Drawer And Support Region Rules

The low-noise frame builds detail drawer state before the action strip so the frame, drawer, action strip, attention policy, and continuity contract share the same active detail module and focus anchor.

Rules implemented by `packages/backend-low-noise`:

- Detail entry points are ranked deterministically, deduplicated by module, and capped at five.
- A supplied candidate set is authoritative. Requested active or suggested modules are not invented when the candidate set makes them unavailable, masked, or unlawful.
- Staff-only or non-customer-safe detail candidates are removed for `CUSTOMER_SAFE` and `MASKED_LIMITED` audiences before labels or payload summaries reach the drawer.
- Only one module is expanded. Explicit compare mode may expand `DRIFT_FIELD` or `TWIN_PANEL`; explicit audit mode may expand only `FOCUS_LENS`; audit wins if both explicit flags are requested.
- Invalid active modules publish a typed `detail_fallback_state` and a matching drawer `fallback_reason_code`: `SUGGESTED_MODULE_SELECTED`, `FIRST_VALID_ENTRY_SELECTED`, or `COLLAPSED_ROOT_SELECTED`.
- A valid but non-populated active module keeps `ACTIVE_MODULE_PRESERVED` in the budget audit and publishes `ACTIVE_DETAIL_NOT_POPULATED` on the drawer with normalized empty or limited state fields.
- Focus anchors are preserved when the previously focused object still appears in the expanded module's `anchorable_object_refs`; otherwise a deterministic module focus anchor is minted.
- Support region promotion is derived from the resolved active detail and mode: no active detail means no support region, no-safe-action detail is recovery support, and explicit compare or audit detail is investigation support.

Verification coverage lives in `packages/backend-low-noise/src/tests/detail_drawer_and_support_region_rules.spec.ts` and validates the drawer, action strip, and full low-noise frame schemas.

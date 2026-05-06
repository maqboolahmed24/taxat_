# Reference And Locator Runbook

## Purpose
Taxat now has one grammar for IDs, durable refs, hashes, target refs, storage refs, delivery bindings, and route tokens. Use these families to decide what a string means before introducing a new field, API contract, cache key, or UI state token.

## Family Rules
- `*_id`: stable business or workflow identity. Use for joins, receipts, and replay anchors.
- `*_ref`: durable lineage or object pointer only when no more specific family applies.
- `*_target_ref`: durable preview, print, or governance target selection.
- `storage_ref`: opaque internal storage backing handle aligned to object-store namespace law.
- `download_ref` plus `delivery_binding_hash`: invocation-time delivery affordance. These are not durable artifact truth.
- `*_hash`: canonical integrity or binding digest over deterministic input.
- `route_identity_ref` and `*_route_token`: route continuity or scene restoration tokens, not durable refs.

## Do And Do Not
- Do use `artifact_ref` to preserve lineage when an object is copied, republished, or rehydrated.
- Do mint a new `preview_target_ref` or `download_ref` when publishing a customer-safe derivative from an internal-only source.
- Do keep `storage_ref` stable across upload resume and request rebase when the underlying staged object did not change.
- Do recompute `delivery_binding_hash` when route, target, access, masking, or object context changes.
- Do not persist a route token where a durable artifact ref belongs.
- Do not expose bucket names, provider URLs, signed query strings, or bearer tokens in any durable locator.
- Do not infer preview or download targets from `storage_ref`.
- Do not treat a signed URL as a durable `download_ref`.

## Current Vs History
- Current preview, download, and print defaults must come from the current artifact only.
- Historical artifacts may publish their own lawful targets, but only after explicit selection.
- The current artifact and a selected historical artifact may both be present with different targets at the same time. That is expected and must remain explicit.

## Storage Namespaces
- `storage.upload-staging`: upload-session staging and part manifests. Same `storage_ref` may survive resume and request rebase.
- `storage.retained-evidence`: immutable retained evidence bodies behind durable refs.
- `storage.authority-payloads`: durable authority payload bodies for provenance and audit.
- `storage.quarantine`: isolated bodies awaiting explicit release or supersession.
- `storage.derived-preview`: regenerable preview bodies behind stable target refs.
- `storage.export-masked` and `storage.export-restricted`: export bodies that still require governed targets and delivery bindings.
- `storage.restore-archive`: replay and drill artifacts only.

## Helper Usage
- Use `classifyReferenceField()` and `assertReferenceFamily()` before wiring a new contract field into business logic.
- Use `computeArtifactPresentationTargets()` to keep current defaults separate from historical selection.
- Use `materializeCustomerDeliveryAffordance()` or `materializeCustomerSafeDerivativeLocator()` when bridging from durable refs and targets into customer delivery.
- Use `computeDeliveryBindingHash()` for preview, print, download, and externalization reuse guards.
- Use `asReferenceRouteToken()` for route continuity tokens. It rejects full URLs, signed query strings, and tenant/access hints.

## Verification Commands
```bash
node --experimental-strip-types ./packages/domain-kernel/src/references/build_reference_grammar_atlas.ts --emit
node --experimental-strip-types ./packages/domain-kernel/src/references/build_reference_grammar_atlas.ts --check
pnpm exec playwright test --config=playwright.config.ts --project=unit tests/unit/references/reference_grammar.spec.ts
pnpm exec playwright test --config=tests/integration/playwright.config.ts tests/integration/references/artifact_locator_strategy.spec.ts
pnpm exec playwright test --config=playwright.config.ts --project=browser tests/playwright/internal/reference_grammar_atlas.spec.ts
```

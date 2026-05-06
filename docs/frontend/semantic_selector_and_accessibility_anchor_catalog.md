# Semantic Selector And Accessibility Anchor Catalog

`pc_0232` adds the frontend source of truth for semantic selectors and accessibility anchors.

## Contract Spine

- Typed catalog: `packages/frontend-shell-core/src/accessibility/semantic_anchor_catalog.ts`
- Contract builder: `packages/frontend-shell-core/src/accessibility/semantic_accessibility_contract_builder.ts`
- Focus profiles: `packages/frontend-shell-core/src/accessibility/focus_order_profiles.ts`
- Live-region policy: `packages/frontend-shell-core/src/accessibility/live_region_policy.ts`
- Shared UI snapshots: `packages/shared-ui/src/accessibility/SemanticAnchor.tsx` and `packages/shared-ui/src/accessibility/LandmarkFrame.tsx`
- Playwright fixture: `packages/playwright-kit/src/fixtures/semantic_accessibility_fixture.ts`
- Internal route: `apps/operator-web/public/internal/semantic-anchor-catalog/index.html`

The catalog binds these fields from one entry:

- `data-testid`
- `data-semantic-anchor-code`
- `data-native-identifier`
- ARIA label or labelled-by wiring
- landmark role
- heading level
- focus region code
- live-region mode

Browser identifiers and native identifiers intentionally mirror `semantic_anchor_ref`. If any identifier drifts, `assertSemanticIdentifierParity` fails with `SEMANTIC_IDENTIFIER_DRIFT`.

## Required Calm Anchors

The calm shell catalog publishes the required browser refs:

`low-noise-shell`, `shell-family`, `object-anchor`, `dominant-question`, `settlement-posture`, `recovery-posture`, `context-bar`, `decision-summary`, `action-strip`, `primary-action`, `no-safe-action`, and `detail-drawer`.

Dynamic detail entries use `buildCalmDetailEntryAnchor(moduleCode)`, for example `detail-entry-evidence-prism`.

## Portal And Governance Boundaries

Portal entries use portal-safe refs such as `portal-shell`, `portal-primary-action`, `portal-support-panel`, `portal-request-focus`, `portal-current-artifact`, and `portal-history-list`.

Governance entries use governance-scoped refs such as `governance-context-bar`, `governance-section-nav`, `governance-primary-worklist`, `overview-attention-summary`, and `governance-risk-ledger`.

## Edge-Case Guards

The catalog fails closed for:

- duplicate anchor codes in the same semantic scope
- duplicate anchor refs
- missing required anchors
- hidden or limited content without a limitation notice anchor
- live updates that move focus from an active composer, editor, file picker, or comparison control
- visual selector fragments such as `left-column`, `right-column`, `hero-card`, or `metric-wall`

## Browser Verification

The internal Anchor Catalog route is a typographic index grouped by shell family and surface. It includes focus ladders, screen-reader paths, live-region badges, and a live-region focus lab.

Run the browser checks:

```sh
pnpm exec playwright test --config=playwright.config.ts --project=browser tests/playwright/frontend/semantic_anchor_catalog.spec.ts tests/playwright/frontend/accessibility_keyboard_live_region.spec.ts
```

Run the unit/schema checks:

```sh
pnpm exec playwright test --config=playwright.config.ts --project=unit tests/unit/frontend-shell-core/semantic_anchor_catalog.spec.ts
python3 Algorithm/scripts/validate_contracts.py --self-test
python3 Algorithm/tools/forensic_contract_guard.py
```

# Authority Calculation Request, Result, And User Confirmation Flow

`pc_0141` makes the authority-calculation handshake a sealed tuple:

1. `AuthorityCalculationRequest`
2. `AuthorityCalculationResult`
3. `CalculationBasis`
4. `CalculationUserConfirmation`
5. `AuthorityCalculationReadinessContext`

Filing packet build now accepts a verified handshake tuple when a filing case carries calculation
lineage. The packet copies the active readiness context, calculation result, basis, and user
confirmation refs instead of rebuilding readiness from loose fields.

## Explicit Decisions

- Modeled posture: `live_authority_call_executed = false` forces `MODELED_ONLY` request state, null
  authority operation/request/interaction refs, modeled result state, no calculation hash, no basis
  hash, no confirmation ref, no reusable posture, and a non-`PASS` validation outcome.
- Calculation runtime scope: calculation requests may carry `prepare_submission` or
  `amendment_intent`, but never `submit` or `amendment_submit`. Filing preparation uses
  `prepare_submission`; amendment intent uses `amendment_intent`.
- Basis reuse: `parity_reusable` and `filing_reusable` are legal only when
  `basis_status = CONFIRMED`.
- Confirmation: `CONFIRMED` requires an empty reason-code set and a confirmed basis hash.
  `DECLINED` is the only state allowed to carry reason codes. Pending or declined confirmations do
  not expose confirmed basis hashes.
- Readiness: `PASS` and `PASS_WITH_NOTICE` require a live retrieved result, confirmed basis hash,
  confirmed user confirmation, and reusable posture.
- Stale protection: the portal projection locks sign-off when the calculation, basis, declaration
  pack, or approval context is stale or superseded. Modeled posture is shown separately and cannot
  enable filing-capable sign-off.

## Provider Grounding

The HMRC MTD Income Tax service guide says final declaration software triggers a Self Assessment tax
calculation with `finalDeclaration` set to true, retrieves it by calculation ID, displays the result
to the user, and submits the final declaration with the same calculation ID after the user agrees.
The Individual Calculations API is the provider API surface for generating/retrieving calculations
and submitting final declarations.

Provider links cross-checked for this implementation:

- https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/make-updates-at-tax-year-end.html
- https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/tax-calculations.html
- https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/individual-calculations-api/8.0

Playwright links cross-checked for route verification:

- https://playwright.dev/docs/locators
- https://playwright.dev/docs/actionability
- https://playwright.dev/docs/emulation

## Implementation Surfaces

- Models and repositories live under `packages/backend-authority/src`.
- The portal route contract lives at
  `apps/client-portal-web/src/routes/approvals/final-declaration-confirmation.tsx`.
- Browser-verifiable static route lives at
  `apps/client-portal-web/public/approvals/final-declaration-confirmation/index.html`.
- Shared UI primitives live under `packages/shared-ui`.
- Database migration:
  `db/migrations/phase03_0141_authority_calculation_request_result_confirmation.sql`.

Assumption markers:

- `ASSUMPTION_SHARED_UI_PACKAGE_CREATED`: `packages/shared-ui` did not exist before this card.
- `ASSUMPTION_CLIENT_PORTAL_STATIC_PREVIEW_CREATED`: the client portal package currently has route
  metadata only, so a static preview was added for canonical Playwright verification.

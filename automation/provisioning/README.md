# Provisioning Automation Workspace

This workspace is the governed browser-automation harness for third-party provisioning flows such as HMRC Developer Hub account setup, sandbox application registration, callback verification, and console drift checks.

It is intentionally separate from:

- product end-to-end testing
- customer auth automation
- product-runtime sign-in or token acquisition
- generic scraping

## What It Does

- runs provider recipes through a typed `RunContext`
- records step state using an explicit step contract
- captures sanitized evidence and redaction notes
- pauses at manual checkpoints such as email verification, CAPTCHA, MFA, or human review
- persists resumable state without treating browser storage as ordinary data
- renders run history in a low-noise internal console under `report_viewer/`

## What It Does Not Do

- automate live HMRC product-runtime OAuth sign-in for the Taxat product
- persist raw credentials in repo files
- assume that third-party portals are stable enough for brittle CSS-first automation
- replay unsafe steps blindly after a manual checkpoint

## Commands

- Install dependencies: `npm install`
- Typecheck: `npm run typecheck`
- Run all tests: `npm test`
- Run unit tests only: `npm run test:unit`
- Run smoke and viewer tests: `npm run test:smoke`
- Start the static viewer locally: `npm run viewer`
- Resume a saved manual checkpoint: `npm run resume -- --root ./artifacts/resume --run <run-id> --checkpoint <checkpoint-id> --by <alias> --note "review complete"`

## Live Provider Guard

Live-provider recipes are never enabled by default. HMRC recipes are registered as extension points, but their execution is expected to be gated by explicit environment flags and secret injection provided by later provisioning cards.

The local smoke suite uses only fixture pages under `tests/fixtures/`.

## Layout

- `src/core/`: typed execution model and policy helpers
- `src/providers/`: provider-specific extension surface
- `docs/`: selector, checkpoint, and evidence policy
- `report_viewer/`: browser-viewable run console
- `tests/`: unit and smoke verification
- `scripts/`: lightweight operational helpers

## External Guidance Anchors

- Playwright locator and actionability guidance: <https://playwright.dev/docs/locators>, <https://playwright.dev/docs/actionability>, <https://playwright.dev/docs/best-practices>, <https://playwright.dev/docs/test-projects>
- HMRC Developer Hub sandbox and OAuth guidance: <https://developer.service.hmrc.gov.uk/api-documentation/docs/testing>, <https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/user-restricted-endpoints>, <https://developer.service.hmrc.gov.uk/guides/fraud-prevention/connection-method/>
- OWASP logging and secrets guidance: <https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html>, <https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html>

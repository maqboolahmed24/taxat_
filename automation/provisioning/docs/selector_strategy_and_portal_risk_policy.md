# Selector Strategy and Portal Risk Policy

This workspace uses a semantic-first selector policy for third-party portals.

## Priority Order

1. ARIA role and accessible name
2. Label text
3. Stable user-facing text
4. Stable URL or route markers
5. Provider-owned test ids or documented selector contracts
6. CSS fallback only when explicitly justified and paired with drift detection

This order follows current Playwright guidance:

- locators are the central auto-waiting abstraction
- role- and label-based locators are preferred because they are closer to user intent
- brittle CSS or XPath chains are a last resort

References:

- <https://playwright.dev/docs/locators>
- <https://playwright.dev/docs/actionability>
- <https://playwright.dev/docs/best-practices>

## Provider Portal Risk Rules

- External portal copy may drift while preserving meaning. Semantic locators should therefore bind to role, label, or short stable text rather than DOM ancestry.
- CSS fallback is allowed only when the semantic locator is missing and the fallback includes:
  - a justification
  - a drift signal
  - a documented recovery expectation
- Any unexpected selector ambiguity must fail closed and emit a selector-drift warning.
- The workspace may adopt an existing resource instead of creating a duplicate if the portal shows the target already exists.

## HMRC-Specific Implications

- Redirect URI and callback configuration should anchor to long-lived hostnames, not ephemeral review URLs.
- Manual checkpoint is mandatory when the provider introduces MFA, CAPTCHA, or human verification.
- The workspace must not turn provider-portal automation into product-runtime sign-in automation.

References:

- <https://developer.service.hmrc.gov.uk/api-documentation/docs/testing>
- <https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/user-restricted-endpoints>
- <https://developer.service.hmrc.gov.uk/guides/fraud-prevention/connection-method/>

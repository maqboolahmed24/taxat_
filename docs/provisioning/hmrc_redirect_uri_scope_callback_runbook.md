# HMRC Redirect URI, Scope, and Callback Runbook

This runbook governs the canonical HMRC sandbox OAuth callback posture implemented for `pc_0036`.

## Scope

- configure the HMRC sandbox application's redirect URIs
- normalize one machine-readable callback inventory for later runtime and authority-boundary work
- bind the current roadmap slice to the exact HMRC scope set it needs now
- make callback ownership, token-exchange ownership, and raw-token custody explicit

Out of scope:

- exporting client IDs or client secrets
- automating product-runtime sign-in or consent on behalf of a human
- registering HMRC production callback hosts on the sandbox application
- widening scope beyond `read:self-assessment` and `write:self-assessment`

## Public HMRC Guidance Revalidated On 2026-04-18

- Sandbox authorisation endpoint: `https://test-www.tax.service.gov.uk/oauth/authorize`
- Sandbox token endpoint: `https://test-api.service.hmrc.gov.uk/oauth/token`
- Sandbox API base URL: `https://test-api.service.hmrc.gov.uk`
- Production API base URL: `https://api.service.hmrc.gov.uk`
- Redirect rules:
  - the `redirect_uri` used at `/oauth/authorize` must match a configured redirect URI
  - the same `redirect_uri` must be reused at `/oauth/token`
  - a maximum of `5` redirect URIs may be configured
  - web callbacks must be absolute HTTPS URIs
  - `http://localhost` is allowed for installed applications
  - IP-address hosts and fragments are invalid
- Scope rules:
  - HMRC user-restricted flows require `response_type=code`, `client_id`, `scope`, and `redirect_uri`
  - scopes are space-delimited and URL-encoded
  - the current MTD Income Tax APIs expose `read:self-assessment` and `write:self-assessment`

## Canonical Taxat Callback Doctrine

Configured now on the sandbox application:

1. `https://auth.sandbox.taxat.example/oauth/hmrc/callback`
2. `http://localhost:46080/oauth/hmrc/sandbox/native-callback`
3. `https://auth.preprod.taxat.example/oauth/hmrc/callback`
4. `http://localhost:46180/oauth/hmrc/preprod/native-callback`

Intentionally not configured on the sandbox application:

- local provisioning browser loopback `http://localhost:45080/...`
- local provisioning native loopback `http://localhost:45081/...`
- all production callback hosts

Why this exact set:

- sandbox web is the canonical browser callback for the shared sandbox environment
- sandbox desktop is the canonical installed-app callback for native sandbox work
- pre-production web and desktop callbacks are needed because pre-production already binds to HMRC sandbox and must exercise release-candidate topology faithfully
- one of HMRC's five redirect slots remains intentionally unused

## Ownership Doctrine

Browser-originated journeys:

- operator web or portal web initiates the HMRC journey
- HMRC returns to the gateway-owned HTTPS callback
- the gateway exchanges the code for tokens
- the browser never becomes the token-exchange system of record

Native macOS journeys:

- the macOS client opens the system browser
- HMRC returns to the environment-bound localhost callback
- the local callback server hands the code and opaque return context back to the governed gateway
- the gateway exchanges the code for tokens
- raw access tokens and refresh tokens still live only in the governed secret boundary

## Scope Doctrine

The current roadmap slice requests only:

- `read:self-assessment`
- `write:self-assessment`

Why both are requested now:

- the current slice includes read flows, calculation triggers, quarterly submissions, final declaration, and amendment-capable flows
- subscribed APIs already publish only this read/write self-assessment pair
- no broader scope set is needed or allowed

## Explicit HMRC Documentation Discrepancy

The HMRC user-restricted authorisation guide currently documents sandbox authorisation at:

- `https://test-www.tax.service.gov.uk/oauth/authorize`
- `https://test-api.service.hmrc.gov.uk/oauth/token`

Current API OAS files still publish:

- `https://api.service.hmrc.gov.uk/oauth/authorize`
- `https://api.service.hmrc.gov.uk/oauth/token`

Taxat treats the user-restricted guide as authoritative for sandbox runtime endpoint selection and records the discrepancy in the checked-in machine-readable artifacts so later runtime work cannot miss it.

## Flow Doctrine

1. Open the canonical sandbox application.
2. Open `Manage redirect URIs`.
3. Reconcile the redirect slots to the canonical four-entry inventory.
4. Save the settings.
5. Refresh and re-read the settings.
6. Persist the redirect inventory, slot budget, scope/callback matrix, and machine-readable sandbox OAuth profile.

## Sanitized Outputs

Repo-tracked outputs may include only:

- callback profile refs
- redirect URIs
- scope sets
- safe environment and deployable refs
- evidence refs
- notes about token-exchange ownership and raw-token custody

They must never include:

- client IDs
- client secrets
- access tokens
- refresh tokens
- cookies
- browser storage-state blobs

## Live-Run Guard

Live HMRC execution remains opt-in only.

Enable it only when:

- the run context explicitly allows live provider execution
- the sandbox application already exists and is safe to mutate
- an operator is ready to verify the portal visually if the HMRC settings surface drifts
- HMRC authorisation guidance has been rechecked on the same day as the live run

## Verification Coverage

The implementation now covers:

- deterministic portal reconciliation of stale or duplicate redirect URIs
- explicit save and re-read verification after refresh
- rule-level rejection of fragments, IP-address hosts, duplicate entries, over-budget inventories, wrong-scheme web callbacks, and non-localhost desktop callbacks
- one checked-in callback/scope inventory that later runtime work can consume directly

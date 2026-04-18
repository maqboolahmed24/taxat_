# IdP Tenant and Client Bootstrap Runbook

This runbook governs `pc_0039`, which freezes Taxat's external OIDC control-plane topology for browser, native, and machine entry points.

## Scope

- create or adopt the external IdP control-plane tenant layout
- create or adopt interactive browser clients for:
  - operator web
  - customer portal web
  - native macOS operator bootstrap
- create or adopt machine clients for:
  - backend or provisioning automation
  - provider-management bootstrap
- normalize callback, logout, origin, bundle-identifier, and secret-boundary posture into deterministic machine-readable catalogs
- expose the topology in the `idp-topology-atlas` viewer without leaking live secrets

Out of scope:

- final role, scope, MFA, step-up, and session-policy configuration inside the IdP
- runtime sign-in journeys against the production product shell
- business-tenant, authority-of-record, or delegation truth
- secrets-manager or KMS/HSM bootstrap beyond the governed vault refs already established in `pc_0033`

## Current External IdP Guidance Revalidated On 2026-04-18

The vendor was not frozen by an earlier ADR, so this task uses the recorded default `PROVIDER_DEFAULT_APPLIED` posture with an Auth0-compatible control-plane recipe.

The live guidance used for the topology is:

- [Set Up Multiple Environments](https://auth0.com/docs/get-started/auth0-overview/create-tenants/set-up-multiple-environments)
- [Application Settings](https://auth0.com/docs/get-started/applications/application-settings)
- [Regular Web Applications](https://auth0.com/docs/get-started/auth0-overview/create-applications/regular-web-apps)
- [Native Applications](https://auth0.com/docs/get-started/auth0-overview/create-applications/native-apps)
- [Machine to Machine Applications](https://auth0.com/docs/get-started/auth0-overview/create-applications/machine-to-machine-apps)
- [Confidential and Public Applications](https://auth0.com/docs/get-started/applications/confidential-and-public-applications/view-application-type)

Operational conclusions captured in the checked-in artifacts:

- separate provider tenants per environment tier remain the least-risk default
- browser shells should remain confidential server-mediated applications
- native macOS remains a public client using system-browser auth and PKCE
- machine clients stay separate from human sessions and do not inherit callback or MFA assumptions

## Canonical Taxat Doctrine

1. Business-tenant context stays Taxat-engine owned after authentication; it is not represented as IdP-tenant truth.
2. The external IdP is only the coarse authentication and session-bootstrap boundary.
3. Browser operator, browser portal, native macOS operator, backend automation, and provider-management bootstrap stay separate client families.
4. Environment-specific callback, logout, and origin rules are fail-closed and must not be widened silently.
5. Native bootstrap stays system-browser only; embedded-webview primary sign-in remains disallowed.
6. Confidential browser and machine clients require governed vault-bound secret posture.
7. Public/native clients never gain a shared client secret.

## Tenant Topology

The frozen control-plane layout is:

1. `idp_tenant_dev_shared`
   - provider tag: `Development`
   - product environment: `env_local_provisioning_workstation`
   - purpose: local bootstrap and controlled provisioning
2. `idp_tenant_staging_runtime`
   - provider tag: `Staging`
   - product environments:
     - `env_shared_sandbox_integration`
     - `env_preproduction_verification`
   - purpose: sandbox and pre-production runtime
3. `idp_tenant_production_runtime`
   - provider tag: `Production`
   - product environment: `env_production`
   - purpose: live runtime

This layout is per provider environment, not per Taxat business tenant.

## Client Families

Interactive families:

- `OPERATOR_BROWSER`
- `PORTAL_BROWSER`
- `NATIVE_MACOS_OPERATOR`

Machine families:

- `BACKEND_SERVICE_AUTOMATION`
- `PROVIDER_MANAGEMENT_BOOTSTRAP`

Current checked-in counts:

- `3` provider tenants
- `9` interactive clients
- `6` machine clients

## Callback and Origin Doctrine

Configure now:

- sandbox operator browser callback via `https://auth.sandbox.taxat.example/...`
- sandbox portal browser callback via `https://auth.sandbox.taxat.example/...`
- sandbox native operator callback via `https://auth.sandbox.taxat.example/...`
- pre-production operator, portal, and native callbacks via `https://auth.preprod.taxat.example/...`
- production operator, portal, and native callbacks via `https://auth.production.taxat.example/...`

Intentionally not canonical:

- workstation-local browser bootstrap callbacks
- ephemeral preview callbacks

Those rows remain checked into the callback matrix as `DO_NOT_REGISTER` so later work cannot mistake them for stable runtime truth.

## Secret and Credential Doctrine

Repo-tracked outputs may persist only:

- client aliases
- fingerprints
- vault refs
- metadata refs
- write receipts
- callback refs
- bundle identifiers
- typed gaps and policy notes

Repo-tracked outputs must never persist:

- raw client IDs when they are treated as sensitive provider-admin material
- raw client secrets
- management access tokens
- storage-state blobs
- provider-admin cookies
- screenshots or DOM captures revealing live secrets

## Execution Flow

1. Open the IdP control-plane workspace.
2. Reconcile the recommended tenant set.
3. Reconcile interactive browser and native clients.
4. Reconcile machine and management-bootstrap clients.
5. Persist:
   - `idp_tenant_record`
   - `idp_application_client_catalog`
   - `idp_callback_origin_matrix`
   - `idp_machine_client_inventory`
   - one evidence manifest
6. Review the `idp-topology-atlas` page to confirm:
   - tenant selection
   - client-family separation
   - callback and origin bindings
   - vault-safe secret posture

## Validation Expectations

- unit tests prove every client resolves to a valid tenant, callback posture, and secret posture
- unit tests reject browser-origin drift and machine-client callback leakage
- Playwright fixture flow proves both fresh-create and adopt-existing branches
- Playwright viewer coverage proves semantic headings, keyboard focus, reduced-motion parity, and safe-copy inspector behavior

## Current Explicit Gaps

- The shared operating contract `shared_operating_contract_0038_to_0045.md` is absent, so the implementation grounds directly in ADR-003, the environment catalog, and the current Auth0-compatible documentation above.
- Provider-management scopes and final session/MFA posture remain for `pc_0040`.
- The exact signing and bundle deployment posture for the macOS target remains for later native app cards; this task freezes the IdP-facing bundle identifier and public-client boundary only.

# HMRC Sandbox Application Registration Runbook

This runbook governs the controlled HMRC sandbox-application bootstrap implemented for `pc_0035`.

## Scope

- locate or create the canonical HMRC sandbox application for Taxat
- subscribe that application to the required current MTD Income Tax API set for the roadmap slice
- persist one sanitized sandbox-application record and one machine-readable subscription matrix
- record later-scope API decisions explicitly so subsequent cards do not blur the current slice with end-of-year scope

Out of scope:

- exporting client IDs or client secrets
- storing live credentials in repo-tracked files
- runtime OAuth sign-in or customer-authorisation automation
- production-application registration

## Public HMRC Guidance Revalidated On 2026-04-18

- HMRC getting started: create a sandbox application, choose APIs, get credentials, then test
- HMRC sandbox testing: subscribe to APIs before access, then retrieve sandbox credentials separately
- HMRC naming guidance: sandbox names remain free-form, but production-safe naming discipline still matters now
- HMRC Income Tax MTD service guide:
  - in-year required APIs: `Business Details (MTD)`, `Obligations (MTD)`, `Self Employment Business (MTD)` and/or `Property Business (MTD)`, plus `Individual Calculations (MTD)` if calculations are surfaced in software
  - end-of-year APIs: `Business Source Adjustable Summary (MTD)` and `Individual Losses (MTD)` are later-scope, not this slice

## Canonical Naming Doctrine

- canonical sandbox application name: `Taxat Sandbox Income Tax`
- rationale:
  - avoids using `HMRC` in the name
  - keeps the sandbox record recognisable to operators now
  - stays close to the future production-safe naming doctrine without implying any special HMRC status

## Required API Doctrine For This Card

Required now:

- `Business Details (MTD)`
- `Obligations (MTD)`
- `Individual Calculations (MTD)`
- `Self Employment Business (MTD)`
- `Property Business (MTD)`

Recorded as likely required later, but intentionally deferred in this card:

- `Business Source Adjustable Summary (MTD)`
- `Individual Losses (MTD)`

Why both business-submission APIs are subscribed now:

- the current Taxat authority-profile catalog already spans both self-employment and property flows
- one canonical sandbox application is preferred over multiple near-identical applications
- subscribing both now avoids later duplication or ambiguous operator choices

## Flow Doctrine

1. Open the HMRC `Applications` area first.
2. Detect whether the canonical sandbox application already exists.
3. If it exists, adopt it and continue without creating a duplicate.
4. If it does not exist, create it with the canonical name.
5. Open `Manage API subscriptions`.
6. Reconcile every required-now API to `SUBSCRIBED`.
7. Record later-scope APIs as deferred rather than silently ignoring them.
8. Persist one sanitized application record and one subscription matrix.

## Sanitized Artifacts

Repo-tracked outputs may include only:

- application alias and display name
- environment and workspace identifiers
- safe console URLs
- evidence references
- API-set decisions and subscription states

They must never include:

- client IDs
- client secrets
- cookies
- storage-state blobs
- bearer or refresh tokens

## Live-Run Guard

Live HMRC execution remains opt-in only.

Enable it only when:

- the `RunContext` explicitly allows live provider execution
- the developer-hub workspace record already exists or can be established safely
- an operator is ready to verify the portal visually if copy drifts
- later credential-export cards are still disabled

## Fixture Verification Coverage

The fixture suite covers:

- create-new sandbox application
- adopt-existing sandbox application
- partial-subscription remediation
- API-label drift handled through canonical-to-portal alias matching

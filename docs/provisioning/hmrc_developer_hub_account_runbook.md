# HMRC Developer Hub Account Bootstrap Runbook

This runbook governs the controlled HMRC Developer Hub account bootstrap implemented for `pc_0034`.

## Scope

- create the canonical HMRC sandbox provisioning account if it does not yet exist
- adopt the account if it already exists or a safe authenticated session is already active
- pause for email activation, CAPTCHA, MFA, or suspicious-login review
- verify landing in the HMRC `Applications` area
- persist one sanitized internal workspace record for later provisioning cards

Out of scope:

- sandbox application subscription setup
- OAuth client credential export
- product-runtime OAuth grant automation
- HMRC online-service journeys outside Developer Hub provisioning

## Public HMRC Entry Points Revalidated On 2026-04-18

- Registration page: `https://developer.service.hmrc.gov.uk/developer/registration`
- Sign-in page: `https://developer.service.hmrc.gov.uk/developer/login`
- Applications entry: `https://developer.service.hmrc.gov.uk/developer/applications`
- Public getting-started guidance still states: register, activate by email, sign in, then create sandbox applications.

## Flow Doctrine

1. Open `Applications` first and check whether a safe authenticated session already exists.
2. If `Applications` is already available, adopt the session rather than forcing a new login.
3. If a prior sanitized workspace record exists, prefer the sign-in path first.
4. If no prior record exists, prefer the registration path first.
5. If registration reports an existing-account signal, switch to sign-in.
6. If sign-in surfaces a supported security or activation checkpoint, stop and persist resumable state.
7. Only treat the flow as complete when the terminal page is the `Applications` area or an equivalent authoritative applications landing.

## Manual Checkpoints

Supported checkpoint reasons:

- `EMAIL_VERIFICATION`
- `CAPTCHA`
- `MFA`
- `HUMAN_REVIEW`

Checkpoint rules:

- the step transitions to `MANUAL_CHECKPOINT_REQUIRED`
- evidence capture remains suppressed or redacted
- resume state is written only through the governed resume store
- no raw credential values, cookies, or storage-state blobs are written to repo-tracked files

## Sanitized Workspace Record

The repo-tracked workspace record may contain only:

- account alias and email alias
- environment and workspace IDs
- safe console-location references
- evidence references
- vault or secret-manager references
- landing status and checkpoint state

It must never contain:

- raw passwords
- raw activation links or mailbox contents
- active cookies
- bearer tokens
- refresh tokens
- raw `storageState` content

## Live-Run Guard

Live HMRC execution remains disabled by default.

Enable it only when:

- the run context is not `fixture`
- explicit live-provider gating is enabled
- required secret refs are injected through the approved provisioning secret policy
- an operator is ready to resolve email, anti-bot, MFA, or suspicious-login checkpoints manually

## Fixture Verification Coverage

The fixture suite covers:

- fresh registration leading to `Applications`
- existing-account sign-in leading to `Applications`
- activation checkpoint persistence
- duplicate-account detection and safe sign-in fallback
- selector drift on the registration CTA
- already-signed-in session adoption
- live-run gating failure when explicit approval is absent

# Manual Checkpoint Protocol

Manual checkpoints exist for steps that cannot be safely automated to completion.

## Checkpoint Triggers

- email verification
- CAPTCHA
- MFA
- human review or approval
- policy confirmation

## Required Behavior

- persist resumable state before pausing
- capture only sanitized evidence
- store browser storage state only as secret material and only by explicit policy
- on resume, verify the current portal state before continuing
- never blindly replay a step that may have already succeeded

## Resume Semantics

- `VERIFY_CURRENT_STATE_THEN_CONTINUE`: confirm the portal is still on the expected page and then continue
- `ADOPT_EXISTING_RESOURCE_THEN_CONTINUE`: if the target resource already exists, adopt it and move forward
- `STOP_AND_ESCALATE`: fail closed and require human intervention

## HMRC Alignment

HMRC user-restricted endpoints return the authorization code through a redirect endpoint, and token exchange must happen promptly. The provisioning workspace therefore treats callback, verification, and approval pauses as stateful checkpoints rather than retryable clicks.

References:

- <https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/user-restricted-endpoints>
- <https://developer.service.hmrc.gov.uk/api-documentation/docs/testing>

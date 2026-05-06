# Client Onboarding Journey Projection and Progression

`ClientOnboardingJourney` is now authored by `buildClientOnboardingJourney(...)`.
Portal renderers consume the projected workspace summary; they do not derive step order,
resume posture, reconfirmation, terminal exits, or save-and-return legality.

## Step and Resume Rules

- `required_steps[]` is the frozen step order for the journey.
- `completed_steps[]` must remain a subset of `required_steps[]`.
- `current_step_code` is the only writable step for active journeys.
- `resume_state = LIVE` resumes `resume_step_code` only when that step is still required and not completed.
- `resume_state = RECONFIRMATION_REQUIRED` resumes the first required reconfirmation step and publishes the exact `reconfirmation_step_codes[]`.
- `resume_state = STALE_REVIEW_REQUIRED` blocks mutation. The standalone journey clears `resume_step_code`; the workspace summary carries the current step only as a read-side focus anchor.

## Authority and Document Continuity

`authority_link_requirement = REQUIRED` inserts `AUTHORITY_LINK_SETUP` into the governed order.
`authority_link_requirement = NOT_REQUIRED` removes that step and requires `authority_link_state = NOT_REQUIRED`.
Later document or review states require the authority link to be `LINKED` or `WAIVED` when the step is present.

Draft upload sessions are legal only during `DOCUMENTS_PENDING`.
When any `draft_upload_session_refs[]` exist, both `current_step_code` and `resume_step_code`
must remain `DOCUMENT_COLLECTION`; the portal workspace publishes an onboarding `draft_resume`
entry instead of letting browser-local upload state invent continuity.

## Terminal Behavior

Completion, expiry, and abandonment are explicit terminal states.
Completed journeys publish `completed_at`, `completion_summary_ref`,
`completion_timeline_event_ref`, and the workspace-only `completion_next_steps_ref`.
Expired and abandoned journeys publish their exit timestamp; abandoned journeys also publish
`abandonment_reason_code`.

Terminal journeys remove the dedicated `ONBOARDING` tab. If a stale or saved link requests the
onboarding route after the journey becomes terminal, the workspace builder falls back to `HOME`
while preserving the terminal onboarding summary for read-only context.

## Validation

The projector fails closed for:

- resume steps outside `required_steps[]`
- live resume into completed steps
- reconfirmation without an explicit reconfirmation target
- draft uploads outside `DOCUMENTS_PENDING`
- document draft current/resume drift away from `DOCUMENT_COLLECTION`
- completion, expiry, and abandonment timestamp drift
- authority-link requirement and state drift

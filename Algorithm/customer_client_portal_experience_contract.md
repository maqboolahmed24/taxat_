# Customer/Client Portal Experience Contract

## Purpose
This contract defines the dedicated customer/client portal interface for Taxat. It exists because the staff observatory, even in low-noise form, is still too expert-coded for customers who simply need to know what is happening, what is needed from them, and what will happen next.

The client portal SHALL therefore feel like a secure guided workspace rather than a compliance cockpit. It must reduce anxiety, minimize jargon, and convert internal workflow complexity into a small number of trustworthy, plain-language tasks.

---

## Experience thesis
In one short scan, a client user should be able to answer all of the following:

1. what needs my attention now;
2. what has already been received or completed; and
3. what happens next and when.

The portal SHALL answer these questions without exposing manifest lineage, gate taxonomies, trust formulas, or operator-first investigative surfaces as first-view content.

---

## Audience profiles
The portal SHALL support three client-facing capability profiles:

- `CLIENT_VIEWER` - can see status, deadlines, document history, and completed approvals
- `CLIENT_CONTRIBUTOR` - can upload documents, answer intake questions, and complete onboarding tasks
- `CLIENT_SIGNATORY` - can acknowledge declarations and sign approval packs after any required step-up

A session SHALL always resolve to one effective client-facing capability profile before UI composition or command authorization.

---

## Core design principles

### 1. Task language over system language
The portal SHALL say `Upload your bank statement`, `Review your summary`, or `We are waiting for HMRC` instead of exposing raw engine terms such as gate classes, manifest phases, or internal reason-code families.

### 2. One dominant next step
Every route SHALL expose one dominant primary action at a time. The interface may show supporting context or upcoming tasks, but it SHALL NOT present competing primary calls to action.

### 3. Reassurance before detail
The first view must reassure the client that the case is understood and progressing. For this reason, current status, due point, and what happens next outrank technical provenance, workflow internals, or authority transport details.

### 4. Progressive disclosure with plain-language defaults
Detail remains available, but only after the client has seen a short explanation and a concrete next step. Deep legal text, change logs, or evidence detail SHALL sit behind clearly named secondary disclosure, never ahead of the task itself.

### 5. Route stability across devices
A client who starts on mobile and resumes on desktop SHALL return to the same pending task, upload draft, or approval pack state without having to rediscover their place in the journey.

### 6. Accessibility is not an enhancement
The portal SHALL be fully usable with keyboard-only navigation, screen readers, reduced-motion preferences, high zoom, and coarse touch input. Any design that depends on hover, color alone, or dense enterprise table layouts is non-compliant.

---

## Navigation contract
The global navigation SHALL expose at most five destinations:

1. `Home`
2. `Documents`
3. `Approvals`
4. `Onboarding` (only while onboarding is still active)
5. `Help`

Rules:

- inactive destinations SHALL be omitted rather than disabled
- `Home` SHALL always exist and SHALL always summarize the current status hero plus the next required task
- `Documents` and `Approvals` SHALL show count badges only when action is required
- `Onboarding` SHALL disappear once onboarding is complete and its content SHALL collapse into normal `Home`, `Documents`, and `Approvals` flows
- no client-facing route may require knowledge of internal subsystem names in order to navigate

---

## Route architecture

### `Home`
The home route is the default landing surface and SHALL contain four stacked regions: `PORTAL_HEADER`, `STATUS_HERO`, `TASK_QUEUE`, and `RECENT_ACTIVITY`.

Rules:

- `PORTAL_HEADER` shows account identity, tax year/period label where relevant, and a concise reassurance line
- `STATUS_HERO` shows current overall state, due point, primary CTA, and a short `what happens next` explanation
- `TASK_QUEUE` groups tasks under `Do now`, `Coming up`, and `Done`
- `RECENT_ACTIVITY` shows recent uploads, review results, approvals, and submissions
- the home route SHALL NOT show expert modules, audit streams, manifest identifiers, or complex side-by-side comparison layouts by default

### `Documents`
The documents route SHALL contain `DOCUMENT_INBOX`, `UPLOAD_PANEL`, `UPLOAD_STATUS_LIST`, and `DOCUMENT_HISTORY`.

Rules:

- request cards SHALL explain what is needed, why it matters, and when it is due
- upload controls SHALL support drag/drop, browse, and camera capture against governed upload sessions
- upload status SHALL distinguish transfer, scan, validation, acceptance, rejection, and retry posture
- history SHALL keep accepted, rejected, and superseded uploads in one traceable place

### `Approvals`
The approvals route SHALL contain `APPROVAL_SUMMARY`, `CHANGE_DIGEST`, `DECLARATION_PANEL`, and `SIGN_OFF_PANEL`.

Rules:

- `APPROVAL_SUMMARY` states in plain language what the client is being asked to review
- `CHANGE_DIGEST` highlights material changes since the last reviewed or signed state
- `DECLARATION_PANEL` presents the legal text in readable, downloadable, printable form
- `SIGN_OFF_PANEL` handles acknowledgement, step-up, signature, and receipt states without route-breaking detours

### `Onboarding`
The onboarding route SHALL exist only while the client has unfinished onboarding requirements and SHALL contain `WELCOME_PANEL`, `ONBOARDING_STEPPER`, `STEP_WORKSPACE`, and `SUPPORT_PANEL`.

Rules:

- only one required onboarding step may be primary at a time
- completed steps SHALL collapse into a progress summary rather than remain as an always-open wizard stack
- save-and-return SHALL preserve the current step, entered answers, and any in-progress upload sessions
- once onboarding is complete, the portal SHALL transition the user back into normal `Home`, `Documents`, and `Approvals` flows

### `Help`
The help route SHALL contain `HELP_OPTIONS`, `TOP_QUESTIONS`, and `CASE_CONTEXT_PANEL` so clients can get support without restating their whole case.

---

## Simplified status visualization contract
The portal SHALL use a small literal status vocabulary for `STATUS_HERO`: `ACTION_REQUIRED`, `IN_REVIEW`, `WAITING_ON_US`, `WAITING_ON_AUTHORITY`, `READY_TO_SIGN`, `COMPLETED`, and `ONBOARDING_REQUIRED`.

Rules:

- the headline SHALL be plain-language and action-oriented
- the supporting sentence SHALL explain why the status exists in one or two short sentences
- the route SHALL expose one dominant CTA tied to the current status
- progress SHALL be shown as discrete named steps, not as an ornamental percentage unless the percentage is truly deterministic
- deadline information SHALL use explicit dates or clear due labels when available

---

## Secure document-upload flow
The document-upload flow SHALL prioritize confidence, clarity, and recoverability. The end-to-end path is: open request -> explain requirements -> upload via browse/drag/drop/camera -> transfer through governed `ClientUploadSession` -> show transfer + scan + validation state -> confirm attachment to the correct request -> render reviewer feedback inline on the same request card.

Required UX rules:

- every request SHALL state accepted file types and size limits before file selection
- the client SHALL always know whether a file is uploading, scanning, accepted, rejected, or requires replacement
- rejected uploads SHALL show a plain-language reason plus the next corrective action
- mobile capture SHALL support retry without losing request context
- upload success SHALL never be implied by transfer success alone; scanner / validation completion must be explicit

---

## Approval and sign-off flow
Approval journeys SHALL feel deliberate, understandable, and safe. The route SHALL answer four questions in order: `What am I reviewing?`, `What changed?`, `What am I declaring?`, and `How do I sign and what happens after that?`

Rules:

- the summary view SHALL be readable without legal expertise
- material changes SHALL be surfaced as a compact digest before the declaration text
- legal declaration text SHALL remain accessible, downloadable, and printable
- stale-view protection SHALL prevent signing a superseded approval pack
- step-up, when required, SHALL appear as a contained checkpoint inside the sign-off flow rather than as a route-breaking detour
- successful sign-off SHALL end with a clear receipt state, timestamp, and next-step explanation

---

## Onboarding flow
The onboarding journey SHALL be a guided sequence rather than a form dump. The default sequence is: invite acceptance and secure access creation -> basic profile confirmation -> identity verification or equivalent assurance step -> authority-link setup when relevant -> required document collection -> completion and `what happens next` confirmation.

Rules:

- only the current required step may be primary at a time
- completed steps SHALL collapse into a short summary with the option to review
- `save and return later` SHALL be available whenever the current step is not legally irreversible
- onboarding copy SHALL explain why each step exists and what happens after it is done
- once onboarding is completed, the portal SHALL transition the user back into normal `Home`, `Documents`, and `Approvals` flows without preserving a permanent wizard shell

---

## Content and copy rules
The portal SHALL use plain English and avoid unexplained legal or operator jargon.

- headlines SHOULD stay under 90 visible characters
- primary CTA labels SHOULD stay under 36 visible characters
- task descriptions SHOULD explain the outcome, not just the data requested
- deadlines SHOULD prefer concrete dates where they exist
- review feedback SHALL explain what needs to change, not merely say that something failed

The copy tone SHALL be calm, respectful, and literal. It SHALL avoid alarmist wording, decorative metaphors, or ambiguity about who must act next.

---

## Accessibility and interaction rules
The client portal SHALL satisfy all of the following:

- every core flow is fully keyboard operable
- every color-coded state also includes text and icon semantics
- focus order follows the visible reading order
- all primary controls remain usable at 200 percent zoom
- upload and sign-off flows remain operable with reduced motion enabled
- screen-reader labels describe meaning and outcome, not only visual styling
- touch targets are large enough for coarse pointer input
- no essential state depends on hover-only disclosure

---

## Security and trust moments
The portal SHALL reinforce trust without surfacing internal complexity.

- explicit confirmation when an upload is securely received
- visible validation / scanner state for uploaded files
- visible step-up checkpoint before high-trust sign-off when required
- receipt states for signed approvals and completed onboarding
- help pathways that preserve context rather than forcing the client to start over

The portal MAY reference authority waiting states, but it SHALL do so in client language such as `We have sent this and are waiting for confirmation` rather than transport jargon.

---

## Read-model and API translation requirements
The client portal SHALL be powered by a dedicated read model, `ClientPortalWorkspace`. That workspace SHALL carry at minimum: `status_hero`, `task_groups[]`, `document_center`, `approval_center`, `onboarding_journey`, `support_panel`, and `activity_timeline[]`.

Rules:

- the workspace SHALL flatten internal workflow and gate posture into client-safe language
- role filtering SHALL happen before serialization so a `CLIENT_VIEWER` never sees upload or sign-off affordances they cannot use
- upload bytes SHALL move through `ClientUploadSession`, while legal attachment / finalization remains a typed command
- approval packs SHALL carry a stale-view hash so the UI cannot sign a superseded summary

---

## Playwright validation minimum
The client portal validation plan SHALL include at least:

1. home view shows one dominant status hero and one dominant CTA
2. open document request exposes accepted file types and size limits before upload
3. mobile upload reconnect resumes the same upload session rather than duplicating the file
4. rejected upload shows corrective guidance on the same request card
5. approval pack stale-view rejection routes the user to the latest pack before signing
6. step-up sign-off completes without losing declaration context
7. onboarding reveals one primary step at a time and preserves save-and-return state
8. keyboard-only navigation can complete upload and sign-off flows at 200 percent zoom

---

## One-sentence summary
The customer/client portal must transform the engine's expert semantics into a calm, secure, task-first workspace where clients can understand status instantly, provide the right information confidently, and complete approvals without friction.

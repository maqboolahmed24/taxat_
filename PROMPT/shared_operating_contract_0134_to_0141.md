# Shared Operating Contract for `pc_0134` to `pc_0141`

This block turns the first authority-domain artifacts into an executable authority transport and settlement foundation.
The implementation agent must keep the legal-truth boundary explicit: `SubmissionRecord` is the settlement spine; `AuthorityInteractionRecord` is the runtime exchange ledger; `AuthorityIngressReceipt` is checkpoint truth; `ObligationMirror`, workflow items, and client-safe portal projections are downstream projections only.

## Mandatory source order

Read and obey sources in this order before making any implementation decision:

1. `PROMPT/AGENT.md`, `PROMPT/Checklist.md`, and completed cards `pc_0001` through `pc_0133`.
   Reuse earlier decisions for package boundaries, schema bindings, hashing, exact-decimal handling, deterministic ids, state transitions, replay discipline, control-store persistence, queue/idempotency substrate, northbound command grammar, reference grammar, and shell continuity.

2. Core Taxat corpus:
   - `README.md`
   - `core_engine.md`
   - `modules.md`
   - `data_model.md`
   - `state_machines.md`
   - `constraint_coverage_index.md`
   - `contract_integrity_requirements.md`
   - `invariant_enforcement_and_fail_closed_contract.md`
   - `replay_and_reproducibility_contract.md`
   - `error_model_and_remediation_model.md`

3. Authority-specific and portal-specific contracts for this tranche:
   - `authority_interaction_protocol.md`
   - `authority_truth_and_internal_projection_separation_contract.md`
   - `authority_calculation_contract.md`
   - `actor_and_authority_model.md`
   - `connector_delegation_contract.md`
   - `northbound_api_and_session_contract.md`
   - `security_and_runtime_hardening_contract.md`
   - `deployment_and_resilience_contract.md`
   - `observability_and_audit_contract.md`
   - `retention_limited_explainability_and_audit_sufficiency_contract.md`
   - `customer_client_portal_experience_contract.md`
   - `frontend_shell_and_interaction_law.md`
   - `low_noise_experience_contract.md`
   - `semantic_selector_and_accessibility_contract.md`
   - `semantic_selector_and_accessibility_regression_pack_contract.md`
   - `UIUX_DESIGN_SKILL.md`
   - `PATCH_RESOLUTION_INDEX.md`
   - `AUDIT_FINDINGS.md`
   - `test_vectors.md`

4. Authoritative executable artifacts:
   - every relevant file under `Algorithm/schemas/`
   - `scripts/validate_contracts.py`
   - `tools/forensic_contract_guard.py`
   Treat schema constraints and validator-enforced invariants as authoritative.
   Human-readable docs, read models, preview routes, and helper repositories are downstream only.

5. Official platform guidance for browser verification and authority-provider integration.
   Use current Playwright guidance for locator strategy, auto-waiting, actionability, traces, and resilient browser automation.
   Use current HMRC documentation for OAuth, MTD calculation/final declaration flow, and fraud-prevention header requirements where the Taxat corpus intentionally leaves provider-specific operational detail open.
   Use current Apple HIG and Material guidance for typography hierarchy, layout discipline, accessibility, color roles, and restrained motion when this block introduces browser-visible surfaces.
   These external sources may sharpen implementation technique, but they never override Taxat semantics.

## Package and implementation placement rules

- `pc_0134` through `pc_0140` belong inside the authority-domain backend package chosen by `pc_0028`.
  If that package does not exist, create `packages/backend-authority` and emit `ASSUMPTION_BACKEND_AUTHORITY_PACKAGE_CREATED`.

- `pc_0141` is primarily authority-domain backend work, but it also introduces a user-facing calculation confirmation flow.
  Place backend services in `packages/backend-authority`.
  Place shared presentational primitives in `packages/shared-ui` if they do not already exist.
  Place client-portal route code in `apps/client-portal-web`.
  Place browser verification in `tests/playwright/client_portal` or the closest equivalent workspace already established by earlier cards.
  If any of those packages are missing, create them and emit explicit assumption markers.

- Reuse generated schema bindings from `pc_0061` where they exist.
  Do not fork hand-written domain types that drift from schema truth unless you wrap them and continue to validate against the canonical schemas before persistence.

- Reuse earlier shared helpers from `pc_0058`, `pc_0060`, `pc_0061`, `pc_0064`, `pc_0065`, `pc_0066`, `pc_0067`, `pc_0068`, `pc_0069`, `pc_0074`, `pc_0075`, `pc_0076`, `pc_0086` through `pc_0093`, `pc_0097` through `pc_0109`, `pc_0118` through `pc_0127`, and `pc_0133` whenever those outputs exist.
  There must be one canonical implementation for deterministic ordering, hashing, id generation, exact-decimal rendering, canonical null sentinels, schema validation, replay fixtures, transition guards, frozen config resolution, and reference grammar.

- Respect tranche boundaries.
  This block may complete the first full authority settlement, request identity, send-time binding, fraud-header, ingress normalization, reconciliation, and calculation-confirmation foundations.
  It must not silently absorb later out-of-band correction services, filing notices, or wider analytics products unless the task explicitly requires a narrow seed artifact for continuity.

## Shared design contract for any browser-visible surface in this block

This tranche is mostly backend-first.
A customer-facing browser surface is mandatory only for `pc_0141`.
Any optional internal inspection surface introduced by other cards must remain read-only, low-noise, and operator-only.

### Visual language

- Overall posture: minimalist premium, calm, task-first, no generic analytics-dashboard styling.
- Background: `#F7F5F0`
- Primary surface: `#FFFFFF`
- Secondary surface: `#F1F5F3`
- Primary ink: `#171717`
- Secondary text: `#667085`
- Accent / action: `#0F766E`
- Secondary accent / informational highlight: `#1D4ED8`
- Warning: `#B7791F`
- Danger: `#C2410C`
- Borders: `rgba(23,23,23,0.08)`
- Shadow: low-amplitude only, e.g. `0 8px 24px rgba(23,23,23,0.06)`
- Typography stack: `Inter`, `SF Pro Text`, `Segoe UI`, sans-serif
- Monospace stack: `ui-monospace`, `SFMono-Regular`, `Consolas`, monospace

### Type scale

- page title: `32/38`, semibold
- section title: `20/28`, semibold
- sub-section / panel title: `16/24`, semibold
- label / eyebrow: `12/16`, medium, letter spacing `0.04em`
- body: `14/22`, regular
- small helper text: `12/18`, regular
- code / hashes / ids: `12/18`, medium monospace

### Layout rules

- page max width: `1280px` for portal routes, `1440px` for optional internal explorers
- outer padding: `24px` mobile, `32px` desktop
- grid gutters: `20px`
- panel radius: `18px` to `20px`
- sticky context bar height: `56px` to `64px` where used
- use one dominant content column and one restrained contextual rail at most
- avoid three-column dashboards, dense metric tiles, and chart walls

### Motion and interaction

- only opacity / translate / height disclosure motion
- duration: `140ms` to `180ms`
- no bounce, parallax, looping decorative animation, or motion that changes semantic priority
- reduced-motion support is mandatory
- keyboard and screen-reader paths must follow the same semantic order as the visible route
- sticky notices may exist, but they must never hide primary declarations or signing controls

### Charts / diagrams / logos

- Only include a diagram when it clarifies authority-calculation lineage or declaration readiness better than prose.
- Prefer one restrained “lineage ribbon” or “step progression strip” over any dashboard chart.
- No donut charts, no KPI mosaics, no decorative logos.
- Use one monochrome icon family only.

## Non-negotiable interpretation rules

- `SubmissionRecord` is the legal settlement ledger.
  Only authority-grounded evidence may move it to `CONFIRMED`, `REJECTED`, or `OUT_OF_BAND`.
  `ObligationMirror`, workflow state, accepted risk, client reassurance, or internal completion must never manufacture those states.

- `AuthorityInteractionRecord` is runtime exchange truth.
  It may preserve request identity, send-time revalidation, response history, ingress proof, reconciliation control, and active admissible meaning, but it does not itself prove legal settlement.

- `AuthorityIngressReceipt` is durable ingress checkpoint truth.
  Authenticated ingress that is ambiguous, duplicate-suppressed, authority-reference-only, or otherwise not linearly bound must never drive legal-state mutation.

- `duplicate_meaning_key` and `request_hash` are different things.
  `duplicate_meaning_key` is the resend-vs-reconcile bucket.
  `request_hash` is the exact sealed request identity.
  Never use one in place of the other.

- `request_identity_contract{...}` is the byte-stable request-identity spine.
  Downstream recovery, dedupe, response normalization, and request-backed `SubmissionRecord` handling must reuse it rather than rebuilding request meaning from adjacent operation/binding artifacts.

- `AuthorityBinding.token_version_ref` is the preflight-selected token version.
  Lawful send-time token rotation may only occur within the same `binding_lineage_ref` and must be preserved on `AuthorityInteractionRecord.send_authorized_token_version_ref`, not by mutating the sealed binding or the sealed request identity.

- Fraud-prevention posture is part of protocol validity for HMRC-bound requests.
  `fraud_header_profile_ref`, `fraud_header_capture_ref`, `fraud_header_validation_ref`, and any explicit exemption reason are first-class transport lineage, not optional logging metadata.

- Response history is append-only.
  `active_response_id` is the currently admissible meaning, not simply the most recent arrival.
  Timeout placeholders, corroborating observations, conflicting callbacks, and recovery reads must remain distinguishable.

- `reconciliation_control_contract{...}` is the only authoritative persisted budget packet for automatic follow-up, escalation, and resend legality.
  Recovery, replay, and queue rebuild must resume from it instead of reconstructing legality from transient retry memory.

- The authority calculation handshake is first-class.
  A final-declaration or intent-to-amend flow must preserve typed request, result, basis, user confirmation, and readiness context artifacts before filing packet build or sign-off logic relies on them.

- Portal approval / declaration flows must preserve the canonical route order:
  `APPROVAL_SUMMARY -> CHANGE_DIGEST -> DECLARATION_PANEL -> SIGN_OFF_PANEL`.
  The route must stay in the same shell and keep declaration preview, acknowledgement state, inline step-up, signature-submitted pending state, and receipt posture explicit.

## Cross-task gap closure requirements

You must explicitly close the gaps the source corpus leaves open in this tranche:

- The corpus defines `SubmissionRecord` as settlement truth before an implementation boundary exists that prevents mirrors or callbacks from impersonating settlement.
  Build that boundary now.

- The corpus defines `AuthorityOperation`, `AuthorityBinding`, and request/response envelopes before a reusable sealed-model layer exists.
  Build one canonical layer rather than letting later send or callback code improvise partial transport objects.

- The corpus defines request identity semantics in prose before a byte-stable implementation exists for namespace hashing, duplicate bucket derivation, exact request identity, and collision handling.
  Close that seam now and fail closed on ambiguity.

- The corpus requires send-time revalidation, but queue recovery and delayed transport can otherwise drift into fresh token resolution or silent subject mismatch.
  Persist one grouped binding-drift sentinel and make all live sends depend on it.

- The corpus states that HMRC fraud-prevention data is legally significant, but leaves room for teams to treat it as transport fluff.
  Close that gap by making capture, validation, profile binding, redaction, and exemption posture typed and replay-safe.

- The corpus distinguishes ingress checkpoint truth from settlement truth, but callback/poll/recovery implementations can easily skip the durable checkpoint.
  Close that gap by forcing receipt-first persistence, explicit correlation posture, and quarantine-only mutation gates for ambiguous ingress.

- The corpus defines reconciliation budgets, resend legality, and escalation posture, but queue systems tend to re-derive them from worker-local retry state.
  Close that gap by persisting the full grouped control contract and by making resume/recovery reuse it exactly.

- The corpus defines the authority-calculation handshake and customer confirmation flow, but without a product implementation there is risk of loose refs, stale calculations, or generic-signoff UI.
  Close that gap with a sealed readiness context, stale-protection rules, and a portal route whose semantics are server-authored and Playwright-verified.

## Testing and evidence requirements

- Validate every persisted artifact against its authoritative schema before it is committed.
- Reuse deterministic seed fixtures from `pc_0077` for ids, timestamps, tie breaks, and reproducible chronology.
- Add unit tests for every ordering rule, ref legality rule, transition guard, hash derivation path, duplicate bucket rule, budget progression rule, and portal gating rule introduced here.
- Add integration tests for:
  - submission lifecycle projection into mirror/workflow/timeline
  - request identity and duplicate collision behavior
  - send-time revalidation under queue delay / replay / recovery
  - fraud-header capture + validation + request binding
  - ingress receipt checkpoint + normalization + settlement mutation gating
  - reconciliation budget preservation across crash/resume
  - final-declaration calculation retrieval + confirmation + packet/readiness continuity
- Any browser-visible route introduced in this block must be verified with Playwright using:
  - role / label / text / accessible-name locators first
  - no fixed sleeps
  - traces, screenshots, and video on retry/failure where supported
  - reduced-motion mode
  - keyboard traversal coverage
  - explicit stale-pack and stale-calculation recovery scenarios
  - mobile and desktop viewport checks where route composition materially changes

## Evidence discipline

The implementation agent must leave a typed trail:
- schema validations run
- invariants checked
- migrations applied
- deterministic tests added
- assumption markers emitted when a package, queue topic, or route did not previously exist
- a short design note for every place where the corpus required a gap closure or an explicit choice

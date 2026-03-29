# Test vectors (scenarios)

These vectors map one-to-one with the embodiment set in `embodiments_and_examples.md`.

## TV-01: Direct-subject quarterly update from structured records
- Embodiment ID: `EMB-01`
- Given `SUBJECT_SELF` with valid authority link and one clean business partition
- When a periodic compliance run is executed from structured records
- Then the run produces a sealed manifest, compute result, trust summary, filing packet, submission record, and obligation update

## TV-02: Agent-led quarterly update across multiple business partitions
- Embodiment ID: `EMB-02`
- Given an authorized agent acting for a client with two business partitions
- When the engine computes and submits partition-aware obligations
- Then partition integrity is preserved and outputs remain separated by business/obligation scope

## TV-03: In-year correction carried into the next quarterly update
- Embodiment ID: `EMB-03`
- Given a previously submitted quarterly update and newly corrected source facts before final declaration
- When a new working-state manifest is created
- Then the correction is carried into later periodic/year-end processing without opening an amendment case

## TV-04: End-of-year final declaration with authority calculation
- Embodiment ID: `EMB-04`
- Given year-end data sufficient for finalisation and a valid final-declaration provider profile
- When the engine triggers and retrieves the authority calculation and then submits final declaration
- Then the filed baseline is calculation-linked and authority-reconciled

## TV-05: Final declaration blocked by material parity divergence
- Embodiment ID: `EMB-05`
- Given authority comparison is available and a critical material difference exists
- When parity and trust are evaluated
- Then filing progression is capped at review or blocked until approved scoped remediation exists

## TV-06: Post-finalisation material drift leading to amendment
- Embodiment ID: `EMB-06`
- Given a confirmed final-declaration baseline and new material facts within the amendment window
- When drift is classified and amendment eligibility is evaluated
- Then the engine follows the intent-to-amend / confirm-amendment path before promoting a new baseline

## TV-07: Out-of-band filing discovered by authority reconciliation
- Embodiment ID: `EMB-07`
- Given a working case but authority state already exists outside the current packet chain
- When reconciliation reads the authority-held status
- Then submission state becomes `OUT_OF_BAND` and the engine opens review rather than duplicate filing

## TV-08: Authority correction observed after filing
- Embodiment ID: `EMB-08`
- Given a confirmed filed baseline and a later authority-exposed correction
- When authority reconciliation detects the changed position
- Then the engine records `AUTHORITY_CORRECTION`, rebuilds parity/trust, and routes to review

## TV-09: Retention-limited replay and enquiry defense
- Embodiment ID: `EMB-09`
- Given some upstream evidence is expired or pseudonymised but downstream artifacts remain retained
- When provenance replay or enquiry-pack generation is requested
- Then the graph remains structurally valid and returns limitation/tombstone notes rather than silent gaps

## TV-10: Analysis-only counterfactual run
- Embodiment ID: `EMB-10`
- Given an approved compliance manifest and a draft/candidate config profile
- When a child manifest is run in `ANALYSIS` mode
- Then outputs remain explicitly `analysis_only` and do not contaminate compliance truth

## TV-11: Degraded-data review path with no filing
- Embodiment ID: `EMB-11`
- Given a critical domain is missing or critical evidence has been erased
- When limited compute and trust evaluation run
- Then filing is blocked, trust degrades to `INSUFFICIENT_DATA` or `RED`, and remediation tasks are opened

## TV-12: Multi-product compatible chain
- Embodiment ID: `EMB-12`
- Given one logical case spanning bank import, bookkeeping data, document capture, and authority submission across multiple products
- When the engine freezes and canonicalizes the combined source chain
- Then product-of-origin and transformation lineage remain preserved inside one manifest-scoped decision bundle

## TV-13: Pre-manifest step-up uses the same decision grammar
- Given access policy returns `REQUIRE_STEP_UP` before manifest allocation
- When the client renders the access-blocked response
- Then the response preserves `attention_state`, explicit `actionability_state`, plain reason text, and the same ordered detail entry grammar used by the mounted low-noise shell

## TV-14: Reconnect restores no-safe-action posture and drawer focus
- Given a blocked or waiting manifest with `actionability_state = NO_SAFE_ACTION`, an active detail module, and a live `focus_anchor_ref`
- When the client reloads from `ExperienceDelta` catch-up or terminal bundle reload
- Then the shell restores the same detail module, keeps focus on the surviving object, and does not invent a fallback primary action

## TV-15: Low-noise frame emits only four peer shell surfaces
- Given `experience_profile = LOW_NOISE` and a manifest whose richer observatory read models are all materialized
- When `BUILD_LIVE_EXPERIENCE_FRAME(...)` emits a reconnect-safe frame or `ExperienceDelta`
- Then the top-level surface order contains only `CONTEXT_BAR`, `DECISION_SUMMARY`, `ACTION_STRIP`, and `DETAIL_DRAWER`, while richer observatory surfaces remain accessible only as drawer modules or explicit compare/audit payloads

## TV-16: Verbose source text is trimmed without losing legal meaning
- Given authority, drift, or audit inputs whose raw prose exceeds the low-noise shell copy budget
- When summary, context, action, and detail-entry microcopy are built
- Then the shell retains machine-stable reason and action codes, trims visible copy to budget, and routes surplus detail into the relevant drawer module instead of overflowing the primary shell

## TV-17: Multiple simultaneous issues collapse to one dominant posture
- Given a manifest with a hard block, a masking limitation, and a late-data notice at the same time
- When `DERIVE_ATTENTION_POLICY(...)` ranks visible concerns for the low-noise shell
- Then one dominant primary issue is surfaced, remaining concerns collapse into `secondary_notice_count`, and the shell does not render parallel competing primary panels

## TV-18: Duplicate command retry returns one durable receipt
- Given a browser or operator client times out after posting a filing-capable command but retries with the same `command_id` and `idempotency_key`
- When the northbound API re-evaluates the request
- Then it returns the original `ApiCommandReceipt`, does not enqueue duplicate side effects, and the manifest emits at most one legal transition for that command

## TV-19: Experience stream rebase rejects stale-action approval
- Given an open client session resumes from a stale `resume_token` after `frame_epoch` has advanced and a user attempts an approval against an old summary
- When the client reconnects and submits the command with stale-view guards
- Then the stream returns `REBASE_REQUIRED`, the command fails with `VIEW_STALE`, and the user is forced onto a fresh snapshot before any approval or override is accepted

## TV-20: Authority token rotation during pending transmit preserves subject binding
- Given an authority transmit or reconciliation attempt is pending while the subject-specific token set rotates
- When the gateway resumes delivery or polling
- Then the operation rebinds through the governed token vault, preserves the same subject/client binding, and never leaks or reuses the wrong token across clients

## TV-21: Additive schema migration does not corrupt in-flight manifests
- Given a release introduces a new schema bundle and datastore migration while older manifests remain sealed or in progress
- When the deployment promotes the new build
- Then existing manifests continue under their frozen schema/config bundle, new manifests allocate under the new bundle, and rollback never rewrites historical artifact meaning

## TV-22: Restore drill preserves audit chain and re-applies erasure limitations
- Given the primary stores are restored from a recovery checkpoint after prior erasure and retention actions
- When audit reconstruction and replay-safe enquiry-pack generation are executed
- Then audit hash continuity remains provable, missing evidence is surfaced as an explicit limitation, and any restore-resurrected personal data is queued for compensating re-erasure under audit

## TV-23: Cross-tenant and cross-mask cache keys cannot bleed experience state
- Given two tenants or two principals with different masking posture open the same logical client/period route
- When the read model, experience snapshot, or CDN/cache layer serves the response
- Then cache keys include tenant, principal class, masking fingerprint, and manifest identity, and no full-data or cross-tenant surface leaks into the other session

## TV-24: Client portal home compresses expert posture into one guided action
- Given a client has one overdue document request, one completed review, and one pending approval pack
- When `BUILD_CLIENT_PORTAL_WORKSPACE(...)` renders the home experience for `CLIENT_CONTRIBUTOR`
- Then the first view shows one status hero, grouped tasks, plain-language deadlines, and no raw gate codes, manifest lineage, or expert surface names

## TV-25: Resumable upload survives a mobile reconnect without duplicate files
- Given a client begins a governed `ClientUploadSession` on mobile, loses connectivity mid-transfer, and later resumes
- When the client reloads upload-session status and continues the transfer
- Then the same upload session is resumed, duplicate files are not created, scanner state remains visible, and the document request stays attached to the upload

## TV-26: Approval-pack stale view blocks outdated sign-off
- Given a client viewed approval pack version A and version B later supersedes it before signing
- When the client submits `CLIENT_PORTAL_SIGN_APPROVAL_PACK` with the stale `approval_pack_hash` from version A
- Then the command fails `VIEW_STALE`, version A is `SUPERSEDED`, and the client is routed to the new summary before any sign-off is accepted

## TV-27: Onboarding reveals one required step at a time
- Given an invited client must verify identity, connect authority access, and upload mandatory documents
- When the portal renders `ClientOnboardingJourney`
- Then only the current required step is primary, completed steps collapse into progress summary, and save-and-return restores the same step without reopening the whole journey

## TV-28: Keyboard-only client portal flow remains fully operable
- Given a `CLIENT_SIGNATORY` uses keyboard-only navigation at 200 percent zoom
- When they move from the home status hero to a document request and then to an approval pack sign-off flow
- Then all primary actions, file-selection alternatives, disclosure panels, and sign-off confirmations remain reachable in semantic focus order without hover-only dependencies

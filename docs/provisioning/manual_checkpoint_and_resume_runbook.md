# Manual Checkpoint And Resume Runbook

## Purpose

This runbook governs blocked-portal interruptions for provisioning automation.
It applies when a provider portal shows CAPTCHA, MFA, step-up, email verification, device approval, suspicious-login review, policy block, or an unknown challenge that must fail closed.

## Required artifacts

- `config/provisioning/manual_checkpoint_reason_codes.json`
- `config/provisioning/blocked_portal_resume_policy.json`
- `config/provisioning/checkpoint_redaction_policy.json`
- `data/provisioning/manual_checkpoint_record.template.json`
- Runtime-generated checkpoint record and evidence-pack JSON
- Runtime-generated resume snapshot under the provisioning resume store

## Capture protocol

1. Stop on the checkpoint surface. Do not attempt to bypass the provider challenge.
2. Freeze provider, route, page identity, step identity, selector-manifest version, and safe last-completed step.
3. Capture sanitized evidence only:
   - masked screenshot if allowed
   - DOM signature hash rather than raw DOM
   - safe route fingerprint and title/URL hashes
   - redacted copy snapshot
4. Persist a manual checkpoint record and evidence pack.
5. Persist or update the resume snapshot with the open checkpoint.

## Redaction posture

- Never persist raw one-time codes, challenge responses, mailbox details, browser storage bodies, cookies, or bearer tokens.
- Mask `[data-sensitive='true']`, password fields, and one-time-code fields in screenshots.
- Retain DOM as hash only unless a future adapter proves a safer provider-specific exception.
- Suppress traces by default on blocked challenge screens.

## Resume protocol

1. Human completes the provider-owned step outside automation.
2. Resume from the stored checkpoint and begin with a no-op verification step.
3. Revalidate:
   - session posture
   - expected post-checkpoint route or provider successor
   - selector drift
   - same-object identity for the target workflow
4. Continue only after the verification read succeeds.

## Forbidden actions

- Replaying stale pre-checkpoint submit actions
- Reusing invalidated tokens or browser state without revalidation
- Treating unknown challenges as safe to continue
- Persisting raw one-time codes or provider secrets in repo-tracked artifacts
- Using telemetry-only signals as permission to resume mutation

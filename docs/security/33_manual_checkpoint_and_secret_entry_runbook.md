# Manual Checkpoint and Secret Entry Runbook

Generated on `2026-04-18` for `pc_0033`.

This runbook defines how an operator safely handles provisioning checkpoints that involve credentials, one-time reveal values, MFA codes, or browser storage material.

## 1. Preconditions

Before a run reaches a secret-entry step:

- confirm the run is executing in `env_local_provisioning_workstation` or another explicitly approved provisioning environment
- confirm the target namespace and key naming pattern exist in [`data/security/provisioning_secret_inventory.json`](../../data/security/provisioning_secret_inventory.json)
- confirm capture mode for the step is `SUPPRESS` or `METADATA_ONLY`
- confirm the operator is using a governed secure channel for secret entry, not chat, notes, or repo files
- confirm any bootstrap vault role is short-lived and attributable

## 2. Secret Entry Decision Tree

### A. Manual password or activation-link entry

Use this when:

- entering a Developer Hub password
- entering inbox-derived activation material
- pasting an approval code or recovery code

Required behavior:

1. open a manual checkpoint
2. suppress screenshots, DOM snapshots, and traces
3. record only the checkpoint metadata and target secret class
4. complete the entry manually
5. verify post-entry state without echoing the secret
6. write the resulting secret only to the declared vault namespace or write only a reference if the value already exists there

### B. Provider one-time reveal

Use this when a provider portal displays a client secret or callback secret only once.

Required behavior:

1. suppress all browser artifacts before the reveal step
2. copy the secret directly into the governed vault path
3. verify the vault write succeeded
4. persist only:
   - `vault_write_receipt_ref`
   - `secret_version_ref`
   - `lineage_ref`
   - `operator_alias`
   - `captured_at`
5. never reopen the reveal view to create screenshots or traces
6. close the checkpoint only after the vault receipt exists

## 3. MFA, Recovery Code, and 2SV Handling

HMRC’s current user-restricted guidance still routes users through 2-step verification and may require additional identity confirmation. That means provisioning checkpoints must assume MFA may appear during Developer Hub or sandbox auth journeys.

At an MFA checkpoint:

- never type or paste the code into terminal logs
- never copy the code into run notes
- never retain the raw code in checkpoint metadata
- use `MANUAL_SECURE_ENTRY_AT_CHECKPOINT` only
- record only:
  - checkpoint ID
  - reason code
  - operator alias
  - verification timestamp
  - post-entry success/failure evidence

Recovery codes are treated as rotatable secret material, not as a troubleshooting note.

## 4. Browser Storage Material

If the provisioning workspace persists `storageState` at all:

- treat it as `HIGHLY_SENSITIVE`
- store only a vault or secret-manager reference in any tracked artifact
- set explicit retention and purge timers
- invalidate it after:
  - password reset
  - client secret rotation that changes auth posture
  - operator change
  - environment or namespace change
  - suspected compromise

No `storageState` blob may be attached to a Playwright HTML report, trace archive, or repo fixture.

## 5. Sandbox Test User Credentials

HMRC currently states that sandbox test users:

- are unique
- are reusable
- may be shared across applications
- are automatically deleted after `90` days / `3` months of inactivity

Operational rules:

- first look for an unused compatible test user before creating a new one
- never store the raw username/password pair in repo-tracked outputs
- store only a vault ref and the tax-identifier metadata that is safe to retain
- when a test user must be replaced, rotate by allocating a new bundle and retiring the old ref
- do not reuse Developer Hub namespaces for sandbox test users

## 6. Client Secret Rotation Runbook

For HMRC client secrets:

1. generate the new client secret in the provider console
2. capture it directly into the declared vault namespace
3. create the new `SecretVersion` lineage record or equivalent metadata
4. update dependent app config or vault aliases to point to the new version
5. verify token generation or callback validation using the new version
6. attest the cutover
7. retire the old secret version
8. keep overlap at `2` active versions or fewer unless Security explicitly approves a temporary exception

Never delete the old secret before verification succeeds.

## 7. Artifact and Log Hygiene

Always assume the following artifacts can leak secrets unless explicitly controlled:

- screenshots
- DOM snapshots
- Playwright traces
- HTML reports
- downloaded files
- clipboard history
- shell history
- CI stdout

The default safe posture for any step involving a visible secret is:

- `screenshot = SUPPRESS`
- `trace = SUPPRESS`
- `dom_snapshot = SUPPRESS`
- `general_log = METADATA_ONLY`

## 8. Break-Glass Handling

Break-glass recovery credentials are `CRITICAL`.

They require:

- dual-control approval
- explicit operator attribution
- incident ticket or emergency change reference
- immediate post-use review
- reset or reissue after use unless Security signs off on a narrower action

They must never be mixed into ordinary provisioning namespaces.

## 9. Run Completion

A secret-entry checkpoint is only complete when:

- the value is stored in the correct vault namespace or its existing ref has been verified
- artifact suppression rules were honored
- the post-entry verification succeeded
- the checkpoint resume note does not contain the raw secret
- any temporary contaminated local surfaces have been closed or purged

## 10. One-Sentence Summary

Provisioning checkpoints are for controlled human action and sanitized verification only; the raw value exists only long enough to cross into the governed vault boundary and is never preserved in the run artifacts themselves.

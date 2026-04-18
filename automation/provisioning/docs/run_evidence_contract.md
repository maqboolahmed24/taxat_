# Run Evidence Contract

Provisioning evidence must be sanitized, append-only where practical, and safe to render in the run viewer.

## Evidence Classes

- Screenshot metadata
- DOM snapshot references
- Trace references
- Structured logs
- Redaction notes
- Manual-checkpoint annotations

## Capture Rules

- Secret-entry steps default to `SUPPRESS` or `REDACT`, never unrestricted capture.
- Screenshots and DOM snapshots may be recorded only if their retention path and redaction posture are explicit.
- Traces are useful for debugging but may contain sensitive DOM state. They should be referenced, not inlined into viewer payloads.
- Viewer payloads carry sanitized metadata only.

## Redaction Rules

- secrets must never be logged in plaintext
- emails and personal identifiers should be masked or redacted when surfaced in viewer payloads
- redaction notes must record which rule fired without re-emitting the secret

OWASP anchors:

- <https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html>
- <https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html>

## Artifact Layout

- `artifacts/test-results/`: Playwright output
- `artifacts/html-report/`: Playwright HTML report
- `artifacts/resume/`: resumable checkpoint state

These paths are viewer-safe only after the evidence payload has been redacted.

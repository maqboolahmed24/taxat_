# Retention, Error, and Observability Overview

This file is now a short overview. The authoritative specifications are:

- `retention_and_privacy.md` for retention tagging, expiry behavior, and privacy defaults
- `error_model_and_remediation_model.md` for structured failures, remediation tasks, and compensation
- `observability_and_audit_contract.md` for traces, metrics, logs, audit evidence, and correlation rules

At a high level:

- retention determines how long artifacts, authority exchanges, and proofs remain available
- errors and remediation determine how failures are typed, owned, retried, compensated, or escalated
- observability and audit determine how runtime visibility is separated from legal/compliance evidence

# Glossary

**Authority**: The external system of record whose acknowledgements define legal submission state (e.g., a tax authority).

**Principal**: The authenticated actor (human or service) initiating an operation.

**Tenant**: A firm-level boundary for data isolation, policy, configuration, and audit.

**Client**: A taxpayer or entity managed under a tenant.

**Period**: A time scope for obligations (tax year, quarter, or other statutory period).

**Connector**: A controlled integration to a data provider (authority, bank, ledger, document inbox).

**Evidence Item**: An auditable artifact supporting a fact (bank statement line, invoice, receipt, authority response).

**Canonical Fact**: Normalized representation of a domain-specific statement (income event, expense, allowance, adjustment).

**Snapshot**: An immutable set of canonical facts + metadata for a given (tenant, client, period, scope).

**Run Manifest**: The hash-bound execution control object for a run, capturing inputs, versions, policies, code build, timestamps, and produced artifacts; its lifecycle and outcome projections may advance only through named transitions and audited updates.

**Gate**: A policy decision point that permits, warns, or blocks downstream operations based on trust & compliance rules.

**Override**: A human-approved exception that changes a gate decision or interpretation, always with scope + rationale + expiry.

**Decision Bundle**: The set of artifacts created by a run: snapshot, compute result, risk, trust, evidence graph, twin view, filing packet, etc.

**Parity**: A measured difference between internal computed figures and authority-provided figures or prior submissions.

**Drift**: Any change in facts or configuration that changes outcomes after an earlier decision or submission.

**Retention Tag**: Metadata describing the retention class and expiration rules for an artifact.

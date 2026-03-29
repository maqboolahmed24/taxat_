# Audit & Provenance Overview

This file is now a short overview. The authoritative specifications are:

- `provenance_graph_semantics.md` for graph node, edge, path, confidence, and enquiry-pack rules
- `observability_and_audit_contract.md` for audit event structure, correlation keys, and audit-versus-telemetry separation

At a high level:

- provenance explains how artifacts, facts, evidence, configs, overrides, and authority states connect
- audit proves which compliance-significant events happened, in what order, and under which manifest context
- both must remain replayable, manifest-linked, and safe for regulator or reviewer scrutiny

# Audit & Provenance Overview

This file is the entry contract for the audit/provenance subsystem.
The detailed authoritative specifications remain:

- `provenance_graph_semantics.md` for graph node, edge, lineage-hop, defence-path, and enquiry-pack rules
- `observability_and_audit_contract.md` for audit event structure, stream ordering, correlation keys, and audit-versus-telemetry separation

This overview does not replace those specifications.
Its job is to define how they cooperate as one forensic layer so implementers do not invent local
precedence, correlation, export, or closure rules.

Historical findings closure is tracked separately in `AUDIT_FINDINGS.md` and
`PATCH_RESOLUTION_INDEX.md`. Those documents govern whether historical defects are still open, but
they are not substitutes for live audit evidence, provenance topology, or `AuditInvestigationFrame`
payload semantics.

## 1. Boundary and proof responsibilities

The subsystem answers three different classes of questions:

- `Did it happen, when was it durably recorded, and under which manifest/actor/service context?`
  Answer from audit.
- `Why does this artifact, decision, or authority posture exist, and what upstream objects support it?`
  Answer from provenance.
- `What runtime behavior was observed while it happened?`
  Answer from telemetry, but only as operational explanation, never as compliance proof.

The proof boundary SHALL be explicit:

- audit is the source of truth for occurrence, canonical durable ordering, and compliance-significant
  actor/service context
- provenance is the source of truth for derivation topology, lineage hops, support paths, and
  object-to-object explanation
- telemetry may enrich investigation, but SHALL NOT override or replace either audit evidence or
  provenance explanation

If audit and provenance appear inconsistent, the engine SHALL open typed investigation or remediation
state rather than letting a local consumer choose one silently.

## 2. Shared correlation spine

Audit and provenance are separate stores/views, but they SHALL join through a minimum shared
correlation spine.
At minimum, any compliance-significant event, node, edge, path, or exported package SHALL preserve
the applicable subset of:

- `tenant_id`
- `client_id`
- `manifest_id`
- `root_manifest_id`
- `parent_manifest_id` or other explicit continuation lineage refs when relevant
- `period` or obligation scope where relevant
- `object_refs[]`
- `activity_ref`
- `actor_ref`
- `service_ref`
- `authority_operation_ref` or `submission_record_id` where authority state is involved
- `error_id`, `task_id`, and `compensation_id` where failure/remediation state is involved
- `audit_event_id`, `audit_stream_ref`, and `stream_sequence` for durable audit anchors

No compliance-significant answer may require a consumer to guess the join key from local UI context
or free text.

## 3. Canonical chronology and lineage

Merged investigations SHALL preserve both durable audit order and explicit provenance lineage.

- audit chronology SHALL follow the audit contract: canonical order comes from
  `audit_stream_ref + stream_sequence`, not from raw wall-clock timestamps
- provenance chronology SHALL remain manifest-scoped with explicit cross-manifest continuation,
  replay, recovery, amendment, and supersession hops
- merged investigation views SHALL surface each lineage hop explicitly so a replayed or amended run
  never appears as one flat proof chain
- merged investigation views SHALL also preserve the governing provenance partition contract and the
  exact boundary edge ref for every cross-manifest hop so reviewers cannot widen tenant, client, or
  scope by query context
- raw source time, provider time, and user-device time MAY appear as explanatory fields, but SHALL
  NOT replace durable audit order or explicit provenance lineage

This rule exists to prevent clock skew, late delivery, and continuation branches from corrupting the
forensic story.

## 4. Investigation and export package boundary

Any reviewer, regulator, or internal-forensics package produced from this subsystem SHALL contain both
audit and provenance material, not one without the other.

At minimum, a forensic package SHALL bundle:

- the relevant audit trail slice in canonical stream order
- the relevant provenance defence path or enquiry-pack slice
- manifest-lineage context for any continuation, replay, recovery, or supersession hop
- linked decision, authority, error, remediation, compensation, override, and accepted-risk refs
  where they affect the conclusion being exported
- the applicable masking, retention, redaction, or limitation posture

Any omission caused by masking, retention, privacy, or authority-side limits SHALL be declared
explicitly as a limitation entry.
The subsystem SHALL NOT export a silently incomplete package that looks whole to the reviewer.

Route-visible audit workbenches such as `AuditInvestigationFrame` SHALL remain projections of this
same audit/provenance boundary. They MAY summarize, diff, compact, or export the slice differently,
but they SHALL NOT invent alternate chronology, neighborhood, or omission semantics.

Those durable provenance-side exports SHALL validate against first-class contracts in `schemas/`
for `EvidenceGraph`, `EnquiryPack`, and their supporting node, edge, and path artifacts so
investigation and regulator packages do not depend on local viewer-specific assumptions.

## 5. Failure, remediation, and exception continuity

Failures and exceptions are part of the forensic layer, not side notes.

Whenever `ErrorRecord`, `RemediationTask`, `CompensationRecord`, accepted-risk approval, or override
state changes compliance posture, the subsystem SHALL maintain both:

- an audit-side durable event trail proving that the event happened
- provenance-side anchors linking the affected objects, activities, and downstream consequences

Those failure-control artifacts SHALL validate against first-class contracts in `schemas/` for
`ErrorRecord`, `RemediationTask`, `CompensationRecord`, `AcceptedRiskApproval`, and
`FailureInvestigation` so investigation exports do not depend on viewer-local interpretation.
The same chain SHALL now remain bound by `failure_resolution_contract{...}` so ownership, next
path, compensation, investigation, accepted-risk, and closure evidence cannot drift between audit
and provenance views.

Reopen, supersede, compensate, or accept-risk transitions SHALL preserve the full chain rather than
rewriting earlier state in place.
If one side exists without the other for a compliance-significant failure or exception, the
forensic story is incomplete and the subsystem SHALL surface that gap as an explicit limitation or
investigation condition.

## 6. Proof-bundle coupling

Where a conclusion is filing-capable, the forensic export boundary SHALL include the controlling
`ProofBundle` or an explicit statement that no valid controlling bundle exists.

At minimum, merged audit/provenance packages for filing-capable conclusions SHALL preserve:

- `proof_bundle_ref`
- `primary_path_ref`
- rejected decisive path refs when they exist
- rejected-path ordering and rejection basis when they exist
- contradiction refs affecting the current filing meaning
- proof-closure contract and closure failure reasons
- replay recipe status
- explanation render status for operator and reviewer surfaces
- retention-limited explainability posture and affected decisive refs when proof survives only as a
  tombstone, pseudonymised artifact, or other limited witness

A package that contains an `EvidenceGraph` but omits the controlling proof bundle for the same target
SHALL be treated as incomplete.

## 7. Replay and explanation failure handling

Replay and rendering are part of the forensic story.

- proof reconstruction failure SHALL emit audit evidence and SHALL degrade provenance integrity;
- explanation rendering failure SHALL be represented as an explicit limitation or error, not as a
  silently missing attachment;
- payload expiry in `AuditEvent` SHALL preserve object, reason, and lineage minimums through
  `retained_context{{...}}` rather than dropping the event to an uninterpretable hash-only row;
- if replay fails for a filing-critical target, the merged audit/provenance package SHALL expose that
  failure even when a stale historical bundle still exists.

## Overview invariants

The audit/provenance entry layer SHALL satisfy these invariants:

1. no compliance-significant answer is supported by telemetry alone
2. no merged investigation view sorts compliance history solely by wall-clock timestamps
3. no reviewer or regulator package is emitted without explicit declaration of masking or omission
4. no failure, remediation, compensation, override, or accepted-risk conclusion exists without both
   audit evidence and provenance anchors
5. no cross-manifest explanation flattens continuation, replay, recovery, amendment, or supersession
   hops into one implicit chain
6. no filing-capable forensic package omits the controlling proof bundle or hides proof reconstruction
   failure

At a high level, provenance explains why system state is what it is, audit proves what happened and
in what durable order, and both must stay joinable, replayable, and scrutiny-safe for operators,
reviewers, and regulators.

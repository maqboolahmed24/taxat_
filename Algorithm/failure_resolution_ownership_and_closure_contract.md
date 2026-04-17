# Failure Resolution Ownership And Closure Contract

## Purpose

The failure lifecycle SHALL preserve one continuous basis from failure detection through retry,
remediation, compensation, investigation, accepted-risk approval, and verified closure. Material
failures SHALL not degrade into logs, free text, or disconnected operational objects.

The shared machine contract for this boundary is
`schemas/failure_resolution_contract.schema.json`.

## Governing Model

Every governed failure artifact SHALL bind one `failure_resolution_contract{...}` with:

- `lifecycle_role`
- `role_specific_binding_policy`
- fixed policies that require:
  - no material failure without a durable typed object;
  - owner type plus owner reference unless the owner is explicitly system-owned;
  - one lawful next path while the failure remains open;
  - retry legality to stay bound to retry class, retry budget, and retry preconditions;
  - terminal or completed states to retain basis, evidence, and audit lineage;
  - accepted risk to retain approval basis, bounded scope, and expiry; and
  - error, remediation, compensation, investigation, and approval links to stay coherent.

The governed roles are:

- `ERROR_RECORD`
- `REMEDIATION_TASK`
- `COMPENSATION_RECORD`
- `FAILURE_INVESTIGATION`
- `ACCEPTED_RISK_APPROVAL`

## Required Outcomes

The architecture SHALL reject the following ambiguity classes:

- material failures represented only by log lines or free-text summaries;
- `ErrorRecord` posture with no lawful owner, no next path, or no child-linkage basis;
- remediation tasks closing without explicit evidence or without declaring what effect they have on
  the source error;
- compensation flows with no explicit owner, no closure evidence, or no verification basis;
- accepted-risk posture lacking approval lineage, bounded scope, or expiry;
- retry posture that bypasses retry class, retry budget, or retry preconditions; and
- terminal resolution reached without basis, evidence, or causal audit lineage.

## Surface Rules

`ErrorRecord` SHALL carry the dominant remediation owner, explicit next-path linkage when the path is
object-backed, and typed links to remediation task, investigation, compensation, and accepted-risk
companions as applicable.

`RemediationTask` SHALL preserve explicit closure evidence and `error_resolution_effect` so task
completion cannot silently claim source-error closure.

`CompensationRecord` SHALL preserve owner, closure basis, and evidence so partial rollback or
preserve-and-limit posture remains explainable and reviewable.

`FailureInvestigation` SHALL remain the durable forensic branch with owner, outcome, evidence, and
accepted-risk linkage, not a UI-only review note.

`AcceptedRiskApproval` SHALL remain the only lawful companion for accepted-risk closure and SHALL
preserve authorization basis, bounded scope, and expiry.

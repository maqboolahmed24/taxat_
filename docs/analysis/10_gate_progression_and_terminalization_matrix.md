# Gate Progression and Terminalization Matrix

| Gate | Decision | Blocks Seal | Survives Seal | Review Only | Notice | Terminates Run | Child Manifest Required |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ACCESS_GATE` | `ALLOW` | `false` | `false` | `false` | `false` | `false` | `false` |
| `ACCESS_GATE` | `ALLOW_MASKED` | `false` | `false` | `false` | `true` | `false` | `false` |
| `ACCESS_GATE` | `DENY` | `true` | `false` | `false` | `false` | `true` | `false` |
| `ACCESS_GATE` | `REQUIRE_APPROVAL` | `true` | `false` | `true` | `false` | `true` | `false` |
| `ACCESS_GATE` | `REQUIRE_STEP_UP` | `true` | `false` | `false` | `false` | `true` | `false` |
| `MANIFEST_GATE` | `HARD_BLOCK` | `true` | `false` | `false` | `false` | `true` | `true` |
| `MANIFEST_GATE` | `OVERRIDABLE_BLOCK` | `true` | `false` | `true` | `false` | `false` | `false` |
| `MANIFEST_GATE` | `PASS` | `false` | `false` | `false` | `false` | `false` | `false` |
| `MANIFEST_GATE` | `PASS_WITH_NOTICE` | `false` | `true` | `false` | `true` | `false` | `false` |
| `ARTIFACT_CONTRACT_GATE` | `HARD_BLOCK` | `true` | `false` | `false` | `false` | `true` | `true` |
| `ARTIFACT_CONTRACT_GATE` | `PASS` | `false` | `false` | `false` | `false` | `false` | `false` |
| `ARTIFACT_CONTRACT_GATE` | `PASS_WITH_NOTICE` | `false` | `true` | `false` | `true` | `false` | `false` |
| `INPUT_BOUNDARY_GATE` | `HARD_BLOCK` | `true` | `false` | `false` | `false` | `true` | `true` |
| `INPUT_BOUNDARY_GATE` | `MANUAL_REVIEW` | `false` | `true` | `true` | `false` | `false` | `false` |
| `INPUT_BOUNDARY_GATE` | `PASS` | `false` | `false` | `false` | `false` | `false` | `false` |
| `INPUT_BOUNDARY_GATE` | `PASS_WITH_NOTICE` | `false` | `true` | `false` | `true` | `false` | `false` |
| `DATA_QUALITY_GATE` | `HARD_BLOCK` | `true` | `false` | `false` | `false` | `true` | `true` |
| `DATA_QUALITY_GATE` | `MANUAL_REVIEW` | `false` | `true` | `true` | `false` | `false` | `false` |
| `DATA_QUALITY_GATE` | `OVERRIDABLE_BLOCK` | `true` | `false` | `true` | `false` | `false` | `false` |
| `DATA_QUALITY_GATE` | `PASS` | `false` | `false` | `false` | `false` | `false` | `false` |
| `DATA_QUALITY_GATE` | `PASS_WITH_NOTICE` | `false` | `true` | `false` | `true` | `false` | `false` |
| `RETENTION_EVIDENCE_GATE` | `HARD_BLOCK` | `false` | `true` | `false` | `false` | `true` | `true` |
| `RETENTION_EVIDENCE_GATE` | `MANUAL_REVIEW` | `false` | `true` | `true` | `false` | `false` | `false` |
| `RETENTION_EVIDENCE_GATE` | `OVERRIDABLE_BLOCK` | `false` | `true` | `true` | `false` | `false` | `false` |
| `RETENTION_EVIDENCE_GATE` | `PASS` | `false` | `false` | `false` | `false` | `false` | `false` |
| `RETENTION_EVIDENCE_GATE` | `PASS_WITH_NOTICE` | `false` | `true` | `false` | `true` | `false` | `false` |
| `PARITY_GATE` | `HARD_BLOCK` | `false` | `true` | `false` | `false` | `true` | `true` |
| `PARITY_GATE` | `MANUAL_REVIEW` | `false` | `true` | `true` | `false` | `false` | `false` |
| `PARITY_GATE` | `OVERRIDABLE_BLOCK` | `false` | `true` | `true` | `false` | `false` | `false` |
| `PARITY_GATE` | `PASS` | `false` | `false` | `false` | `false` | `false` | `false` |
| `PARITY_GATE` | `PASS_WITH_NOTICE` | `false` | `true` | `false` | `true` | `false` | `false` |
| `TRUST_GATE` | `HARD_BLOCK` | `false` | `true` | `false` | `false` | `true` | `true` |
| `TRUST_GATE` | `MANUAL_REVIEW` | `false` | `true` | `true` | `false` | `false` | `false` |
| `TRUST_GATE` | `OVERRIDABLE_BLOCK` | `false` | `true` | `true` | `false` | `false` | `false` |
| `TRUST_GATE` | `PASS` | `false` | `false` | `false` | `false` | `false` | `false` |
| `TRUST_GATE` | `PASS_WITH_NOTICE` | `false` | `true` | `false` | `true` | `false` | `false` |
| `AMENDMENT_GATE` | `HARD_BLOCK` | `false` | `true` | `false` | `false` | `true` | `true` |
| `AMENDMENT_GATE` | `MANUAL_REVIEW` | `false` | `true` | `true` | `false` | `false` | `false` |
| `AMENDMENT_GATE` | `OVERRIDABLE_BLOCK` | `false` | `true` | `true` | `false` | `false` | `false` |
| `AMENDMENT_GATE` | `PASS` | `false` | `false` | `false` | `false` | `false` | `false` |
| `AMENDMENT_GATE` | `PASS_WITH_NOTICE` | `false` | `true` | `false` | `true` | `false` | `false` |
| `FILING_GATE` | `HARD_BLOCK` | `false` | `true` | `false` | `false` | `true` | `true` |
| `FILING_GATE` | `MANUAL_REVIEW` | `false` | `true` | `true` | `false` | `false` | `false` |
| `FILING_GATE` | `OVERRIDABLE_BLOCK` | `false` | `true` | `true` | `false` | `false` | `false` |
| `FILING_GATE` | `PASS` | `false` | `false` | `false` | `false` | `false` | `false` |
| `FILING_GATE` | `PASS_WITH_NOTICE` | `false` | `true` | `false` | `true` | `false` | `false` |
| `SUBMISSION_GATE` | `HARD_BLOCK` | `false` | `true` | `false` | `false` | `true` | `true` |
| `SUBMISSION_GATE` | `MANUAL_REVIEW` | `false` | `true` | `true` | `false` | `false` | `false` |
| `SUBMISSION_GATE` | `PASS` | `false` | `false` | `false` | `false` | `false` | `false` |
| `SUBMISSION_GATE` | `PASS_WITH_NOTICE` | `false` | `true` | `false` | `true` | `false` | `false` |

## Effect Summaries

- `ACCESS_GATE` / `ALLOW`: Proceed into manifest allocation and non-access gate planning.
- `ACCESS_GATE` / `ALLOW_MASKED`: Continue, but masking binds only downstream projection and export surfaces.
- `ACCESS_GATE` / `DENY`: Pre-manifest hard denial; execution stops before any manifest allocation.
- `ACCESS_GATE` / `REQUIRE_APPROVAL`: Pre-manifest access exit; approval flow must complete before execution can start.
- `ACCESS_GATE` / `REQUIRE_STEP_UP`: Pre-manifest access exit; runtime cannot allocate a manifest until stronger authentication succeeds.
- `MANIFEST_GATE` / `HARD_BLOCK`: Blocks seal and terminalizes the pre-start path; legal continuation requires remediation or a child/replay lineage.
- `MANIFEST_GATE` / `OVERRIDABLE_BLOCK`: Blocks seal until a valid in-scope override is active for this gate.
- `MANIFEST_GATE` / `PASS`: Allows the pre-seal chain to continue toward a complete ready-to-seal tape.
- `MANIFEST_GATE` / `PASS_WITH_NOTICE`: Allows seal while preserving auditable notice posture for later TRUST_GATE and FILING_GATE consumption.
- `ARTIFACT_CONTRACT_GATE` / `HARD_BLOCK`: Blocks seal and terminalizes the pre-start path; legal continuation requires remediation or a child/replay lineage.
- `ARTIFACT_CONTRACT_GATE` / `PASS`: Allows the pre-seal chain to continue toward a complete ready-to-seal tape.
- `ARTIFACT_CONTRACT_GATE` / `PASS_WITH_NOTICE`: Allows seal while preserving auditable notice posture for later TRUST_GATE and FILING_GATE consumption.
- `INPUT_BOUNDARY_GATE` / `HARD_BLOCK`: Blocks seal and terminalizes the pre-start path; legal continuation requires remediation or a child/replay lineage.
- `INPUT_BOUNDARY_GATE` / `MANUAL_REVIEW`: Allows seal, but the unresolved review posture remains binding after seal and caps later automation.
- `INPUT_BOUNDARY_GATE` / `PASS`: Allows the pre-seal chain to continue toward a complete ready-to-seal tape.
- `INPUT_BOUNDARY_GATE` / `PASS_WITH_NOTICE`: Allows seal while preserving auditable notice posture for later TRUST_GATE and FILING_GATE consumption.
- `DATA_QUALITY_GATE` / `HARD_BLOCK`: Blocks seal and terminalizes the pre-start path; legal continuation requires remediation or a child/replay lineage.
- `DATA_QUALITY_GATE` / `MANUAL_REVIEW`: Allows seal, but the unresolved review posture remains binding after seal and caps later automation.
- `DATA_QUALITY_GATE` / `OVERRIDABLE_BLOCK`: Blocks seal until a valid in-scope override is active for this gate.
- `DATA_QUALITY_GATE` / `PASS`: Allows the pre-seal chain to continue toward a complete ready-to-seal tape.
- `DATA_QUALITY_GATE` / `PASS_WITH_NOTICE`: Allows seal while preserving auditable notice posture for later TRUST_GATE and FILING_GATE consumption.
- `RETENTION_EVIDENCE_GATE` / `HARD_BLOCK`: Terminalizes the current progression path; legal continuation requires remediation or a new child lineage.
- `RETENTION_EVIDENCE_GATE` / `MANUAL_REVIEW`: Routes into reviewer-facing progression without allowing straight-through automation.
- `RETENTION_EVIDENCE_GATE` / `OVERRIDABLE_BLOCK`: Blocks progression until a valid in-scope override is active for the unresolved prerequisite.
- `RETENTION_EVIDENCE_GATE` / `PASS`: Allows the next ordered gate or live authority progression to continue automatically.
- `RETENTION_EVIDENCE_GATE` / `PASS_WITH_NOTICE`: Allows progress, but notice posture remains explicit and auditable downstream.
- `PARITY_GATE` / `HARD_BLOCK`: Terminalizes the current progression path; legal continuation requires remediation or a new child lineage.
- `PARITY_GATE` / `MANUAL_REVIEW`: Routes into reviewer-facing progression without allowing straight-through automation.
- `PARITY_GATE` / `OVERRIDABLE_BLOCK`: Blocks progression until a valid in-scope override is active for the unresolved prerequisite.
- `PARITY_GATE` / `PASS`: Allows the next ordered gate or live authority progression to continue automatically.
- `PARITY_GATE` / `PASS_WITH_NOTICE`: Allows progress, but notice posture remains explicit and auditable downstream.
- `TRUST_GATE` / `HARD_BLOCK`: Terminalizes the current progression path; legal continuation requires remediation or a new child lineage.
- `TRUST_GATE` / `MANUAL_REVIEW`: Routes into reviewer-facing progression without allowing straight-through automation.
- `TRUST_GATE` / `OVERRIDABLE_BLOCK`: Blocks progression until a valid in-scope override is active for the unresolved prerequisite.
- `TRUST_GATE` / `PASS`: Allows the next ordered gate or live authority progression to continue automatically.
- `TRUST_GATE` / `PASS_WITH_NOTICE`: Allows progress, but notice posture remains explicit and auditable downstream.
- `AMENDMENT_GATE` / `HARD_BLOCK`: Terminalizes the current progression path; legal continuation requires remediation or a new child lineage.
- `AMENDMENT_GATE` / `MANUAL_REVIEW`: Routes into reviewer-facing progression without allowing straight-through automation.
- `AMENDMENT_GATE` / `OVERRIDABLE_BLOCK`: Blocks progression until a valid in-scope override is active for the unresolved prerequisite.
- `AMENDMENT_GATE` / `PASS`: Allows the next ordered gate or live authority progression to continue automatically.
- `AMENDMENT_GATE` / `PASS_WITH_NOTICE`: Allows progress, but notice posture remains explicit and auditable downstream.
- `FILING_GATE` / `HARD_BLOCK`: Terminalizes the current progression path; legal continuation requires remediation or a new child lineage.
- `FILING_GATE` / `MANUAL_REVIEW`: Routes into reviewer-facing progression without allowing straight-through automation.
- `FILING_GATE` / `OVERRIDABLE_BLOCK`: Blocks progression until a valid in-scope override is active for the unresolved prerequisite.
- `FILING_GATE` / `PASS`: Allows the next ordered gate or live authority progression to continue automatically.
- `FILING_GATE` / `PASS_WITH_NOTICE`: Allows progress, but notice posture remains explicit and auditable downstream.
- `SUBMISSION_GATE` / `HARD_BLOCK`: Terminalizes the current progression path; legal continuation requires remediation or a new child lineage.
- `SUBMISSION_GATE` / `MANUAL_REVIEW`: Routes into reviewer-facing progression without allowing straight-through automation.
- `SUBMISSION_GATE` / `PASS`: Allows the next ordered gate or live authority progression to continue automatically.
- `SUBMISSION_GATE` / `PASS_WITH_NOTICE`: Allows progress, but notice posture remains explicit and auditable downstream.

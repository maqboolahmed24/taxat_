# Prohibited Synonyms And Term Drift Rules

These rules are the explicit anti-drift layer for the Taxat ubiquitous-language map. They identify phrases and shorthands that should not be introduced in future prose or support documents without disambiguation.

## Prohibited Alias Rules

| Prohibited alias | Canonical replacement | Risk | Rationale |
| --- | --- | --- | --- |
| `amendment correction` | Amendment Eligibility Contract, Drift, or authority correction (choose the exact posture) | `high` | Amendment, drift, and authority correction are not interchangeable lifecycles. |
| `authority ack` | AUTHORITY_ACKNOWLEDGEMENT / Authority of Record acknowledgement | `high` | Acknowledgement language is legally significant and should not collapse into shorthand. |
| `authority data` | AUTHORITY_ACKNOWLEDGEMENT or AUTHORITY_REFERENCE (choose the exact source class) | `high` | Authority acknowledgement and authority reference are distinct source classes with different legal effect. |
| `customer only` | customer-safe or customer-visible (choose the exact visibility boundary) | `high` | Customer-safe and customer-visible are distinct bounded vocabularies and cannot be replaced by looser audience shorthand. |
| `derived fact` | DerivedValue or CanonicalFact (choose the exact artifact) | `high` | Deterministic derivations and canonical facts are distinct semantic layers. |
| `execution envelope` | Run Manifest | `high` | The execution control object is the Run Manifest; envelope wording blurs it with command envelopes and frozen execution bindings. |
| `override approval` | Override or Gate Decision (choose the exact control object) | `high` | Approvals, overrides, and gate decisions are related but distinct control layers. |
| `raw evidence` | SourceRecord or EvidenceItem (choose the exact layer) | `high` | Raw source material and retained evidence are related but not interchangeable layers in the taxonomy. |
| `re-run` | Replay, Recovery, or Continuation Basis (choose the exact lineage posture) | `high` | Replay, recovery, and continuation have different lineage and legal semantics. |
| `same screen` | Shell Family / Route Context / Object Anchor Ref (choose the governing shell concept) | `medium` | Screen wording is too renderer-local to stand in for shell, route, and object-stability contracts. |
| `staff visible` | internal-only, staff-full, or governance-controlled (choose the exact visibility boundary) | `high` | Internal audience language must keep explicit visibility classes rather than fuzzy staff wording. |
| `submission success` | Authority of Record acknowledgement | `high` | Internal submission intent or UI posture must not masquerade as authority-defined legal state. |

## Alias Collision Clusters

| Alias variants | Canonical terms |
| --- | --- |
| `Access Binding Hash, access_binding_hash` | Access Binding Hash, Governance Mutation Hazard Contract, Scope Execution Binding |
| `analysis_only` | Execution Mode ANALYSIS, Execution Mode COMPLIANCE |
| `Append-Only Outcome Projection, append_only_outcome_projection` | Append-Only Outcome Projection, Historical Post-Seal Basis |
| `AuditInvestigationFrame, audit_investigation_frame` | AuditInvestigationFrame, Externalization Governance Contract |
| `audit_stream_ref` | Audit Stream, Stream Sequence |
| `AuthorityInteractionRecord` | Authority Ingress Proof Contract, Authority Reconciliation Control Contract, Authority Request Identity Contract |
| `AuthorityLinkInventoryItem, authority_link_inventory_item` | AuthorityLinkInventoryItem, Externalization Governance Contract |
| `AuthorityRequestEnvelope` | Authority Layer Boundary, Authority Request Identity Contract |
| `ClientPortalWorkspace, client_portal_workspace` | ClientPortalWorkspace, Portal Language Contract |
| `counterfactual_basis` | Execution Mode ANALYSIS, Execution Mode COMPLIANCE |
| `CustomerRequestListSnapshot, customer_request_list_snapshot` | CustomerRequestListSnapshot, Portal Language Contract |
| `Decision Bundle, DecisionBundle, decision_bundle` | Command Truth Boundary Contract, Decision Bundle |
| `execution_basis_hash` | Frozen Execution Binding, Pre-Seal Gate Evaluation |
| `execution_mode` | Execution Mode ANALYSIS, Execution Mode COMPLIANCE |
| `GovernanceAccessSimulation` | Authority Layer Boundary, Governance Mutation Hazard Contract |
| `GovernancePolicySnapshot, governance_policy_snapshot` | Governance Mutation Hazard Contract, GovernancePolicySnapshot |
| `Guard Vector Hash, guard_vector_hash` | Guard Vector Hash, Route Stability Contract |
| `Late-Data Retroactive-Impact Simulation Basis Contract, LateDataRetroactiveImpactSimulationBasisContract, late_data_retroactive_impact_simulation_basis_contract` | Late-Data Retroactive-Impact Simulation, Late-Data Retroactive-Impact Simulation Basis Contract |
| `NightlyBatchRun` | Nightly Batch Identity Contract, Operator Digest Derivation Contract, State Transition Contract |
| `Nightly Portfolio What-If Simulation, NightlyPortfolioWhatIfSimulation, nightly_portfolio_what_if_simulation` | Nightly Portfolio Simulation Basis Contract, Nightly Portfolio What-If Simulation |

## Ambiguous Machine Field Tokens

| Field token | Canonical terms |
| --- | --- |
| `access_binding_hash` | Access Binding Hash, Governance Mutation Hazard Contract, Scope Execution Binding |
| `analysis_only` | Execution Mode ANALYSIS, Execution Mode COMPLIANCE |
| `append_only_outcome_projection` | Append-Only Outcome Projection, Historical Post-Seal Basis |
| `audit_stream_ref` | Audit Stream, Stream Sequence |
| `counterfactual_basis` | Execution Mode ANALYSIS, Execution Mode COMPLIANCE |
| `execution_basis_hash` | Frozen Execution Binding, Pre-Seal Gate Evaluation |
| `execution_mode` | Execution Mode ANALYSIS, Execution Mode COMPLIANCE |
| `guard_vector_hash` | Guard Vector Hash, Route Stability Contract |
| `late_data_retroactive_impact_simulation_basis_contract` | Late-Data Retroactive-Impact Simulation, Late-Data Retroactive-Impact Simulation Basis Contract |
| `publication_generation` | Publication Generation, Route Stability Contract |
| `queue_projection` | Collaboration Queue Projection, Collaboration Routing Contract |
| `shell_family` | Shell Family, Surface Embodiment |
| `surface_embodiment` | NATIVE_OPERATOR, Surface Embodiment |

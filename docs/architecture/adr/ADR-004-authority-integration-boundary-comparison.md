# ADR-004 Comparison Notes

This comparison expands the weighted scorecard that supports ADR-004.

## Ranking

| Rank | Alternative | Weighted Score | Leading Strengths |
| --- | --- | --- | --- |
| 1 | Dedicated controlled authority gateway with isolated credential handling, checkpointed ingress, and explicit reconciliation control | 93.0 | Best fit for the corpus rule that browser, native, and machine callers must not talk to providers directly.; Preserves the checkpoint-versus-settlement split by letting ingress stop at AuthorityIngressReceipt while the control plane remains the only writer of SubmissionRecord truth. |
| 2 | Inline authority integration inside the main northbound API and orchestrator boundary | 61.7 | Reduces hop count and can be simpler to deploy initially.; Keeps transport logic close to command authorization and may feel easier for small teams to trace at first. |
| 3 | External managed integration or iPaaS boundary as the primary transport edge | 45.25 | Can reduce some custom transport implementation work and offers adapter convenience across providers.; Looks attractive when provider-specific APIs change often or when a platform team wants hosted connector tooling. |

## Criteria and Weights

| Criterion | Priority | Weight | Source Grounding |
| --- | --- | --- | --- |
| Authority-of-record truth preservation | HARD_REQUIREMENT | 14 | Algorithm/authority_truth_and_internal_projection_separation_contract.md::L3[Purpose], Algorithm/authority_truth_and_internal_projection_separation_contract.md::L13[Governing_Model], Algorithm/authority_truth_and_internal_projection_separation_contract.md::L55[Required_Outcomes], Algorithm/authority_interaction_protocol.md::L854[9.10_Submission-state_write_rules], Algorithm/authority_interaction_protocol.md::L1158[9.14_Out-of-band_and_authority-correction_semantics] |
| Raw credential and token isolation | HARD_REQUIREMENT | 12 | Algorithm/deployment_and_resilience_contract.md::L9[1._Reference_runtime_topology], Algorithm/security_and_runtime_hardening_contract.md::L50[3._Secret_key_and_token_handling], Algorithm/security_and_runtime_hardening_contract.md::L99[5._Service-to-service_and_network_hardening], Algorithm/authority_interaction_protocol.md::L540[9.6_Token_and_client_binding_rule] |
| Send-time revalidation and client-binding fidelity | HARD_REQUIREMENT | 10 | Algorithm/authority_interaction_protocol.md::L509[9.5_Preflight_sequence], Algorithm/authority_interaction_protocol.md::L540[9.6_Token_and_client_binding_rule], Algorithm/modules.md::L1746[AUTHORITY_PREFLIGHT_...], Algorithm/modules.md::L1788[RESOLVE_AUTHORITY_BINDING_...], Algorithm/modules.md::L1921[SUBMIT_TO_AUTHORITY_...] |
| Callback and inbound ingress safety | HARD_REQUIREMENT | 9 | Algorithm/authority_interaction_protocol.md::L792[9.9A_Inbound_authority_ingress_protocol], Algorithm/authority_truth_and_internal_projection_separation_contract.md::L69[Surface_Rules], Algorithm/security_and_runtime_hardening_contract.md::L99[5._Service-to-service_and_network_hardening], Algorithm/modules.md::L1939[CHECKPOINT_AUTHORITY_INGRESS_...], Algorithm/modules.md::L1984[NORMALIZE_AUTHORITY_RESPONSE_...] |
| Idempotency and duplicate suppression integrity | HARD_REQUIREMENT | 8 | Algorithm/authority_interaction_protocol.md::L621[9.8_Request_hashing_and_idempotency], Algorithm/authority_interaction_protocol.md::L952[9.12_Duplicate_and_pending-state_rules], Algorithm/modules.md::L1825[DERIVE_AUTHORITY_REQUEST_HASHES_...], Algorithm/modules.md::L1835[BUILD_AUTHORITY_REQUEST_ENVELOPE_...], Algorithm/modules.md::L1939[CHECKPOINT_AUTHORITY_INGRESS_...] |
| Reconciliation and out-of-band correction support | HARD_REQUIREMENT | 10 | Algorithm/authority_interaction_protocol.md::L998[9.13_Reconciliation_protocol], Algorithm/authority_interaction_protocol.md::L1042[9.13A_Reconciliation_budget_and_escalation_rule], Algorithm/authority_interaction_protocol.md::L1126[9.13B_Quantitative_reconciliation_confidence_and_ambiguity], Algorithm/authority_interaction_protocol.md::L1158[9.14_Out-of-band_and_authority-correction_semantics], Algorithm/modules.md::L2085[RECONCILE_AUTHORITY_STATE_...] |
| No-blind-resend recovery posture | HARD_REQUIREMENT | 10 | Algorithm/deployment_and_resilience_contract.md::L177[6._Rollout_rollback_and_fail-forward_posture], Algorithm/deployment_and_resilience_contract.md::L161[authority_restore_rebuild_rule], Algorithm/deployment_and_resilience_contract.md::L236[no_blind_resend_invariant], Algorithm/modules.md::L2063[PERSIST_AUTHORITY_RECONCILIATION_CONTROL_...], Algorithm/modules.md::L1921[SUBMIT_TO_AUTHORITY_...] |
| Multi-provider evolvability and sandbox or production separation | HARD_REQUIREMENT | 7 | Algorithm/authority_interaction_protocol.md::L67[9.3_Core_protocol_objects], Algorithm/deployment_and_resilience_contract.md::L9[1._Reference_runtime_topology], Algorithm/security_and_runtime_hardening_contract.md::L161[8._Operational_security_release_gates], Algorithm/authority_interaction_protocol.md::L601[9.7_Fraud-prevention_header_rule] |
| Observability and audit quality | STRONG_PREFERENCE | 7 | Algorithm/authority_interaction_protocol.md::L1175[9.15_Audit_invariants], Algorithm/deployment_and_resilience_contract.md::L9[1._Reference_runtime_topology], Algorithm/modules.md::L2021[RECORD_AUTHORITY_INTERACTION_...], Algorithm/modules.md::L2004[MERGE_AUTHORITY_RESPONSE_OBSERVATION_...] |
| Operability, testability, and failure isolation | STRONG_PREFERENCE | 7 | Algorithm/deployment_and_resilience_contract.md::L211[7._Minimum_operational_runbooks], Algorithm/security_and_runtime_hardening_contract.md::L161[8._Operational_security_release_gates], Algorithm/deployment_and_resilience_contract.md::L44[2._Promotion_pipeline], Algorithm/modules.md::L1746[AUTHORITY_PREFLIGHT_...] |
| Browser, native, and machine-actor trust-boundary clarity | HARD_REQUIREMENT | 4 | Algorithm/actor_and_authority_model.md::L121[3.4_Authority_layers], Algorithm/actor_and_authority_model.md::L555[3.13_Machine-actor_rules], Algorithm/actor_and_authority_model.md::L596[3.15_Frontend_and_governance-console_rendering_contract], Algorithm/northbound_api_and_session_contract.md::L709[8._Session_browser_and_native-client_rules], Algorithm/modules.md::L865[no_direct_provider_calls] |
| Implementation complexity versus safety payoff | TRADEOFF | 2 | Algorithm/deployment_and_resilience_contract.md::L9[1._Reference_runtime_topology], Algorithm/security_and_runtime_hardening_contract.md::L99[5._Service-to-service_and_network_hardening], Algorithm/modules.md::L1746[AUTHORITY_PREFLIGHT_...] |

## Coverage Summary

- Responsibility boundaries covered: `12`
- Authority operation families covered: `10`
- Send, receive, and recovery flows covered: `6`
- Callback and quarantine cases covered: `7`
- Truth surfaces covered: `6`
- Credential and token material classes covered: `8`

## Authority-of-record truth preservation

- Priority: `HARD_REQUIREMENT`
- Weight: `14`
- Rationale: The boundary must preserve the distinct roles of checkpoint, runtime ledger, settlement ledger, workflow coordination, and customer-safe projection so no internal optimism or transport artifact can masquerade as confirmed authority truth.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Dedicated controlled authority gateway with isolated credential handling, checkpointed ingress, and explicit reconciliation control | 4.75 | 13.3 | Only option that cleanly preserves checkpoint, runtime ledger, settlement ledger, and customer-safe projection as separate machine-readable layers. |
| Inline authority integration inside the main northbound API and orchestrator boundary | 3.0 | 8.4 | Truth separation can still be implemented, but checkpoint, transport, and settlement logic sit close enough together that drift risk stays materially higher. |
| External managed integration or iPaaS boundary as the primary transport edge | 2.25 | 6.3 | Checkpoint, settlement, and reconciliation semantics become harder to keep first-class when ingress is mediated by a third-party edge. |

## Raw credential and token isolation

- Priority: `HARD_REQUIREMENT`
- Weight: `12`
- Rationale: Raw authority credentials, client secrets, and signing material must remain behind a governed vault boundary rather than leaking into browser, native, queue, cache, or read-model paths.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Dedicated controlled authority gateway with isolated credential handling, checkpointed ingress, and explicit reconciliation control | 4.75 | 11.4 | Concentrates raw credential use inside the vault-plus-gateway boundary and keeps other components on opaque refs. |
| Inline authority integration inside the main northbound API and orchestrator boundary | 2.5 | 6.0 | Vault use remains possible, but raw credential access spreads closer to the main northbound edge. |
| External managed integration or iPaaS boundary as the primary transport edge | 2.0 | 4.8 | Hosted integration platforms tend to widen the blast radius of raw credentials and callback secrets compared with a narrow vault-plus-gateway boundary. |

## Send-time revalidation and client-binding fidelity

- Priority: `HARD_REQUIREMENT`
- Weight: `10`
- Rationale: Every live send must stay bound to the frozen authority lineage, client, subject, environment, access binding, and step-up or approval evidence that originally authorized it, with fail-closed behavior on drift.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Dedicated controlled authority gateway with isolated credential handling, checkpointed ingress, and explicit reconciliation control | 4.75 | 9.5 | Matches the frozen preflight, binding-lineage, and send-time revalidation rules directly. |
| Inline authority integration inside the main northbound API and orchestrator boundary | 3.25 | 6.5 | Can support frozen binding checks, though transport convenience pressures the orchestrator to take on too much provider-specific state. |
| External managed integration or iPaaS boundary as the primary transport edge | 2.25 | 4.5 | Exact access_binding_hash and policy_snapshot_hash revalidation become less trustworthy once transport is abstracted outside the core runtime boundary. |

## Callback and inbound ingress safety

- Priority: `HARD_REQUIREMENT`
- Weight: `9`
- Rationale: Every callback, poll payload, or recovered provider response must be authenticated, deduped, checkpointed, and strongly correlated before mutation, with weak or ambiguous evidence quarantined instead of promoted.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Dedicated controlled authority gateway with isolated credential handling, checkpointed ingress, and explicit reconciliation control | 4.75 | 8.55 | Supports one ingress checkpoint that authenticates, dedupes, quarantines, and persists AuthorityIngressReceipt before any mutation. |
| Inline authority integration inside the main northbound API and orchestrator boundary | 2.75 | 4.95 | Checkpointing is possible, but callback, normalization, and settlement code are easier to collapse together in one process boundary. |
| External managed integration or iPaaS boundary as the primary transport edge | 2.0 | 3.6 | Ingress checkpointing can exist, but legal mutation risks being based on externally normalized events rather than first-party proof packets. |

## Idempotency and duplicate suppression integrity

- Priority: `HARD_REQUIREMENT`
- Weight: `8`
- Rationale: The architecture must keep request-hash identity, duplicate meaning, idempotency keys, delivery dedupe, and canonical receipt refs as durable control data rather than transient worker memory.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Dedicated controlled authority gateway with isolated credential handling, checkpointed ingress, and explicit reconciliation control | 4.75 | 7.6 | Keeps request hashes, duplicate suppression, and canonical receipt refs on the durable command side rather than transport-local memory. |
| Inline authority integration inside the main northbound API and orchestrator boundary | 3.25 | 5.2 | Durable request identity can exist, but it competes with inline transport shortcuts and service-local retry behavior. |
| External managed integration or iPaaS boundary as the primary transport edge | 2.0 | 3.2 | Exact request hash and canonical receipt control become harder when delivery identity is shaped by an external platform. |

## Reconciliation and out-of-band correction support

- Priority: `HARD_REQUIREMENT`
- Weight: `10`
- Rationale: The boundary must keep reconciliation as a first-class control path with persisted budget, ambiguity posture, and reopening semantics so late authority truth or contradictory evidence can safely supersede internal projections.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Dedicated controlled authority gateway with isolated credential handling, checkpointed ingress, and explicit reconciliation control | 4.75 | 9.5 | Lets reconciliation remain an explicit control-plane path that consumes gateway evidence without collapsing it into transport behavior. |
| Inline authority integration inside the main northbound API and orchestrator boundary | 3.25 | 6.5 | Reconciliation still works, but it is more likely to be treated as a branch of inline transport code rather than a durable control path. |
| External managed integration or iPaaS boundary as the primary transport edge | 2.25 | 4.5 | External tooling can help fetch provider state, but the bounded reconciliation semantics still need to be rebuilt inside Taxat. |

## No-blind-resend recovery posture

- Priority: `HARD_REQUIREMENT`
- Weight: `10`
- Rationale: Queue loss, worker restart, replay, restore, and rollback must recover from persisted ingress, request lineage, and reconciliation control instead of blindly resending live authority mutations.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Dedicated controlled authority gateway with isolated credential handling, checkpointed ingress, and explicit reconciliation control | 4.75 | 9.5 | Best fit for restore and queue-loss rules because resend legality and ingress proof remain durable and boundary-scoped. |
| Inline authority integration inside the main northbound API and orchestrator boundary | 3.0 | 6.0 | Recovery can honor resend legality, but coupling transport and orchestration increases accidental resend risk during worker reclaim or rollback. |
| External managed integration or iPaaS boundary as the primary transport edge | 2.0 | 4.0 | Recovery correctness is weakest here because hosted retries and replay semantics are harder to bind to Taxat's resend legality model. |

## Multi-provider evolvability and sandbox or production separation

- Priority: `HARD_REQUIREMENT`
- Weight: `7`
- Rationale: Provider transports, profile bindings, callback hosts, and sandbox versus production credentials need one stable boundary that can evolve per provider without collapsing the core control plane or mixing environments.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Dedicated controlled authority gateway with isolated credential handling, checkpointed ingress, and explicit reconciliation control | 4.5 | 6.3 | Allows provider-specific headers, callback rules, and sandbox or production partitioning without infecting the whole northbound surface. |
| Inline authority integration inside the main northbound API and orchestrator boundary | 3.25 | 4.55 | Provider profile variation is feasible, but adapter concerns leak into the core northbound and orchestration layers. |
| External managed integration or iPaaS boundary as the primary transport edge | 3.5 | 4.9 | Managed adapters can help with provider heterogeneity, which is the main reason this option remains viable at all. |

## Observability and audit quality

- Priority: `STRONG_PREFERENCE`
- Weight: `7`
- Rationale: The chosen boundary should produce one explainable audit lineage from initiating actor through request hashing, gateway send, ingress checkpoint, normalization, reconciliation, and downstream projection.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Dedicated controlled authority gateway with isolated credential handling, checkpointed ingress, and explicit reconciliation control | 4.5 | 6.3 | Produces crisp audit lineage across send, ingress, normalization, and reconciliation. |
| Inline authority integration inside the main northbound API and orchestrator boundary | 3.75 | 5.25 | Fewer boundaries can simplify local tracing, though audit semantics become less structurally obvious. |
| External managed integration or iPaaS boundary as the primary transport edge | 2.25 | 3.15 | Forensic lineage becomes split across first-party and third-party logs. |

## Operability, testability, and failure isolation

- Priority: `STRONG_PREFERENCE`
- Weight: `7`
- Rationale: The design should make provider failure, ingress quarantine, token rotation, and release gating isolatable and testable without turning every northbound request path into provider-coupled runtime logic.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Dedicated controlled authority gateway with isolated credential handling, checkpointed ingress, and explicit reconciliation control | 4.25 | 5.95 | Provider degradation, token rotation, and ingress quarantine can fail in the gateway without collapsing the whole command edge. |
| Inline authority integration inside the main northbound API and orchestrator boundary | 3.25 | 4.55 | A large integrated service is still testable, but provider failure and callback quarantine are less isolated. |
| External managed integration or iPaaS boundary as the primary transport edge | 2.5 | 3.5 | Adds another operator boundary and makes incident drills depend on external platform behavior the corpus does not control. |

## Browser, native, and machine-actor trust-boundary clarity

- Priority: `HARD_REQUIREMENT`
- Weight: `4`
- Rationale: The architecture must keep browser, native, and machine callers away from direct provider traffic so human sessions, service principals, and authority tokens do not collapse into one ambiguous transport edge.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Dedicated controlled authority gateway with isolated credential handling, checkpointed ingress, and explicit reconciliation control | 4.5 | 3.6 | Makes it explicit that all callers use the same northbound command contract while only the gateway speaks provider transport. |
| Inline authority integration inside the main northbound API and orchestrator boundary | 2.5 | 2.0 | The no-direct-provider rule becomes architectural convention rather than a dedicated enforced boundary. |
| External managed integration or iPaaS boundary as the primary transport edge | 2.0 | 1.6 | Callers still avoid direct provider traffic, but the decisive boundary shifts away from Taxat's own controlled gateway and vault semantics. |

## Implementation complexity versus safety payoff

- Priority: `TRADEOFF`
- Weight: `2`
- Rationale: The chosen option should add only the complexity needed to protect legal truth, token isolation, and recovery correctness; convenience alone does not justify boundary collapse.

| Alternative | Raw Score | Weighted Contribution | Reason |
| --- | --- | --- | --- |
| Dedicated controlled authority gateway with isolated credential handling, checkpointed ingress, and explicit reconciliation control | 3.75 | 1.5 | Adds complexity, but almost all of it buys legally significant isolation rather than ornamental abstraction. |
| Inline authority integration inside the main northbound API and orchestrator boundary | 4.5 | 1.8 | Wins on short-term simplicity, though much of that simplicity comes from collapsing boundaries the corpus wants separated. |
| External managed integration or iPaaS boundary as the primary transport edge | 3.0 | 1.2 | Can reduce adapter coding, but the safety tradeoff is poor because core truth and recovery invariants remain first-party obligations anyway. |

## Why The Runner-Up Options Lost

- `Inline authority integration inside the main northbound API and orchestrator boundary` lost because it improves short-term simplicity by collapsing the controlled gateway into the main application boundary, which makes credential use, callback quarantine, and settlement semantics easier to blur together than the corpus allows.
- `External managed integration or iPaaS boundary as the primary transport edge` lost because adapter convenience does not compensate for weaker first-party proof of request lineage, ingress authentication, resend legality, and settlement ownership.

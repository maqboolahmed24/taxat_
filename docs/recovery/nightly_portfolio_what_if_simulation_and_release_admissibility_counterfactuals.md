# Nightly Portfolio What-If Simulation And Release Admissibility Counterfactuals

`pc_0208` adds the read-only nightly portfolio simulation path for release owners and operators.
The simulator is deliberately not a second scheduler: it loads persisted `NightlyBatchRun`
selection truth, optionally binds a persisted `OperatorMorningDigest`, and emits one
`NightlyPortfolioWhatIfSimulation` artifact with an exact
`NightlyPortfolioSimulationBasisContract`.

## Source Batch Set

`loadNightlySimulationSourceBatchSet` is the only loader for simulation sources. It accepts either
an exact source-batch ref set or a tenant/nightly window, then enforces:

- every batch belongs to one `tenant_id` and one `nightly_window_key`
- every batch shares the same frozen selection universe, policy snapshot, release manifest, schema
  bundle, build id, and environment
- a multi-batch set forms one predecessor/successor recovery chain
- selection coverage is the latest persisted entry projection in that chain, keyed by stable
  `selection_entry_ref`

Mixed windows and unrelated same-window batches fail before a basis contract can be built.

## Basis Hash Inputs

`buildNightlyPortfolioSimulationBasisContract` hashes the exact tuple required by the algorithm:

- modeled-only nightly execution boundary hash
- sorted source batch refs and source-batch set hash
- sorted covered selection-entry refs
- baseline selection universe, policy, autopilot policy, release, schema, build, environment, and
  global concurrency profile
- counterfactual policy, release identity, concurrency/retry, and per-candidate overrides
- pinned truth, replay, non-execution, release-identity, successor-chain, and diff-explainability
  policies

Release what-if inputs must provide both a counterfactual release verification manifest ref and an
exact `ReleaseCandidateIdentityContract` for the same baseline environment.

## Replay And Diff Rules

`replayNightlySelectionEntries` reads only persisted `selection_entries[]`; it does not accept live
eligibility candidates. `simulateNightlyPortfolioWhatIf` applies declared counterfactuals on that
replayed projection and never writes `NightlyBatchRun`, manifests, workflow items, notifications, or
authority-facing objects.

Queue counts, backlog pressure, tail risk, stability state, entry diffs, and highlight diffs are all
derived from the same replayed entry set. Highlight movement is explained through
`deriveNightlyPortfolioDiffExplainability`, and every bucket, order, or highlight movement receives
reason-code diffs aligned to the basis or per-candidate counterfactual packet.

Hard unattended boundaries remain blocking. Authority ambiguity, approval gaps, step-up posture, and
similar blockers cannot be converted into autonomous completion by a what-if policy change; they
surface as blocking simulated outcomes with explicit movement reasons.

## Null Baseline Digest

A missing baseline digest is represented explicitly with `baseline_digest_ref_or_null = null` and an
empty baseline-highlight set. The simulator still replays persisted batch outcome counts, but it does
not fabricate digest highlight truth. Highlight additions caused by null baseline posture carry
`BASELINE_DIGEST_MISSING` alongside the declared counterfactual reason codes.

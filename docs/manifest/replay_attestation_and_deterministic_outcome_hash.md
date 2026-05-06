# Replay Attestation And Deterministic Outcome Hash

`pc_0107` adds the executable replay comparison substrate for backend manifests.

## Deterministic Outcome Hash

The hash uses the corpus V2 profile:

- each material component is hashed as `deterministic-outcome-component/v2`
- the root is hashed as `deterministic-outcome-root/v2`
- component order is fixed to the fourteen schema classes from `ReplayAttestation.outcome_component_results[]`

The normalized payload surface excludes write-time and transport noise such as row ids, row versions, queue ids, message ids, trace/span ids, persisted timestamps, update timestamps, and transport correlation ids. Component refs remain outside the payload hash and are retained in comparison rows so auditors can reopen the concrete artifact without letting persistence-only identifiers perturb the deterministic root.

## Replay Attestation

Replay comparison persists `ReplayAttestation` as the sole public replay posture. The attestation records basis validation state, basis identity verdict, deterministic equivalence verdict, comparison mode, outcome class, basis-dimension rows, outcome-component rows, limitation/difference codes, mismatch inventory, confidence posture, and the replay-basis integrity contract.

The classifier maps exact retained basis and identical material outcomes to `EXACT_HASH_MATCH` / `EXACT_MATCH`, declared counterfactual basis to `EXPECTED_EQUIVALENCE` or `EXPECTED_DIFFERENCE`, limited retained basis to `LIMITED_HISTORICAL_COMPARISON`, and corrupt basis to `BASIS_CORRUPT` with zero confidence.

`persistReplayAttestation` synchronizes the manifest and its append-only outcome projection in one compare-and-swap update. It requires an actual deterministic outcome hash and either an existing or supplied decision-bundle hash, then stores the attestation and mirrors `decision_bundle_hash`, `deterministic_outcome_hash`, `replay_attestation_ref`, and structured `REPLAY_ATTESTATION` output refs. Replay-visible truth requires both `RunManifest.deterministic_outcome_hash` and `RunManifest.replay_attestation_ref`; callers must not publish replay posture from a replay child before that service completes.

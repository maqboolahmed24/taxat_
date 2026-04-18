# ADR-009 Comparison

## Weighted Criteria

| Criterion | Weight | Priority | Rationale |
| --- | --- | --- | --- |
| Candidate identity integrity | 14 | HARD_REQUIREMENT | Promotion evidence must describe one exact candidate tuple so release truth cannot silently mix builds, schema bundles, migration plans, provider profiles, or client windows. |
| Migration safety for in-flight and historical manifests | 13 | HARD_REQUIREMENT | Schema changes must preserve sealed, in-flight, replayed, and recovered manifests under frozen bundle and config refs, even while live defaults advance. |
| Rollback versus fail-forward safety | 12 | HARD_REQUIREMENT | Rollback is only lawful while compatibility guarantees still hold; after reader-window closure or destructive change, the system needs a typed fail-forward doctrine instead of operator judgment calls under pressure. |
| Replay and restore readability | 10 | HARD_REQUIREMENT | Release evidence, migration ledgers, and restore drills must preserve enough basis and reader-window detail to prove historical readability, replay admissibility, and recoverability later. |
| Web and native client compatibility governance | 10 | HARD_REQUIREMENT | Promotion must block when the supported client window or shipped native desktop posture is incompatible; compatibility cannot be treated as an advisory note after deploy. |
| Operator burden and operational clarity | 9 | STRONG_PREFERENCE | The strategy should be explainable in one promotion runbook so release operators know which artifact answers which question instead of triangulating CI pages, deploy logs, and oral history. |
| Auditability and mixed-evidence prevention | 11 | HARD_REQUIREMENT | The winning strategy must make mixed candidate, mixed compatibility-window, and mixed canary versus full-release evidence mechanically impossible or visibly inadmissible. |
| Restore-drill realism | 8 | HARD_REQUIREMENT | Restore drills must rehearse actual control, audit, object, queue, authority, and privacy posture so promotion evidence does not overclaim recoverability. |
| Security gate compatibility | 7 | HARD_REQUIREMENT | Release evidence needs to compose with signed-build, provenance, session-hardening, cache-isolation, and desktop notarization gates rather than bypassing them as a separate track. |
| Release speed versus correctness | 6 | TRADEOFF | The strategy should keep promotion reasonably fast, but must reject any shortcut that trades replay safety, migration clarity, or recoverability for nominal delivery speed. |

## Alternative Totals

| Rank | Alternative | Weighted Total | Summary |
| --- | --- | --- | --- |
| 1 | Manifest-centered, candidate-bound release doctrine | 93.8 | Treat one candidate identity, one compatibility boundary, and one release-verification manifest as the authoritative promotion spine; use expand -> migrate/backfill -> verify -> contract, and force fail-forward once rollback safety ends. |
| 2 | Deployment-strategy-first promotion without a manifest-root evidence object | 56.94 | Prioritize blue/green, push-button, or other rollout mechanics as the release doctrine, with release readiness inferred primarily from deployment topology and live validation rather than a durable release-verification manifest. |
| 3 | CI dashboard and checklist-driven release posture | 49.32 | Use CI green runs, deploy dashboards, and operator checklists as the main release truth, with weaker durable bindings between candidate identity, migration chronology, restore evidence, and client compatibility. |

## Evidence Context

- Candidate identity fields already normalized: `13`
- Compatibility gate fields already normalized: `25`
- Blocking gate bindings already normalized: `11`
- Checkpoint gates already normalized: `7`
- Security release gates already normalized: `9`
- Nightly selection dispositions already normalized: `7`

## Candidate identity integrity

- Priority: `HARD_REQUIREMENT`
- Weight: `14`
- Rationale: Promotion evidence must describe one exact candidate tuple so release truth cannot silently mix builds, schema bundles, migration plans, provider profiles, or client windows.

| Alternative | Raw | Weighted | Reason |
| --- | --- | --- | --- |
| Manifest-centered, candidate-bound release doctrine | 4.9 | 13.72 | This is the only alternative built directly around the canonical candidate tuple and its hash echoes. |
| Deployment-strategy-first promotion without a manifest-root evidence object | 2.6 | 7.28 | A deploy strategy can reference one build, but does not by itself bind the full candidate tuple or all companion artifacts. |
| CI dashboard and checklist-driven release posture | 2.0 | 5.6 | Candidate identity can be described, but not enforced as the root of every artifact. |

## Migration safety for in-flight and historical manifests

- Priority: `HARD_REQUIREMENT`
- Weight: `13`
- Rationale: Schema changes must preserve sealed, in-flight, replayed, and recovered manifests under frozen bundle and config refs, even while live defaults advance.

| Alternative | Raw | Weighted | Reason |
| --- | --- | --- | --- |
| Manifest-centered, candidate-bound release doctrine | 4.75 | 12.35 | Its explicit reader-window and migration-ledger posture is designed for frozen in-flight and historical manifests. |
| Deployment-strategy-first promotion without a manifest-root evidence object | 2.7 | 7.02 | Blue/green style thinking does not solve reader-window, sealed-manifest, or historical replay obligations on its own. |
| CI dashboard and checklist-driven release posture | 2.3 | 5.98 | Chronology can be documented, but reader-window and historical-manifest safety remain too implicit. |

## Rollback versus fail-forward safety

- Priority: `HARD_REQUIREMENT`
- Weight: `12`
- Rationale: Rollback is only lawful while compatibility guarantees still hold; after reader-window closure or destructive change, the system needs a typed fail-forward doctrine instead of operator judgment calls under pressure.

| Alternative | Raw | Weighted | Reason |
| --- | --- | --- | --- |
| Manifest-centered, candidate-bound release doctrine | 4.8 | 11.52 | Rollback legality remains explicit until compatibility closes, after which fail-forward is typed and auditable. |
| Deployment-strategy-first promotion without a manifest-root evidence object | 2.9 | 6.96 | Rollout mechanics make rollback look easy even after the compatibility boundary says fail-forward only. |
| CI dashboard and checklist-driven release posture | 2.1 | 5.04 | Operators are more likely to misapply rollback because legality is narrated in procedures instead of frozen in durable evidence. |

## Replay and restore readability

- Priority: `HARD_REQUIREMENT`
- Weight: `10`
- Rationale: Release evidence, migration ledgers, and restore drills must preserve enough basis and reader-window detail to prove historical readability, replay admissibility, and recoverability later.

| Alternative | Raw | Weighted | Reason |
| --- | --- | --- | --- |
| Manifest-centered, candidate-bound release doctrine | 4.75 | 9.5 | Replay, restore, and historical readability remain first-class because the strategy carries compatibility and drill lineage into promotion evidence. |
| Deployment-strategy-first promotion without a manifest-root evidence object | 2.5 | 5.0 | Deployment posture says little about restore lineage or exact replay basis without a stronger evidence root. |
| CI dashboard and checklist-driven release posture | 2.25 | 4.5 | Replay and restore remain partly inferential because CI and dashboards are not authoritative evidence objects. |

## Web and native client compatibility governance

- Priority: `HARD_REQUIREMENT`
- Weight: `10`
- Rationale: Promotion must block when the supported client window or shipped native desktop posture is incompatible; compatibility cannot be treated as an advisory note after deploy.

| Alternative | Raw | Weighted | Reason |
| --- | --- | --- | --- |
| Manifest-centered, candidate-bound release doctrine | 4.75 | 9.5 | Supported client windows and native desktop hardening remain blocking gates instead of post-deploy checks. |
| Deployment-strategy-first promotion without a manifest-root evidence object | 3.0 | 6.0 | Canary and staged rollout can observe clients, but the supported client window still needs a first-class manifest-bound contract. |
| CI dashboard and checklist-driven release posture | 2.4 | 4.8 | Client windows tend to become a checked box instead of a shared compatibility boundary that can block promotion. |

## Operator burden and operational clarity

- Priority: `STRONG_PREFERENCE`
- Weight: `9`
- Rationale: The strategy should be explainable in one promotion runbook so release operators know which artifact answers which question instead of triangulating CI pages, deploy logs, and oral history.

| Alternative | Raw | Weighted | Reason |
| --- | --- | --- | --- |
| Manifest-centered, candidate-bound release doctrine | 4.0 | 7.2 | The artifact set is larger, but each artifact has one clear responsibility and runbook location. |
| Deployment-strategy-first promotion without a manifest-root evidence object | 3.1 | 5.58 | Operators get a cleaner deploy UI, but the release truth remains split between deployment and evidence systems. |
| CI dashboard and checklist-driven release posture | 3.6 | 6.48 | It feels lightweight at first, but clarity drops sharply when a release needs forensic reconstruction. |

## Auditability and mixed-evidence prevention

- Priority: `HARD_REQUIREMENT`
- Weight: `11`
- Rationale: The winning strategy must make mixed candidate, mixed compatibility-window, and mixed canary versus full-release evidence mechanically impossible or visibly inadmissible.

| Alternative | Raw | Weighted | Reason |
| --- | --- | --- | --- |
| Manifest-centered, candidate-bound release doctrine | 4.9 | 10.78 | Manifest assembly contracts, candidate hashes, and compatibility hashes directly close the mixed-evidence failure modes named by the corpus. |
| Deployment-strategy-first promotion without a manifest-root evidence object | 2.3 | 5.06 | Without a manifest-root evidence object, canary and full-release evidence are more likely to drift apart or be stitched together after the fact. |
| CI dashboard and checklist-driven release posture | 1.8 | 3.96 | This is the riskiest option for mixed canary, mixed schema, or mixed supported-window evidence. |

## Restore-drill realism

- Priority: `HARD_REQUIREMENT`
- Weight: `8`
- Rationale: Restore drills must rehearse actual control, audit, object, queue, authority, and privacy posture so promotion evidence does not overclaim recoverability.

| Alternative | Raw | Weighted | Reason |
| --- | --- | --- | --- |
| Manifest-centered, candidate-bound release doctrine | 4.8 | 7.68 | Restore drills remain candidate-bound, checkpoint-bound, privacy-aware, and authority-safe. |
| Deployment-strategy-first promotion without a manifest-root evidence object | 2.8 | 4.48 | Restore drills can feed rollout decisions, but the model does not naturally keep checkpoint and privacy posture candidate-bound. |
| CI dashboard and checklist-driven release posture | 2.4 | 3.84 | Restore drills can exist, but their candidate and checkpoint lineage is too easy to decouple from the judged release. |

## Security gate compatibility

- Priority: `HARD_REQUIREMENT`
- Weight: `7`
- Rationale: Release evidence needs to compose with signed-build, provenance, session-hardening, cache-isolation, and desktop notarization gates rather than bypassing them as a separate track.

| Alternative | Raw | Weighted | Reason |
| --- | --- | --- | --- |
| Manifest-centered, candidate-bound release doctrine | 4.65 | 6.51 | Signed builds, provenance, session-hardening, cache-isolation, and notarization fit naturally as named blocking evidence. |
| Deployment-strategy-first promotion without a manifest-root evidence object | 3.4 | 4.76 | Deploy tooling can respect security gates, but the evidence still needs a stronger candidate-bound container. |
| CI dashboard and checklist-driven release posture | 3.0 | 4.2 | Security signals can appear on dashboards, but they are less durable and less candidate-bound than the corpus expects. |

## Release speed versus correctness

- Priority: `TRADEOFF`
- Weight: `6`
- Rationale: The strategy should keep promotion reasonably fast, but must reject any shortcut that trades replay safety, migration clarity, or recoverability for nominal delivery speed.

| Alternative | Raw | Weighted | Reason |
| --- | --- | --- | --- |
| Manifest-centered, candidate-bound release doctrine | 4.2 | 5.04 | Slightly slower than dashboard-driven promotion, but speed comes from explicit automation rather than evidence shortcuts. |
| Deployment-strategy-first promotion without a manifest-root evidence object | 4.0 | 4.8 | Fast at moving traffic, but speed is overvalued relative to correctness in Taxat's source law. |
| CI dashboard and checklist-driven release posture | 4.1 | 4.92 | This is the fastest-looking option, but it buys speed by weakening proof. |

## Why The Runner-Ups Lost

- `Deployment-strategy-first promotion without a manifest-root evidence object` lost because confuses deployment mechanics with release truth, even though the corpus requires migration, restore, and compatibility evidence that exist before or alongside rollout.
- `CI dashboard and checklist-driven release posture` lost because weakest protection against mixed evidence, stale compatibility windows, and swapped restore or canary lineage.

# Provenance Node, Edge, Path, and Evidence Graph Builder

`pc_0128` introduces `packages/backend-provenance` as the owner of graph topology primitives. `ASSUMPTION_PROVENANCE_PACKAGE_CREATED` is recorded because no prior backend provenance package existed.

The package writes four contract shapes:

- `ProvenanceNode`: entity, activity, and agent nodes with canonical graph addresses and retention/tombstone posture.
- `ProvenanceEdge`: typed directed edges, including explicit cross-manifest lineage edges.
- `ProvenancePath`: ranked, replayable support paths with decisive edge refs and lineage boundary refs.
- `EvidenceGraph`: the graph envelope tying node, edge, path, target-assessment, and boundary summaries together.

Important invariants:

- Graph IDs and addresses are deterministic from tenant, client, period, manifest, and graph version.
- Node family determines node class. The builders reject mismatched `ENTITY`, `ACTIVITY`, and `AGENT` families.
- Lineage traversal only occurs through `ED_CONTINUES`, `ED_REPLAYS`, `ED_RECOVERS`, or `ED_SUPERSEDES`, and each lineage edge produces a deterministic lineage boundary ID.
- Path ordering uses the seven-rank proof path selection ladder: contradiction-free posture, legal-state prerequisites, weakest confidence, unresolved limitations, stale plus retention/tombstone pressure, hop count, then lexical path ID.
- `EN_GATE_DECISION` topology must include an inbound `ED_GENERATED` edge from an `AC_EVALUATE_GATE` activity.
- Evidence graphs mirror proof-bundle refs from target assessments and reject root primary paths that do not point to a closed replayable supported target.

The migration `db/migrations/phase03_0128_provenance_graph_foundation.sql` creates append-only tables for the four artifacts with JSON payload retention, stable hash columns, lineage indexes, and basic contract checks. Full schema compliance remains enforced in TypeScript builders and the Python contract validators.

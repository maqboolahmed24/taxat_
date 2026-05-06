# Normalization Context and Source-Domain Declarations

`pc_0113` freezes the rule basis used for normalization and introduces explicit declaration artifacts for non-collected source-domain posture.

## Normalization Context

`NormalizationContext` is a first-class artifact with:

- mapping, evidence, promotion, and normalization rule refs,
- deterministic `transformation_version_set[]`,
- `produced_at`,
- `normalization_context_hash`,
- an artifact contract.

The transformation set is derived from rule refs plus optional schema-bundle, extractor-build, connector-build, and additional transformation refs. Each element is rendered as a `transformation-version://...` ref and sorted as a set. Empty rule refs fail closed.

## Declaration Artifact Shape

The collection package uses one schema-backed artifact family, `SourceDomainDeclaration`, rather than four unrelated types. Its `declaration_kind` is one of:

- `EXCLUDED_BY_POLICY`
- `NO_DATA_CONFIRMED_AT_CUTOFF`
- `MISSING_AT_CUTOFF`
- `STALE_AT_CUTOFF`

The artifact also stores source plan ref, collection boundary ref, source domain, source class, exact partition scope, runtime scope, late-data policy ref, machine reason code, evidence refs, produced timestamp, declaration hash, and artifact contract.

This single family maps losslessly into `InputFreeze`:

- `EXCLUDED_BY_POLICY` -> `exclusion_refs[]`
- `NO_DATA_CONFIRMED_AT_CUTOFF` -> `no_data_confirmed_declarations[]`
- `MISSING_AT_CUTOFF` -> `missing_source_declarations[]`
- `STALE_AT_CUTOFF` -> `stale_source_declarations[]`

## Confirmed Empty Versus Missing

`NO_DATA_CONFIRMED_AT_CUTOFF` is recognized only from a frozen collection boundary row with that disposition and request or page audit evidence. It becomes a confirmed-empty declaration with `EMPTY_RESPONSE_CONFIRMED`.

`MISSING_AT_CUTOFF` is separate. It is emitted either from an explicit missing boundary disposition or, when validating against a source plan, from a planned source that has no boundary row at all. That latter case receives `NO_BOUNDARY_DISPOSITION` so omission stays machine-readable.

## Disjointness and Partition Identity

Declarations are unique by manifest, source domain, source class, and exact partition scope. A collected source cannot also have an omission declaration. A boundary disposition and declaration kind must match exactly, so a domain partition cannot be both confirmed empty and missing, excluded and missing, or confirmed empty and stale.

Multiple partitions for the same domain are allowed, but each partition must carry its own posture. Later input-freeze assembly consumes declaration refs by kind without widening scope.

## Persistence

The migration creates durable registers for `normalization_context_register` and `source_domain_declaration_register`, with row-level security enabled. Checks enforce non-empty rule refs, non-empty transformation sets, closed declaration kinds, closed reason codes, evidence refs, and one declaration per source-domain partition identity.

# Corpus File Inventory Manifest

## Summary

- Inventory scope roots: `Algorithm/` and `PROMPT/`
- Total rows: `822`
- Heading inventory rows: `4306`
- Schema/sample relationships: `236` schemas, `51` with at least one sample

## Counts By Path Kind

| Path kind | Count |
| --- | --- |
| `archive_residue` | `3` |
| `canonical_source` | `370` |
| `prompt_scaffold` | `448` |
| `unknown` | `1` |

## Counts By Authority Level

| Authority level | Count |
| --- | --- |
| `canonical_contract` | `15` |
| `core_algorithm` | `2` |
| `enforcement` | `290` |
| `historical_closure` | `2` |
| `noncanonical_residue` | `4` |
| `prompt_scaffold` | `448` |
| `specialized_contract` | `49` |
| `support_coherence` | `12` |

## Counts By Domain Family

| Domain family | Count |
| --- | --- |
| `api_transport` | `9` |
| `archive_packaging` | `4` |
| `authority` | `43` |
| `coherence` | `11` |
| `collaboration` | `15` |
| `engine` | `49` |
| `evidence_provenance` | `35` |
| `frontend_shell` | `35` |
| `governance` | `19` |
| `manifest_replay` | `46` |
| `observability` | `9` |
| `portal` | `15` |
| `prompting` | `448` |
| `release_resilience` | `17` |
| `retention_privacy` | `6` |
| `security_runtime` | `6` |
| `validation` | `45` |
| `workflow` | `10` |

## Counts By File Type

| File type | Count |
| --- | --- |
| `json` | `1` |
| `md` | `527` |
| `no_extension` | `3` |
| `py` | `2` |
| `pyc` | `1` |
| `sample_json` | `51` |
| `schema_json` | `236` |
| `txt` | `1` |

## Gap Summary

- Schemas with no obvious prose owner: `2`
- Samples with no schema: `0`
- Prompt scaffold relation gaps: `0`
- Workspace-local byproducts under inventory roots: `1`

## Output Files

- `data/analysis/file_inventory_manifest.json`
- `data/analysis/file_inventory_manifest.csv`
- `data/analysis/heading_inventory.jsonl`
- `data/analysis/schema_sample_inventory.json`
- `data/analysis/orphaned_or_unclassified_files.json`
- `data/analysis/file_role_taxonomy.json`

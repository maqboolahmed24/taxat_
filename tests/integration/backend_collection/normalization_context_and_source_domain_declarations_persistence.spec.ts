import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  NormalizationContextRepository,
  SourceDomainDeclarationRepository,
  buildCollectionBoundary,
  buildSourcePlan,
  buildSourceWindow,
  declareConfirmedEmptySources,
  declareExclusions,
  declareMissingSources,
  declareStaleSources,
  freezeNormalizationContext,
  normalizationContextRef,
  sourceDomainDeclarationRef,
  validateSourceDomainDeclarations,
  type CollectionBoundarySourceBoundaryRecord,
  type SourcePlanPlannedSourceRecord,
} from "../../../packages/backend-collection/src/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const migrationPath = path.join(
  repoRoot,
  "db",
  "migrations",
  "phase03_0113_normalization_context_and_source_domain_declarations.sql",
);
const declarationSchemaPath = path.join(
  repoRoot,
  "packages",
  "backend-collection",
  "src",
  "schemas",
  "source_domain_declaration.schema.json",
);

async function validatePayloadAgainstSchema(schemaPathOrName: string, payload: unknown) {
  const script = `
import json
import pathlib
import sys

repo = pathlib.Path(sys.argv[1])
sys.path.insert(0, str(repo / "packages" / "contracts-core" / "python"))
from validate_contracts import Draft202012Validator, build_registry, load_json  # type: ignore

schema_path_or_name = sys.argv[2]
payload = json.loads(sys.argv[3])
candidate = pathlib.Path(schema_path_or_name)
schema = load_json(candidate if candidate.is_absolute() else repo / "packages" / "contracts-core" / "schemas" / schema_path_or_name)
validator = Draft202012Validator(
    schema,
    registry=build_registry(),
    format_checker=Draft202012Validator.FORMAT_CHECKER,
)
issues = [
    f"{'/'.join(map(str, error.absolute_path)) or '<root>'}: {error.message}"
    for error in sorted(validator.iter_errors(payload), key=lambda error: list(error.absolute_path))
]
if issues:
    raise SystemExit("\\n".join(issues))
`;

  await execFileAsync(path.join(repoRoot, ".venv", "bin", "python3"), [
    "-c",
    script,
    repoRoot,
    schemaPathOrName,
    JSON.stringify(payload),
  ]);
}

function plannedSource(source_domain: string): SourcePlanPlannedSourceRecord {
  return {
    completeness_expectation_ref: `completeness://${source_domain}`,
    cursor_strategy_ref: `cursor-strategy://${source_domain}`,
    freshness_slo_ref: `freshness://${source_domain}`,
    late_data_policy_ref: "REVIEW_IF_LATE",
    partition_scope_refs: [`partition://${source_domain}/primary`],
    provider_binding_ref: `provider-binding://${source_domain}`,
    query_basis_ref: `query-basis://${source_domain}`,
    read_model: "AS_OF",
    required_schema_refs: [`schema://${source_domain}/v1`],
    required_source_class_refs: [],
    source_class: "AUTHORITY_REFERENCE",
    source_domain,
  };
}

function sourceBoundary(
  source_domain: string,
  boundary_disposition: CollectionBoundarySourceBoundaryRecord["boundary_disposition"],
): CollectionBoundarySourceBoundaryRecord {
  return {
    boundary_disposition,
    completeness_expectation_ref: `completeness://${source_domain}`,
    cursor_checkpoint_ref: `cursor://${source_domain}`,
    late_data_policy_ref: "REVIEW_IF_LATE",
    page_request_audit_refs: [],
    partition_scope_refs: [`partition://${source_domain}/primary`],
    provider_api_version: "api.v1",
    provider_environment_ref: "provider-env://hmrc/sandbox",
    provider_schema_version: "schema.v1",
    request_audit_refs: [`audit://${source_domain}/request`],
    revision_ref: `revision://${source_domain}`,
    runtime_scope_refs: ["year_end"],
    source_class: "AUTHORITY_REFERENCE",
    source_domain,
  };
}

function buildArtifacts() {
  const domains = ["income_sources", "vat_obligations", "payroll", "pensions"];
  const sourcePlan = buildSourcePlan({
    manifest_id: "manifest-0113-persistence",
    planned_sources: domains.map((domain) => plannedSource(domain)),
    required_domains: domains,
  });
  const sourceWindow = buildSourceWindow({
    collection_completed_at: "2026-04-27T11:05:00Z",
    collection_started_at: "2026-04-27T11:00:00Z",
    read_cutoff_at: "2026-04-27T11:10:00Z",
    source_plan: sourcePlan,
  });
  const collectionBoundary = buildCollectionBoundary({
    collection_boundary_id: "collection-boundary.manifest-0113-persistence",
    connector_build_id: "connector-build://hmrc/0113",
    connector_profile_ref: "connector-profile://hmrc",
    source_boundaries: [
      sourceBoundary("income_sources", "IN_SCOPE_COLLECTED"),
      sourceBoundary("vat_obligations", "NO_DATA_CONFIRMED_AT_CUTOFF"),
      sourceBoundary("payroll", "EXCLUDED_BY_POLICY"),
      sourceBoundary("pensions", "STALE_AT_CUTOFF"),
    ],
    source_plan: sourcePlan,
    source_window: sourceWindow,
  });
  return { collectionBoundary, sourcePlan };
}

test("migration defines normalization context and declaration registers", async () => {
  const sql = await readFile(migrationPath, "utf8");

  expect(sql).toContain("control_collection.normalization_context_register");
  expect(sql).toContain("control_collection.source_domain_declaration_register");
  expect(sql).toContain("NO_DATA_CONFIRMED_AT_CUTOFF");
  expect(sql).toContain("NO_BOUNDARY_DISPOSITION");
  expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
});

test("repositories persist and reload schema-valid normalization context and declarations", async () => {
  const normalizationRepository = new NormalizationContextRepository();
  const declarationRepository = new SourceDomainDeclarationRepository();
  const { collectionBoundary, sourcePlan } = buildArtifacts();
  const normalizationContext = freezeNormalizationContext({
    connector_build_refs: ["connector-build://hmrc/0113"],
    evidence_rules_ref: "evidence-rules://2026-04",
    extractor_build_refs: ["extractor-build://ocr-v1"],
    mapping_rules_ref: "mapping-rules://2026-04",
    manifest_id: "manifest-0113-persistence",
    normalization_rules_ref: "normalization-rules://2026-04",
    produced_at: "2026-04-27T11:12:00Z",
    promotion_rules_ref: "promotion-rules://2026-04",
    schema_bundle_hash: "schema-bundle-hash://0113",
  });
  const declarations = [
    ...declareExclusions({
      collection_boundary: collectionBoundary,
      produced_at: "2026-04-27T11:12:00Z",
    }),
    ...declareConfirmedEmptySources({
      collection_boundary: collectionBoundary,
      produced_at: "2026-04-27T11:12:00Z",
    }),
    ...declareMissingSources({
      collection_boundary: collectionBoundary,
      produced_at: "2026-04-27T11:12:00Z",
    }),
    ...declareStaleSources({
      collection_boundary: collectionBoundary,
      produced_at: "2026-04-27T11:12:00Z",
    }),
  ];

  const validation = validateSourceDomainDeclarations({
    collection_boundary: collectionBoundary,
    declarations,
    source_plan: sourcePlan,
  });
  const storedContext = await normalizationRepository.persistNormalizationContext({
    normalization_context: normalizationContext,
    persisted_at: "2026-04-27T11:13:00Z",
  });
  const storedDeclarations = [];
  for (const declaration of declarations) {
    storedDeclarations.push(
      await declarationRepository.persistSourceDomainDeclaration({
        declaration,
        persisted_at: "2026-04-27T11:14:00Z",
      }),
    );
  }

  await validatePayloadAgainstSchema(
    "normalization_context.schema.json",
    storedContext.normalization_context,
  );
  await validatePayloadAgainstSchema(declarationSchemaPath, storedDeclarations[0]!.declaration);

  expect(
    await normalizationRepository.getNormalizationContextByRef(
      normalizationContextRef(normalizationContext),
    ),
  ).toEqual(storedContext);
  await expect(
    declarationRepository.listSourceDomainDeclarationsByKind(
      "manifest-0113-persistence",
      "NO_DATA_CONFIRMED_AT_CUTOFF",
    ),
  ).resolves.toHaveLength(1);
  await expect(
    declarationRepository.getSourceDomainDeclarationByRef(
      sourceDomainDeclarationRef(declarations[0]!),
    ),
  ).resolves.toEqual(storedDeclarations[0]);
  expect(validation.no_data_confirmed_declarations).toHaveLength(1);
  expect(validation.missing_source_declarations).toHaveLength(0);
});

test("persistence is idempotent for identical payloads and rejects declaration key collisions", async () => {
  const declarationRepository = new SourceDomainDeclarationRepository();
  const { collectionBoundary } = buildArtifacts();
  const [declaration] = declareConfirmedEmptySources({
    collection_boundary: collectionBoundary,
    produced_at: "2026-04-27T11:12:00Z",
  });
  const stored = await declarationRepository.persistSourceDomainDeclaration({
    declaration: declaration!,
    persisted_at: "2026-04-27T11:14:00Z",
  });

  await expect(
    declarationRepository.persistSourceDomainDeclaration({
      declaration: declaration!,
      persisted_at: "2026-04-27T11:15:00Z",
    }),
  ).resolves.toEqual(stored);

  await expect(
    declarationRepository.persistSourceDomainDeclaration({
      declaration: {
        ...declaration!,
        declaration_id: `${declaration!.declaration_id}.collision`,
      },
      persisted_at: "2026-04-27T11:16:00Z",
    }),
  ).rejects.toThrow();
});

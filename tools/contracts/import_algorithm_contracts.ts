import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const algorithmRoot = path.join(repoRoot, "Algorithm");
const algorithmSchemaDir = path.join(algorithmRoot, "schemas");
const contractsPackageRoot = path.join(repoRoot, "packages", "contracts-core");
const contractsSchemaDir = path.join(contractsPackageRoot, "schemas");
const contractsSampleDir = path.join(contractsPackageRoot, "samples");
const contractsPythonDir = path.join(contractsPackageRoot, "python");
const contractsDataDir = path.join(contractsPackageRoot, "data");
const schemaSourceMapPath = path.join(contractsDataDir, "schema_source_map.json");
const sampleBindingMapPath = path.join(contractsDataDir, "sample_binding_map.json");
const schemaCatalogModulePath = path.join(contractsPackageRoot, "src", "schemaCatalog.ts");
const atlasDataPath = path.join(
  repoRoot,
  "apps",
  "operator-web",
  "public",
  "internal",
  "schema-catalog-atlas",
  "data",
  "schema-catalog-atlas.json",
);

const IMPORT_STRATEGY = "MIRRORED_VENDOR_IMPORT_WITH_HASH_LINEAGE";
const IMPORT_POSTURE = "MIRRORED_IMPORT_SYNCED";
const SOURCE_BUNDLE_ROOT = "Algorithm";
const PACKAGE_OVERRIDE = "packages/contracts -> packages/contracts-core";
const VALIDATOR_POSTURE = "PATH_ADAPTER_ONLY_AUTHORITATIVE_LOGIC_PRESERVED";

const FAMILY_DEFINITIONS = [
  {
    ref: "AUTHORITY_AND_ACCESS",
    label: "Authority & Access",
    summary:
      "Authority bindings, access posture, connector delegation, request envelopes, and fraud-bound ingress identity.",
    prefixes: [
      "authority_",
      "authorization_",
      "principal_",
      "connector_",
      "delegation_",
      "exceptional_authority_",
      "scope_execution_",
    ],
    names: new Set([
      "action_authority_contract",
      "actor_session",
      "authority_link",
      "authority_link_inventory_item",
      "authority_operation",
      "authority_operation_profile",
      "authority_request_envelope",
      "authority_response_envelope",
      "authority_interaction_record",
      "nightly_batch_identity_contract",
    ]),
  },
  {
    ref: "CLIENT_AND_COLLABORATION",
    label: "Client & Collaboration",
    summary:
      "Client portal, collaboration workspace, uploads, approvals, and customer-safe route projections.",
    prefixes: ["client_", "portal_", "customer_", "collaboration_"],
    names: new Set([
      "request_info_record",
      "workspace_snapshot",
      "workspace_stream_event",
      "work_inbox_delta",
      "work_inbox_snapshot",
      "work_item_notification",
      "work_item_participant",
      "work_queue_health_contract",
    ]),
  },
  {
    ref: "GOVERNANCE_AND_POLICY",
    label: "Governance & Policy",
    summary:
      "Governance read models, role and access policy, mutation hazard controls, retention posture, and tenant-scoped policy state.",
    prefixes: ["governance_", "tenant_", "retention_"],
    names: new Set([
      "accepted_risk_approval",
      "audit_investigation_frame",
      "config_change_request",
      "config_freeze",
      "config_version",
      "feature_flag_snapshot",
      "principal_access_view",
      "role_template_matrix",
      "secret_version",
    ]),
  },
  {
    ref: "MANIFEST_AND_RELEASE",
    label: "Manifest & Release",
    summary:
      "Schema windows, manifest lineage, deployment and release evidence, restore posture, and replay-safe promotion controls.",
    prefixes: ["manifest_", "release_", "schema_", "deployment_", "recovery_", "restore_"],
    names: new Set([
      "api_command_receipt",
      "backfill_execution_contract",
      "build_artifact",
      "canary_health_summary",
      "client_compatibility_matrix",
      "deterministic_golden_pack",
      "replay_attestation",
      "state_transition_contract",
    ]),
  },
  {
    ref: "SURFACE_AND_EXPERIENCE",
    label: "Surface & Experience",
    summary:
      "Shell continuity, reduced-noise surfaces, native hydration, semantic accessibility, and interaction-layer presentation law.",
    prefixes: [
      "action_strip_",
      "context_bar_",
      "cross_device_",
      "detail_drawer_",
      "experience_",
      "focus_",
      "low_noise_",
      "native_",
      "operator_interaction_",
      "portal_interaction_",
      "semantic_",
      "shell_",
    ],
    names: new Set([
      "decision_summary_state",
      "governance_interaction_layer",
      "interaction_layer_foundation_contract",
      "route_stability_contract",
      "workspace_cursor",
    ]),
  },
  {
    ref: "DECISIONING_AND_NIGHTLY",
    label: "Decisioning & Nightly",
    summary:
      "Computation outputs, trust and parity scoring, gate semantics, and nightly digest or simulation artifacts.",
    prefixes: ["nightly_", "gate_", "trust_"],
    names: new Set([
      "baseline_selection_contract",
      "calculation_basis",
      "calculation_user_confirmation",
      "compute_result",
      "decision_bundle",
      "decision_explainability_contract",
      "forecast_set",
      "operator_digest_derivation_contract",
      "operator_morning_digest",
      "parity_result",
      "risk_report",
    ]),
  },
  {
    ref: "PROVENANCE_AND_EVIDENCE",
    label: "Provenance & Evidence",
    summary:
      "Canonical/source evidence artifacts, provenance graph closure, intake lineage, proof bundles, and normalized conflict sets.",
    prefixes: [
      "artifact_",
      "candidate_",
      "canonical_",
      "conflict_",
      "constraint_",
      "evidence_",
      "proof_",
      "provenance_",
      "source_",
    ],
    names: new Set([
      "enquiry_pack",
      "input_freeze",
      "normalization_context",
      "schema_bundle",
      "snapshot",
    ]),
  },
  {
    ref: "RETENTION_FAILURE_AND_OBSERVABILITY",
    label: "Retention, Failure & Observability",
    summary:
      "Retention proofs, error and remediation artifacts, accepted-risk evidence, and audit or telemetry records.",
    prefixes: ["failure_"],
    names: new Set([
      "accepted_risk_approval",
      "artifact_retention",
      "audit_event",
      "compensation_record",
      "erasure_proof",
      "error_record",
      "log_record",
      "metric_event",
      "remediation_task",
      "telemetry_resource",
      "trace_span",
    ]),
  },
  {
    ref: "DOMAIN_WORKFLOW_AND_FILING",
    label: "Domain Workflow & Filing",
    summary:
      "Workflow items, filing and amendment law, drift and late-data handling, and durable operational domain records.",
    prefixes: ["amendment_", "collection_", "filing_", "late_data_", "workflow_"],
    names: new Set([
      "audit_event",
      "canonical_fact",
      "canonical_fact_set",
      "command_envelope",
      "command_truth_boundary_contract",
      "compensation_record",
      "drift_baseline_envelope",
      "drift_baseline_selection_visualization",
      "drift_baseline_selection_visualization_basis_contract",
      "drift_record",
      "enquiry_pack",
      "input_freeze",
      "invariant_enforcement_contract",
      "mutation_precondition_binding",
      "obligation_mirror",
      "recovery_checkpoint",
      "retroactive_impact_analysis",
      "run_manifest",
      "submission_record",
    ]),
  },
] as const;

type LogicalFamilyRef = (typeof FAMILY_DEFINITIONS)[number]["ref"];
type FamilyDefinition = (typeof FAMILY_DEFINITIONS)[number];
type SyncMode = "emit" | "check";

type SchemaEntry = {
  schemaName: string;
  schemaStem: string;
  label: string;
  schemaId: string;
  sourcePath: string;
  destinationPath: string;
  sourceHash: string;
  destinationHash: string;
  logicalFamilyRef: LogicalFamilyRef;
  logicalFamilyLabel: string;
  refTargets: string[];
  resolvedSchemaRefs: string[];
  sampleRefs: string[];
  validationPosture: string;
  importStrategy: string;
  importStatus: "IMPORTED";
};

type SampleEntry = {
  sampleName: string;
  label: string;
  sourcePath: string;
  destinationPath: string;
  sourceHash: string;
  destinationHash: string;
  inferredSchemaName: string;
  inferredSchemaId: string;
  logicalFamilyRef: LogicalFamilyRef;
  logicalFamilyLabel: string;
  bindingMethod: string;
  validationPosture: string;
};

type ValidatorArtifact = {
  artifactRef: "validate_contracts.py" | "forensic_contract_guard.py";
  sourcePath: string;
  destinationPath: string;
  sourceHash: string;
  destinationHash: string;
  adaptationPosture: string;
  command: string;
};

type SchemaSourceMap = {
  packagePath: string;
  packageOverride: string;
  sourceBundleRoot: string;
  importStrategy: string;
  importPosture: string;
  counts: {
    schemas: number;
    samples: number;
    validators: number;
  };
  validators: ValidatorArtifact[];
  schemas: SchemaEntry[];
};

type SampleBindingMap = {
  packagePath: string;
  sourceBundleRoot: string;
  bindingMethod: string;
  validationPosture: string;
  counts: {
    samples: number;
  };
  samples: SampleEntry[];
};

type AtlasPayload = {
  routeId: string;
  title: string;
  bundleBadge: string;
  schemaCountBadge: string;
  importPosture: string;
  summary: string;
  referenceRibbon: string[];
  validators: ValidatorArtifact[];
  families: Array<{
    family_ref: LogicalFamilyRef;
    label: string;
    summary: string;
    schemas: SchemaEntry[];
  }>;
  selectedFamilyRef: LogicalFamilyRef;
  selectedSchemaRef: string;
};

const FAMILY_BY_REF = new Map<LogicalFamilyRef, FamilyDefinition>(
  FAMILY_DEFINITIONS.map((family) => [family.ref, family]),
);

function posixRelative(from: string, to: string) {
  return path.relative(from, to).split(path.sep).join(path.posix.sep);
}

function sha256(buffer: Buffer | string) {
  return createHash("sha256").update(buffer).digest("hex");
}

function humanizeIdentifier(value: string) {
  return value
    .replace(/\.schema\.json$/, "")
    .replace(/\.json$/, "")
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function inferLogicalFamily(schemaStem: string): LogicalFamilyRef {
  for (const family of FAMILY_DEFINITIONS) {
    if (family.names.has(schemaStem)) {
      return family.ref;
    }
    if (family.prefixes.some((prefix) => schemaStem.startsWith(prefix))) {
      return family.ref;
    }
  }
  return "DOMAIN_WORKFLOW_AND_FILING";
}

function inferSchemaNameFromSample(sampleName: string) {
  return sampleName.replace(/^sample_/, "").replace(/\.json$/, ".schema.json");
}

function collectRefs(value: unknown, refs: string[] = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectRefs(item, refs));
    return refs;
  }
  if (!value || typeof value !== "object") {
    return refs;
  }
  for (const [key, nestedValue] of Object.entries(value)) {
    if (key === "$ref" && typeof nestedValue === "string") {
      refs.push(nestedValue);
    }
    collectRefs(nestedValue, refs);
  }
  return refs;
}

function resolveSchemaRef(ref: string) {
  const [refWithoutFragment] = ref.split("#");
  if (ref.startsWith("https://taxat.dev/schemas/")) {
    return refWithoutFragment.slice("https://taxat.dev/schemas/".length);
  }
  if (ref.startsWith("./")) {
    return refWithoutFragment.slice(2);
  }
  if (refWithoutFragment.endsWith(".schema.json")) {
    return path.posix.basename(refWithoutFragment);
  }
  return null;
}

async function listFiles(dir: string, predicate: (name: string) => boolean) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && predicate(entry.name))
    .map((entry) => entry.name)
    .sort();
}

async function ensureParentDir(filePath: string) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function readFileIfExists(filePath: string) {
  try {
    return await readFile(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function writeOrCheckBuffer(
  filePath: string,
  contents: Buffer | string,
  mode: SyncMode,
  mismatches: string[],
) {
  const expected = typeof contents === "string" ? Buffer.from(contents, "utf8") : contents;
  if (mode === "emit") {
    const current = await readFileIfExists(filePath);
    if (current && current.equals(expected)) {
      return;
    }
    await ensureParentDir(filePath);
    await writeFile(filePath, expected);
    return;
  }
  const current = await readFileIfExists(filePath);
  if (!current) {
    mismatches.push(`Missing generated file: ${posixRelative(repoRoot, filePath)}`);
    return;
  }
  if (!current.equals(expected)) {
    mismatches.push(`Out-of-sync generated file: ${posixRelative(repoRoot, filePath)}`);
  }
}

async function checkDirectoryContents(
  dir: string,
  expectedNames: string[],
  mode: SyncMode,
  mismatches: string[],
) {
  if (mode === "emit") {
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    return;
  }
  const dirStat = await stat(dir).catch(() => null);
  if (!dirStat || !dirStat.isDirectory()) {
    mismatches.push(`Missing generated directory: ${posixRelative(repoRoot, dir)}`);
    return;
  }
  const actualNames = (await readdir(dir, { withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
  if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) {
    mismatches.push(
      `Unexpected directory contents in ${posixRelative(repoRoot, dir)}: expected ${expectedNames.length} tracked files, found ${actualNames.length}.`,
    );
  }
}

function adaptValidateContracts(sourceText: string) {
  return sourceText
    .replace(
      'ROOT = Path(__file__).resolve().parents[1]\nREPO_ROOT = ROOT.parent\nSCHEMA_DIR = ROOT / "schemas"\nif str(ROOT) not in sys.path:\n    sys.path.insert(0, str(ROOT))\n\nfrom tools.forensic_contract_guard import run_guard_checks\n',
      'PACKAGE_ROOT = Path(__file__).resolve().parents[1]\nREPO_ROOT = PACKAGE_ROOT.parents[1]\nROOT = REPO_ROOT / "Algorithm"\nSCHEMA_DIR = PACKAGE_ROOT / "schemas"\nSAMPLE_DIR = PACKAGE_ROOT / "samples"\nPYTHON_DIR = PACKAGE_ROOT / "python"\nif str(PYTHON_DIR) not in sys.path:\n    sys.path.insert(0, str(PYTHON_DIR))\n\nfrom forensic_contract_guard import run_guard_checks\n',
    )
    .replaceAll('SCHEMA_DIR.glob("sample_*.json")', 'SAMPLE_DIR.glob("sample_*.json")')
    .replaceAll('SCHEMA_DIR / "sample_', 'SAMPLE_DIR / "sample_')
    .replaceAll('ROOT / "schemas" / "sample_', 'SAMPLE_DIR / "sample_');
}

function adaptForensicGuard(sourceText: string) {
  return sourceText.replace(
    'ROOT = Path(__file__).resolve().parents[1]\nSCHEMAS = ROOT / "schemas"\n',
    'PACKAGE_ROOT = Path(__file__).resolve().parents[1]\nREPO_ROOT = PACKAGE_ROOT.parents[1]\nROOT = REPO_ROOT / "Algorithm"\nSCHEMAS = PACKAGE_ROOT / "schemas"\n',
  );
}

function renderSchemaCatalogModule(schemaMap: SchemaSourceMap, sampleMap: SampleBindingMap) {
  const familyRefs = FAMILY_DEFINITIONS.map((family) => family.ref);
  return `export type LogicalFamilyRef = ${familyRefs.map((family) => `"${family}"`).join(" | ")};

export type SchemaCatalogEntry = {
  schemaName: string;
  schemaStem: string;
  label: string;
  schemaId: string;
  sourcePath: string;
  destinationPath: string;
  sourceHash: string;
  destinationHash: string;
  logicalFamilyRef: LogicalFamilyRef;
  logicalFamilyLabel: string;
  refTargets: string[];
  resolvedSchemaRefs: string[];
  sampleRefs: string[];
  validationPosture: string;
  importStrategy: string;
  importStatus: "IMPORTED";
};

export type SampleBindingEntry = {
  sampleName: string;
  label: string;
  sourcePath: string;
  destinationPath: string;
  sourceHash: string;
  destinationHash: string;
  inferredSchemaName: string;
  inferredSchemaId: string;
  logicalFamilyRef: LogicalFamilyRef;
  logicalFamilyLabel: string;
  bindingMethod: string;
  validationPosture: string;
};

export type ValidatorArtifact = {
  artifactRef: "validate_contracts.py" | "forensic_contract_guard.py";
  sourcePath: string;
  destinationPath: string;
  sourceHash: string;
  destinationHash: string;
  adaptationPosture: string;
  command: string;
};

export const contractImportBundle = ${JSON.stringify(
    {
      packagePath: schemaMap.packagePath,
      packageOverride: schemaMap.packageOverride,
      sourceBundleRoot: schemaMap.sourceBundleRoot,
      importStrategy: schemaMap.importStrategy,
      importPosture: schemaMap.importPosture,
      counts: schemaMap.counts,
    },
    null,
    2,
  )} as const;

export const validatorArtifacts = ${JSON.stringify(schemaMap.validators, null, 2)} as const;

export const schemaCatalog = ${JSON.stringify(schemaMap.schemas, null, 2)} as const;

export const sampleBindingCatalog = ${JSON.stringify(sampleMap.samples, null, 2)} as const;

export const schemaCatalogByName = Object.fromEntries(
  schemaCatalog.map((entry) => [entry.schemaName, entry]),
) as Record<string, SchemaCatalogEntry>;

export const schemaCatalogById = Object.fromEntries(
  schemaCatalog.map((entry) => [entry.schemaId, entry]),
) as Record<string, SchemaCatalogEntry>;

export const sampleBindingsBySchemaName = Object.fromEntries(
  schemaCatalog.map((entry) => [
    entry.schemaName,
    sampleBindingCatalog.filter((sample) => sample.inferredSchemaName === entry.schemaName),
  ]),
) as Record<string, SampleBindingEntry[]>;

export const schemaFamilies = ${JSON.stringify(
    FAMILY_DEFINITIONS.map((family) => ({
      ref: family.ref,
      label: family.label,
      summary: family.summary,
      schemaCount: schemaMap.schemas.filter((entry) => entry.logicalFamilyRef === family.ref)
        .length,
    })),
    null,
    2,
  )} as const;
`;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const mode: SyncMode = args.has("--emit") ? "emit" : "check";
  const mismatches: string[] = [];

  const schemaNames = await listFiles(algorithmSchemaDir, (name) => name.endsWith(".schema.json"));
  const sampleNames = await listFiles(
    algorithmSchemaDir,
    (name) => name.startsWith("sample_") && name.endsWith(".json"),
  );

  const schemaEntries: SchemaEntry[] = [];
  const sampleEntries: SampleEntry[] = [];

  await checkDirectoryContents(contractsSchemaDir, schemaNames, mode, mismatches);
  await checkDirectoryContents(contractsSampleDir, sampleNames, mode, mismatches);
  await mkdir(contractsPythonDir, { recursive: true });
  await mkdir(contractsDataDir, { recursive: true });

  const sourceSchemaIdByName = new Map<string, string>();

  for (const schemaName of schemaNames) {
    const sourcePath = path.join(algorithmSchemaDir, schemaName);
    const destinationPath = path.join(contractsSchemaDir, schemaName);
    const sourceBuffer = await readFile(sourcePath);
    const schema = JSON.parse(sourceBuffer.toString("utf8")) as Record<string, unknown>;
    const schemaStem = schemaName.replace(/\.schema\.json$/, "");
    const logicalFamilyRef = inferLogicalFamily(schemaStem);
    const family = FAMILY_BY_REF.get(logicalFamilyRef);
    if (!family) {
      throw new Error(`Unknown logical family for ${schemaName}`);
    }

    const schemaId =
      typeof schema.$id === "string" ? schema.$id : `https://taxat.dev/schemas/${schemaName}`;
    sourceSchemaIdByName.set(schemaName, schemaId);

    const refTargets = Array.from(new Set(collectRefs(schema))).sort();
    const resolvedSchemaRefs = Array.from(
      new Set(
        refTargets.map((ref) => resolveSchemaRef(ref)).filter((ref): ref is string => Boolean(ref)),
      ),
    ).sort();

    const entry: SchemaEntry = {
      schemaName,
      schemaStem,
      label:
        typeof schema.title === "string" && schema.title.length > 0
          ? humanizeIdentifier(schema.title)
          : humanizeIdentifier(schemaStem),
      schemaId,
      sourcePath: posixRelative(repoRoot, sourcePath),
      destinationPath: posixRelative(repoRoot, destinationPath),
      sourceHash: sha256(sourceBuffer),
      destinationHash: sha256(sourceBuffer),
      logicalFamilyRef,
      logicalFamilyLabel: family.label,
      refTargets,
      resolvedSchemaRefs,
      sampleRefs: [],
      validationPosture:
        "JSON_SCHEMA_DRAFT_2020_12_WITH_UPSTREAM_CUSTOM_VALIDATORS_AND_REPO_COHERENCE_CHECKS",
      importStrategy: IMPORT_STRATEGY,
      importStatus: "IMPORTED",
    };

    schemaEntries.push(entry);
    await writeOrCheckBuffer(destinationPath, sourceBuffer, mode, mismatches);
  }

  const schemaEntryByName = new Map(schemaEntries.map((entry) => [entry.schemaName, entry]));

  for (const sampleName of sampleNames) {
    const sourcePath = path.join(algorithmSchemaDir, sampleName);
    const destinationPath = path.join(contractsSampleDir, sampleName);
    const sourceBuffer = await readFile(sourcePath);
    const inferredSchemaName = inferSchemaNameFromSample(sampleName);
    const schemaEntry = schemaEntryByName.get(inferredSchemaName);

    if (!schemaEntry) {
      mismatches.push(
        `Sample ${sampleName} does not resolve to an imported schema ${inferredSchemaName}.`,
      );
    }

    const entry: SampleEntry = {
      sampleName,
      label: humanizeIdentifier(sampleName),
      sourcePath: posixRelative(repoRoot, sourcePath),
      destinationPath: posixRelative(repoRoot, destinationPath),
      sourceHash: sha256(sourceBuffer),
      destinationHash: sha256(sourceBuffer),
      inferredSchemaName,
      inferredSchemaId: schemaEntry?.schemaId ?? `MISSING_SCHEMA_ID:${inferredSchemaName}`,
      logicalFamilyRef: schemaEntry?.logicalFamilyRef ?? "DOMAIN_WORKFLOW_AND_FILING",
      logicalFamilyLabel: schemaEntry?.logicalFamilyLabel ?? "Domain Workflow & Filing",
      bindingMethod: "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
      validationPosture:
        "DRAFT_2020_12_VALIDATION_THEN_OPTIONAL_UPSTREAM_CUSTOM_VALIDATOR_BY_INFERRED_KIND",
    };

    sampleEntries.push(entry);
    if (schemaEntry) {
      schemaEntry.sampleRefs.push(sampleName);
    }

    await writeOrCheckBuffer(destinationPath, sourceBuffer, mode, mismatches);
  }

  schemaEntries.forEach((entry) => entry.sampleRefs.sort());

  const validateContractsSourcePath = path.join(algorithmRoot, "scripts", "validate_contracts.py");
  const forensicGuardSourcePath = path.join(algorithmRoot, "tools", "forensic_contract_guard.py");

  const importedValidateContracts = adaptValidateContracts(
    (await readFile(validateContractsSourcePath, "utf8")).replace(/\r\n/g, "\n"),
  );
  const importedForensicGuard = adaptForensicGuard(
    (await readFile(forensicGuardSourcePath, "utf8")).replace(/\r\n/g, "\n"),
  );

  const validatorArtifacts: ValidatorArtifact[] = [
    {
      artifactRef: "validate_contracts.py",
      sourcePath: posixRelative(repoRoot, validateContractsSourcePath),
      destinationPath: "packages/contracts-core/python/validate_contracts.py",
      sourceHash: sha256(await readFile(validateContractsSourcePath)),
      destinationHash: sha256(importedValidateContracts),
      adaptationPosture: VALIDATOR_POSTURE,
      command: "python3 packages/contracts-core/python/validate_contracts.py --self-test",
    },
    {
      artifactRef: "forensic_contract_guard.py",
      sourcePath: posixRelative(repoRoot, forensicGuardSourcePath),
      destinationPath: "packages/contracts-core/python/forensic_contract_guard.py",
      sourceHash: sha256(await readFile(forensicGuardSourcePath)),
      destinationHash: sha256(importedForensicGuard),
      adaptationPosture: VALIDATOR_POSTURE,
      command: "python3 packages/contracts-core/python/forensic_contract_guard.py",
    },
  ];

  const schemaSourceMap: SchemaSourceMap = {
    packagePath: "packages/contracts-core",
    packageOverride: PACKAGE_OVERRIDE,
    sourceBundleRoot: SOURCE_BUNDLE_ROOT,
    importStrategy: IMPORT_STRATEGY,
    importPosture: IMPORT_POSTURE,
    counts: {
      schemas: schemaEntries.length,
      samples: sampleEntries.length,
      validators: validatorArtifacts.length,
    },
    validators: validatorArtifacts,
    schemas: schemaEntries,
  };

  const sampleBindingMap: SampleBindingMap = {
    packagePath: "packages/contracts-core",
    sourceBundleRoot: SOURCE_BUNDLE_ROOT,
    bindingMethod: "FILENAME_CONVENTION_SAMPLE_TO_SCHEMA_MATCH",
    validationPosture: "JSON_SCHEMA_DRAFT_2020_12_AND_UPSTREAM_CUSTOM_VALIDATOR_LINEAGE_PRESERVED",
    counts: {
      samples: sampleEntries.length,
    },
    samples: sampleEntries,
  };

  const families = FAMILY_DEFINITIONS.map((family) => ({
    family_ref: family.ref,
    label: family.label,
    summary: family.summary,
    schemas: schemaEntries.filter((entry) => entry.logicalFamilyRef === family.ref),
  })).filter((family) => family.schemas.length > 0);

  const atlasPayload: AtlasPayload = {
    routeId: "schema-catalog-atlas",
    title: "Taxat Schema Catalog Atlas",
    bundleBadge: "CTS",
    schemaCountBadge: `${schemaEntries.length} schemas · ${sampleEntries.length} samples`,
    importPosture: IMPORT_POSTURE,
    summary:
      "The contracts-core package mirrors the authoritative Algorithm schema bundle byte-for-byte for schemas and samples, carries source hashes for every imported artifact, and keeps the Python validators executable with path-only repo adapters instead of a semantic rewrite.",
    referenceRibbon: ["schema", "samples", "validator"],
    validators: validatorArtifacts,
    families,
    selectedFamilyRef: "MANIFEST_AND_RELEASE",
    selectedSchemaRef: "schema_bundle_compatibility_gate_contract.schema.json",
  };

  const generatedFiles = [
    {
      path: path.join(contractsPythonDir, "validate_contracts.py"),
      contents: importedValidateContracts,
    },
    {
      path: path.join(contractsPythonDir, "forensic_contract_guard.py"),
      contents: importedForensicGuard,
    },
    {
      path: schemaSourceMapPath,
      contents: `${JSON.stringify(schemaSourceMap, null, 2)}\n`,
    },
    {
      path: sampleBindingMapPath,
      contents: `${JSON.stringify(sampleBindingMap, null, 2)}\n`,
    },
    {
      path: schemaCatalogModulePath,
      contents: renderSchemaCatalogModule(schemaSourceMap, sampleBindingMap),
    },
    {
      path: atlasDataPath,
      contents: `${JSON.stringify(atlasPayload, null, 2)}\n`,
    },
  ];

  for (const generatedFile of generatedFiles) {
    await writeOrCheckBuffer(generatedFile.path, generatedFile.contents, mode, mismatches);
  }

  if (mode === "check" && mismatches.length > 0) {
    mismatches.forEach((mismatch) => console.error(mismatch));
    process.exitCode = 1;
    return;
  }

  console.log(
    `${mode === "emit" ? "wrote" : "verified"} contracts import bundle: ${schemaEntries.length} schemas, ${sampleEntries.length} samples, ${validatorArtifacts.length} validators`,
  );
  console.log(`schema source map: ${posixRelative(repoRoot, schemaSourceMapPath)}`);
  console.log(`sample binding map: ${posixRelative(repoRoot, sampleBindingMapPath)}`);
}

await main();

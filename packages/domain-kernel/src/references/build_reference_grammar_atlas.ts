import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  assertUploadSessionStorageContinuity,
  computeArtifactPresentationTargets,
  computeDeliveryBindingHash,
  materializeCustomerDeliveryAffordance,
  materializeCustomerSafeDerivativeLocator,
  type DeliveryBindingContext,
  type ReferenceFamilyRef,
  REFERENCE_FAMILY_ORDER,
} from "./index.ts";

type SourceLineageEntry = {
  rationale: string;
  source_file: string;
  source_heading_or_logical_block: string;
};

type ReferenceGrammarFamilyRow = {
  allowed_consumers: string[];
  allowed_producers: string[];
  display_name: string;
  durability_posture: string;
  exact_fields: string[];
  exposure_posture: string;
  family_ref: ReferenceFamilyRef;
  forbidden_substitutions: ReferenceFamilyRef[];
  lawful_examples: string[];
  notes: string[];
  primary_string_kind: string;
  rail_label: string;
  semantic_role: string;
  suffix_rules: string[];
};

type ReferenceKeyGrammar = {
  basis_statement: string;
  contract_version: string;
  family_rows: ReferenceGrammarFamilyRow[];
  grammar_badge: string;
  grammar_id: string;
  source_lineage: SourceLineageEntry[];
};

type LocatorStrategy = {
  basis_statement: string;
  contract_version: string;
  locator_rows: Array<{
    durability_posture: string;
    forbidden_content: string[];
    human_readability_posture: string;
    lawful_examples: string[];
    locator_family_ref: ReferenceFamilyRef;
    move_or_copy_behavior: string;
    notes: string[];
    resolution_context: string;
    shape: string;
  }>;
  selection_rules: Array<{
    notes: string[];
    rule_ref: string;
    statement: string;
  }>;
  source_lineage: SourceLineageEntry[];
  strategy_id: string;
};

type DeliveryBindingPolicy = {
  basis_statement: string;
  binding_dimensions: string[];
  contract_version: string;
  delivery_rows: Array<{
    affordance_ref: string;
    forbidden_shortcuts: string[];
    lawful_examples: string[];
    notes: string[];
    required_context_fields: string[];
    target_fields: string[];
  }>;
  forbidden_content: string[];
  policy_id: string;
  source_lineage: SourceLineageEntry[];
};

type StorageRefNamespaceCatalog = {
  basis_statement: string;
  catalog_id: string;
  contract_version: string;
  namespace_rows: Array<{
    continuity_posture: string;
    delivery_posture: string;
    exposure_posture: string;
    namespace_ref: string;
    notes: string[];
    object_key_family_refs: string[];
    purpose_ref: string;
    storage_ref_prefix: string;
  }>;
  source_lineage: SourceLineageEntry[];
};

type AtlasExampleRow = {
  accessible_label: string;
  input_literal: string;
  label: string;
  note: string;
  output_literal: string;
};

type AtlasSubstitutionRule = {
  accessible_label: string;
  note: string;
  statement: string;
  target_family_ref: ReferenceFamilyRef;
};

type AtlasFamily = {
  allowed_consumers: string[];
  allowed_producers: string[];
  companion_rules: string[];
  display_name: string;
  durability_posture: string;
  example_rows: AtlasExampleRow[];
  exposure_posture: string;
  family_ref: ReferenceFamilyRef;
  invalid_substitutions: AtlasSubstitutionRule[];
  lawful_examples: string[];
  lattice_column: number;
  lattice_row: number;
  notes: string[];
  rail_label: string;
  semantic_role: string;
  tone: "bronze" | "plum" | "teal";
};

type AtlasPayload = {
  axes: {
    horizontal: string[];
    vertical: string[];
  };
  basisStatement: string;
  generationBasis: {
    emittedAtBasis: string;
    inputHashes: Record<string, string>;
  };
  grammarBadge: string;
  routeId: string;
  selectedFamilyRef: ReferenceFamilyRef;
  subtitle: string;
  title: string;
  transitionRules: Array<{
    accessible_label: string;
    from_family_ref: ReferenceFamilyRef;
    statement: string;
    target_family_ref: ReferenceFamilyRef;
  }>;
  families: AtlasFamily[];
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const configDir = path.join(repoRoot, "config", "references");
const atlasDataPath = path.join(
  repoRoot,
  "apps",
  "operator-web",
  "public",
  "internal",
  "reference-grammar-atlas",
  "data",
  "reference-grammar-atlas.json",
);

const jsonPaths = {
  artifactLocatorStrategy: path.join(configDir, "artifact_locator_strategy.json"),
  deliveryBindingPolicy: path.join(configDir, "delivery_binding_policy.json"),
  referenceKeyGrammar: path.join(configDir, "reference_key_grammar.json"),
  storageRefNamespaceCatalog: path.join(configDir, "storage_ref_namespace_catalog.json"),
};

const schemaPaths = {
  artifactLocatorStrategy: path.join(configDir, "artifact_locator_strategy.schema.json"),
  deliveryBindingPolicy: path.join(configDir, "delivery_binding_policy.schema.json"),
  referenceKeyGrammar: path.join(configDir, "reference_key_grammar.schema.json"),
  storageRefNamespaceCatalog: path.join(configDir, "storage_ref_namespace_catalog.schema.json"),
};

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function sha256Hex(value: Buffer | string) {
  return createHash("sha256").update(value).digest("hex");
}

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function readSchemaEnvelope(filePath: string) {
  return readJson<{
    required?: string[];
    title?: string;
  }>(filePath);
}

function validateSchemaEnvelope(
  schema: {
    required?: string[];
    title?: string;
  },
  expectedTitle: string,
  requiredKeys: string[],
) {
  invariant(schema.title === expectedTitle, `Expected schema title ${expectedTitle}.`);
  const required = new Set(schema.required ?? []);
  for (const key of requiredKeys) {
    invariant(required.has(key), `${expectedTitle} schema must require ${key}.`);
  }
}

function columnForFamily(familyRef: ReferenceFamilyRef) {
  switch (familyRef) {
    case "IDENTITY":
      return 1;
    case "REFERENCE":
      return 2;
    case "HASH":
      return 2;
    case "TARGET_REF":
      return 3;
    case "STORAGE_REF":
      return 1;
    case "DELIVERY_BINDING":
      return 4;
    case "ROUTE_TOKEN":
      return 4;
  }
}

function rowForFamily(familyRef: ReferenceFamilyRef) {
  switch (familyRef) {
    case "IDENTITY":
      return 1;
    case "REFERENCE":
      return 2;
    case "HASH":
      return 3;
    case "TARGET_REF":
      return 2;
    case "STORAGE_REF":
      return 4;
    case "DELIVERY_BINDING":
      return 4;
    case "ROUTE_TOKEN":
      return 3;
  }
}

function toneForFamily(familyRef: ReferenceFamilyRef): AtlasFamily["tone"] {
  switch (familyRef) {
    case "IDENTITY":
    case "TARGET_REF":
    case "ROUTE_TOKEN":
      return "plum";
    case "REFERENCE":
    case "DELIVERY_BINDING":
      return "teal";
    case "HASH":
    case "STORAGE_REF":
      return "bronze";
  }
}

function customSubstitutionStatement(
  sourceFamilyRef: ReferenceFamilyRef,
  targetFamilyRef: ReferenceFamilyRef,
  targetDisplayName: string,
) {
  if (sourceFamilyRef === "STORAGE_REF" && targetFamilyRef === "DELIVERY_BINDING") {
    return "storage ref cannot be used as customer download ref";
  }
  if (sourceFamilyRef === "ROUTE_TOKEN" && targetFamilyRef === "REFERENCE") {
    return "route token cannot be persisted as durable artifact ref";
  }
  if (sourceFamilyRef === "DELIVERY_BINDING" && targetFamilyRef === "REFERENCE") {
    return "signed delivery handle cannot be treated as durable artifact ref";
  }
  if (sourceFamilyRef === "HASH" && targetFamilyRef === "IDENTITY") {
    return "integrity hash cannot be reused as business identity";
  }
  return `${familyDisplayName(sourceFamilyRef)} cannot be used as ${targetDisplayName}`;
}

function familyDisplayName(familyRef: ReferenceFamilyRef) {
  switch (familyRef) {
    case "IDENTITY":
      return "identity key";
    case "REFERENCE":
      return "durable artifact ref";
    case "HASH":
      return "integrity hash";
    case "TARGET_REF":
      return "target ref";
    case "STORAGE_REF":
      return "storage ref";
    case "DELIVERY_BINDING":
      return "customer download ref";
    case "ROUTE_TOKEN":
      return "route token";
  }
}

async function loadContracts() {
  const [
    referenceGrammarSchema,
    artifactLocatorSchema,
    deliveryPolicySchema,
    storageCatalogSchema,
  ] = await Promise.all([
    readSchemaEnvelope(schemaPaths.referenceKeyGrammar),
    readSchemaEnvelope(schemaPaths.artifactLocatorStrategy),
    readSchemaEnvelope(schemaPaths.deliveryBindingPolicy),
    readSchemaEnvelope(schemaPaths.storageRefNamespaceCatalog),
  ]);

  validateSchemaEnvelope(referenceGrammarSchema, "Reference Key Grammar", [
    "$schema",
    "contract_version",
    "grammar_id",
    "grammar_badge",
    "basis_statement",
    "source_lineage",
    "family_rows",
  ]);
  validateSchemaEnvelope(artifactLocatorSchema, "Artifact Locator Strategy", [
    "$schema",
    "contract_version",
    "strategy_id",
    "basis_statement",
    "source_lineage",
    "locator_rows",
    "selection_rules",
  ]);
  validateSchemaEnvelope(deliveryPolicySchema, "Delivery Binding Policy", [
    "$schema",
    "contract_version",
    "policy_id",
    "basis_statement",
    "source_lineage",
    "binding_dimensions",
    "forbidden_content",
    "delivery_rows",
  ]);
  validateSchemaEnvelope(storageCatalogSchema, "Storage Ref Namespace Catalog", [
    "$schema",
    "contract_version",
    "catalog_id",
    "basis_statement",
    "source_lineage",
    "namespace_rows",
  ]);

  const [referenceKeyGrammar, artifactLocatorStrategy, deliveryBindingPolicy, storageCatalog] =
    await Promise.all([
      readJson<ReferenceKeyGrammar>(jsonPaths.referenceKeyGrammar),
      readJson<LocatorStrategy>(jsonPaths.artifactLocatorStrategy),
      readJson<DeliveryBindingPolicy>(jsonPaths.deliveryBindingPolicy),
      readJson<StorageRefNamespaceCatalog>(jsonPaths.storageRefNamespaceCatalog),
    ]);

  invariant(
    referenceKeyGrammar.family_rows.length === REFERENCE_FAMILY_ORDER.length,
    "Expected exactly one family row for each reference family.",
  );
  invariant(
    REFERENCE_FAMILY_ORDER.every(
      (familyRef, index) => referenceKeyGrammar.family_rows[index]?.family_ref === familyRef,
    ),
    "Reference grammar family order drifted.",
  );
  invariant(
    deliveryBindingPolicy.delivery_rows.length >= 4,
    "Expected delivery policy rows for preview, download, print, and externalization.",
  );
  invariant(storageCatalog.namespace_rows.length >= 8, "Expected storage namespace catalog rows.");

  return {
    artifactLocatorStrategy,
    deliveryBindingPolicy,
    referenceKeyGrammar,
    storageCatalog,
  };
}

function deliveryContext(): DeliveryBindingContext {
  return {
    accessBindingHashOrNull: "5ef1450d289ee6f042ef37003dd46f96f26f95ece6f088be6c3081df41ff57d6",
    affordance: "DOWNLOAD",
    canonicalObjectRef: "artifact.manifest-2026-q2.current",
    customerSafeProjectionRefOrNull: "projection.customer-safe.manifest-2026-q2.current",
    maskingPostureHashOrNull: "69c974270fa4f8727b5bcf8f4fbb5dfa136b29f8e7b0a8e5afefaaed8e1c5367",
    previewSubjectRefOrNull: "artifact.manifest-2026-q2.current.page-1",
    principalScopeRef: "scope.operator.caseworker",
    routeIdentityRef: "/manifests/{manifest_id}?focus=workflow:{item_id}",
    sessionBindingHash: "f80a7163b8f9dcb7a7f7dc91fe4421bdf538713ff4fc29fd7aaac912ad6d4630",
    targetRef: "target.download.manifest-2026-q2.current",
    tenantId: "tenant.taxat-sandbox",
    visibilityPartitionRefOrNull: "visibility.customer-safe.operator-review",
  };
}

function createFamilyExamples() {
  const bindingHash = computeDeliveryBindingHash(deliveryContext());
  const currentSelection = computeArtifactPresentationTargets({
    currentArtifactOrNull: {
      artifactRef: "artifact.manifest-2026-q2.current",
      downloadRefOrNull: "download.current.manifest-2026-q2",
      exposurePosture: "CUSTOMER_SAFE",
      lineageRole: "CURRENT",
      previewTargetRefOrNull: "target.preview.manifest-2026-q2.current",
      printTargetRefOrNull: "target.print.manifest-2026-q2.current",
      storageRefOrNull: "storage.retained-evidence.manifest-2026-q2.current",
    },
    historicalArtifacts: [
      {
        artifactRef: "artifact.manifest-2025-q4.v7",
        downloadRefOrNull: "download.history.manifest-2025-q4.v7",
        exposurePosture: "CUSTOMER_SAFE",
        lineageRole: "HISTORICAL",
        previewTargetRefOrNull: "target.preview.manifest-2025-q4.v7",
        printTargetRefOrNull: "target.print.manifest-2025-q4.v7",
        storageRefOrNull: "storage.retained-evidence.manifest-2025-q4.v7",
      },
    ],
    selectedHistoricalArtifactRefOrNull: "artifact.manifest-2025-q4.v7",
  });

  const derivative = materializeCustomerSafeDerivativeLocator({
    deliveryContext: deliveryContext(),
    derivativeArtifactRef: "artifact.customer-safe.manifest-2026-q2.current",
    derivativeDownloadRef: "download.customer-safe.manifest-2026-q2",
    derivativePreviewTargetRef: "target.preview.customer-safe.manifest-2026-q2.current",
    sourceArtifactRef: "artifact.operator-only.manifest-2026-q2.current",
    sourceStorageRefOrNull: "storage.retained-evidence.manifest-2026-q2.operator-only",
  });

  const directDelivery = materializeCustomerDeliveryAffordance({
    artifactRef: "artifact.manifest-2026-q2.current",
    deliveryBindingHash: bindingHash,
    downloadRef: "download.current.manifest-2026-q2",
    sourceStorageRefOrNull: "storage.retained-evidence.manifest-2026-q2.current",
    targetRef: "target.download.manifest-2026-q2.current",
  });

  const continuity = assertUploadSessionStorageContinuity({
    nextRequestVersionRef: "request-version.req-2026-q2.r4",
    nextStorageRef: "storage.upload-staging.upload-session-2026-04-23",
    previousRequestVersionRef: "request-version.req-2026-q2.r3",
    previousStorageRef: "storage.upload-staging.upload-session-2026-04-23",
    uploadSessionId: "upload-session-2026-04-23-0001",
  });

  return {
    DELIVERABLE_BINDING_HASH: bindingHash,
    continuity,
    currentSelection,
    derivative,
    directDelivery,
  };
}

function familyExampleRows(
  familyRef: ReferenceFamilyRef,
  examples: ReturnType<typeof createFamilyExamples>,
) {
  switch (familyRef) {
    case "IDENTITY":
      return [
        {
          accessible_label: "Identity example upload session id remains durable",
          input_literal: "upload_session_id",
          label: "Upload session identity",
          note: "Resume, reconnect, and rebase keep the session ID while request version changes.",
          output_literal: examples.continuity.uploadSessionId,
        },
      ];
    case "REFERENCE":
      return [
        {
          accessible_label: "Reference example current artifact ref remains lineage truth",
          input_literal: "artifact_ref",
          label: "Current artifact ref",
          note: "Lineage remains durable even when preview, download, or storage derivatives change.",
          output_literal: "artifact.manifest-2026-q2.current",
        },
        {
          accessible_label: "Reference example historical artifact ref remains selectable",
          input_literal: "historical_artifact_refs",
          label: "Historical artifact ref",
          note: `Explicit history selection surfaces ${examples.currentSelection.selectedHistoricalTargetsOrNull?.artifactRef ?? "none"} without replacing current defaults.`,
          output_literal: "artifact.manifest-2025-q4.v7",
        },
      ];
    case "HASH":
      return [
        {
          accessible_label: "Hash example delivery binding hash depends on route and access",
          input_literal:
            '{"route_identity_ref":"/manifests/{manifest_id}?focus=workflow:{item_id}"}',
          label: "Delivery binding hash",
          note: "Route, access, masking, object, and target context all participate.",
          output_literal: examples.DELIVERABLE_BINDING_HASH,
        },
      ];
    case "TARGET_REF":
      return [
        {
          accessible_label: "Target example current preview default stays explicit",
          input_literal: "default_preview_target_ref_or_null",
          label: "Current preview target",
          note: "Current defaults come from explicit target families, not from storage refs.",
          output_literal: examples.currentSelection.defaultPreviewTargetRefOrNull ?? "<NONE>",
        },
        {
          accessible_label: "Target example selected history target stays separate",
          input_literal: "selected historical preview target",
          label: "History preview target",
          note: "Historical targets remain selectable state and do not replace current defaults.",
          output_literal:
            examples.currentSelection.selectedHistoricalTargetsOrNull?.previewTargetRefOrNull ??
            "<NONE>",
        },
      ];
    case "STORAGE_REF":
      return [
        {
          accessible_label: "Storage example staging storage ref survives rebase",
          input_literal: "storage_ref",
          label: "Upload staging storage ref",
          note: `Request version drift ${examples.continuity.previousRequestVersionRef} -> ${examples.continuity.nextRequestVersionRef} keeps one storage backing.`,
          output_literal: examples.continuity.stableStorageRef,
        },
      ];
    case "DELIVERY_BINDING":
      return [
        {
          accessible_label: "Delivery example customer download requires explicit binding",
          input_literal: "download_ref",
          label: "Customer download ref",
          note: "The opaque download ref stays unusable without the matching delivery binding hash.",
          output_literal: examples.directDelivery.downloadRef,
        },
        {
          accessible_label: "Delivery example customer safe derivative mints new handle",
          input_literal: "customer-safe derivative",
          label: "Derivative delivery",
          note: `Source storage exposed: ${String(examples.derivative.sourceStorageRefExposed)}.`,
          output_literal: examples.derivative.customerDelivery.downloadRef,
        },
      ];
    case "ROUTE_TOKEN":
      return [
        {
          accessible_label: "Route example route identity token stays session scoped",
          input_literal: "route_identity_ref",
          label: "Route identity token",
          note: "The route token participates in cache and delivery binding without becoming durable artifact truth.",
          output_literal: deliveryContext().routeIdentityRef,
        },
      ];
  }
}

function familyCompanionRules(
  familyRef: ReferenceFamilyRef,
  contracts: Awaited<ReturnType<typeof loadContracts>>,
) {
  switch (familyRef) {
    case "TARGET_REF":
      return contracts.artifactLocatorStrategy.selection_rules.map((rule) => rule.statement);
    case "DELIVERY_BINDING":
      return contracts.deliveryBindingPolicy.delivery_rows.map(
        (row) => `${row.affordance_ref}: ${row.notes[0]}`,
      );
    case "STORAGE_REF":
      return contracts.storageCatalog.namespace_rows.map(
        (row) => `${row.namespace_ref}: ${row.delivery_posture}`,
      );
    case "ROUTE_TOKEN":
      return contracts.deliveryBindingPolicy.binding_dimensions;
    default:
      return [];
  }
}

async function createAtlasPayload() {
  const contracts = await loadContracts();
  const examples = createFamilyExamples();

  const inputHashes = Object.fromEntries(
    await Promise.all(
      Object.entries(jsonPaths).map(async ([key, filePath]) => {
        const buffer = await readFile(filePath);
        return [key, sha256Hex(buffer)] as const;
      }),
    ),
  );

  const families: AtlasFamily[] = contracts.referenceKeyGrammar.family_rows.map((row) => {
    const invalidSubstitutions = row.forbidden_substitutions.map((targetFamilyRef) => ({
      accessible_label: customSubstitutionStatement(
        row.family_ref,
        targetFamilyRef,
        familyDisplayName(targetFamilyRef),
      ),
      note:
        row.family_ref === "STORAGE_REF" && targetFamilyRef === "DELIVERY_BINDING"
          ? "Customer-visible delivery must go through target selection plus delivery binding."
          : "Cross-family substitution would collapse distinct contract meaning.",
      statement: customSubstitutionStatement(
        row.family_ref,
        targetFamilyRef,
        familyDisplayName(targetFamilyRef),
      ),
      target_family_ref: targetFamilyRef,
    }));

    return {
      allowed_consumers: row.allowed_consumers,
      allowed_producers: row.allowed_producers,
      companion_rules: familyCompanionRules(row.family_ref, contracts),
      display_name: row.display_name,
      durability_posture: row.durability_posture,
      example_rows: familyExampleRows(row.family_ref, examples),
      exposure_posture: row.exposure_posture,
      family_ref: row.family_ref,
      invalid_substitutions: invalidSubstitutions,
      lawful_examples: row.lawful_examples,
      lattice_column: columnForFamily(row.family_ref),
      lattice_row: rowForFamily(row.family_ref),
      notes: row.notes,
      rail_label: row.rail_label,
      semantic_role: row.semantic_role,
      tone: toneForFamily(row.family_ref),
    };
  });

  return {
    axes: {
      horizontal: [
        "Identity anchor",
        "Lineage and integrity",
        "Experience selection",
        "Delivery and route continuity",
      ],
      vertical: [
        "Durable / cross-boundary safe",
        "Durable / contract-scoped",
        "Derived or session-scoped",
        "Internal-only or invocation-only",
      ],
    },
    basisStatement: contracts.referenceKeyGrammar.basis_statement,
    families,
    generationBasis: {
      emittedAtBasis: "REFERENCE_GRAMMAR_ATLAS_V1",
      inputHashes,
    },
    grammarBadge: contracts.referenceKeyGrammar.grammar_badge,
    routeId: "reference-grammar-atlas",
    selectedFamilyRef: "DELIVERY_BINDING",
    subtitle: "Identity, location, and delivery are not synonyms",
    title: "Taxat Reference Grammar Atlas",
    transitionRules: families.flatMap((family) =>
      family.invalid_substitutions.map((rule) => ({
        accessible_label: rule.accessible_label,
        from_family_ref: family.family_ref,
        statement: rule.statement,
        target_family_ref: rule.target_family_ref,
      })),
    ),
  } satisfies AtlasPayload;
}

async function main() {
  const shouldEmit = process.argv.includes("--emit");
  const shouldCheck = process.argv.includes("--check");

  if (shouldEmit === shouldCheck) {
    throw new Error("Pass exactly one of --emit or --check.");
  }

  const payload = await createAtlasPayload();
  const next = `${JSON.stringify(payload, null, 2)}\n`;

  if (shouldCheck) {
    const current = await readFile(atlasDataPath, "utf8");
    invariant(current === next, "reference grammar atlas payload drifted; run --emit");
    process.stdout.write("verified reference grammar atlas\n");
    return;
  }

  await mkdir(path.dirname(atlasDataPath), { recursive: true });
  await writeFile(atlasDataPath, next, "utf8");
  process.stdout.write(`emitted ${path.relative(repoRoot, atlasDataPath)}\n`);
}

await main();

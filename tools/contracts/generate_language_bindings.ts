import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  contractImportBundle,
  schemaCatalog,
  type LogicalFamilyRef,
  type SchemaCatalogEntry,
} from "../../packages/contracts-core/src/schemaCatalog.ts";

type SyncMode = "emit" | "check";
type LanguageRef = "TYPESCRIPT" | "PYTHON" | "SWIFT" | "GAP_REGISTRY";

type BindingMatrix = {
  matrixVersion: string;
  packageOverrides: Record<string, string>;
  languages: Record<
    Exclude<LanguageRef, "GAP_REGISTRY">,
    {
      toolId: string;
      outputRoot: string;
      namingPolicyRef: string;
      decimalPolicyRef: string;
      nullabilityPolicy: string;
      coverageClass: string;
    }
  >;
  families: Array<{
    familyRef: LogicalFamilyRef;
    expectedSchemaCount: number;
    targets: Record<
      Exclude<LanguageRef, "GAP_REGISTRY">,
      {
        enabled: boolean;
        reason?: string;
        consumingSurfaceRefs?: string[];
      }
    >;
  }>;
};

type NamingPolicy = {
  policyVersion: string;
  generatedFileBanner: string;
  exactDecimalPolicy: {
    detection: string[];
    typescriptAlias: string;
    pythonAlias: string;
    swiftAlias: string;
    posture: string;
  };
  dateTimePolicy: {
    format: string;
    typescriptAlias: string;
    pythonAlias: string;
    swiftAlias: string;
    posture: string;
  };
  enumPolicy: Record<string, string>;
  nullabilityPolicy: Record<string, string>;
  manualAdapterPolicy: Record<string, string>;
};

type CoverageClass =
  | "FULL_FAMILY_GAP_BEARING_STRUCTURAL_BINDING"
  | "SELECTED_NATIVE_SUBSET_GAP_BEARING_BINDING"
  | "NOT_TARGETED"
  | "GAP_REGISTRY";

type GapEntry = {
  gapId: string;
  languageRef: LanguageRef;
  familyRef: LogicalFamilyRef;
  gapCode: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
  summary: string;
  affectedSchemaNames: string[];
  requiredFollowOn: string;
};

type FamilyCoverage = {
  familyRef: LogicalFamilyRef;
  familyLabel: string;
  schemaCount: number;
  generatedSchemaCount: number;
  sourceHashAggregate: string;
  lastGenerationTimeUtc: string;
  outputRef: string;
  toolId: string;
  coverageClass: CoverageClass;
  namingPolicyRef: string;
  decimalPolicyRef: string;
  nullabilityPolicy: string;
  consumingSurfaceRefs: string[];
  gapIds: string[];
};

type BindingCoverageReport = {
  reportVersion: string;
  packageOverride: string;
  importStrategy: string;
  generationBasis: {
    sourceMapHash: string;
    sourceMapGeneratedAtUtc: string;
    matrixVersion: string;
    namingPolicyVersion: string;
  };
  languages: Array<{
    languageRef: LanguageRef;
    label: string;
    summary: string;
    families: FamilyCoverage[];
  }>;
};

type BindingGapRegister = {
  registerVersion: string;
  generationBasisSourceMapHash: string;
  entries: GapEntry[];
};

type AtlasPayload = {
  routeId: string;
  title: string;
  bundleBadge: string;
  generationPosture: string;
  summary: string;
  lineageStrip: string[];
  languages: Array<{
    language_ref: LanguageRef;
    label: string;
    summary: string;
    entries: Array<{
      entry_ref: string;
      familyRef: string;
      label: string;
      outputRef: string;
      toolId: string;
      coverageClass: CoverageClass | string;
      sourceHashAggregate: string;
      decimalPolicyRef: string;
      nullabilityPolicy: string;
      gapIds: string[];
      consumingSurfaceRefs: string[];
      affectedSchemaNames: string[];
      summary: string;
    }>;
  }>;
  selectedLanguageRef: LanguageRef;
  selectedEntryRef: string;
};

type SchemaNode = Record<string, unknown>;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");

const matrixPath = path.join(repoRoot, "config/contracts/binding_generation_matrix.json");
const policyPath = path.join(repoRoot, "config/contracts/binding_naming_and_decimal_policy.json");
const importSourceMapPath = path.join(
  repoRoot,
  "packages/contracts-core/data/schema_source_map.json",
);
const generatedTypesRoot = path.join(
  repoRoot,
  "packages/generated-models/src/generated/typescript",
);
const pythonGeneratedRoot = path.join(
  repoRoot,
  "python/generated_contract_models/src/taxat_generated_contract_models/generated",
);
const pythonGeneratedPackageRoot = path.join(repoRoot, "python/generated_contract_models");
const swiftGeneratedRoot = path.join(
  repoRoot,
  "native/TaxatOperator/GeneratedContracts/Sources/GeneratedContracts/Generated",
);
const dataContractsRoot = path.join(repoRoot, "data/contracts");
const bindingCoverageReportPath = path.join(dataContractsRoot, "binding_coverage_report.json");
const bindingGapRegisterPath = path.join(dataContractsRoot, "binding_gap_register.json");
const atlasDataPath = path.join(
  repoRoot,
  "apps/operator-web/public/internal/binding-coverage-atlas/data/binding-coverage-atlas.json",
);

const EXACT_DECIMAL_PATTERN = "^-?(0|[1-9]\\d*)(\\.\\d+)?$";
const SWIFT_RESERVED_WORDS = new Set([
  "associatedtype",
  "class",
  "deinit",
  "enum",
  "extension",
  "fileprivate",
  "func",
  "import",
  "init",
  "inout",
  "internal",
  "let",
  "open",
  "operator",
  "private",
  "protocol",
  "public",
  "rethrows",
  "static",
  "struct",
  "subscript",
  "typealias",
  "var",
  "break",
  "case",
  "continue",
  "default",
  "defer",
  "do",
  "else",
  "fallthrough",
  "for",
  "guard",
  "if",
  "in",
  "repeat",
  "return",
  "switch",
  "where",
  "while",
  "as",
  "Any",
  "catch",
  "false",
  "is",
  "nil",
  "super",
  "self",
  "Self",
  "throw",
  "throws",
  "true",
  "try",
]);

const languageLabels: Record<LanguageRef, string> = {
  TYPESCRIPT: "TYPESCRIPT",
  PYTHON: "PYTHON",
  SWIFT: "SWIFT",
  GAP_REGISTRY: "GAP_REGISTRY",
};

const languageSummaries: Record<LanguageRef, string> = {
  TYPESCRIPT:
    "Product and runtime packages consume structural TypeScript bindings for every schema family while keeping runtime validation canonical in contracts-core.",
  PYTHON:
    "Validator-adjacent tooling consumes generated TypedDict and alias models across the whole corpus without replacing the authoritative imported validator scripts.",
  SWIFT:
    "Native bindings cover the selected macOS-relevant schema subset and fall back to typed gap entries when Codable models would pretend to be more faithful than they are.",
  GAP_REGISTRY:
    "The gap ledger records every language or family posture the generator cannot represent faithfully, including non-targeted native families and union-heavy Swift fallbacks.",
};

const familyLabels = new Map<LogicalFamilyRef, string>();
for (const entry of schemaCatalog) {
  if (!familyLabels.has(entry.logicalFamilyRef)) {
    familyLabels.set(entry.logicalFamilyRef, entry.logicalFamilyLabel);
  }
}

const schemaEntriesByName = new Map(schemaCatalog.map((entry) => [entry.schemaName, entry]));

function sha256(value: Buffer | string) {
  return createHash("sha256").update(value).digest("hex");
}

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
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

async function ensureParentDir(filePath: string) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

function posixRelative(from: string, to: string) {
  return path.relative(from, to).split(path.sep).join(path.posix.sep);
}

function kebabCase(value: string) {
  return value.toLowerCase().replace(/_/g, "-");
}

function snakeCase(value: string) {
  return value.toLowerCase();
}

function pascalCase(value: string) {
  return value
    .replace(/\.schema\.json$/, "")
    .replace(/\.json$/, "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment[0]!.toUpperCase() + segment.slice(1))
    .join("");
}

function sanitizeTypeName(value: string) {
  const candidate = pascalCase(value);
  return /^[A-Za-z_]/.test(candidate) ? candidate : `Model${candidate}`;
}

function safeSwiftIdentifier(name: string) {
  if (SWIFT_RESERVED_WORDS.has(name)) {
    return `\`${name}\``;
  }
  return name;
}

function literal(value: unknown) {
  return JSON.stringify(value);
}

function pythonLiteral(value: unknown) {
  if (value === null) {
    return "None";
  }
  if (value === true) {
    return "True";
  }
  if (value === false) {
    return "False";
  }
  return JSON.stringify(value);
}

function indentLines(value: string, spaces: number) {
  const prefix = " ".repeat(spaces);
  return value
    .split("\n")
    .map((line) => (line.length ? `${prefix}${line}` : line))
    .join("\n");
}

function isRecord(value: unknown): value is SchemaNode {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function schemaTitleToTypeName(schemaEntry: SchemaCatalogEntry, schema: SchemaNode) {
  const title =
    typeof schema.title === "string" && schema.title.length > 0
      ? schema.title
      : schemaEntry.schemaStem;
  return sanitizeTypeName(title);
}

function localDefTypeName(rootTypeName: string, defName: string) {
  return `${rootTypeName}${sanitizeTypeName(defName)}`;
}

function externalRefToSchemaName(ref: string) {
  if (ref.startsWith("https://taxat.dev/schemas/")) {
    return ref.slice("https://taxat.dev/schemas/".length).split("#")[0]!;
  }
  if (ref.startsWith("./")) {
    return ref.slice(2).split("#")[0]!;
  }
  if (ref.endsWith(".schema.json")) {
    return ref.split("#")[0]!;
  }
  return null;
}

function hasConditionalKeywords(node: unknown): boolean {
  if (Array.isArray(node)) {
    return node.some((entry) => hasConditionalKeywords(entry));
  }
  if (!isRecord(node)) {
    return false;
  }
  if ("if" in node || "then" in node || "else" in node || "dependentSchemas" in node) {
    return true;
  }
  return Object.values(node).some((entry) => hasConditionalKeywords(entry));
}

function collectFeatureFlags(node: unknown, flags = new Set<string>()) {
  if (Array.isArray(node)) {
    node.forEach((entry) => collectFeatureFlags(entry, flags));
    return flags;
  }
  if (!isRecord(node)) {
    return flags;
  }
  [
    "allOf",
    "anyOf",
    "oneOf",
    "if",
    "then",
    "else",
    "additionalProperties",
    "const",
    "enum",
  ].forEach((key) => {
    if (key in node) {
      flags.add(key);
    }
  });
  Object.values(node).forEach((entry) => collectFeatureFlags(entry, flags));
  return flags;
}

function isExactDecimalNode(node: SchemaNode): boolean {
  const ref = typeof node.$ref === "string" ? node.$ref : null;
  if (ref && ref.includes("exactDecimalString")) {
    return true;
  }
  if (node.pattern === EXACT_DECIMAL_PATTERN) {
    return true;
  }
  return false;
}

function isDateTimeNode(node: SchemaNode): boolean {
  return node.format === "date-time";
}

function isObjectLike(node: SchemaNode) {
  return (
    node.type === "object" || isRecord(node.properties) || node.additionalProperties !== undefined
  );
}

function isStringEnumNode(node: SchemaNode) {
  return Array.isArray(node.enum) && node.enum.every((value) => typeof value === "string");
}

function isLeafTopLevel(node: SchemaNode) {
  return (
    !isObjectLike(node) &&
    !Array.isArray(node.anyOf) &&
    !Array.isArray(node.oneOf) &&
    !Array.isArray(node.allOf)
  );
}

function mergeRenderableAllOfBranches(node: SchemaNode) {
  const branches = Array.isArray(node.allOf) ? node.allOf.filter(isRecord) : [];
  const renderable = branches.filter((branch) => !hasConditionalKeywords(branch));
  const conditional = branches.length !== renderable.length;
  return { renderable, conditional };
}

function familyModuleName(familyRef: LogicalFamilyRef) {
  return kebabCase(familyRef);
}

function pythonFamilyModuleName(familyRef: LogicalFamilyRef) {
  return snakeCase(familyRef);
}

function swiftFamilyModuleName(familyRef: LogicalFamilyRef) {
  return sanitizeTypeName(familyRef.toLowerCase());
}

type RenderContext = {
  languageRef: Exclude<LanguageRef, "GAP_REGISTRY">;
  schemaEntry: SchemaCatalogEntry;
  schema: SchemaNode;
  rootTypeName: string;
  localDefNames: Record<string, string>;
  swiftGeneratedSchemaNames: Set<string>;
  swiftTargetFamilies: Set<LogicalFamilyRef>;
  gapCollector: GapCollector;
};

class GapCollector {
  private readonly entries = new Map<string, GapEntry>();

  add(entry: GapEntry) {
    const existing = this.entries.get(entry.gapId);
    if (!existing) {
      this.entries.set(entry.gapId, {
        ...entry,
        affectedSchemaNames: [...entry.affectedSchemaNames].sort(),
      });
      return;
    }
    const mergedSchemas = new Set([...existing.affectedSchemaNames, ...entry.affectedSchemaNames]);
    this.entries.set(entry.gapId, {
      ...existing,
      summary: entry.summary,
      requiredFollowOn: entry.requiredFollowOn,
      affectedSchemaNames: [...mergedSchemas].sort(),
    });
  }

  list() {
    return [...this.entries.values()].sort((left, right) => left.gapId.localeCompare(right.gapId));
  }
}

function addGap(
  gapCollector: GapCollector,
  languageRef: LanguageRef,
  familyRef: LogicalFamilyRef,
  gapCode: string,
  risk: GapEntry["risk"],
  summary: string,
  schemaNames: string[],
  requiredFollowOn: string,
) {
  gapCollector.add({
    gapId: `${languageRef}:${familyRef}:${gapCode}`,
    languageRef,
    familyRef,
    gapCode,
    risk,
    summary,
    affectedSchemaNames: schemaNames,
    requiredFollowOn,
  });
}

function resolveRefName(ref: string, context: RenderContext) {
  if (ref.includes("exactDecimalString")) {
    return context.languageRef === "TYPESCRIPT"
      ? "ExactDecimalString"
      : context.languageRef === "PYTHON"
        ? "ExactDecimalString"
        : "ExactDecimalString";
  }
  if (ref.startsWith("#/$defs/")) {
    const defName = ref.slice("#/$defs/".length);
    return context.localDefNames[defName] ?? `${context.rootTypeName}${sanitizeTypeName(defName)}`;
  }

  const schemaName = externalRefToSchemaName(ref);
  if (!schemaName) {
    return context.languageRef === "SWIFT"
      ? "JSONValue"
      : context.languageRef === "PYTHON"
        ? "JSONValue"
        : "JsonValue";
  }
  const schemaEntry = schemaEntriesByName.get(schemaName);
  if (!schemaEntry) {
    return context.languageRef === "SWIFT"
      ? "JSONValue"
      : context.languageRef === "PYTHON"
        ? "JSONValue"
        : "JsonValue";
  }
  if (
    context.languageRef === "SWIFT" &&
    (!context.swiftGeneratedSchemaNames.has(schemaName) ||
      !context.swiftTargetFamilies.has(schemaEntry.logicalFamilyRef))
  ) {
    addGap(
      context.gapCollector,
      "SWIFT",
      context.schemaEntry.logicalFamilyRef,
      "SWIFT_EXTERNAL_REF_FALLBACK",
      "MEDIUM",
      "Swift bindings fall back to JSONValue when a selected native schema references a schema outside the generated native subset.",
      [context.schemaEntry.schemaName, schemaName],
      "Promote the referenced family into the Swift subset or add a manual native adapter outside GeneratedContracts.",
    );
    return "JSONValue";
  }
  const sourceSchema = schemaContentsByName.get(schemaName);
  return sanitizeTypeName(
    typeof sourceSchema?.title === "string" && sourceSchema.title.length > 0
      ? sourceSchema.title
      : schemaEntry.schemaStem,
  );
}

const schemaContentsByName = new Map<string, SchemaNode>();

function renderTsType(node: SchemaNode, context: RenderContext, depth = 0): string {
  if (typeof node.$ref === "string") {
    return resolveRefName(node.$ref, context);
  }
  if (isExactDecimalNode(node)) {
    return "ExactDecimalString";
  }
  if (isDateTimeNode(node)) {
    return "ISO8601DateTimeString";
  }
  if (node.const !== undefined) {
    return literal(node.const);
  }
  if (Array.isArray(node.enum) && node.enum.length > 0) {
    return node.enum.map((value) => literal(value)).join(" | ");
  }
  if (Array.isArray(node.oneOf) && node.oneOf.length > 0) {
    return node.oneOf
      .map((branch) => renderTsType(branch as SchemaNode, context, depth))
      .join(" | ");
  }
  if (Array.isArray(node.anyOf) && node.anyOf.length > 0) {
    return node.anyOf
      .map((branch) => renderTsType(branch as SchemaNode, context, depth))
      .join(" | ");
  }
  if (Array.isArray(node.allOf) && node.allOf.length > 0) {
    const { renderable, conditional } = mergeRenderableAllOfBranches(node);
    if (conditional) {
      addGap(
        context.gapCollector,
        "TYPESCRIPT",
        context.schemaEntry.logicalFamilyRef,
        "CONDITIONAL_CONSTRAINTS_RUNTIME_ONLY",
        "LOW",
        "TypeScript bindings preserve structural shape but cannot encode every conditional allOf or if/then constraint; runtime schema validation remains canonical.",
        [context.schemaEntry.schemaName],
        "Keep schema validation in contracts-core authoritative and add manual helper wrappers outside generated files only when a consuming surface needs stronger narrowing.",
      );
    }
    const rendered = renderable
      .map((branch) => renderTsType(branch, context, depth))
      .filter(Boolean);
    if (rendered.length > 0) {
      return rendered.join(" & ");
    }
  }
  if (Array.isArray(node.type)) {
    return node.type
      .map((value) => renderTsType({ ...node, type: value }, context, depth))
      .filter((value, index, values) => value && values.indexOf(value) === index)
      .join(" | ");
  }
  if (node.type === "array" || node.items) {
    const itemType = isRecord(node.items)
      ? renderTsType(node.items, context, depth + 1)
      : "JsonValue";
    return `Array<${itemType}>`;
  }
  if (isObjectLike(node)) {
    const properties = isRecord(node.properties) ? node.properties : {};
    const required = new Set(
      Array.isArray(node.required)
        ? node.required.filter((value): value is string => typeof value === "string")
        : [],
    );
    const lines = Object.entries(properties).map(([propertyName, propertySchema]) => {
      const propertyType = renderTsType(propertySchema as SchemaNode, context, depth + 1);
      const optionalMarker = required.has(propertyName) ? "" : "?";
      return `${"  ".repeat(depth + 1)}${literal(propertyName)}${optionalMarker}: ${propertyType};`;
    });

    if (node.additionalProperties === true) {
      lines.push(`${"  ".repeat(depth + 1)}[key: string]: JsonValue;`);
    } else if (isRecord(node.additionalProperties)) {
      lines.push(
        `${"  ".repeat(depth + 1)}[key: string]: ${renderTsType(node.additionalProperties, context, depth + 1)};`,
      );
    }

    if (lines.length === 0) {
      return "{ [key: string]: never }";
    }

    return `{\n${lines.join("\n")}\n${"  ".repeat(depth)}}`;
  }
  if (node.type === "string") {
    return "string";
  }
  if (node.type === "integer" || node.type === "number") {
    return "number";
  }
  if (node.type === "boolean") {
    return "boolean";
  }
  if (node.type === "null") {
    return "null";
  }
  addGap(
    context.gapCollector,
    "TYPESCRIPT",
    context.schemaEntry.logicalFamilyRef,
    "UNKNOWN_NODE_FALLBACK",
    "LOW",
    "TypeScript generation fell back to JsonValue for a schema fragment that did not map cleanly to the structural generator.",
    [context.schemaEntry.schemaName],
    "Inspect the schema fragment and add a manual adapter outside generated files if a consumer needs a narrower compile-time shape.",
  );
  return "JsonValue";
}

function renderPythonType(node: SchemaNode, context: RenderContext): string {
  if (typeof node.$ref === "string") {
    return resolveRefName(node.$ref, context);
  }
  if (isExactDecimalNode(node)) {
    return "ExactDecimalString";
  }
  if (isDateTimeNode(node)) {
    return "ISO8601DateTimeString";
  }
  if (node.const !== undefined) {
    return `Literal[${pythonLiteral(node.const)}]`;
  }
  if (Array.isArray(node.enum) && node.enum.length > 0) {
    return `Literal[${node.enum.map((value) => pythonLiteral(value)).join(", ")}]`;
  }
  if (Array.isArray(node.oneOf) && node.oneOf.length > 0) {
    return node.oneOf.map((branch) => renderPythonType(branch as SchemaNode, context)).join(" | ");
  }
  if (Array.isArray(node.anyOf) && node.anyOf.length > 0) {
    return node.anyOf.map((branch) => renderPythonType(branch as SchemaNode, context)).join(" | ");
  }
  if (Array.isArray(node.allOf) && node.allOf.length > 0) {
    const { renderable, conditional } = mergeRenderableAllOfBranches(node);
    if (conditional) {
      addGap(
        context.gapCollector,
        "PYTHON",
        context.schemaEntry.logicalFamilyRef,
        "CONDITIONAL_CONSTRAINTS_RUNTIME_ONLY",
        "LOW",
        "Python bindings preserve structural shape but cannot encode every conditional allOf or if/then constraint; runtime schema validation remains canonical.",
        [context.schemaEntry.schemaName],
        "Keep validator logic authoritative in contracts-core and add manual tooling wrappers outside generated files only when needed.",
      );
    }
    const refBranch = renderable.find((branch) => typeof branch.$ref === "string");
    if (refBranch && typeof refBranch.$ref === "string") {
      return resolveRefName(refBranch.$ref, context);
    }
    return "JSONValue";
  }
  if (Array.isArray(node.type)) {
    return node.type
      .map((value) => renderPythonType({ ...node, type: value }, context))
      .filter((value, index, values) => value && values.indexOf(value) === index)
      .join(" | ");
  }
  if (node.type === "array" || node.items) {
    const itemType = isRecord(node.items) ? renderPythonType(node.items, context) : "JSONValue";
    return `list[${itemType}]`;
  }
  if (isObjectLike(node)) {
    if (isRecord(node.additionalProperties)) {
      return `dict[str, ${renderPythonType(node.additionalProperties, context)}]`;
    }
    return "dict[str, JSONValue]";
  }
  if (node.type === "string") {
    return "str";
  }
  if (node.type === "integer") {
    return "int";
  }
  if (node.type === "number") {
    return "float";
  }
  if (node.type === "boolean") {
    return "bool";
  }
  if (node.type === "null") {
    return "None";
  }
  addGap(
    context.gapCollector,
    "PYTHON",
    context.schemaEntry.logicalFamilyRef,
    "UNKNOWN_NODE_FALLBACK",
    "LOW",
    "Python generation fell back to JSONValue for a schema fragment that did not map cleanly to the structural generator.",
    [context.schemaEntry.schemaName],
    "Inspect the schema fragment and add a manual adapter outside generated files if a consumer needs a narrower tooling model.",
  );
  return "JSONValue";
}

function renderSwiftType(node: SchemaNode, context: RenderContext): string {
  if (typeof node.$ref === "string") {
    return resolveRefName(node.$ref, context);
  }
  if (isExactDecimalNode(node)) {
    return "ExactDecimalString";
  }
  if (isDateTimeNode(node)) {
    return "ISO8601DateTimeString";
  }
  if (node.const !== undefined) {
    addGap(
      context.gapCollector,
      "SWIFT",
      context.schemaEntry.logicalFamilyRef,
      "SWIFT_CONST_LITERAL_FALLBACK",
      "LOW",
      "Swift bindings keep const-constrained values as structural primitive properties while runtime validation remains canonical.",
      [context.schemaEntry.schemaName],
      "Add a manual native wrapper outside GeneratedContracts when a consuming surface needs a stronger semantic wrapper than String, Int, or Bool.",
    );
  }
  if (Array.isArray(node.enum) && node.enum.length > 0) {
    if (node.enum.every((value) => typeof value === "string")) {
      return "String";
    }
    return "JSONValue";
  }
  if (
    (Array.isArray(node.oneOf) && node.oneOf.length > 0) ||
    (Array.isArray(node.anyOf) && node.anyOf.length > 0)
  ) {
    addGap(
      context.gapCollector,
      "SWIFT",
      context.schemaEntry.logicalFamilyRef,
      "SWIFT_UNION_JSONVALUE_FALLBACK",
      "MEDIUM",
      "Swift bindings fall back to JSONValue for oneOf or anyOf fragments because the selected native subset does not pretend to encode every union as a faithful Codable sum type.",
      [context.schemaEntry.schemaName],
      "Promote the affected schema into a manual native adapter if the macOS client needs richer ergonomic access than JSONValue.",
    );
    return "JSONValue";
  }
  if (Array.isArray(node.allOf) && node.allOf.length > 0) {
    const { renderable, conditional } = mergeRenderableAllOfBranches(node);
    if (conditional) {
      addGap(
        context.gapCollector,
        "SWIFT",
        context.schemaEntry.logicalFamilyRef,
        "SWIFT_CONDITIONAL_RUNTIME_ONLY",
        "MEDIUM",
        "Swift bindings keep conditional schema constraints as runtime-only rules; GeneratedContracts does not attempt to encode every if/then or allOf condition in Codable types.",
        [context.schemaEntry.schemaName],
        "Rely on contracts-core validation and add a native adapter if a specific macOS flow requires stronger local guarantees.",
      );
    }
    const refBranch = renderable.find((branch) => typeof branch.$ref === "string");
    if (refBranch && typeof refBranch.$ref === "string") {
      return resolveRefName(refBranch.$ref, context);
    }
    if (renderable.some((branch) => isObjectLike(branch))) {
      return "[String: JSONValue]";
    }
    return "JSONValue";
  }
  if (Array.isArray(node.type)) {
    const nullable = node.type.includes("null");
    const primary = node.type.find((value) => value !== "null");
    const rendered = primary ? renderSwiftType({ ...node, type: primary }, context) : "JSONValue";
    return nullable ? `${rendered}?` : rendered;
  }
  if (node.type === "array" || node.items) {
    const itemType = isRecord(node.items) ? renderSwiftType(node.items, context) : "JSONValue";
    return `[${itemType}]`;
  }
  if (isObjectLike(node)) {
    if (isRecord(node.additionalProperties)) {
      return `[String: ${renderSwiftType(node.additionalProperties, context)}]`;
    }
    return "[String: JSONValue]";
  }
  if (node.type === "string") {
    return "String";
  }
  if (node.type === "integer") {
    return "Int";
  }
  if (node.type === "number") {
    return "Double";
  }
  if (node.type === "boolean") {
    return "Bool";
  }
  if (node.type === "null") {
    return "JSONValue?";
  }
  addGap(
    context.gapCollector,
    "SWIFT",
    context.schemaEntry.logicalFamilyRef,
    "SWIFT_UNKNOWN_JSONVALUE_FALLBACK",
    "MEDIUM",
    "Swift generation fell back to JSONValue for a schema fragment that did not map cleanly to the selected Codable subset.",
    [context.schemaEntry.schemaName],
    "Add a manual native adapter outside GeneratedContracts if the macOS client needs a richer structural model for this fragment.",
  );
  return "JSONValue";
}

function renderTsModule(
  familyRef: LogicalFamilyRef,
  familySchemas: Array<{ entry: SchemaCatalogEntry; schema: SchemaNode }>,
  gapCollector: GapCollector,
  swiftGeneratedSchemaNames: Set<string>,
  swiftTargetFamilies: Set<LogicalFamilyRef>,
  banner: string,
) {
  const sections: string[] = [
    `/* ${banner} */`,
    `import type { ExactDecimalString, ISO8601DateTimeString, JsonValue } from "./primitives";`,
    "",
  ];

  for (const { entry, schema } of familySchemas) {
    const rootTypeName = schemaTitleToTypeName(entry, schema);
    const localDefNames = Object.fromEntries(
      Object.keys(isRecord(schema.$defs) ? schema.$defs : {}).map((defName) => [
        defName,
        localDefTypeName(rootTypeName, defName),
      ]),
    );
    const context: RenderContext = {
      languageRef: "TYPESCRIPT",
      schemaEntry: entry,
      schema,
      rootTypeName,
      localDefNames,
      swiftGeneratedSchemaNames,
      swiftTargetFamilies,
      gapCollector,
    };

    sections.push(
      `export type ${rootTypeName} = ${renderTsType(schema, context)};`,
      `export const ${rootTypeName}SchemaLineage = { schemaId: ${literal(entry.schemaId)}, sourceHash: ${literal(entry.sourceHash)} } as const;`,
      "",
    );

    if (isRecord(schema.$defs)) {
      for (const [defName, defSchema] of Object.entries(schema.$defs)) {
        sections.push(
          `export type ${localDefNames[defName]} = ${renderTsType(defSchema as SchemaNode, context)};`,
          "",
        );
      }
    }
  }

  sections.push(
    `export const ${sanitizeTypeName(familyRef.toLowerCase())}BindingManifest = { familyRef: ${literal(familyRef)}, schemaCount: ${familySchemas.length} } as const;`,
    "",
  );
  return sections.join("\n");
}

function renderPythonModule(
  familyRef: LogicalFamilyRef,
  familySchemas: Array<{ entry: SchemaCatalogEntry; schema: SchemaNode }>,
  gapCollector: GapCollector,
  swiftGeneratedSchemaNames: Set<string>,
  swiftTargetFamilies: Set<LogicalFamilyRef>,
  banner: string,
) {
  const sections: string[] = [
    `"""${banner}"""`,
    "from __future__ import annotations",
    "",
    "from typing import Literal, NotRequired, Required, TypedDict",
    "",
    "from .primitives import ExactDecimalString, ISO8601DateTimeString, JSONValue",
    "",
  ];

  for (const { entry, schema } of familySchemas) {
    const rootTypeName = schemaTitleToTypeName(entry, schema);
    const localDefNames = Object.fromEntries(
      Object.keys(isRecord(schema.$defs) ? schema.$defs : {}).map((defName) => [
        defName,
        localDefTypeName(rootTypeName, defName),
      ]),
    );
    const context: RenderContext = {
      languageRef: "PYTHON",
      schemaEntry: entry,
      schema,
      rootTypeName,
      localDefNames,
      swiftGeneratedSchemaNames,
      swiftTargetFamilies,
      gapCollector,
    };

    const objectDefinitions: Array<[string, SchemaNode]> = [];
    if (isObjectLike(schema)) {
      objectDefinitions.push([rootTypeName, schema]);
    } else {
      sections.push(`type ${rootTypeName} = ${renderPythonType(schema, context)}`, "");
    }
    if (isRecord(schema.$defs)) {
      for (const [defName, defSchema] of Object.entries(schema.$defs)) {
        if (isObjectLike(defSchema as SchemaNode)) {
          objectDefinitions.push([localDefNames[defName], defSchema as SchemaNode]);
        } else {
          sections.push(
            `type ${localDefNames[defName]} = ${renderPythonType(defSchema as SchemaNode, context)}`,
            "",
          );
        }
      }
    }

    for (const [typeName, objectSchema] of objectDefinitions) {
      const properties = isRecord(objectSchema.properties) ? objectSchema.properties : {};
      const required = new Set(
        Array.isArray(objectSchema.required)
          ? objectSchema.required.filter((value): value is string => typeof value === "string")
          : [],
      );
      sections.push(`class ${typeName}(TypedDict, total=False):`);
      if (Object.keys(properties).length === 0) {
        sections.push("    pass", "");
        continue;
      }
      for (const [propertyName, propertySchema] of Object.entries(properties)) {
        const wrapper = required.has(propertyName) ? "Required" : "NotRequired";
        sections.push(
          `    ${propertyName}: ${wrapper}[${renderPythonType(propertySchema as SchemaNode, context)}]`,
        );
      }
      sections.push("");
    }

    sections.push(
      `${rootTypeName}SchemaLineage = {`,
      `    "schema_id": ${literal(entry.schemaId)},`,
      `    "source_hash": ${literal(entry.sourceHash)},`,
      "}",
      "",
    );
  }

  sections.push(
    `${sanitizeTypeName(familyRef.toLowerCase())}BindingManifest = {"family_ref": ${literal(familyRef)}, "schema_count": ${familySchemas.length}}`,
    "",
  );
  return sections.join("\n");
}

function renderSwiftStruct(name: string, schema: SchemaNode, context: RenderContext) {
  const properties = isRecord(schema.properties) ? schema.properties : {};
  const required = new Set(
    Array.isArray(schema.required)
      ? schema.required.filter((value): value is string => typeof value === "string")
      : [],
  );

  const lines = [`public struct ${name}: Codable, Sendable {`];
  if (Object.keys(properties).length === 0) {
    lines.push("  public init() {}", "}");
    return lines.join("\n");
  }

  for (const [propertyName, propertySchema] of Object.entries(properties)) {
    const renderedType = renderSwiftType(propertySchema as SchemaNode, context);
    const optionalType = required.has(propertyName)
      ? renderedType
      : renderedType.endsWith("?")
        ? renderedType
        : `${renderedType}?`;
    lines.push(`  public let ${safeSwiftIdentifier(propertyName)}: ${optionalType}`);
  }

  const parameters = Object.entries(properties).map(([propertyName, propertySchema]) => {
    const renderedType = renderSwiftType(propertySchema as SchemaNode, context);
    const optionalType = required.has(propertyName)
      ? renderedType
      : renderedType.endsWith("?")
        ? renderedType
        : `${renderedType}?`;
    const defaultValue = required.has(propertyName) ? "" : " = nil";
    return `    ${safeSwiftIdentifier(propertyName)}: ${optionalType}${defaultValue}`;
  });
  lines.push("", "  public init(", parameters.join(",\n"), "  ) {");
  for (const [propertyName] of Object.entries(properties)) {
    lines.push(
      `    self.${safeSwiftIdentifier(propertyName)} = ${safeSwiftIdentifier(propertyName)}`,
    );
  }
  lines.push("  }", "}");
  return lines.join("\n");
}

function renderSwiftModule(
  familyRef: LogicalFamilyRef,
  familySchemas: Array<{ entry: SchemaCatalogEntry; schema: SchemaNode }>,
  gapCollector: GapCollector,
  swiftGeneratedSchemaNames: Set<string>,
  swiftTargetFamilies: Set<LogicalFamilyRef>,
  banner: string,
) {
  const sections: string[] = [`// ${banner}`, "import Foundation", ""];

  for (const { entry, schema } of familySchemas) {
    const rootTypeName = schemaTitleToTypeName(entry, schema);
    const localDefNames = Object.fromEntries(
      Object.keys(isRecord(schema.$defs) ? schema.$defs : {}).map((defName) => [
        defName,
        localDefTypeName(rootTypeName, defName),
      ]),
    );
    const context: RenderContext = {
      languageRef: "SWIFT",
      schemaEntry: entry,
      schema,
      rootTypeName,
      localDefNames,
      swiftGeneratedSchemaNames,
      swiftTargetFamilies,
      gapCollector,
    };

    if (isObjectLike(schema)) {
      sections.push(renderSwiftStruct(rootTypeName, schema, context), "");
    } else if (isStringEnumNode(schema)) {
      sections.push(`public enum ${rootTypeName}: String, Codable, Sendable {`);
      for (const value of schema.enum as string[]) {
        sections.push(
          `  case ${pascalCase(value).replace(/^[A-Z]/, (c) => c.toLowerCase())} = ${literal(value)}`,
        );
      }
      sections.push("}", "");
    } else {
      sections.push(`public typealias ${rootTypeName} = ${renderSwiftType(schema, context)}`, "");
    }

    if (isRecord(schema.$defs)) {
      for (const [defName, defSchema] of Object.entries(schema.$defs)) {
        const defTypeName = localDefNames[defName];
        if (isObjectLike(defSchema as SchemaNode)) {
          sections.push(renderSwiftStruct(defTypeName, defSchema as SchemaNode, context), "");
        } else if (isStringEnumNode(defSchema as SchemaNode)) {
          sections.push(`public enum ${defTypeName}: String, Codable, Sendable {`);
          for (const value of (defSchema as SchemaNode).enum as string[]) {
            sections.push(
              `  case ${pascalCase(value).replace(/^[A-Z]/, (c) => c.toLowerCase())} = ${literal(value)}`,
            );
          }
          sections.push("}", "");
        } else {
          sections.push(
            `public typealias ${defTypeName} = ${renderSwiftType(defSchema as SchemaNode, context)}`,
            "",
          );
        }
      }
    }

    sections.push(
      `public enum ${rootTypeName}SchemaLineage {`,
      `  public static let schemaId = ${literal(entry.schemaId)}`,
      `  public static let sourceHash = ${literal(entry.sourceHash)}`,
      "}",
      "",
    );
  }

  sections.push(
    `public enum ${sanitizeTypeName(familyRef.toLowerCase())}BindingManifest {`,
    `  public static let familyRef = ${literal(familyRef)}`,
    `  public static let schemaCount = ${familySchemas.length}`,
    "}",
    "",
  );
  return sections.join("\n");
}

function renderTsPrimitives(policy: NamingPolicy) {
  return `/* ${policy.generatedFileBanner} */\nexport type ExactDecimalString = string;\nexport type ISO8601DateTimeString = string;\nexport type JsonValue =\n  | string\n  | number\n  | boolean\n  | null\n  | { [key: string]: JsonValue }\n  | JsonValue[];\n`;
}

function renderPythonPrimitives(policy: NamingPolicy) {
  return `"""${policy.generatedFileBanner}"""\nfrom __future__ import annotations\n\nfrom typing import TypeAlias\n\ntype ExactDecimalString = str\ntype ISO8601DateTimeString = str\ntype JSONValue = str | int | float | bool | None | dict[str, "JSONValue"] | list["JSONValue"]\n`;
}

function renderSwiftPrimitives(policy: NamingPolicy) {
  return `// ${policy.generatedFileBanner}\nimport Foundation\n\npublic typealias ExactDecimalString = String\npublic typealias ISO8601DateTimeString = String\n\npublic indirect enum JSONValue: Codable, Sendable {\n  case string(String)\n  case integer(Int)\n  case double(Double)\n  case boolean(Bool)\n  case object([String: JSONValue])\n  case array([JSONValue])\n  case null\n\n  public init(from decoder: Decoder) throws {\n    let container = try decoder.singleValueContainer()\n    if container.decodeNil() {\n      self = .null\n    } else if let value = try? container.decode(Bool.self) {\n      self = .boolean(value)\n    } else if let value = try? container.decode(Int.self) {\n      self = .integer(value)\n    } else if let value = try? container.decode(Double.self) {\n      self = .double(value)\n    } else if let value = try? container.decode(String.self) {\n      self = .string(value)\n    } else if let value = try? container.decode([String: JSONValue].self) {\n      self = .object(value)\n    } else {\n      self = .array(try container.decode([JSONValue].self))\n    }\n  }\n\n  public func encode(to encoder: Encoder) throws {\n    var container = encoder.singleValueContainer()\n    switch self {\n    case let .string(value):\n      try container.encode(value)\n    case let .integer(value):\n      try container.encode(value)\n    case let .double(value):\n      try container.encode(value)\n    case let .boolean(value):\n      try container.encode(value)\n    case let .object(value):\n      try container.encode(value)\n    case let .array(value):\n      try container.encode(value)\n    case .null:\n      try container.encodeNil()\n    }\n  }\n}\n`;
}

function renderTsIndex(familyRefs: LogicalFamilyRef[]) {
  return `export * from "./primitives";\n${familyRefs
    .map((familyRef) => `export * from "./${familyModuleName(familyRef)}";`)
    .join("\n")}\n`;
}

function renderPythonInit(familyRefs: LogicalFamilyRef[]) {
  return `from .generated.primitives import *\n${familyRefs
    .map((familyRef) => `from .generated.${pythonFamilyModuleName(familyRef)} import *`)
    .join("\n")}\n`;
}

function renderPythonGeneratedInit(familyRefs: LogicalFamilyRef[]) {
  return `from .primitives import *\n${familyRefs
    .map((familyRef) => `from .${pythonFamilyModuleName(familyRef)} import *`)
    .join("\n")}\n`;
}

function renderSwiftManifest(coverage: Array<FamilyCoverage>) {
  const lines = [
    "// DO NOT EDIT: generated downstream from packages/contracts-core.",
    "import Foundation",
    "",
    "public enum BindingCoverageManifest {",
  ];
  for (const family of coverage) {
    const memberName = sanitizeTypeName(family.familyRef.toLowerCase()).replace(
      /^[A-Z]/,
      (character) => character.toLowerCase(),
    );
    lines.push(
      `  public static let ${memberName} = ${literal(`${family.familyRef}:${family.coverageClass}:${family.sourceHashAggregate}`)}`,
    );
  }
  lines.push("}");
  return lines.join("\n");
}

async function writeOrCheckBuffer(
  filePath: string,
  contents: string,
  mode: SyncMode,
  mismatches: string[],
) {
  const expected = Buffer.from(contents, "utf8");
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

async function collectFilePaths(rootPath: string): Promise<string[]> {
  try {
    const entries = await readdir(rootPath, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(rootPath, entry.name);
        if (entry.name === "__pycache__" || entry.name.endsWith(".pyc")) {
          return [];
        }
        if (entry.isDirectory()) {
          return collectFilePaths(entryPath);
        }
        return [entryPath];
      }),
    );
    return nested.flat().sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function pruneStaleGeneratedFiles(
  rootPath: string,
  expectedFiles: Set<string>,
  mode: SyncMode,
  mismatches: string[],
) {
  const existingFiles = await collectFilePaths(rootPath);
  for (const existingFile of existingFiles) {
    if (expectedFiles.has(existingFile)) {
      continue;
    }
    if (mode === "emit") {
      await rm(existingFile, { force: true });
      continue;
    }
    mismatches.push(`Stale generated file: ${posixRelative(repoRoot, existingFile)}`);
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const mode: SyncMode = args.has("--emit") ? "emit" : "check";
  const mismatches: string[] = [];

  const [matrix, namingPolicy, sourceMapBuffer, sourceMapStats] = await Promise.all([
    readJson<BindingMatrix>(matrixPath),
    readJson<NamingPolicy>(policyPath),
    readFile(importSourceMapPath),
    stat(importSourceMapPath),
  ]);

  const sourceMapHash = sha256(sourceMapBuffer);
  const generationTimeUtc = sourceMapStats.mtime.toISOString();

  for (const schemaEntry of schemaCatalog) {
    const schemaPath = path.join(repoRoot, schemaEntry.destinationPath);
    schemaContentsByName.set(schemaEntry.schemaName, await readJson<SchemaNode>(schemaPath));
  }

  const familySchemas = new Map<
    LogicalFamilyRef,
    Array<{ entry: SchemaCatalogEntry; schema: SchemaNode }>
  >();
  for (const schemaEntry of schemaCatalog) {
    const collection = familySchemas.get(schemaEntry.logicalFamilyRef) ?? [];
    collection.push({
      entry: schemaEntry,
      schema: schemaContentsByName.get(schemaEntry.schemaName)!,
    });
    familySchemas.set(schemaEntry.logicalFamilyRef, collection);
  }

  const gapCollector = new GapCollector();
  const swiftTargetFamilies = new Set<LogicalFamilyRef>(
    matrix.families
      .filter((family) => family.targets.SWIFT.enabled)
      .map((family) => family.familyRef),
  );
  const swiftGeneratedSchemaNames = new Set<string>(
    schemaCatalog
      .filter((entry) => swiftTargetFamilies.has(entry.logicalFamilyRef))
      .map((entry) => entry.schemaName),
  );

  const generatedFiles: Array<{ path: string; contents: string }> = [];

  generatedFiles.push(
    {
      path: path.join(generatedTypesRoot, "primitives.ts"),
      contents: renderTsPrimitives(namingPolicy),
    },
    {
      path: path.join(pythonGeneratedRoot, "primitives.py"),
      contents: renderPythonPrimitives(namingPolicy),
    },
    {
      path: path.join(swiftGeneratedRoot, "GeneratedPrimitives.swift"),
      contents: renderSwiftPrimitives(namingPolicy),
    },
    {
      path: path.join(pythonGeneratedPackageRoot, "pyproject.toml"),
      contents: `[build-system]\nrequires = ["setuptools>=69"]\nbuild-backend = "setuptools.build_meta"\n\n[project]\nname = "taxat-generated-contract-models"\nversion = "0.0.0"\ndescription = "Generated downstream Python contract models mirrored from packages/contracts-core."\nrequires-python = ">=3.14"\n`,
    },
    {
      path: path.join(pythonGeneratedPackageRoot, "README.md"),
      contents:
        "# Generated Contract Models\n\nThis package is generated downstream from `packages/contracts-core`. Do not hand-edit the files under `src/taxat_generated_contract_models/generated/`.\n",
    },
  );

  const tsFamilyRefs: LogicalFamilyRef[] = [];
  const pythonFamilyRefs: LogicalFamilyRef[] = [];
  const swiftCoverageFamilies: FamilyCoverage[] = [];
  const languageCoverage: Record<Exclude<LanguageRef, "GAP_REGISTRY">, FamilyCoverage[]> = {
    TYPESCRIPT: [],
    PYTHON: [],
    SWIFT: [],
  };

  for (const familyConfig of matrix.families) {
    const entries = familySchemas.get(familyConfig.familyRef) ?? [];
    const familyLabel = familyLabels.get(familyConfig.familyRef) ?? familyConfig.familyRef;
    const hashAggregate = sha256(
      entries
        .map((item) => item.entry.sourceHash)
        .sort()
        .join(":"),
    );

    if (entries.length !== familyConfig.expectedSchemaCount) {
      mismatches.push(
        `Family ${familyConfig.familyRef} expected ${familyConfig.expectedSchemaCount} schemas but found ${entries.length} in contracts-core.`,
      );
    }

    if (familyConfig.targets.TYPESCRIPT.enabled) {
      tsFamilyRefs.push(familyConfig.familyRef);
      generatedFiles.push({
        path: path.join(generatedTypesRoot, `${familyModuleName(familyConfig.familyRef)}.ts`),
        contents: renderTsModule(
          familyConfig.familyRef,
          entries,
          gapCollector,
          swiftGeneratedSchemaNames,
          swiftTargetFamilies,
          namingPolicy.generatedFileBanner,
        ),
      });
      languageCoverage.TYPESCRIPT.push({
        familyRef: familyConfig.familyRef,
        familyLabel,
        schemaCount: entries.length,
        generatedSchemaCount: entries.length,
        sourceHashAggregate: hashAggregate,
        lastGenerationTimeUtc: generationTimeUtc,
        outputRef: posixRelative(
          repoRoot,
          path.join(generatedTypesRoot, `${familyModuleName(familyConfig.familyRef)}.ts`),
        ),
        toolId: matrix.languages.TYPESCRIPT.toolId,
        coverageClass: "FULL_FAMILY_GAP_BEARING_STRUCTURAL_BINDING",
        namingPolicyRef: matrix.languages.TYPESCRIPT.namingPolicyRef,
        decimalPolicyRef: matrix.languages.TYPESCRIPT.decimalPolicyRef,
        nullabilityPolicy: matrix.languages.TYPESCRIPT.nullabilityPolicy,
        consumingSurfaceRefs: [
          "packages/runtime-foundation",
          "packages/domain-kernel",
          "apps/control-plane-api",
          "apps/operator-web",
          "apps/client-portal-web",
        ],
        gapIds: [],
      });
    }

    if (familyConfig.targets.PYTHON.enabled) {
      pythonFamilyRefs.push(familyConfig.familyRef);
      generatedFiles.push({
        path: path.join(
          pythonGeneratedRoot,
          `${pythonFamilyModuleName(familyConfig.familyRef)}.py`,
        ),
        contents: renderPythonModule(
          familyConfig.familyRef,
          entries,
          gapCollector,
          swiftGeneratedSchemaNames,
          swiftTargetFamilies,
          namingPolicy.generatedFileBanner,
        ),
      });
      languageCoverage.PYTHON.push({
        familyRef: familyConfig.familyRef,
        familyLabel,
        schemaCount: entries.length,
        generatedSchemaCount: entries.length,
        sourceHashAggregate: hashAggregate,
        lastGenerationTimeUtc: generationTimeUtc,
        outputRef: posixRelative(
          repoRoot,
          path.join(pythonGeneratedRoot, `${pythonFamilyModuleName(familyConfig.familyRef)}.py`),
        ),
        toolId: matrix.languages.PYTHON.toolId,
        coverageClass: "FULL_FAMILY_GAP_BEARING_STRUCTURAL_BINDING",
        namingPolicyRef: matrix.languages.PYTHON.namingPolicyRef,
        decimalPolicyRef: matrix.languages.PYTHON.decimalPolicyRef,
        nullabilityPolicy: matrix.languages.PYTHON.nullabilityPolicy,
        consumingSurfaceRefs: [
          "python/validators",
          "packages/contracts-core/python",
          "python/generated_contract_models",
        ],
        gapIds: [],
      });
    }

    if (familyConfig.targets.SWIFT.enabled) {
      generatedFiles.push({
        path: path.join(
          swiftGeneratedRoot,
          `${swiftFamilyModuleName(familyConfig.familyRef)}.swift`,
        ),
        contents: renderSwiftModule(
          familyConfig.familyRef,
          entries,
          gapCollector,
          swiftGeneratedSchemaNames,
          swiftTargetFamilies,
          namingPolicy.generatedFileBanner,
        ),
      });
      const coverageEntry: FamilyCoverage = {
        familyRef: familyConfig.familyRef,
        familyLabel,
        schemaCount: entries.length,
        generatedSchemaCount: entries.length,
        sourceHashAggregate: hashAggregate,
        lastGenerationTimeUtc: generationTimeUtc,
        outputRef: posixRelative(
          repoRoot,
          path.join(swiftGeneratedRoot, `${swiftFamilyModuleName(familyConfig.familyRef)}.swift`),
        ),
        toolId: matrix.languages.SWIFT.toolId,
        coverageClass: "SELECTED_NATIVE_SUBSET_GAP_BEARING_BINDING",
        namingPolicyRef: matrix.languages.SWIFT.namingPolicyRef,
        decimalPolicyRef: matrix.languages.SWIFT.decimalPolicyRef,
        nullabilityPolicy: matrix.languages.SWIFT.nullabilityPolicy,
        consumingSurfaceRefs: familyConfig.targets.SWIFT.consumingSurfaceRefs ?? [
          "native/TaxatOperator",
          "apps/internal-operator-macos",
        ],
        gapIds: [],
      };
      languageCoverage.SWIFT.push(coverageEntry);
      swiftCoverageFamilies.push(coverageEntry);
    } else {
      addGap(
        gapCollector,
        "SWIFT",
        familyConfig.familyRef,
        "SWIFT_FAMILY_NOT_TARGETED",
        "LOW",
        "This schema family is not targeted for phase-02 native generation and remains outside the selected Swift subset.",
        entries.map((item) => item.entry.schemaName),
        "Promote the family into the Swift target subset only when the native workspace consumes it directly, then regenerate bindings.",
      );
      languageCoverage.SWIFT.push({
        familyRef: familyConfig.familyRef,
        familyLabel,
        schemaCount: entries.length,
        generatedSchemaCount: 0,
        sourceHashAggregate: hashAggregate,
        lastGenerationTimeUtc: generationTimeUtc,
        outputRef: matrix.languages.SWIFT.outputRoot,
        toolId: matrix.languages.SWIFT.toolId,
        coverageClass: "NOT_TARGETED",
        namingPolicyRef: matrix.languages.SWIFT.namingPolicyRef,
        decimalPolicyRef: matrix.languages.SWIFT.decimalPolicyRef,
        nullabilityPolicy: matrix.languages.SWIFT.nullabilityPolicy,
        consumingSurfaceRefs: familyConfig.targets.SWIFT.consumingSurfaceRefs ?? [],
        gapIds: [],
      });
    }
  }

  generatedFiles.push(
    { path: path.join(generatedTypesRoot, "index.ts"), contents: renderTsIndex(tsFamilyRefs) },
    {
      path: path.join(pythonGeneratedRoot, "__init__.py"),
      contents: renderPythonGeneratedInit(pythonFamilyRefs),
    },
    {
      path: path.join(
        pythonGeneratedPackageRoot,
        "src/taxat_generated_contract_models/__init__.py",
      ),
      contents: renderPythonInit(pythonFamilyRefs),
    },
    {
      path: path.join(swiftGeneratedRoot, "BindingCoverageManifest.swift"),
      contents: renderSwiftManifest(swiftCoverageFamilies),
    },
  );

  const gapRegister: BindingGapRegister = {
    registerVersion: "BINDING_GAP_REGISTER_V1",
    generationBasisSourceMapHash: sourceMapHash,
    entries: gapCollector.list(),
  };

  for (const coverageEntry of Object.values(languageCoverage).flat()) {
    coverageEntry.gapIds = gapRegister.entries
      .filter(
        (gap) =>
          gap.languageRef === coverageEntry.toolId.split("_")[1] ||
          gap.familyRef === coverageEntry.familyRef,
      )
      .filter((gap) => gap.familyRef === coverageEntry.familyRef)
      .filter((gap) =>
        coverageEntry.toolId.includes("TYPESCRIPT")
          ? gap.languageRef === "TYPESCRIPT"
          : coverageEntry.toolId.includes("PYTHON")
            ? gap.languageRef === "PYTHON"
            : gap.languageRef === "SWIFT",
      )
      .map((gap) => gap.gapId);
  }

  const coverageReport: BindingCoverageReport = {
    reportVersion: "BINDING_COVERAGE_REPORT_V1",
    packageOverride: "packages/generated-types -> packages/generated-models",
    importStrategy: contractImportBundle.importStrategy,
    generationBasis: {
      sourceMapHash,
      sourceMapGeneratedAtUtc: generationTimeUtc,
      matrixVersion: matrix.matrixVersion,
      namingPolicyVersion: namingPolicy.policyVersion,
    },
    languages: [
      {
        languageRef: "TYPESCRIPT",
        label: languageLabels.TYPESCRIPT,
        summary: languageSummaries.TYPESCRIPT,
        families: languageCoverage.TYPESCRIPT,
      },
      {
        languageRef: "PYTHON",
        label: languageLabels.PYTHON,
        summary: languageSummaries.PYTHON,
        families: languageCoverage.PYTHON,
      },
      {
        languageRef: "SWIFT",
        label: languageLabels.SWIFT,
        summary: languageSummaries.SWIFT,
        families: languageCoverage.SWIFT,
      },
      {
        languageRef: "GAP_REGISTRY",
        label: languageLabels.GAP_REGISTRY,
        summary: languageSummaries.GAP_REGISTRY,
        families: [],
      },
    ],
  };

  const atlasPayload: AtlasPayload = {
    routeId: "binding-coverage-atlas",
    title: "Taxat Binding Coverage Atlas",
    bundleBadge: "BND",
    generationPosture: "DETERMINISTIC_BINDING_GENERATION",
    summary:
      "The repo generates structural TypeScript and Python bindings for the full schema corpus, a selected Swift subset for native consumption, and a typed gap ledger for every feature or family the generators cannot represent faithfully.",
    lineageStrip: ["schema source hash", "generated package", "consuming surface"],
    languages: [
      {
        language_ref: "TYPESCRIPT",
        label: "TYPESCRIPT",
        summary: languageSummaries.TYPESCRIPT,
        entries: languageCoverage.TYPESCRIPT.map((family) => ({
          entry_ref: `TYPESCRIPT:${family.familyRef}`,
          familyRef: family.familyRef,
          label: family.familyLabel,
          outputRef: family.outputRef,
          toolId: family.toolId,
          coverageClass: family.coverageClass,
          sourceHashAggregate: family.sourceHashAggregate,
          decimalPolicyRef: family.decimalPolicyRef,
          nullabilityPolicy: family.nullabilityPolicy,
          gapIds: family.gapIds,
          consumingSurfaceRefs: family.consumingSurfaceRefs,
          affectedSchemaNames: (familySchemas.get(family.familyRef) ?? []).map(
            (item) => item.entry.schemaName,
          ),
          summary: `${family.schemaCount} schemas generated into the TypeScript package boundary.`,
        })),
      },
      {
        language_ref: "PYTHON",
        label: "PYTHON",
        summary: languageSummaries.PYTHON,
        entries: languageCoverage.PYTHON.map((family) => ({
          entry_ref: `PYTHON:${family.familyRef}`,
          familyRef: family.familyRef,
          label: family.familyLabel,
          outputRef: family.outputRef,
          toolId: family.toolId,
          coverageClass: family.coverageClass,
          sourceHashAggregate: family.sourceHashAggregate,
          decimalPolicyRef: family.decimalPolicyRef,
          nullabilityPolicy: family.nullabilityPolicy,
          gapIds: family.gapIds,
          consumingSurfaceRefs: family.consumingSurfaceRefs,
          affectedSchemaNames: (familySchemas.get(family.familyRef) ?? []).map(
            (item) => item.entry.schemaName,
          ),
          summary: `${family.schemaCount} schemas generated into the Python tooling package boundary.`,
        })),
      },
      {
        language_ref: "SWIFT",
        label: "SWIFT",
        summary: languageSummaries.SWIFT,
        entries: languageCoverage.SWIFT.map((family) => ({
          entry_ref: `SWIFT:${family.familyRef}`,
          familyRef: family.familyRef,
          label: family.familyLabel,
          outputRef: family.outputRef,
          toolId: family.toolId,
          coverageClass: family.coverageClass,
          sourceHashAggregate: family.sourceHashAggregate,
          decimalPolicyRef: family.decimalPolicyRef,
          nullabilityPolicy: family.nullabilityPolicy,
          gapIds: family.gapIds,
          consumingSurfaceRefs: family.consumingSurfaceRefs,
          affectedSchemaNames: (familySchemas.get(family.familyRef) ?? []).map(
            (item) => item.entry.schemaName,
          ),
          summary:
            family.coverageClass === "NOT_TARGETED"
              ? "This family is outside the selected phase-02 native subset and is represented as a typed native gap posture."
              : `${family.schemaCount} schemas generated into the Swift native subset.`,
        })),
      },
      {
        language_ref: "GAP_REGISTRY",
        label: "GAP_REGISTRY",
        summary: languageSummaries.GAP_REGISTRY,
        entries: gapRegister.entries.map((entry) => ({
          entry_ref: `GAP_REGISTRY:${entry.gapId}`,
          familyRef: entry.familyRef,
          label: `${entry.familyRef} / ${entry.gapCode}`,
          outputRef: entry.requiredFollowOn,
          toolId: entry.languageRef,
          coverageClass: entry.risk,
          sourceHashAggregate: sourceMapHash,
          decimalPolicyRef: "BINDING_NAMING_AND_DECIMAL_POLICY_V1",
          nullabilityPolicy: "SEE_GENERATION_MATRIX",
          gapIds: [entry.gapId],
          consumingSurfaceRefs: [],
          affectedSchemaNames: entry.affectedSchemaNames,
          summary: entry.summary,
        })),
      },
    ],
    selectedLanguageRef: "TYPESCRIPT",
    selectedEntryRef: "TYPESCRIPT:SURFACE_AND_EXPERIENCE",
  };

  generatedFiles.push(
    { path: bindingCoverageReportPath, contents: `${JSON.stringify(coverageReport, null, 2)}\n` },
    { path: bindingGapRegisterPath, contents: `${JSON.stringify(gapRegister, null, 2)}\n` },
    { path: atlasDataPath, contents: `${JSON.stringify(atlasPayload, null, 2)}\n` },
  );

  for (const managedRoot of [generatedTypesRoot, pythonGeneratedRoot, swiftGeneratedRoot]) {
    const expectedFiles = new Set(
      generatedFiles
        .map((generatedFile) => generatedFile.path)
        .filter((generatedFilePath) => generatedFilePath.startsWith(`${managedRoot}${path.sep}`)),
    );
    await pruneStaleGeneratedFiles(managedRoot, expectedFiles, mode, mismatches);
  }

  for (const generatedFile of generatedFiles) {
    await writeOrCheckBuffer(generatedFile.path, generatedFile.contents, mode, mismatches);
  }

  if (mode === "check" && mismatches.length > 0) {
    mismatches.forEach((mismatch) => console.error(mismatch));
    process.exitCode = 1;
    return;
  }

  console.log(
    `${mode === "emit" ? "wrote" : "verified"} language bindings: ${schemaCatalog.length} schemas across TypeScript, Python, and selected Swift families`,
  );
  console.log(`coverage report: ${posixRelative(repoRoot, bindingCoverageReportPath)}`);
  console.log(`gap register: ${posixRelative(repoRoot, bindingGapRegisterPath)}`);
}

await main();

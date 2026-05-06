import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  addExactDecimals,
  asTaxatId,
  asTaxatRef,
  asTaxatRouteToken,
  canonicalJsonStringify,
  compareExactDecimals,
  deriveAuthorityDuplicateMeaningKey,
  deriveAuthorityIdempotencyKey,
  deriveAuthorityRequestHash,
  formatInstantForDisplay,
  normalizeBusinessDateString,
  normalizeBusinessPeriodLabel,
  normalizeUtcInstantString,
  parseExactDecimal,
  stableJsonHash,
  stablePath,
  stableQueryString,
} from "./index.ts";

const execFileAsync = promisify(execFile);

type SourceLineageEntry = {
  source_file: string;
  source_heading_or_logical_block: string;
  rationale: string;
};

type IdentifierFamilyExample = {
  field_name: string;
  family: string;
  literal: string;
  note: string;
};

type IdentifierFamilyRecord = {
  family_ref: "ID" | "REF" | "HASH" | "ROUTE_TOKEN";
  label: string;
  brand_suffix: string;
  helper_ref: "asTaxatId" | "asTaxatRef" | "asTaxatHash" | "asTaxatRouteToken";
  schema_suffixes: string[];
  allowed_shape: string;
  summary: string;
  notes: string[];
  example_fields: IdentifierFamilyExample[];
  forbidden_shortcuts: string[];
};

type IdentifierFamilyCatalog = {
  contract_version: string;
  catalog_id: string;
  basis_statement: string;
  source_lineage: SourceLineageEntry[];
  identifier_families: IdentifierFamilyRecord[];
};

type HashHelperRecord = {
  helper_ref: string;
  purpose: string;
  notes: string[];
};

type HashCanonicalExample = {
  case_ref: string;
  label: string;
  payload: unknown;
  note: string;
};

type HashQueryExample = {
  case_ref: string;
  label: string;
  query: Record<string, unknown>;
  expected: string;
};

type HashPathExample = {
  case_ref: string;
  label: string;
  template: string;
  params: Record<string, unknown>;
  expected: string;
};

type AuthorityExample = {
  case_ref: string;
  label: string;
  payload: Record<string, unknown>;
  resource_template: string;
  path_params: Record<string, unknown>;
  query_params: Record<string, unknown>;
  normalized_obligation_ref: string;
  normalized_basis_type: string;
};

type HashProfile = {
  contract_version: string;
  profile_id: string;
  basis_statement: string;
  source_lineage: SourceLineageEntry[];
  algorithm: string;
  digest_encoding: string;
  serialization: {
    profile_ref: string;
    string_normalization: string;
    object_key_order: string;
    array_ordering: string;
    set_like_array_helper: string;
    null_policy: string;
    ascii_escape_policy: string;
    time_normalization: string;
    forbidden_inputs: string[];
  };
  helper_catalog: HashHelperRecord[];
  canonical_examples: HashCanonicalExample[];
  query_examples: HashQueryExample[];
  path_examples: HashPathExample[];
  authority_examples: AuthorityExample[];
};

type DecimalForbiddenCase = {
  label: string;
  literal: unknown;
  reason: string;
};

type DecimalLiteralExample = {
  case_ref: string;
  label: string;
  literal: string;
  scale: number;
};

type DecimalOperationExample = {
  case_ref: string;
  label: string;
  operation: "ADD" | "SUBTRACT";
  left: string;
  right: string;
  explicit_scale?: number;
  expected: string;
};

type DecimalComparisonExample = {
  case_ref: string;
  label: string;
  left: string;
  right: string;
  expected_numeric_relation: "LESS_THAN" | "EQUAL" | "GREATER_THAN";
  expected_representation_equal: boolean;
};

type DecimalProfile = {
  contract_version: string;
  profile_id: string;
  basis_statement: string;
  source_lineage: SourceLineageEntry[];
  storage_posture: string;
  representation: string;
  forbidden_inputs: DecimalForbiddenCase[];
  literal_examples: DecimalLiteralExample[];
  operation_examples: DecimalOperationExample[];
  comparison_examples: DecimalComparisonExample[];
};

type TimeInstantExample = {
  case_ref: string;
  label: string;
  input: string;
  expected: string;
};

type TimeBusinessDateExample = {
  case_ref: string;
  label: string;
  input: string;
};

type TimePeriodExample = {
  case_ref: string;
  label: string;
  family: "CALENDAR_MONTH" | "CALENDAR_QUARTER" | "TAX_YEAR";
  input: string;
};

type TimeForbiddenCase = {
  label: string;
  input: string;
  reason: string;
};

type TimeProfile = {
  contract_version: string;
  profile_id: string;
  basis_statement: string;
  source_lineage: SourceLineageEntry[];
  canonical_instant_shape: string;
  business_date_shape: string;
  period_families: string[];
  instant_examples: TimeInstantExample[];
  business_date_examples: TimeBusinessDateExample[];
  period_examples: TimePeriodExample[];
  display_example: {
    input: string;
    locale: string;
    timeZone: string;
    note: string;
  };
  forbidden_cases: TimeForbiddenCase[];
};

type PrimitiveFamilyRef = "IDENTIFIERS" | "HASHES" | "DECIMALS" | "TIME";
type FamilyTone = "cobalt" | "olive" | "copper" | "teal";

type AtlasExampleRow = {
  example_ref: string;
  label: string;
  input_literal: string;
  output_literal: string;
  note: string;
  accessible_label: string;
  copy_literal: string;
};

type AtlasForbiddenCase = {
  case_ref: string;
  label: string;
  input_literal: string;
  reason: string;
};

type AtlasParityRow = {
  parity_ref: string;
  label: string;
  status: "PASS";
  ts_value: string;
  python_value: string;
  python_source: string;
  notes: string[];
};

type AtlasFamily = {
  family_ref: PrimitiveFamilyRef;
  label: string;
  tone: FamilyTone;
  rail_summary: string;
  hero: {
    eyebrow: string;
    title: string;
    caption: string;
    diagram_kind: string;
    stages: string[];
    tokens: string[];
  };
  profile_rows: Array<{
    label: string;
    value: string;
  }>;
  examples: AtlasExampleRow[];
  forbidden_cases: AtlasForbiddenCase[];
  parity_rows: AtlasParityRow[];
  notes: string[];
  banned_patterns: string[];
  source_lineage: SourceLineageEntry[];
};

type CanonicalPrimitivesAtlasPayload = {
  routeId: string;
  title: string;
  canonicalityBadge: string;
  basisStatement: string;
  selectedFamilyRef: PrimitiveFamilyRef;
  generationBasis: {
    emittedAtBasis: string;
    profileHashes: Record<string, string>;
    pythonParitySources: string[];
  };
  families: AtlasFamily[];
};

type PythonParityResult = {
  identifier_literal: string;
  canonical_json: string;
  hash_digest: string;
  query_string: string;
  path_string: string;
  decimal_add_result: string;
  decimal_compare_numeric: number;
  decimal_representation_equal: boolean;
  time_normalized: string;
  time_business_date: string;
  time_period_label: string;
  authority_duplicate_meaning_key: string;
  authority_request_hash: string;
  authority_idempotency_key: string;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const configDir = path.join(repoRoot, "config", "primitives");
const pythonExecutable = path.join(repoRoot, ".venv", "bin", "python3");
const atlasDataPath = path.join(
  repoRoot,
  "apps",
  "operator-web",
  "public",
  "internal",
  "canonical-primitives-atlas",
  "data",
  "canonical-primitives-atlas.json",
);

const jsonPaths = {
  identifierCatalog: path.join(configDir, "identifier_family_catalog.json"),
  hashProfile: path.join(configDir, "hash_profile.json"),
  decimalProfile: path.join(configDir, "decimal_profile.json"),
  timeProfile: path.join(configDir, "time_profile.json"),
};

const schemaPaths = {
  identifierCatalog: path.join(configDir, "identifier_family_catalog.schema.json"),
  hashProfile: path.join(configDir, "hash_profile.schema.json"),
  decimalProfile: path.join(configDir, "decimal_profile.schema.json"),
  timeProfile: path.join(configDir, "time_profile.schema.json"),
};

function sha256Hex(value: Buffer | string) {
  return createHash("sha256").update(value).digest("hex");
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function readSchemaEnvelope(filePath: string) {
  return readJson<{
    title?: string;
    required?: string[];
  }>(filePath);
}

function validateSchemaEnvelope(
  schema: {
    title?: string;
    required?: string[];
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

function stringifyLiteral(value: unknown) {
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value);
}

function relationFromCompareResult(compareResult: number) {
  if (compareResult < 0) {
    return "LESS_THAN";
  }
  if (compareResult > 0) {
    return "GREATER_THAN";
  }
  return "EQUAL";
}

async function loadPrimitiveProfiles() {
  const [identifierSchema, hashSchema, decimalSchema, timeSchema] = await Promise.all([
    readSchemaEnvelope(schemaPaths.identifierCatalog),
    readSchemaEnvelope(schemaPaths.hashProfile),
    readSchemaEnvelope(schemaPaths.decimalProfile),
    readSchemaEnvelope(schemaPaths.timeProfile),
  ]);

  validateSchemaEnvelope(identifierSchema, "Identifier Family Catalog", [
    "contract_version",
    "catalog_id",
    "basis_statement",
    "source_lineage",
    "identifier_families",
  ]);
  validateSchemaEnvelope(hashSchema, "Hash Profile", [
    "contract_version",
    "profile_id",
    "basis_statement",
    "source_lineage",
    "algorithm",
    "digest_encoding",
    "serialization",
    "helper_catalog",
    "canonical_examples",
    "query_examples",
    "path_examples",
    "authority_examples",
  ]);
  validateSchemaEnvelope(decimalSchema, "Decimal Profile", [
    "contract_version",
    "profile_id",
    "basis_statement",
    "source_lineage",
    "storage_posture",
    "representation",
    "forbidden_inputs",
    "literal_examples",
    "operation_examples",
    "comparison_examples",
  ]);
  validateSchemaEnvelope(timeSchema, "Time Profile", [
    "contract_version",
    "profile_id",
    "basis_statement",
    "source_lineage",
    "canonical_instant_shape",
    "business_date_shape",
    "period_families",
    "instant_examples",
    "business_date_examples",
    "period_examples",
    "display_example",
    "forbidden_cases",
  ]);

  const [identifierCatalog, hashProfile, decimalProfile, timeProfile] = await Promise.all([
    readJson<IdentifierFamilyCatalog>(jsonPaths.identifierCatalog),
    readJson<HashProfile>(jsonPaths.hashProfile),
    readJson<DecimalProfile>(jsonPaths.decimalProfile),
    readJson<TimeProfile>(jsonPaths.timeProfile),
  ]);

  invariant(
    identifierCatalog.identifier_families.length === 4,
    "Expected four identifier families.",
  );
  invariant(hashProfile.authority_examples.length > 0, "Expected at least one authority example.");
  invariant(decimalProfile.literal_examples.length > 0, "Expected decimal literal examples.");
  invariant(timeProfile.instant_examples.length > 0, "Expected time instant examples.");

  return {
    identifierCatalog,
    hashProfile,
    decimalProfile,
    timeProfile,
  };
}

async function computePythonParity(input: {
  identifierLiteral: string;
  identifierFamily: string;
  hashPayload: unknown;
  decimalLeft: string;
  decimalRight: string;
  decimalCompareLeft: string;
  decimalCompareRight: string;
  timeInstant: string;
  timeBusinessDate: string;
  timePeriodFamily: string;
  timePeriodValue: string;
  authorityExample: AuthorityExample;
}) {
  const pythonProgram = `
from __future__ import annotations
import json
import sys

sys.path.insert(0, ${JSON.stringify(path.join(repoRoot, "python", "validators", "src"))})
sys.path.insert(0, ${JSON.stringify(path.join(repoRoot, "Algorithm", "scripts"))})

from taxat_validators.primitives import (  # type: ignore
    ExactDecimal,
    assert_identifier_literal,
    canonical_json_dumps,
    normalize_business_date,
    normalize_business_period_label,
    normalize_utc_instant_string,
    stable_json_hash,
)
from validate_contracts import (  # type: ignore
    derive_authority_duplicate_meaning_key,
    derive_authority_idempotency_key,
    derive_authority_request_hash,
    stable_path,
    stable_query_string,
)

payload = json.loads(sys.argv[1])
authority_example = payload["authorityExample"]
canonical_path = stable_path(authority_example["resource_template"], authority_example["path_params"])
canonical_query = stable_query_string(authority_example["query_params"])
duplicate_meaning_key = derive_authority_duplicate_meaning_key(
    authority_example["payload"],
    canonical_path,
    canonical_query,
    authority_example["normalized_obligation_ref"],
    authority_example["normalized_basis_type"],
)
request_hash = derive_authority_request_hash(authority_example["payload"], duplicate_meaning_key)
idempotency_key = derive_authority_idempotency_key(duplicate_meaning_key)

decimal_left = ExactDecimal.parse(payload["decimalLeft"])
decimal_right = ExactDecimal.parse(payload["decimalRight"])
compare_left = ExactDecimal.parse(payload["decimalCompareLeft"])
compare_right = ExactDecimal.parse(payload["decimalCompareRight"])

print(json.dumps({
    "identifier_literal": assert_identifier_literal(
        payload["identifierLiteral"],
        family=payload["identifierFamily"],
        kind="ID",
    ),
    "canonical_json": canonical_json_dumps(payload["hashPayload"]),
    "hash_digest": stable_json_hash(payload["hashPayload"]),
    "query_string": canonical_query,
    "path_string": canonical_path,
    "decimal_add_result": decimal_left.add(decimal_right).to_canonical_string(),
    "decimal_compare_numeric": compare_left.compare(compare_right),
    "decimal_representation_equal": compare_left.scale == compare_right.scale and compare_left.unscaled == compare_right.unscaled,
    "time_normalized": normalize_utc_instant_string(payload["timeInstant"]),
    "time_business_date": normalize_business_date(payload["timeBusinessDate"]),
    "time_period_label": normalize_business_period_label(payload["timePeriodValue"], payload["timePeriodFamily"]),
    "authority_duplicate_meaning_key": duplicate_meaning_key,
    "authority_request_hash": request_hash,
    "authority_idempotency_key": idempotency_key,
}, ensure_ascii=True))
`.trim();

  const python = await execFileAsync(
    pythonExecutable,
    ["-c", pythonProgram, JSON.stringify(input)],
    {
      cwd: repoRoot,
      maxBuffer: 16 * 1024 * 1024,
    },
  );

  return JSON.parse(python.stdout) as PythonParityResult;
}

function assertParity(
  label: string,
  left: string | number | boolean,
  right: string | number | boolean,
) {
  invariant(left === right, `${label} parity mismatch: ${left} !== ${right}`);
}

async function createAtlasPayload() {
  const profiles = await loadPrimitiveProfiles();

  const canonicalHashExample = profiles.hashProfile.canonical_examples[0];
  const queryExample = profiles.hashProfile.query_examples[0];
  const pathExample = profiles.hashProfile.path_examples[0];
  const authorityExample = profiles.hashProfile.authority_examples[0];
  const decimalOperationExample = profiles.decimalProfile.operation_examples[0];
  const decimalComparisonExample = profiles.decimalProfile.comparison_examples[0];
  const timeInstantExample = profiles.timeProfile.instant_examples[0];
  const timeBusinessDateExample = profiles.timeProfile.business_date_examples[0];
  const timePeriodExample = profiles.timeProfile.period_examples[0];

  const identifierSample = profiles.identifierCatalog.identifier_families[0].example_fields[0];
  const identifierParity = asTaxatId(identifierSample.literal, identifierSample.family);
  const canonicalJson = canonicalJsonStringify(canonicalHashExample.payload);
  const hashDigest = stableJsonHash(canonicalHashExample.payload);
  const queryString = stableQueryString(queryExample.query);
  const resolvedPath = stablePath(pathExample.template, pathExample.params);
  invariant(resolvedPath !== null, "Expected a resolved path example.");

  const duplicateMeaningKey = deriveAuthorityDuplicateMeaningKey(
    authorityExample.payload,
    stablePath(authorityExample.resource_template, authorityExample.path_params) ?? "",
    stableQueryString(authorityExample.query_params),
    authorityExample.normalized_obligation_ref,
    authorityExample.normalized_basis_type,
  );
  const requestHash = deriveAuthorityRequestHash(authorityExample.payload, duplicateMeaningKey);
  const idempotencyKey = deriveAuthorityIdempotencyKey(duplicateMeaningKey);

  const decimalAddResult = addExactDecimals(
    decimalOperationExample.left,
    decimalOperationExample.right,
    decimalOperationExample.explicit_scale,
  ).toCanonicalString();
  const decimalComparison = compareExactDecimals(
    decimalComparisonExample.left,
    decimalComparisonExample.right,
  );
  const decimalRepresentationEqual = parseExactDecimal(
    decimalComparisonExample.left,
  ).equalsRepresentation(parseExactDecimal(decimalComparisonExample.right));

  const normalizedInstant = normalizeUtcInstantString(timeInstantExample.input);
  const normalizedBusinessDate = normalizeBusinessDateString(timeBusinessDateExample.input);
  const normalizedPeriodLabel = normalizeBusinessPeriodLabel(
    timePeriodExample.input,
    timePeriodExample.family,
  );
  const displayExample = formatInstantForDisplay(profiles.timeProfile.display_example.input, {
    locale: profiles.timeProfile.display_example.locale,
    timeZone: profiles.timeProfile.display_example.timeZone,
  });

  invariant(queryString === queryExample.expected, "Hash query example drifted.");
  invariant(resolvedPath === pathExample.expected, "Hash path example drifted.");
  invariant(decimalAddResult === decimalOperationExample.expected, "Decimal operation drifted.");
  invariant(
    relationFromCompareResult(decimalComparison) ===
      decimalComparisonExample.expected_numeric_relation,
    "Decimal comparison relation drifted.",
  );
  invariant(
    decimalRepresentationEqual === decimalComparisonExample.expected_representation_equal,
    "Decimal representation parity drifted.",
  );
  invariant(
    normalizedInstant === timeInstantExample.expected,
    "Time instant normalization drifted.",
  );

  const pythonParity = await computePythonParity({
    identifierLiteral: identifierSample.literal,
    identifierFamily: identifierSample.family,
    hashPayload: canonicalHashExample.payload,
    decimalLeft: decimalOperationExample.left,
    decimalRight: decimalOperationExample.right,
    decimalCompareLeft: decimalComparisonExample.left,
    decimalCompareRight: decimalComparisonExample.right,
    timeInstant: timeInstantExample.input,
    timeBusinessDate: timeBusinessDateExample.input,
    timePeriodFamily: timePeriodExample.family,
    timePeriodValue: timePeriodExample.input,
    authorityExample,
  });

  assertParity("identifier literal", identifierParity, pythonParity.identifier_literal);
  assertParity("canonical json", canonicalJson, pythonParity.canonical_json);
  assertParity("hash digest", hashDigest, pythonParity.hash_digest);
  assertParity("query string", queryString, pythonParity.query_string);
  assertParity("path string", resolvedPath, pythonParity.path_string);
  assertParity("decimal add", decimalAddResult, pythonParity.decimal_add_result);
  assertParity("decimal compare", decimalComparison, pythonParity.decimal_compare_numeric);
  assertParity(
    "decimal representation equality",
    decimalRepresentationEqual,
    pythonParity.decimal_representation_equal,
  );
  assertParity("time instant", normalizedInstant, pythonParity.time_normalized);
  assertParity("business date", normalizedBusinessDate, pythonParity.time_business_date);
  assertParity("period label", normalizedPeriodLabel, pythonParity.time_period_label);
  assertParity(
    "authority duplicate meaning key",
    duplicateMeaningKey,
    pythonParity.authority_duplicate_meaning_key,
  );
  assertParity("authority request hash", requestHash, pythonParity.authority_request_hash);
  assertParity("authority idempotency key", idempotencyKey, pythonParity.authority_idempotency_key);

  const [identifierBuffer, hashBuffer, decimalBuffer, timeBuffer] = await Promise.all([
    readFile(jsonPaths.identifierCatalog),
    readFile(jsonPaths.hashProfile),
    readFile(jsonPaths.decimalProfile),
    readFile(jsonPaths.timeProfile),
  ]);

  const families: AtlasFamily[] = [
    {
      family_ref: "IDENTIFIERS",
      label: "IDENTIFIERS",
      tone: "cobalt",
      rail_summary: profiles.identifierCatalog.basis_statement,
      hero: {
        eyebrow: "Branded tag tree",
        title: "Opaque strings keep family meaning",
        caption:
          "The shared layer brands IDs, refs, hashes, and route tokens without adding regex folklore.",
        diagram_kind: "TAG_TREE",
        stages: ["raw string", "family helper", "branded value", "schema boundary"],
        tokens: profiles.identifierCatalog.identifier_families.flatMap((family) =>
          family.example_fields.slice(0, 1).map((example) => example.literal),
        ),
      },
      profile_rows: [
        { label: "Catalog", value: profiles.identifierCatalog.catalog_id },
        {
          label: "Families",
          value: `${profiles.identifierCatalog.identifier_families.length} branded string families`,
        },
        { label: "Allowed shape", value: "NON_EMPTY_STRING" },
      ],
      examples: [
        ...profiles.identifierCatalog.identifier_families[0].example_fields.map((example) => ({
          example_ref: `${example.field_name}-id`,
          label: example.field_name,
          input_literal: example.literal,
          output_literal: asTaxatId(example.literal, example.family),
          note: example.note,
          accessible_label: `Identifier example ${example.field_name} literal`,
          copy_literal: example.literal,
        })),
        ...profiles.identifierCatalog.identifier_families[1].example_fields.map((example) => ({
          example_ref: `${example.field_name}-ref`,
          label: example.field_name,
          input_literal: example.literal,
          output_literal: asTaxatRef(example.literal, example.family),
          note: example.note,
          accessible_label: `Reference example ${example.field_name} literal`,
          copy_literal: example.literal,
        })),
        ...profiles.identifierCatalog.identifier_families[3].example_fields.map((example) => ({
          example_ref: `${example.field_name}-route`,
          label: example.field_name,
          input_literal: example.literal,
          output_literal: asTaxatRouteToken(example.literal, example.family),
          note: example.note,
          accessible_label: `Route token example ${example.field_name} literal`,
          copy_literal: example.literal,
        })),
      ],
      forbidden_cases: [
        {
          case_ref: "identifier-non-string",
          label: "Reject non-string inputs",
          input_literal: "42",
          reason:
            "Identifier helpers fail closed on non-string input rather than coercing numbers.",
        },
        {
          case_ref: "identifier-empty",
          label: "Reject empty strings",
          input_literal: '""',
          reason: "An empty string erases identity meaning at the boundary.",
        },
      ],
      parity_rows: [
        {
          parity_ref: "identifier-python-parity",
          label: "Identifier literal parity",
          status: "PASS",
          ts_value: identifierParity,
          python_value: pythonParity.identifier_literal,
          python_source: "python/validators/src/taxat_validators/primitives.py",
          notes: [
            "Both runtimes preserve lawful punctuation.",
            "Neither runtime invents regex-only narrowing in the shared primitive layer.",
          ],
        },
      ],
      notes: profiles.identifierCatalog.identifier_families.flatMap((family) => family.notes),
      banned_patterns: profiles.identifierCatalog.identifier_families.flatMap(
        (family) => family.forbidden_shortcuts,
      ),
      source_lineage: profiles.identifierCatalog.source_lineage,
    },
    {
      family_ref: "HASHES",
      label: "HASHES",
      tone: "teal",
      rail_summary: profiles.hashProfile.basis_statement,
      hero: {
        eyebrow: "Canonical bytes to digest",
        title: "Canonical JSON becomes replay-safe SHA-256",
        caption:
          "Objects reorder, strings normalize to NFC, arrays keep declared order, and digests stay lowercase hex.",
        diagram_kind: "DIGEST_FLOW",
        stages: ["payload", "canonical JSON", "UTF-8 bytes", "SHA-256 digest"],
        tokens: [canonicalJson, hashDigest, duplicateMeaningKey, requestHash],
      },
      profile_rows: [
        { label: "Algorithm", value: profiles.hashProfile.algorithm },
        { label: "Encoding", value: profiles.hashProfile.digest_encoding },
        {
          label: "Array ordering",
          value: profiles.hashProfile.serialization.array_ordering,
        },
      ],
      examples: [
        {
          example_ref: canonicalHashExample.case_ref,
          label: canonicalHashExample.label,
          input_literal: JSON.stringify(canonicalHashExample.payload),
          output_literal: hashDigest,
          note: `${canonicalHashExample.note} Canonical JSON: ${canonicalJson}`,
          accessible_label: `Hash example ${canonicalHashExample.label}`,
          copy_literal: hashDigest,
        },
        {
          example_ref: queryExample.case_ref,
          label: queryExample.label,
          input_literal: JSON.stringify(queryExample.query),
          output_literal: queryString,
          note: "Query keys sort lexicographically while array values preserve declared order.",
          accessible_label: `Hash query example ${queryExample.label}`,
          copy_literal: queryString,
        },
        {
          example_ref: pathExample.case_ref,
          label: pathExample.label,
          input_literal: pathExample.template,
          output_literal: resolvedPath,
          note: "Path params are RFC 3986 encoded and missing params fail closed.",
          accessible_label: `Hash path example ${pathExample.label}`,
          copy_literal: resolvedPath,
        },
        {
          example_ref: authorityExample.case_ref,
          label: authorityExample.label,
          input_literal: JSON.stringify(authorityExample.payload),
          output_literal: requestHash,
          note: `duplicate_meaning_key ${duplicateMeaningKey} -> idempotency_key ${idempotencyKey}`,
          accessible_label: `Authority hash example ${authorityExample.label}`,
          copy_literal: requestHash,
        },
      ],
      forbidden_cases: profiles.hashProfile.serialization.forbidden_inputs.map((input, index) => ({
        case_ref: `hash-forbidden-${index}`,
        label: input,
        input_literal: input,
        reason: "Canonical hashing rejects values that would make serialization runtime-dependent.",
      })),
      parity_rows: [
        {
          parity_ref: "stable-json-hash-parity",
          label: "Stable JSON hash parity",
          status: "PASS",
          ts_value: hashDigest,
          python_value: pythonParity.hash_digest,
          python_source: "python/validators/src/taxat_validators/primitives.py",
          notes: ["Canonical JSON bytes also match exactly across TypeScript and Python."],
        },
        {
          parity_ref: "authority-request-hash-parity",
          label: "Authority request hash parity",
          status: "PASS",
          ts_value: requestHash,
          python_value: pythonParity.authority_request_hash,
          python_source: "Algorithm/scripts/validate_contracts.py",
          notes: [
            "Request identity formulas stay aligned with the validator oracle.",
            "duplicate_meaning_key and idempotency_key match as well.",
          ],
        },
      ],
      notes: profiles.hashProfile.helper_catalog.flatMap((helper) => helper.notes),
      banned_patterns: [
        "Never sort legally ordered arrays before hashing.",
        "Never hash pretty-printed JSON or locale-formatted strings.",
      ],
      source_lineage: profiles.hashProfile.source_lineage,
    },
    {
      family_ref: "DECIMALS",
      label: "DECIMALS",
      tone: "olive",
      rail_summary: profiles.decimalProfile.basis_statement,
      hero: {
        eyebrow: "Fixed-scale ladder",
        title: "Exact arithmetic without float shortcuts",
        caption:
          "Runtime helpers keep unscaled integer precision and explicit scale so canonical literals round-trip exactly.",
        diagram_kind: "SCALE_LADDER",
        stages: ["literal", "unscaled integer", "scale alignment", "canonical string"],
        tokens: profiles.decimalProfile.literal_examples.map((example) => example.literal),
      },
      profile_rows: [
        { label: "Storage posture", value: profiles.decimalProfile.storage_posture },
        { label: "Runtime shape", value: profiles.decimalProfile.representation },
        {
          label: "Comparison posture",
          value: "numeric equality is distinct from representational equality",
        },
      ],
      examples: [
        ...profiles.decimalProfile.literal_examples.map((example) => ({
          example_ref: example.case_ref,
          label: example.label,
          input_literal: example.literal,
          output_literal: parseExactDecimal(example.literal).toCanonicalString(),
          note: `Scale ${example.scale} is preserved in the canonical representation.`,
          accessible_label: `Decimal literal example ${example.label}`,
          copy_literal: example.literal,
        })),
        ...profiles.decimalProfile.operation_examples.map((example) => ({
          example_ref: example.case_ref,
          label: example.label,
          input_literal: `${example.left} ${example.operation === "ADD" ? "+" : "-"} ${example.right}`,
          output_literal:
            example.operation === "ADD"
              ? addExactDecimals(
                  example.left,
                  example.right,
                  example.explicit_scale,
                ).toCanonicalString()
              : addExactDecimals(
                  example.left,
                  parseExactDecimal(example.right).negate().toCanonicalString(),
                  example.explicit_scale,
                ).toCanonicalString(),
          note:
            example.explicit_scale === undefined
              ? "Default result scale uses the maximum operand scale."
              : `Explicit result scale ${example.explicit_scale} preserves money-shape output.`,
          accessible_label: `Decimal operation example ${example.label}`,
          copy_literal: example.expected,
        })),
        ...profiles.decimalProfile.comparison_examples.map((example) => ({
          example_ref: example.case_ref,
          label: example.label,
          input_literal: `${example.left} vs ${example.right}`,
          output_literal:
            relationFromCompareResult(compareExactDecimals(example.left, example.right)) === "EQUAL"
              ? "numeric equal / representation distinct"
              : "comparison mismatch",
          note: "Scale itself can carry meaning even when numeric comparison is equal.",
          accessible_label: `Decimal comparison example ${example.label}`,
          copy_literal: `${example.left} vs ${example.right}`,
        })),
      ],
      forbidden_cases: profiles.decimalProfile.forbidden_inputs.map((entry, index) => ({
        case_ref: `decimal-forbidden-${index}`,
        label: entry.label,
        input_literal: stringifyLiteral(entry.literal),
        reason: entry.reason,
      })),
      parity_rows: [
        {
          parity_ref: "decimal-add-parity",
          label: "Exact decimal addition parity",
          status: "PASS",
          ts_value: decimalAddResult,
          python_value: pythonParity.decimal_add_result,
          python_source: "python/validators/src/taxat_validators/primitives.py",
          notes: ["Both runtimes preserve exact scale without float coercion."],
        },
        {
          parity_ref: "decimal-comparison-parity",
          label: "Numeric and representational comparison parity",
          status: "PASS",
          ts_value: `${decimalComparison}/${decimalRepresentationEqual}`,
          python_value: `${pythonParity.decimal_compare_numeric}/${pythonParity.decimal_representation_equal}`,
          python_source: "python/validators/src/taxat_validators/primitives.py",
          notes: ["Numeric equality and representation equality remain deliberately distinct."],
        },
      ],
      notes: [
        "Exact decimals parse from canonical strings only.",
        "Shared helpers intentionally omit lossy toNumber convenience methods.",
      ],
      banned_patterns: profiles.decimalProfile.forbidden_inputs.map((entry) => entry.reason),
      source_lineage: profiles.decimalProfile.source_lineage,
    },
    {
      family_ref: "TIME",
      label: "TIME",
      tone: "copper",
      rail_summary: profiles.timeProfile.basis_statement,
      hero: {
        eyebrow: "Normalized timeline",
        title: "Instants, business dates, and period labels stay separate",
        caption:
          "Canonical time values normalize to UTC for machine truth while display formatting requires an explicit locale and time zone.",
        diagram_kind: "TIMELINE",
        stages: ["offset instant", "UTC canonical instant", "business date", "period label"],
        tokens: [
          profiles.timeProfile.instant_examples[0].input,
          normalizedInstant,
          normalizedBusinessDate,
          normalizedPeriodLabel,
        ],
      },
      profile_rows: [
        { label: "Instant shape", value: profiles.timeProfile.canonical_instant_shape },
        { label: "Business date", value: profiles.timeProfile.business_date_shape },
        {
          label: "Period families",
          value: profiles.timeProfile.period_families.join(", "),
        },
      ],
      examples: [
        ...profiles.timeProfile.instant_examples.map((example) => ({
          example_ref: example.case_ref,
          label: example.label,
          input_literal: example.input,
          output_literal: normalizeUtcInstantString(example.input),
          note: "UTC output strips .000 but keeps millisecond precision when present.",
          accessible_label: `Time instant example ${example.label}`,
          copy_literal: example.expected,
        })),
        ...profiles.timeProfile.business_date_examples.map((example) => ({
          example_ref: example.case_ref,
          label: example.label,
          input_literal: example.input,
          output_literal: normalizeBusinessDateString(example.input),
          note: "Business dates remain plain calendar-safe strings without timezone semantics.",
          accessible_label: `Business date example ${example.label}`,
          copy_literal: example.input,
        })),
        ...profiles.timeProfile.period_examples.map((example) => ({
          example_ref: example.case_ref,
          label: example.label,
          input_literal: example.input,
          output_literal: normalizeBusinessPeriodLabel(example.input, example.family),
          note: `${example.family} labels stay distinct from instants.`,
          accessible_label: `Business period example ${example.label}`,
          copy_literal: example.input,
        })),
        {
          example_ref: "display-explicit-locale",
          label: "Explicit display helper",
          input_literal: profiles.timeProfile.display_example.input,
          output_literal: displayExample,
          note: profiles.timeProfile.display_example.note,
          accessible_label: "Display-format example with explicit locale and time zone",
          copy_literal: displayExample,
        },
      ],
      forbidden_cases: profiles.timeProfile.forbidden_cases.map((entry, index) => ({
        case_ref: `time-forbidden-${index}`,
        label: entry.label,
        input_literal: entry.input,
        reason: entry.reason,
      })),
      parity_rows: [
        {
          parity_ref: "time-instant-parity",
          label: "UTC instant normalization parity",
          status: "PASS",
          ts_value: normalizedInstant,
          python_value: pythonParity.time_normalized,
          python_source: "python/validators/src/taxat_validators/primitives.py",
          notes: ["Offset-bearing instants normalize to the same UTC literal in both runtimes."],
        },
        {
          parity_ref: "time-period-parity",
          label: "Business period label parity",
          status: "PASS",
          ts_value: normalizedPeriodLabel,
          python_value: pythonParity.time_period_label,
          python_source: "python/validators/src/taxat_validators/primitives.py",
          notes: ["Calendar month, quarter, and tax year labels remain separate legal families."],
        },
      ],
      notes: [
        "Time helpers distinguish machine truth from human display formatting.",
        "Canonical instant output is always UTC with explicit timezone normalization.",
      ],
      banned_patterns: [
        "Do not accept timezone-free instants in canonical helpers.",
        "Do not derive display formatting from ambient locale or machine timezone.",
      ],
      source_lineage: profiles.timeProfile.source_lineage,
    },
  ];

  return {
    routeId: "canonical-primitives-atlas",
    title: "Taxat Canonical Primitives Atlas",
    canonicalityBadge: "CANONICAL V1",
    basisStatement:
      "Identifiers, hashes, exact decimals, and time values now share one deterministic substrate across TypeScript, Python, and validator-grounded request identity formulas.",
    selectedFamilyRef: "HASHES",
    generationBasis: {
      emittedAtBasis: "STATIC_PROFILE_CONTRACTS",
      profileHashes: {
        identifier_family_catalog: sha256Hex(identifierBuffer),
        hash_profile: sha256Hex(hashBuffer),
        decimal_profile: sha256Hex(decimalBuffer),
        time_profile: sha256Hex(timeBuffer),
      },
      pythonParitySources: [
        "python/validators/src/taxat_validators/primitives.py",
        "Algorithm/scripts/validate_contracts.py",
      ],
    },
    families,
  } satisfies CanonicalPrimitivesAtlasPayload;
}

async function emitAtlasPayload(payload: CanonicalPrimitivesAtlasPayload) {
  await mkdir(path.dirname(atlasDataPath), { recursive: true });
  await writeFile(atlasDataPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function checkAtlasPayload(payload: CanonicalPrimitivesAtlasPayload) {
  const existing = await readFile(atlasDataPath, "utf8");
  const expected = `${JSON.stringify(payload, null, 2)}\n`;
  if (existing !== expected) {
    throw new Error(`Out-of-sync generated file: ${path.relative(repoRoot, atlasDataPath)}`);
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const mode = args.has("--emit") ? "emit" : "check";
  const payload = await createAtlasPayload();

  if (mode === "emit") {
    await emitAtlasPayload(payload);
  } else {
    await checkAtlasPayload(payload);
  }

  console.log(
    `${mode === "emit" ? "wrote" : "verified"} canonical primitives atlas: ${payload.families.length} families`,
  );
  console.log(`atlas payload: ${path.relative(repoRoot, atlasDataPath)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

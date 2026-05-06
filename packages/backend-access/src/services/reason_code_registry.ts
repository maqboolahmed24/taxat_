import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeStringSet, requireTrimmedString } from "./principal_context_normalizer.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const reasonCodeCatalogPath = path.join(repoRoot, "config", "access", "reason_code_catalog.json");

export type AccessReasonCodeCatalogEntry = {
  code: string;
  decision_outcomes: Array<"ALLOW" | "ALLOW_MASKED" | "REQUIRE_STEP_UP" | "REQUIRE_APPROVAL" | "DENY">;
  description: string;
  family: string;
  source_refs: string[];
};

export type AccessReasonCodeCatalog = {
  basis_statement: string;
  codes: AccessReasonCodeCatalogEntry[];
  contract_version: "ACCESS_REASON_CODE_CATALOG_V1";
};

type ReasonCodeRegistryErrorCode =
  | "REASON_CODE_CATALOG_INVALID"
  | "REASON_CODE_UNSUPPORTED";

export class ReasonCodeRegistryError extends Error {
  readonly code: ReasonCodeRegistryErrorCode;

  constructor(code: ReasonCodeRegistryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ReasonCodeRegistryError";
    this.code = code;
  }
}

function normalizeCatalogEntry(input: AccessReasonCodeCatalogEntry) {
  const code = requireTrimmedString("reason_code_catalog.codes[].code", input.code);
  const family = requireTrimmedString("reason_code_catalog.codes[].family", input.family);
  const description = requireTrimmedString(
    "reason_code_catalog.codes[].description",
    input.description,
  );
  const decision_outcomes = normalizeStringSet(
    `reason_code_catalog.codes[${code}].decision_outcomes`,
    input.decision_outcomes,
    { minItems: 1 },
  ) as AccessReasonCodeCatalogEntry["decision_outcomes"];
  const source_refs = normalizeStringSet(
    `reason_code_catalog.codes[${code}].source_refs`,
    input.source_refs,
    { minItems: 1 },
  );
  return {
    code,
    family,
    description,
    decision_outcomes,
    source_refs,
  };
}

let cachedCatalog: Promise<AccessReasonCodeCatalog> | null = null;

export async function loadReasonCodeCatalog(options?: { reload?: boolean }) {
  if (!cachedCatalog || options?.reload) {
    cachedCatalog = readFile(reasonCodeCatalogPath, "utf8").then((raw) => {
      const parsed = JSON.parse(raw) as AccessReasonCodeCatalog;
      if (parsed.contract_version !== "ACCESS_REASON_CODE_CATALOG_V1") {
        throw new ReasonCodeRegistryError(
          "REASON_CODE_CATALOG_INVALID",
          "unexpected access reason-code catalog version",
        );
      }
      return {
        ...parsed,
        codes: parsed.codes.map((entry) => normalizeCatalogEntry(entry)),
      };
    });
  }
  return cachedCatalog;
}

export class ReasonCodeRegistry {
  async load(options?: { reload?: boolean }) {
    return loadReasonCodeCatalog(options);
  }

  async list() {
    const catalog = await this.load();
    return catalog.codes.map((entry) => structuredClone(entry));
  }

  async get(code: string) {
    const catalog = await this.load();
    const normalizedCode = requireTrimmedString("reason_code", code);
    return catalog.codes.find((entry) => entry.code === normalizedCode) ?? null;
  }

  async assertSupported(codes: readonly string[], options?: { decision?: string; label?: string }) {
    const catalog = await this.load();
    const catalogEntries = new Map(catalog.codes.map((entry) => [entry.code, entry] as const));
    for (const code of normalizeStringSet(options?.label ?? "reason_codes", codes, { minItems: 1 })) {
      const entry = catalogEntries.get(code);
      if (!entry) {
        throw new ReasonCodeRegistryError(
          "REASON_CODE_UNSUPPORTED",
          `${code} is not present in config/access/reason_code_catalog.json`,
        );
      }
      if (
        options?.decision &&
        !entry.decision_outcomes.includes(
          options.decision as AccessReasonCodeCatalogEntry["decision_outcomes"][number],
        )
      ) {
        throw new ReasonCodeRegistryError(
          "REASON_CODE_UNSUPPORTED",
          `${code} is not valid for decision ${options.decision}`,
        );
      }
    }
  }
}

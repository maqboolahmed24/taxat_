import type { BindingCatalog } from "./types.ts";
import { stableHash } from "./utils.ts";

type SchemaSourceMapEntry = {
  schemaName: string;
  schemaId: string;
  logicalFamilyRef: string;
  logicalFamilyLabel: string;
};

type BindingCoverageFamily = {
  familyRef: string;
  familyLabel: string;
  outputRef: string;
  coverageClass: string;
  sourceHashAggregate: string;
  gapIds: string[];
};

type BindingCoverageLanguage = {
  languageRef: string;
  label: string;
  summary: string;
  families: BindingCoverageFamily[];
};

type BindingCoverageReport = {
  generationBasis: {
    sourceMapHash: string;
  };
  languages: BindingCoverageLanguage[];
};

export function buildBindingCatalog(params: {
  bindingCoverageReport: BindingCoverageReport;
  expectedSourceMapHash: string;
  schemaSourceMap: {
    schemas: SchemaSourceMapEntry[];
  };
}): BindingCatalog {
  const { bindingCoverageReport, expectedSourceMapHash, schemaSourceMap } = params;
  const schemaSourceMapHash = expectedSourceMapHash || stableHash(schemaSourceMap);
  const generationState =
    bindingCoverageReport.generationBasis.sourceMapHash === schemaSourceMapHash
      ? "IN_SYNC"
      : "STALE_SOURCE_MAP";

  const supportedLanguages = bindingCoverageReport.languages
    .filter((language) => language.families.length > 0)
    .map((language) => ({
      familyCount: language.families.length,
      label: language.label,
      languageRef: language.languageRef,
      summary: language.summary,
    }));

  return {
    catalogVersion: "CONTRACT_BINDING_CATALOG_V1",
    schemaSourceMapHash,
    reportSourceMapHash: bindingCoverageReport.generationBasis.sourceMapHash,
    generationState,
    languages: supportedLanguages,
    schemaBindings: schemaSourceMap.schemas.map((schema) => ({
      schemaName: schema.schemaName,
      schemaId: schema.schemaId,
      logicalFamilyRef: schema.logicalFamilyRef,
      logicalFamilyLabel: schema.logicalFamilyLabel,
      entries: supportedLanguages.flatMap((language) => {
        const family = bindingCoverageReport.languages
          .find((entry) => entry.languageRef === language.languageRef)
          ?.families.find((entry) => entry.familyRef === schema.logicalFamilyRef);

        if (!family) {
          return [];
        }

        return [
          {
            bindingRef: `${language.languageRef}:${family.familyRef}`,
            languageRef: language.languageRef,
            familyRef: family.familyRef,
            familyLabel: family.familyLabel,
            outputRef: family.outputRef,
            coverageClass: family.coverageClass,
            sourceHashAggregate: family.sourceHashAggregate,
            generationState,
            gapIds: [...family.gapIds],
          },
        ];
      }),
    })),
  };
}

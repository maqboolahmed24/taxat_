import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

type StageRef = "SAVE" | "STAGED" | "COMMIT" | "CI";
type ToolFamilyRef = "FORMAT" | "LINT" | "TYPECHECK" | "HOOKS" | "PLAYWRIGHT";
type CoverageSlotKey = "formatter" | "linter" | "typechecker" | "hooks" | "playwright";

type StageLane = {
  stageRef: StageRef;
  label: string;
  summary: string;
};

type ToolFamily = {
  toolFamilyRef: ToolFamilyRef;
  label: string;
  summary: string;
};

type ToolDefinition = {
  toolRef: string;
  toolFamilyRef: ToolFamilyRef;
  label: string;
  summary: string;
  commandRef: string;
  autofixPosture: string;
  blockingPolicy: string;
  ignoredPolicyRefs: string[];
  visibility: "atlas_visible" | "atlas_hidden";
};

type AreaCoverageSlot = {
  toolRef: string;
  stages: StageRef[];
};

type MatrixArea = {
  areaRef: string;
  label: string;
  qualityClass: string;
  owners: string[];
  pathGlobs: string[];
  coverage: Record<CoverageSlotKey, AreaCoverageSlot>;
};

type CodeQualityMatrix = {
  matrixVersion: string;
  workspaceContextChip: string;
  statusSentence: string;
  stageLanes: StageLane[];
  toolFamilies: ToolFamily[];
  toolDefinitions: ToolDefinition[];
  areas: MatrixArea[];
};

type PathPolicy = {
  policyRef: string;
  classification: string;
  pathGlobs: string[];
  editPosture: string;
  formatterPosture: string;
  linterPosture: string;
  typecheckPosture: string;
  hookBehavior: string;
  sourceOfTruth: string;
  notes?: string[];
};

type GeneratedFixturePolicy = {
  policyVersion: string;
  pathPolicies: PathPolicy[];
};

type JsonSchemaEnvelope = {
  $id?: string;
  required?: string[];
  title?: string;
  type?: string;
};

type AtlasToolEntry = {
  tool_ref: string;
  label: string;
  summary: string;
  commandRef: string;
  autofixPosture: string;
  blockingPolicy: string;
  coveredAreas: Array<{
    areaRef: string;
    label: string;
    qualityClass: string;
  }>;
  coveredPaths: string[];
  ignoredPolicies: Array<{
    policyRef: string;
    classification: string;
    sourceOfTruth: string;
  }>;
  stageCells: Array<{
    stageRef: StageRef;
    active: boolean;
    posture: string;
    accessibleLabel: string;
  }>;
};

type AtlasPayload = {
  routeId: string;
  title: string;
  repositoryBadge: string;
  workspaceContextChip: string;
  statusSentence: string;
  dependencyRibbon: string[];
  stageLanes: StageLane[];
  toolFamilies: ToolFamily[];
  tools: Array<{
    tool_family_ref: ToolFamilyRef;
    entries: AtlasToolEntry[];
  }>;
  selectedToolFamilyRef: ToolFamilyRef;
  selectedToolRef: string;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const matrixPath = path.join(repoRoot, "config/tooling/code_quality_matrix.json");
const policyPath = path.join(
  repoRoot,
  "config/tooling/generated_fixture_and_external_code_policy.json",
);
const matrixSchemaPath = path.join(repoRoot, "config/tooling/code_quality_matrix.schema.json");
const policySchemaPath = path.join(
  repoRoot,
  "config/tooling/generated_fixture_and_external_code_policy.schema.json",
);
const atlasDataPath = path.join(
  repoRoot,
  "apps/operator-web/public/internal/code-quality-atlas/data/code-quality-atlas.json",
);

const coverageKeys: CoverageSlotKey[] = [
  "formatter",
  "linter",
  "typechecker",
  "hooks",
  "playwright",
];
const stageRefs: StageRef[] = ["SAVE", "STAGED", "COMMIT", "CI"];
const blockedEditPostures = new Set([
  "REGENERATE_ONLY",
  "SYNC_ONLY",
  "EPHEMERAL_DO_NOT_STAGE",
  "LOCAL_ONLY_DO_NOT_STAGE",
]);
const policyCoverageRequiredClassifications = new Set([
  "GENERATED_CODE",
  "IMPORTED_CANONICAL_MIRROR",
]);

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function toPosix(value: string) {
  return value.split(path.sep).join(path.posix.sep);
}

function matchesAny(relativePath: string, globs: string[]) {
  return globs.some((glob) => path.matchesGlob(relativePath, glob));
}

function uniq<T>(values: T[]) {
  return [...new Set(values)];
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function listDirs(rootPath: string) {
  const entries = await readdir(rootPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function listFiles(rootPath: string, suffix: string) {
  const entries = await readdir(rootPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(suffix))
    .map((entry) => entry.name)
    .sort();
}

async function exists(relativePath: string) {
  try {
    await stat(path.join(repoRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

function validateMatrix(matrix: CodeQualityMatrix) {
  assert(matrix.matrixVersion === "CODE_QUALITY_MATRIX_V1", "Unexpected matrix version.");
  assert(
    JSON.stringify(matrix.stageLanes.map((lane) => lane.stageRef)) === JSON.stringify(stageRefs),
    "Stage lanes must be SAVE, STAGED, COMMIT, CI in order.",
  );
  assert(
    JSON.stringify(matrix.toolFamilies.map((family) => family.toolFamilyRef)) ===
      JSON.stringify(["FORMAT", "LINT", "TYPECHECK", "HOOKS", "PLAYWRIGHT"]),
    "Tool families must cover FORMAT, LINT, TYPECHECK, HOOKS, PLAYWRIGHT.",
  );

  const toolRefs = new Set<string>();
  for (const tool of matrix.toolDefinitions) {
    assert(!toolRefs.has(tool.toolRef), `Duplicate toolRef ${tool.toolRef}.`);
    toolRefs.add(tool.toolRef);
    assert(
      stageRefs.every((stageRef) => typeof stageRef === "string"),
      "Invalid stage refs.",
    );
    assert(
      matrix.toolFamilies.some((family) => family.toolFamilyRef === tool.toolFamilyRef),
      `Tool ${tool.toolRef} references unknown family ${tool.toolFamilyRef}.`,
    );
  }

  const areaRefs = new Set<string>();
  for (const area of matrix.areas) {
    assert(!areaRefs.has(area.areaRef), `Duplicate areaRef ${area.areaRef}.`);
    areaRefs.add(area.areaRef);
    assert(area.pathGlobs.length > 0, `Area ${area.areaRef} must declare path globs.`);
    for (const coverageKey of coverageKeys) {
      const slot = area.coverage[coverageKey];
      assert(slot !== undefined, `Area ${area.areaRef} is missing coverage slot ${coverageKey}.`);
      assert(
        toolRefs.has(slot.toolRef),
        `Area ${area.areaRef} references unknown tool ${slot.toolRef} in ${coverageKey}.`,
      );
      for (const stageRef of slot.stages) {
        assert(
          stageRefs.includes(stageRef),
          `Area ${area.areaRef} uses invalid stage ${stageRef}.`,
        );
      }
    }
  }
}

function validatePolicy(policy: GeneratedFixturePolicy) {
  assert(
    policy.policyVersion === "GENERATED_FIXTURE_AND_EXTERNAL_CODE_POLICY_V1",
    "Unexpected generated fixture policy version.",
  );

  const refs = new Set<string>();
  for (const entry of policy.pathPolicies) {
    assert(!refs.has(entry.policyRef), `Duplicate policyRef ${entry.policyRef}.`);
    refs.add(entry.policyRef);
    assert(entry.pathGlobs.length > 0, `Policy ${entry.policyRef} must declare path globs.`);
  }
}

async function discoverCoverageUnits() {
  const resolveWorkspaceRoots = async (parentDir: string, markerFile: string) =>
    (
      await Promise.all(
        (
          await listDirs(path.join(repoRoot, parentDir))
        ).map(async (dirName) =>
          (await exists(`${parentDir}/${dirName}/${markerFile}`))
            ? `${parentDir}/${dirName}`
            : null,
        ),
      )
    ).filter((value): value is string => value !== null);

  const [
    resolvedAppRoots,
    resolvedAutomationRoots,
    resolvedPackageRoots,
    resolvedToolRoots,
    pythonRoots,
  ] = await Promise.all([
    resolveWorkspaceRoots("apps", "package.json"),
    resolveWorkspaceRoots("automation", "package.json"),
    resolveWorkspaceRoots("packages", "package.json"),
    resolveWorkspaceRoots("tools", "package.json"),
    resolveWorkspaceRoots("python", "pyproject.toml"),
  ]);

  const internalRouteFiles = (
    await listFiles(path.join(repoRoot, "apps/operator-web/src/routes/internal"), ".tsx")
  ).map((fileName) => `apps/operator-web/src/routes/internal/${fileName}`);

  const internalAtlasDirs = (
    await listDirs(path.join(repoRoot, "apps/operator-web/public/internal"))
  ).map((dirName) => `apps/operator-web/public/internal/${dirName}`);

  return {
    workspaceRoots: uniq([
      ...resolvedAppRoots,
      ...resolvedAutomationRoots,
      ...resolvedPackageRoots,
      ...resolvedToolRoots,
      ...pythonRoots,
      "native/TaxatOperator",
    ]),
    internalRouteFiles,
    internalAtlasDirs,
  };
}

function collectAreaCoverageGlobs(matrix: CodeQualityMatrix) {
  return matrix.areas.flatMap((area) => area.pathGlobs);
}

function normalizeGlobAnchor(glob: string) {
  return glob.replace(/\/?\*\*.*$/, "").replace(/\/?\*.*$/, "");
}

function coversWorkspaceRoot(workspaceRoot: string, globs: string[]) {
  return globs.some((glob) => glob === workspaceRoot || glob.startsWith(`${workspaceRoot}/`));
}

function validateSchemaEnvelope(
  schema: JsonSchemaEnvelope,
  expectedTitle: string,
  requiredKeys: string[],
) {
  assert(schema.type === "object", `${expectedTitle} schema must describe an object.`);
  assert(schema.title === expectedTitle, `Unexpected schema title for ${expectedTitle}.`);

  const required = new Set(schema.required ?? []);
  for (const key of requiredKeys) {
    assert(required.has(key), `${expectedTitle} schema must require ${key}.`);
  }
}

function resolvePolicyForPath(relativePath: string, policy: GeneratedFixturePolicy) {
  return policy.pathPolicies.find((entry) => matchesAny(relativePath, entry.pathGlobs)) ?? null;
}

function buildAtlasPayload(
  matrix: CodeQualityMatrix,
  policy: GeneratedFixturePolicy,
): AtlasPayload {
  const policyIndex = new Map(policy.pathPolicies.map((entry) => [entry.policyRef, entry]));
  const visibleTools = matrix.toolDefinitions.filter((tool) => tool.visibility === "atlas_visible");

  const toolsByFamily = matrix.toolFamilies.map((family) => {
    const familyTools = visibleTools
      .filter((tool) => tool.toolFamilyRef === family.toolFamilyRef)
      .map((tool) => {
        const coveringAreas = matrix.areas.filter((area) =>
          coverageKeys.some(
            (coverageKey) =>
              area.coverage[coverageKey].toolRef === tool.toolRef &&
              matrix.toolDefinitions.find((entry) => entry.toolRef === tool.toolRef)
                ?.toolFamilyRef === family.toolFamilyRef,
          ),
        );

        const stages = stageRefs.map((stageRef) => {
          const active = coveringAreas.some((area) =>
            coverageKeys.some(
              (coverageKey) =>
                area.coverage[coverageKey].toolRef === tool.toolRef &&
                area.coverage[coverageKey].stages.includes(stageRef),
            ),
          );
          return {
            stageRef,
            active,
            posture: active ? "ACTIVE" : "NOT_IN_SCOPE",
            accessibleLabel: `${tool.label} ${stageRef} ${active ? "active" : "inactive"}`,
          };
        });

        return {
          tool_ref: tool.toolRef,
          label: tool.label,
          summary: tool.summary,
          commandRef: tool.commandRef,
          autofixPosture: tool.autofixPosture,
          blockingPolicy: tool.blockingPolicy,
          coveredAreas: coveringAreas.map((area) => ({
            areaRef: area.areaRef,
            label: area.label,
            qualityClass: area.qualityClass,
          })),
          coveredPaths: uniq(coveringAreas.flatMap((area) => area.pathGlobs)).sort(),
          ignoredPolicies: tool.ignoredPolicyRefs
            .map((policyRef) => policyIndex.get(policyRef))
            .filter((entry): entry is PathPolicy => entry !== undefined)
            .map((entry) => ({
              policyRef: entry.policyRef,
              classification: entry.classification,
              sourceOfTruth: entry.sourceOfTruth,
            })),
          stageCells: stages,
        } satisfies AtlasToolEntry;
      });

    return {
      tool_family_ref: family.toolFamilyRef,
      entries: familyTools,
    };
  });

  return {
    routeId: "code-quality-atlas",
    title: "Taxat Code Quality Atlas",
    repositoryBadge: "QLT",
    workspaceContextChip: matrix.workspaceContextChip,
    statusSentence: matrix.statusSentence,
    dependencyRibbon: ["source", "generated", "gated", "releasable"],
    stageLanes: matrix.stageLanes,
    toolFamilies: matrix.toolFamilies,
    tools: toolsByFamily,
    selectedToolFamilyRef: "FORMAT",
    selectedToolRef: "BIOME_FORMAT",
  };
}

async function emitAtlasPayload(payload: AtlasPayload) {
  await mkdir(path.dirname(atlasDataPath), { recursive: true });
  await writeFile(atlasDataPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function validateDiscoveryCoverage(
  matrix: CodeQualityMatrix,
  policy: GeneratedFixturePolicy,
  discovery: Awaited<ReturnType<typeof discoverCoverageUnits>>,
) {
  const areaGlobs = collectAreaCoverageGlobs(matrix);
  const failures: string[] = [];

  for (const workspaceRoot of discovery.workspaceRoots) {
    if (!coversWorkspaceRoot(workspaceRoot, areaGlobs)) {
      failures.push(`Uncovered workspace root: ${workspaceRoot}`);
    }
  }

  for (const routeFile of discovery.internalRouteFiles) {
    if (!matchesAny(routeFile, areaGlobs)) {
      failures.push(`Uncovered internal route file: ${routeFile}`);
    }
  }

  for (const atlasDir of discovery.internalAtlasDirs) {
    const atlasRootPattern = `${atlasDir}/**`;
    if (!matchesAny(atlasRootPattern, areaGlobs) && !matchesAny(atlasDir, areaGlobs)) {
      failures.push(`Uncovered internal atlas directory: ${atlasDir}`);
    }
  }

  for (const tool of matrix.toolDefinitions) {
    for (const policyRef of tool.ignoredPolicyRefs) {
      if (!policy.pathPolicies.some((entry) => entry.policyRef === policyRef)) {
        failures.push(`Tool ${tool.toolRef} references unknown policy ${policyRef}.`);
      }
    }
  }

  for (const policyEntry of policy.pathPolicies) {
    if (
      policyCoverageRequiredClassifications.has(policyEntry.classification) &&
      !policyEntry.pathGlobs.some((policyGlob) => {
        const policyAnchor = normalizeGlobAnchor(policyGlob);
        return areaGlobs.some((areaGlob) => {
          const areaAnchor = normalizeGlobAnchor(areaGlob);
          return (
            policyAnchor.length > 0 &&
            areaAnchor.length > 0 &&
            (policyAnchor.startsWith(areaAnchor) || areaAnchor.startsWith(policyAnchor))
          );
        });
      })
    ) {
      failures.push(`Policy ${policyEntry.policyRef} is disconnected from declared repo coverage.`);
    }
  }

  return failures;
}

function normalizeInputFilePath(filePath: string) {
  const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  return toPosix(path.relative(repoRoot, absolute));
}

function stageGuard(
  matrix: CodeQualityMatrix,
  policy: GeneratedFixturePolicy,
  filenames: string[],
) {
  const failures: string[] = [];
  const areaGlobs = collectAreaCoverageGlobs(matrix);

  for (const rawFilename of filenames) {
    const relativePath = normalizeInputFilePath(rawFilename);
    if (!relativePath || relativePath.startsWith("..")) {
      continue;
    }

    const matchedPolicy = resolvePolicyForPath(relativePath, policy);
    if (matchedPolicy && blockedEditPostures.has(matchedPolicy.editPosture)) {
      failures.push(
        `${relativePath} is governed by ${matchedPolicy.policyRef} (${matchedPolicy.editPosture}). Use ${matchedPolicy.sourceOfTruth} instead of editing the file directly.`,
      );
      continue;
    }

    const isGovernedDomain =
      relativePath.startsWith("apps/") ||
      relativePath.startsWith("packages/") ||
      relativePath.startsWith("tools/") ||
      relativePath.startsWith("scripts/") ||
      relativePath.startsWith("infra/") ||
      relativePath.startsWith("python/") ||
      relativePath.startsWith("tests/") ||
      relativePath.startsWith("automation/") ||
      relativePath.startsWith("native/") ||
      relativePath.startsWith("config/") ||
      relativePath.startsWith("docs/") ||
      relativePath.startsWith("data/") ||
      relativePath.startsWith("fixtures/");

    if (isGovernedDomain && !matchesAny(relativePath, areaGlobs) && !matchedPolicy) {
      failures.push(`${relativePath} is not covered by config/tooling/code_quality_matrix.json.`);
    }
  }

  return failures;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const passthroughFiles = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  const [matrix, policy, matrixSchema, policySchema] = await Promise.all([
    readJson<CodeQualityMatrix>(matrixPath),
    readJson<GeneratedFixturePolicy>(policyPath),
    readJson<JsonSchemaEnvelope>(matrixSchemaPath),
    readJson<JsonSchemaEnvelope>(policySchemaPath),
  ]);

  validateSchemaEnvelope(matrixSchema, "Code Quality Matrix", [
    "matrixVersion",
    "stageLanes",
    "toolFamilies",
    "toolDefinitions",
    "areas",
  ]);
  validateSchemaEnvelope(policySchema, "Generated Fixture And External Code Policy", [
    "policyVersion",
    "pathPolicies",
  ]);
  validateMatrix(matrix);
  validatePolicy(policy);

  const discovery = await discoverCoverageUnits();
  const failures = validateDiscoveryCoverage(matrix, policy, discovery);

  if (args.has("--stage-guard")) {
    failures.push(...stageGuard(matrix, policy, passthroughFiles));
  }

  const atlasPayload = buildAtlasPayload(matrix, policy);
  if (args.has("--emit") || args.has("--emit-atlas")) {
    await emitAtlasPayload(atlasPayload);
  }

  if (failures.length > 0) {
    failures.forEach((failure) => console.error(failure));
    process.exitCode = 1;
    return;
  }

  console.log(
    `${args.has("--stage-guard") ? "verified staged guard" : "verified code quality coverage"}: ${matrix.areas.length} areas across ${matrix.toolDefinitions.length} tool definitions`,
  );
  if (args.has("--emit") || args.has("--emit-atlas")) {
    console.log(`atlas payload: ${toPosix(path.relative(repoRoot, atlasDataPath))}`);
  }
}

await main();

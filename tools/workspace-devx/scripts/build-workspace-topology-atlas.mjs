import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..");
const outputPath = path.join(
  repoRoot,
  "apps/operator-web/public/internal/workspace-topology-atlas/data/workspace-topology-atlas.json",
);

function readJson(relativePath) {
  return readFile(path.join(repoRoot, relativePath), "utf8").then((value) => JSON.parse(value));
}

function ownerHandleFor(teamId) {
  const ownerHandles = {
    team_foundations_contracts: "@taxat/foundations-contracts",
    team_engine_core: "@taxat/engine-core",
    team_authority_workflow: "@taxat/authority-workflow",
    team_control_plane_runtime: "@taxat/control-plane-runtime",
    team_web_experience: "@taxat/web-experience",
    team_native_experience: "@taxat/native-experience",
    team_reliability_release: "@taxat/reliability-release",
  };
  return ownerHandles[teamId] ?? "@taxat/unassigned";
}

function runtimeSurfaceFor(packageId, packageType) {
  if (packageId === "contracts-core") {
    return "Canonical schema authority";
  }
  if (packageId === "generated-models") {
    return "Generated contract consumption";
  }
  if (packageId === "runtime-foundation") {
    return "Cross-runtime primitives";
  }
  if (packageId === "domain-kernel") {
    return "UI-agnostic domain legality";
  }
  if (packageId === "web-platform") {
    return "Shared browser route/runtime layer";
  }
  if (packageId === "native-platform") {
    return "Swift-native bindings and scene bridges";
  }
  if (packageId === "testing-harnesses") {
    return "Shared regression harnesses";
  }
  if (packageId === "workspace-devx") {
    return "Workspace tooling and graph orchestration";
  }
  if (packageId === "apps/control-plane-api") {
    return "Backend control-plane surface";
  }
  if (packageId === "apps/operator-web") {
    return "Internal operator browser surface";
  }
  if (packageId === "apps/client-portal-web") {
    return "Client-safe browser surface";
  }
  if (packageId === "apps/internal-operator-macos") {
    return "Signed native operator surface";
  }
  if (packageId === "apps/provisioning-workbench") {
    return "Provisioning/readiness utility surface";
  }
  if (packageType === "app") {
    return "Planned app surface";
  }
  return "Planned shared runtime package";
}

function categoryForNode(packageId, familyRef) {
  if (familyRef === "GENERATED") {
    return "GENERATED_PACKAGE";
  }
  if (familyRef === "PYTHON_TOOLING") {
    return "PYTHON_TOOLING";
  }
  if (familyRef === "NATIVE_MACOS") {
    return "NATIVE_WORKSPACE";
  }
  if (packageId.startsWith("apps/")) {
    return "SOURCE_APP";
  }
  return "SOURCE_PACKAGE";
}

function familyRefForRow(row) {
  if (row.package_id === "generated-models") {
    return "GENERATED";
  }
  if (row.package_type === "app") {
    return "APPS";
  }
  return "SHARED_PACKAGES";
}

function familyLabelForRef(familyRef) {
  return familyRef;
}

function familySummaryForRef(familyRef) {
  const summaries = {
    APPS: "Edge composition surfaces for browser, backend, native, and provisioning utility entrypoints.",
    SHARED_PACKAGES:
      "Source-of-truth packages, runtime foundations, platform layers, and tooling seams that keep reusable logic out of app shells.",
    GENERATED: "One-way contract outputs derived from canonical schema sources.",
    PYTHON_TOOLING:
      "Validator and forensic entrypoints that stay first-class outside the Node workspace graph.",
    NATIVE_MACOS:
      "Signed macOS workspace boundary, Swift package seed, and Xcode-owned delivery surface.",
  };
  return summaries[familyRef];
}

function sortNodes(left, right) {
  if (left.layer !== right.layer) {
    return left.layer - right.layer;
  }
  return left.label.localeCompare(right.label);
}

const manifestPaths = {
  "contracts-core": "packages/contracts-core/package.json",
  "generated-models": "packages/generated-models/package.json",
  "runtime-foundation": "packages/runtime-foundation/package.json",
  "domain-kernel": "packages/domain-kernel/package.json",
  "web-platform": "packages/web-platform/package.json",
  "native-platform": "packages/native-platform/package.json",
  "testing-harnesses": "packages/testing-harnesses/package.json",
  "workspace-devx": "tools/workspace-devx/package.json",
  "apps/control-plane-api": "apps/control-plane-api/package.json",
  "apps/operator-web": "apps/operator-web/package.json",
  "apps/client-portal-web": "apps/client-portal-web/package.json",
  "apps/internal-operator-macos": "apps/internal-operator-macos/package.json",
  "apps/provisioning-workbench": "apps/provisioning-workbench/package.json",
};

async function exists(relativePath) {
  try {
    await readFile(path.join(repoRoot, relativePath), "utf8");
    return true;
  } catch {
    return false;
  }
}

async function buildAtlasPayload() {
  const [boundaryMatrix, dependencyRules, laterTaskMap] = await Promise.all([
    readJson("data/analysis/package_boundary_matrix.json"),
    readJson("data/analysis/package_dependency_rules.json"),
    readJson("data/analysis/later_task_to_package_map.json"),
  ]);

  const primaryTaskCounts = laterTaskMap.package_primary_task_counts ?? {};
  const dependencyRows = new Map(
    (dependencyRules.production_dependency_rules ?? []).map((row) => [row.package_id, row]),
  );

  const nodes = await Promise.all(
    boundaryMatrix.rows.map(async (row) => {
      const familyRef = familyRefForRow(row);
      const manifestPath = manifestPaths[row.package_id] ?? path.join(row.path, "package.json");
      const bootstrapped = await exists(manifestPath);
      return {
        node_ref: row.package_id,
        label: row.label,
        family_ref: familyRef,
        path: row.path,
        manifest_path: manifestPath,
        owner_team_id: row.owner_team_id,
        owner_team_handle: ownerHandleFor(row.owner_team_id),
        package_type: row.package_type,
        layer: row.layer,
        category: categoryForNode(row.package_id, familyRef),
        status: bootstrapped ? "BOOTSTRAPPED" : "PLANNED",
        runtime_surface: runtimeSurfaceFor(row.package_id, row.package_type),
        dependencies: dependencyRows.get(row.package_id)?.allowed_dependencies ?? [],
        task_families:
          row.package_type === "app"
            ? ["build", "typecheck", "test"]
            : row.package_id === "workspace-devx"
              ? ["build", "generate", "typecheck", "test", "lint"]
              : ["build", "typecheck", "test", "lint"],
        primary_task_count: primaryTaskCounts[row.package_id] ?? row.primary_task_count ?? 0,
        future_task_clusters: row.future_task_clusters ?? [],
        detail: row.responsibilities?.[0] ?? "Package boundary reserved by the monorepo bootstrap.",
        note:
          row.responsibilities?.[1] ??
          row.generated_boundary_policy ??
          "Bootstrap manifest present; implementation remains for later tasks.",
        source_refs: row.source_refs ?? [],
      };
    }),
  );

  nodes.push(
    {
      node_ref: "apps/provisioning-workbench",
      label: "Provisioning Workbench Utility",
      family_ref: "APPS",
      path: "apps/provisioning-workbench",
      manifest_path: manifestPaths["apps/provisioning-workbench"],
      owner_team_id: "team_foundations_contracts",
      owner_team_handle: "@taxat/foundations-contracts",
      package_type: "app",
      layer: 8,
      category: "SOURCE_APP",
      status: (await exists(manifestPaths["apps/provisioning-workbench"]))
        ? "BOOTSTRAPPED"
        : "PLANNED",
      runtime_surface: "Provisioning/readiness utility surface",
      dependencies: ["generated-models", "testing-harnesses", "web-platform"],
      task_families: ["build", "typecheck", "test"],
      primary_task_count: 0,
      future_task_clusters: ["phase_01_provisioning_support"],
      detail:
        "Bootstrap utility app reserved for provisioning/readiness viewers without replacing the four edge-product apps chosen in phase 00.",
      note: "This node is an explicit provider override recorded by pc_0059 so current provisioning utilities have a future monorepo home.",
      source_refs: [
        "PROMPT/CARDS/pc_0059.md",
        "docs/architecture/monorepo-package-boundaries-and-team-ownership-map.md",
      ],
    },
    {
      node_ref: "python/validators",
      label: "Validators and Forensic Guards",
      family_ref: "PYTHON_TOOLING",
      path: "python/validators",
      manifest_path: "python/validators/pyproject.toml",
      owner_team_id: "team_foundations_contracts",
      owner_team_handle: "@taxat/foundations-contracts",
      package_type: "python_tooling",
      layer: 7,
      category: "PYTHON_TOOLING",
      status: (await exists("python/validators/README.md")) ? "BOOTSTRAPPED" : "PLANNED",
      runtime_surface: "Python validator and forensic tooling",
      dependencies: ["contracts-core"],
      task_families: ["validate-contracts", "forensic"],
      primary_task_count: 0,
      future_task_clusters: ["phase_02_seq_060", "validator_support"],
      detail:
        "Python remains first-class for contract validation, forensic guards, and offline tooling without JS transpilation assumptions.",
      note: "The bootstrap CLI forwards to the existing Algorithm validator entrypoints until shared helpers are moved here.",
      source_refs: [
        "Algorithm/README.md::Validation",
        "data/analysis/language_runtime_role_assignment.json",
      ],
    },
    {
      node_ref: "native/TaxatOperator",
      label: "TaxatOperator Xcode Workspace",
      family_ref: "NATIVE_MACOS",
      path: "native/TaxatOperator",
      manifest_path: "native/TaxatOperator/Package.swift",
      owner_team_id: "team_native_experience",
      owner_team_handle: "@taxat/native-experience",
      package_type: "native_workspace",
      layer: 8,
      category: "NATIVE_WORKSPACE",
      status: (await exists("native/TaxatOperator/README.md")) ? "BOOTSTRAPPED" : "PLANNED",
      runtime_surface: "Signed macOS Xcode and SwiftPM boundary",
      dependencies: ["generated-models", "native-platform"],
      task_families: ["xcodebuild", "swift test", "notarize"],
      primary_task_count: 12,
      future_task_clusters: ["frontend_native"],
      detail:
        "Signed macOS operator delivery remains Xcode-owned and coexists with the Node workspace without being forced through Node-only build assumptions.",
      note: "The app identity remains apps/internal-operator-macos while the native sources and workspace live here.",
      source_refs: [
        "Algorithm/macos_native_operator_workspace_blueprint.md",
        "data/analysis/package_boundary_matrix.json",
      ],
    },
  );

  const families = ["APPS", "SHARED_PACKAGES", "GENERATED", "PYTHON_TOOLING", "NATIVE_MACOS"].map(
    (familyRef) => ({
      family_ref: familyRef,
      label: familyLabelForRef(familyRef),
      summary: familySummaryForRef(familyRef),
      nodes: nodes.filter((node) => node.family_ref === familyRef).sort(sortNodes),
    }),
  );

  return {
    routeId: "workspace-topology-atlas",
    title: "Taxat Workspace Topology Atlas",
    repositoryBadge: "TX",
    repositoryName: "Taxat monorepo bootstrap",
    languageStackBadge: "Node 24 · Python 3.14 · Swift workspace boundary",
    bootstrapPosture: "PROVIDER_OVERRIDE_APPLIED",
    postureChipLabel: "ADR-aligned package overrides recorded",
    summary:
      "The workspace bootstrap follows the accepted phase-00 package map, exposes the first real package/app manifests, and keeps Python plus signed macOS boundaries first-class instead of shoving everything through a Node-only skeleton.",
    legend: [
      { label: "Source package", tone: "neutral" },
      { label: "Generated package", tone: "warning" },
      { label: "Python tooling", tone: "success" },
      { label: "Native workspace", tone: "danger" },
    ],
    families,
    selectedFamilyRef: "APPS",
    selectedNodeRef: "apps/operator-web",
    overrides: [
      {
        requested: "packages/contracts",
        adopted: "packages/contracts-core",
        reason:
          "Phase-00 package boundary map fixed contracts-core as the canonical source-of-truth package id and path.",
      },
      {
        requested: "packages/generated-types",
        adopted: "packages/generated-models",
        reason:
          "Generated-models was already frozen as the one-way downstream boundary from contracts-core.",
      },
      {
        requested: "packages/config",
        adopted: "packages/runtime-foundation",
        reason:
          "Typed config belongs inside the broader runtime-foundation seam that also owns ids, hashes, decimals, and time primitives.",
      },
      {
        requested: "packages/shared-ui",
        adopted: "packages/web-platform",
        reason:
          "The accepted map grouped shared web selectors, route/runtime semantics, and tokens under web-platform rather than a generic shared-ui bucket.",
      },
      {
        requested: "packages/playwright-kit",
        adopted: "packages/testing-harnesses",
        reason:
          "Playwright support is a subset of the wider testing-harnesses package family that spans browser, API, release, and native regression tooling.",
      },
      {
        requested: "native/TaxatOperator only",
        adopted: "apps/internal-operator-macos + native/TaxatOperator",
        reason:
          "The app identity stays in the workspace graph while Xcode and SwiftPM sources remain in a native-owned boundary outside Node-only build assumptions.",
      },
    ],
  };
}

const payload = await buildAtlasPayload();

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`workspace topology atlas data written to ${path.relative(repoRoot, outputPath)}`);

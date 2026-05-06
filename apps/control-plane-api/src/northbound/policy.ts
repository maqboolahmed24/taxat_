import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  CommandEnvelopeSchemaLineage,
  ProblemEnvelopeSchemaLineage,
  type CommandEnvelope,
  type CommandTruthBoundaryContract,
  type MutationPreconditionBinding,
  type ProblemEnvelope,
} from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import {
  ApiCommandReceiptSchemaLineage,
  type ApiCommandReceipt,
} from "../../../../packages/generated-models/src/generated/typescript/manifest-and-release.ts";
import {
  RouteStabilityContractSchemaLineage,
  type RouteStabilityContract,
} from "../../../../packages/generated-models/src/generated/typescript/surface-and-experience.ts";
import { stableJsonHash } from "../../../../packages/domain-kernel/src/primitives/hash.ts";

export type CommandScopeClass = CommandEnvelope["target_scope_class"];
export type GuardFieldName = MutationPreconditionBinding["required_guard_fields"][number];
export type MutationProfileCode = MutationPreconditionBinding["profile_code"];
export type ProblemActionabilityState = ProblemEnvelope["actionability_state"];
export type ProblemSurfaceCode = ProblemEnvelope["suggested_detail_surface_code"];
export type ProjectionStreamClass = ApiCommandReceipt["projection_stream_class"];
export type RouteScopeClass = RouteStabilityContract["route_scope_class"];
export type StaleGuardFamily = NonNullable<ApiCommandReceipt["stale_guard_family"]>;
export type StaleGuardValue = NonNullable<ApiCommandReceipt["latest_stale_guard_value"]>;

export type RecoveryRefFamily =
  | "DECISION_BUNDLE"
  | "WORKSPACE_SNAPSHOT"
  | "CLIENT_PORTAL_WORKSPACE"
  | "APPROVAL_PACK"
  | "UPLOAD_SESSION"
  | "POLICY_SNAPSHOT"
  | "MANIFEST_RESUME";

export type CommandBindingKey = GuardFieldName | "mutation_basis_contract_hash";

export type NorthboundActorContext = {
  tenant_id: string;
  principal_ref: string;
  session_ref: string;
  client_id_or_null: string | null;
  access_binding_hash_or_null?: string | null;
  masking_posture_fingerprint_or_null?: string | null;
};

export type CommandFamilyPolicyRow = {
  command_type: string;
  display_name: string;
  family_group: "MANIFEST" | "CLIENT_PORTAL" | "COLLABORATION" | "GOVERNANCE";
  target_scope_class: CommandScopeClass;
  route_scope_class: RouteScopeClass;
  projection_stream_class: ProjectionStreamClass;
  dispatch_posture: string;
  requires_client_id: boolean;
  requires_governance_simulation_basis: boolean;
  default_problem_detail_surface_code: ProblemSurfaceCode;
  default_recovery_ref_family: RecoveryRefFamily;
  exact_duplicate_policy: "RETURN_EXISTING_RECEIPT";
  notes: string[];
  mutation_precondition_binding: MutationPreconditionBinding;
};

export type ProblemCodeCatalogRow = {
  problem_code: string;
  title: string;
  detail_template: string;
  http_status: number;
  retryable: boolean;
  rebase_required: boolean;
  actionability_state: ProblemActionabilityState;
  suggested_detail_surface_code: ProblemSurfaceCode;
  default_reason_codes: string[];
  notes: string[];
};

export type StaleGuardProfileRow = {
  profile_code: MutationProfileCode;
  route_scope_class: RouteScopeClass;
  requires_live_freshness: boolean;
  invalidates_on_visibility_shift: boolean;
  guard_rows: Array<{
    command_binding: CommandBindingKey;
    stale_guard_family: StaleGuardFamily;
    route_component: keyof RouteStabilityContract["guard_vector_components"];
    value_kind: "string" | "integer";
    mismatch_problem_code: string;
    recovery_ref_family: RecoveryRefFamily;
  }>;
  notes: string[];
};

export type CommandFamilyMatrix = {
  contract_version: "NORTHBOUND_COMMAND_FAMILY_MATRIX_V1";
  matrix_id: string;
  basis_statement: string;
  command_family_rows: CommandFamilyPolicyRow[];
  source_lineage: Array<{
    source_file: string;
    source_ref: string;
  }>;
};

export type ProblemCodeCatalog = {
  contract_version: "NORTHBOUND_PROBLEM_CODE_CATALOG_V1";
  catalog_id: string;
  basis_statement: string;
  problem_rows: ProblemCodeCatalogRow[];
  source_lineage: Array<{
    source_file: string;
    source_ref: string;
  }>;
};

export type StaleGuardProfileMatrix = {
  contract_version: "NORTHBOUND_STALE_GUARD_PROFILE_MATRIX_V1";
  matrix_id: string;
  basis_statement: string;
  stale_guard_profiles: StaleGuardProfileRow[];
  source_lineage: Array<{
    source_file: string;
    source_ref: string;
  }>;
};

export type SchemaContractInfo = {
  schemaId: string;
  sourceHash: string;
  title: string;
  requiredKeys: string[];
};

export type NorthboundPolicyBundle = {
  commandFamilyMatrix: CommandFamilyMatrix;
  problemCodeCatalog: ProblemCodeCatalog;
  staleGuardProfileMatrix: StaleGuardProfileMatrix;
  commandFamiliesByType: Map<string, CommandFamilyPolicyRow>;
  problemCodesByCode: Map<string, ProblemCodeCatalogRow>;
  staleProfilesByCode: Map<MutationProfileCode, StaleGuardProfileRow>;
  schemas: {
    commandEnvelope: SchemaContractInfo;
    problemEnvelope: SchemaContractInfo;
    apiCommandReceipt: SchemaContractInfo;
    routeStabilityContract: SchemaContractInfo;
  };
};

export type NorthboundRouteState = {
  route_scope_class: RouteScopeClass;
  publication_generation: number;
  guard_vector_components: RouteStabilityContract["guard_vector_components"];
  last_published_sequence_or_null: number | null;
  resume_token_or_null: string | null;
  resume_capability: RouteStabilityContract["resume_capability"];
  latest_refs: {
    decision_bundle_ref_or_null: string | null;
    workspace_snapshot_ref_or_null: string | null;
    approval_pack_ref_or_null: string | null;
    client_portal_workspace_ref_or_null: string | null;
    upload_session_ref_or_null: string | null;
    policy_snapshot_ref_or_null: string | null;
    command_receipt_ref_or_null: string | null;
  };
};

export type NorthboundRecoveryRefs = {
  latest_decision_bundle_ref: string | null;
  latest_workspace_snapshot_ref: string | null;
  latest_approval_pack_ref: string | null;
  latest_client_portal_workspace_ref: string | null;
  latest_upload_session_ref: string | null;
  latest_policy_snapshot_ref: string | null;
  latest_resume_token: string | null;
};

export class NorthboundBoundaryError extends Error {
  readonly problemCode: string;
  readonly reasonCodes: string[];
  readonly detailOverride: string | null;

  constructor(problemCode: string, reasonCodes: string[], detailOverride?: string | null) {
    super(problemCode);
    this.name = "NorthboundBoundaryError";
    this.problemCode = problemCode;
    this.reasonCodes = reasonCodes;
    this.detailOverride = detailOverride ?? null;
  }
}

const COMMAND_REQUEST_RECORD_FAMILIES = [
  "RUN_MANIFEST",
  "WORKFLOW_ITEM",
  "GOVERNANCE_DOMAIN_OBJECT",
] as const satisfies CommandTruthBoundaryContract["authoritative_record_families"];

const COMMAND_REQUEST_PROJECTION_FAMILIES = [
  "DECISION_BUNDLE",
  "EXPERIENCE_DELTA",
  "LOW_NOISE_EXPERIENCE_FRAME",
  "WORKSPACE_SNAPSHOT",
  "CLIENT_PORTAL_WORKSPACE",
  "GOVERNANCE_POLICY_SNAPSHOT",
  "CLIENT_APPROVAL_PACK",
] as const satisfies CommandTruthBoundaryContract["observable_projection_families"];

const RECEIPT_RECORD_FAMILIES = [
  "RUN_MANIFEST",
  "WORKFLOW_ITEM",
  "AUTHORITY_INTERACTION_RECORD",
  "GOVERNANCE_DOMAIN_OBJECT",
  "AUDIT_EVENT",
  "API_COMMAND_RECEIPT",
] as const satisfies CommandTruthBoundaryContract["authoritative_record_families"];

const RECEIPT_PROJECTION_FAMILIES = [
  "DECISION_BUNDLE",
  "EXPERIENCE_DELTA",
  "LOW_NOISE_EXPERIENCE_FRAME",
  "WORKSPACE_SNAPSHOT",
  "CLIENT_PORTAL_WORKSPACE",
  "CLIENT_APPROVAL_PACK",
  "CLIENT_UPLOAD_SESSION",
  "GOVERNANCE_POLICY_SNAPSHOT",
] as const satisfies CommandTruthBoundaryContract["observable_projection_families"];

const PROBLEM_PROJECTION_FAMILIES = [
  "DECISION_BUNDLE",
  "WORKSPACE_SNAPSHOT",
  "CLIENT_PORTAL_WORKSPACE",
  "CLIENT_APPROVAL_PACK",
  "CLIENT_UPLOAD_SESSION",
  "GOVERNANCE_POLICY_SNAPSHOT",
] as const satisfies CommandTruthBoundaryContract["observable_projection_families"];

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
export const northboundConfigDir = path.join(repoRoot, "config", "northbound");
export const northboundAtlasDataPath = path.join(
  repoRoot,
  "apps",
  "operator-web",
  "public",
  "internal",
  "northbound-boundary-atlas",
  "data",
  "northbound-boundary-atlas.json",
);

const schemaPaths = {
  apiCommandReceipt: path.join(
    repoRoot,
    "packages",
    "contracts-core",
    "schemas",
    "api_command_receipt.schema.json",
  ),
  commandEnvelope: path.join(
    repoRoot,
    "packages",
    "contracts-core",
    "schemas",
    "command_envelope.schema.json",
  ),
  problemEnvelope: path.join(
    repoRoot,
    "packages",
    "contracts-core",
    "schemas",
    "problem_envelope.schema.json",
  ),
  routeStabilityContract: path.join(
    repoRoot,
    "packages",
    "contracts-core",
    "schemas",
    "route_stability_contract.schema.json",
  ),
} as const;

const jsonPaths = {
  commandFamilyMatrix: path.join(northboundConfigDir, "command_family_matrix.json"),
  problemCodeCatalog: path.join(northboundConfigDir, "problem_code_catalog.json"),
  staleGuardProfileMatrix: path.join(northboundConfigDir, "stale_guard_profile_matrix.json"),
} as const;

let cachedPolicyBundle: Promise<NorthboundPolicyBundle> | null = null;

function sha256Hex(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function relativeRepoPath(filePath: string) {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
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

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)];
}

function arraysEqual(left: readonly string[], right: readonly string[]) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function validateSchemaEnvelope(
  schema: {
    title?: string;
    required?: string[];
  },
  expectedTitle: string,
  requiredKeys: string[],
  sourceHash: string,
  schemaId: string,
): SchemaContractInfo {
  assertCondition(
    schema.title === expectedTitle,
    `Expected imported schema title ${expectedTitle}, received ${schema.title ?? "null"}.`,
  );
  const required = new Set(schema.required ?? []);
  for (const key of requiredKeys) {
    assertCondition(required.has(key), `${expectedTitle} schema must require ${key}.`);
  }
  return {
    schemaId,
    sourceHash,
    title: expectedTitle,
    requiredKeys: requiredKeys.slice(),
  };
}

function validateProblemCatalog(problemCodeCatalog: ProblemCodeCatalog) {
  assertCondition(
    problemCodeCatalog.contract_version === "NORTHBOUND_PROBLEM_CODE_CATALOG_V1",
    "Problem code catalog contract_version is invalid.",
  );
  const seen = new Set<string>();
  for (const row of problemCodeCatalog.problem_rows) {
    assertCondition(!seen.has(row.problem_code), `Duplicate problem_code ${row.problem_code}.`);
    seen.add(row.problem_code);
    assertCondition(row.title.length > 0, `${row.problem_code} requires a title.`);
    assertCondition(row.detail_template.length > 0, `${row.problem_code} requires detail_template.`);
    assertCondition(
      uniqueStrings(row.default_reason_codes).length === row.default_reason_codes.length,
      `${row.problem_code} default_reason_codes must be unique.`,
    );
    if (row.actionability_state === "ACTION_AVAILABLE") {
      assertCondition(
        row.suggested_detail_surface_code === null,
        `${row.problem_code} cannot publish suggested_detail_surface_code when actionability_state=ACTION_AVAILABLE.`,
      );
    } else {
      assertCondition(
        row.suggested_detail_surface_code !== null,
        `${row.problem_code} must publish suggested_detail_surface_code when actionability_state=NO_SAFE_ACTION.`,
      );
    }
  }
}

function validateStaleProfileMatrix(staleGuardProfileMatrix: StaleGuardProfileMatrix) {
  assertCondition(
    staleGuardProfileMatrix.contract_version === "NORTHBOUND_STALE_GUARD_PROFILE_MATRIX_V1",
    "Stale guard profile matrix contract_version is invalid.",
  );
  const seen = new Set<string>();
  for (const profile of staleGuardProfileMatrix.stale_guard_profiles) {
    assertCondition(!seen.has(profile.profile_code), `Duplicate stale profile ${profile.profile_code}.`);
    seen.add(profile.profile_code);
    assertCondition(profile.guard_rows.length > 0, `${profile.profile_code} requires guard_rows.`);
    const guardFamilies = new Set<string>();
    for (const guardRow of profile.guard_rows) {
      assertCondition(
        !guardFamilies.has(guardRow.stale_guard_family),
        `${profile.profile_code} repeats stale_guard_family ${guardRow.stale_guard_family}.`,
      );
      guardFamilies.add(guardRow.stale_guard_family);
      assertCondition(
        guardRow.mismatch_problem_code.length > 0,
        `${profile.profile_code} guard row ${guardRow.stale_guard_family} requires mismatch_problem_code.`,
      );
    }
  }
}

function validateCommandFamilyMatrix(
  commandFamilyMatrix: CommandFamilyMatrix,
  problemCodeCatalog: ProblemCodeCatalog,
  staleGuardProfileMatrix: StaleGuardProfileMatrix,
) {
  assertCondition(
    commandFamilyMatrix.contract_version === "NORTHBOUND_COMMAND_FAMILY_MATRIX_V1",
    "Command family matrix contract_version is invalid.",
  );

  const problemCodes = new Set(problemCodeCatalog.problem_rows.map((row) => row.problem_code));
  const profilesByCode = new Map(
    staleGuardProfileMatrix.stale_guard_profiles.map((row) => [row.profile_code, row] as const),
  );
  const seen = new Set<string>();

  for (const row of commandFamilyMatrix.command_family_rows) {
    assertCondition(!seen.has(row.command_type), `Duplicate command_type ${row.command_type}.`);
    seen.add(row.command_type);

    const profile = profilesByCode.get(row.mutation_precondition_binding.profile_code);
    assertCondition(
      profile,
      `${row.command_type} references unknown mutation profile ${row.mutation_precondition_binding.profile_code}.`,
    );
    assertCondition(
      profile.route_scope_class === row.route_scope_class,
      `${row.command_type} route_scope_class must match ${row.mutation_precondition_binding.profile_code}.`,
    );
    assertCondition(
      row.mutation_precondition_binding.requires_live_freshness === profile.requires_live_freshness,
      `${row.command_type} freshness policy must match ${row.mutation_precondition_binding.profile_code}.`,
    );
    assertCondition(
      row.mutation_precondition_binding.invalidates_on_visibility_shift ===
        profile.invalidates_on_visibility_shift,
      `${row.command_type} visibility-shift policy must match ${row.mutation_precondition_binding.profile_code}.`,
    );
    assertCondition(
      arraysEqual(
        row.mutation_precondition_binding.required_guard_fields,
        profile.guard_rows
          .filter((guardRow) => guardRow.command_binding !== "mutation_basis_contract_hash")
          .map((guardRow) => guardRow.command_binding as GuardFieldName),
      ),
      `${row.command_type} required_guard_fields must match ${row.mutation_precondition_binding.profile_code}.`,
    );
    assertCondition(
      arraysEqual(
        row.mutation_precondition_binding.stale_guard_families,
        profile.guard_rows.map((guardRow) => guardRow.stale_guard_family),
      ),
      `${row.command_type} stale_guard_families must match ${row.mutation_precondition_binding.profile_code}.`,
    );

    for (const guardRow of profile.guard_rows) {
      assertCondition(
        problemCodes.has(guardRow.mismatch_problem_code),
        `${row.command_type} references unknown mismatch_problem_code ${guardRow.mismatch_problem_code}.`,
      );
    }

    if (row.projection_stream_class === "MANIFEST_EXPERIENCE") {
      assertCondition(
        row.target_scope_class === "MANIFEST",
        `${row.command_type} cannot use MANIFEST_EXPERIENCE outside MANIFEST scope.`,
      );
    }
    if (row.projection_stream_class === "WORKSPACE") {
      assertCondition(
        row.target_scope_class === "WORK_ITEM",
        `${row.command_type} cannot use WORKSPACE projection outside WORK_ITEM scope.`,
      );
    }
    if (row.requires_governance_simulation_basis) {
      assertCondition(
        row.target_scope_class === "GOVERNANCE",
        `${row.command_type} requires governance simulation basis but does not target GOVERNANCE scope.`,
      );
    }
  }
}

export function createCommandRequestTruthBoundaryContract(): CommandTruthBoundaryContract {
  return {
    contract_version: "COMMAND_TRUTH_BOUNDARY_V1",
    artifact_role: "COMMAND_REQUEST",
    authoritative_source_policy: "TARGET_DURABLE_IDS_ONLY",
    projection_input_policy: "STALE_GUARDS_ONLY",
    durable_writeback_policy: "NO_DIRECT_STATE_WRITEBACK",
    recovery_basis_policy: "DURABLE_IDS_AND_RECEIPTS_ONLY",
    authoritative_record_families: COMMAND_REQUEST_RECORD_FAMILIES.slice(),
    observable_projection_families: COMMAND_REQUEST_PROJECTION_FAMILIES.slice(),
  };
}

export function createReceiptTruthBoundaryContract(): CommandTruthBoundaryContract {
  return {
    contract_version: "COMMAND_TRUTH_BOUNDARY_V1",
    artifact_role: "BOUNDARY_RECEIPT",
    authoritative_source_policy: "DURABLE_COMMAND_RESULTS_ONLY",
    projection_input_policy: "STALE_GUARDS_AND_RECOVERY_MIRRORS_ONLY",
    durable_writeback_policy: "APPEND_ONLY_BOUNDARY_EVIDENCE",
    recovery_basis_policy: "RECEIPT_PLUS_DURABLE_RESULTS_ONLY",
    authoritative_record_families: RECEIPT_RECORD_FAMILIES.slice(),
    observable_projection_families: RECEIPT_PROJECTION_FAMILIES.slice(),
  };
}

export function createProblemTruthBoundaryContract(): CommandTruthBoundaryContract {
  return {
    contract_version: "COMMAND_TRUTH_BOUNDARY_V1",
    artifact_role: "BOUNDARY_RECEIPT",
    authoritative_source_policy: "DURABLE_COMMAND_RESULTS_ONLY",
    projection_input_policy: "STALE_GUARDS_AND_RECOVERY_MIRRORS_ONLY",
    durable_writeback_policy: "APPEND_ONLY_BOUNDARY_EVIDENCE",
    recovery_basis_policy: "RECEIPT_PLUS_DURABLE_RESULTS_ONLY",
    authoritative_record_families: RECEIPT_RECORD_FAMILIES.slice(),
    observable_projection_families: PROBLEM_PROJECTION_FAMILIES.slice(),
  };
}

export function buildRouteStabilityContract(routeState: NorthboundRouteState): RouteStabilityContract {
  const guard_vector_hash = stableJsonHash(routeState.guard_vector_components);
  return {
    route_scope_class: routeState.route_scope_class,
    publication_generation: routeState.publication_generation,
    guard_vector_hash,
    guard_vector_components: routeState.guard_vector_components,
    last_published_sequence_or_null: routeState.last_published_sequence_or_null,
    resume_token_or_null: routeState.resume_token_or_null,
    resume_capability: routeState.resume_capability,
  };
}

export function selectRecoveryRefs(
  routeState: NorthboundRouteState,
  recoveryRefFamily: RecoveryRefFamily,
): NorthboundRecoveryRefs {
  switch (recoveryRefFamily) {
    case "DECISION_BUNDLE":
      return {
        latest_decision_bundle_ref: routeState.latest_refs.decision_bundle_ref_or_null,
        latest_workspace_snapshot_ref: null,
        latest_approval_pack_ref: null,
        latest_client_portal_workspace_ref: null,
        latest_upload_session_ref: null,
        latest_policy_snapshot_ref: null,
        latest_resume_token: null,
      };
    case "WORKSPACE_SNAPSHOT":
      return {
        latest_decision_bundle_ref: null,
        latest_workspace_snapshot_ref: routeState.latest_refs.workspace_snapshot_ref_or_null,
        latest_approval_pack_ref: null,
        latest_client_portal_workspace_ref: null,
        latest_upload_session_ref: null,
        latest_policy_snapshot_ref: null,
        latest_resume_token: null,
      };
    case "CLIENT_PORTAL_WORKSPACE":
      return {
        latest_decision_bundle_ref: null,
        latest_workspace_snapshot_ref: null,
        latest_approval_pack_ref: null,
        latest_client_portal_workspace_ref:
          routeState.latest_refs.client_portal_workspace_ref_or_null,
        latest_upload_session_ref: null,
        latest_policy_snapshot_ref: null,
        latest_resume_token: null,
      };
    case "APPROVAL_PACK":
      return {
        latest_decision_bundle_ref: null,
        latest_workspace_snapshot_ref: null,
        latest_approval_pack_ref: routeState.latest_refs.approval_pack_ref_or_null,
        latest_client_portal_workspace_ref: null,
        latest_upload_session_ref: null,
        latest_policy_snapshot_ref: null,
        latest_resume_token: null,
      };
    case "UPLOAD_SESSION":
      return {
        latest_decision_bundle_ref: null,
        latest_workspace_snapshot_ref: null,
        latest_approval_pack_ref: null,
        latest_client_portal_workspace_ref: null,
        latest_upload_session_ref: routeState.latest_refs.upload_session_ref_or_null,
        latest_policy_snapshot_ref: null,
        latest_resume_token: null,
      };
    case "POLICY_SNAPSHOT":
      return {
        latest_decision_bundle_ref: null,
        latest_workspace_snapshot_ref: null,
        latest_approval_pack_ref: null,
        latest_client_portal_workspace_ref: null,
        latest_upload_session_ref: null,
        latest_policy_snapshot_ref: routeState.latest_refs.policy_snapshot_ref_or_null,
        latest_resume_token: null,
      };
    case "MANIFEST_RESUME":
      return {
        latest_decision_bundle_ref: routeState.latest_refs.decision_bundle_ref_or_null,
        latest_workspace_snapshot_ref: null,
        latest_approval_pack_ref: null,
        latest_client_portal_workspace_ref: null,
        latest_upload_session_ref: null,
        latest_policy_snapshot_ref: null,
        latest_resume_token: routeState.resume_token_or_null,
      };
  }
}

export function syntheticReceiptClientId(command: CommandEnvelope, actorContext: NorthboundActorContext) {
  return command.client_id ?? actorContext.client_id_or_null ?? "client.system.control-plane";
}

export async function emitNorthboundAtlasPayload(payload: unknown) {
  await mkdir(path.dirname(northboundAtlasDataPath), { recursive: true });
  await writeFile(northboundAtlasDataPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export async function checkNorthboundAtlasPayload(payload: unknown) {
  const existing = await readFile(northboundAtlasDataPath, "utf8");
  const expected = `${JSON.stringify(payload, null, 2)}\n`;
  if (existing !== expected) {
    throw new Error(`Out-of-sync generated file: ${relativeRepoPath(northboundAtlasDataPath)}`);
  }
}

export async function loadNorthboundPolicyBundle(options?: { reload?: boolean }) {
  if (!cachedPolicyBundle || options?.reload) {
    cachedPolicyBundle = (async () => {
      const [commandFamilyMatrix, problemCodeCatalog, staleGuardProfileMatrix] = await Promise.all([
        readJson<CommandFamilyMatrix>(jsonPaths.commandFamilyMatrix),
        readJson<ProblemCodeCatalog>(jsonPaths.problemCodeCatalog),
        readJson<StaleGuardProfileMatrix>(jsonPaths.staleGuardProfileMatrix),
      ]);

      validateProblemCatalog(problemCodeCatalog);
      validateStaleProfileMatrix(staleGuardProfileMatrix);
      validateCommandFamilyMatrix(commandFamilyMatrix, problemCodeCatalog, staleGuardProfileMatrix);

      const [commandEnvelopeSchema, problemEnvelopeSchema, apiCommandReceiptSchema, routeStabilitySchema] =
        await Promise.all([
          readSchemaEnvelope(schemaPaths.commandEnvelope),
          readSchemaEnvelope(schemaPaths.problemEnvelope),
          readSchemaEnvelope(schemaPaths.apiCommandReceipt),
          readSchemaEnvelope(schemaPaths.routeStabilityContract),
        ]);

      return {
        commandFamilyMatrix,
        problemCodeCatalog,
        staleGuardProfileMatrix,
        commandFamiliesByType: new Map(
          commandFamilyMatrix.command_family_rows.map((row) => [row.command_type, row] as const),
        ),
        problemCodesByCode: new Map(
          problemCodeCatalog.problem_rows.map((row) => [row.problem_code, row] as const),
        ),
        staleProfilesByCode: new Map(
          staleGuardProfileMatrix.stale_guard_profiles.map((row) => [row.profile_code, row] as const),
        ),
        schemas: {
          commandEnvelope: validateSchemaEnvelope(
            commandEnvelopeSchema,
            "CommandEnvelope",
            [
              "command_id",
              "command_type",
              "idempotency_key",
              "truth_boundary_contract",
              "mutation_precondition_binding",
              "payload",
            ],
            CommandEnvelopeSchemaLineage.sourceHash,
            CommandEnvelopeSchemaLineage.schemaId,
          ),
          problemEnvelope: validateSchemaEnvelope(
            problemEnvelopeSchema,
            "ProblemEnvelope",
            [
              "problem_code",
              "reason_codes",
              "truth_boundary_contract",
              "actionability_state",
            ],
            ProblemEnvelopeSchemaLineage.sourceHash,
            ProblemEnvelopeSchemaLineage.schemaId,
          ),
          apiCommandReceipt: validateSchemaEnvelope(
            apiCommandReceiptSchema,
            "ApiCommandReceipt",
            [
              "receipt_id",
              "acceptance_state",
              "truth_boundary_contract",
              "mutation_precondition_binding",
            ],
            ApiCommandReceiptSchemaLineage.sourceHash,
            ApiCommandReceiptSchemaLineage.schemaId,
          ),
          routeStabilityContract: validateSchemaEnvelope(
            routeStabilitySchema,
            "RouteStabilityContract",
            [
              "route_scope_class",
              "publication_generation",
              "guard_vector_hash",
            ],
            RouteStabilityContractSchemaLineage.sourceHash,
            RouteStabilityContractSchemaLineage.schemaId,
          ),
        },
      } satisfies NorthboundPolicyBundle;
    })();
  }

  return cachedPolicyBundle;
}

export async function mainValidateNorthboundPolicies() {
  const args = new Set(process.argv.slice(2));
  const mode = args.has("--emit") ? "emit" : "check";
  const bundle = await loadNorthboundPolicyBundle({ reload: true });
  const digest = sha256Hex(
    JSON.stringify({
      commandFamilyMatrix: bundle.commandFamilyMatrix,
      problemCodeCatalog: bundle.problemCodeCatalog,
      staleGuardProfileMatrix: bundle.staleGuardProfileMatrix,
    }),
  );
  console.log(`${mode === "emit" ? "loaded" : "verified"} northbound policy bundle`);
  console.log(`command families: ${bundle.commandFamilyMatrix.command_family_rows.length}`);
  console.log(`problem codes: ${bundle.problemCodeCatalog.problem_rows.length}`);
  console.log(`stale profiles: ${bundle.staleGuardProfileMatrix.stale_guard_profiles.length}`);
  console.log(`policy digest: ${digest}`);
}

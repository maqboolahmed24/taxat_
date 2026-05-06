import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  applyContextualRouteFallbackRules,
  buildClientPortalWorkspace,
  deriveClientPortalRouteContext,
  deriveClientPortalRouteWorkspace,
} from "../index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

async function validateJsonSchemaOnly(kind: string, payload: unknown) {
  const script = `
import json
import pathlib
import sys

repo = pathlib.Path(sys.argv[1])
sys.path.insert(0, str(repo / "packages" / "contracts-core" / "python"))
from validate_contracts import Draft202012Validator, build_registry, load_json  # type: ignore

kind = sys.argv[2]
payload = json.loads(sys.argv[3])
schema = load_json(repo / "packages" / "contracts-core" / "schemas" / f"{kind}.schema.json")
validator = Draft202012Validator(
    schema,
    registry=build_registry(),
    format_checker=Draft202012Validator.FORMAT_CHECKER,
)
issues = [
    f"schema:{'/'.join(map(str, error.absolute_path)) or '<root>'}: {error.message}"
    for error in sorted(validator.iter_errors(payload), key=lambda error: list(error.absolute_path))
]
if issues:
    raise SystemExit("\\n".join(issues))
`;
  await execFileAsync(path.join(repoRoot, ".venv", "bin", "python3"), [
    "-c",
    script,
    repoRoot,
    kind,
    JSON.stringify(payload),
  ]);
}

test("builds a canonical HOME workspace with schema-valid shell, cache, and interaction contracts", async () => {
  const workspace = buildClientPortalWorkspace();

  expect(workspace.artifact_type).toBe("ClientPortalWorkspace");
  expect(workspace.shell_family).toBe("CLIENT_PORTAL_SHELL");
  expect(workspace.route).toBe("HOME");
  expect(workspace.object_anchor_ref).toBe(workspace.workspace_id);
  expect(workspace.navigation_tabs.filter((tab) => tab.active)).toEqual([
    expect.objectContaining({ label: "Home", route: "HOME" }),
  ]);
  expect(workspace.home_surface_order).toEqual([
    "PORTAL_HEADER",
    "STATUS_HERO",
    "TASK_QUEUE",
    "RECENT_ACTIVITY",
  ]);

  await validateJsonSchemaOnly("client_portal_workspace", workspace);
  await validateContractSchema("cache_isolation_contract", workspace.cache_isolation_contract);
  await validateContractSchema(
    "cross_device_continuity_contract",
    workspace.cross_device_continuity_contract,
  );
  await validateContractSchema("portal_interaction_layer", workspace.interaction_layer);
  await validateContractSchema("semantic_accessibility_contract", workspace.semantic_accessibility_contract);
});

test("derives contextual DOCUMENTS route state without minting a sixth tab or widening cache identity", async () => {
  const base = buildClientPortalWorkspace({ includeOnboarding: false });
  const documents = deriveClientPortalRouteWorkspace({
    query: {
      artifact_focus_bucket_or_null: "PRIMARY",
      artifact_focus_subject_ref_or_null: "upload.identity.current",
      context_object_ref: "request.identity",
      focus_anchor_ref: "request.identity.upload",
      return_focus_anchor_ref_or_null: "portal.documents.return",
    },
    requestedRoute: "DOCUMENTS",
    workspace: base,
  });

  expect(documents.route).toBe("DOCUMENTS");
  expect(documents.navigation_tabs.map((tab) => tab.route)).toEqual([
    "HOME",
    "DOCUMENTS",
    "APPROVALS",
    "HELP",
  ]);
  expect(documents.navigation_tabs.filter((tab) => tab.active)).toEqual([
    expect.objectContaining({ route: "DOCUMENTS" }),
  ]);
  expect(documents.route_context).toMatchObject({
    artifact_focus_bucket_or_null: "PRIMARY",
    artifact_focus_subject_ref_or_null: "upload.identity.current",
    context_object_ref: "request.identity",
    context_route: "REQUEST_DETAIL",
    focus_anchor_ref: "request.identity.upload",
    return_focus_anchor_ref_or_null: "portal.documents.return",
    return_route: "DOCUMENTS",
  });
  expect(documents.object_anchor_ref).toBe("request.identity");
  expect(documents.cross_device_continuity_contract).toMatchObject({
    canonical_object_ref: "request.identity",
    parent_context_ref_or_null: "DOCUMENTS",
    return_focus_anchor_ref_or_null: "portal.documents.return",
    route_identity_ref: "REQUEST_DETAIL",
  });
  expect(documents.cache_isolation_contract).toMatchObject({
    canonical_object_ref: "request.identity",
    route_identity_ref: "REQUEST_DETAIL",
  });

  await validateJsonSchemaOnly("client_portal_workspace", documents);
  await validateContractSchema("cache_isolation_contract", documents.cache_isolation_contract);
  await validateContractSchema(
    "cross_device_continuity_contract",
    documents.cross_device_continuity_contract,
  );
});

test("falls back to the latest visible contextual object before returning to the parent route", () => {
  const context = deriveClientPortalRouteContext({
    query: {
      context_object_ref: "request.old",
      focus_anchor_ref: "request.old.upload",
      return_focus_anchor_ref_or_null: "portal.documents.return",
    },
    route: "DOCUMENTS",
  });

  const fallback = applyContextualRouteFallbackRules({
    latestVisibleFocusAnchorRef: "request.current.upload",
    latestVisibleObjectRef: "request.current",
    objectState: "LATEST_VISIBLE_OBJECT_AVAILABLE",
    route: "DOCUMENTS",
    routeContext: context,
    workspaceId: "portal.workspace.client-2001",
  });

  expect(fallback.object_anchor_ref).toBe("request.current");
  expect(fallback.route_context).toMatchObject({
    context_object_ref: "request.current",
    context_route: "REQUEST_DETAIL",
    fallback_object_ref_or_null: "request.current",
    fallback_reason_ref_or_null: "NARROWEST_SURVIVING_LIST_SELECTED",
    return_route: "DOCUMENTS",
  });
});

test("publishes stale and degraded posture as explicit review or read-only limitations", async () => {
  const stale = buildClientPortalWorkspace({
    freshnessState: "STALE_REVIEW_REQUIRED",
    includeOnboarding: false,
  });
  expect(stale.settlement_state).toBe("STALE_REVIEW_REQUIRED");
  expect(stale.recovery_posture).toBe("INLINE_REBASE");
  expect(stale.workspace_posture.promoted_support_region).toBe("LIMITATION_NOTICE");
  expect(stale.content_limitations).toEqual([
    expect.objectContaining({ blocking: true, limitation_code: "STALE_REVIEW_REQUIRED" }),
  ]);

  const degraded = buildClientPortalWorkspace({
    freshnessState: "DEGRADED",
    includeOnboarding: false,
  });
  expect(degraded.settlement_state).toBe("DEGRADED_READ_ONLY");
  expect(degraded.recovery_posture).toBe("READ_ONLY_LIMITED");
  expect(degraded.reliability_summary.dominant_abort_hazard_code).toBe("DATA_PATH_DEGRADED");

  await validateJsonSchemaOnly("client_portal_workspace", stale);
  await validateJsonSchemaOnly("client_portal_workspace", degraded);
});

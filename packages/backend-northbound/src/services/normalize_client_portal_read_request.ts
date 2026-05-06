import type { ClientPortalRouteQueryInput } from "../query/get_client_portal_workspace.ts";

export type ClientPortalReadEndpointKind =
  | "activity"
  | "approvals"
  | "documents"
  | "onboarding"
  | "workspace";

export type ClientPortalReadQueryInput = ClientPortalRouteQueryInput & {
  client_id?: string | null;
  tenant_id?: string | null;
};

const routePaths = {
  activity: "/v1/client-portal/activity",
  approvals: "/v1/client-portal/approvals",
  documents: "/v1/client-portal/documents",
  onboarding: "/v1/client-portal/onboarding",
  workspace: "/v1/client-portal/workspace",
} as const satisfies Record<ClientPortalReadEndpointKind, string>;

function firstValue(params: URLSearchParams, name: string) {
  const value = params.get(name);
  return value === null || value.trim().length === 0 ? undefined : value;
}

function parsePath(path?: string) {
  if (path === undefined) {
    return {
      pathname: undefined,
      query: undefined,
    };
  }
  const parsed = new URL(path, "http://taxat.local");
  return {
    pathname: parsed.pathname,
    query: {
      artifact_focus_bucket_or_null: firstValue(
        parsed.searchParams,
        "artifact_focus_bucket",
      ),
      artifact_focus_subject_ref_or_null: firstValue(
        parsed.searchParams,
        "artifact_focus_subject_ref",
      ),
      client_id: firstValue(parsed.searchParams, "client_id"),
      context_object_ref: firstValue(parsed.searchParams, "context_object_ref"),
      context_route: firstValue(parsed.searchParams, "context_route"),
      fallback_object_ref_or_null: firstValue(
        parsed.searchParams,
        "fallback_object_ref",
      ),
      fallback_reason_ref_or_null: firstValue(
        parsed.searchParams,
        "fallback_reason_ref",
      ),
      focus_anchor_ref: firstValue(parsed.searchParams, "focus_anchor_ref"),
      request_info_ref: firstValue(parsed.searchParams, "request_info_ref"),
      return_focus_anchor_ref_or_null: firstValue(
        parsed.searchParams,
        "return_focus_anchor_ref",
      ),
      tenant_id: firstValue(parsed.searchParams, "tenant_id"),
    } satisfies ClientPortalReadQueryInput,
  };
}

export function mergeClientPortalReadQueryInputs(
  ...inputs: Array<ClientPortalReadQueryInput | undefined>
) {
  const merged: ClientPortalReadQueryInput = {};
  for (const input of inputs) {
    if (input === undefined) {
      continue;
    }
    for (const [key, value] of Object.entries(input) as Array<
      [keyof ClientPortalReadQueryInput, string | null | undefined]
    >) {
      if (value !== undefined) {
        merged[key] = value;
      }
    }
  }
  return merged;
}

export function normalizeClientPortalReadRequest(input: {
  clientId?: string;
  endpointKind: ClientPortalReadEndpointKind;
  path?: string;
  query?: ClientPortalReadQueryInput;
  tenantId?: string;
}) {
  const parsed = parsePath(input.path);
  if (parsed.pathname !== undefined && parsed.pathname !== routePaths[input.endpointKind]) {
    return null;
  }
  const query = mergeClientPortalReadQueryInputs(parsed.query, input.query, {
    client_id: input.clientId,
    tenant_id: input.tenantId,
  });
  return {
    clientId: query.client_id ?? null,
    query,
    tenantId: query.tenant_id ?? null,
  };
}

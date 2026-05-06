import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { WorkspaceStreamEvent } from "../../../generated-models/src/generated/typescript/client-and-collaboration.ts";
import type { StreamRecoveryContract } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { ExperienceStreamEvent } from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";

export type StreamScopeClass = StreamRecoveryContract["stream_scope_class"];
export type StreamDeliveryWindowState = StreamRecoveryContract["delivery_window_state"];
export type ExperienceStreamEventType = ExperienceStreamEvent["event_type"];
export type WorkspaceStreamEventType = WorkspaceStreamEvent["event_type"];
export type StreamEventType = ExperienceStreamEventType | WorkspaceStreamEventType;
export type StreamPhaseRef =
  | "SNAPSHOT"
  | "CATCH_UP"
  | "LIVE"
  | "HEARTBEAT"
  | "REBASE"
  | "REVOKE";

export type StreamScopeCatalogRow = {
  stream_scope_class: StreamScopeClass;
  display_name: string;
  rail_label: string;
  route_key_field: "shell_route_key" | "workspace_route_key";
  subject_field: "manifest_id" | "item_id";
  sequence_field: "experience_sequence" | "workspace_sequence";
  cursor_artifact_type: "ExperienceCursor" | "WorkspaceCursor";
  cursor_scope_class: StreamScopeClass;
  resume_binding_mode: StreamRecoveryContract["resume_token_binding_mode"];
  sequence_application_policy: StreamRecoveryContract["sequence_application_policy"];
  duplicate_delivery_policy: StreamRecoveryContract["duplicate_delivery_policy"];
  default_event_types: StreamEventType[];
  notes: string[];
};

export type StreamScopeCatalog = {
  contract_version: "STREAM_SCOPE_CATALOG_V1";
  catalog_id: string;
  basis_statement: string;
  stream_scope_rows: StreamScopeCatalogRow[];
  source_lineage: SourceLineageEntry[];
};

export type EventTypeCatalogRow = {
  stream_scope_class: StreamScopeClass;
  event_type: StreamEventType;
  display_name: string;
  rail_label: string;
  payload_ref_field_or_null:
    | "snapshot_ref"
    | "delta_ref"
    | "terminal_bundle_ref"
    | "activity_ref"
    | "audit_ref"
    | "notification_ref"
    | null;
  event_transport_mode: "SSE_EVENT" | "SSE_COMMENT";
  phase_ref: Exclude<StreamPhaseRef, "REBASE" | "REVOKE">;
  sequence_semantics: "SNAPSHOT_BASELINE" | "ADVANCES_SEQUENCE" | "NO_SEQUENCE_ADVANCE";
  duplicate_identity_basis: StreamRecoveryContract["duplicate_delivery_policy"];
  notes: string[];
};

export type EventTypeCatalog = {
  contract_version: "STREAM_EVENT_TYPE_CATALOG_V1";
  catalog_id: string;
  basis_statement: string;
  event_type_rows: EventTypeCatalogRow[];
  source_lineage: SourceLineageEntry[];
};

export type SourceLineageEntry = {
  rationale: string;
  source_file: string;
  source_heading_or_logical_block: string;
};

export type StreamingCatalogBundle = {
  eventTypeCatalog: EventTypeCatalog;
  eventTypeRowsByScopeAndType: Map<string, EventTypeCatalogRow>;
  streamScopeCatalog: StreamScopeCatalog;
  streamScopesByClass: Map<StreamScopeClass, StreamScopeCatalogRow>;
};

type StreamScopeErrorInit = {
  code:
    | "EVENT_TYPE_UNKNOWN"
    | "POLICY_VALIDATION_FAILED"
    | "STREAM_SCOPE_UNKNOWN";
  detail: string;
};

export class StreamScopeError extends Error {
  readonly code: StreamScopeErrorInit["code"];

  constructor(init: StreamScopeErrorInit) {
    super(`${init.code}: ${init.detail}`);
    this.name = "StreamScopeError";
    this.code = init.code;
  }
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
export const streamingConfigDir = path.join(repoRoot, "config", "streaming");

const jsonPaths = {
  eventTypeCatalog: path.join(streamingConfigDir, "event_type_catalog.json"),
  streamScopeCatalog: path.join(streamingConfigDir, "stream_scope_catalog.json"),
} as const;

let cachedBundle: Promise<StreamingCatalogBundle> | null = null;

function assertCondition(condition: unknown, detail: string): asserts condition {
  if (!condition) {
    throw new StreamScopeError({
      code: "POLICY_VALIDATION_FAILED",
      detail,
    });
  }
}

function assertKeys(label: string, value: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    assertCondition(key in value, `${label} missing required key ${key}`);
  }
}

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function scopeAndTypeKey(streamScopeClass: StreamScopeClass, eventType: StreamEventType) {
  return `${streamScopeClass}:${eventType}`;
}

function validateStreamScopeCatalog(catalog: StreamScopeCatalog) {
  assertKeys("StreamScopeCatalog", catalog as unknown as Record<string, unknown>, [
    "contract_version",
    "catalog_id",
    "basis_statement",
    "stream_scope_rows",
    "source_lineage",
  ]);
  assertCondition(
    catalog.contract_version === "STREAM_SCOPE_CATALOG_V1",
    "stream scope catalog contract version drifted",
  );
  assertCondition(catalog.stream_scope_rows.length === 2, "expected two stream scope rows");

  const seenScopes = new Set<StreamScopeClass>();
  for (const row of catalog.stream_scope_rows) {
    assertKeys(
      `StreamScopeCatalogRow ${row.stream_scope_class}`,
      row as unknown as Record<string, unknown>,
      [
        "stream_scope_class",
        "display_name",
        "rail_label",
        "route_key_field",
        "subject_field",
        "sequence_field",
        "cursor_artifact_type",
        "cursor_scope_class",
        "resume_binding_mode",
        "sequence_application_policy",
        "duplicate_delivery_policy",
        "default_event_types",
        "notes",
      ],
    );
    assertCondition(
      !seenScopes.has(row.stream_scope_class),
      `duplicate stream scope ${row.stream_scope_class}`,
    );
    seenScopes.add(row.stream_scope_class);
    assertCondition(
      row.cursor_scope_class === row.stream_scope_class,
      `cursor scope class must match stream scope class for ${row.stream_scope_class}`,
    );
  }
}

function validateEventTypeCatalog(
  catalog: EventTypeCatalog,
  streamScopesByClass: Map<StreamScopeClass, StreamScopeCatalogRow>,
) {
  assertKeys("EventTypeCatalog", catalog as unknown as Record<string, unknown>, [
    "contract_version",
    "catalog_id",
    "basis_statement",
    "event_type_rows",
    "source_lineage",
  ]);
  assertCondition(
    catalog.contract_version === "STREAM_EVENT_TYPE_CATALOG_V1",
    "event type catalog contract version drifted",
  );

  const seenScopeAndType = new Set<string>();
  for (const row of catalog.event_type_rows) {
    assertKeys(
      `EventTypeCatalogRow ${row.stream_scope_class}/${row.event_type}`,
      row as unknown as Record<string, unknown>,
      [
        "stream_scope_class",
        "event_type",
        "display_name",
        "rail_label",
        "payload_ref_field_or_null",
        "event_transport_mode",
        "phase_ref",
        "sequence_semantics",
        "duplicate_identity_basis",
        "notes",
      ],
    );
    assertCondition(
      streamScopesByClass.has(row.stream_scope_class),
      `event type row ${row.event_type} references unknown stream scope ${row.stream_scope_class}`,
    );
    const key = scopeAndTypeKey(row.stream_scope_class, row.event_type);
    assertCondition(!seenScopeAndType.has(key), `duplicate event type row ${key}`);
    seenScopeAndType.add(key);
    if (row.event_type === "heartbeat") {
      assertCondition(
        row.sequence_semantics === "NO_SEQUENCE_ADVANCE",
        "heartbeat rows must never advance business sequence state",
      );
      assertCondition(
        row.event_transport_mode === "SSE_COMMENT",
        "heartbeat rows must remain SSE comment transport by default",
      );
    }
  }
}

export async function loadStreamingCatalogBundle(options?: { reload?: boolean }) {
  if (!cachedBundle || options?.reload) {
    cachedBundle = (async () => {
      const [streamScopeCatalog, eventTypeCatalog] = await Promise.all([
        readJson<StreamScopeCatalog>(jsonPaths.streamScopeCatalog),
        readJson<EventTypeCatalog>(jsonPaths.eventTypeCatalog),
      ]);

      validateStreamScopeCatalog(streamScopeCatalog);
      const streamScopesByClass = new Map(
        streamScopeCatalog.stream_scope_rows.map((row) => [row.stream_scope_class, row]),
      );
      validateEventTypeCatalog(eventTypeCatalog, streamScopesByClass);

      return {
        eventTypeCatalog,
        eventTypeRowsByScopeAndType: new Map(
          eventTypeCatalog.event_type_rows.map((row) => [
            scopeAndTypeKey(row.stream_scope_class, row.event_type),
            row,
          ]),
        ),
        streamScopeCatalog,
        streamScopesByClass,
      } satisfies StreamingCatalogBundle;
    })();
  }

  return cachedBundle;
}

export function streamScopeRow(
  bundle: StreamingCatalogBundle,
  streamScopeClass: StreamScopeClass,
) {
  const row = bundle.streamScopesByClass.get(streamScopeClass);
  if (!row) {
    throw new StreamScopeError({
      code: "STREAM_SCOPE_UNKNOWN",
      detail: `unknown stream scope ${streamScopeClass}`,
    });
  }
  return row;
}

export function eventTypeRow(
  bundle: StreamingCatalogBundle,
  streamScopeClass: StreamScopeClass,
  eventType: StreamEventType,
) {
  const row = bundle.eventTypeRowsByScopeAndType.get(scopeAndTypeKey(streamScopeClass, eventType));
  if (!row) {
    throw new StreamScopeError({
      code: "EVENT_TYPE_UNKNOWN",
      detail: `unknown event type ${eventType} for scope ${streamScopeClass}`,
    });
  }
  return row;
}

export function streamEventScopeClass(
  event: ExperienceStreamEvent | WorkspaceStreamEvent,
): StreamScopeClass {
  return event.stream_scope_class;
}

export function streamEventSequence(event: ExperienceStreamEvent | WorkspaceStreamEvent) {
  return event.stream_scope_class === "MANIFEST_EXPERIENCE"
    ? event.experience_sequence
    : event.workspace_sequence;
}

export function streamEventRouteKey(event: ExperienceStreamEvent | WorkspaceStreamEvent) {
  return event.stream_scope_class === "MANIFEST_EXPERIENCE"
    ? event.shell_route_key
    : event.workspace_route_key;
}

export function streamEventSubjectRef(event: ExperienceStreamEvent | WorkspaceStreamEvent) {
  return event.stream_scope_class === "MANIFEST_EXPERIENCE" ? event.manifest_id : event.item_id;
}

export function streamEventDisplaySequenceLabel(
  event: ExperienceStreamEvent | WorkspaceStreamEvent,
  eventRow: EventTypeCatalogRow,
) {
  return `${eventRow.rail_label} #${streamEventSequence(event)}`;
}

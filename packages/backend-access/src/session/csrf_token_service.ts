import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { ActorSessionRecord } from "../models/actor_session.ts";
import { SessionLifecycleService } from "./session_lifecycle_service.ts";
import {
  SESSION_SECURITY_REASON_CODES,
  type SessionSecurityReasonCode,
} from "./session_security_reason_codes.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  normalizeStringSet,
  requireTrimmedString,
} from "../services/principal_context_normalizer.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const browserSessionSecurityPolicyPath = path.join(
  repoRoot,
  "config",
  "access",
  "browser_session_security_policy.json",
);

type BrowserCookiePolicy = {
  http_only: true;
  path_scope: string;
  same_site: "LAX" | "STRICT";
  secure_only: true;
};

type BrowserSessionSecurityPolicy = {
  basis_statement: string;
  binding_policy: {
    accepted_session_binding_transports: string[];
    require_session_binding_for_state_changing_requests: true;
  };
  contract_version: "BROWSER_SESSION_SECURITY_POLICY_V1";
  cookie_policy: BrowserCookiePolicy;
  csrf_policy: {
    accepted_transport_locations: string[];
    binding_inputs: string[];
    form_field_name: string;
    header_name: string;
    max_active_tokens_per_session: number;
    mechanism: "SYNCHRONIZER_TOKEN";
    persist_posture: "HASH_ONLY";
    rotation_events: string[];
    state_changing_methods: string[];
    token_ttl_seconds: number;
  };
  origin_policy: {
    same_origin_required_for_state_changing_requests: true;
  };
};

export type StoredCsrfTokenRecord = {
  csrf_ref: string;
  expires_at: string;
  invalidated_at: string | null;
  invalidated_reason_code_or_null: SessionSecurityReasonCode | null;
  issued_at: string;
  session_binding_hash: string;
  session_id: string;
  tenant_id: string;
  token_fingerprint_hash: string;
};

export type IssueCsrfTokenResult = {
  client_token: string;
  csrf_ref: string;
  expires_at: string;
  form_field_name: string;
  header_name: string;
  issued_at: string;
  session_binding_hash: string;
};

export type CsrfTokenValidationState =
  | "VALID"
  | "MISSING"
  | "INVALID"
  | "EXPIRED"
  | "INVALIDATED"
  | "SESSION_BINDING_STALE"
  | "SESSION_NOT_USABLE";

export type CsrfTokenValidationResult = {
  allowed: boolean;
  reason_codes: string[];
  session: ActorSessionRecord;
  state: CsrfTokenValidationState;
  token_record: StoredCsrfTokenRecord | null;
};

type CsrfTokenServiceErrorCode =
  | "CSRF_BROWSER_SESSION_REQUIRED"
  | "CSRF_SESSION_NOT_USABLE";

export class CsrfTokenServiceError extends Error {
  readonly code: CsrfTokenServiceErrorCode;
  readonly reason_codes: string[];

  constructor(code: CsrfTokenServiceErrorCode, detail: string, reason_codes: string[] = []) {
    super(`${code}: ${detail}`);
    this.name = "CsrfTokenServiceError";
    this.code = code;
    this.reason_codes = reason_codes;
  }
}

let cachedBrowserSessionSecurityPolicy: Promise<BrowserSessionSecurityPolicy> | null = null;

function addSeconds(instant: string, seconds: number) {
  return new Date(new Date(instant).valueOf() + seconds * 1_000).toISOString();
}

function tokenKey(tenantId: string, csrfRef: string) {
  return `${tenantId}::${csrfRef}`;
}

function fingerprintToken(csrfRef: string, tokenMaterial: string) {
  return stableJsonHash({
    csrf_ref: csrfRef,
    token_material: tokenMaterial,
  });
}

function cloneTokenRecord(record: StoredCsrfTokenRecord) {
  return structuredClone(record);
}

export async function loadBrowserSessionSecurityPolicy(options?: { reload?: boolean }) {
  if (!cachedBrowserSessionSecurityPolicy || options?.reload) {
    cachedBrowserSessionSecurityPolicy = readFile(browserSessionSecurityPolicyPath, "utf8").then(
      (raw) => {
        const parsed = JSON.parse(raw) as BrowserSessionSecurityPolicy;
        if (parsed.contract_version !== "BROWSER_SESSION_SECURITY_POLICY_V1") {
          throw new Error("Unexpected browser session security policy version.");
        }
        return {
          ...parsed,
          binding_policy: {
            ...parsed.binding_policy,
            accepted_session_binding_transports: normalizeStringSet(
              "browser_session_security_policy.binding_policy.accepted_session_binding_transports",
              parsed.binding_policy.accepted_session_binding_transports,
              { minItems: 1 },
            ),
          },
          csrf_policy: {
            ...parsed.csrf_policy,
            accepted_transport_locations: normalizeStringSet(
              "browser_session_security_policy.csrf_policy.accepted_transport_locations",
              parsed.csrf_policy.accepted_transport_locations,
              { minItems: 1 },
            ),
            binding_inputs: normalizeStringSet(
              "browser_session_security_policy.csrf_policy.binding_inputs",
              parsed.csrf_policy.binding_inputs,
              { minItems: 1 },
            ),
            rotation_events: normalizeStringSet(
              "browser_session_security_policy.csrf_policy.rotation_events",
              parsed.csrf_policy.rotation_events,
              { minItems: 1 },
            ),
            state_changing_methods: normalizeStringSet(
              "browser_session_security_policy.csrf_policy.state_changing_methods",
              parsed.csrf_policy.state_changing_methods,
              { minItems: 1 },
            ).map((method) => method.toUpperCase()),
          },
        };
      },
    );
  }
  return cachedBrowserSessionSecurityPolicy;
}

export class CsrfTokenService {
  private readonly tokenRecords = new Map<string, StoredCsrfTokenRecord[]>();

  constructor(
    private readonly dependencies: {
      sessionLifecycleService: SessionLifecycleService;
      tokenGenerator?: (input: { issued_at: string; session: ActorSessionRecord }) => string;
    },
  ) {}

  async issueToken(input: {
    issued_at: string;
    session_id: string;
    tenant_id: string;
  }): Promise<IssueCsrfTokenResult> {
    const policy = await loadBrowserSessionSecurityPolicy();
    const posture = await this.dependencies.sessionLifecycleService.resolveSessionPosture({
      tenant_id: input.tenant_id,
      session_id: input.session_id,
      as_of: input.issued_at,
    });
    if (!posture.usable) {
      throw new CsrfTokenServiceError(
        "CSRF_SESSION_NOT_USABLE",
        `session ${input.session_id} is not usable for CSRF issuance`,
        posture.reason_codes,
      );
    }
    const session = posture.session;
    if (session.session_client_class !== "BROWSER" || session.csrf_ref === null) {
      throw new CsrfTokenServiceError(
        "CSRF_BROWSER_SESSION_REQUIRED",
        "anti-CSRF issuance requires a browser session with csrf_ref",
      );
    }

    const issuedAt = normalizeUtcInstantString(input.issued_at);
    const clientToken =
      this.dependencies.tokenGenerator?.({
        issued_at: issuedAt,
        session,
      }) ??
      stableJsonHash({
        session_id: session.session_id,
        csrf_ref: session.csrf_ref,
        nonce: randomUUID(),
        issued_at: issuedAt,
      });
    const normalizedToken = requireTrimmedString("client_token", clientToken);
    const record: StoredCsrfTokenRecord = {
      csrf_ref: session.csrf_ref,
      expires_at: addSeconds(issuedAt, policy.csrf_policy.token_ttl_seconds),
      invalidated_at: null,
      invalidated_reason_code_or_null: null,
      issued_at: issuedAt,
      session_binding_hash: session.session_binding_hash,
      session_id: session.session_id,
      tenant_id: session.tenant_id,
      token_fingerprint_hash: fingerprintToken(session.csrf_ref, normalizedToken),
    };
    const key = tokenKey(record.tenant_id, record.csrf_ref);
    const current = this.tokenRecords.get(key) ?? [];
    current.push(record);
    current.sort((left, right) => left.issued_at.localeCompare(right.issued_at));

    const active = current.filter((entry) => entry.invalidated_at === null);
    if (active.length > policy.csrf_policy.max_active_tokens_per_session) {
      const overflow = active.slice(
        0,
        active.length - policy.csrf_policy.max_active_tokens_per_session,
      );
      for (const staleRecord of overflow) {
        staleRecord.invalidated_at = issuedAt;
        staleRecord.invalidated_reason_code_or_null =
          SESSION_SECURITY_REASON_CODES.browser_csrf_token_invalidated;
      }
    }
    this.tokenRecords.set(key, current);

    return {
      client_token: normalizedToken,
      csrf_ref: record.csrf_ref,
      issued_at: record.issued_at,
      expires_at: record.expires_at,
      session_binding_hash: record.session_binding_hash,
      header_name: policy.csrf_policy.header_name,
      form_field_name: policy.csrf_policy.form_field_name,
    };
  }

  async validateToken(input: {
    as_of: string;
    presented_session_binding_hash?: string | null;
    presented_token?: string | null;
    session_id: string;
    tenant_id: string;
  }): Promise<CsrfTokenValidationResult> {
    const posture = await this.dependencies.sessionLifecycleService.resolveSessionPosture({
      tenant_id: input.tenant_id,
      session_id: input.session_id,
      as_of: input.as_of,
    });
    const session = posture.session;
    if (session.session_client_class !== "BROWSER" || session.csrf_ref === null) {
      throw new CsrfTokenServiceError(
        "CSRF_BROWSER_SESSION_REQUIRED",
        "anti-CSRF validation requires a browser session with csrf_ref",
      );
    }
    if (!posture.usable) {
      return {
        allowed: false,
        session,
        state: "SESSION_NOT_USABLE",
        reason_codes: [...posture.reason_codes],
        token_record: null,
      };
    }

    const presentedToken = input.presented_token?.trim() ?? "";
    if (presentedToken.length === 0) {
      return {
        allowed: false,
        session,
        state: "MISSING",
        reason_codes: [SESSION_SECURITY_REASON_CODES.browser_csrf_required],
        token_record: null,
      };
    }

    if (
      input.presented_session_binding_hash !== undefined &&
      input.presented_session_binding_hash !== null &&
      requireTrimmedString(
        "presented_session_binding_hash",
        input.presented_session_binding_hash,
      ) !== session.session_binding_hash
    ) {
      return {
        allowed: false,
        session,
        state: "INVALID",
        reason_codes: [SESSION_SECURITY_REASON_CODES.session_binding_mismatch],
        token_record: null,
      };
    }

    const key = tokenKey(session.tenant_id, session.csrf_ref);
    const records = this.tokenRecords.get(key) ?? [];
    const fingerprintHash = fingerprintToken(session.csrf_ref, presentedToken);
    const matchingRecord =
      records.find(
        (record) =>
          record.session_id === session.session_id &&
          record.token_fingerprint_hash === fingerprintHash,
      ) ?? null;

    if (!matchingRecord) {
      return {
        allowed: false,
        session,
        state: "INVALID",
        reason_codes: [SESSION_SECURITY_REASON_CODES.browser_csrf_invalid],
        token_record: null,
      };
    }

    if (matchingRecord.invalidated_at !== null) {
      return {
        allowed: false,
        session,
        state: "INVALIDATED",
        reason_codes: [
          matchingRecord.invalidated_reason_code_or_null ??
            SESSION_SECURITY_REASON_CODES.browser_csrf_token_invalidated,
        ],
        token_record: cloneTokenRecord(matchingRecord),
      };
    }

    const asOf = normalizeUtcInstantString(input.as_of);
    if (asOf > matchingRecord.expires_at) {
      return {
        allowed: false,
        session,
        state: "EXPIRED",
        reason_codes: [SESSION_SECURITY_REASON_CODES.browser_csrf_expired],
        token_record: cloneTokenRecord(matchingRecord),
      };
    }

    if (matchingRecord.session_binding_hash !== session.session_binding_hash) {
      return {
        allowed: false,
        session,
        state: "SESSION_BINDING_STALE",
        reason_codes: [SESSION_SECURITY_REASON_CODES.browser_csrf_binding_stale],
        token_record: cloneTokenRecord(matchingRecord),
      };
    }

    return {
      allowed: true,
      session,
      state: "VALID",
      reason_codes: [],
      token_record: cloneTokenRecord(matchingRecord),
    };
  }

  async invalidateSessionTokens(input: {
    invalidated_at: string;
    reason_code: SessionSecurityReasonCode;
    session_id: string;
    tenant_id: string;
  }) {
    const invalidatedAt = normalizeUtcInstantString(input.invalidated_at);
    let invalidated_count = 0;
    for (const [key, records] of this.tokenRecords.entries()) {
      const nextRecords = records.map((record) => {
        if (
          record.tenant_id !== input.tenant_id ||
          record.session_id !== input.session_id ||
          record.invalidated_at !== null
        ) {
          return record;
        }
        invalidated_count += 1;
        return {
          ...record,
          invalidated_at: invalidatedAt,
          invalidated_reason_code_or_null: input.reason_code,
        };
      });
      this.tokenRecords.set(key, nextRecords);
    }
    return invalidated_count;
  }

  async listTokensForSession(tenantId: string, sessionId: string) {
    return [...this.tokenRecords.values()]
      .flat()
      .filter((record) => record.tenant_id === tenantId && record.session_id === sessionId)
      .sort((left, right) => left.issued_at.localeCompare(right.issued_at))
      .map((record) => cloneTokenRecord(record));
  }
}

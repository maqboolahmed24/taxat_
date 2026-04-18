export const HMRC_FPH_VALIDATOR_BASE_URL =
  "https://test-api.service.hmrc.gov.uk";
export const HMRC_FPH_VALIDATOR_ACCEPT_HEADER =
  "application/vnd.hmrc.1.0+json";
export const HMRC_FPH_VALIDATE_PATH = "/test/fraud-prevention-headers/validate";
export const HMRC_FPH_VALIDATION_FEEDBACK_PATH =
  "/test/fraud-prevention-headers/{api}/validation-feedback";

export const HMRC_FPH_CONNECTION_METHODS = [
  "BATCH_PROCESS_DIRECT",
  "DESKTOP_APP_DIRECT",
  "DESKTOP_APP_VIA_SERVER",
  "MOBILE_APP_DIRECT",
  "MOBILE_APP_VIA_SERVER",
  "OTHER_DIRECT",
  "OTHER_VIA_SERVER",
  "WEB_APP_VIA_SERVER",
] as const;

export type HmrcFphConnectionMethod =
  (typeof HMRC_FPH_CONNECTION_METHODS)[number];

export const HMRC_FPH_RESULT_CODES = [
  "VALID_HEADERS",
  "INVALID_HEADERS",
  "POTENTIALLY_INVALID_HEADERS",
] as const;

export type HmrcFphResultCode = (typeof HMRC_FPH_RESULT_CODES)[number];

export interface HmrcFphFinding {
  code: string;
  message: string;
  headers: string[];
}

export interface HmrcFphValidateResponse {
  specVersion: string;
  code: HmrcFphResultCode;
  message: string;
  errors: HmrcFphFinding[];
  warnings: HmrcFphFinding[];
}

export interface HmrcFphHeaderFeedback {
  header: string;
  value: string | null;
  code: string;
  errors: string[];
  warnings: string[];
}

export interface HmrcFphCrossValidationFeedback {
  headers: string[];
  code: string;
  errors: string[];
}

export interface HmrcFphFeedbackRequest {
  path: string;
  method: string;
  requestTimestamp: string;
  code: HmrcFphResultCode;
  headers: HmrcFphHeaderFeedback[];
  crossValidation: HmrcFphCrossValidationFeedback[];
}

export interface HmrcFphValidationFeedbackResponse {
  requests: HmrcFphFeedbackRequest[];
}

export interface HmrcFphValidatorClient {
  validateHeaders(
    headers: Record<string, string>,
  ): Promise<HmrcFphValidateResponse>;
  getValidationFeedback(
    apiIdentifier: string,
    options?: {
      connectionMethod?: HmrcFphConnectionMethod;
    },
  ): Promise<HmrcFphValidationFeedbackResponse>;
}

type FetchLike = typeof fetch;

export interface CreateHmrcFphValidatorClientOptions {
  authorizationToken: string;
  baseUrl?: string;
  acceptHeader?: string;
  fetchImpl?: FetchLike;
}

export interface CreateFixtureFphValidatorClientOptions {
  onValidateHeaders?: (
    headers: Record<string, string>,
  ) => Promise<HmrcFphValidateResponse> | HmrcFphValidateResponse;
  onGetValidationFeedback?: (
    apiIdentifier: string,
    options?: {
      connectionMethod?: HmrcFphConnectionMethod;
    },
  ) =>
    | Promise<HmrcFphValidationFeedbackResponse>
    | HmrcFphValidationFeedbackResponse;
}

function isResultCode(value: unknown): value is HmrcFphResultCode {
  return (
    typeof value === "string" &&
    HMRC_FPH_RESULT_CODES.includes(value as HmrcFphResultCode)
  );
}

function normalizeFindingArray(value: unknown): HmrcFphFinding[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) => {
    const record = entry as Record<string, unknown>;
    return {
      code: typeof record.code === "string" ? record.code : "UNKNOWN",
      message: typeof record.message === "string" ? record.message : "",
      headers: Array.isArray(record.headers)
        ? record.headers
            .filter((candidate): candidate is string => typeof candidate === "string")
            .map((candidate) => candidate.toLowerCase())
        : [],
    };
  });
}

function normalizeValidateResponse(value: unknown): HmrcFphValidateResponse {
  const record = value as Record<string, unknown>;
  return {
    specVersion:
      typeof record.specVersion === "string" ? record.specVersion : "unknown",
    code: isResultCode(record.code) ? record.code : "INVALID_HEADERS",
    message: typeof record.message === "string" ? record.message : "",
    errors: normalizeFindingArray(record.errors),
    warnings: normalizeFindingArray(record.warnings),
  };
}

function normalizeHeaderFeedbackArray(value: unknown): HmrcFphHeaderFeedback[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) => {
    const record = entry as Record<string, unknown>;
    return {
      header: typeof record.header === "string" ? record.header : "unknown",
      value: typeof record.value === "string" ? record.value : null,
      code: typeof record.code === "string" ? record.code : "UNKNOWN",
      errors: Array.isArray(record.errors)
        ? record.errors.filter((candidate): candidate is string => typeof candidate === "string")
        : [],
      warnings: Array.isArray(record.warnings)
        ? record.warnings.filter((candidate): candidate is string => typeof candidate === "string")
        : [],
    };
  });
}

function normalizeCrossValidationArray(
  value: unknown,
): HmrcFphCrossValidationFeedback[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) => {
    const record = entry as Record<string, unknown>;
    return {
      headers: Array.isArray(record.headers)
        ? record.headers.filter((candidate): candidate is string => typeof candidate === "string")
        : [],
      code: typeof record.code === "string" ? record.code : "UNKNOWN",
      errors: Array.isArray(record.errors)
        ? record.errors.filter((candidate): candidate is string => typeof candidate === "string")
        : [],
    };
  });
}

function normalizeFeedbackResponse(
  value: unknown,
): HmrcFphValidationFeedbackResponse {
  const record = value as Record<string, unknown>;
  const requests = Array.isArray(record.requests) ? record.requests : [];
  return {
    requests: requests.map((entry) => {
      const request = entry as Record<string, unknown>;
      return {
        path: typeof request.path === "string" ? request.path : "",
        method: typeof request.method === "string" ? request.method : "GET",
        requestTimestamp:
          typeof request.requestTimestamp === "string"
            ? request.requestTimestamp
            : "",
        code: isResultCode(request.code) ? request.code : "INVALID_HEADERS",
        headers: normalizeHeaderFeedbackArray(request.headers),
        crossValidation: normalizeCrossValidationArray(request.crossValidation),
      };
    }),
  };
}

async function parseJsonResponse<T>(
  response: Pick<Response, "ok" | "status" | "text">,
  normalizer: (value: unknown) => T,
): Promise<T> {
  const body = await response.text();
  let parsed: unknown = {};
  if (body.trim().length > 0) {
    try {
      parsed = JSON.parse(body);
    } catch (error) {
      throw new Error(
        `HMRC FPH validator returned non-JSON response (${response.status}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  if (!response.ok) {
    const record = parsed as Record<string, unknown>;
    const code = typeof record.code === "string" ? record.code : "UNKNOWN";
    throw new Error(
      `HMRC FPH validator request failed with HTTP ${response.status} (${code}).`,
    );
  }

  return normalizer(parsed);
}

function buildDefaultFixtureValidateResponse(
  headers: Record<string, string>,
): HmrcFphValidateResponse {
  const connectionMethod = headers["Gov-Client-Connection-Method"] ?? "UNKNOWN";
  return {
    specVersion: "3.1",
    code: "VALID_HEADERS",
    message: `Fixture validator accepted ${connectionMethod} headers.`,
    errors: [],
    warnings: [],
  };
}

function buildDefaultFixtureFeedbackResponse(
  headers: Record<string, string>,
): HmrcFphValidationFeedbackResponse {
  return {
    requests: [
      {
        path: "/synthetic/hmrc/authority-sandbox-seed",
        method: "GET",
        requestTimestamp: new Date().toISOString(),
        code: "VALID_HEADERS",
        headers: Object.entries(headers).map(([header, value]) => ({
          header: header.toLowerCase(),
          value,
          code: "VALID_HEADER",
          errors: [],
          warnings: [],
        })),
        crossValidation: [],
      },
    ],
  };
}

export function createHmrcFphValidatorClient(
  options: CreateHmrcFphValidatorClientOptions,
): HmrcFphValidatorClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl ?? HMRC_FPH_VALIDATOR_BASE_URL;
  const acceptHeader =
    options.acceptHeader ?? HMRC_FPH_VALIDATOR_ACCEPT_HEADER;

  return {
    async validateHeaders(headers) {
      const response = await fetchImpl(
        `${baseUrl}${HMRC_FPH_VALIDATE_PATH}`,
        {
          method: "GET",
          headers: {
            Accept: acceptHeader,
            Authorization: `Bearer ${options.authorizationToken}`,
            ...headers,
          },
        },
      );

      return parseJsonResponse(response, normalizeValidateResponse);
    },

    async getValidationFeedback(apiIdentifier, feedbackOptions) {
      const url = new URL(
        `${baseUrl}${HMRC_FPH_VALIDATION_FEEDBACK_PATH.replace(
          "{api}",
          encodeURIComponent(apiIdentifier),
        )}`,
      );
      if (feedbackOptions?.connectionMethod) {
        url.searchParams.set(
          "connectionMethod",
          feedbackOptions.connectionMethod,
        );
      }

      const response = await fetchImpl(url, {
        method: "GET",
        headers: {
          Accept: acceptHeader,
          Authorization: `Bearer ${options.authorizationToken}`,
        },
      });

      return parseJsonResponse(response, normalizeFeedbackResponse);
    },
  };
}

export function createFixtureFphValidatorClient(
  options: CreateFixtureFphValidatorClientOptions = {},
): HmrcFphValidatorClient {
  let lastValidatedHeaders: Record<string, string> | null = null;

  return {
    async validateHeaders(headers) {
      lastValidatedHeaders = { ...headers };
      if (options.onValidateHeaders) {
        return options.onValidateHeaders(headers);
      }
      return buildDefaultFixtureValidateResponse(headers);
    },

    async getValidationFeedback(apiIdentifier, feedbackOptions) {
      if (options.onGetValidationFeedback) {
        return options.onGetValidationFeedback(apiIdentifier, feedbackOptions);
      }
      return buildDefaultFixtureFeedbackResponse(lastValidatedHeaders ?? {});
    },
  };
}

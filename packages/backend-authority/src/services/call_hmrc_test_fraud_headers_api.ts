export const HMRC_TEST_FRAUD_HEADERS_BASE_URL = "https://test-api.service.hmrc.gov.uk";
export const HMRC_TEST_FRAUD_HEADERS_VALIDATE_PATH = "/test/fraud-prevention-headers/validate";

export type HmrcFraudHeaderValidatorFinding = {
  code: string;
  headers: string[];
  message: string;
};

export type HmrcFraudHeaderValidatorResponse = {
  code: "VALID_HEADERS" | "INVALID_HEADERS" | "POTENTIALLY_INVALID_HEADERS";
  errors: HmrcFraudHeaderValidatorFinding[];
  message: string;
  specVersion: string;
  warnings: HmrcFraudHeaderValidatorFinding[];
};

export type HmrcFraudHeaderValidatorAdapter = {
  validateHeaders(headers: Record<string, string>): Promise<HmrcFraudHeaderValidatorResponse>;
};

type FetchLike = typeof fetch;

function normalizeFindings(value: unknown): HmrcFraudHeaderValidatorFinding[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) => {
    const record = entry as Record<string, unknown>;
    return {
      code: typeof record.code === "string" ? record.code : "UNKNOWN",
      headers: Array.isArray(record.headers)
        ? record.headers.filter((candidate): candidate is string => typeof candidate === "string").sort()
        : [],
      message: typeof record.message === "string" ? record.message : "",
    };
  });
}

function normalizeResponse(value: unknown): HmrcFraudHeaderValidatorResponse {
  const record = value as Record<string, unknown>;
  const code =
    record.code === "VALID_HEADERS" ||
    record.code === "INVALID_HEADERS" ||
    record.code === "POTENTIALLY_INVALID_HEADERS"
      ? record.code
      : "INVALID_HEADERS";
  return {
    code,
    errors: normalizeFindings(record.errors),
    message: typeof record.message === "string" ? record.message : "",
    specVersion: typeof record.specVersion === "string" ? record.specVersion : "unknown",
    warnings: normalizeFindings(record.warnings),
  };
}

export function createOfflineHmrcFraudHeaderValidatorAdapter(
  response?: Partial<HmrcFraudHeaderValidatorResponse>,
): HmrcFraudHeaderValidatorAdapter {
  return {
    async validateHeaders() {
      return normalizeResponse({
        code: response?.code ?? "VALID_HEADERS",
        errors: response?.errors ?? [],
        message: response?.message ?? "Offline fixture validator accepted fraud-prevention headers.",
        specVersion: response?.specVersion ?? "offline-contract-v1",
        warnings: response?.warnings ?? [],
      });
    },
  };
}

export function createHmrcSandboxFraudHeaderValidatorAdapter(input: {
  authorization_token: string;
  fetch_impl?: FetchLike;
}): HmrcFraudHeaderValidatorAdapter {
  const fetchImpl = input.fetch_impl ?? fetch;
  return {
    async validateHeaders(headers) {
      const response = await fetchImpl(
        `${HMRC_TEST_FRAUD_HEADERS_BASE_URL}${HMRC_TEST_FRAUD_HEADERS_VALIDATE_PATH}`,
        {
          headers: {
            Accept: "application/vnd.hmrc.1.0+json",
            Authorization: `Bearer ${input.authorization_token}`,
            ...headers,
          },
          method: "GET",
        },
      );
      const body = await response.text();
      const parsed = body.length > 0 ? JSON.parse(body) : {};
      if (!response.ok) {
        throw new Error(`HMRC fraud-header validator failed with HTTP ${response.status}`);
      }
      return normalizeResponse(parsed);
    },
  };
}

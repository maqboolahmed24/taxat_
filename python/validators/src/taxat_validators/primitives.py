from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Mapping, cast
from urllib.parse import quote


NONE_SENTINEL = "<NONE>"
AUTHORITY_REQUEST_IDENTITY_PROFILE_VERSION = "AUTHORITY_REQUEST_IDENTITY_V2"
EXACT_DECIMAL_PATTERN = re.compile(r"^-?(0|[1-9]\d*)(\.\d+)?$")
INSTANT_PATTERN = re.compile(
    r"^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$"
)
BUSINESS_DATE_PATTERN = re.compile(r"^(\d{4})-(\d{2})-(\d{2})$")
CALENDAR_MONTH_PATTERN = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")
CALENDAR_QUARTER_PATTERN = re.compile(r"^\d{4}-Q[1-4]$")
TAX_YEAR_PATTERN = re.compile(r"^(\d{4})-(\d{4})$")
PATH_TEMPLATE_PARAM_PATTERN = re.compile(r"\{([^{}]+)\}")


class CanonicalPrimitiveError(RuntimeError):
    def __init__(self, code: str, detail: str) -> None:
        super().__init__(f"{code}: {detail}")
        self.code = code


def assert_identifier_literal(value: object, *, family: str, kind: str) -> str:
    if not isinstance(value, str):
        raise CanonicalPrimitiveError(
            "IDENTIFIER_STRING_REQUIRED",
            f"{family} {kind} values must remain schema-shaped strings",
        )
    if not value:
        raise CanonicalPrimitiveError(
            "IDENTIFIER_EMPTY",
            f"{family} {kind} values must not be empty strings",
        )
    return value


def _normalize_string(value: str) -> str:
    return unicodedata.normalize("NFC", value)


def _normalize_canonical_json(value: object) -> object:
    if value is None or isinstance(value, bool):
        return value
    if isinstance(value, str):
        return _normalize_string(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        if value != value or value in (float("inf"), float("-inf")):
            raise CanonicalPrimitiveError(
                "HASH_NON_FINITE_NUMBER",
                "canonical JSON rejects NaN and infinite numbers",
            )
        if value == 0.0 and str(value).startswith("-"):
            raise CanonicalPrimitiveError(
                "HASH_NEGATIVE_ZERO_NUMBER",
                "canonical JSON rejects negative zero numbers",
            )
        return value
    if isinstance(value, datetime):
        return normalize_utc_instant_string(value.isoformat())
    if isinstance(value, list):
        entries = cast(list[object], value)
        return [_normalize_canonical_json(entry) for entry in entries]
    if isinstance(value, dict):
        normalized: dict[str, object] = {}
        mapping = cast(dict[object, object], value)
        for key, entry in mapping.items():
            normalized_key = _normalize_string(str(key))
            if normalized_key in normalized:
                raise CanonicalPrimitiveError(
                    "HASH_DUPLICATE_NORMALIZED_KEY",
                    f"multiple object keys normalize to {normalized_key}",
                )
            normalized[normalized_key] = _normalize_canonical_json(entry)
        return {key: normalized[key] for key in sorted(normalized)}
    raise CanonicalPrimitiveError(
        "HASH_UNSUPPORTED_VALUE",
        f"canonical JSON does not support {type(value).__name__}",
    )


def canonical_json_dumps(value: object) -> str:
    return json.dumps(
        _normalize_canonical_json(value),
        ensure_ascii=True,
        separators=(",", ":"),
        sort_keys=True,
    )


def stable_json_hash(value: object) -> str:
    encoded = canonical_json_dumps(value).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def stable_query_string(query_params: Mapping[str, object]) -> str:
    pairs: list[str] = []
    for key in sorted(query_params):
        raw_value = query_params[key]
        values = cast(list[object], raw_value) if isinstance(raw_value, list) else [raw_value]
        encoded_key = quote(str(key), safe="-._~")
        for value in values:
            pairs.append(f"{encoded_key}={quote(str(value), safe='-._~')}")
    return "&".join(pairs)


def stable_path(resource_template: object, resolved_path_params: object) -> str | None:
    if not isinstance(resource_template, str) or not resource_template:
        return None
    if not isinstance(resolved_path_params, dict):
        return None

    params = cast(dict[str, object], resolved_path_params)
    missing_keys: list[str] = []

    def replace(match: re.Match[str]) -> str:
        key = match.group(1)
        value = params.get(key)
        if not isinstance(value, str) or not value:
            missing_keys.append(key)
            return match.group(0)
        return quote(value, safe="-._~")

    canonical_path = PATH_TEMPLATE_PARAM_PATTERN.sub(replace, resource_template)
    if missing_keys or "{" in canonical_path or "}" in canonical_path:
        return None
    return canonical_path


def normalized_optional_identity_value(value: object) -> str:
    if isinstance(value, str) and value:
        return value
    return NONE_SENTINEL


def normalized_string_sequence(values: object) -> list[object]:
    if not isinstance(values, list) or not values:
        return [NONE_SENTINEL]
    sequence = cast(list[object], values)
    return list(sequence)


def sort_set_like_strings(values: list[str]) -> list[str]:
    return sorted(_normalize_string(value) for value in values)


def derive_authority_identity_namespace_hash(payload: Mapping[str, object]) -> str:
    return stable_json_hash(
        {
            "identity_profile_version": AUTHORITY_REQUEST_IDENTITY_PROFILE_VERSION,
            "authority_name": payload.get("authority_name"),
            "authority_product_profile": payload.get("authority_product_profile"),
            "provider_environment": payload.get("provider_environment"),
            "authority_scope": payload.get("authority_scope"),
            "operation_family": payload.get("operation_family"),
            "operation_profile": payload.get("operation_profile"),
            "provider_api_version": payload.get("provider_api_version"),
            "binding_lineage_ref": payload.get("binding_lineage_ref"),
        }
    )


def derive_authority_duplicate_meaning_key(
    payload: Mapping[str, object],
    canonical_path: str,
    canonical_query: str,
    normalized_obligation_ref: str,
    normalized_basis_type: str,
) -> str:
    return stable_json_hash(
        {
            "identity_profile_version": AUTHORITY_REQUEST_IDENTITY_PROFILE_VERSION,
            "identity_namespace_hash": derive_authority_identity_namespace_hash(payload),
            "tenant_id": payload.get("tenant_id"),
            "client_id": payload.get("client_id"),
            "attempt_lineage_manifest_id": payload.get("attempt_lineage_manifest_id"),
            "business_partition_refs": normalized_string_sequence(
                payload.get("business_partition_refs")
            ),
            "normalized_obligation_ref": normalized_obligation_ref,
            "normalized_basis_type": normalized_basis_type,
            "http_method": payload.get("http_method"),
            "canonical_path": canonical_path,
            "canonical_query": canonical_query,
            "request_body_hash": payload.get("request_body_hash"),
            "access_binding_hash": payload.get("access_binding_hash"),
        }
    )


def derive_authority_request_hash(payload: Mapping[str, object], duplicate_meaning_key: str) -> str:
    return stable_json_hash(
        {
            "identity_profile_version": AUTHORITY_REQUEST_IDENTITY_PROFILE_VERSION,
            "identity_namespace_hash": derive_authority_identity_namespace_hash(payload),
            "duplicate_meaning_key": duplicate_meaning_key,
            "header_profile_refs": payload.get("header_profile_refs"),
            "token_binding_ref": payload.get("token_binding_ref"),
            "authority_binding_ref": payload.get("authority_binding_ref"),
            "authority_link_ref": payload.get("authority_link_ref"),
            "delegation_grant_ref": normalized_optional_identity_value(
                payload.get("delegation_grant_ref")
            ),
            "subject_ref": payload.get("subject_ref"),
            "acting_party_ref": payload.get("acting_party_ref"),
            "policy_snapshot_hash": payload.get("policy_snapshot_hash"),
        }
    )


def derive_authority_idempotency_key(duplicate_meaning_key: str) -> str:
    return stable_json_hash(
        {
            "identity_profile_version": AUTHORITY_REQUEST_IDENTITY_PROFILE_VERSION,
            "duplicate_meaning_key": duplicate_meaning_key,
        }
    )


def _power_of_ten(exponent: int) -> int:
    return 10**exponent


@dataclass(frozen=True)
class ExactDecimal:
    unscaled: int
    scale: int

    @classmethod
    def parse(cls, value: object) -> "ExactDecimal":
        if not isinstance(value, str):
            raise CanonicalPrimitiveError(
                "DECIMAL_NON_STRING_INPUT",
                "exact decimals are parsed from canonical string literals only",
            )
        if not EXACT_DECIMAL_PATTERN.fullmatch(value):
            raise CanonicalPrimitiveError(
                "DECIMAL_NON_CANONICAL_LITERAL",
                "exact decimals must use canonical strings with no exponent or locale separators",
            )
        negative = value.startswith("-")
        unsigned = value[1:] if negative else value
        whole, _, fraction = unsigned.partition(".")
        digits = int(f"{whole}{fraction or ''}")
        unscaled = -digits if negative else digits
        if negative and unscaled == 0:
            raise CanonicalPrimitiveError(
                "DECIMAL_NEGATIVE_ZERO_FORBIDDEN",
                "negative zero serialization is forbidden",
            )
        return cls(unscaled=unscaled, scale=len(fraction))

    @classmethod
    def zero(cls, scale: int = 0) -> "ExactDecimal":
        return cls(unscaled=0, scale=scale)

    def to_canonical_string(self) -> str:
        negative = self.unscaled < 0
        digits = str(abs(self.unscaled))
        padded = digits.rjust(self.scale + 1, "0") if self.scale else digits
        if self.scale == 0:
            literal = padded
        else:
            literal = f"{padded[: -self.scale] or '0'}.{padded[-self.scale :]}"
        return f"-{literal}" if negative else literal

    def compare(self, other: "ExactDecimal") -> int:
        result_scale = max(self.scale, other.scale)
        left = self.with_scale(result_scale).unscaled
        right = other.with_scale(result_scale).unscaled
        if left < right:
            return -1
        if left > right:
            return 1
        return 0

    def with_scale(self, scale: int) -> "ExactDecimal":
        if scale == self.scale:
            return self
        if scale > self.scale:
            return ExactDecimal(self.unscaled * _power_of_ten(scale - self.scale), scale)
        divisor = _power_of_ten(self.scale - scale)
        if self.unscaled % divisor != 0:
            raise CanonicalPrimitiveError(
                "DECIMAL_SCALE_TRUNCATION",
                "rescaling would discard significant fractional digits",
            )
        return ExactDecimal(self.unscaled // divisor, scale)

    def add(self, other: "ExactDecimal", explicit_scale: int | None = None) -> "ExactDecimal":
        result_scale = (
            explicit_scale if explicit_scale is not None else max(self.scale, other.scale)
        )
        return ExactDecimal(
            self.with_scale(result_scale).unscaled + other.with_scale(result_scale).unscaled,
            result_scale,
        )

    def subtract(self, other: "ExactDecimal", explicit_scale: int | None = None) -> "ExactDecimal":
        result_scale = (
            explicit_scale if explicit_scale is not None else max(self.scale, other.scale)
        )
        return ExactDecimal(
            self.with_scale(result_scale).unscaled - other.with_scale(result_scale).unscaled,
            result_scale,
        )

    def abs(self) -> "ExactDecimal":
        return ExactDecimal(abs(self.unscaled), self.scale)


def normalize_utc_instant_string(value: object) -> str:
    if not isinstance(value, str):
        raise CanonicalPrimitiveError(
            "TIME_STRING_REQUIRED",
            "instants must be provided as ISO-8601 strings",
        )
    if not INSTANT_PATTERN.fullmatch(value):
        raise CanonicalPrimitiveError(
            "TIME_INVALID_INSTANT",
            "instants must include a timezone and use seconds with optional millisecond precision",
        )
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    normalized = parsed.astimezone(timezone.utc)
    if normalized.microsecond % 1000 != 0:
        raise CanonicalPrimitiveError(
            "TIME_INVALID_INSTANT",
            "instants must not exceed millisecond precision",
        )
    if normalized.microsecond == 0:
        return normalized.replace(tzinfo=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    milliseconds = normalized.microsecond // 1000
    return normalized.replace(tzinfo=timezone.utc).strftime(
        f"%Y-%m-%dT%H:%M:%S.{milliseconds:03d}Z"
    )


def normalize_business_date(value: object) -> str:
    if not isinstance(value, str):
        raise CanonicalPrimitiveError(
            "TIME_STRING_REQUIRED",
            "business dates must be provided as YYYY-MM-DD strings",
        )
    match = BUSINESS_DATE_PATTERN.fullmatch(value)
    if not match:
        raise CanonicalPrimitiveError(
            "TIME_INVALID_BUSINESS_DATE",
            "business dates must use the calendar-safe YYYY-MM-DD shape",
        )
    year, month, day = map(int, match.groups())
    try:
        date(year, month, day)
    except ValueError as error:
        raise CanonicalPrimitiveError(
            "TIME_INVALID_BUSINESS_DATE",
            "business date components do not form a valid calendar date",
        ) from error
    return value


def normalize_business_period_label(value: object, family: str) -> str:
    if not isinstance(value, str):
        raise CanonicalPrimitiveError(
            "TIME_STRING_REQUIRED",
            "business period labels must be strings",
        )
    if family == "CALENDAR_MONTH":
        if not CALENDAR_MONTH_PATTERN.fullmatch(value):
            raise CanonicalPrimitiveError(
                "TIME_INVALID_PERIOD_LABEL",
                "calendar month labels must use YYYY-MM",
            )
        return value
    if family == "CALENDAR_QUARTER":
        if not CALENDAR_QUARTER_PATTERN.fullmatch(value):
            raise CanonicalPrimitiveError(
                "TIME_INVALID_PERIOD_LABEL",
                "calendar quarter labels must use YYYY-Q1 through YYYY-Q4",
            )
        return value
    if family == "TAX_YEAR":
        match = TAX_YEAR_PATTERN.fullmatch(value)
        if not match:
            raise CanonicalPrimitiveError(
                "TIME_INVALID_PERIOD_LABEL",
                "tax year labels must use YYYY-YYYY",
            )
        start_year = int(match.group(1))
        end_year = int(match.group(2))
        if end_year != start_year + 1:
            raise CanonicalPrimitiveError(
                "TIME_INVALID_PERIOD_LABEL",
                "tax year labels must advance by one year",
            )
        return value
    raise CanonicalPrimitiveError(
        "TIME_INVALID_PERIOD_LABEL",
        f"unknown business period family {family}",
    )


__all__ = [
    "AUTHORITY_REQUEST_IDENTITY_PROFILE_VERSION",
    "CanonicalPrimitiveError",
    "EXACT_DECIMAL_PATTERN",
    "ExactDecimal",
    "NONE_SENTINEL",
    "assert_identifier_literal",
    "canonical_json_dumps",
    "derive_authority_duplicate_meaning_key",
    "derive_authority_idempotency_key",
    "derive_authority_identity_namespace_hash",
    "derive_authority_request_hash",
    "normalize_business_date",
    "normalize_business_period_label",
    "normalize_utc_instant_string",
    "normalized_optional_identity_value",
    "normalized_string_sequence",
    "sort_set_like_strings",
    "stable_json_hash",
    "stable_path",
    "stable_query_string",
]

# Fraud Prevention Header Capture, Validation, And Binding

HMRC says some APIs require HTTP fraud-prevention headers, including VAT (MTD) and Income Tax Self
Assessment (MTD) APIs and associated endpoints. HMRC also says the required data depends on the
application connection method, header values must be ASCII or percent encoded, exceptional missing
data must be discussed with HMRC, and the Test Fraud Prevention Headers API gives feedback for
individual requests:

- https://developer.service.hmrc.gov.uk/guides/fraud-prevention/
- https://developer.service.hmrc.gov.uk/guides/fraud-prevention/connection-method/
- https://developer.service.hmrc.gov.uk/guides/fraud-prevention/getting-it-right/
- https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/txm-fph-validator-api/1.0

Taxat treats those rules as protocol validity for HMRC-bound authority traffic.

## Typed Refs

- `fraud_header_profile_ref`: the selected provider/profile policy, including connection method,
  operation applicability, required headers, redaction policy, validation TTL, and exemption policy.
- `fraud_header_capture_ref`: a durable capture artifact for one normalized header set and one
  tenant/client/subject/environment/operation tuple.
- `fraud_header_validation_ref`: a validation artifact for the exact capture fingerprint and header
  set hash, with mode `OFFLINE_CONTRACT`, `HMRC_SANDBOX_VALIDATOR`, or
  `FIXTURE_SANDBOX_VALIDATOR`.
- `fraud_header_exemption_reason`: explicit HMRC-agreed missing-data posture. It cannot coexist with
  capture or validation refs and must not later be rewritten as a synthetic complete capture.

## Storage Model

Low-risk values such as `Gov-Client-Connection-Method` may be stored raw in the capture summary.
High-risk device/network values such as public IP, public port, and device identifiers are stored as
hashes and redacted summaries in normal repository rows. If raw payload retention is required, it must
use `secure_payload_ref_or_null`; raw values must not be written to logs, traces, analytics, or
browser-visible debug pages.

Every capture retains:

- `header_set_hash`
- `capture_fingerprint`
- normalized header names
- missing mandatory header names
- redacted header summaries
- secure payload ref, if raw secure storage exists

## Applicability

A profile is applicable only when authority name, authority product profile, provider environment,
operation family, optional operation profile ref, and connection method match the request context.
Missing required profile, environment drift, operation-profile drift, connection-method drift, or
disallowed exemption posture blocks request binding.

## Request Binding

The request-binding service returns the only fraud-header fields that should be passed into
`AuthorityRequestEnvelope` materialization. A validated binding requires:

- capture and validation from the same tenant/client/subject/environment tuple
- capture operation family/profile/product matching the request
- validation profile, capture ref, capture fingerprint, and header-set hash matching the capture
- validation result not `INVALID`
- validation not expired at request seal time

The request envelope stores refs only. Binding evidence remains immutable in profile, capture, and
validation repositories.

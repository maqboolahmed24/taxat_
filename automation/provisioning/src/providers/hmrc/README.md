# HMRC Provider Extension Surface

This directory is reserved for HMRC-specific provisioning recipes, selector manifests, and documentation.

The current workspace intentionally stops at the extension surface:

- HMRC provider IDs and flow metadata are registered in `src/core/provider_registry.ts`
- live HMRC automation remains gated behind explicit environment flags
- product-runtime sign-in automation remains out of scope

## Intended Flows

- Developer Hub workspace setup
- Sandbox application registration
- Production application registration verification
- Redirect URI and scope verification
- Fraud-prevention profile validation and sandbox binding evidence

## Mandatory Policy Boundaries

- use the shared environment and authority-profile catalog from `pc_0031`
- stop at manual checkpoints for email verification, CAPTCHA, MFA, or human review
- treat browser storage as secret material if persisted at all
- do not automate product-runtime OAuth sign-in for the Taxat product

## Official References

- Developer Hub sandbox guidance: <https://developer.service.hmrc.gov.uk/api-documentation/docs/testing>
- User-restricted endpoint and redirect guidance: <https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/user-restricted-endpoints>
- Fraud-prevention connection methods: <https://developer.service.hmrc.gov.uk/guides/fraud-prevention/connection-method/>

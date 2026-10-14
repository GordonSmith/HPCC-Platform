# Unit 2 NFR Requirements

## Dali and Authorization
- Dali unavailability fails metadata binding with a typed metadata-unavailable error; stale authorization is never used.
- Metadata may be cached only with explicit version/invalidation checks.
- Authorization decisions remain request-local and are never reused from a process-wide cache.
- Bind-time authorization occurs before schema exposure or reader initialization, with relevant part/copy rechecks before reading.

## Metadata and Type-Mapping Performance
- Map each distinct layout once per request and reuse immutable descriptors across metadata and scan consumers.
- Avoid repeated parsing of identical layout structures within one request.
- Metadata descriptors must be immutable after bind and safe to share among read-only consumers.
- Mapping must preserve deterministic field order and warning order.

## Nested Resource Policy
- Metadata and schema responses are unbounded by application-level nested-size controls, per approved scope.
- External transport, deployment, and operator limits may still constrain delivery outside Unit 2.

## Fallback and Diagnostics
- Unsupported/custom fields use deterministic VARCHAR/JSON fallback values with explicit warning codes and field paths.
- DescribeFile and ExplainScan expose fallback warnings; warnings do not leak physical paths or unauthorized metadata.
- Invalid layouts and malformed metadata remain typed failures.

## Security
- Security Baseline is disabled by approved scope change for unbounded metadata/schema responses.
- Request-local identity and authorization are mandatory.
- Input and logical-name validity are validated before downstream work.
- Physical paths/copy endpoints are redacted by default.
- Errors and warnings do not expose secrets, credentials, stack traces, or internal filesystem details.

## Reliability and Maintainability
- Dali failures, layout incompatibility, and mapping failures are explicit and observable through structured result diagnostics.
- Shared mapping behavior is covered by example-based and regression tests; PBT remains disabled by approved scope.
- Preserve existing HPCC metadata utilities and reference-counting/thread-safety conventions.

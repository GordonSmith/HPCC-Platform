# Unit 2 NFR Design Patterns

## Fail-Closed Dali Access
- Resolve logical-file metadata through Dali during bind.
- Fail immediately with a typed metadata-unavailable error when Dali cannot provide authoritative metadata.
- Keep authorization request-local and recheck relevant part/copy access before reading.
- Do not serve stale authorization facts.

## Metadata Cache Boundary
- Unit 2 uses request-local metadata descriptors only.
- No process-wide metadata or authorization cache is introduced.
- Immutable descriptors are shared only within the request after authoritative bind.

## Unbounded Metadata and Schema Policy
- Metadata and schema responses are unbounded by application-level nested-size controls, per approved scope.
- Nested structures map to LIST/STRUCT/MAP where representable without imposing a Unit 2 depth, field-count, collection-cardinality, warning-size, or metadata-response limit.
- External transport, deployment, and operator controls remain outside Unit 2.

## Warning and Redaction Pattern
- Fallback values carry typed warning records with stable codes and field paths.
- DescribeFile and ExplainScan expose fallback warnings.
- Physical paths, copy endpoints, secrets, and unauthorized metadata use a shared redaction policy.

## Immutable Type Descriptors
- Map each distinct layout once per request.
- Reuse immutable descriptors across ListFiles, DescribeFile, ExplainScan, bind, and later readers.
- Preserve deterministic field order and warning order.

## Verification Points
- Example-based tests cover Dali failure, request-local cache isolation, nested mapping, fallback warnings, redaction, and malformed layouts.
- Security verification covers authentication, DFS authorization, and physical-detail redaction; application-level size bounds are intentionally not applied under approved scope.

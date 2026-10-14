# Unit 2 NFR Requirements Plan: Metadata and Type Foundation

## Unit Context
- **Unit**: Metadata and Type Foundation
- **Functional Design**: `aidlc-docs/construction/unit-2-metadata-type-foundation/functional-design/`
- **Dependencies**: Unit 1 foundation, Dali/security, existing metadata utilities.
- **Stories**: US-03 directly; supports US-01, US-02, US-04, US-05, US-07, and US-10.
- **PBT**: Disabled by approved scope; use example-based and regression tests.

## Assessment Checklist
- [x] Define Dali availability, authorization, and consistency requirements.
- [x] Define metadata/type-mapping performance and memory requirements.
- [x] Define superfile and nested-value resource bounds.
- [x] Define security/redaction and warning/error requirements.
- [x] Define maintainability and compatibility requirements.
- [x] Generate `nfr-requirements.md`.
- [x] Generate `tech-stack-decisions.md`.
- [x] Validate NFRs against Unit 2 Functional Design and approved scope.

## Clarifying Questions

## Question 1: Dali Failure Behavior
How should temporary Dali unavailability affect metadata binding?

A) Fail the request with a typed metadata-unavailable error; do not use stale authorization

B) Retry with bounded backoff, then fail with a typed metadata-unavailable error

C) Use a bounded cache for metadata and authorization facts when Dali is unavailable

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2: Metadata Caching
What caching policy should Unit 2 use for file metadata?

A) No process-wide cache; resolve metadata per request for consistency

B) Immutable metadata cache with explicit invalidation/version checks, never caching authorization decisions beyond the request

C) Time-based cache for metadata and authorization decisions

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Follow-up Question 6: Authorization Cache Safety
The approved requirements prohibit caching authorization decisions beyond the request. How should metadata caching be constrained?

A) Cache metadata only with version/invalidation checks; never cache authorization decisions beyond the request

B) Keep the selected time-based cache for metadata and authorization decisions; revise the approved security requirement

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Follow-up Question 8: Security Baseline Conflict
Questions 6 and 7 select cached authorization decisions and unbounded nested metadata, which conflict with the enabled Security Baseline and resource-isolation requirements. Which direction should the project take?

A) Preserve Security Baseline: use bounded nested metadata and request-local authorization decisions; revise Questions 6 and 7 accordingly

B) Disable the Security Baseline and revise the approved security/resource requirements to allow these behaviors

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3: Nested-Value Resource Bounds
What bounds should apply to nested metadata and mapped schema generation?

A) Enforce configured maximum nesting depth, fields, collection cardinality metadata, and serialized warning size

B) Allow repository defaults only; enforce result bounds later during scan

C) Reject all nested collections in Unit 2 and defer them to a later unit

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Follow-up Question 7: Nested Resource Safety
The approved security/resource requirements require bounds for nested metadata and mapped schema generation. How should Unit 2 handle those bounds?

A) Enforce configured maximum nesting depth, field count, collection metadata, and warning size

B) Revise the approved requirements to allow unbounded nested metadata

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4: Fallback Warning Contract
How should unsupported-field fallback warnings be exposed?

A) Include deterministic warning codes and field paths in DescribeFile/ExplainScan metadata and diagnostics

B) Log warnings only; clients receive fallback values without warning metadata

C) Return warnings only in ExplainScan, not DescribeFile

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 5: Type-Mapping Performance
What performance target should apply to shared type mapping?

A) Map each distinct layout once per request and reuse immutable descriptors for all metadata/scan consumers

B) Recompute mapping independently in each consumer for simpler ownership

C) Cache mappings process-wide without layout version checks

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Approval Gate
Answer every `[Answer]:` field and explicitly approve this Unit 2 NFR Requirements plan before generating NFR artifacts.

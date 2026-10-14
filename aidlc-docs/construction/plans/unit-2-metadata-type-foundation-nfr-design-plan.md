# Unit 2 NFR Design Plan: Metadata and Type Foundation

## Unit Context
- **Unit**: Metadata and Type Foundation
- **NFR Requirements**: `aidlc-docs/construction/unit-2-metadata-type-foundation/nfr-requirements/`
- **Design focus**: request-local authorization, metadata-only caching, bounded nested schema mapping, deterministic fallback warnings, and Dali failure handling.

## Design Checklist
- [x] Define Dali failure and fail-closed authorization pattern.
- [x] Define request-local metadata caching without cached authorization decisions.
- [x] Define approved unbounded nested metadata/schema policy.
- [x] Define fallback warning and redaction pattern.
- [x] Define immutable type-descriptor ownership and reuse.
- [x] Generate `nfr-design-patterns.md`.
- [x] Generate `logical-components.md`.
- [x] Validate NFR Design against approved requirements and revised extension scope.

## Clarifying Questions

## Question 1: Dali Failure Pattern
Which pattern should handle temporary Dali unavailability?

A) Fail closed immediately with typed metadata-unavailable error

B) Bounded retry, then fail closed with typed metadata-unavailable error

C) Serve cached metadata and authorization facts while Dali is unavailable

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Follow-up Question 6: Dali Failure Pattern Detail
Which concrete existing-service behavior should Unit 2 follow for temporary Dali unavailability?

A) Fail closed immediately with a typed metadata-unavailable error

B) Use bounded retry, then fail closed with a typed metadata-unavailable error

X) Other (please name the existing service/pattern and describe the behavior after [Answer]: tag below)

[Answer]: A

## Question 2: Metadata Cache Boundary
How should metadata caching be implemented?

A) Request-local only; no process-wide metadata cache

B) Process-wide immutable metadata cache with version/invalidation checks; authorization remains request-local

C) Time-based process-wide cache for metadata and authorization decisions

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3: Nested Resource Controls
How should nested metadata bounds be enforced?

A) Central bounded-mapping component enforces depth, field count, collection metadata, and warning size

B) Each metadata consumer enforces its own limits independently

C) Enforce only response-size limits; nested schema generation remains unbounded

X) Other (please describe after [Answer]: tag below)

[Answer]: C

## Follow-up Question 7: Nested Bound Compliance
The approved NFRs require bounds on nested metadata/schema generation. Which compliant pattern should Unit 2 use?

A) Central bounded-mapping component enforces depth, field count, collection metadata, and warning size

B) Each metadata consumer enforces the same shared limits independently

X) Other (please describe after [Answer]: tag below)

[Answer]: X Unbounded nested schema generation is approved; no application-level nested-size controls apply.

## Follow-up Question 8: Nested Bound Resolution
Question 3 selected unbounded nested schema generation, while the approved NFRs require bounds. Should Unit 2 use the bounded central mapping pattern?

A) Yes - revise Question 3 to use the central bounded-mapping component

B) No - revise the approved NFRs to allow unbounded nested schema generation

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 4: Warning and Redaction Pattern
How should fallback warnings and physical-detail redaction be represented?

A) Typed warning records with stable codes/field paths plus a shared redaction policy

B) Free-form warning strings and per-method redaction logic

C) Log warnings only and omit warning metadata from responses

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 5: NFR Design Approval
What level of NFR design detail should be produced?

A) Patterns, logical components, ownership, control flow, bounds, and verification points

B) Patterns and logical components only; defer verification to Build and Test

C) Include concrete Dali/cache infrastructure resources and deployment topology

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Approval Gate
Answer every `[Answer]:` field and explicitly approve this Unit 2 NFR Design plan before generating its artifacts.

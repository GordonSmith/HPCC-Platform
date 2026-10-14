# Unit 2 Functional Design Plan: Metadata and Type Foundation

## Unit Context
- **Unit**: Metadata and Type Foundation
- **Responsibilities**: Dali lookup and authorization context, logical-file metadata, superfile expansion, layout validation, shared HPCC-to-DuckDB type mapping, nested-value model, and metadata methods.
- **Dependencies**: Unit 1 build/contract foundation, Dali/security, existing metadata utilities.
- **Enables**: Units 3 and 4.
- **Stories**: US-03 directly; supports US-01, US-02, US-04, US-05, US-07, and US-10.

## Functional Design Scope
Define technology-agnostic metadata binding, authorization, layout compatibility, deterministic type mapping, nested collection semantics, nested-value behavior, and metadata failure handling. Concrete Dali APIs, HPCC reader calls, DuckDB vector APIs, and source paths belong to later NFR/Code Generation plans.

## Plan Checklist
- [x] Define logical-file resolution and authorization flow.
- [x] Define superfile expansion and layout compatibility rules.
- [x] Define HPCC-to-DuckDB scalar and nested type mapping.
- [x] Define deterministic unsupported-type fallback and malformed-layout failures.
- [x] Define DescribeFile/ListFiles/ExplainScan metadata responsibilities.
- [x] Identify example-based boundary cases; PBT remains disabled.
- [x] Generate `business-logic-model.md`.
- [x] Generate `business-rules.md`.
- [x] Generate `domain-entities.md`.
- [x] Validate the design against Unit 2 scope and mapped stories.

## Clarifying Questions

## Question 1: Authorization Timing
When should Dali read authorization occur?

A) During bind before schema exposure or reader initialization

B) During scan after DuckDB has planned the query

C) Both: bind authorization for metadata and per-part authorization before reading

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Follow-up Question 6: Authorization/NFR Consistency
The approved requirements require Dali authorization during bind before schema exposure or reader initialization. Should Unit 2 preserve that requirement?

A) Yes - perform authorization during bind and recheck relevant part access before reading

B) No - revise the approved requirement so authorization begins during scan

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Follow-up Question 7: Type-Mapping/NFR Consistency
The approved requirements require deterministic rejection of unsupported or ambiguous types. Should Unit 2 preserve strict rejection?

A) Yes - reject unsupported/ambiguous types with a typed error; no fallback values

B) No - revise the approved requirement to allow VARCHAR/JSON fallback values

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 2: Superfile Schema Compatibility
How should incompatible superfile layouts be handled?

A) Reject at bind time and identify the exact incompatible subfile

B) Use the first subfile schema and report later conversion failures

C) Produce a union schema with explicit unsupported-field metadata

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3: Type Mapping Strictness
What should happen for unsupported or ambiguous HPCC types?

A) Reject deterministically with a typed unsupported-type error

B) Map to VARCHAR/JSON fallback values and report a warning

C) Expose the field as unsupported metadata but allow queries that omit it

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 4: Nested Collection Semantics
How should nested datasets, sets, and dictionaries be represented?

A) Map to DuckDB LIST/STRUCT/MAP where the HPCC type is unambiguous; reject ambiguous shapes

B) Serialize all nested values as JSON strings

C) Support nested rows first and defer collections to a later unit

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 5: Metadata Exposure
What should `ListFiles`, `DescribeFile`, and `ExplainScan` expose by default?

A) Authorized logical names, mapped schema/planning facts, and redacted physical details

B) Full physical part/copy paths for diagnostic usefulness

C) Logical names only; schema and planning details are query-only

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Approval Gate
Answer every `[Answer]:` field and explicitly approve this Unit 2 Functional Design plan before generating its artifacts.

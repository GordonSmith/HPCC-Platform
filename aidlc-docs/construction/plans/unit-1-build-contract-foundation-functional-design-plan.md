# Unit 1 Functional Design Plan: Build and Contract Foundation

## Unit Context
- **Unit**: Build and Contract Foundation
- **Responsibilities**: WSSQL2_SERVICE, DuckDB vcpkg/CMake wiring, ECM contract, plugin/service skeleton, static extension registration, and minimum build/test harness.
- **Dependencies**: Existing CMake/vcpkg/ESP/ECM infrastructure.
- **Enables**: Units 2 through 5.
- **Stories**: US-06 directly; supports US-01, US-02, US-07, and US-08 through the service and query-engine contract.

## Functional Design Scope
This stage defines technology-agnostic behavior and boundaries for the foundation unit. Concrete CMake syntax, ECM syntax, DuckDB API calls, and file-level implementation steps belong to later NFR and Code Generation plans.

## Plan Checklist
- [x] Define service/build activation behavior and compatibility rules.
- [x] Define ECM operation intent, validation outcomes, and response responsibilities.
- [x] Define static extension registration and request lifecycle behavior.
- [x] Define foundation error scenarios and state transitions.
- [x] Identify testable properties and example-based regression cases.
- [x] Generate `business-logic-model.md`.
- [x] Generate `business-rules.md`.
- [x] Generate `domain-entities.md`.
- [x] Validate functional design against Unit 1 scope and approved stories.

## Testable Properties
- **Invariant**: Enabling ws_sql2 does not enable or alter legacy ws_sql.
- **Idempotence**: Static extension registration is safe to invoke only once per request connection and rejects duplicate registration deterministically.
- **Round-trip**: Contract serialization/deserialization preserves valid request fields, typed parameter null state, and response schema metadata within documented lossy rules.
- **Oracle**: Service operation validation agrees with a simple allowlist model for supported operation classes.
- **Stateful**: Request lifecycle transitions do not permit execution before validation or after cancellation/limit failure.

## Clarifying Questions

## Question 1: Contract Scope
Which operations should Unit 1 define at the ECM contract level?

A) ExecuteSQL, ListFiles, DescribeFile, and ExplainScan with complete request/response fields from the approved requirements

B) Define only ExecuteSQL in Unit 1 and add metadata operations in Unit 2

C) Define all four operation names now but defer detailed response fields to later units

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2: Service Activation
What compatibility behavior should apply when WSSQL2_SERVICE is disabled or DuckDB is unavailable at build time?

A) Omit ws_sql2 targets and preserve all existing services unchanged

B) Build a stub service that returns a structured unavailable error

C) Fail the platform configuration unless DuckDB and ws_sql2 are available

X) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question 3: Registration Failure
How should static DuckDB extension registration failure be represented?

A) Fail request initialization with a typed internal error mapped to a service-unavailable category

B) Log the failure and attempt to execute without hpcc_scan

C) Fail process startup so a misconfigured service cannot accept requests

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4: Foundation Test Boundary
What should the Unit 1 test harness prove before Unit 2 begins?

A) Build activation, generated contract shape, plugin registration, static extension registration, and isolated request lifecycle smoke behavior

B) Build activation and generated contract shape only; runtime tests begin with Unit 2

C) Full end-to-end SQL execution using test files

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Approval Gate
Answer every `[Answer]:` field and explicitly approve this Functional Design plan before generating Unit 1 functional design artifacts.

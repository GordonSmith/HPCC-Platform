# ws_sql2 Unit of Work Plan

## Objective
Decompose the approved ws_sql2 design into manageable construction units with clear responsibilities, dependencies, acceptance boundaries, and test ownership.

## Proposed Units

### Unit 1: Build and Contract Foundation
Owns WSSQL2_SERVICE, DuckDB vcpkg/CMake wiring, ECM contract, plugin/service skeleton, static extension registration, and the minimum build/test harness.

### Unit 2: Metadata and Type Foundation
Owns Dali lookup and authorization context, logical-file metadata, superfile expansion, layout validation, shared HPCC-to-DuckDB type mapping, nested-value model, and metadata methods.

### Unit 3: KEY and Pushdown Core
Owns KEY reader adapter, filter translation, key monitors, projection handling, residual semantics, ExplainScan, and the first implementation priority selected in Requirements Analysis.

### Unit 4: FLAT and Result Execution
Owns FLAT/compressed/superfile reader adapters, vector production, JSON serialization, limits, cancellation, and ExecuteSQL orchestration.

### Unit 5: Packaging, Observability, and Validation
Owns service configuration, Linux packaging, metrics/traces/logging, fixtures, ESP tests, PBT integration, performance/regression checks, and documentation.

## Dependency Strategy
- Unit 1 blocks Units 2 through 5.
- Unit 2 blocks Units 3 and 4 because reader and pushdown units require shared metadata, authorization, and mapping.
- Unit 3 and non-reader portions of Unit 4 may proceed in parallel after Unit 2, but integration requires both.
- Unit 5 integrates all runtime units and the approved ECM contract.
- Keep `ws_sql` unchanged and retain independent `WSSQL2_SERVICE` enablement for rollback.

## Planning Checklist
- [x] Confirm unit boundaries and responsibilities.
- [x] Confirm dependency matrix and critical path.
- [x] Confirm story-to-unit mapping.
- [x] Confirm shared resources and integration checkpoints.
- [x] Generate `aidlc-docs/inception/application-design/unit-of-work.md`.
- [x] Generate `aidlc-docs/inception/application-design/unit-of-work-dependency.md`.
- [x] Generate `aidlc-docs/inception/application-design/unit-of-work-story-map.md`.
- [x] Validate every approved story is assigned or explicitly marked not applicable.

## Clarifying Questions

## Question 1: Unit Ownership
Should each proposed unit have a primary owner boundary even when it consumes shared HPCC utilities?

A) Yes - each unit owns its public outputs and test surface while shared utilities remain dependency-owned

B) No - all units share one ws_sql2 owner and are separated only for sequencing

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 2: Parallel Development
After Unit 2 is complete, should Units 3 and 4 be planned for parallel development?

A) Yes - parallelize where interfaces are stable and integrate before Unit 5

B) No - complete Unit 3 before starting Unit 4

C) Parallelize only tests and design; serialize implementation

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3: Story Allocation
How should cross-cutting stories such as authorization, limits, cancellation, diagnostics, and regression protection be assigned?

A) Assign one primary unit and list consuming units as dependencies

B) Duplicate each cross-cutting story in every affected unit

C) Assign cross-cutting stories to Unit 5 while runtime units provide implementation inputs

X) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question 4: Integration Checkpoints
What integration checkpoints should block progression between units?

A) Build/contract, metadata/type, KEY/pushdown, FLAT/result, then full packaging/test checkpoints

B) Only one final integration checkpoint after all implementation units

C) Build/contract and final integration checkpoints; intermediate units may be validated independently

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 5: Unit Plan Approval
What decomposition detail should the generated unit artifacts include?

A) Responsibilities, inputs/outputs, dependencies, stories, tests, and acceptance boundaries

B) Responsibilities and dependencies only; defer story/test allocation to construction

C) Include detailed implementation tasks and code file lists in each unit artifact

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Required Artifacts
- [x] `aidlc-docs/inception/application-design/unit-of-work.md` with unit definitions and responsibilities.
- [x] `aidlc-docs/inception/application-design/unit-of-work-dependency.md` with dependency matrix.
- [x] `aidlc-docs/inception/application-design/unit-of-work-story-map.md` mapping all stories to units.
- [x] Validate unit boundaries and dependencies.
- [x] Ensure every approved story is assigned or explicitly marked not applicable.

## Approval Gate
Answer every `[Answer]:` field and explicitly approve this unit-of-work plan before generating the unit artifacts.

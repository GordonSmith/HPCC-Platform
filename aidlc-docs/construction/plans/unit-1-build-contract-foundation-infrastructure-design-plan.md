# Unit 1 Infrastructure Design Plan: Build and Contract Foundation

## Unit Context
- **Unit**: Build and Contract Foundation
- **Functional/NFR Design**: Unit 1 functional-design and nfr-design artifacts.
- **Infrastructure focus**: CMake/vcpkg targets, ECM generation, ESP service configuration, Linux packaging, GitHub Actions compatibility, and explicit end-user ownership boundaries.

## Design Checklist
- [x] Map WSSQL2_SERVICE and DuckDB to existing CMake/vcpkg infrastructure.
- [x] Map ws_sql2 ECM generation and ESP plugin/service registration.
- [x] Define Linux primary-triplet packaging and configuration artifacts.
- [x] Define GitHub Actions build/test integration boundary.
- [x] Define monitoring/logging handoff and infrastructure ownership boundaries.
- [x] Generate `infrastructure-design.md`.
- [x] Generate `deployment-architecture.md`.
- [x] Validate infrastructure design against approved NFRs and end-user ownership decisions.

## Clarifying Questions

## Question 1: Deployment Environment
Which infrastructure environment should Unit 1 target?

A) Existing HPCC on-premise/Linux ESP deployment conventions; no new cloud services

B) Existing HPCC deployment conventions with Linux as the primary build/package target and other platforms later

C) Containerized/cloud deployment design in addition to the existing HPCC deployment conventions

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 2: Build and Package Mapping
How should DuckDB and ws_sql2 be mapped into the build/package system?

A) Existing CMake/vcpkg conditional dependency, ESP service target, generated ECM target, and Linux package/build-set entries

B) A separate standalone ws_sql2 build/package profile

C) Build target only; packaging is deferred to the end-user deployment owner

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3: CI Integration
What should GitHub Actions validate for Unit 1?

A) Configure/build ws_sql2, generate ECM types, run foundation smoke tests, and verify disabled ws_sql2 compatibility

B) Build only; test execution remains end-user owned

C) Full platform build and package publication in every pull request

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 4: Monitoring Handoff
Where should Unit 1 monitoring responsibilities end?

A) Emit structured logs, correlation IDs, initialization timing, and registration/configuration failure counters; end-user tooling consumes them

B) Define and provision a complete monitoring dashboard and alerting stack in this unit

C) Defer all monitoring to Unit 5 and emit no Unit 1 signals

X) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question 5: Deployment Ownership
How should deployment topology, rollback, regional placement, and incident response be represented?

A) Document them as end-user-owned handoff requirements; do not prescribe infrastructure resources here

B) Define repository-owned deployment resources and rollback automation in Unit 1

C) Omit them from Unit 1 artifacts because they are outside the codebase

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Follow-up Question 6: CI/NFR Consistency
The approved Unit 1 NFRs require a foundation smoke test for build activation, contract shape, plugin/static registration, request lifecycle, and disabled-service compatibility. How should GitHub Actions handle that requirement?

A) Run the required Unit 1 foundation smoke tests in GitHub Actions, without publishing packages on every pull request

B) Keep GitHub Actions build-only and explicitly move the smoke-test requirement to a later validation environment

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Follow-up Question 7: Monitoring/NFR Consistency
The approved Unit 1 NFRs require structured lifecycle logs, correlation IDs, registration/configuration failure counters, and initialization timing. How should Infrastructure Design represent that requirement?

A) Unit 1 emits the required signals; end-user monitoring tooling consumes them, while dashboards/alerts remain outside this unit

B) Remove those Unit 1 NFR requirements and defer all signals to Unit 5

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Follow-up Question 8: Approved NFR Change
Question 6 moves the Unit 1 foundation smoke tests out of GitHub Actions, which changes the approved NFR requirement. Should that NFR be revised?

A) Yes - revise the NFR so GitHub Actions builds only and smoke tests run in a later validation environment

B) No - change Question 6 to run the foundation smoke tests in GitHub Actions

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Approval Gate
Answer every `[Answer]:` field and explicitly approve this Infrastructure Design plan before generating Unit 1 infrastructure artifacts.

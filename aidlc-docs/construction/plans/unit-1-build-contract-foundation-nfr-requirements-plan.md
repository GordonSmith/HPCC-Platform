# Unit 1 NFR Requirements Plan: Build and Contract Foundation

## Unit Context
- **Unit**: Build and Contract Foundation
- **Functional Design**: `aidlc-docs/construction/unit-1-build-contract-foundation/functional-design/`
- **Stories**: US-06 directly; supports US-01, US-02, US-07, and US-08.
- **NFR focus**: dependency integrity, configuration failure behavior, request initialization reliability, security hardening, observability, and test technology.

## Assessment Checklist
- [x] Define build/dependency and supply-chain requirements.
- [x] Define startup/request initialization performance and reliability targets.
- [x] Define security validation, authorization, and sensitive-data handling requirements.
- [x] Define logging, metrics, tracing, and failure diagnostics requirements.
- [x] Resolve property-based testing policy. **PBT disabled by approved follow-up; no framework required.**
- [x] Define maintainability and compatibility requirements.
- [x] Generate `nfr-requirements.md`.
- [x] Generate `tech-stack-decisions.md`.
- [x] Validate NFRs against Unit 1 functional design and enabled extensions.

## Extension Enforcement
- **Security Baseline**: Enabled and blocking for applicable controls.
- **Property-Based Testing**: Disabled by approved follow-up; PBT-09 is not applicable to this project.
- **Resiliency Baseline**: Enabled as directional guidance; deployment-owned decisions remain outside this unit.

## Clarifying Questions

## Question 1: C++ Property-Based Testing Framework
Which framework should Unit 1 use for property-based tests?

A) RapidCheck, integrated with the existing C++ test runner

B) GoogleTest plus a project-approved generator/property library selected during implementation

C) Defer framework selection to the repository's existing test infrastructure discovery

X) Other (please describe after [Answer]: tag below)

[Answer]: C

## PBT-09 Follow-up: Framework Selection
Repository discovery did not confirm an existing C++ property-based testing framework. The approved decision disables PBT for this project.

A) RapidCheck, integrated with the existing C++ test runner

B) Select another named C++ framework and provide its name after the `[Answer]:` tag

C) Do not enable property-based testing for this project; update extension configuration and downstream requirements accordingly

X) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question 2: Build Dependency Policy
What dependency policy should apply to DuckDB and PBT dependencies?

A) Exact vcpkg version/port pinning with dependency provenance and CI vulnerability checks

B) Repository-compatible version ranges with lock/catalog validation in CI

C) Use the existing platform dependency policy without adding Unit 1-specific controls

X) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question 3: Initialization Reliability
What initialization behavior should the NFRs target when static extension registration fails?

A) Fail the request quickly, expose a typed service-unavailable error, and keep the ESP process alive

B) Fail service startup and rely on deployment health checks to restart it

C) Retry registration with a bounded backoff before returning service-unavailable

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4: Foundation Observability
What minimum observability should be required before Unit 2 begins?

A) Structured logs, correlation ID, registration/configuration metrics, failure counters, and initialization timing

B) Structured logs and failure counters only; full metrics/traces begin in Unit 5

C) Full metrics and traces for every future scan dimension in Unit 1

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 5: Compatibility and Performance Target
What foundation performance/compatibility target should be documented?

A) No material regression to disabled ws_sql2 configuration; bounded request initialization with a measurable smoke-test threshold

B) Optimize only build time; runtime initialization targets begin with Unit 2

C) Require a production latency SLO for all four operations in Unit 1

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Approval Gate
Answer every `[Answer]:` field and explicitly approve this NFR Requirements plan before generating Unit 1 NFR artifacts.

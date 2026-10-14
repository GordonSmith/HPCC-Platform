# ws_sql2 User Stories

## Story Conventions
- **Priority**: Must, Should, Could, or Won't.
- **Acceptance criteria**: Given/When/Then for API behavior; checklists for operator and maintainer behavior.
- **Structure**: Small vertical slices, independently demonstrable through the API or operator workflow.
- **Operational ownership**: Deployment, rollback, topology, resiliency testing, and incident response remain in NFR/infrastructure artifacts rather than user stories.

## Acceptance Criteria and Requirement Mapping

Every story below includes acceptance criteria and a `Requirements` line mapping it to the approved requirements document.

## Epic A: Execute and Inspect Data

### US-01: Execute an authorized SELECT
- **Persona**: SQL Client
- **Priority**: Must
- **Story**: As a SQL client, I want to execute a SELECT over an explicitly named accessible DFS file so that I can analyze HPCC data without creating a workunit.
- **Acceptance criteria**:
  - Given an authorized logical filename and supported SELECT, when I submit the request, then ws_sql2 executes it through `hpcc_scan` and returns an ordered schema and JSON rows.
  - Given an unsupported statement, when I submit it, then the request is rejected with a structured error and no data access occurs.
  - Given the same input and stable source data, repeated execution returns stable schema and JSON representation.
- **Requirements**: FR-01, FR-02, FR-03, FR-09.

### US-02: Bind typed named parameters
- **Persona**: SQL Client
- **Priority**: Must
- **Story**: As a SQL client, I want named parameters with explicit types, values, and null state so that query input is safe and preserves HPCC/DuckDB semantics.
- **Acceptance criteria**:
  - Given a valid named parameter declaration, when I execute the query, then the parameter is bound without SQL string substitution.
  - Given a null parameter, when I execute the query, then its null state is preserved.
  - Given a type mismatch or malformed parameter, then ws_sql2 returns a bind error before scanning data.
- **Requirements**: FR-02, FR-05, FR-07.

### US-03: Discover accessible metadata
- **Persona**: SQL Client
- **Priority**: Must
- **Story**: As a SQL client, I want to list and describe accessible files so that I can select valid data sources and understand their mapped schema.
- **Acceptance criteria**:
  - Given an authenticated caller, when I call `ListFiles`, then only authorized logical files are returned.
  - Given an authorized file, when I call `DescribeFile`, then the response includes kind, compression, parts, layout, mapped DuckDB schema, and unsupported constructs.
  - Given an inaccessible or malformed file, then the response denies or reports the failure explicitly without silent omission.
- **Requirements**: FR-03, FR-04, FR-05, FR-07.

### US-04: Inspect pushdown and residual filters
- **Persona**: SQL Client
- **Priority**: Must
- **Story**: As a SQL client, I want `ExplainScan` to distinguish HPCC pushdown from DuckDB residual evaluation so that I can understand query behavior and performance.
- **Acceptance criteria**:
  - Given a projection and representable predicate, when I call `ExplainScan`, then requested/projection columns and translated HPCC filters or key monitors are reported.
  - Given a non-representable expression, then it is reported as a residual filter with the reason it was not pushed.
  - Given a plan explanation, then no data is read and physical paths/endpoints are redacted unless authorized.
- **Requirements**: FR-04, FR-06, FR-07.

### US-05: Receive nested and bounded results
- **Persona**: SQL Client
- **Priority**: Must
- **Story**: As a SQL client, I want nested values and result limits represented predictably so that applications can consume results without workunit-specific behavior.
- **Acceptance criteria**:
  - Given supported nested rows, datasets, sets, or dictionaries, then JSON preserves their documented STRUCT/LIST/MAP representation.
  - Given an unsupported field type, then the documented VARCHAR/JSON fallback and warning are returned deterministically.
  - Given a row, byte, memory, or duration limit, then execution stops safely and reports truncation or a structured limit error accurately.
  - Given decimals, large integers, binary values, non-finite floats, or nulls, then serialization follows the documented stable representation.
- **Requirements**: FR-05, FR-08, FR-09.

## Epic B: Secure and Operable Service

### US-06: Build and package ws_sql2 independently
- **Persona**: ESP Operator
- **Priority**: Must
- **Story**: As an ESP operator, I want ws_sql2 to have independent CMake/vcpkg and service configuration so that I can enable it without changing legacy ws_sql.
- **Acceptance criteria**:
  - The service can be enabled independently of `WSSQL_SERVICE`, Java, and ANTLR.
  - DuckDB 1.4.4 is statically registered and arbitrary extension auto-install/autoload is disabled.
  - Linux primary-triplet build, service configuration, manifest, and packaging artifacts are produced for the release candidate.
- **Requirements**: FR-01, FR-10.

### US-07: Enforce authorization and isolation
- **Persona**: Security Administrator
- **Priority**: Must
- **Story**: As a security administrator, I want every operation to use caller authorization and request-local context so that ws_sql2 cannot expose unauthorized DFS or ESP data.
- **Acceptance criteria**:
  - Every operation enforces `WsSql2Access` and Dali read authorization for each referenced logical file.
  - Local file access, network URLs, environment secrets, arbitrary extensions, and service-wide credentials are unavailable to query execution.
  - Unauthorized files, parts, metadata, and physical endpoints produce explicit denial or redacted responses.
- **Requirements**: FR-04, FR-07, NFR Security.

### US-08: Observe and cancel requests
- **Persona**: ESP Operator
- **Priority**: Must
- **Story**: As an ESP operator, I want request-local limits, cancellation, metrics, traces, and structured logs so that analytical queries cannot destabilize ESP and failures can be diagnosed.
- **Acceptance criteria**:
  - Configure and enforce SQL, parameter, row, byte, memory, thread, temporary-storage, and duration limits.
  - Cancellation is checked during bind, file open, vector production, and serialization.
  - Metrics and traces identify bind, Dali lookup, parts, bytes, rows, pushdown/residual filters, execution, cancellation, and failures without secrets.
- **Requirements**: FR-08, FR-09, NFR Security, NFR Reliability.

### US-09: Return explicit security and execution failures
- **Persona**: Security Administrator
- **Priority**: Must
- **Story**: As a security administrator, I want failures mapped to structured ESP exceptions so that clients cannot mistake partial or unauthorized results for success.
- **Acceptance criteria**:
  - Bind, authorization, scan, resource-limit, and execution failures have distinct structured error categories.
  - Failed files or parts are never silently omitted.
  - Production errors do not reveal stack traces, credentials, internal paths, or physical endpoints.
- **Requirements**: FR-07, FR-08, FR-09, NFR Security.

## Epic C: Maintainable Reader and Test Surface

### US-10: Extend readers safely
- **Persona**: Platform Maintainer
- **Priority**: Should
- **Story**: As a platform maintainer, I want HPCC metadata and reader knowledge isolated behind reusable adapters so that new formats and pushdown behavior can be added without copying proprietary reader logic.
- **Acceptance criteria**:
  - Shared type mapping is used by bind, metadata, vector conversion, parameter validation, and tests.
  - FLAT, compressed, superfile, KEY, and nested behavior reuses existing reader seams or small adapters.
  - Unit, integration, PBT, and example-based regression tests cover mapping, filtering, serialization, and reader semantics.
  - Existing `ws_sql` behavior remains unchanged.
- **Requirements**: FR-03, FR-05, FR-06, FR-11, NFR Maintainability, NFR Testability.

## Coverage Summary
- **FR-01 through FR-11**: Covered by US-01 through US-10.
- **Security Baseline**: US-07, US-08, US-09, plus operator acceptance in US-06.
- **Property-Based Testing**: Disabled by the approved Unit 1 NFR decision; US-05 and US-10 retain example-based and regression test coverage.
- **Resiliency Baseline**: Diagnostics, cancellation, and observability are covered by US-08; deployment and operations ownership is explicitly documented outside stories per approved Question 4.
- **End-user deployment decisions**: Not represented as separate stories per approved plan answer; they remain NFR/infrastructure responsibilities.

## INVEST Validation
- **Independent**: Each story describes a separately demonstrable behavior or capability.
- **Negotiable**: Technical implementation remains open for construction design.
- **Valuable**: Each story serves a named persona or protects a user-visible contract.
- **Estimable**: Scope is bounded by requirements and explicit acceptance criteria.
- **Small**: Stories are vertical slices or focused maintainer/operator capabilities.
- **Testable**: Every story has concrete scenarios or checklists and requirement traceability.

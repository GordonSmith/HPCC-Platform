# ws_sql2 DuckDB ESP Module Requirements

## Intent Analysis
- **User request**: Review `plan.md` and convert it into an AI-DLC workflow.
- **Request type**: New feature and architectural addition in a brownfield C++ platform.
- **Scope**: Cross-component; ESP service, ECM contract, DuckDB/vcpkg/CMake integration, HPCC metadata/readers, security, packaging, and tests.
- **Complexity**: Comprehensive/high risk.
- **Baseline decision**: The confirmed decisions in `plan.md` are approved defaults unless this document explicitly qualifies them.

## Product Goal
Create a separate, intentionally incompatible `ws_sql2` ESP service that provides bounded in-process DuckDB SQL over authorized HPCC DFS logical files through `hpcc_scan('logical::name')`. Existing `ws_sql` remains available and unchanged during migration.

## Personas and Stakeholders
- **SQL client**: Executes SELECT queries with typed named parameters and consumes stable schema/JSON results.
- **ESP operator**: Configures, packages, observes, and resource-limits the service.
- **Security administrator**: Controls `WsSql2Access`, DFS authorization, data exposure, and extension/file-access restrictions.
- **Maintainer/developer**: Extends type mapping, reader adapters, pushdown, tests, and packaging without duplicating HPCC format logic.
- **End-user deployment owner**: Owns production deployment style, rollback, topology, resiliency testing, and incident response outside the repository's service implementation.

## Functional Requirements

### FR-01: Service and compatibility boundary
- Add a new `ws_sql2` service and plugin; do not alter or route existing `ws_sql` traffic.
- Use a versioned `wssql2` ECM interface with generated C++ types.
- Do not expose DuckDB connection or extension implementation details through ESP types.

### FR-02: SQL execution
- Support SELECT-style SQL, parameterized execution, and metadata operations only.
- Reject CALL, workunit preparation/execution, CREATE TABLE, LOAD DATA, unsafe operations, and non-query statements.
- Bind named parameters using explicit DuckDB type, value, and null state; never use string substitution.
- Execute each request with isolated in-memory DuckDB state or a bounded pool with no cross-request prepared handles.

### FR-03: HPCC table function
- Provide `hpcc_scan('scope::logical_file')` as the sole deep table-function interface.
- Resolve and normalize only logical names explicitly referenced by each request through Dali, with request-user read authorization during the per-request query bind/planning phase; do not preload the full DFS catalog. Query bind is distinct from ESP service/port startup binding.
- Support FLAT, blocked-compressed FLAT, superfiles, KEY files, and nested ECL layouts.
- Keep Dali lookup, layout parsing, part/copy selection, decompression, row conversion, key traversal, and pushdown behind the table-function implementation.

### FR-04: Metadata methods
- `ListFiles` lists only accessible files.
- `DescribeFile` reports logical name, kind, compression, superfile membership, parts, ECL layout, mapped DuckDB schema, and unsupported constructs.
- `ExplainScan` reports requested/projected columns, translated HPCC filters/key monitors, residual DuckDB filters, selected subfiles/parts, and non-pushdown reasons without reading data.
- Metadata must use the same authorization and type mapping as query execution.

### FR-05: Type mapping and nested values
- Use one deterministic HPCC-to-DuckDB mapper for bind, metadata, vector conversion, parameters, and tests.
- Cover supported scalar, numeric, text, binary, temporal, nullable/conditional, row, dataset, set, and dictionary forms specified in `plan.md`.
- Map nested rows/datasets/sets/dictionaries to STRUCT/LIST/MAP values where representable.
- Map unsupported or custom fields to deterministic VARCHAR/JSON fallback values with explicit warnings; reject invalid layouts and preserve field order and deterministic nested-name collision behavior.
- Metadata and schema responses are unbounded by application-level nested-size controls; transport and deployment owners may impose external limits.

### FR-06: Reader execution and pushdown
- Apply all projections before HPCC row materialization, including minimal fields required for residual predicates.
- Translate representable scalar comparisons, ranges, IN, null, conjunction, and compatible disjunction filters to HPCC field filters/key monitors with correct type encoding.
- Leave any expression whose equivalence is not proven as a DuckDB residual filter.
- Distinguish keyed filters, post-key HPCC filters, and residual filters in ExplainScan; never claim unperformed pushdown.
- Iterate superfile subfiles and distributed parts with copy selection/failover and exact incompatible-layout errors.
- Keep shared scan configuration immutable and scan state thread-confined; enable parallel part scans only after safety, ordering, cancellation, and accounting are proven.

### FR-07: Authorization and security
- Enforce the dedicated `WsSql2Access` feature for service operations and request-user DFS authorization for every logical file.
- Pass immutable request-local identity, security context, cancellation, and deadline state to the extension; never use service-wide stored credentials.
- Disable DuckDB extension auto-install/autoload and arbitrary local file, network URL, environment-secret, and external extension access.
- Redact physical paths/copy endpoints from ExplainScan unless explicitly authorized.
- Do not silently omit inaccessible files, failed parts, or invalid metadata; return structured ESP exceptions.

### FR-08: Resource isolation and cancellation
- Enforce configured maximum SQL length, parameter count, rows, result bytes, memory, threads, temporary storage, and execution duration.
- Check cancellation/deadline between bind, file-open, vector production, and serialization stages.
- Return explicit truncation and diagnostic state without returning partial data as complete results.

### FR-09: Result contract and observability
- Return ordered column metadata with DuckDB logical type strings and nullability, JSON rows, row count, truncation state, elapsed time, and diagnostic query identifiers that are not workunit IDs.
- Serialize decimals, large integers, binary data, non-finite floats, nulls, and nested values deterministically.
- Add structured tracing and metrics for bind, Dali lookup, parts, bytes read/decompressed, rows, pushdown/residual filters, execution, cancellation, and failures.
- Avoid secrets, tokens, credentials, physical endpoints, and unnecessary sensitive data in logs.

### FR-10: Build, packaging, and deployment
- Add independent `WSSQL2_SERVICE` and conditional DuckDB vcpkg/CMake wiring without requiring Java/ANTLR.
- Statically register DuckDB 1.4.4 in each ws_sql2 database instance and link only required HPCC libraries.
- Add service/binding configuration, build-set entries, authentication defaults, generated config lists, dedicated ESP manifest, and packaging for the Linux primary triplet in the first release candidate.
- Document that deployment style, rollback, topology, resiliency testing, and incident response are end-user responsibilities.

### FR-11: Testing
- Add unit tests for type mapping, nested values, filter translation, residual semantics, serialization, binding, authorization, error mapping, limits, and cancellation.
- Add direct DuckDB extension tests and ESP-level tests for all methods, concurrent requests, malformed names/layouts, inaccessible files, unsupported statements, and stable JSON.
- Add fixtures for fixed/variable FLAT, blocked compression, multi-part copy failover, compatible/incompatible superfiles, KEY files, and nested structures.
- Compare pushed and non-pushed results for every filter class and verify ExplainScan accuracy.
- Add performance/regression checks for vectorized scans, projection pruning, selective KEY predicates, compressed reads, memory ceilings, and truncation.

### FR-12: Dali-independent scans from serialized metadata
- Serialize the top-level metadata `hpcc_scan` currently obtains from Dali into three items:
  - `layout`: the `dumpTypeInfo` runtime-layout JSON, the authoritative record structure;
  - `parts`: the ordered part/copy list with paths, sizes, CRCs, and the KEY TLK marker, with superfiles flattened in subfile order;
  - `options`: kind, format, grouped flag, compression, KEY keyed-field count/node size, format CRC, source modified time, and descriptor version.
- Keep `hpcc_scan('scope::logical_file')` as the Dali form, and add the Dali-free overload `hpcc_scan(layout, parts, options)`, selected by argument count.
- Both overloads must produce identical bind data so projection/filter pushdown, LIMIT/OFFSET, nested values, and KEY blobs behave identically.
- Generate a SQL schema (`CREATE TABLE`-style DDL with original HPCC types in comments) as the human-readable record description; it is informational, not an `hpcc_scan` argument, and is never used to reconstruct physical types.
- Add `GetScanDescriptor(LogicalName)`, Dali-authorized like `hpcc_scan`, returning `Layout`, `Parts`, `Options`, `SqlSchema`, `EclRecordDefinition`, and a ready-to-run `ScanSql`; `DescribeFile` also returns `SqlSchema`.
- Reuse `getDaliLayoutInfo`, `dumpTypeInfo`, `createRtlFieldTypeDeserializer`, `IFileDescriptor::getFileTree()`, and `FileAccessOptions`; do not invent a new layout format.
- The Dali-free overload bypasses Dali authorization, so it is registered only when explicitly enabled by configuration (disabled by default in the ESP service), restricted to allowlisted planes/paths, and unreachable from untrusted SQL. Physical paths are redacted from `GetScanDescriptor` unless the caller holds administrative permission; redacted descriptors are rejected by the offline overload.
- Detect staleness through recorded modified time and part CRCs; reject or warn by configuration.

## Non-Functional Requirements

### Security and privacy
- Security Baseline is disabled by the approved Unit 2 unbounded metadata/schema decision. Retain application-level authentication, DFS authorization, physical-detail redaction, safe errors, and secret suppression.
- Cloud/network controls not owned by this repository are explicitly deployment-owner responsibilities and must be documented as such in release/deployment artifacts.

### Performance and scalability
- Optimize for bounded interactive analytics in one ESP process, not transparent distributed execution.
- Projection pruning and representable predicate pushdown are required for the first release; arbitrary expressions may remain residual.
- Resource limits must protect the ESP process from a single analytical request.

### Reliability and resiliency
- Resiliency Baseline is enabled as design-time guidance.
- RTO/RPO and cross-region DR are explicitly out of scope for this repository because the selected answer is end-user-owned single-region deployment policy (Question 8 = E and Question 13 = X).
- Deployment, rollback, resiliency testing, and incident response are end-user-owned responsibilities; the project must expose diagnostics, metrics, cancellation, and documented test scenarios but must not claim operational guarantees it does not control.
- GitHub change management and GitHub Actions are the project-facing change/CICD conventions.

### Testability
- Property-Based Testing is disabled by the approved Unit 1 NFR decision.
- Use example-based unit, integration, regression, and boundary tests for mapping, filtering, serialization, lifecycle, and stateful behavior.
- Do not add a PBT framework or PBT-specific dependency unless the scope is reopened and re-approved.

### Maintainability
- Reuse existing HPCC reader and metadata seams behind small internal adapters rather than copying format implementations.
- Preserve existing ESP, reference-counting, exception, locking, naming, and Allman-style C++ conventions.
- Keep `ws_sql2` locality and implementation details behind `hpcc_scan` and the query-engine boundary.

## Acceptance Criteria
- A separately buildable `ws_sql2` service can be enabled without enabling `ws_sql`, Java, or ANTLR.
- Authorized SELECT execution returns deterministic schema and JSON results for supported FLAT, compressed, superfile, KEY, and nested layouts.
- Unauthorized files, unsafe statements, unsupported types, malformed layouts, resource violations, and cancellation produce explicit structured errors.
- ExplainScan accurately distinguishes projection, keyed/HPCC filters, residual filters, selected parts, and non-pushdown reasons.
- Existing `ws_sql` behavior and availability remain unchanged.
- For every `regress::*` file, `hpcc_scan(layout, parts, options)` built from `GetScanDescriptor` returns rows identical to `hpcc_scan('<logical name>')`, and the offline overload is unavailable unless explicitly enabled.
- Linux primary-triplet build, service configuration, packaging, focused tests, PBT checks, and performance/regression checks pass.
- Security, PBT, and resiliency compliance summaries are included in each applicable downstream stage.

## Traceability
The requirements preserve the plan's nine implementation areas and todo dependency structure. The only scope qualifications are the selected first unit focus on KEY/pushdown semantics, Linux-first release packaging, GitHub change/CICD integration, and end-user ownership of deployment/operations decisions. FR-12 was added on 2026-10-14 and traces to `plan.md` section 10 and todo item 11.

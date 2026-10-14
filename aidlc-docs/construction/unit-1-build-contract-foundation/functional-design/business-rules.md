# Unit 1 Business Rules

## Activation and Compatibility
- **BR-01**: `WSSQL2_SERVICE` is independent from `WSSQL_SERVICE`, Java, and ANTLR.
- **BR-02**: Enabled ws_sql2 requires DuckDB and fails configuration clearly when the dependency is unavailable.
- **BR-03**: Disabled ws_sql2 produces no ws_sql2 targets and leaves legacy services unchanged.
- **BR-04**: No generated or runtime behavior may route existing ws_sql traffic through ws_sql2.

## Contract
- **BR-05**: The initial ECM contract defines ExecuteSQL, ListFiles, DescribeFile, and ExplainScan.
- **BR-06**: Unsupported statements, invalid request shapes, and invalid limits are rejected before execution.
- **BR-07**: Public responses do not expose DuckDB connection objects, extension internals, physical paths, or credentials.

## Registration and Lifecycle
- **BR-08**: Static extension registration must succeed before any operation executes.
- **BR-09**: Registration failure is a typed initialization failure mapped to service-unavailable; no unsafe fallback is permitted.
- **BR-10**: A request can execute only after validation and initialization.
- **BR-11**: Cancellation or a terminal limit failure prevents further execution and cannot be reported as successful completion.
- **BR-12**: Request state and caller context are request-local; service-wide credentials and mutable query state are prohibited.

## Security and Resiliency Constraints
- **BR-13**: Contract validation enforces type and size bounds before passing data to downstream components.
- **BR-14**: Errors are explicit and safe; they do not reveal stack traces, internal paths, secrets, or physical endpoints.
- **BR-15**: Foundation diagnostics include correlation identity and lifecycle state without sensitive payloads.
- **BR-16**: The design provides cancellation and fail-fast initialization signals for later operational handling; deployment rollback and topology remain end-user owned.

## Testable Properties
- Configuration invariant: ws_sql2 enablement does not alter ws_sql targets.
- Registration idempotence: repeated registration attempts have deterministic outcomes.
- Lifecycle state invariant: no terminal state returns to Executing.
- Contract round-trip: valid generated request/response shapes preserve fields and null states.
- Allowlist oracle: operation validation matches the approved four-operation allowlist.

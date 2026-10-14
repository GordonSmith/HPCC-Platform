# Unit 1 Business Logic Model

## Purpose
Establish the ws_sql2 service/build contract and a valid request lifecycle before metadata, readers, or query semantics are added.

## Build Activation Flow
1. Configuration evaluates `WSSQL2_SERVICE` and DuckDB availability.
2. If the service is enabled, the build must resolve the DuckDB dependency and generate the ws_sql2 contract/plugin targets.
3. If enabled dependencies are unavailable, configuration fails explicitly; the existing platform and ws_sql behavior are not silently changed.
4. If disabled, ws_sql2 targets are omitted and existing services remain unchanged.

## Contract Flow
1. The versioned ECM contract defines ExecuteSQL, ListFiles, DescribeFile, and ExplainScan.
2. Each operation has request validation and a typed response/error intent.
3. The service accepts only contract-valid requests and passes immutable request context to the query engine.
4. Detailed file access and query behavior are deferred to later units.

## Request Lifecycle
1. **Created**: request object exists but has not passed validation.
2. **Validated**: operation, required fields, limits, and request context are valid.
3. **Initialized**: an isolated DuckDB request context exists and static HPCC extension registration succeeded.
4. **Executing**: the selected operation may perform its allowed work.
5. **Completed**: response is finalized.
6. **Cancelled or Failed**: execution cannot continue and a typed diagnostic is returned.

Invalid transitions include executing before validation/initialization, continuing after cancellation, and returning success after initialization failure.

## Registration Flow
- Registration occurs once for each request connection before execution.
- Duplicate registration is deterministic and does not create multiple active extension registrations.
- Registration failure transitions the request to Failed and maps to a service-unavailable category.
- The service never falls back to executing without `hpcc_scan`.

## Foundation Test Model
The Unit 1 harness proves configuration activation, generated contract shape, plugin registration, static extension registration, request lifecycle transitions, cancellation rejection, and compatibility with disabled ws_sql2 configuration. Full file scans begin in later units.

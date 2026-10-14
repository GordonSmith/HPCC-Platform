# ws_sql2 Services

## ws_sql2 ESP Service
**Responsibility**: Public request boundary for SQL execution and metadata.

**Operations**:
- `ExecuteSQL`: validates SELECT-only requests, authorizes, binds parameters, invokes the query engine, and returns schema/JSON/diagnostics.
- `ListFiles`: returns only files accessible to the caller.
- `DescribeFile`: returns authorized file metadata and mapped schema without exposing unauthorized details.
- `ExplainScan`: returns projection, HPCC pushdown, key monitors, residual filters, selected parts, and non-pushdown reasons without reading data.

## CDuckDBQueryEngine
**Responsibility**: Request-scoped DuckDB orchestration and resource isolation.

**Interaction**:
1. Receives validated request data and immutable caller context.
2. Creates an isolated in-memory DuckDB connection.
3. Registers the static HPCC extension and applies limits/settings.
4. Binds parameters and executes the request.
5. Collects schema/results and passes typed failures/diagnostics to the ESP service.

## Static HPCC DuckDB Extension
**Responsibility**: DuckDB-native binding and vectorized HPCC scan execution.

**Interaction**:
1. Bind validates the logical name and requests metadata/authorization.
2. Bind produces mapped schema and pushdown/residual planning state.
3. Initialization creates thread-confined reader state.
4. Scan fills DuckDB chunks from reader adapters.
5. Explain returns the same planning facts without opening data streams.

## Shared Adapter Services
- **Metadata service**: Dali lookup, authorization, superfile expansion, layout and part metadata.
- **Mapping service**: shared type and nested-value mapping used by bind, metadata, conversion, parameters, and tests.
- **Reader service**: FLAT/KEY adapters over existing HPCC implementations, including dafilesrv and ccdactivity reference paths.
- **Diagnostics service**: serialization, exceptions, metrics, traces, cancellation, and safe logging.

## Lifetime and Communication
- ESP request state is immutable after validation except for cancellation and bounded counters.
- DuckDB connections are request-local and destroyed at request completion.
- Shared metadata and mapping descriptions are immutable after bind.
- Reader scan state is thread-confined; parallel scans require explicit reader capability and resource accounting.
- Components communicate through typed internal interfaces; no service-wide credentials or mutable query state are used.

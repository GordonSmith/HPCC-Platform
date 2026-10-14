# ws_sql2 Components

## ESP Contract and Service
Owns ECM-generated request/response types, authentication/authorization entry points, input validation, method dispatch, public exception mapping, and transport-safe diagnostics. It does not know HPCC binary reader details.

## Query Engine Boundary
Owns one isolated in-memory DuckDB connection per request, static extension registration, typed parameter binding, query configuration, resource limits, cancellation propagation, result collection, and orchestration between the ESP service and DuckDB.

## HPCC DuckDB Extension
Owns static table-function registration and `hpcc_scan` bind/init/scan state. It translates DuckDB projections and filters into HPCC reader requests, creates vectors, reports pushdown/residual behavior, and exposes typed internal failures.

## Metadata and Authorization Adapter
Owns logical-name normalization, Dali lookup, request-user access checks, superfile expansion, layout validation, part/copy metadata, and immutable request context transfer.

## Type and Value Mapping
Owns deterministic HPCC runtime metadata to DuckDB logical type mapping and recursive conversion of scalar, nullable, row, dataset, set, and dictionary values.

## Reader Adapters
Owns narrow adapters over existing FLAT/compressed/superfile and KEY reading paths, including dafilesrv and ccdactivity reference patterns, projection, field filters, key monitors, copy selection, and reader capability reporting.

## Serialization and Diagnostics
Owns ordered schema output, stable JSON values, truncation state, safe structured logs, metrics, traces, and conversion of typed internal failures into query-engine result diagnostics.

## Build, Package, and Test Integration
Owns CMake/vcpkg and ECM wiring, service configuration, Linux packaging, direct DuckDB tests, ESP tests, fixtures, PBT integration, performance checks, and documentation.

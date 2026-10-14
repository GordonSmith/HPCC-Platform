# Component Inventory

## Relevant Application Components
- `esp/services/ws_sql`: legacy SQL-to-ECL service; retained unchanged.
- `esp/services/ws_sql2`: proposed new bounded SQL service and DuckDB extension.

## Shared Components
- `common/thorhelper`: FLAT reader, projection, decompression, and filters.
- `common/fileview2`: file metadata, result sources, nested layouts, and KEY traversal.
- Dali and HPCC security services: logical-file metadata and access checks.
- `esp/scm`: ECM contracts and generated types.

## Build and Packaging Components
- CMake service registration and plugin dependency wiring.
- vcpkg DuckDB package and platform packaging.

## Test Components
- New focused C++ unit tests, DuckDB extension tests, ESP contract tests, fixtures, integration tests, and performance/regression checks.

# System Architecture

## Existing Relevant Architecture
- `esp/services/ws_sql` is the legacy SQL-to-ECL ESP service. It parses SQL, generates ECL, submits workunits, and returns workunit-shaped results.
- `esp/services/CMakeLists.txt` registers ESP service subdirectories, including `ws_sql`.
- `esp/scm` contains ECM service contracts and generated-schema build conventions.
- Dali resolves logical files and access metadata.
- `common/thorhelper` provides streaming FLAT reader seams, record mappings, projection, decompression, and field filters.
- `common/fileview2` and related KEY paths demonstrate metadata, compressed reads, nested layouts, and key traversal.
- CMake and vcpkg provide conditional package wiring and platform packaging.

## Proposed Boundary
The new `ws_sql2` service owns the ESP request contract, authorization, request limits, DuckDB query lifecycle, and JSON serialization. The static HPCC DuckDB extension owns `hpcc_scan` binding, HPCC metadata/type mapping, reader adaptation, and pushdown reporting. Existing `ws_sql` remains independent.

## Data Flow
1. ESP authenticates a request and creates an immutable per-request HPCC access context.
2. `CDuckDBQueryEngine` creates an isolated bounded DuckDB connection and registers the static extension.
3. `hpcc_scan` resolves and authorizes the logical file through Dali during bind.
4. HPCC readers produce projected values and pushed filters; DuckDB evaluates residual expressions.
5. The service serializes ordered schema and JSON rows under configured limits.

## Primary Integration Points
- Dali logical-file metadata and authorization.
- HPCC FLAT, compressed FLAT, superfile, and KEY reader implementations.
- DuckDB 1.4.4 CMake package and static extension registration.
- ECM/ESDL-generated ESP request and response types.
- Existing HPCC security, exception, tracing, metrics, packaging, and test infrastructure.

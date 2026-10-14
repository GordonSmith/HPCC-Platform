# ws_sql2 DuckDB Implementation Plan

## Problem and approach

The existing `ws_sql` module is an ANTLR SQL-to-ECL translator. It discovers DFS metadata through Dali, compiles SQL into ECL workunits, executes those workunits on an HPCC target cluster, and returns workunit-shaped results. It is not an embedded SQL engine, and its public interface is tightly coupled to workunit IDs, target clusters, query sets, and legacy prepared-workunit behavior.

Create a separate, intentionally incompatible `ws_sql2` ESP module instead of changing `ws_sql` in place. Embed DuckDB 1.5.6 from vcpkg in the ESP process and statically register an HPCC DuckDB extension. The extension will expose one deep table-function interface:

```sql
SELECT ...
FROM hpcc_scan('scope::logical_file')
WHERE ...;
```

The extension will adapt existing HPCC metadata and row-reader implementations rather than reimplementing the proprietary formats. Dali lookup, access checks, superfile expansion, part/copy selection, blocked decompression, dynamic ECL record layouts, nested rows, and KEY traversal remain inside the `hpcc_scan` implementation.

## Confirmed scope and decisions

- New module and plugin name: `ws_sql2`.
- Keep the existing `ws_sql` module available and unchanged during migration.
- Run DuckDB in-process in each ESP instance.
- Statically register the HPCC extension in the `ws_sql2` binary; do not produce a separately loadable extension initially.
- First-release operations: `SELECT`, parameterized execution, and metadata only.
- No `CALL`, workunit preparation/execution, `CREATE TABLE`, or `LOAD DATA`.
- SQL accesses DFS files explicitly with `hpcc_scan('logical::name')`; do not synthesize a DuckDB catalog of logical filenames.
- Parameterized requests use named parameters with explicit DuckDB type, value, and null state. The module prepares and executes within one request, so there are no process-local prepared handles or cross-ESP session state.
- Return an explicit result schema plus JSON rows.
- Metadata methods: list accessible files, describe a file, and explain scan/pushdown behavior.
- Supported inputs: FLAT files, blocked-compressed FLAT files, superfiles, KEY files, and nested ECL layouts.
- Map nested HPCC rows/datasets/sets/dictionaries to DuckDB `STRUCT`, `LIST`, and `MAP` values.
- Require projection pushdown and broad filter pushdown. Every projection must be applied before HPCC row materialization. Scalar comparison, range, `IN`, null, and conjunction filters that can be represented by HPCC `IFieldFilter`/key monitors must be pushed into the FLAT or KEY reader. Expressions that HPCC readers cannot represent safely remain explicit DuckDB residual filters and must be reported by `ExplainScan`; the extension must never claim an unperformed pushdown.

## Implementation discipline

- **Unreleased contract rule:** `ws_sql2` has not had its first release. Keep the ESDL service and default client at the baseline `1.0`; do not add `min_ver`/`depr_ver` attributes or increment the service version for pre-release contract changes. Begin compatibility versioning only after an explicit project decision records that the first public contract has shipped. This rule overrides generic ESDL version-increment guidance while `ws_sql2` remains unreleased.
- Before implementing each non-trivial slice, inspect the nearest established HPCC implementation and reuse its semantics where applicable. At minimum, check the relevant `ccdactivity`/Roxie path, Thor disk/index-read path, dafilesrv access path, and `common/fileview2` implementation before adding new reader, metadata, filter, projection, or authorization behavior.
- Record the selected reference path and the reason for any intentional deviation in the unit design or implementation notes. Do not replace an existing HPCC primitive with a ws_sql2-specific approximation without documenting the semantic tradeoff.
- Validate the new slice against the reference path's ownership, layout translation, part/copy selection, filter classification, error handling, and cancellation behavior before expanding the scope.

## Current codebase findings

- `esp/services/ws_sql/ws_sqlService.cpp` parses SQL, generates ECL through `ECLEngine`, creates/compiles/submits workunits, caches WUIDs, and returns workunit XML.
- `esp/services/ws_sql/SQL2ECL/HPCCFileCache.cpp` already resolves DFS logical files and ECL layouts, but it is coupled to the legacy translator and silently suppresses several failures; it should not become the new extension interface.
- `common/fileview2/fvresultset.cpp`, `fvdisksource.cpp`, and `fvidxsource.cpp` demonstrate Dali lookup, dynamic layout parsing, compressed part reads, nested metadata, and KEY traversal.
- `common/thorhelper/thorread.hpp/.cpp` provides the stronger streaming seam for FLAT input: `IDiskRowReader`, `IRowReadFormatMapping`, `FileAccessOptions`, decompression, record translation, projection, and `FieldFilterArray`.
- Existing KEY read paths in `common/fileview2`, Thor, Roxie, and `IFieldFilter` utilities should be reused or factored behind a small shared reader interface rather than copied into the extension.
- The repository uses a DuckDB 1.5.6 overlay port and exports the `DuckDB` CMake package.
- `WSSQL_SERVICE` currently controls ANTLR and requires Java. `ws_sql2` should have its own option and DuckDB dependency, with no Java/ANTLR requirement.
- There are no focused tests under `esp/services/ws_sql`; `ws_sql2` needs a new test surface at the DuckDB table-function and ESP interfaces.

## Planned implementation

### 1. Add build and dependency wiring

- Add a `WSSQL2_SERVICE` CMake option, enabled consistently with other platform ESP modules but independent of `WSSQL_SERVICE` and `USE_JAVA`.
- Add a conditional `VCPKG_DUCKDB` expression in `cmake_modules/plugins.cmake`.
- Add `duckdb` to `vcpkg.json.in` under that expression and regenerate/update `vcpkg.json`.
- Add `esp/services/ws_sql2` to `esp/services/CMakeLists.txt`.
- In the new module CMake file, use `find_package(DuckDB CONFIG REQUIRED)` and link the available `duckdb` or `duckdb_static` target plus only the HPCC libraries required by Dali, row metadata/readers, security, ESP, and JSON serialization.
- Keep the extension statically linked and register it explicitly when each DuckDB database instance is created; disable DuckDB extension auto-install/autoload for this module so queries cannot download or load arbitrary extensions.

### 2. Define the new ESDL interface

- Add `esp/scm/ws_sql2.ecm` with the unreleased baseline `wssql2` interface and generated C++ types.
- Define `ExecuteSQL` with SQL text, typed named parameters, row/byte limits, and optional JSON formatting controls.
- Return:
  - ordered column metadata with DuckDB logical type strings and nullability;
  - JSON rows preserving scalar values and nested objects/arrays;
  - row count, truncation state, elapsed/query identifiers suitable for diagnostics but not workunit IDs;
  - structured ESP exceptions for bind, authorization, scan, resource-limit, and execution failures.
- Define `ListFiles`, `DescribeFile`, and `ExplainScan`.
- `DescribeFile` reports the logical name, kind, compression, superfile membership, part count, HPCC record layout, mapped DuckDB schema, and unsupported fields/layout constructs.
- `ExplainScan` reports requested versus projected columns, translated HPCC filters/key monitors, residual DuckDB filters, selected subfiles/parts, and reasons a predicate was not pushed.
- Add the corresponding generated-schema dependencies without editing generated files.

### 3. Create the DuckDB runtime module

- Add a small `CDuckDBQueryEngine` interface owned by the ESP module. Its implementation creates isolated in-memory DuckDB connections per request or from a bounded connection pool, registers the static HPCC extension, applies memory/thread/temp-directory/query limits, binds typed parameters, executes, and serializes results.
- Do not expose DuckDB connection or extension implementation details through the ESP interface.
- Pass an immutable per-request HPCC access context into the extension through DuckDB client/context state. It must contain the authenticated user descriptor/security context and cancellation/deadline state; never use service-wide stored credentials.
- Add cancellation checks between bind, file-open, vector production, and result serialization stages.
- Map DuckDB exceptions and HPCC `IException` failures into explicit repository-standard ESP exceptions; do not silently omit inaccessible files or failed parts.

### 4. Implement DFS metadata binding and type mapping

- Implement the `hpcc_scan` bind phase:
  - validate and normalize the logical filename;
  - resolve it through `queryDistributedFileDirectory()` with read access for the request user;
  - expand superfiles in declared order while preserving a stable combined schema;
  - read stored ECL record metadata and reject missing/invalid layouts explicitly;
  - identify FLAT versus KEY and collect compression/part metadata.
- Convert HPCC runtime type metadata to DuckDB logical types in one shared mapper used by bind, `DescribeFile`, vector conversion, parameter validation, and tests.
- Cover booleans; signed/unsigned integers; real; decimal precision/scale; string, varstring, qstring, unicode/varunicode/utf8; data/blob; date/time-compatible representations where unambiguous; nullable/conditional fields; rows; datasets; sets; and dictionaries.
- Define deterministic fallback errors for alien/custom/unsupported types rather than converting them silently.
- Preserve field order and provide deterministic collision handling for duplicate or unnamed nested fields.

### 5. Implement FLAT, compressed, and superfile scans

- Build a vectorized scan state that iterates superfile subfiles and distributed parts, uses available copies/failover, and feeds DuckDB `DataChunk`s in standard vector sizes.
- Reuse `FileAccessOptions`, `createRowReadFormatMapping`, and `createDiskReader` for binary FLAT data, including blocked compression and record-layout translation.
- Apply projected metadata before creating the HPCC reader so unselected fields are not materialized.
- Convert HPCC rows directly into DuckDB vectors, including validity masks and recursive nested values, without round-tripping through XML or JSON.
- Make global state immutable/shareable and local scan state thread-confined. Only enable parallel part scans after deterministic ordering, cancellation, reader safety, and resource accounting are verified.
- For superfiles, validate layout compatibility at bind time and report the exact incompatible subfile.

### 6. Implement KEY scans and filter/projection pushdown

- Reuse the HPCC key/index manager and runtime record accessors behind an internal reader adapter shared with existing KEY paths where practical.
- Translate DuckDB table-function filter trees into typed HPCC `IFieldFilter` objects and key monitors:
  - equality/inequality and ordered ranges;
  - `IN` lists and null tests where the HPCC type supports them;
  - conjunctions and compatible disjunctions;
  - correct signedness, endian, string collation/padding, decimal, and unicode encoding.
- Distinguish keyed filters, post-key HPCC filters, and DuckDB residual filters. Preserve semantics by leaving any partially translatable expression as a residual unless equivalence is proven.
- Push all requested projections, including the minimal extra fields needed to evaluate residual predicates.
- Add KEY-specific tests for leading and non-leading fields, payload fields, multi-part indexes/TLKs, duplicates, ranges, nulls, and combined pushed/residual filters.

### 7. Implement the `ws_sql2` ESP module

- Add `ws_sql2Plugin.cpp`, service header/implementation, and binding class following current ESP plugin patterns.
- `ExecuteSQL`:
  - enforce a dedicated `WsSql2Access` feature;
  - reject non-query statements and unsafe DuckDB operations at bind/authorization time;
  - bind named typed values without string substitution;
  - execute through `CDuckDBQueryEngine`;
  - enforce configured maximum SQL length, parameters, rows, result bytes, memory, threads, and execution duration;
  - serialize schema and rows to JSON with stable handling for decimals, large integers, binary data, non-finite floats, nulls, and nested values.
- Metadata methods must use the same Dali authorization and type mapper as `hpcc_scan`, ensuring metadata cannot reveal inaccessible logical files.
- `ExplainScan` must use DuckDB planning/bind information without reading data and redact physical paths/copy endpoints unless the caller has an explicitly justified administrative permission.
- Add tracing spans and metrics for bind, Dali lookup, parts scanned, bytes read/decompressed, rows produced, pushed/residual filters, DuckDB execution, cancellation, and failures.

### 8. Add deployment, packaging, and documentation

- Add `ws_sql2` service/binding configuration schema, build-set entries, authentication feature defaults, generated config lists, and a dedicated ESP application manifest rather than modifying the legacy `sql2ecl` application.
- Package the module and DuckDB runtime libraries correctly for Linux, Windows, and macOS dynamic triplets.
- Document the new SQL contract, `hpcc_scan` syntax, logical-file permissions, supported HPCC/DuckDB type mappings, nested JSON representation, pushdown guarantees, resource limits, unsupported statements, and migration differences from `ws_sql`.
- Explicitly document that execution is local to one ESP process and is not a distributed replacement for Thor/Roxie query execution.

### 9. Test and validate

- Add focused C++ unit tests for:
  - HPCC-to-DuckDB type mapping and nested values;
  - DuckDB-to-HPCC filter translation, including semantic rejection/residual cases;
  - JSON schema/result serialization;
  - typed named parameter binding;
  - authorization and error mapping.
- Add integration fixtures for fixed and variable FLAT records, blocked compression, multi-part files with copy failover, compatible/incompatible superfiles, KEY files, and nested child datasets/rows/sets/dictionaries.
- Test the static extension directly through DuckDB SQL; this is the primary interface test surface.
- Add ESP-level tests for all four methods, limits, cancellation, concurrent requests, malformed logical names/layouts, inaccessible files, unsupported statements, and stable JSON output.
- Compare pushed and non-pushed execution results for every filter class, and assert `ExplainScan` accurately reports projection, HPCC filters, key monitors, and residuals.
- Add performance/regression checks for vectorized scans, projection pruning, selective KEY predicates, compressed reads, memory ceilings, and result truncation.
- Configure/build the smallest affected targets (`espscm`, the extension/unit-test target, and `ws_sql2`), run the focused unit/integration suites, then build/package the platform target on the supported primary triplet.

### 10. Serialize top-level file metadata for Dali-independent reads

Goal: capture everything `hpcc_scan` currently obtains from Dali in a self-contained, versioned descriptor so a logical file can be scanned without a Dali connection (offline tooling, air-gapped copies, tests, and future non-ESP hosts).

- **Descriptor contents** (one document per logical file or superfile):
  - identity: logical name, kind (FLAT/KEY), format (flat/csv/xml), grouped flag, descriptor version, source cluster/plane, and capture timestamp;
  - physical layout: ordered parts with copies/paths, part sizes, record counts, CRCs, compression and blocked-compression flags, and the KEY TLK part marker;
  - KEY specifics: keyed-field count, payload boundary, blob usage, and node size;
  - superfiles: ordered subfile descriptors plus the layout-compatibility result already computed at bind time;
  - record layout in three forms, each with a CRC so readers can detect drift:
    1. **SQL schema** (primary, human-facing): `CREATE TABLE`-style DDL generated from the shared type mapper, with `STRUCT`/`LIST`/`DECIMAL(p,s)` nested types and column comments carrying the original HPCC type (`-- udecimal8_2`, `-- string20`, `{blob}`, keyed/payload);
    2. **Runtime layout JSON** from `dumpTypeInfo`, the authoritative machine form that `IRtlFieldTypeDeserializer::deserialize` turns back into `RtlTypeInfo`/`IOutputMetaData` for the existing readers;
    3. the original ECL record text, kept for diagnostics only.
- **Why both SQL and runtime JSON:** DuckDB DDL cannot express HPCC physical encodings (fixed vs variable strings, EBCDIC, packed decimals, swapped/biased ints, bitfields, IFBLOCKs, KEY blobs). The SQL schema is the readable contract; the runtime JSON is what the reader trusts. Reconstructing physical types from SQL alone is out of scope.
- **Reuse, do not invent:**
  - layout: `getDaliLayoutInfo`, `dumpTypeInfo`, `createRtlFieldTypeDeserializer` (the same JSON layout dafilesrv's stream-read protocol already accepts without Dali);
  - parts/copies: `IFileDescriptor::getFileTree()` / `deserializeFileDescriptorTree`;
  - read options: `FileAccessOptions` populated from the descriptor instead of `updateFromFile`.
- **Seam in `hpcc_scan`:** introduce one internal metadata-source interface with two implementations: Dali-backed (current behavior, request-user authorization) and descriptor-backed. Bind, filter translation, KEY translation, and readers consume only that interface, so no reader code knows where metadata came from.
- **SQL surface: two `hpcc_scan` overloads, selected by arity.**
  - With Dali: `hpcc_scan('my::logical::file')`. Unchanged; resolves and authorizes through Dali.
  - Without Dali: `hpcc_scan(layout, parts, options)`, where each argument is one top-level item of the serialized descriptor:
    - `layout`: the `dumpTypeInfo` runtime-layout JSON (authoritative record structure);
    - `parts`: the ordered part/copy list (paths, sizes, CRCs, TLK marker; superfiles flattened in subfile order);
    - `options`: kind, format, grouped, compression, KEY keyed-field count/node size, format CRC, source modified time, and descriptor version.
  - Both overloads produce the same bind data, so projection/filter pushdown, LIMIT/OFFSET, nested values, and KEY blobs behave identically; no `logicalName` is required in the offline form.
  - The SQL DDL is not an argument: the output schema is derived from `layout`, and the DDL is informational.
  - Example the user runs offline:
    ```sql
    SELECT * FROM hpcc_scan('<layout json>', '<parts json>', '<options json>') LIMIT 100;
    ```
- **ESP surface: `GetScanDescriptor(LogicalName)`** (Dali-authorized, same access check as `hpcc_scan`) returns:
  - `Layout`, `Parts`, `Options`: the three strings to pass to the offline overload;
  - `SqlSchema`: the generated `CREATE TABLE`-style DDL with original HPCC types in comments;
  - `EclRecordDefinition`: diagnostics only;
  - `ScanSql`: a ready-to-run `SELECT * FROM hpcc_scan(...)` with the three items already quoted, so users can copy it directly.
  - Physical paths in `Parts` are redacted unless the caller holds the administrative permission; a redacted descriptor is readable as documentation but rejected by the offline overload.
- `DescribeFile` also gains the generated `SqlSchema`.
- **Security:** Dali remains the authorization authority. The 3-argument overload bypasses it, so it is registered only when explicitly enabled by configuration (off in the ESP service by default), restricts parts to allowlisted planes/paths, and must never be reachable from untrusted SQL. Redact physical paths in exported descriptors unless the caller holds an administrative permission.
- **Staleness:** record the file's modified time and part CRCs; refuse (or warn, by configuration) when physical parts no longer match the descriptor.
- **Tests:** round-trip every `regress::*` file (`GetScanDescriptor`, then `hpcc_scan(layout, parts, options)`) and assert rows identical to `hpcc_scan('<logical name>')`, including nested, KEY blob, compressed, and superfile cases; unit-test SQL DDL generation and `dumpTypeInfo` round-trips; negative tests for tampered CRCs, missing parts, and disabled configuration.

## Todo dependency structure

1. Wire DuckDB and `WSSQL2_SERVICE` into vcpkg/CMake.
2. Define the `ws_sql2` ESDL contract.
3. Implement shared DFS metadata/type mapping (depends on 1).
4. Implement DuckDB runtime/static extension registration (depends on 1).
5. Implement FLAT/compressed/superfile scans (depends on 3 and 4).
6. Implement KEY scans and full projection/filter pushdown (depends on 3 and 4).
7. Implement ESP handlers and JSON/parameter contracts (depends on 2, 4, 5, and 6).
8. Add deployment/package configuration and documentation (depends on 2 and 7).
9. Add and run unit/integration/performance validation (starts with 3 and 4; final validation depends on 5 through 8).
10. Add streaming result delivery to ESP so large query results do not require full in-memory JSON materialization (depends on 7 and 9).
11. Serialize top-level file metadata behind a metadata-source seam: add the `GetScanDescriptor` ESP method and the Dali-free `hpcc_scan(layout, parts, options)` overload (depends on 3, 5, and 6; the offline overload is gated by configuration and security review).

## Important considerations

- **Security:** Disable arbitrary DuckDB file access and extension loading. SQL must not gain access to local ESP files, environment secrets, network URLs, or inaccessible DFS metadata. Allowlist query statements/functions/configuration rather than relying only on string checks.
- **Resource isolation:** DuckDB runs inside ESP; every request needs hard memory, thread, temporary-storage, result-size, and duration limits to prevent one analytical query from destabilizing the process.
- **Pushdown semantics:** “Full pushdown” means complete projection pruning and translation of every predicate the HPCC reader model can represent without semantic drift. Arbitrary DuckDB expressions still require residual evaluation, and `ExplainScan` must make that visible.
- **Scalability:** This design reads distributed file parts from one ESP process. It is appropriate for bounded interactive analytics, not a transparent distributed execution engine.
- **Locality:** Keep all HPCC format knowledge behind `hpcc_scan`; the ESP handler only knows SQL, parameters, limits, schema, and JSON results.
- **Migration:** Do not delete or route existing `ws_sql` traffic to `ws_sql2` until compatibility, workload sizing, and operational behavior have been evaluated separately.

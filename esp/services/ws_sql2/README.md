# WsSQL2 quick start

Run these commands from the repository root. The examples assume the build directory is `./build`, with WsSQL2 and CppUnit enabled.

## Build

```bash
cmake --build ./build --target ws_sql2 --parallel
```

The `duckdb-hpcc/` sources are compiled into `ws_sql2`; they do not produce a separate shared library.

## Deploy

Install the updated platform and restart the ESP instance hosting WsSQL2 (replace `myesp` with your ESP instance name):

```bash
cmake --build ./build --target install --parallel
sudo /etc/init.d/hpcc-init restart -c myesp
# as single command
cmake --build ./build --target install --parallel && sudo /etc/init.d/hpcc-init restart -c myesp
```

`ExecuteQuery` accepts one or more semicolon-separated read-only `SELECT` statements. They run in order, but only the final statement's result is returned; earlier result sets are discarded. The first JSON row batch is returned in `Rows`. `FetchSize` is the requested batch size; zero (the default) uses the configured `defaultFetchSize` (1000 unless configured), and requests are capped at `maxFetchSize` (10000 by default). `maxByteLimit` caps each response batch in bytes (64 MiB by default); zero means unlimited. The service enforces `maxActiveCursors` (100) and `maxCursorsPerUser` (10), and expires idle cursors after `cursorIdleTimeoutSeconds` (300) or any cursor after `cursorMaxLifetimeSeconds` (3600).

The response includes an opaque `CursorId` only while the server has not observed end-of-stream. `FetchResultSet` returns subsequent batches. A batch that fills exactly retains its cursor without a read-ahead; the next fetch may therefore be empty and omit `CursorId`. When a batch observes end-of-stream, the server releases the DuckDB query and its spill resources immediately. `CloseResultSet` releases an unfinished cursor; the service also expires abandoned cursors automatically. Cursor IDs are bound to the authenticated user, and concurrent fetches for one cursor are serialized.

Set `IncludeResultSetMetadata` to return a `ResultSetMetadata` entry for each output column in the `ExecuteQuery` response; each entry contains its JDBC-style column label (`ColumnLabel`), type name (`ColumnTypeName`), precision, and scale. Precision and scale are zero when unavailable. `IncludeMetrics` requests the execution graph and JSON profile; for a query that remains open across fetches, these are returned with the fetch that observes end-of-stream. In the profile, each `HPCC_SCAN` reports the `Keyed Filters` and `Post Filters` chosen when the scan started, so they include filters pushed down at runtime by joins; filters on the same KEY field are intersected into one keyed filter. `ExplainQuery` returns the optimized plan and result-set metadata without executing the query. HPCC-specific logical-file details remain under `LogicalFileMeta`.

Set `IncludeDebug` to return a `DebugInfo` struct reporting memory usage and checking for leaks. Each `MemoryUsage` snapshot has DuckDB buffer-manager memory and spill (`DuckDBUsedBytes`, `DuckDBTempBytes`), the bytes allocated through malloc (`HeapInUseBytes`, from jemalloc when it is preloaded, otherwise glibc), and process resident memory (`ResidentBytes`, `PeakResidentBytes`). `Start` is taken before the query's engine is created and `Current` after the batch is produced. Once end-of-stream is observed, the engine is released and `Released` is reported, along with `Retained` (`Released` minus `Start`). `LeakCheck` is then `Passed`, or `PossibleLeak` if DuckDB or heap memory grew by more than the `leakCheckThresholdBytes` service setting (default 1048576, 1 MiB). One-time initialization can cause growth on first use, so repeat the query to confirm. These figures are instance- and process-wide, so if any other query engine existed during the measurement window the result is `Inconclusive`. A cursor left open reports `Pending`; it carries the setting forward, and the final `FetchResultSet` returns the verdict.

Debug builds (`_DEBUG`) also count the `hpcc_scan` objects each engine creates and destroys: bind data, global states and local states. These counts are returned as `ScanObjectsCreated` and `ScanObjectsLive`. The counts belong to the query's engine, so they are exact even when other queries run concurrently. If any of those objects is still live after the engine is released, `LeakCheck` is `Leaked`. Release builds omit these fields and use only the memory check.

`LogicalFileMeta` accepts a logical file name and returns a `LogicalFileMeta` struct. Its fields include the ECL record, physical parts (`FileParts`), the total `RecordCount` when Dali has it (otherwise the field is omitted), and each top-level scan option; `FormatOptions` and `ProviderOptions` contain JSON objects. When `RecordCount` is known, `SELECT COUNT(*) FROM hpcc_scan('logical-name')` is answered from metadata without reading file parts. Filtered counts and scans without a known count still execute normally. A client can also use the count returned by `LogicalFileMeta` to answer an unfiltered `COUNT(*)` without fetching rows. `SampleSQL` contains a ready-to-run query with the record, parts, and options embedded in a long-form `hpcc_scan(record, parts, options)` call. The long form reads the supplied physical parts without Dali file authorization, so it is rejected unless the service setting `allowLongFormScan` is true (false by default); only enable it for trusted callers. Record layouts that require a compiled helper are not supported in this release.

## Run C++ unit tests

```bash
./build/Debug/bin/unittests WsSql2TypeMappingTests WsSql2MetadataTests WsSql2QueryEngineTests -v
```

## Run Python tests

Both scripts test a running WsSQL2 service (default endpoint `http://127.0.0.1:8510/WsSQL2/`) and require the relevant `regress::*` logical files to be available. Deploy/start the service and ensure the regression files are present before running them. The `dg_var` layout is currently expected to return an unsupported-layout error.

```bash
./esp/services/ws_sql2/tests/sql-test --pq 10
./esp/services/ws_sql2/tests/read-regress.py
```

The SQL test runner reads its connection settings from `tests/sql-test.json` and discovers SQL cases from the `sql/` and `sql-*/` directories:

- `sql/` compares `ExecuteQuery` results with JSON files under `sql/ExecuteQuery/`.
- `sql-xfail/` checks that `ExecuteQuery` fails with the error text specified in `ExecuteQuery/`.
- `sql-cursor/` checks fetch batches, cursor lifetime, and explicit close behavior using assertions under `Cursor/`.
- `sql-equivalence/` compares the results of an optimized query with a semantically equivalent residual-filter query, using assertions under `Compare/`.
- `sql-metrics/` checks `ExecuteQuery` rows and required execution-profile fields under `ExecuteQuery/`.
- `sql-explain/` checks optimized-plan text and `HPCC_SCAN` details returned by `ExplainQuery`, using assertions under `ExplainQuery/`.
- `sql-ecl/` pairs each `.sql` file with a same-named `.ecl` file, runs SQL through WsSQL2 and ECL through `ecl run`, and compares their single named result datasets, columns, row order, and values. Drawing on ECL regression cases, the suite covers ranges, filters, sorts, grouped counts, index and KEY reads (`dg_index`, `dg_keyed_index`, `searchindex`), plus inner, left outer, and anti joins over `regress::multi` files. The `key_*` cases check `searchindex` key pushdown — keyed and payload filters, out-of-range and contradictory bounds, ordered limits, and distinct-key joins — against the equivalent ECL index reads. The `search_source_word_counts`, `search_index_word_counts`, and `search_source_key_doc_join` cases aggregate the multi-million-row `searchsource` and `searchindex` files before returning bounded results; they take longer than the small-file cases. Each PASS line reports, in aligned columns, the SQL `ExecuteMs` from the `ExecuteQuery` response (server-side execution, excluding HTTP and query preparation) and the ECL workunit's `TotalClusterTime` from `WsWorkunits/WUQuery` as `ECL <time>`, with `<`, `>`, or `=` between them showing whether SQL was faster, slower, or equal to the millisecond, followed in parentheses by end-to-end wall-clock times for SQL (the HTTP request, preparation, and fetching every result batch) and ECL (including compilation and result retrieval), again with `<`, `>`, or `=` between them.

The KEY scan plan cases that declare `scanPartsFromLogicalFile` call `LogicalFileMeta` to derive their expected physical-part and data-part/thread counts (excluding any top-level KEY part). LIMIT/OFFSET pushdown expectations follow the resulting data-part count rather than assuming a fixed layout.

`--updateResults` refreshes result snapshots for `sql/` and `sql-metrics/`; it does not rewrite the behavioral assertions in the other suites. Use `--pq N` to run SQL cases concurrently without a runner-imposed cap; requesting more parallel queries than the service allows can fail the tests. Override the endpoint with `WS_SQL2_ENDPOINT` or `--server`; use `--config` to provide a different SQL test config file. The runner prints one `PASS`/`FAIL` line per case followed by a summary and exits non-zero if any case fails. The catalog test accepts `--endpoint`, `--dfu-endpoint` (default `http://localhost:8010/WsDfu/DFUQuery.json`), `--scope`, and other options; run it with `--help` for details. It gets logical-file names from WsDFU. Only when files fail does it write a JSON report listing those failures (`read-regress-errors.json` by default, override with `--report`), and a passing run deletes any stale report.

For `sql-ecl/`, `ecl` must be on `PATH` and the configured ECL service must be available. `sql-test.json` supplies `espIp`, `espSocket`, `eclTarget`, and optionally `eclCluster`; `--eclTarget` and `--eclCluster` override the target and cluster. The SQL and ECL operations use the configured test user. Once the ECL run returns a WUID, the runner deletes that workunit via `WUDelete` after comparing results and retrieving the cluster time, including when a case fails. Use an ECL `OUTPUT(..., NAMED('Result'))` with field names and ordering matching the SQL projection; ECL XML values are compared to SQL JSON values using SQL's boolean/numeric types.

Run only the SQL/ECL comparisons with `./esp/services/ws_sql2/tests/sql-test --suite sql-ecl`; add a SQL filename after the option to run one paired case. The `--suite` option works with the other suite directories as well.
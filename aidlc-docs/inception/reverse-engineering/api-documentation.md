# API Documentation

## Existing API
The legacy `ws_sql` API is workunit-oriented and coupled to SQL-to-ECL compilation, target clusters, query sets, WUIDs, and prepared-workunit behavior. It is intentionally outside the ws_sql2 compatibility contract.

## Proposed API Surface
- `ExecuteSQL`: SQL text, typed named parameters, row/byte limits, optional JSON controls; returns ordered schema, JSON rows, truncation state, elapsed/query diagnostics, and structured errors.
- `ListFiles`: lists only files accessible to the authenticated caller.
- `DescribeFile`: reports logical name, kind, compression, superfile membership, parts, ECL layout, mapped DuckDB schema, and unsupported constructs.
- `ExplainScan`: reports requested/projected columns, translated HPCC filters/key monitors, residual filters, selected subfiles/parts, and non-pushdown reasons without reading data.

## Contract Constraints
- Only SELECT-style queries and parameterized execution are supported initially.
- No process-local prepared handles or cross-request sessions.
- No workunit IDs, arbitrary local file access, arbitrary extension loading, or silent omission of inaccessible files/parts.

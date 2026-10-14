# ws_sql2 Units of Work

## Ownership Model
All six units belong to the shared ws_sql2 owner. Units are separated for sequencing, dependency control, and reviewability; shared HPCC utilities remain dependency-owned by their existing components.

## Unit 1: Build and Contract Foundation
- **Responsibilities**: WSSQL2_SERVICE, DuckDB vcpkg/CMake wiring, ECM contract, plugin/service skeleton, static extension registration, and minimum build/test harness.
- **Depends on**: Existing CMake, vcpkg, ESP, and ECM infrastructure.
- **Enables**: Units 2, 3, 4, and 5.
- **Integration boundary**: Service and extension targets configure, compile, register, and run a minimal smoke test without changing ws_sql.

## Unit 2: Metadata and Type Foundation
- **Responsibilities**: Dali lookup, request authorization context, logical-file metadata, superfile expansion, layout validation, shared HPCC-to-DuckDB mapping, nested-value model, and metadata methods.
- **Depends on**: Unit 1, Dali/security, existing metadata utilities.
- **Enables**: Units 3 and 4.
- **Integration boundary**: Authorized metadata binds to deterministic DuckDB schema and rejects invalid/inaccessible layouts explicitly.

## Unit 3: KEY and Pushdown Core
- **Responsibilities**: KEY reader adapter, filter translation, key monitors, projection handling, residual semantics, and ExplainScan. This is the first implementation priority.
- **Depends on**: Units 1 and 2, existing KEY/field-filter utilities, dafilesrv and ccdactivity reference paths where applicable.
- **Enables**: KEY query execution and pushdown equivalence validation.
- **Integration boundary**: Pushed and non-pushed KEY results are equivalent for supported predicates, with accurate ExplainScan output.

## Unit 4: FLAT and Result Execution
- **Responsibilities**: FLAT/compressed/superfile reader adapters, vector production, JSON serialization, limits, cancellation, and ExecuteSQL orchestration.
- **Depends on**: Units 1 and 2; can develop in parallel with Unit 3 after shared interfaces stabilize.
- **Enables**: End-to-end SELECT execution over supported FLAT-family sources.
- **Integration boundary**: Projected vectors and bounded JSON results are correct, cancellable, and explicit about truncation/errors.

## Unit 5: Packaging, Observability, and Validation
- **Responsibilities**: Cross-cutting authorization/limits/cancellation/diagnostics integration, service configuration, Linux packaging, metrics/traces/logging, fixtures, ESP tests, PBT, performance/regression checks, and documentation.
- **Depends on**: Units 1 through 4 and the approved ECM contract.
- **Enables**: Release-candidate build, packaging, validation, and operational handoff.
- **Integration boundary**: Focused targets, full tests, PBT, performance checks, and Linux packaging pass without ws_sql regressions.

## Unit 6: Offline Scan Descriptor (FR-12)
- **Responsibilities**: Metadata-source seam inside `hpcc_scan` (Dali-backed and descriptor-backed implementations), `layout`/`parts`/`options` serialization, the Dali-free `hpcc_scan(layout, parts, options)` overload, SQL schema generation, the `GetScanDescriptor` ESP method, `SqlSchema` on `DescribeFile`, configuration gating, path redaction, staleness checks, and descriptor round-trip tests.
- **Depends on**: Unit 2 (metadata/type mapping), Unit 3 (KEY options and blob handling), and Unit 4 (FLAT/part reading); its validation feeds Unit 5.
- **Enables**: Scanning logical files without a Dali connection and user-requested metadata export.
- **Integration boundary**: Descriptor-backed scans return rows identical to Dali-backed scans for all `regress::*` files, and the offline overload is unavailable unless explicitly enabled.

## Integration Checkpoints
1. Build/contract checkpoint after Unit 1.
2. Metadata/type checkpoint after Unit 2.
3. KEY/pushdown checkpoint after Unit 3.
4. FLAT/result checkpoint after Unit 4.
5. Full packaging, observability, and validation checkpoint after Unit 5.
6. Offline descriptor checkpoint after Unit 6: descriptor round-trip equivalence and gating verified before Unit 5 release validation.

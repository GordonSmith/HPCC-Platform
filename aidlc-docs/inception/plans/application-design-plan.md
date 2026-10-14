# ws_sql2 Application Design Plan

## Objective
Define the high-level components, interfaces, service orchestration, and dependency boundaries for the approved ws_sql2 architecture. Detailed reader algorithms, business rules, and implementation choices remain in per-unit Functional Design.

## Design Principles
- Keep ESP transport concerns separate from DuckDB and HPCC reader concerns.
- Make `hpcc_scan` the only deep DuckDB-to-HPCC data boundary.
- Keep request identity, authorization, cancellation, limits, and deadlines immutable and request-local.
- Reuse existing Dali, thorhelper, fileview2, dafilesrv, ccdactivity, and field-filter/key seams through narrow adapters.
- Preserve `ws_sql` unchanged and keep ws_sql2 independently enableable.
- Treat unsupported types, filters, layouts, and operations explicitly; never silently approximate semantics.

## Planned Components
1. **ESP contract and service**: ECM-generated types, authorization entry points, request validation, error mapping, and method handlers.
2. **Query engine boundary**: Per-request or bounded-pool DuckDB lifecycle, static extension registration, typed binding, limits, cancellation, and result orchestration.
3. **HPCC DuckDB extension**: `hpcc_scan` bind/init/scan state, table-function registration, pushdown reporting, and DuckDB vector production.
4. **Metadata and authorization adapter**: Dali logical-file resolution, access checks, superfile expansion, layout/part metadata, and request context transfer.
5. **Type and value mapping**: HPCC runtime metadata to DuckDB logical types and recursive nested value conversion.
6. **Reader adapters**: FLAT/compressed/superfile and KEY access through existing HPCC reader seams, projection, field filters, key monitors, and copy selection.
7. **Serialization and diagnostics**: Stable schema/JSON output, truncation state, structured ESP exceptions, metrics, traces, and safe logging.
8. **Build/package/test integration**: CMake/vcpkg, ECM generation, service configuration, Linux packaging, direct extension tests, ESP tests, PBT, and regression/performance fixtures.

## Plan Checklist
- [x] Confirm component boundaries and ownership.
- [x] Confirm high-level interfaces and request/response flow.
- [x] Confirm service orchestration and lifetime/concurrency boundaries.
- [x] Confirm dependency and communication patterns.
- [x] Generate `aidlc-docs/inception/application-design/components.md`.
- [x] Generate `aidlc-docs/inception/application-design/component-methods.md`.
- [x] Generate `aidlc-docs/inception/application-design/services.md`.
- [x] Generate `aidlc-docs/inception/application-design/component-dependency.md`.
- [x] Generate `aidlc-docs/inception/application-design/application-design.md`.
- [x] Validate design completeness and consistency.

## Clarifying Questions

## Question 1: Component Boundary
Should the DuckDB extension and HPCC reader adapters be organized as separate internal components?

A) Yes - separate extension, metadata/type mapping, and reader-adapter components behind narrow interfaces

B) No - keep them in one ws_sql2 implementation component for the first release

C) Separate only the KEY/pushdown adapter because it is the first delivery priority

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2: Query Engine Lifetime
What DuckDB connection lifetime should the high-level design target?

A) One isolated in-memory connection per request

B) A bounded connection pool with strict reset/isolation between requests

C) Start with per-request connections and leave a bounded pool as a later optimization

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3: Reader Concurrency
What concurrency boundary should the initial design use for file-part scans?

A) Thread-confined sequential scans; parallel part scans require a later explicit safety decision

B) Parallel part scans in the first release where the reader reports thread safety

C) Parallel scans only for KEY files; FLAT scans remain sequential

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 4: Error and Diagnostics Boundary
Where should DuckDB and HPCC failures be translated into the public ESP error contract?

A) In the ESP service/query-engine boundary; the extension returns typed internal failures

B) In the extension; the service forwards extension error categories

C) Both: extension preserves typed cause information and query engine maps it to public ESP categories

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 5: Application Design Approval
What level of high-level interface detail should the design artifacts include?

A) Component responsibilities, method signatures, data ownership, and communication sequence

B) Only component responsibilities; defer all method signatures to Functional Design

C) Include method signatures and representative data structures, but defer algorithm details

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Approval Gate
Answer every `[Answer]:` field and explicitly approve this plan before application-design artifacts are generated.

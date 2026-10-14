# ws_sql2 Application Design

## Design Summary
The system is split into a thin ESP service boundary, a request-scoped DuckDB query engine, and a statically registered HPCC DuckDB extension. The extension is the deep data-access boundary; metadata, type mapping, and reader adapters are separate components with narrow responsibilities.

## Selected Decisions
- Separate extension, metadata/type mapping, and reader-adapter components.
- Create one isolated in-memory DuckDB connection per request.
- Allow initial parallel part scans only where readers report thread safety; otherwise retain thread-confined state and explicit capability checks.
- Let the extension preserve typed internal failures and map them to public ESP categories at the extension/service boundary.
- Keep this high-level design at responsibility level; concrete signatures and algorithms are deferred to Functional Design.

## Component Set
- ESP Contract and Service
- CDuckDBQueryEngine
- Static HPCC DuckDB Extension
- Metadata and Authorization Adapter
- Type and Value Mapping
- Reader Adapters
- Serialization and Diagnostics
- Build, Package, and Test Integration

## Deferred Detail
Functional Design must define concrete method signatures, bind/scan state, vector ownership, reader lifetime, filter equivalence, nested conversion rules, error taxonomy, and PBT properties for each unit.

## Cross-Cutting Compliance
- **Security**: request-local authorization, input validation, least privilege, redaction, no arbitrary extension/file access, and explicit failures are architectural constraints.
- **Property-Based Testing**: design identifies mapping, filtering, serialization, and stateful boundaries; detailed properties and framework selection are deferred to construction NFR/Functional Design.
- **Resiliency**: cancellation, limits, diagnostics, and observability are in scope; deployment topology, rollback, resiliency testing, and incident response remain end-user owned.

## Artifact References
- `components.md`: component responsibilities.
- `component-methods.md`: responsibility-level method concerns.
- `services.md`: service operations and orchestration.
- `component-dependency.md`: dependency matrix, flow, ownership, and prohibited dependencies.

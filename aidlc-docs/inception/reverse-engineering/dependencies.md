# Dependencies

## Internal Dependencies
- `ws_sql2` depends on ESP service infrastructure, ECM-generated types, security, JSON serialization, tracing, metrics, Dali metadata, and HPCC reader adapters.
- FLAT scan depends on thorhelper reader seams and dynamic record mappings.
- KEY scan depends on existing fileview2/KEY traversal and field-filter utilities.
- Packaging depends on CMake service registration and vcpkg conditional dependency wiring.
- Tests depend on the static DuckDB extension, HPCC fixtures, and ESP service contracts.

## External Dependencies
- DuckDB 1.4.4 from the repository vcpkg port.
- No runtime auto-install or auto-load of arbitrary DuckDB extensions is permitted.

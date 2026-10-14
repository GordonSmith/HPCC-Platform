# ws_sql2 Component Dependencies

## Dependency Matrix
| Component | Depends On | Direction | Notes |
|---|---|---|---|
| ESP Contract and Service | Query Engine Boundary, security, ECM types | Inbound orchestration | Public API only sees contract-safe types |
| Query Engine Boundary | DuckDB, HPCC Extension, Diagnostics | Orchestration | Owns request-scoped connection and limits |
| HPCC DuckDB Extension | Metadata Adapter, Type Mapping, Reader Adapters | Deep data boundary | Registered statically; no arbitrary extension loading |
| Metadata Adapter | Dali, security, file metadata utilities | Read-only metadata | Carries immutable request context |
| Type and Value Mapping | HPCC runtime metadata, DuckDB types | Shared utility | Must be deterministic and reusable |
| Reader Adapters | thorhelper, fileview2, dafilesrv, ccdactivity, field filters, key utilities | Data access | Existing implementations remain source of format knowledge |
| Serialization and Diagnostics | DuckDB results, ESP exceptions, metrics/traces/logging | Output boundary | Redacts sensitive details |
| Build/Package/Test Integration | CMake, vcpkg, ECM, test infrastructure | Build-time | Independently enables ws_sql2 |

## Request Flow
1. ESP service authenticates, validates, and creates immutable request context.
2. Query engine creates an isolated DuckDB connection and registers the static extension.
3. DuckDB invokes `hpcc_scan` bind; metadata adapter performs Dali resolution and authorization.
4. Type mapping produces schema; reader adapters expose projection/filter capabilities.
5. DuckDB invokes scan; readers produce vectors and residual filters remain in DuckDB.
6. Diagnostics serializes results, records limits/metrics, and maps typed failures to the ESP contract.

## Ownership Rules
- ESP owns public contracts and authorization entry points.
- Query engine owns connection lifetime, settings, cancellation, and request-level limits.
- Extension owns scan planning and DuckDB integration.
- Metadata adapter owns Dali/file identity and access facts.
- Reader adapters own HPCC format access but not SQL or public API semantics.
- Diagnostics owns safe external representation and observability.
- Build/test integration owns platform wiring and validation, not runtime data behavior.

## Prohibited Dependencies
- `ws_sql2` must not route through legacy `ws_sql` workunit behavior.
- The extension must not use service-wide credentials or bypass Dali authorization.
- Reader adapters must not expose physical paths or copy endpoints to clients by default.
- Public ESP handlers must not directly implement binary file reading.

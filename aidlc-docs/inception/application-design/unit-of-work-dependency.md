# ws_sql2 Unit Dependencies

## Dependency Matrix
| Unit | Depends On | Blocks | Parallelism |
|---|---|---|---|
| Unit 1: Build and Contract Foundation | Existing CMake/vcpkg/ESP/ECM | Units 2, 3, 4, 5 | None; critical path start |
| Unit 2: Metadata and Type Foundation | Unit 1, Dali/security, metadata utilities | Units 3 and 4 | None; shared foundation |
| Unit 3: KEY and Pushdown Core | Units 1 and 2, KEY/filter utilities | Unit 5 | Parallel with Unit 4 after Unit 2 |
| Unit 4: FLAT and Result Execution | Units 1 and 2, reader utilities | Unit 5 | Parallel with Unit 3 after Unit 2 |
| Unit 5: Packaging, Observability, and Validation | Units 1 through 4 and 6, ECM contract | Release candidate | Final integration only |
| Unit 6: Offline Scan Descriptor | Units 2, 3, and 4 | Unit 5 | After Units 3 and 4 stabilize the reader seams |

## Critical Path
Unit 1 -> Unit 2 -> Units 3 and 4 -> Unit 6 -> Unit 5.

Units 3 and 4 are planned for parallel implementation after Unit 2, with integration at the Unit 5 boundary. Their shared contracts are metadata schema, mapped types, projection descriptions, request context, cancellation, limits, and typed internal failures.

## Shared Resources
- Dali and security context APIs.
- HPCC runtime type metadata and record-layout utilities.
- thorhelper, fileview2, dafilesrv, ccdactivity, field-filter, and KEY utilities.
- DuckDB static extension registration and request-scoped connection setup.
- ESP exceptions, JSON serialization, metrics, traces, and structured logging.
- Test fixtures and Linux build/package infrastructure.

## Integration Gates
- A unit cannot advance past its checkpoint until its declared output and focused tests pass.
- Unit 3 and Unit 4 integration must prove shared projection, type, cancellation, limit, and error contracts.
- Unit 5 owns cross-cutting validation but consumes runtime evidence from Units 2 through 4.
- `ws_sql` remains an unchanged regression baseline at every checkpoint.

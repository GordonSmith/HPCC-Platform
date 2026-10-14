# Technology Stack

## Languages and Frameworks
- C++: ESP service, DuckDB query engine, static extension, HPCC reader adapters, and tests.
- ECM/ESDL: versioned ESP interface and generated request/response types.
- CMake/Ninja: build and target orchestration.
- vcpkg: dependency acquisition and package integration.

## Key Dependencies
- DuckDB 1.4.4, statically registered in the ws_sql2 process.
- HPCC Dali metadata and authorization APIs.
- HPCC FLAT/KEY reader and record-layout utilities.
- Existing ESP, security, JSON, tracing, metrics, and exception infrastructure.

## Runtime Model
DuckDB executes in-process per ESP request or bounded connection pool. The design is local to an ESP process and is not a distributed replacement for Thor or Roxie.

# Unit 1 Technology Stack Decisions

## Build and Dependency Policy
- Use the existing HPCC CMake/vcpkg dependency policy.
- Do not introduce Unit 1-specific version ranges or duplicate dependency governance.
- DuckDB remains a vcpkg-provided dependency selected through the platform's existing conditional dependency mechanism.
- Dependency provenance, vulnerability scanning, and lock/catalog behavior follow repository and GitHub Actions policy; the exact existing controls must be verified during Infrastructure Design.

## Service and Contract
- Use existing ESP plugin/service patterns.
- Use ECM/ESDL generation conventions under `esp/scm`.
- Keep `WSSQL2_SERVICE` independent of `WSSQL_SERVICE`, Java, and ANTLR.

## Runtime Foundation
- Use one isolated in-memory DuckDB connection per request.
- Register the HPCC extension statically during request initialization.
- Map registration failure to a typed service-unavailable result while keeping the process alive.
- Use existing repository exception, logging, metrics, and request-correlation conventions.

## Testing
- Use the repository's existing C++ test runner and test conventions.
- Property-Based Testing is disabled by the approved Unit 1 NFR decision; no PBT dependency is selected.
- Retain example-based smoke, regression, boundary, and lifecycle tests.
- GitHub Actions performs Unit 1 build/configuration validation only; foundation smoke tests run in a later validation environment.

## Deferred Decisions
- Exact initialization smoke-test threshold: define with the existing CI/test environment.
- Full tracing and scan-specific metrics: Unit 5 NFR/Infrastructure Design.

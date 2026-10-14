# Unit 1 Infrastructure Design

## Deployment Target
Target the existing HPCC deployment conventions with Linux as the primary build and package target. No new cloud services or repository-owned deployment topology are introduced by Unit 1.

## Build and Dependency Mapping
- Add an independent `WSSQL2_SERVICE` CMake option.
- Add conditional DuckDB vcpkg dependency wiring through existing plugin/dependency policy.
- Register `esp/services/ws_sql2` in the existing ESP service build structure.
- Generate and compile `esp/scm/ws_sql2.ecm` through existing ECM targets.
- Keep Java/ANTLR and legacy `WSSQL_SERVICE` requirements independent.
- Preserve a disabled-service configuration that omits ws_sql2 targets and leaves ws_sql unchanged.

## ESP and Package Mapping
- Add ws_sql2 plugin/service targets using existing ESP patterns.
- Add service configuration, binding/build-set entries, authentication feature defaults, generated configuration lists, and a dedicated ESP manifest.
- Package the module and DuckDB runtime for the Linux primary triplet using existing platform packaging conventions.
- Other platform packaging remains a later extension of the same target/package boundary.

## GitHub Actions Boundary
GitHub Actions validates Unit 1 build and configuration behavior only:
- Configure/build ws_sql2 with its conditional DuckDB dependency.
- Generate ECM types and compile plugin/service targets.
- Verify disabled ws_sql2 compatibility at configuration/build level.

Foundation smoke tests run in a later validation environment, not as a Unit 1 GitHub Actions requirement. Package publication and end-user deployment are outside this unit.

## Monitoring Handoff
Unit 1 provides safe error categories and lifecycle state behavior but provisions no dedicated monitoring signals. Unit 5 owns structured logs, correlation IDs, initialization timing, registration/configuration failure counters, traces, dashboards, and scan metrics. End-user monitoring tooling consumes the Unit 5 outputs.

## Security and Ownership Boundaries
- No cloud resources, network topology, rollback automation, regional placement, or incident-response infrastructure is prescribed.
- Deployment owners are responsible for those operational choices.
- Unit 1 must preserve request-local security context, safe errors, and disabled-service isolation.

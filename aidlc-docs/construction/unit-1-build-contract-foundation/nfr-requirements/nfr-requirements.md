# Unit 1 NFR Requirements

## Scope
These NFRs apply to the Build and Contract Foundation unit: independent activation, DuckDB dependency wiring, ECM/plugin contract, static extension registration, request initialization, and the foundation test harness.

## Performance and Reliability
- Disabled ws_sql2 configuration must introduce no material legacy ws_sql build or runtime regression.
- Enabled configuration must fail clearly when DuckDB is unavailable rather than producing a partially configured service.
- Static extension registration failure must fail the request quickly with a typed service-unavailable error while keeping the ESP process alive.
- The foundation smoke test must define and measure a bounded initialization threshold; the exact threshold is a test/configuration decision, not a production SLO for all operations.
- Request lifecycle state must remain isolated per request and must not leak across connections.

## Security
- Build and runtime activation must not enable arbitrary DuckDB extension installation or loading.
- Contract validation must enforce operation allowlists, type checks, and payload/parameter bounds before downstream execution.
- Request identity and security context must be request-local; no service-wide credentials may be used.
- Errors and foundation logs must not expose secrets, credentials, stack traces, internal paths, or physical endpoints.
- The service must preserve least-privilege authorization hooks even though deep Dali/file authorization is implemented in Unit 2.

## Observability
Unit 1 establishes safe error categories and lifecycle state behavior but emits no dedicated monitoring signals. Structured logs, correlation identifiers, configuration/registration failure counters, initialization timing, full scan metrics, traces, and pushdown diagnostics begin in Unit 5 and are consumed by end-user monitoring tooling.

## Maintainability and Compatibility
- Follow existing repository CMake, vcpkg, ESP, ECM, exception, logging, and C++ test conventions.
- Keep DuckDB version/dependency policy aligned with the existing platform policy; no Unit 1-specific version policy is introduced.
- Keep ws_sql2 targets and generated types independently removable/disableable.
- Preserve the existing ws_sql target and API behavior unchanged.

## Resiliency
- Fail-fast request initialization, explicit typed errors, cancellation state propagation, and bounded initialization are required foundation controls.
- Foundation smoke tests run in a later validation environment; GitHub Actions performs build/configuration validation only for this unit.
- Deployment rollback, topology, resiliency testing, and incident response remain end-user owned per approved requirements.

## PBT Compliance
- Property-Based Testing is disabled by the approved follow-up decision.
- No PBT framework or dependency is required for Unit 1.
- Example-based, regression, boundary, and lifecycle tests remain required.

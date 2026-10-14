# Unit 1 NFR Design Patterns

## Fail-Fast Initialization
Static extension registration is part of request initialization. A registration failure transitions the request to a terminal typed service-unavailable state, returns a safe diagnostic, and leaves the ESP process available for other requests.

- No fallback execution without `hpcc_scan`.
- No unbounded retry or process-wide failure.
- Registration status is request-local and deterministic.

## Optional Service Isolation
Use compile/build target gating and runtime registration gating together.

- Disabled `WSSQL2_SERVICE` omits ws_sql2 targets from the selected build profile.
- Enabled ws_sql2 requires DuckDB dependency resolution.
- Runtime registration occurs only for ws_sql2 request connections.
- Legacy ws_sql remains independent and unchanged.

## Bounded Request Lifecycle
The foundation uses explicit states: Created, Validated, Initialized, Executing, Completed, Cancelled, and Failed.

- Validation precedes initialization.
- Initialization precedes execution.
- Cancellation and terminal failures prevent further execution.
- Request context and registration status are immutable after initialization except for cancellation/terminal counters.

## Foundation Security Pattern
- Validate and allowlist operation classes before initialization.
- Enforce request size, parameter, and limit bounds.
- Keep identity/security context request-local.
- Redact secrets, internal paths, physical endpoints, and stack details from diagnostics.
- Preserve authorization hooks for Unit 2 Dali/file checks.

## Diagnostics Pattern
Unit 1 establishes safe error categories and lifecycle state behavior but emits no dedicated monitoring signals. Structured lifecycle logs, correlation identifiers, registration/configuration failure counters, initialization timing, full tracing, and scan-specific metrics begin in Unit 5 as selected.

## Verification Points
Build and Test must verify target isolation, generated contract shape, registration success/failure, lifecycle transition rejection, cancellation handling, safe diagnostics, and no ws_sql regression. PBT-specific verification is not applicable because PBT is disabled.

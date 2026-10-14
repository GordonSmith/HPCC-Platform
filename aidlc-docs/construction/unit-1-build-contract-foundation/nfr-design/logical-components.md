# Unit 1 NFR Logical Components

## Build Feature Gate
- **Owns**: `WSSQL2_SERVICE` selection and DuckDB dependency availability.
- **Controls**: compile-time target inclusion and configuration failure behavior.
- **Verification**: enabled/disabled build matrix and legacy ws_sql preservation.

## Contract Boundary
- **Owns**: versioned four-operation ECM contract and generated type boundary.
- **Controls**: operation allowlist, request shape, field/limit bounds, and response-safe fields.
- **Verification**: generated schema inspection and invalid-request examples.

## Request Initialization Guard
- **Owns**: request-local state transition from validated to initialized.
- **Controls**: static extension registration, fail-fast typed failure, cancellation, and terminal-state rejection.
- **Verification**: initialization smoke tests, registration-failure tests, and lifecycle transition tests.

## Security Context Carrier
- **Owns**: immutable request-local principal/security context reference, correlation identifier, limits, and deadline/cancellation state.
- **Controls**: no service-wide credentials, no mutable cross-request query state, and safe diagnostic fields.
- **Verification**: context isolation and redaction tests.

## Foundation Diagnostics
- **Owns**: safe error categories and lifecycle state behavior; dedicated monitoring signals begin in Unit 5.
- **Controls**: sensitive-data suppression and bounded diagnostic payloads.
- **Verification**: safe-error regression tests in later validation; log/metric assertions are owned by Unit 5.

## Test Harness Adapter
- **Owns**: build activation tests, generated contract checks, plugin registration smoke tests, static registration tests, lifecycle tests, and compatibility checks.
- **Controls**: repeatable test setup and teardown without requiring file-reader fixtures.
- **Verification**: focused Unit 1 test target before Unit 2 begins.

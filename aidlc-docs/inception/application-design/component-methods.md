# ws_sql2 Component Responsibilities

The approved Application Design detail level defers concrete method signatures and algorithm details to Functional Design. The responsibilities below define the interfaces those signatures must serve.

## ESP Contract and Service
- Validate and authorize ExecuteSQL, ListFiles, DescribeFile, and ExplainScan requests.
- Forward typed parameters, limits, cancellation, and caller context to the query engine.
- Return ordered schema, JSON rows, truncation state, diagnostics, and structured ESP errors.

## Query Engine Boundary
- Create and destroy one isolated DuckDB connection for each request.
- Register the static extension and apply connection/resource settings.
- Bind typed named parameters without string substitution.
- Execute SQL, collect results, propagate cancellation, and return typed internal outcomes.

## HPCC DuckDB Extension
- Register `hpcc_scan` with bind, initialization, scan, and explain responsibilities.
- Request metadata and reader state from the metadata adapter.
- Translate projections and filters, preserving residual predicates when equivalence is unproven.
- Produce DuckDB vectors and expose pushdown decisions.

## Metadata and Authorization Adapter
- Normalize logical names and resolve them through Dali.
- Enforce request-user read authorization and `WsSql2Access` integration points.
- Expand superfiles and validate compatible layouts.
- Provide immutable file, layout, part, copy, and security context data.

## Type and Value Mapping
- Map supported HPCC types to DuckDB logical types.
- Reject unsupported or ambiguous types deterministically.
- Convert scalar and nested HPCC values into DuckDB vectors and JSON-ready values.
- Preserve field order, nullability, and deterministic nested-name handling.

## Reader Adapters
- Open FLAT, compressed, superfile, and KEY sources through existing HPCC seams.
- Apply projection before row materialization.
- Apply safe field filters/key monitors and report reader capabilities.
- Keep scan state thread-confined; expose parallelism only when the reader explicitly supports it.

## Serialization and Diagnostics
- Serialize stable schema, scalar values, nested values, binary values, and numeric edge cases.
- Track row/byte truncation and limit outcomes.
- Attach safe metrics, traces, and structured logs to request correlation identifiers.
- Preserve typed causes for query-engine error mapping.

## Build, Package, and Test Integration
- Register service, dependency, contract-generation, packaging, and test targets.
- Provide fixtures and direct extension/ESP test harnesses.
- Integrate PBT seeds, shrinking, example-based regression, performance checks, and Linux packaging validation.

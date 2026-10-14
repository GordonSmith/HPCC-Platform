# ws_sql2 Personas

## SQL Client
- **Goal**: Run bounded SELECT queries over authorized DFS logical files and consume predictable results.
- **Permissions**: Access only to files granted by HPCC security context.
- **Constraints**: Typed parameters, row/byte/time limits, supported types, and no workunit/session semantics.
- **Success**: Receives ordered schema, deterministic JSON rows, truncation state, and actionable errors.
- **Stories**: US-01, US-02, US-03, US-04, US-05.

## ESP Operator
- **Goal**: Enable, configure, observe, and resource-limit ws_sql2 safely.
- **Permissions**: Service configuration and operational visibility appropriate to the deployment role.
- **Constraints**: Linux-first release packaging, bounded in-process execution, no arbitrary DuckDB extension or file access.
- **Success**: Service builds, packages, emits useful metrics/traces/logs, and protects ESP stability.
- **Stories**: US-06, US-07, US-08.

## Security Administrator
- **Goal**: Ensure every query and metadata operation obeys caller authorization and data-exposure policy.
- **Permissions**: Configure `WsSql2Access` and relevant HPCC security policy.
- **Constraints**: Least privilege, request-local identity, redaction, validation, and no silent access failures.
- **Success**: Unauthorized access is denied and security-relevant behavior is observable without leaking sensitive data.
- **Stories**: US-04, US-07, US-09.

## Platform Maintainer
- **Goal**: Extend supported layouts, readers, pushdown, serialization, and tests without duplicating HPCC format logic.
- **Permissions**: Source, build, test, and dependency maintenance.
- **Constraints**: Existing HPCC reference-counting, exceptions, locking, CMake/vcpkg, and reader seams.
- **Success**: Changes are isolated behind `hpcc_scan`, covered by unit/integration/PBT tests, and do not regress `ws_sql`.
- **Stories**: US-05, US-08, US-10.

## End-User Deployment Owner
- **Goal**: Deploy and operate the service according to the consuming environment's policies.
- **Ownership**: Rollback, deployment style, regional topology, resiliency testing, and incident response are outside this repository's service contract.
- **Success**: Receives accurate build/package artifacts, diagnostics, limits, metrics, and documented operational boundaries.
- **Stories**: No dedicated stories by decision; ownership is documented in NFR and infrastructure artifacts per the approved plan.

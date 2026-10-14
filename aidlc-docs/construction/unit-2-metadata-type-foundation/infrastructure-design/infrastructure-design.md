# Unit 2 Infrastructure Design

## Dali and Security Integration
- Reuse existing HPCC ESP/Dali connection and security-context conventions per request.
- Resolve only the logical files explicitly referenced by the request during the per-request query bind/planning phase, after the ESP request arrives and before schema exposure; do not preload or scan the entire DFS catalog. This is not ESP service/port startup binding. Perform request-user authorization before schema exposure.
- Recheck relevant part/copy access before physical reads.
- Preserve WsSql2Access and application-level redaction even though the Security Baseline extension is disabled for the unbounded metadata/schema scope.

## Metadata Lifetime
- Keep mapped metadata/type descriptors request-local and immutable after bind.
- Do not add a process-wide metadata or authorization cache.
- Share descriptors only among consumers of the same request.

## ESP Configuration
- Expose ListFiles, DescribeFile, and ExplainScan through the existing ws_sql2 ESP service and binding.
- Reuse the existing WsSql2Access feature and port/configuration entries.
- Do not create a separate metadata service or database.

## Linux and Runtime Mapping
- Use existing HPCC Linux ESP deployment and packaging conventions.
- Dali and metadata utilities remain existing platform dependencies.
- No new cloud infrastructure or deployment topology is introduced by Unit 2.

## Diagnostics Handoff
- Emit request-correlated metadata/type diagnostics from the ws_sql2 service boundary.
- Unit 5 and end-user monitoring tooling consume those diagnostics.
- Unit 2 does not provision a separate monitoring backend.

## Unbounded Metadata/Schema Scope
- Metadata and schema responses have no application-level nested-size bound.
- External transport, deployment, and operator limits remain outside Unit 2 ownership.
- Invalid layouts, unauthorized access, and malformed metadata still fail explicitly.

# Unit 2 Deployment Architecture

## Placement
Unit 2 runs inside the existing ws_sql2 ESP service and uses existing HPCC Dali/security infrastructure. It does not introduce a separate metadata service, database, cache service, or cloud resource.

## Request Flow
1. ws_sql2 receives an authenticated metadata request.
2. The request creates an immutable request-local security context and metadata descriptor.
3. Dali resolves and authorizes the logical file during bind.
4. Type mapping produces the schema and typed fallback warnings.
5. ListFiles, DescribeFile, or ExplainScan returns authorized metadata through the existing binding.
6. Request-correlated diagnostics flow to Unit 5/end-user monitoring tooling.

## Configuration
- Existing ws_sql2 service/binding and WsSql2Access feature configuration are reused.
- Linux packaging follows the existing HPCC component/build-set conventions.
- Metadata/schema responses are unbounded at the application layer; external transport/deployment policy owns any delivery limits.

## Ownership Boundaries
- Unit 2 owns Dali integration, request-local descriptors, type mapping, warnings, and redaction.
- Unit 5 owns shared metrics/monitoring integration.
- Deployment owners own topology, rollback, regional placement, and operational monitoring backends.

# Unit 1 Domain Entities

## ServiceConfiguration
Represents build/runtime activation inputs.

- ws_sql2 enabled state
- DuckDB dependency availability
- legacy ws_sql independent state
- generated contract/plugin target state

## Wssql2Operation
Represents the allowed public operation class.

- ExecuteSQL
- ListFiles
- DescribeFile
- ExplainScan

Any other operation is Unsupported.

## RequestContext
Represents immutable request-scoped information passed through the foundation boundary.

- authenticated principal/security context reference
- correlation/query diagnostic identifier
- cancellation/deadline state
- configured resource limits
- validated operation and request fields

No service-wide credential or mutable shared query state belongs in this entity.

## DuckDBRequestSession
Represents one isolated request connection lifecycle.

- Created
- Registered
- Ready
- Executing
- Completed
- Cancelled
- Failed

The session owns registration status and terminal error state, but not HPCC file metadata or reader state.

## ContractResponseEnvelope
Represents the common response intent shared by the four ECM operations.

- operation-specific payload
- ordered schema metadata where applicable
- diagnostics/query identifier
- truncation or completion state where applicable
- structured error category when unsuccessful

Concrete ECM fields and generated types are defined in the contract/code-generation stages.

## FoundationError
Represents typed failures before deep data access.

- InvalidRequest
- UnsupportedOperation
- ConfigurationUnavailable
- ExtensionRegistrationFailed
- Cancelled
- ResourceLimit
- InternalFoundationFailure

The public ESP mapping is finalized at the query-engine/service boundary in later design.

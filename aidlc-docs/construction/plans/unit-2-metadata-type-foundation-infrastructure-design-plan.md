# Unit 2 Infrastructure Design Plan: Metadata and Type Foundation

## Unit Context
- **Unit**: Metadata and Type Foundation
- **NFR Design**: `aidlc-docs/construction/unit-2-metadata-type-foundation/nfr-design/`
- **Infrastructure focus**: Dali/security integration, request-local metadata handling, ESP configuration, Linux deployment conventions, and external ownership boundaries.
- **Approved scope**: Metadata/schema responses are unbounded by application-level nested-size controls; application authorization and redaction remain required.

## Design Checklist
- [x] Map Dali and security access through existing HPCC services.
- [x] Define request-local metadata/type descriptor lifetime and ownership.
- [x] Map ListFiles/DescribeFile/ExplainScan configuration and service access.
- [x] Define Linux/ESP deployment and logging handoff.
- [x] Document unbounded metadata/schema behavior and external transport ownership.
- [x] Generate `infrastructure-design.md`.
- [x] Generate `deployment-architecture.md`.
- [x] Validate infrastructure design against approved Unit 2 NFRs and scope.

## Clarifying Questions

## Question 1: Dali Connectivity
How should Unit 2 obtain Dali metadata?

A) Reuse existing ESP/Dali connection and security-context conventions per request

B) Add a dedicated Unit 2 Dali connection pool

C) Use a process-wide metadata service shared with all requests

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2: Metadata Lifetime
Where should mapped metadata/type descriptors live?

A) Request-local immutable descriptors only

B) Shared process-wide cache with version invalidation

C) Persisted metadata cache managed outside the service

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3: ESP Configuration
How should metadata methods be exposed in deployment configuration?

A) Use the existing ws_sql2 ESP service/binding and `WsSql2Access` feature configuration

B) Add a separate metadata-only ESP service and binding

C) Expose metadata only through internal DuckDB table-function calls

X) Other (please describe after [Answer]: tag below)

[Answer]: C

## Follow-up Question 6: Metadata API Boundary
The approved contract includes ListFiles, DescribeFile, and ExplainScan as ESP operations. Should Unit 2 preserve that public service boundary?

A) Yes - expose metadata methods through the existing ws_sql2 ESP service/binding and WsSql2Access configuration

B) No - revise the approved contract so metadata is internal-only DuckDB functionality

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4: Logging and Monitoring Handoff
Where should Unit 2 Dali/type-mapping diagnostics be emitted?

A) Request-correlated service diagnostics consumed by Unit 5/end-user monitoring tooling

B) Unit 2 provisions a separate monitoring backend

C) Log only locally and defer correlation to deployment owners

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Follow-up Question 7: Diagnostics Handoff
The approved NFRs require request-correlated metadata/type diagnostics. How should Unit 2 represent that requirement?

A) Emit request-correlated service diagnostics; Unit 5/end-user tooling consumes the signals

B) Keep diagnostics local-only and revise the approved observability requirement

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Follow-up Question 8: Diagnostics Consistency
Question 4 selects local-only diagnostics, while the approved NFRs require request-correlated service diagnostics. Should Unit 2 preserve the approved handoff?

A) Yes - revise Question 4 to emit request-correlated diagnostics consumed by Unit 5/end-user tooling

B) No - revise the approved observability requirement to allow local-only diagnostics

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 5: Infrastructure Design Approval
What infrastructure detail should be produced?

A) Existing HPCC component mappings, ownership, configuration flow, and verification points

B) Include new cloud resources and a separate metadata database

C) Infrastructure mappings only; defer configuration verification to Build and Test

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Approval Gate
Answer every `[Answer]:` field and explicitly approve this Infrastructure Design plan before generating its artifacts.

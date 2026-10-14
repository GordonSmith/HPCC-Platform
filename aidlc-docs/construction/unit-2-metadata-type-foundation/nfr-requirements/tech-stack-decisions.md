# Unit 2 Technology Stack Decisions

## Metadata and Authorization
- Reuse existing Dali logical-file metadata and security APIs.
- Use request-local authorization context; no process-wide authorization cache.
- Any metadata cache must carry explicit version/invalidation information and must not contain authorization decisions.

## Type Mapping
- Use one shared immutable layout/type descriptor per distinct layout within a request.
- Reuse repository HPCC runtime metadata and record-layout utilities.
- Map supported nested values to DuckDB STRUCT/LIST/MAP.
- Map unsupported/custom fields to deterministic VARCHAR/JSON fallback values with warning codes and field paths.

## Resource Controls
- Do not impose application-level nested metadata/schema size limits.
- Preserve typed malformed-layout failures; external transport/deployment limits are owned outside Unit 2.

## Testing
- Use existing C++ test conventions and example-based/regression tests.
- Cover authorization timing, cache isolation, superfile compatibility, nested mapping, fallback warnings, redaction, and bounds.
- Property-Based Testing remains disabled; no PBT dependency is introduced.

## Deferred Decisions
- Exact Dali cache invalidation/version source is finalized during NFR Design with existing platform metadata semantics.
- Concrete Dali/type-reader APIs are finalized during Code Generation.

# Unit 2 NFR Logical Components

## Dali Metadata Resolver
- Resolves authoritative logical-file metadata during bind.
- Performs request-user authorization and returns typed metadata-unavailable/denied outcomes.
- Rechecks relevant access before physical reads.

## Request-Local Metadata Descriptor
- Owns normalized file metadata, layout facts, mapped fields, warnings, and redaction state for one request.
- Has no process-wide lifetime and contains no reusable authorization decision.

## Type Mapping Component
- Maps supported HPCC types to DuckDB logical types.
- Maps representable nested structures to LIST/STRUCT/MAP.
- Produces deterministic VARCHAR/JSON fallback values and typed warnings for unsupported fields.
- Does not impose application-level nested metadata/schema size bounds under approved scope.

## Superfile Compatibility Component
- Expands subfiles in declared order.
- Compares layouts and rejects incompatible structures with exact subfile context.
- Provides stable combined field descriptors.

## Warning and Redaction Component
- Emits stable warning codes and field paths.
- Applies shared redaction to physical paths, copies, and unauthorized metadata.
- Keeps warning and metadata representation deterministic.

## Metadata API Adapter
- Supplies ListFiles, DescribeFile, and ExplainScan with authorized logical/schema/planning facts.
- Does not read data for ExplainScan.
- Defers external transport/deployment response limits to owners outside Unit 2.

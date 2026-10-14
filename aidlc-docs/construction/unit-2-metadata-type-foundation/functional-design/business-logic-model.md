# Unit 2 Business Logic Model

## Metadata Binding Flow
1. Receive one or more logical filenames explicitly referenced by the request and an immutable request security context.
2. Normalize the logical name and resolve it through Dali.
3. Perform caller authorization during per-request query bind/planning, after the request arrives but before exposing schema or creating reader state. This is distinct from ESP service/port binding at startup.
4. Collect file kind, compression, parts/copies, record layout, superfile membership, and field metadata.
5. Expand superfiles in declared order and validate layout compatibility.
6. Map supported fields to DuckDB types and unsupported fields to deterministic VARCHAR/JSON fallback values with explicit warnings.
7. Produce metadata for ListFiles, DescribeFile, ExplainScan, and later scan initialization.

## Authorization Flow
- Bind authorization is required for every logical file.
- Part/copy access is rechecked immediately before reading.
- Unauthorized metadata is not exposed through schema, explanations, or errors.
- Request identity remains immutable and request-local.

## Superfile Flow
- Resolve the parent superfile and enumerate subfiles in declared order.
- Compare record layouts and mapped fields using deterministic compatibility rules.
- Reject invalid layouts and identify the exact incompatible subfile.
- Preserve stable field order and nested-name collision behavior.

## Type Mapping Flow
- Map unambiguous scalar and nested HPCC types to DuckDB logical types, including nested LIST/STRUCT/MAP values.
- Map representable rows, datasets, sets, and dictionaries to STRUCT/LIST/MAP.
- Convert unsupported/custom fields to documented VARCHAR/JSON fallback values and attach warnings.
- Reject malformed layouts and ambiguous structural metadata.

## Metadata Operations
- ExecuteSQL, DescribeFile, and ExplainScan resolve only their explicitly referenced logical names; they do not scan the full DFS catalog.
- `ListFiles` is the explicit opt-in catalog operation and returns only authorized logical names and safe summary metadata.
- `DescribeFile` returns layout, compression, parts, mapped schema, warnings, and unsupported-field information.
- `ExplainScan` consumes metadata and reports planning facts without reading data or exposing physical paths by default.

# Unit 2 Business Rules

## Authorization
- **BR-201**: Dali resolution and caller authorization occur during bind before schema exposure or reader initialization.
- **BR-202**: Relevant part/copy access is rechecked immediately before reading.
- **BR-203**: Unauthorized logical names, layouts, parts, copies, and physical endpoints are not exposed.

## Superfiles and Layouts
- **BR-204**: Superfile subfiles are expanded in declared order.
- **BR-205**: Incompatible layouts are rejected at bind time with the exact incompatible subfile identified.
- **BR-206**: Invalid record metadata is a typed failure, never a silent omission.
- **BR-207**: Field order and nested-name collision handling are deterministic.

## Type Mapping
- **BR-208**: One shared mapper is used by metadata, bind, conversion, parameters, and tests.
- **BR-209**: Unambiguous supported scalars map to their documented DuckDB logical types.
- **BR-210**: Unambiguous rows, datasets, sets, and dictionaries map to STRUCT/LIST/MAP where representable.
- **BR-211**: Unsupported or custom fields use deterministic VARCHAR/JSON fallback values with explicit warnings.
- **BR-212**: Ambiguous structural metadata and malformed layouts are rejected.

## Metadata Exposure
- **BR-213**: ListFiles returns only authorized logical names.
- **BR-214**: DescribeFile reports mapped schema, layout facts, warnings, and unsupported fields without unauthorized physical details.
- **BR-215**: ExplainScan does not read data and never claims unperformed pushdown.
- **BR-216**: Metadata and schema responses have no application-level nested-size bound; external transport/deployment limits are outside Unit 2.

## Example-Based Boundary Cases
- Empty logical name, malformed logical name, inaccessible file, missing layout, incompatible superfile, duplicate nested field, unsupported custom field, null/conditional field, and redacted physical path.

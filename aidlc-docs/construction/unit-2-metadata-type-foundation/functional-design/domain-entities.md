# Unit 2 Domain Entities

## LogicalFileReference
- normalized logical name
- caller/security context reference
- Dali authorization result
- file kind and compression metadata

## FileMetadata
- logical name and display name
- FLAT/KEY/superfile classification
- record-layout metadata
- parts and available copies
- warnings and unsupported-field descriptors

## SuperfileDescriptor
- parent logical name
- ordered subfile references
- combined schema candidate
- incompatible subfile and reason, when rejected

## FieldTypeDescriptor
- field path and stable order
- HPCC source type
- DuckDB mapped type
- nullability/conditional state
- nested children
- fallback mode and warning, when applicable

## MetadataBinding
- validated LogicalFileReference
- FileMetadata
- mapped FieldTypeDescriptor collection
- projection/planning facts
- safe exposure/redaction policy

## MetadataWarning
- warning code
- field path or subfile context
- deterministic message
- fallback type/representation used

## MetadataFailure
- AuthorizationDenied
- LogicalNameInvalid
- LayoutMissingOrInvalid
- IncompatibleSuperfile
- TypeMappingFailure
- DaliUnavailable
- PhysicalDetailRedacted

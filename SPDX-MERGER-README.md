# VCPKG SPDX Merger

This script merges all individual vcpkg SPDX files into a single consolidated SPDX document for license compliance and dependency tracking.

## Purpose

The HPCC-Platform project uses vcpkg to manage C++ dependencies. Each vcpkg package generates its own SPDX (Software Package Data Exchange) file containing:
- Package metadata (name, version, homepage)
- License information  
- File checksums and sources
- Dependency relationships

This script consolidates all these individual SPDX files into a single `vcpkg.spdx.json` file in the project root.

## Usage

### Option 1: Using npm script (recommended)
```bash
npm run merge-spdx
```

### Option 2: Direct execution
```bash
node merge-spdx.js
```

## What it does

1. **Discovers SPDX files**: Recursively searches `build/vcpkg_packages/*/share/*/vcpkg.spdx.json`
2. **Prevents ID conflicts**: Prefixes all SPDX IDs with package names to ensure uniqueness
3. **Deduplicates content**: Removes duplicate packages and files based on their "name" and "fileName" fields
4. **Merges content**: Combines all unique packages, files, and relationships into a single document
5. **Updates references**: Updates all internal references to use the new unique IDs
6. **Generates output**: Creates `vcpkg.spdx.json` in the project root

## Output Statistics

The script processes approximately:
- 171 individual SPDX files
- 503 unique packages (after deduplication)
- 627 unique source files (after deduplication)
- 1596 relationship mappings

## File Structure

The generated `vcpkg.spdx.json` follows the SPDX 2.2 specification and contains:
- Document metadata and creation info
- All vcpkg package definitions with license information
- Source file checksums and locations
- Dependency relationships between packages

## Dependencies

- Node.js (ES modules support)
- File system access to `build/vcpkg_packages/` directory

## Notes

- The script is safe to run multiple times (overwrites the output file)
- Package names are extracted from the directory structure
- All SPDX IDs are made unique by prefixing with package names
- Packages and files are deduplicated based on their "name" and "fileName" fields respectively
- Only relationships with valid source and target elements are included in the output
- The output file is formatted with 2-space indentation for readability

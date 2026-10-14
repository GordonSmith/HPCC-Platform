# Unit 2 Code Generation Plan: Metadata and Type Foundation

## Source of Truth
This document is the single source of truth for Unit 2 Code Generation. Application code and configuration changes belong under the workspace root; only Markdown summaries belong under `aidlc-docs/`.

## Unit Context
- **Unit**: Metadata and Type Foundation
- **Stories**: US-03 directly; supports US-01, US-02, US-04, US-05, US-07, and US-10.
- **Dependencies**: Unit 1 foundation, Dali/security, existing metadata utilities.
- **Approved scope**: Request bind/planning resolves only referenced logical files; metadata/schema responses are unbounded at the application layer; application authorization/redaction remain required; PBT is disabled.

## Workspace-Root Target Areas
- `esp/services/ws_sql2/` for metadata engine, type mapper, warning/redaction, and service method implementation.
- Existing Dali/security and metadata utility locations identified during implementation.
- `esp/scm/ws_sql2.ecm` only if approved metadata response fields require contract additions.
- Existing CMake/configuration/package files only where Unit 2 integration requires them.
- Unit documentation summaries under `aidlc-docs/construction/unit-2-metadata-type-foundation/code/`.

## Numbered Generation Steps

### Step 1: Verify Existing Structure
- [x] Re-read Unit 2 functional/NFR/infrastructure artifacts and story map.
- [x] Locate existing Dali logical-file lookup, security-context, record-layout, and nested metadata utilities.
- [x] Confirm no duplicate ws_sql2 metadata files exist.

### Step 2: Implement Metadata and Authorization Boundary
- [x] Add the reusable Dali logical-file resolver seam for request-time metadata lookup.
- [x] Wire request-user authorization into DescribeFile before schema exposure.
- [x] Add empty/unresolvable logical-name failures.
- [ ] Add typed Dali-unavailable, authorization-denied, malformed-name, and invalid-layout outcomes.
- [ ] Preserve per-part/copy authorization recheck hooks for later reader units.

### Step 3: Implement Shared Type and Nested Mapping
- [x] Add the shared field/type descriptor and warning model.
- [x] Map the initial supported scalar types to DuckDB logical types.
- [x] Implement deterministic JSON fallback values and warning records for unsupported/custom fields.
- [x] Traverse recursive HPCC record metadata and preserve nested field paths/order; DuckDB nested value conversion remains in later scan integration.
- [x] Preserve the approved unbounded application-level metadata/schema policy.

### Step 4: Implement Metadata Methods
- [x] Add foundation ListFiles, DescribeFile, and ExplainScan responses through the existing ws_sql2 ESP boundary.
- [ ] Expose complete warnings, mapped schema, layout facts, and redacted physical details after type mapping is implemented.
- [x] Ensure ExplainScan foundation response does not read data.

### Step 5: Add Example-Based Tests
- [ ] Test bind-time authorization and request-local descriptor isolation.
- [x] Test scalar mapping and deterministic fallback warnings.
- [ ] Test Dali failure, malformed names/layouts, incompatible superfiles, nested mapping, and redaction.
- [x] Test metadata method response shape and no-data-read ExplainScan foundation behavior.
- [x] Do not add PBT dependencies or tests.

### Step 6: Integrate Build and Configuration
- [x] Add Unit 2 sources to the ws_sql2 target using existing CMake patterns.
- [x] Update ECM response fields to support the approved typed metadata contract.
- [x] Preserve existing ws_sql and Unit 1 build/install behavior.

### Step 7: Add Documentation Summary
- [x] Create a Markdown implementation summary under `aidlc-docs/construction/unit-2-metadata-type-foundation/code/`.
- [x] Record modified/created paths, metadata ownership, fallback semantics, and test commands.

### Step 8: Validate and Track Progress
- [x] Configure/build ws_sql2 and Unit 2 tests.
- [x] Run focused metadata tests and configgen validation.
- [x] Run `git diff --check` and verify no duplicate files.
- [x] Mark completed steps and update `aidlc-docs/aidlc-state.md`.

## Acceptance Boundary
Unit 2 is complete when referenced logical files can be authorized and described during request bind, layouts/types/nested values are mapped deterministically, unsupported fields produce documented fallbacks/warnings, metadata methods expose safe results without data reads, and focused tests pass.

## Approval Gate
Approve this complete Code Generation plan before Unit 2 source/configuration edits begin.

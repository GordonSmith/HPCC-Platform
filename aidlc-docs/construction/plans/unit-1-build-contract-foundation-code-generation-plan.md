# Unit 1 Code Generation Plan: Build and Contract Foundation

## Source of Truth
This document is the single source of truth for Unit 1 Code Generation. Application code and build/configuration changes belong under the workspace root; only Markdown summaries belong under `aidlc-docs/`.

## Unit Context
- **Unit**: Build and Contract Foundation
- **Stories**: US-06 directly; supports US-01, US-02, US-07, and US-08.
- **Dependencies**: Existing CMake/vcpkg/ESP/ECM infrastructure.
- **Completed design inputs**: Functional Design, NFR Requirements, NFR Design, Infrastructure Design.
- **PBT**: Disabled by approved scope; use example-based/regression tests.
- **Build validation**: GitHub Actions build/configuration validation; foundation smoke tests run in a later validation environment.

## Workspace-Root Target Areas
- `cmake_modules/plugins.cmake`
- `vcpkg.json.in` and generated/configured dependency metadata as appropriate
- `esp/services/CMakeLists.txt`
- `esp/services/ws_sql2/` for new service/plugin/CMake/source/test files
- `esp/scm/ws_sql2.ecm`
- Existing service configuration/build-set/package locations identified during implementation
- Unit documentation summaries under `aidlc-docs/construction/unit-1-build-contract-foundation/code/`

## Numbered Generation Steps

### Step 1: Verify Existing Structure
- [x] Re-read relevant reverse-engineering and Unit 1 design artifacts.
- [x] Confirm exact CMake, vcpkg, ESP, ECM, configuration, and packaging paths before editing.
- [x] Check for existing ws_sql2 files and avoid duplicate/modified-copy files.

### Step 2: Add Build and Dependency Wiring
- [x] Add independent `WSSQL2_SERVICE` option following existing service patterns.
- [x] Add conditional DuckDB vcpkg/CMake dependency using repository conventions.
- [x] Register the ws_sql2 service subdirectory without changing ws_sql behavior.
- [x] Ensure disabled configuration omits ws_sql2 targets and preserves legacy targets.

### Step 3: Add ECM Contract and Generated Target Wiring
- [x] Create `esp/scm/ws_sql2.ecm` with the four approved operation names and contract fields.
- [x] Register ECM generation through existing schema-generation targets.
- [x] Add plugin/service skeleton under `esp/services/ws_sql2/` using current ESP patterns.

### Step 4: Add Static Extension Registration Boundary
- [x] Add the request-engine initialization boundary for in-process DuckDB linkage.
- [x] Establish the service/plugin foundation for typed registration failure handling.
- [x] Preserve request-local state and prevent execution after terminal initialization/cancellation failure in the foundation request-state path.

### Step 5: Add Foundation Tests
- [x] Add example-based tests for the request lifecycle and compatibility foundation.
- [x] Add generated contract shape and plugin registration build checks.
- [x] Add DuckDB initialization/registration-boundary smoke coverage for the later validation environment; deep extension registration remains a later runtime-unit responsibility.
- [x] Do not add a PBT dependency or PBT tests under the approved scope.

### Step 6: Add Linux Packaging and Configuration Wiring
- [x] Add Linux primary-triplet service/configuration/build-set/package entries using existing patterns.
- [x] Add authentication feature/default configuration hooks without prescribing deployment topology.
- [x] Keep deployment rollback, topology, monitoring backend, and incident response end-user owned.

### Step 7: Add Documentation Summaries
- [x] Create a Markdown implementation summary under `aidlc-docs/construction/unit-1-build-contract-foundation/code/`.
- [x] Record created/modified workspace files, configuration modes, test commands, and known handoff boundaries.

### Step 8: Validate and Track Progress
- [x] Run focused configure/build/schema-generation checks available in the repository.
- [x] Run `git diff --check` and verify no duplicate source files were created.
- [x] Mark completed steps and related stories in this plan.
- [x] Update `aidlc-docs/aidlc-state.md` with generated file paths and validation status.

## Acceptance Boundary
Unit 1 is complete when ws_sql2 can be independently configured, its ECM/plugin/build boundaries are present, static registration has a typed failure boundary, Linux packaging/configuration wiring follows repository patterns, foundation tests are defined for later validation, and ws_sql remains unchanged.

## Approval Gate
Approve this complete Code Generation plan before source/build/configuration edits begin.

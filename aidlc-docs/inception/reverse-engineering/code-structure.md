# Code Structure

## Build System
- CMake/Ninja with platform service registration through `esp/services/CMakeLists.txt`.
- vcpkg dependency selection through conditional expressions in `cmake_modules/plugins.cmake` and `vcpkg.json.in`.
- ECM contracts under `esp/scm`, compiled through existing schema-generation targets.

## Relevant Existing Files
- `esp/services/ws_sql/ws_sqlService.cpp` and `.hpp`: legacy ESP handler and service implementation.
- `esp/services/ws_sql/ws_sqlPlugin.cpp`: legacy service plugin registration pattern.
- `esp/services/ws_sql/SQL2ECL/HPCCFileCache.cpp`: legacy metadata/cache behavior that should not define the new extension boundary.
- `common/thorhelper/thorread.hpp/.cpp`: FLAT streaming reader and projection/filter seams.
- `common/fileview2/fvresultset.cpp`, `fvdisksource.cpp`, `fvidxsource.cpp`: metadata, compressed reads, nested layouts, and KEY traversal examples.
- `esp/scm/*.ecm`: service contract conventions.

## Proposed New Files
- `esp/services/ws_sql2/`: service, plugin, CMake, query engine, extension, mapping, scan, serialization, and tests.
- `esp/scm/ws_sql2.ecm`: versioned service contract.

## Existing Patterns to Reuse
- ESP plugin/service registration.
- CMake conditional service and vcpkg dependency patterns.
- HPCC reference-counted interfaces and exception handling.
- Reader adapters and field-filter utilities rather than copied format logic.

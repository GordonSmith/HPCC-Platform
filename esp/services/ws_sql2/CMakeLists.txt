project(ws_sql2)

if(WSSQL2_SERVICE)
    find_package(DuckDB CONFIG REQUIRED)
    include(${HPCC_SOURCE_DIR}/esp/scm/espscm.cmake)

    set(SRCS
        ${ESPSCM_GENERATED_DIR}/ws_sql2_esp.cpp
        ws_sql2plugin.cpp
        ws_sql2service.cpp
        ws_sql2engine.cpp
        ws_sql2extension.cpp
        ws_sql2metadata.cpp
        ws_sql2typemapping.cpp
    )

    include_directories(
        ${HPCC_SOURCE_DIR}/esp/platform
        ${HPCC_SOURCE_DIR}/esp/bindings
        ${HPCC_SOURCE_DIR}/esp/bindings/SOAP/xpp
        ${HPCC_SOURCE_DIR}/esp/smc/SMCLib
        ${HPCC_SOURCE_DIR}/system/include
        ${HPCC_SOURCE_DIR}/system/jlib
        ${HPCC_SOURCE_DIR}/system/security/shared
        ${HPCC_SOURCE_DIR}/system/security/securesocket
        ${HPCC_SOURCE_DIR}/system/xmllib
        ${HPCC_SOURCE_DIR}/common/thorhelper
        ${HPCC_SOURCE_DIR}/common/fileview2
        ${HPCC_SOURCE_DIR}/common/deftype
        ${HPCC_SOURCE_DIR}/common/workunit
        ${HPCC_SOURCE_DIR}/rtl/include
        ${HPCC_SOURCE_DIR}/rtl/eclrtl
        ${HPCC_SOURCE_DIR}/esp/services/common
        ${HPCC_SOURCE_DIR}/dali/base
        ${HPCC_SOURCE_DIR}/system/mp
        ${HPCC_SOURCE_DIR}/system/security/shared
        ${ESPSCM_GENERATED_DIR}
        ${DuckDB_INCLUDE_DIRS}
    )

    add_definitions(-D_USRDLL -DWsSql2_API_LOCAL -DESP_SERVICE_ws_sql2)
    HPCC_ADD_LIBRARY(ws_sql2 SHARED ${SRCS})
    add_dependencies(ws_sql2 espscm)
    target_link_libraries(ws_sql2 PRIVATE jlib xmllib esphttp dalibase deftype eclrtl ${DuckDB_LIBRARIES} ${COMMON_ESP_SERVICE_LIBS})

    install(TARGETS ws_sql2
        RUNTIME DESTINATION ${EXEC_DIR}
        LIBRARY DESTINATION ${LIB_DIR}
        COMPONENT Runtime
        CALC_DEPS
    )
    if (UNIX AND VCPKG_INSTALLED_DIR AND VCPKG_TARGET_TRIPLET)
        install(FILES
            ${VCPKG_INSTALLED_DIR}/${VCPKG_TARGET_TRIPLET}/lib/libduckdb.so
            DESTINATION ${LIB_DIR}
            COMPONENT Runtime
        )
    endif()

    if (BUILD_TESTING)
        HPCC_ADD_EXECUTABLE(ws_sql2foundationtests ws_sql2foundationtests.cpp ws_sql2engine.cpp ws_sql2extension.cpp ws_sql2metadata.cpp ws_sql2typemapping.cpp ws_sql2typemappingtests.cpp)
        target_include_directories(ws_sql2foundationtests PRIVATE
            ${CMAKE_CURRENT_SOURCE_DIR}
            ${DuckDB_INCLUDE_DIRS}
            ${HPCC_SOURCE_DIR}/common/fileview2
            ${HPCC_SOURCE_DIR}/common/deftype
            ${HPCC_SOURCE_DIR}/common/workunit
            ${HPCC_SOURCE_DIR}/dali/base
            ${HPCC_SOURCE_DIR}/system/mp
            ${HPCC_SOURCE_DIR}/system/security/shared
            ${HPCC_SOURCE_DIR}/rtl/include
            ${HPCC_SOURCE_DIR}/rtl/eclrtl
        )
        target_link_libraries(ws_sql2foundationtests PRIVATE jlib dalibase deftype eclrtl ${DuckDB_LIBRARIES})
    endif()
endif()
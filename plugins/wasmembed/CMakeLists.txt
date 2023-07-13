project(wasmembed)

set(CMAKE_CXX_STANDARD 20)

if(WASMEMBED)
    ADD_PLUGIN(wasmembed)
    if(MAKE_WASMEMBED)

        find_path(WASMTIME_CPP_API_INCLUDE_DIRS "wasmtime-cpp-api/wasmtime.hh"
            PATHS ${VCPKG_INSTALLED_DIR}/${VCPKG_TARGET_TRIPLET}
        )
        if (WIN32)
            find_library(WASMTIME_LIB NAMES wasmtime.dll
                PATHS ${VCPKG_INSTALLED_DIR}/${VCPKG_TARGET_TRIPLET}
            )
        else()
            find_library(WASMTIME_LIB NAMES wasmtime
                PATHS ${VCPKG_INSTALLED_DIR}/${VCPKG_TARGET_TRIPLET}
            )
        endif()

        include_directories(
            ${WASMTIME_CPP_API_INCLUDE_DIRS}/wasmtime-c-api
            ${WASMTIME_CPP_API_INCLUDE_DIRS}/wasmtime-cpp-api
            ./../../common/thorhelper
            ./../../dali/base
            ./../../rtl/eclrtl
            ./../../rtl/include
            ./../../rtl/nbcd
            ./../../system/include
            ./../../system/jlib
            ./../../system/mp
        )

        add_definitions(-D_USRDLL -DWASMEMBED_EXPORTS)

        add_library(wasmembed SHARED 
            wasmembed.cpp
            secure-enclave.cpp
            abi.cpp
            util.cpp
        )

        target_link_libraries(wasmembed
            ${WASMTIME_LIB}
            roxiemem
            eclrtl
            jlib
        )

        install(
            TARGETS wasmembed 
            DESTINATION plugins
            CALC_DEPS
        )

    else()
        message(WARNING "Cannot build wasmembed plugin")
    endif()
endif()

if(PLATFORM OR CLIENTTOOLS_ONLY)
    install(
        FILES ${CMAKE_CURRENT_SOURCE_DIR}/wasm.ecllib
        DESTINATION plugins
        COMPONENT Runtime)
endif()

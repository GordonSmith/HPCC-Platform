################################################################################
#    HPCC SYSTEMS software Copyright (C) 2012 HPCC Systems®.
#
#    Licensed under the Apache License, Version 2.0 (the "License");
#    you may not use this file except in compliance with the License.
#    You may obtain a copy of the License at
#
#       http://www.apache.org/licenses/LICENSE-2.0
#
#    Unless required by applicable law or agreed to in writing, software
#    distributed under the License is distributed on an "AS IS" BASIS,
#    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#    See the License for the specific language governing permissions and
#    limitations under the License.
################################################################################

# Component: wasmembed

#####################################################
# Description:
# ------------
#    Cmake Input File for wasmembed
#####################################################

project(wasmembed)

# set(CMAKE_CXX_STANDARD 20)

if(WASMEMBED)
    ADD_PLUGIN(wasmembed)
    if(MAKE_WASMEMBED)

        find_path(WASMTIME_CPP_API_INCLUDE_DIRS "wasmtime-cpp-api/wasmtime.hh")
        find_library(WASMTIME_LIB NAMES wasmtime)

        include_directories(
            ${WASMTIME_CPP_API_INCLUDE_DIRS}/wasmtime-c-api
            ${WASMTIME_CPP_API_INCLUDE_DIRS}/wasmtime-cpp-api
            ./../../system/include
            ./../../rtl/eclrtl
            ./../../rtl/nbcd
            ./../../rtl/include
            ./../../common/deftype
            ./../../roxie/roxiemem
            ./../../system/jlib)

        add_definitions(-D_USRDLL -DWASMEMBED_EXPORTS)

        add_library(secureenclave SHARED
            secureenclave.cpp
        )

        target_link_libraries(secureenclave
            ${WASMTIME_LIB}
        )

        install(
            TARGETS secureenclave 
            DESTINATION plugins
        )

        add_library(wasmembed SHARED 
            wasmembed.cpp
        )

        add_library(watembed SHARED 
            watembed.cpp
        )

        target_compile_features(secureenclave PRIVATE cxx_std_20)

        target_link_libraries(wasmembed
            roxiemem
            eclrtl
            jlib
            secureenclave
        )

        install(
            TARGETS wasmembed 
            DESTINATION plugins
        )

        target_link_libraries(watembed
            roxiemem
            eclrtl
            jlib
            secureenclave
        )

        install(
            TARGETS watembed
            DESTINATION plugins
        )

    else()
        message(WARNING "Cannot build wasmembed plugin")
    endif()
endif()

# if(PLATFORM OR CLIENTTOOLS_ONLY)
    install(
        FILES ${CMAKE_CURRENT_SOURCE_DIR}/wasm.ecllib ${CMAKE_CURRENT_SOURCE_DIR}/wat.ecllib
        DESTINATION plugins
        COMPONENT Runtime)
# endif()

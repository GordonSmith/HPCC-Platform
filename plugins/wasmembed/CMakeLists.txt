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

if(WASMEMBED)
    ADD_PLUGIN(wasmembed)
    if(MAKE_WASMEMBED)
        set(CMAKE_CXX_STANDARD 17)

        find_path(WASMTIME_CPP_API_INCLUDE_DIRS "wasmtime-cpp-api/wasmtime.hh")
        find_library(LIBWASMTIME_LIB NAMES wasmtime)

        set(SRCS
            wasmembed.cpp
        )

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

        HPCC_ADD_LIBRARY(wasmembed SHARED ${SRCS})

        if(${CMAKE_VERSION} VERSION_LESS "2.8.9")
            message(WARNING "Cannot set NO_SONAME. shlibdeps will give warnings when package is installed")
        elseif(NOT APPLE)
            set_target_properties(wasmembed PROPERTIES NO_SONAME 1)
        endif()

        install(
            TARGETS wasmembed
            DESTINATION plugins
            CALC_DEPS)

        target_link_libraries(
            wasmembed
            ${LIBWASMTIME_LIB}
            roxiemem
            eclrtl
            jlib)
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

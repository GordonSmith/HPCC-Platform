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

        add_subdirectory(secure-enclave)
        add_subdirectory(test-guest)

        include_directories(
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
        )

        target_link_libraries(wasmembed
            roxiemem
            eclrtl
            jlib
            secure-enclave
        )

        install(
            TARGETS wasmembed 
            DESTINATION plugins
        )

    else()
        message(WARNING "Cannot build wasmembed plugin")
    endif()
endif()

# if(PLATFORM OR CLIENTTOOLS_ONLY)
    install(
        FILES ${CMAKE_CURRENT_SOURCE_DIR}/wasm.ecllib
        DESTINATION plugins
        COMPONENT Runtime)
# endif()

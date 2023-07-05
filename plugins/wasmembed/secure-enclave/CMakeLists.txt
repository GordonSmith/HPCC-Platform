project(secure-enclave)

set(CMAKE_CXX_STANDARD 20)

find_path(WASMTIME_CPP_API_INCLUDE_DIRS "wasmtime-cpp-api/wasmtime.hh")
find_library(WASMTIME_LIB NAMES wasmtime)

include_directories(
    ${WASMTIME_CPP_API_INCLUDE_DIRS}/wasmtime-c-api
    ${WASMTIME_CPP_API_INCLUDE_DIRS}/wasmtime-cpp-api
)

add_definitions(-D_USRDLL -DSECUREENCLAVE_EXPORTS)

add_library(secure-enclave SHARED
    secure-enclave.cpp
)

target_link_libraries(secure-enclave
    ${WASMTIME_LIB}
)

install(
    TARGETS secure-enclave 
    DESTINATION plugins
)

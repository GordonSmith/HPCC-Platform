cmake_minimum_required(VERSION 3.22)

project(wasmembed)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(WASM_PATH "${CMAKE_CURRENT_BINARY_DIR}/bin/${PROJECT_NAME}.wasm")

add_custom_command(
    MAIN_DEPENDENCY ${CMAKE_CURRENT_SOURCE_DIR}/hpcc-test.wit
    OUTPUT ${CMAKE_CURRENT_BINARY_DIR}/hpcc_test.c ${CMAKE_CURRENT_BINARY_DIR}/hpcc_test.h ${CMAKE_CURRENT_BINARY_DIR}/hpcc_test_component_type.o
    COMMAND wit-bindgen c --out-dir ${CMAKE_CURRENT_BINARY_DIR} ${CMAKE_CURRENT_SOURCE_DIR}/hpcc-test.wit
)
add_custom_target(wit-generate ALL DEPENDS ${CMAKE_CURRENT_BINARY_DIR}/hpcc_test.c)

set(CMAKE_EXECUTABLE_SUFFIX ".wasm")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -nostartfiles -fno-exceptions --sysroot=/${WASI_SDK_PREFIX}/share/wasi-sysroot -Wl,--no-entry")

include_directories(
    ${CMAKE_CURRENT_BINARY_DIR}
)

add_executable(wasmembed
    main.cpp
    ${CMAKE_CURRENT_BINARY_DIR}/hpcc_test.c
    ${CMAKE_CURRENT_BINARY_DIR}/hpcc_test.h
)

target_link_libraries(wasmembed
    ${CMAKE_CURRENT_BINARY_DIR}/hpcc_test_component_type.o
)

install(TARGETS wasmembed
    RUNTIME DESTINATION ${CMAKE_CURRENT_BINARY_DIR}/../install-target
)

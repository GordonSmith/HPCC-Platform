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

# add_custom_command(
#     TARGET add POST_BUILD
#     COMMAND wasm-tools component new ${CMAKE_CURRENT_BINARY_DIR}/add.wasm -o ${HPCC_WASM_ROOT}/build/guest/cpp/bin/add.component.wasm --adapt wasi_snapshot_preview1=${HPCC_WASM_ROOT}/wit-bindgen/wasi_preview1_component_adapter.reactor.wasm
#     # COMMAND npx jco transpile ${CMAKE_CURRENT_BINARY_DIR}/test.component.wasm -o ${CMAKE_CURRENT_BINARY_DIR}/js --wasi-shim --map wasi-*=@bytecodealliance/preview2-shim/* --map print=../../../../src-components/test/logger.js 
# )
# set_property(SOURCE main.cpp APPEND PROPERTY OBJECT_DEPENDS ${HPCC_WASM_ROOT}/build/guest/cpp/wit/test.c)


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

add_custom_command(
    TARGET wasmembed POST_BUILD  
    # OUTPUT ${CMAKE_CURRENT_BINARY_DIR}/wasmembed-component.wasm
    COMMAND wasm-tools component new ${CMAKE_CURRENT_BINARY_DIR}/wasmembed.wasm -o ${CMAKE_CURRENT_BINARY_DIR}/wasmembed-component.wasm --adapt wasi_snapshot_preview1=${CMAKE_CURRENT_SOURCE_DIR}/wasi_snapshot_preview1.reactor.wasm
)

target_link_libraries(wasmembed
    ${CMAKE_CURRENT_BINARY_DIR}/hpcc_test_component_type.o
)

install(TARGETS wasmembed
    RUNTIME DESTINATION ${CMAKE_CURRENT_BINARY_DIR}/../install-target
)

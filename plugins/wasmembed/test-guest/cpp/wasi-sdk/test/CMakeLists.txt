project(test)

set(CMAKE_EXECUTABLE_SUFFIX ".wasm")

set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -nostartfiles -fno-exceptions --sysroot=${WASI_SDK_PREFIX}/share/wasi-sysroot -Wl,--export-all -Wl,--no-entry")

include_directories(
)

add_executable(test
    main.cpp
)

target_link_libraries(test
)

install(TARGETS test
    EXPORT testConfig
    RUNTIME DESTINATION bin
)

# Export the target information to a file
install(EXPORT testConfig
    FILE testConfig.cmake
    NAMESPACE test::
    DESTINATION lib/cmake/test
)

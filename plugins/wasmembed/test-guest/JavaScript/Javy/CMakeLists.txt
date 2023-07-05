project(javy-index)

file(REMOVE_RECURSE
    ${CMAKE_CURRENT_BINARY_DIR}/src
)

file(COPY
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    ${CMAKE_CURRENT_SOURCE_DIR}/package-lock.json
    ${CMAKE_CURRENT_SOURCE_DIR}/package.json
    DESTINATION ${CMAKE_CURRENT_BINARY_DIR})

set(SRCS
    ${CMAKE_CURRENT_BINARY_DIR}/src/index.js
)

add_custom_command (
    OUTPUT ${CMAKE_CURRENT_BINARY_DIR}/no.file
    COMMAND npm run clean
    WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
)

add_custom_target( javy-index-clean
    DEPENDS ${CMAKE_CURRENT_BINARY_DIR}/no.file
)

add_custom_command (
    OUTPUT ${CMAKE_CURRENT_BINARY_DIR}/lib/package-lock.json
    COMMAND npm install && ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_BINARY_DIR}/package-lock.json ${CMAKE_CURRENT_BINARY_DIR}/lib/package-lock.json
    DEPENDS ${CMAKE_CURRENT_BINARY_DIR}/package-lock.json
    WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
)

add_custom_target( javy-index-fetchdeps
    DEPENDS ${CMAKE_CURRENT_BINARY_DIR}/lib/package-lock.json
)

add_custom_command (
    OUTPUT 
        ${CMAKE_CURRENT_BINARY_DIR}/build/index.wasm
        ${CMAKE_CURRENT_BINARY_DIR}/build/index-shared.wasm
        ${CMAKE_CURRENT_BINARY_DIR}/build/provider.wasm
    COMMAND npm run build
    DEPENDS ${SRCS}
    DEPENDS ${CMAKE_CURRENT_BINARY_DIR}/lib/package-lock.json
    WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
)

add_custom_target ( javy-index ALL 
    DEPENDS ${CMAKE_CURRENT_BINARY_DIR}/build/index.wasm
)

add_dependencies ( javy-index javy-index-fetchdeps )

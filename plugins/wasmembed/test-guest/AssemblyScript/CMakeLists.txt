project(as-index)

file(REMOVE_RECURSE
    ${CMAKE_CURRENT_BINARY_DIR}/assembly
)

file(COPY
    ${CMAKE_CURRENT_SOURCE_DIR}/asconfig.json
    ${CMAKE_CURRENT_SOURCE_DIR}/assembly
    ${CMAKE_CURRENT_SOURCE_DIR}/package-lock.json
    ${CMAKE_CURRENT_SOURCE_DIR}/package.json
    DESTINATION ${CMAKE_CURRENT_BINARY_DIR})

set(SRCS
    ${CMAKE_CURRENT_BINARY_DIR}/assembly/index.ts
    ${CMAKE_CURRENT_BINARY_DIR}/assembly/tsconfig.json
)

add_custom_command (
    OUTPUT ${CMAKE_CURRENT_BINARY_DIR}/no.file
    COMMAND npm run clean
    WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
)

add_custom_target( as-index-clean
    DEPENDS ${CMAKE_CURRENT_BINARY_DIR}/no.file
)

add_custom_command (
    OUTPUT ${CMAKE_CURRENT_BINARY_DIR}/lib/package-lock.json
    COMMAND npm install && ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_BINARY_DIR}/package-lock.json ${CMAKE_CURRENT_BINARY_DIR}/lib/package-lock.json
    DEPENDS ${CMAKE_CURRENT_BINARY_DIR}/package-lock.json
    WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
)

add_custom_target( as-index-fetchdeps
    DEPENDS ${CMAKE_CURRENT_BINARY_DIR}/lib/package-lock.json
)

add_custom_command (
    OUTPUT 
        ${CMAKE_CURRENT_BINARY_DIR}/build/debug.d.ts
        ${CMAKE_CURRENT_BINARY_DIR}/build/debug.js
        ${CMAKE_CURRENT_BINARY_DIR}/build/debug.wasm
        ${CMAKE_CURRENT_BINARY_DIR}/build/debug.wasm.map
        ${CMAKE_CURRENT_BINARY_DIR}/build/debug.wat
        ${CMAKE_CURRENT_BINARY_DIR}/build/release.d.ts
        ${CMAKE_CURRENT_BINARY_DIR}/build/release.js
        ${CMAKE_CURRENT_BINARY_DIR}/build/release.wasm
        ${CMAKE_CURRENT_BINARY_DIR}/build/release.wasm.map
        ${CMAKE_CURRENT_BINARY_DIR}/build/release.wat        
    COMMAND npm run asbuild
    DEPENDS ${SRCS}
    DEPENDS ${CMAKE_CURRENT_BINARY_DIR}/lib/package-lock.json
    WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
)

add_custom_target ( as-index ALL 
    DEPENDS ${CMAKE_CURRENT_BINARY_DIR}/build/release.wasm
)

add_dependencies ( as-index as-index-fetchdeps )

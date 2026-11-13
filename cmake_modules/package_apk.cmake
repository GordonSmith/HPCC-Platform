if(NOT CPACK_GENERATOR STREQUAL "External")
    message(FATAL_ERROR "APK packaging requires the CPack External generator")
endif()

find_program(APK_BASH_EXECUTABLE bash REQUIRED)
set(apk_workspace "${CPACK_TOPLEVEL_DIRECTORY}/apk-work")
set(apk_output "${CPACK_TOPLEVEL_DIRECTORY}/apk-output")
set(apk_manifest "${CPACK_TOPLEVEL_DIRECTORY}/apk-outputs.txt")
set(signing_args)
if(CPACK_APK_SIGNING_KEY)
    list(APPEND signing_args -k "${CPACK_APK_SIGNING_KEY}")
endif()
set(provenance_args)
if(CPACK_APK_VCPKG_PACKAGES_DIR)
    list(APPEND provenance_args --vcpkg-packages-dir "${CPACK_APK_VCPKG_PACKAGES_DIR}")
endif()

execute_process(
    COMMAND "${APK_BASH_EXECUTABLE}"
        "${CPACK_APK_SOURCE_DIR}/dockerfiles/chainguard/containers/package-install-tree.sh"
        -b "${CPACK_APK_BUILD_DIR}" --hpcc-source-dir "${CPACK_APK_SOURCE_DIR}"
        --stage-root "${CPACK_TEMPORARY_DIRECTORY}" -s "${apk_workspace}"
        -o "${apk_output}" -f apk --output-manifest "${apk_manifest}"
        --package-name "${CPACK_PACKAGE_NAME}"
        --package-version "${CPACK_RPM_PACKAGE_VERSION}"
        --package-release "${CPACK_RPM_PACKAGE_RELEASE}"
        --package-contact "${CPACK_PACKAGE_CONTACT}"
        ${signing_args} ${provenance_args}
    RESULT_VARIABLE apk_result
)
if(NOT apk_result STREQUAL "0")
    message(FATAL_ERROR "APK packaging failed: ${apk_result}")
endif()
if(NOT EXISTS "${apk_manifest}")
    message(FATAL_ERROR "APK packaging did not produce an output manifest")
endif()
file(STRINGS "${apk_manifest}" CPACK_EXTERNAL_BUILT_PACKAGES)
list(LENGTH CPACK_EXTERNAL_BUILT_PACKAGES apk_output_count)
if(NOT apk_output_count EQUAL 3)
    message(FATAL_ERROR "APK packaging must produce one APK and two runtime SBOMs")
endif()
foreach(artifact IN LISTS CPACK_EXTERNAL_BUILT_PACKAGES)
    if(NOT EXISTS "${artifact}" OR IS_DIRECTORY "${artifact}")
        message(FATAL_ERROR "APK packaging output missing: ${artifact}")
    endif()
endforeach()

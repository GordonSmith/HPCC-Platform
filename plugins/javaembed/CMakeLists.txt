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


# Component: javaembed

#####################################################
# Description:
# ------------
#    Cmake Input File for javaembed
#####################################################

project(javaembed)

if(JAVAEMBED AND USE_JAVA)
    ADD_PLUGIN(javaembed)
    if(MAKE_JAVAEMBED)
        # On macOS with Homebrew openjdk, the JDK is installed under libexec and
        # CMake's FindJNI does not search there by default. Provide a hint so
        # both find_package(Java) and find_package(JNI) can locate the headers.
        if(APPLE AND NOT DEFINED ENV{JAVA_HOME})
            execute_process(
                COMMAND brew --prefix openjdk
                OUTPUT_VARIABLE HOMEBREW_OPENJDK_PREFIX
                OUTPUT_STRIP_TRAILING_WHITESPACE
                ERROR_QUIET)
            if(HOMEBREW_OPENJDK_PREFIX)
                set(ENV{JAVA_HOME} "${HOMEBREW_OPENJDK_PREFIX}/libexec/openjdk.jdk/Contents/Home")
            endif()
        endif()
        
        find_package(Java 1.8 COMPONENTS Development)

        # Prefer JAVA_HOME if exported; otherwise derive JDK home from resolved java/javac paths.
        set(_javaHome "")
        if(DEFINED ENV{JAVA_HOME} AND NOT "$ENV{JAVA_HOME}" STREQUAL "")
            set(_javaHome "$ENV{JAVA_HOME}")
        elseif(Java_JAVAC_EXECUTABLE)
            get_filename_component(_javaCompiler "${Java_JAVAC_EXECUTABLE}" REALPATH)
            get_filename_component(_javaBinDir "${_javaCompiler}" DIRECTORY)
            get_filename_component(_javaHome "${_javaBinDir}/.." ABSOLUTE)
        elseif(Java_JAVA_EXECUTABLE)
            get_filename_component(_javaRuntime "${Java_JAVA_EXECUTABLE}" REALPATH)
            get_filename_component(_javaBinDir "${_javaRuntime}" DIRECTORY)
            get_filename_component(_javaHome "${_javaBinDir}/.." ABSOLUTE)
        endif()

        if(_javaHome AND EXISTS "${_javaHome}/include/jni.h")
            # Seed FindJNI cache entries to avoid persistent NOTFOUND values from older configure runs.
            set(JAVA_INCLUDE_PATH "${_javaHome}/include" CACHE PATH "JNI include path" FORCE)
            set(JAVA_AWT_INCLUDE_PATH "${_javaHome}/include" CACHE PATH "JNI AWT include path" FORCE)
            if(EXISTS "${_javaHome}/include/linux/jni_md.h")
                set(JAVA_INCLUDE_PATH2 "${_javaHome}/include/linux" CACHE PATH "JNI platform include path" FORCE)
            elseif(EXISTS "${_javaHome}/include/darwin/jni_md.h")
                set(JAVA_INCLUDE_PATH2 "${_javaHome}/include/darwin" CACHE PATH "JNI platform include path" FORCE)
            endif()
            if(EXISTS "${_javaHome}/lib/server/libjvm.so")
                set(JAVA_JVM_LIBRARY "${_javaHome}/lib/server/libjvm.so" CACHE FILEPATH "JVM shared library" FORCE)
            endif()
            if(EXISTS "${_javaHome}/lib/libjawt.so")
                set(JAVA_AWT_LIBRARY "${_javaHome}/lib/libjawt.so" CACHE FILEPATH "JAWT shared library" FORCE)
            endif()
        endif()

        find_package(JNI)
        set(JNI_INCLUDE_DIRS_CLEAN)
        foreach(_jniInc ${JNI_INCLUDE_DIRS})
            if(NOT _jniInc MATCHES "-NOTFOUND$")
                list(APPEND JNI_INCLUDE_DIRS_CLEAN ${_jniInc})
            endif()
        endforeach()
        set(
            SRCS
            javaembed.cpp)

        include_directories(
            ${JNI_INCLUDE_DIRS_CLEAN}
            ./../../system/include
            ./../../rtl/eclrtl
            ./../../rtl/include
            ./../../rtl/nbcd
            ./../../common/deftype
            ./../../system/jlib
             ./../../dali/base
            ./../../system/mp
            ./../../system/security/shared
            ./../../roxie/roxiemem
            ${HPCC_SOURCE_DIR}/esp/esdllib
            ${HPCC_SOURCE_DIR}/common/thorhelper
            ${CMAKE_BINARY_DIR}
            ${CMAKE_BINARY_DIR}/oss)

        set(java_sources HpccClassLoader.java
                         HpccUtils.java
                         ActivityContext.java
                         HpccLogHandler.java)
        set(java_classes ${CMAKE_CURRENT_BINARY_DIR}/com/HPCCSystems/HpccClassLoader.class
                         ${CMAKE_CURRENT_BINARY_DIR}/com/HPCCSystems/HpccUtils.class
                         ${CMAKE_CURRENT_BINARY_DIR}/com/HPCCSystems/ActivityContext.class
                         ${CMAKE_CURRENT_BINARY_DIR}/com/HPCCSystems/HpccLogHandler.class)
        add_custom_command ( OUTPUT ${java_classes}
            COMMAND ${Java_JAVAC_EXECUTABLE} ${java_sources} -d ${CMAKE_CURRENT_BINARY_DIR} -source 1.8 -target 1.8
            DEPENDS ${java_sources}
            WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
        )
        add_custom_target(build-java-classes ALL
          DEPENDS ${java_classes}
        )

        add_definitions(-D_USRDLL -DJAVAEMBED_EXPORTS)

        HPCC_ADD_LIBRARY(javaembed SHARED ${SRCS})
        add_dependencies(javaembed build-java-classes)

        if(${CMAKE_VERSION} VERSION_LESS "2.8.9")
            message(WARNING "Cannot set NO_SONAME. shlibdeps will give warnings when package is installed")
        elseif(NOT APPLE)
            set_target_properties(javaembed PROPERTIES NO_SONAME 1)
        endif()

        install(
            TARGETS javaembed
            DESTINATION plugins)
        install(
            FILES ${java_classes}
            DESTINATION classes/com/HPCCSystems
            COMPONENT Runtime
            CALC_DEPS)

        # We link against jsig so that signals are chained from the jvm

        get_filename_component(JAVA_LIBRARY_PATH ${JAVA_AWT_LIBRARY} PATH)
        if(APPLE)
            set(JSIG_LIBRARY ${JAVA_LIBRARY_PATH}/libjsig.dylib)
        elseif(WIN32)
            set(JSIG_LIBRARY ${JAVA_LIBRARY_PATH}/jsig.dll)
        else()
            set(JSIG_LIBRARY ${JAVA_LIBRARY_PATH}/libjsig.so)
        endif()

        target_link_libraries(
            javaembed
            #${JSIG_LIBRARY}
            ${JAVA_JVM_LIBRARY}
            eclrtl
            roxiemem
            jlib)
    endif()
endif()
if(PLATFORM OR CLIENTTOOLS_ONLY)
    install(
        FILES ${CMAKE_CURRENT_SOURCE_DIR}/java.ecllib
        DESTINATION plugins
        COMPONENT Runtime)
endif()

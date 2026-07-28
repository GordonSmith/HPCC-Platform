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

# - Try to find the R library
# Once done this will define
#
#  R_FOUND - system has the R library
#  R_INCLUDE_DIR - the R include directory(s)
#  R_LIBRARIES - The libraries needed to use R

IF (NOT R_FOUND)
  IF (WIN32)
    SET (R_lib "libR")
    SET (Rcpp_lib "libRcpp")
    SET (RInside_lib "libRInside")
  ELSE()
    SET (R_lib "R")
    SET (Rcpp_lib "Rcpp")
    SET (RInside_lib "RInside")
  ENDIF()

  SET(_rLibrarySearchPaths
      /usr/lib
      /usr/share
      /usr/lib64
      /usr/local/lib
      /usr/local/lib64
      /Library/Frameworks/R.framework/Versions/3.5/)

  IF(DEFINED ENV{HOME} AND NOT "$ENV{HOME}" STREQUAL "")
    LIST(APPEND _rLibrarySearchPaths "$ENV{HOME}/R/library")
  ENDIF()

  IF(DEFINED ENV{R_LIBS_USER} AND NOT "$ENV{R_LIBS_USER}" STREQUAL "")
    LIST(APPEND _rLibrarySearchPaths "$ENV{R_LIBS_USER}")
  ENDIF()

  FIND_PROGRAM(RSCRIPT_EXECUTABLE NAMES Rscript)
  IF(RSCRIPT_EXECUTABLE)
    EXECUTE_PROCESS(
      COMMAND ${RSCRIPT_EXECUTABLE} -e "cat(.libPaths(), sep=';')"
      OUTPUT_VARIABLE rLibraryPaths
      OUTPUT_STRIP_TRAILING_WHITESPACE
      ERROR_QUIET)
    IF(rLibraryPaths)
      LIST(APPEND _rLibrarySearchPaths ${rLibraryPaths})
    ENDIF()
  ENDIF()

  FIND_PATH(R_INCLUDE_DIR R.h PATHS /usr/include /usr/local/include ${_rLibrarySearchPaths} PATH_SUFFIXES R R/include Resources/include)
  FIND_PATH(RCPP_INCLUDE_DIR Rcpp.h PATHS ${_rLibrarySearchPaths} PATH_SUFFIXES R/library/Rcpp/include/ R/site-library/Rcpp/include/ Resources/library/Rcpp/include/ Rcpp/include)
  FIND_PATH(RINSIDE_INCLUDE_DIR RInside.h PATHS ${_rLibrarySearchPaths} PATH_SUFFIXES R/library/RInside/include R/site-library/RInside/include /Resources/library/RInside/include RInside/include)

  FIND_LIBRARY (R_LIBRARY NAMES ${R_lib} PATHS ${_rLibrarySearchPaths} PATH_SUFFIXES R/lib Resources/lib)
  FIND_LIBRARY (RCPP_LIBRARY NAMES ${Rcpp_lib} PATHS ${_rLibrarySearchPaths} PATH_SUFFIXES R/library/Rcpp/lib/ R/site-library/Rcpp/lib/ Rcpp/lib)
  FIND_LIBRARY (RINSIDE_LIBRARY NAMES ${RInside_lib} PATHS ${_rLibrarySearchPaths} PATH_SUFFIXES R/library/RInside/lib/ R/site-library/RInside/lib/ Resources/library/RInside/lib/ RInside/lib)

  IF (RCPP_LIBRARY STREQUAL "RCPP_LIBRARY-NOTFOUND")
    SET (RCPP_LIBRARY "")    # Newer versions of Rcpp are header-only, with no associated library.
  ENDIF()

  IF(EXISTS "${RCPP_INCLUDE_DIR}/Rcpp/config.h")
    # Prefer the explicit string define used by modern Rcpp versions.
    FILE(STRINGS "${RCPP_INCLUDE_DIR}/Rcpp/config.h" rcpp_version_line REGEX "#define[ ]+RCPP_VERSION_STRING[ ]+\"")
    IF(rcpp_version_line)
      STRING(REGEX REPLACE ".*\"([0-9]+\\.[0-9]+\\.[0-9]+).*" "\\1" RCPP_VERSION_STRING "${rcpp_version_line}")
    ELSE()
      # Fallback for older format: #define RCPP_VERSION Rcpp_Version(0,12,3)
      FILE(STRINGS "${RCPP_INCLUDE_DIR}/Rcpp/config.h" version_string REGEX "#define[ ]+RCPP_VERSION[ ]+Rcpp_Version\\(")
      STRING(REGEX REPLACE ".*Rcpp_Version\\(([0-9]+),([0-9]+),([0-9]+)\\).*" "\\1.\\2.\\3" RCPP_VERSION_STRING "${version_string}")
    ENDIF()
  ENDIF()

  SET (R_INCLUDE_DIRS ${R_INCLUDE_DIR} ${RINSIDE_INCLUDE_DIR} ${RCPP_INCLUDE_DIR})
  SET (R_LIBRARIES ${R_LIBRARY} ${RINSIDE_LIBRARY} ${RCPP_LIBRARY})

  INCLUDE(FindPackageHandleStandardArgs)
  find_package_handle_standard_args(R
    REQUIRED_VARS R_LIBRARY
                  RINSIDE_LIBRARY
                  R_INCLUDE_DIR
                  RCPP_INCLUDE_DIR
                  RINSIDE_INCLUDE_DIR
                  R_LIBRARIES
                  R_INCLUDE_DIRS
    VERSION_VAR RCPP_VERSION_STRING)

  MARK_AS_ADVANCED(R_INCLUDE_DIRS R_LIBRARIES RINSIDE_LIBRARY)
ENDIF()

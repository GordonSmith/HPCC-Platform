@echo off
setlocal

REM Coverage script for ECL Watch tests
REM Usage: coverage.bat [options]
REM   --ci     : Run in CI mode
REM   --full   : Run full test suite (all browsers)
REM   --report : Generate report only (no tests)
REM   --open   : Open HTML report after generation
REM   --help   : Show this help

set "run_tests=true"
set "open_report=false"
set "test_mode=basic"

REM Parse command line arguments
:parse_args
if "%~1"=="" goto end_parse
if "%~1"=="--ci" (
    set "test_mode=ci"
    shift
    goto parse_args
)
if "%~1"=="--full" (
    set "test_mode=full"
    shift
    goto parse_args
)
if "%~1"=="--report" (
    set "run_tests=false"
    shift
    goto parse_args
)
if "%~1"=="--open" (
    set "open_report=true"
    shift
    goto parse_args
)
if "%~1"=="--help" (
    call :show_help
    exit /b 0
)
echo Unknown option: %~1
call :show_help
exit /b 1

:end_parse

echo ECL Watch Coverage Script
echo ========================

REM Clean previous coverage data
if exist "coverage" (
    echo Cleaning previous coverage data...
    rmdir /s /q coverage
)

if exist ".nyc_output" (
    rmdir /s /q .nyc_output
)

if "%run_tests%"=="true" (
    echo Running tests with coverage collection...
    
    if "%test_mode%"=="ci" (
        echo Mode: CI
        call npm run test-coverage-ci
    ) else if "%test_mode%"=="full" (
        echo Mode: Full (all browsers^)
        call npm run test-coverage-full
    ) else (
        echo Mode: Basic
        call npm run test-coverage
    )
) else (
    echo Generating coverage report from existing data...
    call npm run test-coverage-report
)

echo.
echo Coverage generation complete!
echo.
echo Reports generated:
echo   - Text summary: displayed above
echo   - HTML report: coverage\index.html
echo   - LCOV report: coverage\lcov.info
echo   - JSON report: coverage\coverage-final.json

if "%open_report%"=="true" (
    echo.
    echo Opening HTML coverage report...
    start coverage\index.html
)

echo.
echo For more information, see COVERAGE.md
exit /b 0

:show_help
echo Coverage script for ECL Watch tests
echo.
echo Usage: %~n0 [options]
echo.
echo Options:
echo   --ci        Run in CI mode
echo   --full      Run full test suite (all browsers^)
echo   --report    Generate report only (no tests^)
echo   --open      Open HTML report after generation
echo   --help      Show this help
echo.
echo Examples:
echo   %~n0                    # Run basic coverage tests
echo   %~n0 --full            # Run coverage on all browsers
echo   %~n0 --ci              # Run in CI mode
echo   %~n0 --report --open   # Generate and view report
exit /b 0

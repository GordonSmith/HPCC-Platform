#!/bin/bash

# Coverage script for ECL Watch tests
# Usage: ./coverage.sh [options]
#   --ci     : Run in CI mode
#   --full   : Run full test suite (all browsers)
#   --report : Generate report only (no tests)
#   --open   : Open HTML report after generation
#   --help   : Show this help

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

show_help() {
    echo "Coverage script for ECL Watch tests"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --ci        Run in CI mode"
    echo "  --full      Run full test suite (all browsers)"
    echo "  --report    Generate report only (no tests)"
    echo "  --open      Open HTML report after generation"
    echo "  --help      Show this help"
    echo ""
    echo "Examples:"
    echo "  $0                    # Run basic coverage tests"
    echo "  $0 --full            # Run coverage on all browsers"
    echo "  $0 --ci              # Run in CI mode"
    echo "  $0 --report --open   # Generate and view report"
}

run_tests=true
open_report=false
test_mode="basic"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --ci)
            test_mode="ci"
            shift
            ;;
        --full)
            test_mode="full"
            shift
            ;;
        --report)
            run_tests=false
            shift
            ;;
        --open)
            open_report=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

echo "ECL Watch Coverage Script"
echo "========================"

# Clean previous coverage data
if [ -d "coverage" ]; then
    echo "Cleaning previous coverage data..."
    rm -rf coverage
fi

if [ -d ".nyc_output" ]; then
    rm -rf .nyc_output
fi

if [ "$run_tests" = true ]; then
    echo "Running tests with coverage collection..."
    
    case $test_mode in
        "ci")
            echo "Mode: CI"
            npm run test-coverage-ci
            ;;
        "full")
            echo "Mode: Full (all browsers)"
            npm run test-coverage-full
            ;;
        *)
            echo "Mode: Basic"
            npm run test-coverage
            ;;
    esac
else
    echo "Generating coverage report from existing data..."
    npm run test-coverage-report
fi

echo ""
echo "Coverage generation complete!"
echo ""
echo "Reports generated:"
echo "  - Text summary: displayed above"
echo "  - HTML report: coverage/index.html"
echo "  - LCOV report: coverage/lcov.info"
echo "  - JSON report: coverage/coverage-final.json"

if [ "$open_report" = true ]; then
    echo ""
    echo "Opening HTML coverage report..."
    
    # Try to open the report with the default browser
    if command -v xdg-open > /dev/null; then
        xdg-open coverage/index.html
    elif command -v open > /dev/null; then
        open coverage/index.html
    elif command -v start > /dev/null; then
        start coverage/index.html
    else
        echo "Could not automatically open browser. Please open coverage/index.html manually."
    fi
fi

echo ""
echo "For more information, see COVERAGE.md"

# Coverage Transformation

This directory contains tools for transforming V8 coverage data to reference original TypeScript/React source files instead of webpack bundles.

## Quick Start

```bash
# 1. Run tests with coverage collection
npm run test-coverage

# 2. Transform coverage to reference original sources
npm run test-coverage-transform

# 3. Analyze coverage results
npm run test-coverage-analyze

# 4. Clean up coverage data
npm run test-coverage-clean
```

## How It Works

1. **Coverage Collection**: A minimal Playwright test (`tests/minimal-coverage.spec.ts`) collects V8 coverage data by loading the application and saving raw coverage data to `.nyc_output/`
2. **Source Transformation**: `simple-transform-coverage.js` uses webpack source maps to map bundle coverage back to original source files
3. **Analysis**: `analyze-coverage.js` provides insights about which TypeScript/React files have coverage

## Files

- `tests/minimal-coverage.spec.ts` - Minimal test that collects V8 coverage without file handle issues
- `simple-transform-coverage.js` - Main coverage transformer
- `analyze-coverage.js` - Coverage analysis and reporting tool

## Output

- `.nyc_output/coverage-*.json` - Raw V8 coverage data from tests
- `.nyc_output/transformed/` - Transformed coverage files with source references
- `.nyc_output/analysis/` - Exported analysis data

The transformed coverage files reference your original source files like:
- `webpack://eclwatch/./src-react/components/About.tsx`
- `webpack://eclwatch/./src/ESPUtil.ts`

Instead of unreadable webpack bundle files.

## Technical Notes

- Webpack source map generation is disabled during coverage collection (`COVERAGE=1`) to prevent file handle leaks
- Source mapping happens post-processing, not during test execution
- Coverage collection uses direct Playwright V8 coverage APIs for maximum efficiency

# Test Coverage for ECL Watch

This directory contains a simplified coverage system that works with Playwright tests to generate browser-based JavaScript coverage reports.

## Quick Start

### Running Coverage with Existing Tests

To run any test with coverage enabled:

```bash
# Run specific test with coverage
COVERAGE=1 npx playwright test your-test-file.spec.ts

# Run all tests with coverage
COVERAGE=1 npx playwright test

# Run tests matching a pattern with coverage
COVERAGE=1 npx playwright test --grep "your pattern"
```

The coverage report will be generated at `coverage/index.html` after the tests complete.

### Adding Coverage to New Tests

To add automatic coverage to your tests, simply change your import:

```typescript
// Before:
import { test, expect } from "@playwright/test";

// After:
import { test, expect } from "./simple-coverage-fixtures";
```

Then use the `autoCoverage` fixture instead of `page`:

```typescript
test("My test with coverage", async ({ autoCoverage: page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    // Coverage is automatically collected!
});
```

## Architecture

### Files

- **`web-coverage.ts`** - Core coverage collection and HTML report generation
- **`simple-coverage-fixtures.ts`** - Playwright fixtures for automatic coverage
- **`simple-coverage.spec.ts`** - Example test showing coverage usage
- **`COVERAGE.md`** - This documentation

### How It Works

1. **Coverage Collection**: Uses Playwright's `page.coverage.startJSCoverage()` to collect JavaScript execution data
2. **File Storage**: Coverage data is saved to temporary files to work across Playwright workers
3. **Filtering**: Only includes relevant files (`.eclwatch.js` files from `/dist/` directory)
4. **Report Generation**: Creates an HTML report showing file-by-file coverage statistics
5. **Cleanup**: Temporary files are cleaned up after report generation

### Coverage Metrics

- **Files**: Number of JavaScript files with coverage data
- **Functions**: Function-level coverage (accurate)
- **Lines**: Estimated line coverage (approximate, based on byte ranges)

## Configuration

Coverage is enabled when:
- `COVERAGE=1` environment variable is set
- `NODE_V8_COVERAGE` environment variable is set
- Command line includes `c8` or `test-coverage`

## Output

Coverage reports are generated in the `coverage/` directory:
- `index.html` - Main coverage report with file-by-file breakdown
- Includes summary statistics and detailed per-file coverage

## Example Usage

```typescript
import { test, expect } from "./simple-coverage-fixtures";

test.describe("My Component", () => {
    test("loads correctly", async ({ autoCoverage: page }) => {
        await page.goto("/my-component");
        await expect(page.locator(".my-component")).toBeVisible();
        
        // All JavaScript execution is automatically tracked
        await page.click(".some-button");
        await page.fill(".some-input", "test data");
    });
});
```

## Troubleshooting

### No Coverage Data
- Ensure `COVERAGE=1` is set when running tests
- Check that tests are actually navigating to pages and executing JavaScript
- Verify the dev server is running (coverage collects from live pages)

### Low Coverage Numbers
- Coverage only tracks JavaScript execution in the browser
- Make sure tests interact with the UI to trigger JavaScript execution
- Check that the test is navigating to the correct pages

### Performance
- Coverage collection adds some overhead to test execution
- Only enable coverage when needed (not for regular development)
- The system is optimized for accuracy over speed

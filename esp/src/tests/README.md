# ECL Watch Playwright Test Suite

This comprehensive test suite provides extensive coverage of ECL Watch functionality using Playwright framework. The tests are designed to validate both the legacy V5 and modern V9 versions of ECL Watch.

## Test Files Overview

### Core Functionality Tests

1. **navigation.spec.ts** - Navigation and Interface Tests
   - Main navigation links and breadcrumbs
   - Search functionality across interfaces
   - Responsive layout elements
   - Keyboard navigation support
   - Theme and visual elements

2. **workunits.spec.ts** - ECL Workunit Management Tests
   - Workunit grid display and columns
   - Filtering and search capabilities
   - Workunit selection and state management
   - Details page access and navigation
   - Context menu functionality
   - Pagination and sorting
   - Export functionality

3. **files.spec.ts** - File and Logical File Tests
   - File grid display and columns
   - File search and filtering
   - File operations (copy, delete, despray, rename)
   - File selection and details access
   - Content preview functionality
   - Upload/spray functionality
   - Context menu operations
   - Advanced filtering options

4. **queries.spec.ts** - Published Queries Tests
   - Query grid display and management
   - Query search and filtering
   - Query state management (suspend, activate, delete)
   - Query details and testing interface
   - Query links and URL generation
   - Bulk operations on multiple queries
   - Query publication interface

5. **events.spec.ts** - Event Scheduler Tests
   - Event scheduler grid display
   - Event creation and management
   - Event state management
   - Event details and scheduling interface
   - Event monitoring and status tracking
   - Event history and logging
   - Bulk operations on events

### User Interface Tests

6. **interactions.spec.ts** - User Interface Interaction Tests
   - Global controls and settings
   - Data grid interactions
   - Form controls and inputs
   - Dialog and modal interactions
   - Tooltip and help functionality
   - Keyboard navigation and shortcuts
   - Drag and drop operations
   - Context menu interactions
   - Responsive design testing
   - Data refresh and auto-update

7. **visualizations.spec.ts** - Data Visualization Tests
   - Activities dashboard charts
   - Workunit graphs and timing visualizations
   - File data visualization
   - Query result visualization
   - System monitoring charts
   - Interactive data exploration
   - Chart export functionality
   - Real-time data updates in charts
   - Chart responsiveness

8. **search-filtering.spec.ts** - Search and Filtering Tests
   - Global search functionality
   - Advanced search and filters
   - Column-specific filtering
   - Date range filtering
   - Multi-select and dropdown filtering
   - Search result highlighting
   - Saved searches and search history
   - Filter persistence and state management
   - Search performance with large datasets
   - Auto-complete and suggestions
   - Complex search queries and operators

### Quality Assurance Tests

9. **error-handling.spec.ts** - Error Handling and Edge Cases
   - Invalid URL handling
   - Network error handling
   - Empty data state handling
   - Loading state management
   - Form validation and error states
   - Permission and access errors
   - Session timeout handling
   - Browser compatibility issues
   - Data corruption handling
   - Memory and performance issues
   - Concurrent user actions
   - Resource loading failures

10. **cross-version.spec.ts** - Cross-Version Compatibility Tests
    - V9 (Modern) mode functionality
    - V5 (Legacy) mode functionality
    - Version-agnostic core features
    - Progressive enhancement testing
    - Feature detection and graceful degradation
    - Accessibility across versions

## Running the Tests

### Prerequisites
- Node.js and npm installed
- Playwright dependencies installed
- ECL Watch application running (local or remote)

### Test Execution Commands

```bash
# Run all tests
npm test

# Run specific test file
npx playwright test navigation.spec.ts

# Run tests with UI mode for debugging
npx playwright test --ui

# Run tests in headed mode (visible browser)
npx playwright test --headed

# Run tests with specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run tests against specific environment
# Local development
npx playwright test --config=playwright.config.ts

# CI environment
npm run test-ci
```

### Test Configuration

The tests are configured to run against:
- **Local development**: `http://127.0.0.1:8080`
- **CI environment**: `https://play.hpccsystems.com:18010`

Configuration is handled in `playwright.config.ts` with environment-specific settings.

## Test Patterns and Best Practices

### Selectors Strategy
Tests use a resilient selector strategy with fallbacks:
1. Semantic selectors (role, label, title)
2. Text-based selectors
3. CSS selectors
4. XPath selectors (when necessary)

### Error Handling
All tests include proper error handling:
- Timeout configurations appropriate for each operation
- Graceful degradation when features are not available
- Logging of missing features for debugging

### Version Compatibility
Tests are designed to work across different ECL Watch versions:
- Automatic version detection
- Conditional test execution based on available features
- Fallback mechanisms for missing functionality

## Test Data Requirements

### Test Environment Setup
- Tests are designed to work with minimal setup
- No specific test data requirements for basic functionality
- Some tests may skip assertions if no data is available
- Mock data can be used for testing specific scenarios

### Data Scenarios Covered
- Empty states (no data available)
- Normal data scenarios
- Large datasets (pagination testing)
- Error conditions (network failures, invalid data)

## Maintenance and Updates

### Adding New Tests
When adding new test cases:
1. Follow existing naming conventions
2. Include appropriate error handling
3. Add documentation for new test functionality
4. Consider both V5 and V9 compatibility
5. Include accessibility testing where applicable

### Updating Existing Tests
When modifying existing tests:
1. Ensure backward compatibility
2. Update documentation
3. Test across different browsers
4. Verify CI/CD pipeline compatibility

## Troubleshooting

### Common Issues
1. **Test timeouts**: Increase timeout values for slow operations
2. **Element not found**: Check if feature is available in current version
3. **Network errors**: Verify ECL Watch application is running
4. **Browser compatibility**: Test across different browsers

### Debug Mode
Use Playwright's built-in debugging tools:
- `--debug` flag for step-by-step execution
- `--ui` flag for interactive test running
- Browser developer tools for element inspection

## Coverage Areas

### Functional Coverage
- ✅ Navigation and routing
- ✅ Data display and grids
- ✅ Search and filtering
- ✅ CRUD operations
- ✅ User interactions
- ✅ Data visualization
- ✅ Error handling
- ✅ Performance scenarios

### Browser Coverage
- ✅ Chromium (Chrome, Edge)
- ✅ Firefox
- ✅ WebKit (Safari)

### Version Coverage
- ✅ ECL Watch V5 (Legacy)
- ✅ ECL Watch V9 (Modern)
- ✅ Cross-version compatibility

### Device Coverage
- ✅ Desktop (1920x1080, 1024x768)
- ✅ Tablet (768x1024)
- ✅ Mobile (375x667)

## Future Enhancements

### Potential Additions
- Performance benchmarking tests
- Accessibility compliance testing (WCAG)
- Integration tests with backend services
- Visual regression testing
- Load testing scenarios
- API-level testing integration

### Automation Opportunities
- Automated test data generation
- Test result reporting and metrics
- Continuous integration enhancements
- Parallel test execution optimization
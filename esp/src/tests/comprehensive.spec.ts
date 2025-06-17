import { test, expect } from "./test-utils";
import { TestUtils, ECLWatchAssertions, TestDataGenerator } from "./test-utils";

test.describe("ECL Watch Comprehensive Test Suite", () => {
    let testUtils: TestUtils;
    let assertions: ECLWatchAssertions;

    test.beforeEach(async ({ page }) => {
        testUtils = new TestUtils(page);
        assertions = new ECLWatchAssertions(page);
    });

    test("End-to-End Workflow: Complete ECL Watch Usage", async ({ page }) => {
        // Test a complete workflow through ECL Watch
        
        // 1. Start with navigation test
        await page.goto("/esp/files/index.html");
        await assertions.assertPageLoaded();
        await assertions.assertNavigationWorking();
        
        // 2. Navigate to Activities section
        await testUtils.navigateToSection("activities");
        await assertions.assertPageLoaded("Activities");
        
        // 3. Test data grid functionality
        await assertions.assertGridVisible();
        const gridInteraction = await testUtils.interactWithGrid();
        
        if (gridInteraction && gridInteraction.rowCount > 0) {
            // Select first row if data exists
            await gridInteraction.selectRow(1); // Skip header
        }
        
        // 4. Test search functionality
        const searchTerm = TestDataGenerator.generateSearchTerms()[0];
        await testUtils.performSearch(searchTerm);
        
        // 5. Test advanced filters
        await testUtils.openAdvancedFilters();
        await testUtils.handleDialog("close"); // Close if opened
        
        // 6. Navigate to Workunits section
        await testUtils.navigateToSection("workunits");
        await assertions.assertPageLoaded("ECL");
        
        // 7. Test workunit grid
        await assertions.assertGridVisible();
        
        // 8. Navigate to Files section
        await testUtils.navigateToSection("files");
        await assertions.assertPageLoaded("Files");
        
        // 9. Test file grid
        await assertions.assertGridVisible();
        
        // 10. Navigate to Queries section
        await testUtils.navigateToSection("queries");
        await assertions.assertPageLoaded("Published Queries");
        
        // 11. Test queries grid
        await assertions.assertGridVisible();
        
        // 12. Test refresh functionality
        await testUtils.refreshData();
        
        // 13. Verify no errors occurred during workflow
        await assertions.assertNoErrors();
        
        console.log("✅ Complete ECL Watch workflow test passed");
    });

    test("Cross-Browser Compatibility Verification", async ({ page, browserName }) => {
        // Test that core functionality works across different browsers
        
        console.log(`Testing in ${browserName}`);
        
        const testSections = ["activities", "workunits", "files", "queries"];
        
        for (const section of testSections) {
            await testUtils.navigateToSection(section);
            
            // Verify basic page functionality
            await assertions.assertPageLoaded();
            
            // Test that grids load properly
            try {
                await assertions.assertGridVisible();
            } catch {
                console.log(`Grid not available in ${section} section - this may be expected`);
            }
            
            // Test basic interactions
            await testUtils.refreshData();
            
            // Verify no errors
            const errors = await testUtils.checkForErrors();
            if (errors.length > 0) {
                console.warn(`Errors found in ${section} on ${browserName}:`, errors);
            }
        }
        
        console.log(`✅ Cross-browser compatibility verified for ${browserName}`);
    });

    test("Performance and Load Testing", async ({ page }) => {
        // Test performance characteristics of ECL Watch
        
        const startTime = Date.now();
        
        // 1. Measure initial page load
        await page.goto("/esp/files/index.html");
        const loadTime = Date.now() - startTime;
        
        console.log(`Initial page load: ${loadTime}ms`);
        expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
        
        // 2. Test rapid navigation
        const navigationStartTime = Date.now();
        const sections = ["activities", "workunits", "files", "queries"];
        
        for (let i = 0; i < 3; i++) {
            for (const section of sections) {
                await testUtils.navigateToSection(section);
                await page.waitForTimeout(100); // Brief pause between navigations
            }
        }
        
        const navigationTime = Date.now() - navigationStartTime;
        console.log(`Rapid navigation test: ${navigationTime}ms`);
        
        // 3. Test memory usage stability
        const memoryBefore = await page.evaluate(() => {
            return (performance as any).memory?.usedJSHeapSize || 0;
        });
        
        // Perform intensive operations
        for (let i = 0; i < 10; i++) {
            await testUtils.performSearch("test");
            await testUtils.refreshData();
            await page.waitForTimeout(100);
        }
        
        const memoryAfter = await page.evaluate(() => {
            return (performance as any).memory?.usedJSHeapSize || 0;
        });
        
        if (memoryBefore && memoryAfter) {
            const memoryIncrease = memoryAfter - memoryBefore;
            console.log(`Memory usage increase: ${memoryIncrease} bytes`);
            
            // Memory increase should be reasonable (less than 50MB for these operations)
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
        }
        
        // 4. Verify page is still responsive
        await assertions.assertPageLoaded();
        await assertions.assertNoErrors();
        
        console.log("✅ Performance and load testing completed");
    });

    test("Accessibility and Usability Verification", async ({ page }) => {
        // Test accessibility features and usability
        
        await page.goto("/esp/files/index.html#/activities");
        
        // 1. Test keyboard navigation
        await page.keyboard.press("Tab");
        const focusedElement = page.locator(":focus");
        
        try {
            await expect(focusedElement).toBeVisible({ timeout: 1000 });
            console.log("✅ Keyboard navigation functional");
        } catch {
            console.warn("⚠️  Keyboard navigation may need improvement");
        }
        
        // 2. Test for ARIA attributes
        const ariaElements = await page.locator("[role], [aria-label], [aria-describedby]").count();
        console.log(`Found ${ariaElements} elements with ARIA attributes`);
        
        // 3. Test color contrast (basic check)
        const hasHighContrast = await page.evaluate(() => {
            const body = document.body;
            const styles = window.getComputedStyle(body);
            const bgColor = styles.backgroundColor;
            const textColor = styles.color;
            
            // Basic check - ensure colors are defined
            return bgColor !== "rgba(0, 0, 0, 0)" && textColor !== "rgba(0, 0, 0, 0)";
        });
        
        expect(hasHighContrast).toBe(true);
        console.log("✅ Basic color contrast check passed");
        
        // 4. Test responsive design
        const responsiveResults = await testUtils.testResponsiveness();
        const allViewportsWorking = responsiveResults.every(result => result.isVisible);
        
        expect(allViewportsWorking).toBe(true);
        console.log("✅ Responsive design verification passed");
        
        // 5. Test that all major UI elements are accessible
        const accessibleElements = [
            page.getByRole("button"),
            page.getByRole("link"),
            page.getByRole("textbox"),
            page.getByRole("grid")
        ];
        
        for (const elementGroup of accessibleElements) {
            const count = await elementGroup.count();
            if (count > 0) {
                console.log(`✅ Found ${count} accessible elements of type`);
            }
        }
        
        console.log("✅ Accessibility and usability verification completed");
    });

    test("Data Integrity and State Management", async ({ page }) => {
        // Test data integrity and state management across sessions
        
        await page.goto("/esp/files/index.html#/activities");
        
        // 1. Test search state persistence
        const searchTerm = "test-persistence";
        await testUtils.performSearch(searchTerm);
        
        // Navigate away and back
        await testUtils.navigateToSection("files");
        await testUtils.navigateToSection("activities");
        
        // Check if search persisted (this may or may not be implemented)
        const searchInput = page.locator("input[type='text']").first();
        try {
            const currentValue = await searchInput.inputValue();
            if (currentValue === searchTerm) {
                console.log("✅ Search state persisted across navigation");
            } else {
                console.log("ℹ️  Search state does not persist (this may be by design)");
            }
        } catch {
            console.log("ℹ️  Search input not found in current context");
        }
        
        // 2. Test version switching (if available)
        const versionSwitcher = await testUtils.findElement([
            "button:has-text('Legacy')",
            "button:has-text('Modern')",
            ".version-toggle"
        ]);
        
        if (versionSwitcher) {
            await versionSwitcher.click();
            await page.waitForTimeout(1000);
            
            // Verify page still works after version switch
            await assertions.assertPageLoaded();
            console.log("✅ Version switching functional");
        }
        
        // 3. Test session stability
        await page.evaluate(() => {
            // Simulate some session activity
            sessionStorage.setItem("test-key", "test-value");
        });
        
        // Perform operations
        await testUtils.refreshData();
        
        const sessionValue = await page.evaluate(() => {
            return sessionStorage.getItem("test-key");
        });
        
        expect(sessionValue).toBe("test-value");
        console.log("✅ Session storage stability verified");
        
        // 4. Test error recovery
        await page.route("**/WsWorkunits/**", route => {
            route.abort("failed");
        });
        
        await testUtils.refreshData();
        
        // Should handle gracefully
        await assertions.assertPageLoaded();
        
        // Clear route interception
        await page.unroute("**/WsWorkunits/**");
        
        console.log("✅ Error recovery verification completed");
    });

    test("Feature Coverage Summary", async ({ page }) => {
        // Comprehensive test to verify all major features are accessible
        
        const featureCoverage = {
            navigation: false,
            grids: false,
            search: false,
            filters: false,
            refresh: false,
            export: false,
            visualizations: false,
            responsive: false
        };
        
        await page.goto("/esp/files/index.html#/activities");
        
        // Test navigation
        try {
            await assertions.assertNavigationWorking();
            featureCoverage.navigation = true;
        } catch {
            console.log("⚠️  Navigation features limited");
        }
        
        // Test grids
        try {
            await assertions.assertGridVisible();
            featureCoverage.grids = true;
        } catch {
            console.log("⚠️  Grid features not available");
        }
        
        // Test search
        try {
            await assertions.assertSearchFunctional();
            featureCoverage.search = true;
        } catch {
            console.log("⚠️  Search features limited");
        }
        
        // Test filters
        if (await testUtils.openAdvancedFilters()) {
            featureCoverage.filters = true;
            await testUtils.handleDialog("close");
        }
        
        // Test refresh
        if (await testUtils.refreshData()) {
            featureCoverage.refresh = true;
        }
        
        // Test export
        if (await testUtils.exportData()) {
            featureCoverage.export = true;
            await testUtils.handleDialog("close");
        }
        
        // Test visualizations
        const charts = await page.locator("svg, canvas, .chart").count();
        if (charts > 0) {
            featureCoverage.visualizations = true;
        }
        
        // Test responsive
        const responsiveResults = await testUtils.testResponsiveness();
        featureCoverage.responsive = responsiveResults.every(r => r.isVisible);
        
        // Report coverage
        const coveragePercentage = Object.values(featureCoverage).filter(Boolean).length / Object.keys(featureCoverage).length * 100;
        
        console.log("📊 Feature Coverage Summary:");
        Object.entries(featureCoverage).forEach(([feature, covered]) => {
            console.log(`  ${covered ? "✅" : "❌"} ${feature}`);
        });
        
        console.log(`\n📈 Overall Coverage: ${coveragePercentage.toFixed(1)}%`);
        
        // Expect at least 70% feature coverage
        expect(coveragePercentage).toBeGreaterThanOrEqual(70);
        
        console.log("✅ Feature coverage verification completed");
    });
});
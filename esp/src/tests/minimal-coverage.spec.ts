import { test, expect } from "@playwright/test";
import { promises as fs } from "fs";
import path from "path";

/**
 * Minimal coverage collection test - no source mapping during collection
 */
test.describe("Minimal Coverage Collection", () => {
    test("Collect basic V8 coverage", async ({ page }) => {
        console.log("Starting minimal coverage collection...");

        // Start V8 coverage
        await page.coverage.startJSCoverage({
            resetOnNavigation: false,
            reportAnonymousScripts: true
        });

        console.log("Navigating to index.html...");
        await page.goto("index.html");
        await page.waitForLoadState("networkidle");

        // Just check that the page loads
        await expect(page.locator("body")).toBeVisible();
        console.log("Page loaded successfully");

        // Stop coverage and save data
        console.log("Stopping coverage...");
        const coverage = await page.coverage.stopJSCoverage();

        console.log(`Collected coverage for ${coverage.length} JavaScript files`);

        // Save raw V8 coverage data
        const outputDir = ".nyc_output";
        await fs.mkdir(outputDir, { recursive: true });

        const coverageFile = path.join(outputDir, `coverage-${Date.now()}-minimal.json`);
        const coverageData = {
            result: coverage.map(entry => ({
                scriptId: entry.scriptId || "unknown",
                url: entry.url,
                functions: entry.functions
            }))
        };

        await fs.writeFile(coverageFile, JSON.stringify(coverageData, null, 2));
        console.log(`Saved coverage data to: ${coverageFile}`);
        console.log(`Coverage entries: ${coverageData.result.length}`);
    });
});

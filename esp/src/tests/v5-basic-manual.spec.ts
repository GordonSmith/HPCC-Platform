import { test, expect } from "./coverage-fixtures";

test.describe("V5-Basic (Manual Coverage)", () => {
    test("Fine-grained coverage control", async ({ page, coverage }) => {
        // Manual control over coverage
        await coverage.startCoverage();

        await page.goto("index.html");
        await page.waitForLoadState("networkidle");
        await page.evaluate(() => {
            sessionStorage.setItem("ECLWatch:ModernMode-9.0", "false");
        });

        // Stop coverage for navigation
        await coverage.stopCoverage();

        await page.goto("stub.htm");
        await page.waitForLoadState("networkidle");

        // Restart coverage for the actual test
        await coverage.startCoverage();

        await expect(page.locator("#stubStackController_stub_Main span").first()).toBeVisible();
        await expect(page.getByLabel("Advanced")).toBeVisible();

        // Coverage automatically stopped by fixture
    });
});

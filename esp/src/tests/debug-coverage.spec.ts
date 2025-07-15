import { test, expect } from "./coverage-fixtures";

test.describe("Debug Coverage", () => {
    test("Test coverage collection", async ({ autoCoverage: page }) => {
        console.log("Starting coverage test...");

        await page.goto("index.html");
        await page.waitForLoadState("networkidle");

        // Execute some JavaScript to ensure there's something to track
        await page.evaluate(() => {
            console.log("Executing JavaScript in browser");
            // Try to trigger some code execution
            if (window.sessionStorage) {
                window.sessionStorage.setItem("test", "value");
            }
            return true;
        });

        await page.goto("stub.htm");
        await page.waitForLoadState("networkidle");

        // More JavaScript execution
        await page.evaluate(() => {
            console.log("More JavaScript execution");
            const elements = document.querySelectorAll("*");
            console.log(`Found ${elements.length} elements`);
            return elements.length;
        });

        await expect(page.locator("body")).toBeVisible();
        console.log("Coverage test completed");
    });
});

import { test, expect } from "./simple-coverage-fixtures";

test.describe("Simple Coverage Test", () => {
    test("Basic test with simple coverage", async ({ autoCoverage: page }) => {
        await page.goto("index.html");
        await page.waitForLoadState("networkidle");

        // Just check that the page loads - this should generate coverage
        await expect(page.locator("body")).toBeVisible();

        // Navigate to another page to generate more coverage
        await page.goto("stub.htm");
        await page.waitForLoadState("networkidle");

        await expect(page.locator("body")).toBeVisible();
    });
});

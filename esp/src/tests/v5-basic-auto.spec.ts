import { test, expect } from "./coverage-fixtures";

test.describe("V5-Basic (Auto Coverage)", () => {
    test.beforeEach(async ({ autoCoverage: page }) => {
        // Coverage is automatically started
        await page.goto("index.html");
        await page.waitForLoadState("networkidle");
        await page.evaluate(() => {
            sessionStorage.setItem("ECLWatch:ModernMode-9.0", "false");
        });
    });

    // No afterEach needed - coverage is automatically stopped

    test("Basic Frame", async ({ autoCoverage: page }) => {
        await page.goto("stub.htm");
        await page.waitForLoadState("networkidle");
        await expect(page.locator("#stubStackController_stub_Main span").first()).toBeVisible();
        await expect(page.getByLabel("Advanced")).toBeVisible();
    });

    test("Activities", async ({ autoCoverage: page }) => {
        await page.goto("stub.htm");
        await page.waitForLoadState("networkidle");
        await expect(page.locator("#stub_Main-DLStackController_stub_Main-DL_Activity_label")).toBeVisible();
        await expect(page.getByLabel("Auto Refresh")).toBeVisible();
        await expect(page.getByLabel("Maximize/Restore")).toBeVisible();
        await expect(page.locator("i")).toBeVisible();
        await expect(page.locator("svg").filter({ hasText: "%hthor" })).toBeVisible();
        await expect(page.getByRole("img", { name: "Priority" })).toBeVisible();
        await expect(page.getByText("Target/Wuid")).toBeVisible();
        await expect(page.getByText("Graph")).toBeVisible();
        await expect(page.getByText("State")).toBeVisible();
        await expect(page.getByText("Owner")).toBeVisible();
        await expect(page.getByText("Job Name")).toBeVisible();
    });
});

import { test, expect } from "@playwright/test";

test.describe("V9 Navigation and Main Interface", () => {

    test.beforeEach(async ({ page }) => {
        await page.goto("index.html");
        await page.waitForLoadState("networkidle");
    });

    test("Should display main navigation menu with all expected sections", async ({ page }) => {
        // Check main navigation items
        await expect(page.getByRole("button", { name: "Activities" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Workunits" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Files" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Queries" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Topology" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Operations" })).toBeVisible();
    });

    test("Should navigate to Activities page and display activity content", async ({ page }) => {
        await page.getByRole("button", { name: "Activities" }).click();
        await page.waitForLoadState("networkidle");
        
        // Verify we're on the activities page
        await expect(page).toHaveURL(/.*#\/activities/);
        
        // Check for activity-specific elements
        await expect(page.getByText("Target")).toBeVisible();
        await expect(page.getByText("WUID")).toBeVisible();
        await expect(page.getByText("State")).toBeVisible();
    });

    test("Should navigate to Files page and display file browser", async ({ page }) => {
        await page.getByRole("button", { name: "Files" }).click();
        await page.waitForLoadState("networkidle");
        
        // Verify we're on the files page
        await expect(page).toHaveURL(/.*#\/files/);
        
        // Check for file browser elements
        await expect(page.getByText("Name")).toBeVisible();
        await expect(page.getByText("Size")).toBeVisible();
    });

    test("Should navigate to Queries page and display query interface", async ({ page }) => {
        await page.getByRole("button", { name: "Queries" }).click();
        await page.waitForLoadState("networkidle");
        
        // Verify we're on the queries page
        await expect(page).toHaveURL(/.*#\/queries/);
        
        // Check for query-specific elements
        await expect(page.getByText("Query Set")).toBeVisible();
        await expect(page.getByText("Query ID")).toBeVisible();
    });

    test("Should navigate to Topology page and display cluster information", async ({ page }) => {
        await page.getByRole("button", { name: "Topology" }).click();
        await page.waitForLoadState("networkidle");
        
        // Verify we're on the topology page
        await expect(page).toHaveURL(/.*#\/topology/);
        
        // Check for topology elements
        await expect(page.getByText("Type")).toBeVisible();
        await expect(page.getByText("Name")).toBeVisible();
    });

    test("Should navigate between pages using browser back/forward", async ({ page }) => {
        // Start on workunits
        await page.goto("index.html#/workunits");
        await page.waitForLoadState("networkidle");
        
        // Navigate to activities
        await page.getByRole("button", { name: "Activities" }).click();
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(/.*#\/activities/);
        
        // Use browser back
        await page.goBack();
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(/.*#\/workunits/);
        
        // Use browser forward
        await page.goForward();
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(/.*#\/activities/);
    });

    test("Should maintain responsive design on mobile viewport", async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        
        // Check that navigation is still accessible
        await expect(page.getByRole("button", { name: "Activities" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Workunits" })).toBeVisible();
        
        // Navigate and verify it works on mobile
        await page.getByRole("button", { name: "Files" }).click();
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(/.*#\/files/);
    });
});

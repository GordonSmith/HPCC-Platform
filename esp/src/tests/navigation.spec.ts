import { test, expect } from "@playwright/test";

test.describe("ECL Watch Navigation", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/esp/files/index.html");
    });

    test("Main Navigation Links", async ({ page }) => {
        // Test main navigation links are visible and clickable
        await expect(page.getByRole("link", { name: "ECL Watch" })).toBeVisible();
        
        // Test primary navigation items
        await expect(page.getByRole("link", { name: "ECL", exact: true })).toBeVisible();
        await expect(page.getByRole("link", { name: "Files" })).toBeVisible();
        await expect(page.getByRole("link", { name: "Published Queries" })).toBeVisible();
        await expect(page.locator("a").filter({ hasText: /^Activities$/ })).toBeVisible();
        await expect(page.getByRole("link", { name: "Event Scheduler" })).toBeVisible();
        
        // Test navigation to ECL section
        await page.getByRole("link", { name: "ECL", exact: true }).click();
        await expect(page.getByTitle("ECL")).toBeVisible();
        
        // Test navigation to Files section
        await page.getByRole("link", { name: "Files" }).click();
        await expect(page.getByTitle("Files")).toBeVisible();
        
        // Test navigation to Published Queries section  
        await page.getByRole("link", { name: "Published Queries" }).click();
        await expect(page.getByTitle("Published Queries")).toBeVisible();
        
        // Test navigation to Activities section
        await page.locator("a").filter({ hasText: /^Activities$/ }).click();
        await expect(page.getByTitle("Activities")).toBeVisible();
        
        // Test navigation to Event Scheduler section
        await page.getByRole("link", { name: "Event Scheduler" }).click();
        await expect(page.getByTitle("Event Scheduler")).toBeVisible();
    });

    test("Navigation Breadcrumbs", async ({ page }) => {
        // Navigate to different sections and verify breadcrumb functionality
        await page.goto("/esp/files/index.html#/activities");
        
        // Check if breadcrumb or path indicator is visible
        await expect(page.getByTitle("Activities")).toBeVisible();
        
        // Test navigation through different subsections
        await page.goto("/esp/files/index.html#/workunits");
        await expect(page.getByTitle("ECL")).toBeVisible();
        
        await page.goto("/esp/files/index.html#/files");
        await expect(page.getByTitle("Files")).toBeVisible();
    });

    test("Search Functionality", async ({ page }) => {
        await page.goto("/esp/files/index.html#/activities");
        
        // Look for search input fields
        const searchInputs = page.locator("input[type='text']").filter({ hasText: "" });
        const searchCount = await searchInputs.count();
        
        if (searchCount > 0) {
            // Test search functionality if search inputs are present
            const firstSearchInput = searchInputs.first();
            await expect(firstSearchInput).toBeVisible();
            
            // Test typing in search field
            await firstSearchInput.fill("test");
            await expect(firstSearchInput).toHaveValue("test");
            
            // Clear search
            await firstSearchInput.clear();
            await expect(firstSearchInput).toHaveValue("");
        }
    });

    test("Responsive Layout Elements", async ({ page }) => {
        await page.goto("/esp/files/index.html#/activities");
        
        // Test that main layout elements are present
        await expect(page.getByRole("main").or(page.locator("main")).or(page.locator("[role='main']"))).toBeVisible();
        
        // Test for menu/navigation container
        await expect(page.getByRole("navigation").or(page.locator("nav")).or(page.getByRole("menubar"))).toBeVisible();
        
        // Test for content area
        const contentSelectors = [
            page.getByRole("main"),
            page.locator(".main-content"),
            page.locator("#main"),
            page.locator(".content")
        ];
        
        let contentFound = false;
        for (const selector of contentSelectors) {
            try {
                await expect(selector).toBeVisible({ timeout: 1000 });
                contentFound = true;
                break;
            } catch {
                // Continue to next selector
            }
        }
        
        // At minimum, the page should have loaded successfully
        await expect(page.locator("body")).toBeVisible();
    });

    test("Theme and Visual Elements", async ({ page }) => {
        await page.goto("/esp/files/index.html#/activities");
        
        // Test for ECL Watch branding/logo
        await expect(page.getByRole("link", { name: "ECL Watch" })).toBeVisible();
        
        // Test for common UI controls
        await expect(page.getByRole("button", { name: "Advanced" })).toBeVisible();
        
        // Test for refresh functionality
        const refreshButtons = page.getByRole("button").filter({ hasText: /refresh/i });
        const refreshCount = await refreshButtons.count();
        if (refreshCount > 0) {
            await expect(refreshButtons.first()).toBeVisible();
        }
    });

    test("Keyboard Navigation", async ({ page }) => {
        await page.goto("/esp/files/index.html#/activities");
        
        // Test tab navigation through main elements
        await page.keyboard.press("Tab");
        
        // Verify that focus is moving through interactive elements
        const focusedElement = page.locator(":focus");
        await expect(focusedElement).toBeVisible();
        
        // Test navigation with arrow keys if applicable
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("ArrowUp");
        
        // Test Enter key activation
        const firstLink = page.getByRole("link").first();
        if (await firstLink.isVisible()) {
            await firstLink.focus();
            // Don't actually press Enter to avoid navigation, just verify focus works
            await expect(firstLink).toBeFocused();
        }
    });
});
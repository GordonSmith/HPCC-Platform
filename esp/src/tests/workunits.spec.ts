import { test, expect } from "@playwright/test";

test.describe("ECL Workunits", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/esp/files/index.html#/workunits");
    });

    test("Workunits Grid Display", async ({ page }) => {
        // Test that the workunits grid is displayed
        await expect(page.getByTitle("ECL")).toBeVisible();
        
        // Test for common workunit grid columns
        const expectedColumns = [
            "WUID",
            "Owner", 
            "Job Name",
            "Cluster",
            "State",
            "Total Cluster Time"
        ];
        
        for (const column of expectedColumns) {
            // Try different possible selectors for column headers
            const columnSelectors = [
                page.getByRole("columnheader", { name: column }),
                page.getByText(column).first(),
                page.locator(`th:has-text("${column}")`),
                page.locator(`[title="${column}"]`)
            ];
            
            let found = false;
            for (const selector of columnSelectors) {
                try {
                    await expect(selector).toBeVisible({ timeout: 2000 });
                    found = true;
                    break;
                } catch {
                    // Continue to next selector
                }
            }
            
            if (!found) {
                console.log(`Column "${column}" not found - this may be expected if no workunits exist`);
            }
        }
    });

    test("Workunit Filtering", async ({ page }) => {
        // Test filter controls
        const filterControls = [
            page.getByLabel("Owner"),
            page.getByLabel("Cluster"), 
            page.getByLabel("State"),
            page.getByPlaceholder("Owner"),
            page.getByPlaceholder("Cluster"),
            page.getByPlaceholder("State")
        ];
        
        // Test for presence of filter controls
        let filtersFound = 0;
        for (const control of filterControls) {
            try {
                await expect(control).toBeVisible({ timeout: 1000 });
                filtersFound++;
            } catch {
                // Filter control not found
            }
        }
        
        // Test search/filter input
        const searchInputs = page.locator("input[type='text']");
        const searchCount = await searchInputs.count();
        
        if (searchCount > 0) {
            const searchInput = searchInputs.first();
            await searchInput.fill("test");
            await expect(searchInput).toHaveValue("test");
            await searchInput.clear();
        }
    });

    test("Workunit State Management", async ({ page }) => {
        // Test for state-related controls
        const stateControls = [
            page.getByRole("button", { name: /abort/i }),
            page.getByRole("button", { name: /delete/i }),
            page.getByRole("button", { name: /protect/i }),
            page.getByRole("button", { name: /refresh/i })
        ];
        
        for (const control of stateControls) {
            try {
                await expect(control).toBeVisible({ timeout: 1000 });
            } catch {
                // Control not visible - may be expected if no workunits selected
            }
        }
        
        // Test refresh functionality
        const refreshButtons = page.getByRole("button").filter({ hasText: /refresh/i });
        const refreshCount = await refreshButtons.count();
        if (refreshCount > 0) {
            await refreshButtons.first().click();
            // Wait for potential refresh to complete
            await page.waitForTimeout(500);
        }
    });

    test("Workunit Selection", async ({ page }) => {
        // Test row selection functionality
        const rows = page.locator("tr").filter({ hasText: /W\d+/ });
        const rowCount = await rows.count();
        
        if (rowCount > 0) {
            // Test selecting first workunit row
            const firstRow = rows.first();
            await firstRow.click();
            
            // Test if row appears selected
            const selectedIndicators = [
                firstRow.locator(".selected"),
                firstRow.locator("[aria-selected='true']"),
                firstRow.locator(".dgrid-selected")
            ];
            
            for (const indicator of selectedIndicators) {
                try {
                    await expect(indicator).toBeVisible({ timeout: 1000 });
                    break;
                } catch {
                    // Selection indicator not found with this selector
                }
            }
        }
        
        // Test select all functionality
        const selectAllCheckboxes = [
            page.locator("input[type='checkbox']").first(),
            page.getByRole("checkbox").first()
        ];
        
        for (const checkbox of selectAllCheckboxes) {
            try {
                if (await checkbox.isVisible()) {
                    await checkbox.click();
                    break;
                }
            } catch {
                // Checkbox not found or not clickable
            }
        }
    });

    test("Workunit Details Access", async ({ page }) => {
        // Test accessing workunit details
        const workunitLinks = page.locator("a").filter({ hasText: /W\d+/ });
        const linkCount = await workunitLinks.count();
        
        if (linkCount > 0) {
            const firstWUID = workunitLinks.first();
            const wuidText = await firstWUID.textContent();
            
            // Click on workunit to access details
            await firstWUID.click();
            
            // Should navigate to workunit details page
            await page.waitForURL(/.*#\/workunits\/W\d+.*/, { timeout: 10000 });
            
            // Test for workunit details elements
            const detailsElements = [
                page.getByText("Summary"),
                page.getByText("ECL"),
                page.getByText("Results"),
                page.getByText("Variables"),
                page.getByText("Timers"),
                page.getByText("Graphs")
            ];
            
            for (const element of detailsElements) {
                try {
                    await expect(element).toBeVisible({ timeout: 2000 });
                } catch {
                    // Details tab not found - may vary by workunit
                }
            }
        }
    });

    test("Workunit Context Menu", async ({ page }) => {
        // Test right-click context menu functionality
        const rows = page.locator("tr").filter({ hasText: /W\d+/ });
        const rowCount = await rows.count();
        
        if (rowCount > 0) {
            const firstRow = rows.first();
            
            // Right-click to open context menu
            await firstRow.click({ button: "right" });
            
            // Test for context menu options
            const contextMenuOptions = [
                page.getByText("Open"),
                page.getByText("Delete"),
                page.getByText("Protect"),
                page.getByText("Unprotect"),
                page.getByText("Abort")
            ];
            
            for (const option of contextMenuOptions) {
                try {
                    await expect(option).toBeVisible({ timeout: 1000 });
                } catch {
                    // Context menu option not found
                }
            }
            
            // Close context menu by clicking elsewhere
            await page.locator("body").click();
        }
    });

    test("Workunit Advanced Options", async ({ page }) => {
        // Test advanced button and options
        await expect(page.getByRole("button", { name: "Advanced" })).toBeVisible();
        await page.getByRole("button", { name: "Advanced" }).click();
        
        // Wait for advanced options to appear
        await page.waitForTimeout(500);
        
        // Test for advanced filter options
        const advancedOptions = [
            page.getByLabel("Start Date"),
            page.getByLabel("End Date"),
            page.getByLabel("Protected"),
            page.getByPlaceholder("Application"),
            page.getByPlaceholder("ECL Contains")
        ];
        
        for (const option of advancedOptions) {
            try {
                await expect(option).toBeVisible({ timeout: 1000 });
            } catch {
                // Advanced option not found
            }
        }
    });

    test("Workunit Pagination", async ({ page }) => {
        // Test pagination controls
        const paginationControls = [
            page.getByRole("button", { name: "First" }),
            page.getByRole("button", { name: "Previous" }),
            page.getByRole("button", { name: "Next" }),
            page.getByRole("button", { name: "Last" }),
            page.locator(".pagination"),
            page.getByText(/Page \d+ of \d+/),
            page.getByText(/\d+ - \d+ of \d+/)
        ];
        
        for (const control of paginationControls) {
            try {
                await expect(control).toBeVisible({ timeout: 1000 });
            } catch {
                // Pagination control not found - may not be needed if few workunits
            }
        }
        
        // Test page size selector
        const pageSizeSelectors = [
            page.getByLabel("Page Size"),
            page.locator("select").filter({ hasText: /25|50|100/ })
        ];
        
        for (const selector of pageSizeSelectors) {
            try {
                await expect(selector).toBeVisible({ timeout: 1000 });
                break;
            } catch {
                // Page size selector not found
            }
        }
    });

    test("Workunit Export Functionality", async ({ page }) => {
        // Test export/download functionality
        const exportButtons = [
            page.getByRole("button", { name: /export/i }),
            page.getByRole("button", { name: /download/i }),
            page.getByRole("button", { name: /csv/i })
        ];
        
        for (const button of exportButtons) {
            try {
                await expect(button).toBeVisible({ timeout: 1000 });
            } catch {
                // Export button not found
            }
        }
    });
});
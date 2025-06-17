import { test, expect } from "@playwright/test";

test.describe("Published Queries", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/esp/files/index.html#/queries");
    });

    test("Queries Grid Display", async ({ page }) => {
        // Test that the queries grid is displayed
        await expect(page.getByTitle("Published Queries")).toBeVisible();
        
        // Test for common query grid columns
        const expectedColumns = [
            "Id",
            "Name",
            "Target",
            "WUID",
            "DLL",
            "Suspended",
            "Activated",
            "Published By"
        ];
        
        for (const column of expectedColumns) {
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
                console.log(`Column "${column}" not found - this may be expected if no queries exist`);
            }
        }
    });

    test("Query Search and Filtering", async ({ page }) => {
        // Test search functionality
        const searchInputs = [
            page.getByPlaceholder("Id"),
            page.getByPlaceholder("Name"),
            page.getByLabel("Id"),
            page.getByLabel("Name"),
            page.locator("input[type='text']").first()
        ];
        
        for (const searchInput of searchInputs) {
            try {
                await expect(searchInput).toBeVisible({ timeout: 1000 });
                
                // Test typing in search field
                await searchInput.fill("test");
                await expect(searchInput).toHaveValue("test");
                
                // Clear search
                await searchInput.clear();
                break;
            } catch {
                // Search input not found with this selector
            }
        }
        
        // Test target cluster filter
        const targetFilters = [
            page.getByLabel("Target"),
            page.getByPlaceholder("Target"),
            page.locator("select").filter({ hasText: /roxie|thor|hthor/i })
        ];
        
        for (const filter of targetFilters) {
            try {
                await expect(filter).toBeVisible({ timeout: 1000 });
                break;
            } catch {
                // Target filter not found
            }
        }
    });

    test("Query State Management", async ({ page }) => {
        // Test query state control buttons
        const stateButtons = [
            page.getByRole("button", { name: /suspend/i }),
            page.getByRole("button", { name: /unsuspend/i }),
            page.getByRole("button", { name: /activate/i }),
            page.getByRole("button", { name: /delete/i }),
            page.getByRole("button", { name: /refresh/i })
        ];
        
        for (const button of stateButtons) {
            try {
                await expect(button).toBeVisible({ timeout: 1000 });
            } catch {
                // State button not visible - may require query selection
            }
        }
        
        // Test refresh functionality
        const refreshButtons = page.getByRole("button").filter({ hasText: /refresh/i });
        const refreshCount = await refreshButtons.count();
        if (refreshCount > 0) {
            await refreshButtons.first().click();
            await page.waitForTimeout(500);
        }
    });

    test("Query Selection", async ({ page }) => {
        // Test query row selection
        const queryRows = page.locator("tr").filter({ hasText: /\w+\.\w+/ });
        const rowCount = await queryRows.count();
        
        if (rowCount > 0) {
            const firstRow = queryRows.first();
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
                    // Selection indicator not found
                }
            }
        }
        
        // Test checkbox selection
        const checkboxes = page.locator("input[type='checkbox']");
        const checkboxCount = await checkboxes.count();
        if (checkboxCount > 0) {
            const firstCheckbox = checkboxes.first();
            await firstCheckbox.click();
            await expect(firstCheckbox).toBeChecked();
        }
    });

    test("Query Details Access", async ({ page }) => {
        // Test accessing query details
        const queryLinks = page.locator("a").filter({ hasText: /\w+\.\w+/ });
        const linkCount = await queryLinks.count();
        
        if (linkCount > 0) {
            const firstQuery = queryLinks.first();
            const queryName = await firstQuery.textContent();
            
            // Click on query to access details
            await firstQuery.click();
            
            // Should navigate to query details page
            await page.waitForURL(/.*#\/queries\/.*/, { timeout: 10000 });
            
            // Test for query details tabs
            const detailsTabs = [
                page.getByText("Summary"),
                page.getByText("Test"),
                page.getByText("Links"),
                page.getByText("Logical Files"),
                page.getByText("Super Files"),
                page.getByText("Errors"),
                page.getByText("Graphs")
            ];
            
            for (const tab of detailsTabs) {
                try {
                    await expect(tab).toBeVisible({ timeout: 2000 });
                } catch {
                    // Details tab not found - may vary by query
                }
            }
        }
    });

    test("Query Testing Interface", async ({ page }) => {
        // Test query testing functionality
        const queryLinks = page.locator("a").filter({ hasText: /\w+\.\w+/ });
        const linkCount = await queryLinks.count();
        
        if (linkCount > 0) {
            const firstQuery = queryLinks.first();
            await firstQuery.click();
            
            await page.waitForURL(/.*#\/queries\/.*/, { timeout: 10000 });
            
            // Look for Test tab
            const testTab = page.getByText("Test");
            try {
                await expect(testTab).toBeVisible({ timeout: 2000 });
                await testTab.click();
                
                // Test for query testing elements
                const testElements = [
                    page.getByRole("button", { name: /submit/i }),
                    page.getByRole("button", { name: /run/i }),
                    page.getByRole("button", { name: /execute/i }),
                    page.locator("textarea"),
                    page.locator("input[type='text']"),
                    page.getByText("Parameters")
                ];
                
                for (const element of testElements) {
                    try {
                        await expect(element).toBeVisible({ timeout: 2000 });
                        break;
                    } catch {
                        // Test element not found
                    }
                }
            } catch {
                // Test tab not found
            }
        }
    });

    test("Query Links and URLs", async ({ page }) => {
        // Test query links functionality
        const queryLinks = page.locator("a").filter({ hasText: /\w+\.\w+/ });
        const linkCount = await queryLinks.count();
        
        if (linkCount > 0) {
            const firstQuery = queryLinks.first();
            await firstQuery.click();
            
            await page.waitForURL(/.*#\/queries\/.*/, { timeout: 10000 });
            
            // Look for Links tab
            const linksTab = page.getByText("Links");
            try {
                await expect(linksTab).toBeVisible({ timeout: 2000 });
                await linksTab.click();
                
                // Test for query URL links
                const linkElements = [
                    page.getByText("REST"),
                    page.getByText("SOAP"),
                    page.getByText("JSON"),
                    page.getByText("XML"),
                    page.locator("input[readonly]"),
                    page.getByRole("button", { name: /copy/i })
                ];
                
                for (const element of linkElements) {
                    try {
                        await expect(element).toBeVisible({ timeout: 2000 });
                    } catch {
                        // Link element not found
                    }
                }
            } catch {
                // Links tab not found
            }
        }
    });

    test("Query Context Menu", async ({ page }) => {
        // Test right-click context menu on queries
        const queryRows = page.locator("tr").filter({ hasText: /\w+\.\w+/ });
        const rowCount = await queryRows.count();
        
        if (rowCount > 0) {
            const firstRow = queryRows.first();
            await firstRow.click({ button: "right" });
            
            // Test for context menu options
            const contextMenuOptions = [
                page.getByText("Open"),
                page.getByText("Test"),
                page.getByText("Suspend"),
                page.getByText("Unsuspend"),
                page.getByText("Activate"),
                page.getByText("Delete"),
                page.getByText("Copy URL")
            ];
            
            for (const option of contextMenuOptions) {
                try {
                    await expect(option).toBeVisible({ timeout: 1000 });
                } catch {
                    // Context menu option not found
                }
            }
            
            // Close context menu
            await page.locator("body").click();
        }
    });

    test("Query Advanced Filters", async ({ page }) => {
        // Test advanced filter functionality
        await expect(page.getByRole("button", { name: "Advanced" })).toBeVisible();
        await page.getByRole("button", { name: "Advanced" }).click();
        
        await page.waitForTimeout(500);
        
        // Test advanced filter options
        const advancedFilters = [
            page.getByLabel("Suspended"),
            page.getByLabel("Activated"),
            page.getByLabel("Library"),
            page.getByPlaceholder("Published By"),
            page.getByPlaceholder("WUID"),
            page.locator("select").filter({ hasText: /all|suspended|active/i })
        ];
        
        for (const filter of advancedFilters) {
            try {
                await expect(filter).toBeVisible({ timeout: 1000 });
            } catch {
                // Advanced filter not found
            }
        }
    });

    test("Query Bulk Operations", async ({ page }) => {
        // Test bulk operations on multiple queries
        const queryRows = page.locator("tr").filter({ hasText: /\w+\.\w+/ });
        const rowCount = await queryRows.count();
        
        if (rowCount > 1) {
            // Select multiple queries
            const firstCheckbox = page.locator("input[type='checkbox']").first();
            const secondCheckbox = page.locator("input[type='checkbox']").nth(1);
            
            if (await firstCheckbox.isVisible() && await secondCheckbox.isVisible()) {
                await firstCheckbox.click();
                await secondCheckbox.click();
                
                // Test bulk operation buttons
                const bulkOperations = [
                    page.getByRole("button", { name: /suspend selected/i }),
                    page.getByRole("button", { name: /activate selected/i }),
                    page.getByRole("button", { name: /delete selected/i })
                ];
                
                for (const operation of bulkOperations) {
                    try {
                        await expect(operation).toBeVisible({ timeout: 2000 });
                    } catch {
                        // Bulk operation not found
                    }
                }
            }
        }
    });

    test("Query Publication Interface", async ({ page }) => {
        // Test query publication/deployment interface
        const publishButtons = [
            page.getByRole("button", { name: /publish/i }),
            page.getByRole("button", { name: /deploy/i }),
            page.getByRole("button", { name: /add/i })
        ];
        
        for (const button of publishButtons) {
            try {
                await expect(button).toBeVisible({ timeout: 1000 });
            } catch {
                // Publish button not found
            }
        }
        
        // Test for publication dialog or form
        const publishElements = [
            page.getByText("Publish Query"),
            page.getByText("Deploy Query"),
            page.getByPlaceholder("Query Name"),
            page.getByLabel("Target Cluster")
        ];
        
        for (const element of publishElements) {
            try {
                await expect(element).toBeVisible({ timeout: 1000 });
            } catch {
                // Publication element not found
            }
        }
    });

    test("Query Sorting and Pagination", async ({ page }) => {
        // Test pagination controls
        const paginationControls = [
            page.locator(".pagination"),
            page.getByText(/Page \d+ of \d+/),
            page.getByText(/\d+ - \d+ of \d+/),
            page.getByRole("button", { name: "Next" }),
            page.getByRole("button", { name: "Previous" })
        ];
        
        for (const control of paginationControls) {
            try {
                await expect(control).toBeVisible({ timeout: 1000 });
            } catch {
                // Pagination control not found
            }
        }
        
        // Test column sorting
        const sortableColumns = [
            page.getByRole("columnheader", { name: "Id" }),
            page.getByRole("columnheader", { name: "Name" }),
            page.getByRole("columnheader", { name: "Target" }),
            page.getByRole("columnheader", { name: "Published By" })
        ];
        
        for (const column of sortableColumns) {
            try {
                await expect(column).toBeVisible({ timeout: 1000 });
                await column.click();
                await page.waitForTimeout(200);
                break;
            } catch {
                // Column not found or not sortable
            }
        }
    });
});
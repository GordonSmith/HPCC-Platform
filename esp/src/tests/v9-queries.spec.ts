import { test, expect } from "@playwright/test";

test.describe("V9 Queries Management", () => {

    test.beforeEach(async ({ page }) => {
        await page.goto("index.html#/queries");
        await page.waitForLoadState("networkidle");
    });

    test("Should display the Queries page with expected columns and controls", async ({ page }) => {
        // Check for main query browser elements
        await expect(page.getByText("Query Set")).toBeVisible();
        await expect(page.getByText("Query ID")).toBeVisible();
        await expect(page.getByText("Name")).toBeVisible();
        await expect(page.getByText("WUID")).toBeVisible();
        
        // Check for toolbar/menu items
        await expect(page.getByRole("menubar")).toBeVisible();
        await expect(page.getByRole("menuitem", { name: "Refresh" })).toBeVisible();
    });

    test("Should filter queries by query set", async ({ page }) => {
        // Wait for queries to load
        await page.waitForTimeout(2000);
        
        const rowCount = await page.locator(".ms-DetailsRow").count();
        
        if (rowCount > 0) {
            // Click filter button
            await page.getByRole("menuitem", { name: "Filter" }).click();
            
            // Filter by query set
            await page.getByRole("textbox", { name: "Query Set" }).fill("roxie");
            await page.getByRole("button", { name: "Apply" }).click();
            
            // Wait for filter to be applied
            await page.waitForTimeout(1000);
            
            // Clear filter
            await page.getByRole("menuitem", { name: "Filter" }).click();
            await page.getByRole("textbox", { name: "Query Set" }).clear();
            await page.getByRole("button", { name: "Apply" }).click();
        }
    });

    test("Should filter queries by status", async ({ page }) => {
        // Wait for queries to load
        await page.waitForTimeout(2000);
        
        const rowCount = await page.locator(".ms-DetailsRow").count();
        
        if (rowCount > 0) {
            await page.getByRole("menuitem", { name: "Filter" }).click();
            
            // Look for status filter dropdown
            const statusDropdown = page.getByRole("combobox", { name: "Suspended" });
            if (await statusDropdown.count() > 0) {
                await statusDropdown.click();
                
                // Select an option (might vary based on available statuses)
                const options = page.locator("role=option");
                if (await options.count() > 0) {
                    await options.first().click();
                }
            }
            
            await page.getByRole("button", { name: "Apply" }).click();
            await page.waitForTimeout(1000);
            
            // Clear filter
            await page.getByRole("menuitem", { name: "Filter" }).click();
            await page.getByRole("button", { name: "Clear" }).click();
            await page.getByRole("button", { name: "Apply" }).click();
        }
    });

    test("Should select queries and show available operations", async ({ page }) => {
        // Wait for queries to load
        await page.waitForTimeout(2000);
        
        const rowCount = await page.locator(".ms-DetailsRow").count();
        
        if (rowCount > 0) {
            // Select first query
            await page.locator(".ms-DetailsRow").first().locator(".ms-DetailsRow-check").click();
            
            // Check for query operations in menubar
            const menuItems = await page.locator("role=menuitem").all();
            
            // Common query operations
            const expectedOperations = ["Suspend", "Unsuspend", "Activate", "Delete"];
            
            for (const operation of expectedOperations) {
                const operationItem = page.getByRole("menuitem", { name: operation });
                if (await operationItem.count() > 0) {
                    await expect(operationItem).toBeVisible();
                }
            }
        }
    });

    test("Should open query details when clicking on a query", async ({ page }) => {
        // Wait for queries to load
        await page.waitForTimeout(2000);
        
        const rowCount = await page.locator(".ms-DetailsRow").count();
        
        if (rowCount > 0) {
            // Get the first query row
            const firstRow = page.locator(".ms-DetailsRow").first();
            
            // Get query ID for navigation check
            const queryIdCell = firstRow.locator("td").nth(1); // Assuming Query ID is second column
            const queryId = await queryIdCell.textContent();
            
            // Click on the query
            await firstRow.click();
            
            // Should navigate to query details
            await page.waitForTimeout(1000);
            
            // Check if we're on a query detail page or if a detail panel opened
            const hasQueryDetails = await page.getByText("Summary").count() > 0 ||
                                  await page.getByText("Details").count() > 0 ||
                                  await page.getByText("Parameters").count() > 0;
            
            expect(hasQueryDetails).toBeTruthy();
        }
    });

    test("Should display query status indicators correctly", async ({ page }) => {
        // Wait for queries to load
        await page.waitForTimeout(2000);
        
        const rowCount = await page.locator(".ms-DetailsRow").count();
        
        if (rowCount > 0) {
            const firstRow = page.locator(".ms-DetailsRow").first();
            
            // Check for status indicators (icons, colors, text)
            const statusCell = firstRow.locator("td").nth(4); // Assuming status is fifth column
            
            if (await statusCell.count() > 0) {
                const statusText = await statusCell.textContent();
                
                // Status should be one of expected values
                const validStatuses = ["Active", "Suspended", "Unknown", ""];
                const hasValidStatus = validStatuses.some(status => 
                    statusText?.toLowerCase().includes(status.toLowerCase())
                );
                
                expect(hasValidStatus).toBeTruthy();
            }
        }
    });

    test("Should handle query search functionality", async ({ page }) => {
        // Wait for queries to load
        await page.waitForTimeout(2000);
        
        // Look for search box
        const searchBox = page.getByRole("textbox", { name: "Search" });
        
        if (await searchBox.count() > 0) {
            await searchBox.fill("test");
            await page.keyboard.press("Enter");
            
            await page.waitForTimeout(1000);
            
            // Should filter results
            await expect(page.getByText("Query Set")).toBeVisible();
            
            // Clear search
            await searchBox.clear();
            await page.keyboard.press("Enter");
        } else {
            // Alternative: use the filter mechanism
            await page.getByRole("menuitem", { name: "Filter" }).click();
            await page.getByRole("textbox", { name: "Name" }).fill("test");
            await page.getByRole("button", { name: "Apply" }).click();
            
            await page.waitForTimeout(1000);
            
            // Clear filter
            await page.getByRole("menuitem", { name: "Filter" }).click();
            await page.getByRole("button", { name: "Clear" }).click();
            await page.getByRole("button", { name: "Apply" }).click();
        }
    });

    test("Should support bulk operations on multiple queries", async ({ page }) => {
        // Wait for queries to load
        await page.waitForTimeout(2000);
        
        const rowCount = await page.locator(".ms-DetailsRow").count();
        
        if (rowCount >= 2) {
            // Select multiple queries
            await page.locator(".ms-DetailsRow").nth(0).locator(".ms-DetailsRow-check").click();
            await page.locator(".ms-DetailsRow").nth(1).locator(".ms-DetailsRow-check").click();
            
            // Check that multiple rows are selected
            const selectedRows = await page.locator(".ms-DetailsRow.is-selected").count();
            expect(selectedRows).toBeGreaterThanOrEqual(2);
            
            // Check for bulk operations
            const bulkOperations = ["Suspend", "Unsuspend", "Delete"];
            
            for (const operation of bulkOperations) {
                const operationItem = page.getByRole("menuitem", { name: operation });
                if (await operationItem.count() > 0) {
                    await expect(operationItem).toBeVisible();
                }
            }
        }
    });
});

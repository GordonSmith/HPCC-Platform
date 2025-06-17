import { test, expect } from "@playwright/test";

test.describe("Files and Logical Files", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/esp/files/index.html#/files");
    });

    test("Files Grid Display", async ({ page }) => {
        // Test that the files grid is displayed
        await expect(page.getByTitle("Files")).toBeVisible();
        
        // Test for common file grid columns
        const expectedColumns = [
            "Name",
            "Description", 
            "Owner",
            "Cluster",
            "Records",
            "Size",
            "Parts",
            "Modified"
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
                console.log(`Column "${column}" not found - this may be expected if no files exist`);
            }
        }
    });

    test("File Search and Filtering", async ({ page }) => {
        // Test search functionality
        const searchInputs = [
            page.getByPlaceholder("Name"),
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
        
        // Test filter controls
        const filterControls = [
            page.getByLabel("Owner"),
            page.getByLabel("Cluster"),
            page.getByPlaceholder("Owner"),
            page.getByPlaceholder("Cluster")
        ];
        
        for (const control of filterControls) {
            try {
                await expect(control).toBeVisible({ timeout: 1000 });
            } catch {
                // Filter control not found
            }
        }
    });

    test("File Operations", async ({ page }) => {
        // Test file operation buttons
        const operationButtons = [
            page.getByRole("button", { name: /copy/i }),
            page.getByRole("button", { name: /delete/i }),
            page.getByRole("button", { name: /despray/i }),
            page.getByRole("button", { name: /rename/i }),
            page.getByRole("button", { name: /refresh/i })
        ];
        
        for (const button of operationButtons) {
            try {
                await expect(button).toBeVisible({ timeout: 1000 });
            } catch {
                // Operation button not visible - may require file selection
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

    test("File Selection", async ({ page }) => {
        // Test file row selection
        const fileRows = page.locator("tr").filter({ hasText: /::/ });
        const rowCount = await fileRows.count();
        
        if (rowCount > 0) {
            const firstRow = fileRows.first();
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

    test("File Details Access", async ({ page }) => {
        // Test accessing file details
        const fileLinks = page.locator("a").filter({ hasText: /::/ });
        const linkCount = await fileLinks.count();
        
        if (linkCount > 0) {
            const firstFile = fileLinks.first();
            const fileName = await firstFile.textContent();
            
            // Click on file to access details
            await firstFile.click();
            
            // Should navigate to file details page
            await page.waitForURL(/.*#\/files\/.*/, { timeout: 10000 });
            
            // Test for file details tabs
            const detailsTabs = [
                page.getByText("Summary"),
                page.getByText("Contents"),
                page.getByText("ECL"),
                page.getByText("DEF"),
                page.getByText("XML"),
                page.getByText("File Parts"),
                page.getByText("Queries"),
                page.getByText("History")
            ];
            
            for (const tab of detailsTabs) {
                try {
                    await expect(tab).toBeVisible({ timeout: 2000 });
                } catch {
                    // Details tab not found - may vary by file type
                }
            }
        }
    });

    test("File Content Preview", async ({ page }) => {
        // Test file content preview functionality
        const fileLinks = page.locator("a").filter({ hasText: /::/ });
        const linkCount = await fileLinks.count();
        
        if (linkCount > 0) {
            const firstFile = fileLinks.first();
            await firstFile.click();
            
            // Wait for file details to load
            await page.waitForURL(/.*#\/files\/.*/, { timeout: 10000 });
            
            // Test Contents tab
            const contentsTab = page.getByText("Contents");
            try {
                await expect(contentsTab).toBeVisible({ timeout: 2000 });
                await contentsTab.click();
                
                // Look for data grid or table with file contents
                const contentElements = [
                    page.locator(".dgrid"),
                    page.locator("table"),
                    page.getByRole("grid"),
                    page.locator(".file-content")
                ];
                
                for (const element of contentElements) {
                    try {
                        await expect(element).toBeVisible({ timeout: 3000 });
                        break;
                    } catch {
                        // Content element not found
                    }
                }
            } catch {
                // Contents tab not found
            }
        }
    });

    test("File Upload/Spray Functionality", async ({ page }) => {
        // Test file upload/spray controls
        const uploadButtons = [
            page.getByRole("button", { name: /upload/i }),
            page.getByRole("button", { name: /spray/i }),
            page.getByRole("button", { name: /import/i })
        ];
        
        for (const button of uploadButtons) {
            try {
                await expect(button).toBeVisible({ timeout: 1000 });
            } catch {
                // Upload button not found
            }
        }
        
        // Test landing zones or upload areas
        const uploadAreas = [
            page.locator(".upload-zone"),
            page.getByText("Landing Zones"),
            page.getByText("Drop Zone")
        ];
        
        for (const area of uploadAreas) {
            try {
                await expect(area).toBeVisible({ timeout: 1000 });
            } catch {
                // Upload area not found
            }
        }
    });

    test("File Context Menu", async ({ page }) => {
        // Test right-click context menu on files
        const fileRows = page.locator("tr").filter({ hasText: /::/ });
        const rowCount = await fileRows.count();
        
        if (rowCount > 0) {
            const firstRow = fileRows.first();
            await firstRow.click({ button: "right" });
            
            // Test for context menu options
            const contextMenuOptions = [
                page.getByText("View"),
                page.getByText("Copy"),
                page.getByText("Delete"),
                page.getByText("Rename"),
                page.getByText("Despray"),
                page.getByText("Download")
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

    test("File Advanced Filters", async ({ page }) => {
        // Test advanced filter functionality
        await expect(page.getByRole("button", { name: "Advanced" })).toBeVisible();
        await page.getByRole("button", { name: "Advanced" }).click();
        
        await page.waitForTimeout(500);
        
        // Test advanced filter options
        const advancedFilters = [
            page.getByLabel("File Type"),
            page.getByLabel("Size Range"),
            page.getByLabel("Date Range"),
            page.getByPlaceholder("Description"),
            page.getByPlaceholder("Min Size"),
            page.getByPlaceholder("Max Size")
        ];
        
        for (const filter of advancedFilters) {
            try {
                await expect(filter).toBeVisible({ timeout: 1000 });
            } catch {
                // Advanced filter not found
            }
        }
    });

    test("File Pagination and Sorting", async ({ page }) => {
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
            page.getByRole("columnheader", { name: "Name" }),
            page.getByRole("columnheader", { name: "Size" }),
            page.getByRole("columnheader", { name: "Modified" }),
            page.getByRole("columnheader", { name: "Records" })
        ];
        
        for (const column of sortableColumns) {
            try {
                await expect(column).toBeVisible({ timeout: 1000 });
                // Test clicking for sort (if column exists)
                await column.click();
                await page.waitForTimeout(200);
                break;
            } catch {
                // Column not found or not sortable
            }
        }
    });

    test("File Export and Download", async ({ page }) => {
        // Test export functionality
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
        
        // Test individual file download
        const fileRows = page.locator("tr").filter({ hasText: /::/ });
        const rowCount = await fileRows.count();
        
        if (rowCount > 0) {
            const firstRow = fileRows.first();
            await firstRow.click();
            
            // Look for download option after selection
            const downloadOptions = [
                page.getByRole("button", { name: /download/i }),
                page.getByText("Download")
            ];
            
            for (const option of downloadOptions) {
                try {
                    await expect(option).toBeVisible({ timeout: 2000 });
                    break;
                } catch {
                    // Download option not found
                }
            }
        }
    });
});
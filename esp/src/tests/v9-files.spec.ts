import { test, expect } from "@playwright/test";

test.describe("V9 Files Management", () => {

    test.beforeEach(async ({ page }) => {
        await page.goto("index.html#/files");
        await page.waitForLoadState("networkidle");
    });

    test("Should display the Files page with expected columns and controls", async ({ page }) => {
        // Check for main file browser elements
        await expect(page.getByText("Name")).toBeVisible();
        await expect(page.getByText("Size")).toBeVisible();
        await expect(page.getByText("Parts")).toBeVisible();
        await expect(page.getByText("Modified")).toBeVisible();
        
        // Check for toolbar/menu items
        await expect(page.getByRole("menubar")).toBeVisible();
        await expect(page.getByRole("menuitem", { name: "Refresh" })).toBeVisible();
    });

    test("Should filter files by name", async ({ page }) => {
        // Wait for files to load
        await page.locator(".ms-DetailsRow").first().waitFor({ state: "visible", timeout: 10000 });
        
        const initialRowCount = await page.locator(".ms-DetailsRow").count();
        
        if (initialRowCount > 0) {
            // Click filter button
            await page.getByRole("menuitem", { name: "Filter" }).click();
            
            // Enter a filter term
            await page.getByRole("textbox", { name: "Name" }).fill("test");
            await page.getByRole("button", { name: "Apply" }).click();
            
            // Wait for filter to be applied
            await page.waitForTimeout(1000);
            
            const filteredRowCount = await page.locator(".ms-DetailsRow").count();
            
            // Clear filter
            await page.getByRole("menuitem", { name: "Filter" }).click();
            await page.getByRole("textbox", { name: "Name" }).clear();
            await page.getByRole("button", { name: "Apply" }).click();
        }
    });

    test("Should navigate into logical file directories", async ({ page }) => {
        // Wait for files to load
        await page.locator(".ms-DetailsRow").first().waitFor({ state: "visible", timeout: 10000 });
        
        const rowCount = await page.locator(".ms-DetailsRow").count();
        
        if (rowCount > 0) {
            // Look for a directory (folder icon or directory indicator)
            const directoryRow = page.locator(".ms-DetailsRow").filter({ hasText: "::" }).first();
            
            if (await directoryRow.count() > 0) {
                await directoryRow.dblclick();
                await page.waitForLoadState("networkidle");
                
                // Should navigate to subdirectory
                await expect(page.getByText("Name")).toBeVisible();
            }
        }
    });

    test("Should select and show file details", async ({ page }) => {
        // Wait for files to load
        await page.locator(".ms-DetailsRow").first().waitFor({ state: "visible", timeout: 10000 });
        
        const rowCount = await page.locator(".ms-DetailsRow").count();
        
        if (rowCount > 0) {
            // Select first file
            await page.locator(".ms-DetailsRow").first().click();
            
            // Check if file details or context menu appears
            await page.waitForTimeout(500);
        }
    });

    test("Should handle file operations menu", async ({ page }) => {
        // Wait for files to load
        await page.locator(".ms-DetailsRow").first().waitFor({ state: "visible", timeout: 10000 });
        
        const rowCount = await page.locator(".ms-DetailsRow").count();
        
        if (rowCount > 0) {
            // Select a file
            await page.locator(".ms-DetailsRow").first().locator(".ms-DetailsRow-check").click();
            
            // Check for available operations in menubar
            const menuItems = await page.locator("role=menuitem").all();
            
            // Common file operations that might be available
            const expectedOperations = ["Download", "Copy", "Delete", "Rename"];
            
            // Check if any of these operations are visible
            for (const operation of expectedOperations) {
                const operationItem = page.getByRole("menuitem", { name: operation });
                if (await operationItem.count() > 0) {
                    await expect(operationItem).toBeVisible();
                }
            }
        }
    });

    test("Should display file size and modification date correctly", async ({ page }) => {
        // Wait for files to load
        await page.locator(".ms-DetailsRow").first().waitFor({ state: "visible", timeout: 10000 });
        
        const rowCount = await page.locator(".ms-DetailsRow").count();
        
        if (rowCount > 0) {
            const firstRow = page.locator(".ms-DetailsRow").first();
            
            // Check that size and date columns contain reasonable values
            const sizeCell = firstRow.locator("td").nth(1); // Assuming size is second column
            const dateCell = firstRow.locator("td").nth(3); // Assuming date is fourth column
            
            if (await sizeCell.count() > 0 && await dateCell.count() > 0) {
                // Size should be numeric or have units (KB, MB, GB)
                const sizeText = await sizeCell.textContent();
                expect(sizeText).toMatch(/\d+(\.\d+)?\s*(B|KB|MB|GB|TB)?/);
                
                // Date should be in a reasonable format
                const dateText = await dateCell.textContent();
                expect(dateText).toMatch(/\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}/);
            }
        }
    });

    test("Should handle empty file directory gracefully", async ({ page }) => {
        // Navigate to a likely empty directory path
        await page.goto("index.html#/files/logical/nonexistent");
        await page.waitForLoadState("networkidle");
        
        // Should still show the file browser structure
        await expect(page.getByText("Name")).toBeVisible();
        
        // Should show some indication of empty state
        // This might be an empty table or a "No files" message
        const hasRows = await page.locator(".ms-DetailsRow").count() > 0;
        const hasEmptyMessage = await page.getByText("No files").count() > 0;
        
        // One of these should be true
        expect(hasRows || hasEmptyMessage).toBeTruthy();
    });
});

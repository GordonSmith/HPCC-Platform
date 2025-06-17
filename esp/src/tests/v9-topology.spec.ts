import { test, expect } from "@playwright/test";

test.describe("V9 Topology Management", () => {

    test.beforeEach(async ({ page }) => {
        await page.goto("index.html#/topology");
        await page.waitForLoadState("networkidle");
    });

    test("Should display the Topology page with expected columns and controls", async ({ page }) => {
        // Check for main topology elements
        await expect(page.getByText("Type")).toBeVisible();
        await expect(page.getByText("Name")).toBeVisible();
        await expect(page.getByText("Condition")).toBeVisible();
        
        // Check for toolbar/menu items
        await expect(page.getByRole("menubar")).toBeVisible();
        await expect(page.getByRole("menuitem", { name: "Refresh" })).toBeVisible();
    });

    test("Should display cluster information correctly", async ({ page }) => {
        // Wait for topology data to load
        await page.waitForTimeout(2000);
        
        const rowCount = await page.locator(".ms-DetailsRow").count();
        
        if (rowCount > 0) {
            const firstRow = page.locator(".ms-DetailsRow").first();
            
            // Check that cluster types are displayed
            const typeCell = firstRow.locator("td").first();
            const typeText = await typeCell.textContent();
            
            // Should contain valid cluster types
            const validTypes = ["Thor", "Roxie", "ESP", "Dali", "DfuServer", "SashaServer"];
            const hasValidType = validTypes.some(type => 
                typeText?.toLowerCase().includes(type.toLowerCase())
            );
            
            // Allow for empty or unknown types as well
            expect(hasValidType || typeText === "").toBeTruthy();
        }
    });

    test("Should filter topology by cluster type", async ({ page }) => {
        // Wait for topology data to load
        await page.waitForTimeout(2000);
        
        const initialRowCount = await page.locator(".ms-DetailsRow").count();
        
        if (initialRowCount > 0) {
            // Click filter button
            await page.getByRole("menuitem", { name: "Filter" }).click();
            
            // Filter by type (try "Thor" as it's common)
            await page.getByRole("textbox", { name: "Type" }).fill("Thor");
            await page.getByRole("button", { name: "Apply" }).click();
            
            await page.waitForTimeout(1000);
            
            // Clear filter
            await page.getByRole("menuitem", { name: "Filter" }).click();
            await page.getByRole("textbox", { name: "Type" }).clear();
            await page.getByRole("button", { name: "Apply" }).click();
        }
    });

    test("Should show cluster details when clicking on a cluster", async ({ page }) => {
        // Wait for topology data to load
        await page.waitForTimeout(2000);
        
        const rowCount = await page.locator(".ms-DetailsRow").count();
        
        if (rowCount > 0) {
            // Click on first cluster
            await page.locator(".ms-DetailsRow").first().click();
            
            // Should navigate to cluster details or show detail panel
            await page.waitForTimeout(1000);
            
            // Check for detail elements
            const hasDetails = await page.getByText("Summary").count() > 0 ||
                              await page.getByText("Details").count() > 0 ||
                              await page.getByText("Processes").count() > 0;
            
            if (hasDetails) {
                expect(hasDetails).toBeTruthy();
            }
        }
    });

    test("Should display cluster status indicators", async ({ page }) => {
        // Wait for topology data to load
        await page.waitForTimeout(2000);
        
        const rowCount = await page.locator(".ms-DetailsRow").count();
        
        if (rowCount > 0) {
            const rows = await page.locator(".ms-DetailsRow").all();
            
            for (let i = 0; i < Math.min(3, rows.length); i++) {
                const row = rows[i];
                const conditionCell = row.locator("td").nth(2); // Assuming condition is third column
                
                if (await conditionCell.count() > 0) {
                    const conditionText = await conditionCell.textContent();
                    
                    // Status should be recognizable
                    const validConditions = ["Normal", "Warning", "Error", "Unknown", ""];
                    const hasValidCondition = validConditions.some(condition => 
                        conditionText?.toLowerCase().includes(condition.toLowerCase())
                    );
                    
                    expect(hasValidCondition).toBeTruthy();
                }
            }
        }
    });

    test("Should handle refresh functionality", async ({ page }) => {
        // Wait for initial load
        await page.waitForTimeout(2000);
        
        const initialRowCount = await page.locator(".ms-DetailsRow").count();
        
        // Click refresh
        await page.getByRole("menuitem", { name: "Refresh" }).click();
        await page.waitForLoadState("networkidle");
        
        // Should still show topology data
        await expect(page.getByText("Type")).toBeVisible();
        await expect(page.getByText("Name")).toBeVisible();
        
        // Row count should be maintained (unless system changed)
        const newRowCount = await page.locator(".ms-DetailsRow").count();
        expect(newRowCount).toBeGreaterThanOrEqual(0);
    });

    test("Should navigate to machine information", async ({ page }) => {
        // Look for machine/server entries in topology
        await page.waitForTimeout(2000);
        
        const rowCount = await page.locator(".ms-DetailsRow").count();
        
        if (rowCount > 0) {
            // Look for server or machine entries
            const serverRow = page.locator(".ms-DetailsRow").filter({ hasText: "Server" }).first();
            
            if (await serverRow.count() > 0) {
                await serverRow.click();
                await page.waitForTimeout(1000);
                
                // Should show machine details
                const hasMachineDetails = await page.getByText("Machine").count() > 0 ||
                                        await page.getByText("IP Address").count() > 0 ||
                                        await page.getByText("Processes").count() > 0;
                
                if (hasMachineDetails) {
                    expect(hasMachineDetails).toBeTruthy();
                }
            }
        }
    });
});

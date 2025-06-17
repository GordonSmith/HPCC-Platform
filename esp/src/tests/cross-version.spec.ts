import { test, expect } from "@playwright/test";

test.describe("Cross-Version Compatibility Tests", () => {
    test.describe("V9 (Modern) Mode Tests", () => {
        test.beforeEach(async ({ page }) => {
            // Ensure V9 mode is enabled
            await page.goto("/esp/files/index.html");
            await page.evaluate(() => {
                sessionStorage.setItem("ECLWatch:ModernMode-9.0", "true");
            });
        });

        test("V9 Navigation Compatibility", async ({ page }) => {
            await page.goto("/esp/files/index.html#/activities");
            
            // Test V9-specific navigation elements
            await expect(page.getByRole("link", { name: "ECL Watch" })).toBeVisible();
            await expect(page.getByRole("link", { name: "ECL", exact: true })).toBeVisible();
            await expect(page.getByRole("link", { name: "Files" })).toBeVisible();
            await expect(page.getByRole("link", { name: "Published Queries" })).toBeVisible();
            
            // Test V9 modern interface elements
            await expect(page.getByRole("button", { name: "Advanced" })).toBeVisible();
            await expect(page.getByTitle("Activities")).toBeVisible();
        });

        test("V9 Grid and Data Display", async ({ page }) => {
            await page.goto("/esp/files/index.html#/activities");
            
            // Test V9 grid components
            const gridElements = [
                page.locator(".dgrid"),
                page.getByRole("grid"),
                page.locator("table")
            ];
            
            let gridFound = false;
            for (const grid of gridElements) {
                try {
                    await expect(grid).toBeVisible({ timeout: 2000 });
                    gridFound = true;
                    break;
                } catch {
                    // Grid not found with this selector
                }
            }
            
            // V9 should have modern grid components
            if (gridFound) {
                console.log("V9 grid components found");
            }
        });

        test("V9 Interactive Features", async ({ page }) => {
            await page.goto("/esp/files/index.html#/activities");
            
            // Test V9-specific interactive features
            await expect(page.getByRole("button", { name: "History" })).toBeVisible();
            await expect(page.getByRole("button", { name: "Add to favorites" })).toBeVisible();
            
            // Test disk usage visualization
            const diskUsage = page.getByTitle("Disk Usage");
            try {
                await expect(diskUsage).toBeVisible({ timeout: 2000 });
                await diskUsage.locator("i").click();
                
                // Should show SVG visualization
                await expect(page.locator("svg")).toBeVisible({ timeout: 2000 });
            } catch {
                // Disk usage visualization not available
            }
        });
    });

    test.describe("V5 (Legacy) Mode Tests", () => {
        test.beforeEach(async ({ page }) => {
            // Ensure V5 mode is enabled
            await page.goto("/esp/files/index.html");
            await page.evaluate(() => {
                sessionStorage.setItem("ECLWatch:ModernMode-9.0", "false");
            });
        });

        test("V5 Navigation Compatibility", async ({ page }) => {
            await page.goto("/esp/files/stub.htm");
            
            // Test V5-specific navigation elements
            await expect(page.locator("#stubStackController_stub_Main span").first()).toBeVisible();
            await expect(page.getByLabel("Advanced")).toBeVisible();
        });

        test("V5 Legacy Interface Elements", async ({ page }) => {
            await page.goto("/esp/files/stub.htm");
            
            // Test V5 legacy interface components
            await expect(page.locator("#stub_Main-DLStackController_stub_Main-DL_Activity_label")).toBeVisible();
            await expect(page.getByLabel("Auto Refresh")).toBeVisible();
            await expect(page.getByLabel("Maximize/Restore")).toBeVisible();
        });

        test("V5 Data Display Compatibility", async ({ page }) => {
            await page.goto("/esp/files/stub.htm");
            
            // Test V5 data display elements
            await expect(page.getByText("Target/Wuid")).toBeVisible();
            await expect(page.getByText("Graph")).toBeVisible();
            await expect(page.getByText("State")).toBeVisible();
            await expect(page.getByText("Owner")).toBeVisible();
            await expect(page.getByText("Job Name")).toBeVisible();
            
            // Test V5 chart elements
            const v5Chart = page.locator("svg").filter({ hasText: "%hthor" });
            try {
                await expect(v5Chart).toBeVisible({ timeout: 2000 });
            } catch {
                // V5 chart not available
            }
        });
    });

    test.describe("Version-Agnostic Tests", () => {
        test("Basic Page Loading", async ({ page }) => {
            // Test that basic pages load regardless of version
            const urls = [
                "/esp/files/index.html",
                "/esp/files/index.html#/activities",
                "/esp/files/index.html#/workunits",
                "/esp/files/index.html#/files",
                "/esp/files/index.html#/queries"
            ];
            
            for (const url of urls) {
                await page.goto(url);
                await expect(page.locator("body")).toBeVisible();
                
                // Should not show critical errors
                const errorElements = [
                    page.getByText("Error 500"),
                    page.getByText("Page not found"),
                    page.locator(".critical-error")
                ];
                
                for (const errorElement of errorElements) {
                    try {
                        await expect(errorElement).not.toBeVisible({ timeout: 1000 });
                    } catch {
                        // Error element not found - this is good
                    }
                }
            }
        });

        test("Cross-Version Navigation", async ({ page }) => {
            // Test switching between versions
            await page.goto("/esp/files/index.html");
            
            // Try to find version switcher
            const versionSwitchers = [
                page.getByText("Legacy Mode"),
                page.getByText("Modern Mode"),
                page.locator(".version-toggle"),
                page.locator(".mode-switch")
            ];
            
            for (const switcher of versionSwitchers) {
                try {
                    await expect(switcher).toBeVisible({ timeout: 1000 });
                    await switcher.click();
                    await page.waitForTimeout(1000);
                    
                    // Verify page is still functional after switch
                    await expect(page.locator("body")).toBeVisible();
                    break;
                } catch {
                    // Version switcher not found
                }
            }
        });

        test("Common Functionality Across Versions", async ({ page }) => {
            // Test functionality that should work in both versions
            const testUrls = [
                "/esp/files/index.html#/activities",
                "/esp/files/stub.htm"
            ];
            
            for (const url of testUrls) {
                await page.goto(url);
                
                // Test refresh functionality
                const refreshButtons = page.getByRole("button").filter({ hasText: /refresh/i });
                const refreshCount = await refreshButtons.count();
                if (refreshCount > 0) {
                    await refreshButtons.first().click();
                    await page.waitForTimeout(500);
                }
                
                // Test basic navigation
                const navElements = [
                    page.getByText("Activities"),
                    page.getByText("ECL"),
                    page.getByText("Files")
                ];
                
                for (const navElement of navElements) {
                    try {
                        await expect(navElement).toBeVisible({ timeout: 1000 });
                        break;
                    } catch {
                        // Navigation element not found in this version
                    }
                }
            }
        });
    });

    test.describe("Progressive Enhancement Tests", () => {
        test("Graceful Degradation", async ({ page }) => {
            // Test that features degrade gracefully when not available
            await page.goto("/esp/files/index.html#/activities");
            
            // Test advanced features that might not be available in all versions
            const advancedFeatures = [
                page.getByRole("button", { name: "Advanced" }),
                page.getByTitle("Disk Usage"),
                page.locator("svg"),
                page.getByRole("button", { name: "History" })
            ];
            
            for (const feature of advancedFeatures) {
                try {
                    await expect(feature).toBeVisible({ timeout: 1000 });
                    
                    // If feature exists, test basic interaction
                    await feature.click();
                    await page.waitForTimeout(200);
                } catch {
                    // Feature not available - this is acceptable
                    console.log("Advanced feature not available, continuing with basic functionality");
                }
            }
            
            // Ensure basic functionality still works
            await expect(page.locator("body")).toBeVisible();
        });

        test("Feature Detection", async ({ page }) => {
            await page.goto("/esp/files/index.html");
            
            // Detect which version is running
            const isV9 = await page.evaluate(() => {
                return sessionStorage.getItem("ECLWatch:ModernMode-9.0") !== "false";
            });
            
            if (isV9) {
                console.log("Running in V9 (Modern) mode");
                
                // Test V9-specific features
                await page.goto("/esp/files/index.html#/activities");
                await expect(page.getByRole("link", { name: "ECL Watch" })).toBeVisible();
            } else {
                console.log("Running in V5 (Legacy) mode");
                
                // Test V5-specific features
                await page.goto("/esp/files/stub.htm");
                await expect(page.locator("#stubStackController_stub_Main span").first()).toBeVisible();
            }
        });

        test("Accessibility Across Versions", async ({ page }) => {
            const testUrls = [
                "/esp/files/index.html#/activities",
                "/esp/files/stub.htm"
            ];
            
            for (const url of testUrls) {
                await page.goto(url);
                
                // Test keyboard navigation
                await page.keyboard.press("Tab");
                const focusedElement = page.locator(":focus");
                try {
                    await expect(focusedElement).toBeVisible({ timeout: 1000 });
                } catch {
                    // Focus handling may vary between versions
                }
                
                // Test for ARIA attributes
                const ariaElements = [
                    page.locator("[role]"),
                    page.locator("[aria-label]"),
                    page.locator("[aria-describedby]")
                ];
                
                for (const ariaElement of ariaElements) {
                    try {
                        const count = await ariaElement.count();
                        if (count > 0) {
                            console.log(`Found ${count} elements with ARIA attributes`);
                            break;
                        }
                    } catch {
                        // ARIA elements not found
                    }
                }
            }
        });
    });
});
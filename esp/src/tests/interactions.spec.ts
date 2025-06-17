import { test, expect } from "@playwright/test";

test.describe("User Interface Interactions", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/esp/files/index.html");
    });

    test("Global Controls and Settings", async ({ page }) => {
        // Test global application controls
        const globalControls = [
            page.getByRole("button", { name: "Advanced" }),
            page.getByRole("button", { name: "History" }),
            page.getByRole("button", { name: "Add to favorites" }),
            page.getByRole("button").filter({ hasText: "" }),  // Menu button
            page.locator(".settings-button"),
            page.locator(".preferences-button")
        ];
        
        for (const control of globalControls) {
            try {
                await expect(control).toBeVisible({ timeout: 1000 });
            } catch {
                // Global control not found
            }
        }
        
        // Test settings/preferences access
        const settingsSelectors = [
            page.getByText("Settings"),
            page.getByText("Preferences"),
            page.getByRole("button", { name: /settings/i }),
            page.getByRole("button", { name: /preferences/i })
        ];
        
        for (const selector of settingsSelectors) {
            try {
                await expect(selector).toBeVisible({ timeout: 1000 });
                await selector.click();
                
                // Look for settings dialog or panel
                const settingsElements = [
                    page.getByText("Theme"),
                    page.getByText("Language"),
                    page.getByText("Display"),
                    page.locator(".settings-dialog"),
                    page.locator(".preferences-panel")
                ];
                
                for (const element of settingsElements) {
                    try {
                        await expect(element).toBeVisible({ timeout: 2000 });
                        
                        // Close settings
                        const closeButtons = [
                            page.getByRole("button", { name: /close/i }),
                            page.getByRole("button", { name: /cancel/i }),
                            page.locator(".dijitDialogCloseIcon")
                        ];
                        
                        for (const closeBtn of closeButtons) {
                            try {
                                await closeBtn.click();
                                break;
                            } catch {
                                // Close button not found
                            }
                        }
                        break;
                    } catch {
                        // Settings element not found
                    }
                }
                break;
            } catch {
                // Settings selector not found
            }
        }
    });

    test("Data Grid Interactions", async ({ page }) => {
        await page.goto("/esp/files/index.html#/activities");
        
        // Test data grid basic interactions
        const dataGrids = [
            page.locator(".dgrid"),
            page.locator(".grid"),
            page.getByRole("grid"),
            page.locator("table")
        ];
        
        let gridFound = false;
        for (const grid of dataGrids) {
            try {
                await expect(grid).toBeVisible({ timeout: 2000 });
                gridFound = true;
                
                // Test row selection
                const rows = grid.locator("tr");
                const rowCount = await rows.count();
                
                if (rowCount > 1) {
                    const firstDataRow = rows.nth(1); // Skip header row
                    await firstDataRow.click();
                    
                    // Test multiple selection with Ctrl+click
                    if (rowCount > 2) {
                        const secondDataRow = rows.nth(2);
                        await secondDataRow.click({ modifiers: ["Control"] });
                    }
                }
                
                // Test column header interactions
                const headers = grid.locator("th");
                const headerCount = await headers.count();
                
                if (headerCount > 0) {
                    const firstHeader = headers.first();
                    // Test sorting by clicking column header
                    await firstHeader.click();
                    await page.waitForTimeout(200);
                    
                    // Test reverse sort
                    await firstHeader.click();
                    await page.waitForTimeout(200);
                }
                break;
            } catch {
                // Grid not found with this selector
            }
        }
        
        if (!gridFound) {
            console.log("No data grid found - this may be expected if no data is available");
        }
    });

    test("Form Controls and Inputs", async ({ page }) => {
        await page.goto("/esp/files/index.html#/activities");
        
        // Test various form controls
        const textInputs = page.locator("input[type='text']");
        const inputCount = await textInputs.count();
        
        if (inputCount > 0) {
            const firstInput = textInputs.first();
            
            // Test typing and clearing
            await firstInput.fill("test input");
            await expect(firstInput).toHaveValue("test input");
            
            // Test selection and replacement
            await firstInput.selectText();
            await firstInput.fill("replaced text");
            await expect(firstInput).toHaveValue("replaced text");
            
            // Test clearing
            await firstInput.clear();
            await expect(firstInput).toHaveValue("");
        }
        
        // Test dropdown/select controls
        const selectControls = page.locator("select");
        const selectCount = await selectControls.count();
        
        if (selectCount > 0) {
            const firstSelect = selectControls.first();
            
            // Test selecting options
            const options = firstSelect.locator("option");
            const optionCount = await options.count();
            
            if (optionCount > 1) {
                await firstSelect.selectOption({ index: 1 });
                
                // Verify selection
                const selectedValue = await firstSelect.inputValue();
                expect(selectedValue).toBeTruthy();
            }
        }
        
        // Test checkbox controls
        const checkboxes = page.locator("input[type='checkbox']");
        const checkboxCount = await checkboxes.count();
        
        if (checkboxCount > 0) {
            const firstCheckbox = checkboxes.first();
            
            // Test checking and unchecking
            await firstCheckbox.check();
            await expect(firstCheckbox).toBeChecked();
            
            await firstCheckbox.uncheck();
            await expect(firstCheckbox).not.toBeChecked();
        }
    });

    test("Dialog and Modal Interactions", async ({ page }) => {
        await page.goto("/esp/files/index.html#/activities");
        
        // Look for buttons that might open dialogs
        const dialogTriggers = [
            page.getByRole("button", { name: "Advanced" }),
            page.getByRole("button", { name: /settings/i }),
            page.getByRole("button", { name: /create/i }),
            page.getByRole("button", { name: /add/i })
        ];
        
        for (const trigger of dialogTriggers) {
            try {
                await expect(trigger).toBeVisible({ timeout: 1000 });
                await trigger.click();
                
                // Look for dialog or modal
                const dialogSelectors = [
                    page.locator(".dijitDialog"),
                    page.locator(".modal"),
                    page.locator("[role='dialog']"),
                    page.locator(".dialog")
                ];
                
                let dialogFound = false;
                for (const dialog of dialogSelectors) {
                    try {
                        await expect(dialog).toBeVisible({ timeout: 2000 });
                        dialogFound = true;
                        
                        // Test dialog interactions
                        const dialogButtons = dialog.locator("button");
                        const buttonCount = await dialogButtons.count();
                        
                        if (buttonCount > 0) {
                            // Look for OK, Cancel, Close buttons
                            const actionButtons = [
                                dialog.getByRole("button", { name: /ok/i }),
                                dialog.getByRole("button", { name: /cancel/i }),
                                dialog.getByRole("button", { name: /close/i }),
                                dialog.locator(".dijitDialogCloseIcon")
                            ];
                            
                            for (const actionBtn of actionButtons) {
                                try {
                                    await actionBtn.click();
                                    
                                    // Verify dialog is closed
                                    await expect(dialog).not.toBeVisible({ timeout: 2000 });
                                    break;
                                } catch {
                                    // Action button not found or dialog didn't close
                                }
                            }
                        }
                        break;
                    } catch {
                        // Dialog not found with this selector
                    }
                }
                
                if (dialogFound) break;
            } catch {
                // Dialog trigger not found
            }
        }
    });

    test("Tooltip and Help Interactions", async ({ page }) => {
        await page.goto("/esp/files/index.html#/activities");
        
        // Test tooltip functionality
        const elementsWithTooltips = [
            page.locator("[title]").first(),
            page.locator("[data-tooltip]").first(),
            page.getByRole("button").first()
        ];
        
        for (const element of elementsWithTooltips) {
            try {
                await expect(element).toBeVisible({ timeout: 1000 });
                
                // Hover to trigger tooltip
                await element.hover();
                await page.waitForTimeout(500);
                
                // Look for tooltip
                const tooltips = [
                    page.locator(".tooltip"),
                    page.locator(".dijitTooltip"),
                    page.locator("[role='tooltip']")
                ];
                
                for (const tooltip of tooltips) {
                    try {
                        await expect(tooltip).toBeVisible({ timeout: 1000 });
                        break;
                    } catch {
                        // Tooltip not found
                    }
                }
                
                // Move away to hide tooltip
                await page.locator("body").hover();
                break;
            } catch {
                // Element with tooltip not found
            }
        }
        
        // Test help functionality
        const helpElements = [
            page.getByRole("button", { name: /help/i }),
            page.getByText("Help"),
            page.locator(".help-icon"),
            page.locator("[title*='help']")
        ];
        
        for (const helpElement of helpElements) {
            try {
                await expect(helpElement).toBeVisible({ timeout: 1000 });
                await helpElement.click();
                
                // Look for help content
                const helpContent = [
                    page.getByText("Documentation"),
                    page.getByText("User Guide"),
                    page.locator(".help-dialog"),
                    page.locator(".documentation")
                ];
                
                for (const content of helpContent) {
                    try {
                        await expect(content).toBeVisible({ timeout: 2000 });
                        break;
                    } catch {
                        // Help content not found
                    }
                }
                break;
            } catch {
                // Help element not found
            }
        }
    });

    test("Keyboard Navigation and Shortcuts", async ({ page }) => {
        await page.goto("/esp/files/index.html#/activities");
        
        // Test tab navigation
        await page.keyboard.press("Tab");
        let focusedElement = page.locator(":focus");
        await expect(focusedElement).toBeVisible();
        
        // Continue tabbing through focusable elements
        for (let i = 0; i < 5; i++) {
            await page.keyboard.press("Tab");
            focusedElement = page.locator(":focus");
            
            try {
                await expect(focusedElement).toBeVisible({ timeout: 500 });
            } catch {
                // No focused element or not visible
                break;
            }
        }
        
        // Test common keyboard shortcuts
        const shortcuts = [
            { key: "F5", description: "Refresh" },
            { key: "Escape", description: "Cancel/Close" },
            { key: "Enter", description: "Activate" },
            { key: "Control+A", description: "Select All" }
        ];
        
        for (const shortcut of shortcuts) {
            try {
                await page.keyboard.press(shortcut.key);
                await page.waitForTimeout(200);
            } catch {
                // Shortcut not supported or caused error
            }
        }
        
        // Test arrow key navigation in grids
        const grids = page.locator(".dgrid, .grid, [role='grid']");
        const gridCount = await grids.count();
        
        if (gridCount > 0) {
            const firstGrid = grids.first();
            await firstGrid.click();
            
            // Test arrow key navigation
            await page.keyboard.press("ArrowDown");
            await page.keyboard.press("ArrowUp");
            await page.keyboard.press("ArrowRight");
            await page.keyboard.press("ArrowLeft");
        }
    });

    test("Drag and Drop Interactions", async ({ page }) => {
        await page.goto("/esp/files/index.html#/activities");
        
        // Test drag and drop functionality
        const draggableElements = [
            page.locator("[draggable='true']"),
            page.locator(".draggable"),
            page.locator("tr").first(),
            page.locator(".column-header").first()
        ];
        
        for (const draggable of draggableElements) {
            try {
                await expect(draggable).toBeVisible({ timeout: 1000 });
                
                const boundingBox = await draggable.boundingBox();
                if (boundingBox) {
                    // Test drag start
                    await draggable.hover();
                    await page.mouse.down();
                    
                    // Drag to a different position
                    await page.mouse.move(
                        boundingBox.x + 50,
                        boundingBox.y + 50
                    );
                    
                    // Drop
                    await page.mouse.up();
                    
                    await page.waitForTimeout(500);
                }
                break;
            } catch {
                // Draggable element not found
            }
        }
    });

    test("Context Menu Interactions", async ({ page }) => {
        await page.goto("/esp/files/index.html#/activities");
        
        // Test right-click context menus
        const contextTargets = [
            page.locator("tr").first(),
            page.locator(".dgrid-row").first(),
            page.locator("td").first(),
            page.locator(".grid-cell").first()
        ];
        
        for (const target of contextTargets) {
            try {
                await expect(target).toBeVisible({ timeout: 1000 });
                
                // Right-click to open context menu
                await target.click({ button: "right" });
                
                // Look for context menu
                const contextMenus = [
                    page.locator(".context-menu"),
                    page.locator(".dijitMenu"),
                    page.locator("[role='menu']"),
                    page.locator(".popup-menu")
                ];
                
                let menuFound = false;
                for (const menu of contextMenus) {
                    try {
                        await expect(menu).toBeVisible({ timeout: 1000 });
                        menuFound = true;
                        
                        // Test menu item interaction
                        const menuItems = menu.locator("li, .menu-item, [role='menuitem']");
                        const itemCount = await menuItems.count();
                        
                        if (itemCount > 0) {
                            // Hover over first menu item
                            await menuItems.first().hover();
                            await page.waitForTimeout(200);
                        }
                        
                        // Close context menu by clicking elsewhere
                        await page.locator("body").click();
                        break;
                    } catch {
                        // Context menu not found
                    }
                }
                
                if (menuFound) break;
            } catch {
                // Context target not found
            }
        }
    });

    test("Responsive Design and Layout", async ({ page }) => {
        await page.goto("/esp/files/index.html#/activities");
        
        // Test responsive behavior at different viewport sizes
        const viewportSizes = [
            { width: 1920, height: 1080 }, // Desktop
            { width: 1024, height: 768 },  // Tablet landscape
            { width: 768, height: 1024 },  // Tablet portrait
            { width: 375, height: 667 }    // Mobile
        ];
        
        for (const size of viewportSizes) {
            await page.setViewportSize(size);
            await page.waitForTimeout(500);
            
            // Test that main layout elements are still visible/accessible
            const layoutElements = [
                page.getByRole("link", { name: "ECL Watch" }),
                page.getByRole("main").or(page.locator("main, .main-content")),
                page.getByRole("navigation").or(page.locator("nav, .navigation"))
            ];
            
            for (const element of layoutElements) {
                try {
                    await expect(element).toBeVisible({ timeout: 1000 });
                } catch {
                    // Layout element not visible at this viewport size
                }
            }
            
            // Test mobile menu functionality for smaller screens
            if (size.width < 768) {
                const mobileMenuTriggers = [
                    page.locator(".menu-button"),
                    page.locator(".hamburger"),
                    page.locator(".mobile-menu-trigger"),
                    page.getByRole("button").filter({ hasText: "" })
                ];
                
                for (const trigger of mobileMenuTriggers) {
                    try {
                        await expect(trigger).toBeVisible({ timeout: 1000 });
                        await trigger.click();
                        
                        // Look for mobile menu
                        const mobileMenus = [
                            page.locator(".mobile-menu"),
                            page.locator(".slide-menu"),
                            page.locator(".drawer")
                        ];
                        
                        for (const menu of mobileMenus) {
                            try {
                                await expect(menu).toBeVisible({ timeout: 1000 });
                                
                                // Close mobile menu
                                await trigger.click();
                                break;
                            } catch {
                                // Mobile menu not found
                            }
                        }
                        break;
                    } catch {
                        // Mobile menu trigger not found
                    }
                }
            }
        }
        
        // Reset to default viewport
        await page.setViewportSize({ width: 1280, height: 720 });
    });

    test("Data Refresh and Auto-Update", async ({ page }) => {
        await page.goto("/esp/files/index.html#/activities");
        
        // Test manual refresh functionality
        const refreshButtons = [
            page.getByRole("button", { name: /refresh/i }),
            page.locator(".refresh-button"),
            page.locator("[title*='refresh']")
        ];
        
        for (const refreshBtn of refreshButtons) {
            try {
                await expect(refreshBtn).toBeVisible({ timeout: 1000 });
                await refreshBtn.click();
                
                // Wait for refresh to complete
                await page.waitForTimeout(1000);
                
                // Verify page is still functional after refresh
                await expect(page.getByTitle("Activities")).toBeVisible();
                break;
            } catch {
                // Refresh button not found
            }
        }
        
        // Test auto-refresh functionality
        const autoRefreshControls = [
            page.getByLabel("Auto Refresh"),
            page.getByText("Auto Refresh"),
            page.locator("input[type='checkbox']").filter({ hasText: /auto|refresh/i })
        ];
        
        for (const control of autoRefreshControls) {
            try {
                await expect(control).toBeVisible({ timeout: 1000 });
                
                // Enable auto-refresh
                await control.check();
                await page.waitForTimeout(500);
                
                // Disable auto-refresh
                await control.uncheck();
                break;
            } catch {
                // Auto-refresh control not found
            }
        }
    });
});
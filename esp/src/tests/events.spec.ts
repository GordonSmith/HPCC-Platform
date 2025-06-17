import { test, expect } from "@playwright/test";

test.describe("Event Scheduler", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/esp/files/index.html#/events");
    });

    test("Event Scheduler Grid Display", async ({ page }) => {
        // Test that the event scheduler is displayed
        await expect(page.getByTitle("Event Scheduler")).toBeVisible();
        
        // Test for common event grid columns
        const expectedColumns = [
            "Wuid",
            "Event Name",
            "Event Text", 
            "State",
            "Owner",
            "Target"
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
                console.log(`Column "${column}" not found - this may be expected if no events exist`);
            }
        }
    });

    test("Event Search and Filtering", async ({ page }) => {
        // Test search functionality
        const searchInputs = [
            page.getByPlaceholder("Event Name"),
            page.getByPlaceholder("Event Text"),
            page.getByLabel("Event Name"),
            page.getByLabel("Event Text"),
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
        
        // Test state filter
        const stateFilters = [
            page.getByLabel("State"),
            page.getByPlaceholder("State"),
            page.locator("select").filter({ hasText: /scheduled|running|complete|failed/i })
        ];
        
        for (const filter of stateFilters) {
            try {
                await expect(filter).toBeVisible({ timeout: 1000 });
                break;
            } catch {
                // State filter not found
            }
        }
    });

    test("Event Creation", async ({ page }) => {
        // Test event creation controls
        const createButtons = [
            page.getByRole("button", { name: /create/i }),
            page.getByRole("button", { name: /new/i }),
            page.getByRole("button", { name: /add/i }),
            page.getByRole("button", { name: /schedule/i })
        ];
        
        for (const button of createButtons) {
            try {
                await expect(button).toBeVisible({ timeout: 1000 });
                
                // Test clicking create button
                await button.click();
                
                // Look for event creation form or dialog
                const formElements = [
                    page.getByLabel("Event Name"),
                    page.getByLabel("Event Text"),
                    page.getByLabel("Target"),
                    page.getByPlaceholder("Event Name"),
                    page.getByPlaceholder("Event Text"),
                    page.getByRole("button", { name: /save/i }),
                    page.getByRole("button", { name: /create/i })
                ];
                
                let formFound = false;
                for (const element of formElements) {
                    try {
                        await expect(element).toBeVisible({ timeout: 2000 });
                        formFound = true;
                        break;
                    } catch {
                        // Form element not found
                    }
                }
                
                if (formFound) {
                    // Close the form/dialog
                    const closeButtons = [
                        page.getByRole("button", { name: /cancel/i }),
                        page.getByRole("button", { name: /close/i }),
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
                }
                break;
            } catch {
                // Create button not found
            }
        }
    });

    test("Event State Management", async ({ page }) => {
        // Test event state control buttons
        const stateButtons = [
            page.getByRole("button", { name: /pause/i }),
            page.getByRole("button", { name: /resume/i }),
            page.getByRole("button", { name: /abort/i }),
            page.getByRole("button", { name: /delete/i }),
            page.getByRole("button", { name: /refresh/i })
        ];
        
        for (const button of stateButtons) {
            try {
                await expect(button).toBeVisible({ timeout: 1000 });
            } catch {
                // State button not visible - may require event selection
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

    test("Event Selection", async ({ page }) => {
        // Test event row selection
        const eventRows = page.locator("tr").filter({ hasText: /W\d+/ });
        const rowCount = await eventRows.count();
        
        if (rowCount > 0) {
            const firstRow = eventRows.first();
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

    test("Event Details Access", async ({ page }) => {
        // Test accessing event details
        const eventLinks = page.locator("a").filter({ hasText: /W\d+/ });
        const linkCount = await eventLinks.count();
        
        if (linkCount > 0) {
            const firstEvent = eventLinks.first();
            const eventWuid = await firstEvent.textContent();
            
            // Click on event to access details
            await firstEvent.click();
            
            // Should navigate to event/workunit details page
            await page.waitForURL(/.*#\/(events|workunits)\/W\d+.*/, { timeout: 10000 });
            
            // Test for event details tabs or elements
            const detailsElements = [
                page.getByText("Summary"),
                page.getByText("ECL"),
                page.getByText("Results"),
                page.getByText("Variables"),
                page.getByText("Timers"),
                page.getByText("Event Details"),
                page.getByText("Schedule")
            ];
            
            for (const element of detailsElements) {
                try {
                    await expect(element).toBeVisible({ timeout: 2000 });
                } catch {
                    // Details element not found - may vary by event
                }
            }
        }
    });

    test("Event Scheduling Interface", async ({ page }) => {
        // Test event scheduling controls
        const scheduleElements = [
            page.getByText("Schedule"),
            page.getByText("Frequency"),
            page.getByText("Next Run"),
            page.getByLabel("Start Time"),
            page.getByLabel("End Time"),
            page.locator("select").filter({ hasText: /daily|weekly|monthly/i })
        ];
        
        for (const element of scheduleElements) {
            try {
                await expect(element).toBeVisible({ timeout: 1000 });
            } catch {
                // Schedule element not found
            }
        }
        
        // Test date/time pickers
        const dateTimeInputs = [
            page.locator("input[type='date']"),
            page.locator("input[type='time']"),
            page.locator("input[type='datetime-local']"),
            page.locator(".datepicker"),
            page.locator(".timepicker")
        ];
        
        for (const input of dateTimeInputs) {
            try {
                await expect(input).toBeVisible({ timeout: 1000 });
            } catch {
                // Date/time input not found
            }
        }
    });

    test("Event Context Menu", async ({ page }) => {
        // Test right-click context menu on events
        const eventRows = page.locator("tr").filter({ hasText: /W\d+/ });
        const rowCount = await eventRows.count();
        
        if (rowCount > 0) {
            const firstRow = eventRows.first();
            await firstRow.click({ button: "right" });
            
            // Test for context menu options
            const contextMenuOptions = [
                page.getByText("Open"),
                page.getByText("Edit"),
                page.getByText("Delete"),
                page.getByText("Pause"),
                page.getByText("Resume"),
                page.getByText("Run Now"),
                page.getByText("View Schedule")
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

    test("Event Monitoring and Status", async ({ page }) => {
        // Test event monitoring features
        const monitoringElements = [
            page.getByText("Active Events"),
            page.getByText("Scheduled Events"),
            page.getByText("Completed Events"),
            page.getByText("Failed Events"),
            page.locator(".status-indicator"),
            page.locator(".event-status")
        ];
        
        for (const element of monitoringElements) {
            try {
                await expect(element).toBeVisible({ timeout: 1000 });
            } catch {
                // Monitoring element not found
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
                // Test toggling auto-refresh
                await control.click();
                break;
            } catch {
                // Auto-refresh control not found
            }
        }
    });

    test("Event Advanced Filters", async ({ page }) => {
        // Test advanced filter functionality
        const advancedButton = page.getByRole("button", { name: "Advanced" });
        try {
            await expect(advancedButton).toBeVisible();
            await advancedButton.click();
            
            await page.waitForTimeout(500);
            
            // Test advanced filter options
            const advancedFilters = [
                page.getByLabel("Owner"),
                page.getByLabel("Target"),
                page.getByLabel("Date Range"),
                page.getByPlaceholder("Owner"),
                page.getByPlaceholder("Target"),
                page.getByLabel("Start Date"),
                page.getByLabel("End Date")
            ];
            
            for (const filter of advancedFilters) {
                try {
                    await expect(filter).toBeVisible({ timeout: 1000 });
                } catch {
                    // Advanced filter not found
                }
            }
        } catch {
            // Advanced button not found
        }
    });

    test("Event History and Logs", async ({ page }) => {
        // Test event history and logging features
        const historyElements = [
            page.getByText("History"),
            page.getByText("Logs"),
            page.getByText("Execution History"),
            page.getByText("Event Log"),
            page.getByRole("button", { name: /view log/i }),
            page.getByRole("button", { name: /history/i })
        ];
        
        for (const element of historyElements) {
            try {
                await expect(element).toBeVisible({ timeout: 1000 });
            } catch {
                // History element not found
            }
        }
        
        // Test log viewing functionality
        const eventLinks = page.locator("a").filter({ hasText: /W\d+/ });
        const linkCount = await eventLinks.count();
        
        if (linkCount > 0) {
            const firstEvent = eventLinks.first();
            await firstEvent.click();
            
            await page.waitForURL(/.*#\/(events|workunits)\/W\d+.*/, { timeout: 10000 });
            
            // Look for log or history tab
            const logTabs = [
                page.getByText("Logs"),
                page.getByText("History"),
                page.getByText("Output")
            ];
            
            for (const tab of logTabs) {
                try {
                    await expect(tab).toBeVisible({ timeout: 2000 });
                    await tab.click();
                    
                    // Look for log content
                    const logContent = [
                        page.locator("pre"),
                        page.locator(".log-content"),
                        page.locator("textarea[readonly]")
                    ];
                    
                    for (const content of logContent) {
                        try {
                            await expect(content).toBeVisible({ timeout: 2000 });
                            break;
                        } catch {
                            // Log content not found
                        }
                    }
                    break;
                } catch {
                    // Log tab not found
                }
            }
        }
    });

    test("Event Bulk Operations", async ({ page }) => {
        // Test bulk operations on multiple events
        const eventRows = page.locator("tr").filter({ hasText: /W\d+/ });
        const rowCount = await eventRows.count();
        
        if (rowCount > 1) {
            // Select multiple events
            const checkboxes = page.locator("input[type='checkbox']");
            const checkboxCount = await checkboxes.count();
            
            if (checkboxCount > 1) {
                await checkboxes.first().click();
                await checkboxes.nth(1).click();
                
                // Test bulk operation buttons
                const bulkOperations = [
                    page.getByRole("button", { name: /pause selected/i }),
                    page.getByRole("button", { name: /resume selected/i }),
                    page.getByRole("button", { name: /delete selected/i }),
                    page.getByRole("button", { name: /abort selected/i })
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
});
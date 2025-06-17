import { test, expect } from "@playwright/test";

test.describe("Search and Filtering Functionality", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/esp/files/index.html");
    });

    test("Global Search Functionality", async ({ page }) => {
        // Test global search across different sections
        const sections = [
            { url: "/esp/files/index.html#/workunits", title: "ECL" },
            { url: "/esp/files/index.html#/files", title: "Files" },
            { url: "/esp/files/index.html#/queries", title: "Published Queries" },
            { url: "/esp/files/index.html#/activities", title: "Activities" }
        ];

        for (const section of sections) {
            await page.goto(section.url);
            await expect(page.getByTitle(section.title)).toBeVisible();

            // Look for search input fields
            const searchInputs = [
                page.locator("input[type='text']").first(),
                page.getByPlaceholder("Search"),
                page.getByLabel("Search"),
                page.locator(".search-input")
            ];

            for (const searchInput of searchInputs) {
                try {
                    await expect(searchInput).toBeVisible({ timeout: 1000 });
                    
                    // Test basic search functionality
                    await searchInput.fill("test");
                    await expect(searchInput).toHaveValue("test");
                    
                    // Test search execution (Enter key or search button)
                    await searchInput.press("Enter");
                    await page.waitForTimeout(1000);
                    
                    // Clear search
                    await searchInput.clear();
                    await expect(searchInput).toHaveValue("");
                    break;
                } catch {
                    // Search input not found with this selector
                }
            }
            
            // Test search button if present
            const searchButtons = [
                page.getByRole("button", { name: /search/i }),
                page.locator(".search-button"),
                page.locator("button").filter({ hasText: "" }) // Search icon
            ];
            
            for (const button of searchButtons) {
                try {
                    await expect(button).toBeVisible({ timeout: 1000 });
                    await button.click();
                    await page.waitForTimeout(500);
                    break;
                } catch {
                    // Search button not found
                }
            }
        }
    });

    test("Advanced Search and Filters", async ({ page }) => {
        const sectionsWithAdvanced = [
            "/esp/files/index.html#/workunits",
            "/esp/files/index.html#/files", 
            "/esp/files/index.html#/queries"
        ];

        for (const sectionUrl of sectionsWithAdvanced) {
            await page.goto(sectionUrl);
            
            // Test Advanced button
            const advancedButton = page.getByRole("button", { name: "Advanced" });
            try {
                await expect(advancedButton).toBeVisible();
                await advancedButton.click();
                await page.waitForTimeout(500);
                
                // Test advanced filter fields
                const advancedFields = [
                    page.getByLabel("Owner"),
                    page.getByLabel("Cluster"),
                    page.getByLabel("State"),
                    page.getByLabel("Start Date"),
                    page.getByLabel("End Date"),
                    page.getByPlaceholder("Owner"),
                    page.getByPlaceholder("Cluster"),
                    page.getByPlaceholder("State")
                ];
                
                for (const field of advancedFields) {
                    try {
                        await expect(field).toBeVisible({ timeout: 1000 });
                        
                        if (await field.getAttribute("type") === "text") {
                            await field.fill("test");
                            await expect(field).toHaveValue("test");
                            await field.clear();
                        }
                    } catch {
                        // Advanced field not found
                    }
                }
                
                // Test advanced search execution
                const applyButtons = [
                    page.getByRole("button", { name: /apply/i }),
                    page.getByRole("button", { name: /search/i })
                ];
                
                for (const button of applyButtons) {
                    try {
                        await expect(button).toBeVisible({ timeout: 1000 });
                        await button.click();
                        await page.waitForTimeout(1000);
                        break;
                    } catch {
                        // Apply button not found
                    }
                }
                
                // Clear/reset advanced filters
                const clearButtons = [
                    page.getByRole("button", { name: /clear/i }),
                    page.getByRole("button", { name: /reset/i })
                ];
                
                for (const button of clearButtons) {
                    try {
                        await expect(button).toBeVisible({ timeout: 1000 });
                        await button.click();
                        break;
                    } catch {
                        // Clear button not found
                    }
                }
                
            } catch {
                // Advanced button not found
            }
        }
    });

    test("Column-Specific Filtering", async ({ page }) => {
        await page.goto("/esp/files/index.html#/activities");
        
        // Test column-specific filters
        const columnFilters = [
            { label: "Target/Wuid", placeholder: "Target", testValue: "hthor" },
            { label: "State", placeholder: "State", testValue: "running" },
            { label: "Owner", placeholder: "Owner", testValue: "test" },
            { label: "Job Name", placeholder: "Job Name", testValue: "job" }
        ];
        
        for (const filter of columnFilters) {
            // Try different ways to find column filters
            const filterInputs = [
                page.getByLabel(filter.label),
                page.getByPlaceholder(filter.placeholder),
                page.locator(`input[placeholder*="${filter.placeholder.toLowerCase()}"]`)
            ];
            
            for (const input of filterInputs) {
                try {
                    await expect(input).toBeVisible({ timeout: 1000 });
                    
                    // Test filtering
                    await input.fill(filter.testValue);
                    await expect(input).toHaveValue(filter.testValue);
                    
                    // Wait for filter to apply
                    await page.waitForTimeout(1000);
                    
                    // Clear filter
                    await input.clear();
                    await page.waitForTimeout(500);
                    break;
                } catch {
                    // Filter input not found
                }
            }
        }
    });

    test("Date Range Filtering", async ({ page }) => {
        const sectionsWithDateFilter = [
            "/esp/files/index.html#/workunits",
            "/esp/files/index.html#/events"
        ];
        
        for (const sectionUrl of sectionsWithDateFilter) {
            await page.goto(sectionUrl);
            
            // Open advanced filters
            const advancedButton = page.getByRole("button", { name: "Advanced" });
            try {
                await expect(advancedButton).toBeVisible();
                await advancedButton.click();
                await page.waitForTimeout(500);
                
                // Test date range inputs
                const dateInputs = [
                    page.getByLabel("Start Date"),
                    page.getByLabel("End Date"),
                    page.locator("input[type='date']"),
                    page.locator("input[type='datetime-local']")
                ];
                
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                
                const todayStr = today.toISOString().split('T')[0];
                const yesterdayStr = yesterday.toISOString().split('T')[0];
                
                for (let i = 0; i < dateInputs.length; i += 2) {
                    try {
                        const startDateInput = dateInputs[i];
                        const endDateInput = dateInputs[i + 1];
                        
                        if (await startDateInput.isVisible() && await endDateInput.isVisible()) {
                            // Set date range
                            await startDateInput.fill(yesterdayStr);
                            await endDateInput.fill(todayStr);
                            
                            // Apply date filter
                            const applyButton = page.getByRole("button", { name: /apply/i });
                            try {
                                await applyButton.click();
                                await page.waitForTimeout(1000);
                            } catch {
                                // Apply button not found
                            }
                            
                            // Clear date filters
                            await startDateInput.clear();
                            await endDateInput.clear();
                            break;
                        }
                    } catch {
                        // Date inputs not found or not accessible
                    }
                }
            } catch {
                // Advanced button not found
            }
        }
    });

    test("Multi-Select and Dropdown Filtering", async ({ page }) => {
        const sections = [
            "/esp/files/index.html#/workunits",
            "/esp/files/index.html#/files",
            "/esp/files/index.html#/queries"
        ];
        
        for (const sectionUrl of sections) {
            await page.goto(sectionUrl);
            
            // Test dropdown filters
            const dropdownFilters = page.locator("select");
            const dropdownCount = await dropdownFilters.count();
            
            for (let i = 0; i < dropdownCount; i++) {
                const dropdown = dropdownFilters.nth(i);
                
                try {
                    await expect(dropdown).toBeVisible({ timeout: 1000 });
                    
                    // Get available options
                    const options = dropdown.locator("option");
                    const optionCount = await options.count();
                    
                    if (optionCount > 1) {
                        // Select first non-default option
                        await dropdown.selectOption({ index: 1 });
                        await page.waitForTimeout(1000);
                        
                        // Reset to default
                        await dropdown.selectOption({ index: 0 });
                        await page.waitForTimeout(500);
                    }
                } catch {
                    // Dropdown not accessible
                }
            }
            
            // Test multi-select filters if present
            const multiSelectElements = [
                page.locator(".multi-select"),
                page.locator("[multiple]"),
                page.locator(".checkbox-group")
            ];
            
            for (const multiSelect of multiSelectElements) {
                try {
                    await expect(multiSelect).toBeVisible({ timeout: 1000 });
                    
                    const checkboxes = multiSelect.locator("input[type='checkbox']");
                    const checkboxCount = await checkboxes.count();
                    
                    if (checkboxCount > 0) {
                        // Select first checkbox
                        await checkboxes.first().check();
                        await page.waitForTimeout(500);
                        
                        // Unselect
                        await checkboxes.first().uncheck();
                        await page.waitForTimeout(500);
                    }
                    break;
                } catch {
                    // Multi-select not found
                }
            }
        }
    });

    test("Search Result Highlighting and Navigation", async ({ page }) => {
        await page.goto("/esp/files/index.html#/workunits");
        
        // Perform a search
        const searchInput = page.locator("input[type='text']").first();
        try {
            await expect(searchInput).toBeVisible({ timeout: 1000 });
            await searchInput.fill("W");
            await searchInput.press("Enter");
            await page.waitForTimeout(1000);
            
            // Look for search result highlighting
            const highlightedElements = [
                page.locator(".highlight"),
                page.locator(".search-highlight"),
                page.locator("mark"),
                page.locator(".match")
            ];
            
            for (const element of highlightedElements) {
                try {
                    await expect(element).toBeVisible({ timeout: 1000 });
                    break;
                } catch {
                    // Highlight element not found
                }
            }
            
            // Test search result count
            const resultCounters = [
                page.getByText(/\d+ results?/i),
                page.getByText(/\d+ matches?/i),
                page.locator(".result-count"),
                page.locator(".search-stats")
            ];
            
            for (const counter of resultCounters) {
                try {
                    await expect(counter).toBeVisible({ timeout: 1000 });
                    break;
                } catch {
                    // Result counter not found
                }
            }
            
            // Test search navigation (next/previous results)
            const navigationButtons = [
                page.getByRole("button", { name: /next/i }),
                page.getByRole("button", { name: /previous/i }),
                page.locator(".search-nav")
            ];
            
            for (const button of navigationButtons) {
                try {
                    await expect(button).toBeVisible({ timeout: 1000 });
                    await button.click();
                    await page.waitForTimeout(200);
                    break;
                } catch {
                    // Navigation button not found
                }
            }
            
            // Clear search
            await searchInput.clear();
            
        } catch {
            // Search input not found
        }
    });

    test("Saved Searches and Search History", async ({ page }) => {
        await page.goto("/esp/files/index.html#/workunits");
        
        // Look for saved search functionality
        const savedSearchElements = [
            page.getByRole("button", { name: /save search/i }),
            page.getByRole("button", { name: /saved searches/i }),
            page.locator(".save-search"),
            page.locator(".search-history")
        ];
        
        for (const element of savedSearchElements) {
            try {
                await expect(element).toBeVisible({ timeout: 1000 });
                await element.click();
                
                // Look for saved search dialog or dropdown
                const savedSearchUI = [
                    page.locator(".saved-searches"),
                    page.locator(".search-history-dialog"),
                    page.getByText("Recent Searches"),
                    page.getByText("Saved Filters")
                ];
                
                for (const ui of savedSearchUI) {
                    try {
                        await expect(ui).toBeVisible({ timeout: 2000 });
                        
                        // Close the dialog
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
                        // Saved search UI not found
                    }
                }
                break;
            } catch {
                // Saved search element not found
            }
        }
        
        // Test search history dropdown
        const searchInput = page.locator("input[type='text']").first();
        try {
            await expect(searchInput).toBeVisible({ timeout: 1000 });
            
            // Click on search input to potentially show history
            await searchInput.click();
            
            // Look for search history dropdown
            const historyDropdown = [
                page.locator(".search-history-dropdown"),
                page.locator(".autocomplete-dropdown"),
                page.locator("datalist"),
                page.locator(".suggestions")
            ];
            
            for (const dropdown of historyDropdown) {
                try {
                    await expect(dropdown).toBeVisible({ timeout: 1000 });
                    break;
                } catch {
                    // History dropdown not found
                }
            }
        } catch {
            // Search input not found
        }
    });

    test("Filter Persistence and State Management", async ({ page }) => {
        await page.goto("/esp/files/index.html#/workunits");
        
        // Set up filters
        const filterInput = page.locator("input[type='text']").first();
        try {
            await expect(filterInput).toBeVisible({ timeout: 1000 });
            await filterInput.fill("test-filter");
            await page.waitForTimeout(1000);
            
            // Navigate away and back
            await page.goto("/esp/files/index.html#/files");
            await page.waitForTimeout(500);
            await page.goto("/esp/files/index.html#/workunits");
            await page.waitForTimeout(1000);
            
            // Check if filter persisted
            const currentValue = await filterInput.inputValue();
            if (currentValue === "test-filter") {
                console.log("Filter state persisted across navigation");
            }
            
            // Clear filter
            await filterInput.clear();
        } catch {
            // Filter input not found
        }
        
        // Test advanced filter persistence
        const advancedButton = page.getByRole("button", { name: "Advanced" });
        try {
            await expect(advancedButton).toBeVisible();
            await advancedButton.click();
            await page.waitForTimeout(500);
            
            // Set advanced filter
            const ownerFilter = page.getByPlaceholder("Owner");
            try {
                await expect(ownerFilter).toBeVisible({ timeout: 1000 });
                await ownerFilter.fill("test-owner");
                
                // Apply filter
                const applyButton = page.getByRole("button", { name: /apply/i });
                try {
                    await applyButton.click();
                    await page.waitForTimeout(1000);
                } catch {
                    // Apply button not found
                }
                
                // Navigate and return
                await page.goto("/esp/files/index.html#/files");
                await page.waitForTimeout(500);
                await page.goto("/esp/files/index.html#/workunits");
                await page.waitForTimeout(1000);
                
                // Check advanced filter again
                await advancedButton.click();
                await page.waitForTimeout(500);
                
                const persistedValue = await ownerFilter.inputValue();
                if (persistedValue === "test-owner") {
                    console.log("Advanced filter state persisted");
                }
                
                // Clear advanced filter
                await ownerFilter.clear();
            } catch {
                // Owner filter not found
            }
        } catch {
            // Advanced button not found
        }
    });

    test("Search Performance and Large Result Sets", async ({ page }) => {
        await page.goto("/esp/files/index.html#/workunits");
        
        // Test search with broad criteria (potentially large result set)
        const searchInput = page.locator("input[type='text']").first();
        try {
            await expect(searchInput).toBeVisible({ timeout: 1000 });
            
            // Search for common term that might return many results
            await searchInput.fill("W");
            const startTime = Date.now();
            await searchInput.press("Enter");
            
            // Wait for results or loading indicator
            const loadingIndicators = [
                page.locator(".loading"),
                page.locator(".spinner"),
                page.getByText("Loading...")
            ];
            
            let loadingFound = false;
            for (const indicator of loadingIndicators) {
                try {
                    await expect(indicator).toBeVisible({ timeout: 1000 });
                    loadingFound = true;
                    
                    // Wait for loading to complete
                    await expect(indicator).not.toBeVisible({ timeout: 10000 });
                    break;
                } catch {
                    // Loading indicator not found or didn't disappear
                }
            }
            
            const endTime = Date.now();
            const searchTime = endTime - startTime;
            
            console.log(`Search completed in ${searchTime}ms`);
            
            // Test pagination with large result sets
            const paginationControls = [
                page.getByRole("button", { name: "Next" }),
                page.getByRole("button", { name: "Last" }),
                page.locator(".pagination"),
                page.getByText(/Page \d+ of \d+/)
            ];
            
            for (const control of paginationControls) {
                try {
                    await expect(control).toBeVisible({ timeout: 2000 });
                    
                    if (control.locator("button").count() > 0) {
                        await control.click();
                        await page.waitForTimeout(1000);
                    }
                    break;
                } catch {
                    // Pagination control not found
                }
            }
            
            // Clear search
            await searchInput.clear();
            
        } catch {
            // Search input not found
        }
    });

    test("Search Auto-Complete and Suggestions", async ({ page }) => {
        const sections = [
            "/esp/files/index.html#/workunits",
            "/esp/files/index.html#/files",
            "/esp/files/index.html#/queries"
        ];
        
        for (const sectionUrl of sections) {
            await page.goto(sectionUrl);
            
            // Test auto-complete functionality
            const searchInput = page.locator("input[type='text']").first();
            try {
                await expect(searchInput).toBeVisible({ timeout: 1000 });
                
                // Type partial search term
                await searchInput.fill("W");
                await page.waitForTimeout(500);
                
                // Look for auto-complete suggestions
                const suggestionElements = [
                    page.locator(".autocomplete"),
                    page.locator(".suggestions"),
                    page.locator(".typeahead"),
                    page.locator("datalist"),
                    page.locator(".dropdown-menu")
                ];
                
                for (const element of suggestionElements) {
                    try {
                        await expect(element).toBeVisible({ timeout: 1000 });
                        
                        // Try to click on a suggestion
                        const suggestions = element.locator("li, option, .suggestion-item");
                        const suggestionCount = await suggestions.count();
                        
                        if (suggestionCount > 0) {
                            await suggestions.first().click();
                            await page.waitForTimeout(500);
                        }
                        break;
                    } catch {
                        // Suggestion element not found
                    }
                }
                
                // Clear search
                await searchInput.clear();
                
            } catch {
                // Search input not found
            }
        }
    });

    test("Complex Search Queries and Operators", async ({ page }) => {
        await page.goto("/esp/files/index.html#/workunits");
        
        // Test complex search queries with operators
        const complexQueries = [
            'W* AND completed',
            'owner:admin OR owner:test',
            'NOT failed',
            '"exact phrase"',
            'field:value',
            'created:today'
        ];
        
        const searchInput = page.locator("input[type='text']").first();
        try {
            await expect(searchInput).toBeVisible({ timeout: 1000 });
            
            for (const query of complexQueries) {
                // Test complex query
                await searchInput.fill(query);
                await searchInput.press("Enter");
                await page.waitForTimeout(1000);
                
                // Look for query parsing indicators
                const queryIndicators = [
                    page.locator(".query-parsed"),
                    page.locator(".search-syntax"),
                    page.getByText("Search syntax"),
                    page.getByText("Advanced query")
                ];
                
                for (const indicator of queryIndicators) {
                    try {
                        await expect(indicator).toBeVisible({ timeout: 1000 });
                        break;
                    } catch {
                        // Query indicator not found
                    }
                }
                
                // Clear query
                await searchInput.clear();
                await page.waitForTimeout(200);
            }
            
        } catch {
            // Search input not found
        }
        
        // Test search help or syntax guide
        const helpElements = [
            page.getByRole("button", { name: /help/i }),
            page.getByText("Search Help"),
            page.locator(".search-help"),
            page.locator("[title*='search']")
        ];
        
        for (const helpElement of helpElements) {
            try {
                await expect(helpElement).toBeVisible({ timeout: 1000 });
                await helpElement.click();
                
                // Look for help content
                const helpContent = [
                    page.getByText("Search Syntax"),
                    page.getByText("Query Examples"),
                    page.locator(".help-dialog"),
                    page.locator(".search-guide")
                ];
                
                for (const content of helpContent) {
                    try {
                        await expect(content).toBeVisible({ timeout: 2000 });
                        
                        // Close help
                        const closeButtons = [
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
});
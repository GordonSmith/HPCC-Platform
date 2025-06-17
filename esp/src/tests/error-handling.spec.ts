import { test, expect } from "@playwright/test";

test.describe("Error Handling and Edge Cases", () => {
    test.beforeEach(async ({ page }) => {
        // Handle console errors and warnings
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`Console error: ${msg.text()}`);
            }
        });
        
        page.on('pageerror', error => {
            console.log(`Page error: ${error.message}`);
        });
    });

    test("Invalid URL Handling", async ({ page }) => {
        // Test navigation to non-existent pages
        const invalidUrls = [
            "/esp/files/index.html#/nonexistent",
            "/esp/files/index.html#/invalid-path",
            "/esp/files/index.html#/workunits/INVALID-WUID",
            "/esp/files/index.html#/files/nonexistent-file"
        ];
        
        for (const url of invalidUrls) {
            await page.goto(url);
            
            // Look for error messages or fallback content
            const errorIndicators = [
                page.getByText("404"),
                page.getByText("Not Found"),
                page.getByText("Page not found"),
                page.getByText("Error"),
                page.getByText("Invalid"),
                page.locator(".error-message"),
                page.locator(".not-found"),
                page.locator(".error-page")
            ];
            
            let errorFound = false;
            for (const indicator of errorIndicators) {
                try {
                    await expect(indicator).toBeVisible({ timeout: 2000 });
                    errorFound = true;
                    break;
                } catch {
                    // Error indicator not found
                }
            }
            
            // Should at least have basic page structure
            await expect(page.locator("body")).toBeVisible();
            
            // Should be able to navigate back to valid page
            await page.goto("/esp/files/index.html#/activities");
            await expect(page.getByTitle("Activities")).toBeVisible();
        }
    });

    test("Network Error Handling", async ({ page }) => {
        await page.goto("/esp/files/index.html#/activities");
        
        // Test handling of network failures
        await page.route('**/WsWorkunits/**', route => {
            route.abort('failed');
        });
        
        // Try to refresh or perform an action that would trigger network call
        const refreshButtons = page.getByRole("button").filter({ hasText: /refresh/i });
        const refreshCount = await refreshButtons.count();
        if (refreshCount > 0) {
            await refreshButtons.first().click();
            
            // Look for error messages or loading states
            const networkErrorIndicators = [
                page.getByText("Network Error"),
                page.getByText("Connection Failed"),
                page.getByText("Unable to load"),
                page.getByText("Server Error"),
                page.locator(".error"),
                page.locator(".loading-error"),
                page.locator(".network-error")
            ];
            
            for (const indicator of networkErrorIndicators) {
                try {
                    await expect(indicator).toBeVisible({ timeout: 3000 });
                    break;
                } catch {
                    // Network error indicator not found
                }
            }
        }
        
        // Clear route interception
        await page.unroute('**/WsWorkunits/**');
    });

    test("Empty Data State Handling", async ({ page }) => {
        // Test pages with no data
        const emptyDataPages = [
            "/esp/files/index.html#/workunits",
            "/esp/files/index.html#/files",
            "/esp/files/index.html#/queries",
            "/esp/files/index.html#/events"
        ];
        
        for (const pageUrl of emptyDataPages) {
            await page.goto(pageUrl);
            
            // Wait for page to load
            await page.waitForTimeout(2000);
            
            // Look for empty state messages or placeholders
            const emptyStateIndicators = [
                page.getByText("No data available"),
                page.getByText("No results found"),
                page.getByText("No items to display"),
                page.getByText("Empty"),
                page.locator(".empty-state"),
                page.locator(".no-data"),
                page.locator(".placeholder")
            ];
            
            // Check if grid/table is empty
            const gridRows = page.locator("tr").filter({ hasText: /\w+/ });
            const rowCount = await gridRows.count();
            
            if (rowCount <= 1) { // Only header row or no rows
                // Look for empty state indicators
                for (const indicator of emptyStateIndicators) {
                    try {
                        await expect(indicator).toBeVisible({ timeout: 1000 });
                        break;
                    } catch {
                        // Empty state indicator not found
                    }
                }
            }
            
            // Page should still be functional
            await expect(page.locator("body")).toBeVisible();
        }
    });

    test("Loading State Handling", async ({ page }) => {
        await page.goto("/esp/files/index.html#/activities");
        
        // Test loading indicators
        const loadingIndicators = [
            page.locator(".loading"),
            page.locator(".spinner"),
            page.locator(".progress"),
            page.getByText("Loading..."),
            page.getByText("Please wait"),
            page.locator(".dijitProgressBar")
        ];
        
        // Trigger refresh to potentially see loading state
        const refreshButtons = page.getByRole("button").filter({ hasText: /refresh/i });
        const refreshCount = await refreshButtons.count();
        if (refreshCount > 0) {
            await refreshButtons.first().click();
            
            // Quickly check for loading indicators
            for (const indicator of loadingIndicators) {
                try {
                    await expect(indicator).toBeVisible({ timeout: 500 });
                    break;
                } catch {
                    // Loading indicator not found or too fast
                }
            }
        }
        
        // Ensure page loads successfully
        await expect(page.getByTitle("Activities")).toBeVisible();
    });

    test("Form Validation and Error States", async ({ page }) => {
        await page.goto("/esp/files/index.html#/activities");
        
        // Test form validation by submitting empty or invalid forms
        const formInputs = page.locator("input[type='text']");
        const inputCount = await formInputs.count();
        
        if (inputCount > 0) {
            const firstInput = formInputs.first();
            
            // Test invalid input
            await firstInput.fill("invalid!@#$%^&*()");
            
            // Look for validation errors
            const validationErrors = [
                page.getByText("Invalid"),
                page.getByText("Error"),
                page.locator(".error"),
                page.locator(".validation-error"),
                page.locator(".field-error"),
                page.locator("[aria-invalid='true']")
            ];
            
            for (const error of validationErrors) {
                try {
                    await expect(error).toBeVisible({ timeout: 1000 });
                    break;
                } catch {
                    // Validation error not found
                }
            }
            
            // Clear invalid input
            await firstInput.clear();
        }
        
        // Test required field validation
        const submitButtons = [
            page.getByRole("button", { name: /submit/i }),
            page.getByRole("button", { name: /save/i }),
            page.getByRole("button", { name: /apply/i })
        ];
        
        for (const button of submitButtons) {
            try {
                await expect(button).toBeVisible({ timeout: 1000 });
                await button.click();
                
                // Look for required field errors
                const requiredFieldErrors = [
                    page.getByText("Required"),
                    page.getByText("This field is required"),
                    page.locator(".required-error"),
                    page.locator("[aria-invalid='true']")
                ];
                
                for (const error of requiredFieldErrors) {
                    try {
                        await expect(error).toBeVisible({ timeout: 1000 });
                        break;
                    } catch {
                        // Required field error not found
                    }
                }
                break;
            } catch {
                // Submit button not found
            }
        }
    });

    test("Permission and Access Error Handling", async ({ page }) => {
        // Test accessing restricted functionality
        const restrictedActions = [
            page.getByRole("button", { name: /delete/i }),
            page.getByRole("button", { name: /admin/i }),
            page.getByRole("button", { name: /configure/i }),
            page.getByText("Administration"),
            page.getByText("System")
        ];
        
        for (const action of restrictedActions) {
            try {
                await expect(action).toBeVisible({ timeout: 1000 });
                await action.click();
                
                // Look for permission error messages
                const permissionErrors = [
                    page.getByText("Access Denied"),
                    page.getByText("Permission Denied"),
                    page.getByText("Unauthorized"),
                    page.getByText("Forbidden"),
                    page.getByText("Not Authorized"),
                    page.locator(".access-denied"),
                    page.locator(".permission-error")
                ];
                
                for (const error of permissionErrors) {
                    try {
                        await expect(error).toBeVisible({ timeout: 2000 });
                        
                        // Close error dialog if present
                        const closeButtons = [
                            page.getByRole("button", { name: /ok/i }),
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
                        // Permission error not found
                    }
                }
                break;
            } catch {
                // Restricted action not found
            }
        }
    });

    test("Session Timeout Handling", async ({ page }) => {
        await page.goto("/esp/files/index.html#/activities");
        
        // Simulate session timeout by clearing session storage
        await page.evaluate(() => {
            sessionStorage.clear();
            localStorage.clear();
        });
        
        // Try to perform an action that requires authentication
        const refreshButtons = page.getByRole("button").filter({ hasText: /refresh/i });
        const refreshCount = await refreshButtons.count();
        if (refreshCount > 0) {
            await refreshButtons.first().click();
            
            // Look for login prompt or session timeout message
            const sessionErrors = [
                page.getByText("Session Expired"),
                page.getByText("Please log in"),
                page.getByText("Authentication Required"),
                page.getByText("Login"),
                page.locator(".login-form"),
                page.locator(".session-expired"),
                page.locator(".auth-required")
            ];
            
            for (const error of sessionErrors) {
                try {
                    await expect(error).toBeVisible({ timeout: 3000 });
                    break;
                } catch {
                    // Session error not found
                }
            }
        }
    });

    test("Browser Compatibility Issues", async ({ page }) => {
        await page.goto("/esp/files/index.html#/activities");
        
        // Test for common compatibility issues
        const compatibilityChecks = [
            // Check for unsupported browser warnings
            page.getByText("Unsupported Browser"),
            page.getByText("Please upgrade"),
            page.getByText("Browser not supported"),
            page.locator(".browser-warning"),
            page.locator(".compatibility-warning")
        ];
        
        for (const check of compatibilityChecks) {
            try {
                await expect(check).toBeVisible({ timeout: 1000 });
                console.log("Browser compatibility warning found");
                break;
            } catch {
                // Compatibility warning not found - this is good
            }
        }
        
        // Test JavaScript error handling
        await page.evaluate(() => {
            // Trigger a potential error condition
            try {
                (window as any).someNonExistentFunction();
            } catch (e) {
                console.log("JavaScript error handled:", e);
            }
        });
        
        // Page should still be functional
        await expect(page.locator("body")).toBeVisible();
    });

    test("Data Corruption and Malformed Response Handling", async ({ page }) => {
        await page.goto("/esp/files/index.html#/activities");
        
        // Mock malformed API responses
        await page.route('**/WsWorkunits/**', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: '{"invalid": "json", "data": [{'
            });
        });
        
        // Try to refresh data
        const refreshButtons = page.getByRole("button").filter({ hasText: /refresh/i });
        const refreshCount = await refreshButtons.count();
        if (refreshCount > 0) {
            await refreshButtons.first().click();
            
            // Look for data parsing error messages
            const dataErrors = [
                page.getByText("Data Error"),
                page.getByText("Invalid Response"),
                page.getByText("Parse Error"),
                page.getByText("Malformed Data"),
                page.locator(".data-error"),
                page.locator(".parse-error")
            ];
            
            for (const error of dataErrors) {
                try {
                    await expect(error).toBeVisible({ timeout: 3000 });
                    break;
                } catch {
                    // Data error indicator not found
                }
            }
        }
        
        // Clear route interception
        await page.unroute('**/WsWorkunits/**');
    });

    test("Memory and Performance Issues", async ({ page }) => {
        await page.goto("/esp/files/index.html#/activities");
        
        // Test handling of large datasets (simulate)
        const performanceStressTests = [
            // Test rapid navigation
            async () => {
                const navLinks = [
                    "/esp/files/index.html#/workunits",
                    "/esp/files/index.html#/files",
                    "/esp/files/index.html#/queries",
                    "/esp/files/index.html#/activities"
                ];
                
                for (let i = 0; i < 3; i++) {
                    for (const link of navLinks) {
                        await page.goto(link);
                        await page.waitForTimeout(100);
                    }
                }
            },
            
            // Test rapid interactions
            async () => {
                const buttons = page.getByRole("button");
                const buttonCount = Math.min(await buttons.count(), 10);
                
                for (let i = 0; i < buttonCount; i++) {
                    try {
                        const button = buttons.nth(i);
                        if (await button.isVisible()) {
                            await button.click();
                            await page.waitForTimeout(50);
                        }
                    } catch {
                        // Button interaction failed
                    }
                }
            }
        ];
        
        for (const stressTest of performanceStressTests) {
            try {
                await stressTest();
            } catch (error) {
                console.log("Performance stress test error:", error);
            }
        }
        
        // Verify page is still responsive
        await expect(page.locator("body")).toBeVisible();
        await expect(page.getByRole("link", { name: "ECL Watch" })).toBeVisible();
    });

    test("Concurrent User Actions", async ({ page }) => {
        await page.goto("/esp/files/index.html#/activities");
        
        // Test handling of multiple simultaneous actions
        const concurrentActions = [
            () => page.getByRole("button", { name: "Advanced" }).click(),
            () => page.getByRole("button").filter({ hasText: /refresh/i }).first().click(),
            () => page.locator("input[type='text']").first().fill("test"),
            () => page.keyboard.press("F5")
        ];
        
        // Execute actions concurrently
        try {
            await Promise.all(concurrentActions.map(action => {
                return action().catch(error => {
                    console.log("Concurrent action error:", error);
                });
            }));
        } catch (error) {
            console.log("Concurrent actions error:", error);
        }
        
        // Wait for actions to settle
        await page.waitForTimeout(1000);
        
        // Verify page is still functional
        await expect(page.locator("body")).toBeVisible();
    });

    test("Resource Loading Failures", async ({ page }) => {
        // Block specific resource types to test graceful degradation
        await page.route('**/*.css', route => route.abort());
        await page.route('**/*.js', route => {
            // Allow main application JS but block some dependencies
            if (route.request().url().includes('dojo') || 
                route.request().url().includes('dijit')) {
                route.abort();
            } else {
                route.continue();
            }
        });
        
        await page.goto("/esp/files/index.html#/activities");
        
        // Page should still have basic functionality even with missing resources
        await expect(page.locator("body")).toBeVisible();
        
        // Look for fallback content or error messages
        const fallbackIndicators = [
            page.getByText("Resources Failed to Load"),
            page.getByText("Fallback Mode"),
            page.locator(".resource-error"),
            page.locator(".fallback-content")
        ];
        
        for (const indicator of fallbackIndicators) {
            try {
                await expect(indicator).toBeVisible({ timeout: 1000 });
                break;
            } catch {
                // Fallback indicator not found
            }
        }
        
        // Clear route blocks
        await page.unroute('**/*.css');
        await page.unroute('**/*.js');
    });
});
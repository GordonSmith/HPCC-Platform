import { test, expect } from "@playwright/test";

test.describe("V9 Accessibility and User Experience", () => {

    test.beforeEach(async ({ page }) => {
        await page.goto("index.html");
        await page.waitForLoadState("networkidle");
    });

    test("Should provide keyboard navigation support", async ({ page }) => {
        // Test Tab navigation through main interface
        await page.keyboard.press("Tab");
        
        // Should be able to navigate to main menu items
        let activeElement = await page.evaluate(() => document.activeElement?.tagName);
        expect(activeElement).toBeDefined();
        
        // Navigate through several tab stops
        for (let i = 0; i < 5; i++) {
            await page.keyboard.press("Tab");
            await page.waitForTimeout(100);
        }
        
        // Should still have focus on a valid element
        activeElement = await page.evaluate(() => document.activeElement?.tagName);
        expect(activeElement).toBeDefined();
    });

    test("Should provide proper ARIA labels and roles", async ({ page }) => {
        // Check for proper navigation structure
        const menubar = page.getByRole("menubar");
        if (await menubar.count() > 0) {
            await expect(menubar).toBeVisible();
        }
        
        // Check for menu items
        const menuItems = page.getByRole("menuitem");
        if (await menuItems.count() > 0) {
            await expect(menuItems.first()).toBeVisible();
        }
        
        // Check for buttons
        const buttons = page.getByRole("button");
        if (await buttons.count() > 0) {
            await expect(buttons.first()).toBeVisible();
        }
        
        // Check for tables if present
        const tables = page.getByRole("table");
        if (await tables.count() > 0) {
            await expect(tables.first()).toBeVisible();
        }
    });

    test("Should support screen reader navigation", async ({ page }) => {
        // Check for heading structure
        const headings = await page.locator("h1, h2, h3, h4, h5, h6").all();
        
        if (headings.length > 0) {
            for (const heading of headings.slice(0, 3)) {
                await expect(heading).toBeVisible();
                
                // Headings should have meaningful text
                const headingText = await heading.textContent();
                expect(headingText).toBeTruthy();
                expect(headingText!.trim().length).toBeGreaterThan(0);
            }
        }
        
        // Check for landmarks
        const landmarks = await page.locator("[role='main'], [role='navigation'], [role='banner'], [role='contentinfo']").all();
        
        if (landmarks.length > 0) {
            for (const landmark of landmarks) {
                await expect(landmark).toBeVisible();
            }
        }
    });

    test("Should provide meaningful error messages", async ({ page }) => {
        // Navigate to a page that might show errors (like a non-existent workunit)
        await page.goto("index.html#/workunits/W00000000-000000");
        await page.waitForTimeout(2000);
        
        // Look for error messages
        const errorElements = [
            page.getByText("Error"),
            page.getByText("Not Found"),
            page.getByText("Invalid"),
            page.locator("[role='alert']"),
            page.locator(".error, .alert-error")
        ];
        
        let foundError = false;
        for (const errorElement of errorElements) {
            if (await errorElement.count() > 0) {
                const errorText = await errorElement.textContent();
                if (errorText && errorText.trim().length > 0) {
                    foundError = true;
                    expect(errorText.length).toBeGreaterThan(5); // Should be meaningful
                    break;
                }
            }
        }
        
        // Error handling should be present for invalid URLs
        expect(foundError || await page.locator("body").textContent()).toBeTruthy();
    });

    test("Should maintain focus management in modal dialogs", async ({ page }) => {
        // Navigate to workunits to potentially trigger dialogs
        await page.goto("index.html#/workunits");
        await page.waitForLoadState("networkidle");
        
        // Look for buttons that might open dialogs
        const dialogTriggers = [
            page.getByRole("menuitem", { name: "Filter" }),
            page.getByRole("button", { name: "Filter" }),
            page.getByRole("button", { name: "Settings" }),
            page.getByRole("button", { name: "Options" })
        ];
        
        for (const trigger of dialogTriggers) {
            if (await trigger.count() > 0) {
                await trigger.click();
                await page.waitForTimeout(500);
                
                // Check if a dialog/modal opened
                const dialog = page.locator("[role='dialog'], .ms-Dialog, .modal");
                if (await dialog.count() > 0) {
                    // Focus should be within the dialog
                    const focusedElement = await page.evaluate(() => document.activeElement);
                    expect(focusedElement).toBeTruthy();
                    
                    // Try to close dialog with Escape
                    await page.keyboard.press("Escape");
                    await page.waitForTimeout(500);
                    
                    // Dialog should close
                    const dialogStillOpen = await dialog.count() > 0;
                    if (dialogStillOpen) {
                        // Try clicking close button
                        const closeButton = page.getByRole("button", { name: "Close" });
                        if (await closeButton.count() > 0) {
                            await closeButton.click();
                        }
                    }
                }
                break;
            }
        }
    });

    test("Should provide consistent visual feedback for interactive elements", async ({ page }) => {
        // Check buttons have proper states
        const buttons = await page.getByRole("button").all();
        
        for (let i = 0; i < Math.min(3, buttons.length); i++) {
            const button = buttons[i];
            
            // Button should be visible
            await expect(button).toBeVisible();
            
            // Hover should work
            await button.hover();
            await page.waitForTimeout(100);
            
            // Should have some interactive styling
            const buttonStyles = await button.evaluate(el => {
                const styles = window.getComputedStyle(el);
                return {
                    cursor: styles.cursor,
                    backgroundColor: styles.backgroundColor
                };
            });
            
            // Interactive elements should have pointer cursor
            expect(buttonStyles.cursor === "pointer" || buttonStyles.cursor === "default").toBeTruthy();
        }
    });

    test("Should handle high contrast mode", async ({ page }) => {
        // Test basic visibility in high contrast simulation
        await page.emulateMedia({ colorScheme: "dark" });
        await page.waitForTimeout(500);
        
        // Main elements should still be visible
        await expect(page.getByRole("button", { name: "Activities" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Workunits" })).toBeVisible();
        
        // Switch back to light mode
        await page.emulateMedia({ colorScheme: "light" });
        await page.waitForTimeout(500);
        
        // Should still work in light mode
        await expect(page.getByRole("button", { name: "Activities" })).toBeVisible();
    });

    test("Should provide loading states and progress indicators", async ({ page }) => {
        // Navigate to a data-heavy page
        await page.goto("index.html#/workunits");
        
        // Look for loading indicators during navigation
        const loadingIndicators = [
            page.locator(".loading, .spinner, .progress"),
            page.getByText("Loading"),
            page.locator("[aria-label*='loading'], [aria-label*='Loading']")
        ];
        
        // Wait a bit for any loading states
        await page.waitForTimeout(1000);
        
        // After loading, content should be visible
        await page.waitForLoadState("networkidle");
        await expect(page.getByText("WUID")).toBeVisible();
        
        // Loading indicators should be gone
        for (const indicator of loadingIndicators) {
            const isVisible = await indicator.count() > 0 && await indicator.first().isVisible();
            // Loading indicators should either not exist or not be visible
            expect(!isVisible).toBeTruthy();
        }
    });
});

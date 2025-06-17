import { test as base, expect } from "@playwright/test";

// Extend the base test with custom fixtures and utilities
export const test = base.extend({
    // Custom fixture for ECL Watch version detection
    eclWatchVersion: async ({ page }, use) => {
        await page.goto("/esp/files/index.html");
        const isV9 = await page.evaluate(() => {
            return sessionStorage.getItem("ECLWatch:ModernMode-9.0") !== "false";
        });
        await use(isV9 ? "v9" : "v5");
    },

    // Custom fixture for setting ECL Watch version
    setEclWatchVersion: async ({ page }, use) => {
        const setVersion = async (version: "v5" | "v9") => {
            await page.goto("/esp/files/index.html");
            await page.evaluate((v) => {
                sessionStorage.setItem("ECLWatch:ModernMode-9.0", v === "v9" ? "true" : "false");
            }, version);
        };
        await use(setVersion);
    }
});

// Export expect for convenience
export { expect };

// Utility functions for common test operations
export class TestUtils {
    constructor(private page: any) {}

    // Wait for any loading indicators to disappear
    async waitForLoading() {
        const loadingSelectors = [
            ".loading",
            ".spinner", 
            ".dijitProgressBar",
            "[aria-busy='true']"
        ];

        for (const selector of loadingSelectors) {
            try {
                await this.page.waitForSelector(selector, { state: "hidden", timeout: 1000 });
            } catch {
                // Loading indicator not found or already hidden
            }
        }
    }

    // Find element using multiple selector strategies
    async findElement(selectors: string[]) {
        for (const selector of selectors) {
            try {
                const element = this.page.locator(selector);
                if (await element.isVisible()) {
                    return element;
                }
            } catch {
                // Selector failed, try next one
            }
        }
        return null;
    }

    // Click element with retry and multiple selector strategies  
    async clickElement(selectors: string[], timeout: number = 5000) {
        const element = await this.findElement(selectors);
        if (element) {
            await element.click({ timeout });
            return true;
        }
        return false;
    }

    // Fill input with multiple selector strategies
    async fillInput(selectors: string[], value: string) {
        const element = await this.findElement(selectors);
        if (element) {
            await element.fill(value);
            return true;
        }
        return false;
    }

    // Navigate to section with version-aware URLs
    async navigateToSection(section: string, version?: "v5" | "v9") {
        const urlMap = {
            v5: {
                activities: "/esp/files/stub.htm",
                workunits: "/esp/files/stub.htm", 
                files: "/esp/files/stub.htm",
                queries: "/esp/files/stub.htm"
            },
            v9: {
                activities: "/esp/files/index.html#/activities",
                workunits: "/esp/files/index.html#/workunits",
                files: "/esp/files/index.html#/files", 
                queries: "/esp/files/index.html#/queries"
            }
        };

        if (!version) {
            // Auto-detect version
            version = await this.page.evaluate(() => {
                return sessionStorage.getItem("ECLWatch:ModernMode-9.0") !== "false" ? "v9" : "v5";
            });
        }

        const url = urlMap[version]?.[section] || "/esp/files/index.html";
        await this.page.goto(url);
        await this.waitForLoading();
    }

    // Generic grid interaction helper
    async interactWithGrid() {
        const gridSelectors = [
            ".dgrid",
            "[role='grid']",
            "table",
            ".grid-container"
        ];

        const grid = await this.findElement(gridSelectors);
        if (!grid) return null;

        const rows = grid.locator("tr");
        const rowCount = await rows.count();
        
        return {
            grid,
            rows,
            rowCount,
            selectRow: async (index: number) => {
                if (index < rowCount) {
                    await rows.nth(index).click();
                }
            },
            getColumnHeaders: async () => {
                return grid.locator("th");
            }
        };
    }

    // Handle dialogs and modals
    async handleDialog(action: "close" | "ok" | "cancel" = "close") {
        const dialogSelectors = [
            ".dijitDialog",
            "[role='dialog']",
            ".modal",
            ".popup"
        ];

        const dialog = await this.findElement(dialogSelectors);
        if (!dialog) return false;

        const buttonSelectors = {
            close: [".dijitDialogCloseIcon", "[aria-label='close']", "button:has-text('Close')"],
            ok: ["button:has-text('OK')", "button:has-text('Ok')", ".ok-button"],
            cancel: ["button:has-text('Cancel')", ".cancel-button"]
        };

        return await this.clickElement(buttonSelectors[action]);
    }

    // Check for and handle error states
    async checkForErrors() {
        const errorSelectors = [
            ".error",
            ".error-message", 
            "[role='alert']",
            ".dijitErrorMessage"
        ];

        const errors = [];
        for (const selector of errorSelectors) {
            try {
                const elements = this.page.locator(selector);
                const count = await elements.count();
                for (let i = 0; i < count; i++) {
                    const text = await elements.nth(i).textContent();
                    if (text) {
                        errors.push(text);
                    }
                }
            } catch {
                // Error selector not found
            }
        }
        return errors;
    }

    // Generic search functionality
    async performSearch(searchTerm: string) {
        const searchSelectors = [
            "input[type='text']",
            "input[placeholder*='search' i]",
            ".search-input"
        ];

        if (await this.fillInput(searchSelectors, searchTerm)) {
            await this.page.keyboard.press("Enter");
            await this.waitForLoading();
            return true;
        }
        return false;
    }

    // Apply advanced filters
    async openAdvancedFilters() {
        return await this.clickElement([
            "button:has-text('Advanced')",
            ".advanced-button",
            "[aria-label='Advanced']"
        ]);
    }

    // Refresh data
    async refreshData() {
        const refreshed = await this.clickElement([
            "button:has-text('Refresh')",
            ".refresh-button",
            "[aria-label='Refresh']",
            "[title*='refresh' i]"
        ]);

        if (refreshed) {
            await this.waitForLoading();
        }
        return refreshed;
    }

    // Export data
    async exportData() {
        return await this.clickElement([
            "button:has-text('Export')",
            "button:has-text('Download')",
            ".export-button"
        ]);
    }

    // Check responsive behavior
    async testResponsiveness() {
        const viewports = [
            { width: 1920, height: 1080 },
            { width: 1024, height: 768 },
            { width: 768, height: 1024 },
            { width: 375, height: 667 }
        ];

        const results = [];
        for (const viewport of viewports) {
            await this.page.setViewportSize(viewport);
            await this.page.waitForTimeout(500);
            
            const isVisible = await this.page.locator("body").isVisible();
            results.push({ viewport, isVisible });
        }

        // Reset to default
        await this.page.setViewportSize({ width: 1280, height: 720 });
        return results;
    }
}

// Test data generators for consistent test data
export class TestDataGenerator {
    static generateWorkunitId(): string {
        return `W${Date.now()}${Math.floor(Math.random() * 1000)}`;
    }

    static generateFileName(): string {
        return `test_file_${Date.now()}.dat`;
    }

    static generateQueryName(): string {
        return `test_query_${Date.now()}`;
    }

    static generateSearchTerms(): string[] {
        return ["test", "W*", "admin", "thor", "roxie"];
    }

    static generateDateRange(): { start: string, end: string } {
        const end = new Date();
        const start = new Date(end);
        start.setDate(start.getDate() - 7);
        
        return {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        };
    }
}

// Common assertions for ECL Watch testing
export class ECLWatchAssertions {
    constructor(private page: any) {}

    async assertPageLoaded(title?: string) {
        await expect(this.page.locator("body")).toBeVisible();
        if (title) {
            await expect(this.page.getByTitle(title)).toBeVisible();
        }
    }

    async assertGridVisible() {
        const gridSelectors = [".dgrid", "[role='grid']", "table"];
        let gridFound = false;
        
        for (const selector of gridSelectors) {
            try {
                await expect(this.page.locator(selector)).toBeVisible({ timeout: 2000 });
                gridFound = true;
                break;
            } catch {
                // Grid not found with this selector
            }
        }
        
        if (!gridFound) {
            throw new Error("No grid component found on the page");
        }
    }

    async assertSearchFunctional() {
        const searchInput = this.page.locator("input[type='text']").first();
        await expect(searchInput).toBeVisible();
        await searchInput.fill("test");
        await expect(searchInput).toHaveValue("test");
        await searchInput.clear();
    }

    async assertNavigationWorking() {
        const navElements = [
            this.page.getByRole("link", { name: "ECL Watch" }),
            this.page.getByText("Activities"),
            this.page.getByRole("navigation")
        ];

        let navFound = false;
        for (const element of navElements) {
            try {
                await expect(element).toBeVisible({ timeout: 1000 });
                navFound = true;
                break;
            } catch {
                // Navigation element not found
            }
        }

        if (!navFound) {
            throw new Error("No navigation elements found");
        }
    }

    async assertNoErrors() {
        const errorSelectors = [
            ".error:visible",
            ".error-message:visible",
            "[role='alert']:visible"
        ];

        for (const selector of errorSelectors) {
            try {
                const errorCount = await this.page.locator(selector).count();
                if (errorCount > 0) {
                    const errorText = await this.page.locator(selector).first().textContent();
                    throw new Error(`Found error on page: ${errorText}`);
                }
            } catch (error) {
                if (error.message.includes("Found error")) {
                    throw error;
                }
                // Selector not found - this is good
            }
        }
    }
}
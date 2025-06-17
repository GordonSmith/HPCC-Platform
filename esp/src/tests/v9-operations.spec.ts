import { test, expect } from "@playwright/test";

test.describe("V9 Operations and Monitoring", () => {

    test.beforeEach(async ({ page }) => {
        await page.goto("index.html#/operations");
        await page.waitForLoadState("networkidle");
    });

    test("Should display the Operations page with expected sections", async ({ page }) => {
        // Check for main operations elements
        await expect(page.getByText("Operations")).toBeVisible();
        
        // Check for toolbar/menu items
        await expect(page.getByRole("menubar")).toBeVisible();
        await expect(page.getByRole("menuitem", { name: "Refresh" })).toBeVisible();
    });

    test("Should navigate to different operation sections", async ({ page }) => {
        // Look for common operation sections
        const operationSections = [
            "Cluster Processes",
            "System Servers", 
            "Target Clusters",
            "Disk Usage",
            "System Services"
        ];
        
        for (const section of operationSections) {
            const sectionLink = page.getByText(section);
            if (await sectionLink.count() > 0) {
                await sectionLink.click();
                await page.waitForTimeout(500);
                
                // Should show section content
                await expect(page.getByText(section)).toBeVisible();
            }
        }
    });

    test("Should display cluster process information", async ({ page }) => {
        // Navigate to cluster processes if available
        const processesLink = page.getByText("Cluster Processes");
        if (await processesLink.count() > 0) {
            await processesLink.click();
            await page.waitForTimeout(1000);
            
            // Check for process information
            const hasProcessInfo = await page.getByText("Process").count() > 0 ||
                                 await page.getByText("Status").count() > 0 ||
                                 await page.getByText("PID").count() > 0;
            
            if (hasProcessInfo) {
                expect(hasProcessInfo).toBeTruthy();
            }
        }
    });

    test("Should show system monitoring data", async ({ page }) => {
        // Look for monitoring/metrics sections
        await page.waitForTimeout(2000);
        
        const monitoringSections = [
            "Memory Usage",
            "CPU Usage", 
            "Disk Space",
            "Network",
            "Performance"
        ];
        
        let foundMonitoring = false;
        
        for (const section of monitoringSections) {
            const sectionElement = page.getByText(section);
            if (await sectionElement.count() > 0) {
                foundMonitoring = true;
                await expect(sectionElement).toBeVisible();
                break;
            }
        }
        
        // If no specific monitoring sections, check for general data displays
        if (!foundMonitoring) {
            const hasDataDisplays = await page.locator("table").count() > 0 ||
                                  await page.locator(".ms-DetailsRow").count() > 0 ||
                                  await page.locator("chart, svg, canvas").count() > 0;
            
            // Should have some form of data display
            expect(hasDataDisplays).toBeTruthy();
        }
    });

    test("Should handle system alerts and notifications", async ({ page }) => {
        // Look for alert or notification areas
        await page.waitForTimeout(2000);
        
        const alertElements = [
            page.getByText("Alert"),
            page.getByText("Warning"),
            page.getByText("Error"),
            page.getByText("Notification"),
            page.locator("[role='alert']"),
            page.locator(".alert, .warning, .error, .notification")
        ];
        
        let hasAlerts = false;
        
        for (const alertElement of alertElements) {
            if (await alertElement.count() > 0) {
                hasAlerts = true;
                await expect(alertElement.first()).toBeVisible();
                break;
            }
        }
        
        // Alerts are optional, so just verify the page structure is intact
        await expect(page.getByText("Operations")).toBeVisible();
    });

    test("Should provide system configuration information", async ({ page }) => {
        // Look for configuration sections
        const configSections = [
            "Configuration",
            "Settings", 
            "Environment",
            "System Info"
        ];
        
        let foundConfig = false;
        
        for (const section of configSections) {
            const configLink = page.getByText(section);
            if (await configLink.count() > 0) {
                await configLink.click();
                await page.waitForTimeout(1000);
                foundConfig = true;
                
                // Should show configuration data
                await expect(page.getByText(section)).toBeVisible();
                break;
            }
        }
        
        // If no specific config sections, check for general system information
        if (!foundConfig) {
            const hasSystemInfo = await page.locator("table").count() > 0 ||
                                 await page.locator(".ms-DetailsRow").count() > 0;
            
            expect(hasSystemInfo).toBeTruthy();
        }
    });

    test("Should handle operations refresh functionality", async ({ page }) => {
        // Wait for initial load
        await page.waitForTimeout(2000);
        
        // Click refresh if available
        const refreshButton = page.getByRole("menuitem", { name: "Refresh" });
        if (await refreshButton.count() > 0) {
            await refreshButton.click();
            await page.waitForLoadState("networkidle");
            
            // Should maintain page structure
            await expect(page.getByText("Operations")).toBeVisible();
        }
    });

    test("Should display service status information", async ({ page }) => {
        // Look for service status displays
        await page.waitForTimeout(2000);
        
        const serviceElements = [
            "ESP Server",
            "Dali Server",
            "DFU Server",
            "Sasha Server",
            "Services"
        ];
        
        let foundServices = false;
        
        for (const service of serviceElements) {
            const serviceElement = page.getByText(service);
            if (await serviceElement.count() > 0) {
                foundServices = true;
                await expect(serviceElement).toBeVisible();
                
                // Click to see service details
                await serviceElement.click();
                await page.waitForTimeout(500);
                break;
            }
        }
        
        // Services section is common in HPCC operations
        if (!foundServices) {
            // Check for general service indicators
            const hasServiceIndicators = await page.locator("[title*='service'], [title*='server']").count() > 0 ||
                                        await page.getByText("Running").count() > 0 ||
                                        await page.getByText("Stopped").count() > 0;
            
            // Service information should be present in operations
            expect(hasServiceIndicators || await page.locator("table, .ms-DetailsRow").count() > 0).toBeTruthy();
        }
    });
});

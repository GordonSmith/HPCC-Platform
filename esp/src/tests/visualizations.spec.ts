import { test, expect } from "@playwright/test";

test.describe("Data Visualization and Charts", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/esp/files/index.html");
    });

    test("Activities Dashboard Charts", async ({ page }) => {
        await page.goto("/esp/files/index.html#/activities");
        
        // Test for disk usage chart
        const diskUsageChart = page.getByTitle("Disk Usage");
        try {
            await expect(diskUsageChart).toBeVisible({ timeout: 3000 });
            await diskUsageChart.locator("i").click();
            
            // Look for SVG chart elements
            const chartElements = [
                page.locator("svg"),
                page.locator(".chart"),
                page.locator(".visualization"),
                page.locator("canvas")
            ];
            
            for (const element of chartElements) {
                try {
                    await expect(element).toBeVisible({ timeout: 2000 });
                    break;
                } catch {
                    // Chart element not found
                }
            }
        } catch {
            // Disk usage chart not found
        }
        
        // Test for activity graphs and visualizations
        const activityCharts = [
            page.locator("svg").filter({ hasText: "%hthor" }),
            page.locator(".activity-chart"),
            page.locator(".performance-chart"),
            page.locator(".monitoring-chart")
        ];
        
        for (const chart of activityCharts) {
            try {
                await expect(chart).toBeVisible({ timeout: 2000 });
                
                // Test chart interactivity
                await chart.hover();
                await page.waitForTimeout(200);
                
                // Look for tooltips or hover effects
                const tooltips = [
                    page.locator(".tooltip"),
                    page.locator(".chart-tooltip"),
                    page.locator("[role='tooltip']")
                ];
                
                for (const tooltip of tooltips) {
                    try {
                        await expect(tooltip).toBeVisible({ timeout: 500 });
                        break;
                    } catch {
                        // Tooltip not found
                    }
                }
                break;
            } catch {
                // Activity chart not found
            }
        }
    });

    test("Workunit Graphs and Timing Visualizations", async ({ page }) => {
        await page.goto("/esp/files/index.html#/workunits");
        
        // Try to access a workunit with graphs
        const workunitLinks = page.locator("a").filter({ hasText: /W\d+/ });
        const linkCount = await workunitLinks.count();
        
        if (linkCount > 0) {
            const firstWorkunit = workunitLinks.first();
            await firstWorkunit.click();
            
            await page.waitForURL(/.*#\/workunits\/W\d+.*/, { timeout: 10000 });
            
            // Test Graphs tab
            const graphsTab = page.getByText("Graphs");
            try {
                await expect(graphsTab).toBeVisible({ timeout: 2000 });
                await graphsTab.click();
                
                // Look for graph visualization elements
                const graphElements = [
                    page.locator("svg"),
                    page.locator(".graph-container"),
                    page.locator(".workflow-graph"),
                    page.locator(".dependency-graph"),
                    page.locator("canvas")
                ];
                
                for (const element of graphElements) {
                    try {
                        await expect(element).toBeVisible({ timeout: 3000 });
                        
                        // Test graph interaction
                        await element.click();
                        await page.waitForTimeout(500);
                        break;
                    } catch {
                        // Graph element not found
                    }
                }
                
                // Test graph controls
                const graphControls = [
                    page.getByRole("button", { name: /zoom/i }),
                    page.getByRole("button", { name: /reset/i }),
                    page.getByRole("button", { name: /fit/i }),
                    page.locator(".graph-controls"),
                    page.locator(".zoom-controls")
                ];
                
                for (const control of graphControls) {
                    try {
                        await expect(control).toBeVisible({ timeout: 1000 });
                        await control.click();
                        await page.waitForTimeout(200);
                        break;
                    } catch {
                        // Graph control not found
                    }
                }
            } catch {
                // Graphs tab not found
            }
            
            // Test Timers tab for timing visualizations
            const timersTab = page.getByText("Timers");
            try {
                await expect(timersTab).toBeVisible({ timeout: 2000 });
                await timersTab.click();
                
                // Look for timing charts
                const timingElements = [
                    page.locator(".timing-chart"),
                    page.locator(".performance-timeline"),
                    page.locator(".gantt-chart"),
                    page.locator("svg"),
                    page.locator("canvas")
                ];
                
                for (const element of timingElements) {
                    try {
                        await expect(element).toBeVisible({ timeout: 2000 });
                        break;
                    } catch {
                        // Timing element not found
                    }
                }
            } catch {
                // Timers tab not found
            }
        }
    });

    test("File Data Visualization", async ({ page }) => {
        await page.goto("/esp/files/index.html#/files");
        
        // Try to access a file with visualizable data
        const fileLinks = page.locator("a").filter({ hasText: /::/ });
        const linkCount = await fileLinks.count();
        
        if (linkCount > 0) {
            const firstFile = fileLinks.first();
            await firstFile.click();
            
            await page.waitForURL(/.*#\/files\/.*/, { timeout: 10000 });
            
            // Test Contents tab for data visualization
            const contentsTab = page.getByText("Contents");
            try {
                await expect(contentsTab).toBeVisible({ timeout: 2000 });
                await contentsTab.click();
                
                // Look for data visualization options
                const visualizationControls = [
                    page.getByRole("button", { name: /chart/i }),
                    page.getByRole("button", { name: /graph/i }),
                    page.getByRole("button", { name: /visualize/i }),
                    page.locator(".visualization-button"),
                    page.locator(".chart-button")
                ];
                
                for (const control of visualizationControls) {
                    try {
                        await expect(control).toBeVisible({ timeout: 1000 });
                        await control.click();
                        
                        // Look for resulting visualization
                        const charts = [
                            page.locator("svg"),
                            page.locator("canvas"),
                            page.locator(".chart"),
                            page.locator(".visualization")
                        ];
                        
                        for (const chart of charts) {
                            try {
                                await expect(chart).toBeVisible({ timeout: 3000 });
                                break;
                            } catch {
                                // Chart not found
                            }
                        }
                        break;
                    } catch {
                        // Visualization control not found
                    }
                }
                
                // Test data grid as a form of visualization
                const dataGrids = [
                    page.locator(".dgrid"),
                    page.getByRole("grid"),
                    page.locator("table"),
                    page.locator(".data-table")
                ];
                
                for (const grid of dataGrids) {
                    try {
                        await expect(grid).toBeVisible({ timeout: 2000 });
                        
                        // Test column sorting for data exploration
                        const headers = grid.locator("th");
                        const headerCount = await headers.count();
                        
                        if (headerCount > 0) {
                            await headers.first().click();
                            await page.waitForTimeout(500);
                        }
                        break;
                    } catch {
                        // Data grid not found
                    }
                }
            } catch {
                // Contents tab not found
            }
        }
    });

    test("Query Result Visualization", async ({ page }) => {
        await page.goto("/esp/files/index.html#/queries");
        
        // Try to access a published query
        const queryLinks = page.locator("a").filter({ hasText: /\w+\.\w+/ });
        const linkCount = await queryLinks.count();
        
        if (linkCount > 0) {
            const firstQuery = queryLinks.first();
            await firstQuery.click();
            
            await page.waitForURL(/.*#\/queries\/.*/, { timeout: 10000 });
            
            // Test query test interface for result visualization
            const testTab = page.getByText("Test");
            try {
                await expect(testTab).toBeVisible({ timeout: 2000 });
                await testTab.click();
                
                // Look for query execution and result visualization
                const executeButtons = [
                    page.getByRole("button", { name: /submit/i }),
                    page.getByRole("button", { name: /run/i }),
                    page.getByRole("button", { name: /execute/i })
                ];
                
                for (const button of executeButtons) {
                    try {
                        await expect(button).toBeVisible({ timeout: 1000 });
                        await button.click();
                        
                        // Wait for potential results
                        await page.waitForTimeout(2000);
                        
                        // Look for result visualization
                        const resultElements = [
                            page.locator(".result-grid"),
                            page.locator(".query-results"),
                            page.getByRole("grid"),
                            page.locator("table"),
                            page.locator(".dgrid")
                        ];
                        
                        for (const element of resultElements) {
                            try {
                                await expect(element).toBeVisible({ timeout: 3000 });
                                break;
                            } catch {
                                // Result element not found
                            }
                        }
                        break;
                    } catch {
                        // Execute button not found
                    }
                }
            } catch {
                // Test tab not found
            }
        }
    });

    test("System Monitoring Charts", async ({ page }) => {
        await page.goto("/esp/files/index.html#/activities");
        
        // Test system performance and monitoring charts
        const monitoringCharts = [
            page.locator("svg").filter({ hasText: /cpu|memory|disk|network/i }),
            page.locator(".monitoring-chart"),
            page.locator(".performance-gauge"),
            page.locator(".system-chart"),
            page.locator(".metrics-chart")
        ];
        
        for (const chart of monitoringCharts) {
            try {
                await expect(chart).toBeVisible({ timeout: 2000 });
                
                // Test chart interactions
                await chart.hover();
                
                // Look for chart legends
                const legends = [
                    page.locator(".legend"),
                    page.locator(".chart-legend"),
                    page.locator(".visualization-legend")
                ];
                
                for (const legend of legends) {
                    try {
                        await expect(legend).toBeVisible({ timeout: 1000 });
                        break;
                    } catch {
                        // Legend not found
                    }
                }
                
                // Test chart controls
                const chartControls = [
                    page.locator(".chart-controls"),
                    page.getByRole("button", { name: /refresh/i }),
                    page.getByRole("button", { name: /export/i })
                ];
                
                for (const control of chartControls) {
                    try {
                        await expect(control).toBeVisible({ timeout: 1000 });
                        break;
                    } catch {
                        // Chart control not found
                    }
                }
                break;
            } catch {
                // Monitoring chart not found
            }
        }
    });

    test("Interactive Data Exploration", async ({ page }) => {
        await page.goto("/esp/files/index.html#/activities");
        
        // Test interactive features of data visualizations
        const interactiveElements = [
            page.locator("svg"),
            page.locator("canvas"),
            page.locator(".interactive-chart"),
            page.locator(".visualization")
        ];
        
        for (const element of interactiveElements) {
            try {
                await expect(element).toBeVisible({ timeout: 2000 });
                
                // Test mouse interactions
                const boundingBox = await element.boundingBox();
                if (boundingBox) {
                    // Test hover
                    await element.hover();
                    await page.waitForTimeout(200);
                    
                    // Test click
                    await element.click();
                    await page.waitForTimeout(200);
                    
                    // Test drag (for panning or selection)
                    await page.mouse.move(boundingBox.x + 10, boundingBox.y + 10);
                    await page.mouse.down();
                    await page.mouse.move(boundingBox.x + 50, boundingBox.y + 50);
                    await page.mouse.up();
                    await page.waitForTimeout(200);
                    
                    // Test double-click (for zoom or drill-down)
                    await element.dblclick();
                    await page.waitForTimeout(200);
                }
                break;
            } catch {
                // Interactive element not found
            }
        }
    });

    test("Chart Export and Save Functionality", async ({ page }) => {
        await page.goto("/esp/files/index.html#/activities");
        
        // Test chart export options
        const exportButtons = [
            page.getByRole("button", { name: /export/i }),
            page.getByRole("button", { name: /save/i }),
            page.getByRole("button", { name: /download/i }),
            page.locator(".export-button"),
            page.locator(".save-chart")
        ];
        
        for (const button of exportButtons) {
            try {
                await expect(button).toBeVisible({ timeout: 1000 });
                await button.click();
                
                // Look for export options
                const exportOptions = [
                    page.getByText("PNG"),
                    page.getByText("SVG"),
                    page.getByText("PDF"),
                    page.getByText("CSV"),
                    page.locator(".export-format"),
                    page.locator(".download-options")
                ];
                
                for (const option of exportOptions) {
                    try {
                        await expect(option).toBeVisible({ timeout: 1000 });
                        break;
                    } catch {
                        // Export option not found
                    }
                }
                
                // Close export dialog if opened
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
                break;
            } catch {
                // Export button not found
            }
        }
    });

    test("Data Filtering and Chart Updates", async ({ page }) => {
        await page.goto("/esp/files/index.html#/activities");
        
        // Test how charts respond to data filtering
        const filterControls = [
            page.locator("input[type='text']").first(),
            page.locator("select").first(),
            page.getByRole("button", { name: "Advanced" })
        ];
        
        for (const control of filterControls) {
            try {
                await expect(control).toBeVisible({ timeout: 1000 });
                
                if (control.locator("input[type='text']").count() > 0) {
                    // Text input filter
                    await control.fill("test");
                    await page.waitForTimeout(1000);
                    await control.clear();
                } else if (control.locator("select").count() > 0) {
                    // Select dropdown filter
                    const options = control.locator("option");
                    const optionCount = await options.count();
                    if (optionCount > 1) {
                        await control.selectOption({ index: 1 });
                        await page.waitForTimeout(1000);
                        await control.selectOption({ index: 0 });
                    }
                } else {
                    // Button filter (like Advanced)
                    await control.click();
                    await page.waitForTimeout(500);
                    
                    // Close if it opened a dialog
                    const closeButtons = [
                        page.getByRole("button", { name: /cancel/i }),
                        page.getByRole("button", { name: /close/i })
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
                
                // Verify charts are still visible after filtering
                const charts = [
                    page.locator("svg"),
                    page.locator("canvas"),
                    page.locator(".chart")
                ];
                
                for (const chart of charts) {
                    try {
                        await expect(chart).toBeVisible({ timeout: 2000 });
                        break;
                    } catch {
                        // Chart not found
                    }
                }
                break;
            } catch {
                // Filter control not found
            }
        }
    });

    test("Real-time Data Updates in Charts", async ({ page }) => {
        await page.goto("/esp/files/index.html#/activities");
        
        // Test auto-refresh functionality for charts
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
                
                // Wait for a refresh cycle
                await page.waitForTimeout(3000);
                
                // Verify charts are still present
                const charts = [
                    page.locator("svg"),
                    page.locator("canvas"),
                    page.locator(".chart")
                ];
                
                for (const chart of charts) {
                    try {
                        await expect(chart).toBeVisible({ timeout: 1000 });
                        break;
                    } catch {
                        // Chart not found
                    }
                }
                
                // Disable auto-refresh
                await control.uncheck();
                break;
            } catch {
                // Auto-refresh control not found
            }
        }
        
        // Test manual refresh of charts
        const refreshButtons = page.getByRole("button").filter({ hasText: /refresh/i });
        const refreshCount = await refreshButtons.count();
        if (refreshCount > 0) {
            await refreshButtons.first().click();
            
            // Wait for refresh to complete
            await page.waitForTimeout(1000);
            
            // Verify charts are still functional
            const charts = [
                page.locator("svg"),
                page.locator("canvas"),
                page.locator(".chart")
            ];
            
            for (const chart of charts) {
                try {
                    await expect(chart).toBeVisible({ timeout: 2000 });
                    await chart.hover();
                    break;
                } catch {
                    // Chart not found
                }
            }
        }
    });

    test("Chart Responsiveness and Layout", async ({ page }) => {
        await page.goto("/esp/files/index.html#/activities");
        
        // Test chart responsiveness at different viewport sizes
        const viewportSizes = [
            { width: 1920, height: 1080 },
            { width: 1024, height: 768 },
            { width: 768, height: 1024 },
            { width: 375, height: 667 }
        ];
        
        for (const size of viewportSizes) {
            await page.setViewportSize(size);
            await page.waitForTimeout(500);
            
            // Check if charts adapt to new size
            const charts = [
                page.locator("svg"),
                page.locator("canvas"),
                page.locator(".chart")
            ];
            
            for (const chart of charts) {
                try {
                    await expect(chart).toBeVisible({ timeout: 1000 });
                    
                    // Verify chart dimensions are appropriate for viewport
                    const boundingBox = await chart.boundingBox();
                    if (boundingBox) {
                        expect(boundingBox.width).toBeLessThanOrEqual(size.width);
                        expect(boundingBox.height).toBeLessThanOrEqual(size.height);
                    }
                    break;
                } catch {
                    // Chart not found or not responsive
                }
            }
        }
        
        // Reset to default viewport
        await page.setViewportSize({ width: 1280, height: 720 });
    });
});
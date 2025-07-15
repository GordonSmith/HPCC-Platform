import { Page } from "@playwright/test";
import { promises as fs } from "fs";
import path from "path";

/**
 * Coverage collection utilities for Playwright tests
 */
export class CoverageHelper {
    private page: Page;
    private coverageEnabled: boolean;
    private static coverageDir = path.join(process.cwd(), ".nyc_output");

    constructor(page: Page) {
        this.page = page;
        // Use same detection logic as fixtures
        this.coverageEnabled =
            process.argv.includes("c8") ||
            !!process.env.COVERAGE ||
            !!process.env.NODE_V8_COVERAGE ||
            process.argv.some(arg => arg.includes("test-coverage"));
    }

    /**
     * Start JavaScript coverage collection
     */
    async startJSCoverage(): Promise<void> {
        if (!this.coverageEnabled) return;

        try {
            await this.page.coverage.startJSCoverage({
                resetOnNavigation: false,
                reportAnonymousScripts: true
            });
        } catch (error) {
            console.warn("Failed to start JS coverage:", error);
        }
    }

    /**
     * Start CSS coverage collection
     */
    async startCSSCoverage(): Promise<void> {
        if (!this.coverageEnabled) return;

        try {
            await this.page.coverage.startCSSCoverage({
                resetOnNavigation: false
            });
        } catch (error) {
            console.warn("Failed to start CSS coverage:", error);
        }
    }

    /**
     * Stop JavaScript coverage collection and return entries
     */
    async stopJSCoverage() {
        if (!this.coverageEnabled) return [];

        try {
            return await this.page.coverage.stopJSCoverage();
        } catch (error) {
            console.warn("Failed to stop JS coverage:", error);
            return [];
        }
    }

    /**
     * Stop CSS coverage collection and return entries
     */
    async stopCSSCoverage() {
        if (!this.coverageEnabled) return [];

        try {
            return await this.page.coverage.stopCSSCoverage();
        } catch (error) {
            console.warn("Failed to stop CSS coverage:", error);
            return [];
        }
    }

    /**
     * Start both JS and CSS coverage
     */
    async startCoverage(): Promise<void> {
        if (!this.coverageEnabled) {
            console.log("Coverage disabled - skipping start");
            return;
        }

        console.log("Starting browser coverage collection...");
        await Promise.all([
            this.startJSCoverage(),
            this.startCSSCoverage()
        ]);
        console.log("Browser coverage collection started");
    }

    /**
     * Stop both JS and CSS coverage and return combined entries
     */
    async stopCoverage() {
        if (!this.coverageEnabled) {
            console.log("Coverage disabled - skipping stop");
            return { js: [], css: [] };
        }

        console.log("Stopping browser coverage collection...");
        const [jsCoverage, cssCoverage] = await Promise.all([
            this.stopJSCoverage(),
            this.stopCSSCoverage()
        ]);

        console.log(`Coverage collected: ${jsCoverage?.length || 0} JS entries, ${cssCoverage?.length || 0} CSS entries`);

        // Process and save coverage data for c8
        if (this.coverageEnabled && jsCoverage && jsCoverage.length > 0) {
            await this.processCoverageData(jsCoverage);
        } else {
            console.log("No JS coverage data to process");
        }

        return {
            js: jsCoverage || [],
            css: cssCoverage || []
        };
    }

    /**
     * Process coverage data and save it in c8-compatible format
     */
    private async processCoverageData(jsCoverage: any[]): Promise<void> {
        try {
            // Ensure coverage directory exists
            await fs.mkdir(CoverageHelper.coverageDir, { recursive: true });

            console.log("Processing coverage data...");
            console.log("Sample URLs from coverage (first 10):");
            jsCoverage.slice(0, 10).forEach((entry, idx) => {
                console.log("  " + (idx + 1) + ". " + entry.url);
            });

            // Filter for relevant source files
            const relevantCoverage = jsCoverage.filter(entry => {
                const url = entry.url || "";
                // Include files from our source directories
                const isRelevant = url.includes("/src/") ||
                    url.includes("/src-react/") ||
                    url.includes("/eclwatch/") ||
                    // Include build output files that map to our sources
                    (url.includes("/build/") && !url.includes("node_modules")) ||
                    // Include any JavaScript files from our domain that aren't vendor
                    (url.includes("127.0.0.1") && url.endsWith(".js") && !url.includes("node_modules"));

                if (isRelevant) {
                    console.log("  ✓ Relevant: " + url);
                } else if (url.includes("127.0.0.1")) {
                    console.log("  ✗ Filtered out: " + url);
                }

                return isRelevant;
            });

            console.log("Filtered: " + relevantCoverage.length + " relevant out of " + jsCoverage.length + " total entries");

            if (relevantCoverage.length === 0) {
                console.log("No relevant source files found in coverage data");
                return;
            }

            // Convert to v8 coverage format
            const v8Coverage = {
                result: relevantCoverage.map(entry => ({
                    scriptId: entry.scriptId || "0",
                    url: this.normalizeUrl(entry.url),
                    functions: entry.functions || []
                }))
            };

            // Save coverage data with unique filename
            const timestamp = Date.now();
            const testName = (global as any).currentTest?.title || "unknown";
            const filename = "coverage-" + timestamp + "-" + testName.replace(/[^a-zA-Z0-9]/g, "_") + ".json";
            const filePath = path.join(CoverageHelper.coverageDir, filename);

            await fs.writeFile(filePath, JSON.stringify(v8Coverage, null, 2));
            console.log("Coverage data saved to: " + filename);
            console.log("Relevant files covered: " + relevantCoverage.length);
        } catch (error) {
            console.warn("Failed to process coverage data:", error);
        }
    }

    /**
     * Normalize URL to local file path for c8 processing
     */
    private normalizeUrl(url: string): string {
        if (!url) return "";

        // Convert browser URLs to local file paths
        const baseUrl = this.page.url();
        const basePath = process.cwd();

        try {
            const urlObj = new URL(url, baseUrl);
            let pathname = urlObj.pathname;

            // Remove leading slash and convert to local path
            if (pathname.startsWith("/")) {
                pathname = pathname.substring(1);
            }

            // Convert to absolute path
            return path.resolve(basePath, pathname);
        } catch {
            return url;
        }
    }

    /**
     * Check if coverage is enabled
     */
    get isEnabled(): boolean {
        return this.coverageEnabled;
    }
}

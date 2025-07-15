import { test as base, Page } from "@playwright/test";
import { WebCoverageHelper } from "./web-coverage";

/**
 * Global coverage state and utilities
 */
class GlobalCoverage {
    private static instance: GlobalCoverage;
    private coverageEnabled: boolean;
    private activeCoverage = new Map<Page, WebCoverageHelper>();

    private constructor() {
        // Detect coverage mode more reliably
        this.coverageEnabled =
            process.argv.includes("c8") ||
            !!process.env.COVERAGE ||
            !!process.env.NODE_V8_COVERAGE ||  // c8 sets this
            process.argv.some(arg => arg.includes("test-coverage"));

        console.log("Coverage detection:", {
            argv: process.argv.filter(arg => arg.includes("c8") || arg.includes("coverage")),
            NODE_V8_COVERAGE: !!process.env.NODE_V8_COVERAGE,
            COVERAGE: !!process.env.COVERAGE,
            enabled: this.coverageEnabled
        });
    }

    static getInstance(): GlobalCoverage {
        if (!GlobalCoverage.instance) {
            GlobalCoverage.instance = new GlobalCoverage();
        }
        return GlobalCoverage.instance;
    }

    get isEnabled(): boolean {
        return this.coverageEnabled;
    }

    async startCoverageForPage(page: Page): Promise<WebCoverageHelper> {
        if (!this.coverageEnabled) {
            return new WebCoverageHelper(page);
        }

        if (this.activeCoverage.has(page)) {
            return this.activeCoverage.get(page)!;
        }

        const helper = new WebCoverageHelper(page);
        await helper.startCoverage();
        this.activeCoverage.set(page, helper);

        // Clean up on page close
        page.on("close", () => {
            this.activeCoverage.delete(page);
        });

        return helper;
    }

    async stopCoverageForPage(page: Page): Promise<void> {
        const helper = this.activeCoverage.get(page);
        if (helper && helper.isEnabled) {
            await helper.stopCoverage();
            this.activeCoverage.delete(page);
        }
    }

    async stopAllCoverage(): Promise<void> {
        console.log("Stopping coverage for " + this.activeCoverage.size + " pages");
        const promises = Array.from(this.activeCoverage.entries()).map(
            async ([page, helper]) => {
                if (helper.isEnabled) {
                    console.log("Stopping coverage for page: " + page.url());
                    await helper.stopCoverage();
                }
            }
        );
        await Promise.all(promises);
        this.activeCoverage.clear();
        console.log("All coverage stopped");
    }

    async generateReport(): Promise<void> {
        await WebCoverageHelper.generateFinalReport();
    }
}

/**
 * Playwright fixture that automatically handles coverage collection
 */
type CoverageFixtures = {
    coverage: WebCoverageHelper;
    autoCoverage: Page;
};

export const test = base.extend<CoverageFixtures>({
    // Automatic coverage fixture - use this for most tests
    // Simply replace 'test' with 'test' from this file: import { test } from "./simple-coverage-fixtures";
    autoCoverage: async ({ page }, use) => {
        const globalCoverage = GlobalCoverage.getInstance();
        const helper = await globalCoverage.startCoverageForPage(page);

        // eslint-disable-next-line react-hooks/rules-of-hooks
        await use(page);

        await globalCoverage.stopCoverageForPage(page);
    },

    // Manual coverage fixture - use when you need fine control
    coverage: async ({ page }, use) => {
        const helper = new WebCoverageHelper(page);
        // eslint-disable-next-line react-hooks/rules-of-hooks
        await use(helper);

        if (helper.isEnabled) {
            await helper.stopCoverage();
        }
    },
});

export { expect } from "@playwright/test";
export { WebCoverageHelper };
export { GlobalCoverage };

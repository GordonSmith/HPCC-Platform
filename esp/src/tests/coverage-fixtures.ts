import { test as base, Page } from "@playwright/test";
import { WebCoverageHelper } from "./web-coverage";
import { CoverageHelper } from "./coverage-helper";

/**
 * Global coverage state and utilities
 */
class GlobalCoverage {
    private static instance: GlobalCoverage;
    private coverageEnabled: boolean;
    private activeCoverage = new Map<Page, CoverageHelper>();

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

    async startCoverageForPage(page: Page): Promise<CoverageHelper> {
        console.log(`Starting coverage for page: ${page.url()}, enabled: ${this.coverageEnabled}`);

        if (!this.coverageEnabled) {
            return new CoverageHelper(page);
        }

        if (this.activeCoverage.has(page)) {
            return this.activeCoverage.get(page)!;
        }

        const helper = new CoverageHelper(page);
        await helper.startCoverage();
        this.activeCoverage.set(page, helper);

        console.log(`Coverage started for page: ${page.url()}`);

        // Clean up on page close
        page.on("close", () => {
            this.activeCoverage.delete(page);
        });

        return helper;
    }

    async stopCoverageForPage(page: Page): Promise<void> {
        const helper = this.activeCoverage.get(page);
        if (helper && helper.isEnabled) {
            console.log(`Stopping coverage for page: ${page.url()}`);
            await helper.stopCoverage();
            this.activeCoverage.delete(page);
            console.log(`Coverage stopped and data saved for: ${page.url()}`);
        }
    }

    async stopAllCoverage(): Promise<void> {
        const promises = Array.from(this.activeCoverage.entries()).map(
            async ([page, helper]) => {
                if (helper.isEnabled) {
                    await helper.stopCoverage();
                }
            }
        );
        await Promise.all(promises);
        this.activeCoverage.clear();
    }
}

/**
 * Playwright fixture that automatically handles coverage collection
 */
type CoverageFixtures = {
    coverage: CoverageHelper;
    autoCoverage: Page;
};

export const test = base.extend<CoverageFixtures>({
    // Automatic coverage fixture - use this for most tests
    autoCoverage: async ({ page }, use) => {
        const globalCoverage = GlobalCoverage.getInstance();
        const helper = await globalCoverage.startCoverageForPage(page);

        // eslint-disable-next-line react-hooks/rules-of-hooks
        await use(page);

        await globalCoverage.stopCoverageForPage(page);
    },

    // Manual coverage fixture - use when you need fine control
    coverage: async ({ page }, use) => {
        const helper = new CoverageHelper(page);
        // eslint-disable-next-line react-hooks/rules-of-hooks
        await use(helper);

        if (helper.isEnabled) {
            await helper.stopCoverage();
        }
    },
});

export { expect } from "@playwright/test";
export { CoverageHelper } from "./coverage-helper";
export { GlobalCoverage };

import { test as setup } from "@playwright/test";
import { Workunit } from "@hpcc-js/comms";
import { baseURL, ecl } from "./global";
import { GlobalCoverage } from "./simple-coverage-fixtures";
import * as fs from "fs";
import * as path from "path";

// Initialize coverage directory and global coverage
const globalCoverage = GlobalCoverage.getInstance();
if (globalCoverage.isEnabled) {
    const coverageDir = path.join(__dirname, "..", "coverage");
    if (!fs.existsSync(coverageDir)) {
        fs.mkdirSync(coverageDir, { recursive: true });
    }
    console.log("Coverage collection initialized");
}

async function submit(browserName: string, ecl: string): Promise<any> {
    const wu = await Workunit.submit({ baseUrl: baseURL, userID: browserName }, "thor", ecl);
    wu.update({ Jobname: "global.setup.ts" });
    console.log(`    ${wu.Wuid}`);
    return wu.watchUntilComplete();
}

const browsers = ["chromium", "firefox", "webkit"];

setup("Setup", async ({ browserName }) => {
    console.log("Setup:");
    const jobs: Promise<any>[] = [];
    browsers.forEach(browserName => {
        jobs.push(submit(browserName, ecl.helloWorld));
        jobs.push(submit(browserName, ecl.normDenorm));
    });
    await Promise.all(jobs);
    console.log("");
});

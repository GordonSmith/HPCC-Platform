import { test as teardown } from "@playwright/test";
import { DFUArrayActions, Workunit, DFUService } from "@hpcc-js/comms";
import { baseURL } from "./global";
import { GlobalCoverage } from "./simple-coverage-fixtures";

const dfuService = new DFUService({ baseUrl: baseURL });

teardown("Teardown", async ({ }) => {
    console.log("Teardown:");

    // Ensure all coverage is stopped and generate report
    const globalCoverage = GlobalCoverage.getInstance();
    if (globalCoverage.isEnabled) {
        await globalCoverage.stopAllCoverage();
        await globalCoverage.generateReport();
        console.log("Coverage collection finalized and report generated");
    }

    const wus = await Workunit.query({ baseUrl: baseURL }, { Jobname: "global.setup.ts" });
    for (const wu of wus) {
        console.log(`    ${wu.Wuid}`);
        for (const result of await wu.fetchResults()) {
            if (result.FileName) {
                console.log(`        ${result.FileName}`);
                const lf = await dfuService.DFUArrayAction({ Type: DFUArrayActions.Delete, LogicalFiles: { Item: [result.FileName] } });
            }
        }
        await wu.delete();
    }
    console.log("");
});

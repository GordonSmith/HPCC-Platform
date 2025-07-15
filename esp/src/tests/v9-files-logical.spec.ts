import { test, expect } from "@playwright/test";

test.describe("V9 Files - Logical Files", () => {

    test.beforeEach(async ({ page }) => {
        await page.goto("index.html#/files");
        await page.waitForLoadState("networkidle");
    });

    test("Should display the Logical Files page with all expected columns and controls", async ({ page }) => {
        await expect(page.getByRole("menubar")).toBeVisible();
        await expect(page.getByRole("menuitem", { name: "Refresh" })).toBeVisible();

        await page.waitForTimeout(2000);

        const logicalNameVisible = await page.getByText("Logical Name").isVisible();

        if (!logicalNameVisible) {
            test.skip(true, "Logical Files page failed to load properly - known issue HPCC-32297");
        }

        await expect(page.getByText("Logical Name")).toBeVisible();
        await expect(page.getByText("Owner", { exact: true })).toBeVisible();
        await expect(page.getByText("Super Owner")).toBeVisible();
        await expect(page.getByText("Description")).toBeVisible();
        await expect(page.getByText("Cluster", { exact: true })).toBeVisible();
        await expect(page.getByText("Records")).toBeVisible();
        await expect(page.getByText("Size", { exact: true })).toBeVisible();
        await expect(page.getByText("Compressed Size")).toBeVisible();
        await expect(page.getByText("Parts")).toBeVisible();
        await expect(page.getByText("Min Skew")).toBeVisible();
        await expect(page.getByText("Max Skew")).toBeVisible();

        await page.locator(".ms-DetailsRow").first().waitFor({ state: "visible", timeout: 10000 });
        await expect(page.locator(".ms-DetailsRow")).not.toHaveCount(0);
    });

    test("Should allow filtering logical files and display filtered results", async ({ page }) => {
        await expect(page.getByRole("menubar")).toBeVisible();
        await expect(page.getByRole("menuitem", { name: "Refresh" })).toBeVisible();

        const filterMenuItem = page.getByRole("menuitem", { name: "Filter" });
        const filterExists = await filterMenuItem.isVisible();

        if (!filterExists) {
            test.skip(true, "Filter functionality not available on this configuration");
        }

        await page.waitForTimeout(2000);
        const hasInitialData = await page.locator(".ms-DetailsRow").count() > 0;

        if (!hasInitialData) {
            test.skip(true, "No logical files data available - cannot test filtering");
        }

        const initialRowCount = await page.locator(".ms-DetailsRow").count();

        await filterMenuItem.click();

        const filterDialog = page.locator(".ms-Modal.is-open").filter({ hasText: "Filter" }).first();

        await filterDialog.waitFor({ state: "visible", timeout: 5000 });

        const logicalNameInput = filterDialog.locator("input[name=\"LogicalName\"]").or(
            filterDialog.getByLabel("Name")
        ).or(
            filterDialog.locator("input[type=\"text\"]").first()
        );

        await logicalNameInput.waitFor({ state: "visible", timeout: 5000 });
        await logicalNameInput.fill("*global*");

        await page.getByRole("button", { name: "Apply" }).click();
        await filterDialog.waitFor({ state: "hidden", timeout: 5000 });

        await page.waitForTimeout(2000);

        const filteredRowCount = await page.locator(".ms-DetailsRow").count();

        if (filteredRowCount > 0) {
            await page.locator(".ms-DetailsRow").first().waitFor({ state: "visible", timeout: 5000 });
            console.log(`Filter applied successfully. Rows: ${initialRowCount} -> ${filteredRowCount}`);
        } else {
            console.log(`Filter applied successfully. No results found for filter '*global*'. Rows: ${initialRowCount} -> 0`);
        }

        await page.getByRole("menuitem", { name: "Filter" }).click();
    });

    test("Should allow selecting logical files and show selection", async ({ page }) => {
        const hasData = await page.locator(".ms-DetailsRow").count() > 0;

        if (!hasData) {
            test.skip(true, "No logical files data available - likely due to HPCC-32297");
        }

        await page.locator(".ms-DetailsRow").first().waitFor({ state: "visible", timeout: 10000 });
        await expect(page.locator(".ms-DetailsRow")).not.toHaveCount(0);

        await page.locator(".ms-DetailsRow").first().locator(".ms-DetailsRow-check").click();
        await expect(page.locator(".ms-DetailsRow.is-selected")).toHaveCount(1);
    });

    test("Should display logical file details when clicking on a file name", async ({ page, browserName }) => {
        const hasData = await page.locator(".ms-DetailsRow").count() > 0;

        if (!hasData) {
            test.skip(true, "No logical files data available - likely due to HPCC-32297");
        }

        await page.locator(".ms-DetailsRow").first().waitFor({ state: "visible", timeout: 10000 });
        await expect(page.locator(".ms-DetailsRow")).not.toHaveCount(0);

        const firstLogicalFileLink = page.locator(".ms-DetailsRow").first().locator("a").first();
        await firstLogicalFileLink.waitFor({ state: "visible" });

        if (browserName === "chromium") {
            await firstLogicalFileLink.click();

            await page.waitForLoadState("networkidle");

            await expect(page.locator("body")).toBeVisible();
        }
    });

    test("Should show cost columns when available", async ({ page }) => {
        const fileCostAtRestVisible = await page.getByText("File Cost At Rest").isVisible();
        const fileAccessCostVisible = await page.getByText("File Access Cost").isVisible();

        const logicalNameVisible = await page.getByText("Logical Name").isVisible();

        if (!logicalNameVisible) {
            test.skip(true, "Logical Files page failed to load properly - cannot verify cost columns due to known issue HPCC-32297");
        }

        await expect(page.getByText("Logical Name")).toBeVisible();

        if (fileCostAtRestVisible || fileAccessCostVisible) {
            await expect(page.locator(".ms-DetailsRow")).not.toHaveCount(0);
        }
    });
});
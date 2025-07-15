import { Page } from "@playwright/test";
import { promises as fs } from "fs";
import path from "path";
import { SourceMapConsumer } from "source-map";
import * as url from "url";

/**
 * Source map utilities for mapping coverage back to original sources
 */
class SourceMapHelper {
    private static sourceMapCache = new Map<string, SourceMapConsumer | null>();

    /**
     * Get source map consumer for a given JavaScript file URL
     */
    static async getSourceMapConsumer(jsUrl: string): Promise<SourceMapConsumer | null> {
        // Skip source map loading during coverage collection to avoid file handle leaks
        if (process.env.COVERAGE) {
            return null;
        }

        if (this.sourceMapCache.has(jsUrl)) {
            return this.sourceMapCache.get(jsUrl) || null;
        }

        try {
            // Convert URL to local file path
            let filePath: string;
            if (jsUrl.startsWith("http://") || jsUrl.startsWith("https://")) {
                const parsedUrl = new URL(jsUrl);
                // Map /esp/files/dist/ to local build/dist/
                const localPath = parsedUrl.pathname.replace("/esp/files/", "build/");
                filePath = path.resolve(localPath);
            } else {
                filePath = jsUrl;
            }

            // Check if file exists
            try {
                await fs.access(filePath);
            } catch {
                console.log(`Source file not found: ${filePath}`);
                this.sourceMapCache.set(jsUrl, null);
                return null;
            }

            // Look for source map
            const sourceMapPath = filePath + ".map";
            let sourceMapContent: string;

            try {
                sourceMapContent = await fs.readFile(sourceMapPath, "utf-8");
            } catch {
                // Try inline source map
                const jsContent = await fs.readFile(filePath, "utf-8");
                const sourceMapMatch = jsContent.match(/\/\/# sourceMappingURL=data:application\/json;base64,(.+)/);
                if (sourceMapMatch) {
                    sourceMapContent = Buffer.from(sourceMapMatch[1], "base64").toString("utf-8");
                } else {
                    console.log(`No source map found for: ${filePath}`);
                    this.sourceMapCache.set(jsUrl, null);
                    return null;
                }
            }

            const sourceMap = JSON.parse(sourceMapContent);
            const consumer = await new SourceMapConsumer(sourceMap);
            this.sourceMapCache.set(jsUrl, consumer);
            return consumer;
        } catch (error) {
            console.warn(`Failed to load source map for ${jsUrl}:`, error.message);
            this.sourceMapCache.set(jsUrl, null);
            return null;
        }
    }

    /**
     * Map a position in generated code to original source
     */
    static async mapToSource(jsUrl: string, line: number, column: number): Promise<{
        source: string | null;
        line: number | null;
        column: number | null;
        name: string | null;
    } | null> {
        const consumer = await this.getSourceMapConsumer(jsUrl);
        if (!consumer) return null;

        try {
            const mapped = consumer.originalPositionFor({ line, column });
            return {
                source: mapped.source,
                line: mapped.line,
                column: mapped.column,
                name: mapped.name
            };
        } catch (error) {
            console.warn(`Failed to map position for ${jsUrl}:`, error.message);
            return null;
        }
    }

    /**
     * Convert byte offset to line/column in generated code
     */
    static offsetToLineColumn(jsContent: string, offset: number): { line: number; column: number } {
        const lines = jsContent.substring(0, offset).split("\n");
        return {
            line: lines.length,
            column: lines[lines.length - 1].length
        };
    }

    /**
     * Cleanup source map consumers
     */
    static cleanup(): void {
        for (const consumer of this.sourceMapCache.values()) {
            if (consumer) {
                consumer.destroy();
            }
        }
        this.sourceMapCache.clear();
    }
}

/**
 * File-based coverage data storage to work across Playwright workers
 */
class CoverageDataStore {
    private static tempFile = path.resolve("coverage-temp.json");

    static async addCoverageData(coverageData: any[]): Promise<void> {
        let existingData: any[] = [];

        try {
            const content = await fs.readFile(this.tempFile, "utf-8");
            existingData = JSON.parse(content);
        } catch (error) {
            // File doesn't exist yet, start with empty array
        }

        existingData.push(...coverageData);
        await fs.writeFile(this.tempFile, JSON.stringify(existingData, null, 2));
        console.log("Saved " + coverageData.length + " coverage entries to temp file (total: " + existingData.length + ")");
    }

    static async getAllCoverageData(): Promise<any[]> {
        try {
            const content = await fs.readFile(this.tempFile, "utf-8");
            const data = JSON.parse(content);
            console.log("Loaded " + data.length + " coverage entries from temp file");
            return data;
        } catch (error) {
            console.log("No temp coverage file found, starting fresh");
            return [];
        }
    }

    static async clearCoverageData(): Promise<void> {
        try {
            await fs.unlink(this.tempFile);
            console.log("Cleared temp coverage file");
        } catch (error) {
            // File doesn't exist, nothing to clear
        }
    }
}

/**
 * Simple coverage reporter that generates HTML reports from browser coverage
 */
export class SimpleCoverageReporter {
    private coverageData: Array<{
        url: string;
        functions: any[];
        ranges?: any[];
        source?: string;
        sourceMappings?: any[];
    }> = [];
    private outputDir: string;
    private sourceFileCache = new Map<string, string>();

    constructor(outputDir = "coverage") {
        this.outputDir = path.resolve(outputDir);
    }

    /**
     * Load JavaScript file content for source mapping
     */
    private async loadJsFileContent(jsUrl: string): Promise<string | null> {
        if (this.sourceFileCache.has(jsUrl)) {
            return this.sourceFileCache.get(jsUrl) || null;
        }

        try {
            let filePath: string;
            if (jsUrl.startsWith("http://") || jsUrl.startsWith("https://")) {
                const parsedUrl = new URL(jsUrl);
                const localPath = parsedUrl.pathname.replace("/esp/files/", "build/");
                filePath = path.resolve(localPath);
            } else {
                filePath = jsUrl;
            }

            const content = await fs.readFile(filePath, "utf-8");
            this.sourceFileCache.set(jsUrl, content);
            return content;
        } catch (error) {
            console.warn(`Failed to load JS file ${jsUrl}:`, error.message);
            this.sourceFileCache.set(jsUrl, "");
            return null;
        }
    }

    /**
     * Add coverage data from a page with source mapping
     */
    async addCoverageData(jsCoverage: any[]): Promise<void> {
        const relevantCoverage = jsCoverage.filter(entry => {
            const url = entry.url || "";
            const isRelevant = (
                url.includes("/dist/") &&
                url.endsWith(".eclwatch.js") &&
                !url.includes("vendors-") &&
                !url.includes("node_modules")
            ) || (
                    url.includes("/dgrid/") ||
                    url.includes("/eclwatch/") ||
                    url.includes("/src/") ||
                    url.includes("/src-react/")
                );

            return isRelevant;
        });

        // Enhance coverage data with source mapping information
        const enhancedCoverage = await Promise.all(relevantCoverage.map(async (entry) => {
            const jsContent = await this.loadJsFileContent(entry.url);
            const enhancedEntry = { ...entry };

            if (jsContent && entry.functions) {
                // Try to map functions to original sources
                enhancedEntry.sourceMappings = await Promise.all(
                    entry.functions.map(async (func: any) => {
                        if (func.ranges && func.ranges.length > 0) {
                            const firstRange = func.ranges[0];
                            const startPos = SourceMapHelper.offsetToLineColumn(jsContent, firstRange.startOffset || 0);
                            const mapping = await SourceMapHelper.mapToSource(entry.url, startPos.line, startPos.column);
                            return {
                                functionName: func.functionName,
                                originalSource: mapping?.source || null,
                                originalLine: mapping?.line || null,
                                originalColumn: mapping?.column || null,
                                generatedOffset: firstRange.startOffset,
                                executionCount: firstRange.count || 0
                            };
                        }
                        return {
                            functionName: func.functionName,
                            originalSource: null,
                            originalLine: null,
                            originalColumn: null,
                            generatedOffset: 0,
                            executionCount: 0
                        };
                    })
                );
            }

            return enhancedEntry;
        }));

        console.log("Adding " + enhancedCoverage.length + " relevant coverage entries with source mapping to file store");
        await CoverageDataStore.addCoverageData(enhancedCoverage);
    }

    /**
     * Generate a simple HTML coverage report from all collected data
     */
    async generateReport(): Promise<void> {
        await fs.mkdir(this.outputDir, { recursive: true });

        // Load all coverage data from file store
        this.coverageData = await CoverageDataStore.getAllCoverageData();
        console.log("Generating report from " + this.coverageData.length + " total coverage entries");

        // Calculate coverage statistics
        const stats = this.calculateCoverageStats();

        // Generate HTML report
        const html = this.generateHtmlReport(stats);

        await fs.writeFile(path.join(this.outputDir, "index.html"), html);

        console.log("Coverage report generated at: " + path.join(this.outputDir, "index.html"));
        console.log("Coverage summary:");
        console.log("  Files covered: " + stats.totalFiles);
        console.log("  Lines covered: " + stats.linesExecuted + "/" + stats.totalLines + " (" + stats.linePercentage.toFixed(1) + "%)");
        console.log("  Functions covered: " + stats.functionsExecuted + "/" + stats.totalFunctions + " (" + stats.functionPercentage.toFixed(1) + "%)");
        if (stats.sourceFiles?.length) {
            console.log("  Source files mapped: " + stats.sourceFiles.length);
        }

        // Clean up temp file after generating report
        await CoverageDataStore.clearCoverageData();

        // Clean up source map consumers
        SourceMapHelper.cleanup();
    }

    private calculateCoverageStats() {
        let totalLines = 0;
        let linesExecuted = 0;
        let totalFunctions = 0;
        let functionsExecuted = 0;
        const fileStats: Array<{
            url: string;
            originalSource?: string;
            totalLines: number;
            linesExecuted: number;
            totalFunctions: number;
            functionsExecuted: number;
            percentage: number;
        }> = [];
        const sourceFileStats = new Map<string, {
            totalFunctions: number;
            functionsExecuted: number;
            mappedFunctions: Array<{ name: string; executed: boolean; line: number; }>
        }>();

        console.log("Calculating coverage stats for " + this.coverageData.length + " entries");

        this.coverageData.forEach(entry => {
            let fileTotalLines = 0;
            let fileLinesExecuted = 0;
            const fileTotalFunctions = entry.functions?.length || 0;
            let fileFunctionsExecuted = 0;

            // Process source mappings if available
            if (entry.sourceMappings) {
                entry.sourceMappings.forEach((mapping: any) => {
                    if (mapping.originalSource) {
                        // Normalize source path
                        const sourcePath = mapping.originalSource.replace(/\.\.\//g, "");

                        if (!sourceFileStats.has(sourcePath)) {
                            sourceFileStats.set(sourcePath, {
                                totalFunctions: 0,
                                functionsExecuted: 0,
                                mappedFunctions: []
                            });
                        }

                        const sourceStats = sourceFileStats.get(sourcePath)!;
                        sourceStats.totalFunctions++;

                        const isExecuted = mapping.executionCount > 0;
                        if (isExecuted) {
                            sourceStats.functionsExecuted++;
                        }

                        sourceStats.mappedFunctions.push({
                            name: mapping.functionName || "anonymous",
                            executed: isExecuted,
                            line: mapping.originalLine || 0
                        });
                    }
                });
            }

            entry.functions?.forEach((func, funcIdx) => {
                let functionHasCoverage = false;

                if (func.ranges && Array.isArray(func.ranges)) {
                    func.ranges.forEach((range: any) => {
                        // V8 coverage uses startOffset and endOffset
                        const start = typeof range.startOffset === "number" ? range.startOffset : 0;
                        const end = typeof range.endOffset === "number" ? range.endOffset : 0;
                        const count = typeof range.count === "number" ? range.count : 0;

                        if (end > start) {
                            // More conservative line estimation: assume ~40 characters per line
                            const estimatedLines = Math.max(1, Math.floor((end - start) / 40));
                            fileTotalLines += estimatedLines;

                            if (count > 0) {
                                fileLinesExecuted += estimatedLines;
                                functionHasCoverage = true;
                            }
                        }
                    });
                } else {
                    // If no ranges, count the function itself as one line
                    fileTotalLines += 1;
                    // Check if function has any execution indicators
                    if (func.functionName || func.isBlockCoverage !== false) {
                        fileLinesExecuted += 1;
                        functionHasCoverage = true;
                    }
                }

                if (functionHasCoverage) {
                    fileFunctionsExecuted++;
                }
            });

            const percentage = fileTotalLines > 0 ? (fileLinesExecuted / fileTotalLines) * 100 : 0;

            // Only include files that have actual code
            if (fileTotalFunctions > 0) {
                fileStats.push({
                    url: entry.url,
                    totalLines: fileTotalLines,
                    linesExecuted: fileLinesExecuted,
                    totalFunctions: fileTotalFunctions,
                    functionsExecuted: fileFunctionsExecuted,
                    percentage
                });

                console.log("  ✓ " + entry.url.replace(/^https?:\/\/[^\/]+/, "") +
                    " - " + fileTotalFunctions + " functions, " + fileFunctionsExecuted + " covered (" +
                    percentage.toFixed(1) + "% lines)");

                totalLines += fileTotalLines;
                linesExecuted += fileLinesExecuted;
                totalFunctions += fileTotalFunctions;
                functionsExecuted += fileFunctionsExecuted;
            }
        });

        // Add source file statistics
        const sourceFiles = Array.from(sourceFileStats.entries()).map(([sourcePath, stats]) => ({
            sourcePath,
            totalFunctions: stats.totalFunctions,
            functionsExecuted: stats.functionsExecuted,
            percentage: stats.totalFunctions > 0 ? (stats.functionsExecuted / stats.totalFunctions) * 100 : 0,
            functions: stats.mappedFunctions.sort((a, b) => a.line - b.line)
        }));

        return {
            totalFiles: fileStats.length, // Count only files with actual functions
            totalLines,
            linesExecuted,
            totalFunctions,
            functionsExecuted,
            linePercentage: totalLines > 0 ? (linesExecuted / totalLines) * 100 : 0,
            functionPercentage: totalFunctions > 0 ? (functionsExecuted / totalFunctions) * 100 : 0,
            files: fileStats,
            sourceFiles: sourceFiles.filter(sf => sf.totalFunctions > 0)
        };
    }

    private generateHtmlReport(stats: any): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <title>Test Coverage Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .files { margin-top: 20px; }
        .source-files { margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
        .high { background-color: #d4edda; }
        .medium { background-color: #fff3cd; }
        .low { background-color: #f8d7da; }
        .percentage { text-align: right; font-weight: bold; }
        .url { font-family: monospace; font-size: 12px; }
        .source-path { font-family: monospace; font-size: 11px; color: #666; }
        .function-list { font-size: 11px; color: #666; max-width: 300px; overflow: hidden; text-overflow: ellipsis; }
        .executed { color: #28a745; }
        .not-executed { color: #dc3545; }
        h2 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 5px; }
        h3 { color: #666; margin-top: 25px; }
    </style>
</head>
<body>
    <h1>Test Coverage Report</h1>
    
    <div class="summary">
        <h2>Coverage Summary</h2>
        <p><strong>Files:</strong> ${stats.totalFiles}</p>
        <p><strong>Lines:</strong> ${stats.linesExecuted}/${stats.totalLines} (${stats.linePercentage.toFixed(1)}%)</p>
        <p><strong>Functions:</strong> ${stats.functionsExecuted}/${stats.totalFunctions} (${stats.functionPercentage.toFixed(1)}%)</p>
        ${stats.sourceFiles?.length ? `<p><strong>Source Files Mapped:</strong> ${stats.sourceFiles.length}</p>` : ""}
    </div>

    <div class="files">
        <h2>Generated File Coverage</h2>
        <table>
            <thead>
                <tr>
                    <th>File</th>
                    <th>Lines</th>
                    <th>Functions</th>
                    <th>Coverage %</th>
                </tr>
            </thead>
            <tbody>
                ${stats.files.map((file: any) => {
            const cssClass = file.percentage >= 80 ? "high" : file.percentage >= 50 ? "medium" : "low";
            const fileName = path.basename(file.url);
            return `
                    <tr class="${cssClass}">
                        <td class="url" title="${file.url}">${fileName}</td>
                        <td>${file.linesExecuted}/${file.totalLines}</td>
                        <td>${file.functionsExecuted}/${file.totalFunctions}</td>
                        <td class="percentage">${file.percentage.toFixed(1)}%</td>
                    </tr>`;
        }).join("")}
            </tbody>
        </table>
    </div>

    ${stats.sourceFiles?.length ? `
    <div class="source-files">
        <h2>Source File Coverage</h2>
        <p><em>Mapped from generated code using source maps</em></p>
        <table>
            <thead>
                <tr>
                    <th>Source File</th>
                    <th>Functions</th>
                    <th>Coverage %</th>
                    <th>Function Details</th>
                </tr>
            </thead>
            <tbody>
                ${stats.sourceFiles.map((sourceFile: any) => {
            const cssClass = sourceFile.percentage >= 80 ? "high" : sourceFile.percentage >= 50 ? "medium" : "low";
            const functionDetails = sourceFile.functions.map((func: any) =>
                `<span class="${func.executed ? "executed" : "not-executed"}" title="Line ${func.line}">${func.name}</span>`
            ).join(", ");
            return `
                    <tr class="${cssClass}">
                        <td class="source-path" title="${sourceFile.sourcePath}">${path.basename(sourceFile.sourcePath)}</td>
                        <td>${sourceFile.functionsExecuted}/${sourceFile.totalFunctions}</td>
                        <td class="percentage">${sourceFile.percentage.toFixed(1)}%</td>
                        <td class="function-list">${functionDetails}</td>
                    </tr>`;
        }).join("")}
            </tbody>
        </table>
    </div>
    ` : ""}

    <div style="margin-top: 30px; color: #666; font-size: 12px;">
        <p>Generated on ${new Date().toLocaleString()}</p>
        <p>Note: Coverage percentages are estimates based on executed code ranges.</p>
        ${stats.sourceFiles?.length ? "<p>Source file mapping uses webpack source maps for accurate original file tracking.</p>" : ""}
    </div>
</body>
</html>`;
    }
}

/**
 * Enhanced coverage helper that saves data globally
 */
export class WebCoverageHelper {
    private page: Page;
    private coverageEnabled: boolean;

    constructor(page: Page) {
        this.page = page;
        this.coverageEnabled =
            process.argv.includes("c8") ||
            !!process.env.COVERAGE ||
            !!process.env.NODE_V8_COVERAGE ||
            process.argv.some(arg => arg.includes("test-coverage"));
    }

    async startCoverage(): Promise<void> {
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

    async stopCoverage(): Promise<void> {
        if (!this.coverageEnabled) return;

        try {
            console.log("Stopping coverage for page: " + this.page.url());
            const jsCoverage = await this.page.coverage.stopJSCoverage();
            console.log("Got " + jsCoverage.length + " coverage entries from page");

            // Save directly to file store instead of using static reporter
            const reporter = new SimpleCoverageReporter();
            await reporter.addCoverageData(jsCoverage);
            console.log("Coverage data saved to file store");
        } catch (error) {
            console.warn("Failed to stop JS coverage:", error);
        }
    }

    static async generateFinalReport(): Promise<void> {
        console.log("generateFinalReport called - creating new reporter to read from file store");
        const reporter = new SimpleCoverageReporter();
        await reporter.generateReport();
    }

    get isEnabled(): boolean {
        return this.coverageEnabled;
    }
}

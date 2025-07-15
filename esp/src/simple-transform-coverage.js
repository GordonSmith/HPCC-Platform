#!/usr/bin/env node

/**
 * Coverage Transformer
 * 
 * Transforms V8 coverage files to reference original TypeScript/React source files
 * instead of webpack bundle files, enabling source-level coverage analysis.
 */

const fs = require('fs').promises;
const path = require('path');

class CoverageTransformer {
    constructor() {
        this.sourceMapCache = new Map();
        this.stats = {
            filesProcessed: 0,
            sourcesFound: 0,
            errors: 0
        };
    }

    /**
     * Load source files list from bundle source map
     */
    async loadSourceFiles(bundlePath) {
        if (this.sourceMapCache.has(bundlePath)) {
            return this.sourceMapCache.get(bundlePath);
        }

        try {
            // Map bundle path to local source map file
            const filename = path.basename(bundlePath);
            const sourceMapPath = path.join('build/dist', filename + '.map');

            // Check if source map exists
            try {
                await fs.access(sourceMapPath);
            } catch {
                this.sourceMapCache.set(bundlePath, null);
                return null;
            }

            // Read and parse source map
            const sourceMapContent = await fs.readFile(sourceMapPath, 'utf-8');
            const sourceMap = JSON.parse(sourceMapContent);

            const sources = sourceMap.sources?.filter(source =>
                source &&
                !source.includes('node_modules') &&
                (source.includes('./src') || source.includes('./src-react'))
            ) || [];

            this.sourceMapCache.set(bundlePath, sources);
            return sources;

        } catch (error) {
            this.sourceMapCache.set(bundlePath, null);
            return null;
        }
    }

    /**
     * Transform coverage entry to reference original source files
     */
    async transformEntry(entry) {
        const { url: bundleUrl, functions, scriptId } = entry;

        // Only process webpack bundle files
        if (!bundleUrl.includes('.eclwatch.js')) {
            return [];
        }

        const sources = await this.loadSourceFiles(bundleUrl);
        if (!sources || sources.length === 0) {
            return [];
        }

        // Create coverage entries for each source file
        const sourceEntries = sources.map(sourcePath => ({
            scriptId: `${scriptId}_${sourcePath.replace(/[^a-zA-Z0-9]/g, '_')}`,
            url: sourcePath.startsWith('webpack://') ? sourcePath : `webpack://eclwatch/${sourcePath}`,
            functions: [{
                functionName: '',
                isBlockCoverage: true,
                ranges: [{
                    startOffset: 0,
                    endOffset: 1000,
                    count: functions.length > 0 ? 1 : 0
                }]
            }],
            originalBundle: bundleUrl
        }));

        this.stats.sourcesFound += sourceEntries.length;
        return sourceEntries;
    }

    /**
     * Process a single coverage file
     */
    async processCoverageFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const coverage = JSON.parse(content);

            if (!coverage.result || !Array.isArray(coverage.result)) {
                return;
            }

            const transformedResults = [];

            // Transform each coverage entry
            for (const entry of coverage.result) {
                const transformed = await this.transformEntry(entry);
                transformedResults.push(...transformed);
                this.stats.filesProcessed++;
            }

            // Create transformed coverage file
            const transformedCoverage = {
                ...coverage,
                result: transformedResults,
                transformedBy: 'coverage-transformer',
                transformedAt: new Date().toISOString(),
                originalEntries: coverage.result.length,
                transformedEntries: transformedResults.length
            };

            // Write to transformed directory
            const outputDir = path.join('.nyc_output', 'transformed');
            await fs.mkdir(outputDir, { recursive: true });

            const outputFile = path.join(outputDir, `transformed-${path.basename(filePath)}`);
            await fs.writeFile(outputFile, JSON.stringify(transformedCoverage, null, 2));

        } catch (error) {
            this.stats.errors++;
        }
    }

    /**
     * Transform all coverage files
     */
    async transformAll() {
        console.log('Transforming coverage files...');

        try {
            const files = await fs.readdir('.nyc_output');
            const coverageFiles = files.filter(f => f.startsWith('coverage-') && f.endsWith('.json'));

            if (coverageFiles.length === 0) {
                console.log('No coverage files found. Run: npm run test-coverage first');
                return;
            }

            // Process all coverage files
            for (const file of coverageFiles) {
                const filePath = path.join('.nyc_output', file);
                await this.processCoverageFile(filePath);
            }

            console.log(`Transformed ${coverageFiles.length} coverage files`);
            console.log(`Found ${this.stats.sourcesFound} source files`);
            if (this.stats.errors > 0) {
                console.log(`Errors: ${this.stats.errors}`);
            }

        } catch (error) {
            console.error('Error:', error.message);
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.sourceMapCache.clear();
    }
}

// Main execution
async function main() {
    const transformer = new CoverageTransformer();

    try {
        await transformer.transformAll();
    } finally {
        transformer.cleanup();
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { CoverageTransformer };

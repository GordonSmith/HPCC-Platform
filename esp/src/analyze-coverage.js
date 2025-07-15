#!/usr/bin/env node

/**
 * Coverage Analysis Tool
 * 
 * Analyzes transformed coverage files to provide insights about
 * source file coverage, React components, and testing gaps.
 */

const fs = require('fs').promises;
const path = require('path');

class CoverageAnalyzer {
    constructor() {
        this.sourceFiles = new Map();
        this.stats = {
            totalFiles: 0,
            typescriptFiles: 0,
            reactFiles: 0,
            sourceFiles: 0
        };
    }

    /**
     * Analyze a transformed coverage file
     */
    async analyzeCoverageFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const coverage = JSON.parse(content);

            if (!coverage.result || !Array.isArray(coverage.result)) {
                return;
            }

            // Analyze each coverage entry
            for (const entry of coverage.result) {
                this.analyzeEntry(entry);
            }

        } catch (error) {
            console.error(`Error analyzing ${filePath}:`, error.message);
        }
    }

    /**
     * Analyze a single coverage entry
     */
    analyzeEntry(entry) {
        const { url, functions } = entry;

        if (!url) return;

        this.stats.totalFiles++;

        // Categorize the file
        let category = 'other';
        if (url.includes('./src-react/') || url.includes('/src-react/')) {
            category = 'react';
            this.stats.reactFiles++;
            this.stats.sourceFiles++;
        } else if (url.includes('./src/') || url.includes('/src/')) {
            category = 'typescript';
            this.stats.typescriptFiles++;
            this.stats.sourceFiles++;
        }

        // Store source file info
        const sourceInfo = {
            url,
            category,
            functions: functions?.length || 0,
            executed: functions?.some(f => f.ranges?.some(r => r.count > 0)) || false
        };

        this.sourceFiles.set(url, sourceInfo);
    }

    /**
     * Generate analysis report
     */
    generateReport() {
        console.log('\nCoverage Analysis Report');
        console.log('========================');

        // Overall statistics
        console.log('\nOverall Statistics:');
        console.log(`  Total source files: ${this.stats.totalFiles}`);
        console.log(`  TypeScript files: ${this.stats.typescriptFiles}`);
        console.log(`  React files: ${this.stats.reactFiles}`);
        console.log(`  Our source files: ${this.stats.sourceFiles}`);

        // TypeScript/React files
        console.log('\nSource Files Covered:');
        const sourceFiles = Array.from(this.sourceFiles.values())
            .filter(f => f.category === 'typescript' || f.category === 'react')
            .sort((a, b) => a.url.localeCompare(b.url));

        let count = 0;
        for (const file of sourceFiles) {
            if (count >= 20) {
                console.log(`  ... and ${sourceFiles.length - count} more files`);
                break;
            }
            const status = file.executed ? '✓' : ' ';
            console.log(`  [${status}] ${file.url}`);
            count++;
        }

        // React component analysis
        const reactComponents = Array.from(this.sourceFiles.values())
            .filter(f => f.url.includes('components/') && f.url.endsWith('.tsx'))
            .sort((a, b) => a.url.localeCompare(b.url));

        if (reactComponents.length > 0) {
            console.log('\nReact Components:');
            for (const component of reactComponents.slice(0, 10)) {
                const status = component.executed ? '✓' : ' ';
                const name = path.basename(component.url, '.tsx');
                console.log(`  [${status}] ${name}`);
            }
            if (reactComponents.length > 10) {
                console.log(`  ... and ${reactComponents.length - 10} more components`);
            }
        }

        // Coverage quality
        const executedFiles = Array.from(this.sourceFiles.values()).filter(f => f.executed).length;
        const coveragePercentage = this.stats.totalFiles > 0 ? ((executedFiles / this.stats.totalFiles) * 100).toFixed(1) : '0';

        console.log('\nCoverage Quality:');
        console.log(`  Files with execution: ${executedFiles}/${this.stats.totalFiles} (${coveragePercentage}%)`);
    }

    /**
     * Export coverage data for external tools
     */
    async exportData() {
        const outputDir = '.nyc_output/analysis';
        await fs.mkdir(outputDir, { recursive: true });

        // Export source file list
        const sourceFilesList = Array.from(this.sourceFiles.values())
            .filter(f => f.category === 'typescript' || f.category === 'react')
            .map(f => ({
                file: f.url.replace('webpack://eclwatch/', ''),
                category: f.category,
                functions: f.functions,
                executed: f.executed
            }));

        await fs.writeFile(
            path.join(outputDir, 'source-files.json'),
            JSON.stringify(sourceFilesList, null, 2)
        );

        console.log(`\nExported analysis data to: ${outputDir}/source-files.json`);
    }

    /**
     * Analyze all transformed coverage files
     */
    async analyzeAll() {
        console.log('Starting Coverage Analysis...');

        try {
            const transformedDir = '.nyc_output/transformed';
            const files = await fs.readdir(transformedDir);
            const coverageFiles = files.filter(f => f.endsWith('.json') && f.includes('transformed-'));

            if (coverageFiles.length === 0) {
                console.log('No transformed coverage files found.');
                console.log('Run: npm run test-coverage-transform first');
                return;
            }

            console.log(`Found ${coverageFiles.length} transformed coverage files`);

            for (const file of coverageFiles) {
                const filePath = path.join(transformedDir, file);
                await this.analyzeCoverageFile(filePath);
            }

            this.generateReport();
            await this.exportData();

        } catch (error) {
            console.error('Error:', error.message);
        }
    }
}

// Main execution
async function main() {
    const analyzer = new CoverageAnalyzer();
    await analyzer.analyzeAll();
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { CoverageAnalyzer };

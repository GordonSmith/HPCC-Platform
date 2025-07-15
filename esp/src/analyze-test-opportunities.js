#!/usr/bin/env node

/**
 * Test Opportunity Analyzer
 * 
 * Analyzes coverage results to suggest specific test creation opportunities
 * Run after: npm run test-coverage-transform && npm run test-coverage-analyze
 */

const fs = require('fs');
const path = require('path');

// Check if analysis data exists
const analysisPath = '.nyc_output/analysis/source-files.json';
if (!fs.existsSync(analysisPath)) {
    console.error('❌ No coverage analysis found. Run: npm run test-coverage-transform && npm run test-coverage-analyze');
    process.exit(1);
}

const analysisData = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));

console.log('🔍 ECL Watch Test Opportunity Analysis');
console.log('=====================================\n');

// 1. Find files with no execution
const uncoveredFiles = analysisData.filter(item => !item.executed);
console.log(`🔴 HIGH PRIORITY: ${uncoveredFiles.length} files with NO execution coverage:`);
if (uncoveredFiles.length === 0) {
    console.log('   ✅ All files have some execution coverage!');
} else {
    uncoveredFiles.forEach(file => {
        const name = file.file.split('/').pop();
        const type = file.category === 'react' ? '📱 Component' : '🔧 Utility';
        console.log(`   ${type} ${name} (${file.functions} functions)`);
        console.log(`     File: ${file.file}`);

        // Suggest test type
        if (file.category === 'react') {
            if (file.file.includes('/components/')) {
                console.log(`     💡 Suggest: Component integration test with user interactions`);
            } else if (file.file.includes('/hooks/')) {
                console.log(`     💡 Suggest: Hook testing with React Testing Library`);
            } else {
                console.log(`     💡 Suggest: React module integration test`);
            }
        } else {
            if (file.file.includes('Util') || file.file.includes('/util/')) {
                console.log(`     💡 Suggest: Unit tests for utility functions`);
            } else if (file.file.includes('Session') || file.file.includes('Store')) {
                console.log(`     💡 Suggest: State management and persistence tests`);
            } else {
                console.log(`     💡 Suggest: TypeScript module unit tests`);
            }
        }
        console.log('');
    });
}

// 2. Analyze by category
console.log('\n📊 COVERAGE BY CATEGORY:');
const categories = analysisData.reduce((acc, item) => {
    if (!acc[item.category]) {
        acc[item.category] = { total: 0, executed: 0, files: [] };
    }
    acc[item.category].total++;
    if (item.executed) acc[item.category].executed++;
    acc[item.category].files.push(item);
    return acc;
}, {});

Object.entries(categories).forEach(([category, stats]) => {
    const percentage = ((stats.executed / stats.total) * 100).toFixed(1);
    const status = percentage === '100.0' ? '✅' : percentage >= '95.0' ? '🟡' : '🔴';
    console.log(`   ${status} ${category.toUpperCase()}: ${stats.executed}/${stats.total} (${percentage}%)`);
});

// 3. Component analysis
console.log('\n🧩 REACT COMPONENTS ANALYSIS:');
const componentFiles = analysisData.filter(item =>
    item.category === 'react' &&
    item.file.endsWith('.tsx') &&
    item.file.includes('/components/')
);

const componentsByDir = componentFiles.reduce((acc, file) => {
    const pathParts = file.file.split('/');
    const dir = pathParts.slice(0, -1).join('/');
    if (!acc[dir]) acc[dir] = { executed: 0, total: 0, components: [] };
    acc[dir].total++;
    if (file.executed) acc[dir].executed++;
    acc[dir].components.push(file);
    return acc;
}, {});

Object.entries(componentsByDir).forEach(([dir, stats]) => {
    const percentage = ((stats.executed / stats.total) * 100).toFixed(1);
    const status = percentage === '100.0' ? '✅' : '🟡';
    console.log(`   ${status} ${dir}: ${stats.executed}/${stats.total} (${percentage}%)`);

    // Show untested components
    const untested = stats.components.filter(c => !c.executed);
    if (untested.length > 0) {
        untested.forEach(component => {
            const name = component.file.split('/').pop().replace('.tsx', '');
            console.log(`     🔸 ${name} - needs integration test`);
        });
    }
});

// 4. Generate specific test suggestions
console.log('\n💡 SPECIFIC TEST CREATION SUGGESTIONS:');

// Form components
const formComponents = componentFiles.filter(f =>
    f.file.includes('/forms/') && f.executed
);
if (formComponents.length > 0) {
    console.log('\n   📝 FORM COMPONENTS (enhance with validation tests):');
    formComponents.forEach(component => {
        const name = component.file.split('/').pop().replace('.tsx', '');
        console.log(`     • ${name}: Test form validation, submission, error states`);
    });
}

// Control components  
const controlComponents = componentFiles.filter(f =>
    f.file.includes('/controls/') && f.executed
);
if (controlComponents.length > 0) {
    console.log('\n   🎛️  CONTROL COMPONENTS (enhance with interaction tests):');
    controlComponents.forEach(component => {
        const name = component.file.split('/').pop().replace('.tsx', '');
        console.log(`     • ${name}: Test user interactions, props variations, edge cases`);
    });
}

// Utility functions
const utilityFiles = analysisData.filter(item =>
    item.category === 'typescript' &&
    (item.file.includes('Util') || item.file.includes('/util/') || item.file.includes('Helper'))
);
if (utilityFiles.length > 0) {
    console.log('\n   🔧 UTILITY FUNCTIONS (add unit tests):');
    utilityFiles.forEach(util => {
        const name = util.file.split('/').pop().replace('.ts', '');
        const status = util.executed ? '✅' : '❌';
        console.log(`     ${status} ${name}: Unit tests for all ${util.functions} functions`);
    });
}

// 5. Test file generation suggestions
console.log('\n📁 SUGGESTED TEST FILE STRUCTURE:');

const testSuggestions = [];

// Group by test type
uncoveredFiles.forEach(file => {
    if (file.category === 'react' && file.file.includes('/components/')) {
        const componentName = file.file.split('/').pop().replace('.tsx', '');
        const testPath = `tests/components/${componentName.toLowerCase()}.spec.ts`;
        testSuggestions.push({
            type: 'component',
            file: testPath,
            description: `Integration test for ${componentName} component`
        });
    } else if (file.category === 'typescript') {
        const moduleName = file.file.split('/').pop().replace('.ts', '');
        const testPath = `tests/units/${moduleName.toLowerCase()}.spec.ts`;
        testSuggestions.push({
            type: 'unit',
            file: testPath,
            description: `Unit tests for ${moduleName} module`
        });
    }
});

// Add workflow tests
testSuggestions.push(
    {
        type: 'workflow',
        file: 'tests/workflows/activities-workflow.spec.ts',
        description: 'End-to-end test for Activities tab workflow'
    },
    {
        type: 'workflow',
        file: 'tests/workflows/file-management.spec.ts',
        description: 'File upload, download, and management workflow'
    },
    {
        type: 'api',
        file: 'tests/api/workunit-api.spec.ts',
        description: 'API integration tests for workunit operations'
    }
);

testSuggestions.forEach(suggestion => {
    const icon = suggestion.type === 'component' ? '🧩' :
        suggestion.type === 'unit' ? '🔧' :
            suggestion.type === 'workflow' ? '🔄' : '🌐';
    console.log(`   ${icon} ${suggestion.file}`);
    console.log(`     ${suggestion.description}`);
});

// 6. Next steps
console.log('\n🚀 NEXT STEPS:');
console.log('   1. Create test files for uncovered components/modules');
console.log('   2. Add user workflow tests for main application features');
console.log('   3. Enhance existing tests with error scenarios and edge cases');
console.log('   4. Add API integration tests for backend communication');
console.log('   5. Run coverage analysis after adding tests to measure improvement');

console.log('\n📋 QUICK COMMANDS:');
console.log('   # Re-analyze coverage after adding tests:');
console.log('   npm run test-coverage && npm run test-coverage-transform && npm run test-coverage-analyze');
console.log('');
console.log('   # Run this analyzer again:');
console.log('   node analyze-test-opportunities.js');

// Save detailed analysis to file
const detailedReport = {
    timestamp: new Date().toISOString(),
    summary: {
        totalFiles: analysisData.length,
        coveredFiles: analysisData.filter(f => f.executed).length,
        uncoveredFiles: uncoveredFiles.length,
        coverageQuality: ((analysisData.filter(f => f.executed).length / analysisData.length) * 100).toFixed(1)
    },
    uncoveredFiles,
    categories,
    testSuggestions
};

fs.writeFileSync('.nyc_output/analysis/test-opportunities.json', JSON.stringify(detailedReport, null, 2));
console.log('💾 Detailed analysis saved to: .nyc_output/analysis/test-opportunities.json');

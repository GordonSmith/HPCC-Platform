#!/usr/bin/env node
/**
 * Script to merge all vcpkg SPDX files into a single consolidated SPDX document
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base directory containing vcpkg packages
const VCPKG_PACKAGES_DIR = './build/vcpkg_packages';
const OUTPUT_FILE = './hpcc-platform.spdx.json';

/**
 * Recursively find all vcpkg.spdx.json files
 */
function findSpdxFiles(dir) {
    const spdxFiles = [];
    
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                // Recursively search subdirectories
                spdxFiles.push(...findSpdxFiles(fullPath));
            } else if (entry.name === 'vcpkg.spdx.json') {
                spdxFiles.push(fullPath);
            }
        }
    } catch (error) {
        console.warn(`Warning: Could not read directory ${dir}: ${error.message}`);
    }
    
    return spdxFiles;
}

/**
 * Generate a unique SPDX ID by prefixing with package name
 */
function generateUniqueId(originalId, packageName, counter) {
    if (originalId === 'SPDXRef-DOCUMENT') {
        return originalId; // Keep the main document ID
    }
    
    // Remove SPDXRef- prefix if present, add package prefix
    const cleanId = originalId.replace(/^SPDXRef-/, '');
    return `SPDXRef-${packageName}-${cleanId}`;
}

/**
 * Update references in relationships and other places
 */
function updateReferences(obj, idMapping) {
    if (typeof obj === 'string') {
        return idMapping[obj] || obj;
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => updateReferences(item, idMapping));
    }
    
    if (typeof obj === 'object' && obj !== null) {
        const updated = {};
        for (const [key, value] of Object.entries(obj)) {
            if (key === 'SPDXID' || key === 'spdxElementId' || key === 'relatedSpdxElement') {
                updated[key] = idMapping[value] || value;
            } else {
                updated[key] = updateReferences(value, idMapping);
            }
        }
        return updated;
    }
    
    return obj;
}

/**
 * Main merge function
 */
function mergeSpdxFiles() {
    console.log('Finding SPDX files...');
    const spdxFiles = findSpdxFiles(VCPKG_PACKAGES_DIR);
    
    if (spdxFiles.length === 0) {
        console.error('No SPDX files found!');
        process.exit(1);
    }
    
    console.log(`Found ${spdxFiles.length} SPDX files`);
    
    // Initialize the merged document
    const mergedSpdx = {
        "$schema": "https://raw.githubusercontent.com/spdx/spdx-spec/v2.2.1/schemas/spdx-schema.json",
        "spdxVersion": "SPDX-2.2",
        "dataLicense": "CC0-1.0",
        "SPDXID": "SPDXRef-DOCUMENT",
        "documentNamespace": `https://spdx.org/spdxdocs/vcpkg-merged-${Date.now()}`,
        "name": "HPCC-Platform vcpkg dependencies",
        "creationInfo": {
            "creators": [
                "Tool: vcpkg-spdx-merger"
            ],
            "created": new Date().toISOString()
        },
        "relationships": [],
        "packages": [],
        "files": []
    };
    
    const seenPackages = new Map(); // Track packages by name to deduplicate
    const seenFiles = new Map(); // Track files by fileName to deduplicate  
    const packageIdMap = new Map(); // Map original package IDs to canonical IDs
    const fileIdMap = new Map(); // Map original file IDs to canonical IDs
    let fileCounter = 0;
    
    // Process each SPDX file
    for (const spdxFile of spdxFiles) {
        console.log(`Processing ${spdxFile}...`);
        
        try {
            const content = fs.readFileSync(spdxFile, 'utf8');
            const spdxData = JSON.parse(content);
            
            // Extract package name from the file path
            const pathParts = spdxFile.split(path.sep);
            const packageDirIndex = pathParts.findIndex(part => part.endsWith('_x64-linux-dynamic'));
            const packageName = packageDirIndex >= 0 ? 
                pathParts[packageDirIndex].replace('_x64-linux-dynamic', '') : 
                `pkg${fileCounter++}`;
            
            // Process packages first to establish canonical IDs
            if (spdxData.packages) {
                for (const pkg of spdxData.packages) {
                    const packageKey = pkg.name;
                    
                    if (!seenPackages.has(packageKey)) {
                        // First time seeing this package - use it as canonical
                        const canonicalId = generateUniqueId(pkg.SPDXID, packageName, fileCounter);
                        const canonicalPkg = { ...pkg, SPDXID: canonicalId };
                        
                        seenPackages.set(packageKey, canonicalPkg);
                        mergedSpdx.packages.push(canonicalPkg);
                        packageIdMap.set(pkg.SPDXID, canonicalId);
                    } else {
                        // Package already exists - map this ID to the canonical one
                        const canonicalPkg = seenPackages.get(packageKey);
                        packageIdMap.set(pkg.SPDXID, canonicalPkg.SPDXID);
                    }
                }
            }
            
            // Process files with deduplication
            if (spdxData.files) {
                for (const file of spdxData.files) {
                    const fileKey = file.fileName;
                    
                    if (!seenFiles.has(fileKey)) {
                        // First time seeing this file - use it as canonical
                        const canonicalId = generateUniqueId(file.SPDXID, packageName, fileCounter);
                        const canonicalFile = { ...file, SPDXID: canonicalId };
                        
                        seenFiles.set(fileKey, canonicalFile);
                        mergedSpdx.files.push(canonicalFile);
                        fileIdMap.set(file.SPDXID, canonicalId);
                    } else {
                        // File already exists - map this ID to the canonical one
                        const canonicalFile = seenFiles.get(fileKey);
                        fileIdMap.set(file.SPDXID, canonicalFile.SPDXID);
                    }
                }
            }
            
            // Process relationships with updated ID mapping
            if (spdxData.relationships) {
                for (const rel of spdxData.relationships) {
                    const updatedRel = {
                        spdxElementId: packageIdMap.get(rel.spdxElementId) || fileIdMap.get(rel.spdxElementId) || rel.spdxElementId,
                        relationshipType: rel.relationshipType,
                        relatedSpdxElement: packageIdMap.get(rel.relatedSpdxElement) || fileIdMap.get(rel.relatedSpdxElement) || rel.relatedSpdxElement
                    };
                    
                    // Only add relationship if both elements exist in our merged data
                    const hasSourceElement = updatedRel.spdxElementId === 'SPDXRef-DOCUMENT' || 
                                           mergedSpdx.packages.some(p => p.SPDXID === updatedRel.spdxElementId) ||
                                           mergedSpdx.files.some(f => f.SPDXID === updatedRel.spdxElementId);
                    const hasTargetElement = updatedRel.relatedSpdxElement === 'SPDXRef-DOCUMENT' ||
                                           mergedSpdx.packages.some(p => p.SPDXID === updatedRel.relatedSpdxElement) ||
                                           mergedSpdx.files.some(f => f.SPDXID === updatedRel.relatedSpdxElement);
                    
                    if (hasSourceElement && hasTargetElement) {
                        // Check for duplicate relationships
                        const relKey = `${updatedRel.spdxElementId}:${updatedRel.relationshipType}:${updatedRel.relatedSpdxElement}`;
                        if (!mergedSpdx.relationships.some(r => 
                            `${r.spdxElementId}:${r.relationshipType}:${r.relatedSpdxElement}` === relKey)) {
                            mergedSpdx.relationships.push(updatedRel);
                        }
                    }
                }
            }
            
        } catch (error) {
            console.error(`Error processing ${spdxFile}: ${error.message}`);
        }
    }
    
    // Write the merged file
    console.log(`Writing merged SPDX to ${OUTPUT_FILE}...`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mergedSpdx, null, 2));
    
    console.log('Merge completed successfully!');
    console.log(`- Processed ${spdxFiles.length} SPDX files`);
    console.log(`- Unique packages: ${mergedSpdx.packages.length}`);
    console.log(`- Unique files: ${mergedSpdx.files.length}`);
    console.log(`- Total relationships: ${mergedSpdx.relationships.length}`);
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
    mergeSpdxFiles();
}

export { mergeSpdxFiles, findSpdxFiles };

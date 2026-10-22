#!/usr/bin/env node
// ---------------------------------------------------------------------------
// CLI tool for importing schemes from CSV or JSON files.
// Usage: node scripts/importSchemes.js <path-to-json-or-csv> [--dry-run]
// ---------------------------------------------------------------------------
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { importSchemesBatch, parseCSV } from '../src/data/importer.js';

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
SchemeSaathi Scheme Importer
Usage:
  node scripts/importSchemes.js <file.json|file.csv> [--dry-run]

Options:
  --dry-run   Validate and generate import report without modifying schemes.json
  --help      Show this help message
`);
  process.exit(0);
}

const filePath = resolve(process.cwd(), args[0]);
const isDryRun = args.includes('--dry-run');

if (!existsSync(filePath)) {
  console.error(`Error: File not found at ${filePath}`);
  process.exit(1);
}

console.log(`Reading input file: ${filePath}`);
const content = readFileSync(filePath, 'utf-8');
let rawRecords = [];

if (filePath.endsWith('.csv')) {
  rawRecords = parseCSV(content);
} else {
  try {
    const parsed = JSON.parse(content);
    rawRecords = Array.isArray(parsed) ? parsed : (parsed.schemes || [parsed]);
  } catch (err) {
    console.error(`Error parsing JSON: ${err.message}`);
    process.exit(1);
  }
}

const targetPath = resolve(process.cwd(), 'src/data/schemes.json');
let currentData = { schemes: [] };
if (existsSync(targetPath)) {
  try {
    currentData = JSON.parse(readFileSync(targetPath, 'utf-8'));
  } catch (err) {
    console.warn(`Warning reading current schemes.json: ${err.message}`);
  }
}

console.log(`Starting import for ${rawRecords.length} records...`);
const result = importSchemesBatch(rawRecords, currentData.schemes || []);

console.log('\n' + result.report + '\n');

if (!isDryRun && result.imported.length > 0) {
  // Merge without duplicates by ID
  const map = new Map();
  for (const s of (currentData.schemes || [])) {
    map.set(s.id, s);
  }
  for (const s of result.imported) {
    map.set(s.id, s);
  }
  currentData.schemes = Array.from(map.values());
  currentData._metadata = {
    ...currentData._metadata,
    lastUpdated: new Date().toISOString(),
    totalSchemes: currentData.schemes.length,
  };

  writeFileSync(targetPath, JSON.stringify(currentData, null, 2), 'utf-8');
  console.log(`Updated ${targetPath} with ${currentData.schemes.length} total schemes.`);
} else if (isDryRun) {
  console.log('Dry run complete. No files were modified.');
}

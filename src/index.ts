#!/usr/bin/env node

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Welcome to write!');
console.log('This is a placeholder for the write application.');

// Read package.json for version info
interface PackageJson {
  version: string;
  name: string;
  [key: string]: unknown;
}

const packageJson: PackageJson = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'),
);

// Export something for programmatic use
export default {
  version: packageJson.version,
  name: 'write',
};

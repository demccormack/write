#!/usr/bin/env node
import { displayName, version } from './version.js';

const args = process.argv.slice(2);
if (args.includes('-v') || args.includes('--version')) {
  console.log(`${displayName} ${version}`);
  process.exit(0);
}

console.log('Welcome to write!');
console.log('This is a placeholder for the write application.');

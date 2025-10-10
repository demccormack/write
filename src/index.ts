#!/usr/bin/env node
import { displayName, version } from './commands/version.js';
import { createNewProject } from './commands/new.js';

const args = process.argv.slice(2);

// Handle version flag
if (args.includes('-v') || args.includes('--version')) {
  console.log(`${displayName} ${version}`);
  process.exit(0);
}

// Handle help flag
if (args.includes('-h') || args.includes('--help') || args.length === 0) {
  console.log(`${displayName} ${version}`);
  console.log('');
  console.log('Usage:');
  console.log('  write new <title>     Create a new LaTeX book project');
  console.log('  write --version       Show version');
  console.log('  write --help          Show this help');
  process.exit(0);
}

// Parse commands
const [command, ...commandArgs] = args;

switch (command) {
  case 'new': {
    if (commandArgs.length === 0) {
      console.error('Error: Please provide a book title');
      console.log('Usage: write new <title>');
      process.exit(1);
    }
    const title = commandArgs.join(' ');
    await createNewProject(title);
    break;
  }

  default:
    console.error(`Error: Unknown command '${command}'`);
    console.log('Run "write --help" for usage information');
    process.exit(1);
}

#!/usr/bin/env node
import { displayName, version } from './commands/version.js';
import { createNewProject } from './commands/new.js';
import { runSetup } from './commands/setup.js';
import { runRemoteAdd } from './commands/remote.js';

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
  console.log('  write new <title>     Create a new Typst book project');
  console.log('  write remote add github [--name <n>] [--owner <o>]');
  console.log(
    '                        [--public|--private] [--description <d>] [-y]',
  );
  console.log(
    '                        Create a GitHub repository for this project',
  );
  console.log(
    '  write setup           Finish or resume Git setup for a project',
  );
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

  case 'setup':
    process.exit(await runSetup());
    break;

  case 'remote': {
    const [action, provider, ...flags] = commandArgs;
    if (action !== 'add' || (provider !== 'github' && provider !== 'gh')) {
      console.error('Usage: write remote add <github|gh> [options]');
      process.exit(1);
    }
    try {
      process.exit(await runRemoteAdd(flags));
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
    break;
  }

  default:
    console.error(`Error: Unknown command '${command}'`);
    console.log('Run "write --help" for usage information');
    process.exit(1);
}

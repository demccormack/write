#!/usr/bin/env node
import { displayName, version } from './commands/version.js';
import { createNewProject } from './commands/new.js';
import { runSetup } from './commands/setup.js';
import { runRemoteAdd } from './commands/remote.js';
import { createPrompt } from './prompt.js';
import type { GitIdentity } from './git.js';

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
  console.log('  write-cli new <title> Create a new Typst book project');
  console.log(
    '                        [--no-git] [--author <name>] [--email <address>]',
  );
  console.log('  write-cli remote add github [--name <n>] [--owner <o>]');
  console.log(
    '                        [--public|--private] [--description <d>] [-y]',
  );
  console.log(
    '                        Create a GitHub repository for this project',
  );
  console.log(
    '  write-cli setup       Finish or resume Git setup [--author <name>] [--email <address>]',
  );
  console.log('  write-cli --version   Show version');
  console.log('  write-cli --help      Show this help');
  process.exit(0);
}

// Parse commands
const [command, ...commandArgs] = args;

switch (command) {
  case 'new': {
    let git = true;
    let author: string | undefined;
    let email: string | undefined;
    const titleWords: string[] = [];
    for (let i = 0; i < commandArgs.length; i++) {
      const arg = commandArgs[i];
      if (arg === '--no-git') git = false;
      else if (arg === '--author') author = commandArgs[++i];
      else if (arg === '--email') email = commandArgs[++i];
      else titleWords.push(arg);
    }
    if (titleWords.length === 0) {
      console.error('Error: Please provide a book title');
      console.log(
        'Usage: write-cli new <title> [--no-git] [--author <name>] [--email <address>]',
      );
      process.exit(1);
    }
    if ((!author || (git && !email)) && process.stdin.isTTY) {
      const prompt = createPrompt();
      try {
        author ||= await prompt.ask('Book author name or pen name');
        if (git && !email) {
          console.log(
            'For privacy, use the GitHub noreply address after enabling both email privacy settings. If you do not have an account yet, rerun with --no-git and use "write-cli setup" after creating one.',
          );
          email = await prompt.ask(
            'GitHub noreply email (enable email privacy at https://github.com/settings/emails)',
          );
        }
      } finally {
        prompt.close();
      }
    }
    if (git && (!author || !email)) {
      console.error(
        'Error: Git setup requires --author and --email when running non-interactively. Use your GitHub noreply email, or pass --no-git and run "write-cli setup" later.',
      );
      process.exit(1);
    }
    await createNewProject(titleWords.join(' '), {
      git,
      author: author || 'Your Name',
      email,
    });
    break;
  }

  case 'setup': {
    let name: string | undefined;
    let email: string | undefined;
    for (let i = 0; i < commandArgs.length; i++) {
      const arg = commandArgs[i];
      if (arg === '--author') name = commandArgs[++i];
      else if (arg === '--email') email = commandArgs[++i];
      else {
        console.error(`Error: Unknown setup option '${arg}'`);
        process.exit(1);
      }
    }
    const identity: GitIdentity | undefined =
      name && email ? { name, email } : undefined;
    if ((name || email) && !identity) {
      console.error('Error: Provide both --author and --email');
      process.exit(1);
    }
    process.exit(await runSetup(process.cwd(), identity));
    break;
  }

  case 'remote': {
    const [action, provider, ...flags] = commandArgs;
    if (action !== 'add' || (provider !== 'github' && provider !== 'gh')) {
      console.error('Usage: write-cli remote add <github|gh> [options]');
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
    console.log('Run "write-cli --help" for usage information');
    process.exit(1);
}

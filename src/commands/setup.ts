import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { GitSetupError, setupGitRepo } from '../git.ts';
import { exec } from '../github/gh.ts';

/**
 * `write setup`: finish (or resume) local setup of a book project.
 * Returns the process exit code.
 */
export async function runSetup(cwd = process.cwd()): Promise<number> {
  try {
    await access(join(cwd, 'book.toml'));
  } catch {
    console.error(
      'Error: This directory is not a write book project (book.toml not found).',
    );
    return 1;
  }
  try {
    const { committed } = await setupGitRepo(exec, cwd);
    console.log(
      committed
        ? '✓ Git repository ready with an initial commit'
        : '✓ Git repository already set up',
    );
    return 0;
  } catch (error) {
    if (!(error instanceof GitSetupError)) throw error;
    console.error(`✗ ${error.message}`);
    console.error('Then run "write setup" again to resume.');
    return 1;
  }
}

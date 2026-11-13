import { access } from 'node:fs/promises';
import { join } from 'node:path';
import {
  getLocalGitIdentity,
  GitSetupError,
  setupGitRepo,
  type GitIdentity,
} from '../git.ts';
import { exec } from '../github/gh.ts';
import { createPrompt } from '../prompt.ts';

/**
 * `write-cli setup`: finish (or resume) local setup of a book project.
 * Returns the process exit code.
 */
export async function runSetup(
  cwd = process.cwd(),
  identity?: GitIdentity,
): Promise<number> {
  try {
    await access(join(cwd, 'book.toml'));
  } catch {
    console.error(
      'Error: This directory is not a write book project (book.toml not found).',
    );
    return 1;
  }
  try {
    let projectIdentity = identity ?? (await getLocalGitIdentity(exec, cwd));
    if (!projectIdentity && process.stdin.isTTY) {
      const prompt = createPrompt();
      try {
        const name = await prompt.ask('Git author name or pen name');
        console.log(
          'Use the GitHub noreply address after enabling both email privacy settings at https://github.com/settings/emails.',
        );
        const email = await prompt.ask(
          'GitHub noreply email (enable email privacy at https://github.com/settings/emails)',
        );
        projectIdentity = { name, email };
      } finally {
        prompt.close();
      }
    }
    const { committed } = await setupGitRepo(exec, cwd, projectIdentity);
    console.log(
      committed
        ? '✓ Git repository ready with an initial commit'
        : '✓ Git repository already set up',
    );
    return 0;
  } catch (error) {
    if (!(error instanceof GitSetupError)) throw error;
    console.error(`✗ ${error.message}`);
    console.error('Then run "write-cli setup" again to resume.');
    return 1;
  }
}

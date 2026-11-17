import { access } from 'node:fs/promises';
import { join } from 'node:path';
import {
  getGitIdentity,
  isOwnRepo,
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
  identity?: Partial<GitIdentity>,
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
    const local = (await isOwnRepo(exec, cwd))
      ? await getGitIdentity(exec, cwd, 'local')
      : { name: '', email: '' };
    let name = identity?.name?.trim() || local.name;
    let email = identity?.email?.trim() || local.email;
    const defaults =
      !name || !email
        ? await getGitIdentity(exec, cwd, 'global')
        : { name: '', email: '' };
    if ((!name || !email) && process.stdin.isTTY) {
      const prompt = createPrompt();
      try {
        name ||= await prompt.ask('Git author name or pen name', defaults.name);
        if (!email) {
          console.log(
            'For privacy, use your GitHub noreply address. Press Enter to use the globally configured Git email shown below, if any.',
          );
          email = await prompt.ask(
            'GitHub noreply email (enable email privacy at https://github.com/settings/emails)',
            defaults.email,
          );
        }
      } finally {
        prompt.close();
      }
    }
    name ||= defaults.name;
    email ||= defaults.email;
    const projectIdentity = name ? { name, email } : undefined;
    if (projectIdentity && !projectIdentity.email.trim()) {
      throw new GitSetupError(
        'An email address is required to finish Git setup. Run "write-cli setup" again when you have your GitHub noreply email.',
      );
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

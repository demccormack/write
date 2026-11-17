import { realpath } from 'node:fs/promises';
import type { Exec } from './github/gh.ts';

export const GIT_INSTALL_URL = 'https://git-scm.com/downloads';
export const INITIAL_TAG = 'v0.0.1';

/** Thrown with a user-friendly message when git setup cannot continue. */
export class GitSetupError extends Error {}

// Keep likely credentials out of the initial commit
const SENSITIVE_PATTERNS = [
  ':(exclude,glob)**/.env',
  ':(exclude,glob)**/.env.*',
  ':(exclude,glob)**/*.pem',
  ':(exclude,glob)**/*.key',
  ':(exclude,glob)**/id_rsa*',
];

/** True when `cwd` is the root of its own Git repository (not a parent's). */
export async function isOwnRepo(run: Exec, cwd: string): Promise<boolean> {
  const top = await run('git', ['rev-parse', '--show-toplevel'], { cwd });
  if (top.code !== 0) return false;
  try {
    return (await realpath(top.stdout.trim())) === (await realpath(cwd));
  } catch {
    return false;
  }
}

export interface GitSetupResult {
  /** True when this call created the initial commit. */
  committed: boolean;
}

export interface GitIdentity {
  name: string;
  email: string;
}

export async function getGitIdentity(
  run: Exec,
  cwd: string,
  scope: 'local' | 'global',
): Promise<GitIdentity> {
  const read = async (key: string) => {
    const result = await run('git', ['config', `--${scope}`, '--get', key], {
      cwd,
    });
    if (result.code === 0) return result.stdout.trim();
    // Git is optional when creating a project with --no-git.
    if (result.code === 1 || result.code === 127) return '';
    throw new GitSetupError(
      `Could not read ${scope} Git ${key}: ${result.stderr.trim()}`,
    );
  };
  return { name: await read('user.name'), email: await read('user.email') };
}

/**
 * Idempotently make `cwd` its own Git repository, committing only with an email.
 * Safe to re-run after fixing whatever made it fail.
 */
export async function setupGitRepo(
  run: Exec,
  cwd: string,
  identity?: GitIdentity,
): Promise<GitSetupResult> {
  const gitEnv = { ...process.env };
  delete gitEnv.GIT_AUTHOR_NAME;
  delete gitEnv.GIT_AUTHOR_EMAIL;
  delete gitEnv.GIT_COMMITTER_NAME;
  delete gitEnv.GIT_COMMITTER_EMAIL;
  const git = (...args: string[]) => run('git', args, { cwd, env: gitEnv });
  const tagInitialCommit = async () => {
    if (
      (await git('rev-parse', '--verify', `refs/tags/${INITIAL_TAG}`)).code ===
      0
    ) {
      return;
    }
    const roots = await git('rev-list', '--max-parents=0', 'HEAD');
    if (roots.code !== 0) {
      throw new GitSetupError(
        `Could not find initial commit: ${roots.stderr.trim()}`,
      );
    }
    const tag = await git(
      'tag',
      INITIAL_TAG,
      roots.stdout.trim().split('\n')[0],
    );
    if (tag.code !== 0) {
      throw new GitSetupError(`Initial tag failed: ${tag.stderr.trim()}`);
    }
  };

  if ((await git('--version')).code !== 0) {
    throw new GitSetupError(
      `Git is not installed (or not on your PATH). Install it from ${GIT_INSTALL_URL}`,
    );
  }

  if (!(await isOwnRepo(run, cwd))) {
    const init = await git('init', '-b', 'main');
    if (init.code !== 0) {
      throw new GitSetupError(`git init failed: ${init.stderr.trim()}`);
    }
  }

  if ((await git('rev-parse', '--verify', 'HEAD')).code === 0) {
    await tagInitialCommit();
    return { committed: false };
  }

  if (identity) {
    if (!identity.name.trim()) {
      throw new GitSetupError(
        'A project-specific Git author name is required.',
      );
    }
    const name = await git('config', '--local', 'user.name', identity.name);
    if (name.code !== 0) {
      throw new GitSetupError(
        `Could not set local Git name: ${name.stderr.trim()}`,
      );
    }
    if (!identity.email.trim()) {
      return { committed: false };
    }
    const email = await git('config', '--local', 'user.email', identity.email);
    if (email.code !== 0) {
      throw new GitSetupError(
        `Could not set local Git email: ${email.stderr.trim()}`,
      );
    }
  }

  const localIdentity = await getGitIdentity(run, cwd, 'local');
  if (!localIdentity.name || !localIdentity.email) {
    throw new GitSetupError(
      [
        'Git needs a project-specific author name and email before the initial commit.',
        'Run "write-cli setup" interactively or pass --author and --email, using your GitHub noreply email.',
      ].join('\n'),
    );
  }

  const ident = (kind: string) =>
    git('-c', 'user.useConfigOnly=true', 'var', kind);
  const identityOk =
    (await ident('GIT_AUTHOR_IDENT')).code === 0 &&
    (await ident('GIT_COMMITTER_IDENT')).code === 0;
  if (!identityOk) {
    throw new GitSetupError(
      [
        'Git could not use this project-specific identity to create the initial commit.',
        'Run "write-cli setup" and enter your author name and GitHub noreply email again.',
      ].join('\n'),
    );
  }

  await git('add', '-A', '--', '.', ...SENSITIVE_PATTERNS);
  const commit = await git('commit', '-m', 'Initial commit');
  if (commit.code !== 0) {
    throw new GitSetupError(`Initial commit failed: ${commit.stderr.trim()}`);
  }
  await tagInitialCommit();
  return { committed: true };
}

import { realpath } from 'node:fs/promises';
import type { Exec } from './github/gh.ts';

export const GIT_INSTALL_URL = 'https://git-scm.com/downloads';

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

export async function getLocalGitIdentity(
  run: Exec,
  cwd: string,
): Promise<GitIdentity | undefined> {
  const git = (...args: string[]) => run('git', args, { cwd });
  const name = await git('config', '--local', '--get', 'user.name');
  const email = await git('config', '--local', '--get', 'user.email');
  if (name.code !== 0 || email.code !== 0) return undefined;
  return { name: name.stdout.trim(), email: email.stdout.trim() };
}

/**
 * Idempotently make `cwd` its own Git repository with an initial commit.
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
    return { committed: false };
  }

  if (identity) {
    if (!identity.name.trim() || !identity.email.trim()) {
      throw new GitSetupError(
        'A project-specific Git name and email address are required before the initial commit.',
      );
    }
    const name = await git('config', '--local', 'user.name', identity.name);
    if (name.code !== 0) {
      throw new GitSetupError(
        `Could not set local Git name: ${name.stderr.trim()}`,
      );
    }
    const email = await git('config', '--local', 'user.email', identity.email);
    if (email.code !== 0) {
      throw new GitSetupError(
        `Could not set local Git email: ${email.stderr.trim()}`,
      );
    }
  }

  if (!(await getLocalGitIdentity(run, cwd))) {
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
  return { committed: true };
}

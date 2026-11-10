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

/**
 * Idempotently make `cwd` its own Git repository with an initial commit.
 * Safe to re-run after fixing whatever made it fail.
 */
export async function setupGitRepo(
  run: Exec,
  cwd: string,
): Promise<GitSetupResult> {
  const git = (...args: string[]) => run('git', args, { cwd });

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

  // useConfigOnly stops git guessing an identity from the hostname
  const ident = (kind: string) =>
    git('-c', 'user.useConfigOnly=true', 'var', kind);
  const identityOk =
    (await ident('GIT_AUTHOR_IDENT')).code === 0 &&
    (await ident('GIT_COMMITTER_IDENT')).code === 0;
  if (!identityOk) {
    throw new GitSetupError(
      [
        'Git needs to know who you are before it can save your work. Run:',
        '  git config --global user.name "Your Name"',
        '  git config --global user.email "you@example.com"',
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

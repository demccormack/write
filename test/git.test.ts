import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { GitSetupError, setupGitRepo } from '../src/git.ts';
import { exec, type Exec } from '../src/github/gh.ts';

describe('setupGitRepo', () => {
  let dir: string;
  const saved = { ...process.env };

  beforeEach(async () => {
    dir = await realpath(await mkdtemp(join(tmpdir(), 'write-git-')));
    await writeFile(join(dir, 'book.toml'), 'x');
    await writeFile(join(dir, '.env'), 'SECRET=1');
    process.env.GIT_AUTHOR_NAME = process.env.GIT_COMMITTER_NAME = 'Test';
    process.env.GIT_AUTHOR_EMAIL = process.env.GIT_COMMITTER_EMAIL =
      'test@example.com';
  });
  afterEach(async () => {
    process.env = { ...saved };
    await rm(dir, { recursive: true, force: true });
  });

  test('initialises and commits, excluding sensitive files, and is idempotent', async () => {
    assert.deepStrictEqual(await setupGitRepo(exec, dir), { committed: true });
    const tracked = (await exec('git', ['ls-files'], { cwd: dir })).stdout;
    assert.ok(tracked.includes('book.toml'));
    assert.ok(!tracked.includes('.env'));
    assert.deepStrictEqual(await setupGitRepo(exec, dir), { committed: false });
  });

  test('creates its own repo inside a parent repository', async () => {
    await exec('git', ['init'], { cwd: dir });
    const child = join(dir, 'book');
    await mkdir(child);
    await writeFile(join(child, 'book.toml'), 'x');
    await setupGitRepo(exec, child);
    const top = (
      await exec('git', ['rev-parse', '--show-toplevel'], { cwd: child })
    ).stdout.trim();
    assert.strictEqual(await realpath(top), child);
  });

  test('explains how to install git when it is missing', async () => {
    const run: Exec = async () => ({ code: 127, stdout: '', stderr: 'nope' });
    await assert.rejects(setupGitRepo(run, dir), (e: Error) => {
      assert.ok(e instanceof GitSetupError);
      assert.match(e.message, /git-scm\.com/);
      return true;
    });
  });

  test('explains how to configure identity, then resumes once set', async () => {
    const noIdentity: Exec = (cmd, args, o) =>
      args.includes('var')
        ? Promise.resolve({ code: 128, stdout: '', stderr: 'unknown' })
        : exec(cmd, args, o);
    await assert.rejects(setupGitRepo(noIdentity, dir), /user\.name/);
    assert.deepStrictEqual(await setupGitRepo(exec, dir), { committed: true });
  });
});

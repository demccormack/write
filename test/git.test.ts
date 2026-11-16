import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { GitSetupError, setupGitRepo } from '../src/git.ts';
import { exec, type Exec } from '../src/github/gh.ts';
import { runSetup } from '../src/commands/setup.ts';

describe('setupGitRepo', () => {
  let dir: string;
  const identity = { name: 'Test Pen Name', email: 'test@example.com' };
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
    assert.deepStrictEqual(await setupGitRepo(exec, dir, identity), {
      committed: true,
    });
    const tracked = (await exec('git', ['ls-files'], { cwd: dir })).stdout;
    assert.ok(tracked.includes('book.toml'));
    assert.ok(!tracked.includes('.env'));
    assert.deepStrictEqual(await setupGitRepo(exec, dir), { committed: false });
    assert.strictEqual(
      (
        await exec('git', ['config', '--local', '--get', 'user.email'], {
          cwd: dir,
        })
      ).stdout.trim(),
      identity.email,
    );
  });

  test('does not use a global or environment Git identity for the first commit', async () => {
    await assert.rejects(
      setupGitRepo(exec, dir),
      /project-specific author name and email/,
    );
  });

  test('setup tags the initial commit and preserves the tag on later runs', async () => {
    assert.strictEqual(await runSetup(dir, identity), 0);
    const initial = (
      await exec('git', ['rev-parse', 'HEAD'], { cwd: dir })
    ).stdout.trim();
    assert.strictEqual(
      (
        await exec('git', ['rev-parse', 'refs/tags/v0.0.1'], { cwd: dir })
      ).stdout.trim(),
      initial,
    );
    await writeFile(join(dir, 'book.toml'), 'updated');
    await exec('git', ['commit', '-am', 'Update book'], { cwd: dir });
    assert.strictEqual(await runSetup(dir), 0);
    assert.strictEqual(
      (
        await exec('git', ['rev-parse', 'refs/tags/v0.0.1'], { cwd: dir })
      ).stdout.trim(),
      initial,
    );
  });

  test('resumes after a failed tag without creating another commit', async () => {
    const failTag: Exec = (command, args, options) =>
      args[0] === 'tag'
        ? Promise.resolve({ code: 1, stdout: '', stderr: 'tag failed' })
        : exec(command, args, options);
    await assert.rejects(
      setupGitRepo(failTag, dir, identity),
      /Initial tag failed: tag failed/,
    );
    assert.deepStrictEqual(await setupGitRepo(exec, dir), { committed: false });
    assert.strictEqual(
      (
        await exec('git', ['rev-list', '--count', 'HEAD'], { cwd: dir })
      ).stdout.trim(),
      '1',
    );
    assert.strictEqual(
      (await exec('git', ['rev-parse', 'refs/tags/v0.0.1'], { cwd: dir }))
        .stdout,
      (await exec('git', ['rev-parse', 'HEAD'], { cwd: dir })).stdout,
    );
  });

  test('adds a missing tag to the initial commit in an existing history', async () => {
    await setupGitRepo(exec, dir, identity);
    const initial = (await exec('git', ['rev-parse', 'HEAD'], { cwd: dir }))
      .stdout;
    await exec('git', ['tag', '-d', 'v0.0.1'], { cwd: dir });
    await writeFile(join(dir, 'book.toml'), 'updated');
    await exec('git', ['commit', '-am', 'Update book'], { cwd: dir });
    await setupGitRepo(exec, dir);
    assert.strictEqual(
      (await exec('git', ['rev-parse', 'refs/tags/v0.0.1'], { cwd: dir }))
        .stdout,
      initial,
    );
  });

  test('saves only the local name without an email, then resumes with an initial commit', async () => {
    assert.deepStrictEqual(
      await setupGitRepo(exec, dir, { name: identity.name, email: '' }),
      { committed: false },
    );
    assert.strictEqual(
      (
        await exec('git', ['config', '--local', '--get', 'user.name'], {
          cwd: dir,
        })
      ).stdout.trim(),
      identity.name,
    );
    assert.strictEqual(
      (
        await exec('git', ['config', '--local', '--get', 'user.email'], {
          cwd: dir,
        })
      ).code,
      1,
    );
    assert.notStrictEqual(
      (await exec('git', ['rev-parse', '--verify', 'HEAD'], { cwd: dir })).code,
      0,
    );
    assert.deepStrictEqual(await setupGitRepo(exec, dir, identity), {
      committed: true,
    });
  });

  test('creates its own repo inside a parent repository', async () => {
    await exec('git', ['init'], { cwd: dir });
    const child = join(dir, 'book');
    await mkdir(child);
    await writeFile(join(child, 'book.toml'), 'x');
    await setupGitRepo(exec, child, identity);
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
    await assert.rejects(
      setupGitRepo(noIdentity, dir),
      /project-specific author name and email/,
    );
    assert.deepStrictEqual(await setupGitRepo(exec, dir, identity), {
      committed: true,
    });
  });
});

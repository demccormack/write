import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  defaultsPrompter,
  findCheckNames,
  findWorkflowSecrets,
  parseGithubRemote,
  remoteAddGithub,
} from '../src/commands/remote.ts';
import { exec, type Exec, type ExecResult } from '../src/github/gh.ts';

const ok = (stdout = ''): ExecResult => ({ code: 0, stdout, stderr: '' });
const fail = (stderr = 'boom'): ExecResult => ({
  code: 1,
  stdout: '',
  stderr,
});

interface Fake {
  calls: string[];
  run: Exec;
}

/** Real git (with push faked); gh handled by `gh` override. */
function fake(
  gh: (args: string[]) => ExecResult | undefined,
  pushResult: ExecResult = ok(),
): Fake {
  const calls: string[] = [];
  const run: Exec = async (command, args, options) => {
    calls.push(`${command} ${args.join(' ')}`);
    if (command === 'gh') return gh(args) ?? ok();
    if (command === 'git' && args[0] === 'push') return pushResult;
    return exec(command, args, options);
  };
  return { calls, run };
}

const happyGh = (args: string[]) => {
  const cmd = args.slice(0, 2).join(' ');
  if (cmd === 'api user') return ok('octo\n');
  if (cmd === 'repo view') return fail('not found');
  if (args[0] === 'secret') return ok('');
  if (args[1]?.endsWith('/rulesets') && args[0] === 'api' && args.length === 4)
    return ok('');
  return undefined;
};

describe('remote add github', () => {
  let dir: string;
  let logs: string[];
  const log = (m: string) => logs.push(m);
  const run = (f: Fake, options = {}) =>
    remoteAddGithub(
      { yes: true, ...options },
      { run: f.run, prompt: defaultsPrompter, cwd: dir, log },
    );

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'write-remote-'));
    logs = [];
    await mkdir(join(dir, '.github', 'workflows'), { recursive: true });
    await writeFile(join(dir, 'book.toml'), '[book]\ntitle = "My Book"\n');
    await writeFile(join(dir, '.env'), 'SECRET=1');
    await writeFile(
      join(dir, '.github', 'workflows', 'build.yml'),
      'name: Build\njobs:\n  build:\n    runs-on: x\n    steps:\n      - run: echo ${{ secrets.GITHUB_TOKEN }} ${{ secrets.API_KEY }}\n  other:\n    name: Other check\n    runs-on: x\n',
    );
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));

  test('creates repo, pushes, applies settings, excludes sensitive files', async () => {
    const f = fake(happyGh);
    assert.strictEqual(await run(f), 0);
    assert.ok(
      f.calls.includes(
        'gh repo create octo/' +
          dir.split('/').pop() +
          ' --private --description My Book',
      ),
    );
    assert.ok(f.calls.includes('git push -u origin main'));
    assert.ok(f.calls.some((c) => c.includes('delete_branch_on_merge=true')));
    assert.ok(f.calls.some((c) => c.includes('actions/permissions')));
    assert.ok(
      f.calls.some(
        (c) => c.startsWith('gh api -X POST') && c.includes('/rulesets'),
      ),
    );
    const tracked = (await exec('git', ['ls-files'], { cwd: dir })).stdout;
    assert.ok(!tracked.includes('.env'));
    assert.ok(
      logs.some(
        (l) => l.includes('Secret API_KEY is not set') || l.includes('API_KEY'),
      ),
    );
  });

  test('skips creation when origin already points to an existing repo', async () => {
    await exec('git', ['init', '-b', 'main'], { cwd: dir });
    await exec(
      'git',
      ['remote', 'add', 'origin', 'git@github.com:octo/book.git'],
      { cwd: dir },
    );
    const f = fake((a) =>
      a[0] === 'repo' && a[1] === 'view' ? ok() : happyGh(a),
    );
    assert.strictEqual(await run(f), 0);
    assert.ok(!f.calls.some((c) => c.startsWith('gh repo create')));
  });

  test('refuses a non-GitHub origin', async () => {
    await exec('git', ['init'], { cwd: dir });
    await exec(
      'git',
      ['remote', 'add', 'origin', 'https://example.com/x.git'],
      { cwd: dir },
    );
    const f = fake(happyGh);
    assert.strictEqual(await run(f), 1);
    assert.ok(!f.calls.some((c) => c.startsWith('gh ')));
  });

  test('fails when gh is missing or unauthenticated', async () => {
    let f = fake((a) => (a[0] === '--version' ? fail() : undefined));
    assert.strictEqual(await run(f), 1);
    assert.ok(logs.some((l) => l.includes('https://cli.github.com/')));

    f = fake((a) => (a[0] === 'auth' ? fail() : undefined));
    assert.strictEqual(await run(f), 1);
    assert.ok(logs.some((l) => l.includes('gh auth login')));
  });

  test('rejects a directory that is not a book project', async () => {
    await rm(join(dir, 'book.toml'));
    assert.strictEqual(await run(fake(happyGh)), 1);
  });

  test('keeps the repo and explains resuming when push fails', async () => {
    const f = fake(happyGh, fail('rejected'));
    assert.strictEqual(await run(f), 1);
    assert.ok(f.calls.some((c) => c.startsWith('gh repo create')));
    assert.ok(logs.some((l) => l.includes('re-run')));
    assert.ok(!f.calls.some((c) => c.includes('--force')));
  });

  test('settings failures are warnings, not fatal', async () => {
    const f = fake((a) =>
      a[0] === 'api' && a.includes('POST') ? fail('403 Upgrade') : happyGh(a),
    );
    assert.strictEqual(await run(f), 0);
    assert.ok(logs.some((l) => l.includes('not applied: 403 Upgrade')));
  });

  test('helpers parse remotes, checks and secrets', async () => {
    assert.strictEqual(parseGithubRemote('https://github.com/a/b.git'), 'a/b');
    assert.strictEqual(parseGithubRemote('git@github.com:a/b'), 'a/b');
    assert.strictEqual(parseGithubRemote('https://gitlab.com/a/b'), undefined);
    assert.deepStrictEqual(await findCheckNames(dir), ['build', 'Other check']);
    assert.deepStrictEqual(await findWorkflowSecrets(dir), ['API_KEY']);
  });
});

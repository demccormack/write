import { test } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

test('npm package includes the scaffold gitignore template and named binary', () => {
  const result = spawnSync('npm', ['pack', '--dry-run', '--json', '--silent'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.strictEqual(result.status, 0, result.stderr);

  const [packed] = JSON.parse(result.stdout) as {
    files: { path: string }[];
  }[];
  const paths = packed.files.map(({ path }) => path);
  assert.ok(paths.includes('dist/templates/gitignore'));

  const packageJson = JSON.parse(
    readFileSync(join(root, 'package.json'), 'utf8'),
  );
  assert.strictEqual(packageJson.bin['write-cli'], 'dist/index.js');
});

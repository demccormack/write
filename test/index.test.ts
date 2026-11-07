import { test, describe } from 'node:test';
import assert from 'node:assert';
import packageJson, { displayName, version } from '../src/commands/version.ts';

describe('Version flag', () => {
  test('should expose the display name and version used by the CLI', () => {
    assert.strictEqual(displayName, 'Write');
    assert.strictEqual(version, packageJson.version);
  });

  test('should format the CLI version string correctly', () => {
    assert.strictEqual(
      `${displayName} ${version}`,
      `Write ${packageJson.version}`,
    );
  });
});

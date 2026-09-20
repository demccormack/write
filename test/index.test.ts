import { test, describe } from 'node:test';
import assert from 'node:assert';
import { displayName, version } from '../src/commands/version.ts';

describe('Version flag', () => {
  test('should expose the display name and version used by the CLI', () => {
    assert.strictEqual(displayName, 'Write');
    assert.strictEqual(version, '0.0.1');
  });

  test('should format the CLI version string correctly', () => {
    assert.strictEqual(`${displayName} ${version}`, 'Write 0.0.1');
  });
});

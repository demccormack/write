import { test, describe } from 'node:test';
import assert from 'node:assert';
import writeApp from '../src/index.ts';

describe('Write App', () => {
  test('should export correct version and name', () => {
    assert.strictEqual(writeApp.name, 'write');
    assert.ok(writeApp.version);
    assert.match(writeApp.version, /^\d+\.\d+\.\d+$/);
  });

  test('should have valid exports', () => {
    assert.ok(typeof writeApp === 'object');
    assert.ok('name' in writeApp);
    assert.ok('version' in writeApp);
  });
});

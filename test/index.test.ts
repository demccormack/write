import { test, describe } from 'node:test';
import assert from 'node:assert';
import writeApp from '../src/index.ts';
import { spawn } from 'node:child_process';

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

describe('Version flag', () => {
  test('should print version and exit with -v flag', async () => {
    return new Promise((resolve, reject) => {
      const child = spawn('node', ['dist/index.js', '-v'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        try {
          assert.strictEqual(stderr.trim(), '');
          assert.strictEqual(stdout.trim(), 'Write 0.0.1');
          assert.strictEqual(code, 0);
          resolve(undefined);
        } catch (error) {
          reject(error);
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  });

  test('should print version and exit with --version flag', async () => {
    return new Promise((resolve, reject) => {
      const child = spawn('node', ['dist/index.js', '--version'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        try {
          assert.strictEqual(stderr.trim(), '');
          assert.strictEqual(stdout.trim(), 'Write 0.0.1');
          assert.strictEqual(code, 0);
          resolve(undefined);
        } catch (error) {
          reject(error);
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  });
});

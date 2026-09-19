import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { resolve } from 'path';
import { ensureCliBuilt } from './helpers/ensure-cli-built.ts';

const CLI_PATH = resolve('dist/index.js');

describe('Version flag', () => {
  before(async () => {
    await ensureCliBuilt();
  });

  test('should print version and exit with -v flag', async () => {
    return new Promise((resolve, reject) => {
      const child = spawn('node', [CLI_PATH, '-v'], {
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
      const child = spawn('node', [CLI_PATH, '--version'], {
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

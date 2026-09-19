import { access, mkdir, rm } from 'fs/promises';
import { spawn } from 'node:child_process';
import { constants as fsConstants } from 'node:fs';
import { resolve } from 'path';

const DIST_ENTRY = resolve('dist/index.js');
const TMP_DIR = resolve('tmp');
const BUILD_LOCK_DIR = resolve('tmp/.test-build-lock');

function runBuild(): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('npm', ['run', 'build'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(stderr || `npm run build failed with code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

async function distExists(): Promise<boolean> {
  try {
    await access(DIST_ENTRY, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

export async function ensureCliBuilt(): Promise<void> {
  if (await distExists()) {
    return;
  }

  await mkdir(TMP_DIR, { recursive: true });

  try {
    await mkdir(BUILD_LOCK_DIR);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;

    if (err.code !== 'EEXIST') {
      throw error;
    }

    const timeoutAt = Date.now() + 120_000;

    while (Date.now() < timeoutAt) {
      if (await distExists()) {
        return;
      }

      try {
        await access(BUILD_LOCK_DIR, fsConstants.F_OK);
      } catch {
        return ensureCliBuilt();
      }

      await delay(250);
    }

    throw new Error('Timed out waiting for dist/index.js to be built');
  }

  try {
    if (!(await distExists())) {
      await runBuild();
    }
  } finally {
    await rm(BUILD_LOCK_DIR, { recursive: true, force: true });
  }
}

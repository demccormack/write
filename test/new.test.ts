import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { mkdir, rm, readFile, stat, writeFile } from 'fs/promises';
import { join, resolve } from 'path';

const TMP_DIR = 'tmp';
const TEST_SUBDIR = 'test-new-command';
const TEST_PATH = join(TMP_DIR, TEST_SUBDIR);
const CLI_PATH = resolve('dist/index.js');
const README_FILE = 'docs/README.md';
const PACKAGE_JSON_PATH = resolve('package.json');

/**
 * Update README with embedded directory structure
 */
async function updateReadmeWithStructure(
  treeOutput: string,
  projectTitle: string,
): Promise<void> {
  try {
    const readmeContent = await readFile(README_FILE, 'utf8');

    const startMarker = '<!-- BEGIN AUTO-GENERATED STRUCTURE -->';
    const endMarker = '<!-- END AUTO-GENERATED STRUCTURE -->';

    const startIndex = readmeContent.indexOf(startMarker);
    const endIndex = readmeContent.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) {
      console.warn('Auto-generation markers not found in README');
      return;
    }

    const beforeMarker = readmeContent.substring(
      0,
      startIndex + startMarker.length,
    );
    const afterMarker = readmeContent.substring(endIndex);

    const embeddedContent = `

\`\`\`bash
write new "${projectTitle}"
\`\`\`

This creates a local directory with the following structure:

\`\`\`
${treeOutput}
\`\`\`

`;

    const updatedReadme = beforeMarker + embeddedContent + afterMarker;
    await writeFile(README_FILE, updatedReadme);

    console.log('✓ Updated README with current directory structure');
  } catch (error) {
    console.warn(`Could not update README: ${error}`);
  }
}

/**
 * Helper function to run the write command and capture output
 */
function runWriteCommand(
  args: string[],
  cwd: string,
  options: { env?: NodeJS.ProcessEnv } = {},
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    // Spawn node by absolute path so a PATH override (e.g. to simulate a
    // missing `git`) doesn't also prevent node itself from being found.
    const child = spawn(process.execPath, [CLI_PATH, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd,
      env: options.env ?? process.env,
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
      resolve({ stdout, stderr, code: code || 0 });
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Helper function to run tree command and get directory structure
 */
function runTreeCommand(projectPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const projectName = projectPath.split('/').pop() || '';
    const parentDir = projectPath.substring(0, projectPath.lastIndexOf('/'));

    // Exclude .git so the initialised repository doesn't leak into the structure snapshot
    const child = spawn('tree', ['-a', '-I', '.git', projectName], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: parentDir,
    });

    let stdout = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`tree command failed with code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Helper function to check if a path is a directory
 */
async function isDirectory(dirPath: string): Promise<boolean> {
  try {
    const stats = await stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Helper function to check if a directory is a git repository
 */
async function isGitRepository(dirPath: string): Promise<boolean> {
  return isDirectory(join(dirPath, '.git'));
}

/**
 * Helper function to run a git command and capture output
 */
function runGitCommand(
  args: string[],
  cwd: string,
): Promise<{ stdout: string; code: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd,
    });

    let stdout = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.on('close', (code) => {
      resolve({ stdout, code: code || 0 });
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

describe('write new command', () => {
  before(async () => {
    // Ensure tmp directory exists and create test subdirectory
    await mkdir(TMP_DIR, { recursive: true });
    await mkdir(TEST_PATH, { recursive: true });
  });

  after(async () => {
    // Cleanup test directory
    try {
      await rm(TEST_PATH, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
      console.warn(`Cleanup warning: ${error}`);
    }
  });

  test('should create project with correct structure (snapshot)', async (t) => {
    const projectTitle = 'My Amazing Book';
    const expectedProjectName = 'my-amazing-book';
    const projectPath = join(TEST_PATH, expectedProjectName);

    const result = await runWriteCommand(['new', projectTitle], TEST_PATH);

    // Check command succeeded
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.stderr.trim(), '');
    assert(
      result.stdout.includes(
        `Creating new LaTeX book project: ${projectTitle}`,
      ),
    );
    assert(result.stdout.includes(`Project directory: ${expectedProjectName}`));

    // Check main project directory was created
    assert(
      await isDirectory(projectPath),
      'Main project directory should exist',
    );

    // Get tree structure, snapshot it and update README
    const treeOutput = await runTreeCommand(projectPath);
    t.assert.snapshot(treeOutput);
    await updateReadmeWithStructure(treeOutput, projectTitle);
  });

  test('should initialize a git repository with an initial commit', async () => {
    const projectTitle = 'Git Init Test Book';
    const projectName = 'git-init-test-book';
    const projectPath = join(TEST_PATH, projectName);

    const result = await runWriteCommand(['new', projectTitle], TEST_PATH);

    assert.strictEqual(result.code, 0);
    assert(
      await isGitRepository(projectPath),
      'Project directory should be a git repository',
    );

    const log = await runGitCommand(['log', '--oneline'], projectPath);
    const commitLines = log.stdout.trim().split('\n').filter(Boolean);
    assert.strictEqual(
      commitLines.length,
      1,
      'Project should have exactly one initial commit',
    );

    const status = await runGitCommand(['status', '--porcelain'], projectPath);
    assert.strictEqual(
      status.stdout.trim(),
      '',
      'Working tree should be clean after the initial commit',
    );

    const { version } = JSON.parse(
      await readFile(PACKAGE_JSON_PATH, 'utf8'),
    ) as { version: string };
    const message = await runGitCommand(
      ['log', '-1', '--pretty=%B'],
      projectPath,
    );
    assert.strictEqual(
      message.stdout.trim(),
      [
        'Initial commit',
        '',
        `Create project using write v${version}`,
        '',
        'For more details about this tool, see https://write.art/open-source',
      ].join('\n'),
      'Initial commit message should follow the expected template',
    );
  });

  test('should fail and remove the project directory when git is unavailable', async () => {
    const projectTitle = 'No Git Test Book';
    const projectName = 'no-git-test-book';
    const projectPath = join(TEST_PATH, projectName);

    // Point PATH at a directory that has no `git` binary
    const noGitPath = join(TEST_PATH, 'no-git-path');
    await mkdir(noGitPath, { recursive: true });

    const result = await runWriteCommand(['new', projectTitle], TEST_PATH, {
      env: { ...process.env, PATH: noGitPath },
    });

    assert.notStrictEqual(result.code, 0);
    assert(
      result.stderr.includes('git') && /install/i.test(result.stderr),
      'Should instruct the user to install git',
    );
    assert(
      !(await isDirectory(projectPath)),
      'Project directory should be removed when git initialization fails',
    );
  });

  test('should substitute title in main.tex', async () => {
    const projectTitle = 'Title Substitution Test';
    const projectName = 'title-substitution-test';
    const projectPath = join(TEST_PATH, projectName);

    await runWriteCommand(['new', projectTitle], TEST_PATH);

    const mainTexPath = join(projectPath, 'main.tex');
    const content = await readFile(mainTexPath, 'utf8');

    // Check title is correctly substituted
    assert(
      content.includes(`\\title{${projectTitle}}`),
      'Title should be substituted in main.tex',
    );
  });

  test('should substitute title in book.toml', async () => {
    const projectTitle = 'Config Test Book';
    const projectName = 'config-test-book';
    const projectPath = join(TEST_PATH, projectName);

    await runWriteCommand(['new', projectTitle], TEST_PATH);

    const configPath = join(projectPath, 'book.toml');
    const content = await readFile(configPath, 'utf8');

    // Check title is correctly substituted
    assert(
      content.includes(`title = "${projectTitle}"`),
      'Title should be substituted in book.toml',
    );
  });

  test('should handle titles with special characters', async () => {
    const projectTitle = 'My "Amazing" Book & More!!!';
    const expectedProjectName = 'my-amazing-book-more';
    const projectPath = join(TEST_PATH, expectedProjectName);

    const result = await runWriteCommand(['new', projectTitle], TEST_PATH);

    assert.strictEqual(result.code, 0);
    assert(result.stdout.includes(`Project directory: ${expectedProjectName}`));
    assert(await isDirectory(projectPath), 'Project directory should exist');

    // Check that the original title is preserved in files
    const mainTexPath = join(projectPath, 'main.tex');
    const mainTexContent = await readFile(mainTexPath, 'utf8');
    assert(mainTexContent.includes(`\\title{${projectTitle}}`));

    const configPath = join(projectPath, 'book.toml');
    const configContent = await readFile(configPath, 'utf8');
    assert(configContent.includes(`title = "${projectTitle}"`));
  });

  test('should fail when no title is provided', async () => {
    const result = await runWriteCommand(['new'], TEST_PATH);

    assert.notStrictEqual(result.code, 0);
    assert(result.stderr.includes('Error: Please provide a book title'));
    assert(result.stdout.includes('Usage: write new <title>'));
  });

  test('should create projects in the current working directory', async () => {
    const projectTitle = 'CWD Test Book';
    const expectedProjectName = 'cwd-test-book';

    // Create a subdirectory to test working directory behavior
    const testCwd = join(TEST_PATH, 'cwd-test');
    await mkdir(testCwd, { recursive: true });

    const result = await runWriteCommand(['new', projectTitle], testCwd);
    const projectPath = join(testCwd, expectedProjectName);

    assert.strictEqual(result.code, 0);
    assert(
      await isDirectory(projectPath),
      'Project should be created in the current working directory',
    );
  });

  test('should handle edge case titles', async () => {
    const testCases = [
      { input: 'A', expected: 'a' },
      { input: '123 Numbers', expected: '123-numbers' },
      { input: 'Title-With-Hyphens', expected: 'title-with-hyphens' },
      { input: '   Spaces   Everywhere   ', expected: 'spaces-everywhere' },
    ];

    for (const testCase of testCases) {
      const projectPath = join(TEST_PATH, testCase.expected);
      const result = await runWriteCommand(['new', testCase.input], TEST_PATH);

      assert.strictEqual(
        result.code,
        0,
        `Should handle title: "${testCase.input}"`,
      );
      assert(
        await isDirectory(projectPath),
        `Directory should exist for title: "${testCase.input}"`,
      );
      assert(result.stdout.includes(`Project directory: ${testCase.expected}`));
    }
  });
});

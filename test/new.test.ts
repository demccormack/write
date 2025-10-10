import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { mkdir, rm, access, readFile, stat } from 'fs/promises';
import { join, resolve } from 'path';

const TMP_DIR = 'tmp';
const TEST_SUBDIR = 'test-new-command';
const TEST_PATH = join(TMP_DIR, TEST_SUBDIR);
const CLI_PATH = resolve('dist/index.js');

/**
 * Helper function to run the write command and capture output
 */
function runWriteCommand(
  args: string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [CLI_PATH, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd,
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
 * Helper function to check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
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

  test('should create project with correct directory structure', async () => {
    const projectTitle = 'Test Book Project';
    const expectedProjectName = 'test-book-project';
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

    // Check all expected subdirectories exist
    const expectedDirs = [
      'chapters',
      'assets',
      'assets/images',
      'assets/figures',
      'templates',
      '.github',
      '.github/workflows',
    ];

    for (const dir of expectedDirs) {
      const dirPath = join(projectPath, dir);
      assert(await isDirectory(dirPath), `Directory ${dir} should exist`);
    }

    // Check all expected files exist
    const expectedFiles = [
      'main.tex',
      'chapters/chapter01.tex',
      'book.toml',
      '.gitignore',
      '.github/workflows/build.yml',
    ];

    for (const file of expectedFiles) {
      const filePath = join(projectPath, file);
      assert(await fileExists(filePath), `File ${file} should exist`);
    }
  });

  test('should generate correct main.tex content with title', async () => {
    const projectTitle = 'My Amazing Book';
    const projectName = 'my-amazing-book';
    const projectPath = join(TEST_PATH, projectName);

    await runWriteCommand(['new', projectTitle], TEST_PATH);

    const mainTexPath = join(projectPath, 'main.tex');
    const content = await readFile(mainTexPath, 'utf8');

    // Check LaTeX document structure
    assert(content.includes('\\documentclass[12pt,oneside]{book}'));
    assert(content.includes('\\usepackage[utf8]{inputenc}'));
    assert(content.includes('\\usepackage{graphicx}'));
    assert(content.includes('\\usepackage{hyperref}'));

    // Check title is correctly inserted
    assert(content.includes(`\\title{${projectTitle}}`));

    // Check document structure
    assert(content.includes('\\begin{document}'));
    assert(content.includes('\\maketitle'));
    assert(content.includes('\\tableofcontents'));
    assert(content.includes('\\end{document}'));
  });

  test('should generate correct book.toml configuration', async () => {
    const projectTitle = 'Configuration Test Book';
    const projectName = 'configuration-test-book';
    const projectPath = join(TEST_PATH, projectName);

    await runWriteCommand(['new', projectTitle], TEST_PATH);

    const configPath = join(projectPath, 'book.toml');
    const content = await readFile(configPath, 'utf8');

    // Check configuration sections exist
    assert(content.includes('[book]'));
    assert(content.includes('[latex]'));
    assert(content.includes('[build]'));
    assert(content.includes('[metadata]'));

    // Check title is correctly set
    assert(content.includes(`title = "${projectTitle}"`));

    // Check default values
    assert(content.includes('author = "Your Name"'));
    assert(content.includes('language = "en"'));
    assert(content.includes('document_class = "book"'));
    assert(content.includes('chapters_dir = "chapters"'));
    assert(content.includes('assets_dir = "assets"'));
  });

  test('should generate chapter01.tex with correct structure', async () => {
    const projectTitle = 'Chapter Test Book';
    const projectName = 'chapter-test-book';
    const projectPath = join(TEST_PATH, projectName);

    await runWriteCommand(['new', projectTitle], TEST_PATH);

    const chapterPath = join(projectPath, 'chapters', 'chapter01.tex');
    const content = await readFile(chapterPath, 'utf8');

    // Check chapter structure
    assert(content.includes('\\chapter{Sample Chapter}'));
    assert(content.includes('\\section{Section Example}'));
    assert(content.includes('\\subsection{Subsection Example}'));
    assert(content.includes('This is a sample chapter'));
  });

  test('should generate correct .gitignore for LaTeX projects', async () => {
    const projectTitle = 'GitIgnore Test Book';
    const projectName = 'gitignore-test-book';
    const projectPath = join(TEST_PATH, projectName);

    await runWriteCommand(['new', projectTitle], TEST_PATH);

    const gitignorePath = join(projectPath, '.gitignore');
    const content = await readFile(gitignorePath, 'utf8');

    // Check LaTeX-specific ignores
    assert(content.includes('*.aux'));
    assert(content.includes('*.log'));
    assert(content.includes('*.pdf'));
    assert(content.includes('*.synctex.gz'));

    // Check OS and editor ignores
    assert(content.includes('.DS_Store'));
    assert(content.includes('.vscode/'));
    assert(content.includes('node_modules/'));
  });

  test('should generate GitHub Actions workflow', async () => {
    const projectTitle = 'Workflow Test Book';
    const projectName = 'workflow-test-book';
    const projectPath = join(TEST_PATH, projectName);

    await runWriteCommand(['new', projectTitle], TEST_PATH);

    const workflowPath = join(projectPath, '.github', 'workflows', 'build.yml');
    const content = await readFile(workflowPath, 'utf8');

    // Check workflow structure
    assert(content.includes('name: Build LaTeX PDF'));
    assert(content.includes('on:'));
    assert(content.includes('push:'));
    assert(content.includes('pull_request:'));
    assert(content.includes('jobs:'));

    // Check workflow steps
    assert(content.includes('actions/checkout@v4'));
    assert(content.includes('xu-cheng/latex-action@v3'));
    assert(content.includes('actions/upload-artifact@v4'));
    assert(content.includes('root_file: main.tex'));
  });

  test('should handle titles with special characters', async () => {
    const projectTitle = 'My "Amazing" Book & More!!!';
    const expectedProjectName = 'my-amazing-book-more';
    const projectPath = join(TEST_PATH, expectedProjectName);

    const result = await runWriteCommand(['new', projectTitle], TEST_PATH);

    assert.strictEqual(result.code, 0);
    assert(result.stdout.includes(`Project directory: ${expectedProjectName}`));
    assert(await isDirectory(projectPath), 'Project directory should exist');

    // Check that the original title is preserved in main.tex
    const mainTexPath = join(projectPath, 'main.tex');
    const content = await readFile(mainTexPath, 'utf8');
    assert(content.includes(`\\title{${projectTitle}}`));
  });

  test('should handle multi-word titles correctly', async () => {
    const projectTitle = 'The Complete Guide to Advanced Programming';
    const expectedProjectName = 'the-complete-guide-to-advanced-programming';
    const projectPath = join(TEST_PATH, expectedProjectName);

    const result = await runWriteCommand(['new', projectTitle], TEST_PATH);

    assert.strictEqual(result.code, 0);
    assert(await isDirectory(projectPath), 'Project directory should exist');

    // Verify the project name conversion
    assert(result.stdout.includes(`Project directory: ${expectedProjectName}`));
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

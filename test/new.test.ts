import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { mkdir, rm, readFile, stat, writeFile } from 'fs/promises';
import { join } from 'path';
import { createNewProject } from '../src/commands/new.ts';

const TMP_DIR = 'tmp';
const TEST_SUBDIR = 'test-new-command';
const TEST_PATH = join(TMP_DIR, TEST_SUBDIR);
const README_FILE = 'docs/README.md';

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
 * Helper function to run the project creation function and capture output
 */
async function runCreateNewProject(
  title: string,
  cwd: string,
): Promise<{ stdout: string; stderr: string; code: number }> {
  const originalCwd = process.cwd();
  const originalLog = console.log;
  const originalError = console.error;
  let stdout = '';
  let stderr = '';

  console.log = (...args: unknown[]) => {
    stdout += `${args.join(' ')}\n`;
  };

  console.error = (...args: unknown[]) => {
    stderr += `${args.join(' ')}\n`;
  };

  try {
    process.chdir(cwd);
    await createNewProject(title);
    return { stdout, stderr, code: 0 };
  } catch (error) {
    stderr += `${error}\n`;
    return { stdout, stderr, code: 1 };
  } finally {
    process.chdir(originalCwd);
    console.log = originalLog;
    console.error = originalError;
  }
}

/**
 * Helper function to run tree command and get directory structure
 */
function runTreeCommand(projectPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const projectName = projectPath.split('/').pop() || '';
    const parentDir = projectPath.substring(0, projectPath.lastIndexOf('/'));

    const child = spawn('tree', ['-a', projectName], {
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

    const result = await runCreateNewProject(projectTitle, TEST_PATH);

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

  test('should substitute title in main.tex', async () => {
    const projectTitle = 'Title Substitution Test';
    const projectName = 'title-substitution-test';
    const projectPath = join(TEST_PATH, projectName);

    await runCreateNewProject(projectTitle, TEST_PATH);

    const mainTexPath = join(projectPath, 'main.tex');
    const content = await readFile(mainTexPath, 'utf8');

    // Check title is correctly substituted
    assert(
      content.includes(`\\title{${projectTitle}}`),
      'Title should be substituted in main.tex',
    );
    assert(
      content.includes('© \\bookauthor, \\the\\year\\par'),
      'Generated main.tex should include a copyright notice with the current year',
    );
    assert(
      content.includes('\\begingroup'),
      'Generated main.tex should scope the copyright page formatting',
    );
    assert(
      content.includes('\\tiny'),
      'Generated main.tex should make the copyright page text smaller',
    );
    assert(
      content.includes('\\centering'),
      'Generated main.tex should center the copyright page text',
    );
    assert(
      content.includes(
        'This book began with Write, the free and open-source book creation tool.',
      ),
      'Generated main.tex should acknowledge Write on the copyright page',
    );
    assert(
      content.includes(
        '\\href{https://write.art/open-source}{write.art/open-source}',
      ),
      'Generated main.tex should include a clickable Write URL',
    );
  });

  test('should substitute title in book.toml', async () => {
    const projectTitle = 'Config Test Book';
    const projectName = 'config-test-book';
    const projectPath = join(TEST_PATH, projectName);

    await runCreateNewProject(projectTitle, TEST_PATH);

    const configPath = join(projectPath, 'book.toml');
    const content = await readFile(configPath, 'utf8');

    // Check title is correctly substituted
    assert(
      content.includes(`title = "${projectTitle}"`),
      'Title should be substituted in book.toml',
    );
    assert(
      content.includes('author = "Your Name"'),
      'Default author should be substituted in book.toml',
    );
  });

  test('should create templated automation files', async () => {
    const projectTitle = 'Automation Test Book';
    const projectName = 'automation-test-book';
    const projectPath = join(TEST_PATH, projectName);

    await runCreateNewProject(projectTitle, TEST_PATH);

    const buildWorkflowPath = join(
      projectPath,
      '.github',
      'workflows',
      'build.yml',
    );
    const buildWorkflowContent = await readFile(buildWorkflowPath, 'utf8');
    assert(
      buildWorkflowContent.includes('name: Build LaTeX PDF'),
      'Generated project should include the build workflow',
    );
    assert(
      buildWorkflowContent.includes(
        `run: mv main.pdf ${projectName}-\${{ github.sha }}.pdf`,
      ),
      'Generated build workflow should rename the PDF using the project name',
    );
    assert(
      buildWorkflowContent.includes(`${projectName}-\${{ github.sha }}.pdf`),
      'Generated build workflow should upload an artifact named for the project',
    );
    assert(
      buildWorkflowContent.includes("if: github.event_name == 'pull_request'"),
      'Generated build workflow should only comment on pull requests',
    );

    const copilotInstructionsPath = join(
      projectPath,
      '.github',
      'copilot-instructions.md',
    );
    const copilotInstructionsContent = await readFile(
      copilotInstructionsPath,
      'utf8',
    );
    assert(
      copilotInstructionsContent.includes(
        `This repository contains the LaTeX source for _${projectTitle}_,`,
      ),
      'Copilot instructions should include the generated book title',
    );
    assert(
      copilotInstructionsContent.includes('written by Your Name'),
      'Copilot instructions should include the generated author',
    );
    assert(
      copilotInstructionsContent.includes('latexmk -pdf main.tex'),
      'Copilot instructions should include the build command guidance',
    );
  });

  test('should handle titles with special characters', async () => {
    const projectTitle = 'My "Amazing" Book & More!!!';
    const expectedProjectName = 'my-amazing-book-more';
    const projectPath = join(TEST_PATH, expectedProjectName);

    const result = await runCreateNewProject(projectTitle, TEST_PATH);

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

  test('should create projects in the current working directory', async () => {
    const projectTitle = 'CWD Test Book';
    const expectedProjectName = 'cwd-test-book';

    // Create a subdirectory to test working directory behavior
    const testCwd = join(TEST_PATH, 'cwd-test');
    await mkdir(testCwd, { recursive: true });

    const result = await runCreateNewProject(projectTitle, testCwd);
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
      const result = await runCreateNewProject(testCase.input, TEST_PATH);

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

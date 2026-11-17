import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { mkdir, rm, readFile, stat, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { fileURLToPath } from 'node:url';
import {
  createNewProject,
  type NewProjectOptions,
} from '../src/commands/new.ts';
import { exec } from '../src/github/gh.ts';

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
write-cli new "${projectTitle}"
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
  options: NewProjectOptions = {},
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
    await createNewProject(title, {
      author: 'Your Name',
      email: 'test@example.com',
      ...options,
    });
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

    const child = spawn(
      'tree',
      ['-a', '-I', '.git', '--charset=utf-8', projectName],
      {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: parentDir,
        // Keep snapshot ordering independent of the host locale.
        env: { ...process.env, LC_ALL: 'C' },
      },
    );

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

describe('write-cli new command', () => {
  const savedEnv = { ...process.env };
  const globalConfigPath = resolve(TEST_PATH, 'test.gitconfig');

  before(async () => {
    process.env.GIT_AUTHOR_NAME = process.env.GIT_COMMITTER_NAME = 'Test';
    process.env.GIT_AUTHOR_EMAIL = process.env.GIT_COMMITTER_EMAIL =
      'test@example.com';
    // Ensure tmp directory exists and create test subdirectory
    await mkdir(TMP_DIR, { recursive: true });
    await mkdir(TEST_PATH, { recursive: true });
    process.env.GIT_CONFIG_GLOBAL = globalConfigPath;
    process.env.GIT_CONFIG_NOSYSTEM = '1';
    await writeFile(globalConfigPath, '');
  });

  after(async () => {
    process.env = { ...savedEnv };
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
        `Creating new Typst book project: ${projectTitle}`,
      ),
    );
    assert(result.stdout.includes(`Project directory: ${expectedProjectName}`));

    // Check main project directory was created
    assert(
      await isDirectory(projectPath),
      'Main project directory should exist',
    );
    assert(
      await isDirectory(join(projectPath, '.git')),
      'Git repository should be initialised',
    );
    assert(
      (await readFile(join(projectPath, '.gitignore'), 'utf8')).includes(
        '*.pdf',
      ),
      'Generated project should include the .gitignore template',
    );

    // Get tree structure, snapshot it and update README
    const treeOutput = await runTreeCommand(projectPath);
    t.assert.snapshot(treeOutput);
    await updateReadmeWithStructure(treeOutput, projectTitle);
  });

  test('should initialise git by default and skip it with --no-git', async () => {
    const gitDir = (name: string) => join(TEST_PATH, name, '.git');
    await runCreateNewProject('With Git', TEST_PATH);
    assert(await isDirectory(gitDir('with-git')));

    const originalCwd = process.cwd();
    process.chdir(TEST_PATH);
    try {
      await createNewProject('Without Git', { git: false });
    } finally {
      process.chdir(originalCwd);
    }
    assert(await isDirectory(join(TEST_PATH, 'without-git')));
    assert(!(await isDirectory(gitDir('without-git'))));
  });

  test('CLI falls back to global identity for omitted or blank fields without replacing explicit values', async () => {
    const config =
      '[user]\nname = Global Pen Name\nemail = global@example.com\n';
    await writeFile(globalConfigPath, config);
    try {
      const cases = [
        { args: [], name: 'Global Pen Name', email: 'global@example.com' },
        {
          args: ['--author', '', '--email', '   '],
          name: 'Global Pen Name',
          email: 'global@example.com',
        },
        {
          args: ['--author', 'Explicit Pen Name'],
          name: 'Explicit Pen Name',
          email: 'global@example.com',
        },
        {
          args: ['--email', 'explicit@example.com'],
          name: 'Global Pen Name',
          email: 'explicit@example.com',
        },
      ];
      for (const [index, { args, name, email }] of cases.entries()) {
        const result = await exec(
          process.execPath,
          [
            '--import',
            import.meta.resolve('tsx'),
            fileURLToPath(new URL('../src/index.ts', import.meta.url)),
            'new',
            `Global Defaults ${index}`,
            ...args,
          ],
          { cwd: resolve(TEST_PATH) },
        );
        assert.strictEqual(result.code, 0, result.stderr);
        const projectPath = join(TEST_PATH, `global-defaults-${index}`);
        assert.ok(
          (await readFile(join(projectPath, 'book.toml'), 'utf8')).includes(
            `author = "${name}"`,
          ),
        );
        const commit = await exec('git', ['log', '-1', '--format=%an <%ae>'], {
          cwd: projectPath,
        });
        assert.strictEqual(commit.stdout.trim(), `${name} <${email}>`);
      }
      assert.strictEqual(await readFile(globalConfigPath, 'utf8'), config);
    } finally {
      await writeFile(globalConfigPath, '');
    }
  });

  test('should create the full project with only a local Git name when email is omitted or blank', async () => {
    for (const [index, email] of [undefined, '', '   '].entries()) {
      const title = `Deferred Email ${index}`;
      const projectPath = join(TEST_PATH, `deferred-email-${index}`);
      const result = await runCreateNewProject(title, TEST_PATH, {
        author: 'Peter Pan',
        email,
      });

      assert.strictEqual(result.code, 0);
      assert.strictEqual(result.stderr, '');
      assert.ok(result.stdout.includes('no commit was made'));
      assert.ok(result.stdout.includes('write-cli setup'));
      assert.ok(!result.stdout.includes('Optional: write-cli remote'));
      assert.ok(
        (await readFile(join(projectPath, 'main.typ'), 'utf8')).includes(
          '#let book-author = "Peter Pan"',
        ),
      );
      assert.ok(
        (await readFile(join(projectPath, 'book.toml'), 'utf8')).includes(
          'author = "Peter Pan"',
        ),
      );
      for (const file of [
        '.gitignore',
        'README.md',
        'chapters/chapter01.typ',
        '.github/workflows/build.yml',
        '.github/workflows/lint.yml',
        '.github/copilot-instructions.md',
        '.vscode/settings.json',
        '.vscode/extensions.json',
      ]) {
        assert.ok((await stat(join(projectPath, file))).isFile());
      }

      const git = (...args: string[]) =>
        exec('git', args, { cwd: projectPath });
      assert.strictEqual(
        (await git('config', '--local', '--get', 'user.name')).stdout.trim(),
        'Peter Pan',
      );
      assert.strictEqual(
        (await git('config', '--local', '--get', 'user.email')).code,
        1,
      );
      assert.notStrictEqual(
        (await git('rev-parse', '--verify', 'HEAD')).code,
        0,
      );
      assert.strictEqual((await git('ls-files')).stdout, '');
    }
  });

  test('should substitute title in main.typ', async () => {
    const projectTitle = 'Title Substitution Test';
    const projectName = 'title-substitution-test';
    const projectPath = join(TEST_PATH, projectName);

    await runCreateNewProject(projectTitle, TEST_PATH);

    const content = await readFile(join(projectPath, 'main.typ'), 'utf8');

    assert(
      content.includes(`#let book-title = "${projectTitle}"`),
      'Title should be substituted in main.typ',
    );
    assert(
      content.includes('\n#include "chapters/chapter01.typ"'),
      'Generated main.typ should include the first chapter',
    );
    assert(
      content.indexOf('#heading(numbering: none)[Introduction]') <
        content.indexOf('#include "chapters/chapter01.typ"'),
      'Generated main.typ should place an unnumbered introduction before the first chapter',
    );
    const chapterContent = await readFile(
      join(projectPath, 'chapters', 'chapter01.typ'),
      'utf8',
    );
    assert(
      chapterContent.includes('= Sample Chapter'),
      'Generated chapter 1 should retain its numbered chapter heading',
    );
    assert(
      !chapterContent.includes('=== Subsection Example'),
      'Generated chapter 1 should not include a subsection example',
    );
    assert(
      content.includes('© #book-author, #datetime.today().year()'),
      'Generated main.typ should include a copyright notice with the current year',
    );
    assert(
      content.includes('#set text(size: 6pt)'),
      'Generated main.typ should make the copyright page text smaller',
    );
    assert(
      content.includes('#align(center + bottom)'),
      'Generated main.typ should center the copyright page text',
    );
    assert(
      content.includes(
        'This book began with Write, the free and open-source book creation tool.',
      ),
      'Generated main.typ should acknowledge Write on the copyright page',
    );
    assert(
      content.includes(
        '#link("https://write.art/open-source")[write.art/open-source]',
      ),
      'Generated main.typ should include a clickable Write URL',
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

  test('should use the selected author and configure Git identity locally', async () => {
    const projectPath = join(TEST_PATH, 'private-identity-test');
    const email = '12345+pen-name@users.noreply.github.com';
    const author = 'Pen $& Name';
    await runCreateNewProject('Private Identity Test', TEST_PATH, {
      author,
      email,
    });

    const main = await readFile(join(projectPath, 'main.typ'), 'utf8');
    const config = await readFile(join(projectPath, 'book.toml'), 'utf8');
    assert.ok(main.includes(`#let book-author = "${author}"`));
    assert.ok(config.includes(`author = "${author}"`));
    assert.ok(!main.includes(email));
    assert.ok(!config.includes(email));

    const localName = await exec(
      'git',
      ['config', '--local', '--get', 'user.name'],
      { cwd: projectPath },
    );
    const localEmail = await exec(
      'git',
      ['config', '--local', '--get', 'user.email'],
      { cwd: projectPath },
    );
    assert.strictEqual(localName.stdout.trim(), author);
    assert.strictEqual(localEmail.stdout.trim(), email);

    const commit = await exec('git', ['log', '-1', '--format=%an <%ae>'], {
      cwd: projectPath,
    });
    assert.strictEqual(commit.stdout.trim(), `${author} <${email}>`);
  });

  test('should use short commit SHAs for PDFs across workflows', async () => {
    const projectName = 'short-sha-book';
    const projectPath = join(TEST_PATH, projectName);
    await runCreateNewProject('Short SHA Book', TEST_PATH);

    const workflow = await readFile(
      join(projectPath, '.github', 'workflows', 'build.yml'),
      'utf8',
    );
    assert.match(
      workflow,
      /push:\n {4}branches: \[main\]\n {4}tags: \['v\*'\]/,
    );
    assert.match(workflow, /pull_request:\n {2}workflow_dispatch:/);
    assert.ok(workflow.includes("if: startsWith(github.ref, 'refs/tags/')"));
    assert.ok(workflow.includes('files: ${{ steps.pdf.outputs.filename }}'));

    const preview = await readFile('.github/workflows/pdf_preview.yml', 'utf8');
    const previewName = 'fairy-dust-sprinkling-made-easy';
    await mkdir(join(projectPath, previewName));
    for (const [text, name, subdir] of [
      [workflow, projectName, ''],
      [preview, previewName, previewName],
    ]) {
      assert.ok(text.includes('name: ${{ steps.pdf.outputs.filename }}'));
      assert.ok(text.includes('${{ steps.pdf.outputs.filename }}'));
      const script = text.match(
        /- name: Rename PDF with short commit SHA\n {8}id: pdf\n {8}run: \|\n((?: {10}.+\n)+)/,
      )?.[1];
      assert.ok(script, 'Workflow should expose the renamed PDF as an output');
      await writeFile(join(projectPath, subdir, 'main.pdf'), 'sample PDF');
      const outputPath = join(process.cwd(), projectPath, `${name}-output`);
      const renamed = await exec('bash', ['-e', '-c', script], {
        cwd: projectPath,
        env: {
          ...process.env,
          GITHUB_SHA: '1234567890abcdef1234567890abcdef12345678',
          GITHUB_OUTPUT: outputPath,
        },
      });
      assert.strictEqual(renamed.code, 0, renamed.stderr);
      assert.strictEqual(
        await readFile(
          join(projectPath, subdir, `${name}-1234567.pdf`),
          'utf8',
        ),
        'sample PDF',
      );
      assert.strictEqual(
        await readFile(outputPath, 'utf8'),
        `filename=${name}-1234567.pdf\n`,
      );
    }
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
      buildWorkflowContent.includes('name: Build Typst PDF'),
      'Generated project should include the build workflow',
    );
    assert(
      buildWorkflowContent.includes(
        `filename="${projectName}-\${GITHUB_SHA:0:7}.pdf"`,
      ),
      'Generated build workflow should rename the PDF using the project name',
    );
    assert(
      buildWorkflowContent.includes('name: ${{ steps.pdf.outputs.filename }}'),
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
        `This repository contains the Typst source for _${projectTitle}_,`,
      ),
      'Copilot instructions should include the generated book title',
    );
    assert(
      copilotInstructionsContent.includes('written by Your Name'),
      'Copilot instructions should include the generated author',
    );
    assert(
      copilotInstructionsContent.includes('typst compile main.typ'),
      'Copilot instructions should include the build command guidance',
    );
    const readmeContent = await readFile(
      join(projectPath, 'README.md'),
      'utf8',
    );
    assert(readmeContent.startsWith(`# ${projectTitle}`));
    assert(readmeContent.includes('Keep my email addresses private'));
    assert(
      readmeContent.includes(
        'Block command line pushes that expose my email address',
      ),
    );
    assert(readmeContent.includes('git switch -c'));
    assert(readmeContent.includes('gh pr create'));
    assert(!readmeContent.includes('{{'), 'README placeholders replaced');
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
    const mainTypContent = await readFile(
      join(projectPath, 'main.typ'),
      'utf8',
    );
    assert(
      mainTypContent.includes(
        `#let book-title = "My \\"Amazing\\" Book & More!!!"`,
      ),
    );

    const configPath = join(projectPath, 'book.toml');
    const configContent = await readFile(configPath, 'utf8');
    assert(configContent.includes('title = "My \\"Amazing\\" Book & More!!!"'));
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

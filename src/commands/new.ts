import { mkdir, writeFile, readFile, copyFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { version } from './version.ts';
import { GitSetupError, setupGitRepo } from '../git.ts';
import { exec } from '../github/gh.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = join(__dirname, '..', 'templates');
const DEFAULT_AUTHOR = 'Your Name';

/**
 * Read a template file and replace placeholders with actual values
 */
async function processTemplate(
  templateName: string,
  replacements: Record<string, string>,
): Promise<string> {
  const templatePath = join(TEMPLATES_DIR, templateName);
  let content = await readFile(templatePath, 'utf8');

  // Replace all placeholders
  for (const [placeholder, value] of Object.entries(replacements)) {
    const regex = new RegExp(`{{${placeholder}}}`, 'g');
    content = content.replace(regex, value);
  }

  return content;
}

/**
 * Copy a template file to destination without processing
 */
async function copyTemplate(
  templateName: string,
  destinationPath: string,
): Promise<void> {
  const templatePath = join(TEMPLATES_DIR, templateName);
  await copyFile(templatePath, destinationPath);
}

/**
 * Convert a book title to a directory-safe name
 */
function titleToDirectoryName(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Escape a value for use inside a Typst string literal
 */
function escapeTypstString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Create a new Typst book project with scaffolding
 */
export async function createNewProject(
  title: string,
  { git = true }: { git?: boolean } = {},
): Promise<void> {
  const projectName = titleToDirectoryName(title);
  const projectPath = join(process.cwd(), projectName);

  console.log(`Creating new Typst book project: ${title}`);
  console.log(`Project directory: ${projectName}`);

  try {
    // Create main project directory
    await mkdir(projectPath, { recursive: true });

    // Create subdirectories
    const directories = [
      'chapters',
      'assets',
      'assets/images',
      'assets/figures',
      'templates',
      '.github',
      '.github/workflows',
      '.vscode',
    ];

    for (const dir of directories) {
      await mkdir(join(projectPath, dir), { recursive: true });
    }

    // Create main.typ file
    const mainTypContent = await processTemplate('main.typ', {
      BOOK_TITLE: escapeTypstString(title),
      BOOK_AUTHOR: escapeTypstString(DEFAULT_AUTHOR),
    });
    await writeFile(join(projectPath, 'main.typ'), mainTypContent);

    // Create sample chapter
    await copyTemplate(
      'chapter01.typ',
      join(projectPath, 'chapters', 'chapter01.typ'),
    );

    // Create book.toml configuration
    const bookTomlContent = await processTemplate('book.toml', {
      BOOK_TITLE: title,
      BOOK_AUTHOR: DEFAULT_AUTHOR,
      WRITE_VERSION: version,
    });
    await writeFile(join(projectPath, 'book.toml'), bookTomlContent);

    // Create .gitignore for Typst projects
    await copyTemplate('.gitignore', join(projectPath, '.gitignore'));

    // Create GitHub Actions workflow for PDF builds and previews
    const buildWorkflowContent = await processTemplate('build.yml', {
      BOOK_DIRECTORY: projectName,
    });
    await writeFile(
      join(projectPath, '.github', 'workflows', 'build.yml'),
      buildWorkflowContent,
    );

    // Create GitHub Actions workflow that checks Typst linting and formatting
    await copyTemplate(
      'lint.yml',
      join(projectPath, '.github', 'workflows', 'lint.yml'),
    );

    // Create VS Code settings for autosave and format-on-save
    await copyTemplate(
      'vscode-settings.json',
      join(projectPath, '.vscode', 'settings.json'),
    );
    await copyTemplate(
      'vscode-extensions.json',
      join(projectPath, '.vscode', 'extensions.json'),
    );

    const copilotInstructionsContent = await processTemplate(
      'copilot-instructions.md',
      {
        BOOK_TITLE: title,
        BOOK_AUTHOR: DEFAULT_AUTHOR,
      },
    );
    await writeFile(
      join(projectPath, '.github', 'copilot-instructions.md'),
      copilotInstructionsContent,
    );

    console.log(`✓ Created project directory structure in ${projectName}/`);

    if (git) {
      try {
        await setupGitRepo(exec, projectPath);
        console.log('✓ Initialised Git repository with an initial commit');
      } catch (error) {
        if (!(error instanceof GitSetupError)) throw error;
        console.error('');
        console.error(`Your project was created, but Git setup failed:`);
        console.error(error.message);
        console.error('');
        console.error('Once fixed, finish setting up with:');
        console.error(`  cd ${projectName} && write setup`);
        process.exit(1);
      }
    }

    console.log('');
    console.log('Next steps:');
    console.log(`  cd ${projectName}`);
    console.log('  # Edit main.typ to start writing your book');
    console.log('  # Add chapters in the chapters/ directory');
    console.log(
      git
        ? '  # Optional: write remote add github'
        : '  # Run "write setup" when you want Git version history',
    );
  } catch (error) {
    console.error(`Error creating project: ${error}`);
    process.exit(1);
  }
}

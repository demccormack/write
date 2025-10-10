import { mkdir, writeFile, readFile, copyFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = join(__dirname, '..', 'templates');

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
 * Create a new LaTeX book project with scaffolding
 */
export async function createNewProject(title: string): Promise<void> {
  const projectName = titleToDirectoryName(title);
  const projectPath = join(process.cwd(), projectName);

  console.log(`Creating new LaTeX book project: ${title}`);
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
    ];

    for (const dir of directories) {
      await mkdir(join(projectPath, dir), { recursive: true });
    }

    // Create main.tex file
    const mainTexContent = await processTemplate('main.tex', {
      BOOK_TITLE: title,
    });
    await writeFile(join(projectPath, 'main.tex'), mainTexContent);

    // Create sample chapter
    await copyTemplate(
      'chapter01.tex',
      join(projectPath, 'chapters', 'chapter01.tex'),
    );

    // Create book.toml configuration
    const bookTomlContent = await processTemplate('book.toml', {
      BOOK_TITLE: title,
    });
    await writeFile(join(projectPath, 'book.toml'), bookTomlContent);

    // Create .gitignore for LaTeX projects
    await copyTemplate('.gitignore', join(projectPath, '.gitignore'));

    // Create GitHub Actions workflow for PDF builds
    await copyTemplate(
      'build.yml',
      join(projectPath, '.github', 'workflows', 'build.yml'),
    );

    console.log(`✓ Created project directory structure in ${projectName}/`);
    console.log('');
    console.log('Next steps:');
    console.log(`  cd ${projectName}`);
    console.log('  # Edit main.tex to start writing your book');
    console.log('  # Add chapters in the chapters/ directory');
    console.log('  # Commit your work to git when ready');
  } catch (error) {
    console.error(`Error creating project: ${error}`);
    process.exit(1);
  }
}

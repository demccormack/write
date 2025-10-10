import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

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
    const mainTexContent = `\\documentclass[12pt,oneside]{book}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{amsmath,amsfonts,amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{geometry}
\\geometry{margin=1in}

\\title{${title}}
\\author{Your Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\tableofcontents

\\chapter*{Preface}
Welcome to your new book! This is a LaTeX template to help you get started.

% Include your chapters here
% \\input{chapters/chapter01}
% \\input{chapters/chapter02}

\\chapter{Introduction}
Write your introduction here.

\\end{document}`;

    await writeFile(join(projectPath, 'main.tex'), mainTexContent);

    // Create sample chapter
    const chapterContent = `\\chapter{Sample Chapter}

This is a sample chapter. You can edit this file or create new chapter files in the chapters/ directory.

\\section{Section Example}

Write your content here.

\\subsection{Subsection Example}

More content...`;

    await writeFile(
      join(projectPath, 'chapters', 'chapter01.tex'),
      chapterContent,
    );

    // Create book.toml configuration
    const bookTomlContent = `[book]
title = "${title}"
author = "Your Name"
language = "en"

[latex]
document_class = "book"
font_size = "12pt"
paper_size = "letterpaper"
margin = "1in"

[build]
output_format = ["pdf"]
chapters_dir = "chapters"
assets_dir = "assets"
templates_dir = "templates"

[metadata]
description = "A book created with the write tool"
keywords = []
subject = ""
creator = "write v0.0.1"`;

    await writeFile(join(projectPath, 'book.toml'), bookTomlContent);

    // Create .gitignore for LaTeX projects
    const gitignoreContent = `# LaTeX auxiliary files
*.aux
*.lof
*.log
*.lot
*.fls
*.out
*.toc
*.fmt
*.fot
*.cb
*.cb2
.*.lb

# Intermediate documents
*.dvi
*.xdv
*-converted-to.*

# Bibliography auxiliary files
*.bbl
*.bcf
*.blg
*-blx.aux
*-blx.bib
*.run.xml

# Build tool auxiliary files
*.fdb_latexmk
*.fls
*.figlist
*.makefile
*.synctex
*.synctex(busy)
*.synctex.gz
*.synctex.gz(busy)
*.pdfsync

# Build outputs (comment out if you want to keep PDFs in git)
*.pdf

# Operating System Files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Editor files
.vscode/
*.swp
*.swo
*~

# Node modules (if using any Node.js tools)
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*`;

    await writeFile(join(projectPath, '.gitignore'), gitignoreContent);

    // Create GitHub Actions workflow for PDF builds
    const workflowContent = `name: Build LaTeX PDF

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v4
      
    - name: Setup LaTeX
      uses: xu-cheng/latex-action@v3
      with:
        root_file: main.tex
        
    - name: Upload PDF
      uses: actions/upload-artifact@v4
      with:
        name: \${{ github.event.repository.name }}-pdf
        path: main.pdf
        
    - name: Create Release (on tag)
      if: startsWith(github.ref, 'refs/tags/')
      uses: softprops/action-gh-release@v1
      with:
        files: main.pdf
      env:
        GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}`;

    await writeFile(
      join(projectPath, '.github', 'workflows', 'build.yml'),
      workflowContent,
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

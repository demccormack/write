# write

**The future of book creation tooling**

A scaffolding tool that creates professional book projects with LaTeX typesetting, Git version control, and automated CI/CD publishing pipelines.

## What This Tool Does

`write` sets up the infrastructure for serious book writing by creating a complete project with:

- 📁 **Project scaffolding** - Organized directory structure for LaTeX books
- 🔄 **Git repository** - Initialized with proper `.gitignore` and structure
- 🚀 **GitHub integration** - Repository creation and CI/CD setup
- ⚡ **Automated builds** - GitHub Actions to compile PDFs on every commit
- 📚 **LaTeX templates** - Professional book layouts ready to use

## Quick Start

### Installation

```bash
npm install -g @demccormack/write
```

### Create a New Book Project

<!-- BEGIN AUTO-GENERATED STRUCTURE -->
```bash
write new "My Amazing Book"
```

This creates a local directory with the following structure:

```
my-amazing-book
├── .github
│   └── workflows
│       └── build.yml
├── .gitignore
├── assets
│   ├── figures
│   └── images
├── book.toml
├── chapters
│   └── chapter01.tex
├── main.tex
└── templates

8 directories, 5 files
```

<!-- END AUTO-GENERATED STRUCTURE -->

### What You Do Next

1. **Edit in your preferred LaTeX editor** (TeXStudio, VS Code, Overleaf, etc.)
2. **Commit changes to Git** - every idea, immortalized in your git log
3. **Collaborate via pull requests** - built-in review process
4. **Download PDFs from GitHub Actions** - share early previews with interested parties

## Roadmap Features

> ⚠️ **Note**: This tool is in early development. The following features are planned:

- [ ] Project scaffolding with conventional directory structure
- [ ] GitHub repository creation and setup
- [ ] LaTeX template library (academic, fiction, technical)
- [ ] GitHub Actions CI/CD pipeline configuration
- [ ] Automated PDF builds on commit/PR
- [ ] Multiple output formats (PDF, EPUB, HTML)
- [ ] Book configuration management (`book.toml`)
- [ ] Chapter management commands
- [ ] Asset organization helpers
- [ ] **Author monetization support**:
  - [ ] Patreon integration for subscriber-only content
  - [ ] Automated chapter releases for supporters
  - [ ] Supporter acknowledgments in generated books

## Philosophy

This tool **does not** provide a writing interface. Instead, it:

- Creates the foundation for professional book publishing
- Automates the boring infrastructure setup
- Lets you focus on writing, not tooling
- Uses industry-standard tools (Git, GitHub, LaTeX)
- Makes backups an integral part of your writing process
- Enables collaborative workflows via pull requests

## Requirements

- Node.js
- Git (for version control)
- GitHub account (for repository hosting and CI/CD)
- LaTeX editor (TeXStudio, VS Code, Overleaf, or another editor of your choice)

## Future Commands

```bash
# Repository and CI setup
write new "Book Title" --template academic
write publish                    # Create GitHub repo + CI

# Project management
write chapter "Chapter Name"     # Add new chapter file
write build                      # Local PDF build (if LaTeX installed)
write status                     # Git status + build info
```

## Contributing

This is an open-source project in active development. Check out our [Contributing Guide](CONTRIBUTING.md) to help build the future of book publishing tooling.

## Support Development

If you find this tool useful, consider supporting its development:

- ⭐ **Star this repository** to help others discover it
- 🐛 **Report bugs** and suggest features via [GitHub Issues](https://github.com/demccormack/write/issues)
- 💖 **Sponsor development** via [GitHub Sponsors](https://github.com/sponsors/demccormack)
- ☕ **Support on [Patreon](https://www.patreon.com/demccormack_write)** for ongoing development updates and early access

Your support helps:

- Maintain and improve the tool
- Add new features and templates
- Provide community support
- Keep the project free and open-source

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0-or-later)**.

The AGPL license requires anyone who modifies this software and provides it as a service (like a hosted SaaS application) to make their full source code available. This protects the project from being used in proprietary applications without contributing back to the open source community.

As the original author and copyright holder, I retain the right to use this code in my own commercial applications.

For more details and FAQ about licensing, see [Licensing Information](LICENSING.md).

© Daniel Edward McCormack

# write

**The future of book creation tooling**

A scaffolding tool that creates professional book projects with Typst typesetting, Git version control, and automated CI/CD publishing pipelines.

## What This Tool Does

`write` sets up the infrastructure for serious book writing by creating a complete project with:

- 📁 **Project scaffolding** - Organized directory structure for Typst books
- 🔄 **Version history** - A Git repository, set up for you, that remembers every change you make
- 🚀 **GitHub as your book's headquarters** - Online backup, mission control and publishing HQ in one place
- ⚡ **Automatic PDFs** - Every time you save your work to GitHub, a fresh PDF of your book is built and emailed to you
- 📚 **Typst templates** - Professional book layouts ready to use

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
│   ├── copilot-instructions.md
│   └── workflows
│       ├── build.yml
│       └── lint.yml
├── .gitignore
├── .vscode
│   ├── extensions.json
│   └── settings.json
├── assets
│   ├── figures
│   └── images
├── book.toml
├── chapters
│   └── chapter01.typ
├── main.typ
└── templates

9 directories, 9 files
```

<!-- END AUTO-GENERATED STRUCTURE -->

### What You Do Next

1. **Edit in your preferred Typst editor** (VS Code with Tinymist, the Typst web app, etc.)
2. **Save your progress** - each commit is a snapshot of your book you can always return to
3. **Back up and share on GitHub** - see below
4. **Get your PDF** - GitHub builds it for you; just click the link in your email or download it from the Actions tab

### Put Your Book on GitHub

[GitHub](https://github.com) is a free website that acts as your book's headquarters:

- **Backup** - your manuscript and its entire history are stored safely online, so a lost or broken laptop never costs you your book.
- **Mission control** - see every change you've made and when, review suggestions from editors or friends, and check that your book still builds correctly.
- **Publishing HQ** - every time you push your work, GitHub builds a fresh PDF you can download and share.

You'll need a free GitHub account and the [GitHub CLI](https://cli.github.com/) (a small helper program). Then, from inside your book's folder:

```bash
write remote add github   # or: write remote add gh
```

It walks you through signing in, then creates a private home for your book (you choose the name and whether it's public), uploads everything, and turns on sensible protections, such as checking that your book builds before changes are accepted. It's safe to run again if anything goes wrong part-way. Advanced options: `--name`, `--owner`, `--public`/`--private`, `--description`, `-y` (accept defaults).

## Roadmap Features

> ⚠️ **Note**: This tool is in early development. The following features are planned:

- [x] Project scaffolding with conventional directory structure
- [x] GitHub repository creation and setup
- [ ] Typst template library (academic, fiction, technical)
- [x] GitHub Actions CI/CD pipeline configuration
- [x] Automated PDF builds on commit/PR
- [ ] Multiple output formats (PDF, EPUB, HTML)
- [x] Book configuration management (`book.toml`)
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
- Uses industry-standard tools (Git, GitHub, Typst) and hides the jargon
- Makes backups an integral part of your writing process
- Enables collaborative workflows via pull requests

## Requirements

- Node.js
- Git (to keep a history of your changes; `write` sets it up for you)
- GitHub account (free; your book's online backup and publishing HQ)
- Typst editor (VS Code with Tinymist, the Typst web app, or another editor of your choice)

## Future Commands

```bash
# Project setup
write new "Book Title" --template academic

# Project management
write chapter "Chapter Name"     # Add new chapter file
write build                      # Local PDF build (if Typst installed)
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

# {{BOOK_TITLE}}

Welcome! This folder holds your book. You write in plain text files, and a PDF is built for you automatically. No technical knowledge is needed beyond what's explained here.

## Where things live

| What                     | Where                                             |
| ------------------------ | ------------------------------------------------- |
| Title page, front matter | `main.typ`                                        |
| Your chapters            | `chapters/` (start with `chapters/chapter01.typ`) |
| Pictures and figures     | `assets/images/` and `assets/figures/`            |
| Title, author, settings  | `book.toml` (and the top of `main.typ`)           |

## Start writing

1. **Open this folder in an editor.** [Visual Studio Code](https://code.visualstudio.com/) is recommended. It will offer to install the suggested "Tinymist" extension. Say yes: it shows a live preview of your book and tidies your text each time you save.
2. **Set your name.** Open `main.typ` and change `book-author` near the top (also in `book.toml`).
3. **Write your first chapter.** Open `chapters/chapter01.typ` and replace the sample text with your own.
4. **Add the chapter to the book.** In `main.typ`, find the line `// #include "chapters/chapter01.typ"` and remove the two slashes and space at the start (`//`). A chapter only appears in the book once it is included. For each new chapter, copy `chapter01.typ` to `chapter02.typ`, and so on, and add a matching `#include` line.

### Quick formatting guide

Your files use a simple language called [Typst](https://typst.app/docs/tutorial/):

| You type                          | You get           |
| --------------------------------- | ----------------- |
| `= Chapter Title`                 | A chapter heading |
| `== Section Title`                | A section heading |
| `*bold*`                          | **bold**          |
| `_italic_`                        | _italic_          |
| `#pagebreak()`                    | Start a new page  |
| `#image("assets/images/cat.png")` | A picture         |

A blank line starts a new paragraph.

## What you get

- **A ready-made book layout**: title page, copyright page, table of contents and numbered headings.
- **Automatic PDFs**: every time you propose a change, GitHub builds a PDF of your book and emails you a link.
- **Complete history**: every saved change is kept, so you can always go back.
- **Automatic checks**: your text is checked for formatting problems, and the book must build before changes are accepted.
- **Editor setup**: autosave and tidy-on-save are already configured for VS Code.
- **An AI helper brief**: `.github/copilot-instructions.md` tells GitHub Copilot about your book, if you use it.

## Recommended workflow: try ideas safely

Think of your book as having a "published" copy (called `main`) and as many "drafts" as you like. Trying an idea on a draft never touches the main copy until you are happy with it.

### 1. Start a branch for your idea

A **branch** is a private draft copy of the book. In a terminal inside this folder:

```bash
git switch -c rewrite-chapter-one
```

Pick any short name that describes your idea, using dashes instead of spaces.

### 2. Write and save your progress

Edit your files as normal, then save a snapshot (called a **commit**) with a short note about what you did:

```bash
git add .
git commit -m "Rewrite the opening scene"
```

Make as many commits as you like.

### 3. Open a pull request

Send your draft to GitHub:

```bash
git push -u origin rewrite-chapter-one
gh pr create --fill
```

(Or click the "Compare & pull request" button that GitHub shows on your repository's web page.) A **pull request** (PR) is a page that shows exactly what changed and lets you review it before it joins the main book.

### 4. Check the PDF

After a minute or two, GitHub builds your draft and **emails you a link** to the PDF. You can also find the same "PDF Preview" link in a comment on the pull request. Click it to read your book with the changes in it.

- If something is wrong, keep editing, commit, and push again. A fresh PDF is built each time.
- If the checks fail (a red ✗), open the failing check on the PR page to see what needs fixing.

### 5. Keep it, or throw it away

- **Happy?** Click **Merge pull request** on GitHub. Your idea is now part of the main book.
- **Not working out?** Click **Close pull request**. Nothing in your main book changes, and you can still come back to the draft later.

After merging, return to the main copy and download the update:

```bash
git switch main
git pull
```

## Is my book on GitHub yet?

The workflow above needs your book stored on GitHub. If you have not done this, run `write remote add github` from this folder and follow the prompts.

## Let an AI assistant do the admin

You don't have to memorise any of the commands above. AI assistants are very good at the "admin" side of writing: creating branches, committing, opening pull requests, adding a new chapter, fixing a build error, or explaining what a message means. Your writing stays yours; the assistant just handles the fiddly bits.

To get started with GitHub Copilot in VS Code:

1. **Get Copilot.** Sign in to GitHub in VS Code (click the person icon at the bottom of the left sidebar). The [free plan](https://github.com/features/copilot) is enough to begin with.
2. **Open Copilot Chat.** Click the chat icon at the top of the window, or press `Ctrl+Alt+I` (`Cmd+Ctrl+I` on a Mac).
3. **Switch to Agent mode.** Use the mode drop-down in the chat box and choose **Agent**. In this mode Copilot can edit your files and run commands for you, and it asks your permission before running anything.
4. **Ask in plain English.** For example:
   - "Create a new branch called rewrite-chapter-one."
   - "Add a chapter 2 called The Journey and include it in the book."
   - "Commit my changes and open a pull request."
   - "The PDF build failed. Can you work out why and fix it?"
5. **Read before you approve.** Check what Copilot proposes to do, and click **Allow** or **Continue** only if it looks right. Your history is saved, so any change can be undone.

Copilot already knows about your book: `.github/copilot-instructions.md` tells it how this project is set up.

## Getting help

If anything goes wrong, copy the error message and paste it into an AI assistant along with what you were trying to do. Your history is saved, so it's very hard to lose work.

If you think you've found a bug in the `write` tool itself (rather than in your own book), please [open an issue](https://github.com/demccormack/write/issues/new) on the write repository. Describe what you expected and what happened instead.

# Copilot Instructions

## Project overview

This repository contains the Typst source for _{{BOOK_TITLE}}_, a book being written by {{BOOK_AUTHOR}}.

The content of the book is written by the author. Copilot's role in this repository is solely technical: maintaining and improving the Typst code, document structure, build system, and supporting tooling.

## Important: preserve the author's writing

Self-expression is a sacred act. The author's words are theirs, and theirs alone.

Do not rewrite, edit, "improve", modernise, correct, or otherwise alter the wording of the book unless the prompt or issue explicitly asks for a textual change.

This includes apparent:

- spelling or grammatical errors
- unusual punctuation
- unconventional capitalisation
- whitespace or line-break choices
- repeated words or phrases

These may be deliberate choices. You may provide feedback on spelling or grammar, but do not make alterations.

When a task concerns layout or typesetting, change the Typst markup rather than the text wherever possible.

## Typst

The project is built using the `typst` CLI.

Before completing a change, build the project and verify that the
document compiles successfully.

Use:

    typst compile main.typ

unless the repository's existing configuration specifies a different build command.

Follow the existing Typst structure and conventions rather than introducing new packages or abstractions unnecessarily.

Prefer:

- simple, idiomatic Typst
- set and show rules over repeated formatting markup
- reusable functions when formatting is genuinely shared
- small changes appropriate to the issue being addressed

Avoid:

- unnecessary packages and dependencies
- large-scale restructuring unrelated to the issue
- generated PDF/build artifacts in Git unless the repository already intentionally tracks them

## Scope of agent work

Copilot may autonomously make technical changes such as:

- document layout and typography
- page and section formatting
- poem-specific Typst functions and show rules
- table of contents behaviour
- headers and footers
- title/front-matter formatting
- page breaks and spacing
- build configuration
- `.gitignore`
- Typst warnings and errors
- refactoring repeated Typst markup
- scripts or tooling supporting the document build

If a technical task would require changing the actual words of the book, preserve the text and explain the limitation instead.

## Branches and reviewing changes

Never commit directly to `main` unless the user explicitly asks you to commit to that branch. A request to change files or save progress is not permission to commit to `main`.

Before making changes, check the current branch and working tree. If you are on `main`:

1. Look for an existing local or remote branch intended for the requested work. Do not reuse an unrelated branch.
2. If a suitable branch exists, explain what it is for and ask permission to switch to it. If several branches could fit, ask the user which one to use.
3. If no suitable branch exists, suggest a descriptive branch name and ask permission to create and switch to it before editing.

Preserve uncommitted work when switching branches. If switching would overwrite changes, stop and explain the situation rather than discarding them.

Use plain language: explain that a branch is a separate draft of the project, and a pull request (PR) is a page where the user can review those changes before adding them to `main`.

When the work is done, summarise the changes and offer to open a PR. Ask permission before committing or pushing unless the user has already authorised those actions. If a PR is opened, provide its link. If changes are still local, say so and explain that they need to be uploaded before a GitHub review link is available. Do not merge the PR — instead tell the user where they can do this on GitHub.

## Working on issues

Treat the GitHub issue as the specification for the task.

Keep changes focused on that issue. Do not opportunistically rewrite unrelated parts of the project.

Inspect the existing implementation before deciding how to solve the problem. Preserve established conventions unless the issue specifically calls for changing them.

After making changes:

1. Format the project with `typstyle -i .`.
2. Lint with `tinymist lint main.typ` and fix any errors it reports.
3. Build the complete document with `typst compile main.typ`.
4. Check the build output for relevant errors or warnings.
5. Confirm that the requested behaviour has been implemented.
6. Summarise the technical changes made and any significant design decisions.

When visual appearance is relevant, make conservative changes unless the issue provides explicit design requirements.

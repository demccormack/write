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

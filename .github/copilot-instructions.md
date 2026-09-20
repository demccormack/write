# Copilot Instructions for `write`

`write` is a CLI scaffolding tool (npm package `@demccormack/write`) that generates LaTeX book
projects with Git/GitHub CI/CD scaffolding. It is **not** a writing/editing interface itself —
it only generates project structure, templates, and CI config for the books it creates.

## Build, test, lint

- Node.js version is pinned in `.nvmrc` (24.6.0) — run `nvm use` first.
- Install: `npm install`
- Build (TS → JS + copy templates): `npm run build`
- Typecheck only (no emit): `npm run typecheck`
- Dev mode (watch build + run): `npm run dev`, or run TS directly: `npm run dev:ts`
- Lint: `npm run lint` / autofix: `npm run lint:fix`
- Format: `npm run format` / check only: `npm run format:check`
- Full test suite: `npm test` (Node's built-in test runner via `node --test test/**/*.test.ts`)
- **Run a single test file**: `node --test test/new.test.ts`
- **Run a single test by name**: `node --test --test-name-pattern="should substitute title in main.tex" test/new.test.ts`
- Watch mode for tests: `npm run test:watch`
- CI (`.github/workflows/ci.yml`) runs, in order: typecheck → format:check → lint → build → test.
  Match this sequence locally before pushing.

## Architecture

- Entry point `src/index.ts` is a minimal argv parser/dispatcher (no CLI framework). It handles
  `-v/--version`, `-h/--help`, then dispatches to a `switch` on the first positional arg
  (currently only `new`). New subcommands are added as a new `case` here plus a new file under
  `src/commands/`.
- `src/commands/new.ts` implements `write new <title>`: it converts the title to a slug
  (`titleToDirectoryName`), creates the project directory tree, and renders/copies files from
  `src/templates/` into the new project. Templates with placeholders (`main.tex`, `book.toml`)
  go through `processTemplate`, which does simple `{{PLACEHOLDER}}` string substitution; static
  files (`chapter01.tex`, `.gitignore`, `build.yml`) are copied verbatim via `copyTemplate`.
- `src/commands/version.ts` reads `version`/`displayName` directly from the repo's own
  `package.json` at runtime (not a generated file) — this is the single source of truth for the
  CLI's reported version/name.
- `src/templates/` is copied into `dist/templates` by the build step (`cp -r src/templates
dist/`, see `package.json` `build` script) — it is NOT compiled by `tsc`. Any new template file
  must be added here and referenced via `processTemplate`/`copyTemplate` in `new.ts`; it does not
  need to be TypeScript.
- The generated project's own CI workflow template lives at `src/templates/build.yml` — this is
  copied into every scaffolded book project to build its PDF via GitHub Actions, and is distinct
  from this repo's own `.github/workflows/ci.yml` and `pdf_preview.yml`.

## Conventions

- Package is ESM (`"type": "module"`); imports use `.js` extensions in compiled output but
  source files import each other with `.js` extensions too (e.g. `./commands/version.js` from
  `index.ts`) since Node ESM resolution requires the emitted extension.
- `test/new.test.ts` maintains a **snapshot test** (`t.assert.snapshot(treeOutput)`, stored in
  `test/new.test.ts.snapshot`) of the generated project's directory tree (via the `tree` CLI, so
  `tree` must be installed to run this test). This same test also auto-regenerates the
  "directory structure" block in `docs/README.md` between the
  `<!-- BEGIN/END AUTO-GENERATED STRUCTURE -->` markers — don't hand-edit that block; it's
  overwritten by running the test suite.
- Tests write scratch projects under `tmp/` (gitignored except `tmp/.keep`) and clean up after
  themselves in `after()` hooks.
- Formatting/linting is enforced via ESLint (flat config, `eslint.config.mts`) with
  `eslint-plugin-prettier` — Prettier violations surface as lint errors, not just formatting
  diffs, and `format:check`/`lint` are both required to pass in CI.
- Docs live in `docs/` (`README.md`, `CONTRIBUTING.md`, `LICENSING.md`), not the repo root.
- Licensed AGPL-3.0-or-later; contributions require agreeing to a CLA (see
  `docs/CONTRIBUTING.md`) — don't add code that would conflict with that licensing model.

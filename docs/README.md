# Write - Developer Documentation

## Project Structure

```
write/
├── src/                    # Source code
│   └── index.js           # Main application entry point
├── test/                  # Test files
│   └── index.test.js      # Main tests
├── docs/                  # Documentation
├── dist/                  # Compiled output (generated)
├── .vscode/               # VS Code settings
├── eslint.config.mts      # ESLint configuration
├── tsconfig.json          # TypeScript configuration
├── .prettierrc.json       # Prettier configuration
├── .nvmrc                 # Node.js version lock
└── package.json           # Project configuration
```

## Available Scripts

- `npm start` - Run the application
- `npm run dev` - Run in development mode with file watching
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run build` - Build TypeScript to JavaScript
- `npm run typecheck` - Type check without building
- `npm run lint` - Lint code
- `npm run lint:fix` - Lint and auto-fix issues
- `npm run format` - Format code with Prettier

## Development Setup

1. Ensure you have Node.js v24.6.0 installed (use `nvm use` if you have nvm)
2. Install dependencies: `npm install`
3. Start development: `npm run dev`
4. Run tests: `npm test`

## Code Quality

This project uses:

- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** for type checking
- **Node.js built-in test runner** for testing
